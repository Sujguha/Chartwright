# Chartwright: project guide for Claude Code

Chartwright turns spreadsheet and data exports (Excel, CSV, JSON, Jira, SAP) into interactive dashboards in the browser. The free app runs entirely client-side. **Chartwright Pro** adds accounts, workspaces and shared dashboards on Cloudflare.

- Live site: https://chartwright.de (production)
- Staging: https://chartwright-staging.sujoy-guha2.workers.dev (Pro switched on)
- Repository: github.com/Sujguha/Chartwright
- Owner: Sujoy (Munich). Product owner, not a full-time developer: explain changes in plain language, give step-by-step instructions for anything he must do in Cloudflare or GitHub, and ask before changing production.

## Current version

**1.13.0** (see `CHANGELOG.md`). The version appears in `public/app.html` (`APP_VERSION` constant and the `version` meta tag), `package.json`, `README.md` and `CHANGELOG.md`. Bump all four together for every release.

## Architecture (all on Cloudflare)

| Part | Technology | Notes |
|---|---|---|
| Website and free app | Static files in `public/`, served as Worker static assets | Only `public/` is published (`assets.directory` is `./public`) |
| API | Cloudflare Worker, Hono, `src/` | Versioned under `/api/v1` |
| Login, workspaces, roles, invitations | Better Auth (organization plugin) inside the Worker | Base path `/api/v1/auth` |
| Small data | Cloudflare D1 | Users, sessions, workspaces, members, invitations, dashboard metadata, audit log, plans, waitlist |
| Dashboard contents | Cloudflare R2 | Up to 10 MB per dashboard; D1 rows are limited to 2 MB |
| Account emails | Cloudflare Email Service, `EMAIL` (send_email) binding, staging only so far | All sending goes through `src/lib/mailer.js`; texts in `src/services/emails.js`. Needs Workers Paid ($5/month, 3,000 emails included) |
| Rate limits | Worker rate-limit bindings | `AUTH_LIMITER` 10/min, `API_LIMITER` 300/min per visitor |
| Error logs | Workers Logs (`observability` in `wrangler.jsonc`) | Only Worker runs are logged, not static files |

Layers (keep them separate):
```
src/
  index.js        entry: rate limits → waitlist → Pro switch → /api/v1 → static files
  config.js       all limits, role rights and plans (change limits here)
  routes/         HTTP only (v1.js, waitlist.js)
  services/       business rules (access.js, dashboards.js, audit.js, emails.js)
  storage/        data access: db.js (all SQL), blobs.js (R2)
  middleware/     rateLimit.js, proGate.js
  lib/            auth.js (Better Auth setup, plan hooks, email settings), mailer.js (sends email), errors.js
migrations/       numbered SQL files 0000–0004, applied in order
public/           index.html (home/plans/waitlist), app.html (free app), pro/index.html (Pro area), privacy.html, fonts/, samples/, _redirects
tests/            e2e.mjs (API test, `npm test`), server.mjs (local server, `npm run serve:local`; emails listed at /__outbox)
docs/             notes that are not published (for example the privacy policy draft for the Pro launch)
.github/workflows test.yml (tests on every push), deploy-staging.yml (deploys the staging branch)
```

## Environments

| | Production | Staging |
|---|---|---|
| Worker | `chartwright` | `chartwright-staging` |
| Address | chartwright.de | chartwright-staging.sujoy-guha2.workers.dev |
| D1 database | `chartwright-waitlist` (b5cdacbd-0370-443b-8849-0d5213b8f67a) | `chartwright-staging` (48dd77bf-dec5-4b74-8320-a8e7e01f71d9) |
| R2 bucket | `chartwright-blobs` | `chartwright-blobs-staging` |
| `PRO_ENABLED` | `"false"` | `"true"` |
| Deploys | Cloudflare Workers Builds from `main` | GitHub Actions from the `staging` branch (runs tests, applies D1 migrations, deploys) |
| Secret | `BETTER_AUTH_SECRET` (set in Cloudflare, never in code) | Its own `BETTER_AUTH_SECRET` |

Workflow: change on `main` → pull request **main → staging** → test on staging → production deploys from `main` (Pro stays off there until released). Never merge staging into main.

Database migrations: staging gets them automatically (`wrangler d1 migrations apply`). **Production migrations have been applied by hand in the D1 Console** (0000–0004), so do not run `wrangler d1 migrations apply` against production without first recording the applied ones in `d1_migrations`.

## Product rules

- **Free:** everything in the browser; files are never uploaded.
- **Pro preview features in the free app:** saved dashboards (IndexedDB), `.chartwright.json` dashboard files, automatic insights.
- **Pro plan (per workspace, the default):** exactly one admin who builds and shares; everyone else is a viewer. Enforced on the server in Better Auth `organizationHooks` (`src/lib/auth.js`).
- **Enterprise plan:** several admins and editors. Set via the `workspace_plan` table until billing exists.
- Roles: admin (everything), editor (dashboards), viewer (read only). Outsiders get 404 so workspaces stay private.
- Shared dashboards use the same JSON format as `.chartwright.json` files; edits carry a `version` and stale saves return 409.

## Conventions

- Keep the design system: Instrument Sans (self-hosted in `public/fonts/`, never Google Fonts), colour tokens teal `#0E6B6B`, indigo `#3D4FB0`, amber `#C98A12`, plum `#8B3F76`, ink `#18202C`, light and dark mode. Logo: "Rising tiles" (four rounded tiles in those colours).
- User-facing text: plain, friendly English; no jargon in UI messages.
- No secrets in the repository. No external requests from pages except cdnjs.cloudflare.com (app libraries), which the privacy policy discloses.
- **Keep `public/privacy.html` accurate**: any new data processing (accounts, cookies, emails, analytics, new providers) must be added there before it goes live in production.
- Run `npm test` before every commit; add tests for every new rule (the suite has 87 checks).
- Update `CHANGELOG.md` for every change.

## Status (where we left off)

Done: Phase 1 (layered backend, R2, staging, CI tests, rate limits, error logs), Phase 2 step 1 (Pro pages at `/pro`, Save to workspace in the app, Team page, invitations, Pro/Enterprise plan rules) and Phase 2 step 2 in code (1.13.0: email confirmation required before log-in, "Forgot password?", invitation emails, pending invitations on the home page; Cloudflare Email Service chosen). Pull request #2 is closed; 1.12.0 and 1.13.0 are on `main`; `.gitignore` added.

Being completed by Sujoy (check with him; may already be done):
1. Close pull request #3 without merging (staging → main again, by mistake).
2. Merge main → staging (staging was still on 1.11.0 on 2026-10-05); confirm staging's `BETTER_AUTH_SECRET`.
3. Cloudflare: switch to Workers Paid if needed; Email Service → add `chartwright.de` as a sending domain (DNS records added by Cloudflare).
4. Test the Pro flow and all emails on staging (sign-up → confirm, forgot password, invitation email → join).
5. Cloudflare production Worker: build only `main`, switch off non-production branch builds; deploy command `npx wrangler deploy --env=""`.
6. Unlink Netlify from the repository (the old Netlify site is kept private as a backup).

Small open items:
- Disable the production `workers.dev` address (keep staging's).
- Disable GitHub Pages for the repository (it still built on 2026-10-05).
- Address placeholders (street, postcode) in `public/privacy.html`; Impressum page (`/impressum`) waits for tax details from the Finanzamt.

## Next work

**Phase 2, step 3: launch Pro in production**
- Put the privacy text from `docs/privacy-draft-pro-accounts.md` into `public/privacy.html` (accounts, session cookie, emails, Cloudflare Email Service); add terms of service.
- Add the `send_email` binding and `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO` to the production part of `wrangler.jsonc` (copy from staging).
- Then set `PRO_ENABLED` to `"true"` in production.
- Nice to have: delete account (GDPR), change email address.

**Gotchas**
- Pro accounts must confirm their email before logging in (`requireEmailVerification`). Accounts created on staging before 1.13.0 get a confirmation link when they next log in.
- Without the `EMAIL` binding, sending fails with a clear message (sign-up still completes; invitations are still created and their link can be copied).
- The local auth rate limit (10 per minute per visitor) also applies in `npm run serve:local`; long browser tests need a pause.

**Later phases**
- Phase 3: Jira Cloud connector (OAuth, background sync via Queues/Cron, release linking, readiness dashboard). Connectors as plug-ins with one interface.
- Phase 4: billing (Stripe or Lemon Squeezy), trials, admin usage page.
- Phase 5: ServiceNow, then SAP Cloud ALM.

## Useful commands

```
npm install
npm test                 # API end-to-end test on a temporary local D1 + R2
npm run serve:local      # site + Worker at http://localhost:8899 with a temporary database
npx wrangler deploy --dry-run --env=""          # check the production build
npx wrangler deploy --dry-run --env staging     # check the staging build
```

Move a workspace to Enterprise (D1 Console):
```sql
INSERT OR REPLACE INTO workspace_plan (workspace_id, plan, updated_at)
VALUES ('<workspace id>', 'enterprise', datetime('now'));
```
