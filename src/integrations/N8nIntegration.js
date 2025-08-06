const axios = require('axios');
const logger = require('../utils/logger');

/**
 * n8n Integration for workflow automation
 * Handles communication with n8n instance for workflow execution
 */
class N8nIntegration {
  constructor() {
    this.baseUrl = `${process.env.N8N_PROTOCOL || 'http'}://${process.env.N8N_HOST || 'localhost'}:${process.env.N8N_PORT || 5678}`;
    this.apiKey = process.env.N8N_API_KEY;
    this.webhookUrl = process.env.N8N_WEBHOOK_URL;
    this.isReady = false;
  }

  async initialize() {
    try {
      logger.info('Initializing n8n integration...');
      await this.healthCheck();
      await this.loadWorkflows();
      this.isReady = true;
      logger.info('n8n integration initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize n8n integration:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/healthz`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.error('n8n health check failed:', error.message);
      return false;
    }
  }

  async loadWorkflows() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/workflows`, {
        headers: this.getAuthHeaders(),
        timeout: 10000
      });

      const workflows = response.data.data || response.data;
      logger.info(`Loaded ${workflows.length} n8n workflows`);
      
      return workflows;
    } catch (error) {
      logger.error('Failed to load n8n workflows:', error.message);
      return [];
    }
  }

  async triggerWorkflow(workflowName, data = {}) {
    try {
      logger.info(`Triggering n8n workflow: ${workflowName}`);

      // For webhook-based triggers
      if (workflowName.startsWith('webhook-')) {
        return await this.triggerWebhookWorkflow(workflowName, data);
      }

      // For direct workflow execution
      const response = await axios.post(
        `${this.baseUrl}/api/v1/workflows/${workflowName}/execute`,
        { data },
        {
          headers: this.getAuthHeaders(),
          timeout: 30000
        }
      );

      const result = {
        success: response.data.finished === true,
        executionId: response.data.id,
        data: response.data.data
      };

      logger.info(`n8n workflow ${workflowName} executed`, { 
        success: result.success, 
        executionId: result.executionId 
      });

      return result;
    } catch (error) {
      logger.error(`Failed to trigger n8n workflow ${workflowName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async triggerWebhookWorkflow(workflowName, data) {
    try {
      const webhookUrl = `${this.webhookUrl}/${workflowName}`;
      
      const response = await axios.post(webhookUrl, data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to trigger webhook workflow ${workflowName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getExecutionStatus(executionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/executions/${executionId}`,
        {
          headers: this.getAuthHeaders(),
          timeout: 10000
        }
      );

      return {
        id: response.data.id,
        finished: response.data.finished,
        mode: response.data.mode,
        startedAt: response.data.startedAt,
        stoppedAt: response.data.stoppedAt,
        status: response.data.finished ? 'completed' : 'running'
      };
    } catch (error) {
      logger.error(`Failed to get execution status ${executionId}:`, error.message);
      throw error;
    }
  }

  async createWorkflow(workflowDefinition) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/workflows`,
        workflowDefinition,
        {
          headers: this.getAuthHeaders(),
          timeout: 15000
        }
      );

      logger.info(`Created n8n workflow: ${workflowDefinition.name} (${response.data.id})`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create n8n workflow:', error.message);
      throw error;
    }
  }

  async updateWorkflow(workflowId, workflowDefinition) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/api/v1/workflows/${workflowId}`,
        workflowDefinition,
        {
          headers: this.getAuthHeaders(),
          timeout: 15000
        }
      );

      logger.info(`Updated n8n workflow: ${workflowId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to update n8n workflow ${workflowId}:`, error.message);
      throw error;
    }
  }

  async deleteWorkflow(workflowId) {
    try {
      await axios.delete(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        headers: this.getAuthHeaders(),
        timeout: 10000
      });

      logger.info(`Deleted n8n workflow: ${workflowId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete n8n workflow ${workflowId}:`, error.message);
      return false;
    }
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    }

    return headers;
  }

  static isHealthy() {
    // Static method for quick health check without instance
    return true; // Placeholder - would check connection status
  }

  isHealthy() {
    return this.isReady;
  }

  async shutdown() {
    logger.info('Shutting down n8n integration...');
    this.isReady = false;
  }
}

module.exports = N8nIntegration;