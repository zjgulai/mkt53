#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildConnectorBacklog } from '../lib/connector-backlog.mjs';
import { extractSourceRegistry, isoWeek } from '../lib/project-analysis.mjs';

const connectorId = 'amazon-commerce';
const defaultWritePath = 'tmp/data-collection/connectors/amazon-commerce-dry-run.json';
const defaultCoverageReportPath = 'tmp/data-collection/connectors/amazon-commerce-mapping-coverage.md';
const defaultArchiveDir = 'tmp/data-collection/connectors/reports';
const defaultArchiveRetention = 12;
const templatePath = 'scripts/data/connectors/templates/amazon-commerce-mapping-template.json';
const recommendedLocalPrivateMappingPath = 'configs/private/amazon-commerce-mapping.json';
const recommendedServerPrivateMappingPath = '/opt/mkt53/private/amazon-commerce-mapping.json';
const recommendedServerCoverageReportDir = '/opt/mkt53/private/reports';

const requiredMappingFields = [
  'sourceId',
  'site',
  'marketplaceId',
  'asin',
  'sku',
  'brand',
  'productName',
  'category',
  'mappingStatus',
  'mappingUpdatedAt',
  'mappingOwner',
];

const allowedMappingStatuses = ['ready'];

const requiredCredentialKeys = [
  'AMAZON_SP_API_CLIENT_ID',
  'AMAZON_SP_API_CLIENT_SECRET',
  'AMAZON_SP_API_REFRESH_TOKEN',
  'AMAZON_MARKETPLACE_IDS',
];

const requiredMappingScopes = [
  { sourceId: 'ds-007', page: 'CompetitionPage', scope: 'competitor_catalog', minimumMappedItems: 15 },
  { sourceId: 'ds-009', page: 'ProductManage', scope: 'product_price_rating', minimumMappedItems: 25 },
  { sourceId: 'ds-010', page: 'RegionCompetition', scope: 'brand_analytics_region_share', minimumMappedItems: 1 },
  { sourceId: 'ds-019', page: 'SelfInsight', scope: 'momcozy_channel_product_snapshot', minimumMappedItems: 8 },
  { sourceId: 'ds-037', page: 'BabyCare', scope: 'baby_care_category_rank', minimumMappedItems: 5 },
  { sourceId: 'ds-038', page: 'CategoryAnalysis', scope: 'category_lifecycle_bsr', minimumMappedItems: 8 },
  { sourceId: 'ds-039', page: 'NursingProducts', scope: 'nursing_products_category_rank', minimumMappedItems: 5 },
];

const requiredSourceIds = new Set(requiredMappingScopes.map((scope) => scope.sourceId));

const snapshotContracts = [
  {
    snapshotType: 'product_snapshot',
    requiredFields: ['requestId', 'sourceId', 'site', 'marketplaceId', 'asin', 'sku', 'brand', 'productName', 'category', 'capturedAt'],
  },
  {
    snapshotType: 'review_snapshot',
    requiredFields: ['requestId', 'sourceId', 'site', 'asin', 'rating', 'reviewCount', 'capturedAt', 'sampleWindow'],
  },
  {
    snapshotType: 'brand_share_snapshot',
    requiredFields: ['requestId', 'sourceId', 'site', 'marketplaceId', 'brand', 'category', 'shareMetric', 'capturedAt'],
  },
  {
    snapshotType: 'category_rank_snapshot',
    requiredFields: ['requestId', 'sourceId', 'site', 'marketplaceId', 'asin', 'rankType', 'rankValue', 'capturedAt'],
  },
];

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    force: argv.includes('--force'),
    coverageReport: argv.includes('--coverage-report'),
    archiveCoverageReport: argv.includes('--archive-coverage-report'),
    printMappingTemplate: argv.includes('--print-mapping-template'),
    writePath: defaultWritePath,
    coverageReportPath: defaultCoverageReportPath,
    archiveDir: process.env.MKT53_AMAZON_COVERAGE_REPORT_DIR ?? defaultArchiveDir,
    archiveRetention: Number.parseInt(process.env.MKT53_AMAZON_COVERAGE_REPORT_RETENTION ?? `${defaultArchiveRetention}`, 10),
    writeMappingTemplatePath: undefined,
    mappingPath: undefined,
    site: 'amazon.com',
    marketplaceId: 'ATVPDKIKX0DER',
    windowStart: '2026-05-01',
    windowEnd: '2026-05-31',
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--write') options.writePath = argv[i + 1];
    if (argv[i] === '--write-coverage-report') options.coverageReportPath = argv[i + 1];
    if (argv[i] === '--archive-dir') options.archiveDir = argv[i + 1];
    if (argv[i] === '--retention') options.archiveRetention = Number.parseInt(argv[i + 1], 10);
    if (argv[i] === '--write-mapping-template') options.writeMappingTemplatePath = argv[i + 1];
    if (argv[i] === '--mapping') options.mappingPath = argv[i + 1];
    if (argv[i] === '--site') options.site = argv[i + 1];
    if (argv[i] === '--marketplace-id') options.marketplaceId = argv[i + 1];
    if (argv[i] === '--window-start') options.windowStart = argv[i + 1];
    if (argv[i] === '--window-end') options.windowEnd = argv[i + 1];
  }

  return options;
}

function safeRetention(retention) {
  return Number.isInteger(retention) && retention > 0 ? retention : defaultArchiveRetention;
}

function readMappingTemplate() {
  return readFileSync(resolve(process.cwd(), templatePath), 'utf8');
}

function writeMappingTemplate(targetPath, force) {
  const target = resolve(process.cwd(), targetPath);
  if (existsSync(target) && !force) {
    throw new Error(`Refusing to overwrite existing mapping template: ${targetPath}. Pass --force to replace it.`);
  }

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readMappingTemplate());
}

function readMappings(mappingPath) {
  if (!mappingPath) return [];

  const payload = JSON.parse(readFileSync(resolve(process.cwd(), mappingPath), 'utf8'));
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.mappings)) return payload.mappings;

  throw new Error('Amazon mapping file must be an array or an object with a mappings array.');
}

function validateMapping(mapping, context) {
  const missingFields = requiredMappingFields.filter((field) => !mapping[field]);
  const asinValid = typeof mapping.asin === 'string' && /^[A-Z0-9]{10}$/.test(mapping.asin);
  const sourceIdAllowed = typeof mapping.sourceId === 'string' && requiredSourceIds.has(mapping.sourceId);
  const siteMatches = mapping.site === context.site;
  const marketplaceMatches = mapping.marketplaceId === context.marketplaceId;
  const statusAllowed = allowedMappingStatuses.includes(mapping.mappingStatus);
  const mappingUpdatedAtValid = typeof mapping.mappingUpdatedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(mapping.mappingUpdatedAt);

  return {
    mapping,
    valid: missingFields.length === 0 && asinValid && sourceIdAllowed && siteMatches && marketplaceMatches && statusAllowed && mappingUpdatedAtValid,
    missingFields,
    asinValid,
    sourceIdAllowed,
    siteMatches,
    marketplaceMatches,
    statusAllowed,
    mappingUpdatedAtValid,
  };
}

function credentialPreflight(env) {
  return requiredCredentialKeys.map((key) => ({
    key,
    present: Boolean(env[key]),
  }));
}

function mappingPreflight(mappings, context) {
  const validations = mappings.map((mapping) => validateMapping(mapping, context));
  const validMappings = validations.filter((item) => item.valid).map((item) => item.mapping);
  const invalidMappings = validations.filter((item) => !item.valid);
  const seenKeys = new Set();
  const duplicateMappings = [];
  const uniqueValidMappings = [];

  for (const mapping of validMappings) {
    const mappingKey = [mapping.sourceId, mapping.site, mapping.marketplaceId, mapping.asin].join('|');
    if (seenKeys.has(mappingKey)) {
      duplicateMappings.push({ sourceId: mapping.sourceId, site: mapping.site, marketplaceId: mapping.marketplaceId, asin: mapping.asin });
    } else {
      seenKeys.add(mappingKey);
      uniqueValidMappings.push(mapping);
    }
  }

  const countsBySource = uniqueValidMappings.reduce((acc, mapping) => {
    acc[mapping.sourceId] = (acc[mapping.sourceId] ?? 0) + 1;
    return acc;
  }, {});

  const sourceCoverage = requiredMappingScopes.map((scope) => {
    const mappedItems = countsBySource[scope.sourceId] ?? 0;

    return {
      ...scope,
      mappedItems,
      status: mappedItems >= scope.minimumMappedItems ? 'ready' : 'missing-mapping',
    };
  });

  return {
    mappingCount: mappings.length,
    validMappingCount: validMappings.length,
    uniqueValidMappingCount: uniqueValidMappings.length,
    invalidMappingCount: invalidMappings.length,
    invalidMappings: invalidMappings.map((item) => ({
      sourceId: item.mapping.sourceId ?? '',
      sku: item.mapping.sku ?? '',
      asin: item.mapping.asin ?? '',
      missingFields: item.missingFields,
      asinValid: item.asinValid,
      sourceIdAllowed: item.sourceIdAllowed,
      siteMatches: item.siteMatches,
      marketplaceMatches: item.marketplaceMatches,
      statusAllowed: item.statusAllowed,
      mappingUpdatedAtValid: item.mappingUpdatedAtValid,
    })),
    duplicateMappingCount: duplicateMappings.length,
    duplicateMappings,
    sourceCoverage,
    missingSourceIds: sourceCoverage.filter((item) => item.status !== 'ready').map((item) => item.sourceId),
  };
}

function buildMappingCoverage(mapping) {
  const rows = mapping.sourceCoverage.map((item) => ({
    ...item,
    missingItems: Math.max(item.minimumMappedItems - item.mappedItems, 0),
  }));
  const totalRequiredItems = rows.reduce((sum, item) => sum + item.minimumMappedItems, 0);
  const totalMappedItems = rows.reduce((sum, item) => sum + item.mappedItems, 0);
  const missingItemCount = rows.reduce((sum, item) => sum + item.missingItems, 0);
  const readySourceCount = rows.filter((item) => item.status === 'ready').length;
  const missingSourceCount = rows.length - readySourceCount;
  const status = missingSourceCount === 0 && mapping.invalidMappingCount === 0 && mapping.duplicateMappingCount === 0 ? 'ready' : 'blocked';

  return {
    status,
    totalRequiredItems,
    totalMappedItems,
    missingItemCount,
    readySourceCount,
    missingSourceCount,
    invalidMappingCount: mapping.invalidMappingCount,
    duplicateMappingCount: mapping.duplicateMappingCount,
    rows,
  };
}

function markdownTable(rows) {
  return [
    '| sourceId | page | scope | required | mapped | missing | status |',
    '|---|---|---|---:|---:|---:|---|',
    ...rows.map((item) =>
      `| ${item.sourceId} | ${item.page} | ${item.scope} | ${item.minimumMappedItems} | ${item.mappedItems} | ${item.missingItems} | ${item.status} |`,
    ),
  ].join('\n');
}

function buildMappingCoverageReport(dryRun) {
  const coverage = dryRun.mappingCoverage;

  return [
    '# Amazon Commerce Mapping Coverage Report',
    '',
    `generatedAt: ${dryRun.generatedAt}`,
    `requestId: ${dryRun.requestId}`,
    `connectorStatus: ${dryRun.status}`,
    `mappingCoverageStatus: ${coverage.status}`,
    `mappingPathSource: ${dryRun.privateInput.mappingPathSource}`,
    `mappingPathConfigured: ${dryRun.privateInput.mappingPathConfigured}`,
    `site: ${dryRun.site}`,
    `marketplaceId: ${dryRun.marketplaceId}`,
    `networkCalls: ${dryRun.safety.networkCalls}`,
    `businessDataWrites: ${dryRun.safety.businessDataWrites}`,
    '',
    '## Summary',
    '',
    `totalRequiredItems: ${coverage.totalRequiredItems}`,
    `totalMappedItems: ${coverage.totalMappedItems}`,
    `missingItemCount: ${coverage.missingItemCount}`,
    `readySourceCount: ${coverage.readySourceCount}`,
    `missingSourceCount: ${coverage.missingSourceCount}`,
    `invalidMappingCount: ${coverage.invalidMappingCount}`,
    `duplicateMappingCount: ${coverage.duplicateMappingCount}`,
    '',
    '## Source Coverage',
    '',
    markdownTable(coverage.rows),
    '',
    '## Stop Condition',
    '',
    'Mapping coverage reaches `ready` only when every Amazon source meets its minimum mapped item count and there are no invalid or duplicate mapping rows. Connector execution still requires authorized credentials and a real connector implementation.',
    '',
  ].join('\n');
}

function archiveMappingCoverageReport(dryRun, report, archiveDir, retention) {
  const targetDir = resolve(process.cwd(), archiveDir);
  const normalizedRetention = safeRetention(retention);
  const timestamp = dryRun.generatedAt.replace(/[:.]/g, '-');
  const reportFileName = `amazon-commerce-mapping-coverage-${timestamp}-${dryRun.requestId.replace('amazon-commerce-dry-run-', '')}.md`;
  const latestFileName = 'amazon-commerce-mapping-coverage-latest.md';
  const manifestFileName = 'amazon-commerce-mapping-coverage-manifest.json';

  mkdirSync(targetDir, { recursive: true, mode: 0o700 });
  chmodSync(targetDir, 0o700);

  const reportPath = join(targetDir, reportFileName);
  const latestPath = join(targetDir, latestFileName);
  const manifestPath = join(targetDir, manifestFileName);

  writeFileSync(reportPath, report, { mode: 0o600 });
  chmodSync(reportPath, 0o600);
  writeFileSync(latestPath, report, { mode: 0o600 });
  chmodSync(latestPath, 0o600);

  const archivedReportsBeforeRetention = readdirSync(targetDir)
    .filter((fileName) => /^amazon-commerce-mapping-coverage-.*\.md$/.test(fileName) && fileName !== latestFileName)
    .sort();
  const reportsToDelete = archivedReportsBeforeRetention.slice(0, Math.max(archivedReportsBeforeRetention.length - normalizedRetention, 0));

  for (const fileName of reportsToDelete) {
    unlinkSync(join(targetDir, fileName));
  }

  const retainedReports = readdirSync(targetDir)
    .filter((fileName) => /^amazon-commerce-mapping-coverage-.*\.md$/.test(fileName) && fileName !== latestFileName)
    .sort();
  const manifest = {
    schemaVersion: 1,
    connectorId,
    generatedAt: dryRun.generatedAt,
    requestId: dryRun.requestId,
    archiveDir: targetDir,
    latestReport: latestFileName,
    currentReport: reportFileName,
    retentionLimit: normalizedRetention,
    reportCount: retainedReports.length,
    retainedReports,
    deletedReports: reportsToDelete,
    safety: {
      networkCalls: dryRun.safety.networkCalls,
      businessDataWrites: dryRun.safety.businessDataWrites,
      publicBundleAllowed: false,
      gitAllowed: false,
    },
    mappingCoverage: {
      status: dryRun.mappingCoverage.status,
      totalRequiredItems: dryRun.mappingCoverage.totalRequiredItems,
      totalMappedItems: dryRun.mappingCoverage.totalMappedItems,
      missingItemCount: dryRun.mappingCoverage.missingItemCount,
      readySourceCount: dryRun.mappingCoverage.readySourceCount,
      missingSourceCount: dryRun.mappingCoverage.missingSourceCount,
      invalidMappingCount: dryRun.mappingCoverage.invalidMappingCount,
      duplicateMappingCount: dryRun.mappingCoverage.duplicateMappingCount,
    },
  };

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  chmodSync(manifestPath, 0o600);

  return {
    ...manifest,
    archiveDir: targetDir,
    latestReportPath: join(targetDir, latestFileName),
    currentReportPath: join(targetDir, reportFileName),
    manifestPath: join(targetDir, manifestFileName),
    currentReportBasename: basename(reportPath),
  };
}

export function buildAmazonCommerceDryRun(options = {}, env = process.env) {
  const appRoot = options.appRoot ?? process.cwd();
  const mappingPath = options.mappingPath ?? env.MKT53_AMAZON_MAPPING_PATH;
  const mappingPathSource = options.mappingPath ? 'cli' : env.MKT53_AMAZON_MAPPING_PATH ? 'env:MKT53_AMAZON_MAPPING_PATH' : 'none';
  const generatedAt = new Date().toISOString();
  const sourceRegistry = extractSourceRegistry(appRoot);
  const connectorBacklog = buildConnectorBacklog(sourceRegistry);
  const amazonBacklog = connectorBacklog.groups.find((group) => group.connectorId === connectorId);
  const amazonItems = connectorBacklog.items.filter((item) => item.connectorId === connectorId);
  const mappings = readMappings(mappingPath);
  const credentials = credentialPreflight(env);
  const mapping = mappingPreflight(mappings, { site: options.site, marketplaceId: options.marketplaceId });
  const mappingCoverage = buildMappingCoverage(mapping);
  const missingCredentialKeys = credentials.filter((item) => !item.present).map((item) => item.key);
  const blockers = [
    ...missingCredentialKeys.map((key) => ({ type: 'missing-credential', key })),
    ...(mapping.invalidMappingCount > 0 ? [{ type: 'invalid-asin-sku-mapping', count: mapping.invalidMappingCount }] : []),
    ...(mapping.duplicateMappingCount > 0 ? [{ type: 'duplicate-asin-sku-mapping', count: mapping.duplicateMappingCount }] : []),
    ...mapping.missingSourceIds.map((sourceId) => ({ type: 'missing-asin-sku-mapping', sourceId })),
  ];

  return {
    schemaVersion: 1,
    connectorId,
    mode: 'dry-run',
    status: blockers.length === 0 ? 'ready-for-authorized-implementation' : 'blocked',
    generatedAt,
    week: isoWeek(new Date(generatedAt)),
    requestId: `amazon-commerce-dry-run-${randomUUID()}`,
    safety: {
      networkCalls: 0,
      businessDataWrites: 0,
      credentialValuesRedacted: true,
      dryRunOnly: true,
      rule: '该脚本只校验授权前置条件和输出契约，不调用 Amazon，不生成真实业务快照。',
    },
    collectionWindow: {
      start: options.windowStart,
      end: options.windowEnd,
      timezone: 'UTC',
    },
    site: options.site,
    marketplaceId: options.marketplaceId,
    sourceIds: amazonBacklog?.sourceIds ?? [],
    sourceCount: amazonBacklog?.sourceCount ?? 0,
    backlogItems: amazonItems,
    requiredCredentialKeys,
    credentials,
    privateInput: {
      mappingPathSource,
      mappingPathConfigured: Boolean(mappingPath),
      mappingPath: mappingPath ?? '',
      recommendedLocalPrivateMappingPath,
      recommendedServerPrivateMappingPath,
      recommendedServerCoverageReportDir,
      templatePath,
      publicBundleAllowed: false,
      gitAllowed: false,
      rule: '真实 ASIN/SKU 映射只能放在私有路径或通过环境变量传入；不得放入 public、src、tests/fixtures 或提交到 git。',
    },
    mappingContract: {
      schemaVersion: 1,
      acceptedPayloadShapes: ['Array<AmazonCommerceMapping>', '{ mappings: Array<AmazonCommerceMapping> }'],
      requiredFields: requiredMappingFields,
      allowedMappingStatuses,
      allowedSourceIds: requiredMappingScopes,
      uniqueKey: ['sourceId', 'site', 'marketplaceId', 'asin'],
      rowCountsOnlyWhen: '字段完整、ASIN 格式有效、sourceId 属于 Amazon backlog、site/marketplaceId 与本次 dry-run 一致、mappingStatus=ready。',
    },
    mapping,
    mappingCoverage,
    snapshotContracts,
    plannedSnapshots: snapshotContracts.map((contract) => ({
      snapshotType: contract.snapshotType,
      status: blockers.length ? 'blocked' : 'ready-for-authorized-implementation',
      reason: blockers.length ? '授权凭据或 ASIN/SKU 映射未满足，不能生成真实快照。' : 'dry-run 完成；仍需实现授权连接器后才能生成真实快照。',
      requiredFields: contract.requiredFields,
    })),
    blockers,
    stopCondition: amazonBacklog?.stopCondition ?? 'dry-run 输出 requestId、window、sourceIds 和 blockedReason。',
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.printMappingTemplate || options.writeMappingTemplatePath) {
    if (options.writeMappingTemplatePath) writeMappingTemplate(options.writeMappingTemplatePath, options.force);
    if (options.printMappingTemplate || !options.writeMappingTemplatePath) process.stdout.write(readMappingTemplate());
    return;
  }

  const result = buildAmazonCommerceDryRun(options);

  if (options.coverageReport) {
    const report = buildMappingCoverageReport(result);
    if (!options.noWrite) {
      const target = resolve(process.cwd(), options.coverageReportPath);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, report);
    }
    process.stdout.write(report);
    return;
  }

  if (options.archiveCoverageReport) {
    const report = buildMappingCoverageReport(result);
    const archive = archiveMappingCoverageReport(result, report, options.archiveDir, options.archiveRetention);
    process.stdout.write(`${JSON.stringify(archive, null, 2)}\n`);
    return;
  }

  if (!options.noWrite) {
    const target = resolve(process.cwd(), options.writePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    'mkt53 amazon-commerce connector dry-run',
    `status=${result.status}`,
    `requestId=${result.requestId}`,
    `sourceCount=${result.sourceCount}`,
    `missingCredentials=${result.blockers.filter((item) => item.type === 'missing-credential').length}`,
    `missingMappings=${result.blockers.filter((item) => item.type === 'missing-asin-sku-mapping').length}`,
    `networkCalls=${result.safety.networkCalls}`,
    options.noWrite ? 'write=disabled' : `write=${options.writePath}`,
    '',
  ].join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
