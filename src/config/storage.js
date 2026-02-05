/**
 * Storage Configuration
 */

const env = require('./env');

let s3Client = null;
let cloudinary = null;

if (env.storageProvider === 's3') {
  const { S3Client } = require('@aws-sdk/client-s3');

  s3Client = new S3Client({
    region: env.aws.region,
    credentials: {
      accessKeyId: env.aws.accessKeyId,
      secretAccessKey: env.aws.secretAccessKey
    }
  });
}

if (env.storageProvider === 'cloudinary') {
  cloudinary = require('cloudinary').v2;

  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true
  });
}

module.exports = { s3Client, cloudinary };
