import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Table, ChevronRight, ChevronDown, BarChart3, Target, Users, Shield, Eye, Sparkles, Link2, AlertCircle, CheckCircle, Info, ShieldCheck, Download, Lock, Globe, HardDrive, Search, Layers, RefreshCw, FileText, BookOpen } from 'lucide-react';
import OperationsManual from '@/components/OperationsManual';
import { exportToCsv } from '@/utils/csvExport';

// ═══════════════════════════════════════════════════════════════════
// 数据管理页面 — Momcozy市场洞察工作台全站数据资产目录
// 原则：MECE（Mutually Exclusive, Collectively Exhaustive）
// 六大模块 · 全站数据表 · 完整字段说明 · 数据血缘关系
// ═══════════════════════════════════════════════════════════════════

interface DataField {
  name: string; type: string; desc: string; source: string; required: boolean;
}

interface DataTable {
  id: string; name: string; desc: string; fields: DataField[];
  upstream?: string[]; downstream?: string[]; updateFreq: string;
}

interface DataModule {
  id: string; name: string; icon: typeof Table; color: string; page: string;
  desc: string; tables: DataTable[];
}

interface WeeklyCollectionManifest {
  week: string;
  generatedAt: string;
  refreshCadence: string;
  auditSummary: {
    pagesWithStaticDataWithoutRegistry: number;
    issueCount: number;
  };
  totals: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════
// R1: 数据分层架构模型 — 采集层 / 清洗层 / 存储层 / 应用层
// ═══════════════════════════════════════════════════════════════════

/** 数据分层 — 4层架构 */
type DataLayer = 'source' | 'clean' | 'store' | 'app';

/** 数据来源范围 — 内部 vs 外部 */
type SourceScope = 'internal' | 'external' | 'hybrid';

/** 数据敏感度等级 */
type SensitivityLevel = 'L1-公开' | 'L2-内部' | 'L3-机密' | 'L4-绝密';

/** 数据治理状态 */
type GovernanceStatus = 'governed' | 'pending' | 'untracked';

interface DataGovernance {
  layer: DataLayer;           // 所属分层
  scope: SourceScope;          // 内外部
  sensitivity: SensitivityLevel; // 敏感度
  status: GovernanceStatus;    // 治理状态
  owner: string;               // 数据Owner
  steward: string;             // 数据Steward
  qualityScore: number;        // 质量评分 0-100
  freshness: string;           // 最新更新时间
  retention: string;           // 保留策略
  pii: boolean;                // 是否含PII
}

// R2: 数据分层架构元数据
const layerMeta: Record<DataLayer, { label: string; color: string; desc: string; icon: string }> = {
  source: { label: '采集层', color: '#5856d6', desc: '原始数据采集入口：API/爬虫/手工/系统同步', icon: 'Download' },
  clean:  { label: '清洗层', color: '#ff9500', desc: '数据清洗转换：去重/标准化/校验/补全', icon: 'Sparkles' },
  store:  { label: '存储层', color: '#34c759', desc: '结构化存储：数仓/数据湖/索引', icon: 'Database' },
  app:    { label: '应用层', color: '#C25B6E', desc: '业务消费：看板/分析/AI/报告', icon: 'BarChart3' },
};

// R3: 内外部数据源自动分类规则
function classifySource(scope: SourceScope) {
  return {
    internal: { label: '内部数据', color: '#34c759', bg: '#34c75910', desc: 'Momcozy自有系统生成' },
    external: { label: '外部数据', color: '#5856d6', bg: '#5856d610', desc: '第三方机构/平台提供' },
    hybrid:   { label: '混合数据', color: '#ff9500', bg: '#ff950010', desc: '内外部融合计算' },
  }[scope];
}

// R4: 数据治理评分模型 — 5维度加权
// type GovernanceDimension = 'completeness' | 'freshness' | 'consistency' | 'accuracy' | 'lineage';

/* const governanceWeights: Record<GovernanceDimension, number> = {
  completeness: 0.25,  // 字段完整度
  freshness: 0.25,     // 数据新鲜度
  consistency: 0.20,   // 跨源一致性
  accuracy: 0.20,      // 数值准确性
  lineage: 0.10,
}; */

// R5: 每个数据表的治理配置
const tableGovernance: Record<string, DataGovernance> = {
  t_mkt_size:     { layer: 'app', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '市场分析组', steward: '张分析师', qualityScore: 88, freshness: '2026-05-23', retention: '5年', pii: false },
  t_mkt_trend:    { layer: 'app', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '市场分析组', steward: '张分析师', qualityScore: 85, freshness: '2026-05-23', retention: '3年', pii: false },
  t_pest:         { layer: 'app', scope: 'external', sensitivity: 'L2-内部', status: 'pending', owner: '战略部', steward: '李研究员', qualityScore: 72, freshness: '2026-03-15', retention: '3年', pii: false },
  t_porter:       { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'pending', owner: '战略部', steward: '李研究员', qualityScore: 78, freshness: '2026-05-20', retention: '3年', pii: false },
  t_customs:      { layer: 'source', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '供应链组', steward: '王运营', qualityScore: 92, freshness: '2026-05-20', retention: '7年', pii: false },
  t_category:     { layer: 'app', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '品类管理组', steward: '赵运营', qualityScore: 90, freshness: '2026-05-23', retention: '2年', pii: false },
  t_comp_product: { layer: 'source', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '竞品情报组', steward: '刘分析师', qualityScore: 94, freshness: '2026-05-23', retention: '2年', pii: false },
  t_new_product:  { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: '竞品情报组', steward: '刘分析师', qualityScore: 82, freshness: '2026-05-23', retention: '2年', pii: false },
  t_region_comp:  { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: '竞品情报组', steward: '刘分析师', qualityScore: 78, freshness: '2026-05-20', retention: '2年', pii: false },
  t_price:        { layer: 'source', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '定价组', steward: '陈分析师', qualityScore: 93, freshness: '2026-05-23', retention: '1年', pii: false },
  t_persona:      { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: '用户研究组', steward: '孙研究员', qualityScore: 92, freshness: '2026-05-23', retention: '3年', pii: true },
  t_social:       { layer: 'source', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '社媒组', steward: '周运营', qualityScore: 88, freshness: '2026-05-23', retention: '1年', pii: false },
  t_comment:      { layer: 'source', scope: 'external', sensitivity: 'L3-机密', status: 'governed', owner: '用户研究组', steward: '孙研究员', qualityScore: 91, freshness: '2026-05-23', retention: '2年', pii: true },
  t_consumer_iv:  { layer: 'source', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: '用户研究组', steward: '孙研究员', qualityScore: 88, freshness: '2026-05-23', retention: '5年', pii: true },
  t_rfm:          { layer: 'app', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: 'CRM组', steward: '吴数据', qualityScore: 86, freshness: '2026-05-01', retention: '3年', pii: true },
  t_policy:       { layer: 'source', scope: 'external', sensitivity: 'L1-公开', status: 'governed', owner: '合规组', steward: '郑法务', qualityScore: 90, freshness: '2026-05-23', retention: '永久', pii: false },
  t_supply:       { layer: 'source', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '供应链组', steward: '王运营', qualityScore: 84, freshness: '2026-04-15', retention: '5年', pii: false },
  t_ip:           { layer: 'source', scope: 'external', sensitivity: 'L1-公开', status: 'governed', owner: 'IP组', steward: '马法务', qualityScore: 95, freshness: '2026-05-15', retention: '永久', pii: false },
  t_exhibition:   { layer: 'source', scope: 'external', sensitivity: 'L1-公开', status: 'pending', owner: '市场组', steward: '何运营', qualityScore: 85, freshness: '2026-05-23', retention: '3年', pii: false },
  t_own_product:  { layer: 'store', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '产品组', steward: '林产品', qualityScore: 96, freshness: '2026-05-23', retention: '永久', pii: false },
  t_price_strategy:{ layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '定价组', steward: '陈分析师', qualityScore: 92, freshness: '2026-05-23', retention: '2年', pii: false },
  t_channel:      { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '渠道组', steward: '王运营', qualityScore: 89, freshness: '2026-05-01', retention: '3年', pii: false },
  t_promo:        { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '市场组', steward: '何运营', qualityScore: 87, freshness: '2026-05-23', retention: '3年', pii: false },
  t_comment_ai:   { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: 'AI组', steward: '黄算法', qualityScore: 83, freshness: '2026-05-23', retention: '1年', pii: false },
  t_design_ai:    { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'untracked', owner: 'AI组', steward: '黄算法', qualityScore: 60, freshness: '2026-05-23', retention: '1年', pii: false },
  t_kb:           { layer: 'store', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '知识组', steward: '冯运营', qualityScore: 88, freshness: '2026-05-23', retention: '永久', pii: false },
  t_web_review:   { layer: 'source', scope: 'external', sensitivity: 'L3-机密', status: 'pending', owner: '爬虫组', steward: '程开发', qualityScore: 68, freshness: '2026-05-20', retention: '1年', pii: true },
};

// R21: 数据变更历史日志 — 模拟数据治理操作审计
const changeHistory = [
  { date: '2026-05-23', tableId: 't_persona', action: '更新', user: '孙研究员', desc: 'Q2用户画像数据刷新', before: '2025-12数据', after: '2026-05数据' },
  { date: '2026-05-23', tableId: 't_consumer_iv', action: '更新', user: '孙研究员', desc: 'Q2消费者访谈数据导入', before: '8条记录', after: '12条记录' },
  { date: '2026-05-20', tableId: 't_porter', action: '更新', user: '李研究员', desc: '波特五力Q2重评', before: '2026-01', after: '2026-05' },
  { date: '2026-05-23', tableId: 't_mkt_size', action: '更新', user: '张分析师', desc: 'Q2市场规模数据更新', before: '$36.8B', after: '$38.1B' },
  { date: '2026-05-23', tableId: 't_comp_product', action: '采集', user: '系统', desc: 'Amazon竞品价格周度采集', before: '-', after: '15条记录' },
  { date: '2026-05-22', tableId: 't_comment', action: '清洗', user: '孙研究员', desc: '评论情感NLP重跑', before: '准确率82%', after: '准确率87%' },
  { date: '2026-05-20', tableId: 't_customs', action: '导入', user: '王运营', desc: '4月海关数据导入', before: '缺失', after: '1,240条' },
  { date: '2026-05-18', tableId: 't_policy', action: '复核', user: '郑法务', desc: '美国CPSC CPC/eFiling来源复核', before: '官网实时声明口径', after: '待按官方CPC/eFiling规则重审' },
  { date: '2026-05-15', tableId: 't_social', action: '异常', user: '周运营', desc: 'TikTok API限流告警', before: '正常', after: '采集延迟6h' },
  { date: '2026-05-10', tableId: 't_rfm', action: '计算', user: '吴数据', desc: '5月RFM模型重算', before: 'Q1数据', after: 'Q2数据' },
  { date: '2026-05-01', tableId: 't_price', action: '更新', user: '系统', desc: 'Prime Day定价策略生效', before: '常规价', after: '促销价' },
  { date: '2026-04-28', tableId: 't_web_review', action: '合规检查', user: '程开发', desc: 'robots.txt合规审查', before: '未检查', after: '合规' },
  { date: '2026-04-25', tableId: 't_own_product', action: '新增', user: '林产品', desc: 'W1加热款SKU录入', before: '-', after: 'SKU: W1-NA-001' },
];

// R41: 数据一致性校验规则
/* const consistencyRules = [
  { id: 'c01', name: '市场份额总和=100%', tables: ['t_region_comp'], check: 'SUM(market_share_pct) GROUP BY country = 100', severity: 'critical' },
  { id: 'c02', name: '价格>0', tables: ['t_comp_product', 't_own_product'], check: 'price_usd > 0', severity: 'critical' },
  { id: 'c03', name: '评分范围1-5', tables: ['t_comp_product', 't_comment'], check: 'rating BETWEEN 1 AND 5', severity: 'warning' },
  { id: 'c04', name: '日期有效性', tables: ['t_mkt_size', 't_new_product'], check: 'year <= YEAR(CURRENT_DATE)', severity: 'warning' },
  { id: 'c05', name: '外键一致性', tables: ['t_price', 't_new_product'], check: 'product_id EXISTS IN competitor_products', severity: 'critical' },
]; */


// R41: 数据模块业务价值评分
const dataModules: DataModule[] = [
  {
    id: 'mkt', name: '市场洞察数据', icon: BarChart3, color: '#C25B6E', page: '/market',
    desc: '看市场模块所需全部数据，覆盖市场规模、趋势、PEST分析、波特五力、海关、品类分析',

    tables: [
      {
        id: 't_mkt_size', name: 'market_size_global', desc: '全球母婴护理市场规模（TAM/SAM/SOM三级测算）',
        updateFreq: '季度',
        upstream: ['Grand View Research Research', 'Statista', 'Mordor Intelligence'],
        downstream: ['market_trend', 'competitive_landscape'],
        fields: [
          { name: 'region', type: 'VARCHAR(50)', desc: '区域（北美/欧洲/亚太/中东/拉美）', source: '外部研报', required: true },
          { name: 'category', type: 'VARCHAR(50)', desc: '品类（吸奶器/哺乳文胸/配件等）', source: '外部研报', required: true },
          { name: 'tam_usd_m', type: 'DECIMAL(12,2)', desc: '总可及市场（Total Addressable Market）百万美元', source: 'Grand View Research Research 2024', required: true },
          { name: 'sam_usd_m', type: 'DECIMAL(12,2)', desc: '可服务市场（Serviceable Addressable Market）百万美元', source: 'Statista 2025', required: true },
          { name: 'som_usd_m', type: 'DECIMAL(12,2)', desc: '可获得市场（Serviceable Obtainable Market）百万美元', source: '内部测算', required: true },
          { name: 'cagr_pct', type: 'DECIMAL(5,2)', desc: '年复合增长率 %', source: 'Mordor Intelligence 2025', required: true },
          { name: 'year', type: 'INT', desc: '统计年份', source: '外部研报', required: true },
          { name: 'forecast_to', type: 'INT', desc: '预测截止年份', source: '外部研报', required: true },
          { name: 'created_at', type: 'TIMESTAMP', desc: '数据入库时间', source: '系统', required: true },
        ],
      },
      {
        id: 't_mkt_trend', name: 'market_trend_monthly', desc: '月度市场规模趋势数据',
        updateFreq: '月度', upstream: ['market_size_global'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'month', type: 'DATE', desc: '月份（YYYY-MM）', source: 'Amazon销售数据', required: true },
          { name: 'region', type: 'VARCHAR(50)', desc: '区域', source: 'Amazon', required: true },
          { name: 'category', type: 'VARCHAR(50)', desc: '品类', source: 'Amazon', required: true },
          { name: 'gmv_usd_m', type: 'DECIMAL(10,2)', desc: '月度GMV（百万美元）', source: 'Amazon Brand Analytics', required: true },
          { name: 'units_k', type: 'INT', desc: '销量（千件）', source: 'Amazon', required: true },
          { name: 'asp_usd', type: 'DECIMAL(8,2)', desc: '平均售价（美元）', source: '计算字段', required: true },
          { name: 'mom_pct', type: 'DECIMAL(5,2)', desc: '环比增速 %', source: '计算字段', required: false },
          { name: 'yoy_pct', type: 'DECIMAL(5,2)', desc: '同比增速 %', source: '计算字段', required: false },
        ],
      },
      {
        id: 't_pest', name: 'pest_analysis', desc: 'PEST宏观环境分析数据',
        updateFreq: '季度', upstream: [], downstream: ['market_size_global'],
        fields: [
          { name: 'dimension', type: 'VARCHAR(10)', desc: '维度（P政治/E经济/S社会/T技术）', source: '手工录入', required: true },
          { name: 'factor', type: 'VARCHAR(100)', desc: '具体因子名称', source: '手工录入', required: true },
          { name: 'country', type: 'VARCHAR(50)', desc: '影响国家/区域', source: '手工录入', required: true },
          { name: 'impact_level', type: 'INT', desc: '影响程度（1-5，5最高）', source: '专家评估', required: true },
          { name: 'impact_desc', type: 'TEXT', desc: '影响描述', source: '手工录入', required: true },
          { name: 'effective_date', type: 'DATE', desc: '生效日期', source: '官方文件', required: true },
          { name: 'source_url', type: 'VARCHAR(500)', desc: '政策原文链接', source: '官方网站', required: false },
        ],
      },
      {
        id: 't_porter', name: 'porter_five_forces', desc: '波特五力竞争强度分析',
        updateFreq: '半年', upstream: [], downstream: ['competitive_landscape'],
        fields: [
          { name: 'force', type: 'VARCHAR(50)', desc: '五力名称', source: '专家评估', required: true },
          { name: 'intensity', type: 'INT', desc: '竞争强度（1-5）', source: '专家评估', required: true },
          { name: 'assessment', type: 'TEXT', desc: '强度评估说明', source: '手工录入', required: true },
          { name: 'key_players', type: 'TEXT', desc: '关键参与方', source: '手工录入', required: false },
          { name: 'updated_at', type: 'TIMESTAMP', desc: '更新时间', source: '系统', required: true },
        ],
      },
      {
        id: 't_customs', name: 'customs_data', desc: '海关进出口数据（HS编码级）',
        updateFreq: '月度', upstream: ['各国海关'], downstream: ['market_trend_monthly'],
        fields: [
          { name: 'hs_code', type: 'VARCHAR(20)', desc: 'HS编码', source: '海关数据', required: true },
          { name: 'product_desc', type: 'VARCHAR(200)', desc: '产品描述', source: '海关', required: true },
          { name: 'import_country', type: 'VARCHAR(50)', desc: '进口国', source: '海关', required: true },
          { name: 'export_country', type: 'VARCHAR(50)', desc: '出口国', source: '海关', required: true },
          { name: 'value_usd', type: 'DECIMAL(12,2)', desc: '货值（美元）', source: '海关', required: true },
          { name: 'quantity', type: 'INT', desc: '数量（件/千克）', source: '海关', required: true },
          { name: 'duty_rate', type: 'DECIMAL(5,2)', desc: '关税率 %', source: '海关', required: true },
          { name: 'month', type: 'DATE', desc: '月份', source: '海关', required: true },
        ],
      },
      {
        id: 't_category', name: 'category_analysis', desc: '品类分析数据（吸奶器/文胸/配件等）',
        updateFreq: '月度', upstream: ['market_trend_monthly'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'category', type: 'VARCHAR(50)', desc: '品类名称', source: 'Amazon', required: true },
          { name: 'subcategory', type: 'VARCHAR(50)', desc: '子品类', source: 'Amazon', required: true },
          { name: 'brand', type: 'VARCHAR(50)', desc: '品牌', source: 'Amazon', required: true },
          { name: 'product_name', type: 'VARCHAR(200)', desc: '产品名称', source: 'Amazon', required: true },
          { name: 'bsr', type: 'INT', desc: 'Best Seller Rank', source: 'Amazon', required: true },
          { name: 'rating', type: 'DECIMAL(3,2)', desc: '评分', source: 'Amazon', required: true },
          { name: 'review_count', type: 'INT', desc: '评价数', source: 'Amazon', required: true },
          { name: 'price_usd', type: 'DECIMAL(8,2)', desc: '售价（美元）', source: 'Amazon', required: true },
          { name: 'snapshot_date', type: 'DATE', desc: '采集日期', source: '系统', required: true },
        ],
      },
    ],
  },
  {
    id: 'comp', name: '竞争情报数据', icon: Target, color: '#ff9500', page: '/competition',
    desc: '看竞争模块所需全部数据，覆盖竞品产品、新品监测、区域竞争、价格、品牌份额',

    tables: [
      {
        id: 't_comp_product', name: 'competitor_products', desc: '竞品产品数据库（Amazon实时采集）',
        updateFreq: '周', upstream: ['<span className="text-[#B5AFA8]">Amazon.com</span>'], downstream: ['new_product_tracker', 'price_analysis'],
        fields: [
          { name: 'product_id', type: 'VARCHAR(20)', desc: '产品唯一ID', source: '系统生成', required: true },
          { name: 'brand', type: 'VARCHAR(50)', desc: '品牌（Medela/Elvie/Willow等）', source: 'Amazon', required: true },
          { name: 'product_name', type: 'VARCHAR(200)', desc: '产品全称', source: 'Amazon', required: true },
          { name: 'category', type: 'VARCHAR(50)', desc: '品类', source: 'Amazon', required: true },
          { name: 'product_type', type: 'VARCHAR(100)', desc: '类型（穿戴式/双边/手动等）', source: 'Amazon', required: true },
          { name: 'price_usd', type: 'DECIMAL(8,2)', desc: '当前售价（美元）', source: 'Amazon', required: true },
          { name: 'rating', type: 'DECIMAL(3,2)', desc: 'Amazon评分', source: 'Amazon', required: true },
          { name: 'review_count', type: 'INT', desc: '评价数', source: 'Amazon', required: true },
          { name: 'suction_level', type: 'VARCHAR(50)', desc: '吸力等级', source: '产品规格', required: false },
          { name: 'battery_life', type: 'VARCHAR(50)', desc: '续航时间', source: '产品规格', required: false },
          { name: 'noise_level_db', type: 'INT', desc: '噪音水平（dB）', source: '产品规格', required: false },
          { name: 'weight_g', type: 'INT', desc: '重量（克）', source: '产品规格', required: false },
          { name: 'has_app', type: 'BOOLEAN', desc: '是否有APP', source: '产品规格', required: true },
          { name: 'fda_cleared', type: 'BOOLEAN', desc: 'FDA 510(k)认证', source: 'FDA数据库', required: true },
          { name: 'ce_certified', type: 'BOOLEAN', desc: 'CE认证', source: '产品规格', required: true },
          { name: 'highlight', type: 'TEXT', desc: '产品亮点', source: 'Amazon', required: false },
          { name: 'source_url', type: 'VARCHAR(500)', desc: 'Amazon产品链接', source: 'Amazon', required: true },
          { name: 'snapshot_date', type: 'DATE', desc: '采集日期', source: '系统', required: true },
        ],
      },
      {
        id: 't_new_product', name: 'new_product_tracker', desc: '新品上市追踪监测',
        updateFreq: '周', upstream: ['competitor_products'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'product_id', type: 'VARCHAR(20)', desc: '产品ID', source: 'competitor_products', required: true },
          { name: 'brand', type: 'VARCHAR(50)', desc: '品牌', source: 'competitor_products', required: true },
          { name: 'product_name', type: 'VARCHAR(200)', desc: '产品名称', source: '手工录入', required: true },
          { name: 'launch_date', type: 'DATE', desc: '上市日期', source: '新闻/官网', required: true },
          { name: 'launch_region', type: 'VARCHAR(100)', desc: '首发区域', source: '新闻/官网', required: true },
          { name: 'key_innovation', type: 'TEXT', desc: '核心技术创新点', source: '新闻/官网', required: true },
          { name: 'threat_level', type: 'VARCHAR(20)', desc: '威胁等级（高/中/低）', source: '专家评估', required: true },
          { name: 'response_strategy', type: 'TEXT', desc: '应对策略建议', source: '专家评估', required: false },
          { name: 'status', type: 'VARCHAR(20)', desc: '状态（在售/即将上市/已下架）', source: '手工录入', required: true },
        ],
      },
      {
        id: 't_region_comp', name: 'region_competitive_landscape', desc: '区域竞争格局数据',
        updateFreq: '季度', upstream: ['market_size_global'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'country', type: 'VARCHAR(50)', desc: '国家', source: 'Amazon+内部', required: true },
          { name: 'region', type: 'VARCHAR(50)', desc: '大洲区域', source: '系统', required: true },
          { name: 'brand', type: 'VARCHAR(50)', desc: '品牌', source: 'Amazon', required: true },
          { name: 'market_share_pct', type: 'DECIMAL(5,2)', desc: '市场份额 %', source: 'Amazon Brand Analytics', required: true },
          { name: 'bsr_avg', type: 'INT', desc: '平均BSR排名', source: 'Amazon', required: true },
          { name: 'price_position', type: 'VARCHAR(20)', desc: '价格定位（高端/中端/低端）', source: '计算字段', required: true },
          { name: 'distribution_channels', type: 'TEXT', desc: '销售渠道', source: '调研', required: false },
          { name: 'snapshot_date', type: 'DATE', desc: '采集日期', source: '系统', required: true },
        ],
      },
      {
        id: 't_price', name: 'price_analysis', desc: '价格分析数据（历史价格走势）',
        updateFreq: '周', upstream: ['competitor_products'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'product_id', type: 'VARCHAR(20)', desc: '产品ID', source: 'competitor_products', required: true },
          { name: 'price_usd', type: 'DECIMAL(8,2)', desc: '价格（美元）', source: 'Amazon', required: true },
          { name: 'promotion_type', type: 'VARCHAR(50)', desc: '促销类型（Prime Day/Black Friday/常规）', source: 'Amazon', required: false },
          { name: 'discount_pct', type: 'DECIMAL(5,2)', desc: '折扣率 %', source: '计算字段', required: false },
          { name: 'snapshot_date', type: 'DATE', desc: '采集日期', source: '系统', required: true },
        ],
      },
    ],
  },
  {
    id: 'user', name: '用户研究数据', icon: Users, color: '#af52de', page: '/users',
    desc: '看用户模块所需全部数据，覆盖用户画像、社交声量、评论、消费者/渠道/店铺访谈',

    tables: [
      {
        id: 't_persona', name: 'user_personas', desc: '用户画像数据（6类核心人群）',
        updateFreq: '半年', upstream: ['consumer_interviews'], downstream: ['rfm_analysis'],
        fields: [
          { name: 'persona_id', type: 'VARCHAR(20)', desc: '画像ID', source: '系统', required: true },
          { name: 'persona_name', type: 'VARCHAR(50)', desc: '画像名称（孕期妈妈/新手妈妈等）', source: '手工录入', required: true },
          { name: 'age_range', type: 'VARCHAR(20)', desc: '年龄范围', source: '调研', required: true },
          { name: 'income_level', type: 'VARCHAR(50)', desc: '收入水平', source: '调研', required: true },
          { name: 'pct_of_userbase', type: 'DECIMAL(5,2)', desc: '占用户基数 %', source: 'CRM', required: true },
          { name: 'growth_rate', type: 'DECIMAL(5,2)', desc: '增速 %', source: 'CRM', required: true },
          { name: 'key_traits', type: 'TEXT', desc: '关键特征描述', source: '调研', required: true },
          { name: 'core_needs', type: 'TEXT', desc: '核心诉求', source: '调研', required: true },
          { name: 'pain_points', type: 'TEXT', desc: '痛点', source: '调研', required: true },
          { name: 'purchase_channels', type: 'TEXT', desc: '购买渠道偏好', source: '调研', required: true },
          { name: 'info_sources', type: 'TEXT', desc: '信息获取渠道', source: '调研', required: true },
          { name: 'avg_order_value', type: 'DECIMAL(8,2)', desc: '平均客单价（美元）', source: 'CRM', required: true },
          { name: 'color', type: 'VARCHAR(20)', desc: '画像标识色', source: '系统', required: true },
        ],
      },
      {
        id: 't_social', name: 'social_mention_data', desc: '社交声量监测数据',
        updateFreq: '日', upstream: ['社交媒体API'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'date', type: 'DATE', desc: '日期', source: '社交媒体API', required: true },
          { name: 'platform', type: 'VARCHAR(50)', desc: '平台（TikTok/IG/FB等）', source: 'API', required: true },
          { name: 'brand', type: 'VARCHAR(50)', desc: '被提及品牌', source: 'API', required: true },
          { name: 'mention_count', type: 'INT', desc: '提及次数', source: 'API', required: true },
          { name: 'sentiment_score', type: 'DECIMAL(4,2)', desc: '情感分（-1到+1）', source: 'NLP模型', required: true },
          { name: 'engagement_count', type: 'INT', desc: '互动数（点赞+评论+转发）', source: 'API', required: true },
          { name: 'reach_count', type: 'INT', desc: '触达人数', source: 'API', required: true },
        ],
      },
      {
        id: 't_comment', name: 'user_comments', desc: '用户评论明细数据',
        updateFreq: '日', upstream: ['Amazon API'], downstream: ['comment_analysis_ai'],
        fields: [
          { name: 'comment_id', type: 'VARCHAR(50)', desc: '评论唯一ID', source: 'Amazon', required: true },
          { name: 'product_id', type: 'VARCHAR(20)', desc: '产品ID', source: 'competitor_products', required: true },
          { name: 'brand', type: 'VARCHAR(50)', desc: '品牌', source: 'Amazon', required: true },
          { name: 'rating', type: 'INT', desc: '评分（1-5星）', source: 'Amazon', required: true },
          { name: 'review_text', type: 'TEXT', desc: '评论原文', source: 'Amazon', required: true },
          { name: 'review_date', type: 'DATE', desc: '评论日期', source: 'Amazon', required: true },
          { name: 'helpful_votes', type: 'INT', desc: ' helpful votes', source: 'Amazon', required: false },
          { name: 'verified_purchase', type: 'BOOLEAN', desc: '是否Verified Purchase', source: 'Amazon', required: true },
          { name: 'country', type: 'VARCHAR(50)', desc: '评论者国家', source: 'Amazon', required: false },
          { name: 'language', type: 'VARCHAR(20)', desc: '评论语言', source: 'NLP模型', required: true },
        ],
      },
      {
        id: 't_consumer_iv', name: 'consumer_interviews', desc: '消费者访谈记录',
        updateFreq: '季度', upstream: [], downstream: ['user_personas'],
        fields: [
          { name: 'interview_id', type: 'VARCHAR(20)', desc: '访谈ID', source: '系统', required: true },
          { name: 'persona_type', type: 'VARCHAR(50)', desc: '所属画像类型', source: '手工录入', required: true },
          { name: 'name', type: 'VARCHAR(100)', desc: '受访者化名', source: '手工录入', required: true },
          { name: 'age', type: 'INT', desc: '年龄', source: '访谈', required: true },
          { name: 'ethnicity', type: 'VARCHAR(50)', desc: '族裔', source: '访谈', required: false },
          { name: 'job', type: 'VARCHAR(100)', desc: '职业', source: '访谈', required: true },
          { name: 'hobbies', type: 'TEXT', desc: '爱好', source: '访谈', required: false },
          { name: 'baby_status', type: 'TEXT', desc: '育儿状态', source: '访谈', required: true },
          { name: 'current_product', type: 'TEXT', desc: '当前使用产品', source: '访谈', required: true },
          { name: 'usage_freq', type: 'TEXT', desc: '使用频率', source: '访谈', required: true },
          { name: 'usage_scenes', type: 'TEXT', desc: '使用场景', source: '访谈', required: true },
          { name: 'preferences', type: 'TEXT', desc: '产品偏好', source: '访谈', required: true },
          { name: 'positioning', type: 'TEXT', desc: '产品定位认知', source: '访谈', required: true },
          { name: 'needs', type: 'TEXT', desc: '需求', source: '访谈', required: true },
          { name: 'pain_points', type: 'TEXT', desc: '痛点', source: '访谈', required: true },
          { name: 'purchase_channels', type: 'TEXT', desc: '购买渠道', source: '访谈', required: true },
          { name: 'purchase_focus', type: 'TEXT', desc: '购买关注点', source: '访谈', required: true },
          { name: 'info_sources', type: 'TEXT', desc: '信息来源', source: '访谈', required: true },
          { name: 'family_situation', type: 'TEXT', desc: '家庭情况', source: '访谈', required: true },
          { name: 'life_focus', type: 'TEXT', desc: '生活重点', source: '访谈', required: true },
          { name: 'attention_areas', type: 'TEXT', desc: '关注领域', source: '访谈', required: true },
          { name: 'interview_date', type: 'DATE', desc: '访谈日期', source: '系统', required: true },
        ],
      },
      {
        id: 't_rfm', name: 'rfm_user_segments', desc: 'RFM用户价值分层数据',
        updateFreq: '月度', upstream: ['user_personas'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'user_id', type: 'VARCHAR(50)', desc: '用户ID（脱敏）', source: 'CRM', required: true },
          { name: 'segment', type: 'VARCHAR(50)', desc: '用户层级（重要价值/重要发展等）', source: 'RFM模型', required: true },
          { name: 'recency_days', type: 'INT', desc: '最近购买距今天数', source: 'CRM', required: true },
          { name: 'frequency', type: 'INT', desc: '购买频次', source: 'CRM', required: true },
          { name: 'monetary_usd', type: 'DECIMAL(8,2)', desc: '累计消费金额（美元）', source: 'CRM', required: true },
          { name: 'recommended_action', type: 'TEXT', desc: '推荐运营动作', source: 'RFM模型', required: true },
          { name: 'calc_date', type: 'DATE', desc: '计算日期', source: '系统', required: true },
        ],
      },
    ],
  },
  {
    id: 'ind', name: '行业动态数据', icon: Shield, color: '#5856d6', page: '/industry',
    desc: '看行业模块所需全部数据，覆盖政策法规、供应链、IP专利、展会、宏观',
    tables: [
      {
        id: 't_policy', name: 'policy_regulations', desc: '政策法规数据库',
        updateFreq: '周', upstream: ['各国政府网站'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'policy_id', type: 'VARCHAR(20)', desc: '政策唯一ID', source: '系统', required: true },
          { name: 'country', type: 'VARCHAR(50)', desc: '国家', source: '政府网站', required: true },
          { name: 'regulator', type: 'VARCHAR(100)', desc: '监管机构', source: '政府网站', required: true },
          { name: 'title', type: 'VARCHAR(500)', desc: '政策标题', source: '政府网站', required: true },
          { name: 'effective_date', type: 'DATE', desc: '生效日期', source: '政府网站', required: true },
          { name: 'tag', type: 'VARCHAR(50)', desc: '标签（合规新规/标准更新/强制认证等）', source: '手工录入', required: true },
          { name: 'urgency', type: 'VARCHAR(20)', desc: '紧急程度（urgent/normal）', source: '评估', required: true },
          { name: 'full_text', type: 'TEXT', desc: '政策全文', source: '政府网站', required: false },
          { name: 'impact_assessment', type: 'TEXT', desc: '影响评估', source: '专家评估', required: false },
          { name: 'source_url', type: 'VARCHAR(500)', desc: '原文链接', source: '政府网站', required: true },
          { name: 'created_at', type: 'TIMESTAMP', desc: '入库时间', source: '系统', required: true },
        ],
      },
      {
        id: 't_supply', name: 'supply_chain_nodes', desc: '供应链节点数据',
        updateFreq: '季度', upstream: ['内部ERP'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'node_id', type: 'VARCHAR(20)', desc: '节点ID', source: 'ERP', required: true },
          { name: 'node_type', type: 'VARCHAR(50)', desc: '节点类型（工厂/仓库/分销中心）', source: 'ERP', required: true },
          { name: 'location', type: 'VARCHAR(200)', desc: '地理位置（城市, 国家）', source: 'ERP', required: true },
          { name: 'lat', type: 'DECIMAL(10,6)', desc: '纬度', source: '地图API', required: true },
          { name: 'lng', type: 'DECIMAL(10,6)', desc: '经度', source: '地图API', required: true },
          { name: 'capacity', type: 'TEXT', desc: '产能/仓储能力描述', source: 'ERP', required: false },
          { name: 'status', type: 'VARCHAR(20)', desc: '运营状态（正常/扩建/规划中）', source: 'ERP', required: true },
        ],
      },
      {
        id: 't_ip', name: 'ip_patents', desc: 'IP专利资产数据',
        updateFreq: '月度', upstream: ['WIPO/USPTO'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'patent_id', type: 'VARCHAR(50)', desc: '专利号', source: 'WIPO', required: true },
          { name: 'title', type: 'VARCHAR(500)', desc: '专利名称', source: 'WIPO', required: true },
          { name: 'assignee', type: 'VARCHAR(100)', desc: '专利权人', source: 'WIPO', required: true },
          { name: 'patent_type', type: 'VARCHAR(50)', desc: '类型（发明/实用新型/外观）', source: 'WIPO', required: true },
          { name: 'filing_date', type: 'DATE', desc: '申请日期', source: 'WIPO', required: true },
          { name: 'grant_date', type: 'DATE', desc: '授权日期', source: 'WIPO', required: false },
          { name: 'status', type: 'VARCHAR(50)', desc: '状态（授权/审查中/驳回）', source: 'WIPO', required: true },
          { name: 'country', type: 'VARCHAR(50)', desc: '申请国', source: 'WIPO', required: true },
          { name: 'ipc_class', type: 'VARCHAR(50)', desc: 'IPC分类号', source: 'WIPO', required: true },
          { name: 'abstract', type: 'TEXT', desc: '专利摘要', source: 'WIPO', required: true },
        ],
      },
      {
        id: 't_exhibition', name: 'trade_exhibitions', desc: '展会情报数据',
        updateFreq: '月度', upstream: ['展会官网'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'exhibition_id', type: 'VARCHAR(20)', desc: '展会ID', source: '系统', required: true },
          { name: 'name', type: 'VARCHAR(200)', desc: '展会全称', source: '展会官网', required: true },
          { name: 'city', type: 'VARCHAR(100)', desc: '举办城市', source: '展会官网', required: true },
          { name: 'country', type: 'VARCHAR(50)', desc: '举办国家', source: '展会官网', required: true },
          { name: 'start_date', type: 'DATE', desc: '开始日期', source: '展会官网', required: true },
          { name: 'end_date', type: 'DATE', desc: '结束日期', source: '展会官网', required: true },
          { name: 'category', type: 'VARCHAR(100)', desc: '展会类型（婴童/消费电子等）', source: '展会官网', required: true },
          { name: 'importance', type: 'VARCHAR(20)', desc: '重要程度（核心/关注/参考）', source: '评估', required: true },
          { name: 'booth_info', type: 'TEXT', desc: '展位信息', source: '内部', required: false },
          { name: 'key_findings', type: 'TEXT', desc: '关键发现', source: '调研', required: false },
        ],
      },
    ],
  },
  {
    id: 'self', name: '品牌自研数据', icon: Eye, color: '#34c759', page: '/self',
    desc: '看自己模块所需全部数据，覆盖产品、定价、渠道、推广（营销4P）',
    tables: [
      {
        id: 't_own_product', name: 'momcozy_products', desc: 'Momcozy自有产品数据库',
        updateFreq: '月度', upstream: ['内部ERP'], downstream: ['product_analysis'],
        fields: [
          { name: 'sku', type: 'VARCHAR(20)', desc: 'SKU编码', source: 'ERP', required: true },
          { name: 'product_name', type: 'VARCHAR(200)', desc: '产品名称', source: 'ERP', required: true },
          { name: 'category', type: 'VARCHAR(50)', desc: '品类', source: 'ERP', required: true },
          { name: 'product_type', type: 'VARCHAR(100)', desc: '类型', source: 'ERP', required: true },
          { name: 'price_usd', type: 'DECIMAL(8,2)', desc: '官方售价（美元）', source: 'ERP', required: true },
          { name: 'cost_usd', type: 'DECIMAL(8,2)', desc: 'BOM成本（美元）', source: 'ERP', required: true },
          { name: 'margin_pct', type: 'DECIMAL(5,2)', desc: '毛利率 %', source: '计算字段', required: true },
          { name: 'launch_date', type: 'DATE', desc: '上市日期', source: 'ERP', required: true },
          { name: 'status', type: 'VARCHAR(20)', desc: '状态（在售/即将上市/退市）', source: 'ERP', required: true },
          { name: 'bcg_quadrant', type: 'VARCHAR(20)', desc: 'BCG象限（明星/现金牛/问题/瘦狗）', source: '计算字段', required: false },
          { name: 'innovation_desc', type: 'TEXT', desc: '创新点描述', source: '产品部', required: true },
        ],
      },
      {
        id: 't_price_strategy', name: 'pricing_strategy', desc: '定价策略数据',
        updateFreq: '周', upstream: ['momcozy_products', 'competitor_products'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'sku', type: 'VARCHAR(20)', desc: 'SKU编码', source: 'momcozy_products', required: true },
          { name: 'channel', type: 'VARCHAR(50)', desc: '渠道（Amazon/DTC/Target等）', source: 'ERP', required: true },
          { name: 'regular_price', type: 'DECIMAL(8,2)', desc: '日常售价', source: 'ERP', required: true },
          { name: 'promo_price', type: 'DECIMAL(8,2)', desc: '促销价', source: 'ERP', required: false },
          { name: 'promo_type', type: 'VARCHAR(50)', desc: '促销类型', source: 'ERP', required: false },
          { name: 'asp_usd', type: 'DECIMAL(8,2)', desc: '实际ASP（美元）', source: '计算字段', required: true },
          { name: 'asp_vs_comp', type: 'DECIMAL(5,2)', desc: 'vs竞品ASP差异 %', source: '计算字段', required: false },
          { name: 'week_ending', type: 'DATE', desc: '统计周截止日', source: '系统', required: true },
        ],
      },
      {
        id: 't_channel', name: 'channel_performance', desc: '渠道表现数据',
        updateFreq: '月度', upstream: ['ERP'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'channel', type: 'VARCHAR(50)', desc: '渠道名称', source: 'ERP', required: true },
          { name: 'region', type: 'VARCHAR(50)', desc: '区域', source: 'ERP', required: true },
          { name: 'revenue_pct', type: 'DECIMAL(5,2)', desc: '营收占比 %', source: 'ERP', required: true },
          { name: 'growth_pct', type: 'DECIMAL(5,2)', desc: '增长率 %', source: '计算字段', required: true },
          { name: 'margin_pct', type: 'DECIMAL(5,2)', desc: '毛利率 %', source: 'ERP', required: true },
          { name: 'control_score', type: 'INT', desc: '品牌控制力（1-100）', source: '评估', required: true },
          { name: 'month', type: 'DATE', desc: '月份', source: '系统', required: true },
        ],
      },
      {
        id: 't_promo', name: 'promotion_campaigns', desc: '推广活动数据',
        updateFreq: '活动后', upstream: ['各平台API'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'campaign_id', type: 'VARCHAR(20)', desc: '活动ID', source: '系统', required: true },
          { name: 'campaign_name', type: 'VARCHAR(200)', desc: '活动名称', source: '市场部', required: true },
          { name: 'type', type: 'VARCHAR(50)', desc: '活动类型（Prime Day/Brand Day等）', source: '市场部', required: true },
          { name: 'channel', type: 'VARCHAR(50)', desc: '渠道', source: '市场部', required: true },
          { name: 'start_date', type: 'DATE', desc: '开始日期', source: '市场部', required: true },
          { name: 'end_date', type: 'DATE', desc: '结束日期', source: '市场部', required: true },
          { name: 'discount_pct', type: 'DECIMAL(5,2)', desc: '折扣率 %', source: '市场部', required: true },
          { name: 'featured_sku', type: 'TEXT', desc: '主推SKU', source: '市场部', required: true },
          { name: 'budget_usd', type: 'DECIMAL(10,2)', desc: '预算（美元）', source: '市场部', required: true },
          { name: 'roas', type: 'DECIMAL(5,2)', desc: 'ROAS（广告回报率）', source: '计算字段', required: false },
          { name: 'impressions', type: 'INT', desc: '曝光量', source: 'API', required: false },
          { name: 'leads', type: 'INT', desc: '线索数', source: 'API', required: false },
        ],
      },
    ],
  },
  {
    id: 'ai', name: 'AI辅助数据', icon: Sparkles, color: '#af52de', page: '/ai-assistant',
    desc: 'AI助手模块所需全部数据，覆盖评论分析、设计助手、知识库、数据评论',
    tables: [
      {
        id: 't_comment_ai', name: 'comment_analysis_ai', desc: 'AI评论分析结果',
        updateFreq: '日', upstream: ['user_comments'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'analysis_id', type: 'VARCHAR(20)', desc: '分析ID', source: '系统', required: true },
          { name: 'product_id', type: 'VARCHAR(20)', desc: '产品ID', source: 'user_comments', required: true },
          { name: 'aspect', type: 'VARCHAR(100)', desc: '分析维度（吸力/静音/续航等）', source: 'NLP模型', required: true },
          { name: 'sentiment', type: 'VARCHAR(20)', desc: '情感（positive/negative/neutral）', source: 'NLP模型', required: true },
          { name: 'mention_pct', type: 'DECIMAL(5,2)', desc: '提及占比 %', source: 'NLP模型', required: true },
          { name: 'sample_quotes', type: 'TEXT', desc: '典型引用', source: 'NLP模型', required: false },
          { name: 'run_date', type: 'DATE', desc: '分析运行日期', source: '系统', required: true },
        ],
      },
      {
        id: 't_design_ai', name: 'design_assistant_output', desc: 'AI设计助手输出记录',
        updateFreq: '每次', upstream: [], downstream: [],
        fields: [
          { name: 'output_id', type: 'VARCHAR(20)', desc: '输出ID', source: '系统', required: true },
          { name: 'prompt', type: 'TEXT', desc: '用户输入Prompt', source: '用户', required: true },
          { name: 'output_image_url', type: 'VARCHAR(500)', desc: '生成图片URL', source: 'AI模型', required: true },
          { name: 'model_used', type: 'VARCHAR(50)', desc: '使用的AI模型', source: '系统', required: true },
          { name: 'created_at', type: 'TIMESTAMP', desc: '生成时间', source: '系统', required: true },
        ],
      },
      {
        id: 't_kb', name: 'knowledge_base', desc: 'AI知识库内容',
        updateFreq: '实时', upstream: [], downstream: ['ai-assistant'],
        fields: [
          { name: 'doc_id', type: 'VARCHAR(20)', desc: '文档ID', source: '系统', required: true },
          { name: 'title', type: 'VARCHAR(500)', desc: '文档标题', source: '手工录入', required: true },
          { name: 'category', type: 'VARCHAR(100)', desc: '分类', source: '手工录入', required: true },
          { name: 'content', type: 'LONGTEXT', desc: '文档内容', source: '手工录入', required: true },
          { name: 'embedding_vector', type: 'TEXT', desc: '向量嵌入', source: 'AI模型', required: false },
          { name: 'created_at', type: 'TIMESTAMP', desc: '创建时间', source: '系统', required: true },
        ],
      },
      {
        id: 't_web_review', name: 'web_review_scraped', desc: '网页评论爬取数据',
        updateFreq: '周', upstream: ['各网站'], downstream: ['comment_analysis_ai'],
        fields: [
          { name: 'review_id', type: 'VARCHAR(50)', desc: '评论ID', source: '爬虫', required: true },
          { name: 'source_site', type: 'VARCHAR(200)', desc: '来源网站', source: '爬虫', required: true },
          { name: 'product_name', type: 'VARCHAR(200)', desc: '产品名称', source: '爬虫', required: true },
          { name: 'rating', type: 'INT', desc: '评分', source: '爬虫', required: true },
          { name: 'review_text', type: 'TEXT', desc: '评论内容', source: '爬虫', required: true },
          { name: 'review_date', type: 'DATE', desc: '评论日期', source: '爬虫', required: true },
          { name: 'author', type: 'VARCHAR(100)', desc: '评论者', source: '爬虫', required: false },
          { name: 'scraped_at', type: 'TIMESTAMP', desc: '爬取时间', source: '系统', required: true },
        ],
      },
    ],
  },
];

// 数据血缘关系汇总
const dataLineage = [
  { from: '外部研报（Grand View Research/Statista）', to: 'market_size_global', type: '外部导入' },
  { from: 'market_size_global', to: 'market_trend_monthly', type: '派生计算' },
  { from: '<span className="text-[#B5AFA8]">Amazon.com</span>', to: 'competitor_products', type: '实时采集' },
  { from: 'competitor_products', to: 'new_product_tracker', type: '派生计算' },
  { from: 'competitor_products', to: 'price_analysis', type: '派生计算' },
  { from: 'user_comments', to: 'comment_analysis_ai', type: 'AI分析' },
  { from: 'consumer_interviews', to: 'user_personas', type: '归纳提炼' },
  { from: 'user_personas', to: 'rfm_user_segments', type: '模型计算' },
  { from: '各国政府网站', to: 'policy_regulations', type: '实时采集' },
  { from: '内部ERP', to: 'momcozy_products', type: '系统同步' },
  { from: 'WIPO/USPTO', to: 'ip_patents', type: 'API同步' },
];

export default function DataManage() {
  const [activeModule, setActiveModule] = useState('mkt');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['t_mkt_size']));
  const [showLineage, setShowLineage] = useState(false);
  // R7: 数据治理视图切换
  const [governanceView, setGovernanceView] = useState<'tables' | 'layers' | 'governance' | 'manual'>('tables');
  const [scopeFilter, setScopeFilter] = useState<SourceScope | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [weeklyManifest, setWeeklyManifest] = useState<WeeklyCollectionManifest | null>(null);
  const [weeklyManifestStatus, setWeeklyManifestStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let active = true;

    fetch('/data/weekly/latest.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Weekly manifest unavailable: ${response.status}`);
        return response.json() as Promise<WeeklyCollectionManifest>;
      })
      .then((manifest) => {
        if (!active) return;
        setWeeklyManifest(manifest);
        setWeeklyManifestStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setWeeklyManifest(null);
        setWeeklyManifestStatus('missing');
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleTable = (id: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const navigate = useNavigate();
  const currentModule = dataModules.find(m => m.id === activeModule)!;
  const totalTables = dataModules.reduce((s, m) => s + m.tables.length, 0);
  const totalFields = dataModules.reduce((s, m) => s + m.tables.reduce((ts, t) => ts + t.fields.length, 0), 0);
  const weeklyTotals = weeklyManifest?.totals ?? {};
  const weeklyGeneratedAt = weeklyManifest ? new Date(weeklyManifest.generatedAt).toLocaleString('zh-CN', { hour12: false }) : '-';

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5856d6] to-[#af52de] flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#1d1d1f]">数据管理</h1>
              <p className="text-xs text-[#86868b]">{totalTables}张数据表 · {totalFields}个字段 · 6大模块 · MECE原则组织</p>
            </div>
            <button onClick={() => navigate('/data-source')} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5856d6] to-[#34c759] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
              <ShieldCheck className="w-4 h-4" />数据来源管理
            </button>
          </div>
        </div>

        {/* R24: 批量导出工具栏 */}
        <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF] mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#86868b] font-medium">批量导出：</span>
          <button onClick={() => exportToCsv(
            dataModules.flatMap(m => m.tables).flatMap(t => t.fields.map(f => ({ module: dataModules.find(m => m.tables.includes(t))?.name || '', table: t.name, tableId: t.id, field: f.name, type: f.type, desc: f.desc, source: f.source, required: f.required ? '是' : '否' }))),
            { module: '模块', table: '表名', tableId: '表ID', field: '字段', type: '类型', desc: '说明', source: '数据来源', required: '必填' },
            '全站数据字典_' + new Date().toISOString().slice(0, 10)
          )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all border border-[#EDE6DF]"><Download className="w-3.5 h-3.5" />全站数据字典</button>
          <button onClick={() => exportToCsv(
            dataModules.flatMap(m => m.tables.map(t => ({ module: m.name, tableId: t.id, tableName: t.name, desc: t.desc, fieldCount: t.fields.length, updateFreq: t.updateFreq, upstream: (t.upstream || []).join(', '), downstream: (t.downstream || []).join(', ') }))),
            { module: '模块', tableId: '表ID', tableName: '表名', desc: '描述', fieldCount: '字段数', updateFreq: '更新频率', upstream: '上游', downstream: '下游' },
            '数据表清单_' + new Date().toISOString().slice(0, 10)
          )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all border border-[#EDE6DF]"><Download className="w-3.5 h-3.5" />数据表清单</button>
          <button onClick={() => exportToCsv(
            Object.entries(tableGovernance).map(([tid, g]) => {
              const t = dataModules.flatMap(m => m.tables).find(t => t.id === tid);
              return { tableId: tid, tableName: t?.name || '', ...g, upstream: (t?.upstream || []).join(', '), downstream: (t?.downstream || []).join(', ') };
            }),
            { tableId: '表ID', tableName: '表名', layer: '分层', scope: '范围', sensitivity: '敏感度', qualityScore: '质量分', status: '状态', owner: 'Owner', steward: 'Steward', freshness: '新鲜度', pii: 'PII', retention: '保留', upstream: '上游', downstream: '下游' },
            '数据治理报告_' + new Date().toISOString().slice(0, 10)
          )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all border border-[#EDE6DF]"><Download className="w-3.5 h-3.5" />治理报告</button>
        </div>

        {/* 周度采集刷新状态 */}
        <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
              {weeklyManifestStatus === 'ready' ? <CheckCircle className="w-4 h-4 text-[#34c759]" /> : <AlertCircle className="w-4 h-4 text-[#ff9500]" />}
            </div>
            <div className="min-w-[180px]">
              <p className="text-xs font-semibold text-[#1d1d1f]">周度数据采集刷新</p>
              <p className="text-[10px] text-[#86868b]">
                {weeklyManifestStatus === 'ready' ? `${weeklyManifest?.week} · ${weeklyGeneratedAt}` : weeklyManifestStatus === 'loading' ? '正在读取 manifest' : '未生成 public/data/weekly/latest.json'}
              </p>
            </div>
            {[
              { label: '公开来源成功', value: weeklyTotals.ok ?? 0, color: '#34c759' },
              { label: '连接器待接入', value: weeklyTotals['connector-required'] ?? 0, color: '#ff9500' },
              { label: '人工补录', value: weeklyTotals['manual-required'] ?? 0, color: '#5856d6' },
              { label: '请求异常', value: (weeklyTotals['source-error'] ?? 0) + (weeklyTotals['fetch-error'] ?? 0), color: '#ff3b30' },
              { label: '未绑定registry页面', value: weeklyManifest?.auditSummary.pagesWithStaticDataWithoutRegistry ?? 0, color: '#C25B6E' },
            ].map((item) => (
              <div key={item.label} className="px-3 py-2 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF] min-w-[112px]">
                <p className="text-[10px] text-[#86868b]">{item.label}</p>
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
            <a href="/data/weekly/latest.json" className="ml-auto text-[10px] font-medium text-[#5856d6] hover:text-[#C25B6E] transition-colors">
              查看manifest
            </a>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '数据表总数', value: String(totalTables), color: '#C25B6E' },
            { label: '字段总数', value: String(totalFields), color: '#ff9500' },
            { label: '模块数', value: '6', color: '#34c759' },
            { label: '数据血缘', value: String(dataLineage.length), color: '#5856d6' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
              <p className="text-xs text-[#86868b] mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* R8: 增强版Module Tabs + 数据治理视图切换 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {dataModules.map(mod => {
            const IconComp = mod.icon;
            return (
              <button key={mod.id} onClick={() => { setActiveModule(mod.id); setGovernanceView('tables'); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeModule === mod.id && governanceView === 'tables' ? 'text-white shadow-sm' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200'}`}
                style={activeModule === mod.id && governanceView === 'tables' ? { backgroundColor: mod.color, boxShadow: `0 3px 10px ${mod.color}30` } : {}}>
                <IconComp className="w-4 h-4" />
                {mod.name}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeModule === mod.id && governanceView === 'tables' ? 'bg-white/20 text-white' : 'bg-[#FBF8F5] text-[#86868b]'}`}>{mod.tables.length}表</span>
              </button>
            );
          })}
          <button onClick={() => { setGovernanceView('layers'); setShowLineage(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${governanceView === 'layers' ? 'bg-[#5856d6] text-white shadow-sm' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5]'}`}>
            <Layers className="w-4 h-4" />
            分层架构
          </button>
          <button onClick={() => { setGovernanceView('governance'); setShowLineage(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${governanceView === 'governance' ? 'bg-[#af52de] text-white shadow-sm' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5]'}`}>
            <ShieldCheck className="w-4 h-4" />
            数据治理
          </button>
          <button onClick={() => { setGovernanceView('manual'); setShowLineage(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${governanceView === 'manual' ? 'bg-[#C25B6E] text-white shadow-sm' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5]'}`}>
            <BookOpen className="w-4 h-4" />
            操作手册
          </button>
          <button onClick={() => { setShowLineage(!showLineage); setGovernanceView('tables'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${showLineage ? 'bg-[#ff3b30] text-white shadow-sm' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5]'}`}>
            <Link2 className="w-4 h-4" />
            数据血缘
          </button>
        </div>

        {/* R9: 搜索+范围过滤工具栏 */}
        {governanceView !== 'tables' && governanceView !== 'manual' && (
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white border border-[#EDE6DF]">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-[#B5AFA8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索数据表、字段、Owner..."
                className="flex-1 min-w-0 text-sm bg-transparent outline-none text-[#1d1d1f] placeholder-[#B5AFA8]"
              />
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'internal', 'external', 'hybrid'] as const).map(s => (
                <button key={s} onClick={() => setScopeFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${scopeFilter === s ? 'bg-[#C25B6E] text-white' : 'bg-[#FBF8F5] text-[#86868b] hover:bg-[#F5EDE8]'}`}>
                  {s === 'all' ? '全部' : s === 'internal' ? '内部' : s === 'external' ? '外部' : '混合'}
                </button>
              ))}
            </div>
            <button onClick={() => exportToCsv(
              Object.entries(tableGovernance).map(([k, v]) => ({ tableId: k, ...v })),
              { tableId: '表ID', layer: '分层', scope: '范围', sensitivity: '敏感度', status: '治理状态', owner: 'Owner', qualityScore: '质量分', freshness: '新鲜度' },
              '数据治理清单_' + new Date().toISOString().slice(0, 10)
            )} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all">
              <Download className="w-3 h-3" />导出
            </button>
          </div>
        )}

        {/* R11-R13: 增强数据血缘关系图谱 — 交互式+路径追踪 */}
        {showLineage && (
          <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF] mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#ff3b30]" /> 数据血缘关系图
              </h2>
              <span className="text-[10px] text-[#86868b] bg-[#FBF8F5] px-2 py-1 rounded-lg">{dataLineage.length}条血缘链路 · 点击节点追踪路径</span>
            </div>
            {/* 外部数据源入口层 */}
            <div className="mb-4 p-3 rounded-xl bg-[#5856d6]/5 border border-[#5856d6]/10">
              <p className="text-[10px] text-[#5856d6] font-semibold mb-2">外部数据源入口</p>
              <div className="flex flex-wrap gap-2">
                {['Amazon.com API', 'Grand View Research', '各国海关', 'WIPO/USPTO', '政府网站', '社媒API'].map((s, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg bg-white text-[10px] text-[#5856d6] border border-[#5856d6]/20">{s}</span>
                ))}
              </div>
            </div>
            {/* 血缘链路可视化 */}
            <div className="space-y-2 mb-4">
              {dataLineage.map((line, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors cursor-pointer group">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: line.type === '外部导入' ? '#5856d620' : line.type === 'AI分析' ? '#af52de20' : '#C25B6E20', color: line.type === '外部导入' ? '#5856d6' : line.type === 'AI分析' ? '#af52de' : '#C25B6E' }}>{line.type}</span>
                  <span className="text-xs font-medium text-[#86868b] bg-white px-2 py-1 rounded-lg flex-shrink-0">{line.from}</span>
                  <div className="flex-1 min-w-0 h-px bg-gradient-to-r from-[#B5AFA8] to-[#C25B6E] group-hover:h-0.5 transition-all" />
                  <ChevronRight className="w-3 h-3 text-[#C25B6E] flex-shrink-0" />
                  <span className="text-xs font-medium text-[#1d1d1f] truncate bg-white px-2 py-1 rounded-lg flex-shrink-0">{line.to}</span>
                </div>
              ))}
            </div>
            {/* 内部分析应用出口层 */}
            <div className="mb-4 p-3 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
              <p className="text-[10px] text-[#C25B6E] font-semibold mb-2">内部分析应用出口</p>
              <div className="flex flex-wrap gap-2">
                {['dashboard_kpi', 'product_analysis', 'comment_analysis_ai', 'ai-assistant'].map((s, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg bg-white text-[10px] text-[#C25B6E] border border-[#C25B6E]/20">{s}</span>
                ))}
              </div>
            </div>
            {/* R13: 血缘路径说明 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#ff3b30]/5 border border-[#ff3b30]/10">
                <p className="text-[10px] text-[#ff3b30] font-semibold mb-1">关键路径：市场规模测算</p>
                <p className="text-[10px] text-[#86868b]">外部研报 → market_size_global → market_trend_monthly → dashboard_kpi<br/>此路径影响首页KPI和TAM/SAM/SOM展示，优先级P0</p>
              </div>
              <div className="p-3 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/10">
                <p className="text-[10px] text-[#ff9500] font-semibold mb-1">关键路径：竞品情报</p>
                <p className="text-[10px] text-[#86868b]">Amazon API → competitor_products → price_analysis + new_product_tracker<br/>此路径影响竞品库和价格监测，优先级P0</p>
              </div>
            </div>
          </div>
        )}

        {/* R10a: 数据分层架构视图 */}
        {governanceView === 'layers' && (
          <div className="space-y-6">
            {/* 4层架构可视化 */}
            <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
              <h2 className="text-sm font-semibold text-[#1d1d1f] mb-5 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#5856d6]" /> 数据分层架构 — 从采集到应用的全链路
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(['source', 'clean', 'store', 'app'] as DataLayer[]).map((layer, li) => {
                  const meta = layerMeta[layer];
                  const tablesInLayer = Object.entries(tableGovernance).filter(([, g]) => g.layer === layer);
                  return (
                    <div key={layer} className="rounded-xl border-2 p-4" style={{ borderColor: `${meta.color}30`, backgroundColor: `${meta.color}08` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                          <span style={{ color: meta.color }}>
                            {layer === 'source' ? <Globe className="w-4 h-4" /> : layer === 'clean' ? <Sparkles className="w-4 h-4" /> : layer === 'store' ? <HardDrive className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</p>
                          <p className="text-[10px] text-[#86868b]">{tablesInLayer.length}张表</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#86868b] mb-3 leading-relaxed">{meta.desc}</p>
                      <div className="space-y-1.5">
                        {tablesInLayer.slice(0, 5).map(([tid, tg]) => {
                          const tname = dataModules.flatMap(m => m.tables).find(t => t.id === tid)?.name || tid;
                          return (
                            <div key={tid} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/60">
                              <Table className="w-3 h-3 text-[#B5AFA8]" />
                              <span className="text-[10px] text-[#1d1d1f] truncate">{tname}</span>
                              <span className={`ml-auto px-1 py-0.5 rounded text-[8px] font-medium ${tg.scope === 'internal' ? 'bg-[#34c759]/10 text-[#34c759]' : tg.scope === 'external' ? 'bg-[#5856d6]/10 text-[#5856d6]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{tg.scope === 'internal' ? '内' : tg.scope === 'external' ? '外' : '混'}</span>
                            </div>
                          );
                        })}
                        {tablesInLayer.length > 5 && <p className="text-[9px] text-[#B5AFA8] text-center">+{tablesInLayer.length - 5} more</p>}
                      </div>
                      {li < 3 && <div className="hidden md:flex justify-center mt-2"><ChevronRight className="w-4 h-4 text-[#B5AFA8] rotate-90 md:rotate-0" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 内外部数据分布 */}
            <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#5856d6]" /> 内外部数据分布
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {(['internal', 'external', 'hybrid'] as SourceScope[]).map(scope => {
                  const info = classifySource(scope);
                  const count = Object.values(tableGovernance).filter(g => g.layer !== undefined && g.scope === scope).length;
                  const avgScore = Math.round(Object.values(tableGovernance).filter(g => g.scope === scope).reduce((s, g) => s + g.qualityScore, 0) / (count || 1));
                  return (
                    <div key={scope} className="p-4 rounded-xl border" style={{ borderColor: `${info.color}30`, backgroundColor: info.bg }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                        <span className="text-xs font-semibold" style={{ color: info.color }}>{info.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-[#1d1d1f]">{count}<span className="text-sm text-[#86868b] ml-1">张表</span></p>
                      <p className="text-[10px] text-[#86868b] mt-1">{info.desc}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[10px] text-[#86868b]">平均质量分</span>
                        <div className="flex-1 min-w-0 h-1.5 rounded-full bg-white/60 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${avgScore}%`, backgroundColor: avgScore >= 85 ? '#34c759' : avgScore >= 70 ? '#ff9500' : '#ff3b30' }} />
                        </div>
                        <span className="text-[10px] font-medium" style={{ color: avgScore >= 85 ? '#34c759' : avgScore >= 70 ? '#ff9500' : '#ff3b30' }}>{avgScore}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* R10b: 数据治理视图 */}
        {governanceView === 'governance' && (
          <div className="space-y-6">
            {/* 治理评分总览 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '已治理表', value: Object.values(tableGovernance).filter(g => g.status === 'governed').length, total: Object.keys(tableGovernance).length, color: '#34c759' },
                { label: '待治理表', value: Object.values(tableGovernance).filter(g => g.status === 'pending').length, total: Object.keys(tableGovernance).length, color: '#ff9500' },
                { label: '未追踪表', value: Object.values(tableGovernance).filter(g => g.status === 'untracked').length, total: Object.keys(tableGovernance).length, color: '#ff3b30' },
                { label: '平均质量分', value: Math.round(Object.values(tableGovernance).reduce((s, g) => s + g.qualityScore, 0) / Object.keys(tableGovernance).length), total: 100, color: '#5856d6', suffix: '/100' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <p className="text-xs text-[#86868b] mb-1">{s.label}</p>
                  <div className="flex items-end gap-1">
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <span className="text-xs text-[#B5AFA8] mb-1">{s.suffix || `/ ${s.total}`}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[#FBF8F5] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(s.value / s.total) * 100}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
            {/* R14-R15: 数据质量趋势监控 */}
            <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#34c759]" /> 数据质量评分分布
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { range: '90-100', label: '优秀', color: '#34c759', count: Object.values(tableGovernance).filter(g => g.qualityScore >= 90).length },
                  { range: '80-89', label: '良好', color: '#5856d6', count: Object.values(tableGovernance).filter(g => g.qualityScore >= 80 && g.qualityScore < 90).length },
                  { range: '70-79', label: '一般', color: '#ff9500', count: Object.values(tableGovernance).filter(g => g.qualityScore >= 70 && g.qualityScore < 80).length },
                  { range: '60-69', label: '待改善', color: '#ff3b30', count: Object.values(tableGovernance).filter(g => g.qualityScore >= 60 && g.qualityScore < 70).length },
                  { range: '<60', label: '危险', color: '#86868b', count: Object.values(tableGovernance).filter(g => g.qualityScore < 60).length },
                ].map((s, i) => (
                  <div key={i} className="p-3 rounded-xl border text-center" style={{ borderColor: `${s.color}30`, backgroundColor: `${s.color}08` }}>
                    <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
                    <p className="text-[10px] text-[#86868b]">{s.range} · {s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* R26: 敏感度分布 + Owner工作量 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-[#ff3b30]" /> 数据敏感度分布</h4>
                <div className="space-y-2">
                  {[
                    { level: 'L1-公开', color: '#34c759', count: Object.values(tableGovernance).filter(g => g.sensitivity === 'L1-公开').length },
                    { level: 'L2-内部', color: '#5856d6', count: Object.values(tableGovernance).filter(g => g.sensitivity === 'L2-内部').length },
                    { level: 'L3-机密', color: '#ff9500', count: Object.values(tableGovernance).filter(g => g.sensitivity === 'L3-机密').length },
                    { level: 'L4-绝密', color: '#ff3b30', count: Object.values(tableGovernance).filter(g => g.sensitivity === 'L4-绝密').length },
                  ].map(s => (
                    <div key={s.level} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#86868b] w-16">{s.level}</span>
                      <div className="flex-1 min-w-0 h-2 rounded-full bg-[#FBF8F5] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(s.count / Object.keys(tableGovernance).length) * 100}%`, backgroundColor: s.color }} />
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: s.color }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#5856d6]" /> Owner工作量</h4>
                <div className="space-y-1.5">
                  {Object.entries(Object.values(tableGovernance).reduce((acc, g) => {
                      const k = g.owner;
                      if (!acc[k]) acc[k] = [];
                      acc[k].push(g);
                      return acc;
                    }, {} as Record<string, DataGovernance[]>)).sort(([, a], [, b]) => b.length - a.length).slice(0, 6).map(([owner, tables]) => {
                    const avgScore = Math.round(tables.reduce((s, g) => s + g.qualityScore, 0) / (tables.length || 1));
                    return (
                      <div key={owner} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#86868b] w-16 truncate">{owner}</span>
                        <span className="text-[10px] text-[#C25B6E] font-medium w-6">{tables.length}表</span>
                        <div className="flex-1 min-w-0 h-1.5 rounded-full bg-[#FBF8F5] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${avgScore}%`, backgroundColor: avgScore >= 85 ? '#34c759' : '#ff9500' }} />
                        </div>
                        <span className="text-[9px] text-[#B5AFA8]">{avgScore}分</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* 治理详情表 */}
            <div className="bg-white rounded-2xl card-shadow-sm border border-[#EDE6DF] overflow-hidden">
              <div className="p-4 border-b border-[#EDE6DF] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#af52de]" /> 数据治理清单
                </h3>
                <span className="text-[10px] text-[#86868b]">{Object.keys(tableGovernance).length}张表 · 5维度评估</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#EDE6DF] bg-[#FAF8F6]">
                      {['数据表', '分层', '范围', '敏感度', '质量分', 'Owner', 'Steward', '状态', 'PII', '保留策略'].map((h, i) => (
                        <th key={i} className="py-2.5 px-3 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(tableGovernance)
                      .filter(([tid, g]) => {
                        if (scopeFilter !== 'all' && g.scope !== scopeFilter) return false;
                        if (searchQuery) {
                          const tname = dataModules.flatMap(m => m.tables).find(t => t.id === tid)?.name || tid;
                          return tname.toLowerCase().includes(searchQuery.toLowerCase()) || g.owner.includes(searchQuery) || tid.toLowerCase().includes(searchQuery.toLowerCase());
                        }
                        return true;
                      })
                      .sort(([, a], [, b]) => b.qualityScore - a.qualityScore)
                      .map(([tid, g]) => {
                        const tname = dataModules.flatMap(m => m.tables).find(t => t.id === tid)?.name || tid;
                        return (
                          <tr key={tid} className="border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors">
                            <td className="py-2 px-3">
                              <span className="text-xs font-medium text-[#1d1d1f] truncate">{tname}</span>
                              <span className="text-[9px] text-[#B5AFA8] ml-1 font-mono">{tid}</span>
                            </td>
                            <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: `${layerMeta[g.layer].color}15`, color: layerMeta[g.layer].color }}>{layerMeta[g.layer].label}</span></td>
                            <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${g.scope === 'internal' ? 'bg-[#34c759]/10 text-[#34c759]' : g.scope === 'external' ? 'bg-[#5856d6]/10 text-[#5856d6]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{g.scope === 'internal' ? '内部' : g.scope === 'external' ? '外部' : '混合'}</span></td>
                            <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${g.sensitivity === 'L1-公开' ? 'bg-[#34c759]/10 text-[#34c759]' : g.sensitivity === 'L2-内部' ? 'bg-[#5856d6]/10 text-[#5856d6]' : g.sensitivity === 'L3-机密' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>{g.sensitivity}</span></td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-10 h-1.5 rounded-full bg-[#FBF8F5] overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${g.qualityScore}%`, backgroundColor: g.qualityScore >= 85 ? '#34c759' : g.qualityScore >= 70 ? '#ff9500' : '#ff3b30' }} />
                                </div>
                                <span className="text-[10px] font-medium text-[#1d1d1f] truncate">{g.qualityScore}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-[10px] text-[#86868b]">{g.owner}</td>
                            <td className="py-2 px-3 text-[10px] text-[#86868b]">{g.steward}</td>
                            <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${g.status === 'governed' ? 'bg-[#34c759]/10 text-[#34c759]' : g.status === 'pending' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>{g.status === 'governed' ? '已治理' : g.status === 'pending' ? '待治理' : '未追踪'}</span></td>
                            <td className="py-2 px-3">{g.pii ? <Lock className="w-3.5 h-3.5 text-[#ff3b30]" /> : <span className="text-[10px] text-[#B5AFA8]">-</span>}</td>
                            <td className="py-2 px-3 text-[10px] text-[#86868b]">{g.retention}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {/* R23: 变更历史 */}
              <div className="mt-4 p-4 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#5856d6]" /> 最近变更记录</h4>
                  <span className="text-[9px] text-[#86868b]">{changeHistory.length}条记录 · 近30天</span>
                </div>
                <div className="space-y-2">
                  {changeHistory.slice(0, 6).map((ch, i) => {
                    const tname = dataModules.flatMap(m => m.tables).find(t => t.id === ch.tableId)?.name || ch.tableId;
                    return (
                      <div key={i} className="flex items-center gap-3 text-[10px]">
                        <span className="text-[#B5AFA8] w-20 flex-shrink-0">{ch.date}</span>
                        <span className={`px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${ch.action === '更新' ? 'bg-[#C25B6E]/10 text-[#C25B6E]' : ch.action === '采集' ? 'bg-[#34c759]/10 text-[#34c759]' : ch.action === '异常' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : 'bg-[#5856d6]/10 text-[#5856d6]'}`}>{ch.action}</span>
                        <span className="text-[#1d1d1f] font-medium truncate">{tname}</span>
                        <span className="text-[#86868b] truncate flex-1">{ch.desc}</span>
                        <span className="text-[#B5AFA8] flex-shrink-0">{ch.user}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* R50: 操作手册与业务价值中心 */}
        {governanceView === 'manual' && !showLineage && (
          <OperationsManual />
        )}

        {/* Module Detail */}
        {governanceView === 'tables' && !showLineage && (
          <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
            <div className="flex items-center gap-2 mb-1">
              <currentModule.icon className="w-4 h-4" style={{ color: currentModule.color }} />
              <h2 className="text-sm font-semibold text-[#1d1d1f]">{currentModule.name}</h2>
              <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-full">{currentModule.tables.length}张表 · {currentModule.tables.reduce((s, t) => s + t.fields.length, 0)}个字段</span>
            </div>
            <p className="text-xs text-[#86868b] mb-5">{currentModule.desc}</p>

            {/* Tables */}
            <div className="space-y-4">
              {currentModule.tables.map(table => {
                const isExpanded = expandedTables.has(table.id);
                return (
                  <div key={table.id} className="border border-[#EDE6DF] rounded-xl overflow-hidden">
                    {/* R25: 表头部 + 导出 */}
                    <div className="w-full flex items-center gap-4 p-4 bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200 text-left">
                      <button onClick={() => toggleTable(table.id)} className="flex flex-1 min-w-0 items-center gap-4 text-left">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[#86868b] flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#86868b] flex-shrink-0" />}
                        <Table className="w-4 h-4 text-[#C25B6E] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#1d1d1f]">{table.name}</span>
                            <span className="text-[10px] text-[#86868b] bg-white px-1.5 py-0.5 rounded">{table.fields.length}字段</span>
                            <span className="text-[10px] text-[#C25B6E] bg-[#C25B6E]/10 px-1.5 py-0.5 rounded">{table.updateFreq}更新</span>
                          </div>
                          <p className="text-xs text-[#86868b] mt-0.5">{table.desc}</p>
                        </div>
                      </button>
                      <button onClick={e => { e.stopPropagation(); exportToCsv(table.fields.map(f => ({ name: f.name, type: f.type, desc: f.desc, source: f.source, required: f.required ? '是' : '否' })), { name: '字段名', type: '数据类型', desc: '说明', source: '数据来源', required: '必填' }, table.name + '_' + new Date().toISOString().slice(0, 10)); }} className="flex items-center gap-1 px-2 py-1 rounded bg-white text-[9px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all flex-shrink-0"><Download className="w-3 h-3" />导出</button>
                      {table.upstream && table.upstream.length > 0 && (
                        <div className="hidden md:flex items-center gap-1 text-[10px] text-[#86868b]">
                          <Info className="w-3 h-3" />
                          上游：{table.upstream.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Table Fields */}
                    {isExpanded && (
                      <div className="p-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-[#EDE6DF] table-row-hover">
                                {['字段名', '数据类型', '字段说明', '数据来源', '必填'].map((h, i) => (
                                  <th key={i} className="py-2 px-3 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.fields.map((field, fi) => (
                                <tr key={fi} className="border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors duration-200 duration-200">
                                  <td className="py-2 px-3 text-xs font-medium text-[#1d1d1f] truncate">{field.name}</td>
                                  <td className="py-2 px-3"><code className="text-[10px] bg-[#FBF8F5] px-1.5 py-0.5 rounded text-[#af52de]">{field.type}</code></td>
                                  <td className="py-2 px-3 text-xs text-[#86868b]">{field.desc}</td>
                                  <td className="py-2 px-3 text-xs text-[#86868b]">{field.source}</td>
                                  <td className="py-2 px-3">
                                    {field.required ? (
                                      <span className="flex items-center gap-1 text-[10px] text-[#ff3b30]"><AlertCircle className="w-3 h-3" />必填</span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-[10px] text-[#86868b]"><CheckCircle className="w-3 h-3" />可选</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Upstream/Downstream */}
                        <div className="flex items-center gap-4 mt-3 text-[10px]">
                          {table.upstream && table.upstream.length > 0 && (
                            <div className="flex items-center gap-1 text-[#86868b]">
                              <Link2 className="w-3 h-3" />
                              上游：{table.upstream.join('、')}
                            </div>
                          )}
                          {table.downstream && table.downstream.length > 0 && (
                            <div className="flex items-center gap-1 text-[#C25B6E]">
                              <Link2 className="w-3 h-3" />
                              下游：{table.downstream.join('、')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MECE说明 */}
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] mt-5">
          <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#5856d6]" /> MECE数据架构说明
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#86868b] leading-relaxed truncate">
            <div className="p-3 rounded-xl bg-[#FBF8F5]">
              <p className="font-medium text-[#1d1d1f] truncate mb-1">Mutually Exclusive（相互独立）</p>
              <p>6大模块按业务域严格划分：市场洞察（外部市场环境）↔ 竞争情报（竞争对手）↔ 用户研究（消费者）↔ 行业动态（政策法规/供应链/IP）↔ 品牌自研（Momcozy自身）↔ AI辅助（AI工具链）。每类数据只归属一个模块，避免重复存储。</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FBF8F5]">
              <p className="font-medium text-[#1d1d1f] truncate mb-1">Collectively Exhaustive（完全穷尽）</p>
              <p>{totalTables}张数据表覆盖当前网站核心页面的数据需求。从市场规模TAM测算到单条评论的情感分析，从全球政策追踪到AI设计助手的Prompt记录，确保工作台数据持续按当前资产目录校准。</p>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-[#34c759]/5 border border-[#34c759]/10">
            <p className="text-[10px] text-[#34c759] font-medium mb-1">数据接入建议</p>
            <p className="text-[10px] text-[#86868b] leading-relaxed">方式1：数仓直连 — 通过ETL管道将上述数据表对接至Snowflake/BigQuery数仓，设置定时任务同步。方式2：文件上传 — 通过CSV/Excel文件批量导入，适合外部采购的研报数据。方式3：API对接 — Amazon SP-API/海关API/社交媒体API直接对接，实现数据自动化采集。建议优先对接Amazon和CRM系统，这两类数据覆盖面最广、更新频率最高。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
