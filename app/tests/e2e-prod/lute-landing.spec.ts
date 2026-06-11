import { expect, test, type Page } from '@playwright/test';

const landingUrl = process.env.LUTE_LANDING_URL ?? 'https://lute-tlz-dddd.top/';
const marketUrl = process.env.MKT_PROD_URL ?? 'https://mkt.lute-tlz-dddd.top';
const dataUrl = `${marketUrl}/#/data`;
const periodicManifestUrl = `${marketUrl}/periodic-data/latest.json`;
const periodicConnectorBacklogUrl = `${marketUrl}/periodic-data/connectors.json`;
const weeklyManifestUrl = `${marketUrl}/weekly-data/latest.json`;
const evidenceBoundaryRoutes = [
  { path: '/#/ai-assistant', expectedText: 'AI助手演示边界' },
  { path: '/#/ai-gallery', expectedText: 'AI图库素材口径' },
  { path: '/#/reports', expectedText: '报告目录元数据口径' },
  { path: '/#/report/r009', expectedText: '报告内容来源边界' },
];

async function collectRuntimeErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const responseErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.hostname.endsWith('lute-tlz-dddd.top') && response.status() >= 400 && !url.pathname.includes('favicon')) {
      responseErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  return { consoleErrors, pageErrors, responseErrors };
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe('production landing service entry guard', () => {
  test('lute landing gateway renders without runtime errors or overflow', async ({ page }) => {
    const runtimeErrors = await collectRuntimeErrors(page);

    await page.goto(landingUrl, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /LUTE AI Native Builder Lab/ })).toBeVisible();
    await expect(page.getByText('DDDD DATA SCIENCE').first()).toBeVisible();
    await expect(page.getByRole('link', { name: '进入主页' })).toHaveAttribute('href', /\/login\.html\?next=\/systems\.html/);
    await expect(page.getByRole('link', { name: '登录' })).toBeVisible();
    await expect(page.getByRole('link', { name: '注册' })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(runtimeErrors.consoleErrors).toEqual([]);
    expect(runtimeErrors.pageErrors).toEqual([]);
    expect(runtimeErrors.responseErrors).toEqual([]);
  });

  test('mkt53 production target renders from the landing card destination', async ({ page }) => {
    const runtimeErrors = await collectRuntimeErrors(page);

    await page.goto(marketUrl, { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/Momcozy - Market Insight Platform/);
    await expect(page.getByRole('heading', { name: /Momcozy 市场洞察工作台/ })).toBeVisible();
    await expect(page.getByText(/半月数据周期 \d{4}-\d{2}-H[12]/)).toBeVisible();
    await expect(page.getByText(/连接器待接入/).first()).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(runtimeErrors.consoleErrors).toEqual([]);
    expect(runtimeErrors.pageErrors).toEqual([]);
    expect(runtimeErrors.responseErrors).toEqual([]);
  });

  test('mkt53 production data page reads the semi-monthly manifest without route collision', async ({ page }) => {
    const runtimeErrors = await collectRuntimeErrors(page);

    await page.goto(dataUrl, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: '数据管理' })).toBeVisible();
    await expect(page.getByText('半月数据采集刷新')).toBeVisible();
    await expect(page.getByText('未绑定registry页面')).toBeVisible();
    await expect(page.getByText('0').last()).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(runtimeErrors.consoleErrors).toEqual([]);
    expect(runtimeErrors.pageErrors).toEqual([]);
    expect(runtimeErrors.responseErrors).toEqual([]);
  });

  test('mkt53 production AI and report pages expose evidence boundaries', async ({ page }) => {
    const runtimeErrors = await collectRuntimeErrors(page);

    for (const route of evidenceBoundaryRoutes) {
      await page.goto(`${marketUrl}${route.path}`, { waitUntil: 'networkidle' });
      await expect(page.getByText(route.expectedText)).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    }

    await page.goto(`${marketUrl}/#/report/r009`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/公开页样例与待采集任务复核/)).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(runtimeErrors.consoleErrors).toEqual([]);
    expect(runtimeErrors.pageErrors).toEqual([]);
    expect(runtimeErrors.responseErrors).toEqual([]);
  });

  test('mkt53 production semi-monthly manifest exposes the current data audit state', async ({ request }) => {
    const response = await request.get(periodicManifestUrl);
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.refreshCadence).toBe('semi-monthly');
    expect(manifest.period).toMatch(/^\d{4}-\d{2}-H[12]$/);
    expect(manifest.totals.total).toBe(45);
    expect(manifest.auditSummary.sourceRegistryCount).toBe(45);
    expect(manifest.auditSummary.pagesWithStaticDataWithoutRegistry).toBe(0);
    expect(manifest.auditSummary.issueCount).toBe(0);
    expect(manifest.connectorBacklog.total).toBe(23);
  });

  test('mkt53 production connector backlog keeps restricted sources blocked', async ({ request }) => {
    const response = await request.get(periodicConnectorBacklogUrl);
    expect(response.ok()).toBe(true);

    const backlog = await response.json();
    expect(backlog.total).toBe(23);
    expect(backlog.groups.some((group: { connectorId: string }) => group.connectorId === 'amazon-commerce')).toBe(true);
    expect(backlog.groups.some((group: { connectorId: string }) => group.connectorId === 'review-nlp')).toBe(true);
    expect(backlog.items.every((item: { blockedReason: string }) => item.blockedReason.includes('不得伪造'))).toBe(true);
  });

  test('mkt53 production keeps weekly manifest compatibility path', async ({ request }) => {
    const response = await request.get(weeklyManifestUrl);
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.refreshCadence).toBe('semi-monthly');
    expect(manifest.totals.total).toBe(45);
  });
});
