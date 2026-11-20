import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against an already-running stack (API + worker + web).
 * See docs/TESTING.md for how to start it. Emails are read from the SMTP/file
 * outbox directory given in E2E_OUTBOX_DIR.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
