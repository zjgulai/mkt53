import { Droplets } from 'lucide-react';
import MarketDataGate from '@/components/MarketDataGate';
import {
  erpBatch2DisplayPolicy,
  erpBatch7DisplayPolicy,
  erpBatch8ApprovalPolicy,
  erpBreastPumpMonthlyProxy,
  erpCategoryProxySummary,
  erpCategoryReviewQueueSummary,
  erpDerivedBatch2Artifact,
  erpGovernanceBatch7Artifact,
  erpOwnerApprovalBatch8Artifact,
  erpOwnerApprovalLaneSummary,
  erpSubtotalReconciliationSummary,
} from '@/data/market-insight-data';

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function priorityLabel(priority?: string) {
  return priority === 'P0' ? 'urgent review' : 'standard review';
}

const publicCategorySplitEvidence = [
  {
    source: 'Mordor Intelligence',
    detail: '2026全球吸奶器市场约USD 3.93B；closed-system与electric segment可作为品类拆分锚点。',
    sourceIds: ['ds-005'],
  },
  {
    source: 'Precedence Research',
    detail: '2026全球吸奶器市场约USD 3.81B；electric pumps为2025技术拆分交叉锚点。',
    sourceIds: ['ds-005'],
  },
  {
    source: 'Fortune Business Insights',
    detail: '2026全球吸奶器市场约USD 2.31B；北美45.05%用于区域TAM交叉校验。',
    sourceIds: ['ds-005'],
  },
];

export default function BreastPump() {
  const breastPumpProxy = erpCategoryProxySummary.find((item) => item.categoryProxy === 'breast_pump_keyword_proxy');
  const breastPumpReview = erpCategoryReviewQueueSummary.find((item) => item.categoryProxy === 'breast_pump_keyword_proxy');

  return (
    <MarketDataGate
      title="吸奶器品类分析"
      subtitle="品类拆分 · 品牌格局 · 产品矩阵 · 型号对比 · 功能需求"
      icon={Droplets}
      accent="#C25B6E"
      sourceIds={['ds-005']}
      evidenceTitle="吸奶器品类测算复核边界"
      evidenceDescription="公开报告已支撑全球TAM和segment-TAM品类拆分口径；SAM、SOM、品牌份额、SKU价格、评分和型号参数仍不得展示为真实全渠道结论。"
      gateStatus={{
        sourceIds: ['ds-047', 'ds-049'],
        label: 'ERP代理与公开TAM口径已放行',
        tone: 'approved',
        description: '吸奶器关键词代理、SKU hash覆盖和月度内部代理量可按private/internal proxy展示并导出；公开报告只支撑TAM/segment-TAM，不支撑SAM、品牌份额、均价、评分和型号对比。',
      }}
      tabs={['市场规模', '品牌格局', '产品矩阵', '型号对比', '功能需求']}
      blockedItems={[
        'SAM 需要另补地域、渠道、SKU和合规可服务范围证据。',
        '品牌份额需要 Amazon Brand Analytics 或零售面板授权数据。',
        '型号价格、评分和功能参数需要公开页采集时间戳与 SKU 映射。',
      ]}
      collectionPlan={[
        '保留 Mordor、Precedence、Fortune 报告页证据和hash。',
        '为每个品牌和 SKU 建立 source_id、采集窗口和证据路径。',
        'ds-047/ds-049 已沉淀吸奶器关键词代理与 SKU 映射，并按Batch19 internal proxy口径展示。',
        '将公开报告数值统一按TAM/segment-TAM展示，不写成SAM、SOM或品牌份额。',
      ]}
      displayPolicy={[
        'ERP内部代理可以展示为 proxy；份额、均价、评分、收入和专利数量仍等待外部证据。',
        '公开报告支撑的第一批数据只恢复品类TAM和细分TAM。',
        '连接器数据只在授权快照进入后才能进入 CSV 导出。',
      ]}
      internalFactSummary={
        <div>
          <div className="mb-4 rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold text-[#1d1d1f]">公开品类拆分 · ds-005</h2>
                <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                  Artifact: tmp/audits/p0-public-source-fill-20260630/ds005_evidence.json；结论边界：TAM/segment-TAM，不是SAM、SOM或品牌份额。
                </p>
              </div>
              <span className="rounded-lg bg-[#34c759]/10 px-3 py-1.5 text-[10px] font-medium text-[#2f7d32]">
                L1-method
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              {publicCategorySplitEvidence.map((item) => (
                <div key={item.source} className="rounded-lg border border-[#EDE6DF] bg-white p-3">
                  <p className="text-[11px] font-semibold text-[#1d1d1f]">{item.source}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP内部代理摘要 · Batch19已放行</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                Batch {erpDerivedBatch2Artifact.batchId}；source ids: {erpDerivedBatch2Artifact.sourceIds.join(' / ')}；canDisplayAsFact=true；仅限内部proxy。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              {erpDerivedBatch2Artifact.evidenceGrade} · {erpDerivedBatch2Artifact.privacyLevel}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#EDE6DF] pb-2">
                <span className="text-[#86868b]">品类代理</span>
                <span className="font-semibold text-[#1d1d1f]">{breastPumpProxy?.categoryProxy}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#EDE6DF] pb-2">
                <span className="text-[#86868b]">SKU hash 覆盖</span>
                <span className="font-semibold text-[#1d1d1f]">{formatNumber(breastPumpProxy?.skuHashCount ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#EDE6DF] pb-2">
                <span className="text-[#86868b]">零售原始行覆盖</span>
                <span className="font-semibold text-[#1d1d1f]">{formatNumber(breastPumpProxy?.rawRowCount ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#EDE6DF] pb-2">
                <span className="text-[#86868b]">可见月度代理量</span>
                <span className="font-semibold text-[#1d1d1f]">{formatNumber(breastPumpProxy?.visibleProxyUnits ?? 0)}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[#86868b]">
                上述数字只说明ERP导出中关键词代理的内部覆盖，不是行业销量、GMV、品牌份额、TAM、SAM 或 SOM。
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EDE6DF] text-[10px] uppercase tracking-wide text-[#86868b]">
                    <th className="py-2 font-medium">月份</th>
                    <th className="py-2 font-medium">内部组合代理量</th>
                    <th className="py-2 font-medium">内部组合代理占比</th>
                    <th className="py-2 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {erpBreastPumpMonthlyProxy.map((row) => (
                    <tr key={row.month} className="border-b border-[#F3EEE9]">
                      <td className="py-2 text-[#1d1d1f]">{row.month}</td>
                      <td className="py-2 text-[#1d1d1f]">{formatNumber(row.combinedProxyUnits)}</td>
                      <td className="py-2 text-[#1d1d1f]">{row.internalMixProxyPct.toFixed(2)}% proxy</td>
                      <td className="py-2 text-[#2f7d32]">Batch19 approved proxy · ds-047/ds-048/ds-049</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 border-t border-[#EDE6DF] pt-3">
            {erpBatch2DisplayPolicy.map((policy) => (
              <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-[11px] font-semibold text-[#1d1d1f]">Batch 7 字段字典 / 品类复核 gate</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                  {erpGovernanceBatch7Artifact.manifestPath} · 字段字典 {erpGovernanceBatch7Artifact.summary.fieldDictionaryRows} 行 · 品类复核 {erpGovernanceBatch7Artifact.summary.categoryReviewRows} 行 · Batch19已完成展示/导出放行
                </p>
              </div>
              <span className="rounded-lg bg-[#ff9500]/10 px-2 py-1 text-[10px] text-[#a85f00]">
                {priorityLabel(breastPumpReview?.priority)} · Batch19 approved proxy
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {erpSubtotalReconciliationSummary.filter((item) => item.sourceId === 'ds-049').map((item) => (
                <p key={`${item.affectedTable}-${item.deltaUnits}`} className="text-[10px] leading-relaxed text-[#86868b]">
                  {item.affectedTable}: delta {formatNumber(item.deltaUnits)} · {item.status}
                </p>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              {erpBatch7DisplayPolicy.map((policy) => (
                <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[#EDE6DF] bg-white p-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-[11px] font-semibold text-[#1d1d1f]">Batch 8 owner approval packets</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                  {erpOwnerApprovalBatch8Artifact.manifestPath} · backlog {formatNumber(erpOwnerApprovalBatch8Artifact.summary.approvalBacklogRows)} rows · approvalRecordsApplied={erpOwnerApprovalBatch8Artifact.summary.approvalRecordsApplied}
                </p>
              </div>
              <span className="rounded-lg bg-[#ff9500]/10 px-2 py-1 text-[10px] text-[#a85f00]">
                readyToDisplayRows={erpOwnerApprovalBatch8Artifact.summary.readyToDisplayRows}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {erpOwnerApprovalLaneSummary.filter((item) => item.lane !== 'display_approval_record').map((item) => (
                <p key={item.lane} className="text-[10px] leading-relaxed text-[#86868b]">
                  {item.packet}: {formatNumber(item.rows)} rows · {item.currentStatus}
                </p>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              {erpBatch8ApprovalPolicy.map((policy) => (
                <p key={policy} className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
}
