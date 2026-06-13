// middlewares/admin.middleware.js
const { AppError } = require('./error.middleware');
const { hasPermission } = require('../constants/adminPermissions');

/**
 * Ensures the authenticated user is an active admin.
 * Use AFTER the `authenticate` middleware.
 */
exports.requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(new AppError(403, 'FORBIDDEN', 'Admin access required'));
  }
  if (req.user.isActive === false) {
    return next(new AppError(403, 'ACCOUNT_DEACTIVATED', 'This admin account has been deactivated'));
  }
  next();
};

/**
 * Ensures the admin has a specific permission.
 * Super admins always pass. Use AFTER requireAdmin.
 *
 * @param {string} permission - from PERMISSIONS in adminPermissions.js
 */
exports.requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user, permission)) {
    return next(new AppError(
      403,
      'INSUFFICIENT_PERMISSIONS',
      `You don't have permission to perform this action (${permission})`
    ));
  }
  next();
};

/**
 * Shortcut: only super admins may proceed.
 * Used for admin management routes (inviting/deactivating other admins).
 */
exports.requireSuperAdmin = (req, res, next) => {
  if (req.user?.adminRole !== 'super_admin') {
    return next(new AppError(403, 'SUPER_ADMIN_ONLY', 'Only super admins can perform this action'));
  }
  next();
};