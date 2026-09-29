/**
 * Login, sessions, workspaces (organizations), roles and invitations, powered by Better Auth.
 * Roles: admin (everything), editor (dashboards), viewer (read only).
 */
import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/organization/access';
import { API_PREFIX } from '../config.js';

export const statements = { ...defaultStatements, dashboard: ['create', 'read', 'update', 'delete'] };
export const ac = createAccessControl(statements);
export const roles = {
  admin: ac.newRole({
    organization: ['update', 'delete'], member: ['create', 'update', 'delete'], invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'], ac: ['create', 'read', 'update', 'delete'], dashboard: ['create', 'read', 'update', 'delete'],
  }),
  editor: ac.newRole({ dashboard: ['create', 'read', 'update', 'delete'] }),
  viewer: ac.newRole({ dashboard: ['read'] }),
};

export function createAuth(env, { sendInvitationEmail } = {}) {
  const base = env.BASE_URL || 'https://chartwright.de';
  return betterAuth({
    appName: 'Chartwright',
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: base,
    basePath: API_PREFIX + '/auth',
    trustedOrigins: [base],
    emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
    // Rate limiting is done by Cloudflare's rate-limit binding (see middleware/rateLimit.js), which works across all servers.
    rateLimit: { enabled: false },
    advanced: { defaultCookieAttributes: { sameSite: 'lax', secure: true, httpOnly: true } },
    plugins: [
      organization({
        ac, roles, creatorRole: 'admin', allowUserToCreateOrganization: true, invitationExpiresIn: 60 * 60 * 24 * 7,
        async sendInvitationEmail(data) { if (sendInvitationEmail) await sendInvitationEmail(data); },
      }),
    ],
  });
}
