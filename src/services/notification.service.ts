import axios, { AxiosInstance } from 'axios';
import { OrchestratorConfig, NotionConfig, DeploymentResult, DeploymentLog } from '../types';
import logger from '../utils/logger';

export class NotificationService {
  private orchestratorClient: AxiosInstance;
  private notionClient: AxiosInstance;
  private orchestratorConfig: OrchestratorConfig;
  private notionConfig: NotionConfig;

  constructor(orchestratorConfig: OrchestratorConfig, notionConfig: NotionConfig) {
    this.orchestratorConfig = orchestratorConfig;
    this.notionConfig = notionConfig;

    this.orchestratorClient = axios.create({
      baseURL: orchestratorConfig.webhookUrl,
      headers: {
        'Authorization': `Bearer ${orchestratorConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.notionClient = axios.create({
      baseURL: 'https://api.notion.com/v1',
      headers: {
        'Authorization': `Bearer ${notionConfig.token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
    });
  }

  async notifyOrchestrator(deploymentResult: DeploymentResult): Promise<void> {
    try {
      logger.info(`Notifying orchestrator of deployment ${deploymentResult.status}`, { 
        deploymentId: deploymentResult.id,
        status: deploymentResult.status 
      });

      const notification = {
        deploymentId: deploymentResult.id,
        status: deploymentResult.status,
        urls: deploymentResult.urls || [],
        startTime: deploymentResult.startTime,
        endTime: deploymentResult.endTime,
        duration: deploymentResult.duration,
        logs: deploymentResult.logs.map(log => ({
          timestamp: log.timestamp,
          level: log.level,
          message: log.message,
          service: log.service,
        })),
        rollbackAvailable: deploymentResult.rollbackInfo?.canRollback || false,
      };

      await this.orchestratorClient.post('', notification);
      
      logger.info(`Orchestrator notified successfully`, { deploymentId: deploymentResult.id });

    } catch (error) {
      logger.error(`Failed to notify orchestrator`, { 
        deploymentId: deploymentResult.id, 
        error: error.message 
      });
      // Don't throw - notification failure shouldn't fail the deployment
    }
  }

  async logToNotion(deploymentResult: DeploymentResult): Promise<void> {
    if (!this.notionConfig.token || !this.notionConfig.databaseId) {
      logger.warn('Notion configuration missing, skipping Notion logging');
      return;
    }

    try {
      logger.info(`Logging deployment to Notion`, { deploymentId: deploymentResult.id });

      const notionPage = {
        parent: { database_id: this.notionConfig.databaseId },
        properties: {
          'Deployment ID': {
            title: [
              {
                text: {
                  content: deploymentResult.id,
                },
              },
            ],
          },
          'Status': {
            select: {
              name: deploymentResult.status.charAt(0).toUpperCase() + deploymentResult.status.slice(1),
            },
          },
          'Start Time': {
            date: {
              start: deploymentResult.startTime.toISOString(),
            },
          },
          'End Time': deploymentResult.endTime ? {
            date: {
              start: deploymentResult.endTime.toISOString(),
            },
          } : undefined,
          'Duration (ms)': deploymentResult.duration ? {
            number: deploymentResult.duration,
          } : undefined,
          'URLs': deploymentResult.urls && deploymentResult.urls.length > 0 ? {
            rich_text: [
              {
                text: {
                  content: deploymentResult.urls.join(', '),
                },
              },
            ],
          } : undefined,
          'Rollback Available': {
            checkbox: deploymentResult.rollbackInfo?.canRollback || false,
          },
        },
      };

      // Remove undefined properties
      Object.keys(notionPage.properties).forEach(key => {
        if (notionPage.properties[key] === undefined) {
          delete notionPage.properties[key];
        }
      });

      await this.notionClient.post('/pages', notionPage);

      // Also create a detailed log entry
      await this.createDetailedLogEntry(deploymentResult);

      logger.info(`Deployment logged to Notion successfully`, { deploymentId: deploymentResult.id });

    } catch (error) {
      logger.error(`Failed to log to Notion`, { 
        deploymentId: deploymentResult.id, 
        error: error.message 
      });
      // Don't throw - logging failure shouldn't fail the deployment
    }
  }

  private async createDetailedLogEntry(deploymentResult: DeploymentResult): Promise<void> {
    try {
      // Create a detailed log as a child page or in a separate logs database
      const logContent = deploymentResult.logs.map(log => 
        `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message} (${log.service})`
      ).join('\n');

      const logPage = {
        parent: { database_id: this.notionConfig.databaseId },
        properties: {
          'Log Entry': {
            title: [
              {
                text: {
                  content: `Logs for ${deploymentResult.id}`,
                },
              },
            ],
          },
          'Deployment ID': {
            rich_text: [
              {
                text: {
                  content: deploymentResult.id,
                },
              },
            ],
          },
        },
        children: [
          {
            object: 'block',
            type: 'code',
            code: {
              caption: [],
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: logContent,
                  },
                },
              ],
              language: 'plain text',
            },
          },
        ],
      };

      await this.notionClient.post('/pages', logPage);

    } catch (error) {
      logger.error(`Failed to create detailed log entry in Notion`, { 
        deploymentId: deploymentResult.id, 
        error: error.message 
      });
    }
  }

  async sendAlert(deploymentId: string, alertType: 'failure' | 'rollback' | 'timeout', message: string): Promise<void> {
    try {
      logger.warn(`Sending alert for deployment ${deploymentId}`, { 
        deploymentId, 
        alertType, 
        message 
      });

      const alert = {
        deploymentId,
        alertType,
        message,
        timestamp: new Date().toISOString(),
        severity: alertType === 'failure' ? 'high' : 'medium',
      };

      // Send to orchestrator
      await this.orchestratorClient.post('/alerts', alert);

      // Log to system
      logger.error(`Deployment alert: ${alertType}`, { deploymentId, message });

    } catch (error) {
      logger.error(`Failed to send alert`, { 
        deploymentId, 
        alertType, 
        message, 
        error: error.message 
      });
    }
  }

  async notifyRollbackComplete(deploymentId: string, rollbackResult: { success: boolean; message: string }): Promise<void> {
    try {
      logger.info(`Notifying rollback completion`, { deploymentId, success: rollbackResult.success });

      const notification = {
        deploymentId,
        action: 'rollback',
        success: rollbackResult.success,
        message: rollbackResult.message,
        timestamp: new Date().toISOString(),
      };

      await this.orchestratorClient.post('/rollback-notification', notification);

      logger.info(`Rollback notification sent successfully`, { deploymentId });

    } catch (error) {
      logger.error(`Failed to send rollback notification`, { 
        deploymentId, 
        error: error.message 
      });
    }
  }
}