const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  logLevel: process.env.LOG_LEVEL || 'info',

  gcs: {
    bucketName: process.env.GCS_BUCKET_NAME || 'orders-ingestion-bucket',
  },

  db: {
    shardCount: parseInt(process.env.DB_SHARD_COUNT, 10) || 2,
    shards: [
      process.env.DB_SHARD_1_URL || 'postgresql://postgres:postgres@localhost:5432/orders_shard_1',
      process.env.DB_SHARD_2_URL || 'postgresql://postgres:postgres@localhost:5433/orders_shard_2',
    ],
  },

  pipeline: {
    batchSize: parseInt(process.env.BATCH_SIZE, 10) || 500,
    maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 52428800, // 50MB
  },
};

module.exports = Object.freeze(config);
