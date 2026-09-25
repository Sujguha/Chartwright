# Chartwright

**Version 1.2.1** · [Changelog](CHANGELOG.md)

**Drop a spreadsheet. Get a dashboard.**

Chartwright turns an Excel, CSV or JSON file into an interactive dashboard in seconds. It reads your columns, works out which are dates, numbers and categories, and builds key figures and charts automatically. You can then filter, add your own charts, and share the result as a PDF, a data file or an email.

Everything runs in the browser. Your file is never uploaded to a server.

## Features

- **Automatic dashboards**: key-figure tiles, a trend line over time, and breakdown charts chosen from your column types.
- **Your own title and key figures**: rename the dashboard and choose what each key-figure tile shows.
- **Filters**: narrow the whole dashboard by any category column.
- **Chart builder**: bar, horizontal bar, line and doughnut charts, showing a count, total, average, minimum or maximum.
- **Data table**: searchable and sortable.
- **Downloads**: a PDF report (key figures, charts and data), an HTML report, and the filtered data as Excel or CSV.
- **Email**: opens a new email in your mail app with the recipients and subject filled in, and copies a formatted version of the dashboard (with charts) to paste into it.
- **German formats**: understands numbers such as `1.234,5` and dates such as `23.07.2026`.
- **Light and dark mode**: follows your system setting.
- **Guide (inside Claude only)**: an AI assistant that answers questions about the data with exact figures, explains how to use the app, and can apply filters, add or remove charts, and open the Download or Email panel on request.

## Supported file formats

| Format | Extensions | Notes |
|---|---|---|
| Excel | `.xlsx` `.xlsm` `.xls` `.xlsb` | All sheets are available; the first sheet with data opens by default. |
| OpenDocument | `.ods` | LibreOffice and OpenOffice spreadsheets. |
| Delimited text | `.csv` `.tsv` `.txt` | The separator (comma, semicolon, tab or pipe) is detected automatically. UTF-8 and Windows-1252 encodings are both supported. |
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
| `release-data.csv` | Standard comma-separated file |
| `release-data.json` | Simple JSON: a list of records with one field per column |
| `release-data-api-style.json` | Nested JSON shaped like a Jira-style API export, to show automatic flattening |
| `release-data.tsv` | Tab-separated file |
| `release-data-semicolon.txt` | German-style export: semicolons, `dd.mm.yyyy` dates, umlauts, Windows-1252 encoding |
| `release-data.xlsx`, `.xlsb`, `.ods` | Spreadsheet formats |
| `release-data-large.xlsx` | 12,000 releases and 2,700 linked incidents across 25 columns, for load testing |
| `finance-ledger-large.xlsx` | 15,000 general-ledger postings in 5 currencies, plus a monthly budget vs actual sheet |

## Run it yourself

Chartwright is a single `index.html` file with no build step.

- **Locally**: download `index.html` and open it in your browser.
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

1. Update `APP_VERSION` near the top of the script in `index.html` (and the `version` meta tag).
2. Add an entry at the top of `CHANGELOG.md`.
3. Commit, then create a GitHub release with a tag such as `v1.1.0`.

## License

[MIT](LICENSE)
