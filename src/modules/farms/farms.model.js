/**
 * Farms Model
 * Schema for farm data
 */

const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Farm name is required'],
    trim: true,
    maxlength: [100, 'Farm name cannot exceed 100 characters']
  },
  // Minimal location data - only region/district level
  region: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  // No precise GPS coordinates to protect farmer privacy
  crops: [{
    type: String,
    trim: true
  }],
  size: {
    value: Number,
    unit: {
      type: String,
      enum: ['hectares', 'acres', 'sqm'],
      default: 'hectares'
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
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

// Compound index for user's farms
farmSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });

// Virtual for scans
farmSchema.virtual('scans', {
  ref: 'Scan',
  localField: '_id',
  foreignField: 'farmId'
});

module.exports = mongoose.model('Farm', farmSchema);
