import { useState, useCallback, type ReactNode } from 'react';
import { Globe, Gavel, Beaker, Newspaper, Cpu, ScrollText, Shield, MapPin, FileText, TrendingUp, AlertTriangle, FileSearch } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import type { SidebarItem } from '@/components/Sidebar';
import WorldMap from '@/components/WorldMap';
import type { MapMarker } from '@/components/WorldMap';

const policyMapData = [
  { country: '美国', sourceIds: ['ds-015', 'policy-cpsc-efiling'], status: '严格标准', color: '#ff3b30', details: 'FDA 21 CFR 884.5160将吸奶器列为Class II器械。CPSC CPC/eFiling要求需按官方证书与电子提交规则复核；未确认官网即时合规声明强制要求。ASTM F2088-25婴儿摇篮标准2026年7月生效。16 CFR 1242/1243哺乳枕/支撑垫标准已生效', tags: ['FDA 510(k)', 'CPSC CPSIA', 'ASTM F963-23', '16 CFR 1242'] },
  { country: '欧盟', sourceIds: ['ds-015', 'ds-016', 'policy-eu-mdr-transition'], status: 'MDR监管', color: '#C25B6E', details: 'MDR 2017/745将吸奶器归为Class IIa医疗器械，需CE marking+notified body评定。过渡期延至2027-2028年。IEC 60601-1电气安全+ISO 10993生物相容性+REACH/RoHS化学品限制', tags: ['MDR 2017/745', 'CE marking', 'IEC 60601-1', 'REACH RoHS'] },
  { country: '英国', sourceIds: ['ds-016'], status: '标准领先', color: '#ff9500', details: 'UKCA marking替代CE marking。BS EN 14350儿童饮水器具安全标准。GPSR通用产品安全法规适用。美国CPSC规则不直接适用于英国渠道，跨境销售需按目的地市场单独判断；条目级来源仍需逐项复核。', tags: ['UKCA', 'BS EN 14350', 'GPSR', '产品安全法'] },
  { country: '加拿大', sourceIds: ['ds-016'], status: '高标准', color: '#C25B6E', details: 'CCPSA《加拿大消费品安全法》严格执行。2025-2026财年禁止婴儿学步车、自喂养装置等6类产品在线销售。Health Canada 2025-2027监管计划延续配方奶粉进口豁免；条目级来源仍需逐项复核。', tags: ['CCPSA', 'Health Canada', 'SOR/2018-83', '禁止清单'] },
  { country: '中国', sourceIds: ['ds-015', 'ds-016'], status: '加速完善', color: '#34c759', details: 'GB 46523-2025儿童用品通用安全+GB 46516婴幼儿护理用品安全，2026年11月实施。GB/T 46491-2025婴儿食品加工器具2026年5月生效。GB 6675.1-4-2025玩具安全系列全面更新', tags: ['GB 46523-2025', 'GB 46516', 'GB 6675', '3C认证'] },
  { country: '日本', sourceIds: ['ds-015', 'ds-016'], status: '强制认证', color: '#af52de', details: '2025年12月25日新《消费品安全法》实施：36个月以下玩具强制PSC标志。ST2025标准同步生效，覆盖ISO 8124-1/2、EN 71-1/2、ASTM F963-23。婴幼儿护理用品受食品卫生法监管', tags: ['PSC标志', 'ST2025', 'CPSA', '食品卫生法'] },
  { country: '澳大利亚', sourceIds: ['ds-016'], status: '严格准入', color: '#5856d6', details: 'ACCC严格执法，2025年7月紧急召回婴儿头部支撑带和自喂养枕。ACMA对无线婴儿监视器进行认证管理。CPSIA合规要求与新西兰联合监管趋严；条目级来源仍需逐项复核。', tags: ['ACCC召回', 'ACMA认证', 'CPSIA', '消费者法'] },
];

const policyMarkers: MapMarker[] = [
  { name: '美国', coordinates: [-95.7, 37.1], color: '#ff3b30', status: '严格标准', id: '美国' },
  { name: '欧盟', coordinates: [10.0, 51.0], color: '#C25B6E', status: 'MDR监管', id: '欧盟' },
  { name: '英国', coordinates: [-1.5, 52.5], color: '#ff9500', status: '标准领先', id: '英国' },
  { name: '加拿大', coordinates: [-106.3, 56.1], color: '#C25B6E', status: '高标准', id: '加拿大' },
  { name: '中国', coordinates: [104.1, 35.8], color: '#34c759', status: '加速完善', id: '中国' },
  { name: '日本', coordinates: [138.2, 36.5], color: '#af52de', status: '强制认证', id: '日本' },
  { name: '澳大利亚', coordinates: [133.8, -25.3], color: '#5856d6', status: '严格准入', id: '澳大利亚' },
];

const policyTimeline = [
  { date: '2026-07-08', events: ['美国CPSC CPC/eFiling要求进入重点复核期：进口受监管消费品需关注证书数据电子提交字段、适用产品范围和实施节奏', '未核实到“所有儿童产品官网需嵌入即时生成合规声明页面”的官方强制要求；原Federal Register链接需从可信来源中移除'] },
  { date: '2026-04-20', events: ['美国CPSC发布直接最终规则，更新16 CFR Part 1223婴儿摇篮联邦安全标准，纳入ASTM F2088-25', '新标准新增前警告标签可见性测试（第7.17节），强化窒息风险警告语言， restraint警告从"ALWAYS use"升级为"ALWAYS USE RESTRAINTS"，2026年7月25日生效'] },
  { date: '2026-03-16', events: ['CPSC宣布2026年推出婴儿睡眠安全新标准，加强婴儿睡衣可燃性要求', '新标准限制睡衣材料类型，要求所有婴儿睡衣具备阻燃性，限制绳带长度防止缠绕风险'] },
  { date: '2025-12-25', events: ['日本新《消费品安全法》（CPSA）正式生效：36个月以下玩具强制PSC标志认证', 'ST2025标准同步实施，覆盖ISO 8124-1:2022、ISO 8124-2:2023、EN 71-1/2、ASTM F963-23', '婴儿床被列为儿童特定产品+特殊特定产品，需PSC标志+特定设计标签'] },
  { date: '2025-11-01', events: ['中国GB 46523-2025《儿童用品通用安全要求》正式发布，2026年11月1日实施', 'GB 46516-2025《婴幼儿护理用品通用安全要求》发布，覆盖吸奶器、奶瓶、安抚奶嘴等', 'GB/T 46491-2025《婴儿食品加工器具》标准发布，2026年5月1日生效'] },
  { date: '2025-10-05', events: ['中国发布GB 6675.1-4-2025玩具安全系列新标准，全面替代2014版', '新增GB/T 46509玩具VOC释放测定、GB/T 46510水性材料游离甲醛测定', 'GB 6675.10-2025新增嗅觉棋盘游戏、化妆品套装和味觉游戏安全要求'] },
  { date: '2025-09-08', events: ['Momcozy新型号电动吸奶器BP223获得FDA 510(k)许可（K251394号），申请人：深圳Root Innovation Technology', 'Fimilla(上海)母婴用品HL-3060/F5113电动吸奶器获FDA 510(k)许可（K252630号）'] },
  { date: '2025-07-05', events: ['澳大利亚ACCC紧急召回Ezone婴儿头部支撑带（Z1451/Z1758），警告车祸中脊柱损伤或死亡风险', 'ACCC同时召回婴儿自喂养枕（Z3007/Z3008），警告窒息和吸入性肺炎风险', 'ACCC记录多起相关事件，建议消费者立即停用并安全处置'] },
  { date: '待复核（来源核验中）', events: ['美国CPSC向获批实验室通报儿童产品检测资质审批注意事项', '16 CFR 1242哺乳枕标准和16 CFR 1243支撑垫标准实验室认可范围须严格匹配ASTM F963-23章节编号', '多家实验室因认可范围列表不完整被要求整改'] },
];

// Section definitions: map tab ID <-> sidebar structure
const sectionTabs = [
  { label: '政策分析', id: 'policy' },
  { label: 'VOC趋势', id: 'flavor' },
  { label: '行业新闻', id: 'news' },
  { label: '供应链情报', id: 'supply' },
  { label: 'IP分析', id: 'ip' },
  { label: '展会调研', id: 'exhibition' },
  { label: '区域宏观', id: 'macro' },
];

// Sidebar items with sectionId for unified navigation
const sidebarItems: SidebarItem[] = [
  {
    label: '政策分析',
    sectionId: 'policy',
    defaultOpen: true,
    children: [
      { label: '母婴标准与法规地图', sectionId: 'policy', icon: <Globe className="w-4 h-4" /> },
      { label: '行业法规与标准解读', sectionId: 'policy', icon: <Gavel className="w-4 h-4" /> },
      { label: '区域标准洞察', sectionId: 'policy', icon: <Shield className="w-4 h-4" /> },
    ],
  },
  {
    label: 'VOC趋势',
    sectionId: 'flavor',
    children: [
      { label: 'VOC趋势地图', sectionId: 'flavor', icon: <MapPin className="w-4 h-4" /> },
      { label: 'VOC趋势报告', sectionId: 'flavor', icon: <Beaker className="w-4 h-4" /> },
    ],
  },
  {
    label: '行业新闻',
    sectionId: 'news',
    children: [
      { label: '母婴行业资讯', sectionId: 'news', icon: <Newspaper className="w-4 h-4" /> },
      { label: '母婴科技资讯', sectionId: 'news', icon: <Cpu className="w-4 h-4" /> },
      { label: '母婴行业报告', sectionId: 'news', icon: <ScrollText className="w-4 h-4" /> },
    ],
  },
  { label: '母婴供应链情报', sectionId: 'supply', icon: <FileText className="w-4 h-4" /> },
  { label: 'IP分析', sectionId: 'ip', icon: <Shield className="w-4 h-4" /> },
  { label: '母婴展会调研', sectionId: 'exhibition', icon: <Globe className="w-4 h-4" /> },
  { label: '区域宏观分析', sectionId: 'macro', icon: <MapPin className="w-4 h-4" /> },
];

function GatedIndustrySection({
  sourceIds,
  title,
  description,
  blockers,
  nextSteps,
}: {
  sourceIds: string[];
  title: string;
  description: string;
  blockers: string[];
  nextSteps: string[];
}) {
  return (
    <div className="space-y-4">
      <PageEvidenceNotice
        sourceIds={sourceIds}
        title={`${title}来源门禁`}
        description={description}
        cadence="证据补齐后恢复图表"
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#EDE6DF] bg-white p-5 card-shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#ff9500]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f]">当前阻断项</h3>
          </div>
          <div className="space-y-2">
            {blockers.map((item) => (
              <div key={item} className="rounded-xl bg-[#FBF8F5] px-3 py-2 text-xs leading-relaxed text-[#6E625D]">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#EDE6DF] bg-white p-5 card-shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-[#5856d6]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f]">恢复展示前置任务</h3>
          </div>
          <div className="space-y-2">
            {nextSteps.map((item) => (
              <div key={item} className="rounded-xl bg-[#FBF8F5] px-3 py-2 text-xs leading-relaxed text-[#6E625D]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceHandoffSection({
  sourceIds,
  title,
  description,
  cards,
  targetHref,
  targetLabel,
}: {
  sourceIds: string[];
  title: string;
  description: string;
  cards: Array<{ title: string; body: string; icon: ReactNode; tone: string }>;
  targetHref: string;
  targetLabel: string;
}) {
  return (
    <div className="space-y-4">
      <PageEvidenceNotice
        sourceIds={sourceIds}
        title={`${title}展示口径`}
        description={description}
        cadence="专页维护条目级来源"
      />
      <div className="rounded-2xl border border-[#EDE6DF] bg-white p-5 card-shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#1d1d1f]">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#86868b]">主聚合页只保留入口和来源边界，条目级数据统一在专页维护，避免同一指标出现双口径。</p>
          </div>
          <a
            href={targetHref}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-[#C25B6E] px-3 text-xs font-medium text-white transition-colors hover:bg-[#A33D52]"
          >
            {targetLabel}
          </a>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {cards.map((card) => (
            <div key={card.title} className="rounded-xl bg-[#FBF8F5] p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${card.tone}15`, color: card.tone }}>
                  {card.icon}
                </div>
                <h4 className="text-xs font-semibold text-[#1d1d1f]">{card.title}</h4>
              </div>
              <p className="text-xs leading-relaxed text-[#6E625D]">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IndustryPage() {
  const [activeSection, setActiveSection] = useState('policy');
  const [activeRegion, setActiveRegion] = useState('美国');
  const activeRegionData = policyMapData.find(d => d.country === activeRegion) || policyMapData[0];

  const handleSectionChange = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          {/* Sidebar: unified navigation with activeSection */}
          <Sidebar
            items={sidebarItems}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />

          <div className="flex-1 min-w-0 space-y-6">
            {/* Horizontal Navigation Tabs */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-1 flex-wrap">
                {sectionTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleSectionChange(tab.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeSection === tab.id
                        ? 'bg-[#C25B6E] text-white'
                        : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-015', 'ds-016']}
              title="行业总览来源口径"
              description="行业规模背景可引用外部报告，但法规、新闻、VOC、供应链和IP条目必须逐项复核；页面当前结论作为半月复核线索。"
            />

            {/* ── 政策分析 Section ── */}
            {activeSection === 'policy' && (
              <div className="space-y-6">
                {/* R36: 合规风险总览 */}
                <div className="bg-gradient-to-r from-[#ff3b30]/5 to-[#FBF8F5] rounded-2xl p-4 card-shadow-sm border border-[#ff3b30]/15 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-[#ff3b30]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-[#ff3b30]">Momcozy 合规风险总览</p>
                      <span className="px-1.5 py-0.5 rounded bg-[#ff3b30]/10 text-[#ff3b30] text-[9px] font-bold">P1</span>
                    </div>
                    {/* audit-source: policy-cpsc-efiling policy-eu-mdr-transition */}
                    <p className="text-xs text-[#1d1d1f]">美国CPSC CPC/eFiling与欧盟MDR入口已有官方来源；产品级证书字段、适用SKU和实施日期仍需内部合规台账复核。</p>
                    {/* audit-source: ds-016 */}
                    <p className="mt-1 text-xs text-[#1d1d1f]">日本PSC认证8月到期需续期；条目级来源和SKU适用性仍待复核。建议优先级：美国复核{'>'}日本{'>'}欧盟MDR。</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-[#C25B6E]" strokeWidth={2} />
                      </div>
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">全球母婴标准与法规地图</h3>
                    </div>
                    <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2.5 py-1 rounded-lg">点击地图标记查看详情</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 h-[400px] bg-[#F5F0EB] rounded-2xl overflow-hidden relative">
                      <WorldMap
                        markers={policyMarkers}
                        activeId={activeRegion}
                        onMarkerClick={setActiveRegion}
                      />
                    </div>
                    <div className="lg:col-span-2 space-y-4 max-h-[400px] overflow-y-auto pr-1">
                      <h4 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider sticky top-0 bg-white pb-2 z-10">区域政策概览（{activeRegionData.country}）</h4>
                      <div className="p-3 rounded-xl bg-[#FBF8F5] ring-1 ring-[#C25B6E]/30 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeRegionData.color }} />
                          <span className="text-sm font-semibold text-[#1d1d1f]">{activeRegionData.country}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white ml-auto" style={{ backgroundColor: activeRegionData.color }}>{activeRegionData.status}</span>
                        </div>
                        <p className="text-xs text-[#86868b] leading-relaxed truncate">{activeRegionData.details}</p>
                        <div className="mt-2 pt-2 border-t border-[#EDE6DF]">
                          <div className="flex flex-wrap gap-1">
                            {activeRegionData.tags.map((tag, t) => (
                              <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-white text-[#86868b]">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* All countries mini list */}
                      <div className="space-y-1.5 pt-2">
                        {policyMapData.map((item) => (
                          <button
                            key={item.country}
                            onClick={() => setActiveRegion(item.country)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left ${activeRegion === item.country ? 'bg-[#C25B6E]/10' : 'hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}
                          >
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-xs font-medium text-[#1d1d1f] truncate">{item.country}</span>
                            <span className="text-[10px] text-[#86868b] ml-auto">{item.status}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center">
                        <ScrollText className="w-4 h-4 text-[#C25B6E]" strokeWidth={2} />
                      </div>
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">行业法规与标准解读</h3>
                    </div>
                    <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2.5 py-1 rounded-lg">2025-2026 &middot; 共 {policyTimeline.length} 条</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-[18px] top-3 bottom-3 w-[2px] bg-[#EDE6DF] rounded-full" />
                    <div className="space-y-6">
                      {policyTimeline.map((day, i) => (
                        <div key={i} className="relative flex gap-4">
                          <div className="relative z-10 flex-shrink-0">
                            <div className={`w-[38px] h-[38px] rounded-full flex items-center justify-center border-[2.5px] ${i === 0 ? 'bg-[#C25B6E] border-[#C25B6E]' : 'bg-white border-[#C25B6E]'}`}>
                              {i === 0 ? (
                                <span className="text-white text-[10px] font-bold">NEW</span>
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-[#C25B6E]" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 min-w-0 pt-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-[#C25B6E]">{day.date}</span>
                              <span className="w-1 h-1 rounded-full bg-[#EDE6DF]" />
                              <span className="text-[10px] text-[#86868b]">{day.events.length} 条法规</span>
                            </div>
                            <div className="space-y-2">
                              {day.events.map((evt, e) => (
                                <div key={e} className="p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200 border border-[#EDE6DF]/60">
                                  <p className="text-xs text-[#1d1d1f] leading-relaxed">{evt}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-[#C25B6E]" strokeWidth={2} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">区域标准洞察</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {policyMapData.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => setActiveRegion(item.country)}
                        className={`p-4 rounded-xl bg-[#FBF8F5] border cursor-pointer transition-all hover:shadow-sm ${activeRegion === item.country ? 'border-[#C25B6E] ring-1 ring-[#C25B6E]/20' : 'border-[#EDE6DF]'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-semibold text-[#1d1d1f]">{item.country}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white ml-auto" style={{ backgroundColor: item.color }}>{item.status}</span>
                        </div>
                        <p className="text-xs text-[#86868b] leading-relaxed truncate line-clamp-3">{item.details}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.slice(0, 2).map((tag, t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-white text-[#86868b]">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── VOC趋势 Section ── */}
            {activeSection === 'flavor' && (
              <GatedIndustrySection
                sourceIds={['ds-032', 'ds-033']}
                title="VOC趋势"
                description="功能热度、国家偏好、趋势百分比和VOC报告结论必须绑定真实评论样本、关键词词典、NLP模型版本、抽样窗口和人工复核记录；未补齐前不展示具体百分比、排名或预测值。"
                blockers={[
                  '缺少可复现的VOC样本窗口、source_id到评论快照的映射和样本量。',
                  '缺少关键词词典版本、模型版本、人工复核一致率和运行manifest。',
                  '国家偏好TOP、功能采用率和趋势百分比不能由旧静态数组继续展示。',
                ]}
                nextSteps={[
                  '接入VOC/NLP私有样本manifest或授权评论快照。',
                  '为每个趋势指标保存 query、窗口、样本量、模型版本和人工复核人。',
                  '通过数据治理表后再恢复图表与CSV导出。',
                ]}
              />
            )}
            {/* ── 行业新闻 Section ── */}
            {activeSection === 'news' && (
              <SourceHandoffSection
                sourceIds={['ds-034', 'ds-036']}
                title="行业新闻与技术资讯"
                description="新闻、技术和报告条目需要绑定原文URL、发布日期、摘要hash和复核状态；主聚合页不展示未复核的准确率、成本下降、市场增速或评论样本量。"
                targetHref="#/industry/news"
                targetLabel="打开新闻专页"
                cards={[
                  {
                    title: '新闻条目',
                    body: '已补证条目和待复核线索统一进入新闻专页，保留来源URL和复核状态。',
                    icon: <Newspaper className="h-4 w-4" />,
                    tone: '#C25B6E',
                  },
                  {
                    title: '技术资讯',
                    body: '技术页只保留采集计划，性能数值和趋势判断需逐条绑定规格页或新闻原文。',
                    icon: <Cpu className="h-4 w-4" />,
                    tone: '#5856d6',
                  },
                  {
                    title: '报告线索',
                    body: '报告名录可作为采集任务，未绑定样本、窗口和授权记录前不作为事实结论。',
                    icon: <ScrollText className="h-4 w-4" />,
                    tone: '#ff9500',
                  },
                ]}
              />
            )}

            {/* ── 供应链情报 Section ── */}
            {activeSection === 'supply' && (
              <GatedIndustrySection
                sourceIds={['ds-035']}
                title="供应链情报"
                description="供应商、仓网、库存、成本、原材料价格和风险预警需要ERP快照、供应商授权数据、采购字段口径和复核记录；未授权前不展示库存、成本指数、供应商占比、交期或节省比例。"
                blockers={[
                  '供应链节点和成本趋势仍是旧经营模拟数据，不能作为真实采购或物流决策依据。',
                  '缺少ERP供应商主数据、库存快照、采购订单窗口和字段字典。',
                  '缺少供应商授权、价格来源、物流账单或合同条款证据。',
                ]}
                nextSteps={[
                  '接入ERP供应商/库存/采购只读快照或授权导出。',
                  '沉淀供应商、仓网、原材料价格和物流成本四张治理表的证据路径。',
                  '通过私有数据展示审批后再恢复图表、地图详情和CSV导出。',
                ]}
              />
            )}

            {/* ── IP分析 Section ── */}
            {activeSection === 'ip' && (
              <GatedIndustrySection
                sourceIds={['ds-017']}
                title="IP分析"
                description="专利数量、商标数量、竞品专利格局、诉讼状态和FTO策略必须绑定WIPO、USPTO、CNIPA、EPO或诉讼数据库快照；未补齐前不展示数量、排名、风险等级或策略结论。"
                blockers={[
                  '专利与商标总量缺少可复现数据库快照和检索式。',
                  '竞品专利数、诉讼阶段和风险等级需要逐条证据路径。',
                  'FTO和防御策略属于法务判断，不能由旧静态面板直接给结论。',
                ]}
                nextSteps={[
                  '补WIPO/USPTO/CNIPA/EPO检索式、时间窗和导出hash。',
                  '将诉讼事项绑定法院案号、文书日期和复核人。',
                  '法务复核通过后再恢复数量看板和策略建议。',
                ]}
              />
            )}
            {/* ── 展会调研 Section ── */}
            {activeSection === 'exhibition' && (
              <SourceHandoffSection
                sourceIds={['ds-018']}
                title="展会调研"
                description="展会官网可支撑日期、地点和公开线索；展商规模、展位、费用、ROI、线索数和策略建议必须绑定官网原文或内部展会计划/复盘快照后才能展示。"
                targetHref="#/industry/exhibition"
                targetLabel="打开展会专页"
                cards={[
                  {
                    title: '公开日程',
                    body: '已复核的公开日期、地点和状态在展会专页维护，聚合页不重复列出数字口径。',
                    icon: <Globe className="h-4 w-4" />,
                    tone: '#5856d6',
                  },
                  {
                    title: '经营复盘',
                    body: '展位、费用、线索、订单和ROI等待CRM、预算表或展后复盘快照。',
                    icon: <FileSearch className="h-4 w-4" />,
                    tone: '#ff9500',
                  },
                  {
                    title: '策略建议',
                    body: '参展优先级和主题判断只能作为待复核建议，不与公开日程事实混写。',
                    icon: <TrendingUp className="h-4 w-4" />,
                    tone: '#34c759',
                  },
                ]}
              />
            )}

            {/* ── 区域宏观 Section ── */}
            {activeSection === 'macro' && (
              <GatedIndustrySection
                sourceIds={['ds-015']}
                title="区域宏观"
                description="区域规模、出生人口、渗透率、Momcozy排名和区域份额只能在外部报告口径、统计来源、渠道范围和内部numerator都绑定后展示；当前聚合页不再展示旧区域数字。"
                blockers={[
                  '区域市场规模、份额、出生人口和电商渗透率口径混杂，尚未拆成条目级来源。',
                  'Momcozy区域排名/份额缺少授权渠道数据或零售面板。',
                  '宏观市场规模不能直接替代吸奶器TAM、SAM、SOM或品牌份额分母。',
                ]}
                nextSteps={[
                  '按区域拆分公开统计源、行业报告源和内部经营numerator。',
                  '为每个国家指标登记source_id、年份、币种、分母和换算方式。',
                  '通过区域口径交叉验证后再恢复地图、国家卡片和CSV导出。',
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
