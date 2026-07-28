import { useEffect, useState } from 'react';
import { ExternalLink, Shirt } from 'lucide-react';
import MarketDataGate from '@/components/MarketDataGate';
import {
  isEligibleCapturedPublicEvidenceRecord,
  parsePublicEvidenceManifest,
  summarizePublicEvidenceSafety,
  type PublicEvidenceManifest,
} from '@/lib/public-evidence';

export default function NursingProducts() {
  const [publicEvidenceManifest, setPublicEvidenceManifest] = useState<PublicEvidenceManifest | null>(null);
  const [publicEvidenceStatus, setPublicEvidenceStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let active = true;

    fetch('/periodic-data/public-evidence-samples.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Public evidence samples unavailable.');
        return response.json();
      })
      .then((payload: unknown) => {
        if (!active) return;
        const manifest = parsePublicEvidenceManifest(payload);
        setPublicEvidenceManifest(manifest);
        setPublicEvidenceStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setPublicEvidenceManifest(null);
        setPublicEvidenceStatus('missing');
      });

    return () => {
      active = false;
    };
  }, []);

  const nursingEvidence = (publicEvidenceManifest?.records ?? []).filter(
    (record) => record.sourceId === 'ds-039' && record.page === 'NursingProducts',
  );
  const eligibleNursingEvidence = nursingEvidence.filter((record) =>
    isEligibleCapturedPublicEvidenceRecord(record, publicEvidenceManifest?.mode),
  );
  const { businessDataWrites: nursingEvidenceBusinessDataWrites, networkCalls: nursingEvidenceNetworkCalls } =
    summarizePublicEvidenceSafety(nursingEvidence);
  const nursingEvidenceStatusLabel =
    publicEvidenceStatus === 'ready'
      ? `${eligibleNursingEvidence.length}/${nursingEvidence.length} eligible captured`
      : publicEvidenceStatus;

  return (
    <MarketDataGate
      title="哺乳用品分析"
      subtitle="哺乳文胸 · 防溢乳垫 · 储奶袋 · 乳头护理"
      icon={Shirt}
      accent="#C25B6E"
      sourceIds={['ds-039']}
      evidenceTitle="哺乳用品采集状态"
      evidenceDescription="已补公开报告入口证据包，用于锁定哺乳文胸、防溢乳垫、储奶袋和整体 breastfeeding accessories 的可追溯来源；趋势、品牌份额和细分品类表现仍需要平台采集授权、类目定义和品牌映射，未接入前只作为半月复核线索。"
      tabs={['趋势', '品牌', '细分品类']}
      blockedItems={[
        '品牌份额和排名缺少平台授权采集或零售面板。',
        '月度趋势缺少 GMV、销量或搜索词快照。',
        '细分品类规模缺少报告口径和权重公式。',
      ]}
      collectionPlan={[
        '保留公开报告入口证据包，先证明细分品类来源可追溯，不把报告页改写为品牌份额或平台趋势事实。',
        '建立 Amazon 类目、品牌、SKU 和关键词映射。',
        '接入授权平台快照或保存公开代理指标说明。',
        '为每个细分品类补报告来源、采集时间和可展示状态。',
      ]}
      displayPolicy={[
        '未授权前不展示品牌份额、销量、GMV或排行榜。',
        '公开报告入口只展示为 source availability，不直接展示交易趋势、价格带、品牌排行或平台份额。',
        '公开代理指标必须明确标为 proxy，不能写成交易趋势。',
        'CSV 导出只允许包含已复核字段和阻断状态。',
      ]}
      internalFactSummary={
        <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">哺乳用品公开报告证据包 · ds-039</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                mode={publicEvidenceManifest?.mode ?? publicEvidenceStatus} · generatedAt={publicEvidenceManifest?.generatedAt ?? '-'} · networkCalls={nursingEvidenceNetworkCalls} · businessDataWrites={nursingEvidenceBusinessDataWrites}
              </p>
            </div>
            <span className={`inline-flex rounded-lg px-3 py-1.5 text-[10px] font-medium ${eligibleNursingEvidence.length > 0 ? 'bg-[#34c759]/10 text-[#2f7d32]' : 'bg-[#ff9500]/10 text-[#a85f00]'}`}>
              {nursingEvidenceStatusLabel}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
              <p className="text-[10px] text-[#86868b]">公开报告入口</p>
              <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">{eligibleNursingEvidence.length}/{nursingEvidence.length || '-'}</p>
            </div>
            <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
              <p className="text-[10px] text-[#86868b]">覆盖细分</p>
              <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">accessories/bra/pads/storage</p>
            </div>
            <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
              <p className="text-[10px] text-[#86868b]">写入边界</p>
              <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">businessDataWrites={nursingEvidenceBusinessDataWrites}</p>
            </div>
            <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
              <p className="text-[10px] text-[#86868b]">仍阻断指标</p>
              <p className="mt-1 text-xs font-semibold text-[#ff9500]">rank/share/GMV/sales blocked</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {eligibleNursingEvidence.map((record) => (
              <div key={record.seedId} className="rounded-xl border border-[#EDE6DF] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-[#1d1d1f]">{record.title || record.label}</p>
                    <p className="mt-1 text-[10px] text-[#86868b]">{record.evidenceClass} · {record.captureStatus}</p>
                  </div>
                  <a href={record.url} target="_blank" rel="noreferrer" className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-[#EDE6DF] px-2 py-1 text-[10px] font-medium text-[#5856d6] hover:text-[#C25B6E]">
                    source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-[#86868b]">{record.nonVerbatimSummary || record.collectionBoundary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(record.matchedEvidenceTerms ?? []).map((term) => (
                    <span key={term} className="rounded-full bg-[#34c759]/10 px-2 py-0.5 text-[9px] font-medium text-[#2f7d32]">{term}</span>
                  ))}
                  {record.notFullPlatformDataset ? (
                    <span className="rounded-full bg-[#ff9500]/10 px-2 py-0.5 text-[9px] font-medium text-[#a85f00]">notFullPlatformDataset</span>
                  ) : null}
                </div>
              </div>
            ))}
            {eligibleNursingEvidence.length === 0 ? (
              <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
                <p className="text-[10px] leading-relaxed text-[#86868b]">等待 public evidence manifest 返回通过来源、页面、校验与安全边界的 ds-039 captured 样本。</p>
              </div>
            ) : null}
          </div>

          <p className="mt-3 border-t border-[#EDE6DF] pt-3 text-[10px] leading-relaxed text-[#a85f00]">
            边界：公开报告入口只证明来源可追溯；Amazon 类目、品牌映射、SKU/ASIN、平台快照、品牌份额、销量、GMV、价格和排行榜仍必须等待授权连接器或人工证据包复核。
          </p>
        </div>
      }
    />
  );
}
