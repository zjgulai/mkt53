#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const connectorId = 'amazon-commerce';
const defaultTargetDir = process.env.MKT53_AMAZON_PRIVATE_DIR ?? 'configs/private';
const mappingTemplatePath = 'scripts/data/connectors/templates/amazon-commerce-mapping-template.json';
const defaultJsonFileName = 'amazon-commerce-mapping-fill-draft.json';
const defaultCsvFileName = 'amazon-commerce-mapping-fill-draft.csv';
const blockedTargetSegments = new Set(['public', 'src', 'tests', 'fixtures', 'dist', 'node_modules']);

function parseArgs(argv) {
  const options = {
    targetDir: defaultTargetDir,
    jsonPath: undefined,
    csvPath: undefined,
    force: argv.includes('--force'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--target-dir') options.targetDir = argv[i + 1];
    if (argv[i] === '--json-path') options.jsonPath = argv[i + 1];
    if (argv[i] === '--csv-path') options.csvPath = argv[i + 1];
  }

  return options;
}

function pathSegments(path) {
  return resolve(process.cwd(), path)
    .split(/[\\/]+/)
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());
}

function isPrivatePath(path) {
  const target = resolve(process.cwd(), path);
  const segments = pathSegments(path);
  return (
    segments.includes('private') ||
    basename(target).toLowerCase().includes('private') ||
    basename(dirname(target)).toLowerCase().includes('private')
  );
}

function assertSafePrivateTarget(path, label) {
  const target = resolve(process.cwd(), path);
  const blockedSegment = pathSegments(target).find((segment) => blockedTargetSegments.has(segment));
  if (blockedSegment) throw new Error(`Refusing to write Amazon ${label} inside ${blockedSegment}: ${target}`);
  if (!isPrivatePath(target)) throw new Error(`Refusing to write Amazon ${label} outside a private directory: ${target}`);
  return target;
}

function readMappingTemplate() {
  return JSON.parse(readFileSync(resolve(process.cwd(), mappingTemplatePath), 'utf8'));
}

function expandDraftMappings(template) {
  return template.mappings.flatMap((sourceTemplate) =>
    Array.from({ length: sourceTemplate.minimumMappedItems }, (_, index) => ({
      sourceId: sourceTemplate.sourceId,
      site: sourceTemplate.site,
      marketplaceId: sourceTemplate.marketplaceId,
      rowNumberWithinSource: index + 1,
      minimumMappedItems: sourceTemplate.minimumMappedItems,
      asin: '',
      sku: '',
      brand: '',
      productName: '',
      category: '',
      mappingStatus: 'ready',
      mappingUpdatedAt: 'YYYY-MM-DD',
      mappingOwner: '',
    })),
  );
}

function csvEscape(value) {
  const stringValue = String(value ?? '');
  if (!/[",\n\r]/.test(stringValue)) return stringValue;
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function buildCsv(rows, fields) {
  return [fields.join(','), ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(','))].join('\n');
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

export function scaffoldAmazonMappingFillDraft(options) {
  const targetDir = assertSafePrivateTarget(options.targetDir, 'mapping fill target directory');
  const jsonPath = assertSafePrivateTarget(options.jsonPath ?? join(targetDir, defaultJsonFileName), 'mapping JSON fill draft');
  const csvPath = assertSafePrivateTarget(options.csvPath ?? join(targetDir, defaultCsvFileName), 'mapping CSV fill draft');
  const template = readMappingTemplate();
  const mappings = expandDraftMappings(template);
  const fields = [
    'sourceId',
    'site',
    'marketplaceId',
    'rowNumberWithinSource',
    'minimumMappedItems',
    'asin',
    'sku',
    'brand',
    'productName',
    'category',
    'mappingStatus',
    'mappingUpdatedAt',
    'mappingOwner',
  ];
  const sourceCoverage = template.mappings.map((sourceTemplate) => ({
    sourceId: sourceTemplate.sourceId,
    site: sourceTemplate.site,
    marketplaceId: sourceTemplate.marketplaceId,
    requiredRows: sourceTemplate.minimumMappedItems,
    draftRows: mappings.filter((mapping) => mapping.sourceId === sourceTemplate.sourceId).length,
  }));
  const jsonPayload = {
    schemaVersion: 1,
    connectorId,
    templateName: 'amazon-commerce-mapping-fill-draft',
    privateData: true,
    publicBundleAllowed: false,
    gitAllowed: false,
    generatedAt: new Date().toISOString(),
    targetFinalMappingPath: 'amazon-commerce-mapping.json',
    fillRule:
      'Fill asin, sku, brand, productName, category, mappingUpdatedAt and mappingOwner in a private path. Do not paste credentials, review text, customer data or platform exports into this draft.',
    fields,
    sourceCoverage,
    mappings,
  };
  const json = writePrivateFile(jsonPath, JSON.stringify(jsonPayload, null, 2), options.force);
  const csv = writePrivateFile(csvPath, buildCsv(mappings, fields), options.force);

  return {
    schemaVersion: 1,
    connectorId,
    generatedAt: jsonPayload.generatedAt,
    targetDir,
    targetDirMode: '700',
    rowCount: mappings.length,
    sourceCoverage,
    files: {
      json,
      csv,
    },
    safety: {
      containsCredentialValues: false,
      containsBusinessAsinSkuValues: false,
      publicBundleAllowed: false,
      gitAllowed: false,
      overwritesExistingFilesByDefault: false,
    },
    nextCommands: [
      `MKT53_AMAZON_MAPPING_PATH=${jsonPath} npm run data:connector:amazon:mapping:validate`,
      `MKT53_AMAZON_MAPPING_PATH=${jsonPath} npm run data:connector:amazon:mapping:coverage`,
      'After the filled draft validates as ready, copy it to amazon-commerce-mapping.json in the same private directory and rerun private audit.',
    ],
  };
}

async function main() {
  const manifest = scaffoldAmazonMappingFillDraft(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
