// routes/expertChat.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('./expertChat.controller');
const { authenticate }  = require('../../middlewares/auth.middleware');
const { requireRole }   = require('../../middlewares/subscription.middleware');

// List experts — matched by crop or all (with optional filters)
// GET /api/experts?scanId=xxx
// GET /api/experts?cropType=maize&sortBy=rating
router.get(
  '/',
  authenticate,
  requireRole('farmer'),
  ctrl.listExperts
);

// Create a case — file diagnosis to selected expert
router.post(
  '/cases',
  authenticate,
  requireRole('farmer'),
  ctrl.createCase
);

// Farmer's case history
router.get(
  '/cases/mine',
  authenticate,
  requireRole('farmer'),
  ctrl.getMyCases
);

// Single case detail (farmer or expert can view)
router.get(
  '/cases/:id',
  authenticate,
  ctrl.getCaseDetail
);

module.exports = router;