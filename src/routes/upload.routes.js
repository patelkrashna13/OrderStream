const express = require('express');
const { uploadSingleFile } = require('../middlewares/upload.middleware');
const uploadController = require('../controllers/upload.controller');

const router = express.Router();

/**
 * @openapi
 * /upload-orders:
 *   post:
 *     summary: Upload and ingest bulk orders file
 *     description: Accepts a bulk orders dataset file (.csv, .xlsx, .xls), uploads to GCS via ADC, stream validates records, and persists to sharded PostgreSQL.
 *     tags:
 *       - Upload
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Ingestion file in CSV (.csv) or Excel (.xlsx, .xls) format.
 *     responses:
 *       200:
 *         description: Orders file successfully ingested and sharded
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Missing or invalid file payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       502:
 *         description: Google Cloud Storage upload failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/upload-orders', uploadSingleFile, uploadController.handleUploadOrders);

module.exports = router;

