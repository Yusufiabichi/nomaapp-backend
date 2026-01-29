/**
 * Scans Service
 * Business logic for scan operations and AI integration
 */

const Scan = require('./scans.model');
const Farm = require('../farms/farms.model');
const storageService = require('../../services/storage.service');
const aiService = require('../../services/ai.service');
const { AppError } = require('../../middlewares/error.middleware');
const logger = require('../../utils/logger');

class ScansService {
  /**
   * Create a new scan with image upload
   */
  async createScan(userId, file, scanData) {
    // Verify farm belongs to user if farmId provided
    if (scanData.farmId) {
      const farm = await Farm.findOne({
        _id: scanData.farmId,
        userId,
        isDeleted: { $ne: true }
      });

      if (!farm) {
        throw new AppError(404, 'FARM_NOT_FOUND', 'Farm not found');
      }
    }

    // Upload image to cloud storage
    const imageInfo = await storageService.uploadFile(file, 'scans');

    // Create scan record
    const scan = await Scan.create({
      userId,
      farmId: scanData.farmId,
      image: imageInfo,
      cropType: scanData.cropType,
      symptoms: scanData.symptoms,
      notes: scanData.notes,
      status: 'pending'
    });

    logger.info('Scan created', { scanId: scan._id, userId });

    // Trigger AI diagnosis asynchronously
    this.processDiagnosis(scan._id).catch(err => {
      logger.error('Background diagnosis failed', { scanId: scan._id, error: err.message });
    });

    return scan;
  }

  /**
   * Process AI diagnosis for a scan
   */
  async processDiagnosis(scanId) {
    const scan = await Scan.findById(scanId);
    
    if (!scan) {
      logger.error('Scan not found for diagnosis', { scanId });
      return;
    }

    try {
      // Update status to processing
      scan.status = 'processing';
      await scan.save();

      logger.info('Starting AI diagnosis', { scanId });

      // Call AI service
      const result = await aiService.diagnose(scan.image.url, {
        cropType: scan.cropType,
        symptoms: scan.symptoms
      });

      if (result.success) {

        // Update scan with diagnosis
        scan.status = 'diagnosed';
        scan.diagnosis = result.diagnosis;
        scan.aiMetadata = {
          modelVersion: result.modelVersion,
          processingTime: result.processingTime
        };
        scan.error = undefined;

        logger.info('Diagnosis completed', { 
          scanId, 
          disease: result.diagnosis.disease,
          confidence: result.diagnosis.confidence 
        });
      } else {

        // Handle AI error
        scan.status = result.error.retryable ? 'pending' : 'failed';
        scan.error = {
          code: result.error.code,
          message: result.error.message,
          retryable: result.error.retryable,
          retryCount: (scan.error?.retryCount || 0) + 1,
          lastRetryAt: new Date()
        };

        logger.warn('AI diagnosis failed', { 
          scanId,


errorCode: result.error.code, retryable: result.error.retryable }); }
 await scan.save();

} catch (error) {
  logger.error('Unexpected error during diagnosis', { scanId, error: error.message });
  
  scan.status = 'failed';
  scan.error = {
    code: 'UNEXPECTED_ERROR',
    message: 'An unexpected error occurred during diagnosis',
    retryable: true,
    retryCount: (scan.error?.retryCount || 0) + 1,
    lastRetryAt: new Date()
  };
  
  await scan.save();
}

}
/**
●	Retry failed diagnosis */ 
async retryDiagnosis(scanId, userId) { 
  const scan = await Scan.findOne({ 
    _id: scanId, 
    userId, 
    isDeleted: { $ne: true } 
  });
if (!scan) {

 throw new AppError(404, 'SCAN_NOT_FOUND', 'Scan not found');
}

if (scan.status === 'diagnosed') {
  throw new AppError(400, 'ALREADY_DIAGNOSED', 'Scan has already been diagnosed');
}

// Check retry limit
if (scan.error?.retryCount >= 5) {
  throw new AppError(400, 'RETRY_LIMIT_EXCEEDED', 'Maximum retry attempts reached');
}

// Reset status and trigger diagnosis
scan.status = 'pending';
await scan.save();

// Process asynchronously
this.processDiagnosis(scan._id).catch(err => {
  logger.error('Retry diagnosis failed', { scanId, error: err.message });
});

return scan;

}
/**
●	Get all scans for a user */ 
async getUserScans(userId, query = {}) { 
  const { page = 1, limit = 20, status, farmId, cropType } = query;
const filter = {

 userId,
  isDeleted: { $ne: true }
};

if (status) filter.status = status;
if (farmId) filter.farmId = farmId;
if (cropType) filter.cropType = { $regex: cropType, $options: 'i' };

const skip = (page - 1) * limit;

const [scans, total] = await Promise.all([
  Scan.find(filter)
    .populate('farmId', 'name')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 }),
  Scan.countDocuments(filter)
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
●	Get scan by ID */ 
async getScanById(scanId, userId) { 
  const scan = await Scan.findOne({ 
    _id: scanId, 
    userId, 
    isDeleted: { $ne: true } }).populate('farmId', 'name region district');
if (!scan) {

 throw new AppError(404, 'SCAN_NOT_FOUND', 'Scan not found');
}

return scan;

}
/**
●	Delete scan (soft delete) */ 
async deleteScan(scanId, userId) { 
  const scan = await Scan.findOneAndUpdate( { 
    _id: scanId, 
    userId, 
    isDeleted: { $ne: true } }, 
    { isDeleted: true, deletedAt: new Date() }, { new: true } );
if (!scan) {

 throw new AppError(404, 'SCAN_NOT_FOUND', 'Scan not found');
}

// Optionally delete image from storage (implement based on requirements)
// await storageService.deleteFile(scan.image);

logger.info('Scan deleted', { scanId, userId });

return scan;

}
/**
●	Get scan statistics for a user */ 
async getUserStats(userId) { 
  const stats = await Scan.aggregate([ 
    { $match: { userId: userId, isDeleted: { $ne: true } } }, 
    { $group: { _id: null, totalScans: { $sum: 1 }, diagnosedScans: { $sum: { $cond: [{ $eq: ['$status', 'diagnosed'] }, 1, 0] } }, pendingScans: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }, failedScans: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } } ]);
return stats[0] || {

 totalScans: 0,
  diagnosedScans: 0,
  pendingScans: 0,
  failedScans: 0
};

} }
module.exports = new ScansService();
