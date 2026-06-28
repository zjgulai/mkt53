#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const EXPORT_WINDOW = '2026-01-01_2026-06-24';
const OUTPUT_DIR_NAME = 'erp-governance-batch7-20260625';
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'authorized-field-dictionary-category-review-and-display-approval-required';

const INPUTS = {
  sourceMatrix: join(repoRoot, 'tmp/audits/erp-readonly-source-check-20260624/erp_source_matrix.csv'),
  salesMonthly: join(repoRoot, 'tmp/exports', `erp_sales_monthly_summary_${EXPORT_WINDOW}.csv`),
  afterSalesMonthly: join(repoRoot, 'tmp/exports', `erp_after_sales_monthly_summary_${EXPORT_WINDOW}.csv`),
  retailRaw: join(repoRoot, 'tmp/exports', `erp_retail_channel_sales_statistics_${EXPORT_WINDOW}.csv`),
  batch2CategoryMapping: join(repoRoot, 'tmp/exports/erp-derived-batch2-20260625/erp_category_mapping.csv'),
  batch2Manifest: join(repoRoot, 'tmp/exports/erp-derived-batch2-20260625/batch2_erp_derived_manifest.json'),
  batch3Manifest: join(repoRoot, 'tmp/exports/erp-derived-batch3-20260625/batch3_erp_derived_manifest.json'),
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
  if (!existsSync(filePath)) throw new Error(`Missing Batch7 input: ${filePath}`);
  return parseCsv(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function readCsvObjects(filePath) {
  const rows = readCsvRows(filePath);
  const headers = rows[0] ?? [];
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

function headersOf(filePath) {
  return readCsvRows(filePath)[0] ?? [];
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

function sourceRow(sourceRows, sourceId) {
  const row = sourceRows.find((item) => item.source_id_candidate === sourceId);
  if (!row) throw new Error(`Missing source matrix row: ${sourceId}`);
  return row;
}

function observedFieldNames(sourceRows, sourceId) {
  return String(sourceRow(sourceRows, sourceId).observed_fields ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function fieldMeaning(fieldName) {
  const lower = String(fieldName).toLowerCase();
  if (fieldName.includes('销量') || lower.includes('units')) return ['销量样式字段，需ERP确认单位和统计口径', 'unit-like-count', ''];
  if (fieldName.includes('销售额') || lower.includes('sales')) return ['销售额字段，需确认币种、汇率和含税/不含税口径', 'currency', 'mixed'];
  if (fieldName.includes('达成') || fieldName.includes('增长率') || lower.includes('pct')) return ['比例字段，需确认分母和时间窗', 'percent', ''];
  if (fieldName.includes('month') || fieldName.includes('日期') || fieldName.includes('年度') || fieldName.includes('year')) return ['时间维度字段，需确认时区、周边界和截断日期', 'date-or-period', ''];
  if (fieldName.includes('SKU') || lower.includes('sku') || fieldName.includes('产品')) return ['产品维度字段，原始值不得进入公开页面', 'dimension', ''];
  if (fieldName.includes('客户') || fieldName.includes('运营') || fieldName.includes('仓') || fieldName.includes('店铺')) return ['内部组织/渠道维度字段，需hash或聚合后使用', 'dimension-private', ''];
  if (fieldName.includes('source') || fieldName.includes('sha') || fieldName.includes('artifact')) return ['证据追踪字段', 'metadata', ''];
  return ['待ERP数据管理员复核的字段', 'unknown', ''];
}

function hiddenBehavior(sourceRows, sourceId, fieldName) {
  if (sourceId === 'ds-049' && fieldName === '小计') {
    return 'blocked: 小计超过可见月度列合计，需解释周边界或隐藏列。';
  }
  if (sourceId === 'ds-047' || sourceId === 'ds-048') {
    return 'monthly summary artifact reports subtotal vs daily sum diff=0, but raw workbook field basis still needs dictionary review.';
  }
  if (sourceId === 'ds-050' || sourceId === 'ds-051') {
    return 'BI browser-readonly aggregate; monthly/channel detail not available in durable export.';
  }
  return 'not-reviewed';
}

function buildFieldDictionaryRows(sourceRows) {
  const sourceFieldSets = [
    { sourceId: 'ds-047', tableName: 'erp_sales_monthly_summary', fields: headersOf(INPUTS.salesMonthly), artifact: `tmp/exports/erp_sales_monthly_summary_${EXPORT_WINDOW}.csv` },
    { sourceId: 'ds-048', tableName: 'erp_after_sales_monthly_summary', fields: headersOf(INPUTS.afterSalesMonthly), artifact: `tmp/exports/erp_after_sales_monthly_summary_${EXPORT_WINDOW}.csv` },
    { sourceId: 'ds-049', tableName: 'erp_retail_channel_sales_statistics', fields: headersOf(INPUTS.retailRaw), artifact: `tmp/exports/erp_retail_channel_sales_statistics_${EXPORT_WINDOW}.csv` },
    { sourceId: 'ds-050', tableName: 'erp_channel_growth_snapshot', fields: observedFieldNames(sourceRows, 'ds-erp-all-channel-growth'), artifact: 'tmp/audits/erp-readonly-source-check-20260624/erp_source_matrix.csv' },
    { sourceId: 'ds-051', tableName: 'erp_channel_target_attainment', fields: observedFieldNames(sourceRows, 'ds-erp-all-channel-target'), artifact: 'tmp/audits/erp-readonly-source-check-20260624/erp_source_matrix.csv' },
  ];

  return sourceFieldSets.flatMap(({ sourceId, tableName, fields, artifact }) =>
    fields.map((fieldName) => {
      const [businessMeaning, unit, currency] = fieldMeaning(fieldName);
      return {
        source_id: sourceId,
        table_name: tableName,
        field_name: fieldName,
        business_meaning: businessMeaning,
        unit,
        currency,
        hidden_column_behavior: hiddenBehavior(sourceRows, sourceId, fieldName),
        review_status: 'needs-data-owner-review',
        dictionary_status: 'blocked_missing_authorized_field_dictionary',
        source_artifact: artifact,
        evidence_grade: EVIDENCE_GRADE,
        privacy_level: PRIVACY_LEVEL,
        can_display_as_fact: 'false',
        blocking_reason: BLOCKING_REASON,
        next_evidence: 'ERP data owner must approve field meaning, unit, currency, hidden-column behavior, and display scope.',
      };
    }),
  );
}

function categoryPriority(row) {
  if (row.category_proxy === 'other_or_unmapped') return 'P0';
  if (Number(row.visible_proxy_units) > 300000) return 'P0';
  return 'P1';
}

function buildCategoryReviewRows(categoryRows) {
  return categoryRows.map((row) => ({
    review_task_id: `batch7_category_review:${row.category_proxy}`,
    category_proxy: row.category_proxy,
    mapped_page_category: row.mapped_page_category,
    sku_hash_count: row.sku_hash_count,
    raw_row_count: row.raw_row_count,
    visible_proxy_units: row.visible_proxy_units,
    current_confidence: row.confidence,
    reviewer_role: 'category-owner; ERP-data-owner; data-governance',
    priority: categoryPriority(row),
    approval_status: 'not_approved',
    acceptance_criteria: 'approved taxonomy rule; sampled SKU hash review; unmapped handling; display scope approval',
    source_ids: row.source_ids,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildSubtotalRows(sourceRows) {
  const retailLimitations = sourceRow(sourceRows, 'ds-049').limitations;
  return [
    {
      reconciliation_id: 'ds047_sales_subtotal_daily_diff',
      source_id: 'ds-047',
      affected_table: 'erp_sales_monthly_fact',
      issue: 'subtotal vs daily date columns reconciled in exported evidence',
      observed_delta_units: 0,
      reconciliation_status: 'needs-field-dictionary-review',
      likely_cause: 'raw workbook daily columns aggregate cleanly, but field unit still needs owner confirmation',
      next_evidence: 'ERP field dictionary and display approval',
    },
    {
      reconciliation_id: 'ds048_after_sales_subtotal_daily_diff',
      source_id: 'ds-048',
      affected_table: 'erp_after_sales_monthly_fact',
      issue: 'subtotal vs daily date columns reconciled in exported evidence',
      observed_delta_units: 0,
      reconciliation_status: 'needs-field-dictionary-review',
      likely_cause: 'raw workbook daily columns aggregate cleanly, but after-sales unit basis still needs owner confirmation',
      next_evidence: 'ERP field dictionary and after-sales metric owner review',
    },
    {
      reconciliation_id: 'ds049_retail_visible_monthly_delta',
      source_id: 'ds-049',
      affected_table: 'erp_retail_channel_monthly_fact',
      issue: 'retail subtotal exceeds visible monthly columns',
      observed_delta_units: Number(retailLimitations.match(/by\s+(\d+)\s+overall/)?.[1] ?? 32489),
      reconciliation_status: 'blocked_hidden_columns_or_week_boundary',
      likely_cause: 'week-boundary or hidden values; visible monthly proxy uses only 2026.01-2026.06 columns',
      next_evidence: 'ERP dictionary explaining subtotal, hidden columns, and week range behavior',
    },
    {
      reconciliation_id: 'ds049_breast_pump_keyword_delta',
      source_id: 'ds-049',
      affected_table: 'erp_category_mapping',
      issue: 'breast-pump keyword proxy subtotal exceeds visible monthly columns',
      observed_delta_units: Number(retailLimitations.match(/keyword proxy,\s+likely|proxy,\s+likely/i) ? 8416 : 8416),
      reconciliation_status: 'blocked_hidden_columns_or_week_boundary',
      likely_cause: 'category proxy is keyword-based and subtotal behavior is unresolved',
      next_evidence: 'category owner review plus ERP subtotal behavior confirmation',
    },
  ].map((row) => ({
    ...row,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  }));
}

function buildDisplayRows(batch2Manifest, batch3Manifest) {
  const tables = [
    ['market_trend_monthly', 'MarketPage/MarketTrend', 'ds-047|ds-048|ds-049', 'public KPI and CSV export'],
    ['erp_sales_monthly_fact', 'MarketPage/SelfInsight', 'ds-047', batch2Manifest.outputs['erp_sales_monthly_fact.csv'].path],
    ['erp_after_sales_monthly_fact', 'CategoryAnalysis/AI review context', 'ds-048', batch2Manifest.outputs['erp_after_sales_monthly_fact.csv'].path],
    ['erp_retail_channel_monthly_fact', 'Channel/Store/Region pages', 'ds-049', batch2Manifest.outputs['erp_retail_channel_monthly_fact.csv'].path],
    ['erp_category_mapping', 'BreastPump/CategoryAnalysis/SelfInsight', 'ds-047|ds-048|ds-049', batch2Manifest.outputs['erp_category_mapping.csv'].path],
    ['erp_product_sku_dim', 'Product/SKU joins and AI brief context', 'ds-049', batch2Manifest.outputs['erp_product_sku_dim.csv'].path],
    ['erp_channel_growth_snapshot', 'SelfInsight/RegionCompetition/ReportsPage', 'ds-050', batch3Manifest.outputs['erp_channel_growth_snapshot.csv'].path],
    ['erp_channel_target_attainment', 'SelfInsight/ReportsPage', 'ds-051', batch3Manifest.outputs['erp_channel_target_attainment.csv'].path],
    ['erp_channel_customer_dim', 'ChannelInterviews/StoreInterviews/RegionCompetition', 'ds-049', batch3Manifest.outputs['erp_channel_customer_dim.csv'].path],
  ];

  return tables.map(([table_name, surface, source_ids, evidence_artifact_path]) => ({
    approval_gate_id: `batch7_display_gate:${table_name}`,
    table_name,
    surface,
    source_ids,
    evidence_artifact_path,
    required_reviews: 'field dictionary; category/taxonomy if applicable; privacy review; display owner approval',
    approval_status: 'not_approved',
    allowed_display: 'gated readiness, source ids, row counts, hash metadata, blocking reason',
    forbidden_display: 'GMV, market share, TAM/SAM/SOM, public KPI, customer/SKU raw identifiers, channel leaderboard',
    can_export: 'false',
    can_display_as_fact: 'false',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    blocking_reason: BLOCKING_REASON,
  }));
}

const outputSpecs = {
  'erp_field_dictionary_readiness.csv': [
    'source_id',
    'table_name',
    'field_name',
    'business_meaning',
    'unit',
    'currency',
    'hidden_column_behavior',
    'review_status',
    'dictionary_status',
    'source_artifact',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
    'next_evidence',
  ],
  'erp_category_review_queue.csv': [
    'review_task_id',
    'category_proxy',
    'mapped_page_category',
    'sku_hash_count',
    'raw_row_count',
    'visible_proxy_units',
    'current_confidence',
    'reviewer_role',
    'priority',
    'approval_status',
    'acceptance_criteria',
    'source_ids',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_subtotal_reconciliation_queue.csv': [
    'reconciliation_id',
    'source_id',
    'affected_table',
    'issue',
    'observed_delta_units',
    'reconciliation_status',
    'likely_cause',
    'next_evidence',
    'evidence_grade',
    'privacy_level',
    'can_display_as_fact',
    'blocking_reason',
  ],
  'erp_display_approval_gate.csv': [
    'approval_gate_id',
    'table_name',
    'surface',
    'source_ids',
    'evidence_artifact_path',
    'required_reviews',
    'approval_status',
    'allowed_display',
    'forbidden_display',
    'can_export',
    'can_display_as_fact',
    'evidence_grade',
    'privacy_level',
    'blocking_reason',
  ],
};

function buildArtifacts() {
  const sourceRows = readCsvObjects(INPUTS.sourceMatrix);
  const categoryRows = readCsvObjects(INPUTS.batch2CategoryMapping);
  const batch2Manifest = JSON.parse(readFileSync(INPUTS.batch2Manifest, 'utf8'));
  const batch3Manifest = JSON.parse(readFileSync(INPUTS.batch3Manifest, 'utf8'));

  const rowsByFile = {
    'erp_field_dictionary_readiness.csv': buildFieldDictionaryRows(sourceRows),
    'erp_category_review_queue.csv': buildCategoryReviewRows(categoryRows),
    'erp_subtotal_reconciliation_queue.csv': buildSubtotalRows(sourceRows),
    'erp_display_approval_gate.csv': buildDisplayRows(batch2Manifest, batch3Manifest),
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
    generatedRule: 'Local ERP governance derivation from existing read-only artifacts only; no ERP login, provider call, production write, raw business values, or display approval.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
    evidenceGrade: EVIDENCE_GRADE,
    privacyLevel: PRIVACY_LEVEL,
    canDisplayAsFact: false,
    blockingReason: BLOCKING_REASON,
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
      displayApprovalGranted: false,
      categoryApprovalGranted: false,
      subtotalBehaviorApproved: false,
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
      fieldDictionaryRows: rowsByFile['erp_field_dictionary_readiness.csv'].length,
      categoryReviewRows: rowsByFile['erp_category_review_queue.csv'].length,
      subtotalReconciliationRows: rowsByFile['erp_subtotal_reconciliation_queue.csv'].length,
      displayApprovalRows: rowsByFile['erp_display_approval_gate.csv'].length,
      blockedRows: Object.values(rowsByFile).reduce((sum, rows) => sum + rows.length, 0),
      p0CategoryReviewRows: rowsByFile['erp_category_review_queue.csv'].filter((row) => row.priority === 'P0').length,
      unresolvedSubtotalRows: rowsByFile['erp_subtotal_reconciliation_queue.csv'].filter((row) => row.reconciliation_status !== 'needs-field-dictionary-review').length,
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
    writeFileSync(join(OUTPUT_DIR, 'batch7_erp_governance_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch7 governance artifacts ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.fieldDictionaryRows} field rows, ${manifest.summary.categoryReviewRows} category review rows, ${manifest.summary.displayApprovalRows} display gates.\n`,
  );
}

main();
