/**
 * Farms Service
 * Business logic for farm operations
 */

const Farm = require('./farms.model');
const { AppError } = require('../../middlewares/error.middleware');
const logger = require('../../utils/logger');

class FarmsService {
  /**
   * Create a new farm
   */
  async createFarm(userId, farmData) {
    const farm = await Farm.create({
      userId,
      ...farmData
    });

    logger.info('Farm created', { farmId: farm._id, userId });

    return farm;
  }

  /**
   * Get all farms for a user
   */
  async getUserFarms(userId, query = {}) {
    const {
      page = 1,
      limit = 20,
      search
    } = query;

    const filter = {
      userId,
      isDeleted: { $ne: true }
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { region: { $regex: search, $options: 'i' } },
        { crops: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [farms, total] = await Promise.all([
      Farm.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Farm.countDocuments(filter)
    ]);

    return {
      farms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    };
  }

  /**
   * Get farm by ID
   */
  async getFarmById(farmId, userId) {
    const farm = await Farm.findOne({
      _id: farmId,
      userId,
      isDeleted: { $ne: true }
    });

    if (!farm) {
      throw new AppError(404, 'FARM_NOT_FOUND', 'Farm not found');
    }

    return farm;
  }

  /**
   * Update farm
   */
  async updateFarm(farmId, userId, updateData) {
    // Remove fields that shouldn't be updated
    const { userId: _, isDeleted, ...allowedUpdates } = updateData;

    const farm = await Farm.findOneAndUpdate(
      {
        _id: farmId,
        userId,
        isDeleted: { $ne: true }
      },
      allowedUpdates,
      { new: true, runValidators: true }
    );

    if (!farm) {
      throw new AppError(404, 'FARM_NOT_FOUND', 'Farm not found');
    }

    logger.info('Farm updated', { farmId, userId });

    return farm;
  }

  /**
   * Delete farm (soft delete)
   */
  async deleteFarm(farmId, userId) {
    const farm = await Farm.findOneAndUpdate(
      {
        _id: farmId,
        userId,
        isDeleted: { $ne: true }
      },
      {
        isDeleted: true,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!farm) {
      throw new AppError(404, 'FARM_NOT_FOUND', 'Farm not found');
    }

    logger.info('Farm deleted', { farmId, userId });

    return farm;
  }
}

module.exports = new FarmsService();
