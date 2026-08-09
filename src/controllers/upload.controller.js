const ingestionService = require('../services/ingestion.service');
const logger = require('../utils/logger');

/**
 * HTTP Transport Controller handling POST /upload-orders endpoint requests
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 */
async function handleUploadOrders(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      logger.warn('Upload request missing file payload.');
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_FILE',
        message: 'No orders file provided in multipart payload.',
        details: [{ field: 'file', issue: 'Required file payload is missing.' }],
      });
    }

    const { buffer, originalname, mimetype } = req.file;

    // Delegate pipeline orchestration to ingestion service
    const result = await ingestionService.processOrdersIngestion(buffer, originalname, mimetype);

    return res.status(200).json({
      status: 'success',
      message: 'Orders file ingested successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleUploadOrders,
};
