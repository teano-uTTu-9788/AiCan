export interface DeploymentRequest {
  projectName: string;
  environment: 'production' | 'staging' | 'development';
  branch: string;
  commitSha: string;
  artifacts: DeploymentArtifact[];
  workflowChecksPassed: boolean;
  requestedBy: string;
  timestamp: Date;
}

export interface DeploymentArtifact {
  type: 'web' | 'api' | 'automation' | 'assets';
  name: string;
  path: string;
  buildCommand?: string;
  deploymentTarget: 'vercel' | 'n8n' | 'custom';
}

export interface DeploymentResult {
  id: string;
  status: 'success' | 'failed' | 'in-progress' | 'cancelled';
  urls?: string[];
  logs: DeploymentLog[];
  rollbackInfo?: RollbackInfo;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface DeploymentLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: string;
  metadata?: Record<string, any>;
}

export interface RollbackInfo {
  previousVersion: string;
  rollbackPlan: string[];
  rollbackCommands: string[];
  canRollback: boolean;
}

export interface N8nConfig {
  webhookUrl: string;
  apiKey: string;
  baseUrl: string;
}

export interface VercelConfig {
  token: string;
  projectId: string;
  teamId?: string;
}

export interface OrchestratorConfig {
  webhookUrl: string;
  apiKey: string;
}

export interface NotionConfig {
  token: string;
  databaseId: string;
}

export interface DeploymentConfig {
  n8n: N8nConfig;
  vercel: VercelConfig;
  orchestrator: OrchestratorConfig;
  notion: NotionConfig;
  timeout: number;
  rollbackEnabled: boolean;
  environment: string;
}