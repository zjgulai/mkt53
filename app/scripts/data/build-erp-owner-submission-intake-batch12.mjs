#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const BATCH10_DIR_NAME = 'erp-owner-approval-record-template-batch10-20260626';
const BATCH11_DIR_NAME = 'erp-owner-approval-preflight-batch11-20260626';
const OUTPUT_DIR_NAME = 'erp-owner-submission-intake-batch12-20260626';
const DEFAULT_SUBMISSION_DIR = 'tmp/inputs/erp-owner-approval-submissions-batch12';
const BATCH10_DIR = join(repoRoot, 'tmp/exports', BATCH10_DIR_NAME);
const BATCH11_DIR = join(repoRoot, 'tmp/exports', BATCH11_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'owner-submissions-not-ready-for-preflight';
const FIXTURE_EVIDENCE_GRADE = 'L2-fixture-or-dry-run';
const FIXTURE_PRIVACY_LEVEL = 'synthetic/internal';
const FIXTURE_BLOCKING_REASON = 'synthetic-fixture-not-owner-approval';
const REQUIRED_HEADERS = [
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
  /password/i,
  /cookie/i,
];

const INPUTS = {
  batch10Manifest: join(BATCH10_DIR, 'batch10_erp_owner_approval_record_template_manifest.json'),
  recordTemplate: join(BATCH10_DIR, 'erp_owner_approval_record_input_template.csv'),
  submissionReadiness: join(BATCH10_DIR, 'erp_owner_approval_submission_readiness.csv'),
  batch11Manifest: join(BATCH11_DIR, 'batch11_erp_owner_approval_preflight_manifest.json'),
};

function parseArgs(argv) {
  const submissionDirIndex = argv.indexOf('--submission-dir');
  return {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    fixture: argv.includes('--fixture') || argv.includes('--synthetic-fixture'),
    submissionDir: submissionDirIndex >= 0 ? argv[submissionDirIndex + 1] : DEFAULT_SUBMISSION_DIR,
  };
}

function isSyntheticPath(value) {
  return /synthetic/i.test(String(value ?? ''));
}

function buildEvidenceContext(options = {}) {
  const fixtureMode = Boolean(options.fixture) || isSyntheticPath(options.submissionDir);
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
  if (!existsSync(filePath)) throw new Error(`Missing Batch12 input: ${filePath}`);
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

function relativePath(filePath) {
  return filePath.startsWith(repoRoot) ? filePath.slice(repoRoot.length + 1) : filePath;
}

function forbiddenHitCount(row) {
  const text = Object.values(row).join(' ');
  return FORBIDDEN_VALUE_PATTERNS.filter((pattern) => pattern.test(text)).length;
}

function listSubmissionFiles(submissionDir) {
  const absoluteDir = resolve(repoRoot, submissionDir);
  if (!existsSync(absoluteDir)) return { absoluteDir, files: [], exists: false };
  const files = readdirSync(absoluteDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.csv'))
    .map((fileName) => join(absoluteDir, fileName))
    .filter((filePath) => statSync(filePath).isFile())
    .sort();
  return { absoluteDir, files, exists: true };
}

function readSubmissionFiles(files) {
  return files.map((filePath) => {
    const content = readFileSync(filePath, 'utf8');
    const parsed = readCsvObjects(filePath);
    return {
      path: relativePath(filePath),
      absolutePath: filePath,
      fileName: basename(filePath),
      size: statSync(filePath).size,
      sha256: fileHash(content),
      headers: parsed.headers,
      rows: parsed.rows,
    };
  });
}

function buildInventoryRows(submissionDir, submissionDirExists, submissionFiles, context) {
  if (submissionFiles.length === 0) {
    return [
      {
        submission_dir: submissionDir,
        file_path: submissionDir,
        file_name: '',
        file_size_bytes: 0,
        row_count: 0,
        sha256: '',
        inventory_status: submissionDirExists ? 'blocked_no_csv_files' : 'blocked_missing_submission_directory',
        evidence_grade: context.evidenceGrade,
        privacy_level: context.privacyLevel,
        can_display_as_fact: 'false',
        blocking_reason: gatedReason(context, submissionDirExists ? 'owner-submission-csv-not-found' : 'owner-submission-directory-not-found'),
      },
    ];
  }

  return submissionFiles.map((file) => ({
    submission_dir: submissionDir,
    file_path: file.path,
    file_name: file.fileName,
    file_size_bytes: file.size,
    row_count: file.rows.length,
    sha256: file.sha256,
    inventory_status: 'submission_csv_detected',
    evidence_grade: context.evidenceGrade,
    privacy_level: context.privacyLevel,
    can_display_as_fact: 'false',
    blocking_reason: gatedReason(context, 'schema-and-redaction-audit-required'),
  }));
}

function indexSubmittedRows(submissionFiles) {
  const rowsByApprovalId = new Map();
  const headerUnion = new Set();
  for (const file of submissionFiles) {
    file.headers.forEach((header) => headerUnion.add(header));
    for (const row of file.rows) {
      const approvalItemId = row.approval_item_id;
      if (!approvalItemId) continue;
      if (!rowsByApprovalId.has(approvalItemId)) rowsByApprovalId.set(approvalItemId, []);
      rowsByApprovalId.get(approvalItemId).push({ file, row });
    }
  }
  return { rowsByApprovalId, submittedHeaders: [...headerUnion].sort() };
}

function buildSchemaAuditRows(expectedRows, submissionFiles, context) {
  const { rowsByApprovalId, submittedHeaders } = indexSubmittedRows(submissionFiles);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !submittedHeaders.includes(header));
  const unexpectedHeaderCount = submittedHeaders.filter((header) => !REQUIRED_HEADERS.includes(header)).length;

  return expectedRows.map((expectedRow) => {
    const submittedRows = rowsByApprovalId.get(expectedRow.approval_item_id) ?? [];
    const rowMissingRequiredFields = submittedRows.length === 0
      ? REQUIRED_HEADERS
      : REQUIRED_HEADERS.filter((header) => submittedRows.some(({ row }) => !String(row[header] ?? '').trim()));
    const duplicateRows = Math.max(0, submittedRows.length - 1);
    const ready = submittedRows.length === 1 && missingHeaders.length === 0 && rowMissingRequiredFields.length === 0 && duplicateRows === 0;
    const status = ready
      ? 'schema_ready_for_batch11_preflight'
      : submittedRows.length === 0
        ? 'blocked_missing_submission_record'
        : 'blocked_schema_or_required_field_gap';

    return {
      schema_audit_id: `batch12_schema:${expectedRow.approval_item_id}`,
      approval_item_id: expectedRow.approval_item_id,
      approval_lane: expectedRow.approval_lane,
      source_ids: expectedRow.source_ids,
      affected_tables: expectedRow.affected_tables,
      owner_role: expectedRow.owner_role,
      expected_header_count: REQUIRED_HEADERS.length,
      submitted_header_count: submittedHeaders.length,
      matched_submission_rows: submittedRows.length,
      duplicate_submission_rows: duplicateRows,
      missing_required_fields: rowMissingRequiredFields.join('|'),
      missing_required_headers: missingHeaders.join('|'),
      unexpected_extra_fields_count: unexpectedHeaderCount,
      schema_status: status,
      ready_for_batch11_preflight: ready ? 'true' : 'false',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      can_display_as_fact: 'false',
      blocking_reason: gatedReason(context, ready ? 'batch11-preflight-still-required' : BLOCKING_REASON),
    };
  });
}

function buildRedactionAuditRows(expectedRows, submissionFiles, context) {
  const { rowsByApprovalId } = indexSubmittedRows(submissionFiles);
  return expectedRows.map((expectedRow) => {
    const submittedRows = rowsByApprovalId.get(expectedRow.approval_item_id) ?? [];
    const fieldsScanned = submittedRows.reduce((sum, { row }) => sum + Object.keys(row).length, 0);
    const hitCount = submittedRows.reduce((sum, { row }) => sum + forbiddenHitCount(row), 0);
    const status = submittedRows.length === 0
      ? 'not_scanned_no_submission'
      : hitCount === 0
        ? 'passed_no_forbidden_patterns'
        : 'blocked_forbidden_patterns_detected';
    return {
      redaction_audit_id: `batch12_redaction:${expectedRow.approval_item_id}`,
      approval_item_id: expectedRow.approval_item_id,
      approval_lane: expectedRow.approval_lane,
      submitted_rows_scanned: submittedRows.length,
      fields_scanned: fieldsScanned,
      forbidden_pattern_hits: hitCount,
      redaction_status: status,
      redaction_action: hitCount === 0 ? 'none' : 'remove raw values before Batch11 preflight',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      can_display_as_fact: 'false',
      blocking_reason: gatedReason(
        context,
        hitCount === 0 ? (submittedRows.length === 0 ? 'owner-submission-record-missing' : 'batch11-preflight-still-required') : 'forbidden-raw-value-detected',
      ),
    };
  });
}

function buildBatch11QueueRows(schemaAuditRows, redactionAuditRows, submissionFiles, submissionDir, context) {
  const schemaReadyRows = schemaAuditRows.filter((row) => row.ready_for_batch11_preflight === 'true').length;
  const redactionCleanRows = redactionAuditRows.filter((row) => row.redaction_status === 'passed_no_forbidden_patterns').length;
  const allReady = schemaAuditRows.length > 0
    && schemaReadyRows === schemaAuditRows.length
    && redactionCleanRows === redactionAuditRows.length
    && submissionFiles.length === 1;

  if (!allReady) return [];
  const submissionPath = submissionFiles[0].path;
  const fixtureFlag = context.fixtureMode ? ' --fixture' : '';
  return [
    {
      queue_id: `batch12_batch11_queue:${OUTPUT_DIR_NAME}`,
      submission_dir: submissionDir,
      approval_records_path: submissionPath,
      schema_ready_rows: schemaReadyRows,
      redaction_clean_rows: redactionCleanRows,
      batch11_preflight_command: `npm run data:erp:owner-approval-preflight-batch11 -- --approval-records ${submissionPath} --json${fixtureFlag}`,
      queue_status: 'ready_for_batch11_preflight',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      can_display_as_fact: 'false',
      blocking_reason: gatedReason(context, 'batch11-preflight-batch9-validation-and-manual-release-review-required'),
    },
  ];
}

function buildReleaseReadinessRows(readinessRows, schemaAuditRows, queueRows, context) {
  const readyBySource = new Map();
  const submittedBySource = new Map();
  const schemaReadyRows = schemaAuditRows.filter((row) => row.ready_for_batch11_preflight === 'true');
  for (const row of schemaAuditRows) {
    for (const sourceId of String(row.source_ids ?? '').split(/[;|]/).filter(Boolean)) {
      if (Number(row.matched_submission_rows) > 0) submittedBySource.set(sourceId, (submittedBySource.get(sourceId) ?? 0) + 1);
    }
  }
  for (const row of schemaReadyRows) {
    for (const sourceId of String(row.source_ids ?? '').split(/[;|]/).filter(Boolean)) {
      readyBySource.set(sourceId, (readyBySource.get(sourceId) ?? 0) + 1);
    }
  }

  return readinessRows.map((row) => {
    const sourceIds = String(row.source_ids ?? '').split(/[;|]/).filter(Boolean);
    const submittedRecords = sourceIds.reduce((sum, sourceId) => sum + (submittedBySource.get(sourceId) ?? 0), 0);
    const schemaReadyRecords = sourceIds.reduce((sum, sourceId) => sum + (readyBySource.get(sourceId) ?? 0), 0);
    return {
      release_gate_id: row.release_gate_id,
      table_name: row.table_name,
      surface: row.surface,
      required_owner_records: row.required_owner_records,
      submitted_owner_records: submittedRecords,
      schema_ready_records: schemaReadyRecords,
      batch11_queue_rows: queueRows.length,
      readiness_status: queueRows.length > 0 ? 'batch11_preflight_ready_still_blocked' : 'blocked_no_batch11_ready_submission',
      can_export: 'false',
      can_display_as_fact: 'false',
      evidence_grade: context.evidenceGrade,
      privacy_level: context.privacyLevel,
      blocking_reason: gatedReason(context, queueRows.length > 0 ? 'batch11-preflight-batch9-validation-and-manual-release-review-required' : BLOCKING_REASON),
    };
  });
}

const outputSpecs = {
  'erp_owner_submission_intake_inventory.csv': [
    'submission_dir',
    'file_path',
    'file_name',
    'file_size_bytes',
    'row_count',
    'sha256',
    'inventory_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_schema_audit.csv': [
    'schema_audit_id',
    'approval_item_id',
    'approval_lane',
    'source_ids',
    'affected_tables',
    'owner_role',
    'expected_header_count',
    'submitted_header_count',
    'matched_submission_rows',
    'duplicate_submission_rows',
    'missing_required_fields',
    'missing_required_headers',
    'unexpected_extra_fields_count',
    'schema_status',
    'ready_for_batch11_preflight',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_redaction_audit.csv': [
    'redaction_audit_id',
    'approval_item_id',
    'approval_lane',
    'submitted_rows_scanned',
    'fields_scanned',
    'forbidden_pattern_hits',
    'redaction_status',
    'redaction_action',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_batch11_queue.csv': [
    'queue_id',
    'submission_dir',
    'approval_records_path',
    'schema_ready_rows',
    'redaction_clean_rows',
    'batch11_preflight_command',
    'queue_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_owner_submission_release_readiness.csv': [
    'release_gate_id',
    'table_name',
    'surface',
    'required_owner_records',
    'submitted_owner_records',
    'schema_ready_records',
    'batch11_queue_rows',
    'readiness_status',
    'can_export',
    'can_display_as_fact',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
};

function buildArtifacts(options = {}) {
  for (const inputPath of Object.values(INPUTS)) {
    if (!existsSync(inputPath)) throw new Error(`Missing Batch12 input: ${inputPath}`);
  }

  const context = buildEvidenceContext(options);
  const batch10Manifest = JSON.parse(readFileSync(INPUTS.batch10Manifest, 'utf8'));
  const batch11Manifest = JSON.parse(readFileSync(INPUTS.batch11Manifest, 'utf8'));
  const { rows: expectedRows } = readCsvObjects(INPUTS.recordTemplate);
  const { rows: readinessRows } = readCsvObjects(INPUTS.submissionReadiness);
  const submissionDir = options.submissionDir ?? DEFAULT_SUBMISSION_DIR;
  const { files, exists } = listSubmissionFiles(submissionDir);
  const submissionFiles = readSubmissionFiles(files);
  const inventoryRows = buildInventoryRows(submissionDir, exists, submissionFiles, context);
  const schemaAuditRows = buildSchemaAuditRows(expectedRows, submissionFiles, context);
  const redactionAuditRows = buildRedactionAuditRows(expectedRows, submissionFiles, context);
  const queueRows = buildBatch11QueueRows(schemaAuditRows, redactionAuditRows, submissionFiles, submissionDir, context);
  const releaseReadinessRows = buildReleaseReadinessRows(readinessRows, schemaAuditRows, queueRows, context);
  const schemaReadyRows = schemaAuditRows.filter((row) => row.ready_for_batch11_preflight === 'true').length;
  const forbiddenHitRows = redactionAuditRows.filter((row) => Number(row.forbidden_pattern_hits) > 0).length;
  const submittedApprovalRecords = schemaAuditRows.filter((row) => Number(row.matched_submission_rows) > 0).length;

  const rowsByFile = {
    'erp_owner_submission_intake_inventory.csv': inventoryRows,
    'erp_owner_submission_schema_audit.csv': schemaAuditRows,
    'erp_owner_submission_redaction_audit.csv': redactionAuditRows,
    'erp_owner_submission_batch11_queue.csv': queueRows,
    'erp_owner_submission_release_readiness.csv': releaseReadinessRows,
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
    generatedRule: 'Local owner submission directory intake audit before Batch11 preflight; no approval fabrication, ERP login, provider call, production write, or automatic promotion.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
    evidenceGrade: context.evidenceGrade,
    privacyLevel: context.privacyLevel,
    canDisplayAsFact: false,
    blockingReason: context.blockingReason,
    fixtureMode: context.fixtureMode,
    upstreamBatches: [
      {
        batchId: batch10Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH10_DIR_NAME}/batch10_erp_owner_approval_record_template_manifest.json`,
        approvalRecordTemplateRows: batch10Manifest.summary?.approvalRecordTemplateRows ?? null,
      },
      {
        batchId: batch11Manifest.batchId,
        manifestPath: `tmp/exports/${BATCH11_DIR_NAME}/batch11_erp_owner_approval_preflight_manifest.json`,
        readyForBatch9Rows: batch11Manifest.summary?.readyForBatch9Rows ?? null,
        batch9HandoffRows: batch11Manifest.summary?.batch9HandoffRows ?? null,
      },
    ],
    submissionInput: {
      provided: files.length > 0,
      path: submissionDir,
      directoryExists: exists,
      csvFileCount: files.length,
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
      fixtureMode: context.fixtureMode,
      syntheticInputDetected: context.fixtureMode,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerSubmissionIntakeOnly: true,
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
      inventoryRows: inventoryRows.length,
      submissionCsvFiles: submissionFiles.length,
      expectedApprovalRecords: expectedRows.length,
      submittedApprovalRecords,
      schemaAuditRows: schemaAuditRows.length,
      schemaReadyRows,
      redactionAuditRows: redactionAuditRows.length,
      forbiddenHitRows,
      batch11QueueRows: queueRows.length,
      releaseReadinessRows: releaseReadinessRows.length,
      readyToDisplayRows: 0,
      readyToExportRows: 0,
      validationPassed: false,
    },
  };

  return { files: materialized, manifest };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { files, manifest } = buildArtifacts({ submissionDir: args.submissionDir, fixture: args.fixture });

  if (!args.noWrite) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    for (const [fileName, file] of Object.entries(files)) writeFileSync(join(OUTPUT_DIR, fileName), file.csv, 'utf8');
    writeFileSync(join(OUTPUT_DIR, 'batch12_erp_owner_submission_intake_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch12 owner submission intake ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.submissionCsvFiles} CSV files, ${manifest.summary.schemaReadyRows} schema-ready records, batch11QueueRows=${manifest.summary.batch11QueueRows}.\n`,
  );
}

main();
