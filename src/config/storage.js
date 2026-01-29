/**
 * Storage Configuration
 * Initializes cloud storage providers (S3 or Cloudinary)
 */

const { S3Client } = require('@aws-sdk/client-s3');
const cloudinary = require('cloudinary').v2;
const env = require('./env');

// Initialize S3 Client
const s3Client = env.storageProvider === 's3' ? new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey
  }
}) : null;

// Initialize Cloudinary
if (env.storageProvider === 'cloudinary') {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true
  });
}

module.exports = {
  s3Client,
  cloudinary: env.storageProvider === 'cloudinary' ? cloudinary : null
};
