// ═══════════════════════════════════════════════════════════════════
// ChannelInterviews.tsx — 渠道合作伙伴深度访谈
// 行业最佳实践：B2B深度访谈 + 渠道健康度评分 + 合作深度矩阵
// 6个AI智能体协同完成渠道调研、分析、策略输出
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter
} from 'recharts';
import {
  Store, TrendingUp, DollarSign, Star, MapPin, ShieldCheck, AlertTriangle,
  Lightbulb, Target, Handshake, ChevronDown, ChevronUp, Download, Zap
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import InterviewAgents from '@/components/InterviewAgents';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import { exportToCsv } from '@/utils/csvExport';

// ─── 渠道销售表现 ───
const channelPerformance = [
  { channel: 'Amazon US', sales: 42, growth: 18, satisfaction: 4.5, margin: 22, health: 92, cooperation: 5, strategic: '核心渠道' },
  { channel: 'Momcozy官网', sales: 23, growth: 32, satisfaction: 4.8, margin: 48, health: 95, cooperation: 5, strategic: '战略重点' },
  { channel: 'Target', sales: 12, growth: 8, satisfaction: 4.2, margin: 18, health: 78, cooperation: 4, strategic: '线下标杆' },
  { channel: 'Walmart', sales: 8, growth: 15, satisfaction: 4.0, margin: 15, health: 72, cooperation: 3, strategic: '大众渗透' },
  { channel: 'TikTok Shop', sales: 6, growth: 85, satisfaction: 4.3, margin: 32, health: 88, cooperation: 4, strategic: '增长引擎' },
  { channel: 'Buy Buy Baby', sales: 4, growth: -5, satisfaction: 3.6, margin: 12, health: 45, cooperation: 2, strategic: '观察调整' },
  { channel: 'Shopee SEA', sales: 3, growth: 62, satisfaction: 4.0, margin: 28, health: 82, cooperation: 3, strategic: '亚太突破' },
  { channel: 'Boots UK', sales: 2, growth: 22, satisfaction: 4.1, margin: 20, health: 75, cooperation: 3, strategic: '欧洲试点' },
];

// ─── 渠道类型分布 ───
const channelTypeDist = [
  { name: '电商平台', value: 55, color: '#C25B6E' },
  { name: '品牌官网DTC', value: 23, color: '#34c759' },
  { name: '社交电商', value: 9, color: '#af52de' },
  { name: '线下零售', value: 8, color: '#ff9500' },
  { name: '母婴连锁', value: 5, color: '#5856d6' },
];

// ─── 渠道健康度雷达 ───
const healthRadar = [
  { dimension: '销售贡献', amazon: 95, dtc: 65, tiktok: 35, target: 45, fullMark: 100 },
  { dimension: '增长速度', amazon: 55, dtc: 90, tiktok: 98, target: 30, fullMark: 100 },
  { dimension: '利润率', amazon: 35, dtc: 95, tiktok: 55, target: 28, fullMark: 100 },
  { dimension: '合作深度', amazon: 90, dtc: 98, tiktok: 60, target: 55, fullMark: 100 },
  { dimension: '品牌控制', amazon: 25, dtc: 98, tiktok: 50, target: 40, fullMark: 100 },
  { dimension: '用户数据', amazon: 20, dtc: 95, tiktok: 45, target: 35, fullMark: 100 },
  { dimension: '满意度', amazon: 88, dtc: 95, tiktok: 82, target: 78, fullMark: 100 },
  { dimension: '战略契合', amazon: 75, dtc: 98, tiktok: 90, target: 65, fullMark: 100 },
];

// ─── 合作深度-战略重要性矩阵（BCG风格） ───
const cooperationMatrix = [
  { channel: 'Amazon US', x: 95, y: 92, size: 420, label: '金牛' },
  { channel: 'Momcozy DTC', x: 98, y: 95, size: 230, label: '明星' },
  { channel: 'TikTok Shop', x: 60, y: 88, size: 60, label: '问题' },
  { channel: 'Target', x: 55, y: 78, size: 120, label: '金牛' },
  { channel: 'Shopee SEA', x: 35, y: 82, size: 30, label: '问题' },
  { channel: 'Walmart', x: 45, y: 65, size: 80, label: '瘦狗' },
  { channel: 'Boots UK', x: 40, y: 72, size: 20, label: '瘦狗' },
  { channel: 'Buy Buy Baby', x: 25, y: 35, size: 40, label: '瘦狗' },
];

// ─── 深度访谈记录 ───
const interviews = [
  {
    id: 1, channel: 'Amazon US', role: '类目经理', location: 'Seattle, US', years: 6, health: 92,
    quote: 'Momcozy is one of the fastest-growing brands in our Breast Feeding category. Their M5 consistently ranks in top 3 best sellers. Return rate is below 3% which is excellent for this category. We see 40% of their sales coming from Subscribe & Save now.',
    quoteCN: 'Momcozy是我们哺乳品类增长最快的品牌之一。M5 consistently 位列畅销榜前三。退货率低于3%，非常优秀。目前40%的销售来自Subscribe & Save复购。',
    insights: ['M5在Amazon哺乳品类长期Top 3', '退货率仅3%，远低于品类平均8%', 'Subscribe & Save复购率达40%', 'A+内容转化率提升25%'],
    challenges: ['Amazon佣金费率持续上升(15%→17%)', '竞品价格战激烈，CPC成本+30%', 'FBA仓储限制影响旺季备货', '品牌注册2.0审核趋严'],
    strategies: ['优化Subscribe & Save折扣梯度', '加大品牌关键词防御性投放', '提前90天备货到FBA', '申请Amazon Live直播资源'],
    rating: 5, date: '样例访谈日 2026-05-23', duration: '55min', method: '视频会议+数据看板共享',
  },
  {
    id: 2, channel: 'Target', role: '采购总监', location: 'Minneapolis, US', years: 8, health: 78,
    quote: 'We added Momcozy to our baby care aisle in 2024. Sales exceeded projections by 40% in the first quarter. Customers especially love the wearable design. We are considering an exclusive color variant for Target.',
    quoteCN: '2024年将Momcozy引入婴儿护理区。首季度销售额超出预期40%。消费者特别喜欢可穿戴设计。我们正在考虑Target独家配色。',
    insights: ['首季度销售超目标40%', '可穿戴设计在Target用户中接受度高', '独家配色可提升差异化', '店内体验转化率达65%'],
    challenges: ['线下陈列空间有限，位置竞争激烈', '需持续教育消费者认识新品牌', '季节性销售波动大(Q4占45%)', '库存周转率要求<30天'],
    strategies: ['推进Target独家款开发', '增加店内体验台投入', 'Q3提前备货应对Q4高峰', '联合Target Circle会员营销'],
    rating: 4, date: '样例访谈日 2026-05-23', duration: '48min', method: '面对面访谈+门店走访',
  },
  {
    id: 3, channel: 'TikTok Shop', role: '运营总监', location: 'Los Angeles, US', years: 3, health: 88,
    quote: 'Momcozy content performs incredibly well on TikTok. Our influencer partnerships drive 3x higher conversion than traditional ads. The M5 unboxing videos consistently go viral. But we need to watch the rising creator costs.',
    quoteCN: 'Momcozy内容在TikTok表现非常好。达人合作转化率是传统广告3倍。M5开箱视频持续走红。但需要关注达人成本上升。',
    insights: ['达人合作转化率是传统广告3倍', 'M5开箱视频持续viral', 'TikTok Shop复购率达28%', '短视频完播率18%(行业平均12%)'],
    challenges: ['达人合作成本快速上升(+45% YoY)', '内容审核政策变化频繁', '退货率略高于其他渠道(6.2%)', '直播时段人力投入大'],
    strategies: ['建立自有达人矩阵降低依赖', '优化内容模板提升审核通过率', '加强产品描述减少退货', '培养内部直播团队'],
    rating: 4, date: '样例访谈日 2026-05-23', duration: '52min', method: '视频会议+后台数据演示',
  },
  {
    id: 4, channel: 'Momcozy官网DTC', role: '电商总监', location: 'Austin, US', years: 5, health: 95,
    quote: 'DTC is our strategic priority. Margin is 48% vs 22% on Amazon. We own the customer data. Klaviyo email flows drive 35% of revenue. The challenge is scaling traffic acquisition efficiently as CAC rises.',
    quoteCN: 'DTC是战略重点。利润率48% vs Amazon 22%。我们拥有用户数据。Klaviyo邮件营销带来35%收入。挑战是CAC上升时如何高效扩展流量。',
    insights: ['DTC利润率48%，为全渠道最高', 'Klaviyo邮件流贡献35%收入', '用户数据完整度100%', ' bundles & cross-sell提升客单价28%'],
    challenges: ['CAC同比上升35%', '流量获取依赖Meta/Google', '支付欺诈率0.8%需控制', '独立站技术维护成本高'],
    strategies: ['加大SEO内容投入降低CAC', '测试Pinterest/Twitter新渠道', '引入欺诈检测工具', '迁移到Headless架构提升性能'],
    rating: 5, date: '样例访谈日 2026-05-23', duration: '60min', method: '面对面访谈+GA4数据分析',
  },
  {
    id: 5, channel: 'Shopee Southeast Asia', role: '区域经理', location: 'Singapore', years: 4, health: 82,
    quote: 'Southeast Asia is booming for mom & baby. Momcozy launched in 6 markets. Thailand and Philippines are top performers. Live streaming sales grew 300% in Q1. We need more localized SKUs for different markets.',
    quoteCN: '东南亚母婴市场爆发。Momcozy已进入6个市场。泰国和菲律宾表现最好。直播销售Q1增长300%。需要更多本地化SKU。',
    insights: ['泰国/菲律宾为Top 2市场', '直播带货Q1增长300%', 'Shopee Mall品牌认证提升信任', '6.6和11.11大促占全年35%销售'],
    challenges: ['各国法规差异大(MDR/TFDA等)', '跨境物流时效不稳定', '本地化客服人力不足', '支付方式多样化需求'],
    strategies: ['各市场独立合规准备', '建立东南亚本地仓', '招聘本地客服团队', '接入 GrabPay/ShopeePay等本地支付'],
    rating: 4, date: '样例访谈日 2026-05-23', duration: '50min', method: '视频会议+区域数据报告',
  },
  {
    id: 6, channel: 'Boots UK', role: '品牌经理', location: 'Nottingham, UK', years: 7, health: 75,
    quote: 'UK mums are quality-conscious and eco-aware. Momcozy needs stronger CE marking visibility and sustainability messaging. The price point is competitive against Medela. We recommend a Boots-exclusive starter bundle.',
    quoteCN: '英国妈妈注重品质和环保。Momcozy需要更强的CE标识和可持续信息。价格相比Medela有竞争力。建议推出Boots独家入门套装。',
    insights: ['CE认证展示提升信任度+18%', '环保包装是UK差异化要素', '入门套装可提升新客转化', 'NHS合作可开辟B2B渠道'],
    challenges: ['Brexit后进口关税增加', 'UKCA认证过渡期复杂', '英国消费者对品牌认知度低', 'MDR合规要求严格'],
    strategies: ['申请UKCA认证', '强化可持续包装故事', '与NHS合作母婴包项目', '加大UK KOL合作投入'],
    rating: 4, date: '样例访谈日 2026-05-23', duration: '45min', method: '视频会议+竞品对比分析',
  },
];

// ─── 渠道策略洞察 ───
const strategyInsights = [
  { type: 'priority', title: 'DTC渠道应加大投入至35%占比', desc: 'DTC利润率48%为全渠道最高，用户数据100%自有，建议SEO+邮件营销双轮驱动', impact: 'P0', icon: <Target className="w-4 h-4" /> },
  { type: 'growth', title: 'TikTok Shop是增长最快渠道(+85%)', desc: '需建立自有达人矩阵降低外部依赖，同时培养内部直播团队', impact: 'P1', icon: <Zap className="w-4 h-4" /> },
  { type: 'risk', title: 'Amazon佣金上升至17%挤压利润', desc: '需通过Subscribe & Save和品牌防御投放巩固核心地位', impact: 'P1', icon: <AlertTriangle className="w-4 h-4" /> },
  { type: 'opportunity', title: '东南亚直播带货增长300%', desc: '泰国/菲律宾为突破口，需建立本地仓和客服团队支撑扩张', impact: 'P2', icon: <Handshake className="w-4 h-4" /> },
];

const sidebarItems = [
  { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
  { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
  { label: '区域用户画像', path: '/users/regional' },
  { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
];

export default function ChannelInterviews() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeChannel, setActiveChannel] = useState('全部');
  const channels = ['全部', ...interviews.map(i => i.channel)];
  const filtered = activeChannel === '全部' ? interviews : interviews.filter(i => i.channel === activeChannel);

  const avgHealth = (interviews.reduce((s, i) => s + i.health, 0) / interviews.length).toFixed(0);
  const avgGrowth = Math.round(channelPerformance.reduce((s, c) => s + c.growth, 0) / channelPerformance.length);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">

            {/* ═══ Header ═══ */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                    <Store className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">渠道合作伙伴访谈</h1>
                    <p className="text-xs text-[#86868b]">
                      多角色智能体协作 · B2B深度访谈 + 渠道健康度评分 · {interviews.length}位渠道负责人 · Amazon/Target/TikTok/DTC/Shopee/Boots
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg"><span className="text-[#B5AFA8]">样本状态：</span>访谈与销售快照待复核</span>
                  <button
                    onClick={() => exportToCsv(
      interviews.map(i => ({ id: String(i.id), channel: i.channel, role: i.role, health: String(i.health), rating: String(i.rating) })),
      { id: 'ID', channel: '渠道', role: '角色', health: '健康度', rating: '评分' },
      'channel_interviews.csv'
    )}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FBF8F5] text-[#86868b] hover:bg-[#C25B6E] hover:text-white transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> 导出CSV
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#86868b]">渠道筛选：</span>
                {channels.map((c) => (
                  <button key={c} onClick={() => setActiveChannel(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeChannel === c ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-041']}
              title="渠道访谈复核口径"
              description="渠道健康度、销售占比和访谈结论需要补访谈记录、脱敏授权和内部销售快照版本；当前结果作为渠道优先级线索。"
            />

            {/* ═══ AI Agents ═══ */}
            <InterviewAgents
              interviewType="channel"
              sampleSize={interviews.length}
              regions={['美国', '英国', '新加坡']}
              dateRange="样例访谈日：2026-05-23 · 待销售快照复核"
            />

            {/* ═══ KPI Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '平均健康度', value: `${avgHealth}%`, sub: '渠道健康评分', icon: <ShieldCheck className="w-4 h-4" />, color: '#34c759' },
                { label: '平均增长率', value: `${avgGrowth > 0 ? '+' : ''}${avgGrowth}%`, sub: 'YoY增长', icon: <TrendingUp className="w-4 h-4" />, color: '#C25B6E' },
                { label: 'DTC利润率', value: '48%', sub: '全渠道最高', icon: <DollarSign className="w-4 h-4" />, color: '#ff9500' },
                { label: '覆盖渠道', value: '8', sub: '核心合作伙伴', icon: <Store className="w-4 h-4" />, color: '#5856d6' },
              ].map((k, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${k.color}15`, color: k.color }}>{k.icon}</div>
                    <span className="text-xs text-[#86868b]">{k.label}</span>
                  </div>
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{k.value}</p>
                  <span className="text-[10px] text-[#86868b]">{k.sub}</span>
                </div>
              ))}
            </div>

            {/* ═══ Charts Row 1: Channel Health Radar + Sales Performance ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Health Radar */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">渠道健康度多维对比</h3>
                <p className="text-[10px] text-[#86868b] mb-3">8维度评估 · DTC在利润率和品牌控制维度全面领先</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={healthRadar} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="#EDE6DF" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: '#86868b' }} />
                      <Radar name="Amazon" dataKey="amazon" stroke="#C25B6E" strokeWidth={2} fill="#C25B6E" fillOpacity={0.1} />
                      <Radar name="DTC" dataKey="dtc" stroke="#34c759" strokeWidth={2} fill="#34c759" fillOpacity={0.1} />
                      <Radar name="TikTok" dataKey="tiktok" stroke="#af52de" strokeWidth={1} fill="#af52de" fillOpacity={0.05} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sales Performance */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">各渠道销售与满意度</h3>
                <p className="text-[10px] text-[#86868b] mb-3">销售占比% · 增长% · 满意度 · 利润率</p>
                <div className="space-y-2">
                  {channelPerformance.map((c, i) => (
                    <div key={i} className="p-2.5 rounded-xl hover:bg-[#FBF8F5] transition-colors duration-200">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs text-[#1d1d1f] font-medium w-28 truncate">{c.channel}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-[10px] text-[#86868b] w-14">销售{c.sales}%</span>
                          <div className="flex-1 h-2 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-full" style={{ width: `${c.sales * 2.2}%` }} /></div>
                        </div>
                        <span className={`text-[10px] font-medium w-14 text-right ${c.growth > 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>{c.growth > 0 ? '+' : ''}{c.growth}%</span>
                        <div className="flex items-center gap-0.5 w-14 justify-end">
                          <Star className="w-3 h-3 text-[#ff9500] fill-[#ff9500]" />
                          <span className="text-[10px] text-[#1d1d1f]">{c.satisfaction}</span>
                        </div>
                        <span className="text-[10px] text-[#86868b] w-10 text-right">{c.margin}%</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${c.health >= 85 ? 'bg-[#34c759]/10 text-[#34c759]' : c.health >= 70 ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>{c.health}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ Charts Row 2: Cooperation Matrix + Channel Distribution ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Cooperation-Strategy Matrix */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">合作深度 × 战略重要性矩阵</h3>
                <p className="text-[10px] text-[#86868b] mb-3">横轴=合作深度 · 纵轴=战略重要性 · 气泡大小=销售规模</p>
                <div className="h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis type="number" dataKey="x" name="合作深度" domain={[0, 100]} tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} label={{ value: '合作深度 →', position: 'bottom', fontSize: 9, fill: '#86868b' }} />
                      <YAxis type="number" dataKey="y" name="战略重要性" domain={[0, 100]} tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} label={{ value: '← 战略重要性', angle: -90, position: 'left', fontSize: 9, fill: '#86868b' }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                      <Scatter data={cooperationMatrix} fill="#C25B6E" />
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* Quadrant Labels */}
                  <div className="absolute inset-0 pointer-events-none">
                    <span className="absolute top-2 left-2 text-[9px] text-[#34c759] bg-[#34c759]/10 px-1.5 py-0.5 rounded">明星 ★</span>
                    <span className="absolute top-2 right-2 text-[9px] text-[#ff9500] bg-[#ff9500]/10 px-1.5 py-0.5 rounded">问题 ?</span>
                    <span className="absolute bottom-8 left-2 text-[9px] text-[#C25B6E] bg-[#C25B6E]/10 px-1.5 py-0.5 rounded">金牛 $</span>
                    <span className="absolute bottom-8 right-2 text-[9px] text-[#86868b] bg-[#86868b]/10 px-1.5 py-0.5 rounded">瘦狗 ✕</span>
                  </div>
                </div>
              </div>

              {/* Channel Type Distribution */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">渠道类型分布</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={channelTypeDist} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                        {channelTypeDist.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 p-3 rounded-xl bg-[#FBF8F5]">
                  <p className="text-[10px] text-[#86868b] leading-relaxed">
                    <span className="text-[#C25B6E] font-medium">关键洞察：</span>电商平台占55%但利润率仅22%，DTC占23%利润率48%。战略重心应向DTC和社交电商转移。
                  </p>
                </div>
              </div>
            </div>

            {/* ═══ Strategy Insights Banner ═══ */}
            <div className="bg-gradient-to-r from-[#C25B6E]/8 via-[#FBF8F5] to-[#34c759]/8 rounded-2xl p-5 card-shadow-sm border border-[#C25B6E]/10">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#C25B6E]" /> 智能体渠道策略建议
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {strategyInsights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                      backgroundColor: ins.type === 'priority' ? '#ff3b3015' : ins.type === 'growth' ? '#34c75915' : ins.type === 'risk' ? '#ff950015' : '#007aff15',
                      color: ins.type === 'priority' ? '#ff3b30' : ins.type === 'growth' ? '#34c759' : ins.type === 'risk' ? '#ff9500' : '#007aff'
                    }}>
                      {ins.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-[#1d1d1f]">{ins.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${ins.impact === 'P0' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : ins.impact === 'P1' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#007aff]/10 text-[#007aff]'}`}>{ins.impact}</span>
                      </div>
                      <p className="text-[10px] text-[#86868b] leading-relaxed">{ins.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ Interview Cards ═══ */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#C25B6E]" /> 渠道深度访谈记录
                </h3>
                <span className="text-[10px] text-[#86868b]">共 {filtered.length} 条 · 点击展开策略建议</span>
              </div>

              {filtered.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl card-shadow-sm border border-[#EDE6DF] overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="w-full p-5 flex items-start gap-4 hover:bg-[#FBF8F5]/30 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#34c759] flex items-center justify-center text-white flex-shrink-0 shadow-sm" style={{ boxShadow: '0 2px 8px #34c75925' }}>
                      <Store className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-[#1d1d1f]">{item.channel}</span>
                        <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-md">{item.role}</span>
                        <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-md flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>
                        <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-md">{item.years}年经验</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto ${item.health >= 85 ? 'bg-[#34c759]/10 text-[#34c759]' : item.health >= 70 ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>健康度 {item.health}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] text-[#86868b]">{item.method} · {item.duration}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, s) => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s < item.rating ? 'text-[#ff9500] fill-[#ff9500]' : 'text-[#EDE6DF]'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FBF8F5] border-l-4 border-[#34c759]">
                        <p className="text-xs text-[#1d1d1f] italic leading-relaxed">"{item.quote}"</p>
                        <p className="text-xs text-[#86868b] mt-1">{item.quoteCN}</p>
                      </div>
                    </div>
                    {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-[#86868b] flex-shrink-0 mt-2" /> : <ChevronDown className="w-4 h-4 text-[#86868b] flex-shrink-0 mt-2" />}
                  </button>

                  {expandedId === item.id && (
                    <div className="border-t border-[#EDE6DF] px-5 pb-5">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                        <div>
                          <h5 className="text-[10px] text-[#34c759] font-medium mb-1.5 flex items-center gap-1"><TrendingUp className="w-3 h-3" />关键洞察</h5>
                          <div className="space-y-1">
                            {item.insights.map((ins, ii) => (
                              <div key={ii} className="flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-[#34c759] mt-1.5 flex-shrink-0" /><span className="text-[10px] text-[#1d1d1f]">{ins}</span></div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-[10px] text-[#ff3b30] font-medium mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />渠道挑战</h5>
                          <div className="space-y-1">
                            {item.challenges.map((ch, ci) => (
                              <div key={ci} className="flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-[#ff3b30] mt-1.5 flex-shrink-0" /><span className="text-[10px] text-[#1d1d1f]">{ch}</span></div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-[10px] text-[#007aff] font-medium mb-1.5 flex items-center gap-1"><Lightbulb className="w-3 h-3" />策略建议</h5>
                          <div className="space-y-1">
                            {item.strategies.map((st, si) => (
                              <div key={si} className="flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-[#007aff] mt-1.5 flex-shrink-0" /><span className="text-[10px] text-[#1d1d1f]">{st}</span></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
