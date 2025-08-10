"""
Core Tu Orchestrator Agent Implementation

This module contains the main orchestrator class that manages all inter-agent
coordination and cross-tool workflow triggers in AiCan.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import structlog

from .agent_manager import AgentManager
from .workflow_manager import WorkflowManager
from .deployment_manager import DeploymentManager
from .integrations.langgraph_integration import LangGraphIntegration
from .integrations.n8n_integration import N8nIntegration
from .monitoring.logger import setup_logging
from .monitoring.metrics import MetricsCollector
from config.settings import settings


class OrchestrationStatus(Enum):
    """Orchestration status enum"""
    IDLE = "idle"
    INITIALIZING = "initializing"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"
    COMPLETED = "completed"


class TuOrchestrator:
    """
    Tu Orchestrator Agent - Master Orchestrator
    
    Manages all inter-agent coordination and cross-tool workflow triggers.
    Ensures agents act in the proper sequence, using the correct tools,
    and that deployments are coordinated and tracked.
    """
    
    def __init__(self):
        # Setup logging
        self.logger = setup_logging()
        
        # Initialize core managers
        self.agent_manager = AgentManager()
        self.workflow_manager = WorkflowManager()
        self.deployment_manager = DeploymentManager()
        
        # Initialize integrations
        self.langgraph = LangGraphIntegration()
        self.n8n = N8nIntegration()
        
        # Initialize monitoring
        self.metrics = MetricsCollector()
        
        # Orchestrator state
        self.status = OrchestrationStatus.IDLE
        self.current_project_id: Optional[str] = None
        self.running_workflows: Dict[str, Any] = {}
        
        # Configuration
        self.config = settings
        
        self.logger.info("Tu Orchestrator initialized", version=settings.app_name)
    
    async def start(self) -> None:
        """Start the orchestrator"""
        self.logger.info("Starting Tu Orchestrator")
        self.status = OrchestrationStatus.INITIALIZING
        
        try:
            # Initialize all components
            await self.agent_manager.initialize()
            await self.workflow_manager.initialize()
            await self.deployment_manager.initialize()
            await self.langgraph.initialize()
            await self.n8n.initialize()
            
            # Start monitoring
            await self.metrics.start()
            
            # Start health checks
            asyncio.create_task(self._health_check_loop())
            
            self.status = OrchestrationStatus.RUNNING
            self.logger.info("Tu Orchestrator started successfully")
            
        except Exception as e:
            self.status = OrchestrationStatus.ERROR
            self.logger.error("Failed to start Tu Orchestrator", error=str(e))
            raise
    
    async def stop(self) -> None:
        """Stop the orchestrator"""
        self.logger.info("Stopping Tu Orchestrator")
        
        try:
            # Stop all running workflows
            for workflow_id in list(self.running_workflows.keys()):
                await self.stop_workflow(workflow_id)
            
            # Stop components
            await self.metrics.stop()
            await self.n8n.shutdown()
            await self.langgraph.shutdown()
            await self.deployment_manager.shutdown()
            await self.workflow_manager.shutdown()
            await self.agent_manager.shutdown()
            
            self.status = OrchestrationStatus.IDLE
            self.logger.info("Tu Orchestrator stopped")
            
        except Exception as e:
            self.logger.error("Error stopping Tu Orchestrator", error=str(e))
            raise
    
    async def launch_full_workflow(self, project_data: Dict[str, Any]) -> str:
        """
        Launch a full workflow for a new project deployment
        
        Example from problem statement:
        Input: "Begin new project deployment."
        Output: 
        - Kick off research phase (Grok, Gemini, Perplexity).
        - Move to content phase (Claude, Notion, ElevenLabs).
        - Hand off to development (VS Code, Copilot, GitHub Actions).
        - Approve for deployment (n8n triggers Vercel v0).
        """
        self.logger.info("Launching full workflow", project_data=project_data)
        
        try:
            # Create new project
            project_id = await self.workflow_manager.create_project(project_data)
            self.current_project_id = project_id
            
            # Record workflow start
            workflow_start_time = datetime.utcnow()
            self.running_workflows[project_id] = {
                "start_time": workflow_start_time,
                "current_phase": None,
                "status": "starting"
            }
            
            # Phase 1: Research/Fact-Gathering
            research_phase_id = await self._trigger_research_phase(project_id, project_data)
            
            # Set up conditional workflow using LangGraph
            workflow_graph = await self.langgraph.create_workflow_graph(
                project_id=project_id,
                phases=self.config.workflow_phases,
                agents_config=self.config.agents_config
            )
            
            # Start the workflow
            workflow_result = await workflow_graph.run({
                "project_id": project_id,
                "project_data": project_data,
                "research_phase_id": research_phase_id
            })
            
            self.logger.info("Full workflow launched", 
                           project_id=project_id, 
                           workflow_result=workflow_result)
            
            return project_id
            
        except Exception as e:
            self.logger.error("Failed to launch full workflow", error=str(e))
            if project_id:
                self.running_workflows.pop(project_id, None)
            raise
    
    async def _trigger_research_phase(self, project_id: str, project_data: Dict[str, Any]) -> str:
        """Trigger the research/fact-gathering phase"""
        self.logger.info("Triggering research phase", project_id=project_id)
        
        # Get research agents
        research_agents = await self.agent_manager.get_agents_by_phase("research_fact_gathering")
        
        # Create research tasks
        research_tasks = []
        for agent in research_agents:
            task_data = {
                "agent_id": agent["id"],
                "project_id": project_id,
                "task_type": "research",
                "data": project_data,
                "tools": agent["tools"]
            }
            task_id = await self.agent_manager.assign_task(agent["id"], task_data)
            research_tasks.append(task_id)
        
        # Update workflow status
        self.running_workflows[project_id]["current_phase"] = "research_fact_gathering"
        self.running_workflows[project_id]["status"] = "running"
        self.running_workflows[project_id]["research_tasks"] = research_tasks
        
        # Trigger n8n automation for research coordination
        await self.n8n.trigger_workflow("research_coordination", {
            "project_id": project_id,
            "tasks": research_tasks
        })
        
        return f"research_phase_{project_id}"
    
    async def approve_deployment(self, deployment_proposal: Dict[str, Any]) -> bool:
        """Approve or reject agent deployment proposals"""
        self.logger.info("Evaluating deployment proposal", proposal=deployment_proposal)
        
        try:
            # Validate deployment proposal
            is_valid = await self.deployment_manager.validate_proposal(deployment_proposal)
            
            if not is_valid:
                self.logger.warning("Deployment proposal rejected - validation failed")
                return False
            
            # Check for cyclical dependencies
            has_cycles = await self.deployment_manager.check_cyclical_dependencies(
                deployment_proposal
            )
            
            if has_cycles:
                self.logger.warning("Deployment proposal rejected - cyclical dependencies detected")
                return False
            
            # Approve deployment
            deployment_id = await self.deployment_manager.approve_deployment(deployment_proposal)
            
            # Trigger n8n automation for deployment
            await self.n8n.trigger_workflow("deployment_automation", {
                "deployment_id": deployment_id,
                "proposal": deployment_proposal
            })
            
            self.logger.info("Deployment approved", deployment_id=deployment_id)
            return True
            
        except Exception as e:
            self.logger.error("Error evaluating deployment proposal", error=str(e))
            return False
    
    async def monitor_agent_states(self) -> Dict[str, Any]:
        """Monitor all agent states"""
        agent_states = await self.agent_manager.get_all_agent_states()
        
        # Update metrics
        for agent_id, state in agent_states.items():
            self.metrics.record_agent_state(agent_id, state)
        
        return agent_states
    
    async def detect_cyclical_dependencies(self, project_id: str) -> List[str]:
        """Detect and resolve cyclical dependencies"""
        dependencies = await self.workflow_manager.get_project_dependencies(project_id)
        cycles = await self.deployment_manager.detect_cycles(dependencies)
        
        if cycles:
            self.logger.warning("Cyclical dependencies detected", 
                              project_id=project_id, 
                              cycles=cycles)
            
            # Attempt to resolve cycles
            await self.deployment_manager.resolve_cycles(project_id, cycles)
        
        return cycles
    
    async def get_orchestration_status(self) -> Dict[str, Any]:
        """Get current orchestration status"""
        agent_states = await self.monitor_agent_states()
        
        return {
            "status": self.status.value,
            "current_project": self.current_project_id,
            "running_workflows": len(self.running_workflows),
            "agent_states": agent_states,
            "metrics": await self.metrics.get_summary()
        }
    
    async def stop_workflow(self, workflow_id: str) -> None:
        """Stop a running workflow"""
        if workflow_id in self.running_workflows:
            self.logger.info("Stopping workflow", workflow_id=workflow_id)
            
            # Cancel workflow tasks
            await self.workflow_manager.cancel_workflow(workflow_id)
            
            # Stop related n8n workflows
            await self.n8n.stop_workflow(workflow_id)
            
            # Clean up
            del self.running_workflows[workflow_id]
    
    async def _health_check_loop(self) -> None:
        """Periodic health check loop"""
        while self.status == OrchestrationStatus.RUNNING:
            try:
                # Check agent health
                await self.agent_manager.health_check()
                
                # Check workflow health
                await self.workflow_manager.health_check()
                
                # Check integration health
                await self.langgraph.health_check()
                await self.n8n.health_check()
                
                # Record health metrics
                self.metrics.record_health_check()
                
            except Exception as e:
                self.logger.error("Health check failed", error=str(e))
            
            await asyncio.sleep(self.config.health_check_interval)