#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDq020AmazonOwnerIntakeBundle } from './validate-dq020-amazon-owner-intake.mjs';
import {
  buildAmazonCommerceDryRun,
  buildAmazonCommerceReadinessGate,
} from './connectors/amazon-commerce-dry-run.mjs';
import { buildAmazonCommercePrivateInputAudit } from './connectors/amazon-commerce-private-input-audit.mjs';
import { promoteAmazonMappingFillDraft } from './connectors/promote-amazon-mapping-fill-draft.mjs';
import { promoteAmazonReadinessFillDraft } from './connectors/promote-amazon-readiness-fill-draft.mjs';
import { assertSafePrivatePath } from './lib/private-path-safety.mjs';
import { resolveCurrentPeriodWindow } from './lib/current-period-window.mjs';

const DEFAULT_SPEC = '../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-020-amazon-owner-intake-spec.json';
const DEFAULT_BUNDLE = '../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-020-amazon-owner-intake-20260730';
const DEFAULT_PRIVATE_DIR = process.env.MKT53_AMAZON_PRIVATE_DIR ?? 'configs/private';

function parseArgs(argv) {
  const options = {
    spec: DEFAULT_SPEC,
    bundle: DEFAULT_BUNDLE,
    privateDir: DEFAULT_PRIVATE_DIR,
    manifestPath: process.env.MKT53_PERIODIC_MANIFEST_PATH ?? 'public/periodic-data/latest.json',
    writePath: undefined,
    generatedAt: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--spec') options.spec = argv[index += 1];
    else if (arg === '--bundle') options.bundle = argv[index += 1];
    else if (arg === '--private-dir') options.privateDir = argv[index += 1];
    else if (arg === '--manifest') options.manifestPath = argv[index += 1];
    else if (arg === '--write') options.writePath = argv[index += 1];
    else if (arg === '--generated-at') options.generatedAt = argv[index += 1];
    else if (arg !== '--json') throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function metadata(path) {
  if (!existsSync(path)) {
    return { fileName: basename(path), exists: false, mode: '', size: 0, modifiedAt: null };
  }
  const stat = statSync(path);
  return {
    fileName: basename(path),
    exists: true,
    mode: (stat.mode & 0o777).toString(8),
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
  };
}

function summarizePromotion(promotion, missingDraft) {
  if (!promotion) {
    return {
      status: 'not-run-missing-draft',
      draftExists: false,
      blockerTypes: [missingDraft],
    };
  }
  return {
    status: promotion.status,
    draftExists: true,
    blockerTypes: promotion.validation.blockers.map((blocker) => blocker.type),
    counts: promotion.validation.counts,
    coverage: promotion.validation.coverage
      ? {
          status: promotion.validation.coverage.status,
          totalRequiredItems: promotion.validation.coverage.totalRequiredItems,
          totalMappedItems: promotion.validation.coverage.totalMappedItems,
          missingItemCount: promotion.validation.coverage.missingItemCount,
          readySourceCount: promotion.validation.coverage.readySourceCount,
          missingSourceCount: promotion.validation.coverage.missingSourceCount,
          invalidMappingCount: promotion.validation.coverage.invalidMappingCount,
          duplicateMappingCount: promotion.validation.coverage.duplicateMappingCount,
        }
      : undefined,
    checks: promotion.validation.checks,
  };
}

function summarizeAudit(audit) {
  return {
    status: audit.status,
    blockerTypes: audit.blockers.map((blocker) => `${blocker.scope}:${blocker.type}`),
    mapping: {
      status: audit.mapping.status,
      counts: audit.mapping.counts,
      coverage: audit.mapping.coverage,
      missingRequiredFieldCounts: audit.mapping.missingRequiredFieldCounts,
      invalidRowCounts: audit.mapping.invalidRowCounts,
    },
    readiness: {
      status: audit.readiness.status,
      missingRequiredFields: audit.readiness.missingRequiredFields,
      invalidDateFields: audit.readiness.invalidDateFields,
      collectionWindowOrderInvalid: audit.readiness.collectionWindowOrderInvalid,
      collectionWindowMatchesExpected: audit.readiness.collectionWindowMatchesExpected ?? false,
      expectedCollectionWindow: audit.readiness.expectedCollectionWindow,
      missingSnapshotTypes: audit.readiness.missingSnapshotTypes,
      forbiddenFieldNames: audit.readiness.forbiddenFieldNames,
    },
    checklist: {
      status: audit.checklist.status,
      missingChecklistItems: audit.checklist.missingChecklistItems,
    },
  };
}

function summarizeConnectorGate(gate) {
  return {
    status: gate.status,
    readyCheckIds: gate.checks.filter((check) => check.status === 'ready').map((check) => check.id),
    blockedCheckIds: gate.checks.filter((check) => check.status !== 'ready').map((check) => check.id),
    blockerTypes: gate.blockers.map((blocker) => blocker.type),
    mappingCoverage: gate.mappingCoverage,
  };
}

const mappingOwnerFields = ['asin', 'sku', 'brand', 'productName', 'category', 'mappingOwner'];

function mappingOwnerContentDetected(promotion) {
  if (!promotion) return false;
  const rowCount = promotion.input.rowCount;
  const missing = promotion.validation.missingRequiredFieldCounts;
  return promotion.validation.counts.validMappingCount > 0
    || mappingOwnerFields.some((field) => (missing[field] ?? 0) < rowCount)
    || promotion.validation.invalidRowCounts.invalidMappingUpdatedAt < rowCount;
}

function readinessOwnerContentDetected(promotion) {
  if (!promotion) return false;
  return promotion.validation.checks.ownerContent.detected;
}

export function buildDq020AmazonOwnerEvidenceAcceptance(options = {}) {
  const appRoot = resolve(options.appRoot ?? process.cwd());
  const privateDir = assertSafePrivatePath(options.privateDir ?? DEFAULT_PRIVATE_DIR, 'DQ-020 private directory');
  const specPath = isAbsolute(options.spec ?? DEFAULT_SPEC) ? options.spec ?? DEFAULT_SPEC : resolve(appRoot, options.spec ?? DEFAULT_SPEC);
  const bundlePath = isAbsolute(options.bundle ?? DEFAULT_BUNDLE) ? options.bundle ?? DEFAULT_BUNDLE : resolve(appRoot, options.bundle ?? DEFAULT_BUNDLE);
  const currentWindow = resolveCurrentPeriodWindow({
    manifestPath: options.manifestPath ?? 'public/periodic-data/latest.json',
    appRoot,
  });

  const paths = {
    mappingDraft: join(privateDir, 'amazon-commerce-mapping-fill-draft.json'),
    readinessDraft: join(privateDir, 'amazon-commerce-readiness-fill-draft.json'),
    checklist: join(privateDir, 'amazon-commerce-readiness-checklist.md'),
    formalMapping: join(privateDir, 'amazon-commerce-mapping.json'),
    formalReadiness: join(privateDir, 'amazon-commerce-readiness.json'),
  };
  const files = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, metadata(path)]));
  const draftFileCount = Number(files.mappingDraft.exists) + Number(files.readinessDraft.exists);
  const formalFileCount = Number(files.formalMapping.exists) + Number(files.formalReadiness.exists);
  const selectedMappingPath = files.formalMapping.exists
    ? paths.formalMapping
    : (files.mappingDraft.exists ? paths.mappingDraft : undefined);
  const selectedReadinessPath = files.formalReadiness.exists
    ? paths.formalReadiness
    : (files.readinessDraft.exists ? paths.readinessDraft : undefined);

  const spec = readJson(specPath);
  const packetContract = validateDq020AmazonOwnerIntakeBundle(spec, bundlePath, appRoot);
  const mappingPromotion = files.mappingDraft.exists
    ? promoteAmazonMappingFillDraft({
        privateDir,
        inputPath: paths.mappingDraft,
        outputPath: paths.formalMapping,
        backupDir: join(privateDir, 'backups'),
        writeFinal: false,
        site: 'amazon.com',
        marketplaceId: 'ATVPDKIKX0DER',
      })
    : undefined;
  const readinessPromotion = files.readinessDraft.exists
    ? promoteAmazonReadinessFillDraft({
        privateDir,
        inputPath: paths.readinessDraft,
        outputPath: paths.formalReadiness,
        backupDir: join(privateDir, 'backups'),
        writeFinal: false,
        windowStart: currentWindow.windowStart,
        windowEnd: currentWindow.windowEnd,
      })
    : undefined;
  const draftAudit = buildAmazonCommercePrivateInputAudit({
    privateDir,
    mappingPath: paths.mappingDraft,
    readinessPath: paths.readinessDraft,
    checklistPath: paths.checklist,
    site: 'amazon.com',
    marketplaceId: 'ATVPDKIKX0DER',
    windowStart: currentWindow.windowStart,
    windowEnd: currentWindow.windowEnd,
  });
  const formalAudit = formalFileCount > 0
    ? buildAmazonCommercePrivateInputAudit({
        privateDir,
        mappingPath: paths.formalMapping,
        readinessPath: paths.formalReadiness,
        checklistPath: paths.checklist,
        site: 'amazon.com',
        marketplaceId: 'ATVPDKIKX0DER',
        windowStart: currentWindow.windowStart,
        windowEnd: currentWindow.windowEnd,
      })
    : undefined;
  const dryRun = buildAmazonCommerceDryRun(
    {
      appRoot,
      mappingPath: selectedMappingPath,
      site: 'amazon.com',
      marketplaceId: 'ATVPDKIKX0DER',
      windowStart: currentWindow.windowStart,
      windowEnd: currentWindow.windowEnd,
      source: currentWindow.source,
      period: currentWindow.period,
    },
    {},
  );
  const connectorGate = buildAmazonCommerceReadinessGate(
    dryRun,
    { readinessPath: selectedReadinessPath },
    {},
  );

  const localContractReady = packetContract.localContractDecision === 'allowed-intake-template-only';
  const ownerSubmissionDetected = mappingOwnerContentDetected(mappingPromotion)
    || readinessOwnerContentDetected(readinessPromotion);
  const draftValidationReady = Boolean(mappingPromotion?.status === 'ready-to-promote'
    && readinessPromotion?.status === 'ready-to-promote'
    && draftAudit.status === 'ready-for-readiness-gate');
  const ownerSubmissionComplete = draftFileCount === 2 && draftValidationReady;
  const ownerSubmissionPartial = ownerSubmissionDetected && !ownerSubmissionComplete;
  const promotionStatus = formalFileCount === 2
    ? 'promoted-private-files-present'
    : formalFileCount === 1
      ? 'partial-private-promotion'
      : 'not-promoted';
  const acceptanceStatus = !localContractReady
    ? 'blocked-local-contract'
    : ownerSubmissionComplete
      ? 'ready-for-independent-owner-review'
      : draftFileCount === 1 && ownerSubmissionDetected
        ? 'blocked-partial-owner-submission'
        : ownerSubmissionPartial
          ? 'blocked-owner-submission-incomplete'
          : 'blocked-no-owner-submission';

  return {
    schemaVersion: 2,
    gate: 'DQ-020',
    connectorId: 'amazon-commerce',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    acceptanceStatus,
    maximumEvidenceGrade: 'L2-fixture-or-dry-run',
    sourceEvidenceGrade: 'L0-unverified',
    dq020Closed: false,
    factPromotionAllowed: false,
    currentPeriod: {
      period: currentWindow.period,
      windowStart: currentWindow.windowStart,
      windowEnd: currentWindow.windowEnd,
      source: currentWindow.source,
    },
    packetContract: {
      localContractDecision: packetContract.localContractDecision,
      overallGateDecision: packetContract.overallGateDecision,
      blockers: packetContract.blockers,
      summary: packetContract.summary,
    },
    privateSubmission: {
      status: ownerSubmissionComplete
        ? 'draft-ready-for-independent-review'
        : ownerSubmissionPartial
          ? 'draft-owner-content-incomplete'
          : 'draft-scaffold-only-or-absent',
      draftFileCount,
      draftFilesComplete: draftFileCount === 2,
      ownerSubmissionDetected,
      ownerSubmissionPartial,
      ownerSubmissionComplete,
      draftValidationReady,
      privateDirectoryMode: existsSync(privateDir) ? (statSync(privateDir).mode & 0o777).toString(8) : '',
      files,
      selectedInputKind: 'draft',
    },
    privatePromotion: {
      status: promotionStatus,
      formalFileCount,
      formalFilesComplete: formalFileCount === 2,
      independentlyAuthorizedWriteRequired: true,
    },
    mappingPromotion: summarizePromotion(mappingPromotion, 'missing-mapping-draft'),
    readinessPromotion: summarizePromotion(readinessPromotion, 'missing-readiness-draft'),
    privateAudit: summarizeAudit(draftAudit),
    formalAudit: formalAudit ? summarizeAudit(formalAudit) : null,
    connectorReadiness: summarizeConnectorGate(connectorGate),
    nextGate: acceptanceStatus === 'ready-for-independent-owner-review'
      ? 'independent-owner-compliance-release-review'
      : 'business-owner-private-submission',
    ownerHandoffTodo: [
      'Complete all 67 private mapping rows with authorized ASIN/SKU, product identity, mapping date and mapping owner.',
      `Set the private readiness collection window to ${currentWindow.windowStart}..${currentWindow.windowEnd}.`,
      'Provide authorization record, authorization owner/date, business review owner/date and compliance reviewer evidence in private storage.',
      'Run mapping and readiness promotion without --write-final; obtain ready-to-promote results first.',
      'Have an independent owner/compliance/release reviewer verify the redacted acceptance receipt and immutable private evidence hashes.',
      'Do not load credentials, call Amazon, write snapshots or promote page facts until a separate authorized connector gate is approved.',
    ],
    safety: {
      credentialValuesIncluded: false,
      asinValuesIncluded: false,
      skuValuesIncluded: false,
      ownerValuesIncluded: false,
      authorizationValuesIncluded: false,
      privateFileContentsIncluded: false,
      privateFileHashesIncluded: false,
      networkCalls: 0,
      businessDataWrites: 0,
      privateInputWrites: 0,
      productionWrites: 0,
      deployment: false,
      restrictedConnectorAccess: false,
    },
    disclosures: [
      'This receipt validates only local contracts, private-file metadata and redacted readiness counts.',
      'A ready owner submission still requires independent review, immutable snapshot/hash evidence and separately authorized connector execution before DQ-020 can close.',
    ],
  };
}

function runCli() {
  const options = parseArgs(process.argv.slice(2));
  const payload = buildDq020AmazonOwnerEvidenceAcceptance(options);
  if (options.writePath) {
    const target = isAbsolute(options.writePath) ? options.writePath : resolve(process.cwd(), options.writePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, serializeJson(payload));
  }
  process.stdout.write(serializeJson(payload));
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) runCli();
