# AiCan Deployment Agent

A comprehensive deployment automation system that controls push-to-production of all project artifacts using n8n for CI triggers and Vercel v0 for publishing, while coordinating with workflow and orchestrator agents.

## Features

- **Zero-downtime deployments** with comprehensive logging and reporting
- **Multi-target deployment** support (Vercel for web assets, n8n for automation)
- **Workflow integration** - only deploys when workflow agent signals all phase completions
- **Rollback capabilities** with simulation and automated recovery
- **Real-time notifications** to orchestrator and Notion logging
- **Comprehensive audit trail** with detailed deployment logs

## Architecture

The Deployment Agent consists of several key components:

### Core Services

- **DeploymentAgent**: Main orchestration service that manages the entire deployment lifecycle
- **VercelService**: Handles web asset deployments to Vercel platform
- **N8nService**: Manages automation workflow deployments and triggers
- **NotificationService**: Handles logging to Notion and notifications to orchestrator

### Key Features

1. **Pre-deployment Validation**: Ensures workflow checks have passed before deployment
2. **Multi-artifact Support**: Can deploy web apps, APIs, automation workflows, and assets
3. **Rollback Planning**: Generates rollback plans for each deployment
4. **Comprehensive Logging**: Every action is logged with structured metadata
5. **Error Handling**: Graceful failure handling with detailed error reporting

## Installation

1. Clone the repository:
```bash
git clone https://github.com/teano-uTTu-9788/AiCan.git
cd AiCan
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
# n8n Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/deployment
N8N_API_KEY=your-n8n-api-key

# Vercel Configuration
VERCEL_TOKEN=your-vercel-token
VERCEL_PROJECT_ID=your-vercel-project-id

# Orchestrator Configuration
ORCHESTRATOR_WEBHOOK_URL=https://your-orchestrator.com/webhook/deployment
ORCHESTRATOR_API_KEY=your-orchestrator-api-key
```

## Usage

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The server will start on port 3000 (configurable via `PORT` environment variable).

### API Endpoints

#### Deploy Application
```http
POST /deploy
Content-Type: application/json

{
  "projectName": "AiCan Web Application",
  "environment": "production",
  "branch": "main",
  "commitSha": "abc123def456",
  "artifacts": [
    {
      "type": "web",
      "name": "frontend-app",
      "path": "./dist/frontend",
      "deploymentTarget": "vercel"
    },
    {
      "type": "automation",
      "name": "deployment-workflows",
      "path": "./workflows",
      "deploymentTarget": "n8n"
    }
  ],
  "workflowChecksPassed": true,
  "requestedBy": "user@example.com"
}
```

#### Check Deployment Status
```http
GET /deploy/{deploymentId}
```

#### Rollback Deployment
```http
POST /deploy/{deploymentId}/rollback
```

#### Simulate Rollback
```http
POST /deploy/{deploymentId}/simulate-rollback
```

#### List Active Deployments
```http
GET /deployments
```

### Example Usage

#### Deploy New Build
```bash
curl -X POST http://localhost:3000/example/deploy-web \
  -H "Content-Type: application/json"
```

This will trigger a deployment with:
- Vercel deployment for web assets
- n8n workflow automation deployment
- Full logging and notification to orchestrator
- Rollback plan generation

Response:
```json
{
  "id": "deployment-uuid",
  "status": "success",
  "urls": ["https://your-app.vercel.app"],
  "logs": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "level": "info",
      "message": "Deployment initiated",
      "service": "deployment-agent"
    }
  ],
  "rollbackInfo": {
    "canRollback": true,
    "rollbackPlan": ["Switch traffic to previous deployment"]
  },
  "startTime": "2024-01-01T12:00:00Z",
  "endTime": "2024-01-01T12:05:00Z",
  "duration": 300000
}
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_WEBHOOK_URL` | Yes | n8n webhook URL for triggering deployments |
| `N8N_API_KEY` | Yes | n8n API key for authentication |
| `VERCEL_TOKEN` | Yes | Vercel API token |
| `VERCEL_PROJECT_ID` | Yes | Vercel project ID |
| `ORCHESTRATOR_WEBHOOK_URL` | Yes | Orchestrator notification endpoint |
| `ORCHESTRATOR_API_KEY` | Yes | Orchestrator API key |
| `NOTION_TOKEN` | No | Notion integration token for logging |
| `NOTION_DATABASE_ID` | No | Notion database ID for deployment logs |
| `PORT` | No | Server port (default: 3000) |
| `DEPLOYMENT_TIMEOUT` | No | Deployment timeout in ms (default: 300000) |
| `ROLLBACK_ENABLED` | No | Enable rollback functionality (default: true) |

### Deployment Artifacts

The system supports multiple artifact types:

- **web**: Frontend applications, static sites (deployed to Vercel)
- **api**: Backend services, APIs (deployed via n8n workflows)
- **automation**: n8n workflows, CI/CD pipelines (deployed to n8n)
- **assets**: Static assets, documentation (deployed to configured target)

## Deployment Flow

1. **Validation**: Check that workflow agent has signaled all phase completions
2. **Artifact Processing**: Deploy each artifact to its designated target
3. **Monitoring**: Monitor deployment progress and collect logs
4. **Notification**: Notify orchestrator of deployment status
5. **Logging**: Log comprehensive deployment details to Notion
6. **Rollback Planning**: Generate rollback plans for successful deployments

## Rollback Process

### Automatic Rollback Planning
- Every successful deployment generates a rollback plan
- Rollback plans include specific commands and procedures
- Previous deployment versions are tracked for quick recovery

### Rollback Simulation
Before performing actual rollbacks, you can simulate them:

```bash
curl -X POST http://localhost:3000/deploy/{deploymentId}/simulate-rollback
```

### Manual Rollback
Trigger rollback for failed or problematic deployments:

```bash
curl -X POST http://localhost:3000/deploy/{deploymentId}/rollback
```

## Quality Assurance

### Monthly Rollback Simulations
Set up automated monthly rollback simulations to ensure rollback procedures work correctly.

### Weekly Log Audits
Configure weekly log audits to review deployment patterns and identify potential issues.

## Integration with Other Agents

### Workflow Agent Integration
- Listens for workflow completion signals via webhook endpoint `/webhook/workflow-complete`
- Only triggers deployments when `allPhasesComplete: true`

### Orchestrator Agent Communication
- Sends deployment status notifications to orchestrator
- Reports deployment URLs and logs
- Sends alerts for failures and rollbacks

## Error Handling

The system includes comprehensive error handling:

- **Deployment Failures**: Automatic rollback planning and notification
- **Service Outages**: Graceful degradation and retry logic
- **Configuration Errors**: Early validation and clear error messages
- **Network Issues**: Timeout handling and connection retry

## Monitoring and Logging

- **Structured Logging**: All events logged with structured metadata
- **Real-time Monitoring**: Active deployment tracking
- **Audit Trail**: Complete history of all deployment activities
- **Performance Metrics**: Deployment duration and success rates

## Security

- **API Key Authentication**: All external service calls authenticated
- **Environment Variable Security**: Sensitive data stored in environment variables
- **Request Validation**: All API requests validated before processing
- **Audit Logging**: All actions logged for security review

## Development

### Building
```bash
npm run build
```

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Development Mode
```bash
npm run dev
```

## Dependencies

- **n8n**: Workflow automation platform
- **Vercel**: Web deployment platform
- **Notion**: Documentation and logging platform
- **Express**: Web server framework
- **Winston**: Logging library
- **Axios**: HTTP client

## License

MIT License - see LICENSE file for details