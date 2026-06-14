#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildAmazonCommerceDryRun } from './amazon-commerce-dry-run.mjs';
import { assertSafePrivatePath, isPrivatePath } from '../lib/private-path-safety.mjs';

const connectorId = 'amazon-commerce';
const mappingTemplatePath = 'scripts/data/connectors/templates/amazon-commerce-mapping-template.json';
const readinessTemplatePath = 'scripts/data/connectors/templates/amazon-commerce-readiness-template.json';
const defaultMappingFileName = 'amazon-commerce-mapping.json';
const defaultReadinessFileName = 'amazon-commerce-readiness.json';
const defaultChecklistFileName = 'amazon-commerce-readiness-checklist.md';
const forbiddenReadinessKeyPattern = /secret|password|refreshToken|accessToken|clientSecret|privateKey|authorizationHeader/i;

function parseArgs(argv) {
  const options = {
    privateDir: process.env.MKT53_AMAZON_PRIVATE_DIR,
    mappingPath: process.env.MKT53_AMAZON_MAPPING_PATH,
    readinessPath: process.env.MKT53_AMAZON_READINESS_PATH,
    checklistPath: process.env.MKT53_AMAZON_CHECKLIST_PATH,
    writePath: undefined,
    force: argv.includes('--force'),
    site: 'amazon.com',
    marketplaceId: 'ATVPDKIKX0DER',
    windowStart: '2026-06-01',
    windowEnd: '2026-06-15',
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--private-dir') options.privateDir = argv[i + 1];
    if (argv[i] === '--mapping') options.mappingPath = argv[i + 1];
    if (argv[i] === '--readiness') options.readinessPath = argv[i + 1];
    if (argv[i] === '--checklist') options.checklistPath = argv[i + 1];
    if (argv[i] === '--write') options.writePath = argv[i + 1];
    if (argv[i] === '--site') options.site = argv[i + 1];
    if (argv[i] === '--marketplace-id') options.marketplaceId = argv[i + 1];
    if (argv[i] === '--window-start') options.windowStart = argv[i + 1];
    if (argv[i] === '--window-end') options.windowEnd = argv[i + 1];
  }

  if (options.privateDir) {
    options.mappingPath ??= join(options.privateDir, defaultMappingFileName);
    options.readinessPath ??= join(options.privateDir, defaultReadinessFileName);
    options.checklistPath ??= join(options.privateDir, defaultChecklistFileName);
  }

  return options;
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
}

function octalMode(path) {
  return (statSync(path).mode & 0o777).toString(8);
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function assertSafeWritePath(writePath) {
  return assertSafePrivatePath(writePath, 'private input audit');
}

function summarizePath(path, expectedMode) {
  if (!path) return { configured: false, exists: false, expectedMode, actualMode: '', privatePath: false, ready: false };
  const target = resolve(process.cwd(), path);
  if (!existsSync(target)) return { configured: true, exists: false, path: target, expectedMode, actualMode: '', privatePath: isPrivatePath(target), ready: false };
  const actualMode = octalMode(target);
  const privatePath = isPrivatePath(target);
  return {
    configured: true,
    exists: true,
    path: target,
    expectedMode,
    actualMode,
    privatePath,
    ready: actualMode === expectedMode && privatePath,
  };
}

function aggregateMissingFields(invalidMappings, requiredFields) {
  return Object.fromEntries(
    requiredFields.map((field) => [field, invalidMappings.filter((item) => item.missingFields.includes(field)).length]).filter(([, count]) => count > 0),
  );
}

function mappingAudit(options, mappingTemplate) {
  const file = summarizePath(options.mappingPath, '600');
  if (!file.exists) {
    return {
      status: 'blocked',
      file,
      blockers: [{ type: file.configured ? 'missing-mapping-file' : 'missing-mapping-path' }],
      coverage: {
        status: 'blocked',
        totalRequiredItems: mappingTemplate.mappings.reduce((sum, item) => sum + item.minimumMappedItems, 0),
        totalMappedItems: 0,
        missingItemCount: mappingTemplate.mappings.reduce((sum, item) => sum + item.minimumMappedItems, 0),
      },
      sourceCoverage: mappingTemplate.mappings.map((item) => ({
        sourceId: item.sourceId,
        required: item.minimumMappedItems,
        mapped: 0,
        missing: item.minimumMappedItems,
        status: 'missing-mapping',
      })),
      missingRequiredFieldCounts: {},
      invalidRowCounts: {},
    };
  }

  const dryRun = buildAmazonCommerceDryRun({
    mappingPath: file.path,
    site: options.site,
    marketplaceId: options.marketplaceId,
    windowStart: options.windowStart,
    windowEnd: options.windowEnd,
  });
  const invalidMappings = dryRun.mapping.invalidMappings;
  const invalidRowCounts = {
    missingRequiredFields: invalidMappings.filter((item) => item.missingFields.length > 0).length,
    invalidAsin: invalidMappings.filter((item) => !item.asinValid).length,
    invalidSourceId: invalidMappings.filter((item) => !item.sourceIdAllowed).length,
    siteMismatch: invalidMappings.filter((item) => !item.siteMatches).length,
    marketplaceMismatch: invalidMappings.filter((item) => !item.marketplaceMatches).length,
    invalidStatus: invalidMappings.filter((item) => !item.statusAllowed).length,
    invalidMappingUpdatedAt: invalidMappings.filter((item) => !item.mappingUpdatedAtValid).length,
  };
  const blockers = [
    ...(file.ready ? [] : [{ type: 'mapping-private-file-boundary' }]),
    ...(dryRun.mappingCoverage.status === 'ready' ? [] : [{ type: 'mapping-coverage-blocked', missingItemCount: dryRun.mappingCoverage.missingItemCount }]),
    ...(dryRun.mapping.invalidMappingCount === 0 ? [] : [{ type: 'invalid-mapping-rows', count: dryRun.mapping.invalidMappingCount }]),
    ...(dryRun.mapping.duplicateMappingCount === 0 ? [] : [{ type: 'duplicate-mapping-rows', count: dryRun.mapping.duplicateMappingCount }]),
  ];

  return {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    file,
    blockers,
    counts: {
      mappingCount: dryRun.mapping.mappingCount,
      validMappingCount: dryRun.mapping.validMappingCount,
      uniqueValidMappingCount: dryRun.mapping.uniqueValidMappingCount,
      invalidMappingCount: dryRun.mapping.invalidMappingCount,
      duplicateMappingCount: dryRun.mapping.duplicateMappingCount,
    },
    coverage: {
      status: dryRun.mappingCoverage.status,
      totalRequiredItems: dryRun.mappingCoverage.totalRequiredItems,
      totalMappedItems: dryRun.mappingCoverage.totalMappedItems,
      missingItemCount: dryRun.mappingCoverage.missingItemCount,
      readySourceCount: dryRun.mappingCoverage.readySourceCount,
      missingSourceCount: dryRun.mappingCoverage.missingSourceCount,
    },
    sourceCoverage: dryRun.mappingCoverage.rows.map((item) => ({
      sourceId: item.sourceId,
      required: item.minimumMappedItems,
      mapped: item.mappedItems,
      missing: item.missingItems,
      status: item.status,
    })),
    missingRequiredFieldCounts: aggregateMissingFields(invalidMappings, mappingTemplate.requiredFields),
    invalidRowCounts,
  };
}

function normalizeReadiness(payload) {
  if (payload && typeof payload === 'object' && payload.readiness && typeof payload.readiness === 'object') return payload.readiness;
  return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
}

function findForbiddenKeys(value, prefix = '') {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [...(forbiddenReadinessKeyPattern.test(key) ? [path] : []), ...findForbiddenKeys(nestedValue, path)];
  });
}

function readinessAudit(options, readinessTemplate) {
  const file = summarizePath(options.readinessPath, '600');
  if (!file.exists) {
    return {
      status: 'blocked',
      file,
      blockers: [{ type: file.configured ? 'missing-readiness-file' : 'missing-readiness-path' }],
      missingRequiredFields: readinessTemplate.requiredBeforeRealConnector,
      invalidDateFields: [],
      missingSnapshotTypes: readinessTemplate.expectedSnapshotTypes,
      forbiddenFieldNames: [],
    };
  }

  const readiness = normalizeReadiness(readJson(file.path));
  const missingRequiredFields = readinessTemplate.requiredBeforeRealConnector.filter((field) => {
    const value = readiness[field];
    return Array.isArray(value) ? value.length === 0 : !value;
  });
  const dateFields = ['authorizationApprovedAt', 'collectionWindowStart', 'collectionWindowEnd', 'reviewApprovedAt'];
  const invalidDateFields = dateFields.filter((field) => readiness[field] && !isIsoDate(readiness[field]));
  const collectionWindowOrderInvalid =
    isIsoDate(readiness.collectionWindowStart) && isIsoDate(readiness.collectionWindowEnd)
      ? readiness.collectionWindowStart > readiness.collectionWindowEnd
      : false;
  const allowedSnapshotTypes = Array.isArray(readiness.allowedSnapshotTypes) ? readiness.allowedSnapshotTypes : [];
  const missingSnapshotTypes = readinessTemplate.expectedSnapshotTypes.filter((snapshotType) => !allowedSnapshotTypes.includes(snapshotType));
  const forbiddenFieldNames = findForbiddenKeys(readiness);
  const blockers = [
    ...(file.ready ? [] : [{ type: 'readiness-private-file-boundary' }]),
    ...(missingRequiredFields.length ? [{ type: 'missing-readiness-fields', fields: missingRequiredFields }] : []),
    ...(invalidDateFields.length ? [{ type: 'invalid-readiness-date-fields', fields: invalidDateFields }] : []),
    ...(collectionWindowOrderInvalid ? [{ type: 'invalid-collection-window-order' }] : []),
    ...(readiness.complianceReviewStatus === 'approved' ? [] : [{ type: 'missing-compliance-approval' }]),
    ...(missingSnapshotTypes.length ? [{ type: 'snapshot-scope-incomplete', missingSnapshotTypes }] : []),
    ...(forbiddenFieldNames.length ? [{ type: 'secret-like-readiness-field', fields: forbiddenFieldNames }] : []),
  ];

  return {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    file,
    blockers,
    missingRequiredFields,
    invalidDateFields,
    collectionWindowOrderInvalid,
    missingSnapshotTypes,
    forbiddenFieldNames,
  };
}

function checklistAudit(options, mappingTemplate, readinessTemplate) {
  const file = summarizePath(options.checklistPath, '600');
  const expectedTotal = mappingTemplate.mappings.reduce((sum, item) => sum + item.minimumMappedItems, 0);
  if (!file.exists) {
    return {
      status: 'blocked',
      file,
      blockers: [{ type: file.configured ? 'missing-checklist-file' : 'missing-checklist-path' }],
      missingChecklistItems: ['checklist-file'],
    };
  }

  const text = readFileSync(file.path, 'utf8');
  const expectedItems = [
    { key: `totalMinimumMappedItems: ${expectedTotal}`, label: 'totalMinimumMappedItems' },
    ...mappingTemplate.mappings.map((item) => ({
      key: `| [ ] | ${item.sourceId} | ${item.site} | ${item.marketplaceId} | ${item.minimumMappedItems} |`,
      label: `source:${item.sourceId}`,
    })),
    ...mappingTemplate.requiredFields.map((field) => ({ key: `\`${field}\``, label: `mappingField:${field}` })),
    ...readinessTemplate.requiredBeforeRealConnector.map((field) => ({ key: `\`${field}\``, label: `readinessField:${field}` })),
    ...readinessTemplate.expectedSnapshotTypes.map((snapshotType) => ({ key: snapshotType, label: `snapshotType:${snapshotType}` })),
    { key: 'networkCalls=0', label: 'networkCallsBoundary' },
    { key: 'businessDataWrites=0', label: 'businessDataWritesBoundary' },
  ];
  const missingChecklistItems = expectedItems.filter((item) => !text.includes(item.key)).map((item) => item.label);
  const blockers = [
    ...(file.ready ? [] : [{ type: 'checklist-private-file-boundary' }]),
    ...(missingChecklistItems.length ? [{ type: 'checklist-items-missing', missingChecklistItems }] : []),
  ];

  return {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    file,
    blockers,
    missingChecklistItems,
  };
}

function buildAudit(options) {
  const mappingTemplate = readJson(mappingTemplatePath);
  const readinessTemplate = readJson(readinessTemplatePath);
  const mapping = mappingAudit(options, mappingTemplate);
  const readiness = readinessAudit(options, readinessTemplate);
  const checklist = checklistAudit(options, mappingTemplate, readinessTemplate);
  const blockers = [
    ...mapping.blockers.map((item) => ({ scope: 'mapping', ...item })),
    ...readiness.blockers.map((item) => ({ scope: 'readiness', ...item })),
    ...checklist.blockers.map((item) => ({ scope: 'checklist', ...item })),
  ];

  return {
    schemaVersion: 1,
    connectorId,
    mode: 'private-input-audit',
    generatedAt: new Date().toISOString(),
    status: blockers.length === 0 ? 'ready-for-readiness-gate' : 'blocked',
    safety: {
      credentialValuesRedacted: true,
      businessValuesRedacted: true,
      asinValuesRedacted: true,
      skuValuesRedacted: true,
      authorizationValuesRedacted: true,
      ownerValuesRedacted: true,
      networkCalls: 0,
      businessDataWrites: 0,
      publicBundleAllowed: false,
      gitAllowed: false,
    },
    blockers,
    mapping,
    readiness,
    checklist,
  };
}

function writeAudit(writePath, audit, force) {
  const target = assertSafeWritePath(writePath);
  if (existsSync(target) && !force) {
    chmodSync(target, 0o600);
    return { path: target, status: 'exists', overwritten: false, mode: '600' };
  }

  const existedBefore = existsSync(target);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  writeFileSync(target, `${JSON.stringify(audit, null, 2)}\n`, { mode: 0o600 });
  chmodSync(dirname(target), 0o700);
  chmodSync(target, 0o600);
  return { path: target, status: existedBefore ? 'replaced' : 'created', overwritten: existedBefore, mode: '600' };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const audit = buildAudit(options);
  if (!options.writePath) {
    process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
    return;
  }

  const writeResult = writeAudit(options.writePath, audit, options.force);
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, connectorId, generatedAt: new Date().toISOString(), audit: writeResult, status: audit.status }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
