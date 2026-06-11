import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, TrendingUp, ArrowUpRight, ArrowDownRight, Package, DollarSign, Globe, Target, Download } from 'lucide-react';
import { exportToCsv } from '@/utils/csvExport';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import Sidebar from '@/components/Sidebar';

// ── TAM/SAM/SOM Market Sizing Model ──
const tamSamSom = [
  { label: 'TAM', sublabel: '全球母婴护理', value: 1267, unit: '$B', color: '#C25B6E', desc: '全球母婴护理产品总市场（2026E）', opportunity: 3, opportunityText: '增速稳健但泛化，建议聚焦细分赛道', focus: '母婴电器细分' },
  { label: 'SAM', sublabel: '吸奶器市场', value: 38.1, unit: '$B', color: '#ff9500', desc: '全球吸奶器市场2026（CAGR 8.52%）', opportunity: 4, opportunityText: 'CAGR 8.52%高于TAM，结构性增长机会', focus: '电动+穿戴式双主线' },
  { label: 'SOM', sublabel: '穿戴式核心', value: 6.69, unit: '$B', color: '#34c759', desc: '穿戴式吸奶器2026（CAGR 8.56%）', opportunity: 5, opportunityText: '增速最快+Momcozy已有领先优势', focus: 'M9/W1/Air1三驾马车' },
];

const marketTrendData = [
  { year: '2021', tam: 892, sam: 28.4, som: 4.2 },
  { year: '2022', tam: 948, sam: 30.1, som: 4.6 },
  { year: '2023', tam: 1015, sam: 32.5, som: 5.1 },
  { year: '2024', tam: 1092, sam: 35.2, som: 5.8 },
  { year: '2025', tam: 1178, sam: 38.1, som: 6.2 },
  { year: '2026E', tam: 1255, sam: 41.3, som: 6.69 },
  { year: '2027E', tam: 1338, sam: 44.8, som: 7.26 },
  { year: '2028E', tam: 1428, sam: 48.7, som: 7.92 },
  { year: '2029E', tam: 1525, sam: 52.9, som: 8.64 },
  { year: '2030E', tam: 1628, sam: 57.5, som: 9.42 },
];

const categoryOverview = [
  { name: '电动吸奶器', value: 38, momcozyShare: 32, growth: 15.3, color: '#C25B6E', market: '$1.33B', sub: '含穿戴式/双边' },
  { name: '手动吸奶器', value: 8, momcozyShare: 12, growth: -2.1, color: '#86868b', market: '$0.28B', sub: '传统品类萎缩' },
  { name: '哺乳文胸', value: 22, momcozyShare: 18, growth: 12.8, color: '#34c759', market: '$0.77B', sub: '功能性驱动' },
  { name: '暖奶器', value: 14, momcozyShare: 10, growth: 6.6, color: '#ff9500', market: '$0.52B', sub: 'CAGR 6.6%' },
  { name: '消毒器', value: 10, momcozyShare: 8, growth: 7.0, color: '#af52de', market: '$0.35B', sub: 'UV技术驱动' },
  { name: '防溢乳垫', value: 5, momcozyShare: 8, growth: 6.2, color: '#5856d6', market: '$0.18B', sub: '消耗品复购' },
  { name: '储奶袋', value: 3, momcozyShare: 6, growth: 8.4, color: '#ff3b30', market: '$0.11B', sub: '配件增长' },
];

const categoryPositioning = [
  { category: '电动吸奶器', position: '强势领先', action: '巩固M5+M9双旗舰，防御Medela反击', priority: 'P0' },
  { category: '手动吸奶器', position: '机会有限', action: '品类萎缩-2.1%，维持现状不追加投入', priority: 'P3' },
  { category: '哺乳文胸', position: '增长潜力', action: '18%份额+12.8%增速，加大SKU和营销投入', priority: 'P1' },
  { category: '暖奶器', position: '新兴机会', action: 'CAGR 6.6%稳定，作为生态配件捆绑销售', priority: 'P2' },
  { category: '消毒器', position: '蓝海市场', action: 'UV技术驱动高增长，KleanPal Pro旗舰定位', priority: 'P1' },
  { category: '防溢乳垫', position: '消耗品', action: '复购驱动，作为吸奶器交叉销售配件', priority: 'P2' },
  { category: '储奶袋', position: '配件机会', action: '高复购低客单，套装捆绑提升LTV', priority: 'P2' },
];

const regionShareData = [
  { region: '北美', share: 45.05, growth: 8.76, revenue: '$1.72B', color: '#5856d6', key: '美国$1.3B·Fortune BI 2025' },
  { region: '欧洲', share: 28.52, growth: 7.20, revenue: '$1.09B', color: '#34c759', key: '德国$0.16B·英国$0.11B' },
  { region: '亚太', share: 20.41, growth: 10.50, revenue: '$0.78B', color: '#C25B6E', key: '中国$0.13B·日本$0.11B' },
  { region: '拉美', share: 4.02, growth: 8.50, revenue: '$0.15B', color: '#ff9500', key: '巴西·中产崛起' },
  { region: '中东非', share: 2.00, growth: 9.20, revenue: '$0.08B', color: '#af52de', key: 'UAE/沙特·高消费' },
];

const brandTrendData = [
  { year: '2022', Momcozy: 12, Medela: 35, Philips: 18, Willow: 10, Spectra: 14, Others: 11 },
  { year: '2023', Momcozy: 14, Medela: 33, Philips: 17, Willow: 10, Spectra: 14, Others: 12 },
  { year: '2024', Momcozy: 17, Medela: 31, Philips: 16, Willow: 11, Spectra: 13, Others: 12 },
  { year: '2025', Momcozy: 20, Medela: 28, Philips: 15, Willow: 12, Spectra: 13, Others: 12 },
  { year: '2026E', Momcozy: 23, Medela: 26, Philips: 14, Willow: 13, Spectra: 12, Others: 12 },
];

const sidebarItems = [
  {
    label: '看市场',
    children: [
      { label: '总览', path: '/market' },
      { label: '大盘趋势', path: '/market/trend' },
      { label: '吸奶器', path: '/market/mtl' },
      { label: '哺乳用品', path: '/market/dtl' },
      { label: '婴儿护理', path: '/market/consumables' },
      { label: '海关数据', path: '/market/customs' },
      { label: '品类分析', path: '/market/category' },
    ],
  },
];

export default function MarketPage() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 min-w-0 space-y-6">

            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                    <LayoutDashboard className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">市场总览</h1>
                    <p className="text-xs text-[#86868b]">全球母婴喂养电器市场 · TAM/SAM/SOM分析框架</p>
                  </div>
                </div>
                <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg"><span className="text-[#B5AFA8]">数据状态：</span>半月复核 · 人工凭证待补</span>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-001', 'ds-002']}
              title="市场总览来源口径"
              description="TAM/SAM/SOM 使用 Precedence Research 口径；区域份额来自 Fortune BI，服务器自动化可能返回 403，需保留人工访问或采购报告凭证。"
            />

            {/* TAM/SAM/SOM Cards — flex layout + min-w-0 */}
            <div className="flex gap-3">
              {tamSamSom.map((t, i) => (
                <div key={i} className="flex-1 min-w-0 min-w-0 rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] relative overflow-hidden" style={{ backgroundColor: `${t.color}08` }}>
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: t.color }} />
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-bold" style={{ color: t.color }}>{t.label}</span>
                    <span className="text-xs text-[#86868b] font-medium">{t.sublabel}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-[#1d1d1f] tracking-tight">{t.value}</p>
                    <span className="text-sm font-medium text-[#86868b]">{t.unit}</span>
                  </div>
                  <p className="text-xs text-[#B5AFA8] mt-0.5">{t.desc}</p>
                  <div className="mt-3 pt-3 border-t border-[#EDE6DF]/40">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#86868b]">机会指数</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, si) => (
                          <div key={si} className={`w-1.5 h-1.5 rounded-full ${si < t.opportunity ? 'bg-[#34c759]' : 'bg-[#EDE6DF]'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-[#34c759]">{t.opportunity}/5</span>
                    </div>
                    <p className="text-xs text-[#1d1d1f] leading-relaxed mt-1">{t.opportunityText}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: t.color }}>{t.focus}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Market Sizing Trend — LineChart (not stacked AreaChart) */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">市场规模预测 · TAM/SAM/SOM趋势（2021-2030E）</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => exportToCsv(marketTrendData, { year: '年份', tam: 'TAM($B)', sam: 'SAM($B)', som: 'SOM($B)' }, '市场规模趋势_2021-2030E')} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all">
                    <Download className="w-3 h-3" />导出
                  </button>
                  <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg">单位：$B</span>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marketTrendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="tam" name="TAM 全球母婴" stroke="#C25B6E" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="sam" name="SAM 喂养电器" stroke="#ff9500" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="som" name="SOM 吸奶器" stroke="#34c759" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Key findings */}
              <div className="mt-4 p-4 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                <p className="text-[10px] text-[#C25B6E] font-semibold mb-1.5">关键发现 · 三层漏斗持续扩大</p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#C25B6E] mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-[#1d1d1f]">SOM增速(8.56%) {'>'} SAM(8.52%) {'>'} TAM隐含增速，说明穿戴式正在结构性替代传统台式</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#ff9500] mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-[#1d1d1f]">2030年SOM预计达$9.42B，当前窗口期（2026-2028）是品牌卡位的关键3年</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '全球吸奶器市场', value: '$3.51B', change: '+8.52% CAGR', up: true, icon: DollarSign, color: '#C25B6E' },
                { label: 'Momcozy市场份额', value: '20%', change: '+3pp YoY', up: true, icon: TrendingUp, color: '#34c759' },
                { label: '穿戴式细分市场', value: '53.4%', change: '北美占比', up: true, icon: Package, color: '#ff9500' },
                { label: '覆盖国家/地区', value: '120+', change: '6大洲', up: true, icon: Globe, color: '#5856d6' },
              ].map((stat, i) => {
                const IconComp = stat.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-[#86868b]">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-semibold text-[#1d1d1f]">{stat.value}</p>
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.up ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
                      {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{stat.change}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Category + Positioning in 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品类细分（$3.51B 吸奶器及相关市场）</h3>
                <div className="space-y-3">
                  {categoryOverview.map((cat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <div className="flex-1 min-w-0 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#1d1d1f] truncate">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#86868b]">{cat.market}</span>
                            <span className={`text-[10px] font-medium ${cat.growth > 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>{cat.growth > 0 ? '+' : ''}{cat.growth}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 min-w-0 h-1.5 rounded-full bg-[#EDE6DF] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${cat.value}%`, backgroundColor: cat.color }} />
                          </div>
                          <span className="text-[10px] text-[#86868b] flex-shrink-0">Momcozy {cat.momcozyShare}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Positioning — same card style */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-[#C25B6E]" />
                  <h3 className="text-sm font-semibold text-[#C25B6E]">Momcozy 品类定位建议</h3>
                </div>
                <div className="space-y-2">
                  {categoryPositioning.map((cp, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 mt-0.5 ${cp.priority === 'P0' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : cp.priority === 'P1' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#86868b]/10 text-[#86868b]'}`}>{cp.priority}</span>
                      <div className="flex-1 min-w-0 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-[#1d1d1f] truncate">{cp.category}</span>
                          <span className="text-[10px] text-[#86868b]">{cp.position}</span>
                        </div>
                        <p className="text-[10px] text-[#1d1d1f] mt-0.5">{cp.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Brand Share Trend */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品牌份额趋势（2022-2026E）</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={brandTrendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="Momcozy" stroke="#C25B6E" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Medela" stroke="#34c759" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Philips" stroke="#5856d6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Willow" stroke="#af52de" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Spectra" stroke="#ff9500" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/10">
                <p className="text-[10px] text-[#ff9500] font-semibold mb-1">竞争态势判断</p>
                <p className="text-xs text-[#1d1d1f]">Momcozy份额从12%→23%（2022-2026E），Medela从35%→26%持续流失。Momcozy已超越Philips成为第二，预计2027年有望挑战第一。关键窗口期：趁Medela Melody上市前（2026.07）加速北美DTC渗透。</p>
              </div>
            </div>

            {/* Regional Breakdown */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">区域市场份额 · 吸奶器全球市场</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {regionShareData.map((r, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FBF8F5]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="text-xs font-semibold text-[#1d1d1f]">{r.region}</span>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: r.color }}>{r.share}<span className="text-sm">%</span></p>
                    <p className="text-xs text-[#86868b]">{r.revenue}</p>
                    <p className="text-xs text-[#34c759] font-medium">CAGR {r.growth}%</p>
                    <p className="text-[10px] text-[#86868b] mt-1">{r.key}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 rounded-xl bg-[#5856d6]/5 border border-[#5856d6]/10">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-[#5856d6]" />
                  <p className="text-xs text-[#5856d6] font-semibold">区域优先级建议</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-white/60">
                    <p className="text-xs text-[#ff3b30] font-bold">P0 · 北美 $1.72B</p>
                    <p className="text-xs text-[#1d1d1f] mt-1">最大市场+最高增速(8.76%)。建议：加大Target/Walmart线下，推出本土化M5 USA版</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/60">
                    <p className="text-xs text-[#ff9500] font-bold">P1 · 亚太 $0.78B</p>
                    <p className="text-xs text-[#1d1d1f] mt-1">增速最快(10.50%)。建议：TikTok Shop东南亚首发，日本PSC认证续期</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/60">
                    <p className="text-xs text-[#34c759] font-bold">P2 · 欧洲 $1.09B</p>
                    <p className="text-xs text-[#1d1d1f] mt-1">增速平稳(7.20%)。建议：MDR合规先行，Boots渠道准入突破</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">市场关键洞察</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: '增长驱动力', color: '#34c759', items: ['职业母亲比例持续上升（全球67%增长）', 'CDC/WHO/ABM母乳喂养推广运动', '智能穿戴式吸奶器CAGR增长最快', 'Favorable保险报销政策（尤其北美）'] },
                  { title: '技术趋势', color: '#5856d6', items: ['APP互联+实时奶量追踪成标配', '电池驱动便携式设计 dominate', '噪音<40dB成为核心差异化指标', 'UV-C消毒技术从医院级下沉到家用'] },
                  { title: '竞争信号', color: '#C25B6E', items: ['Momcozy份额从12%→20%（2022-2025）', 'Medela 2025年推出Motion InBra反击', 'Ameda GLO获2025 Baby Innovation Award', 'IP诉讼加剧（Elvie vs Momcozy等）'] },
                ].map((s, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FBF8F5]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <h4 className="text-xs font-semibold" style={{ color: s.color }}>{s.title}</h4>
                    </div>
                    <div className="space-y-2">
                      {s.items.map((item, j) => (
                        <div key={j} className="flex items-start gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-[#EDE6DF] mt-1.5 flex-shrink-0" />
                          <p className="text-xs text-[#86868b] leading-relaxed truncate">{item}</p>
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
