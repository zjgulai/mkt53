import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-prod',
  outputDir: './tmp/playwright-prod-test-results',
  reporter: [['list'], ['html', { outputFolder: './tmp/playwright-prod-report', open: 'never' }]],
  fullyParallel: true,
  retries: 0,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'prod-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'prod-mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
