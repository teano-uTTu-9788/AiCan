const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Vercel Integration for deployment automation
 * Handles deployments to different environments via Vercel API
 */
class VercelIntegration {
  constructor() {
    this.baseUrl = 'https://api.vercel.com';
    this.token = process.env.VERCEL_TOKEN;
    this.projectId = process.env.VERCEL_PROJECT_ID;
    this.teamId = process.env.VERCEL_TEAM_ID;
    this.isReady = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Vercel integration...');
      await this.healthCheck();
      await this.loadProjectInfo();
      this.isReady = true;
      logger.info('Vercel integration initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Vercel integration:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/user`, {
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.error('Vercel health check failed:', error.message);
      return false;
    }
  }

  async loadProjectInfo() {
    if (!this.projectId) {
      logger.warn('No Vercel project ID configured');
      return null;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/v9/projects/${this.projectId}`,
        {
          headers: this.getAuthHeaders(),
          timeout: 10000
        }
      );

      logger.info(`Loaded Vercel project: ${response.data.name} (${response.data.id})`);
      return response.data;
    } catch (error) {
      logger.error('Failed to load Vercel project info:', error.message);
      return null;
    }
  }

  async deploy(environment, context = {}) {
    try {
      logger.info(`Deploying to ${environment} environment via Vercel`);

      const deploymentConfig = this.buildDeploymentConfig(environment, context);
      
      const response = await axios.post(
        `${this.baseUrl}/v13/deployments`,
        deploymentConfig,
        {
          headers: this.getAuthHeaders(),
          timeout: 60000
        }
      );

      const deployment = response.data;
      
      logger.info(`Vercel deployment created: ${deployment.url} (${deployment.uid})`);

      // Wait for deployment to complete
      const finalDeployment = await this.waitForDeployment(deployment.uid);

      return {
        deploymentId: finalDeployment.uid,
        url: finalDeployment.url,
        environment,
        status: finalDeployment.readyState,
        createdAt: finalDeployment.createdAt
      };
    } catch (error) {
      logger.error(`Failed to deploy to ${environment}:`, error.message);
      throw error;
    }
  }

  buildDeploymentConfig(environment, context) {
    const config = {
      name: `aican-${environment}`,
      gitSource: {
        type: 'github',
        repo: `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`,
        ref: context.branch || 'main'
      },
      projectSettings: {
        framework: context.framework || 'nextjs'
      },
      target: this.getTargetForEnvironment(environment)
    };

    // Add environment-specific configurations
    if (environment === 'production') {
      config.env = {
        NODE_ENV: 'production',
        VERCEL_ENV: 'production'
      };
    } else if (environment === 'staging') {
      config.env = {
        NODE_ENV: 'staging',
        VERCEL_ENV: 'preview'
      };
      config.alias = [`staging-${this.projectId}.vercel.app`];
    } else if (environment === 'preview') {
      config.env = {
        NODE_ENV: 'development',
        VERCEL_ENV: 'preview'
      };
    }

    return config;
  }

  getTargetForEnvironment(environment) {
    switch (environment) {
      case 'production':
        return 'production';
      case 'staging':
        return 'staging';
      case 'preview':
      default:
        return 'preview';
    }
  }

  async waitForDeployment(deploymentId, maxWaitTime = 300000) {
    logger.info(`Waiting for deployment ${deploymentId} to complete...`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/v13/deployments/${deploymentId}`,
          {
            headers: this.getAuthHeaders(),
            timeout: 10000
          }
        );

        const deployment = response.data;
        
        if (deployment.readyState === 'READY') {
          logger.info(`Deployment ${deploymentId} completed successfully`);
          return deployment;
        } else if (deployment.readyState === 'ERROR') {
          throw new Error(`Deployment failed: ${deployment.error?.message || 'Unknown error'}`);
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        if (error.response?.status === 404) {
          logger.warn(`Deployment ${deploymentId} not found, continuing to wait...`);
        } else {
          throw error;
        }
      }
    }

    throw new Error(`Deployment ${deploymentId} timed out after ${maxWaitTime}ms`);
  }

  async getDeployment(deploymentId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v13/deployments/${deploymentId}`,
        {
          headers: this.getAuthHeaders(),
          timeout: 10000
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get deployment ${deploymentId}:`, error.message);
      throw error;
    }
  }

  async listDeployments(limit = 20) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });

      if (this.projectId) {
        params.append('projectId', this.projectId);
      }

      const response = await axios.get(
        `${this.baseUrl}/v6/deployments?${params}`,
        {
          headers: this.getAuthHeaders(),
          timeout: 10000
        }
      );

      return response.data.deployments || [];
    } catch (error) {
      logger.error('Failed to list deployments:', error.message);
      return [];
    }
  }

  async deleteDeployment(deploymentId) {
    try {
      await axios.delete(
        `${this.baseUrl}/v13/deployments/${deploymentId}`,
        {
          headers: this.getAuthHeaders(),
          timeout: 10000
        }
      );

      logger.info(`Deleted deployment: ${deploymentId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete deployment ${deploymentId}:`, error.message);
      return false;
    }
  }

  async getDomains() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v5/domains`,
        {
          headers: this.getAuthHeaders(),
          timeout: 10000
        }
      );

      return response.data.domains || [];
    } catch (error) {
      logger.error('Failed to get domains:', error.message);
      return [];
    }
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.teamId) {
      headers['X-Vercel-Team-Id'] = this.teamId;
    }

    return headers;
  }

  static async healthCheck() {
    try {
      // Static health check - verify Vercel API is accessible
      const response = await axios.get('https://api.vercel.com', {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  static isHealthy() {
    // Static method for quick health check without instance
    return true; // Placeholder - would check connection status
  }

  isHealthy() {
    return this.isReady;
  }

  async shutdown() {
    logger.info('Shutting down Vercel integration...');
    this.isReady = false;
  }
}

module.exports = VercelIntegration;