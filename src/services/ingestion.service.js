const { Readable } = require('stream');
const { v4: uuidv4 } = require('uuid');
const { uploadStream } = require('../cloud/gcs-client');
const { parseFileStream } = require('../parsers/parser-factory');
const { ValidationEngine } = require('../validation/validation-engine');
const { BatchProcessor } = require('../repositories/batch-processor');
const { getPool } = require('../database/pool');
const { createImportJobRecord, updateImportJobRecord } = require('../repositories/order.repository');
const logger = require('../utils/logger');

/**
 * Orchestrates the end-to-end bulk order ingestion pipeline:
 * File Upload -> GCS Archival (ADC) -> Stream Parsing -> Validation -> Shard Routing -> Batch Persistence
 * @param {Buffer} fileBuffer - In-memory file payload buffer
 * @param {string} originalname - Original upload file name
 * @param {string} mimetype - Upload file MIME type
 * @returns {Promise<Object>} Ingestion summary statistics
 */
async function processOrdersIngestion(fileBuffer, originalname, mimetype) {
  const startTime = Date.now();
  const jobId = uuidv4();
  const timestamp = Date.now();
  const gcsDestinationName = `orders/${timestamp}_${originalname}`;

  logger.info({ jobId, originalname, byteSize: fileBuffer.length }, 'Starting bulk order file ingestion pipeline.');

  // 1. Upload raw file stream to Google Cloud Storage (authenticated via ADC)
  const gcsStream = Readable.from(fileBuffer);
  let gcsResult;
  try {
    gcsResult = await uploadStream(gcsStream, gcsDestinationName, mimetype);
  } catch (err) {
    logger.error({ err: err.message, jobId }, 'GCS Cloud Archival failed.');
    const gcsError = new Error('Failed to archive raw upload file to Google Cloud Storage via ADC.');
    gcsError.code = 'GCS_UPLOAD_FAILED';
    gcsError.status = 502;
    throw gcsError;
  }

  // 2. Initialize auditing, validation engine, and batch processor
  const primaryPool = getPool(0);
  const validationEngine = new ValidationEngine(jobId);
  const batchProcessor = new BatchProcessor({ jobId });

  await createImportJobRecord(primaryPool, {
    jobId,
    filename: originalname,
    gcsUri: gcsResult.gcsUri,
    status: 'PROCESSING',
  });

  // 3. Open streaming file parser and stream records
  const parseStream = Readable.from(fileBuffer);

  try {
    const parseResult = await parseFileStream(parseStream, originalname, async (rowObject, lineNumber) => {
      // Validate row attributes
      const valResult = validationEngine.processRow(rowObject, lineNumber);

      if (valResult.isValid) {
        // Route valid order record to ShardRouter batch buffer
        await batchProcessor.addRecord(valResult.record);
      } else {
        // Queue dead-letter failure record
        await batchProcessor.addFailedRecord(valResult.failure);
      }
    });

    // 4. Flush all remaining buffered records across shards
    const { totalInserted } = await batchProcessor.flushAll();
    const metrics = validationEngine.getMetrics();
    const processingTimeMs = Date.now() - startTime;

    // 5. Update import_jobs audit status
    await updateImportJobRecord(primaryPool, jobId, {
      totalRecords: parseResult.totalRows,
      validRecords: totalInserted,
      failedRecords: metrics.failedCount,
      status: 'COMPLETED',
    });

    logger.info({ jobId, totalRecords: parseResult.totalRows, inserted: totalInserted, failed: metrics.failedCount, processingTimeMs }, 'Ingestion pipeline completed successfully.');

    return {
      jobId,
      filename: originalname,
      gcsUri: gcsResult.gcsUri,
      metrics: {
        totalRecords: parseResult.totalRows,
        insertedRecords: totalInserted,
        failedRecords: metrics.failedCount,
        processingTimeMs,
      },
    };
  } catch (err) {
    logger.error({ err: err.message, jobId }, 'Ingestion pipeline execution failed.');
    await updateImportJobRecord(primaryPool, jobId, {
      totalRecords: validationEngine.totalProcessed,
      validRecords: batchProcessor.totalInserted,
      failedRecords: validationEngine.failedCount,
      status: 'FAILED',
    });
    throw err;
  }
}

module.exports = {
  processOrdersIngestion,
};
