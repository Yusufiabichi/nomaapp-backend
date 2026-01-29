/**
 * Auth Controller
 * Handles HTTP requests for authentication endpoints
 */

const authService = require('./auth.service');
const { successResponse } = require('../../utils/response');
const { validationResult } = require('express-validator');
const { AppError } = require('../../middlewares/error.middleware');

class AuthController {
  /**
   * POST /api/auth/register
   * Register new user
   */
  async register(req, res, next) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      const { email, password, name, phone, role } = req.body;
      
      const result = await authService.register({
        email,
        password,
        name,
        phone,
        role
      });

      return successResponse(res, 201, result, 'Registration successful');

    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Login user
   */
  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      const { email, password } = req.body;
      
      const result = await authService.login(email, password);

      return successResponse(res, 200, result, 'Login successful');

    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/change-password
   * Change user password
   */
  async changePassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      const { currentPassword, newPassword } = req.body;
      
      const result = await authService.changePassword(
        req.user._id,
        currentPassword,
        newPassword
      );

      return successResponse(res, 200, result, 'Password changed successfully');

    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Get current user
   */
  async getMe(req, res, next) {
    try {
      return successResponse(res, 200, { user: req.user });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
