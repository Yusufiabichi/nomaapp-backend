/**
 * Scans Controller
 * Handles HTTP requests for scan-related endpoints
 */

const scansService = require('./scans.service');
const { successResponse, paginatedResponse } = require('../../utils/response');
const { validationResult } = require('express-validator');
const { AppError } = require('../../middlewares/error.middleware');

class ScansController {
  /**
   * POST /api/scans
   * Create a new scan with image upload
   */
  async createScan(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      if (!req.file) {
        throw new AppError(400, 'IMAGE_REQUIRED', 'Scan image is required');
      }

      const scan = await scansService.createScan(
        req.user._id,
        req.file,
        req.body
      );

      return successResponse(res, 201, { scan }, 'Scan created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/scans
   * Get all scans for current user
   */
  async getScans(req, res, next) {
    try {
      const result = await scansService.getUserScans(req.user._id, req.query);
      return paginatedResponse(res, 200, result.scans, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/scans/stats
   * Get scan statistics for current user
   */
  async getStats(req, res, next) {
    try {
      const stats = await scansService.getUserStats(req.user._id);
      return successResponse(res, 200, { stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/scans/:id
   * Get scan by ID
   */
  async getScanById(req, res, next) {
    try {
      const scan = await scansService.getScanById(req.params.id, req.user._id);
      return successResponse(res, 200, { scan });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/scans/:id/retry
   * Retry failed diagnosis
   */
  async retryDiagnosis(req, res, next) {
    try {
      const scan = await scansService.retryDiagnosis(req.params.id, req.user._id);
      return successResponse(res, 200, { scan }, 'Diagnosis retry initiated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/scans/:id
   * Delete scan
   */
  async deleteScan(req, res, next) {
    try {
      await scansService.deleteScan(req.params.id, req.user._id);
      return successResponse(res, 200, null, 'Scan deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ScansController();
