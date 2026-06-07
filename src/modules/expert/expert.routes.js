// routes/expert.routes.js
const express   = require('express');
const multer    = require('multer');
const router    = express.Router();
const ctrl      = require('../controllers/expert.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole }  = require('../middlewares/subscription.middleware');

// Multer — memory storage (we stream directly to Cloudinary)
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and PDF files are allowed'));
    }
  }
});

// ── Expert routes (role: expert) ──────────────────────────────────────────────

// GET verification status — called on dashboard mount
router.get(
  '/verification-status',
  authenticate,
  requireRole('expert'),
  ctrl.getVerificationStatus
);

// Save push notification token
router.post(
  '/push-token',
  authenticate,
  requireRole('expert'),
  ctrl.savePushToken
);

// Stage 1 — professional profile
router.post(
  '/profile',
  authenticate,
  requireRole('expert'),
  ctrl.saveProfile
);

// Stage 2 — document upload
// Accepts two files: governmentId + professionalDoc
router.post(
  '/documents',
  authenticate,
  requireRole('expert'),
  upload.fields([
    { name: 'governmentId',   maxCount: 1 },
    { name: 'professionalDoc', maxCount: 1 }
  ]),
  ctrl.uploadDocuments
);

// Stage 3 — fetch questions (never returns correct answers)
router.get(
  '/assessment/questions',
  authenticate,
  requireRole('expert'),
  ctrl.getAssessmentQuestions
);

// Stage 3 — submit answers
router.post(
  '/assessment/submit',
  authenticate,
  requireRole('expert'),
  ctrl.submitAssessment
);

// ── Admin routes (role: admin) ────────────────────────────────────────────────

// List experts by status
router.get(
  '/admin/experts',
  authenticate,
  requireRole('admin'),
  ctrl.adminListExperts
);

// Approve or reject documents
router.patch(
  '/admin/experts/:id/review',
  authenticate,
  requireRole('admin'),
  ctrl.adminReviewDocuments
);

// Question bank CRUD
router.get(
  '/admin/questions',
  authenticate,
  requireRole('admin'),
  ctrl.adminListQuestions
);

router.post(
  '/admin/questions',
  authenticate,
  requireRole('admin'),
  upload.single('image'),   // optional image for image-type questions
  ctrl.adminCreateQuestion
);

router.patch(
  '/admin/questions/:id',
  authenticate,
  requireRole('admin'),
  upload.single('image'),
  ctrl.adminUpdateQuestion
);

router.delete(
  '/admin/questions/:id',
  authenticate,
  requireRole('admin'),
  ctrl.adminDeleteQuestion
);

module.exports = router;