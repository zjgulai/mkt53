#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');

const BATCH9_DIR_NAME = 'erp-owner-approval-intake-batch9-20260626';
const OUTPUT_DIR_NAME = 'erp-manual-release-review-batch19-20260627';
const BATCH9_DIR = join(repoRoot, 'tmp/exports', BATCH9_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);

const DEFAULT_OWNER_RECORDS_PATH =
  'tmp/inputs/erp-owner-approval-submissions-batch12/market_trend_monthly_owner_chat_approval_20260627.csv';
const DEFAULT_REVIEW_RECORD_PATH =
  'tmp/inputs/erp-manual-release-review-submissions-batch19/manual_release_review_chat_approval_20260627.json';

const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'manual-release-review-record-required';

const INPUTS = {
  batch9Manifest: join(BATCH9_DIR, 'batch9_erp_owner_approval_intake_manifest.json'),
  releaseGate: join(BATCH9_DIR, 'erp_owner_approval_release_gate.csv'),
  promotionManifest: join(BATCH9_DIR, 'erp_owner_approval_promotion_manifest.csv'),
};

const forbiddenPatterns = [
  /AS104-NA00NB/i,
  /Aeroflow Breastpumps/i,
  /叶钰铭/u,
  /Momcozy可穿戴式吸奶器/u,
  /SHOULD_NOT_LEAK/i,
  /BEGIN PRIVATE KEY/i,
  /AKIA[0-9A-Z]{16}/,
  /client_secret/i,
  /session_token/i,
  /private_key/i,
  /password/i,
  /cookie/i,
];

const outputSpecs = {
  'erp_manual_release_review_record.csv': [
    'release_review_record_id',
    'approval_record_uri',
    'source_chat_answer',
    'reviewer_alias',
    'reviewer_hash',
    'review_date',
    'decision_scope',
    'approved_release_gate_count',
    'approved_promotion_candidate_count',
    'can_export_decision',
    'can_display_as_fact_decision',
    'deployment_authorized',
    'production_write_authorized',
    'provider_calls_authorized',
    'review_status',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
  'erp_manual_release_review_decision_matrix.csv': [
    'release_review_decision_id',
    'release_gate_id',
    'promotion_candidate_id',
    'approval_item_id',
    'table_name',
    'surface',
    'source_ids',
    'owner_records_required',
    'owner_records_passed',
    'owner_can_export_decision',
    'owner_can_display_as_fact_decision',
    'manual_can_export_decision',
    'manual_can_display_as_fact_decision',
    'release_review_status',
    'can_export',
    'can_display_as_fact',
    'implementation_status',
    'next_step',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
  'erp_manual_release_review_swap_queue.csv': [
    'swap_queue_id',
    'table_name',
    'surface',
    'source_ids',
    'evidence_artifact_path',
    'approved_for_display',
    'approved_for_export',
    'target_status',
    'implementation_status',
    'next_command_or_action',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
  'erp_manual_release_review_boundary_audit.csv': [
    'boundary_id',
    'checked_item',
    'expected_value',
    'observed_value',
    'boundary_status',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
};

function parseArgs(argv) {
  const reviewRecordIndex = argv.indexOf('--review-record');
  const ownerRecordsIndex = argv.indexOf('--owner-records');
  return {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write') || argv.includes('--dry-run'),
    reviewRecordPath: reviewRecordIndex >= 0 ? argv[reviewRecordIndex + 1] : DEFAULT_REVIEW_RECORD_PATH,
    ownerRecordsPath: ownerRecordsIndex >= 0 ? argv[ownerRecordsIndex + 1] : DEFAULT_OWNER_RECORDS_PATH,
  };
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

function readCsvObjects(filePath) {
  if (!existsSync(filePath)) throw new Error(`Missing Batch19 input: ${filePath}`);
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

function splitPipe(value) {
  return String(value ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function scanForbiddenValues(paths) {
  return paths.flatMap((filePath) => {
    if (!filePath || !existsSync(filePath)) return [];
    const text = readFileSync(filePath, 'utf8');
    return forbiddenPatterns
      .filter((pattern) => pattern.test(text))
      .map((pattern) => ({
        path: filePath,
        pattern: pattern.source,
      }));
  });
}

function readReviewRecord(filePath) {
  if (!filePath || !existsSync(filePath)) return undefined;
  const payload = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`Release review record must be a JSON object: ${filePath}`);
  }
  return payload;
}

function ownerDisplayRows(ownerRecords) {
  return ownerRecords.filter((row) => row.approval_lane === 'display_approval_record');
}

function buildRecordRows(reviewRecord, decisionRows) {
  const approvedRows = decisionRows.filter((row) => row.release_review_status === 'approved_ready_for_site_data_swap');
  const recordPresent = Boolean(reviewRecord);
  return [
    {
      release_review_record_id: reviewRecord?.release_review_record_id ?? '',
      approval_record_uri: reviewRecord?.approval_record_uri ?? '',
      source_chat_answer: reviewRecord?.source_chat_answer ?? '',
      reviewer_alias: reviewRecord?.reviewer_alias ?? '',
      reviewer_hash: reviewRecord?.reviewer_hash ?? '',
      review_date: reviewRecord?.review_date ?? '',
      decision_scope: reviewRecord?.decision_scope ?? '',
      approved_release_gate_count: approvedRows.length,
      approved_promotion_candidate_count: approvedRows.length,
      can_export_decision: normalizeBoolean(reviewRecord?.can_export) ? 'true' : 'false',
      can_display_as_fact_decision: normalizeBoolean(reviewRecord?.can_display_as_fact) ? 'true' : 'false',
      deployment_authorized: normalizeBoolean(reviewRecord?.deployment_authorized) ? 'true' : 'false',
      production_write_authorized: normalizeBoolean(reviewRecord?.production_write_authorized) ? 'true' : 'false',
      provider_calls_authorized: normalizeBoolean(reviewRecord?.provider_calls_authorized) ? 'true' : 'false',
      review_status: recordPresent
        ? approvedRows.length === decisionRows.length
          ? 'manual_release_review_logged'
          : 'manual_release_review_logged_with_scope_gap'
        : 'blocked_missing_release_review_record',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      blocking_reason: recordPresent ? 'site-data-swap-and-verification-not-yet-run' : BLOCKING_REASON,
    },
  ];
}

function buildDecisionRows({ releaseRows, promotionRows, ownerRecords, reviewRecord }) {
  const ownerByTable = new Map(ownerDisplayRows(ownerRecords).map((row) => [row.affected_tables, row]));
  const promotionByTable = new Map(promotionRows.map((row) => [row.affected_tables, row]));
  const approvedGateIds = new Set(reviewRecord?.approved_release_gate_ids ?? []);
  const reviewCompleted = normalizeBoolean(reviewRecord?.manual_release_review_completed);
  const manualCanExport = normalizeBoolean(reviewRecord?.can_export);
  const manualCanDisplay = normalizeBoolean(reviewRecord?.can_display_as_fact);

  return releaseRows.map((releaseRow) => {
    const ownerRow = ownerByTable.get(releaseRow.table_name);
    const promotionRow = promotionByTable.get(releaseRow.table_name);
    const ownerCanExport = ownerRow?.can_export_decision === 'true';
    const ownerCanDisplay = ownerRow?.can_display_as_fact_decision === 'true';
    const releaseReady = releaseRow.release_status === 'ready_for_manual_release_review';
    const inScope = approvedGateIds.has(releaseRow.release_gate_id);
    const approved = Boolean(reviewRecord) && reviewCompleted && inScope && releaseReady && ownerCanExport && ownerCanDisplay && manualCanExport && manualCanDisplay;

    return {
      release_review_decision_id: `batch19_release_review:${releaseRow.table_name}`,
      release_gate_id: releaseRow.release_gate_id,
      promotion_candidate_id: promotionRow?.promotion_candidate_id ?? '',
      approval_item_id: promotionRow?.approval_item_id ?? ownerRow?.approval_item_id ?? '',
      table_name: releaseRow.table_name,
      surface: releaseRow.surface,
      source_ids: releaseRow.source_ids,
      owner_records_required: releaseRow.relevant_validation_rows,
      owner_records_passed: releaseRow.passed_validation_rows,
      owner_can_export_decision: ownerCanExport ? 'true' : 'false',
      owner_can_display_as_fact_decision: ownerCanDisplay ? 'true' : 'false',
      manual_can_export_decision: manualCanExport ? 'true' : 'false',
      manual_can_display_as_fact_decision: manualCanDisplay ? 'true' : 'false',
      release_review_status: approved ? 'approved_ready_for_site_data_swap' : 'blocked_release_review_scope_or_owner_decision_gap',
      can_export: approved ? 'true' : 'false',
      can_display_as_fact: approved ? 'true' : 'false',
      implementation_status: approved ? 'pending_site_data_swap_and_verification' : 'blocked_before_site_data_swap',
      next_step: approved
        ? 'wire approved table and surface scope into site data swap, then run audit, tests, build, and deploy only after explicit deploy approval'
        : 'collect exact release review approval for this gate and confirm owner display/export decisions',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      blocking_reason: approved ? 'site-data-swap-and-verification-not-yet-run' : BLOCKING_REASON,
    };
  });
}

function buildSwapQueueRows(decisionRows, releaseRows) {
  const releaseById = new Map(releaseRows.map((row) => [row.release_gate_id, row]));
  return decisionRows.map((row) => {
    const releaseRow = releaseById.get(row.release_gate_id);
    const approved = row.release_review_status === 'approved_ready_for_site_data_swap';
    return {
      swap_queue_id: `batch19_swap:${row.table_name}`,
      table_name: row.table_name,
      surface: row.surface,
      source_ids: row.source_ids,
      evidence_artifact_path: releaseRow?.evidence_artifact_path ?? '',
      approved_for_display: row.can_display_as_fact,
      approved_for_export: row.can_export,
      target_status: approved ? 'approved_internal_fact_source' : 'blocked',
      implementation_status: approved ? 'pending_site_data_swap_and_verification' : 'blocked_before_site_data_swap',
      next_command_or_action: approved
        ? 'review table-specific field mapping before updating app data source and CSV export paths'
        : 'do not update app data source for this table',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      blocking_reason: approved ? 'site-data-swap-and-verification-not-yet-run' : BLOCKING_REASON,
    };
  });
}

function buildBoundaryRows({ reviewRecord, decisionRows, releaseRows, promotionRows, ownerRecords, forbiddenHits }) {
  const approvedRows = decisionRows.filter((row) => row.release_review_status === 'approved_ready_for_site_data_swap');
  const ownerRows = ownerDisplayRows(ownerRecords);
  const allOwnerRowsAllowDisplayExport =
    ownerRows.length === promotionRows.length &&
    ownerRows.every((row) => row.can_export_decision === 'true' && row.can_display_as_fact_decision === 'true');
  const allReleaseRowsReady = releaseRows.length > 0 && releaseRows.every((row) => row.release_status === 'ready_for_manual_release_review');
  const reviewDeploymentAuthorized = normalizeBoolean(reviewRecord?.deployment_authorized);
  const reviewProductionWriteAuthorized = normalizeBoolean(reviewRecord?.production_write_authorized);
  const reviewProviderCallsAuthorized = normalizeBoolean(reviewRecord?.provider_calls_authorized);

  const rows = [
    {
      boundary_id: 'batch19_boundary:review_record_present',
      checked_item: 'Manual release review record is present',
      expected_value: 'true',
      observed_value: String(Boolean(reviewRecord)),
      boundary_status: reviewRecord ? 'passed' : 'blocked',
      blocking_reason: reviewRecord ? '' : BLOCKING_REASON,
    },
    {
      boundary_id: 'batch19_boundary:promotion_coverage',
      checked_item: 'Every Batch9 promotion candidate has one release-review decision row',
      expected_value: String(promotionRows.length),
      observed_value: String(decisionRows.length),
      boundary_status: promotionRows.length === decisionRows.length ? 'passed' : 'blocked',
      blocking_reason: promotionRows.length === decisionRows.length ? '' : 'promotion-candidate-coverage-gap',
    },
    {
      boundary_id: 'batch19_boundary:owner_display_export_decisions',
      checked_item: 'Display owner rows approve display and export before release review',
      expected_value: 'true',
      observed_value: String(allOwnerRowsAllowDisplayExport),
      boundary_status: allOwnerRowsAllowDisplayExport ? 'passed' : 'blocked',
      blocking_reason: allOwnerRowsAllowDisplayExport ? '' : 'owner-display-export-decision-gap',
    },
    {
      boundary_id: 'batch19_boundary:release_rows_ready',
      checked_item: 'Batch9 release gate rows are ready for manual review',
      expected_value: 'true',
      observed_value: String(allReleaseRowsReady),
      boundary_status: allReleaseRowsReady ? 'passed' : 'blocked',
      blocking_reason: allReleaseRowsReady ? '' : 'batch9-release-gate-not-ready',
    },
    {
      boundary_id: 'batch19_boundary:approved_rows',
      checked_item: 'Release review approved rows for local site data swap',
      expected_value: String(releaseRows.length),
      observed_value: String(approvedRows.length),
      boundary_status: approvedRows.length === releaseRows.length ? 'passed' : 'blocked',
      blocking_reason: approvedRows.length === releaseRows.length ? '' : 'release-review-approval-gap',
    },
    {
      boundary_id: 'batch19_boundary:forbidden_scan',
      checked_item: 'Review input and owner CSV do not contain blocked raw examples or credential markers',
      expected_value: '0',
      observed_value: String(forbiddenHits.length),
      boundary_status: forbiddenHits.length === 0 ? 'passed' : 'blocked',
      blocking_reason: forbiddenHits.length === 0 ? '' : 'forbidden-value-hit',
    },
    {
      boundary_id: 'batch19_boundary:provider_calls',
      checked_item: 'No provider calls are authorized or executed in this review intake',
      expected_value: 'false',
      observed_value: String(reviewProviderCallsAuthorized),
      boundary_status: reviewProviderCallsAuthorized ? 'blocked' : 'passed',
      blocking_reason: reviewProviderCallsAuthorized ? 'provider-call-authorization-not-allowed-in-batch19' : '',
    },
    {
      boundary_id: 'batch19_boundary:production_writes',
      checked_item: 'No production write is authorized or executed in this review intake',
      expected_value: 'false',
      observed_value: String(reviewProductionWriteAuthorized),
      boundary_status: reviewProductionWriteAuthorized ? 'blocked' : 'passed',
      blocking_reason: reviewProductionWriteAuthorized ? 'production-write-authorization-not-allowed-in-batch19' : '',
    },
    {
      boundary_id: 'batch19_boundary:deployment',
      checked_item: 'No deployment is authorized by this review intake',
      expected_value: 'false',
      observed_value: String(reviewDeploymentAuthorized),
      boundary_status: reviewDeploymentAuthorized ? 'blocked' : 'passed',
      blocking_reason: reviewDeploymentAuthorized ? 'deploy-authorization-not-allowed-in-batch19' : '',
    },
  ];

  return rows.map((row) => ({
    ...row,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
  }));
}

function buildArtifacts(options = {}) {
  if (!existsSync(INPUTS.batch9Manifest)) throw new Error(`Missing Batch9 manifest: ${INPUTS.batch9Manifest}`);
  const batch9Manifest = JSON.parse(readFileSync(INPUTS.batch9Manifest, 'utf8'));
  const releaseRows = readCsvObjects(INPUTS.releaseGate);
  const promotionRows = readCsvObjects(INPUTS.promotionManifest);
  const ownerRecordsPath = resolveInputPath(options.ownerRecordsPath);
  const reviewRecordPath = resolveInputPath(options.reviewRecordPath);
  const ownerRecords = ownerRecordsPath && existsSync(ownerRecordsPath) ? readCsvObjects(ownerRecordsPath) : [];
  const reviewRecord = readReviewRecord(reviewRecordPath);
  const forbiddenHits = scanForbiddenValues([ownerRecordsPath, reviewRecordPath]);

  const decisionRows = buildDecisionRows({ releaseRows, promotionRows, ownerRecords, reviewRecord });
  const recordRows = buildRecordRows(reviewRecord, decisionRows);
  const swapQueueRows = buildSwapQueueRows(decisionRows, releaseRows);
  const boundaryRows = buildBoundaryRows({ reviewRecord, decisionRows, releaseRows, promotionRows, ownerRecords, forbiddenHits });
  const boundaryBlockedRows = boundaryRows.filter((row) => row.boundary_status !== 'passed').length;
  const approvedRows = decisionRows.filter((row) => row.release_review_status === 'approved_ready_for_site_data_swap');

  const rowsByFile = {
    'erp_manual_release_review_record.csv': recordRows,
    'erp_manual_release_review_decision_matrix.csv': decisionRows,
    'erp_manual_release_review_swap_queue.csv': swapQueueRows,
    'erp_manual_release_review_boundary_audit.csv': boundaryRows,
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
    generatedRule:
      'Manual release review intake for Batch9 ERP promotion candidates; local artifact only, no ERP login, provider call, production write, deployment, or automatic app data swap.',
    upstreamBatch: {
      batchId: batch9Manifest.batchId,
      manifestPath: `tmp/exports/${BATCH9_DIR_NAME}/batch9_erp_owner_approval_intake_manifest.json`,
      promotionCandidateRows: batch9Manifest.summary?.promotionCandidateRows ?? null,
      readyReleaseGateRows: batch9Manifest.summary?.readyReleaseGateRows ?? null,
    },
    inputs: {
      ownerRecordsPath: options.ownerRecordsPath,
      ownerRecordsResolvedPath: ownerRecordsPath ?? '',
      ownerRecordsRows: ownerRecords.length,
      reviewRecordPath: options.reviewRecordPath,
      reviewRecordResolvedPath: reviewRecordPath ?? '',
      reviewRecordPresent: Boolean(reviewRecord),
    },
    evidenceGrade: EVIDENCE_GRADE,
    privacyLevel: PRIVACY_LEVEL,
    canDisplayAsFact: approvedRows.length === decisionRows.length && boundaryBlockedRows === 0,
    canExport: approvedRows.length === decisionRows.length && boundaryBlockedRows === 0,
    blockingReason: approvedRows.length === decisionRows.length && boundaryBlockedRows === 0
      ? 'site-data-swap-and-verification-not-yet-run'
      : BLOCKING_REASON,
    boundaries: {
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      deployment: false,
      rawBusinessValuesIncluded: false,
      rawApprovalValuesEchoed: false,
      reviewRecordAppliedToSite: false,
      automaticPromotionApplied: false,
      displayExportSwitchApplied: false,
      releaseReviewLogged: Boolean(reviewRecord),
      forbiddenHitRows: forbiddenHits.length,
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
      releaseGateRows: releaseRows.length,
      promotionCandidateRows: promotionRows.length,
      ownerRecordRows: ownerRecords.length,
      displayOwnerRows: ownerDisplayRows(ownerRecords).length,
      releaseReviewRecordRows: recordRows.length,
      releaseReviewDecisionRows: decisionRows.length,
      approvedForDisplayRows: decisionRows.filter((row) => row.can_display_as_fact === 'true').length,
      approvedForExportRows: decisionRows.filter((row) => row.can_export === 'true').length,
      readyForImplementationRows: approvedRows.length,
      swapQueueRows: swapQueueRows.length,
      boundaryAuditRows: boundaryRows.length,
      blockedBoundaryRows: boundaryBlockedRows,
      forbiddenHitRows: forbiddenHits.length,
      siteDataSwapApplied: false,
      productionWrites: false,
      deployment: false,
      validationPassed: approvedRows.length === decisionRows.length && boundaryBlockedRows === 0,
    },
  };

  return { files: materialized, manifest };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { files, manifest } = buildArtifacts({
    reviewRecordPath: args.reviewRecordPath,
    ownerRecordsPath: args.ownerRecordsPath,
  });

  if (!args.noWrite) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    for (const [fileName, file] of Object.entries(files)) writeFileSync(join(OUTPUT_DIR, fileName), file.csv, 'utf8');
    writeFileSync(join(OUTPUT_DIR, 'batch19_erp_manual_release_review_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch19 manual release review ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.releaseReviewDecisionRows} decisions, approved display/export=${manifest.summary.approvedForDisplayRows}/${manifest.summary.approvedForExportRows}, siteDataSwapApplied=${manifest.summary.siteDataSwapApplied}.\n`,
  );
}

main();
