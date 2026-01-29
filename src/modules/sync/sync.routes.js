/**
 * Sync Routes
 * Defines synchronization endpoints for offline-first support
 */

const express = require('express');
const { body, query } = require('express-validator');
const syncController = require('./sync.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const pushValidation = [
  body('changes')
    .isObject()
    .withMessage('Changes must be an object'),
  body('changes.farms')
    .optional()
    .isObject()
    .withMessage('Farms changes must be an object'),
  body('changes.farms.created')
    .optional()
    .isArray()
    .withMessage('Created farms must be an array'),
  body('changes.farms.updated')
    .optional()
    .isArray()
    .withMessage('Updated farms must be an array'),
  body('changes.farms.deleted')
    .optional()
    .isArray()
    .withMessage('Deleted farms must be an array'),
  body('changes.scans')
    .optional()
    .isObject()
    .withMessage('Scans changes must be an object'),
  body('changes.scans.created')
    .optional()
    .isArray()
    .withMessage('Created scans must be an array'),
  body('changes.scans.updated')
    .optional()
    .isArray()
    .withMessage('Updated scans must be an array'),
  body('changes.scans.deleted')
    .optional()
    .isArray()
    .withMessage('Deleted scans must be an array')
];

const pullValidation = [
  query('lastPulledAt')
    .optional()
    .isISO8601()
    .withMessage('lastPulledAt must be a valid ISO 8601 date')
];

// Routes
router.post('/push', pushValidation, syncController.push);
router.get('/pull', pullValidation, syncController.pull);

module.exports = router;
