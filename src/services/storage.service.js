/**
 * Storage Service
 * Abstraction layer for cloud storage (S3 / Cloudinary)
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const env = require('../config/env');
const { s3Client, cloudinary } = require('../config/storage');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/error.middleware');

class StorageService {
  async uploadFile(file, folder = 'scans') {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${uuidv4()}${fileExtension}`;

    try {
      if (env.storageProvider === 's3') {
        return await this.uploadToS3(file, fileName);
      }
      return await this.uploadToCloudinary(file, folder);
    } catch (error) {
      logger.error('File upload failed:', error);
      throw new AppError(500, 'UPLOAD_FAILED', 'Failed to upload file');
    }
  }

  async uploadToS3(file, fileName) {
    if (env.storageProvider !== 's3') {
      throw new AppError(400, 'INVALID_PROVIDER', 'S3 is not enabled');
    }

    const { PutObjectCommand } = require('@aws-sdk/client-s3');

    const command = new PutObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private'
    });

    await s3Client.send(command);

    return {
      provider: 's3',
      key: fileName,
      bucket: env.aws.s3Bucket,
      url: `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/${fileName}`
    };
  }

  async uploadToCloudinary(file, folder) {
    if (!cloudinary) {
      throw new AppError(400, 'CLOUDINARY_NOT_CONFIGURED');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `nomaapp/${folder}`,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) return reject(error);

          resolve({
            provider: 'cloudinary',
            publicId: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format
          });
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteFile(fileInfo) {
    try {
      if (fileInfo.provider === 's3') {
        await this.deleteFromS3(fileInfo.key);
      } else {
        await this.deleteFromCloudinary(fileInfo.publicId);
      }
      return true;
    } catch (error) {
      logger.error('File deletion failed:', error);
      return false;
    }
  }

  async deleteFromS3(key) {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

    const command = new DeleteObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: key
    });

    await s3Client.send(command);
  }

  async deleteFromCloudinary(publicId) {
    await cloudinary.uploader.destroy(publicId);
  }

  async getSignedUrl(key, expiresIn = 3600) {
    if (env.storageProvider !== 's3') {
      throw new AppError(400, 'INVALID_OPERATION', 'Signed URLs only available for S3');
    }

    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

    const command = new GetObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: key
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }
}

module.exports = new StorageService();
