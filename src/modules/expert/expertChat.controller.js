// controllers/expertChat.controller.js
const ExpertProfile = require('./expertProfile.model');
const Scan          = require('../scans/scans.model');
const Case          = require('./case.model');
const { AppError }  = require('../../middlewares/error.middleware');
const { successResponse } = require('../../utils/response');
const { notify }   = require('../../services/pushNotification.service');
const subscriptionService = require('../../services/subscription.service');

// ─── GET: List Experts (matched or all) ───────────────────────────────────────

exports.listExperts = async (req, res, next) => {
  try {
    const { scanId, cropType, specialization, sortBy } = req.query;

    let targetCrop = cropType || specialization;

    // If scanId provided, derive crop type from the scan
    if (scanId && !targetCrop) {
      const scan = await Scan.findById(scanId).lean();
      if (scan) targetCrop = scan.cropType;
    }

    const baseFilter = {
      overallStatus: 'approved',
      stage: 'complete'
    };

    let experts = [];
    let matchedByCrop = false;

    // 1. Try matching by crop specialization
    if (targetCrop) {
      experts = await ExpertProfile.find({
        ...baseFilter,
        specializations: { $in: [targetCrop.toLowerCase(), 'general'] }
      })
        .populate('user', 'name phone')
        .lean();

      if (experts.length > 0) matchedByCrop = true;
    }

    // 2. Fallback — return all approved experts
    if (experts.length === 0) {
      experts = await ExpertProfile.find(baseFilter)
        .populate('user', 'name phone')
        .lean();
    }

    // Apply sorting
    const sortFns = {
      rating: (a, b) => (b.performance?.averageRating || 0) - (a.performance?.averageRating || 0),
      cases:  (a, b) => (b.performance?.casesHandled || 0) - (a.performance?.casesHandled || 0),
      experience: (a, b) => (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0),
    };
    if (sortBy && sortFns[sortBy]) {
      experts.sort(sortFns[sortBy]);
    } else {
      // Default: rating desc
      experts.sort(sortFns.rating);
    }

    // Shape response — only expose relevant fields
    const shaped = experts.map(e => ({
      id:               e._id,
      userId:           e.user?._id,
      name:             e.user?.name,
      currentRole:      e.currentRole,
      currentOrganization: e.currentOrganization,
      specializations:  e.specializations,
      yearsOfExperience: e.yearsOfExperience,
      bio:              e.bio,
      performance: {
        casesHandled:  e.performance?.casesHandled || 0,
        averageRating: e.performance?.averageRating || 0,
        totalRatings:  e.performance?.totalRatings || 0,
      },
      badges: e.displayBadges || []
    }));

    return successResponse(res, 200, {
      experts: shaped,
      matchedByCrop,
      cropType: targetCrop || null,
      total: shaped.length
    }, matchedByCrop
      ? `Found ${shaped.length} expert(s) specializing in ${targetCrop}`
      : `Showing all available experts`
    );
  } catch (err) {
    next(err);
  }
};

// ─── POST: Create a Case (file diagnosis to expert) ───────────────────────────

exports.createCase = async (req, res, next) => {
  try {
    const { expertUserId, scanId, farmerNote } = req.body;

    if (!expertUserId) throw new AppError(400, 'VALIDATION_ERROR', 'Expert is required');
    if (!scanId)        throw new AppError(400, 'VALIDATION_ERROR', 'Scan/diagnosis is required');

    // ── Subscription check: Basic/Premium only ──────────────────────────────
    const farmer = req.user;
    const plan = farmer.subscription?.plan;

    if (plan === 'free') {
      throw new AppError(403, 'FEATURE_LOCKED',
        'Expert consultations require Basic or Premium plan');
    }

    if (plan === 'basic') {
      const used = farmer.usage?.expertSessionsUsed || 0;
      if (used >= 5) {
        throw new AppError(403, 'SESSION_LIMIT_REACHED',
          'You have used all 5 expert sessions this month. Upgrade to Premium for unlimited.');
      }
    }

    // ── Validate expert ───────────────────────────────────────────────────
    const expertProfile = await ExpertProfile.findOne({
      user: expertUserId,
      overallStatus: 'approved'
    });
    if (!expertProfile) {
      throw new AppError(404, 'NOT_FOUND', 'Expert not found or not verified');
    }

    // ── Validate scan ─────────────────────────────────────────────────────
    const scan = await Scan.findOne({ _id: scanId, user: farmer._id });
    if (!scan) {
      throw new AppError(404, 'NOT_FOUND', 'Diagnosis scan not found');
    }

    // ── Create case ───────────────────────────────────────────────────────
    const caseDoc = await Case.create({
      farmer: farmer._id,
      expert: expertUserId,
      scan: scan._id,
      diagnosisSnapshot: {
        disease:    scan.diagnosis?.disease,
        confidence: scan.diagnosis?.confidence,
        severity:   scan.diagnosis?.severity,
        cropType:   scan.cropType,
        imageUrl:   scan.imageUrl
      },
      farmerNote: farmerNote || '',
      status: 'pending'
    });

    // ── Increment usage for Basic plan ───────────────────────────────────
    if (plan === 'basic') {
      farmer.usage.expertSessionsUsed = (farmer.usage?.expertSessionsUsed || 0) + 1;
      await farmer.save();
    }

    // ── Notify expert ─────────────────────────────────────────────────────
    await notify.newCaseAssigned(expertProfile.expoPushToken, {
      farmerName: farmer.name,
      cropType: scan.cropType,
      disease: scan.diagnosis?.disease
    });

    return successResponse(res, 201, {
      case: caseDoc,
      sessionsRemaining: plan === 'basic'
        ? Math.max(0, 5 - farmer.usage.expertSessionsUsed)
        : 'unlimited'
    }, 'Case submitted successfully. The expert will respond soon.');
  } catch (err) {
    next(err);
  }
};

// ─── GET: Farmer's case history ───────────────────────────────────────────────

exports.getMyCases = async (req, res, next) => {
  try {
    const cases = await Case.find({ farmer: req.user._id })
      .populate('expert', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, 200, { cases }, 'Cases fetched');
  } catch (err) {
    next(err);
  }
};

// ─── GET: Single case detail ──────────────────────────────────────────────────

exports.getCaseDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const caseDoc = await Case.findOne({
      _id: id,
      $or: [{ farmer: req.user._id }, { expert: req.user._id }]
    })
      .populate('expert', 'name phone')
      .populate('farmer', 'name phone')
      .lean();

    if (!caseDoc) throw new AppError(404, 'NOT_FOUND', 'Case not found');

    return successResponse(res, 200, { case: caseDoc }, 'Case fetched');
  } catch (err) {
    next(err);
  }
};