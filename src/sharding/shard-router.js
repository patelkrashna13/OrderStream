const config = require('../config');
const { getPool } = require('../database/pool');
const {
  calculateCustomerShard,
  calculateOrderIdShard,
  calculateDateShard,
} = require('./shard-key.strategy');
const logger = require('../utils/logger');

class ShardRouter {
  /**
   * Initialize ShardRouter with a configured strategy ('customer_id' | 'order_id_hash' | 'order_date')
   * @param {string} [strategy='customer_id'] 
   * @param {number} [shardCount] 
   */
  constructor(strategy = 'customer_id', shardCount = config.db.shardCount) {
    this.strategy = strategy;
    this.shardCount = shardCount;
    logger.info(`ShardRouter initialized with strategy [${this.strategy}] across [${this.shardCount}] shard(s).`);
  }

  /**
   * Calculates target shard index (0 to N-1) for a given order record
   * @param {Object} record - Domain order object
   * @returns {number}
   */
  getShardIndex(record) {
    if (!record) return 0;

    switch (this.strategy) {
      case 'order_id_hash':
        return calculateOrderIdShard(record.order_id, this.shardCount);
      case 'order_date':
        return calculateDateShard(record.order_date, this.shardCount);
      case 'customer_id':
      default:
        return calculateCustomerShard(record.customer_id, this.shardCount);
    }
  }

  /**
   * Resolves target PostgreSQL connection pool for an order record
   * @param {Object} record 
   * @returns {import('pg').Pool}
   */
  getPoolForRecord(record) {
    const shardIndex = this.getShardIndex(record);
    return getPool(shardIndex);
  }

  /**
   * Group an array of order records into a Map keyed by target shard index
   * @param {Object[]} records 
   * @returns {Map<number, Object[]>}
   */
  groupRecordsByShard(records) {
    const shardMap = new Map();

    for (let i = 0; i < this.shardCount; i += 1) {
      shardMap.set(i, []);
    }

    records.forEach((record) => {
      const shardIndex = this.getShardIndex(record);
      if (!shardMap.has(shardIndex)) {
        shardMap.set(shardIndex, []);
      }
      shardMap.get(shardIndex).push(record);
    });

    return shardMap;
  }
}

// Export default singleton instance using customer_id strategy
const defaultShardRouter = new ShardRouter('customer_id');

module.exports = {
  ShardRouter,
  defaultShardRouter,
};
