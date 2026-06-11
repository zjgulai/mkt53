#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractSourceRegistry } from './lib/project-analysis.mjs';
import { buildConnectorBacklog } from './lib/connector-backlog.mjs';
import { buildSourceTaskQueue } from './lib/source-tasks.mjs';

function parseArgs(argv) {
  const writePaths = [];

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--write' && argv[i + 1]) {
      writePaths.push(argv[i + 1]);
    }
  }

  return {
    json: argv.includes('--json'),
    writePaths,
  };
}

function writeJson(path, data) {
  const target = resolve(process.cwd(), path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
}

export function buildCurrentSourceTaskQueue(appRoot = process.cwd(), generatedAt = new Date().toISOString()) {
  const sourceRegistry = extractSourceRegistry(appRoot);
  const connectorBacklog = buildConnectorBacklog(sourceRegistry);

  return buildSourceTaskQueue(sourceRegistry, { connectorBacklog, generatedAt });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const taskQueue = buildCurrentSourceTaskQueue(process.cwd());

  for (const writePath of options.writePaths) {
    writeJson(writePath, taskQueue);
  }

  if (options.json || options.writePaths.length === 0) {
    process.stdout.write(`${JSON.stringify(taskQueue, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    'mkt53 source task queue built',
    `total=${taskQueue.total}`,
    `connector-readiness=${taskQueue.queueTypeCounts['connector-readiness'] ?? 0}`,
    `manual-evidence=${taskQueue.queueTypeCounts['manual-evidence'] ?? 0}`,
    `public-source-review=${taskQueue.queueTypeCounts['public-source-review'] ?? 0}`,
    `write=${options.writePaths.join(',')}`,
    '',
  ].join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
