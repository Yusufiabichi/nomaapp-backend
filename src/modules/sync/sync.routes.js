
// Sync Routes
// Defines synchronization endpoints for offline-first support


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

/**
 * @swagger
 * /api/sync/push:
 *   post:
 *     summary: Push offline changes
 *     tags: [Sync]
 *     description: Uploads locally stored offline changes from the mobile app to the server
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - changes
 *             properties:
 *               changes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "scan_123"
 *                     type:
 *                       type: string
 *                       example: "scan"
 *                     action:
 *                       type: string
 *                       enum: [create, update, delete]
 *                       example: create
 *                     data:
 *                       type: object
 *                       example:
 *                         cropType: Tomato
 *                         diagnosis: Leaf Blight
 *               lastSyncTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-07T10:30:00Z"
 *     responses:
 *       200:
 *         description: Offline changes synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 synced:
 *                   type: number
 *                   example: 5
 *                 failed:
 *                   type: number
 *                   example: 0
 *       400:
 *         description: Invalid sync payload
 *       401:
 *         description: Unauthorized
 */
// Routes
router.post('/push', pushValidation, syncController.push);
/**
 * @swagger
 * /api/sync/pull:
 *   get:
 *     summary: Pull latest changes
 *     tags: [Sync]
 *     description: Fetches server updates since the last synchronization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lastSync
 *         required: true
 *         description: Timestamp of the last successful sync
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2026-05-07T10:30:00Z"
 *     responses:
 *       200:
 *         description: Latest changes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 serverTime:
 *                   type: string
 *                   format: date-time
 *                 changes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         example: scan
 *                       action:
 *                         type: string
 *                         example: update
 *                       data:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/pull', pullValidation, syncController.pull);

module.exports = router;
