const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

const pools = [];

/**
 * Initialize PostgreSQL connection pools for all configured shards
 */
function initializePools() {
  if (pools.length > 0) return pools;

  const poolMap = new Map();

  config.db.shards.forEach((connectionString, index) => {
    if (poolMap.has(connectionString)) {
      pools.push(poolMap.get(connectionString));
      logger.info(`PostgreSQL Connection Pool reused for Shard [${index}]`);
      return;
    }

    const isNeon = connectionString.includes('neon.tech') || connectionString.includes('sslmode=');
    const isProduction = config.env === 'production';
    const useSsl = isNeon || isProduction;

    const pool = new Pool({
      connectionString,
      max: 10, // Bounded connection pool limit per shard
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000, // 15s timeout for serverless cloud connection handshakes
      ...(useSsl && {
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    });

    pool.on('error', (err) => {
      logger.error({ err, shardIndex: index }, `Unexpected PostgreSQL connection error on shard [${index}]`);
    });

    poolMap.set(connectionString, pool);
    pools.push(pool);
    logger.info(`PostgreSQL Connection Pool initialized for Shard [${index}]`);
  });

  return pools;
}

/**
 * Get pool instance for a specific shard index
 * @param {number} shardIndex 
 * @returns {Pool}
 */
function getPool(shardIndex = 0) {
  if (pools.length === 0) {
    initializePools();
  }
  const index = Math.abs(shardIndex) % pools.length;
  return pools[index];
}

/**
 * Get all active shard connection pools
 * @returns {Pool[]}
 */
function getAllPools() {
  if (pools.length === 0) {
    initializePools();
  }
  return pools;
}

/**
 * Verify database connectivity across all shard connection pools
 * @returns {Promise<boolean[]>}
 */
async function verifyShardConnections() {
  const activePools = getAllPools();
  const verifiedMap = new Map();
  const results = [];

  for (let index = 0; index < activePools.length; index++) {
    const pool = activePools[index];
    if (verifiedMap.has(pool)) {
      results.push(verifiedMap.get(pool));
      continue;
    }

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      logger.info(`Shard [${index}] connection verified successfully.`);
      verifiedMap.set(pool, true);
      results.push(true);
    } catch (err) {
      logger.warn({ err: err.message, shardIndex: index }, `Shard [${index}] connection failed or unreachable.`);
      verifiedMap.set(pool, false);
      results.push(false);
    }
  }
  return results;
}

/**
 * Gracefully close all shard connection pools
 */
async function closeAllPools() {
  await Promise.all(pools.map((pool) => pool.end()));
  pools.length = 0;
  logger.info('All database shard connection pools closed.');
}

module.exports = {
  initializePools,
  getPool,
  getAllPools,
  verifyShardConnections,
  closeAllPools,
};
