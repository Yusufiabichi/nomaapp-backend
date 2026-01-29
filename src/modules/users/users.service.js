/**
 * Users Service
 * Business logic for user profile operations
 */

const User = require('./users.model');
const { AppError } = require('../../middlewares/error.middleware');
const logger = require('../../utils/logger');

class UsersService {
  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    // Remove fields that shouldn't be updated via this method
    const { password, role, isActive, email, ...allowedUpdates } = updateData;

    const user = await User.findByIdAndUpdate(
      userId,
      allowedUpdates,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    logger.info('User profile updated', { userId });

    return user;
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(query = {}) {
    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      search
    } = query;

    const filter = { isDeleted: { $ne: true } };
    
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);

    return {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    };
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    logger.info('User account deactivated', { userId });

    return user;
  }
}

module.exports = new UsersService();
