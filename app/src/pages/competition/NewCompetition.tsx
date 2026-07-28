import { useEffect, useState } from 'react';
import { LayoutGrid, FileBarChart, Map as MapIcon, Database, TrendingUp, Zap, Shield, ArrowUpRight, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import Sidebar from '@/components/Sidebar';
import {
  isEligibleCapturedPublicEvidenceRecord,
  parsePublicEvidenceManifest,
  summarizePublicEvidenceSafety,
  type PublicEvidenceManifest,
} from '@/lib/public-evidence';

const pricePending = '价格待复核';
const trendPending = '趋势待复核';

// ── 2026 NEW PRODUCT DATA (Latest as of May 2026) ──
const newProducts2026 = [
  { date: '2026-05', brand: 'Momcozy', name: 'W1 Wearable', category: '吸奶器', price: pricePending, highlight: '内置加热+按摩技术 · 发布线索待复核', threat: '自研线索', trend: trendPending },
  { date: '2026-05', brand: 'Momcozy', name: 'BM08 Smart Baby Monitor', category: '智能监视器', price: pricePending, highlight: 'AI睡眠监测+呼吸追踪线索待复核', threat: '自研线索', trend: trendPending },
  { date: '2026-05', brand: 'Momcozy', name: 'Birth Ease Maternity Ball', category: '孕期护理', price: pricePending, highlight: '分娩辅助+产后恢复线索待复核', threat: '自研线索', trend: trendPending },
  { date: '2026-05', brand: 'Momcozy', name: 'Red Light Therapy Device', category: '产后恢复', price: pricePending, highlight: '红光治疗+伤口愈合线索待复核', threat: '自研线索', trend: trendPending },
  { date: '2026-01', brand: 'Momcozy', name: 'Air1 Ultra-Slim', category: '吸奶器', price: pricePending, highlight: '超薄机身与上市线索待复核', threat: '自研线索', trend: trendPending },
];

const newProducts2025 = [
  { date: '2025-12', brand: 'Medela', name: 'Melody InBra', category: '穿戴式', price: pricePending, highlight: '超静音+极简操作线索待复核', threat: '中', trend: trendPending },
  { date: '2025-10', brand: 'Medela', name: 'Motion InBra', category: '穿戴式', price: pricePending, highlight: '医院级卖点与奶量提升声明待复核', threat: '高', trend: trendPending },
  { date: '2025-10', brand: 'Momcozy', name: 'M9 Mobile Flow', category: '穿戴式', price: pricePending, highlight: '气泵隔膜结构+APP控制线索待复核', threat: '自研线索', trend: trendPending },
  { date: '2025-09', brand: 'Willow', name: 'Willow Sync™', category: '穿戴式', price: pricePending, highlight: '保险渠道与AI助手线索待复核', threat: '高', trend: trendPending },
  { date: '2025-08', brand: 'Momcozy', name: 'M5 Wearable', category: '穿戴式', price: pricePending, highlight: 'DoubleFit法兰+静音卖点待复核', threat: '自研线索', trend: trendPending },
  { date: '2025-06', brand: 'Ameda', name: 'GLO Wearable', category: '穿戴式', price: pricePending, highlight: '奖项与技术卖点待复核', threat: '中', trend: trendPending },
  { date: '2025-05', brand: 'Medela', name: 'Magic InBra', category: '穿戴式', price: pricePending, highlight: 'FluidFeel Technology线索待复核', threat: '高', trend: trendPending },
  { date: '2025-05', brand: 'eufy', name: 'E20 Wearable', category: '穿戴式', price: pricePending, highlight: 'HeatFlow技术+温热功能线索待复核', threat: '中', trend: trendPending },
  { date: '2025-01', brand: 'Willow+Elvie', name: '配件系列', category: '配件', price: pricePending, highlight: '硅胶集乳器+玻璃储奶瓶线索待复核', threat: '低', trend: trendPending },
];

const upcoming2026 = [
  { date: '2026-07', brand: 'Medela', name: 'Magic InBra', category: '加拿大上市', price: pricePending, highlight: '加拿大首发与认证声明待复核', threat: '高', trend: '待监测' },
  { date: '2026-08', brand: 'Imani', name: 'i2plus Pro Series', category: '穿戴式', price: pricePending, highlight: '2部件免提罩杯声明待复核', threat: '中', trend: '待监测' },
  { date: '2026-08', brand: 'Philips Avent', name: 'Hands-free Breast Pump', category: '穿戴式', price: pricePending, highlight: '印度首发与定位待复核', threat: '中', trend: '待监测' },
  { date: '2026-09', brand: 'Hegen', name: 'PCTO Wearable Pump', category: '穿戴式', price: pricePending, highlight: '新加坡品牌进入穿戴式赛道线索待复核', threat: '中', trend: '待监测' },
  { date: '2026-Q3', brand: 'Momcozy', name: 'Deep Clean Bottle Washer', category: '清洁电器', price: pricePending, highlight: '奶瓶清洁+UV消毒线索待复核', threat: '自研线索', trend: '待监测' },
];

// 2026 Market Data

const threatMatrix = [
  { brand: 'Medela', count: 5, threatLevel: '高', color: '#ff3b30', reason: 'Magic InBra加拿大上市与Melody/Motion线索待复核', action: '补官方链接后再定营销动作' },
  { brand: 'Willow+Elvie', count: 3, threatLevel: '高', color: '#ff3b30', reason: '保险渠道与配件生态线索待复核', action: '补保险渠道证据和配件SKU清单' },
  { brand: 'Ameda', count: 2, threatLevel: '中', color: '#ff9500', reason: 'GLO获奖+Pearl医院级认证+Walgreens渠道', action: '监控零售扩张+医院渠道' },
  { brand: 'Imani', count: 1, threatLevel: '中', color: '#ff9500', reason: 'i2plus Pro 2部件创新设计+韩国制造', action: '评估其技术差异化程度' },
  { brand: 'eufy', count: 1, threatLevel: '中', color: '#ff9500', reason: 'HeatFlow加热功能+Anker品牌背书', action: 'Momcozy W1已内置加热，先发优势' },
  { brand: 'Hegen', count: 1, threatLevel: '低', color: '#34c759', reason: 'PCTO进入穿戴式赛道但经验有限', action: '维持关注' },
];

const sidebarItems = [
  { label: '看竞争', children: [
    { label: '竞品库', path: '/competition', icon: <LayoutGrid className="w-4 h-4" /> },
    { label: '新品竞争', path: '/competition/new', icon: <FileBarChart className="w-4 h-4" /> },
    { label: '区域竞争', path: '/competition/region', icon: <MapIcon className="w-4 h-4" /> },
    { label: '产品信息管理', path: '/competition/products', icon: <Database className="w-4 h-4" /> },
  ]},
];

export default function NewCompetition() {
  const [timeFilter, setTimeFilter] = useState('全部');
  const [publicEvidenceManifest, setPublicEvidenceManifest] = useState<PublicEvidenceManifest | null>(null);
  const [publicEvidenceStatus, setPublicEvidenceStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const filters = ['全部', '2026年', '2025年', '即将上市'];

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

  const getFiltered = () => {
    if (timeFilter === '2026年') return newProducts2026;
    if (timeFilter === '2025年') return newProducts2025;
    if (timeFilter === '即将上市') return upcoming2026;
    return [...newProducts2026, ...newProducts2025];
  };
  const filtered = getFiltered();
  const highThreat = threatMatrix.filter(t => t.threatLevel === '高').length;
  const newCompetitionEvidence = (publicEvidenceManifest?.records ?? []).filter(
    (record) => record.sourceId === 'ds-008' && record.page === 'NewCompetition',
  );
  const eligibleNewCompetitionEvidence = newCompetitionEvidence.filter((record) =>
    isEligibleCapturedPublicEvidenceRecord(record, publicEvidenceManifest?.mode),
  );
  const { businessDataWrites: evidenceBusinessDataWrites, networkCalls: evidenceNetworkCalls } =
    summarizePublicEvidenceSafety(newCompetitionEvidence);
  const evidenceStatusLabel =
    publicEvidenceStatus === 'ready'
      ? `${eligibleNewCompetitionEvidence.length}/${newCompetitionEvidence.length} eligible captured`
      : publicEvidenceStatus;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm">
                    <Zap className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">新品竞争监测</h1>
                    <p className="text-xs text-[#86868b]">2025-2026年竞品新品动态 · 半月复核线索</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {filters.map(f => (
                    <button key={f} onClick={() => setTimeFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${timeFilter === f ? 'bg-[#C25B6E] text-white' : 'bg-[#FBF8F5] text-[#86868b]'}`}>{f}</button>
                  ))}
                </div>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-008']}
              title="新品线索使用边界"
              description={
                <span>
                  当前页面读取 public evidence manifest 中 ds-008 的官网/新闻公开样本；这些样本只支撑新品与卖点线索，销量、价格、评分、份额、威胁等级和应对动作仍属于待授权或内部判断。
                </span>
              }
              cadence="新品线索复核口径"
            />

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">新品公开证据采集包 · ds-008</h2>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                    mode={publicEvidenceManifest?.mode ?? publicEvidenceStatus} · generatedAt={publicEvidenceManifest?.generatedAt ?? '-'} · businessDataWrites={evidenceBusinessDataWrites}
                  </p>
                </div>
                <span className={`inline-flex rounded-lg px-3 py-1.5 text-[10px] font-medium ${eligibleNewCompetitionEvidence.length > 0 ? 'bg-[#34c759]/10 text-[#2f7d32]' : 'bg-[#ff9500]/10 text-[#a85f00]'}`}>
                  {evidenceStatusLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">官网/新闻样本</p>
                  <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">{eligibleNewCompetitionEvidence.length}/{newCompetitionEvidence.length || '-'}</p>
                </div>
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">网络采集</p>
                  <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">networkCalls={evidenceNetworkCalls}</p>
                </div>
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">写入边界</p>
                  <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">businessDataWrites={evidenceBusinessDataWrites}</p>
                </div>
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">平台指标</p>
                  <p className="mt-1 text-xs font-semibold text-[#ff9500]">price/rating/share blocked</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {eligibleNewCompetitionEvidence.map((record) => (
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
                {eligibleNewCompetitionEvidence.length === 0 ? (
                  <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                    <p className="text-[10px] leading-relaxed text-[#86868b]">等待 public evidence manifest 返回通过来源、页面、校验与安全边界的 ds-008 captured 样本。</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 2026 Market Snapshot */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '2026全球吸奶器市场', value: '$3.81B', sub: 'Precedence Research · ds-001', color: '#C25B6E', icon: <TrendingUp className="w-4 h-4" /> },
                { label: '2026穿戴式市场', value: '$233M', sub: 'Fortune BI · ds-045', color: '#ff9500', icon: <Zap className="w-4 h-4" /> },
                { label: 'Momcozy 2026新品', value: '5款', sub: 'W1/Air1/BM08等', color: '#34c759', icon: <CheckCircle className="w-4 h-4" /> },
                { label: '高威胁线索', value: String(highThreat), sub: '内部判断 · 待授权验证', color: '#ff3b30', icon: <AlertTriangle className="w-4 h-4" /> },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                    <span className="text-xs text-[#86868b]">{s.label}</span>
                  </div>
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
                  <p className="text-[10px] text-[#86868b]">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Threat Matrix */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center"><Shield className="w-4 h-4 text-[#ff3b30]" strokeWidth={2} /></div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">2026年竞品威胁评估</h3>
              </div>
              <div className="space-y-2">
                {threatMatrix.map((t, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[#FBF8F5]">
                    <div className="w-24 flex-shrink-0">
                      <span className="text-xs font-semibold text-[#1d1d1f]">{t.brand}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-white" style={{ backgroundColor: t.color }}>{t.threatLevel}</span>
                        <span className="text-[9px] text-[#86868b]">{t.count}款</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 min-w-0"><p className="text-[10px] text-[#86868b]">{t.reason}</p></div>
                    <div className="w-40 flex-shrink-0"><p className="text-[10px] text-[#C25B6E]">应对：{t.action}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* New Product List */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">
                  {timeFilter === '即将上市' ? '即将上市（2026 H2）' : '新品上市清单'}（{filtered.length}款）
                </h3>
                <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg"><span className="text-[#B5AFA8]">线索窗口：</span>2025-2026 · 半月复核</span>
              </div>
              <div className="space-y-2">
                {filtered.map((p, i) => (
                  <div key={i} className={`grid grid-cols-2 gap-2 p-3 rounded-xl sm:flex sm:items-center sm:gap-4 ${p.brand === 'Momcozy' ? 'bg-[#C25B6E]/5 border border-[#C25B6E]/10' : 'bg-[#FBF8F5]'}`}>
                    <div className="sm:w-16 sm:flex-shrink-0">
                      <span className="text-[10px] text-[#86868b]">{p.date}</span>
                    </div>
                    <div className="text-right sm:w-20 sm:flex-shrink-0 sm:text-left">
                      <span className={`text-xs font-semibold ${p.brand === 'Momcozy' ? 'text-[#C25B6E]' : 'text-[#1d1d1f]'}`}>{p.brand}</span>
                    </div>
                    <div className="min-w-0 sm:w-32 sm:flex-shrink-0">
                      <span className="block truncate text-xs font-medium text-[#1d1d1f]">{p.name}</span>
                    </div>
                    <div className="text-right sm:w-16 sm:flex-shrink-0 sm:text-left">
                      <span className="text-xs text-[#C25B6E] font-medium">{p.price}</span>
                    </div>
                    <div className="col-span-2 min-w-0 sm:col-span-1 sm:flex-1">
                      <p className="text-[10px] text-[#86868b]">{p.highlight}</p>
                    </div>
                    <div className="col-span-2 justify-self-end sm:col-span-1 sm:w-20 sm:flex-shrink-0 sm:text-right">
                      <span className="text-[10px] text-[#34c759] font-medium flex items-center justify-end gap-0.5">
                        <ArrowUpRight className="w-3 h-3" />{p.trend || p.threat}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2026 Trend Insights */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#5856d6]/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-[#5856d6]" strokeWidth={2} /></div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">技术趋势洞察（待来源治理）</h3>
                <span className="text-[10px] text-[#a85f00] bg-[#ff9500]/10 px-2 py-1 rounded-lg ml-auto">来源治理待完成</span>
              </div>
              <div className="rounded-xl border border-[#ff9500]/20 bg-[#ff9500]/5 p-4">
                <p className="text-xs font-semibold text-[#a85f00]">趋势结论暂不展示</p>
                <p className="mt-1 text-[11px] leading-5 text-[#7A6B6B]">
                  ABC Kids Expo 与 Nielsen 的报告页、样本、地区、指标口径和 source registry 映射尚未完成，不能由 ds-008 新品公开样本代替。完成来源治理和人工复核后再恢复本区结论。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
