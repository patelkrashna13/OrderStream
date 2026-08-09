const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const uploadRoutes = require('./routes/upload.routes');
const orderRoutes = require('./routes/order.routes');
const { errorHandler } = require('./middlewares/error.middleware');
const { setupSwagger } = require('./swagger');

const app = express();

// Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register Swagger UI Documentation
setupSwagger(app, '/api-docs');

// Health Check Endpoint
app.get('/health', orderRoutes);

// Root Status Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend Engineering Assessment API Service',
    environment: config.env,
    swaggerDocs: `http://localhost:${config.port}/api-docs`,
    timestamp: new Date().toISOString(),
  });
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


