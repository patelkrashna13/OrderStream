const path = require('path');
const { parseCsvStream } = require('./csv-parser');
const { parseExcelStream } = require('./excel-parser');
const logger = require('../utils/logger');

/**
 * Resolves the appropriate stream parser based on file extension and executes parsing
 * @param {import('stream').Readable} inputStream 
 * @param {string} filename - Original file name (e.g. orders.csv, orders.xlsx)
 * @param {Function} onRowCallback - Callback executed per row: async (rowObject, lineNumber) => void
 * @returns {Promise<{ totalRows: number }>}
 */
async function parseFileStream(inputStream, filename, onRowCallback) {
  const ext = path.extname(filename).toLowerCase();

  logger.info({ filename, extension: ext }, 'Initializing file stream parser.');

  if (ext === '.xlsx' || ext === '.xls') {
    return parseExcelStream(inputStream, onRowCallback);
  } else if (ext === '.csv' || ext === '.txt' || !ext) {
    return parseCsvStream(inputStream, onRowCallback);
  } else {
    throw new Error(`Unsupported file extension [${ext}] for stream parsing.`);
  }
}

module.exports = {
  parseFileStream,
};
