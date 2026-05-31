import { useState } from 'react';

import { FileText, Gavel, ExternalLink, Shield, CheckCircle, ChevronRight, Download, Search } from 'lucide-react';
import { exportToCsv } from '@/utils/csvExport';
import Sidebar from '@/components/Sidebar';
import { getSourceRegistryItem, getVerificationStatusMeta, type VerificationStatus } from '@/data/source-registry';

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

const cpscEfilingSource = getSourceRegistryItem('policy-cpsc-efiling');
const euMdrSource = getSourceRegistryItem('policy-eu-mdr-transition');

// 法规数据 — 按日期分组
const regulationGroups = [
  {
    date: '2026-07-08',
    label: 'NEW',
    isNew: true,
    items: [
      {
        id: 'r-005',
        icon: Gavel,
        title: 'CPSC CPC/eFiling证书数据要求复核',
        region: '美国',
        regionCode: 'US',
        category: '合规复核',
        desc: 'CPSC官方规则要求制造商/进口商为儿童产品出具CPC，并关注eFiling证书数据提交要求；未找到“官网需嵌入实时生成合规声明页面”的官方依据。',
        detail: '当前行动应从“建设官网实时声明页”改为复核CPC证书字段、测试报告、进口eFiling适用范围与实施日期。原Federal Register链接不可作为该规则依据。',
        fullText: 'https://www.cpsc.gov/eFiling',
        source: { name: cpscEfilingSource.sourceName, url: cpscEfilingSource.sourceUrl ?? 'https://www.cpsc.gov/eFiling', reliability: cpscEfilingSource.reliability, lastVerified: cpscEfilingSource.lastVerified },
        momcozyStatus: { status: '进行中', detail: '复核CPC/eFiling字段与SKU适用范围，暂停按未证实官网声明要求开发', progress: 45, owner: '郑法务' },
        impactProducts: ['M5', 'M9', 'M6', 'W1'],
        audit: {录入人: '郑法务', 录入时间: '2026-04-20', 审核状态: '待复核', 审核人: '合规总监', 来源验证: cpscEfilingSource.note, 下次复核: '2026-06-15'},
        color: '#ff3b30',
      },
      {
        id: 'r-001',
        icon: FileText,
        title: 'FDA 21 CFR 884.5160',
        region: '美国',
        regionCode: 'US',
        category: '医疗器械注册',
        desc: '吸奶器作为Class II医疗器械的FDA监管要求，包括510(k)许可申请流程、生物相容性测试、电气安全标准。在美国销售的吸奶器需按产品类别复核适用路径。',
        detail: 'FDA要求所有电动吸奶器提交510(k)上市前通知，证明与已合法上市的谓词器械实质等效。生物相容性测试需符合ISO 10993系列标准，电气安全需符合IEC 60601-1。',
        fullText: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-884/subpart-E/section-884.5160',
        source: { name: 'U.S. Food and Drug Administration', url: 'https://www.fda.gov/medical-devices', reliability: 'A', lastVerified: '2026-05-20' },
        momcozyStatus: { status: '已合规', detail: 'M5/M9/M6均已获得FDA 510(k)许可 (K232847, K241156)', progress: 100, owner: '郑法务' },
        impactProducts: ['M5', 'M9', 'M6'],
        audit: {录入人: '郑法务', 录入时间: '2024-03-15', 审核状态: '已审核', 审核人: '合规总监', 来源验证: '官方来源复核通过', 下次复核: '2026-09-15'},
        color: '#C25B6E',
      },
    ],
  },
  {
    date: '2026-04-20',
    label: '',
    isNew: false,
    items: [
      {
        id: 'r-003',
        icon: Gavel,
        title: 'CPSC 16 CFR 1242 — 婴儿摇篮安全标准更新',
        region: '美国',
        regionCode: 'US',
        category: '标准更新',
        desc: '美国CPSC发布直接最终规则，更新16 CFR Part 1223婴儿摇篮联邦安全标准，纳入ASTM F2088-25。新增前标签可见性测试和强化窒息警告要求。',
        detail: 'ASTM F2088-25更新了摇篮类产品的前向标签可见性测试方法，警告标签在正常使用位置需清晰可见。同时强化了窒息风险警告文字，要求使用更大字号和对比色。',
        fullText: 'https://www.ecfr.gov/current/title-16/chapter-II/part-1242',
        source: { name: 'U.S. Consumer Product Safety Commission', url: 'https://www.cpsc.gov', reliability: 'A', lastVerified: '2026-05-22' },
        momcozyStatus: { status: '已合规', detail: '孕妇枕产品已通过CPSC 16 CFR 1242测试', progress: 100, owner: '林产品' },
        impactProducts: ['孕妇枕'],
        audit: {录入人: '林产品', 录入时间: '2026-04-18', 审核状态: '已审核', 审核人: '质量经理', 来源验证: '官方来源复核通过', 下次复核: '2026-10-18'},
        color: '#ff3b30',
      },
      {
        id: 'r-008',
        icon: FileText,
        title: 'ASTM F2088-25 — 婴儿摇篮标准更新',
        region: '美国',
        regionCode: 'US',
        category: '标准更新',
        desc: '2025年更新的婴儿摇篮安全标准，新增前标签可见性测试和强化窒息警告要求。适用于婴儿摇篮、摇椅等产品类别。',
        detail: '标准更新涵盖三个核心变更：①前向标签在30cm距离内需清晰可读；②窒息警告需使用不小于3mm字号；③新增稳定性测试的倾斜角度要求从10°提高到15°。',
        fullText: 'https://www.astm.org/standards/f2088.htm',
        source: { name: 'ASTM International', url: 'https://www.astm.org', reliability: 'A', lastVerified: '2026-05-22' },
        momcozyStatus: { status: '已完成', detail: '供应商已提供ASTM F2088-25测试报告', progress: 100, owner: '林产品' },
        impactProducts: ['孕妇枕'],
        audit: {录入人: '林产品', 录入时间: '2026-04-18', 审核状态: '已审核', 审核人: '质量经理', 来源验证: '官方来源复核通过', 下次复核: '2026-10-18'},
        color: '#C25B6E',
      },
    ],
  },
  {
    date: '2026-04-15',
    label: '',
    isNew: false,
    items: [
      {
        id: 'r-002',
        icon: Gavel,
        title: 'EU MDR 2017/745 — 医疗器械法规',
        region: '欧盟',
        regionCode: 'EU',
        category: '医疗器械法规',
        desc: '欧盟医疗器械法规下，吸奶器分类、过渡安排和notified body路径需按具体产品复核。涵盖CE marking、临床评估、上市后监管、唯一器械标识(UDI)要求。',
        detail: 'MDR对Class IIa路径、技术文档、质量管理体系审核（ISO 13485）、临床评估报告（CER）和上市后临床随访（PMCF）有要求；过渡期适用条件需逐SKU复核。',
        fullText: 'https://eur-lex.europa.eu/eli/reg/2017/745',
        source: { name: euMdrSource.sourceName, url: euMdrSource.sourceUrl ?? 'https://health.ec.europa.eu/medical-devices-sector/new-regulations_en', reliability: euMdrSource.reliability, lastVerified: euMdrSource.lastVerified },
        momcozyStatus: { status: '进行中', detail: 'TUV SUD已受理CE申请，技术文档准备中；同步复核过渡期适用条件', progress: 45, owner: '郑法务' },
        impactProducts: ['M5', 'M9'],
        audit: {录入人: '郑法务', 录入时间: '2024-06-20', 审核状态: '待复核', 审核人: '合规总监', 来源验证: euMdrSource.note, 下次复核: '2026-08-20'},
        color: '#5856d6',
      },
    ],
  },
  {
    date: '2026-03-10',
    label: '',
    isNew: false,
    items: [
      {
        id: 'r-004',
        icon: FileText,
        title: 'GB 46523-2025 — 儿童用品通用安全要求',
        region: '中国',
        regionCode: 'CN',
        category: '国标实施',
        desc: '2026年11月实施的新版儿童用品通用安全标准，新增甲醛/有害芳香胺/多环芳烃限制。虽主要针对玩具，但母乳储存袋等辅助用品也需关注材质合规性。',
        detail: 'GB 46523-2025涵盖四大安全维度：物理机械性能、化学安全性（甲醛≤30mg/kg）、阻燃性能和标识要求。特别新增了对36个月以下儿童用品的额外安全要求。',
        fullText: 'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/rzjgs/',
        source: { name: '国家市场监督管理总局', url: 'https://www.samr.gov.cn', reliability: 'A', lastVerified: '2026-05-15' },
        momcozyStatus: { status: '进行中', detail: '产品材质检测报告已出，物理测试进行中', progress: 35, owner: '王运营' },
        impactProducts: ['M5', 'M9', 'M6', '温奶器', '消毒器'],
        audit: {录入人: '王运营', 录入时间: '2026-03-10', 审核状态: '已审核', 审核人: '合规总监', 来源验证: '官方来源复核通过', 下次复核: '2026-08-10'},
        color: '#34c759',
      },
    ],
  },
  {
    date: '2025-12-01',
    label: '',
    isNew: false,
    items: [
      {
        id: 'r-006',
        icon: Shield,
        title: '日本新《消费品安全法》— PSC标志强制认证',
        region: '日本',
        regionCode: 'JP',
        category: '强制认证',
        desc: '36个月以下玩具类产品需复核PSC标志认证适用性。新法扩大了PSC标志的适用范围，部分婴幼儿护理电器产品需逐SKU确认。',
        detail: '根据日本《消费品安全法》修订案，36个月以下儿童用品需复核PSC（Product Safety of Consumer products）标志认证路径。认证通常需由日本经济产业省(METI)指定的测试机构进行。',
        fullText: 'https://www.meti.go.jp/policy/consumer/seihin/consumer-products-safety-act.html',
        source: { name: '日本经济产业省(METI)', url: 'https://www.meti.go.jp', reliability: 'A', lastVerified: '2026-05-10' },
        momcozyStatus: { status: '待启动', detail: 'PSC认证申请准备中，需联系日本代理机构', progress: 10, owner: '郑法务' },
        impactProducts: ['M5', 'M9', 'W1'],
        audit: {录入人: '郑法务', 录入时间: '2025-12-05', 审核状态: '待复核', 审核人: '合规总监', 来源验证: '官方链接和SKU适用范围待复核', 下次复核: '2026-08-05'},
        color: '#0077b6',
      },
    ],
  },
  {
    date: '2025-12-15',
    label: '',
    isNew: false,
    items: [
      {
        id: 'r-007',
        icon: FileText,
        title: 'Health Canada 2025-2027前向监管计划',
        region: '加拿大',
        regionCode: 'CA',
        category: '监管计划',
        desc: 'Health Canada发布2025-2027年母婴产品前向监管计划，预告了未来两年的监管重点方向，包括新的化学品限制和标签要求。',
        detail: '监管计划重点关注三大领域：①新型阻燃剂的限制使用；②儿童产品中内分泌干扰物的检测要求；③数字化产品信息标签的试点推行。Momcozy已订阅Health Canada更新通知。',
        fullText: 'https://www.canada.ca/en/health-canada/corporate/transparency/regulatory-transparency/regulatory-plan.html',
        source: { name: 'Health Canada', url: 'https://www.canada.ca', reliability: 'A', lastVerified: '2026-05-12' },
        momcozyStatus: { status: '已跟踪', detail: '已订阅Health Canada更新通知', progress: 100, owner: '郑法务' },
        impactProducts: ['全线产品'],
        audit: {录入人: '郑法务', 录入时间: '2025-12-20', 审核状态: '已审核', 审核人: '合规总监', 来源验证: '官方来源复核通过', 下次复核: '2026-11-15'},
        color: '#ff9500',
      },
    ],
  },
  {
    date: '2025-12-15',
    label: '',
    isNew: false,
    items: [
      {
        id: 'r-009',
        icon: Shield,
        title: 'UKCA marking — 英国脱欧后产品认证要求',
        region: '英国',
        regionCode: 'UK',
        category: '产品认证',
        desc: '英国脱欧后替代CE marking的UKCA标志要求。吸奶器需符合BS EN标准并通过UKCA认证。GPSR通用产品安全法规同时适用。',
        detail: 'UKCA marking适用于英格兰、苏格兰和威尔士市场。吸奶器需符合BS EN 1717:2019标准，并通过UK approved body的合格评定。北爱尔兰市场仍接受CE marking。',
        fullText: 'https://www.gov.uk/guidance/using-the-ukca-marking',
        source: { name: 'UK Government', url: 'https://www.gov.uk', reliability: 'A', lastVerified: '2026-05-12' },
        momcozyStatus: { status: '已合规', detail: 'M5/M9已通过UKCA认证', progress: 100, owner: '郑法务' },
        impactProducts: ['M5', 'M9'],
        audit: {录入人: '郑法务', 录入时间: '2024-01-15', 审核状态: '已审核', 审核人: '合规总监', 来源验证: '官方来源复核通过', 下次复核: '2026-11-15'},
        color: '#5856d6',
      },
    ],
  },
];

const statusColors: Record<string, string> = {
  '已合规': '#34c759', '进行中': '#ff9500', '待启动': '#ff3b30', '已跟踪': '#5856d6',
};

const allRegulations = regulationGroups.flatMap(g => g.items);

type RegulationItem = (typeof allRegulations)[number];

function getRegulationVerificationStatus(card: RegulationItem): VerificationStatus {
  const auditValues = Object.values(card.audit).join(' ');
  if (auditValues.includes('待复核') || auditValues.includes('未发现') || auditValues.includes('待法务复核')) {
    return 'needs-review';
  }

  return 'verified';
}

export default function RegulationDetail() {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('全部');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  

  const regions = ['全部', ...Array.from(new Set(allRegulations.map(r => r.region)))];

  const filteredGroups = regulationGroups.map(g => ({
    ...g,
    items: g.items.filter(r => {
      if (regionFilter !== '全部' && r.region !== regionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
      }
      return true;
    }),
  })).filter(g => g.items.length > 0);

  const totalFiltered = filteredGroups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">

            {/* 头部 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm">
                    <Gavel className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">行业法规与标准解读</h1>
                    <p className="text-xs text-[#86868b]">2025-2026 · 共 {allRegulations.length} 条</p>
                  </div>
                </div>
                <button onClick={() => exportToCsv(
                  allRegulations.map(r => ({ id: r.id, title: r.title, region: r.region, category: r.category, status: r.momcozyStatus.status, progress: r.momcozyStatus.progress, source: r.source.name })),
                  { id: 'ID', title: '法规名称', region: '国家', category: '分类', status: '合规状态', progress: '进度%', source: '来源' },
                  '法规清单_' + new Date().toISOString().slice(0, 10)
                )} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all border border-[#EDE6DF]">
                  <Download className="w-3.5 h-3.5" />导出CSV
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                  <Search className="w-4 h-4 text-[#B5AFA8]" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索法规名称、描述..." className="flex-1 min-w-0 text-sm bg-transparent outline-none text-[#1d1d1f] placeholder-[#B5AFA8]" />
                </div>
                <div className="flex items-center gap-1">
                  {regions.map(r => (
                    <button key={r} onClick={() => setRegionFilter(r)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${regionFilter === r ? 'bg-[#C25B6E] text-white' : 'bg-[#FBF8F5] text-[#86868b] hover:bg-[#F5EDE8]'}`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 时间线布局 */}
            <div className="relative pl-8 space-y-8">
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#ff3b30] via-[#ff9500] to-[#34c759] rounded-full opacity-20" />
              {filteredGroups.map((group, groupIndex) => (
                <div key={`${group.date}-${groupIndex}`}>
                  {/* 日期标题 */}
                  <div className="relative flex items-center gap-3 mb-4">
                    <div className={`absolute -left-5 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 ${group.isNew ? 'bg-[#C25B6E]' : 'bg-[#EDE6DF]'}`}>
                      {group.isNew && <span className="text-[8px] text-white font-bold">N</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">{group.date}</h3>
                    <span className="text-xs text-[#86868b]">{group.items.length} 条法规</span>
                    {group.isNew && (
                      <span className="px-2 py-0.5 rounded-md bg-[#C25B6E]/10 text-[#C25B6E] text-[10px] font-bold">NEW</span>
                    )}
                  </div>

                  {/* 法规卡片 */}
                  <div className="space-y-3">
                    {group.items.map(card => {
                      const IconComp = card.icon;
                      const isExpanded = expandedId === card.id;
                      const sc = statusColors[card.momcozyStatus.status] || '#86868b';
                      const verification = getVerificationStatusMeta(getRegulationVerificationStatus(card));
                      return (
                        <div key={card.id} className={`bg-white rounded-2xl card-shadow-sm border transition-all ${isExpanded ? 'border-[#C25B6E]/30' : 'border-[#EDE6DF] hover:border-[#C25B6E]/20'}`}>
                          <div className="p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : card.id)}>
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                                <IconComp className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-[#FBF8F5] text-[10px] text-[#86868b] font-medium">{card.regionCode}</span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white" style={{ backgroundColor: card.color }}>{card.category}</span>
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-white ml-auto" style={{ backgroundColor: sc }}>
                                    {card.momcozyStatus.status} {card.momcozyStatus.progress}%
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${verification.color}15`, color: verification.color }}>
                                    {verification.label}
                                  </span>
                                </div>
                                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-2">{card.title}</h3>
                                <p className="text-xs text-[#86868b] leading-relaxed truncate">{card.desc}</p>
                                <div className="mt-3 flex items-center gap-2">
                                  <div className="flex-1 min-w-0 h-1.5 rounded-full bg-[#FBF8F5] overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${card.momcozyStatus.progress}%`, backgroundColor: sc }} />
                                  </div>
                                  <ChevronRight className={`w-4 h-4 text-[#B5AFA8] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-5 pb-5 border-t border-[#EDE6DF]/50 pt-4 space-y-3">
                              {/* 详细描述 */}
                              <div className="p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                                <p className="text-[11px] text-[#1d1d1f] leading-relaxed">{card.detail}</p>
                              </div>
                              {/* Momcozy合规 */}
                              <div className="p-3 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                                <p className="text-[10px] text-[#C25B6E] font-semibold mb-1">Momcozy应对</p>
                                <p className="text-xs text-[#1d1d1f]">{card.momcozyStatus.detail}</p>
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  <span className="text-[9px] text-[#86868b]">影响产品：</span>
                                  {card.impactProducts.map((p, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-white text-[9px] text-[#C25B6E] font-medium border border-[#EDE6DF]">{p}</span>)}
                                </div>
                              </div>
                              {/* 原文出处 */}
                              <div className="p-3 rounded-xl bg-[#5856d6]/5 border border-[#5856d6]/10">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <a href={card.source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#5856d6] hover:underline bg-white px-2 py-1 rounded border border-[#5856d6]/20">
                                    <ExternalLink className="w-3 h-3" />{card.source.name}
                                  </a>
                                  <a href={card.fullText} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#5856d6] hover:underline bg-white px-2 py-1 rounded border border-[#5856d6]/20">
                                    <FileText className="w-3 h-3" />查看全文
                                  </a>
                                  <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded" style={{ color: verification.color, backgroundColor: `${verification.color}0d` }}>
                                    <CheckCircle className="w-3 h-3" />{verification.label} · 可信度{card.source.reliability} · {card.source.lastVerified}
                                  </span>
                                </div>
                              </div>
                              {/* 审计 */}
                              <div className="p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                                <p className="text-[10px] text-[#86868b] font-semibold mb-1.5">信息审计</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {Object.entries(card.audit).map(([key, val], i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                      <span className="text-[9px] text-[#B5AFA8]">{key}:</span>
                                      <span className={`text-[9px] font-medium ${val === '已审核' || val === '官方来源复核通过' ? 'text-[#34c759]' : val.includes('复核') || val.includes('未发现') ? 'text-[#ff9500]' : 'text-[#1d1d1f]'}`}>{val}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {totalFiltered === 0 && (
                <div className="p-8 text-center">
                  <Search className="w-8 h-8 text-[#EDE6DF] mx-auto mb-2" />
                  <p className="text-sm text-[#86868b]">未找到匹配结果</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
