/**
 * Admin Service
 * Business logic for administrative operations
 */

const User = require('../users/users.model');
const Scan = require('../scans/scans.model');
const Farm = require('../farms/farms.model');
const aiService = require('../../services/ai.service');
const logger = require('../../utils/logger');
const { AppError } = require('../../middlewares/error.middleware');

class AdminService {
  /**
   * Get system dashboard statistics
   */
  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalFarms,
      totalScans,
      scansByStatus,
      recentScans
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
      Farm.countDocuments({ isDeleted: { $ne: true } }),
      Scan.countDocuments({ isDeleted: { $ne: true } }),
      Scan.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Scan.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name email')
    ]);

    // Check AI service health
    const aiHealth = await aiService.healthCheck();

    return {
      users: {
        total: totalUsers,
        active: activeUsers
      },
      farms: {
        total: totalFarms
      },
      scans: {
        total: totalScans,
        byStatus: scansByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      recentScans,
      aiService: aiHealth
    };
  }

  /**
   * Update user role
   */
  async updateUserRole(userId, newRole) {
    if (!['farmer', 'agronomist', 'admin'].includes(newRole)) {
      throw new AppError(400, 'INVALID_ROLE', 'Invalid role specified');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true }
    );

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    logger.info('User role updated', { userId, newRole });

    return user;
  }

  /**
   * Toggle user active status
   */
  async toggleUserStatus(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    user.isActive = !user.isActive;
    await user.save();

    logger.info('User status toggled', { userId, isActive: user.isActive });

    return user;
  }

  /**
   * Get failed scans for review
   */
  async getFailedScans(query = {}) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [scans, total] = await Promise.all([
      Scan.find({
        status: 'failed',
        isDeleted: { $ne: true }
      })
        .populate('userId', 'name email')
        .populate('farmId', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Scan.countDocuments({
        status: 'failed',
        isDeleted: { $ne: true }
      })
    ]);

    return {
      scans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    };
  }

  /**
   * Manually trigger diagnosis retry for a scan
   */
  async adminRetryDiagnosis(scanId) {
    const scan = await Scan.findById(scanId);

    if (!scan) {
      throw new AppError(404, 'SCAN_NOT_FOUND', 'Scan not found');
    }

    if (scan.status === 'diagnosed') {
      throw new AppError(400, 'ALREADY_DIAGNOSED', 'Scan has already been diagnosed');
    }

    // Reset retry count for admin override
    scan.status = 'pending';
    scan.error = {
      ...scan.error,
      retryCount: 0
    };
    await scan.save();

    logger.info('Admin triggered diagnosis retry', { scanId });

    return scan;
  }
}

module.exports = new AdminService();
