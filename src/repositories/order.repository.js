const logger = require('../utils/logger');

/**
 * Execute multi-row parameterized batch insert for orders inside a database transaction
 * @param {import('pg').Pool} pool - Target shard database connection pool
 * @param {Object[]} ordersChunk - Array of validated order objects
 * @param {string} [jobId] - Optional ingestion job ID
 * @returns {Promise<{ insertedCount: number }>}
 */
async function insertOrdersBatch(pool, ordersChunk, jobId = null) {
  if (!ordersChunk || ordersChunk.length === 0) {
    return { insertedCount: 0 };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Build multi-row parameterized SQL statement
    // INSERT INTO orders (order_id, customer_id, order_date, order_amount, status, job_id) VALUES ($1, $2, $3, $4, $5, $6), ...
    const valueTuples = [];
    const values = [];
    let paramIndex = 1;

    ordersChunk.forEach((order) => {
      valueTuples.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`
      );
      values.push(
        order.order_id,
        order.customer_id,
        order.order_date,
        order.order_amount,
        order.status,
        jobId || order.job_id || null
      );
      paramIndex += 6;
    });

    const sql = `
      INSERT INTO orders (order_id, customer_id, order_date, order_amount, status, job_id)
      VALUES ${valueTuples.join(', ')}
      ON CONFLICT (order_id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        order_date = EXCLUDED.order_date,
        order_amount = EXCLUDED.order_amount,
        status = EXCLUDED.status,
        job_id = EXCLUDED.job_id;
    `;

    await client.query(sql, values);
    await client.query('COMMIT');

    logger.debug({ chunkSize: ordersChunk.length, jobId }, 'Batch insert executed successfully within SQL transaction.');
    return { insertedCount: ordersChunk.length };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err: err.message, chunkSize: ordersChunk.length, jobId }, 'Batch insert transaction failed and was rolled back.');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute multi-row batch insert for dead-letter failed records
 * @param {import('pg').Pool} pool 
 * @param {Object[]} failedChunk 
 * @returns {Promise<{ insertedCount: number }>}
 */
async function insertFailedRecordsBatch(pool, failedChunk) {
  if (!failedChunk || failedChunk.length === 0) {
    return { insertedCount: 0 };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const valueTuples = [];
    const values = [];
    let paramIndex = 1;

    failedChunk.forEach((failure) => {
      valueTuples.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`);
      values.push(
        failure.failure_id,
        failure.job_id || null,
        failure.line_number,
        failure.raw_payload,
        failure.failure_reason
      );
      paramIndex += 5;
    });

    const sql = `
      INSERT INTO failed_records (failure_id, job_id, line_number, raw_payload, failure_reason)
      VALUES ${valueTuples.join(', ')}
      ON CONFLICT (failure_id) DO NOTHING;
    `;

    await client.query(sql, values);
    await client.query('COMMIT');

    return { insertedCount: failedChunk.length };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err: err.message, chunkSize: failedChunk.length }, 'Failed records batch insert failed.');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Create an import job record in the database
 * @param {import('pg').Pool} pool 
 * @param {Object} jobData 
 */
async function createImportJobRecord(pool, jobData) {
  const client = await pool.connect();
  try {
    const sql = `
      INSERT INTO import_jobs (job_id, filename, gcs_uri, total_records, valid_records, failed_records, status, started_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (job_id) DO NOTHING;
    `;
    await client.query(sql, [
      jobData.jobId,
      jobData.filename,
      jobData.gcsUri || null,
      jobData.totalRecords || 0,
      jobData.validRecords || 0,
      jobData.failedRecords || 0,
      jobData.status || 'PROCESSING',
    ]);
  } catch (err) {
    logger.warn({ err: err.message, jobId: jobData.jobId }, 'Failed to create import_jobs audit record.');
  } finally {
    client.release();
  }
}

/**
 * Update an import job record status
 * @param {import('pg').Pool} pool 
 * @param {string} jobId 
 * @param {Object} updateData 
 */
async function updateImportJobRecord(pool, jobId, updateData) {
  const client = await pool.connect();
  try {
    const sql = `
      UPDATE import_jobs
      SET total_records = $1,
          valid_records = $2,
          failed_records = $3,
          status = $4,
          completed_at = CURRENT_TIMESTAMP
      WHERE job_id = $5;
    `;
    await client.query(sql, [
      updateData.totalRecords || 0,
      updateData.validRecords || 0,
      updateData.failedRecords || 0,
      updateData.status || 'COMPLETED',
      jobId,
    ]);
  } catch (err) {
    logger.warn({ err: err.message, jobId }, 'Failed to update import_jobs audit record.');
  } finally {
    client.release();
  }
}

/**
 * Fetch a single order by order_id across database shards
 * @param {import('pg').Pool[]} pools - Array of shard pools
 * @param {string} orderId 
 * @param {import('../sharding/shard-router').ShardRouter} shardRouter 
 * @returns {Promise<Object|null>}
 */
async function findOrderById(pools, orderId, shardRouter) {
  // If shard strategy is based on order_id_hash, target specific shard
  if (shardRouter && shardRouter.strategy === 'order_id_hash') {
    const shardIndex = shardRouter.getShardIndex({ order_id: orderId });
    const targetPool = pools[shardIndex];
    const res = await targetPool.query('SELECT order_id, customer_id, order_date, order_amount, status FROM orders WHERE order_id = $1 LIMIT 1', [orderId]);
    return res.rows.length > 0 ? res.rows[0] : null;
  }

  // Otherwise, execute parallel scatter-gather query across all shards
  const results = await Promise.all(
    pools.map(async (pool) => {
      try {
        const res = await pool.query('SELECT order_id, customer_id, order_date, order_amount, status FROM orders WHERE order_id = $1 LIMIT 1', [orderId]);
        return res.rows.length > 0 ? res.rows[0] : null;
      } catch (err) {
        return null;
      }
    })
  );

  return results.find((r) => r !== null) || null;
}

/**
 * Fetch orders for a specific customer from target shard
 * @param {import('pg').Pool[]} pools 
 * @param {string} customerId 
 * @param {import('../sharding/shard-router').ShardRouter} shardRouter 
 * @returns {Promise<Object[]>}
 */
async function findOrdersByCustomerId(pools, customerId, shardRouter) {
  const shardIndex = shardRouter.getShardIndex({ customer_id: customerId });
  const targetPool = pools[shardIndex];

  const sql = `
    SELECT order_id, customer_id, order_date, order_amount, status
    FROM orders
    WHERE customer_id = $1
    ORDER BY order_date DESC;
  `;

  const res = await targetPool.query(sql, [customerId]);
  return res.rows;
}

module.exports = {
  insertOrdersBatch,
  insertFailedRecordsBatch,
  createImportJobRecord,
  updateImportJobRecord,
  findOrderById,
  findOrdersByCustomerId,
};

