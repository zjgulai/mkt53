import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Globe, MessageCircle, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const sentimentTrend = [
  { month: '2024-06', positive: 68, neutral: 22, negative: 10 },
  { month: '2024-08', positive: 71, neutral: 20, negative: 9 },
  { month: '2024-10', positive: 65, neutral: 24, negative: 11 },
  { month: '2024-12', positive: 72, neutral: 19, negative: 9 },
  { month: '2025-02', positive: 74, neutral: 18, negative: 8 },
  { month: '2025-04', positive: 76, neutral: 17, negative: 7 },
  { month: '2025-06', positive: 78, neutral: 16, negative: 6 },
];

const countrySentiment = [
  { country: '美国', positive: 82, negative: 18 },
  { country: '英国', positive: 78, negative: 22 },
  { country: '德国', positive: 75, negative: 25 },
  { country: '加拿大', positive: 80, negative: 20 },
  { country: '澳大利亚', positive: 77, negative: 23 },
  { country: '法国', positive: 71, negative: 29 },
  { country: '日本', positive: 69, negative: 31 },
];

const hotTopics = [
  { topic: 'M5 wearable pump hands-free', volume: 12580, sentiment: 'positive', country: '美国' },
  { topic: 'Momcozy nursing bra comfort', volume: 9840, sentiment: 'positive', country: '英国/加拿大' },
  { topic: 'M9 suction strength concern', volume: 4520, sentiment: 'mixed', country: '德国/法国' },
  { topic: 'KleanPal sterilizer recall', volume: 3890, sentiment: 'negative', country: '美国' },
  { topic: 'Baby carrier ergonomic design', volume: 7650, sentiment: 'positive', country: '澳大利亚' },
  { topic: 'Breast pump noise level', volume: 6210, sentiment: 'mixed', country: '日本' },
  { topic: 'Maternity pillow safety', volume: 5340, sentiment: 'positive', country: '英国' },
  { topic: 'Postpartum recovery products', volume: 4780, sentiment: 'positive', country: '加拿大' },
];

const recentMentions = [
  { platform: 'Reddit', user: 'WorkingMom2025', content: 'The M5 has been a game changer for my pumping sessions at work. Truly hands-free and discreet.', sentiment: 'positive', likes: 234, date: '样例：采集窗口待接入（示例）' },
  { platform: 'Twitter/X', user: '@NewMomLife', content: 'Momcozy nursing bra is the most comfortable I have tried. Worth every penny!', sentiment: 'positive', likes: 189, date: '样例：采集窗口待接入（示例）' },
  { platform: 'Instagram', user: '@mommyblogger_us', content: 'Love the new M9 design but wish the suction was a bit stronger for heavy producers.', sentiment: 'mixed', likes: 445, date: '样例：采集窗口待接入（示例）' },
  { platform: 'Facebook', user: 'Sarah Johnson', content: 'Had an issue with the KleanPal water reservoir leaking. Customer service was helpful though.', sentiment: 'mixed', likes: 67, date: '样例：采集窗口待接入（示例）' },
  { platform: 'TikTok', user: '@pumpreview', content: 'M5 vs Willow Go comparison - Momcozy wins on price and battery life!', sentiment: 'positive', likes: 1205, date: '样例：采集窗口待接入（示例）' },
  { platform: 'Reddit', user: 'FTDad_Parenting', content: 'Baby carrier ergonomics are great. My back doesnt hurt even after 2 hours of wearing.', sentiment: 'positive', likes: 156, date: '样例：采集窗口待接入（示例）' },
];

const sidebarItems = [
  { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
  { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
  { label: '区域用户画像', path: '/users/regional' },
  { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
];

export default function OverseasSentiment() {
  const [activeTab, setActiveTab] = useState('总览');
  const tabs = ['总览', '正面舆情', '负面舆情', '危机预警'];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                    <Globe className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">海外舆情监测</h1>
                    <p className="text-xs text-[#86868b]">覆盖 Reddit / Twitter / Instagram / Facebook / TikTok 等海外主流社交平台</p>
                  </div>
                </div>
                <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg"><span className="text-[#B5AFA8]">采集状态：</span>社媒 API 待接入</span>
              </div>
              <div className="flex items-center gap-1">
                {tabs.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>{tab}</button>
                ))}
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-013']}
              title="海外舆情采集状态"
              description="TikTok、Instagram、Facebook、Reddit 等平台尚未补齐 API 授权、查询词和采样窗口；当前声量、情绪和提及列表只能作为舆情线索。"
            />

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '样例提及量', value: '2,847', change: '待采集复核', up: true, icon: <MessageCircle className="w-4 h-4" />, color: '#C25B6E' },
                { label: '正面占比', value: '78%', change: '+3.2%', up: true, icon: <ThumbsUp className="w-4 h-4" />, color: '#34c759' },
                { label: '负面占比', value: '6%', change: '-2.1%', up: true, icon: <ThumbsDown className="w-4 h-4" />, color: '#ff3b30' },
                { label: '危机预警', value: '2', change: '需关注', up: false, icon: <AlertTriangle className="w-4 h-4" />, color: '#ff9500' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>{stat.icon}</div>
                    <span className="text-xs text-[#86868b]">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{stat.value}</p>
                  <span className={`text-xs font-medium ${stat.up ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>{stat.change}</span>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">海外舆情情感趋势 (%)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                    <LineChart data={sentimentTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="positive" stroke="#34c759" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="neutral" stroke="#ff9500" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="negative" stroke="#ff3b30" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">各国正面舆情占比</h3>
                <div className="space-y-4">
                  {countrySentiment.map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#1d1d1f] font-medium">{item.country}</span>
                        <span className="text-xs text-[#86868b]">{item.positive}% 正面</span>
                      </div>
                      <div className="h-3 bg-[#FBF8F5] rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#34c759] rounded-l-full" style={{ width: `${item.positive}%` }} />
                        <div className="h-full bg-[#ff3b30] rounded-r-full" style={{ width: `${item.negative}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Hot Topics */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">海外热门话题 TOP8</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#EDE6DF] table-row-hover">
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">话题</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">地区</th>
                    <th className="text-right py-2 px-3 text-xs text-[#86868b] font-medium">提及量</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">情感</th>
                  </tr></thead>
                  <tbody>
                    {hotTopics.map((t, i) => (
                      <tr key={i} className="border-b border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200">
                        <td className="py-2.5 px-3 text-xs text-[#1d1d1f] font-medium">{t.topic}</td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{t.country}</td>
                        <td className="py-2.5 px-3 text-xs text-[#1d1d1f] text-right font-medium">{t.volume.toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${t.sentiment === 'positive' ? 'bg-[#34c759]/10 text-[#34c759]' : t.sentiment === 'negative' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{t.sentiment}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Mentions */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">海外提及样例</h3>
              <div className="space-y-4">
                {recentMentions.map((m, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200 border border-[#EDE6DF]/60">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#C25B6E]/10 text-[10px] text-[#C25B6E] font-medium">{m.platform}</span>
                      <span className="text-xs text-[#86868b]">@{m.user}</span>
                      <span className="text-xs text-[#86868b] ml-auto">{m.date}</span>
                    </div>
                    <p className="text-xs text-[#1d1d1f] leading-relaxed mb-2">{m.content}</p>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${m.sentiment === 'positive' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{m.sentiment}</span>
                      <span className="text-[10px] text-[#86868b]">👍 {m.likes}</span>
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
