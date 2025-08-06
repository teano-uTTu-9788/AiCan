# AiCan Workflow Orchestration Agent

A comprehensive workflow orchestration system that automates CI/CD pipelines, deployment management, and error handling using n8n, LangGraph, and modern DevOps tools.

## 🚀 Features

- **Event-Driven Orchestration**: Responds to GitHub webhooks, CI/CD events, and manual triggers
- **Multi-Platform Integration**: n8n for automation, Vercel for deployments, LangGraph for AI decisions
- **Intelligent Error Handling**: AI-powered error analysis and recovery strategies
- **Multi-Environment Support**: Preview, staging, and production deployment pipelines
- **Comprehensive Monitoring**: Health checks, logging, and notification systems
- **Scalable Architecture**: Docker-based deployment with Redis and PostgreSQL

## 📋 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### Environment Setup

1. **Clone and setup**:
```bash
git clone https://github.com/teano-uTTu-9788/AiCan.git
cd AiCan
cp .env.example .env
```

2. **Configure environment variables**:
```bash
# Edit .env with your actual credentials
nano .env
```

3. **Start with Docker**:
```bash
docker-compose up -d
```

4. **Or run locally**:
```bash
npm install
npm start
```

### Basic Usage

- **Health Check**: `GET http://localhost:3000/health`
- **Trigger Workflow**: `POST http://localhost:3000/workflows/trigger/ci-cd-pipeline`
- **GitHub Webhooks**: `POST http://localhost:3000/webhooks/github`
- **n8n Interface**: `http://localhost:5678/n8n/`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ORCHESTRATOR_PORT` | Main service port | `3000` |
| `N8N_HOST` | n8n service host | `localhost` |
| `N8N_API_KEY` | n8n API authentication | - |
| `VERCEL_TOKEN` | Vercel deployment token | - |
| `GITHUB_TOKEN` | GitHub API token | - |
| `SLACK_WEBHOOK_URL` | Slack notifications | - |

For complete documentation, see **[CLAUDE.md](./CLAUDE.md)** for detailed implementation specifications.

---

&copy; 2025 AiCan Platform &bull; [MIT License](https://gh.io/mit)

