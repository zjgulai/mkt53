#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

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

const QUESTIONNAIRE_FIELDS = QUESTIONNAIRE_REQUIRED_COLUMNS;
const PACKET_QUEUE_FIELDS = PACKET_QUEUE_REQUIRED_COLUMNS;
const RELEASE_GATE_FIELDS = RELEASE_GATE_REQUIRED_COLUMNS;
const SOURCE_MATRIX_FIELDS = SOURCE_MATRIX_REQUIRED_COLUMNS;
const REQUIRED_OWNER_QUESTION_IDS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'];
const OWNER_QUESTION_SPECS = {
  Q1: {
    question: 'Who is the owner alias and role accountable for this source packet?',
    expectedAnswerFormat: 'owner_alias / owner_role',
  },
  Q2: {
    question: 'What is the exact collection window, source system, and claim scope?',
    expectedAnswerFormat: 'YYYY-MM-DD..YYYY-MM-DD / system / scope text',
  },
  Q3: {
    question: 'Where is the read-only export, snapshot, or evidence file stored, and what is its hash?',
    expectedAnswerFormat: 'path or URI / sha256 or content hash',
  },
  Q4: {
    question: 'What field dictionary, row count or sample size, and metric definition should be used?',
    expectedAnswerFormat: 'field dictionary path / count / metric definition',
  },
  Q5: {
    question: 'Can the data be displayed as an internal fact, exported as CSV, both, or only kept as a gate?',
    expectedAnswerFormat: 'display yes/no + export yes/no + allowed scope',
  },
  Q6: {
    question: 'What limitations, forbidden interpretations, and refresh owner must stay attached?',
    expectedAnswerFormat: 'limitations / forbidden claims / refresh owner',
  },
};

const PREFILL_EVIDENCE_FIELDS = [
  'source_id',
  'evidence_source',
  'evidence_grade',
  'evidence_uri_or_path',
  'evidence_hash',
  'display_decision',
  'supported_claim',
  'blocked_claims',
  'next_action',
  'prefill_usable',
];

const CHAT_QUESTION_FIELDS = [
  'packet_id',
  'priority',
  'owner_lane',
  'source_ids',
  'pages',
  'missing_source_ids',
  'suggested_question_batch',
  'chat_prompt',
  'blocking_reason',
];

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    intakeDir: undefined,
    outDir: undefined,
    sourceCrossMatrix: undefined,
    dataPointMatrix: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--intake') options.intakeDir = argv[index + 1];
    if (argv[index] === '--out') options.outDir = argv[index + 1];
    if (argv[index] === '--source-cross-matrix') options.sourceCrossMatrix = argv[index + 1];
    if (argv[index] === '--data-point-matrix') options.dataPointMatrix = argv[index + 1];
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

function splitList(value) {
  return String(value ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
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

function readRequiredCsv(baseDir, filename, requiredColumns) {
  const path = join(baseDir, filename);
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Missing owner intake input: ${path}`);
  }
  return parseCsv(readFileSync(path, 'utf8'), requiredColumns);
}

function existingPathFromCandidates(appRoot, repoRoot, baseDir, value) {
  const candidates = String(value ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const paths = [
      resolve(baseDir, candidate),
      resolve(appRoot, candidate),
      resolve(repoRoot, candidate),
    ];
    const existing = paths.find((path) => existsSync(path) && statSync(path).isFile());
    if (existing) return existing;
  }

  return undefined;
}

function displayPath(repoRoot, path) {
  const absolute = resolve(path);
  const relative = absolute.startsWith(`${repoRoot}/`) ? absolute.slice(repoRoot.length + 1) : absolute;
  return relative;
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function loadSourceCrossEvidence({ appRoot, repoRoot, matrixPath }) {
  if (!matrixPath || !existsSync(matrixPath)) return [];
  const rows = parseCsv(readFileSync(matrixPath, 'utf8'), [
    'source_id',
    'source_name',
    'evidence_artifacts',
    'evidence_grade',
    'max_supported_claim',
    'blocked_claims',
    'display_decision',
    'next_action',
  ]);
  const baseDir = dirname(matrixPath);

  return rows
    .map((row) => {
      const evidencePath = existingPathFromCandidates(appRoot, repoRoot, baseDir, row.evidence_artifacts);
      const evidenceHash = evidencePath ? sha256File(evidencePath) : '';
      return {
        source_id: row.source_id,
        evidence_source: 'source_cross_validation_matrix',
        evidence_grade: row.evidence_grade,
        evidence_uri_or_path: evidencePath ? displayPath(repoRoot, evidencePath) : '',
        evidence_hash: evidenceHash,
        display_decision: row.display_decision,
        supported_claim: row.max_supported_claim,
        blocked_claims: row.blocked_claims,
        next_action: row.next_action,
        prefill_usable: String(Boolean(evidencePath && evidenceHash)),
      };
    })
    .filter((row) => row.source_id);
}

function loadDataPointEvidence({ appRoot, repoRoot, matrixPath }) {
  if (!matrixPath || !existsSync(matrixPath)) return [];
  const rows = parseCsv(readFileSync(matrixPath, 'utf8'), [
    'source_id',
    'final_source_name',
    'evidence_artifact_path',
    'artifact_sha256',
    'evidence_grade',
    'source_scope',
    'display_decision',
    'can_display_as_fact',
    'forbidden_use',
    'next_action',
  ]);
  const baseDir = dirname(matrixPath);
  const grouped = new Map();

  for (const row of rows) {
    if (!row.source_id || grouped.has(row.source_id)) continue;
    const evidencePath = existingPathFromCandidates(appRoot, repoRoot, baseDir, row.evidence_artifact_path);
    const evidenceHash = row.artifact_sha256 || (evidencePath ? sha256File(evidencePath) : '');
    grouped.set(row.source_id, {
      source_id: row.source_id,
      evidence_source: 'data_point_source_matrix',
      evidence_grade: row.evidence_grade,
      evidence_uri_or_path: evidencePath ? displayPath(repoRoot, evidencePath) : row.evidence_artifact_path,
      evidence_hash: evidenceHash,
      display_decision: row.display_decision,
      supported_claim: row.source_scope,
      blocked_claims: row.forbidden_use,
      next_action: row.next_action,
      prefill_usable: String(Boolean(evidenceHash && (evidencePath || row.evidence_artifact_path))),
    });
  }

  return [...grouped.values()];
}

function chooseEvidenceBySource(evidenceRows) {
  const bySource = new Map();
  for (const row of evidenceRows) {
    if (row.prefill_usable !== 'true') continue;
    const current = bySource.get(row.source_id);
    if (!current || current.evidence_source === 'source_cross_validation_matrix') {
      bySource.set(row.source_id, row);
    }
  }
  return bySource;
}

function packetEvidence(packet, evidenceBySource) {
  const sourceIds = splitList(packet.source_ids);
  const evidenceRows = sourceIds.map((sourceId) => evidenceBySource.get(sourceId)).filter(Boolean);
  const missingSourceIds = sourceIds.filter((sourceId) => !evidenceBySource.has(sourceId));
  return {
    sourceIds,
    evidenceRows,
    missingSourceIds,
    isComplete: sourceIds.length > 0 && missingSourceIds.length === 0,
  };
}

function buildAnswer(question, packet, packetEvidenceRows) {
  const sourceIds = splitList(packet.source_ids);
  const evidenceSummary = packetEvidenceRows
    .map((row) => `${row.source_id}:${row.evidence_uri_or_path}#sha256:${row.evidence_hash}`)
    .join('; ');
  const blockedClaims = packetEvidenceRows.map((row) => `${row.source_id}: ${row.blocked_claims}`).join(' | ');
  const evidencePaths = packetEvidenceRows.map((row) => row.evidence_uri_or_path).join('|');
  const evidenceHashes = `sha256:${createHash('sha256')
    .update(packetEvidenceRows.map((row) => `${row.source_id}:${row.evidence_hash}`).join('|'))
    .digest('hex')}`;

  if (question.question_id === 'Q1') {
    return {
      answer: `owner_lane=${packet.owner_lane}; suggested_review_owner=${packet.owner_lane}; prefill_actor=codex-local-evidence-prefill; manual_owner_confirmation_required=yes`,
      evidencePath: evidencePaths,
      evidenceHash: evidenceHashes,
    };
  }

  if (question.question_id === 'Q2') {
    return undefined;
  }

  if (question.question_id === 'Q3') {
    return {
      answer: evidenceSummary,
      evidencePath: evidencePaths,
      evidenceHash: evidenceHashes,
    };
  }

  if (question.question_id === 'Q4') {
    return {
      answer: `field_dictionary=source_cross_validation_matrix/data_point_source_matrix columns; source_count=${sourceIds.length}; metric_definition=${packet.pages} / ${packet.collection_methods} evidence packet scope`,
      evidencePath: evidencePaths,
      evidenceHash: evidenceHashes,
    };
  }

  if (question.question_id === 'Q5') {
    return {
      answer: 'display_decision=gate_or_labeled_public_context_only; export_decision=no_fact_csv_until_manual_release_review; allowed_scope=manual_review_input',
      evidencePath: evidencePaths,
      evidenceHash: evidenceHashes,
    };
  }

  return {
    answer: `limitations=${blockedClaims}; refresh_owner=${packet.owner_lane}; registry_write=blocked_by_manual_release_review; page_write=blocked_by_manual_release_review; csv_fact_export=blocked_by_manual_release_review`,
    evidencePath: evidencePaths,
    evidenceHash: evidenceHashes,
  };
}

function requiredQuestionCount(packet) {
  const declared = Number(String(packet.required_owner_answers ?? '').trim());
  return Number.isSafeInteger(declared) && declared > 0 ? declared : REQUIRED_OWNER_QUESTION_IDS.length;
}

function expectedQuestionIds(packet) {
  const count = requiredQuestionCount(packet);
  if (count === 1) return ['Q2'];
  return REQUIRED_OWNER_QUESTION_IDS.slice(0, Math.min(count, REQUIRED_OWNER_QUESTION_IDS.length));
}

function completeQuestionnaireRows(packetRows, questionnaireRows) {
  const completedRows = [...questionnaireRows];
  const existingKeys = new Set(questionnaireRows.map((row) => `${row.packet_id}:${row.question_id}`));

  for (const packet of packetRows) {
    for (const questionId of expectedQuestionIds(packet)) {
      const key = `${packet.packet_id}:${questionId}`;
      if (existingKeys.has(key)) continue;
      const spec = OWNER_QUESTION_SPECS[questionId];
      completedRows.push({
        packet_id: packet.packet_id,
        question_id: questionId,
        owner_lane: packet.owner_lane,
        source_ids: packet.source_ids,
        question: spec.question,
        expected_answer_format: spec.expectedAnswerFormat,
        required_for_promotion: 'yes',
        answer_status: 'missing',
        owner_answer: '',
        evidence_uri_or_path: '',
        evidence_hash: '',
        answered_by: '',
        answered_at: '',
        validation_note: 'Questionnaire row restored from the standard owner-intake contract; owner answer and evidence are still required.',
      });
      existingKeys.add(key);
    }
  }

  return completedRows;
}

function packetQuestionState(packet, questionnaireRows) {
  const expectedCount = requiredQuestionCount(packet);
  const requiredRows = questionnaireRows.filter(
    (row) => row.packet_id === packet.packet_id && row.required_for_promotion === 'yes',
  );
  const questionIds = new Set(requiredRows.map((row) => row.question_id));
  const expectedQuestionIds =
    expectedCount === REQUIRED_OWNER_QUESTION_IDS.length ? REQUIRED_OWNER_QUESTION_IDS : ['Q2'];
  const structurallyMissingQuestionIds = expectedQuestionIds.filter((questionId) => !questionIds.has(questionId));
  const unansweredQuestionIds = requiredRows
    .filter((row) => row.answer_status !== 'answered')
    .map((row) => row.question_id);
  const missingQuestionIds = [...new Set([...structurallyMissingQuestionIds, ...unansweredQuestionIds])];
  const shapeValid =
    requiredRows.length === expectedCount &&
    questionIds.size === expectedCount &&
    structurallyMissingQuestionIds.length === 0;
  const answeredCount = requiredRows.filter((row) => row.answer_status === 'answered').length;

  return {
    expectedCount,
    answeredCount,
    structurallyMissingQuestionIds,
    missingQuestionIds,
    ready: shapeValid && answeredCount === expectedCount,
  };
}

function buildPrefill({ questionnaireRows, packetRows, evidenceBySource }) {
  const packetById = new Map(packetRows.map((packet) => [packet.packet_id, packet]));
  const packetPrefill = new Map(
    packetRows.map((packet) => {
      const evidence = packetEvidence(packet, evidenceBySource);
      return [packet.packet_id, evidence];
    }),
  );

  const completeQuestionnaire = completeQuestionnaireRows(packetRows, questionnaireRows);
  const nextQuestionnaire = completeQuestionnaire.map((question) => {
    const packet = packetById.get(question.packet_id);
    const evidence = packetPrefill.get(question.packet_id);
    if (!packet || !evidence?.isComplete) return question;

    const answer = buildAnswer(question, packet, evidence.evidenceRows);
    if (!answer) return question;
    return {
      ...question,
      answer_status: 'answered',
      owner_answer: answer.answer,
      evidence_uri_or_path: answer.evidencePath,
      evidence_hash: answer.evidenceHash,
      answered_by: 'codex-local-evidence-prefill',
      answered_at: dateSlug().replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'),
      validation_note: 'Autofilled from local evidence artifacts for manual review intake only; release promotion remains separately gated.',
    };
  });

  const questionStateByPacket = new Map(
    packetRows.map((packet) => [packet.packet_id, packetQuestionState(packet, nextQuestionnaire)]),
  );

  const nextPacketRows = packetRows.map((packet) => {
    const state = questionStateByPacket.get(packet.packet_id);
    return {
      ...packet,
      intake_status: state.ready ? 'prefilled_ready_for_validator' : 'awaiting_owner_submission',
      submitted_owner_answers: state.answeredCount,
      required_owner_answers: state.expectedCount,
      ready_for_registry_binding: 'false',
      ready_for_fact_display: 'false',
      ready_for_csv_export: 'false',
    };
  });

  const nextReleaseGateRows = packetRows.map((packet) => {
    const evidence = packetPrefill.get(packet.packet_id);
    const state = questionStateByPacket.get(packet.packet_id);
    return {
      release_gate_id: `owner-intake-prefill:${packet.packet_id}`,
      packet_id: packet.packet_id,
      owner_lane: packet.owner_lane,
      priority: packet.priority,
      source_ids: packet.source_ids,
      required_question_count: state.expectedCount,
      submitted_question_count: state.answeredCount,
      submitted_evidence_count: state.ready ? evidence.evidenceRows.length : 0,
      missing_required_questions: Math.max(
        state.expectedCount - state.answeredCount,
        state.missingQuestionIds.length,
      ),
      gate_status: state.ready ? 'prefilled_ready_for_validation' : 'blocked_owner_submission_required',
      can_write_source_registry: 'false',
      can_update_page_display: 'false',
      can_export_as_fact_csv: 'false',
      blocking_reason: state.ready
        ? 'local evidence prefill is complete enough for validator and manual review; release writes remain gated'
        : state.structurallyMissingQuestionIds.length > 0
          ? `questionnaire rows missing for question_ids=${state.structurallyMissingQuestionIds.join('|')}`
          : `missing evidence or owner answers for source_ids=${evidence?.missingSourceIds.join('|') || packet.source_ids}`,
      next_command_after_owner_submission: 'npm run data:source-gaps:owner-intake:validate -- --intake <prefill_dir>',
    };
  });

  const chatQuestions = packetRows
    .map((packet) => {
      const evidence = packetPrefill.get(packet.packet_id);
      const state = questionStateByPacket.get(packet.packet_id);
      const missingQuestionIds = state.missingQuestionIds;
      if (missingQuestionIds.length === 0) return undefined;
      const requestedQuestionDetails = missingQuestionIds
        .map((questionId) => {
          const spec = OWNER_QUESTION_SPECS[questionId];
          return `${questionId}: ${spec.question} (format: ${spec.expectedAnswerFormat})`;
        })
        .join('; ');
      return {
        packet_id: packet.packet_id,
        priority: packet.priority,
        owner_lane: packet.owner_lane,
        source_ids: packet.source_ids,
        pages: packet.pages,
        missing_source_ids: evidence?.missingSourceIds.join('|') ?? packet.source_ids,
        suggested_question_batch: missingQuestionIds.join('|'),
        chat_prompt: `请按 ${packet.packet_id} 仅回答以下缺失问题：${requestedQuestionDetails}`,
        blocking_reason: state.structurallyMissingQuestionIds.length > 0
          ? 'one or more required questionnaire rows are missing and must be created before validation'
          : evidence?.missingSourceIds.length
          ? 'source-level evidence artifact is missing for at least one source_id'
          : 'one or more owner-required questions cannot be derived from local evidence',
      };
    })
    .filter(Boolean);

  return { nextQuestionnaire, nextPacketRows, nextReleaseGateRows, chatQuestions, packetPrefill };
}

function buildRunbook(summary) {
  return `---\ntitle: mkt53 source gap owner intake prefill ${dateSlug()}\nstatus: local-prefill-only\ncreated_at: ${summary.generatedAt}\nprovider_calls: false\nrestricted_connector_access: false\nproduction_writes: false\nfact_promotion: false\nsource_registry_writes: false\n---\n\n# mkt53 Source Gap Owner Intake Prefill ${dateSlug()}\n\n## Boundary\n\n- current_scope=local_prefill_only\n- providerCalls=false\n- restrictedConnectorAccess=false\n- productionWrites=false\n- productionDeploy=false\n- factPromotion=false\n- sourceRegistryWrites=false\n- pageWrites=false\n- csvFactExport=false\n\nThis package only copies locally matched evidence into an owner-intake-compatible questionnaire. It is not owner approval, release approval, page update, CSV fact export approval, or production deployment.\n\n## Summary\n\n- sourceGapCount=${summary.sourceGapCount}\n- packetCount=${summary.packetCount}\n- questionCount=${summary.questionCount}\n- prefilledQuestionCount=${summary.prefilledQuestionCount}\n- prefilledReadyPacketCount=${summary.prefilledReadyPacketCount}\n- chatQuestionPacketCount=${summary.chatQuestionPacketCount}\n\n## Next Commands\n\n1. npm run data:source-gaps:owner-intake:validate -- --intake ${summary.relativeOutputDir} --out tmp/audits/source-gap-owner-intake-prefill-validation-${dateSlug()}\n2. Use owner_intake_prefill_chat_questions.csv for remaining chat-based owner answers.\n3. Keep manual release review separate from validator readiness.\n`;
}

function buildSummary({ appRoot, outDir, sourceRows, packetRows, questionnaireRows, nextQuestionnaire, nextPacketRows, evidenceRows, chatQuestions }) {
  const prefilledQuestionCount = nextQuestionnaire.filter((row) => row.answer_status === 'answered').length;
  const prefilledReadyPacketCount = nextPacketRows.filter(
    (packet) => packet.intake_status === 'prefilled_ready_for_validator',
  ).length;
  return {
    generatedAt: new Date().toISOString(),
    outputDir: outDir,
    relativeOutputDir: outDir.startsWith(`${appRoot}/`) ? outDir.slice(appRoot.length + 1) : outDir,
    sourceGapCount: sourceRows.length,
    packetCount: packetRows.length,
    questionCount: nextQuestionnaire.length,
    evidenceIndexRowCount: evidenceRows.length,
    usableEvidenceRowCount: evidenceRows.filter((row) => row.prefill_usable === 'true').length,
    prefilledQuestionCount,
    prefilledReadyPacketCount,
    packetStillAwaitingOwnerCount: packetRows.length - prefilledReadyPacketCount,
    chatQuestionPacketCount: chatQuestions.length,
    byOwnerLane: countBy(packetRows, (packet) => packet.owner_lane),
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

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const appRoot = process.cwd();
  const repoRoot = resolve(appRoot, '..');
  const intakeDir = resolve(appRoot, options.intakeDir ?? findLatestIntake(appRoot) ?? '');
  if (!intakeDir || !existsSync(intakeDir)) {
    throw new Error('No source-gap owner intake package found. Build owner intake first or pass --intake <dir>.');
  }

  const sourceCrossMatrix = resolve(
    appRoot,
    options.sourceCrossMatrix ?? 'tmp/audits/source-cross-validation-20260624-batch12-public/source_cross_validation_matrix.csv',
  );
  const dataPointMatrix = resolve(
    appRoot,
    options.dataPointMatrix ?? 'tmp/audits/source-cross-validation-20260624-batch13-data-point-sources/data_point_source_matrix.csv',
  );
  const outDir = resolve(appRoot, options.outDir ?? `tmp/audits/source-gap-owner-intake-prefill-${dateSlug()}`);

  const sourceRows = readRequiredCsv(intakeDir, 'owner_intake_source_matrix.csv', SOURCE_MATRIX_REQUIRED_COLUMNS);
  const packetRows = readRequiredCsv(intakeDir, 'owner_intake_packet_queue.csv', PACKET_QUEUE_REQUIRED_COLUMNS);
  const questionnaireRows = readRequiredCsv(intakeDir, 'owner_intake_questionnaire.csv', QUESTIONNAIRE_REQUIRED_COLUMNS);
  const releaseGateRows = readRequiredCsv(intakeDir, 'owner_intake_release_gate.csv', RELEASE_GATE_REQUIRED_COLUMNS);
  const evidenceRows = [
    ...loadSourceCrossEvidence({ appRoot, repoRoot, matrixPath: sourceCrossMatrix }),
    ...loadDataPointEvidence({ appRoot, repoRoot, matrixPath: dataPointMatrix }),
  ];
  const evidenceBySource = chooseEvidenceBySource(evidenceRows);
  const { nextQuestionnaire, nextPacketRows, nextReleaseGateRows, chatQuestions } = buildPrefill({
    questionnaireRows,
    packetRows,
    evidenceBySource,
  });
  const summary = buildSummary({
    appRoot,
    outDir,
    sourceRows,
    packetRows,
    questionnaireRows,
    nextQuestionnaire,
    nextPacketRows,
    evidenceRows,
    chatQuestions,
  });
  const manifest = {
    generatedAt: summary.generatedAt,
    inputs: {
      intakeDir,
      sourceCrossMatrix,
      dataPointMatrix,
    },
    outputs: {
      'owner_intake_questionnaire.csv': { rowCount: nextQuestionnaire.length, headers: QUESTIONNAIRE_FIELDS },
      'owner_intake_packet_queue.csv': { rowCount: nextPacketRows.length, headers: PACKET_QUEUE_FIELDS },
      'owner_intake_release_gate.csv': { rowCount: nextReleaseGateRows.length, headers: RELEASE_GATE_FIELDS },
      'owner_intake_source_matrix.csv': { rowCount: sourceRows.length, headers: SOURCE_MATRIX_FIELDS },
      'owner_intake_prefill_evidence_index.csv': { rowCount: evidenceRows.length, headers: PREFILL_EVIDENCE_FIELDS },
      'owner_intake_prefill_chat_questions.csv': { rowCount: chatQuestions.length, headers: CHAT_QUESTION_FIELDS },
    },
    boundaries: summary.boundaries,
  };

  if (!options.noWrite) {
    mkdirSync(outDir, { recursive: true });
    writeCsv(join(outDir, 'owner_intake_questionnaire.csv'), nextQuestionnaire, QUESTIONNAIRE_FIELDS);
    writeCsv(join(outDir, 'owner_intake_packet_queue.csv'), nextPacketRows, PACKET_QUEUE_FIELDS);
    writeCsv(join(outDir, 'owner_intake_release_gate.csv'), nextReleaseGateRows, RELEASE_GATE_FIELDS);
    writeCsv(join(outDir, 'owner_intake_source_matrix.csv'), sourceRows, SOURCE_MATRIX_FIELDS);
    writeCsv(join(outDir, 'owner_intake_prefill_evidence_index.csv'), evidenceRows, PREFILL_EVIDENCE_FIELDS);
    writeCsv(join(outDir, 'owner_intake_prefill_chat_questions.csv'), chatQuestions, CHAT_QUESTION_FIELDS);
    writeFileSync(join(outDir, 'owner_intake_prefill_runbook.md'), buildRunbook(summary));
    writeFileSync(join(outDir, 'owner_intake_prefill_summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(outDir, 'owner_intake_prefill_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const payload = {
    summary,
    manifest,
    readyPackets: nextPacketRows.filter((packet) => packet.intake_status === 'prefilled_ready_for_validator'),
    chatQuestions: chatQuestions.slice(0, 12),
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write([
      'mkt53 source gap owner intake prefill',
      `generatedAt=${summary.generatedAt}`,
      `outputDir=${summary.outputDir}`,
      `sourceGapCount=${summary.sourceGapCount}`,
      `packetCount=${summary.packetCount}`,
      `questionCount=${summary.questionCount}`,
      `prefilledQuestionCount=${summary.prefilledQuestionCount}`,
      `prefilledReadyPacketCount=${summary.prefilledReadyPacketCount}`,
      `chatQuestionPacketCount=${summary.chatQuestionPacketCount}`,
      `providerCalls=${summary.boundaries.providerCalls}`,
      `productionWrites=${summary.boundaries.productionWrites}`,
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
