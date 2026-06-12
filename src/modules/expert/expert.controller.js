// controllers/expert.controller.js
const ExpertProfile   = require('./expertProfile.model');
const AssessmentQuestion = require('../assessment/assessmentQuestion.model');
const { uploadBuffer } = require('../../services/cloudinary.service');
const { notify }      = require('../../services/pushNotification.service');
const { AppError }    = require('../../middlewares/error.middleware');
const { successResponse } = require('../../utils/response');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get or create an ExpertProfile for the logged-in user
 */
const getOrCreateProfile = async (userId) => {
  let profile = await ExpertProfile.findOne({ user: userId });
  if (!profile) {
    profile = await ExpertProfile.create({ user: userId });
  }
  return profile;
};

// ─── GET: Verification Status ─────────────────────────────────────────────────

exports.getVerificationStatus = async (req, res, next) => {
  try {
    const profile = await getOrCreateProfile(req.user._id);
    return successResponse(res, 200, { profile }, 'Verification status fetched');
  } catch (err) {
    next(err);
  }
};

// ─── POST: Save Push Token ────────────────────────────────────────────────────

exports.savePushToken = async (req, res, next) => {
  try {
    const { expoPushToken } = req.body;
    if (!expoPushToken) throw new AppError(400, 'VALIDATION_ERROR', 'Push token required');

    const profile = await getOrCreateProfile(req.user._id);
    profile.expoPushToken = expoPushToken;
    await profile.save();

    return successResponse(res, 200, {}, 'Push token saved');
  } catch (err) {
    next(err);
  }
};

// ─── STAGE 1: Professional Profile ───────────────────────────────────────────

exports.saveProfile = async (req, res, next) => {
  try {
    const {
      specializations,
      yearsOfExperience,
      currentOrganization,
      currentRole,
      email,
      bio,
      linkedIn
    } = req.body;

    if (!specializations?.length)
      throw new AppError(400, 'VALIDATION_ERROR', 'Select at least one specialization');
    if (!yearsOfExperience && yearsOfExperience !== 0)
      throw new AppError(400, 'VALIDATION_ERROR', 'Years of experience is required');
    if (!currentRole)
      throw new AppError(400, 'VALIDATION_ERROR', 'Current role is required');
    if (!currentOrganization)
      throw new AppError(400, 'VALIDATION_ERROR', 'Current organization is required');
    if (!email)      throw new AppError(400, 'VALIDATION_ERROR', 'Email is required');
    if (bio && bio.length > 500)
      throw new AppError(400, 'VALIDATION_ERROR', 'Bio cannot exceed 500 characters');
    const profile = await getOrCreateProfile(req.user._id);

    // Only allow edit if not yet approved
    if (profile.overallStatus === 'approved') {
      throw new AppError(403, 'FORBIDDEN', 'Cannot edit profile after approval');
    }

    profile.specializations     = specializations;
    profile.yearsOfExperience   = yearsOfExperience;
    profile.currentOrganization = currentOrganization;
    profile.currentRole         = currentRole;
    profile.email               = email;
    profile.bio                 = bio;
    profile.linkedIn            = linkedIn;
    profile.stage1CompletedAt   = new Date();

    // Advance to stage 2 if still on 1
    if (profile.stage === '1') profile.stage = '2';

    await profile.save();
    return successResponse(res, 200, { profile }, 'Profile saved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── STAGE 2: Document Upload ─────────────────────────────────────────────────

exports.uploadDocuments = async (req, res, next) => {
  try {
    const profile = await getOrCreateProfile(req.user._id);

    if (profile.stage === '1') {
      throw new AppError(400, 'STAGE_ERROR', 'Complete your profile first');
    }
    if (profile.overallStatus === 'approved') {
      throw new AppError(403, 'FORBIDDEN', 'Already approved');
    }

    const { govIdType, professionalDocType } = req.body;
    const files = req.files;

    if (!files?.governmentId?.[0])
      throw new AppError(400, 'VALIDATION_ERROR', 'Government ID document is required');
    if (!files?.professionalDoc?.[0])
      throw new AppError(400, 'VALIDATION_ERROR', 'Professional document is required');
    if (!govIdType)
      throw new AppError(400, 'VALIDATION_ERROR', 'Government ID type is required');
    if (!professionalDocType)
      throw new AppError(400, 'VALIDATION_ERROR', 'Professional document type is required');

    // Upload both files to Cloudinary in parallel
    const [govResult, profResult] = await Promise.all([
      uploadBuffer(
        files.governmentId[0].buffer,
        `nomaapp/expert-docs/${req.user._id}/government-id`
      ),
      uploadBuffer(
        files.professionalDoc[0].buffer,
        `nomaapp/expert-docs/${req.user._id}/professional`
      )
    ]);

    profile.governmentId = {
      type: govIdType,
      cloudinaryUrl: govResult.url,
      publicId: govResult.public_id,
      status: 'pending'
    };

    profile.professionalDoc = {
      type: professionalDocType,
      cloudinaryUrl: profResult.url,
      publicId: profResult.public_id,
      status: 'pending'
    };

    profile.stage2SubmittedAt = new Date();
    profile.overallStatus     = 'pending_review';

    await profile.save();

    // Notify expert that docs are received
    await notify.documentsReceived(profile.expoPushToken);

    return successResponse(
      res, 200,
      { profile },
      'Documents uploaded successfully. Under review within 48 hours.'
    );
  } catch (err) {
    next(err);
  }
};

// ─── STAGE 3: Fetch Assessment Questions ──────────────────────────────────────

exports.getAssessmentQuestions = async (req, res, next) => {
  try {
    const profile = await ExpertProfile.findOne({ user: req.user._id });

    if (!profile || profile.stage !== '3') {
      throw new AppError(403, 'STAGE_ERROR', 'Complete document verification first');
    }

    if (profile.assessment?.attemptCount >= 3) {
      throw new AppError(403, 'MAX_ATTEMPTS', 'Maximum 3 attempts reached. Contact support.');
    }

    // Fetch 25 active questions: mix of difficulty levels
    // Easy: 7, Medium: 12, Hard: 6
    const [easy, medium, hard] = await Promise.all([
      AssessmentQuestion.find({ isActive: true, difficulty: 'easy' })
        .select('-correctAnswer -explanation') // never send answers to client
        .limit(7).lean(),
      AssessmentQuestion.find({ isActive: true, difficulty: 'medium' })
        .select('-correctAnswer -explanation')
        .limit(12).lean(),
      AssessmentQuestion.find({ isActive: true, difficulty: 'hard' })
        .select('-correctAnswer -explanation')
        .limit(6).lean()
    ]);

    // Shuffle and combine
    const questions = [...easy, ...medium, ...hard]
      .sort(() => Math.random() - 0.5);

    return successResponse(res, 200, {
      questions,
      totalQuestions: questions.length,
      passingScore: 70,
      timeLimitMinutes: 30
    }, 'Assessment questions fetched');
  } catch (err) {
    next(err);
  }
};

// ─── STAGE 3: Submit Assessment ───────────────────────────────────────────────

exports.submitAssessment = async (req, res, next) => {
  try {
    const profile = await ExpertProfile.findOne({ user: req.user._id });

    if (!profile || profile.stage !== '3') {
      throw new AppError(403, 'STAGE_ERROR', 'Not eligible for assessment');
    }

    const MAX_ATTEMPTS = 3;
    if ((profile.assessment?.attemptCount || 0) >= MAX_ATTEMPTS) {
      throw new AppError(403, 'MAX_ATTEMPTS', 'Maximum attempts reached');
    }

    const { answers } = req.body;
    // answers: [{ questionId: '...', selectedAnswer: 'A' }, ...]
    if (!answers?.length) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Answers are required');
    }

    // Fetch all submitted question IDs with correct answers
    const questionIds = answers.map(a => a.questionId);
    const questions   = await AssessmentQuestion.find({
      _id: { $in: questionIds },
      isActive: true
    }).select('correctAnswer difficulty').lean();

    if (questions.length !== answers.length) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid question IDs in submission');
    }

    // Score
    const questionMap = Object.fromEntries(
      questions.map(q => [q._id.toString(), q.correctAnswer])
    );

    let correct = 0;
    for (const answer of answers) {
      if (questionMap[answer.questionId] === answer.selectedAnswer) {
        correct++;
      }
    }

    const score  = Math.round((correct / questions.length) * 100);
    const passed = score >= 70;
    const attemptCount = (profile.assessment?.attemptCount || 0) + 1;
    const attemptsLeft = MAX_ATTEMPTS - attemptCount;

    profile.assessment = {
      score,
      passed,
      attemptCount,
      lastAttemptAt: new Date(),
      completedAt: passed ? new Date() : profile.assessment?.completedAt
    };

    if (passed) {
      profile.stage         = 'complete';
      profile.overallStatus = 'approved';

      // Award badges
      profile.performance.badges = [
        'verified_identity',
        'ag_professional',
        'passed_assessment'
      ];

      await notify.assessmentPassed(profile.expoPushToken, score);
    } else {
      await notify.assessmentFailed(profile.expoPushToken, score, attemptsLeft);
    }

    await profile.save();

    return successResponse(res, 200, {
      score,
      passed,
      correct,
      total: questions.length,
      attemptsLeft,
      overallStatus: profile.overallStatus
    }, passed ? 'Congratulations! You are now a verified NomaApp Expert.' : `Score: ${score}%. You need 70% to pass.`);
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: List Pending Experts ──────────────────────────────────────────────

exports.adminListExperts = async (req, res, next) => {
  try {
    const { status = 'pending_review', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [experts, total] = await Promise.all([
      ExpertProfile.find({ overallStatus: status })
        .populate('user', 'name phone email')
        .sort({ stage2SubmittedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ExpertProfile.countDocuments({ overallStatus: status })
    ]);

    return successResponse(res, 200, {
      experts,
      pagination: { page: Number(page), limit: Number(limit), total }
    }, 'Experts fetched');
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: Review Documents ──────────────────────────────────────────────────

exports.adminReviewDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason, notes } = req.body;
    // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Action must be approve or reject');
    }

    const profile = await ExpertProfile.findById(id);
    if (!profile) throw new AppError(404, 'NOT_FOUND', 'Expert profile not found');

    profile.adminReviewedBy = req.user._id;
    profile.adminNotes      = notes;
    profile.reviewedAt      = new Date();

    if (action === 'approve') {
      profile.governmentId.status   = 'approved';
      profile.professionalDoc.status = 'approved';
      profile.overallStatus          = 'incomplete'; // moves to stage 3
      profile.stage                  = '3';

      await notify.documentsApproved(profile.expoPushToken);
    } else {
      profile.governmentId.status   = 'rejected';
      profile.professionalDoc.status = 'rejected';
      profile.overallStatus          = 'rejected';
      profile.rejectionReason        = rejectionReason;

      await notify.documentsRejected(profile.expoPushToken, rejectionReason);
    }

    await profile.save();
    return successResponse(res, 200, { profile }, `Documents ${action}d successfully`);
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: Question Bank CRUD ────────────────────────────────────────────────

exports.adminCreateQuestion = async (req, res, next) => {
  try {
    const {
      question, type, options, correctAnswer,
      cropCategory, difficulty, explanation
    } = req.body;

    let imageUrl = null;
    let imagePublicId = null;

    // If image question, upload the image
    if (type === 'image' && req.file) {
      const result = await uploadBuffer(
        req.file.buffer,
        'nomaapp/assessment-questions'
      );
      imageUrl      = result.url;
      imagePublicId = result.public_id;
    }

    const q = await AssessmentQuestion.create({
      question, type, imageUrl, imagePublicId,
      options, correctAnswer, cropCategory,
      difficulty, explanation,
      createdBy: req.user._id
    });

    return successResponse(res, 201, { question: q }, 'Question created');
  } catch (err) {
    next(err);
  }
};

exports.adminListQuestions = async (req, res, next) => {
  try {
    const { difficulty, type, cropCategory, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (difficulty)   filter.difficulty   = difficulty;
    if (type)         filter.type         = type;
    if (cropCategory) filter.cropCategory = cropCategory;

    const questions = await AssessmentQuestion.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await AssessmentQuestion.countDocuments(filter);

    return successResponse(res, 200, { questions, total }, 'Questions fetched');
  } catch (err) {
    next(err);
  }
};

exports.adminUpdateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (req.file) {
      const result = await uploadBuffer(
        req.file.buffer,
        'nomaapp/assessment-questions'
      );
      updates.imageUrl      = result.url;
      updates.imagePublicId = result.public_id;
    }

    const q = await AssessmentQuestion.findByIdAndUpdate(id, updates, { new: true });
    if (!q) throw new AppError(404, 'NOT_FOUND', 'Question not found');

    return successResponse(res, 200, { question: q }, 'Question updated');
  } catch (err) {
    next(err);
  }
};

exports.adminDeleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const q = await AssessmentQuestion.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!q) throw new AppError(404, 'NOT_FOUND', 'Question not found');
    return successResponse(res, 200, {}, 'Question deactivated');
  } catch (err) {
    next(err);
  }
};