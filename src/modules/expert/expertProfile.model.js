const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const documentSchema = new Schema({
  type: { type: String },                  // e.g. 'NIN', 'Degree', etc.
  cloudinaryUrl: { type: String },
  publicId: { type: String },              // Cloudinary public_id for deletion
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, { _id: false });

const performanceSchema = new Schema({
  casesHandled:        { type: Number, default: 0 },
  averageRating:       { type: Number, default: 0 },
  totalRatings:        { type: Number, default: 0 },
  responseRate:        { type: Number, default: 0 },   // % of cases responded to
  trialCasesRemaining: { type: Number, default: 20 },  // trial period monitor
  badges: {
    type: [String],
    enum: [
      'verified_identity',
      'ag_professional',
      'passed_assessment',
      'top_rated',
      'cases_100_plus'
    ],
    default: []
  }
}, { _id: false });

// ─── Main Schema ──────────────────────────────────────────────────────────────

const expertProfileSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // ── Stage 1: Professional Profile ──────────────────────────────────────────
  specializations: {
    type: [String],
    enum: ['maize', 'rice', 'tomato', 'cassava', 'yam', 'sorghum',
           'cowpea', 'soybean', 'cotton', 'vegetables', 'fruits', 'general'],
    default: []
  },
  yearsOfExperience: { type: Number, min: 0 },
  currentOrganization: { type: String, trim: true },
  currentRole: {
    type: String,
    enum: [
      'extension_officer',
      'agronomist',
      'plant_pathologist',
      'researcher',
      'university_lecturer',
      'ngo_worker',
      'agribusiness_professional',
      'other'
    ]
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address']
  },
  bio: { type: String, maxlength: 500, trim: true },
  linkedIn: { type: String, trim: true },
  stage1CompletedAt: { type: Date },

  // ── Stage 2: Documents ──────────────────────────────────────────────────────
  governmentId: documentSchema,
  professionalDoc: documentSchema,
  stage2SubmittedAt: { type: Date },

  // ── Admin Review ────────────────────────────────────────────────────────────
  adminReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  adminNotes: { type: String },
  rejectionReason: { type: String },
  reviewedAt: { type: Date },

  // ── Stage 3: Assessment ─────────────────────────────────────────────────────
  assessment: {
    score:        { type: Number },
    passed:       { type: Boolean },
    attemptCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    completedAt:  { type: Date }
  },

  // ── Overall Verification State ──────────────────────────────────────────────
  // stage: which step are they currently on
  stage: {
    type: String,
    enum: ['1', '2', '3', 'complete'],
    default: '1'
  },
  // overallStatus drives what the expert can/cannot do
  overallStatus: {
    type: String,
    enum: [
      'incomplete',       // still filling forms
      'pending_review',   // docs submitted, waiting admin
      'approved',         // all stages passed → active expert
      'rejected'          // admin rejected docs
    ],
    default: 'incomplete'
  },

  // ── Performance (post-approval) ─────────────────────────────────────────────
  performance: { type: performanceSchema, default: () => ({}) },

  // ── Push Notification Token ─────────────────────────────────────────────────
  expoPushToken: { type: String }

}, { timestamps: true });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

// Compute which badges should show based on current data
expertProfileSchema.virtual('displayBadges').get(function () {
  const badges = [];
  if (this.governmentId?.status === 'approved') badges.push('verified_identity');
  if (this.professionalDoc?.status === 'approved') badges.push('ag_professional');
  if (this.assessment?.passed) badges.push('passed_assessment');
  if (this.performance?.averageRating >= 4.5) badges.push('top_rated');
  if (this.performance?.casesHandled >= 100) badges.push('cases_100_plus');
  return badges;
});

expertProfileSchema.set('toJSON', { virtuals: true });
expertProfileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ExpertProfile', expertProfileSchema);