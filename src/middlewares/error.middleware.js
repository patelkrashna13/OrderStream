const multer = require('multer');
const logger = require('../utils/logger');

/**
 * Global Express Error Handling Middleware
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error({ err: err.message, stack: err.stack, code: err.code }, 'Express Error Handler intercepted an exception.');

  // Handle Multer specific errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        code: 'FILE_TOO_LARGE',
        message: 'Uploaded file size exceeds the maximum allowed limit (50MB).',
        details: [{ field: 'file', issue: 'File payload is too large.' }],
      });
    }
    return res.status(400).json({
      status: 'error',
      code: 'MULTIPART_UPLOAD_ERROR',
      message: err.message,
      details: [{ field: 'file', issue: err.code }],
    });
  }

  // Handle Custom File Validation Errors
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(err.status || 400).json({
      status: 'error',
      code: err.code,
      message: err.message,
      details: [{ field: 'file', issue: 'Unsupported file extension.' }],
    });
  }

  // Fallback Standard Error Response
  const statusCode = err.status || 500;
  return res.status(statusCode).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred during processing.',
  });
}

module.exports = {
  errorHandler,
};
