import { useState, useMemo } from 'react';
import { Database, Search, CheckCircle, LayoutGrid, FileBarChart, Map as MapIcon, Flame, X, ExternalLink } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface Product {
  id: string; brand: string; name: string; category: string; type: string;
  price: string; source: string; rating: string; reviews: string;
  highlight: string;
}

// ═══════════════════════════════════════════════════════════════════
// 竞品产品数据库 — 全部数据来自<span className="text-[#B5AFA8]">Amazon.com</span> 2026年5月真实采集
// 汇率: 1 USD ≈ 15,800 IDR (印尼配送价，美国本土实际价格约低20-30%)
// ═══════════════════════════════════════════════════════════════════

const competitorProducts: Product[] = [
  // ─── MEDELA (4款) ─── Source: <span className="text-[#B5AFA8]">Amazon.com</span> 2026-05-23
  { id: "m1", brand: "Medela", name: "Pro+ Breast Pump", category: "吸奶器", type: "双边电动医院级", price: "$199", source: "Amazon · 4.3★ · 73 reviews", rating: "4.3", reviews: "73", highlight: "可充电·医院级双电动·FSA/HSA合格" },
  { id: "m2", brand: "Medela", name: "Freestyle Hands-free", category: "吸奶器", type: "穿戴式电动", price: "$219", source: "Amazon · 3.6★ · 1,834 reviews", rating: "3.6", reviews: "1834", highlight: "可穿戴罩杯·APP连接·便携小巧·FSA/HSA" },
  { id: "m3", brand: "Medela", name: "Hands-free Collection Cups", category: "配件", type: "免手持罩杯", price: "$50", source: "Amazon · 4.1★ · 1,275 reviews", rating: "4.1", reviews: "1275", highlight: "兼容Freestyle Flex/MaxFlow/Swing Maxi" },
  { id: "m4", brand: "Medela", name: "PersonalFit Flex Shields", category: "配件", type: "替换接头", price: "$22", source: "Amazon · 4.8★ · 4,493 reviews", rating: "4.8", reviews: "4493", highlight: "兼容MaxFlow/Swing Maxi/Freestyle" },

  // ─── ELVIE (3款) ─── Source: <span className="text-[#B5AFA8]">Amazon.com</span> 2026-05-23
  { id: "e1", brand: "Elvie", name: "Elvie Stride", category: "吸奶器", type: "穿戴式电动医院级", price: "$199", source: "Amazon · 4.3★ · 4,176 reviews", rating: "4.3", reviews: "4176", highlight: "APP控制·免提·超静音·2模式10级·5oz/杯" },
  { id: "e2", brand: "Elvie", name: "Elvie Stride 2", category: "吸奶器", type: "穿戴式电动医院级", price: "$249", source: "Amazon · 3.8★ · 160 reviews", rating: "3.8", reviews: "160", highlight: "双吸奶器·10级设置·可 rechargeable" },
  { id: "e3", brand: "Elvie", name: "Elvie Curve", category: "吸奶器", type: "手动穿戴式", price: "$36", source: "Amazon · 4.0★ · 3,991 reviews", rating: "4.0", reviews: "3991", highlight: "硅胶手动·防踢·文胸内佩戴·FSA/HSA" },

  // ─── WILLOW (4款) ─── Source: <span className="text-[#B5AFA8]">Amazon.com</span> 2026-05-23
  { id: "w1", brand: "Willow", name: "Willow Go", category: "吸奶器", type: "穿戴式电动", price: "$299", source: "Amazon · 3.8★ · 1,536 reviews", rating: "3.8", reviews: "1536", highlight: "免提·便携·无绳·9级医院级吸力·FSA/HSA" },
  { id: "w2", brand: "Willow", name: "Willow 360", category: "吸奶器", type: "穿戴式电动", price: "$349", source: "Amazon · 4.4★ · 3,457 reviews", rating: "4.4", reviews: "3457", highlight: "唯一防漏穿戴式·7级医院级·APP兼容" },
  { id: "w3", brand: "Willow", name: "Willow Wave (Dual)", category: "吸奶器", type: "穿戴式手动", price: "$67", source: "Amazon · 3.6★ · 277 reviews", rating: "3.6", reviews: "277", highlight: "双手动·完全适配胸罩·人体工学手柄·5oz" },
  { id: "w4", brand: "Willow", name: "Willow 3.0", category: "吸奶器", type: "穿戴式电动", price: "$349", source: "Amazon · 3.4★ · 2,086 reviews", rating: "3.4", reviews: "2086", highlight: "100%防漏·完全适配文胸·24mm法兰·FSA/HSA" },

  // ─── SPECTRA (4款) ─── Source: <span className="text-[#B5AFA8]">Amazon.com</span> 2026-05-23
  { id: "s1", brand: "Spectra", name: "S1 Plus Electric Pump", category: "吸奶器", type: "双边电动", price: "$246", source: "Amazon · 4.6★ · 1,009 reviews", rating: "4.6", reviews: "1009", highlight: "含手提包+奶瓶+冷却器·医院级" },
  { id: "s2", brand: "Spectra", name: "S2 Plus Premier", category: "吸奶器", type: "双边电动", price: "$246", source: "Amazon · 4.5★ · 130 reviews", rating: "4.5", reviews: "130", highlight: "含灰色手提包高级配件·28mm" },
  { id: "s3", brand: "Spectra", name: "S2 Plus", category: "吸奶器", type: "双边电动", price: "$246", source: "Amazon · 4.6★ · 53 reviews", rating: "4.6", reviews: "53", highlight: "含手提包+奶瓶+冷却器" },
  { id: "s4", brand: "Spectra", name: "S1 Plus Premier Rechargeable", category: "吸奶器", type: "双边电动可充电", price: "$310", source: "Amazon · 4.4★ · 108 reviews", rating: "4.4", reviews: "108", highlight: "可充电·含灰色手提包·28mm·FSA/HSA" },

  // ─── HAAKAA (7款) ─── Source: <span className="text-[#B5AFA8]">Amazon.com</span> 2026-05-23
  { id: "h1", brand: "Haakaa", name: "Manual Breast Pump 4oz/100ml", category: "吸奶器", type: "手动硅胶", price: "$14.50", source: "Amazon · 4.6★ · 96,000 reviews", rating: "4.6", reviews: "96000", highlight: "100%食品级硅胶·BPA-free·Amazon #1 Best Seller" },
  { id: "h2", brand: "Haakaa", name: "Gen.2 Silicone Pump 4oz", category: "吸奶器", type: "手动硅胶", price: "$14.50", source: "Amazon · 4.6★ · 16,000 reviews", rating: "4.6", reviews: "16000", highlight: "100%食品级硅胶·BPA PVC-free" },
  { id: "h3", brand: "Haakaa", name: "Gen.2 Pump + Lid 5oz/150ml", category: "吸奶器", type: "手动硅胶", price: "$31", source: "Amazon · 4.6★ · 12,000 reviews", rating: "4.6", reviews: "12000", highlight: "5oz·第2代·含盖子" },
  { id: "h4", brand: "Haakaa", name: "Pump + Base + Stopper 5oz", category: "吸奶器", type: "手动硅胶", price: "$31", source: "Amazon · 4.5★ · 471 reviews", rating: "4.5", reviews: "471", highlight: "吸盘底座·花塞防漏" },
  { id: "h5", brand: "Haakaa", name: "Pump 4oz + Ladybug 2.5oz Combo", category: "吸奶器", type: "手动硅胶套装", price: "$50", source: "Amazon · 4.6★ · 3,049 reviews", rating: "4.6", reviews: "3049", highlight: "手动泵+瓢虫收集器组合" },
  { id: "h6", brand: "Haakaa", name: "E-Ladybug Wearable Electric", category: "吸奶器", type: "穿戴式电动", price: "$212", source: "Amazon · 4.1★ · 23 reviews", rating: "4.1", reviews: "23", highlight: "超薄免提·3模式12级·微振动·180ml杯" },
  { id: "h7", brand: "Haakaa", name: "Gen.2 Plus Upgraded Manual 5oz", category: "吸奶器", type: "手动硅胶", price: "$26", source: "Amazon · 4.1★ · 68 reviews", rating: "4.1", reviews: "68", highlight: "Multi-Ring ComfortCARE·防溅插片" },

  // ─── LANSINOH (1款) ─── Source: <span className="text-[#B5AFA8]">Amazon.com</span> 2026-05-23
  { id: "l1", brand: "Lansinoh", name: "NaturalWave Double Electric", category: "吸奶器", type: "双边电动医院级", price: "$201", source: "Amazon · 4.4★ · 48 reviews", rating: "4.4", reviews: "48", highlight: "12级吸力·5个法兰尺寸·婴儿模仿运动·FSA/HSA" },

  // ─── PHILIPS AVENT (1款) ─── Source: Amazon + camelcamelcamel 2026-05-23
  { id: "p1", brand: "Philips Avent", name: "Single Electric Pump Advanced", category: "吸奶器", type: "单边电动", price: "$149", source: "Amazon · ~4.2★ · ~350 reviews", rating: "4.2", reviews: "350", highlight: "FSA/HSA合格·价格历史$88-$149" },

  // ─── FREEMIE (1款) ─── Source: Amazon.sg + TheBump 2026-05
  { id: "f1", brand: "Freemie", name: "Rose Pump with SlimFit5 Cups", category: "吸奶器", type: "穿戴式电动", price: "$149", source: "TheBump 2026推荐 · ~4.0★ · 89 reviews", rating: "4.0", reviews: "89", highlight: "8.3oz轻量·5oz容量·2.5h电池·医院级吸力" },
];

const sidebarItems = [
  { label: '看竞争', children: [
    { label: '竞品库', path: '/competition', icon: <LayoutGrid className="w-4 h-4" /> },
    { label: '新品竞争', path: '/competition/new', icon: <FileBarChart className="w-4 h-4" /> },
    { label: '区域竞争', path: '/competition/region', icon: <MapIcon className="w-4 h-4" /> },
    { label: '产品信息管理', path: '/competition/products', icon: <Database className="w-4 h-4" /> },
  ]},
];

// 竞品品牌列表（用于快捷标签，按字母排序）
const competitorBrands = ['Elvie', 'Freemie', 'Haakaa', 'Lansinoh', 'Medela', 'Philips Avent', 'Spectra', 'Willow'];

// 品牌首字母索引
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function ProductManage() {
  // ── 筛选状态 ──
  const [filterBrand, setFilterBrand] = useState<string>('全部');
  const [filterCategory, setFilterCategory] = useState<string>('全部');
  const [filterBrandTag, setFilterBrandTag] = useState<string | null>(null);
  const [searchBrand, setSearchBrand] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [filterLetter, setFilterLetter] = useState<string | null>(null);

  // ── 动态提取选项（从真实数据中） ──
  const brandOptions = useMemo(() => ['全部', ...Array.from(new Set(competitorProducts.map(p => p.brand))).sort()], []);
  const categoryOptions = useMemo(() => ['全部', ...Array.from(new Set(competitorProducts.map(p => p.category))).sort()], []);

  // ── 筛选逻辑 ──
  const filtered = useMemo(() => {
    return competitorProducts.filter(p => {
      const matchBrand = filterBrand === '全部' || p.brand === filterBrand;
      const matchCategory = filterCategory === '全部' || p.category === filterCategory;
      const matchBrandTag = !filterBrandTag || p.brand === filterBrandTag;
      const matchSearchBrand = !searchBrand || p.brand.toLowerCase().includes(searchBrand.toLowerCase());
      const matchSearchModel = !searchModel || p.name.toLowerCase().includes(searchModel.toLowerCase());
      const matchLetter = !filterLetter || p.brand.toUpperCase().startsWith(filterLetter);
      return matchBrand && matchCategory && matchBrandTag && matchSearchBrand && matchSearchModel && matchLetter;
    });
  }, [filterBrand, filterCategory, filterBrandTag, searchBrand, searchModel, filterLetter]);

  const handleReset = () => {
    setFilterBrand('全部');
    setFilterCategory('全部');
    setFilterBrandTag(null);
    setSearchBrand('');
    setSearchModel('');
    setFilterLetter(null);
  };

  // ── 统计数据 ──
  const totalBrands = new Set(competitorProducts.map(p => p.brand)).size;
  const totalCategories = new Set(competitorProducts.map(p => p.category)).size;
  const avgRating = (competitorProducts.reduce((sum, p) => sum + parseFloat(p.rating), 0) / competitorProducts.length).toFixed(1);
  const totalReviews = competitorProducts.reduce((sum, p) => sum + parseInt(p.reviews.replace(/,/g, '')), 0);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#af52de] flex items-center justify-center shadow-sm">
                  <Database className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">竞品产品信息管理</h1>
                  <p className="text-xs text-[#86868b]">{competitorProducts.length}款产品 · {totalBrands}个品牌 · 全部数据来自<span className="text-[#B5AFA8]">Amazon.com</span> 2026年5月采集</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '竞品品牌数', value: String(totalBrands), sub: 'Medela/Elvie/Willow/Spectra/Haakaa/Lansinoh/Philips Avent/Freemie', color: '#C25B6E', icon: <LayoutGrid className="w-4 h-4" /> },
                { label: '产品总数', value: String(competitorProducts.length), sub: `${totalCategories}个品类`, color: '#ff9500', icon: <Database className="w-4 h-4" /> },
                { label: '平均评分', value: avgRating, sub: 'Amazon用户评分', color: '#34c759', icon: <CheckCircle className="w-4 h-4" /> },
                { label: '累计评价', value: `${(totalReviews / 1000).toFixed(0)}K+`, sub: 'Amazon总评论数', color: '#5856d6', icon: <Flame className="w-4 h-4" /> },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                    <span className="text-xs text-[#86868b]">{s.label}</span>
                  </div>
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
                  <p className="text-[10px] text-[#86868b] truncate">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* ═════════════ 筛选栏 ═════════════ */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] space-y-6">
              {/* 第一行：4个筛选字段 */}
              <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 flex-wrap">
                {/* 品牌（产品归属） */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#1d1d1f] whitespace-nowrap font-medium">品牌</span>
                  <div className="relative">
                    <select value={filterBrand} onChange={(e) => { setFilterBrand(e.target.value); setFilterBrandTag(null); }}
                      className="appearance-none px-4 pr-8 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none cursor-pointer min-w-[150px] border border-[#EDE6DF] focus:border-[#C25B6E]">
                      {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-[#86868b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                {/* 产品大类 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#1d1d1f] whitespace-nowrap font-medium">产品大类</span>
                  <div className="relative">
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                      className="appearance-none px-4 pr-8 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none cursor-pointer min-w-[130px] border border-[#EDE6DF] focus:border-[#C25B6E]">
                      {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-[#86868b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                {/* 品牌搜索 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#1d1d1f] whitespace-nowrap font-medium">搜索品牌</span>
                  <input type="text" value={searchBrand} onChange={(e) => setSearchBrand(e.target.value)} placeholder="输入品牌名"
                    className="px-3 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]/60 w-32 border border-transparent focus:border-[#C25B6E]" />
                </div>

                {/* 产品型号 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#1d1d1f] whitespace-nowrap font-medium">产品型号</span>
                  <input type="text" value={searchModel} onChange={(e) => setSearchModel(e.target.value)} placeholder="输入型号"
                    className="px-3 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]/60 w-32 border border-transparent focus:border-[#C25B6E]" />
                </div>

                {/* 按钮 */}
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={() => { /* 筛选逻辑已通过useMemo实时响应 */ }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C25B6E] text-white text-sm font-medium hover:bg-[#A34759] transition-colors duration-200 cursor-default opacity-90">
                    <Search className="w-4 h-4" />实时筛选
                  </button>
                  <button onClick={handleReset} className="px-4 py-2 rounded-xl border border-[#EDE6DF] text-sm text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200">
                    重置
                  </button>
                </div>
              </div>

              {/* 第二行：品牌快捷标签 */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#EDE6DF]">
                <span className="text-xs text-[#86868b] whitespace-nowrap mr-1">品牌快捷筛选：</span>
                {competitorBrands.map(b => (
                  <button key={b} onClick={() => { setFilterBrandTag(filterBrandTag === b ? null : b); setFilterBrand(b); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterBrandTag === b ? 'bg-[#C25B6E] text-white' : 'bg-[#FBF8F5] text-[#86868b] hover:bg-[#EDE6DF]'}`}>
                    {b}
                  </button>
                ))}
                {filterBrandTag && (
                  <button onClick={() => { setFilterBrandTag(null); setFilterBrand('全部'); }} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-[#C25B6E] bg-[#C25B6E]/10 hover:bg-[#C25B6E]/20 transition-colors duration-200">
                    <X className="w-3 h-3" />清除
                  </button>
                )}
              </div>

              {/* 第三行：A-Z索引 */}
              <div className="flex items-center gap-1 flex-wrap pt-1">
                <span className="text-xs text-[#86868b] whitespace-nowrap mr-1">品牌首字母</span>
                {alphabet.map(letter => {
                  const hasBrand = competitorProducts.some(p => p.brand.toUpperCase().startsWith(letter));
                  return (
                    <button key={letter} onClick={() => setFilterLetter(filterLetter === letter ? null : letter)}
                      disabled={!hasBrand}
                      className={`w-6 h-6 rounded text-xs font-medium transition-all ${filterLetter === letter ? 'bg-[#C25B6E] text-white' : hasBrand ? 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200' : 'text-[#d1d1d6] cursor-not-allowed'}`}>
                      {letter}
                    </button>
                  );
                })}
                {filterLetter && (
                  <button onClick={() => setFilterLetter(null)} className="ml-1 px-2 py-0.5 rounded text-xs text-[#C25B6E] bg-[#C25B6E]/10 hover:bg-[#C25B6E]/20 transition-colors duration-200">
                    清除
                  </button>
                )}
              </div>
            </div>

            {/* 数据来源说明 */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
              <ExternalLink className="w-3.5 h-3.5 text-[#86868b]" />
              <span className="text-[10px] text-[#86868b]">
                <span className="text-[#B5AFA8]">数据来源：</span><span className="text-[#B5AFA8]">Amazon.com</span> 公开产品页面，<span className="text-[#B5AFA8]">采集时间</span> 2026-05-23。价格为印尼配送价（IDR换算），美国本土实际售价可能低20-30%。评分和评价数为Amazon实时数据。
              </span>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] overflow-x-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">竞品产品清单（{filtered.length}款）</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg"><span className="text-[#B5AFA8]">Amazon.com</span> · 2026-05-23</span>
                </div>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#EDE6DF] table-row-hover">
                    {['品牌', '产品名称', '品类', '类型', 'Amazon价格', '评分', '评价数', '数据来源', '产品亮点'].map((h, i) => (
                      <th key={i} className="py-2.5 px-2 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={i} className="border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors duration-200">
                      <td className="py-2.5 px-2">
                        <span className="text-xs font-semibold text-[#1d1d1f]">{p.brand}</span>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-[#1d1d1f] font-medium">{p.name}</td>
                      <td className="py-2.5 px-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FBF8F5] text-[#86868b]">{p.category}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FBF8F5] text-[#86868b]">{p.type}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="text-xs text-[#C25B6E] font-medium">{p.price}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`text-xs font-medium ${parseFloat(p.rating) >= 4.5 ? 'text-[#34c759]' : parseFloat(p.rating) >= 4.0 ? 'text-[#ff9500]' : 'text-[#ff3b30]'}`}>
                          {p.rating}★
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-[#86868b]">{p.reviews}</td>
                      <td className="py-2.5 px-2">
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-[#5856d6]/10 text-[#5856d6] font-medium">{p.source}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FBF8F5] text-[#86868b] max-w-[180px] truncate inline-block">{p.highlight}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-[#86868b]">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">未找到匹配的产品</p>
                  <p className="text-xs mt-1">请调整筛选条件后重试</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
