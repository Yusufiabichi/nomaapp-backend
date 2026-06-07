const mongoose = require('mongoose');
const { Schema } = mongoose;

const optionSchema = new Schema({
  label: { type: String, required: true },  // e.g. "A", "B", "C", "D"
  value: { type: String, required: true }   // the option text
}, { _id: false });

const assessmentQuestionSchema = new Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },

  type: {
    type: String,
    enum: ['mcq', 'image'],
    required: true
  },

  // Cloudinary URL — only for image-type questions
  imageUrl: {
    type: String,
    default: null
  },
  imagePublicId: {
    type: String,
    default: null
  },

  options: {
    type: [optionSchema],
    validate: {
      validator: (opts) => opts.length >= 2 && opts.length <= 4,
      message: 'A question must have 2–4 options'
    }
  },

  // The correct option label e.g. "A"
  correctAnswer: {
    type: String,
    required: true
  },

  cropCategory: {
    type: String,
    enum: ['maize', 'rice', 'tomato', 'cassava', 'yam', 'sorghum',
           'cowpea', 'soybean', 'general', 'pests', 'nutrients'],
    default: 'general'
  },

  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },

  explanation: {
    type: String, // shown after assessment to help experts learn
    trim: true
  },

  isActive: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

// Only return active questions by default
assessmentQuestionSchema.index({ isActive: 1, difficulty: 1 });

module.exports = mongoose.model('AssessmentQuestion', assessmentQuestionSchema);