#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { analyzeConsistency } from './lib/project-analysis.mjs';
import { collectSemiMonthlySources } from './collect-weekly-sources.mjs';
import { collectPublicEvidence } from './collect-public-evidence.mjs';
import { buildCustomsPublicDataAdapter } from './connectors/customs-public-data-adapter.mjs';
import { summarizeSourceTaskQueue } from './lib/source-tasks.mjs';

const candidateBasePath = 'tmp/data-collection/recovery-candidates';
const defaultCronAppDir = '/opt/mkt53/automation/app';

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    generatedAt: undefined,
    outputDir: undefined,
    cronAppDir: defaultCronAppDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--generated-at') options.generatedAt = argv[index + 1];
    if (argv[index] === '--output-dir') options.outputDir = argv[index + 1];
    if (argv[index] === '--cron-app-dir') options.cronAppDir = argv[index + 1];
  }

  return options;
}

function normalizeGeneratedAt(value) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid --generated-at value: ${value}`);
  return parsed.toISOString();
}

function isWithin(base, target) {
  return target === base || target.startsWith(`${base}${sep}`);
}

function resolveCandidateRoot(appRoot, outputDir, period) {
  const base = resolve(appRoot, candidateBasePath);
  const target = resolve(appRoot, outputDir ?? `${candidateBasePath}/${period}`);

  if (!isWithin(base, target) || target === base) {
    throw new Error(`Recovery candidate output must be a child of ${candidateBasePath}`);
  }

  return target;
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value.endsWith('\n') ? value : `${value}\n`);
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function topLevelContract(value) {
  if (Array.isArray(value)) return { rootType: 'array', itemType: value.length === 0 ? 'unknown' : typeof value[0] };
  if (value === null || typeof value !== 'object') return { rootType: value === null ? 'null' : typeof value };
  return {
    rootType: 'object',
    fields: Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, Array.isArray(value[key]) ? 'array' : value[key] === null ? 'null' : typeof value[key]]),
    ),
  };
}

function compareCandidateContract(candidatePath, canonicalPath) {
  if (!existsSync(canonicalPath)) return { compatible: false, reason: 'canonical-file-missing' };
  const candidateContract = topLevelContract(JSON.parse(readFileSync(candidatePath, 'utf8')));
  const canonicalContract = topLevelContract(JSON.parse(readFileSync(canonicalPath, 'utf8')));
  return {
    compatible: JSON.stringify(candidateContract) === JSON.stringify(canonicalContract),
    candidateContract,
    canonicalContract,
  };
}

function buildPublicManifest(manifest, publicEvidence, customsPublicAdapter) {
  return {
    ...manifest,
    sourceTaskQueue: summarizeSourceTaskQueue(manifest.sourceTaskQueue),
    publicEvidence: {
      mode: publicEvidence.mode,
      generatedAt: publicEvidence.generatedAt,
      total: publicEvidence.summary.total,
      captureStatusCounts: publicEvidence.summary.captureStatusCounts,
      evidenceClassCounts: publicEvidence.summary.evidenceClassCounts,
      networkCalls: publicEvidence.summary.networkCalls,
      businessDataWrites: publicEvidence.summary.businessDataWrites,
      manifestPath: 'public/periodic-data/public-evidence-samples.json',
    },
    customsPublicAdapter: {
      status: customsPublicAdapter.status,
      sourceId: customsPublicAdapter.sourceId,
      mode: customsPublicAdapter.mode,
      manifestPath: 'public/periodic-data/customs-public-adapter.json',
      allowedClaimScopes: customsPublicAdapter.allowedClaimScopes,
      forbiddenClaimScopes: customsPublicAdapter.forbiddenClaimScopes,
      networkCalls: customsPublicAdapter.boundaries.networkCalls,
      businessDataWrites: customsPublicAdapter.boundaries.businessDataWrites,
    },
  };
}

function cronPreview(appRoot, cronAppDir) {
  return execFileSync('bash', [resolve(appRoot, 'scripts/data/install-semi-monthly-cron.sh'), '--print'], {
    cwd: appRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      MKT53_APP_DIR: cronAppDir,
    },
  });
}

function buildChecks({ audit, manifest, publicEvidence, canonicalContractCompatibility, cron }) {
  return [
    {
      id: 'data-consistency',
      status: audit.summary.issueCount === 0 ? 'passed' : 'failed',
      facts: {
        pages: audit.summary.pageCount,
        tables: audit.summary.tableCount,
        sources: audit.summary.sourceRegistryCount,
        issues: audit.summary.issueCount,
      },
    },
    {
      id: 'semi-monthly-period',
      status: manifest.periodType === 'semi-monthly' && /^20\d{2}-\d{2}-H[12]$/.test(manifest.period) ? 'passed' : 'failed',
      facts: {
        period: manifest.period,
        windowStart: manifest.windowStart,
        windowEnd: manifest.windowEnd,
        nextScheduledAt: manifest.nextScheduledAt,
        scheduleCron: manifest.scheduleCron,
      },
    },
    {
      id: 'no-network-collection',
      status:
        (manifest.totals['source-error'] ?? 0) === 0 &&
        (manifest.totals['fetch-error'] ?? 0) === 0 &&
        publicEvidence.mode === 'dry-run' &&
        publicEvidence.summary.networkCalls === 0
          ? 'passed'
          : 'failed',
      facts: {
        sourceErrors: manifest.totals['source-error'] ?? 0,
        fetchErrors: manifest.totals['fetch-error'] ?? 0,
        publicEvidenceMode: publicEvidence.mode,
        publicEvidenceNetworkCalls: publicEvidence.summary.networkCalls,
      },
    },
    {
      id: 'business-write-boundary',
      status: publicEvidence.summary.businessDataWrites === 0 ? 'passed' : 'failed',
      facts: {
        publicEvidenceBusinessDataWrites: publicEvidence.summary.businessDataWrites,
        providerCalls: false,
        restrictedConnectorCalls: false,
        canonicalPublicWrites: false,
        productionWrites: false,
      },
    },
    {
      id: 'canonical-contract-compatibility',
      status: canonicalContractCompatibility.every((result) => result.compatible) ? 'passed' : 'failed',
      facts: { comparisons: canonicalContractCompatibility },
    },
    {
      id: 'cron-print-only',
      status:
        cron.includes('# mkt53 semi-monthly data refresh') &&
        cron.includes('0 9 1,16 * *') &&
        cron.includes('npm run data:publish:semi-monthly:local')
          ? 'passed'
          : 'failed',
      facts: {
        cronInstalled: false,
        schedule: '0 9 1,16 * *',
      },
    },
  ];
}

export async function buildSemiMonthlyRecoveryCandidate(options = {}) {
  const appRoot = resolve(options.appRoot ?? process.cwd());
  const generatedAt = normalizeGeneratedAt(options.generatedAt);
  const manifest = await collectSemiMonthlySources({
    appRoot,
    generatedAt,
    noNetwork: true,
  });
  const publicEvidence = await collectPublicEvidence({
    generatedAt,
    live: false,
  });
  const audit = analyzeConsistency(appRoot);
  const customsPublicAdapter = buildCustomsPublicDataAdapter({
    publicEvidence,
    publicEvidencePath: 'candidate-memory-public-evidence',
    generatedAt,
  });
  const publicManifest = buildPublicManifest(manifest, publicEvidence, customsPublicAdapter);
  const candidateRoot = resolveCandidateRoot(appRoot, options.outputDir, manifest.period);
  const cron = cronPreview(appRoot, options.cronAppDir ?? defaultCronAppDir);
  const candidateFiles = {
    'periodic-data/latest.json': publicManifest,
    'periodic-data/connectors.json': manifest.connectorBacklog,
    'periodic-data/source-tasks.json': manifest.sourceTaskQueue,
    'periodic-data/customs-public-adapter.json': customsPublicAdapter,
    'periodic-data/public-evidence-samples.json': publicEvidence,
    'weekly-data/latest.json': publicManifest,
    'weekly-data/connectors.json': manifest.connectorBacklog,
    'weekly-data/source-tasks.json': manifest.sourceTaskQueue,
    'weekly-data/customs-public-adapter.json': customsPublicAdapter,
    'weekly-data/public-evidence-samples.json': publicEvidence,
    'audit-consistency.json': audit,
  };

  for (const [path, data] of Object.entries(candidateFiles)) {
    writeJson(resolve(candidateRoot, path), data);
  }
  writeText(resolve(candidateRoot, 'cron-preview.txt'), cron);

  const canonicalContractCompatibility = Object.keys(candidateFiles)
    .filter((path) => path.startsWith('periodic-data/') || path.startsWith('weekly-data/'))
    .map((path) => ({
      path,
      ...compareCandidateContract(resolve(candidateRoot, path), resolve(appRoot, 'public', path)),
    }));
  const checks = buildChecks({ audit, manifest, publicEvidence, canonicalContractCompatibility, cron });
  const artifactPaths = [...Object.keys(candidateFiles), 'cron-preview.txt'];
  const report = {
    schemaVersion: 1,
    taskId: 'P0-04-recovery-candidate',
    generatedAt,
    evidenceGrade: 'L2-fixture-or-dry-run',
    status: checks.every((check) => check.status === 'passed') ? 'local-candidate-ready' : 'blocked-local-validation',
    period: {
      period: manifest.period,
      windowStart: manifest.windowStart,
      windowEnd: manifest.windowEnd,
      timezone: manifest.timezone,
      nextScheduledAt: manifest.nextScheduledAt,
    },
    candidateRoot: relative(appRoot, candidateRoot),
    boundaries: {
      noNetwork: true,
      publicEvidenceLiveCapture: false,
      providerCalls: false,
      restrictedConnectorCalls: false,
      businessDataWrites: false,
      canonicalPublicWrites: false,
      productionWrites: false,
      productionDeploy: false,
      cronInstalled: false,
      factPromotion: false,
      candidateArtifactWrites: true,
    },
    sourceStatusCounts: manifest.totals,
    publicEvidenceSummary: publicEvidence.summary,
    checks,
    artifacts: artifactPaths.map((path) => ({
      path,
      sha256: sha256File(resolve(candidateRoot, path)),
    })),
    releaseDecision: {
      status: 'blocked-auth',
      authorizedToPublish: false,
      authorizedToInstallCron: false,
      nextAction:
        'Obtain separate production-write authorization, back up current periodic/weekly files, validate the automation copy, publish the reviewed candidate, then install and observe the cron job.',
    },
  };

  writeJson(resolve(candidateRoot, 'recovery-preflight.json'), report);
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await buildSemiMonthlyRecoveryCandidate(options);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      'mkt53 P0-04 semi-monthly recovery candidate',
      `status=${report.status}`,
      `evidenceGrade=${report.evidenceGrade}`,
      `period=${report.period.period}`,
      `window=${report.period.windowStart}..${report.period.windowEnd}`,
      `candidateRoot=${report.candidateRoot}`,
      `checks=${report.checks.filter((check) => check.status === 'passed').length}/${report.checks.length}`,
      `networkCalls=${report.publicEvidenceSummary.networkCalls}`,
      `businessDataWrites=${report.publicEvidenceSummary.businessDataWrites}`,
      `productionWrites=${report.boundaries.productionWrites}`,
      `cronInstalled=${report.boundaries.cronInstalled}`,
      '',
    ].join('\n'),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
