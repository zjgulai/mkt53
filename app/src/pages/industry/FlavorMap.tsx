import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MapPin, Cpu, Droplets, VolumeX, Smartphone, Sun } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const featureTrends = [
  { quarter: '2022 Q1', APP控制: 15, 静音设计: 28, 便携穿戴: 22, 医院级吸力: 18, UV消毒: 8, 智能恒温: 5, 无线充电: 4 },
  { quarter: '2023 Q1', APP控制: 20, 静音设计: 26, 便携穿戴: 24, 医院级吸力: 16, UV消毒: 7, 智能恒温: 4, 无线充电: 3 },
  { quarter: '2024 Q1', APP控制: 28, 静音设计: 24, 便携穿戴: 18, 医院级吸力: 14, UV消毒: 8, 智能恒温: 5, 无线充电: 3 },
  { quarter: '2025 Q1', APP控制: 38, 静音设计: 22, 便携穿戴: 20, 医院级吸力: 10, UV消毒: 5, 智能恒温: 3, 无线充电: 2 },
];

const countryFeatureRank = [
  { country: '美国', APP控制: 42, 静音: 28, 便携: 18, 吸力: 8, 其他: 4 },
  { country: '中国', APP控制: 45, 静音: 20, 便携: 22, 吸力: 8, 其他: 5 },
  { country: '日本', APP控制: 35, 静音: 32, 便携: 20, 吸力: 8, 其他: 5 },
  { country: '德国', APP控制: 30, 静音: 30, 便携: 15, 吸力: 18, 其他: 7 },
  { country: '英国', APP控制: 38, 静音: 25, 便携: 20, 吸力: 10, 其他: 7 },
  { country: '加拿大', APP控制: 36, 静音: 26, 便携: 22, 吸力: 10, 其他: 6 },
  { country: '澳大利亚', APP控制: 32, 静音: 28, 便携: 24, 吸力: 10, 其他: 6 },
];

type FeatureName = 'APP控制' | '静音设计' | '便携穿戴' | '医院级吸力' | 'UV消毒' | '智能恒温';
type CountryFeatureRank = (typeof countryFeatureRank)[number];
type CountryFeatureKey = Exclude<keyof CountryFeatureRank, 'country'>;

const countryFeatureKeyByName: Record<FeatureName, CountryFeatureKey> = {
  APP控制: 'APP控制',
  静音设计: '静音',
  便携穿戴: '便携',
  医院级吸力: '吸力',
  UV消毒: '其他',
  智能恒温: '其他',
};

const techAdoption = [
  { tech: 'APP蓝牙连接', adoption: 68, growth: 24, leader: 'Momcozy M5/M9', status: '主流' },
  { tech: '<40dB超静音', adoption: 55, growth: 18, leader: 'Momcozy / Medela', status: '主流' },
  { tech: '模块化护罩', adoption: 42, growth: 32, leader: 'Momcozy M9', status: '增长' },
  { tech: '可穿戴设计', adoption: 38, growth: 28, leader: 'Momcozy M5 / Willow', status: '增长' },
  { tech: 'UV消毒集成', adoption: 15, growth: 45, leader: 'Momcozy KleanPal', status: '新兴' },
  { tech: 'AI泌乳分析', adoption: 8, growth: 65, leader: 'Medela Sonata', status: '前沿' },
  { tech: '无线充电', adoption: 22, growth: 12, leader: 'Momcozy M5', status: '稳定' },
  { tech: '记忆功能', adoption: 48, growth: 15, leader: '多品牌', status: '成熟' },
];

const sidebarItems = [
  {
    label: '政策分析',
    children: [
      { label: '母婴标准与法规地图', path: '/industry' },
      { label: '行业法规与标准解读', path: '/industry/regulation' },
      { label: '区域标准洞察', path: '/industry/policy-insight' },
    ],
  },
  {
    label: 'VOC趋势',
    children: [
      { label: 'VOC趋势地图', path: '/industry/flavor-map' },
      { label: 'VOC趋势报告', path: '/industry/flavor-report' },
    ],
  },
  {
    label: '行业新闻',
    children: [
      { label: '母婴行业资讯', path: '/industry/news' },
      { label: '母婴科技资讯', path: '/industry/tech' },
      { label: '母婴行业报告', path: '/industry/reports' },
    ],
  },
  { label: '母婴供应链情报', path: '/industry/supply' },
  { label: 'IP分析', path: '/industry/ip' },
  { label: '母婴展会调研', path: '/industry/exhibition' },
  { label: '区域宏观分析', path: '/industry/macro' },
];

export default function FlavorMap() {
  const [activeFeature, setActiveFeature] = useState<FeatureName>('APP控制');
  const features: FeatureName[] = ['APP控制', '静音设计', '便携穿戴', '医院级吸力', 'UV消毒', '智能恒温'];

  const featureIcons: Record<string, React.ReactNode> = {
    'APP控制': <Smartphone className="w-4 h-4" />,
    '静音设计': <VolumeX className="w-4 h-4" />,
    '便携穿戴': <MapPin className="w-4 h-4" />,
    '医院级吸力': <Droplets className="w-4 h-4" />,
    'UV消毒': <Sun className="w-4 h-4" />,
    '智能恒温': <Cpu className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                  <MapPin className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">VOC趋势地图</h1>
                  <p className="text-xs text-[#86868b]">全球母婴产品功能技术趋势追踪，覆盖 {features.length} 大核心功能维度</p>
                </div>
              </div>
            </div>

            {/* Feature Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {features.map((f) => (
                <button key={f} onClick={() => setActiveFeature(f)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${activeFeature === f ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>
                  {featureIcons[f]} {f}
                </button>
              ))}
            </div>

            {/* Trend Chart */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">VOC趋势季度变化 (% 关注度)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={featureTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="APP控制" stackId="1" stroke="#C25B6E" fill="#C25B6E" />
                    <Area type="monotone" dataKey="静音设计" stackId="1" stroke="#34c759" fill="#34c759" />
                    <Area type="monotone" dataKey="便携穿戴" stackId="1" stroke="#ff9500" fill="#ff9500" />
                    <Area type="monotone" dataKey="医院级吸力" stackId="1" stroke="#af52de" fill="#af52de" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Country Rank + Tech Adoption */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">各国功能偏好排名 - {activeFeature}</h3>
                <div className="space-y-2">
                  {[...countryFeatureRank].sort((a, b) => b[countryFeatureKeyByName[activeFeature]] - a[countryFeatureKeyByName[activeFeature]]).map((c, i) => {
                    const val = c[countryFeatureKeyByName[activeFeature]];
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: i < 3 ? ['#ff9500', '#af52de', '#ff3b30'][i] : '#86868b' }}>{i + 1}</span>
                        <span className="text-xs text-[#1d1d1f] w-16">{c.country}</span>
                        <div className="flex-1 min-w-0 h-2.5 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-full" style={{ width: `${val * 2}%` }} /></div>
                        <span className="text-xs text-[#86868b] w-8 text-right">{val}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">技术采用率与增长</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {techAdoption.map((t, i) => (
                    <div key={i} className="p-2.5 rounded-xl hover:bg-[#FBF8F5] transition-colors duration-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#1d1d1f] font-medium">{t.tech}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.status === '主流' ? 'bg-[#34c759]/10 text-[#34c759]' : t.status === '新兴' || t.status === '前沿' ? 'bg-[#af52de]/10 text-[#af52de]' : 'bg-[#C25B6E]/10 text-[#C25B6E]'}`}>{t.status}</span>
                          <span className="text-[10px] text-[#34c759] font-medium">+{t.growth}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 h-1.5 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-full" style={{ width: `${t.adoption}%` }} /></div>
                        <span className="text-[10px] text-[#86868b] w-8 text-right">{t.adoption}%</span>
                      </div>
                      <span className="text-[10px] text-[#86868b]">领先者：{t.leader}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
