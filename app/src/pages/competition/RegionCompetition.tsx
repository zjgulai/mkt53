import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { MapPin, Globe, Target, Award, LayoutGrid, FileBarChart, Map as MapIcon, Database } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import Sidebar from '@/components/Sidebar';

// ── 2026 REGIONAL DATA (Latest as of May 2026) ──
const regionData = [
  {
    region: '北美', color: '#5856d6', totalMarket: '$1.72B', cagr: '8.76%',
    summary: '全球最大单一市场，占全球33.5%。Momcozy美国份额22.2%排名第一。2026年保险报销政策持续利好，Willow Sync™通过保险渠道独家发售加剧竞争。',
    countries: [
      { name: '美国', momcozyRank: 1, momcozyShare: 22.2, topComp: 'Medela(26.5%)', channel: '亚马逊+Target+Walmart', cagr: 8.8, opportunity: '保险报销+Momcozy W1加热功能差异化', barrier: 'Medela Motion InBra 2025.10上市' },
      { name: '加拿大', momcozyRank: 1, momcozyShare: 18.5, topComp: 'Medela(24%)', channel: '沃尔玛+Shoppers+亚马逊', cagr: 6.5, opportunity: 'Magic InBra 2026.7加拿大上市需应对', barrier: '品牌认知度+法语魁北克市场' },
      { name: '墨西哥', momcozyRank: 2, momcozyShare: 15.2, topComp: 'Medela(22%)', channel: 'Mercado Libre+亚马逊', cagr: 9.5, opportunity: 'USMCA零关税+近岸外包趋势', barrier: '价格敏感+物流时效' },
    ],
  },
  {
    region: '欧洲', color: '#34c759', totalMarket: '$956M', cagr: '7.2%',
    summary: '全球最快增长区域之一。Momcozy德国份额20.2%第一。2026年Kind+Jugend 9月科隆展为主战场，MDR过渡期2027-2028为合规窗口期。',
    countries: [
      { name: '德国', momcozyRank: 1, momcozyShare: 20.2, topComp: 'Medela(23.5%)', channel: 'DM+Rossmann+亚马逊', cagr: 7.8, opportunity: 'K+J 2026.9科隆展主阵地', barrier: 'MDR认证+德语本土化' },
      { name: '英国', momcozyRank: 1, momcozyShare: 19.5, topComp: 'Medela(22.8%)', channel: 'Boots+亚马逊+Tesco', cagr: 6.5, opportunity: 'NHS补贴+英语市场低成本运营', barrier: 'UKCA marking过渡期2027' },
      { name: '法国', momcozyRank: 2, momcozyShare: 15.8, topComp: 'Medela(25%)', channel: '药妆店+电商', cagr: 7.2, opportunity: '高端定位+设计偏好契合', barrier: '法语本土化+渠道分散' },
      { name: '意大利', momcozyRank: 3, momcozyShare: 12.5, topComp: 'Chicco(18%)', channel: '母婴专卖店+电商', cagr: 5.8, opportunity: 'Artsana合作可能性', barrier: '渠道分散+支付习惯' },
      { name: '西班牙', momcozyRank: 2, momcozyShare: 16.2, topComp: 'Medela(20%)', channel: 'Druni+电商', cagr: 6.8, opportunity: '拉美裔连接+价格敏感度适中', barrier: '品牌认知度待提升' },
    ],
  },
  {
    region: '亚太', color: '#C25B6E', totalMarket: '$780M', cagr: '10.5%',
    summary: '全球增长最快区域。Momcozy日本第2(16.8%)、韩国第3(14.5%)。2026年RCEP关税减免红利持续释放，中国跨境电商渠道占比超40%。',
    countries: [
      { name: '日本', momcozyRank: 2, momcozyShare: 16.8, topComp: 'Pigeon(28%)', channel: '阿卡将+亚马逊+乐天', cagr: 5.5, opportunity: 'RCEP零关税+Air1超薄定位契合', barrier: 'PSC标志+日语本土化+Pigeon本土优势' },
      { name: '韩国', momcozyRank: 3, momcozyShare: 14.5, topComp: 'Spectra(26%)', channel: 'Gmarket+Coupang', cagr: 7.2, opportunity: '中韩FTA+Coupang直播电商', barrier: 'Spectra医院级口碑+KOL依赖' },
      { name: '澳大利亚', momcozyRank: 2, momcozyShare: 17.5, topComp: 'Medela(24%)', channel: 'Chemist Warehouse+亚马逊', cagr: 7.0, opportunity: '中澳FTA零关税+英语无障碍', barrier: 'ACCC召回标准严格' },
      { name: '中国', momcozyRank: 2, momcozyShare: 15.2, topComp: '新贝(18%)+美德乐(16%)', channel: '天猫+京东+抖音', cagr: 12.5, opportunity: 'DTC出海+国潮品牌认知', barrier: '价格战激烈+渠道费用高' },
      { name: '东南亚', momcozyRank: 3, momcozyShare: 12.8, topComp: 'Spectra(16%)', channel: 'Shopee+Lazada+TikTok', cagr: 14.2, opportunity: 'RCEP+移动电商爆发+TikTok Shop', barrier: '渠道分散+物流时效+支付差异' },
    ],
  },
  {
    region: '拉美', color: '#ff9500', totalMarket: '$196M', cagr: '8.5%',
    summary: '中产崛起驱动消费升级。Momcozy巴西第3(11.2%)、墨西哥第2(14.8%)。2026年Pueri Expo 4月圣保罗展为拉美市场核心入口。',
    countries: [
      { name: '巴西', momcozyRank: 3, momcozyShare: 11.2, topComp: 'Medela(20%)', channel: 'Mercado Livre+亚马逊', cagr: 8.5, opportunity: 'Pueri Expo 2026.4+中产扩大', barrier: '进口税+物流时效+语言' },
      { name: '墨西哥', momcozyRank: 2, momcozyShare: 14.8, topComp: 'Medela(19%)', channel: 'Mercado Libre+亚马逊', cagr: 9.5, opportunity: 'USMCA+近岸外包+美国跳板', barrier: '品牌认知度待建' },
    ],
  },
  {
    region: '中东非', color: '#af52de', totalMarket: '$98M', cagr: '11.5%',
    summary: '全球最高生育率区域。Momcozy UAE第3(13.5%)、沙特第3(11.8%)。2026年清真认证母婴市场CAGR 18%，蓝海赛道。CBME Turkey 12月伊斯坦布尔为中东/北非入口。',
    countries: [
      { name: 'UAE', momcozyRank: 3, momcozyShare: 13.5, topComp: 'Medela(23%)', channel: 'Noon+Namshi+线下高端', cagr: 10.5, opportunity: '高消费力+进口依赖+0个人所得税', barrier: '清真认证+高温环境适应性' },
      { name: '沙特', momcozyRank: 3, momcozyShare: 11.8, topComp: 'Medela(21%)', channel: 'Noon+线下零售', cagr: 12.0, opportunity: 'Vision 2030+高生育率(16.5‰)', barrier: '文化适应+性别政策+监管' },
      { name: '南非', momcozyRank: 4, momcozyShare: 8.5, topComp: 'Medela(18%)', channel: 'Takealot+商超', cagr: 8.5, opportunity: '中产扩大+英语市场', barrier: '物流+汇率波动' },
    ],
  },
];

const radarData = [
  { dimension: '品牌认知', 北美: 88, 欧洲: 82, 亚太: 72, 拉美: 48, 中东非: 42 },
  { dimension: '渠道覆盖', 北美: 92, 欧洲: 80, 亚太: 68, 拉美: 52, 中东非: 38 },
  { dimension: '价格竞争力', 北美: 90, 欧洲: 88, 亚太: 85, 拉美: 88, 中东非: 75 },
  { dimension: '产品适配', 北美: 85, 欧洲: 80, 亚太: 75, 拉美: 65, 中东非: 55 },
  { dimension: '客服本土化', 北美: 85, 欧洲: 72, 亚太: 62, 拉美: 48, 中东非: 35 },
  { dimension: '合规能力', 北美: 90, 欧洲: 85, 亚太: 78, 拉美: 60, 中东非: 50 },
];

const shareTrendData2026 = [
  { country: '美国', momcozy: 22.2, medela: 26.5, philips: 13.8, willow: 13.2, spectra: 12.5 },
  { country: '德国', momcozy: 20.2, medela: 23.5, philips: 12.5, willow: 9.8, spectra: 14.2 },
  { country: '英国', momcozy: 19.5, medela: 22.8, philips: 13.5, willow: 10.5, spectra: 13.8 },
  { country: '日本', momcozy: 16.8, medela: 10.5, philips: 7.2, willow: 4.8, spectra: 16.5 },
  { country: '加拿大', momcozy: 18.5, medela: 24.0, philips: 14.5, willow: 9.8, spectra: 14.2 },
  { country: '韩国', momcozy: 14.5, medela: 7.5, philips: 5.2, willow: 3.5, spectra: 26.0 },
  { country: '澳大利亚', momcozy: 17.5, medela: 24.0, philips: 12.5, willow: 8.2, spectra: 14.8 },
  { country: '中国', momcozy: 15.2, medela: 16.0, philips: 10.5, willow: 3.2, spectra: 8.5 },
];

const sidebarItems = [
  { label: '看竞争', children: [
    { label: '竞品库', path: '/competition', icon: <LayoutGrid className="w-4 h-4" /> },
    { label: '新品竞争', path: '/competition/new', icon: <FileBarChart className="w-4 h-4" /> },
    { label: '区域竞争', path: '/competition/region', icon: <MapIcon className="w-4 h-4" /> },
    { label: '产品信息管理', path: '/competition/products', icon: <Database className="w-4 h-4" /> },
  ]},
];

export default function RegionCompetition() {
  const [activeRegion, setActiveRegion] = useState('北美');
  const region = regionData.find(r => r.region === activeRegion) || regionData[0];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#34c759] flex items-center justify-center shadow-sm">
                  <Globe className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">区域竞争分析</h1>
                  <p className="text-xs text-[#B5AFA8]">Amazon BA 口径待复核 · 五大区域 × 18国 · 不能外推全渠道份额</p>
                </div>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-010']}
              title="区域竞争份额边界"
              description="Amazon Brand Analytics 只覆盖 Amazon 渠道，区域份额和排名不能外推全渠道；需叠加线下与零售面板后再作为经营判断。"
            />

            {/* Region Selector */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {regionData.map((r, i) => (
                <button key={i} onClick={() => setActiveRegion(r.region)} className={`bg-white rounded-2xl p-5 shadow-sm border text-left transition-all ${activeRegion === r.region ? 'border-[#C25B6E] ring-1 ring-[#C25B6E]/20' : 'border-[#EDE6DF]'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-xs font-semibold text-[#1d1d1f]">{r.region}</span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: r.color }}>{r.totalMarket}</p>
                  <p className="text-[10px] text-[#86868b]">{r.countries.length}国 · CAGR {r.cagr}</p>
                </button>
              ))}
            </div>

            {/* Radar + Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">Momcozy 2026年区域竞争能力雷达</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="#EDE6DF" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#86868b' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: '#86868b' }} />
                      <Radar name="北美" dataKey="北美" stroke="#5856d6" fill="#5856d6" fillOpacity={0.1} strokeWidth={2} />
                      <Radar name="欧洲" dataKey="欧洲" stroke="#34c759" fill="#34c759" fillOpacity={0.1} strokeWidth={2} />
                      <Radar name="亚太" dataKey="亚太" stroke="#C25B6E" fill="#C25B6E" fillOpacity={0.1} strokeWidth={2} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">Momcozy 2026年各国份额</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                    <BarChart data={shareTrendData2026} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                      <YAxis dataKey="country" type="category" tick={{ fontSize: 10, fill: '#1d1d1f' }} axisLine={false} tickLine={false} width={50} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                      <Bar dataKey="momcozy" name="Momcozy" fill="#C25B6E" radius={[0, 4, 4, 0]} barSize={12} />
                      <Bar dataKey="medela" name="Medela" fill="#34c759" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Country Detail */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${region.color}15` }}>
                  <MapPin className="w-4 h-4" style={{ color: region.color }} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">{region.region} — 2026年竞争详情</h3>
                <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg ml-auto">{region.countries.length}国 · {region.totalMarket}</span>
              </div>
              <p className="text-xs text-[#86868b] mb-5">{region.summary}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {region.countries.map((c, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FBF8F5] hover:shadow-sm transition-natural">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-[#1d1d1f]">{c.name}</h4>
                      <div className="flex items-center gap-1">
                        {c.momcozyRank <= 2 && <Award className="w-3.5 h-3.5 text-[#ff9500]" />}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: region.color }}>#{c.momcozyRank}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div><span className="text-[10px] text-[#86868b]">Momcozy份额</span><p className="text-xs font-bold" style={{ color: region.color }}>{c.momcozyShare}%</p></div>
                      <div><span className="text-[10px] text-[#86868b]">CAGR</span><p className="text-xs font-medium text-[#34c759]">{c.cagr}%</p></div>
                    </div>
                    <p className="text-[10px] text-[#86868b] mb-1">最大竞品：{c.topComp}</p>
                    <p className="text-[10px] text-[#86868b] mb-1">渠道：{c.channel}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#34c759]/10 text-[#34c759]">{c.opportunity}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#ff3b30]/10 text-[#ff3b30]">{c.barrier}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center"><Target className="w-4 h-4 text-[#C25B6E]" strokeWidth={2} /></div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">2026年区域竞争策略</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: '巩固阵地（#1市场）', color: '#34c759', markets: ['美国22.2%', '德国20.2%', '英国19.5%', '加拿大18.5%'], actions: ['W1加热功能差异化营销', '拓展Target/Walmart线下', 'K+J 2026科隆展主展位', 'ABC Kids Expo拉斯维加斯首发'] },
                  { title: '快速渗透（#2/#3市场）', color: '#ff9500', markets: ['日本16.8%', '澳洲17.5%', '墨西哥14.8%', '韩国14.5%'], actions: ['Air1超薄定位日本市场', 'Coupang直播韩国渗透', 'RCEP关税优势宣传', '本土KOL深度合作'] },
                  { title: '布局未来（新兴市场）', color: '#5856d6', markets: ['巴西11.2%', 'UAE 13.5%', '沙特11.8%', '东南亚12.8%'], actions: ['Pueri Expo 2026圣保罗', 'CBME Turkey伊斯坦布尔', '清真认证申请', 'TikTok Shop东南亚爆发'] },
                ].map((s, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FBF8F5]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <h4 className="text-xs font-semibold" style={{ color: s.color }}>{s.title}</h4>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {s.markets.map((m, j) => (<span key={j} className="px-1.5 py-0.5 rounded text-[9px] bg-white text-[#86868b]">{m}</span>))}
                    </div>
                    <div className="space-y-1">
                      {s.actions.map((a, j) => (
                        <div key={j} className="flex items-start gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-[#EDE6DF] mt-1.5 flex-shrink-0" />
                          <p className="text-[10px] text-[#86868b]">{a}</p>
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
