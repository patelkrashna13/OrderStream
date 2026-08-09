const multer = require('multer');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// Store file payload in memory buffer for stream piping (prevents disk I/O caching)
const storage = multer.memoryStorage();

/**
 * Filter allowed file extensions and MIME types (.csv, .xlsx, .xls)
 */
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    'text/csv',
    'application/csv',
    'text/plain',
    ' /vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn({ originalname: file.originalname, mimetype: file.mimetype }, 'Rejected unsupported file upload extension.');
    const error = new Error('Invalid file format. Only CSV (.csv) and Excel (.xlsx, .xls) files are supported.');
    error.code = 'INVALID_FILE_TYPE';
    error.status = 400;
    cb(error, false);
  }
};

// Configure Multer instance with memory storage, file filter, and size limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.pipeline.maxFileSizeBytes, // Capped payload size (e.g., 50MB)
    files: 1, // Single file per request
  },
});

/**
 * Express middleware wrapper for single 'file' multipart upload
 */
const uploadSingleFile = upload.single('file');

module.exports = {
  uploadSingleFile,
};
