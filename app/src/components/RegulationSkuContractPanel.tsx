import { CheckCircle2, FileKey2, Gavel, ShieldX } from 'lucide-react';

const contractFields = [
  { icon: FileKey2, label: '官方来源', detail: 'registry id · URL · retrievedAt · SHA-256 · snapshot' },
  { icon: ShieldX, label: 'SKU 范围', detail: 'SKU · product family · market · applicability · scope basis' },
  { icon: Gavel, label: '法务决策', detail: 'status · reviewer · reviewedAt · reason · review event' },
  { icon: CheckCircle2, label: '发布与撤回', detail: 'publication gate · blocked reasons · withdrawal' },
];

const evidenceCounts = [
  { label: '官方条款快照', value: 0 },
  { label: '已复核 SKU 决策', value: 0 },
  { label: '可发布合规结论', value: 0 },
];

export default function RegulationSkuContractPanel() {
  return (
    <section aria-labelledby="data-reg-contract-title" data-testid="regulation-sku-contract-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B354A]">DATA-REG · contract only</p>
          <h2 id="data-reg-contract-title" className="mt-1 text-sm font-semibold text-[#1d1d1f]">
            法规条款到 SKU 决策合同已定义
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#6e6e73]">
            当前只验证字段、状态机与阻断规则。未采集新法规事实，未评估任何真实 SKU，也不构成法律意见。
          </p>
        </div>
        <span className="inline-flex self-start rounded-lg border border-[#8B354A]/20 bg-[#8B354A]/5 px-2.5 py-1 text-[11px] font-medium text-[#8B354A]">
          mkt53.regulation-sku-matrix.v1
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {evidenceCounts.map((item) => (
          <div key={item.label} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3" data-testid={`data-reg-count-${item.value}-${item.label}`}>
            <p className="text-xl font-semibold text-[#1d1d1f]">{item.value}</p>
            <p className="mt-0.5 text-[11px] text-[#6e6e73]">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {contractFields.map(({ icon: Icon, label, detail }) => (
          <div key={label} className="flex items-start gap-3 rounded-xl border border-[#EDE6DF] p-3">
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8B354A]" />
            <div>
              <p className="text-xs font-semibold text-[#1d1d1f]">{label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#86868b]">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-[#ff9500]/25 bg-[#ff9500]/5 p-3 text-xs leading-relaxed text-[#8a5400]">
        未取得官方快照、适用范围依据和法务复核事件前，所有条目保持阻断；页面与导出均不得把合同 fixture 提升为合规事实。
      </div>
    </section>
  );
}
