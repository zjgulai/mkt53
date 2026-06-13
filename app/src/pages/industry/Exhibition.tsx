
import { Calendar, CheckCircle2, ExternalLink, Globe, MapPin, Ticket, Users } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const exhibitions = [
  {
    id: 1,
    name: 'ABC Kids Expo 2026',
    location: 'Las Vegas, US · Mandalay Bay',
    date: '2026-05-13 ~ 05-15',
    status: '已结束',
    audience: '官方展商页预估 4,000-5,000 专业观众',
    momcozyBooth: '待补展位记录',
    sourceName: 'ABC Kids Expo exhibitor page',
    sourceUrl: 'https://theabcshow.com/pages/exhibitors-2024',
    highlights: ['北美 B2B juvenile products 展会', '2026 展商页已公开日期与地点', '经营复盘需补 CRM 或展会复盘快照'],
    feedback: '公开来源可确认展会日程与地点；线索、订单、满意度和 ROI 暂不作为已采集经营数据展示。',
  },
  {
    id: 2,
    name: 'Kind + Jugend 2026',
    location: 'Cologne, Germany',
    date: '2026-09-15 ~ 09-17',
    status: '报名中',
    audience: '官方展会页已发布 2026 档期',
    momcozyBooth: '待补展位记录',
    sourceName: 'Kind + Jugend official',
    sourceUrl: 'https://www.kindundjugend.com/trade-fair/kind-jugend/',
    highlights: ['欧洲母婴用品与儿童用品展会', '2026 档期为 9 月 15-17 日', '参展计划需补内部展位与预算记录'],
    feedback: '当前只把官网档期作为参展线索；展位、费用、达人合作和销售目标需内部计划单补证。',
  },
  {
    id: 3,
    name: 'CBME China 2026',
    location: 'Shanghai, China · NECC',
    date: '2026-07-15 ~ 07-17',
    status: '报名中',
    audience: '官方页面确认 2026 年上海国家会展中心档期',
    momcozyBooth: '待补展位记录',
    sourceName: 'CBME China official',
    sourceUrl: 'https://www.cbmexpochina.com/about-cbme-china/',
    highlights: ['中国孕婴童产业展会', '2026 档期为 7 月 15-17 日', '平台招商与渠道动作需另补计划表'],
    feedback: '官网可支撑日期与地点；招商会、渠道合作和全品类展示仍需内部活动方案确认。',
  },
  {
    id: 4,
    name: 'Pueri Expo 2026',
    location: 'São Paulo, Brazil · Expo Center Norte',
    date: '2026-04-26 ~ 04-28',
    status: '已结束',
    audience: '公开展会目录确认 2026 档期',
    momcozyBooth: '待补展位记录',
    sourceName: 'Pueri Expo public listing',
    sourceUrl: 'https://en.cns.travel/trade-show/pueri-expo-sao-paulo',
    highlights: ['巴西婴童用品专业展会', '2026 档期为 4 月 26-28 日', '南美经营反馈需展后复盘凭证'],
    feedback: '本条只用于南美展会日程线索；价格敏感度、试销协议和订单结果不再作为已验证事实展示。',
  },
  {
    id: 5,
    name: 'Baby & Kids Expo Tokyo Summer 2026',
    location: 'Tokyo, Japan · Tokyo Big Sight',
    date: '2026-06-24 ~ 06-26',
    status: '即将举办',
    audience: '官方 Lifestyle Week Tokyo Summer 档期',
    momcozyBooth: '待补展位记录',
    sourceName: 'Lifestyle Week Tokyo official',
    sourceUrl: 'https://www.lifestyle-expo.jp/summer/en-gb.html',
    highlights: ['日本生活方式展 Baby & Kids Expo 展区', '2026 档期为 6 月 24-26 日', '本地化展示材料需补内部执行记录'],
    feedback: '当前可作为日本市场展会线索；达人合作、限定配色和 Mini 产品首秀需品牌活动计划单补证。',
  },
];

const reviewSummary = [
  { label: '公开日程已补证', value: '5', detail: '名称、日期、地点、状态来自公开来源' },
  { label: '经营复盘待补', value: '5', detail: '线索、订单、ROI 需 CRM 或展后复盘快照' },
  { label: '下一场待举办', value: '3', detail: 'Tokyo、CBME、Kind + Jugend 仍在 2026 后续窗口' },
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
                  <p className="text-xs text-[#86868b]">追踪全球 {exhibitions.length} 大母婴行业展会，公开日程已补证，经营复盘待补来源</p>
                </div>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-018']}
              title="展会线索使用口径"
              description="展会官网可支撑日程与参展线索，但线索数、订单和 ROI 仍需 CRM 或展会复盘快照复核；页面不直接输出经营结论。"
            />

            {/* Source Review Summary */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-4">公开来源补证状态</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {reviewSummary.map((item) => (
                  <div key={item.label} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
                      <span className="text-[11px] font-medium text-[#1d1d1f]">{item.label}</span>
                    </div>
                    <div className="text-2xl font-semibold text-[#C25B6E]">{item.value}</div>
                    <p className="text-[10px] text-[#86868b] mt-1 leading-relaxed">{item.detail}</p>
                  </div>
                ))}
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-[#1d1d1f]">{e.name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${e.status === '已结束' ? 'bg-[#34c759]/10 text-[#34c759]' : e.status === '即将举办' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#C25B6E]/10 text-[#C25B6E]'}`}>{e.status}</span>
                        <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto text-[10px] text-[#C25B6E] inline-flex items-center gap-1 hover:underline">
                          {e.sourceName}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex items-center gap-4 mb-3 text-[10px] text-[#86868b] flex-wrap">
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{e.location}</span>
                        <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{e.date}</span>
                        <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{e.audience}</span>
                        <span className="flex items-center gap-0.5"><Ticket className="w-3 h-3" />{e.momcozyBooth}</span>
                      </div>
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
