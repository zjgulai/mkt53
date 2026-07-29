#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isValidIsoDateOrDateTime } from './lib/strict-iso-date.mjs';

const PACKET_GATE_REQUIRED_COLUMNS = [
  'task_id',
  'source_id',
  'priority',
  'owner_team',
  'page',
  'metric',
  'current_status',
  'current_http_status',
  'manual_decision',
  'packet_validation_status',
  'ready_for_manual_release_review',
  'can_write_source_registry',
  'can_update_page_display',
  'can_export_as_fact_csv',
];

const REVIEW_QUEUE_FIELDS = [
  'release_review_queue_id',
  'task_id',
  'source_id',
  'priority',
  'owner_team',
  'page',
  'metric',
  'manual_decision',
  'packet_validation_status',
  'ready_for_manual_release_review',
  'queue_status',
  'review_record_required',
  'can_write_source_registry',
  'can_update_page_display',
  'can_export_as_fact_csv',
  'blocking_reason',
  'next_action',
];

const DECISION_FIELDS = [
  'release_review_decision_id',
  'task_id',
  'source_id',
  'manual_decision',
  'review_record_id',
  'reviewer_alias',
  'reviewed_at',
  'included_in_review_record',
  'release_review_status',
  'approved_for_source_registry_patch_candidate',
  'replacement_source_required',
  'scope_mismatch_rejected',
  'vendor_access_blocked',
  'can_prepare_source_registry_patch',
  'can_write_source_registry',
  'can_update_page_display',
  'can_export_as_fact_csv',
  'production_deploy_authorized',
  'provider_calls_authorized',
  'blocking_reason',
  'next_action',
];

const BOUNDARY_FIELDS = [
  'boundary_id',
  'checked_item',
  'expected_value',
  'observed_value',
  'boundary_status',
  'blocking_reason',
];

const ALLOWED_REVIEW_STATUSES = new Set([
  'approved_for_source_registry_patch_candidate',
  'blocked_missing_review_record',
  'blocked_intake_not_ready',
  'blocked_review_scope_gap',
  'replacement_source_required',
  'rejected_scope_mismatch',
  'blocked_vendor_access',
]);

const FORBIDDEN_TOKEN_RE = /password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i;

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    validationDir: undefined,
    packetGatePath: undefined,
    reviewRecordPath: undefined,
    outDir: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--validation') options.validationDir = argv[index + 1];
    if (argv[index] === '--packet-gate') options.packetGatePath = argv[index + 1];
    if (argv[index] === '--review-record') options.reviewRecordPath = argv[index + 1];
    if (argv[index] === '--out') options.outDir = argv[index + 1];
  }

  return options;
}

function dateSlug(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replaceAll('-', '');
}

function parseCsv(text, requiredColumns = []) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...dataRows] = rows.filter((candidate) => candidate.some((value) => value !== ''));
  if (!header) return [];

  const missingColumns = requiredColumns.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`CSV is missing required columns: ${missingColumns.join(', ')}`);
  }

  return dataRows.map((dataRow) => Object.fromEntries(header.map((column, index) => [column, dataRow[index] ?? ''])));
}

function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const text = Array.isArray(value) ? value.join('|') : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(path, rows, fields) {
  const csv = [fields.join(','), ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(','))].join('\n');
  writeFileSync(path, `${csv}\n`);
}

function fileHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function normalize(value) {
  return String(value ?? '').trim();
}

function normalizeBoolean(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function hasForbiddenToken(value) {
  return FORBIDDEN_TOKEN_RE.test(String(value ?? ''));
}

function readCsvFile(path, requiredColumns) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Manual release review input not found: ${path}`);
  }

  return parseCsv(readFileSync(path, 'utf8'), requiredColumns);
}

function resolveMaybe(appRoot, inputPath) {
  if (!inputPath) return undefined;
  return resolve(appRoot, inputPath);
}

function resolvePacketGatePath(appRoot, options) {
  if (options.packetGatePath) return resolve(appRoot, options.packetGatePath);
  if (options.validationDir) return resolve(appRoot, options.validationDir, 'manual_evidence_validation_packet_gate.csv');

  const auditRoot = resolve(appRoot, 'tmp/audits');
  const latestPacketGate = existsSync(auditRoot)
    ? readdirSync(auditRoot)
        .filter((name) => name.startsWith('public-source-manual-evidence-validation-'))
        .map((name) => resolve(auditRoot, name, 'manual_evidence_validation_packet_gate.csv'))
        .filter((path) => existsSync(path) && statSync(path).isFile())
        .map((path) => ({ path, mtimeMs: statSync(path).mtimeMs }))
        .sort((left, right) => right.mtimeMs - left.mtimeMs || right.path.localeCompare(left.path))[0]?.path
    : undefined;

  if (!latestPacketGate) {
    throw new Error('No manual evidence validation packet gate found. Pass --validation <dir> or --packet-gate <path>.');
  }
  return latestPacketGate;
}

function readReviewRecord(path) {
  if (!path) return undefined;
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Manual release review record not found: ${path}`);
  }

  const payload = JSON.parse(readFileSync(path, 'utf8'));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`Manual release review record must be a JSON object: ${path}`);
  }
  return payload;
}

function approvedTaskIds(reviewRecord) {
  return new Set(Array.isArray(reviewRecord?.approved_task_ids) ? reviewRecord.approved_task_ids.map(String) : []);
}

function approvedSourceIds(reviewRecord) {
  return new Set(Array.isArray(reviewRecord?.approved_source_ids) ? reviewRecord.approved_source_ids.map(String) : []);
}

function reviewRecordCoreReady(reviewRecord) {
  if (!reviewRecord) return false;

  return Boolean(
    normalize(reviewRecord.review_record_id) &&
      normalize(reviewRecord.reviewer_alias) &&
      isValidIsoDateOrDateTime(normalize(reviewRecord.reviewed_at)) &&
      normalizeBoolean(reviewRecord.manual_release_review_completed),
  );
}

function reviewRecordHasForbiddenToken(reviewRecord) {
  if (!reviewRecord) return false;
  return [
    reviewRecord.review_record_id,
    reviewRecord.approval_record_uri,
    reviewRecord.source_chat_answer,
    reviewRecord.reviewer_alias,
    reviewRecord.reviewed_at,
    reviewRecord.decision_scope,
    ...(Array.isArray(reviewRecord.approved_task_ids) ? reviewRecord.approved_task_ids : []),
    ...(Array.isArray(reviewRecord.approved_source_ids) ? reviewRecord.approved_source_ids : []),
  ].some(hasForbiddenToken);
}

function buildQueueRows(packetRows) {
  return packetRows.map((packet) => {
    const ready = packet.ready_for_manual_release_review === 'true' && packet.packet_validation_status === 'ready_for_manual_release_review';
    return {
      release_review_queue_id: `public-source-release-review:${packet.task_id}`,
      task_id: packet.task_id,
      source_id: packet.source_id,
      priority: packet.priority,
      owner_team: packet.owner_team,
      page: packet.page,
      metric: packet.metric,
      manual_decision: packet.manual_decision,
      packet_validation_status: packet.packet_validation_status,
      ready_for_manual_release_review: packet.ready_for_manual_release_review,
      queue_status: ready ? 'queued_for_manual_release_review' : 'blocked_intake_not_ready',
      review_record_required: String(ready),
      can_write_source_registry: 'false',
      can_update_page_display: 'false',
      can_export_as_fact_csv: 'false',
      blocking_reason: ready ? 'manual release review record required before source registry planning' : 'manual evidence intake is not ready',
      next_action: ready ? 'collect manual release review record for exact task_id and source_id' : 'complete manual evidence intake first',
    };
  });
}

function buildDecisionRows(packetRows, reviewRecord) {
  const taskIds = approvedTaskIds(reviewRecord);
  const sourceIds = approvedSourceIds(reviewRecord);
  const reviewCoreReady = reviewRecordCoreReady(reviewRecord);
  const sourceRegistryPatchAuthorized = normalizeBoolean(reviewRecord?.source_registry_patch_authorized);
  const pageDisplayAuthorized = normalizeBoolean(reviewRecord?.page_display_authorized);
  const csvFactExportAuthorized = normalizeBoolean(reviewRecord?.csv_fact_export_authorized);
  const productionDeployAuthorized = normalizeBoolean(reviewRecord?.production_deploy_authorized);
  const providerCallsAuthorized = normalizeBoolean(reviewRecord?.provider_calls_authorized);
  const forbiddenTokenDetected = reviewRecordHasForbiddenToken(reviewRecord);

  return packetRows.map((packet) => {
    const ready = packet.ready_for_manual_release_review === 'true' && packet.packet_validation_status === 'ready_for_manual_release_review';
    const includedInReviewRecord = Boolean(
      reviewRecord && taskIds.has(packet.task_id) && sourceIds.has(packet.source_id),
    );
    const acceptedDecision = packet.manual_decision === 'accepted_for_l3_evidence';
    const replacementSourceRequired = packet.manual_decision === 'needs_replacement_source';
    const scopeMismatchRejected = packet.manual_decision === 'rejected_scope_mismatch';
    const vendorAccessBlocked = packet.manual_decision === 'blocked_vendor_access';
    const approvedForPatchCandidate = Boolean(
      ready &&
        acceptedDecision &&
        reviewCoreReady &&
        includedInReviewRecord &&
        sourceRegistryPatchAuthorized &&
        !pageDisplayAuthorized &&
        !csvFactExportAuthorized &&
        !productionDeployAuthorized &&
        !providerCallsAuthorized &&
        !forbiddenTokenDetected,
    );

    let releaseReviewStatus = 'blocked_missing_review_record';
    let blockingReason = 'manual release review record required';
    let nextAction = 'collect manual release review record for exact source scope';

    if (!ready) {
      releaseReviewStatus = 'blocked_intake_not_ready';
      blockingReason = 'manual evidence intake is not ready';
      nextAction = 'complete manual evidence intake and re-run validation';
    } else if (replacementSourceRequired) {
      releaseReviewStatus = 'replacement_source_required';
      blockingReason = 'owner decision requires a replacement source';
      nextAction = 'collect a replacement source and restart evidence intake';
    } else if (scopeMismatchRejected) {
      releaseReviewStatus = 'rejected_scope_mismatch';
      blockingReason = 'owner decision rejects the source scope';
      nextAction = 'remove this candidate from fact promotion planning';
    } else if (vendorAccessBlocked) {
      releaseReviewStatus = 'blocked_vendor_access';
      blockingReason = 'vendor or restricted access is still required';
      nextAction = 'route to connector or vendor-access readiness gate';
    } else if (approvedForPatchCandidate) {
      releaseReviewStatus = 'approved_for_source_registry_patch_candidate';
      blockingReason = 'manual review approves source registry patch planning only';
      nextAction = 'prepare source registry patch in a separate reviewed change';
    } else if (reviewRecord) {
      releaseReviewStatus = 'blocked_review_scope_gap';
      blockingReason = forbiddenTokenDetected
        ? 'review record contains forbidden token pattern'
        : 'review record does not authorize this exact safe scope';
      nextAction = 'correct review record scope before source registry planning';
    }

    return {
      release_review_decision_id: `public-source-release-review:${packet.task_id}`,
      task_id: packet.task_id,
      source_id: packet.source_id,
      manual_decision: packet.manual_decision,
      review_record_id: normalize(reviewRecord?.review_record_id),
      reviewer_alias: normalize(reviewRecord?.reviewer_alias),
      reviewed_at: normalize(reviewRecord?.reviewed_at),
      included_in_review_record: String(includedInReviewRecord),
      release_review_status: releaseReviewStatus,
      approved_for_source_registry_patch_candidate: String(approvedForPatchCandidate),
      replacement_source_required: String(replacementSourceRequired),
      scope_mismatch_rejected: String(scopeMismatchRejected),
      vendor_access_blocked: String(vendorAccessBlocked),
      can_prepare_source_registry_patch: String(approvedForPatchCandidate),
      can_write_source_registry: 'false',
      can_update_page_display: 'false',
      can_export_as_fact_csv: 'false',
      production_deploy_authorized: 'false',
      provider_calls_authorized: 'false',
      blocking_reason: blockingReason,
      next_action: nextAction,
    };
  });
}

function buildBoundaryRows({ packetRows, queueRows, decisionRows, reviewRecord }) {
  const readyPacketCount = packetRows.filter((packet) => packet.ready_for_manual_release_review === 'true').length;
  const queuedCount = queueRows.filter((row) => row.queue_status === 'queued_for_manual_release_review').length;
  const reviewRecordPresent = Boolean(reviewRecord);
  const reviewCoreReady = reviewRecordCoreReady(reviewRecord);
  const forbiddenTokenDetected = reviewRecordHasForbiddenToken(reviewRecord);
  const providerCallsAuthorized = normalizeBoolean(reviewRecord?.provider_calls_authorized);
  const productionDeployAuthorized = normalizeBoolean(reviewRecord?.production_deploy_authorized);
  const pageDisplayAuthorized = normalizeBoolean(reviewRecord?.page_display_authorized);
  const csvFactExportAuthorized = normalizeBoolean(reviewRecord?.csv_fact_export_authorized);
  const approvedForPatchCandidateCount = decisionRows.filter((row) => row.approved_for_source_registry_patch_candidate === 'true').length;

  const rows = [
    {
      boundary_id: 'public_source_release_review:queue_coverage',
      checked_item: 'Every ready intake packet has one release review queue row',
      expected_value: String(readyPacketCount),
      observed_value: String(queuedCount),
      boundary_status: readyPacketCount === queuedCount ? 'passed' : 'blocked',
      blocking_reason: readyPacketCount === queuedCount ? '' : 'release-review-queue-coverage-gap',
    },
    {
      boundary_id: 'public_source_release_review:review_record_present',
      checked_item: 'Manual release review record is present when approvals are requested',
      expected_value: readyPacketCount > 0 ? 'true' : 'optional',
      observed_value: String(reviewRecordPresent),
      boundary_status: reviewRecordPresent || readyPacketCount === 0 ? 'passed' : 'blocked',
      blocking_reason: reviewRecordPresent || readyPacketCount === 0 ? '' : 'manual-release-review-record-required',
    },
    {
      boundary_id: 'public_source_release_review:review_record_core_fields',
      checked_item: 'Review record has reviewer, date, id, and completed flag',
      expected_value: reviewRecordPresent ? 'true' : 'optional',
      observed_value: String(reviewCoreReady),
      boundary_status: reviewRecordPresent ? (reviewCoreReady ? 'passed' : 'blocked') : 'passed',
      blocking_reason: reviewRecordPresent && !reviewCoreReady ? 'review-record-core-fields-missing' : '',
    },
    {
      boundary_id: 'public_source_release_review:forbidden_token_scan',
      checked_item: 'Review record does not contain forbidden token patterns',
      expected_value: 'false',
      observed_value: String(forbiddenTokenDetected),
      boundary_status: forbiddenTokenDetected ? 'blocked' : 'passed',
      blocking_reason: forbiddenTokenDetected ? 'forbidden-token-pattern-detected' : '',
    },
    {
      boundary_id: 'public_source_release_review:provider_calls',
      checked_item: 'No provider calls are authorized by this review gate',
      expected_value: 'false',
      observed_value: String(providerCallsAuthorized),
      boundary_status: providerCallsAuthorized ? 'blocked' : 'passed',
      blocking_reason: providerCallsAuthorized ? 'provider-call-authorization-not-allowed' : '',
    },
    {
      boundary_id: 'public_source_release_review:production_deploy',
      checked_item: 'No production deployment is authorized by this review gate',
      expected_value: 'false',
      observed_value: String(productionDeployAuthorized),
      boundary_status: productionDeployAuthorized ? 'blocked' : 'passed',
      blocking_reason: productionDeployAuthorized ? 'production-deploy-authorization-not-allowed' : '',
    },
    {
      boundary_id: 'public_source_release_review:page_display',
      checked_item: 'No page fact display update is authorized by this review gate',
      expected_value: 'false',
      observed_value: String(pageDisplayAuthorized),
      boundary_status: pageDisplayAuthorized ? 'blocked' : 'passed',
      blocking_reason: pageDisplayAuthorized ? 'page-display-authorization-requires-separate-change' : '',
    },
    {
      boundary_id: 'public_source_release_review:csv_fact_export',
      checked_item: 'No CSV fact export is authorized by this review gate',
      expected_value: 'false',
      observed_value: String(csvFactExportAuthorized),
      boundary_status: csvFactExportAuthorized ? 'blocked' : 'passed',
      blocking_reason: csvFactExportAuthorized ? 'csv-fact-export-requires-separate-change' : '',
    },
    {
      boundary_id: 'public_source_release_review:write_flags',
      checked_item: 'Decision rows do not write registry, page, or CSV facts',
      expected_value: 'false,false,false',
      observed_value: decisionRows
        .map((row) => `${row.can_write_source_registry},${row.can_update_page_display},${row.can_export_as_fact_csv}`)
        .join('|'),
      boundary_status: decisionRows.every(
        (row) =>
          row.can_write_source_registry === 'false' &&
          row.can_update_page_display === 'false' &&
          row.can_export_as_fact_csv === 'false',
      )
        ? 'passed'
        : 'blocked',
      blocking_reason: decisionRows.every(
        (row) =>
          row.can_write_source_registry === 'false' &&
          row.can_update_page_display === 'false' &&
          row.can_export_as_fact_csv === 'false',
      )
        ? ''
        : 'release-review-gate-must-not-write-business-facts',
    },
    {
      boundary_id: 'public_source_release_review:patch_planning_only',
      checked_item: 'Approved rows are source registry patch candidates only',
      expected_value: String(approvedForPatchCandidateCount),
      observed_value: String(approvedForPatchCandidateCount),
      boundary_status: 'passed',
      blocking_reason: approvedForPatchCandidateCount > 0 ? 'separate reviewed source registry patch still required' : '',
    },
  ];

  return rows;
}

function countBy(rows, getter) {
  return rows.reduce((acc, row) => {
    const key = getter(row) || 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function buildSummary({ packetGatePath, outDir, packetRows, queueRows, decisionRows, boundaryRows, reviewRecord }) {
  const readyPacketCount = packetRows.filter((packet) => packet.ready_for_manual_release_review === 'true').length;
  const approvedPatchCandidateCount = decisionRows.filter((row) => row.approved_for_source_registry_patch_candidate === 'true').length;
  const boundaryBlockedCount = boundaryRows.filter((row) => row.boundary_status !== 'passed').length;

  return {
    generatedAt: new Date().toISOString(),
    inputPacketGatePath: packetGatePath,
    outputDir: outDir,
    packetCount: packetRows.length,
    readyPacketCount,
    queuedForManualReleaseReviewCount: queueRows.filter((row) => row.queue_status === 'queued_for_manual_release_review').length,
    blockedIntakePacketCount: queueRows.filter((row) => row.queue_status === 'blocked_intake_not_ready').length,
    reviewRecordPresent: Boolean(reviewRecord),
    reviewRecordCoreReady: reviewRecordCoreReady(reviewRecord),
    approvedPatchCandidateCount,
    replacementSourceRequiredCount: decisionRows.filter((row) => row.replacement_source_required === 'true').length,
    scopeMismatchRejectedCount: decisionRows.filter((row) => row.scope_mismatch_rejected === 'true').length,
    vendorAccessBlockedCount: decisionRows.filter((row) => row.vendor_access_blocked === 'true').length,
    decisionStatusCounts: countBy(decisionRows, (row) => row.release_review_status),
    boundaryRowCount: boundaryRows.length,
    blockedBoundaryCount: boundaryBlockedCount,
    validationPassed: boundaryBlockedCount === 0,
    boundaries: {
      providerCalls: false,
      restrictedConnectorAccess: false,
      publicEvidenceLiveCapture: false,
      productionWrites: false,
      productionDeploy: false,
      factPromotion: false,
      sourceRegistryWrites: false,
      pageWrites: false,
      csvFactExport: false,
      sourceRegistryPatchPlanningOnly: approvedPatchCandidateCount > 0,
      separateSourceRegistryPatchRequired: approvedPatchCandidateCount > 0,
    },
    allowedReviewStatuses: [...ALLOWED_REVIEW_STATUSES],
  };
}

function buildRunbook(summary) {
  return `---\ntitle: mkt53 public source manual release review ${dateSlug()}\nstatus: manual-release-review-gate-only\ncreated_at: ${summary.generatedAt}\nprovider_calls: false\nrestricted_connector_access: false\nproduction_writes: false\nfact_promotion: false\nsource_registry_writes: false\npage_writes: false\ncsv_fact_export: false\n---\n\n# mkt53 Public Source Manual Release Review ${dateSlug()}\n\n## Boundary\n\n- providerCalls=false\n- restrictedConnectorAccess=false\n- publicEvidenceLiveCapture=false\n- productionWrites=false\n- productionDeploy=false\n- factPromotion=false\n- sourceRegistryWrites=false\n- pageWrites=false\n- csvFactExport=false\n\nThis gate consumes manual evidence intake validation rows and review-record metadata. It can mark a row as a source registry patch candidate, but it does not write the registry, update page display data, export CSV facts, deploy production, call providers, or access restricted connectors.\n\n## Summary\n\n- packetCount=${summary.packetCount}\n- readyPacketCount=${summary.readyPacketCount}\n- queuedForManualReleaseReviewCount=${summary.queuedForManualReleaseReviewCount}\n- blockedIntakePacketCount=${summary.blockedIntakePacketCount}\n- reviewRecordPresent=${summary.reviewRecordPresent}\n- approvedPatchCandidateCount=${summary.approvedPatchCandidateCount}\n- blockedBoundaryCount=${summary.blockedBoundaryCount}\n\n## Next Gate\n\n1. If ready packets exist, collect a review record with exact task_id/source_id scope.\n2. Re-run this gate with --review-record.\n3. For rows marked approved_for_source_registry_patch_candidate, prepare a separate source registry patch and review it before any page or CSV fact promotion.\n`;
}

function buildManifest(summary, outputSpecs) {
  return {
    generatedAt: summary.generatedAt,
    inputs: {
      packetGatePath: summary.inputPacketGatePath,
    },
    outputs: outputSpecs,
    boundaries: summary.boundaries,
    allowedReviewStatuses: summary.allowedReviewStatuses,
  };
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const appRoot = process.cwd();
  const packetGatePath = resolvePacketGatePath(appRoot, options);
  const reviewRecordPath = resolveMaybe(appRoot, options.reviewRecordPath);
  const outDir = resolve(appRoot, options.outDir ?? `tmp/audits/public-source-manual-release-review-${dateSlug()}`);
  const packetRows = readCsvFile(packetGatePath, PACKET_GATE_REQUIRED_COLUMNS);
  const reviewRecord = readReviewRecord(reviewRecordPath);
  const queueRows = buildQueueRows(packetRows);
  const decisionRows = buildDecisionRows(packetRows, reviewRecord);
  const boundaryRows = buildBoundaryRows({ packetRows, queueRows, decisionRows, reviewRecord });
  const summary = buildSummary({ packetGatePath, outDir, packetRows, queueRows, decisionRows, boundaryRows, reviewRecord });
  const outputSpecs = {
    'manual_release_review_queue.csv': {
      rowCount: queueRows.length,
      headers: REVIEW_QUEUE_FIELDS,
      sha256: fileHash([REVIEW_QUEUE_FIELDS.join(','), ...queueRows.map((row) => REVIEW_QUEUE_FIELDS.map((field) => csvEscape(row[field])).join(','))].join('\n')),
    },
    'manual_release_review_decision_matrix.csv': {
      rowCount: decisionRows.length,
      headers: DECISION_FIELDS,
      sha256: fileHash([DECISION_FIELDS.join(','), ...decisionRows.map((row) => DECISION_FIELDS.map((field) => csvEscape(row[field])).join(','))].join('\n')),
    },
    'manual_release_review_boundary_audit.csv': {
      rowCount: boundaryRows.length,
      headers: BOUNDARY_FIELDS,
      sha256: fileHash([BOUNDARY_FIELDS.join(','), ...boundaryRows.map((row) => BOUNDARY_FIELDS.map((field) => csvEscape(row[field])).join(','))].join('\n')),
    },
    'manual_release_review_runbook.md': {
      rowCount: 1,
      headers: ['markdown'],
    },
  };
  const manifest = buildManifest(summary, outputSpecs);

  if (!options.noWrite) {
    mkdirSync(outDir, { recursive: true });
    writeCsv(join(outDir, 'manual_release_review_queue.csv'), queueRows, REVIEW_QUEUE_FIELDS);
    writeCsv(join(outDir, 'manual_release_review_decision_matrix.csv'), decisionRows, DECISION_FIELDS);
    writeCsv(join(outDir, 'manual_release_review_boundary_audit.csv'), boundaryRows, BOUNDARY_FIELDS);
    writeFileSync(join(outDir, 'manual_release_review_runbook.md'), buildRunbook(summary));
    writeFileSync(join(outDir, 'manual_release_review_summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(outDir, 'manual_release_review_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const payload = {
    summary,
    manifest,
    sampleQueueRows: queueRows.slice(0, 3),
    sampleDecisionRows: decisionRows.slice(0, 3),
    sampleBoundaryRows: boundaryRows.slice(0, 6),
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write([
      'mkt53 public source manual release review gate',
      `generatedAt=${summary.generatedAt}`,
      `packetCount=${summary.packetCount}`,
      `readyPacketCount=${summary.readyPacketCount}`,
      `queuedForManualReleaseReviewCount=${summary.queuedForManualReleaseReviewCount}`,
      `approvedPatchCandidateCount=${summary.approvedPatchCandidateCount}`,
      `sourceRegistryWrites=${summary.boundaries.sourceRegistryWrites}`,
      `pageWrites=${summary.boundaries.pageWrites}`,
      `csvFactExport=${summary.boundaries.csvFactExport}`,
      `outputDir=${summary.outputDir}`,
      '',
    ].join('\n'));
  }

  return payload;
}

try {
  run();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
