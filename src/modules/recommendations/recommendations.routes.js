
//  Recommendation Routes
//  Defines endpoints for crop disease recommendations
 

const express = require('express');
const { body } = require('express-validator');
const recommendationsController = require('./recommendations.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

const recommendationValidation = [
  body('diseaseId')
    .trim()
    .notEmpty()
    .withMessage('Disease ID is required'),
  body('severity')
    .trim()
    .notEmpty()
    .withMessage('Severity is required')
    .isIn(['low', 'moderate', 'high'])
    .withMessage('Severity must be low, moderate, or high'),
  body('language')
    .optional()
    .trim()
    .isIn(['en', 'ha'])
    .withMessage('Language must be en or ha'),
  body('confidence')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Confidence must be a number between 0 and 1')
];

router.post('/', recommendationValidation, recommendationsController.getRecommendation);

module.exports = router;
