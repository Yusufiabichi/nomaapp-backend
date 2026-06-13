// constants/adminPermissions.js

/**
 * Admin permission system.
 *
 * v1: Only 'super_admin' exists and has ALL permissions implicitly.
 * Future: 'moderator', 'reviewer', etc. can be added with subsets of these.
 *
 * Permissions are checked via hasPermission(adminUser, permission) —
 * super_admin always returns true regardless of the `permissions` array.
 */

const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  // Future roles — not yet assignable via invite, but enum is ready
  MODERATOR:   'moderator',
  REVIEWER:    'reviewer',
};

const PERMISSIONS = {
  // Expert verification
  EXPERTS_VIEW:    'experts:view',
  EXPERTS_REVIEW:  'experts:review',     // approve/reject documents

  // Assessment question bank
  QUESTIONS_VIEW:   'questions:view',
  QUESTIONS_MANAGE: 'questions:manage',  // create/edit/delete

  // Case oversight
  CASES_VIEW:    'cases:view',
  CASES_MANAGE:  'cases:manage',         // reassign/close/resolve disputes

  // Analytics
  ANALYTICS_VIEW: 'analytics:view',

  // Admin management (inviting other admins)
  ADMINS_MANAGE: 'admins:manage',
};

// Default permission sets per role (for future use when roles diversify)
const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // everything
  [ADMIN_ROLES.MODERATOR]: [
    PERMISSIONS.EXPERTS_VIEW,
    PERMISSIONS.EXPERTS_REVIEW,
    PERMISSIONS.CASES_VIEW,
    PERMISSIONS.CASES_MANAGE,
  ],
  [ADMIN_ROLES.REVIEWER]: [
    PERMISSIONS.EXPERTS_VIEW,
    PERMISSIONS.EXPERTS_REVIEW,
  ],
};

/**
 * Check if an admin user has a given permission.
 * Super admins always pass.
 *
 * @param {object} adminUser - User document with adminRole + permissions[]
 * @param {string} permission - one of PERMISSIONS values
 * @returns {boolean}
 */
const hasPermission = (adminUser, permission) => {
  if (!adminUser || adminUser.role !== 'admin') return false;
  if (adminUser.adminRole === ADMIN_ROLES.SUPER_ADMIN) return true;
  return (adminUser.permissions || []).includes(permission);
};

module.exports = {
  ADMIN_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
};