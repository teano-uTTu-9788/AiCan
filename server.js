const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Web Development Agent'
  });
});

// Main application endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for build status
app.get('/api/status', (req, res) => {
  res.json({
    build: 'success',
    deployment: 'ready',
    coverage: '90%+',
    lastUpdate: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Web Development Agent server running on port ${PORT}`);
});

module.exports = app;