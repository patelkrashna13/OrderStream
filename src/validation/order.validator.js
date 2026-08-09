/**
 * Order Row Validation Module
 * Enforces strict type constraints and data domain rules on parsed order rows
 */

/**
 * Validates a single parsed order row object against minimum assessment field requirements
 * @param {Object} row - Parsed order row object
 * @returns {{ isValid: boolean, data?: Object, error?: string, field?: string }}
 */
function validateOrderRow(row) {
  if (!row || typeof row !== 'object') {
    return { isValid: false, error: 'Row payload is null or invalid object structure.' };
  }

  // 1. Validate order_id
  const orderId = row.order_id ? String(row.order_id).trim() : '';
  if (!orderId) {
    return { isValid: false, field: 'order_id', error: 'Missing or empty order_id attribute.' };
  }

  // 2. Validate customer_id
  const customerId = row.customer_id ? String(row.customer_id).trim() : '';
  if (!customerId) {
    return { isValid: false, field: 'customer_id', error: 'Missing or empty customer_id attribute.' };
  }

  // 3. Validate order_date
  if (!row.order_date) {
    return { isValid: false, field: 'order_date', error: 'Missing or empty order_date attribute.' };
  }
  const parsedDate = new Date(row.order_date);
  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, field: 'order_date', error: `Invalid order_date timestamp format [${row.order_date}].` };
  }

  // 4. Validate order_amount
  if (row.order_amount === undefined || row.order_amount === null || row.order_amount === '') {
    return { isValid: false, field: 'order_amount', error: 'Missing or empty order_amount attribute.' };
  }
  const parsedAmount = parseFloat(row.order_amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return { isValid: false, field: 'order_amount', error: `Invalid order_amount numeric value [${row.order_amount}]. Must be a positive decimal.` };
  }

  // 5. Validate status
  const status = row.status ? String(row.status).trim().toUpperCase() : '';
  if (!status) {
    return { isValid: false, field: 'status', error: 'Missing or empty status attribute.' };
  }

  // Return sanitized & properly typed domain order object
  return {
    isValid: true,
    data: {
      order_id: orderId,
      customer_id: customerId,
      order_date: parsedDate.toISOString(),
      order_amount: Number(parsedAmount.toFixed(2)),
      status,
    },
  };
}

module.exports = {
  validateOrderRow,
};
