
//  Recommendation Controller
//  Handles HTTP requests for crop disease recommendations


const recommendationService = require('../../services/recommendation.service');
const { validationResult } = require('express-validator');
const { successResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

class RecommendationsController {
  async getRecommendation(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors.array());
      }

      const { diseaseId, severity, language = 'en', confidence = null } = req.body;
      const userId = req.user && req.user._id;

      logger.info('Recommendation request received', {
        userId,
        diseaseId,
        severity,
        language
      });

      const recommendation = recommendationService.getRecommendation({
        diseaseId,
        severity,
        language,
        confidence
      });

      return successResponse(res, 200, recommendation);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RecommendationsController();
