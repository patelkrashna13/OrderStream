const swaggerJSDoc = require('swagger-jsdoc');
const swaggerDefinition = require('./swagger.definition');

const options = {
  swaggerDefinition,
  // Use forward slashes for glob pattern matching across all operating systems
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
  ],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;

