const express = require('express');
const winston = require('winston');
const cron = require('node-cron');
require('dotenv').config();

const WorkflowOrchestrator = require('./orchestrator/WorkflowOrchestrator');
const GitHubWebhookHandler = require('./handlers/GitHubWebhookHandler');
const N8nIntegration = require('./integrations/N8nIntegration');
const VercelIntegration = require('./integrations/VercelIntegration');
const logger = require('./utils/logger');

class AiCanWorkflowAgent {
  constructor() {
    this.app = express();
    this.port = process.env.ORCHESTRATOR_PORT || 3000;
    this.orchestrator = new WorkflowOrchestrator();
    this.setupMiddleware();
    this.setupRoutes();
    this.startHealthChecks();
  }

  setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        services: {
          orchestrator: this.orchestrator.isHealthy(),
          n8n: N8nIntegration.isHealthy(),
          vercel: VercelIntegration.isHealthy()
        }
      });
    });

    // GitHub webhooks
    this.app.post('/webhooks/github', GitHubWebhookHandler.handle.bind(GitHubWebhookHandler));

    // n8n webhooks
    this.app.post('/webhooks/n8n/:workflowId', async (req, res) => {
      try {
        const result = await this.orchestrator.handleN8nWebhook(req.params.workflowId, req.body);
        res.json(result);
      } catch (error) {
        logger.error('N8n webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Manual workflow triggers
    this.app.post('/workflows/trigger/:workflowName', async (req, res) => {
      try {
        const result = await this.orchestrator.triggerWorkflow(req.params.workflowName, req.body);
        res.json(result);
      } catch (error) {
        logger.error('Manual workflow trigger error:', error);
        res.status(500).json({ error: 'Failed to trigger workflow' });
      }
    });

    // Workflow status
    this.app.get('/workflows/:workflowId/status', async (req, res) => {
      try {
        const status = await this.orchestrator.getWorkflowStatus(req.params.workflowId);
        res.json(status);
      } catch (error) {
        logger.error('Workflow status error:', error);
        res.status(404).json({ error: 'Workflow not found' });
      }
    });
  }

  startHealthChecks() {
    // Health check every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.performHealthCheck();
    });
  }

  async performHealthCheck() {
    try {
      const checks = {
        n8n: await N8nIntegration.healthCheck(),
        vercel: await VercelIntegration.healthCheck(),
        orchestrator: this.orchestrator.isHealthy()
      };

      logger.info('Health check completed', checks);

      // Alert if any service is unhealthy
      const unhealthyServices = Object.entries(checks)
        .filter(([service, healthy]) => !healthy)
        .map(([service]) => service);

      if (unhealthyServices.length > 0) {
        logger.error('Unhealthy services detected:', unhealthyServices);
        await this.orchestrator.handleServiceFailure(unhealthyServices);
      }
    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }

  async start() {
    try {
      await this.orchestrator.initialize();
      
      this.app.listen(this.port, () => {
        logger.info(`AiCan Workflow Orchestration Agent started on port ${this.port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('Failed to start workflow agent:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down AiCan Workflow Agent...');
    await this.orchestrator.shutdown();
    process.exit(0);
  }
}

// Start the agent
if (require.main === module) {
  const agent = new AiCanWorkflowAgent();
  agent.start();
}

module.exports = AiCanWorkflowAgent;