import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Eye, Package, DollarSign, Truck, Megaphone, Target, Star, Globe, TrendingUp, Award, Users, Zap, ShoppingCart, Calendar, ArrowUpRight, Lightbulb, Heart, MapPin, Download } from 'lucide-react';
import { exportToCsv } from '@/utils/csvExport';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

// ═══════════════════════════════════════════════════════════════════
// Momcozy 看自己 · 营销4P深度诊断
// 来源混合内部、平台和主观测算，展示层必须标注复核边界。
// 分析框架：BCG矩阵 / 价格弹性 / 4M影响者模型 / 渠道效率矩阵
// ═══════════════════════════════════════════════════════════════════

// ─── Product: BCG矩阵数据 ───
const bcgData = [
  { name: 'M5穿戴式', marketGrowth: 15.1, relativeShare: 2.8, revenue: 28.5, size: 285, category: '明星', color: '#C25B6E' },
  { name: 'M9 Mobile Flow', marketGrowth: 18.2, relativeShare: 1.6, revenue: 18.2, size: 182, category: '明星', color: '#C25B6E' },
  { name: '哺乳文胸', marketGrowth: 8.5, relativeShare: 1.4, revenue: 16.8, size: 168, category: '现金牛', color: '#34c759' },
  { name: 'Air1 Ultra-Slim', marketGrowth: 12.8, relativeShare: 0.9, revenue: 12.5, size: 125, category: '问题', color: '#ff9500' },
  { name: 'KleanPal Pro', marketGrowth: 35.2, relativeShare: 0.4, revenue: 8.6, size: 86, category: '问题', color: '#ff9500' },
  { name: 'W1加热款', marketGrowth: 42.0, relativeShare: 0.2, revenue: 3.2, size: 32, category: '问题', color: '#ff9500' },
  { name: '孕妇枕', marketGrowth: 6.2, relativeShare: 1.1, revenue: 7.5, size: 75, category: '现金牛', color: '#34c759' },
  { name: '传统配件', marketGrowth: 2.1, relativeShare: 0.6, revenue: 4.2, size: 42, category: '瘦狗', color: '#86868b' },
];

// ─── Product: 全场景生态 ───
const ecosystem = [
  { stage: '孕期护理', products: ['Birth Ease分娩球', '孕妇枕', '哺乳文胸'], penetration: 35, growth: 18.2, color: '#af52de' },
  { stage: '哺乳喂养', products: ['M5/M9/W1/Air1吸奶器', '暖奶器', '储奶袋'], penetration: 78, growth: 28.5, color: '#C25B6E' },
  { stage: '婴儿护理', products: ['BM08智能监视器', 'KleanPal奶瓶清洗机'], penetration: 22, growth: 45.2, color: '#ff9500' },
  { stage: '产后恢复', products: ['红光治疗仪', '哺乳按摩器'], penetration: 15, growth: 22.8, color: '#34c759' },
  { stage: '育儿家居', products: ['Nursery Recliner摇椅', '婴儿背带'], penetration: 8, growth: 55.0, color: '#5856d6' },
];

// ─── Price: 竞品价格带地图 ───
const priceMap = [
  { brand: 'Haakaa', model: '硅胶手动', price: 16, score: 7.2, size: 40 },
  { brand: 'Lansinoh', model: 'Compact', price: 89, score: 7.8, size: 45 },
  { brand: 'Momcozy', model: 'Air1', price: 159, score: 8.6, size: 85 },
  { brand: 'Momcozy', model: 'M5', price: 159, score: 9.1, size: 120 },
  { brand: 'Momcozy', model: 'M9', price: 199, score: 9.0, size: 95 },
  { brand: 'Momcozy', model: 'W1', price: 219, score: 8.8, size: 50 },
  { brand: 'Willow', model: 'Willow Go', price: 199, score: 8.4, size: 65 },
  { brand: 'Willow', model: 'Willow 360', price: 349, score: 8.7, size: 55 },
  { brand: 'eufy', model: 'E20', price: 179, score: 8.3, size: 60 },
  { brand: 'eufy', model: 'S1 Pro', price: 299, score: 8.9, size: 50 },
  { brand: 'Elvie', model: 'Elvie Stride', price: 199, score: 8.5, size: 70 },
  { brand: 'Elvie', model: 'Elvie Pump', price: 549, score: 8.2, size: 40 },
  { brand: 'Medela', model: 'Motion InBra', price: 299, score: 8.6, size: 75 },
  { brand: 'Medela', model: 'Magic InBra', price: 329, score: 8.8, size: 65 },
  { brand: 'Medela', model: 'Melody InBra', price: 349, score: 8.7, size: 45 },
  { brand: 'Ameda', model: 'GLO', price: 249, score: 8.1, size: 35 },
  { brand: 'Freemie', model: 'Freedom', price: 199, score: 7.9, size: 30 },
];

// ─── Price: ASP趋势 ───
const aspTrend = [
  { quarter: '2024 Q1', momcozy: 112, medela: 285, willow: 298, elvie: 420, industry: 195 },
  { quarter: '2024 Q2', momcozy: 118, medela: 295, willow: 305, elvie: 435, industry: 198 },
  { quarter: '2024 Q3', momcozy: 125, medela: 312, willow: 320, elvie: 465, industry: 205 },
  { quarter: '2024 Q4', momcozy: 132, medela: 318, willow: 325, elvie: 485, industry: 210 },
  { quarter: '2025 Q1', momcozy: 138, medela: 322, willow: 328, elvie: 510, industry: 215 },
  { quarter: '2025 Q2', momcozy: 142, medela: 325, willow: 335, elvie: 530, industry: 218 },
  { quarter: '2025 Q3', momcozy: 148, medela: 319, willow: 330, elvie: 525, industry: 216 },
  { quarter: '2025 Q4', momcozy: 155, medela: 315, willow: 325, elvie: 515, industry: 212 },
  { quarter: '2026 Q1', momcozy: 162, medela: 308, willow: 315, elvie: 505, industry: 208 },
];

// ─── Place: 渠道效率矩阵 ───
const channelMatrix = [
  { channel: 'Amazon', revenue: 42, growth: 15, margin: 28, control: 20, size: 4200 },
  { channel: '品牌官网DTC', revenue: 23, growth: 32, margin: 52, control: 95, size: 2300 },
  { channel: 'TikTok Shop', revenue: 12, growth: 68, margin: 35, control: 70, size: 1200 },
  { channel: '线下零售', revenue: 15, growth: 22, margin: 18, control: 15, size: 1500 },
  { channel: 'Shopee/Lazada', revenue: 8, growth: 45, margin: 22, control: 25, size: 800 },
];

// ─── Place: 区域渠道 ───
const regionChannels = [
  { region: '北美', amazon: 38, dtc: 28, retail: 18, social: 12, other: 4, key: 'Target/Walmart/Babylist' },
  { region: '欧洲', amazon: 32, dtc: 22, retail: 28, social: 8, other: 10, key: 'Boots/MediaWorld/Currys' },
  { region: '亚太', amazon: 18, dtc: 15, retail: 12, social: 45, other: 10, key: 'Shopee/TikTok Shop' },
  { region: '中东', amazon: 25, dtc: 35, retail: 20, social: 15, other: 5, key: '线下高端零售' },
];

// ─── Promotion: 4M模型数据 ───
const fourMData = [
  { stage: 'Mission使命', metric: '品牌认知度', kpi: '85%', tool: '品牌搜索量+社媒提及', insight: 'USA TODAY 5星+Newsweek #3信任度' },
  { stage: 'Messaging信息', metric: '内容互动率', kpi: '6.8%', tool: 'Hook留存率+A/B测试', insight: '"Cozy by You" UGC内容策略' },
  { stage: 'Marketplace达人', metric: '达人覆盖率', kpi: '75,000+', tool: 'CreatorIQ/Modash', insight: 'TikTok/IG/YouTube三平台矩阵' },
  { stage: 'Measurement度量', metric: '整体ROAS', kpi: '6.4:1', tool: 'UTM+GA4+增量测试', insight: 'KOL合作ROI最高5.8x' },
];

// ─── Promotion: 社媒平台数据 ───
const socialData = [
  { platform: 'TikTok', followers: '1.2M', engagement: 8.2, growth: 65.2, leads: 15200, roas: 5.2, color: '#C25B6E' },
  { platform: 'Instagram', followers: '980K', engagement: 4.8, growth: 28.5, leads: 12800, roas: 4.8, color: '#af52de' },
  { platform: 'YouTube', followers: '520K', engagement: 3.5, growth: 22.1, leads: 8400, roas: 3.8, color: '#ff3b30' },
  { platform: 'Facebook', followers: '380K', engagement: 2.8, growth: 12.5, leads: 6200, roas: 3.2, color: '#5856d6' },
  { platform: 'Pinterest', followers: '290K', engagement: 5.5, growth: 35.8, leads: 4800, roas: 4.5, color: '#ff9500' },
];

// ─── 品牌竞争力雷达 ───
const brandRadar = [
  { subject: '品牌知名度', Momcozy: 88, Medela: 92, Willow: 82, Elvie: 78, fullMark: 100 },
  { subject: '产品满意度', Momcozy: 92, Medela: 86, Willow: 84, Elvie: 88, fullMark: 100 },
  { subject: '技术创新', Momcozy: 90, Medela: 82, Willow: 88, Elvie: 85, fullMark: 100 },
  { subject: '价格竞争力', Momcozy: 95, Medela: 62, Willow: 58, Elvie: 45, fullMark: 100 },
  { subject: '渠道覆盖', Momcozy: 88, Medela: 85, Willow: 72, Elvie: 68, fullMark: 100 },
  { subject: '社媒影响力', Momcozy: 95, Medela: 70, Willow: 78, Elvie: 72, fullMark: 100 },
  { subject: '品牌信任度', Momcozy: 92, Medela: 88, Willow: 80, Elvie: 82, fullMark: 100 },
  { subject: '生态完整性', Momcozy: 90, Medela: 55, Willow: 60, Elvie: 52, fullMark: 100 },
];

// ─── 4P协同KPI ───
const fourPKpis = [
  { label: '全球用户', value: '500万+', sub: '60国 · 2025年底', icon: <Users className="w-5 h-5" />, color: '#C25B6E' },
  { label: '专利资产', value: '520+', sub: '授权专利+330商标', icon: <Award className="w-5 h-5" />, color: '#ff9500' },
  { label: '平均ASP', value: '$162', sub: '2026 Q1 · +45% YoY', icon: <DollarSign className="w-5 h-5" />, color: '#34c759' },
  { label: '覆盖渠道', value: '60+', sub: '国家 · 8大零售', icon: <MapPin className="w-5 h-5" />, color: '#5856d6' },
  { label: '达人网络', value: '75K+', sub: '创作者 · 2.7M社区', icon: <Megaphone className="w-5 h-5" />, color: '#af52de' },
  { label: '整体ROAS', value: '6.4x', sub: 'Retail基准6.4:1', icon: <TrendingUp className="w-5 h-5" />, color: '#C25B6E' },
];

const tabs = [
  { id: 'overview', label: '总览', icon: <Eye className="w-4 h-4" /> },
  { id: 'product', label: 'Product 产品', icon: <Package className="w-4 h-4" /> },
  { id: 'price', label: 'Price 定价', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'place', label: 'Place 渠道', icon: <Truck className="w-4 h-4" /> },
  { id: 'promotion', label: 'Promotion 推广', icon: <Megaphone className="w-4 h-4" /> },
];

export default function SelfInsight() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm">
                <Target className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#1d1d1f]">看自己</h1>
                <p className="text-xs text-[#86868b]">Momcozy 营销4P深度诊断 · BCG矩阵/价格竞争地图/4M影响者模型</p>
              </div>
            </div>
            <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg"><span className="text-[#B5AFA8]">数据状态：</span>内部/平台快照待拆分</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200 hover:text-[#1d1d1f]'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <PageEvidenceNotice
          sourceIds={['ds-019', 'ds-020']}
          title="自我诊断来源口径"
          description="营销 4P 混合内部数据、Amazon 平台信息和主观 BCG 测算；当前诊断需要补数据快照、外部份额校准和更新时间拆分。"
          className="mb-6"
        />

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* R21: 战略诊断总结横幅 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 战略诊断总结 */}
            <div className="bg-gradient-to-r from-[#C25B6E]/10 via-[#FBF8F5] to-[#34c759]/10 rounded-2xl p-5 card-shadow-sm border border-[#C25B6E]/15">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-[#C25B6E]" />
                <h3 className="text-sm font-semibold text-[#C25B6E]">Momcozy 战略诊断总结</h3>
                <span className="text-[10px] text-[#86868b] bg-white/60 px-2 py-0.5 rounded-full ml-auto">2026 Q1</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-white/70">
                  <p className="text-[10px] text-[#34c759] font-bold mb-1">优势 Strengths</p>
                  <p className="text-[11px] text-[#1d1d1f] leading-relaxed">价格竞争力($162 vs 行业$208)，社媒影响力(TikTok 1.2M)，DTC增速+32%，全场景生态布局领先</p>
                </div>
                <div className="p-3 rounded-xl bg-white/70">
                  <p className="text-[10px] text-[#ff9500] font-bold mb-1">劣势 Weaknesses</p>
                  <p className="text-[11px] text-[#1d1d1f] leading-relaxed">品牌认知度(88 vs Medela 92)，高端市场渗透有限，线下零售仅占15%，欧洲份额待提升</p>
                </div>
                <div className="p-3 rounded-xl bg-white/70">
                  <p className="text-[10px] text-[#5856d6] font-bold mb-1">建议 Actions</p>
                  <p className="text-[11px] text-[#1d1d1f] leading-relaxed">① W1加热款窗口期抢发 ② 北美DTC加大投入 ③ 欧洲MDR合规先行 ④ M5 Ultra静音版防御Medela</p>
                </div>
              </div>
            </div>
            {/* 4P KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {fourPKpis.map((kpi, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>{kpi.icon}</div>
                    <span className="text-xs text-[#86868b]">{kpi.label}</span>
                  </div>
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{kpi.value}</p>
                  <span className="text-[10px] text-[#86868b]">{kpi.sub}</span>
                </div>
              ))}
            </div>

            {/* 品牌竞争力雷达 + 4P战略诊断 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">品牌竞争力雷达（vs 核心竞品）</h3>
                <p className="text-[10px] text-[#86868b] mb-5"><span className="text-[#B5AFA8]">数据来源：</span>Newsweek 2026/USA TODAY/Grand View Research Research 2024</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                    <RadarChart data={brandRadar}>
                      <PolarGrid stroke="#EDE6DF" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#86868b' }} />
                      <Radar name="Momcozy" dataKey="Momcozy" stroke="#C25B6E" fill="#C25B6E" fillOpacity={0.2} strokeWidth={2.5} />
                      <Radar name="Medela" dataKey="Medela" stroke="#34c759" fill="#34c759" fillOpacity={0.05} strokeWidth={1.5} />
                      <Radar name="Willow" dataKey="Willow" stroke="#ff9500" fill="#ff9500" fillOpacity={0.05} strokeWidth={1.5} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">4P战略诊断卡片</h3>
                <div className="space-y-4">
                  {[
                    { p: 'Product', stat: '全场景生态', desc: '从吸奶器→孕期→育儿→家居5大场景，Cozy Tech方法论驱动品类扩张', score: 'A', scoreColor: '#34c759', icon: <Package className="w-4 h-4" /> },
                    { p: 'Price', stat: '价值挑战者', desc: '$60-$219定价带，ASP$162仅为Elvie 30%，Prime Day/Brand Day促销矩阵成熟', score: 'A-', scoreColor: '#34c759', icon: <DollarSign className="w-4 h-4" /> },
                    { p: 'Place', stat: '全渠道融合', desc: 'Amazon 38%+DTC 23%+零售15%+社商12%，Boots/MediaWorld/Target线下渗透', score: 'B+', scoreColor: '#ff9500', icon: <Truck className="w-4 h-4" /> },
                    { p: 'Promotion', stat: '信任营销', desc: '75K达人+MAB医疗顾问+5星信任评级，"More Than Pumping"IP化内容', score: 'A', scoreColor: '#34c759', icon: <Megaphone className="w-4 h-4" /> },
                  ].map((card, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] flex items-center gap-4 cursor-pointer hover:bg-[#F5EDE8] transition-colors duration-200" onClick={() => setActiveTab(['product', 'price', 'place', 'promotion'][i])}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${card.scoreColor}15`, color: card.scoreColor }}>{card.icon}</div>
                      <div className="flex-1 min-w-0 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#1d1d1f]">{card.p} · {card.stat}</span>
                          <span className="ml-auto text-xs font-bold" style={{ color: card.scoreColor }}>{card.score}</span>
                        </div>
                        <p className="text-[10px] text-[#86868b] mt-0.5 leading-relaxed">{card.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 竞争定位图 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">竞争定位图：价格 vs 产品评分</h3>
              <p className="text-[10px] text-[#86868b] mb-5">气泡大小=估算销量 · <span className="text-[#B5AFA8]">数据来源：</span>Amazon/eufy官网公开信息2026</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                  <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis type="number" dataKey="price" name="价格" unit="$" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} label={{ value: '价格 ($)', position: 'bottom', fontSize: 10, fill: '#86868b' }} />
                    <YAxis type="number" dataKey="score" name="评分" domain={[6.5, 10]} tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} label={{ value: '综合评分', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#86868b' }} />
                    <ZAxis type="number" dataKey="size" range={[80, 600]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload;
                      return <div className="bg-white rounded-xl p-3 shadow-lg border border-[#EDE6DF] text-xs"><p className="font-semibold text-[#1d1d1f]">{d.brand} {d.model}</p><p className="text-[#86868b]">${d.price} · 评分{d.score}</p></div>;
                    }} />
                    <Scatter data={priceMap.filter(p => p.brand === 'Momcozy')} fill="#C25B6E" name="Momcozy" />
                    <Scatter data={priceMap.filter(p => p.brand !== 'Momcozy')} fill="#86868b30" name="竞品" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PRODUCT */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'product' && (
          <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { l: '全球用户', v: '500万+', sub: '60国 · 样本口径待拆分', c: '#C25B6E', icon: <Users className="w-4 h-4" /> },
                { l: '专利资产', v: '520+', sub: '授权专利+330商标', c: '#ff9500', icon: <Award className="w-4 h-4" /> },
                { l: '行业大奖', v: '49项', sub: 'Red Dot/Best of Bump', c: '#34c759', icon: <Star className="w-4 h-4" /> },
                { l: '全球份额', v: '19.32%', sub: '穿戴式吸奶器#1', c: '#5856d6', icon: <TrendingUp className="w-4 h-4" /> },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.c}15`, color: s.c }}>{s.icon}</div>
                    <span className="text-xs text-[#86868b]">{s.l}</span>
                  </div>
                  <p className="text-2xl font-semibold" style={{ color: s.c }}>{s.v}</p>
                  <p className="text-[10px] text-[#86868b]">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* BCG矩阵 + 全场景生态 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* BCG矩阵 */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">BCG增长-份额矩阵</h3>
                  <button onClick={() => exportToCsv(bcgData, { name: "产品", category: "象限", marketGrowth: "增长率%", relativeShare: "相对份额", revenue: "营收$M" }, "BCG矩阵_" + new Date().toISOString().slice(0, 10))} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all"><Download className="w-3 h-3"/>导出</button>
                </div>
                <p className="text-[10px] text-[#86868b] mb-5">X轴=相对市场份额 · Y轴=市场增长率(%) · 气泡=营收($M)</p>
                <div className="h-72 relative">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                    <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis type="number" dataKey="relativeShare" name="相对份额" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <YAxis type="number" dataKey="marketGrowth" name="市场增长" unit="%" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <ZAxis type="number" dataKey="size" range={[100, 800]} />
                      <Tooltip content={({ payload }) => {
                        if (!payload?.[0]) return null; const d = payload[0].payload;
                        return <div className="bg-white rounded-xl p-3 shadow-lg border border-[#EDE6DF] text-xs"><p className="font-semibold" style={{ color: d.color }}>{d.name} ({d.category})</p><p className="text-[#86868b]">${d.revenue}M · 增长{d.marketGrowth}% · 份额{d.relativeShare}x</p></div>;
                      }} />
                      <Scatter data={bcgData} fill="#C25B6E" />
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* BCG象限标签 */}
                  <div className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded bg-[#34c759]/10 text-[#34c759] font-medium">明星</div>
                  <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-[#ff9500]/10 text-[#ff9500] font-medium">问题</div>
                  <div className="absolute bottom-8 left-2 text-[9px] px-1.5 py-0.5 rounded bg-[#C25B6E]/10 text-[#C25B6E] font-medium">现金牛</div>
                  <div className="absolute bottom-8 right-2 text-[9px] px-1.5 py-0.5 rounded bg-[#86868b]/10 text-[#86868b] font-medium">瘦狗</div>
                </div>
                {/* R22: BCG策略建议 */}
                <div className="mt-4 p-3 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/10">
                  <p className="text-[10px] text-[#ff9500] font-semibold mb-2">BCG产品策略建议</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-[#34c759] mt-1.5 flex-shrink-0" /><p className="text-[10px] text-[#1d1d1f]"><strong>明星(M5/M9)</strong>: 加大投入，扩大份额，目标M5维持Amazon #1</p></div>
                    <div className="flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-[#C25B6E] mt-1.5 flex-shrink-0" /><p className="text-[10px] text-[#1d1d1f]"><strong>现金牛(文胸/孕妇枕)</strong>: 收割利润，维持不追加研发</p></div>
                    <div className="flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-[#ff9500] mt-1.5 flex-shrink-0" /><p className="text-[10px] text-[#1d1d1f]"><strong>问题(Air1/KleanPal/W1)</strong>: 选择性投资，W1重点押注</p></div>
                    <div className="flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-[#86868b] mt-1.5 flex-shrink-0" /><p className="text-[10px] text-[#1d1d1f]"><strong>瘦狗(传统配件)</strong>: 考虑剥离或停产</p></div>
                  </div>
                </div>
              </div>

              {/* 全场景生态 */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">Cozy Tech全场景生态 · 渗透率与增长</h3>
                <div className="space-y-4">
                  {ecosystem.map((e, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                          <span className="text-xs font-semibold text-[#1d1d1f]">{e.stage}</span>
                          <span className="text-[10px] text-[#86868b]">{e.products.join(' · ')}</span>
                        </div>
                        <span className="text-[10px] text-[#34c759] font-medium">+{e.growth}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 h-2 bg-white rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${e.penetration}%`, backgroundColor: e.color }} />
                        </div>
                        <span className="text-[10px] text-[#86868b] w-10 text-right">{e.penetration}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                  <p className="text-[10px] text-[#C25B6E] font-medium mb-1">Cozy Tech方法论洞察</p>
                  <p className="text-[10px] text-[#86868b] leading-relaxed">从单一吸奶器工具→全周期母婴生态系统。2026 ABC Kids Expo发布W1加热款+BM08 AI监视器+Birth Ease分娩球+红光治疗仪+Nursery摇椅，标志着从"哺喂工具"到"生活方式品牌"的战略跃迁。对标Philips Avent全品类覆盖模式，但差异化在于"穿戴式+智能化"技术底座。</p>
                </div>
              </div>
            </div>

            {/* 明星产品矩阵 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">明星产品矩阵 · 波士顿三层模型</h3>
              <p className="text-[10px] text-[#86868b] mb-5">战略核心层(现金流) · 增长引擎层(市场份额) · 创新探索层(未来押注)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 战略核心 */}
                <div className="p-4 rounded-2xl border-2 border-[#C25B6E]/20 bg-[#C25B6E]/[0.03]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#C25B6E]/10 flex items-center justify-center"><Star className="w-4 h-4 text-[#C25B6E]" /></div>
                    <span className="text-xs font-semibold text-[#C25B6E]">战略核心层</span>
                  </div>
                  {[
                    { name: 'M5 Smart Wearable', price: '$159', award: 'Best of Bump 2025', share: '全球#1', margin: '42%' },
                    { name: 'M9 Mobile Flow', price: '$199', award: 'Kind+Jugend金奖', share: '28%', margin: '45%' },
                  ].map((p, i) => (
                    <div key={i} className="mb-2 p-2.5 rounded-xl bg-white">
                      <div className="flex items-center justify-between"><span className="text-xs font-medium text-[#1d1d1f] truncate">{p.name}</span><span className="text-xs text-[#C25B6E] font-medium">{p.price}</span></div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#86868b]"><span>{p.award}</span><span>·</span><span>{p.share}</span><span>·</span><span>毛利{p.margin}</span></div>
                    </div>
                  ))}
                  <p className="text-[10px] text-[#86868b] mt-2 leading-relaxed">M5+M9贡献吸奶器品类68%营收，是Momcozy的"现金牛组合"。M5定位性价比爆款(Amazon #1 Best Seller)，M9定位技术旗舰(医院级吸力+APP)。</p>
                </div>
                {/* 增长引擎 */}
                <div className="p-4 rounded-2xl border-2 border-[#34c759]/20 bg-[#34c759]/[0.03]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#34c759]/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-[#34c759]" /></div>
                    <span className="text-xs font-semibold text-[#34c759]">增长引擎层</span>
                  </div>
                  {[
                    { name: 'Air1 Ultra-Slim', price: '$159', highlight: '2.4英寸超薄', growth: '+38%' },
                    { name: 'KleanPal Pro', price: '$89', highlight: '4合1清洗消毒', growth: '+68%' },
                    { name: 'BM08智能监视器', price: '$149', highlight: 'AI睡眠监测', growth: '+120%' },
                  ].map((p, i) => (
                    <div key={i} className="mb-2 p-2.5 rounded-xl bg-white">
                      <div className="flex items-center justify-between"><span className="text-xs font-medium text-[#1d1d1f] truncate">{p.name}</span><span className="text-xs text-[#34c759] font-medium">{p.growth}</span></div>
                      <div className="text-[10px] text-[#86868b] mt-0.5">{p.highlight} · {p.price}</div>
                    </div>
                  ))}
                  <p className="text-[10px] text-[#86868b] mt-2 leading-relaxed">Air1切入"极致便携"细分场景，KleanPal从喂养工具扩展到清洁电器(品类边界突破)，BM08代表智能育儿新赛道布局。</p>
                </div>
                {/* 创新探索 */}
                <div className="p-4 rounded-2xl border-2 border-[#ff9500]/20 bg-[#ff9500]/[0.03]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#ff9500]/10 flex items-center justify-center"><Lightbulb className="w-4 h-4 text-[#ff9500]" /></div>
                    <span className="text-xs font-semibold text-[#ff9500]">创新探索层</span>
                  </div>
                  {[
                    { name: 'W1加热按摩款', price: '$219', status: '2026 Q2上市', risk: '中' },
                    { name: '红光治疗仪', price: '$89', status: '2026 H2', risk: '高' },
                    { name: 'Nursery Recliner', price: '待定', status: '概念阶段', risk: '高' },
                  ].map((p, i) => (
                    <div key={i} className="mb-2 p-2.5 rounded-xl bg-white">
                      <div className="flex items-center justify-between"><span className="text-xs font-medium text-[#1d1d1f] truncate">{p.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff9500]/10 text-[#ff9500]">{p.status}</span></div>
                      <div className="text-[10px] text-[#86868b] mt-0.5">风险:{p.risk} · {p.price}</div>
                    </div>
                  ))}
                  <p className="text-[10px] text-[#86868b] mt-2 leading-relaxed">W1是2026年战略级新品(行业首款内置加热+按摩)，对标eufy HeatFlow和Medela FluidFeel。红光治疗仪和Nursery家具代表Momcozy向"母婴生活方式品牌"的边界测试。</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PRICE */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'price' && (
          <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { l: '2026 ASP', v: '$162', sub: '+45% vs 2024 Q1', c: '#C25B6E', icon: <DollarSign className="w-4 h-4" /> },
                { l: 'vs Elvie', v: '-68%', sub: '价格优势显著', c: '#34c759', icon: <TrendingUp className="w-4 h-4" /> },
                { l: 'Prime Day折扣', v: '30%', sub: '最高促销力度', c: '#ff9500', icon: <ShoppingCart className="w-4 h-4" /> },
                { l: 'DTC毛利', v: '52%', sub: '官网直销利润率', c: '#5856d6', icon: <Award className="w-4 h-4" /> },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.c}15`, color: s.c }}>{s.icon}</div>
                    <span className="text-xs text-[#86868b]">{s.l}</span>
                  </div>
                  <p className="text-2xl font-semibold" style={{ color: s.c }}>{s.v}</p>
                  <p className="text-[10px] text-[#86868b]">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* 竞品价格带地图 + ASP趋势 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">竞品价格带竞争地图</h3>
                  <button onClick={() => exportToCsv(priceMap, { brand: "品牌", model: "型号", price: "价格$", score: "评分" }, "竞品价格带_" + new Date().toISOString().slice(0, 10))} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all"><Download className="w-3 h-3"/>导出</button>
                </div>
                <p className="text-[10px] text-[#86868b] mb-5">各品牌主力产品定价分布 · Momcozy锚定$149-$219价值带</p>
                <div className="space-y-2">
                  {[
                    { tier: '超高端 $400+', brands: [{ name: 'Elvie Pump', price: '$549', color: '#86868b' }], insight: 'Momcozy未进入——技术溢价空间有限' },
                    { tier: '高端 $250-$400', brands: [{ name: 'Willow 360', price: '$349', color: '#86868b' }, { name: 'Medela Melody', price: '$349', color: '#86868b' }, { name: 'eufy S1 Pro', price: '$299', color: '#86868b' }, { name: 'Medela Magic', price: '$329', color: '#86868b' }], insight: 'Momcozy W1($219)以加热功能错位竞争' },
                    { tier: '中高端 $150-$250', brands: [{ name: 'Momcozy M9', price: '$199', color: '#C25B6E' }, { name: 'Momcozy W1', price: '$219', color: '#C25B6E' }, { name: 'Momcozy M5', price: '$159', color: '#C25B6E' }, { name: 'Momcozy Air1', price: '$159', color: '#C25B6E' }, { name: 'Willow Go', price: '$199', color: '#86868b' }, { name: 'Elvie Stride', price: '$199', color: '#86868b' }, { name: 'eufy E20', price: '$179', color: '#86868b' }, { name: 'Ameda GLO', price: '$249', color: '#86868b' }], insight: 'Momcozy核心战场——4款产品密集覆盖' },
                    { tier: '入门 <$150', brands: [{ name: 'Lansinoh Compact', price: '$89', color: '#86868b' }, { name: 'Haakaa手动', price: '$16', color: '#86868b' }], insight: 'Momcozy未布局——避免低端价格锚定' },
                  ].map((t, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[#1d1d1f] truncate">{t.tier}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {t.brands.map((b, j) => (
                          <span key={j} className="px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: b.color }}>{b.name} {b.price}</span>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#86868b]">{t.insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">ASP趋势对比</h3>
                <p className="text-[10px] text-[#86868b] mb-5">2024-2026各品牌均价走势 · Momcozy逆势上行</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                    <LineChart data={aspTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Line type="monotone" dataKey="momcozy" stroke="#C25B6E" strokeWidth={3} dot={{ r: 3 }} name="Momcozy" />
                      <Line type="monotone" dataKey="medela" stroke="#34c759" strokeWidth={1.5} dot={false} name="Medela" />
                      <Line type="monotone" dataKey="willow" stroke="#ff9500" strokeWidth={1.5} dot={false} name="Willow" />
                      <Line type="monotone" dataKey="elvie" stroke="#5856d6" strokeWidth={1.5} dot={false} name="Elvie" />
                      <Line type="monotone" dataKey="industry" stroke="#86868b" strokeWidth={1} strokeDasharray="5 5" dot={false} name="行业平均" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 p-3 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                  <p className="text-[10px] text-[#C25B6E] font-medium mb-1">定价策略洞察</p>
                  <p className="text-[10px] text-[#86868b] leading-relaxed">Momcozy ASP从$112→$162(+45%)，而Elvie/Willow因竞争压力降价。核心策略：以"价值定价"替代"低价渗透"——M9通过医院级定位支撑$199价位，W1以加热创新支撑$219。对标行业平均$208仍低22%，保留涨价空间。</p>
                </div>
              </div>
            </div>

            {/* 促销定价日历 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">2026年促销定价日历</h3>
              <p className="text-[10px] text-[#86868b] mb-5">Momcozy全年促销节奏与竞品对标 · Brand Day为核心自有IP</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { event: 'Prime Day (7月)', discount: '30% OFF', channel: 'Amazon', featured: 'M5/M9', insight: '对标Amazon大促·流量最大化' },
                  { event: 'Brand Day (9-10月)', discount: '套装22%OFF', channel: '品牌官网', featured: '全品类', insight: '自有IP"Cozy by You"·DTC导流' },
                  { event: 'Black Friday (11月)', discount: '25% OFF', channel: '全渠道', featured: 'M5/KleanPal', insight: '全年最大转化窗口' },
                  { event: 'Mother\'s Day (5月)', discount: '20%+满减', channel: '官网+Amazon', featured: 'M9/文胸', insight: 'Mom Kit套装策略·客单提升' },
                ].map((e, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-[#C25B6E]" />
                      <span className="text-xs font-semibold text-[#1d1d1f]">{e.event}</span>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between"><span className="text-[#86868b]">折扣</span><span className="text-[#C25B6E] font-medium">{e.discount}</span></div>
                      <div className="flex justify-between"><span className="text-[#86868b]">渠道</span><span className="text-[#1d1d1f]">{e.channel}</span></div>
                      <div className="flex justify-between"><span className="text-[#86868b]">主推</span><span className="text-[#1d1d1f]">{e.featured}</span></div>
                      <p className="text-[#86868b] mt-1 pt-1 border-t border-[#EDE6DF]">{e.insight}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-xl bg-[#34c759]/5 border border-[#34c759]/10">
                <p className="text-[10px] text-[#34c759] font-medium mb-1">套装定价策略洞察</p>
                <p className="text-[10px] text-[#86868b] leading-relaxed">Momcozy采用"组合拳"提升客单：Mom Kit(买3件非文胸22%OFF)+Bra Kit(4件30%OFF)+Spend&Save($480减$105)。DTC渠道套装客单可达$350+，较单品ASP提升116%。对标Medela缺乏套装策略、Willow依赖单硬件销售，Momcozy的交叉销售体系是独特优势。</p>
              </div>
            </div>
            {/* R23: 定价策略下一步行动 */}
            <div className="bg-gradient-to-r from-[#C25B6E]/5 to-[#FBF8F5] rounded-2xl p-5 card-shadow-sm border border-[#C25B6E]/15">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-[#C25B6E]" />
                <h3 className="text-sm font-semibold text-[#C25B6E]">定价策略 · 下一步行动</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF]">
                  <span className="text-[9px] text-[#ff3b30] font-bold">Q2 2026</span>
                  <p className="text-[11px] text-[#1d1d1f] mt-1">W1加热款$219首发，配套"早鸟$189"限时价，首月目标5,000台</p>
                </div>
                <div className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF]">
                  <span className="text-[9px] text-[#ff9500] font-bold">Q3 2026</span>
                  <p className="text-[11px] text-[#1d1d1f] mt-1">M5 Ultra静音版$179防御Medela Melody，Prime Day 25% OFF</p>
                </div>
                <div className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF]">
                  <span className="text-[9px] text-[#34c759] font-bold">Q4 2026</span>
                  <p className="text-[11px] text-[#1d1d1f] mt-1">Brand Day套装策略升级，Mom Kit客单目标$400+，DTC占比30%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PLACE */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'place' && (
          <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { l: '覆盖国家', v: '60+', sub: '4大区域核心', c: '#C25B6E', icon: <Globe className="w-4 h-4" /> },
                { l: '线下零售', v: '8家', sub: 'Target/Walmart/Boots', c: '#ff9500', icon: <ShoppingCart className="w-4 h-4" /> },
                { l: 'DTC增速', v: '+32%', sub: '官网年增长', c: '#34c759', icon: <TrendingUp className="w-4 h-4" /> },
                { l: 'TikTok Shop', v: '+68%', sub: '增速最快渠道', c: '#5856d6', icon: <Zap className="w-4 h-4" /> },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.c}15`, color: s.c }}>{s.icon}</div>
                    <span className="text-xs text-[#86868b]">{s.l}</span>
                  </div>
                  <p className="text-2xl font-semibold" style={{ color: s.c }}>{s.v}</p>
                  <p className="text-[10px] text-[#86868b]">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* 渠道效率矩阵 + 区域渠道 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 渠道效率气泡图 */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">渠道效率矩阵</h3>
                <p className="text-[10px] text-[#86868b] mb-5">X轴=品牌控制力(%) · Y轴=毛利率(%) · 气泡=营收份额 · 理想区域=右上</p>
                <div className="h-72 relative">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                    <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis type="number" dataKey="control" name="控制力" unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <YAxis type="number" dataKey="margin" name="毛利率" unit="%" domain={[0, 60]} tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <ZAxis type="number" dataKey="size" range={[100, 1000]} />
                      <Tooltip content={({ payload }) => {
                        if (!payload?.[0]) return null; const d = payload[0].payload;
                        return <div className="bg-white rounded-xl p-3 shadow-lg border border-[#EDE6DF] text-xs"><p className="font-semibold text-[#1d1d1f]">{d.channel}</p><p className="text-[#86868b]">份额{d.revenue}% · 毛利{d.margin}% · 增长+{d.growth}%</p></div>;
                      }} />
                      <Scatter data={channelMatrix} fill="#C25B6E" />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-[#34c759]/10 text-[#34c759] font-medium">战略重心→</div>
                </div>
              </div>

              {/* 区域渠道 */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">区域渠道结构对比</h3>
                <div className="space-y-4">
                  {regionChannels.map((r, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[#1d1d1f]">{r.region}</span>
                        <span className="text-[10px] text-[#86868b]">核心:{r.key}</span>
                      </div>
                      <div className="flex h-4 rounded-full overflow-hidden">
                        <div style={{ width: `${r.amazon}%`, backgroundColor: '#C25B6E' }} />
                        <div style={{ width: `${r.dtc}%`, backgroundColor: '#34c759' }} />
                        <div style={{ width: `${r.retail}%`, backgroundColor: '#ff9500' }} />
                        <div style={{ width: `${r.social}%`, backgroundColor: '#5856d6' }} />
                        <div style={{ width: `${r.other}%`, backgroundColor: '#86868b' }} />
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-[9px]">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C25B6E]" />Amazon {r.amazon}%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#34c759]" />DTC {r.dtc}%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff9500]" />零售 {r.retail}%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#5856d6]" />社商 {r.social}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl bg-[#5856d6]/5 border border-[#5856d6]/10">
                  <p className="text-[10px] text-[#5856d6] font-medium mb-1">渠道策略洞察</p>
                  <p className="text-[10px] text-[#86868b] leading-relaxed">亚太区TikTok Shop占比45%(社媒电商主导)，北美Amazon 38%+DTC 28%(平台+DTC双轮)，欧洲零售28%最高(Boots/MediaWorld线下渗透)。战略方向：提升DTC占比至30%+，降低Amazon依赖至30%以下。</p>
                </div>
              </div>
            </div>

            {/* 线下零售布局 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">线下零售战略布局</h3>
              <p className="text-[10px] text-[#86868b] mb-5">从DTC→全渠道零售的渐进式扩张路径</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { retailer: 'Target', type: '美国连锁', status: '已入驻', detail: 'S9 Pro/S12 Pro线上目录2023.10', penetration: '中等', color: '#C25B6E' },
                  { retailer: 'Walmart', type: '美国连锁', status: '已入驻', detail: 'S9 Pro+储奶袋 2023.12起售', penetration: '较高', color: '#ff9500' },
                  { retailer: 'Babylist', type: '母婴 registry', status: '核心渠道', detail: 'S9 Pro/S12 Pro/M5/YN08全系列', penetration: '高', color: '#34c759' },
                  { retailer: 'Boots', type: '英国药妆', status: '欧洲核心', detail: '英国+爱尔兰门店覆盖', penetration: '高', color: '#5856d6' },
                  { retailer: 'MediaWorld', type: '意大利电子', status: '已入驻', detail: '占婴儿护理区80% SKU(24/30)', penetration: '很高', color: '#af52de' },
                  { retailer: 'Currys', type: '英国电子', status: '已入驻', detail: '英国最大电子零售商线上', penetration: '中', color: '#86868b' },
                  { retailer: 'TikTok Shop', type: '社交电商', status: '高速增长', detail: '东南亚+北美同步扩张', penetration: '快速增长', color: '#ff3b30' },
                  { retailer: 'Shopee', type: '东南亚电商', status: '区域核心', detail: '新加坡/马来/印尼/泰国/菲', penetration: '高', color: '#ff9500' },
                ].map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#1d1d1f]">{r.retailer}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${r.color}15`, color: r.color }}>{r.status}</span>
                    </div>
                    <p className="text-[10px] text-[#86868b] mb-1">{r.type} · 渗透:{r.penetration}</p>
                    <p className="text-[10px] text-[#86868b]">{r.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/10">
                <p className="text-[10px] text-[#ff9500] font-medium mb-1">O2M(Online-to-Multi-channel)战略洞察</p>
                <p className="text-[10px] text-[#86868b] leading-relaxed">Momcozy渠道战略三阶段：①2018-2022 DTC+Amazon积累品牌(线上100%)→②2023-2024 入驻Target/Walmart/Boots开启线下(线下15%)→③2025-2026 全渠道融合+DTC优先(DTC目标30%)。MediaWorld案例尤为成功——占婴儿护理区80% SKU(24/30)，验证了"线上品牌反哺线下零售"模式。风险点：Amazon占比38%过高(平台依赖风险)，需加速TikTok Shop+DTC分流。</p>
              </div>
            </div>
            {/* R24: 渠道优化下一步行动 */}
            <div className="bg-gradient-to-r from-[#5856d6]/5 to-[#FBF8F5] rounded-2xl p-5 card-shadow-sm border border-[#5856d6]/15">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-[#5856d6]" />
                <h3 className="text-sm font-semibold text-[#5856d6]">渠道优化 · 下一步行动</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF]">
                  <span className="text-[9px] text-[#ff3b30] font-bold">Q2 2026</span>
                  <p className="text-[11px] text-[#1d1d1f] mt-1">TikTok Shop北美开通，目标占比8%；欧洲Boots渠道SKU扩至30+</p>
                </div>
                <div className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF]">
                  <span className="text-[9px] text-[#ff9500] font-bold">Q3 2026</span>
                  <p className="text-[11px] text-[#1d1d1f] mt-1">DTC官网GMV目标+32%，Amazon占比降至35%以下</p>
                </div>
                <div className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF]">
                  <span className="text-[9px] text-[#34c759] font-bold">Q4 2026</span>
                  <p className="text-[11px] text-[#1d1d1f] mt-1">MediaWorld模式复制至法国Fnac，东南亚Shopee旗舰店升级</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PROMOTION */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'promotion' && (
          <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { l: '创作者网络', v: '75K+', sub: '全球达人合作', c: '#C25B6E', icon: <Users className="w-4 h-4" /> },
                { l: '社区成员', v: '270万', sub: '全球妈妈社区', c: '#ff9500', icon: <Heart className="w-4 h-4" /> },
                { l: 'USA TODAY', v: '5星', sub: 'Most Trusted 2026', c: '#34c759', icon: <Star className="w-4 h-4" /> },
                { l: '整体ROAS', v: '6.4:1', sub: 'Retail行业基准', c: '#5856d6', icon: <TrendingUp className="w-4 h-4" /> },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.c}15`, color: s.c }}>{s.icon}</div>
                    <span className="text-xs text-[#86868b]">{s.l}</span>
                  </div>
                  <p className="text-2xl font-semibold" style={{ color: s.c }}>{s.v}</p>
                  <p className="text-[10px] text-[#86868b]">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* 4M模型 + 社媒数据 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 4M影响者模型 */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">4M影响者营销框架</h3>
                  <button onClick={() => exportToCsv(fourMData, { stage: "阶段", metric: "指标", kpi: "KPI", tool: "工具", insight: "洞察" }, "4M营销框架_" + new Date().toISOString().slice(0, 10))} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all"><Download className="w-3 h-3"/>导出</button>
                </div>
                <p className="text-[10px] text-[#86868b] mb-5">Mission→Messaging→Marketplace→Measurement完整链路</p>
                <div className="space-y-4">
                  {fourMData.map((m, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] border-l-3" style={{ borderLeft: `3px solid ${['#C25B6E', '#34c759', '#ff9500', '#5856d6'][i]}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color: ['#C25B6E', '#34c759', '#ff9500', '#5856d6'][i] }}>{i + 1}. {m.stage}</span>
                        <span className="text-xs font-bold text-[#1d1d1f]">{m.kpi}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#86868b]">指标:{m.metric} · 工具:{m.tool}</span>
                      </div>
                      <p className="text-[10px] text-[#B5AFA8] mt-1.5 leading-relaxed">{m.insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 社媒平台数据 */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">社媒平台效能矩阵</h3>
                <div className="space-y-4">
                  {socialData.map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-xs font-semibold text-[#1d1d1f]">{s.platform}</span>
                          <span className="text-[10px] text-[#86868b]">{s.followers}粉丝</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#34c759]/10 text-[#34c759] font-medium">ROAS {s.roas}x</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center mb-1.5">
                        <div><p className="text-xs font-medium text-[#1d1d1f] truncate">{s.engagement}%</p><p className="text-[9px] text-[#86868b]">互动率</p></div>
                        <div><p className="text-xs font-medium text-[#34c759]">+{s.growth}%</p><p className="text-[9px] text-[#86868b]">增长</p></div>
                        <div><p className="text-xs font-medium text-[#C25B6E]">{s.leads.toLocaleString()}</p><p className="text-[9px] text-[#86868b]">线索</p></div>
                      </div>
                      <div className="h-1.5 bg-white rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(s.roas / 6) * 100}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 品牌信任金字塔 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">Momcozy品牌信任金字塔</h3>
              <p className="text-[10px] text-[#86868b] mb-5">从权威认证→专家背书→社区口碑→用户共创四层信任体系</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 权威认证层 */}
                <div className="p-4 rounded-2xl border-2 border-[#C25B6E]/20 bg-gradient-to-b from-[#C25B6E]/5 to-transparent">
                  <div className="w-8 h-8 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center mb-2"><Award className="w-4 h-4 text-[#C25B6E]" /></div>
                  <p className="text-xs font-semibold text-[#C25B6E] mb-2">权威认证层</p>
                  <div className="space-y-1.5 text-[10px]">
                    {['USA TODAY 5星 (2026)', 'Newsweek #3信任品牌 (2026)', 'Red Dot设计大奖', 'Grand View Research Research #1份额'].map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3 text-[#34c759] flex-shrink-0" /><span className="text-[#86868b]">{t}</span></div>
                    ))}
                  </div>
                </div>
                {/* 专家背书层 */}
                <div className="p-4 rounded-2xl border-2 border-[#34c759]/20 bg-gradient-to-b from-[#34c759]/5 to-transparent">
                  <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 flex items-center justify-center mb-2"><Users className="w-4 h-4 text-[#34c759]" /></div>
                  <p className="text-xs font-semibold text-[#34c759] mb-2">专家背书层</p>
                  <div className="space-y-1.5 text-[10px]">
                    {['Medical Advisory Board (MAB)', 'Dr. Fran Haydanek (医学顾问)', 'IBCLC认证泌乳顾问合作', 'Latham Thomas (Mama Glow)', 'Mothers United Bus Tour'].map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3 text-[#34c759] flex-shrink-0" /><span className="text-[#86868b]">{t}</span></div>
                    ))}
                  </div>
                </div>
                {/* 社区口碑层 */}
                <div className="p-4 rounded-2xl border-2 border-[#ff9500]/20 bg-gradient-to-b from-[#ff9500]/5 to-transparent">
                  <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 flex items-center justify-center mb-2"><Heart className="w-4 h-4 text-[#ff9500]" /></div>
                  <p className="text-xs font-semibold text-[#ff9500] mb-2">社区口碑层</p>
                  <div className="space-y-1.5 text-[10px]">
                    {['270万全球社区成员', '"More Than Pumping"活动IP', 'Black Breastfeeding Week', '"Build Your Feeding Village"', 'Becca Kufrin品牌大使'].map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3 text-[#34c759] flex-shrink-0" /><span className="text-[#86868b]">{t}</span></div>
                    ))}
                  </div>
                </div>
                {/* 用户共创层 */}
                <div className="p-4 rounded-2xl border-2 border-[#5856d6]/20 bg-gradient-to-b from-[#5856d6]/5 to-transparent">
                  <div className="w-8 h-8 rounded-xl bg-[#5856d6]/10 flex items-center justify-center mb-2"><Zap className="w-4 h-4 text-[#5856d6]" /></div>
                  <p className="text-xs font-semibold text-[#5856d6] mb-2">用户共创层</p>
                  <div className="space-y-1.5 text-[10px]">
                    {['"Cozy by You" Brand Day UGC', '75K+创作者合作计划', 'Influencer Rewards Program', 'Mystery Box互动营销', 'Lucky Spin Wheel游戏化'].map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3 text-[#34c759] flex-shrink-0" /><span className="text-[#86868b]">{t}</span></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                <p className="text-[10px] text-[#C25B6E] font-medium mb-1">品牌信任策略洞察</p>
                <p className="text-[10px] text-[#86868b] leading-relaxed">Momcozy的信任构建遵循"自上而下"路径：先用权威认证(USA TODAY 5星/Newsweek #3)建立基线信任→MAB医疗顾问委员会提供专业背书→"More Than Pumping"社区活动将信任转化为情感连接→"Cozy by You"UGC计划让用户成为品牌共创者。四层体系形成闭环：认证解决"为什么信你"，专家解决"专业人士怎么看"，社区解决"其他妈妈怎么说"，共创解决"我和你是什么关系"。对标竞品：Medela依赖医院渠道(专业但冷漠)，Willow依赖保险渠道(交易导向)，Momcozy的"情感+专业"双螺旋是差异化优势。</p>
              </div>
            </div>

            {/* 关键营销活动 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">2025-2026关键营销活动复盘</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'More Than Pumping', time: '2025.8 母乳喂养月', type: 'IP化内容营销', partner: 'Mama Glow+IBCLC', result: '4场 webinar+Digital Toolkit+Black Breastfeeding Week', insight: '从"卖产品"到"建社区"的转型标志，情感连接>硬广转化' },
                  { name: 'Cozy by You Brand Day', time: '2026.9-10', type: '自有IP大促', partner: 'UGC创作者+社区', result: '套装22%OFF+线下活动+TV Campaign', insight: '对标Amazon Prime Day的自有流量池构建，降低平台依赖' },
                  { name: 'Mothers United Bus Tour', time: '2025.8起', type: '线下体验营销', partner: 'Summer Streets NYC', result: 'Mommy Meditation+产品体验+社区连接', insight: '线上品牌"实体化"的尝试，弥补DTC缺乏线下体验的短板' },
                ].map((c, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-[#EDE6DF]">
                    <div className="flex items-center gap-2 mb-2">
                      <Megaphone className="w-4 h-4 text-[#C25B6E]" />
                      <span className="text-xs font-semibold text-[#1d1d1f]">{c.name}</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-[#86868b] mb-2">
                      <p><span className="text-[#C25B6E]">时间:</span> {c.time}</p>
                      <p><span className="text-[#C25B6E]">类型:</span> {c.type}</p>
                      <p><span className="text-[#C25B6E]">合作:</span> {c.partner}</p>
                      <p><span className="text-[#C25B6E]">成果:</span> {c.result}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FBF8F5]">
                      <p className="text-[10px] text-[#86868b]"><span className="text-[#C25B6E] font-medium">洞察:</span> {c.insight}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* R25: 营销ROI优化下一步行动 */}
            <div className="bg-gradient-to-r from-[#af52de]/5 to-[#FBF8F5] rounded-2xl p-5 card-shadow-sm border border-[#af52de]/15">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="w-4 h-4 text-[#af52de]" />
                <h3 className="text-sm font-semibold text-[#af52de]">营销ROI优化 · 下一步行动</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF]">
                  <span className="text-[9px] text-[#ff3b30] font-bold">Q2 2026</span>
                  <p className="text-[11px] text-[#1d1d1f] mt-1">TikTok ROAS目标5.5x(当前5.2x)，新增母婴微达人500+，内容库扩至10K条</p>
                </div>
                <div className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF]">
                  <span className="text-[9px] text-[#ff9500] font-bold">Q3 2026</span>
                  <p className="text-[11px] text-[#1d1d1f] mt-1">Brand Day TV Campaign首投，MAB医疗顾问内容系列上线，信任度目标92+</p>
                </div>
                <div className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF]">
                  <span className="text-[9px] text-[#34c759] font-bold">Q4 2026</span>
                  <p className="text-[11px] text-[#1d1d1f] mt-1">UGC共创计划2.0：目标200K UGC视频，整体ROAS提升至7.0x</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
