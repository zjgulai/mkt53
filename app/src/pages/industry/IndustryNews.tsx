import { useState } from 'react';
import { Newspaper, Clock, TrendingUp, ExternalLink, Filter } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const newsItems = [
  {
    id: 1,
    title: 'Momcozy Wearable Breast Pump K253283 获 FDA 510(k) substantially equivalent 判定',
    source: 'FDA.gov',
    date: '2025-09-25',
    category: '法规',
    tag: '重要',
    hot: true,
    verification: '已补证',
    sourceUrl: 'https://www.accessdata.fda.gov/cdrh_docs/pdf25/K253283.pdf',
  },
  {
    id: 2,
    title: 'Mordor：可穿戴吸奶器市场 2025 年 USD 615.55M，2030 年 USD 899.53M',
    source: 'Mordor Intelligence',
    date: '补证 2026-06-11',
    category: '市场',
    tag: null,
    hot: true,
    verification: '已补证',
    sourceUrl: 'https://www.mordorintelligence.com/industry-reports/wearable-breast-pumps-market',
  },
  {
    id: 3,
    title: 'eufy Wearable Breast Pump S1 获 FDA 510(k) 许可线索，需补 K250207 官方文件',
    source: 'FDA.gov',
    date: '待复核',
    category: '竞品',
    tag: null,
    hot: false,
    verification: '待复核',
    sourceUrl: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm',
  },
  {
    id: 4,
    title: '中国 GB 6675-2025 玩具安全新标准发布，2026 年 11 月计划生效',
    source: 'SAC China',
    date: '待复核',
    category: '法规',
    tag: '重要',
    hot: true,
    verification: '待复核',
    sourceUrl: 'https://www.sac.gov.cn/',
  },
  {
    id: 5,
    title: '欧盟 MDR 过渡期延长至 2027-2028 年，Class IIa 影响需按证书条件复核',
    source: 'EU Commission',
    date: '2024-12-18',
    category: '法规',
    tag: null,
    hot: false,
    verification: '待复核',
    sourceUrl: 'https://health.ec.europa.eu/medical-devices-sector/new-regulations_en',
  },
  {
    id: 6,
    title: 'Medela Pump In Style Pro 获 2026 Best New Product / Breast Milk Pump 相关认可',
    source: 'Medela',
    date: '补证 2026-06-11',
    category: '竞品',
    tag: null,
    hot: false,
    verification: '已补证',
    sourceUrl: 'https://www.medela.com/en/about-medela/medela-news/pump-in-style-pro-named-best-new-product-in-the-us-for-2026',
  },
  {
    id: 7,
    title: '美国 CPSC 16 CFR Part 1242 哺乳枕安全规则适用于 2025-04-23 后生产产品',
    source: 'CPSC',
    date: '2025-04-23',
    category: '法规',
    tag: '重要',
    hot: true,
    verification: '已补证',
    sourceUrl: 'https://www.cpsc.gov/Business--Manufacturing/Business-Education/Business-Guidance/Nursing-Pillows',
  },
  {
    id: 8,
    title: '母婴行业 2025 年 Q2 投融资报告线索：可穿戴设备赛道数据需补原文 URL',
    source: '36氪',
    date: '待复核',
    category: '资本',
    tag: null,
    hot: false,
    verification: '待复核',
    sourceUrl: null,
  },
  {
    id: 9,
    title: 'Willow Go / Willow 3.0 新品表述待官网新闻稿复核，暂不作为确定新品事实',
    source: 'Willow',
    date: '待复核',
    category: '竞品',
    tag: null,
    hot: false,
    verification: '待复核',
    sourceUrl: 'https://onewillow.com/',
  },
  {
    id: 10,
    title: '中国工信部儿童用品强制性国标草案线索，需补公告原文与适用范围',
    source: 'MIIT',
    date: '待复核',
    category: '法规',
    tag: null,
    hot: false,
    verification: '待复核',
    sourceUrl: 'https://www.miit.gov.cn/',
  },
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

const verificationColors: Record<string, string> = {
  '已补证': '#34c759',
  '待复核': '#ff9500',
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

            <PageEvidenceNotice
              sourceIds={['ds-034']}
              title="行业资讯条目复核口径"
              description="资讯列表为手工汇编，仍需逐条补原文 URL、发布日期和复核状态；不能把整页列表视为已验证新闻流。"
            />

            <div className="space-y-4">
              {filtered.map((n) => (
                <div key={n.id} className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${catColors[n.category]}15` }}>
                      <Newspaper className="w-5 h-5" style={{ color: catColors[n.category] }} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white" style={{ backgroundColor: catColors[n.category] }}>{n.category}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: `${verificationColors[n.verification]}15`, color: verificationColors[n.verification] }}>{n.verification}</span>
                        {n.tag && <span className="px-2 py-0.5 rounded-md bg-[#ff3b30]/10 text-[10px] text-[#ff3b30] font-medium">{n.tag}</span>}
                        {n.hot && <span className="px-2 py-0.5 rounded-md bg-[#ff9500]/10 text-[10px] text-[#ff9500] font-medium flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />热门</span>}
                      </div>
                      <h3 className="text-sm font-medium text-[#1d1d1f] group-hover:text-[#C25B6E] transition-colors duration-200 mb-1 line-clamp-2">{n.title}</h3>
                      <div className="flex items-center gap-4 text-[10px] text-[#86868b] flex-wrap">
                        <span>{n.source}</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{n.date}</span>
                        {n.sourceUrl ? (
                          <a href={n.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[#C25B6E] hover:underline">
                            来源
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="ml-auto text-[#86868b]">来源待补</span>
                        )}
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
