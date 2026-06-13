/**
 * Auth Model (extends User for auth-specific operations)
 * Note: Main user schema is in users.model.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // email: {
  //   type: String,
  //   required: [true, 'Email is required'],
  //   unique: true,
  //   lowercase: true,
  //   trim: true,
  //   match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  // },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: [11, 'Phone number must be 11 digits'],
    unique: true
  },
  role: {
    type: String,
    enum: ['farmer', 'expert', 'supplier', 'admin'],
    default: 'farmer'
  },

  subscription: {
    plan: {
      type: String,
      enum: ['trial', 'free', 'basic', 'premium'],
      default: 'trial'
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active'
    },
    trialStartDate: {
      type: Date,
      default: Date.now
    },
    trialEndDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    currentPeriodEnd: Date,
    paymentReference: String // Paystack reference
  },

  usage: {
    diagnosisCount: { type: Number, default: 0 },
    diagnosisResetDate: {
      type: Date,
      default: () => new Date(new Date().setHours(0,0,0,0)) // midnight today
    },
    expertSessionsUsed: { type: Number, default: 0 },
    expertSessionsResetDate: Date
  },

  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  // Sync metadata
  localId: String,
  syncedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for faster queries
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password changed after token was issued
userSchema.methods.changedPasswordAfter = function(jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);

// 2. Add these new fields anywhere in the schema (only relevant when role === 'admin'):

const adminFieldsToAdd = `
  // ── Admin-specific fields ──────────────────────────────────────────────────
  adminRole: {
    type: String,
    enum: ['super_admin', 'moderator', 'reviewer'],
    // No default — only set when role === 'admin'
  },
  permissions: {
    type: [String],
    default: []
    // Ignored for super_admin (they have all permissions implicitly)
    // Used for future moderator/reviewer roles
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
    // Tracks which admin invited this admin account
  },
  isActive: {
    type: Boolean,
    default: true
    // Allows deactivating admin access without deleting the account
  }
`;

// 3. Add a pre-save hook or validation (optional but recommended):
//    Ensure adminRole is only set when role === 'admin'
userSchema.pre('save', function(next) {
  if (this.role !== 'admin') {
    this.adminRole = undefined;
    this.permissions = [];
  }
  next();
});


module.exports = { adminFieldsToAdd }; // reference only — copy fields into user.model.js
