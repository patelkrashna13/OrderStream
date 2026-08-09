const config = require('../config');

/**
 * OpenAPI 3.0 Specification Definition
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Backend Engineering Assessment API',
    version: '1.0.0',
    description: 'High-performance bulk order ingestion backend system with GCS cloud storage, stream parsing, and sharded PostgreSQL database persistence.',
    contact: {
      name: 'Software Engineering Team',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/v1`,
      description: 'Local Development Server (API v1)',
    },
    {
      url: `http://localhost:${config.port}`,
      description: 'Local Base Server',
    },
  ],
  tags: [
    {
      name: 'Upload',
      description: 'Bulk order file upload and cloud archival endpoints',
    },
    {
      name: 'Orders',
      description: 'Order search and single-order retrieval endpoints',
    },
    {
      name: 'System',
      description: 'System health check and observability endpoints',
    },
  ],
  components: {
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'success',
          },
          message: {
            type: 'string',
            example: 'Operation completed successfully.',
          },
          data: {
            type: 'object',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'error',
          },
          code: {
            type: 'string',
            example: 'INVALID_FILE_TYPE',
          },
          message: {
            type: 'string',
            example: 'Only CSV (.csv) and Excel (.xlsx, .xls) files are supported.',
          },
          details: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ValidationError',
            },
          },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            example: 'file',
          },
          issue: {
            type: 'string',
            example: 'Unsupported file extension.',
          },
        },
      },
      UploadResponse: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            format: 'uuid',
            example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          },
          filename: {
            type: 'string',
            example: 'orders_10k.csv',
          },
          gcsUri: {
            type: 'string',
            example: 'gs://orders-ingestion-bucket/orders/1723000000000_orders_10k.csv',
          },
          metrics: {
            type: 'object',
            properties: {
              totalRecords: {
                type: 'integer',
                example: 10000,
              },
              insertedRecords: {
                type: 'integer',
                example: 9950,
              },
              failedRecords: {
                type: 'integer',
                example: 50,
              },
              processingTimeMs: {
                type: 'integer',
                example: 3420,
              },
            },
          },
        },
      },
      ImportJob: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            format: 'uuid',
            example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          },
          filename: {
            type: 'string',
            example: 'orders_10k.csv',
          },
          gcsUri: {
            type: 'string',
            example: 'gs://orders-ingestion-bucket/orders/1723000000000_orders_10k.csv',
          },
          totalRecords: {
            type: 'integer',
            example: 10000,
          },
          validRecords: {
            type: 'integer',
            example: 9950,
          },
          failedRecords: {
            type: 'integer',
            example: 50,
          },
          status: {
            type: 'string',
            enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
            example: 'COMPLETED',
          },
          startedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-08-06T22:30:00.000Z',
          },
          completedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-08-06T22:30:03.420Z',
          },
        },
      },
    },
  },
};

module.exports = swaggerDefinition;
