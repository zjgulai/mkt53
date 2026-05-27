import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Beaker, Lightbulb, ArrowUpRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const topFeatures = [
  { feature: 'APP智能控制', growth: 38, adoption: 68, color: '#C25B6E' },
  { feature: '<40dB超静音', growth: 22, adoption: 55, color: '#34c759' },
  { feature: '可穿戴隐形设计', growth: 28, adoption: 38, color: '#ff9500' },
  { feature: '模块化护罩系统', growth: 32, adoption: 42, color: '#af52de' },
  { feature: 'AI泌乳分析', growth: 65, adoption: 8, color: '#5856d6' },
  { feature: 'UV消毒集成', growth: 45, adoption: 15, color: '#ff3b30' },
];

const trendForecast = [
  { year: '2025', 智能化: 35, 环保材料: 25, 便携性: 22, 高端材质: 18 },
  { year: '2026E', 智能化: 42, 环保材料: 28, 便携性: 20, 高端材质: 10 },
  { year: '2027E', 智能化: 48, 环保材料: 32, 便携性: 15, 高端材质: 5 },
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

export default function FlavorReport() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                  <Beaker className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">VOC趋势报告</h1>
                  <p className="text-xs text-[#86868b]">母婴产品VOC趋势深度分析与未来预测</p>
                </div>
              </div>
            </div>

            {/* Feature Rankings */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">核心VOC趋势排名</h3>
              <div className="space-y-4">
                {topFeatures.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: f.color }}>{i + 1}</span>
                        <span className="text-sm font-medium text-[#1d1d1f] truncate">{f.feature}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-[10px] text-[#34c759] font-medium"><ArrowUpRight className="w-3 h-3" />+{f.growth}%</span>
                        <span className="text-[10px] text-[#86868b]">采用率 {f.adoption}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${f.adoption}%`, backgroundColor: f.color }} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Forecast Chart */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">趋势预测 (2025-2027E)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="智能化" fill="#C25B6E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="环保材料" fill="#34c759" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="便携性" fill="#ff9500" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-[#ff9500]" />趋势洞察</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'APP智能控制功能从"加分项"变为"必备项"，2025年采用率达68%',
                  '超静音设计(<40dB)成为高端产品标配，日本市场需求最旺盛',
                  'AI泌乳分析仍处于前沿阶段(8%采用)，但增速最快(+65%)',
                  '可穿戴设计在北美市场接受度最高，职场妈妈是核心用户群',
                  'UV消毒集成增长45%，但消费者教育仍需加强',
                  '环保材质需求2027E预计达32%，欧洲市场领先全球',
                ].map((ins, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-[#FBF8F5]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C25B6E] mt-1.5 flex-shrink-0" />
                    <span className="text-xs text-[#1d1d1f] leading-relaxed">{ins}</span>
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
