import { useState } from 'react';
import { Newspaper, Clock, TrendingUp, ExternalLink, Filter } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const newsItems = [
  { id: 1, title: 'Momcozy Wearable Breast Pump获得FDA 510(k)许可，涵盖7个型号', source: 'FDA.gov', date: '2025-10-29', category: '法规', tag: '重要', hot: true },
  { id: 2, title: '全球可穿戴吸奶器市场规模2025年预计达18.2亿美元，年增15.3%', source: 'MarketWatch', date: '2026-05-23', category: '市场', tag: null, hot: true },
  { id: 3, title: 'eufy Wearable Breast Pump S1获FDA 510(k)许可，赛道竞争加剧', source: 'FDA.gov', date: '2025-08-11', category: '竞品', tag: null, hot: false },
  { id: 4, title: '中国GB 6675-2025玩具安全新标准发布，2026年11月计划生效', source: 'SAC China', date: '2025-10-05', category: '法规', tag: '重要', hot: true },
  { id: 5, title: '欧盟MDR过渡期延长至2027-2028年，吸奶器等Class IIa器械影响分析', source: 'EU Commission', date: '2024-12-18', category: '法规', tag: null, hot: false },
  { id: 6, title: 'Medela发布Sonata Pro智能吸奶器，集成AI泌乳分析功能', source: 'Medela', date: '2026-05-23', category: '竞品', tag: null, hot: false },
  { id: 7, title: '美国CPSC 16 CFR Part 1242哺乳枕安全标准正式生效', source: 'CPSC', date: '2026-05-23', category: '法规', tag: '重要', hot: true },
  { id: 8, title: '母婴行业2025年Q2投融资报告：可穿戴设备赛道获投金额同比增长42%', source: '36氪', date: '2025-07-01', category: '资本', tag: null, hot: false },
  { id: 9, title: 'Willow Go 3.0发布，续航提升至8小时，直接对标Momcozy M5', source: 'Willow', date: '2026-05-23', category: '竞品', tag: null, hot: true },
  { id: 10, title: '中国工信部发布7项儿童用品强制性国标草案征求意见稿', source: 'MIIT', date: '2025-08-01', category: '法规', tag: null, hot: false },
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

const catColors: Record<string, string> = {
  '法规': '#C25B6E', '市场': '#34c759', '竞品': '#ff9500', '资本': '#5856d6',
};

export default function IndustryNews() {
  const [filter, setFilter] = useState('全部');
  const cats = ['全部', '法规', '市场', '竞品', '资本'];
  const filtered = filter === '全部' ? newsItems : newsItems.filter(n => n.category === filter);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                    <Newspaper className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">母婴行业资讯</h1>
                    <p className="text-xs text-[#86868b]">共 {newsItems.length} 条精选资讯</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#86868b]" />
                  {cats.map(c => (
                    <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === c ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>{c}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filtered.map((n) => (
                <div key={n.id} className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${catColors[n.category]}15` }}>
                      <Newspaper className="w-5 h-5" style={{ color: catColors[n.category] }} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white" style={{ backgroundColor: catColors[n.category] }}>{n.category}</span>
                        {n.tag && <span className="px-2 py-0.5 rounded-md bg-[#ff3b30]/10 text-[10px] text-[#ff3b30] font-medium">{n.tag}</span>}
                        {n.hot && <span className="px-2 py-0.5 rounded-md bg-[#ff9500]/10 text-[10px] text-[#ff9500] font-medium flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />热门</span>}
                      </div>
                      <h3 className="text-sm font-medium text-[#1d1d1f] truncate group-hover:text-[#C25B6E] transition-colors duration-200 mb-1">{n.title}</h3>
                      <div className="flex items-center gap-4 text-[10px] text-[#86868b]">
                        <span>{n.source}</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{n.date}</span>
                        <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
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
