#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isValidIsoDateOrDateTime } from './lib/strict-iso-date.mjs';

const PACKET_REQUIRED_COLUMNS = [
  'task_id',
  'queue_type',
  'priority',
  'owner_team',
  'source_id',
  'page',
  'metric',
  'source_name',
  'source_url',
  'current_status',
  'current_http_status',
  'retryable',
  'checked_at',
  'blocked_reason',
  'business_question',
  'accepted_proof',
  'rejection_rule',
  'manual_review_required',
  'fact_promotion',
  'production_write_authorized',
  'provider_calls_authorized',
];

const QUESTIONNAIRE_REQUIRED_COLUMNS = [
  'task_id',
  'source_id',
  'field_order',
  'required_field',
  'answer',
  'reviewer',
  'answered_at',
  'evidence_path',
  'artifact_sha256',
  'validation_status',
];

const ACCEPTANCE_GATE_REQUIRED_COLUMNS = [
  'task_id',
  'source_id',
  'status',
  'l3_evidence_ready',
  'source_replacement_required',
  'scope_mismatch_rejected',
  'artifact_sha256_present',
  'reviewer_present',
  'publication_or_report_year_present',
  'fact_promotion_allowed',
  'production_write_authorized',
  'provider_call_authorized',
  'next_gate',
];

const QUESTION_VALIDATION_FIELDS = [
  'task_id',
  'source_id',
  'field_order',
  'required_field',
  'answer_status',
  'reviewer_status',
  'answered_at_status',
  'evidence_reference_status',
  'hash_validation_status',
  'decision_status',
  'forbidden_token_detected',
  'validation_status',
  'blockers',
  'can_write_source_registry',
  'can_update_page_display',
  'can_export_as_fact_csv',
];

const PACKET_VALIDATION_FIELDS = [
  'task_id',
  'source_id',
  'priority',
  'owner_team',
  'page',
  'metric',
  'current_status',
  'current_http_status',
  'manual_decision',
  'required_field_count',
  'complete_field_count',
  'missing_field_count',
  'invalid_hash_count',
  'forbidden_token_row_count',
  'packet_validation_status',
  'ready_for_manual_release_review',
  'accepted_for_l3_evidence',
  'needs_replacement_source',
  'rejected_scope_mismatch',
  'blocked_vendor_access',
  'can_write_source_registry',
  'can_update_page_display',
  'can_export_as_fact_csv',
  'blocking_reason',
  'next_action',
];

const ALLOWED_DECISIONS = new Set([
  'accepted_for_l3_evidence',
  'needs_replacement_source',
  'rejected_scope_mismatch',
  'blocked_vendor_access',
]);
const REQUIRED_MANUAL_EVIDENCE_FIELDS = [
  'source_id',
  'metric',
  'publisher',
  'source_url',
  'evidence_type',
  'visible_or_authorized_artifact_path',
  'artifact_sha256',
  'publication_date_or_report_year',
  'accessed_at',
  'reviewer',
  'business_scope',
  'quoted_or_summarized_fact',
  'unit_and_currency',
  'region_scope',
  'product_scope',
  'decision',
  'limitations',
];

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

function findLatestManualEvidencePack(appRoot) {
  const auditRoot = join(appRoot, 'tmp/audits');
  if (!existsSync(auditRoot)) return undefined;

  const candidates = readdirSync(auditRoot)
    .filter((name) => name.startsWith('source-error-manual-evidence-pack-'))
    .map((name) => join(auditRoot, name))
    .filter((path) => existsSync(join(path, 'manual_evidence_questionnaire.csv')))
    .map((path) => ({ path, mtimeMs: statSync(join(path, 'manual_evidence_questionnaire.csv')).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.path;
}

function readRequiredCsv(intakeDir, filename, requiredColumns) {
  const path = join(intakeDir, filename);
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Missing manual evidence input: ${path}`);
  }
  return parseCsv(readFileSync(path, 'utf8'), requiredColumns);
}

function hasForbiddenToken(value) {
  return FORBIDDEN_TOKEN_RE.test(String(value ?? ''));
}

function scrub(value) {
  return hasForbiddenToken(value) ? '[redacted-forbidden-token]' : String(value ?? '');
}

function normalize(value) {
  return String(value ?? '').trim();
}

function normalizeDecision(value) {
  return normalize(value).toLowerCase();
}

function validateQuestion(row) {
  const requiredField = normalize(row.required_field);
  const answer = normalize(row.answer);
  const reviewer = normalize(row.reviewer);
  const answeredAt = normalize(row.answered_at);
  const evidencePath = normalize(row.evidence_path);
  const artifactSha = normalize(row.artifact_sha256);
  const decision = requiredField === 'decision' ? normalizeDecision(answer) : '';
  const blockers = [];

  if (!answer) blockers.push('missing-answer');
  if (!reviewer) blockers.push('missing-reviewer');
  if (!isValidIsoDateOrDateTime(answeredAt)) blockers.push('invalid-answered-at');
  if (!evidencePath) blockers.push('missing-evidence-path');
  if (!artifactSha) blockers.push('missing-artifact-sha256');
  if (artifactSha && !SHA256_RE.test(artifactSha)) blockers.push('invalid-artifact-sha256');
  if (requiredField === 'decision' && !ALLOWED_DECISIONS.has(decision)) blockers.push('invalid-manual-decision');

  const forbiddenTokenDetected = [row.answer, row.reviewer, row.evidence_path, row.artifact_sha256, row.validation_status].some(hasForbiddenToken);
  if (forbiddenTokenDetected) blockers.push('forbidden-token-detected');

  return {
    task_id: row.task_id,
    source_id: row.source_id,
    field_order: row.field_order,
    required_field: requiredField,
    answer_status: answer ? 'answered' : 'missing',
    reviewer_status: reviewer ? 'present' : 'missing',
    answered_at_status: isValidIsoDateOrDateTime(answeredAt) ? 'valid_date' : 'invalid_or_missing_date',
    evidence_reference_status: evidencePath ? 'submitted_reference' : 'missing_reference',
    hash_validation_status: artifactSha ? (SHA256_RE.test(artifactSha) ? 'valid_sha256' : 'invalid_hash_shape') : 'missing_hash',
    decision_status: requiredField === 'decision' ? (ALLOWED_DECISIONS.has(decision) ? decision : 'invalid_or_missing_decision') : 'not_decision_field',
    forbidden_token_detected: String(forbiddenTokenDetected),
    validation_status: blockers.length === 0 ? 'complete_for_manual_release_review' : 'blocked_manual_evidence_incomplete',
    blockers: blockers.join('|'),
    can_write_source_registry: 'false',
    can_update_page_display: 'false',
    can_export_as_fact_csv: 'false',
  };
}

function buildPacketValidation(packetRows, acceptanceGateRows, questionValidationRows) {
  const acceptanceByTaskId = new Map(acceptanceGateRows.map((gate) => [gate.task_id, gate]));

  return packetRows.map((packet) => {
    const packetQuestions = questionValidationRows.filter((question) => question.task_id === packet.task_id);
    const questionsByField = new Map(
      REQUIRED_MANUAL_EVIDENCE_FIELDS.map((field) => [
        field,
        packetQuestions.filter((question) => question.required_field === field && question.source_id === packet.source_id),
      ]),
    );
    const completeQuestions = REQUIRED_MANUAL_EVIDENCE_FIELDS.filter((field) => {
      const questions = questionsByField.get(field) ?? [];
      return questions.length === 1 && questions[0].validation_status === 'complete_for_manual_release_review';
    });
    const decisionQuestion = questionsByField.get('decision')?.[0];
    const manualDecision = decisionQuestion?.decision_status ?? 'missing_decision';
    const allowedDecision = ALLOWED_DECISIONS.has(manualDecision);
    const invalidHashCount = packetQuestions.filter((question) => question.hash_validation_status === 'invalid_hash_shape').length;
    const forbiddenTokenRowCount = packetQuestions.filter((question) => question.forbidden_token_detected === 'true').length;
    const missingFieldCount = REQUIRED_MANUAL_EVIDENCE_FIELDS.length - completeQuestions.length;
    const gate = acceptanceByTaskId.get(packet.task_id);
    const questionnaireShapeValid =
      packetQuestions.length === REQUIRED_MANUAL_EVIDENCE_FIELDS.length &&
      packetQuestions.every(
        (question) =>
          question.source_id === packet.source_id &&
          REQUIRED_MANUAL_EVIDENCE_FIELDS.includes(question.required_field) &&
          (questionsByField.get(question.required_field)?.length ?? 0) === 1,
      );
    const acceptanceGateMatches = gate?.source_id === packet.source_id;
    const readyForManualReleaseReview =
      questionnaireShapeValid &&
      acceptanceGateMatches &&
      missingFieldCount === 0 &&
      allowedDecision;

    return {
      task_id: packet.task_id,
      source_id: packet.source_id,
      priority: packet.priority,
      owner_team: packet.owner_team,
      page: packet.page,
      metric: packet.metric,
      current_status: packet.current_status,
      current_http_status: packet.current_http_status,
      manual_decision: manualDecision,
      required_field_count: REQUIRED_MANUAL_EVIDENCE_FIELDS.length,
      complete_field_count: completeQuestions.length,
      missing_field_count: missingFieldCount,
      invalid_hash_count: invalidHashCount,
      forbidden_token_row_count: forbiddenTokenRowCount,
      packet_validation_status: readyForManualReleaseReview ? 'ready_for_manual_release_review' : 'blocked_manual_evidence_incomplete',
      ready_for_manual_release_review: String(readyForManualReleaseReview),
      accepted_for_l3_evidence: String(manualDecision === 'accepted_for_l3_evidence'),
      needs_replacement_source: String(manualDecision === 'needs_replacement_source'),
      rejected_scope_mismatch: String(manualDecision === 'rejected_scope_mismatch'),
      blocked_vendor_access: String(manualDecision === 'blocked_vendor_access'),
      can_write_source_registry: 'false',
      can_update_page_display: 'false',
      can_export_as_fact_csv: 'false',
      blocking_reason: readyForManualReleaseReview
        ? 'manual evidence intake is complete; separate manual release review is still required before registry or page changes'
        : normalize(gate?.next_gate) || 'owner must fill all required fields, reviewer metadata, evidence path, sha256, and one allowed decision',
      next_action: readyForManualReleaseReview
        ? 'run manual release review; keep factPromotion=false until separately approved'
        : 'collect missing manual evidence fields or correct the owner decision',
    };
  });
}

function buildSummary({ intakeDir, outDir, packetRows, questionRows, questionValidationRows, packetValidationRows }) {
  const readyPacketCount = packetValidationRows.filter((packet) => packet.ready_for_manual_release_review === 'true').length;

  return {
    generatedAt: new Date().toISOString(),
    intakeDir,
    outputDir: outDir,
    targetCount: packetRows.length,
    questionCount: questionRows.length,
    completeQuestionCount: questionValidationRows.filter((question) => question.validation_status === 'complete_for_manual_release_review').length,
    blockedQuestionCount: questionValidationRows.filter((question) => question.validation_status !== 'complete_for_manual_release_review').length,
    readyForManualReleaseReviewCount: readyPacketCount,
    blockedPacketCount: packetRows.length - readyPacketCount,
    acceptedForL3EvidenceCount: packetValidationRows.filter((packet) => packet.accepted_for_l3_evidence === 'true').length,
    needsReplacementSourceCount: packetValidationRows.filter((packet) => packet.needs_replacement_source === 'true').length,
    rejectedScopeMismatchCount: packetValidationRows.filter((packet) => packet.rejected_scope_mismatch === 'true').length,
    blockedVendorAccessCount: packetValidationRows.filter((packet) => packet.blocked_vendor_access === 'true').length,
    validationStatusCounts: countBy(packetValidationRows, (packet) => packet.packet_validation_status),
    questionValidationStatusCounts: countBy(questionValidationRows, (question) => question.validation_status),
    decisionCounts: countBy(packetValidationRows, (packet) => packet.manual_decision),
    boundaries: {
      providerCalls: false,
      restrictedConnectorAccess: false,
      publicEvidenceLiveCapture: false,
      productionWrites: false,
      productionDeploy: false,
      factPromotion: false,
      sourceRegistryWrites: false,
      pageWrites: false,
      csvFactExport: false,
      manualReleaseReviewRequired: true,
    },
    allowedDecisions: [...ALLOWED_DECISIONS],
  };
}

function buildRunbook(summary) {
  return `---\ntitle: mkt53 public source manual evidence validation ${dateSlug()}\nstatus: manual-evidence-validation-only\ncreated_at: ${summary.generatedAt}\nprovider_calls: false\nrestricted_connector_access: false\nproduction_writes: false\nfact_promotion: false\nmanual_release_review_required: true\n---\n\n# mkt53 Public Source Manual Evidence Validation ${dateSlug()}\n\n## Boundary\n\n- providerCalls=false\n- restrictedConnectorAccess=false\n- publicEvidenceLiveCapture=false\n- productionWrites=false\n- productionDeploy=false\n- factPromotion=false\n- sourceRegistryWrites=false\n- pageWrites=false\n- csvFactExport=false\n- manualReleaseReviewRequired=true\n\nThis validation checks only manual evidence field completeness, reviewer metadata, evidence references, sha256 shape, and allowed owner decisions. It does not approve source registry binding, page fact display, CSV fact export, provider calls, live capture, production writes, or deployment.\n\n## Summary\n\n- targetCount=${summary.targetCount}\n- questionCount=${summary.questionCount}\n- completeQuestionCount=${summary.completeQuestionCount}\n- blockedQuestionCount=${summary.blockedQuestionCount}\n- readyForManualReleaseReviewCount=${summary.readyForManualReleaseReviewCount}\n- blockedPacketCount=${summary.blockedPacketCount}\n- acceptedForL3EvidenceCount=${summary.acceptedForL3EvidenceCount}\n- needsReplacementSourceCount=${summary.needsReplacementSourceCount}\n- rejectedScopeMismatchCount=${summary.rejectedScopeMismatchCount}\n- blockedVendorAccessCount=${summary.blockedVendorAccessCount}\n\n## Next Review Gate\n\n1. Correct blocked manual evidence rows and re-run this validation.\n2. For packets marked ready_for_manual_release_review, run a separate manual release review.\n3. Keep source registry, page display, CSV fact export, and production deployment closed until that separate review explicitly approves a bounded change.\n`;
}

function buildManifest(summary) {
  return {
    generatedAt: summary.generatedAt,
    inputs: {
      intakeDir: summary.intakeDir,
    },
    outputs: {
      'manual_evidence_validation_questionnaire.csv': {
        rowCount: summary.questionCount,
        headers: QUESTION_VALIDATION_FIELDS,
      },
      'manual_evidence_validation_packet_gate.csv': {
        rowCount: summary.targetCount,
        headers: PACKET_VALIDATION_FIELDS,
      },
      'manual_evidence_validation_runbook.md': {
        rowCount: 1,
        headers: ['markdown'],
      },
    },
    boundaries: summary.boundaries,
    allowedDecisions: summary.allowedDecisions,
  };
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const appRoot = process.cwd();
  const discoveredIntakeDir = options.intakeDir ?? findLatestManualEvidencePack(appRoot);

  if (!discoveredIntakeDir) {
    throw new Error('No public source manual evidence package found. Pass --intake <dir>.');
  }

  const intakeDir = resolve(appRoot, discoveredIntakeDir);
  if (!existsSync(intakeDir) || !statSync(intakeDir).isDirectory()) {
    throw new Error(`Manual evidence directory not found: ${intakeDir}`);
  }

  const packetRows = readRequiredCsv(intakeDir, 'manual_evidence_packets.csv', PACKET_REQUIRED_COLUMNS);
  const questionRows = readRequiredCsv(intakeDir, 'manual_evidence_questionnaire.csv', QUESTIONNAIRE_REQUIRED_COLUMNS);
  const acceptanceGateRows = readRequiredCsv(intakeDir, 'manual_evidence_acceptance_gate.csv', ACCEPTANCE_GATE_REQUIRED_COLUMNS);
  const questionValidationRows = questionRows.map(validateQuestion);
  const packetValidationRows = buildPacketValidation(packetRows, acceptanceGateRows, questionValidationRows);
  const outDir = resolve(appRoot, options.outDir ?? `tmp/audits/public-source-manual-evidence-validation-${dateSlug()}`);
  const summary = buildSummary({ intakeDir, outDir, packetRows, questionRows, questionValidationRows, packetValidationRows });
  const manifest = buildManifest(summary);

  if (!options.noWrite) {
    mkdirSync(outDir, { recursive: true });
    writeCsv(join(outDir, 'manual_evidence_validation_questionnaire.csv'), questionValidationRows, QUESTION_VALIDATION_FIELDS);
    writeCsv(join(outDir, 'manual_evidence_validation_packet_gate.csv'), packetValidationRows, PACKET_VALIDATION_FIELDS);
    writeFileSync(join(outDir, 'manual_evidence_validation_runbook.md'), buildRunbook(summary));
    writeFileSync(join(outDir, 'manual_evidence_validation_summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(outDir, 'manual_evidence_validation_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const payload = {
    summary,
    manifest,
    sampleQuestionValidation: questionValidationRows.slice(0, 6),
    samplePacketValidation: packetValidationRows.slice(0, 3),
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write([
      'mkt53 public source manual evidence validation',
      `generatedAt=${summary.generatedAt}`,
      `intakeDir=${summary.intakeDir}`,
      `outputDir=${summary.outputDir}`,
      `targetCount=${summary.targetCount}`,
      `questionCount=${summary.questionCount}`,
      `readyForManualReleaseReviewCount=${summary.readyForManualReleaseReviewCount}`,
      `blockedPacketCount=${summary.blockedPacketCount}`,
      `factPromotion=${summary.boundaries.factPromotion}`,
      `sourceRegistryWrites=${summary.boundaries.sourceRegistryWrites}`,
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
