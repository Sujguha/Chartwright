/**
 * The account emails Chartwright sends: confirm your email, reset your password, workspace invitation,
 * and "you already have an account". Each has an HTML and a plain-text version, and loads no outside images.
 */
import { sendEmail } from '../lib/mailer.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Links point straight to the Pro pages; tokens sit after "#", so they are never sent to a server in a page request. */
export const links = {
  verify: (base, token) => `${base}/pro/#/verify/${encodeURIComponent(token)}`,
  reset: (base, token) => `${base}/pro/#/reset/${encodeURIComponent(token)}`,
  invite: (base, id) => `${base}/pro/#/invite/${encodeURIComponent(id)}`,
  login: (base) => `${base}/pro/#/login`,
  forgot: (base) => `${base}/pro/#/forgot`,
};

const TILES = ['#0E6B6B', '#3D4FB0', '#C98A12', '#8B3F76'];

function layout({ heading, paragraphs, button, after }) {
  const tiles = '<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;vertical-align:middle"><tr>'
    + TILES.slice(0, 2).map((c) => `<td style="width:8px;height:8px;background:${c};border-radius:2px;font-size:0;line-height:0">&nbsp;</td><td style="width:2px;font-size:0">&nbsp;</td>`).join('')
    + '</tr><tr><td colspan="4" style="height:2px;font-size:0;line-height:0">&nbsp;</td></tr><tr>'
    + TILES.slice(2).map((c) => `<td style="width:8px;height:8px;background:${c};border-radius:2px;font-size:0;line-height:0">&nbsp;</td><td style="width:2px;font-size:0">&nbsp;</td>`).join('')
    + '</tr></table>';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#EDF0F3;color:#18202C;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDF0F3"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 4px 16px;font-weight:700;font-size:18px;color:#18202C">${tiles}&nbsp;&nbsp;Chartwright</td></tr>
<tr><td style="background:#FFFFFF;border:1px solid #D3DAE3;border-radius:16px;padding:28px 28px 24px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#18202C">${esc(heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join('\n')}
${button ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#0E6B6B;color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${esc(button.label)}</a></p>
<p style="margin:0 0 14px;font-size:13px;color:#556274">If the button doesn’t work, copy this link into your browser:<br><a href="${esc(button.url)}" style="color:#0B5454;word-break:break-all">${esc(button.url)}</a></p>` : ''}
${(after || []).map((p) => `<p style="margin:0 0 10px;font-size:14px;color:#556274">${p}</p>`).join('\n')}
</td></tr>
<tr><td style="padding:16px 4px 0;font-size:12px;color:#556274">Chartwright · chartwright.de · You’re receiving this email because of your Chartwright account.</td></tr>
</table></td></tr></table></body></html>`;
}

function plain({ heading, lines, button, after }) {
  return [heading, '', ...lines, ...(button ? ['', button.label + ':', button.url] : []), ...(after ? ['', ...after] : []), '', '— Chartwright, chartwright.de'].join('\n');
}

/** Builds a message. The HTML and text versions share the same wording. */
function message({ subject, heading, paragraphs, button, after }) {
  const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return {
    subject,
    html: layout({ heading, paragraphs, button, after }),
    text: plain({ heading, lines: paragraphs.map(stripTags), button, after: after && after.map(stripTags) }),
  };
}

export const templates = {
  verify: ({ name, url }) => message({
    subject: 'Confirm your email address for Chartwright',
    heading: 'Confirm your email address',
    paragraphs: [`Hi ${esc(name || 'there')},`, 'Thanks for creating a Chartwright account. Please confirm that this is your email address, so you can log in and share dashboards.'],
    button: { label: 'Confirm email address', url },
    after: ['This link works for 24 hours.', 'If you didn’t create an account, you can ignore this email.'],
  }),
  reset: ({ name, url }) => message({
    subject: 'Reset your Chartwright password',
    heading: 'Reset your password',
    paragraphs: [`Hi ${esc(name || 'there')},`, 'Someone asked to reset the password for your Chartwright account. To choose a new password, use the button below.'],
    button: { label: 'Choose a new password', url },
    after: ['This link works for 1 hour and only once. After the reset, you’ll be logged out on all other devices.', 'If you didn’t ask for this, you can ignore this email. Your password stays the same.'],
  }),
  invite: ({ inviter, workspace, role, url }) => message({
    subject: `${inviter} invited you to ${workspace} on Chartwright`,
    heading: `Join ${workspace} on Chartwright`,
    paragraphs: [`${esc(inviter)} invited you to the workspace <strong>${esc(workspace)}</strong> as ${esc(role)}. In the workspace, you can open the team’s shared dashboards.`, 'To join, open the invitation and log in or create an account with this email address.'],
    button: { label: 'Open invitation', url },
    after: ['This invitation expires in 7 days.', 'If you weren’t expecting it, you can ignore this email.'],
  }),
  existing: ({ name, loginUrl, forgotUrl }) => message({
    subject: 'You already have a Chartwright account',
    heading: 'You already have an account',
    paragraphs: [`Hi ${esc(name || 'there')},`, 'Someone tried to create a Chartwright account with this email address, but you already have one.'],
    button: { label: 'Log in', url: loginUrl },
    after: [`Forgot your password? <a href="${esc(forgotUrl)}" style="color:#0B5454">Reset it here</a>.`, 'If this wasn’t you, you can ignore this email. Nothing has changed.'],
  }),
};

const ROLE_WORD = { admin: 'an admin', editor: 'an editor', viewer: 'a viewer' };

/** Sending functions used by the login setup (lib/auth.js). */
export function accountEmails(env) {
  const base = env.BASE_URL || 'https://chartwright.de';
  return {
    verify: (user, token) => sendEmail(env, { to: user.email, ...templates.verify({ name: user.name, url: links.verify(base, token) }) }),
    reset: (user, token) => sendEmail(env, { to: user.email, ...templates.reset({ name: user.name, url: links.reset(base, token) }) }),
    invite: ({ email, inviter, workspace, role, id }) => sendEmail(env, { to: email, ...templates.invite({ inviter, workspace, role: ROLE_WORD[role] || role, url: links.invite(base, id) }) }),
    existing: (user) => sendEmail(env, { to: user.email, ...templates.existing({ name: user.name, loginUrl: links.login(base), forgotUrl: links.forgot(base) }) }),
  };
}
