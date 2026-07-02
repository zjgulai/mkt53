import { useEffect, useState } from 'react';
import { Anchor, CheckCircle2, ExternalLink } from 'lucide-react';
import MarketDataGate from '@/components/MarketDataGate';
import { formatManifestDateTime, usePeriodicManifest } from '@/hooks/usePeriodicManifest';

interface CustomsPublicAdapterManifest {
  status: string;
  sourceId: string;
  mode: string;
  generatedAt?: string;
  queryPlan?: {
    status: string;
    sourceSystem: string;
    defaultFlow: string;
    candidateCommodityCodes: string[];
    requiredOwnerInputs: string[];
  };
  boundaries?: {
    providerCalls?: boolean;
    restrictedConnectorAccess?: boolean;
    productionWrites?: boolean;
    factPromotion?: boolean;
    networkCalls?: number;
    businessDataWrites?: number;
    shipmentRowsIncluded?: boolean;
    importerExporterIncluded?: boolean;
    supplierIncluded?: boolean;
  };
  checks?: Array<{
    id: string;
    status: string;
  }>;
}

export default function CustomsData() {
  const { manifest, period, generatedAtText } = usePeriodicManifest();
  const [adapterManifest, setAdapterManifest] = useState<CustomsPublicAdapterManifest | null>(null);
  const [adapterStatus, setAdapterStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let active = true;

    fetch('/periodic-data/customs-public-adapter.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Customs public adapter unavailable.');
        return response.json() as Promise<CustomsPublicAdapterManifest>;
      })
      .then((nextAdapterManifest) => {
        if (!active) return;
        setAdapterManifest(nextAdapterManifest);
        setAdapterStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setAdapterManifest(null);
        setAdapterStatus('missing');
      });

    return () => {
      active = false;
    };
  }, []);

  const publicEvidence = manifest?.publicEvidence;
  const publicEvidenceCaptured = publicEvidence?.captureStatusCounts?.captured ?? 0;
  const publicEvidenceTotal = publicEvidence?.total ?? 0;
  const latestAdapter = manifest?.customsPublicAdapter;
  const adapterReady =
    latestAdapter?.status === 'ready-for-public-query-planning' ||
    adapterManifest?.status === 'ready-for-public-query-planning';
  const adapterNetworkCalls = latestAdapter?.networkCalls ?? adapterManifest?.boundaries?.networkCalls ?? 0;
  const adapterBusinessDataWrites = latestAdapter?.businessDataWrites ?? adapterManifest?.boundaries?.businessDataWrites ?? 0;
  const readyChecks = adapterManifest?.checks?.filter((check) => check.status === 'ready').length ?? 0;
  const totalChecks = adapterManifest?.checks?.length ?? 0;
  const allowedClaimScopes = latestAdapter?.allowedClaimScopes ?? [];
  const forbiddenClaimScopes = latestAdapter?.forbiddenClaimScopes ?? [];
  const candidateCodes = adapterManifest?.queryPlan?.candidateCommodityCodes ?? [];
  const requiredOwnerInputs = adapterManifest?.queryPlan?.requiredOwnerInputs ?? [];
  const queryPlanStatus = adapterManifest?.queryPlan?.status ?? (adapterReady ? 'ready-for-owner-query-parameter-review' : 'waiting-for-public-evidence');

  return (
    <MarketDataGate
      title="海关数据"
      subtitle="HS编码 · 贸易流向 · 关税查询 · 出口口岸"
      icon={Anchor}
      accent="#af52de"
      sourceIds={['ds-006']}
      evidenceTitle={adapterReady ? '海关公开查询规划已就绪' : '海关数据连接器待接入'}
      evidenceDescription={
        <span>
          半月周期 {period} 已刷新公开证据 {publicEvidenceCaptured}/{publicEvidenceTotal} 条；
          {adapterReady
            ? 'U.S. Census 公开进口数据库与 CBP HTS 裁定页已可用于查询参数规划。'
            : '公开证据或海关适配器仍未完成页面可读校验。'}
          该页面仍不展示 shipment、进口商、出口商、供应商、口岸份额、销售额、GMV、收入或需求结论。
        </span>
      }
      gateStatus={{
        sourceIds: ['ds-006'],
        label: adapterReady ? '公开海关查询规划已就绪' : '海关公开适配器待复核',
        tone: adapterReady ? 'approved' : 'blocked',
        description: adapterReady
          ? `半月周期 ${period} 仅放行官方公开来源可用性、HTS 分类上下文和查询参数计划；贸易事实、公司级 shipment、份额和金额仍等待授权连接器或人工证据包。`
          : '等待 public evidence 与 owner 查询参数复核后，再开放公开查询规划。'
      }}
      tabs={['HS编码', '贸易流向', '关税查询', '出口口岸']}
      blockedItems={[
        '公开适配器只能证明官方数据源与 HTS 查询入口可用，不能生成 shipment、进口商、供应商或公司出货次数。',
        'owner 仍需确认最终 HS/HTS 编码、国家/地区、采集窗口、统计粒度和值/量字段。',
        'Import Genius、授权贸易库或人工证据包未接入前，口岸份额、国家份额、金额和需求结论继续阻断。',
      ]}
      collectionPlan={[
        '保留 U.S. Census 公开进口数据库与 CBP HTS 裁定页作为 ds-006 的公开查询规划证据。',
        `将候选 HTS ${candidateCodes.length > 0 ? candidateCodes.join(' / ') : '待 owner 确认'} 映射到 Momcozy 产品范围，并记录适用边界。`,
        `完成 owner 查询参数复核：${requiredOwnerInputs.slice(0, 2).join('；') || '等待 owner 输入国家、窗口和统计粒度。'}`,
        '接入 Import Genius、授权贸易数据库或人工证据包后，再拆分国家、口岸、产品类目和 shipment 级复核状态。',
      ]}
      displayPolicy={[
        '可展示公开官方来源可用性、HTS 查询上下文和 owner 待确认参数，不展示贸易事实。',
        '官方公开条目只能作为查询规划线索，不能替代报关记录、供应商识别或平台级销量判断。',
        '任何金额、税率、份额、同比、shipment 或公司排名进入页面前，必须先进入 evidence artifact 并通过 release review。',
      ]}
      internalFactSummary={
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">海关公开适配器 · 半月数据刷新</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                latest generated at {generatedAtText}；adapter generated at {formatManifestDateTime(adapterManifest?.generatedAt)}；query plan {queryPlanStatus}
              </p>
            </div>
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium ${adapterReady ? 'bg-[#34c759]/10 text-[#2f7d32]' : 'bg-[#ff9500]/10 text-[#a85f00]'}`}>
              <CheckCircle2 className="h-3 w-3" />
              {adapterReady ? 'ready-for-public-query-planning' : adapterStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
              <p className="text-[10px] text-[#86868b]">半月周期</p>
              <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">{period}</p>
            </div>
            <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
              <p className="text-[10px] text-[#86868b]">公开证据</p>
              <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">{publicEvidenceCaptured}/{publicEvidenceTotal} captured</p>
            </div>
            <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
              <p className="text-[10px] text-[#86868b]">适配器检查</p>
              <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">{readyChecks}/{totalChecks || '-'} ready</p>
            </div>
            <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
              <p className="text-[10px] text-[#86868b]">写入边界</p>
              <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">adapter writes={adapterBusinessDataWrites}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
              <h3 className="text-[11px] font-semibold text-[#1d1d1f]">允许展示范围</h3>
              <div className="mt-2 space-y-2">
                {allowedClaimScopes.map((scope) => (
                  <p key={scope} className="text-[10px] leading-relaxed text-[#2f7d32]">· {scope}</p>
                ))}
                <p className="text-[10px] leading-relaxed text-[#86868b]">
                  数据采集边界：providerCalls={String(adapterManifest?.boundaries?.providerCalls ?? false)} · restrictedConnectorAccess={String(adapterManifest?.boundaries?.restrictedConnectorAccess ?? false)} · networkCalls={adapterNetworkCalls}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-[#EDE6DF] bg-white p-3">
              <h3 className="text-[11px] font-semibold text-[#1d1d1f]">禁止展示范围</h3>
              <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {forbiddenClaimScopes.map((scope) => (
                  <p key={scope} className="text-[10px] leading-relaxed text-[#a85f00]">· {scope}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#EDE6DF] pt-3">
            <a
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDE6DF] px-3 py-1.5 text-[10px] font-medium text-[#1d1d1f] hover:bg-[#FBF8F5]"
              href="/periodic-data/customs-public-adapter.json"
              target="_blank"
              rel="noreferrer"
            >
              customs adapter manifest <ExternalLink className="h-3 w-3" />
            </a>
            <a
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDE6DF] px-3 py-1.5 text-[10px] font-medium text-[#1d1d1f] hover:bg-[#FBF8F5]"
              href="/periodic-data/public-evidence-samples.json"
              target="_blank"
              rel="noreferrer"
            >
              public evidence samples <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      }
    />
  );
}
