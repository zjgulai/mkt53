#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const connectorId = 'amazon-commerce';
const mappingTemplatePath = 'scripts/data/connectors/templates/amazon-commerce-mapping-template.json';
const readinessTemplatePath = 'scripts/data/connectors/templates/amazon-commerce-readiness-template.json';
const blockedWriteSegments = new Set(['public', 'src', 'tests', 'fixtures', 'dist', 'node_modules']);

function parseArgs(argv) {
  const options = {
    writePath: undefined,
    force: argv.includes('--force'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--write') options.writePath = argv[i + 1];
  }

  return options;
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
}

function targetSegments(path) {
  return path.split(/[\\/]+/).filter(Boolean).map((segment) => segment.toLowerCase());
}

function assertSafeWritePath(writePath) {
  const target = resolve(process.cwd(), writePath);
  const segments = targetSegments(target);
  const blockedSegment = segments.find((segment) => blockedWriteSegments.has(segment));
  if (blockedSegment) throw new Error(`Refusing to write Amazon readiness checklist inside ${blockedSegment}: ${target}`);
  if (!segments.includes('private') && !basename(dirname(target)).toLowerCase().includes('private')) {
    throw new Error(`Refusing to write Amazon readiness checklist outside a private directory: ${target}`);
  }
  return target;
}

function checklistRow(cells) {
  return `| ${cells.join(' | ')} |`;
}

function buildChecklist(mappingTemplate, readinessTemplate) {
  const mappingRows = mappingTemplate.mappings;
  const totalMinimumMappedItems = mappingRows.reduce((sum, item) => sum + item.minimumMappedItems, 0);
  const uniqueKey = mappingTemplate.uniqueKey.join(' + ');
  const mappingRequiredFields = mappingTemplate.requiredFields.join(', ');
  const readinessRequiredFields = readinessTemplate.requiredBeforeRealConnector.join(', ');
  const snapshotTypes = readinessTemplate.expectedSnapshotTypes.join(', ');

  return [
    '# Amazon Commerce Private Input Readiness Checklist',
    '',
    `generatedAt: ${new Date().toISOString()}`,
    `connectorId: ${connectorId}`,
    'status: manual-fill-required',
    'privateOnly: true',
    'publicBundleAllowed: false',
    'gitAllowed: false',
    '',
    '## Stop Condition',
    '',
    '- [ ] Private mapping file stays outside public, src, tests, dist and git.',
    '- [ ] Private readiness record stays outside public, src, tests, dist and git.',
    '- [ ] Every mapping row uses the unique key `sourceId + site + marketplaceId + asin`.',
    '- [ ] Every Amazon source id reaches its minimum ready mapping count.',
    '- [ ] Authorization record, collection window, business owner review and compliance review are complete.',
    '- [ ] Readiness gate returns `ready-for-authorized-connector-implementation` before real connector work starts.',
    '- [ ] No platform request or business snapshot is produced by dry-run, checklist or readiness commands.',
    '',
    '## Mapping Coverage Checklist',
    '',
    checklistRow(['Done', 'sourceId', 'site', 'marketplaceId', 'minimum ready rows']),
    checklistRow(['---', '---', '---', '---', '---:']),
    ...mappingRows.map((item) => checklistRow(['[ ]', item.sourceId, item.site, item.marketplaceId, String(item.minimumMappedItems)])),
    '',
    `totalMinimumMappedItems: ${totalMinimumMappedItems}`,
    `uniqueKey: ${uniqueKey}`,
    `requiredMappingFields: ${mappingRequiredFields}`,
    '',
    '## Mapping Row Field Checklist',
    '',
    ...mappingTemplate.requiredFields.map((field) => `- [ ] \`${field}\` is present and non-empty for every ready mapping row.`),
    '- [ ] `asin` is a 10-character uppercase alphanumeric value.',
    '- [ ] `mappingStatus` is `ready`; pending rows are not counted.',
    '- [ ] `mappingUpdatedAt` is `YYYY-MM-DD`.',
    '- [ ] Duplicate `sourceId + site + marketplaceId + asin` rows are removed before validation.',
    '',
    '## Readiness Record Checklist',
    '',
    ...readinessTemplate.requiredBeforeRealConnector.map((field) => `- [ ] \`${field}\` is filled in the private readiness record.`),
    '- [ ] `authorizationApprovedAt`, `collectionWindowStart`, `collectionWindowEnd` and `reviewApprovedAt` use `YYYY-MM-DD`.',
    '- [ ] `collectionWindowStart` and `collectionWindowEnd` match the readiness gate command window.',
    '- [ ] `complianceReviewStatus` is `approved`.',
    '- [ ] `allowedSnapshotTypes` includes every required snapshot type.',
    '',
    `requiredReadinessFields: ${readinessRequiredFields}`,
    `expectedSnapshotTypes: ${snapshotTypes}`,
    '',
    '## Safety Boundary',
    '',
    '- [ ] Do not paste credential values into mapping, readiness or checklist files.',
    '- [ ] Do not paste customer data, order data, review text or competitor-sensitive notes into this checklist.',
    '- [ ] Keep private directory mode at `700` and private files at `600`.',
    '- [ ] Keep `networkCalls=0` and `businessDataWrites=0` until the authorized connector is implemented.',
    '',
    '## Verification Commands',
    '',
    '```bash',
    'MKT53_AMAZON_MAPPING_PATH=/opt/mkt53/private/amazon-commerce-mapping.json npm run data:connector:amazon:mapping:validate',
    'MKT53_AMAZON_MAPPING_PATH=/opt/mkt53/private/amazon-commerce-mapping.json MKT53_AMAZON_READINESS_PATH=/opt/mkt53/private/amazon-commerce-readiness.json npm run data:connector:amazon:readiness',
    'MKT53_AMAZON_MAPPING_PATH=/opt/mkt53/private/amazon-commerce-mapping.json MKT53_AMAZON_COVERAGE_REPORT_DIR=/opt/mkt53/private/reports npm run data:connector:amazon:mapping:archive',
    '```',
    '',
  ].join('\n');
}

function writeChecklist(writePath, checklist, force) {
  const target = assertSafeWritePath(writePath);
  if (existsSync(target) && !force) {
    chmodSync(target, 0o600);
    return { path: target, status: 'exists', overwritten: false, mode: '600' };
  }

  const existedBefore = existsSync(target);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  writeFileSync(target, checklist, { mode: 0o600 });
  chmodSync(dirname(target), 0o700);
  chmodSync(target, 0o600);
  return { path: target, status: existedBefore ? 'replaced' : 'created', overwritten: existedBefore, mode: '600' };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const checklist = buildChecklist(readJson(mappingTemplatePath), readJson(readinessTemplatePath));
  if (!options.writePath) {
    process.stdout.write(checklist);
    return;
  }

  const result = writeChecklist(options.writePath, checklist, options.force);
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, connectorId, generatedAt: new Date().toISOString(), checklist: result }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
