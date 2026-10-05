# Changelog

All notable changes to Chartwright are listed here. Versions follow [Semantic Versioning](https://semver.org/):
**MAJOR** for changes that break how people use the app, **MINOR** for new features, **PATCH** for fixes.

## [1.13.0] - 2026-10-05

### Added: account emails (Phase 2, step 2). Live on staging; production keeps Pro switched off.
- **Confirm your email address:** after signing up, people get an email with a confirmation link (valid for 24 hours) and see a "Check your inbox" screen with **Send the email again**. Logging in before confirming is refused with a clear message, and a fresh link is sent. The link logs you in.
- **Forgot password?** on the log-in screen: we email a link to choose a new password. The link works for 1 hour and only once, and saving the new password logs you out on all other devices. The answer is the same whether or not the address has an account, so nobody can find out who uses Chartwright.
- **Invitation emails:** inviting someone now emails them the invitation link (the link can still be copied on the Team page). Admins can **Send again**. If the email fails, the invitation is still created.
- **Pending invitations on the home page:** with confirmed email addresses, invitations now appear under "Invitations for you".
- **Signing up again with a known address** gives the same answer as a new sign-up; the owner gets a "You already have an account" email with log-in and reset links.
- **Email sending** goes through one module (`src/lib/mailer.js`), using Cloudflare Email Service (the `EMAIL` binding, staging only for now). Sender `no-reply@chartwright.de`, replies to `privacy@chartwright.de`. Emails are plain, friendly HTML with a text version and load no outside images.
- Resending confirmation emails counts towards the limit of 10 log-in attempts per minute.
- `npm run serve:local` prints emails to the console and lists them at `/__outbox` instead of sending them.
- Draft privacy policy text for accounts and emails in `docs/privacy-draft-pro-accounts.md`, for the Pro launch (step 3).
- Tests: 87 API checks (31 new: emails, confirmation, reset, invitations, failures, rate limits) and 16 browser checks for the email flows.

### Changed
- GitHub workflows now really use `actions/checkout@v5` and `actions/setup-node@v5` (1.10.3 described this, but the files still used v4).
- Added `.gitignore` (`node_modules`, `.wrangler`, `.dev.vars`).

### Note for existing staging accounts
- Accounts created on staging before 1.13.0 are not confirmed yet. Logging in sends a confirmation link; after confirming, everything works as before.

## [1.12.0] - 2026-10-01

### Added: plans per workspace
- **Pro:** one admin builds and shares; everyone else in the workspace is a viewer. Invitations are viewer-only, nobody can be made editor or admin, and the admin can't be demoted. The rules are enforced on the server for every way of adding or changing members.
- **Enterprise:** several admins and editors, as before.
- New workspaces start on Pro (`DEFAULT_PLAN` in `wrangler.jsonc`). A workspace moves to Enterprise with an entry in the new `workspace_plan` table (`migrations/0004_workspace_plan.sql`) until billing exists.
- The Pro pages show each workspace's plan; on Pro, the Team page explains the plan, offers only viewer invitations and shows no role menus.
- The home page describes Pro as "for one person who builds and shares dashboards" and lists team workspaces under Enterprise.
- Tests: 56 API checks (including the Pro rules) and the browser checks for both plans.

## [1.11.0] - 2026-10-01

### Added: Chartwright Pro pages (Phase 2, step 1). Live on staging; production keeps Pro switched off.
- **Pro area at `/pro`:** sign-up and log-in (passwords of at least 10 characters), log-out, and a list of your workspaces with your role in each.
- **Workspaces:** create a workspace (you become its admin); a workspace page lists its shared dashboards with who updated them, size and version, and lets admins and editors delete them.
- **Team page:** members with their roles; admins change roles, remove members, create invitations and copy the invitation link to send. The last admin can't be demoted. A table explains what each role can do.
- **Invitations:** the invited person opens the link, signs up or logs in with the invited email address, and joins. Links expire after 7 days; someone with a different email address can't use them.
- **In the app:** Save now offers **Save to workspace** when you're logged in to Pro, and **Update shared version** for dashboards opened from a workspace. Updates are rejected with a clear message if someone else changed the dashboard in the meantime. Shared dashboards open from the workspace page straight into the app, with a banner showing the workspace, version and your role; viewers can explore but not save to the workspace.
- **While Pro is switched off** (production today), `/pro` shows "coming soon" with a waitlist link, and the app shows no Pro options.
- `tests/server.mjs` runs the real Worker and website locally with a temporary database (`npm run serve:local`), used for browser testing (33 checks covering admins, editors, viewers, outsiders, invitations and edit conflicts).

### Known limitation
- Pending invitations are only listed on a person's home page once their email address is verified, which arrives with emails in step 2. Until then, people join through the invitation link.

## [1.10.3] - 2026-10-01

### Changed
- GitHub workflows use `actions/checkout@v5` and `actions/setup-node@v5`, which run on Node.js 24 (removes GitHub's Node.js 20 deprecation warning).
- Staging is live at chartwright-staging.sujoy-guha2.workers.dev with its own database, storage and secret; Phase 1 (foundation) is complete.

## [1.10.2] - 2026-09-29

### Added
- **Error logs** (Cloudflare Workers Logs) for production and staging, set in `wrangler.jsonc` so deploys keep them on. Only runs of the Worker code (API and waitlist) are logged, not website files.

### Changed
- **Privacy policy:** the "Visitor statistics" section is removed because Cloudflare Web Analytics isn't switched on; a short "Error logs" paragraph is added under hosting. The home page FAQ is back to its previous wording.

## [1.10.1] - 2026-09-29

### Fixed
- **Deploy failed with "Asset too large":** Cloudflare published the whole repository, including the `node_modules` folder installed during the build. The website files now live in **`public/`**, and only that folder is published (`assets.directory` is `./public`). The `.assetsignore` file is no longer needed.

### Changed
- `npm run deploy` targets production explicitly (`--env=""`), which removes Wrangler's multiple-environments warning.

## [1.10.0] - 2026-09-29

### Phase 1: foundation for scaling
- **Layered backend:** `routes/` (HTTP), `services/` (business rules), `storage/` (D1 database and R2 files), plus `middleware/`, `lib/` and one `config.js` for all limits. The database or file storage can be replaced by changing one layer.
- **Versioned API:** all Pro addresses are under `/api/v1/` (login at `/api/v1/auth/…`, dashboards at `/api/v1/workspaces/:id/dashboards`). The waitlist keeps `/api/waitlist` and is also available at `/api/v1/waitlist`.
- **Dashboard contents in R2:** names, permissions and versions stay in D1, contents move to the R2 bucket `chartwright-blobs`. Dashboards can now be up to 10 MB (D1 rows are limited to 2 MB). Content is written before the database is updated, old versions are cleaned up, and deleting a dashboard deletes its content.
- **Edit conflicts detected:** saving with an outdated version returns a clear "someone else changed this dashboard" message instead of overwriting.
- **Rate limits** with Cloudflare's rate-limit bindings: 10 log-in, sign-up, password-reset or waitlist attempts per minute per visitor, and 300 other API requests per minute.
- **Staging environment** (`chartwright-staging`) with its own database, storage and rate limits, and Pro switched on for testing.
- **Automated tests on GitHub** for every push and pull request (`.github/workflows/test.yml`), and automatic staging deploys from the `staging` branch (`deploy-staging.yml`).
- **Tests:** 46 end-to-end checks, including R2 storage, size limits, version conflicts and rate limits.
- **Database change** `migrations/0003_dashboard_r2.sql` replaces the (empty) dashboard table.

## [1.9.0] - 2026-09-29

### Added: Chartwright Pro backend (switched off until the Pro pages are ready)
- **Accounts:** sign-up and log-in with email and password (minimum 10 characters), secure session cookies, powered by Better Auth running inside the Cloudflare Worker.
- **Workspaces, roles and invitations:** Admin, Editor and Viewer roles; admins invite people and change roles, editors manage dashboards, viewers only read.
- **Shared dashboards API:** list, open, create, update and delete dashboards in a workspace, stored in D1 in the same format as `.chartwright.json` files. Every request checks the user's role on the server; people outside a workspace can't see it exists.
- **Audit log** of dashboard changes, visible to admins.
- **Database migrations** in `migrations/` and an **end-to-end test** (`npm test`, 35 checks) that runs on a temporary local D1 database.
- **On/off switch:** the Pro API only answers when the variable `PRO_ENABLED` is `"true"`. It is `"false"`, so the live site behaves exactly as before.

### Changed
- The Worker code moved from `worker.js` to `src/` (Hono web framework); the waitlist logic is unchanged. `schema.sql` is now `migrations/0000_waitlist.sql`.

## [1.8.3] - 2026-09-29

### Changed
- The privacy policy has a new section **6. Visitor statistics** for Cloudflare Web Analytics (cookie-free, aggregated, no cross-site tracking), and the summary, overview table and service-provider list reflect it. Later sections are renumbered.
- The home page FAQ mentions the anonymous visit statistics.

## [1.8.2] - 2026-09-29

### Changed
- The privacy policy lists **privacy@chartwright.de** as the contact address (forwarded by Cloudflare Email Routing) for questions, data requests and withdrawing waitlist consent.

## [1.8.1] - 2026-09-29

### Added
- **Privacy policy** (`privacy.html`, at `/privacy`): a GDPR-based Datenschutzerklärung covering hosting by Cloudflare, local processing of files in the browser, saved dashboards in browser storage, the waitlist (consent, storage, deletion after at most 24 months), service providers, transfers outside the EU, your rights, and the Bavarian supervisory authority. Contact details are placeholders until the Impressum details are final.
- The waitlist consent checkbox links to the privacy policy.

### Changed
- **The Instrument Sans font is now hosted on chartwright.de** (`fonts/`) instead of Google Fonts, so no visitor data is sent to Google. The font's licence (SIL Open Font License) is included.

## [1.8.0] - 2026-09-29

### Changed
- **Hosting on Cloudflare** (Workers with static assets) at **chartwright.de**, replacing Netlify.
- **Waitlist sign-ups are stored in Cloudflare D1** through a small Worker endpoint (`POST /api/waitlist`) instead of Netlify Forms. It validates the email and consent, ignores spam-bot submissions, accepts only known plans and tools, and updates an existing entry when the same email signs up again.

### Added
- `worker.js` (serves the site and the waitlist endpoint), `wrangler.jsonc` (Cloudflare configuration), `schema.sql` (waitlist table) and `.assetsignore` (keeps these files from being served as web pages).

## [1.7.1] - 2026-09-28

### Changed
- The app's links to the home page and waitlist now point to the new domain, **chartwright.de**.
- Hosting moves from Netlify to Cloudflare Pages. The same `_redirects` file works there.

## [1.7.0] - 2026-09-28

### Added (Pro preview, free during beta)
- **Saved dashboards**: "Save" in the top bar stores the dashboard (data, charts, key figures, filters and name) in the browser. Saved dashboards are listed on the app's start page to reopen or delete. Nothing leaves the device.
- **Dashboard files**: download a `.chartwright.json` file that opens in Chartwright with exactly the same dashboard, a way to share without a server. The file contains the data.
- **Automatic insights**: a panel below the key figures flags overdue items, open blockers and critical items, budget overruns (overall and the largest overrun by area), scope completion and scope growth in sprint-length periods, problem outcomes such as "Rolled back" or missed SLAs, trends between the last two complete months, concentration in one category, unusually high values and missing data. "Show me" applies the matching filter or sorts the table.
- The guide knows about saving, dashboard files and insights.

### Changed
- The home page shows Pro as a preview you can try now, with live connections, the combined cross-tool view, scheduled refresh and weekly emails still marked as coming soon.

## [1.6.1] - 2026-09-28

### Changed
- Home page wording is now general rather than release-specific: "Dashboards from your Excel, Jira and SAP exports." The Pro plan describes "one combined view across all three tools".

## [1.6.0] - 2026-09-28

### Changed
- **The plans page is now the home page** (`index.html`), with Plans and Waitlist links in the top bar.
- **The app moved to `app.html`** (served at `/app` on Netlify). Every "Open Chartwright" button leads there.
- Old `/plans` and `/plans.html` addresses redirect to the home page through a Netlify `_redirects` file, so shared waitlist links keep working.
- The app's start page links back to the home page and waitlist.

## [1.5.0] - 2026-09-28

### Added
- **Plans page** (`plans.html`): Free is available now; Pro (live Jira, Jira Service Management, ServiceNow and SAP Cloud ALM connections) and Enterprise (SAP Solution Manager and S/4HANA) are marked as coming soon.
- **Waitlist form** on the plans page, collecting email, plan and the tools people use, with consent. It uses Netlify Forms, so it needs no server.
- The app's start page links to the plans page and mentions that live connections are coming soon.

## [1.4.0] - 2026-09-28

### Added
- **SAP support** for exports from Fiori ("Export to Spreadsheet") and SAP GUI (spreadsheet, tab-separated text, and classic `|` list exports):
  - Trailing minus signs (`1.234,56-`) and accounting brackets (`(1,234.56)`) are read as negative numbers.
  - SAP list exports: separator lines, report title lines and page-break header rows are removed automatically.
  - About 60 common technical field names are translated, for example `BUDAT` becomes "Posting date (BUDAT)" and `DMBTR` becomes "Amount in local currency (DMBTR)".
  - Numbers with leading zeros (G/L accounts, cost centres, materials) are kept as codes with their zeros.
  - Amounts in document or transaction currency are left out of key figures, because they mix currencies.
- Dashboard suggestions recognise German column names (for example Betrag, Kostenstelle, Sachkonto, Buchungskreis, erstellt, erledigt), and explain SAP's sign convention for credits.
- Sample file `sap-gl-line-items.txt`: 1,751 G/L line items as an SAP GUI list export.

### Changed
- Doughnut charts switch to bar charts when values are negative.
- Account breakdowns with many values use horizontal bars so every label stays readable.
- Default dashboard names keep common acronyms (SAP, GL, KPI, HR, IT and others) in capitals.

## [1.3.0] - 2026-09-28

### Added
- **Suggest a dashboard**: Chartwright recognises the type of data and proposes a complete dashboard with the reasons behind it. A banner appears when a specific type is detected, and the "✨ Suggest a dashboard" button lists all options. Recognised types: Jira and agile ticket data, service and incident data, and finance data, plus a general overview for anything else.
- **Burnup and burndown charts**: burnup compares cumulative scope with completed work; burndown shows open work against an ideal line. Available in "Add a chart" and suggested automatically for ticket data with created and resolved dates. Filtering by sprint turns the burndown into a sprint burndown.
- **Days to resolve**: a calculated column added automatically when a file has created and resolved (or closed) dates.
- Jira date formats such as `12/Aug/26 9:15 AM`, and German date-times such as `23.07.2026 14:30`.
- The guide can suggest and apply dashboards, and add burnup and burndown charts.
- Sample file `jira-issues-export.csv`: 345 issues across 8 sprints in Jira's CSV export format.

### Changed
- Sprints, iterations, phases and versions are shown in their natural order (Sprint 1, 2, 3 …) instead of by size.

## [1.2.1] - 2026-09-25

### Changed
- A visible "Rename" button next to the dashboard name makes renaming easy to find.
- Key-figure tiles show their ✎ pencil all the time, and clicking anywhere on a tile opens its editor.

### Fixed
- Typing straight after clicking the dashboard name no longer loses the first letters.

## [1.2.0] - 2026-09-25

### Added
- Editable dashboard name: click the name in the top bar to rename it. The name is used in the browser tab, PDF and HTML reports, email subject and body, and file names of downloads. The source file name is shown underneath.
- Editable key figures: hover a tile and click ✎ to change what it shows (a number column with Total, Average, Minimum or Maximum; a count of different values; a date range; or the number of rows), give it your own label, or remove it. "+ Add key figure" adds a tile (up to 6), and "Reset all to suggested" restores the defaults.

### Fixed
- Long date ranges in the key figures wrap onto two lines instead of being cut off.

## [1.1.0] - 2026-09-25

### Added
- Clicking the logo in the top bar returns to the start page.
- The start page then shows a "Back to your dashboard" card, so the open dashboard, its filters and charts are kept and nothing is lost by accident. Loading a new file replaces it.

## [1.0.0] - 2026-09-25

First stable release.

### Fixed
- Charts redraw instantly when a filter changes, instead of occasionally staying blank.
- A chart that can't be drawn now shows a message rather than an empty card, and the other charts still appear.

### Added
- Version number shown on the start page, in the top bar, and in PDF and HTML reports.

## [0.6.0] - 2026-09-25

### Added
- Large sample files: 12,000 releases with linked incidents, and 15,000 finance ledger postings with a budget vs actual sheet.

### Changed
- IDs and account codes (document numbers, GL accounts, cost-centre codes) are treated as labels, not added up.
- Key figures favour money columns and skip exchange rates and local-currency totals; rates and percentages show averages.
- Suggested charts favour meaningful columns such as status, type and category.
- Monthly and quarterly periods (for example 2025-03 or Q1 2025) are shown as a timeline in order.

## [0.5.0] - 2026-09-24

### Added
- Guide: an AI assistant (inside Claude only) that answers questions with exact figures, explains the app, and can apply filters, add or remove charts, and open the Download or Email panels.

## [0.4.0] - 2026-09-23

### Added
- New file formats: .xlsb, .ods, .tsv, .txt, .json, .jsonl and .ndjson.
- Automatic separator and encoding detection for text files, including German semicolon exports.
- Nested JSON (for example Jira or ServiceNow API exports) is flattened into columns.
- Sample files in every supported format.

### Changed
- Renamed the app from Sheetboard to Chartwright.

## [0.3.0] - 2026-09-23

### Added
- PDF report with key figures, charts and data, for download and as an email attachment.
- "Open in my email app" copies a formatted dashboard with charts to paste into the email.

## [0.2.0] - 2026-09-23

### Added
- Download menu: HTML report, filtered data as Excel or CSV, and print.
- Email: send with Gmail or save as a Gmail draft (inside Claude), or open in the user's own email app.

## [0.1.0] - 2026-09-23

### Added
- First version: upload an Excel or CSV file and get key figures, suggested charts, filters, a chart builder and a searchable data table.
