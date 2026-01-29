/**
 * Farms Controller
 * Handles HTTP requests for farm-related endpoints
 */

const farmsService = require('./farms.service');
const { successResponse, paginatedResponse } = require('../../utils/response');
const { validationResult } = require('express-validator');
const { AppError } = require('../../middlewares/error.middleware');

class FarmsController {
  /**
   * POST /api/farms
   * Create a new farm
   */
  async createFarm(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      const farm = await farmsService.createFarm(req.user._id, req.body);
      return successResponse(res, 201, { farm }, 'Farm created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/farms
   * Get all farms for current user
   */
  async getFarms(req, res, next) {
    try {
      const result = await farmsService.getUserFarms(req.user._id, req.query);
      return paginatedResponse(res, 200, result.farms, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/farms/:id
   * Get farm by ID
   */
  async getFarmById(req, res, next) {
    try {
      const farm = await farmsService.getFarmById(req.params.id, req.user._id);
      return successResponse(res, 200, { farm });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/farms/:id
   * Update farm
   */
  async updateFarm(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      const farm = await farmsService.updateFarm(req.params.id, req.user._id, req.body);
      return successResponse(res, 200, { farm }, 'Farm updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/farms/:id
   * Delete farm
   */
  async deleteFarm(req, res, next) {
    try {
      await farmsService.deleteFarm(req.params.id, req.user._id);
      return successResponse(res, 200, null, 'Farm deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FarmsController();
