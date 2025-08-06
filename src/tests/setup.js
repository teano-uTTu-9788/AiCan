// Test setup file for Jest
const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.ORCHESTRATOR_PORT = '3001';

// Mock external services
process.env.N8N_HOST = 'localhost';
process.env.N8N_PORT = '5678';
process.env.N8N_API_KEY = 'test-api-key';
process.env.VERCEL_TOKEN = 'test-vercel-token';
process.env.VERCEL_PROJECT_ID = 'test-project-id';
process.env.GITHUB_TOKEN = 'test-github-token';

// Suppress console output during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockWebhookPayload: (event, overrides = {}) => ({
    repository: {
      full_name: 'teano-uTTu-9788/AiCan'
    },
    ...overrides
  }),

  mockGitHubPushPayload: (overrides = {}) => ({
    ref: 'refs/heads/main',
    repository: {
      full_name: 'teano-uTTu-9788/AiCan'
    },
    commits: [
      {
        id: 'abc123',
        message: 'Test commit'
      }
    ],
    pusher: {
      name: 'test-user'
    },
    after: 'abc123',
    ...overrides
  }),

  mockGitHubPRPayload: (overrides = {}) => ({
    action: 'opened',
    pull_request: {
      number: 123,
      head: {
        ref: 'feature/test',
        sha: 'def456'
      },
      base: {
        ref: 'main'
      }
    },
    repository: {
      full_name: 'teano-uTTu-9788/AiCan'
    },
    ...overrides
  })
};

// Setup and teardown hooks
beforeAll(() => {
  // Global setup
});

afterAll(() => {
  // Global cleanup
});

// Mock external HTTP requests by default
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
    post: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
    put: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
    delete: jest.fn(() => Promise.resolve({ status: 200, data: {} }))
  })),
  get: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
  post: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
  put: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
  delete: jest.fn(() => Promise.resolve({ status: 200, data: {} }))
}));