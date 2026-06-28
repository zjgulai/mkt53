#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const EXPORT_WINDOW = '2026-01-01_2026-06-24';
const OUTPUT_DIR_NAME = 'erp-derived-batch2-20260625';
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'authorized-field-dictionary-and-display-approval-required';
const HASH_NAMESPACE = 'mkt53-erp-batch2-v1:';

const INPUTS = {
  salesMonthly: join(repoRoot, 'tmp/exports', `erp_sales_monthly_summary_${EXPORT_WINDOW}.csv`),
  afterSalesMonthly: join(repoRoot, 'tmp/exports', `erp_after_sales_monthly_summary_${EXPORT_WINDOW}.csv`),
  retailMonthly: join(repoRoot, 'tmp/exports', `erp_retail_channel_monthly_summary_${EXPORT_WINDOW}.csv`),
  retailRaw: join(repoRoot, 'tmp/exports', `erp_retail_channel_sales_statistics_${EXPORT_WINDOW}.csv`),
};

const MONTH_COLUMNS = ['2026.01销量', '2026.02销量', '2026.03销量', '2026.04销量', '2026.05销量', '2026.06销量'];

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
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function readCsvObjects(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing ERP export input: ${filePath}`);
  }

  const rows = parseCsv(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  const headers = rows[0] ?? [];

  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])),
  );
}

function numberValue(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvEscape(value) {
  const normalized = String(value ?? '');
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function toCsv(rows, headers) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function hashValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }
  return createHash('sha256').update(`${HASH_NAMESPACE}${raw}`).digest('hex');
}

function fileHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function normalizeMonthlySegment(segment) {
  const normalized = String(segment ?? '').trim();
  if (normalized.includes('breast_pump_keyword_proxy')) {
    return 'breast_pump_keyword_proxy';
  }
  if (normalized.includes('all_')) {
    return 'all_products';
  }
  return normalized || 'unknown';
}

function mappedPageCategory(categoryProxy) {
  if (categoryProxy === 'breast_pump_keyword_proxy') {
    return '/market/mtl';
  }
  if (categoryProxy === 'feeding_cleaning_keyword_proxy') {
    return '/market/dtl';
  }
  if (categoryProxy === 'baby_care_keyword_proxy') {
    return '/market/consumables';
  }
  return '/market/category';
}

function classifyCategoryProxy(searchText) {
  const text = String(searchText ?? '').toLowerCase();
  if (/(吸奶器|breast\s*pump|pump|m5|m6|m9|s9|s12|法兰|鸭嘴阀|奶碗)/i.test(text)) {
    return 'breast_pump_keyword_proxy';
  }
  if (/(奶瓶|喂养|哺乳|暖奶|消毒|清洗|feeding|bottle|steril|warmer|wash)/i.test(text)) {
    return 'feeding_cleaning_keyword_proxy';
  }
  if (/(纸尿裤|湿巾|护理|婴儿|baby\s*care|wipe|diaper)/i.test(text)) {
    return 'baby_care_keyword_proxy';
  }
  if (/(内衣|bra|孕妇|承托|maternity|apparel)/i.test(text)) {
    return 'apparel_keyword_proxy';
  }
  return 'other_or_unmapped';
}

function monthlyFactRows(rows, factTable, sourceId, sourceArtifact) {
  return rows.map((row) => ({
    month: row.month,
    fact_table: factTable,
    category_proxy: normalizeMonthlySegment(row.segment),
    proxy_units: numberValue(row.erp_sales_stat_sum),
    index_peak_100: numberValue(row.index_peak_100_in_export_window),
    mom_pct: row.mom_pct ?? '',
    matched_data_rows: numberValue(row.matched_data_rows),
    source_id: sourceId,
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
    source_artifact: sourceArtifact,
    note: 'Internal ERP monthly proxy only; not GMV, market share, TAM, SAM, or SOM.',
  }));
}

function buildSkuDimension(retailRows) {
  const skuMap = new Map();

  for (const row of retailRows) {
    const skuHash = hashValue(row['产品SKU']);
    const productNameHash = hashValue(row['产品名称']);
    if (!skuHash && !productNameHash) {
      continue;
    }

    const key = skuHash || productNameHash;
    const categoryProxy = classifyCategoryProxy(`${row['产品SKU']} ${row['产品名称']}`);
    const monthlyUnits = MONTH_COLUMNS.reduce((sum, column) => sum + numberValue(row[column]), 0);
    const existing = skuMap.get(key) ?? {
      sku_hash: skuHash,
      product_name_hash: productNameHash,
      category_proxy: categoryProxy,
      mapped_page_category: mappedPageCategory(categoryProxy),
      source_id: 'ds-049',
      source_system: 'ERP retail channel visible export',
      raw_row_count: 0,
      total_visible_proxy_units: 0,
      has_customer_field: row['客户名称'] ? 'true' : 'false',
      has_operator_field: row['运营'] ? 'true' : 'false',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
      review_status: 'needs-review',
    };

    existing.raw_row_count += 1;
    existing.total_visible_proxy_units += monthlyUnits;
    skuMap.set(key, existing);
  }

  return [...skuMap.values()].sort((a, b) => b.total_visible_proxy_units - a.total_visible_proxy_units);
}

function buildCategoryMapping(skuRows) {
  const categoryMap = new Map();
  const ruleByCategory = {
    breast_pump_keyword_proxy: 'product_name_or_sku_contains_breast_pump_related_terms',
    feeding_cleaning_keyword_proxy: 'product_name_or_sku_contains_feeding_cleaning_related_terms',
    baby_care_keyword_proxy: 'product_name_or_sku_contains_baby_care_related_terms',
    apparel_keyword_proxy: 'product_name_or_sku_contains_apparel_related_terms',
    other_or_unmapped: 'no_keyword_rule_matched',
  };

  for (const row of skuRows) {
    const existing = categoryMap.get(row.category_proxy) ?? {
      category_proxy: row.category_proxy,
      source_keyword_rule: ruleByCategory[row.category_proxy] ?? 'manual-review-required',
      mapped_page_category: mappedPageCategory(row.category_proxy),
      sku_hash_count: 0,
      raw_row_count: 0,
      visible_proxy_units: 0,
      confidence: row.category_proxy === 'other_or_unmapped' ? 'low' : 'medium',
      review_status: 'needs-review',
      source_ids: 'ds-047;ds-048;ds-049',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
    };

    existing.sku_hash_count += 1;
    existing.raw_row_count += numberValue(row.raw_row_count);
    existing.visible_proxy_units += numberValue(row.total_visible_proxy_units);
    categoryMap.set(row.category_proxy, existing);
  }

  return [...categoryMap.values()].sort((a, b) => b.visible_proxy_units - a.visible_proxy_units);
}

function buildCombinedMonthlyProxy(factRows) {
  const monthlyMap = new Map();

  for (const row of factRows) {
    const key = `${row.month}:${row.category_proxy}`;
    const existing = monthlyMap.get(key) ?? {
      month: row.month,
      category_proxy: row.category_proxy,
      sales_proxy_units: 0,
      after_sales_proxy_units: 0,
      retail_channel_proxy_units: 0,
      combined_proxy_units: 0,
      internal_mix_proxy_pct: '',
      source_ids: 'ds-047;ds-048;ds-049',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
      note: 'Internal category mix proxy; not external market share.',
    };

    if (row.fact_table === 'erp_sales_monthly_fact') {
      existing.sales_proxy_units += numberValue(row.proxy_units);
    } else if (row.fact_table === 'erp_after_sales_monthly_fact') {
      existing.after_sales_proxy_units += numberValue(row.proxy_units);
    } else if (row.fact_table === 'erp_retail_channel_monthly_fact') {
      existing.retail_channel_proxy_units += numberValue(row.proxy_units);
    }
    existing.combined_proxy_units += numberValue(row.proxy_units);
    monthlyMap.set(key, existing);
  }

  const rows = [...monthlyMap.values()].sort((a, b) => `${a.month}:${a.category_proxy}`.localeCompare(`${b.month}:${b.category_proxy}`));
  const allByMonth = new Map(rows.filter((row) => row.category_proxy === 'all_products').map((row) => [row.month, row.combined_proxy_units]));

  return rows.map((row) => {
    if (row.category_proxy === 'all_products') {
      return { ...row, internal_mix_proxy_pct: '100.00' };
    }
    const monthTotal = allByMonth.get(row.month) ?? 0;
    const pct = monthTotal > 0 ? (row.combined_proxy_units / monthTotal) * 100 : 0;
    return { ...row, internal_mix_proxy_pct: pct.toFixed(2) };
  });
}

function buildArtifacts() {
  const salesMonthlyRows = readCsvObjects(INPUTS.salesMonthly);
  const afterSalesMonthlyRows = readCsvObjects(INPUTS.afterSalesMonthly);
  const retailMonthlyRows = readCsvObjects(INPUTS.retailMonthly);
  const retailRawRows = readCsvObjects(INPUTS.retailRaw);

  const salesFactRows = monthlyFactRows(
    salesMonthlyRows,
    'erp_sales_monthly_fact',
    'ds-047',
    `tmp/exports/${basename(INPUTS.salesMonthly)}`,
  );
  const afterSalesFactRows = monthlyFactRows(
    afterSalesMonthlyRows,
    'erp_after_sales_monthly_fact',
    'ds-048',
    `tmp/exports/${basename(INPUTS.afterSalesMonthly)}`,
  );
  const retailFactRows = monthlyFactRows(
    retailMonthlyRows,
    'erp_retail_channel_monthly_fact',
    'ds-049',
    `tmp/exports/${basename(INPUTS.retailMonthly)}`,
  );
  const skuRows = buildSkuDimension(retailRawRows);
  const categoryRows = buildCategoryMapping(skuRows);
  const combinedRows = buildCombinedMonthlyProxy([...salesFactRows, ...afterSalesFactRows, ...retailFactRows]);

  const files = {
    'erp_sales_monthly_fact.csv': {
      rows: salesFactRows,
      headers: [
        'month',
        'fact_table',
        'category_proxy',
        'proxy_units',
        'index_peak_100',
        'mom_pct',
        'matched_data_rows',
        'source_id',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
        'source_artifact',
        'note',
      ],
    },
    'erp_after_sales_monthly_fact.csv': {
      rows: afterSalesFactRows,
      headers: [
        'month',
        'fact_table',
        'category_proxy',
        'proxy_units',
        'index_peak_100',
        'mom_pct',
        'matched_data_rows',
        'source_id',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
        'source_artifact',
        'note',
      ],
    },
    'erp_retail_channel_monthly_fact.csv': {
      rows: retailFactRows,
      headers: [
        'month',
        'fact_table',
        'category_proxy',
        'proxy_units',
        'index_peak_100',
        'mom_pct',
        'matched_data_rows',
        'source_id',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
        'source_artifact',
        'note',
      ],
    },
    'erp_product_sku_dim.csv': {
      rows: skuRows,
      headers: [
        'sku_hash',
        'product_name_hash',
        'category_proxy',
        'mapped_page_category',
        'source_id',
        'source_system',
        'raw_row_count',
        'total_visible_proxy_units',
        'has_customer_field',
        'has_operator_field',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
        'review_status',
      ],
    },
    'erp_category_mapping.csv': {
      rows: categoryRows,
      headers: [
        'category_proxy',
        'source_keyword_rule',
        'mapped_page_category',
        'sku_hash_count',
        'raw_row_count',
        'visible_proxy_units',
        'confidence',
        'review_status',
        'source_ids',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
      ],
    },
    'erp_category_monthly_proxy.csv': {
      rows: combinedRows,
      headers: [
        'month',
        'category_proxy',
        'sales_proxy_units',
        'after_sales_proxy_units',
        'retail_channel_proxy_units',
        'combined_proxy_units',
        'internal_mix_proxy_pct',
        'source_ids',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
        'note',
      ],
    },
  };

  const materialized = Object.fromEntries(
    Object.entries(files).map(([fileName, file]) => {
      const csv = toCsv(file.rows, file.headers);
      return [
        fileName,
        {
          path: `tmp/exports/${OUTPUT_DIR_NAME}/${fileName}`,
          rowCount: file.rows.length,
          headers: file.headers,
          sha256: fileHash(csv),
          csv,
        },
      ];
    }),
  );

  const manifest = {
    batchId: OUTPUT_DIR_NAME,
    generatedAt: new Date().toISOString(),
    generatedRule: 'Local read-only derivation from existing ERP export artifacts; no browser login, provider call, production write, or raw business field publication.',
    sourceIds: ['ds-047', 'ds-048', 'ds-049'],
    sourceArtifacts: Object.fromEntries(
      Object.entries(INPUTS).map(([key, value]) => [key, `tmp/exports/${basename(value)}`]),
    ),
    evidenceGrade: EVIDENCE_GRADE,
    privacyLevel: PRIVACY_LEVEL,
    canDisplayAsFact: false,
    blockingReason: BLOCKING_REASON,
    boundaries: {
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      rawSkuIncluded: false,
      rawProductNameIncluded: false,
      rawCustomerIncluded: false,
      rawOperatorIncluded: false,
      pseudonymizedNotAnonymized: true,
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
      salesMonthlyFactRows: salesFactRows.length,
      afterSalesMonthlyFactRows: afterSalesFactRows.length,
      retailMonthlyFactRows: retailFactRows.length,
      skuHashRows: skuRows.length,
      categoryMappingRows: categoryRows.length,
      combinedCategoryMonthlyRows: combinedRows.length,
      breastPumpProxySkuRows: skuRows.filter((row) => row.category_proxy === 'breast_pump_keyword_proxy').length,
      unmappedSkuRows: skuRows.filter((row) => row.category_proxy === 'other_or_unmapped').length,
    },
  };

  return { files: materialized, manifest };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { files, manifest } = buildArtifacts();

  if (!args.noWrite) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    for (const [fileName, file] of Object.entries(files)) {
      writeFileSync(join(OUTPUT_DIR, fileName), file.csv, 'utf8');
    }
    writeFileSync(join(OUTPUT_DIR, 'batch2_erp_derived_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch2 derived artifacts ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.skuHashRows} SKU hashes, ${manifest.summary.categoryMappingRows} category mappings, ${manifest.summary.combinedCategoryMonthlyRows} monthly proxy rows.\n`,
  );
}

main();
