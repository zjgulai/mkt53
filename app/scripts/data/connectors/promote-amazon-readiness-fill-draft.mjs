#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertSafePrivatePath } from '../lib/private-path-safety.mjs';

const connectorId = 'amazon-commerce';
const defaultTargetDir = process.env.MKT53_AMAZON_PRIVATE_DIR ?? 'configs/private';
const defaultInputFileName = 'amazon-commerce-readiness-fill-draft.json';
const defaultOutputFileName = 'amazon-commerce-readiness.json';
const defaultBackupDirName = 'backups';
const readinessTemplatePath = 'scripts/data/connectors/templates/amazon-commerce-readiness-template.json';
const forbiddenReadinessKeyPattern = /secret|password|refreshToken|accessToken|clientSecret|privateKey|authorizationHeader/i;

function parseArgs(argv) {
  const options = {
    privateDir: defaultTargetDir,
    inputPath: undefined,
    outputPath: undefined,
    backupDir: undefined,
    writeFinal: argv.includes('--write-final'),
    windowStart: '2026-06-01',
    windowEnd: '2026-06-15',
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--private-dir') options.privateDir = argv[i + 1];
    if (argv[i] === '--input') options.inputPath = argv[i + 1];
    if (argv[i] === '--output') options.outputPath = argv[i + 1];
    if (argv[i] === '--backup-dir') options.backupDir = argv[i + 1];
    if (argv[i] === '--window-start') options.windowStart = argv[i + 1];
    if (argv[i] === '--window-end') options.windowEnd = argv[i + 1];
  }

  return options;
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
}

function normalizeReadiness(payload) {
  if (payload && typeof payload === 'object' && payload.readiness && typeof payload.readiness === 'object') return payload.readiness;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload;
  throw new Error('Amazon readiness fill draft must be an object or an object with a readiness object.');
}

function normalizeValue(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeReadinessFields(readiness) {
  return Object.fromEntries(Object.entries(readiness).map(([key, value]) => [key, normalizeValue(value)]));
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function findForbiddenReadinessKeys(value, prefix = '') {
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const ownMatches = forbiddenReadinessKeyPattern.test(key) ? [path] : [];
    return [...ownMatches, ...findForbiddenReadinessKeys(nestedValue, path)];
  });
}

function hasRequiredValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function validateReadiness(readiness, template, options) {
  const requiredFields = template.requiredBeforeRealConnector;
  const expectedSnapshotTypes = template.expectedSnapshotTypes;
  const allowedComplianceReviewStatuses = new Set(template.allowedComplianceReviewStatuses);
  const dateFields = ['authorizationApprovedAt', 'collectionWindowStart', 'collectionWindowEnd', 'reviewApprovedAt'];
  const missingRequiredFields = requiredFields.filter((field) => !hasRequiredValue(readiness[field]));
  const invalidDateFields = dateFields.filter((field) => readiness[field] && !isIsoDate(readiness[field]));
  const collectionWindowOrderInvalid =
    isIsoDate(readiness.collectionWindowStart) && isIsoDate(readiness.collectionWindowEnd)
      ? readiness.collectionWindowStart > readiness.collectionWindowEnd
      : false;
  const collectionWindowMatchesExpected =
    readiness.collectionWindowStart === options.windowStart && readiness.collectionWindowEnd === options.windowEnd;
  const allowedSnapshotTypes = Array.isArray(readiness.allowedSnapshotTypes) ? readiness.allowedSnapshotTypes : [];
  const missingSnapshotTypes = expectedSnapshotTypes.filter((snapshotType) => !allowedSnapshotTypes.includes(snapshotType));
  const forbiddenFieldNames = findForbiddenReadinessKeys(readiness);
  const complianceReviewStatusValid = allowedComplianceReviewStatuses.has(readiness.complianceReviewStatus);
  const blockers = [
    ...(missingRequiredFields.length ? [{ type: 'missing-readiness-fields', fields: missingRequiredFields }] : []),
    ...(invalidDateFields.length ? [{ type: 'invalid-readiness-date-fields', fields: invalidDateFields }] : []),
    ...(collectionWindowOrderInvalid ? [{ type: 'invalid-collection-window-order' }] : []),
    ...(!collectionWindowMatchesExpected
      ? [{ type: 'collection-window-mismatch', expectedStart: options.windowStart, expectedEnd: options.windowEnd }]
      : []),
    ...(complianceReviewStatusValid ? [] : [{ type: 'invalid-compliance-review-status' }]),
    ...(missingSnapshotTypes.length ? [{ type: 'snapshot-scope-incomplete', missingSnapshotTypes }] : []),
    ...(forbiddenFieldNames.length ? [{ type: 'secret-like-readiness-field', fields: forbiddenFieldNames }] : []),
  ];

  return {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    blockers,
    checks: {
      requiredFields: {
        status: missingRequiredFields.length === 0 ? 'ready' : 'blocked',
        missingRequiredFields,
      },
      dates: {
        status: invalidDateFields.length === 0 ? 'ready' : 'blocked',
        invalidDateFields,
      },
      collectionWindow: {
        status: !collectionWindowOrderInvalid && collectionWindowMatchesExpected ? 'ready' : 'blocked',
        expectedStart: options.windowStart,
        expectedEnd: options.windowEnd,
        orderInvalid: collectionWindowOrderInvalid,
        matchesExpected: collectionWindowMatchesExpected,
      },
      complianceReview: {
        status: complianceReviewStatusValid ? 'ready' : 'blocked',
      },
      snapshotScope: {
        status: missingSnapshotTypes.length === 0 ? 'ready' : 'blocked',
        expectedSnapshotTypes,
        allowedSnapshotTypeCount: allowedSnapshotTypes.length,
        missingSnapshotTypes,
      },
      privateBoundary: {
        status: forbiddenFieldNames.length === 0 ? 'ready' : 'blocked',
        forbiddenFieldNames,
      },
    },
  };
}

function timestampForFile(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function writeFinalReadiness(outputPath, backupDir, payload, generatedAt) {
  const existedBefore = existsSync(outputPath);
  let backup;

  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  chmodSync(dirname(outputPath), 0o700);

  if (existedBefore) {
    mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    chmodSync(backupDir, 0o700);
    const backupPath = join(backupDir, `amazon-commerce-readiness-backup-${timestampForFile(generatedAt)}.json`);
    writeFileSync(backupPath, readFileSync(outputPath), { mode: 0o600 });
    chmodSync(backupPath, 0o600);
    backup = {
      path: backupPath,
      status: 'created',
      mode: '600',
      originalMode: (statSync(outputPath).mode & 0o777).toString(8),
    };
  }

  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  chmodSync(outputPath, 0o600);
  return {
    path: outputPath,
    status: existedBefore ? 'replaced' : 'created',
    overwritten: existedBefore,
    mode: '600',
    backup,
  };
}

export function promoteAmazonReadinessFillDraft(options) {
  const privateDir = assertSafePrivatePath(options.privateDir, 'readiness promotion private directory');
  const inputPath = assertSafePrivatePath(options.inputPath ?? join(privateDir, defaultInputFileName), 'readiness fill draft input');
  const outputPath = assertSafePrivatePath(options.outputPath ?? join(privateDir, defaultOutputFileName), 'readiness final output');
  const backupDir = assertSafePrivatePath(options.backupDir ?? join(privateDir, defaultBackupDirName), 'readiness backup directory');
  const template = readJson(readinessTemplatePath);
  const readiness = normalizeReadinessFields(normalizeReadiness(readJson(inputPath)));
  const validation = validateReadiness(readiness, template, options);
  const generatedAt = new Date();
  const promotedPayload = {
    schemaVersion: 1,
    connectorId,
    privateData: true,
    publicBundleAllowed: false,
    gitAllowed: false,
    promotedAt: generatedAt.toISOString(),
    sourcePath: inputPath,
    readiness,
  };
  const output =
    validation.status === 'ready' && options.writeFinal
      ? writeFinalReadiness(outputPath, backupDir, promotedPayload, generatedAt)
      : {
          path: outputPath,
          status: validation.status === 'ready' ? 'ready-not-written' : 'blocked-not-written',
          overwritten: false,
          mode: existsSync(outputPath) ? (statSync(outputPath).mode & 0o777).toString(8) : '',
        };

  return {
    schemaVersion: 1,
    connectorId,
    mode: 'readiness-fill-draft-promotion',
    generatedAt: generatedAt.toISOString(),
    status: validation.status === 'ready' ? (options.writeFinal ? 'promoted' : 'ready-to-promote') : 'blocked',
    input: {
      path: inputPath,
    },
    output,
    validation,
    safety: {
      credentialValuesRedacted: true,
      authorizationValuesRedacted: true,
      ownerValuesRedacted: true,
      businessValuesRedacted: true,
      networkCalls: 0,
      businessDataWrites: 0,
      privateInputWrites: validation.status === 'ready' && options.writeFinal ? 1 : 0,
      publicBundleAllowed: false,
      gitAllowed: false,
      requiresExplicitWriteFinal: true,
    },
    nextCommands:
      validation.status === 'ready'
        ? [
            options.writeFinal
              ? `MKT53_AMAZON_READINESS_PATH=${outputPath} npm run data:connector:amazon:readiness`
              : `npm run data:connector:amazon:readiness:promote -- --private-dir ${privateDir} --write-final`,
            `npm run data:connector:amazon:private:audit -- --private-dir ${privateDir}`,
          ]
        : [
            'Fill authorization record, collection window, owner review, compliance review and snapshot scope before promotion.',
            `MKT53_AMAZON_READINESS_PATH=${inputPath} npm run data:connector:amazon:readiness`,
          ],
  };
}

async function main() {
  const manifest = promoteAmazonReadinessFillDraft(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
