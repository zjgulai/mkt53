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

const routeResponsibilityContracts: Record<string, {
  expected: string;
  forbidden: string;
  activeNav: string;
  sourceReadiness: 'partial';
}> = {
  '/industry/reports': {
    expected: '母婴行业报告',
    forbidden: '母婴行业资讯',
    activeNav: '母婴行业报告',
    sourceReadiness: 'partial',
  },
  '/industry/macro': {
    expected: '区域宏观分析',
    forbidden: '行业法规与标准解读',
    activeNav: '区域宏观分析',
    sourceReadiness: 'partial',
  },
};

const forbiddenDefinitionOnlyValuePattern = /[$€£¥]\s*\d|\d+(?:\.\d+)?\s*(?:%|％|美元|亿元|万元|USD|CNY)/i;

const sourceBackedReviewContracts: Record<string, {
  heading: string;
  activeNav: string;
  metricId: string;
  metricOwner: string;
  metricGrain: string;
  modelContract: string;
}> = {
  '/market/trend': {
    heading: '大盘趋势',
    activeNav: '大盘趋势',
    metricId: 'market_trend_verified_signal_rate',
    metricOwner: 'Strategic Insights Owner',
    metricGrain: 'review_cycle × signal × market',
    modelContract: 'trend-signal-review-v1',
  },
  '/industry/tech': {
    heading: '母婴科技资讯',
    activeNav: '母婴科技资讯',
    metricId: 'technology_spec_comparability_rate',
    metricOwner: 'Product Technology Intelligence Owner',
    metricGrain: 'product_version × specification',
    modelContract: 'technology-spec-ontology-v1',
  },
  '/industry/ip': {
    heading: 'IP分析',
    activeNav: 'IP分析',
    metricId: 'patent_family_review_coverage',
    metricOwner: 'IP Intelligence Owner',
    metricGrain: 'query_version × patent_family × jurisdiction',
    modelContract: 'patent-query-family-review-v1',
  },
  '/industry/exhibition': {
    heading: '展会调研',
    activeNav: '母婴展会调研',
    metricId: 'exhibition_intelligence_action_rate',
    metricOwner: 'Events Intelligence Owner',
    metricGrain: 'exhibition × task × target_entity',
    modelContract: 'exhibition-task-evidence-v1',
  },
};

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
      const readinessStatus = page.getByTestId('route-readiness-status');
      await expect(readinessStatus).toBeVisible();
      await expect(readinessStatus).toHaveAttribute('data-source-readiness', /^(blocked|partial|source-backed)$/);
      await expect(readinessStatus).toHaveAttribute('data-decision-readiness', 'not-ready');
      await expect(readinessStatus).toContainText('来源');
      await expect(readinessStatus).toContainText('决策 · 未就绪');

      const responsibility = routeResponsibilityContracts[route];
      if (responsibility) {
        await expect(readinessStatus).toHaveAttribute('data-source-readiness', responsibility.sourceReadiness);
        await expect(page.getByRole('heading', { name: responsibility.expected })).toBeVisible();
        await expect(page.getByRole('heading', { name: responsibility.forbidden })).toHaveCount(0);
        const currentNavLink = page.locator('a[aria-current="page"]');
        await expect(currentNavLink).toHaveCount(1);
        await expect(currentNavLink).toContainText(responsibility.activeNav);

        const evidenceGate = page.getByTestId('evidence-gate-page');
        await expect(evidenceGate).toHaveAttribute('data-evidence-mode', 'definition-only');
        await expect(evidenceGate).toHaveAttribute('data-business-values', 'absent');
        expect(await evidenceGate.innerText()).not.toMatch(forbiddenDefinitionOnlyValuePattern);
        const definitionOnlyText = await evidenceGate.evaluate((element) => {
          const copy = element.cloneNode(true) as HTMLElement;
          copy.querySelectorAll('[data-evidence-source-list]').forEach((sourceList) => sourceList.remove());
          return copy.innerText;
        });
        expect(definitionOnlyText).not.toMatch(/\d/);
        await expect(evidenceGate.locator('[data-business-value], [data-testid*="kpi"], [data-testid*="metric-value"]')).toHaveCount(0);
        await expect(evidenceGate.locator('.recharts-wrapper')).toHaveCount(0);
        await expect(evidenceGate.getByRole('table')).toHaveCount(0);
        await expect(evidenceGate.locator('a[download]')).toHaveCount(0);
        await expect(evidenceGate.getByRole('link', { name: /下载|导出|CSV/i })).toHaveCount(0);
        await expect(evidenceGate.getByRole('button', { name: /下载|导出|CSV/i })).toHaveCount(0);
      }

      const sourceBackedReview = sourceBackedReviewContracts[route];
      if (sourceBackedReview) {
        await expect(readinessStatus).toHaveAttribute('data-source-readiness', 'source-backed');
        await expect(readinessStatus).toHaveAttribute('data-decision-readiness', 'not-ready');
        await expect(page.getByRole('heading', { name: sourceBackedReview.heading })).toBeVisible();

        const packet = page.getByTestId('source-backed-review-packet');
        await expect(packet).toHaveAttribute('data-route', route);
        await expect(packet).toHaveAttribute('data-source-readiness', 'source-backed');
        await expect(packet).toHaveAttribute('data-review-status', 'business-review-candidate');
        await expect(packet).toHaveAttribute('data-decision-readiness', 'not-ready');
        await expect(packet).toHaveAttribute('data-contract-state', 'aligned');
        await expect(packet).toHaveAttribute('data-metric-id', sourceBackedReview.metricId);
        await expect(packet).toHaveAttribute('data-metric-owner', sourceBackedReview.metricOwner);
        await expect(packet).toHaveAttribute('data-metric-grain', sourceBackedReview.metricGrain);
        await expect(packet).toContainText(sourceBackedReview.modelContract);
        await expect(packet).toContainText('允许用途');
        await expect(packet).toContainText('禁止用途');
        await expect(packet).toContainText('待签核项');

        const currentNavLink = page.locator('a[aria-current="page"]');
        await expect(currentNavLink).toHaveCount(1);
        await expect(currentNavLink).toContainText(sourceBackedReview.activeNav);
      }

      if (route === '/ai-assistant') {
        await expect(readinessStatus).toHaveAttribute('data-source-readiness', 'partial');
        await expect(readinessStatus).toHaveAttribute('data-decision-readiness', 'not-ready');

        const blocker = page.getByTestId('ai-voc-blocker-panel');
        await expect(blocker).toHaveAttribute('data-governance-state', 'blocked');
        await expect(blocker).toHaveAttribute('data-source-readiness', 'partial');
        await expect(blocker).toHaveAttribute('data-decision-readiness', 'not-ready');
        await expect(blocker).toHaveAttribute('data-provider-calls', 'false');
        await expect(blocker).toHaveAttribute('data-production-writes', 'false');
        await expect(blocker).toContainText('fixture / synthetic 不得升级为真实输出');
      }

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
