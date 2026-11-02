import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Database, ShieldAlert } from 'lucide-react';
import { useLocation } from 'react-router';
import {
  getRouteReadiness,
  type DecisionReadiness,
  type SourceReadiness,
} from '@/data/route-readiness';

const sourceReadinessMeta: Record<
  SourceReadiness,
  { label: string; icon: typeof Database; className: string; detail: string }
> = {
  'source-backed': {
    label: '来源 · 已支撑',
    icon: CheckCircle2,
    className: 'border-[#5B8C5A]/25 bg-[#5B8C5A]/10 text-[#467044]',
    detail: '当前登记来源可支撑限定范围内的事实展示。',
  },
  partial: {
    label: '来源 · 部分就绪',
    icon: AlertTriangle,
    className: 'border-[#D88324]/25 bg-[#D88324]/10 text-[#9A5A18]',
    detail: '部分来源仍有展示阻断或证据范围缺口。',
  },
  blocked: {
    label: '来源 · 阻断',
    icon: ShieldAlert,
    className: 'border-[#C44545]/25 bg-[#C44545]/10 text-[#A23838]',
    detail: '当前登记来源不足以支持该页事实展示。',
  },
};

const decisionReadinessMeta: Record<
  DecisionReadiness,
  { label: string; icon: typeof Database; className: string; detail: string }
> = {
  ready: {
    label: '决策 · 已就绪',
    icon: CheckCircle2,
    className: 'border-[#5B8C5A]/25 bg-[#5B8C5A]/10 text-[#467044]',
    detail: '指标、采集、质量、审批、展示与运行门均已通过。',
  },
  'not-ready': {
    label: '决策 · 未就绪',
    icon: ShieldAlert,
    className: 'border-[#8B354A]/25 bg-[#8B354A]/10 text-[#8B354A]',
    detail: '当前仅完成目标指标定义，生命周期门禁尚未全部闭环。',
  },
};

function StatusBadge({
  label,
  icon: Icon,
  className,
}: {
  label: string;
  icon: typeof Database;
  className: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${className}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function RouteReadinessStatus() {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(false);
  const readiness = getRouteReadiness(pathname);

  if (!readiness) return null;

  const sourceStatus: SourceReadiness = readiness.sourceReadiness;
  const decisionStatus: DecisionReadiness = readiness.decisionReady ? 'ready' : 'not-ready';
  const sourceMeta = sourceReadinessMeta[sourceStatus];
  const decisionMeta = decisionReadinessMeta[decisionStatus];

  return (
    <aside
      data-testid="route-readiness-status"
      data-route={readiness.route}
      data-source-readiness={sourceStatus}
      data-decision-readiness={decisionStatus}
      className="fixed bottom-4 right-4 z-40 w-[min(25rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#DCCFC7] bg-white/95 shadow-[0_12px_40px_rgba(45,31,31,0.18)] backdrop-blur-xl"
      aria-label="当前页面数据就绪状态"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        aria-expanded={expanded}
        aria-controls="route-readiness-details"
        onClick={() => setExpanded((current) => !current)}
      >
        <Database className="h-4 w-4 shrink-0 text-[#8B354A]" aria-hidden="true" />
        <span className="sr-only">数据就绪口径</span>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <StatusBadge {...sourceMeta} />
          <StatusBadge {...decisionMeta} />
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#7A6B6B] transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {expanded ? (
        <div id="route-readiness-details" className="border-t border-[#EDE6DF] px-4 py-3">
          <p className="text-xs font-semibold text-[#2D1F1F]">{readiness.targetMetricName}</p>
          <p className="mt-0.5 break-all font-mono text-[10px] text-[#7A6B6B]">{readiness.targetMetricId}</p>

          <dl className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#F8F3EF] p-2">
              <dt className="text-[10px] text-[#7A6B6B]">登记来源</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#2D1F1F]">{readiness.sourceCount}</dd>
            </div>
            <div className="rounded-xl bg-[#F8F3EF] p-2">
              <dt className="text-[10px] text-[#7A6B6B]">展示阻断</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#2D1F1F]">{readiness.blockedSourceCount}</dd>
            </div>
            <div className="rounded-xl bg-[#F8F3EF] p-2">
              <dt className="text-[10px] text-[#7A6B6B]">范围缺口</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#2D1F1F]">{readiness.scopeGapSourceCount}</dd>
            </div>
          </dl>

          <div className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-[#7A6B6B]">
            <p><strong className="text-[#2D1F1F]">来源状态：</strong>{sourceMeta.detail}</p>
            <p><strong className="text-[#2D1F1F]">决策状态：</strong>{decisionMeta.detail}</p>
            <p className="rounded-lg bg-[#8B354A]/6 px-2 py-1.5 font-medium text-[#8B354A]">
              来源可支撑不等于决策就绪；两项状态必须独立判定。
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
