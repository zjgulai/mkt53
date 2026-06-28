#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const INPUT_DIR_NAME = 'erp-owner-approval-batch8-20260625';
const OUTPUT_DIR_NAME = 'erp-owner-approval-intake-batch9-20260626';
const INPUT_DIR = join(repoRoot, 'tmp/exports', INPUT_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'missing-valid-owner-approval-records';
const FIXTURE_EVIDENCE_GRADE = 'L2-fixture-or-dry-run';
const FIXTURE_PRIVACY_LEVEL = 'synthetic/internal';
const FIXTURE_BLOCKING_REASON = 'synthetic-fixture-not-owner-approval';

const INPUTS = {
  batch8Manifest: join(INPUT_DIR, 'batch8_erp_owner_approval_manifest.json'),
  approvalBacklog: join(INPUT_DIR, 'erp_owner_approval_backlog.csv'),
  displayTemplate: join(INPUT_DIR, 'erp_display_approval_record_template.csv'),
};

const APPROVAL_DECISIONS = ['approved', 'denied', 'needs_revision'];
const BOOLEAN_DECISIONS = ['true', 'false'];

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

function resolveInputPath(inputPath) {
  if (!inputPath) return undefined;
  const repoRelativePath = resolve(repoRoot, inputPath);
  if (existsSync(repoRelativePath)) return repoRelativePath;
  return resolve(process.cwd(), inputPath);
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
  if (!existsSync(filePath)) throw new Error(`Missing Batch9 input: ${filePath}`);
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

function splitPipe(value) {
  return String(value ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
}

function isHash(value) {
  return /^[a-f0-9]{64}$/i.test(String(value ?? ''));
}

function hasUri(value) {
  return /^(https:\/\/|approval:\/\/|dingtalk:\/\/|file-hash:\/\/|s3:\/\/)/.test(String(value ?? ''));
}

function validationMessages(record, backlogRow) {
  if (!record) return ['missing approval record for backlog item'];
  const messages = [];
  if (!APPROVAL_DECISIONS.includes(record.approval_decision)) messages.push('approval_decision must be approved, denied, or needs_revision');
  if (record.approval_decision !== 'approved') messages.push('approval_decision is not approved');
  if (!record.approver_role) messages.push('approver_role is required');
  if (!isHash(record.approver_name_hash)) messages.push('approver_name_hash must be a 64-char hash, not a raw person name');
  if (!isIsoDate(record.approval_date)) messages.push('approval_date must be YYYY-MM-DD');
  if (!hasUri(record.approval_record_uri)) messages.push('approval_record_uri must point to an auditable approval record');
  if (!BOOLEAN_DECISIONS.includes(record.forbidden_display_confirmed)) messages.push('forbidden_display_confirmed must be true or false');
  if (record.forbidden_display_confirmed !== 'true') messages.push('forbidden_display rules must be explicitly confirmed');
  if (!BOOLEAN_DECISIONS.includes(record.can_export_decision)) messages.push('can_export_decision must be true or false');
  if (!BOOLEAN_DECISIONS.includes(record.can_display_as_fact_decision)) messages.push('can_display_as_fact_decision must be true or false');
  if (record.can_display_as_fact_decision === 'true' && backlogRow.approval_lane !== 'display_approval_record') {
    messages.push('only display approval records may request fact display promotion');
  }
  return messages;
}

function buildContractRows(context) {
  return [
    {
      approval_lane: 'field_dictionary_owner_approval',
      required_record_key: 'approval_item_id',
      required_fields: 'approval_item_id;approval_decision;approver_role;approver_name_hash;approval_date;approval_record_uri;forbidden_display_confirmed;can_export_decision;can_display_as_fact_decision',
      decision_vocab: APPROVAL_DECISIONS.join('|'),
      promotion_rule: 'all source/table field meanings, units, currency policy, hidden/subtotal behavior, and display scope must be approved',
      fail_closed_rule: 'missing or invalid record keeps source/table blocked',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      can_display_as_fact: 'false',
    },
    {
      approval_lane: 'category_owner_approval',
      required_record_key: 'approval_item_id',
      required_fields: 'approval_item_id;approval_decision;approver_role;approver_name_hash;approval_date;approval_record_uri;forbidden_display_confirmed;can_export_decision;can_display_as_fact_decision',
      decision_vocab: APPROVAL_DECISIONS.join('|'),
      promotion_rule: 'taxonomy rule, sampled SKU-hash review, unmapped handling, and display scope must be approved',
      fail_closed_rule: 'missing or invalid record keeps category proxy blocked',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      can_display_as_fact: 'false',
    },
    {
      approval_lane: 'subtotal_behavior_owner_approval',
      required_record_key: 'approval_item_id',
      required_fields: 'approval_item_id;approval_decision;approver_role;approver_name_hash;approval_date;approval_record_uri;forbidden_display_confirmed;can_export_decision;can_display_as_fact_decision',
      decision_vocab: APPROVAL_DECISIONS.join('|'),
      promotion_rule: 'official subtotal formula, hidden-column behavior, and time-window boundary must be approved',
      fail_closed_rule: 'missing or invalid record keeps affected table blocked',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      can_display_as_fact: 'false',
    },
    {
      approval_lane: 'display_approval_record',
      required_record_key: 'approval_item_id',
      required_fields: 'approval_item_id;approval_decision;approver_role;approver_name_hash;approval_date;approval_record_uri;allowed_display_scope;forbidden_display_confirmed;can_export_decision;can_display_as_fact_decision',
      decision_vocab: APPROVAL_DECISIONS.join('|'),
      promotion_rule: 'display owner, privacy reviewer, and data governance must approve exact surface/export scope',
      fail_closed_rule: 'missing or invalid record keeps table display/export blocked',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      can_display_as_fact: 'false',
    },
  ];
}

function buildValidationRows(backlogRows, approvalRecords, context) {
  const recordById = new Map(approvalRecords.map((record) => [record.approval_item_id, record]));
  return backlogRows.map((backlogRow) => {
    const record = recordById.get(backlogRow.approval_item_id);
    const messages = validationMessages(record, backlogRow);
    const isApproved = messages.length === 0;
    return {
      validation_id: `batch9_validation:${backlogRow.approval_item_id}`,
      approval_item_id: backlogRow.approval_item_id,
      approval_lane: backlogRow.approval_lane,
      source_ids: backlogRow.source_ids,
      affected_tables: backlogRow.affected_tables,
      owner_role: backlogRow.owner_role,
      priority: backlogRow.priority,
      approval_record_present: record ? 'true' : 'false',
      approval_decision: record?.approval_decision ?? '',
      validation_status: isApproved ? 'passed_owner_record_validation' : 'blocked_missing_or_invalid_owner_record',
      validation_messages: messages.join('|'),
      can_export_decision: record?.can_export_decision ?? 'false',
      can_display_as_fact_decision: record?.can_display_as_fact_decision ?? 'false',
      can_promote: isApproved && record?.can_display_as_fact_decision === 'true' ? 'true' : 'false',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      blocking_reason: context.fixtureMode ? gatedReason(context, isApproved ? 'manual-release-review-required' : BLOCKING_REASON) : isApproved ? '' : BLOCKING_REASON,
    };
  });
}

function buildReleaseRows(displayRows, validationRows, context) {
  return displayRows.map((row) => {
    const relevantValidations = validationRows.filter((validation) => {
      const sourceIds = splitPipe(validation.source_ids);
      const displaySourceIds = splitPipe(row.source_ids);
      return validation.affected_tables === row.table_name || sourceIds.some((sourceId) => displaySourceIds.includes(sourceId));
    });
    const allRelevantPassed = relevantValidations.length > 0 && relevantValidations.every((validation) => validation.validation_status === 'passed_owner_record_validation');
    return {
      release_gate_id: `batch9_release_gate:${row.table_name}`,
      table_name: row.table_name,
      surface: row.surface,
      source_ids: row.source_ids,
      evidence_artifact_path: row.evidence_artifact_path,
      relevant_validation_rows: relevantValidations.length,
      passed_validation_rows: relevantValidations.filter((validation) => validation.validation_status === 'passed_owner_record_validation').length,
      release_status: allRelevantPassed ? 'ready_for_manual_release_review' : 'blocked_missing_valid_owner_records',
      can_export: 'false',
      can_display_as_fact: 'false',
      required_next_step: allRelevantPassed
        ? 'manual release review must still approve exact display/export promotion'
        : 'collect valid owner approval records for field, category, subtotal, and display lanes',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      blocking_reason: gatedReason(context, allRelevantPassed ? 'manual-release-review-required' : BLOCKING_REASON),
    };
  });
}

function buildPromotionRows(validationRows, releaseRows, context) {
  const allReleaseRowsReady = releaseRows.length > 0 && releaseRows.every((row) => row.release_status === 'ready_for_manual_release_review');
  if (!allReleaseRowsReady) return [];
  return validationRows
    .filter((row) => row.can_promote === 'true')
    .map((row) => ({
      promotion_candidate_id: `batch9_promotion:${row.approval_item_id}`,
      approval_item_id: row.approval_item_id,
      approval_lane: row.approval_lane,
      source_ids: row.source_ids,
      affected_tables: row.affected_tables,
      promotion_status: 'manual_release_review_required',
      can_export: 'false',
      can_display_as_fact: 'false',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      blocking_reason: gatedReason(context, 'manual-release-review-required'),
    }));
}

const outputSpecs = {
  'erp_owner_approval_intake_contract.csv': [
    'approval_lane',
    'required_record_key',
    'required_fields',
    'decision_vocab',
    'promotion_rule',
    'fail_closed_rule',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
  ],
  'erp_owner_approval_validation_result.csv': [
    'validation_id',
    'approval_item_id',
    'approval_lane',
    'source_ids',
    'affected_tables',
    'owner_role',
    'priority',
    'approval_record_present',
    'approval_decision',
    'validation_status',
    'validation_messages',
    'can_export_decision',
    'can_display_as_fact_decision',
    'can_promote',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
  'erp_owner_approval_release_gate.csv': [
    'release_gate_id',
    'table_name',
    'surface',
    'source_ids',
    'evidence_artifact_path',
    'relevant_validation_rows',
    'passed_validation_rows',
    'release_status',
    'can_export',
    'can_display_as_fact',
    'required_next_step',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
  'erp_owner_approval_promotion_manifest.csv': [
    'promotion_candidate_id',
    'approval_item_id',
    'approval_lane',
    'source_ids',
    'affected_tables',
    'promotion_status',
    'can_export',
    'can_display_as_fact',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
};

function buildArtifacts(options = {}) {
  if (!existsSync(INPUTS.batch8Manifest)) throw new Error(`Missing Batch8 manifest: ${INPUTS.batch8Manifest}`);
  const context = buildEvidenceContext(options);
  const batch8Manifest = JSON.parse(readFileSync(INPUTS.batch8Manifest, 'utf8'));
  const backlogRows = readCsvObjects(INPUTS.approvalBacklog);
  const displayRows = readCsvObjects(INPUTS.displayTemplate);
  const approvalRecordsFilePath = resolveInputPath(options.approvalRecordsPath);
  const approvalRecords = approvalRecordsFilePath && existsSync(approvalRecordsFilePath)
    ? readCsvObjects(approvalRecordsFilePath)
    : [];

  const contractRows = buildContractRows(context);
  const validationRows = buildValidationRows(backlogRows, approvalRecords, context);
  const releaseRows = buildReleaseRows(displayRows, validationRows, context);
  const promotionRows = buildPromotionRows(validationRows, releaseRows, context);
  const blockedRows = validationRows.filter((row) => row.validation_status !== 'passed_owner_record_validation').length;

  const rowsByFile = {
    'erp_owner_approval_intake_contract.csv': contractRows,
    'erp_owner_approval_validation_result.csv': validationRows,
    'erp_owner_approval_release_gate.csv': releaseRows,
    'erp_owner_approval_promotion_manifest.csv': promotionRows,
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
    generatedRule: 'Local owner-approval intake validation from Batch8 backlog only; no ERP login, provider call, production write, approval fabrication, or automatic promotion.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
    evidenceGrade: context.evidenceGrade,
    privacyLevel: context.privacyLevel,
    canDisplayAsFact: false,
    blockingReason: context.blockingReason,
    fixtureMode: context.fixtureMode,
    upstreamBatch: {
      batchId: batch8Manifest.batchId,
      manifestPath: `tmp/exports/${INPUT_DIR_NAME}/batch8_erp_owner_approval_manifest.json`,
      approvalBacklogRows: batch8Manifest.summary?.approvalBacklogRows ?? null,
    },
    approvalRecordsInput: {
      provided: Boolean(options.approvalRecordsPath),
      path: options.approvalRecordsPath ?? '',
      resolvedPath: approvalRecordsFilePath ?? '',
      rowCount: approvalRecords.length,
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
      fieldDictionaryApproved: false,
      categoryApprovalGranted: false,
      subtotalBehaviorApproved: false,
      displayApprovalGranted: false,
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
      intakeContractRows: contractRows.length,
      approvalBacklogRows: backlogRows.length,
      approvalRecordsInputRows: approvalRecords.length,
      validationRows: validationRows.length,
      passedValidationRows: validationRows.length - blockedRows,
      blockedValidationRows: blockedRows,
      releaseGateRows: releaseRows.length,
      readyReleaseGateRows: releaseRows.filter((row) => row.release_status === 'ready_for_manual_release_review').length,
      promotionCandidateRows: promotionRows.length,
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
    writeFileSync(join(OUTPUT_DIR, 'batch9_erp_owner_approval_intake_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch9 owner approval intake ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.validationRows} validation rows, ${manifest.summary.blockedValidationRows} blocked rows, readyToDisplay=${manifest.summary.readyToDisplayRows}.\n`,
  );
}

main();
