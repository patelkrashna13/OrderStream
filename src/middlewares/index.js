const { uploadSingleFile } = require('./upload.middleware');
const { errorHandler } = require('./error.middleware');

module.exports = {
  uploadSingleFile,
  errorHandler,
};
