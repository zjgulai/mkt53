#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const BATCH10_DIR_NAME = 'erp-owner-approval-record-template-batch10-20260626';
const BATCH15_DIR_NAME = 'erp-owner-submission-acceptance-gate-batch15-20260627';
const OUTPUT_DIR_NAME = 'erp-owner-submission-synthetic-fixture-batch16-20260627';
const SYNTHETIC_INPUT_DIR = 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic';
const SYNTHETIC_RECORD_FILE = 'synthetic_owner_approval_records_batch16.csv';
const BATCH10_DIR = join(repoRoot, 'tmp/exports', BATCH10_DIR_NAME);
const BATCH15_DIR = join(repoRoot, 'tmp/exports', BATCH15_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const SYNTHETIC_INPUT_ABS_DIR = join(repoRoot, SYNTHETIC_INPUT_DIR);
const EVIDENCE_GRADE = 'L2-fixture-or-dry-run';
const PRIVACY_LEVEL = 'synthetic/internal';
const BLOCKING_REASON = 'synthetic-fixture-not-owner-approval';
const APPROVAL_DATE = '2026-06-27';

const INPUTS = {
  batch10Manifest: join(BATCH10_DIR, 'batch10_erp_owner_approval_record_template_manifest.json'),
  recordTemplate: join(BATCH10_DIR, 'erp_owner_approval_record_input_template.csv'),
  batch15Manifest: join(BATCH15_DIR, 'batch15_erp_owner_submission_acceptance_gate_manifest.json'),
};

const ownerRecordHeaders = [
  'approval_item_id',
  'approval_lane',
  'source_ids',
  'affected_tables',
  'owner_role',
  'approval_decision',
  'approver_role',
  'approver_name_hash',
  'approval_date',
  'approval_record_uri',
  'forbidden_display_confirmed',
  'can_export_decision',
  'can_display_as_fact_decision',
  'submission_status',
  'evidence_grade',
  'privacy_level',
  'can_display_as_fact',
  'blocking_reason',
];

const outputSpecs = {
  'erp_owner_submission_synthetic_fixture_index.csv': [
    'fixture_id',
    'synthetic_input_dir',
    'record_file_path',
    'row_count',
    'sha256',
    'fixture_scope',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_synthetic_record_fill_audit.csv': [
    'approval_item_id',
    'approval_lane',
    'owner_role',
    'approval_decision',
    'approver_hash_present',
    'approval_record_uri_scheme',
    'can_export_decision',
    'can_display_as_fact_decision',
    'synthetic_marker',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_synthetic_gate_plan.csv': [
    'step_id',
    'step_order',
    'gate',
    'command',
    'expected_synthetic_result',
    'can_write_real_gate',
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
  if (!existsSync(filePath)) throw new Error(`Missing Batch16 input: ${filePath}`);
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

function syntheticHash(value) {
  return fileHash(`mkt53-batch16-synthetic:${value}`);
}

function buildSyntheticRecords(templateRows) {
  return templateRows.map((row) => ({
    approval_item_id: row.approval_item_id,
    approval_lane: row.approval_lane,
    source_ids: row.source_ids,
    affected_tables: row.affected_tables,
    owner_role: row.owner_role,
    approval_decision: 'approved',
    approver_role: 'synthetic_fixture_owner',
    approver_name_hash: syntheticHash(`approver:${row.approval_item_id}`),
    approval_date: APPROVAL_DATE,
    approval_record_uri: `file-hash://synthetic-fixture-batch16/${syntheticHash(`uri:${row.approval_item_id}`).slice(0, 24)}`,
    forbidden_display_confirmed: 'true',
    can_export_decision: 'false',
    can_display_as_fact_decision: 'false',
    submission_status: 'synthetic_fixture_ready_for_dry_run',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildRecordAuditRows(records) {
  return records.map((row) => ({
    approval_item_id: row.approval_item_id,
    approval_lane: row.approval_lane,
    owner_role: row.owner_role,
    approval_decision: row.approval_decision,
    approver_hash_present: row.approver_name_hash.length === 64 ? 'true' : 'false',
    approval_record_uri_scheme: 'file-hash://',
    can_export_decision: row.can_export_decision,
    can_display_as_fact_decision: row.can_display_as_fact_decision,
    synthetic_marker: 'SYNTHETIC_FIXTURE_DO_NOT_USE_AS_FACT',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildGatePlanRows(recordFilePath) {
  return [
    {
      step_id: 'batch16_gate_plan:batch12',
      step_order: 1,
      gate: 'Batch12 synthetic intake dry-run',
      command: `npm run data:erp:owner-submission-intake-batch12 -- --submission-dir ${SYNTHETIC_INPUT_DIR} --json --no-write`,
      expected_synthetic_result: '23 schema-ready rows and one Batch11 queue row, still L2 fixture',
    },
    {
      step_id: 'batch16_gate_plan:batch11',
      step_order: 2,
      gate: 'Batch11 synthetic preflight dry-run',
      command: `npm run data:erp:owner-approval-preflight-batch11 -- --approval-records ${recordFilePath} --json --no-write`,
      expected_synthetic_result: '23 preflight-ready rows and one Batch9 handoff row, still L2 fixture',
    },
    {
      step_id: 'batch16_gate_plan:batch9',
      step_order: 3,
      gate: 'Batch9 synthetic validation dry-run',
      command: `npm run data:erp:owner-approval-intake-batch9 -- --approval-records ${recordFilePath} --json --no-write`,
      expected_synthetic_result: '23 validation rows can pass syntactic checks but zero display/export promotion',
    },
    {
      step_id: 'batch16_gate_plan:manual_release_review',
      step_order: 4,
      gate: 'Manual release review',
      command: 'manual review with real owner records only',
      expected_synthetic_result: 'synthetic fixture cannot satisfy manual release review',
    },
  ].map((row) => ({
    ...row,
    can_write_real_gate: 'false',
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildArtifacts() {
  for (const inputPath of Object.values(INPUTS)) {
    if (!existsSync(inputPath)) throw new Error(`Missing Batch16 input: ${inputPath}`);
  }

  const batch10Manifest = JSON.parse(readFileSync(INPUTS.batch10Manifest, 'utf8'));
  const batch15Manifest = JSON.parse(readFileSync(INPUTS.batch15Manifest, 'utf8'));
  const templateRows = readCsvObjects(INPUTS.recordTemplate);
  const syntheticRecords = buildSyntheticRecords(templateRows);
  const recordCsv = toCsv(syntheticRecords, ownerRecordHeaders);
  const recordPath = `${SYNTHETIC_INPUT_DIR}/${SYNTHETIC_RECORD_FILE}`;
  const recordSha = fileHash(recordCsv);

  const rowsByFile = {
    'erp_owner_submission_synthetic_fixture_index.csv': [
      {
        fixture_id: `batch16_synthetic_fixture:${SYNTHETIC_RECORD_FILE}`,
        synthetic_input_dir: SYNTHETIC_INPUT_DIR,
        record_file_path: recordPath,
        row_count: syntheticRecords.length,
        sha256: recordSha,
        fixture_scope: 'owner approval records for Batch12/Batch11/Batch9 dry-run only',
        evidence_grade: EVIDENCE_GRADE,
        privacy_level: PRIVACY_LEVEL,
        can_display_as_fact: 'false',
        blocking_reason: BLOCKING_REASON,
      },
    ],
    'erp_owner_submission_synthetic_record_fill_audit.csv': buildRecordAuditRows(syntheticRecords),
    'erp_owner_submission_synthetic_gate_plan.csv': buildGatePlanRows(recordPath),
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
    generatedRule: 'Synthetic owner approval fixture for Batch12, Batch11, and Batch9 dry-run only; does not write the real Batch12 input directory, apply approvals, call ERP, call providers, write production, or promote facts.',
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
        batchId: batch15Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH15_DIR_NAME}/batch15_erp_owner_submission_acceptance_gate_manifest.json`,
        acceptanceResultRows: batch15Manifest.summary?.acceptanceResultRows ?? null,
        acceptedOwnerRecords: batch15Manifest.summary?.acceptedOwnerRecords ?? null,
      },
    ],
    syntheticInput: {
      directory: SYNTHETIC_INPUT_DIR,
      recordFile: recordPath,
      rowCount: syntheticRecords.length,
      sha256: recordSha,
    },
    boundaries: {
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      writesSyntheticInputDir: true,
      writesRealBatch12InputDir: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      realApprovalRecordsApplied: 0,
      realApprovalsFabricated: false,
      syntheticApprovalRecordsGenerated: syntheticRecords.length,
      automaticPromotionApplied: false,
      syntheticOwnerRecordsOnly: true,
      exportEnabled: false,
    },
    outputs: {
      'synthetic_owner_approval_records_batch16.csv': {
        path: recordPath,
        rowCount: syntheticRecords.length,
        sha256: recordSha,
        headers: ownerRecordHeaders,
      },
      ...Object.fromEntries(
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
    },
    summary: {
      syntheticRecordRows: syntheticRecords.length,
      fixtureCsvFiles: 1,
      fixtureIndexRows: rowsByFile['erp_owner_submission_synthetic_fixture_index.csv'].length,
      recordFillAuditRows: rowsByFile['erp_owner_submission_synthetic_record_fill_audit.csv'].length,
      gatePlanRows: rowsByFile['erp_owner_submission_synthetic_gate_plan.csv'].length,
      readyForSyntheticBatch12DryRun: true,
      readyForSyntheticBatch11DryRun: true,
      readyForSyntheticBatch9DryRun: true,
      realApprovalRecordsApplied: 0,
      readyToDisplayRows: 0,
      readyToExportRows: 0,
      validationPassed: false,
    },
  };

  return { files: materialized, manifest, recordCsv };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { files, manifest, recordCsv } = buildArtifacts();

  if (!args.noWrite) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    mkdirSync(SYNTHETIC_INPUT_ABS_DIR, { recursive: true });
    writeFileSync(join(SYNTHETIC_INPUT_ABS_DIR, SYNTHETIC_RECORD_FILE), recordCsv, 'utf8');
    for (const [fileName, file] of Object.entries(files)) writeFileSync(join(OUTPUT_DIR, fileName), file.csv, 'utf8');
    writeFileSync(join(OUTPUT_DIR, 'batch16_erp_owner_submission_synthetic_fixture_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch16 synthetic owner submission fixture ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.syntheticRecordRows} synthetic rows, display/export rows=${manifest.summary.readyToDisplayRows}/${manifest.summary.readyToExportRows}.\n`,
  );
}

main();
