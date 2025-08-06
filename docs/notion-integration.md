# Notion Integration Configuration

## Overview

The Web Development Agent integrates with Notion to track user feedback, design notes, and deployment logs for full project visibility.

## Setup

### 1. Create Notion Integration

1. Go to [Notion Developers](https://developers.notion.com/)
2. Click "New Integration"
3. Fill out the integration details:
   - Name: "AiCan Web Development Agent"
   - Logo: Upload project logo
   - Associated workspace: Your workspace

### 2. Configure Database

Create a database in Notion with the following properties:

```
Database Name: Web Development Agent Logs
Properties:
- Title (Title)
- Type (Select): Deployment, Status Report, Feedback, Error
- Status (Select): Success, Failed, Pending, In Progress
- Timestamp (Date)
- URL (URL)
- Environment (Select): Production, Staging, Development
- Build ID (Text)
- Coverage (Number)
- Description (Text)
- Tags (Multi-select)
```

### 3. Environment Variables

Add to your `.env` file:

```bash
# Notion Configuration
NOTION_TOKEN=secret_your_integration_token
NOTION_DATABASE_ID=your_database_id_here
NOTION_WORKSPACE_ID=your_workspace_id
```

### 4. Share Database with Integration

1. Open your database in Notion
2. Click "Share" in the top right
3. Click "Invite"
4. Search for your integration name
5. Click "Invite"

## Usage

### Automatic Logging

The agent automatically logs to Notion during:

- **Deployments**: Creates entries with deployment status, URL, and metadata
- **Status Reports**: Logs system health, coverage, and performance metrics
- **CI/CD Events**: Records build success/failure with detailed information
- **Error Events**: Captures and logs system errors for debugging

### Manual Logging

You can manually create Notion entries using the API:

```javascript
const NotionLogger = require('./src/notion-logger');

const logger = new NotionLogger({
  token: process.env.NOTION_TOKEN,
  databaseId: process.env.NOTION_DATABASE_ID
});

// Log deployment
await logger.logDeployment({
  title: 'Production Deployment',
  status: 'Success',
  url: 'https://app.vercel.app',
  environment: 'Production',
  buildId: 'build-123',
  coverage: 92
});

// Log feedback
await logger.logFeedback({
  title: 'User Interface Feedback',
  description: 'Navigation could be more intuitive',
  tags: ['UI', 'UX', 'Navigation']
});
```

## Database Templates

### Deployment Entry Template

```json
{
  "Title": "Production Deployment - v1.2.0",
  "Type": "Deployment",
  "Status": "Success",
  "Timestamp": "2025-01-15T10:30:00Z",
  "URL": "https://aican-app.vercel.app",
  "Environment": "Production",
  "Build ID": "github-run-123456",
  "Coverage": 94,
  "Description": "Deployed new feature set with improved performance",
  "Tags": ["Release", "Performance", "Feature"]
}
```

### Status Report Template

```json
{
  "Title": "Weekly Status Report",
  "Type": "Status Report",
  "Status": "Success",
  "Timestamp": "2025-01-15T09:00:00Z",
  "Environment": "Production",
  "Coverage": 92,
  "Description": "All systems operational, 99.9% uptime",
  "Tags": ["Weekly", "Health", "Monitoring"]
}
```

### Feedback Entry Template

```json
{
  "Title": "Performance Optimization Request",
  "Type": "Feedback",
  "Status": "Pending",
  "Timestamp": "2025-01-15T14:30:00Z",
  "Description": "Users report slow loading times on mobile devices",
  "Tags": ["Performance", "Mobile", "User Feedback"]
}
```

## Automation Workflows

### n8n Integration

Set up n8n workflows to automatically:

1. **Create Notion entries** from GitHub webhook events
2. **Update project status** based on deployment results
3. **Generate weekly reports** from aggregated data
4. **Send notifications** for critical events

### GitHub Actions Integration

The CI/CD pipeline automatically updates Notion:

```yaml
- name: Log deployment to Notion
  run: |
    node scripts/notion-logger.js deployment \
      --status "${{ job.status }}" \
      --url "${{ steps.deploy.outputs.url }}" \
      --build-id "${{ github.run_id }}"
```

## Best Practices

### 1. Consistent Tagging

Use standardized tags for easy filtering:
- **Environment**: `Production`, `Staging`, `Development`
- **Type**: `Feature`, `Bug Fix`, `Performance`, `Security`
- **Priority**: `Critical`, `High`, `Medium`, `Low`

### 2. Rich Descriptions

Include relevant details in descriptions:
- Deployment: Changes included, performance impact
- Errors: Stack traces, reproduction steps
- Feedback: User context, suggested solutions

### 3. Regular Reviews

Schedule regular reviews of Notion data:
- Weekly deployment summaries
- Monthly performance trends
- Quarterly feedback analysis

### 4. Integration Health

Monitor Notion integration:
- API rate limits
- Token expiration
- Database permissions
- Webhook reliability

## Troubleshooting

### Common Issues

1. **Token Expired**: Regenerate integration token in Notion settings
2. **Permission Denied**: Ensure database is shared with integration
3. **Rate Limiting**: Implement exponential backoff in API calls
4. **Database Not Found**: Verify database ID and permissions

### Debug Mode

Enable debug logging:

```bash
DEBUG=notion:* npm run deploy
```

This integration ensures comprehensive tracking of all development activities with full visibility into project health and user feedback.