const orderRepository = require('./order.repository');
const { BatchProcessor } = require('./batch-processor');

module.exports = {
  ...orderRepository,
  BatchProcessor,
};
