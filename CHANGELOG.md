# Changelog

All notable changes to Chartwright are listed here. Versions follow [Semantic Versioning](https://semver.org/):
**MAJOR** for changes that break how people use the app, **MINOR** for new features, **PATCH** for fixes.

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
