const WorkflowOrchestrator = require('../orchestrator/WorkflowOrchestrator');

// Mock integrations for testing
jest.mock('../integrations/N8nIntegration');
jest.mock('../integrations/VercelIntegration');
jest.mock('../integrations/LangGraphIntegration');
jest.mock('../services/NotificationService');

describe('WorkflowOrchestrator', () => {
  let orchestrator;

  beforeEach(async () => {
    orchestrator = new WorkflowOrchestrator();
    await orchestrator.initialize();
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('Workflow Management', () => {
    test('should load workflow definitions', () => {
      expect(orchestrator.workflows.size).toBeGreaterThan(0);
      expect(orchestrator.workflows.has('ci-cd-pipeline')).toBe(true);
      expect(orchestrator.workflows.has('deployment-pipeline')).toBe(true);
      expect(orchestrator.workflows.has('error-handling')).toBe(true);
    });

    test('should trigger workflow successfully', async () => {
      const result = await orchestrator.triggerWorkflow('ci-cd-pipeline', {
        repository: 'test/repo',
        branch: 'main'
      });

      expect(result).toMatchObject({
        jobId: expect.any(String),
        workflowId: 'ci-cd-pipeline',
        status: 'started'
      });

      expect(orchestrator.activeJobs.has(result.jobId)).toBe(true);
    });

    test('should fail to trigger unknown workflow', async () => {
      await expect(
        orchestrator.triggerWorkflow('unknown-workflow', {})
      ).rejects.toThrow('Workflow not found: unknown-workflow');
    });
  });

  describe('Step Execution', () => {
    test('should execute run_tests step', async () => {
      const result = await orchestrator.executeStep(
        { action: 'run_tests' },
        { repository: 'test/repo' }
      );

      expect(result).toMatchObject({
        tests_passed: expect.any(Boolean),
        test_results: expect.any(Object)
      });
    });

    test('should execute build_application step', async () => {
      const result = await orchestrator.executeStep(
        { action: 'build_application' },
        { repository: 'test/repo' }
      );

      expect(result).toMatchObject({
        build_success: expect.any(Boolean),
        build_artifacts: expect.any(Object)
      });
    });

    test('should execute deploy steps', async () => {
      const previewResult = await orchestrator.executeStep(
        { action: 'deploy_to_preview' },
        { repository: 'test/repo' }
      );

      expect(previewResult).toMatchObject({
        preview_url: expect.any(String),
        deployment_id: expect.any(String)
      });

      const stagingResult = await orchestrator.executeStep(
        { action: 'deploy_to_staging' },
        { repository: 'test/repo' }
      );

      expect(stagingResult).toMatchObject({
        staging_url: expect.any(String),
        deployment_id: expect.any(String)
      });
    });
  });

  describe('Condition Evaluation', () => {
    test('should evaluate tests_passed condition', () => {
      expect(orchestrator.evaluateCondition('tests_passed', { tests_passed: true })).toBe(true);
      expect(orchestrator.evaluateCondition('tests_passed', { tests_passed: false })).toBe(false);
    });

    test('should evaluate staging_tests_passed condition', () => {
      expect(orchestrator.evaluateCondition('staging_tests_passed', { staging_tests_passed: true })).toBe(true);
      expect(orchestrator.evaluateCondition('staging_tests_passed', { staging_tests_passed: false })).toBe(false);
    });

    test('should evaluate retry_failed condition', () => {
      expect(orchestrator.evaluateCondition('retry_failed', { 
        retry_attempted: true, 
        retry_success: false 
      })).toBe(true);
      
      expect(orchestrator.evaluateCondition('retry_failed', { 
        retry_attempted: true, 
        retry_success: true 
      })).toBe(false);
    });
  });

  describe('Webhook Handling', () => {
    test('should handle workflow completion webhook', async () => {
      const result = await orchestrator.handleN8nWebhook('test-workflow', {
        event: 'workflow_completed',
        data: { success: true }
      });

      expect(result).toMatchObject({
        status: 'completed'
      });
    });

    test('should handle workflow failure webhook', async () => {
      const result = await orchestrator.handleN8nWebhook('test-workflow', {
        event: 'workflow_failed',
        error: 'Test error'
      });

      expect(result).toMatchObject({
        status: 'error_handled',
        errorWorkflowTriggered: true
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle service failures', async () => {
      const unhealthyServices = ['n8n', 'vercel'];
      await orchestrator.handleServiceFailure(unhealthyServices);

      // Should not throw error and handle gracefully
      expect(true).toBe(true);
    });

    test('should handle workflow errors', async () => {
      const job = {
        id: 'test-job',
        workflowId: 'test-workflow',
        status: 'running'
      };

      const error = new Error('Test workflow error');
      await orchestrator.handleWorkflowError(job, error);

      expect(job.status).toBe('failed');
      expect(job.error).toBe('Test workflow error');
      expect(job.endTime).toBeDefined();
    });
  });

  describe('Health Check', () => {
    test('should return healthy status when initialized', () => {
      expect(orchestrator.isHealthy()).toBe(true);
    });

    test('should return unhealthy status when not initialized', () => {
      const newOrchestrator = new WorkflowOrchestrator();
      expect(newOrchestrator.isHealthy()).toBe(false);
    });
  });

  describe('Workflow Status Retrieval', () => {
    test('should get workflow status', async () => {
      // Trigger a workflow first
      const triggerResult = await orchestrator.triggerWorkflow('ci-cd-pipeline', {
        repository: 'test/repo'
      });

      const status = await orchestrator.getWorkflowStatus(triggerResult.jobId);

      expect(status).toMatchObject({
        jobId: triggerResult.jobId,
        workflowId: 'ci-cd-pipeline',
        status: expect.any(String),
        currentStep: expect.any(Number),
        steps: expect.any(Array)
      });
    });

    test('should throw error for unknown workflow', async () => {
      await expect(
        orchestrator.getWorkflowStatus('unknown-job-id')
      ).rejects.toThrow('Workflow not found: unknown-job-id');
    });
  });
});