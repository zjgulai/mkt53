import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const landingUrl = process.env.LUTE_LANDING_URL ?? 'https://lute-tlz-dddd.top/';
const marketUrl = process.env.MKT_PROD_URL ?? 'https://mkt.lute-tlz-dddd.top';
const dataUrl = `${marketUrl}/#/data`;
const periodicManifestUrl = `${marketUrl}/periodic-data/latest.json`;
const periodicConnectorBacklogUrl = `${marketUrl}/periodic-data/connectors.json`;
const weeklyManifestUrl = `${marketUrl}/weekly-data/latest.json`;
const evidenceBoundaryRoutes = [
  '/#/data',
  '/#/ai-assistant',
  '/#/ai-gallery',
  '/#/reports',
  '/#/report/r009',
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

function serverVisibleUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.hash = '';
  return url.toString();
}

async function expectPortalLoginRedirect(page: Page, targetUrl: string) {
  await page.goto(targetUrl, { waitUntil: 'networkidle' });

  const finalUrl = new URL(page.url());
  expect(finalUrl.hostname).toBe('lute-tlz-dddd.top');
  expect(finalUrl.pathname).toBe('/login.html');
  expect(finalUrl.searchParams.get('next')).toBe(serverVisibleUrl(targetUrl));
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
}

async function expectPortalRedirectResponse(request: APIRequestContext, targetUrl: string) {
  const response = await request.get(targetUrl, { maxRedirects: 0 });

  expect(response.status()).toBe(302);
  expect(response.headers().location).toContain('https://lute-tlz-dddd.top/login.html?next=');
  expect(response.headers().location).toContain(serverVisibleUrl(targetUrl));
}

test.describe('production landing service entry guard', () => {
  test('lute landing gateway renders without runtime errors or overflow', async ({ page }) => {
    const runtimeErrors = await collectRuntimeErrors(page);

    await page.goto(landingUrl, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /LUTE AI Native Builder Lab/ })).toBeVisible();
    await expect(page.getByText('DDDD DATA SCIENCE').first()).toBeVisible();
    await expect(page.getByRole('link', { name: '进入主页' })).toHaveAttribute('href', /\/login\.html\?next=\/systems\.html/);
    await expect(page.getByRole('link', { name: '登录' })).toBeVisible();
    const registerLink = page.getByRole('link', { name: '注册' });
    if ((await registerLink.count()) > 0) {
      await expect(registerLink).toBeVisible();
    }
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(runtimeErrors.consoleErrors).toEqual([]);
    expect(runtimeErrors.pageErrors).toEqual([]);
    expect(runtimeErrors.responseErrors).toEqual([]);
  });

  test('mkt53 production target is protected by the portal login gate', async ({ page }) => {
    const runtimeErrors = await collectRuntimeErrors(page);

    await expectPortalLoginRedirect(page, marketUrl);
    expect(runtimeErrors.consoleErrors).toEqual([]);
    expect(runtimeErrors.pageErrors).toEqual([]);
    expect(runtimeErrors.responseErrors).toEqual([]);
  });

  test('mkt53 production deep routes remain behind the portal login gate', async ({ page }) => {
    const runtimeErrors = await collectRuntimeErrors(page);

    await expectPortalLoginRedirect(page, dataUrl);
    for (const route of evidenceBoundaryRoutes) {
      await expectPortalLoginRedirect(page, `${marketUrl}${route}`);
    }

    expect(runtimeErrors.consoleErrors).toEqual([]);
    expect(runtimeErrors.pageErrors).toEqual([]);
    expect(runtimeErrors.responseErrors).toEqual([]);
  });

  test('mkt53 production manifest endpoints are protected by the portal login gate', async ({ request }) => {
    await expectPortalRedirectResponse(request, periodicManifestUrl);
    await expectPortalRedirectResponse(request, periodicConnectorBacklogUrl);
    await expectPortalRedirectResponse(request, weeklyManifestUrl);
  });
});
