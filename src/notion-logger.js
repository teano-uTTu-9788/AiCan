/**
 * Notion Logger for Web Development Agent
 * Handles logging to Notion database for tracking deployments, status, and feedback
 */

const axios = require('axios');

class NotionLogger {
  constructor(config = {}) {
    this.token = config.token || process.env.NOTION_TOKEN;
    this.databaseId = config.databaseId || process.env.NOTION_DATABASE_ID;
    this.baseUrl = 'https://api.notion.com/v1';
    
    if (!this.token || !this.databaseId) {
      console.warn('⚠️ Notion token or database ID not configured');
    }
  }

  async logDeployment(deployment) {
    const entry = {
      Title: { title: [{ text: { content: deployment.title || 'Deployment' } }] },
      Type: { select: { name: 'Deployment' } },
      Status: { select: { name: deployment.status || 'Success' } },
      Timestamp: { date: { start: deployment.timestamp || new Date().toISOString() } },
      URL: { url: deployment.url },
      Environment: { select: { name: deployment.environment || 'Production' } },
      'Build ID': { rich_text: [{ text: { content: deployment.buildId || '' } }] },
      Coverage: { number: deployment.coverage || 90 },
      Description: { rich_text: [{ text: { content: deployment.description || '' } }] }
    };

    return this.createEntry(entry);
  }

  async logStatusReport(report) {
    const entry = {
      Title: { title: [{ text: { content: report.title || 'Status Report' } }] },
      Type: { select: { name: 'Status Report' } },
      Status: { select: { name: report.status || 'Success' } },
      Timestamp: { date: { start: report.timestamp || new Date().toISOString() } },
      Coverage: { number: report.coverage || 90 },
      Description: { rich_text: [{ text: { content: report.description || '' } }] }
    };

    return this.createEntry(entry);
  }

  async logFeedback(feedback) {
    const entry = {
      Title: { title: [{ text: { content: feedback.title || 'User Feedback' } }] },
      Type: { select: { name: 'Feedback' } },
      Status: { select: { name: feedback.status || 'Pending' } },
      Timestamp: { date: { start: feedback.timestamp || new Date().toISOString() } },
      Description: { rich_text: [{ text: { content: feedback.description || '' } }] }
    };

    return this.createEntry(entry);
  }

  async createEntry(properties) {
    if (!this.token || !this.databaseId) {
      console.log('📝 Notion logging simulation:', JSON.stringify(properties, null, 2));
      return { success: true, simulated: true };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/pages`,
        {
          parent: { database_id: this.databaseId },
          properties: properties
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          }
        }
      );

      console.log('✅ Entry created in Notion');
      return { success: true, id: response.data.id };
    } catch (error) {
      console.error('❌ Failed to create Notion entry:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotionLogger;