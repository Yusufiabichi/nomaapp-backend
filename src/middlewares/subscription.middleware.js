// middlewares/subscription.middleware.js
const subscriptionService = require('../services/subscription.service');
const plans = require('../config/plans');

// Gate any route behind a feature flag
const requireFeature = (feature) => async (req, res, next) => {
  const user = req.user;

  if (!subscriptionService.hasFeature(user, feature)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FEATURE_LOCKED',
        message: `This feature is not available on your ${user.subscription.plan} plan`,
        upgradeRequired: true
      }
    });
  }
  next();
};

// Gate diagnosis routes
const checkDiagnosisLimit = async (req, res, next) => {
  const result = await subscriptionService.canDiagnose(req.user);

  if (!result.allowed) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'DIAGNOSIS_LIMIT_REACHED',
        message: result.reason,
        upgradeRequired: true
      }
    });
  }
  next();
};

// Gate by role
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: { code: 'UNAUTHORIZED_ROLE', message: 'Access denied' }
    });
  }
  next();
};

module.exports = { requireFeature, checkDiagnosisLimit, requireRole };