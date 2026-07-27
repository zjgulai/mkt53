import { expect, test } from '@playwright/test';

const chartRoutes = [
  { path: '/', expectation: 'chart' },
  { path: '/#/market', expectation: 'chart' },
  { path: '/#/users', expectation: 'gate-with-inline-navigation' },
  { path: '/#/users/aesthetics', expectation: 'chart' },
  { path: '/#/users/overseas', expectation: 'gate-with-sidebar' },
  { path: '/#/users/consumer', expectation: 'gate-with-sidebar' },
  { path: '/#/users/channel', expectation: 'gate-with-sidebar' },
  { path: '/#/users/store', expectation: 'gate-with-sidebar' },
] as const;

test.describe('route-aware chart bundle guard', () => {
  for (const route of chartRoutes) {
    test(`${route.path} renders its evidence-aware visualization state without runtime or layout regressions`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      if (route.expectation === 'chart') {
        await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
        expect(await page.locator('.recharts-wrapper').count()).toBeGreaterThan(0);
      } else {
        await expect(page.getByTestId('fact-display-gate').first()).toBeVisible();
        await expect(page.locator('.recharts-wrapper')).toHaveCount(0);
        if (route.expectation === 'gate-with-sidebar') {
          await expect(page.locator('aside a', { hasText: '母婴舆情' })).toBeVisible();
        } else {
          await expect(page.getByRole('button', { name: '母婴舆情' })).toBeVisible();
        }
      }

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
});
