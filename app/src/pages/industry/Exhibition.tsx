
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, MapPin, Users, Star, Globe, Ticket } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const exhibitions = [
  {
    id: 1, name: 'ABC Kids Expo 2025', location: 'Las Vegas, US', date: '2026-05-23 ~ 05-17', status: '已结束',
    visitors: 18500, momcozyBooth: 'Hall C-320', boothSize: 120,
    leads: 1240, orders: 86, satisfaction: 4.7,
    highlights: ['M5 Pro新品全球首发', '与Target采购团队达成年度框架协议', '获得"最佳创新设计"展位奖'],
    feedback: 'M5 Pro的静音演示吸引了大量专业买家驻足，北美渠道商对无线充电功能非常感兴趣。',
  },
  {
    id: 2, name: 'Kind + Jugend 2025', location: 'Cologne, Germany', date: '2025-09-04 ~ 09-06', status: '即将举办',
    visitors: 22000, momcozyBooth: 'Hall 10.2-B45', boothSize: 150,
    leads: null, orders: null, satisfaction: null,
    highlights: ['计划发布欧洲限定配色系列', '与Medela同台竞技展示技术差异化', '邀请5位欧洲母婴达人现场直播'],
    feedback: '欧洲消费者对环保包装和B Corp认证关注度很高，正在调整展示重点。',
  },
  {
    id: 3, name: 'CBME China 2025', location: 'Shanghai, China', date: '2025-07-16 ~ 07-18', status: '报名中',
    visitors: 95000, momcozyBooth: '待定', boothSize: 200,
    leads: null, orders: null, satisfaction: null,
    highlights: ['全品类首次同台展示', ' launching 智能母婴生态系统概念', '合作伙伴招商大会'],
    feedback: '国内消费者对智能互联功能接受度最高，计划重点展示APP数据分析功能。',
  },
  {
    id: 4, name: 'Pueri Expo 2025', location: 'São Paulo, Brazil', date: '2026-05-23 ~ 04-25', status: '已结束',
    visitors: 8200, momcozyBooth: 'Hall B-108', boothSize: 80,
    leads: 560, orders: 34, satisfaction: 4.4,
    highlights: ['首次进入南美市场', '本地化葡萄牙语产品展示', '与当地最大母婴连锁达成试销协议'],
    feedback: '南美市场对价格敏感度高，M6 Slim的性价比定位非常契合当地需求。',
  },
  {
    id: 5, name: 'Tokyo Baby Show 2025', location: 'Tokyo, Japan', date: '2026-05-23 ~ 06-29', status: '即将举办',
    visitors: 45000, momcozyBooth: 'East Hall 4-220', boothSize: 90,
    leads: null, orders: null, satisfaction: null,
    highlights: ['日本限定樱花粉配色首发', '与本地母婴达人深度合作', 'Mini产品线的亚洲首秀'],
    feedback: '日本消费者对产品细节和包装品质要求很高，正在优化展示材料的日语翻译。',
  },
];

const roiData = [
  { expo: 'ABC Kids', cost: 85000, revenue: 420000, roi: 394 },
  { expo: 'Pueri Expo', cost: 45000, revenue: 180000, roi: 300 },
  { expo: 'CBME 2024', cost: 120000, revenue: 680000, roi: 467 },
  { expo: 'Kind+Jugend', cost: 95000, revenue: 380000, roi: 300 },
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

export default function Exhibition() {
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
                  <Calendar className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">展会调研</h1>
                  <p className="text-xs text-[#86868b]">追踪全球 {exhibitions.length} 大母婴行业展会，分析参展ROI与市场反馈</p>
                </div>
              </div>
            </div>

            {/* ROI Chart */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">展会ROI分析 (USD)</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="expo" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="cost" fill="#C25B6E" radius={[4, 4, 0, 0]} name="参展成本" />
                    <Bar dataKey="revenue" fill="#34c759" radius={[4, 4, 0, 0]} name="获得收入" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Exhibition Cards */}
            <div className="space-y-6">
              {exhibitions.map((e) => (
                <div key={e.id} className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-sm ${e.status === '已结束' ? 'bg-[#34c759]' : 'bg-[#ff9500]'}`} style={{ boxShadow: `0 2px 8px ${e.status === '已结束' ? '#34c75925' : '#ff950025'}` }}>
                      <Globe className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-[#1d1d1f]">{e.name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${e.status === '已结束' ? 'bg-[#34c759]/10 text-[#34c759]' : e.status === '即将举办' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#C25B6E]/10 text-[#C25B6E]'}`}>{e.status}</span>
                        {e.satisfaction && (
                          <div className="flex items-center gap-0.5 ml-auto">
                            {Array.from({ length: 5 }).map((_, s) => (<Star key={s} className={`w-3.5 h-3.5 ${s < Math.floor(e.satisfaction!) ? 'text-[#ff9500] fill-[#ff9500]' : 'text-[#EDE6DF]'}`} />))}
                            <span className="text-xs text-[#1d1d1f] ml-1">{e.satisfaction}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mb-3 text-[10px] text-[#86868b]">
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{e.location}</span>
                        <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{e.date}</span>
                        <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{e.visitors.toLocaleString()} 访客</span>
                        <span className="flex items-center gap-0.5"><Ticket className="w-3 h-3" />{e.momcozyBooth} · {e.boothSize}㎡</span>
                      </div>
                      {e.leads !== null && (
                        <div className="flex items-center gap-4 mb-3">
                          <span className="text-[10px] bg-[#FBF8F5] px-2 py-0.5 rounded-md text-[#1d1d1f]">线索 {e.leads}</span>
                          <span className="text-[10px] bg-[#FBF8F5] px-2 py-0.5 rounded-md text-[#1d1d1f]">订单 {e.orders}</span>
                          <span className="text-[10px] bg-[#34c759]/10 px-2 py-0.5 rounded-md text-[#34c759] font-medium">ROI {Math.round((e.orders! * 5000 - e.boothSize * 500) / (e.boothSize * 500) * 100)}%</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {e.highlights.map((h, hi) => (
                          <span key={hi} className="px-2 py-0.5 rounded-md bg-[#FBF8F5] text-[10px] text-[#C25B6E]">{h}</span>
                        ))}
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FBF8F5]">
                        <p className="text-[10px] text-[#86868b] leading-relaxed">{e.feedback}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
