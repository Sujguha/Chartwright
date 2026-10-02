/**
 * Login, sessions, workspaces (organizations), roles and invitations, powered by Better Auth.
 * Roles: admin (everything), editor (dashboards), viewer (read only).
 */
import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/organization/access';
import { APIError } from 'better-auth/api';
import { API_PREFIX, PLANS, DEFAULT_PLAN } from '../config.js';
import { createDb } from '../storage/db.js';

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

/** The plan of a workspace (falls back to DEFAULT_PLAN). */
export async function planFor(env, workspaceId) {
  const stored = await createDb(env.DB).workspacePlan(workspaceId);
  const plan = stored || env.DEFAULT_PLAN || DEFAULT_PLAN;
  return PLANS[plan] ? plan : DEFAULT_PLAN;
}

const proOnly = (what) => new APIError('FORBIDDEN', {
  message: `On the Pro plan, ${what}. Several admins and editors are part of Enterprise.`,
  code: 'PLAN_LIMIT',
});

export function createAuth(env, { sendInvitationEmail } = {}) {
  const base = env.BASE_URL || 'https://chartwright.de';
  const db = createDb(env.DB);
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
        // Plan rules, enforced on the server for every way of adding or changing members
        organizationHooks: {
          async beforeCreateInvitation({ invitation, organization }) {
            const plan = PLANS[await planFor(env, organization.id)];
            if (!plan.roles.includes(invitation.role)) throw proOnly('you can invite colleagues as viewers');
          },
          async beforeUpdateMemberRole({ member, newRole, organization }) {
            const plan = PLANS[await planFor(env, organization.id)];
            if (plan.maxAdmins === 1 && (newRole !== 'viewer' || member.role === 'admin')) throw proOnly('the workspace has one admin and everyone else is a viewer');
          },
          async beforeAddMember({ member, organization }) {
            const plan = PLANS[await planFor(env, organization.id)];
            if (plan.maxAdmins === 1 && member.role !== 'viewer') {
              const admins = await db.countRole(organization.id, 'admin');
              if (member.role !== 'admin' || admins >= 1) throw proOnly('new members join as viewers');
            }
          },
        },
      }),
    ],
  });
}
