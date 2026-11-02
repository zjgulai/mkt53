import { AlertTriangle, CheckCircle, Clock3, ShieldAlert } from 'lucide-react';
import {
  getAllSourceFreshness,
  getSourceFreshness,
  getSourceFreshnessMeta,
} from '@/data/source-freshness';

interface SourceFreshnessOverviewProps {
  sourceIds?: readonly string[];
  title?: string;
  className?: string;
}

export default function SourceFreshnessOverview({
  sourceIds,
  title = '来源新鲜度与过期告警',
  className = '',
}: SourceFreshnessOverviewProps) {
  const sources = sourceIds
    ? sourceIds.map((sourceId) => getSourceFreshness(sourceId))
    : getAllSourceFreshness();
  const currentReady = sources.filter((source) => source.currentUseAllowed).length;
  const blocked = sources.filter(
    (source) => source.status === 'blocked-evidence-unavailable',
  ).length;
  const stale = sources.filter((source) => source.status === 'stale').length;
  const dueSoon = sources.filter((source) => source.status === 'due-soon').length;
  const alerts = sources.filter((source) => source.status !== 'fresh');

  return (
    <section
      className={`rounded-2xl border border-[#ff9500]/20 bg-[#ff9500]/5 p-4 ${className}`}
      data-source-freshness-overview
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#ff9500]/10">
          {blocked > 0 || stale > 0 ? (
            <ShieldAlert className="h-4 w-4 text-[#ff3b30]" />
          ) : dueSoon > 0 ? (
            <Clock3 className="h-4 w-4 text-[#ff9500]" />
          ) : (
            <CheckCircle className="h-4 w-4 text-[#34c759]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xs font-semibold text-[#1d1d1f]">{title}</h2>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#86868b]">
              当前可用 {currentReady}/{sources.length}
            </span>
            {blocked > 0 ? (
              <span className="rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[10px] font-medium text-[#ff3b30]">
                证据阻断 {blocked}
              </span>
            ) : null}
            {stale > 0 ? (
              <span className="rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[10px] font-medium text-[#ff3b30]">
                已过期 {stale}
              </span>
            ) : null}
            {dueSoon > 0 ? (
              <span className="rounded-full bg-[#ff9500]/10 px-2 py-0.5 text-[10px] font-medium text-[#a85f00]">
                临近过期 {dueSoon}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
            新鲜度只判断当前使用资格，不改写历史证据等级。L3 来源必须同时具备快照窗口、可用artifact、受控sha256合同与刷新回执；静态复核日期不能单独放行。
          </p>
          {alerts.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {alerts.slice(0, 8).map((source) => {
                const meta = getSourceFreshnessMeta(source.status);
                return (
                  <span
                    key={source.sourceId}
                    className="rounded-full border border-[#EDE6DF] bg-white/80 px-2 py-0.5 text-[10px] text-[#86868b]"
                    title={meta.description}
                  >
                    {source.sourceId} · <strong style={{ color: meta.color }}>{meta.label}</strong> · {source.effectiveScore}分
                  </span>
                );
              })}
              {alerts.length > 8 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] text-[#86868b]">
                  <AlertTriangle className="h-3 w-3" />
                  另有 {alerts.length - 8} 条告警
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
