#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const BATCH10_DIR_NAME = 'erp-owner-approval-record-template-batch10-20260626';
const BATCH12_DIR_NAME = 'erp-owner-submission-intake-batch12-20260626';
const OUTPUT_DIR_NAME = 'erp-owner-submission-pack-batch13-20260626';
const TEMPLATE_DIR_NAME = 'owner-submission-templates';
const TARGET_SUBMISSION_DIR = 'tmp/inputs/erp-owner-approval-submissions-batch12';
const BATCH10_DIR = join(repoRoot, 'tmp/exports', BATCH10_DIR_NAME);
const BATCH12_DIR = join(repoRoot, 'tmp/exports', BATCH12_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const TEMPLATE_DIR = join(OUTPUT_DIR, TEMPLATE_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'owner-submission-pack-is-template-only';
const EDITABLE_FIELDS = [
  'approval_decision',
  'approver_role',
  'approver_name_hash',
  'approval_date',
  'approval_record_uri',
  'forbidden_display_confirmed',
  'can_export_decision',
  'can_display_as_fact_decision',
  'owner_notes',
];
const BLANK_FIELDS = [
  'approval_decision',
  'approver_role',
  'approver_name_hash',
  'approval_date',
  'approval_record_uri',
  'owner_notes',
];

const INPUTS = {
  batch10Manifest: join(BATCH10_DIR, 'batch10_erp_owner_approval_record_template_manifest.json'),
  recordTemplate: join(BATCH10_DIR, 'erp_owner_approval_record_input_template.csv'),
  requiredEvidence: join(BATCH10_DIR, 'erp_owner_approval_required_evidence_matrix.csv'),
  submissionReadiness: join(BATCH10_DIR, 'erp_owner_approval_submission_readiness.csv'),
  batch12Manifest: join(BATCH12_DIR, 'batch12_erp_owner_submission_intake_manifest.json'),
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
  if (!existsSync(filePath)) throw new Error(`Missing Batch13 input: ${filePath}`);
  return parseCsv(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function readCsvObjects(filePath) {
  const rows = readCsvRows(filePath);
  const headers = rows[0] ?? [];
  return {
    headers,
    rows: rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))),
  };
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

function templateFileName(lane) {
  return lane === 'all_owner_lanes' ? 'combined_owner_submission_template.csv' : `${lane}_submission_template.csv`;
}

function withBatch12Command(row) {
  return {
    ...row,
    submission_status: 'template-awaiting-owner-input',
    next_validator_command: 'npm run data:erp:owner-submission-intake-batch12 -- --json',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  };
}

function buildTemplateFiles(recordHeaders, recordRows) {
  const lanes = [...new Set(recordRows.map((row) => row.approval_lane))].sort();
  const specs = [
    {
      templateId: 'batch13_template:all_owner_lanes',
      approvalLane: 'all_owner_lanes',
      templateScope: 'combined-owner-submission-template',
      rows: recordRows.map(withBatch12Command),
    },
    ...lanes.map((lane) => ({
      templateId: `batch13_template:${lane}`,
      approvalLane: lane,
      templateScope: 'lane-owner-submission-template',
      rows: recordRows.filter((row) => row.approval_lane === lane).map(withBatch12Command),
    })),
  ];

  return specs.map((spec) => {
    const fileName = templateFileName(spec.approvalLane);
    const relativePath = `tmp/exports/${OUTPUT_DIR_NAME}/${TEMPLATE_DIR_NAME}/${fileName}`;
    const csv = toCsv(spec.rows, recordHeaders);
    return {
      ...spec,
      fileName,
      path: relativePath,
      rowCount: spec.rows.length,
      csv,
      sha256: fileHash(csv),
    };
  });
}

function groupedOwnerRole(rows) {
  return [...new Set(rows.map((row) => row.owner_role).filter(Boolean))].join(' | ');
}

function buildPacketIndexRows(templateFiles) {
  return templateFiles.map((template) => ({
    packet_id: template.templateId.replace('batch13_template:', 'batch13_packet:'),
    packet_type: template.templateScope,
    approval_lane: template.approvalLane,
    owner_role: groupedOwnerRole(template.rows),
    template_file: template.path,
    approval_item_count: template.rowCount,
    target_submission_dir: TARGET_SUBMISSION_DIR,
    next_batch12_command: 'npm run data:erp:owner-submission-intake-batch12 -- --json',
    current_status: 'template_only_not_submitted',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildTemplateManifestRows(templateFiles) {
  return templateFiles.map((template) => ({
    template_id: template.templateId,
    template_scope: template.templateScope,
    approval_lane: template.approvalLane,
    template_file: template.path,
    row_count: template.rowCount,
    editable_fields: EDITABLE_FIELDS.join('|'),
    locked_fields: 'approval_item_id|approval_lane|source_ids|affected_tables|owner_role|required_decision|required_fields',
    sha256: template.sha256,
    current_status: 'blank_template_generated',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function indexRequiredEvidence(requiredEvidenceRows) {
  return new Map(requiredEvidenceRows.map((row) => [row.approval_item_id, row]));
}

function buildChecklistRows(recordRows, requiredEvidenceRows) {
  const requiredEvidenceById = indexRequiredEvidence(requiredEvidenceRows);
  return recordRows.map((row) => {
    const evidence = requiredEvidenceById.get(row.approval_item_id) ?? {};
    return {
      checklist_id: `batch13_checklist:${row.approval_item_id}`,
      approval_item_id: row.approval_item_id,
      approval_lane: row.approval_lane,
      owner_role: row.owner_role,
      source_ids: row.source_ids,
      affected_tables: row.affected_tables,
      required_decision: row.required_decision,
      required_fields: row.required_fields,
      blank_fields_to_complete: BLANK_FIELDS.join('|'),
      required_uri_scheme: evidence.required_uri_scheme ?? 'https://|approval://|dingtalk://|file-hash://|s3://',
      forbidden_display_required: 'true',
      owner_action: 'fill template fields, keep raw business values out, then submit one reviewed CSV through Batch12 intake',
      next_step: 'Batch12 intake audit before Batch11 preflight',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
    };
  });
}

function buildReleaseMatrixRows(readinessRows, templateFiles) {
  const allTemplate = templateFiles.find((template) => template.approvalLane === 'all_owner_lanes');
  return readinessRows.map((row) => ({
    release_gate_id: row.release_gate_id,
    table_name: row.table_name,
    surface: row.surface,
    source_ids: row.source_ids,
    required_owner_records: row.required_owner_records,
    template_rows_available: row.template_rows_available,
    submission_template_file: allTemplate?.path ?? '',
    target_submission_dir: TARGET_SUBMISSION_DIR,
    current_release_status: row.current_release_status,
    next_batch12_command: 'npm run data:erp:owner-submission-intake-batch12 -- --json',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_export: 'false',
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildHandoffGuideRows() {
  return [
    {
      step_id: 'batch13_step:01_distribute_templates',
      step_order: 1,
      action: 'Distribute the combined template or lane templates to the accountable owner roles.',
      required_evidence: 'Owner receives the exact Batch13 template path and Batch10 approval_item_id list.',
      next_command: '',
      current_status: 'template_only_not_submitted',
    },
    {
      step_id: 'batch13_step:02_owner_fill_records',
      step_order: 2,
      action: 'Owners fill only the editable approval fields and keep raw SKU, product, customer, operator, warehouse, and credential values out of notes.',
      required_evidence: 'approval_decision, approver_role, approver_name_hash, approval_date, approval_record_uri, forbidden_display_confirmed, and display/export decisions are complete.',
      next_command: '',
      current_status: 'awaiting_real_owner_records',
    },
    {
      step_id: 'batch13_step:03_submit_single_csv',
      step_order: 3,
      action: `Place the reviewed owner CSV in ${TARGET_SUBMISSION_DIR}.`,
      required_evidence: 'One reviewed CSV exists in the Batch12 submission directory; templates remain outside the intake directory.',
      next_command: 'npm run data:erp:owner-submission-intake-batch12 -- --json',
      current_status: 'blocked_no_submission_csv',
    },
    {
      step_id: 'batch13_step:04_preflight',
      step_order: 4,
      action: 'If Batch12 creates a Batch11 queue, run the generated Batch11 preflight command.',
      required_evidence: 'Batch12 schema_ready_rows and redaction_clean_rows cover all 23 expected records.',
      next_command: 'npm run data:erp:owner-approval-preflight-batch11 -- --approval-records <approved-owner-records.csv> --json',
      current_status: 'blocked_until_batch12_queue_exists',
    },
    {
      step_id: 'batch13_step:05_validate_and_review',
      step_order: 5,
      action: 'Run Batch9 validation and complete manual release review before any display or export promotion.',
      required_evidence: 'Batch9 validation passes and manual release review is logged.',
      next_command: 'npm run data:erp:owner-approval-intake-batch9 -- --approval-records <approved-owner-records.csv> --json',
      current_status: 'blocked_until_batch11_preflight_passes',
    },
  ].map((row) => ({
    ...row,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

const outputSpecs = {
  'erp_owner_submission_packet_index.csv': [
    'packet_id',
    'packet_type',
    'approval_lane',
    'owner_role',
    'template_file',
    'approval_item_count',
    'target_submission_dir',
    'next_batch12_command',
    'current_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_template_manifest.csv': [
    'template_id',
    'template_scope',
    'approval_lane',
    'template_file',
    'row_count',
    'editable_fields',
    'locked_fields',
    'sha256',
    'current_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_field_completion_checklist.csv': [
    'checklist_id',
    'approval_item_id',
    'approval_lane',
    'owner_role',
    'source_ids',
    'affected_tables',
    'required_decision',
    'required_fields',
    'blank_fields_to_complete',
    'required_uri_scheme',
    'forbidden_display_required',
    'owner_action',
    'next_step',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_release_packet_matrix.csv': [
    'release_gate_id',
    'table_name',
    'surface',
    'source_ids',
    'required_owner_records',
    'template_rows_available',
    'submission_template_file',
    'target_submission_dir',
    'current_release_status',
    'next_batch12_command',
    'evidence_grade',
    'privacy_level',
    'can_export',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_handoff_guide.csv': [
    'step_id',
    'step_order',
    'action',
    'required_evidence',
    'next_command',
    'current_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
};

function buildArtifacts() {
  for (const inputPath of Object.values(INPUTS)) {
    if (!existsSync(inputPath)) throw new Error(`Missing Batch13 input: ${inputPath}`);
  }

  const batch10Manifest = JSON.parse(readFileSync(INPUTS.batch10Manifest, 'utf8'));
  const batch12Manifest = JSON.parse(readFileSync(INPUTS.batch12Manifest, 'utf8'));
  const { headers: recordHeaders, rows: recordRows } = readCsvObjects(INPUTS.recordTemplate);
  const { rows: requiredEvidenceRows } = readCsvObjects(INPUTS.requiredEvidence);
  const { rows: readinessRows } = readCsvObjects(INPUTS.submissionReadiness);
  const templateFiles = buildTemplateFiles(recordHeaders, recordRows);

  const rowsByFile = {
    'erp_owner_submission_packet_index.csv': buildPacketIndexRows(templateFiles),
    'erp_owner_submission_template_manifest.csv': buildTemplateManifestRows(templateFiles),
    'erp_owner_submission_field_completion_checklist.csv': buildChecklistRows(recordRows, requiredEvidenceRows),
    'erp_owner_submission_release_packet_matrix.csv': buildReleaseMatrixRows(readinessRows, templateFiles),
    'erp_owner_submission_handoff_guide.csv': buildHandoffGuideRows(),
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
    generatedRule: 'Local owner submission pack generation from Batch10 templates before Batch12 intake; no approval fabrication, ERP login, provider call, production write, or automatic promotion.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
    evidenceGrade: EVIDENCE_GRADE,
    privacyLevel: PRIVACY_LEVEL,
    canDisplayAsFact: false,
    blockingReason: BLOCKING_REASON,
    upstreamBatches: [
      {
        batchId: batch10Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH10_DIR_NAME}/batch10_erp_owner_approval_record_template_manifest.json`,
        approvalRecordTemplateRows: batch10Manifest.summary?.approvalRecordTemplateRows ?? null,
      },
      {
        batchId: batch12Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH12_DIR_NAME}/batch12_erp_owner_submission_intake_manifest.json`,
        submissionCsvFiles: batch12Manifest.summary?.submissionCsvFiles ?? null,
        batch11QueueRows: batch12Manifest.summary?.batch11QueueRows ?? null,
      },
    ],
    templateOutput: {
      targetSubmissionDir: TARGET_SUBMISSION_DIR,
      templateDir: `tmp/exports/${OUTPUT_DIR_NAME}/${TEMPLATE_DIR_NAME}`,
      templateFiles: Object.fromEntries(
        templateFiles.map((template) => [
          template.fileName,
          {
            path: template.path,
            rowCount: template.rowCount,
            sha256: template.sha256,
            approvalLane: template.approvalLane,
          },
        ]),
      ),
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
      rawApprovalValuesEchoed: false,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerSubmissionPackOnly: true,
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
      packetIndexRows: rowsByFile['erp_owner_submission_packet_index.csv'].length,
      templateManifestRows: rowsByFile['erp_owner_submission_template_manifest.csv'].length,
      templateFiles: templateFiles.length,
      combinedTemplateRows: recordRows.length,
      laneTemplateRows: templateFiles.filter((template) => template.approvalLane !== 'all_owner_lanes').reduce((sum, template) => sum + template.rowCount, 0),
      checklistRows: rowsByFile['erp_owner_submission_field_completion_checklist.csv'].length,
      releasePacketRows: rowsByFile['erp_owner_submission_release_packet_matrix.csv'].length,
      handoffGuideRows: rowsByFile['erp_owner_submission_handoff_guide.csv'].length,
      readyForBatch12Rows: 0,
      submittedApprovalRecords: 0,
      readyToDisplayRows: 0,
      readyToExportRows: 0,
      validationPassed: false,
    },
  };

  return { files: materialized, templateFiles, manifest };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { files, templateFiles, manifest } = buildArtifacts();

  if (!args.noWrite) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    mkdirSync(TEMPLATE_DIR, { recursive: true });
    for (const [fileName, file] of Object.entries(files)) writeFileSync(join(OUTPUT_DIR, fileName), file.csv, 'utf8');
    for (const template of templateFiles) writeFileSync(join(TEMPLATE_DIR, template.fileName), template.csv, 'utf8');
    writeFileSync(join(OUTPUT_DIR, 'batch13_erp_owner_submission_pack_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch13 owner submission pack ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.templateFiles} template files, ${manifest.summary.checklistRows} checklist rows, readyForBatch12Rows=${manifest.summary.readyForBatch12Rows}.\n`,
  );
}

main();
