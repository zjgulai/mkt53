#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { analyzeConsistency } from './lib/project-analysis.mjs';
import { collectSemiMonthlySources } from './collect-weekly-sources.mjs';
import { collectPublicEvidence } from './collect-public-evidence.mjs';
import { summarizeSourceTaskQueue } from './lib/source-tasks.mjs';

const args = process.argv.slice(2);
const noNetwork = args.includes('--no-network');
const skipPublicEvidence = args.includes('--skip-public-evidence') || process.env.MKT53_PUBLIC_EVIDENCE_MODE === 'skip';
const publicEvidenceLive =
  args.includes('--public-evidence-live') ||
  process.env.MKT53_PUBLIC_EVIDENCE_MODE === 'live' ||
  process.env.MKT53_PUBLIC_EVIDENCE_LIVE === '1';
const timeoutIndex = args.indexOf('--timeout-ms');
const timeoutMs = timeoutIndex >= 0 ? Number(args[timeoutIndex + 1]) : undefined;
const maxAttemptsIndex = args.indexOf('--max-attempts');
const maxAttempts = maxAttemptsIndex >= 0 ? Number(args[maxAttemptsIndex + 1]) : undefined;
const retryDelayIndex = args.indexOf('--retry-delay-ms');
const retryDelayMs = retryDelayIndex >= 0 ? Number(args[retryDelayIndex + 1]) : undefined;
const publicEvidenceTimeoutIndex = args.indexOf('--public-evidence-timeout-ms');
const publicEvidenceTimeoutMs = publicEvidenceTimeoutIndex >= 0 ? Number(args[publicEvidenceTimeoutIndex + 1]) : timeoutMs;
const publicEvidenceMaxSourcesIndex = args.indexOf('--public-evidence-max-sources');
const publicEvidenceMaxSources = publicEvidenceMaxSourcesIndex >= 0 ? Number.parseInt(args[publicEvidenceMaxSourcesIndex + 1], 10) : undefined;

function writeJson(path, data) {
  const target = resolve(process.cwd(), path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
}

const audit = analyzeConsistency(process.cwd());
const manifest = await collectSemiMonthlySources({ noNetwork, timeoutMs, maxAttempts, retryDelayMs });
const publicEvidence = skipPublicEvidence
  ? undefined
  : await collectPublicEvidence({
      live: publicEvidenceLive && !noNetwork,
      timeoutMs: publicEvidenceTimeoutMs,
      maxSources: publicEvidenceMaxSources,
    });
const publicManifest = {
  ...manifest,
  sourceTaskQueue: summarizeSourceTaskQueue(manifest.sourceTaskQueue),
  publicEvidence: publicEvidence
    ? {
        mode: publicEvidence.mode,
        generatedAt: publicEvidence.generatedAt,
        total: publicEvidence.summary.total,
        captureStatusCounts: publicEvidence.summary.captureStatusCounts,
        evidenceClassCounts: publicEvidence.summary.evidenceClassCounts,
        networkCalls: publicEvidence.summary.networkCalls,
        businessDataWrites: publicEvidence.summary.businessDataWrites,
        manifestPath: 'public/periodic-data/public-evidence-samples.json',
      }
    : {
        mode: 'skipped',
        generatedAt: manifest.generatedAt,
        total: 0,
        captureStatusCounts: {},
        evidenceClassCounts: {},
        networkCalls: 0,
        businessDataWrites: 0,
        manifestPath: '',
      },
};

writeJson('tmp/data-collection/audit-latest.json', audit);
writeJson('public/periodic-data/latest.json', publicManifest);
writeJson('public/periodic-data/connectors.json', manifest.connectorBacklog);
writeJson('public/periodic-data/source-tasks.json', manifest.sourceTaskQueue);
writeJson('public/weekly-data/latest.json', publicManifest);
writeJson('public/weekly-data/connectors.json', manifest.connectorBacklog);
writeJson('public/weekly-data/source-tasks.json', manifest.sourceTaskQueue);
writeJson(`tmp/data-collection/runs/${manifest.period}.json`, manifest);
writeJson(`tmp/data-collection/runs/${manifest.period}-connectors.json`, manifest.connectorBacklog);
writeJson(`tmp/data-collection/runs/${manifest.period}-source-tasks.json`, manifest.sourceTaskQueue);

if (publicEvidence) {
  writeJson('public/periodic-data/public-evidence-samples.json', publicEvidence);
  writeJson('public/weekly-data/public-evidence-samples.json', publicEvidence);
  writeJson(`tmp/data-collection/runs/${manifest.period}-public-evidence-samples.json`, publicEvidence);
}

process.stdout.write([
  `mkt53 semi-monthly data refresh completed`,
  `period=${manifest.period}`,
  `week=${manifest.week}`,
  `window=${manifest.windowStart}..${manifest.windowEnd}`,
  `nextScheduledAt=${manifest.nextScheduledAt}`,
  `latest=public/periodic-data/latest.json`,
  `compatLatest=public/weekly-data/latest.json`,
  `connectors=public/periodic-data/connectors.json`,
  `sourceTasks=public/periodic-data/source-tasks.json`,
  `compatConnectors=public/weekly-data/connectors.json`,
  `compatSourceTasks=public/weekly-data/source-tasks.json`,
  `publicEvidence=${publicEvidence ? 'public/periodic-data/public-evidence-samples.json' : 'skipped'}`,
  `publicEvidenceMode=${publicEvidence ? publicEvidence.mode : 'skipped'}`,
  `publicEvidenceCaptured=${publicEvidence?.summary.captureStatusCounts.captured ?? 0}/${publicEvidence?.summary.total ?? 0}`,
  `publicEvidenceBusinessDataWrites=${publicEvidence?.summary.businessDataWrites ?? 0}`,
  `audit=tmp/data-collection/audit-latest.json`,
  `run=tmp/data-collection/runs/${manifest.period}.json`,
  `total=${manifest.totals.total}`,
  `ok=${manifest.totals.ok ?? 0}`,
  `connector-required=${manifest.totals['connector-required'] ?? 0}`,
  `manual-required=${manifest.totals['manual-required'] ?? 0}`,
  `source-error=${manifest.totals['source-error'] ?? 0}`,
  `fetch-error=${manifest.totals['fetch-error'] ?? 0}`,
  '',
].join('\n'));
