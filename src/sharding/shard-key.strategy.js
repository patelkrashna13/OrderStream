const crypto = require('crypto');

/**
 * Deterministic string hash algorithm producing a non-negative 32-bit integer
 * @param {string} str 
 * @returns {number}
 */
function hashString(str) {
  if (!str) return 0;
  const hash = crypto.createHash('md5').update(String(str)).digest('hex');
  // Convert first 8 hex characters to integer
  return parseInt(hash.substring(0, 8), 16);
}

/**
 * Strategy 1: Customer ID Hashing Shard Strategy (Recommended)
 * Groups all order records for a single customer onto the same database shard
 * @param {string} customerId 
 * @param {number} shardCount 
 * @returns {number}
 */
function calculateCustomerShard(customerId, shardCount = 2) {
  if (shardCount <= 1) return 0;
  const hashVal = hashString(customerId);
  return Math.abs(hashVal) % shardCount;
}

/**
 * Strategy 2: Order ID Modulo Hashing Shard Strategy
 * Distributes records evenly across all database shards using a hash of order_id
 * @param {string} orderId 
 * @param {number} shardCount 
 * @returns {number}
 */
function calculateOrderIdShard(orderId, shardCount = 2) {
  if (shardCount <= 1) return 0;
  const hashVal = hashString(orderId);
  return Math.abs(hashVal) % shardCount;
}

/**
 * Strategy 3: Time-Based Date Shard Strategy
 * Routes orders based on transaction order_date timestamp
 * @param {string|Date} orderDate 
 * @param {number} shardCount 
 * @returns {number}
 */
function calculateDateShard(orderDate, shardCount = 2) {
  if (shardCount <= 1) return 0;
  const d = new Date(orderDate);
  const timeMs = isNaN(d.getTime()) ? 0 : d.getTime();
  // Group by day epoch
  const dayIndex = Math.floor(timeMs / (1000 * 60 * 60 * 24));
  return Math.abs(dayIndex) % shardCount;
}

module.exports = {
  hashString,
  calculateCustomerShard,
  calculateOrderIdShard,
  calculateDateShard,
};
