const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger.config');
const logger = require('../utils/logger');

/**
 * Registers Swagger UI middleware on an Express application
 * @param {import('express').Application} app 
 * @param {string} [path='/api-docs'] 
 */
function setupSwagger(app, routePath = '/api-docs') {
  app.use(routePath, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  logger.info(`Swagger UI documentation registered at [${routePath}]`);
}

module.exports = {
  setupSwagger,
  swaggerSpec,
};
