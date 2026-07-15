// Screenshot helper — the in-app Browser pane can't raster-capture this Vite
// dev server (RAF is paused in the backgrounded tab), so we drive a real
// headless Chromium via Playwright instead. Reused at every milestone gate.
//
// Usage: node scripts/shot.mjs [outDir] [url]
//   outDir defaults to scratchpad; url defaults to http://localhost:5175
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? '.shots';
const url = process.argv[3] ?? 'http://localhost:5175';
mkdirSync(outDir, { recursive: true });

const shots = [
  { name: 'desktop-light', width: 1280, height: 900, theme: 'light' },
  { name: 'desktop-dark', width: 1280, height: 900, theme: 'dark' },
  { name: 'mobile-light', width: 390, height: 844, theme: 'light' },
  { name: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
];

const browser = await chromium.launch();
try {
  for (const s of shots) {
    const context = await browser.newContext({
      viewport: { width: s.width, height: s.height },
      colorScheme: s.theme,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    // Seed the persisted theme before the app boots so ThemeToggle picks it up.
    await page.addInitScript((theme) => {
      localStorage.setItem('pulse-theme', theme);
    }, s.theme);
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(url, { waitUntil: 'networkidle' });
    // Let count-up + entrance animations settle.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/${s.name}.png`, fullPage: true });
    console.log(`${s.name}: ${errors.length ? 'CONSOLE ERRORS: ' + errors.join(' | ') : 'no console errors'}`);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Screenshots written to ${outDir}`);
