import { ClipboardCheck, Database, Lock } from 'lucide-react';
import {
  aiReportBatch4Artifact,
  aiReportBatch4DisplayPolicy,
  aiReportBatch4Metrics,
} from '@/data/ai-report-governance-data';

interface AiReportGovernancePanelProps {
  title?: string;
  focus?: 'all' | 'dataset' | 'model' | 'review' | 'report' | 'erp';
  compact?: boolean;
  framed?: boolean;
}

const metricByFocus = {
  all: aiReportBatch4Metrics,
  dataset: aiReportBatch4Metrics.filter((metric) => metric.label === 'dataset manifest'),
  model: aiReportBatch4Metrics.filter((metric) => metric.label === 'model run gate'),
  review: aiReportBatch4Metrics.filter((metric) => metric.label === 'human review gate'),
  report: aiReportBatch4Metrics.filter((metric) => metric.label === 'report queue'),
  erp: aiReportBatch4Metrics.filter((metric) => metric.label === 'ERP bridge'),
};

export default function AiReportGovernancePanel({
  title = 'AI/报告 Batch 4 治理门禁',
  focus = 'all',
  compact = false,
  framed = true,
}: AiReportGovernancePanelProps) {
  const metrics = metricByFocus[focus] ?? metricByFocus.all;
  const className = framed ? 'bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]' : '';

  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#1d1d1f]">{title}</h2>
          <p className="text-[10px] text-[#86868b] mt-1">
            {aiReportBatch4Artifact.batchId} · {aiReportBatch4Artifact.evidenceGrade} · {aiReportBatch4Artifact.privacyLevel} · canDisplayAsFact=false
          </p>
        </div>
        <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
          no model call · no provider call
        </span>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-3 xl:grid-cols-5'}`}>
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-3.5 h-3.5 text-[#C25B6E]" />
              <p className="text-[10px] font-medium text-[#86868b]">{metric.label}</p>
            </div>
            <p className="text-xl font-semibold text-[#1d1d1f]">{metric.value}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">{metric.note}</p>
            <p className="mt-2 text-[10px] text-[#a85f00]">source ids: {metric.sourceIds.join(' / ')}</p>
          </div>
        ))}
      </div>

      {!compact ? (
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {aiReportBatch4DisplayPolicy.map((policy) => (
            <div key={policy} className="flex items-start gap-2 rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
              {policy.includes('报告') ? (
                <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#C25B6E]" />
              ) : (
                <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#ff9500]" />
              )}
              <p className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
