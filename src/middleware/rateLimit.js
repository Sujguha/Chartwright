/**
 * Rate limits using Cloudflare's rate-limit bindings (shared across all Cloudflare servers).
 * AUTH_LIMITER protects log-in, sign-up, password reset and the waitlist; API_LIMITER protects the rest of the API.
 * If a binding isn't configured (for example in local tests), requests pass through.
 */
import { fail } from '../lib/errors.js';
import { AUTH_LIMITED_PATHS } from '../config.js';

const clientKey = (c) => c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

export async function rateLimit(c, next) {
  const path = new URL(c.req.url).pathname;
  const sensitive = AUTH_LIMITED_PATHS.some((p) => path.startsWith(p));
  const limiter = sensitive ? c.env.AUTH_LIMITER : c.env.API_LIMITER;
  if (limiter && typeof limiter.limit === 'function') {
    const { success } = await limiter.limit({ key: (sensitive ? 'auth:' : 'api:') + clientKey(c) });
    if (!success) {
      c.header('Retry-After', '60');
      return fail(c, 429, 'Too many attempts. Please wait a minute and try again.');
    }
  }
  return next();
}
