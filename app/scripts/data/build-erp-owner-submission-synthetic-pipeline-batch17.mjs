#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const BATCH10_DIR_NAME = 'erp-owner-approval-record-template-batch10-20260626';
const BATCH16_DIR_NAME = 'erp-owner-submission-synthetic-fixture-batch16-20260627';
const OUTPUT_DIR_NAME = 'erp-owner-submission-synthetic-pipeline-batch17-20260627';
const SYNTHETIC_INPUT_DIR = 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic';
const SYNTHETIC_RECORD_FILE = 'synthetic_owner_approval_records_batch16.csv';
const BATCH10_DIR = join(repoRoot, 'tmp/exports', BATCH10_DIR_NAME);
const BATCH16_DIR = join(repoRoot, 'tmp/exports', BATCH16_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const PERSISTENT_SYNTHETIC_RECORD_PATH = join(repoRoot, SYNTHETIC_INPUT_DIR, SYNTHETIC_RECORD_FILE);
const EVIDENCE_GRADE = 'L2-fixture-or-dry-run';
const PRIVACY_LEVEL = 'synthetic/internal';
const BLOCKING_REASON = 'synthetic-fixture-not-owner-approval';
const APPROVAL_DATE = '2026-06-27';

const INPUTS = {
  batch10Manifest: join(BATCH10_DIR, 'batch10_erp_owner_approval_record_template_manifest.json'),
  recordTemplate: join(BATCH10_DIR, 'erp_owner_approval_record_input_template.csv'),
  displayTemplate: join(repoRoot, 'tmp/exports/erp-owner-approval-batch8-20260625/erp_display_approval_record_template.csv'),
  batch16Manifest: join(BATCH16_DIR, 'batch16_erp_owner_submission_synthetic_fixture_manifest.json'),
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
  'erp_owner_submission_synthetic_pipeline_run_matrix.csv': [
    'stage_id',
    'stage_order',
    'stage_name',
    'command',
    'input_path',
    'output_batch_id',
    'row_count_metric',
    'ready_rows',
    'blocked_rows',
    'observed_evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'can_export',
    'blocking_reason',
  ],
  'erp_owner_submission_synthetic_release_gate_matrix.csv': [
    'release_gate_id',
    'table_name',
    'surface',
    'source_ids',
    'synthetic_validation_status',
    'ready_for_manual_review',
    'can_display_as_fact',
    'can_export',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
  'erp_owner_submission_synthetic_boundary_audit.csv': [
    'boundary_id',
    'checked_item',
    'expected_value',
    'observed_value',
    'boundary_status',
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
  if (!existsSync(filePath)) throw new Error(`Missing Batch17 input: ${filePath}`);
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

function prepareSyntheticInput(noWrite) {
  const templateRows = readCsvObjects(INPUTS.recordTemplate);
  const syntheticRecords = buildSyntheticRecords(templateRows);
  const recordCsv = toCsv(syntheticRecords, ownerRecordHeaders);
  const recordSha = fileHash(recordCsv);
  const displayPath = `${SYNTHETIC_INPUT_DIR}/${SYNTHETIC_RECORD_FILE}`;

  if (!noWrite) {
    mkdirSync(join(repoRoot, SYNTHETIC_INPUT_DIR), { recursive: true });
    writeFileSync(PERSISTENT_SYNTHETIC_RECORD_PATH, recordCsv, 'utf8');
    return {
      commandPath: displayPath,
      displayPath,
      rowCount: syntheticRecords.length,
      sha256: recordSha,
      cleanup: () => {},
    };
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-batch17-synthetic-'));
  const tempRecordPath = join(tempDir, SYNTHETIC_RECORD_FILE);
  writeFileSync(tempRecordPath, recordCsv, 'utf8');
  return {
    commandPath: tempRecordPath,
    displayPath,
    rowCount: syntheticRecords.length,
    sha256: recordSha,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
  };
}

function runJsonScript(args) {
  const output = execFileSync(process.execPath, args, {
    cwd: appRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });
  return JSON.parse(output);
}

function buildRunRows({ batch12Manifest, batch11Manifest, batch9Manifest, recordInfo }) {
  return [
    {
      stage_id: 'batch17_stage:synthetic_fixture_prepare',
      stage_order: 1,
      stage_name: 'Prepare synthetic owner approval records',
      command: 'npm run data:erp:owner-submission-synthetic-batch16',
      input_path: recordInfo.displayPath,
      output_batch_id: BATCH16_DIR_NAME,
      row_count_metric: 'syntheticRecordRows',
      ready_rows: recordInfo.rowCount,
      blocked_rows: 0,
      observed_evidence_grade: EVIDENCE_GRADE,
    },
    {
      stage_id: 'batch17_stage:batch12_intake_fixture',
      stage_order: 2,
      stage_name: 'Batch12 owner submission intake fixture dry-run',
      command: `npm run data:erp:owner-submission-intake-batch12 -- --submission-dir ${SYNTHETIC_INPUT_DIR} --json --no-write --fixture`,
      input_path: SYNTHETIC_INPUT_DIR,
      output_batch_id: batch12Manifest.batchId,
      row_count_metric: 'schemaReadyRows',
      ready_rows: batch12Manifest.summary.schemaReadyRows,
      blocked_rows: batch12Manifest.summary.schemaAuditRows - batch12Manifest.summary.schemaReadyRows,
      observed_evidence_grade: batch12Manifest.evidenceGrade,
    },
    {
      stage_id: 'batch17_stage:batch11_preflight_fixture',
      stage_order: 3,
      stage_name: 'Batch11 owner approval preflight fixture dry-run',
      command: `npm run data:erp:owner-approval-preflight-batch11 -- --approval-records ${recordInfo.displayPath} --json --no-write --fixture`,
      input_path: recordInfo.displayPath,
      output_batch_id: batch11Manifest.batchId,
      row_count_metric: 'readyForBatch9Rows',
      ready_rows: batch11Manifest.summary.readyForBatch9Rows,
      blocked_rows: batch11Manifest.summary.blockedPreflightRows,
      observed_evidence_grade: batch11Manifest.evidenceGrade,
    },
    {
      stage_id: 'batch17_stage:batch9_validator_fixture',
      stage_order: 4,
      stage_name: 'Batch9 owner approval validator fixture dry-run',
      command: `npm run data:erp:owner-approval-intake-batch9 -- --approval-records ${recordInfo.displayPath} --json --no-write --fixture`,
      input_path: recordInfo.displayPath,
      output_batch_id: batch9Manifest.batchId,
      row_count_metric: 'passedValidationRows',
      ready_rows: batch9Manifest.summary.passedValidationRows,
      blocked_rows: batch9Manifest.summary.blockedValidationRows,
      observed_evidence_grade: batch9Manifest.evidenceGrade,
    },
    {
      stage_id: 'batch17_stage:manual_release_review_blocked',
      stage_order: 5,
      stage_name: 'Manual release review stays blocked for synthetic records',
      command: 'manual review with real owner records only',
      input_path: recordInfo.displayPath,
      output_batch_id: OUTPUT_DIR_NAME,
      row_count_metric: 'promotionCandidateRows',
      ready_rows: batch9Manifest.summary.promotionCandidateRows,
      blocked_rows: 1,
      observed_evidence_grade: EVIDENCE_GRADE,
    },
  ].map((row) => ({
    ...row,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    can_export: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildReleaseGateRows() {
  return readCsvObjects(INPUTS.displayTemplate).map((row) => ({
    release_gate_id: row.release_gate_id,
    table_name: row.table_name,
    surface: row.surface,
    source_ids: row.source_ids,
    synthetic_validation_status: 'ready_for_manual_release_review_dry_run_only',
    ready_for_manual_review: 'false',
    can_display_as_fact: 'false',
    can_export: 'false',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildBoundaryRows({ batch12Manifest, batch11Manifest, batch9Manifest }) {
  const childGrades = [batch12Manifest.evidenceGrade, batch11Manifest.evidenceGrade, batch9Manifest.evidenceGrade];
  const childFixtureModes = [batch12Manifest.fixtureMode, batch11Manifest.fixtureMode, batch9Manifest.fixtureMode];
  const readyToDisplayRows = batch12Manifest.summary.readyToDisplayRows + batch11Manifest.summary.readyToDisplayRows + batch9Manifest.summary.readyToDisplayRows;
  const readyToExportRows = batch12Manifest.summary.readyToExportRows + batch11Manifest.summary.readyToExportRows + batch9Manifest.summary.readyToExportRows;
  const promotionRows = batch9Manifest.summary.promotionCandidateRows;
  return [
    {
      boundary_id: 'batch17_boundary:evidence_grade',
      checked_item: 'Batch12/11/9 child manifests use L2 fixture evidence',
      expected_value: EVIDENCE_GRADE,
      observed_value: childGrades.join('|'),
      boundary_status: childGrades.every((grade) => grade === EVIDENCE_GRADE) ? 'passed' : 'blocked',
    },
    {
      boundary_id: 'batch17_boundary:fixture_mode',
      checked_item: 'Batch12/11/9 fixtureMode is true',
      expected_value: 'true|true|true',
      observed_value: childFixtureModes.map(String).join('|'),
      boundary_status: childFixtureModes.every(Boolean) ? 'passed' : 'blocked',
    },
    {
      boundary_id: 'batch17_boundary:display_export',
      checked_item: 'Synthetic chain produces zero display/export rows',
      expected_value: 'readyToDisplayRows=0;readyToExportRows=0',
      observed_value: `readyToDisplayRows=${readyToDisplayRows};readyToExportRows=${readyToExportRows}`,
      boundary_status: readyToDisplayRows === 0 && readyToExportRows === 0 ? 'passed' : 'blocked',
    },
    {
      boundary_id: 'batch17_boundary:promotion',
      checked_item: 'Synthetic chain cannot create promotion candidates',
      expected_value: 'promotionCandidateRows=0',
      observed_value: `promotionCandidateRows=${promotionRows}`,
      boundary_status: promotionRows === 0 ? 'passed' : 'blocked',
    },
  ].map((row) => ({
    ...row,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildArtifacts(options = {}) {
  for (const inputPath of Object.values(INPUTS)) {
    if (!existsSync(inputPath)) throw new Error(`Missing Batch17 input: ${inputPath}`);
  }

  const batch10Manifest = JSON.parse(readFileSync(INPUTS.batch10Manifest, 'utf8'));
  const batch16Manifest = JSON.parse(readFileSync(INPUTS.batch16Manifest, 'utf8'));
  const recordInfo = prepareSyntheticInput(Boolean(options.noWrite));
  const batch12SubmissionArg = options.noWrite ? resolve(recordInfo.commandPath, '..') : SYNTHETIC_INPUT_DIR;
  const recordArg = options.noWrite ? recordInfo.commandPath : recordInfo.displayPath;
  const batch12Manifest = runJsonScript([
    'scripts/data/build-erp-owner-submission-intake-batch12.mjs',
    '--submission-dir',
    batch12SubmissionArg,
    '--json',
    '--no-write',
    '--fixture',
  ]);
  const batch11Manifest = runJsonScript([
    'scripts/data/build-erp-owner-approval-preflight-batch11.mjs',
    '--approval-records',
    recordArg,
    '--json',
    '--no-write',
    '--fixture',
  ]);
  const batch9Manifest = runJsonScript([
    'scripts/data/build-erp-owner-approval-intake-batch9.mjs',
    '--approval-records',
    recordArg,
    '--json',
    '--no-write',
    '--fixture',
  ]);
  const pipelineRows = buildRunRows({ batch12Manifest, batch11Manifest, batch9Manifest, recordInfo });
  const releaseGateRows = buildReleaseGateRows();
  const boundaryRows = buildBoundaryRows({ batch12Manifest, batch11Manifest, batch9Manifest });

  const rowsByFile = {
    'erp_owner_submission_synthetic_pipeline_run_matrix.csv': pipelineRows,
    'erp_owner_submission_synthetic_release_gate_matrix.csv': releaseGateRows,
    'erp_owner_submission_synthetic_boundary_audit.csv': boundaryRows,
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

  const allChildEvidenceGradesL2 = [batch12Manifest, batch11Manifest, batch9Manifest].every((manifest) => manifest.evidenceGrade === EVIDENCE_GRADE);
  const allChildFixtureModes = [batch12Manifest, batch11Manifest, batch9Manifest].every((manifest) => manifest.fixtureMode === true);
  const manifest = {
    batchId: OUTPUT_DIR_NAME,
    generatedAt: new Date().toISOString(),
    generatedRule: 'Synthetic owner submission pipeline rehearsal across Batch12, Batch11, and Batch9; all child runs are no-write fixture mode and cannot promote facts.',
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
        batchId: batch16Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH16_DIR_NAME}/batch16_erp_owner_submission_synthetic_fixture_manifest.json`,
        syntheticRecordRows: batch16Manifest.summary?.syntheticRecordRows ?? null,
      },
      {
        batchId: batch12Manifest.batchId,
        evidenceGrade: batch12Manifest.evidenceGrade,
        fixtureMode: batch12Manifest.fixtureMode,
      },
      {
        batchId: batch11Manifest.batchId,
        evidenceGrade: batch11Manifest.evidenceGrade,
        fixtureMode: batch11Manifest.fixtureMode,
      },
      {
        batchId: batch9Manifest.batchId,
        evidenceGrade: batch9Manifest.evidenceGrade,
        fixtureMode: batch9Manifest.fixtureMode,
      },
    ],
    syntheticInput: {
      directory: SYNTHETIC_INPUT_DIR,
      recordFile: recordInfo.displayPath,
      rowCount: recordInfo.rowCount,
      sha256: recordInfo.sha256,
      runtimePathIsTemporary: Boolean(options.noWrite),
    },
    boundaries: {
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      childRunsNoWrite: true,
      fixtureMode: true,
      allChildEvidenceGradesL2,
      allChildFixtureModes,
      writesSyntheticInputDir: !options.noWrite,
      writesRealBatch12InputDir: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      realApprovalRecordsApplied: 0,
      realApprovalsFabricated: false,
      syntheticApprovalRecordsGenerated: recordInfo.rowCount,
      automaticPromotionApplied: false,
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
      syntheticRecordRows: recordInfo.rowCount,
      pipelineStageRows: pipelineRows.length,
      releaseGateRows: releaseGateRows.length,
      boundaryAuditRows: boundaryRows.length,
      batch12SchemaReadyRows: batch12Manifest.summary.schemaReadyRows,
      batch12QueueRows: batch12Manifest.summary.batch11QueueRows,
      batch11ReadyRows: batch11Manifest.summary.readyForBatch9Rows,
      batch11HandoffRows: batch11Manifest.summary.batch9HandoffRows,
      batch9PassedValidationRows: batch9Manifest.summary.passedValidationRows,
      batch9ReadyReleaseGateRows: batch9Manifest.summary.readyReleaseGateRows,
      promotionCandidateRows: batch9Manifest.summary.promotionCandidateRows,
      readyToDisplayRows: 0,
      readyToExportRows: 0,
      validationPassed: false,
    },
  };

  return { files: materialized, manifest, cleanup: recordInfo.cleanup };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let cleanup = () => {};
  try {
    const { files, manifest, cleanup: cleanupInput } = buildArtifacts({ noWrite: args.noWrite });
    cleanup = cleanupInput;

    if (!args.noWrite) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
      for (const [fileName, file] of Object.entries(files)) writeFileSync(join(OUTPUT_DIR, fileName), file.csv, 'utf8');
      writeFileSync(join(OUTPUT_DIR, 'batch17_erp_owner_submission_synthetic_pipeline_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    }

    if (args.json) {
      process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
      return;
    }

    process.stdout.write(
      `ERP Batch17 synthetic owner submission pipeline ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.pipelineStageRows} stages, ${manifest.summary.batch9PassedValidationRows} fixture validation rows, display/export rows=${manifest.summary.readyToDisplayRows}/${manifest.summary.readyToExportRows}.\n`,
    );
  } finally {
    cleanup();
  }
}

main();
