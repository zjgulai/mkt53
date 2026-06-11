#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildConnectorBacklog } from '../lib/connector-backlog.mjs';
import { extractSourceRegistry, isoWeek } from '../lib/project-analysis.mjs';

const connectorId = 'internal-crm';
const defaultWritePath = 'tmp/data-collection/connectors/internal-crm-dry-run.json';
const readinessTemplatePath = 'scripts/data/connectors/templates/internal-crm-readiness-template.json';
const snapshotManifestTemplatePath = 'scripts/data/connectors/templates/internal-crm-snapshot-manifest-template.json';
const recommendedLocalPrivateReadinessPath = 'configs/private/internal-crm-readiness.json';
const recommendedServerPrivateReadinessPath = '/opt/mkt53/private/internal-crm-readiness.json';
const recommendedLocalPrivateSnapshotManifestPath = 'configs/private/internal-crm-snapshot-manifest.json';
const recommendedServerPrivateSnapshotManifestPath = '/opt/mkt53/private/internal-crm-snapshot-manifest.json';
const minimumAnonymizedCustomerRows = 1000;
const minimumSegmentCount = 7;
const requiredSegments = ['champions', 'loyal-customers', 'potential-loyalists', 'new-customers', 'at-risk', 'hibernating', 'lost'];
const forbiddenSecretKeyPattern = /secret|password|accessToken|refreshToken|clientSecret|privateKey|authorizationHeader|apiKey|connectionString|jdbc|odbc|(^|[._-])dsn($|[._-])|dbDsn/i;
const forbiddenPiiKeyPattern = /^(email|phone|mobile|fullName|name|address|rawCustomerId|crmCustomerId|customerId|orderId)$/i;

const snapshotContracts = [
  {
    snapshotType: 'customer_rfm_snapshot',
    requiredFields: [
      'requestId',
      'sourceId',
      'snapshotId',
      'anonymizedCustomerId',
      'segment',
      'recencyDays',
      'frequency',
      'monetaryUsd',
      'capturedAt',
      'rfmModelVersion',
    ],
  },
  {
    snapshotType: 'retention_segment_snapshot',
    requiredFields: [
      'requestId',
      'sourceId',
      'snapshotId',
      'segment',
      'customerCount',
      'pctOfUserbase',
      'avgOrderValueUsd',
      'churnRisk',
      'capturedAt',
      'rfmModelVersion',
    ],
  },
];

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    readinessGate: argv.includes('--readiness-gate'),
    printReadinessTemplate: argv.includes('--print-readiness-template'),
    printSnapshotManifestTemplate: argv.includes('--print-snapshot-manifest-template'),
    writePath: defaultWritePath,
    readinessPath: undefined,
    snapshotManifestPath: undefined,
    windowStart: '2026-06-01',
    windowEnd: '2026-06-15',
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--write') options.writePath = argv[i + 1];
    if (argv[i] === '--readiness') options.readinessPath = argv[i + 1];
    if (argv[i] === '--snapshot-manifest') options.snapshotManifestPath = argv[i + 1];
    if (argv[i] === '--window-start') options.windowStart = argv[i + 1];
    if (argv[i] === '--window-end') options.windowEnd = argv[i + 1];
  }

  return options;
}

function readTemplate(path) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function readJsonObject(path, label) {
  if (!path) return undefined;

  const payload = JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload;

  throw new Error(`${label} must be a JSON object.`);
}

function readReadinessRecord(readinessPath) {
  const payload = readJsonObject(readinessPath, 'CRM readiness file');
  if (!payload) return undefined;
  if (payload.readiness && typeof payload.readiness === 'object' && !Array.isArray(payload.readiness)) return payload.readiness;
  return payload;
}

function readSnapshotManifest(snapshotManifestPath) {
  const payload = readJsonObject(snapshotManifestPath, 'CRM snapshot manifest file');
  if (!payload) return undefined;
  if (payload.snapshotManifest && typeof payload.snapshotManifest === 'object' && !Array.isArray(payload.snapshotManifest)) {
    return payload.snapshotManifest;
  }
  return payload;
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function numberValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function findForbiddenKeys(value, prefix = '') {
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const ownMatches = forbiddenSecretKeyPattern.test(key) || forbiddenPiiKeyPattern.test(key) ? [path] : [];
    return [...ownMatches, ...findForbiddenKeys(nestedValue, path)];
  });
}

function buildCheck(id, label, ready, details, blocker) {
  return {
    id,
    label,
    status: ready ? 'ready' : 'blocked',
    details,
    blockers: ready || !blocker ? [] : [blocker],
  };
}

function readinessValue(readiness, snapshotManifest, key) {
  if (readiness && readiness[key] !== undefined) return readiness[key];
  if (snapshotManifest && snapshotManifest[key] !== undefined) return snapshotManifest[key];
  return undefined;
}

function buildReadinessView(readiness, snapshotManifest) {
  return {
    authorizationRecordId: readiness?.authorizationRecordId,
    authorizationOwner: readiness?.authorizationOwner,
    authorizationApprovedAt: readiness?.authorizationApprovedAt,
    collectionWindowStart: readinessValue(readiness, snapshotManifest, 'collectionWindowStart'),
    collectionWindowEnd: readinessValue(readiness, snapshotManifest, 'collectionWindowEnd'),
    snapshotId: readinessValue(readiness, snapshotManifest, 'snapshotId'),
    sourceIds: stringArray(readinessValue(readiness, snapshotManifest, 'sourceIds')),
    anonymizedCustomerRowCount: numberValue(readinessValue(readiness, snapshotManifest, 'anonymizedCustomerRowCount')),
    segmentCount: numberValue(readinessValue(readiness, snapshotManifest, 'segmentCount')),
    segmentCustomerCounts: readinessValue(readiness, snapshotManifest, 'segmentCustomerCounts') ?? {},
    rfmModelVersion: readinessValue(readiness, snapshotManifest, 'rfmModelVersion'),
    scoringRuleVersion: readinessValue(readiness, snapshotManifest, 'scoringRuleVersion'),
    recencyWindowDays: numberValue(readinessValue(readiness, snapshotManifest, 'recencyWindowDays')),
    frequencyWindowDays: numberValue(readinessValue(readiness, snapshotManifest, 'frequencyWindowDays')),
    monetaryCurrency: readinessValue(readiness, snapshotManifest, 'monetaryCurrency'),
    allowedExportFields: stringArray(readinessValue(readiness, snapshotManifest, 'allowedExportFields')),
    anonymizationStatus: readinessValue(readiness, snapshotManifest, 'anonymizationStatus'),
    piiHandlingStatus: readinessValue(readiness, snapshotManifest, 'piiHandlingStatus'),
    containsRawPii: readinessValue(readiness, snapshotManifest, 'containsRawPii'),
    reviewOwner: readiness?.reviewOwner,
    reviewApprovedAt: readiness?.reviewApprovedAt,
    complianceReviewer: readiness?.complianceReviewer,
    complianceReviewStatus: readiness?.complianceReviewStatus,
    allowedSnapshotTypes: stringArray(readiness?.allowedSnapshotTypes),
  };
}

function segmentCountsCoverRequiredSegments(segmentCustomerCounts) {
  if (!segmentCustomerCounts || typeof segmentCustomerCounts !== 'object' || Array.isArray(segmentCustomerCounts)) return false;
  return requiredSegments.every((segment) => numberValue(segmentCustomerCounts[segment]) > 0);
}

function exportFieldsAreSafe(fields) {
  return fields.length > 0 && fields.every((field) => !forbiddenPiiKeyPattern.test(field) && !forbiddenSecretKeyPattern.test(field));
}

function buildInternalCrmReadinessGate(dryRun, options = {}, env = process.env) {
  const readinessPath = options.readinessPath ?? env.MKT53_CRM_READINESS_PATH;
  const snapshotManifestPath = options.snapshotManifestPath ?? env.MKT53_CRM_SNAPSHOT_MANIFEST_PATH;
  const readinessPathSource = options.readinessPath ? 'cli' : env.MKT53_CRM_READINESS_PATH ? 'env:MKT53_CRM_READINESS_PATH' : 'none';
  const snapshotManifestPathSource = options.snapshotManifestPath
    ? 'cli'
    : env.MKT53_CRM_SNAPSHOT_MANIFEST_PATH
      ? 'env:MKT53_CRM_SNAPSHOT_MANIFEST_PATH'
      : 'none';
  const readiness = readReadinessRecord(readinessPath);
  const snapshotManifest = readSnapshotManifest(snapshotManifestPath);
  const record = buildReadinessView(readiness, snapshotManifest);
  const expectedSnapshotTypes = snapshotContracts.map((contract) => contract.snapshotType);
  const missingSourceIds = dryRun.sourceIds.filter((sourceId) => !record.sourceIds.includes(sourceId));
  const missingSnapshotTypes = expectedSnapshotTypes.filter((snapshotType) => !record.allowedSnapshotTypes.includes(snapshotType));
  const forbiddenKeys = [...findForbiddenKeys(readiness), ...findForbiddenKeys(snapshotManifest)];
  const collectionWindowStartValid = isIsoDate(record.collectionWindowStart);
  const collectionWindowEndValid = isIsoDate(record.collectionWindowEnd);
  const collectionWindowOrderValid =
    collectionWindowStartValid && collectionWindowEndValid && record.collectionWindowStart <= record.collectionWindowEnd;
  const collectionWindowMatchesDryRun =
    record.collectionWindowStart === dryRun.collectionWindow.start && record.collectionWindowEnd === dryRun.collectionWindow.end;
  const rawPiiAbsent = record.containsRawPii === false || record.containsRawPii === 'false';
  const segmentCountsCovered = segmentCountsCoverRequiredSegments(record.segmentCustomerCounts);
  const exportFieldsSafe = exportFieldsAreSafe(record.allowedExportFields);

  const checks = [
    buildCheck(
      'authorizationRecord',
      'CRM read-only export authorization is approved and owned',
      Boolean(readiness?.authorizationRecordId && readiness?.authorizationOwner && isIsoDate(readiness?.authorizationApprovedAt)),
      {
        readinessPathSource,
        configured: Boolean(readinessPath),
        authorizationRecordId: readiness?.authorizationRecordId ?? '',
        authorizationOwner: readiness?.authorizationOwner ?? '',
        authorizationApprovedAt: readiness?.authorizationApprovedAt ?? '',
      },
      { type: readinessPath ? 'invalid-authorization-record' : 'missing-readiness-record' },
    ),
    buildCheck(
      'collectionWindow',
      'Collection window is dated and matches this gate run',
      collectionWindowOrderValid && collectionWindowMatchesDryRun,
      {
        expectedStart: dryRun.collectionWindow.start,
        expectedEnd: dryRun.collectionWindow.end,
        configuredStart: record.collectionWindowStart ?? '',
        configuredEnd: record.collectionWindowEnd ?? '',
        validDateOrder: collectionWindowOrderValid,
      },
      { type: 'invalid-collection-window' },
    ),
    buildCheck(
      'sourceCoverage',
      'Private CRM snapshot manifest covers every CRM source id',
      missingSourceIds.length === 0,
      {
        expectedSourceIds: dryRun.sourceIds,
        configuredSourceIds: record.sourceIds,
        missingSourceIds,
      },
      { type: 'source-coverage-incomplete', missingSourceIds },
    ),
    buildCheck(
      'snapshotVolume',
      'CRM anonymized rows and RFM segments meet minimum thresholds',
      record.anonymizedCustomerRowCount >= minimumAnonymizedCustomerRows &&
        record.segmentCount >= minimumSegmentCount &&
        segmentCountsCovered,
      {
        minimumAnonymizedCustomerRows,
        minimumSegmentCount,
        anonymizedCustomerRowCount: Number.isNaN(record.anonymizedCustomerRowCount) ? 0 : record.anonymizedCustomerRowCount,
        segmentCount: Number.isNaN(record.segmentCount) ? 0 : record.segmentCount,
        requiredSegments,
        segmentCountsCovered,
      },
      { type: 'snapshot-volume-incomplete' },
    ),
    buildCheck(
      'rfmDefinition',
      'RFM model and scoring rules are versioned',
      Boolean(
        record.snapshotId &&
          record.rfmModelVersion &&
          record.scoringRuleVersion &&
          record.recencyWindowDays > 0 &&
          record.frequencyWindowDays > 0 &&
          record.monetaryCurrency === 'USD',
      ),
      {
        snapshotId: record.snapshotId ?? '',
        rfmModelVersion: record.rfmModelVersion ?? '',
        scoringRuleVersion: record.scoringRuleVersion ?? '',
        recencyWindowDays: Number.isNaN(record.recencyWindowDays) ? 0 : record.recencyWindowDays,
        frequencyWindowDays: Number.isNaN(record.frequencyWindowDays) ? 0 : record.frequencyWindowDays,
        monetaryCurrency: record.monetaryCurrency ?? '',
      },
      { type: 'rfm-definition-incomplete' },
    ),
    buildCheck(
      'privacyBoundary',
      'CRM export is anonymized and field allowlist excludes PII',
      record.anonymizationStatus === 'approved' &&
        record.piiHandlingStatus === 'approved' &&
        rawPiiAbsent &&
        exportFieldsSafe &&
        forbiddenKeys.length === 0,
      {
        anonymizationStatus: record.anonymizationStatus ?? '',
        piiHandlingStatus: record.piiHandlingStatus ?? '',
        containsRawPii: record.containsRawPii ?? '',
        allowedExportFields: record.allowedExportFields,
        forbiddenKeys,
      },
      { type: 'privacy-boundary-incomplete', fields: forbiddenKeys },
    ),
    buildCheck(
      'ownerReview',
      'Business owner review is approved',
      Boolean(readiness?.reviewOwner && isIsoDate(readiness?.reviewApprovedAt)),
      {
        reviewOwner: readiness?.reviewOwner ?? '',
        reviewApprovedAt: readiness?.reviewApprovedAt ?? '',
      },
      { type: 'missing-owner-review' },
    ),
    buildCheck(
      'complianceReview',
      'Compliance review is approved',
      readiness?.complianceReviewStatus === 'approved',
      {
        complianceReviewer: readiness?.complianceReviewer ?? '',
        complianceReviewStatus: readiness?.complianceReviewStatus ?? '',
      },
      { type: 'missing-compliance-approval' },
    ),
    buildCheck(
      'snapshotScope',
      'Allowed snapshot types cover the CRM output contract',
      missingSnapshotTypes.length === 0,
      {
        expectedSnapshotTypes,
        allowedSnapshotTypes: record.allowedSnapshotTypes,
        missingSnapshotTypes,
      },
      { type: 'snapshot-scope-incomplete', missingSnapshotTypes },
    ),
    buildCheck(
      'safetyBoundary',
      'Gate does not read CRM, call private systems, or write business snapshots',
      dryRun.safety.networkCalls === 0 && dryRun.safety.databaseReads === 0 && dryRun.safety.businessDataWrites === 0 && dryRun.safety.dryRunOnly,
      {
        networkCalls: dryRun.safety.networkCalls,
        databaseReads: dryRun.safety.databaseReads,
        businessDataWrites: dryRun.safety.businessDataWrites,
        dryRunOnly: dryRun.safety.dryRunOnly,
      },
      { type: 'safety-boundary-violated' },
    ),
  ];
  const blockers = checks.flatMap((check) => check.blockers);

  return {
    schemaVersion: 1,
    connectorId,
    mode: 'readiness-gate',
    generatedAt: dryRun.generatedAt,
    requestId: dryRun.requestId.replace('internal-crm-dry-run-', 'internal-crm-readiness-'),
    status: blockers.length === 0 ? 'ready-for-authorized-crm-rfm-pipeline-implementation' : 'blocked',
    readinessPathSource,
    snapshotManifestPathSource,
    privateInput: {
      readinessPathConfigured: Boolean(readinessPath),
      snapshotManifestPathConfigured: Boolean(snapshotManifestPath),
      recommendedLocalPrivateReadinessPath,
      recommendedServerPrivateReadinessPath,
      recommendedLocalPrivateSnapshotManifestPath,
      recommendedServerPrivateSnapshotManifestPath,
      publicBundleAllowed: false,
      gitAllowed: false,
    },
    thresholds: {
      minimumAnonymizedCustomerRows,
      minimumSegmentCount,
      requiredSegments,
    },
    checks,
    blockers,
    safety: dryRun.safety,
    stopCondition:
      'status=ready-for-authorized-crm-rfm-pipeline-implementation only when authorization, window, anonymized row coverage, RFM model version, privacy boundary, owner review, compliance review and snapshot scope are all ready.',
  };
}

export function buildInternalCrmDryRun(options = {}, env = process.env) {
  const appRoot = options.appRoot ?? process.cwd();
  const generatedAt = new Date().toISOString();
  const sourceRegistry = extractSourceRegistry(appRoot);
  const connectorBacklog = buildConnectorBacklog(sourceRegistry);
  const crmBacklog = connectorBacklog.groups.find((group) => group.connectorId === connectorId);
  const backlogItems = connectorBacklog.items.filter((item) => item.connectorId === connectorId);
  const sourceIds = crmBacklog?.sourceIds ?? [];
  const sourceCount = crmBacklog?.sourceCount ?? 0;
  const blockers = [
    ...(sourceCount === 0 ? [{ type: 'missing-internal-crm-backlog' }] : []),
    { type: 'missing-private-crm-readiness-record' },
    { type: 'missing-private-crm-snapshot-manifest' },
    { type: 'missing-rfm-scoring-rule-version' },
    { type: 'missing-anonymization-approval' },
  ];

  return {
    schemaVersion: 1,
    connectorId,
    mode: 'dry-run',
    status: 'blocked',
    generatedAt,
    week: isoWeek(new Date(generatedAt)),
    requestId: `internal-crm-dry-run-${randomUUID()}`,
    safety: {
      networkCalls: 0,
      databaseReads: 0,
      businessDataWrites: 0,
      privateValuesRedacted: true,
      dryRunOnly: true,
      rule: '该脚本只校验CRM/RFM授权前置条件和输出契约，不读取CRM，不导出客户明细，不生成真实业务快照。',
    },
    collectionWindow: {
      start: options.windowStart,
      end: options.windowEnd,
      timezone: 'Asia/Shanghai',
    },
    sourceIds,
    sourceCount,
    backlogItems,
    requiredAccess: crmBacklog?.requiredAccess ?? ['CRM 只读导出或数仓视图', '客户脱敏规则', 'RFM 计算口径和时间窗口'],
    outputContract: crmBacklog?.outputContract ?? snapshotContracts.map((contract) => contract.snapshotType),
    privateInput: {
      recommendedLocalPrivateReadinessPath,
      recommendedServerPrivateReadinessPath,
      recommendedLocalPrivateSnapshotManifestPath,
      recommendedServerPrivateSnapshotManifestPath,
      readinessTemplatePath,
      snapshotManifestTemplatePath,
      publicBundleAllowed: false,
      gitAllowed: false,
      rule: '真实CRM导出、客户明细、内部owner和RFM输入只能留在私有路径；不得放入 public、src、tests/fixtures 或提交到 git。',
    },
    thresholds: {
      minimumAnonymizedCustomerRows,
      minimumSegmentCount,
      requiredSegments,
    },
    snapshotContracts,
    plannedSnapshots: snapshotContracts.map((contract) => ({
      snapshotType: contract.snapshotType,
      status: 'blocked',
      reason: 'CRM授权、脱敏快照、RFM口径、owner复核或合规审批未满足，不能生成真实用户分层快照。',
      requiredFields: contract.requiredFields,
    })),
    blockers,
    stopCondition: crmBacklog?.stopCondition ?? 'dry-run 输出脱敏字段清单、rowCount、window 和 owner。',
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.printReadinessTemplate) {
    process.stdout.write(readTemplate(readinessTemplatePath));
    return;
  }

  if (options.printSnapshotManifestTemplate) {
    process.stdout.write(readTemplate(snapshotManifestTemplatePath));
    return;
  }

  const result = buildInternalCrmDryRun(options);

  if (options.readinessGate) {
    const gate = buildInternalCrmReadinessGate(result, options);
    process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
    return;
  }

  if (!options.noWrite) {
    const target = resolve(process.cwd(), options.writePath);
    if (existsSync(target)) {
      writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
    } else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
    }
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    'mkt53 internal-crm connector dry-run',
    `status=${result.status}`,
    `requestId=${result.requestId}`,
    `sourceCount=${result.sourceCount}`,
    `networkCalls=${result.safety.networkCalls}`,
    `databaseReads=${result.safety.databaseReads}`,
    `businessDataWrites=${result.safety.businessDataWrites}`,
    options.noWrite ? 'write=disabled' : `write=${options.writePath}`,
    '',
  ].join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
