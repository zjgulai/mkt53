import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { Droplets, TrendingUp, Star, DollarSign, Zap, Target } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const pumpTrend = [
  { year: '2020', wearable: 12.5, electric: 38.2, manual: 18.5, hospital: 14.0 },
  { year: '2021', wearable: 14.8, electric: 37.5, manual: 17.2, hospital: 14.5 },
  { year: '2022', wearable: 18.5, electric: 36.8, manual: 15.5, hospital: 15.0 },
  { year: '2023', wearable: 22.0, electric: 35.5, manual: 13.8, hospital: 15.5 },
  { year: '2024', wearable: 26.5, electric: 34.2, manual: 12.0, hospital: 16.0 },
  { year: '2025', wearable: 32.0, electric: 33.0, manual: 10.5, hospital: 16.5 },
  { year: '2026(E)', wearable: 38.5, electric: 31.8, manual: 9.0, hospital: 17.0 },
];

// 口径说明：Amazon平台穿戴式吸奶器品类BSR加权估算（非全球全渠道份额）
// HomePage全球份额: Momcozy 19.3% | Medela 15.2% | Willow 12.8% | Elvie 11.5%
// 与HomePage全球全渠道份额（Momcozy 19.3%）口径不同，请勿直接对比
const brandDetail = [
  { name: 'Momcozy', share: 20, growth: 28.5, priceAvg: 149, rating: 4.6, keyModel: 'M5/M9/Air 1', color: '#C25B6E', revenue: '$702M', patents: '520+', origin: '中国深圳', position: '中端性价比之王' },
  { name: 'Medela', share: 26, growth: 5.2, priceAvg: 249, rating: 4.5, keyModel: 'Sonata/Motion InBra', color: '#34c759', revenue: '$913M', patents: '128', origin: '瑞士/美国', position: '高端医院级' },
  { name: 'Willow', share: 13, growth: 15.3, priceAvg: 389, rating: 4.3, keyModel: 'Willow Go 3.0', color: '#af52de', revenue: '$456M', patents: '34+', origin: '美国', position: '高端穿戴式(合并Elvie)' },
  { name: 'Spectra', share: 13, growth: 8.8, priceAvg: 189, rating: 4.4, keyModel: 'S2 Plus/S1 Plus', color: '#ff9500', revenue: '$456M', patents: '52', origin: '韩国', position: '中端医院级' },
  { name: 'Philips Avent', share: 12, growth: -3.5, priceAvg: 119, rating: 4.2, keyModel: 'Natural/Dual', color: '#5856d6', revenue: '$421M', patents: '89', origin: '荷兰', position: '大众化综合品牌' },
  { name: 'Ameda', share: 4, growth: 22.0, priceAvg: 229, rating: 4.4, keyModel: 'GLO Wearable', color: '#ff3b30', revenue: '$140M', patents: '45', origin: '美国', position: '医院级转消费' },
  { name: '其他', share: 12, growth: -5.0, priceAvg: 60, rating: 3.8, keyModel: 'Various', color: '#86868b', revenue: '$421M', patents: '-', origin: '多国', position: '低端/区域品牌' },
];

// Product Positioning Matrix: Price vs Rating, bubble = market share
const productMatrix = brandDetail.filter(b => b.name !== '其他').map(b => ({
  name: b.name, x: b.priceAvg, y: b.rating, z: b.share * 30, growth: b.growth, color: b.color,
}));

const priceDist = [
  { range: '<$80', share: 8, brands: '低端/山寨', trend: '萎缩' },
  { range: '$80-$130', share: 15, brands: 'Philips/Manual', trend: '稳定' },
  { range: '$130-$180', share: 28, brands: 'Momcozy/Spectra', trend: '增长' },
  { range: '$180-$250', share: 22, brands: 'Momcozy M9/Medela', trend: '高增长' },
  { range: '$250-$350', share: 16, brands: 'Medela/Ameda', trend: '增长' },
  { range: '>$350', share: 11, brands: 'Willow/Elvie', trend: '高端化' },
];

const modelCompare = [
  { model: 'M5 Wearable', brand: 'Momcozy', price: 159, suction: 280, battery: '5h', noise: 38, app: true, weight: 245, rating: 4.8, innovation: 'DoubleFit法兰' },
  { model: 'M9 Mobile Flow', brand: 'Momcozy', price: 199, suction: 300, battery: '6h', noise: 36, app: true, weight: 268, rating: 4.7, innovation: '气泵隔膜结构' },
  { model: 'Air 1 Ultra-slim', brand: 'Momcozy', price: 179, suction: 260, battery: '4.5h', noise: 35, app: true, weight: 198, rating: 4.6, innovation: '超薄可穿戴' },
  { model: 'Motion InBra', brand: 'Medela', price: 299, suction: 310, battery: '5h', noise: 40, app: true, weight: 280, rating: 4.5, innovation: '2025新品·2-Phase' },
  { model: 'Sonata Pro', brand: 'Medela', price: 349, suction: 320, battery: '4h', noise: 42, app: true, weight: 520, rating: 4.5, innovation: '医院级双韵律' },
  { model: 'GLO Wearable', brand: 'Ameda', price: 249, suction: 305, battery: '5.5h', noise: 37, app: true, weight: 230, rating: 4.4, innovation: 'Milk Optimizing Tech' },
  { model: 'Willow Go 3.0', brand: 'Willow', price: 299, suction: 290, battery: '8h', noise: 35, app: true, weight: 220, rating: 4.3, innovation: '压电泵技术' },
  { model: 'S2 Plus', brand: 'Spectra', price: 189, suction: 310, battery: '3h', noise: 40, app: false, weight: 680, rating: 4.4, innovation: '医院级吸力' },
];

const featureDemand = [
  { feature: 'APP智能控制', demand: 78, momcozy: 85, medela: 75, willow: 90 },
  { feature: '<40dB静音', demand: 72, momcozy: 88, medela: 65, willow: 92 },
  { feature: '可穿戴隐形', demand: 68, momcozy: 82, medela: 70, willow: 85 },
  { feature: '长续航(>5h)', demand: 65, momcozy: 80, medela: 60, willow: 95 },
  { feature: '模块化护罩', demand: 58, momcozy: 75, medela: 70, willow: 65 },
  { feature: 'UV消毒底座', demand: 42, momcozy: 50, medela: 55, willow: 40 },
  { feature: '无线充电', demand: 48, momcozy: 70, medela: 55, willow: 75 },
  { feature: '记忆模式', demand: 55, momcozy: 80, medela: 72, willow: 70 },
];

const marketSizeByType = [
  // 数据来源: Precedence Research 2026-04 · 全球吸奶器$38.1B · CAGR 8.52%
  { type: '穿戴式吸奶器', size2025: 12180, size2030E: 26800, cagr: 17.1, color: '#C25B6E', pct: '32%' },
  { type: '双边电动', size2025: 9520, size2030E: 12500, cagr: 5.6, color: '#34c759', pct: '25%' },
  { type: '单边电动', size2025: 4570, size2030E: 5650, cagr: 4.3, color: '#ff9500', pct: '12%' },
  { type: '手动吸奶器', size2025: 3050, size2030E: 2650, cagr: -2.8, color: '#86868b', pct: '8%' },
  { type: '医院级', size2025: 6480, size2030E: 8950, cagr: 6.7, color: '#af52de', pct: '17%' },
  { type: '配件/周边', size2025: 2300, size2030E: 3500, cagr: 8.7, color: '#5856d6', pct: '6%' },
];

const sidebarItems = [
  { label: '看市场', children: [
    { label: '总览', path: '/market' },
    { label: '大盘趋势', path: '/market/trend' },
    { label: '吸奶器', path: '/market/mtl' },
    { label: '哺乳用品', path: '/market/dtl' },
    { label: '婴儿护理', path: '/market/consumables' },
    { label: '海关数据', path: '/market/customs' },
    { label: '品类分析', path: '/market/category' },
  ]},
];

export default function BreastPump() {
  const [activeTab, setActiveTab] = useState('市场规模');
  const tabs = ['市场规模', '品牌格局', '产品矩阵', '型号对比', '功能需求'];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm">
                  <Droplets className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">吸奶器品类分析</h1>
                  <p className="text-xs text-[#86868b]">$3.51B全球市场 · 品类细分 · 品牌格局 · 产品矩阵 · 型号对比</p>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-1 flex-wrap">
                {tabs.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>{tab}</button>
                ))}
              </div>
            </div>

            {/* ── 市场规模 ── */}
            {activeTab === '市场规模' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: '全球吸奶器市场', value: '$3.51B', sub: '2025年', color: '#C25B6E', icon: <DollarSign className="w-4 h-4" /> },
                    { label: 'CAGR', value: '8.52%', sub: '2025-2035', color: '#34c759', icon: <TrendingUp className="w-4 h-4" /> },
                    { label: '穿戴式增速', value: '14.2%', sub: ' fastest CAGR', color: '#ff9500', icon: <Zap className="w-4 h-4" /> },
                    { label: '北美占比', value: '45.1%', sub: '最大区域', color: '#5856d6', icon: <Target className="w-4 h-4" /> },
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

                {/* Segment Sizes */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品类细分市场规模（$M）· 2025 vs 2030E</h3>
                  <div className="space-y-4">
                    {marketSizeByType.map((t, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="text-xs font-medium text-[#1d1d1f] truncate w-24">{t.type}</span>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <div className="flex-1 min-w-0 h-3 rounded-full bg-[#EDE6DF] overflow-hidden relative">
                            <div className="h-full rounded-full absolute left-0 top-0" style={{ width: `${(t.size2025 / 2200) * 100}%`, backgroundColor: `${t.color}40` }} />
                            <div className="h-full rounded-full absolute left-0 top-0 border-r-2 border-white" style={{ width: `${(t.size2030E / 2200) * 100}%`, backgroundColor: t.color }} />
                          </div>
                          <span className="text-[10px] text-[#86868b] w-16">${t.size2025}M→${t.size2030E}M</span>
                        </div>
                        <span className={`text-[10px] font-semibold w-12 text-right ${t.cagr > 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>{t.cagr > 0 ? '+' : ''}{t.cagr}%</span>
                        <span className="text-[10px] text-[#86868b] w-8">{t.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Type Trend */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">细分品类趋势（$M）</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pumpTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        <Area type="monotone" dataKey="wearable" name="穿戴式" stackId="1" stroke="#C25B6E" fill="#C25B6E" />
                        <Area type="monotone" dataKey="electric" name="双边电动" stackId="1" stroke="#34c759" fill="#34c759" />
                        <Area type="monotone" dataKey="hospital" name="医院级" stackId="1" stroke="#af52de" fill="#af52de" />
                        <Area type="monotone" dataKey="manual" name="手动" stackId="1" stroke="#86868b" fill="#86868b" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ── 品牌格局 ── */}
            {activeTab === '品牌格局' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] overflow-x-auto">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品牌竞争格局详情</h3>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#EDE6DF] table-row-hover">
                        {['品牌', '份额', '增速', '均价', '评分', '核心型号', '收入', '专利', '产地', '定位'].map((h, i) => (
                          <th key={i} className="py-2 px-2 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {brandDetail.map((b, i) => (
                        <tr key={i} className="border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors duration-200 duration-200">
                          <td className="py-2 px-2"><span className="text-xs font-semibold" style={{ color: b.color }}>{b.name}</span></td>
                          <td className="py-2 px-2"><span className="text-xs font-medium">{b.share}%</span></td>
                          <td className="py-2 px-2"><span className={`text-xs ${b.growth > 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>{b.growth > 0 ? '+' : ''}{b.growth}%</span></td>
                          <td className="py-2 px-2"><span className="text-xs text-[#86868b]">${b.priceAvg}</span></td>
                          <td className="py-2 px-2 flex items-center gap-0.5"><Star className="w-3 h-3 text-[#ff9500] fill-[#ff9500]" /><span className="text-xs">{b.rating}</span></td>
                          <td className="py-2 px-2"><span className="text-[10px] text-[#86868b]">{b.keyModel}</span></td>
                          <td className="py-2 px-2"><span className="text-xs font-medium">{b.revenue}</span></td>
                          <td className="py-2 px-2"><span className="text-[10px] text-[#86868b]">{b.patents}</span></td>
                          <td className="py-2 px-2"><span className="text-[10px] text-[#86868b]">{b.origin}</span></td>
                          <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FBF8F5] text-[#86868b]">{b.position}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Price Distribution */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">价格带分布</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {priceDist.map((p, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[#1d1d1f]">{p.range}</span>
                          <span className="text-xs font-medium text-[#C25B6E]">{p.share}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#EDE6DF] overflow-hidden mb-1">
                          <div className="h-full rounded-full bg-[#C25B6E]" style={{ width: `${p.share * 3}%` }} />
                        </div>
                        <p className="text-[10px] text-[#86868b]">{p.brands}</p>
                        <span className={`text-[10px] ${p.trend === '萎缩' ? 'text-[#ff3b30]' : p.trend === '高增长' || p.trend === '高端化' ? 'text-[#34c759]' : 'text-[#86868b]'}`}>{p.trend}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 产品矩阵 ── */}
            {activeTab === '产品矩阵' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">品牌定位矩阵 · 价格 vs 评分（气泡=市场份额）</h3>
                    <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg">象限分析</span>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                        <XAxis type="number" dataKey="x" name="均价" unit="$" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} label={{ value: '平均售价 ($)', position: 'bottom', fontSize: 10, fill: '#86868b' }} />
                        <YAxis type="number" dataKey="y" name="评分" domain={[4.0, 5.0]} tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} label={{ value: '用户评分', angle: -90, position: 'left', fontSize: 10, fill: '#86868b' }} />
                        <ZAxis type="number" dataKey="z" range={[100, 1200]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} formatter={(value: any, name: any) => {
                          if (name === 'x') return [`$${value}`, '均价'];
                          if (name === 'y') return [value, '评分'];
                          return [value, name];
                        }} />
                        <Scatter name="品牌" data={productMatrix}>
                          {productMatrix.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.7} stroke={entry.color} strokeWidth={2} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="p-3 rounded-xl bg-[#FBF8F5] border-l-2 border-[#34c759]">
                      <p className="text-[10px] text-[#34c759] font-medium mb-1">右上象限 · 高端高质</p>
                      <p className="text-[10px] text-[#86868b]">Medela Motion InBra、Ameda GLO — 高定价+高评分，品牌溢价能力强</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FBF8F5] border-l-2 border-[#C25B6E]">
                      <p className="text-[10px] text-[#C25B6E] font-medium mb-1">左上象限 · 性价比之王</p>
                      <p className="text-[10px] text-[#86868b]">Momcozy — 中等定价+高评分，规模增长最快(+28.5%)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 型号对比 ── */}
            {activeTab === '型号对比' && (
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] overflow-x-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">核心型号对比矩阵</h3>
                  <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg">8款主力产品</span>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#EDE6DF] table-row-hover">
                      {['型号', '品牌', '售价', '吸力mmHg', '续航', '噪音dB', 'APP', '重量g', '评分', '创新点'].map((h, i) => (
                        <th key={i} className="py-2 px-2 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modelCompare.map((m, i) => (
                      <tr key={i} className={`border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors duration-200 duration-200 ${m.brand === 'Momcozy' ? 'bg-[#C25B6E]/5' : ''}`}>
                        <td className="py-2 px-2 text-xs font-semibold text-[#1d1d1f]">{m.model}</td>
                        <td className="py-2 px-2 text-[10px]" style={{ color: brandDetail.find(b => b.name === m.brand)?.color || '#86868b' }}>{m.brand}</td>
                        <td className="py-2 px-2 text-xs font-medium text-[#C25B6E]">${m.price}</td>
                        <td className="py-2 px-2 text-xs">{m.suction}</td>
                        <td className="py-2 px-2 text-xs">{m.battery}</td>
                        <td className="py-2 px-2"><span className={`text-xs ${m.noise <= 38 ? 'text-[#34c759]' : 'text-[#86868b]'}`}>{m.noise}dB</span></td>
                        <td className="py-2 px-2">{m.app ? <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#34c759]/10 text-[#34c759]">✓</span> : <span className="text-[#86868b]">—</span>}</td>
                        <td className="py-2 px-2 text-xs">{m.weight}</td>
                        <td className="py-2 px-2 flex items-center gap-0.5"><Star className="w-3 h-3 text-[#ff9500] fill-[#ff9500]" /><span className="text-xs">{m.rating}</span></td>
                        <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FBF8F5] text-[#86868b]">{m.innovation}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── 功能需求 ── */}
            {activeTab === '功能需求' && (
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">消费者功能需求 vs 品牌满足度</h3>
                  <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg">需求重要性 %</span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={featureDemand} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                      <YAxis dataKey="feature" type="category" tick={{ fontSize: 10, fill: '#1d1d1f' }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="demand" name="消费者需求度" fill="#F0EBE6" radius={[0, 4, 4, 0]} barSize={8} />
                      <Bar dataKey="momcozy" name="Momcozy满足度" fill="#C25B6E" radius={[0, 4, 4, 0]} barSize={8} />
                      <Bar dataKey="medela" name="Medela满足度" fill="#34c759" radius={[0, 4, 4, 0]} barSize={8} />
                      <Bar dataKey="willow" name="Willow满足度" fill="#af52de" radius={[0, 4, 4, 0]} barSize={8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
