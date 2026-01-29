/**
 * Users Controller
 * Handles HTTP requests for user-related endpoints
 */

const usersService = require('./users.service');
const { successResponse, paginatedResponse } = require('../../utils/response');
const { validationResult } = require('express-validator');
const { AppError } = require('../../middlewares/error.middleware');

class UsersController {
  /**
   * GET /api/users/profile
   * Get current user's profile
   */
  async getProfile(req, res, next) {
    try {
      const user = await usersService.getUserById(req.user._id);
      return successResponse(res, 200, { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/users/profile
   * Update current user's profile
   */
  async updateProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      const user = await usersService.updateProfile(req.user._id, req.body);
      return successResponse(res, 200, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users
   * Get all users (admin only)
   */
  async getAllUsers(req, res, next) {
    try {
      const result = await usersService.getAllUsers(req.query);
      return paginatedResponse(res, 200, result.users, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:id
   * Get user by ID (admin only)
   */
  async getUserById(req, res, next) {
    try {
      const user = await usersService.getUserById(req.params.id);
      return successResponse(res, 200, { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/users/account
   * Deactivate current user's account
   */
  async deactivateAccount(req, res, next) {
    try {
      await usersService.deactivateAccount(req.user._id);
      return successResponse(res, 200, null, 'Account deactivated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UsersController();
