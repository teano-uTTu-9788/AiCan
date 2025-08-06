const request = require('supertest');
const app = require('../server');

describe('Web Development Agent Server', () => {
  afterAll(() => {
    // Close any open handles
    if (app && app.close) {
      app.close();
    }
  });

  describe('Health Check', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'Web Development Agent');
    });
  });

  describe('API Endpoints', () => {
    test('GET /api/status should return status information', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toHaveProperty('build');
      expect(response.body).toHaveProperty('deployment');
      expect(response.body).toHaveProperty('coverage');
      expect(response.body).toHaveProperty('lastUpdate');
    });
  });

  describe('Static Files', () => {
    test('GET / should serve the main page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.type).toBe('text/html');
    });
  });

  describe('Error Handling', () => {
    test('GET /nonexistent should return 404', async () => {
      await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);
    });
  });
});