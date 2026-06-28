#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const BATCH13_DIR_NAME = 'erp-owner-submission-pack-batch13-20260626';
const BATCH14_DIR_NAME = 'erp-owner-submission-dropbox-watchlist-batch14-20260627';
const OUTPUT_DIR_NAME = 'erp-owner-submission-acceptance-gate-batch15-20260627';
const TARGET_SUBMISSION_DIR = 'tmp/inputs/erp-owner-approval-submissions-batch12';
const BATCH13_DIR = join(repoRoot, 'tmp/exports', BATCH13_DIR_NAME);
const BATCH14_DIR = join(repoRoot, 'tmp/exports', BATCH14_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'owner-submission-acceptance-gate-awaits-real-csv';

const INPUTS = {
  batch13Manifest: join(BATCH13_DIR, 'batch13_erp_owner_submission_pack_manifest.json'),
  batch14Manifest: join(BATCH14_DIR, 'batch14_erp_owner_submission_dropbox_watchlist_manifest.json'),
  ownerActionQueue: join(BATCH14_DIR, 'erp_owner_submission_owner_action_queue.csv'),
  templateDistribution: join(BATCH14_DIR, 'erp_owner_submission_template_distribution.csv'),
  releaseWatchlist: join(BATCH14_DIR, 'erp_owner_submission_release_watchlist.csv'),
  commandRunbook: join(BATCH14_DIR, 'erp_owner_submission_command_runbook.csv'),
  fieldChecklist: join(BATCH13_DIR, 'erp_owner_submission_field_completion_checklist.csv'),
};

const outputSpecs = {
  'erp_owner_submission_acceptance_rulebook.csv': [
    'rule_id',
    'rule_name',
    'required_condition',
    'acceptance_status',
    'blocking_reason',
    'next_check',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
  ],
  'erp_owner_submission_acceptance_result.csv': [
    'acceptance_id',
    'approval_item_id',
    'approval_lane',
    'owner_role',
    'template_file',
    'required_uri_scheme',
    'acceptance_status',
    'missing_acceptance_inputs',
    'target_submission_dir',
    'next_batch12_command',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_evidence_uri_contract.csv': [
    'contract_id',
    'approval_lane',
    'owner_roles',
    'required_uri_scheme',
    'required_fields',
    'forbidden_values_policy',
    'current_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_release_acceptance_matrix.csv': [
    'release_acceptance_id',
    'release_gate_id',
    'table_name',
    'surface',
    'required_owner_records',
    'accepted_owner_records',
    'ready_for_batch12_rows',
    'batch11_queue_rows',
    'acceptance_status',
    'next_batch12_command',
    'evidence_grade',
    'privacy_level',
    'can_export',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_escalation_queue.csv': [
    'escalation_id',
    'approval_item_id',
    'approval_lane',
    'owner_role',
    'owner_action',
    'blocking_reason',
    'escalation_status',
    'next_command',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
  ],
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

function readCsvObjects(filePath) {
  if (!existsSync(filePath)) throw new Error(`Missing Batch15 input: ${filePath}`);
  const rows = parseCsv(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildRulebookRows() {
  return [
    {
      rule_id: 'batch15_rule:csv_presence',
      rule_name: 'Owner CSV must exist in Batch12 input',
      required_condition: `${TARGET_SUBMISSION_DIR} exists and contains one reviewed CSV`,
      next_check: 'Batch14 dropbox status csv_file_count > 0',
    },
    {
      rule_id: 'batch15_rule:all_approval_items_present',
      rule_name: 'All approval item IDs must be present',
      required_condition: 'CSV covers all 23 Batch13 approval_item_id rows',
      next_check: 'Batch12 schema audit matched_submission_rows',
    },
    {
      rule_id: 'batch15_rule:required_fields_complete',
      rule_name: 'Required approval fields must be complete',
      required_condition: 'approval_decision, approver_role, approver_name_hash, approval_date, approval_record_uri, and display/export decisions are populated',
      next_check: 'Batch12 schema audit and Batch11 preflight',
    },
    {
      rule_id: 'batch15_rule:evidence_uri_allowed',
      rule_name: 'Evidence URI must use allowed schemes',
      required_condition: 'approval_record_uri uses https://, approval://, dingtalk://, file-hash://, or s3://',
      next_check: 'Batch11 preflight URI validation',
    },
    {
      rule_id: 'batch15_rule:forbidden_values_clean',
      rule_name: 'Forbidden raw values must stay out',
      required_condition: 'raw SKU, product, customer, operator, warehouse, and credential values are not included in owner notes or exported outputs',
      next_check: 'Batch12 redaction audit and Batch11 forbidden scan',
    },
    {
      rule_id: 'batch15_rule:release_review_required',
      rule_name: 'Manual release review remains required',
      required_condition: 'Batch9 validation is not enough; manual release review is logged before display/export promotion',
      next_check: 'Manual release review artifact',
    },
  ].map((row) => ({
    ...row,
    acceptance_status: 'blocked_awaiting_real_owner_csv',
    blocking_reason: BLOCKING_REASON,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
  }));
}

function buildAcceptanceResultRows(actionRows) {
  return actionRows.map((row) => ({
    acceptance_id: `batch15_acceptance:${row.approval_item_id}`,
    approval_item_id: row.approval_item_id,
    approval_lane: row.approval_lane,
    owner_role: row.owner_role,
    template_file: row.template_file,
    required_uri_scheme: row.required_uri_scheme,
    acceptance_status: 'blocked_awaiting_real_owner_csv',
    missing_acceptance_inputs: 'owner_csv|approval_decision|approver_role|approver_name_hash|approval_date|approval_record_uri|forbidden_display_confirmed|display_export_decisions',
    target_submission_dir: TARGET_SUBMISSION_DIR,
    next_batch12_command: 'npm run data:erp:owner-submission-intake-batch12 -- --json',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildEvidenceUriContracts(checklistRows, templateRows) {
  const rowsByLane = new Map();
  for (const row of checklistRows) {
    const current = rowsByLane.get(row.approval_lane) ?? [];
    current.push(row);
    rowsByLane.set(row.approval_lane, current);
  }

  return [...rowsByLane.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([lane, rows]) => {
    const templates = templateRows.filter((template) => template.approval_lane === lane || template.approval_lane === 'all_owner_lanes');
    return {
      contract_id: `batch15_uri_contract:${lane}`,
      approval_lane: lane,
      owner_roles: unique(rows.map((row) => row.owner_role)).join(' | '),
      required_uri_scheme: unique(rows.map((row) => row.required_uri_scheme)).join(' | '),
      required_fields: unique(rows.map((row) => row.required_fields)).join(' | '),
      forbidden_values_policy: 'Do not include raw SKU, product, customer, operator, warehouse, credential, or approval note values in public outputs.',
      current_status: templates.length > 0 ? 'template_contract_ready_owner_csv_pending' : 'template_contract_missing',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
    };
  });
}

function buildReleaseAcceptanceMatrix(releaseRows) {
  return releaseRows.map((row) => ({
    release_acceptance_id: `batch15_release_acceptance:${row.release_gate_id}`,
    release_gate_id: row.release_gate_id,
    table_name: row.table_name,
    surface: row.surface,
    required_owner_records: row.required_owner_records,
    accepted_owner_records: 0,
    ready_for_batch12_rows: row.ready_for_batch12_rows ?? 0,
    batch11_queue_rows: row.batch11_queue_rows ?? 0,
    acceptance_status: 'blocked_awaiting_real_owner_csv',
    next_batch12_command: 'npm run data:erp:owner-submission-intake-batch12 -- --json',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_export: 'false',
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildEscalationRows(actionRows) {
  return actionRows.map((row) => ({
    escalation_id: `batch15_escalation:${row.approval_item_id}`,
    approval_item_id: row.approval_item_id,
    approval_lane: row.approval_lane,
    owner_role: row.owner_role,
    owner_action: row.owner_action,
    blocking_reason: BLOCKING_REASON,
    escalation_status: 'owner_input_required',
    next_command: 'npm run data:erp:owner-submission-dropbox-batch14 -- --json',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
  }));
}

function buildArtifacts() {
  for (const inputPath of Object.values(INPUTS)) {
    if (!existsSync(inputPath)) throw new Error(`Missing Batch15 input: ${inputPath}`);
  }

  const batch13Manifest = JSON.parse(readFileSync(INPUTS.batch13Manifest, 'utf8'));
  const batch14Manifest = JSON.parse(readFileSync(INPUTS.batch14Manifest, 'utf8'));
  const ownerActionRows = readCsvObjects(INPUTS.ownerActionQueue);
  const templateRows = readCsvObjects(INPUTS.templateDistribution);
  const releaseRows = readCsvObjects(INPUTS.releaseWatchlist);
  const commandRows = readCsvObjects(INPUTS.commandRunbook);
  const checklistRows = readCsvObjects(INPUTS.fieldChecklist);

  const rowsByFile = {
    'erp_owner_submission_acceptance_rulebook.csv': buildRulebookRows(),
    'erp_owner_submission_acceptance_result.csv': buildAcceptanceResultRows(ownerActionRows),
    'erp_owner_submission_evidence_uri_contract.csv': buildEvidenceUriContracts(checklistRows, templateRows),
    'erp_owner_submission_release_acceptance_matrix.csv': buildReleaseAcceptanceMatrix(releaseRows),
    'erp_owner_submission_escalation_queue.csv': buildEscalationRows(ownerActionRows),
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
    generatedRule: 'Read-only owner submission acceptance gate from Batch14 watchlist and Batch13 checklist; does not create the input directory, read approval CSV contents, apply approvals, call ERP, call providers, write production, or promote facts.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
    evidenceGrade: EVIDENCE_GRADE,
    privacyLevel: PRIVACY_LEVEL,
    canDisplayAsFact: false,
    blockingReason: BLOCKING_REASON,
    upstreamBatches: [
      {
        batchId: batch14Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH14_DIR_NAME}/batch14_erp_owner_submission_dropbox_watchlist_manifest.json`,
        submissionCsvFiles: batch14Manifest.summary?.submissionCsvFiles ?? null,
        ownerActionRows: batch14Manifest.summary?.ownerActionRows ?? null,
      },
      {
        batchId: batch13Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH13_DIR_NAME}/batch13_erp_owner_submission_pack_manifest.json`,
        templateFiles: batch13Manifest.summary?.templateFiles ?? null,
        checklistRows: batch13Manifest.summary?.checklistRows ?? null,
      },
    ],
    acceptanceInput: {
      targetSubmissionDir: TARGET_SUBMISSION_DIR,
      submissionCsvFiles: batch14Manifest.summary?.submissionCsvFiles ?? 0,
      rawCsvContentsRead: false,
      inputDirectoryCreated: false,
      commandRunbookRows: commandRows.length,
    },
    boundaries: {
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      inputDirectoryCreated: false,
      rawCsvContentsRead: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      rawApprovalValuesEchoed: false,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerSubmissionAcceptanceOnly: true,
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
      acceptanceRulebookRows: rowsByFile['erp_owner_submission_acceptance_rulebook.csv'].length,
      acceptanceResultRows: rowsByFile['erp_owner_submission_acceptance_result.csv'].length,
      evidenceUriContractRows: rowsByFile['erp_owner_submission_evidence_uri_contract.csv'].length,
      releaseAcceptanceRows: rowsByFile['erp_owner_submission_release_acceptance_matrix.csv'].length,
      escalationRows: rowsByFile['erp_owner_submission_escalation_queue.csv'].length,
      ownerActionRows: ownerActionRows.length,
      submissionCsvFiles: batch14Manifest.summary?.submissionCsvFiles ?? 0,
      submittedApprovalRecords: 0,
      acceptedOwnerRecords: 0,
      readyForBatch12Rows: 0,
      batch11QueueRows: batch14Manifest.summary?.batch11QueueRows ?? 0,
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
    writeFileSync(join(OUTPUT_DIR, 'batch15_erp_owner_submission_acceptance_gate_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch15 owner submission acceptance gate ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.acceptanceResultRows} acceptance rows, ${manifest.summary.releaseAcceptanceRows} release rows, acceptedOwnerRecords=${manifest.summary.acceptedOwnerRecords}.\n`,
  );
}

main();
