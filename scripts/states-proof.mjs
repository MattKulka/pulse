// M5 proof: force each data-state (skeleton / error+retry / empty variants / fresh)
// by intercepting the USGS request, and screenshot each.
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? '.shots';
const url = process.argv[3] ?? 'http://localhost:5175';
mkdirSync(outDir, { recursive: true });
const FEED = '**/all_day.geojson*';
const realFeed = JSON.parse(readFileSync(new URL('../public/land-110m.json', import.meta.url))); // any valid json for land
const emptyFeed = JSON.stringify({ type: 'FeatureCollection', features: [] });

const browser = await chromium.launch();

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1180 }, colorScheme: 'dark', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('pulse-theme', 'dark'));
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, page, errors };
}

// 1) SKELETON — hold the feed response open, screenshot mid-load.
{
  const { ctx, page } = await newPage();
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route(FEED, async (route) => { await gate; route.continue(); });
  page.goto(url, { waitUntil: 'commit' }).catch(() => {});
  await page.waitForSelector('[data-testid="kpi-skeleton"]', { timeout: 8000 });
  const kpiSk = await page.locator('[data-testid="kpi-skeleton"]').count();
  const chartSk = await page.locator('[data-testid="chart-skeleton"]').count();
  await page.screenshot({ path: `${outDir}/state-skeleton.png`, fullPage: true });
  console.log(`skeleton: kpiSkeletons=${kpiSk} chartSkeletons=${chartSk}`);
  release();
  await ctx.close();
}

// 2) ERROR + RETRY — fail first load, then recover.
{
  const { ctx, page, errors } = await newPage();
  let fail = true;
  await page.route(FEED, (route) => (fail ? route.fulfill({ status: 500, body: 'err' }) : route.continue()));
  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForSelector('[data-testid="error-state"]', { timeout: 8000 });
  const alertRole = await page.getByRole('alert').isVisible().catch(() => false);
  await page.screenshot({ path: `${outDir}/state-error.png`, fullPage: true });
  fail = false;
  await page.getByTestId('error-retry').click();
  await page.waitForTimeout(1800);
  const recovered = await page.getByTestId('error-state').count();
  const kpis = await page.getByRole('group', { name: /Total events/i }).isVisible().catch(() => false);
  console.log(`error: shown=${alertRole} afterRetry_errorGone=${recovered === 0} kpisVisible=${kpis} consoleErrs=${errors.length}`);
  await ctx.close();
}

// 3) EMPTY: no-data — feed returns zero features.
{
  const { ctx, page } = await newPage();
  await page.route(FEED, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: emptyFeed }));
  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(800);
  const reasons = await page.locator('[data-testid="empty-state"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-reason')));
  await page.screenshot({ path: `${outDir}/state-empty-nodata.png`, fullPage: true });
  console.log(`empty-nodata: emptyStates=${reasons.length} reasons=${JSON.stringify(reasons)}`);
  await ctx.close();
}

// 4) EMPTY: all-hidden — real data, hide every legend bucket.
{
  const { ctx, page } = await newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  for (const k of ['lt2', '2-3', '3-4', '4-5', '5-6', 'gte6']) {
    await page.getByTestId(`legend-toggle-${k}`).click();
  }
  await page.waitForTimeout(500);
  const reasons = await page.locator('[data-testid="empty-state"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-reason')));
  const fresh = await page.getByTestId('freshness-indicator').getAttribute('data-state').catch(() => null);
  await page.screenshot({ path: `${outDir}/state-empty-allhidden.png`, fullPage: true });
  console.log(`empty-allhidden: emptyStates=${reasons.length} reasons=${JSON.stringify(reasons)} freshnessState=${fresh}`);
  await ctx.close();
}

await browser.close();
console.log('done');
