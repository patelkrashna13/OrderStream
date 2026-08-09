const ExcelJS = require('exceljs');
const { normalizeCsvKeys } = require('./csv-parser');
const logger = require('../utils/logger');

/**
 * Parses an Excel (.xlsx, .xls) stream row-by-row using ExcelJS WorkbookReader
 * @param {import('stream').Readable} inputStream 
 * @param {Function} onRow - Callback function: async (row, lineNumber) => void
 * @returns {Promise<{ totalRows: number }>}
 */
async function parseExcelStream(inputStream, onRow) {
  let totalRows = 0;
  let headers = [];

  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(inputStream, {
    entries: 'emit',
    sharedStrings: 'cache',
    worksheets: 'emit',
  });

  for await (const worksheetReader of workbookReader) {
    for await (const row of worksheetReader) {
      if (row.number === 1) {
        // Extract header row values
        headers = row.values.slice(1).map((h) => (h ? String(h).trim() : ''));
        continue;
      }

      totalRows += 1;
      const rawRow = {};
      const rowValues = row.values.slice(1);

      headers.forEach((header, index) => {
        if (header) {
          rawRow[header] = rowValues[index] !== undefined ? String(rowValues[index]).trim() : '';
        }
      });

      const normalizedRow = normalizeCsvKeys(rawRow);
      try {
        await onRow(normalizedRow, totalRows);
      } catch (err) {
        logger.warn({ err: err.message, lineNumber: totalRows }, 'Non-fatal error in Excel row stream handler.');
      }
    }
  }

  logger.info({ totalRows }, 'Excel stream parsing complete.');
  return { totalRows };
}

module.exports = {
  parseExcelStream,
};
