/** Pro is switched off until PRO_ENABLED is "true" (set per environment in wrangler.jsonc). */
import { fail } from '../lib/errors.js';
export async function proGate(c, next) {
  if (c.env.PRO_ENABLED !== 'true') return fail(c, 404, 'Chartwright Pro isn’t available yet.');
  if (!c.env.BETTER_AUTH_SECRET) return fail(c, 503, 'Pro is not configured yet.');
  if (!c.env.BLOBS) return fail(c, 503, 'Pro storage is not configured yet.');
  return next();
}
