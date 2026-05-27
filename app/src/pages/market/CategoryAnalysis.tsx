import { useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FileBarChart, Target, TrendingUp, Zap } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const radarData = [
  { subject: '市场规模', A: 85, B: 65, C: 45, D: 30, fullMark: 100 },
  { subject: '增速', A: 90, B: 70, C: 55, D: 40, fullMark: 100 },
  { subject: '利润空间', A: 75, B: 60, C: 50, D: 35, fullMark: 100 },
  { subject: '技术门槛', A: 80, B: 50, C: 40, D: 25, fullMark: 100 },
  { subject: '品牌集中度', A: 70, B: 55, C: 35, D: 45, fullMark: 100 },
  { subject: 'Momcozy优势', A: 95, B: 80, C: 65, D: 50, fullMark: 100 },
];

const categoryComparison = [
  { name: '吸奶器', size: 12.8, growth: 15.3, margin: 42, competition: '高', momcozyRank: 1, opportunity: '穿戴式/AI控制', color: '#C25B6E' },
  { name: '哺乳文胸', size: 11.2, growth: 18.5, margin: 38, competition: '中', momcozyRank: 1, opportunity: '功能性面料/智能', color: '#34c759' },
  { name: '婴儿监视器', size: 7.2, growth: 18.5, margin: 35, competition: '高', momcozyRank: 4, opportunity: 'AI哭声/呼吸监测', color: '#ff9500' },
  { name: '温奶器/消毒', size: 5.4, growth: 15.2, margin: 40, competition: '中', momcozyRank: 3, opportunity: 'UV-C LED技术', color: '#af52de' },
  { name: '防溢乳垫', size: 6.2, growth: 12.8, margin: 32, competition: '低', momcozyRank: 2, opportunity: '环保可降解', color: '#5856d6' },
  { name: '储奶袋', size: 4.8, growth: 15.2, margin: 28, competition: '中', momcozyRank: 1, opportunity: '智能计量/保鲜', color: '#ff3b30' },
  { name: '加湿器', size: 3.8, growth: 12.5, margin: 30, competition: '中', momcozyRank: 5, opportunity: '银离子/静音', color: '#C25B6E' },
  { name: '乳头护理', size: 3.7, growth: 9.5, margin: 45, competition: '低', momcozyRank: 3, opportunity: '有机认证', color: '#34c759' },
];

const lifecycle = [
  { stage: '导入期', categories: ['AI智能吸奶器', 'IoT婴儿监视器'], invest: '高投入/培育市场', risk: '高' },
  { stage: '成长期', categories: ['穿戴式吸奶器', 'UV消毒器', '智能哺乳文胸'], invest: '加大投入/抢占份额', risk: '中' },
  { stage: '成熟期', categories: ['电动吸奶器', '防溢乳垫', '储奶袋'], invest: '优化利润/控制成本', risk: '低' },
  { stage: '衰退期', categories: ['手动吸奶器', '基础温奶器'], invest: '收缩/逐步退出', risk: '低' },
];

const sidebarItems = [
  {
    label: '看市场',
    children: [
      { label: '总览', path: '/market' },
      { label: '大盘趋势', path: '/market/trend' },
      { label: '吸奶器', path: '/market/mtl' },
      { label: '哺乳用品', path: '/market/dtl' },
      { label: '婴儿护理', path: '/market/consumables' },
      { label: '海关数据', path: '/market/customs' },
      { label: '品类分析', path: '/market/category' },
    ],
  },
];

export default function CategoryAnalysis() {
  const [activeTab, setActiveTab] = useState('品类对比');
  const tabs = ['品类对比', '生命周期', '雷达分析'];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                    <FileBarChart className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">品类分析</h1>
                    <p className="text-xs text-[#86868b]">母婴全品类竞争格局与机会分析</p>
                  </div>
                </div>
                <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg">8大核心品类</span>
              </div>
              <div className="flex items-center gap-1">
                {tabs.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === t ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>{t}</button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '分析品类', value: '8', icon: <FileBarChart className="w-4 h-4" />, color: '#C25B6E' },
                { label: 'Momcozy TOP3', value: '4/8', icon: <Target className="w-4 h-4" />, color: '#34c759' },
                { label: '最佳机会', value: '吸奶器', icon: <Zap className="w-4 h-4" />, color: '#ff9500' },
                { label: '最高毛利', value: '乳头护理', icon: <TrendingUp className="w-4 h-4" />, color: '#af52de' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                    <span className="text-xs text-[#86868b]">{s.label}</span>
                  </div>
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
                </div>
              ))}
            </div>

            {activeTab === '品类对比' && (
              <>
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] overflow-x-auto">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品类全景对比</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[#EDE6DF] table-row-hover">
                      <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">品类</th>
                      <th className="text-right py-2 px-3 text-xs text-[#86868b] font-medium">规模($B)</th>
                      <th className="text-right py-2 px-3 text-xs text-[#86868b] font-medium">增速</th>
                      <th className="text-right py-2 px-3 text-xs text-[#86868b] font-medium">毛利率</th>
                      <th className="text-center py-2 px-3 text-xs text-[#86868b] font-medium">竞争</th>
                      <th className="text-center py-2 px-3 text-xs text-[#86868b] font-medium">排名</th>
                      <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">机会点</th>
                    </tr></thead>
                    <tbody>
                      {categoryComparison.map((c, i) => (
                        <tr key={i} className="border-b border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200">
                          <td className="py-2.5 px-3 flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            <span className="text-xs font-medium text-[#1d1d1f] truncate">{c.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-right">{c.size}</td>
                          <td className="py-2.5 px-3 text-xs text-right text-[#34c759]">+{c.growth}%</td>
                          <td className="py-2.5 px-3 text-xs text-right">{c.margin}%</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.competition === '高' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : c.competition === '中' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#34c759]/10 text-[#34c759]'}`}>{c.competition}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${c.momcozyRank <= 2 ? 'bg-[#C25B6E]/10 text-[#C25B6E]' : 'bg-[#FBF8F5] text-[#86868b]'}`}>#{c.momcozyRank}</span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-[#86868b]">{c.opportunity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                    <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品类规模分布</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryComparison} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                          <XAxis type="number" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} width={70} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="size" fill="#C25B6E" radius={[0, 6, 6, 0]} name="规模($B)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                    <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">增速对比</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryComparison}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="growth" fill="#34c759" radius={[4, 4, 0, 0]} name="增速(%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === '生命周期' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {lifecycle.map((l, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: [ '#af52de15', '#34c75915', '#C25B6E15', '#86868b15' ][i] }}>
                        <span className="text-lg font-bold" style={{ color: [ '#af52de', '#34c759', '#C25B6E', '#86868b' ][i] }}>{i + 1}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">{l.stage}</h3>
                    </div>
                    <div className="space-y-2 mb-5">
                      {l.categories.map((c, ci) => (
                        <div key={ci} className="px-3 py-2 rounded-xl bg-[#FBF8F5] text-xs text-[#1d1d1f] font-medium">{c}</div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-[#EDE6DF]">
                      <p className="text-[10px] text-[#86868b] mb-1">投资策略</p>
                      <p className="text-xs text-[#1d1d1f]">{l.invest}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === '雷达分析' && (
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品类竞争力雷达图</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#EDE6DF" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#86868b' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#86868b' }} />
                      <Radar name="吸奶器" dataKey="A" stroke="#C25B6E" fill="#C25B6E" fillOpacity={0.15} strokeWidth={2} />
                      <Radar name="哺乳文胸" dataKey="B" stroke="#34c759" fill="#34c759" fillOpacity={0.1} strokeWidth={2} />
                      <Radar name="护理电器" dataKey="C" stroke="#ff9500" fill="#ff9500" fillOpacity={0.1} strokeWidth={2} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
