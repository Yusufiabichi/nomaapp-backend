/**
 * Scans Model
 * Schema for crop disease scan data
 */

const mongoose = require('mongoose');

const diagnosisSchema = new mongoose.Schema({
  disease: {
    type: String,
    required: true
  },
  cropType: {
    type: String,
    trim: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical']
  },
  recommendations: [{
    type: String
  }],
  futurePrevention: [{
    type: String,
    trim: true,
  }]
}, { _id: false });

const scanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // farmId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Farm',
  //   index: true
  // },
  // Image storage info
  image: {
    provider: {
      type: String,
      enum: ['s3', 'cloudinary'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    publicId: String,  // For Cloudinary
    key: String,       // For S3
    bucket: String     // For S3
  },
  // Scan metadata
  cropType: {
    type: String,
    trim: true
  },
  // Scan status
  status: {
    type: String,
    enum: ['pending', 'processing', 'diagnosed', 'failed'],
    default: 'pending',
    index: true
  },
  // Diagnosis result
  diagnosis: diagnosisSchema,
  // AI service metadata
  aiMetadata: {
    modelVersion: String,
    processingTime: Number,
    requestId: String
  },
  // Error tracking
  error: {
    code: String,
    message: String,
    retryable: Boolean,
    retryCount: {
      type: Number,
      default: 0
    },
    lastRetryAt: Date
  },
  // Sync metadata
  localId: {
    type: String,
    index: true
  },
  syncedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Compound indexes
scanSchema.index({ userId: 1, status: 1, createdAt: -1 });
scanSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
scanSchema.index({ farmId: 1, isDeleted: 1 });

module.exports = mongoose.model('Scan', scanSchema);
