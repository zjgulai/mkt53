import type { ReactNode } from 'react';
import { AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react';
import {
  getSourceRegistryItem,
  getVerificationStatusMeta,
  type SourceRegistryItem,
} from '@/data/source-registry';

interface FactDisplayGateProps {
  sourceIds: string[];
  title: string;
  description: ReactNode;
  children: ReactNode;
  layout?: 'section' | 'page';
  navigation?: ReactNode;
}

function isFactDisplayReady(source: SourceRegistryItem) {
  return source.canDisplayAsFact && source.verificationStatus === 'verified';
}

export default function FactDisplayGate({
  sourceIds,
  title,
  description,
  children,
  layout = 'section',
  navigation,
}: FactDisplayGateProps) {
  const sources = sourceIds.map(getSourceRegistryItem);
  const blockers = sources.filter((source) => !isFactDisplayReady(source));

  if (blockers.length === 0) return children;

  const panel = (
    <section
      role="status"
      data-testid="fact-display-gate"
      className="rounded-2xl border border-[#ff9500]/25 bg-white p-5 card-shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#ff9500]/10 flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="w-5 h-5 text-[#c56a00]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-[#1d1d1f]">{title}</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#ff9500]/10 text-[10px] font-medium text-[#a85f00]">
              事实展示已关闭
            </span>
          </div>
          <p className="text-xs text-[#86868b] leading-relaxed mt-2">{description}</p>
          <p className="text-[11px] text-[#a85f00] leading-relaxed mt-2 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            当前不会渲染指标、占比、排名、NPS、访谈原话、门店经营值或客户分层；源码中的原型样本不能作为业务事实使用。
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {blockers.map((source) => {
          const status = getVerificationStatusMeta(source.verificationStatus);
          return (
            <article key={source.id} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[#1d1d1f]">{source.id} · {source.metric}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white text-[9px] font-medium" style={{ color: status.color }}>
                  {status.label}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-white text-[9px] text-[#86868b]">
                  {source.evidenceGrade}
                </span>
              </div>
              <dl className="mt-2 space-y-1 text-[10px] leading-relaxed">
                <div>
                  <dt className="inline text-[#86868b]">阻断原因：</dt>
                  <dd className="inline text-[#1d1d1f]">{source.blockingReason || 'source-not-approved-for-fact-display'}</dd>
                </div>
                <div>
                  <dt className="inline text-[#86868b]">允许范围：</dt>
                  <dd className="inline text-[#1d1d1f]">{source.claimScope}</dd>
                </div>
                <div>
                  <dt className="inline text-[#86868b]">下一步：</dt>
                  <dd className="inline text-[#1d1d1f]">{source.action}</dd>
                </div>
              </dl>
              {source.sourceUrl ? (
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[#C25B6E]"
                >
                  查看登记来源 <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );

  if (layout === 'page') {
    return (
      <main className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex gap-8">
            {navigation}
            <div className="flex-1 min-w-0">{panel}</div>
          </div>
        </div>
      </main>
    );
  }

  return panel;
}
