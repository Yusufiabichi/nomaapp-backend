
//  Recommendation Service
//  Loads disease treatment data and resolves localized guidance


const path = require('path');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

const dataPath = path.join(__dirname, '..', '..', 'data', 'treatments.json');
let diseaseRecommendations = [];

try {
  diseaseRecommendations = require(dataPath);
  logger.info('Loaded disease recommendations dataset', {
    count: diseaseRecommendations.length,
    source: dataPath
  });
} catch (error) {
  logger.error('Failed to load disease recommendations dataset', {
    source: dataPath,
    error: error.message
  });
  throw new Error('Unable to initialize recommendation service');
}

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'ha'];
const SUPPORTED_SEVERITIES = ['low', 'moderate', 'high'];
const FALLBACK_MESSAGE = 'Consult agricultural expert';

const getFallbackRec = ({ diseaseName, severity, confidence }) => ({
  disease: diseaseName || 'Unknown disease',
  confidence: confidence != null ? confidence : null,
  severity: severity || null,
  recommendedTreatment: [FALLBACK_MESSAGE],
  futurePrevention: [FALLBACK_MESSAGE]
});

const normalizeLanguage = (language) => {
  if (!language) {
    return DEFAULT_LANGUAGE;
  }

  const normalized = String(language).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE;
};

const normalizeSeverity = (severity) => {
  if (!severity) {
    return null;
  }

  const normalized = String(severity).toLowerCase();
  return SUPPORTED_SEVERITIES.includes(normalized) ? normalized : null;
};

const getRecommendation = ({ diseaseId, severity, language = DEFAULT_LANGUAGE, confidence = null }) => {
  if (!diseaseId || !severity) {
    throw new AppError(400, 'RECOMMENDATION_INVALID_INPUT', 'diseaseId and severity are required');
  }

  const normalizedSeverity = normalizeSeverity(severity);
  const normalizedLanguage = normalizeLanguage(language);

  if (!normalizedSeverity) {
    throw new AppError(400, 'RECOMMENDATION_INVALID_SEVERITY', 'Severity must be low, moderate, or high');
  }

  const disease = diseaseRecommendations.find((item) => item.id === diseaseId);

  if (!disease) {
    logger.warn('Disease recommendation not found', { diseaseId, severity, language });
    return getFallbackRec({ severity: normalizedSeverity, confidence });
  }

  const severityNode = disease.severities && disease.severities[normalizedSeverity];
  if (!severityNode) {
    logger.warn('Severity recommendation not found for disease', { diseaseId, severity: normalizedSeverity, language });
    return getFallbackRec({ diseaseName: disease[`name_${normalizedLanguage}`] || disease.name_en, severity: normalizedSeverity, confidence });
  }

  const recommendedTreatment = severityNode[`recommended_treatment_${normalizedLanguage}`] || [];
  const futurePrevention = severityNode[`future_prevention_${normalizedLanguage}`] || [];

  return {
    disease: disease[`name_${normalizedLanguage}`] || disease.name_en || disease.id,
    confidence,
    severity: normalizedSeverity,
    recommendedTreatment: recommendedTreatment.length > 0 ? recommendedTreatment : [FALLBACK_MESSAGE],
    futurePrevention: futurePrevention.length > 0 ? futurePrevention : [FALLBACK_MESSAGE]
  };
};

module.exports = {
  getRecommendation
};
