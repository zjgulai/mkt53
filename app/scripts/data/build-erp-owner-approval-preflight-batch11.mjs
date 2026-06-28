#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const BATCH10_DIR_NAME = 'erp-owner-approval-record-template-batch10-20260626';
const OUTPUT_DIR_NAME = 'erp-owner-approval-preflight-batch11-20260626';
const BATCH10_DIR = join(repoRoot, 'tmp/exports', BATCH10_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'owner-approval-records-failed-preflight';
const FIXTURE_EVIDENCE_GRADE = 'L2-fixture-or-dry-run';
const FIXTURE_PRIVACY_LEVEL = 'synthetic/internal';
const FIXTURE_BLOCKING_REASON = 'synthetic-fixture-not-owner-approval';
const REQUIRED_URI_PATTERN = /^(https:\/\/|approval:\/\/|dingtalk:\/\/|file-hash:\/\/|s3:\/\/)/;
const APPROVAL_DECISIONS = ['approved', 'denied', 'needs_revision'];
const BOOLEAN_DECISIONS = ['true', 'false'];
const FORBIDDEN_VALUE_PATTERNS = [
  /AS104-NA00NB/i,
  /Aeroflow Breastpumps/i,
  /叶钰铭/i,
  /Momcozy可穿戴式吸奶器/i,
  /SHOULD_NOT_LEAK/i,
  /BEGIN PRIVATE KEY/i,
  /AKIA[0-9A-Z]{16}/,
  /client_secret/i,
  /session_token/i,
  /private_key/i,
];

const INPUTS = {
  batch10Manifest: join(BATCH10_DIR, 'batch10_erp_owner_approval_record_template_manifest.json'),
  recordTemplate: join(BATCH10_DIR, 'erp_owner_approval_record_input_template.csv'),
  requiredEvidence: join(BATCH10_DIR, 'erp_owner_approval_required_evidence_matrix.csv'),
  submissionReadiness: join(BATCH10_DIR, 'erp_owner_approval_submission_readiness.csv'),
};

function parseArgs(argv) {
  const approvalRecordsIndex = argv.indexOf('--approval-records');
  return {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    fixture: argv.includes('--fixture') || argv.includes('--synthetic-fixture'),
    approvalRecordsPath: approvalRecordsIndex >= 0 ? argv[approvalRecordsIndex + 1] : undefined,
  };
}

function isSyntheticPath(value) {
  return /synthetic/i.test(String(value ?? ''));
}

function buildEvidenceContext(options = {}) {
  const fixtureMode = Boolean(options.fixture) || isSyntheticPath(options.approvalRecordsPath);
  return {
    fixtureMode,
    evidenceGrade: fixtureMode ? FIXTURE_EVIDENCE_GRADE : EVIDENCE_GRADE,
    privacyLevel: fixtureMode ? FIXTURE_PRIVACY_LEVEL : PRIVACY_LEVEL,
    blockingReason: fixtureMode ? FIXTURE_BLOCKING_REASON : BLOCKING_REASON,
  };
}

function gatedReason(context, reason) {
  return context.fixtureMode ? `${FIXTURE_BLOCKING_REASON};${reason}` : reason;
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(current);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  return rows;
}

function readCsvRows(filePath) {
  if (!existsSync(filePath)) throw new Error(`Missing Batch11 input: ${filePath}`);
  return parseCsv(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function readCsvObjects(filePath) {
  const rows = readCsvRows(filePath);
  const headers = rows[0] ?? [];
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

function csvEscape(value) {
  const normalized = String(value ?? '');
  if (/[",\n\r]/.test(normalized)) return `"${normalized.replace(/"/g, '""')}"`;
  return normalized;
}

function toCsv(rows, headers) {
  return `${[headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n')}\n`;
}

function fileHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function isHash(value) {
  return /^[a-f0-9]{64}$/i.test(String(value ?? ''));
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
}

function isAllowedUri(value) {
  return REQUIRED_URI_PATTERN.test(String(value ?? ''));
}

function isBooleanDecision(value) {
  return BOOLEAN_DECISIONS.includes(String(value ?? ''));
}

function forbiddenHitCount(row) {
  const text = Object.values(row).join(' ');
  return FORBIDDEN_VALUE_PATTERNS.filter((pattern) => pattern.test(text)).length;
}

function buildRulebookRows(context) {
  return [
    {
      rule_id: 'batch11_rule:decision_vocab',
      rule_name: 'approval decision vocabulary',
      required_condition: APPROVAL_DECISIONS.join('|'),
      failure_status: 'blocked_invalid_approval_decision',
      can_display_as_fact: 'false',
    },
    {
      rule_id: 'batch11_rule:approver_hash',
      rule_name: 'approver name must be hashed',
      required_condition: '64-char sha256-style hash; no raw person name',
      failure_status: 'blocked_missing_or_raw_approver',
      can_display_as_fact: 'false',
    },
    {
      rule_id: 'batch11_rule:approval_uri',
      rule_name: 'approval record URI',
      required_condition: 'https://|approval://|dingtalk://|file-hash://|s3://',
      failure_status: 'blocked_missing_auditable_uri',
      can_display_as_fact: 'false',
    },
    {
      rule_id: 'batch11_rule:forbidden_display_confirmed',
      rule_name: 'forbidden display confirmation',
      required_condition: 'forbidden_display_confirmed=true',
      failure_status: 'blocked_missing_forbidden_display_confirmation',
      can_display_as_fact: 'false',
    },
    {
      rule_id: 'batch11_rule:raw_value_scan',
      rule_name: 'raw value denylist scan',
      required_condition: 'no forbidden raw SKU, product, customer, operator, credential, or leak sentinel',
      failure_status: 'blocked_forbidden_raw_value',
      can_display_as_fact: 'false',
    },
    {
      rule_id: 'batch11_rule:batch9_handoff',
      rule_name: 'handoff to Batch9 validator',
      required_condition: 'all rows pass preflight and still require Batch9 validation plus manual release review',
      failure_status: 'blocked_before_batch9_validator',
      can_display_as_fact: 'false',
    },
  ].map((row) => ({
    ...row,
    evidence_grade: context.evidenceGrade,
    privacy_level: context.privacyLevel,
  }));
}

function preflightMessages(row) {
  const messages = [];
  if (!APPROVAL_DECISIONS.includes(row.approval_decision)) messages.push('approval_decision must be approved, denied, or needs_revision');
  if (row.approval_decision !== 'approved') messages.push('approval_decision is not approved for Batch9 handoff');
  if (!row.approver_role) messages.push('approver_role is required');
  if (!isHash(row.approver_name_hash)) messages.push('approver_name_hash must be a 64-char hash');
  if (!isIsoDate(row.approval_date)) messages.push('approval_date must be YYYY-MM-DD');
  if (!isAllowedUri(row.approval_record_uri)) messages.push('approval_record_uri must use an auditable URI scheme');
  if (row.forbidden_display_confirmed !== 'true') messages.push('forbidden_display_confirmed must be true');
  if (!isBooleanDecision(row.can_export_decision)) messages.push('can_export_decision must be true or false');
  if (!isBooleanDecision(row.can_display_as_fact_decision)) messages.push('can_display_as_fact_decision must be true or false');
  if (row.can_display_as_fact_decision === 'true' && row.approval_lane !== 'display_approval_record') {
    messages.push('only display approval records may request fact display promotion');
  }
  if (forbiddenHitCount(row) > 0) messages.push('forbidden raw value pattern detected');
  return messages;
}

function buildPreflightRows(recordRows, context) {
  return recordRows.map((row) => {
    const messages = preflightMessages(row);
    const status = messages.length === 0 ? 'ready_for_batch9_validator' : 'blocked_preflight';
    return {
      preflight_id: `batch11_preflight:${row.approval_item_id}`,
      approval_item_id: row.approval_item_id,
      approval_lane: row.approval_lane,
      source_ids: row.source_ids,
      affected_tables: row.affected_tables,
      owner_role: row.owner_role,
      approval_decision_present: row.approval_decision ? 'true' : 'false',
      approver_hash_present: row.approver_name_hash ? 'true' : 'false',
      approval_uri_present: row.approval_record_uri ? 'true' : 'false',
      forbidden_display_confirmed: row.forbidden_display_confirmed === 'true' ? 'true' : 'false',
      can_export_decision: row.can_export_decision || 'false',
      can_display_as_fact_decision: row.can_display_as_fact_decision || 'false',
      preflight_status: status,
      preflight_messages: messages.join('|'),
      ready_for_batch9_validator: status === 'ready_for_batch9_validator' ? 'true' : 'false',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      can_display_as_fact: 'false',
      blocking_reason: gatedReason(context, status === 'ready_for_batch9_validator' ? 'batch9-validation-and-manual-release-review-required' : BLOCKING_REASON),
    };
  });
}

function buildForbiddenScanRows(recordRows, context) {
  return recordRows.map((row) => {
    const hitCount = forbiddenHitCount(row);
    return {
      scan_id: `batch11_forbidden_scan:${row.approval_item_id}`,
      approval_item_id: row.approval_item_id,
      approval_lane: row.approval_lane,
      fields_scanned: Object.keys(row).length,
      forbidden_pattern_hits: hitCount,
      scan_status: hitCount === 0 ? 'passed_no_forbidden_patterns' : 'blocked_forbidden_patterns_detected',
      redaction_action: hitCount === 0 ? 'none' : 'remove raw values before Batch9 validation',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      can_display_as_fact: 'false',
      blocking_reason: context.fixtureMode
        ? gatedReason(context, hitCount === 0 ? 'batch9-validation-and-manual-release-review-required' : 'forbidden-raw-value-detected')
        : hitCount === 0 ? '' : 'forbidden-raw-value-detected',
    };
  });
}

function buildHandoffRows(preflightRows, options, context) {
  const readyRows = preflightRows.filter((row) => row.ready_for_batch9_validator === 'true');
  const allReady = preflightRows.length > 0 && readyRows.length === preflightRows.length;
  if (!allReady) return [];
  const fixtureFlag = context.fixtureMode ? ' --fixture' : '';
  return [
    {
      handoff_id: `batch11_handoff:${OUTPUT_DIR_NAME}`,
      approval_records_path: options.approvalRecordsPath ?? `tmp/exports/${BATCH10_DIR_NAME}/erp_owner_approval_record_input_template.csv`,
      ready_rows: readyRows.length,
      batch9_validator_command: `npm run data:erp:owner-approval-intake-batch9 -- --approval-records ${options.approvalRecordsPath ?? `tmp/exports/${BATCH10_DIR_NAME}/erp_owner_approval_record_input_template.csv`} --json${fixtureFlag}`,
      handoff_status: 'ready_for_batch9_validator',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      can_display_as_fact: 'false',
      blocking_reason: gatedReason(context, 'batch9-validation-and-manual-release-review-required'),
    },
  ];
}

function buildSubmissionRows(submissionRows, preflightRows, context) {
  const readyBySource = new Map();
  for (const row of preflightRows) {
    for (const sourceId of String(row.source_ids ?? '').split(/[;|]/).filter(Boolean)) {
      readyBySource.set(sourceId, (readyBySource.get(sourceId) ?? 0) + (row.ready_for_batch9_validator === 'true' ? 1 : 0));
    }
  }
  return submissionRows.map((row) => {
    const sourceReadyRows = String(row.source_ids ?? '')
      .split(/[;|]/)
      .filter(Boolean)
      .reduce((sum, sourceId) => sum + (readyBySource.get(sourceId) ?? 0), 0);
    return {
      release_gate_id: row.release_gate_id,
      table_name: row.table_name,
      surface: row.surface,
      required_owner_records: row.required_owner_records,
      preflight_ready_rows: sourceReadyRows,
      submitted_owner_records: row.submitted_owner_records,
      handoff_status: sourceReadyRows > 0 ? 'partial_preflight_ready_still_requires_batch9' : 'blocked_no_preflight_ready_records',
      can_export: 'false',
      can_display_as_fact: 'false',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      blocking_reason: gatedReason(context, sourceReadyRows > 0 ? 'batch9-validation-and-manual-release-review-required' : BLOCKING_REASON),
    };
  });
}

const outputSpecs = {
  'erp_owner_approval_preflight_rulebook.csv': [
    'rule_id',
    'rule_name',
    'required_condition',
    'failure_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
  ],
  'erp_owner_approval_preflight_result.csv': [
    'preflight_id',
    'approval_item_id',
    'approval_lane',
    'source_ids',
    'affected_tables',
    'owner_role',
    'approval_decision_present',
    'approver_hash_present',
    'approval_uri_present',
    'forbidden_display_confirmed',
    'can_export_decision',
    'can_display_as_fact_decision',
    'preflight_status',
    'preflight_messages',
    'ready_for_batch9_validator',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_approval_forbidden_value_scan.csv': [
    'scan_id',
    'approval_item_id',
    'approval_lane',
    'fields_scanned',
    'forbidden_pattern_hits',
    'scan_status',
    'redaction_action',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_approval_batch9_handoff_queue.csv': [
    'handoff_id',
    'approval_records_path',
    'ready_rows',
    'batch9_validator_command',
    'handoff_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_approval_release_preflight_summary.csv': [
    'release_gate_id',
    'table_name',
    'surface',
    'required_owner_records',
    'preflight_ready_rows',
    'submitted_owner_records',
    'handoff_status',
    'can_export',
    'can_display_as_fact',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
};

function buildArtifacts(options = {}) {
  for (const inputPath of Object.values(INPUTS)) {
    if (!existsSync(inputPath)) throw new Error(`Missing Batch11 input: ${inputPath}`);
  }
  const context = buildEvidenceContext(options);
  const batch10Manifest = JSON.parse(readFileSync(INPUTS.batch10Manifest, 'utf8'));
  const defaultRecordInputPath = `tmp/exports/${BATCH10_DIR_NAME}/erp_owner_approval_record_input_template.csv`;
  const approvalRecordsInputPath = options.approvalRecordsPath ?? defaultRecordInputPath;
  const approvalRecordsFilePath = options.approvalRecordsPath ? resolve(repoRoot, options.approvalRecordsPath) : INPUTS.recordTemplate;
  const recordRows = readCsvObjects(approvalRecordsFilePath);
  const submissionRows = readCsvObjects(INPUTS.submissionReadiness);

  const rulebookRows = buildRulebookRows(context);
  const preflightRows = buildPreflightRows(recordRows, context);
  const forbiddenScanRows = buildForbiddenScanRows(recordRows, context);
  const handoffRows = buildHandoffRows(preflightRows, { approvalRecordsPath: approvalRecordsInputPath }, context);
  const releasePreflightRows = buildSubmissionRows(submissionRows, preflightRows, context);
  const blockedPreflightRows = preflightRows.filter((row) => row.preflight_status !== 'ready_for_batch9_validator').length;
  const forbiddenHitRows = forbiddenScanRows.filter((row) => Number(row.forbidden_pattern_hits) > 0).length;

  const rowsByFile = {
    'erp_owner_approval_preflight_rulebook.csv': rulebookRows,
    'erp_owner_approval_preflight_result.csv': preflightRows,
    'erp_owner_approval_forbidden_value_scan.csv': forbiddenScanRows,
    'erp_owner_approval_batch9_handoff_queue.csv': handoffRows,
    'erp_owner_approval_release_preflight_summary.csv': releasePreflightRows,
  };

  const materialized = Object.fromEntries(
    Object.entries(rowsByFile).map(([fileName, rows]) => {
      const headers = outputSpecs[fileName];
      const csv = toCsv(rows, headers);
      return [
        fileName,
        {
          path: `tmp/exports/${OUTPUT_DIR_NAME}/${fileName}`,
          rowCount: rows.length,
          headers,
          sha256: fileHash(csv),
          csv,
        },
      ];
    }),
  );

  const manifest = {
    batchId: OUTPUT_DIR_NAME,
    generatedAt: new Date().toISOString(),
    generatedRule: 'Local owner-approval preflight and forbidden-value scan before Batch9 validation; no approval fabrication, ERP login, provider call, production write, or automatic promotion.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
    evidenceGrade: context.evidenceGrade,
    privacyLevel: context.privacyLevel,
    canDisplayAsFact: false,
    blockingReason: context.blockingReason,
    fixtureMode: context.fixtureMode,
    upstreamBatch: {
      batchId: batch10Manifest.batchId,
      manifestPath: `tmp/exports/${BATCH10_DIR_NAME}/batch10_erp_owner_approval_record_template_manifest.json`,
      approvalRecordTemplateRows: batch10Manifest.summary?.approvalRecordTemplateRows ?? null,
      submittedOwnerRecords: batch10Manifest.summary?.submittedOwnerRecords ?? null,
    },
    approvalRecordsInput: {
      provided: Boolean(options.approvalRecordsPath),
      path: approvalRecordsInputPath,
      rowCount: recordRows.length,
    },
    boundaries: {
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      fixtureMode: context.fixtureMode,
      syntheticInputDetected: context.fixtureMode,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerRecordPreflightOnly: true,
      exportEnabled: false,
    },
    outputs: Object.fromEntries(
      Object.entries(materialized).map(([fileName, file]) => [
        fileName,
        {
          path: file.path,
          rowCount: file.rowCount,
          sha256: file.sha256,
          headers: file.headers,
        },
      ]),
    ),
    summary: {
      preflightRulebookRows: rulebookRows.length,
      approvalRecordRows: recordRows.length,
      preflightRows: preflightRows.length,
      readyForBatch9Rows: preflightRows.length - blockedPreflightRows,
      blockedPreflightRows,
      forbiddenScanRows: forbiddenScanRows.length,
      forbiddenHitRows,
      releasePreflightRows: releasePreflightRows.length,
      batch9HandoffRows: handoffRows.length,
      readyToDisplayRows: 0,
      readyToExportRows: 0,
      validationPassed: false,
    },
  };

  return { files: materialized, manifest };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { files, manifest } = buildArtifacts({ approvalRecordsPath: args.approvalRecordsPath, fixture: args.fixture });

  if (!args.noWrite) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    for (const [fileName, file] of Object.entries(files)) writeFileSync(join(OUTPUT_DIR, fileName), file.csv, 'utf8');
    writeFileSync(join(OUTPUT_DIR, 'batch11_erp_owner_approval_preflight_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch11 owner approval preflight ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.readyForBatch9Rows} ready rows, ${manifest.summary.blockedPreflightRows} blocked rows, handoffRows=${manifest.summary.batch9HandoffRows}.\n`,
  );
}

main();
