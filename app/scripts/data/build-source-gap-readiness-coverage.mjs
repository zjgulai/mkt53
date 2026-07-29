#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const PRIORITY_REQUIRED_COLUMNS = [
  'priority',
  'owner_lane',
  'source_id',
  'module',
  'page',
  'metric',
  'collection_method',
  'evidence_grade',
  'verification_status',
  'allowed_current_display_state',
  'can_display_as_fact_current',
  'next_action',
  'blocking_reason',
];

const PACKET_REQUIRED_COLUMNS = ['packet_id', 'priority', 'owner_lane', 'source_ids'];

const COVERAGE_FIELDS = [
  'source_id',
  'priority',
  'module',
  'page',
  'metric',
  'collection_method',
  'evidence_grade',
  'verification_status',
  'owner_lane',
  'covered_by_packet',
  'packet_id',
  'packet_dir',
  'allowed_current_display_state',
  'can_display_as_fact_current',
  'next_action',
  'blocking_reason',
];

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    sourcePath: undefined,
    packetDir: undefined,
    outDir: undefined,
    priorities: ['P0'],
    collectionMethods: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--source') options.sourcePath = argv[index + 1];
    if (argv[index] === '--packet-dir') options.packetDir = argv[index + 1];
    if (argv[index] === '--out') options.outDir = argv[index + 1];
    if (argv[index] === '--priority') {
      options.priorities = String(argv[index + 1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
    if (argv[index] === '--collection-method' || argv[index] === '--collection-methods') {
      options.collectionMethods = String(argv[index + 1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  return options;
}

function dateSlug(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replaceAll('-', '');
}

function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const text = Array.isArray(value) ? value.join('|') : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(path, rows, fields) {
  const csv = [fields.join(','), ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(','))].join('\n');
  writeFileSync(path, `${csv}\n`);
}

function parseCsv(text, requiredColumns = []) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
  }
  if (row.length) {
    rows.push(row);
  }

  const [header, ...dataRows] = rows.filter((candidate) => candidate.some((value) => value !== ''));
  if (!header) return [];

  const missingColumns = requiredColumns.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`CSV is missing required columns: ${missingColumns.join(', ')}`);
  }

  return dataRows.map((dataRow) => Object.fromEntries(header.map((column, index) => [column, dataRow[index] ?? ''])));
}

function countBy(rows, getter) {
  return rows.reduce((acc, row) => {
    const key = getter(row) || 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function findLatestPriorityMatrix(appRoot) {
  const auditRoot = join(appRoot, 'tmp/audits');
  if (!existsSync(auditRoot)) return undefined;

  const candidates = readdirSync(auditRoot)
    .filter((name) => name.startsWith('source-gap-prioritization-'))
    .map((name) => join(auditRoot, name, 'source_gap_priority_matrix.csv'))
    .filter((path) => existsSync(path))
    .map((path) => ({ path, mtimeMs: statSync(path).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.path;
}

function findLatestPacketDir(appRoot) {
  const auditRoot = join(appRoot, 'tmp/audits');
  if (!existsSync(auditRoot)) return undefined;

  const candidates = readdirSync(auditRoot)
    .map((name) => join(auditRoot, name))
    .filter((path) => existsSync(join(path, 'readiness_packets.csv')))
    .map((path) => ({ path, mtimeMs: statSync(join(path, 'readiness_packets.csv')).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.path;
}

function buildPacketLookup(packetRows) {
  const lookup = new Map();

  for (const packet of packetRows) {
    for (const sourceId of packet.source_ids.split('|').filter(Boolean)) {
      lookup.set(sourceId, packet);
    }
  }

  return lookup;
}

function buildCoverageRows(priorityRows, packetRows, packetDir) {
  const packetLookup = buildPacketLookup(packetRows);

  return priorityRows.map((row) => {
    const packet = packetLookup.get(row.source_id);

    return {
      source_id: row.source_id,
      priority: row.priority,
      module: row.module,
      page: row.page,
      metric: row.metric,
      collection_method: row.collection_method,
      evidence_grade: row.evidence_grade,
      verification_status: row.verification_status,
      owner_lane: row.owner_lane,
      covered_by_packet: packet ? 'yes' : 'no',
      packet_id: packet?.packet_id ?? '',
      packet_dir: packet ? packetDir : '',
      allowed_current_display_state: row.allowed_current_display_state,
      can_display_as_fact_current: row.can_display_as_fact_current,
      next_action: row.next_action,
      blocking_reason: row.blocking_reason,
    };
  });
}

function buildSummary({ sourcePath, packetDir, outDir, priorityRows, coverageRows }) {
  return {
    generatedAt: new Date().toISOString(),
    sourcePath,
    packetDir,
    outputDir: outDir,
    sourceGapCount: priorityRows.length,
    coveredSourceGapCount: coverageRows.filter((row) => row.covered_by_packet === 'yes').length,
    uncoveredSourceIds: coverageRows.filter((row) => row.covered_by_packet !== 'yes').map((row) => row.source_id),
    byPriority: countBy(coverageRows, (row) => row.priority),
    byCollectionMethod: countBy(coverageRows, (row) => row.collection_method),
    byOwnerLane: countBy(coverageRows, (row) => row.owner_lane),
    boundaries: {
      providerCalls: false,
      restrictedConnectorAccess: false,
      productionWrites: false,
      productionDeploy: false,
      factPromotion: false,
    },
  };
}

function buildRunbook(summary) {
  return `---\ntitle: mkt53 source gap readiness coverage ${dateSlug()}\nstatus: readiness-coverage-only\ncreated_at: ${summary.generatedAt}\nprovider_calls: false\nrestricted_connector_access: false\nproduction_writes: false\nfact_promotion: false\n---\n\n# mkt53 Source Gap Readiness Coverage ${dateSlug()}\n\n## Boundary\n\n- providerCalls=false\n- restrictedConnectorAccess=false\n- productionWrites=false\n- productionDeploy=false\n- factPromotion=false\n\n## Summary\n\n- sourceGapCount=${summary.sourceGapCount}\n- coveredSourceGapCount=${summary.coveredSourceGapCount}\n- uncoveredSourceIds=${summary.uncoveredSourceIds.join('|') || 'none'}\n- packetDir=${summary.packetDir}\n\n## Next Command\n\nnpm run data:source-gaps:owner-intake -- --coverage ${summary.outputDir}/source_gap_readiness_coverage.csv\n`;
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const appRoot = process.cwd();
  const discoveredSourcePath = options.sourcePath ?? findLatestPriorityMatrix(appRoot);
  const discoveredPacketDir = options.packetDir ?? findLatestPacketDir(appRoot);

  if (!discoveredSourcePath) {
    throw new Error('No source_gap_priority_matrix.csv found. Run npm run data:source-gaps:prioritize first or pass --source <path>.');
  }
  if (!discoveredPacketDir) {
    throw new Error('No readiness_packets.csv found. Run npm run data:source-gaps:readiness-packets first or pass --packet-dir <dir>.');
  }

  const sourcePath = resolve(appRoot, discoveredSourcePath);
  const packetDirAbs = resolve(appRoot, discoveredPacketDir);
  const packetPath = join(packetDirAbs, 'readiness_packets.csv');
  const outDir = resolve(appRoot, options.outDir ?? `tmp/audits/source-gap-readiness-coverage-${dateSlug()}`);
  const packetDirRelative = packetDirAbs.startsWith(`${appRoot}/`) ? packetDirAbs.slice(appRoot.length + 1) : packetDirAbs;

  if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
    throw new Error(`source_gap_priority_matrix.csv not found: ${sourcePath}`);
  }
  if (!existsSync(packetPath) || !statSync(packetPath).isFile()) {
    throw new Error(`readiness_packets.csv not found: ${packetPath}`);
  }

  const priorityRows = parseCsv(readFileSync(sourcePath, 'utf8'), PRIORITY_REQUIRED_COLUMNS).filter((row) => {
    const priorityMatches = options.priorities.includes(row.priority);
    const methodMatches = !options.collectionMethods || options.collectionMethods.includes(row.collection_method);
    return priorityMatches && methodMatches;
  });
  const packetRows = parseCsv(readFileSync(packetPath, 'utf8'), PACKET_REQUIRED_COLUMNS);
  const coverageRows = buildCoverageRows(priorityRows, packetRows, packetDirRelative);
  const summary = buildSummary({ sourcePath, packetDir: packetDirRelative, outDir, priorityRows, coverageRows });

  if (!options.noWrite) {
    mkdirSync(outDir, { recursive: true });
    writeCsv(join(outDir, 'source_gap_readiness_coverage.csv'), coverageRows, COVERAGE_FIELDS);
    writeFileSync(join(outDir, 'readiness_coverage_summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(outDir, 'readiness_coverage_runbook.md'), buildRunbook(summary));
  }

  const payload = { summary, coverageRows };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write([
      'mkt53 source gap readiness coverage',
      `generatedAt=${summary.generatedAt}`,
      `sourcePath=${summary.sourcePath}`,
      `packetDir=${summary.packetDir}`,
      `outputDir=${summary.outputDir}`,
      `sourceGapCount=${summary.sourceGapCount}`,
      `coveredSourceGapCount=${summary.coveredSourceGapCount}`,
      `uncoveredSourceIds=${summary.uncoveredSourceIds.join('|') || 'none'}`,
      `providerCalls=${summary.boundaries.providerCalls}`,
      `productionWrites=${summary.boundaries.productionWrites}`,
      '',
    ].join('\n'));
  }

  return payload;
}

try {
  run();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
