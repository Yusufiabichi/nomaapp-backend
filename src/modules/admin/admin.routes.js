/**
 * Admin Routes
 * Defines administrative endpoints
 */

const express = require('express');
const { body, param } = require('express-validator');
const adminController = require('./admin.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Validation rules
const updateRoleValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('role')
    .isIn(['farmer', 'agronomist', 'admin'])
    .withMessage('Role must be farmer, agronomist, or admin')
];

const userIdValidation = [
  param('id').isMongoId().withMessage('Invalid user ID')
];

const scanIdValidation = [
  param('id').isMongoId().withMessage('Invalid scan ID')
];

// Routes
router.get('/dashboard', adminController.getDashboard);
router.put('/users/:id/role', updateRoleValidation, adminController.updateUserRole);
router.put('/users/:id/toggle-status', userIdValidation, adminController.toggleUserStatus);
router.get('/scans/failed', adminController.getFailedScans);
router.post('/scans/:id/retry', scanIdValidation, adminController.retryDiagnosis);

module.exports = router;
