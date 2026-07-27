import { expect, test } from '@playwright/test';

const chartRoutes = [
  '/',
  '/#/market',
  '/#/users',
  '/#/users/aesthetics',
  '/#/users/consumer',
  '/#/users/store',
];

test.describe('route-aware chart bundle guard', () => {
  for (const route of chartRoutes) {
    test(`${route} renders charts without runtime or layout regressions`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await page.goto(route);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
      expect(await page.locator('.recharts-wrapper').count()).toBeGreaterThan(0);

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
});
