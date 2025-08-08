const LangGraphIntegration = require('../integrations/LangGraphIntegration');

describe('LangGraphIntegration', () => {
  let langGraph;

  beforeEach(async () => {
    langGraph = new LangGraphIntegration();
    await langGraph.initialize();
  });

  afterEach(async () => {
    await langGraph.shutdown();
  });

  describe('Decision Graph Execution', () => {
    test('should execute deployment decision graph', async () => {
      const result = await langGraph.executeDecisionGraph('deployment-decision', {
        testResults: true,
        environment: 'production',
        risk: 'low'
      });

      expect(result).toMatchObject({
        path: expect.any(Array),
        result: expect.any(String),
        context: expect.any(Object)
      });
    });

    test('should execute error recovery graph', async () => {
      const result = await langGraph.executeDecisionGraph('error-recovery', {
        errorType: 'transient',
        retryCount: 1,
        severity: 'medium'
      });

      expect(result).toMatchObject({
        path: expect.any(Array),
        result: expect.any(String),
        context: expect.any(Object)
      });
    });

    test('should throw error for unknown graph', async () => {
      await expect(
        langGraph.executeDecisionGraph('unknown-graph', {})
      ).rejects.toThrow('Decision graph not found: unknown-graph');
    });
  });

  describe('Error Analysis', () => {
    test('should analyze transient errors', async () => {
      const error = { message: 'Connection timeout error' };
      const result = await langGraph.analyzeError(error);

      expect(result).toMatchObject({
        path: expect.any(Array),
        result: expect.any(String),
        context: expect.objectContaining({
          errorType: 'transient'
        })
      });
    });

    test('should analyze configuration errors', async () => {
      const error = { message: 'Configuration file not found' };
      const result = await langGraph.analyzeError(error);

      expect(result).toMatchObject({
        path: expect.any(Array),
        result: expect.any(String),
        context: expect.objectContaining({
          errorType: 'configuration'
        })
      });
    });

    test('should handle analysis failures gracefully', async () => {
      // Mock a failure in graph execution
      jest.spyOn(langGraph, 'executeDecisionGraph').mockRejectedValueOnce(new Error('Graph error'));

      const result = await langGraph.analyzeError({ message: 'Test error' });

      expect(result).toMatchObject({
        classification: 'unknown',
        suggestedAction: 'escalate',
        confidence: 0.5
      });
    });
  });

  describe('Deployment Decision Making', () => {
    test('should make deployment decision for low risk', async () => {
      const result = await langGraph.makeDeploymentDecision({
        tests_passed: true,
        environment: 'staging'
      });

      expect(result).toMatchObject({
        result: expect.any(String),
        context: expect.any(Object)
      });
    });

    test('should require approval for high risk', async () => {
      const result = await langGraph.makeDeploymentDecision({
        tests_passed: false,
        environment: 'production'
      });

      expect(result.result).toBe('require-approval');
    });

    test('should handle decision failures with safe defaults', async () => {
      // Mock a failure
      jest.spyOn(langGraph, 'executeDecisionGraph').mockRejectedValueOnce(new Error('Decision error'));

      const result = await langGraph.makeDeploymentDecision({});

      expect(result).toMatchObject({
        result: 'require-approval',
        context: { fallback: true }
      });
    });
  });

  describe('Error Classification', () => {
    test('should classify timeout errors as transient', () => {
      const classification = langGraph.classifyError({
        errorMessage: 'Request timeout after 30 seconds'
      });

      expect(classification).toMatchObject({
        classification: 'transient',
        canRetry: true,
        suggestedAction: 'retry'
      });
    });

    test('should classify config errors as configuration', () => {
      const classification = langGraph.classifyError({
        errorMessage: 'Environment variable not configured'
      });

      expect(classification).toMatchObject({
        classification: 'configuration',
        canRetry: false,
        suggestedAction: 'fix-config'
      });
    });

    test('should classify unknown errors as critical', () => {
      const classification = langGraph.classifyError({
        errorMessage: 'Unexpected system failure'
      });

      expect(classification).toMatchObject({
        classification: 'critical',
        canRetry: false,
        suggestedAction: 'escalate'
      });
    });
  });

  describe('Risk Assessment', () => {
    test('should assess high risk for failed tests', () => {
      const risk = langGraph.assessDeploymentRisk({
        tests_passed: false
      });

      expect(risk).toBe('high');
    });

    test('should assess medium risk for production', () => {
      const risk = langGraph.assessDeploymentRisk({
        tests_passed: true,
        environment: 'production'
      });

      expect(risk).toBe('medium');
    });

    test('should assess low risk for staging with passing tests', () => {
      const risk = langGraph.assessDeploymentRisk({
        tests_passed: true,
        environment: 'staging'
      });

      expect(risk).toBe('low');
    });
  });

  describe('Condition Evaluation', () => {
    test('should evaluate simple conditions', () => {
      const context = { risk: 'high', environment: 'production' };

      expect(langGraph.evaluateCondition('risk === "high"', context)).toBe(true);
      expect(langGraph.evaluateCondition('risk === "low"', context)).toBe(false);
      expect(langGraph.evaluateCondition('environment === "production"', context)).toBe(true);
    });

    test('should handle complex conditions', () => {
      const context = { retryCount: 2, errorType: 'transient' };

      expect(langGraph.evaluateCondition('retryCount < 3 && errorType === "transient"', context)).toBe(true);
      expect(langGraph.evaluateCondition('retryCount >= 3 && errorType === "transient"', context)).toBe(false);
    });

    test('should handle evaluation errors gracefully', () => {
      const result = langGraph.evaluateCondition('invalid.syntax.error', {});
      expect(result).toBe(false);
    });
  });

  describe('Health Status', () => {
    test('should be healthy when initialized', () => {
      expect(langGraph.isHealthy()).toBe(true);
    });

    test('should be unhealthy when not initialized', () => {
      const newLangGraph = new LangGraphIntegration();
      expect(newLangGraph.isHealthy()).toBe(false);
    });
  });
});