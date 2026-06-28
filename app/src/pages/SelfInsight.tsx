import { useState } from 'react';
import { ClipboardCheck, Eye, FileLock2, Megaphone, Package, ShieldAlert, Target, Truck } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import {
  erpBatch2DisplayPolicy,
  erpBatch3DisplayPolicy,
  erpBatch7DisplayPolicy,
  erpBatch8ApprovalPolicy,
  erpBatch9IntakePolicy,
  erpBatch10TemplatePolicy,
  erpBatch11PreflightPolicy,
  erpBatch12SubmissionPolicy,
  erpBatch13SubmissionPackPolicy,
  erpBatch14DropboxWatchlistPolicy,
  erpBatch15AcceptanceGatePolicy,
  erpBatch16SyntheticFixturePolicy,
  erpChannelCustomerProxySummary,
  erpChannelGrowthSnapshot,
  erpChannelTargetAttainment,
  erpCategoryProxySummary,
  erpDerivedBatch2Artifact,
  erpDerivedBatch3Artifact,
  erpFieldDictionaryCoverageSummary,
  erpGovernanceBatch7Artifact,
  erpOwnerApprovalBatch8Artifact,
  erpOwnerApprovalIntakeBatch9Artifact,
  erpOwnerApprovalIntakeValidationSummary,
  erpOwnerApprovalLaneSummary,
  erpOwnerApprovalTemplateBatch10Artifact,
  erpOwnerApprovalTemplateBatch10Summary,
  erpOwnerApprovalPreflightBatch11Artifact,
  erpOwnerApprovalPreflightBatch11Summary,
  erpOwnerSubmissionIntakeBatch12Artifact,
  erpOwnerSubmissionIntakeBatch12Summary,
  erpOwnerSubmissionPackBatch13Artifact,
  erpOwnerSubmissionPackBatch13Summary,
  erpOwnerSubmissionDropboxBatch14Artifact,
  erpOwnerSubmissionDropboxBatch14Summary,
  erpOwnerSubmissionAcceptanceBatch15Artifact,
  erpOwnerSubmissionAcceptanceBatch15Summary,
  erpOwnerSubmissionSyntheticBatch16Artifact,
  erpOwnerSubmissionSyntheticBatch16Summary,
  erpOwnerSubmissionSyntheticPipelineBatch17Artifact,
  erpOwnerSubmissionSyntheticPipelineBatch17Summary,
  erpBatch17SyntheticPipelinePolicy,
  erpOwnerSubmissionRealOwnerChecklistBatch18Artifact,
  erpOwnerSubmissionRealOwnerChecklistBatch18Summary,
  erpBatch18RealOwnerChecklistPolicy,
  erpManualReleaseReviewBatch19Artifact,
  erpManualReleaseReviewBatch19Summary,
  erpBatch19ApprovedTables,
  erpBatch19ManualReleasePolicy,
  erpSubtotalReconciliationSummary,
} from '@/data/market-insight-data';

const tabs = [
  { id: 'overview', label: '总览', icon: <Eye className="w-4 h-4" /> },
  { id: 'product', label: '产品', icon: <Package className="w-4 h-4" /> },
  { id: 'place', label: '渠道', icon: <Truck className="w-4 h-4" /> },
  { id: 'promotion', label: '推广', icon: <Megaphone className="w-4 h-4" /> },
];

const governanceByTab: Record<string, Array<{ title: string; state: string; detail: string }>> = {
  overview: [
    { title: '战略结论', state: '待复核', detail: '拆分内部经营、平台公开信息和主观判断，不再混写成事实。' },
    { title: '综合看板', state: 'ERP内部代理已放行', detail: 'ds-047/ds-050/ds-051 可补内部销量、渠道增长和目标达成；公开份额和主观象限仍待复核。' },
  ],
  product: [
    { title: '产品矩阵', state: '待校准', detail: '产品象限需要内部营收快照和外部份额依据共同支撑。' },
    { title: '品类生态', state: '待归档', detail: '品类覆盖范围需要产品主数据和上架状态作为证据。' },
  ],
  place: [
    { title: '渠道结构', state: 'ERP内部代理已放行', detail: 'ERP渠道hash和YTD代理可展示；平台、独立站、零售和社交电商仍需拆分为独立来源。' },
    { title: '区域策略', state: '份额待授权', detail: '内部numerator已可展示，区域份额仍需要国家/平台/渠道分母。' },
  ],
  promotion: [
    { title: '投放表现', state: '待授权', detail: 'ROAS、达人覆盖和线索数据必须来自广告或社媒后台快照。' },
    { title: '活动复盘', state: '待证据', detail: '活动结果需要素材、投放、销售或互动证据闭环。' },
  ],
};

const blockedExports = ['BCG矩阵导出', '竞品价格带导出', '营销框架导出', '渠道结构导出'];

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatUsdMillions(value: number) {
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

export default function SelfInsight() {
  const [activeTab, setActiveTab] = useState('overview');
  const activeTasks = governanceByTab[activeTab] ?? governanceByTab.overview;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm">
                <Target className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#1d1d1f]">看自己</h1>
                <p className="text-xs text-[#86868b]">ERP内部代理已通过Batch19 · 公开份额、平台数据与主观测算仍待拆分</p>
              </div>
            </div>
            <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg">
              <span className="text-[#B5AFA8]">展示状态：</span>ERP proxy 本地已放行
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] hover:text-[#1d1d1f]'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <PageEvidenceNotice
          sourceIds={['ds-019', 'ds-020', 'ds-047', 'ds-050', 'ds-051']}
          title="自我诊断来源口径"
          description="营销组合诊断混合内部经营、平台信息和主观测算；ERP销售统计、全渠道增长和目标达成已通过Batch19作为 private/internal proxy 展示和导出。公开市场份额、竞品份额、投放表现和主观象限仍需单独证据。"
        />

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP高价值表格治理沉淀</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                Batch {erpDerivedBatch2Artifact.batchId} 已生成 DataManage 可登记的事实表/维表；source ids: {erpDerivedBatch2Artifact.sourceIds.join(' / ')}；Batch19已放行为内部proxy，canDisplayAsFact=true。
              </p>
            </div>
            <span className="rounded-lg bg-[#34c759]/10 px-3 py-1.5 text-[10px] font-medium text-[#2f7d32]">
              {erpDerivedBatch2Artifact.evidenceGrade} · {erpDerivedBatch2Artifact.privacyLevel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">SKU hash 维表</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpDerivedBatch2Artifact.summary.skuHashRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">品类映射行</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpDerivedBatch2Artifact.summary.categoryMappingRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">月度事实行</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpDerivedBatch2Artifact.summary.monthlyFactRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">未映射 SKU hash</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpDerivedBatch2Artifact.summary.unmappedSkuRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">治理表</th>
                  <th className="py-2 font-medium">页面用途</th>
                  <th className="py-2 font-medium">当前边界</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { table: 'erp_product_sku_dim', use: '产品/SKU hash 主数据，支撑产品矩阵和品类映射', boundary: '不含原始 SKU 或产品名' },
                  { table: 'erp_category_mapping', use: '品类代理映射，支撑 /market/mtl、/market/category、/self', boundary: '关键词代理，Batch19 internal proxy' },
                  { table: 'erp_sales_monthly_fact', use: '电商销售月度内部代理', boundary: '不可写成GMV、份额、TAM/SAM/SOM' },
                  { table: 'erp_after_sales_monthly_fact', use: '售后销量月度内部代理', boundary: 'Batch19 internal proxy' },
                  { table: 'erp_retail_channel_monthly_fact', use: '零售与渠道可见月度代理', boundary: '来源为页面可见列，需字段字典确认' },
                  { table: 'erp_category_monthly_proxy', use: '品类内部组合代理', boundary: '不是外部市场份额' },
                ].map((row) => (
                  <tr key={row.table} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.table}</td>
                    <td className="py-2 text-[#86868b]">{row.use}</td>
                    <td className="py-2 text-[#2f7d32]">{row.boundary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#EDE6DF] pt-3 md:grid-cols-3">
            {erpBatch2DisplayPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-[#86868b]">
            当前可补充页面：/market/mtl 读取 {formatNumber(erpCategoryProxySummary[0]?.skuHashCount ?? 0)} 个吸奶器代理 SKU hash；/market/category 读取 {formatNumber(erpCategoryProxySummary.length)} 个品类代理；/self 展示内部经营 proxy 和治理状态。
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 3 全渠道执行 proxy · Batch19已放行</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                Batch {erpDerivedBatch3Artifact.batchId}；source ids: {erpDerivedBatch3Artifact.sourceIds.join(' / ')}；{erpDerivedBatch3Artifact.evidenceGrade}；{erpDerivedBatch3Artifact.privacyLevel}；canDisplayAsFact=true；仅限内部proxy。
              </p>
            </div>
            <span className="rounded-lg bg-[#34c759]/10 px-3 py-1.5 text-[10px] font-medium text-[#2f7d32]">
              internal numerator · 非 TAM/SAM/SOM
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs lg:grid-cols-5">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">YTD 实际销售额代理</p>
              <p className="font-semibold text-[#1d1d1f]">{formatUsdMillions(erpChannelGrowthSnapshot.actualSalesUsd)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">YTD 实际销量代理</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpChannelGrowthSnapshot.actualUnits)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">销售增长代理</p>
              <p className="font-semibold text-[#1d1d1f]">{erpChannelGrowthSnapshot.salesGrowthPct.toFixed(2)}%</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">销售额达成代理</p>
              <p className="font-semibold text-[#1d1d1f]">{erpChannelTargetAttainment.salesAttainmentPct.toFixed(2)}%</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">销量达成代理</p>
              <p className="font-semibold text-[#1d1d1f]">{erpChannelTargetAttainment.unitsAttainmentPct.toFixed(2)}%</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#EDE6DF] pt-3 md:grid-cols-4">
            {[
              `渠道/客户hash组合 ${formatNumber(erpChannelCustomerProxySummary.channelCustomerHashRows)} 行`,
              `目的仓月度代理 ${formatNumber(erpChannelCustomerProxySummary.destinationMonthlyRows)} 行`,
              `top hash组合代理量 ${formatNumber(erpChannelCustomerProxySummary.topChannelCustomerVisibleProxyUnits)}`,
              `库存readiness字段 ${formatNumber(erpChannelCustomerProxySummary.inventoryReadinessRows)} 项仍阻断`,
            ].map((item) => (
              <p key={item} className="text-[10px] leading-relaxed text-[#86868b]">{item}</p>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {erpBatch3DisplayPolicy.map((policy) => (
              <p key={policy} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3 text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 7 字段字典与展示审批门禁 · 历史治理层</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                {erpGovernanceBatch7Artifact.manifestPath}；source ids: {erpGovernanceBatch7Artifact.sourceIds.join(' / ')}；Batch7 blocked rows {formatNumber(erpGovernanceBatch7Artifact.summary.blockedRows)}；当前放行由Batch19承担。
              </p>
            </div>
            <span className="rounded-lg bg-[#34c759]/10 px-3 py-1.5 text-[10px] font-medium text-[#2f7d32]">
              superseded by Batch19
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">字段字典 readiness</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpGovernanceBatch7Artifact.summary.fieldDictionaryRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">品类复核任务</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpGovernanceBatch7Artifact.summary.categoryReviewRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">展示审批 gate</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpGovernanceBatch7Artifact.summary.displayApprovalRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">未解小计差异</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpGovernanceBatch7Artifact.summary.unresolvedSubtotalRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">source</th>
                  <th className="py-2 font-medium">覆盖表</th>
                  <th className="py-2 font-medium">字段数</th>
                  <th className="py-2 font-medium">阻断原因</th>
                </tr>
              </thead>
              <tbody>
                {erpFieldDictionaryCoverageSummary.map((row) => (
                  <tr key={row.sourceId} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.sourceId}</td>
                    <td className="py-2 text-[#86868b]">{row.tableName}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.fieldRows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {erpSubtotalReconciliationSummary.map((row) => (
              <p key={`${row.sourceId}-${row.affectedTable}`} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3 text-[10px] leading-relaxed text-[#86868b]">
                {row.sourceId} · {row.affectedTable}: delta {formatNumber(row.deltaUnits)} · {row.status}
              </p>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch7DisplayPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 8 owner approval packets</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                {erpOwnerApprovalBatch8Artifact.manifestPath}；upstream {erpOwnerApprovalBatch8Artifact.upstreamBatchId}；Batch8 remaining blocked {formatNumber(erpOwnerApprovalBatch8Artifact.summary.remainingBlockedRows)}；当前放行由Batch19承担。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              approvals applied {erpOwnerApprovalBatch8Artifact.summary.approvalRecordsApplied}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">字段审批包</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalBatch8Artifact.summary.fieldOwnerPackets)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">品类审批包</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalBatch8Artifact.summary.categoryOwnerPackets)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">展示审批模板</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalBatch8Artifact.summary.displayApprovalTemplates)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">可升级事实行</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalBatch8Artifact.summary.readyToDisplayRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">lane</th>
                  <th className="py-2 font-medium">packet</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">owner</th>
                  <th className="py-2 font-medium">status</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerApprovalLaneSummary.map((row) => (
                  <tr key={row.lane} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.lane}</td>
                    <td className="py-2 text-[#86868b]">{row.packet}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#86868b]">{row.ownerRole}</td>
                    <td className="py-2 text-[#a85f00]">{row.currentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch8ApprovalPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 9 approval intake validation</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                {erpOwnerApprovalIntakeBatch9Artifact.manifestPath}；upstream {erpOwnerApprovalIntakeBatch9Artifact.upstreamBatchId}；approval input rows {formatNumber(erpOwnerApprovalIntakeBatch9Artifact.approvalRecordsInputRows)}；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              validationPassed={String(erpOwnerApprovalIntakeBatch9Artifact.summary.validationPassed)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">校验行</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalIntakeBatch9Artifact.summary.validationRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">阻断校验</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalIntakeBatch9Artifact.summary.blockedValidationRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">release gates</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalIntakeBatch9Artifact.summary.releaseGateRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">promotion候选</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalIntakeBatch9Artifact.summary.promotionCandidateRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerApprovalIntakeValidationSummary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch9IntakePolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 10 owner record fill pack</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                {erpOwnerApprovalTemplateBatch10Artifact.manifestPath}；upstream {erpOwnerApprovalTemplateBatch10Artifact.upstreamBatchIds.join(' / ')}；submitted owner records {formatNumber(erpOwnerApprovalTemplateBatch10Artifact.submittedOwnerRecords)}；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              templateOnly=true
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">模板行</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalTemplateBatch10Artifact.summary.approvalRecordTemplateRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">空decision</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalTemplateBatch10Artifact.summary.blankDecisionRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">submission readiness</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalTemplateBatch10Artifact.summary.submissionReadinessRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">ready to validate</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalTemplateBatch10Artifact.summary.readyToValidateRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerApprovalTemplateBatch10Summary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch10TemplatePolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 11 owner record preflight</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                {erpOwnerApprovalPreflightBatch11Artifact.manifestPath}；upstream {erpOwnerApprovalPreflightBatch11Artifact.upstreamBatchId}；ready for Batch9 {formatNumber(erpOwnerApprovalPreflightBatch11Artifact.summary.readyForBatch9Rows)}；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              handoffRows={formatNumber(erpOwnerApprovalPreflightBatch11Artifact.summary.batch9HandoffRows)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">预检行</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalPreflightBatch11Artifact.summary.preflightRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">阻断预检</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalPreflightBatch11Artifact.summary.blockedPreflightRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">raw scan hits</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalPreflightBatch11Artifact.summary.forbiddenHitRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">release preflight</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerApprovalPreflightBatch11Artifact.summary.releasePreflightRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerApprovalPreflightBatch11Summary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch11PreflightPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 12 owner submission intake</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                {erpOwnerSubmissionIntakeBatch12Artifact.manifestPath}；submissionDir {erpOwnerSubmissionIntakeBatch12Artifact.submissionDir}；queue for Batch11 {formatNumber(erpOwnerSubmissionIntakeBatch12Artifact.summary.batch11QueueRows)}；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              csvFiles={formatNumber(erpOwnerSubmissionIntakeBatch12Artifact.summary.submissionCsvFiles)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">expected records</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionIntakeBatch12Artifact.summary.expectedApprovalRecords)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">submitted records</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionIntakeBatch12Artifact.summary.submittedApprovalRecords)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">schema ready</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionIntakeBatch12Artifact.summary.schemaReadyRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">Batch11 queue</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionIntakeBatch12Artifact.summary.batch11QueueRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerSubmissionIntakeBatch12Summary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch12SubmissionPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 13 owner submission pack</h2>
              <p className="text-[10px] text-[#86868b] mt-1 break-all">
                {erpOwnerSubmissionPackBatch13Artifact.manifestPath}；templateDir {erpOwnerSubmissionPackBatch13Artifact.templateDir}；targetSubmissionDir {erpOwnerSubmissionPackBatch13Artifact.targetSubmissionDir}；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              templateFiles={formatNumber(erpOwnerSubmissionPackBatch13Artifact.summary.templateFiles)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">combined rows</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionPackBatch13Artifact.summary.combinedTemplateRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">lane rows</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionPackBatch13Artifact.summary.laneTemplateRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">checklist rows</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionPackBatch13Artifact.summary.checklistRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">ready for Batch12</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionPackBatch13Artifact.summary.readyForBatch12Rows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerSubmissionPackBatch13Summary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch13SubmissionPackPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 14 owner submission dropbox</h2>
              <p className="text-[10px] text-[#86868b] mt-1 break-all">
                {erpOwnerSubmissionDropboxBatch14Artifact.manifestPath}；targetSubmissionDir {erpOwnerSubmissionDropboxBatch14Artifact.targetSubmissionDir}；watchlist only；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              csvFiles={formatNumber(erpOwnerSubmissionDropboxBatch14Artifact.summary.submissionCsvFiles)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">owner actions</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionDropboxBatch14Artifact.summary.ownerActionRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">release watches</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionDropboxBatch14Artifact.summary.releaseWatchlistRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">ready for Batch12</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionDropboxBatch14Artifact.summary.readyForBatch12Rows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">Batch11 queue</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionDropboxBatch14Artifact.summary.batch11QueueRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerSubmissionDropboxBatch14Summary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch14DropboxWatchlistPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 15 owner submission acceptance</h2>
              <p className="text-[10px] text-[#86868b] mt-1 break-all">
                {erpOwnerSubmissionAcceptanceBatch15Artifact.manifestPath}；targetSubmissionDir {erpOwnerSubmissionAcceptanceBatch15Artifact.targetSubmissionDir}；acceptance gate；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              acceptedRecords={formatNumber(erpOwnerSubmissionAcceptanceBatch15Artifact.summary.acceptedOwnerRecords)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">acceptance rows</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionAcceptanceBatch15Artifact.summary.acceptanceResultRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">URI contracts</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionAcceptanceBatch15Artifact.summary.evidenceUriContractRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">release gates</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionAcceptanceBatch15Artifact.summary.releaseAcceptanceRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">ready for Batch12</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionAcceptanceBatch15Artifact.summary.readyForBatch12Rows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerSubmissionAcceptanceBatch15Summary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch15AcceptanceGatePolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 16 synthetic owner submission fixture</h2>
              <p className="text-[10px] text-[#86868b] mt-1 break-all">
                {erpOwnerSubmissionSyntheticBatch16Artifact.manifestPath}；syntheticInputDir {erpOwnerSubmissionSyntheticBatch16Artifact.syntheticInputDir}；{erpOwnerSubmissionSyntheticBatch16Artifact.evidenceGrade}；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              syntheticRows={formatNumber(erpOwnerSubmissionSyntheticBatch16Artifact.summary.syntheticRecordRows)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">Batch12 schema</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionSyntheticBatch16Artifact.summary.batch12SchemaReadyRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">Batch11 ready</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionSyntheticBatch16Artifact.summary.batch11ReadyRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">Batch9 validation</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionSyntheticBatch16Artifact.summary.batch9PassedValidationRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">promotion rows</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionSyntheticBatch16Artifact.summary.promotionCandidateRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerSubmissionSyntheticBatch16Summary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch16SyntheticFixturePolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 17 synthetic owner submission pipeline</h2>
              <p className="text-[10px] text-[#86868b] mt-1 break-all">
                {erpOwnerSubmissionSyntheticPipelineBatch17Artifact.manifestPath}；syntheticInputDir {erpOwnerSubmissionSyntheticPipelineBatch17Artifact.syntheticInputDir}；{erpOwnerSubmissionSyntheticPipelineBatch17Artifact.evidenceGrade}；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              stages={formatNumber(erpOwnerSubmissionSyntheticPipelineBatch17Artifact.summary.pipelineStageRows)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">Batch12 queue</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionSyntheticPipelineBatch17Artifact.summary.batch12QueueRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">Batch11 handoff</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionSyntheticPipelineBatch17Artifact.summary.batch11HandoffRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">release gates</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionSyntheticPipelineBatch17Artifact.summary.batch9ReadyReleaseGateRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">display/export</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionSyntheticPipelineBatch17Artifact.summary.readyToDisplayRows)}/{formatNumber(erpOwnerSubmissionSyntheticPipelineBatch17Artifact.summary.readyToExportRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerSubmissionSyntheticPipelineBatch17Summary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch17SyntheticPipelinePolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 18 real owner submission checklist</h2>
              <p className="text-[10px] text-[#86868b] mt-1 break-all">
                {erpOwnerSubmissionRealOwnerChecklistBatch18Artifact.manifestPath}；targetSubmissionDir {erpOwnerSubmissionRealOwnerChecklistBatch18Artifact.targetSubmissionDir}；{erpOwnerSubmissionRealOwnerChecklistBatch18Artifact.evidenceGrade}；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              checklistRows={formatNumber(erpOwnerSubmissionRealOwnerChecklistBatch18Artifact.summary.fieldChecklistRows)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">release gates</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionRealOwnerChecklistBatch18Artifact.summary.releaseGateChecklistRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">runbook steps</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionRealOwnerChecklistBatch18Artifact.summary.swapRunbookRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">real accepted</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionRealOwnerChecklistBatch18Artifact.summary.realOwnerRecordsAccepted)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">display/export</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpOwnerSubmissionRealOwnerChecklistBatch18Artifact.summary.readyToDisplayRows)}/{formatNumber(erpOwnerSubmissionRealOwnerChecklistBatch18Artifact.summary.readyToExportRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpOwnerSubmissionRealOwnerChecklistBatch18Summary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch18RealOwnerChecklistPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP Batch 19 manual release review</h2>
              <p className="text-[10px] text-[#86868b] mt-1 break-all">
                {erpManualReleaseReviewBatch19Artifact.manifestPath}；ownerRecords {erpManualReleaseReviewBatch19Artifact.ownerRecordsPath}；reviewRecord {erpManualReleaseReviewBatch19Artifact.reviewRecordPath}。
              </p>
            </div>
            <span className="rounded-lg bg-[#34c759]/10 px-3 py-1.5 text-[10px] font-medium text-[#2f7d32]">
              display/export approved={formatNumber(erpManualReleaseReviewBatch19Artifact.summary.approvedForDisplayRows)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">release gates</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpManualReleaseReviewBatch19Artifact.summary.releaseGateRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">promotion candidates</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpManualReleaseReviewBatch19Artifact.summary.promotionCandidateRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">owner records</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpManualReleaseReviewBatch19Artifact.summary.ownerRecordRows)}</p>
            </div>
            <div className="border-b border-[#EDE6DF] pb-2">
              <p className="text-[10px] text-[#86868b]">boundary hits</p>
              <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpManualReleaseReviewBatch19Artifact.summary.forbiddenHitRows)}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">artifact</th>
                  <th className="py-2 font-medium">rows</th>
                  <th className="py-2 font-medium">status</th>
                  <th className="py-2 font-medium">meaning</th>
                </tr>
              </thead>
              <tbody>
                {erpManualReleaseReviewBatch19Summary.map((row) => (
                  <tr key={row.artifact} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.artifact}</td>
                    <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rows)}</td>
                    <td className="py-2 text-[#2f7d32]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {erpBatch19ApprovedTables.map((table) => (
              <span key={table} className="rounded-lg border border-[#34c759]/20 bg-[#34c759]/10 px-3 py-1.5 text-[10px] font-medium text-[#2f7d32]">
                {table}
              </span>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {erpBatch19ManualReleasePolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-4 h-4 text-[#C25B6E]" />
              <h2 className="text-sm font-semibold text-[#1d1d1f]">当前页签治理任务</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeTasks.map((task) => (
                <div key={task.title} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-4">
                  <p className="text-xs font-semibold text-[#1d1d1f] mb-1">{task.title}</p>
                  <p className="text-[11px] text-[#ff9500] font-medium mb-1">{task.state}</p>
                  <p className="text-[11px] text-[#86868b] leading-relaxed">{task.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-[#ff9500]" />
              <h2 className="text-sm font-semibold text-[#1d1d1f]">页面保护规则</h2>
            </div>
            <div className="space-y-3">
              {[
                'ERP内部proxy已放行，但不得升级为GMV、公开营收、价格、投放效果或渠道占比。',
                'ERP proxy只能补自有经营 numerator、目标达成和渠道趋势，不能写成外部市场份额。',
                '主观象限判断不得导出为真实产品矩阵。',
                '公开网页信息不得替代平台后台或财务快照。',
                '恢复任一图表前必须通过深度审计矩阵。',
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-2 text-[11px] text-[#86868b] leading-relaxed">
                  <FileLock2 className="w-3.5 h-3.5 text-[#ff9500] flex-shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-center gap-2 mb-4">
            <FileLock2 className="w-4 h-4 text-[#C25B6E]" />
            <h2 className="text-sm font-semibold text-[#1d1d1f]">仍暂停的非ERP导出能力</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {blockedExports.map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] border border-[#EDE6DF]">
                {item}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-[#86868b] mt-4 leading-relaxed">
            ERP内部proxy已由Batch19放行展示和CSV导出。其他公开证据、平台快照和主观分析仍需拆成不同 evidence grade，再分别决定是否可展示为事实。
          </p>
        </div>
      </div>
    </div>
  );
}
