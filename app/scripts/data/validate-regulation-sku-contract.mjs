#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CONTRACT_VERSION = 'mkt53.regulation-sku-matrix.v1';
export const OFFICIAL_SOURCE_REGISTRY_IDS = new Set([
  'ds-016',
  'policy-cpsc-efiling',
  'policy-eu-mdr-transition',
]);
const OFFICIAL_SOURCE_HOSTS_BY_REGISTRY_ID = new Map([
  ['ds-016', new Set(['health.ec.europa.eu', 'www.gov.uk', 'www.canada.ca', 'www.tuv.com'])],
  ['policy-cpsc-efiling', new Set(['www.cpsc.gov'])],
  ['policy-eu-mdr-transition', new Set(['health.ec.europa.eu'])],
]);

const EVIDENCE_CLASSES = new Set(['synthetic-contract-fixture', 'official-source-snapshot']);
const APPLICABILITY_VALUES = new Set(['unknown', 'in-scope', 'out-of-scope', 'conditional']);
const DECISION_STATUSES = new Set(['draft', 'legal-review-required', 'approved', 'rejected', 'withdrawn']);
const DECISIVE_STATUSES = new Set(['approved', 'rejected']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateTime(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isIsoDate(value) {
  return isNonEmptyString(value) && ISO_DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isAllowedOfficialSourceUrl(sourceRegistryId, value) {
  if (!isNonEmptyString(value)) return false;

  try {
    const url = new URL(value);
    const allowedHosts = OFFICIAL_SOURCE_HOSTS_BY_REGISTRY_ID.get(sourceRegistryId);
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      allowedHosts?.has(url.hostname) === true
    );
  } catch {
    return false;
  }
}

function isSafeLocalEvidencePath(value) {
  if (!isNonEmptyString(value) || value.startsWith('/') || value.includes('\\')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;

  const segments = value.split('/');
  return ['tmp', 'configs', 'docs'].includes(segments[0]) && segments.every((segment) => segment !== '' && segment !== '..');
}

function addError(errors, path, code, message) {
  errors.push({ path, code, message });
}

function requireKeys(value, keys, path, errors) {
  if (!isObject(value)) {
    addError(errors, path, 'object-required', 'Expected an object.');
    return false;
  }

  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      addError(errors, `${path}.${key}`, 'required', 'Required field is missing.');
    }
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      addError(errors, `${path}.${key}`, 'additional-property', 'Unexpected field is not allowed by the contract.');
    }
  }
  return true;
}

function validateRecord(record, index, evidenceClass, errors) {
  const path = `records[${index}]`;
  if (!requireKeys(record, ['id', 'source', 'sku', 'decision', 'evidence', 'publication'], path, errors)) return;

  if (!isNonEmptyString(record.id)) addError(errors, `${path}.id`, 'non-empty-string', 'Record id must be non-empty.');

  const sourceOk = requireKeys(record.source, [
    'sourceRegistryId', 'jurisdiction', 'authority', 'title', 'officialUrl', 'retrievedAt',
    'contentSha256', 'effectiveFrom', 'effectiveTo', 'claimScope',
  ], `${path}.source`, errors);
  const skuOk = requireKeys(record.sku, ['skuId', 'productFamily', 'targetMarket'], `${path}.sku`, errors);
  const decisionOk = requireKeys(record.decision, [
    'applicability', 'status', 'scopeBasis', 'rationale', 'reviewerId', 'reviewedAt', 'reason',
  ], `${path}.decision`, errors);
  const evidenceOk = requireKeys(record.evidence, ['snapshotId', 'reviewDecisionId', 'sourceEvidencePath'], `${path}.evidence`, errors);
  const publicationOk = requireKeys(record.publication, [
    'canDisplayAsComplianceFact', 'notLegalAdvice', 'blockedReasons',
  ], `${path}.publication`, errors);

  if (sourceOk) {
    if (!isNonEmptyString(record.source.jurisdiction)) addError(errors, `${path}.source.jurisdiction`, 'non-empty-string', 'Jurisdiction must be non-empty.');
    if (!isNonEmptyString(record.source.claimScope)) addError(errors, `${path}.source.claimScope`, 'non-empty-string', 'Claim scope must be non-empty.');
  }
  if (skuOk) {
    for (const key of ['skuId', 'productFamily', 'targetMarket']) {
      if (!isNonEmptyString(record.sku[key])) addError(errors, `${path}.sku.${key}`, 'non-empty-string', `${key} must be non-empty.`);
    }
  }
  if (decisionOk) {
    if (!APPLICABILITY_VALUES.has(record.decision.applicability)) addError(errors, `${path}.decision.applicability`, 'invalid-enum', 'Unknown applicability state.');
    if (!DECISION_STATUSES.has(record.decision.status)) addError(errors, `${path}.decision.status`, 'invalid-enum', 'Unknown decision status.');
    if (!isNonEmptyString(record.decision.scopeBasis)) addError(errors, `${path}.decision.scopeBasis`, 'non-empty-string', 'Scope basis must be non-empty.');
    if (!isNonEmptyString(record.decision.rationale)) addError(errors, `${path}.decision.rationale`, 'non-empty-string', 'Rationale must be non-empty.');
  }
  if (publicationOk) {
    if (typeof record.publication.canDisplayAsComplianceFact !== 'boolean') addError(errors, `${path}.publication.canDisplayAsComplianceFact`, 'boolean-required', 'Publication flag must be boolean.');
    if (record.publication.notLegalAdvice !== true) addError(errors, `${path}.publication.notLegalAdvice`, 'disclosure-required', 'notLegalAdvice must remain true.');
    if (!Array.isArray(record.publication.blockedReasons)) addError(errors, `${path}.publication.blockedReasons`, 'array-required', 'blockedReasons must be an array.');
  }

  if (!(sourceOk && decisionOk && evidenceOk && publicationOk)) return;

  const isSynthetic = evidenceClass === 'synthetic-contract-fixture';
  const isDecisive = DECISIVE_STATUSES.has(record.decision.status);
  if (isSynthetic) {
    const forbiddenSyntheticValues = [
      ['source.sourceRegistryId', record.source.sourceRegistryId],
      ['source.authority', record.source.authority],
      ['source.title', record.source.title],
      ['source.officialUrl', record.source.officialUrl],
      ['source.retrievedAt', record.source.retrievedAt],
      ['source.contentSha256', record.source.contentSha256],
      ['source.effectiveFrom', record.source.effectiveFrom],
      ['source.effectiveTo', record.source.effectiveTo],
      ['decision.reviewerId', record.decision.reviewerId],
      ['decision.reviewedAt', record.decision.reviewedAt],
      ['decision.reason', record.decision.reason],
      ['evidence.snapshotId', record.evidence.snapshotId],
      ['evidence.reviewDecisionId', record.evidence.reviewDecisionId],
      ['evidence.sourceEvidencePath', record.evidence.sourceEvidencePath],
    ];
    for (const [field, value] of forbiddenSyntheticValues) {
      if (value !== null) addError(errors, `${path}.${field}`, 'synthetic-must-be-null', 'Synthetic fixtures cannot carry official or reviewed evidence.');
    }
    if (record.decision.applicability !== 'unknown') addError(errors, `${path}.decision.applicability`, 'synthetic-applicability', 'Synthetic applicability must remain unknown.');
    if (record.decision.status !== 'legal-review-required') addError(errors, `${path}.decision.status`, 'synthetic-review-gate', 'Synthetic decision status must remain legal-review-required.');
    if (record.publication.canDisplayAsComplianceFact !== false) addError(errors, `${path}.publication.canDisplayAsComplianceFact`, 'synthetic-fact-promotion', 'Synthetic fixtures can never be displayed as compliance facts.');
    if (!Array.isArray(record.publication.blockedReasons) || record.publication.blockedReasons.length === 0) addError(errors, `${path}.publication.blockedReasons`, 'synthetic-block-required', 'Synthetic fixtures require at least one blocked reason.');
  }

  if (evidenceClass === 'official-source-snapshot') {
    if (!OFFICIAL_SOURCE_REGISTRY_IDS.has(record.source.sourceRegistryId)) addError(errors, `${path}.source.sourceRegistryId`, 'source-not-allowlisted', 'Official evidence must reference an allowlisted source registry id.');
    if (!isNonEmptyString(record.source.authority)) addError(errors, `${path}.source.authority`, 'official-authority-required', 'Official source authority is required.');
    if (!isNonEmptyString(record.source.title)) addError(errors, `${path}.source.title`, 'official-title-required', 'Official source title is required.');
    if (!isAllowedOfficialSourceUrl(record.source.sourceRegistryId, record.source.officialUrl)) addError(errors, `${path}.source.officialUrl`, 'official-host-not-allowlisted', 'Official source URL must use HTTPS and match the registry-specific authority host.');
    if (!isIsoDateTime(record.source.retrievedAt)) addError(errors, `${path}.source.retrievedAt`, 'retrieved-at-required', 'Official source retrievedAt must be a date-time.');
    if (!SHA256_PATTERN.test(record.source.contentSha256 ?? '')) addError(errors, `${path}.source.contentSha256`, 'sha256-required', 'Official source content SHA-256 is required.');
    if (record.source.effectiveFrom !== null && !isIsoDate(record.source.effectiveFrom)) addError(errors, `${path}.source.effectiveFrom`, 'effective-date-required', 'effectiveFrom must be null or an ISO date.');
    if (record.source.effectiveTo !== null && !isIsoDate(record.source.effectiveTo)) addError(errors, `${path}.source.effectiveTo`, 'effective-date-required', 'effectiveTo must be null or an ISO date.');
    if (isIsoDate(record.source.effectiveFrom) && isIsoDate(record.source.effectiveTo) && record.source.effectiveFrom > record.source.effectiveTo) addError(errors, `${path}.source.effectiveTo`, 'effective-date-order', 'effectiveTo must not precede effectiveFrom.');
    if (!isNonEmptyString(record.evidence.snapshotId)) addError(errors, `${path}.evidence.snapshotId`, 'snapshot-required', 'Official source evidence requires an immutable snapshot id.');
    if (!isSafeLocalEvidencePath(record.evidence.sourceEvidencePath)) addError(errors, `${path}.evidence.sourceEvidencePath`, 'safe-evidence-path-required', 'Official source evidence requires a repository-relative path under tmp/, configs/, or docs/.');
  }

  if (isDecisive) {
    if (isSynthetic) addError(errors, `${path}.decision.status`, 'synthetic-decision-forbidden', 'Synthetic evidence cannot be approved or rejected.');
    if (!isNonEmptyString(record.decision.reviewerId)) addError(errors, `${path}.decision.reviewerId`, 'reviewer-required', 'Approved or rejected decisions require a reviewer.');
    if (!isIsoDateTime(record.decision.reviewedAt)) addError(errors, `${path}.decision.reviewedAt`, 'reviewed-at-required', 'Approved or rejected decisions require a review time.');
    if (!isNonEmptyString(record.decision.reason)) addError(errors, `${path}.decision.reason`, 'decision-reason-required', 'Approved or rejected decisions require a reason.');
    if (!isNonEmptyString(record.evidence.reviewDecisionId)) addError(errors, `${path}.evidence.reviewDecisionId`, 'review-decision-required', 'Approved or rejected decisions require an append-only review event id.');
  }

  if (record.decision.status === 'withdrawn') {
    if (!isNonEmptyString(record.decision.reason)) addError(errors, `${path}.decision.reason`, 'withdrawal-reason-required', 'Withdrawn decisions require a reason.');
    if (record.publication.canDisplayAsComplianceFact) addError(errors, `${path}.publication.canDisplayAsComplianceFact`, 'withdrawn-fact-promotion', 'Withdrawn decisions cannot be displayed as compliance facts.');
  }

  if (record.publication.canDisplayAsComplianceFact) {
    if (record.decision.status !== 'approved') addError(errors, `${path}.publication.canDisplayAsComplianceFact`, 'approved-only-publication', 'Only approved decisions may be displayed as compliance facts.');
    if (evidenceClass !== 'official-source-snapshot') addError(errors, `${path}.publication.canDisplayAsComplianceFact`, 'official-evidence-required', 'Publishable facts require official-source-snapshot evidence.');
  }
}

export function validateRegulationSkuContract(input) {
  const errors = [];
  if (!requireKeys(input, ['contractVersion', 'evidenceClass', 'generatedAt', 'records', 'disclosure'], '$', errors)) {
    return { passed: false, errors };
  }

  if (input.contractVersion !== CONTRACT_VERSION) addError(errors, '$.contractVersion', 'contract-version', `Expected ${CONTRACT_VERSION}.`);
  if (!EVIDENCE_CLASSES.has(input.evidenceClass)) addError(errors, '$.evidenceClass', 'invalid-enum', 'Unknown evidence class.');
  if (!isIsoDateTime(input.generatedAt)) addError(errors, '$.generatedAt', 'date-time-required', 'generatedAt must be a date-time.');
  if (!Array.isArray(input.records)) {
    addError(errors, '$.records', 'array-required', 'records must be an array.');
  } else {
    input.records.forEach((record, index) => validateRecord(record, index, input.evidenceClass, errors));
    const ids = input.records.filter(isObject).map((record) => record.id).filter(isNonEmptyString);
    if (new Set(ids).size !== ids.length) addError(errors, '$.records', 'duplicate-record-id', 'Record ids must be unique.');
  }

  if (requireKeys(input.disclosure, ['notLegalAdvice', 'officialSnapshots', 'reviewedSkuDecisions', 'publishableComplianceFacts'], '$.disclosure', errors)) {
    if (input.disclosure.notLegalAdvice !== true) addError(errors, '$.disclosure.notLegalAdvice', 'disclosure-required', 'Top-level notLegalAdvice must remain true.');
    for (const key of ['officialSnapshots', 'reviewedSkuDecisions', 'publishableComplianceFacts']) {
      if (!Number.isInteger(input.disclosure[key]) || input.disclosure[key] < 0) addError(errors, `$.disclosure.${key}`, 'non-negative-integer', `${key} must be a non-negative integer.`);
    }
    if (input.evidenceClass === 'synthetic-contract-fixture') {
      for (const key of ['officialSnapshots', 'reviewedSkuDecisions', 'publishableComplianceFacts']) {
        if (input.disclosure[key] !== 0) addError(errors, `$.disclosure.${key}`, 'synthetic-count-must-be-zero', `Synthetic ${key} must remain zero.`);
      }
    }
    if (Array.isArray(input.records)) {
      const officialSnapshots = input.evidenceClass === 'official-source-snapshot'
        ? input.records.filter((record) => isObject(record?.evidence) && isNonEmptyString(record.evidence.snapshotId)).length
        : 0;
      const reviewedSkuDecisions = input.records.filter((record) =>
        isObject(record?.decision) &&
        isObject(record?.evidence) &&
        DECISIVE_STATUSES.has(record.decision.status) &&
        isNonEmptyString(record.decision.reviewerId) &&
        isNonEmptyString(record.evidence.reviewDecisionId)
      ).length;
      const publishableComplianceFacts = input.records.filter((record) =>
        isObject(record?.publication) && record.publication.canDisplayAsComplianceFact === true
      ).length;
      for (const [key, actual] of Object.entries({ officialSnapshots, reviewedSkuDecisions, publishableComplianceFacts })) {
        if (input.disclosure[key] !== actual) addError(errors, `$.disclosure.${key}`, 'count-mismatch', `${key} must equal the validated record count ${actual}.`);
      }
    }
  }

  return { passed: errors.length === 0, errors };
}

export function buildRegulationSkuContractReport(input, inputPath = 'memory') {
  const validation = validateRegulationSkuContract(input);
  return {
    schemaVersion: 'mkt53.data-reg-contract-validation.v1',
    contractVersion: input?.contractVersion ?? null,
    evidenceGrade: 'L2-fixture-or-dry-run',
    status: validation.passed ? 'contract-valid' : 'blocked-contract-invalid',
    passed: validation.passed,
    inputPath,
    counts: {
      records: Array.isArray(input?.records) ? input.records.length : 0,
      officialSnapshots: input?.disclosure?.officialSnapshots ?? 0,
      reviewedSkuDecisions: input?.disclosure?.reviewedSkuDecisions ?? 0,
      publishableComplianceFacts: input?.disclosure?.publishableComplianceFacts ?? 0,
    },
    boundaries: {
      noNetwork: true,
      providerCalls: 0,
      connectorCalls: 0,
      businessDataWrites: 0,
      canonicalPublicWrites: 0,
      productionWrites: 0,
      deployment: false,
      legalConclusionGenerated: false,
      factPromotion: false,
    },
    errors: validation.errors,
  };
}

function parseArgs(argv) {
  const fileIndex = argv.indexOf('--file');
  return {
    json: argv.includes('--json'),
    file: fileIndex >= 0 ? argv[fileIndex + 1] : 'tests/fixtures/regulation-sku-matrix.synthetic.json',
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.file) throw new Error('--file requires a path.');
  const path = resolve(process.cwd(), options.file);
  const input = JSON.parse(readFileSync(path, 'utf8'));
  const report = buildRegulationSkuContractReport(input, options.file);
  const output = options.json
    ? JSON.stringify(report, null, 2)
    : `${report.passed ? 'PASS' : 'BLOCKED'} ${report.contractVersion}: ${report.counts.records} record(s), ${report.errors.length} error(s)`;
  process.stdout.write(`${output}\n`);
  if (!report.passed) process.exitCode = 1;
}

const invokedUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (import.meta.url === invokedUrl) main();
