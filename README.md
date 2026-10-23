# SpendSense

**Your money, made visible.** A private, local-first personal expense tracker.

Every expense belongs to a category, and every category has its own monthly analysis.
Add ₹2,500 under **Clothes**, open Clothes, and you see every purchase, this month's total,
previous months, average per purchase, payment-method split and budget progress.

There is no backend and no login: all data is stored in your browser's **IndexedDB** on your device.

## Features

- **Overview** — spent this month, today and this week, budget vs actual, money in and net (received − paid out − spent), pending payments, category breakdown (donut), daily spending chart, recent transactions
- **Add / edit / delete expenses** — amount, category, date, optional description and payment method; undo on delete
- **Category analysis** — month total, count, average and largest purchase, change vs last month, 6-month average, 12-month chart, payment methods, transactions, inline budget
- **Custom categories** — name, icon, colour and monthly budget; categories with history are archived rather than deleted
- **Transactions** — filter by date range, category, payment method and text; CSV export
- **Payments** — incoming and outgoing payments with the other party, Pending or Done; mark pending ones received/paid; "to receive / to pay" totals and pending balance per person
- **Profits** — add profit (or loss) entries; the all-time total keeps adding up, with this month, this year, running total per entry, 12-month chart and by-source totals
- **Quick category** — create a new category right from the Add expense form
- **Reports** — yearly month-by-month chart, monthly summary and category totals; print to PDF; CSV export
- **Your data** — JSON backup and restore, protected (persistent) storage request

## Tech

- Angular 16 (NgModule), TypeScript
- [Dexie.js](https://dexie.org) over IndexedDB with live queries — the UI updates whenever data changes
- Chart.js 4
- GitHub Pages via GitHub Actions; hash routing so deep links work on Pages

## Run locally

```bash
npm ci
npm start          # http://localhost:4200
npm run build      # output in dist/spendsense
```

Use Node 16 or 18 (Angular 16's supported versions).

## Deploy

Pushing to `main` builds and deploys with `.github/workflows/deploy.yml`.
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The app is served at `https://<user>.github.io/<repo>/`.

## Data and storage

- Data lives in the browser's IndexedDB for the site's origin (`<user>.github.io`). Redeploying the app does **not** touch it.
- Changing the domain or repository name changes where the app runs; the data stays with the old address. Export a backup first, then restore it on the new address.
- Clearing site data, private windows or switching browsers/devices start empty. Use **Reports → Download backup** regularly.

### Changing the database schema

Never edit an existing `this.version(n)` block in `src/app/core/db.ts`. Add a new version with an
`upgrade()` function so existing users' data is migrated, and bump `SCHEMA_VERSION`.

## Project structure

```
src/app/
  core/       db.ts (Dexie schema), data.service.ts (queries), analytics.ts, backup.service.ts, dates.ts, ui.ts (pipes, month + toast services)
  shared/     chart, month picker, expense list
  pages/      dashboard, expense form, categories, category detail, transactions, income, reports
```
