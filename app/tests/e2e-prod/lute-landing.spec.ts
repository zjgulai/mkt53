import { expect, test, type Page } from '@playwright/test';

const landingUrl = process.env.LUTE_LANDING_URL ?? 'https://lute-tlz-dddd.top/';
const marketUrl = process.env.MKT_PROD_URL ?? 'https://mkt.lute-tlz-dddd.top';
const dataUrl = `${marketUrl}/#/data`;
const weeklyManifestUrl = `${marketUrl}/weekly-data/latest.json`;

const expectedMarketCard = {
  href: 'https://mkt.lute-tlz-dddd.top',
  subtitle: 'Market Insight Platform',
  title: '市场洞察工作台',
  cta: '打开市场看板',
};

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
  test('lute landing exposes the mkt53 card without runtime errors or overflow', async ({ page }) => {
    const runtimeErrors = await collectRuntimeErrors(page);

    await page.goto(landingUrl, { waitUntil: 'networkidle' });

    const landingState = await page.evaluate(() => {
      const marketCard = document.querySelector<HTMLAnchorElement>('a.card.mkt');

      return {
        cardCount: document.querySelectorAll('.card').length,
        marketCard: marketCard
          ? {
              href: marketCard.getAttribute('href') ?? '',
              subtitle: marketCard.querySelector('.card-subtitle')?.textContent?.trim() ?? '',
              title: marketCard.querySelector('.card-title')?.textContent?.trim() ?? '',
              cta: marketCard.querySelector('.card-cta')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            }
          : null,
      };
    });

    expect(landingState.cardCount).toBe(12);
    expect(landingState.marketCard).toEqual(expectedMarketCard);
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
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(runtimeErrors.consoleErrors).toEqual([]);
    expect(runtimeErrors.pageErrors).toEqual([]);
    expect(runtimeErrors.responseErrors).toEqual([]);
  });

  test('mkt53 production data page reads the weekly manifest without route collision', async ({ page }) => {
    const runtimeErrors = await collectRuntimeErrors(page);

    await page.goto(dataUrl, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: '数据管理' })).toBeVisible();
    await expect(page.getByText('周度数据采集刷新')).toBeVisible();
    await expect(page.getByText('未绑定registry页面')).toBeVisible();
    await expect(page.getByText('0').last()).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(runtimeErrors.consoleErrors).toEqual([]);
    expect(runtimeErrors.pageErrors).toEqual([]);
    expect(runtimeErrors.responseErrors).toEqual([]);
  });

  test('mkt53 production weekly manifest exposes the current data audit state', async ({ request }) => {
    const response = await request.get(weeklyManifestUrl);
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.totals.total).toBe(45);
    expect(manifest.auditSummary.sourceRegistryCount).toBe(45);
    expect(manifest.auditSummary.pagesWithStaticDataWithoutRegistry).toBe(0);
    expect(manifest.auditSummary.issueCount).toBe(0);
  });
});
