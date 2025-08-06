import dotenv from 'dotenv';
import { DeploymentConfig } from '../types';

dotenv.config();

export const config: DeploymentConfig = {
  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL || '',
    apiKey: process.env.N8N_API_KEY || '',
    baseUrl: process.env.N8N_BASE_URL || '',
  },
  vercel: {
    token: process.env.VERCEL_TOKEN || '',
    projectId: process.env.VERCEL_PROJECT_ID || '',
    teamId: process.env.VERCEL_TEAM_ID,
  },
  orchestrator: {
    webhookUrl: process.env.ORCHESTRATOR_WEBHOOK_URL || '',
    apiKey: process.env.ORCHESTRATOR_API_KEY || '',
  },
  notion: {
    token: process.env.NOTION_TOKEN || '',
    databaseId: process.env.NOTION_DATABASE_ID || '',
  },
  timeout: parseInt(process.env.DEPLOYMENT_TIMEOUT || '300000'),
  rollbackEnabled: process.env.ROLLBACK_ENABLED === 'true',
  environment: process.env.DEPLOYMENT_ENVIRONMENT || 'development',
};

export const serverConfig = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
};

export function validateConfig(): void {
  const required = [
    'N8N_WEBHOOK_URL',
    'VERCEL_TOKEN',
    'VERCEL_PROJECT_ID',
    'ORCHESTRATOR_WEBHOOK_URL',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}