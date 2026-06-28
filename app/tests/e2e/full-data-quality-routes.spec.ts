import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/market',
  '/market/trend',
  '/market/mtl',
  '/market/dtl',
  '/market/consumables',
  '/market/customs',
  '/market/category',
  '/competition',
  '/competition/new',
  '/competition/region',
  '/competition/products',
  '/users',
  '/users/overseas',
  '/users/consumer',
  '/users/channel',
  '/users/store',
  '/users/regional',
  '/users/global',
  '/users/aesthetics',
  '/industry',
  '/industry/regulation',
  '/industry/policy-insight',
  '/industry/flavor-map',
  '/industry/flavor-report',
  '/industry/news',
  '/industry/tech',
  '/industry/reports',
  '/industry/supply',
  '/industry/ip',
  '/industry/exhibition',
  '/industry/macro',
  '/self',
  '/ai-assistant',
  '/ai-assistant/review-analysis',
  '/ai-assistant/youtube',
  '/ai-assistant/design',
  '/ai-assistant/knowledge',
  '/ai-assistant/comment-data',
  '/ai-assistant/web-review',
  '/ai-gallery',
  '/reports',
  '/report/r009',
  '/data',
  '/data-source',
];

const evidenceLabelPattern = /来源|口径|示例|待复核|复核|待接入|采集|边界|数据源|授权|公开|半月|内部维护|版本化|proxy|代理/i;

const forbiddenOverclaimPatterns = [
  /公开兴趣(?:指数|趋势|代理)?[^。；\n]*(?:代表|等同|作为|替代)[^。；\n]*(?:GMV|销量|销售额)/i,
  /Wikimedia[^。；\n]*(?:代表|等同|作为|替代)[^。；\n]*(?:GMV|销量|销售额)/i,
  /market_trend_monthly[^。；\n]*(?:已接入|真实)(?:GMV|销量)(?![^。；\n]*(?:待授权|接入后|授权后))/i,
];

function hashRoute(route: string) {
  return route === '/' ? '/' : `/#${route}`;
}

test.describe('full data quality route sweep', () => {
  for (const route of routes) {
    test(`${route} renders with data provenance guardrails`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await page.goto(hashRoute(route));
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toContainText(evidenceLabelPattern, { timeout: 15_000 });

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(100);
      expect(bodyText).not.toMatch(/页面未找到|404/i);
      expect(bodyText).toMatch(evidenceLabelPattern);

      const overclaimScanText = bodyText
        .replace(/不代表[^。；\n]*(?:GMV|销量|销售额)/gi, 'safe-negative-claim')
        .replace(/不能(?:表示|替代|代表)[^。；\n]*(?:GMV|销量|销售额|交易数据)/gi, 'safe-negative-claim')
        .replace(/非GMV、非销量、非Amazon数据/gi, 'safe-negative-claim');

      for (const pattern of forbiddenOverclaimPatterns) {
        expect(overclaimScanText).not.toMatch(pattern);
      }

      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(hasHorizontalOverflow).toBe(false);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});
