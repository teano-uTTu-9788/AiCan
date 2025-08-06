const NotionLogger = require('../src/notion-logger');

describe('NotionLogger', () => {
  let logger;

  beforeEach(() => {
    logger = new NotionLogger({
      token: 'test_token',
      databaseId: 'test_database_id'
    });
  });

  describe('Initialization', () => {
    test('should create logger with config', () => {
      expect(logger.token).toBe('test_token');
      expect(logger.databaseId).toBe('test_database_id');
      expect(logger.baseUrl).toBe('https://api.notion.com/v1');
    });

    test('should warn when no config provided', () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      new NotionLogger();
      expect(consoleWarn).toHaveBeenCalledWith('⚠️ Notion token or database ID not configured');
      consoleWarn.mockRestore();
    });
  });

  describe('Deployment Logging', () => {
    test('should log deployment with full details', async () => {
      const deployment = {
        title: 'Production Deployment',
        status: 'Success',
        url: 'https://app.vercel.app',
        environment: 'Production',
        buildId: 'build-123',
        coverage: 95,
        description: 'Deployed new features'
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await logger.logDeployment(deployment);
      
      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '📝 Notion logging simulation:',
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });

    test('should use defaults for missing deployment fields', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await logger.logDeployment({});
      
      expect(result.success).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('Status Report Logging', () => {
    test('should log status report', async () => {
      const report = {
        title: 'Weekly Status',
        status: 'Success',
        coverage: 92,
        description: 'All systems operational'
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await logger.logStatusReport(report);
      
      expect(result.success).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('Feedback Logging', () => {
    test('should log user feedback', async () => {
      const feedback = {
        title: 'UI Improvement',
        status: 'Pending',
        description: 'Navigation could be improved'
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await logger.logFeedback(feedback);
      
      expect(result.success).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('Entry Creation', () => {
    test('should simulate entry creation when not configured', async () => {
      const unconfiguredLogger = new NotionLogger();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await unconfiguredLogger.createEntry({ test: 'data' });
      
      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      consoleSpy.mockRestore();
    });
  });
});