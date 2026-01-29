/**
 * Scans Routes
 * Defines scan-related endpoints
 */

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
  body('farmId')
    .optional()
    .isMongoId()
    .withMessage('Invalid farm ID'),
  body('cropType')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Crop type cannot exceed 100 characters'),
  body('symptoms')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Symptoms description cannot exceed 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const scanIdValidation = [
  param('id').isMongoId().withMessage('Invalid scan ID')
];

// Routes
router.post(
  '/',
  uploadSingle('image'),
  scanValidation,
  scansController.createScan
);

router.get('/', scansController.getScans);
router.get('/stats', scansController.getStats);
router.get('/:id', scanIdValidation, scansController.getScanById);
router.post('/:id/retry', scanIdValidation, scansController.retryDiagnosis);
router.delete('/:id', scanIdValidation, scansController.deleteScan);

module.exports = router;
