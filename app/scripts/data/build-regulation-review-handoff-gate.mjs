#!/usr/bin/env node
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  canonicalSha256,
  projectRegulationIntakeToSkuDraft,
} from './project-regulation-intake-to-sku-draft.mjs';
import { validateRegulationSkuContract } from './validate-regulation-sku-contract.mjs';

export const HANDOFF_PREREQUISITES_VERSION = 'mkt53.regulation-review-handoff-prerequisites.v1';
export const HANDOFF_REPORT_VERSION = 'mkt53.data-reg-review-handoff-gate.v1';

const INPUT_CLASSES = new Set(['empty-handoff-template', 'synthetic-handoff-fixture']);
const TARGET_STATES = new Set(['pending', 'approved', 'rejected', 'withdrawn']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const TOP_LEVEL_KEYS = ['contractVersion', 'inputClass', 'generatedAt', 'officialSnapshot', 'reviewerAuthorization', 'disclosure'];
const SNAPSHOT_KEYS = ['snapshotId', 'sourceRegistryId', 'artifactSha256', 'metadataSha256', 'contentRetrievedAt', 'evidencePath', 'verifiedAgainstBytes'];
const REVIEWER_KEYS = ['reviewerId', 'reviewerRole', 'authorizationRef', 'authorizedAt', 'expiresAt', 'independentFromRequestOwner'];
const DISCLOSURE_KEYS = ['notLegalAdvice', 'noBackendReviewWrite', 'noRealSkuEvaluation', 'noProductionWrites', 'noApproveReject', 'noFactPromotion'];
const SENSITIVE_KEY_PATTERN = /password|secret|token|cookie|private.?key|client.?secret|credential/i;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateTime(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function addError(errors, path, code, message) {
  errors.push({ path, code, message });
}

function requireExactObject(value, keys, path, errors) {
  if (!isObject(value)) {
    addError(errors, path, 'object-required', 'Expected an object.');
    return false;
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) addError(errors, `${path}.${key}`, 'required', 'Required field is missing.');
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) addError(errors, `${path}.${key}`, 'additional-property', 'Unexpected field is not allowed.');
  }
  return true;
}

function validateNullableString(value, path, errors) {
  if (value !== null && !isNonEmptyString(value)) addError(errors, path, 'nullable-non-empty-string', 'Expected null or a non-empty string.');
}

function findSensitiveKeys(value, path = '$') {
  if (!isObject(value) && !Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    const nestedPath = Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`;
    const own = SENSITIVE_KEY_PATTERN.test(key) ? [nestedPath] : [];
    return [...own, ...findSensitiveKeys(nested, nestedPath)];
  });
}

function allNull(object, keys) {
  return keys.every((key) => object[key] === null);
}

export function validateRegulationReviewHandoffPrerequisites(input) {
  const errors = [];
  if (!requireExactObject(input, TOP_LEVEL_KEYS, '$', errors)) {
    return { contractValid: false, inputClass: input?.inputClass ?? null, errors };
  }
  requireExactObject(input.officialSnapshot, SNAPSHOT_KEYS, '$.officialSnapshot', errors);
  requireExactObject(input.reviewerAuthorization, REVIEWER_KEYS, '$.reviewerAuthorization', errors);
  requireExactObject(input.disclosure, DISCLOSURE_KEYS, '$.disclosure', errors);
  if (errors.some((error) => error.code === 'object-required')) {
    return { contractValid: false, inputClass: input.inputClass ?? null, errors };
  }

  if (input.contractVersion !== HANDOFF_PREREQUISITES_VERSION) addError(errors, '$.contractVersion', 'contract-version', `Expected ${HANDOFF_PREREQUISITES_VERSION}.`);
  if (!INPUT_CLASSES.has(input.inputClass)) addError(errors, '$.inputClass', 'input-class', 'Only empty or reserved synthetic handoff inputs are accepted in this batch.');
  if (!isIsoDateTime(input.generatedAt)) addError(errors, '$.generatedAt', 'date-time-required', 'generatedAt must be an ISO date-time.');

  for (const key of SNAPSHOT_KEYS.filter((key) => key !== 'verifiedAgainstBytes')) validateNullableString(input.officialSnapshot[key], `$.officialSnapshot.${key}`, errors);
  for (const key of REVIEWER_KEYS.filter((key) => key !== 'independentFromRequestOwner')) validateNullableString(input.reviewerAuthorization[key], `$.reviewerAuthorization.${key}`, errors);
  if (input.officialSnapshot.verifiedAgainstBytes !== false) addError(errors, '$.officialSnapshot.verifiedAgainstBytes', 'official-byte-verification-forbidden', 'Synthetic/local handoff inputs cannot claim official bytes were verified.');
  if (input.reviewerAuthorization.independentFromRequestOwner !== null && typeof input.reviewerAuthorization.independentFromRequestOwner !== 'boolean') addError(errors, '$.reviewerAuthorization.independentFromRequestOwner', 'nullable-boolean', 'Expected null or boolean.');

  for (const key of DISCLOSURE_KEYS) {
    if (input.disclosure[key] !== true) addError(errors, `$.disclosure.${key}`, 'disclosure-boundary-required', `${key} must remain true.`);
  }
  for (const path of findSensitiveKeys(input)) addError(errors, path, 'sensitive-key-forbidden', 'Secrets and credentials are forbidden in handoff prerequisites.');

  if (input.inputClass === 'empty-handoff-template') {
    if (!allNull(input.officialSnapshot, SNAPSHOT_KEYS.filter((key) => key !== 'verifiedAgainstBytes'))) addError(errors, '$.officialSnapshot', 'empty-template-value', 'Empty handoff template snapshot fields must remain null.');
    if (!allNull(input.reviewerAuthorization, REVIEWER_KEYS)) addError(errors, '$.reviewerAuthorization', 'empty-template-value', 'Empty handoff template reviewer fields must remain null.');
  }

  if (input.inputClass === 'synthetic-handoff-fixture') {
    const snapshot = input.officialSnapshot;
    const reviewer = input.reviewerAuthorization;
    if (!isNonEmptyString(snapshot.snapshotId) || !snapshot.snapshotId.startsWith('fixture-snapshot-')) addError(errors, '$.officialSnapshot.snapshotId', 'synthetic-snapshot-id', 'Synthetic snapshot id must use the fixture-snapshot- prefix.');
    if (!isNonEmptyString(snapshot.sourceRegistryId) || !snapshot.sourceRegistryId.startsWith('fixture-source-')) addError(errors, '$.officialSnapshot.sourceRegistryId', 'synthetic-source-id', 'Synthetic source id must use the fixture-source- prefix.');
    if (!SHA256_PATTERN.test(snapshot.artifactSha256 ?? '')) addError(errors, '$.officialSnapshot.artifactSha256', 'sha256-required', 'Synthetic artifact shape requires a lowercase SHA-256.');
    if (!SHA256_PATTERN.test(snapshot.metadataSha256 ?? '')) addError(errors, '$.officialSnapshot.metadataSha256', 'sha256-required', 'Synthetic metadata shape requires a lowercase SHA-256.');
    if (!isIsoDateTime(snapshot.contentRetrievedAt)) addError(errors, '$.officialSnapshot.contentRetrievedAt', 'date-time-required', 'Synthetic contentRetrievedAt must be an ISO date-time.');
    if (!isNonEmptyString(snapshot.evidencePath) || !snapshot.evidencePath.startsWith('fixture://')) addError(errors, '$.officialSnapshot.evidencePath', 'synthetic-evidence-path', 'Synthetic evidence path must use fixture://.');
    if (!isNonEmptyString(reviewer.reviewerId) || !reviewer.reviewerId.startsWith('fixture-reviewer-')) addError(errors, '$.reviewerAuthorization.reviewerId', 'synthetic-reviewer-id', 'Synthetic reviewer id must use the fixture-reviewer- prefix.');
    if (reviewer.reviewerRole !== 'TEST-ONLY') addError(errors, '$.reviewerAuthorization.reviewerRole', 'synthetic-reviewer-role', 'Synthetic reviewer role must be TEST-ONLY.');
    if (!isNonEmptyString(reviewer.authorizationRef) || !reviewer.authorizationRef.startsWith('fixture://')) addError(errors, '$.reviewerAuthorization.authorizationRef', 'synthetic-authorization-ref', 'Synthetic authorization ref must use fixture://.');
    if (!isIsoDateTime(reviewer.authorizedAt) || !isIsoDateTime(reviewer.expiresAt)) addError(errors, '$.reviewerAuthorization', 'authorization-window-required', 'Synthetic authorization shape requires ISO authorizedAt and expiresAt.');
    if (isIsoDateTime(reviewer.authorizedAt) && isIsoDateTime(reviewer.expiresAt) && Date.parse(reviewer.expiresAt) <= Date.parse(reviewer.authorizedAt)) addError(errors, '$.reviewerAuthorization.expiresAt', 'authorization-window-order', 'expiresAt must be later than authorizedAt.');
    if (reviewer.independentFromRequestOwner !== true) addError(errors, '$.reviewerAuthorization.independentFromRequestOwner', 'synthetic-independence-shape', 'Synthetic complete shape must explicitly model reviewer independence.');
  }

  return { contractValid: errors.length === 0, inputClass: input.inputClass, errors };
}

function validateProjection(projection) {
  const errors = [];
  if (!isObject(projection)) return { valid: false, withdrawn: false, matrixContractValid: false, hashValid: false, errors: [{ path: '$.projection', code: 'projection-object-required' }] };
  const matrix = projection.matrixDraft;
  const hashValid = isObject(matrix) && canonicalSha256(matrix) === projection.idempotency?.matrixSha256;
  const matrixValidation = isObject(matrix) ? validateRegulationSkuContract(matrix) : { passed: false, errors: [] };
  if (!hashValid) addError(errors, '$.projection.idempotency.matrixSha256', 'projection-matrix-hash-mismatch', 'Projection matrix hash does not match the matrix body.');
  if (!matrixValidation.passed) addError(errors, '$.projection.matrixDraft', 'projection-matrix-contract-invalid', 'Projection matrix no longer satisfies the DATA-REG matrix contract.');

  const withdrawn = projection.status === 'blocked-withdrawn' && projection.passed === true && projection.projectionReady === false;
  const active = projection.status === 'synthetic-draft-ready-not-authorized' && projection.passed === true && projection.projectionReady === true;
  const projectionIdValid = isNonEmptyString(projection.projectionId) && projection.projectionId.startsWith('data-reg-projection-');
  const activeLineageValid = !active || (
    projection.lineage?.sources?.materializedOfficialSnapshots === 0 &&
    projection.lineage?.snapshots?.status === 'missing-not-collected' &&
    Array.isArray(projection.lineage?.snapshots?.snapshotIds) &&
    projection.lineage.snapshots.snapshotIds.length === 0 &&
    projection.lineage?.review?.status === 'pending-not-reviewed' &&
    Array.isArray(projection.lineage?.review?.reviewDecisionIds) &&
    projection.lineage.review.reviewDecisionIds.length === 0 &&
    projection.lineage?.withdrawal?.status === 'not-withdrawn'
  );
  if (!(withdrawn || active)) addError(errors, '$.projection.status', 'projection-status', 'Only an active synthetic draft or a valid withdrawn projection is accepted.');
  if (!projectionIdValid) addError(errors, '$.projection.projectionId', 'projection-id', 'Projection id must use the data-reg-projection- prefix.');
  if (!activeLineageValid) addError(errors, '$.projection.lineage', 'projection-lineage-invalid', 'Active synthetic projection must retain empty snapshot/review lineage and a non-withdrawn state.');
  if (active && (!Array.isArray(matrix?.records) || matrix.records.length === 0)) addError(errors, '$.projection.matrixDraft.records', 'projection-records-required', 'Active projection requires at least one draft record.');
  if (active && matrix?.records?.some((record) => record?.decision?.status !== 'legal-review-required' || record?.decision?.applicability !== 'unknown')) addError(errors, '$.projection.matrixDraft.records', 'projection-decision-promotion', 'Handoff accepts only unknown + legal-review-required records.');
  if (withdrawn && matrix?.records?.length !== 0) addError(errors, '$.projection.matrixDraft.records', 'withdrawn-projection-not-empty', 'Withdrawn projection must contain zero records.');

  return { valid: errors.length === 0, withdrawn, active, matrixContractValid: matrixValidation.passed, hashValid, lineageValid: activeLineageValid, errors };
}

function prerequisiteReadiness(input) {
  const snapshot = input.officialSnapshot;
  const reviewer = input.reviewerAuthorization;
  const snapshotShapeComplete = [snapshot.snapshotId, snapshot.sourceRegistryId, snapshot.artifactSha256, snapshot.metadataSha256, snapshot.contentRetrievedAt, snapshot.evidencePath].every(isNonEmptyString);
  const reviewerShapeComplete = [reviewer.reviewerId, reviewer.reviewerRole, reviewer.authorizationRef, reviewer.authorizedAt, reviewer.expiresAt].every(isNonEmptyString) && reviewer.independentFromRequestOwner === true;
  return {
    snapshotShapeComplete,
    reviewerShapeComplete,
    officialSnapshotReady: false,
    independentReviewerAuthorized: false,
  };
}

function buildBlockingReasons(prerequisites, readiness, targetState) {
  const reasons = [];
  const snapshot = prerequisites.officialSnapshot;
  const reviewer = prerequisites.reviewerAuthorization;
  if (!isNonEmptyString(snapshot.snapshotId)) reasons.push('official-snapshot-missing');
  if (!SHA256_PATTERN.test(snapshot.artifactSha256 ?? '')) reasons.push('artifact-hash-missing');
  if (!SHA256_PATTERN.test(snapshot.metadataSha256 ?? '')) reasons.push('metadata-hash-missing');
  if (snapshot.verifiedAgainstBytes !== true) reasons.push('official-bytes-not-verified');
  if (!isNonEmptyString(reviewer.reviewerId) || !isNonEmptyString(reviewer.authorizationRef)) reasons.push('reviewer-authorization-missing');
  if (reviewer.independentFromRequestOwner !== true) reasons.push('independent-reviewer-not-confirmed');
  if (prerequisites.inputClass === 'synthetic-handoff-fixture') reasons.push('synthetic-prerequisites-not-authorized');
  if ((targetState === 'approved' || targetState === 'rejected') && !(readiness.officialSnapshotReady && readiness.independentReviewerAuthorized)) reasons.push('approve-reject-requires-official-evidence-and-independent-authorization');
  if (targetState === 'withdrawn') reasons.push('use-projection-withdrawal-contract');
  return reasons;
}

function baseDecision() {
  return {
    authorizedToCreateBackendReviewSubject: false,
    authorizedToApprove: false,
    authorizedToReject: false,
    authorizedToPublish: false,
    authorizedToWriteProduction: false,
  };
}

function baseBoundaries() {
  return {
    noNetwork: true,
    providerCalls: 0,
    connectorCalls: 0,
    backendApiCalls: 0,
    snapshotWrites: 0,
    reviewWrites: 0,
    businessDataWrites: 0,
    canonicalPublicWrites: 0,
    productionWrites: 0,
    deployment: false,
    realSkusEvaluated: 0,
    legalConclusionsGenerated: 0,
    factPromotion: false,
  };
}

export function buildRegulationDraftReviewHandoff(projection, prerequisites, options = {}) {
  const targetState = options.targetState ?? 'pending';
  const prerequisiteValidation = validateRegulationReviewHandoffPrerequisites(prerequisites);
  const projectionValidation = validateProjection(projection);
  const projectionSha256 = canonicalSha256(projection);
  const prerequisitesSha256 = canonicalSha256(prerequisites);
  const operationSha256 = canonicalSha256({ projectionSha256, prerequisitesSha256, targetState });
  const common = {
    schemaVersion: HANDOFF_REPORT_VERSION,
    evidenceGrade: 'L2-fixture-or-dry-run',
    decision: baseDecision(),
    boundaries: baseBoundaries(),
  };

  if (!TARGET_STATES.has(targetState)) {
    return { ...common, status: 'blocked-target-state-invalid', passed: false, handoffCandidateCreated: false, readyForReviewerDecision: false, handoffId: null, handoff: null, reviewGate: null, checks: null, idempotency: { projectionSha256, prerequisitesSha256, operationSha256, deterministicReplay: true }, blockingReasons: [], errors: [{ path: '$.targetState', code: 'target-state-invalid', message: 'Unknown target state.' }] };
  }
  if (!prerequisiteValidation.contractValid) {
    return { ...common, status: 'blocked-prerequisites-invalid', passed: false, handoffCandidateCreated: false, readyForReviewerDecision: false, handoffId: null, handoff: null, reviewGate: null, checks: { prerequisiteContractValid: false }, idempotency: { projectionSha256, prerequisitesSha256, operationSha256, deterministicReplay: true }, blockingReasons: [], errors: prerequisiteValidation.errors };
  }
  if (!projectionValidation.valid) {
    return { ...common, status: 'blocked-projection-invalid', passed: false, handoffCandidateCreated: false, readyForReviewerDecision: false, handoffId: null, handoff: null, reviewGate: null, checks: { prerequisiteContractValid: true, projectionActive: false, projectionHashValid: projectionValidation.hashValid, matrixContractValid: projectionValidation.matrixContractValid }, idempotency: { projectionSha256, prerequisitesSha256, operationSha256, deterministicReplay: true }, blockingReasons: [], errors: projectionValidation.errors };
  }
  if (projectionValidation.withdrawn) {
    return { ...common, status: 'blocked-projection-withdrawn', passed: true, handoffCandidateCreated: false, readyForReviewerDecision: false, handoffId: null, handoff: null, reviewGate: { requestedTargetState: targetState, transitionAuthorized: false, blockedTransitions: ['approved', 'rejected'] }, checks: { prerequisiteContractValid: true, projectionActive: false, projectionWithdrawn: true, projectionHashValid: true, matrixContractValid: true, officialSnapshotReady: false, independentReviewerAuthorized: false }, idempotency: { key: `sha256:${operationSha256}`, projectionSha256, prerequisitesSha256, operationSha256, deterministicReplay: true }, blockingReasons: ['projection-withdrawn-terminal'], errors: [] };
  }

  const readiness = prerequisiteReadiness(prerequisites);
  const blockingReasons = buildBlockingReasons(prerequisites, readiness, targetState);
  const requestedDecision = targetState === 'approved' || targetState === 'rejected';
  const status = requestedDecision
    ? 'blocked-review-transition'
    : targetState === 'withdrawn'
      ? 'blocked-use-projection-withdrawal-contract'
      : prerequisites.inputClass === 'synthetic-handoff-fixture'
        ? 'pending-review-handoff-blocked-synthetic-prerequisites'
        : 'pending-review-handoff-blocked-prerequisites';
  const handoffId = `data-reg-review-handoff-${operationSha256.slice(0, 24)}`;
  const subjects = projection.matrixDraft.records.map((record) => ({
    localSubjectId: `regulation-sku-draft:${record.id}`,
    recordId: record.id,
    projectionId: projection.projectionId,
    candidateState: 'pending',
    backendEntityType: null,
    backendSubjectCreated: false,
  }));

  return {
    ...common,
    status,
    passed: true,
    handoffCandidateCreated: true,
    readyForReviewerDecision: false,
    handoffId,
    handoff: {
      projectionId: projection.projectionId,
      candidateState: 'pending',
      subjects,
      backendSubjectCreated: false,
      backendPersisted: false,
      reviewEventId: null,
      legalDecision: null,
    },
    reviewGate: {
      requestedTargetState: targetState,
      transitionAuthorized: false,
      blockedTransitions: ['approved', 'rejected'],
      allowedTransitions: [],
    },
    checks: {
      prerequisiteContractValid: true,
      projectionActive: true,
      projectionWithdrawn: false,
      projectionHashValid: true,
      matrixContractValid: true,
      syntheticPrerequisites: prerequisites.inputClass === 'synthetic-handoff-fixture',
      snapshotShapeComplete: readiness.snapshotShapeComplete,
      reviewerAuthorizationShapeComplete: readiness.reviewerShapeComplete,
      officialSnapshotReady: readiness.officialSnapshotReady,
      independentReviewerAuthorized: readiness.independentReviewerAuthorized,
      subjectCount: subjects.length,
    },
    idempotency: {
      key: `sha256:${operationSha256}`,
      projectionSha256,
      prerequisitesSha256,
      operationSha256,
      deterministicReplay: true,
    },
    blockingReasons,
    errors: [],
  };
}

function parseArgs(argv) {
  const valueAfter = (flag, fallback = null) => {
    const index = argv.indexOf(flag);
    if (index < 0) return fallback;
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
    return value;
  };
  return {
    json: argv.includes('--json'),
    intakeFile: valueAfter('--intake-file', 'tests/fixtures/regulation-source-legal-intake.synthetic.json'),
    prerequisitesFile: valueAfter('--prerequisites-file', 'scripts/data/templates/regulation-review-handoff-prerequisites-template.json'),
    withdrawalFile: valueAfter('--withdrawal-file'),
    targetState: valueAfter('--target-state', 'pending'),
    write: valueAfter('--write'),
  };
}

function assertTmpWritePath(appRoot, outputPath) {
  const target = resolve(appRoot, outputPath);
  const tmpRoot = resolve(appRoot, 'tmp');
  const relativePath = relative(tmpRoot, target);
  if (relativePath === '' || relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) throw new Error('--write is restricted to a file inside app/tmp/.');
  return target;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const appRoot = process.cwd();
  const intake = JSON.parse(readFileSync(resolve(appRoot, options.intakeFile), 'utf8'));
  const prerequisites = JSON.parse(readFileSync(resolve(appRoot, options.prerequisitesFile), 'utf8'));
  const withdrawal = options.withdrawalFile ? JSON.parse(readFileSync(resolve(appRoot, options.withdrawalFile), 'utf8')) : null;
  const projection = projectRegulationIntakeToSkuDraft(intake, { inputPath: options.intakeFile, withdrawal });
  const report = buildRegulationDraftReviewHandoff(projection, prerequisites, { targetState: options.targetState });
  const serialized = JSON.stringify(report, null, 2);
  if (options.write) {
    const target = assertTmpWritePath(appRoot, options.write);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${serialized}\n`, { encoding: 'utf8', mode: 0o600 });
    chmodSync(target, 0o600);
  }
  process.stdout.write(`${options.json ? serialized : `${report.status}: ${report.handoff?.subjects.length ?? 0} pending candidate(s)`}\n`);
  if (!report.passed) process.exitCode = 1;
}

const invokedUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (import.meta.url === invokedUrl) main();
