#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const BATCH8_DIR_NAME = 'erp-owner-approval-batch8-20260625';
const BATCH9_DIR_NAME = 'erp-owner-approval-intake-batch9-20260626';
const OUTPUT_DIR_NAME = 'erp-owner-approval-record-template-batch10-20260626';
const BATCH8_DIR = join(repoRoot, 'tmp/exports', BATCH8_DIR_NAME);
const BATCH9_DIR = join(repoRoot, 'tmp/exports', BATCH9_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'owner-approval-records-not-submitted';

const INPUTS = {
  batch8Manifest: join(BATCH8_DIR, 'batch8_erp_owner_approval_manifest.json'),
  batch9Manifest: join(BATCH9_DIR, 'batch9_erp_owner_approval_intake_manifest.json'),
  approvalBacklog: join(BATCH8_DIR, 'erp_owner_approval_backlog.csv'),
  intakeContract: join(BATCH9_DIR, 'erp_owner_approval_intake_contract.csv'),
  releaseGate: join(BATCH9_DIR, 'erp_owner_approval_release_gate.csv'),
};

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
  };
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
  if (!existsSync(filePath)) throw new Error(`Missing Batch10 input: ${filePath}`);
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

function splitList(value) {
  return String(value ?? '')
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function contractByLane(contractRows) {
  return new Map(contractRows.map((row) => [row.approval_lane, row]));
}

function buildOwnerPacketRows(backlogRows, contractRows) {
  const contractMap = contractByLane(contractRows);
  const grouped = new Map();
  for (const row of backlogRows) {
    const key = row.approval_lane;
    const current = grouped.get(key) ?? {
      approval_lane: key,
      editable_packet: row.editable_packet,
      owner_role: row.owner_role,
      backlog_items: 0,
      p0_items: 0,
      p1_items: 0,
      required_fields: contractMap.get(key)?.required_fields ?? '',
      decision_vocab: contractMap.get(key)?.decision_vocab ?? '',
      submission_status: 'awaiting-owner-records',
      can_display_as_fact: 'false',
    };
    current.backlog_items += 1;
    if (row.priority === 'P0') current.p0_items += 1;
    if (row.priority === 'P1') current.p1_items += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()];
}

function buildRecordTemplateRows(backlogRows, contractRows) {
  const contractMap = contractByLane(contractRows);
  return backlogRows.map((row) => ({
    approval_item_id: row.approval_item_id,
    approval_lane: row.approval_lane,
    source_ids: row.source_ids,
    affected_tables: row.affected_tables,
    owner_role: row.owner_role,
    priority: row.priority,
    required_decision: row.required_decision,
    required_fields: contractMap.get(row.approval_lane)?.required_fields ?? '',
    approval_decision: '',
    approver_role: '',
    approver_name_hash: '',
    approval_date: '',
    approval_record_uri: '',
    allowed_display_scope: row.approval_lane === 'display_approval_record' ? 'gated readiness metadata only unless release review approves more' : '',
    forbidden_display_confirmed: 'false',
    can_export_decision: 'false',
    can_display_as_fact_decision: 'false',
    owner_notes: '',
    submission_status: 'template-awaiting-owner-input',
    next_validator_command: `npm run data:erp:owner-approval-intake-batch9 -- --approval-records tmp/exports/${OUTPUT_DIR_NAME}/erp_owner_approval_record_input_template.csv --json`,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildEvidenceRows(backlogRows, contractRows) {
  const contractMap = contractByLane(contractRows);
  return backlogRows.map((row) => ({
    approval_item_id: row.approval_item_id,
    approval_lane: row.approval_lane,
    source_ids: row.source_ids,
    affected_tables: row.affected_tables,
    owner_role: row.owner_role,
    priority: row.priority,
    required_evidence: row.required_evidence,
    acceptance_criteria: row.acceptance_criteria,
    required_record_fields: contractMap.get(row.approval_lane)?.required_fields ?? '',
    required_uri_scheme: 'https://|approval://|dingtalk://|file-hash://|s3://',
    forbidden_raw_values: 'raw SKU, raw product name, customer, operator, warehouse, GMV, market share, TAM/SAM/SOM, public KPI',
    validator: 'build-erp-owner-approval-intake-batch9.mjs --approval-records',
    readiness_status: 'awaiting-owner-record',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildSubmissionRows(releaseRows, templateRows) {
  return releaseRows.map((row) => {
    const sourceIds = splitList(row.source_ids);
    const relatedTemplateRows = templateRows.filter((templateRow) => {
      const templateSourceIds = splitList(templateRow.source_ids);
      return templateRow.affected_tables === row.table_name || templateSourceIds.some((sourceId) => sourceIds.includes(sourceId));
    });
    return {
      release_gate_id: row.release_gate_id,
      table_name: row.table_name,
      surface: row.surface,
      source_ids: row.source_ids,
      required_owner_records: row.relevant_validation_rows,
      template_rows_available: relatedTemplateRows.length,
      submitted_owner_records: '0',
      missing_owner_records: row.relevant_validation_rows,
      current_release_status: row.release_status,
      next_validator_command: `npm run data:erp:owner-approval-intake-batch9 -- --approval-records tmp/exports/${OUTPUT_DIR_NAME}/erp_owner_approval_record_input_template.csv --json`,
      can_export: 'false',
      can_display_as_fact: 'false',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      blocking_reason: BLOCKING_REASON,
    };
  });
}

const outputSpecs = {
  'erp_owner_approval_owner_packet_index.csv': [
    'approval_lane',
    'editable_packet',
    'owner_role',
    'backlog_items',
    'p0_items',
    'p1_items',
    'required_fields',
    'decision_vocab',
    'submission_status',
    'can_display_as_fact',
  ],
  'erp_owner_approval_record_input_template.csv': [
    'approval_item_id',
    'approval_lane',
    'source_ids',
    'affected_tables',
    'owner_role',
    'priority',
    'required_decision',
    'required_fields',
    'approval_decision',
    'approver_role',
    'approver_name_hash',
    'approval_date',
    'approval_record_uri',
    'allowed_display_scope',
    'forbidden_display_confirmed',
    'can_export_decision',
    'can_display_as_fact_decision',
    'owner_notes',
    'submission_status',
    'next_validator_command',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_approval_required_evidence_matrix.csv': [
    'approval_item_id',
    'approval_lane',
    'source_ids',
    'affected_tables',
    'owner_role',
    'priority',
    'required_evidence',
    'acceptance_criteria',
    'required_record_fields',
    'required_uri_scheme',
    'forbidden_raw_values',
    'validator',
    'readiness_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_approval_submission_readiness.csv': [
    'release_gate_id',
    'table_name',
    'surface',
    'source_ids',
    'required_owner_records',
    'template_rows_available',
    'submitted_owner_records',
    'missing_owner_records',
    'current_release_status',
    'next_validator_command',
    'can_export',
    'can_display_as_fact',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
};

function buildArtifacts() {
  for (const inputPath of Object.values(INPUTS)) {
    if (!existsSync(inputPath)) throw new Error(`Missing Batch10 input: ${inputPath}`);
  }
  const batch8Manifest = JSON.parse(readFileSync(INPUTS.batch8Manifest, 'utf8'));
  const batch9Manifest = JSON.parse(readFileSync(INPUTS.batch9Manifest, 'utf8'));
  const backlogRows = readCsvObjects(INPUTS.approvalBacklog);
  const contractRows = readCsvObjects(INPUTS.intakeContract);
  const releaseRows = readCsvObjects(INPUTS.releaseGate);

  const ownerPacketRows = buildOwnerPacketRows(backlogRows, contractRows);
  const templateRows = buildRecordTemplateRows(backlogRows, contractRows);
  const evidenceRows = buildEvidenceRows(backlogRows, contractRows);
  const submissionRows = buildSubmissionRows(releaseRows, templateRows);

  const rowsByFile = {
    'erp_owner_approval_owner_packet_index.csv': ownerPacketRows,
    'erp_owner_approval_record_input_template.csv': templateRows,
    'erp_owner_approval_required_evidence_matrix.csv': evidenceRows,
    'erp_owner_approval_submission_readiness.csv': submissionRows,
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
    generatedRule: 'Local owner-approval record template from Batch8 backlog and Batch9 contract only; no approval fabrication, ERP login, provider call, production write, or automatic promotion.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
    evidenceGrade: EVIDENCE_GRADE,
    privacyLevel: PRIVACY_LEVEL,
    canDisplayAsFact: false,
    blockingReason: BLOCKING_REASON,
    upstreamBatches: [
      {
        batchId: batch8Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH8_DIR_NAME}/batch8_erp_owner_approval_manifest.json`,
        approvalBacklogRows: batch8Manifest.summary?.approvalBacklogRows ?? null,
      },
      {
        batchId: batch9Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH9_DIR_NAME}/batch9_erp_owner_approval_intake_manifest.json`,
        validationRows: batch9Manifest.summary?.validationRows ?? null,
        blockedValidationRows: batch9Manifest.summary?.blockedValidationRows ?? null,
      },
    ],
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
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerRecordTemplateOnly: true,
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
      ownerPacketIndexRows: ownerPacketRows.length,
      approvalRecordTemplateRows: templateRows.length,
      requiredEvidenceRows: evidenceRows.length,
      submissionReadinessRows: submissionRows.length,
      prefilledApprovalItemIds: templateRows.filter((row) => row.approval_item_id).length,
      blankDecisionRows: templateRows.filter((row) => row.approval_decision === '').length,
      submittedOwnerRecords: 0,
      readyToValidateRows: 0,
      readyToDisplayRows: 0,
      readyToExportRows: 0,
      validationPassed: false,
    },
  };

  return { files: materialized, manifest };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { files, manifest } = buildArtifacts();

  if (!args.noWrite) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    for (const [fileName, file] of Object.entries(files)) writeFileSync(join(OUTPUT_DIR, fileName), file.csv, 'utf8');
    writeFileSync(join(OUTPUT_DIR, 'batch10_erp_owner_approval_record_template_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch10 owner approval record template ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.approvalRecordTemplateRows} template rows, submittedOwnerRecords=${manifest.summary.submittedOwnerRecords}, readyToDisplay=${manifest.summary.readyToDisplayRows}.\n`,
  );
}

main();
