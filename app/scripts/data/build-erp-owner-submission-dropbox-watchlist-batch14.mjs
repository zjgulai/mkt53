#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const BATCH12_DIR_NAME = 'erp-owner-submission-intake-batch12-20260626';
const BATCH13_DIR_NAME = 'erp-owner-submission-pack-batch13-20260626';
const OUTPUT_DIR_NAME = 'erp-owner-submission-dropbox-watchlist-batch14-20260627';
const TARGET_SUBMISSION_DIR = 'tmp/inputs/erp-owner-approval-submissions-batch12';
const BATCH12_DIR = join(repoRoot, 'tmp/exports', BATCH12_DIR_NAME);
const BATCH13_DIR = join(repoRoot, 'tmp/exports', BATCH13_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'owner-submission-csv-not-present';

const INPUTS = {
  batch12Manifest: join(BATCH12_DIR, 'batch12_erp_owner_submission_intake_manifest.json'),
  batch13Manifest: join(BATCH13_DIR, 'batch13_erp_owner_submission_pack_manifest.json'),
  packetIndex: join(BATCH13_DIR, 'erp_owner_submission_packet_index.csv'),
  templateManifest: join(BATCH13_DIR, 'erp_owner_submission_template_manifest.csv'),
  fieldChecklist: join(BATCH13_DIR, 'erp_owner_submission_field_completion_checklist.csv'),
  releaseMatrix: join(BATCH13_DIR, 'erp_owner_submission_release_packet_matrix.csv'),
  handoffGuide: join(BATCH13_DIR, 'erp_owner_submission_handoff_guide.csv'),
};

const outputSpecs = {
  'erp_owner_submission_dropbox_status.csv': [
    'dropbox_id',
    'target_submission_dir',
    'directory_exists',
    'csv_file_count',
    'submitted_csv_files',
    'submitted_owner_records',
    'ready_for_batch12_rows',
    'batch12_current_csv_files',
    'batch12_batch11_queue_rows',
    'current_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_owner_action_queue.csv': [
    'action_id',
    'approval_item_id',
    'approval_lane',
    'owner_role',
    'source_ids',
    'affected_tables',
    'template_file',
    'blank_fields_to_complete',
    'required_uri_scheme',
    'target_submission_dir',
    'owner_action',
    'current_status',
    'next_batch12_command',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_template_distribution.csv': [
    'distribution_id',
    'template_id',
    'approval_lane',
    'template_file',
    'row_count',
    'sha256',
    'owner_roles',
    'target_submission_dir',
    'distribution_status',
    'owner_action',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_release_watchlist.csv': [
    'watchlist_id',
    'release_gate_id',
    'table_name',
    'surface',
    'source_ids',
    'required_owner_records',
    'template_rows_available',
    'submitted_owner_records',
    'ready_for_batch12_rows',
    'batch11_queue_rows',
    'current_status',
    'blocking_reason',
    'evidence_grade',
    'privacy_level',
    'can_export',
    'can_display_as_fact',
  ],
  'erp_owner_submission_command_runbook.csv': [
    'step_id',
    'step_order',
    'command',
    'prerequisite',
    'expected_output',
    'current_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
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
  if (!existsSync(filePath)) throw new Error(`Missing Batch14 input: ${filePath}`);
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

function safeCsvInventory(relativeDir) {
  const absoluteDir = join(repoRoot, relativeDir);
  if (!existsSync(absoluteDir) || !statSync(absoluteDir).isDirectory()) {
    return {
      directoryExists: false,
      files: [],
    };
  }

  const files = readdirSync(absoluteDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.csv'))
    .sort()
    .map((fileName) => ({
      fileName,
      filePath: `${relativeDir}/${fileName}`,
      fileNameHash: fileHash(fileName),
    }));

  return {
    directoryExists: true,
    files,
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function indexTemplates(templateRows) {
  const byLane = new Map();
  const combined = templateRows.find((row) => row.approval_lane === 'all_owner_lanes');

  for (const row of templateRows) byLane.set(row.approval_lane, row);

  return {
    get(lane) {
      return byLane.get(lane) ?? combined ?? {};
    },
  };
}

function buildDropboxStatusRows(batch12Manifest, inventory) {
  return [
    {
      dropbox_id: 'batch14_dropbox:owner_submission_batch12_input',
      target_submission_dir: TARGET_SUBMISSION_DIR,
      directory_exists: String(inventory.directoryExists),
      csv_file_count: inventory.files.length,
      submitted_csv_files: inventory.files.map((file) => file.fileNameHash).join('|'),
      submitted_owner_records: 0,
      ready_for_batch12_rows: 0,
      batch12_current_csv_files: batch12Manifest.summary?.submissionCsvFiles ?? 0,
      batch12_batch11_queue_rows: batch12Manifest.summary?.batch11QueueRows ?? 0,
      current_status: inventory.files.length > 0 ? 'csv_present_requires_batch12_audit' : 'blocked_no_owner_submission_csv',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
    },
  ];
}

function buildOwnerActionRows(checklistRows, templateRows) {
  const templates = indexTemplates(templateRows);

  return checklistRows.map((row) => {
    const template = templates.get(row.approval_lane);
    return {
      action_id: `batch14_owner_action:${row.approval_item_id}`,
      approval_item_id: row.approval_item_id,
      approval_lane: row.approval_lane,
      owner_role: row.owner_role,
      source_ids: row.source_ids,
      affected_tables: row.affected_tables,
      template_file: template.template_file ?? '',
      blank_fields_to_complete: row.blank_fields_to_complete,
      required_uri_scheme: row.required_uri_scheme,
      target_submission_dir: TARGET_SUBMISSION_DIR,
      owner_action: 'fill the template row, remove raw business values from notes, submit one reviewed CSV to Batch12 input',
      current_status: 'awaiting_real_owner_record',
      next_batch12_command: 'npm run data:erp:owner-submission-intake-batch12 -- --json',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
    };
  });
}

function buildTemplateDistributionRows(templateRows, packetRows) {
  return templateRows.map((row) => ({
    distribution_id: `batch14_distribution:${row.template_id}`,
    template_id: row.template_id,
    approval_lane: row.approval_lane,
    template_file: row.template_file,
    row_count: row.row_count,
    sha256: row.sha256,
    owner_roles: unique(packetRows.filter((packet) => packet.approval_lane === row.approval_lane).map((packet) => packet.owner_role)).join(' | ') || 'multiple owner roles',
    target_submission_dir: TARGET_SUBMISSION_DIR,
    distribution_status: 'ready_to_distribute_template_only',
    owner_action: 'send template to accountable owner and collect one reviewed CSV outside the app before Batch12 intake',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildReleaseWatchlistRows(releaseRows, batch12Manifest) {
  return releaseRows.map((row) => ({
    watchlist_id: `batch14_release_watch:${row.release_gate_id}`,
    release_gate_id: row.release_gate_id,
    table_name: row.table_name,
    surface: row.surface,
    source_ids: row.source_ids,
    required_owner_records: row.required_owner_records,
    template_rows_available: row.template_rows_available,
    submitted_owner_records: 0,
    ready_for_batch12_rows: 0,
    batch11_queue_rows: batch12Manifest.summary?.batch11QueueRows ?? 0,
    current_status: 'blocked_no_owner_submission_csv',
    blocking_reason: BLOCKING_REASON,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_export: 'false',
    can_display_as_fact: 'false',
  }));
}

function buildCommandRunbookRows() {
  return [
    {
      step_id: 'batch14_command:01_check_dropbox',
      step_order: 1,
      command: 'npm run data:erp:owner-submission-dropbox-batch14 -- --json',
      prerequisite: 'Batch13 template pack exists',
      expected_output: 'dropbox status, owner action queue, template distribution, release watchlist',
      current_status: 'ready_to_run_read_only',
    },
    {
      step_id: 'batch14_command:02_submit_owner_csv',
      step_order: 2,
      command: 'place reviewed owner CSV in tmp/inputs/erp-owner-approval-submissions-batch12/',
      prerequisite: 'business owners have completed approvals and evidence URI fields',
      expected_output: 'one reviewed CSV is present for Batch12 audit',
      current_status: 'awaiting_owner_submission',
    },
    {
      step_id: 'batch14_command:03_batch12_intake',
      step_order: 3,
      command: 'npm run data:erp:owner-submission-intake-batch12 -- --json',
      prerequisite: 'reviewed CSV exists in Batch12 input directory',
      expected_output: 'schema/redaction audit and Batch11 queue if complete',
      current_status: 'blocked_until_owner_csv_exists',
    },
    {
      step_id: 'batch14_command:04_batch11_preflight',
      step_order: 4,
      command: 'npm run data:erp:owner-approval-preflight-batch11 -- --approval-records <approved-owner-records.csv> --json',
      prerequisite: 'Batch12 schema and redaction audit pass',
      expected_output: 'Batch9 handoff queue if all preflight rules pass',
      current_status: 'blocked_until_batch12_passes',
    },
    {
      step_id: 'batch14_command:05_batch9_validate',
      step_order: 5,
      command: 'npm run data:erp:owner-approval-intake-batch9 -- --approval-records <approved-owner-records.csv> --json',
      prerequisite: 'Batch11 preflight passes and manual release review is scheduled',
      expected_output: 'promotion candidates only after release review',
      current_status: 'blocked_until_batch11_passes',
    },
  ].map((row) => ({
    ...row,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildArtifacts() {
  for (const inputPath of Object.values(INPUTS)) {
    if (!existsSync(inputPath)) throw new Error(`Missing Batch14 input: ${inputPath}`);
  }

  const batch12Manifest = JSON.parse(readFileSync(INPUTS.batch12Manifest, 'utf8'));
  const batch13Manifest = JSON.parse(readFileSync(INPUTS.batch13Manifest, 'utf8'));
  const packetRows = readCsvObjects(INPUTS.packetIndex);
  const templateRows = readCsvObjects(INPUTS.templateManifest);
  const checklistRows = readCsvObjects(INPUTS.fieldChecklist);
  const releaseRows = readCsvObjects(INPUTS.releaseMatrix);
  const handoffRows = readCsvObjects(INPUTS.handoffGuide);
  const inventory = safeCsvInventory(TARGET_SUBMISSION_DIR);

  const rowsByFile = {
    'erp_owner_submission_dropbox_status.csv': buildDropboxStatusRows(batch12Manifest, inventory),
    'erp_owner_submission_owner_action_queue.csv': buildOwnerActionRows(checklistRows, templateRows),
    'erp_owner_submission_template_distribution.csv': buildTemplateDistributionRows(templateRows, packetRows),
    'erp_owner_submission_release_watchlist.csv': buildReleaseWatchlistRows(releaseRows, batch12Manifest),
    'erp_owner_submission_command_runbook.csv': buildCommandRunbookRows(),
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
    generatedRule: 'Read-only owner submission dropbox watchlist from Batch13 templates and Batch12 intake status; does not create the input directory, read approval CSV contents, apply approvals, call ERP, call providers, write production, or promote facts.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
    evidenceGrade: EVIDENCE_GRADE,
    privacyLevel: PRIVACY_LEVEL,
    canDisplayAsFact: false,
    blockingReason: BLOCKING_REASON,
    upstreamBatches: [
      {
        batchId: batch13Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH13_DIR_NAME}/batch13_erp_owner_submission_pack_manifest.json`,
        templateFiles: batch13Manifest.summary?.templateFiles ?? null,
        checklistRows: batch13Manifest.summary?.checklistRows ?? null,
      },
      {
        batchId: batch12Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH12_DIR_NAME}/batch12_erp_owner_submission_intake_manifest.json`,
        submissionCsvFiles: batch12Manifest.summary?.submissionCsvFiles ?? null,
        batch11QueueRows: batch12Manifest.summary?.batch11QueueRows ?? null,
      },
    ],
    dropboxInput: {
      targetSubmissionDir: TARGET_SUBMISSION_DIR,
      directoryExists: inventory.directoryExists,
      csvFileCount: inventory.files.length,
      csvFileNameHashes: inventory.files.map((file) => file.fileNameHash),
      rawCsvContentsRead: false,
      inputDirectoryCreated: false,
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
      ownerSubmissionWatchlistOnly: true,
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
      dropboxStatusRows: rowsByFile['erp_owner_submission_dropbox_status.csv'].length,
      ownerActionRows: rowsByFile['erp_owner_submission_owner_action_queue.csv'].length,
      templateDistributionRows: rowsByFile['erp_owner_submission_template_distribution.csv'].length,
      releaseWatchlistRows: rowsByFile['erp_owner_submission_release_watchlist.csv'].length,
      commandRunbookRows: rowsByFile['erp_owner_submission_command_runbook.csv'].length,
      batch13TemplateFiles: templateRows.length,
      batch13ChecklistRows: checklistRows.length,
      batch13HandoffRows: handoffRows.length,
      submissionCsvFiles: inventory.files.length,
      submittedApprovalRecords: 0,
      readyForBatch12Rows: 0,
      batch11QueueRows: batch12Manifest.summary?.batch11QueueRows ?? 0,
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
    writeFileSync(join(OUTPUT_DIR, 'batch14_erp_owner_submission_dropbox_watchlist_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch14 owner submission dropbox watchlist ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.ownerActionRows} owner actions, ${manifest.summary.releaseWatchlistRows} release watches, submissionCsvFiles=${manifest.summary.submissionCsvFiles}.\n`,
  );
}

main();
