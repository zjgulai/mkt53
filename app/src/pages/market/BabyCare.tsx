import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Baby, Sun, TrendingUp, DollarSign, Sparkles } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import Sidebar from '@/components/Sidebar';

const careTrend = [
  { month: '2024-01', warmer: 3.2, sterilizer: 2.8, monitor: 4.5, humidifier: 2.1, thermometer: 1.8 },
  { month: '2024-03', warmer: 3.4, sterilizer: 3.0, monitor: 4.8, humidifier: 2.2, thermometer: 1.9 },
  { month: '2024-05', warmer: 3.6, sterilizer: 3.3, monitor: 5.1, humidifier: 2.4, thermometer: 2.0 },
  { month: '2024-07', warmer: 3.8, sterilizer: 3.5, monitor: 5.4, humidifier: 2.6, thermometer: 2.1 },
  { month: '2024-09', warmer: 4.0, sterilizer: 3.8, monitor: 5.7, humidifier: 2.8, thermometer: 2.2 },
  { month: '2024-11', warmer: 4.2, sterilizer: 4.0, monitor: 6.0, humidifier: 3.0, thermometer: 2.3 },
  { month: '2025-01', warmer: 4.5, sterilizer: 4.3, monitor: 6.3, humidifier: 3.2, thermometer: 2.4 },
  { month: '2025-03', warmer: 4.8, sterilizer: 4.6, monitor: 6.6, humidifier: 3.4, thermometer: 2.5 },
  { month: '2025-05', warmer: 5.1, sterilizer: 4.9, monitor: 6.9, humidifier: 3.6, thermometer: 2.6 },
  { month: '2025-07(E)', warmer: 5.4, sterilizer: 5.2, monitor: 7.2, humidifier: 3.8, thermometer: 2.7 },
];

const categoryDetail = [
  { name: '婴儿监视器', size: '$7.2B', growth: 18.5, share: 28, keyFeature: 'AI哭声检测/呼吸监测', momcozyShare: 8 },
  { name: '温奶器/消毒器', size: '$5.4B', growth: 15.2, share: 22, keyFeature: 'UV-C LED/恒温40度', momcozyShare: 12 },
  { name: '加湿器', size: '$3.8B', growth: 12.5, share: 16, keyFeature: '静音/银离子杀菌', momcozyShare: 5 },
  { name: '消毒柜', size: '$5.2B', growth: 22.8, share: 20, keyFeature: '大容量/快速烘干', momcozyShare: 15 },
  { name: '耳温枪/体温计', size: '$2.7B', growth: 6.8, share: 10, keyFeature: '红外快测/APP记录', momcozyShare: 3 },
  { name: '其他护理', size: '$1.1B', growth: 8.2, share: 4, keyFeature: '多样化', momcozyShare: 4 },
];

const brandShare = [
  { name: 'Philips Avent', share: 22, color: '#C25B6E' },
  { name: 'Dr.Brown\'s', share: 16, color: '#34c759' },
  { name: 'Tommee Tippee', share: 14, color: '#ff9500' },
  { name: 'Momcozy', share: 12, color: '#af52de' },
  { name: 'Comotomo', share: 10, color: '#5856d6' },
  { name: 'Others', share: 26, color: '#86868b' },
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

export default function BabyCare() {
  const [activeTab, setActiveTab] = useState('趋势');
  const tabs = ['趋势', '细分品类', '品牌份额'];

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
                    <Baby className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">婴儿护理分析</h1>
                    <p className="text-xs text-[#86868b]">温奶器/消毒器/监视器/加湿器等婴儿护理电器</p>
                  </div>
                </div>
                <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg">市场规模 $25.4B · 年增 9.5%</span>
              </div>
              <div className="flex items-center gap-1">
                {tabs.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === t ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>{t}</button>
                ))}
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-037']}
              title="婴儿护理数据为展示性推算"
              description="规模、品牌份额和 Momcozy 占比缺少报告口径、Amazon 类目采集和权重公式，不能作为正式经营结论。"
            />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '市场规模', value: '$25.4B', change: '+9.5%', icon: <DollarSign className="w-4 h-4" />, color: '#C25B6E' },
                { label: '监视器增速', value: '+18.5%', change: '领跑子类', icon: <TrendingUp className="w-4 h-4" />, color: '#34c759' },
                { label: 'Momcozy份额', value: '12%', change: '+2.1pp', icon: <Sparkles className="w-4 h-4" />, color: '#ff9500' },
                { label: 'AI功能渗透', value: '45%', change: '+15pp', icon: <Sun className="w-4 h-4" />, color: '#af52de' },
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
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">细分品类趋势（亿美元）</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={careTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      <Area type="monotone" dataKey="monitor" stackId="1" stroke="#C25B6E" fill="#C25B6E" name="监视器" />
                      <Area type="monotone" dataKey="warmer" stackId="1" stroke="#34c759" fill="#34c759" name="温奶器" />
                      <Area type="monotone" dataKey="sterilizer" stackId="1" stroke="#ff9500" fill="#ff9500" name="消毒器" />
                      <Area type="monotone" dataKey="humidifier" stackId="1" stroke="#af52de" fill="#af52de" name="加湿器" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === '细分品类' && (
              <div className="space-y-4">
                {categoryDetail.map((c, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center">
                          <Baby className="w-4 h-4 text-[#C25B6E]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[#1d1d1f]">{c.name}</h4>
                          <span className="text-[10px] text-[#86868b]">Momcozy份额 {c.momcozyShare}%</span>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-[#1d1d1f] truncate">{c.size}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#86868b]">品类占比 {c.share}%</span>
                          <span className="text-[10px] text-[#34c759]">+{c.growth}%</span>
                        </div>
                        <div className="h-1.5 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-full" style={{ width: `${c.share * 3}%` }} /></div>
                      </div>
                      <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-2 py-1 rounded-md">{c.keyFeature}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === '品牌份额' && (
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品牌份额分布</h3>
                <div className="space-y-4">
                  {brandShare.map((b, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                          <span className="text-sm font-medium text-[#1d1d1f] truncate">{b.name}</span>
                        </div>
                        <span className="text-xs text-[#86868b]">{b.share}%</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${b.share * 3}%`, backgroundColor: b.color }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
