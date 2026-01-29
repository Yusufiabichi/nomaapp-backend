/**
 * Logger Utility
 * Winston-based logging with file and console transports
 */

const winston = require('winston');
const env = require('../config/env');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  })
];

// Add file transport in production
if (env.nodeEnv === 'production') {
  transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: logFormat 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: logFormat 
    })
  );
}

const logger = winston.createLogger({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.Console(),
    ...(env.nodeEnv === 'production' 
      ? [new winston.transports.File({ filename: 'logs/exceptions.log' })]
      : [])
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    ...(env.nodeEnv === 'production'
      ? [new winston.transports.File({ filename: 'logs/rejections.log' })]
      : [])
  ]
});

module.exports = logger;
