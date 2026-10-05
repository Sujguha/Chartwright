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
import { accountEmails } from '../services/emails.js';

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

/** Sends an email inside Better Auth; a failure becomes a clear message instead of a server error. */
async function deliver(send) {
  try { await send(); } catch (e) {
    throw new APIError(e && e.status === 503 ? 'SERVICE_UNAVAILABLE' : 'BAD_GATEWAY', { message: (e && e.message) || 'The email couldn’t be sent.', code: 'EMAIL_FAILED' });
  }
}

export function createAuth(env) {
  const base = env.BASE_URL || 'https://chartwright.de';
  const db = createDb(env.DB);
  const emails = accountEmails(env);
  return betterAuth({
    appName: 'Chartwright',
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: base,
    basePath: API_PREFIX + '/auth',
    trustedOrigins: [base],
    emailAndPassword: {
      enabled: true, minPasswordLength: 10, maxPasswordLength: 128,
      // People confirm their email address before they can log in.
      requireEmailVerification: true,
      // Password reset: the link works for 1 hour and once; afterwards all other sessions are logged out.
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      // A failed send is only logged: an error here would reveal that the address has an account.
      async sendResetPassword({ user, token }) { await emails.reset(user, token).catch((e) => console.error('Password reset email failed', e && e.message)); },
      // Signing up again with a known address gives the same answer as a new sign-up (so nobody learns who has an account),
      // and the owner gets a "you already have an account" email instead.
      async onExistingUserSignUp({ user }) { await emails.existing(user).catch((e) => console.error('Existing-account email failed', e && e.message)); },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,              // logging in before confirming sends a fresh link
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      async sendVerificationEmail({ user, token }) { await deliver(() => emails.verify(user, token)); },
    },
    session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
    // Rate limiting is done by Cloudflare's rate-limit binding (see middleware/rateLimit.js), which works across all servers.
    rateLimit: { enabled: false },
    advanced: { defaultCookieAttributes: { sameSite: 'lax', secure: true, httpOnly: true } },
    plugins: [
      organization({
        ac, roles, creatorRole: 'admin', allowUserToCreateOrganization: true, invitationExpiresIn: 60 * 60 * 24 * 7,
        // Invitations can only be opened by someone who confirmed the invited email address;
        // this also lists pending invitations on the invitee's home page.
        requireEmailVerificationOnInvitation: true,
        // If the email fails, the invitation still exists and the admin can copy its link on the Team page.
        async sendInvitationEmail({ id, role, email, organization, inviter }) {
          await emails.invite({ id, role, email, workspace: organization.name, inviter: (inviter.user && (inviter.user.name || inviter.user.email)) || 'A colleague' })
            .catch((e) => console.error('Invitation email failed', e && e.message));
        },
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
