import { useState, useCallback } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line } from 'recharts';
import { Globe, Gavel, Beaker, Newspaper, Cpu, ScrollText, Shield, MapPin, Clock, FileText, TrendingUp, AlertTriangle, Package, Truck, Warehouse, DollarSign, Anchor, Award, Scale, Eye, FileSearch, Siren } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import type { SidebarItem } from '@/components/Sidebar';
import WorldMap from '@/components/WorldMap';
import type { MapMarker } from '@/components/WorldMap';

const policyMapData = [
  { country: '美国', status: '严格标准', color: '#ff3b30', details: 'FDA 21 CFR 884.5160将吸奶器列为Class II器械。CPSC CPC/eFiling要求需按官方证书与电子提交规则复核；未确认官网实时声明强制要求。ASTM F2088-25婴儿摇篮标准2026年7月生效。16 CFR 1242/1243哺乳枕/支撑垫标准已生效', tags: ['FDA 510(k)', 'CPSC CPSIA', 'ASTM F963-23', '16 CFR 1242'] },
  { country: '欧盟', status: 'MDR监管', color: '#C25B6E', details: 'MDR 2017/745将吸奶器归为Class IIa医疗器械，需CE marking+notified body评定。过渡期延至2027-2028年。IEC 60601-1电气安全+ISO 10993生物相容性+REACH/RoHS化学品限制', tags: ['MDR 2017/745', 'CE marking', 'IEC 60601-1', 'REACH RoHS'] },
  { country: '英国', status: '标准领先', color: '#ff9500', details: 'UKCA marking替代CE marking。BS EN 14350儿童饮水器具安全标准。GPSR通用产品安全法规适用。美国CPSC规则不直接适用于英国渠道，跨境销售需按目的地市场单独判断', tags: ['UKCA', 'BS EN 14350', 'GPSR', '产品安全法'] },
  { country: '加拿大', status: '高标准', color: '#C25B6E', details: 'CCPSA《加拿大消费品安全法》严格执行。2025-2026财年禁止婴儿学步车、自喂养装置等6类产品在线销售。Health Canada 2025-2027监管计划延续配方奶粉进口豁免', tags: ['CCPSA', 'Health Canada', 'SOR/2018-83', '禁止清单'] },
  { country: '中国', status: '加速完善', color: '#34c759', details: 'GB 46523-2025儿童用品通用安全+GB 46516婴幼儿护理用品安全，2026年11月实施。GB/T 46491-2025婴儿食品加工器具2026年5月生效。GB 6675.1-4-2025玩具安全系列全面更新', tags: ['GB 46523-2025', 'GB 46516', 'GB 6675', '3C认证'] },
  { country: '日本', status: '强制认证', color: '#af52de', details: '2025年12月25日新《消费品安全法》实施：36个月以下玩具强制PSC标志。ST2025标准同步生效，覆盖ISO 8124-1/2、EN 71-1/2、ASTM F963-23。婴幼儿护理用品受食品卫生法监管', tags: ['PSC标志', 'ST2025', 'CPSA', '食品卫生法'] },
  { country: '澳大利亚', status: '严格准入', color: '#5856d6', details: 'ACCC严格执法，2025年7月紧急召回婴儿头部支撑带和自喂养枕。ACMA对无线婴儿监视器进行认证管理。CPSIA合规要求与新西兰联合监管趋严', tags: ['ACCC召回', 'ACMA认证', 'CPSIA', '消费者法'] },
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
  { date: '2026-07-08', events: ['美国CPSC CPC/eFiling要求进入重点复核期：进口受监管消费品需关注证书数据电子提交字段、适用产品范围和实施节奏', '未核实到“所有儿童产品官网需嵌入实时生成合规声明页面”的官方强制要求；原Federal Register链接需从可信来源中移除'] },
  { date: '2026-04-20', events: ['美国CPSC发布直接最终规则，更新16 CFR Part 1223婴儿摇篮联邦安全标准，纳入ASTM F2088-25', '新标准新增前警告标签可见性测试（第7.17节），强化窒息风险警告语言， restraint警告从"ALWAYS use"升级为"ALWAYS USE RESTRAINTS"，2026年7月25日生效'] },
  { date: '2026-03-16', events: ['CPSC宣布2026年推出婴儿睡眠安全新标准，加强婴儿睡衣可燃性要求', '新标准限制睡衣材料类型，要求所有婴儿睡衣具备阻燃性，限制绳带长度防止缠绕风险'] },
  { date: '2025-12-25', events: ['日本新《消费品安全法》（CPSA）正式生效：36个月以下玩具强制PSC标志认证', 'ST2025标准同步实施，覆盖ISO 8124-1:2022、ISO 8124-2:2023、EN 71-1/2、ASTM F963-23', '婴儿床被列为儿童特定产品+特殊特定产品，需PSC标志+特定设计标签'] },
  { date: '2025-11-01', events: ['中国GB 46523-2025《儿童用品通用安全要求》正式发布，2026年11月1日实施', 'GB 46516-2025《婴幼儿护理用品通用安全要求》发布，覆盖吸奶器、奶瓶、安抚奶嘴等', 'GB/T 46491-2025《婴儿食品加工器具》标准发布，2026年5月1日生效'] },
  { date: '2025-10-05', events: ['中国发布GB 6675.1-4-2025玩具安全系列新标准，全面替代2014版', '新增GB/T 46509玩具VOC释放测定、GB/T 46510水性材料游离甲醛测定', 'GB 6675.10-2025新增嗅觉棋盘游戏、化妆品套装和味觉游戏安全要求'] },
  { date: '2025-09-08', events: ['Momcozy新型号电动吸奶器BP223获得FDA 510(k)许可（K251394号），申请人：深圳Root Innovation Technology', 'Fimilla(上海)母婴用品HL-3060/F5113电动吸奶器获FDA 510(k)许可（K252630号）'] },
  { date: '2025-07-05', events: ['澳大利亚ACCC紧急召回Ezone婴儿头部支撑带（Z1451/Z1758），警告车祸中脊柱损伤或死亡风险', 'ACCC同时召回婴儿自喂养枕（Z3007/Z3008），警告窒息和吸入性肺炎风险', 'ACCC记录多起相关事件，建议消费者立即停用并安全处置'] },
  { date: '2026-05-23', events: ['美国CPSC向获批实验室通报儿童产品检测资质审批注意事项', '16 CFR 1242哺乳枕标准和16 CFR 1243支撑垫标准实验室认可范围须严格匹配ASTM F963-23章节编号', '多家实验室因认可范围列表不完整被要求整改'] },
];

const flavorData = [
  { name: 'APP智能控制', value: 38, color: '#C25B6E' }, { name: '静音设计(<40dB)', value: 24, color: '#34c759' },
  { name: '便携穿戴', value: 20, color: '#ff9500' }, { name: '医院级吸力', value: 12, color: '#af52de' },
  { name: 'UV消毒杀菌', value: 4, color: '#5856d6' }, { name: '记忆/定时功能', value: 2, color: '#ff3b30' },
];

const flavorTrendData = [
  { quarter: '2022 Q1', APP智能控制: 22, 静音设计: 32, 便携穿戴: 18, 医院级吸力: 14, UV消毒杀菌: 5, 记忆定时: 6 },
  { quarter: '2023 Q1', APP智能控制: 27, 静音设计: 29, 便携穿戴: 16, 医院级吸力: 13, UV消毒杀菌: 5, 记忆定时: 7 },
  { quarter: '2024 Q1', APP智能控制: 33, 静音设计: 25, 便携穿戴: 15, 医院级吸力: 12, UV消毒杀菌: 4, 记忆定时: 8 },
  { quarter: '2025 Q1', APP智能控制: 38, 静音设计: 24, 便携穿戴: 20, 医院级吸力: 10, UV消毒杀菌: 4, 记忆定时: 3 },
];

const newsData = [
  { title: 'Momcozy Wearable Breast Pump获得FDA 510(k)许可（K253283号），涵盖7个型号', date: '2025-10-29', source: 'FDA', tag: '产品', image: true },
  { title: '美国CPSC 16 CFR Part 1242哺乳枕安全标准正式生效，要求更严格的安全设计', date: '2026-05-23', source: 'CPSC', tag: '法规', image: true },
  { title: 'eufy Wearable Breast Pump S1获得FDA 510(k)许可（K250207号），穿戴式吸奶器赛道竞争加剧', date: '2025-08-11', source: 'FDA', tag: '竞品', image: true },
  { title: '欧盟MDR过渡期延长至2027-2028年，吸奶器等Class IIa医疗器械需加速合规', date: '2024-12-18', source: 'EU Commission', tag: '法规', image: true },
  { title: '中国发布GB 6675-2025玩具安全系列新标准，2026年11月计划生效，新增多项化学物质限制', date: '2025-10-05', source: 'SAC China', tag: '法规', image: true },
  { title: '全球可穿戴吸奶器市场2025年预计增长18.2%，APP智能控制成为核心差异化功能', date: '2026-05-23', source: 'MarketWatch', tag: '市场', image: true },
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
                    <p className="text-xs text-[#1d1d1f]">美国CPSC CPC/eFiling规则需复核证书字段、适用SKU和实施日期；“官网实时合规声明”尚未找到官方依据，不应作为P0已生效规则执行。日本PSC认证8月到期需续期。建议优先级：美国复核{'>'}日本{'>'}欧盟MDR。</p>
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
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">VOC趋势分析</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div>
                      <h4 className="text-xs text-[#86868b] mb-2">功能需求占比结构</h4>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={flavorData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                              {flavorData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="lg:col-span-2">
                      <h4 className="text-xs text-[#86868b] mb-2">功能需求占比趋势</h4>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={flavorTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                            <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                            <Area type="monotone" dataKey="APP智能控制" stackId="1" stroke="#C25B6E" fill="#C25B6E" />
                            <Area type="monotone" dataKey="静音设计" stackId="1" stroke="#34c759" fill="#34c759" />
                            <Area type="monotone" dataKey="便携穿戴" stackId="1" stroke="#ff9500" fill="#ff9500" />
                            <Area type="monotone" dataKey="医院级吸力" stackId="1" stroke="#af52de" fill="#af52de" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <h4 className="text-xs text-[#86868b] mb-3">各国功能偏好 TOP5</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {['美国', '英国', '俄罗斯', '德国', '意大利', '法国', '加拿大'].map((country) => (
                      <div key={country} className="p-3 rounded-xl bg-[#FBF8F5]">
                        <span className="text-xs font-semibold text-[#1d1d1f]">{country}</span>
                        <div className="space-y-1 mt-2">
                          {['智能功能', '静音设计', '便携穿戴', '医院级吸力', 'APP控制'].map((flavor, i) => (
                            <div key={flavor} className="flex items-center justify-between">
                              <span className="text-[10px] text-[#86868b]">{flavor}</span>
                              <div className="flex items-center gap-1">
                                <div className="h-1 rounded-full bg-[#EDE6DF] w-10 overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-full" style={{ width: `${60 - i * 8}%` }} /></div>
                                <span className="text-[10px] text-[#86868b]">{60 - i * 8}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VOC Trend Report */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-[#af52de]/10 flex items-center justify-center">
                      <Beaker className="w-4 h-4 text-[#af52de]" strokeWidth={2} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">VOC趋势报告</h3>
                    <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg ml-auto">2024 Q1 - 2025 Q1</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#FBF8F5]">
                      <h4 className="text-xs font-semibold text-[#1d1d1f] mb-2">趋势洞察</h4>
                      <p className="text-xs text-[#86868b] leading-relaxed truncate">APP智能控制功能需求持续上升，从2022 Q1的22%增长至2025 Q1的38%，成为母婴电器核心差异化方向。静音设计需求保持稳定在24-32%区间。</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FBF8F5]">
                      <h4 className="text-xs font-semibold text-[#1d1d1f] mb-2">市场机会</h4>
                      <p className="text-xs text-[#86868b] leading-relaxed truncate">便携穿戴类需求增长显著（18%→20%），建议加大穿戴式吸奶器研发投入。UV消毒杀菌功能需求较低（4-5%），可作为增值功能而非主打卖点。</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 行业新闻 Section ── */}
            {activeSection === 'news' && (
              <div className="space-y-6">
                {/* R39: 新闻分类说明 */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                  <span className="text-[10px] text-[#86868b]">新闻分类：</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#34c759]/10 text-[#34c759] text-[9px] font-medium">机会</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#ff3b30]/10 text-[#ff3b30] text-[9px] font-medium">威胁</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#ff9500]/10 text-[#ff9500] text-[9px] font-medium">中性</span>
                  <span className="text-[9px] text-[#B5AFA8] ml-auto">6条最新行业动态</span>
                </div>
                <div className="relative h-48 rounded-2xl overflow-hidden">
                  <img src="/images/hero-data.jpg" alt="Industry News" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1d1d1f]/70 to-transparent flex items-center">
                    <div className="px-8">
                      <h2 className="text-2xl font-bold text-white mb-2">行业资讯</h2>
                      <div className="flex items-center gap-2">
                        <input type="text" placeholder="请输入关键词进行搜索" className="px-4 py-2 rounded-lg bg-white/90 text-sm text-[#1d1d1f] outline-none w-64" />
                        <button className="px-4 py-2 rounded-lg bg-[#C25B6E] text-white text-sm font-medium">点击搜索</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {newsData.map((news, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF] hover:shadow-md transition-natural cursor-pointer flex gap-4">
                      <div className="w-24 h-16 rounded-xl bg-[#FBF8F5] flex items-center justify-center flex-shrink-0">
                        <Newspaper className="w-8 h-8 text-[#EDE6DF]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded bg-[#C25B6E]/10 text-[10px] text-[#C25B6E] font-medium">{news.tag}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-[#1d1d1f] hover:text-[#C25B6E] transition-colors duration-200">{news.title}</h4>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-[#86868b]">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{news.date}</span>
                          <span>{news.source}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tech News */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-[#5856d6]/10 flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-[#5856d6]" strokeWidth={2} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">母婴科技资讯</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: 'AI驱动的婴儿监视器：哭声识别准确率突破95%', date: '2026-05-23', tag: 'AI' },
                      { title: '可穿戴式智能吸奶器：蓝牙连接+APP数据分析成标配', date: '2026-05-23', tag: '智能硬件' },
                      { title: 'UV-C LED消毒技术成本下降40%，加速普及到中端产品线', date: '2026-05-23', tag: '材料科技' },
                      { title: '母婴电商平台AR试穿功能上线，文胸尺码匹配率提升30%', date: '2026-05-23', tag: '电商科技' },
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200 cursor-pointer">
                        <span className="px-1.5 py-0.5 rounded text-[10px] text-[#5856d6] bg-[#5856d6]/10 font-medium">{item.tag}</span>
                        <h4 className="text-sm font-semibold text-[#1d1d1f] mt-2 hover:text-[#C25B6E] transition-colors duration-200">{item.title}</h4>
                        <span className="text-[10px] text-[#B5AFA8] mt-1.5 flex items-center gap-1"><Clock className="w-3 h-3" />{item.date}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Industry Reports */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 flex items-center justify-center">
                      <ScrollText className="w-4 h-4 text-[#ff9500]" strokeWidth={2} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">母婴行业报告</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: '2025全球母婴可穿戴设备市场研究报告', desc: '涵盖吸奶器、婴儿监视器、智能背带等品类，市场规模、增长率、竞争格局分析', date: '2025-05' },
                      { title: '中国母婴用品出口合规指南（2025版）', desc: 'FDA/MDR/UKCA/CN认证要求汇总，重点关注吸奶器和喂养电器合规路径', date: '2025-04' },
                      { title: '母婴赛道VOC趋势与消费者偏好年度报告', desc: '基于500万+消费者评论的NLP分析，功能需求、设计偏好、价格敏感度洞察', date: '2025-03' },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200 cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-[#ff9500]/10 flex items-center justify-center flex-shrink-0">
                          <ScrollText className="w-5 h-5 text-[#ff9500]" strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-[#1d1d1f]">{r.title}</h4>
                          <p className="text-xs text-[#86868b] mt-0.5">{r.desc}</p>
                        </div>
                        <span className="text-[10px] text-[#86868b] flex-shrink-0">{r.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 供应链情报 Section ── */}
            {activeSection === 'supply' && (
              <SupplyChainSection />
            )}

            {/* ── IP分析 Section ── */}
            {activeSection === 'ip' && (
              <div className="space-y-6">
                {/* Header Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: '授权专利', value: '520+', sub: '全球范围', color: '#C25B6E', icon: <Award className="w-4 h-4" /> },
                    { label: '注册商标', value: '330+', sub: '60+国家', color: '#af52de', icon: <Shield className="w-4 h-4" /> },
                    { label: 'FDA 510(k)', value: '7+', sub: '多款产品', color: '#34c759', icon: <FileSearch className="w-4 h-4" /> },
                    { label: '专利诉讼', value: '1', sub: '进行中', color: '#ff3b30', icon: <Scale className="w-4 h-4" /> },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                        <span className="text-xs text-[#86868b]">{s.label}</span>
                      </div>
                      <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
                      <p className="text-[10px] text-[#86868b]">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Patent Portfolio */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-[#af52de]/10 flex items-center justify-center"><Award className="w-4 h-4 text-[#af52de]" strokeWidth={2} /></div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">Momcozy 专利组合</h3>
                    <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg ml-auto">520+ 授权专利 &middot; 330+ 商标</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* FDA 510(k) Records */}
                    <div className="p-4 rounded-xl bg-[#FBF8F5]">
                      <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2"><FileSearch className="w-3.5 h-3.5 text-[#34c759]" />FDA 510(k) 许可记录</h4>
                      <div className="space-y-2.5">
                        {[
                          { model: 'BP223', kNumber: 'K251394', date: '2025-09-08', status: '已许可' },
                          { model: 'BP311', kNumber: 'K241680', date: '2024-12-20', status: '已许可' },
                          { model: 'BP137/BP141', kNumber: 'K233880', date: '2024-03-06', status: '已许可' },
                          { model: 'M5/M9系列', kNumber: 'K253283', date: '2025-10-29', status: '已许可' },
                          { model: 'S9 Pro', kNumber: '—', date: '2022', status: '红点设计奖' },
                        ].map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white">
                            <div>
                              <span className="text-xs font-medium text-[#1d1d1f] truncate">{f.model}</span>
                              <span className="text-[10px] text-[#86868b] ml-2">{f.kNumber}</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#34c759]/10 text-[#34c759] font-medium">{f.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Patent Categories */}
                    <div className="p-4 rounded-xl bg-[#FBF8F5]">
                      <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-[#af52de]" />专利分类分布</h4>
                      <div className="space-y-4">
                        {[
                          { cat: '穿戴式结构专利', pct: 35, color: '#C25B6E', desc: '罩杯内置设计、隔膜气泵结构、防回流系统' },
                          { cat: 'APP智能控制', pct: 22, color: '#af52de', desc: '蓝牙连接、吸力模式算法、数据记录与分析' },
                          { cat: '外观/工业设计', pct: 18, color: '#ff9500', desc: 'S9 Pro获2022红点设计奖，外观+结构双专利' },
                          { cat: '材料与工艺', pct: 15, color: '#34c759', desc: '食品级硅胶应用、UV杀菌技术、BPA-free材料' },
                          { cat: '哺乳辅助设计', pct: 10, color: '#5856d6', desc: 'DoubleFit法兰、静音技术、电池管理' },
                        ].map((p, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-[#1d1d1f] truncate">{p.cat}</span>
                              <span className="text-xs font-semibold" style={{ color: p.color }}>{p.pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#EDE6DF] overflow-hidden mb-0.5"><div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} /></div>
                            <span className="text-[10px] text-[#86868b]">{p.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Competitor Patent Landscape */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-[#5856d6]/10 flex items-center justify-center"><Eye className="w-4 h-4 text-[#5856d6]" strokeWidth={2} /></div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">竞品专利格局</h3>
                    <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg ml-auto">四大品牌对比</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#EDE6DF] table-row-hover">
                          <th className="py-2 px-3 text-[10px] text-[#86868b] font-medium">品牌</th>
                          <th className="py-2 px-3 text-[10px] text-[#86868b] font-medium">专利数</th>
                          <th className="py-2 px-3 text-[10px] text-[#86868b] font-medium">核心技术</th>
                          <th className="py-2 px-3 text-[10px] text-[#86868b] font-medium">产品定位</th>
                          <th className="py-2 px-3 text-[10px] text-[#86868b] font-medium">专利风险</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { brand: 'Momcozy', patents: '520+', core: '穿戴式结构+APP+静音技术', position: '中端性价比', risk: '与Elvie诉讼中', color: '#C25B6E' },
                          { brand: 'Medela', patents: '128', core: '双韵律吸乳技术（2-Phase Expression）', position: '高端医用级', risk: '开放系统专利到期', color: '#ff9500' },
                          { brand: 'Elvie/Willow', patents: '34+', core: '全密封集乳系统+压电泵', position: '高端穿戴式', risk: '主动起诉Momcozy', color: '#af52de' },
                          { brand: 'Spectra Baby', patents: '52', core: '医院级吸力+静音电机', position: '中端韩产', risk: '差异化竞争', color: '#34c759' },
                        ].map((c, i) => (
                          <tr key={i} className="border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors duration-200 duration-200">
                            <td className="py-2.5 px-3"><span className="text-xs font-semibold" style={{ color: c.color }}>{c.brand}</span></td>
                            <td className="py-2.5 px-3"><span className="text-xs text-[#1d1d1f] font-medium">{c.patents}</span></td>
                            <td className="py-2.5 px-3"><span className="text-xs text-[#86868b]">{c.core}</span></td>
                            <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{c.position}</span></td>
                            <td className="py-2.5 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.risk === '主动起诉Momcozy' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : c.risk === '与Elvie诉讼中' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : 'bg-[#FBF8F5] text-[#86868b]'}`}>{c.risk}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Patent Litigation */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center"><Scale className="w-4 h-4 text-[#ff3b30]" strokeWidth={2} /></div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">专利诉讼追踪</h3>
                    <span className="text-[10px] text-[#ff3b30] bg-[#ff3b30]/10 px-2 py-1 rounded-lg ml-auto font-medium">进行中</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Case Overview */}
                    <div className="lg:col-span-2 p-4 rounded-xl bg-[#FBF8F5]">
                      <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2"><Siren className="w-3.5 h-3.5 text-[#ff3b30]" />Elvie vs Momcozy &middot; Case 2:23-cv-00631</h4>
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-[#C25B6E] flex items-center justify-center text-white text-[8px] font-bold">1</div>
                            <div className="w-0.5 h-8 bg-[#EDE6DF]" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#1d1d1f] truncate">2023年4月 — Momcozy主动起诉</p>
                            <p className="text-[10px] text-[#86868b]">Momcozy向美国法院请求宣告Elvie US Patent No. 11,357,893不侵权（S12 Pro产品）</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-[#ff3b30] flex items-center justify-center text-white text-[8px] font-bold">2</div>
                            <div className="w-0.5 h-8 bg-[#EDE6DF]" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#1d1d1f] truncate">2023年8月 — Elvie反诉</p>
                            <p className="text-[10px] text-[#86868b]">Elvie反诉Momcozy S9/S9 Pro/S12/S12 Pro/M1/M5/V1侵权，涉及&apos;893、&apos;380、&apos;454三项专利</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-[#ff9500] flex items-center justify-center text-white text-[8px] font-bold">3</div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#1d1d1f] truncate">2025-2026年5月 — Momcozy修订答辩</p>
                            <p className="text-[10px] text-[#86868b]">Momcozy提交修订答辩，主张涉案专利因现有技术而无效，诉讼持续进行中</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Involved Patents */}
                    <div className="p-4 rounded-xl bg-[#FBF8F5]">
                      <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3">涉案专利</h4>
                      <div className="space-y-2.5">
                        {[
                          { number: "US 11,357,893", title: 'Wearable Breast Pump System', priority: '2017-06-15', holder: 'Elvie' },
                          { number: "US 11,413,380", title: 'Wearable Breast Pump with Piezo Pump', priority: '2017-06-15', holder: 'Elvie' },
                          { number: "US 11,806,454", title: 'Wearable Breast Pump System', priority: '2020-03-26', holder: 'Elvie' },
                        ].map((p, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-white">
                            <p className="text-xs font-semibold text-[#1d1d1f]">{p.number}</p>
                            <p className="text-[10px] text-[#86868b]">{p.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-[#86868b]">优先权: {p.priority}</span>
                              <span className="px-1 py-0.5 rounded text-[9px] bg-[#af52de]/10 text-[#af52de]">{p.holder}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trademark Monitoring */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 flex items-center justify-center"><Shield className="w-4 h-4 text-[#ff9500]" strokeWidth={2} /></div>
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">商标监控预警</h3>
                    </div>
                    <div className="space-y-4">
                      {[
                        { name: 'Mumcozy', region: '美国', class: '第10类医疗器械', level: '高', status: '发现申请' },
                        { name: 'Momcozii', region: '欧盟', class: '第10类母婴用品', level: '高', status: '发现申请' },
                        { name: 'CozyMom', region: '欧盟', class: '第10类医疗器械', level: '中', status: '波兰公司申请' },
                        { name: 'Momcozy', region: '多类扩展', class: '第5/21/25类', level: '中', status: '防御注册建议' },
                      ].map((t, i) => (
                        <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-[#FBF8F5]">
                          <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: t.level === '高' ? '#ff3b30' : '#ff9500' }} />
                          <div className="flex-1 min-w-0 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#1d1d1f]">{t.name}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: t.level === '高' ? '#ff3b30' : '#ff9500' }}>{t.level}</span>
                            </div>
                            <p className="text-[10px] text-[#86868b]">{t.region} &middot; {t.class} &middot; {t.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-8 h-8 rounded-xl bg-[#5856d6]/10 flex items-center justify-center"><ScrollText className="w-4 h-4 text-[#5856d6]" strokeWidth={2} /></div>
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">行业判例参考</h3>
                    </div>
                    <div className="space-y-4">
                      {[
                        { title: '"咬咬乐"通用名称案', court: '成都中院/四川高院', result: '驳回原告诉请', desc: '法院认定"咬咬乐"已成为婴儿喂食器通用名称，属于公有领域资源' },
                        { title: '母婴傍名牌侵权案', court: '常熟法院', result: '股东赔百万余元', desc: '被告公司简易注销，一人股东被判对公司债务承担连带责任' },
                        { title: '穿戴式吸奶器专利战', court: '美国W.D. Wash.', result: '进行中', desc: 'Momcozy vs Elvie，涉及3项核心专利，影响全球穿戴式市场格局' },
                      ].map((c, i) => (
                        <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-[#1d1d1f]">{c.title}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.result === '驳回原告诉请' ? 'bg-[#34c759]/10 text-[#34c759]' : c.result === '进行中' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{c.result}</span>
                              </div>
                              <p className="text-[10px] text-[#86868b]">{c.court}</p>
                              <p className="text-[10px] text-[#86868b] mt-0.5">{c.desc}</p>
                            </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* IP Defense Strategy */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 flex items-center justify-center"><Shield className="w-4 h-4 text-[#34c759]" strokeWidth={2} /></div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">IP防御策略建议</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { title: '专利侵权规避', items: ['针对Elvie &apos;893专利主张现有技术抗辩', '优化产品设计避开&apos;380压电泵技术方案', '在东南亚/中国市场申请防御性专利'] },
                      { title: '商标全面保护', items: ['在主要市场注册Momcozy防御商标组合', '对Mumcozy/Momcozii等近似商标提交异议', '在多类别（5/21/25类）扩展注册范围'] },
                      { title: '供应链IP管控', items: ['OEM供应商签署严格IP不侵权保证', '关键零部件采购前进行FTO自由实施分析', '建立产品全生命周期IP风险评估机制'] },
                    ].map((s, i) => (
                      <div key={i} className="p-4 rounded-xl bg-[#FBF8F5]">
                        <h4 className="text-xs font-semibold text-[#1d1d1f] mb-2">{s.title}</h4>
                        <div className="space-y-1.5">
                          {s.items.map((item, j) => (
                            <div key={j} className="flex items-start gap-1.5">
                              <div className="w-1 h-1 rounded-full bg-[#C25B6E] mt-1.5 flex-shrink-0" />
                              <p className="text-[10px] text-[#86868b] leading-relaxed">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 展会调研 Section ── */}
            {activeSection === 'exhibition' && (
              <div className="space-y-6">
                {/* Header Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: '覆盖展会', value: '12场', sub: '2025-2026', color: '#5856d6', icon: <Globe className="w-4 h-4" /> },
                    { label: '涉及区域', value: '6大洲', sub: '全球布局', color: '#C25B6E', icon: <MapPin className="w-4 h-4" /> },
                    { label: '核心展会', value: '4场', sub: 'A级推荐', color: '#ff9500', icon: <Award className="w-4 h-4" /> },
                    { label: '主题趋势', value: 'AI+可持续', sub: '2026关键词', color: '#34c759', icon: <Cpu className="w-4 h-4" /> },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                        <span className="text-xs text-[#86868b]">{s.label}</span>
                      </div>
                      <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
                      <p className="text-[10px] text-[#86868b]">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Featured: Kind + Jugend 2026 */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center">
                        <Award className="w-5 h-5 text-[#C25B6E]" strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#1d1d1f]">Kind + Jugend 2026 Cologne</h3>
                        <p className="text-[10px] text-[#86868b]">全球领先婴童用品展 &middot; 2026年度主题：Growing with AI</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-[#C25B6E] text-white">A级推荐</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: '展商数量', value: '800+', sub: '来自43个国家' },
                          { label: '国际展商占比', value: '91%', sub: '全球参与度最高' },
                          { label: '专业访客', value: '15,000', sub: '来自108个国家' },
                        ].map((d, i) => (
                          <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] text-center">
                            <p className="text-lg font-semibold text-[#1d1d1f]">{d.value}</p>
                            <p className="text-[10px] text-[#86868b]">{d.label}</p>
                            <p className="text-[9px] text-[#86868b]/60">{d.sub}</p>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 rounded-xl bg-[#FBF8F5]">
                        <h4 className="text-xs font-semibold text-[#1d1d1f] mb-2">展会亮点</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'Innovation Award 创新奖评选',
                            'Trend Forum 趋势论坛（AI+可持续）',
                            'Parc & Start-up Zone 初创展区',
                            'Kids Design Award 设计奖',
                            'New Product Trail 新品首发',
                            'Midwives Choice 助产士之选',
                          ].map((h, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <div className="w-1 h-1 rounded-full bg-[#C25B6E] flex-shrink-0" />
                              <span className="text-[10px] text-[#86868b]">{h}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FBF8F5]">
                        <h4 className="text-xs font-semibold text-[#1d1d1f] mb-2">已知参展品牌</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {['Artsana/Chicco', 'Brevi', 'Motorola', 'Bentley Kids', 'Duracell', 'Novatex', 'Momcozy', 'eufy', 'Medela', 'Spectra'].map((b, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md text-[10px] bg-white text-[#86868b]">{b}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-3 rounded-xl bg-[#FBF8F5]">
                        <h4 className="text-xs font-semibold text-[#1d1d1f] mb-2">展会信息</h4>
                        <div className="space-y-2">
                          {[{ k: '日期', v: '2026.09.15-17' }, { k: '地点', v: '德国科隆展览中心' }, { k: '展位号', v: 'Hall 10.1 C-020/D-021' }, { k: '主题', v: 'Growing with AI' }, { k: '费用', v: '€280/㎡起' }].map((info, i) => (
                            <div key={i} className="flex justify-between"><span className="text-[10px] text-[#86868b]">{info.k}</span><span className="text-[10px] text-[#1d1d1f] font-medium">{info.v}</span></div>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FBF8F5]">
                        <h4 className="text-xs font-semibold text-[#1d1d1f] mb-2">产品展区</h4>
                        <div className="flex flex-wrap gap-1">
                          {['Furniture & Interiors', 'Fashion & Textiles', 'Toys & Play', 'Nutrition & Care', 'Health & Hygiene', 'Safety & Monitoring', 'Moving & Traveling'].map((z, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-white text-[#86868b]">{z}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Global Exhibition Calendar */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-[#5856d6]/10 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-[#5856d6]" strokeWidth={2} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">2025-2026 全球母婴展会日历</h3>
                    <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg ml-auto">共12场</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { name: 'Hong Kong Baby Products Fair 2026', location: '香港会议展览中心', date: '2026.01.12-15', level: 'A', status: '报名中', color: '#C25B6E', scale: '国际品牌汇聚', category: '综合', highlight: 'Brand Name Gallery 精品展示' },
                      { name: 'Spielwarenmesse 2026 (75周年)', location: '德国纽伦堡', date: '2026.01.27-31', level: 'A', status: '报名中', color: '#C25B6E', scale: '全球最大玩具展', category: '玩具+婴童', highlight: '75周年特别活动+RedNight' },
                      { name: 'ABC Kids Expo 2026', location: '美国拉斯维加斯', date: '2026.05.13-15', level: 'A', status: '报名中', color: '#C25B6E', scale: '600展商·4500访客', category: '综合', highlight: '北美最大婴童展，新品发布首选' },
                      { name: 'Pueri Expo 2026', location: '巴西圣保罗', date: '2026.04.26-28', level: 'B', status: '筹备中', color: '#ff9500', scale: '165展商·12000访客', category: '综合', highlight: '拉美最大，与FIT 0/16同期' },
                      { name: 'CBME China 2026', location: '中国上海', date: '2026.07.15-17', level: 'A', status: '筹备中', color: '#C25B6E', scale: '1200+展商', category: '综合', highlight: '亚洲最大母婴展，国潮品牌集中' },
                      { name: 'Baby & Kids Expo Tokyo', location: '日本东京', date: '2026.06.24-26', level: 'B', status: '筹备中', color: '#ff9500', scale: 'LIFESTYLE Week同期', category: '综合', highlight: '日本最大的B2B婴童产品展' },
                      { name: 'Kind + Jugend 2026', location: '德国科隆', date: '2026.09.15-17', level: 'A', status: '筹备中', color: '#C25B6E', scale: '800+展商·15000访客', category: '综合', highlight: '全球领先，主题Growing with AI' },
                      { name: 'IBTE Indonesia 2026', location: '印尼雅加达', date: '2026.08.19-22', level: 'B', status: '筹备中', color: '#ff9500', scale: '东南亚新兴市场', category: '综合', highlight: '东盟地区婴童用品采购平台' },
                      { name: 'Mir Detstva 2026', location: '俄罗斯莫斯科', date: '2026.09.16-18', level: 'B', status: '筹备中', color: '#ff9500', scale: '东欧最大', category: '综合', highlight: '覆盖独联体国家市场' },
                      { name: 'CBME Turkey 2026', location: '土耳其伊斯坦布尔', date: '2026.12.02-05', level: 'B', status: '筹备中', color: '#ff9500', scale: '欧亚桥梁', category: '综合', highlight: '进入中东、北非、独联体市场' },
                      { name: 'Playworld Middle East 2026', location: '阿联酋迪拜', date: '2026.10-11', level: 'B', status: '待定', color: '#86868b', scale: '中东地区', category: '玩具+婴童', highlight: '中东玩具及婴童用品专业展' },
                      { name: 'Kind + Jugend ASEAN', location: '泰国曼谷', date: '2027待定', level: 'C', status: '延期', color: '#86868b', scale: '100+品牌', category: '综合', highlight: '2026年暂停举办，后续另行通知' },
                    ].map((e, i) => (
                      <div key={i} className="p-4 rounded-xl bg-[#FBF8F5] flex items-start gap-4 hover:shadow-sm transition-natural">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${e.color}15` }}>
                          <Globe className="w-5 h-5" style={{ color: e.color }} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-sm font-semibold text-[#1d1d1f]">{e.name}</h4>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: e.color }}>{e.level}级</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white text-[#86868b]">{e.status}</span>
                          </div>
                          <div className="flex items-center gap-4 mb-1 flex-wrap">
                            <span className="text-xs text-[#86868b]">{e.location}</span>
                            <span className="text-xs text-[#C25B6E] font-medium">{e.date}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-white text-[#86868b]">{e.category}</span>
                          </div>
                          <p className="text-[10px] text-[#86868b]">{e.scale}</p>
                          <p className="text-xs text-[#1d1d1f] mt-1">{e.highlight}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exhibition Strategy */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-[#34c759]" strokeWidth={2} /></div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">展会参展策略建议</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { title: '必参展（A级）', color: '#C25B6E', desc: '核心市场品牌曝光+渠道拓展', items: ['Kind + Jugend 科隆：欧洲主阵地，MDR合规展示', 'ABC Kids Expo 拉斯维加斯：北美新品首发', 'CBME China 上海：亚洲市场深度渗透', 'Spielwarenmesse 纽伦堡：玩具渠道拓展'] },
                      { title: '选择性参展（B级）', color: '#ff9500', desc: '新兴市场试探+区域经销商对接', items: ['Pueri Expo 圣保罗：拉美市场试水', 'CBME Turkey 伊斯坦布尔：中东/欧亚桥梁', 'Baby Kids Expo Tokyo：日本精细化运营', 'IBTE Indonesia：东盟新兴市场布局'] },
                      { title: '2026行业趋势洞察', color: '#5856d6', desc: '基于K+J 2026主题报告', items: ['AI驱动产品：智能吸奶器、AI婴儿监视器成热点', '可持续材料：生物可降解、食品残余再利用', '多功能设计：行李箱变婴儿车、背包变游戏垫', '超个性化：神经多样性意识+沉浸式体验'] },
                    ].map((s, i) => (
                      <div key={i} className="p-4 rounded-xl bg-[#FBF8F5]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <h4 className="text-xs font-semibold" style={{ color: s.color }}>{s.title}</h4>
                        </div>
                        <p className="text-[10px] text-[#86868b] mb-2">{s.desc}</p>
                        <div className="space-y-1.5">
                          {s.items.map((item, j) => (
                            <div key={j} className="flex items-start gap-1.5">
                              <div className="w-1 h-1 rounded-full bg-[#C25B6E] mt-1.5 flex-shrink-0" />
                              <p className="text-[10px] text-[#86868b] leading-relaxed">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 区域宏观 Section ── */}
            {activeSection === 'macro' && (
              <MacroSection />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Supply Chain Section Component ──
const supplyChainMarkers: MapMarker[] = [
  { name: '总部·丹佛', coordinates: [-104.9, 39.7], color: '#C25B6E', status: '全球总部', id: 'denver' },
  { name: '总部·深圳', coordinates: [114.1, 22.6], color: '#C25B6E', status: '研发中心', id: 'shenzhen' },
  { name: 'FBA美东仓', coordinates: [-78.0, 40.0], color: '#34c759', status: '亚马逊FBA', id: 'fba_east' },
  { name: 'FBA美西仓', coordinates: [-122.0, 37.5], color: '#34c759', status: '亚马逊FBA', id: 'fba_west' },
  { name: 'FBA欧洲仓', coordinates: [9.0, 50.1], color: '#34c759', status: '亚马逊FBA', id: 'fba_eu' },
  { name: 'FBA英国仓', coordinates: [-1.0, 52.0], color: '#34c759', status: '亚马逊FBA', id: 'fba_uk' },
  { name: 'FBA日本仓', coordinates: [139.7, 35.7], color: '#34c759', status: '亚马逊FBA', id: 'fba_jp' },
  { name: '第三方仓·美东', coordinates: [-74.5, 40.0], color: '#af52de', status: '优时派20000㎡', id: '3pl_east' },
  { name: '第三方仓·美西', coordinates: [-118.2, 34.0], color: '#af52de', status: '优时派', id: '3pl_west' },
  { name: '中转仓·越南', coordinates: [106.6, 10.8], color: '#ff9500', status: '关税转口中转', id: 'transit_vn' },
  { name: '中转仓·墨西哥', coordinates: [-99.1, 19.4], color: '#ff9500', status: 'USMCA通道', id: 'transit_mx' },
];

const materialPriceData = [
  { month: '2024-09', LSR硅胶: 100, PP塑料: 100, 锂电池18650: 100, 无氧铜: 100, Tritan: 100 },
  { month: '2024-10', LSR硅胶: 101, PP塑料: 99, 锂电池18650: 102, 无氧铜: 101, Tritan: 99 },
  { month: '2024-11', LSR硅胶: 102, PP塑料: 98, 锂电池18650: 104, 无氧铜: 102, Tritan: 99 },
  { month: '2024-12', LSR硅胶: 101, PP塑料: 98, 锂电池18650: 103, 无氧铜: 101, Tritan: 99 },
  { month: '2025-01', LSR硅胶: 102, PP塑料: 99, 锂电池18650: 105, 无氧铜: 102, Tritan: 100 },
  { month: '2025-02', LSR硅胶: 103, PP塑料: 98, 锂电池18650: 106, 无氧铜: 103, Tritan: 100 },
  { month: '2025-03', LSR硅胶: 103, PP塑料: 98, 锂电池18650: 106, 无氧铜: 102, Tritan: 100 },
  { month: '2025-04', LSR硅胶: 104, PP塑料: 98, 锂电池18650: 107, 无氧铜: 102, Tritan: 100 },
  { month: '2025-05', LSR硅胶: 103, PP塑料: 98, 锂电池18650: 106, 无氧铜: 102, Tritan: 100 },
];

const warehouseTypes = [
  { type: '亚马逊FBA', color: '#34c759', count: '5大区域', desc: '美东/美西/欧洲/英国/日本' },
  { type: '第三方3PL', color: '#af52de', count: '2个仓点', desc: '优时派美东美西双仓20000㎡' },
  { type: '总部/研发', color: '#C25B6E', count: '2个中心', desc: '美国丹佛+中国深圳坂田' },
  { type: '中转仓', color: '#ff9500', count: '2个国家', desc: '越南/墨西哥关税转口' },
];

function SupplyChainSection() {
  const [activeWarehouse, setActiveWarehouse] = useState('denver');
  const activeWh = supplyChainMarkers.find(m => m.id === activeWarehouse) || supplyChainMarkers[0];

  return (
    <div className="space-y-6">
      {/* Global Warehouse Network Map */}
      <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
              <Warehouse className="w-4 h-4 text-[#34c759]" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1d1d1f]">Momcozy 全球仓网布局</h3>
              <p className="text-[10px] text-[#86868b]">双总部（丹佛+深圳）+ FBA五区 + 3PL双仓 + 关税中转</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {warehouseTypes.map(w => (
              <div key={w.type} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }} />
                <span className="text-[10px] text-[#86868b]">{w.type}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 h-[400px] bg-[#F5F0EB] rounded-2xl overflow-hidden relative">
            <WorldMap markers={supplyChainMarkers} activeId={activeWarehouse} onMarkerClick={setActiveWarehouse} />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {/* Active warehouse detail */}
            <div className="p-4 rounded-xl bg-[#FBF8F5] ring-1 ring-[#34c759]/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeWh.color }} />
                <span className="text-sm font-semibold text-[#1d1d1f]">{activeWh.name}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white ml-auto" style={{ backgroundColor: activeWh.color }}>{activeWh.status}</span>
              </div>
              <p className="text-xs text-[#86868b]">
                {activeWh.id === 'denver' && 'Momcozy全球总部，负责品牌战略、北美市场营销和合规管理。地址：1624 Market St, Denver, CO'}
                {activeWh.id === 'shenzhen' && '研发中心与供应链管理中心，负责产品研发、质量控制和供应商管理。地址：深圳坂田神舟电脑大厦'}
                {activeWh.id === 'fba_east' && '亚马逊FBA美东仓库（PA/OH），覆盖美国东北部和中部地区，Prime 2日达覆盖约1.2亿人口'}
                {activeWh.id === 'fba_west' && '亚马逊FBA美西仓库（CA/WA），覆盖美国西海岸和太平洋地区'}
                {activeWh.id === 'fba_eu' && '亚马逊FBA欧洲配送中心（德国/波兰），覆盖欧盟27国市场，支持跨境配送'}
                {activeWh.id === 'fba_uk' && '亚马逊FBA英国仓库，覆盖英国本土，独立于欧盟配送网络'}
                {activeWh.id === 'fba_jp' && '亚马逊FBA日本仓库（千叶/兵库），覆盖日本全国，支持Prime同日达'}
                {activeWh.id === '3pl_east' && '优时派美东海外仓（新泽西），20000㎡总面积，单日处理10万+包裹，支持TikTok Shop/Temu'}
                {activeWh.id === '3pl_west' && '优时派美西海外仓（洛杉矶），覆盖西海岸消费者，支持退换货处理和二次销售'}
                {activeWh.id === 'transit_vn' && '越南中转仓，利用东盟-中国自贸区政策降低关税成本，中国→东盟母婴出口增长23%'}
                {activeWh.id === 'transit_mx' && '墨西哥中转仓，利用USMCA通道规避25%对华关税，跨境电商热门转口路径'}
              </p>
            </div>
            {/* Warehouse type legend */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {warehouseTypes.map(w => (
                <div key={w.type} className="flex items-center gap-4 p-2.5 rounded-xl bg-[#FBF8F5]">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${w.color}15` }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color }} />
                  </div>
                  <div className="flex-1 min-w-0 min-w-0">
                    <p className="text-xs font-medium text-[#1d1d1f] truncate">{w.type}</p>
                    <p className="text-[10px] text-[#86868b]">{w.desc}</p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: w.color }}>{w.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Core Info: Suppliers + Materials + Tariffs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Core Suppliers */}
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-4 h-4 text-[#C25B6E]" strokeWidth={2} />
            <h4 className="text-sm font-semibold text-[#1d1d1f]">核心供应商</h4>
          </div>
          <div className="space-y-4">
            {[
              { name: '深圳Root Innovation', role: '母公司自产', status: 'FDA 510(k) K251394/K253283', type: '自有工厂' },
              { name: 'Fimilla(上海)', role: 'HL-3060/F5113', status: 'FDA 510(k) K252630', type: 'OEM' },
              { name: 'Spectra Baby(韩国)', role: '竞品供应商', status: '新增2条自动化产线', type: '对标' },
              { name: 'AOQUN新材料', role: 'FDA/ISO 13485', status: ' cleaning tools 38%复购率', type: '材料' },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#1d1d1f]">{s.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#C25B6E]/10 text-[#C25B6E]">{s.type}</span>
                </div>
                <p className="text-[10px] text-[#86868b]">{s.role}</p>
                <p className="text-[10px] text-[#34c759] mt-0.5">{s.status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Material Price Trends */}
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-[#af52de]" strokeWidth={2} />
            <h4 className="text-sm font-semibold text-[#1d1d1f]">原材料价格走势</h4>
            <span className="text-[10px] text-[#86868b] ml-auto">基准=100</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={materialPriceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[95, 110]} tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                <Line type="monotone" dataKey="LSR硅胶" stroke="#C25B6E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="PP塑料" stroke="#34c759" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="锂电池18650" stroke="#ff3b30" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="无氧铜" stroke="#ff9500" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Tritan" stroke="#5856d6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { name: 'LSR硅胶', trend: '+3.2%', color: '#C25B6E', note: '石油价格影响' },
              { name: 'PP塑料', trend: '-1.5%', color: '#34c759', note: '供应充足' },
              { name: '锂电池18650', trend: '+5.8%', color: '#ff3b30', note: '新能源车挤压' },
              { name: 'Tritan', trend: '0.0%', color: '#5856d6', note: '价格稳定' },
            ].map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#FBF8F5]">
                <div>
                  <span className="text-[10px] text-[#1d1d1f] font-medium">{m.name}</span>
                  <span className="text-[10px] text-[#86868b] ml-1">{m.note}</span>
                </div>
                <span className="text-[10px] font-semibold" style={{ color: m.color }}>{m.trend}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tariffs & Trade */}
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex items-center gap-2 mb-5">
            <Anchor className="w-4 h-4 text-[#ff9500]" strokeWidth={2} />
            <h4 className="text-sm font-semibold text-[#1d1d1f]">关税与贸易政策</h4>
          </div>
          <div className="space-y-4">
            {[
              { title: '美国对华关税', desc: '母婴用品关税维持25%，部分企业通过越南/墨西哥转口规避', impact: '高', color: '#ff3b30' },
              { title: '欧盟CBAM', desc: '碳边境税2026年生效，出口企业需准备碳排放数据认证', impact: '中', color: '#ff9500' },
              { title: 'RCEP关税减免', desc: '区域内关税减免加速，中国→东盟母婴出口增长23%', impact: '利', color: '#34c759' },
              { title: 'USMCA通道', desc: '墨西哥中转可利用北美自贸协定降低关税壁垒', impact: '利', color: '#34c759' },
              { title: '英国UKCA', desc: 'UKCA marking替代CE，过渡期2027年底截止', impact: '中', color: '#ff9500' },
            ].map((t, i) => (
              <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#1d1d1f]">{t.title}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: t.color }}>{t.impact}</span>
                </div>
                <p className="text-[10px] text-[#86868b] leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logistics Cost Comparison */}
      <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
        <div className="flex items-center gap-2 mb-5">
          <Truck className="w-4 h-4 text-[#5856d6]" strokeWidth={2} />
          <h4 className="text-sm font-semibold text-[#1d1d1f]">物流模式成本对比</h4>
          <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg ml-auto">海外仓 vs 直邮 vs 中转仓</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { mode: '海外仓（FBA/3PL）', cost: '¥18-25/件', time: '2-3天', coverage: '本地配送', saving: '↓30-40%', color: '#34c759', pros: ['Prime 2日达', '退换货本地处理', '平台流量加权'] },
            { mode: '直邮小包', cost: '¥35-45/件', time: '10-20天', coverage: '全球', saving: '基准', color: '#ff9500', pros: ['无需备库存', '覆盖全球', '低门槛'] },
            { mode: '中转仓（越南/墨西哥）', cost: '¥22-30/件', time: '5-8天', coverage: '区域', saving: '↓15-25%', color: '#C25B6E', pros: ['规避高关税', '东盟/RCEP优惠', '近岸外包'] },
          ].map((m, i) => (
            <div key={i} className="p-4 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#1d1d1f]">{m.mode}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: m.color }}>{m.saving}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div><span className="text-[10px] text-[#86868b]">成本</span><p className="text-xs font-semibold text-[#1d1d1f]">{m.cost}</p></div>
                <div><span className="text-[10px] text-[#86868b]">时效</span><p className="text-xs font-semibold text-[#1d1d1f]">{m.time}</p></div>
                <div><span className="text-[10px] text-[#86868b]">覆盖</span><p className="text-xs font-semibold text-[#1d1d1f]">{m.coverage}</p></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.pros.map((p, j) => (
                  <span key={j} className="px-1.5 py-0.5 rounded text-[10px] bg-white text-[#86868b]">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Alerts */}
      <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className="w-4 h-4 text-[#ff3b30]" strokeWidth={2} />
          <h4 className="text-sm font-semibold text-[#1d1d1f]">供应链风险预警</h4>
          <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg ml-auto">实时监控</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { level: '高', color: '#ff3b30', icon: <DollarSign className="w-4 h-4" />, title: '锂电池供应紧张', text: '18650电池交期延长至60天+，新能源车需求挤压母婴小家电电池供应', action: '建议锁定Q2-Q3采购合同' },
            { level: '高', color: '#ff3b30', icon: <Anchor className="w-4 h-4" />, title: '美国对华关税', text: '25%关税持续生效，影响吸奶器/暖奶器等带电产品毛利率', action: '加速越南/墨西哥中转仓布局' },
            { level: '中', color: '#ff9500', icon: <TrendingUp className="w-4 h-4" />, title: 'LSR硅胶价格上涨', text: '食品级LSR硅胶同比上涨3.2%，建议Q2前锁定6个月采购合同', action: '建议与供应商签长约' },
            { level: '低', color: '#34c759', icon: <Package className="w-4 h-4" />, title: 'Tritan塑料供应充足', text: 'Eastman Tritan供应稳定，价格持平，可适当增加安全库存', action: '维持现有采购节奏' },
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-[#FBF8F5]">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${r.color}15`, color: r.color }}>
                {r.icon}
              </div>
              <div className="flex-1 min-w-0 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: r.color }}>{r.level}</span>
                  <span className="text-xs font-semibold text-[#1d1d1f]">{r.title}</span>
                </div>
                <p className="text-xs text-[#86868b] leading-relaxed truncate">{r.text}</p>
                <p className="text-[10px] text-[#C25B6E] mt-1">建议：{r.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Macro Section Component ──
const macroRegions = [
  {
    id: '亚太', color: '#C25B6E',
    overview: { share: '36-41%', cagr: '8.1%', birthsPct: '56%', momcozyShare: '19.32% 全球第一' },
    summary: '全球最大母婴市场，中国、印度贡献超62%区域需求。电商渗透率52%，线上渠道增速最快。',
    countries: [
      { name: '中国', marketSize: '¥3.2万亿', cagr: '14.2%', birthRate: '6.39‰', onlinePct: '52%', channel: '电商主导', trend: '智能化+国潮', momcozyRank: 'Top 3' },
      { name: '日本', marketSize: '$8.1B', cagr: '3.2%', birthRate: '6.3‰', onlinePct: '48%', channel: '百货+药妆', trend: '高品质+精细化', momcozyRank: 'Top 2' },
      { name: '印度', marketSize: '$15.2B', cagr: '12.5%', birthRate: '17.6‰', onlinePct: '35%', channel: '线下为主', trend: '品牌化+城镇化', momcozyRank: 'Top 5' },
      { name: '韩国', marketSize: '$4.8B', cagr: '4.1%', birthRate: '4.9‰', onlinePct: '58%', channel: '电商+O2O', trend: '高端化+设计', momcozyRank: 'Top 3' },
      { name: '澳大利亚', marketSize: '$3.1B', cagr: '5.2%', birthRate: '11.8‰', onlinePct: '45%', channel: '连锁零售', trend: '有机+环保', momcozyRank: 'Top 2' },
      { name: '东南亚', marketSize: '$12.5B', cagr: '10.8%', birthRate: '16.2‰', onlinePct: '40%', channel: 'Shopee/Lazada', trend: '移动电商爆发', momcozyRank: 'Top 3' },
    ],
    opportunities: ['中国跨境电商渠道占比将超40%，DTC品牌出海窗口期', '印度城镇化加速，中产家庭品牌意识觉醒', '东南亚RCEP关税减免，母婴出口增长23%', '日本老龄化背景下，精细化母婴产品需求旺盛'],
  },
  {
    id: '北美', color: '#5856d6',
    overview: { share: '24-28%', cagr: '4.9%', birthsPct: '12%', momcozyShare: '22.21% 北美第一' },
    summary: '全球创新引擎，29%的母婴专利来自北美。67%美国家长购买有机产品，智能设备渗透率高。',
    countries: [
      { name: '美国', marketSize: '$74.9B', cagr: '4.9%', birthRate: '11.0‰', onlinePct: '58%', channel: '亚马逊+Target', trend: '有机+智能', momcozyRank: '#1 北美' },
      { name: '加拿大', marketSize: '$6.8B', cagr: '3.8%', birthRate: '9.8‰', onlinePct: '52%', channel: '沃尔玛+电商', trend: '安全标准严格', momcozyRank: '#1 加拿大' },
      { name: '墨西哥', marketSize: '$4.2B', cagr: '6.5%', birthRate: '13.8‰', onlinePct: '38%', channel: 'Mercado Libre', trend: 'USMCA通道', momcozyRank: 'Top 2' },
    ],
    opportunities: ['360万+年出生人口，全球最大单一母婴消费国', '亚马逊+Target双渠道布局，FBA物流优势', 'USMCA墨西哥中转可规避25%对华关税', '穿戴式吸奶器渗透率低，高增长空间'],
  },
  {
    id: '欧洲', color: '#34c759',
    overview: { share: '23-26%', cagr: '3.71%', birthsPct: '8%', momcozyShare: '20.2% 欧洲第一' },
    summary: '全球最快增长区域，71%家长偏好环保配方。MDR法规趋严但品牌忠诚度高，德国贡献28%欧洲需求。',
    countries: [
      { name: '德国', marketSize: '€28.0B', cagr: '3.5%', birthRate: '9.1‰', onlinePct: '44%', channel: 'DM+Rossmann', trend: '有机+可持续', momcozyRank: '#1 德国' },
      { name: '英国', marketSize: '€18.5B', cagr: '3.2%', birthRate: '10.1‰', onlinePct: '50%', channel: 'Boots+电商', trend: '高端+设计', momcozyRank: '#1 英国' },
      { name: '法国', marketSize: '€15.2B', cagr: '3.8%', birthRate: '10.4‰', onlinePct: '42%', channel: '药妆+超市', trend: '天然+品质', momcozyRank: 'Top 2' },
      { name: '意大利', marketSize: '€8.8B', cagr: '2.9%', birthRate: '6.8‰', onlinePct: '36%', channel: '母婴专卖', trend: '设计+安全', momcozyRank: 'Top 3' },
      { name: '西班牙', marketSize: '€5.6B', cagr: '3.1%', birthRate: '7.2‰', onlinePct: '40%', channel: 'Druni+电商', trend: '中端+性价比', momcozyRank: 'Top 2' },
      { name: '东欧', marketSize: '€12.0B', cagr: '5.5%', birthRate: '9.5‰', onlinePct: '32%', channel: 'Allegro+线下', trend: '快速追赶', momcozyRank: 'Top 3' },
    ],
    opportunities: ['Kind+Jugend科隆展：全球母婴行业风向标', 'MDR过渡期2027-2028，合规产品先发优势', '有机尿布占33%，环保认证产品溢价高', '欧洲电商渗透率58%，线上增长空间大'],
  },
  {
    id: '拉美', color: '#ff9500',
    overview: { share: '5.4%', cagr: '6.5%', birthsPct: '10%', momcozyShare: 'Top 3 巴西/墨西哥' },
    summary: '中产崛起带动消费升级，城市化加速。巴西和墨西哥为核心市场，电商渗透率快速提升。',
    countries: [
      { name: '巴西', marketSize: '$9.1B', cagr: '6.5%', birthRate: '13.2‰', onlinePct: '30%', channel: 'Mercado Livre', trend: '中端品牌化', momcozyRank: 'Top 3' },
      { name: '墨西哥', marketSize: '$4.2B', cagr: '6.5%', birthRate: '13.8‰', onlinePct: '38%', channel: 'Mercado Libre', trend: 'USMCA通道', momcozyRank: 'Top 2' },
      { name: '阿根廷', marketSize: '$2.1B', cagr: '5.0%', birthRate: '15.5‰', onlinePct: '25%', channel: '线下为主', trend: '价格敏感', momcozyRank: 'Top 5' },
      { name: '哥伦比亚', marketSize: '$1.8B', cagr: '5.8%', birthRate: '13.8‰', onlinePct: '28%', channel: '电商增长', trend: '城市化驱动', momcozyRank: 'Top 5' },
    ],
    opportunities: ['Pueri Expo圣保罗：拉美最大母婴展，市场入口', 'Mercado Livre/Libre电商渗透率快速提升', '中产家庭扩大，品牌意识觉醒', 'USMCA墨西哥可作为美国市场跳板'],
  },
  {
    id: '中东及非洲', color: '#af52de',
    overview: { share: '3.1-12%', cagr: '8.5%', birthsPct: '14%', momcozyShare: 'Top 5 迪拜/沙特' },
    summary: '全球最高生育率区域，人口红利显著。UAE和沙特为消费主力，进口依赖度高，清真认证需求增长。',
    countries: [
      { name: '阿联酋', marketSize: '$2.8B', cagr: '8.2%', birthRate: '9.8‰', onlinePct: '55%', channel: '高端零售', trend: '高端+进口', momcozyRank: 'Top 3' },
      { name: '沙特', marketSize: '$3.5B', cagr: '9.0%', birthRate: '16.5‰', onlinePct: '45%', channel: 'Noon+线下', trend: 'Vision 2030', momcozyRank: 'Top 3' },
      { name: '南非', marketSize: '$2.1B', cagr: '6.8%', birthRate: '19.5‰', onlinePct: '30%', channel: 'Takealot+商超', trend: '中产消费', momcozyRank: 'Top 5' },
      { name: '尼日利亚', marketSize: '$1.8B', cagr: '9.5%', birthRate: '35.2‰', onlinePct: '15%', channel: '线下为主', trend: '人口红利', momcozyRank: '新兴' },
      { name: '埃及', marketSize: '$1.5B', cagr: '7.2%', birthRate: '24.8‰', onlinePct: '20%', channel: 'Jumia+线下', trend: '城镇化', momcozyRank: '新兴' },
    ],
    opportunities: ['全球最高生育率（非洲4.32），人口红利巨大', 'UAE/沙特高端消费能力强，进口依赖度高', '清真认证母婴市场CAGR 18%，蓝海赛道', 'CBME Turkey伊斯坦布尔：中东/北非入口'],
  },
];

function MacroSection() {
  const [activeRegion, setActiveRegion] = useState('亚太');
  const region = macroRegions.find(r => r.id === activeRegion) || macroRegions[0];

  return (
    <div className="space-y-6">
      {/* Global Overview Header */}
      <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-[#ff9500]" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1d1d1f]">全球母婴市场区域宏观分析</h3>
            <p className="text-[10px] text-[#86868b]">基于Grand View Research Research、Fortune Business Insights、The Business Research Company公开数据</p>
          </div>
        </div>
        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '全球母婴护理市场', value: '$680B', sub: '2025年', color: '#C25B6E', icon: <Globe className="w-4 h-4" /> },
            { label: 'Momcozy全球份额', value: '19.32%', sub: '穿戴吸奶器第一', color: '#5856d6', icon: <Award className="w-4 h-4" /> },
            { label: '全球年出生人口', value: '1.34亿', sub: '56%来自亚太', color: '#34c759', icon: <TrendingUp className="w-4 h-4" /> },
            { label: '电商渗透率', value: '48%', sub: '数字渠道主导', color: '#ff9500', icon: <Cpu className="w-4 h-4" /> },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                <span className="text-[10px] text-[#86868b]">{s.label}</span>
              </div>
              <p className="text-lg font-semibold text-[#1d1d1f]">{s.value}</p>
              <p className="text-[9px] text-[#86868b]">{s.sub}</p>
            </div>
          ))}
        </div>
        {/* Region Market Share Bar */}
        <div className="p-4 rounded-xl bg-[#FBF8F5]">
          <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3">全球母婴市场份额分布（2025）</h4>
          <div className="flex h-6 rounded-full overflow-hidden mb-2">
            {[
              { region: '亚太', pct: 39, color: '#C25B6E' },
              { region: '北美', pct: 27, color: '#5856d6' },
              { region: '欧洲', pct: 24, color: '#34c759' },
              { region: '拉美', pct: 5, color: '#ff9500' },
              { region: '中东及非洲', pct: 5, color: '#af52de' },
            ].map((s, i) => (
              <div key={i} style={{ width: `${s.pct}%`, backgroundColor: s.color }} className="h-full flex items-center justify-center">
                <span className="text-[8px] text-white font-medium">{s.pct}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { region: '亚太', pct: '39%', color: '#C25B6E', note: '$265B · 56%出生人口' },
              { region: '北美', pct: '27%', color: '#5856d6', note: '$184B · 29%专利' },
              { region: '欧洲', pct: '24%', color: '#34c759', note: '€156B · 71%有机偏好' },
              { region: '拉美', pct: '5%', color: '#ff9500', note: '$42B · 中产崛起' },
              { region: '中东及非洲', pct: '5%', color: '#af52de', note: '$28B · 最高生育率' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] text-[#1d1d1f] font-medium">{s.region}</span>
                <span className="text-[9px] text-[#86868b]">{s.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Region Selector Tabs */}
      <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
        <div className="flex items-center gap-1 flex-wrap mb-6">
          {macroRegions.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRegion(r.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeRegion === r.id ? 'text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}
              style={activeRegion === r.id ? { backgroundColor: r.color } : {}}
            >
              {r.id}
            </button>
          ))}
        </div>

        {/* Region Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '市场份额', value: region.overview.share, color: region.color },
            { label: 'CAGR', value: region.overview.cagr, color: region.color },
            { label: '出生人口占比', value: region.overview.birthsPct, color: region.color },
            { label: 'Momcozy地位', value: region.overview.momcozyShare, color: region.color },
          ].map((c, i) => (
            <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
              <p className="text-[10px] text-[#86868b] mb-1">{c.label}</p>
              <p className="text-lg font-semibold" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#86868b] leading-relaxed truncate mb-6">{region.summary}</p>

        {/* Country Detail Cards */}
        <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3">{activeRegion} — 国家级别分析</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {region.countries.map((c, i) => (
            <div key={i} className="p-4 rounded-xl bg-[#FBF8F5] hover:shadow-sm transition-natural">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-semibold text-[#1d1d1f]">{c.name}</h5>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: region.color }}>{c.momcozyRank}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div><span className="text-[10px] text-[#86868b]">市场规模</span><p className="text-xs font-semibold text-[#1d1d1f]">{c.marketSize}</p></div>
                <div><span className="text-[10px] text-[#86868b]">CAGR</span><p className="text-xs font-semibold" style={{ color: region.color }}>{c.cagr}</p></div>
                <div><span className="text-[10px] text-[#86868b]">生育率</span><p className="text-xs font-semibold text-[#1d1d1f]">{c.birthRate}</p></div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-white text-[#86868b]">电商{c.onlinePct}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-white text-[#86868b]">{c.channel}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-white text-[#86868b]">{c.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Opportunities */}
        <div className="mt-5 p-4 rounded-xl bg-[#FBF8F5]">
          <h4 className="text-xs font-semibold text-[#1d1d1f] mb-2 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: region.color }} />
            {activeRegion}市场机会洞察
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {region.opportunities.map((o, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: region.color }} />
                <p className="text-[10px] text-[#86868b] leading-relaxed">{o}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
