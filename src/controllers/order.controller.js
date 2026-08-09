const orderService = require('../services/order.service');

/**
 * Handle GET /orders/:orderId
 */
async function handleGetOrderById(req, res, next) {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_PARAM',
        message: 'Order ID parameter is required.',
      });
    }

    const order = await orderService.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        code: 'ORDER_NOT_FOUND',
        message: `Order [${orderId}] was not found across database shards.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle GET /orders?customerId=...
 */
async function handleGetOrders(req, res, next) {
  try {
    const { customerId } = req.query;

    if (!customerId) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_QUERY_PARAM',
        message: 'Query parameter customerId is required. Example: GET /orders?customerId=CUST-100',
      });
    }

    const orders = await orderService.getOrdersByCustomerId(customerId);

    return res.status(200).json({
      status: 'success',
      data: {
        customerId,
        totalCount: orders.length,
        orders,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle GET /health
 */
async function handleHealthCheck(req, res, next) {
  try {
    const health = await orderService.getHealthStatus();
    const statusCode = health.status === 'UP' ? 200 : 503;
    return res.status(statusCode).json(health);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetOrderById,
  handleGetOrders,
  handleHealthCheck,
};
