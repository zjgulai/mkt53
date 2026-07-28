#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isValidIsoDateOrDateTime } from './lib/strict-iso-date.mjs';

const QUESTIONNAIRE_REQUIRED_COLUMNS = [
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

const PACKET_QUEUE_REQUIRED_COLUMNS = [
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

const RELEASE_GATE_REQUIRED_COLUMNS = [
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

const SOURCE_MATRIX_REQUIRED_COLUMNS = [
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

const REQUIRED_OWNER_QUESTION_IDS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'];

const QUESTION_VALIDATION_FIELDS = [
  'packet_id',
  'question_id',
  'owner_lane',
  'source_ids',
  'required_for_promotion',
  'answer_status',
  'owner_answer',
  'evidence_uri_or_path',
  'evidence_hash',
  'answered_by',
  'answered_at',
  'validation_status',
  'is_complete_for_manual_review',
  'hash_validation_status',
  'evidence_reference_status',
  'forbidden_token_detected',
  'blockers',
  'can_write_source_registry',
  'can_update_page_display',
  'can_export_as_fact_csv',
];

const PACKET_VALIDATION_FIELDS = [
  'release_gate_id',
  'packet_id',
  'owner_lane',
  'priority',
  'source_ids',
  'required_question_count',
  'answered_question_count',
  'complete_required_question_count',
  'submitted_evidence_count',
  'invalid_hash_count',
  'forbidden_token_row_count',
  'missing_required_questions',
  'packet_validation_status',
  'ready_for_manual_review',
  'can_write_source_registry',
  'can_update_page_display',
  'can_export_as_fact_csv',
  'blocking_reason',
  'next_action',
];

const SOURCE_VALIDATION_FIELDS = [
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
  'current_display_state',
  'can_display_as_fact_current',
  'packet_validation_status',
  'ready_for_manual_review',
  'can_write_source_registry',
  'can_update_page_display',
  'can_export_as_fact_csv',
  'blocking_reason',
];

const ALLOWED_ANSWER_STATUSES = new Set(['missing', 'answered', 'not_applicable', 'rejected', 'needs_owner_update']);
const FORBIDDEN_TOKEN_RE = /password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i;
const SHA256_RE = /^(?:sha256:)?[a-f0-9]{64}$/i;

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    intakeDir: undefined,
    outDir: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--intake') options.intakeDir = argv[index + 1];
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

function countBy(rows, getter) {
  return rows.reduce((acc, row) => {
    const key = getter(row) || 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function findLatestIntake(appRoot) {
  const auditRoot = join(appRoot, 'tmp/audits');
  if (!existsSync(auditRoot)) return undefined;

  const candidates = readdirSync(auditRoot)
    .filter((name) => name.startsWith('source-gap-owner-intake-'))
    .map((name) => join(auditRoot, name))
    .filter((path) => existsSync(join(path, 'owner_intake_questionnaire.csv')))
    .map((path) => ({ path, mtimeMs: statSync(join(path, 'owner_intake_questionnaire.csv')).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.path;
}

function readRequiredCsv(intakeDir, filename, requiredColumns) {
  const path = join(intakeDir, filename);
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Missing owner intake input: ${path}`);
  }
  return parseCsv(readFileSync(path, 'utf8'), requiredColumns);
}

function hasForbiddenToken(value) {
  return FORBIDDEN_TOKEN_RE.test(String(value ?? ''));
}

function scrub(value) {
  const text = String(value ?? '');
  return hasForbiddenToken(text) ? '[redacted-forbidden-token]' : text;
}

function normalizeStatus(status) {
  const normalized = String(status ?? '').trim().toLowerCase();
  return normalized || 'missing';
}

function validateQuestion(row) {
  const status = normalizeStatus(row.answer_status);
  const required = row.required_for_promotion === 'yes';
  const ownerAnswer = String(row.owner_answer ?? '').trim();
  const evidenceReference = String(row.evidence_uri_or_path ?? '').trim();
  const evidenceHash = String(row.evidence_hash ?? '').trim();
  const answeredBy = String(row.answered_by ?? '').trim();
  const answeredAt = String(row.answered_at ?? '').trim();
  const blockers = [];

  if (!ALLOWED_ANSWER_STATUSES.has(status)) blockers.push('invalid-answer-status');
  if (required && status === 'missing') blockers.push('missing-required-answer');
  if (required && status === 'needs_owner_update') blockers.push('owner-update-required');
  if (required && ['not_applicable', 'rejected'].includes(status)) blockers.push('not-promotable-answer-status');

  if (status === 'answered') {
    if (!ownerAnswer) blockers.push('missing-owner-answer');
    if (!answeredBy) blockers.push('missing-answered-by');
    if (!isValidIsoDateOrDateTime(answeredAt)) blockers.push('invalid-answered-at');
    if (!evidenceReference) blockers.push('missing-evidence-reference');
    if (!evidenceHash) blockers.push('missing-evidence-hash');
    if (evidenceHash && !SHA256_RE.test(evidenceHash)) blockers.push('invalid-evidence-hash');
  }

  if (['not_applicable', 'rejected', 'needs_owner_update'].includes(status)) {
    if (!ownerAnswer) blockers.push('missing-owner-note');
    if (!answeredBy) blockers.push('missing-answered-by');
    if (!isValidIsoDateOrDateTime(answeredAt)) blockers.push('invalid-answered-at');
  }

  const forbiddenTokenDetected = [
    row.owner_answer,
    row.evidence_uri_or_path,
    row.evidence_hash,
    row.answered_by,
    row.validation_note,
  ].some(hasForbiddenToken);
  if (forbiddenTokenDetected) blockers.push('forbidden-token-detected');

  const hasReference = evidenceReference.length > 0;
  const hashValidationStatus = evidenceHash ? (SHA256_RE.test(evidenceHash) ? 'valid_sha256' : 'invalid_hash_shape') : 'missing_hash';
  const evidenceReferenceStatus = hasReference ? 'submitted_reference' : 'missing_reference';
  const isComplete = required ? status === 'answered' && blockers.length === 0 : blockers.length === 0;

  return {
    packet_id: row.packet_id,
    question_id: row.question_id,
    owner_lane: row.owner_lane,
    source_ids: row.source_ids,
    required_for_promotion: row.required_for_promotion,
    answer_status: status,
    owner_answer: scrub(row.owner_answer),
    evidence_uri_or_path: scrub(row.evidence_uri_or_path),
    evidence_hash: scrub(row.evidence_hash),
    answered_by: scrub(row.answered_by),
    answered_at: scrub(row.answered_at),
    validation_status: isComplete ? 'complete_for_manual_review' : 'blocked_owner_submission_incomplete',
    is_complete_for_manual_review: String(isComplete),
    hash_validation_status: hashValidationStatus,
    evidence_reference_status: evidenceReferenceStatus,
    forbidden_token_detected: String(forbiddenTokenDetected),
    blockers: blockers.join('|'),
    can_write_source_registry: 'false',
    can_update_page_display: 'false',
    can_export_as_fact_csv: 'false',
  };
}

function buildPacketValidation(packetRows, releaseGateRows, questionValidationRows) {
  const releaseGateByPacket = new Map(releaseGateRows.map((gate) => [gate.packet_id, gate]));

  return packetRows.map((packet) => {
    const gate = releaseGateByPacket.get(packet.packet_id);
    const packetQuestions = questionValidationRows.filter((question) => question.packet_id === packet.packet_id);
    const requiredQuestions = packetQuestions.filter((question) => question.required_for_promotion === 'yes');
    const answeredQuestions = requiredQuestions.filter((question) => question.answer_status === 'answered');
    const completeQuestions = requiredQuestions.filter((question) => question.is_complete_for_manual_review === 'true');
    const evidenceCount = requiredQuestions.filter((question) => question.evidence_reference_status === 'submitted_reference' && question.hash_validation_status === 'valid_sha256').length;
    const invalidHashCount = requiredQuestions.filter((question) => question.evidence_hash && question.hash_validation_status !== 'valid_sha256').length;
    const forbiddenTokenRowCount = requiredQuestions.filter((question) => question.forbidden_token_detected === 'true').length;
    const expectedRequiredCountText = String(gate?.required_question_count ?? '').trim();
    const expectedRequiredCount = /^[1-9]\d*$/.test(expectedRequiredCountText)
      ? Number(expectedRequiredCountText)
      : Number.NaN;
    const declaredRequiredCountText = String(packet.required_owner_answers ?? '').trim();
    const declaredRequiredCount = /^[1-9]\d*$/.test(declaredRequiredCountText)
      ? Number(declaredRequiredCountText)
      : Number.NaN;
    const uniqueQuestionIds = new Set(requiredQuestions.map((question) => question.question_id));
    const supportedQuestionIdsOnly = [...uniqueQuestionIds].every((questionId) =>
      REQUIRED_OWNER_QUESTION_IDS.includes(questionId),
    );
    const expectedQuestionIds =
      declaredRequiredCount === REQUIRED_OWNER_QUESTION_IDS.length ? REQUIRED_OWNER_QUESTION_IDS : ['Q2'];
    const requiredQuestionSetPresent = expectedQuestionIds.every((questionId) => uniqueQuestionIds.has(questionId));
    const gateMatchesPacket =
      Number.isInteger(expectedRequiredCount) &&
      Number.isSafeInteger(expectedRequiredCount) &&
      expectedRequiredCount > 0 &&
      Number.isInteger(declaredRequiredCount) &&
      Number.isSafeInteger(declaredRequiredCount) &&
      declaredRequiredCount > 0 &&
      expectedRequiredCount === declaredRequiredCount &&
      gate?.packet_id === packet.packet_id &&
      gate?.owner_lane === packet.owner_lane &&
      gate?.source_ids === packet.source_ids;
    const questionnaireShapeValid =
      gateMatchesPacket &&
      requiredQuestions.length === declaredRequiredCount &&
      uniqueQuestionIds.size === declaredRequiredCount &&
      supportedQuestionIdsOnly &&
      requiredQuestionSetPresent &&
      requiredQuestions.every(
        (question) =>
          question.owner_lane === packet.owner_lane &&
          question.source_ids === packet.source_ids,
      );
    const baselineMissingRequiredCount = Number.isInteger(declaredRequiredCount) && declaredRequiredCount > 0
      ? Math.max(declaredRequiredCount - completeQuestions.length, 0)
      : Math.max(requiredQuestions.length - completeQuestions.length, 1);
    const missingRequiredCount = questionnaireShapeValid
      ? baselineMissingRequiredCount
      : Math.max(baselineMissingRequiredCount, 1);
    const readyForManualReview = questionnaireShapeValid && missingRequiredCount === 0;

    return {
      release_gate_id: gate?.release_gate_id ?? `owner-intake-validation:${packet.packet_id}`,
      packet_id: packet.packet_id,
      owner_lane: packet.owner_lane,
      priority: packet.priority,
      source_ids: packet.source_ids,
      required_question_count: Number.isInteger(declaredRequiredCount) && declaredRequiredCount > 0
        ? declaredRequiredCount
        : requiredQuestions.length,
      answered_question_count: answeredQuestions.length,
      complete_required_question_count: completeQuestions.length,
      submitted_evidence_count: evidenceCount,
      invalid_hash_count: invalidHashCount,
      forbidden_token_row_count: forbiddenTokenRowCount,
      missing_required_questions: missingRequiredCount,
      packet_validation_status: readyForManualReview ? 'ready_for_manual_review' : 'blocked_owner_submission_incomplete',
      ready_for_manual_review: String(readyForManualReview),
      can_write_source_registry: 'false',
      can_update_page_display: 'false',
      can_export_as_fact_csv: 'false',
      blocking_reason: readyForManualReview
        ? 'owner answers are complete enough for manual release review; registry, display, and CSV fact promotion remain blocked'
        : 'required owner answers, evidence references, hashes, or answer metadata are incomplete',
      next_action: readyForManualReview
        ? 'manual release review must decide whether to bind reviewed evidence into source registry'
        : 'collect missing owner answers, evidence references, sha256 hashes, owner alias, and answer date',
    };
  });
}

function buildSourceValidation(sourceRows, packetValidationRows) {
  const packetById = new Map(packetValidationRows.map((packet) => [packet.packet_id, packet]));

  return sourceRows.map((source) => {
    const packet = packetById.get(source.packet_id);

    return {
      source_id: source.source_id,
      priority: source.priority,
      module: source.module,
      page: source.page,
      metric: source.metric,
      collection_method: source.collection_method,
      evidence_grade: source.evidence_grade,
      verification_status: source.verification_status,
      owner_lane: source.owner_lane,
      packet_id: source.packet_id,
      current_display_state: source.current_display_state,
      can_display_as_fact_current: source.can_display_as_fact_current,
      packet_validation_status: packet?.packet_validation_status ?? 'blocked_missing_packet_validation',
      ready_for_manual_review: packet?.ready_for_manual_review ?? 'false',
      can_write_source_registry: 'false',
      can_update_page_display: 'false',
      can_export_as_fact_csv: 'false',
      blocking_reason: packet?.blocking_reason ?? 'source row has no packet validation record',
    };
  });
}

function buildSummary({ intakeDir, outDir, sourceRows, packetRows, questionRows, questionValidationRows, packetValidationRows, sourceValidationRows }) {
  const requiredQuestions = questionRows.filter((question) => question.required_for_promotion === 'yes');
  const answeredQuestionCount = questionValidationRows.filter((question) => question.answer_status === 'answered').length;
  const completeRequiredQuestionCount = questionValidationRows.filter(
    (question) => question.required_for_promotion === 'yes' && question.is_complete_for_manual_review === 'true',
  ).length;
  const packetReadyForManualReviewCount = packetValidationRows.filter((packet) => packet.ready_for_manual_review === 'true').length;
  const sourceReadyForManualReviewCount = sourceValidationRows.filter((source) => source.ready_for_manual_review === 'true').length;
  const missingRequiredQuestionCount = packetValidationRows.reduce(
    (total, packet) => total + Number(packet.missing_required_questions),
    0,
  );

  return {
    generatedAt: new Date().toISOString(),
    intakeDir,
    outputDir: outDir,
    sourceGapCount: sourceRows.length,
    packetCount: packetRows.length,
    questionCount: questionRows.length,
    requiredQuestionCount: requiredQuestions.length,
    answeredQuestionCount,
    completeRequiredQuestionCount,
    missingRequiredQuestionCount,
    packetReadyForManualReviewCount,
    packetBlockedCount: packetRows.length - packetReadyForManualReviewCount,
    sourceReadyForManualReviewCount,
    sourceBlockedCount: sourceRows.length - sourceReadyForManualReviewCount,
    validationStatusCounts: countBy(packetValidationRows, (packet) => packet.packet_validation_status),
    questionValidationStatusCounts: countBy(questionValidationRows, (question) => question.validation_status),
    byPriority: countBy(sourceRows, (source) => source.priority),
    byCollectionMethod: countBy(sourceRows, (source) => source.collection_method),
    byOwnerLane: countBy(sourceRows, (source) => source.owner_lane),
    boundaries: {
      providerCalls: false,
      restrictedConnectorAccess: false,
      productionWrites: false,
      productionDeploy: false,
      factPromotion: false,
      sourceRegistryWrites: false,
      pageWrites: false,
      csvFactExport: false,
    },
  };
}

function buildRunbook(summary) {
  return `---\ntitle: mkt53 source gap owner intake validation ${dateSlug()}\nstatus: intake-validation-only\ncreated_at: ${summary.generatedAt}\nprovider_calls: false\nrestricted_connector_access: false\nproduction_writes: false\nfact_promotion: false\nsource_registry_writes: false\n---\n\n# mkt53 Source Gap Owner Intake Validation ${dateSlug()}\n\n## Boundary\n\n- providerCalls=false\n- restrictedConnectorAccess=false\n- productionWrites=false\n- productionDeploy=false\n- factPromotion=false\n- sourceRegistryWrites=false\n- pageWrites=false\n- csvFactExport=false\n\nThis validation checks only answer completeness, evidence reference presence, sha256 hash shape, owner alias, and answer date. It does not approve source registry binding, page fact display, CSV fact export, provider calls, restricted connector access, production writes, or deployment.\n\n## Summary\n\n- sourceGapCount=${summary.sourceGapCount}\n- packetCount=${summary.packetCount}\n- questionCount=${summary.questionCount}\n- requiredQuestionCount=${summary.requiredQuestionCount}\n- answeredQuestionCount=${summary.answeredQuestionCount}\n- completeRequiredQuestionCount=${summary.completeRequiredQuestionCount}\n- missingRequiredQuestionCount=${summary.missingRequiredQuestionCount}\n- packetReadyForManualReviewCount=${summary.packetReadyForManualReviewCount}\n- packetBlockedCount=${summary.packetBlockedCount}\n\n## Next Review Gate\n\n1. Fill or correct every blocked owner answer in the intake questionnaire.\n2. Re-run this validation command.\n3. For packets marked ready_for_manual_review, run a separate manual release review before changing source registry or page display data.\n4. After any later source registry binding, run data:audit and data:audit:deep again.\n`;
}

function buildManifest(summary) {
  return {
    generatedAt: summary.generatedAt,
    inputs: {
      intakeDir: summary.intakeDir,
    },
    outputs: {
      'owner_intake_validation_questionnaire.csv': {
        rowCount: summary.questionCount,
        headers: QUESTION_VALIDATION_FIELDS,
      },
      'owner_intake_validation_packet_gate.csv': {
        rowCount: summary.packetCount,
        headers: PACKET_VALIDATION_FIELDS,
      },
      'owner_intake_validation_source_matrix.csv': {
        rowCount: summary.sourceGapCount,
        headers: SOURCE_VALIDATION_FIELDS,
      },
      'owner_intake_validation_runbook.md': {
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
  const discoveredIntakeDir = options.intakeDir ?? findLatestIntake(appRoot);

  if (!discoveredIntakeDir) {
    throw new Error('No source-gap owner intake package found. Build owner intake first or pass --intake <dir>.');
  }

  const intakeDir = resolve(appRoot, discoveredIntakeDir);
  if (!existsSync(intakeDir) || !statSync(intakeDir).isDirectory()) {
    throw new Error(`Owner intake directory not found: ${intakeDir}`);
  }

  const questionRows = readRequiredCsv(intakeDir, 'owner_intake_questionnaire.csv', QUESTIONNAIRE_REQUIRED_COLUMNS);
  const packetRows = readRequiredCsv(intakeDir, 'owner_intake_packet_queue.csv', PACKET_QUEUE_REQUIRED_COLUMNS);
  const releaseGateRows = readRequiredCsv(intakeDir, 'owner_intake_release_gate.csv', RELEASE_GATE_REQUIRED_COLUMNS);
  const sourceRows = readRequiredCsv(intakeDir, 'owner_intake_source_matrix.csv', SOURCE_MATRIX_REQUIRED_COLUMNS);
  const questionValidationRows = questionRows.map(validateQuestion);
  const packetValidationRows = buildPacketValidation(packetRows, releaseGateRows, questionValidationRows);
  const sourceValidationRows = buildSourceValidation(sourceRows, packetValidationRows);
  const outDir = resolve(appRoot, options.outDir ?? `tmp/audits/source-gap-owner-intake-validation-${dateSlug()}`);
  const summary = buildSummary({
    intakeDir,
    outDir,
    sourceRows,
    packetRows,
    questionRows,
    questionValidationRows,
    packetValidationRows,
    sourceValidationRows,
  });
  const manifest = buildManifest(summary);

  if (!options.noWrite) {
    mkdirSync(outDir, { recursive: true });
    writeCsv(join(outDir, 'owner_intake_validation_questionnaire.csv'), questionValidationRows, QUESTION_VALIDATION_FIELDS);
    writeCsv(join(outDir, 'owner_intake_validation_packet_gate.csv'), packetValidationRows, PACKET_VALIDATION_FIELDS);
    writeCsv(join(outDir, 'owner_intake_validation_source_matrix.csv'), sourceValidationRows, SOURCE_VALIDATION_FIELDS);
    writeFileSync(join(outDir, 'owner_intake_validation_runbook.md'), buildRunbook(summary));
    writeFileSync(join(outDir, 'owner_intake_validation_summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(outDir, 'owner_intake_validation_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const payload = {
    summary,
    manifest,
    sampleQuestionValidation: questionValidationRows.slice(0, 6),
    samplePacketValidation: packetValidationRows.slice(0, 3),
    sampleSourceValidation: sourceValidationRows.slice(0, 6),
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write([
      'mkt53 source gap owner intake validation',
      `generatedAt=${summary.generatedAt}`,
      `intakeDir=${summary.intakeDir}`,
      `outputDir=${summary.outputDir}`,
      `sourceGapCount=${summary.sourceGapCount}`,
      `packetCount=${summary.packetCount}`,
      `questionCount=${summary.questionCount}`,
      `answeredQuestionCount=${summary.answeredQuestionCount}`,
      `missingRequiredQuestionCount=${summary.missingRequiredQuestionCount}`,
      `packetReadyForManualReviewCount=${summary.packetReadyForManualReviewCount}`,
      `packetBlockedCount=${summary.packetBlockedCount}`,
      `providerCalls=${summary.boundaries.providerCalls}`,
      `productionWrites=${summary.boundaries.productionWrites}`,
      `factPromotion=${summary.boundaries.factPromotion}`,
      `sourceRegistryWrites=${summary.boundaries.sourceRegistryWrites}`,
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
