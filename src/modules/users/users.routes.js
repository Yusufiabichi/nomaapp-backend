/**
 * Users Routes
 * Defines user-related endpoints
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const usersController = require('./users.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

// User routes
router.get('/profile', usersController.getProfile);
router.put('/profile', updateProfileValidation, usersController.updateProfile);
router.delete('/account', usersController.deactivateAccount);
// implement createAccount in the usersController
router.post('/user', usersController.createAccount);

// Admin routes
router.get('/', authorize('admin'), usersController.getAllUsers);
router.get('/:id', authorize('admin'), param('id').isMongoId(), usersController.getUserById);

module.exports = router;
