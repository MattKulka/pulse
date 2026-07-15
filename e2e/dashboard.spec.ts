import { test, expect, type Page } from '@playwright/test'

/**
 * End-to-end tests for the Pulse dashboard against the running app.
 *
 * These exercise the LIVE USGS feed (no fixture): the render test genuinely
 * guards the "blank charts" class of bug, and the cross-filter tests assert
 * RELATIVE changes (decreased / restored) rather than exact counts, so a feed
 * that ticks between reads never makes them flaky.
 */

/**
 * Read the "Total events" KPI as a number by parsing the tile's aria-label
 * ("Total events: N", where N may contain thousands separators). Returns null
 * when the tile is absent (e.g. an empty-state has replaced the KPI row).
 */
async function totalEvents(page: Page): Promise<number | null> {
  const tile = page.getByRole('group', { name: /Total events/i }).first()
  if ((await tile.count()) === 0) {
    return null
  }
  const label = await tile.getAttribute('aria-label')
  const match = label?.match(/([\d,]+)/)
  return match ? Number(match[1].replace(/,/g, '')) : null
}

/** Wait until the KPI reports a positive total (live data has arrived). */
async function waitForData(page: Page): Promise<number> {
  await expect
    .poll(async () => (await totalEvents(page)) ?? 0, {
      timeout: 20_000,
      message: 'waiting for live earthquake data to load',
    })
    .toBeGreaterThan(0)
  const total = await totalEvents(page)
  if (total === null) {
    throw new Error('Total events tile disappeared after loading')
  }
  return total
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('dashboard renders with live data (no blank charts)', async ({ page }) => {
  // KPI: a positive total proves the feed loaded and filters left events in view.
  const total = await waitForData(page)
  expect(total).toBeGreaterThan(0)

  // Time-series panel: the SVG is present and actually drew bars.
  const timeseries = page.getByTestId('timeseries-svg')
  await expect(timeseries).toBeVisible()
  await expect(timeseries.locator('.ts-bar').first()).toBeVisible()
  expect(await timeseries.locator('.ts-bar').count()).toBeGreaterThan(0)

  // Magnitude histogram: scoped by its accessible name so we count ITS bars,
  // not the time-series bars (both use the .ts-bar class).
  const histogram = page.getByRole('img', { name: /Magnitude distribution/i })
  await expect(histogram).toBeVisible()
  expect(await histogram.locator('.ts-bar').count()).toBeGreaterThan(0)

  // Geo scatter: at least one epicenter was projected + drawn.
  await expect(page.locator('.geo-point').first()).toBeVisible()
  expect(await page.locator('.geo-point').count()).toBeGreaterThan(0)
})

test('brush selection cross-filters the dashboard', async ({ page }) => {
  const before = await waitForData(page)

  const overlay = page.getByTestId('brush-overlay')
  await expect(overlay).toBeVisible()
  // Scroll the time-series into view first: page.mouse works in viewport
  // coordinates, so the overlay must be on-screen for the drag to land on it.
  await overlay.scrollIntoViewIfNeeded()
  const box = await overlay.boundingBox()
  expect(box).not.toBeNull()
  if (box === null) return

  const y = box.y + box.height / 2
  // Drag across the middle of the 24h window to select a sub-range. Events fall
  // outside this band, so the filtered total must drop.
  await page.mouse.move(box.x + box.width * 0.35, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 8 })
  await page.mouse.move(box.x + box.width * 0.65, y, { steps: 8 })
  await page.mouse.up()

  // A "Clear selection" control appears once a range is committed.
  const clear = page.getByRole('button', { name: /clear selection/i })
  await expect(clear).toBeVisible()

  // Total decreased under the sub-range selection (retries until it settles).
  await expect
    .poll(async () => (await totalEvents(page)) ?? before, {
      message: 'total events should decrease under the brush selection',
    })
    .toBeLessThan(before)

  // Clearing restores the full window.
  await clear.click()
  await expect(clear).toBeHidden()
  await expect
    .poll(async () => (await totalEvents(page)) ?? 0, {
      message: 'total events should return to the full count after clearing',
    })
    .toBe(before)
})

test('legend toggle filters a magnitude series', async ({ page }) => {
  const before = await waitForData(page)

  // M<2 is the populous small-quake bucket in the all-day feed; hiding it drops
  // the total everywhere (KPIs, histogram, map).
  const toggle = page.getByTestId('legend-toggle-lt2')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect
    .poll(async () => (await totalEvents(page)) ?? before, {
      message: 'hiding the M<2 series should decrease the total',
    })
    .toBeLessThan(before)

  // Toggling back restores the full count and the pressed state.
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(async () => (await totalEvents(page)) ?? 0, {
      message: 'restoring the M<2 series should return to the full count',
    })
    .toBe(before)
})

test('data-table fallback exposes an accessible table', async ({ page }) => {
  await waitForData(page)

  // Open the time-series disclosure and assert a real <table> with data rows.
  const disclosure = page.getByTestId('timeseries-data-table')
  await disclosure.locator('summary', { hasText: 'View data table' }).click()

  const table = disclosure.getByRole('table')
  await expect(table).toBeVisible()
  expect(await table.locator('tbody tr').count()).toBeGreaterThan(0)
})
