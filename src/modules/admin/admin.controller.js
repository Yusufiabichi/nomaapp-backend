/**
 * Admin Controller
 * Handles HTTP requests for admin endpoints
 */

const adminService = require('./admin.service');
const { successResponse, paginatedResponse } = require('../../utils/response');
const { validationResult } = require('express-validator');
const { AppError } = require('../../middlewares/error.middleware');

class AdminController {
  /**
   * GET /api/admin/dashboard
   * Get dashboard statistics
   */
  async getDashboard(req, res, next) {
    try {
      const stats = await adminService.getDashboardStats();
      return successResponse(res, 200, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:id/role
   * Update user role
   */
  async updateUserRole(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      const user = await adminService.updateUserRole(
        req.params.id,
        req.body.role
      );

      return successResponse(res, 200, { user }, 'User role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:id/toggle-status
   * Toggle user active status
   */
  async toggleUserStatus(req, res, next) {
    try {
      const user = await adminService.toggleUserStatus(req.params.id);
      return successResponse(res, 200, { user }, 'User status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/scans/failed
   * Get failed scans
   */
  async getFailedScans(req, res, next) {
    try {
      const result = await adminService.getFailedScans(req.query);
      return paginatedResponse(res, 200, result.scans, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/scans/:id/retry
   * Admin retry diagnosis
   */
  async retryDiagnosis(req, res, next) {
    try {
      const scan = await adminService.adminRetryDiagnosis(req.params.id);
      return successResponse(res, 200, { scan }, 'Diagnosis retry initiated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
