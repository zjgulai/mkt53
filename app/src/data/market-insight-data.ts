export const marketEvidenceSourceIds = ['ds-001', 'ds-002', 'ds-044', 'ds-045', 'ds-046'];
export const erpInternalTrendSourceIds = ['ds-047', 'ds-048', 'ds-049'];

export const marketSizingFunnel = [
  {
    label: '上层TAM',
    sublabel: '全球婴童用品',
    value: 375.8,
    unit: '$B',
    color: '#C25B6E',
    desc: '2026E · Grand View Research',
    opportunity: 3,
    opportunityText: '大盘稳健增长，但口径覆盖婴童用品全品类，只能作为上层市场背景，不作为吸奶器品牌份额分母。',
    focus: '婴童用品总盘',
  },
  {
    label: '品类TAM',
    sublabel: '全球吸奶器',
    value: 3.81,
    unit: '$B',
    color: '#ff9500',
    desc: '2026E · Precedence Research',
    opportunity: 4,
    opportunityText: '吸奶器品类 CAGR 8.52%，可作为品牌份额主分母；若要称为SAM，需叠加地域、渠道、SKU和合规可服务范围。',
    focus: '吸奶器主赛道',
  },
  {
    label: '细分TAM',
    sublabel: '穿戴式吸奶器',
    value: 0.233,
    unit: '$B',
    color: '#34c759',
    desc: '2026E · Fortune BI',
    opportunity: 5,
    opportunityText: '穿戴式口径 CAGR 15.08%，可作为细分市场份额分母；不是SOM，SOM需Momcozy可获份额假设。',
    focus: '穿戴式核心',
  },
];

export const marketSizeTrendData = [
  { year: '2025', upperTam: 355.9, categoryTam: 3.51, wearableTam: 0.203, type: '历史' },
  { year: '2026E', upperTam: 375.8, categoryTam: 3.81, wearableTam: 0.233, type: '预测' },
  { year: '2027E', upperTam: 399.85, categoryTam: 4.13, wearableTam: 0.268, type: '预测' },
  { year: '2028E', upperTam: 425.44, categoryTam: 4.49, wearableTam: 0.309, type: '预测' },
  { year: '2029E', upperTam: 452.67, categoryTam: 4.87, wearableTam: 0.355, type: '预测' },
  { year: '2030E', upperTam: 481.64, categoryTam: 5.28, wearableTam: 0.409, type: '预测' },
];

export const marketCagrLines = [
  { label: '上层TAM CAGR 6.4%', color: '#C25B6E' },
  { label: '品类TAM CAGR 8.52%', color: '#ff9500' },
  { label: '细分TAM CAGR 15.08%', color: '#34c759' },
];

export const marketDenominatorBoundary = [
  {
    label: '上层TAM',
    scope: '全球婴童用品总盘',
    chartKey: 'upperTam',
    denominatorUse: '只能作为母婴大盘背景，不作为吸奶器品牌份额分母。',
    sourceIds: ['ds-001'],
    canDisplayAsFact: true,
  },
  {
    label: '品类TAM',
    scope: '全球吸奶器市场',
    chartKey: 'categoryTam',
    denominatorUse: '可作为吸奶器品牌份额主分母；命名为TAM，不再写作SAM。',
    sourceIds: ['ds-044'],
    canDisplayAsFact: true,
  },
  {
    label: '细分TAM',
    scope: '全球穿戴式吸奶器市场',
    chartKey: 'wearableTam',
    denominatorUse: '可作为穿戴式细分份额分母；命名为细分TAM，不再写作SOM。',
    sourceIds: ['ds-045'],
    canDisplayAsFact: true,
  },
  {
    label: 'SAM',
    scope: '未建立',
    chartKey: 'blocked',
    denominatorUse: '需要叠加可服务地域、渠道、SKU、合规准入和履约边界；当前页面不得展示为事实。',
    sourceIds: ['ds-047', 'ds-049'],
    canDisplayAsFact: false,
  },
  {
    label: 'SOM',
    scope: '未建立',
    chartKey: 'blocked',
    denominatorUse: '需要Momcozy可获份额假设、渠道库存和目标达成模型；当前页面不得展示为事实。',
    sourceIds: ['ds-050', 'ds-051'],
    canDisplayAsFact: false,
  },
];

export const marketMonthlyTrendData = [
  { month: '2025-06', interestIndex: 88, pageviews: 3699, note: '完整月' },
  { month: '2025-07', interestIndex: 90, pageviews: 3755, note: '完整月' },
  { month: '2025-08', interestIndex: 98, pageviews: 4107, note: '完整月' },
  { month: '2025-09', interestIndex: 84, pageviews: 3502, note: '完整月' },
  { month: '2025-10', interestIndex: 87, pageviews: 3668, note: '完整月' },
  { month: '2025-11', interestIndex: 89, pageviews: 3716, note: '完整月' },
  { month: '2025-12', interestIndex: 93, pageviews: 3907, note: '完整月' },
  { month: '2026-01', interestIndex: 88, pageviews: 3676, note: '完整月' },
  { month: '2026-02', interestIndex: 78, pageviews: 3284, note: '完整月' },
  { month: '2026-03', interestIndex: 83, pageviews: 3463, note: '完整月' },
  { month: '2026-04', interestIndex: 86, pageviews: 3609, note: '完整月' },
  { month: '2026-05', interestIndex: 100, pageviews: 4194, note: '完整月峰值' },
  { month: '2026-06', interestIndex: 64, pageviews: 2672, note: '截至2026-06-24，非完整月' },
];

export const erpInternalMonthlyTrendData = [
  {
    month: '2026-01',
    ecommerce: 1281966,
    afterSales: 33,
    retailChannel: 290046,
    totalProxy: 1572045,
    pumpKeywordProxy: 304330,
    note: 'Batch19已放行 · L3内部代理 · 可见月度销量列',
  },
  {
    month: '2026-02',
    ecommerce: 1257117,
    afterSales: 13,
    retailChannel: 339042,
    totalProxy: 1596172,
    pumpKeywordProxy: 307700,
    note: 'Batch19已放行 · L3内部代理 · 可见月度销量列',
  },
  {
    month: '2026-03',
    ecommerce: 1549812,
    afterSales: 22,
    retailChannel: 308543,
    totalProxy: 1858377,
    pumpKeywordProxy: 298032,
    note: 'Batch19已放行 · L3内部代理 · 可见月度销量列',
  },
  {
    month: '2026-04',
    ecommerce: 1318738,
    afterSales: 13,
    retailChannel: 388280,
    totalProxy: 1707031,
    pumpKeywordProxy: 305078,
    note: 'Batch19已放行 · L3内部代理 · 可见月度销量列',
  },
  {
    month: '2026-05',
    ecommerce: 1495546,
    afterSales: 0,
    retailChannel: 421109,
    totalProxy: 1916655,
    pumpKeywordProxy: 321579,
    note: 'Batch19已放行 · L3内部代理 · 可见月度销量列',
  },
  {
    month: '2026-06',
    ecommerce: 1235652,
    afterSales: 0,
    retailChannel: 208828,
    totalProxy: 1444480,
    pumpKeywordProxy: 211131,
    note: 'Batch19已放行 · 截至2026-06-24 · 非完整月',
  },
];

export const erpInternalTrendNotes = [
  '来源为 ERP 电商销售统计导出、ERP 售后销量统计导出、ERP 零售与渠道 UI 分页采集；证据等级为 L3 只读/导出快照。',
  'Batch19 manual release review 已放行页面展示和 CSV 导出；当前仅限 private/internal proxy 口径。',
  '该序列是 internal count-style proxy，不是 GMV、销售额、市场份额、TAM、SAM 或 SOM。',
  '零售与渠道小计和可见月度列合计存在差异，当前月度代理只使用 2026.01-2026.06 可见销量列。',
  '吸奶器子集为已放行的产品名关键词代理；仍不得升级为外部市场销量、份额或公开分母。',
];

export const erpDerivedBatch2Artifact = {
  batchId: 'erp-derived-batch2-20260625',
  artifactDir: 'tmp/exports/erp-derived-batch2-20260625',
  manifestPath: 'tmp/exports/erp-derived-batch2-20260625/batch2_erp_derived_manifest.json',
  sourceIds: ['ds-047', 'ds-048', 'ds-049'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: true,
  blockingReason: 'approved-internal-proxy-display-export; connector-refresh-still-required',
  generatedRule: 'Local read-only derivation from existing ERP export artifacts; no provider call or production write.',
  summary: {
    skuHashRows: 1749,
    categoryMappingRows: 5,
    monthlyFactRows: 36,
    combinedCategoryMonthlyRows: 12,
    breastPumpProxySkuRows: 398,
    unmappedSkuRows: 564,
  },
  outputs: [
    'erp_product_sku_dim.csv',
    'erp_category_mapping.csv',
    'erp_sales_monthly_fact.csv',
    'erp_after_sales_monthly_fact.csv',
    'erp_retail_channel_monthly_fact.csv',
    'erp_category_monthly_proxy.csv',
  ],
};

export const erpCategoryProxySummary = [
  {
    categoryProxy: 'breast_pump_keyword_proxy',
    mappedPageCategory: '/market/mtl',
    skuHashCount: 398,
    rawRowCount: 3874,
    visibleProxyUnits: 862255,
    confidence: 'medium',
    reviewStatus: 'approved_internal_proxy',
    sourceIds: ['ds-047', 'ds-048', 'ds-049'],
    canDisplayAsFact: true,
  },
  {
    categoryProxy: 'other_or_unmapped',
    mappedPageCategory: '/market/category',
    skuHashCount: 564,
    rawRowCount: 3070,
    visibleProxyUnits: 456032,
    confidence: 'low',
    reviewStatus: 'approved_internal_proxy',
    sourceIds: ['ds-047', 'ds-048', 'ds-049'],
    canDisplayAsFact: true,
  },
  {
    categoryProxy: 'feeding_cleaning_keyword_proxy',
    mappedPageCategory: '/market/dtl',
    skuHashCount: 283,
    rawRowCount: 1884,
    visibleProxyUnits: 309596,
    confidence: 'medium',
    reviewStatus: 'approved_internal_proxy',
    sourceIds: ['ds-047', 'ds-048', 'ds-049'],
    canDisplayAsFact: true,
  },
  {
    categoryProxy: 'baby_care_keyword_proxy',
    mappedPageCategory: '/market/consumables',
    skuHashCount: 164,
    rawRowCount: 1303,
    visibleProxyUnits: 271517,
    confidence: 'medium',
    reviewStatus: 'approved_internal_proxy',
    sourceIds: ['ds-047', 'ds-048', 'ds-049'],
    canDisplayAsFact: true,
  },
  {
    categoryProxy: 'apparel_keyword_proxy',
    mappedPageCategory: '/market/category',
    skuHashCount: 340,
    rawRowCount: 723,
    visibleProxyUnits: 56448,
    confidence: 'medium',
    reviewStatus: 'approved_internal_proxy',
    sourceIds: ['ds-047', 'ds-048', 'ds-049'],
    canDisplayAsFact: true,
  },
];

export const erpBreastPumpMonthlyProxy = [
  { month: '2026-01', combinedProxyUnits: 304330, internalMixProxyPct: 19.36, sourceIds: ['ds-047', 'ds-048', 'ds-049'], canDisplayAsFact: true },
  { month: '2026-02', combinedProxyUnits: 307700, internalMixProxyPct: 19.28, sourceIds: ['ds-047', 'ds-048', 'ds-049'], canDisplayAsFact: true },
  { month: '2026-03', combinedProxyUnits: 298032, internalMixProxyPct: 16.04, sourceIds: ['ds-047', 'ds-048', 'ds-049'], canDisplayAsFact: true },
  { month: '2026-04', combinedProxyUnits: 305078, internalMixProxyPct: 17.87, sourceIds: ['ds-047', 'ds-048', 'ds-049'], canDisplayAsFact: true },
  { month: '2026-05', combinedProxyUnits: 321579, internalMixProxyPct: 16.78, sourceIds: ['ds-047', 'ds-048', 'ds-049'], canDisplayAsFact: true },
  { month: '2026-06', combinedProxyUnits: 211131, internalMixProxyPct: 14.62, sourceIds: ['ds-047', 'ds-048', 'ds-049'], canDisplayAsFact: true },
];

export const erpBatch2DisplayPolicy = [
  'ERP Batch 2 派生数据已被 Batch19 放行为 private/internal proxy，可用于页面展示和 CSV 导出；不作为公开市场事实、市场份额、TAM、SAM 或 SOM。',
  '产品维表只保留 sku_hash 和 product_name_hash；原始 SKU、产品名、客户名、运营字段不进入前端或公开构建。',
  '品类映射是已放行的关键词代理；可以展示为内部代理，不得写成经外部验证的正式品类事实。',
];

export const erpDerivedBatch3Artifact = {
  batchId: 'erp-derived-batch3-20260625',
  artifactDir: 'tmp/exports/erp-derived-batch3-20260625',
  manifestPath: 'tmp/exports/erp-derived-batch3-20260625/batch3_erp_derived_manifest.json',
  sourceIds: ['ds-035', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: true,
  blockingReason: 'approved-internal-proxy-display-export; connector-refresh-still-required',
  generatedRule: 'Local read-only derivation from existing ERP/BI artifacts; no provider call, browser login, inventory value capture, or production write.',
  summary: {
    growthSnapshotRows: 1,
    targetAttainmentRows: 1,
    channelCustomerHashRows: 813,
    destinationMonthlyRows: 300,
    inventoryReadinessRows: 10,
    topChannelCustomerVisibleProxyUnits: 398494,
  },
  outputs: [
    'erp_channel_growth_snapshot.csv',
    'erp_channel_target_attainment.csv',
    'erp_channel_customer_dim.csv',
    'erp_destination_monthly_proxy.csv',
    'erp_inventory_snapshot_readiness.csv',
  ],
};

export const erpChannelGrowthSnapshot = {
  period: '2026-ytd-readonly-observed',
  actualSalesCny: 3491457197.94,
  actualSalesUsd: 512125036.49,
  actualUnits: 10064017,
  salesGrowthPct: 51.02,
  sourceIds: ['ds-050'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: true,
  note: 'YTD browser-readonly aggregate only; no monthly/channel detail; not market share, TAM, SAM, or SOM.',
};

export const erpChannelTargetAttainment = {
  period: '2026-ytd-readonly-observed',
  salesAttainmentPct: 40.86,
  unitsAttainmentPct: 48.7,
  actualSalesCny: 3491457197.94,
  targetSalesCny: 8543976128.03,
  actualSalesUsd: 512125036.49,
  actualUnits: 10064017,
  targetUnits: 20667259,
  sourceIds: ['ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: true,
  note: 'YTD browser-readonly aggregate only; no monthly/channel detail; not TAM/SAM denominator.',
};

export const erpChannelCustomerProxySummary = {
  channelCustomerHashRows: 813,
  destinationMonthlyRows: 300,
  inventoryReadinessRows: 10,
  topChannelCustomerVisibleProxyUnits: 398494,
  sourceIds: ['ds-049', 'ds-035'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: true,
  note: 'Hashed customer, destination warehouse, operator, SKU, and aggregate proxy units are approved for internal proxy display/export; raw identifiers are not rendered in this build.',
};

export const erpInventoryReadinessSummary = [
  { fieldName: 'snapshot_date', label: '库存快照日期', status: 'blocked_missing_inventory_export', sourceIds: ['ds-035'], evidenceGrade: 'L0-unverified', canDisplayAsFact: false },
  { fieldName: 'warehouse_hash', label: '仓库 hash', status: 'blocked_missing_inventory_export', sourceIds: ['ds-035'], evidenceGrade: 'L0-unverified', canDisplayAsFact: false },
  { fieldName: 'sku_hash', label: 'SKU hash', status: 'blocked_missing_inventory_export', sourceIds: ['ds-035'], evidenceGrade: 'L0-unverified', canDisplayAsFact: false },
  { fieldName: 'on_hand_units', label: '在库库存', status: 'blocked_missing_inventory_export', sourceIds: ['ds-035'], evidenceGrade: 'L0-unverified', canDisplayAsFact: false },
  { fieldName: 'available_units', label: '可用库存', status: 'blocked_missing_inventory_export', sourceIds: ['ds-035'], evidenceGrade: 'L0-unverified', canDisplayAsFact: false },
  { fieldName: 'reserved_units', label: '预占库存', status: 'blocked_missing_inventory_export', sourceIds: ['ds-035'], evidenceGrade: 'L0-unverified', canDisplayAsFact: false },
  { fieldName: 'frozen_units', label: '冻结库存', status: 'blocked_missing_inventory_export', sourceIds: ['ds-035'], evidenceGrade: 'L0-unverified', canDisplayAsFact: false },
  { fieldName: 'in_transit_units', label: '在途库存', status: 'blocked_missing_inventory_export', sourceIds: ['ds-035'], evidenceGrade: 'L0-unverified', canDisplayAsFact: false },
  { fieldName: 'defective_units', label: '不良品库存', status: 'blocked_missing_inventory_export', sourceIds: ['ds-035'], evidenceGrade: 'L0-unverified', canDisplayAsFact: false },
  { fieldName: 'inventory_policy_version', label: '库存口径版本', status: 'blocked_missing_inventory_export', sourceIds: ['ds-035'], evidenceGrade: 'L0-unverified', canDisplayAsFact: false },
];

export const erpBatch3DisplayPolicy = [
  'ERP Batch 3 全渠道增长和目标达成已被 Batch19 放行为 private/internal proxy；不含平台、国家、渠道或月度明细，不得写成外部市场份额。',
  '渠道/客户/目的仓/运营维表只保留 hash 和聚合代理量；原始客户名、仓库名、运营人、SKU 和产品名不进入前端或公开构建。',
  '库存快照当前只有 readiness artifact，所有库存数值字段为 blocked_missing_inventory_export；供应链页不得展示库存事实。',
  'ERP 聚合只能补 Momcozy 自身 numerator 或内部执行状态，不能替代 TAM、SAM、SOM、区域份额或竞品份额分母。',
];

export const erpGovernanceBatch7Artifact = {
  batchId: 'erp-governance-batch7-20260625',
  artifactDir: 'tmp/exports/erp-governance-batch7-20260625',
  manifestPath: 'tmp/exports/erp-governance-batch7-20260625/batch7_erp_governance_manifest.json',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'authorized-field-dictionary-category-review-and-display-approval-required',
  generatedRule: 'Local ERP governance derivation from existing read-only artifacts only; no ERP login, provider call, production write, raw business values, or display approval.',
  summary: {
    fieldDictionaryRows: 61,
    categoryReviewRows: 5,
    subtotalReconciliationRows: 4,
    displayApprovalRows: 9,
    blockedRows: 79,
    p0CategoryReviewRows: 3,
    unresolvedSubtotalRows: 2,
  },
  outputs: [
    'erp_field_dictionary_readiness.csv',
    'erp_category_review_queue.csv',
    'erp_subtotal_reconciliation_queue.csv',
    'erp_display_approval_gate.csv',
  ],
};

export const erpFieldDictionaryCoverageSummary = [
  { sourceId: 'ds-047', tableName: 'erp_sales_monthly_summary', fieldRows: 15, status: 'blocked_missing_authorized_field_dictionary', blocker: '需确认销量样式字段单位、币种/金额缺省、时间窗和展示范围。' },
  { sourceId: 'ds-048', tableName: 'erp_after_sales_monthly_summary', fieldRows: 15, status: 'blocked_missing_authorized_field_dictionary', blocker: '需确认售后销量口径、售后率分母和是否可与销售统计组合。' },
  { sourceId: 'ds-049', tableName: 'erp_retail_channel_sales_statistics', fieldRows: 12, status: 'blocked_hidden_columns_or_week_boundary', blocker: '小计与可见月度列合计存在差异，需解释周边界或隐藏列。' },
  { sourceId: 'ds-050', tableName: 'erp_channel_growth_snapshot', fieldRows: 7, status: 'blocked_missing_monthly_channel_export', blocker: '只有YTD只读聚合，缺月度/渠道拆分导出和字段字典。' },
  { sourceId: 'ds-051', tableName: 'erp_channel_target_attainment', fieldRows: 12, status: 'blocked_missing_monthly_target_export', blocker: '只有YTD只读聚合，缺目标/实际月度拆分和展示审批。' },
];

export const erpCategoryReviewQueueSummary = [
  { categoryProxy: 'breast_pump_keyword_proxy', mappedPageCategory: '/market/mtl', priority: 'P0', approvalStatus: 'not_approved', acceptance: '抽样SKU hash复核 + 吸奶器词典批准 + 展示范围批准' },
  { categoryProxy: 'other_or_unmapped', mappedPageCategory: '/market/category', priority: 'P0', approvalStatus: 'not_approved', acceptance: '未映射SKU处理规则 + 归类责任人批准' },
  { categoryProxy: 'feeding_cleaning_keyword_proxy', mappedPageCategory: '/market/dtl', priority: 'P0', approvalStatus: 'not_approved', acceptance: '哺乳/清洁词典和类目边界复核' },
  { categoryProxy: 'baby_care_keyword_proxy', mappedPageCategory: '/market/consumables', priority: 'P1', approvalStatus: 'not_approved', acceptance: '婴儿护理词典和样本SKU复核' },
  { categoryProxy: 'apparel_keyword_proxy', mappedPageCategory: '/market/category', priority: 'P1', approvalStatus: 'not_approved', acceptance: '服饰类是否纳入当前工作台范围的品类决策' },
];

export const erpSubtotalReconciliationSummary = [
  { sourceId: 'ds-047', affectedTable: 'erp_sales_monthly_fact', deltaUnits: 0, status: 'needs-field-dictionary-review' },
  { sourceId: 'ds-048', affectedTable: 'erp_after_sales_monthly_fact', deltaUnits: 0, status: 'needs-field-dictionary-review' },
  { sourceId: 'ds-049', affectedTable: 'erp_retail_channel_monthly_fact', deltaUnits: 32489, status: 'blocked_hidden_columns_or_week_boundary' },
  { sourceId: 'ds-049', affectedTable: 'erp_category_mapping', deltaUnits: 8416, status: 'blocked_hidden_columns_or_week_boundary' },
];

export const erpBatch7DisplayPolicy = [
  'Batch 7 只把字段名、单位候选、小计差异、品类复核和展示审批拆成治理队列；不包含原始SKU、产品名、客户名、运营人、仓库名或任何新业务值。',
  'Batch7本身不批准展示；当前放行来自后续真实owner记录、Batch9 validator和Batch19 manual release review。',
  '页面允许展示已放行的 internal proxy；仍不得展示 GMV、公开市场份额、TAM/SAM/SOM、客户/渠道排行或外部事实。',
];

export const erpOwnerApprovalBatch8Artifact = {
  batchId: 'erp-owner-approval-batch8-20260625',
  artifactDir: 'tmp/exports/erp-owner-approval-batch8-20260625',
  manifestPath: 'tmp/exports/erp-owner-approval-batch8-20260625/batch8_erp_owner_approval_manifest.json',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'missing-authorized-owner-approval-records',
  generatedRule: 'Local owner-approval packet derivation from Batch7 governance artifacts only; no ERP login, provider call, production write, raw business values, or approval promotion.',
  upstreamBatchId: 'erp-governance-batch7-20260625',
  summary: {
    fieldOwnerPackets: 5,
    categoryOwnerPackets: 5,
    subtotalOwnerPackets: 4,
    displayApprovalTemplates: 9,
    approvalBacklogRows: 23,
    priorityApprovalRows: 9,
    approvalRecordsApplied: 0,
    readyToDisplayRows: 0,
    remainingBlockedRows: 23,
  },
  outputs: [
    'erp_field_owner_approval_packet.csv',
    'erp_category_owner_approval_packet.csv',
    'erp_subtotal_owner_explanation_packet.csv',
    'erp_display_approval_record_template.csv',
    'erp_owner_approval_backlog.csv',
  ],
};

export const erpOwnerApprovalLaneSummary = [
  {
    lane: 'field_dictionary_owner_approval',
    packet: 'erp_field_owner_approval_packet.csv',
    rows: 5,
    ownerRole: 'sales/after-sales operations owner + ERP data owner',
    currentStatus: 'pending_owner_record',
    requiredEvidence: '字段含义、单位、币种、隐藏列/小计行为和展示范围的可审计审批记录',
  },
  {
    lane: 'category_owner_approval',
    packet: 'erp_category_owner_approval_packet.csv',
    rows: 5,
    ownerRole: 'category owner + ERP data owner + data governance',
    currentStatus: 'pending_owner_record',
    requiredEvidence: '品类 taxonomy rule、抽样 SKU hash 复核、未映射处理规则和展示范围审批',
  },
  {
    lane: 'subtotal_behavior_owner_approval',
    packet: 'erp_subtotal_owner_explanation_packet.csv',
    rows: 4,
    ownerRole: 'ERP data owner + data governance',
    currentStatus: 'pending_owner_record',
    requiredEvidence: '官方小计公式、隐藏列行为、周边界/时间窗解释和代理值使用范围审批',
  },
  {
    lane: 'display_approval_record',
    packet: 'erp_display_approval_record_template.csv',
    rows: 9,
    ownerRole: 'business data owner + privacy reviewer + data governance',
    currentStatus: 'missing_owner_record',
    requiredEvidence: '表到页面/CSV导出范围的审批记录，包含审批人、日期、记录URI、allowed/forbidden display',
  },
];

export const erpBatch8ApprovalPolicy = [
  'Batch 8 只生成 owner approval packets、display approval record template 和 approval backlog；真实审批记录由后续Batch12/11/9链路接收和校验。',
  'Batch8本身不升级事实展示；当前展示/导出放行来自Batch19 manual release review。',
  '即使Batch19已放行internal proxy，页面仍不得导出客户/渠道排行、GMV、公开份额或 TAM/SAM/SOM。',
];

export const erpOwnerApprovalIntakeBatch9Artifact = {
  batchId: 'erp-owner-approval-intake-batch9-20260626',
  artifactDir: 'tmp/exports/erp-owner-approval-intake-batch9-20260626',
  manifestPath: 'tmp/exports/erp-owner-approval-intake-batch9-20260626/batch9_erp_owner_approval_intake_manifest.json',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'manual-release-review-required-before-batch19',
  generatedRule: 'Local owner-approval intake validation from Batch8 backlog only; no ERP login, provider call, production write, approval fabrication, or automatic promotion.',
  upstreamBatchId: 'erp-owner-approval-batch8-20260625',
  approvalRecordsInputRows: 23,
  summary: {
    intakeContractRows: 4,
    approvalBacklogRows: 23,
    validationRows: 23,
    passedValidationRows: 23,
    blockedValidationRows: 0,
    releaseGateRows: 9,
    readyReleaseGateRows: 9,
    promotionCandidateRows: 9,
    readyToDisplayRows: 0,
    readyToExportRows: 0,
    validationPassed: false,
  },
  outputs: [
    'erp_owner_approval_intake_contract.csv',
    'erp_owner_approval_validation_result.csv',
    'erp_owner_approval_release_gate.csv',
    'erp_owner_approval_promotion_manifest.csv',
  ],
};

export const erpOwnerApprovalIntakeValidationSummary = [
  {
    artifact: 'erp_owner_approval_intake_contract.csv',
    rows: 4,
    status: 'contract-defined',
    meaning: '定义四类审批lane的必填字段、decision vocab、promotion rule和fail-closed规则。',
  },
  {
    artifact: 'erp_owner_approval_validation_result.csv',
    rows: 23,
    status: 'passed_owner_record_validation',
    meaning: 'Batch8 backlog逐项校验；23条真实owner记录已通过schema和decision校验。',
  },
  {
    artifact: 'erp_owner_approval_release_gate.csv',
    rows: 9,
    status: 'ready_for_manual_release_review',
    meaning: '9个受控表/页面release gate已满足owner记录校验；仍需Batch19人工release review。',
  },
  {
    artifact: 'erp_owner_approval_promotion_manifest.csv',
    rows: 9,
    status: 'promotion_candidates_ready',
    meaning: '9张ERP内部代理表进入人工release review候选；Batch9本身仍不自动放行展示。',
  },
];

export const erpBatch9IntakePolicy = [
  'Batch 9 是审批记录 intake validator，不产生或伪造审批；当前23条真实owner记录已通过校验。',
  'Batch9只把9张ERP内部代理表送入manual release review候选；展示/导出放行由Batch19记录承担。',
  '当前 approvalRecordsInputRows=23、readyReleaseGateRows=9、promotionCandidateRows=9；Batch9自身仍保持readyToDisplayRows=0、readyToExportRows=0。',
];

export const erpOwnerApprovalTemplateBatch10Artifact = {
  batchId: 'erp-owner-approval-record-template-batch10-20260626',
  artifactDir: 'tmp/exports/erp-owner-approval-record-template-batch10-20260626',
  manifestPath: 'tmp/exports/erp-owner-approval-record-template-batch10-20260626/batch10_erp_owner_approval_record_template_manifest.json',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'owner-approval-records-not-submitted',
  generatedRule: 'Local owner-approval record template from Batch8 backlog and Batch9 contract only; no approval fabrication, ERP login, provider call, production write, or automatic promotion.',
  upstreamBatchIds: ['erp-owner-approval-batch8-20260625', 'erp-owner-approval-intake-batch9-20260626'],
  submittedOwnerRecords: 0,
  summary: {
    ownerPacketIndexRows: 4,
    approvalRecordTemplateRows: 23,
    requiredEvidenceRows: 23,
    submissionReadinessRows: 9,
    prefilledApprovalItemIds: 23,
    blankDecisionRows: 23,
    submittedOwnerRecords: 0,
    readyToValidateRows: 0,
    readyToDisplayRows: 0,
    readyToExportRows: 0,
    validationPassed: false,
  },
  outputs: [
    'erp_owner_approval_owner_packet_index.csv',
    'erp_owner_approval_record_input_template.csv',
    'erp_owner_approval_required_evidence_matrix.csv',
    'erp_owner_approval_submission_readiness.csv',
  ],
};

export const erpOwnerApprovalTemplateBatch10Summary = [
  {
    artifact: 'erp_owner_approval_owner_packet_index.csv',
    rows: 4,
    status: 'fillable-packet-index',
    meaning: '按四类审批lane汇总owner角色、待填packet、backlog数量和Batch9必填字段。',
  },
  {
    artifact: 'erp_owner_approval_record_input_template.csv',
    rows: 23,
    status: 'awaiting-owner-input',
    meaning: '预填Batch8 approval_item_id；审批结论、审批人hash、日期和证据URI全部留空，等待真实owner填写。',
  },
  {
    artifact: 'erp_owner_approval_required_evidence_matrix.csv',
    rows: 23,
    status: 'required-evidence-mapped',
    meaning: '逐项列出 required evidence、acceptance criteria、URI scheme 和 forbidden raw values。',
  },
  {
    artifact: 'erp_owner_approval_submission_readiness.csv',
    rows: 9,
    status: 'release-gate-still-blocked',
    meaning: '按受控表/页面列出需要的owner records；当前 submittedOwnerRecords=0。',
  },
];

export const erpBatch10TemplatePolicy = [
  'Batch 10 只把 Batch8 backlog 和 Batch9 contract 转成 owner 可填写模板；它不是审批结果，也不应用任何记录。',
  '模板默认 blankDecisionRows=23、submittedOwnerRecords=0、readyToValidateRows=0；真实记录回填后仍需通过 Batch9 validator。',
  'Batch10 继续禁止 raw SKU、产品名、客户、运营、仓库、GMV、市场份额和 TAM/SAM/SOM 进入页面或CSV事实导出。',
];

export const erpOwnerApprovalPreflightBatch11Artifact = {
  batchId: 'erp-owner-approval-preflight-batch11-20260626',
  artifactDir: 'tmp/exports/erp-owner-approval-preflight-batch11-20260626',
  manifestPath: 'tmp/exports/erp-owner-approval-preflight-batch11-20260626/batch11_erp_owner_approval_preflight_manifest.json',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'manual-release-review-required-before-batch19',
  generatedRule: 'Local owner-approval preflight and forbidden-value scan before Batch9 validation; no approval fabrication, ERP login, provider call, production write, or automatic promotion.',
  upstreamBatchId: 'erp-owner-approval-record-template-batch10-20260626',
  summary: {
    preflightRulebookRows: 6,
    approvalRecordRows: 23,
    preflightRows: 23,
    readyForBatch9Rows: 23,
    blockedPreflightRows: 0,
    forbiddenScanRows: 23,
    forbiddenHitRows: 0,
    releasePreflightRows: 9,
    batch9HandoffRows: 1,
    readyToDisplayRows: 0,
    readyToExportRows: 0,
    validationPassed: false,
  },
  outputs: [
    'erp_owner_approval_preflight_rulebook.csv',
    'erp_owner_approval_preflight_result.csv',
    'erp_owner_approval_forbidden_value_scan.csv',
    'erp_owner_approval_batch9_handoff_queue.csv',
    'erp_owner_approval_release_preflight_summary.csv',
  ],
};

export const erpOwnerApprovalPreflightBatch11Summary = [
  {
    artifact: 'erp_owner_approval_preflight_rulebook.csv',
    rows: 6,
    status: 'preflight-rules-defined',
    meaning: '定义decision vocab、审批人hash、审批URI、forbidden display确认、raw value扫描和Batch9 handoff规则。',
  },
  {
    artifact: 'erp_owner_approval_preflight_result.csv',
    rows: 23,
    status: 'ready_for_batch9',
    meaning: '真实owner记录预检通过，23行均可进入Batch9 validator。',
  },
  {
    artifact: 'erp_owner_approval_forbidden_value_scan.csv',
    rows: 23,
    status: 'passed_no_forbidden_patterns',
    meaning: '当前模板未发现禁用raw SKU、产品、客户、运营、仓库或凭据模式；真实回填后需重扫。',
  },
  {
    artifact: 'erp_owner_approval_batch9_handoff_queue.csv',
    rows: 1,
    status: 'handoff-ready',
    meaning: '真实owner记录文件已形成Batch9 handoff队列。',
  },
  {
    artifact: 'erp_owner_approval_release_preflight_summary.csv',
    rows: 9,
    status: 'release-gates-preflight-ready',
    meaning: '9个release gate的owner记录预检通过；仍需Batch9和Batch19。',
  },
];

export const erpBatch11PreflightPolicy = [
  'Batch 11 是提交前预检和脱敏扫描层，只判断owner记录是否可交给Batch9 validator；它不应用审批。',
  '当前 readyForBatch9Rows=23、blockedPreflightRows=0、batch9HandoffRows=1；页面和CSV放行仍由Batch19承担。',
  'Batch11通过只代表真实owner records可进入Batch9 validator；不能单独升级为展示或导出依据。',
];

export const erpOwnerSubmissionIntakeBatch12Artifact = {
  batchId: 'erp-owner-submission-intake-batch12-20260626',
  artifactDir: 'tmp/exports/erp-owner-submission-intake-batch12-20260626',
  manifestPath: 'tmp/exports/erp-owner-submission-intake-batch12-20260626/batch12_erp_owner_submission_intake_manifest.json',
  submissionDir: 'tmp/inputs/erp-owner-approval-submissions-batch12',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'manual-release-review-required-before-batch19',
  generatedRule: 'Local owner submission directory intake audit before Batch11 preflight; no approval fabrication, ERP login, provider call, production write, or automatic promotion.',
  upstreamBatchIds: ['erp-owner-approval-record-template-batch10-20260626', 'erp-owner-approval-preflight-batch11-20260626'],
  summary: {
    inventoryRows: 1,
    submissionCsvFiles: 1,
    expectedApprovalRecords: 23,
    submittedApprovalRecords: 23,
    schemaAuditRows: 23,
    schemaReadyRows: 23,
    redactionAuditRows: 23,
    forbiddenHitRows: 0,
    batch11QueueRows: 1,
    releaseReadinessRows: 9,
    readyToDisplayRows: 0,
    readyToExportRows: 0,
    validationPassed: false,
  },
  outputs: [
    'erp_owner_submission_intake_inventory.csv',
    'erp_owner_submission_schema_audit.csv',
    'erp_owner_submission_redaction_audit.csv',
    'erp_owner_submission_batch11_queue.csv',
    'erp_owner_submission_release_readiness.csv',
  ],
};

export const erpOwnerSubmissionIntakeBatch12Summary = [
  {
    artifact: 'erp_owner_submission_intake_inventory.csv',
    rows: 1,
    status: 'owner-submission-csv-found',
    meaning: '真实owner CSV已进入Batch12 input目录并被登记。',
  },
  {
    artifact: 'erp_owner_submission_schema_audit.csv',
    rows: 23,
    status: 'schema-ready',
    meaning: '23条approval_item_id均完成真实提交和schema校验。',
  },
  {
    artifact: 'erp_owner_submission_redaction_audit.csv',
    rows: 23,
    status: 'passed-no-forbidden-hit',
    meaning: '真实CSV完成禁用值扫描，forbiddenHitRows=0；页面不回显raw审批明细。',
  },
  {
    artifact: 'erp_owner_submission_batch11_queue.csv',
    rows: 1,
    status: 'batch11-queue-ready',
    meaning: '完整且扫描通过的owner CSV已进入Batch11预检队列。',
  },
  {
    artifact: 'erp_owner_submission_release_readiness.csv',
    rows: 9,
    status: 'release-gates-submission-ready',
    meaning: '9个release gate的owner提交均已ready；仍需Batch11/9/19分层放行。',
  },
];

export const erpBatch12SubmissionPolicy = [
  'Batch 12 只盘点owner提交目录、校验CSV schema并做禁用值扫描；它不应用审批、不生成审批。',
  '当前submissionCsvFiles=1、schemaReadyRows=23、batch11QueueRows=1；它只证明owner提交可进入Batch11。',
  '展示和CSV导出必须继续经过Batch11、Batch9和Batch19，不由Batch12单独放行。',
];

export const erpOwnerSubmissionPackBatch13Artifact = {
  batchId: 'erp-owner-submission-pack-batch13-20260626',
  artifactDir: 'tmp/exports/erp-owner-submission-pack-batch13-20260626',
  manifestPath: 'tmp/exports/erp-owner-submission-pack-batch13-20260626/batch13_erp_owner_submission_pack_manifest.json',
  templateDir: 'tmp/exports/erp-owner-submission-pack-batch13-20260626/owner-submission-templates',
  targetSubmissionDir: 'tmp/inputs/erp-owner-approval-submissions-batch12',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'owner-submission-pack-is-template-only',
  upstreamBatchIds: ['erp-owner-approval-record-template-batch10-20260626', 'erp-owner-submission-intake-batch12-20260626'],
  summary: {
    packetIndexRows: 5,
    templateManifestRows: 5,
    templateFiles: 5,
    combinedTemplateRows: 23,
    laneTemplateRows: 23,
    checklistRows: 23,
    releasePacketRows: 9,
    handoffGuideRows: 5,
    readyForBatch12Rows: 0,
    submittedApprovalRecords: 0,
    readyToDisplayRows: 0,
    readyToExportRows: 0,
    validationPassed: false,
  },
  outputs: [
    'erp_owner_submission_packet_index.csv',
    'erp_owner_submission_template_manifest.csv',
    'erp_owner_submission_field_completion_checklist.csv',
    'erp_owner_submission_release_packet_matrix.csv',
    'erp_owner_submission_handoff_guide.csv',
  ],
};

export const erpOwnerSubmissionPackBatch13Summary = [
  {
    artifact: 'erp_owner_submission_packet_index.csv',
    rows: 5,
    status: 'template-packets-generated',
    meaning: '已生成一个combined模板和四个lane模板索引；模板位于导出目录，不进入真实提交目录。',
  },
  {
    artifact: 'erp_owner_submission_template_manifest.csv',
    rows: 5,
    status: 'blank-templates-generated',
    meaning: '记录每个模板的row count、editable fields和hash；仅用于owner填写前分发。',
  },
  {
    artifact: 'erp_owner_submission_field_completion_checklist.csv',
    rows: 23,
    status: 'owner-fields-awaiting-input',
    meaning: '逐项列出23条approval_item_id需要owner补齐的字段和证据URI口径。',
  },
  {
    artifact: 'erp_owner_submission_release_packet_matrix.csv',
    rows: 9,
    status: 'release-gates-still-blocked',
    meaning: '按release gate映射模板和Batch12命令；当前没有任何记录可直接进入Batch12。',
  },
  {
    artifact: 'erp_owner_submission_handoff_guide.csv',
    rows: 5,
    status: 'handoff-guide-ready',
    meaning: '定义分发模板、owner填写、提交Batch12、预检Batch11和校验Batch9的顺序。',
  },
];

export const erpBatch13SubmissionPackPolicy = [
  'Batch 13 只生成owner submission templates、checklist和handoff guide；模板保存在导出目录，不写入Batch12真实提交目录。',
  '当前readyForBatch12Rows=0、submittedApprovalRecords=0、approvalRecordsApplied=0；没有审批被应用或伪造。',
  '真实owner CSV必须先放入Batch12 input目录，再依次通过Batch12、Batch11、Batch9和manual release review。',
];

export const erpOwnerSubmissionDropboxBatch14Artifact = {
  batchId: 'erp-owner-submission-dropbox-watchlist-batch14-20260627',
  artifactDir: 'tmp/exports/erp-owner-submission-dropbox-watchlist-batch14-20260627',
  manifestPath: 'tmp/exports/erp-owner-submission-dropbox-watchlist-batch14-20260627/batch14_erp_owner_submission_dropbox_watchlist_manifest.json',
  targetSubmissionDir: 'tmp/inputs/erp-owner-approval-submissions-batch12',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'owner-submission-csv-not-present',
  upstreamBatchIds: ['erp-owner-submission-pack-batch13-20260626', 'erp-owner-submission-intake-batch12-20260626'],
  summary: {
    dropboxStatusRows: 1,
    ownerActionRows: 23,
    templateDistributionRows: 5,
    releaseWatchlistRows: 9,
    commandRunbookRows: 5,
    batch13TemplateFiles: 5,
    batch13ChecklistRows: 23,
    batch13HandoffRows: 5,
    submissionCsvFiles: 0,
    submittedApprovalRecords: 0,
    readyForBatch12Rows: 0,
    batch11QueueRows: 0,
    readyToDisplayRows: 0,
    readyToExportRows: 0,
    validationPassed: false,
  },
  outputs: [
    'erp_owner_submission_dropbox_status.csv',
    'erp_owner_submission_owner_action_queue.csv',
    'erp_owner_submission_template_distribution.csv',
    'erp_owner_submission_release_watchlist.csv',
    'erp_owner_submission_command_runbook.csv',
  ],
};

export const erpOwnerSubmissionDropboxBatch14Summary = [
  {
    artifact: 'erp_owner_submission_dropbox_status.csv',
    rows: 1,
    status: 'blocked_no_owner_submission_csv',
    meaning: '只读检查Batch12 input目录；当前没有真实owner CSV，也没有创建input目录。',
  },
  {
    artifact: 'erp_owner_submission_owner_action_queue.csv',
    rows: 23,
    status: 'awaiting_real_owner_record',
    meaning: '把23条approval_item_id映射到对应模板、owner role、必填字段和Batch12后续命令。',
  },
  {
    artifact: 'erp_owner_submission_template_distribution.csv',
    rows: 5,
    status: 'ready_to_distribute_template_only',
    meaning: '列出combined和四个lane模板的hash、行数和分发动作；不代表审批通过。',
  },
  {
    artifact: 'erp_owner_submission_release_watchlist.csv',
    rows: 9,
    status: 'blocked_no_owner_submission_csv',
    meaning: '按release gate持续跟踪owner CSV、Batch12 readiness和Batch11 queue状态。',
  },
  {
    artifact: 'erp_owner_submission_command_runbook.csv',
    rows: 5,
    status: 'blocked_until_owner_csv_exists',
    meaning: '定义Batch14检查、owner提交、Batch12、Batch11、Batch9的顺序和前置条件。',
  },
];

export const erpBatch14DropboxWatchlistPolicy = [
  'Batch 14 是owner submission dropbox/watchlist，只读监控真实CSV是否到达；它不创建Batch12 input目录。',
  '当前submissionCsvFiles=0、readyForBatch12Rows=0、batch11QueueRows=0；ERP事实仍不能展示或导出。',
  '真实CSV到达后仍要重新运行Batch12 intake，再进入Batch11 preflight、Batch9 validator和manual release review。',
];

export const erpOwnerSubmissionAcceptanceBatch15Artifact = {
  batchId: 'erp-owner-submission-acceptance-gate-batch15-20260627',
  artifactDir: 'tmp/exports/erp-owner-submission-acceptance-gate-batch15-20260627',
  manifestPath: 'tmp/exports/erp-owner-submission-acceptance-gate-batch15-20260627/batch15_erp_owner_submission_acceptance_gate_manifest.json',
  targetSubmissionDir: 'tmp/inputs/erp-owner-approval-submissions-batch12',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'owner-submission-acceptance-gate-awaits-real-csv',
  upstreamBatchIds: ['erp-owner-submission-dropbox-watchlist-batch14-20260627', 'erp-owner-submission-pack-batch13-20260626'],
  summary: {
    acceptanceRulebookRows: 6,
    acceptanceResultRows: 23,
    evidenceUriContractRows: 4,
    releaseAcceptanceRows: 9,
    escalationRows: 23,
    ownerActionRows: 23,
    submissionCsvFiles: 0,
    submittedApprovalRecords: 0,
    acceptedOwnerRecords: 0,
    readyForBatch12Rows: 0,
    batch11QueueRows: 0,
    readyToDisplayRows: 0,
    readyToExportRows: 0,
    validationPassed: false,
  },
  outputs: [
    'erp_owner_submission_acceptance_rulebook.csv',
    'erp_owner_submission_acceptance_result.csv',
    'erp_owner_submission_evidence_uri_contract.csv',
    'erp_owner_submission_release_acceptance_matrix.csv',
    'erp_owner_submission_escalation_queue.csv',
  ],
};

export const erpOwnerSubmissionAcceptanceBatch15Summary = [
  {
    artifact: 'erp_owner_submission_acceptance_rulebook.csv',
    rows: 6,
    status: 'acceptance-rules-defined',
    meaning: '定义CSV到达、23条approval item覆盖、必填字段、URI scheme、禁用值和manual release review规则。',
  },
  {
    artifact: 'erp_owner_submission_acceptance_result.csv',
    rows: 23,
    status: 'blocked_awaiting_real_owner_csv',
    meaning: '逐项标记23条approval item仍缺真实owner CSV和审批字段，不能进入Batch12。',
  },
  {
    artifact: 'erp_owner_submission_evidence_uri_contract.csv',
    rows: 4,
    status: 'template_contract_ready_owner_csv_pending',
    meaning: '按四个approval lane汇总允许的证据URI、必填字段和禁用值策略。',
  },
  {
    artifact: 'erp_owner_submission_release_acceptance_matrix.csv',
    rows: 9,
    status: 'blocked_awaiting_real_owner_csv',
    meaning: '按release gate记录accepted owner records；当前全部为0。',
  },
  {
    artifact: 'erp_owner_submission_escalation_queue.csv',
    rows: 23,
    status: 'owner_input_required',
    meaning: '将未提交的approval item形成owner输入升级队列；仍不代表审批完成。',
  },
];

export const erpBatch15AcceptanceGatePolicy = [
  'Batch 15 是owner submission acceptance gate，只定义真实CSV到达后的验收规则和逐项缺口；它不应用审批。',
  '当前acceptedOwnerRecords=0、submissionCsvFiles=0、readyForBatch12Rows=0；ERP事实仍不能展示或导出。',
  '真实CSV到达后必须重新跑Batch14、Batch12、Batch11、Batch9，并补manual release review，才能考虑展示或导出升级。',
];

export const erpOwnerSubmissionSyntheticBatch16Artifact = {
  batchId: 'erp-owner-submission-synthetic-fixture-batch16-20260627',
  artifactDir: 'tmp/exports/erp-owner-submission-synthetic-fixture-batch16-20260627',
  manifestPath: 'tmp/exports/erp-owner-submission-synthetic-fixture-batch16-20260627/batch16_erp_owner_submission_synthetic_fixture_manifest.json',
  syntheticInputDir: 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic',
  syntheticRecordFile: 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic/synthetic_owner_approval_records_batch16.csv',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L2-fixture-or-dry-run',
  privacyLevel: 'synthetic/internal',
  canDisplayAsFact: false,
  blockingReason: 'synthetic-fixture-not-owner-approval',
  upstreamBatchIds: ['erp-owner-approval-record-template-batch10-20260626', 'erp-owner-submission-acceptance-gate-batch15-20260627'],
  summary: {
    syntheticRecordRows: 23,
    fixtureCsvFiles: 1,
    fixtureIndexRows: 1,
    recordFillAuditRows: 23,
    gatePlanRows: 4,
    batch12SchemaReadyRows: 23,
    batch12QueueRows: 1,
    batch11ReadyRows: 23,
    batch11HandoffRows: 1,
    batch9PassedValidationRows: 23,
    batch9ReadyReleaseGateRows: 9,
    promotionCandidateRows: 0,
    realApprovalRecordsApplied: 0,
    readyToDisplayRows: 0,
    readyToExportRows: 0,
    validationPassed: false,
  },
  outputs: [
    'synthetic_owner_approval_records_batch16.csv',
    'erp_owner_submission_synthetic_fixture_index.csv',
    'erp_owner_submission_synthetic_record_fill_audit.csv',
    'erp_owner_submission_synthetic_gate_plan.csv',
  ],
};

export const erpOwnerSubmissionSyntheticBatch16Summary = [
  {
    artifact: 'synthetic_owner_approval_records_batch16.csv',
    rows: 23,
    status: 'synthetic_fixture_ready_for_dry_run',
    meaning: '虚拟填充23条owner approval records，只用于Batch12/11/9流程演练。',
  },
  {
    artifact: 'erp_owner_submission_synthetic_record_fill_audit.csv',
    rows: 23,
    status: 'all_rows_synthetic',
    meaning: '确认每条记录使用hash approver、file-hash URI、false展示/导出决策和synthetic标记。',
  },
  {
    artifact: 'erp_owner_submission_synthetic_gate_plan.csv',
    rows: 4,
    status: 'dry_run_only',
    meaning: '记录Batch12、Batch11、Batch9和manual release review的synthetic演练顺序。',
  },
  {
    artifact: 'latest local dry-run',
    rows: 23,
    status: 'syntax_pass_no_promotion',
    meaning: 'Batch12/11/9语法链路可跑通；promotion=0，readyToDisplayRows=0，readyToExportRows=0。',
  },
];

export const erpBatch16SyntheticFixturePolicy = [
  'Batch 16 是synthetic owner submission fixture，只能作为L2 fixture演练，不能替代真实owner approval。',
  '虚拟CSV写入Batch12 synthetic专用目录，不写真实Batch12 input目录；所有记录can_display_as_fact=false。',
  '即使Batch12/Batch11/Batch9 dry-run通过，仍不能展示或导出；真实owner CSV和manual release review仍是硬门禁。',
];

export const erpOwnerSubmissionSyntheticPipelineBatch17Artifact = {
  batchId: 'erp-owner-submission-synthetic-pipeline-batch17-20260627',
  artifactDir: 'tmp/exports/erp-owner-submission-synthetic-pipeline-batch17-20260627',
  manifestPath: 'tmp/exports/erp-owner-submission-synthetic-pipeline-batch17-20260627/batch17_erp_owner_submission_synthetic_pipeline_manifest.json',
  syntheticInputDir: 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic',
  syntheticRecordFile: 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic/synthetic_owner_approval_records_batch16.csv',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L2-fixture-or-dry-run',
  privacyLevel: 'synthetic/internal',
  canDisplayAsFact: false,
  blockingReason: 'synthetic-fixture-not-owner-approval',
  upstreamBatchIds: [
    'erp-owner-submission-synthetic-fixture-batch16-20260627',
    'erp-owner-submission-intake-batch12-20260626',
    'erp-owner-approval-preflight-batch11-20260626',
    'erp-owner-approval-intake-batch9-20260626',
  ],
  summary: {
    syntheticRecordRows: 23,
    pipelineStageRows: 5,
    releaseGateRows: 9,
    boundaryAuditRows: 4,
    batch12SchemaReadyRows: 23,
    batch12QueueRows: 1,
    batch11ReadyRows: 23,
    batch11HandoffRows: 1,
    batch9PassedValidationRows: 23,
    batch9ReadyReleaseGateRows: 9,
    promotionCandidateRows: 0,
    readyToDisplayRows: 0,
    readyToExportRows: 0,
    validationPassed: false,
  },
  outputs: [
    'erp_owner_submission_synthetic_pipeline_run_matrix.csv',
    'erp_owner_submission_synthetic_release_gate_matrix.csv',
    'erp_owner_submission_synthetic_boundary_audit.csv',
  ],
};

export const erpOwnerSubmissionSyntheticPipelineBatch17Summary = [
  {
    artifact: 'erp_owner_submission_synthetic_pipeline_run_matrix.csv',
    rows: 5,
    status: 'fixture_pipeline_rehearsed',
    meaning: '串联synthetic fixture、Batch12 intake、Batch11 preflight、Batch9 validator和manual release review五步。',
  },
  {
    artifact: 'erp_owner_submission_synthetic_release_gate_matrix.csv',
    rows: 9,
    status: 'manual_review_blocked',
    meaning: '9个release gate在语法层面可进入人工复核，但仍因synthetic owner records不能展示或导出。',
  },
  {
    artifact: 'erp_owner_submission_synthetic_boundary_audit.csv',
    rows: 4,
    status: 'evidence_downgrade_checked',
    meaning: '检查Batch12/11/9均为L2 fixture、fixtureMode=true、display/export/promotion均为0。',
  },
];

export const erpBatch17SyntheticPipelinePolicy = [
  'Batch 17 是synthetic pipeline rehearsal，只证明Batch12/11/9脚本能在fixture模式下贯通。',
  'Batch17会强制子批次输出L2-fixture-or-dry-run；不能把ready rows写成真实审批、真实份额或真实导出依据。',
  '下一步必须用真实owner CSV和manual release review替换synthetic记录，才能讨论页面事实或CSV导出升级。',
];

export const erpOwnerSubmissionRealOwnerChecklistBatch18Artifact = {
  batchId: 'erp-owner-submission-real-owner-checklist-batch18-20260627',
  artifactDir: 'tmp/exports/erp-owner-submission-real-owner-checklist-batch18-20260627',
  manifestPath: 'tmp/exports/erp-owner-submission-real-owner-checklist-batch18-20260627/batch18_erp_owner_submission_real_owner_checklist_manifest.json',
  targetSubmissionDir: 'tmp/inputs/erp-owner-approval-submissions-batch12',
  syntheticReferenceDir: 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L2-fixture-or-dry-run',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'real-owner-submission-required',
  upstreamBatchIds: [
    'erp-owner-approval-record-template-batch10-20260626',
    'erp-owner-submission-acceptance-gate-batch15-20260627',
    'erp-owner-submission-synthetic-pipeline-batch17-20260627',
  ],
  summary: {
    fieldChecklistRows: 23,
    releaseGateChecklistRows: 9,
    swapRunbookRows: 7,
    boundaryAuditRows: 6,
    requiredApprovalLanes: 4,
    requiredSourceIds: 5,
    uriContractRows: 4,
    syntheticPipelineRows: 5,
    realOwnerRecordsAccepted: 0,
    readyToRunBatch12Rows: 0,
    readyToRunBatch11Rows: 0,
    readyToRunBatch9Rows: 0,
    readyToDisplayRows: 0,
    readyToExportRows: 0,
    validationPassed: false,
  },
  outputs: [
    'erp_owner_real_submission_field_checklist.csv',
    'erp_owner_real_submission_release_gate_checklist.csv',
    'erp_owner_real_submission_swap_runbook.csv',
    'erp_owner_real_submission_boundary_audit.csv',
  ],
};

export const erpOwnerSubmissionRealOwnerChecklistBatch18Summary = [
  {
    artifact: 'erp_owner_real_submission_field_checklist.csv',
    rows: 23,
    status: 'owner_fields_ready_for_real_fill',
    meaning: '逐项列出23条approval item的必填字段、证据URI scheme、禁用原始值和下一步Batch12命令。',
  },
  {
    artifact: 'erp_owner_real_submission_release_gate_checklist.csv',
    rows: 9,
    status: 'release_gates_wait_real_owner_csv',
    meaning: '把9个release gate映射到真实owner CSV、Batch12/11/9命令和display/export阻断状态。',
  },
  {
    artifact: 'erp_owner_real_submission_swap_runbook.csv',
    rows: 7,
    status: 'swap_runbook_ready',
    meaning: '定义从真实owner CSV放入Batch12目录到manual release review的七步执行顺序。',
  },
  {
    artifact: 'erp_owner_real_submission_boundary_audit.csv',
    rows: 6,
    status: 'promotion_blocked_until_real_owner_records',
    meaning: '确认Batch18仍不生成真实审批、不写真实Batch12 input、不开放展示或导出。',
  },
];

export const erpBatch18RealOwnerChecklistPolicy = [
  'Batch 18 是真实owner CSV到达前的回填核验包；它不创建真实审批记录，也不写入真实Batch12 input目录。',
  'Batch18只把Batch10模板、Batch15验收规则和Batch17演练结果转成owner回填清单与runbook。',
  '真实CSV到达后仍需按Batch14、Batch12、Batch11、Batch9、manual release review顺序重新跑，不能跳过人工复核。',
];

export const erpManualReleaseReviewBatch19Artifact = {
  batchId: 'erp-manual-release-review-batch19-20260627',
  artifactDir: 'tmp/exports/erp-manual-release-review-batch19-20260627',
  manifestPath: 'tmp/exports/erp-manual-release-review-batch19-20260627/batch19_erp_manual_release_review_manifest.json',
  reviewRecordPath: 'tmp/inputs/erp-manual-release-review-submissions-batch19/manual_release_review_chat_approval_20260627.json',
  ownerRecordsPath: 'tmp/inputs/erp-owner-approval-submissions-batch12/market_trend_monthly_owner_chat_approval_20260627.csv',
  sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L3-production-read-only',
  privacyLevel: 'private/internal',
  canDisplayAsFact: true,
  canExport: true,
  blockingReason: 'local-site-data-swap-in-progress; production-deploy-not-run',
  generatedAt: '2026-06-27T15:48:50.968Z',
  generatedRule: 'Manual release review intake for Batch9 ERP promotion candidates; local artifact only, no ERP login, provider call, production write, deployment, or automatic app data swap.',
  upstreamBatchId: 'erp-owner-approval-intake-batch9-20260626',
  summary: {
    releaseGateRows: 9,
    promotionCandidateRows: 9,
    ownerRecordRows: 23,
    displayOwnerRows: 9,
    releaseReviewRecordRows: 1,
    releaseReviewDecisionRows: 9,
    approvedForDisplayRows: 9,
    approvedForExportRows: 9,
    readyForImplementationRows: 9,
    swapQueueRows: 9,
    boundaryAuditRows: 9,
    blockedBoundaryRows: 0,
    forbiddenHitRows: 0,
    siteDataSwapApplied: false,
    productionWrites: false,
    deployment: false,
    validationPassed: true,
  },
  outputs: [
    'erp_manual_release_review_record.csv',
    'erp_manual_release_review_decision_matrix.csv',
    'erp_manual_release_review_swap_queue.csv',
    'erp_manual_release_review_boundary_audit.csv',
  ],
};

export const erpManualReleaseReviewBatch19Summary = [
  {
    artifact: 'erp_manual_release_review_record.csv',
    rows: 1,
    status: 'manual-release-review-logged',
    meaning: '记录reviewer、日期、scope、can_export=true、can_display_as_fact=true；deployment/provider/production write均未授权。',
  },
  {
    artifact: 'erp_manual_release_review_decision_matrix.csv',
    rows: 9,
    status: 'approved-ready-for-site-data-swap',
    meaning: 'market_trend_monthly、3张月度ERP事实表、品类/SKU维表和3张渠道快照均可作为内部代理展示/导出。',
  },
  {
    artifact: 'erp_manual_release_review_swap_queue.csv',
    rows: 9,
    status: 'swap-queue-ready',
    meaning: '逐表列出surface、source_ids、证据路径和本地app数据替换动作。',
  },
  {
    artifact: 'erp_manual_release_review_boundary_audit.csv',
    rows: 9,
    status: 'boundaries-passed',
    meaning: '确认没有provider call、production write、deployment、raw审批值回显或禁用值命中。',
  },
];

export const erpBatch19ManualReleasePolicy = [
  'Batch19已放行9张ERP内部代理表进入本地页面展示和CSV导出；口径为private/internal proxy。',
  '该放行不等于公开市场份额、GMV、销售额、TAM、SAM、SOM、竞品份额或区域排名。',
  '本次只做本地site data swap和验证；生产部署、连接器刷新和生产写入仍需单独授权。',
];

export const erpBatch19ApprovedTables = [
  'market_trend_monthly',
  'erp_sales_monthly_fact',
  'erp_after_sales_monthly_fact',
  'erp_retail_channel_monthly_fact',
  'erp_category_mapping',
  'erp_product_sku_dim',
  'erp_channel_growth_snapshot',
  'erp_channel_target_attainment',
  'erp_channel_customer_dim',
];

export const marketRegionalShareData = [
  {
    region: '北美',
    share: 45.05,
    revenue: '$0.96B',
    color: '#5856d6',
    status: '公开报告已复核',
    key: 'Fortune BI 2025；Grand View Research 口径交叉检查为 53.61%',
  },
  {
    region: '非北美合计',
    share: 54.95,
    revenue: '$1.18B',
    color: '#C25B6E',
    status: '派生值',
    key: '由 Fortune BI 全球盘扣除北美；欧洲/亚太/拉美/MEA 需完整报告或授权数据拆分。',
  },
];

export const marketTopStats = [
  { label: '全球吸奶器市场', value: '$3.81B', change: '2026E · CAGR 8.52%', up: true, icon: 'DollarSign', color: '#C25B6E' },
  { label: '北美公开份额', value: '45.05%', change: 'Fortune BI 2025', up: true, icon: 'Globe', color: '#5856d6' },
  { label: '穿戴式吸奶器', value: '$233M', change: '2026E · CAGR 15.08%', up: true, icon: 'Package', color: '#ff9500' },
  { label: '公开月度峰值', value: '100', change: 'Wikimedia 2026-05', up: true, icon: 'TrendingUp', color: '#34c759' },
];

export const marketQuickInsights = [
  { label: '全球吸奶器市场', value: '$3.81B', change: '+8.52% CAGR', trend: 'up', meaning: 'Precedence Research 2026E · 品类TAM口径' },
  { label: '北美市场份额', value: '45.05%', change: '2025年', trend: 'up', meaning: 'Fortune BI 2025 · 最大公开区域市场' },
  { label: '穿戴式市场', value: '$233M', change: '+15.08% CAGR', trend: 'up', meaning: 'Fortune BI 2026E · 细分TAM口径' },
  { label: '公开月度趋势', value: '100', change: '2026-05峰值', trend: 'up', meaning: 'Wikimedia Pageviews · 非GMV/销量代理指标' },
];

export const brandShareAccessItems = [
  { label: 'Amazon Brand Analytics', status: '待授权', note: '可支撑 Amazon 渠道品牌份额和搜索词趋势，但不能直接外推全渠道。' },
  { label: '零售面板/NPD/IRI', status: '待采购或接入', note: '可用于线下和全渠道品牌份额交叉验证。' },
  { label: '内部 CRM/ERP', status: 'Batch19内部代理已放行', note: 'ERP月度、品类和渠道代理可用于内部页面与CSV；不能写成行业份额或公开市场分母。' },
];
