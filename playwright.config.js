// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Lernexa — Playwright E2E config (dev tooling only; the app stays
 * zero-dependency). Serves the static site and runs the smoke suite
 * across Chromium, Firefox, and WebKit (mirrors the report's Table 4.4).
 *
 * Run:  npm run test:e2e        (first time: npx playwright install)
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
  },

  // Serve the static app. On Windows, swap `python3` for `python`
  // (or use `npx serve -l 8000 .`).
  webServer: {
    command: 'python3 -m http.server 8000',
    url: 'http://localhost:8000/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
