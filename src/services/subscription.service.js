// services/subscription.service.js
const plans = require('../config/plans');

class SubscriptionService {

  // Run this on every login or app open
  async checkAndExpireTrial(user) {
    if (
      user.subscription.plan === 'trial' &&
      new Date() > user.subscription.trialEndDate
    ) {
      user.subscription.plan = 'free';
      user.subscription.status = 'active';
      await user.save();
      return { trialExpired: true };
    }
    return { trialExpired: false };
  }

  // Check if user can perform diagnosis today
  async canDiagnose(user) {
    const plan = plans[user.subscription.plan];
    if (plan.diagnosisPerDay === Infinity) return { allowed: true };

    // Reset count if it's a new day
    const today = new Date().setHours(0, 0, 0, 0);
    const resetDate = new Date(user.usage.diagnosisResetDate).setHours(0, 0, 0, 0);

    if (today > resetDate) {
      user.usage.diagnosisCount = 0;
      user.usage.diagnosisResetDate = new Date();
      await user.save();
    }

    if (user.usage.diagnosisCount >= plan.diagnosisPerDay) {
      return {
        allowed: false,
        reason: `Daily limit of ${plan.diagnosisPerDay} diagnoses reached`,
        upgradeRequired: true
      };
    }

    return { allowed: true };
  }

  // Increment diagnosis count after successful scan
  async incrementDiagnosisCount(user) {
    user.usage.diagnosisCount += 1;
    await user.save();
  }

  // Check if a specific feature is accessible
  hasFeature(user, feature) {
    const plan = plans[user.subscription.plan];
    return plan.features[feature] === true;
  }

  // Upgrade plan (after Paystack payment confirmed)
  async upgradePlan(user, newPlan, paymentReference, periodEndDate) {
    user.subscription.plan = newPlan;
    user.subscription.status = 'active';
    user.subscription.paymentReference = paymentReference;
    user.subscription.currentPeriodEnd = periodEndDate;
    await user.save();
    return user;
  }
}

module.exports = new SubscriptionService();