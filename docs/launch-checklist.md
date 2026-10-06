# Chartwright Pro: production launch checklist

Pro is switched on in production by changing `PRO_ENABLED` to `"true"` in the top (production) part of `wrangler.jsonc`.
`npm test` fails if that happens while any `[placeholder]` is left in the legal pages.

Files in `docs/` are not published on the website (only `public/` is).

## Before the launch (Sujoy)

1. **Impressum** (`public/impressum.html`): street and number, postcode, phone number, VAT ID (or remove that section if there is none).
2. **Privacy policy** (`public/privacy.html`, section 1): street and number, postcode.
3. **Legal check:** have `public/terms.html` and `public/privacy.html` reviewed (for example by a lawyer or a German IT-law service). Points worth asking about:
   - liability limited to intent and gross negligence while Pro is free (§§ 521, 599 BGB),
   - Pro is meant for professional use; consumers keep their statutory rights,
   - a **data processing agreement (Art. 28 GDPR)** template for customers who store other people's personal data in shared dashboards (the terms say "email us"),
   - whether a withdrawal notice (Widerrufsbelehrung) is needed once paid plans exist (not while Pro is free).
4. **Cloudflare:** chartwright.de is a sending domain in Email Service (the same domain serves staging and production). The production Worker has the secret `BETTER_AUTH_SECRET`.
5. **Staging test passed:** sign-up from the waitlist, confirmation email, invitation email, forgot password, delete workspace, delete account.

## Launch (Claude, after approval)

1. Fill in the placeholders you send (or you edit the pages directly).
2. Home page (`public/index.html`): Pro card "Available now, free during beta" with **Create account** and **Log in** links to `/pro`; update the FAQ "When will Pro be available?" and "Does my data leave my browser?" (shared dashboards are stored on our servers).
3. `PRO_ENABLED: "true"` for production; bump the version; changelog.
4. Pull request to `main`; production deploys from `main` through Cloudflare Workers Builds.
5. No database migration is needed (production already has 0000–0004).

## After the launch

- Tell the waitlist members that Pro is open (`SIGNUP_MODE` is already `"open"`).
- Pricing: 7 days free, then €29 per month, once billing exists (Phase 4). Update the terms (price, trial, cancellation, withdrawal right) at the same time.
