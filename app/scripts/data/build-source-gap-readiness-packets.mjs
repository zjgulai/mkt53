#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const REQUIRED_PRIORITY_COLUMNS = [
  'priority',
  'owner_lane',
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
  'recommended_collection_lane',
];

const PACKET_FIELDS = [
  'packet_id',
  'priority',
  'owner_lane',
  'source_count',
  'source_ids',
  'pages',
  'collection_methods',
  'current_max_evidence_grade',
  'target_min_evidence_grade',
  'decision_boundary',
  'blocked_fact_display_until',
  'required_artifact_fields',
  'acceptance_gate',
  'forbidden_claims',
];

const QUESTION_FIELDS = [
  'packet_id',
  'question_id',
  'owner_lane',
  'source_ids',
  'question',
  'expected_answer_format',
  'required_for_promotion',
];

const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3'];

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    sourcePath: undefined,
    outDir: undefined,
    priorities: ['P0'],
    collectionMethods: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--source') options.sourcePath = argv[index + 1];
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

  const missingColumns = REQUIRED_PRIORITY_COLUMNS.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`source_gap_priority_matrix is missing required columns: ${missingColumns.join(', ')}`);
  }

  return dataRows.map((dataRow) => Object.fromEntries(header.map((column, index) => [column, dataRow[index] ?? ''])));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
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

function evidenceRank(grade) {
  const ranks = {
    'L0-unverified': 0,
    'LO-S-synthetic': 0,
    'L1-public-or-runtime': 1,
    'L2-fixture-or-dry-run': 2,
    'L3-production-read-only': 3,
    'L4-authorized-live': 4,
  };
  return ranks[grade] ?? -1;
}

function maxEvidenceGrade(rows) {
  return rows
    .map((row) => row.evidence_grade)
    .sort((left, right) => evidenceRank(right) - evidenceRank(left))[0];
}

function targetEvidenceGrade(rows) {
  if (rows.some((row) => row.collection_method === 'connector-required')) return 'L3-production-read-only or L4-authorized-live';
  if (rows.some((row) => row.collection_method === 'manual-required')) return 'L1-public-or-runtime plus signed manual artifact';
  if (rows.some((row) => row.collection_method === 'public-url-check')) return 'L1-public-or-runtime';
  return 'L1-public-or-runtime';
}

function requiredArtifactFields(rows) {
  const fields = [
    'artifact_id',
    'owner_alias',
    'owner_role',
    'approval_or_review_date',
    'source_ids',
    'claim_scope',
    'metric_definition',
    'collection_window_start',
    'collection_window_end',
    'source_system',
    'field_dictionary_path',
    'row_count_or_sample_size',
    'evidence_file_path',
    'evidence_hash',
    'privacy_classification',
    'display_decision',
    'export_decision',
    'limitations',
  ];

  if (rows.some((row) => row.collection_method === 'connector-required')) {
    fields.push('access_mode', 'connector_or_snapshot_type', 'refresh_owner', 'secret_storage_statement');
  }
  if (rows.some((row) => row.collection_method === 'public-url-check')) {
    fields.push('source_url', 'publisher', 'retrieved_at', 'content_hash', 'cross_check_note');
  }
  if (rows.some((row) => row.collection_method === 'manual-required')) {
    fields.push('reviewer_alias', 'manual_review_note', 'business_owner_signoff');
  }

  return unique(fields).join('|');
}

function acceptanceGate(rows) {
  const methods = unique(rows.map((row) => row.collection_method));

  if (methods.includes('connector-required')) {
    return 'Owner provides authorized read-only snapshot or connector readiness artifact; artifact has no secret values; deep audit remains zero unsupported claims after source registry binding.';
  }
  if (methods.includes('manual-required')) {
    return 'Business owner provides signed review artifact with source scope, metric definition, display/export decision, and lastCheckedAt.';
  }
  if (methods.includes('public-url-check')) {
    return 'Public evidence capture records URL, title, publisher, retrievedAt, hash, summary, and cross-check result.';
  }
  return 'Readable local evidence artifact is bound to each source_id and deep audit passes.';
}

function forbiddenClaims(rows) {
  const claims = [
    'Do not display these rows as verified facts.',
    'Do not export these rows as factual CSV data.',
    'Do not infer market share, sales, ranking, or user behavior beyond the artifact scope.',
  ];

  if (rows.some((row) => row.owner_lane.includes('amazon'))) {
    claims.push('Do not treat public Amazon pages as Amazon platform-level sales, SKU, BSR, or market share proof.');
  }
  if (rows.some((row) => row.owner_lane.includes('social'))) {
    claims.push('Do not treat unaudited social mention counts as full-platform VOC or customer evidence.');
  }
  if (rows.some((row) => row.owner_lane.includes('voc'))) {
    claims.push('Do not promote NLP output without sample window, model version, and human review agreement.');
  }

  return claims.join(' ');
}

function groupRows(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = `${row.priority}|${row.owner_lane}`;
    const group = groups.get(key) ?? {
      priority: row.priority,
      owner_lane: row.owner_lane,
      rows: [],
    };
    group.rows.push(row);
    groups.set(key, group);
  }

  return [...groups.values()].sort((left, right) => {
    const priorityDelta = PRIORITY_ORDER.indexOf(left.priority) - PRIORITY_ORDER.indexOf(right.priority);
    if (priorityDelta !== 0) return priorityDelta;
    return left.owner_lane.localeCompare(right.owner_lane);
  });
}

function buildPackets(priorityRows) {
  return groupRows(priorityRows).map((group, index) => {
    const packetId = `${group.priority.toLowerCase()}-${group.owner_lane.replaceAll('_', '-')}-${String(index + 1).padStart(2, '0')}`;

    return {
      packet_id: packetId,
      priority: group.priority,
      owner_lane: group.owner_lane,
      source_count: group.rows.length,
      source_ids: unique(group.rows.map((row) => row.source_id)).join('|'),
      pages: unique(group.rows.map((row) => row.page)).join('|'),
      collection_methods: unique(group.rows.map((row) => row.collection_method)).join('|'),
      current_max_evidence_grade: maxEvidenceGrade(group.rows),
      target_min_evidence_grade: targetEvidenceGrade(group.rows),
      decision_boundary: 'readiness_packet_only; no provider call; no restricted connector access; no production write; no fact promotion',
      blocked_fact_display_until: 'required evidence artifact is created, reviewed, and bound back to source registry',
      required_artifact_fields: requiredArtifactFields(group.rows),
      acceptance_gate: acceptanceGate(group.rows),
      forbidden_claims: forbiddenClaims(group.rows),
      rows: group.rows,
    };
  });
}

function buildQuestions(packets) {
  const baseQuestions = [
    {
      question_id: 'Q1',
      question: 'Who is the owner alias and role accountable for this source packet?',
      expected_answer_format: 'owner_alias / owner_role',
      required_for_promotion: 'yes',
    },
    {
      question_id: 'Q2',
      question: 'What is the exact collection window, source system, and claim scope?',
      expected_answer_format: 'YYYY-MM-DD..YYYY-MM-DD / system / scope text',
      required_for_promotion: 'yes',
    },
    {
      question_id: 'Q3',
      question: 'Where is the read-only export, snapshot, or evidence file stored, and what is its hash?',
      expected_answer_format: 'path or URI / sha256 or content hash',
      required_for_promotion: 'yes',
    },
    {
      question_id: 'Q4',
      question: 'What field dictionary, row count or sample size, and metric definition should be used?',
      expected_answer_format: 'field dictionary path / count / metric definition',
      required_for_promotion: 'yes',
    },
    {
      question_id: 'Q5',
      question: 'Can the data be displayed as an internal fact, exported as CSV, both, or only kept as a gate?',
      expected_answer_format: 'display yes/no + export yes/no + allowed scope',
      required_for_promotion: 'yes',
    },
    {
      question_id: 'Q6',
      question: 'What limitations, forbidden interpretations, and refresh owner must stay attached?',
      expected_answer_format: 'limitations / forbidden claims / refresh owner',
      required_for_promotion: 'yes',
    },
  ];

  return packets.flatMap((packet) =>
    baseQuestions.map((question) => ({
      packet_id: packet.packet_id,
      question_id: question.question_id,
      owner_lane: packet.owner_lane,
      source_ids: packet.source_ids,
      question: question.question,
      expected_answer_format: question.expected_answer_format,
      required_for_promotion: question.required_for_promotion,
    })),
  );
}

function packetMarkdown(packet, generatedAt) {
  const sourceLines = packet.rows
    .map(
      (row) =>
        `| ${row.source_id} | ${row.page} | ${row.metric} | ${row.evidence_grade} | ${row.allowed_current_display_state} | ${row.smallest_evidence_needed} |`,
    )
    .join('\n');

  return `---\ntitle: ${packet.packet_id}\nstatus: readiness-packet-only\ncreated_at: ${generatedAt}\npriority: ${packet.priority}\nowner_lane: ${packet.owner_lane}\nprovider_calls: false\nrestricted_connector_access: false\nproduction_writes: false\nfact_promotion: false\n---\n\n# ${packet.packet_id}\n\n## Boundary\n\n- providerCalls=false\n- restrictedConnectorAccess=false\n- productionWrites=false\n- productionDeploy=false\n- factPromotion=false\n\n## Decision Gate\n\n- current_max_evidence_grade=${packet.current_max_evidence_grade}\n- target_min_evidence_grade=${packet.target_min_evidence_grade}\n- blocked_fact_display_until=${packet.blocked_fact_display_until}\n- acceptance_gate=${packet.acceptance_gate}\n\n## Required Artifact Fields\n\n${packet.required_artifact_fields.split('|').map((field) => `- ${field}`).join('\n')}\n\n## Source Rows\n\n| source_id | page | metric | current_grade | current_display_state | smallest_evidence_needed |\n|---|---|---|---|---|---|\n${sourceLines}\n\n## Forbidden Claims\n\n${packet.forbidden_claims}\n`;
}

function buildSummary({ sourcePath, outDir, priorities, collectionMethods, priorityRows, packets, questions }) {
  return {
    generatedAt: new Date().toISOString(),
    sourcePath,
    outputDir: outDir,
    selectedPriorities: priorities,
    selectedCollectionMethods: collectionMethods ?? ['all'],
    sourceRowCount: priorityRows.length,
    packetCount: packets.length,
    questionCount: questions.length,
    byOwnerLane: countBy(priorityRows, (row) => row.owner_lane),
    byCollectionMethod: countBy(priorityRows, (row) => row.collection_method),
    byEvidenceGrade: countBy(priorityRows, (row) => row.evidence_grade),
    packetIds: packets.map((packet) => packet.packet_id),
    boundaries: {
      providerCalls: false,
      restrictedConnectorAccess: false,
      productionWrites: false,
      productionDeploy: false,
      factPromotion: false,
    },
  };
}

function buildIndexMarkdown(summary, packets) {
  const packetLines = packets
    .map(
      (packet) =>
        `| ${packet.packet_id} | ${packet.priority} | ${packet.owner_lane} | ${packet.source_count} | ${packet.source_ids.replaceAll('|', '<br>')} |`,
    )
    .join('\n');

  return `---\ntitle: mkt53 source gap readiness packets ${dateSlug()}\nstatus: readiness-packet-only\ncreated_at: ${summary.generatedAt}\nsource: ${basename(summary.sourcePath)}\nprovider_calls: false\nrestricted_connector_access: false\nproduction_writes: false\nfact_promotion: false\n---\n\n# mkt53 Source Gap Readiness Packets ${dateSlug()}\n\n## Boundary\n\n- providerCalls=false\n- restrictedConnectorAccess=false\n- productionWrites=false\n- productionDeploy=false\n- factPromotion=false\n\n## Summary\n\n- selectedPriorities=${summary.selectedPriorities.join('|')}\n- selectedCollectionMethods=${summary.selectedCollectionMethods.join('|')}\n- sourceRowCount=${summary.sourceRowCount}\n- packetCount=${summary.packetCount}\n- questionCount=${summary.questionCount}\n\n## Packets\n\n| packet_id | priority | owner_lane | source_count | source_ids |\n|---|---|---|---:|---|\n${packetLines}\n\n## Next Evidence Rule\n\nEach packet can move out of gate state only after the owner supplies the required artifact fields and a fresh deep audit keeps unsupported page/CSV claims at zero.\n`;
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const appRoot = process.cwd();
  const discoveredSourcePath = options.sourcePath ?? findLatestPriorityMatrix(appRoot);

  if (!discoveredSourcePath) {
    throw new Error('No source_gap_priority_matrix.csv found. Run npm run data:source-gaps:prioritize first or pass --source <path>.');
  }

  const sourcePath = resolve(appRoot, discoveredSourcePath);
  if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
    throw new Error(`source_gap_priority_matrix.csv not found: ${sourcePath}`);
  }

  const outDir = resolve(appRoot, options.outDir ?? `tmp/audits/source-gap-readiness-packets-${dateSlug()}`);
  const rows = parseCsv(readFileSync(sourcePath, 'utf8'));
  const priorityRows = rows.filter((row) => {
    const priorityMatches = options.priorities.includes(row.priority);
    const methodMatches = !options.collectionMethods || options.collectionMethods.includes(row.collection_method);
    return priorityMatches && methodMatches;
  });
  const packets = buildPackets(priorityRows);
  const questions = buildQuestions(packets);
  const summary = buildSummary({
    sourcePath,
    outDir,
    priorities: options.priorities,
    collectionMethods: options.collectionMethods,
    priorityRows,
    packets,
    questions,
  });

  if (!options.noWrite) {
    mkdirSync(outDir, { recursive: true });
    writeCsv(join(outDir, 'readiness_packets.csv'), packets, PACKET_FIELDS);
    writeCsv(join(outDir, 'owner_questionnaire.csv'), questions, QUESTION_FIELDS);
    writeFileSync(join(outDir, 'readiness_packet_summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(outDir, 'readiness_packet_index.md'), buildIndexMarkdown(summary, packets));

    const packetDir = join(outDir, 'packets');
    mkdirSync(packetDir, { recursive: true });
    for (const packet of packets) {
      writeFileSync(join(packetDir, `${packet.packet_id}.md`), packetMarkdown(packet, summary.generatedAt));
    }
  }

  const payload = { summary, packets: packets.map(({ rows: _rows, ...packet }) => packet), questions };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write([
      'mkt53 source gap readiness packets',
      `generatedAt=${summary.generatedAt}`,
      `sourcePath=${summary.sourcePath}`,
      `outputDir=${summary.outputDir}`,
      `selectedPriorities=${summary.selectedPriorities.join('|')}`,
      `selectedCollectionMethods=${summary.selectedCollectionMethods.join('|')}`,
      `sourceRowCount=${summary.sourceRowCount}`,
      `packetCount=${summary.packetCount}`,
      `questionCount=${summary.questionCount}`,
      `byOwnerLane=${JSON.stringify(summary.byOwnerLane)}`,
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
