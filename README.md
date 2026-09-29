# Chartwright

**Version 1.10.0** · [Changelog](CHANGELOG.md)

**Drop a spreadsheet. Get a dashboard.**

Chartwright turns an Excel, CSV or JSON file into an interactive dashboard in seconds. It reads your columns, works out which are dates, numbers and categories, and builds key figures and charts automatically. You can then filter, add your own charts, and share the result as a PDF, a data file or an email.

Everything runs in the browser. Your file is never uploaded to a server.

## Features

- **Automatic dashboards**: key-figure tiles, a trend line over time, and breakdown charts chosen from your column types.
- **Dashboard suggestions**: recognises Jira/agile, incident and finance data and proposes a complete dashboard, including **burnup and burndown** charts for ticket data.
- **Your own title and key figures**: rename the dashboard and choose what each key-figure tile shows.
- **Filters**: narrow the whole dashboard by any category column.
- **Chart builder**: bar, horizontal bar, line and doughnut charts, showing a count, total, average, minimum or maximum.
- **Data table**: searchable and sortable.
- **Downloads**: a PDF report (key figures, charts and data), an HTML report, and the filtered data as Excel or CSV.
- **Email**: opens a new email in your mail app with the recipients and subject filled in, and copies a formatted version of the dashboard (with charts) to paste into it.
- **German formats**: understands numbers such as `1.234,5` and dates such as `23.07.2026`.
- **Light and dark mode**: follows your system setting.
- **Pro preview (free during beta)**: save dashboards in the browser, share them as `.chartwright.json` dashboard files, and get automatic insights such as overdue items, blockers, budget overruns and unusual values.
- **Guide (inside Claude only)**: an AI assistant that answers questions about the data with exact figures, explains how to use the app, and can apply filters, add or remove charts, and open the Download or Email panel on request.

## Supported file formats

| Format | Extensions | Notes |
|---|---|---|
| Excel | `.xlsx` `.xlsm` `.xls` `.xlsb` | All sheets are available; the first sheet with data opens by default. |
| OpenDocument | `.ods` | LibreOffice and OpenOffice spreadsheets. |
| Delimited text | `.csv` `.tsv` `.txt` | The separator (comma, semicolon, tab or pipe) is detected automatically. UTF-8 and Windows-1252 encodings are both supported. |
| SAP exports | `.xlsx` `.txt` | Fiori "Export to Spreadsheet" and SAP GUI exports, including `|` list exports. Handles trailing minus signs (`1.234,56-`), German formats, leading zeros, and translates common technical field names such as `BUDAT` and `DMBTR`. |
| JSON | `.json` `.jsonl` `.ndjson` | Finds the list of records anywhere in the file (for example a Jira or ServiceNow API export) and flattens nested fields into columns. |

Power BI files (`.pbix`) can't be read directly. Export the data from Power BI to Excel or CSV first.

### Getting the best results

- Put one header row at the top and one record per row.
- Keep one kind of value per column (for example, no "N/A" in a number column).
- Remove totals and subtotal rows, since they are counted as data.
- Avoid merged cells and cross-tab layouts (for example, months across the columns).

## Try it

Open the app and select **Try it with sample release data**, or upload one of the files in [`samples/`](samples/). The small samples hold the same 180 fictional release records in different formats; the large ones are for testing performance. All data is fictional:

| File | What it shows |
|---|---|
| `sap-gl-line-items.txt` | 1,751 G/L line items as an SAP GUI list export, with technical field names and trailing minus signs |
| `jira-issues-export.csv` | 345 Jira issues across 8 sprints in Jira's CSV export format, for burnup and burndown |
| `release-data.csv` | Standard comma-separated file |
| `release-data.json` | Simple JSON: a list of records with one field per column |
| `release-data-api-style.json` | Nested JSON shaped like a Jira-style API export, to show automatic flattening |
| `release-data.tsv` | Tab-separated file |
| `release-data-semicolon.txt` | German-style export: semicolons, `dd.mm.yyyy` dates, umlauts, Windows-1252 encoding |
| `release-data.xlsx`, `.xlsb`, `.ods` | Spreadsheet formats |
| `release-data-large.xlsx` | 12,000 releases and 2,700 linked incidents across 25 columns, for load testing |
| `finance-ledger-large.xlsx` | 15,000 general-ledger postings in 5 currencies, plus a monthly budget vs actual sheet |

## Plans and waitlist

The home page (`index.html`) shows the Free plan (available now), the Pro preview and the upcoming Enterprise plan, with a waitlist form. The app itself is `app.html`.

Waitlist sign-ups are sent to `POST /api/waitlist`, handled by the Worker in `src/` and stored in a Cloudflare **D1** database.

## Hosting on Cloudflare

The site runs as a **Cloudflare Worker with static assets**, deployed automatically from this repository.

| File | Purpose |
|---|---|
| `wrangler.jsonc` | Cloudflare configuration: website files, the Worker and the D1 database binding |
| `src/` | The Worker: website, waitlist and Pro API (`index.js`), login and roles (`auth.js`), waitlist (`waitlist.js`) |
| `migrations/` | Database tables for the waitlist, login and workspaces, and shared dashboards |
| `tests/e2e.mjs` | End-to-end test (`npm test`) |
| `package.json` | Dependencies (Better Auth, Hono, Wrangler) |
| `.assetsignore` | Keeps configuration and documentation files from being served publicly |
| `_redirects` | Sends old `/plans` links to the home page |
| `privacy.html` | Privacy policy (Datenschutzerklärung), at `/privacy` |
| `fonts/` | The Instrument Sans font, self-hosted so no data goes to Google |

### One-time setup

1. **Create the database.** In the Cloudflare dashboard, go to **Storage & databases → D1 SQL database → Create**. Name it `chartwright-waitlist`. If a data location or jurisdiction option is offered, choose the EU.
2. **Create the table.** Open the database's **Console**, paste the contents of `migrations/0000_waitlist.sql` and run it.
3. **Connect it.** Copy the database's **Database ID** and paste it into `wrangler.jsonc` in place of `PASTE-YOUR-DATABASE-ID-HERE`. Commit the change; Cloudflare redeploys automatically.
4. **Test.** Sign up on the home page with your own email, then run this in the D1 console:

   ```sql
   SELECT email, plan, tools, created_at FROM waitlist ORDER BY created_at DESC;
   ```

To export sign-ups, run the query above and download the results, or use the **Explore data** view.

## Chartwright Pro (in development)

The Worker contains the Pro backend: accounts, workspaces with Admin, Editor and Viewer roles, invitations, shared dashboards and an audit log. It is **switched off in production** (`PRO_ENABLED` is `"false"`) and **on in staging**.

### Architecture

```
src/
  index.js            entry point: rate limits, waitlist, Pro switch, /api/v1, website files
  config.js           all limits and role rights in one place
  routes/             HTTP only: v1.js (Pro API), waitlist.js
  services/           business rules: access.js, dashboards.js, audit.js
  storage/            data access: db.js (D1 database), blobs.js (R2 file storage)
  middleware/         rateLimit.js, proGate.js
  lib/                auth.js (Better Auth: login, workspaces, roles), errors.js
migrations/           numbered database changes, applied in order
tests/e2e.mjs         end-to-end test on a temporary local database and bucket
```

| Data | Where | Why |
|---|---|---|
| Users, sessions, workspaces, members, invitations | D1 | Small records, fast queries |
| Dashboard names, permissions, versions, audit log | D1 | Small records, keyed by workspace |
| Dashboard contents (data, charts, settings) | R2 | Can be larger than a database row (up to 10 MB) |

### API (version 1)

| Method and address | Who |
|---|---|
| `/api/v1/auth/*` | Sign-up, log-in, sessions, workspaces, members, invitations (Better Auth) |
| `GET /api/v1/me` | Logged-in user |
| `GET /api/v1/workspaces/:ws/dashboards` | Any member |
| `POST /api/v1/workspaces/:ws/dashboards` | Admin, editor |
| `GET /api/v1/workspaces/:ws/dashboards/:id` | Any member |
| `PUT /api/v1/workspaces/:ws/dashboards/:id` | Admin, editor (send `version` to detect edit conflicts) |
| `DELETE /api/v1/workspaces/:ws/dashboards/:id` | Admin, editor |
| `GET /api/v1/workspaces/:ws/audit` | Admin |

### Environments

| | Production | Staging |
|---|---|---|
| Worker | `chartwright` | `chartwright-staging` |
| Address | chartwright.de | chartwright-staging.sujoy-guha2.workers.dev |
| Database (D1) | `chartwright-waitlist` | `chartwright-staging` |
| Files (R2) | `chartwright-blobs` | `chartwright-blobs-staging` |
| Pro | Off | On |
| Deploys | Cloudflare builds from `main` | GitHub Actions from the `staging` branch |

### One-time setup

**Production**
1. **Create the R2 bucket** `chartwright-blobs` (Cloudflare → Storage & databases → R2 → Create bucket). The Worker won't deploy without it.
2. In the production D1 **Console**, run `migrations/0003_dashboard_r2.sql` (after `0001` and `0002`, if not done yet).
3. Add the secret `BETTER_AUTH_SECRET` (Worker → Settings → Variables and Secrets → Secret).

**Staging**
1. Create a D1 database `chartwright-staging` and paste its Database ID into `wrangler.jsonc` (replacing `PASTE-STAGING-DATABASE-ID`).
2. Create an R2 bucket `chartwright-blobs-staging`.
3. Create a Cloudflare **API token** (My Profile → API Tokens → Create Token → template **Edit Cloudflare Workers**, and add **D1: Edit**). In GitHub, add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (Settings → Secrets and variables → Actions).
4. Create a branch named `staging` and push to it. GitHub Actions tests, applies the database changes and deploys.
5. Add the staging secret: `npx wrangler secret put BETTER_AUTH_SECRET --env staging`, or in the dashboard under the `chartwright-staging` Worker.

**Billing protection**
- Cloudflare → **Notifications → Add**: set up usage and billing alerts (available once on the paid Workers plan).
- Rate limits are built in; keep an eye on D1 and R2 usage under each product's **Metrics**.

### Testing

```
npm install
npm test
```

GitHub runs the same tests on every push.

## Run it yourself

The site has no build step: `index.html` is the home and plans page, `app.html` is the app, and the Worker in `src/` adds the waitlist and Pro API on Cloudflare (bundled automatically by Cloudflare when deploying).

- **Locally**: download `app.html` and open it in your browser to use the app.
- **GitHub Pages**: in this repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose the `main` branch and the `/ (root)` folder, and select **Save**. The site appears at `https://<your-username>.github.io/<repository-name>/` after a minute or two.

An internet connection is needed on first load, because the libraries below are loaded from a CDN.

## Built with

- [SheetJS](https://sheetjs.com/) for reading spreadsheet files
- [Chart.js](https://www.chartjs.org/) for charts
- [jsPDF](https://github.com/parallax/jsPDF) and [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) for PDF reports
- [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans), self-hosted under the SIL Open Font License

## Limitations

- Dashboards aren't saved between visits. Reload the file to see it again.
- Email attachments aren't possible through a mail-app link, so attach a downloaded PDF by hand if you need one.
- Very large files (hundreds of thousands of rows) work but can be slow, depending on your computer.
- The guide uses the viewer's Claude account, so it only appears when Chartwright is opened inside Claude. It is hidden on GitHub Pages and other hosting.

## Versioning

Chartwright uses [Semantic Versioning](https://semver.org/). The current version appears on the start page, in the top bar, and in the footer of every PDF report. See [CHANGELOG.md](CHANGELOG.md) for what changed in each release.

To release a new version:

1. Update `APP_VERSION` near the top of the script in `app.html` (and the `version` meta tag).
2. Add an entry at the top of `CHANGELOG.md`.
3. Commit, then create a GitHub release with a tag such as `v1.1.0`.

## License

[MIT](LICENSE)
