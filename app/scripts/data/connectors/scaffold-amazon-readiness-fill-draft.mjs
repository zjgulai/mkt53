#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertSafePrivatePath } from '../lib/private-path-safety.mjs';

const connectorId = 'amazon-commerce';
const defaultTargetDir = process.env.MKT53_AMAZON_PRIVATE_DIR ?? 'configs/private';
const readinessTemplatePath = 'scripts/data/connectors/templates/amazon-commerce-readiness-template.json';
const defaultJsonFileName = 'amazon-commerce-readiness-fill-draft.json';

function parseArgs(argv) {
  const options = {
    targetDir: defaultTargetDir,
    jsonPath: undefined,
    force: argv.includes('--force'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--target-dir') options.targetDir = argv[i + 1];
    if (argv[i] === '--json-path') options.jsonPath = argv[i + 1];
  }

  return options;
}

function readReadinessTemplate() {
  return JSON.parse(readFileSync(resolve(process.cwd(), readinessTemplatePath), 'utf8'));
}

function writePrivateFile(targetPath, content, force) {
  const existedBefore = existsSync(targetPath);
  if (existedBefore && !force) {
    chmodSync(targetPath, 0o600);
    return {
      path: targetPath,
      status: 'exists',
      overwritten: false,
      mode: '600',
    };
  }

  mkdirSync(dirname(targetPath), { recursive: true, mode: 0o700 });
  writeFileSync(targetPath, content.endsWith('\n') ? content : `${content}\n`, { mode: 0o600 });
  chmodSync(dirname(targetPath), 0o700);
  chmodSync(targetPath, 0o600);
  return {
    path: targetPath,
    status: existedBefore ? 'replaced' : 'created',
    overwritten: existedBefore,
    mode: '600',
  };
}

export function scaffoldAmazonReadinessFillDraft(options) {
  const targetDir = assertSafePrivatePath(options.targetDir, 'readiness fill target directory');
  const jsonPath = assertSafePrivatePath(options.jsonPath ?? join(targetDir, defaultJsonFileName), 'readiness JSON fill draft');
  const template = readReadinessTemplate();
  const jsonPayload = {
    schemaVersion: 1,
    connectorId,
    templateName: 'amazon-commerce-readiness-fill-draft',
    privateData: true,
    publicBundleAllowed: false,
    gitAllowed: false,
    generatedAt: new Date().toISOString(),
    targetFinalReadinessPath: 'amazon-commerce-readiness.json',
    expectedCollectionWindow: {
      start: '2026-06-01',
      end: '2026-06-15',
      timezone: 'UTC',
    },
    fillRule:
      'Fill authorizationRecordId, authorizationOwner, authorizationApprovedAt, collectionWindowStart, collectionWindowEnd, reviewOwner, reviewApprovedAt, complianceReviewer, complianceReviewStatus and allowedSnapshotTypes in a private path. Do not paste credentials, tokens, ASIN/SKU values, competitor details, review text, customer data or platform exports into this draft.',
    requiredBeforeRealConnector: template.requiredBeforeRealConnector,
    allowedComplianceReviewStatuses: template.allowedComplianceReviewStatuses,
    expectedSnapshotTypes: template.expectedSnapshotTypes,
    readiness: template.readiness,
  };
  const json = writePrivateFile(jsonPath, JSON.stringify(jsonPayload, null, 2), options.force);

  return {
    schemaVersion: 1,
    connectorId,
    generatedAt: jsonPayload.generatedAt,
    targetDir,
    targetDirMode: '700',
    files: {
      json,
    },
    safety: {
      containsCredentialValues: false,
      containsBusinessAsinSkuValues: false,
      containsAuthorizationValues: false,
      containsOwnerValues: false,
      publicBundleAllowed: false,
      gitAllowed: false,
      overwritesExistingFilesByDefault: false,
    },
    nextCommands: [
      `npm run data:connector:amazon:readiness:promote -- --private-dir ${targetDir}`,
      `npm run data:connector:amazon:readiness:promote -- --private-dir ${targetDir} --write-final`,
      `npm run data:connector:amazon:private:audit -- --private-dir ${targetDir}`,
    ],
  };
}

async function main() {
  const manifest = scaffoldAmazonReadinessFillDraft(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
