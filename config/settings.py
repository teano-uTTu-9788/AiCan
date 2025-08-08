"""
Configuration settings for Tu Orchestrator Agent
"""

from pydantic import BaseSettings, Field
from typing import List, Dict, Any
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    app_name: str = "Tu Orchestrator Agent"
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="development", env="ENVIRONMENT")
    
    # API
    api_host: str = Field(default="localhost", env="API_HOST")
    api_port: int = Field(default=8000, env="API_PORT")
    api_prefix: str = Field(default="/api/v1", env="API_PREFIX")
    
    # Database
    database_url: str = Field(default="sqlite:///./tu_orchestrator.db", env="DATABASE_URL")
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")
    
    # n8n Integration
    n8n_base_url: str = Field(default="http://localhost:5678", env="N8N_BASE_URL")
    n8n_api_key: str = Field(default="", env="N8N_API_KEY")
    
    # LangGraph
    langgraph_config: Dict[str, Any] = Field(default_factory=dict)
    
    # Workflow phases
    workflow_phases: List[str] = Field(default=[
        "research_fact_gathering",
        "content_creation", 
        "development_prototyping",
        "refinement_organization"
    ])
    
    # Agent configurations
    agents_config: Dict[str, Dict[str, Any]] = Field(default_factory=lambda: {
        "grok": {"phase": "research_fact_gathering", "tools": ["search", "analysis"]},
        "gemini": {"phase": "research_fact_gathering", "tools": ["search", "analysis"]},
        "perplexity": {"phase": "research_fact_gathering", "tools": ["search", "analysis"]},
        "claude": {"phase": "content_creation", "tools": ["writing", "analysis"]},
        "notion": {"phase": "content_creation", "tools": ["documentation", "organization"]},
        "elevenlabs": {"phase": "content_creation", "tools": ["audio", "voice"]},
        "vscode": {"phase": "development_prototyping", "tools": ["coding", "editing"]},
        "copilot": {"phase": "development_prototyping", "tools": ["coding", "assistance"]},
        "github_actions": {"phase": "development_prototyping", "tools": ["ci_cd", "automation"]},
        "vercel": {"phase": "refinement_organization", "tools": ["deployment", "hosting"]}
    })
    
    # Monitoring
    metrics_enabled: bool = Field(default=True, env="METRICS_ENABLED")
    health_check_interval: int = Field(default=30, env="HEALTH_CHECK_INTERVAL")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()