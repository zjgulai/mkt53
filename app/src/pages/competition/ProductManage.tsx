import { useMemo, useState } from 'react';
import { CheckCircle, Database, ExternalLink, FileBarChart, LayoutGrid, Map as MapIcon, Search, ShieldAlert, X } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import Sidebar from '@/components/Sidebar';

interface Product {
  id: string;
  brand: string;
  name: string;
  category: string;
  type: string;
  priceStatus: string;
  sourceStatus: string;
  ratingStatus: string;
  reviewsStatus: string;
  highlight: string;
}

const pendingAmazon = 'Amazon采集任务待授权';
const pendingPrice = '价格待采集';
const pendingRating = '评分待采集';
const pendingReviews = '评论数待采集';

const competitorProducts: Product[] = [
  { id: 'm1', brand: 'Medela', name: 'Pro Breast Pump', category: '吸奶器', type: '双边电动医院级', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '可充电、医院级、FSA/HSA适用性待复核' },
  { id: 'm2', brand: 'Medela', name: 'Freestyle Hands-free', category: '吸奶器', type: '穿戴式电动', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '可穿戴罩杯、APP连接、便携卖点待复核' },
  { id: 'm3', brand: 'Medela', name: 'Hands-free Collection Cups', category: '配件', type: '免手持罩杯', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '兼容型号和适配范围待复核' },
  { id: 'm4', brand: 'Medela', name: 'PersonalFit Flex Shields', category: '配件', type: '替换接头', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '配件兼容性待SKU映射确认' },
  { id: 'e1', brand: 'Elvie', name: 'Elvie Stride', category: '吸奶器', type: '穿戴式电动医院级', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: 'APP控制、免提、静音卖点待复核' },
  { id: 'e2', brand: 'Elvie', name: 'Elvie Stride Pro', category: '吸奶器', type: '穿戴式电动医院级', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '双吸奶器、档位设置和电池信息待复核' },
  { id: 'e3', brand: 'Elvie', name: 'Elvie Curve', category: '吸奶器', type: '手动穿戴式', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '硅胶手动、文胸内佩戴卖点待复核' },
  { id: 'w1', brand: 'Willow', name: 'Willow Go', category: '吸奶器', type: '穿戴式电动', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '免提、便携、无绳卖点待复核' },
  { id: 'w2', brand: 'Willow', name: 'Willow Wearable Pump', category: '吸奶器', type: '穿戴式电动', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '防漏、APP兼容和吸力等级待复核' },
  { id: 'w3', brand: 'Willow', name: 'Willow Wave Dual', category: '吸奶器', type: '穿戴式手动', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '手动结构和容量信息待复核' },
  { id: 's1', brand: 'Spectra', name: 'Spectra Electric Pump', category: '吸奶器', type: '双边电动', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '配件包和医院级卖点待复核' },
  { id: 's2', brand: 'Spectra', name: 'Spectra Premier Pump', category: '吸奶器', type: '双边电动可充电', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '可充电、配件规格和FSA/HSA适用性待复核' },
  { id: 'h1', brand: 'Haakaa', name: 'Manual Breast Pump', category: '吸奶器', type: '手动硅胶', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '食品级硅胶、BPA-free和Best Seller声称待复核' },
  { id: 'h2', brand: 'Haakaa', name: 'Silicone Pump Set', category: '吸奶器', type: '手动硅胶套装', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '套装规格和配件范围待复核' },
  { id: 'h3', brand: 'Haakaa', name: 'Wearable Electric Pump', category: '吸奶器', type: '穿戴式电动', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '免提、档位和容量信息待复核' },
  { id: 'l1', brand: 'Lansinoh', name: 'NaturalWave Double Electric', category: '吸奶器', type: '双边电动医院级', priceStatus: pendingPrice, sourceStatus: pendingAmazon, ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '法兰尺寸、吸力等级和FSA/HSA适用性待复核' },
  { id: 'p1', brand: 'Philips Avent', name: 'Single Electric Pump Advanced', category: '吸奶器', type: '单边电动', priceStatus: pendingPrice, sourceStatus: 'Amazon与价格历史源待复核', ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '价格历史、适用性和评分口径待复核' },
  { id: 'f1', brand: 'Freemie', name: 'Rose Pump with SlimFit Cups', category: '吸奶器', type: '穿戴式电动', priceStatus: pendingPrice, sourceStatus: '公开推荐线索待复核', ratingStatus: pendingRating, reviewsStatus: pendingReviews, highlight: '推荐来源、容量、电池和医院级声称待复核' },
];

const sidebarItems = [
  { label: '看竞争', children: [
    { label: '竞品库', path: '/competition', icon: <LayoutGrid className="w-4 h-4" /> },
    { label: '新品竞争', path: '/competition/new', icon: <FileBarChart className="w-4 h-4" /> },
    { label: '区域竞争', path: '/competition/region', icon: <MapIcon className="w-4 h-4" /> },
    { label: '产品信息管理', path: '/competition/products', icon: <Database className="w-4 h-4" /> },
  ]},
];

const competitorBrands = ['Elvie', 'Freemie', 'Haakaa', 'Lansinoh', 'Medela', 'Philips Avent', 'Spectra', 'Willow'];
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function ProductManage() {
  const [filterBrand, setFilterBrand] = useState<string>('全部');
  const [filterCategory, setFilterCategory] = useState<string>('全部');
  const [filterBrandTag, setFilterBrandTag] = useState<string | null>(null);
  const [searchBrand, setSearchBrand] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [filterLetter, setFilterLetter] = useState<string | null>(null);

  const brandOptions = useMemo(() => ['全部', ...Array.from(new Set(competitorProducts.map(p => p.brand))).sort()], []);
  const categoryOptions = useMemo(() => ['全部', ...Array.from(new Set(competitorProducts.map(p => p.category))).sort()], []);

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

  const totalBrands = new Set(competitorProducts.map(p => p.brand)).size;
  const totalCategories = new Set(competitorProducts.map(p => p.category)).size;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#af52de] flex items-center justify-center shadow-sm">
                  <Database className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">竞品产品信息管理</h1>
                  <p className="text-xs text-[#86868b]">{competitorProducts.length}款产品线索 · {totalBrands}个品牌 · 授权采集待办</p>
                </div>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-009']}
              title="产品库数据待采集复核"
              description="产品参数、价格、评分和评价数需要补 Amazon 授权采集时间戳、SKU 映射和站点范围；未授权前仅展示采集状态，不展示样例数值。"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '竞品品牌数', value: String(totalBrands), sub: '品牌线索目录', color: '#C25B6E', icon: <LayoutGrid className="w-4 h-4" /> },
                { label: '产品线索数', value: String(competitorProducts.length), sub: `${totalCategories}个品类`, color: '#ff9500', icon: <Database className="w-4 h-4" /> },
                { label: '评分字段', value: '待采集', sub: '需授权评论快照', color: '#34c759', icon: <CheckCircle className="w-4 h-4" /> },
                { label: '评价字段', value: '待采集', sub: '需时间戳与站点', color: '#5856d6', icon: <ShieldAlert className="w-4 h-4" /> },
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

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] space-y-6">
              <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#1d1d1f] whitespace-nowrap font-medium">品牌</span>
                  <select value={filterBrand} onChange={(e) => { setFilterBrand(e.target.value); setFilterBrandTag(null); }}
                    className="px-4 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none cursor-pointer min-w-[150px] border border-[#EDE6DF] focus:border-[#C25B6E]">
                    {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#1d1d1f] whitespace-nowrap font-medium">产品大类</span>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none cursor-pointer min-w-[130px] border border-[#EDE6DF] focus:border-[#C25B6E]">
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#1d1d1f] whitespace-nowrap font-medium">搜索品牌</span>
                  <input type="text" value={searchBrand} onChange={(e) => setSearchBrand(e.target.value)} placeholder="输入品牌名"
                    className="px-3 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]/60 w-32 border border-transparent focus:border-[#C25B6E]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#1d1d1f] whitespace-nowrap font-medium">产品型号</span>
                  <input type="text" value={searchModel} onChange={(e) => setSearchModel(e.target.value)} placeholder="输入型号"
                    className="px-3 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]/60 w-32 border border-transparent focus:border-[#C25B6E]" />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C25B6E] text-white text-sm font-medium opacity-90">
                    <Search className="w-4 h-4" />筛选结果
                  </button>
                  <button onClick={handleReset} className="px-4 py-2 rounded-xl border border-[#EDE6DF] text-sm text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200">
                    重置
                  </button>
                </div>
              </div>

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

              <div className="flex items-center gap-1 flex-wrap pt-1">
                <span className="text-xs text-[#86868b] whitespace-nowrap mr-1">品牌首字母</span>
                {alphabet.map(letter => {
                  const hasBrand = competitorProducts.some(p => p.brand.toUpperCase().startsWith(letter));
                  return (
                    <button key={letter} onClick={() => setFilterLetter(filterLetter === letter ? null : letter)}
                      disabled={!hasBrand}
                      className={`w-6 h-6 rounded text-xs font-medium transition-all ${filterLetter === letter ? 'bg-[#C25B6E] text-white' : hasBrand ? 'text-[#86868b] hover:bg-[#FBF8F5]' : 'text-[#d1d1d6] cursor-not-allowed'}`}>
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

            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
              <ExternalLink className="w-3.5 h-3.5 text-[#86868b]" />
              <span className="text-[10px] text-[#86868b]">
                <span className="text-[#B5AFA8]">数据来源：</span>该产品库来源仍为 connector-required。未授权前，表格只保留产品线索和采集状态，不展示平台交易指标。
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] overflow-x-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">竞品产品采集清单（{filtered.length}款）</h3>
                <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg">授权采集待办 · 不导出真实价格</span>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#EDE6DF] table-row-hover">
                    {['品牌', '产品名称', '品类', '类型', '价格状态', '评分状态', '评论状态', '数据来源', '复核要点'].map((h, i) => (
                      <th key={i} className="py-2.5 px-2 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={i} className="border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors duration-200">
                      <td className="py-2.5 px-2"><span className="text-xs font-semibold text-[#1d1d1f]">{p.brand}</span></td>
                      <td className="py-2.5 px-2 text-xs text-[#1d1d1f] font-medium">{p.name}</td>
                      <td className="py-2.5 px-2"><span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FBF8F5] text-[#86868b]">{p.category}</span></td>
                      <td className="py-2.5 px-2"><span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FBF8F5] text-[#86868b]">{p.type}</span></td>
                      <td className="py-2.5 px-2"><span className="text-xs text-[#C25B6E] font-medium">{p.priceStatus}</span></td>
                      <td className="py-2.5 px-2"><span className="text-xs text-[#ff9500] font-medium">{p.ratingStatus}</span></td>
                      <td className="py-2.5 px-2 text-xs text-[#86868b]">{p.reviewsStatus}</td>
                      <td className="py-2.5 px-2"><span className="px-1.5 py-0.5 rounded text-[8px] bg-[#5856d6]/10 text-[#5856d6] font-medium">{p.sourceStatus}</span></td>
                      <td className="py-2.5 px-2"><span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FBF8F5] text-[#86868b] max-w-[180px] truncate inline-block">{p.highlight}</span></td>
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
