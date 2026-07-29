#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { BlockList, isIP } from 'node:net';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const defaultSeedPath = 'scripts/data/public-evidence-seeds.json';
const defaultPublicWritePath = 'public/periodic-data/public-evidence-samples.json';
const defaultWeeklyCompatWritePath = 'public/weekly-data/public-evidence-samples.json';
const defaultScreenshotDir = 'tmp/public-evidence/screenshots';
const defaultTextDir = 'tmp/public-evidence/text';
const defaultTimeoutMs = 15000;
const maxPublicSummaryChars = 220;
const allocatedPublicIpv6Ranges = new BlockList();
const explicitlyPublicIpv6Ranges = new BlockList();
const nonPublicIpv6Ranges = new BlockList();

// IANA IPv6 Global Unicast Address Space registry, last updated 2025-10-10.
// Unlisted 2000::/3 space is reserved, so live capture fails closed until this
// allowlist is updated for a new IANA allocation.
for (const [address, prefix] of [
  ['2001:200::', 23],
  ['2001:400::', 23],
  ['2001:600::', 23],
  ['2001:800::', 22],
  ['2001:c00::', 23],
  ['2001:e00::', 23],
  ['2001:1200::', 23],
  ['2001:1400::', 22],
  ['2001:1800::', 23],
  ['2001:1a00::', 23],
  ['2001:1c00::', 22],
  ['2001:2000::', 19],
  ['2001:4000::', 23],
  ['2001:4200::', 23],
  ['2001:4400::', 23],
  ['2001:4600::', 23],
  ['2001:4800::', 23],
  ['2001:4a00::', 23],
  ['2001:4c00::', 23],
  ['2001:5000::', 20],
  ['2001:8000::', 19],
  ['2001:a000::', 20],
  ['2001:b000::', 20],
  ['2003::', 18],
  ['2400::', 12],
  ['2410::', 12],
  ['2600::', 12],
  ['2610::', 23],
  ['2620::', 23],
  ['2630::', 12],
  ['2800::', 12],
  ['2a00::', 12],
  ['2a10::', 12],
  ['2c00::', 12],
]) {
  allocatedPublicIpv6Ranges.addSubnet(address, prefix, 'ipv6');
}
// IANA's IPv6 Special-Purpose Address Space registry marks these narrower
// exceptions inside the otherwise non-global 2001::/23 parent as globally
// reachable.
for (const [address, prefix] of [
  ['2001:1::1', 128],
  ['2001:1::2', 128],
  ['2001:1::3', 128],
  ['2001:3::', 32],
  ['2001:4:112::', 48],
  ['2001:20::', 28],
  ['2001:30::', 28],
]) {
  explicitlyPublicIpv6Ranges.addSubnet(address, prefix, 'ipv6');
}
for (const [address, prefix] of [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
]) {
  nonPublicIpv6Ranges.addSubnet(address, prefix, 'ipv6');
}

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    live: argv.includes('--live'),
    dryRun: argv.includes('--dry-run') || !argv.includes('--live'),
    writePublic: argv.includes('--write-public'),
    writePath: undefined,
    seedPath: defaultSeedPath,
    screenshotDir: defaultScreenshotDir,
    textDir: defaultTextDir,
    timeoutMs: defaultTimeoutMs,
    maxSources: undefined,
    noScreenshots: argv.includes('--no-screenshots'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--write') options.writePath = argv[index + 1];
    if (argv[index] === '--seeds') options.seedPath = argv[index + 1];
    if (argv[index] === '--screenshot-dir') options.screenshotDir = argv[index + 1];
    if (argv[index] === '--text-dir') options.textDir = argv[index + 1];
    if (argv[index] === '--timeout-ms') options.timeoutMs = Number(argv[index + 1]);
    if (argv[index] === '--max-sources') options.maxSources = Number.parseInt(argv[index + 1], 10);
  }

  return options;
}

function ensurePositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashFile(path) {
  return hashText(readFileSync(path));
}

function safeSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function relativeToAppRoot(path) {
  return relative(process.cwd(), resolve(process.cwd(), path));
}

function readSeeds(seedPath, maxSources) {
  const payload = JSON.parse(readFileSync(resolve(process.cwd(), seedPath), 'utf8'));
  const seeds = Array.isArray(payload.seeds) ? payload.seeds : [];
  const limit = Number.isInteger(maxSources) && maxSources > 0 ? maxSources : seeds.length;

  return {
    schemaVersion: payload.schemaVersion ?? 1,
    generatedRule: payload.generatedRule,
    seeds: seeds.slice(0, limit),
  };
}

function normalizedHostname(value) {
  return value.replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '').toLowerCase();
}

function isBlockedIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c, d] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0 && d !== 9 && d !== 10) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isBlockedIpAddress(address) {
  const normalized = normalizedHostname(address);
  const family = isIP(normalized);
  if (family === 4) return isBlockedIpv4(normalized);
  if (family !== 6) return true;

  if (normalized.startsWith('::ffff:')) {
    const mappedAddress = normalized.slice('::ffff:'.length);
    return isIP(mappedAddress) !== 4 || isBlockedIpv4(mappedAddress);
  }
  if (explicitlyPublicIpv6Ranges.check(normalized, 'ipv6')) return false;
  return !allocatedPublicIpv6Ranges.check(normalized, 'ipv6') || nonPublicIpv6Ranges.check(normalized, 'ipv6');
}

export function validatePublicEvidenceUrl(value, { requireHttps = true } = {}) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (requireHttps ? url.protocol !== 'https:' : !['http:', 'https:'].includes(url.protocol)) return false;
    if (url.username !== '' || url.password !== '' || url.port !== '') return false;
    if (url.hostname.endsWith('.')) return false;
    const hostname = normalizedHostname(url.hostname);
    if (
      hostname.length === 0 ||
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }
    return isIP(hostname) === 0 || !isBlockedIpAddress(hostname);
  } catch {
    return false;
  }
}

export async function resolvePublicNetworkTarget(value, options = {}) {
  if (!validatePublicEvidenceUrl(value, options)) throw new Error('public-evidence-url-not-allowed');
  const hostname = normalizedHostname(new URL(value).hostname);
  if (isIP(hostname) !== 0) return { hostname, address: hostname };
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedIpAddress(address))) {
    throw new Error('public-evidence-host-resolved-to-non-public-address');
  }
  return { hostname, address: addresses[0].address };
}

export async function assertPublicNetworkUrl(value, options = {}) {
  await resolvePublicNetworkTarget(value, options);
}

export function buildPinnedHostResolverRule(hostname, address) {
  const resolverTarget = isIP(address) === 6 ? `[${address}]` : address;
  return `MAP ${hostname} ${resolverTarget}, EXCLUDE localhost`;
}

export function validateSeed(seed) {
  const missingFields = ['id', 'sourceId', 'page', 'metric', 'label', 'url', 'evidenceClass', 'collectionBoundary'].filter((field) => !seed[field]);
  const urlValid = validatePublicEvidenceUrl(seed.url);
  const termsValid = Array.isArray(seed.expectedEvidenceTerms);
  const boundaryValid = seed.notFullPlatformDataset === true;

  return {
    valid: missingFields.length === 0 && urlValid && termsValid && boundaryValid,
    missingFields,
    urlValid,
    termsValid,
    boundaryValid,
  };
}

function matchedTerms(text, expectedTerms) {
  const haystack = text.toLowerCase();
  return expectedTerms.filter((term) => haystack.includes(String(term).toLowerCase()));
}

function buildNonVerbatimSummary(seed, title, matched, textLength) {
  const titlePart = title ? `title captured (${title.length} chars)` : 'title unavailable';
  return `${seed.label}: ${titlePart}; matched ${matched.length}/${seed.expectedEvidenceTerms.length} expected evidence terms; visible text length ${textLength}.`.slice(
    0,
    maxPublicSummaryChars,
  );
}

function plannedRecord(seed, generatedAt) {
  const validation = validateSeed(seed);

  return {
    seedId: seed.id,
    sourceId: seed.sourceId,
    page: seed.page,
    metric: seed.metric,
    label: seed.label,
    url: seed.url,
    evidenceClass: seed.evidenceClass,
    collectionBoundary: seed.collectionBoundary,
    notFullPlatformDataset: true,
    publicBundleAllowed: true,
    rawTextPublicBundleAllowed: false,
    screenshotPublicBundleAllowed: false,
    captureStatus: validation.valid ? 'planned' : 'invalid-seed',
    capturedAt: generatedAt,
    browser: 'not-launched',
    safety: {
      networkCalls: 0,
      loginAttempted: false,
      bypassAttempted: false,
      businessDataWrites: 0,
      rawTextWrittenToPublicBundle: false,
    },
    validation,
    note: validation.valid
      ? 'Dry-run only. This seed is eligible for browser-assisted public evidence capture when --live is passed.'
      : 'Seed is invalid and must be fixed before live capture.',
  };
}

async function captureSeed(seed, options, generatedAt) {
  const validation = validateSeed(seed);
  const base = plannedRecord(seed, generatedAt);

  if (!validation.valid) return base;

  const slug = safeSlug(seed.id);
  let browser;
  let context;
  const errors = [];

  try {
    const pinnedTarget = await resolvePublicNetworkTarget(seed.url);
    browser = await chromium.launch({
      headless: true,
      args: [
        '--proxy-server=direct://',
        '--proxy-bypass-list=*',
        ...(isIP(pinnedTarget.hostname) === 0
          ? [`--host-resolver-rules=${buildPinnedHostResolverRule(pinnedTarget.hostname, pinnedTarget.address)}`]
          : []),
      ],
    });
    context = await browser.newContext({
      viewport: { width: 1365, height: 900 },
      userAgent: 'mkt53-public-evidence-capture/1.0 (+https://mkt.lute-tlz-dddd.top)',
      serviceWorkers: 'block',
    });
    const seedOrigin = new URL(seed.url).origin;
    await context.route('**/*', async (route) => {
      const requestUrl = route.request().url();
      if (validatePublicEvidenceUrl(requestUrl) && new URL(requestUrl).origin === seedOrigin) {
        await route.continue();
        return;
      }
      await route.abort('blockedbyclient');
    });
    await context.routeWebSocket(/.*/, async (webSocket) => {
      await webSocket.close({ code: 1008, reason: 'Public evidence capture blocks WebSockets' });
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('net::ERR_BLOCKED_BY_CLIENT')) errors.push(message.text());
    });

    const response = await page.goto(seed.url, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeoutMs,
    });
    await page.waitForTimeout(750);

    const title = normalizeText(await page.title().catch(() => ''));
    const finalUrl = page.url();
    if (!validatePublicEvidenceUrl(finalUrl) || new URL(finalUrl).origin !== new URL(seed.url).origin) {
      throw new Error('public-evidence-final-url-origin-mismatch');
    }
    const visibleText = normalizeText(await page.locator('body').innerText({ timeout: 3000 }).catch(() => ''));
    const matched = matchedTerms(`${title} ${visibleText}`, seed.expectedEvidenceTerms);
    const missingEvidenceTerms = seed.expectedEvidenceTerms.filter((term) => !matched.includes(term));
    const textPath = `${options.textDir}/${slug}.txt`;
    let screenshotPath;
    let screenshotHash;

    mkdirSync(resolve(process.cwd(), options.textDir), { recursive: true });
    writeFileSync(resolve(process.cwd(), textPath), `${visibleText}\n`);

    if (!options.noScreenshots) {
      screenshotPath = `${options.screenshotDir}/${slug}.png`;
      mkdirSync(resolve(process.cwd(), options.screenshotDir), { recursive: true });
      await page.screenshot({ path: resolve(process.cwd(), screenshotPath), fullPage: true });
      screenshotHash = hashFile(resolve(process.cwd(), screenshotPath));
    }

    const httpStatus = response?.status();
    const captureStatus = httpStatus && httpStatus >= 200 && httpStatus < 400 ? 'captured' : httpStatus ? 'source-error' : 'fetch-error';

    return {
      ...base,
      captureStatus,
      capturedAt: new Date().toISOString(),
      browser: 'chromium',
      finalUrl,
      httpStatus,
      title,
      visibleTextLength: visibleText.length,
      visibleTextHash: hashText(visibleText),
      matchedEvidenceTerms: matched,
      missingEvidenceTerms,
      nonVerbatimSummary: buildNonVerbatimSummary(seed, title, matched, visibleText.length),
      localEvidence: {
        textArchivePath: relativeToAppRoot(textPath),
        textArchiveBytes: statSync(resolve(process.cwd(), textPath)).size,
        screenshotPath: screenshotPath ? relativeToAppRoot(screenshotPath) : undefined,
        screenshotHash,
      },
      safety: {
        networkCalls: 1,
        loginAttempted: false,
        bypassAttempted: false,
        businessDataWrites: 0,
        rawTextWrittenToPublicBundle: false,
      },
      warnings: [
        ...(missingEvidenceTerms.length > 0 ? ['expected evidence terms were not matched in visible text'] : []),
        ...(errors.length > 0 ? ['browser console or page errors were observed'] : []),
      ],
      pageErrors: errors.slice(0, 5),
      note: 'Browser-assisted public evidence sample captured. Treat as public sample evidence, not a complete platform dataset.',
    };
  } catch (error) {
    return {
      ...base,
      captureStatus: 'fetch-error',
      capturedAt: new Date().toISOString(),
      browser: 'chromium',
      error: error instanceof Error ? error.message : String(error),
      safety: {
        networkCalls: 1,
        loginAttempted: false,
        bypassAttempted: false,
        businessDataWrites: 0,
        rawTextWrittenToPublicBundle: false,
      },
      note: 'Browser-assisted public evidence capture failed without bypassing access controls.',
    };
  } finally {
    await context?.close();
    await browser?.close();
  }
}

function summarize(records) {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;
      summary.captureStatusCounts[record.captureStatus] = (summary.captureStatusCounts[record.captureStatus] ?? 0) + 1;
      summary.evidenceClassCounts[record.evidenceClass] = (summary.evidenceClassCounts[record.evidenceClass] ?? 0) + 1;
      summary.networkCalls += record.safety?.networkCalls ?? 0;
      summary.businessDataWrites += record.safety?.businessDataWrites ?? 0;
      return summary;
    },
    {
      total: 0,
      captureStatusCounts: {},
      evidenceClassCounts: {},
      networkCalls: 0,
      businessDataWrites: 0,
    },
  );
}

function writeJson(path, data) {
  const target = resolve(process.cwd(), path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
}

export async function collectPublicEvidence(options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const seedPayload = readSeeds(options.seedPath ?? defaultSeedPath, options.maxSources);
  const timeoutMs = ensurePositiveInteger(options.timeoutMs, defaultTimeoutMs);
  const runOptions = {
    timeoutMs,
    screenshotDir: options.screenshotDir ?? defaultScreenshotDir,
    textDir: options.textDir ?? defaultTextDir,
    noScreenshots: Boolean(options.noScreenshots),
  };
  let records;

  if (!options.live) {
    records = seedPayload.seeds.map((seed) => plannedRecord(seed, generatedAt));
  } else {
    records = [];
    for (const seed of seedPayload.seeds) {
      records.push(await captureSeed(seed, runOptions, generatedAt));
    }
  }

  return {
    schemaVersion: 1,
    generatedAt,
    mode: options.live ? 'live-browser-capture' : 'dry-run',
    generatedRule:
      'Browser-assisted public evidence captures only public visible pages. It does not log in, bypass access controls, write business datasets, or replace authorized connectors.',
    seedPath: options.seedPath ?? defaultSeedPath,
    publicBundlePolicy: {
      rawTextIncluded: false,
      screenshotsIncluded: false,
      localEvidencePathsMayPointToTmp: true,
    },
    summary: summarize(records),
    records,
  };
}

async function main() {
  const cliOptions = parseArgs(process.argv.slice(2));
  const manifest = await collectPublicEvidence({
    live: cliOptions.live,
    seedPath: cliOptions.seedPath,
    timeoutMs: cliOptions.timeoutMs,
    maxSources: cliOptions.maxSources,
    screenshotDir: cliOptions.screenshotDir,
    textDir: cliOptions.textDir,
    noScreenshots: cliOptions.noScreenshots,
  });

  if (cliOptions.writePath) writeJson(cliOptions.writePath, manifest);
  if (cliOptions.writePublic) {
    writeJson(defaultPublicWritePath, manifest);
    writeJson(defaultWeeklyCompatWritePath, manifest);
  }

  if (cliOptions.json || !cliOptions.writePath) {
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    'mkt53 browser-assisted public evidence capture',
    `mode=${manifest.mode}`,
    `generatedAt=${manifest.generatedAt}`,
    `total=${manifest.summary.total}`,
    `statuses=${JSON.stringify(manifest.summary.captureStatusCounts)}`,
    `networkCalls=${manifest.summary.networkCalls}`,
    `businessDataWrites=${manifest.summary.businessDataWrites}`,
    '',
  ].join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
