// middlewares/expertGuard.middleware.js
const ExpertProfile = require('../models/expertProfile.model');

exports.requireApprovedExpert = async (req, res, next) => {
  if (req.user.role !== 'expert') return next();
  
  const profile = await ExpertProfile.findOne({ user: req.user._id });
  if (!profile || profile.overallStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'EXPERT_NOT_VERIFIED',
        message: 'Complete expert verification to access this feature',
        redirectTo: 'ExpertVerification'
      }
    });
  }
  next();
};