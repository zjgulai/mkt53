// ═══════════════════════════════════════════════════════════════════
// ConsumerInterviews.tsx — 消费者深度访谈
// 行业最佳实践：半结构化访谈 + NPS + Kano模型 + 用户旅程地图
// 6个AI智能体协同完成访谈、分析、洞察输出
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Legend, RadarChart, Radar, ScatterChart, Scatter,
  PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  Users, Star, MapPin, Baby, MessageCircle, ThumbsUp, AlertTriangle,
  Lightbulb, TrendingUp, Heart, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import InterviewAgents from '@/components/InterviewAgents';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import { exportToCsv } from '@/utils/csvExport';

// ─── NPS分布 ───
const npsDistribution = [
  { score: '0-6(批评者)', count: 8, color: '#ff3b30' },
  { score: '7-8(被动者)', count: 22, color: '#ff9500' },
  { score: '9-10(推荐者)', count: 45, color: '#34c759' },
];

// ─── 满意度雷达（行业最佳实践：多维度评估） ───
const satisfactionRadar = [
  { dimension: '吸奶舒适度', momcozy: 4.6, medela: 4.2, willow: 4.3, elvie: 4.5, fullMark: 5 },
  { dimension: '静音表现', momcozy: 4.3, medela: 4.0, willow: 4.1, elvie: 4.2, fullMark: 5 },
  { dimension: '便携性', momcozy: 4.7, medela: 3.5, willow: 4.5, elvie: 4.6, fullMark: 5 },
  { dimension: 'APP体验', momcozy: 4.2, medela: 3.8, willow: 4.4, elvie: 4.3, fullMark: 5 },
  { dimension: '清洁便利', momcozy: 4.1, medela: 3.6, willow: 3.9, elvie: 3.8, fullMark: 5 },
  { dimension: '性价比', momcozy: 4.8, medela: 3.2, willow: 3.5, elvie: 2.8, fullMark: 5 },
  { dimension: '售后服务', momcozy: 4.0, medela: 4.4, willow: 3.7, elvie: 3.5, fullMark: 5 },
  { dimension: '包装设计', momcozy: 4.5, medela: 4.1, willow: 4.6, elvie: 4.7, fullMark: 5 },
];

// ─── Kano模型：需求优先级矩阵 ───
const kanoData = [
  // 基本型需求 (Must-be)
  { name: '安全材质', type: '基本型', satisfaction: 4.9, implementation: 4.8, importance: 9.8, impact: 95, x: 15, y: 85, color: '#ff3b30' },
  { name: '防漏设计', type: '基本型', satisfaction: 4.7, implementation: 4.5, importance: 9.5, impact: 90, x: 20, y: 80, color: '#ff3b30' },
  { name: '吸力可调', type: '基本型', satisfaction: 4.6, implementation: 4.6, importance: 9.2, impact: 88, x: 25, y: 75, color: '#ff3b30' },
  // 期望型需求 (One-dimensional)
  { name: '静音运行', type: '期望型', satisfaction: 4.5, implementation: 4.3, importance: 8.8, impact: 82, x: 45, y: 65, color: '#ff9500' },
  { name: '续航时长', type: '期望型', satisfaction: 4.4, implementation: 4.2, importance: 8.5, impact: 78, x: 50, y: 60, color: '#ff9500' },
  { name: '智能记录', type: '期望型', satisfaction: 4.2, implementation: 4.0, importance: 7.8, impact: 70, x: 55, y: 55, color: '#ff9500' },
  // 兴奋型需求 (Attractive)
  { name: '加热功能', type: '兴奋型', satisfaction: 4.8, implementation: 3.2, importance: 7.5, impact: 85, x: 80, y: 90, color: '#34c759' },
  { name: 'AI推荐', type: '兴奋型', satisfaction: 4.3, implementation: 2.8, importance: 6.8, impact: 72, x: 85, y: 70, color: '#34c759' },
  { name: '社群功能', type: '兴奋型', satisfaction: 4.0, implementation: 2.5, importance: 6.0, impact: 65, x: 88, y: 55, color: '#34c759' },
  // 无差异需求 (Indifferent)
  { name: 'AR试穿', type: '无差异', satisfaction: 3.2, implementation: 1.5, importance: 3.5, impact: 20, x: 70, y: 15, color: '#86868b' },
];

// ─── 用户旅程地图关键触点 ───
const journeyTouchpoints = [
  { stage: '认知', touchpoint: '社交媒体/口碑', emotion: 3.8, pain: '信息过载，难辨真伪', opportunity: 'KOL真实体验分享', color: '#C25B6E' },
  { stage: '考虑', touchpoint: 'Amazon/官网', emotion: 4.0, pain: '对比参数复杂', opportunity: '一键对比工具', color: '#ff9500' },
  { stage: '购买', touchpoint: '下单支付', emotion: 4.5, pain: '海外物流不确定', opportunity: '预计送达可视化', color: '#34c759' },
  { stage: '开箱', touchpoint: '首次使用', emotion: 4.7, pain: '说明书不够直观', opportunity: '扫码视频教程', color: '#007aff' },
  { stage: '使用', touchpoint: '日常吸奶', emotion: 4.2, pain: '清洁维护繁琐', opportunity: '自清洁配件', color: '#af52de' },
  { stage: '复购', touchpoint: '配件/升级', emotion: 4.4, pain: '配件选择困难', opportunity: '智能配件推荐', color: '#5856d6' },
];

// ─── 深度访谈记录（行业最佳实践：结构化记录） ───
const interviews = [
  {
    id: 1, name: 'Emily R.', age: 32, location: 'San Francisco, US', baby: '4个月',
    persona: '背奶妈妈', product: 'M5 Wearable Pump', nps: 10,
    quote: 'I pump 3 times a day at work. The M5 fits in my bra and nobody notices. Battery lasts 5 sessions easily. Game changer for my productivity.',
    quoteCN: '我每天在办公室吸奶3次。M5可以藏在文胸里，没人发现。电池轻松支持5次使用。彻底改变了我的工作效率。',
    painPoints: ['办公室隐私不够', '吸奶时间安排难', '清洗设备不便', '背奶包保温有限'],
    needs: ['更长续航', '超静音模式<35dB', '便携清洁方案', '智能提醒清洗'],
    rating: 5, date: '样例访谈窗口：待接入（示例）', duration: '52min', method: '视频访谈+使用日志',
    sentiment: { joy: 85, trust: 78, anticipation: 72, sadness: 15, anger: 5 },
  },
  {
    id: 2, name: 'Sophie M.', age: 28, location: 'London, UK', baby: '2个月',
    persona: '新手妈妈', product: 'M9 + Nursing Bra', nps: 9,
    quote: 'As a first-time mom, I was overwhelmed. The M9 app guided me through the settings. Nursing bra is incredibly soft. Wish I had discovered this brand earlier.',
    quoteCN: '作为新手妈妈，我感到不知所措。M9的APP指导我完成所有设置。哺乳文胸非常柔软。真希望早点发现这个品牌。',
    painPoints: ['初次使用学习成本高', '不知如何选择档位', '涨奶疼痛难忍', '夜间操作不便'],
    needs: ['新手引导教程', 'AI智能档位推荐', '疼痛缓解模式', '夜间柔光界面'],
    rating: 4, date: '样例访谈窗口：待接入（示例）', duration: '48min', method: '视频访谈+屏幕录制',
    sentiment: { joy: 72, trust: 85, anticipation: 68, sadness: 25, anger: 8 },
  },
  {
    id: 3, name: 'Claudia W.', age: 35, location: 'Toronto, CA', baby: '8个月(二胎)',
    persona: '二胎妈妈', product: 'KleanPal Pro + M5', nps: 10,
    quote: 'With two kids, efficiency is everything. KleanPal saves me 30 minutes daily. M5 lets me pump while playing with my toddler. Worth every penny.',
    quoteCN: '有两个孩子，效率就是一切。KleanPal每天节省我30分钟。M5让我可以一边陪大孩玩一边吸奶。物有所值。',
    painPoints: ['时间不够分配', '两个孩子需求冲突', '产品清洁维护繁琐', '配件收纳混乱'],
    needs: ['多功能集成', '一键快速清洁', '大容量储存', '统一配件生态'],
    rating: 5, date: '样例访谈窗口：待接入（示例）', duration: '61min', method: '家访+使用场景观察',
    sentiment: { joy: 90, trust: 82, anticipation: 75, sadness: 10, anger: 3 },
  },
  {
    id: 4, name: 'Yuki T.', age: 30, location: 'Tokyo, JP', baby: '3个月',
    persona: '混合喂养', product: 'M6 Slim', nps: 8,
    quote: 'I use formula at night and pump during the day. The M6 Slim is compact enough for my small apartment. Very quiet. But I wish the flange size options were clearer.',
    quoteCN: '我晚上用配方奶，白天吸奶。M6 Slim对我小公寓来说足够紧凑。非常安静。但希望罩杯尺寸选择更清晰。',
    painPoints: ['混合喂养协调难', '夜间喂奶疲劳', '产品占用空间', '尺码选择困惑'],
    needs: ['紧凑设计', '超静音', '夜间模式', '智能尺码推荐'],
    rating: 4, date: '样例访谈窗口：待接入（示例）', duration: '45min', method: '视频访谈',
    sentiment: { joy: 65, trust: 70, anticipation: 60, sadness: 30, anger: 12 },
  },
  {
    id: 5, name: 'Anna K.', age: 33, location: 'Berlin, DE', baby: '6个月',
    persona: '背奶妈妈', product: 'M5 + Storage Bags', nps: 9,
    quote: 'The suction pattern feels natural, not painful like my old pump. Storage bags are leak-proof and easy to label. German moms appreciate the quality certification details.',
    quoteCN: '吸力模式感觉自然，不像旧泵那样疼痛。储奶袋防漏且易于标记。德国妈妈很欣赏质量认证详情。',
    painPoints: ['旧产品吸力疼痛', '储奶袋曾漏奶', '奶量追踪不便', '欧盟认证信息难找'],
    needs: ['舒适吸力技术', '防漏储奶方案', '智能奶量追踪', 'CE认证展示'],
    rating: 5, date: '样例访谈窗口：待接入（示例）', duration: '55min', method: '视频访谈+产品拆解',
    sentiment: { joy: 80, trust: 88, anticipation: 70, sadness: 12, anger: 5 },
  },
  {
    id: 6, name: 'Maria S.', age: 29, location: 'Sydney, AU', baby: '5个月',
    persona: '新手妈妈', product: 'Air1 Ultra-Slim', nps: 7,
    quote: 'Love how thin the Air1 is. But the suction is not as strong as I expected for the price. Customer service was helpful when I asked about flange fit.',
    quoteCN: '喜欢Air1的超薄设计。但吸力不如预期强劲，考虑到价格。问罩杯适配时客服很有帮助。',
    painPoints: ['吸力强度不够', '价格偏高', '配件需另购', '澳洲本地维修难'],
    needs: ['增强吸力模式', '套装优惠定价', '配件捆绑销售', '澳洲本地服务点'],
    rating: 3, date: '样例访谈窗口：待接入（示例）', duration: '43min', method: '视频访谈',
    sentiment: { joy: 55, trust: 65, anticipation: 50, sadness: 35, anger: 20 },
  },
  {
    id: 7, name: 'Li Wei', age: 31, location: 'Singapore', baby: '7个月(二胎)',
    persona: '二胎妈妈', product: 'W1 Heating + M5', nps: 10,
    quote: 'The heating function is a game-changer! Warm massage before pumping increases my output by 20%. My friends all want to try it after I posted on Instagram.',
    quoteCN: '加热功能是革命性的！泵奶前热敷按摩增加了20%的产量。我在Instagram分享后朋友们都想试。',
    painPoints: ['加热等待时间', '产品价格高', '新加坡购买渠道少', '充电接口不通用'],
    needs: ['快速加热<30s', '分期付款选项', '本地经销商', 'Type-C统一接口'],
    rating: 5, date: '样例访谈窗口：待接入（示例）', duration: '58min', method: '视频访谈+社交媒体分析',
    sentiment: { joy: 92, trust: 80, anticipation: 88, sadness: 8, anger: 2 },
  },
  {
    id: 8, name: 'Fatima A.', age: 34, location: 'Dubai, UAE', baby: '3个月',
    persona: '孕期妈妈', product: 'M5 (gift)', nps: 6,
    quote: 'Received as a gift. The product is good but I had trouble finding Arabic language support in the app. Would love to see more content for Middle Eastern moms.',
    quoteCN: '作为礼物收到。产品不错但APP中找不到阿拉伯语支持。希望看到更多面向中东妈妈的内容。',
    painPoints: ['APP无阿拉伯语', '缺乏本地化内容', '保修政策不清晰', '高温环境使用担忧'],
    needs: ['多语言APP', '区域化内容', '清晰保修政策', '高温使用指南'],
    rating: 3, date: '样例访谈窗口：待接入（示例）', duration: '40min', method: '视频访谈',
    sentiment: { joy: 45, trust: 55, anticipation: 60, sadness: 40, anger: 25 },
  },
];

// ─── 洞察总结 ───
const keyInsights = [
  { type: 'opportunity', title: '加热功能是差异化杀手锏', desc: 'W1加热款NPS=10，用户报告产量提升20%，是最高优先级的功能扩张方向', impact: 'P0', icon: <Lightbulb className="w-4 h-4" /> },
  { type: 'pain', title: '清洁便利性是复购瓶颈', desc: '满意度雷达显示"清洁便利"得分最低(4.1)，二胎妈妈群体尤为敏感', impact: 'P1', icon: <AlertTriangle className="w-4 h-4" /> },
  { type: 'strength', title: '性价比是核心竞争壁垒', desc: 'Momcozy性价比评分4.8，显著领先Medela(3.2)/Willow(3.5)/Elvie(2.8)', impact: '核心', icon: <ThumbsUp className="w-4 h-4" /> },
  { type: 'action', title: 'APP本地化阻碍中东扩张', desc: 'Fatima案例揭示阿拉伯语支持缺失直接影响NPS(仅6分)，需优先解决', impact: 'P1', icon: <TrendingUp className="w-4 h-4" /> },
];

const sidebarItems = [
  { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
  { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
  { label: '区域用户画像', path: '/users/regional' },
  { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
];

export default function ConsumerInterviews() {
  const [selectedPersona, setSelectedPersona] = useState('全部');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const personas = ['全部', '新手妈妈', '背奶妈妈', '二胎妈妈', '混合喂养', '孕期妈妈'];
  const filtered = selectedPersona === '全部' ? interviews : interviews.filter(i => i.persona.includes(selectedPersona));

  const avgRating = (interviews.reduce((s, i) => s + i.rating, 0) / interviews.length).toFixed(1);
  const avgNPS = (interviews.reduce((s, i) => s + i.nps, 0) / interviews.length).toFixed(0);

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
                    <Users className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">消费者深度访谈</h1>
                    <p className="text-xs text-[#86868b]">
                      多角色智能体协作 · 半结构化访谈 + NPS + Kano模型 · {interviews.length}位全球妈妈 · 美/英/加/日/德/澳/新/阿
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg">
                    <span className="text-[#B5AFA8]">样本状态：</span>访谈样本待复核
                  </span>
                  <button
                    onClick={() => exportToCsv(
      interviews.map(i => ({ id: i.id, name: i.name, age: String(i.age), location: i.location, persona: i.persona, product: i.product, nps: String(i.nps), rating: String(i.rating) })),
      { id: 'ID', name: '姓名', age: '年龄', location: '地区', persona: '画像', product: '产品', nps: 'NPS', rating: '评分' },
      'consumer_interviews.csv'
    )}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FBF8F5] text-[#86868b] hover:bg-[#C25B6E] hover:text-white transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> 导出CSV
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#86868b]">用户画像筛选：</span>
                {personas.map((p) => (
                  <button key={p} onClick={() => setSelectedPersona(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPersona === p ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-014']}
              title="消费者访谈样本口径"
              description="当前访谈记录缺少完整招募条件、样本配额和原始访谈凭证；NPS、Kano 和旅程结论应作为定性线索，不能替代量化调研结论。"
            />

            {/* ═══ AI Agents ═══ */}
            <InterviewAgents
              interviewType="consumer"
              sampleSize={interviews.length}
              regions={['美国', '英国', '加拿大', '日本', '德国', '澳大利亚', '新加坡', '阿联酋']}
              dateRange="样例访谈窗口：待接入（示例） · 待样本复核"
            />

            {/* ═══ KPI Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '综合NPS', value: `+${avgNPS}`, sub: '推荐意愿', icon: <Heart className="w-4 h-4" />, color: '#34c759' },
                { label: '平均评分', value: avgRating, sub: '/ 5.0', icon: <Star className="w-4 h-4" />, color: '#ff9500' },
                { label: '访谈总时长', value: '462', sub: '分钟', icon: <MessageCircle className="w-4 h-4" />, color: '#C25B6E' },
                { label: '情感正向率', value: '78%', sub: 'joy + trust', icon: <ThumbsUp className="w-4 h-4" />, color: '#5856d6' },
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

            {/* ═══ Charts Row 1: NPS + Satisfaction Radar ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* NPS Distribution */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">NPS净推荐值分布</h3>
                <p className="text-[10px] text-[#86868b] mb-3">综合NPS = +49（推荐者60% - 批评者10.7%）· 行业平均+45</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                    <PieChart>
                      <Pie data={npsDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="count">
                        {npsDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Satisfaction Radar */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">多品牌满意度对比雷达</h3>
                <p className="text-[10px] text-[#86868b] mb-3">8维度评估 · Momcozy在性价比(4.8)和便携性(4.7)显著领先</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                    <RadarChart data={satisfactionRadar} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="#EDE6DF" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: '#86868b' }} />
                      <Radar name="Momcozy" dataKey="momcozy" stroke="#C25B6E" strokeWidth={2} fill="#C25B6E" fillOpacity={0.1} />
                      <Radar name="Medela" dataKey="medela" stroke="#86868b" strokeWidth={1} fill="#86868b" fillOpacity={0.05} />
                      <Radar name="Elvie" dataKey="elvie" stroke="#5856d6" strokeWidth={1} fill="#5856d6" fillOpacity={0.05} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ═══ Charts Row 2: Kano Model + Journey Map ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Kano Model */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">Kano需求优先级矩阵</h3>
                <p className="text-[10px] text-[#86868b] mb-3">横轴=实现难度 · 纵轴=用户影响力 · 绿色优先投入</p>
                <div className="h-56 relative">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis type="number" dataKey="x" name="实现难度" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} label={{ value: '实现难度 →', position: 'bottom', fontSize: 9, fill: '#86868b' }} />
                      <YAxis type="number" dataKey="y" name="影响力" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} label={{ value: '← 影响力', angle: -90, position: 'left', fontSize: 9, fill: '#86868b' }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                      <Scatter data={kanoData.filter(d => d.type === '基本型')} fill="#ff3b30" />
                      <Scatter data={kanoData.filter(d => d.type === '期望型')} fill="#ff9500" />
                      <Scatter data={kanoData.filter(d => d.type === '兴奋型')} fill="#34c759" />
                      <Scatter data={kanoData.filter(d => d.type === '无差异')} fill="#86868b" />
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="absolute top-0 right-0 flex flex-col gap-1">
                    {[{ c: '#ff3b30', l: '基本型' }, { c: '#ff9500', l: '期望型' }, { c: '#34c759', l: '兴奋型' }, { c: '#86868b', l: '无差异' }].map(t => (
                      <span key={t.l} className="flex items-center gap-1 text-[9px] text-[#86868b]"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.c }} />{t.l}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Journey Touchpoints */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">用户旅程情感曲线</h3>
                <p className="text-[10px] text-[#86868b] mb-3">6大触点情绪评分 + 痛点/机会识别</p>
                <div className="space-y-2.5">
                  {journeyTouchpoints.map((j, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-14 text-center">
                        <span className="text-[10px] font-medium text-[#1d1d1f] block">{j.stage}</span>
                        <span className="text-[9px] text-[#86868b]">{j.touchpoint}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-2 bg-[#FBF8F5] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(j.emotion / 5) * 100}%`, backgroundColor: j.color }} />
                          </div>
                          <span className="text-[10px] font-semibold w-6 text-right" style={{ color: j.color }}>{j.emotion}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-[#ff3b30] flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />{j.pain}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ Key Insights Banner ═══ */}
            <div className="bg-gradient-to-r from-[#C25B6E]/8 via-[#FBF8F5] to-[#34c759]/8 rounded-2xl p-5 card-shadow-sm border border-[#C25B6E]/10">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#C25B6E]" /> 智能体洞察摘要 — 关键发现与行动建议
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {keyInsights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: ins.type === 'strength' ? '#34c75915' : ins.type === 'pain' ? '#ff3b3015' : ins.type === 'opportunity' ? '#C25B6E15' : '#007aff15', color: ins.type === 'strength' ? '#34c759' : ins.type === 'pain' ? '#ff3b30' : ins.type === 'opportunity' ? '#C25B6E' : '#007aff' }}>
                      {ins.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-[#1d1d1f]">{ins.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${ins.impact === 'P0' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : ins.impact === 'P1' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#34c759]/10 text-[#34c759]'}`}>{ins.impact}</span>
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
                  <MessageCircle className="w-4 h-4 text-[#C25B6E]" /> 深度访谈记录
                </h3>
                <span className="text-[10px] text-[#86868b]">共 {filtered.length} 条 · 点击展开详情</span>
              </div>

              {filtered.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl card-shadow-sm border border-[#EDE6DF] overflow-hidden">
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="w-full p-5 flex items-start gap-4 hover:bg-[#FBF8F5]/30 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#C25B6E] flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E25' }}>
                      {item.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-[#1d1d1f]">{item.name}</span>
                        <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-md">{item.age}岁 · {item.persona}</span>
                        <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-md flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>
                        <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-md flex items-center gap-1"><Baby className="w-3 h-3" />{item.baby}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#34c759]/10 text-[#34c759] font-medium ml-auto">NPS {item.nps}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#C25B6E]/10 text-[10px] text-[#C25B6E] font-medium">{item.product}</span>
                        <span className="text-[10px] text-[#86868b]">{item.method} · {item.duration}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, s) => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s < item.rating ? 'text-[#ff9500] fill-[#ff9500]' : 'text-[#EDE6DF]'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FBF8F5] border-l-4 border-[#C25B6E]">
                        <p className="text-xs text-[#1d1d1f] italic leading-relaxed">"{item.quote}"</p>
                        <p className="text-xs text-[#86868b] mt-1">{item.quoteCN}</p>
                      </div>
                    </div>
                    {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-[#86868b] flex-shrink-0 mt-2" /> : <ChevronDown className="w-4 h-4 text-[#86868b] flex-shrink-0 mt-2" />}
                  </button>

                  {/* Expanded Detail */}
                  {expandedId === item.id && (
                    <div className="border-t border-[#EDE6DF] px-5 pb-5">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                        {/* Pain Points & Needs */}
                        <div className="space-y-3">
                          <div>
                            <h5 className="text-[10px] text-[#ff3b30] font-medium mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />痛点</h5>
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(item.painPoints) ? item.painPoints.map((p, pi) => (
                                <span key={pi} className="px-2 py-0.5 rounded-md bg-[#ff3b30]/5 text-[10px] text-[#ff3b30]">{p}</span>
                              )) : <span className="px-2 py-0.5 rounded-md bg-[#ff3b30]/5 text-[10px] text-[#ff3b30]">{item.painPoints}</span>}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-[10px] text-[#34c759] font-medium mb-1.5 flex items-center gap-1"><Heart className="w-3 h-3" />需求</h5>
                            <div className="flex flex-wrap gap-1">
                              {item.needs.map((n, ni) => (
                                <span key={ni} className="px-2 py-0.5 rounded-md bg-[#34c759]/5 text-[10px] text-[#34c759]">{n}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Sentiment Analysis */}
                        <div>
                          <h5 className="text-[10px] text-[#5856d6] font-medium mb-2 flex items-center gap-1">情感分析</h5>
                          <div className="space-y-1.5">
                            {[
                              { label: '喜悦 Joy', value: item.sentiment.joy, color: '#34c759' },
                              { label: '信任 Trust', value: item.sentiment.trust, color: '#007aff' },
                              { label: '期待 Anticipation', value: item.sentiment.anticipation, color: '#C25B6E' },
                              { label: '低落 Sadness', value: item.sentiment.sadness, color: '#ff9500' },
                              { label: '愤怒 Anger', value: item.sentiment.anger, color: '#ff3b30' },
                            ].map((e, ei) => (
                              <div key={ei} className="flex items-center gap-2">
                                <span className="text-[9px] text-[#86868b] w-16">{e.label}</span>
                                <div className="flex-1 h-1.5 bg-[#FBF8F5] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${e.value}%`, backgroundColor: e.color }} />
                                </div>
                                <span className="text-[9px] text-[#1d1d1f] w-6 text-right">{e.value}</span>
                              </div>
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
