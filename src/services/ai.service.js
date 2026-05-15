
//  AI Service
//  Handles communication with external FastAPI AI inference service


const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const FormData = require('form-data');
const { AppError } = require('../middlewares/error.middleware');

class AIService {
  constructor() {
    this.client = axios.create({
      baseURL: env.aiServiceUrl,
      timeout: env.aiServiceTimeout,
      headers: {
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
          duration: `${duration}ms`,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  
  // Send image for crop disease diagnosis
  
  async diagnose(imageUrl, metadata = {}) {
    try {
      // 1. Fetch the image from cloud storage as a buffer
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      });

      const imageBuffer = Buffer.from(imageResponse.data);

      // Extract filename + content type from URL
      const filename = imageUrl.split('/').pop().split('?')[0] || 'scan.jpg';
      const contentType = imageResponse.headers['content-type'] || 'image/jpeg';

      // 2. Build multipart/form-data — matches FastAPI's expected fields
      const form = new FormData();
      form.append('image_file', imageBuffer, {
        filename,
        contentType
      });
      form.append('crop_type', (metadata.cropType || 'unknown').toLowerCase());

      // 3. POST with correct headers
      const response = await this.client.post('/ai/infer', form, {
        headers: {
          ...form.getHeaders(),
          ...(env.aiServiceApiKey && { 'X-API-Key': env.aiServiceApiKey })
        }
      });

      return {
        success: true,
        diagnosis: {
          disease: (response.data.disease).toLowerCase(),
          confidence: response.data.confidence,
          severity: response.data.severity
        },
        processingTime: response.data.processing_time,
        modelVersion: response.data.model_version
      };
      console.log(response.data.diagnosis);

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

      if (status === 400) {
      return {
        success: false,
        error: {
          code: 'AI_BAD_REQUEST',
          message: error.response.data?.detail || 'Bad request to AI service',
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
