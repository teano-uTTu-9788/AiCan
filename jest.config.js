module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/index.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup.js'
  ],
  testTimeout: 30000,
  maxWorkers: 1,
  detectOpenHandles: true,
  forceExit: true
};