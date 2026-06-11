#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildConnectorBacklog } from '../lib/connector-backlog.mjs';
import { extractSourceRegistry, isoWeek } from '../lib/project-analysis.mjs';

const connectorId = 'internal-erp';
const defaultWritePath = 'tmp/data-collection/connectors/internal-erp-dry-run.json';
const readinessTemplatePath = 'scripts/data/connectors/templates/internal-erp-readiness-template.json';
const snapshotManifestTemplatePath = 'scripts/data/connectors/templates/internal-erp-snapshot-manifest-template.json';
const recommendedLocalPrivateReadinessPath = 'configs/private/internal-erp-readiness.json';
const recommendedServerPrivateReadinessPath = '/opt/mkt53/private/internal-erp-readiness.json';
const recommendedLocalPrivateSnapshotManifestPath = 'configs/private/internal-erp-snapshot-manifest.json';
const recommendedServerPrivateSnapshotManifestPath = '/opt/mkt53/private/internal-erp-snapshot-manifest.json';
const minimumSkuCount = 50;
const minimumSupplierCount = 5;
const minimumWarehouseCount = 2;
const minimumInventoryRecordCount = 50;
const forbiddenSecretKeyPattern = /secret|password|accessToken|refreshToken|clientSecret|privateKey|authorizationHeader|apiKey|connectionString|jdbc|odbc|(^|[._-])dsn($|[._-])|dbDsn/i;
const forbiddenCommercialKeyPattern =
  /^(rawSku|sku|productName|supplierName|supplierContact|supplierEmail|supplierPhone|supplierAddress|bankAccount|taxId|purchaseOrderId|invoiceId|unitCost|purchasePrice)$/i;

const snapshotContracts = [
  {
    snapshotType: 'inventory_snapshot',
    requiredFields: [
      'requestId',
      'sourceId',
      'snapshotId',
      'skuHash',
      'warehouseCode',
      'region',
      'inventoryOnHand',
      'inventoryReserved',
      'inventoryTurnoverDays',
      'capturedAt',
      'erpSnapshotVersion',
    ],
  },
  {
    snapshotType: 'supplier_master_snapshot',
    requiredFields: [
      'requestId',
      'sourceId',
      'snapshotId',
      'supplierHash',
      'supplierTier',
      'countryOrRegion',
      'category',
      'qualificationStatus',
      'leadTimeDays',
      'capturedAt',
      'supplierMappingVersion',
    ],
  },
  {
    snapshotType: 'supply_cost_snapshot',
    requiredFields: [
      'requestId',
      'sourceId',
      'snapshotId',
      'category',
      'costBucket',
      'costIndex',
      'currency',
      'costModelVersion',
      'capturedAt',
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
  const payload = readJsonObject(readinessPath, 'ERP readiness file');
  if (!payload) return undefined;
  if (payload.readiness && typeof payload.readiness === 'object' && !Array.isArray(payload.readiness)) return payload.readiness;
  return payload;
}

function readSnapshotManifest(snapshotManifestPath) {
  const payload = readJsonObject(snapshotManifestPath, 'ERP snapshot manifest file');
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
    const ownMatches = forbiddenSecretKeyPattern.test(key) || forbiddenCommercialKeyPattern.test(key) ? [path] : [];
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
    skuCount: numberValue(readinessValue(readiness, snapshotManifest, 'skuCount')),
    supplierCount: numberValue(readinessValue(readiness, snapshotManifest, 'supplierCount')),
    warehouseCount: numberValue(readinessValue(readiness, snapshotManifest, 'warehouseCount')),
    inventoryRecordCount: numberValue(readinessValue(readiness, snapshotManifest, 'inventoryRecordCount')),
    warehouseSet: stringArray(readinessValue(readiness, snapshotManifest, 'warehouseSet')),
    erpSnapshotVersion: readinessValue(readiness, snapshotManifest, 'erpSnapshotVersion'),
    inventoryPolicyVersion: readinessValue(readiness, snapshotManifest, 'inventoryPolicyVersion'),
    supplierMappingVersion: readinessValue(readiness, snapshotManifest, 'supplierMappingVersion'),
    costModelVersion: readinessValue(readiness, snapshotManifest, 'costModelVersion'),
    currency: readinessValue(readiness, snapshotManifest, 'currency'),
    costDisclosureMode: readinessValue(readiness, snapshotManifest, 'costDisclosureMode'),
    allowedExportFields: stringArray(readinessValue(readiness, snapshotManifest, 'allowedExportFields')),
    commercialDataHandlingStatus: readinessValue(readiness, snapshotManifest, 'commercialDataHandlingStatus'),
    containsRawSupplierNames: readinessValue(readiness, snapshotManifest, 'containsRawSupplierNames'),
    containsPurchaseOrderLines: readinessValue(readiness, snapshotManifest, 'containsPurchaseOrderLines'),
    containsUnitCostValues: readinessValue(readiness, snapshotManifest, 'containsUnitCostValues'),
    reviewOwner: readiness?.reviewOwner,
    reviewApprovedAt: readiness?.reviewApprovedAt,
    complianceReviewer: readiness?.complianceReviewer,
    complianceReviewStatus: readiness?.complianceReviewStatus,
    allowedSnapshotTypes: stringArray(readiness?.allowedSnapshotTypes),
  };
}

function exportFieldsAreSafe(fields) {
  return fields.length > 0 && fields.every((field) => !forbiddenCommercialKeyPattern.test(field) && !forbiddenSecretKeyPattern.test(field));
}

function buildInternalErpReadinessGate(dryRun, options = {}, env = process.env) {
  const readinessPath = options.readinessPath ?? env.MKT53_ERP_READINESS_PATH;
  const snapshotManifestPath = options.snapshotManifestPath ?? env.MKT53_ERP_SNAPSHOT_MANIFEST_PATH;
  const readinessPathSource = options.readinessPath ? 'cli' : env.MKT53_ERP_READINESS_PATH ? 'env:MKT53_ERP_READINESS_PATH' : 'none';
  const snapshotManifestPathSource = options.snapshotManifestPath
    ? 'cli'
    : env.MKT53_ERP_SNAPSHOT_MANIFEST_PATH
      ? 'env:MKT53_ERP_SNAPSHOT_MANIFEST_PATH'
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
  const rawSupplierNamesAbsent = record.containsRawSupplierNames === false || record.containsRawSupplierNames === 'false';
  const purchaseOrderLinesAbsent = record.containsPurchaseOrderLines === false || record.containsPurchaseOrderLines === 'false';
  const unitCostValuesAbsent = record.containsUnitCostValues === false || record.containsUnitCostValues === 'false';
  const exportFieldsSafe = exportFieldsAreSafe(record.allowedExportFields);

  const checks = [
    buildCheck(
      'authorizationRecord',
      'ERP read-only export authorization is approved and owned',
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
      'Private ERP snapshot manifest covers every ERP source id',
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
      'ERP SKU, supplier, warehouse, and inventory coverage meet minimum thresholds',
      record.skuCount >= minimumSkuCount &&
        record.supplierCount >= minimumSupplierCount &&
        record.warehouseCount >= minimumWarehouseCount &&
        record.inventoryRecordCount >= minimumInventoryRecordCount &&
        record.warehouseSet.length >= minimumWarehouseCount,
      {
        minimumSkuCount,
        minimumSupplierCount,
        minimumWarehouseCount,
        minimumInventoryRecordCount,
        skuCount: Number.isNaN(record.skuCount) ? 0 : record.skuCount,
        supplierCount: Number.isNaN(record.supplierCount) ? 0 : record.supplierCount,
        warehouseCount: Number.isNaN(record.warehouseCount) ? 0 : record.warehouseCount,
        inventoryRecordCount: Number.isNaN(record.inventoryRecordCount) ? 0 : record.inventoryRecordCount,
        warehouseSet: record.warehouseSet,
      },
      { type: 'snapshot-volume-incomplete' },
    ),
    buildCheck(
      'snapshotDefinition',
      'ERP snapshot, inventory policy, supplier mapping, and cost model are versioned',
      Boolean(
        record.snapshotId &&
          record.erpSnapshotVersion &&
          record.inventoryPolicyVersion &&
          record.supplierMappingVersion &&
          record.costModelVersion &&
          record.currency === 'USD',
      ),
      {
        snapshotId: record.snapshotId ?? '',
        erpSnapshotVersion: record.erpSnapshotVersion ?? '',
        inventoryPolicyVersion: record.inventoryPolicyVersion ?? '',
        supplierMappingVersion: record.supplierMappingVersion ?? '',
        costModelVersion: record.costModelVersion ?? '',
        currency: record.currency ?? '',
      },
      { type: 'snapshot-definition-incomplete' },
    ),
    buildCheck(
      'commercialBoundary',
      'ERP export uses safe fields and aggregated cost disclosure',
      record.commercialDataHandlingStatus === 'approved' &&
        record.costDisclosureMode === 'aggregated-index' &&
        rawSupplierNamesAbsent &&
        purchaseOrderLinesAbsent &&
        unitCostValuesAbsent &&
        exportFieldsSafe &&
        forbiddenKeys.length === 0,
      {
        commercialDataHandlingStatus: record.commercialDataHandlingStatus ?? '',
        costDisclosureMode: record.costDisclosureMode ?? '',
        containsRawSupplierNames: record.containsRawSupplierNames ?? '',
        containsPurchaseOrderLines: record.containsPurchaseOrderLines ?? '',
        containsUnitCostValues: record.containsUnitCostValues ?? '',
        allowedExportFields: record.allowedExportFields,
        forbiddenKeys,
      },
      { type: 'commercial-boundary-incomplete', fields: forbiddenKeys },
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
      'Allowed snapshot types cover the ERP output contract',
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
      'Gate does not read ERP, call private systems, or write business snapshots',
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
    requestId: dryRun.requestId.replace('internal-erp-dry-run-', 'internal-erp-readiness-'),
    status: blockers.length === 0 ? 'ready-for-authorized-erp-supply-chain-pipeline-implementation' : 'blocked',
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
      minimumSkuCount,
      minimumSupplierCount,
      minimumWarehouseCount,
      minimumInventoryRecordCount,
    },
    checks,
    blockers,
    safety: dryRun.safety,
    stopCondition:
      'status=ready-for-authorized-erp-supply-chain-pipeline-implementation only when authorization, window, SKU/supplier/warehouse coverage, versioned policies, commercial boundary, owner review, compliance review and snapshot scope are all ready.',
  };
}

export function buildInternalErpDryRun(options = {}, env = process.env) {
  const appRoot = options.appRoot ?? process.cwd();
  const generatedAt = new Date().toISOString();
  const sourceRegistry = extractSourceRegistry(appRoot);
  const connectorBacklog = buildConnectorBacklog(sourceRegistry);
  const erpBacklog = connectorBacklog.groups.find((group) => group.connectorId === connectorId);
  const backlogItems = connectorBacklog.items.filter((item) => item.connectorId === connectorId);
  const sourceIds = erpBacklog?.sourceIds ?? [];
  const sourceCount = erpBacklog?.sourceCount ?? 0;
  const blockers = [
    ...(sourceCount === 0 ? [{ type: 'missing-internal-erp-backlog' }] : []),
    { type: 'missing-private-erp-readiness-record' },
    { type: 'missing-private-erp-snapshot-manifest' },
    { type: 'missing-inventory-policy-version' },
    { type: 'missing-commercial-data-approval' },
  ];

  return {
    schemaVersion: 1,
    connectorId,
    mode: 'dry-run',
    status: 'blocked',
    generatedAt,
    week: isoWeek(new Date(generatedAt)),
    requestId: `internal-erp-dry-run-${randomUUID()}`,
    safety: {
      networkCalls: 0,
      databaseReads: 0,
      businessDataWrites: 0,
      privateValuesRedacted: true,
      dryRunOnly: true,
      rule: '该脚本只校验ERP/供应链授权前置条件和输出契约，不读取ERP，不导出供应商明细或采购订单，不生成真实业务快照。',
    },
    collectionWindow: {
      start: options.windowStart,
      end: options.windowEnd,
      timezone: 'Asia/Shanghai',
    },
    sourceIds,
    sourceCount,
    backlogItems,
    requiredAccess: erpBacklog?.requiredAccess ?? ['ERP 只读导出或库存快照', '供应商主数据映射', '脱敏和权限审批记录'],
    outputContract: erpBacklog?.outputContract ?? snapshotContracts.map((contract) => contract.snapshotType),
    privateInput: {
      recommendedLocalPrivateReadinessPath,
      recommendedServerPrivateReadinessPath,
      recommendedLocalPrivateSnapshotManifestPath,
      recommendedServerPrivateSnapshotManifestPath,
      readinessTemplatePath,
      snapshotManifestTemplatePath,
      publicBundleAllowed: false,
      gitAllowed: false,
      rule: '真实ERP导出、供应商明细、采购订单、原始成本和内部owner只能留在私有路径；不得放入 public、src、tests/fixtures 或提交到 git。',
    },
    thresholds: {
      minimumSkuCount,
      minimumSupplierCount,
      minimumWarehouseCount,
      minimumInventoryRecordCount,
    },
    snapshotContracts,
    plannedSnapshots: snapshotContracts.map((contract) => ({
      snapshotType: contract.snapshotType,
      status: 'blocked',
      reason: 'ERP授权、库存快照、供应商映射、成本披露口径、owner复核或合规审批未满足，不能生成真实供应链快照。',
      requiredFields: contract.requiredFields,
    })),
    blockers,
    stopCondition: erpBacklog?.stopCondition ?? 'dry-run 输出 warehouseSet、skuCount、snapshotAt 和 owner。',
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

  const result = buildInternalErpDryRun(options);

  if (options.readinessGate) {
    const gate = buildInternalErpReadinessGate(result, options);
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
    'mkt53 internal-erp connector dry-run',
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
