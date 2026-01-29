/**
 * Farms Routes
 * Defines farm-related endpoints
 */

const express = require('express');
const { body, param } = require('express-validator');
const farmsController = require('./farms.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const farmValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Farm name is required')
    .isLength({ max: 100 })
    .withMessage('Farm name cannot exceed 100 characters'),
  body('region')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Region cannot exceed 100 characters'),
  body('district')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('District cannot exceed 100 characters'),
  body('crops')
    .optional()
    .isArray()
    .withMessage('Crops must be an array'),
  body('crops.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each crop name cannot exceed 50 characters'),
  body('size.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Size value must be a positive number'),
  body('size.unit')
    .optional()
    .isIn(['hectares', 'acres', 'sqm'])
    .withMessage('Size unit must be hectares, acres, or sqm'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const farmIdValidation = [
  param('id').isMongoId().withMessage('Invalid farm ID')
];

// Routes
router.post('/', farmValidation, farmsController.createFarm);
router.get('/', farmsController.getFarms);
router.get('/:id', farmIdValidation, farmsController.getFarmById);
router.put('/:id', [...farmIdValidation, ...farmValidation], farmsController.updateFarm);
router.delete('/:id', farmIdValidation, farmsController.deleteFarm);

module.exports = router;
