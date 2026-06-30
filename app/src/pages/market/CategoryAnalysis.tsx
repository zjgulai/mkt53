import { FileBarChart } from 'lucide-react';
import MarketDataGate from '@/components/MarketDataGate';
import {
  erpBatch2DisplayPolicy,
  erpBatch7DisplayPolicy,
  erpBatch8ApprovalPolicy,
  erpCategoryProxySummary,
  erpCategoryReviewQueueSummary,
  erpDerivedBatch2Artifact,
  erpFieldDictionaryCoverageSummary,
  erpGovernanceBatch7Artifact,
  erpOwnerApprovalBatch8Artifact,
  erpOwnerApprovalLaneSummary,
} from '@/data/market-insight-data';

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function priorityLabel(priority?: string) {
  return priority === 'P0' ? 'urgent review' : 'standard review';
}

export default function CategoryAnalysis() {
  return (
    <MarketDataGate
      title="品类分析"
      subtitle="品类规模 · 增速 · 毛利口径 · 竞争强度"
      icon={FileBarChart}
      accent="#C25B6E"
      sourceIds={['ds-038']}
      evidenceTitle="品类分析待补测算依据"
      evidenceDescription="品类规模、增长、利润率、竞争强度和 Momcozy 排名仍需要补齐权重公式、BSR 快照、行业报告来源和字段口径；外部规模、份额或排名仍不得用内部代理替代。"
      gateStatus={{
        sourceIds: ['ds-047', 'ds-048', 'ds-049'],
        label: 'ERP内部代理已放行，外部品类结论待复核',
        tone: 'approved',
        description: '已放行的ERP品类/SKU代理可展示并导出CSV；品类规模、毛利、竞争强度、品牌份额和排名仍需公开报告、平台快照或授权连接器补证后再展示。',
      }}
      tabs={['品类对比', '生命周期', '雷达分析']}
      blockedItems={[
        '品类规模、增速和毛利口径缺少可追溯测算表。',
        '竞争强度和品牌排名没有与 BSR、公开报告或平台快照绑定。',
        'ds-038 仍为 needs-review；ERP内部代理不能外推为外部品类规模或份额。',
      ]}
      collectionPlan={[
        '补齐品类定义、TAM/SAM/SOM 口径和权重公式。',
        '用公开行业报告、平台快照和内部 SKU 映射交叉验证。',
        'ds-047/ds-048/ds-049 已拆入 erp_sales_monthly_fact、erp_after_sales_monthly_fact、erp_retail_channel_monthly_fact，按Batch19内部代理口径供页面读取。',
        '把每个品类的规模、增长、利润和排名拆成独立 claim 复核。',
      ]}
      displayPolicy={[
        'ERP内部代理可展示为 proxy，不替代外部规模、份额或排名。',
        '公开代理指标必须标注 proxy，不进入真实 KPI 或经营结论。',
        'CSV 导出必须使用同一份已复核品类测算表。',
      ]}
      internalFactSummary={
        <div>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP品类映射治理包 · Batch19内部代理已放行</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                {erpDerivedBatch2Artifact.manifestPath}；source ids: {erpDerivedBatch2Artifact.sourceIds.join(' / ')}；原始 SKU、产品名、客户名、运营字段未进入页面。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              categoryMappingRows={erpDerivedBatch2Artifact.summary.categoryMappingRows} · canDisplayAsFact=true
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="mb-4 rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-[11px] font-semibold text-[#1d1d1f]">Batch 7 字段字典与品类复核队列</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                    {erpGovernanceBatch7Artifact.batchId} · field rows {erpGovernanceBatch7Artifact.summary.fieldDictionaryRows} · priority category reviews {erpGovernanceBatch7Artifact.summary.p0CategoryReviewRows} · display gates {erpGovernanceBatch7Artifact.summary.displayApprovalRows}
                  </p>
                </div>
                <span className="rounded-lg bg-[#ff9500]/10 px-2 py-1 text-[10px] text-[#a85f00]">
                  Batch19 display/export approved
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                {erpFieldDictionaryCoverageSummary.filter((item) => ['ds-047', 'ds-048', 'ds-049'].includes(item.sourceId)).map((item) => (
                  <p key={item.sourceId} className="text-[10px] leading-relaxed text-[#86868b]">
                    {item.sourceId}: {item.fieldRows} fields · {item.status}
                  </p>
                ))}
              </div>
            </div>
            <div className="mb-4 rounded-xl border border-[#EDE6DF] bg-white p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-[11px] font-semibold text-[#1d1d1f]">Batch 8 owner approval backlog</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                    {erpOwnerApprovalBatch8Artifact.batchId} · backlog rows {erpOwnerApprovalBatch8Artifact.summary.approvalBacklogRows} · approvals applied {erpOwnerApprovalBatch8Artifact.summary.approvalRecordsApplied}
                  </p>
                </div>
                <span className="rounded-lg bg-[#ff9500]/10 px-2 py-1 text-[10px] text-[#a85f00]">
                  owner chain closed by Batch19
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {erpOwnerApprovalLaneSummary.map((item) => (
                  <p key={item.lane} className="text-[10px] leading-relaxed text-[#86868b]">
                    {item.lane}: {formatNumber(item.rows)} rows · {item.requiredEvidence}
                  </p>
                ))}
              </div>
            </div>
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                  <th className="py-2 font-medium">品类代理</th>
                  <th className="py-2 font-medium">映射页面</th>
                  <th className="py-2 font-medium">SKU hash</th>
                  <th className="py-2 font-medium">原始行覆盖</th>
                  <th className="py-2 font-medium">可见代理量</th>
                  <th className="py-2 font-medium">置信度</th>
                  <th className="py-2 font-medium">治理状态</th>
                  <th className="py-2 font-medium">Batch7复核</th>
                </tr>
              </thead>
              <tbody>
                {erpCategoryProxySummary.map((row) => {
                  const batch7Review = erpCategoryReviewQueueSummary.find((item) => item.categoryProxy === row.categoryProxy);
                  return (
                    <tr key={row.categoryProxy} className="border-b border-[#F3EEE9]">
                      <td className="py-2 text-[#1d1d1f]">{row.categoryProxy}</td>
                      <td className="py-2 text-[#86868b]">{row.mappedPageCategory}</td>
                      <td className="py-2 text-[#1d1d1f]">{formatNumber(row.skuHashCount)}</td>
                      <td className="py-2 text-[#1d1d1f]">{formatNumber(row.rawRowCount)}</td>
                      <td className="py-2 text-[#1d1d1f]">{formatNumber(row.visibleProxyUnits)} proxy</td>
                      <td className="py-2 text-[#86868b]">{row.confidence}</td>
                      <td className="py-2 text-[#2f7d32]">{row.reviewStatus} · ds-047/ds-048/ds-049</td>
                      <td className="py-2 text-[#a85f00]">{priorityLabel(batch7Review?.priority)} · {batch7Review?.approvalStatus}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#EDE6DF] pt-3 md:grid-cols-3">
            {erpBatch2DisplayPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
            {erpBatch7DisplayPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
            {erpBatch8ApprovalPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
        </div>
      }
    />
  );
}
