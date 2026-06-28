#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const INPUT_DIR_NAME = 'erp-governance-batch7-20260625';
const OUTPUT_DIR_NAME = 'erp-owner-approval-batch8-20260625';
const INPUT_DIR = join(repoRoot, 'tmp/exports', INPUT_DIR_NAME);
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'missing-authorized-owner-approval-records';

const INPUTS = {
  batch7Manifest: join(INPUT_DIR, 'batch7_erp_governance_manifest.json'),
  fieldDictionary: join(INPUT_DIR, 'erp_field_dictionary_readiness.csv'),
  categoryReview: join(INPUT_DIR, 'erp_category_review_queue.csv'),
  subtotalReview: join(INPUT_DIR, 'erp_subtotal_reconciliation_queue.csv'),
  displayGate: join(INPUT_DIR, 'erp_display_approval_gate.csv'),
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
  if (!existsSync(filePath)) throw new Error(`Missing Batch8 input: ${filePath}`);
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

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitPipe(value) {
  return String(value ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function priorityForSource(sourceId) {
  if (['ds-047', 'ds-048', 'ds-049'].includes(sourceId)) return 'P0';
  return 'P1';
}

function priorityRank(priority) {
  return { P0: 0, P1: 1, P2: 2 }[priority] ?? 9;
}

function summarizeStatuses(rows, field) {
  return uniq(rows.map((row) => row[field])).join('|');
}

function buildFieldOwnerRows(fieldRows) {
  const grouped = new Map();
  for (const row of fieldRows) {
    const key = `${row.source_id}:${row.table_name}`;
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  return [...grouped.entries()].map(([key, rows]) => {
    const [sourceId, tableName] = key.split(':');
    const fieldNames = rows.map((row) => row.field_name);
    const unitTypes = uniq(rows.map((row) => row.unit));
    const currencyFlags = uniq(rows.map((row) => row.currency).filter((item) => item !== ''));
    const hiddenColumns = rows.filter((row) => String(row.hidden_column_behavior).includes('blocked')).length;
    return {
      approval_packet_id: `batch8_field_owner:${sourceId}:${tableName}`,
      source_id: sourceId,
      table_name: tableName,
      owner_role: sourceId === 'ds-048' ? 'after-sales-data-owner; ERP-data-owner' : 'sales-operations-owner; ERP-data-owner',
      priority: priorityForSource(sourceId),
      field_count: rows.length,
      unit_types: unitTypes.join('|'),
      currency_flags: currencyFlags.join('|') || 'none',
      hidden_or_subtotal_fields: hiddenColumns,
      review_statuses: summarizeStatuses(rows, 'review_status'),
      dictionary_statuses: summarizeStatuses(rows, 'dictionary_status'),
      editable_decision_fields: 'business_meaning; unit; currency; hidden_column_behavior; display_scope; approval_decision; approver; approval_date',
      acceptance_criteria: 'all required fields have owner-approved meaning, unit, currency policy, hidden/subtotal behavior, and display scope',
      source_artifacts: uniq(rows.map((row) => row.source_artifact)).join('|'),
      field_names_included: 'true',
      raw_business_values_included: 'false',
      approval_status: 'pending_owner_record',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
      next_evidence: 'signed or auditable owner approval record for field dictionary and display scope',
    };
  });
}

function buildCategoryOwnerRows(categoryRows) {
  return categoryRows.map((row) => ({
    approval_packet_id: `batch8_category_owner:${row.category_proxy}`,
    category_proxy: row.category_proxy,
    mapped_page_category: row.mapped_page_category,
    source_ids: row.source_ids,
    owner_role: 'category-owner; ERP-data-owner; data-governance',
    priority: row.priority,
    sku_hash_count: row.sku_hash_count,
    raw_row_count: row.raw_row_count,
    visible_proxy_units: row.visible_proxy_units,
    current_confidence: row.current_confidence,
    required_decision: 'approve_or_reject_taxonomy_rule_and_unmapped_handling',
    editable_decision_fields: 'taxonomy_rule; include_exclude_decision; sampled_sku_hash_review; display_scope; approval_decision; approver; approval_date',
    acceptance_criteria: row.acceptance_criteria,
    approval_status: 'pending_owner_record',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildSubtotalOwnerRows(subtotalRows) {
  return subtotalRows.map((row) => ({
    approval_packet_id: `batch8_subtotal_owner:${row.reconciliation_id}`,
    reconciliation_id: row.reconciliation_id,
    source_id: row.source_id,
    affected_table: row.affected_table,
    owner_role: 'ERP-data-owner; data-governance',
    priority: row.reconciliation_status.includes('blocked') ? 'P0' : 'P1',
    issue: row.issue,
    observed_delta_units: row.observed_delta_units,
    current_status: row.reconciliation_status,
    likely_cause: row.likely_cause,
    editable_decision_fields: 'official_subtotal_formula; hidden_column_behavior; week_boundary_policy; approval_decision; approver; approval_date',
    acceptance_criteria: 'owner-approved explanation for subtotal, hidden columns, date/window boundary, and whether proxy values may be used',
    approval_status: 'pending_owner_record',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
    next_evidence: row.next_evidence,
  }));
}

function buildDisplayApprovalTemplateRows(displayRows) {
  return displayRows.map((row) => ({
    approval_record_id: `batch8_display_record:${row.table_name}`,
    source_gate_id: row.approval_gate_id,
    table_name: row.table_name,
    surface: row.surface,
    source_ids: row.source_ids,
    evidence_artifact_path: row.evidence_artifact_path,
    required_reviews: row.required_reviews,
    owner_role: 'business-data-owner; data-governance; privacy-reviewer',
    priority: row.table_name === 'market_trend_monthly' ? 'P0' : 'P1',
    approval_decision: 'pending',
    approver_role: '',
    approver_name_hash: '',
    approval_date: '',
    approval_record_uri: '',
    allowed_display: row.allowed_display,
    forbidden_display: row.forbidden_display,
    can_export: 'false',
    can_display_as_fact: 'false',
    record_status: 'missing_owner_record',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    blocking_reason: BLOCKING_REASON,
  }));
}

function backlogRow({ id, lane, sourceIds, tableNames, ownerRole, priority, status, requiredDecision, requiredEvidence, packet }) {
  return {
    approval_item_id: id,
    approval_lane: lane,
    source_ids: Array.isArray(sourceIds) ? sourceIds.join('|') : sourceIds,
    affected_tables: Array.isArray(tableNames) ? tableNames.join('|') : tableNames,
    owner_role: ownerRole,
    priority,
    current_status: status,
    required_decision: requiredDecision,
    required_evidence: requiredEvidence,
    acceptance_criteria: 'owner approval record must be auditable, dated, scoped to fields/tables/surfaces, and explicitly preserve forbidden-display rules',
    editable_packet: packet,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  };
}

function buildBacklogRows(fieldOwnerRows, categoryOwnerRows, subtotalOwnerRows, displayTemplateRows) {
  const rows = [
    ...fieldOwnerRows.map((row) =>
      backlogRow({
        id: row.approval_packet_id,
        lane: 'field_dictionary_owner_approval',
        sourceIds: row.source_id,
        tableNames: row.table_name,
        ownerRole: row.owner_role,
        priority: row.priority,
        status: row.approval_status,
        requiredDecision: 'approve field meanings, units, currencies, hidden/subtotal behavior, and display scope',
        requiredEvidence: 'signed field dictionary or auditable owner approval record',
        packet: 'erp_field_owner_approval_packet.csv',
      }),
    ),
    ...categoryOwnerRows.map((row) =>
      backlogRow({
        id: row.approval_packet_id,
        lane: 'category_owner_approval',
        sourceIds: row.source_ids,
        tableNames: row.mapped_page_category,
        ownerRole: row.owner_role,
        priority: row.priority,
        status: row.approval_status,
        requiredDecision: row.required_decision,
        requiredEvidence: 'approved taxonomy rule and sampled SKU-hash review record',
        packet: 'erp_category_owner_approval_packet.csv',
      }),
    ),
    ...subtotalOwnerRows.map((row) =>
      backlogRow({
        id: row.approval_packet_id,
        lane: 'subtotal_behavior_owner_approval',
        sourceIds: row.source_id,
        tableNames: row.affected_table,
        ownerRole: row.owner_role,
        priority: row.priority,
        status: row.approval_status,
        requiredDecision: 'approve official subtotal formula, hidden-column behavior, and date/window boundary',
        requiredEvidence: 'ERP owner explanation and data-governance reconciliation note',
        packet: 'erp_subtotal_owner_explanation_packet.csv',
      }),
    ),
    ...displayTemplateRows.map((row) =>
      backlogRow({
        id: row.approval_record_id,
        lane: 'display_approval_record',
        sourceIds: splitPipe(row.source_ids),
        tableNames: row.table_name,
        ownerRole: row.owner_role,
        priority: row.priority,
        status: row.record_status,
        requiredDecision: 'approve or deny each table/surface display and export scope',
        requiredEvidence: 'display approval record with approver, date, URI, allowed display, and forbidden display',
        packet: 'erp_display_approval_record_template.csv',
      }),
    ),
  ];

  return rows.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.approval_lane.localeCompare(b.approval_lane));
}

const outputSpecs = {
  'erp_field_owner_approval_packet.csv': [
    'approval_packet_id',
    'source_id',
    'table_name',
    'owner_role',
    'priority',
    'field_count',
    'unit_types',
    'currency_flags',
    'hidden_or_subtotal_fields',
    'review_statuses',
    'dictionary_statuses',
    'editable_decision_fields',
    'acceptance_criteria',
    'source_artifacts',
    'field_names_included',
    'raw_business_values_included',
    'approval_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
    'next_evidence',
  ],
  'erp_category_owner_approval_packet.csv': [
    'approval_packet_id',
    'category_proxy',
    'mapped_page_category',
    'source_ids',
    'owner_role',
    'priority',
    'sku_hash_count',
    'raw_row_count',
    'visible_proxy_units',
    'current_confidence',
    'required_decision',
    'editable_decision_fields',
    'acceptance_criteria',
    'approval_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_subtotal_owner_explanation_packet.csv': [
    'approval_packet_id',
    'reconciliation_id',
    'source_id',
    'affected_table',
    'owner_role',
    'priority',
    'issue',
    'observed_delta_units',
    'current_status',
    'likely_cause',
    'editable_decision_fields',
    'acceptance_criteria',
    'approval_status',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
    'next_evidence',
  ],
  'erp_display_approval_record_template.csv': [
    'approval_record_id',
    'source_gate_id',
    'table_name',
    'surface',
    'source_ids',
    'evidence_artifact_path',
    'required_reviews',
    'owner_role',
    'priority',
    'approval_decision',
    'approver_role',
    'approver_name_hash',
    'approval_date',
    'approval_record_uri',
    'allowed_display',
    'forbidden_display',
    'can_export',
    'can_display_as_fact',
    'record_status',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
  'erp_owner_approval_backlog.csv': [
    'approval_item_id',
    'approval_lane',
    'source_ids',
    'affected_tables',
    'owner_role',
    'priority',
    'current_status',
    'required_decision',
    'required_evidence',
    'acceptance_criteria',
    'editable_packet',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
};

function buildArtifacts() {
  if (!existsSync(INPUTS.batch7Manifest)) throw new Error(`Missing Batch7 manifest: ${INPUTS.batch7Manifest}`);
  const batch7Manifest = JSON.parse(readFileSync(INPUTS.batch7Manifest, 'utf8'));
  const fieldRows = readCsvObjects(INPUTS.fieldDictionary);
  const categoryRows = readCsvObjects(INPUTS.categoryReview);
  const subtotalRows = readCsvObjects(INPUTS.subtotalReview);
  const displayRows = readCsvObjects(INPUTS.displayGate);

  const fieldOwnerRows = buildFieldOwnerRows(fieldRows);
  const categoryOwnerRows = buildCategoryOwnerRows(categoryRows);
  const subtotalOwnerRows = buildSubtotalOwnerRows(subtotalRows);
  const displayTemplateRows = buildDisplayApprovalTemplateRows(displayRows);
  const backlogRows = buildBacklogRows(fieldOwnerRows, categoryOwnerRows, subtotalOwnerRows, displayTemplateRows);

  const rowsByFile = {
    'erp_field_owner_approval_packet.csv': fieldOwnerRows,
    'erp_category_owner_approval_packet.csv': categoryOwnerRows,
    'erp_subtotal_owner_explanation_packet.csv': subtotalOwnerRows,
    'erp_display_approval_record_template.csv': displayTemplateRows,
    'erp_owner_approval_backlog.csv': backlogRows,
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

  const priorityCounts = backlogRows.reduce((acc, row) => {
    acc[row.priority] = (acc[row.priority] ?? 0) + 1;
    return acc;
  }, {});

  const manifest = {
    batchId: OUTPUT_DIR_NAME,
    generatedAt: new Date().toISOString(),
    generatedRule: 'Local owner-approval packet derivation from Batch7 governance artifacts only; no ERP login, provider call, production write, raw business values, or approval promotion.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
    evidenceGrade: EVIDENCE_GRADE,
    privacyLevel: PRIVACY_LEVEL,
    canDisplayAsFact: false,
    blockingReason: BLOCKING_REASON,
    upstreamBatch: {
      batchId: batch7Manifest.batchId,
      manifestPath: `tmp/exports/${INPUT_DIR_NAME}/batch7_erp_governance_manifest.json`,
      blockedRows: batch7Manifest.summary?.blockedRows ?? null,
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
      fieldNamesIncluded: true,
      approvalRecordsApplied: 0,
      approvalsGranted: false,
      fieldDictionaryApproved: false,
      categoryApprovalGranted: false,
      subtotalBehaviorApproved: false,
      displayApprovalGranted: false,
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
      fieldOwnerPackets: fieldOwnerRows.length,
      categoryOwnerPackets: categoryOwnerRows.length,
      subtotalOwnerPackets: subtotalOwnerRows.length,
      displayApprovalTemplates: displayTemplateRows.length,
      approvalBacklogRows: backlogRows.length,
      p0ApprovalRows: priorityCounts.P0 ?? 0,
      p1ApprovalRows: priorityCounts.P1 ?? 0,
      approvalRecordsApplied: 0,
      readyToDisplayRows: 0,
      remainingBlockedRows: backlogRows.length,
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
    writeFileSync(join(OUTPUT_DIR, 'batch8_erp_owner_approval_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch8 owner approval packets ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.approvalBacklogRows} backlog rows, ${manifest.summary.p0ApprovalRows} P0 rows, approvals applied=${manifest.summary.approvalRecordsApplied}.\n`,
  );
}

main();
