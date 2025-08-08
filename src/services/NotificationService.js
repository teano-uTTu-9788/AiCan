const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Notification Service for sending alerts and updates
 * Supports multiple notification channels (Slack, Email, etc.)
 */
class NotificationService {
  constructor() {
    this.channels = new Map();
    this.isReady = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Notification Service...');
      
      // Initialize Slack if configured
      if (process.env.SLACK_WEBHOOK_URL) {
        this.channels.set('slack', new SlackChannel(process.env.SLACK_WEBHOOK_URL));
        logger.info('Slack notifications enabled');
      }

      // Initialize Email if configured
      if (process.env.EMAIL_SERVICE_API_KEY) {
        this.channels.set('email', new EmailChannel(process.env.EMAIL_SERVICE_API_KEY));
        logger.info('Email notifications enabled');
      }

      // Initialize Console channel (always available)
      this.channels.set('console', new ConsoleChannel());

      this.isReady = true;
      logger.info('Notification Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Notification Service:', error);
      throw error;
    }
  }

  async send(type, data, channels = ['console']) {
    if (!this.isReady) {
      logger.warn('Notification Service not ready, skipping notification');
      return;
    }

    try {
      const message = this.buildMessage(type, data);
      const results = [];

      for (const channelName of channels) {
        const channel = this.channels.get(channelName);
        if (channel) {
          try {
            const result = await channel.send(message);
            results.push({ channel: channelName, success: true, result });
            logger.info(`Notification sent via ${channelName}:`, message.title);
          } catch (error) {
            logger.error(`Failed to send notification via ${channelName}:`, error);
            results.push({ channel: channelName, success: false, error: error.message });
          }
        } else {
          logger.warn(`Notification channel not found: ${channelName}`);
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  buildMessage(type, data) {
    switch (type) {
      case 'workflow_completed':
        return {
          title: '✅ Workflow Completed',
          message: `Workflow "${data.workflowName}" completed successfully`,
          details: {
            'Job ID': data.jobId,
            'Duration': `${Math.round(data.duration / 1000)}s`,
            'Timestamp': new Date().toISOString()
          },
          color: 'good',
          priority: 'info'
        };

      case 'workflow_error':
        return {
          title: '❌ Workflow Failed',
          message: `Workflow failed: ${data.error}`,
          details: {
            'Job ID': data.jobId,
            'Workflow ID': data.workflowId,
            'Error': data.error,
            'Timestamp': new Date().toISOString()
          },
          color: 'danger',
          priority: 'high'
        };

      case 'deployment_status':
        return {
          title: '🚀 Deployment Update',
          message: `Deployment to ${data.environment || 'unknown'} environment`,
          details: {
            'Environment': data.environment,
            'URL': data.preview_url || data.staging_url || data.production_url,
            'Deployment ID': data.deployment_id,
            'Status': 'Success',
            'Timestamp': new Date().toISOString()
          },
          color: 'good',
          priority: 'info'
        };

      case 'service_failure':
        return {
          title: '🔥 Service Failure Alert',
          message: `Service failure detected: ${data.services.join(', ')}`,
          details: {
            'Failed Services': data.services.join(', '),
            'Timestamp': data.timestamp,
            'Action Required': 'Immediate attention needed'
          },
          color: 'danger',
          priority: 'critical'
        };

      case 'escalation':
        return {
          title: '🚨 Manual Intervention Required',
          message: 'Automated process requires human intervention',
          details: {
            'Reason': data.error || 'Unknown',
            'Context': JSON.stringify(data.context || {}),
            'Timestamp': new Date().toISOString()
          },
          color: 'warning',
          priority: 'high'
        };

      case 'ci_success':
        return {
          title: '✅ CI Pipeline Success',
          message: 'All tests passed, ready for deployment',
          details: {
            'Repository': data.repository,
            'Branch': data.branch,
            'Commit': data.commit_sha?.substring(0, 8),
            'Timestamp': new Date().toISOString()
          },
          color: 'good',
          priority: 'info'
        };

      case 'deployment_failure':
        return {
          title: '💥 Deployment Failed',
          message: `Deployment to ${data.environment} failed`,
          details: {
            'Environment': data.environment,
            'Error': data.error,
            'Deployment ID': data.deployment_id,
            'Repository': data.repository,
            'Timestamp': new Date().toISOString()
          },
          color: 'danger',
          priority: 'high'
        };

      default:
        return {
          title: '📢 Workflow Notification',
          message: `Unknown notification type: ${type}`,
          details: data,
          color: 'warning',
          priority: 'info'
        };
    }
  }

  getChannels() {
    return Array.from(this.channels.keys());
  }

  async shutdown() {
    logger.info('Shutting down Notification Service...');
    
    // Close all channels
    for (const [name, channel] of this.channels) {
      try {
        if (channel.shutdown) {
          await channel.shutdown();
        }
      } catch (error) {
        logger.error(`Error shutting down ${name} channel:`, error);
      }
    }

    this.channels.clear();
    this.isReady = false;
  }
}

/**
 * Slack notification channel
 */
class SlackChannel {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async send(message) {
    const payload = {
      text: message.title,
      attachments: [
        {
          color: message.color || 'good',
          title: message.title,
          text: message.message,
          fields: Object.entries(message.details || {}).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          })),
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    const response = await axios.post(this.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    return response.data;
  }
}

/**
 * Email notification channel
 */
class EmailChannel {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.sendgrid.com/v3'; // Example with SendGrid
  }

  async send(message) {
    // Placeholder implementation for email notifications
    // In production, integrate with your preferred email service
    logger.info('Email notification (placeholder):', {
      subject: message.title,
      body: message.message,
      details: message.details
    });

    return { sent: true, placeholder: true };
  }
}

/**
 * Console notification channel
 */
class ConsoleChannel {
  async send(message) {
    const logLevel = this.getLogLevel(message.priority);
    
    logger[logLevel](message.title, {
      message: message.message,
      details: message.details,
      priority: message.priority
    });

    return { logged: true };
  }

  getLogLevel(priority) {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'info':
      case 'low':
      default:
        return 'info';
    }
  }
}

module.exports = NotificationService;