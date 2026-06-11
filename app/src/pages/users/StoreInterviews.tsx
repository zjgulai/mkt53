// ═══════════════════════════════════════════════════════════════════
// StoreInterviews.tsx — 门店运营深度访谈
// 行业最佳实践：现场访谈 + 运营数据审计 + 坪效分析 + 员工效率
// 6个AI智能体协同完成门店调研、运营分析、最佳实践输出
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend
} from 'recharts';
import {
  ShoppingBag, TrendingUp, Users, Star, MapPin, Package, DollarSign,
  Clock, Lightbulb, Award, Target, ChevronDown, ChevronUp, Download, Zap, UserCheck
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import InterviewAgents from '@/components/InterviewAgents';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import { exportToCsv } from '@/utils/csvExport';

// ─── 月度客流与转化趋势 ───
const monthlyTraffic = [
  { month: '2024-12', visitors: 1200, conversion: 12.5, revenue: 187200 },
  { month: '2025-01', visitors: 980, conversion: 11.8, revenue: 142520 },
  { month: '2025-02', visitors: 1350, conversion: 14.2, revenue: 224640 },
  { month: '2025-03', visitors: 1580, conversion: 15.1, revenue: 286376 },
  { month: '2025-04', visitors: 1420, conversion: 13.8, revenue: 236808 },
  { month: '2025-05', visitors: 1750, conversion: 16.5, revenue: 346500 },
  { month: '2025-06', visitors: 1890, conversion: 17.2, revenue: 388188 },
];

// ─── 产品销售表现 ───
const productPerformance = [
  { product: 'M5 吸奶器', sales: 328, revenue: 52472, rating: 4.8, returnRate: 2.1, avgTime: 8.5, conversion: 18.2 },
  { product: 'M9 吸奶器', sales: 256, revenue: 51174, rating: 4.6, returnRate: 2.8, avgTime: 7.2, conversion: 15.5 },
  { product: '哺乳文胸', sales: 412, revenue: 12360, rating: 4.7, returnRate: 1.5, avgTime: 3.5, conversion: 22.8 },
  { product: '防溢乳垫', sales: 680, revenue: 6800, rating: 4.5, returnRate: 0.8, avgTime: 2.0, conversion: 28.5 },
  { product: '温奶器', sales: 189, revenue: 34020, rating: 4.4, returnRate: 3.2, avgTime: 6.0, conversion: 12.3 },
  { product: '储奶袋', sales: 520, revenue: 5200, rating: 4.6, returnRate: 1.1, avgTime: 1.8, conversion: 35.2 },
];

// ─── 门店运营雷达 ───
const storeRadar = [
  { dimension: '坪效', flagship: 95, corner: 65, popup: 88, boutique: 72, fullMark: 100 },
  { dimension: '转化率', flagship: 85, corner: 72, popup: 92, boutique: 78, fullMark: 100 },
  { dimension: '客单价', flagship: 90, corner: 55, popup: 75, boutique: 82, fullMark: 100 },
  { dimension: '复购率', flagship: 88, corner: 60, popup: 45, boutique: 70, fullMark: 100 },
  { dimension: '员工效率', flagship: 82, corner: 70, popup: 78, boutique: 75, fullMark: 100 },
  { dimension: '满意度', flagship: 95, corner: 78, popup: 88, boutique: 85, fullMark: 100 },
  { dimension: '社交传播', flagship: 92, corner: 55, popup: 95, boutique: 68, fullMark: 100 },
  { dimension: '库存周转', flagship: 75, corner: 82, popup: 65, boutique: 80, fullMark: 100 },
];

// ─── 坪效对比 ───
const efficiencyData = [
  { store: 'LA旗舰店', area: 280, revenue: 4658256, staff: 8, revenuePerSqm: 16637, revenuePerStaff: 582282, type: '旗舰店' },
  { store: '伦敦专卖店', area: 150, revenue: 2121840, staff: 5, revenuePerSqm: 14146, revenuePerStaff: 424368, type: '专卖店' },
  { store: '多伦多快闪', area: 60, revenue: 1410624, staff: 3, revenuePerSqm: 23510, revenuePerStaff: 470208, type: '快闪店' },
  { store: '纽约店中店', area: 45, revenue: 730080, staff: 2, revenuePerSqm: 16224, revenuePerStaff: 365040, type: '店中店' },
];

// ─── 门店访谈记录 ───
const stores = [
  {
    id: 1, name: 'Momcozy LA Experience Store', city: 'Los Angeles, US', type: '品牌旗舰店', health: 95,
    area: 280, staff: 8, monthlyVisitors: 1890, conversion: 17.2, avgOrder: 156, revenuePerSqm: 16637,
    topProduct: 'M5 吸奶器', satisfaction: 4.8, nps: 72,
    quote: 'Our flagship store focuses on experience. We have 4 private pumping rooms where moms can try products. The conversion rate for moms who try the M5 is 78%. We host monthly mom community events that drive word-of-mouth.',
    quoteCN: '我们的旗舰店注重体验。有4间私密的吸奶体验室，妈妈可以试用产品。试过M5的妈妈转化率达78%。每月举办妈妈社群活动，驱动口碑传播。',
    features: ['4间私密体验室', '专业泌乳顾问驻店', '月度妈妈社群活动', '线上线下库存打通', 'VIP预约制服务'],
    bestPractices: ['体验优先策略：先试用后购买，转化率78%', '社群运营：月度活动带来35%新客', '顾问式销售：泌乳顾问提升信任度+40%', 'OMO融合：线上下单门店自提占15%'],
    painPoints: ['高租金成本(占营收18%)', '专业顾问招聘困难', '高峰期排队等待', '设备维护成本高'],
    date: '样例访谈日 2026-05-23', duration: '65min', method: '现场访谈+运营数据审计',
  },
  {
    id: 2, name: 'Buy Buy Baby - Momcozy Corner', city: 'New York, US', type: '店中店', health: 72,
    area: 45, staff: 2, monthlyVisitors: 620, conversion: 14.5, avgOrder: 98, revenuePerSqm: 16224,
    topProduct: '哺乳文胸', satisfaction: 4.5, nps: 58,
    quote: 'The corner concept works well in busy stores. Moms see the display while shopping for other baby items. Bras and pads sell the best because they are easy to understand without explanation.',
    quoteCN: '角落概念在繁忙的店里效果很好。妈妈在购买其他婴儿用品时能看到展示。文胸和乳垫卖得最好，因为容易理解无需解释。',
    features: ['沉浸式产品展示', '扫码查看评价', '快速自提服务', '会员积分互通', '季节性主题陈列'],
    bestPractices: ['视线优化：产品在主通道视线范围内', '低介入销售：易理解产品自主选购', '扫码互动：数字化补充线下体验', '联名陈列：与互补品牌相邻提升连带率'],
    painPoints: ['陈列空间受限(仅45㎡)', '员工非专属，产品知识有限', '依赖商场客流，主动获客难', '装修调整需审批'],
    date: '样例访谈日 2026-05-23', duration: '45min', method: '现场访谈+客流观察',
  },
  {
    id: 3, name: 'Momcozy Toronto Pop-up', city: 'Toronto, CA', type: '快闪店', health: 88,
    area: 60, staff: 3, monthlyVisitors: 890, conversion: 19.8, avgOrder: 132, revenuePerSqm: 23510,
    topProduct: 'M9 吸奶器', satisfaction: 4.7, nps: 68,
    quote: 'Pop-up stores create urgency. We sold out M9 twice in one month. Canadian moms are very quality-conscious and willing to pay for premium features. Social media check-ins drive 40% of foot traffic.',
    quoteCN: '快闪店创造紧迫感。一个月内M9两次售罄。加拿大妈妈非常注重品质，愿意为高端功能付费。社交媒体打卡带来40%客流。',
    features: ['限时体验折扣', '社交媒体打卡点', '达人探店合作', '预售新品首发', '互动屏幕体验'],
    bestPractices: ['稀缺营销：限时限量创造购买紧迫感', '社交裂变：打卡点设计带动UGC传播', '达人联动：本地妈妈KOL探店引流', '新品测试：低成本验证市场反应'],
    painPoints: ['租期短(3-6个月)', '无法积累长期会员', '搭建和拆除成本高', '位置不确定性'],
    date: '样例访谈日 2026-05-23', duration: '50min', method: '现场访谈+社交媒体分析',
  },
  {
    id: 4, name: 'Momcozy London Store', city: 'London, UK', type: '品牌专卖店', health: 82,
    area: 150, staff: 5, monthlyVisitors: 1120, conversion: 15.6, avgOrder: 142, revenuePerSqm: 14146,
    topProduct: 'M5 + KleanPal套装', satisfaction: 4.6, nps: 62,
    quote: 'UK customers value eco-friendly packaging and detailed product information. We provide comparison cards showing Momcozy vs Medela features side by side. The NHS partnership display builds massive trust.',
    quoteCN: '英国顾客重视环保包装和详细产品信息。我们提供对比卡并排展示Momcozy和Medela功能。NHS合作展示建立巨大信任。',
    features: ['竞品对比展示区', '环保包装展示', '多语言服务(英/法/西)', 'NHS合作认证展示', '30天无忧退换'],
    bestPractices: ['信任建设：NHS认证展示提升转化率+25%', '教育营销：对比卡帮助决策困难用户', '可持续故事：环保包装吸引ESG消费者', '本地化服务：多语言覆盖欧洲游客'],
    painPoints: ['Brexit后进口成本上升', 'UKCA认证展示需更新', '欧洲游客占比下降', '冬季客流受天气影响大'],
    date: '样例访谈日 2026-05-23', duration: '55min', method: '现场访谈+竞品暗访',
  },
  {
    id: 5, name: 'Momcozy Dubai Mall', city: 'Dubai, UAE', type: '高端概念店', health: 90,
    area: 200, staff: 6, monthlyVisitors: 1450, conversion: 16.8, avgOrder: 198, revenuePerSqm: 18620,
    topProduct: 'W1 加热款套装', satisfaction: 4.9, nps: 75,
    quote: 'Dubai moms are luxury-oriented. They want the best and do not mind paying. We positioned Momcozy as accessible premium. The heating feature is a massive hit here. Private VIP rooms are always booked.',
    quoteCN: '迪拜妈妈追求高端品质。她们要最好的，不介意付费。我们将Momcozy定位为可及的高端品牌。加热功能在这里非常受欢迎。VIP私密房总是订满。',
    features: ['VIP私密体验套房', '多语言顾问(英/阿/中)', '高端礼品包装', '与月子中心合作', '预约制一对一服务'],
    bestPractices: ['高端定位：高价高服务匹配当地消费', 'VIP体验：预约制一对一提升满意度', '渠道合作：月子中心推荐带来50%高端客', '礼品市场：高端包装切入送礼场景'],
    painPoints: ['人员多语言要求高', '高温环境设备散热挑战', '当地法规合规复杂', '竞品luxury品牌压力大'],
    date: '样例访谈日 2026-05-23', duration: '58min', method: '现场访谈+VIP客户观察',
  },
];

// ─── 运营洞察 ═══
const operationInsights = [
  { type: 'best', title: '体验优先策略转化率78%', desc: 'LA旗舰店"先试用后购买"模式带来78%转化率，为全渠道最高', impact: '核心', icon: <Award className="w-4 h-4" /> },
  { type: 'growth', title: '快闪店坪效$23,510/㎡为最高', desc: '多伦多快闪店坪效远超旗舰店($16,637)，验证了敏捷测试模型的价值', impact: 'P0', icon: <Zap className="w-4 h-4" /> },
  { type: 'action', title: '专业顾问提升信任度+40%', desc: '配备泌乳顾问的门店满意度显著更高，建议所有旗舰店标配', impact: 'P1', icon: <UserCheck className="w-4 h-4" /> },
  { type: 'opportunity', title: '社交媒体打卡带来40%客流', desc: '多伦多快闪店案例证明UGC传播是线下获客的高效渠道', impact: 'P1', icon: <TrendingUp className="w-4 h-4" /> },
];

const sidebarItems = [
  { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
  { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
  { label: '区域用户画像', path: '/users/regional' },
  { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
];

export default function StoreInterviews() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeType, setActiveType] = useState('全部');
  const types = ['全部', ...Array.from(new Set(stores.map(s => s.type)))];
  const filtered = activeType === '全部' ? stores : stores.filter(s => s.type === activeType);

  const avgConversion = (stores.reduce((s, i) => s + i.conversion, 0) / stores.length).toFixed(1);
  const avgNPS = (stores.reduce((s, i) => s + i.nps, 0) / stores.length).toFixed(0);
  const avgRevenuePerSqm = (efficiencyData.reduce((s, e) => s + e.revenuePerSqm, 0) / efficiencyData.length).toLocaleString();

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
                    <ShoppingBag className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">门店运营深度访谈</h1>
                    <p className="text-xs text-[#86868b]">
                      多角色智能体协作 · 现场访谈 + 运营数据审计 + 坪效分析 · {stores.length}家门店 · 旗舰/店中店/快闪/专卖/高端概念
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg"><span className="text-[#B5AFA8]">样本状态：</span>门店快照待复核</span>
                  <button
                    onClick={() => exportToCsv(
      stores.map(s => ({ id: String(s.id), name: s.name, city: s.city, type: s.type, area: String(s.area), conversion: String(s.conversion), nps: String(s.nps) })),
      { id: 'ID', name: '门店', city: '城市', type: '类型', area: '面积', conversion: '转化率', nps: 'NPS' },
      'store_interviews.csv'
    )}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FBF8F5] text-[#86868b] hover:bg-[#C25B6E] hover:text-white transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> 导出CSV
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#86868b]">门店类型筛选：</span>
                {types.map((t) => (
                  <button key={t} onClick={() => setActiveType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeType === t ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-042']}
              title="门店访谈复核口径"
              description="转化率、坪效、NPS 和门店访谈结论需要绑定门店运营快照、访谈样本与授权状态；当前图表不作为真实门店经营结果。"
            />

            {/* ═══ AI Agents ═══ */}
            <InterviewAgents
              interviewType="store"
              sampleSize={stores.length}
              regions={['美国', '加拿大', '英国', '阿联酋']}
              dateRange="样例访谈日：2026-05-23 · 待门店快照复核"
            />

            {/* ═══ KPI Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '平均转化率', value: `${avgConversion}%`, sub: '体验→购买', icon: <TrendingUp className="w-4 h-4" />, color: '#34c759' },
                { label: '门店NPS', value: `+${avgNPS}`, sub: '顾客推荐意愿', icon: <Star className="w-4 h-4" />, color: '#ff9500' },
                { label: '平均坪效', value: `$${avgRevenuePerSqm}`, sub: '每平方米/年', icon: <DollarSign className="w-4 h-4" />, color: '#C25B6E' },
                { label: '覆盖门店', value: `${stores.length}`, sub: '全球门店', icon: <ShoppingBag className="w-4 h-4" />, color: '#5856d6' },
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

            {/* ═══ Charts Row 1: Store Radar + Traffic Trend ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Store Radar */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">门店类型运营能力雷达</h3>
                <p className="text-[10px] text-[#86868b] mb-3">8维度对比 · 快闪店在转化率和社交传播领先，旗舰店在坪效和满意度最强</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={storeRadar} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="#EDE6DF" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: '#86868b' }} />
                      <Radar name="旗舰店" dataKey="flagship" stroke="#C25B6E" strokeWidth={2} fill="#C25B6E" fillOpacity={0.1} />
                      <Radar name="快闪店" dataKey="popup" stroke="#34c759" strokeWidth={2} fill="#34c759" fillOpacity={0.1} />
                      <Radar name="店中店" dataKey="corner" stroke="#ff9500" strokeWidth={1} fill="#ff9500" fillOpacity={0.05} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Traffic Trend */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">LA旗舰店客流与转化趋势</h3>
                <p className="text-[10px] text-[#86868b] mb-3">2024-12 ~ 2025-06 · 客流增长57.5%，转化率从12.5%提升至17.2%</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTraffic}>
                      <defs>
                        <linearGradient id="storeVisitors" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C25B6E" stopOpacity={0.15}/><stop offset="95%" stopColor="#C25B6E" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" domain={[10, 20]} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Area yAxisId="left" type="monotone" dataKey="visitors" stroke="#C25B6E" strokeWidth={2} fill="url(#storeVisitors)" name="月客流" />
                      <Area yAxisId="right" type="monotone" dataKey="conversion" stroke="#34c759" strokeWidth={2} fill="#34c75910" name="转化率%" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ═══ Charts Row 2: Efficiency + Product Performance ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Efficiency Comparison */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">门店坪效与人效对比</h3>
                <p className="text-[10px] text-[#86868b] mb-3">各门店类型核心效率指标 · 快闪店坪效最高，旗舰店人效最高</p>
                <div className="space-y-3">
                  {efficiencyData.map((e, i) => (
                    <div key={i} className="p-3 rounded-xl hover:bg-[#FBF8F5] transition-colors duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[#1d1d1f]">{e.store}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FBF8F5] text-[#86868b]">{e.type}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[9px] text-[#86868b]">坪效</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-full" style={{ width: `${(e.revenuePerSqm / 25000) * 100}%` }} /></div>
                            <span className="text-[10px] font-medium text-[#C25B6E]">${e.revenuePerSqm.toLocaleString()}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#86868b]">人效</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full bg-[#34c759] rounded-full" style={{ width: `${(e.revenuePerStaff / 650000) * 100}%` }} /></div>
                            <span className="text-[10px] font-medium text-[#34c759]">${(e.revenuePerStaff / 1000).toFixed(0)}K</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Performance */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">产品销售表现矩阵</h3>
                <p className="text-[10px] text-[#86868b] mb-3">销量 · 转化率 · 退货率 · 平均决策时长(分钟)</p>
                <div className="space-y-2">
                  {productPerformance.map((p, i) => (
                    <div key={i} className="p-2.5 rounded-xl hover:bg-[#FBF8F5] transition-colors duration-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#1d1d1f]">{p.product}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#86868b]">{p.sales}件</span>
                          <span className="text-[10px] text-[#C25B6E] font-medium">${p.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-1.5">
                          <span className="text-[9px] text-[#86868b] w-10">转化{p.conversion}%</span>
                          <div className="flex-1 h-1.5 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-full" style={{ width: `${(p.conversion / 40) * 100}%` }} /></div>
                        </div>
                        <div className="flex items-center gap-0.5"><Star className="w-3 h-3 text-[#ff9500] fill-[#ff9500]" /><span className="text-[10px] text-[#1d1d1f]">{p.rating}</span></div>
                        <span className="text-[10px] text-[#86868b]">退{p.returnRate}%</span>
                        <span className="text-[10px] text-[#86868b] flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{p.avgTime}min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ Operation Insights Banner ═══ */}
            <div className="bg-gradient-to-r from-[#C25B6E]/8 via-[#FBF8F5] to-[#34c759]/8 rounded-2xl p-5 card-shadow-sm border border-[#C25B6E]/10">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#C25B6E]" /> 智能体运营洞察 — 最佳实践与行动建议
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {operationInsights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                      backgroundColor: ins.type === 'best' ? '#C25B6E15' : ins.type === 'growth' ? '#34c75915' : ins.type === 'action' ? '#007aff15' : '#ff950015',
                      color: ins.type === 'best' ? '#C25B6E' : ins.type === 'growth' ? '#34c759' : ins.type === 'action' ? '#007aff' : '#ff9500'
                    }}>
                      {ins.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-[#1d1d1f]">{ins.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${ins.impact === 'P0' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : ins.impact === 'P1' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#C25B6E]/10 text-[#C25B6E]'}`}>{ins.impact}</span>
                      </div>
                      <p className="text-[10px] text-[#86868b] leading-relaxed">{ins.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ Store Cards ═══ */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#C25B6E]" /> 门店深度访谈记录
                </h3>
                <span className="text-[10px] text-[#86868b]">共 {filtered.length} 条 · 点击展开最佳实践</span>
              </div>

              {filtered.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl card-shadow-sm border border-[#EDE6DF] overflow-hidden">
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    className="w-full p-5 flex items-start gap-4 hover:bg-[#FBF8F5]/30 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#ff9500] flex items-center justify-center text-white flex-shrink-0 shadow-sm" style={{ boxShadow: '0 2px 8px #ff950025' }}>
                      <ShoppingBag className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-[#1d1d1f]">{s.name}</span>
                        <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-md">{s.type}</span>
                        <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-md flex items-center gap-1"><MapPin className="w-3 h-3" />{s.city}</span>
                        <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-md">{s.area}㎡</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto ${s.health >= 90 ? 'bg-[#34c759]/10 text-[#34c759]' : s.health >= 75 ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>健康度 {s.health}</span>
                      </div>
                      <div className="flex items-center gap-4 mb-2 text-[10px] text-[#86868b] flex-wrap">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.staff}人</span>
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{s.monthlyVisitors}月客流</span>
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" />转化{s.conversion}%</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />客单${s.avgOrder}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />坪效${s.revenuePerSqm.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-[#ff9500] fill-[#ff9500]" />{s.satisfaction}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#C25B6E]/10 text-[#C25B6E] font-medium">NPS {s.nps}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FBF8F5] border-l-4 border-[#ff9500]">
                        <p className="text-xs text-[#1d1d1f] italic leading-relaxed">"{s.quote}"</p>
                        <p className="text-xs text-[#86868b] mt-1">{s.quoteCN}</p>
                      </div>
                    </div>
                    {expandedId === s.id ? <ChevronUp className="w-4 h-4 text-[#86868b] flex-shrink-0 mt-2" /> : <ChevronDown className="w-4 h-4 text-[#86868b] flex-shrink-0 mt-2" />}
                  </button>

                  {/* Expanded Detail */}
                  {expandedId === s.id && (
                    <div className="border-t border-[#EDE6DF] px-5 pb-5">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                        {/* Best Practices */}
                        <div>
                          <h5 className="text-[10px] text-[#C25B6E] font-medium mb-1.5 flex items-center gap-1"><Award className="w-3 h-3" />最佳实践</h5>
                          <div className="space-y-1">
                            {s.bestPractices.map((bp, bi) => (
                              <div key={bi} className="flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-[#C25B6E] mt-1.5 flex-shrink-0" /><span className="text-[10px] text-[#1d1d1f]">{bp}</span></div>
                            ))}
                          </div>
                        </div>
                        {/* Features */}
                        <div>
                          <h5 className="text-[10px] text-[#34c759] font-medium mb-1.5 flex items-center gap-1"><Target className="w-3 h-3" />核心特色</h5>
                          <div className="flex flex-wrap gap-1">
                            {s.features.map((f, fi) => (
                              <span key={fi} className="px-2 py-0.5 rounded-md bg-[#34c759]/5 text-[10px] text-[#34c759]">{f}</span>
                            ))}
                          </div>
                          <h5 className="text-[10px] text-[#ff3b30] font-medium mb-1.5 mt-3 flex items-center gap-1"><TrendingUp className="w-3 h-3" />运营痛点</h5>
                          <div className="space-y-1">
                            {s.painPoints.map((pp, pi) => (
                              <div key={pi} className="flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-[#ff3b30] mt-1.5 flex-shrink-0" /><span className="text-[10px] text-[#1d1d1f]">{pp}</span></div>
                            ))}
                          </div>
                        </div>
                        {/* Meta */}
                        <div>
                          <h5 className="text-[10px] text-[#5856d6] font-medium mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3" />访谈信息</h5>
                          <div className="space-y-1.5 text-[10px] text-[#86868b]">
                            <div className="flex justify-between"><span>访谈方法</span><span className="text-[#1d1d1f]">{s.method}</span></div>
                            <div className="flex justify-between"><span>访谈时长</span><span className="text-[#1d1d1f]">{s.duration}</span></div>
                            <div className="flex justify-between"><span>访谈日期</span><span className="text-[#1d1d1f]">{s.date}</span></div>
                            <div className="flex justify-between"><span>门店面积</span><span className="text-[#1d1d1f]">{s.area}㎡</span></div>
                            <div className="flex justify-between"><span>员工数</span><span className="text-[#1d1d1f]">{s.staff}人</span></div>
                            <div className="flex justify-between"><span>坪效</span><span className="text-[#C25B6E] font-medium">${s.revenuePerSqm.toLocaleString()}/㎡</span></div>
                            <div className="flex justify-between"><span>转化率</span><span className="text-[#34c759] font-medium">{s.conversion}%</span></div>
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
