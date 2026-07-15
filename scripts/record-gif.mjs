// Records an animated GIF of brush → cross-filter for the README.
// Captures viewport frames during a scripted brush drag and encodes with gifenc
// (no ffmpeg needed). Output: docs/brush-cross-filter.gif
import { chromium } from '@playwright/test'
import { PNG } from 'pngjs'
import gifenc from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifenc
import { writeFileSync, mkdirSync } from 'node:fs'

const out = process.argv[2] ?? 'docs/brush-cross-filter.gif'
const url = 'http://localhost:5175'
mkdirSync('docs', { recursive: true })

const VW = 960
const VH = 1480

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: VW, height: VH },
  colorScheme: 'dark',
  deviceScaleFactor: 1,
})
const page = await ctx.newPage()
await page.addInitScript(() => localStorage.setItem('pulse-theme', 'dark'))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1600)

const gif = GIFEncoder()
const frames = [] // { buf, delay }

async function grab(delay) {
  const buf = await page.screenshot({ type: 'png' }) // viewport-sized
  frames.push({ buf, delay })
}

// Hold on the full dashboard.
await grab(700)
await grab(300)

// Brush the middle of the time-series overlay.
const overlay = page.getByTestId('brush-overlay')
await overlay.scrollIntoViewIfNeeded()
const box = await overlay.boundingBox()
const y = box.y + box.height / 2
const x0 = box.x + box.width * 0.32
const x1 = box.x + box.width * 0.66
await page.mouse.move(x0, y)
await page.mouse.down()
const STEPS = 7
for (let i = 1; i <= STEPS; i++) {
  await page.mouse.move(x0 + ((x1 - x0) * i) / STEPS, y, { steps: 3 })
  await page.waitForTimeout(90)
  await grab(120)
}
await page.mouse.up()
// Hold on the filtered selection.
await grab(1100)
await grab(700)

// Clear the selection — everything animates back.
await page.getByRole('button', { name: /clear selection/i }).click()
await page.waitForTimeout(140)
await grab(180)
await page.waitForTimeout(220)
await grab(1000)

await browser.close()

// Encode. Per-frame palette keeps it simple and looks clean for a UI capture.
for (const { buf, delay } of frames) {
  const { data, width, height } = PNG.sync.read(buf)
  const palette = quantize(data, 256, { format: 'rgba4444' })
  const index = applyPalette(data, palette, 'rgba4444')
  gif.writeFrame(index, width, height, { palette, delay })
}
gif.finish()
writeFileSync(out, Buffer.from(gif.bytes()))
console.log(`wrote ${out} — ${frames.length} frames, ${(gif.bytes().length / 1024 / 1024).toFixed(2)} MB`)
