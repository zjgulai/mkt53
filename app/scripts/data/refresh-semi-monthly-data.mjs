#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { analyzeConsistency } from './lib/project-analysis.mjs';
import { collectSemiMonthlySources } from './collect-weekly-sources.mjs';

const args = process.argv.slice(2);
const noNetwork = args.includes('--no-network');
const timeoutIndex = args.indexOf('--timeout-ms');
const timeoutMs = timeoutIndex >= 0 ? Number(args[timeoutIndex + 1]) : undefined;
const maxAttemptsIndex = args.indexOf('--max-attempts');
const maxAttempts = maxAttemptsIndex >= 0 ? Number(args[maxAttemptsIndex + 1]) : undefined;
const retryDelayIndex = args.indexOf('--retry-delay-ms');
const retryDelayMs = retryDelayIndex >= 0 ? Number(args[retryDelayIndex + 1]) : undefined;

function writeJson(path, data) {
  const target = resolve(process.cwd(), path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
}

const audit = analyzeConsistency(process.cwd());
const manifest = await collectSemiMonthlySources({ noNetwork, timeoutMs, maxAttempts, retryDelayMs });

writeJson('tmp/data-collection/audit-latest.json', audit);
writeJson('public/periodic-data/latest.json', manifest);
writeJson('public/periodic-data/connectors.json', manifest.connectorBacklog);
writeJson('public/weekly-data/latest.json', manifest);
writeJson('public/weekly-data/connectors.json', manifest.connectorBacklog);
writeJson(`tmp/data-collection/runs/${manifest.period}.json`, manifest);
writeJson(`tmp/data-collection/runs/${manifest.period}-connectors.json`, manifest.connectorBacklog);

process.stdout.write([
  `mkt53 semi-monthly data refresh completed`,
  `period=${manifest.period}`,
  `week=${manifest.week}`,
  `window=${manifest.windowStart}..${manifest.windowEnd}`,
  `nextScheduledAt=${manifest.nextScheduledAt}`,
  `latest=public/periodic-data/latest.json`,
  `compatLatest=public/weekly-data/latest.json`,
  `connectors=public/periodic-data/connectors.json`,
  `compatConnectors=public/weekly-data/connectors.json`,
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
