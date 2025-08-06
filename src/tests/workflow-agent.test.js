const request = require('supertest');
const AiCanWorkflowAgent = require('../index');

describe('AiCan Workflow Agent', () => {
  let agent;
  let app;

  beforeAll(async () => {
    agent = new AiCanWorkflowAgent();
    app = agent.app;
    // Initialize without starting the server
    await agent.orchestrator.initialize();
  });

  afterAll(async () => {
    if (agent) {
      await agent.orchestrator.shutdown();
    }
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: expect.any(String),
        services: expect.any(Object)
      });
    });
  });

  describe('GitHub Webhooks', () => {
    test('should handle push events', async () => {
      const pushPayload = {
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
        after: 'abc123'
      };

      const response = await request(app)
        .post('/webhooks/github')
        .set('X-GitHub-Event', 'push')
        .send(pushPayload)
        .expect(200);

      expect(response.body).toMatchObject({
        received: true,
        event: 'push',
        processed: true
      });
    });

    test('should handle pull request events', async () => {
      const prPayload = {
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
        }
      };

      const response = await request(app)
        .post('/webhooks/github')
        .set('X-GitHub-Event', 'pull_request')
        .send(prPayload)
        .expect(200);

      expect(response.body).toMatchObject({
        received: true,
        event: 'pull_request',
        processed: true
      });
    });
  });

  describe('Workflow Triggers', () => {
    test('should trigger CI/CD pipeline', async () => {
      const response = await request(app)
        .post('/workflows/trigger/ci-cd-pipeline')
        .send({
          repository: 'teano-uTTu-9788/AiCan',
          branch: 'main',
          commit_sha: 'test123'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        jobId: expect.any(String),
        workflowId: 'ci-cd-pipeline',
        status: 'started'
      });
    });

    test('should return error for unknown workflow', async () => {
      const response = await request(app)
        .post('/workflows/trigger/unknown-workflow')
        .send({})
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to trigger workflow'
      });
    });
  });

  describe('Workflow Status', () => {
    test('should return workflow status', async () => {
      // First trigger a workflow
      const triggerResponse = await request(app)
        .post('/workflows/trigger/ci-cd-pipeline')
        .send({
          repository: 'teano-uTTu-9788/AiCan',
          branch: 'test'
        });

      const jobId = triggerResponse.body.jobId;

      // Then check its status
      const statusResponse = await request(app)
        .get(`/workflows/${jobId}/status`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        jobId,
        workflowId: 'ci-cd-pipeline',
        status: expect.any(String)
      });
    });
  });

  describe('n8n Webhooks', () => {
    test('should handle n8n workflow completion', async () => {
      const n8nPayload = {
        event: 'workflow_completed',
        data: {
          success: true,
          results: 'Test results'
        }
      };

      const response = await request(app)
        .post('/webhooks/n8n/test-workflow')
        .send(n8nPayload)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'completed'
      });
    });

    test('should handle n8n workflow failure', async () => {
      const n8nPayload = {
        event: 'workflow_failed',
        error: 'Test error message'
      };

      const response = await request(app)
        .post('/webhooks/n8n/test-workflow')
        .send(n8nPayload)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'error_handled',
        errorWorkflowTriggered: true
      });
    });
  });
});