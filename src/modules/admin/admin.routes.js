// Admin Routes
// Defines administrative endpoints

const express = require('express');
const { body, param } = require('express-validator');
const adminController = require('./admin.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/subscription.middleware');
const { requireAdmin, requirePermission, requireSuperAdmin } = require('../../middlewares/admin.middleware');
const { PERMISSIONS } = require('../../constants/adminPermissions');
const router = express.Router();
const multer  = require('multer');
 
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// All routes require authentication and admin role
router.use(authenticate, requireAdmin);
router.use(authorize('admin'));

// Validation rules
const updateRoleValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('role')
    .isIn(['farmer', 'expert', 'supplier', 'admin'])
    .withMessage('Role must be farmer, expert, supplier, or admin')
];

const userIdValidation = [
  param('id').isMongoId().withMessage('Invalid user ID')
];

const scanIdValidation = [
  param('id').isMongoId().withMessage('Invalid scan ID')
];

// router.get('/users', authenticate, requireRole('admin'), adminController.getUsers);

// Routes
router.put('/users/:id/role', updateRoleValidation, adminController.updateUserRole);
router.put('/users/:id/toggle-status', userIdValidation, adminController.toggleUserStatus);
router.get('/scans/failed', adminController.getFailedScans);
router.post('/scans/:id/retry', scanIdValidation, adminController.retryDiagnosis);

// ─── Expert Verification ───────────────────────────────────────────────────────
 
router.get(
  '/experts',
  requirePermission(PERMISSIONS.EXPERTS_VIEW),
  adminController.listExperts
);
 
router.get(
  '/experts/:id',
  requirePermission(PERMISSIONS.EXPERTS_VIEW),
  adminController.getExpertDetail
);
 
router.patch(
  '/experts/:id/review',
  requirePermission(PERMISSIONS.EXPERTS_REVIEW),
  adminController.reviewExpertDocuments
);

// ─── Assessment Question Bank ────────────────────────────────────────────────
 
router.get(
  '/assessment-questions',
  requirePermission(PERMISSIONS.QUESTIONS_VIEW),
  adminController.listQuestions
);
 
router.get(
  '/assessment-questions/:id',
  requirePermission(PERMISSIONS.QUESTIONS_VIEW),
  adminController.getQuestionDetail
);
 
router.post(
  '/assessment-questions',
  requirePermission(PERMISSIONS.QUESTIONS_MANAGE),
  upload.single('image'),
  adminController.createQuestion
);
 
router.patch(
  '/assessment-questions/:id',
  requirePermission(PERMISSIONS.QUESTIONS_MANAGE),
  upload.single('image'),
  adminController.updateQuestion
);
 
router.delete(
  '/assessment-questions/:id',
  requirePermission(PERMISSIONS.QUESTIONS_MANAGE),
  adminController.deleteQuestion
);
 
// ─── Case Oversight ─────────────────────────────────────────────────────────────
 
router.get(
  '/cases',
  requirePermission(PERMISSIONS.CASES_VIEW),
  adminController.listCases
);
 
router.get(
  '/cases/:id',
  requirePermission(PERMISSIONS.CASES_VIEW),
  adminController.getCaseDetail
);
 
router.patch(
  '/cases/:id',
  requirePermission(PERMISSIONS.CASES_MANAGE),
  adminController.updateCase
);
 
// ─── Analytics ────────────────────────────────────────────────────────────────
 
router.get(
  '/analytics/summary',
  requirePermission(PERMISSIONS.ANALYTICS_VIEW),
  adminController.getAnalyticsSummary
);
 
// ─── Admin Management (super admin only) ───────────────────────────────────────
 
router.get(
  '/admins',
  requireSuperAdmin,
  adminController.listAdmins
);
 
router.post(
  '/admins/invite',
  requireSuperAdmin,
  adminController.inviteAdmin
);
 
router.patch(
  '/admins/:id',
  requireSuperAdmin,
  adminController.updateAdmin
);
 
module.exports = router;
