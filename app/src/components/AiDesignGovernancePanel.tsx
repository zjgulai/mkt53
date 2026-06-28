import { BadgeDollarSign, ClipboardCheck, Database, Fingerprint, Lock } from 'lucide-react';
import {
  aiDesignAssetHashRows,
  aiDesignBatch6Artifact,
  aiDesignBatch6DisplayPolicy,
  aiDesignBatch6Metrics,
  aiDesignCommercialReviewRows,
  aiDesignCostRows,
  aiDesignRunRows,
} from '@/data/ai-design-governance-data';

interface AiDesignGovernancePanelProps {
  title?: string;
  focus?: 'all' | 'run' | 'asset' | 'cost' | 'review' | 'design' | 'gallery';
  compact?: boolean;
  framed?: boolean;
}

type AiDesignFocus = NonNullable<AiDesignGovernancePanelProps['focus']>;

const metricByFocus = {
  all: aiDesignBatch6Metrics,
  run: aiDesignBatch6Metrics.filter((metric) => metric.label === 'design run manifest'),
  asset: aiDesignBatch6Metrics.filter((metric) => metric.label === 'asset hash manifest'),
  cost: aiDesignBatch6Metrics.filter((metric) => metric.label === 'cost queue'),
  review: aiDesignBatch6Metrics.filter((metric) => metric.label === 'commercial review gate'),
  design: aiDesignBatch6Metrics,
  gallery: aiDesignBatch6Metrics,
};

const focusSurfaces: Record<AiDesignFocus, string[]> = {
  all: [],
  run: [],
  asset: [],
  cost: [],
  review: [],
  design: ['DesignAssistant', 'DesignAssistant/AIGallery'],
  gallery: ['AIGallery', 'DesignAssistant/AIGallery'],
};

export default function AiDesignGovernancePanel({
  title = 'AI设计/图库 Batch 6 生成资产治理门禁',
  focus = 'all',
  compact = false,
  framed = true,
}: AiDesignGovernancePanelProps) {
  const metrics = metricByFocus[focus] ?? metricByFocus.all;
  const surfaces = focusSurfaces[focus] ?? [];
  const runRows = surfaces.length > 0 ? aiDesignRunRows.filter((row) => surfaces.includes(row.surface)) : aiDesignRunRows;
  const assetRows = surfaces.length > 0 ? aiDesignAssetHashRows.filter((row) => surfaces.includes(row.surface)) : aiDesignAssetHashRows;
  const costRows = surfaces.length > 0 ? aiDesignCostRows.filter((row) => surfaces.includes(row.surface)) : aiDesignCostRows;
  const reviewRows = surfaces.length > 0 ? aiDesignCommercialReviewRows.filter((row) => surfaces.includes(row.surface)) : aiDesignCommercialReviewRows;
  const className = framed ? 'bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]' : '';

  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#1d1d1f]">{title}</h2>
          <p className="text-[10px] text-[#86868b] mt-1">
            {aiDesignBatch6Artifact.batchId} · {aiDesignBatch6Artifact.evidenceGrade} · {aiDesignBatch6Artifact.privacyLevel} · canDisplayAsFact=false
          </p>
        </div>
        <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
          no model call · no image bytes · no commercial approval
        </span>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-3.5 h-3.5 text-[#af52de]" />
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
            <Fingerprint className="h-3.5 w-3.5 text-[#af52de]" />请求与资产 hash 阻断
          </h3>
          <div className="space-y-2">
            {runRows.map((row) => {
              const assetRow = assetRows.find((item) => item.surface === row.surface);
              return (
                <div key={row.runId} className="rounded-lg bg-white/70 p-2">
                  <p className="text-[10px] font-medium text-[#1d1d1f]">{row.surface}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#86868b]">
                    {row.status} · asset: {assetRow?.status ?? 'asset_hash_pending'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#a85f00]">source ids: {row.sourceIds.join(' / ')}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[#1d1d1f]">
            <ClipboardCheck className="h-3.5 w-3.5 text-[#C25B6E]" />成本与商用审核门禁
          </h3>
          <div className="space-y-2">
            {reviewRows.map((row) => {
              const costRow = costRows.find((item) => item.surface === row.surface);
              return (
                <div key={row.reviewGateId} className="rounded-lg bg-white/70 p-2">
                  <p className="text-[10px] font-medium text-[#1d1d1f]">{row.surface} · {row.approvalState}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#86868b]">
                    cost: {costRow?.status ?? 'cost_queue_pending'} · canUseCommercially=false
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
          {aiDesignBatch6DisplayPolicy.map((policy) => (
            <div key={policy} className="flex items-start gap-2 rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
              {policy.includes('成本') || policy.includes('商用') ? (
                <BadgeDollarSign className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#af52de]" />
              ) : policy.includes('不得') ? (
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
