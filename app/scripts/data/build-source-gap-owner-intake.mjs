#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const COVERAGE_REQUIRED_COLUMNS = [
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

const PACKET_REQUIRED_COLUMNS = [
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

const QUESTION_REQUIRED_COLUMNS = [
  'packet_id',
  'question_id',
  'owner_lane',
  'source_ids',
  'question',
  'expected_answer_format',
  'required_for_promotion',
];

const SOURCE_MATRIX_FIELDS = [
  'source_id',
  'priority',
  'module',
  'page',
  'metric',
  'collection_method',
  'evidence_grade',
  'verification_status',
  'owner_lane',
  'packet_id',
  'packet_dir',
  'current_display_state',
  'can_display_as_fact_current',
  'intake_status',
  'promotion_state',
  'owner_answer_required',
  'evidence_required',
  'next_action',
  'blocking_reason',
];

const PACKET_QUEUE_FIELDS = [
  'packet_id',
  'priority',
  'owner_lane',
  'source_count',
  'source_ids',
  'pages',
  'collection_methods',
  'current_max_evidence_grade',
  'target_min_evidence_grade',
  'required_artifact_fields',
  'acceptance_gate',
  'forbidden_claims',
  'intake_status',
  'submitted_owner_answers',
  'required_owner_answers',
  'ready_for_registry_binding',
  'ready_for_fact_display',
  'ready_for_csv_export',
];

const QUESTIONNAIRE_FIELDS = [
  'packet_id',
  'question_id',
  'owner_lane',
  'source_ids',
  'question',
  'expected_answer_format',
  'required_for_promotion',
  'answer_status',
  'owner_answer',
  'evidence_uri_or_path',
  'evidence_hash',
  'answered_by',
  'answered_at',
  'validation_note',
];

const RELEASE_GATE_FIELDS = [
  'release_gate_id',
  'packet_id',
  'owner_lane',
  'priority',
  'source_ids',
  'required_question_count',
  'submitted_question_count',
  'submitted_evidence_count',
  'missing_required_questions',
  'gate_status',
  'can_write_source_registry',
  'can_update_page_display',
  'can_export_as_fact_csv',
  'blocking_reason',
  'next_command_after_owner_submission',
];

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    coveragePath: undefined,
    outDir: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--coverage') options.coveragePath = argv[index + 1];
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

function findLatestCoverage(appRoot) {
  const auditRoot = join(appRoot, 'tmp/audits');
  if (!existsSync(auditRoot)) return undefined;

  const candidates = readdirSync(auditRoot)
    .filter((name) => name.startsWith('source-gap-readiness-coverage-'))
    .map((name) => join(auditRoot, name, 'source_gap_readiness_coverage.csv'))
    .filter((path) => existsSync(path))
    .map((path) => ({ path, mtimeMs: statSync(path).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.path;
}

function readPackets(appRoot, coverageRows) {
  const packetDirs = unique(coverageRows.map((row) => row.packet_dir));
  const packetRows = [];
  const questionRows = [];

  for (const packetDir of packetDirs) {
    const packetPath = resolve(appRoot, packetDir, 'readiness_packets.csv');
    const questionPath = resolve(appRoot, packetDir, 'owner_questionnaire.csv');

    if (!existsSync(packetPath)) throw new Error(`Missing readiness_packets.csv: ${packetPath}`);
    if (!existsSync(questionPath)) throw new Error(`Missing owner_questionnaire.csv: ${questionPath}`);

    packetRows.push(...parseCsv(readFileSync(packetPath, 'utf8'), PACKET_REQUIRED_COLUMNS));
    questionRows.push(...parseCsv(readFileSync(questionPath, 'utf8'), QUESTION_REQUIRED_COLUMNS));
  }

  return { packetDirs, packetRows, questionRows };
}

function buildSourceMatrix(coverageRows) {
  return coverageRows.map((row) => ({
    source_id: row.source_id,
    priority: row.priority,
    module: row.module,
    page: row.page,
    metric: row.metric,
    collection_method: row.collection_method,
    evidence_grade: row.evidence_grade,
    verification_status: row.verification_status,
    owner_lane: row.owner_lane,
    packet_id: row.packet_id,
    packet_dir: row.packet_dir,
    current_display_state: row.allowed_current_display_state,
    can_display_as_fact_current: row.can_display_as_fact_current,
    intake_status: 'awaiting_owner_submission',
    promotion_state: 'blocked_until_owner_evidence_validated',
    owner_answer_required: 'yes',
    evidence_required: 'yes',
    next_action: row.next_action,
    blocking_reason: row.blocking_reason,
  }));
}

function buildPacketQueue(packetRows, questions) {
  const questionCounts = countBy(questions, (question) => question.packet_id);

  return packetRows.map((packet) => ({
    packet_id: packet.packet_id,
    priority: packet.priority,
    owner_lane: packet.owner_lane,
    source_count: packet.source_count,
    source_ids: packet.source_ids,
    pages: packet.pages,
    collection_methods: packet.collection_methods,
    current_max_evidence_grade: packet.current_max_evidence_grade,
    target_min_evidence_grade: packet.target_min_evidence_grade,
    required_artifact_fields: packet.required_artifact_fields,
    acceptance_gate: packet.acceptance_gate,
    forbidden_claims: packet.forbidden_claims,
    intake_status: 'awaiting_owner_submission',
    submitted_owner_answers: 0,
    required_owner_answers: questionCounts[packet.packet_id] ?? 0,
    ready_for_registry_binding: 'false',
    ready_for_fact_display: 'false',
    ready_for_csv_export: 'false',
  }));
}

function buildQuestionnaire(questionRows) {
  return questionRows.map((question) => ({
    packet_id: question.packet_id,
    question_id: question.question_id,
    owner_lane: question.owner_lane,
    source_ids: question.source_ids,
    question: question.question,
    expected_answer_format: question.expected_answer_format,
    required_for_promotion: question.required_for_promotion,
    answer_status: 'missing',
    owner_answer: '',
    evidence_uri_or_path: '',
    evidence_hash: '',
    answered_by: '',
    answered_at: '',
    validation_note: 'Owner answer and evidence are required before registry binding or fact display.',
  }));
}

function buildReleaseGate(packetQueue) {
  return packetQueue.map((packet) => ({
    release_gate_id: `owner-intake-gate:${packet.packet_id}`,
    packet_id: packet.packet_id,
    owner_lane: packet.owner_lane,
    priority: packet.priority,
    source_ids: packet.source_ids,
    required_question_count: packet.required_owner_answers,
    submitted_question_count: 0,
    submitted_evidence_count: 0,
    missing_required_questions: packet.required_owner_answers,
    gate_status: 'blocked_owner_submission_required',
    can_write_source_registry: 'false',
    can_update_page_display: 'false',
    can_export_as_fact_csv: 'false',
    blocking_reason: 'real owner answers, evidence paths, hashes, and validation have not been submitted',
    next_command_after_owner_submission: 'future validation batch only; do not bind to source registry from this intake template',
  }));
}

function buildSummary({ coveragePath, outDir, packetDirs, coverageRows, packetQueue, questionnaire, releaseGate }) {
  return {
    generatedAt: new Date().toISOString(),
    coveragePath,
    outputDir: outDir,
    packetDirs,
    sourceGapCount: coverageRows.length,
    packetCount: packetQueue.length,
    questionCount: questionnaire.length,
    releaseGateCount: releaseGate.length,
    byPriority: countBy(coverageRows, (row) => row.priority),
    byCollectionMethod: countBy(coverageRows, (row) => row.collection_method),
    byOwnerLane: countBy(coverageRows, (row) => row.owner_lane),
    intakeStatusCounts: countBy(packetQueue, (packet) => packet.intake_status),
    boundaries: {
      providerCalls: false,
      restrictedConnectorAccess: false,
      productionWrites: false,
      productionDeploy: false,
      factPromotion: false,
      sourceRegistryWrites: false,
    },
  };
}

function buildRunbook(summary) {
  const ownerLines = Object.entries(summary.byOwnerLane)
    .map(([ownerLane, count]) => `- ${ownerLane}: ${count} source gaps`)
    .join('\n');
  const methodLines = Object.entries(summary.byCollectionMethod)
    .map(([method, count]) => `- ${method}: ${count}`)
    .join('\n');

  return `---\ntitle: mkt53 source gap owner evidence intake ${dateSlug()}\nstatus: owner-intake-template-only\ncreated_at: ${summary.generatedAt}\nprovider_calls: false\nrestricted_connector_access: false\nproduction_writes: false\nfact_promotion: false\nsource_registry_writes: false\n---\n\n# mkt53 Source Gap Owner Evidence Intake ${dateSlug()}\n\n## Boundary\n\n- providerCalls=false\n- restrictedConnectorAccess=false\n- productionWrites=false\n- productionDeploy=false\n- factPromotion=false\n- sourceRegistryWrites=false\n\nThis package is an intake template. It does not approve display, CSV export, provider calls, connector access, production writes, or source registry binding.\n\n## Summary\n\n- sourceGapCount=${summary.sourceGapCount}\n- packetCount=${summary.packetCount}\n- questionCount=${summary.questionCount}\n- releaseGateCount=${summary.releaseGateCount}\n\n## Owner Lanes\n\n${ownerLines}\n\n## Collection Methods\n\n${methodLines}\n\n## Intake Flow\n\n1. Fill every required owner question in owner_intake_questionnaire.csv.\n2. Attach evidence_uri_or_path and evidence_hash for every required evidence item.\n3. Run a future validation batch to verify path/hash shape and answer completeness.\n4. Only after validation passes, bind reviewed evidence back to source registry or page governance.\n5. Run data:audit and data:audit:deep again after any binding change.\n\n## Forbidden Promotion\n\n- Do not treat this template as owner approval.\n- Do not display these sources as verified facts from this template alone.\n- Do not export blocked rows as factual CSV data from this template alone.\n- Do not call providers or restricted connectors from this template.\n`;
}

function buildOutputManifest(summary) {
  return {
    generatedAt: summary.generatedAt,
    outputs: {
      'owner_intake_source_matrix.csv': {
        rowCount: summary.sourceGapCount,
        headers: SOURCE_MATRIX_FIELDS,
      },
      'owner_intake_packet_queue.csv': {
        rowCount: summary.packetCount,
        headers: PACKET_QUEUE_FIELDS,
      },
      'owner_intake_questionnaire.csv': {
        rowCount: summary.questionCount,
        headers: QUESTIONNAIRE_FIELDS,
      },
      'owner_intake_release_gate.csv': {
        rowCount: summary.releaseGateCount,
        headers: RELEASE_GATE_FIELDS,
      },
      'owner_intake_runbook.md': {
        rowCount: 1,
        headers: ['markdown'],
      },
    },
    boundaries: summary.boundaries,
  };
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const appRoot = process.cwd();
  const discoveredCoveragePath = options.coveragePath ?? findLatestCoverage(appRoot);

  if (!discoveredCoveragePath) {
    throw new Error('No source_gap_readiness_coverage.csv found. Build readiness coverage first or pass --coverage <path>.');
  }

  const coveragePath = resolve(appRoot, discoveredCoveragePath);
  if (!existsSync(coveragePath) || !statSync(coveragePath).isFile()) {
    throw new Error(`source_gap_readiness_coverage.csv not found: ${coveragePath}`);
  }

  const coverageRows = parseCsv(readFileSync(coveragePath, 'utf8'), COVERAGE_REQUIRED_COLUMNS);
  const uncoveredRows = coverageRows.filter((row) => row.covered_by_packet !== 'yes');
  if (uncoveredRows.length > 0) {
    throw new Error(`Cannot build owner intake while coverage has uncovered source gaps: ${uncoveredRows.map((row) => row.source_id).join(', ')}`);
  }

  const { packetDirs, packetRows, questionRows } = readPackets(appRoot, coverageRows);
  const sourceMatrix = buildSourceMatrix(coverageRows);
  const questionnaire = buildQuestionnaire(questionRows);
  const packetQueue = buildPacketQueue(packetRows, questionnaire);
  const releaseGate = buildReleaseGate(packetQueue);
  const outDir = resolve(appRoot, options.outDir ?? `tmp/audits/source-gap-owner-intake-${dateSlug()}`);
  const summary = buildSummary({
    coveragePath,
    outDir,
    packetDirs,
    coverageRows,
    packetQueue,
    questionnaire,
    releaseGate,
  });
  const manifest = buildOutputManifest(summary);

  if (!options.noWrite) {
    mkdirSync(outDir, { recursive: true });
    writeCsv(join(outDir, 'owner_intake_source_matrix.csv'), sourceMatrix, SOURCE_MATRIX_FIELDS);
    writeCsv(join(outDir, 'owner_intake_packet_queue.csv'), packetQueue, PACKET_QUEUE_FIELDS);
    writeCsv(join(outDir, 'owner_intake_questionnaire.csv'), questionnaire, QUESTIONNAIRE_FIELDS);
    writeCsv(join(outDir, 'owner_intake_release_gate.csv'), releaseGate, RELEASE_GATE_FIELDS);
    writeFileSync(join(outDir, 'owner_intake_runbook.md'), buildRunbook(summary));
    writeFileSync(join(outDir, 'owner_intake_summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(outDir, 'owner_intake_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const payload = {
    summary,
    manifest,
    samplePacketQueue: packetQueue.slice(0, 3),
    sampleQuestionnaire: questionnaire.slice(0, 6),
    sampleReleaseGate: releaseGate.slice(0, 3),
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write([
      'mkt53 source gap owner evidence intake',
      `generatedAt=${summary.generatedAt}`,
      `coveragePath=${summary.coveragePath}`,
      `outputDir=${summary.outputDir}`,
      `sourceGapCount=${summary.sourceGapCount}`,
      `packetCount=${summary.packetCount}`,
      `questionCount=${summary.questionCount}`,
      `releaseGateCount=${summary.releaseGateCount}`,
      `byOwnerLane=${JSON.stringify(summary.byOwnerLane)}`,
      `providerCalls=${summary.boundaries.providerCalls}`,
      `productionWrites=${summary.boundaries.productionWrites}`,
      `factPromotion=${summary.boundaries.factPromotion}`,
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
