#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { analyzeConsistency } from './lib/project-analysis.mjs';
import { collectWeeklySources } from './collect-weekly-sources.mjs';

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
const manifest = await collectWeeklySources({ noNetwork, timeoutMs, maxAttempts, retryDelayMs });

writeJson('tmp/data-collection/audit-latest.json', audit);
writeJson('public/weekly-data/latest.json', manifest);
writeJson('public/weekly-data/connectors.json', manifest.connectorBacklog);
writeJson(`tmp/data-collection/runs/${manifest.week}.json`, manifest);
writeJson(`tmp/data-collection/runs/${manifest.week}-connectors.json`, manifest.connectorBacklog);

process.stdout.write([
  `mkt53 weekly data refresh completed`,
  `week=${manifest.week}`,
  `latest=public/weekly-data/latest.json`,
  `connectors=public/weekly-data/connectors.json`,
  `audit=tmp/data-collection/audit-latest.json`,
  `run=tmp/data-collection/runs/${manifest.week}.json`,
  `total=${manifest.totals.total}`,
  `ok=${manifest.totals.ok ?? 0}`,
  `connector-required=${manifest.totals['connector-required'] ?? 0}`,
  `manual-required=${manifest.totals['manual-required'] ?? 0}`,
  `source-error=${manifest.totals['source-error'] ?? 0}`,
  `fetch-error=${manifest.totals['fetch-error'] ?? 0}`,
  '',
].join('\n'));
