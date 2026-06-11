import { useState } from 'react';
import { LayoutGrid, FileBarChart, Map as MapIcon, Database, TrendingUp, Zap, Shield, ArrowUpRight, AlertTriangle, CheckCircle, Flame, Cpu, Baby } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import Sidebar from '@/components/Sidebar';

// ── 2026 NEW PRODUCT DATA (Latest as of May 2026) ──
const newProducts2026 = [
  { date: '2026-05', brand: 'Momcozy', name: 'W1 Wearable', category: '吸奶器', price: '$219', highlight: '内置加热+按摩技术 · ABC Kids Expo 2026首发', threat: '自研', trend: '+45%' },
  { date: '2026-05', brand: 'Momcozy', name: 'BM08 Smart Baby Monitor', category: '智能监视器', price: '$149', highlight: 'AI睡眠监测+呼吸追踪', threat: '自研', trend: '+30%' },
  { date: '2026-05', brand: 'Momcozy', name: 'Birth Ease Maternity Ball', category: '孕期护理', price: '$39', highlight: '分娩辅助+产后恢复', threat: '自研', trend: '+18%' },
  { date: '2026-05', brand: 'Momcozy', name: 'Red Light Therapy Device', category: '产后恢复', price: '$89', highlight: '红光治疗+伤口愈合', threat: '自研', trend: '+22%' },
  { date: '2026-01', brand: 'Momcozy', name: 'Air1 Ultra-Slim', category: '吸奶器', price: '$159', highlight: '2.4英寸超薄(比传统薄20%) · Q1美国上市', threat: '自研', trend: '+38%' },
];

const newProducts2025 = [
  { date: '2025-12', brand: 'Medela', name: 'Melody InBra', category: '穿戴式', price: '$349', highlight: '超静音+极简操作', threat: '中', trend: '+15%' },
  { date: '2025-10', brand: 'Medela', name: 'Motion InBra', category: '穿戴式', price: '$299', highlight: '2-Phase Expression®医院级+11.8%奶量提升', threat: '高', trend: '+22%' },
  { date: '2025-10', brand: 'Momcozy', name: 'M9 Mobile Flow', category: '穿戴式', price: '$199', highlight: '气泵隔膜结构+APP控制', threat: '自研', trend: '+35%' },
  { date: '2025-09', brand: 'Willow', name: 'Willow Sync™', category: '穿戴式', price: '$199', highlight: '保险独家发售+AI助手Ema', threat: '高', trend: '+18%' },
  { date: '2025-08', brand: 'Momcozy', name: 'M5 Wearable', category: '穿戴式', price: '$159', highlight: 'DoubleFit法兰+38dB静音', threat: '自研', trend: '+42%' },
  { date: '2025-06', brand: 'Ameda', name: 'GLO Wearable', category: '穿戴式', price: '$249', highlight: 'Milk Optimizing Tech+2025 Baby Innovation Award', threat: '中', trend: '+18%' },
  { date: '2025-05', brand: 'Medela', name: 'Magic InBra', category: '穿戴式', price: '$329', highlight: 'FluidFeel Technology', threat: '高', trend: '+12%' },
  { date: '2025-05', brand: 'eufy', name: 'E20 Wearable', category: '穿戴式', price: '$179', highlight: 'HeatFlow技术+温热功能', threat: '中', trend: '+8%' },
  { date: '2025-01', brand: 'Willow+Elvie', name: '配件系列', category: '配件', price: '$29-49', highlight: '硅胶集乳器+玻璃储奶瓶', threat: '低', trend: '+300%配件增长' },
];

const upcoming2026 = [
  { date: '2026-07', brand: 'Medela', name: 'Magic InBra', category: '加拿大上市', price: '$329', highlight: '加拿大首发+医院级认证', threat: '高', trend: '待监测' },
  { date: '2026-08', brand: 'Imani', name: 'i2plus Pro Series', category: '穿戴式', price: '$249', highlight: '全球首款2部件免提罩杯', threat: '中', trend: '待监测' },
  { date: '2026-08', brand: 'Philips Avent', name: 'Hands-free Breast Pump', category: '穿戴式', price: '$179', highlight: '印度首发+性价比定位', threat: '中', trend: '待监测' },
  { date: '2026-09', brand: 'Hegen', name: 'PCTO Wearable Pump', category: '穿戴式', price: '$199', highlight: '新加坡品牌首次进入穿戴式赛道', threat: '中', trend: '待监测' },
  { date: '2026-Q3', brand: 'Momcozy', name: 'Deep Clean Bottle Washer', category: '清洁电器', price: '$89', highlight: '奶瓶深度清洗+UV消毒', threat: '自研', trend: '待监测' },
];

// 2026 Market Data

const threatMatrix = [
  { brand: 'Medela', count: 5, threatLevel: '高', color: '#ff3b30', reason: '2026年7月Magic InBra加拿大上市+Melody/Motion三连发', action: '加速W1加热功能营销+价格优势' },
  { brand: 'Willow+Elvie', count: 3, threatLevel: '高', color: '#ff3b30', reason: 'Willow Sync保险渠道+配件生态300%增长', action: '关注保险报销渠道+配件布局' },
  { brand: 'Ameda', count: 2, threatLevel: '中', color: '#ff9500', reason: 'GLO获奖+Pearl医院级认证+Walgreens渠道', action: '监控零售扩张+医院渠道' },
  { brand: 'Imani', count: 1, threatLevel: '中', color: '#ff9500', reason: 'i2plus Pro 2部件创新设计+韩国制造', action: '评估其技术差异化程度' },
  { brand: 'eufy', count: 1, threatLevel: '中', color: '#ff9500', reason: 'HeatFlow加热功能+Anker品牌背书', action: 'Momcozy W1已内置加热，先发优势' },
  { brand: 'Hegen', count: 1, threatLevel: '低', color: '#34c759', reason: 'PCTO进入穿戴式赛道但经验有限', action: '维持关注' },
];

const trend2026 = [
  { title: '加热功能成新差异化', desc: 'Momcozy W1(加热+按摩) vs eufy HeatFlow vs Medela FluidFeel — 温热技术成为2026年核心卖点', color: '#C25B6E', icon: <Flame className="w-4 h-4" /> },
  { title: 'AI集成加速', desc: 'Willow Sync集成AI助手Ema+Momcozy BM08 AI睡眠监测 — 智能母婴生态扩张', color: '#5856d6', icon: <Cpu className="w-4 h-4" /> },
  { title: '保险渠道竞争', desc: 'Willow Sync保险独家发售 — 北美保险报销渠道成为必争之地', color: '#ff9500', icon: <Shield className="w-4 h-4" /> },
  { title: '品类边界扩展', desc: 'Momcozy从吸奶器扩展到孕期护理球+红光治疗+智能监视器 — 全周期母婴生态', color: '#34c759', icon: <Baby className="w-4 h-4" /> },
  { title: '33%母亲求减负', desc: '2026 Nielsen研究：33%母亲寻求减少日常努力的产品，32%优先考虑省时方案', color: '#af52de', icon: <TrendingUp className="w-4 h-4" /> },
  { title: 'Japandi设计趋势', desc: 'ABC Kids Expo 2026趋势：日本极简+北欧温暖融合，北极动物元素 year-round', color: '#ff3b30', icon: <Zap className="w-4 h-4" /> },
];

const sidebarItems = [
  { label: '看竞争', children: [
    { label: '竞品库', path: '/competition', icon: <LayoutGrid className="w-4 h-4" /> },
    { label: '新品竞争', path: '/competition/new', icon: <FileBarChart className="w-4 h-4" /> },
    { label: '区域竞争', path: '/competition/region', icon: <MapIcon className="w-4 h-4" /> },
    { label: '产品信息管理', path: '/competition/products', icon: <Database className="w-4 h-4" /> },
  ]},
];

export default function NewCompetition() {
  const [timeFilter, setTimeFilter] = useState('全部');
  const filters = ['全部', '2026年', '2025年', '即将上市'];

  const getFiltered = () => {
    if (timeFilter === '2026年') return newProducts2026;
    if (timeFilter === '2025年') return newProducts2025;
    if (timeFilter === '即将上市') return upcoming2026;
    return [...newProducts2026, ...newProducts2025];
  };
  const filtered = getFiltered();
  const highThreat = threatMatrix.filter(t => t.threatLevel === '高').length;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm">
                    <Zap className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">新品竞争监测</h1>
                    <p className="text-xs text-[#86868b]">2025-2026年竞品新品动态 · 半月复核线索</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {filters.map(f => (
                    <button key={f} onClick={() => setTimeFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${timeFilter === f ? 'bg-[#C25B6E] text-white' : 'bg-[#FBF8F5] text-[#86868b]'}`}>{f}</button>
                  ))}
                </div>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-008']}
              title="新品线索使用边界"
              description="品牌官网和新闻稿适合支撑新品线索；销量、威胁等级和应对动作属于内部判断，不作为已验证销售结论。"
              cadence="新品线索复核口径"
            />

            {/* 2026 Market Snapshot */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '2026全球吸奶器市场', value: '$1.16B', sub: 'Coherent Market Insights', color: '#C25B6E', icon: <TrendingUp className="w-4 h-4" /> },
                { label: '2026穿戴式市场', value: '$268M', sub: 'CAGR 15.08%', color: '#ff9500', icon: <Zap className="w-4 h-4" /> },
                { label: 'Momcozy 2026新品', value: '5款', sub: 'W1/Air1/BM08等', color: '#34c759', icon: <CheckCircle className="w-4 h-4" /> },
                { label: '高威胁竞品', value: String(highThreat), sub: '需重点关注', color: '#ff3b30', icon: <AlertTriangle className="w-4 h-4" /> },
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

            {/* Threat Matrix */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center"><Shield className="w-4 h-4 text-[#ff3b30]" strokeWidth={2} /></div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">2026年竞品威胁评估</h3>
              </div>
              <div className="space-y-2">
                {threatMatrix.map((t, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[#FBF8F5]">
                    <div className="w-24 flex-shrink-0">
                      <span className="text-xs font-semibold text-[#1d1d1f]">{t.brand}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-white" style={{ backgroundColor: t.color }}>{t.threatLevel}</span>
                        <span className="text-[9px] text-[#86868b]">{t.count}款</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 min-w-0"><p className="text-[10px] text-[#86868b]">{t.reason}</p></div>
                    <div className="w-40 flex-shrink-0"><p className="text-[10px] text-[#C25B6E]">应对：{t.action}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* New Product List */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">
                  {timeFilter === '即将上市' ? '即将上市（2026 H2）' : '新品上市清单'}（{filtered.length}款）
                </h3>
                <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg"><span className="text-[#B5AFA8]">线索窗口：</span>2025-2026 · 半月复核</span>
              </div>
              <div className="space-y-2">
                {filtered.map((p, i) => (
                  <div key={i} className={`grid grid-cols-2 gap-2 p-3 rounded-xl sm:flex sm:items-center sm:gap-4 ${p.brand === 'Momcozy' ? 'bg-[#C25B6E]/5 border border-[#C25B6E]/10' : 'bg-[#FBF8F5]'}`}>
                    <div className="sm:w-16 sm:flex-shrink-0">
                      <span className="text-[10px] text-[#86868b]">{p.date}</span>
                    </div>
                    <div className="text-right sm:w-20 sm:flex-shrink-0 sm:text-left">
                      <span className={`text-xs font-semibold ${p.brand === 'Momcozy' ? 'text-[#C25B6E]' : 'text-[#1d1d1f]'}`}>{p.brand}</span>
                    </div>
                    <div className="min-w-0 sm:w-32 sm:flex-shrink-0">
                      <span className="block truncate text-xs font-medium text-[#1d1d1f]">{p.name}</span>
                    </div>
                    <div className="text-right sm:w-16 sm:flex-shrink-0 sm:text-left">
                      <span className="text-xs text-[#C25B6E] font-medium">{p.price}</span>
                    </div>
                    <div className="col-span-2 min-w-0 sm:col-span-1 sm:flex-1">
                      <p className="text-[10px] text-[#86868b]">{p.highlight}</p>
                    </div>
                    <div className="col-span-2 justify-self-end sm:col-span-1 sm:w-20 sm:flex-shrink-0 sm:text-right">
                      <span className="text-[10px] text-[#34c759] font-medium flex items-center justify-end gap-0.5">
                        <ArrowUpRight className="w-3 h-3" />{p.trend || p.threat}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2026 Trend Insights */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#5856d6]/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-[#5856d6]" strokeWidth={2} /></div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">2026年技术趋势洞察</h3>
                <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg ml-auto">ABC Kids Expo 2026 + Nielsen</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trend2026.map((t, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] border-l-2" style={{ borderColor: t.color }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div style={{ color: t.color }}>{t.icon}</div>
                      <p className="text-xs font-semibold" style={{ color: t.color }}>{t.title}</p>
                    </div>
                    <p className="text-[10px] text-[#86868b]">{t.desc}</p>
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
