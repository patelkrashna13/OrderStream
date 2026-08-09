const { parseCsvStream } = require('./csv-parser');
const { parseExcelStream } = require('./excel-parser');
const { parseFileStream } = require('./parser-factory');

module.exports = {
  parseCsvStream,
  parseExcelStream,
  parseFileStream,
};
