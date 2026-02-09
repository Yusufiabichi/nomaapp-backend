/**
 * Express Application Configuration
 * Sets up middleware, routes, and error handling
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const farmsRoutes = require('./modules/farms/farms.routes');
const scansRoutes = require('./modules/scans/scans.routes');
const syncRoutes = require('./modules/sync/sync.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.nodeEnv === 'production' ? env.allowedOrigins : '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

app.get('/', (req, res) => {
  res.send('Welcome to the NomaApp API');
})

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/farms', farmsRoutes);
app.use('/api/scans', scansRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
