import axios, { AxiosInstance } from 'axios';
import { VercelConfig, DeploymentArtifact, DeploymentResult, DeploymentLog } from '../types';
import logger from '../utils/logger';

export class VercelService {
  private client: AxiosInstance;
  private config: VercelConfig;

  constructor(config: VercelConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.vercel.com',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async deployWebAssets(artifact: DeploymentArtifact, deploymentId: string): Promise<Partial<DeploymentResult>> {
    logger.info(`Starting Vercel deployment for ${artifact.name}`, { deploymentId, artifact: artifact.name });

    try {
      const deploymentData = {
        name: artifact.name,
        files: await this.prepareFiles(artifact.path),
        projectSettings: {
          framework: 'nextjs', // Default, can be configured per artifact
        },
        target: 'production',
      };

      const response = await this.client.post('/v13/deployments', deploymentData, {
        params: {
          teamId: this.config.teamId,
        },
      });

      const deployment = response.data;
      logger.info(`Vercel deployment initiated`, { 
        deploymentId, 
        vercelDeploymentId: deployment.id,
        url: deployment.url 
      });

      // Wait for deployment to complete
      const finalDeployment = await this.waitForDeployment(deployment.id, deploymentId);

      return {
        status: finalDeployment.readyState === 'READY' ? 'success' : 'failed',
        urls: [`https://${finalDeployment.url}`],
        logs: this.createDeploymentLogs(finalDeployment, deploymentId),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Vercel deployment failed`, { deploymentId, error: errorMessage });
      throw new Error(`Vercel deployment failed: ${errorMessage}`);
    }
  }

  private async prepareFiles(artifactPath: string): Promise<Record<string, { file: string }>> {
    // This is a simplified version - in practice, you'd read actual files
    // from the artifact path and encode them properly
    logger.info(`Preparing files from path: ${artifactPath}`);
    
    return {
      'package.json': {
        file: JSON.stringify({
          name: 'deployed-app',
          version: '1.0.0',
          scripts: { start: 'next start', build: 'next build' },
          dependencies: { next: 'latest', react: 'latest', 'react-dom': 'latest' }
        })
      },
      'pages/index.js': {
        file: 'export default function Home() { return <div>Hello from AiCan Deployment!</div> }'
      }
    };
  }

  private async waitForDeployment(vercelDeploymentId: string, deploymentId: string): Promise<any> {
    const maxWait = 300000; // 5 minutes
    const pollInterval = 5000; // 5 seconds
    let waited = 0;

    while (waited < maxWait) {
      try {
        const response = await this.client.get(`/v13/deployments/${vercelDeploymentId}`, {
          params: { teamId: this.config.teamId },
        });

        const deployment = response.data;
        
        if (deployment.readyState === 'READY' || deployment.readyState === 'ERROR') {
          return deployment;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
        waited += pollInterval;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error checking deployment status`, { deploymentId, vercelDeploymentId, error: errorMessage });
        throw error;
      }
    }

    throw new Error(`Deployment timeout after ${maxWait}ms`);
  }

  private createDeploymentLogs(deployment: any, deploymentId: string): DeploymentLog[] {
    return [
      {
        timestamp: new Date(),
        level: 'info',
        message: `Vercel deployment ${deployment.readyState === 'READY' ? 'completed successfully' : 'failed'}`,
        service: 'vercel',
        metadata: {
          deploymentId,
          vercelDeploymentId: deployment.id,
          url: deployment.url,
          readyState: deployment.readyState,
        },
      },
    ];
  }

  async getRollbackInfo(deploymentId: string): Promise<any> {
    try {
      const response = await this.client.get(`/v9/projects/${this.config.projectId}/deployments`, {
        params: { teamId: this.config.teamId, limit: 10 },
      });

      const deployments = response.data.deployments;
      const previousDeployments = deployments.filter((d: any) => d.state === 'READY').slice(0, 2);

      return {
        canRollback: previousDeployments.length > 1,
        previousVersion: previousDeployments[1]?.id || null,
        rollbackPlan: ['Switch traffic to previous deployment', 'Verify rollback success'],
        rollbackCommands: [
          `curl -X PATCH https://api.vercel.com/v9/projects/${this.config.projectId} -H "Authorization: Bearer ${this.config.token}" -d '{"target": "${previousDeployments[1]?.id || ''}"}'`
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to get rollback info`, { deploymentId, error: errorMessage });
      return {
        canRollback: false,
        previousVersion: null,
        rollbackPlan: [],
        rollbackCommands: [],
      };
    }
  }
}