// M4 proof: hover a geo circle → synchronized highlight across panels + tooltip;
// then click it → pinned detail card. Verifies the store-driven sync end-to-end.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? '.shots';
const url = process.argv[3] ?? 'http://localhost:5175';
mkdirSync(outDir, { recursive: true });

async function run(theme) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1180 },
    colorScheme: theme,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem('pulse-theme', t), theme);
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Hover the largest circle (last .geo-point, painted on top).
  const circle = page.locator('svg .geo-point').last();
  const qid = await circle.getAttribute('data-quake-id');
  await circle.hover({ force: true });
  await page.waitForTimeout(300);

  const tooltip = await page.locator('[role="tooltip"]').isVisible().catch(() => false);
  const hoverRing = await page.getByTestId('geo-hover-ring').isVisible().catch(() => false);
  const tsBin = await page.getByTestId('ts-hover-bin').isVisible().catch(() => false);
  const histEmph = await page.getByTestId('hist-emphasis').isVisible().catch(() => false);
  await page.screenshot({ path: `${outDir}/hover-${theme}.png`, fullPage: true });
  console.log(`hover-${theme}: id=${qid} tooltip=${tooltip} hoverRing=${hoverRing} tsBinHi=${tsBin} histBucketHi=${histEmph}`);

  // Click to pin → detail card.
  await circle.click({ force: true });
  await page.waitForTimeout(300);
  const dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
  const pinnedRing = await page.getByTestId('geo-pinned-ring').isVisible().catch(() => false);
  const usgsLink = await page.getByRole('link', { name: /usgs/i }).isVisible().catch(() => false);
  await page.screenshot({ path: `${outDir}/pin-${theme}.png`, fullPage: true });
  console.log(`pin-${theme}: dialog=${dialog} pinnedRing=${pinnedRing} usgsLink=${usgsLink} errors=${errors.length ? errors.join(' | ') : 'none'}`);

  // Escape closes.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const dialogAfter = await page.locator('[role="dialog"]').isVisible().catch(() => false);
  console.log(`escape-${theme}: dialogClosed=${!dialogAfter}`);

  await ctx.close();
  await browser.close();
}

await run('dark');
console.log('done');
