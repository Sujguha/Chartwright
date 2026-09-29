# Chartwright

**Version 1.8.0** · [Changelog](CHANGELOG.md)

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

Waitlist sign-ups are sent to `POST /api/waitlist`, handled by `worker.js` and stored in a Cloudflare **D1** database.

## Hosting on Cloudflare

The site runs as a **Cloudflare Worker with static assets**, deployed automatically from this repository.

| File | Purpose |
|---|---|
| `wrangler.jsonc` | Cloudflare configuration: website files, the Worker and the D1 database binding |
| `worker.js` | Serves the website and handles waitlist sign-ups |
| `schema.sql` | Creates the `waitlist` table |
| `.assetsignore` | Keeps configuration and documentation files from being served publicly |
| `_redirects` | Sends old `/plans` links to the home page |

### One-time setup

1. **Create the database.** In the Cloudflare dashboard, go to **Storage & databases → D1 SQL database → Create**. Name it `chartwright-waitlist`. If a data location or jurisdiction option is offered, choose the EU.
2. **Create the table.** Open the database's **Console**, paste the contents of `schema.sql` and run it.
3. **Connect it.** Copy the database's **Database ID** and paste it into `wrangler.jsonc` in place of `PASTE-YOUR-DATABASE-ID-HERE`. Commit the change; Cloudflare redeploys automatically.
4. **Test.** Sign up on the home page with your own email, then run this in the D1 console:

   ```sql
   SELECT email, plan, tools, created_at FROM waitlist ORDER BY created_at DESC;
   ```

To export sign-ups, run the query above and download the results, or use the **Explore data** view.

## Run it yourself

The site has no build step: `index.html` is the home and plans page, `app.html` is the app, and `worker.js` adds the waitlist endpoint on Cloudflare.

- **Locally**: download `app.html` and open it in your browser to use the app.
- **GitHub Pages**: in this repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose the `main` branch and the `/ (root)` folder, and select **Save**. The site appears at `https://<your-username>.github.io/<repository-name>/` after a minute or two.

An internet connection is needed on first load, because the libraries below are loaded from a CDN.

## Built with

- [SheetJS](https://sheetjs.com/) for reading spreadsheet files
- [Chart.js](https://www.chartjs.org/) for charts
- [jsPDF](https://github.com/parallax/jsPDF) and [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) for PDF reports
- [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) from Google Fonts

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
