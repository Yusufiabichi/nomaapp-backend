/**
 * File Upload Middleware
 * Multer configuration for image uploads
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { AppError } = require('./error.middleware');

// Memory storage for cloud upload
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  if (env.allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(
      400, 
      'INVALID_FILE_TYPE', 
      `Invalid file type. Allowed types: ${env.allowedFileTypes.join(', ')}`
    ), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSize,
    files: 5 // Maximum 5 files per request
  }
});

// Single image upload middleware
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError(
              400, 
              'FILE_TOO_LARGE', 
              `File size exceeds limit of ${env.maxFileSize / (1024 * 1024)}MB`
            ));
          }
        }
        return next(err);
      }
      next();
    });
  };
};

// Multiple images upload middleware
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError(
              400, 
              'FILE_TOO_LARGE', 
              `File size exceeds limit of ${env.maxFileSize / (1024 * 1024)}MB`
            ));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new AppError(
              400, 
              'TOO_MANY_FILES', 
              `Maximum ${maxCount} files allowed`
            ));
          }
        }
        return next(err);
      }
      next();
    });
  };
};

module.exports = {
  uploadSingle,
  uploadMultiple
};
