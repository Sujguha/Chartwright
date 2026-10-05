/**
 * Sends one email. All emails go through this module, so the email provider can be swapped here alone.
 *
 * Today: Cloudflare Email Service through the Worker's "send_email" binding (env.EMAIL).
 * Tests and the local server pass their own env.EMAIL that only records messages, so nothing is really sent.
 * Settings (wrangler.jsonc): EMAIL_FROM, EMAIL_FROM_NAME, EMAIL_REPLY_TO.
 */
import { HttpError } from './errors.js';

export async function sendEmail(env, { to, subject, html, text }) {
  if (!env.EMAIL || typeof env.EMAIL.send !== 'function') {
    console.error('Email is not set up: the EMAIL binding is missing.');
    throw new HttpError(503, 'Emails can’t be sent right now. Please try again later.');
  }
  const from = env.EMAIL_FROM || 'no-reply@chartwright.de';
  try {
    await env.EMAIL.send({
      from: { name: env.EMAIL_FROM_NAME || 'Chartwright', email: from },
      to,
      replyTo: env.EMAIL_REPLY_TO || undefined,
      subject,
      html,
      text,
    });
  } catch (e) {
    console.error('Email could not be sent', subject, e && e.message ? e.message : e);
    throw new HttpError(502, 'The email couldn’t be sent. Please try again in a few minutes.');
  }
}
