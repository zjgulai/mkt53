import { useState } from 'react';
import { Database, ExternalLink, AlertTriangle, CheckCircle, Info, Shield, TrendingUp, BarChart3, Globe, Users, Target } from 'lucide-react';
import { DataSourceRegistryStatus } from '@/components/DataSourceRegistryStatus';
import { getVerificationStatusMeta, type SourceRegistryItem } from '@/data/source-registry';
import { useDataSourceRegistry } from '@/hooks/useDataSourceRegistry';
import { usePeriodicManifest } from '@/hooks/usePeriodicManifest';

// ═══════════════════════════════════════════════════════════════════
// 数据来源管理页面 — 企业级数据溯源与质量管控
// 10轮深度盘点产出：全站24条数据来源 · 4级可信度 · 8个缺口 · 5套测算模型
// ═══════════════════════════════════════════════════════════════════

type DataSource = SourceRegistryItem;

type DataSourceTabId = 'sources' | 'divergence' | 'models';
type FactDisplayFilter = 'all' | 'displayable' | 'gated' | 'private';

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
  { institution: 'Coherent Market Insights', value2025: '待补证', value2026: '待补证', forecast: '待补证', cagr: '待补证', scope: '候选来源，需条目级证据绑定', reliability: 'B', evidenceStatus: '候选' },
  { institution: 'Grand View Research', value2025: '上层TAM另页展示', value2026: '上层TAM另页展示', forecast: '上层TAM另页展示', cagr: '上层TAM另页展示', scope: '婴童用品上层TAM，不与吸奶器品类TAM直接混排', reliability: 'A', evidenceStatus: 'ds-044', sourceIds: ['ds-044'] },
  { institution: 'Precedence Research', value2025: '$35.1亿', value2026: '$38.1亿', forecast: '$79.5亿(2035)', cagr: '8.52%', scope: '全球吸奶器品类TAM', reliability: 'A', adopted: true, evidenceStatus: 'ds-001', sourceIds: ['ds-001'] },
  { institution: 'Mordor Intelligence', value2025: '$36.2亿', value2026: '$39.3亿', forecast: '$59.1亿(2031)', cagr: '8.49%', scope: '全球吸奶器品类TAM与五力模型输入，不作为机构五力评分', reliability: 'A', evidenceStatus: 'ds-004/ds-005', sourceIds: ['ds-004', 'ds-005'] },
];

// 测算模型说明
const calcModels = [
  { name: '市场层级/TAM边界', icon: BarChart3, desc: '份额分母与可服务市场边界', method: '全球婴童用品=上层TAM；全球吸奶器=品类TAM；穿戴式吸奶器=细分TAM。SAM需叠加地域/渠道/SKU/合规可服务范围，SOM需Momcozy可获份额假设。', source: '公开报告交叉验证 + 内部服务范围待补', sourceIds: ['ds-001', 'ds-044', 'ds-045'] },
  { name: '波特五力', icon: Target, desc: '行业竞争强度框架', method: '五力维度框架；Mordor、Precedence、Fortune公开报告只支撑模型输入，评分必须标为Momcozy内部解释性模型。', source: '公开报告交叉验证 + 内部模型', sourceIds: ['ds-004'] },
  { name: 'PEST官方来源矩阵', icon: Globe, desc: '政策、监管和公共健康语境', method: 'FDA吸奶器监管、DOL Pump at Work、CDC breastfeeding data、WHO infant feeding 分别支撑监管、劳动政策、公共健康和全球建议语境。', source: 'FDA / DOL / CDC / WHO', sourceIds: ['ds-003'] },
  { name: '品类拆分/TAM口径', icon: TrendingUp, desc: '吸奶器品类TAM与segment-TAM', method: 'Mordor、Precedence、Fortune交叉验证公开报告口径；本批只支撑TAM/segment-TAM，SAM需叠加地域、渠道、SKU和合规可服务范围。', source: '公开报告交叉验证', sourceIds: ['ds-005'] },
  { name: 'RFM分层', icon: Users, desc: '用户价值分层模型', method: 'R(最近购买)×F(频次)×M(金额) → 分层用户分群；需CRM连接器或授权快照后展示真实分层。', source: 'Momcozy CRM系统待接入', sourceIds: ['ds-012'] },
];

// 可信度颜色
const relColors = { A: '#34c759', B: '#5856d6', C: '#ff9500', D: '#ff3b30' };
const relLabels = { A: '高可信度', B: '中等可信度', C: '需谨慎', D: '示例数据' };

function getDisplaySourceName(source: DataSource) {
  if (source.verificationStatus !== 'verified' && source.sourceName.includes('实时采集')) {
    return source.sourceName.replace('实时采集', '连接器待接入');
  }

  return source.sourceName;
}

function getDisplaySourceType(source: DataSource) {
  if (source.sourceType === '实时采集') return '连接器待接入';

  if (source.verificationStatus !== 'verified' && source.sourceName.includes('Amazon') && ['平台API', '平台数据'].includes(source.sourceType)) {
    return '连接器待接入';
  }

  return source.sourceType;
}

function getPrivacyLevel(source: DataSource) {
  return source.privacyLevel;
}

function getEvidenceGrade(source: DataSource) {
  return source.evidenceGrade;
}

function getCanDisplayAsFact(source: DataSource) {
  return source.canDisplayAsFact;
}

function getBlockingReason(source: DataSource) {
  return source.blockingReason;
}

export default function DataSourcePage() {
  const [activeTab, setActiveTab] = useState<DataSourceTabId>('sources');
  const [filterModule, setFilterModule] = useState('全部');
  const [factFilter, setFactFilter] = useState<FactDisplayFilter>('all');
  const sourceRegistryState = useDataSourceRegistry();
  const dataSources: DataSource[] = sourceRegistryState.sources;
  const {
    manifest: collectionManifest,
    path: collectionManifestPath,
    status: collectionStatus,
    totals: collectionTotals,
    period: collectionPeriod,
    generatedAtText: collectionGeneratedAt,
    windowText: collectionWindow,
    nextScheduleText,
  } = usePeriodicManifest();

  const modules = ['全部', ...Array.from(new Set(dataSources.map(d => d.module)))];
  const moduleFiltered = filterModule === '全部' ? dataSources : dataSources.filter(d => d.module === filterModule);
  const filtered = moduleFiltered.filter((source) => {
    if (factFilter === 'displayable') return getCanDisplayAsFact(source);
    if (factFilter === 'gated') return !getCanDisplayAsFact(source);
    if (factFilter === 'private') return getPrivacyLevel(source) === 'private/internal';
    return true;
  });

  // R17: 内外部数据分类
  const scopeStats = {
    internal: dataSources.filter(d => d.sourceType === '内部系统' || d.sourceType === '内部').length,
    external: dataSources.filter(d => d.sourceType === '行业报告' || d.sourceType === '平台API' || d.sourceType === '官方数据' || d.sourceType === '实时采集').length,
    hybrid: dataSources.filter(d => d.sourceType === '混合' || d.sourceType === 'AI模型' || d.sourceType === '专家评估').length,
    crawl: dataSources.filter(d => d.sourceType === '爬虫' || d.sourceType === '定性').length,
  };
  // R18: 数据缺口优先级分级
  const gapPriority = {
    p0: dataSources.filter(d => d.verificationStatus === 'example').length,
    p1: dataSources.filter(d => d.verificationStatus === 'needs-review').length,
    p2: dataSources.filter(d => d.gap !== '' && d.verificationStatus === 'verified').length,
    ok: dataSources.filter(d => d.gap === '' && d.verificationStatus === 'verified').length,
  };

  const stats = {
    total: dataSources.length,
    a: dataSources.filter(d => d.reliability === 'A').length,
    b: dataSources.filter(d => d.reliability === 'B').length,
    c: dataSources.filter(d => d.reliability === 'C').length,
    d: dataSources.filter(d => d.reliability === 'D').length,
    critical: gapPriority.p0,
    needsReview: dataSources.filter(d => d.verificationStatus === 'needs-review').length,
    verified: dataSources.filter(d => d.verificationStatus === 'verified').length,
    displayable: dataSources.filter(getCanDisplayAsFact).length,
    gated: dataSources.filter(d => !getCanDisplayAsFact(d)).length,
    privateInternal: dataSources.filter(d => getPrivacyLevel(d) === 'private/internal').length,
  };
  const requestErrorTotal = (collectionTotals['source-error'] ?? 0) + (collectionTotals['fetch-error'] ?? 0);
  const connectorRequiredTotal = collectionTotals['connector-required'] ?? collectionManifest?.connectorBacklog?.total ?? 0;
  const sourceTaskQueue = collectionManifest?.sourceTaskQueue;
  const sourceTaskCounts = sourceTaskQueue?.queueTypeCounts ?? {};
  const sourceTaskTotal = sourceTaskQueue?.total ?? connectorRequiredTotal + (collectionTotals['manual-required'] ?? 0);
  const sourceTaskQueuePath = collectionManifestPath.replace('latest.json', 'source-tasks.json');
  const publicEvidence = collectionManifest?.publicEvidence;
  const publicEvidenceCaptured = publicEvidence?.captureStatusCounts?.captured ?? 0;
  const publicEvidenceTotal = publicEvidence?.total ?? 0;
  const publicEvidencePath = collectionManifestPath.replace('latest.json', 'public-evidence-samples.json');
  const collectionSummary =
    collectionStatus === 'ready'
      ? `${collectionPeriod} · ${collectionWindow} · 生成 ${collectionGeneratedAt}`
      : collectionStatus === 'loading'
        ? '正在读取半月采集状态'
        : '未生成 public/periodic-data/latest.json';
  const sourceCountSummary = sourceRegistryState.status === 'ready'
    ? `${stats.total}条数据溯源 · ${stats.a}A级 · ${stats.needsReview}条待复核`
    : sourceRegistryState.status === 'empty'
      ? '0条数据溯源 · API 空结果'
      : '来源数据未加载 · 统计保持未知';
  const sourceTotalMetric = sourceRegistryState.status === 'ready'
    ? sourceRegistryState.runtime.mode === 'api'
      ? stats.total
      : collectionTotals.total ?? stats.total
    : '-';
  const verifiedSourceMetric = sourceRegistryState.status === 'ready'
    ? sourceRegistryState.runtime.mode === 'api'
      ? stats.verified
      : collectionTotals.ok ?? stats.verified
    : '-';

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
              <p className="text-xs text-[#86868b]">{sourceCountSummary} · 半月周期 {collectionStatus === 'ready' ? collectionPeriod : '读取中'}</p>
            </div>
          </div>
        </div>

        <DataSourceRegistryStatus {...sourceRegistryState} />

        {/* 半月数据状态 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[#5856d6]/10 flex items-center justify-center">
              {collectionStatus === 'ready' ? <CheckCircle className="w-4 h-4 text-[#34c759]" /> : <AlertTriangle className="w-4 h-4 text-[#ff9500]" />}
            </div>
            <div className="min-w-[260px]">
              <p className="text-xs font-semibold text-[#1d1d1f]">半月数据状态</p>
              <p className="text-[10px] text-[#86868b]">{collectionSummary}</p>
              {collectionStatus === 'ready' ? <p className="text-[10px] text-[#B5AFA8]">{nextScheduleText}</p> : null}
            </div>
            {[
              { label: '来源总数', value: sourceTotalMetric, color: '#1d1d1f' },
              { label: '公开/本地可验证', value: verifiedSourceMetric, color: '#34c759' },
              { label: '连接器待接入', value: connectorRequiredTotal, color: '#ff9500' },
              { label: '人工补录', value: collectionTotals['manual-required'] ?? 0, color: '#5856d6' },
              { label: '请求异常', value: requestErrorTotal, color: '#ff3b30' },
            ].map(item => (
              <div key={item.label} className="px-3 py-2 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF] min-w-[112px]">
                <p className="text-[10px] text-[#86868b]">{item.label}</p>
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
            <a href={collectionManifestPath} className="ml-auto text-[10px] font-medium text-[#5856d6] hover:text-[#C25B6E] transition-colors">
              查看manifest
            </a>
          </div>
          <p className="mt-3 text-[10px] text-[#86868b] leading-relaxed">
            服务器出口边界：Fortune BI、Mordor、Mamava/Medela 等外站请求可能返回 403，manifest 保留 source-error，不改写为已验证结论；公开证据样本只保留 URL、摘要、哈希和本地证据路径。
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: '补证任务', value: sourceTaskTotal, color: '#1d1d1f' },
              { label: '连接器接入', value: sourceTaskCounts['connector-readiness'] ?? connectorRequiredTotal, color: '#ff9500' },
              { label: '人工凭证', value: sourceTaskCounts['manual-evidence'] ?? collectionTotals['manual-required'] ?? 0, color: '#5856d6' },
              { label: '公开复核', value: sourceTaskCounts['public-source-review'] ?? 0, color: '#C25B6E' },
              { label: publicEvidence?.mode === 'live-browser-capture' ? '公开证据 live' : '公开证据规划', value: publicEvidenceTotal > 0 ? `${publicEvidenceCaptured}/${publicEvidenceTotal}` : '-', color: publicEvidenceCaptured === publicEvidenceTotal && publicEvidenceTotal > 0 ? '#34c759' : '#ff9500' },
            ].map(item => (
              <div key={item.label} className="px-3 py-2 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                <p className="text-[10px] text-[#86868b]">{item.label}</p>
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
            <div className="grid gap-2">
              <a href={sourceTaskQueuePath} className="px-3 py-2 rounded-xl border border-[#EDE6DF] bg-white text-[10px] font-medium text-[#5856d6] hover:text-[#C25B6E] transition-colors flex items-center justify-center">
                查看补证队列
              </a>
              <a href={publicEvidencePath} className="px-3 py-2 rounded-xl border border-[#EDE6DF] bg-white text-[10px] font-medium text-[#5856d6] hover:text-[#C25B6E] transition-colors flex items-center justify-center">
                查看公开证据
              </a>
            </div>
          </div>
        </div>

        {sourceRegistryState.status === 'ready' && <>
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
            { label: 'P0 示例数据', value: gapPriority.p0, color: '#ff3b30', desc: '不可用于正式结论' },
            { label: 'P1 待复核', value: gapPriority.p1, color: '#ff9500', desc: '需补来源或口径' },
            { label: 'P2 一般缺口', value: gapPriority.p2, color: '#5856d6', desc: '纳入计划' },
            { label: '已复核', value: gapPriority.ok, color: '#34c759', desc: '可作为当前依据' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE6DF]">
              <span className="text-xs text-[#86868b]">{s.label}</span>
              <p className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[#86868b]">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Evidence gate overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: '可展示事实', value: stats.displayable, color: '#34c759', desc: 'public fact或公开复核来源' },
            { label: 'Gated来源', value: stats.gated, color: '#ff9500', desc: '待复核/样例/内部权限' },
            { label: '内部来源', value: stats.privateInternal, color: '#0A84FF', desc: 'ERP/CRM/内部系统' },
            { label: 'Source总数', value: stats.total, color: '#1d1d1f', desc: 'source registry登记项' },
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
        </>}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {([
            { id: 'sources', label: '数据溯源', icon: Database },
            { id: 'divergence', label: '机构差异', icon: AlertTriangle },
            { id: 'models', label: '测算模型', icon: BarChart3 },
          ] satisfies Array<{ id: DataSourceTabId; label: string; icon: typeof Database }>).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-[#C25B6E] text-white' : 'bg-white text-[#86868b] border border-[#EDE6DF]'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: 数据溯源 */}
        {activeTab === 'sources' && sourceRegistryState.status === 'ready' && (
          <>
            {/* 缺口警示 */}
            {stats.critical > 0 && (
              <div className="bg-[#ff3b30]/5 border border-[#ff3b30]/15 rounded-2xl p-4 mb-6 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-[#ff3b30] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#ff3b30]">发现 {stats.critical} 个示例数据源</p>
                  <p className="text-xs text-[#86868b] mt-1">{dataSources.filter(d => d.verificationStatus === 'example').map(d => d.metric).join('、')} 不能作为正式结论，需要接入真实数据或明确标注示例。</p>
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
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {([
                { id: 'all', label: '全部展示状态' },
                { id: 'displayable', label: '可展示事实' },
                { id: 'gated', label: 'Gated/待复核' },
                { id: 'private', label: 'Private/Internal' },
              ] satisfies Array<{ id: FactDisplayFilter; label: string }>).map(item => (
                <button key={item.id} onClick={() => setFactFilter(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${factFilter === item.id ? 'bg-[#0A84FF] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5]'}`}>{item.label}</button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#EDE6DF] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#EDE6DF] bg-[#FAF8F6]">
                      {['ID', '模块/页面', '数据指标', '来源机构', '类型', '年份', '可信度', '复核状态', '隐私层', '证据等级', '展示门禁', '阻断原因', '数据缺口', '补全动作'].map((h, i) => (
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
                          {ds.sourceUrl ? (
                            <a href={ds.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#5856d6] hover:underline">
                              {getDisplaySourceName(ds)} <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-[#86868b]">{getDisplaySourceName(ds)}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{getDisplaySourceType(ds)}</span></td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{ds.year}</td>
                        <td className="py-2.5 px-3">
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: relColors[ds.reliability] }}>{ds.reliability}</span>
                            <span className="text-[10px] text-[#86868b]">{relLabels[ds.reliability]}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {(() => {
                            const status = getVerificationStatusMeta(ds.verificationStatus);
                            return (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                                {status.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getPrivacyLevel(ds) === 'private/internal' ? 'bg-[#0A84FF]/10 text-[#0A84FF]' : 'bg-[#34c759]/10 text-[#34c759]'}`}>
                            {getPrivacyLevel(ds)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#1d1d1f]">{getEvidenceGrade(ds)}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          {getCanDisplayAsFact(ds) ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#34c759]/10 text-[#34c759]">可展示事实</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#ff9500]/10 text-[#a85f00]">gated</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-[#86868b]">{getBlockingReason(ds)}</td>
                        <td className="py-2.5 px-3">
                          {ds.gap ? (
                            <span className={`text-[10px] ${ds.verificationStatus === 'example' ? 'text-[#ff3b30]' : ds.verificationStatus === 'needs-review' ? 'text-[#ff9500]' : 'text-[#86868b]'}`}>{ds.gap}</span>
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
                <p className="text-sm font-medium text-[#ff9500]">关键发现：机构口径需先分层再对比</p>
                <p className="text-xs text-[#86868b] mt-1">当前页面只把已绑定 source registry 的 Precedence 品类TAM作为采用口径；其他机构先作为候选来源或上层TAM线索，补齐条目级证据后再进入精确对比。</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">机构市场口径治理对比</h3>
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
                        <td className="py-2.5 px-3">{d.adopted ? <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#C25B6E] text-white font-medium">已采用</span> : <span className="text-[10px] text-[#B5AFA8]">{d.evidenceStatus}</span>}</td>
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
                  { title: '口径边界清晰', desc: 'Precedence当前只用于全球吸奶器品类TAM；SAM仍需地域、渠道、SKU和合规可服务范围证据。', color: '#34c759', sourceIds: ['ds-001'] },
                  { title: '时效性已登记', desc: '2026年4月发布周期和2021-2035年预测窗口已登记在source registry，页面按品类TAM展示。', color: '#5856d6', sourceIds: ['ds-001'] },
                  { title: '增长率分层展示', desc: '吸奶器品类CAGR 8.52%来自ds-001；穿戴式细分CAGR 15.08%来自ds-045，二者不合并为SAM。', color: '#C25B6E', sourceIds: ['ds-001', 'ds-045'] },
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
                <Globe className="w-4 h-4 text-[#C25B6E]" /> 海关HS编码体系（查询入口）
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-[#EDE6DF]">
                    {['国家/地区', 'HS编码', '描述', '税率状态', '附加税状态', '备注'].map((h, i) => (
                      <th key={i} className="py-2 px-3 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[
                      { country: '美国', code: '9018.90.7500', desc: 'Medical instruments', mfn: '待USITC当期页复核', s301: '需逐批次核验', note: '不展示固定税率' },
                      { country: '中国', code: '9018.90.1000', desc: '医疗器械', mfn: '待海关税则复核', s301: '不适用', note: '以报关凭证为准' },
                      { country: '欧盟', code: '9018 90 84', desc: 'Instruments & appliances', mfn: '待TARIC当期页复核', s301: '不适用', note: '需结合原产地规则' },
                      { country: 'WCO通用', code: '9018.11', desc: 'Breast pumps', mfn: '分类码线索', s301: '不适用', note: '6位通用码' },
                      { country: 'WCO通用', code: '9018.90', desc: 'Other medical instruments', mfn: '分类码线索', s301: '不适用', note: '6位通用码' },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-[#EDE6DF]/50 table-row-hover">
                        <td className="py-2 px-3 text-xs font-medium text-[#1d1d1f] truncate">{row.country}</td>
                        <td className="py-2 px-3"><code className="text-[10px] bg-[#FBF8F5] px-1.5 py-0.5 rounded text-[#af52de]">{row.code}</code></td>
                        <td className="py-2 px-3 text-xs text-[#86868b]">{row.desc}</td>
                        <td className="py-2 px-3 text-xs text-[#34c759]">{row.mfn}</td>
                        <td className="py-2 px-3 text-xs text-[#ff9500]">{row.s301}</td>
                        <td className="py-2 px-3 text-[10px] text-[#86868b]">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-[#B5AFA8] mt-2">数据来源：WCO/USITC/TARIC等官方入口待条目级复核；当前仅展示编码线索，不作为最终税率。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
