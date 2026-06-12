const mongoose = require('mongoose');
const { Schema } = mongoose;

const caseSchema = new Schema({
  farmer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expert: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Attached diagnosis/scan
  scan: {
    type: Schema.Types.ObjectId,
    ref: 'Scan',
    required: true
  },

  // Snapshot of diagnosis at time of submission (in case scan is edited later)
  diagnosisSnapshot: {
    disease:    { type: String },
    confidence: { type: Number },
    severity:   { type: String },
    cropType:   { type: String },
    imageUrl:   { type: String }
  },

  // Optional message from farmer
  farmerNote: {
    type: String,
    maxlength: 500,
    trim: true
  },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'resolved', 'declined'],
    default: 'pending'
  },

  // Expert's response (filled when they respond)
  expertResponse: {
    message:     { type: String },
    respondedAt: { type: Date }
  },

  // Rating after resolution
  rating: {
    stars:     { type: Number, min: 1, max: 5 },
    helpful:   { type: Boolean },
    ratedAt:   { type: Date }
  },

  resolvedAt: { type: Date }

}, { timestamps: true });

caseSchema.index({ expert: 1, status: 1 });
caseSchema.index({ farmer: 1, createdAt: -1 });

module.exports = mongoose.model('Case', caseSchema);