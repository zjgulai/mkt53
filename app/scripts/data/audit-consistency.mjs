#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { analyzeConsistency } from './lib/project-analysis.mjs';

const args = new Set(process.argv.slice(2));
const writeArgIndex = process.argv.indexOf('--write');
const writePath = writeArgIndex >= 0 ? process.argv[writeArgIndex + 1] : undefined;
const result = analyzeConsistency(process.cwd());

if (writePath) {
  const target = resolve(process.cwd(), writePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
}

if (args.has('--json')) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write([
    `mkt53 data consistency audit`,
    `generatedAt=${result.generatedAt}`,
    `pages=${result.summary.pageCount}`,
    `tables=${result.summary.tableCount}`,
    `sourceRegistry=${result.summary.sourceRegistryCount}`,
    `tableGovernance=${result.summary.tableGovernanceCount}`,
    `pagesWithStaticDataWithoutRegistry=${result.summary.pagesWithStaticDataWithoutRegistry}`,
    `collectionMethods=${JSON.stringify(result.summary.collectionMethods)}`,
    `issues=${result.summary.issueCount}`,
    ...result.issues.map((issue) => `${issue.severity}:${issue.code}:${issue.detail}`),
    '',
  ].join('\n'));
}

if (args.has('--strict') && result.summary.criticalIssueCount > 0) {
  process.exitCode = 1;
}
