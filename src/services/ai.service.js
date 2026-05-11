
//  AI Service
//  Handles communication with external FastAPI AI inference service


const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/error.middleware');

class AIService {
  constructor() {
    this.client = axios.create({
      baseURL: env.aiServiceUrl,
      timeout: env.aiServiceTimeout,
      headers: {
        'Content-Type': 'application/json',
        ...(env.aiServiceApiKey && { 'X-API-Key': env.aiServiceApiKey })
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      config.metadata = { startTime: Date.now() };
      logger.debug('AI Service Request:', {
        method: config.method,
        url: config.url
      });
      return config;
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        logger.info('AI Service Response:', {
          status: response.status,
          duration: `${duration}ms`
        });
        return response;
      },
      (error) => {
        const duration = error.config?.metadata 
          ? Date.now() - error.config.metadata.startTime 
          : 0;
        logger.error('AI Service Error:', {
          status: error.response?.status,
          message: error.message,
          duration: `${duration}ms`
        });
        return Promise.reject(error);
      }
    );
  }

  
  // Send image for crop disease diagnosis
  
  async diagnose(imageUrl, metadata = {}) {
    try {
      const response = await this.client.post('/ai/infer', {
        image_url: imageUrl,
        metadata: {
          crop_type: metadata.cropType,
          location: metadata.location,
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        diagnosis: {
          disease: response.data.disease,
          confidence: response.data.confidence,
          severity: response.data.severity,
          recommendations: response.data.recommendations || [],
          alternativeDiagnoses: response.data.alternative_diagnoses || []
        },
        processingTime: response.data.processing_time,
        modelVersion: response.data.model_version
      };

    } catch (error) {
      return this.handleAIError(error);
    }
  }

  
  //  Check AI service health
  
  async healthCheck() {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return {
        healthy: true,
        status: response.data.status,
        modelLoaded: response.data.model_loaded
      };
    } catch (error) {
      logger.warn('AI Service health check failed:', error.message);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  
  //  Handle AI service errors gracefully
  
  handleAIError(error) {
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: {
          code: 'AI_TIMEOUT',
          message: 'AI service request timed out',
          retryable: true
        }
      };
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        success: false,
        error: {
          code: 'AI_UNAVAILABLE',
          message: 'AI service is currently unavailable',
          retryable: true
        }
      };
    }

    if (error.response) {
      const status = error.response.status;
      
      if (status === 422) {
        return {
          success: false,
          error: {
            code: 'AI_INVALID_INPUT',
            message: 'Invalid image or input data',
            retryable: false
          }
        };
      }

      if (status >= 500) {
        return {
          success: false,
          error: {
            code: 'AI_SERVICE_ERROR',
            message: 'AI service encountered an error',
            retryable: true
          }
        };
      }
    }

    return {
      success: false,
      error: {
        code: 'AI_UNKNOWN_ERROR',
        message: 'An unknown error occurred during diagnosis',
        retryable: true
      }
    };
  }
}

module.exports = new AIService();
