const WebDevelopmentAgent = require('../src/web-dev-agent');

describe('WebDevelopmentAgent', () => {
  let agent;

  beforeEach(() => {
    agent = new WebDevelopmentAgent({
      port: 3001,
      environment: 'test',
      orchestratorUrl: 'https://test-orchestrator.com'
    });
  });

  describe('Initialization', () => {
    test('should create agent with default config', () => {
      const defaultAgent = new WebDevelopmentAgent();
      expect(defaultAgent.config.port).toBe(3000);
      expect(defaultAgent.config.environment).toBe('development');
      expect(defaultAgent.status).toBe('initialized');
    });

    test('should create agent with custom config', () => {
      expect(agent.config.port).toBe(3001);
      expect(agent.config.environment).toBe('test');
      expect(agent.config.orchestratorUrl).toBe('https://test-orchestrator.com');
    });

    test('should initialize successfully', async () => {
      const result = await agent.initialize();
      expect(result).toBe(true);
      expect(agent.status).toBe('running');
    });
  });

  describe('Deployment', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should deploy successfully', async () => {
      const deployment = await agent.deploy({ branch: 'main' });
      
      expect(deployment).toHaveProperty('id');
      expect(deployment).toHaveProperty('timestamp');
      expect(deployment).toHaveProperty('status', 'completed');
      expect(deployment).toHaveProperty('url');
      expect(deployment.url).toMatch(/^https:\/\/app-deploy-\d+\.vercel\.app$/);
    });

    test('should fail deployment if not initialized', async () => {
      const uninitializedAgent = new WebDevelopmentAgent();
      
      await expect(uninitializedAgent.deploy())
        .rejects
        .toThrow('Agent not initialized');
    });

    test('should track multiple deployments', async () => {
      await agent.deploy({ branch: 'main' });
      await agent.deploy({ branch: 'develop' });
      
      expect(agent.deployments).toHaveLength(2);
      expect(agent.deployments[0].id).not.toBe(agent.deployments[1].id);
    });
  });

  describe('Status Reporting', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should generate status report', async () => {
      const report = await agent.generateStatusReport();
      
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('status', 'running');
      expect(report).toHaveProperty('deploymentsCount', 0);
      expect(report).toHaveProperty('health', 'healthy');
      expect(report).toHaveProperty('coverage', 90);
    });

    test('should include deployment info in report', async () => {
      await agent.deploy();
      const report = await agent.generateStatusReport();
      
      expect(report.deploymentsCount).toBe(1);
      expect(report.lastDeployment).not.toBeNull();
      expect(report.lastDeployment).toHaveProperty('status', 'completed');
    });

    test('should report to orchestrator successfully', async () => {
      const report = await agent.generateStatusReport();
      const result = await agent.reportToOrchestrator(report);
      
      expect(result.success).toBe(true);
      expect(result.reportId).toBe(report.id);
    });

    test('should handle missing orchestrator URL', async () => {
      const agentWithoutOrchestrator = new WebDevelopmentAgent();
      await agentWithoutOrchestrator.initialize();
      
      const report = await agentWithoutOrchestrator.generateStatusReport();
      const result = await agentWithoutOrchestrator.reportToOrchestrator(report);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('No orchestrator URL configured');
    });
  });

  describe('Health Checks', () => {
    test('should return healthy status', async () => {
      const health = await agent.checkHealth();
      
      expect(health).toHaveProperty('status', 'healthy');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('checks');
      expect(health.checks.server).toBe(true);
      expect(health.checks.database).toBe(true);
      expect(health.checks.integrations).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    test('should get current status', () => {
      const status = agent.getStatus();
      
      expect(status).toHaveProperty('status', 'initialized');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('deployments', 0);
      expect(status).toHaveProperty('reports', 0);
    });

    test('should calculate coverage correctly', () => {
      expect(agent.calculateCoverage({ lines: 100, covered: 90 })).toBe(90);
      expect(agent.calculateCoverage({ lines: 50, covered: 45 })).toBe(90);
      expect(agent.calculateCoverage()).toBe(90); // defaults
    });

    test('should validate configuration', () => {
      expect(() => agent.validateConfiguration()).not.toThrow();
      
      const invalidAgent = new WebDevelopmentAgent({ port: null });
      expect(() => invalidAgent.validateConfiguration())
        .toThrow('Missing required configuration: port');
    });
  });
});