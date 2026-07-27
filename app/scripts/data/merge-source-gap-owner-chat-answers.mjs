#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
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

const CHAT_PACKET_REQUIRED_COLUMNS = [
  'batch_id',
  'packet_id',
  'priority',
  'owner_lane',
  'source_ids',
  'pages',
  'missing_source_ids',
  'suggested_question_batch',
  'blocking_reason',
  'question_count',
  'answer_status',
  'merge_target',
];

const CHAT_QUESTION_REQUIRED_COLUMNS = [
  'batch_id',
  'packet_id',
  'question_id',
  'priority',
  'owner_lane',
  'source_ids',
  'pages',
  'prompt',
  'expected_answer_format',
  'response_key',
  'required_for_manual_review',
];

const FORBIDDEN_TOKEN_RE = /password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i;
const SHA256_RE = /^(?:sha256:)?[a-f0-9]{64}$/i;

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    intakeDir: undefined,
    chatPackDir: undefined,
    answersPath: undefined,
    outDir: undefined,
    batchId: 'owner-chat-batch-01-p0',
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--intake') options.intakeDir = argv[index + 1];
    if (argv[index] === '--chat-pack') options.chatPackDir = argv[index + 1];
    if (argv[index] === '--answers') options.answersPath = argv[index + 1];
    if (argv[index] === '--out') options.outDir = argv[index + 1];
    if (argv[index] === '--batch-id') options.batchId = argv[index + 1];
  }

  if (!options.batchId || !/^owner-chat-batch-\d{2}-p\d$/i.test(options.batchId)) {
    throw new Error('--batch-id must look like owner-chat-batch-01-p0');
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

function isoNow() {
  return new Date().toISOString();
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
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function splitList(value) {
  return String(value ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function findLatestDir(appRoot, prefix, requiredFile) {
  const auditRoot = join(appRoot, 'tmp/audits');
  if (!existsSync(auditRoot)) return undefined;

  const candidates = readdirSync(auditRoot)
    .filter((name) => name.startsWith(prefix))
    .map((name) => join(auditRoot, name))
    .filter((path) => existsSync(join(path, requiredFile)) && statSync(join(path, requiredFile)).isFile())
    .map((path) => ({ path, mtimeMs: statSync(join(path, requiredFile)).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.path;
}

function readCsvFile(baseDir, filename, requiredColumns) {
  const path = join(baseDir, filename);
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Missing required input: ${path}`);
  }
  return parseCsv(readFileSync(path, 'utf8'), requiredColumns);
}

function hasForbiddenToken(value) {
  return FORBIDDEN_TOKEN_RE.test(String(value ?? ''));
}

function safeTrim(value) {
  return String(value ?? '').trim();
}

function evidenceValue(packet, questionId, fieldNames) {
  const questionEvidence = packet.questionEvidence?.[questionId] ?? packet.evidenceByQuestion?.[questionId] ?? {};
  for (const field of fieldNames) {
    const questionValue = safeTrim(questionEvidence[field]);
    if (questionValue) return questionValue;
  }
  const packetEvidence = packet.evidence ?? {};
  for (const field of fieldNames) {
    const packetValue = safeTrim(packet[field]) || safeTrim(packetEvidence[field]);
    if (packetValue) return packetValue;
  }
  return '';
}

function flattenAnswerSubmission(raw, batchId) {
  const rootDefaults = {
    answered_by: safeTrim(raw.answered_by) || safeTrim(raw.answeredBy),
    answered_at: safeTrim(raw.answered_at) || safeTrim(raw.answeredAt),
  };

  if (Array.isArray(raw.answerBatches)) {
    return raw.answerBatches
      .filter((batch) => !batchId || batch.batch_id === batchId || batch.batchId === batchId)
      .flatMap((batch) =>
        (batch.packets ?? []).map((packet) => ({
          ...packet,
          batch_id: batch.batch_id ?? batch.batchId,
          answered_by: safeTrim(packet.answered_by) || safeTrim(packet.answeredBy) || rootDefaults.answered_by,
          answered_at: safeTrim(packet.answered_at) || safeTrim(packet.answeredAt) || rootDefaults.answered_at,
        })),
      );
  }

  if (Array.isArray(raw.packets)) {
    return raw.packets.map((packet) => ({
      ...packet,
      batch_id: raw.batch_id ?? raw.batchId ?? batchId,
      answered_by: safeTrim(packet.answered_by) || safeTrim(packet.answeredBy) || rootDefaults.answered_by,
      answered_at: safeTrim(packet.answered_at) || safeTrim(packet.answeredAt) || rootDefaults.answered_at,
    }));
  }

  return [];
}

function buildAnswerMap(answerPackets, selectedPacketIds) {
  const answers = new Map();

  for (const packet of answerPackets) {
    const packetId = safeTrim(packet.packet_id) || safeTrim(packet.packetId);
    if (!packetId || !selectedPacketIds.has(packetId)) continue;

    const fieldsToInspect = [
      packetId,
      packet.answered_by,
      packet.answered_at,
      packet.evidence_uri_or_path,
      packet.evidenceUriOrPath,
      packet.evidence_hash,
      packet.evidenceHash,
      packet.answers ? JSON.stringify(packet.answers) : '',
    ];
    if (fieldsToInspect.some(hasForbiddenToken)) {
      throw new Error(`Forbidden token detected in submitted answers for packet_id=${packetId}`);
    }

    answers.set(packetId, {
      packet_id: packetId,
      answers: packet.answers ?? {},
      answered_by: safeTrim(packet.answered_by) || safeTrim(packet.answeredBy),
      answered_at: safeTrim(packet.answered_at) || safeTrim(packet.answeredAt),
      evidence_uri_or_path: evidenceValue(packet, undefined, ['evidence_uri_or_path', 'evidenceUriOrPath', 'uri', 'path']),
      evidence_hash: evidenceValue(packet, undefined, ['evidence_hash', 'evidenceHash', 'sha256', 'hash']),
      raw: packet,
    });
  }

  return answers;
}

function answerForQuestion(packetAnswer, questionId) {
  const value = safeTrim(packetAnswer?.answers?.[questionId]);
  if (!value) return undefined;

  const raw = packetAnswer.raw ?? {};
  return {
    owner_answer: value,
    evidence_uri_or_path:
      evidenceValue(raw, questionId, ['evidence_uri_or_path', 'evidenceUriOrPath', 'uri', 'path']) ||
      packetAnswer.evidence_uri_or_path,
    evidence_hash:
      evidenceValue(raw, questionId, ['evidence_hash', 'evidenceHash', 'sha256', 'hash']) || packetAnswer.evidence_hash,
    answered_by: packetAnswer.answered_by,
    answered_at: packetAnswer.answered_at,
  };
}

function statusForSubmittedAnswer(answer) {
  if (!answer) return 'missing';
  if (
    answer.owner_answer &&
    answer.evidence_uri_or_path &&
    answer.evidence_hash &&
    SHA256_RE.test(answer.evidence_hash) &&
    answer.answered_by &&
    isValidIsoDateOrDateTime(answer.answered_at)
  ) {
    return 'answered';
  }
  return 'needs_owner_update';
}

function buildSkeleton(batchId, chatPackets, chatQuestions) {
  return {
    schemaVersion: 1,
    batchId,
    answeredBy: '',
    answeredAt: '',
    packets: chatPackets.map((packet) => ({
      packet_id: packet.packet_id,
      priority: packet.priority,
      owner_lane: packet.owner_lane,
      source_ids: packet.source_ids,
      pages: packet.pages,
      evidence_uri_or_path: '',
      evidence_hash: '',
      answers: Object.fromEntries(
        chatQuestions
          .filter((question) => question.packet_id === packet.packet_id)
          .map((question) => [question.question_id, '']),
      ),
    })),
  };
}

function buildSkeletonMarkdown(batchId, chatPackets, chatQuestions) {
  const lines = [
    '---',
    `title: mkt53 ${batchId} owner answer skeleton ${dateSlug()}`,
    'status: local-answer-skeleton',
    `created_at: ${isoNow()}`,
    'provider_calls: false',
    'production_writes: false',
    'source_registry_writes: false',
    'page_writes: false',
    'csv_fact_export: false',
    '---',
    '',
    `# mkt53 ${batchId} Owner Answer Skeleton`,
    '',
    '## Boundary',
    '',
    '- providerCalls=false',
    '- restrictedConnectorAccess=false',
    '- productionWrites=false',
    '- productionDeploy=false',
    '- factPromotion=false',
    '- sourceRegistryWrites=false',
    '- pageWrites=false',
    '- csvFactExport=false',
    '',
    'Fill every Q1-Q6 plus evidence_uri_or_path, evidence_hash, answered_by, and answered_at before running the merge as a readiness candidate.',
    '',
  ];

  for (const packet of chatPackets) {
    lines.push(`## ${packet.packet_id}`);
    lines.push('');
    lines.push(`- owner_lane=${packet.owner_lane}`);
    lines.push(`- source_ids=${packet.source_ids}`);
    lines.push(`- pages=${packet.pages}`);
    lines.push(`- blocking_reason=${packet.blocking_reason}`);
    lines.push('');
    lines.push('```text');
    lines.push(`packet_id: ${packet.packet_id}`);
    lines.push('evidence_uri_or_path: ');
    lines.push('evidence_hash: ');
    lines.push('answered_by: ');
    lines.push('answered_at: ');
    for (const question of chatQuestions.filter((candidate) => candidate.packet_id === packet.packet_id)) {
      lines.push(`${question.question_id}: ${question.prompt}`);
    }
    lines.push('```');
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function mergeQuestionnaire(questionRows, selectedPacketIds, answerMap) {
  let selectedQuestionCount = 0;
  let mergedQuestionCount = 0;
  let missingQuestionCount = 0;
  let needsUpdateQuestionCount = 0;

  const mergedRows = questionRows.map((row) => {
    if (!selectedPacketIds.has(row.packet_id)) return row;

    selectedQuestionCount += 1;
    const submitted = answerForQuestion(answerMap.get(row.packet_id), row.question_id);
    const status = statusForSubmittedAnswer(submitted);

    if (status === 'missing') {
      missingQuestionCount += 1;
      return row;
    }

    if (status === 'needs_owner_update') needsUpdateQuestionCount += 1;
    if (status === 'answered') mergedQuestionCount += 1;

    return {
      ...row,
      answer_status: status,
      owner_answer: submitted.owner_answer,
      evidence_uri_or_path: submitted.evidence_uri_or_path,
      evidence_hash: submitted.evidence_hash,
      answered_by: submitted.answered_by,
      answered_at: submitted.answered_at,
      validation_note:
        status === 'answered'
          ? `merged from owner chat answer batch ${row.packet_id}.${row.question_id}; pending validator and manual release review`
          : 'owner answer was submitted but required evidence metadata is incomplete',
    };
  });

  return { mergedRows, selectedQuestionCount, mergedQuestionCount, missingQuestionCount, needsUpdateQuestionCount };
}

function updatePacketRows(packetRows, selectedPacketIds, mergedQuestionRows) {
  return packetRows.map((packet) => {
    if (!selectedPacketIds.has(packet.packet_id)) return packet;

    const questions = mergedQuestionRows.filter((question) => question.packet_id === packet.packet_id && question.required_for_promotion === 'yes');
    const submitted = questions.filter((question) => question.answer_status === 'answered').length;
    const pending = Math.max(questions.length - submitted, 0);

    return {
      ...packet,
      intake_status: pending === 0 ? 'chat_answers_merged_pending_validator' : 'awaiting_owner_submission',
      submitted_owner_answers: submitted,
      required_owner_answers: questions.length,
      ready_for_registry_binding: 'false',
      ready_for_fact_display: 'false',
      ready_for_csv_export: 'false',
    };
  });
}

function updateReleaseGateRows(releaseGateRows, selectedPacketIds, mergedQuestionRows) {
  return releaseGateRows.map((gate) => {
    if (!selectedPacketIds.has(gate.packet_id)) return gate;

    const questions = mergedQuestionRows.filter((question) => question.packet_id === gate.packet_id && question.required_for_promotion === 'yes');
    const submitted = questions.filter((question) => question.answer_status === 'answered').length;
    const evidence = questions.filter((question) => question.evidence_uri_or_path && SHA256_RE.test(question.evidence_hash)).length;
    const missing = Math.max(questions.length - submitted, 0);

    return {
      ...gate,
      required_question_count: questions.length,
      submitted_question_count: submitted,
      submitted_evidence_count: evidence,
      missing_required_questions: missing,
      gate_status: missing === 0 ? 'chat_answers_merged_pending_validator' : 'blocked_owner_submission_required',
      can_write_source_registry: 'false',
      can_update_page_display: 'false',
      can_export_as_fact_csv: 'false',
      blocking_reason:
        missing === 0
          ? 'chat answers merged; validator and manual release review still required before any registry or page update'
          : 'missing or incomplete owner chat answers remain for this packet',
      next_command_after_owner_submission:
        'npm run data:source-gaps:owner-intake:validate -- --intake <merged_chat_intake_dir>',
    };
  });
}

function updateSourceRows(sourceRows, selectedPacketIds, mergedPacketRows) {
  const packetById = new Map(mergedPacketRows.map((packet) => [packet.packet_id, packet]));

  return sourceRows.map((source) => {
    if (!selectedPacketIds.has(source.packet_id)) return source;

    const packet = packetById.get(source.packet_id);
    return {
      ...source,
      intake_status: packet?.intake_status ?? source.intake_status,
      promotion_state: 'blocked_until_owner_evidence_validated',
    };
  });
}

function buildSummary({
  generatedAt,
  appRoot,
  outDir,
  intakeDir,
  chatPackDir,
  answersPath,
  batchId,
  chatPackets,
  chatQuestions,
  mergeStats,
  answerMap,
}) {
  const packetIds = chatPackets.map((packet) => packet.packet_id);
  const sourceIds = unique(chatPackets.flatMap((packet) => splitList(packet.source_ids)));
  const answerPacketCount = packetIds.filter((packetId) => answerMap.has(packetId)).length;

  return {
    generatedAt,
    batchId,
    intakeDir,
    chatPackDir,
    answersPath,
    relativeOutputDir: outDir.startsWith(appRoot) ? outDir.slice(appRoot.length + 1) : outDir,
    packetCount: chatPackets.length,
    sourceCount: sourceIds.length,
    questionCount: chatQuestions.length,
    answerPacketCount,
    selectedQuestionCount: mergeStats.selectedQuestionCount,
    mergedQuestionCount: mergeStats.mergedQuestionCount,
    missingQuestionCount: mergeStats.missingQuestionCount,
    needsUpdateQuestionCount: mergeStats.needsUpdateQuestionCount,
    readyCandidatePacketCount: chatPackets.filter((packet) => {
      const questions = chatQuestions.filter((question) => question.packet_id === packet.packet_id);
      return questions.every((question) => {
        const submitted = answerForQuestion(answerMap.get(packet.packet_id), question.question_id);
        return statusForSubmittedAnswer(submitted) === 'answered';
      });
    }).length,
    boundaries: {
      providerCalls: false,
      restrictedConnectorAccess: false,
      productionWrites: false,
      productionDeploy: false,
      factPromotion: false,
      sourceRegistryWrites: false,
      pageWrites: false,
      csvFactExport: false,
      manualReleaseReview: false,
    },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const appRoot = resolve(process.cwd());
  const intakeDir = resolve(
    appRoot,
    options.intakeDir ?? findLatestDir(appRoot, 'source-gap-owner-intake-prefill-', 'owner_intake_questionnaire.csv') ?? '',
  );
  const chatPackDir = resolve(
    appRoot,
    options.chatPackDir ?? findLatestDir(appRoot, 'source-gap-owner-chat-intake-pack-', 'owner_chat_intake_packets.csv') ?? '',
  );

  if (!intakeDir || !existsSync(join(intakeDir, 'owner_intake_questionnaire.csv'))) {
    throw new Error('Missing intake input. Pass --intake tmp/audits/source-gap-owner-intake-prefill-YYYYMMDD');
  }
  if (!chatPackDir || !existsSync(join(chatPackDir, 'owner_chat_intake_packets.csv'))) {
    throw new Error('Missing chat pack input. Pass --chat-pack tmp/audits/source-gap-owner-chat-intake-pack-YYYYMMDD');
  }

  const outDir = resolve(
    appRoot,
    options.outDir ?? `tmp/audits/source-gap-owner-chat-merged-${dateSlug()}-${options.batchId}`,
  );
  const defaultAnswersPath = join(chatPackDir, 'owner_chat_answer_template.json');
  const answersPath = resolve(appRoot, options.answersPath ?? defaultAnswersPath);

  const questionnaireRows = readCsvFile(intakeDir, 'owner_intake_questionnaire.csv', QUESTIONNAIRE_REQUIRED_COLUMNS);
  const packetRows = readCsvFile(intakeDir, 'owner_intake_packet_queue.csv', PACKET_QUEUE_REQUIRED_COLUMNS);
  const releaseGateRows = readCsvFile(intakeDir, 'owner_intake_release_gate.csv', RELEASE_GATE_REQUIRED_COLUMNS);
  const sourceRows = readCsvFile(intakeDir, 'owner_intake_source_matrix.csv', SOURCE_MATRIX_REQUIRED_COLUMNS);
  const chatPackets = readCsvFile(chatPackDir, 'owner_chat_intake_packets.csv', CHAT_PACKET_REQUIRED_COLUMNS).filter(
    (packet) => packet.batch_id === options.batchId,
  );
  const chatQuestions = readCsvFile(chatPackDir, 'owner_chat_intake_questions.csv', CHAT_QUESTION_REQUIRED_COLUMNS).filter(
    (question) => question.batch_id === options.batchId,
  );

  if (chatPackets.length === 0) {
    throw new Error(`No chat packets found for batch_id=${options.batchId}`);
  }

  const selectedPacketIds = new Set(chatPackets.map((packet) => packet.packet_id));
  const rawAnswers = existsSync(answersPath) ? JSON.parse(readFileSync(answersPath, 'utf8')) : {};
  const answerPackets = flattenAnswerSubmission(rawAnswers, options.batchId);
  const answerMap = buildAnswerMap(answerPackets, selectedPacketIds);
  const mergeStats = mergeQuestionnaire(questionnaireRows, selectedPacketIds, answerMap);
  const mergedPacketRows = updatePacketRows(packetRows, selectedPacketIds, mergeStats.mergedRows);
  const mergedReleaseGateRows = updateReleaseGateRows(releaseGateRows, selectedPacketIds, mergeStats.mergedRows);
  const mergedSourceRows = updateSourceRows(sourceRows, selectedPacketIds, mergedPacketRows);
  const skeleton = buildSkeleton(options.batchId, chatPackets, chatQuestions);
  const skeletonMarkdown = buildSkeletonMarkdown(options.batchId, chatPackets, chatQuestions);
  const generatedAt = isoNow();
  const summary = buildSummary({
    generatedAt,
    appRoot,
    outDir,
    intakeDir,
    chatPackDir,
    answersPath,
    batchId: options.batchId,
    chatPackets,
    chatQuestions,
    mergeStats,
    answerMap,
  });
  const manifest = {
    schemaVersion: 1,
    generatedAt,
    sourceInputs: {
      intakeDir,
      chatPackDir,
      answersPath,
      batchId: options.batchId,
    },
    outputs: {
      'owner_intake_questionnaire.csv': { rowCount: mergeStats.mergedRows.length, headers: QUESTIONNAIRE_REQUIRED_COLUMNS },
      'owner_intake_packet_queue.csv': { rowCount: mergedPacketRows.length, headers: PACKET_QUEUE_REQUIRED_COLUMNS },
      'owner_intake_release_gate.csv': { rowCount: mergedReleaseGateRows.length, headers: RELEASE_GATE_REQUIRED_COLUMNS },
      'owner_intake_source_matrix.csv': { rowCount: mergedSourceRows.length, headers: SOURCE_MATRIX_REQUIRED_COLUMNS },
      'owner_chat_answer_submission_skeleton.json': { rowCount: skeleton.packets.length, headers: ['packets'] },
      'owner_chat_answer_submission_skeleton.md': { rowCount: 1, headers: ['markdown'] },
      'owner_chat_merge_summary.json': { rowCount: 1, headers: ['summary'] },
      'owner_chat_merge_manifest.json': { rowCount: 1, headers: ['manifest'] },
    },
    boundaries: summary.boundaries,
  };

  if (!options.noWrite) {
    mkdirSync(outDir, { recursive: true });
    writeCsv(join(outDir, 'owner_intake_questionnaire.csv'), mergeStats.mergedRows, QUESTIONNAIRE_REQUIRED_COLUMNS);
    writeCsv(join(outDir, 'owner_intake_packet_queue.csv'), mergedPacketRows, PACKET_QUEUE_REQUIRED_COLUMNS);
    writeCsv(join(outDir, 'owner_intake_release_gate.csv'), mergedReleaseGateRows, RELEASE_GATE_REQUIRED_COLUMNS);
    writeCsv(join(outDir, 'owner_intake_source_matrix.csv'), mergedSourceRows, SOURCE_MATRIX_REQUIRED_COLUMNS);
    writeFileSync(join(outDir, 'owner_chat_answer_submission_skeleton.json'), `${JSON.stringify(skeleton, null, 2)}\n`);
    writeFileSync(join(outDir, 'owner_chat_answer_submission_skeleton.md'), skeletonMarkdown);
    writeFileSync(join(outDir, 'owner_chat_merge_summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(outDir, 'owner_chat_merge_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          summary,
          manifest,
          sampleMergedQuestions: mergeStats.mergedRows
            .filter((row) => selectedPacketIds.has(row.packet_id))
            .slice(0, 8),
          samplePacketQueue: mergedPacketRows.filter((row) => selectedPacketIds.has(row.packet_id)),
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  process.stdout.write(
    [
      `Merged owner chat answers for ${options.batchId}`,
      `Input: ${basename(answersPath)}`,
      `Output: ${summary.relativeOutputDir}`,
      `Packets: ${summary.packetCount}`,
      `Merged answered questions: ${summary.mergedQuestionCount}/${summary.selectedQuestionCount}`,
      'Boundaries: providerCalls=false productionWrites=false sourceRegistryWrites=false pageWrites=false csvFactExport=false',
    ].join('\n'),
  );
}

main();
