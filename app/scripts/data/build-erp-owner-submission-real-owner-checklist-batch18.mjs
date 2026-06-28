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
const BATCH17_DIR_NAME = 'erp-owner-submission-synthetic-pipeline-batch17-20260627';
const OUTPUT_DIR_NAME = 'erp-owner-submission-real-owner-checklist-batch18-20260627';
const TARGET_SUBMISSION_DIR = 'tmp/inputs/erp-owner-approval-submissions-batch12';
const SYNTHETIC_INPUT_DIR = 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic';
const BATCH10_DIR = join(repoRoot, 'tmp/exports', BATCH10_DIR_NAME);
const BATCH15_DIR = join(repoRoot, 'tmp/exports', BATCH15_DIR_NAME);
const BATCH17_DIR = join(repoRoot, 'tmp/exports', BATCH17_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L2-fixture-or-dry-run';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'real-owner-submission-required';

const INPUTS = {
  batch10Manifest: join(BATCH10_DIR, 'batch10_erp_owner_approval_record_template_manifest.json'),
  recordTemplate: join(BATCH10_DIR, 'erp_owner_approval_record_input_template.csv'),
  requiredEvidence: join(BATCH10_DIR, 'erp_owner_approval_required_evidence_matrix.csv'),
  submissionReadiness: join(BATCH10_DIR, 'erp_owner_approval_submission_readiness.csv'),
  batch15Manifest: join(BATCH15_DIR, 'batch15_erp_owner_submission_acceptance_gate_manifest.json'),
  acceptanceResult: join(BATCH15_DIR, 'erp_owner_submission_acceptance_result.csv'),
  evidenceUriContract: join(BATCH15_DIR, 'erp_owner_submission_evidence_uri_contract.csv'),
  releaseAcceptance: join(BATCH15_DIR, 'erp_owner_submission_release_acceptance_matrix.csv'),
  batch17Manifest: join(BATCH17_DIR, 'batch17_erp_owner_submission_synthetic_pipeline_manifest.json'),
  syntheticPipelineRunMatrix: join(BATCH17_DIR, 'erp_owner_submission_synthetic_pipeline_run_matrix.csv'),
  syntheticReleaseGateMatrix: join(BATCH17_DIR, 'erp_owner_submission_synthetic_release_gate_matrix.csv'),
  syntheticBoundaryAudit: join(BATCH17_DIR, 'erp_owner_submission_synthetic_boundary_audit.csv'),
};

const outputSpecs = {
  'erp_owner_real_submission_field_checklist.csv': [
    'approval_item_id',
    'approval_lane',
    'priority',
    'owner_role',
    'source_ids',
    'affected_tables',
    'required_fields',
    'required_evidence',
    'required_uri_scheme',
    'forbidden_raw_values',
    'target_submission_dir',
    'template_status',
    'real_owner_record_status',
    'next_validator_command',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_real_submission_release_gate_checklist.csv': [
    'release_gate_id',
    'table_name',
    'surface',
    'source_ids',
    'required_owner_records',
    'accepted_owner_records',
    'synthetic_release_status',
    'real_owner_submission_required',
    'next_batch12_command',
    'next_batch11_command',
    'next_batch9_command',
    'evidence_grade',
    'privacy_level',
    'can_export',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_real_submission_swap_runbook.csv': [
    'step_id',
    'step_order',
    'runbook_step',
    'command_or_action',
    'expected_result',
    'can_write_real_gate',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_real_submission_boundary_audit.csv': [
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
  if (!existsSync(filePath)) throw new Error(`Missing Batch18 input: ${filePath}`);
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

function splitIds(value) {
  return String(value ?? '')
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFieldChecklistRows({ templateRows, evidenceRows, acceptanceRows }) {
  const evidenceById = new Map(evidenceRows.map((row) => [row.approval_item_id, row]));
  const acceptanceById = new Map(acceptanceRows.map((row) => [row.approval_item_id, row]));
  return templateRows.map((row) => {
    const evidence = evidenceById.get(row.approval_item_id) ?? {};
    const acceptance = acceptanceById.get(row.approval_item_id) ?? {};
    return {
      approval_item_id: row.approval_item_id,
      approval_lane: row.approval_lane,
      priority: row.priority,
      owner_role: row.owner_role,
      source_ids: row.source_ids,
      affected_tables: row.affected_tables,
      required_fields: evidence.required_record_fields || row.required_fields,
      required_evidence: evidence.required_evidence || row.required_decision,
      required_uri_scheme: evidence.required_uri_scheme || acceptance.required_uri_scheme,
      forbidden_raw_values: evidence.forbidden_raw_values || 'raw SKU, raw product name, customer, operator, warehouse, credential, approval notes',
      target_submission_dir: TARGET_SUBMISSION_DIR,
      template_status: row.submission_status,
      real_owner_record_status: 'awaiting_real_owner_record',
      next_validator_command: `npm run data:erp:owner-submission-intake-batch12 -- --submission-dir ${TARGET_SUBMISSION_DIR} --json`,
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
    };
  });
}

function buildReleaseGateRows({ releaseAcceptanceRows, syntheticReleaseRows }) {
  const syntheticByTable = new Map(syntheticReleaseRows.map((row) => [row.table_name, row]));
  return releaseAcceptanceRows.map((row) => {
    const syntheticRow = syntheticByTable.get(row.table_name) ?? {};
    return {
      release_gate_id: row.release_gate_id,
      table_name: row.table_name,
      surface: row.surface,
      source_ids: row.source_ids,
      required_owner_records: row.required_owner_records,
      accepted_owner_records: row.accepted_owner_records,
      synthetic_release_status: syntheticRow.synthetic_validation_status || 'not_rehearsed',
      real_owner_submission_required: 'true',
      next_batch12_command: `npm run data:erp:owner-submission-intake-batch12 -- --submission-dir ${TARGET_SUBMISSION_DIR} --json`,
      next_batch11_command: `npm run data:erp:owner-approval-preflight-batch11 -- --approval-records ${TARGET_SUBMISSION_DIR}/<real_owner_records.csv> --json`,
      next_batch9_command: `npm run data:erp:owner-approval-intake-batch9 -- --approval-records ${TARGET_SUBMISSION_DIR}/<real_owner_records.csv> --json`,
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_export: 'false',
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
    };
  });
}

function buildSwapRunbookRows() {
  return [
    {
      step_id: 'batch18_runbook:prepare_real_csv',
      step_order: 1,
      runbook_step: 'Prepare one reviewed real owner CSV',
      command_or_action: 'Owner fills Batch13/B18 checklist fields and stores a reviewed CSV outside the repo until acceptance.',
      expected_result: '23 approval_item_id rows, required fields complete, no forbidden raw values.',
    },
    {
      step_id: 'batch18_runbook:place_real_csv',
      step_order: 2,
      runbook_step: 'Place real CSV in Batch12 input directory',
      command_or_action: `Create ${TARGET_SUBMISSION_DIR} and place exactly one reviewed CSV there after manual approval.`,
      expected_result: 'Batch12 real input directory exists with one owner-approved CSV.',
    },
    {
      step_id: 'batch18_runbook:dropbox_check',
      step_order: 3,
      runbook_step: 'Run Batch14 dropbox watchlist',
      command_or_action: 'npm run data:erp:owner-submission-dropbox-batch14 -- --json',
      expected_result: 'submissionCsvFiles > 0 and owner action rows move from missing to submitted.',
    },
    {
      step_id: 'batch18_runbook:batch12_intake',
      step_order: 4,
      runbook_step: 'Run Batch12 schema and redaction intake',
      command_or_action: `npm run data:erp:owner-submission-intake-batch12 -- --submission-dir ${TARGET_SUBMISSION_DIR} --json`,
      expected_result: 'schemaReadyRows=23, forbiddenHitRows=0, batch11QueueRows=1.',
    },
    {
      step_id: 'batch18_runbook:batch11_preflight',
      step_order: 5,
      runbook_step: 'Run Batch11 owner approval preflight',
      command_or_action: `npm run data:erp:owner-approval-preflight-batch11 -- --approval-records ${TARGET_SUBMISSION_DIR}/<real_owner_records.csv> --json`,
      expected_result: 'readyForBatch9Rows=23, blockedPreflightRows=0, batch9HandoffRows=1.',
    },
    {
      step_id: 'batch18_runbook:batch9_validator',
      step_order: 6,
      runbook_step: 'Run Batch9 owner approval validator',
      command_or_action: `npm run data:erp:owner-approval-intake-batch9 -- --approval-records ${TARGET_SUBMISSION_DIR}/<real_owner_records.csv> --json`,
      expected_result: 'passedValidationRows=23 and release gates remain manual-review gated.',
    },
    {
      step_id: 'batch18_runbook:manual_release_review',
      step_order: 7,
      runbook_step: 'Manual release review before display/export',
      command_or_action: 'Manual review signs exact table/surface/export scope; no automatic promotion.',
      expected_result: 'Only approved scopes can be considered for display/export promotion.',
    },
  ].map((row) => ({
    ...row,
    can_write_real_gate: 'false',
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildBoundaryRows({ templateRows, releaseRows, batch15Manifest, batch17Manifest, syntheticBoundaryRows }) {
  const acceptedOwnerRecords = batch15Manifest.summary?.acceptedOwnerRecords ?? 0;
  const childL2 = batch17Manifest.boundaries?.allChildEvidenceGradesL2 === true;
  const displayExportZero = batch17Manifest.summary?.readyToDisplayRows === 0 && batch17Manifest.summary?.readyToExportRows === 0;
  const syntheticBoundaryPassed = syntheticBoundaryRows.every((row) => row.boundary_status === 'passed');
  return [
    {
      boundary_id: 'batch18_boundary:template_coverage',
      checked_item: 'Owner checklist covers every Batch10 approval item',
      expected_value: '23',
      observed_value: String(templateRows.length),
      boundary_status: templateRows.length === 23 ? 'passed' : 'blocked',
    },
    {
      boundary_id: 'batch18_boundary:release_gate_coverage',
      checked_item: 'Release checklist covers every Batch15 release gate',
      expected_value: '9',
      observed_value: String(releaseRows.length),
      boundary_status: releaseRows.length === 9 ? 'passed' : 'blocked',
    },
    {
      boundary_id: 'batch18_boundary:no_real_owner_records',
      checked_item: 'No real owner records have been accepted yet',
      expected_value: 'acceptedOwnerRecords=0',
      observed_value: `acceptedOwnerRecords=${acceptedOwnerRecords}`,
      boundary_status: acceptedOwnerRecords === 0 ? 'passed' : 'blocked',
    },
    {
      boundary_id: 'batch18_boundary:batch17_l2_only',
      checked_item: 'Batch17 remains fixture evidence only',
      expected_value: 'allChildEvidenceGradesL2=true',
      observed_value: `allChildEvidenceGradesL2=${childL2}`,
      boundary_status: childL2 ? 'passed' : 'blocked',
    },
    {
      boundary_id: 'batch18_boundary:no_display_export',
      checked_item: 'Synthetic pipeline produced zero display/export rows',
      expected_value: 'readyToDisplayRows=0;readyToExportRows=0',
      observed_value: `readyToDisplayRows=${batch17Manifest.summary?.readyToDisplayRows};readyToExportRows=${batch17Manifest.summary?.readyToExportRows}`,
      boundary_status: displayExportZero ? 'passed' : 'blocked',
    },
    {
      boundary_id: 'batch18_boundary:synthetic_boundary_passed',
      checked_item: 'Batch17 boundary audit rows passed',
      expected_value: 'all boundary_status=passed',
      observed_value: `passedRows=${syntheticBoundaryRows.filter((row) => row.boundary_status === 'passed').length}/${syntheticBoundaryRows.length}`,
      boundary_status: syntheticBoundaryPassed ? 'passed' : 'blocked',
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
    if (!existsSync(inputPath)) throw new Error(`Missing Batch18 input: ${inputPath}`);
  }

  const batch10Manifest = JSON.parse(readFileSync(INPUTS.batch10Manifest, 'utf8'));
  const batch15Manifest = JSON.parse(readFileSync(INPUTS.batch15Manifest, 'utf8'));
  const batch17Manifest = JSON.parse(readFileSync(INPUTS.batch17Manifest, 'utf8'));
  const templateRows = readCsvObjects(INPUTS.recordTemplate);
  const evidenceRows = readCsvObjects(INPUTS.requiredEvidence);
  const acceptanceRows = readCsvObjects(INPUTS.acceptanceResult);
  const uriContractRows = readCsvObjects(INPUTS.evidenceUriContract);
  const releaseAcceptanceRows = readCsvObjects(INPUTS.releaseAcceptance);
  const syntheticPipelineRows = readCsvObjects(INPUTS.syntheticPipelineRunMatrix);
  const syntheticReleaseRows = readCsvObjects(INPUTS.syntheticReleaseGateMatrix);
  const syntheticBoundaryRows = readCsvObjects(INPUTS.syntheticBoundaryAudit);

  const fieldChecklistRows = buildFieldChecklistRows({ templateRows, evidenceRows, acceptanceRows });
  const releaseGateRows = buildReleaseGateRows({ releaseAcceptanceRows, syntheticReleaseRows });
  const swapRunbookRows = buildSwapRunbookRows();
  const boundaryRows = buildBoundaryRows({ templateRows, releaseRows: releaseGateRows, batch15Manifest, batch17Manifest, syntheticBoundaryRows });
  const requiredApprovalLanes = [...new Set(templateRows.map((row) => row.approval_lane))].sort();
  const requiredSourceIds = [...new Set(templateRows.flatMap((row) => splitIds(row.source_ids)))].sort();

  const rowsByFile = {
    'erp_owner_real_submission_field_checklist.csv': fieldChecklistRows,
    'erp_owner_real_submission_release_gate_checklist.csv': releaseGateRows,
    'erp_owner_real_submission_swap_runbook.csv': swapRunbookRows,
    'erp_owner_real_submission_boundary_audit.csv': boundaryRows,
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
    generatedRule: 'Real owner CSV pre-submission checklist and swap runbook derived from Batch10 templates, Batch15 acceptance gates, and Batch17 fixture rehearsal; no real owner record creation, no real Batch12 input write, no provider call, no production write, and no display/export promotion.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
    evidenceGrade: EVIDENCE_GRADE,
    privacyLevel: PRIVACY_LEVEL,
    canDisplayAsFact: false,
    blockingReason: BLOCKING_REASON,
    targetSubmissionDir: TARGET_SUBMISSION_DIR,
    syntheticReferenceDir: SYNTHETIC_INPUT_DIR,
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
      {
        batchId: batch17Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH17_DIR_NAME}/batch17_erp_owner_submission_synthetic_pipeline_manifest.json`,
        pipelineStageRows: batch17Manifest.summary?.pipelineStageRows ?? null,
        allChildEvidenceGradesL2: batch17Manifest.boundaries?.allChildEvidenceGradesL2 ?? null,
      },
    ],
    boundaries: {
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      writesRealBatch12InputDir: false,
      readsRealBatch12InputDir: false,
      writesSyntheticInputDir: false,
      realOwnerRecordsGenerated: 0,
      realApprovalRecordsApplied: 0,
      syntheticApprovalRecordsApplied: 0,
      automaticPromotionApplied: false,
      exportEnabled: false,
      displayEnabled: false,
      manualReleaseReviewCompleted: false,
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
      fieldChecklistRows: fieldChecklistRows.length,
      releaseGateChecklistRows: releaseGateRows.length,
      swapRunbookRows: swapRunbookRows.length,
      boundaryAuditRows: boundaryRows.length,
      requiredApprovalLanes: requiredApprovalLanes.length,
      requiredSourceIds: requiredSourceIds.length,
      uriContractRows: uriContractRows.length,
      syntheticPipelineRows: syntheticPipelineRows.length,
      realOwnerRecordsAccepted: 0,
      readyToRunBatch12Rows: 0,
      readyToRunBatch11Rows: 0,
      readyToRunBatch9Rows: 0,
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
    writeFileSync(join(OUTPUT_DIR, 'batch18_erp_owner_submission_real_owner_checklist_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch18 real owner submission checklist ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.fieldChecklistRows} field rows, ${manifest.summary.releaseGateChecklistRows} release gates, display/export rows=${manifest.summary.readyToDisplayRows}/${manifest.summary.readyToExportRows}.\n`,
  );
}

main();
