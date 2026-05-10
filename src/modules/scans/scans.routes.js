
// Scans Routes
// Defines scan-related endpoints

const express = require('express');
const { body, param, query } = require('express-validator');
const scansController = require('./scans.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { uploadSingle } = require('../../middlewares/upload.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const scanValidation = [
  body('cropType')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Crop type cannot exceed 100 characters'),
  body('language')
    .optional()
    .trim()
    .isIn(['en', 'ha'])
    .withMessage('Language must be en or ha'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const scanIdValidation = [
  param('id').isMongoId().withMessage('Invalid scan ID')
];

/**
 * @swagger
 * /api/scans:
 *   post:
 *     summary: Create a crop disease scan
 *     tags: [Scans]
 *     description: Upload an image and create a new crop disease diagnosis scan
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               cropType:
 *                 type: string
 *                 example: Tomato
 *               location:
 *                 type: string
 *                 example: Kano, Nigeria
 *     responses:
 *       201:
 *         description: Scan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Scan created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                     diagnosis:
 *                       type: string
 *                     confidence:
 *                       type: number
 *                       example: 95
 *       400:
 *         description: Invalid upload data
 *       401:
 *         description: Unauthorized
 */
// Routes
router.post(
  '/',
  uploadSingle('image'),
  scanValidation,
  scansController.createScan
);

/**
 * @swagger
 * /api/scans:
 *   get:
 *     summary: Get all scans
 *     tags: [Scans]
 *     description: Returns all scan records for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of scans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       diagnosis:
 *                         type: string
 *                       confidence:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', scansController.getScans);
/**
 * @swagger
 * /api/scans/stats:
 *   get:
 *     summary: Get scan statistics
 *     tags: [Scans]
 *     description: Returns statistics about user scans
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scan statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalScans:
 *                   type: number
 *                   example: 120
 *                 successfulScans:
 *                   type: number
 *                   example: 110
 *                 failedScans:
 *                   type: number
 *                   example: 10
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', scansController.getStats);
/**
 * @swagger
 * /api/scans/{id}:
 *   get:
 *     summary: Get scan by ID
 *     tags: [Scans]
 *     description: Retrieve a specific scan record using its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Scan ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scan retrieved successfully
 *       404:
 *         description: Scan not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', scanIdValidation, scansController.getScanById);
/**
 * @swagger
 * /api/scans/{id}/retry:
 *   post:
 *     summary: Retry failed diagnosis
 *     tags: [Scans]
 *     description: Retries AI diagnosis for a failed scan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Scan ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Diagnosis retried successfully
 *       404:
 *         description: Scan not found
 *       400:
 *         description: Scan cannot be retried
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/retry', scanIdValidation, scansController.retryDiagnosis);
/**
 * @swagger
 * /api/scans/{id}:
 *   delete:
 *     summary: Delete scan
 *     tags: [Scans]
 *     description: Deletes a scan record permanently
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Scan ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scan deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Scan deleted successfully
 *       404:
 *         description: Scan not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', scanIdValidation, scansController.deleteScan);

module.exports = router;
