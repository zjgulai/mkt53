import { useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Anchor, ArrowUpRight, ArrowDownRight, FileText, Search } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

// HS Code classification for breast pumps and baby care products
const hsCodes = [
  { code: '9018.90', desc: '医疗器械零件（含吸奶器配件）', rate2025: 15, rate2026: 12, trend: 'down', topDest: '美国/欧盟' },
  { code: '8419.19', desc: '家用电动器具（暖奶器/消毒器）', rate2025: 18, rate2026: 15, trend: 'down', topDest: '北美/亚太' },
  { code: '3924.90', desc: '塑料家庭用品（奶瓶/储奶袋）', rate2025: 10, rate2026: 8, trend: 'down', topDest: '全球' },
  { code: '4014.90', desc: '硫化橡胶制品（奶嘴/防溢乳垫）', rate2025: 8, rate2026: 6, trend: 'down', topDest: '东南亚/欧洲' },
  { code: '6307.90', desc: '纺织制品（哺乳文胸/背带）', rate2025: 12, rate2026: 10, trend: 'down', topDest: '美国/日本' },
  { code: '3926.90', desc: '其他塑料制品（婴儿餐具）', rate2025: 9, rate2026: 7, trend: 'down', topDest: '全球' },
];

const tradeFlowData = [
  { month: '2024-01', chinaExport: 185, usaImport: 92, euImport: 58, japanImport: 22 },
  { month: '2024-03', chinaExport: 192, usaImport: 95, euImport: 61, japanImport: 24 },
  { month: '2024-05', chinaExport: 198, usaImport: 98, euImport: 63, japanImport: 25 },
  { month: '2024-07', chinaExport: 205, usaImport: 102, euImport: 65, japanImport: 26 },
  { month: '2024-09', chinaExport: 212, usaImport: 105, euImport: 68, japanImport: 28 },
  { month: '2024-11', chinaExport: 218, usaImport: 108, euImport: 70, japanImport: 29 },
  { month: '2025-01', chinaExport: 225, usaImport: 112, euImport: 72, japanImport: 30 },
  { month: '2025-03', chinaExport: 235, usaImport: 116, euImport: 75, japanImport: 32 },
  { month: '2025-05', chinaExport: 242, usaImport: 120, euImport: 78, japanImport: 33 },
];

const tariffByCountry = [
  { country: '美国', mfn: 4.0, gsp: 0, ftaRcep: '-', ftaOther: '-', effective: 25.0, note: '301条款额外+25%' },
  { country: '欧盟', mfn: 2.5, gsp: 0, ftaRcep: '-', ftaOther: '-', effective: 2.5, note: 'MDR合规要求' },
  { country: '英国', mfn: 2.5, gsp: 0, ftaRcep: '-', ftaOther: '-', effective: 2.5, note: 'UKCA marking' },
  { country: '日本', mfn: 3.5, gsp: 0, ftaRcep: '0', ftaOther: 'RCEP', effective: 0, note: 'RCEP零关税' },
  { country: '澳大利亚', mfn: 5.0, gsp: 0, ftaRcep: '0', ftaOther: '中澳FTA', effective: 0, note: '中澳FTA零关税' },
  { country: '韩国', mfn: 8.0, gsp: 0, ftaRcep: '0', ftaOther: '中韩FTA', effective: 0, note: '中韩FTA零关税' },
  { country: '加拿大', mfn: 6.5, gsp: 0, ftaRcep: '-', ftaOther: '-', effective: 6.5, note: 'CCPSA合规' },
  { country: '越南(中转)', mfn: 8.0, gsp: 0, ftaRcep: '0', ftaOther: '东盟自贸区', effective: 0, note: 'RCEP转口中转' },
  { country: '墨西哥(中转)', mfn: 15.0, gsp: 0, ftaRcep: '-', ftaOther: 'USMCA', effective: 0, note: 'USMCA零关税通道' },
];

const topExportPorts = [
  { port: '深圳盐田', volume: '$892M', growth: 18.2, share: '32%', products: '吸奶器/暖奶器/消毒器', color: '#C25B6E' },
  { port: '上海洋山', volume: '$645M', growth: 14.5, share: '23%', products: '哺乳文胸/婴儿背带', color: '#5856d6' },
  { port: '宁波舟山', volume: '$428M', growth: 12.8, share: '15%', products: '奶瓶/储奶袋/餐具', color: '#34c759' },
  { port: '广州南沙', volume: '$356M', growth: 15.3, share: '13%', products: '防溢乳垫/配件', color: '#ff9500' },
  { port: '厦门海沧', volume: '$198M', growth: 22.1, share: '7%', products: '硅胶制品/奶嘴', color: '#af52de' },
  { port: '其他', volume: '$281M', growth: 10.5, share: '10%', products: '综合', color: '#86868b' },
];

const sidebarItems = [
  { label: '看市场', children: [
    { label: '总览', path: '/market' },
    { label: '大盘趋势', path: '/market/trend' },
    { label: '吸奶器', path: '/market/mtl' },
    { label: '哺乳用品', path: '/market/dtl' },
    { label: '婴儿护理', path: '/market/consumables' },
    { label: '海关数据', path: '/market/customs' },
    { label: '品类分析', path: '/market/category' },
  ]},
];

export default function CustomsData() {
  const [activeTab, setActiveTab] = useState('HS编码');
  const tabs = ['HS编码', '贸易流向', '关税查询', '出口口岸'];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#af52de] flex items-center justify-center shadow-sm">
                  <Anchor className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">海关数据</h1>
                  <p className="text-xs text-[#86868b]">HS编码 · 贸易流向 · 关税查询 · 出口口岸</p>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-1 flex-wrap">
                {tabs.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-[#af52de] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>{tab}</button>
                ))}
              </div>
            </div>

            {/* ── HS编码 ── */}
            {activeTab === 'HS编码' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-[#af52de]/10 flex items-center justify-center"><FileText className="w-4 h-4 text-[#af52de]" strokeWidth={2} /></div>
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">母婴产品核心HS编码速查</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#EDE6DF] table-row-hover">
                          {['HS编码', '产品描述', '2025税率%', '2026E税率%', '趋势', '主要出口目的地'].map((h, i) => (
                            <th key={i} className="py-2.5 px-3 text-[10px] text-[#86868b] font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hsCodes.map((h, i) => (
                          <tr key={i} className="border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors duration-200 duration-200">
                            <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-md bg-[#af52de]/10 text-[#af52de] text-xs font-semibold">{h.code}</span></td>
                            <td className="py-2.5 px-3 text-xs text-[#1d1d1f]">{h.desc}</td>
                            <td className="py-2.5 px-3 text-xs text-[#86868b]">{h.rate2025}%</td>
                            <td className="py-2.5 px-3 text-xs text-[#34c759] font-medium">{h.rate2026}%</td>
                            <td className="py-2.5 px-3">
                              <span className={`flex items-center gap-0.5 text-xs ${h.trend === 'down' ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
                                {h.trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}{h.trend === 'down' ? '下降' : '上升'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-[#86868b]">{h.topDest}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                    <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3">RCEP关税减免利好</h4>
                    <div className="space-y-2">
                      {['日本：HS 9018.90 关税从3.5%→0%', '澳大利亚：中澳FTA零关税覆盖大部分母婴HS编码', '韩国：中韩FTA+ RCEP叠加优惠', '越南：东盟自贸区内关税逐步降至0%', '东南亚六国：统一优惠关税，出口成本降低15-25%'].map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#FBF8F5]">
                          <div className="w-1 h-1 rounded-full bg-[#34c759] mt-1.5 flex-shrink-0" />
                          <p className="text-[10px] text-[#86868b]">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                    <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3">美国301条款影响</h4>
                    <div className="space-y-2">
                      {['额外关税+25%，叠加MFN税率后实际税率达25-30%', 'HS 9018.90 医疗器械配件受影响最大', '建议通过越南/墨西哥转口规避', 'USMCA通道：墨西哥组装后可享零关税进入美国', '柬埔寨/缅甸：普惠制(GSP)暂停，不建议使用'].map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#FBF8F5]">
                          <div className="w-1 h-1 rounded-full bg-[#ff3b30] mt-1.5 flex-shrink-0" />
                          <p className="text-[10px] text-[#86868b]">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 贸易流向 ── */}
            {activeTab === '贸易流向' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">中国母婴产品出口流向（$M/月）</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tradeFlowData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey="chinaExport" name="中国总出口" stroke="#C25B6E" strokeWidth={3} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="usaImport" name="美国进口" stroke="#5856d6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="euImport" name="欧盟进口" stroke="#34c759" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="japanImport" name="日本进口" stroke="#ff9500" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: '中国出口总额', value: '$2.8B', growth: '+16.2%', color: '#C25B6E' },
                    { label: '美国进口', value: '$1.2B', growth: '+12.5%', color: '#5856d6' },
                    { label: '欧盟进口', value: '$780M', growth: '+15.8%', color: '#34c759' },
                    { label: '日本进口', value: '$396M', growth: '+18.5%', color: '#ff9500' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                      <p className="text-[10px] text-[#86868b] mb-1">{s.label}</p>
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <span className="text-[10px] text-[#34c759] font-medium">{s.growth} YoY</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 关税查询 ── */}
            {activeTab === '关税查询' && (
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] overflow-x-auto">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-[#af52de]/10 flex items-center justify-center"><Search className="w-4 h-4 text-[#af52de]" strokeWidth={2} /></div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">主要市场关税查询（HS 9018.90 吸奶器类）</h3>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#EDE6DF] table-row-hover">
                      {['国家/地区', 'MFN税率', 'GSP普惠', 'RCEP优惠', '其他FTA', '实际税率', '备注'].map((h, i) => (
                        <th key={i} className="py-2.5 px-3 text-[10px] text-[#86868b] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tariffByCountry.map((t, i) => (
                      <tr key={i} className="border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors duration-200 duration-200">
                        <td className="py-2.5 px-3 text-xs font-semibold text-[#1d1d1f]">{t.country}</td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{t.mfn}%</td>
                        <td className="py-2.5 px-3 text-xs text-[#34c759]">{t.gsp === 0 ? '0%' : t.gsp}%</td>
                        <td className="py-2.5 px-3"><span className={`text-xs ${t.ftaRcep === '0' ? 'text-[#34c759] font-medium' : 'text-[#86868b]'}`}>{t.ftaRcep === '-' ? '—' : t.ftaRcep + '%'}</span></td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{t.ftaOther}</td>
                        <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.effective === 0 ? 'bg-[#34c759]/10 text-[#34c759]' : t.effective > 10 ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{t.effective}%</span></td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{t.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── 出口口岸 ── */}
            {activeTab === '出口口岸' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topExportPorts.map((p, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <h4 className="text-sm font-semibold text-[#1d1d1f]">{p.port}</h4>
                        </div>
                        <span className="text-[10px] text-[#86868b]">{p.share}</span>
                      </div>
                      <p className="text-2xl font-bold text-[#1d1d1f]">{p.volume}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[#34c759] font-medium">+{p.growth}%</span>
                        <span className="text-[10px] text-[#86868b]">YoY增长</span>
                      </div>
                      <p className="text-[10px] text-[#86868b] mt-2">主要产品：{p.products}</p>
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
