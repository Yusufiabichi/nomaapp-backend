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

const createUserValidation = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['farmer', 'expert', 'supplier'])
    .withMessage('Role must be farmer, expert, or supplier')
];

// User routes
router.get('/profile', usersController.getProfile);
router.put('/profile', updateProfileValidation, usersController.updateProfile);
router.delete('/account', usersController.deactivateAccount);
router.post('/user', createUserValidation, usersController.createAccount);

// Admin routes
router.get('/', authorize('admin'), usersController.getAllUsers);
router.get('/:id', authorize('admin'), param('id').isMongoId(), usersController.getUserById);

module.exports = router;
