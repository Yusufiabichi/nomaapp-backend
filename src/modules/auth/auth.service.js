/**
 * Auth Service
 * Business logic for authentication operations
 */

const jwt = require('jsonwebtoken');
const User = require('./auth.model');
const env = require('../../config/env');
const { AppError } = require('../../middlewares/error.middleware');
const logger = require('../../utils/logger');

class AuthService {
  /**
   * Generate JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { userId },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );
  }

  /**
   * Register new user
   */
  async register(userData) {
    // Check if email already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered');
    }

    // Create user
    const user = await User.create({
      email: userData.email,
      password: userData.password,
      name: userData.name,
      phone: userData.phone,
      role: userData.role || 'farmer'
    });

    logger.info('User registered', { userId: user._id, email: user.email });

    // Generate token
    const token = this.generateToken(user._id);

    return {
      user: user.toJSON(),
      token
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Account has been disabled');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info('User logged in', { userId: user._id, email: user.email });

    // Generate token
    const token = this.generateToken(user._id);

    return {
      user: user.toJSON(),
      token
    };
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info('Password changed', { userId: user._id });

    // Generate new token
    const token = this.generateToken(user._id);

    return { token };
  }
}

module.exports = new AuthService();
