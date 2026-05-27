import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { TrendingUp, Shield, Cpu, Users, Scale, Zap, Globe, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const pestData = {
  P: [
    { factor: '北美保险覆盖', impact: 85, trend: 'up', desc: '美国Affordable Care Act要求保险覆盖吸奶器，推动市场增长' },
    { factor: '欧盟MDR法规', impact: 72, trend: 'up', desc: 'MDR 2017/745过渡期延至2027-2028，合规壁垒提高' },
    { factor: '中国生育政策', impact: 65, trend: 'neutral', desc: '三孩政策+育儿补贴，但生育率持续下降至6.39‰' },
    { factor: 'FDA 510(k)路径', impact: 78, trend: 'up', desc: 'Class II器械审批标准化，Momcozy已获7+许可' },
    { factor: '母乳喂养推广', impact: 90, trend: 'up', desc: 'CDC/WHO/ABM全球推广，83.2%美国婴儿起始母乳喂养' },
  ],
  E: [
    { factor: '全球女性就业率', impact: 88, trend: 'up', desc: '67%增长驱动便携吸奶器需求，职业母亲核心客群' },
    { factor: '可支配收入增长', impact: 70, trend: 'up', desc: '中产家庭扩大，亚太/拉美增速最快' },
    { factor: '汇率波动', impact: 55, trend: 'down', desc: '美元强势影响非美市场定价策略' },
    { factor: '原材料成本', impact: 62, trend: 'up', desc: 'LSR硅胶+3.2%，锂电池+5.8%，成本压力传导' },
    { factor: '电商渗透', impact: 82, trend: 'up', desc: '线上渠道占58%，DTC模式降低中间成本' },
  ],
  S: [
    { factor: '母乳喂养意识', impact: 92, trend: 'up', desc: '全球母乳喂养率提升，WHO推荐前6月纯母乳' },
    { factor: '晚育趋势', impact: 75, trend: 'up', desc: '高龄产妇增加，对高品质吸奶器需求更强' },
    { factor: '职场母乳支持', impact: 68, trend: 'up', desc: '企业设置哺乳室/灵活工时，间接推动吸奶器使用' },
    { factor: '环保意识', impact: 60, trend: 'up', desc: 'BPA-free/可降解材料需求增长，欧洲71%家长偏好有机' },
    { factor: '社交媒体影响', impact: 78, trend: 'up', desc: 'TikTok/小红书母婴KOL驱动品牌认知和购买决策' },
  ],
  T: [
    { factor: 'APP智能互联', impact: 88, trend: 'up', desc: '蓝牙+APP控制成标配，实时追踪奶量/吸力模式' },
    { factor: '静音技术', impact: 82, trend: 'up', desc: '<40dB成为核心差异化，37%制造商推出更静音系统' },
    { factor: '电池续航', impact: 75, trend: 'up', desc: '锂离子技术提升26%续航，便携式设计dominate' },
    { factor: 'UV-C消毒', impact: 65, trend: 'up', desc: '医院级UV-C技术下沉家用，消毒器CAGR 7.0%' },
    { factor: 'AI个性化', impact: 58, trend: 'up', desc: 'AI吸力模式自适应，K+J 2026主题"Growing with AI"' },
  ],
};

const porterForces = [
  { factor: '现有竞争者 rivalry', score: 78, fullMark: 100, desc: 'Medela/Philips/Willow/Momcozy四强争霸，IP诉讼频繁' },
  { factor: '新进入者威胁', score: 55, fullMark: 100, desc: 'FDA/CE准入壁垒高，但DTC电商降低渠道门槛' },
  { factor: '替代品威胁', score: 35, fullMark: 100, desc: '手动吸奶/直接哺乳为替代，但便利性差距大' },
  { factor: '供应商议价力', score: 60, fullMark: 100, desc: 'LSR硅胶/锂电池供应商集中，成本传导能力强' },
  { factor: '买家议价力', score: 72, fullMark: 100, desc: '消费者比价透明，保险报销影响价格敏感度' },
];

const techTrendData = [
  { year: '2020', 智能APP: 22, 静音技术: 35, 便携穿戴: 45, UV消毒: 15, AI个性化: 5 },
  { year: '2021', 智能APP: 28, 静音技术: 40, 便携穿戴: 50, UV消毒: 18, AI个性化: 8 },
  { year: '2022', 智能APP: 35, 静音技术: 48, 便携穿戴: 55, UV消毒: 22, AI个性化: 12 },
  { year: '2023', 智能APP: 45, 静音技术: 55, 便携穿戴: 62, UV消毒: 28, AI个性化: 18 },
  { year: '2024', 智能APP: 55, 静音技术: 62, 便携穿戴: 70, UV消毒: 35, AI个性化: 25 },
  { year: '2025', 智能APP: 65, 静音技术: 70, 便携穿戴: 78, UV消毒: 42, AI个性化: 35 },
  { year: '2026(E)', 智能APP: 75, 静音技术: 78, 便携穿戴: 85, UV消毒: 50, AI个性化: 48 },
];

const consumerTrend = [
  { segment: '职业母亲', pct: 42, growth: 12, need: '便携+静音+长续航', color: '#C25B6E' },
  { segment: '全职妈妈', pct: 28, growth: 6, need: '性价比+多功能', color: '#34c759' },
  { segment: '高龄产妇', pct: 15, growth: 18, need: '医院级+智能控制', color: '#ff9500' },
  { segment: '双职工家庭', pct: 10, growth: 22, need: '穿戴式+APP', color: '#af52de' },
  { segment: '医院/机构', pct: 5, growth: 8, need: '批量采购+耐用', color: '#5856d6' },
];

const marketCycle = [
  { stage: '导入期', desc: '2015-2018', features: '穿戴式概念出现', status: 'done' },
  { stage: '成长期', desc: '2019-2023', features: 'Momcozy/Medela/Willow竞争', status: 'done' },
  { stage: '快速扩张', desc: '2024-2026', features: '智能APP+静音技术普及', status: 'current' },
  { stage: '成熟期', desc: '2027-2030', features: '市场整合+AI差异化', status: 'future' },
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

export default function MarketTrend() {
  const [pestTab, setPestTab] = useState<'P' | 'E' | 'S' | 'T'>('P');
  const pestLabels = { P: '政策 Political', E: '经济 Economic', S: '社会 Social', T: '技术 Technology' };
  const pestColors = { P: '#C25B6E', E: '#5856d6', S: '#34c759', T: '#ff9500' };
  const pestIcons = { P: <Scale className="w-4 h-4" />, E: <DollarSign className="w-4 h-4" />, S: <Users className="w-4 h-4" />, T: <Cpu className="w-4 h-4" /> };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#5856d6] flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">大盘趋势</h1>
                  <p className="text-xs text-[#86868b]">PEST分析 · 波特五力 · 技术趋势 · 消费者画像 · 市场周期</p>
                </div>
              </div>
            </div>

            {/* PEST Analysis */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center"><Globe className="w-4 h-4 text-[#C25B6E]" strokeWidth={2} /></div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">PEST 宏观环境分析</h3>
              </div>
              <div className="flex items-center gap-1 mb-5 flex-wrap">
                {(Object.keys(pestLabels) as Array<'P' | 'E' | 'S' | 'T'>).map((k) => (
                  <button key={k} onClick={() => setPestTab(k)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${pestTab === k ? 'text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}
                    style={pestTab === k ? { backgroundColor: pestColors[k] } : {}}>
                    <span className="flex items-center gap-1.5">{pestIcons[k]}{pestLabels[k]}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {pestData[pestTab].map((f, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[#FBF8F5]">
                    <div className="flex-1 min-w-0 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#1d1d1f]">{f.factor}</span>
                        <span className={`text-[10px] flex items-center gap-0.5 ${f.trend === 'up' ? 'text-[#34c759]' : f.trend === 'down' ? 'text-[#ff3b30]' : 'text-[#86868b]'}`}>
                          {f.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : f.trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : '→'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#86868b]">{f.desc}</p>
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 h-2 rounded-full bg-[#EDE6DF] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${f.impact}%`, backgroundColor: pestColors[pestTab] }} />
                        </div>
                        <span className="text-[10px] font-semibold" style={{ color: pestColors[pestTab] }}>{f.impact}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Porter's Five Forces + Consumer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Porter Radar */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-[#af52de]/10 flex items-center justify-center"><Shield className="w-4 h-4 text-[#af52de]" strokeWidth={2} /></div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">波特五力模型</h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={porterForces} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="#EDE6DF" />
                      <PolarAngleAxis dataKey="factor" tick={{ fontSize: 9, fill: '#86868b' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: '#86868b' }} />
                      <Radar name="竞争强度" dataKey="score" stroke="#C25B6E" fill="#C25B6E" fillOpacity={0.15} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {porterForces.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className="text-[#86868b]">{f.factor}</span>
                      <span className="text-[#1d1d1f] font-medium">{f.score}/100</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consumer Segments */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 flex items-center justify-center"><Users className="w-4 h-4 text-[#34c759]" strokeWidth={2} /></div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">消费者细分画像</h3>
                </div>
                <div className="space-y-4">
                  {consumerTrend.map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-xs font-semibold text-[#1d1d1f]">{s.segment}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#86868b]">{s.pct}%占比</span>
                          <span className="text-[10px] text-[#34c759] font-medium">+{s.growth}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#EDE6DF] overflow-hidden mb-1">
                        <div className="h-full rounded-full" style={{ width: `${s.pct * 2}%`, backgroundColor: s.color }} />
                      </div>
                      <span className="text-[10px] text-[#86868b]">核心需求：{s.need}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Technology Trend */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 flex items-center justify-center"><Zap className="w-4 h-4 text-[#ff9500]" strokeWidth={2} /></div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">技术成熟度曲线（2020-2026E）</h3>
                <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg ml-auto">渗透率 %</span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={techTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="便携穿戴" stackId="1" stroke="#C25B6E" fill="#C25B6E" />
                    <Area type="monotone" dataKey="静音技术" stackId="1" stroke="#34c759" fill="#34c759" />
                    <Area type="monotone" dataKey="智能APP" stackId="1" stroke="#5856d6" fill="#5856d6" />
                    <Area type="monotone" dataKey="UV消毒" stackId="1" stroke="#af52de" fill="#af52de" />
                    <Area type="monotone" dataKey="AI个性化" stackId="1" stroke="#ff9500" fill="#ff9500" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Market Lifecycle */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-[#C25B6E]" strokeWidth={2} /></div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">吸奶器市场生命周期</h3>
              </div>
              <div className="flex items-center gap-0">
                {marketCycle.map((c, i) => (
                  <div key={i} className={`flex-1 relative ${i > 0 ? 'pl-4' : ''}`}>
                    {i > 0 && <div className="absolute left-0 top-1/2 w-4 h-[2px] bg-[#EDE6DF] -translate-y-1/2" />}
                    <div className={`p-3 rounded-xl border ${c.status === 'current' ? 'border-[#C25B6E] ring-1 ring-[#C25B6E]/20 bg-[#FBF8F5]' : 'border-[#EDE6DF] bg-white'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${c.status === 'done' ? 'bg-[#34c759]' : c.status === 'current' ? 'bg-[#C25B6E] animate-pulse' : 'bg-[#86868b]/30'}`} />
                        <span className="text-xs font-semibold text-[#1d1d1f]">{c.stage}</span>
                      </div>
                      <p className="text-[10px] text-[#C25B6E] font-medium">{c.desc}</p>
                      <p className="text-[10px] text-[#86868b] mt-0.5">{c.features}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '全球CAGR', value: '8.52%', sub: '2025-2035', color: '#C25B6E' },
                { label: '智能APP渗透率', value: '65%', sub: '2025年', color: '#5856d6' },
                { label: '穿戴式占比', value: '78%', sub: '2025年', color: '#ff9500' },
                { label: '职业母亲驱动', value: '67%', sub: '就业增长', color: '#34c759' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <p className="text-[10px] text-[#86868b] mb-1">{s.label}</p>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-[#86868b]">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
