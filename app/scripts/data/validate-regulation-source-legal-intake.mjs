#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OFFICIAL_SOURCE_REGISTRY_IDS } from './validate-regulation-sku-contract.mjs';
import { isValidIsoCalendarDate, isValidTimezoneIsoDateTime } from './lib/strict-iso-date.mjs';

export const INTAKE_CONTRACT_VERSION = 'mkt53.regulation-source-legal-intake.v1';
export const INTAKE_GROUP_COUNT = 6;

const INPUT_CLASSES = new Set(['empty-readiness-template', 'synthetic-readiness-fixture', 'owner-submitted-intake']);
const REQUIRED_DECISION_STATES = ['approved', 'rejected', 'withdrawn'];
const REQUIRED_ARTIFACTS = [
  'official-source-file',
  'retrieval-metadata',
  'content-sha256',
  'snapshot-record',
  'sku-scope-basis',
  'legal-review-event',
  'withdrawal-event',
];
const REQUIRED_WITHDRAWAL_SURFACES = ['dashboard', 'csv-export', 'report-export'];
const ALLOWED_DOCUMENT_TYPES = new Set(['regulation-text', 'official-guidance', 'implementation-notice']);
const SENSITIVE_KEY_PATTERN = /password|secret|token|cookie|private.?key|client.?secret|credential/i;
const HOST_PATTERN = /^(?=.{1,253}$)(?!-)[a-z0-9.-]+(?<!-)$/;

const TOP_LEVEL_KEYS = [
  'contractVersion', 'inputClass', 'requestId', 'generatedAt', 'sourceScope', 'skuOwnership',
  'legalReviewWorkflow', 'evidenceHandoff', 'withdrawalGovernance', 'submissionConfirmations', 'disclosure',
];
const SECTION_KEYS = {
  sourceScope: [
    'sourceRegistryIds', 'jurisdictionCodes', 'officialSourceHosts', 'allowedDocumentTypes',
    'requestedClaimScopes', 'collectionWindowStart', 'collectionWindowEnd', 'scopeOwnerId',
  ],
  skuOwnership: ['skuOwnerId', 'ownerRole', 'skuIds', 'targetMarkets', 'authorizationEvidenceRef', 'expiresAt'],
  legalReviewWorkflow: [
    'reviewerId', 'reviewerRole', 'approvalSlaHours', 'escalationOwnerId', 'decisionPolicyRef', 'requiredDecisionStates',
  ],
  evidenceHandoff: [
    'handoffOwnerId', 'snapshotStoreRef', 'reviewEventStoreRef', 'hashAlgorithm', 'retentionDays', 'requiredArtifacts',
  ],
  withdrawalGovernance: ['withdrawalOwnerId', 'propagationSlaHours', 'affectedSurfaces', 'reasonRequired', 'auditEventRequired'],
  submissionConfirmations: [
    'ownerSubmissionRef', 'sourceScopeConfirmedBy', 'skuScopeConfirmedBy', 'legalWorkflowConfirmedBy', 'submittedAt',
  ],
  disclosure: ['notLegalAdvice', 'noLiveCollection', 'noRealSkuEvaluation', 'noProductionWrites', 'noFactPromotion'],
};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value) {
  return isValidIsoCalendarDate(value);
}

function isIsoDateTime(value) {
  return isValidTimezoneIsoDateTime(value);
}

function isPositiveInteger(value, maximum = Number.MAX_SAFE_INTEGER) {
  return Number.isInteger(value) && value >= 1 && value <= maximum;
}

function isUniqueStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString) && new Set(value).size === value.length;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function arraysEqual(left, right) {
  return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index]);
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

function findSensitiveKeys(value, path = '$') {
  if (!isObject(value) && !Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    const nestedPath = Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`;
    const own = SENSITIVE_KEY_PATTERN.test(key) ? [nestedPath] : [];
    return [...own, ...findSensitiveKeys(nested, nestedPath)];
  });
}

function findSyntheticMarkers(value, path = '$') {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    return normalized === 'test-only' || normalized.startsWith('fixture-') || normalized.startsWith('fixture://') || normalized.endsWith('.invalid')
      ? [path]
      : [];
  }
  if (!isObject(value) && !Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    const nestedPath = Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`;
    return findSyntheticMarkers(nested, nestedPath);
  });
}

function validateStringArray(value, path, errors) {
  if (!isUniqueStringArray(value)) addError(errors, path, 'unique-string-array-required', 'Expected unique non-empty strings.');
}

function validateNullableString(value, path, errors) {
  if (value !== null && !isNonEmptyString(value)) addError(errors, path, 'nullable-non-empty-string', 'Expected null or a non-empty string.');
}

function addMissing(missingFields, path, ready) {
  if (!ready) missingFields.push(path);
  return ready;
}

function buildReadinessGroups(input) {
  const synthetic = input.inputClass === 'synthetic-readiness-fixture';
  const sourceIdsReady = isUniqueStringArray(input.sourceScope.sourceRegistryIds) && input.sourceScope.sourceRegistryIds.length > 0 &&
    input.sourceScope.sourceRegistryIds.every((id) => synthetic ? id.startsWith('fixture-source-') : OFFICIAL_SOURCE_REGISTRY_IDS.has(id));
  const sourceMissing = [];
  addMissing(sourceMissing, 'sourceScope.sourceRegistryIds', sourceIdsReady);
  addMissing(sourceMissing, 'sourceScope.jurisdictionCodes', isUniqueStringArray(input.sourceScope.jurisdictionCodes) && input.sourceScope.jurisdictionCodes.length > 0);
  addMissing(sourceMissing, 'sourceScope.officialSourceHosts', isUniqueStringArray(input.sourceScope.officialSourceHosts) && input.sourceScope.officialSourceHosts.length > 0);
  addMissing(sourceMissing, 'sourceScope.allowedDocumentTypes', isUniqueStringArray(input.sourceScope.allowedDocumentTypes) && input.sourceScope.allowedDocumentTypes.length > 0);
  addMissing(sourceMissing, 'sourceScope.requestedClaimScopes', isUniqueStringArray(input.sourceScope.requestedClaimScopes) && input.sourceScope.requestedClaimScopes.length > 0);
  addMissing(sourceMissing, 'sourceScope.collectionWindowStart', isIsoDate(input.sourceScope.collectionWindowStart));
  addMissing(sourceMissing, 'sourceScope.collectionWindowEnd', isIsoDate(input.sourceScope.collectionWindowEnd));
  addMissing(sourceMissing, 'sourceScope.scopeOwnerId', isNonEmptyString(input.sourceScope.scopeOwnerId));

  const skuMissing = [];
  addMissing(skuMissing, 'skuOwnership.skuOwnerId', isNonEmptyString(input.skuOwnership.skuOwnerId));
  addMissing(skuMissing, 'skuOwnership.ownerRole', isNonEmptyString(input.skuOwnership.ownerRole));
  addMissing(skuMissing, 'skuOwnership.skuIds', isUniqueStringArray(input.skuOwnership.skuIds) && input.skuOwnership.skuIds.length > 0);
  addMissing(skuMissing, 'skuOwnership.targetMarkets', isUniqueStringArray(input.skuOwnership.targetMarkets) && input.skuOwnership.targetMarkets.length > 0);
  addMissing(skuMissing, 'skuOwnership.authorizationEvidenceRef', isNonEmptyString(input.skuOwnership.authorizationEvidenceRef));
  addMissing(skuMissing, 'skuOwnership.expiresAt', isIsoDateTime(input.skuOwnership.expiresAt));

  const legalMissing = [];
  addMissing(legalMissing, 'legalReviewWorkflow.reviewerId', isNonEmptyString(input.legalReviewWorkflow.reviewerId));
  addMissing(legalMissing, 'legalReviewWorkflow.reviewerRole', isNonEmptyString(input.legalReviewWorkflow.reviewerRole));
  addMissing(legalMissing, 'legalReviewWorkflow.approvalSlaHours', isPositiveInteger(input.legalReviewWorkflow.approvalSlaHours, 720));
  addMissing(legalMissing, 'legalReviewWorkflow.escalationOwnerId', isNonEmptyString(input.legalReviewWorkflow.escalationOwnerId));
  addMissing(legalMissing, 'legalReviewWorkflow.decisionPolicyRef', isNonEmptyString(input.legalReviewWorkflow.decisionPolicyRef));

  const evidenceMissing = [];
  addMissing(evidenceMissing, 'evidenceHandoff.handoffOwnerId', isNonEmptyString(input.evidenceHandoff.handoffOwnerId));
  addMissing(evidenceMissing, 'evidenceHandoff.snapshotStoreRef', isNonEmptyString(input.evidenceHandoff.snapshotStoreRef));
  addMissing(evidenceMissing, 'evidenceHandoff.reviewEventStoreRef', isNonEmptyString(input.evidenceHandoff.reviewEventStoreRef));
  addMissing(evidenceMissing, 'evidenceHandoff.retentionDays', isPositiveInteger(input.evidenceHandoff.retentionDays));

  const withdrawalMissing = [];
  addMissing(withdrawalMissing, 'withdrawalGovernance.withdrawalOwnerId', isNonEmptyString(input.withdrawalGovernance.withdrawalOwnerId));
  addMissing(withdrawalMissing, 'withdrawalGovernance.propagationSlaHours', isPositiveInteger(input.withdrawalGovernance.propagationSlaHours, 168));
  addMissing(withdrawalMissing, 'withdrawalGovernance.affectedSurfaces', isUniqueStringArray(input.withdrawalGovernance.affectedSurfaces) && REQUIRED_WITHDRAWAL_SURFACES.every((surface) => input.withdrawalGovernance.affectedSurfaces.includes(surface)));

  const confirmationMissing = [];
  addMissing(confirmationMissing, 'requestId', isNonEmptyString(input.requestId));
  addMissing(confirmationMissing, 'submissionConfirmations.ownerSubmissionRef', isNonEmptyString(input.submissionConfirmations.ownerSubmissionRef));
  addMissing(confirmationMissing, 'submissionConfirmations.sourceScopeConfirmedBy', isNonEmptyString(input.submissionConfirmations.sourceScopeConfirmedBy));
  addMissing(confirmationMissing, 'submissionConfirmations.skuScopeConfirmedBy', isNonEmptyString(input.submissionConfirmations.skuScopeConfirmedBy));
  addMissing(confirmationMissing, 'submissionConfirmations.legalWorkflowConfirmedBy', isNonEmptyString(input.submissionConfirmations.legalWorkflowConfirmedBy));
  addMissing(confirmationMissing, 'submissionConfirmations.submittedAt', isIsoDateTime(input.submissionConfirmations.submittedAt));

  return [
    { id: 'official-source-scope', label: '官方来源范围', ready: sourceMissing.length === 0, missingFields: sourceMissing },
    { id: 'sku-owner', label: 'SKU owner', ready: skuMissing.length === 0, missingFields: skuMissing },
    { id: 'legal-review-workflow', label: '法务 reviewer 与 SLA', ready: legalMissing.length === 0, missingFields: legalMissing },
    { id: 'evidence-handoff', label: '证据交接', ready: evidenceMissing.length === 0, missingFields: evidenceMissing },
    { id: 'withdrawal-governance', label: '撤回治理', ready: withdrawalMissing.length === 0, missingFields: withdrawalMissing },
    { id: 'submission-confirmations', label: '提交确认', ready: confirmationMissing.length === 0, missingFields: confirmationMissing },
  ];
}

function validateSyntheticIdentity(input, errors) {
  if (!asArray(input.sourceScope.sourceRegistryIds).every((value) => typeof value === 'string' && value.startsWith('fixture-source-'))) addError(errors, '$.sourceScope.sourceRegistryIds', 'synthetic-source-id', 'Synthetic source ids must start with fixture-source-.');
  if (!asArray(input.sourceScope.jurisdictionCodes).every((value) => value === 'TEST-ONLY')) addError(errors, '$.sourceScope.jurisdictionCodes', 'synthetic-jurisdiction', 'Synthetic jurisdictions must be TEST-ONLY.');
  if (!asArray(input.sourceScope.officialSourceHosts).every((value) => typeof value === 'string' && value.endsWith('.invalid'))) addError(errors, '$.sourceScope.officialSourceHosts', 'synthetic-host', 'Synthetic source hosts must use the reserved .invalid suffix.');
  if (!asArray(input.skuOwnership.skuIds).every((value) => typeof value === 'string' && value.startsWith('fixture-sku-'))) addError(errors, '$.skuOwnership.skuIds', 'synthetic-sku-id', 'Synthetic SKU ids must start with fixture-sku-.');
  if (!asArray(input.skuOwnership.targetMarkets).every((value) => value === 'TEST-ONLY')) addError(errors, '$.skuOwnership.targetMarkets', 'synthetic-target-market', 'Synthetic target markets must be TEST-ONLY.');
}

function isInsidePrivateConfig(inputPath, appRoot) {
  if (!isNonEmptyString(inputPath) || inputPath === 'memory') return false;
  const target = resolve(appRoot, inputPath);
  const privateRoot = resolve(appRoot, 'configs/private');
  const relativePath = relative(privateRoot, target);
  return relativePath !== '' && !relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !isAbsolute(relativePath);
}

export function validateRegulationSourceLegalIntake(input, options = {}) {
  const errors = [];
  if (!requireExactObject(input, TOP_LEVEL_KEYS, '$', errors)) return { contractValid: false, errors, groups: [] };
  for (const [section, keys] of Object.entries(SECTION_KEYS)) requireExactObject(input[section], keys, `$.${section}`, errors);
  if (errors.some((error) => error.code === 'object-required')) return { contractValid: false, errors, groups: [] };

  if (input.contractVersion !== INTAKE_CONTRACT_VERSION) addError(errors, '$.contractVersion', 'contract-version', `Expected ${INTAKE_CONTRACT_VERSION}.`);
  if (!INPUT_CLASSES.has(input.inputClass)) addError(errors, '$.inputClass', 'invalid-input-class', 'Unknown input class.');
  validateNullableString(input.requestId, '$.requestId', errors);
  if (!isIsoDateTime(input.generatedAt)) addError(errors, '$.generatedAt', 'date-time-required', 'generatedAt must be an ISO date-time.');

  for (const key of ['sourceRegistryIds', 'jurisdictionCodes', 'officialSourceHosts', 'allowedDocumentTypes', 'requestedClaimScopes']) validateStringArray(input.sourceScope[key], `$.sourceScope.${key}`, errors);
  for (const key of ['collectionWindowStart', 'collectionWindowEnd', 'scopeOwnerId']) validateNullableString(input.sourceScope[key], `$.sourceScope.${key}`, errors);
  for (const key of ['collectionWindowStart', 'collectionWindowEnd']) {
    if (input.sourceScope[key] !== null && !isIsoDate(input.sourceScope[key])) addError(errors, `$.sourceScope.${key}`, 'date-required', 'Expected a valid ISO calendar date or null.');
  }
  if (asArray(input.sourceScope.officialSourceHosts).some((host) => typeof host !== 'string' || !HOST_PATTERN.test(host) || host.includes('..'))) addError(errors, '$.sourceScope.officialSourceHosts', 'invalid-host', 'Official source hosts must be bare lowercase host names.');
  if (asArray(input.sourceScope.allowedDocumentTypes).some((type) => !ALLOWED_DOCUMENT_TYPES.has(type))) addError(errors, '$.sourceScope.allowedDocumentTypes', 'invalid-document-type', 'Document type is outside the intake contract.');
  if (isIsoDate(input.sourceScope.collectionWindowStart) && isIsoDate(input.sourceScope.collectionWindowEnd) && input.sourceScope.collectionWindowStart > input.sourceScope.collectionWindowEnd) addError(errors, '$.sourceScope.collectionWindowEnd', 'collection-window-order', 'Collection window end must not precede its start.');

  for (const key of ['skuIds', 'targetMarkets']) validateStringArray(input.skuOwnership[key], `$.skuOwnership.${key}`, errors);
  for (const key of ['skuOwnerId', 'ownerRole', 'authorizationEvidenceRef', 'expiresAt']) validateNullableString(input.skuOwnership[key], `$.skuOwnership.${key}`, errors);
  if (input.skuOwnership.expiresAt !== null && !isIsoDateTime(input.skuOwnership.expiresAt)) addError(errors, '$.skuOwnership.expiresAt', 'date-time-required', 'expiresAt must be a valid timezone-bearing ISO date-time or null.');
  if (isIsoDateTime(input.skuOwnership.expiresAt) && isIsoDateTime(input.generatedAt) && Date.parse(input.skuOwnership.expiresAt) <= Date.parse(input.generatedAt)) addError(errors, '$.skuOwnership.expiresAt', 'authorization-expired', 'SKU authorization evidence must expire after generatedAt.');

  for (const key of ['reviewerId', 'reviewerRole', 'escalationOwnerId', 'decisionPolicyRef']) validateNullableString(input.legalReviewWorkflow[key], `$.legalReviewWorkflow.${key}`, errors);
  if (input.legalReviewWorkflow.approvalSlaHours !== null && !isPositiveInteger(input.legalReviewWorkflow.approvalSlaHours, 720)) addError(errors, '$.legalReviewWorkflow.approvalSlaHours', 'invalid-sla', 'Approval SLA must be 1-720 hours or null.');
  if (!arraysEqual(input.legalReviewWorkflow.requiredDecisionStates, REQUIRED_DECISION_STATES)) addError(errors, '$.legalReviewWorkflow.requiredDecisionStates', 'decision-states-contract', 'Required decision states cannot be changed.');

  for (const key of ['handoffOwnerId', 'snapshotStoreRef', 'reviewEventStoreRef']) validateNullableString(input.evidenceHandoff[key], `$.evidenceHandoff.${key}`, errors);
  if (input.evidenceHandoff.hashAlgorithm !== 'sha256') addError(errors, '$.evidenceHandoff.hashAlgorithm', 'hash-contract', 'Only sha256 is allowed.');
  if (input.evidenceHandoff.retentionDays !== null && !isPositiveInteger(input.evidenceHandoff.retentionDays)) addError(errors, '$.evidenceHandoff.retentionDays', 'invalid-retention', 'Retention days must be a positive integer or null.');
  if (!arraysEqual(input.evidenceHandoff.requiredArtifacts, REQUIRED_ARTIFACTS)) addError(errors, '$.evidenceHandoff.requiredArtifacts', 'artifact-checklist-contract', 'Required evidence checklist cannot be changed.');

  validateNullableString(input.withdrawalGovernance.withdrawalOwnerId, '$.withdrawalGovernance.withdrawalOwnerId', errors);
  if (input.withdrawalGovernance.propagationSlaHours !== null && !isPositiveInteger(input.withdrawalGovernance.propagationSlaHours, 168)) addError(errors, '$.withdrawalGovernance.propagationSlaHours', 'invalid-withdrawal-sla', 'Withdrawal SLA must be 1-168 hours or null.');
  validateStringArray(input.withdrawalGovernance.affectedSurfaces, '$.withdrawalGovernance.affectedSurfaces', errors);
  if (input.withdrawalGovernance.reasonRequired !== true || input.withdrawalGovernance.auditEventRequired !== true) addError(errors, '$.withdrawalGovernance', 'withdrawal-controls-required', 'Reason and audit event controls must remain enabled.');

  for (const key of ['ownerSubmissionRef', 'sourceScopeConfirmedBy', 'skuScopeConfirmedBy', 'legalWorkflowConfirmedBy', 'submittedAt']) validateNullableString(input.submissionConfirmations[key], `$.submissionConfirmations.${key}`, errors);
  if (input.submissionConfirmations.submittedAt !== null && !isIsoDateTime(input.submissionConfirmations.submittedAt)) addError(errors, '$.submissionConfirmations.submittedAt', 'date-time-required', 'submittedAt must be a valid timezone-bearing ISO date-time or null.');
  for (const key of SECTION_KEYS.disclosure) {
    if (input.disclosure[key] !== true) addError(errors, `$.disclosure.${key}`, 'disclosure-boundary-required', `${key} must remain true.`);
  }

  for (const path of findSensitiveKeys(input)) addError(errors, path, 'sensitive-key-forbidden', 'Secrets and credentials are forbidden in this intake packet.');

  if (input.inputClass === 'empty-readiness-template') {
    if (input.requestId !== null) addError(errors, '$.requestId', 'empty-template-value', 'Empty template requestId must remain null.');
  }
  if (input.inputClass === 'synthetic-readiness-fixture') validateSyntheticIdentity(input, errors);
  if (input.inputClass === 'owner-submitted-intake') {
    const appRoot = resolve(options.appRoot ?? process.cwd());
    if (!isInsidePrivateConfig(options.inputPath, appRoot)) addError(errors, '$.inputClass', 'private-input-path-required', 'Owner-submitted intake must be read from configs/private/.');
    if (asArray(input.sourceScope.sourceRegistryIds).some((id) => !OFFICIAL_SOURCE_REGISTRY_IDS.has(id))) addError(errors, '$.sourceScope.sourceRegistryIds', 'source-not-allowlisted', 'Owner-submitted source ids must be registered DATA-REG sources.');
    for (const path of findSyntheticMarkers(input)) addError(errors, path, 'synthetic-marker-forbidden', 'Owner-submitted intake cannot contain reserved synthetic markers.');
  }

  const groups = buildReadinessGroups(input);
  return { contractValid: errors.length === 0, errors, groups };
}

export function buildRegulationSourceLegalIntakeReport(input, options = {}) {
  const validation = validateRegulationSourceLegalIntake(input, options);
  const groups = validation.groups;
  const readyGroups = groups.filter((group) => group.ready).length;
  const readinessComplete = validation.contractValid && groups.length === INTAKE_GROUP_COUNT && readyGroups === INTAKE_GROUP_COUNT;
  const synthetic = input?.inputClass === 'synthetic-readiness-fixture';
  const status = !validation.contractValid
    ? 'blocked-contract-invalid'
    : !readinessComplete
      ? 'blocked-required-input'
      : synthetic
        ? 'synthetic-shape-valid-not-authorized'
        : input?.inputClass === 'owner-submitted-intake'
          ? 'ready-for-independent-authorization-review'
          : 'blocked-input-class';

  return {
    schemaVersion: 'mkt53.data-reg-intake-readiness-report.v1',
    contractVersion: input?.contractVersion ?? null,
    inputClass: input?.inputClass ?? null,
    evidenceGrade: 'L2-fixture-or-dry-run',
    status,
    passed: validation.contractValid,
    readiness: {
      complete: readinessComplete,
      readyGroups,
      totalGroups: INTAKE_GROUP_COUNT,
      groups,
      missingFields: groups.flatMap((group) => group.missingFields),
    },
    decision: {
      readyForIndependentAuthorizationReview: status === 'ready-for-independent-authorization-review',
      authorizedToCollect: false,
      authorizedToEvaluateRealSkus: false,
      authorizedToPublish: false,
      authorizedToWriteProduction: false,
    },
    boundaries: {
      noNetwork: true,
      regulatoryFactsCollected: 0,
      realSkusEvaluated: 0,
      legalConclusionsGenerated: 0,
      providerCalls: 0,
      connectorCalls: 0,
      businessDataWrites: 0,
      canonicalPublicWrites: 0,
      productionWrites: 0,
      deployment: false,
      factPromotion: false,
      secretsAccepted: false,
    },
    errors: validation.errors,
  };
}

function parseArgs(argv) {
  const fileIndex = argv.indexOf('--file');
  return {
    json: argv.includes('--json'),
    file: fileIndex >= 0 ? argv[fileIndex + 1] : 'scripts/data/templates/regulation-source-legal-intake-template.json',
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.file) throw new Error('--file requires a path.');
  const appRoot = process.cwd();
  const input = JSON.parse(readFileSync(resolve(appRoot, options.file), 'utf8'));
  const report = buildRegulationSourceLegalIntakeReport(input, { appRoot, inputPath: options.file });
  process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : `${report.status}: ${report.readiness.readyGroups}/${report.readiness.totalGroups} groups ready`}\n`);
  if (!report.passed) process.exitCode = 1;
}

const invokedUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (import.meta.url === invokedUrl) main();
