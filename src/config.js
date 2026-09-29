/** Central settings. Change limits here, not in the code that uses them. */
export const API_PREFIX = '/api/v1';

export const LIMITS = {
  dashboardBytes: 10 * 1024 * 1024,   // largest dashboard a workspace can save (stored in R2)
  dashboardName: 120,
  auditPage: 200,
};

/** What each workspace role may do with dashboards. */
export const DASHBOARD_RIGHTS = {
  admin: ['create', 'read', 'update', 'delete'],
  editor: ['create', 'read', 'update', 'delete'],
  viewer: ['read'],
};

/** Rate limits are defined in wrangler.jsonc (AUTH_LIMITER, API_LIMITER). These are the paths they protect. */
export const AUTH_LIMITED_PATHS = [
  '/api/v1/auth/sign-in', '/api/v1/auth/sign-up', '/api/v1/auth/forget-password',
  '/api/v1/auth/reset-password', '/api/v1/auth/request-password-reset', '/api/waitlist', '/api/v1/waitlist',
];
