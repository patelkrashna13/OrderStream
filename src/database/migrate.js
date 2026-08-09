const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const fs = require('fs');
const path = require('path');
const { getAllPools } = require('./pool');
const logger = require('../utils/logger');

/**
 * Execute DDL schema migrations across all database shard pools
 */
async function runMigrations() {
  const migrationPath = path.join(__dirname, 'migrations', '001_create_tables.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const pools = getAllPools();
  logger.info(`Applying database schema migrations across ${pools.length} shard(s)...`);

  const results = [];
  for (let index = 0; index < pools.length; index++) {
    const pool = pools[index];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      logger.info(`Schema migration applied successfully to Shard [${index}]`);
      results.push(true);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err: err.message, shardIndex: index }, `Failed to apply schema migration to Shard [${index}]`);
      throw err;
    } finally {
      client.release();
    }
  }

  return results;
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('All database schema migrations completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Database migration failed.');
      process.exit(1);
    });
}

module.exports = { runMigrations };
