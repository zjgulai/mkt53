import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Shirt, TrendingUp, DollarSign, Star, ArrowUpRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const trendData = [
  { month: '2024-01', bra: 8.2, pads: 4.5, bags: 3.1, cream: 2.8, cover: 1.9 },
  { month: '2024-03', bra: 8.5, pads: 4.6, bags: 3.2, cream: 2.9, cover: 2.0 },
  { month: '2024-05', bra: 8.8, pads: 4.8, bags: 3.4, cream: 3.0, cover: 2.1 },
  { month: '2024-07', bra: 9.2, pads: 5.0, bags: 3.6, cream: 3.1, cover: 2.2 },
  { month: '2024-09', bra: 9.5, pads: 5.2, bags: 3.8, cream: 3.2, cover: 2.3 },
  { month: '2024-11', bra: 9.8, pads: 5.4, bags: 4.0, cream: 3.3, cover: 2.4 },
  { month: '2025-01', bra: 10.2, pads: 5.6, bags: 4.2, cream: 3.4, cover: 2.5 },
  { month: '2025-03', bra: 10.5, pads: 5.8, bags: 4.4, cream: 3.5, cover: 2.6 },
  { month: '2025-05', bra: 10.8, pads: 6.0, bags: 4.6, cream: 3.6, cover: 2.7 },
  { month: '2025-07(E)', bra: 11.2, pads: 6.2, bags: 4.8, cream: 3.7, cover: 2.8 },
];

const brandData = [
  { name: 'Momcozy', share: 28, growth: 22.5, color: '#C25B6E' },
  { name: 'Kindred Bravely', share: 18, growth: 15.2, color: '#34c759' },
  { name: 'Hofish', share: 14, growth: 8.8, color: '#ff9500' },
  { name: 'Lansinoh', share: 12, growth: 5.5, color: '#af52de' },
  { name: 'Medela', share: 10, growth: 3.2, color: '#5856d6' },
  { name: 'Others', share: 18, growth: -2.1, color: '#86868b' },
];

const subCategories = [
  { name: '哺乳文胸', size: '$11.2B', growth: 18.5, momcozyRank: 1, topFeature: '无痕/无钢圈', consumerNeed: '舒适度第一' },
  { name: '防溢乳垫', size: '$6.2B', growth: 12.8, momcozyRank: 2, topFeature: '超薄/透气', consumerNeed: '隐形/吸水性强' },
  { name: '储奶袋', size: '$4.8B', growth: 15.2, momcozyRank: 1, topFeature: '双拉链防漏', consumerNeed: '食品安全级' },
  { name: '乳头霜', size: '$3.7B', growth: 9.5, momcozyRank: 3, topFeature: '天然羊脂', consumerNeed: '安全可入口' },
  { name: '哺乳巾', size: '$2.8B', growth: 6.2, momcozyRank: 2, topFeature: '多功能设计', consumerNeed: '隐私/透气' },
];

const seasonData = [
  { month: '1月', bra: 72, pads: 85, bags: 68 },
  { month: '2月', bra: 68, pads: 82, bags: 65 },
  { month: '3月', bra: 82, pads: 90, bags: 78 },
  { month: '4月', bra: 92, pads: 95, bags: 85 },
  { month: '5月', bra: 100, pads: 98, bags: 92 },
  { month: '6月', bra: 95, pads: 92, bags: 88 },
  { month: '7月', bra: 88, pads: 88, bags: 82 },
  { month: '8月', bra: 85, pads: 86, bags: 80 },
  { month: '9月', bra: 90, pads: 94, bags: 85 },
  { month: '10月', bra: 88, pads: 92, bags: 84 },
  { month: '11月', bra: 82, pads: 96, bags: 90 },
  { month: '12月', bra: 92, pads: 100, bags: 95 },
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

export default function NursingProducts() {
  const [activeTab, setActiveTab] = useState('趋势');
  const tabs = ['趋势', '品牌', '细分品类'];

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
                    <Shirt className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">哺乳用品分析</h1>
                    <p className="text-xs text-[#86868b]">哺乳文胸/防溢乳垫/储奶袋/乳头护理等品类分析</p>
                  </div>
                </div>
                <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg">市场规模 $28.7B · 年增 12.8%</span>
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
                { label: '市场规模', value: '$28.7B', change: '+12.8%', icon: <DollarSign className="w-4 h-4" />, color: '#C25B6E' },
                { label: '年销量', value: '4,850万', change: '+10.5%', icon: <TrendingUp className="w-4 h-4" />, color: '#34c759' },
                { label: 'Momcozy份额', value: '28%', change: '+3.5pp', icon: <Star className="w-4 h-4" />, color: '#ff9500' },
                { label: '文胸增速', value: '+18.5%', change: '核心驱动', icon: <ArrowUpRight className="w-4 h-4" />, color: '#af52de' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                    <span className="text-xs text-[#86868b]">{s.label}</span>
                  </div>
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
                  <span className="text-xs text-[#34c759] font-medium">{s.change}</span>
                </div>
              ))}
            </div>

            {activeTab === '趋势' && (
              <>
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">细分品类趋势（亿美元）</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="bra" stroke="#C25B6E" strokeWidth={2} dot={false} name="哺乳文胸" />
                        <Line type="monotone" dataKey="pads" stroke="#34c759" strokeWidth={2} dot={false} name="防溢乳垫" />
                        <Line type="monotone" dataKey="bags" stroke="#ff9500" strokeWidth={2} dot={false} name="储奶袋" />
                        <Line type="monotone" dataKey="cream" stroke="#af52de" strokeWidth={2} dot={false} name="乳头护理" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">季节性销售指数</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={seasonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="bra" fill="#C25B6E" radius={[4, 4, 0, 0]} name="文胸" />
                        <Bar dataKey="pads" fill="#34c759" radius={[4, 4, 0, 0]} name="乳垫" />
                        <Bar dataKey="bags" fill="#ff9500" radius={[4, 4, 0, 0]} name="储奶袋" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {activeTab === '品牌' && (
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品牌竞争格局</h3>
                <div className="space-y-4">
                  {brandData.map((b, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                          <span className="text-sm font-medium text-[#1d1d1f] truncate">{b.name}</span>
                        </div>
                        <span className="text-xs text-[#86868b]">{b.share}%</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${b.share * 2.5}%`, backgroundColor: b.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === '细分品类' && (
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">细分品类表现</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[#EDE6DF] table-row-hover">
                      <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">品类</th>
                      <th className="text-right py-2 px-3 text-xs text-[#86868b] font-medium">市场规模</th>
                      <th className="text-right py-2 px-3 text-xs text-[#86868b] font-medium">增速</th>
                      <th className="text-right py-2 px-3 text-xs text-[#86868b] font-medium">Momcozy排名</th>
                      <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">热门功能</th>
                      <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">消费者核心需求</th>
                    </tr></thead>
                    <tbody>
                      {subCategories.map((c, i) => (
                        <tr key={i} className="border-b border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200">
                          <td className="py-2.5 px-3 text-xs font-medium text-[#1d1d1f] truncate">{c.name}</td>
                          <td className="py-2.5 px-3 text-xs text-right text-[#1d1d1f]">{c.size}</td>
                          <td className="py-2.5 px-3 text-xs text-right text-[#34c759]">+{c.growth}%</td>
                          <td className="py-2.5 px-3 text-xs text-right">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${c.momcozyRank <= 2 ? 'bg-[#C25B6E]/10 text-[#C25B6E]' : 'bg-[#FBF8F5] text-[#86868b]'}`}>#{c.momcozyRank}</span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-[#86868b]">{c.topFeature}</td>
                          <td className="py-2.5 px-3 text-xs text-[#1d1d1f]">{c.consumerNeed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
