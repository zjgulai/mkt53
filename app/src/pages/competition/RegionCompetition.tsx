import { useEffect, useState } from 'react';
import { Award, Database, ExternalLink, FileBarChart, Globe, LayoutGrid, Map as MapIcon, MapPin, ShieldAlert, Target } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import Sidebar from '@/components/Sidebar';
import { erpChannelGrowthSnapshot, erpChannelTargetAttainment, erpDerivedBatch3Artifact } from '@/data/market-insight-data';

interface CountryEvidence {
  name: string;
  channel: string;
  shareStatus: string;
  rankStatus: string;
  competitorStatus: string;
  opportunity: string;
  blocker: string;
}

interface RegionEvidence {
  region: string;
  color: string;
  marketStatus: string;
  shareStatus: string;
  summary: string;
  countries: CountryEvidence[];
}

interface PublicEvidenceRecord {
  seedId: string;
  sourceId: string;
  page: string;
  evidenceClass: string;
  captureStatus: string;
  capturedAt?: string;
  title?: string;
  label?: string;
  url: string;
  collectionBoundary: string;
  notFullPlatformDataset?: boolean;
  matchedEvidenceTerms?: string[];
  missingEvidenceTerms?: string[];
  nonVerbatimSummary?: string;
  safety?: {
    networkCalls?: number;
    loginAttempted?: boolean;
    bypassAttempted?: boolean;
    businessDataWrites?: number;
  };
}

interface PublicEvidenceManifest {
  mode: string;
  generatedAt: string;
  summary?: {
    total: number;
    captureStatusCounts?: Record<string, number>;
    evidenceClassCounts?: Record<string, number>;
    networkCalls: number;
    businessDataWrites: number;
  };
  records?: PublicEvidenceRecord[];
}

const regionData: RegionEvidence[] = [
  {
    region: '北美',
    color: '#5856d6',
    marketStatus: '公开报告+零售面板待交叉验证',
    shareStatus: 'Amazon BA/零售面板待授权',
    summary: '北美仍是重点区域，但 Momcozy 国家份额、竞品份额和排名不能使用样例值外推，需要 Amazon Brand Analytics、零售面板或渠道销售快照共同确认。',
    countries: [
      { name: '美国', channel: 'Amazon + Target + Walmart', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '保险报销和加热功能线索', blocker: '渠道口径和保险渠道覆盖待确认' },
      { name: '加拿大', channel: 'Walmart + Shoppers + Amazon', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '新品首发线索待跟踪', blocker: '法语市场与零售覆盖待确认' },
      { name: '墨西哥', channel: 'Mercado Libre + Amazon', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '近岸供应链和电商渠道线索', blocker: '价格敏感度与物流时效待验证' },
    ],
  },
  {
    region: '欧洲',
    color: '#34c759',
    marketStatus: '公开报告+合规台账待交叉验证',
    shareStatus: '国家份额待授权',
    summary: '欧洲区域需要把市场报告、Amazon 渠道、线下药妆渠道和 MDR/UKCA 合规路径分开验证，未授权前不展示国家排名和份额。',
    countries: [
      { name: '德国', channel: 'DM + Rossmann + Amazon', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '展会和药妆渠道线索', blocker: '本地合规与渠道覆盖待确认' },
      { name: '英国', channel: 'Boots + Amazon + Tesco', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '英语市场运营线索', blocker: 'UKCA和零售数据待确认' },
      { name: '法国', channel: '药妆店 + 电商', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '设计偏好和高端定位线索', blocker: '渠道分散与本地化证据不足' },
      { name: '意大利', channel: '母婴专卖店 + 电商', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '本地渠道合作线索', blocker: '渠道覆盖和支付习惯待验证' },
      { name: '西班牙', channel: 'Druni + 电商', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '拉美裔用户连接线索', blocker: '品牌认知与渠道数据待补' },
    ],
  },
  {
    region: '亚太',
    color: '#C25B6E',
    marketStatus: '公开报告+本地平台数据待交叉验证',
    shareStatus: '平台份额待授权',
    summary: '亚太区域平台差异大，Amazon、Rakuten、Coupang、天猫、京东、Shopee、Lazada 和 TikTok Shop 不能混用同一份额口径。',
    countries: [
      { name: '日本', channel: 'Amazon + Rakuten + 本地零售', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待本地平台验证', opportunity: '轻薄产品定位线索', blocker: 'PSC适用性和本地竞品面板待确认' },
      { name: '韩国', channel: 'Gmarket + Coupang', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待本地平台验证', opportunity: '直播电商和KOL线索', blocker: '本地竞品口碑与渠道数据待补' },
      { name: '澳大利亚', channel: 'Chemist Warehouse + Amazon', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '英语市场和药房渠道线索', blocker: '召回与合规要求待确认' },
      { name: '中国', channel: '天猫 + 京东 + 抖音', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待本地平台验证', opportunity: 'DTC出海和国潮认知线索', blocker: '价格战和平台费用待验证' },
      { name: '东南亚', channel: 'Shopee + Lazada + TikTok', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待本地平台验证', opportunity: '移动电商增长线索', blocker: '平台分散、物流和支付差异待确认' },
    ],
  },
  {
    region: '拉美',
    color: '#ff9500',
    marketStatus: '公开报告+Mercado渠道待验证',
    shareStatus: '国家份额待授权',
    summary: '拉美区域不能仅用 Amazon 样例推断全渠道份额，需要 Mercado、线下零售、进口税和本地物流数据共同判断。',
    countries: [
      { name: '巴西', channel: 'Mercado Livre + Amazon', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '展会和中产消费线索', blocker: '进口税、物流和葡语本地化待确认' },
      { name: '墨西哥', channel: 'Mercado Libre + Amazon', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '美国市场跳板线索', blocker: '品牌认知和零售覆盖待补' },
    ],
  },
  {
    region: '中东非',
    color: '#af52de',
    marketStatus: '公开报告+本地渠道待验证',
    shareStatus: '国家份额待授权',
    summary: '中东非需要拆分高端进口渠道、清真认证、本地温度环境和平台覆盖，未授权前不展示国家排名和份额。',
    countries: [
      { name: 'UAE', channel: 'Noon + Namshi + 线下高端', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '高消费力和进口依赖线索', blocker: '认证和高温适应性待验证' },
      { name: '沙特', channel: 'Noon + 线下零售', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '人口结构和零售扩张线索', blocker: '文化适应和监管要求待确认' },
      { name: '南非', channel: 'Takealot + 商超', shareStatus: '待授权', rankStatus: '待授权', competitorStatus: '待面板验证', opportunity: '英语市场和商超渠道线索', blocker: '物流和汇率波动待验证' },
    ],
  },
];

const evidenceChecklist = [
  { title: 'Amazon Brand Analytics', status: '待授权', note: '仅可覆盖 Amazon 渠道，不能外推全渠道份额' },
  { title: '零售面板/行业报告', status: '待采购或人工复核', note: '用于国家级份额、排名和竞品结构交叉验证' },
  { title: '内部ERP/渠道销售快照', status: 'Batch19内部代理已放行', note: '用于 Momcozy 自身YTD numerator；不生成区域份额或排名' },
  { title: '公开平台/官网采集', status: '可做线索', note: '只能支撑上新、渠道存在和卖点线索，不支撑份额结论' },
];

const sidebarItems = [
  { label: '看竞争', children: [
    { label: '竞品库', path: '/competition', icon: <LayoutGrid className="w-4 h-4" /> },
    { label: '新品竞争', path: '/competition/new', icon: <FileBarChart className="w-4 h-4" /> },
    { label: '区域竞争', path: '/competition/region', icon: <MapIcon className="w-4 h-4" /> },
    { label: '产品信息管理', path: '/competition/products', icon: <Database className="w-4 h-4" /> },
  ]},
];

function formatUsdMillions(value: number) {
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

export default function RegionCompetition() {
  const [activeRegion, setActiveRegion] = useState('北美');
  const [publicEvidenceManifest, setPublicEvidenceManifest] = useState<PublicEvidenceManifest | null>(null);
  const [publicEvidenceStatus, setPublicEvidenceStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const region = regionData.find(r => r.region === activeRegion) || regionData[0];

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

  const regionPublicEvidence = (publicEvidenceManifest?.records ?? []).filter(
    (record) => record.sourceId === 'ds-010' || record.page === 'RegionCompetition',
  );
  const capturedRegionPublicEvidence = regionPublicEvidence.filter((record) => record.captureStatus === 'captured');
  const regionEvidenceBusinessDataWrites = regionPublicEvidence.reduce(
    (total, record) => total + (record.safety?.businessDataWrites ?? 0),
    0,
  );
  const regionEvidenceNetworkCalls = regionPublicEvidence.reduce((total, record) => total + (record.safety?.networkCalls ?? 0), 0);
  const regionEvidenceStatusLabel =
    publicEvidenceStatus === 'ready'
      ? `${capturedRegionPublicEvidence.length}/${regionPublicEvidence.length} captured`
      : publicEvidenceStatus;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#34c759] flex items-center justify-center shadow-sm">
                  <Globe className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">区域竞争分析</h1>
                  <p className="text-xs text-[#B5AFA8]">Amazon BA 与零售面板待授权 · 区域份额不外推全渠道</p>
                </div>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-010']}
              title="区域竞争外部份额门禁"
              description="已补 Amazon 官方公开文档和 Mordor 区域报告入口作为 source availability；Amazon BA 授权快照、国家/marketplace 口径、外部渠道分母仍未接入，不能展示区域份额、国家排名或竞品份额。"
            />

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  {/* audit-source: ds-010 */}
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">区域公开来源入口证据包 · ds-010</h2>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                    mode={publicEvidenceManifest?.mode ?? publicEvidenceStatus} · generatedAt={publicEvidenceManifest?.generatedAt ?? '-'} · networkCalls={regionEvidenceNetworkCalls} · businessDataWrites={regionEvidenceBusinessDataWrites}
                  </p>
                </div>
                <span className={`inline-flex rounded-lg px-3 py-1.5 text-[10px] font-medium ${capturedRegionPublicEvidence.length > 0 ? 'bg-[#34c759]/10 text-[#2f7d32]' : 'bg-[#ff9500]/10 text-[#a85f00]'}`}>
                  {regionEvidenceStatusLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">公开来源入口</p>
                  <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">{capturedRegionPublicEvidence.length}/{regionPublicEvidence.length || '-'}</p>
                </div>
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">覆盖口径</p>
                  <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">Marketplace/Endpoint/BA/Regional report</p>
                </div>
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">写入边界</p>
                  <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">businessDataWrites={regionEvidenceBusinessDataWrites}</p>
                </div>
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">份额/排名</p>
                  <p className="mt-1 text-xs font-semibold text-[#ff9500]">regional share/rank blocked</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {regionPublicEvidence.map((record) => (
                  <a
                    key={record.seedId}
                    href={record.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3 hover:border-[#C25B6E]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#1d1d1f]">{record.label ?? record.title ?? record.seedId}</p>
                        <p className="mt-1 text-[10px] text-[#86868b]">{record.evidenceClass} · {record.captureStatus}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-[#C25B6E]" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-[#5f5f66]">{record.nonVerbatimSummary ?? record.collectionBoundary}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(record.matchedEvidenceTerms ?? []).slice(0, 3).map((term) => (
                        <span key={term} className="rounded-md bg-white px-2 py-0.5 text-[9px] font-medium text-[#2f7d32]">{term}</span>
                      ))}
                      {record.notFullPlatformDataset && (
                        <span className="rounded-md bg-[#ff9500]/10 px-2 py-0.5 text-[9px] font-medium text-[#a85f00]">notFullPlatformDataset</span>
                      )}
                    </div>
                  </a>
                ))}
              </div>

              <p className="mt-4 text-[10px] leading-relaxed text-[#86868b]">
                边界：公开文档和报告入口只证明区域数据源可访问、可复核；Amazon BA 授权快照、国家/marketplace 映射、外部渠道分母、国家排名、竞品份额、销量、GMV、SKU 和价格仍保持阻断。
              </p>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-050', 'ds-051']}
              title="区域竞争份额边界"
              description="ERP ds-050/ds-051 已经Batch19放行，可提供 Momcozy 自身YTD private/internal proxy numerator；当前仍缺国家、平台、渠道明细和外部份额分母，不能计算区域份额或排名。"
            />

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  {/* audit-source: ds-050 ds-051 */}
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP区域份额 numerator · Batch19已放行</h2>
                  <p className="text-[10px] text-[#86868b] mt-1">
                    {erpDerivedBatch3Artifact.batchId}；source ids: {erpChannelGrowthSnapshot.sourceIds.join(' / ')} / {erpChannelTargetAttainment.sourceIds.join(' / ')}；private/internal L3；canDisplayAsFact=true；仅限内部proxy。
                  </p>
                </div>
                <span className="rounded-lg bg-[#34c759]/10 px-3 py-1.5 text-[10px] font-medium text-[#2f7d32]">
                  可展示内部 numerator
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
                <div className="border-b border-[#EDE6DF] pb-2">
                  <p className="text-[10px] text-[#86868b]">全渠道YTD实际销售代理</p>
                  <p className="font-semibold text-[#1d1d1f]">{formatUsdMillions(erpChannelGrowthSnapshot.actualSalesUsd)}</p>
                </div>
                <div className="border-b border-[#EDE6DF] pb-2">
                  <p className="text-[10px] text-[#86868b]">全渠道YTD销量代理</p>
                  <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpChannelGrowthSnapshot.actualUnits)}</p>
                </div>
                <div className="border-b border-[#EDE6DF] pb-2">
                  <p className="text-[10px] text-[#86868b]">销售增长代理</p>
                  <p className="font-semibold text-[#1d1d1f]">{erpChannelGrowthSnapshot.salesGrowthPct.toFixed(2)}%</p>
                </div>
                <div className="border-b border-[#EDE6DF] pb-2">
                  <p className="text-[10px] text-[#86868b]">销售额达成代理</p>
                  <p className="font-semibold text-[#1d1d1f]">{erpChannelTargetAttainment.salesAttainmentPct.toFixed(2)}%</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-[#86868b]">
                该聚合没有国家、平台、Amazon/零售/线下渠道拆分，也没有外部市场分母；本页可以展示“自有经营 numerator”，但不能据此计算北美、欧洲、亚太等区域份额或排名。
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {regionData.map((r) => (
                <button key={r.region} onClick={() => setActiveRegion(r.region)} className={`bg-white rounded-2xl p-5 shadow-sm border text-left transition-all ${activeRegion === r.region ? 'border-[#C25B6E] ring-1 ring-[#C25B6E]/20' : 'border-[#EDE6DF]'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-xs font-semibold text-[#1d1d1f]">{r.region}</span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: r.color }}>{r.marketStatus}</p>
                  <p className="text-[10px] text-[#86868b] mt-1">{r.shareStatus}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${region.color}15` }}>
                    <MapPin className="w-4 h-4" style={{ color: region.color }} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">{region.region}采集边界</h3>
                    <p className="text-[10px] text-[#86868b]">{region.shareStatus}</p>
                  </div>
                </div>
                <p className="text-xs text-[#1d1d1f] leading-relaxed">{region.summary}</p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                    <p className="text-[10px] text-[#86868b] mb-1">市场规模</p>
                    <p className="text-xs font-semibold text-[#C25B6E]">{region.marketStatus}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                    <p className="text-[10px] text-[#86868b] mb-1">份额/排名</p>
                    <p className="text-xs font-semibold text-[#ff9500]">{region.shareStatus}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-[#ff9500]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">证据补齐清单</h3>
                </div>
                <div className="space-y-3">
                  {evidenceChecklist.map((item) => (
                    <div key={item.title} className="p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#1d1d1f]">{item.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff9500]/10 text-[#ff9500]">{item.status}</span>
                      </div>
                      <p className="text-[10px] text-[#86868b] leading-relaxed">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${region.color}15` }}>
                  <MapPin className="w-4 h-4" style={{ color: region.color }} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">{region.region}国家级采集任务</h3>
                <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg ml-auto">份额和排名待授权</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {region.countries.map((country) => (
                  <div key={country.name} className="p-4 rounded-xl bg-[#FBF8F5] hover:shadow-sm transition-natural">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-[#1d1d1f]">{country.name}</h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: region.color }}>待采集</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div><span className="text-[10px] text-[#86868b]">Momcozy份额</span><p className="text-xs font-bold text-[#ff9500]">{country.shareStatus}</p></div>
                      <div><span className="text-[10px] text-[#86868b]">国家排名</span><p className="text-xs font-medium text-[#ff9500]">{country.rankStatus}</p></div>
                    </div>
                    <p className="text-[10px] text-[#86868b] mb-1">竞品结构：{country.competitorStatus}</p>
                    <p className="text-[10px] text-[#86868b] mb-1">渠道：{country.channel}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#34c759]/10 text-[#34c759]">{country.opportunity}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#ff3b30]/10 text-[#ff3b30]">{country.blocker}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center"><Target className="w-4 h-4 text-[#C25B6E]" strokeWidth={2} /></div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">区域竞争策略门禁</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: '巩固阵地', color: '#34c759', markets: ['北美', '欧洲'], actions: ['先补授权份额', '再确认线下渠道', '最后制定投放动作'] },
                  { title: '快速渗透', color: '#ff9500', markets: ['亚太', '拉美'], actions: ['拆分平台口径', '补本地渠道证据', '保留代理指标标签'] },
                  { title: '布局未来', color: '#5856d6', markets: ['中东非', '新兴市场'], actions: ['验证认证路径', '确认渠道覆盖', '建立公开线索清单'] },
                ].map((strategy) => (
                  <div key={strategy.title} className="p-4 rounded-xl bg-[#FBF8F5]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: strategy.color }} />
                      <h4 className="text-xs font-semibold" style={{ color: strategy.color }}>{strategy.title}</h4>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {strategy.markets.map((market) => (<span key={market} className="px-1.5 py-0.5 rounded text-[9px] bg-white text-[#86868b]">{market}</span>))}
                    </div>
                    <div className="space-y-1">
                      {strategy.actions.map((action) => (
                        <div key={action} className="flex items-start gap-1.5">
                          <Award className="w-3 h-3 text-[#C25B6E] mt-0.5 flex-shrink-0" />
                          <p className="text-[10px] text-[#86868b]">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
