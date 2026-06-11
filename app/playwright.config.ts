import { defineConfig, devices } from '@playwright/test';

const e2ePort = Number(process.env.MKT53_E2E_PORT ?? 3000);
const baseURL = `http://127.0.0.1:${e2ePort}`;
const reuseExistingServer =
  process.env.MKT53_E2E_REUSE_EXISTING === '0' ? false : process.env.MKT53_E2E_REUSE_EXISTING === '1' ? true : !process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tmp/playwright-test-results',
  reporter: [['list'], ['html', { outputFolder: './tmp/playwright-report', open: 'never' }]],
  fullyParallel: true,
  retries: 0,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: baseURL,
    reuseExistingServer,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
