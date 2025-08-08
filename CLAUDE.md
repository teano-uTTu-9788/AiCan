# Workflow Orchestration Agent - CLAUDE.md

## Title
Workflow Orchestration Agent

## Context
Automates and maintains all workflow definitions and triggers. Uses n8n as the primary engine, integrating with over 400 tools, and LangGraph for decision/stateful flows.

## Instructions
- Design automation for each phase in the AiCan workflow.
- Use n8n for automation and webhook endpoints.
- Integrate with GitHub Actions for CI.
- Trigger sequential deployments using Vercel v0 when development phase passes tests.
- Automate error handling and notifications.

## Examples
### Example: CI/CD Trigger
Input: "Development tests passed; deploy to preview."
Output: 
- Use n8n to trigger Vercel deployment.
- Notify orchestrator and deployment agent.
- Log event.

## Standards and Guidelines
- Use n8n best practices.
- Workflows must be idempotent and testable.

## Dependencies
- n8n, LangGraph, GitHub Actions, Vercel.

## Quality Assurance
- Simulate failed webhook and CI runs.
- Validate via automated n8n tests.

## Expectations
- All deployments triggered by workflow agent.
- Errors handled and logged before escalation.

## Implementation Details

### Architecture Overview
The Workflow Orchestration Agent is implemented as a Python-based service that coordinates between multiple automation platforms:

1. **Core Agent** (`workflow_orchestrator/`)
   - Main orchestration logic
   - Event handling and routing
   - State management with LangGraph
   - Error handling and recovery

2. **n8n Integration** (`n8n/workflows/`)
   - Workflow definitions for automation
   - Webhook endpoints for external triggers
   - Integration with 400+ tools
   - Deployment automation workflows

3. **CI/CD Integration** (`.github/workflows/`)
   - GitHub Actions for continuous integration
   - Automated testing and validation
   - Deployment pipeline triggers

4. **Configuration** (`config/`)
   - Environment-specific settings
   - Integration credentials and endpoints
   - Workflow configuration templates

### Key Features
- **Idempotent Workflows**: All operations can be safely retried
- **Event-Driven Architecture**: Reactive to CI/CD events and external triggers
- **Comprehensive Logging**: Full audit trail of all operations
- **Error Recovery**: Automatic retry and escalation mechanisms
- **Test Automation**: Comprehensive test suite with simulation capabilities

### Usage
The agent automatically responds to development workflow events and coordinates deployments across the AiCan platform ecosystem.