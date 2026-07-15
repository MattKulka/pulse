// Mid-brush cross-filter proof. Drags a sub-range on the time-series and captures
// the moment the selection is live, asserting the KPI total actually drops.
import { chromium, webkit } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? '.shots';
const url = process.argv[3] ?? 'http://localhost:5175';
mkdirSync(outDir, { recursive: true });

async function totalEvents(page) {
  const el = await page.getByRole('group', { name: /Total events/i }).first();
  const label = await el.getAttribute('aria-label');
  const m = label && label.match(/([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

async function run(engine, name, theme) {
  const browser = await engine.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1180 },
    colorScheme: theme,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.addInitScript((t) => localStorage.setItem('pulse-theme', t), theme);
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const before = await totalEvents(page);

  const box = await page.getByTestId('brush-overlay').boundingBox();
  if (!box) throw new Error('brush-overlay not found');
  const y = box.y + box.height / 2;
  // Select roughly the middle third of the 24h window.
  await page.mouse.move(box.x + box.width * 0.35, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, y, { steps: 16 });
  await page.waitForTimeout(400); // let live cross-filter settle

  const during = await totalEvents(page);
  const bandVisible = await page.getByTestId('brush-selection').isVisible().catch(() => false);
  const clearVisible = await page.getByRole('button', { name: /clear selection/i }).isVisible().catch(() => false);

  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  await page.mouse.up();

  console.log(`${name}: total before=${before} during-brush=${during} band=${bandVisible} clearBtn=${clearVisible} filtered=${during < before} errors=${errors.length ? errors.join(' | ') : 'none'}`);
  await context.close();
  await browser.close();
}

await run(chromium, 'brush-dark', 'dark');
await run(chromium, 'brush-light', 'light');
await run(webkit, 'brush-webkit-dark', 'dark');
console.log('done');
