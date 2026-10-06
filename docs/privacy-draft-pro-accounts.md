# Draft: privacy policy text for Chartwright Pro accounts and emails

**Status:** draft, not published. Add this to `public/privacy.html` in Phase 2, step 3, **before** `PRO_ENABLED` is set to `"true"` in production. Have it checked (ideally by a lawyer or a data protection service) before it goes live.

Files in `docs/` are not published on the website (only `public/` is).

---

## New section (after "6. Waitlist"): Chartwright Pro accounts

**What we process:** if you create a Chartwright Pro account, we store your name, your email address, a securely hashed version of your password (we never see the password itself), whether you have confirmed your email address, and the time of sign-up. While you are logged in, we store your sessions (with your IP address and browser details, to protect your account) and the workspaces you belong to, with your role. Dashboards you save to a workspace are stored with the workspace, together with who changed them and when (audit log).

**Session cookie:** when you log in, we set one cookie that keeps you logged in for up to 14 days. It is strictly necessary for the service you asked for, so no consent is needed (§ 25(2) no. 2 TDDDG). It is not used for tracking.

**Account emails:** we send you emails that are necessary for your account: a link to confirm your email address, a link to reset your password when you ask for it, an invitation when a workspace admin invites you, and a notice if someone tries to create an account with your address again. We do not send newsletters or advertising. Invitations are sent at the request of the workspace admin who entered your email address.

**Legal basis:** performance of the contract for your account (Art. 6(1)(b) GDPR). For invitations to people who don't have an account yet, our and the inviting admin's legitimate interest in letting teams share dashboards (Art. 6(1)(f) GDPR).

**Storage:** in databases and file storage operated by Cloudflare (Cloudflare D1 and R2) as our processor. Confirmation links expire after 24 hours, password reset links after 1 hour, invitations after 7 days. We delete your account data when you delete your account or ask us to, unless we must keep it longer by law.

## Changes to existing sections

- **2. Overview:** add a row "Pro account (name, email, password hash, sessions, workspaces) | Providing your account | Art. 6(1)(b) GDPR | Until you delete your account".
- **3. Hosting:** the error-log paragraph also covers log-in, account and workspace requests.
- **8. Service providers:** change the Cloudflare line to: "website hosting, security, program libraries (cdnjs), error logs, the waitlist and account databases, file storage for shared dashboards (R2), and sending account emails (Cloudflare Email Service)".
- **Summary at the top:** add "If you use Chartwright Pro, we store your account and send you the emails your account needs."
