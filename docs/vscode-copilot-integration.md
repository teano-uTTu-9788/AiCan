# VS Code & GitHub Copilot Integration

## VS Code Configuration

This repository is optimized for VS Code development with the following recommended extensions and settings.

### Recommended Extensions

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "github.copilot",
    "github.copilot-chat",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "github.vscode-pull-request-github",
    "ms-vscode.test-adapter-converter"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.autoSave": "onFocusChange",
  "github.copilot.enable": {
    "*": true,
    "yaml": true,
    "plaintext": false,
    "markdown": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "jest.autoRun": "watch",
  "jest.showCoverageOnLoad": true
}
```

### Tasks Configuration

Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dev",
      "type": "npm",
      "script": "dev",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "runOptions": {
        "runOn": "folderOpen"
      }
    },
    {
      "label": "test",
      "type": "npm",
      "script": "test",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "deploy",
      "type": "npm",
      "script": "deploy",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

### Launch Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Web Dev Agent",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## GitHub Copilot Usage

### Code Generation Patterns

Use these patterns to get the best results from GitHub Copilot:

#### 1. Function Documentation
```javascript
/**
 * Deploy application to Vercel after successful CI checks
 * @param {Object} options - Deployment configuration
 * @param {string} options.branch - Git branch to deploy
 * @param {boolean} options.production - Production deployment flag
 * @returns {Promise<Object>} Deployment result with URL and status
 */
async function deployToVercel(options) {
  // Copilot will suggest implementation
}
```

#### 2. Test Generation
```javascript
describe('Web Development Agent Deployment', () => {
  // Add test comment and let Copilot suggest test cases
  test('should deploy successfully with valid configuration', async () => {
    // Copilot will suggest test implementation
  });
});
```

#### 3. Configuration Files
```javascript
// Create GitHub Actions workflow for CI/CD
// Copilot will suggest workflow YAML structure
```

### Copilot Chat Commands

Use these commands in Copilot Chat for development assistance:

- `/explain` - Explain complex code sections
- `/fix` - Suggest fixes for bugs or issues
- `/tests` - Generate test cases for functions
- `/doc` - Generate documentation
- `/optimize` - Suggest performance improvements

### Best Practices

1. **Use descriptive comments** before code blocks to guide Copilot
2. **Write function signatures first** to get better implementations
3. **Use consistent naming conventions** for better suggestions
4. **Break down complex tasks** into smaller, focused functions
5. **Review and test all suggestions** before committing

## Integration Workflow

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-functionality
   ```

2. **Use Copilot for Scaffolding**
   - Write comments describing functionality
   - Let Copilot suggest implementations
   - Refine and test suggestions

3. **Test Continuously**
   ```bash
   npm run test:watch
   ```

4. **Lint and Format**
   ```bash
   npm run lint:fix
   ```

5. **Commit with Descriptive Messages**
   ```bash
   git commit -m "feat: add new deployment monitoring feature"
   ```

6. **Create Pull Request**
   - GitHub Actions will run CI/CD pipeline
   - Copilot suggestions can help with PR descriptions

### Automated Workflows

The Web Development Agent integrates with:

- **VS Code**: File editing and debugging
- **Copilot**: Code generation and assistance
- **GitHub Actions**: Automated testing and deployment
- **Vercel**: Production deployments
- **Notion**: Documentation and feedback tracking

This integration ensures efficient, reliable development with full traceability from code to deployment.