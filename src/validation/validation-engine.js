const { validateOrderRow } = require('./order.validator');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Validation Engine managing batch validation, error isolation, and metrics tracking
 */
class ValidationEngine {
  constructor(jobId = null) {
    this.jobId = jobId || uuidv4();
    this.totalProcessed = 0;
    this.validCount = 0;
    this.failedCount = 0;
    this.failedRecords = [];
  }

  /**
   * Processes and validates an individual row, isolating malformed records
   * @param {Object} rawRow 
   * @param {number} lineNumber 
   * @returns {{ isValid: boolean, record?: Object, failure?: Object }}
   */
  processRow(rawRow, lineNumber) {
    this.totalProcessed += 1;
    const result = validateOrderRow(rawRow);

    if (result.isValid) {
      this.validCount += 1;
      return { isValid: true, record: result.data };
    }

    // Handle Malformed/Invalid Row Isolation
    this.failedCount += 1;
    const failurePayload = {
      failure_id: uuidv4(),
      job_id: this.jobId,
      line_number: lineNumber,
      raw_payload: JSON.stringify(rawRow),
      failure_reason: `[${result.field || 'schema'}] ${result.error}`,
      created_at: new Date().toISOString(),
    };

    this.failedRecords.push(failurePayload);

    logger.warn(
      { jobId: this.jobId, lineNumber, field: result.field, reason: result.error },
      `Isolated invalid order row #${lineNumber}`
    );

    return { isValid: false, failure: failurePayload };
  }

  /**
   * Get overall validation execution summary metrics
   * @returns {{ totalProcessed: number, validCount: number, failedCount: number, jobId: string }}
   */
  getMetrics() {
    return {
      jobId: this.jobId,
      totalProcessed: this.totalProcessed,
      validCount: this.validCount,
      failedCount: this.failedCount,
    };
  }
}

module.exports = {
  ValidationEngine,
};
