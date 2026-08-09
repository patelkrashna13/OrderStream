const { Storage } = require('@google-cloud/storage');
const config = require('../config');
const logger = require('../utils/logger');

// Instantiate Google Cloud Storage client using Application Default Credentials (ADC)
// Passing zero explicit keyFilename or credentials objects forces the SDK to resolve ADC automatically
const storage = new Storage();

/**
 * Get GCS Bucket instance based on application configuration
 * @returns {import('@google-cloud/storage').Bucket}
 */
function getBucket() {
  return storage.bucket(config.gcs.bucketName);
}

/**
 * Streams a readable file stream directly to Google Cloud Storage (GCS)
 * @param {import('stream').Readable} readableStream - Incoming file stream
 * @param {string} destinationFileName - Cloud storage object key/filename
 * @param {string} [contentType='application/octet-stream'] - File MIME type
 * @returns {Promise<{ gcsUri: string, fileName: string, bytesWritten: number }>}
 */
function uploadStream(readableStream, destinationFileName, contentType = 'application/octet-stream') {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const gcsFile = bucket.file(destinationFileName);

    let bytesWritten = 0;

    const passthrough = readableStream.on('data', (chunk) => {
      bytesWritten += chunk.length;
    });

    const gcsWriteStream = gcsFile.createWriteStream({
      resumable: false,
      contentType,
      metadata: {
        metadata: {
          uploadedAt: new Date().toISOString(),
          system: 'Backend-Engineering-Assessment',
        },
      },
    });

    gcsWriteStream.on('error', (err) => {
      logger.error({ err: err.message, destinationFileName }, 'Failed to upload stream to Google Cloud Storage.');
      reject(err);
    });

    gcsWriteStream.on('finish', () => {
      const gcsUri = `gs://${config.gcs.bucketName}/${destinationFileName}`;
      logger.info({ gcsUri, destinationFileName, bytesWritten }, 'Raw file stream successfully uploaded to GCS via ADC.');
      resolve({
        gcsUri,
        fileName: destinationFileName,
        bytesWritten,
      });
    });

    passthrough.pipe(gcsWriteStream);
  });
}

/**
 * Verify GCS bucket accessibility and Application Default Credentials (ADC) status
 * @returns {Promise<boolean>}
 */
async function verifyBucketAccess() {
  try {
    const bucket = getBucket();
    const [exists] = await bucket.exists();
    if (exists) {
      logger.info(`Google Cloud Storage bucket [${config.gcs.bucketName}] exists and is accessible via ADC.`);
      return true;
    } else {
      logger.warn(`Google Cloud Storage bucket [${config.gcs.bucketName}] does not exist.`);
      return false;
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'GCS bucket access check failed or ADC credentials missing.');
    return false;
  }
}

module.exports = {
  storage,
  getBucket,
  uploadStream,
  verifyBucketAccess,
};
