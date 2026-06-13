/**
 * Admin Controller
 * Handles HTTP requests for admin endpoints
 */

const bcrypt = require('bcryptjs');
const adminService = require('./admin.service');
const User              = require('../../modules/users/users.model');
const ExpertProfile      = require('../../modules/expert/expertProfile.model');
const AssessmentQuestion = require('../../modules/assessment/assessmentQuestion.model');
const Case               = require('../../modules/expert/case.model');
const Scan                = require('../../modules/scans/scans.model');
const { successResponse, paginatedResponse } = require('../../utils/response');
const { validationResult } = require('express-validator');
const { AppError } = require('../../middlewares/error.middleware');
const { uploadBuffer }   = require('../../services/cloudinary.service');
const { notify }         = require('../../services/pushNotification.service');
const { ADMIN_ROLES }    = require('../../constants/adminPermissions');

class AdminController {
  /**
   * GET /api/admin/dashboard
   * Get dashboard statistics
   */
  async getDashboard(req, res, next) {
    try {
      const stats = await adminService.getDashboardStats();
      return successResponse(res, 200, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:id/role
   * Update user role
   */
  async updateUserRole(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      const user = await adminService.updateUserRole(
        req.params.id,
        req.body.role
      );

      return successResponse(res, 200, { user }, 'User role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:id/toggle-status
   * Toggle user active status
   */
  async toggleUserStatus(req, res, next) {
    try {
      const user = await adminService.toggleUserStatus(req.params.id);
      return successResponse(res, 200, { user }, 'User status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/scans/failed
   * Get failed scans
   */
  async getFailedScans(req, res, next) {
    try {
      const result = await adminService.getFailedScans(req.query);
      return paginatedResponse(res, 200, result.scans, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/scans/:id/retry
   * Admin retry diagnosis
   */
  async retryDiagnosis(req, res, next) {
    try {
      const scan = await adminService.adminRetryDiagnosis(req.params.id);
      return successResponse(res, 200, { scan }, 'Diagnosis retry initiated');
    } catch (error) {
      next(error);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPERT VERIFICATION MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════
 
// GET /admin/experts?status=pending_review&page=1&limit=20
exports.listExperts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const filter = {};
 
    if (status) filter.overallStatus = status;
 
    let query = ExpertProfile.find(filter)
      .populate('user', 'name phone email')
      .sort({ stage2SubmittedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
 
    let experts = await query;
 
    // Optional search by name/phone (post-populate filter — fine for admin scale)
    if (search) {
      const term = search.toLowerCase();
      experts = experts.filter(e =>
        e.user?.name?.toLowerCase().includes(term) ||
        e.user?.phone?.includes(term)
      );
    }
 
    const total = await ExpertProfile.countDocuments(filter);
 
    // Quick counts for dashboard tabs
    const counts = await ExpertProfile.aggregate([
      { $group: { _id: '$overallStatus', count: { $sum: 1 } } }
    ]);
    const statusCounts = counts.reduce((acc, c) => {
      acc[c._id] = c.count;
      return acc;
    }, {});
 
    return successResponse(res, 200, {
      experts,
      statusCounts,
      pagination: { page: Number(page), limit: Number(limit), total }
    }, 'Experts fetched');
  } catch (err) {
    next(err);
  }
};
 
// GET /admin/experts/:id — full profile + documents
exports.getExpertDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
 
    const profile = await ExpertProfile.findById(id)
      .populate('user', 'name phone email createdAt')
      .populate('adminReviewedBy', 'name')
      .lean();
 
    if (!profile) throw new AppError(404, 'NOT_FOUND', 'Expert profile not found');
 
    return successResponse(res, 200, { profile }, 'Expert profile fetched');
  } catch (err) {
    next(err);
  }
};
 
// PATCH /admin/experts/:id/review
exports.reviewExpertDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason, notes } = req.body;
 
    if (!['approve', 'reject'].includes(action)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Action must be "approve" or "reject"');
    }
    if (action === 'reject' && !rejectionReason) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Rejection reason is required');
    }
 
    const profile = await ExpertProfile.findById(id);
    if (!profile) throw new AppError(404, 'NOT_FOUND', 'Expert profile not found');
 
    if (profile.overallStatus !== 'pending_review') {
      throw new AppError(400, 'INVALID_STATE',
        `Cannot review — current status is "${profile.overallStatus}"`);
    }
 
    profile.adminReviewedBy = req.user._id;
    profile.adminNotes      = notes;
    profile.reviewedAt      = new Date();
 
    if (action === 'approve') {
      profile.governmentId.status    = 'approved';
      profile.professionalDoc.status = 'approved';
      profile.overallStatus          = 'incomplete'; // unlocks stage 3
      profile.stage                  = '3';
      profile.rejectionReason        = undefined;
 
      await notify.documentsApproved(profile.expoPushToken);
    } else {
      profile.governmentId.status    = 'rejected';
      profile.professionalDoc.status = 'rejected';
      profile.overallStatus          = 'rejected';
      profile.rejectionReason        = rejectionReason;
 
      await notify.documentsRejected(profile.expoPushToken, rejectionReason);
    }
 
    await profile.save();
 
    return successResponse(res, 200, { profile },
      `Documents ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
  } catch (err) {
    next(err);
  }
};
 
 
// ════════════════════════════════════════════════════════════════════════════
// ASSESSMENT QUESTION BANK
// ════════════════════════════════════════════════════════════════════════════
 
// GET /admin/assessment-questions
exports.listQuestions = async (req, res, next) => {
  try {
    const { difficulty, type, cropCategory, isActive, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (difficulty)   filter.difficulty   = difficulty;
    if (type)         filter.type         = type;
    if (cropCategory) filter.cropCategory = cropCategory;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
 
    const questions = await AssessmentQuestion.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
 
    const total = await AssessmentQuestion.countDocuments(filter);
 
    // Breakdown by difficulty for dashboard
    const breakdown = await AssessmentQuestion.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ]);
 
    return successResponse(res, 200, {
      questions,
      total,
      breakdown: breakdown.reduce((acc, b) => { acc[b._id] = b.count; return acc; }, {}),
      pagination: { page: Number(page), limit: Number(limit), total }
    }, 'Questions fetched');
  } catch (err) {
    next(err);
  }
};
 
// GET /admin/assessment-questions/:id
exports.getQuestionDetail = async (req, res, next) => {
  try {
    const question = await AssessmentQuestion.findById(req.params.id).lean();
    if (!question) throw new AppError(404, 'NOT_FOUND', 'Question not found');
    return successResponse(res, 200, { question }, 'Question fetched');
  } catch (err) {
    next(err);
  }
};
 
// POST /admin/assessment-questions
exports.createQuestion = async (req, res, next) => {
  try {
    const {
      question, type, options, correctAnswer,
      cropCategory, difficulty, explanation
    } = req.body;
 
    if (!question)      throw new AppError(400, 'VALIDATION_ERROR', 'Question text is required');
    if (!type)          throw new AppError(400, 'VALIDATION_ERROR', 'Type is required');
    if (!correctAnswer) throw new AppError(400, 'VALIDATION_ERROR', 'Correct answer is required');
 
    let parsedOptions = options;
    if (typeof options === 'string') parsedOptions = JSON.parse(options);
 
    if (!parsedOptions || parsedOptions.length < 2 || parsedOptions.length > 4) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A question must have 2-4 options');
    }
 
    let imageUrl = null;
    let imagePublicId = null;
 
    if (type === 'image') {
      if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'Image is required for image-type questions');
      const result = await uploadBuffer(req.file.buffer, 'nomaapp/assessment-questions');
      imageUrl      = result.url;
      imagePublicId = result.public_id;
    }
 
    const q = await AssessmentQuestion.create({
      question, type, imageUrl, imagePublicId,
      options: parsedOptions, correctAnswer,
      cropCategory: cropCategory || 'general',
      difficulty: difficulty || 'medium',
      explanation,
      createdBy: req.user._id
    });
 
    return successResponse(res, 201, { question: q }, 'Question created successfully');
  } catch (err) {
    next(err);
  }
};
 
// PATCH /admin/assessment-questions/:id
exports.updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
 
    if (updates.options && typeof updates.options === 'string') {
      updates.options = JSON.parse(updates.options);
    }
 
    if (req.file) {
      const result = await uploadBuffer(req.file.buffer, 'nomaapp/assessment-questions');
      updates.imageUrl      = result.url;
      updates.imagePublicId = result.public_id;
    }
 
    const q = await AssessmentQuestion.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });
    if (!q) throw new AppError(404, 'NOT_FOUND', 'Question not found');
 
    return successResponse(res, 200, { question: q }, 'Question updated successfully');
  } catch (err) {
    next(err);
  }
};
 
// DELETE /admin/assessment-questions/:id (soft delete)
exports.deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const q = await AssessmentQuestion.findByIdAndUpdate(
      id, { isActive: false }, { new: true }
    );
    if (!q) throw new AppError(404, 'NOT_FOUND', 'Question not found');
    return successResponse(res, 200, {}, 'Question deactivated successfully');
  } catch (err) {
    next(err);
  }
};
 
 
// ════════════════════════════════════════════════════════════════════════════
// CASE OVERSIGHT
// ════════════════════════════════════════════════════════════════════════════
 
// GET /admin/cases?status=pending&page=1
exports.listCases = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
 
    let cases = await Case.find(filter)
      .populate('farmer', 'name phone')
      .populate('expert', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
 
    if (search) {
      const term = search.toLowerCase();
      cases = cases.filter(c =>
        c.farmer?.name?.toLowerCase().includes(term) ||
        c.expert?.name?.toLowerCase().includes(term) ||
        c.diagnosisSnapshot?.disease?.toLowerCase().includes(term)
      );
    }
 
    const total = await Case.countDocuments(filter);
 
    const statusCounts = await Case.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
 
    return successResponse(res, 200, {
      cases,
      statusCounts: statusCounts.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {}),
      pagination: { page: Number(page), limit: Number(limit), total }
    }, 'Cases fetched');
  } catch (err) {
    next(err);
  }
};
 
// GET /admin/cases/:id
exports.getCaseDetail = async (req, res, next) => {
  try {
    const caseDoc = await Case.findById(req.params.id)
      .populate('farmer', 'name phone email')
      .populate('expert', 'name phone email')
      .populate('scan')
      .lean();
 
    if (!caseDoc) throw new AppError(404, 'NOT_FOUND', 'Case not found');
 
    return successResponse(res, 200, { case: caseDoc }, 'Case fetched');
  } catch (err) {
    next(err);
  }
};
 
// PATCH /admin/cases/:id — reassign, force-resolve, or escalate
exports.updateCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, newExpertId, adminNote } = req.body;
    // action: 'reassign' | 'resolve' | 'decline'
 
    const caseDoc = await Case.findById(id);
    if (!caseDoc) throw new AppError(404, 'NOT_FOUND', 'Case not found');
 
    switch (action) {
      case 'reassign': {
        if (!newExpertId) throw new AppError(400, 'VALIDATION_ERROR', 'newExpertId is required');
 
        const newExpertProfile = await ExpertProfile.findOne({
          user: newExpertId, overallStatus: 'approved'
        });
        if (!newExpertProfile) throw new AppError(404, 'NOT_FOUND', 'New expert not found or not approved');
 
        const oldExpert = caseDoc.expert;
        caseDoc.expert = newExpertId;
        caseDoc.status = 'pending';
        caseDoc.adminNote = adminNote;
 
        await notify.newCaseAssigned(newExpertProfile.expoPushToken, {
          farmerName: '(reassigned case)',
          cropType: caseDoc.diagnosisSnapshot?.cropType,
          disease: caseDoc.diagnosisSnapshot?.disease
        });
        break;
      }
 
      case 'resolve':
        caseDoc.status = 'resolved';
        caseDoc.resolvedAt = new Date();
        caseDoc.adminNote = adminNote;
        break;
 
      case 'decline':
        caseDoc.status = 'declined';
        caseDoc.adminNote = adminNote;
        break;
 
      default:
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid action. Use reassign, resolve, or decline');
    }
 
    await caseDoc.save();
    return successResponse(res, 200, { case: caseDoc }, `Case ${action}d successfully`);
  } catch (err) {
    next(err);
  }
};
 
 
// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════════════════════
 
// GET /admin/analytics/summary
exports.getAnalyticsSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo  = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
 
    const [
      totalUsers,
      totalFarmers,
      totalExperts,
      approvedExperts,
      pendingExperts,
      totalScans,
      scansLast7Days,
      totalCases,
      pendingCases,
      resolvedCases,
      planBreakdown,
      newUsersLast7Days,
      newUsersLast30Days,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'expert' }),
      ExpertProfile.countDocuments({ overallStatus: 'approved' }),
      ExpertProfile.countDocuments({ overallStatus: 'pending_review' }),
      Scan.countDocuments({}),
      Scan.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Case.countDocuments({}),
      Case.countDocuments({ status: 'pending' }),
      Case.countDocuments({ status: 'resolved' }),
      User.aggregate([
        { $match: { role: 'farmer' } },
        { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
      ]),
      User.countDocuments({ role: 'farmer', createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ role: 'farmer', createdAt: { $gte: thirtyDaysAgo } }),
    ]);
 
    return successResponse(res, 200, {
      users: {
        total: totalUsers,
        farmers: totalFarmers,
        experts: totalExperts,
        newLast7Days: newUsersLast7Days,
        newLast30Days: newUsersLast30Days,
      },
      experts: {
        approved: approvedExperts,
        pendingReview: pendingExperts,
      },
      scans: {
        total: totalScans,
        last7Days: scansLast7Days,
      },
      cases: {
        total: totalCases,
        pending: pendingCases,
        resolved: resolvedCases,
      },
      subscriptions: planBreakdown.reduce((acc, p) => {
        acc[p._id || 'unknown'] = p.count;
        return acc;
      }, {}),
    }, 'Analytics summary fetched');
  } catch (err) {
    next(err);
  }
};
 
 
// ════════════════════════════════════════════════════════════════════════════
// ADMIN MANAGEMENT (super admin only)
// ════════════════════════════════════════════════════════════════════════════
 
// GET /admin/admins — list all admin accounts
exports.listAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('name phone email adminRole permissions isActive createdAt invitedBy')
      .populate('invitedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
 
    return successResponse(res, 200, { admins }, 'Admins fetched');
  } catch (err) {
    next(err);
  }
};
 
// POST /admin/admins/invite — create a new admin account (super admin only)
exports.inviteAdmin = async (req, res, next) => {
  try {
    const { name, phone, password, adminRole, permissions } = req.body;
 
    if (!name || !phone || !password) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Name, phone, and password are required');
    }
    if (password.length < 6) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Password must be at least 6 characters');
    }
 
    const validRoles = Object.values(ADMIN_ROLES);
    const targetRole = adminRole || ADMIN_ROLES.MODERATOR;
    if (!validRoles.includes(targetRole)) {
      throw new AppError(400, 'VALIDATION_ERROR', `adminRole must be one of: ${validRoles.join(', ')}`);
    }
 
    const existing = await User.findOne({ phone });
    if (existing) {
      throw new AppError(409, 'CONFLICT', 'A user with this phone number already exists');
    }
 
    const hashedPassword = await bcrypt.hash(password, 12);
 
    const newAdmin = await User.create({
      name, phone,
      password: hashedPassword,
      role: 'admin',
      adminRole: targetRole,
      permissions: permissions || [],
      invitedBy: req.user._id,
      isActive: true,
      subscription: { plan: 'premium', status: 'active' }
    });
 
    return successResponse(res, 201, {
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        phone: newAdmin.phone,
        adminRole: newAdmin.adminRole,
        permissions: newAdmin.permissions
      }
    }, 'Admin account created successfully');
  } catch (err) {
    next(err);
  }
};
 
// PATCH /admin/admins/:id — update role/permissions/active status (super admin only)
exports.updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminRole, permissions, isActive } = req.body;
 
    if (id === req.user._id.toString()) {
      throw new AppError(400, 'INVALID_ACTION', 'You cannot modify your own admin account here');
    }
 
    const admin = await User.findOne({ _id: id, role: 'admin' });
    if (!admin) throw new AppError(404, 'NOT_FOUND', 'Admin account not found');
 
    if (adminRole) {
      const validRoles = Object.values(ADMIN_ROLES);
      if (!validRoles.includes(adminRole)) {
        throw new AppError(400, 'VALIDATION_ERROR', `adminRole must be one of: ${validRoles.join(', ')}`);
      }
      admin.adminRole = adminRole;
    }
    if (permissions !== undefined) admin.permissions = permissions;
    if (isActive !== undefined)    admin.isActive = isActive;
 
    await admin.save();
 
    return successResponse(res, 200, {
      admin: {
        id: admin._id,
        name: admin.name,
        adminRole: admin.adminRole,
        permissions: admin.permissions,
        isActive: admin.isActive
      }
    }, 'Admin account updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = Object.assign(new AdminController(), exports);
