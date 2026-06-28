#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');
const EXPORT_WINDOW = '2026-01-01_2026-06-24';
const OUTPUT_DIR_NAME = 'erp-derived-batch3-20260625';
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L3-production-read-only';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'authorized-field-dictionary-and-display-approval-required';
const HASH_NAMESPACE = 'mkt53-erp-batch3-v1:';

const INPUTS = {
  sourceMatrix: join(repoRoot, 'tmp/audits/erp-readonly-source-check-20260624/erp_source_matrix.csv'),
  retailRaw: join(repoRoot, 'tmp/exports', `erp_retail_channel_sales_statistics_${EXPORT_WINDOW}.csv`),
  batch2Manifest: join(repoRoot, 'tmp/exports/erp-derived-batch2-20260625/batch2_erp_derived_manifest.json'),
};

const MONTH_COLUMNS = ['2026.01销量', '2026.02销量', '2026.03销量', '2026.04销量', '2026.05销量', '2026.06销量'];
const MONTH_BY_COLUMN = {
  '2026.01销量': '2026-01',
  '2026.02销量': '2026-02',
  '2026.03销量': '2026-03',
  '2026.04销量': '2026-04',
  '2026.05销量': '2026-05',
  '2026.06销量': '2026-06',
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
  if (!existsSync(filePath)) throw new Error(`Missing ERP Batch3 input: ${filePath}`);
  const rows = parseCsv(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  const headers = rows[0] ?? [];
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

function numberValue(value) {
  const parsed = Number(String(value ?? '').replace(/[,%￥$]/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvEscape(value) {
  const normalized = String(value ?? '');
  if (/[",\n\r]/.test(normalized)) return `"${normalized.replace(/"/g, '""')}"`;
  return normalized;
}

function toCsv(rows, headers) {
  return `${[headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n')}\n`;
}

function hashValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return createHash('sha256').update(`${HASH_NAMESPACE}${raw}`).digest('hex');
}

function fileHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function findSourceRow(rows, sourceIdCandidate) {
  const row = rows.find((item) => item.source_id_candidate === sourceIdCandidate);
  if (!row) throw new Error(`Missing source matrix row: ${sourceIdCandidate}`);
  return row;
}

function extractAggregateNumber(text, label) {
  const normalized = String(text ?? '');
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = normalized.match(new RegExp(`${escapedLabel}[^=]*=\\s*([\\d,.]+%?)`));
  return match ? numberValue(match[1]) : 0;
}

function classifyCategoryProxy(searchText) {
  const text = String(searchText ?? '').toLowerCase();
  if (/(吸奶器|breast\s*pump|pump|m5|m6|m9|s9|s12|法兰|鸭嘴阀|奶碗)/i.test(text)) return 'breast_pump_keyword_proxy';
  if (/(奶瓶|喂养|哺乳|暖奶|消毒|清洗|feeding|bottle|steril|warmer|wash)/i.test(text)) return 'feeding_cleaning_keyword_proxy';
  if (/(纸尿裤|湿巾|护理|婴儿|baby\s*care|wipe|diaper)/i.test(text)) return 'baby_care_keyword_proxy';
  if (/(内衣|bra|孕妇|承托|maternity|apparel)/i.test(text)) return 'apparel_keyword_proxy';
  return 'other_or_unmapped';
}

function buildGrowthRow(sourceRows) {
  const source = findSourceRow(sourceRows, 'ds-erp-all-channel-growth');
  return {
    period: '2026-ytd-readonly-observed',
    snapshot_type: 'all_channel_growth_snapshot',
    actual_sales_cny: extractAggregateNumber(source.observed_aggregate, '年-实际销售额（￥）'),
    sales_growth_pct: extractAggregateNumber(source.observed_aggregate, '销售增长率-年'),
    actual_sales_usd: extractAggregateNumber(source.observed_aggregate, '年-实际销售额（$）'),
    actual_units: extractAggregateNumber(source.observed_aggregate, '年-实际销量'),
    observed_fields: source.observed_fields,
    source_id: 'ds-050',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
    source_artifact: 'tmp/audits/erp-readonly-source-check-20260624/erp_source_matrix.csv',
    note: 'YTD browser-readonly aggregate only; no monthly/channel detail; not market share, TAM, SAM, or SOM.',
  };
}

function buildTargetRow(sourceRows) {
  const source = findSourceRow(sourceRows, 'ds-erp-all-channel-target');
  return {
    period: '2026-ytd-readonly-observed',
    snapshot_type: 'all_channel_target_attainment',
    sales_attainment_pct: extractAggregateNumber(source.observed_aggregate, '年-销售达成（￥）'),
    units_attainment_pct: extractAggregateNumber(source.observed_aggregate, '年-销量达成'),
    actual_sales_cny: extractAggregateNumber(source.observed_aggregate, '年-实际销售额（￥）'),
    target_sales_cny: extractAggregateNumber(source.observed_aggregate, '年-目标销售额（￥）'),
    actual_sales_usd: extractAggregateNumber(source.observed_aggregate, '年-实际销售额（$）'),
    actual_units: extractAggregateNumber(source.observed_aggregate, '年-实际销量'),
    target_units: extractAggregateNumber(source.observed_aggregate, '年-目标销量'),
    observed_fields: source.observed_fields,
    source_id: 'ds-051',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
    source_artifact: 'tmp/audits/erp-readonly-source-check-20260624/erp_source_matrix.csv',
    note: 'YTD browser-readonly aggregate only; no monthly/channel detail; not TAM/SAM denominator.',
  };
}

function buildChannelCustomerRows(retailRows) {
  const groupMap = new Map();
  const skuSets = new Map();

  for (const row of retailRows) {
    const customerHash = hashValue(row['客户名称']);
    const destinationHash = hashValue(row['目的仓']);
    const operatorHash = hashValue(row['运营']);
    const key = `${customerHash}:${destinationHash}:${operatorHash}`;
    const skuHash = hashValue(row['产品SKU']);
    const categoryProxy = classifyCategoryProxy(`${row['产品SKU']} ${row['产品名称']}`);
    const visibleProxyUnits = MONTH_COLUMNS.reduce((sum, column) => sum + numberValue(row[column]), 0);
    const existing = groupMap.get(key) ?? {
      channel_customer_hash: customerHash,
      destination_warehouse_hash: destinationHash,
      operator_hash: operatorHash,
      raw_row_count: 0,
      sku_hash_count: 0,
      visible_proxy_units: 0,
      category_proxy_top: categoryProxy,
      source_id: 'ds-049',
      evidence_grade: EVIDENCE_GRADE,
      privacy_level: PRIVACY_LEVEL,
      can_display_as_fact: 'false',
      blocking_reason: BLOCKING_REASON,
      review_status: 'needs-review',
    };

    existing.raw_row_count += 1;
    existing.visible_proxy_units += visibleProxyUnits;
    skuSets.set(key, skuSets.get(key) ?? new Set());
    skuSets.get(key).add(skuHash);
    groupMap.set(key, existing);
  }

  return [...groupMap.entries()]
    .map(([key, row]) => ({ ...row, sku_hash_count: skuSets.get(key)?.size ?? 0 }))
    .sort((a, b) => b.visible_proxy_units - a.visible_proxy_units);
}

function buildDestinationMonthlyRows(retailRows) {
  const groupMap = new Map();

  for (const row of retailRows) {
    const destinationHash = hashValue(row['目的仓']);
    const customerHash = hashValue(row['客户名称']);
    for (const column of MONTH_COLUMNS) {
      const month = MONTH_BY_COLUMN[column];
      const key = `${destinationHash}:${month}`;
      const existing = groupMap.get(key) ?? {
        destination_warehouse_hash: destinationHash,
        month,
        visible_proxy_units: 0,
        raw_row_count: 0,
        customer_hash_count: 0,
        source_id: 'ds-049',
        evidence_grade: EVIDENCE_GRADE,
        privacy_level: PRIVACY_LEVEL,
        can_display_as_fact: 'false',
        blocking_reason: BLOCKING_REASON,
        note: 'Destination warehouse hash monthly proxy; not country share or retail market size.',
        customerHashes: new Set(),
      };
      existing.visible_proxy_units += numberValue(row[column]);
      existing.raw_row_count += 1;
      if (customerHash) existing.customerHashes.add(customerHash);
      groupMap.set(key, existing);
    }
  }

  return [...groupMap.values()]
    .map((row) => ({
      destination_warehouse_hash: row.destination_warehouse_hash,
      month: row.month,
      visible_proxy_units: row.visible_proxy_units,
      raw_row_count: row.raw_row_count,
      customer_hash_count: row.customerHashes.size,
      source_id: row.source_id,
      evidence_grade: row.evidence_grade,
      privacy_level: row.privacy_level,
      can_display_as_fact: row.can_display_as_fact,
      blocking_reason: row.blocking_reason,
      note: row.note,
    }))
    .sort((a, b) => `${a.destination_warehouse_hash}:${a.month}`.localeCompare(`${b.destination_warehouse_hash}:${b.month}`));
}

function buildInventoryReadinessRows() {
  const fields = [
    ['snapshot_date', '快照日期', 'required'],
    ['warehouse_hash', '仓库hash', 'required'],
    ['sku_hash', 'SKU hash', 'required'],
    ['on_hand_units', '在库库存', 'required'],
    ['available_units', '可用库存', 'required'],
    ['reserved_units', '预占库存', 'optional'],
    ['frozen_units', '冻结库存', 'optional'],
    ['in_transit_units', '在途库存', 'optional'],
    ['defective_units', '不良品库存', 'optional'],
    ['inventory_policy_version', '库存口径版本', 'required'],
  ];

  return fields.map(([field_name, business_meaning, requirement]) => ({
    target_table: 'erp_inventory_snapshot',
    field_name,
    business_meaning,
    requirement,
    readiness_status: 'blocked_missing_inventory_export',
    source_id: 'ds-035',
    evidence_grade: 'L0-unverified',
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: 'inventory-export-or-authorized-wms-snapshot-required',
    next_evidence: 'Authorized WMS/ERP inventory export with field dictionary, hash, row count, and review owner.',
  }));
}

function buildArtifacts() {
  const sourceRows = readCsvObjects(INPUTS.sourceMatrix);
  const retailRows = readCsvObjects(INPUTS.retailRaw);
  const growthRows = [buildGrowthRow(sourceRows)];
  const targetRows = [buildTargetRow(sourceRows)];
  const channelCustomerRows = buildChannelCustomerRows(retailRows);
  const destinationRows = buildDestinationMonthlyRows(retailRows);
  const inventoryRows = buildInventoryReadinessRows();

  const files = {
    'erp_channel_growth_snapshot.csv': {
      rows: growthRows,
      headers: [
        'period',
        'snapshot_type',
        'actual_sales_cny',
        'sales_growth_pct',
        'actual_sales_usd',
        'actual_units',
        'observed_fields',
        'source_id',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
        'source_artifact',
        'note',
      ],
    },
    'erp_channel_target_attainment.csv': {
      rows: targetRows,
      headers: [
        'period',
        'snapshot_type',
        'sales_attainment_pct',
        'units_attainment_pct',
        'actual_sales_cny',
        'target_sales_cny',
        'actual_sales_usd',
        'actual_units',
        'target_units',
        'observed_fields',
        'source_id',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
        'source_artifact',
        'note',
      ],
    },
    'erp_channel_customer_dim.csv': {
      rows: channelCustomerRows,
      headers: [
        'channel_customer_hash',
        'destination_warehouse_hash',
        'operator_hash',
        'raw_row_count',
        'sku_hash_count',
        'visible_proxy_units',
        'category_proxy_top',
        'source_id',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
        'review_status',
      ],
    },
    'erp_destination_monthly_proxy.csv': {
      rows: destinationRows,
      headers: [
        'destination_warehouse_hash',
        'month',
        'visible_proxy_units',
        'raw_row_count',
        'customer_hash_count',
        'source_id',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
        'note',
      ],
    },
    'erp_inventory_snapshot_readiness.csv': {
      rows: inventoryRows,
      headers: [
        'target_table',
        'field_name',
        'business_meaning',
        'requirement',
        'readiness_status',
        'source_id',
        'evidence_grade',
        'privacy_level',
        'can_display_as_fact',
        'blocking_reason',
        'next_evidence',
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
    generatedRule: 'Local read-only derivation from existing ERP/FineBI evidence and retail-channel export; no browser login, provider call, production write, or raw business identifier publication.',
    sourceIds: ['ds-035', 'ds-049', 'ds-050', 'ds-051'],
    sourceArtifacts: {
      sourceMatrix: `tmp/audits/erp-readonly-source-check-20260624/${basename(INPUTS.sourceMatrix)}`,
      retailRaw: `tmp/exports/${basename(INPUTS.retailRaw)}`,
      batch2Manifest: `tmp/exports/erp-derived-batch2-20260625/${basename(INPUTS.batch2Manifest)}`,
    },
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
      rawWarehouseIncluded: false,
      rawOperatorIncluded: false,
      inventoryValuesIncluded: false,
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
      growthSnapshotRows: growthRows.length,
      targetAttainmentRows: targetRows.length,
      channelCustomerHashRows: channelCustomerRows.length,
      destinationMonthlyRows: destinationRows.length,
      inventoryReadinessRows: inventoryRows.length,
      topChannelCustomerVisibleProxyUnits: channelCustomerRows[0]?.visible_proxy_units ?? 0,
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
    writeFileSync(join(OUTPUT_DIR, 'batch3_erp_derived_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ERP Batch3 derived artifacts ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.channelCustomerHashRows} channel/customer hashes, ${manifest.summary.destinationMonthlyRows} destination monthly proxy rows, ${manifest.summary.inventoryReadinessRows} inventory readiness rows.\n`,
  );
}

main();
