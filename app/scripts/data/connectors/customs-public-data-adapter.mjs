#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isValidTimezoneIsoDateTime } from '../lib/strict-iso-date.mjs';

const connectorId = 'customs-public-data-adapter';
const sourceId = 'ds-006';
const defaultPublicEvidencePath = 'public/periodic-data/public-evidence-samples.json';
const defaultWeeklyEvidencePath = 'public/weekly-data/public-evidence-samples.json';
const defaultWritePaths = ['public/periodic-data/customs-public-adapter.json', 'public/weekly-data/customs-public-adapter.json'];

const requiredSeeds = [
  {
    seedId: 'us-census-merchandise-imports-database',
    evidenceRole: 'official_trade_data_source',
    requiredMatchedTerms: ['Merchandise Trade Imports', 'HTSUSA'],
    allowedHosts: ['www.census.gov'],
  },
  {
    seedId: 'cbp-electric-breast-pump-hts-ruling',
    evidenceRole: 'official_hts_classification_context',
    requiredMatchedTerms: ['electric breast pump', '8413.81.0040'],
    allowedHosts: ['rulings.cbp.gov'],
  },
];

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function parseArgs(argv) {
  const writePaths = [];
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    publicEvidencePath: undefined,
    generatedAt: undefined,
    writePaths,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--public-evidence') options.publicEvidencePath = argv[index + 1];
    if (argv[index] === '--generated-at') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--generated-at requires a timezone-qualified ISO date-time value');
      options.generatedAt = value;
    }
    if (argv[index] === '--write' && argv[index + 1]) writePaths.push(argv[index + 1]);
  }

  return options;
}

function readJsonIfExists(path) {
  if (!path || !existsSync(resolve(process.cwd(), path))) return undefined;
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
}

function publicEvidenceRecords(publicEvidence) {
  if (!publicEvidence || typeof publicEvidence !== 'object') return [];
  if (Array.isArray(publicEvidence.records)) return publicEvidence.records;
  if (Array.isArray(publicEvidence.items)) return publicEvidence.items;
  return [];
}

function loadPublicEvidence(path) {
  if (path) return { data: readJsonIfExists(path), path };

  const periodic = readJsonIfExists(defaultPublicEvidencePath);
  if (periodic) return { data: periodic, path: defaultPublicEvidencePath };

  const weekly = readJsonIfExists(defaultWeeklyEvidencePath);
  if (weekly) return { data: weekly, path: defaultWeeklyEvidencePath };

  return { data: undefined, path: path ?? defaultPublicEvidencePath };
}

function hasMatchedTerms(record, requiredTerms) {
  const matched = Array.isArray(record?.matchedEvidenceTerms) ? record.matchedEvidenceTerms : [];
  return requiredTerms.every((term) => matched.includes(term));
}

function isConsistentValidation(value) {
  if (!value || typeof value !== 'object' || typeof value.valid !== 'boolean') return false;
  if (!Array.isArray(value.missingFields) || !value.missingFields.every((field) => typeof field === 'string')) return false;
  if (typeof value.urlValid !== 'boolean' || typeof value.termsValid !== 'boolean' || typeof value.boundaryValid !== 'boolean') {
    return false;
  }
  const derivedValid =
    value.missingFields.length === 0 && value.urlValid === true && value.termsValid === true && value.boundaryValid === true;
  return value.valid === derivedValid;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAllowedEvidenceUrl(value, allowedHosts) {
  if (!isNonEmptyString(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.username === '' && url.password === '' && url.port === '' && allowedHosts.includes(url.hostname);
  } catch {
    return false;
  }
}

function hasSameAllowedOrigin(sourceUrl, finalUrl, allowedHosts) {
  if (!isAllowedEvidenceUrl(sourceUrl, allowedHosts) || !isAllowedEvidenceUrl(finalUrl, allowedHosts)) return false;
  return new URL(sourceUrl).origin === new URL(finalUrl).origin;
}

function missingProofFields(record, seed) {
  const missing = [];
  if (record?.sourceId !== sourceId) missing.push('sourceId');
  if (!isAllowedEvidenceUrl(record?.url, seed.allowedHosts)) missing.push('url');
  if (!hasSameAllowedOrigin(record?.url, record?.finalUrl, seed.allowedHosts)) missing.push('finalUrl');
  if (!isNonEmptyString(record?.title)) missing.push('title');
  if (!SHA256_PATTERN.test(record?.visibleTextHash ?? '')) missing.push('visibleTextHash');
  if (!isNonEmptyString(record?.nonVerbatimSummary)) missing.push('nonVerbatimSummary');
  if (!isNonEmptyString(record?.localEvidence?.textArchivePath)) missing.push('localEvidence.textArchivePath');
  return missing;
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isEmptyStringArray(value) {
  return Array.isArray(value) && value.length === 0;
}

function isPolicyGeneratedPageError(value) {
  return typeof value === 'string' && value.includes('net::ERR_BLOCKED_BY_CLIENT');
}

function eligibilityFailures(record, seed, manifestMode) {
  const failures = [];
  const pageErrors = Array.isArray(record?.pageErrors) ? record.pageErrors : [];
  const actionablePageErrors = pageErrors.filter((error) => !isPolicyGeneratedPageError(error));
  const warnings = Array.isArray(record?.warnings) ? record.warnings : [];
  const actionableWarnings = warnings.filter(
    (warning) => warning !== 'browser console or page errors were observed' || actionablePageErrors.length > 0 || pageErrors.length === 0,
  );
  if (manifestMode !== 'live-browser-capture') failures.push('manifestMode');
  if (record?.captureStatus !== 'captured') failures.push('captureStatus');
  if (!isConsistentValidation(record?.validation) || record.validation.valid !== true) failures.push('validation');
  if (record?.notFullPlatformDataset !== true) failures.push('notFullPlatformDataset');
  if (record?.publicBundleAllowed !== true) failures.push('publicBundleAllowed');
  if (record?.rawTextPublicBundleAllowed !== false) failures.push('rawTextPublicBundleAllowed');
  if (record?.screenshotPublicBundleAllowed !== false) failures.push('screenshotPublicBundleAllowed');
  if (!hasMatchedTerms(record, seed.requiredMatchedTerms)) failures.push('matchedEvidenceTerms');
  if (!isEmptyStringArray(record?.missingEvidenceTerms)) failures.push('missingEvidenceTerms');
  if (!isEmptyStringArray(actionableWarnings)) failures.push('warnings');
  if (!isEmptyStringArray(actionablePageErrors)) failures.push('pageErrors');
  if (record?.safety?.networkCalls !== 1) failures.push('safety.networkCalls');
  if (record?.safety?.loginAttempted !== false) failures.push('safety.loginAttempted');
  if (record?.safety?.bypassAttempted !== false) failures.push('safety.bypassAttempted');
  if (record?.safety?.businessDataWrites !== 0) failures.push('safety.businessDataWrites');
  if (record?.safety?.rawTextWrittenToPublicBundle !== false) failures.push('safety.rawTextWrittenToPublicBundle');
  return failures;
}

function sanitizeEvidenceRecord(record, seed, manifestMode) {
  if (!record) {
    return {
      seedId: seed.seedId,
      evidenceRole: seed.evidenceRole,
      sourceId,
      captureStatus: 'missing',
      ready: false,
      missingMatchedTerms: seed.requiredMatchedTerms,
    };
  }

  const proofFieldsMissing = missingProofFields(record, seed);
  const eligibilityBlockers = eligibilityFailures(record, seed, manifestMode);
  const ready = proofFieldsMissing.length === 0 && eligibilityBlockers.length === 0;

  return {
    seedId: record.seedId,
    evidenceRole: seed.evidenceRole,
    sourceId: record.sourceId,
    url: record.url,
    finalUrl: record.finalUrl,
    evidenceClass: record.evidenceClass,
    captureStatus: record.captureStatus,
    title: record.title,
    visibleTextHash: record.visibleTextHash,
    matchedEvidenceTerms: record.matchedEvidenceTerms ?? [],
    missingEvidenceTerms: record.missingEvidenceTerms ?? [],
    nonVerbatimSummary: record.nonVerbatimSummary,
    localEvidence: record.localEvidence,
    ready,
    missingProofFields: proofFieldsMissing,
    missingMatchedTerms: seed.requiredMatchedTerms.filter((term) => !(record.matchedEvidenceTerms ?? []).includes(term)),
    eligibilityBlockers,
  };
}

function summarizeRecordSafety(records) {
  const captureStatusCounts = {};
  let networkCalls = 0;
  let businessDataWrites = 0;
  for (const record of records) {
    if (!isNonNegativeInteger(record?.safety?.networkCalls) || !isNonNegativeInteger(record?.safety?.businessDataWrites)) {
      return { valid: false, total: records.length, captureStatusCounts, networkCalls: null, businessDataWrites: null };
    }
    captureStatusCounts[record.captureStatus] = (captureStatusCounts[record.captureStatus] ?? 0) + 1;
    networkCalls += record.safety.networkCalls;
    businessDataWrites += record.safety.businessDataWrites;
  }
  return { valid: true, total: records.length, captureStatusCounts, networkCalls, businessDataWrites };
}

function hasExactCountMap(actual, expected) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index] && isNonNegativeInteger(actual[key]) && actual[key] === expected[key])
  );
}

function buildCheck(id, ready, details, blocker) {
  return {
    id,
    status: ready ? 'ready' : 'blocked',
    details,
    blockers: ready ? [] : [blocker],
  };
}

export function buildCustomsPublicDataAdapter(options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  if (!isValidTimezoneIsoDateTime(generatedAt)) {
    throw new Error(`Invalid --generated-at value: ${generatedAt}`);
  }
  const evidenceInput = options.publicEvidence
    ? { data: options.publicEvidence, path: options.publicEvidencePath ?? 'runtime-public-evidence' }
    : loadPublicEvidence(options.publicEvidencePath);
  const records = publicEvidenceRecords(evidenceInput.data);
  const recordsBySeedId = new Map(records.map((record) => [record.seedId, record]));
  const evidenceRecords = requiredSeeds.map((seed) =>
    sanitizeEvidenceRecord(recordsBySeedId.get(seed.seedId), seed, evidenceInput.data?.mode),
  );
  const tradeSourceRecord = evidenceRecords.find((record) => record.seedId === 'us-census-merchandise-imports-database');
  const classificationRecord = evidenceRecords.find((record) => record.seedId === 'cbp-electric-breast-pump-hts-ruling');
  const publicEvidenceReady = evidenceRecords.every((record) => record.ready);
  const sourceAvailabilityReady = tradeSourceRecord?.ready === true;
  const classificationReady = classificationRecord?.ready === true;
  const derivedSafety = summarizeRecordSafety(records);
  const rawTotal = evidenceInput.data?.summary?.total;
  const rawNetworkCalls = evidenceInput.data?.summary?.networkCalls;
  const rawBusinessDataWrites = evidenceInput.data?.summary?.businessDataWrites;
  const rawCaptureStatusCounts = evidenceInput.data?.summary?.captureStatusCounts;
  const safetyCountersValid =
    isNonNegativeInteger(rawTotal) && isNonNegativeInteger(rawNetworkCalls) && isNonNegativeInteger(rawBusinessDataWrites);
  const safetyCountersMatch =
    derivedSafety.valid &&
    safetyCountersValid &&
    rawTotal === derivedSafety.total &&
    rawNetworkCalls === derivedSafety.networkCalls &&
    rawBusinessDataWrites === derivedSafety.businessDataWrites &&
    hasExactCountMap(rawCaptureStatusCounts, derivedSafety.captureStatusCounts);
  const inputNetworkCalls = safetyCountersValid ? rawNetworkCalls : null;
  const inputBusinessDataWrites = safetyCountersValid ? rawBusinessDataWrites : null;
  const safetyReady = safetyCountersMatch && inputBusinessDataWrites === 0;
  const checks = [
    buildCheck(
      'publicEvidenceBundle',
      publicEvidenceReady,
      {
        publicEvidencePath: evidenceInput.path,
        requiredSeedIds: requiredSeeds.map((seed) => seed.seedId),
        readySeedIds: evidenceRecords.filter((record) => record.ready).map((record) => record.seedId),
      },
      { type: 'missing-or-incomplete-public-evidence' },
    ),
    buildCheck(
      'officialTradeDataSource',
      sourceAvailabilityReady,
      {
        seedId: tradeSourceRecord?.seedId ?? '',
        url: tradeSourceRecord?.url ?? '',
        matchedEvidenceTerms: tradeSourceRecord?.matchedEvidenceTerms ?? [],
      },
      { type: 'official-trade-data-source-not-ready' },
    ),
    buildCheck(
      'officialClassificationContext',
      classificationReady,
      {
        seedId: classificationRecord?.seedId ?? '',
        url: classificationRecord?.url ?? '',
        matchedEvidenceTerms: classificationRecord?.matchedEvidenceTerms ?? [],
        hsCodeCandidate: '8413.81.0040',
      },
      { type: 'official-hts-classification-context-not-ready' },
    ),
    buildCheck(
      'safetyBoundary',
      safetyReady,
      {
        networkCalls: inputNetworkCalls,
        businessDataWrites: inputBusinessDataWrites,
        countersValid: safetyCountersValid,
        countersMatchRecords: safetyCountersMatch,
        rawTextPublicBundleAllowed: false,
        shipmentFactsGenerated: false,
      },
      !safetyCountersValid
        ? { type: 'missing-or-invalid-safety-counters' }
        : !safetyCountersMatch
          ? { type: 'safety-counter-mismatch' }
          : { type: 'business-data-write-observed' },
    ),
  ];
  const blockers = checks.flatMap((check) => check.blockers);

  return {
    schemaVersion: 1,
    connectorId,
    mode: 'public-customs-source-adapter',
    status: blockers.length === 0 ? 'ready-for-public-query-planning' : 'blocked',
    generatedAt,
    sourceId,
    page: 'CustomsData',
    metric: 'HS编码进出口',
    evidenceSource: {
      publicEvidencePath: evidenceInput.path,
      recordShape: Array.isArray(evidenceInput.data?.records) ? 'records' : Array.isArray(evidenceInput.data?.items) ? 'items' : 'none',
    },
    boundaries: {
      publicSourceOnly: true,
      providerCalls: false,
      restrictedConnectorAccess: false,
      productionWrites: false,
      factPromotion: false,
      sourceRegistryWrites: false,
      pageWrites: false,
      networkCalls: inputNetworkCalls,
      businessDataWrites: inputBusinessDataWrites,
      rawTextIncluded: false,
      shipmentRowsIncluded: false,
      importerExporterIncluded: false,
      supplierIncluded: false,
    },
    checks,
    blockers,
    evidenceRecords,
    hsCodeCandidates: [
      {
        code: '8413.81.0040',
        jurisdiction: 'US HTSUS',
        evidenceSeedId: 'cbp-electric-breast-pump-hts-ruling',
        scope: 'electric breast pump classification context only',
        reviewRequiredBeforeQuery: true,
      },
    ],
    publicDataSourceCandidates: [
      {
        sourceName: 'U.S. Census Merchandise Trade Imports database',
        evidenceSeedId: 'us-census-merchandise-imports-database',
        url: tradeSourceRecord?.url ?? 'https://www.census.gov/foreign-trade/data/IMDB.html',
        supportedUse: 'public HTSUSA import data source availability and query planning',
        unsupportedUse: 'company shipment records, importer/exporter identity, supplier identity, Import Genius replacement',
      },
    ],
    queryPlan: {
      planId: 'customs-public-us-imports-htsusa-plan',
      status: blockers.length === 0 ? 'ready-for-owner-query-parameter-review' : 'blocked-until-public-evidence-ready',
      sourceSystem: 'U.S. Census public merchandise trade import data',
      defaultFlow: 'US imports',
      candidateCommodityCodes: ['8413.81.0040'],
      requiredOwnerInputs: [
        'confirm final HS/HTS code list for Momcozy product scope',
        'confirm countries or regions to compare',
        'confirm collection window and reporting granularity',
        'confirm units, value fields and any quantity denominator',
        'confirm whether a second public source cross-check is required',
      ],
    },
    allowedClaimScopes: [
      'public official trade-data source availability',
      'HTS classification context for query planning',
      'public query parameter plan',
    ],
    forbiddenClaimScopes: [
      'shipment-level facts',
      'importer or exporter identity',
      'supplier identity',
      'company shipment count',
      'country share or market share fact',
      'sales, GMV, revenue or demand conclusion',
      'Import Genius replacement',
    ],
    nextActions: [
      'Owner confirms HS/HTS code list and product scope.',
      'Adapter query runner is implemented only after query parameters are approved.',
      'Shipment-level Import Genius or internal warehouse data remains a separate authorized connector lane.',
      'Source registry and page fact promotion require a separate release review.',
    ],
  };
}

function writeJson(path, data) {
  const target = resolve(process.cwd(), path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const adapter = buildCustomsPublicDataAdapter({
    publicEvidencePath: options.publicEvidencePath,
    generatedAt: options.generatedAt,
  });
  const writePaths = options.writePaths.length ? options.writePaths : defaultWritePaths;

  if (!options.noWrite) {
    for (const writePath of writePaths) writeJson(writePath, adapter);
  }

  if (options.json || options.noWrite) {
    process.stdout.write(`${JSON.stringify(adapter, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    'mkt53 customs public data adapter built',
    `status=${adapter.status}`,
    `sourceId=${adapter.sourceId}`,
    `publicEvidencePath=${adapter.evidenceSource.publicEvidencePath}`,
    `evidenceReady=${adapter.checks.find((check) => check.id === 'publicEvidenceBundle')?.status}`,
    `networkCalls=${adapter.boundaries.networkCalls}`,
    `businessDataWrites=${adapter.boundaries.businessDataWrites}`,
    `write=${writePaths.join(',')}`,
    '',
  ].join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
