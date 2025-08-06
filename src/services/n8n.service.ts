import axios, { AxiosInstance } from 'axios';
import { N8nConfig, DeploymentArtifact, DeploymentResult, DeploymentLog } from '../types';
import logger from '../utils/logger';

export class N8nService {
  private client: AxiosInstance;
  private config: N8nConfig;

  constructor(config: N8nConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'X-N8N-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async triggerWorkflow(artifact: DeploymentArtifact, deploymentId: string): Promise<Partial<DeploymentResult>> {
    logger.info(`Triggering n8n workflow for ${artifact.name}`, { deploymentId, artifact: artifact.name });

    try {
      const workflowData = {
        deploymentId,
        artifactName: artifact.name,
        artifactType: artifact.type,
        artifactPath: artifact.path,
        buildCommand: artifact.buildCommand,
        timestamp: new Date().toISOString(),
      };

      // Trigger via webhook
      const webhookResponse = await axios.post(this.config.webhookUrl, workflowData);
      
      logger.info(`n8n webhook triggered successfully`, { 
        deploymentId, 
        webhookResponse: webhookResponse.status 
      });

      // For automation deployments, we also need to update workflows
      if (artifact.type === 'automation') {
        await this.deployAutomationWorkflows(artifact, deploymentId);
      }

      return {
        status: 'success',
        logs: this.createDeploymentLogs(artifact, deploymentId, 'success'),
      };

    } catch (error) {
      logger.error(`n8n workflow trigger failed`, { deploymentId, error: error.message });
      
      return {
        status: 'failed',
        logs: this.createDeploymentLogs(artifact, deploymentId, 'failed', error.message),
      };
    }
  }

  private async deployAutomationWorkflows(artifact: DeploymentArtifact, deploymentId: string): Promise<void> {
    try {
      // Get list of workflows to update
      const workflowsResponse = await this.client.get('/api/v1/workflows');
      const workflows = workflowsResponse.data.data;

      logger.info(`Found ${workflows.length} workflows to potentially update`, { deploymentId });

      // Filter workflows that need updating based on artifact
      const workflowsToUpdate = workflows.filter((workflow: any) => 
        workflow.name.includes(artifact.name) || workflow.tags?.includes('deployment')
      );

      // Update each workflow
      for (const workflow of workflowsToUpdate) {
        await this.updateWorkflow(workflow.id, artifact, deploymentId);
      }

    } catch (error) {
      logger.error(`Failed to deploy automation workflows`, { deploymentId, error: error.message });
      throw error;
    }
  }

  private async updateWorkflow(workflowId: string, artifact: DeploymentArtifact, deploymentId: string): Promise<void> {
    try {
      // Get current workflow
      const workflowResponse = await this.client.get(`/api/v1/workflows/${workflowId}`);
      const workflow = workflowResponse.data.data;

      // Update workflow with new deployment info
      const updatedWorkflow = {
        ...workflow,
        settings: {
          ...workflow.settings,
          lastDeployment: deploymentId,
          deployedAt: new Date().toISOString(),
          deployedArtifact: artifact.name,
        },
      };

      // Save updated workflow
      await this.client.put(`/api/v1/workflows/${workflowId}`, updatedWorkflow);

      logger.info(`Updated workflow ${workflowId}`, { deploymentId, workflowId });

    } catch (error) {
      logger.error(`Failed to update workflow ${workflowId}`, { deploymentId, workflowId, error: error.message });
      throw error;
    }
  }

  async checkWorkflowStatus(deploymentId: string): Promise<{ status: string; logs: string[] }> {
    try {
      // Check execution status for our deployment
      const executionsResponse = await this.client.get('/api/v1/executions', {
        params: {
          filter: JSON.stringify({
            metadata: { deploymentId }
          }),
          limit: 10,
        },
      });

      const executions = executionsResponse.data.data;
      const latestExecution = executions[0];

      if (!latestExecution) {
        return { status: 'unknown', logs: ['No executions found for deployment'] };
      }

      return {
        status: latestExecution.finished ? 'completed' : 'running',
        logs: latestExecution.data?.resultData?.error ? 
          [latestExecution.data.resultData.error.message] : 
          ['Execution completed successfully']
      };

    } catch (error) {
      logger.error(`Failed to check workflow status`, { deploymentId, error: error.message });
      return { status: 'error', logs: [error.message] };
    }
  }

  private createDeploymentLogs(
    artifact: DeploymentArtifact, 
    deploymentId: string, 
    status: 'success' | 'failed',
    errorMessage?: string
  ): DeploymentLog[] {
    const logs: DeploymentLog[] = [
      {
        timestamp: new Date(),
        level: status === 'success' ? 'info' : 'error',
        message: `n8n ${artifact.type} deployment ${status}`,
        service: 'n8n',
        metadata: {
          deploymentId,
          artifactName: artifact.name,
          artifactType: artifact.type,
        },
      },
    ];

    if (errorMessage) {
      logs.push({
        timestamp: new Date(),
        level: 'error',
        message: errorMessage,
        service: 'n8n',
        metadata: { deploymentId },
      });
    }

    return logs;
  }

  async getRollbackInfo(deploymentId: string): Promise<any> {
    try {
      // Get workflow execution history
      const executionsResponse = await this.client.get('/api/v1/executions', {
        params: { limit: 50 },
      });

      const executions = executionsResponse.data.data;
      const successfulExecutions = executions.filter((e: any) => e.finished && !e.stoppedAt);

      return {
        canRollback: successfulExecutions.length > 1,
        previousVersion: successfulExecutions[1]?.id || null,
        rollbackPlan: [
          'Revert workflow configurations to previous version',
          'Restart affected automation processes',
          'Verify automation functionality'
        ],
        rollbackCommands: [
          'n8n workflow:revert --execution-id=' + (successfulExecutions[1]?.id || ''),
          'n8n workflow:activate --all',
        ],
      };

    } catch (error) {
      logger.error(`Failed to get n8n rollback info`, { deploymentId, error: error.message });
      return {
        canRollback: false,
        previousVersion: null,
        rollbackPlan: [],
        rollbackCommands: [],
      };
    }
  }
}