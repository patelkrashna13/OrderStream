const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const path = require('path');
const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const uploadRoutes = require('./routes/upload.routes');
const orderRoutes = require('./routes/order.routes');
const { errorHandler } = require('./middlewares/error.middleware');
const { setupSwagger } = require('./swagger');

const app = express();
const publicDir = path.join(__dirname, '../public');

// Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

// Register Swagger UI Documentation
setupSwagger(app, '/api-docs');

// Health Check Endpoint
app.get('/health', orderRoutes);

// API Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'success',
    message: 'OrderStream API service is available',
    environment: config.env,
    swaggerDocs: `http://localhost:${config.port}/api-docs`,
    timestamp: new Date().toISOString(),
  });
});

// React Front Page
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// API Routes
app.use('/api/v1', uploadRoutes);
app.use('/api/v1', orderRoutes);
app.use('/', uploadRoutes); // Mount on root for direct path compatibility
app.use('/', orderRoutes);

// Global Error Handling Middleware
app.use(errorHandler);

// Start HTTP Server
if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.env}]`);
    logger.info(`Swagger UI documentation available at: http://localhost:${config.port}/api-docs`);
  });
}

module.exports = app;


