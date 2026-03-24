/**
 * Server Entry Point
 * Initializes database connection and starts the HTTP server
 */

const app = require('./app');
const { connectDatabase } = require('./config/database');
const env = require('./config/env');
const logger = require('./utils/logger');

const startServer = async () => {
  try {
    // Start HTTP server
    const server = app.listen(env.port, () => {
      logger.info(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
    });

    // Connect to MongoDB after the server is listening so development startup
    // doesn't hard-fail on transient or local DNS issues.
    connectDatabase()
      .then(() => {
        logger.info('Database connected successfully');
      })
      .catch((error) => {
        if (env.nodeEnv === 'production') {
          logger.error('Failed to connect to MongoDB in production. Shutting down.', error);
          server.close(() => process.exit(1));
          return;
        }

        logger.warn(
          'Starting without a database connection. Check MONGODB_URI or local DNS if database-backed routes fail.'
        );
      });
    
    // Graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
