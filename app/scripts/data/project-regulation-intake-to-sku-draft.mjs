#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateRegulationSkuContract } from './validate-regulation-sku-contract.mjs';
import { buildRegulationSourceLegalIntakeReport } from './validate-regulation-source-legal-intake.mjs';

export const PROJECTION_SCHEMA_VERSION = 'mkt53.data-reg-intake-draft-projection.v1';
export const WITHDRAWAL_FIXTURE_VERSION = 'mkt53.regulation-intake-withdrawal-fixture.v1';

const REQUIRED_WITHDRAWAL_SURFACES = ['dashboard', 'csv-export', 'report-export'];
const WITHDRAWAL_KEYS = [
  'contractVersion',
  'inputClass',
  'requestId',
  'eventId',
  'withdrawnAt',
  'reason',
  'affectedSurfaces',
  'auditEventRecorded',
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateTime(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

export function canonicalSha256(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function emptyMatrix(generatedAt) {
  return {
    contractVersion: 'mkt53.regulation-sku-matrix.v1',
    evidenceClass: 'synthetic-contract-fixture',
    generatedAt: isIsoDateTime(generatedAt) ? generatedAt : '1970-01-01T00:00:00.000Z',
    records: [],
    disclosure: {
      notLegalAdvice: true,
      officialSnapshots: 0,
      reviewedSkuDecisions: 0,
      publishableComplianceFacts: 0,
    },
  };
}

function validateWithdrawalFixture(withdrawal, requestId) {
  if (withdrawal === null || withdrawal === undefined) return { valid: true, errors: [] };
  const errors = [];
  if (!isObject(withdrawal)) return { valid: false, errors: [{ code: 'withdrawal-object-required', path: '$.withdrawal' }] };
  for (const key of WITHDRAWAL_KEYS) {
    if (!Object.hasOwn(withdrawal, key)) errors.push({ code: 'withdrawal-field-required', path: `$.withdrawal.${key}` });
  }
  for (const key of Object.keys(withdrawal)) {
    if (!WITHDRAWAL_KEYS.includes(key)) errors.push({ code: 'withdrawal-additional-property', path: `$.withdrawal.${key}` });
  }
  if (withdrawal.contractVersion !== WITHDRAWAL_FIXTURE_VERSION) errors.push({ code: 'withdrawal-contract-version', path: '$.withdrawal.contractVersion' });
  if (withdrawal.inputClass !== 'synthetic-withdrawal-fixture') errors.push({ code: 'withdrawal-input-class', path: '$.withdrawal.inputClass' });
  if (withdrawal.requestId !== requestId) errors.push({ code: 'withdrawal-request-mismatch', path: '$.withdrawal.requestId' });
  if (!isNonEmptyString(withdrawal.eventId) || !withdrawal.eventId.startsWith('fixture-withdrawal-event-')) errors.push({ code: 'withdrawal-event-id', path: '$.withdrawal.eventId' });
  if (!isIsoDateTime(withdrawal.withdrawnAt)) errors.push({ code: 'withdrawal-time', path: '$.withdrawal.withdrawnAt' });
  if (!isNonEmptyString(withdrawal.reason)) errors.push({ code: 'withdrawal-reason-required', path: '$.withdrawal.reason' });
  if (!Array.isArray(withdrawal.affectedSurfaces) || withdrawal.affectedSurfaces.length !== REQUIRED_WITHDRAWAL_SURFACES.length || !REQUIRED_WITHDRAWAL_SURFACES.every((surface) => withdrawal.affectedSurfaces.includes(surface))) {
    errors.push({ code: 'withdrawal-surfaces-contract', path: '$.withdrawal.affectedSurfaces' });
  }
  if (withdrawal.auditEventRecorded !== true) errors.push({ code: 'withdrawal-audit-required', path: '$.withdrawal.auditEventRecorded' });
  return { valid: errors.length === 0, errors };
}

function buildRecord(packet, skuId, targetMarket, claimScope) {
  const tuple = { requestId: packet.requestId, skuId, targetMarket, claimScope };
  const recordDigest = canonicalSha256(tuple).slice(0, 20);
  return {
    id: `reg-sku-draft-${recordDigest}`,
    source: {
      sourceRegistryId: null,
      jurisdiction: 'TEST-ONLY',
      authority: null,
      title: null,
      officialUrl: null,
      retrievedAt: null,
      contentSha256: null,
      effectiveFrom: null,
      effectiveTo: null,
      claimScope: `synthetic-projection:${claimScope}`,
    },
    sku: {
      skuId,
      productFamily: 'synthetic-intake-projection',
      targetMarket,
    },
    decision: {
      applicability: 'unknown',
      status: 'legal-review-required',
      scopeBasis: 'Synthetic intake projection only; no regulatory scope or SKU applicability was evaluated.',
      rationale: `Request ${packet.requestId} exercises deterministic cross-contract mapping without legal evidence.`,
      reviewerId: null,
      reviewedAt: null,
      reason: null,
    },
    evidence: {
      snapshotId: null,
      reviewDecisionId: null,
      sourceEvidencePath: null,
    },
    publication: {
      canDisplayAsComplianceFact: false,
      notLegalAdvice: true,
      blockedReasons: [
        'synthetic-intake-not-authorized',
        'official-source-snapshot-missing',
        'sku-scope-not-evaluated',
        'legal-review-missing',
      ],
    },
  };
}

function buildMatrix(packet) {
  const records = [];
  for (const skuId of packet.skuOwnership.skuIds) {
    for (const targetMarket of packet.skuOwnership.targetMarkets) {
      for (const claimScope of packet.sourceScope.requestedClaimScopes) {
        records.push(buildRecord(packet, skuId, targetMarket, claimScope));
      }
    }
  }
  return { ...emptyMatrix(packet.generatedAt), records };
}

function buildLineage(packet, inputSha256, withdrawal = null) {
  return {
    request: {
      requestId: packet.requestId,
      ownerSubmissionRef: packet.submissionConfirmations.ownerSubmissionRef,
      inputSha256,
    },
    sources: {
      registryIds: [...packet.sourceScope.sourceRegistryIds],
      claimScopes: [...packet.sourceScope.requestedClaimScopes],
      materializedOfficialSnapshots: 0,
      status: 'synthetic-reference-only',
    },
    snapshots: {
      plannedStoreRef: packet.evidenceHandoff.snapshotStoreRef,
      snapshotIds: [],
      status: 'missing-not-collected',
    },
    review: {
      plannedEventStoreRef: packet.evidenceHandoff.reviewEventStoreRef,
      reviewDecisionIds: [],
      requiredStatus: 'legal-review-required',
      status: 'pending-not-reviewed',
    },
    withdrawal: withdrawal
      ? { status: 'withdrawn-blocked', eventId: withdrawal.eventId, withdrawnAt: withdrawal.withdrawnAt }
      : { status: 'not-withdrawn', eventId: null, withdrawnAt: null },
  };
}

function validateCrossContractLineage(packet, matrix, lineage) {
  const errors = [];
  const expectedRecordCount = packet.skuOwnership.skuIds.length * packet.skuOwnership.targetMarkets.length * packet.sourceScope.requestedClaimScopes.length;
  const expectedClaimScopes = new Set(packet.sourceScope.requestedClaimScopes.map((claimScope) => `synthetic-projection:${claimScope}`));
  if (lineage.request.requestId !== packet.requestId) errors.push({ code: 'lineage-request-mismatch', path: '$.lineage.request.requestId' });
  if (canonicalSha256(packet) !== lineage.request.inputSha256) errors.push({ code: 'lineage-input-hash-mismatch', path: '$.lineage.request.inputSha256' });
  if (JSON.stringify(lineage.sources.registryIds) !== JSON.stringify(packet.sourceScope.sourceRegistryIds)) errors.push({ code: 'lineage-source-mismatch', path: '$.lineage.sources.registryIds' });
  if (matrix.records.length !== expectedRecordCount) errors.push({ code: 'projection-record-count', path: '$.matrixDraft.records' });
  for (const [index, record] of matrix.records.entries()) {
    if (!packet.skuOwnership.skuIds.includes(record.sku.skuId)) errors.push({ code: 'lineage-sku-mismatch', path: `$.matrixDraft.records[${index}].sku.skuId` });
    if (!packet.skuOwnership.targetMarkets.includes(record.sku.targetMarket)) errors.push({ code: 'lineage-market-mismatch', path: `$.matrixDraft.records[${index}].sku.targetMarket` });
    if (!expectedClaimScopes.has(record.source.claimScope)) errors.push({ code: 'lineage-claim-scope-mismatch', path: `$.matrixDraft.records[${index}].source.claimScope` });
    if (record.decision.applicability !== 'unknown' || record.decision.status !== 'legal-review-required') errors.push({ code: 'lineage-decision-promotion', path: `$.matrixDraft.records[${index}].decision` });
    if (Object.values(record.evidence).some((value) => value !== null)) errors.push({ code: 'lineage-evidence-fabrication', path: `$.matrixDraft.records[${index}].evidence` });
    if (record.publication.canDisplayAsComplianceFact !== false) errors.push({ code: 'lineage-fact-promotion', path: `$.matrixDraft.records[${index}].publication` });
  }
  return { valid: errors.length === 0, errors, expectedRecordCount };
}

export function projectRegulationIntakeToSkuDraft(packet, options = {}) {
  const intakeReport = buildRegulationSourceLegalIntakeReport(packet, { inputPath: options.inputPath ?? 'memory' });
  const inputSha256 = canonicalSha256(packet);
  const withdrawalValidation = validateWithdrawalFixture(options.withdrawal, packet?.requestId);
  const baseBoundaries = {
    noNetwork: true,
    providerCalls: 0,
    connectorCalls: 0,
    regulatoryFactsCollected: 0,
    realSkusEvaluated: 0,
    legalConclusionsGenerated: 0,
    businessDataWrites: 0,
    canonicalPublicWrites: 0,
    productionWrites: 0,
    deployment: false,
    factPromotion: false,
  };

  if (intakeReport.status !== 'synthetic-shape-valid-not-authorized') {
    const matrixDraft = emptyMatrix(packet?.generatedAt);
    return {
      schemaVersion: PROJECTION_SCHEMA_VERSION,
      evidenceGrade: 'L2-fixture-or-dry-run',
      status: 'blocked-intake-not-projectable',
      passed: false,
      projectionReady: false,
      projectionId: null,
      matrixDraft,
      lineage: null,
      idempotency: { inputSha256, matrixSha256: canonicalSha256(matrixDraft), deterministicReplay: true },
      decision: { authorizedToCollect: false, authorizedToEvaluateRealSkus: false, authorizedToPublish: false, authorizedToWriteProduction: false },
      boundaries: baseBoundaries,
      errors: intakeReport.errors.length > 0 ? intakeReport.errors : [{ code: 'synthetic-6-of-6-required', path: '$' }],
    };
  }

  if (!withdrawalValidation.valid) {
    const matrixDraft = emptyMatrix(packet.generatedAt);
    return {
      schemaVersion: PROJECTION_SCHEMA_VERSION,
      evidenceGrade: 'L2-fixture-or-dry-run',
      status: 'blocked-withdrawal-contract-invalid',
      passed: false,
      projectionReady: false,
      projectionId: null,
      matrixDraft,
      lineage: buildLineage(packet, inputSha256),
      idempotency: { inputSha256, matrixSha256: canonicalSha256(matrixDraft), deterministicReplay: true },
      decision: { authorizedToCollect: false, authorizedToEvaluateRealSkus: false, authorizedToPublish: false, authorizedToWriteProduction: false },
      boundaries: baseBoundaries,
      errors: withdrawalValidation.errors,
    };
  }

  const withdrawn = options.withdrawal !== null && options.withdrawal !== undefined;
  const matrixDraft = withdrawn ? emptyMatrix(packet.generatedAt) : buildMatrix(packet);
  const lineage = buildLineage(packet, inputSha256, options.withdrawal);
  const matrixValidation = validateRegulationSkuContract(matrixDraft);
  const lineageValidation = withdrawn
    ? { valid: matrixDraft.records.length === 0, errors: matrixDraft.records.length === 0 ? [] : [{ code: 'withdrawn-projection-not-empty', path: '$.matrixDraft.records' }], expectedRecordCount: 0 }
    : validateCrossContractLineage(packet, matrixDraft, lineage);
  const matrixSha256 = canonicalSha256(matrixDraft);
  const operationSha256 = canonicalSha256({ inputSha256, withdrawalEventId: options.withdrawal?.eventId ?? null });
  const projectionId = `data-reg-projection-${canonicalSha256({ operationSha256, matrixSha256 }).slice(0, 24)}`;
  const passed = matrixValidation.passed && lineageValidation.valid;

  return {
    schemaVersion: PROJECTION_SCHEMA_VERSION,
    evidenceGrade: 'L2-fixture-or-dry-run',
    status: !passed ? 'blocked-projection-invalid' : withdrawn ? 'blocked-withdrawn' : 'synthetic-draft-ready-not-authorized',
    passed,
    projectionReady: passed && !withdrawn,
    projectionId,
    matrixDraft,
    lineage,
    idempotency: {
      key: `sha256:${operationSha256}`,
      inputSha256,
      operationSha256,
      matrixSha256,
      deterministicReplay: true,
    },
    checks: {
      intakeStatus: intakeReport.status,
      intakeGroupsReady: intakeReport.readiness.readyGroups,
      matrixContractValid: matrixValidation.passed,
      crossContractLineageValid: lineageValidation.valid,
      expectedRecordCount: lineageValidation.expectedRecordCount,
      withdrawalBlocked: withdrawn && matrixDraft.records.length === 0,
    },
    decision: {
      authorizedToCollect: false,
      authorizedToEvaluateRealSkus: false,
      authorizedToPublish: false,
      authorizedToWriteProduction: false,
    },
    boundaries: baseBoundaries,
    errors: [...matrixValidation.errors, ...lineageValidation.errors],
  };
}

function parseArgs(argv) {
  const valueAfter = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : null;
  };
  return {
    json: argv.includes('--json'),
    file: valueAfter('--file') ?? 'tests/fixtures/regulation-source-legal-intake.synthetic.json',
    withdrawalFile: valueAfter('--withdrawal-file'),
    write: valueAfter('--write'),
  };
}

function assertTmpWritePath(appRoot, outputPath) {
  const target = resolve(appRoot, outputPath);
  const tmpRoot = resolve(appRoot, 'tmp');
  const relativePath = relative(tmpRoot, target);
  if (relativePath === '' || relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error('--write is restricted to a file inside app/tmp/.');
  }
  return target;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const appRoot = process.cwd();
  const packet = JSON.parse(readFileSync(resolve(appRoot, options.file), 'utf8'));
  const withdrawal = options.withdrawalFile
    ? JSON.parse(readFileSync(resolve(appRoot, options.withdrawalFile), 'utf8'))
    : null;
  const report = projectRegulationIntakeToSkuDraft(packet, { inputPath: options.file, withdrawal });
  const serialized = JSON.stringify(report, null, 2);
  if (options.write) {
    const target = assertTmpWritePath(appRoot, options.write);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${serialized}\n`, { encoding: 'utf8', mode: 0o600 });
    chmodSync(target, 0o600);
  }
  process.stdout.write(`${options.json ? serialized : `${report.status}: ${report.matrixDraft.records.length} draft record(s)`}\n`);
  if (!report.passed) process.exitCode = 1;
}

const invokedUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (import.meta.url === invokedUrl) main();
