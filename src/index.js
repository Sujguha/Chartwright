/**
 * Chartwright Worker entry point.
 *   /api/waitlist, /api/v1/waitlist   waitlist sign-ups (always on)
 *   /api/v1/*                         Pro API (only when PRO_ENABLED is "true")
 *   everything else                   website files (index.html, app.html, …)
 *
 * Layers:  routes/  → services/ (business rules)  → storage/ (D1 database, R2 files)
 */
import { Hono } from 'hono';
import { API_PREFIX } from './config.js';
import { HttpError, fail } from './lib/errors.js';
import { rateLimit } from './middleware/rateLimit.js';
import { proGate } from './middleware/proGate.js';
import { handleWaitlist } from './routes/waitlist.js';
import v1 from './routes/v1.js';

const app = new Hono();

app.use('/api/*', rateLimit);

app.post('/api/waitlist', (c) => handleWaitlist(c.req.raw, c.env));
app.post(API_PREFIX + '/waitlist', (c) => handleWaitlist(c.req.raw, c.env));
app.all('/api/waitlist', (c) => fail(c, 405, 'Use POST.'));

app.use(API_PREFIX + '/*', proGate);
app.route(API_PREFIX, v1);

app.all('/api/*', (c) => fail(c, 404, 'Unknown API address.'));
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

app.onError((e, c) => {
  if (e instanceof HttpError) return fail(c, e.status, e.message);
  console.error('Unexpected error', e && e.stack ? e.stack : e);
  return fail(c, 500, 'Something went wrong on our side. Please try again.');
});

export default app;
