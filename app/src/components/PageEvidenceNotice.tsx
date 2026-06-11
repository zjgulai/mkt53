import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getSourceRegistryItem, getVerificationStatusMeta, type SourceRegistryItem, type VerificationStatus } from '@/data/source-registry';

interface PageEvidenceNoticeProps {
  sourceIds: string[];
  title: string;
  description: ReactNode;
  className?: string;
  cadence?: string;
}

const statusPriority: Record<VerificationStatus, number> = {
  example: 3,
  'needs-review': 2,
  verified: 1,
};

const toneStyles: Record<VerificationStatus, { bg: string; border: string; text: string }> = {
  verified: { bg: '#34c75908', border: '#34c75922', text: '#34c759' },
  'needs-review': { bg: '#ff950008', border: '#ff950026', text: '#ff9500' },
  example: { bg: '#ff3b3008', border: '#ff3b3026', text: '#ff3b30' },
};

function getDominantStatus(sources: SourceRegistryItem[]) {
  return sources.reduce<VerificationStatus>((current, source) => {
    return statusPriority[source.verificationStatus] > statusPriority[current] ? source.verificationStatus : current;
  }, 'verified');
}

export default function PageEvidenceNotice({ sourceIds, title, description, className = '', cadence = '半月复核口径' }: PageEvidenceNoticeProps) {
  const sources = sourceIds.map(getSourceRegistryItem);
  const dominantStatus = getDominantStatus(sources);
  const style = toneStyles[dominantStatus];

  return (
    <div className={`rounded-2xl border p-4 ${className}`} style={{ backgroundColor: style.bg, borderColor: style.border }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${style.text}14` }}>
          {dominantStatus === 'verified' ? <CheckCircle className="w-4 h-4" style={{ color: style.text }} /> : null}
          {dominantStatus === 'needs-review' ? <Info className="w-4 h-4" style={{ color: style.text }} /> : null}
          {dominantStatus === 'example' ? <AlertTriangle className="w-4 h-4" style={{ color: style.text }} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-[#1d1d1f]">{title}</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: `${style.text}14`, color: style.text }}>{cadence}</span>
          </div>
          <p className="text-[11px] text-[#86868b] leading-relaxed mt-1">{description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {sources.map((source) => {
              const meta = getVerificationStatusMeta(source.verificationStatus);
              return (
                <span key={source.id} className="px-2 py-0.5 rounded-full bg-white/70 border border-[#EDE6DF] text-[10px] text-[#86868b]">
                  {source.id} · {source.metric} · <strong style={{ color: meta.color }}>{meta.label}</strong>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
