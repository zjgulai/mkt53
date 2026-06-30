import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, TrendingUp, ArrowUpRight, ArrowDownRight, Package, DollarSign, Globe, Target, Download } from 'lucide-react';
import { exportToCsv } from '@/utils/csvExport';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import Sidebar from '@/components/Sidebar';
import {
  brandShareAccessItems,
  erpInternalMonthlyTrendData,
  erpInternalTrendNotes,
  erpInternalTrendSourceIds,
  marketDenominatorBoundary,
  marketEvidenceSourceIds,
  marketMonthlyTrendData,
  marketRegionalShareData,
  marketSizeTrendData,
  marketSizingFunnel,
  marketTopStats,
} from '@/data/market-insight-data';

const categoryOverview = [
  { name: '电动吸奶器', sourceStatus: '公开品类TAM已复核', shareStatus: '品牌份额待授权', growthStatus: '细分增速需外部拆分', color: '#C25B6E', sub: '含穿戴式/双边' },
  { name: '手动吸奶器', sourceStatus: '类目分母待复核', shareStatus: '品牌份额待授权', growthStatus: '走势待复核', color: '#86868b', sub: '传统品类线索' },
  { name: '哺乳文胸', sourceStatus: '类目分母待复核', shareStatus: '品牌份额待授权', growthStatus: '增速待复核', color: '#34c759', sub: '功能性线索' },
  { name: '暖奶器', sourceStatus: '类目分母待复核', shareStatus: '品牌份额待授权', growthStatus: '增速待复核', color: '#ff9500', sub: '生态配件线索' },
  { name: '消毒器', sourceStatus: '类目分母待复核', shareStatus: '品牌份额待授权', growthStatus: '增速待复核', color: '#af52de', sub: 'UV功能线索' },
  { name: '防溢乳垫', sourceStatus: '类目分母待复核', shareStatus: '品牌份额待授权', growthStatus: '复购待验证', color: '#5856d6', sub: '消耗品线索' },
  { name: '储奶袋', sourceStatus: '类目分母待复核', shareStatus: '品牌份额待授权', growthStatus: '复购待验证', color: '#ff3b30', sub: '配件线索' },
];

const categoryPositioning = [
  { category: '电动吸奶器', position: '强势领先', action: '巩固M5+M9双旗舰，防御Medela反击', priority: 'P0' },
  { category: '手动吸奶器', position: '机会待复核', action: '先补授权类目走势，再判断是否追加投入', priority: 'P3' },
  { category: '哺乳文胸', position: '增长潜力待复核', action: '份额与增速待授权，先补SKU映射和外部类目证据', priority: 'P1' },
  { category: '暖奶器', position: '新兴机会待复核', action: '增长口径待外部来源确认，可先作为生态配件线索', priority: 'P2' },
  { category: '消毒器', position: '蓝海线索待复核', action: 'UV技术驱动需来源绑定，暂不下高增长结论', priority: 'P1' },
  { category: '防溢乳垫', position: '消耗品线索', action: '复购假设需ERP或平台订单验证后再用于交叉销售', priority: 'P2' },
  { category: '储奶袋', position: '配件线索', action: '套装捆绑假设需订单篮子和复购数据验证', priority: 'P2' },
];

const statIcons = { DollarSign, Globe, Package, TrendingUp };

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

export default function MarketPage() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 min-w-0 space-y-6">

            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                    <LayoutDashboard className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">市场总览</h1>
                    <p className="text-xs text-[#86868b]">全球母婴喂养电器市场 · 市场层级与份额分母口径</p>
                  </div>
                </div>
                <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg"><span className="text-[#B5AFA8]">数据状态：</span>公开TAM复核 · ERP内部代理Batch19已放行</span>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={marketEvidenceSourceIds}
              title="市场总览来源口径"
              description="全球婴童用品为上层TAM；全球吸奶器为品类TAM，可作为品牌份额主分母；穿戴式吸奶器为细分TAM，可作为细分份额分母。SAM/SOM需额外叠加地域、渠道、SKU、合规可服务范围和Momcozy可获份额假设；月度趋势为Wikimedia公开兴趣代理，不代表GMV或销量。"
            />

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">TAM / SAM / SOM 口径复核</h2>
                  <p className="text-[10px] text-[#86868b] mt-1">已将原图表中的 SAM/SOM 字段改为三层 TAM；SAM/SOM 需要另建可服务范围和可获份额模型。</p>
                </div>
                <span className="rounded-lg bg-[#FBF8F5] px-3 py-1.5 text-[10px] font-medium text-[#86868b]">source ids: ds-001 / ds-044 / ds-045 / ds-047 / ds-049 / ds-050 / ds-051</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {marketDenominatorBoundary.map((item) => (
                  <div key={item.label} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-[#1d1d1f]">{item.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${item.canDisplayAsFact ? 'bg-[#34c759]/10 text-[#2f7d32]' : 'bg-[#ff9500]/10 text-[#a85f00]'}`}>
                        {item.canDisplayAsFact ? 'TAM事实' : '阻断'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#86868b] mb-1">{item.scope}</p>
                    <p className="text-[10px] leading-relaxed text-[#1d1d1f]">{item.denominatorUse}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Market denominator cards — flex layout + min-w-0 */}
            <div className="flex gap-3">
              {marketSizingFunnel.map((t, i) => (
                <div key={i} className="flex-1 min-w-0 min-w-0 rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] relative overflow-hidden" style={{ backgroundColor: `${t.color}08` }}>
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: t.color }} />
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-bold" style={{ color: t.color }}>{t.label}</span>
                    <span className="text-xs text-[#86868b] font-medium">{t.sublabel}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-[#1d1d1f] tracking-tight">{t.value}</p>
                    <span className="text-sm font-medium text-[#86868b]">{t.unit}</span>
                  </div>
                  <p className="text-xs text-[#B5AFA8] mt-0.5">{t.desc}</p>
                  <div className="mt-3 pt-3 border-t border-[#EDE6DF]/40">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#86868b]">机会指数</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, si) => (
                          <div key={si} className={`w-1.5 h-1.5 rounded-full ${si < t.opportunity ? 'bg-[#34c759]' : 'bg-[#EDE6DF]'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-[#34c759]">{t.opportunity}/5</span>
                    </div>
                    <p className="text-xs text-[#1d1d1f] leading-relaxed mt-1">{t.opportunityText}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: t.color }}>{t.focus}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Market Sizing Trend — LineChart (not stacked AreaChart) */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              {/* audit-source: ds-044 ds-001 ds-045 */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">市场规模预测 · 三层TAM份额分母趋势（2025-2030E）</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => exportToCsv(marketSizeTrendData, { year: '年份', upperTam: '上层TAM($B)', categoryTam: '吸奶器品类TAM($B)', wearableTam: '穿戴式细分TAM($B)', type: '类型' }, '市场规模趋势_2025-2030E')} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all">
                    <Download className="w-3 h-3" />导出
                  </button>
                  <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-1 rounded-lg">单位：$B</span>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                  <LineChart data={marketSizeTrendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="upperTam" name="上层TAM 全球婴童用品" stroke="#C25B6E" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="categoryTam" name="品类TAM 全球吸奶器" stroke="#ff9500" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="wearableTam" name="细分TAM 穿戴式吸奶器" stroke="#34c759" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Key findings */}
              <div className="mt-4 p-4 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                <p className="text-[10px] text-[#C25B6E] font-semibold mb-1.5">关键发现 · 三层份额分母持续扩大</p>
                <div className="space-y-1.5">
                  {/* audit-source: ds-044 ds-001 ds-045 */}
                  <div className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#C25B6E] mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-[#1d1d1f]">穿戴式细分TAM增速(15.08%) {'>'} 吸奶器品类TAM(8.52%) {'>'} 婴童用品上层TAM(6.4%)，说明穿戴式是吸奶器赛道内的高弹性细分。</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#ff9500] mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-[#1d1d1f]">2030E穿戴式吸奶器公开报告外推约$409M；品牌份额和真实GMV月趋势仍需Amazon/零售面板或内部ERP快照。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Public Trend */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              {/* audit-source: ds-046 */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">月度趋势 · 公开兴趣代理（2025-06 至 2026-06）</h3>
                  <p className="text-[10px] text-[#86868b] mt-1">Wikimedia en.wikipedia Breast_pump 月浏览量指数化；非GMV、非销量、非Amazon数据。</p>
                </div>
                <button onClick={() => exportToCsv(marketMonthlyTrendData, { month: '月份', interestIndex: '公开兴趣指数', pageviews: '页面浏览量', note: '备注' }, '公开月度趋势_Breast_pump_Pageviews_2025-06_2026-06')} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all">
                  <Download className="w-3 h-3" />导出
                </button>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                  <LineChart data={marketMonthlyTrendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} domain={[0, 110]} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="interestIndex" name="公开兴趣指数" stroke="#5856d6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* audit-source: ds-047 ds-048 ds-049 */}
            <PageEvidenceNotice
              sourceIds={erpInternalTrendSourceIds}
              title="ERP内部月度趋势代理"
              description="电商、售后、零售与渠道三条ERP来源已完成本地只读取证，并经Batch19 manual release review放行页面展示与CSV导出；当前仅作为private/internal销量代理，不代表GMV、销售额、市场份额、TAM、SAM或SOM。"
            />

            {/* Internal ERP Proxy Trend */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              {/* audit-source: ds-047 ds-048 ds-049 */}
              <div className="flex flex-col gap-3 mb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">ERP内部月度趋势代理 · Batch19已放行</h3>
                  <p className="text-[10px] text-[#86868b] mt-1">2026-01 至 2026-06-24 · 电商销售统计 + 售后销量统计 + 零售与渠道可见月度销量列 · 本地展示/CSV已放行，生产部署未执行</p>
                </div>
                <button onClick={() => exportToCsv(erpInternalMonthlyTrendData, { month: '月份', ecommerce: '电商销售统计', afterSales: '售后销量统计', retailChannel: '零售与渠道', totalProxy: '三源合计代理', pumpKeywordProxy: '吸奶器关键词代理', note: '备注' }, 'ERP内部月度趋势代理_Batch19_2026-01_2026-06-24')} className="flex items-center gap-1 self-start px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all">
                  <Download className="w-3 h-3" />导出
                </button>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                  <LineChart data={erpInternalMonthlyTrendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="totalProxy" name="三源合计代理" stroke="#C25B6E" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="pumpKeywordProxy" name="吸奶器关键词代理" stroke="#5856d6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="retailChannel" name="零售与渠道" stroke="#34c759" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                {erpInternalTrendNotes.map((note) => (
                  <div key={note.text} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                    <p className="text-xs leading-relaxed text-[#1d1d1f]">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {marketTopStats.map((stat, i) => {
                const IconComp = statIcons[stat.icon as keyof typeof statIcons];
                return (
                  <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-[#86868b]">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-semibold text-[#1d1d1f]">{stat.value}</p>
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.up ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
                      {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{stat.change}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Category + Positioning in 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品类细分（待接入授权类目份额）</h3>
                <div className="space-y-3">
                  {categoryOverview.map((cat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <div className="flex-1 min-w-0 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#1d1d1f] truncate">{cat.name}</span>
                          <span className="text-[10px] text-[#86868b]">{cat.sourceStatus}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-[#86868b]">{cat.sub}</span>
                          <span className="rounded bg-[#ff9500]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#a85f00]">{cat.shareStatus}</span>
                          <span className="rounded bg-[#FBF8F5] px-1.5 py-0.5 text-[10px] text-[#86868b]">{cat.growthStatus}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Positioning — same card style */}
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-[#C25B6E]" />
                  <h3 className="text-sm font-semibold text-[#C25B6E]">Momcozy 品类定位建议</h3>
                </div>
                <div className="space-y-2">
                  {categoryPositioning.map((cp, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 mt-0.5 ${cp.priority === 'P0' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : cp.priority === 'P1' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#86868b]/10 text-[#86868b]'}`}>{cp.priority}</span>
                      <div className="flex-1 min-w-0 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-[#1d1d1f] truncate">{cp.category}</span>
                          <span className="text-[10px] text-[#86868b]">{cp.position}</span>
                        </div>
                        <p className="text-[10px] text-[#1d1d1f] mt-0.5">{cp.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Brand Share Access Gate */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">品牌份额趋势 · 待授权接入</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {brandShareAccessItems.map((item) => (
                  <div key={item.label} className="p-4 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-semibold text-[#1d1d1f]">{item.label}</p>
                      <span className="text-[10px] text-[#ff9500] bg-[#ff9500]/10 px-2 py-0.5 rounded-full">{item.status}</span>
                    </div>
                    <p className="text-xs text-[#86868b] leading-relaxed">{item.note}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/10">
                <p className="text-[10px] text-[#ff9500] font-semibold mb-1">边界说明</p>
                <p className="text-xs text-[#1d1d1f]">当前公开行业报告可支撑区域份额和品类市场规模；品牌份额、Momcozy份额和月度GMV趋势需要授权渠道数据或零售面板，页面不再使用旧示例折线替代真实数据。</p>
              </div>
            </div>

            {/* Regional Breakdown */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">区域市场份额 · 吸奶器全球市场</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {marketRegionalShareData.map((r, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FBF8F5]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="text-xs font-semibold text-[#1d1d1f]">{r.region}</span>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: r.color }}>{r.share}<span className="text-sm">%</span></p>
                    <p className="text-xs text-[#86868b]">{r.revenue}</p>
                    <p className="text-xs text-[#34c759] font-medium">{r.status}</p>
                    <p className="text-[10px] text-[#86868b] mt-1">{r.key}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 rounded-xl bg-[#5856d6]/5 border border-[#5856d6]/10">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-[#5856d6]" />
                  <p className="text-xs text-[#5856d6] font-semibold">区域优先级建议</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-white/60">
                    {/* audit-source: ds-002 */}
                    <p className="text-xs text-[#ff3b30] font-bold">P0 · 北美 $0.96B</p>
                    <p className="text-xs text-[#1d1d1f] mt-1">公开报告确认北美为最大区域市场；需要叠加渠道授权数据后再判断品牌份额。</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/60">
                    {/* audit-source: ds-002 */}
                    <p className="text-xs text-[#ff9500] font-bold">P1 · 非北美 $1.18B</p>
                    <p className="text-xs text-[#1d1d1f] mt-1">欧洲、亚太、拉美和MEA目前只保留合计派生值；细分拆分需完整报告或零售面板。</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/60">
                    {/* audit-source: ds-046 ds-047 ds-048 ds-049 */}
                    <p className="text-xs text-[#34c759] font-bold">P2 · 月度趋势</p>
                    <p className="text-xs text-[#1d1d1f] mt-1">公开月度趋势已接入兴趣代理；业务月趋势仍需Amazon、ERP或广告平台快照。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">市场关键洞察</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: '规模口径', color: '#34c759', sourceIds: ['ds-001', 'ds-044', 'ds-002'], items: ['全球吸奶器2026E为$3.81B（Precedence Research），当前按品类TAM展示', 'Fortune BI与GVR对吸奶器总盘给出较低口径，需保留机构差异', '全球婴童用品$375.8B（GVR 2026E）仅作为上层TAM，不作吸奶器份额分母', 'SAM/SOM待服务范围和可获份额假设补齐后再启用'] },
                  { title: '趋势口径', color: '#5856d6', sourceIds: ['ds-045', 'ds-001', 'ds-046'], items: ['穿戴式吸奶器2026E为$233M（Fortune BI）', '穿戴式CAGR 15.08%，高于整体吸奶器CAGR 8.52%', '公开月趋势来自Wikimedia Pageviews指数', '2026-06为非完整月，不做环比结论'] },
                  { title: '待授权项', color: '#C25B6E', sourceIds: ['ds-046', 'ds-047', 'ds-048', 'ds-049'], items: ['Momcozy品牌份额需Amazon Brand Analytics或零售面板', '月度GMV/销量趋势需Amazon、ERP或广告平台快照', '欧洲/亚太/拉美细分份额需完整报告拆分', '公开兴趣数据不能替代交易数据'] },
                ].map((s, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FBF8F5]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <h4 className="text-xs font-semibold" style={{ color: s.color }}>{s.title}</h4>
                    </div>
                    <div className="space-y-2">
                      {s.items.map((item, j) => (
                        <div key={j} className="flex items-start gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-[#EDE6DF] mt-1.5 flex-shrink-0" />
                          <p className="text-xs text-[#86868b] leading-relaxed truncate">{item}</p>
                        </div>
                      ))}
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
