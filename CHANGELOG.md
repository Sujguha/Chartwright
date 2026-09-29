# Changelog

All notable changes to Chartwright are listed here. Versions follow [Semantic Versioning](https://semver.org/):
**MAJOR** for changes that break how people use the app, **MINOR** for new features, **PATCH** for fixes.

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
