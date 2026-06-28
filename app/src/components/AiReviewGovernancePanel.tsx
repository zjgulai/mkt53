import { ClipboardCheck, Database, Lock, ShieldAlert } from 'lucide-react';
import {
  aiReviewBatch5Artifact,
  aiReviewBatch5DisplayPolicy,
  aiReviewBatch5Metrics,
  aiReviewEvalQueueRows,
  aiReviewHumanReviewRows,
  aiReviewPublishGateRows,
  aiReviewSampleManifestRows,
} from '@/data/ai-review-governance-data';

interface AiReviewGovernancePanelProps {
  title?: string;
  focus?: 'all' | 'sample' | 'eval' | 'human' | 'publish' | 'comments' | 'youtube' | 'web' | 'voc';
  compact?: boolean;
  framed?: boolean;
}

type AiReviewFocus = NonNullable<AiReviewGovernancePanelProps['focus']>;

const metricByFocus = {
  all: aiReviewBatch5Metrics,
  sample: aiReviewBatch5Metrics.filter((metric) => metric.label === 'sample manifest'),
  eval: aiReviewBatch5Metrics.filter((metric) => metric.label === 'eval queue'),
  human: aiReviewBatch5Metrics.filter((metric) => metric.label === 'human review queue'),
  publish: aiReviewBatch5Metrics.filter((metric) => metric.label === 'publish gate'),
  comments: aiReviewBatch5Metrics,
  youtube: aiReviewBatch5Metrics,
  web: aiReviewBatch5Metrics,
  voc: aiReviewBatch5Metrics,
};

const focusSurfaces: Record<AiReviewFocus, string[]> = {
  all: [],
  sample: [],
  eval: [],
  human: [],
  publish: [],
  comments: ['CommentData', 'ReviewAnalysis'],
  youtube: ['YoutubeReview'],
  web: ['WebReview'],
  voc: ['FlavorMap', 'FlavorReport'],
};

export default function AiReviewGovernancePanel({
  title = 'AI评论/VOC Batch 5 样本治理门禁',
  focus = 'all',
  compact = false,
  framed = true,
}: AiReviewGovernancePanelProps) {
  const metrics = metricByFocus[focus] ?? metricByFocus.all;
  const surfaces = focusSurfaces[focus] ?? [];
  const sampleRows = surfaces.length > 0 ? aiReviewSampleManifestRows.filter((row) => surfaces.includes(row.surface)) : aiReviewSampleManifestRows;
  const evalRows = surfaces.length > 0 ? aiReviewEvalQueueRows.filter((row) => surfaces.includes(row.surface)) : aiReviewEvalQueueRows;
  const humanRows = surfaces.length > 0 ? aiReviewHumanReviewRows.filter((row) => surfaces.includes(row.surface)) : aiReviewHumanReviewRows;
  const publishRows = surfaces.length > 0 ? aiReviewPublishGateRows.filter((row) => surfaces.includes(row.surface)) : aiReviewPublishGateRows;
  const className = framed ? 'bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]' : '';

  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#1d1d1f]">{title}</h2>
          <p className="text-[10px] text-[#86868b] mt-1">
            {aiReviewBatch5Artifact.batchId} · {aiReviewBatch5Artifact.evidenceGrade} · {aiReviewBatch5Artifact.privacyLevel} · canDisplayAsFact=false
          </p>
        </div>
        <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
          no model call · no connector access
        </span>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
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

      <div className={`mt-4 grid grid-cols-1 gap-3 ${compact ? '' : 'xl:grid-cols-2'}`}>
        <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[#1d1d1f]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#ff9500]" />样本与评估阻断
          </h3>
          <div className="space-y-2">
            {sampleRows.map((row) => {
              const evalRow = evalRows.find((item) => item.surface === row.surface);
              return (
                <div key={row.manifestId} className="rounded-lg bg-white/70 p-2">
                  <p className="text-[10px] font-medium text-[#1d1d1f]">{row.surface}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#86868b]">
                    {row.status} · {evalRow?.status ?? 'eval_pending'} · raw policy: {row.rawTextPolicy}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#a85f00]">source ids: {row.sourceIds.join(' / ')}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[#1d1d1f]">
            <ClipboardCheck className="h-3.5 w-3.5 text-[#C25B6E]" />人工复核与发布门禁
          </h3>
          <div className="space-y-2">
            {humanRows.map((row) => {
              const publishRow = publishRows.find((item) => item.surface === row.surface);
              return (
                <div key={row.reviewTaskId} className="rounded-lg bg-white/70 p-2">
                  <p className="text-[10px] font-medium text-[#1d1d1f]">{row.surface} · {row.approvalState}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#86868b]">
                    blocked: {publishRow?.blockedClaims ?? 'claim matrix missing'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#a85f00]">canPublish=false · canDisplayAsFact=false</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {aiReviewBatch5DisplayPolicy.map((policy) => (
            <div key={policy} className="flex items-start gap-2 rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
              {policy.includes('不得') ? (
                <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#ff9500]" />
              ) : (
                <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#C25B6E]" />
              )}
              <p className="text-[10px] leading-relaxed text-[#86868b]">{policy}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
