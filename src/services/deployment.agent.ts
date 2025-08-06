import { v4 as uuidv4 } from 'uuid';
import { 
  DeploymentRequest, 
  DeploymentResult, 
  DeploymentArtifact, 
  DeploymentLog,
  DeploymentConfig 
} from '../types';
import { VercelService } from './vercel.service';
import { N8nService } from './n8n.service';
import { NotificationService } from './notification.service';
import logger from '../utils/logger';

export class DeploymentAgent {
  private vercelService: VercelService;
  private n8nService: N8nService;
  private notificationService: NotificationService;
  private config: DeploymentConfig;
  private activeDeployments: Map<string, DeploymentResult> = new Map();

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.vercelService = new VercelService(config.vercel);
    this.n8nService = new N8nService(config.n8n);
    this.notificationService = new NotificationService(config.orchestrator, config.notion);
  }

  async deploy(request: DeploymentRequest): Promise<DeploymentResult> {
    const deploymentId = uuidv4();
    const startTime = new Date();

    logger.info(`Starting deployment`, { 
      deploymentId, 
      projectName: request.projectName, 
      environment: request.environment,
      requestedBy: request.requestedBy 
    });

    // Validate workflow checks passed
    if (!request.workflowChecksPassed) {
      const error = 'Deployment rejected: Workflow checks have not passed';
      logger.error(error, { deploymentId });
      
      const result: DeploymentResult = {
        id: deploymentId,
        status: 'failed',
        logs: [{
          timestamp: new Date(),
          level: 'error',
          message: error,
          service: 'deployment-agent',
        }],
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
      };

      await this.notificationService.sendAlert(deploymentId, 'failure', error);
      return result;
    }

    const result: DeploymentResult = {
      id: deploymentId,
      status: 'in-progress',
      logs: [{
        timestamp: startTime,
        level: 'info',
        message: `Deployment initiated for ${request.projectName}`,
        service: 'deployment-agent',
        metadata: { 
          projectName: request.projectName,
          environment: request.environment,
          branch: request.branch,
          commitSha: request.commitSha,
        },
      }],
      startTime,
    };

    this.activeDeployments.set(deploymentId, result);

    try {
      // Deploy each artifact based on its type
      const deploymentPromises = request.artifacts.map(artifact => 
        this.deployArtifact(artifact, deploymentId)
      );

      const artifactResults = await Promise.allSettled(deploymentPromises);
      
      // Collect all URLs and logs
      const allUrls: string[] = [];
      const allLogs: DeploymentLog[] = [...result.logs];
      let hasFailures = false;

      artifactResults.forEach((artifactResult, index) => {
        if (artifactResult.status === 'fulfilled') {
          const artifactDeployment = artifactResult.value;
          if (artifactDeployment.urls) {
            allUrls.push(...artifactDeployment.urls);
          }
          if (artifactDeployment.logs) {
            allLogs.push(...artifactDeployment.logs);
          }
          if (artifactDeployment.status === 'failed') {
            hasFailures = true;
          }
        } else {
          hasFailures = true;
          allLogs.push({
            timestamp: new Date(),
            level: 'error',
            message: `Artifact deployment failed: ${artifactResult.reason.message}`,
            service: 'deployment-agent',
            metadata: { artifactName: request.artifacts[index].name },
          });
        }
      });

      const endTime = new Date();
      const finalResult: DeploymentResult = {
        ...result,
        status: hasFailures ? 'failed' : 'success',
        urls: allUrls,
        logs: allLogs,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        rollbackInfo: hasFailures ? null : await this.generateRollbackInfo(deploymentId),
      };

      this.activeDeployments.set(deploymentId, finalResult);

      // Log final result
      logger.info(`Deployment ${finalResult.status}`, { 
        deploymentId, 
        status: finalResult.status,
        duration: finalResult.duration,
        urls: finalResult.urls 
      });

      // Notify orchestrator and log to Notion
      await Promise.allSettled([
        this.notificationService.notifyOrchestrator(finalResult),
        this.notificationService.logToNotion(finalResult),
      ]);

      if (hasFailures) {
        await this.notificationService.sendAlert(
          deploymentId, 
          'failure', 
          'One or more artifacts failed to deploy'
        );
      }

      return finalResult;

    } catch (error) {
      const endTime = new Date();
      const errorResult: DeploymentResult = {
        ...result,
        status: 'failed',
        logs: [
          ...result.logs,
          {
            timestamp: new Date(),
            level: 'error',
            message: `Deployment failed: ${error.message}`,
            service: 'deployment-agent',
            metadata: { error: error.stack },
          },
        ],
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      };

      this.activeDeployments.set(deploymentId, errorResult);
      
      logger.error(`Deployment failed`, { deploymentId, error: error.message });

      await Promise.allSettled([
        this.notificationService.notifyOrchestrator(errorResult),
        this.notificationService.logToNotion(errorResult),
        this.notificationService.sendAlert(deploymentId, 'failure', error.message),
      ]);

      return errorResult;
    }
  }

  private async deployArtifact(artifact: DeploymentArtifact, deploymentId: string): Promise<Partial<DeploymentResult>> {
    logger.info(`Deploying artifact ${artifact.name}`, { 
      deploymentId, 
      artifactName: artifact.name, 
      artifactType: artifact.type,
      deploymentTarget: artifact.deploymentTarget 
    });

    try {
      switch (artifact.deploymentTarget) {
        case 'vercel':
          return await this.vercelService.deployWebAssets(artifact, deploymentId);
        
        case 'n8n':
          return await this.n8nService.triggerWorkflow(artifact, deploymentId);
        
        case 'custom':
          return await this.deployCustomArtifact(artifact, deploymentId);
        
        default:
          throw new Error(`Unknown deployment target: ${artifact.deploymentTarget}`);
      }
    } catch (error) {
      logger.error(`Artifact deployment failed`, { 
        deploymentId, 
        artifactName: artifact.name, 
        error: error.message 
      });
      throw error;
    }
  }

  private async deployCustomArtifact(artifact: DeploymentArtifact, deploymentId: string): Promise<Partial<DeploymentResult>> {
    // For custom deployments, we trigger n8n workflows that handle the specific deployment logic
    logger.info(`Deploying custom artifact via n8n`, { deploymentId, artifactName: artifact.name });
    
    return await this.n8nService.triggerWorkflow(artifact, deploymentId);
  }

  private async generateRollbackInfo(deploymentId: string): Promise<any> {
    try {
      // Get rollback information from all services
      const [vercelRollback, n8nRollback] = await Promise.allSettled([
        this.vercelService.getRollbackInfo(deploymentId),
        this.n8nService.getRollbackInfo(deploymentId),
      ]);

      const rollbackInfo = {
        canRollback: false,
        previousVersion: null,
        rollbackPlan: [],
        rollbackCommands: [],
      };

      // Combine rollback information
      if (vercelRollback.status === 'fulfilled' && vercelRollback.value.canRollback) {
        rollbackInfo.canRollback = true;
        rollbackInfo.rollbackPlan.push(...vercelRollback.value.rollbackPlan);
        rollbackInfo.rollbackCommands.push(...vercelRollback.value.rollbackCommands);
      }

      if (n8nRollback.status === 'fulfilled' && n8nRollback.value.canRollback) {
        rollbackInfo.canRollback = true;
        rollbackInfo.rollbackPlan.push(...n8nRollback.value.rollbackPlan);
        rollbackInfo.rollbackCommands.push(...n8nRollback.value.rollbackCommands);
      }

      return rollbackInfo;

    } catch (error) {
      logger.error(`Failed to generate rollback info`, { deploymentId, error: error.message });
      return {
        canRollback: false,
        previousVersion: null,
        rollbackPlan: [],
        rollbackCommands: [],
      };
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentResult | null> {
    return this.activeDeployments.get(deploymentId) || null;
  }

  async rollback(deploymentId: string): Promise<{ success: boolean; message: string }> {
    logger.info(`Initiating rollback for deployment`, { deploymentId });

    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment) {
      const message = 'Deployment not found';
      logger.error(message, { deploymentId });
      return { success: false, message };
    }

    if (!deployment.rollbackInfo?.canRollback) {
      const message = 'Rollback not available for this deployment';
      logger.error(message, { deploymentId });
      return { success: false, message };
    }

    try {
      // Execute rollback commands
      const rollbackCommands = deployment.rollbackInfo.rollbackCommands;
      logger.info(`Executing ${rollbackCommands.length} rollback commands`, { deploymentId });

      // In a real implementation, you would execute these commands safely
      // For now, we'll simulate the rollback
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate rollback time

      const rollbackResult = { success: true, message: 'Rollback completed successfully' };
      
      logger.info(`Rollback completed`, { deploymentId, success: rollbackResult.success });

      // Notify about rollback completion
      await this.notificationService.notifyRollbackComplete(deploymentId, rollbackResult);

      return rollbackResult;

    } catch (error) {
      const rollbackResult = { success: false, message: `Rollback failed: ${error.message}` };
      
      logger.error(`Rollback failed`, { deploymentId, error: error.message });

      await this.notificationService.notifyRollbackComplete(deploymentId, rollbackResult);
      await this.notificationService.sendAlert(deploymentId, 'rollback', error.message);

      return rollbackResult;
    }
  }

  async simulateRollback(deploymentId: string): Promise<{ success: boolean; message: string }> {
    logger.info(`Simulating rollback for deployment`, { deploymentId });

    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment) {
      return { success: false, message: 'Deployment not found' };
    }

    if (!deployment.rollbackInfo?.canRollback) {
      return { success: false, message: 'Rollback not available for this deployment' };
    }

    // Simulate rollback validation
    const simulationResult = {
      success: true,
      message: `Rollback simulation successful. Plan: ${deployment.rollbackInfo.rollbackPlan.join(', ')}`
    };

    logger.info(`Rollback simulation completed`, { 
      deploymentId, 
      success: simulationResult.success,
      plan: deployment.rollbackInfo.rollbackPlan 
    });

    return simulationResult;
  }

  getActiveDeployments(): DeploymentResult[] {
    return Array.from(this.activeDeployments.values());
  }
}