const config = require('../config');
const { defaultShardRouter } = require('../sharding/shard-router');
const { insertOrdersBatch, insertFailedRecordsBatch } = require('./order.repository');
const logger = require('../utils/logger');

class BatchProcessor {
  /**
   * Initialize BatchProcessor
   * @param {Object} options 
   * @param {number} [options.batchSize] - Batch chunk limit (default from config: 500)
   * @param {import('../sharding/shard-router').ShardRouter} [options.shardRouter]
   * @param {string} [options.jobId]
   */
  constructor(options = {}) {
    this.batchSize = options.batchSize || config.pipeline.batchSize || 500;
    this.shardRouter = options.shardRouter || defaultShardRouter;
    this.jobId = options.jobId || null;

    // Buffer map keyed by shardIndex: Map<number, Object[]>
    this.buffers = new Map();
    this.failedBuffer = [];
    this.totalInserted = 0;

    for (let i = 0; i < this.shardRouter.shardCount; i += 1) {
      this.buffers.set(i, []);
    }
  }

  /**
   * Adds a validated domain order object to the appropriate shard buffer
   * Flushes the buffer to the database if batch size threshold is reached
   * @param {Object} validRecord 
   */
  async addRecord(validRecord) {
    const shardIndex = this.shardRouter.getShardIndex(validRecord);
    const shardBuffer = this.buffers.get(shardIndex);

    shardBuffer.push(validRecord);

    if (shardBuffer.length >= this.batchSize) {
      await this.flushShardBuffer(shardIndex);
    }
  }

  /**
   * Adds a dead-letter failed record to the failure buffer
   * @param {Object} failurePayload 
   */
  async addFailedRecord(failurePayload) {
    this.failedBuffer.push(failurePayload);

    if (this.failedBuffer.length >= this.batchSize) {
      await this.flushFailedBuffer();
    }
  }

  /**
   * Flushes a specific shard buffer to its database shard via transactional batch insert
   * @param {number} shardIndex 
   */
  async flushShardBuffer(shardIndex) {
    const buffer = this.buffers.get(shardIndex);
    if (!buffer || buffer.length === 0) return;

    const chunkToInsert = [...buffer];
    buffer.length = 0; // Clear buffer immediately

    const pool = this.shardRouter.getPoolForRecord(chunkToInsert[0]);
    const { insertedCount } = await insertOrdersBatch(pool, chunkToInsert, this.jobId);
    this.totalInserted += insertedCount;

    logger.info({ shardIndex, count: insertedCount, totalInserted: this.totalInserted }, `Flushed batch of [${insertedCount}] orders to Shard [${shardIndex}].`);
  }

  /**
   * Flushes dead-letter failure records buffer to Shard 0 (or primary shard)
   */
  async flushFailedBuffer() {
    if (this.failedBuffer.length === 0) return;

    const chunkToInsert = [...this.failedBuffer];
    this.failedBuffer.length = 0;

    const pool = this.shardRouter.getPoolForRecord({ customer_id: 'AUDIT_LOG' });
    await insertFailedRecordsBatch(pool, chunkToInsert);
    logger.info({ count: chunkToInsert.length }, `Flushed dead-letter batch of [${chunkToInsert.length}] failed records.`);
  }

  /**
   * Flush all remaining buffered records across all shards (called at end of stream)
   */
  async flushAll() {
    logger.info('Flushing all remaining buffered records across all shards...');

    for (const shardIndex of this.buffers.keys()) {
      await this.flushShardBuffer(shardIndex);
    }

    await this.flushFailedBuffer();

    return { totalInserted: this.totalInserted };
  }
}

module.exports = {
  BatchProcessor,
};
