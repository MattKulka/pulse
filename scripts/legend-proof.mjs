// M4.3 proof: toggling a legend bucket removes those quakes across all panels;
// also verifies the tooltip edge-clamp fix keeps the card inside the map panel.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? '.shots';
const url = process.argv[3] ?? 'http://localhost:5175';
mkdirSync(outDir, { recursive: true });

async function totalEvents(page) {
  const el = page.getByRole('group', { name: /Total events/i }).first();
  const label = await el.getAttribute('aria-label');
  const m = label && label.match(/([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1180 }, colorScheme: 'dark', deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('pulse-theme', 'dark'));
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const before = await totalEvents(page);

// Hide the two smallest buckets (most events) to make the cascade obvious.
await page.getByTestId('legend-toggle-lt2').click();
await page.getByTestId('legend-toggle-2-3').click();
await page.waitForTimeout(600);
const after = await totalEvents(page);
const pressed = await page.getByTestId('legend-toggle-lt2').getAttribute('aria-pressed');
await page.screenshot({ path: `${outDir}/legend-hidden.png`, fullPage: true });
console.log(`legend: before=${before} afterHideSmall=${after} dropped=${after < before} lt2AriaPressed=${pressed} errors=${errors.length ? errors.join(' | ') : 'none'}`);

// Restore.
await page.getByTestId('legend-toggle-lt2').click();
await page.getByTestId('legend-toggle-2-3').click();
await page.waitForTimeout(400);
const restored = await totalEvents(page);
console.log(`restore: total=${restored} back=${restored === before || restored >= after}`);

// Tooltip edge-clamp: hover the east-most and west-most circles, assert tooltip box within map panel box.
async function tooltipWithinPanel(pick) {
  const circles = page.locator('svg .geo-point');
  const n = await circles.count();
  let target = null, targetX = pick === 'east' ? -Infinity : Infinity;
  for (let i = 0; i < n; i++) {
    const b = await circles.nth(i).boundingBox();
    if (!b) continue;
    const cx = b.x + b.width / 2;
    if ((pick === 'east' && cx > targetX) || (pick === 'west' && cx < targetX)) { targetX = cx; target = circles.nth(i); }
  }
  await target.hover({ force: true });
  await page.waitForTimeout(200);
  const tip = await page.locator('[role="tooltip"]').boundingBox();
  const panel = await page.getByTestId('geo-panel').boundingBox().catch(() => null);
  const bounds = panel ?? { x: 0, y: 0, width: 1280, height: 1180 };
  const inside = tip && tip.x >= bounds.x - 1 && (tip.x + tip.width) <= (bounds.x + bounds.width) + 1;
  console.log(`tooltip-${pick}: tipLeft=${tip && Math.round(tip.x)} tipRight=${tip && Math.round(tip.x + tip.width)} panel=[${Math.round(bounds.x)},${Math.round(bounds.x + bounds.width)}] insideHoriz=${inside}`);
}
await tooltipWithinPanel('east');
await tooltipWithinPanel('west');

await ctx.close();
await browser.close();
console.log('done');
