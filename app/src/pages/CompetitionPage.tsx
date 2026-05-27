import { useState, useMemo } from 'react';
import { Search, LayoutGrid, Target, FileBarChart, Map as MapIcon, Database, ChevronDown, X, Download } from 'lucide-react';
import { exportToCsv } from '@/utils/csvExport';
// Target imported via lucide-react
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

// R13: 产品威胁等级评估
const allProducts: Product[] = [
  { id: 1, name: 'M5 穿戴式吸奶器', brand: 'Momcozy', type: '穿戴式', capacity: '180ml', power: 'APP控制', date: '2024-06上市', price: '$159.99', priceNum: 159.99, img: '/images/momcozy-m5-real.png', isMomcozy: true, category: '吸奶器', firstLetter: 'M' },
  { id: 2, name: 'Sonata 智能吸奶器', brand: 'Medela', type: '台式', capacity: '250ml', power: '医院级', date: '2024-03上市', price: '$349.99', priceNum: 349.99, img: '/images/momcozy-m9-real.png', isMomcozy: false, category: '吸奶器', firstLetter: 'S' },
  { id: 3, name: 'S2 Plus 医院级', brand: 'Spectra', type: '台式', capacity: '300ml', power: '医院级', date: '2023-09上市', price: '$189.99', priceNum: 189.99, img: '/images/momcozy-kleanpal-real.png', isMomcozy: false, category: '吸奶器', firstLetter: 'S' },
  { id: 4, name: 'M9 Mobile Flow', brand: 'Momcozy', type: '穿戴式', capacity: '200ml', power: 'APP控制', date: '2024-09上市', price: '$199.99', priceNum: 199.99, img: '/images/momcozy-m9-real.png', isMomcozy: true, category: '吸奶器', firstLetter: 'M' },
  { id: 5, name: 'Go 穿戴式', brand: 'Willow', type: '穿戴式', capacity: '180ml', power: '智能传感', date: '2024-01上市', price: '$299.99', priceNum: 299.99, img: '/images/momcozy-m5-real.png', isMomcozy: false, category: '吸奶器', firstLetter: 'W' },
  { id: 6, name: '自然吸乳双边', brand: 'Philips Avent', type: '台式', capacity: '250ml', power: '静音设计', date: '2023-06上市', price: '$129.99', priceNum: 129.99, img: '/images/philips-avent-real.png', isMomcozy: false, category: '吸奶器', firstLetter: 'P' },
  { id: 7, name: 'M6 Slim 手持式', brand: 'Momcozy', type: '手持式', capacity: '150ml', power: '三档调节', date: '2024-12上市', price: '$89.99', priceNum: 89.99, img: '/images/momcozy-warmer-real.png', isMomcozy: true, category: '吸奶器', firstLetter: 'M' },
  { id: 8, name: 'Pump In Style', brand: 'Medela', type: '便携', capacity: '200ml', power: '双韵律', date: '2023-03上市', price: '$219.99', priceNum: 219.99, img: '/images/momcozy-bags-real.png', isMomcozy: false, category: '吸奶器', firstLetter: 'P' },
  { id: 9, name: 'KleanPal Pro 洗消一体机', brand: 'Momcozy', type: '护理电器', capacity: '-', power: 'UV消毒', date: '2025-01上市', price: '$179.99', priceNum: 179.99, img: '/images/momcozy-warmer-real.png', isMomcozy: true, category: '婴儿护理', firstLetter: 'K' },
  { id: 10, name: 'Maternity Nursing Bra', brand: 'Momcozy', type: '哺乳文胸', capacity: 'S-XXL', power: '无痕设计', date: '2024-04上市', price: '$29.99', priceNum: 29.99, img: '/images/momcozy-bra-real.png', isMomcozy: true, category: '哺乳用品', firstLetter: 'M' },
  { id: 11, 'name': 'Disposable Breast Pads', brand: 'Lansinoh', type: '防溢乳垫', capacity: '60片装', power: '超薄吸收', date: '2023-08上市', price: '$8.99', priceNum: 8.99, img: '/images/lansinoh-pads-real.png', isMomcozy: false, category: '哺乳用品', firstLetter: 'D' },
  { id: 12, name: 'Milk Storage Bags', brand: 'Momcozy', type: '储奶袋', capacity: '100只', power: '双拉链防漏', date: '2024-02上市', price: '$9.99', priceNum: 9.99, img: '/images/momcozy-bags-real.png', isMomcozy: true, category: '哺乳用品', firstLetter: 'M' },
  { id: 13, name: 'Video Baby Monitor', brand: 'Philips Avent', type: '监视器', capacity: '-', power: '2.4GHz/夜视', date: '2023-11上市', price: '$199.99', priceNum: 199.99, img: '/images/momcozy-kleanpal-real.png', isMomcozy: false, category: '婴儿护理', firstLetter: 'V' },
  { id: 14, name: 'Baby Bottle Warmer', brand: 'Momcozy', type: '温奶器', capacity: '双瓶位', power: '恒温42°C', date: '2024-08上市', price: '$49.99', priceNum: 49.99, img: '/images/momcozy-warmer-real.png', isMomcozy: true, category: '婴儿护理', firstLetter: 'B' },
  { id: 15, name: 'Baby Carrier', brand: 'Momcozy', type: '婴儿背带', capacity: '0-36月', power: '人体工学', date: '2024-10上市', price: '$69.99', priceNum: 69.99, img: '/images/momcozy-carrier-real.png', isMomcozy: true, category: '婴儿护理', firstLetter: 'B' },
];

// R13: 竞品威胁等级映射（非Momcozy产品）
const threatMap: Record<number, { level: '高' | '中' | '低'; reason: string }> = {
  2: { level: '中', reason: '医院级定位差异化，价格$349不构成直接竞争' },
  3: { level: '低', reason: '台式品类份额萎缩，Spectra亚洲为主' },
  5: { level: '高', reason: '穿戴式直接竞品，$299 vs M5 $159价格带重叠' },
  6: { level: '低', reason: '传统台式，$129定位低端不形成品牌竞争' },
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

  // Filter states
  const [ownership, setOwnership] = useState('全部');
  const [category, setCategory] = useState('全部');
  const [brandInput, setBrandInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [activeHotBrand, setActiveHotBrand] = useState<string | null>(null);

  const ownershipOptions = ['全部', 'Momcozy产品', '竞品产品'];
  const categoryOptions = ['全部', '吸奶器', '哺乳用品', '婴儿护理'];

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

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* R11: 竞争态势总结头部 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#1d1d1f]">竞品库</h2>
                    <p className="text-xs text-[#86868b]">8大品牌 · 15款产品 · Amazon实时数据 · 2026-05-23</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => exportToCsv(filteredProducts, { name: "产品名称", brand: "品牌", type: "类型", price: "价格", category: "品类" }, "竞品产品数据_" + new Date().toISOString().slice(0, 10))} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all"><Download className="w-3 h-3"/>导出CSV</button>
                  <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg"><span className="text-[#B5AFA8]">数据：</span><span className="text-[#B5AFA8]">Amazon.com</span> · 每周更新</span>
                </div>
              </div>
              {/* R12: Momcozy竞争优势快览 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Momcozy份额', value: '19.3%', change: '+2.1pp YoY', color: '#C25B6E' },
                  { label: '价格竞争力', value: '$89-199', change: 'vs Medela $129-349', color: '#34c759' },
                  { label: '产品矩阵', value: '5大品类', change: '吸奶器+护理+配件', color: '#ff9500' },
                  { label: 'DTC增速', value: '+32%', change: '官网 margins 52%', color: '#5856d6' },
                ].map((stat, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                    <p className="text-[10px] text-[#86868b]">{stat.label}</p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-[9px] text-[#B5AFA8]">{stat.change}</p>
                  </div>
                ))}
              </div>
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
                <div className="ml-auto flex items-center gap-2">
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

              <div className="flex items-center gap-1">
                <span className="text-xs text-[#86868b] whitespace-nowrap">品牌首字母</span>
                {letters.map((letter) => (
                  <button
                    key={letter}
                    onClick={() => handleLetter(letter)}
                    className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-all ${activeLetter === letter ? 'bg-[#C25B6E] text-white font-bold' : 'text-[#86868b] hover:text-[#C25B6E] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200 duration-200'}`}
                  >
                    {letter}
                  </button>
                ))}
                <span className="text-xs text-[#86868b] ml-auto">共 {filteredProducts.length} 条</span>
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
                <p className="text-xs text-[#1d1d1f]"><strong>Medela Melody InBra</strong> 预计2026年7月加拿大首发，36dB超静音+FluidFeel技术。可能侵蚀Momcozy在价格敏感用户中的份额（预估3-5pp）。</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-[#86868b] bg-white/60 px-2 py-1 rounded-lg">建议：提前3个月发布M5 Ultra静音版，锁定$179价格带</span>
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
