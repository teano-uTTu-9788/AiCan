# AiCan Web Development Agent 🤖

A comprehensive web development agent that manages site, web app, and UI development with integrated CI/CD pipeline, automated testing, and deployment orchestration.

## 🚀 Features

- **Automated CI/CD Pipeline**: GitHub Actions integration with automated testing and deployment
- **90%+ Test Coverage**: Comprehensive test suite with coverage enforcement
- **Multi-Platform Integration**: VS Code, GitHub Copilot, Vercel, Notion, and n8n
- **Real-time Monitoring**: Live status dashboard with health checks
- **Deployment Automation**: Automated Vercel deployments after successful CI
- **Status Reporting**: Comprehensive status reports to orchestrator
- **User Feedback Tracking**: Notion integration for feedback and design notes

## 📋 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- GitHub account
- Vercel account (for deployment)
- Notion account (for logging)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/teano-uTTu-9788/AiCan.git
   cd AiCan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🛠 Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```bash
# Vercel Configuration
VERCEL_TOKEN=your_vercel_token_here
VERCEL_PROJECT_ID=your_project_id_here

# Orchestrator Configuration  
ORCHESTRATOR_URL=https://your-orchestrator.example.com/api/status

# Notion Integration
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id

# Application Configuration
PORT=3000
NODE_ENV=production
```

### GitHub Secrets

Configure the following secrets in your GitHub repository:

- `VERCEL_TOKEN`: Your Vercel deployment token
- `VERCEL_PROJECT_ID`: Your Vercel project ID
- `ORCHESTRATOR_URL`: Your orchestrator endpoint
- `NOTION_TOKEN`: Your Notion integration token

## 🔧 Development

### Project Structure

```
├── .github/
│   └── workflows/          # GitHub Actions CI/CD
├── .vscode/                # VS Code configuration
├── docs/                   # Documentation
├── public/                 # Static web assets
├── scripts/                # Deployment and utility scripts
├── src/                    # Core application logic
├── tests/                  # Test suites
├── CLAUDE.md              # Agent specification
├── package.json           # Dependencies and scripts
├── server.js              # Express server
└── vercel.json            # Vercel deployment config
```

### Available Scripts

```bash
npm run dev         # Start development server
npm run build       # Build and test the application
npm run test        # Run test suite with coverage
npm run test:watch  # Run tests in watch mode
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint errors
npm run deploy      # Deploy to Vercel
npm run report-status # Generate status report
```

### Testing

The project maintains >90% test coverage requirement:

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode for development
npm run test:watch

# Check coverage thresholds
npm run build
```

## 🚀 Deployment

### Automatic Deployment

1. **Push to main branch** triggers automatic deployment
2. **CI pipeline runs** tests and builds
3. **Coverage verified** (must be >90%)
4. **Vercel deployment** triggered on success
5. **Status reported** to orchestrator
6. **Notion logging** captures deployment details

### Manual Deployment

```bash
# Deploy manually
npm run deploy

# Generate status report
npm run report-status deployment
```

## 📊 Monitoring

### Status Dashboard

Access the live status dashboard at your deployment URL:

- **Build Status**: Current CI/CD pipeline status
- **Deployment Status**: Vercel deployment health
- **Test Coverage**: Real-time coverage metrics
- **Integration Status**: All service integrations

### Health Checks

```bash
# Check application health
curl https://your-app.vercel.app/health

# Get detailed status
curl https://your-app.vercel.app/api/status
```

## 🔌 Integrations

### VS Code & GitHub Copilot

The repository includes complete VS Code configuration:

- Extension recommendations
- Debug configurations
- Task automation
- Copilot optimization

See [VS Code & Copilot Integration Guide](docs/vscode-copilot-integration.md)

### Notion

Comprehensive logging and feedback tracking:

- Deployment logs
- Status reports
- User feedback
- Error tracking

See [Notion Integration Guide](docs/notion-integration.md)

### Vercel

Automated deployment with:

- Build optimization
- Environment configuration
- Custom routing
- Performance monitoring

### GitHub Actions

CI/CD pipeline includes:

- Automated testing
- Coverage enforcement
- ESLint validation
- Deployment automation
- Status reporting

## 📖 API Reference

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "service": "Web Development Agent"
}
```

### Status Information

```http
GET /api/status
```

Response:
```json
{
  "build": "success",
  "deployment": "ready", 
  "coverage": "90%+",
  "lastUpdate": "2025-01-15T10:30:00Z"
}
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make changes** with tests
4. **Ensure coverage** remains >90%
5. **Commit changes** (`git commit -m 'Add amazing feature'`)
6. **Push to branch** (`git push origin feature/amazing-feature`)
7. **Create Pull Request**

### Code Standards

- ESLint configuration enforced
- 90%+ test coverage required
- All tests must pass
- Copilot-assisted development encouraged

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` directory
- **Issues**: Create GitHub issues for bugs
- **Features**: Submit feature requests via issues
- **Discord**: Join our development community

## 🏆 Standards and Guidelines

- ✅ Use project coding and branching standards
- ✅ Tests must run on all PRs
- ✅ Automated test coverage >90%
- ✅ Each deployment logs a status report
- ✅ Efficient, reliable UI deployments with full traceability

---

**Powered by**: VS Code, Copilot, GitHub Actions, Vercel, Notion, and n8n

Built with ❤️ by the AiCan Web Development Agent

