const { getAllPools, verifyShardConnections } = require('../database/pool');
const { verifyBucketAccess } = require('../cloud/gcs-client');
const { defaultShardRouter } = require('../sharding/shard-router');
const { findOrderById, findOrdersByCustomerId } = require('../repositories/order.repository');

/**
 * Service retrieving single order by ID
 * @param {string} orderId 
 * @returns {Promise<Object|null>}
 */
async function getOrderById(orderId) {
  const pools = getAllPools();
  const rawOrder = await findOrderById(pools, orderId, defaultShardRouter);

  if (!rawOrder) return null;

  return {
    orderId: rawOrder.order_id,
    customerId: rawOrder.customer_id,
    orderDate: new Date(rawOrder.order_date).toISOString(),
    orderAmount: Number(parseFloat(rawOrder.order_amount).toFixed(2)),
    status: rawOrder.status,
  };
}

/**
 * Service retrieving order list for a customer ID
 * @param {string} customerId 
 * @returns {Promise<Object[]>}
 */
async function getOrdersByCustomerId(customerId) {
  const pools = getAllPools();
  const rawOrders = await findOrdersByCustomerId(pools, customerId, defaultShardRouter);

  return rawOrders.map((rawOrder) => ({
    orderId: rawOrder.order_id,
    orderDate: new Date(rawOrder.order_date).toISOString(),
    orderAmount: Number(parseFloat(rawOrder.order_amount).toFixed(2)),
    status: rawOrder.status,
  }));
}

/**
 * Service evaluating health status across database shards and GCS bucket
 * @returns {Promise<Object>}
 */
async function getHealthStatus() {
  const gcsAccessible = await verifyBucketAccess();
  const shardConnectionStatuses = await verifyShardConnections();

  const isAllShardsUp = shardConnectionStatuses.every(Boolean);
  const isHealthy = gcsAccessible && isAllShardsUp;

  const shardDetails = {};
  shardConnectionStatuses.forEach((status, index) => {
    shardDetails[`shard${index + 1}`] = status ? 'UP' : 'DOWN';
  });

  return {
    status: isHealthy ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    components: {
      gcsStorage: gcsAccessible ? 'CONNECTED' : 'DISCONNECTED',
      databaseShards: shardDetails,
    },
  };
}

module.exports = {
  getOrderById,
  getOrdersByCustomerId,
  getHealthStatus,
};
