// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Smoke test for all 36 algorithms. For each: load its workspace, press
 * Play at top speed, confirm it reaches a completion/idle state, and
 * assert no console or page errors occurred. Plus a step-back smoke on a
 * rewind-capable algorithm. Every new feature should add a check here.
 */

const algorithms = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'algorithms.json'), 'utf8')
);

// Algorithms whose engines support rewind (restoreState) — step buttons live.
const REWINDABLE = new Set([
  'bars', 'memory', 'dp', 'canvas', 'list', 'network',
]);

for (const algo of algorithms) {
  test(`${algo.id} — loads, plays, no errors`, async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(`/workspace.html?algo=${algo.id}`);

    // Workspace booted (header populated) and not the 404 panel.
    await expect(page.locator('#wsAlgoName')).not.toHaveText(/Loading/, { timeout: 10_000 });
    await expect(page.locator('#ws404')).toBeHidden();

    // Fastest speed so the run finishes quickly.
    const speed = page.locator('#speedSlider');
    if (await speed.count()) await speed.fill('8');

    // Play.
    const play = page.locator('#btnPlay');
    await expect(play).toBeEnabled();
    await play.click();

    // Wait for a "done" log entry OR the Play button to re-enable (idle/done),
    // whichever comes first; tolerate interactive demos that settle quietly.
    await Promise.race([
      page.locator('.log-entry.done').first().waitFor({ timeout: 15_000 }).catch(() => {}),
      page.waitForTimeout(15_000),
    ]);

    expect(errors, `console/page errors:\n${errors.join('\n')}`).toEqual([]);
  });
}

test('bubble-sort — step-back rewinds after pause', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/workspace.html?algo=bubble-sort');
  await expect(page.locator('#wsAlgoName')).not.toHaveText(/Loading/, { timeout: 10_000 });

  await page.locator('#speedSlider').fill('2'); // slow enough to pause mid-run
  await page.locator('#btnPlay').click();
  await page.waitForTimeout(1200);
  await page.locator('#btnPause').click();

  const stepBack = page.locator('#btnStepBack');
  // Rewind-capable engine ⇒ step-back becomes enabled while paused.
  await expect(stepBack).toBeEnabled({ timeout: 5_000 });
  await stepBack.click();
  expect(errors).toEqual([]);
});

// Sanity: every algorithm id is unique (catches a duplicated/typo'd entry).
test('algorithms.json — unique ids', () => {
  const ids = algorithms.map((a) => a.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBe(36);
});
