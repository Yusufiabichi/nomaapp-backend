/**
 * Sync Controller
 * Handles HTTP requests for offline synchronization
 */

const syncService = require('../../services/sync.service');
const { successResponse } = require('../../utils/response');
const { validationResult } = require('express-validator');
const { AppError } = require('../../middlewares/error.middleware');
const logger = require('../../utils/logger');

class SyncController {
  /**
   * POST /api/sync/push
   * Receive batch changes from mobile device
   */
  async push(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      const { changes } = req.body;

      logger.info('Sync push received', { 
        userId: req.user._id,
        farms: changes.farms ? Object.keys(changes.farms).length : 0,
        scans: changes.scans ? Object.keys(changes.scans).length : 0
      });

      const result = await syncService.processPush(req.user._id, changes);

      return successResponse(res, 200, result, 'Sync push completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sync/pull
   * Send changes to mobile device since last sync
   */
  async pull(req, res, next) {
    try {
      const { lastPulledAt } = req.query;

      logger.info('Sync pull requested', { 
        userId: req.user._id,
        lastPulledAt 
      });

      const result = await syncService.getChangesSince(
        req.user._id,
        lastPulledAt
      );

      return successResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SyncController();
