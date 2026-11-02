import { AlertTriangle, CheckCircle2, FileCheck2, ShieldCheck } from 'lucide-react';
import { getRouteReadiness } from '@/data/route-readiness';

type SourceBackedReviewPacketProps = {
  route: string;
  modelContract: string;
  evidenceScope: string[];
  allowedUses: string[];
  prohibitedUses: string[];
  reviewChecklist: string[];
};

type ReviewSectionProps = {
  title: string;
  items: string[];
  tone?: 'default' | 'warning';
};

function ReviewSection({ title, items, tone = 'default' }: ReviewSectionProps) {
  const Icon = tone === 'warning' ? AlertTriangle : CheckCircle2;

  return (
    <section className={`rounded-xl border p-4 ${tone === 'warning' ? 'border-[#C44545]/20 bg-[#C44545]/5' : 'border-[#EDE6DF] bg-[#FBF8F5]'}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone === 'warning' ? 'text-[#C44545]' : 'text-[#5B8C5A]'}`} aria-hidden="true" />
        <h3 className="text-xs font-semibold text-[#1d1d1f]">{title}</h3>
      </div>
      <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-[#625b57]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SourceBackedReviewPacket({
  route,
  modelContract,
  evidenceScope,
  allowedUses,
  prohibitedUses,
  reviewChecklist,
}: SourceBackedReviewPacketProps) {
  const readiness = getRouteReadiness(route);
  const contractAligned = (
    readiness?.sourceReadiness === 'source-backed'
    && readiness.decisionReady === false
    && readiness.targetMetricContractStatus === 'defined-not-certified'
  );

  if (!readiness || !contractAligned) {
    return (
      <section
        data-testid="source-backed-review-packet"
        data-route={route}
        data-contract-state="invalid"
        data-source-readiness={readiness?.sourceReadiness ?? 'unmapped'}
        data-decision-readiness={readiness?.decisionReady ? 'ready' : 'not-ready'}
        className="rounded-2xl border border-[#C44545]/25 bg-[#C44545]/5 p-5"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C44545]" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-[#9d3030]">业务复核候选包已阻断</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[#6b5b5f]">
              路由就绪投影与候选包前提不一致；请先重建并复核 route-readiness 投影，不得继续展示候选合同。
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="source-backed-review-packet"
      data-route={route}
      data-source-readiness="source-backed"
      data-review-status="business-review-candidate"
      data-decision-readiness="not-ready"
      data-contract-state="aligned"
      data-metric-id={readiness.targetMetricId}
      data-metric-owner={readiness.targetMetricOwner}
      data-metric-grain={readiness.targetMetricGrain}
      className="rounded-2xl border border-[#C25B6E]/20 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C25B6E]/10">
            <FileCheck2 className="h-4 w-4 text-[#C25B6E]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#1d1d1f]">业务复核候选包</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[#86868b]">
              已补齐模型、证据范围和使用限制；仍需业务 owner 完成签核，当前不具备决策就绪资格。
            </p>
          </div>
        </div>
        <span className="w-fit rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a45b00]">
          待签核 · 非决策就绪
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['目标指标', `${readiness.targetMetricName}（${readiness.targetMetricId}）`],
          ['模型合同', modelContract],
          ['复核粒度', readiness.targetMetricGrain],
          ['业务负责人', readiness.targetMetricOwner],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
            <p className="text-[10px] font-medium text-[#86868b]">{label}</p>
            <p className="mt-1 break-words text-[11px] font-semibold text-[#1d1d1f]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <ReviewSection title="证据范围" items={evidenceScope} />
        <ReviewSection title="允许用途" items={allowedUses} />
        <ReviewSection title="禁止用途" items={prohibitedUses} tone="warning" />
        <ReviewSection title="待签核项" items={reviewChecklist} />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[#C25B6E]/30 px-3 py-2 text-[10px] text-[#6b5b5f]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#C25B6E]" aria-hidden="true" />
        该候选包只提升业务复核可执行性，不改变 source-backed / not-ready 状态。
      </div>
    </section>
  );
}
