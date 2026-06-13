#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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

function validateSeed(seed) {
  const missingFields = ['id', 'sourceId', 'page', 'metric', 'label', 'url', 'evidenceClass', 'collectionBoundary'].filter((field) => !seed[field]);
  const urlValid = typeof seed.url === 'string' && /^https:\/\//.test(seed.url);
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

async function captureSeed(browser, seed, options, generatedAt) {
  const validation = validateSeed(seed);
  const base = plannedRecord(seed, generatedAt);

  if (!validation.valid) return base;

  const slug = safeSlug(seed.id);
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    userAgent: 'mkt53-public-evidence-capture/1.0 (+https://mkt.lute-tlz-dddd.top)',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  try {
    const response = await page.goto(seed.url, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeoutMs,
    });
    await page.waitForTimeout(750);

    const title = normalizeText(await page.title().catch(() => ''));
    const finalUrl = page.url();
    const visibleText = normalizeText(await page.locator('body').innerText({ timeout: 3000 }).catch(() => ''));
    const matched = matchedTerms(`${title} ${visibleText}`, seed.expectedEvidenceTerms);
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
      missingEvidenceTerms: seed.expectedEvidenceTerms.filter((term) => !matched.includes(term)),
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
        ...(matched.length === 0 ? ['expected evidence terms were not matched in visible text'] : []),
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
    await context.close();
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
    const browser = await chromium.launch({ headless: true });
    try {
      records = [];
      for (const seed of seedPayload.seeds) {
        records.push(await captureSeed(browser, seed, runOptions, generatedAt));
      }
    } finally {
      await browser.close();
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
