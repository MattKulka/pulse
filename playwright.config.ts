import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for Pulse end-to-end tests.
 *
 * The dev server runs on 5175 (matching vite.config.ts). `reuseExistingServer`
 * means a server already running (the usual local case) is reused; otherwise
 * Playwright boots `pnpm dev` itself and tears it down when done.
 *
 * The tests exercise the live USGS feed by default (they assert relative
 * changes, never exact counts) so they genuinely guard the running app against
 * the blank-charts class of bug.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 5175,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
