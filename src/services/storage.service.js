/**
 * Storage Service
 * Abstraction layer for cloud storage (S3 / Cloudinary)
 */

const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const env = require('../config/env');
const { s3Client, cloudinary } = require('../config/storage');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/error.middleware');

class StorageService {
  /**
   * Upload file to cloud storage
   */
  async uploadFile(file, folder = 'scans') {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${uuidv4()}${fileExtension}`;

    try {
      if (env.storageProvider === 's3') {
        return await this.uploadToS3(file, fileName);
      } else {
        return await this.uploadToCloudinary(file, folder);
      }
    } catch (error) {
      logger.error('File upload failed:', error);
      throw new AppError(500, 'UPLOAD_FAILED', 'Failed to upload file');
    }
  }

  /**
   * Upload to AWS S3
   */
  async uploadToS3(file, fileName) {
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

  /**
   * Upload to Cloudinary
   */
  async uploadToCloudinary(file, folder) {
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
          if (error) {
            reject(error);
          } else {
            resolve({
              provider: 'cloudinary',
              publicId: result.public_id,
              url: result.secure_url,
              width: result.width,
              height: result.height,
              format: result.format
            });
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Delete file from cloud storage
   */
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

  /**
   * Delete from S3
   */
  async deleteFromS3(key) {
    const command = new DeleteObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: key
    });
    await s3Client.send(command);
  }

  /**
   * Delete from Cloudinary
   */
  async deleteFromCloudinary(publicId) {
    await cloudinary.uploader.destroy(publicId);
  }

  /**
   * Get signed URL for private S3 objects
   */
  async getSignedUrl(key, expiresIn = 3600) {
    if (env.storageProvider !== 's3') {
      throw new AppError(400, 'INVALID_OPERATION', 'Signed URLs only available for S3');
    }

    const command = new GetObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: key
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }
}

module.exports = new StorageService();
