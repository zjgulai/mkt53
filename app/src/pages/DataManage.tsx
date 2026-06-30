import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Table, ChevronRight, ChevronDown, BarChart3, Target, Users, Shield, Eye, Sparkles, Link2, AlertCircle, CheckCircle, Info, ShieldCheck, Download, Lock, Globe, HardDrive, Search, Layers, RefreshCw, FileText, BookOpen } from 'lucide-react';
import OperationsManual from '@/components/OperationsManual';
import { usePeriodicManifest } from '@/hooks/usePeriodicManifest';
import { exportToCsv } from '@/utils/csvExport';

// ═══════════════════════════════════════════════════════════════════
// 数据管理页面 — Momcozy市场洞察工作台全站数据资产目录
// 原则：MECE（Mutually Exclusive, Collectively Exhaustive）
// 七大模块 · 全站数据表 · 完整字段说明 · 数据血缘关系
// ═══════════════════════════════════════════════════════════════════

interface DataField {
  name: string; type: string; desc: string; source: string; required: boolean;
  sourceIds?: string[];
}

interface DataTable {
  id: string; name: string; desc: string; fields: DataField[];
  upstream?: string[]; downstream?: string[]; updateFreq: string;
  sourceIds?: string[];
}

interface DataModule {
  id: string; name: string; icon: typeof Table; color: string; page: string;
  desc: string; tables: DataTable[];
  sourceIds?: string[];
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
  freshness: string;           // 数据刷新状态或真实数据快照日期
  retention: string;           // 保留策略
  pii: boolean;                // 是否含PII
  sourceIds?: string[];        // 目录或治理记录来源
}

const dataCatalogSourceIds = ['ds-027'];
const erpGovernanceSourceIds = ['ds-027', 'ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'];

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
  t_mkt_size:     { layer: 'app', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '市场分析组', steward: '张分析师', qualityScore: 88, freshness: '半月manifest复核', retention: '5年', pii: false },
  t_mkt_trend:    { layer: 'app', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '市场分析组', steward: '张分析师', qualityScore: 85, freshness: '半月manifest复核', retention: '3年', pii: false },
  t_pest:         { layer: 'app', scope: 'external', sensitivity: 'L2-内部', status: 'pending', owner: '战略部', steward: '李研究员', qualityScore: 72, freshness: '公开来源复核中', retention: '3年', pii: false },
  t_porter:       { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'pending', owner: '战略部', steward: '李研究员', qualityScore: 78, freshness: '人工评估待复核', retention: '3年', pii: false },
  t_customs:      { layer: 'source', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '供应链组', steward: '王运营', qualityScore: 92, freshness: '海关凭证待接入', retention: '7年', pii: false },
  t_category:     { layer: 'app', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '品类管理组', steward: '赵运营', qualityScore: 90, freshness: '连接器待接入', retention: '2年', pii: false },
  t_comp_product: { layer: 'source', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '竞品情报组', steward: '刘分析师', qualityScore: 94, freshness: '连接器待接入', retention: '2年', pii: false },
  t_new_product:  { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: '竞品情报组', steward: '刘分析师', qualityScore: 82, freshness: '连接器待接入', retention: '2年', pii: false },
  t_region_comp:  { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: '竞品情报组', steward: '刘分析师', qualityScore: 78, freshness: '连接器待接入', retention: '2年', pii: false },
  t_price:        { layer: 'source', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '定价组', steward: '陈分析师', qualityScore: 93, freshness: '连接器待接入', retention: '1年', pii: false },
  t_persona:      { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: '用户研究组', steward: '孙研究员', qualityScore: 92, freshness: '人工凭证待接入', retention: '3年', pii: true },
  t_social:       { layer: 'source', scope: 'external', sensitivity: 'L2-内部', status: 'governed', owner: '社媒组', steward: '周运营', qualityScore: 88, freshness: '连接器待接入', retention: '1年', pii: false },
  t_comment:      { layer: 'source', scope: 'external', sensitivity: 'L3-机密', status: 'governed', owner: '用户研究组', steward: '孙研究员', qualityScore: 91, freshness: 'VOC凭证待接入', retention: '2年', pii: true },
  t_consumer_iv:  { layer: 'source', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: '用户研究组', steward: '孙研究员', qualityScore: 88, freshness: '访谈凭证待接入', retention: '5年', pii: true },
  t_rfm:          { layer: 'app', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: 'CRM组', steward: '吴数据', qualityScore: 86, freshness: 'CRM待接入', retention: '3年', pii: true },
  t_policy:       { layer: 'source', scope: 'external', sensitivity: 'L1-公开', status: 'governed', owner: '合规组', steward: '郑法务', qualityScore: 90, freshness: '公开来源复核中', retention: '永久', pii: false },
  t_supply:       { layer: 'source', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '供应链组', steward: '王运营', qualityScore: 84, freshness: 'ERP待接入', retention: '5年', pii: false },
  t_ip:           { layer: 'source', scope: 'external', sensitivity: 'L1-公开', status: 'governed', owner: 'IP组', steward: '马法务', qualityScore: 95, freshness: '公开来源复核中', retention: '永久', pii: false },
  t_exhibition:   { layer: 'source', scope: 'external', sensitivity: 'L1-公开', status: 'pending', owner: '市场组', steward: '何运营', qualityScore: 85, freshness: '公开来源复核中', retention: '3年', pii: false },
  t_own_product:  { layer: 'store', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '产品组', steward: '林产品', qualityScore: 96, freshness: 'ERP待接入', retention: '永久', pii: false },
  t_price_strategy:{ layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '定价组', steward: '陈分析师', qualityScore: 92, freshness: '人工策略待复核', retention: '2年', pii: false },
  t_channel:      { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '渠道组', steward: '王运营', qualityScore: 89, freshness: '人工凭证待接入', retention: '3年', pii: false },
  t_promo:        { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '市场组', steward: '何运营', qualityScore: 87, freshness: '人工策略待复核', retention: '3年', pii: false },
  t_ai_dataset_manifest: { layer: 'clean', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: 'AI组', steward: '数据治理组', qualityScore: 72, freshness: 'Batch4 readiness已生成', retention: '3年', pii: false },
  t_ai_model_run_manifest: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: 'AI组', steward: '黄算法', qualityScore: 68, freshness: '模型运行审计待接入', retention: '2年', pii: false },
  t_ai_human_review_gate: { layer: 'app', scope: 'internal', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务复核人', qualityScore: 70, freshness: '人工复核门禁待审批', retention: '5年', pii: false },
  t_report_generation_queue: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '报告组', steward: '数据治理组', qualityScore: 70, freshness: 'Batch4队列已生成', retention: '5年', pii: false },
  t_ai_erp_context_bridge: { layer: 'clean', scope: 'internal', sensitivity: 'L3-机密', status: 'pending', owner: 'AI组', steward: 'ERP数据管理员', qualityScore: 69, freshness: 'ERP上下文桥接待审批', retention: '3年', pii: false },
  t_ai_review_sample_manifest: { layer: 'clean', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '用户研究组', steward: '数据治理组', qualityScore: 71, freshness: 'Batch5样本gate已生成', retention: '3年', pii: true },
  t_ai_review_eval_queue: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: 'AI组', steward: '黄算法', qualityScore: 68, freshness: 'Batch5 eval队列已生成', retention: '2年', pii: false },
  t_ai_review_human_queue: { layer: 'app', scope: 'internal', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务复核人', qualityScore: 70, freshness: 'Batch5人工复核队列已生成', retention: '5年', pii: false },
  t_ai_review_publish_gate: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务复核人', qualityScore: 72, freshness: 'Batch5发布门禁已生成', retention: '5年', pii: false },
  t_ai_design_run_manifest: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: 'AI组', steward: '黄算法', qualityScore: 68, freshness: 'Batch6生成run gate已生成', retention: '2年', pii: false },
  t_ai_design_asset_hash_manifest: { layer: 'clean', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '创意组', steward: '数据治理组', qualityScore: 70, freshness: 'Batch6资产hash gate已生成', retention: '3年', pii: false },
  t_ai_design_cost_queue: { layer: 'app', scope: 'internal', sensitivity: 'L3-机密', status: 'pending', owner: 'AI组', steward: '财务/数据治理组', qualityScore: 66, freshness: 'Batch6成本队列已生成', retention: '5年', pii: false, sourceIds: dataCatalogSourceIds },
  t_ai_design_commercial_review_gate: { layer: 'app', scope: 'internal', sensitivity: 'L3-机密', status: 'pending', owner: '品牌组', steward: '法务/创意负责人', qualityScore: 69, freshness: 'Batch6商用审核门禁已生成', retention: '5年', pii: false },
  t_comment_ai:   { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: 'AI组', steward: '黄算法', qualityScore: 83, freshness: 'VOC凭证待接入', retention: '1年', pii: false },
  t_design_ai:    { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'untracked', owner: 'AI组', steward: '黄算法', qualityScore: 60, freshness: '生成日志待接入', retention: '1年', pii: false },
  t_kb:           { layer: 'store', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '知识组', steward: '冯运营', qualityScore: 88, freshness: '半月manifest复核', retention: '永久', pii: false },
  t_web_review:   { layer: 'source', scope: 'external', sensitivity: 'L3-机密', status: 'pending', owner: '爬虫组', steward: '程开发', qualityScore: 68, freshness: '网页评论凭证待接入', retention: '1年', pii: true },
  t_erp_artifact: { layer: 'source', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: '数据治理组', steward: 'ERP数据管理员', qualityScore: 86, freshness: 'ERP快照已取证', retention: '5年', pii: false },
  t_erp_sku:      { layer: 'store', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '产品组', steward: 'ERP数据管理员', qualityScore: 82, freshness: 'Batch19内部proxy已放行', retention: '永久', pii: false },
  t_erp_sales_monthly: { layer: 'store', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: '销售运营组', steward: 'ERP数据管理员', qualityScore: 86, freshness: 'Batch19内部proxy已放行', retention: '5年', pii: false },
  t_erp_after_sales_monthly: { layer: 'store', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: '售后运营组', steward: 'ERP数据管理员', qualityScore: 84, freshness: 'Batch19内部proxy已放行', retention: '5年', pii: false },
  t_erp_retail_channel_monthly: { layer: 'store', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: '渠道运营组', steward: 'ERP数据管理员', qualityScore: 82, freshness: 'Batch19内部proxy已放行', retention: '5年', pii: false },
  t_erp_channel_growth: { layer: 'store', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: '销售运营组', steward: 'ERP数据管理员', qualityScore: 82, freshness: 'Batch19内部proxy已放行', retention: '5年', pii: false },
  t_erp_channel_target: { layer: 'store', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: '销售运营组', steward: 'ERP数据管理员', qualityScore: 82, freshness: 'Batch19内部proxy已放行', retention: '5年', pii: false },
  t_erp_channel_customer_dim: { layer: 'clean', scope: 'internal', sensitivity: 'L3-机密', status: 'governed', owner: '渠道运营组', steward: 'ERP数据管理员', qualityScore: 80, freshness: 'Batch19内部proxy已放行', retention: '5年', pii: false },
  t_erp_inventory_snapshot: { layer: 'source', scope: 'internal', sensitivity: 'L3-机密', status: 'pending', owner: '供应链组', steward: 'ERP数据管理员', qualityScore: 62, freshness: '库存快照待接入', retention: '5年', pii: false },
  t_erp_field_dictionary: { layer: 'clean', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: 'ERP数据管理员', qualityScore: 68, freshness: 'Batch7字段字典readiness已生成', retention: '永久', pii: false },
  t_erp_category_mapping: { layer: 'clean', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: '品类管理组', steward: 'ERP数据管理员', qualityScore: 82, freshness: 'Batch19内部proxy已放行', retention: '永久', pii: false },
  t_erp_category_review_queue: { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'pending', owner: '品类管理组', steward: 'ERP数据管理员', qualityScore: 70, freshness: 'Batch7品类复核队列已生成', retention: '3年', pii: false },
  t_erp_subtotal_reconciliation_queue: { layer: 'app', scope: 'internal', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: 'ERP数据管理员', qualityScore: 68, freshness: 'Batch7小计复核队列已生成', retention: '5年', pii: false },
  t_erp_display_approval_gate: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 70, freshness: 'Batch7展示审批门禁已生成', retention: '5年', pii: false },
  t_erp_field_owner_approval_packet: { layer: 'app', scope: 'internal', sensitivity: 'L3-机密', status: 'pending', owner: '销售运营/售后运营组', steward: 'ERP数据管理员', qualityScore: 70, freshness: 'Batch8字段owner审批包已生成', retention: '5年', pii: false },
  t_erp_category_owner_approval_packet: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '品类管理组', steward: 'ERP数据管理员', qualityScore: 70, freshness: 'Batch8品类owner审批包已生成', retention: '5年', pii: false },
  t_erp_subtotal_owner_explanation_packet: { layer: 'app', scope: 'internal', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: 'ERP数据管理员', qualityScore: 69, freshness: 'Batch8小计解释审批包已生成', retention: '5年', pii: false },
  t_erp_display_approval_record_template: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '业务数据Owner', steward: '数据治理组', qualityScore: 70, freshness: 'Batch8展示审批记录模板已生成', retention: '5年', pii: false },
  t_erp_owner_approval_backlog: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch8审批backlog已生成', retention: '5年', pii: false },
  t_erp_owner_approval_intake_contract: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch9审批intake合同已生成', retention: '5年', pii: false },
  t_erp_owner_approval_validation_result: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch9审批校验结果已生成', retention: '5年', pii: false },
  t_erp_owner_approval_release_gate: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch9发布门禁已生成', retention: '5年', pii: false },
  t_erp_owner_approval_promotion_manifest: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch9 promotion manifest已生成', retention: '5年', pii: false },
  t_erp_owner_approval_owner_packet_index: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch10 owner packet index已生成', retention: '5年', pii: false },
  t_erp_owner_approval_record_input_template: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch10 owner record模板已生成', retention: '5年', pii: false },
  t_erp_owner_approval_required_evidence_matrix: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch10 required evidence矩阵已生成', retention: '5年', pii: false },
  t_erp_owner_approval_submission_readiness: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch10提交readiness已生成', retention: '5年', pii: false },
  t_erp_owner_approval_preflight_rulebook: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch11预检规则已生成', retention: '5年', pii: false },
  t_erp_owner_approval_preflight_result: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch11预检结果已生成', retention: '5年', pii: false },
  t_erp_owner_approval_forbidden_value_scan: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch11禁用值扫描已生成', retention: '5年', pii: false },
  t_erp_owner_approval_batch9_handoff_queue: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch11 Batch9 handoff队列已生成', retention: '5年', pii: false },
  t_erp_owner_approval_release_preflight_summary: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch11 release预检汇总已生成', retention: '5年', pii: false },
  t_erp_owner_submission_intake_inventory: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch12提交目录盘点已生成', retention: '5年', pii: false },
  t_erp_owner_submission_schema_audit: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch12 schema audit已生成', retention: '5年', pii: false },
  t_erp_owner_submission_redaction_audit: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch12脱敏扫描已生成', retention: '5年', pii: false },
  t_erp_owner_submission_batch11_queue: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch12 Batch11队列已生成', retention: '5年', pii: false },
  t_erp_owner_submission_release_readiness: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch12 release readiness已生成', retention: '5年', pii: false },
  t_erp_owner_submission_packet_index: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch13 submission packet index已生成', retention: '5年', pii: false },
  t_erp_owner_submission_template_manifest: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch13 template manifest已生成', retention: '5年', pii: false },
  t_erp_owner_submission_field_completion_checklist: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch13字段补全checklist已生成', retention: '5年', pii: false },
  t_erp_owner_submission_release_packet_matrix: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch13 release packet matrix已生成', retention: '5年', pii: false },
  t_erp_owner_submission_handoff_guide: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch13 handoff guide已生成', retention: '5年', pii: false },
  t_erp_owner_submission_dropbox_status: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch14 dropbox status已生成', retention: '5年', pii: false },
  t_erp_owner_submission_owner_action_queue: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch14 owner action queue已生成', retention: '5年', pii: false },
  t_erp_owner_submission_template_distribution: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch14 template distribution已生成', retention: '5年', pii: false },
  t_erp_owner_submission_release_watchlist: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch14 release watchlist已生成', retention: '5年', pii: false },
  t_erp_owner_submission_command_runbook: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch14 command runbook已生成', retention: '5年', pii: false },
  t_erp_owner_submission_acceptance_rulebook: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch15 acceptance rulebook已生成', retention: '5年', pii: false },
  t_erp_owner_submission_acceptance_result: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch15 acceptance result已生成', retention: '5年', pii: false },
  t_erp_owner_submission_evidence_uri_contract: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch15 evidence URI contract已生成', retention: '5年', pii: false },
  t_erp_owner_submission_release_acceptance_matrix: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch15 release acceptance matrix已生成', retention: '5年', pii: false },
  t_erp_owner_submission_escalation_queue: { layer: 'app', scope: 'hybrid', sensitivity: 'L3-机密', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 72, freshness: 'Batch15 escalation queue已生成', retention: '5年', pii: false },
  t_erp_owner_submission_synthetic_record: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 65, freshness: 'Batch16 synthetic owner records已生成', retention: '90天', pii: false },
  t_erp_owner_submission_synthetic_fixture_index: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 65, freshness: 'Batch16 synthetic fixture index已生成', retention: '90天', pii: false },
  t_erp_owner_submission_synthetic_record_fill_audit: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 65, freshness: 'Batch16 synthetic record fill audit已生成', retention: '90天', pii: false },
  t_erp_owner_submission_synthetic_gate_plan: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 65, freshness: 'Batch16 synthetic gate plan已生成', retention: '90天', pii: false },
  t_erp_owner_submission_synthetic_pipeline_run_matrix: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 65, freshness: 'Batch17 synthetic pipeline run matrix已生成', retention: '90天', pii: false },
  t_erp_owner_submission_synthetic_release_gate_matrix: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 65, freshness: 'Batch17 synthetic release gate matrix已生成', retention: '90天', pii: false },
  t_erp_owner_submission_synthetic_boundary_audit: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 65, freshness: 'Batch17 synthetic boundary audit已生成', retention: '90天', pii: false },
  t_erp_owner_real_submission_field_checklist: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 66, freshness: 'Batch18 real owner field checklist已生成', retention: '180天', pii: false },
  t_erp_owner_real_submission_release_gate_checklist: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 66, freshness: 'Batch18 real owner release gate checklist已生成', retention: '180天', pii: false },
  t_erp_owner_real_submission_swap_runbook: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 66, freshness: 'Batch18 real owner swap runbook已生成', retention: '180天', pii: false },
  t_erp_owner_real_submission_boundary_audit: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'pending', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 66, freshness: 'Batch18 real owner boundary audit已生成', retention: '180天', pii: false },
  t_erp_manual_release_review_record: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 88, freshness: 'Batch19 manual release review已记录', retention: '5年', pii: false, sourceIds: erpGovernanceSourceIds },
  t_erp_manual_release_review_decision_matrix: { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 88, freshness: 'Batch19 decision matrix已生成', retention: '5年', pii: false, sourceIds: erpGovernanceSourceIds },
  t_erp_manual_release_review_swap_queue: { layer: 'app', scope: 'hybrid', sensitivity: 'L2-内部', status: 'governed', owner: '数据治理组', steward: '数据产品', qualityScore: 86, freshness: 'Batch19 site data swap queue已生成', retention: '5年', pii: false, sourceIds: erpGovernanceSourceIds },
  t_erp_manual_release_review_boundary_audit: { layer: 'app', scope: 'internal', sensitivity: 'L2-内部', status: 'governed', owner: '数据治理组', steward: '业务数据Owner', qualityScore: 90, freshness: 'Batch19 boundary audit已通过', retention: '5年', pii: false, sourceIds: erpGovernanceSourceIds },
};

// R21: 数据变更历史日志 — 样例治理操作审计，不代表真实数据刷新
const changeHistory = [
  { date: '样例记录', tableId: 't_persona', action: '待接入', user: '用户研究组', desc: '用户画像需由人工凭证或CRM连接器确认', before: '未确认', after: '凭证待接入' },
  { date: '样例记录', tableId: 't_consumer_iv', action: '待接入', user: '用户研究组', desc: '消费者访谈需导入原始访谈记录', before: '未确认', after: '访谈凭证待接入' },
  { date: '样例记录', tableId: 't_porter', action: '待复核', user: '战略部', desc: '波特五力评估需人工复核', before: '旧评估', after: '人工评估待复核' },
  { date: '样例记录', tableId: 't_mkt_size', action: '复核', user: '市场分析组', desc: '市场规模随半月manifest复核，不伪造快照日期', before: '静态样例', after: '半月manifest复核' },
  { date: '样例记录', tableId: 't_comp_product', action: '排队', user: '系统', desc: 'Amazon竞品价格半月复核任务，连接器待接入', before: '-', after: '待复核记录' },
  { date: '样例记录', tableId: 't_comment', action: '待接入', user: '用户研究组', desc: '评论情感NLP需VOC凭证或连接器输入', before: '未确认', after: 'VOC凭证待接入' },
  { date: '样例记录', tableId: 't_customs', action: '待接入', user: '供应链组', desc: '海关数据需凭证或连接器导入', before: '未确认', after: '海关凭证待接入' },
  { date: '样例记录', tableId: 't_policy', action: '复核', user: '合规组', desc: '政策信息按公开来源半月复核', before: '公开页', after: '公开来源复核中' },
  { date: '样例记录', tableId: 't_social', action: '待接入', user: '社媒组', desc: '社媒声量需平台API或授权连接器', before: '未确认', after: '连接器待接入' },
  { date: '样例记录', tableId: 't_rfm', action: '待接入', user: 'CRM组', desc: 'RFM模型需CRM连接器输入', before: '未确认', after: 'CRM待接入' },
  { date: '样例记录', tableId: 't_price', action: '待接入', user: '定价组', desc: 'Amazon价格需授权连接器，不使用公开页替代', before: '未确认', after: '连接器待接入' },
  { date: '样例记录', tableId: 't_web_review', action: '待接入', user: '爬虫组', desc: '网页评论需凭证、授权爬虫或VOC流程接入', before: '未确认', after: '网页评论凭证待接入' },
  { date: '样例记录', tableId: 't_own_product', action: '待接入', user: '产品组', desc: '自有SKU和库存需ERP凭证输入', before: '未确认', after: 'ERP待接入' },
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
    sourceIds: dataCatalogSourceIds,

    tables: [
      {
        id: 't_mkt_size', name: 'market_size_global', desc: '全球婴童/吸奶器市场规模（市场层级与份额分母公开报告口径）',
        updateFreq: '季度',
        upstream: ['Grand View Research', 'Precedence Research', 'Fortune Business Insights'],
        downstream: ['market_trend', 'competitive_landscape'],
        fields: [
          { name: 'scope', type: 'VARCHAR(50)', desc: '口径层级（upper_tam/category_tam/segment_tam/region_share/serviceable_market）', source: '公开研报', required: true },
          { name: 'region', type: 'VARCHAR(50)', desc: '区域（global/北美/非北美合计等）', source: '公开研报或派生', required: true },
          { name: 'category', type: 'VARCHAR(80)', desc: '品类（全球婴童用品/全球吸奶器/穿戴式吸奶器）', source: '公开研报', required: true },
          { name: 'market_size_usd_m', type: 'DECIMAL(12,2)', desc: '市场规模，百万美元', source: 'Grand View Research / Precedence Research / Fortune BI', required: true },
          { name: 'share_pct', type: 'DECIMAL(5,2)', desc: '区域或口径份额 %，仅已复核项填写', source: 'Fortune BI或派生计算', required: false },
          { name: 'cagr_pct', type: 'DECIMAL(5,2)', desc: '年复合增长率 %', source: '公开研报', required: true },
          { name: 'year', type: 'INT', desc: '统计年份', source: '外部研报', required: true },
          { name: 'forecast_to', type: 'INT', desc: '预测截止年份', source: '外部研报', required: true },
          { name: 'source_id', type: 'VARCHAR(20)', desc: '来源登记ID（ds-001/ds-002/ds-044/ds-045）', source: 'source-registry', required: true },
          { name: 'created_at', type: 'TIMESTAMP', desc: '数据入库时间', source: '系统', required: true },
        ],
      },
      {
        id: 't_mkt_trend', name: 'market_trend_monthly', desc: '月度公开兴趣趋势与ERP内部销量代理治理表',
        updateFreq: '月度', upstream: ['Wikimedia Pageviews API', 'Amazon/Vendor Central待授权', 'ERP电商销售统计导出', 'ERP售后销量统计导出', 'ERP零售与渠道UI分页采集'], downstream: ['dashboard_kpi'],
        fields: [
          { name: 'month', type: 'DATE', desc: '月份（YYYY-MM）', source: 'Wikimedia Pageviews API', required: true },
          { name: 'trend_type', type: 'VARCHAR(50)', desc: '趋势类型（public_interest/erp_internal_units_proxy/gmv/units）', source: '采集任务', required: true },
          { name: 'region', type: 'VARCHAR(50)', desc: '区域；公开兴趣代理为global', source: '采集任务', required: true },
          { name: 'category', type: 'VARCHAR(50)', desc: '品类；当前公开代理为Breast pump', source: '采集任务', required: true },
          { name: 'interest_index', type: 'DECIMAL(6,2)', desc: '公开兴趣指数，完整月峰值=100', source: 'Wikimedia Pageviews API', required: true },
          { name: 'pageviews', type: 'INT', desc: '页面月浏览量', source: 'Wikimedia Pageviews API', required: true },
          { name: 'is_partial_month', type: 'BOOLEAN', desc: '是否非完整月', source: '计算字段', required: true },
          { name: 'gmv_usd_m', type: 'DECIMAL(10,2)', desc: '月度GMV（百万美元），待授权后填写', source: 'Amazon/Vendor Central或ERP', required: false },
          { name: 'units_k', type: 'INT', desc: '销量（千件）；ERP当前仅为private/internal代理，待字段字典和展示审批后填写正式值', source: 'Amazon/Vendor Central或ERP', required: false },
          { name: 'asp_usd', type: 'DECIMAL(8,2)', desc: '平均售价（美元），待授权后填写', source: '计算字段', required: false },
          { name: 'mom_pct', type: 'DECIMAL(5,2)', desc: '环比增速 %', source: '计算字段', required: false },
          { name: 'yoy_pct', type: 'DECIMAL(5,2)', desc: '同比增速 %', source: '计算字段', required: false },
          { name: 'source_id', type: 'VARCHAR(20)', desc: '来源登记ID（ds-046/ds-047/ds-048/ds-049或授权来源ID）', source: 'source-registry', required: true },
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
    sourceIds: dataCatalogSourceIds,

    tables: [
      {
        id: 't_comp_product', name: 'competitor_products', desc: '竞品产品数据库（Amazon连接器待接入）',
        updateFreq: '半月复核', upstream: ['<span className="text-[#B5AFA8]">Amazon.com</span>'], downstream: ['new_product_tracker', 'price_analysis'],
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
    sourceIds: dataCatalogSourceIds,

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
    sourceIds: dataCatalogSourceIds,
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
    sourceIds: dataCatalogSourceIds,
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
    id: 'erp', name: 'ERP内部经营数据', icon: HardDrive, color: '#0A84FF', page: '/data',
    desc: 'ERP/BI内部经营数据治理层，沉淀source artifact、SKU维表、月度事实、目标达成、库存快照、字段字典、品类映射和Batch19 release review；已放行项按private/internal proxy展示',
    sourceIds: dataCatalogSourceIds,
    tables: [
      {
        id: 't_erp_artifact', name: 'erp_source_artifacts', desc: 'ERP导出与只读采集证据总账',
        updateFreq: '每次采集', upstream: ['ERP导出', 'ERP UI只读采集', 'BI只读报告'], downstream: ['source_registry', 'erp_sales_monthly_fact', 'erp_retail_channel_monthly_fact'],
        fields: [
          { name: 'source_id', type: 'VARCHAR(20)', desc: 'source registry ID，如ds-047/ds-048/ds-049/ds-050/ds-051', source: 'source-registry', required: true },
          { name: 'source_path', type: 'VARCHAR(300)', desc: 'ERP/BI菜单路径，不保存含session的完整URL', source: 'ERP只读采集', required: true },
          { name: 'artifact_path', type: 'VARCHAR(500)', desc: '本地证据路径，默认位于tmp/exports或tmp/audits', source: '采集任务', required: true },
          { name: 'sha256', type: 'VARCHAR(64)', desc: '原始文件或CSV哈希', source: '采集任务', required: false },
          { name: 'row_count', type: 'INT', desc: '采集行数或导出行数', source: '采集任务', required: false },
          { name: 'captured_at', type: 'TIMESTAMP', desc: '采集时间', source: '系统', required: true },
          { name: 'privacy_level', type: 'VARCHAR(30)', desc: 'public/private/internal/sensitive/secret', source: 'source-registry', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '是否可作为页面事实展示；Batch19放行项为true，未放行ERP来源仍保持false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_sku', name: 'erp_product_sku_dim', desc: 'ERP SKU与产品hash维表；Batch2仅沉淀pseudonymized字段',
        updateFreq: '月度', upstream: ['ds-049', 'tmp/exports/erp-derived-batch2-20260625/erp_product_sku_dim.csv'], downstream: ['momcozy_products', 'category_analysis', 'comment_analysis_ai'],
        fields: [
          { name: 'sku_hash', type: 'VARCHAR(64)', desc: '带命名空间的SKU哈希；不展示原始SKU', source: 'Batch2派生脚本', required: true },
          { name: 'product_name_hash', type: 'VARCHAR(64)', desc: '产品名称哈希；不展示原始产品名', source: 'Batch2派生脚本', required: true },
          { name: 'category_proxy', type: 'VARCHAR(120)', desc: '关键词品类代理，如breast_pump_keyword_proxy', source: 'Batch2派生脚本', required: true },
          { name: 'mapped_page_category', type: 'VARCHAR(120)', desc: '映射到的页面路径，如/market/mtl', source: 'erp_category_mapping', required: true },
          { name: 'raw_row_count', type: 'INT', desc: '该hash在零售导出中的行覆盖', source: 'ds-049', required: true },
          { name: 'total_visible_proxy_units', type: 'INT', desc: '可见月度列代理量合计；不是GMV或市场销量', source: 'ds-049', required: true },
          { name: 'has_customer_field', type: 'BOOLEAN', desc: '原始导出是否含客户字段；字段值不入库展示', source: 'Batch2隐私检查', required: true },
          { name: 'has_operator_field', type: 'BOOLEAN', desc: '原始导出是否含运营字段；字段值不入库展示', source: 'Batch2隐私检查', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前true，Batch19放行为internal proxy；不代表公开SKU事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_sales_monthly', name: 'erp_sales_monthly_fact', desc: 'ERP销售统计月度内部代理事实表',
        updateFreq: '月度', upstream: ['ds-047', 'private/internal proxy artifact: tmp/exports/erp-derived-batch2-20260625/erp_sales_monthly_fact.csv'], downstream: ['market_trend_monthly', 'category_analysis', 'channel_performance', 'dashboard_kpi'],
        fields: [
          { name: 'month', type: 'DATE', desc: '月份', source: 'ERP销售统计导出', required: true },
          { name: 'fact_table', type: 'VARCHAR(80)', desc: '事实表标识，固定为erp_sales_monthly_fact', source: 'Batch2派生脚本', required: true },
          { name: 'category_proxy', type: 'VARCHAR(120)', desc: 'all_products或breast_pump_keyword_proxy', source: 'Batch2派生脚本', required: true },
          { name: 'proxy_units', type: 'INT', desc: '销量样式字段的内部代理值，待字段字典确认', source: 'ds-047', required: true },
          { name: 'index_peak_100', type: 'DECIMAL(8,2)', desc: '导出窗口峰值归一指数', source: 'Batch2派生脚本', required: false },
          { name: 'mom_pct', type: 'DECIMAL(8,2)', desc: '环比代理变化；不是外部市场增长率', source: 'Batch2派生脚本', required: false },
          { name: 'matched_data_rows', type: 'INT', desc: '参与该代理计算的原始行数', source: 'ds-047', required: true },
          { name: 'source_id', type: 'VARCHAR(20)', desc: 'ds-047或授权快照ID', source: 'source-registry', required: true },
          { name: 'evidence_grade', type: 'VARCHAR(40)', desc: '证据等级', source: 'source-registry', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前true，Batch19放行为internal proxy；不代表GMV或市场份额', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_after_sales_monthly', name: 'erp_after_sales_monthly_fact', desc: 'ERP售后销量月度内部代理事实表',
        updateFreq: '月度', upstream: ['ds-048', 'private/internal proxy artifact: tmp/exports/erp-derived-batch2-20260625/erp_after_sales_monthly_fact.csv'], downstream: ['comment_analysis_ai', 'category_analysis', 'market_trend_monthly'],
        fields: [
          { name: 'month', type: 'DATE', desc: '月份', source: 'ERP售后销量统计导出', required: true },
          { name: 'fact_table', type: 'VARCHAR(80)', desc: '事实表标识，固定为erp_after_sales_monthly_fact', source: 'Batch2派生脚本', required: true },
          { name: 'category_proxy', type: 'VARCHAR(120)', desc: 'all_products或breast_pump_keyword_proxy', source: 'Batch2派生脚本', required: true },
          { name: 'proxy_units', type: 'INT', desc: '售后销量样式字段内部代理值', source: 'ds-048', required: true },
          { name: 'index_peak_100', type: 'DECIMAL(8,2)', desc: '导出窗口峰值归一指数', source: 'Batch2派生脚本', required: false },
          { name: 'mom_pct', type: 'DECIMAL(8,2)', desc: '环比代理变化；不是售后率', source: 'Batch2派生脚本', required: false },
          { name: 'matched_data_rows', type: 'INT', desc: '参与该代理计算的原始行数', source: 'ds-048', required: true },
          { name: 'source_id', type: 'VARCHAR(20)', desc: 'ds-048或授权快照ID', source: 'source-registry', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前true，Batch19放行为internal proxy；不代表售后率', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_retail_channel_monthly', name: 'erp_retail_channel_monthly_fact', desc: 'ERP零售与渠道月度内部代理事实表',
        updateFreq: '月度', upstream: ['ds-049', 'tmp/exports/erp-derived-batch2-20260625/erp_retail_channel_monthly_fact.csv'], downstream: ['channel_performance', 'store_interviews', 'region_competitive_landscape'],
        fields: [
          { name: 'month', type: 'DATE', desc: '月份', source: 'ERP零售与渠道UI分页采集', required: true },
          { name: 'fact_table', type: 'VARCHAR(80)', desc: '事实表标识，固定为erp_retail_channel_monthly_fact', source: 'Batch2派生脚本', required: true },
          { name: 'category_proxy', type: 'VARCHAR(120)', desc: 'all_products或breast_pump_keyword_proxy', source: 'Batch2派生脚本', required: true },
          { name: 'proxy_units', type: 'INT', desc: '可见月度销量列代理值', source: 'ds-049', required: true },
          { name: 'index_peak_100', type: 'DECIMAL(8,2)', desc: '导出窗口峰值归一指数', source: 'Batch2派生脚本', required: false },
          { name: 'mom_pct', type: 'DECIMAL(8,2)', desc: '环比代理变化；不是外部渠道增速', source: 'Batch2派生脚本', required: false },
          { name: 'matched_data_rows', type: 'INT', desc: '参与该代理计算的原始行数', source: 'ds-049', required: true },
          { name: 'source_id', type: 'VARCHAR(20)', desc: 'ds-049或授权快照ID', source: 'source-registry', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前true，Batch19放行为internal proxy；小计差异保留为口径说明', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_channel_growth', name: 'erp_channel_growth_snapshot', desc: 'ERP/BI全渠道增长只读聚合快照；Batch3仅沉淀YTD numerator',
        updateFreq: '月度', upstream: ['ds-050', 'private/internal proxy artifact: tmp/exports/erp-derived-batch3-20260625/erp_channel_growth_snapshot.csv'], downstream: ['channel_performance', 'self_insight', 'region_competitive_landscape'],
        fields: [
          { name: 'period', type: 'VARCHAR(40)', desc: '统计期间，当前为2026-ytd-readonly-observed', source: 'Batch3派生脚本', required: true },
          { name: 'snapshot_type', type: 'VARCHAR(80)', desc: '快照类型，固定为all_channel_growth_snapshot', source: 'Batch3派生脚本', required: true },
          { name: 'actual_sales_cny', type: 'DECIMAL(14,2)', desc: '只读聚合实际销售额人民币；Batch19 private/internal proxy', source: 'ds-050', required: false },
          { name: 'sales_growth_pct', type: 'DECIMAL(8,2)', desc: '只读聚合销售增长率；非市场增长率', source: 'ds-050', required: false },
          { name: 'actual_sales_usd', type: 'DECIMAL(14,2)', desc: '只读聚合实际销售额美元；非公开市场规模', source: 'ds-050', required: false },
          { name: 'actual_units', type: 'INT', desc: '只读聚合销量；非市场销量或份额分母', source: 'ds-050', required: false },
          { name: 'source_id', type: 'VARCHAR(20)', desc: 'ds-050或授权快照ID', source: 'source-registry', required: true },
          { name: 'evidence_grade', type: 'VARCHAR(40)', desc: 'L3-production-read-only', source: 'source-registry', required: true },
          { name: 'privacy_level', type: 'VARCHAR(30)', desc: 'private/internal', source: 'source-registry', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前true，仅作为内部numerator proxy；不可作为公开事实或TAM/SAM/SOM', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_channel_target', name: 'erp_channel_target_attainment', desc: 'ERP/BI全渠道目标达成事实表',
        updateFreq: '月度', upstream: ['ds-050', 'ds-051', 'private/internal proxy artifact: tmp/exports/erp-derived-batch3-20260625/erp_channel_target_attainment.csv'], downstream: ['channel_performance', 'ReportsPage', 'dashboard_kpi'],
        fields: [
          { name: 'period', type: 'VARCHAR(40)', desc: '统计期间，当前为2026-ytd-readonly-observed', source: 'Batch3派生脚本', required: true },
          { name: 'snapshot_type', type: 'VARCHAR(80)', desc: '快照类型，固定为all_channel_target_attainment', source: 'Batch3派生脚本', required: true },
          { name: 'sales_attainment_pct', type: 'DECIMAL(8,2)', desc: '销售额达成率；只读聚合', source: 'ds-051', required: false },
          { name: 'units_attainment_pct', type: 'DECIMAL(8,2)', desc: '销量达成率；只读聚合', source: 'ds-051', required: false },
          { name: 'actual_sales_cny', type: 'DECIMAL(14,2)', desc: '实际销售额人民币；Batch19 private/internal proxy', source: 'ds-051或授权导出', required: false },
          { name: 'target_sales_cny', type: 'DECIMAL(14,2)', desc: '目标销售额人民币；Batch19 private/internal proxy', source: 'ds-051或授权导出', required: false },
          { name: 'actual_sales_usd', type: 'DECIMAL(14,2)', desc: '实际销售额美元；非公开市场规模', source: 'ds-051或授权导出', required: false },
          { name: 'actual_units', type: 'INT', desc: '实际销量；非市场销量或份额分母', source: 'ds-051或授权导出', required: false },
          { name: 'target_units', type: 'INT', desc: '目标销量；Batch19 private/internal proxy', source: 'ds-051或授权导出', required: false },
          { name: 'source_id', type: 'VARCHAR(20)', desc: 'ds-050/ds-051或授权快照ID', source: 'source-registry', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前true，仅作为内部目标达成proxy；不可作为公开事实或TAM/SAM/SOM', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_channel_customer_dim', name: 'erp_channel_customer_dim', desc: 'ERP零售与渠道客户/目的仓/运营hash维表；Batch3仅沉淀pseudonymized字段',
        updateFreq: '月度', upstream: ['ds-049', 'private/internal proxy artifact: tmp/exports/erp-derived-batch3-20260625/erp_channel_customer_dim.csv'], downstream: ['channel_performance', 'channel_interviews', 'store_interviews', 'region_competitive_landscape'],
        fields: [
          { name: 'channel_customer_hash', type: 'VARCHAR(64)', desc: '客户名称hash；不展示原始客户名', source: 'Batch3派生脚本', required: true },
          { name: 'destination_warehouse_hash', type: 'VARCHAR(64)', desc: '目的仓hash；不展示原始仓库名', source: 'Batch3派生脚本', required: true },
          { name: 'operator_hash', type: 'VARCHAR(64)', desc: '运营字段hash；不展示原始人员或账号', source: 'Batch3派生脚本', required: false },
          { name: 'raw_row_count', type: 'INT', desc: '该hash组合在零售导出中的行覆盖', source: 'ds-049', required: true },
          { name: 'sku_hash_count', type: 'INT', desc: '该hash组合覆盖的SKU hash数量', source: 'ds-049', required: true },
          { name: 'visible_proxy_units', type: 'INT', desc: '可见月度列代理量合计；不是GMV、份额或市场销量', source: 'ds-049', required: true },
          { name: 'category_proxy_top', type: 'VARCHAR(120)', desc: '该hash组合的主要关键词品类代理', source: 'Batch3派生脚本', required: true },
          { name: 'source_id', type: 'VARCHAR(20)', desc: 'ds-049或授权快照ID', source: 'source-registry', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前true，Batch19放行为internal proxy；不展示客户排行或原始标识', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_inventory_snapshot', name: 'erp_inventory_snapshot', desc: 'ERP库存快照表',
        updateFreq: '日/周', upstream: ['ds-035', 'blocked readiness artifact: tmp/exports/erp-derived-batch3-20260625/erp_inventory_snapshot_readiness.csv'], downstream: ['supply_chain_nodes', 'dashboard_kpi'],
        fields: [
          { name: 'snapshot_date', type: 'DATE', desc: '快照日期；当前blocked_missing_inventory_export', source: 'ERP库存导出待授权', required: true },
          { name: 'warehouse_hash', type: 'VARCHAR(64)', desc: '仓库hash；当前未采集库存导出', source: 'ERP库存导出待授权', required: true },
          { name: 'sku_hash', type: 'VARCHAR(64)', desc: 'SKU hash；当前未采集库存导出', source: 'ERP库存导出待授权', required: true },
          { name: 'on_hand_units', type: 'INT', desc: '在库库存；当前仅登记字段readiness，不含数值', source: 'ds-035待授权导出', required: true },
          { name: 'available_units', type: 'INT', desc: '可用库存；当前仅登记字段readiness，不含数值', source: 'ds-035待授权导出', required: true },
          { name: 'reserved_units', type: 'INT', desc: '预占库存；当前仅登记字段readiness，不含数值', source: 'ds-035待授权导出', required: false },
          { name: 'frozen_units', type: 'INT', desc: '冻结库存；当前仅登记字段readiness，不含数值', source: 'ds-035待授权导出', required: false },
          { name: 'in_transit_units', type: 'INT', desc: '在途库存；当前仅登记字段readiness，不含数值', source: 'ds-035待授权导出', required: false },
          { name: 'defective_units', type: 'INT', desc: '不良品库存；当前仅登记字段readiness，不含数值', source: 'ds-035待授权导出', required: false },
          { name: 'readiness_status', type: 'VARCHAR(80)', desc: '当前blocked_missing_inventory_export', source: 'Batch3派生脚本', required: true },
          { name: 'inventory_policy_version', type: 'VARCHAR(80)', desc: '库存口径版本；当前blocked_missing_inventory_export', source: 'Batch3派生脚本', required: true },
          { name: 'source_id', type: 'VARCHAR(20)', desc: '授权库存快照ID；当前仅为blocked readiness登记，can_display_as_fact=false', source: 'source-registry', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，未授权导出前不得展示库存事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_field_dictionary', name: 'erp_field_dictionary', desc: 'ERP字段字典与单位口径表',
        updateFreq: '字段变更时', upstream: ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051', 'tmp/exports/erp-governance-batch7-20260625/erp_field_dictionary_readiness.csv'], downstream: ['全部ERP事实表', 'erp_field_owner_approval_packet', 'erp_display_approval_gate'],
        fields: [
          { name: 'source_id', type: 'VARCHAR(20)', desc: '来源ID', source: 'source-registry', required: true },
          { name: 'table_name', type: 'VARCHAR(120)', desc: 'ERP源表或页面', source: 'ERP字段字典', required: true },
          { name: 'field_name', type: 'VARCHAR(120)', desc: '原始字段名', source: 'ERP字段字典', required: true },
          { name: 'business_meaning', type: 'TEXT', desc: '业务含义', source: '人工复核', required: true },
          { name: 'unit', type: 'VARCHAR(40)', desc: '单位，如件/金额/百分比', source: '人工复核', required: true },
          { name: 'currency', type: 'VARCHAR(20)', desc: '币种，仅金额字段填写', source: '人工复核', required: false },
          { name: 'hidden_column_behavior', type: 'TEXT', desc: '隐藏列、小计、周边界等行为说明', source: '人工复核', required: false },
          { name: 'review_status', type: 'VARCHAR(80)', desc: '当前needs-data-owner-review', source: 'Batch7治理脚本', required: true },
          { name: 'dictionary_status', type: 'VARCHAR(120)', desc: '当前blocked_missing_authorized_field_dictionary', source: 'Batch7治理脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，字段字典未审批前不可展示事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_category_mapping', name: 'erp_category_mapping', desc: 'ERP产品到页面品类的治理映射表；Batch2为关键词代理',
        updateFreq: '月度', upstream: ['erp_product_sku_dim', 'tmp/exports/erp-derived-batch2-20260625/erp_category_mapping.csv'], downstream: ['erp_category_review_queue', 'market_trend_monthly', 'category_analysis', 'momcozy_products'],
        fields: [
          { name: 'category_proxy', type: 'VARCHAR(120)', desc: '关键词代理品类', source: 'Batch2派生脚本', required: true },
          { name: 'source_keyword_rule', type: 'VARCHAR(160)', desc: '关键词匹配规则版本', source: 'Batch2派生脚本', required: true },
          { name: 'mapped_page_category', type: 'VARCHAR(120)', desc: '映射到的页面路径', source: 'Batch2派生脚本', required: true },
          { name: 'sku_hash_count', type: 'INT', desc: '该代理下SKU hash数量', source: 'erp_product_sku_dim', required: true },
          { name: 'raw_row_count', type: 'INT', desc: '该代理覆盖的原始行数', source: 'ds-049', required: true },
          { name: 'visible_proxy_units', type: 'INT', desc: '可见月度代理量合计；不是市场销量', source: 'ds-049', required: true },
          { name: 'confidence', type: 'VARCHAR(20)', desc: 'low/medium/high；Batch2默认不超过medium', source: '映射任务', required: true },
          { name: 'review_status', type: 'VARCHAR(40)', desc: 'needs-review/approved/rejected', source: '品类管理人工复核', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前true，Batch19放行为关键词internal proxy；不作为外部品类事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_category_review_queue', name: 'erp_category_review_queue', desc: 'ERP关键词品类代理人工复核队列；Batch7仅生成待审任务',
        updateFreq: '月度/品类规则变更时', upstream: ['erp_category_mapping', 'tmp/exports/erp-governance-batch7-20260625/erp_category_review_queue.csv'], downstream: ['erp_category_owner_approval_packet', 'erp_display_approval_gate', 'category_analysis', 'momcozy_products'],
        fields: [
          { name: 'review_task_id', type: 'VARCHAR(160)', desc: '品类复核任务ID', source: 'Batch7治理脚本', required: true },
          { name: 'category_proxy', type: 'VARCHAR(120)', desc: '关键词代理品类', source: 'erp_category_mapping', required: true },
          { name: 'mapped_page_category', type: 'VARCHAR(120)', desc: '对应页面', source: 'erp_category_mapping', required: true },
          { name: 'priority', type: 'VARCHAR(20)', desc: '复核优先级，P0/P1', source: 'Batch7治理脚本', required: true },
          { name: 'reviewer_role', type: 'TEXT', desc: '所需复核角色', source: '证据门禁', required: true },
          { name: 'approval_status', type: 'VARCHAR(60)', desc: '当前not_approved', source: '人工复核', required: true },
          { name: 'acceptance_criteria', type: 'TEXT', desc: '通过标准：taxonomy规则、抽样SKU hash、未映射处理和展示范围', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_subtotal_reconciliation_queue', name: 'erp_subtotal_reconciliation_queue', desc: 'ERP小计、可见月度列、周边界或隐藏列复核队列',
        updateFreq: '每次ERP导出/字段字典变更', upstream: ['ds-047', 'ds-048', 'ds-049', 'tmp/exports/erp-governance-batch7-20260625/erp_subtotal_reconciliation_queue.csv'], downstream: ['erp_subtotal_owner_explanation_packet', 'erp_display_approval_gate', 'market_trend_monthly', 'erp_retail_channel_monthly_fact'],
        fields: [
          { name: 'reconciliation_id', type: 'VARCHAR(160)', desc: '复核项ID', source: 'Batch7治理脚本', required: true },
          { name: 'source_id', type: 'VARCHAR(20)', desc: 'ERP来源ID', source: 'source-registry', required: true },
          { name: 'affected_table', type: 'VARCHAR(120)', desc: '受影响治理表', source: 'Batch7治理脚本', required: true },
          { name: 'observed_delta_units', type: 'INT', desc: '已观察到的小计差异代理量；仅用于复核，不展示为事实', source: 'Batch7治理脚本', required: true },
          { name: 'reconciliation_status', type: 'VARCHAR(120)', desc: '复核状态', source: 'Batch7治理脚本', required: true },
          { name: 'next_evidence', type: 'TEXT', desc: '提升证据所需材料', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_display_approval_gate', name: 'erp_display_approval_gate', desc: 'ERP内部经营数据页面展示与CSV导出审批门禁',
        updateFreq: '发布/导出前', upstream: ['erp_field_dictionary', 'erp_category_review_queue', 'erp_subtotal_reconciliation_queue', 'tmp/exports/erp-governance-batch7-20260625/erp_display_approval_gate.csv'], downstream: ['erp_display_approval_record_template', 'erp_owner_approval_backlog', 'MarketPage', 'CategoryAnalysis', 'SelfInsight', 'ReportsPage', 'CSV exports'],
        fields: [
          { name: 'approval_gate_id', type: 'VARCHAR(160)', desc: '展示审批门禁ID', source: 'Batch7治理脚本', required: true },
          { name: 'table_name', type: 'VARCHAR(120)', desc: '受控表名', source: 'Batch7治理脚本', required: true },
          { name: 'surface', type: 'VARCHAR(200)', desc: '使用页面或能力面', source: 'Batch7治理脚本', required: true },
          { name: 'required_reviews', type: 'TEXT', desc: '所需审批：字段字典、品类/隐私/业务owner', source: '证据门禁', required: true },
          { name: 'approval_status', type: 'VARCHAR(60)', desc: '当前not_approved', source: '人工审批', required: true },
          { name: 'allowed_display', type: 'TEXT', desc: '允许展示的gate元数据', source: '证据门禁', required: true },
          { name: 'forbidden_display', type: 'TEXT', desc: '禁止展示的经营事实或敏感标识', source: '证据门禁', required: true },
          { name: 'can_export', type: 'BOOLEAN', desc: '当前false，未审批不可进入正式CSV导出', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_field_owner_approval_packet', name: 'erp_field_owner_approval_packet', desc: 'ERP字段字典owner审批包；Batch8仅生成待填写审批包',
        updateFreq: '字段变更/发布前', upstream: ['erp_field_dictionary', 'tmp/exports/erp-owner-approval-batch8-20260625/erp_field_owner_approval_packet.csv'], downstream: ['erp_owner_approval_backlog', 'erp_display_approval_record_template'],
        fields: [
          { name: 'approval_packet_id', type: 'VARCHAR(180)', desc: '字段owner审批包ID', source: 'Batch8审批脚本', required: true },
          { name: 'source_id', type: 'VARCHAR(20)', desc: 'ERP来源ID', source: 'source-registry', required: true },
          { name: 'table_name', type: 'VARCHAR(120)', desc: '受控ERP表', source: 'Batch7字段字典readiness', required: true },
          { name: 'owner_role', type: 'TEXT', desc: '需审批的业务owner角色', source: '证据门禁', required: true },
          { name: 'field_count', type: 'INT', desc: '该source/table下待审批字段数量', source: 'Batch8审批脚本', required: true },
          { name: 'editable_decision_fields', type: 'TEXT', desc: 'owner需填写的审批字段', source: '证据门禁', required: true },
          { name: 'approval_status', type: 'VARCHAR(80)', desc: '当前pending_owner_record', source: 'Batch8审批脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，未审批前不可升级事实展示', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_category_owner_approval_packet', name: 'erp_category_owner_approval_packet', desc: 'ERP品类taxonomy owner审批包；Batch8仅生成待填写审批包',
        updateFreq: '月度/品类规则变更时', upstream: ['erp_category_review_queue', 'tmp/exports/erp-owner-approval-batch8-20260625/erp_category_owner_approval_packet.csv'], downstream: ['erp_owner_approval_backlog', 'erp_display_approval_record_template', 'category_analysis'],
        fields: [
          { name: 'approval_packet_id', type: 'VARCHAR(180)', desc: '品类owner审批包ID', source: 'Batch8审批脚本', required: true },
          { name: 'category_proxy', type: 'VARCHAR(120)', desc: '关键词代理品类', source: 'Batch7品类复核队列', required: true },
          { name: 'mapped_page_category', type: 'VARCHAR(120)', desc: '映射页面', source: 'Batch7品类复核队列', required: true },
          { name: 'required_decision', type: 'TEXT', desc: 'approve_or_reject_taxonomy_rule_and_unmapped_handling', source: '证据门禁', required: true },
          { name: 'editable_decision_fields', type: 'TEXT', desc: 'taxonomy rule、抽样SKU hash复核、展示范围等待填字段', source: '证据门禁', required: true },
          { name: 'approval_status', type: 'VARCHAR(80)', desc: '当前pending_owner_record', source: 'Batch8审批脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_subtotal_owner_explanation_packet', name: 'erp_subtotal_owner_explanation_packet', desc: 'ERP小计/隐藏列/周边界解释审批包；Batch8仅生成待填写审批包',
        updateFreq: '每次ERP导出/字段字典变更', upstream: ['erp_subtotal_reconciliation_queue', 'tmp/exports/erp-owner-approval-batch8-20260625/erp_subtotal_owner_explanation_packet.csv'], downstream: ['erp_owner_approval_backlog', 'erp_display_approval_record_template', 'market_trend_monthly'],
        fields: [
          { name: 'approval_packet_id', type: 'VARCHAR(180)', desc: '小计解释审批包ID', source: 'Batch8审批脚本', required: true },
          { name: 'reconciliation_id', type: 'VARCHAR(160)', desc: 'Batch7小计复核项ID', source: 'Batch7小计队列', required: true },
          { name: 'source_id', type: 'VARCHAR(20)', desc: 'ERP来源ID', source: 'source-registry', required: true },
          { name: 'observed_delta_units', type: 'INT', desc: '已观察小计差异代理量，仅用于审批说明，不展示事实', source: 'Batch7治理脚本', required: true },
          { name: 'editable_decision_fields', type: 'TEXT', desc: '官方小计公式、隐藏列行为、周边界、审批决定等待填字段', source: '证据门禁', required: true },
          { name: 'approval_status', type: 'VARCHAR(80)', desc: '当前pending_owner_record', source: 'Batch8审批脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_display_approval_record_template', name: 'erp_display_approval_record_template', desc: 'ERP表到页面/CSV导出展示审批记录模板；Batch8未应用真实审批',
        updateFreq: '发布/导出前', upstream: ['erp_display_approval_gate', 'tmp/exports/erp-owner-approval-batch8-20260625/erp_display_approval_record_template.csv'], downstream: ['erp_owner_approval_backlog', 'market_trend_monthly', 'dashboard_kpi', 'CSV exports'],
        fields: [
          { name: 'approval_record_id', type: 'VARCHAR(180)', desc: '展示审批记录ID', source: 'Batch8审批脚本', required: true },
          { name: 'table_name', type: 'VARCHAR(120)', desc: '受控表名', source: 'Batch7展示门禁', required: true },
          { name: 'surface', type: 'VARCHAR(200)', desc: '页面或能力面', source: 'Batch7展示门禁', required: true },
          { name: 'approval_decision', type: 'VARCHAR(80)', desc: '当前pending', source: 'Batch8审批模板', required: true },
          { name: 'approver_name_hash', type: 'VARCHAR(64)', desc: '审批人hash；当前为空，未写真实个人信息', source: '人工审批待填', required: false },
          { name: 'approval_record_uri', type: 'TEXT', desc: '审批记录URI；当前为空', source: '人工审批待填', required: false },
          { name: 'can_export', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_backlog', name: 'erp_owner_approval_backlog', desc: 'ERP字段、品类、小计、展示审批统一backlog；Batch8仅为待办总账',
        updateFreq: '每次审批包生成/审批记录变更', upstream: ['erp_field_owner_approval_packet', 'erp_category_owner_approval_packet', 'erp_subtotal_owner_explanation_packet', 'erp_display_approval_record_template', 'tmp/exports/erp-owner-approval-batch8-20260625/erp_owner_approval_backlog.csv'], downstream: ['erp_owner_approval_record_input_template', 'erp_owner_approval_validation_result', 'data_governance', 'release_gate', 'market_trend_monthly', 'dashboard_kpi'],
        fields: [
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: '审批backlog项ID', source: 'Batch8审批脚本', required: true },
          { name: 'approval_lane', type: 'VARCHAR(120)', desc: '审批lane：字段/品类/小计/展示', source: 'Batch8审批脚本', required: true },
          { name: 'owner_role', type: 'TEXT', desc: '需处理角色', source: '证据门禁', required: true },
          { name: 'priority', type: 'VARCHAR(20)', desc: '优先级', source: 'Batch8审批脚本', required: true },
          { name: 'current_status', type: 'VARCHAR(120)', desc: '当前pending或missing owner record', source: 'Batch8审批脚本', required: true },
          { name: 'required_evidence', type: 'TEXT', desc: '升级证据所需材料', source: '证据门禁', required: true },
          { name: 'editable_packet', type: 'VARCHAR(160)', desc: 'owner应填写的审批包文件', source: 'Batch8审批脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；全部backlog闭合前不得升级事实展示', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_intake_contract', name: 'erp_owner_approval_intake_contract', desc: 'ERP owner approval intake 合同；定义必填字段、decision vocab 和 fail-closed 规则',
        updateFreq: '审批流程变更时', upstream: ['erp_owner_approval_backlog', 'tmp/exports/erp-owner-approval-intake-batch9-20260626/erp_owner_approval_intake_contract.csv'], downstream: ['erp_owner_approval_record_input_template', 'erp_owner_approval_required_evidence_matrix', 'erp_owner_approval_validation_result'],
        fields: [
          { name: 'approval_lane', type: 'VARCHAR(120)', desc: '字段、品类、小计或展示审批lane', source: 'Batch9 intake脚本', required: true },
          { name: 'required_record_key', type: 'VARCHAR(80)', desc: '审批记录主键，当前为approval_item_id', source: 'Batch9 intake脚本', required: true },
          { name: 'required_fields', type: 'TEXT', desc: '真实审批记录必须包含的字段集合', source: '证据门禁', required: true },
          { name: 'decision_vocab', type: 'TEXT', desc: '允许的审批结论：approved/denied/needs_revision', source: '证据门禁', required: true },
          { name: 'promotion_rule', type: 'TEXT', desc: '升级所需规则；当前仍需manual release review', source: '证据门禁', required: true },
          { name: 'fail_closed_rule', type: 'TEXT', desc: '缺失或不合法审批记录一律保持blocked', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_validation_result', name: 'erp_owner_approval_validation_result', desc: 'ERP owner approval intake 校验结果；Batch9默认无真实审批记录输入',
        updateFreq: '每次审批记录回填/校验', upstream: ['erp_owner_approval_backlog', 'erp_owner_approval_intake_contract', 'tmp/exports/erp-owner-approval-intake-batch9-20260626/erp_owner_approval_validation_result.csv'], downstream: ['erp_owner_approval_release_gate'],
        fields: [
          { name: 'validation_id', type: 'VARCHAR(220)', desc: '审批记录校验ID', source: 'Batch9 intake脚本', required: true },
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: '对应Batch8 backlog项', source: 'erp_owner_approval_backlog', required: true },
          { name: 'approval_record_present', type: 'BOOLEAN', desc: '审批记录是否存在；Batch19放行链路对应记录已存在', source: 'Batch9 intake脚本', required: true },
          { name: 'validation_status', type: 'VARCHAR(120)', desc: 'passed_owner_record_validation 或 blocked_missing_or_invalid_owner_record', source: 'Batch9 intake脚本', required: true },
          { name: 'validation_messages', type: 'TEXT', desc: '阻断原因或校验说明', source: '证据门禁', required: true },
          { name: 'can_promote', type: 'BOOLEAN', desc: '当前false，脚本不自动升级事实展示', source: '证据门禁', required: true },
          { name: 'can_display_as_fact_decision', type: 'BOOLEAN', desc: '当前false', source: '审批记录待填', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_release_gate', name: 'erp_owner_approval_release_gate', desc: 'ERP owner approval release gate；所有校验通过后仍需manual release review',
        updateFreq: '每次审批校验后', upstream: ['erp_owner_approval_validation_result', 'tmp/exports/erp-owner-approval-intake-batch9-20260626/erp_owner_approval_release_gate.csv'], downstream: ['erp_owner_approval_submission_readiness', 'erp_owner_approval_promotion_manifest', 'market_trend_monthly', 'dashboard_kpi', 'CSV exports'],
        fields: [
          { name: 'release_gate_id', type: 'VARCHAR(180)', desc: '表级发布门禁ID', source: 'Batch9 intake脚本', required: true },
          { name: 'table_name', type: 'VARCHAR(120)', desc: '受控表名', source: 'Batch8展示审批模板', required: true },
          { name: 'relevant_validation_rows', type: 'INT', desc: '关联校验项数量', source: 'Batch9 intake脚本', required: true },
          { name: 'passed_validation_rows', type: 'INT', desc: '通过校验项数量；Batch19放行链路已有通过项', source: 'Batch9 intake脚本', required: true },
          { name: 'release_status', type: 'VARCHAR(120)', desc: 'ready_for_manual_release_review 或 blocked_missing_valid_owner_records', source: 'Batch9 intake脚本', required: true },
          { name: 'required_next_step', type: 'TEXT', desc: '下一步：已放行项进入Batch19 swap queue；未放行项继续收集合法owner审批记录', source: '证据门禁', required: true },
          { name: 'can_export', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_promotion_manifest', name: 'erp_owner_approval_promotion_manifest', desc: 'ERP事实展示/导出升级候选清单；Batch9当前0行',
        updateFreq: 'manual release review后', upstream: ['erp_owner_approval_release_gate', 'tmp/exports/erp-owner-approval-intake-batch9-20260626/erp_owner_approval_promotion_manifest.csv'], downstream: ['release_gate', 'market_trend_monthly', 'dashboard_kpi', 'CSV exports'],
        fields: [
          { name: 'promotion_candidate_id', type: 'VARCHAR(220)', desc: '升级候选ID；当前无候选', source: 'Batch9 intake脚本', required: true },
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: '来源审批项ID', source: 'Batch9 intake脚本', required: true },
          { name: 'promotion_status', type: 'VARCHAR(120)', desc: '当前无候选；未来也需manual_release_review_required', source: '证据门禁', required: true },
          { name: 'can_export', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
          { name: 'blocking_reason', type: 'TEXT', desc: '当前missing-valid-owner-approval-records或manual-release-review-required', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_owner_packet_index', name: 'erp_owner_approval_owner_packet_index', desc: 'ERP owner审批包索引；Batch10按lane汇总待填owner records',
        updateFreq: '每次审批模板生成', upstream: ['erp_owner_approval_backlog', 'erp_owner_approval_intake_contract', 'tmp/exports/erp-owner-approval-record-template-batch10-20260626/erp_owner_approval_owner_packet_index.csv'], downstream: ['erp_owner_approval_record_input_template'],
        fields: [
          { name: 'approval_lane', type: 'VARCHAR(120)', desc: '字段、品类、小计或展示审批lane', source: 'Batch10模板脚本', required: true },
          { name: 'editable_packet', type: 'VARCHAR(160)', desc: '对应Batch8待填写审批包', source: 'erp_owner_approval_backlog', required: true },
          { name: 'owner_role', type: 'TEXT', desc: '需填写审批记录的owner角色', source: '证据门禁', required: true },
          { name: 'backlog_items', type: 'INT', desc: '该lane下backlog项数量', source: 'Batch10模板脚本', required: true },
          { name: 'required_fields', type: 'TEXT', desc: 'Batch9 validator要求字段', source: 'erp_owner_approval_intake_contract', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；索引不代表审批通过', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_record_input_template', name: 'erp_owner_approval_record_input_template', desc: 'ERP owner approval records回填模板；23行预填approval_item_id，审批字段等待真实owner填写',
        updateFreq: '每次审批模板生成/owner回填前', upstream: ['erp_owner_approval_backlog', 'erp_owner_approval_intake_contract', 'tmp/exports/erp-owner-approval-record-template-batch10-20260626/erp_owner_approval_record_input_template.csv'], downstream: ['erp_owner_submission_schema_audit', 'erp_owner_submission_redaction_audit', 'erp_owner_approval_preflight_result', 'erp_owner_approval_validation_result'],
        fields: [
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch8 backlog审批项ID', source: 'erp_owner_approval_backlog', required: true },
          { name: 'approval_decision', type: 'VARCHAR(40)', desc: '待填：approved/denied/needs_revision；当前为空', source: 'owner待填', required: true },
          { name: 'approver_name_hash', type: 'VARCHAR(64)', desc: '待填审批人hash；禁止写真实姓名', source: 'owner待填', required: true },
          { name: 'approval_record_uri', type: 'TEXT', desc: '待填可审计审批记录URI', source: 'owner待填', required: true },
          { name: 'forbidden_display_confirmed', type: 'BOOLEAN', desc: '默认false，需owner明确确认', source: '证据门禁', required: true },
          { name: 'can_export_decision', type: 'BOOLEAN', desc: '默认false', source: '证据门禁', required: true },
          { name: 'can_display_as_fact_decision', type: 'BOOLEAN', desc: '默认false', source: '证据门禁', required: true },
          { name: 'next_validator_command', type: 'TEXT', desc: '回填后运行Batch9 validator', source: 'Batch10模板脚本', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_required_evidence_matrix', name: 'erp_owner_approval_required_evidence_matrix', desc: 'ERP owner approval逐项证据需求矩阵；列出URI、acceptance criteria和禁止展示内容',
        updateFreq: '每次审批模板生成', upstream: ['erp_owner_approval_backlog', 'erp_owner_approval_intake_contract', 'tmp/exports/erp-owner-approval-record-template-batch10-20260626/erp_owner_approval_required_evidence_matrix.csv'], downstream: ['erp_owner_approval_record_input_template', 'erp_owner_approval_preflight_result', 'erp_owner_approval_validation_result'],
        fields: [
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch8 backlog审批项ID', source: 'erp_owner_approval_backlog', required: true },
          { name: 'required_evidence', type: 'TEXT', desc: '升级证据所需材料', source: 'erp_owner_approval_backlog', required: true },
          { name: 'acceptance_criteria', type: 'TEXT', desc: '可审计、带日期、scope清晰且保留禁止展示规则', source: '证据门禁', required: true },
          { name: 'required_uri_scheme', type: 'TEXT', desc: '允许的审批记录URI scheme', source: 'Batch10模板脚本', required: true },
          { name: 'forbidden_raw_values', type: 'TEXT', desc: '禁止进入页面或CSV事实导出的原始业务值', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_submission_readiness', name: 'erp_owner_approval_submission_readiness', desc: 'ERP owner approval提交readiness；按release gate列出缺失owner records数量',
        updateFreq: '每次审批模板生成/owner回填后', upstream: ['erp_owner_approval_release_gate', 'tmp/exports/erp-owner-approval-record-template-batch10-20260626/erp_owner_approval_submission_readiness.csv'], downstream: ['erp_owner_submission_release_readiness', 'erp_owner_approval_release_preflight_summary', 'erp_owner_approval_validation_result', 'erp_owner_approval_release_gate'],
        fields: [
          { name: 'release_gate_id', type: 'VARCHAR(180)', desc: 'Batch9 release gate ID', source: 'erp_owner_approval_release_gate', required: true },
          { name: 'required_owner_records', type: 'INT', desc: '该release gate所需owner records数量', source: 'Batch9 release gate', required: true },
          { name: 'template_rows_available', type: 'INT', desc: 'Batch10已准备可填写模板行数', source: 'Batch10模板脚本', required: true },
          { name: 'submitted_owner_records', type: 'INT', desc: '当前0', source: 'Batch10模板脚本', required: true },
          { name: 'missing_owner_records', type: 'INT', desc: '仍缺owner records数量', source: 'Batch10模板脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_preflight_rulebook', name: 'erp_owner_approval_preflight_rulebook', desc: 'ERP owner approval提交前预检规则；Batch11定义Batch9 handoff前置条件',
        updateFreq: '每次预检规则变更', upstream: ['erp_owner_approval_record_input_template', 'tmp/exports/erp-owner-approval-preflight-batch11-20260626/erp_owner_approval_preflight_rulebook.csv'], downstream: ['erp_owner_approval_preflight_result'],
        fields: [
          { name: 'rule_id', type: 'VARCHAR(180)', desc: '预检规则ID', source: 'Batch11预检脚本', required: true },
          { name: 'rule_name', type: 'VARCHAR(160)', desc: '规则名称', source: '证据门禁', required: true },
          { name: 'required_condition', type: 'TEXT', desc: 'Batch9 handoff前必须满足的条件', source: '证据门禁', required: true },
          { name: 'failure_status', type: 'VARCHAR(120)', desc: '不满足时的阻断状态', source: 'Batch11预检脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_preflight_result', name: 'erp_owner_approval_preflight_result', desc: 'ERP owner approval逐行提交前预检结果；当前Batch10空模板全部blocked',
        updateFreq: '每次owner记录回填后', upstream: ['erp_owner_approval_record_input_template', 'erp_owner_approval_preflight_rulebook', 'tmp/exports/erp-owner-approval-preflight-batch11-20260626/erp_owner_approval_preflight_result.csv'], downstream: ['erp_owner_approval_batch9_handoff_queue', 'erp_owner_approval_validation_result'],
        fields: [
          { name: 'preflight_id', type: 'VARCHAR(220)', desc: '预检结果ID', source: 'Batch11预检脚本', required: true },
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch8 backlog审批项ID', source: 'erp_owner_approval_record_input_template', required: true },
          { name: 'preflight_status', type: 'VARCHAR(120)', desc: '当前blocked_preflight', source: 'Batch11预检脚本', required: true },
          { name: 'preflight_messages', type: 'TEXT', desc: '缺失或阻断原因', source: '证据门禁', required: true },
          { name: 'ready_for_batch9_validator', type: 'BOOLEAN', desc: '当前false', source: 'Batch11预检脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_forbidden_value_scan', name: 'erp_owner_approval_forbidden_value_scan', desc: 'ERP owner approval回填记录禁用raw value扫描；不输出命中原文',
        updateFreq: '每次owner记录回填后', upstream: ['erp_owner_approval_record_input_template', 'tmp/exports/erp-owner-approval-preflight-batch11-20260626/erp_owner_approval_forbidden_value_scan.csv'], downstream: ['erp_owner_approval_preflight_result'],
        fields: [
          { name: 'scan_id', type: 'VARCHAR(220)', desc: '禁用值扫描ID', source: 'Batch11预检脚本', required: true },
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: '对应审批项ID', source: 'erp_owner_approval_record_input_template', required: true },
          { name: 'forbidden_pattern_hits', type: 'INT', desc: '禁用模式命中数量；不记录命中文本', source: 'Batch11预检脚本', required: true },
          { name: 'scan_status', type: 'VARCHAR(120)', desc: '当前passed_no_forbidden_patterns', source: 'Batch11预检脚本', required: true },
          { name: 'redaction_action', type: 'TEXT', desc: '命中时要求先移除raw values再进入Batch9', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_batch9_handoff_queue', name: 'erp_owner_approval_batch9_handoff_queue', desc: 'ERP owner approval进入Batch9 validator的handoff队列；当前0行',
        updateFreq: '每次预检通过后', upstream: ['erp_owner_approval_preflight_result', 'tmp/exports/erp-owner-approval-preflight-batch11-20260626/erp_owner_approval_batch9_handoff_queue.csv'], downstream: ['erp_owner_approval_validation_result'],
        fields: [
          { name: 'handoff_id', type: 'VARCHAR(220)', desc: 'handoff队列ID；当前无候选', source: 'Batch11预检脚本', required: true },
          { name: 'approval_records_path', type: 'TEXT', desc: '将传给Batch9 validator的审批记录路径', source: 'Batch11预检脚本', required: true },
          { name: 'ready_rows', type: 'INT', desc: '可进入Batch9的行数；当前0', source: 'Batch11预检脚本', required: true },
          { name: 'batch9_validator_command', type: 'TEXT', desc: '后续Batch9校验命令', source: 'Batch11预检脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_approval_release_preflight_summary', name: 'erp_owner_approval_release_preflight_summary', desc: 'ERP release gate维度预检汇总；当前9个release gate均无可handoff记录',
        updateFreq: '每次预检后', upstream: ['erp_owner_approval_submission_readiness', 'erp_owner_approval_preflight_result', 'tmp/exports/erp-owner-approval-preflight-batch11-20260626/erp_owner_approval_release_preflight_summary.csv'], downstream: ['erp_owner_approval_release_gate', 'dashboard_kpi', 'CSV exports'],
        fields: [
          { name: 'release_gate_id', type: 'VARCHAR(180)', desc: 'Batch9 release gate ID', source: 'erp_owner_approval_release_gate', required: true },
          { name: 'required_owner_records', type: 'INT', desc: '该release gate需要的owner records', source: 'Batch10 readiness', required: true },
          { name: 'preflight_ready_rows', type: 'INT', desc: '当前预检可handoff行数', source: 'Batch11预检脚本', required: true },
          { name: 'handoff_status', type: 'VARCHAR(140)', desc: '当前blocked_no_preflight_ready_records', source: 'Batch11预检脚本', required: true },
          { name: 'can_export', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_intake_inventory', name: 'erp_owner_submission_intake_inventory', desc: 'ERP owner提交目录盘点；Batch12检测真实审批CSV是否到达',
        updateFreq: '每次owner提交目录变化后', upstream: ['tmp/inputs/erp-owner-approval-submissions-batch12', 'tmp/exports/erp-owner-submission-intake-batch12-20260626/erp_owner_submission_intake_inventory.csv'], downstream: ['erp_owner_submission_schema_audit', 'erp_owner_submission_redaction_audit'],
        fields: [
          { name: 'submission_dir', type: 'TEXT', desc: 'owner审批CSV提交目录', source: 'Batch12提交审计脚本', required: true },
          { name: 'file_path', type: 'TEXT', desc: '检测到的CSV路径；默认仅记录缺失目录', source: 'Batch12提交审计脚本', required: true },
          { name: 'row_count', type: 'INT', desc: 'CSV数据行数；当前0', source: 'Batch12提交审计脚本', required: true },
          { name: 'sha256', type: 'VARCHAR(64)', desc: '提交文件hash；当前为空', source: 'Batch12提交审计脚本', required: false },
          { name: 'inventory_status', type: 'VARCHAR(140)', desc: '当前blocked_missing_submission_directory', source: 'Batch12提交审计脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_schema_audit', name: 'erp_owner_submission_schema_audit', desc: 'ERP owner提交CSV schema审计；逐项比对Batch10模板的23条approval_item_id',
        updateFreq: '每次owner提交目录变化后', upstream: ['erp_owner_approval_record_input_template', 'erp_owner_submission_intake_inventory', 'tmp/exports/erp-owner-submission-intake-batch12-20260626/erp_owner_submission_schema_audit.csv'], downstream: ['erp_owner_submission_batch11_queue', 'erp_owner_submission_release_readiness'],
        fields: [
          { name: 'schema_audit_id', type: 'VARCHAR(220)', desc: 'schema审计ID', source: 'Batch12提交审计脚本', required: true },
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch10模板审批项ID', source: 'erp_owner_approval_record_input_template', required: true },
          { name: 'matched_submission_rows', type: 'INT', desc: '匹配到的真实提交行数；当前0', source: 'Batch12提交审计脚本', required: true },
          { name: 'missing_required_fields', type: 'TEXT', desc: '缺失字段清单；不回显字段值', source: 'Batch12提交审计脚本', required: true },
          { name: 'schema_status', type: 'VARCHAR(140)', desc: '当前blocked_missing_submission_record', source: 'Batch12提交审计脚本', required: true },
          { name: 'ready_for_batch11_preflight', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_redaction_audit', name: 'erp_owner_submission_redaction_audit', desc: 'ERP owner提交CSV脱敏审计；只记录禁用值命中数量，不输出命中文本',
        updateFreq: '每次owner提交目录变化后', upstream: ['erp_owner_submission_intake_inventory', 'tmp/exports/erp-owner-submission-intake-batch12-20260626/erp_owner_submission_redaction_audit.csv'], downstream: ['erp_owner_submission_batch11_queue'],
        fields: [
          { name: 'redaction_audit_id', type: 'VARCHAR(220)', desc: '脱敏审计ID', source: 'Batch12提交审计脚本', required: true },
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch10模板审批项ID', source: 'erp_owner_approval_record_input_template', required: true },
          { name: 'submitted_rows_scanned', type: 'INT', desc: '扫描提交行数；当前0', source: 'Batch12提交审计脚本', required: true },
          { name: 'forbidden_pattern_hits', type: 'INT', desc: '禁用模式命中数量；不记录命中文本', source: 'Batch12提交审计脚本', required: true },
          { name: 'redaction_status', type: 'VARCHAR(140)', desc: '当前not_scanned_no_submission', source: 'Batch12提交审计脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_batch11_queue', name: 'erp_owner_submission_batch11_queue', desc: 'ERP owner提交CSV进入Batch11 preflight的队列；当前0行',
        updateFreq: '每次owner提交目录变化后', upstream: ['erp_owner_submission_schema_audit', 'erp_owner_submission_redaction_audit', 'tmp/exports/erp-owner-submission-intake-batch12-20260626/erp_owner_submission_batch11_queue.csv'], downstream: ['erp_owner_approval_preflight_result'],
        fields: [
          { name: 'queue_id', type: 'VARCHAR(220)', desc: 'Batch11预检队列ID；当前无候选', source: 'Batch12提交审计脚本', required: true },
          { name: 'approval_records_path', type: 'TEXT', desc: '将传给Batch11 --approval-records的CSV路径', source: 'Batch12提交审计脚本', required: true },
          { name: 'schema_ready_rows', type: 'INT', desc: 'schema可进入Batch11的行数；当前0', source: 'Batch12提交审计脚本', required: true },
          { name: 'batch11_preflight_command', type: 'TEXT', desc: '后续Batch11预检命令', source: 'Batch12提交审计脚本', required: true },
          { name: 'queue_status', type: 'VARCHAR(140)', desc: '当前无队列行', source: 'Batch12提交审计脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_release_readiness', name: 'erp_owner_submission_release_readiness', desc: 'ERP release gate维度owner提交readiness；当前9个release gate均无可预检提交',
        updateFreq: '每次owner提交目录变化后', upstream: ['erp_owner_approval_submission_readiness', 'erp_owner_submission_schema_audit', 'tmp/exports/erp-owner-submission-intake-batch12-20260626/erp_owner_submission_release_readiness.csv'], downstream: ['erp_owner_approval_release_preflight_summary', 'erp_owner_approval_release_gate'],
        fields: [
          { name: 'release_gate_id', type: 'VARCHAR(180)', desc: 'Batch9 release gate ID', source: 'erp_owner_approval_submission_readiness', required: true },
          { name: 'submitted_owner_records', type: 'INT', desc: '当前提交审批记录数；当前0', source: 'Batch12提交审计脚本', required: true },
          { name: 'schema_ready_records', type: 'INT', desc: 'schema可进入Batch11的记录数；当前0', source: 'Batch12提交审计脚本', required: true },
          { name: 'batch11_queue_rows', type: 'INT', desc: 'Batch11预检队列行数；当前0', source: 'Batch12提交审计脚本', required: true },
          { name: 'readiness_status', type: 'VARCHAR(140)', desc: '当前blocked_no_batch11_ready_submission', source: 'Batch12提交审计脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_packet_index', name: 'erp_owner_submission_packet_index', desc: 'ERP Batch13 owner submission模板包索引；combined和lane模板均不进入真实提交目录',
        updateFreq: '每次owner提交包生成', upstream: ['erp_owner_approval_record_input_template', 'tmp/exports/erp-owner-submission-pack-batch13-20260626/erp_owner_submission_packet_index.csv'], downstream: ['erp_owner_submission_template_manifest', 'erp_owner_submission_field_completion_checklist'],
        fields: [
          { name: 'packet_id', type: 'VARCHAR(180)', desc: 'Batch13模板包ID', source: 'Batch13模板包脚本', required: true },
          { name: 'template_file', type: 'TEXT', desc: '导出目录下的模板文件路径', source: 'Batch13模板包脚本', required: true },
          { name: 'approval_item_count', type: 'INT', desc: '模板内approval item数量', source: 'erp_owner_approval_record_input_template', required: true },
          { name: 'target_submission_dir', type: 'TEXT', desc: '真实owner CSV后续应提交的Batch12目录', source: '证据门禁', required: true },
          { name: 'next_batch12_command', type: 'TEXT', desc: '真实提交到达后的Batch12命令', source: 'Batch13模板包脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；模板不代表审批通过', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_template_manifest', name: 'erp_owner_submission_template_manifest', desc: 'ERP Batch13 owner submission模板manifest；记录模板hash、可编辑字段和锁定字段',
        updateFreq: '每次owner提交包生成', upstream: ['erp_owner_submission_packet_index', 'tmp/exports/erp-owner-submission-pack-batch13-20260626/owner-submission-templates'], downstream: ['erp_owner_submission_intake_inventory'],
        fields: [
          { name: 'template_id', type: 'VARCHAR(180)', desc: 'Batch13模板ID', source: 'Batch13模板包脚本', required: true },
          { name: 'template_file', type: 'TEXT', desc: '模板文件路径', source: 'Batch13模板包脚本', required: true },
          { name: 'row_count', type: 'INT', desc: '模板行数；combined为23，lane合计23', source: 'Batch13模板包脚本', required: true },
          { name: 'editable_fields', type: 'TEXT', desc: 'owner可填写字段清单', source: '证据门禁', required: true },
          { name: 'sha256', type: 'VARCHAR(64)', desc: '模板文件hash', source: 'Batch13模板包脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；manifest不代表真实提交', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_field_completion_checklist', name: 'erp_owner_submission_field_completion_checklist', desc: 'ERP Batch13 owner字段补全checklist；逐项列出Batch12前必须补齐的字段和URI口径',
        updateFreq: '每次owner提交包生成', upstream: ['erp_owner_approval_record_input_template', 'erp_owner_approval_required_evidence_matrix', 'tmp/exports/erp-owner-submission-pack-batch13-20260626/erp_owner_submission_field_completion_checklist.csv'], downstream: ['erp_owner_submission_schema_audit'],
        fields: [
          { name: 'checklist_id', type: 'VARCHAR(220)', desc: '字段补全清单ID', source: 'Batch13模板包脚本', required: true },
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch10模板审批项ID', source: 'erp_owner_approval_record_input_template', required: true },
          { name: 'blank_fields_to_complete', type: 'TEXT', desc: 'owner需补齐的空字段', source: '证据门禁', required: true },
          { name: 'required_uri_scheme', type: 'TEXT', desc: '允许的审批证据URI scheme', source: 'erp_owner_approval_required_evidence_matrix', required: true },
          { name: 'owner_action', type: 'TEXT', desc: 'owner填写与提交动作', source: 'Batch13模板包脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；checklist不应用审批', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_release_packet_matrix', name: 'erp_owner_submission_release_packet_matrix', desc: 'ERP Batch13 release gate到owner提交模板的映射；当前所有gate仍保持阻断',
        updateFreq: '每次owner提交包生成', upstream: ['erp_owner_approval_submission_readiness', 'tmp/exports/erp-owner-submission-pack-batch13-20260626/erp_owner_submission_release_packet_matrix.csv'], downstream: ['erp_owner_submission_release_readiness'],
        fields: [
          { name: 'release_gate_id', type: 'VARCHAR(180)', desc: 'Batch9 release gate ID', source: 'erp_owner_approval_submission_readiness', required: true },
          { name: 'required_owner_records', type: 'INT', desc: 'release gate所需owner records数量', source: 'Batch10 readiness', required: true },
          { name: 'submission_template_file', type: 'TEXT', desc: '对应combined模板路径', source: 'Batch13模板包脚本', required: true },
          { name: 'target_submission_dir', type: 'TEXT', desc: '真实CSV后续提交目录', source: '证据门禁', required: true },
          { name: 'next_batch12_command', type: 'TEXT', desc: '真实提交到达后的Batch12命令', source: 'Batch13模板包脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_handoff_guide', name: 'erp_owner_submission_handoff_guide', desc: 'ERP Batch13 owner提交交接指南；规定分发模板、真实提交、Batch12、Batch11、Batch9顺序',
        updateFreq: '每次owner提交包生成', upstream: ['erp_owner_submission_packet_index', 'erp_owner_submission_template_manifest', 'tmp/exports/erp-owner-submission-pack-batch13-20260626/erp_owner_submission_handoff_guide.csv'], downstream: ['erp_owner_submission_intake_inventory', 'erp_owner_submission_batch11_queue'],
        fields: [
          { name: 'step_id', type: 'VARCHAR(180)', desc: '交接步骤ID', source: 'Batch13模板包脚本', required: true },
          { name: 'step_order', type: 'INT', desc: '执行顺序', source: 'Batch13模板包脚本', required: true },
          { name: 'action', type: 'TEXT', desc: 'owner或数据治理动作', source: 'Batch13模板包脚本', required: true },
          { name: 'required_evidence', type: 'TEXT', desc: '进入下一步的证据要求', source: '证据门禁', required: true },
          { name: 'next_command', type: 'TEXT', desc: '下一步命令；无命令步骤为空', source: 'Batch13模板包脚本', required: false },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；guide不代表真实提交', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_dropbox_status', name: 'erp_owner_submission_dropbox_status', desc: 'ERP Batch14 owner提交dropbox状态；只读检查Batch12 input目录是否有真实CSV',
        updateFreq: '每次dropbox检查', upstream: ['erp_owner_submission_template_manifest', 'erp_owner_submission_intake_inventory', 'tmp/exports/erp-owner-submission-dropbox-watchlist-batch14-20260627/erp_owner_submission_dropbox_status.csv'], downstream: ['erp_owner_submission_owner_action_queue', 'erp_owner_submission_release_watchlist'],
        fields: [
          { name: 'dropbox_id', type: 'VARCHAR(180)', desc: 'Batch14 dropbox检查ID', source: 'Batch14 watchlist脚本', required: true },
          { name: 'target_submission_dir', type: 'TEXT', desc: 'Batch12真实owner CSV目标目录', source: '证据门禁', required: true },
          { name: 'directory_exists', type: 'BOOLEAN', desc: '当前false；脚本不创建目录', source: 'Batch14 watchlist脚本', required: true },
          { name: 'csv_file_count', type: 'INT', desc: '当前0；只计数CSV文件', source: 'Batch14 watchlist脚本', required: true },
          { name: 'current_status', type: 'VARCHAR(140)', desc: '当前blocked_no_owner_submission_csv', source: 'Batch14 watchlist脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_owner_action_queue', name: 'erp_owner_submission_owner_action_queue', desc: 'ERP Batch14 owner action queue；把23条approval item映射到模板、字段和Batch12命令',
        updateFreq: '每次dropbox检查', upstream: ['erp_owner_submission_field_completion_checklist', 'erp_owner_submission_dropbox_status', 'tmp/exports/erp-owner-submission-dropbox-watchlist-batch14-20260627/erp_owner_submission_owner_action_queue.csv'], downstream: ['erp_owner_submission_schema_audit'],
        fields: [
          { name: 'action_id', type: 'VARCHAR(220)', desc: 'owner action ID', source: 'Batch14 watchlist脚本', required: true },
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch10模板审批项ID', source: 'erp_owner_submission_field_completion_checklist', required: true },
          { name: 'template_file', type: 'TEXT', desc: '应填写的Batch13模板路径', source: 'erp_owner_submission_template_manifest', required: true },
          { name: 'blank_fields_to_complete', type: 'TEXT', desc: 'owner需补齐的空字段', source: '证据门禁', required: true },
          { name: 'next_batch12_command', type: 'TEXT', desc: '真实CSV到达后的Batch12命令', source: 'Batch14 watchlist脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；action queue不应用审批', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_template_distribution', name: 'erp_owner_submission_template_distribution', desc: 'ERP Batch14 模板分发清单；列出可分发模板、hash、owner role和提交目录',
        updateFreq: '每次dropbox检查', upstream: ['erp_owner_submission_template_manifest', 'erp_owner_submission_packet_index', 'tmp/exports/erp-owner-submission-dropbox-watchlist-batch14-20260627/erp_owner_submission_template_distribution.csv'], downstream: ['erp_owner_submission_owner_action_queue'],
        fields: [
          { name: 'distribution_id', type: 'VARCHAR(220)', desc: '模板分发ID', source: 'Batch14 watchlist脚本', required: true },
          { name: 'template_id', type: 'VARCHAR(180)', desc: 'Batch13模板ID', source: 'erp_owner_submission_template_manifest', required: true },
          { name: 'template_file', type: 'TEXT', desc: '模板文件路径', source: 'erp_owner_submission_template_manifest', required: true },
          { name: 'sha256', type: 'VARCHAR(64)', desc: '模板hash', source: 'erp_owner_submission_template_manifest', required: true },
          { name: 'distribution_status', type: 'VARCHAR(140)', desc: '当前ready_to_distribute_template_only', source: 'Batch14 watchlist脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；模板分发不代表审批完成', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_release_watchlist', name: 'erp_owner_submission_release_watchlist', desc: 'ERP Batch14 release watchlist；按release gate跟踪owner CSV、Batch12 readiness和Batch11 queue',
        updateFreq: '每次dropbox检查', upstream: ['erp_owner_submission_release_packet_matrix', 'erp_owner_submission_dropbox_status', 'tmp/exports/erp-owner-submission-dropbox-watchlist-batch14-20260627/erp_owner_submission_release_watchlist.csv'], downstream: ['erp_owner_submission_release_readiness', 'erp_owner_approval_release_preflight_summary'],
        fields: [
          { name: 'watchlist_id', type: 'VARCHAR(220)', desc: 'release watch ID', source: 'Batch14 watchlist脚本', required: true },
          { name: 'release_gate_id', type: 'VARCHAR(180)', desc: 'Batch9 release gate ID', source: 'erp_owner_submission_release_packet_matrix', required: true },
          { name: 'submitted_owner_records', type: 'INT', desc: '当前0', source: 'Batch14 watchlist脚本', required: true },
          { name: 'ready_for_batch12_rows', type: 'INT', desc: '当前0', source: 'Batch14 watchlist脚本', required: true },
          { name: 'batch11_queue_rows', type: 'INT', desc: '当前0', source: 'Batch12 intake manifest', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_command_runbook', name: 'erp_owner_submission_command_runbook', desc: 'ERP Batch14 command runbook；定义dropbox检查、owner提交、Batch12、Batch11、Batch9命令顺序',
        updateFreq: '每次dropbox检查', upstream: ['erp_owner_submission_handoff_guide', 'tmp/exports/erp-owner-submission-dropbox-watchlist-batch14-20260627/erp_owner_submission_command_runbook.csv'], downstream: ['erp_owner_submission_intake_inventory', 'erp_owner_approval_preflight_result', 'erp_owner_approval_validation_result'],
        fields: [
          { name: 'step_id', type: 'VARCHAR(180)', desc: '命令步骤ID', source: 'Batch14 watchlist脚本', required: true },
          { name: 'step_order', type: 'INT', desc: '执行顺序', source: 'Batch14 watchlist脚本', required: true },
          { name: 'command', type: 'TEXT', desc: '下一步命令或人工动作', source: 'Batch14 watchlist脚本', required: true },
          { name: 'prerequisite', type: 'TEXT', desc: '进入命令前置条件', source: '证据门禁', required: true },
          { name: 'current_status', type: 'VARCHAR(140)', desc: '当前多为blocked_until_owner_csv_exists', source: 'Batch14 watchlist脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；runbook不是审批记录', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_acceptance_rulebook', name: 'erp_owner_submission_acceptance_rulebook', desc: 'ERP Batch15 owner提交acceptance规则表；定义真实CSV进入Batch12前的接收条件',
        updateFreq: '每次acceptance gate检查', upstream: ['erp_owner_submission_command_runbook', 'tmp/exports/erp-owner-submission-acceptance-gate-batch15-20260627/erp_owner_submission_acceptance_rulebook.csv'], downstream: ['erp_owner_submission_acceptance_result', 'erp_owner_submission_release_acceptance_matrix'],
        fields: [
          { name: 'rule_id', type: 'VARCHAR(180)', desc: 'Batch15 acceptance规则ID', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'rule_name', type: 'VARCHAR(180)', desc: '规则名称', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'required_condition', type: 'TEXT', desc: '接收所需前置条件', source: '证据门禁', required: true },
          { name: 'acceptance_status', type: 'VARCHAR(140)', desc: '当前blocked_awaiting_real_owner_csv', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'next_check', type: 'TEXT', desc: '下一步检查点', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；规则不代表真实审批', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_acceptance_result', name: 'erp_owner_submission_acceptance_result', desc: 'ERP Batch15 owner提交acceptance结果；逐项标记23条approval item的接收状态',
        updateFreq: '每次acceptance gate检查', upstream: ['erp_owner_submission_owner_action_queue', 'erp_owner_submission_acceptance_rulebook', 'tmp/exports/erp-owner-submission-acceptance-gate-batch15-20260627/erp_owner_submission_acceptance_result.csv'], downstream: ['erp_owner_submission_schema_audit', 'erp_owner_submission_escalation_queue'],
        fields: [
          { name: 'acceptance_id', type: 'VARCHAR(220)', desc: 'acceptance结果ID', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch10模板审批项ID', source: 'erp_owner_submission_owner_action_queue', required: true },
          { name: 'template_file', type: 'TEXT', desc: '应提交的owner模板路径', source: 'erp_owner_submission_owner_action_queue', required: true },
          { name: 'acceptance_status', type: 'VARCHAR(140)', desc: '当前blocked_awaiting_real_owner_csv', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'missing_acceptance_inputs', type: 'TEXT', desc: '进入Batch12前仍缺的字段或证据', source: '证据门禁', required: true },
          { name: 'next_batch12_command', type: 'TEXT', desc: '真实CSV到达后的Batch12命令', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；acceptance result不应用审批', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_evidence_uri_contract', name: 'erp_owner_submission_evidence_uri_contract', desc: 'ERP Batch15 evidence URI合同；按approval lane约束审批证据URI口径',
        updateFreq: '每次acceptance gate检查', upstream: ['erp_owner_submission_field_completion_checklist', 'tmp/exports/erp-owner-submission-acceptance-gate-batch15-20260627/erp_owner_submission_evidence_uri_contract.csv'], downstream: ['erp_owner_approval_preflight_result', 'erp_owner_submission_acceptance_result'],
        fields: [
          { name: 'contract_id', type: 'VARCHAR(220)', desc: 'URI合同ID', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'approval_lane', type: 'VARCHAR(120)', desc: '审批lane', source: 'erp_owner_submission_field_completion_checklist', required: true },
          { name: 'owner_roles', type: 'TEXT', desc: '该lane所需owner角色', source: 'erp_owner_submission_field_completion_checklist', required: true },
          { name: 'required_uri_scheme', type: 'TEXT', desc: '允许的审批证据URI scheme', source: '证据门禁', required: true },
          { name: 'required_fields', type: 'TEXT', desc: '该lane必填字段组合', source: 'erp_owner_submission_field_completion_checklist', required: true },
          { name: 'forbidden_values_policy', type: 'TEXT', desc: '禁止输出原始SKU、产品、客户、运营、仓库、凭据或审批备注正文', source: '隐私治理', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；URI合同不代表真实审批证据已存在', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_release_acceptance_matrix', name: 'erp_owner_submission_release_acceptance_matrix', desc: 'ERP Batch15 release acceptance矩阵；按release gate汇总owner提交接收状态',
        updateFreq: '每次acceptance gate检查', upstream: ['erp_owner_submission_release_watchlist', 'erp_owner_submission_acceptance_rulebook', 'tmp/exports/erp-owner-submission-acceptance-gate-batch15-20260627/erp_owner_submission_release_acceptance_matrix.csv'], downstream: ['erp_owner_submission_release_readiness', 'erp_owner_approval_release_preflight_summary'],
        fields: [
          { name: 'release_acceptance_id', type: 'VARCHAR(220)', desc: 'release acceptance ID', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'release_gate_id', type: 'VARCHAR(180)', desc: 'Batch9 release gate ID', source: 'erp_owner_submission_release_watchlist', required: true },
          { name: 'accepted_owner_records', type: 'INT', desc: '当前0；真实owner CSV尚未接收', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'ready_for_batch12_rows', type: 'INT', desc: '当前0', source: 'Batch14 release watchlist', required: true },
          { name: 'acceptance_status', type: 'VARCHAR(140)', desc: '当前blocked_awaiting_real_owner_csv', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'can_export', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_escalation_queue', name: 'erp_owner_submission_escalation_queue', desc: 'ERP Batch15 escalation queue；把23条仍需owner输入的项转成升级队列',
        updateFreq: '每次acceptance gate检查', upstream: ['erp_owner_submission_acceptance_result', 'tmp/exports/erp-owner-submission-acceptance-gate-batch15-20260627/erp_owner_submission_escalation_queue.csv'], downstream: ['erp_owner_submission_owner_action_queue', 'erp_owner_submission_dropbox_status'],
        fields: [
          { name: 'escalation_id', type: 'VARCHAR(220)', desc: '升级队列ID', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch10模板审批项ID', source: 'erp_owner_submission_acceptance_result', required: true },
          { name: 'owner_role', type: 'VARCHAR(160)', desc: '所需owner角色', source: 'erp_owner_submission_owner_action_queue', required: true },
          { name: 'owner_action', type: 'TEXT', desc: 'owner下一步动作', source: 'erp_owner_submission_owner_action_queue', required: true },
          { name: 'escalation_status', type: 'VARCHAR(140)', desc: '当前owner_input_required', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'next_command', type: 'TEXT', desc: '下一次dropbox检查命令', source: 'Batch15 acceptance gate脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false；升级队列不代表审批完成', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_synthetic_record', name: 'synthetic_owner_approval_records_batch16', desc: 'ERP Batch16 synthetic owner approval records；虚拟填充23条审批记录，仅用于Batch12/11/9 dry-run',
        updateFreq: '按需生成', upstream: ['erp_owner_approval_record_input_template', 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic/synthetic_owner_approval_records_batch16.csv'], downstream: ['erp_owner_submission_synthetic_record_fill_audit', 'erp_owner_submission_synthetic_gate_plan'],
        fields: [
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch10模板审批项ID', source: 'Batch10 owner record模板', required: true },
          { name: 'approval_lane', type: 'VARCHAR(120)', desc: '审批lane', source: 'Batch10 owner record模板', required: true },
          { name: 'approval_decision', type: 'VARCHAR(80)', desc: '虚拟填充值approved；仅作流程演练', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'approver_name_hash', type: 'VARCHAR(64)', desc: 'synthetic hash；不代表真实审批人', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'approval_record_uri', type: 'TEXT', desc: 'file-hash:// synthetic URI；不代表真实审批凭证', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'evidence_grade', type: 'VARCHAR(40)', desc: '固定L2-fixture-or-dry-run', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false；虚拟数据不可展示或导出', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_synthetic_fixture_index', name: 'erp_owner_submission_synthetic_fixture_index', desc: 'ERP Batch16 synthetic fixture索引；记录虚拟CSV路径、hash和用途边界',
        updateFreq: '按需生成', upstream: ['synthetic_owner_approval_records_batch16', 'tmp/exports/erp-owner-submission-synthetic-fixture-batch16-20260627/erp_owner_submission_synthetic_fixture_index.csv'], downstream: ['erp_owner_submission_synthetic_gate_plan'],
        fields: [
          { name: 'fixture_id', type: 'VARCHAR(220)', desc: 'synthetic fixture ID', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'synthetic_input_dir', type: 'TEXT', desc: 'synthetic专用输入目录', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'record_file_path', type: 'TEXT', desc: '虚拟审批CSV路径', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'row_count', type: 'INT', desc: '当前23行', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'fixture_scope', type: 'TEXT', desc: '仅用于Batch12/11/9 dry-run', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_synthetic_record_fill_audit', name: 'erp_owner_submission_synthetic_record_fill_audit', desc: 'ERP Batch16 synthetic记录填充审计；确认虚拟hash、URI和展示/导出false',
        updateFreq: '按需生成', upstream: ['synthetic_owner_approval_records_batch16', 'tmp/exports/erp-owner-submission-synthetic-fixture-batch16-20260627/erp_owner_submission_synthetic_record_fill_audit.csv'], downstream: ['erp_owner_submission_synthetic_gate_plan'],
        fields: [
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch10模板审批项ID', source: 'synthetic owner records', required: true },
          { name: 'approval_decision', type: 'VARCHAR(80)', desc: '虚拟填充值approved', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'approver_hash_present', type: 'BOOLEAN', desc: '是否生成64位synthetic hash', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'approval_record_uri_scheme', type: 'VARCHAR(80)', desc: '固定file-hash://', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'synthetic_marker', type: 'VARCHAR(120)', desc: 'SYNTHETIC_FIXTURE_DO_NOT_USE_AS_FACT', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_synthetic_gate_plan', name: 'erp_owner_submission_synthetic_gate_plan', desc: 'ERP Batch16 synthetic gate plan；定义Batch12、Batch11、Batch9 dry-run顺序和manual review边界',
        updateFreq: '按需生成', upstream: ['erp_owner_submission_synthetic_fixture_index', 'erp_owner_submission_synthetic_record_fill_audit', 'tmp/exports/erp-owner-submission-synthetic-fixture-batch16-20260627/erp_owner_submission_synthetic_gate_plan.csv'], downstream: ['erp_owner_submission_intake_inventory', 'erp_owner_approval_preflight_result', 'erp_owner_approval_validation_result'],
        fields: [
          { name: 'step_id', type: 'VARCHAR(220)', desc: 'dry-run步骤ID', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'step_order', type: 'INT', desc: '执行顺序', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'gate', type: 'VARCHAR(180)', desc: 'Batch12/Batch11/Batch9/manual review gate', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'command', type: 'TEXT', desc: 'dry-run命令；不得作为真实审批命令', source: 'Batch16 synthetic fixture脚本', required: true },
          { name: 'can_write_real_gate', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_synthetic_pipeline_run_matrix', name: 'erp_owner_submission_synthetic_pipeline_run_matrix', desc: 'ERP Batch17 synthetic pipeline run matrix；串联Batch12/11/9 fixture dry-run并记录证据等级',
        updateFreq: '按需生成', upstream: ['erp_owner_submission_synthetic_gate_plan', 'synthetic_owner_approval_records_batch16', 'tmp/exports/erp-owner-submission-synthetic-pipeline-batch17-20260627/erp_owner_submission_synthetic_pipeline_run_matrix.csv'], downstream: ['erp_owner_submission_synthetic_boundary_audit', 'erp_owner_submission_synthetic_release_gate_matrix'],
        fields: [
          { name: 'stage_id', type: 'VARCHAR(220)', desc: 'synthetic pipeline阶段ID', source: 'Batch17 synthetic pipeline脚本', required: true },
          { name: 'stage_order', type: 'INT', desc: '执行顺序', source: 'Batch17 synthetic pipeline脚本', required: true },
          { name: 'stage_name', type: 'VARCHAR(220)', desc: 'Batch12/Batch11/Batch9/manual review阶段', source: 'Batch17 synthetic pipeline脚本', required: true },
          { name: 'observed_evidence_grade', type: 'VARCHAR(40)', desc: '子批次必须保持L2-fixture-or-dry-run', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
          { name: 'can_export', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_synthetic_release_gate_matrix', name: 'erp_owner_submission_synthetic_release_gate_matrix', desc: 'ERP Batch17 synthetic release gate matrix；9个release gate仅为人工复核演练',
        updateFreq: '按需生成', upstream: ['erp_owner_submission_synthetic_pipeline_run_matrix', 'erp_owner_approval_release_gate', 'tmp/exports/erp-owner-submission-synthetic-pipeline-batch17-20260627/erp_owner_submission_synthetic_release_gate_matrix.csv'], downstream: ['erp_owner_submission_synthetic_boundary_audit'],
        fields: [
          { name: 'release_gate_id', type: 'VARCHAR(220)', desc: 'release gate ID', source: 'Batch8 display approval模板', required: true },
          { name: 'table_name', type: 'VARCHAR(160)', desc: '目标治理表', source: 'Batch8 display approval模板', required: true },
          { name: 'synthetic_validation_status', type: 'VARCHAR(180)', desc: '固定dry-run only状态', source: 'Batch17 synthetic pipeline脚本', required: true },
          { name: 'ready_for_manual_review', type: 'BOOLEAN', desc: '固定false；synthetic不可进入真实人工复核', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
          { name: 'can_export', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_submission_synthetic_boundary_audit', name: 'erp_owner_submission_synthetic_boundary_audit', desc: 'ERP Batch17 synthetic boundary audit；检查fixtureMode、L2降级、display/export/promotion为0',
        updateFreq: '按需生成', upstream: ['erp_owner_submission_synthetic_pipeline_run_matrix', 'erp_owner_submission_synthetic_release_gate_matrix', 'tmp/exports/erp-owner-submission-synthetic-pipeline-batch17-20260627/erp_owner_submission_synthetic_boundary_audit.csv'], downstream: ['erp_owner_submission_acceptance_result', 'erp_owner_approval_release_gate'],
        fields: [
          { name: 'boundary_id', type: 'VARCHAR(220)', desc: '证据边界检查ID', source: 'Batch17 synthetic pipeline脚本', required: true },
          { name: 'checked_item', type: 'TEXT', desc: '检查项', source: 'Batch17 synthetic pipeline脚本', required: true },
          { name: 'expected_value', type: 'TEXT', desc: '期望边界值', source: '证据门禁', required: true },
          { name: 'observed_value', type: 'TEXT', desc: '实际dry-run观测值', source: 'Batch17 synthetic pipeline脚本', required: true },
          { name: 'boundary_status', type: 'VARCHAR(80)', desc: 'passed或blocked', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_real_submission_field_checklist', name: 'erp_owner_real_submission_field_checklist', desc: 'ERP Batch18 real owner submission field checklist；真实owner CSV到达前的23条回填核验清单',
        updateFreq: '真实owner提交前/模板变化时', upstream: ['erp_owner_approval_record_input_template', 'erp_owner_approval_required_evidence_matrix', 'erp_owner_submission_acceptance_result', 'tmp/exports/erp-owner-submission-real-owner-checklist-batch18-20260627/erp_owner_real_submission_field_checklist.csv'], downstream: ['erp_owner_submission_intake_inventory', 'erp_owner_approval_preflight_result'],
        fields: [
          { name: 'approval_item_id', type: 'VARCHAR(180)', desc: 'Batch10审批项ID', source: 'Batch10 owner record模板', required: true },
          { name: 'approval_lane', type: 'VARCHAR(120)', desc: '审批lane', source: 'Batch10 owner record模板', required: true },
          { name: 'required_fields', type: 'TEXT', desc: '真实owner CSV必填字段', source: 'Batch10 required evidence matrix', required: true },
          { name: 'required_uri_scheme', type: 'TEXT', desc: '允许的审批凭证URI scheme', source: 'Batch15 URI contract', required: true },
          { name: 'real_owner_record_status', type: 'VARCHAR(120)', desc: '当前awaiting_real_owner_record', source: 'Batch18 checklist脚本', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false；清单不是事实数据', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_real_submission_release_gate_checklist', name: 'erp_owner_real_submission_release_gate_checklist', desc: 'ERP Batch18 real owner release gate checklist；9个release gate的真实CSV接收前核验表',
        updateFreq: '真实owner提交前/发布前', upstream: ['erp_owner_submission_release_acceptance_matrix', 'erp_owner_submission_synthetic_release_gate_matrix', 'tmp/exports/erp-owner-submission-real-owner-checklist-batch18-20260627/erp_owner_real_submission_release_gate_checklist.csv'], downstream: ['erp_owner_approval_release_gate', 'erp_owner_real_submission_swap_runbook'],
        fields: [
          { name: 'release_gate_id', type: 'VARCHAR(220)', desc: 'release gate ID', source: 'Batch15 release acceptance matrix', required: true },
          { name: 'table_name', type: 'VARCHAR(160)', desc: '目标治理表', source: 'Batch15 release acceptance matrix', required: true },
          { name: 'required_owner_records', type: 'INT', desc: '该release gate所需真实owner记录数', source: 'Batch15 release acceptance matrix', required: true },
          { name: 'synthetic_release_status', type: 'VARCHAR(180)', desc: 'Batch17演练状态，仅作流程参考', source: 'Batch17 synthetic release gate matrix', required: true },
          { name: 'can_export', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_real_submission_swap_runbook', name: 'erp_owner_real_submission_swap_runbook', desc: 'ERP Batch18 real owner swap runbook；真实owner CSV替换synthetic演练后的七步执行手册',
        updateFreq: '真实owner提交前/运行手册变化时', upstream: ['erp_owner_real_submission_field_checklist', 'erp_owner_real_submission_release_gate_checklist', 'tmp/exports/erp-owner-submission-real-owner-checklist-batch18-20260627/erp_owner_real_submission_swap_runbook.csv'], downstream: ['erp_owner_submission_dropbox_status', 'erp_owner_submission_intake_inventory', 'erp_owner_approval_preflight_result', 'erp_owner_approval_validation_result'],
        fields: [
          { name: 'step_id', type: 'VARCHAR(220)', desc: 'runbook步骤ID', source: 'Batch18 checklist脚本', required: true },
          { name: 'step_order', type: 'INT', desc: '执行顺序', source: 'Batch18 checklist脚本', required: true },
          { name: 'runbook_step', type: 'TEXT', desc: '真实CSV接收、Batch14/12/11/9和manual release review步骤', source: 'Batch18 checklist脚本', required: true },
          { name: 'command_or_action', type: 'TEXT', desc: '命令或人工动作', source: 'Batch18 checklist脚本', required: true },
          { name: 'can_write_real_gate', type: 'BOOLEAN', desc: '固定false；本runbook不自动执行真实写入', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_owner_real_submission_boundary_audit', name: 'erp_owner_real_submission_boundary_audit', desc: 'ERP Batch18 real owner boundary audit；确认未生成真实审批、未写真实input、未开放展示导出',
        updateFreq: '每次Batch18生成', upstream: ['erp_owner_real_submission_field_checklist', 'erp_owner_real_submission_release_gate_checklist', 'erp_owner_submission_synthetic_boundary_audit', 'tmp/exports/erp-owner-submission-real-owner-checklist-batch18-20260627/erp_owner_real_submission_boundary_audit.csv'], downstream: ['erp_owner_submission_acceptance_result', 'erp_owner_approval_release_gate'],
        fields: [
          { name: 'boundary_id', type: 'VARCHAR(220)', desc: '证据边界检查ID', source: 'Batch18 checklist脚本', required: true },
          { name: 'checked_item', type: 'TEXT', desc: '检查项', source: 'Batch18 checklist脚本', required: true },
          { name: 'expected_value', type: 'TEXT', desc: '期望边界值', source: '证据门禁', required: true },
          { name: 'observed_value', type: 'TEXT', desc: '实际观测值', source: 'Batch18 checklist脚本', required: true },
          { name: 'boundary_status', type: 'VARCHAR(80)', desc: 'passed或blocked', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '固定false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_manual_release_review_record', name: 'erp_manual_release_review_record', desc: 'ERP Batch19 manual release review记录；放行9张内部代理表的页面展示和CSV导出',
        updateFreq: '发布/导出前', upstream: ['erp_owner_approval_promotion_manifest', 'tmp/inputs/erp-manual-release-review-submissions-batch19/manual_release_review_chat_approval_20260627.json'], downstream: ['erp_manual_release_review_decision_matrix', 'erp_manual_release_review_swap_queue', 'market_trend_monthly', 'CSV exports'],
        fields: [
          { name: 'release_review_record_id', type: 'VARCHAR(220)', desc: 'manual release review记录ID', source: 'Batch19脚本', required: true },
          { name: 'approval_record_uri', type: 'TEXT', desc: '审批记录URI，不回显敏感审批正文', source: 'Batch19脚本', required: true },
          { name: 'reviewer_hash', type: 'VARCHAR(64)', desc: 'reviewer hash或alias映射', source: 'Batch19脚本', required: true },
          { name: 'review_date', type: 'DATE', desc: 'review日期', source: 'Batch19脚本', required: true },
          { name: 'decision_scope', type: 'TEXT', desc: '覆盖Batch9 promotion candidates', source: 'Batch19脚本', required: true },
          { name: 'can_export_decision', type: 'BOOLEAN', desc: '当前true，仅限private/internal proxy', source: 'manual release review', required: true },
          { name: 'can_display_as_fact_decision', type: 'BOOLEAN', desc: '当前true，仅限private/internal proxy', source: 'manual release review', required: true },
          { name: 'deployment_authorized', type: 'BOOLEAN', desc: '当前false，生产部署需另行授权', source: '证据门禁', required: true },
          { name: 'production_write_authorized', type: 'BOOLEAN', desc: '当前false，不做生产写入', source: '证据门禁', required: true },
          { name: 'provider_calls_authorized', type: 'BOOLEAN', desc: '当前false，不调用外部provider', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_erp_manual_release_review_decision_matrix', name: 'erp_manual_release_review_decision_matrix', desc: 'ERP Batch19逐表release decision矩阵；9张表均approved_ready_for_site_data_swap',
        updateFreq: '发布/导出前', upstream: ['erp_manual_release_review_record', 'erp_owner_approval_release_gate', 'tmp/exports/erp-manual-release-review-batch19-20260627/erp_manual_release_review_decision_matrix.csv'], downstream: ['erp_manual_release_review_swap_queue', 'source_registry', 'MarketPage', 'SelfInsight', 'ChannelInterviews', 'StoreInterviews', 'RegionCompetition'],
        fields: [
          { name: 'release_review_decision_id', type: 'VARCHAR(240)', desc: '逐表release review决策ID', source: 'Batch19脚本', required: true },
          { name: 'table_name', type: 'VARCHAR(160)', desc: '被放行的治理表，如market_trend_monthly或erp_channel_growth_snapshot', source: 'Batch9 promotion manifest', required: true },
          { name: 'surface', type: 'TEXT', desc: '页面或导出使用面', source: 'Batch19脚本', required: true },
          { name: 'source_ids', type: 'TEXT', desc: 'ds-047/ds-048/ds-049/ds-050/ds-051映射', source: 'source-registry', required: true },
          { name: 'owner_records_passed', type: 'INT', desc: '通过owner validation的记录数', source: 'Batch9 validator', required: true },
          { name: 'manual_can_export_decision', type: 'BOOLEAN', desc: 'manual review导出决定', source: 'manual release review', required: true },
          { name: 'manual_can_display_as_fact_decision', type: 'BOOLEAN', desc: 'manual review展示决定', source: 'manual release review', required: true },
          { name: 'can_export', type: 'BOOLEAN', desc: '当前true，仅限internal proxy CSV', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前true，仅限internal proxy', source: '证据门禁', required: true },
          { name: 'implementation_status', type: 'VARCHAR(120)', desc: 'pending_site_data_swap_and_verification或后续已应用状态', source: 'Batch19脚本', required: true },
        ],
      },
      {
        id: 't_erp_manual_release_review_swap_queue', name: 'erp_manual_release_review_swap_queue', desc: 'ERP Batch19 site data swap queue；把已放行表映射到页面和CSV导出',
        updateFreq: '本地site data swap时', upstream: ['erp_manual_release_review_decision_matrix', 'tmp/exports/erp-manual-release-review-batch19-20260627/erp_manual_release_review_swap_queue.csv'], downstream: ['market_trend_monthly', 'erp_sales_monthly_fact', 'erp_category_mapping', 'erp_channel_growth_snapshot', 'CSV exports'],
        fields: [
          { name: 'swap_queue_id', type: 'VARCHAR(220)', desc: 'site data swap队列ID', source: 'Batch19脚本', required: true },
          { name: 'table_name', type: 'VARCHAR(160)', desc: '目标表名', source: 'Batch19脚本', required: true },
          { name: 'surface', type: 'TEXT', desc: '页面或能力面', source: 'Batch19脚本', required: true },
          { name: 'evidence_artifact_path', type: 'TEXT', desc: '对应CSV或证据路径', source: 'Batch19脚本', required: true },
          { name: 'approved_for_display', type: 'BOOLEAN', desc: '当前true，仅限internal proxy', source: 'manual release review', required: true },
          { name: 'approved_for_export', type: 'BOOLEAN', desc: '当前true，仅限internal proxy CSV', source: 'manual release review', required: true },
          { name: 'target_status', type: 'VARCHAR(120)', desc: 'approved_internal_fact_source', source: 'Batch19脚本', required: true },
          { name: 'implementation_status', type: 'VARCHAR(120)', desc: '本地数据替换和验证状态', source: 'Batch19脚本', required: true },
          { name: 'blocking_reason', type: 'TEXT', desc: '生产部署或连接器刷新仍需单独授权时填写', source: '证据门禁', required: false },
        ],
      },
      {
        id: 't_erp_manual_release_review_boundary_audit', name: 'erp_manual_release_review_boundary_audit', desc: 'ERP Batch19证据边界审计；确认无provider call、生产写入、部署或禁用值命中',
        updateFreq: '每次manual release review', upstream: ['erp_manual_release_review_record', 'tmp/exports/erp-manual-release-review-batch19-20260627/erp_manual_release_review_boundary_audit.csv'], downstream: ['data_governance', 'release_gate', 'source_registry'],
        fields: [
          { name: 'boundary_id', type: 'VARCHAR(220)', desc: '边界审计ID', source: 'Batch19脚本', required: true },
          { name: 'checked_item', type: 'TEXT', desc: '检查项，如productionWrites/providerCalls/deployment', source: 'Batch19脚本', required: true },
          { name: 'expected_value', type: 'TEXT', desc: '期望边界值', source: '证据门禁', required: true },
          { name: 'observed_value', type: 'TEXT', desc: '实际观测值', source: 'Batch19脚本', required: true },
          { name: 'boundary_status', type: 'VARCHAR(80)', desc: 'passed或blocked', source: 'Batch19脚本', required: true },
          { name: 'evidence_grade', type: 'VARCHAR(40)', desc: 'L3-production-read-only', source: '证据门禁', required: true },
          { name: 'privacy_level', type: 'VARCHAR(40)', desc: 'private/internal', source: '证据门禁', required: true },
        ],
      },
    ],
  },
  {
    id: 'ai', name: 'AI辅助数据', icon: Sparkles, color: '#af52de', page: '/ai-assistant',
    desc: 'AI助手模块所需全部数据，覆盖dataset manifest、model run manifest、评论/VOC样本清单、eval队列、设计/图库run、资产hash、成本队列、商用审核门禁、报告队列、评论分析、设计助手、知识库、数据评论',
    sourceIds: dataCatalogSourceIds,
    tables: [
      {
        id: 't_ai_dataset_manifest', name: 'ai_dataset_manifest', desc: 'AI与报告输入数据集治理清单；Batch4仅为readiness gate',
        updateFreq: '每次采集', upstream: ['tmp/exports/ai-report-governance-batch4-20260625/ai_dataset_manifest.csv'], downstream: ['ai_model_run_manifest', 'report_generation_queue'],
        fields: [
          { name: 'dataset_id', type: 'VARCHAR(80)', desc: '数据集标识，如comments_voc_dataset或erp_context_dataset', source: 'Batch4治理脚本', required: true },
          { name: 'source_ids', type: 'TEXT', desc: 'source registry IDs，如ds-021/ds-030/ds-047', source: 'source-registry', required: true },
          { name: 'data_scope', type: 'TEXT', desc: '数据范围和输出契约；不包含原始评论正文或客户数据', source: 'Batch4治理脚本', required: true },
          { name: 'required_artifacts', type: 'TEXT', desc: '升级前所需证据包、hash、评估报告或审批记录', source: '证据门禁', required: true },
          { name: 'current_status', type: 'VARCHAR(120)', desc: 'blocked/metadata_only/gated_internal_proxy_available', source: 'Batch4治理脚本', required: true },
          { name: 'evidence_grade', type: 'VARCHAR(40)', desc: '当前L2-fixture-or-dry-run或L3只读上下文', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，不可作为AI结论或报告正文事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_model_run_manifest', name: 'ai_model_run_manifest', desc: 'AI模型运行审计清单；当前未接入真实模型调用日志',
        updateFreq: '每次模型运行', upstream: ['ai_dataset_manifest', 'tmp/exports/ai-report-governance-batch4-20260625/ai_model_run_manifest.csv'], downstream: ['ai_human_review_gate', 'comment_analysis_ai', 'design_assistant_output'],
        fields: [
          { name: 'model_run_id', type: 'VARCHAR(100)', desc: '模型运行契约标识，如comment_nlp_run', source: 'Batch4治理脚本', required: true },
          { name: 'surface', type: 'VARCHAR(160)', desc: '页面或能力面', source: 'Batch4治理脚本', required: true },
          { name: 'input_dataset_id', type: 'TEXT', desc: '输入数据集标识，不保存原始评论或prompt正文', source: 'ai_dataset_manifest', required: true },
          { name: 'model_name_status', type: 'VARCHAR(100)', desc: '模型版本状态，当前blocked_missing_model_version', source: '模型审计待接入', required: true },
          { name: 'prompt_version_status', type: 'VARCHAR(100)', desc: '提示词版本状态，当前blocked_missing_prompt_version', source: '模型审计待接入', required: true },
          { name: 'run_trace_status', type: 'VARCHAR(120)', desc: 'requestId和trace状态，当前blocked_missing_request_id_and_trace', source: '服务端审计待接入', required: true },
          { name: 'human_review_required', type: 'BOOLEAN', desc: '是否必须人工复核，当前true', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，模型输出不能作为事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_human_review_gate', name: 'ai_human_review_gate', desc: 'AI输出与报告结论人工复核门禁',
        updateFreq: '每次发布前', upstream: ['ai_model_run_manifest', 'tmp/exports/ai-report-governance-batch4-20260625/ai_human_review_gate.csv'], downstream: ['report_generation_queue', 'dashboard_kpi'],
        fields: [
          { name: 'review_gate_id', type: 'VARCHAR(100)', desc: '复核门禁标识', source: 'Batch4治理脚本', required: true },
          { name: 'surface', type: 'VARCHAR(180)', desc: '复核覆盖页面或报告类型', source: 'Batch4治理脚本', required: true },
          { name: 'required_review_roles', type: 'TEXT', desc: '所需复核角色', source: '证据门禁', required: true },
          { name: 'minimum_sample_contract', type: 'TEXT', desc: '最小抽样或一致率要求', source: '证据门禁', required: true },
          { name: 'approval_state', type: 'VARCHAR(60)', desc: '当前not_approved', source: '人工复核', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，未审批不可进入报告正文或CSV导出', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_report_generation_queue', name: 'report_generation_queue', desc: 'AI辅助报告生成队列；当前只登记待补证报告类型',
        updateFreq: '半月/按需', upstream: ['ai_dataset_manifest', 'ai_human_review_gate', 'tmp/exports/ai-report-governance-batch4-20260625/report_generation_queue.csv'], downstream: ['ReportsPage', 'ReportPreview'],
        fields: [
          { name: 'report_id', type: 'VARCHAR(100)', desc: '报告队列标识，如internal_ops_monthly', source: 'Batch4治理脚本', required: true },
          { name: 'report_type', type: 'VARCHAR(120)', desc: '报告类型', source: '报告治理', required: true },
          { name: 'source_ids', type: 'TEXT', desc: '上游source IDs', source: 'source-registry', required: true },
          { name: 'input_datasets', type: 'TEXT', desc: '输入数据集清单', source: 'ai_dataset_manifest', required: true },
          { name: 'output_artifact_status', type: 'VARCHAR(120)', desc: '输出产物状态，当前均为blocked', source: 'Batch4治理脚本', required: true },
          { name: 'can_generate', type: 'BOOLEAN', desc: '当前false，不生成正式报告正文', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，不展示为报告事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_erp_context_bridge', name: 'ai_erp_context_bridge', desc: 'ERP内部上下文到AI/报告的桥接规则；禁止越权推断',
        updateFreq: '月度', upstream: ['ds-035', 'ds-047', 'ds-049', 'ds-050', 'ds-051', 'tmp/exports/ai-report-governance-batch4-20260625/ai_erp_context_bridge.csv'], downstream: ['ai_dataset_manifest', 'report_generation_queue', 'design_assistant_output'],
        fields: [
          { name: 'bridge_id', type: 'VARCHAR(100)', desc: '桥接规则标识', source: 'Batch4治理脚本', required: true },
          { name: 'ai_surface', type: 'VARCHAR(180)', desc: 'AI或报告使用面', source: 'Batch4治理脚本', required: true },
          { name: 'erp_source_ids', type: 'TEXT', desc: 'ERP source IDs', source: 'source-registry', required: true },
          { name: 'allowed_use', type: 'TEXT', desc: '允许用途：采集优先级、brief约束或内部numerator上下文', source: '证据门禁', required: true },
          { name: 'forbidden_use', type: 'TEXT', desc: '禁止用途：用户情绪、评论数量、TAM/SAM/SOM、竞品份额或库存事实', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，桥接上下文不可单独作为事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_review_sample_manifest', name: 'ai_review_sample_manifest', desc: '评论/VOC/YouTube/Web样本清单；Batch5仅登记采集合同与缺口',
        updateFreq: '每次样本采集', upstream: ['ds-021', 'ds-023', 'ds-030', 'ds-031', 'ds-032', 'ds-033', 'tmp/exports/ai-review-governance-batch5-20260625/ai_review_sample_manifest.csv'], downstream: ['ai_review_eval_queue', 'ai_review_human_queue', 'comment_analysis_ai'],
        fields: [
          { name: 'sample_manifest_id', type: 'VARCHAR(120)', desc: '样本清单标识，如review_analysis_voc_model_sample', source: 'Batch5治理脚本', required: true },
          { name: 'surface', type: 'VARCHAR(80)', desc: '页面或能力面，如CommentData/YoutubeReview/FlavorMap', source: 'Batch5治理脚本', required: true },
          { name: 'source_ids', type: 'TEXT', desc: 'source registry IDs，如ds-021/ds-031/ds-032', source: 'source-registry', required: true },
          { name: 'sample_scope', type: 'TEXT', desc: '样本范围与采集合同；不包含原始评论正文', source: 'Batch5治理脚本', required: true },
          { name: 'sampling_window_status', type: 'VARCHAR(120)', desc: '样本窗口状态，当前均为blocked或待授权', source: '证据门禁', required: true },
          { name: 'raw_text_policy', type: 'VARCHAR(120)', desc: '原文策略，当前hash/summary/metadata优先，不导出正文', source: '隐私治理', required: true },
          { name: 'pii_policy', type: 'VARCHAR(120)', desc: 'PII处理策略，需脱敏或聚合后才能展示', source: '隐私治理', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，不可作为评论或VOC事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_review_eval_queue', name: 'ai_review_eval_queue', desc: '评论/VOC模型或规则评估队列；当前未接入真实模型评估报告',
        updateFreq: '每次模型/规则评估', upstream: ['ai_review_sample_manifest', 'tmp/exports/ai-review-governance-batch5-20260625/ai_review_eval_queue.csv'], downstream: ['ai_review_human_queue', 'ai_human_review_gate'],
        fields: [
          { name: 'eval_queue_id', type: 'VARCHAR(120)', desc: '评估队列标识', source: 'Batch5治理脚本', required: true },
          { name: 'sample_manifest_id', type: 'VARCHAR(120)', desc: '对应样本清单', source: 'ai_review_sample_manifest', required: true },
          { name: 'metric_contract', type: 'TEXT', desc: '评估指标契约，如准确率、召回率、一致率或合规覆盖率', source: '证据门禁', required: true },
          { name: 'model_version_status', type: 'VARCHAR(120)', desc: '模型或规则版本状态，当前blocked_missing_model_version', source: '模型审计待接入', required: true },
          { name: 'golden_set_status', type: 'VARCHAR(120)', desc: '人工标注或golden set状态，当前缺失', source: '人工复核', required: true },
          { name: 'request_trace_status', type: 'VARCHAR(120)', desc: 'requestId/jobId状态，当前缺失', source: '服务端审计待接入', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，评估未完成前模型输出不可展示为事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_review_human_queue', name: 'ai_review_human_queue', desc: '评论/VOC/YouTube/Web人工复核队列；发布前必须通过',
        updateFreq: '每次发布前', upstream: ['ai_review_eval_queue', 'tmp/exports/ai-review-governance-batch5-20260625/ai_review_human_queue.csv'], downstream: ['ai_review_publish_gate', 'ai_human_review_gate'],
        fields: [
          { name: 'review_task_id', type: 'VARCHAR(120)', desc: '人工复核任务ID', source: 'Batch5治理脚本', required: true },
          { name: 'eval_queue_id', type: 'VARCHAR(120)', desc: '对应评估队列ID', source: 'ai_review_eval_queue', required: true },
          { name: 'required_roles', type: 'TEXT', desc: '所需复核角色，如法务、用户研究、数据治理', source: '证据门禁', required: true },
          { name: 'minimum_review_contract', type: 'TEXT', desc: '最小复核样本或审批例外要求', source: '人工复核', required: true },
          { name: 'approval_state', type: 'VARCHAR(60)', desc: '当前not_approved', source: '人工复核', required: true },
          { name: 'can_publish', type: 'BOOLEAN', desc: '当前false，未审批不可发布', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，未审批不可作为事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_review_publish_gate', name: 'ai_review_publish_gate', desc: '评论/VOC/YouTube/Web发布门禁；阻断未补证的统计、趋势、评分和报告结论',
        updateFreq: '每次发布/导出前', upstream: ['ai_review_human_queue', 'tmp/exports/ai-review-governance-batch5-20260625/ai_review_publish_gate.csv'], downstream: ['ReviewAnalysis', 'CommentData', 'YoutubeReview', 'WebReview', 'FlavorMap', 'FlavorReport', 'ReportsPage'],
        fields: [
          { name: 'publish_gate_id', type: 'VARCHAR(120)', desc: '发布门禁ID', source: 'Batch5治理脚本', required: true },
          { name: 'surface', type: 'VARCHAR(80)', desc: '页面或能力面', source: 'Batch5治理脚本', required: true },
          { name: 'blocked_claim_types', type: 'TEXT', desc: '阻断的claim类型，如评论量、情绪百分比、趋势预测或站点评分', source: '证据门禁', required: true },
          { name: 'allowed_display', type: 'TEXT', desc: '允许展示内容：采集合同、缺失证据和阻断原因', source: '证据门禁', required: true },
          { name: 'forbidden_display', type: 'TEXT', desc: '禁止展示内容：真实KPI、平台事实、模型结论或报告建议', source: '证据门禁', required: true },
          { name: 'can_export', type: 'BOOLEAN', desc: '当前false，证据补齐前不得进入CSV或报告导出', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_design_run_manifest', name: 'ai_design_run_manifest', desc: '设计助手/AI图库生成请求治理清单；Batch6不含真实requestId或模型调用日志',
        updateFreq: '每次生成请求', upstream: ['ds-026', 'ds-029', 'ds-047', 'ds-049', 'tmp/exports/ai-design-governance-batch6-20260625/ai_design_run_manifest.csv'], downstream: ['ai_design_asset_hash_manifest', 'ai_design_cost_queue', 'design_assistant_output'],
        fields: [
          { name: 'design_run_id', type: 'VARCHAR(120)', desc: '生成运行契约标识，如design_assistant_generation_proxy', source: 'Batch6治理脚本', required: true },
          { name: 'surface', type: 'VARCHAR(120)', desc: '页面或能力面，如DesignAssistant/AIGallery', source: 'Batch6治理脚本', required: true },
          { name: 'source_ids', type: 'TEXT', desc: 'source registry IDs，如ds-026/ds-029/ds-047/ds-049', source: 'source-registry', required: true },
          { name: 'request_id_status', type: 'VARCHAR(120)', desc: 'requestId状态，当前blocked_missing_server_request_id', source: '服务端代理待接入', required: true },
          { name: 'model_version_status', type: 'VARCHAR(120)', desc: '模型版本状态，当前缺provider模型记录', source: '模型审计待接入', required: true },
          { name: 'prompt_version_status', type: 'VARCHAR(120)', desc: '提示词版本或hash状态，不保存提示词正文', source: '提示词治理', required: true },
          { name: 'parameter_hash_status', type: 'VARCHAR(120)', desc: '生成参数hash状态', source: '服务端审计待接入', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，不可作为真实生成历史或成本事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_design_asset_hash_manifest', name: 'ai_design_asset_hash_manifest', desc: '设计/图库资产hash与来源治理清单；不保存生成图片二进制',
        updateFreq: '每次素材入库', upstream: ['ai_design_run_manifest', 'tmp/exports/ai-design-governance-batch6-20260625/ai_design_asset_hash_manifest.csv'], downstream: ['ai_design_commercial_review_gate', 'ai_gallery'],
        fields: [
          { name: 'asset_manifest_id', type: 'VARCHAR(120)', desc: '资产清单ID，如gallery_local_asset_origin', source: 'Batch6治理脚本', required: true },
          { name: 'design_run_id', type: 'VARCHAR(120)', desc: '对应生成或入库run', source: 'ai_design_run_manifest', required: true },
          { name: 'asset_hash_status', type: 'VARCHAR(120)', desc: '最终资产hash状态，当前缺失', source: '资产治理', required: true },
          { name: 'source_asset_hash_status', type: 'VARCHAR(120)', desc: '源图/参考图hash状态，当前缺失或不适用', source: '资产治理', required: true },
          { name: 'prompt_hash_status', type: 'VARCHAR(120)', desc: 'prompt hash状态，不保存prompt正文', source: '提示词治理', required: true },
          { name: 'storage_policy', type: 'VARCHAR(120)', desc: '存储策略：只保存hash、路径或review metadata，不导出二进制', source: '隐私治理', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，未完成hash和来源记录前不可作为素材事实', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_design_cost_queue', name: 'ai_design_cost_queue', desc: '设计/图库生成成本审计队列；当前不含provider invoice或真实成本',
        updateFreq: '每次成本结算', upstream: ['ai_design_run_manifest', 'tmp/exports/ai-design-governance-batch6-20260625/ai_design_cost_queue.csv'], downstream: ['ai_design_commercial_review_gate', 'ReportsPage'],
        fields: [
          { name: 'cost_queue_id', type: 'VARCHAR(120)', desc: '成本队列ID', source: 'Batch6治理脚本', required: true },
          { name: 'design_run_id', type: 'VARCHAR(120)', desc: '对应生成run', source: 'ai_design_run_manifest', required: true },
          { name: 'provider_invoice_status', type: 'VARCHAR(120)', desc: '供应商账单状态，当前缺失', source: '财务审计待接入', required: true },
          { name: 'unit_cost_status', type: 'VARCHAR(120)', desc: '单位成本状态，当前缺失', source: '成本治理', required: true },
          { name: 'currency_policy_status', type: 'VARCHAR(120)', desc: '币种和汇率口径状态', source: '成本治理', required: true },
          { name: 'cost_charged', type: 'BOOLEAN', desc: '当前false，未发生或未登记真实扣费', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false，不能展示成本节省或ROI', source: '证据门禁', required: true },
        ],
      },
      {
        id: 't_ai_design_commercial_review_gate', name: 'ai_design_commercial_review_gate', desc: '设计/图库商用审核门禁；阻断未审批素材发布和导出',
        updateFreq: '每次素材发布前', upstream: ['ai_design_asset_hash_manifest', 'ai_design_cost_queue', 'tmp/exports/ai-design-governance-batch6-20260625/ai_design_commercial_review_gate.csv'], downstream: ['DesignAssistant', 'AIGallery', 'ReportsPage'],
        fields: [
          { name: 'review_gate_id', type: 'VARCHAR(120)', desc: '商用审核门禁ID', source: 'Batch6治理脚本', required: true },
          { name: 'asset_manifest_id', type: 'VARCHAR(120)', desc: '对应资产清单ID', source: 'ai_design_asset_hash_manifest', required: true },
          { name: 'required_roles', type: 'TEXT', desc: '所需审核角色，如品牌、法务、创意负责人', source: '证据门禁', required: true },
          { name: 'brand_review_status', type: 'VARCHAR(120)', desc: '品牌审核状态，当前缺失', source: '人工复核', required: true },
          { name: 'rights_status', type: 'VARCHAR(120)', desc: '版权/来源权利状态，当前缺失', source: '法务复核', required: true },
          { name: 'can_use_commercially', type: 'BOOLEAN', desc: '当前false，未审批不可商用', source: '证据门禁', required: true },
          { name: 'can_publish', type: 'BOOLEAN', desc: '当前false，未审批不可发布', source: '证据门禁', required: true },
          { name: 'can_display_as_fact', type: 'BOOLEAN', desc: '当前false', source: '证据门禁', required: true },
        ],
      },
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
  { from: '<span className="text-[#B5AFA8]">Amazon.com</span>', to: 'competitor_products', type: '连接器待接入' },
  { from: 'competitor_products', to: 'new_product_tracker', type: '派生计算' },
  { from: 'competitor_products', to: 'price_analysis', type: '派生计算' },
  { from: 'user_comments', to: 'comment_analysis_ai', type: 'AI分析' },
  { from: 'consumer_interviews', to: 'user_personas', type: '归纳提炼' },
  { from: 'user_personas', to: 'rfm_user_segments', type: '模型计算' },
  { from: '各国政府网站', to: 'policy_regulations', type: '公开来源复核' },
  { from: '内部ERP', to: 'momcozy_products', type: '系统同步' },
  { from: 'ERP销售/售后/零售渠道快照', to: 'erp_source_artifacts', type: '证据总账' },
  { from: 'erp_source_artifacts', to: 'erp_sales_monthly_fact', type: 'Batch19内部proxy事实' },
  { from: 'erp_source_artifacts', to: 'erp_retail_channel_monthly_fact', type: 'Batch19内部proxy事实' },
  { from: 'erp_product_sku_dim', to: 'erp_category_mapping', type: '品类归一' },
  { from: 'erp_field_dictionary', to: 'erp_display_approval_gate', type: '字段口径门禁' },
  { from: 'erp_category_mapping', to: 'category_analysis', type: '内部品类补充' },
  { from: 'erp_category_mapping', to: 'erp_category_review_queue', type: '品类人工复核' },
  { from: 'erp_category_review_queue', to: 'erp_display_approval_gate', type: '品类展示审批' },
  { from: 'erp_subtotal_reconciliation_queue', to: 'erp_display_approval_gate', type: '小计差异复核' },
  { from: 'erp_display_approval_gate', to: 'market_trend_monthly', type: 'ERP展示门禁' },
  { from: 'erp_display_approval_gate', to: 'dashboard_kpi', type: 'ERP事实发布门禁' },
  { from: 'erp_field_dictionary', to: 'erp_field_owner_approval_packet', type: '字段owner审批包' },
  { from: 'erp_category_review_queue', to: 'erp_category_owner_approval_packet', type: '品类owner审批包' },
  { from: 'erp_subtotal_reconciliation_queue', to: 'erp_subtotal_owner_explanation_packet', type: '小计解释审批包' },
  { from: 'erp_display_approval_gate', to: 'erp_display_approval_record_template', type: '展示审批记录模板' },
  { from: 'erp_display_approval_record_template', to: 'erp_owner_approval_backlog', type: '展示审批待办' },
  { from: 'erp_owner_approval_backlog', to: 'market_trend_monthly', type: 'ERP事实升级前置' },
  { from: 'erp_owner_approval_backlog', to: 'erp_owner_approval_intake_contract', type: '审批输入合同' },
  { from: 'erp_owner_approval_backlog', to: 'erp_owner_approval_record_input_template', type: 'owner记录回填模板' },
  { from: 'erp_owner_approval_intake_contract', to: 'erp_owner_approval_owner_packet_index', type: '审批包索引' },
  { from: 'erp_owner_approval_intake_contract', to: 'erp_owner_approval_required_evidence_matrix', type: '证据需求矩阵' },
  { from: 'erp_owner_approval_record_input_template', to: 'erp_owner_approval_preflight_result', type: '提交前预检' },
  { from: 'erp_owner_approval_record_input_template', to: 'erp_owner_approval_forbidden_value_scan', type: '禁用值扫描' },
  { from: 'erp_owner_approval_preflight_result', to: 'erp_owner_approval_batch9_handoff_queue', type: 'Batch9 handoff' },
  { from: 'erp_owner_approval_preflight_result', to: 'erp_owner_approval_release_preflight_summary', type: 'release预检汇总' },
  { from: 'erp_owner_approval_record_input_template', to: 'erp_owner_submission_schema_audit', type: 'owner提交schema审计' },
  { from: 'erp_owner_approval_record_input_template', to: 'erp_owner_submission_redaction_audit', type: 'owner提交脱敏审计' },
  { from: 'erp_owner_submission_schema_audit', to: 'erp_owner_submission_batch11_queue', type: 'Batch11预检队列候选' },
  { from: 'erp_owner_submission_redaction_audit', to: 'erp_owner_submission_batch11_queue', type: 'Batch11预检队列候选' },
  { from: 'erp_owner_submission_batch11_queue', to: 'erp_owner_approval_preflight_result', type: '真实提交预检' },
  { from: 'erp_owner_submission_release_readiness', to: 'erp_owner_approval_release_preflight_summary', type: '提交readiness汇总' },
  { from: 'erp_owner_approval_record_input_template', to: 'erp_owner_submission_packet_index', type: 'owner提交模板包' },
  { from: 'erp_owner_submission_packet_index', to: 'erp_owner_submission_template_manifest', type: '模板manifest' },
  { from: 'erp_owner_submission_template_manifest', to: 'erp_owner_submission_intake_inventory', type: '真实提交目录入口' },
  { from: 'erp_owner_submission_field_completion_checklist', to: 'erp_owner_submission_schema_audit', type: '字段补全检查' },
  { from: 'erp_owner_submission_release_packet_matrix', to: 'erp_owner_submission_release_readiness', type: 'release提交包映射' },
  { from: 'erp_owner_submission_handoff_guide', to: 'erp_owner_submission_intake_inventory', type: 'Batch12交接路径' },
  { from: 'erp_owner_submission_template_manifest', to: 'erp_owner_submission_dropbox_status', type: 'dropbox只读检查' },
  { from: 'erp_owner_submission_field_completion_checklist', to: 'erp_owner_submission_owner_action_queue', type: 'owner action queue' },
  { from: 'erp_owner_submission_template_manifest', to: 'erp_owner_submission_template_distribution', type: '模板分发清单' },
  { from: 'erp_owner_submission_release_packet_matrix', to: 'erp_owner_submission_release_watchlist', type: 'release watchlist' },
  { from: 'erp_owner_submission_command_runbook', to: 'erp_owner_submission_intake_inventory', type: 'Batch12命令入口' },
  { from: 'erp_owner_submission_release_watchlist', to: 'erp_owner_submission_release_readiness', type: '提交状态监控' },
  { from: 'erp_owner_submission_command_runbook', to: 'erp_owner_submission_acceptance_rulebook', type: 'acceptance规则入口' },
  { from: 'erp_owner_submission_owner_action_queue', to: 'erp_owner_submission_acceptance_result', type: 'owner提交接收检查' },
  { from: 'erp_owner_submission_field_completion_checklist', to: 'erp_owner_submission_evidence_uri_contract', type: '证据URI合同' },
  { from: 'erp_owner_submission_release_watchlist', to: 'erp_owner_submission_release_acceptance_matrix', type: 'release接收矩阵' },
  { from: 'erp_owner_submission_acceptance_result', to: 'erp_owner_submission_escalation_queue', type: 'owner升级队列' },
  { from: 'erp_owner_submission_acceptance_rulebook', to: 'erp_owner_submission_release_acceptance_matrix', type: 'release acceptance规则' },
  { from: 'erp_owner_approval_record_input_template', to: 'synthetic_owner_approval_records_batch16', type: 'synthetic fixture填充' },
  { from: 'synthetic_owner_approval_records_batch16', to: 'erp_owner_submission_synthetic_fixture_index', type: 'synthetic fixture索引' },
  { from: 'synthetic_owner_approval_records_batch16', to: 'erp_owner_submission_synthetic_record_fill_audit', type: 'synthetic填充审计' },
  { from: 'erp_owner_submission_synthetic_fixture_index', to: 'erp_owner_submission_synthetic_gate_plan', type: 'synthetic dry-run计划' },
  { from: 'erp_owner_submission_synthetic_gate_plan', to: 'erp_owner_submission_intake_inventory', type: 'Batch12 dry-run only' },
  { from: 'erp_owner_submission_synthetic_gate_plan', to: 'erp_owner_submission_synthetic_pipeline_run_matrix', type: 'Batch17 synthetic pipeline' },
  { from: 'erp_owner_submission_synthetic_pipeline_run_matrix', to: 'erp_owner_submission_synthetic_release_gate_matrix', type: 'synthetic release gate演练' },
  { from: 'erp_owner_submission_synthetic_pipeline_run_matrix', to: 'erp_owner_submission_synthetic_boundary_audit', type: 'L2边界审计' },
  { from: 'erp_owner_submission_synthetic_release_gate_matrix', to: 'erp_owner_submission_synthetic_boundary_audit', type: 'release gate边界审计' },
  { from: 'erp_owner_approval_record_input_template', to: 'erp_owner_real_submission_field_checklist', type: '真实owner回填清单' },
  { from: 'erp_owner_approval_required_evidence_matrix', to: 'erp_owner_real_submission_field_checklist', type: '必填证据映射' },
  { from: 'erp_owner_submission_release_acceptance_matrix', to: 'erp_owner_real_submission_release_gate_checklist', type: '真实release gate清单' },
  { from: 'erp_owner_submission_synthetic_boundary_audit', to: 'erp_owner_real_submission_boundary_audit', type: 'synthetic边界继承' },
  { from: 'erp_owner_real_submission_field_checklist', to: 'erp_owner_real_submission_swap_runbook', type: '真实CSV替换步骤' },
  { from: 'erp_owner_real_submission_release_gate_checklist', to: 'erp_owner_real_submission_swap_runbook', type: 'release gate替换步骤' },
  { from: 'erp_owner_real_submission_swap_runbook', to: 'erp_owner_submission_intake_inventory', type: '真实Batch12入口' },
  { from: 'erp_owner_real_submission_swap_runbook', to: 'erp_owner_approval_preflight_result', type: '真实Batch11入口' },
  { from: 'erp_owner_real_submission_swap_runbook', to: 'erp_owner_approval_validation_result', type: '真实Batch9入口' },
  { from: 'erp_owner_approval_record_input_template', to: 'erp_owner_approval_validation_result', type: '回填后校验' },
  { from: 'erp_owner_approval_submission_readiness', to: 'erp_owner_approval_release_gate', type: '提交readiness' },
  { from: 'erp_owner_approval_backlog', to: 'erp_owner_approval_validation_result', type: '审批记录校验' },
  { from: 'erp_owner_approval_validation_result', to: 'erp_owner_approval_release_gate', type: '发布门禁校验' },
  { from: 'erp_owner_approval_release_gate', to: 'erp_owner_approval_promotion_manifest', type: '事实升级候选' },
  // audit-source: ds-027 ds-047 ds-048 ds-049 ds-050 ds-051
  { from: 'erp_owner_approval_release_gate', to: 'erp_manual_release_review_record', type: 'Batch19人工release review' },
  { from: 'erp_owner_approval_promotion_manifest', to: 'erp_manual_release_review_decision_matrix', type: 'Batch19逐表决策' },
  { from: 'erp_manual_release_review_record', to: 'erp_manual_release_review_decision_matrix', type: 'manual review记录' },
  { from: 'erp_manual_release_review_decision_matrix', to: 'erp_manual_release_review_swap_queue', type: 'site data swap队列' },
  { from: 'erp_manual_release_review_record', to: 'erp_manual_release_review_boundary_audit', type: 'Batch19边界审计' },
  { from: 'erp_manual_release_review_swap_queue', to: 'market_trend_monthly', type: 'Batch19内部proxy放行' },
  { from: 'erp_manual_release_review_swap_queue', to: 'CSV exports', type: 'Batch19内部proxy导出' },
  { from: 'erp_owner_approval_release_gate', to: 'dashboard_kpi', type: 'ERP事实升级候选' },
  { from: 'erp_channel_growth_snapshot', to: 'channel_performance', type: '渠道增长补充' },
  { from: 'erp_channel_target_attainment', to: 'channel_performance', type: '目标达成补充' },
  { from: 'erp_channel_customer_dim', to: 'store_interviews', type: '渠道客户hash维表' },
  { from: 'erp_inventory_snapshot', to: 'supply_chain_nodes', type: '库存快照待授权' },
  { from: 'ai_dataset_manifest', to: 'ai_model_run_manifest', type: 'AI数据集门禁' },
  { from: 'ai_model_run_manifest', to: 'ai_human_review_gate', type: '模型运行复核' },
  { from: 'ai_human_review_gate', to: 'report_generation_queue', type: '报告生成审批' },
  { from: 'ai_erp_context_bridge', to: 'report_generation_queue', type: 'ERP上下文门禁' },
  { from: 'ai_review_sample_manifest', to: 'ai_review_eval_queue', type: '评论样本评估' },
  { from: 'ai_review_eval_queue', to: 'ai_review_human_queue', type: '模型/规则人工复核' },
  { from: 'ai_review_human_queue', to: 'ai_review_publish_gate', type: '发布审批门禁' },
  { from: 'ai_review_publish_gate', to: 'comment_analysis_ai', type: '评论/VOC事实展示门禁' },
  { from: 'ai_review_publish_gate', to: 'report_generation_queue', type: '报告引用门禁' },
  { from: 'ai_design_run_manifest', to: 'ai_design_asset_hash_manifest', type: '设计资产来源hash门禁' },
  { from: 'ai_design_run_manifest', to: 'ai_design_cost_queue', type: '设计生成成本审计' },
  { from: 'ai_design_asset_hash_manifest', to: 'ai_design_commercial_review_gate', type: '素材商用审核' },
  { from: 'ai_design_cost_queue', to: 'ai_design_commercial_review_gate', type: '成本/权利联审' },
  { from: 'ai_design_commercial_review_gate', to: 'design_assistant_output', type: '设计助手发布门禁' },
  { from: 'ai_design_commercial_review_gate', to: 'ai_gallery', type: 'AI图库发布门禁' },
  { from: 'ai_design_commercial_review_gate', to: 'report_generation_queue', type: '报告视觉资产门禁' },
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
  const {
    manifest: collectionManifest,
    path: collectionManifestPath,
    status: collectionManifestStatus,
    totals: collectionTotals,
    period: collectionPeriod,
    generatedAtText: collectionGeneratedAt,
    windowText: collectionWindow,
    nextScheduleText: nextSchedule,
  } = usePeriodicManifest();

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
            { tableId: '表ID', tableName: '表名', layer: '分层', scope: '范围', sensitivity: '敏感度', qualityScore: '质量分', status: '状态', owner: 'Owner', steward: 'Steward', freshness: '刷新状态', pii: 'PII', retention: '保留', upstream: '上游', downstream: '下游' },
            '数据治理报告_' + new Date().toISOString().slice(0, 10)
          )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all border border-[#EDE6DF]"><Download className="w-3.5 h-3.5" />治理报告</button>
        </div>

        {/* 半月采集刷新状态 */}
        <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
              {collectionManifestStatus === 'ready' ? <CheckCircle className="w-4 h-4 text-[#34c759]" /> : <AlertCircle className="w-4 h-4 text-[#ff9500]" />}
            </div>
            <div className="min-w-[240px]">
              <p className="text-xs font-semibold text-[#1d1d1f]">半月数据采集刷新</p>
              <p className="text-[10px] text-[#86868b]">
                {collectionManifestStatus === 'ready' ? `${collectionPeriod} · ${collectionGeneratedAt}` : collectionManifestStatus === 'loading' ? '正在读取 manifest' : '未生成 public/periodic-data/latest.json'}
              </p>
              {collectionManifestStatus === 'ready' ? <p className="text-[10px] text-[#B5AFA8]">{collectionWindow} · {nextSchedule}</p> : null}
            </div>
            {[
              { label: '公开来源成功', value: collectionTotals.ok ?? 0, color: '#34c759' },
              { label: '连接器待接入', value: collectionTotals['connector-required'] ?? 0, color: '#ff9500' },
              { label: '人工补录', value: collectionTotals['manual-required'] ?? 0, color: '#5856d6' },
              { label: '请求异常', value: (collectionTotals['source-error'] ?? 0) + (collectionTotals['fetch-error'] ?? 0), color: '#ff3b30' },
              { label: '未绑定registry页面', value: collectionManifest?.auditSummary?.pagesWithStaticDataWithoutRegistry ?? 0, color: '#C25B6E' },
            ].map((item) => (
              <div key={item.label} className="px-3 py-2 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF] min-w-[112px]">
                <p className="text-[10px] text-[#86868b]">{item.label}</p>
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
            <a href={collectionManifestPath} className="ml-auto text-[10px] font-medium text-[#5856d6] hover:text-[#C25B6E] transition-colors">
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
              { tableId: '表ID', layer: '分层', scope: '范围', sensitivity: '敏感度', status: '治理状态', owner: 'Owner', qualityScore: '质量分', freshness: '刷新状态' },
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
              {/* audit-source: ds-001 ds-002 ds-044 ds-045 ds-046 ds-027 */}
              <div className="p-3 rounded-xl bg-[#ff3b30]/5 border border-[#ff3b30]/10">
                <p className="text-[10px] text-[#ff3b30] font-semibold mb-1">关键路径：市场规模测算</p>
                <p className="text-[10px] text-[#86868b]">外部研报 → market_size_global → market_trend_monthly → dashboard_kpi<br/>此路径影响首页KPI和市场层级/份额分母展示，优先级P0</p>
              </div>
              {/* audit-source: ds-007 ds-009 ds-010 */}
              <div className="p-3 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/10">
                <p className="text-[10px] text-[#ff9500] font-semibold mb-1">关键路径：竞品情报</p>
                <p className="text-[10px] text-[#86868b]">Amazon API → competitor_products → price_analysis + new_product_tracker<br/>此路径影响竞品库和价格监测，优先级P0；采集任务、时间戳和平台授权待复核。</p>
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
                      {['数据表', '分层', '范围', '敏感度', '质量分', 'Owner', 'Steward', '状态', '刷新状态', 'PII', '保留策略'].map((h, i) => (
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
	                            <td className="py-2 px-3"><span className="inline-flex max-w-[120px] truncate rounded bg-[#FBF8F5] px-1.5 py-0.5 text-[9px] font-medium text-[#6E625D]" title={g.freshness}>{g.freshness}</span></td>
	                            <td className="py-2 px-3">{g.pii ? <Lock className="w-3.5 h-3.5 text-[#ff3b30]" /> : <span className="text-[10px] text-[#B5AFA8]">-</span>}</td>
                            <td className="py-2 px-3 text-[10px] text-[#86868b]">{g.retention}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {/* R23: 样例治理记录 */}
              <div className="mt-4 p-4 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#5856d6]" /> 样例治理记录</h4>
                  <span className="text-[9px] text-[#86868b]">{changeHistory.length}条记录 · 非真实刷新日志</span>
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
          {/* audit-source: ds-027 */}
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
              <p>{totalTables}张数据表覆盖当前网站核心页面的数据需求。从市场规模和份额分母测算到单条评论的情感分析，从全球政策追踪到AI设计助手的Prompt记录，确保工作台数据持续按当前资产目录校准。</p>
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
