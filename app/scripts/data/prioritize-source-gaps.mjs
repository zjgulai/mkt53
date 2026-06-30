#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const SOURCE_GAP_HEADER = [
  'source_id',
  'module',
  'page',
  'metric',
  'source_name',
  'source_type',
  'verification_status',
  'reliability',
  'last_verified',
  'collection_method',
  'evidence_grade',
  'can_display_as_fact',
  'blocking_reason',
  'privacy_level',
  'evidence_artifact_path',
  'claim_scope',
  'source_url',
  'action',
  'gap',
  'recommended_collection_lane',
];

const OUTPUT_FIELDS = [
  'priority',
  'priority_reason',
  'owner_lane',
  'recommended_collection_lane',
  'source_id',
  'module',
  'page',
  'metric',
  'source_name',
  'source_type',
  'collection_method',
  'evidence_grade',
  'verification_status',
  'privacy_level',
  'allowed_current_display_state',
  'can_display_as_fact_current',
  'next_action',
  'smallest_evidence_needed',
  'blocking_reason',
  'gap',
  'source_url',
  'evidence_artifact_path',
  'last_verified',
  'action',
];

const BATCH_FIELDS = [
  'batch_id',
  'priority',
  'collection_method',
  'owner_lane',
  'source_count',
  'source_ids',
  'pages',
  'next_action',
  'acceptance_gate',
];

const CORE_BUSINESS_PAGES = new Set([
  'MarketTrend',
  'BreastPump',
  'CustomsData',
  'CompetitionPage',
  'ProductManage',
  'RegionCompetition',
  'UsersPage',
  'OverseasSentiment',
  'ConsumerInterviews',
  'SelfInsight',
  'CommentData',
  'WebReview',
  'FlavorMap',
  'CategoryAnalysis',
  'NursingProducts',
  'ChannelInterviews',
  'StoreInterviews',
  'BabyCare',
]);

const CORE_METRIC_PATTERN =
  /(?:TAM|SAM|SOM|GMV|CAGR|BSR|share|sales|revenue|trend|growth|price|rating|review|rank|市场|份额|月度|趋势|品类|销量|销售|营收|收入|价格|评价|评论|排名|竞品|渠道|门店|海关|用户|售后|转化|库存)/i;

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    sourcePath: undefined,
    outDir: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--source') options.sourcePath = argv[index + 1];
    if (argv[index] === '--out') options.outDir = argv[index + 1];
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

function parseCsv(text) {
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
    rows.push(row);
  }

  const [header, ...dataRows] = rows.filter((candidate) => candidate.some((value) => value !== ''));
  if (!header) return [];

  const missingColumns = SOURCE_GAP_HEADER.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`source_gap_matrix is missing required columns: ${missingColumns.join(', ')}`);
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function findLatestSourceGapMatrix(appRoot) {
  const auditRoot = join(appRoot, 'tmp/audits');
  if (!existsSync(auditRoot)) return undefined;

  const candidates = readdirSync(auditRoot)
    .filter((name) => name.startsWith('full-data-quality-'))
    .map((name) => join(auditRoot, name, 'source_gap_matrix.csv'))
    .filter((path) => existsSync(path))
    .map((path) => ({ path, mtimeMs: statSync(path).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.path;
}

function normalizeBool(value) {
  return String(value).trim().toLowerCase() === 'true';
}

function isSourceGap(row) {
  return !normalizeBool(row.can_display_as_fact);
}

function ownerLane(row) {
  const name = `${row.source_name} ${row.metric} ${row.source_type}`.toLowerCase();

  if (row.collection_method === 'public-url-check') return 'public_research_owner';
  if (row.collection_method === 'manual-required') return 'business_owner_manual_review';
  if (name.includes('erp')) return 'erp_connector_owner';
  if (name.includes('crm')) return 'crm_connector_owner';
  if (name.includes('amazon')) return 'amazon_connector_owner';
  if (name.includes('youtube')) return 'youtube_connector_owner';
  if (name.includes('tiktok') || name.includes('ig') || name.includes('fb') || name.includes('social')) {
    return 'social_connector_owner';
  }
  if (name.includes('voc') || name.includes('nlp') || name.includes('评论')) return 'voc_nlp_connector_owner';
  if (name.includes('import genius') || name.includes('海关')) return 'trade_data_connector_owner';
  if (row.collection_method === 'connector-required') return 'connector_owner_private_snapshot';
  return 'data_governance_owner';
}

function allowedCurrentDisplayState(row) {
  if (row.evidence_grade === 'LO-S-synthetic') return 'sample_only_excluded_from_fact_and_csv';
  if (row.evidence_grade === 'L2-fixture-or-dry-run') return 'dry_run_or_fixture_only';
  if (row.evidence_grade === 'L0-unverified') return 'display_as_gate_only';
  return 'review_required_before_fact_display';
}

function nextAction(row) {
  if (row.blocking_reason === 'example-data-must-not-display-as-fact') {
    return 'Keep page wording as sample or gate, then replace with an approved evidence artifact before fact display or CSV export.';
  }
  if (row.collection_method === 'connector-required') {
    return 'Create connector readiness record or authorized private snapshot manifest with owner, collection window, field dictionary, row count, hash, and evidence path.';
  }
  if (row.collection_method === 'manual-required') {
    return 'Create manual review artifact with owner signoff, source URLs or report pages, metric scope, sample/window, and lastCheckedAt.';
  }
  if (row.collection_method === 'public-url-check') {
    return 'Capture public evidence with URL, title, publisher, retrievedAt, content hash, quote-safe summary, and cross-check note.';
  }
  return 'Attach a local governance artifact and re-run deep audit.';
}

function smallestEvidenceNeeded(row) {
  if (row.collection_method === 'connector-required') {
    return 'Authorized read-only export or connector readiness artifact at L3/L4 boundary; no fact display until snapshot/connector evidence exists.';
  }
  if (row.collection_method === 'manual-required') {
    return 'Manual evidence artifact signed by business owner with source scope, metric definition, and display/export decision.';
  }
  if (row.collection_method === 'public-url-check') {
    return 'One primary public source or two independent public/industry sources with captured URL/title/date/hash.';
  }
  return 'Readable local artifact path plus source_id binding.';
}

function priorityFor(row) {
  const metricText = `${row.metric} ${row.page} ${row.module}`;
  const coreImpact = CORE_BUSINESS_PAGES.has(row.page) || CORE_METRIC_PATTERN.test(metricText);
  const connectorL0 = row.collection_method === 'connector-required' && row.evidence_grade === 'L0-unverified';
  const publicL0 = row.collection_method === 'public-url-check' && row.evidence_grade === 'L0-unverified';
  const manualL0 = row.collection_method === 'manual-required' && row.evidence_grade === 'L0-unverified';
  const synthetic = row.evidence_grade === 'LO-S-synthetic';

  if (connectorL0 && coreImpact) {
    return {
      priority: 'P0',
      reason: 'Core business metric depends on authorized connector or private snapshot evidence.',
    };
  }

  if ((publicL0 || manualL0) && coreImpact) {
    return {
      priority: 'P1',
      reason: 'Business-facing source needs public or manual evidence artifact before fact display.',
    };
  }

  if (synthetic && coreImpact) {
    return {
      priority: 'P1',
      reason: 'Core page still contains sample/synthetic source that must stay separated from facts and CSV exports.',
    };
  }

  if (row.evidence_grade === 'L2-fixture-or-dry-run') {
    return {
      priority: 'P2',
      reason: 'Fixture or dry-run evidence can support gate UI only until authorized runtime evidence exists.',
    };
  }

  if (synthetic) {
    return {
      priority: 'P2',
      reason: 'Sample/synthetic source should remain labelled and outside factual KPI surfaces.',
    };
  }

  return {
    priority: 'P2',
    reason: 'Governance follow-up required before source can be promoted.',
  };
}

function prioritizeRows(rows) {
  return rows.filter(isSourceGap).map((row) => {
    const priority = priorityFor(row);

    return {
      priority: priority.priority,
      priority_reason: priority.reason,
      owner_lane: ownerLane(row),
      recommended_collection_lane: row.recommended_collection_lane,
      source_id: row.source_id,
      module: row.module,
      page: row.page,
      metric: row.metric,
      source_name: row.source_name,
      source_type: row.source_type,
      collection_method: row.collection_method,
      evidence_grade: row.evidence_grade,
      verification_status: row.verification_status,
      privacy_level: row.privacy_level,
      allowed_current_display_state: allowedCurrentDisplayState(row),
      can_display_as_fact_current: row.can_display_as_fact,
      next_action: nextAction(row),
      smallest_evidence_needed: smallestEvidenceNeeded(row),
      blocking_reason: row.blocking_reason,
      gap: row.gap,
      source_url: row.source_url,
      evidence_artifact_path: row.evidence_artifact_path,
      last_verified: row.last_verified,
      action: row.action,
    };
  });
}

function buildBatches(priorityRows) {
  const groups = new Map();

  for (const row of priorityRows) {
    const key = [row.priority, row.collection_method, row.owner_lane].join('|');
    const existing = groups.get(key) ?? {
      batch_id: `gap-${String(groups.size + 1).padStart(2, '0')}`,
      priority: row.priority,
      collection_method: row.collection_method,
      owner_lane: row.owner_lane,
      rows: [],
    };
    existing.rows.push(row);
    groups.set(key, existing);
  }

  return [...groups.values()].map((group) => ({
    batch_id: group.batch_id,
    priority: group.priority,
    collection_method: group.collection_method,
    owner_lane: group.owner_lane,
    source_count: group.rows.length,
    source_ids: unique(group.rows.map((row) => row.source_id)).join('|'),
    pages: unique(group.rows.map((row) => row.page)).join('|'),
    next_action: unique(group.rows.map((row) => row.next_action)).join(' / '),
    acceptance_gate: acceptanceGate(group),
  }));
}

function acceptanceGate(group) {
  if (group.collection_method === 'connector-required') {
    return 'read-only snapshot or connector readiness artifact exists, contains no secret values, and re-run deep audit keeps these rows out of unsupported display/export';
  }
  if (group.collection_method === 'manual-required') {
    return 'manual evidence artifact records owner, scope, metric definition, source evidence, display decision, and lastCheckedAt';
  }
  if (group.collection_method === 'public-url-check') {
    return 'public evidence capture records URL, title, publisher, retrievedAt, hash, summary, and cross-check result';
  }
  return 'local source artifact exists and is referenced by source registry';
}

function buildSummary({ rows, priorityRows, batchRows, sourcePath, outDir }) {
  return {
    generatedAt: new Date().toISOString(),
    sourcePath,
    outputDir: outDir,
    totalRegistryRows: rows.length,
    totalGaps: priorityRows.length,
    displayableRowsExcludedFromGapQueue: rows.length - priorityRows.length,
    byPriority: countBy(priorityRows, (row) => row.priority),
    byCollectionMethod: countBy(priorityRows, (row) => row.collection_method),
    byEvidenceGrade: countBy(priorityRows, (row) => row.evidence_grade),
    byModule: countBy(priorityRows, (row) => row.module),
    byOwnerLane: countBy(priorityRows, (row) => row.owner_lane),
    batchCount: batchRows.length,
    boundaries: {
      providerCalls: false,
      restrictedConnectorAccess: false,
      productionWrites: false,
      productionDeploy: false,
      factPromotion: false,
    },
  };
}

function buildReport(summary, priorityRows, batchRows) {
  const priorityLines = Object.entries(summary.byPriority)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([priority, count]) => `- ${priority}: ${count}`)
    .join('\n');
  const methodLines = Object.entries(summary.byCollectionMethod)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([method, count]) => `- ${method}: ${count}`)
    .join('\n');
  const batchLines = batchRows
    .map(
      (batch) =>
        `| ${batch.batch_id} | ${batch.priority} | ${batch.collection_method} | ${batch.owner_lane} | ${batch.source_count} | ${batch.source_ids.replaceAll('|', '<br>')} |`,
    )
    .join('\n');
  const topRows = priorityRows
    .filter((row) => row.priority === 'P0')
    .map((row) => `- ${row.source_id} ${row.page} / ${row.metric}: ${row.smallest_evidence_needed}`)
    .join('\n');

  return `---\ntitle: mkt53 source gap prioritization ${dateSlug()}\nstatus: local-audit-artifact\ncreated_at: ${summary.generatedAt}\nsource: ${basename(dirname(summary.sourcePath))}/source_gap_matrix.csv\nprovider_calls: false\nproduction_writes: false\n---\n\n# mkt53 Source Gap Prioritization ${dateSlug()}\n\n## Boundary\n\n- providerCalls=false\n- restrictedConnectorAccess=false\n- productionWrites=false\n- productionDeploy=false\n- factPromotion=false\n\n## Summary\n\n- totalRegistryRows=${summary.totalRegistryRows}\n- totalGaps=${summary.totalGaps}\n- displayableRowsExcludedFromGapQueue=${summary.displayableRowsExcludedFromGapQueue}\n- batchCount=${summary.batchCount}\n\n## Priority Counts\n\n${priorityLines}\n\n## Collection Method Counts\n\n${methodLines}\n\n## P0 Smallest Evidence\n\n${topRows || '- No P0 rows in this run.'}\n\n## Collection Batches\n\n| batch_id | priority | collection_method | owner_lane | source_count | source_ids |\n|---|---:|---|---|---:|---|\n${batchLines}\n\n## Acceptance Rule\n\nA row can leave this backlog only after the named evidence artifact exists, the source registry points to that artifact or source URL, and a fresh deep audit still keeps unsupported page/CSV claims at zero.\n`;
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const appRoot = process.cwd();
  const discoveredSourcePath = options.sourcePath ?? findLatestSourceGapMatrix(appRoot);

  if (!discoveredSourcePath) {
    throw new Error('No source_gap_matrix.csv found. Run npm run data:audit:deep first or pass --source <path>.');
  }

  const sourcePath = resolve(appRoot, discoveredSourcePath);
  if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
    throw new Error(`source_gap_matrix.csv not found: ${sourcePath}`);
  }

  const outDir = resolve(appRoot, options.outDir ?? `tmp/audits/source-gap-prioritization-${dateSlug()}`);
  const rows = parseCsv(readFileSync(sourcePath, 'utf8'));
  const priorityRows = prioritizeRows(rows);
  const batchRows = buildBatches(priorityRows);
  const summary = buildSummary({ rows, priorityRows, batchRows, sourcePath, outDir });

  if (!options.noWrite) {
    mkdirSync(outDir, { recursive: true });
    writeCsv(join(outDir, 'source_gap_priority_matrix.csv'), priorityRows, OUTPUT_FIELDS);
    writeCsv(join(outDir, 'source_gap_collection_batches.csv'), batchRows, BATCH_FIELDS);
    writeFileSync(join(outDir, 'source_gap_priority_summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(outDir, 'source_gap_execution_plan.md'), buildReport(summary, priorityRows, batchRows));
  }

  const payload = { summary, priorityRows, batchRows };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write([
      'mkt53 source gap prioritization',
      `generatedAt=${summary.generatedAt}`,
      `sourcePath=${summary.sourcePath}`,
      `outputDir=${summary.outputDir}`,
      `totalRegistryRows=${summary.totalRegistryRows}`,
      `totalGaps=${summary.totalGaps}`,
      `byPriority=${JSON.stringify(summary.byPriority)}`,
      `byCollectionMethod=${JSON.stringify(summary.byCollectionMethod)}`,
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
