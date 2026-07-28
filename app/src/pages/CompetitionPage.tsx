import { useEffect, useState, useMemo } from 'react';
import { Search, LayoutGrid, Target, FileBarChart, Map as MapIcon, Database, ChevronDown, X, Download, ExternalLink } from 'lucide-react';
// Target imported via lucide-react
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import Sidebar from '@/components/Sidebar';

interface Product {
  id: number;
  name: string;
  brand: string;
  type: string;
  capacity: string;
  power: string;
  date: string;
  price: string;
  priceNum: number;
  img: string;
  isMomcozy: boolean;
  category: string;
  firstLetter: string;
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

const pendingPrice = '授权价格待采集';

// R13: 产品威胁等级评估
const allProducts: Product[] = [
  { id: 1, name: 'M5 穿戴式吸奶器', brand: 'Momcozy', type: '穿戴式', capacity: '容量待复核', power: 'APP控制', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-m5-real.png', isMomcozy: true, category: '吸奶器', firstLetter: 'M' },
  { id: 2, name: 'Sonata 智能吸奶器', brand: 'Medela', type: '台式', capacity: '容量待复核', power: '医院级', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-m9-real.png', isMomcozy: false, category: '吸奶器', firstLetter: 'S' },
  { id: 3, name: 'Spectra Plus 医院级', brand: 'Spectra', type: '台式', capacity: '容量待复核', power: '医院级', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-kleanpal-real.png', isMomcozy: false, category: '吸奶器', firstLetter: 'S' },
  { id: 4, name: 'M9 Mobile Flow', brand: 'Momcozy', type: '穿戴式', capacity: '容量待复核', power: 'APP控制', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-m9-real.png', isMomcozy: true, category: '吸奶器', firstLetter: 'M' },
  { id: 5, name: 'Go 穿戴式', brand: 'Willow', type: '穿戴式', capacity: '容量待复核', power: '智能传感', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-m5-real.png', isMomcozy: false, category: '吸奶器', firstLetter: 'W' },
  { id: 6, name: '自然吸乳双边', brand: 'Philips Avent', type: '台式', capacity: '容量待复核', power: '静音设计', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/philips-avent-real.png', isMomcozy: false, category: '吸奶器', firstLetter: 'P' },
  { id: 7, name: 'Slim 手持式', brand: 'Momcozy', type: '手持式', capacity: '容量待复核', power: '档位待复核', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-warmer-real.png', isMomcozy: true, category: '吸奶器', firstLetter: 'M' },
  { id: 8, name: 'Pump In Style', brand: 'Medela', type: '便携', capacity: '容量待复核', power: '双韵律', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-bags-real.png', isMomcozy: false, category: '吸奶器', firstLetter: 'P' },
  { id: 9, name: 'KleanPal Pro 洗消一体机', brand: 'Momcozy', type: '护理电器', capacity: '-', power: 'UV消毒', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-warmer-real.png', isMomcozy: true, category: '婴儿护理', firstLetter: 'K' },
  { id: 10, name: 'Maternity Nursing Bra', brand: 'Momcozy', type: '哺乳文胸', capacity: '尺码待复核', power: '无痕设计', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-bra-real.png', isMomcozy: true, category: '哺乳用品', firstLetter: 'M' },
  { id: 11, 'name': 'Disposable Breast Pads', brand: 'Lansinoh', type: '防溢乳垫', capacity: '规格待复核', power: '超薄吸收', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/lansinoh-pads-real.png', isMomcozy: false, category: '哺乳用品', firstLetter: 'D' },
  { id: 12, name: 'Milk Storage Bags', brand: 'Momcozy', type: '储奶袋', capacity: '规格待复核', power: '防漏卖点待复核', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-bags-real.png', isMomcozy: true, category: '哺乳用品', firstLetter: 'M' },
  { id: 13, name: 'Video Baby Monitor', brand: 'Philips Avent', type: '监视器', capacity: '-', power: '夜视卖点待复核', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-kleanpal-real.png', isMomcozy: false, category: '婴儿护理', firstLetter: 'V' },
  { id: 14, name: 'Baby Bottle Warmer', brand: 'Momcozy', type: '温奶器', capacity: '规格待复核', power: '恒温卖点待复核', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-warmer-real.png', isMomcozy: true, category: '婴儿护理', firstLetter: 'B' },
  { id: 15, name: 'Baby Carrier', brand: 'Momcozy', type: '婴儿背带', capacity: '适用月龄待复核', power: '人体工学', date: '上市时间待复核', price: pendingPrice, priceNum: 0, img: '/images/momcozy-carrier-real.png', isMomcozy: true, category: '婴儿护理', firstLetter: 'B' },
];

// R13: 竞品威胁等级映射（非Momcozy产品）
const threatMap: Record<number, { level: '高' | '中' | '低'; reason: string }> = {
  2: { level: '中', reason: '医院级定位差异化，价格带需授权采集后判断' },
  3: { level: '低', reason: '台式品类份额萎缩，Spectra亚洲为主' },
  5: { level: '高', reason: '穿戴式直接竞品，价格带和目标用户需采集复核' },
  6: { level: '低', reason: '传统台式，价格定位需授权采集后判断' },
  8: { level: '中', reason: 'Medela便携线，品牌溢价高但功能平庸' },
  11: { level: '低', reason: '防溢乳垫品类，与吸奶器非直接竞争' },
  13: { level: '中', reason: 'BM08监视器直接竞品，Philips品牌优势' },
};

const hotBrands = ['Momcozy', 'Medela', 'Spectra', 'Willow', 'Philips Avent', 'Lansinoh', 'Elvie', 'Freemie', 'Haakaa'];

const letters = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');

const sidebarItems = [
  {
    label: '看竞争',
    children: [
      { label: '竞品库', path: '/competition', icon: <LayoutGrid className="w-4 h-4" /> },
      { label: '新品竞争', path: '/competition/new', icon: <FileBarChart className="w-4 h-4" /> },
      { label: '区域竞争', path: '/competition/region', icon: <MapIcon className="w-4 h-4" /> },
      { label: '产品信息管理', path: '/competition/products', icon: <Database className="w-4 h-4" /> },
    ],
  },
];

function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#86868b] whitespace-nowrap">{label}</span>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#FBF8F5] text-sm text-[#1d1d1f] min-w-[120px] justify-between hover:bg-[#F5EDE8] transition-colors duration-200 duration-200">
          <span className="truncate">{value}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#EDE6DF] z-20 max-h-48 overflow-y-auto py-1">
            {options.map((opt) => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#FBF8F5] transition-colors duration-200 duration-200 ${value === opt ? 'text-[#C25B6E] font-medium bg-[#C25B6E]/5' : 'text-[#1d1d1f]'}`}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function CompetitionPage() {
  const [compareList, setCompareList] = useState<number[]>([]);
  const [publicEvidenceManifest, setPublicEvidenceManifest] = useState<PublicEvidenceManifest | null>(null);
  const [publicEvidenceStatus, setPublicEvidenceStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  // Filter states
  const [ownership, setOwnership] = useState('全部');
  const [category, setCategory] = useState('全部');
  const [brandInput, setBrandInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [activeHotBrand, setActiveHotBrand] = useState<string | null>(null);

  const ownershipOptions = ['全部', 'Momcozy产品', '竞品产品'];
  const categoryOptions = ['全部', '吸奶器', '哺乳用品', '婴儿护理'];

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

  // Derived brand from hot brand selection or input
  const effectiveBrandFilter = activeHotBrand || brandInput;

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (ownership === 'Momcozy产品' && !p.isMomcozy) return false;
      if (ownership === '竞品产品' && p.isMomcozy) return false;
      if (category !== '全部' && p.category !== category) return false;
      if (effectiveBrandFilter && !p.brand.toLowerCase().includes(effectiveBrandFilter.toLowerCase())) return false;
      if (modelInput && !p.name.toLowerCase().includes(modelInput.toLowerCase())) return false;
      if (activeLetter && p.firstLetter !== activeLetter) return false;
      return true;
    });
  }, [ownership, category, effectiveBrandFilter, modelInput, activeLetter]);

  const toggleCompare = (id: number) => {
    setCompareList(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 6 ? [...prev, id] : prev);
  };

  const handleHotBrand = (brand: string) => {
    if (activeHotBrand === brand) {
      setActiveHotBrand(null);
    } else {
      setActiveHotBrand(brand);
      setBrandInput('');
    }
  };

  const handleLetter = (letter: string) => {
    setActiveLetter(activeLetter === letter ? null : letter);
  };

  const handleReset = () => {
    setOwnership('全部');
    setCategory('全部');
    setBrandInput('');
    setModelInput('');
    setActiveLetter(null);
    setActiveHotBrand(null);
  };

  const hasActiveFilters = ownership !== '全部' || category !== '全部' || brandInput || modelInput || activeLetter || activeHotBrand;
  const competitionEvidence = (publicEvidenceManifest?.records ?? []).filter(
    (record) => record.sourceId === 'ds-007' || record.page === 'CompetitionPage',
  );
  const capturedCompetitionEvidence = competitionEvidence.filter((record) => record.captureStatus === 'captured');
  const evidenceBusinessDataWrites = competitionEvidence.reduce(
    (total, record) => total + (record.safety?.businessDataWrites ?? 0),
    0,
  );
  const evidenceNetworkCalls = competitionEvidence.reduce((total, record) => total + (record.safety?.networkCalls ?? 0), 0);
  const evidenceStatusLabel =
    publicEvidenceStatus === 'ready'
      ? `${capturedCompetitionEvidence.length}/${competitionEvidence.length} captured`
      : publicEvidenceStatus;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* R11: 竞争态势总结头部 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#1d1d1f]">竞品库</h2>
                    <p className="text-xs text-[#86868b]">8大品牌 · 15款产品 · Amazon连接器待接入 · 半月复核</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button disabled className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#B5AFA8] cursor-not-allowed"><Download className="w-3 h-3"/>导出待授权</button>
                  <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg"><span className="text-[#B5AFA8]">数据：</span><span className="text-[#B5AFA8]">Amazon.com</span> · 待采集任务</span>
                </div>
              </div>
              {/* R12: Momcozy竞争优势快览 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: '品牌份额', value: '待授权', change: 'Amazon/零售面板待接入', color: '#C25B6E' },
                  { label: '价格竞争力', value: '待授权', change: '需采集时点和站点', color: '#34c759' },
                  { label: '产品矩阵', value: '5大品类', change: '吸奶器+护理+配件', color: '#ff9500' },
                  { label: 'DTC表现', value: '待接入', change: '需官网经营快照', color: '#5856d6' },
                ].map((stat, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                    <p className="text-[10px] text-[#86868b]">{stat.label}</p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-[9px] text-[#B5AFA8]">{stat.change}</p>
                  </div>
                ))}
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-007']}
              title="竞品库采集状态"
              description="竞品概览已补公开品牌官网入口样本；Amazon 授权采集任务、时间戳、SKU/ASIN 映射和平台合规记录仍待接入，当前卡片和对比仅作为半月复核线索。"
            />

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">竞品公开品牌入口证据包 · ds-007</h2>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                    mode={publicEvidenceManifest?.mode ?? publicEvidenceStatus} · generatedAt={publicEvidenceManifest?.generatedAt ?? '-'} · networkCalls={evidenceNetworkCalls} · businessDataWrites={evidenceBusinessDataWrites}
                  </p>
                </div>
                <span className={`inline-flex rounded-lg px-3 py-1.5 text-[10px] font-medium ${capturedCompetitionEvidence.length > 0 ? 'bg-[#34c759]/10 text-[#2f7d32]' : 'bg-[#ff9500]/10 text-[#a85f00]'}`}>
                  {evidenceStatusLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">公开品牌入口</p>
                  <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">{capturedCompetitionEvidence.length}/{competitionEvidence.length || '-'}</p>
                </div>
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">覆盖品牌</p>
                  <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">Medela/Spectra/Philips/eufy</p>
                </div>
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">写入边界</p>
                  <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">businessDataWrites={evidenceBusinessDataWrites}</p>
                </div>
                <div className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                  <p className="text-[10px] text-[#86868b]">平台指标</p>
                  <p className="mt-1 text-xs font-semibold text-[#ff9500]">price/rating/share/rank blocked</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {competitionEvidence.map((record) => (
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
                边界：这些公开官网页面只证明竞品品牌/产品入口可复核；Amazon 授权快照、SKU/ASIN 映射、价格、评分、评论数、排名、品牌份额、销量和 GMV 仍保持阻断。
              </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <Dropdown label="产品归属" value={ownership} options={ownershipOptions} onChange={setOwnership} />
                <Dropdown label="产品大类" value={category} options={categoryOptions} onChange={setCategory} />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#86868b]">品牌</span>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="请输入品牌"
                      value={brandInput}
                      onChange={(e) => { setBrandInput(e.target.value); setActiveHotBrand(null); }}
                      className="px-3 py-2 pr-7 rounded-lg bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none w-32 focus:ring-2 focus:ring-[#C25B6E]/20 transition-all"
                    />
                    {brandInput && (
                      <button onClick={() => setBrandInput('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-[#86868b]" /></button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#86868b]">产品型号</span>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="请输入型号"
                      value={modelInput}
                      onChange={(e) => setModelInput(e.target.value)}
                      className="px-3 py-2 pr-7 rounded-lg bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none w-32 focus:ring-2 focus:ring-[#C25B6E]/20 transition-all"
                    />
                    {modelInput && (
                      <button onClick={() => setModelInput('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-[#86868b]" /></button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#C25B6E] text-white text-sm font-medium hover:bg-[#D46B7E]"><Search className="w-4 h-4" /> 筛选</button>
                  <button onClick={handleReset} className={`px-4 py-2 rounded-lg border text-sm transition-all ${hasActiveFilters ? 'border-[#C25B6E] text-[#C25B6E] hover:bg-[#C25B6E]/5' : 'border-[#EDE6DF] text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200 duration-200'}`}>重置</button>
                </div>
              </div>

              {/* Active filter tags */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs text-[#86868b]">当前筛选：</span>
                  {ownership !== '全部' && (
                    <span className="px-2 py-1 rounded-md bg-[#C25B6E]/10 text-xs text-[#C25B6E] font-medium flex items-center gap-1">归属：{ownership}<button onClick={() => setOwnership('全部')}><X className="w-3 h-3" /></button></span>
                  )}
                  {category !== '全部' && (
                    <span className="px-2 py-1 rounded-md bg-[#C25B6E]/10 text-xs text-[#C25B6E] font-medium flex items-center gap-1">品类：{category}<button onClick={() => setCategory('全部')}><X className="w-3 h-3" /></button></span>
                  )}
                  {effectiveBrandFilter && (
                    <span className="px-2 py-1 rounded-md bg-[#C25B6E]/10 text-xs text-[#C25B6E] font-medium flex items-center gap-1">品牌：{effectiveBrandFilter}<button onClick={() => { setBrandInput(''); setActiveHotBrand(null); }}><X className="w-3 h-3" /></button></span>
                  )}
                  {modelInput && (
                    <span className="px-2 py-1 rounded-md bg-[#C25B6E]/10 text-xs text-[#C25B6E] font-medium flex items-center gap-1">型号：{modelInput}<button onClick={() => setModelInput('')}><X className="w-3 h-3" /></button></span>
                  )}
                  {activeLetter && (
                    <span className="px-2 py-1 rounded-md bg-[#C25B6E]/10 text-xs text-[#C25B6E] font-medium flex items-center gap-1">首字母：{activeLetter}<button onClick={() => setActiveLetter(null)}><X className="w-3 h-3" /></button></span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-[#86868b] whitespace-nowrap">热门品牌</span>
                <div className="flex flex-wrap gap-1.5">
                  {hotBrands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => handleHotBrand(brand)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-all ${activeHotBrand === brand ? 'bg-[#C25B6E] text-white' : 'bg-[#FBF8F5] text-[#1d1d1f] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E]'}`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-[#86868b] whitespace-nowrap">品牌首字母</span>
                <div className="flex flex-wrap gap-1 min-w-0">
                  {letters.map((letter) => (
                    <button
                      key={letter}
                      onClick={() => handleLetter(letter)}
                      className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-all ${activeLetter === letter ? 'bg-[#C25B6E] text-white font-bold' : 'text-[#86868b] hover:text-[#C25B6E] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200 duration-200'}`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-[#86868b] sm:ml-auto">共 {filteredProducts.length} 条</span>
              </div>
            </div>

            {/* R14: 新品威胁预警 */}
            <div className="bg-[#ff3b30]/5 border border-[#ff3b30]/15 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-[#ff3b30]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-[#ff3b30]">新品威胁预警</p>
                  <span className="px-1.5 py-0.5 rounded bg-[#ff3b30]/10 text-[#ff3b30] text-[9px] font-bold">P0</span>
                </div>
                <p className="text-xs text-[#1d1d1f]"><strong>Medela Melody InBra</strong> 为新品线索，首发时间、卖点参数和对 Momcozy 的份额影响均需品牌官网、零售页面或授权面板交叉验证。</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-[#86868b] bg-white/60 px-2 py-1 rounded-lg">建议：先补采集任务，再评估静音版和价格带策略</span>
                  <button className="text-[10px] text-[#C25B6E] font-medium hover:underline">查看应对策略</button>
                </div>
              </div>
            </div>

            {/* Product Grid + Compare Panel */}
            <div className="flex gap-8">
              <div className="flex-1">
                {filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 card-shadow-sm border border-[#EDE6DF] text-center">
                    <Search className="w-10 h-10 text-[#EDE6DF] mx-auto mb-3" />
                    <p className="text-sm text-[#86868b]">没有找到匹配的产品</p>
                    <button onClick={handleReset} className="mt-3 px-4 py-2 rounded-lg bg-[#C25B6E] text-white text-sm">清除筛选</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF] hover:shadow-xl transition-natural">
                        <div className="aspect-square bg-[#FBF8F5] rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                          <img src={product.img} alt={product.name} className="w-full h-full object-contain p-4" />
                        </div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs text-[#86868b]">{product.brand}</p>
                          {product.isMomcozy && <span className="px-1.5 py-0.5 rounded bg-[#C25B6E]/10 text-[10px] text-[#C25B6E] font-medium">Momcozy</span>}
                          {/* R13: 威胁等级标签 */}
                          {!product.isMomcozy && threatMap[product.id] && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${threatMap[product.id].level === '高' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : threatMap[product.id].level === '中' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#86868b]/10 text-[#86868b]'}`}>
                              威胁{threatMap[product.id].level}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-[#1d1d1f] mb-2">{product.name}</h4>
                        <div className="grid grid-cols-2 gap-1.5 text-xs text-[#86868b] mb-3">
                          <span>{product.type}</span><span>{product.capacity}</span>
                          <span>{product.power}</span><span>{product.date}</span>
                          <span className="col-span-2 text-[#C25B6E] font-medium">{product.price}</span>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 min-w-0 py-2 rounded-lg border border-[#EDE6DF] text-xs text-[#1d1d1f] font-medium hover:bg-[#FBF8F5] transition-colors duration-200 duration-200 duration-200">查看详情</button>
                          <button onClick={() => toggleCompare(product.id)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${compareList.includes(product.id) ? 'bg-[#C25B6E] text-white' : 'border border-[#C25B6E] text-[#C25B6E] hover:bg-[#C25B6E]/5'}`}>{compareList.includes(product.id) ? '已添加' : '添加对比'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-56 flex-shrink-0">
                <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF] sticky top-20">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">对比产品</h3>
                  <p className="text-xs text-[#86868b] mb-3">还可以添加 {6 - compareList.length} 个</p>
                  <div className="space-y-2 mb-5">
                    {compareList.length === 0 ? (<p className="text-xs text-[#86868b] py-2 text-center">未选择产品</p>) : (
                      allProducts.filter(p => compareList.includes(p.id)).map(p => (
                        <div key={p.id} className="flex items-center gap-2 p-2 rounded-xl bg-[#FBF8F5]">
                          <div className="w-8 h-8 rounded-lg bg-[#EDE6DF] flex items-center justify-center"><LayoutGrid className="w-4 h-4 text-[#86868b]" /></div>
                          <span className="text-xs text-[#1d1d1f] font-medium truncate flex-1">{p.name}</span>
                          <button onClick={() => toggleCompare(p.id)}><X className="w-3 h-3 text-[#86868b]" /></button>
                        </div>
                      ))
                    )}
                  </div>
                  <button disabled={compareList.length < 2} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${compareList.length >= 2 ? 'bg-[#C25B6E] text-white hover:bg-[#D46B7E]' : 'bg-[#FBF8F5] text-[#86868b] cursor-not-allowed'}`}>立即对比</button>
                  {/* R15: 差异分析提示 */}
                  {compareList.length >= 2 && (
                    <div className="mt-3 p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                      <p className="text-[9px] text-[#86868b] font-medium mb-1">对比维度建议</p>
                      <div className="space-y-1">
                        {['价格竞争力', '技术差异化', '目标用户重叠度', '渠道冲突风险'].map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-[#C25B6E]" />
                            <span className="text-[9px] text-[#86868b]">{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
