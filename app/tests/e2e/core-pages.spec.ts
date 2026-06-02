import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', title: /Momcozy 市场洞察工作台/ },
  { path: '/#/industry', title: /全球母婴标准与法规地图/ },
  { path: '/#/industry/regulation', title: /行业法规与标准解读/ },
  { path: '/#/data', title: /数据管理/ },
  { path: '/#/data-source', title: /数据来源管理/ },
  { path: '/#/ai-assistant/design', title: /产品设计助手/ },
];

test.describe('core pages visual guard', () => {
  for (const pageConfig of pages) {
    test(`${pageConfig.path} renders without console errors or horizontal overflow`, async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });
      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      await page.goto(pageConfig.path);
      await expect(page.getByText(pageConfig.title).filter({ visible: true }).first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: testInfo.outputPath(`${testInfo.project.name}-${pageConfig.path.replace(/[^a-z0-9]+/gi, '-') || 'home'}.png`),
        fullPage: true,
      });

      const hasHorizontalOverflow = await page.evaluate(() => {
        const documentWidth = document.documentElement.scrollWidth;
        const viewportWidth = document.documentElement.clientWidth;
        return documentWidth > viewportWidth + 1;
      });

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
});
