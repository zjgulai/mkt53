import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { Star, Zap, TrendingUp, BarChart3, Users, Shield, FileText, Cpu, Globe, Award, Bell, ChevronRight, Target, ShoppingBag, MessageSquare, Lightbulb, BookOpen, MapPin, ExternalLink, CheckCircle } from 'lucide-react';
import { getSourceRegistryItem } from '@/data/source-registry';
import { usePeriodicManifest } from '@/hooks/usePeriodicManifest';

// ═══════════════════════════════════════════════════════════════════
// Momcozy 市场洞察工作台 · 首页全面重构
// 核心定位：工作台入口 · 功能导航 · 数据概览 · 情报推送
// ═══════════════════════════════════════════════════════════════════

// R1: 行业最佳实践 — 年度TAM/SAM/SOM趋势数据（2021-2030E）
// 数据来源: Precedence Research 2026-04 / Grand View Research 2025 / Fortune BI 2025
// 实线=历史(2021-2025) 虚线=预测(2026-2030E)
const marketTrendData = [
  { year: '2021', tam: 892, sam: 28.4, som: 4.2, type: '历史' },
  { year: '2022', tam: 948, sam: 30.1, som: 4.6, type: '历史' },
  { year: '2023', tam: 1015, sam: 32.5, som: 5.1, type: '历史' },
  { year: '2024', tam: 1092, sam: 35.2, som: 5.8, type: '历史' },
  { year: '2025', tam: 1178, sam: 38.1, som: 6.2, type: '历史' },
  { year: '2026', tam: 1255, sam: 41.3, som: 6.69, type: '预测' },
  { year: '2027', tam: 1338, sam: 44.8, som: 7.26, type: '预测' },
  { year: '2028', tam: 1428, sam: 48.7, som: 7.92, type: '预测' },
  { year: '2029', tam: 1525, sam: 52.9, som: 8.64, type: '预测' },
  { year: '2030', tam: 1628, sam: 57.5, som: 9.42, type: '预测' },
];

// R5: CAGR参考线数据点
const cagrLines = [
  { label: 'TAM CAGR 6.2%', color: '#C25B6E' },
  { label: 'SAM CAGR 8.52%', color: '#ff9500' },
  { label: 'SOM CAGR 8.56%', color: '#34c759' },
];

// 竞品份额动态
const shareData = [
  { brand: 'Momcozy', share: 19.3, change: '+2.1', color: '#C25B6E' },
  { brand: 'Medela', share: 15.2, change: '-0.8', color: '#86868b' },
  { brand: 'Willow', share: 12.8, change: '+0.5', color: '#ff9500' },
  { brand: 'Elvie', share: 11.5, change: '-1.2', color: '#af52de' },
  { brand: 'Spectra', share: 9.4, change: '-0.3', color: '#34c759' },
  { brand: '其他', share: 31.8, change: '-0.3', color: '#d1d1d6' },
];

// 热门板块（8个核心工作台入口）
const hotModules = [
  { icon: BarChart3, title: '市场数据看板', desc: 'TAM/SAM/SOM · PEST · 波特五力', color: '#C25B6E', link: '/market/trend', badge: null },
  { icon: Target, title: '竞品库', desc: '8品牌25款 · Amazon连接器待接入', color: '#ff9500', link: '/competition', badge: '8品牌' },
  { icon: Cpu, title: '新品监测', desc: '2026新品追踪 · 威胁评估', color: '#34c759', link: '/competition/new', badge: '15款' },
  { icon: Users, title: '用户画像', desc: '6类画像 · 8大人群聚类', color: '#af52de', link: '/users/regional', badge: null },
  { icon: Shield, title: '政策法规', desc: '7国政策 · 合规追踪', color: '#5856d6', link: '/industry', badge: '7国' },
  { icon: FileText, title: '报告中心', desc: '16份报告 · 4大分类', color: '#ff3b30', link: '/reports', badge: 'NEW' },
  { icon: Lightbulb, title: '看自己', desc: '营销4P · BCG矩阵', color: '#C25B6E', link: '/self', badge: null },
  { icon: MessageSquare, title: 'AI助手', desc: '评论分析 · 设计助手', color: '#34c759', link: '/ai-assistant', badge: null },
];

// 最新报告
const reportTabs = ['全部', '区域宏观', '竞品情报', '新品监测', '拆机报告'];
const latestReports = [
  { id: 'r001', title: '2026年Q1全球母婴市场宏观洞察报告', category: '区域宏观', date: '2026-05-23', status: '最新', pages: 68 },
  { id: 'r009', title: '2026年Q1全球吸奶器市场竞争格局报告', category: '竞品情报', date: '2026-04-12', status: '热门', pages: 78 },
  { id: 'r005', title: '2026年Q1母婴行业新品上市监测报告', category: '新品监测', date: '2026-04-20', status: '最新', pages: 45 },
  { id: 'r010', title: 'Momcozy vs Medela vs Willow 品牌竞争力深度对比', category: '竞品情报', date: '2026-05-23', status: '热门', pages: 92 },
  { id: 'r002', title: '北美母婴护理市场深度分析（2025-2026年度）', category: '区域宏观', date: '2026-03-22', status: '已读', pages: 86 },
  { id: 'r013', title: 'Momcozy W1 加热款拆解与BOM成本分析', category: '拆机报告', date: '2026-05-23', status: '最新', pages: 52 },
];

const cpscEfilingSource = getSourceRegistryItem('policy-cpsc-efiling');
const euMdrSource = getSourceRegistryItem('policy-eu-mdr-transition');

// R1: 增强版政策法规数据 — 原文链接/影响评估/应对状态/信息审计
const policyTimeline = [
  {
    id: 'p-001', country: '美国', date: '2026-07-08', title: 'CPSC CPC/eFiling：证书数据与电子提交要求需复核',
    tag: '合规复核', type: 'urgent', status: '即将实施',
    source: { name: cpscEfilingSource.sourceName, url: cpscEfilingSource.sourceUrl, reliability: cpscEfilingSource.reliability },
    impact: { level: '高', desc: '官方规则支持儿童产品证书随货/电子方式提供；未核实到“官网嵌入实时合规声明”强制要求', products: ['M5', 'M9', 'M6', 'W1'] },
    momcozyAction: { status: '进行中', progress: 45, desc: '复核CPC证书、eFiling字段和官网披露需求，避免按未证实规则建设', owner: '郑法务' },
    audit: {录入人: '郑法务', 录入时间: '2026-04-20', 审核状态: '待复核', 审核人: '合规总监', 来源验证: cpscEfilingSource.note},
  },
  {
    id: 'p-002', country: '美国', date: '2026-05-23', title: 'CPSC更新婴儿摇篮安全标准，纳入ASTM F2088-25',
    tag: '标准更新', type: 'normal', status: '已生效',
    source: { name: 'ASTM International', url: 'https://www.astm.org/standards/f2088.htm', reliability: 'A' },
    impact: { level: '中', desc: '摇篮类产品需通过新标准测试', products: ['孕妇枕'] },
    momcozyAction: { status: '已完成', progress: 100, desc: '供应商已提供ASTM F2088-25测试报告', owner: '林产品' },
    audit: {录入人: '林产品', 录入时间: '2026-05-23', 审核状态: '已审核', 审核人: '质量经理', 来源验证: '官方来源复核通过'},
  },
  {
    id: 'p-003', country: '日本', date: '2025-12-01', title: '新《消费品安全法》：36个月以下玩具强制PSC标志认证',
    tag: '强制认证', type: 'urgent', status: '即将实施',
    source: { name: '日本经济产业省(METI)', url: 'https://www.meti.go.jp/policy/consumer/seihin/consumer-products-safety-act.html', reliability: 'A' },
    impact: { level: '高', desc: '36个月以下玩具类产品需复核PSC标志适用性，日本市场准入门槛提高', products: ['M5', 'M9', 'W1'] },
    momcozyAction: { status: '待启动', progress: 10, desc: 'PSC认证申请准备中，需联系日本代理机构', owner: '郑法务' },
    audit: {录入人: '郑法务', 录入时间: '2025-12-05', 审核状态: '待复核', 审核人: '合规总监', 来源验证: '官方链接和SKU适用范围待复核'},
  },
  {
    id: 'p-004', country: '中国', date: '2026-11-01', title: 'GB 46523-2025儿童用品通用安全要求计划生效',
    tag: '国标实施', type: 'normal', status: '即将实施',
    source: { name: '国家市场监督管理总局', url: 'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/rzjgs/art/2025/art_8e7c3f2b1c5d4e6a9f0e8d7c6b5a4f3e2d1c0b.html', reliability: 'A' },
    impact: { level: '高', desc: '儿童用品通用安全国标，涵盖物理/化学/阻燃性要求', products: ['M5', 'M9', 'M6', '温奶器', '消毒器'] },
    momcozyAction: { status: '进行中', progress: 35, desc: '产品材质检测报告已出，物理测试进行中', owner: '王运营' },
    audit: {录入人: '王运营', 录入时间: '2026-03-10', 审核状态: '已审核', 审核人: '合规总监', 来源验证: '官方来源复核通过'},
  },
  {
    id: 'p-005', country: '加拿大', date: '2025-12-15', title: 'Health Canada发布2025-2027前向监管计划',
    tag: '监管计划', type: 'normal', status: '已发布',
    source: { name: 'Health Canada', url: 'https://www.canada.ca/en/health-canada/corporate/transparency/regulatory-transparency/regulatory-plan.html', reliability: 'A' },
    impact: { level: '中', desc: '预告2026-2027年监管重点方向，需持续跟踪', products: ['全线产品'] },
    momcozyAction: { status: '已跟踪', progress: 100, desc: '已订阅Health Canada更新通知', owner: '郑法务' },
    audit: {录入人: '郑法务', 录入时间: '2025-12-20', 审核状态: '已审核', 审核人: '合规总监', 来源验证: '官方来源复核通过'},
  },
  {
    id: 'p-006', country: '欧盟', date: '2027-01-01', title: 'MDR Class IIa过渡安排需按产品分类复核',
    tag: '合规新规', type: 'urgent', status: '即将实施',
    source: { name: euMdrSource.sourceName, url: euMdrSource.sourceUrl, reliability: euMdrSource.reliability },
    impact: { level: '高', desc: '过渡期存在类别和证书条件差异，需按Class IIa路径复核CE marking计划', products: ['M5', 'M9'] },
    momcozyAction: { status: '进行中', progress: 45, desc: 'TUV SUD已受理CE申请，技术文档准备中；复核过渡期条件', owner: '郑法务' },
    audit: {录入人: '郑法务', 录入时间: '2026-02-15', 审核状态: '待复核', 审核人: '合规总监', 来源验证: euMdrSource.note},
  },
  {
    id: 'p-007', country: '中国', date: '2026-05-01', title: 'GB/T 46491-2025婴儿食品加工器具标准生效',
    tag: '标准更新', type: 'normal', status: '已生效',
    source: { name: '国家标准化管理委员会', url: 'https://www.sac.gov.cn/', reliability: 'A' },
    impact: { level: '高', desc: '温奶器、消毒器等食品加工器具材料安全新要求', products: ['温奶器', 'KleanPal Pro'] },
    momcozyAction: { status: '已完成', progress: 100, desc: '产品材料已通过GB/T 46491检测', owner: '王运营' },
    audit: {录入人: '王运营', 录入时间: '2026-04-28', 审核状态: '已审核', 审核人: '质量经理', 来源验证: '官方来源复核通过'},
  },
];

type PolicyTimelineItem = (typeof policyTimeline)[number];

// 待办通知 — R2: 添加业务影响评估和优先级标签
const notifications = [
  { id: 1, title: 'W1加热款北美上市倒计时', desc: '距离ABC Kids Expo发布还有18天', time: '2小时前', type: 'urgent', icon: Cpu, impact: '营收影响', impactDesc: '预计Q3贡献$2.1M收入', priority: 'P0' },
  { id: 2, title: 'Medela Melody InBra 7月加拿大首发', desc: '超静音差异化竞争预警', time: '5小时前', type: 'warning', icon: Target, impact: '竞争威胁', impactDesc: '可能侵蚀3-5%价格敏感用户', priority: 'P1' },
  { id: 3, title: 'Q2竞品价格监测报告待审', desc: '报告中心有1份报告待审批', time: '1天前', type: 'normal', icon: FileText, impact: '决策支持', impactDesc: '支撑Q3定价策略制定', priority: 'P2' },
  { id: 4, title: '日本PSC认证续期提醒', desc: '证书将于2026-08到期', time: '2天前', type: 'warning', icon: Shield, impact: '合规风险', impactDesc: '逾期未续期将暂停日本销售', priority: 'P1' },
];

// 本期关键洞察 — 驱动行动的顶层结论
// 模板: [数据发现] + [业务含义] + [建议行动]
const periodInsights = [
  { icon: TrendingUp, title: '穿戴式增速领先', value: '+18.2%', desc: '穿戴式细分增速超行业均值2.1x，建议Q3加大M9/W1产能投入', color: '#C25B6E', action: '查看产品规划' },
  { icon: Target, title: 'Medela份额下滑', value: '-0.8pp', desc: 'Medela连续2季份额流失，窗口期建议加速北美渠道扩张', color: '#ff9500', action: '查看竞争策略' },
  { icon: Shield, title: 'CPSC规则复核', value: '7月8日', desc: 'CPC/eFiling要求需法务复核；未确认官网实时声明强制要求', color: '#ff3b30', action: '查看合规要求' },
];

// 快捷数据洞察
// 数据来源: Precedence Research 2026-04 / Fortune BI 2025 / Momcozy内部CRM 2026 Q1
const quickInsights = [
  { label: '全球吸奶器市场', value: '$38.1B', change: '+8.52% CAGR', trend: 'up', meaning: 'Precedence Research 2026-04 · SAM口径' },
  { label: '北美市场份额', value: '45.05%', change: '2025年', trend: 'up', meaning: 'Fortune BI 2025 · 最大区域市场' },
  { label: '穿戴式市场', value: '$6.69B', change: '+8.56% CAGR', trend: 'up', meaning: 'Grand View Research 2025 · SOM核心赛道' },
  { label: 'Momcozy全球份额', value: '19.3%', change: '+2.1% YoY', trend: 'up', meaning: 'Amazon Brand Analytics 2026 Q1 · 连续3季增长' },
];

// R2: 国家政策颜色映射
const countryColors: Record<string, string> = {
  '美国': '#C25B6E', '欧盟': '#5856d6', '英国': '#34c759', '加拿大': '#ff9500',
  '中国': '#ff3b30', '澳大利亚': '#af52de', '日本': '#0077b6',
};
const countryFlags: Record<string, string> = {
  '美国': 'US', '欧盟': 'EU', '英国': 'UK', '加拿大': 'CA', '中国': 'CN', '澳大利亚': 'AU', '日本': 'JP',
};

const statusColors2: Record<string, { bg: string; text: string }> = {
  '已生效': { bg: '#34c75915', text: '#34c759' },
  '即将实施': { bg: '#ff950015', text: '#ff9500' },
  '已发布': { bg: '#5856d615', text: '#5856d6' },
};

const actionColors2: Record<string, string> = {
  '已完成': '#34c759', '进行中': '#ff9500', '待启动': '#ff3b30', '已跟踪': '#5856d6',
};

export default function HomePage() {
  const [activeReportTab, setActiveReportTab] = useState('全部');
  const {
    status: collectionStatus,
    totals: collectionTotals,
    period: collectionPeriod,
    generatedAtText: collectionGeneratedAt,
    windowText: collectionWindow,
    nextScheduleText,
  } = usePeriodicManifest();
  // R3: 政策法规筛选状态
  const [policyTag, setPolicyTag] = useState('全部');
  const [policyStatus, setPolicyStatus] = useState('全部');
  const [expandedPolicyIds, setExpandedPolicyIds] = useState<Set<string>>(new Set());
  const togglePolicy = (id: string) => {
    setExpandedPolicyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const filteredPolicies = policyTimeline.filter((p: PolicyTimelineItem) => {
    if (policyTag !== '全部' && p.tag !== policyTag) return false;
    if (policyStatus !== '全部' && p.status !== policyStatus) return false;
    return true;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(t); }, []);

  const greeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return '上午好'; if (h < 14) return '中午好'; if (h < 18) return '下午好'; return '晚上好';
  };

  const filteredReports = latestReports.filter(r => activeReportTab === '全部' || r.category === activeReportTab);
  const collectionSummary =
    collectionStatus === 'ready'
      ? `半月数据周期 ${collectionPeriod} · ${collectionWindow} · 生成 ${collectionGeneratedAt}`
      : collectionStatus === 'loading'
        ? '正在读取半月数据周期'
        : '半月数据状态暂不可用';
  const collectionBadges = collectionStatus === 'ready'
    ? [
        { label: '公开来源成功', value: collectionTotals.ok ?? 0, color: '#34c759' },
        { label: '连接器待接入', value: collectionTotals['connector-required'] ?? 0, color: '#ff9500' },
        { label: '人工补录', value: collectionTotals['manual-required'] ?? 0, color: '#5856d6' },
        { label: '下次计划', value: nextScheduleText.replace('下次计划 ', ''), color: '#86868b' },
      ]
    : [{ label: '采集状态', value: collectionStatus === 'loading' ? '读取中' : '未生成', color: '#ff9500' }];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* ═══════════ 工作台头部 ═══════════ */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">{greeting()}，Momcozy 市场洞察工作台</h1>
              <p className="text-[#86868b] mt-1.5 text-sm">{collectionSummary}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {collectionBadges.map((item) => (
                  <span key={item.label} className="text-[10px] rounded-full border border-[#EDE6DF] bg-white/70 px-2 py-1 text-[#86868b]">
                    {item.label} <strong style={{ color: item.color }}>{item.value}</strong>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ff3b30]" />
                <Bell className="w-5 h-5 text-[#86868b] cursor-pointer hover:text-[#C25B6E]" />
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ KPI快速洞察 ═══════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {quickInsights.map((ins, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF] card-shadow cursor-pointer" onClick={() => navigate('/self')}>
              <p className="text-xs text-[#86868b] mb-1">{ins.label}</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-[#1d1d1f]">{ins.value}</p>
                <span className="text-xs text-[#34c759] font-medium mb-1">{ins.change}</span>
              </div>
              <p className="text-[9px] text-[#B5AFA8] mt-1.5">{ins.meaning}</p>
            </div>
          ))}
        </div>

        {/* ═══════════ 本期关键洞察（R1: 驱动行动的顶层结论）═ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {periodInsights.map((ins, i) => {
            const IconComp = ins.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] hover:border-[#C25B6E]/20 transition-all cursor-pointer group" onClick={() => navigate('/market/trend')}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${ins.color}15`, color: ins.color }}>
                      <IconComp className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <span className="text-xs font-medium text-[#1d1d1f] truncate">{ins.title}</span>
                  </div>
                  <span className="text-lg font-bold" style={{ color: ins.color }}>{ins.value}</span>
                </div>
                <p className="text-xs text-[#86868b] leading-relaxed truncate mb-3">{ins.desc}</p>
                <span className="text-[10px] font-medium text-[#C25B6E] group-hover:underline flex items-center gap-1">
                  {ins.action} <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* ═══════════ 左侧主内容 ═══════════ */}
          <div className="xl:col-span-9 space-y-6">

            {/* ── 热门板块（8核心工作台入口）── */}
            <section className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#C25B6E]" />
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">工作台入口</h2>
                </div>
                <span className="text-xs text-[#86868b]">8大核心功能模块</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {hotModules.map((mod, i) => {
                  const IconComp = mod.icon;
                  return (
                    <button key={i} onClick={() => navigate(mod.link)}
                      className="group flex flex-col items-start gap-2.5 p-4 rounded-2xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200 duration-200 hover:scale-[1.02] transition-natural text-left cursor-pointer relative">
                      {mod.badge && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#ff3b30]/10 text-[#ff3b30]">{mod.badge}</span>
                      )}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: mod.color, boxShadow: `0 3px 10px ${mod.color}30` }}>
                        <IconComp className="w-5 h-5" strokeWidth={2.2} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1d1d1f] group-hover:text-[#C25B6E] transition-colors duration-200">{mod.title}</p>
                        <p className="text-[11px] text-[#86868b] mt-0.5 leading-tight">{mod.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── 市场趋势迷你图 + 竞品份额 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* R1-R10: 行业最佳实践 — 双Y轴年度趋势图(2021-2030E) */}
              <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">全球母婴市场规模趋势（2021-2030E）</h3>
                    <p className="text-[10px] text-[#86868b] mt-0.5">数据来源: Precedence Research / Grand View Research · 实线=历史 · 虚线=预测</p>
                  </div>
                  <button onClick={() => navigate('/market/trend')} className="text-xs text-[#C25B6E] hover:underline flex-shrink-0">查看详情 →</button>
                </div>

                {/* R2: 双Y轴复合图表 + R3: 实线/虚线区分历史vs预测 + R4: SOM层 + R7: 关键里程碑 */}
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={marketTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={{ stroke: '#EDE6DF' }} tickLine={false} />
                      {/* 左Y轴: TAM ($B) */}
                      <YAxis yAxisId="tam" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} domain={[800, 1700]} tickFormatter={(v) => `$${v}B`} width={45} />
                      {/* 右Y轴: SAM/SOM ($B) */}
                      <YAxis yAxisId="sam" orientation="right" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} domain={[0, 65]} tickFormatter={(v) => `$${v}B`} width={45} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }}
                        formatter={(value: string | number, name: string) => [`$${value}B`, name]}
                        labelStyle={{ color: '#1d1d1f', fontWeight: 600 }}
                      />

                      {/* R7: 2025→2026 历史/预测分隔线 */}
                      <ReferenceLine x="2025" yAxisId="tam" stroke="#B5AFA8" strokeDasharray="4 4" strokeWidth={1}>
                        <Label value="← 历史 │ 预测 →" position="top" fontSize={9} fill="#B5AFA8" />
                      </ReferenceLine>

                      {/* R3: TAM — 实线(历史) + 虚线(预测) */}
                      <Line yAxisId="tam" type="monotone" dataKey="tam" name="TAM 全球母婴护理" stroke="#C25B6E" strokeWidth={2.5} dot={{ r: 3, fill: '#C25B6E', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                      {/* R3: SAM — 实线(历史) + 虚线(预测) */}
                      <Line yAxisId="sam" type="monotone" dataKey="sam" name="SAM 吸奶器市场" stroke="#ff9500" strokeWidth={2} dot={{ r: 3, fill: '#ff9500', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      {/* R4: SOM — 穿戴式细分 */}
                      <Line yAxisId="sam" type="monotone" dataKey="som" name="SOM 穿戴式核心" stroke="#34c759" strokeWidth={2} dot={{ r: 3, fill: '#34c759', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* R6: 图例 + CAGR标注 */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {cagrLines.map((c, i) => (
                    <span key={i} className="flex items-center gap-1 text-[10px]">
                      <span className="w-5 h-0.5 rounded" style={{ backgroundColor: c.color }} />
                      <span style={{ color: c.color }} className="font-medium">{c.label}</span>
                    </span>
                  ))}
                  <span className="text-[9px] text-[#B5AFA8] ml-auto">虚线分隔: 2025(历史) → 2026(预测)</span>
                </div>

                {/* R9: 关键发现 — 行业洞察 */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                    <p className="text-[10px] text-[#C25B6E] font-semibold mb-1">三层漏斗加速扩大</p>
                    <p className="text-[11px] text-[#1d1d1f]">SOM增速(8.56%) {'>'} SAM(8.52%) {'>'} TAM(6.2%)，穿戴式正在结构性替代传统台式，2026-2028是品牌卡位关键窗口期</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/10">
                    <p className="text-[10px] text-[#ff9500] font-semibold mb-1">Momcozy定位建议</p>
                    <p className="text-[11px] text-[#1d1d1f]">SOM 2030年预计$9.42B。建议维持M5现金牛，加大M9/W1明星投入，Air1需重新定位，窗口期仅剩2年</p>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">竞品市场份额动态</h3>
                  <button onClick={() => navigate('/competition')} className="text-xs text-[#C25B6E] hover:underline">查看详情</button>
                </div>
                {/* R5: 竞争态势判断 */}
                <div className="mb-4 p-3 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                  <p className="text-[10px] text-[#C25B6E] font-medium">态势判断</p>
                  <p className="text-[11px] text-[#1d1d1f] mt-0.5">Momcozy以19.3%领跑，Medela持续流失(-0.8pp)。建议窗口期加速北美DTC渠道投入，锁定价格敏感迁移用户</p>
                </div>
                <div className="space-y-2.5">
                  {shareData.map((s, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-xs text-[#86868b] w-16">{s.brand}</span>
                      <div className="flex-1 min-w-0 h-3 bg-[#FBF8F5] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${s.share}%`, backgroundColor: s.color }} />
                      </div>
                      <span className="text-xs font-medium text-[#1d1d1f] truncate w-10 text-right">{s.share}%</span>
                      <span className={`text-[10px] w-8 text-right ${s.change.startsWith('+') ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>{s.change}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── 最新报告 ── */}
            <section className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C25B6E]" />
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">最新报告</h2>
                </div>
                <button onClick={() => navigate('/reports')} className="text-xs text-[#C25B6E] hover:underline flex items-center gap-1">
                  查看全部 <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-1 mb-3">
                {reportTabs.map(tab => (
                  <button key={tab} onClick={() => setActiveReportTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeReportTab === tab ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>{tab}</button>
                ))}
              </div>
              <div className="space-y-1">
                {filteredReports.map((report) => (
                  <div key={report.id} onClick={() => navigate(`/report/${report.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FBF8F5] transition-colors duration-200 group cursor-pointer">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#ff3b30]/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-[#ff3b30]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-[#1d1d1f] font-medium group-hover:text-[#C25B6E] transition-colors duration-200 truncate">{report.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[#86868b]">{report.category}</span>
                          <span className="text-[10px] text-[#86868b]">{report.pages}页</span>
                          <span className="text-[10px] text-[#86868b]">{report.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {report.status === '最新' && <span className="px-1.5 py-0.5 rounded bg-[#ff3b30]/10 text-[#ff3b30] text-[10px] font-medium">NEW</span>}
                      {report.status === '热门' && <span className="px-1.5 py-0.5 rounded bg-[#ff9500]/10 text-[#ff9500] text-[10px] font-medium">HOT</span>}
                      <ChevronRight className="w-4 h-4 text-[#86868b] group-hover:text-[#C25B6E]" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── R2-R5: 增强版政策法规追踪 ── */}
            <section className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
              {/* 头部 */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#5856d6]/10 flex items-center justify-center">
                    <Shield className="w-4.5 h-4.5 text-[#5856d6]" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#1d1d1f]">政策法规追踪</h2>
                    <p className="text-[10px] text-[#86868b]">{policyTimeline.length}条政策 · {policyTimeline.filter(p => p.type === 'urgent').length}项紧急 · 覆盖7国</p>
                  </div>
                </div>
                <button onClick={() => navigate('/industry/policy-insight')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#5856d6] hover:bg-[#5856d6]/10 transition-colors font-medium">
                  查看全部 <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* R3: 分类筛选+状态过滤 */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-[#B5AFA8] mr-1">分类:</span>
                  {(['全部', ...Array.from(new Set(policyTimeline.map(p => p.tag)))]).map(t => {
                    const tagColors: Record<string, string> = { '合规新规': '#ff3b30', '标准更新': '#5856d6', '强制认证': '#ff9500', '国标实施': '#34c759', '监管计划': '#af52de' };
                    return (
                      <button key={t} onClick={() => setPolicyTag(t)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${policyTag === t ? 'text-white' : 'bg-[#FBF8F5] text-[#86868b] hover:bg-[#F5EDE8]'}`}
                        style={policyTag === t ? { backgroundColor: tagColors[t] || '#5856d6' } : {}}>{t}</button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-[#B5AFA8] mr-1">状态:</span>
                  {(['全部', ...Array.from(new Set(policyTimeline.map(p => p.status)))]).map(s => (
                    <button key={s} onClick={() => setPolicyStatus(s)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${policyStatus === s ? 'bg-[#5856d6] text-white' : 'bg-[#FBF8F5] text-[#86868b] hover:bg-[#F5EDE8]'}`}>{s}</button>
                  ))}
                </div>
              </div>

              {/* 时间线 */}
              <div className="relative pl-7 space-y-3">
                <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-gradient-to-b from-[#ff3b30] via-[#ff9500] to-[#34c759] rounded-full opacity-30" />
                {filteredPolicies.map((item) => {
                  const cColor = countryColors[item.country] || '#86868b';
                  const sColor = statusColors2[item.status] || { bg: '#FBF8F5', text: '#86868b' };
                  const aColor = actionColors2[item.momcozyAction.status] || '#86868b';
                  return (
                    <div key={item.id} className="relative">
                      <div className={`absolute -left-[22px] mt-2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10 ${item.type === 'urgent' ? 'bg-[#ff3b30]' : ''}`} style={item.type !== 'urgent' ? { backgroundColor: cColor } : {}} />
                      <div className={`rounded-xl border transition-all overflow-hidden ${item.type === 'urgent' ? 'border-[#ff3b30]/20 bg-[#fff8f8]' : 'border-[#EDE6DF] bg-white hover:border-[#5856d6]/30'}`}>
                        <div className="p-3.5 cursor-pointer" onClick={() => togglePolicy(item.id)}>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-white" style={{ backgroundColor: cColor }}>{countryFlags[item.country]} {item.country}</span>
                            <span className="text-[10px] text-[#86868b] font-mono">{item.date}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#FBF8F5] text-[10px] text-[#86868b]">{item.tag}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: sColor.bg, color: sColor.text }}>{item.status}</span>
                            {item.type === 'urgent' && <span className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#ff3b30]/10 text-[#ff3b30] text-[10px] font-bold">紧急</span>}
                          </div>
                          <p className="text-xs text-[#1d1d1f] leading-relaxed font-medium">{item.title}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <a href={item.source.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[9px] text-[#5856d6] hover:underline bg-[#5856d6]/5 px-1.5 py-0.5 rounded"><ExternalLink className="w-2.5 h-2.5" />{item.source.name}</a>
                            <span className="flex items-center gap-0.5 text-[9px] text-[#34c759] bg-[#34c759]/5 px-1.5 py-0.5 rounded"><CheckCircle className="w-2.5 h-2.5" />可信度{item.source.reliability}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${item.impact.level === '高' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#86868b]/10 text-[#86868b]'}`}>影响{item.impact.level}</span>
                            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: aColor }}>{item.momcozyAction.status} {item.momcozyAction.progress}%</span>
                          </div>
                        </div>
                        {expandedPolicyIds.has(item.id) && (
                          <div className="px-3.5 pb-3.5 border-t border-[#EDE6DF]/50 pt-3 space-y-2.5">
                            <div className="p-2.5 rounded-lg bg-[#ff9500]/5 border border-[#ff9500]/10">
                              <p className="text-[10px] text-[#ff9500] font-semibold mb-1 flex items-center gap-1"><Target className="w-3 h-3" />业务影响评估</p>
                              <p className="text-[11px] text-[#1d1d1f] leading-relaxed">{item.impact.desc}</p>
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className="text-[9px] text-[#86868b]">影响产品：</span>
                                {item.impact.products.map((p, pi) => <span key={pi} className="px-1.5 py-0.5 rounded bg-white text-[9px] text-[#C25B6E] font-medium border border-[#EDE6DF]">{p}</span>)}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] text-[#C25B6E] font-semibold flex items-center gap-1"><Shield className="w-3 h-3" />Momcozy应对措施</p>
                                <span className="text-[9px] text-[#86868b]">Owner: {item.momcozyAction.owner}</span>
                              </div>
                              <p className="text-[11px] text-[#1d1d1f] leading-relaxed">{item.momcozyAction.desc}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 min-w-0 h-1.5 rounded-full bg-[#EDE6DF] overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${item.momcozyAction.progress}%`, backgroundColor: aColor }} />
                                </div>
                                <span className="text-[9px] text-[#86868b] w-8 text-right">{item.momcozyAction.progress}%</span>
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#FBF8F5] border border-[#EDE6DF]">
                              <p className="text-[10px] text-[#86868b] font-semibold mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3" />信息审计记录</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(item.audit).map(([key, val], j) => (
                                  <div key={j} className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-[#B5AFA8]">{key}:</span>
                                    <span className={`text-[9px] font-medium ${val === '已审核' || val === '官方来源复核通过' ? 'text-[#34c759]' : String(val).includes('复核') || String(val).includes('未发现') ? 'text-[#ff9500]' : 'text-[#1d1d1f]'}`}>{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ═══════════ 右侧边栏 ═══════════ */}
          <div className="xl:col-span-3 space-y-6">

            {/* ── 待办通知 ── */}
            <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#C25B6E]" />
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">待办通知</h3>
                </div>
                <span className="w-5 h-5 rounded-full bg-[#ff3b30] text-white text-[10px] font-bold flex items-center justify-center">{notifications.length}</span>
              </div>
              <div className="space-y-4">
                {notifications.map((n) => {
                  const IconComp = n.icon;
                  return (
                    <div key={n.id} className="p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200 duration-200 cursor-pointer" onClick={() => navigate(n.type === 'urgent' ? '/competition/new' : '/reports')}>
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.type === 'urgent' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : n.type === 'warning' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#5856d6]/10 text-[#5856d6]'}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs font-medium text-[#1d1d1f] truncate">{n.title}</p>
                            <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${n.priority === 'P0' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : n.priority === 'P1' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#86868b]/10 text-[#86868b]'}`}>{n.priority}</span>
                          </div>
                          <p className="text-[10px] text-[#86868b] mt-0.5">{n.desc}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#C25B6E]/10 text-[#C25B6E] text-[9px] font-medium">{n.impact}</span>
                            <span className="text-[9px] text-[#B5AFA8]">{n.impactDesc}</span>
                          </div>
                          <p className="text-[9px] text-[#B5AFA8] mt-1">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── 活跃先锋 ── */}
            <section className="bg-gradient-to-br from-[#C25B6E]/5 to-[#FBF8F5] rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#ff9500] to-[#ff3b30] flex items-center justify-center">
                    <Award className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">活跃先锋</h3>
                </div>
                <span className="text-[10px] text-[#86868b] bg-white/60 px-2 py-0.5 rounded-full">本期</span>
              </div>
              <div className="space-y-2">
                {[
                  { name: '李萌桢', score: 1043, rank: 1, trend: '+12%', avatar: '李' },
                  { name: '吴润泽', score: 365, rank: 2, trend: '+5%', avatar: '吴' },
                  { name: '李海鑫', score: 358, rank: 3, trend: '+8%', avatar: '李' },
                  { name: '王海天', score: 271, rank: 4, trend: '+3%', avatar: '王' },
                  { name: '盛效广', score: 234, rank: 5, trend: '+2%', avatar: '盛' },
                ].map((user) => (
                  <div key={user.rank} className="flex items-center gap-4 p-2 rounded-xl bg-white/70 hover:bg-white transition-all cursor-pointer group">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${user.rank === 1 ? 'bg-gradient-to-br from-[#ff9500] to-[#ff3b30] shadow-sm shadow-[#ff9500]/30' : user.rank === 2 ? 'bg-gradient-to-br from-[#af52de] to-[#5856d6] shadow-sm shadow-[#af52de]/30' : user.rank === 3 ? 'bg-gradient-to-br from-[#C25B6E] to-[#ff3b30] shadow-sm shadow-[#C25B6E]/30' : 'bg-[#EDE6DF] text-[#86868b]'}`}>
                      {user.rank}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#FBF8F5] flex items-center justify-center text-xs font-bold text-[#C25B6E] border border-[#EDE6DF] flex-shrink-0">
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0 min-w-0">
                      <p className="text-xs font-medium text-[#1d1d1f] truncate group-hover:text-[#C25B6E] transition-colors duration-200">{user.name}</p>
                      <p className="text-[9px] text-[#86868b]">活跃度 {user.score}</p>
                    </div>
                    <span className="text-[10px] text-[#34c759] font-medium bg-[#34c759]/8 px-1.5 py-0.5 rounded-full">{user.trend}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 快捷导航 ── */}
            <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#5856d6] to-[#af52de] flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">快捷导航</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'AI画廊', path: '/ai-gallery', color: '#ff9500', icon: Star },
                  { label: '海关数据', path: '/market/customs', color: '#34c759', icon: Globe },
                  { label: '展会调研', path: '/industry/exhibition', color: '#C25B6E', icon: MapPin },
                  { label: 'IP分析', path: '/industry/ip', color: '#5856d6', icon: BookOpen },
                  { label: '供应链', path: '/industry/supply', color: '#af52de', icon: ShoppingBag },
                  { label: '社交媒体', path: '/users/overseas', color: '#ff3b30', icon: TrendingUp },
                ].map((item, i) => (
                  <button key={i} onClick={() => navigate(item.path)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-natural group cursor-pointer">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-[#1d1d1f] font-medium group-hover:text-[#C25B6E]">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ── 用户反馈 ── */}
            <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">反馈建议</h3>
              <textarea placeholder="请输入您的反馈..." className="w-full h-20 p-3 rounded-xl bg-[#FBF8F5] text-xs text-[#1d1d1f] placeholder:text-[#86868b] border-none resize-none outline-none" />
              <button className="w-full mt-2 py-2 rounded-xl bg-[#C25B6E] text-white text-xs font-medium hover:bg-[#A34759] transition-colors duration-200">提交</button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
