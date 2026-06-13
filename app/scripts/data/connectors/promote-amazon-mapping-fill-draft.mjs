#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const connectorId = 'amazon-commerce';
const defaultTargetDir = process.env.MKT53_AMAZON_PRIVATE_DIR ?? 'configs/private';
const defaultInputFileName = 'amazon-commerce-mapping-fill-draft.json';
const defaultOutputFileName = 'amazon-commerce-mapping.json';
const defaultBackupDirName = 'backups';
const mappingTemplatePath = 'scripts/data/connectors/templates/amazon-commerce-mapping-template.json';
const blockedTargetSegments = new Set(['public', 'src', 'tests', 'fixtures', 'dist', 'node_modules']);

function parseArgs(argv) {
  const options = {
    privateDir: defaultTargetDir,
    inputPath: undefined,
    outputPath: undefined,
    backupDir: undefined,
    writeFinal: argv.includes('--write-final'),
    site: 'amazon.com',
    marketplaceId: 'ATVPDKIKX0DER',
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--private-dir') options.privateDir = argv[i + 1];
    if (argv[i] === '--input') options.inputPath = argv[i + 1];
    if (argv[i] === '--output') options.outputPath = argv[i + 1];
    if (argv[i] === '--backup-dir') options.backupDir = argv[i + 1];
    if (argv[i] === '--site') options.site = argv[i + 1];
    if (argv[i] === '--marketplace-id') options.marketplaceId = argv[i + 1];
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

function assertSafePrivatePath(path, label) {
  const target = resolve(process.cwd(), path);
  const blockedSegment = pathSegments(target).find((segment) => blockedTargetSegments.has(segment));
  if (blockedSegment) throw new Error(`Refusing to use Amazon ${label} inside ${blockedSegment}: ${target}`);
  if (!isPrivatePath(target)) throw new Error(`Refusing to use Amazon ${label} outside a private directory: ${target}`);
  return target;
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
}

function csvParse(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    if (char !== '\r') cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [header = [], ...records] = rows.filter((item) => item.some((value) => value.trim()));
  return records.map((record) => Object.fromEntries(header.map((field, index) => [field, record[index] ?? ''])));
}

function readDraftMappings(inputPath) {
  if (extname(inputPath).toLowerCase() === '.csv') return csvParse(readFileSync(inputPath, 'utf8'));

  const payload = readJson(inputPath);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.mappings)) return payload.mappings;
  throw new Error('Amazon mapping fill draft must be a CSV, an array, or an object with a mappings array.');
}

function normalizeMapping(mapping, requiredFields) {
  return Object.fromEntries(
    requiredFields.map((field) => {
      const value = String(mapping[field] ?? '').trim();
      return [field, field === 'asin' ? value.toUpperCase() : value];
    }),
  );
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validateMappings(mappings, template, options) {
  const sourceTemplates = new Map(template.mappings.map((item) => [item.sourceId, item]));
  const requiredFields = template.requiredFields;
  const allowedStatuses = new Set(template.allowedMappingStatuses);
  const validations = mappings.map((mapping) => {
    const sourceTemplate = sourceTemplates.get(mapping.sourceId);
    const missingFields = requiredFields.filter((field) => !mapping[field]);
    const asinValid = /^[A-Z0-9]{10}$/.test(mapping.asin);
    const sourceIdAllowed = Boolean(sourceTemplate);
    const siteMatches = mapping.site === options.site && (!sourceTemplate || mapping.site === sourceTemplate.site);
    const marketplaceMatches = mapping.marketplaceId === options.marketplaceId && (!sourceTemplate || mapping.marketplaceId === sourceTemplate.marketplaceId);
    const statusAllowed = allowedStatuses.has(mapping.mappingStatus);
    const mappingUpdatedAtValid = isIsoDate(mapping.mappingUpdatedAt);
    return {
      mapping,
      valid:
        missingFields.length === 0 &&
        asinValid &&
        sourceIdAllowed &&
        siteMatches &&
        marketplaceMatches &&
        statusAllowed &&
        mappingUpdatedAtValid,
      missingFields,
      asinValid,
      sourceIdAllowed,
      siteMatches,
      marketplaceMatches,
      statusAllowed,
      mappingUpdatedAtValid,
    };
  });
  const validMappings = validations.filter((item) => item.valid).map((item) => item.mapping);
  const invalidMappings = validations.filter((item) => !item.valid);
  const seenKeys = new Set();
  const duplicateMappings = [];
  const uniqueValidMappings = [];

  for (const mapping of validMappings) {
    const mappingKey = [mapping.sourceId, mapping.site, mapping.marketplaceId, mapping.asin].join('|');
    if (seenKeys.has(mappingKey)) {
      duplicateMappings.push({
        sourceId: mapping.sourceId,
        site: mapping.site,
        marketplaceId: mapping.marketplaceId,
      });
    } else {
      seenKeys.add(mappingKey);
      uniqueValidMappings.push(mapping);
    }
  }

  const countsBySource = uniqueValidMappings.reduce((acc, mapping) => {
    acc[mapping.sourceId] = (acc[mapping.sourceId] ?? 0) + 1;
    return acc;
  }, {});
  const rows = template.mappings.map((sourceTemplate) => {
    const mappedItems = countsBySource[sourceTemplate.sourceId] ?? 0;
    const missingItems = Math.max(sourceTemplate.minimumMappedItems - mappedItems, 0);
    return {
      sourceId: sourceTemplate.sourceId,
      site: sourceTemplate.site,
      marketplaceId: sourceTemplate.marketplaceId,
      minimumMappedItems: sourceTemplate.minimumMappedItems,
      mappedItems,
      missingItems,
      status: missingItems === 0 ? 'ready' : 'missing-mapping',
    };
  });
  const totalRequiredItems = rows.reduce((sum, row) => sum + row.minimumMappedItems, 0);
  const totalMappedItems = rows.reduce((sum, row) => sum + row.mappedItems, 0);
  const missingItemCount = rows.reduce((sum, row) => sum + row.missingItems, 0);
  const readySourceCount = rows.filter((row) => row.status === 'ready').length;
  const blockers = [
    ...(invalidMappings.length ? [{ type: 'invalid-mapping-rows', count: invalidMappings.length }] : []),
    ...(duplicateMappings.length ? [{ type: 'duplicate-mapping-rows', count: duplicateMappings.length }] : []),
    ...rows.filter((row) => row.status !== 'ready').map((row) => ({ type: 'missing-asin-sku-mapping', sourceId: row.sourceId, missingItems: row.missingItems })),
  ];

  return {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    blockers,
    counts: {
      mappingCount: mappings.length,
      validMappingCount: validMappings.length,
      uniqueValidMappingCount: uniqueValidMappings.length,
      invalidMappingCount: invalidMappings.length,
      duplicateMappingCount: duplicateMappings.length,
    },
    invalidRowCounts: {
      missingRequiredFields: invalidMappings.filter((item) => item.missingFields.length > 0).length,
      invalidAsin: invalidMappings.filter((item) => !item.asinValid).length,
      invalidSourceId: invalidMappings.filter((item) => !item.sourceIdAllowed).length,
      siteMismatch: invalidMappings.filter((item) => !item.siteMatches).length,
      marketplaceMismatch: invalidMappings.filter((item) => !item.marketplaceMatches).length,
      invalidStatus: invalidMappings.filter((item) => !item.statusAllowed).length,
      invalidMappingUpdatedAt: invalidMappings.filter((item) => !item.mappingUpdatedAtValid).length,
    },
    missingRequiredFieldCounts: Object.fromEntries(
      requiredFields
        .map((field) => [field, invalidMappings.filter((item) => item.missingFields.includes(field)).length])
        .filter(([, count]) => count > 0),
    ),
    coverage: {
      status: blockers.length === 0 ? 'ready' : 'blocked',
      totalRequiredItems,
      totalMappedItems,
      missingItemCount,
      readySourceCount,
      missingSourceCount: rows.length - readySourceCount,
      invalidMappingCount: invalidMappings.length,
      duplicateMappingCount: duplicateMappings.length,
      rows,
    },
  };
}

function timestampForFile(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function writeFinalMapping(outputPath, backupDir, payload, generatedAt) {
  const existedBefore = existsSync(outputPath);
  let backup;

  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  chmodSync(dirname(outputPath), 0o700);

  if (existedBefore) {
    mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    chmodSync(backupDir, 0o700);
    const backupPath = join(backupDir, `amazon-commerce-mapping-backup-${timestampForFile(generatedAt)}.json`);
    writeFileSync(backupPath, readFileSync(outputPath), { mode: 0o600 });
    chmodSync(backupPath, 0o600);
    backup = {
      path: backupPath,
      status: 'created',
      mode: '600',
      originalMode: (statSync(outputPath).mode & 0o777).toString(8),
    };
  }

  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  chmodSync(outputPath, 0o600);
  return {
    path: outputPath,
    status: existedBefore ? 'replaced' : 'created',
    overwritten: existedBefore,
    mode: '600',
    backup,
  };
}

export function promoteAmazonMappingFillDraft(options) {
  const privateDir = assertSafePrivatePath(options.privateDir, 'mapping promotion private directory');
  const inputPath = assertSafePrivatePath(options.inputPath ?? join(privateDir, defaultInputFileName), 'mapping fill draft input');
  const outputPath = assertSafePrivatePath(options.outputPath ?? join(privateDir, defaultOutputFileName), 'mapping final output');
  const backupDir = assertSafePrivatePath(options.backupDir ?? join(privateDir, defaultBackupDirName), 'mapping backup directory');
  const template = readJson(mappingTemplatePath);
  const mappings = readDraftMappings(inputPath).map((mapping) => normalizeMapping(mapping, template.requiredFields));
  const validation = validateMappings(mappings, template, options);
  const generatedAt = new Date();
  const promotedPayload = {
    schemaVersion: 1,
    connectorId,
    privateData: true,
    publicBundleAllowed: false,
    gitAllowed: false,
    promotedAt: generatedAt.toISOString(),
    sourcePath: inputPath,
    mappings,
  };
  const output =
    validation.status === 'ready' && options.writeFinal
      ? writeFinalMapping(outputPath, backupDir, promotedPayload, generatedAt)
      : {
          path: outputPath,
          status: validation.status === 'ready' ? 'ready-not-written' : 'blocked-not-written',
          overwritten: false,
          mode: existsSync(outputPath) ? (statSync(outputPath).mode & 0o777).toString(8) : '',
        };

  return {
    schemaVersion: 1,
    connectorId,
    mode: 'mapping-fill-draft-promotion',
    generatedAt: generatedAt.toISOString(),
    status: validation.status === 'ready' ? (options.writeFinal ? 'promoted' : 'ready-to-promote') : 'blocked',
    input: {
      path: inputPath,
      format: extname(inputPath).toLowerCase() === '.csv' ? 'csv' : 'json',
      rowCount: mappings.length,
    },
    output,
    validation,
    safety: {
      businessValuesRedacted: true,
      asinValuesRedacted: true,
      skuValuesRedacted: true,
      ownerValuesRedacted: true,
      networkCalls: 0,
      businessDataWrites: 0,
      privateInputWrites: validation.status === 'ready' && options.writeFinal ? 1 : 0,
      publicBundleAllowed: false,
      gitAllowed: false,
      requiresExplicitWriteFinal: true,
    },
    nextCommands:
      validation.status === 'ready'
        ? [
            options.writeFinal
              ? `MKT53_AMAZON_MAPPING_PATH=${outputPath} npm run data:connector:amazon:mapping:validate`
              : `npm run data:connector:amazon:mapping:promote -- --private-dir ${privateDir} --write-final`,
            `MKT53_AMAZON_MAPPING_PATH=${outputPath} npm run data:connector:amazon:mapping:archive -- --archive-dir ${join(privateDir, 'reports')}`,
            `npm run data:connector:amazon:private:audit -- --private-dir ${privateDir}`,
          ]
        : [
            'Fill asin, sku, brand, productName, category, mappingUpdatedAt and mappingOwner for every required row before promotion.',
            `MKT53_AMAZON_MAPPING_PATH=${inputPath} npm run data:connector:amazon:mapping:validate`,
          ],
  };
}

async function main() {
  const manifest = promoteAmazonMappingFillDraft(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
