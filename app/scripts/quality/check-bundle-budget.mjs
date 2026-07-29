#!/usr/bin/env node

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = join(SCRIPT_DIR, 'bundle-budgets.json');
const DEFAULT_DIST_PATH = resolve(process.cwd(), 'dist/assets');

function compileRule(rule) {
  if (!rule?.id || !rule?.pattern || !Number.isFinite(rule.targetBytes) || !Number.isFinite(rule.maxBytes)) {
    throw new Error(`Invalid bundle budget rule: ${JSON.stringify(rule)}`);
  }
  if (rule.targetBytes < 0 || rule.maxBytes < rule.targetBytes) {
    throw new Error(`Invalid byte boundaries for bundle budget rule ${rule.id}`);
  }

  return { ...rule, matcher: new RegExp(rule.pattern) };
}

function isExceptionActive(exception, now) {
  if (!exception?.expiresOn) return false;
  const expiry = new Date(`${exception.expiresOn}T23:59:59.999Z`);
  return Number.isFinite(expiry.getTime()) && now.getTime() <= expiry.getTime();
}

function evaluateAsset(asset, rule, now) {
  const base = {
    file: asset.file,
    sizeBytes: asset.sizeBytes,
    sizeKiB: Number((asset.sizeBytes / 1024).toFixed(2)),
    ruleId: rule.id,
    targetBytes: rule.targetBytes,
    maxBytes: rule.maxBytes,
  };

  if (asset.sizeBytes <= rule.targetBytes) {
    return { ...base, status: 'pass', reason: 'within-target' };
  }

  if (asset.sizeBytes > rule.maxBytes) {
    return { ...base, status: 'fail', reason: `exceeds maximum ${rule.maxBytes} bytes` };
  }

  if (!rule.exception) {
    return { ...base, status: 'fail', reason: `exceeds target ${rule.targetBytes} bytes without an approved exception` };
  }

  if (!isExceptionActive(rule.exception, now)) {
    return {
      ...base,
      status: 'fail',
      reason: `approved exception expired on ${rule.exception.expiresOn}`,
      exceptionExpiresOn: rule.exception.expiresOn,
    };
  }

  return {
    ...base,
    status: 'exception',
    reason: rule.exception.reason,
    exceptionOwner: rule.exception.owner,
    exceptionExpiresOn: rule.exception.expiresOn,
  };
}

export function evaluateBundleAssets(assets, config, options = {}) {
  if (config?.schemaVersion !== 1) {
    throw new Error(`Unsupported bundle budget schema version: ${config?.schemaVersion ?? 'missing'}`);
  }

  const now = options.now ?? new Date();
  const rules = (config.rules ?? []).map(compileRule);
  const defaultRule = compileRule(config.defaultRule);
  const normalizedAssets = [...assets]
    .filter((asset) => asset.file.endsWith('.js'))
    .sort((left, right) => left.file.localeCompare(right.file));

  const evaluatedAssets = normalizedAssets.map((asset) => {
    const matchedRule = rules.find((rule) => rule.matcher.test(asset.file)) ?? defaultRule;
    return evaluateAsset(asset, matchedRule, now);
  });

  const missingRequiredRules = rules
    .filter((rule) => rule.required && !normalizedAssets.some((asset) => rule.matcher.test(asset.file)))
    .map((rule) => rule.id);
  const pass = evaluatedAssets.filter((asset) => asset.status === 'pass').length;
  const exception = evaluatedAssets.filter((asset) => asset.status === 'exception').length;
  const assetFailures = evaluatedAssets.filter((asset) => asset.status === 'fail').length;
  const fail = assetFailures + missingRequiredRules.length;

  return {
    schemaVersion: 1,
    artifactType: 'bundle-budget-report',
    generatedAt: now.toISOString(),
    units: config.units ?? 'uncompressed-bytes',
    passed: fail === 0,
    summary: {
      totalAssets: evaluatedAssets.length,
      pass,
      exception,
      fail,
    },
    missingRequiredRules,
    assets: evaluatedAssets,
  };
}

export function readBundleAssets(distPath) {
  return readdirSync(distPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => ({ file: entry.name, sizeBytes: statSync(join(distPath, entry.name)).size }));
}

function parseArgs(argv) {
  const options = {
    configPath: DEFAULT_CONFIG_PATH,
    distPath: DEFAULT_DIST_PATH,
    json: false,
    writePath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') options.json = true;
    else if (argument === '--config') options.configPath = resolve(argv[++index]);
    else if (argument === '--dist') options.distPath = resolve(argv[++index]);
    else if (argument === '--write') options.writePath = resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function printHumanReport(report) {
  console.log(`Bundle budget: ${report.passed ? 'PASS' : 'FAIL'} (${report.summary.totalAssets} JS assets)`);
  for (const asset of report.assets.filter((item) => item.status !== 'pass')) {
    console.log(`- ${asset.status.toUpperCase()} ${asset.file}: ${asset.sizeKiB} KiB [${asset.ruleId}] ${asset.reason}`);
  }
  for (const ruleId of report.missingRequiredRules) {
    console.log(`- FAIL required rule has no matching asset: ${ruleId}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = JSON.parse(readFileSync(options.configPath, 'utf8'));
  const report = evaluateBundleAssets(readBundleAssets(options.distPath), config);

  if (options.writePath) {
    mkdirSync(dirname(options.writePath), { recursive: true });
    writeFileSync(options.writePath, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (options.json) console.log(JSON.stringify(report));
  else printHumanReport(report);

  if (!report.passed) process.exitCode = 1;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`Bundle budget gate failed: ${error.message}`);
    process.exitCode = 1;
  });
}
