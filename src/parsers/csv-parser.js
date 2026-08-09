const csv = require('csv-parser');
const { Readable } = require('stream');
const logger = require('../utils/logger');

/**
 * Normalizes raw CSV row object keys to handle header whitespace or typos (e.g. order_amout vs order_amount)
 * @param {Object} rawRow 
 * @returns {Object}
 */
function normalizeCsvKeys(rawRow) {
  const normalized = {};
  for (const [key, val] of Object.entries(rawRow)) {
    const cleanKey = key ? key.trim().toLowerCase() : '';
    const cleanVal = typeof val === 'string' ? val.trim() : val;

    if (cleanKey === 'order_id' || cleanKey === 'orderid' || cleanKey === 'id') {
      normalized.order_id = cleanVal;
    } else if (cleanKey === 'customer_id' || cleanKey === 'customerid') {
      normalized.customer_id = cleanVal;
    } else if (cleanKey === 'order_date' || cleanKey === 'orderdate' || cleanKey === 'date') {
      normalized.order_date = cleanVal;
    } else if (cleanKey === 'order_amount' || cleanKey === 'order_amout' || cleanKey === 'amount') {
      normalized.order_amount = cleanVal;
    } else if (cleanKey === 'status') {
      normalized.status = cleanVal;
    } else if (cleanKey) {
      normalized[cleanKey] = cleanVal;
    }
  }
  return normalized;
}

/**
 * Parses a CSV stream row-by-row and emits parsed order objects to a row handler callback
 * @param {Readable} inputStream - Input byte/buffer stream
 * @param {Function} onRow - Callback function called per parsed row: async (row, lineNumber) => void
 * @returns {Promise<{ totalRows: number }>}
 */
function parseCsvStream(inputStream, onRow) {
  return new Promise((resolve, reject) => {
    let totalRows = 0;
    const stream = inputStream.pipe(csv({
      mapHeaders: ({ header }) => header ? header.trim() : header,
    }));

    stream.on('data', async (row) => {
      totalRows += 1;
      stream.pause();
      try {
        const normalizedRow = normalizeCsvKeys(row);
        await onRow(normalizedRow, totalRows);
      } catch (err) {
        logger.warn({ err: err.message, lineNumber: totalRows }, 'Non-fatal error in CSV row stream handler.');
      } finally {
        stream.resume();
      }
    });

    stream.on('end', () => {
      logger.info({ totalRows }, 'CSV stream parsing complete.');
      resolve({ totalRows });
    });

    stream.on('error', (err) => {
      logger.error({ err: err.message }, 'Fatal CSV stream parsing error.');
      reject(err);
    });
  });
}

module.exports = {
  parseCsvStream,
  normalizeCsvKeys,
};
