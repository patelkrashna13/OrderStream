const express = require('express');
const orderController = require('../controllers/order.controller');

const router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: System health check
 *     description: Evaluates connectivity across all PostgreSQL database shards and Google Cloud Storage bucket reachability via ADC.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: All system components operational
 *       503:
 *         description: Component offline or degraded
 */
router.get('/health', orderController.handleHealthCheck);

/**
 * @openapi
 * /orders/{orderId}:
 *   get:
 *     summary: Retrieve single order by ID
 *     description: Fetches order details by order_id across database shards.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique order identifier (e.g. ORD-2026-000001)
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/orders/:orderId', orderController.handleGetOrderById);

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Retrieve customer order history
 *     description: Fetches all orders for a customer directly from the target database shard.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: query
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer reference identifier (e.g. CUST-0001)
 *     responses:
 *       200:
 *         description: Orders collection retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Missing customerId query parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/orders', orderController.handleGetOrders);

module.exports = router;

