import express, { Request, Response } from 'express';
import { DeploymentAgent } from './services';
import { DeploymentRequest } from './types';
import { config, serverConfig, validateConfig } from './config';
import logger from './utils/logger';

class DeploymentServer {
  private app: express.Application;
  private deploymentAgent: DeploymentAgent;

  constructor() {
    this.app = express();
    this.deploymentAgent = new DeploymentAgent(config);
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, { 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        body: req.method !== 'GET' ? req.body : undefined 
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'deployment-agent',
        version: '1.0.0' 
      });
    });

    // Deploy endpoint
    this.app.post('/deploy', async (req: Request, res: Response) => {
      try {
        const deploymentRequest: DeploymentRequest = {
          projectName: req.body.projectName || 'unknown',
          environment: req.body.environment || 'production',
          branch: req.body.branch || 'main',
          commitSha: req.body.commitSha || '',
          artifacts: req.body.artifacts || [],
          workflowChecksPassed: req.body.workflowChecksPassed === true,
          requestedBy: req.body.requestedBy || 'unknown',
          timestamp: new Date(),
        };

        // Validate request
        if (!deploymentRequest.projectName || !deploymentRequest.artifacts.length) {
          return res.status(400).json({
            error: 'Missing required fields: projectName and artifacts are required'
          });
        }

        const result = await this.deploymentAgent.deploy(deploymentRequest);
        
        res.status(result.status === 'failed' ? 500 : 200).json(result);

      } catch (error) {
        logger.error('Deployment endpoint error', { error: error.message });
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // Get deployment status
    this.app.get('/deploy/:deploymentId', async (req: Request, res: Response) => {
      try {
        const { deploymentId } = req.params;
        const deployment = await this.deploymentAgent.getDeploymentStatus(deploymentId);
        
        if (!deployment) {
          return res.status(404).json({ error: 'Deployment not found' });
        }

        res.json(deployment);

      } catch (error) {
        logger.error('Get deployment status error', { error: error.message });
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // Rollback endpoint
    this.app.post('/deploy/:deploymentId/rollback', async (req: Request, res: Response) => {
      try {
        const { deploymentId } = req.params;
        const result = await this.deploymentAgent.rollback(deploymentId);
        
        res.status(result.success ? 200 : 500).json(result);

      } catch (error) {
        logger.error('Rollback endpoint error', { error: error.message });
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // Rollback simulation
    this.app.post('/deploy/:deploymentId/simulate-rollback', async (req: Request, res: Response) => {
      try {
        const { deploymentId } = req.params;
        const result = await this.deploymentAgent.simulateRollback(deploymentId);
        
        res.json(result);

      } catch (error) {
        logger.error('Rollback simulation error', { error: error.message });
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // List active deployments
    this.app.get('/deployments', (req: Request, res: Response) => {
      try {
        const deployments = this.deploymentAgent.getActiveDeployments();
        res.json(deployments);

      } catch (error) {
        logger.error('List deployments error', { error: error.message });
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // Webhook endpoint for workflow agents
    this.app.post('/webhook/workflow-complete', async (req: Request, res: Response) => {
      try {
        logger.info('Workflow completion webhook received', { body: req.body });

        // In a real implementation, this would trigger automatic deployment
        // when workflow agent signals all phase completions
        const { projectName, branch, commitSha, artifacts } = req.body;

        if (req.body.allPhasesComplete === true) {
          const deploymentRequest: DeploymentRequest = {
            projectName: projectName || 'webhook-triggered',
            environment: 'production',
            branch: branch || 'main',
            commitSha: commitSha || '',
            artifacts: artifacts || [],
            workflowChecksPassed: true,
            requestedBy: 'workflow-agent',
            timestamp: new Date(),
          };

          // Trigger deployment asynchronously
          this.deploymentAgent.deploy(deploymentRequest)
            .then(result => {
              logger.info('Webhook-triggered deployment completed', { 
                deploymentId: result.id, 
                status: result.status 
              });
            })
            .catch(error => {
              logger.error('Webhook-triggered deployment failed', { error: error.message });
            });

          res.json({ message: 'Deployment triggered', triggered: true });
        } else {
          res.json({ message: 'Waiting for all phases to complete', triggered: false });
        }

      } catch (error) {
        logger.error('Webhook endpoint error', { error: error.message });
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // Example deployment endpoint
    this.app.post('/example/deploy-web', async (req: Request, res: Response) => {
      try {
        const exampleRequest: DeploymentRequest = {
          projectName: 'AiCan Web Application',
          environment: 'production',
          branch: 'main',
          commitSha: 'abc123def456',
          artifacts: [
            {
              type: 'web',
              name: 'frontend-app',
              path: './dist/frontend',
              deploymentTarget: 'vercel',
            },
            {
              type: 'automation',
              name: 'deployment-workflows',
              path: './workflows',
              deploymentTarget: 'n8n',
            },
          ],
          workflowChecksPassed: true,
          requestedBy: 'example-user',
          timestamp: new Date(),
        };

        const result = await this.deploymentAgent.deploy(exampleRequest);
        res.json(result);

      } catch (error) {
        logger.error('Example deployment error', { error: error.message });
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });
  }

  public start(): void {
    try {
      validateConfig();
      
      this.app.listen(serverConfig.port, () => {
        logger.info(`Deployment Agent server started`, { 
          port: serverConfig.port,
          environment: serverConfig.nodeEnv 
        });
      });

    } catch (error) {
      logger.error('Failed to start server', { error: error.message });
      process.exit(1);
    }
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new DeploymentServer();
  server.start();
}

export default DeploymentServer;