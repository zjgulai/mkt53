#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

const TARGET_SOURCE_IDS = ['ds-002', 'ds-044', 'ds-045'];
const ALLOWED_DECISIONS = new Set([
  'accepted_for_l1_public_context',
  'blocked_source_inconsistency',
  'blocked_access',
]);
const FALSE_BOUNDARIES = [
  'providerCalls',
  'restrictedConnectorAccess',
  'productionWrites',
  'deployment',
  'automaticSourceRegistryWrites',
  'productionSourceRegistryWrites',
  'pageWrites',
  'csvFactExport',
  'factPromotion',
  'decisionReady',
];
const TRUE_BOUNDARIES = ['localSourceRegistryContractPatch'];
const SHA256_RE = /^[a-f0-9]{64}$/i;

function parseArgs(argv) {
  const options = {
    capturePath: undefined,
    reviewPath: undefined,
    writePath: undefined,
    json: argv.includes('--json'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--capture') options.capturePath = argv[index + 1];
    if (argv[index] === '--review') options.reviewPath = argv[index + 1];
    if (argv[index] === '--write') options.writePath = argv[index + 1];
  }
  return options;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value, { nonEmpty = false } = {}) {
  return Array.isArray(value)
    && (!nonEmpty || value.length > 0)
    && value.every(isNonEmptyString);
}

function isCanonicalIsoTimestamp(value) {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isHttpsUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function hasSameHttpsOrigin(sourceUrl, finalUrl) {
  return isHttpsUrl(sourceUrl)
    && isHttpsUrl(finalUrl)
    && new URL(sourceUrl).origin === new URL(finalUrl).origin;
}

function readJson(path, label) {
  if (!path) throw new Error(`${label} path is required.`);
  const resolvedPath = resolve(process.cwd(), path);
  try {
    return JSON.parse(readFileSync(resolvedPath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function captureBlockers(record) {
  const sourceId = record?.sourceId ?? 'unknown-source';
  const blockers = [];
  if (!isRecord(record)) return [`${sourceId}:capture-record-invalid`];
  const contentCaptured = record.captureStatus === 'captured';
  const accessBlocked = record.captureStatus === 'source-error' && record.httpStatus === 403;
  if (!contentCaptured && !accessBlocked) blockers.push(`${sourceId}:capture-status-not-recognized`);
  if (!isCanonicalIsoTimestamp(record.capturedAt)) blockers.push(`${sourceId}:captured-at-invalid`);
  if (!isNonEmptyString(record.title)) blockers.push(`${sourceId}:capture-title-missing`);
  if (!hasSameHttpsOrigin(record.url, record.finalUrl)) blockers.push(`${sourceId}:capture-final-url-origin-invalid`);
  if (!SHA256_RE.test(record.visibleTextHash ?? '')) blockers.push(`${sourceId}:capture-visible-text-hash-invalid`);
  if (contentCaptured && !isStringArray(record.matchedEvidenceTerms, { nonEmpty: true })) {
    blockers.push(`${sourceId}:matched-evidence-terms-missing`);
  }
  if (contentCaptured && (!Array.isArray(record.missingEvidenceTerms) || record.missingEvidenceTerms.length > 0)) {
    blockers.push(`${sourceId}:expected-evidence-terms-missing`);
  }
  if (contentCaptured && (!Array.isArray(record.warnings) || record.warnings.length > 0)) {
    blockers.push(`${sourceId}:capture-warnings-present`);
  }
  if (contentCaptured && (!Array.isArray(record.pageErrors) || record.pageErrors.length > 0)) {
    blockers.push(`${sourceId}:capture-page-errors-present`);
  }
  if (accessBlocked && (!Array.isArray(record.missingEvidenceTerms) || record.missingEvidenceTerms.length === 0)) {
    blockers.push(`${sourceId}:blocked-access-must-record-missing-terms`);
  }
  if (record.notFullPlatformDataset !== true) blockers.push(`${sourceId}:full-platform-dataset-boundary-invalid`);
  if (record.publicBundleAllowed !== true) blockers.push(`${sourceId}:public-bundle-policy-invalid`);
  if (record.rawTextPublicBundleAllowed !== false) blockers.push(`${sourceId}:raw-text-public-bundle-must-be-false`);
  if (record.screenshotPublicBundleAllowed !== false) blockers.push(`${sourceId}:screenshot-public-bundle-must-be-false`);
  if (record.validation?.valid !== true) blockers.push(`${sourceId}:seed-validation-not-passed`);
  if (record.safety?.networkCalls !== 1) blockers.push(`${sourceId}:network-call-count-must-be-one`);
  if (record.safety?.loginAttempted !== false) blockers.push(`${sourceId}:login-attempted`);
  if (record.safety?.bypassAttempted !== false) blockers.push(`${sourceId}:bypass-attempted`);
  if (record.safety?.businessDataWrites !== 0) blockers.push(`${sourceId}:business-data-write-detected`);
  if (record.safety?.rawTextWrittenToPublicBundle !== false) blockers.push(`${sourceId}:raw-text-written-to-public-bundle`);
  if (!isRecord(record.localEvidence)) blockers.push(`${sourceId}:local-evidence-missing`);
  if (!isNonEmptyString(record.localEvidence?.textArchivePath)) blockers.push(`${sourceId}:text-archive-path-missing`);
  if (!isNonEmptyString(record.localEvidence?.screenshotPath)) blockers.push(`${sourceId}:screenshot-path-missing`);
  if (!SHA256_RE.test(record.localEvidence?.screenshotHash ?? '')) blockers.push(`${sourceId}:screenshot-hash-invalid`);
  return blockers;
}

function resolveManualArtifactPath(value) {
  if (!isNonEmptyString(value)) return undefined;
  const candidates = isAbsolute(value)
    ? [value]
    : [resolve(process.cwd(), value), resolve(process.cwd(), '..', value)];
  return candidates.find(existsSync);
}

function manualObservationBlockers(record, capture) {
  const sourceId = record?.sourceId ?? 'unknown-source';
  const blockers = [];
  const artifactPath = resolveManualArtifactPath(record?.manualObservationArtifactPath);
  if (!artifactPath) return [`${sourceId}:manual-observation-artifact-missing`];
  const serialized = readFileSync(artifactPath);
  const artifactHash = createHash('sha256').update(serialized).digest('hex');
  if (artifactHash !== record.manualObservationArtifactSha256) {
    blockers.push(`${sourceId}:manual-observation-artifact-hash-mismatch`);
  }

  let artifact;
  try {
    artifact = JSON.parse(serialized.toString('utf8'));
  } catch {
    return [...blockers, `${sourceId}:manual-observation-artifact-invalid-json`];
  }
  if (artifact.gate !== 'DQ-014') blockers.push(`${sourceId}:manual-observation-gate-invalid`);
  if (artifact.sourceId !== sourceId) blockers.push(`${sourceId}:manual-observation-source-id-mismatch`);
  if (artifact.canonicalUrl !== capture?.url) blockers.push(`${sourceId}:manual-observation-url-mismatch`);
  if (!isCanonicalIsoTimestamp(artifact.accessedAt)) blockers.push(`${sourceId}:manual-observation-accessed-at-invalid`);
  if (artifact.retrievedVia !== 'official-public-page-read-only') {
    blockers.push(`${sourceId}:manual-observation-retrieval-method-invalid`);
  }
  if (artifact.evidenceGrade !== 'L1-public-or-runtime') blockers.push(`${sourceId}:manual-observation-grade-must-remain-l1`);
  if (!isNonEmptyString(artifact.pageTitle)) blockers.push(`${sourceId}:manual-observation-title-missing`);
  if (!isStringArray(artifact.observedFacts, { nonEmpty: true })) blockers.push(`${sourceId}:manual-observed-facts-missing`);
  if (!Array.isArray(artifact.contradictions)) blockers.push(`${sourceId}:manual-contradictions-must-be-array`);
  if (!isStringArray(artifact.limitations, { nonEmpty: true })) blockers.push(`${sourceId}:manual-limitations-missing`);
  const expectedBoundaries = {
    loginAttempted: false,
    bypassAttempted: false,
    paidReportExtracted: false,
    rawPageTextStored: false,
    businessDataWrites: 0,
    productionWrites: false,
  };
  for (const [boundary, expected] of Object.entries(expectedBoundaries)) {
    if (artifact.boundaries?.[boundary] !== expected) {
      blockers.push(`${sourceId}:manual-boundary-${boundary}-invalid`);
    }
  }
  return blockers;
}

function reviewBlockers(record, capture) {
  const sourceId = record?.sourceId ?? 'unknown-source';
  const blockers = [];
  if (!isRecord(record)) return [`${sourceId}:review-record-invalid`];
  if (!capture) return [`${sourceId}:capture-record-missing`];
  if (record.canonicalUrl !== capture.url) blockers.push(`${sourceId}:canonical-url-mismatch`);
  if (record.captureVisibleTextHash !== capture.visibleTextHash) {
    blockers.push(`${sourceId}:capture-visible-text-hash-mismatch`);
  }
  blockers.push(...manualObservationBlockers(record, capture));
  if (!isNonEmptyString(record.reviewerAlias)) blockers.push(`${sourceId}:reviewer-alias-missing`);
  if (!isCanonicalIsoTimestamp(record.reviewedAt)) blockers.push(`${sourceId}:reviewed-at-invalid`);
  if (record.evidenceGrade !== 'L1-public-or-runtime') blockers.push(`${sourceId}:evidence-grade-must-remain-l1`);
  if (!ALLOWED_DECISIONS.has(record.decision)) blockers.push(`${sourceId}:review-decision-invalid`);
  if (!isStringArray(record.supportedClaims, { nonEmpty: true })) blockers.push(`${sourceId}:supported-claims-missing`);
  if (!isStringArray(record.forbiddenClaims, { nonEmpty: true })) blockers.push(`${sourceId}:forbidden-claims-missing`);
  if (!isStringArray(record.limitations, { nonEmpty: true })) blockers.push(`${sourceId}:limitations-missing`);
  if (!Array.isArray(record.contradictions)) blockers.push(`${sourceId}:contradictions-must-be-array`);
  if (record.decision === 'accepted_for_l1_public_context' && (record.contradictions?.length ?? 0) > 0) {
    blockers.push(`${sourceId}:contradictory-source-cannot-be-accepted`);
  }
  if (record.decision === 'blocked_source_inconsistency' && (record.contradictions?.length ?? 0) === 0) {
    blockers.push(`${sourceId}:blocked-inconsistency-requires-contradiction`);
  }
  if (sourceId === 'ds-045' && record.decision !== 'blocked_source_inconsistency') {
    blockers.push('ds-045:known-page-inconsistency-must-remain-blocked');
  }
  if (record.sourceRegistryPatchAllowed !== true) blockers.push(`${sourceId}:local-source-registry-patch-must-be-true`);
  if (record.factPromotion !== false) blockers.push(`${sourceId}:fact-promotion-must-be-false`);
  if (record.decisionReady !== false) blockers.push(`${sourceId}:decision-ready-must-be-false`);
  return blockers;
}

export function validateDq014Receipts(captureManifest, reviewReceipt) {
  const blockers = [];
  if (!isRecord(captureManifest)) blockers.push('capture-manifest-invalid');
  if (!isRecord(reviewReceipt)) blockers.push('review-receipt-invalid');
  if (captureManifest?.mode !== 'live-browser-capture') blockers.push('capture-mode-must-be-live-browser-capture');
  if (reviewReceipt?.gate !== 'DQ-014') blockers.push('review-gate-must-be-DQ-014');
  if (!isCanonicalIsoTimestamp(reviewReceipt?.reviewedAt)) blockers.push('reviewed-at-invalid');
  if (reviewReceipt?.maximumEvidenceGrade !== 'L1-public-or-runtime') {
    blockers.push('maximum-evidence-grade-must-remain-l1');
  }
  for (const boundary of FALSE_BOUNDARIES) {
    if (reviewReceipt?.boundaries?.[boundary] !== false) {
      blockers.push(`boundary-${boundary}-must-be-false`);
    }
  }
  for (const boundary of TRUE_BOUNDARIES) {
    if (reviewReceipt?.boundaries?.[boundary] !== true) {
      blockers.push(`boundary-${boundary}-must-be-true`);
    }
  }

  const captureRecords = Array.isArray(captureManifest?.records) ? captureManifest.records : [];
  const reviewRecords = Array.isArray(reviewReceipt?.records) ? reviewReceipt.records : [];
  const captureBySource = new Map(captureRecords.map((record) => [record.sourceId, record]));
  const reviewBySource = new Map(reviewRecords.map((record) => [record.sourceId, record]));
  if (captureRecords.length !== TARGET_SOURCE_IDS.length || captureBySource.size !== TARGET_SOURCE_IDS.length) {
    blockers.push('capture-record-set-must-contain-exactly-three-unique-sources');
  }
  if (reviewRecords.length !== TARGET_SOURCE_IDS.length || reviewBySource.size !== TARGET_SOURCE_IDS.length) {
    blockers.push('review-record-set-must-contain-exactly-three-unique-sources');
  }

  const perSource = TARGET_SOURCE_IDS.map((sourceId) => {
    const capture = captureBySource.get(sourceId);
    const review = reviewBySource.get(sourceId);
    const sourceBlockers = [
      ...(capture ? captureBlockers(capture) : [`${sourceId}:capture-record-missing`]),
      ...(review ? reviewBlockers(review, capture) : [`${sourceId}:review-record-missing`]),
    ];
    blockers.push(...sourceBlockers);
    return {
      sourceId,
      captureStatus: capture?.captureStatus ?? 'missing',
      evidenceGrade: review?.evidenceGrade ?? 'missing',
      reviewDecision: review?.decision ?? 'missing',
      validationStatus: sourceBlockers.length === 0 ? 'passed' : 'blocked',
      blockers: sourceBlockers,
      factPromotion: false,
      decisionReady: false,
    };
  });

  const uniqueBlockers = [...new Set(blockers)];
  const validationPassed = uniqueBlockers.length === 0;
  return {
    schemaVersion: 1,
    gate: 'DQ-014',
    decision: validationPassed ? 'allowed-with-label' : 'blocked',
    maximumEvidenceGrade: 'L1-public-or-runtime',
    supportedClaim:
      'Three current public landing-page receipts were reviewed; accepted records remain bounded L1 context and ds-045 remains blocked for source inconsistency.',
    forbiddenClaims: [
      'No receipt proves a paid report dataset, brand share, channel share, SAM, SOM, sales, production readiness, or decision readiness.',
      'No receipt authorizes automatic or production registry writes, page fact promotion, CSV fact export, deployment, provider calls, or restricted connector access; only the reviewed local registry contract patch is in scope.',
    ],
    summary: {
      targetSourceCount: TARGET_SOURCE_IDS.length,
      validCaptureCount: perSource.filter((row) => row.captureStatus === 'captured' && !row.blockers.some((item) => item.includes('capture-'))).length,
      validCaptureDiagnosticCount: perSource.filter((row) => !row.blockers.some((item) => item.includes('capture-'))).length,
      automationAccessBlockedCount: perSource.filter((row) => row.captureStatus === 'source-error').length,
      manualObservationArtifactCount: perSource.filter((row) => !row.blockers.some((item) => item.includes('manual-observation'))).length,
      acceptedL1Count: perSource.filter((row) => row.reviewDecision === 'accepted_for_l1_public_context' && row.validationStatus === 'passed').length,
      blockedSourceInconsistencyCount: perSource.filter((row) => row.reviewDecision === 'blocked_source_inconsistency').length,
      blockedAccessCount: perSource.filter((row) => row.reviewDecision === 'blocked_access').length,
      decisionReadyCount: 0,
      factPromotionCount: 0,
      validationPassed,
    },
    boundaries: {
      ...Object.fromEntries(FALSE_BOUNDARIES.map((boundary) => [boundary, false])),
      ...Object.fromEntries(TRUE_BOUNDARIES.map((boundary) => [boundary, true])),
    },
    perSource,
    blockers: uniqueBlockers,
  };
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const captureManifest = readJson(options.capturePath, 'capture manifest');
  const reviewReceipt = readJson(options.reviewPath, 'review receipt');
  const result = validateDq014Receipts(captureManifest, reviewReceipt);

  if (options.writePath) {
    const outputPath = resolve(process.cwd(), options.writePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  }
  if (options.json || !options.writePath) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.summary.validationPassed) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    const payload = {
      schemaVersion: 1,
      gate: 'DQ-014',
      decision: 'blocked',
      blockers: [error instanceof Error ? error.message : String(error)],
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exitCode = 1;
  }
}
