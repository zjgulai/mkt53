#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const DEFAULT_BASE_URL = 'https://mkt.lute-tlz-dddd.top';
const DEFAULT_ROUTES = [
  '/',
  '/#/market',
  '/#/market/trend',
  '/#/market/mtl',
  '/#/market/dtl',
  '/#/market/consumables',
  '/#/market/customs',
  '/#/market/category',
  '/#/competition',
  '/#/competition/new',
  '/#/competition/region',
  '/#/competition/products',
  '/#/users',
  '/#/users/overseas',
  '/#/users/consumer',
  '/#/users/channel',
  '/#/users/store',
  '/#/users/regional',
  '/#/users/global',
  '/#/users/aesthetics',
  '/#/industry',
  '/#/industry/regulation',
  '/#/industry/policy-insight',
  '/#/industry/flavor-map',
  '/#/industry/flavor-report',
  '/#/industry/news',
  '/#/industry/tech',
  '/#/industry/reports',
  '/#/industry/supply',
  '/#/industry/ip',
  '/#/industry/exhibition',
  '/#/industry/macro',
  '/#/self',
  '/#/ai-assistant',
  '/#/ai-assistant/review-analysis',
  '/#/ai-assistant/youtube',
  '/#/ai-assistant/design',
  '/#/ai-assistant/knowledge',
  '/#/ai-assistant/comment-data',
  '/#/ai-assistant/web-review',
  '/#/ai-gallery',
  '/#/reports',
  '/#/report/r009',
  '/#/data',
  '/#/data-source',
];

const DEFAULT_VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
];

function timestampForPath(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.MKT53_PROD_URL || DEFAULT_BASE_URL,
    outDir: process.env.MKT53_ROUTE_SMOKE_OUT_DIR || path.join('tmp', 'audits', `production-route-smoke-${timestampForPath()}`),
    headless: process.env.MKT53_CHROME_HEADLESS !== 'false',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--base-url') {
      args.baseUrl = argv[++index];
    } else if (arg === '--out') {
      args.outDir = argv[++index];
    } else if (arg === '--headed') {
      args.headless = false;
    } else if (arg === '--help') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function helpText() {
  return [
    'Usage: node scripts/smoke-prod-routes.mjs [--base-url URL] [--out DIR] [--headed]',
    '',
    'Runs production read-only route smoke checks in local Google Chrome channel.',
    'Writes full_route_chrome_smoke.json and full_route_chrome_smoke.csv.',
  ].join('\n');
}

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""').replace(/[\r\n]+/g, ' ')}"`;
}

function toCsv(rows) {
  const headers = [
    'route',
    'viewport',
    'gotoStatus',
    'passed',
    'overflow',
    'mainVisible',
    'bodyTextLength',
    'headingText',
    'consoleErrorCount',
    'pageErrorCount',
    'responseErrorCount',
    'url',
  ];
  return [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          if (header === 'consoleErrorCount') return csvEscape(row.consoleErrors.length);
          if (header === 'pageErrorCount') return csvEscape(row.pageErrors.length);
          if (header === 'responseErrorCount') return csvEscape(row.responseErrors.length);
          return csvEscape(row[header]);
        })
        .join(','),
    ),
  ].join('\n');
}

async function collectRouteCheck({ browser, baseUrl, route, viewport }) {
  const page = await browser.newPage({ viewport: viewport.viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const responseErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    try {
      const url = new URL(response.url());
      if (url.hostname.endsWith('mkt.lute-tlz-dddd.top') && response.status() >= 400 && !url.pathname.includes('favicon')) {
        responseErrors.push(`${response.status()} ${response.url()}`);
      }
    } catch {
      // Ignore non-standard response URLs from browser internals.
    }
  });

  const url = `${baseUrl}${route}`;
  let gotoStatus = null;
  let gotoError = null;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    gotoStatus = response ? response.status() : null;
    await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => undefined);
    await page.waitForTimeout(350);
  } catch (error) {
    gotoError = error instanceof Error ? error.message : String(error);
  }

  const metrics = await page
    .evaluate(() => {
      const firstTitle = document.querySelector('h1,h2,[data-page-title]');
      const main = document.querySelector('main') || document.body;
      return {
        title: document.title,
        bodyTextLength: document.body ? document.body.innerText.length : 0,
        headingText: firstTitle ? firstTitle.textContent?.trim().slice(0, 160) : '',
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        mainVisible: !!main && !!(main.offsetWidth || main.offsetHeight || main.getClientRects().length),
      };
    })
    .catch((error) => ({ evalError: error instanceof Error ? error.message : String(error) }));
  const userAgent = await page.evaluate(() => navigator.userAgent).catch(() => '');
  await page.close();

  const passed =
    !gotoError &&
    (gotoStatus === null || gotoStatus < 400) &&
    Boolean(metrics.mainVisible) &&
    Number(metrics.bodyTextLength ?? 0) >= 40 &&
    Number(metrics.overflow ?? 0) <= 1 &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0 &&
    responseErrors.length === 0;

  return {
    route,
    url,
    viewport: viewport.name,
    width: viewport.viewport.width,
    height: viewport.viewport.height,
    gotoStatus,
    gotoError,
    title: metrics.title || '',
    headingText: metrics.headingText || '',
    bodyTextLength: metrics.bodyTextLength || 0,
    overflow: metrics.overflow ?? null,
    mainVisible: Boolean(metrics.mainVisible),
    consoleErrors,
    pageErrors,
    responseErrors,
    userAgent,
    passed,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(helpText());
    return;
  }

  await mkdir(args.outDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: args.headless });
  const browserVersion = browser.version();
  const rows = [];

  for (const viewport of DEFAULT_VIEWPORTS) {
    for (const route of DEFAULT_ROUTES) {
      rows.push(await collectRouteCheck({ browser, baseUrl: args.baseUrl, route, viewport }));
    }
  }

  await browser.close();

  const failures = rows.filter((row) => !row.passed);
  const result = {
    generatedAt: new Date().toISOString(),
    boundary: 'production-read-only',
    baseUrl: args.baseUrl,
    browserChannel: 'chrome',
    browserVersion,
    routeCount: DEFAULT_ROUTES.length,
    viewportCount: DEFAULT_VIEWPORTS.length,
    checkCount: rows.length,
    passCount: rows.length - failures.length,
    failureCount: failures.length,
    routes: DEFAULT_ROUTES,
    failures,
    rows,
  };

  await writeFile(path.join(args.outDir, 'full_route_chrome_smoke.json'), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(path.join(args.outDir, 'full_route_chrome_smoke.csv'), `${toCsv(rows)}\n`);

  console.log(
    `Chrome route smoke ${result.passCount}/${result.checkCount} passed; failures=${result.failureCount}; outDir=${args.outDir}`,
  );

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
