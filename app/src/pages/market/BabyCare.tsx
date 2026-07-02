import { useEffect, useState } from 'react';
import { Baby, ExternalLink } from 'lucide-react';
import MarketDataGate from '@/components/MarketDataGate';

interface PublicEvidenceRecord {
  seedId: string;
  sourceId: string;
  page: string;
  evidenceClass: string;
  captureStatus: string;
  title?: string;
  label?: string;
  url: string;
  collectionBoundary: string;
  notFullPlatformDataset?: boolean;
  matchedEvidenceTerms?: string[];
  nonVerbatimSummary?: string;
  safety?: {
    networkCalls?: number;
    businessDataWrites?: number;
  };
}

interface PublicEvidenceManifest {
  mode: string;
  generatedAt: string;
  summary?: {
    total: number;
    businessDataWrites: number;
  };
  records?: PublicEvidenceRecord[];
}

export default function BabyCare() {
  const [publicEvidenceManifest, setPublicEvidenceManifest] = useState<PublicEvidenceManifest | null>(null);
  const [publicEvidenceStatus, setPublicEvidenceStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let active = true;

    fetch('/periodic-data/public-evidence-samples.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Public evidence samples unavailable.');
        return response.json() as Promise<PublicEvidenceManifest>;
      })
      .then((manifest) => {
        if (!active) return;
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

  const babyCareEvidence = (publicEvidenceManifest?.records ?? []).filter(
    (record) => record.sourceId === 'ds-037' || record.page === 'BabyCare',
  );
  const capturedBabyCareEvidence = babyCareEvidence.filter((record) => record.captureStatus === 'captured');
  const babyCareEvidenceNetworkCalls = babyCareEvidence.reduce((total, record) => total + (record.safety?.networkCalls ?? 0), 0);
  const babyCareEvidenceBusinessDataWrites = publicEvidenceManifest?.summary?.businessDataWrites ?? 0;
  const babyCareEvidenceStatusLabel =
    publicEvidenceStatus === 'ready'
      ? `${capturedBabyCareEvidence.length}/${babyCareEvidence.length} captured`
      : publicEvidenceStatus;

  return (
    <MarketDataGate
      title="婴儿护理分析"
      subtitle="温奶器 · 消毒器 · 监视器 · 加湿器"
      icon={Baby}
      accent="#C25B6E"
      sourceIds={['ds-037']}
      evidenceTitle="婴儿护理数据为展示性推算"
      evidenceDescription="已补公开报告入口证据包，用于锁定 baby care、温奶/消毒、监视器和加湿器的可追溯来源；规模、品牌份额和 Momcozy 占比仍缺少平台采集授权、Amazon 类目采集和权重公式，不能作为正式经营结论。"
      tabs={['趋势', '细分品类', '品牌份额']}
      blockedItems={[
        '婴儿护理品类边界需要先定义，不同报告口径不可混用。',
        '品牌份额需要平台采集授权或零售面板。',
        'AI功能、监视器、消毒器等细分趋势需要公开报告或SKU快照。',
      ]}
      collectionPlan={[
        '保留公开报告入口证据包，先证明细分品类来源可追溯，不把报告页改写为品牌份额或平台趋势事实。',
        '拆分温奶器、消毒器、监视器和加湿器的来源口径。',
        '按类目建立公开报告、零售页和平台数据的证据矩阵。',
        '将 Momcozy 自身占比留在待授权经营数据层。',
      ]}
      displayPolicy={[
        '未复核前不展示市场规模、增长率、品牌份额或功能渗透率。',
        '公开报告入口只展示为 source availability，不直接展示交易趋势、价格带、品牌排行或平台份额。',
        '细分品类可以展示采集任务和定义，不展示未证实排行。',
        '恢复图表前先完成 source_id、证据路径和最后复核时间。',
      ]}
      internalFactSummary={
        <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">婴儿护理公开报告证据包 · ds-037</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                mode={publicEvidenceManifest?.mode ?? publicEvidenceStatus} · generatedAt={publicEvidenceManifest?.generatedAt ?? '-'} · networkCalls={babyCareEvidenceNetworkCalls} · businessDataWrites={babyCareEvidenceBusinessDataWrites}
              </p>
            </div>
            <span className={`inline-flex rounded-lg px-3 py-1.5 text-[10px] font-medium ${capturedBabyCareEvidence.length > 0 ? 'bg-[#34c759]/10 text-[#2f7d32]' : 'bg-[#ff9500]/10 text-[#a85f00]'}`}>
              {babyCareEvidenceStatusLabel}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
              <p className="text-[10px] text-[#86868b]">公开报告入口</p>
              <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">{capturedBabyCareEvidence.length}/{babyCareEvidence.length || '-'}</p>
            </div>
            <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
              <p className="text-[10px] text-[#86868b]">覆盖细分</p>
              <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">care/warmer/monitor/humidifier</p>
            </div>
            <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
              <p className="text-[10px] text-[#86868b]">写入边界</p>
              <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">businessDataWrites={babyCareEvidenceBusinessDataWrites}</p>
            </div>
            <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
              <p className="text-[10px] text-[#86868b]">仍阻断指标</p>
              <p className="mt-1 text-xs font-semibold text-[#ff9500]">rank/share/GMV/sales blocked</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {babyCareEvidence.map((record) => (
              <div key={record.seedId} className="rounded-xl border border-[#EDE6DF] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-[#1d1d1f]">{record.title || record.label}</p>
                    <p className="mt-1 text-[10px] text-[#86868b]">{record.evidenceClass} · {record.captureStatus}</p>
                  </div>
                  <a
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#EDE6DF] px-2 py-1 text-[10px] text-[#C25B6E] hover:bg-[#F5EDE8]"
                    href={record.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-[#6e6e73]">{record.nonVerbatimSummary || record.collectionBoundary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(record.matchedEvidenceTerms ?? []).map((term) => (
                    <span key={term} className="rounded-full bg-[#F5EDE8] px-2 py-1 text-[9px] text-[#7A6B6B]">
                      {term}
                    </span>
                  ))}
                  {record.notFullPlatformDataset ? (
                    <span className="rounded-full bg-[#ff9500]/10 px-2 py-1 text-[9px] text-[#a85f00]">notFullPlatformDataset</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-[#86868b]">
            边界：公开报告入口只能证明来源可追溯；Amazon 类目、品牌映射、SKU/ASIN、平台快照、销售、GMV、价格、排名和 Momcozy 占比仍需授权连接器或人工证据。
          </p>
        </div>
      }
    />
  );
}
