# Lernexa — E2E smoke tests (Playwright)

Dev-only. Lives here as a **dev dependency**; the app itself stays
zero-dependency (`node_modules` is git-ignored).

## First-time setup

```bash
npm install              # installs @playwright/test
npm run test:e2e:install # downloads the Chromium / Firefox / WebKit binaries
```

## Run

```bash
npm run test:e2e                       # all three browsers
npm run test:e2e -- --project=chromium # just one
```

Playwright starts a static server (`python3 -m http.server 8000`) automatically
via `playwright.config.js`. On Windows, change that command to `python -m
http.server 8000` (or `npx serve -l 8000 .`).

## What `smoke.spec.js` covers

- **All 36 algorithms** — load the workspace, press Play at top speed, wait for a
  completion/idle state, and assert **no console or page errors** occurred.
- **Step-back** — on a rewind-capable algorithm (bubble-sort), pause mid-run and
  confirm the step-back button becomes enabled and rewinds without error.
- **Data sanity** — `algorithms.json` has 36 unique ids.

Running across Chromium + Firefox + WebKit mirrors the report's cross-browser
matrix (Table 4.4).

## Workflow rule

Every new feature ships with at least one check here (e.g. the maze BFS/A\*
buttons, the floating graph panel, mobile layout).

> Note: run this on a normal filesystem. If the source files are served from a
> flaky network mount that truncates reads, the app will fail to load in-browser
> and produce spurious failures — that's an environment issue, not a code one.
