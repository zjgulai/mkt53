#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildChecklist } from './amazon-commerce-readiness-checklist.mjs';
import { assertSafePrivatePath } from '../lib/private-path-safety.mjs';

const connectorId = 'amazon-commerce';
const defaultTargetDir = process.env.MKT53_AMAZON_PRIVATE_DIR ?? 'configs/private';
const mappingTemplatePath = 'scripts/data/connectors/templates/amazon-commerce-mapping-template.json';
const readinessTemplatePath = 'scripts/data/connectors/templates/amazon-commerce-readiness-template.json';
const mappingFileName = 'amazon-commerce-mapping.json';
const readinessFileName = 'amazon-commerce-readiness.json';
const checklistFileName = 'amazon-commerce-readiness-checklist.md';
const reportsDirName = 'reports';

function parseArgs(argv) {
  const options = {
    targetDir: defaultTargetDir,
    force: argv.includes('--force'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--target-dir') options.targetDir = argv[i + 1];
  }

  return options;
}

function writePrivatePlaceholder(targetPath, content, force) {
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

  writeFileSync(targetPath, content.endsWith('\n') ? content : `${content}\n`, { mode: 0o600 });
  chmodSync(targetPath, 0o600);

  return {
    path: targetPath,
    status: existedBefore ? 'replaced' : 'created',
    overwritten: existedBefore,
    mode: '600',
  };
}

function bootstrapAmazonPrivateInputs(options) {
  const targetDir = assertSafePrivatePath(options.targetDir, 'private placeholders');
  const reportsDir = join(targetDir, reportsDirName);
  const mappingPath = join(targetDir, mappingFileName);
  const readinessPath = join(targetDir, readinessFileName);
  const checklistPath = join(targetDir, checklistFileName);
  const mappingTemplate = readFileSync(resolve(process.cwd(), mappingTemplatePath), 'utf8');
  const readinessTemplate = readFileSync(resolve(process.cwd(), readinessTemplatePath), 'utf8');
  const checklist = buildChecklist(JSON.parse(mappingTemplate), JSON.parse(readinessTemplate));

  mkdirSync(targetDir, { recursive: true, mode: 0o700 });
  mkdirSync(reportsDir, { recursive: true, mode: 0o700 });
  chmodSync(targetDir, 0o700);
  chmodSync(reportsDir, 0o700);

  const mapping = writePrivatePlaceholder(mappingPath, mappingTemplate, options.force);
  const readiness = writePrivatePlaceholder(readinessPath, readinessTemplate, options.force);
  const readinessChecklist = writePrivatePlaceholder(checklistPath, checklist, options.force);

  return {
    schemaVersion: 1,
    connectorId,
    generatedAt: new Date().toISOString(),
    targetDir,
    targetDirMode: '700',
    reportsDir,
    reportsDirMode: '700',
    files: {
      mapping,
      readiness,
      readinessChecklist,
    },
    safety: {
      containsCredentialValues: false,
      containsBusinessAsinSkuValues: false,
      publicBundleAllowed: false,
      gitAllowed: false,
      overwritesExistingFilesByDefault: false,
    },
    nextCommands: [
      `MKT53_AMAZON_PRIVATE_DIR=${targetDir} npm run data:connector:amazon:private:audit`,
      `MKT53_AMAZON_MAPPING_PATH=${mappingPath} npm run data:connector:amazon:mapping:validate`,
      `MKT53_AMAZON_MAPPING_PATH=${mappingPath} MKT53_AMAZON_READINESS_PATH=${readinessPath} npm run data:connector:amazon:readiness`,
      `MKT53_AMAZON_MAPPING_PATH=${mappingPath} MKT53_AMAZON_COVERAGE_REPORT_DIR=${reportsDir} npm run data:connector:amazon:mapping:archive`,
    ],
  };
}

async function main() {
  const manifest = bootstrapAmazonPrivateInputs(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
