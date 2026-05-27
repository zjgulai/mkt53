import { useState } from 'react';
import { Database, ExternalLink, AlertTriangle, CheckCircle, Info, Shield, TrendingUp, BarChart3, Globe, Users, Target } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// 数据来源管理页面 — 企业级数据溯源与质量管控
// 10轮深度盘点产出：全站24条数据来源 · 4级可信度 · 8个缺口 · 5套测算模型
// ═══════════════════════════════════════════════════════════════════

interface DataSource {
  id: string; module: string; page: string; metric: string;
  source: string; sourceType: string; year: string;
  reliability: 'A' | 'B' | 'C' | 'D'; gap: string; action: string;
  url?: string;
}

const dataSources: DataSource[] = [
  // 看市场
  { id: 'ds-001', module: '看市场', page: 'MarketPage', metric: 'TAM/SAM/SOM', source: 'Precedence Research', sourceType: '行业报告', year: '2026-04', reliability: 'A', gap: '', action: 'OK', url: 'https://www.precedenceresearch.com/breast-pump-market' },
  { id: 'ds-002', module: '看市场', page: 'MarketPage', metric: '区域份额', source: 'Fortune Business Insights', sourceType: '行业报告', year: '2025', reliability: 'A', gap: '', action: 'OK', url: 'https://www.fortunebusinessinsights.com' },
  { id: 'ds-003', module: '看市场', page: 'MarketTrend', metric: 'PEST分析', source: 'WHO/FDA/各国政府', sourceType: '官方数据', year: '2024-2026', reliability: 'A', gap: '', action: 'OK' },
  { id: 'ds-004', module: '看市场', page: 'MarketTrend', metric: '波特五力定量评分', source: 'Mordor Intelligence框架', sourceType: '专家评估', year: '2026', reliability: 'C', gap: '⚠️缺乏定量原始数据', action: '建议采购IBISWorld完整报告', url: 'https://www.mordorintelligence.com' },
  { id: 'ds-005', module: '看市场', page: 'BreastPump', metric: '品类拆分', source: 'Precedence/Technavio加权', sourceType: '推算', year: '2026', reliability: 'B', gap: '', action: 'OK（2家交叉验证）' },
  { id: 'ds-006', module: '看市场', page: 'CustomsData', metric: 'HS编码进出口', source: '海关总署/Import Genius', sourceType: '官方数据', year: '2025-2026', reliability: 'D', gap: '❌当前为示例数据', action: '需接入Import Genius API或数仓', url: 'https://www.importgenius.com' },
  // 看竞争
  { id: 'ds-007', module: '看竞争', page: 'CompetitionPage', metric: '竞品概览', source: 'Amazon.com 实时采集', sourceType: '平台API', year: '2026-05', reliability: 'A', gap: '', action: 'OK（每周自动采集）' },
  { id: 'ds-008', module: '看竞争', page: 'NewCompetition', metric: '新品追踪', source: '品牌官网/新闻稿', sourceType: '新闻', year: '2025-2026', reliability: 'B', gap: '', action: 'OK' },
  { id: 'ds-009', module: '看竞争', page: 'ProductManage', metric: '产品参数/价格', source: 'Amazon.com 2026-05', sourceType: '实时采集', year: '2026', reliability: 'A', gap: '', action: 'OK' },
  { id: 'ds-010', module: '看竞争', page: 'RegionCompetition', metric: '区域份额', source: 'Amazon Brand Analytics', sourceType: '平台数据', year: '2026', reliability: 'B', gap: '⚠️仅Amazon渠道', action: '建议叠加NPD/IRI线下数据', url: 'https://vendorcentral.amazon.com' },
  // 看用户
  { id: 'ds-011', module: '看用户', page: 'UsersPage', metric: '用户画像', source: 'QuestMobile 2025 / Mamava Survey', sourceType: '行业报告', year: '2025', reliability: 'A', gap: '', action: 'OK', url: 'https://www.questmobile.com' },
  { id: 'ds-012', module: '看用户', page: 'UsersPage', metric: 'RFM分层', source: 'Momcozy CRM', sourceType: '内部系统', year: '2026 Q1', reliability: 'C', gap: '⚠️示例数据', action: '需对接真实CRM数据库' },
  { id: 'ds-013', module: '看用户', page: 'OverseasSentiment', metric: '社交声量', source: 'TikTok/IG/FB API', sourceType: '社交媒体API', year: '2025-2026', reliability: 'B', gap: '', action: 'OK' },
  { id: 'ds-014', module: '看用户', page: 'ConsumerInterviews', metric: '消费者访谈', source: '定性研究', sourceType: '定性', year: '2025', reliability: 'B', gap: '⚠️样本量未标注', action: '补充样本量说明' },
  // 看行业
  { id: 'ds-015', module: '看行业', page: 'IndustryPage', metric: '行业概况', source: 'Grand View Research / Fortune BI', sourceType: '行业报告', year: '2025', reliability: 'A', gap: '', action: 'OK' },
  { id: 'ds-016', module: '看行业', page: 'PolicyInsight', metric: '政策法规', source: '各国政府官网', sourceType: '官方数据', year: '2025-2026', reliability: 'A', gap: '', action: 'OK' },
  { id: 'ds-017', module: '看行业', page: 'IPAnalysis', metric: '专利数据', source: 'WIPO/USPTO', sourceType: '官方数据库', year: '2020-2024', reliability: 'B', gap: '⚠️2025数据缺失', action: '需更新WIPO 2025数据', url: 'https://www.wipo.int' },
  { id: 'ds-018', module: '看行业', page: 'Exhibition', metric: '展会情报', source: '展会官网', sourceType: '官网', year: '2025-2026', reliability: 'B', gap: '', action: 'OK' },
  // 看自己
  { id: 'ds-019', module: '看自己', page: 'SelfInsight', metric: '营销4P', source: 'Momcozy内部/Amazon', sourceType: '混合', year: '2025-2026', reliability: 'B', gap: '', action: 'OK' },
  { id: 'ds-020', module: '看自己', page: 'SelfInsight', metric: 'BCG矩阵', source: '内部测算', sourceType: '内部', year: '2026', reliability: 'C', gap: '⚠️主观评估', action: '建议引用外部份额数据校准' },
  // AI助手
  { id: 'ds-021', module: 'AI助手', page: 'CommentData', metric: '评论情感分析', source: 'Amazon API / NLP模型', sourceType: 'AI模型', year: '2026', reliability: 'B', gap: '⚠️准确率未标注', action: '补充模型准确率指标' },
  { id: 'ds-022', module: 'AI助手', page: 'KnowledgeBase', metric: '知识库', source: '内部维护', sourceType: '内部', year: '2026', reliability: 'A', gap: '', action: 'OK' },
  { id: 'ds-023', module: 'AI助手', page: 'WebReview', metric: '网页评论爬取', source: '爬虫采集', sourceType: '爬虫', year: '2026', reliability: 'B', gap: '⚠️合规风险', action: '需标注robots.txt合规性' },
  // 报告中心
  { id: 'ds-024', module: '报告中心', page: 'ReportsPage', metric: '报告元数据', source: '内部管理', sourceType: '内部', year: '2026', reliability: 'A', gap: '', action: 'OK' },
];

// R46: 数据可信度趋势分析 (todo: 未来实现图表)
/* const reliabilityTrend = [
  { period: '2025 Q1', a: 6, b: 8, c: 4, d: 2 },
  { period: '2025 Q2', a: 7, b: 8, c: 3, d: 2 },
  { period: '2025 Q3', a: 7, b: 7, c: 4, d: 2 },
  { period: '2025 Q4', a: 8, b: 7, c: 3, d: 2 },
  { period: '2026 Q1', a: 8, b: 6, c: 4, d: 2 },
]; */

// 数据质量差异对比（关键发现）
const divergenceData = [
  { institution: 'Coherent Market Insights', value2025: '—', value2026: '$11.6亿', forecast: '$16.1亿(2033)', cagr: '4.8%', scope: '仅电动吸奶器设备', reliability: 'B' },
  { institution: 'Grand View Research Research', value2025: '$16.4亿', value2026: '$17.6亿', forecast: '$29.2亿(2033)', cagr: '7.55%', scope: '手动+电动+配件', reliability: 'A' },
  { institution: 'Precedence Research', value2025: '$35.1亿', value2026: '$38.1亿', forecast: '$79.5亿(2035)', cagr: '8.52%', scope: '全品类+周边产品', reliability: 'A', adopted: true },
  { institution: 'Mordor Intelligence', value2025: '$36.2亿', value2026: '—', forecast: '$54.8亿(2030)', cagr: '8.7%', scope: '喂养护完整生态', reliability: 'A' },
];

// 测算模型说明
const calcModels = [
  { name: 'TAM/SAM/SOM', icon: BarChart3, desc: '三级市场漏斗模型', method: 'TAM=行业总规模(Precedence) → SAM=电动细分(49%) → SOM=Momcozy可获(穿戴式$6.69B)', source: 'Precedence Research 2026-04' },
  { name: '波特五力', icon: Target, desc: '行业竞争强度定量评分', method: '5维度1-5分评分：供应商(3) + 买方(4) + 新进入者(3) + 替代品(2) + 竞争(4)', source: 'Mordor Intelligence框架' },
  { name: '海关HS编码', icon: Globe, desc: '国际贸易商品分类', method: 'HS 9018.11(breast pumps) / 9018.90(medical instruments) / 美国HTS 9018.90.7500', source: 'WCO / USITC 2025' },
  { name: 'BCG矩阵', icon: TrendingUp, desc: '产品组合增长-份额分析', method: '市场增长率×相对市场份额 → 明星/现金牛/问题/瘦狗四象限', source: 'Boston Consulting Group经典模型' },
  { name: 'RFM分层', icon: Users, desc: '用户价值分层模型', method: 'R(最近购买)×F(频次)×M(金额) → 7层用户分群', source: 'Momcozy CRM系统' },
];

// 可信度颜色
const relColors = { A: '#34c759', B: '#5856d6', C: '#ff9500', D: '#ff3b30' };
const relLabels = { A: '高可信度', B: '中等可信度', C: '需谨慎', D: '示例数据' };

export default function DataSourcePage() {
  const [activeTab, setActiveTab] = useState<'sources' | 'divergence' | 'models'>('sources');
  const [filterModule, setFilterModule] = useState('全部');

  const modules = ['全部', ...Array.from(new Set(dataSources.map(d => d.module)))];
  const filtered = filterModule === '全部' ? dataSources : dataSources.filter(d => d.module === filterModule);

  // R17: 内外部数据分类
  const scopeStats = {
    internal: dataSources.filter(d => d.sourceType === '内部系统' || d.sourceType === '内部').length,
    external: dataSources.filter(d => d.sourceType === '行业报告' || d.sourceType === '平台API' || d.sourceType === '官方数据' || d.sourceType === '实时采集').length,
    hybrid: dataSources.filter(d => d.sourceType === '混合' || d.sourceType === 'AI模型' || d.sourceType === '专家评估').length,
    crawl: dataSources.filter(d => d.sourceType === '爬虫' || d.sourceType === '定性').length,
  };
  // R18: 数据缺口优先级分级
  const gapPriority = {
    p0: dataSources.filter(d => d.gap.startsWith('❌')).length,
    p1: dataSources.filter(d => d.gap.startsWith('⚠️')).length,
    p2: dataSources.filter(d => d.gap !== '' && !d.gap.startsWith('❌') && !d.gap.startsWith('⚠️')).length,
    ok: dataSources.filter(d => d.gap === '').length,
  };

  const stats = {
    total: dataSources.length,
    a: dataSources.filter(d => d.reliability === 'A').length,
    b: dataSources.filter(d => d.reliability === 'B').length,
    c: dataSources.filter(d => d.reliability === 'C').length,
    d: dataSources.filter(d => d.reliability === 'D').length,
    critical: gapPriority.p0,
    medium: gapPriority.p1,
    clean: gapPriority.ok,
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5856d6] to-[#34c759] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#1d1d1f]">数据来源管理</h1>
              <p className="text-xs text-[#86868b]">{stats.total}条数据溯源 · {stats.a}A级 · {stats.critical}关键缺口 · 5套测算模型</p>
            </div>
          </div>
        </div>

        {/* R19: 内外部数据分布 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: '内部数据源', value: scopeStats.internal, color: '#34c759', icon: '内', desc: 'CRM/ERP/内部系统' },
            { label: '外部数据源', value: scopeStats.external, color: '#5856d6', icon: '外', desc: '研报/API/官方' },
            { label: '混合/AI', value: scopeStats.hybrid, color: '#ff9500', icon: '混', desc: '内外融合/AI模型' },
            { label: '爬虫/定性', value: scopeStats.crawl, color: '#86868b', icon: '爬', desc: '需关注合规性' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: s.color }}>{s.icon}</div>
                <span className="text-xs text-[#86868b]">{s.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}<span className="text-sm text-[#B5AFA8] ml-1">条</span></p>
              <p className="text-[10px] text-[#86868b]">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* R20: 数据缺口优先级看板 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'P0 关键缺口', value: gapPriority.p0, color: '#ff3b30', desc: '需立即补充真实数据' },
            { label: 'P1 关注缺口', value: gapPriority.p1, color: '#ff9500', desc: '建议近期改善' },
            { label: 'P2 一般缺口', value: gapPriority.p2, color: '#5856d6', desc: '纳入计划' },
            { label: '数据完整', value: gapPriority.ok, color: '#34c759', desc: '无需操作' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE6DF]">
              <span className="text-xs text-[#86868b]">{s.label}</span>
              <p className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[#86868b]">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'A级（高可信）', value: stats.a, color: '#34c759', sub: '机构报告/官方/内部' },
            { label: 'B级（中可信）', value: stats.b, color: '#5856d6', sub: '平台API/新闻' },
            { label: 'C级（需谨慎）', value: stats.c, color: '#ff9500', sub: '内部测算/评估' },
            { label: 'D级（示例）', value: stats.d, color: '#ff3b30', sub: '需替换真实数据' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-[#86868b]">{s.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[#86868b]">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { id: 'sources', label: '数据溯源', icon: Database },
            { id: 'divergence', label: '机构差异', icon: AlertTriangle },
            { id: 'models', label: '测算模型', icon: BarChart3 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-[#C25B6E] text-white' : 'bg-white text-[#86868b] border border-[#EDE6DF]'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: 数据溯源 */}
        {activeTab === 'sources' && (
          <>
            {/* 缺口警示 */}
            {stats.critical > 0 && (
              <div className="bg-[#ff3b30]/5 border border-[#ff3b30]/15 rounded-2xl p-4 mb-6 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-[#ff3b30] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#ff3b30]">发现 {stats.critical} 个关键数据缺口</p>
                  <p className="text-xs text-[#86868b] mt-1">{dataSources.filter(d => d.gap.startsWith('❌')).map(d => d.metric).join('、')} 需要立即补充真实数据</p>
                </div>
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {modules.map(m => (
                <button key={m} onClick={() => setFilterModule(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterModule === m ? 'bg-[#5856d6] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5]'}`}>{m}</button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#EDE6DF] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#EDE6DF] bg-[#FAF8F6]">
                      {['ID', '模块/页面', '数据指标', '来源机构', '类型', '年份', '可信度', '数据缺口', '补全动作'].map((h, i) => (
                        <th key={i} className="py-3 px-3 text-[10px] text-[#86868b] font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(ds => (
                      <tr key={ds.id} className="border-b border-[#EDE6DF]/50 table-row-hover">
                        <td className="py-2.5 px-3 text-[10px] text-[#B5AFA8] font-mono">{ds.id}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-xs font-medium text-[#1d1d1f] truncate">{ds.module}</span>
                          <span className="text-[10px] text-[#B5AFA8] ml-1">{ds.page}</span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-[#1d1d1f]">{ds.metric}</td>
                        <td className="py-2.5 px-3">
                          {ds.url ? (
                            <a href={ds.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#5856d6] hover:underline">
                              {ds.source} <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-[#86868b]">{ds.source}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{ds.sourceType}</span></td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{ds.year}</td>
                        <td className="py-2.5 px-3">
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: relColors[ds.reliability] }}>{ds.reliability}</span>
                            <span className="text-[10px] text-[#86868b]">{relLabels[ds.reliability]}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {ds.gap ? (
                            <span className={`text-[10px] ${ds.gap.startsWith('❌') ? 'text-[#ff3b30]' : ds.gap.startsWith('⚠️') ? 'text-[#ff9500]' : 'text-[#86868b]'}`}>{ds.gap}</span>
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-[#34c759]" />
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-[#86868b]">{ds.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: 机构差异 */}
        {activeTab === 'divergence' && (
          <div className="space-y-6">
            <div className="bg-[#ff9500]/5 border border-[#ff9500]/15 rounded-2xl p-4 flex items-start gap-4">
              <Info className="w-5 h-5 text-[#ff9500] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#ff9500]">关键发现：同一市场估算差异高达3倍</p>
                <p className="text-xs text-[#86868b] mt-1">2026年全球吸奶器市场，4家机构估算从$11.6亿到$38.1亿不等。差异源于各机构对"吸奶器市场"的定义范围不同——从仅电动设备到喂养护完整生态。</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">4家机构市场规模估算对比</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#EDE6DF]">
                      {['机构', '2025年', '2026年', '预测值', 'CAGR', '统计范围', '可信度', '采用'].map((h, i) => (
                        <th key={i} className="py-2.5 px-3 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {divergenceData.map((d, i) => (
                      <tr key={i} className={`border-b border-[#EDE6DF]/50 ${d.adopted ? 'bg-[#C25B6E]/[0.03]' : ''}`}>
                        <td className="py-2.5 px-3 text-xs font-medium text-[#1d1d1f] truncate">{d.institution}</td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{d.value2025}</td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{d.value2026}</td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{d.forecast}</td>
                        <td className="py-2.5 px-3 text-xs font-medium text-[#C25B6E]">{d.cagr}</td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{d.scope}</td>
                        <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded text-[10px] bg-[#34c759]/10 text-[#34c759]">{d.reliability}</span></td>
                        <td className="py-2.5 px-3">{d.adopted ? <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#C25B6E] text-white font-medium">已采用</span> : <span className="text-[10px] text-[#B5AFA8]">参考</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Momcozy采用 Precedence Research 口径说明</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: '范围匹配度最高', desc: 'Precedence的"全品类+周边"定义最贴近Momcozy实际业务（吸奶器+哺乳文胸+配件+清洁电器）', color: '#34c759' },
                  { title: '时效性最强', desc: '2026年4月最新发布，覆盖2021-2035年完整周期，含COVID后市场反弹数据', color: '#5856d6' },
                  { title: 'CAGR一致性', desc: '8.52% CAGR与穿戴式细分市场17%+增速、电商渠道12%+增速趋势一致', color: '#C25B6E' },
                ].map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] border-l-3" style={{ borderLeft: `3px solid ${r.color}` }}>
                    <p className="text-xs font-medium" style={{ color: r.color }}>{r.title}</p>
                    <p className="text-[10px] text-[#B5AFA8] mt-1.5 leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: 测算模型 */}
        {activeTab === 'models' && (
          <div className="space-y-4">
            {calcModels.map((model, i) => {
              const IconComp = model.icon;
              return (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FBF8F5] flex items-center justify-center flex-shrink-0">
                      <IconComp className="w-5 h-5 text-[#C25B6E]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[#1d1d1f]">{model.name}</h3>
                        <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded">{model.desc}</span>
                      </div>
                      <p className="text-xs text-[#86868b] leading-relaxed truncate mb-2">{model.method}</p>
                      <p className="text-[10px] text-[#B5AFA8]">来源：{model.source}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 海关数据专题 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#C25B6E]" /> 海关HS编码体系（2025-2026最新）
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-[#EDE6DF]">
                    {['国家/地区', 'HS编码', '描述', '最惠国关税', '301关税', '备注'].map((h, i) => (
                      <th key={i} className="py-2 px-3 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[
                      { country: '美国', code: '9018.90.7500', desc: 'Medical instruments', mfn: '2.7%', s301: '+25%', note: 'Section 301豁免至2026' },
                      { country: '中国', code: '9018.90.1000', desc: '医疗器械', mfn: '4%', s301: '—', note: 'Medical device rules' },
                      { country: '欧盟', code: '9018 90 84', desc: 'Instruments & appliances', mfn: '0%', s301: '—', note: '原产地规则下常为0%' },
                      { country: 'WCO通用', code: '9018.11', desc: 'Breast pumps', mfn: '—', s301: '—', note: '6位通用码' },
                      { country: 'WCO通用', code: '9018.90', desc: 'Other medical instruments', mfn: '—', s301: '—', note: '6位通用码' },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-[#EDE6DF]/50 table-row-hover">
                        <td className="py-2 px-3 text-xs font-medium text-[#1d1d1f] truncate">{row.country}</td>
                        <td className="py-2 px-3"><code className="text-[10px] bg-[#FBF8F5] px-1.5 py-0.5 rounded text-[#af52de]">{row.code}</code></td>
                        <td className="py-2 px-3 text-xs text-[#86868b]">{row.desc}</td>
                        <td className="py-2 px-3 text-xs text-[#34c759]">{row.mfn}</td>
                        <td className="py-2 px-3 text-xs text-[#ff3b30]">{row.s301}</td>
                        <td className="py-2 px-3 text-[10px] text-[#86868b]">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-[#B5AFA8] mt-2">数据来源：USITC HTS 2025 / WCO HS Nomenclature 2022 (valid through 2026) / FreightAmigo 2026-03</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
