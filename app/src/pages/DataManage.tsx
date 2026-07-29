import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router';
import { Database, Table, ChevronRight, ChevronDown, BarChart3, Users, Sparkles, Link2, AlertCircle, CheckCircle, Info, ShieldCheck, Download, Lock, Globe, HardDrive, Search, Layers, RefreshCw, FileText, BookOpen } from 'lucide-react';
import { usePeriodicManifest } from '@/hooks/usePeriodicManifest';
import { dataModules } from '@/features/data-manage/catalog';
import { changeHistory, dataLineage, tableGovernance } from '@/features/data-manage/governance';
import { classifySource, layerMeta, type DataGovernance, type DataLayer, type SourceScope } from '@/features/data-manage/model';
import { exportToCsv } from '@/utils/csvExport';

const OperationsManual = lazy(() => import('@/components/OperationsManual'));

// ═══════════════════════════════════════════════════════════════════
// 数据管理页面 — Momcozy市场洞察工作台全站数据资产目录
// 原则：MECE（Mutually Exclusive, Collectively Exhaustive）
// 七大模块 · 全站数据表 · 完整字段说明 · 数据血缘关系
// ═══════════════════════════════════════════════════════════════════

// Static catalog and governance datasets are split into independently budgeted chunks.



export default function DataManage() {
  const [activeModule, setActiveModule] = useState('mkt');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['t_mkt_size']));
  const [showLineage, setShowLineage] = useState(false);
  // R7: 数据治理视图切换
  const [governanceView, setGovernanceView] = useState<'tables' | 'layers' | 'governance' | 'manual'>('tables');
  const [scopeFilter, setScopeFilter] = useState<SourceScope | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    manifest: collectionManifest,
    path: collectionManifestPath,
    status: collectionManifestStatus,
    totals: collectionTotals,
    period: collectionPeriod,
    generatedAtText: collectionGeneratedAt,
    windowText: collectionWindow,
    nextScheduleText: nextSchedule,
  } = usePeriodicManifest();

  const toggleTable = (id: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const navigate = useNavigate();
  const currentModule = dataModules.find(m => m.id === activeModule)!;
  const totalTables = dataModules.reduce((s, m) => s + m.tables.length, 0);
  const totalFields = dataModules.reduce((s, m) => s + m.tables.reduce((ts, t) => ts + t.fields.length, 0), 0);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5856d6] to-[#af52de] flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#1d1d1f]">数据管理</h1>
              <p className="text-xs text-[#86868b]">{totalTables}张数据表 · {totalFields}个字段 · 6大模块 · MECE原则组织</p>
            </div>
            <button onClick={() => navigate('/data-source')} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5856d6] to-[#34c759] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
              <ShieldCheck className="w-4 h-4" />数据来源管理
            </button>
          </div>
        </div>

        {/* R24: 批量导出工具栏 */}
        <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF] mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#86868b] font-medium">批量导出：</span>
          <button onClick={() => exportToCsv(
            dataModules.flatMap(m => m.tables).flatMap(t => t.fields.map(f => ({ module: dataModules.find(m => m.tables.includes(t))?.name || '', table: t.name, tableId: t.id, field: f.name, type: f.type, desc: f.desc, source: f.source, required: f.required ? '是' : '否' }))),
            { module: '模块', table: '表名', tableId: '表ID', field: '字段', type: '类型', desc: '说明', source: '数据来源', required: '必填' },
            '全站数据字典_' + new Date().toISOString().slice(0, 10)
          )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all border border-[#EDE6DF]"><Download className="w-3.5 h-3.5" />全站数据字典</button>
          <button onClick={() => exportToCsv(
            dataModules.flatMap(m => m.tables.map(t => ({ module: m.name, tableId: t.id, tableName: t.name, desc: t.desc, fieldCount: t.fields.length, updateFreq: t.updateFreq, upstream: (t.upstream || []).join(', '), downstream: (t.downstream || []).join(', ') }))),
            { module: '模块', tableId: '表ID', tableName: '表名', desc: '描述', fieldCount: '字段数', updateFreq: '更新频率', upstream: '上游', downstream: '下游' },
            '数据表清单_' + new Date().toISOString().slice(0, 10)
          )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all border border-[#EDE6DF]"><Download className="w-3.5 h-3.5" />数据表清单</button>
          <button onClick={() => exportToCsv(
            Object.entries(tableGovernance).map(([tid, g]) => {
              const t = dataModules.flatMap(m => m.tables).find(t => t.id === tid);
              return { tableId: tid, tableName: t?.name || '', ...g, upstream: (t?.upstream || []).join(', '), downstream: (t?.downstream || []).join(', ') };
            }),
            { tableId: '表ID', tableName: '表名', layer: '分层', scope: '范围', sensitivity: '敏感度', qualityScore: '质量分', status: '状态', owner: 'Owner', steward: 'Steward', freshness: '刷新状态', pii: 'PII', retention: '保留', upstream: '上游', downstream: '下游' },
            '数据治理报告_' + new Date().toISOString().slice(0, 10)
          )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all border border-[#EDE6DF]"><Download className="w-3.5 h-3.5" />治理报告</button>
        </div>

        {/* 半月采集刷新状态 */}
        <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
              {collectionManifestStatus === 'ready' ? <CheckCircle className="w-4 h-4 text-[#34c759]" /> : <AlertCircle className="w-4 h-4 text-[#ff9500]" />}
            </div>
            <div className="min-w-[240px]">
              <p className="text-xs font-semibold text-[#1d1d1f]">半月数据采集刷新</p>
              <p className="text-[10px] text-[#86868b]">
                {collectionManifestStatus === 'ready' ? `${collectionPeriod} · ${collectionGeneratedAt}` : collectionManifestStatus === 'loading' ? '正在读取 manifest' : '未生成 public/periodic-data/latest.json'}
              </p>
              {collectionManifestStatus === 'ready' ? <p className="text-[10px] text-[#B5AFA8]">{collectionWindow} · {nextSchedule}</p> : null}
            </div>
            {[
              { label: '公开来源成功', value: collectionTotals.ok ?? 0, color: '#34c759' },
              { label: '连接器待接入', value: collectionTotals['connector-required'] ?? 0, color: '#ff9500' },
              { label: '人工补录', value: collectionTotals['manual-required'] ?? 0, color: '#5856d6' },
              { label: '请求异常', value: (collectionTotals['source-error'] ?? 0) + (collectionTotals['fetch-error'] ?? 0), color: '#ff3b30' },
              { label: '未绑定registry页面', value: collectionManifest?.auditSummary?.pagesWithStaticDataWithoutRegistry ?? 0, color: '#C25B6E' },
            ].map((item) => (
              <div key={item.label} className="px-3 py-2 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF] min-w-[112px]">
                <p className="text-[10px] text-[#86868b]">{item.label}</p>
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
            <a href={collectionManifestPath} className="ml-auto text-[10px] font-medium text-[#5856d6] hover:text-[#C25B6E] transition-colors">
              查看manifest
            </a>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '数据表总数', value: String(totalTables), color: '#C25B6E' },
            { label: '字段总数', value: String(totalFields), color: '#ff9500' },
            { label: '模块数', value: '6', color: '#34c759' },
            { label: '数据血缘', value: String(dataLineage.length), color: '#5856d6' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
              <p className="text-xs text-[#86868b] mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* R8: 增强版Module Tabs + 数据治理视图切换 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {dataModules.map(mod => {
            const IconComp = mod.icon;
            return (
              <button key={mod.id} onClick={() => { setActiveModule(mod.id); setGovernanceView('tables'); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeModule === mod.id && governanceView === 'tables' ? 'text-white shadow-sm' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200'}`}
                style={activeModule === mod.id && governanceView === 'tables' ? { backgroundColor: mod.color, boxShadow: `0 3px 10px ${mod.color}30` } : {}}>
                <IconComp className="w-4 h-4" />
                {mod.name}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeModule === mod.id && governanceView === 'tables' ? 'bg-white/20 text-white' : 'bg-[#FBF8F5] text-[#86868b]'}`}>{mod.tables.length}表</span>
              </button>
            );
          })}
          <button onClick={() => { setGovernanceView('layers'); setShowLineage(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${governanceView === 'layers' ? 'bg-[#5856d6] text-white shadow-sm' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5]'}`}>
            <Layers className="w-4 h-4" />
            分层架构
          </button>
          <button onClick={() => { setGovernanceView('governance'); setShowLineage(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${governanceView === 'governance' ? 'bg-[#af52de] text-white shadow-sm' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5]'}`}>
            <ShieldCheck className="w-4 h-4" />
            数据治理
          </button>
          <button onClick={() => { setGovernanceView('manual'); setShowLineage(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${governanceView === 'manual' ? 'bg-[#C25B6E] text-white shadow-sm' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5]'}`}>
            <BookOpen className="w-4 h-4" />
            操作手册
          </button>
          <button onClick={() => { setShowLineage(!showLineage); setGovernanceView('tables'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${showLineage ? 'bg-[#ff3b30] text-white shadow-sm' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5]'}`}>
            <Link2 className="w-4 h-4" />
            数据血缘
          </button>
        </div>

        {/* R9: 搜索+范围过滤工具栏 */}
        {governanceView !== 'tables' && governanceView !== 'manual' && (
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white border border-[#EDE6DF]">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-[#B5AFA8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索数据表、字段、Owner..."
                className="flex-1 min-w-0 text-sm bg-transparent outline-none text-[#1d1d1f] placeholder-[#B5AFA8]"
              />
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'internal', 'external', 'hybrid'] as const).map(s => (
                <button key={s} onClick={() => setScopeFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${scopeFilter === s ? 'bg-[#C25B6E] text-white' : 'bg-[#FBF8F5] text-[#86868b] hover:bg-[#F5EDE8]'}`}>
                  {s === 'all' ? '全部' : s === 'internal' ? '内部' : s === 'external' ? '外部' : '混合'}
                </button>
              ))}
            </div>
            <button onClick={() => exportToCsv(
              Object.entries(tableGovernance).map(([k, v]) => ({ tableId: k, ...v })),
              { tableId: '表ID', layer: '分层', scope: '范围', sensitivity: '敏感度', status: '治理状态', owner: 'Owner', qualityScore: '质量分', freshness: '刷新状态' },
              '数据治理清单_' + new Date().toISOString().slice(0, 10)
            )} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all">
              <Download className="w-3 h-3" />导出
            </button>
          </div>
        )}

        {/* R11-R13: 增强数据血缘关系图谱 — 交互式+路径追踪 */}
        {showLineage && (
          <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF] mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#ff3b30]" /> 数据血缘关系图
              </h2>
              <span className="text-[10px] text-[#86868b] bg-[#FBF8F5] px-2 py-1 rounded-lg">{dataLineage.length}条血缘链路 · 点击节点追踪路径</span>
            </div>
            {/* 外部数据源入口层 */}
            <div className="mb-4 p-3 rounded-xl bg-[#5856d6]/5 border border-[#5856d6]/10">
              <p className="text-[10px] text-[#5856d6] font-semibold mb-2">外部数据源入口</p>
              <div className="flex flex-wrap gap-2">
                {['Amazon.com API', 'Grand View Research', '各国海关', 'WIPO/USPTO', '政府网站', '社媒API'].map((s, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg bg-white text-[10px] text-[#5856d6] border border-[#5856d6]/20">{s}</span>
                ))}
              </div>
            </div>
            {/* 血缘链路可视化 */}
            <div className="space-y-2 mb-4">
              {dataLineage.map((line, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors cursor-pointer group">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: line.type === '外部导入' ? '#5856d620' : line.type === 'AI分析' ? '#af52de20' : '#C25B6E20', color: line.type === '外部导入' ? '#5856d6' : line.type === 'AI分析' ? '#af52de' : '#C25B6E' }}>{line.type}</span>
                  <span className="text-xs font-medium text-[#86868b] bg-white px-2 py-1 rounded-lg flex-shrink-0">{line.from}</span>
                  <div className="flex-1 min-w-0 h-px bg-gradient-to-r from-[#B5AFA8] to-[#C25B6E] group-hover:h-0.5 transition-all" />
                  <ChevronRight className="w-3 h-3 text-[#C25B6E] flex-shrink-0" />
                  <span className="text-xs font-medium text-[#1d1d1f] truncate bg-white px-2 py-1 rounded-lg flex-shrink-0">{line.to}</span>
                </div>
              ))}
            </div>
            {/* 内部分析应用出口层 */}
            <div className="mb-4 p-3 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
              <p className="text-[10px] text-[#C25B6E] font-semibold mb-2">内部分析应用出口</p>
              <div className="flex flex-wrap gap-2">
                {['dashboard_kpi', 'product_analysis', 'comment_analysis_ai', 'ai-assistant'].map((s, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg bg-white text-[10px] text-[#C25B6E] border border-[#C25B6E]/20">{s}</span>
                ))}
              </div>
            </div>
            {/* R13: 血缘路径说明 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* audit-source: ds-001 ds-002 ds-044 ds-045 ds-046 ds-027 */}
              <div className="p-3 rounded-xl bg-[#ff3b30]/5 border border-[#ff3b30]/10">
                <p className="text-[10px] text-[#ff3b30] font-semibold mb-1">关键路径：市场规模测算</p>
                <p className="text-[10px] text-[#86868b]">外部研报 → market_size_global → market_trend_monthly → dashboard_kpi<br/>此路径影响首页KPI和市场层级/份额分母展示，优先级P0</p>
              </div>
              {/* audit-source: ds-007 ds-009 ds-010 */}
              <div className="p-3 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/10">
                <p className="text-[10px] text-[#ff9500] font-semibold mb-1">关键路径：竞品情报</p>
                <p className="text-[10px] text-[#86868b]">Amazon API → competitor_products → price_analysis + new_product_tracker<br/>此路径影响竞品库和价格监测，优先级P0；采集任务、时间戳和平台授权待复核。</p>
              </div>
            </div>
          </div>
        )}

        {/* R10a: 数据分层架构视图 */}
        {governanceView === 'layers' && (
          <div className="space-y-6">
            {/* 4层架构可视化 */}
            <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
              <h2 className="text-sm font-semibold text-[#1d1d1f] mb-5 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#5856d6]" /> 数据分层架构 — 从采集到应用的全链路
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(['source', 'clean', 'store', 'app'] as DataLayer[]).map((layer, li) => {
                  const meta = layerMeta[layer];
                  const tablesInLayer = Object.entries(tableGovernance).filter(([, g]) => g.layer === layer);
                  return (
                    <div key={layer} className="rounded-xl border-2 p-4" style={{ borderColor: `${meta.color}30`, backgroundColor: `${meta.color}08` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                          <span style={{ color: meta.color }}>
                            {layer === 'source' ? <Globe className="w-4 h-4" /> : layer === 'clean' ? <Sparkles className="w-4 h-4" /> : layer === 'store' ? <HardDrive className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</p>
                          <p className="text-[10px] text-[#86868b]">{tablesInLayer.length}张表</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#86868b] mb-3 leading-relaxed">{meta.desc}</p>
                      <div className="space-y-1.5">
                        {tablesInLayer.slice(0, 5).map(([tid, tg]) => {
                          const tname = dataModules.flatMap(m => m.tables).find(t => t.id === tid)?.name || tid;
                          return (
                            <div key={tid} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/60">
                              <Table className="w-3 h-3 text-[#B5AFA8]" />
                              <span className="text-[10px] text-[#1d1d1f] truncate">{tname}</span>
                              <span className={`ml-auto px-1 py-0.5 rounded text-[8px] font-medium ${tg.scope === 'internal' ? 'bg-[#34c759]/10 text-[#34c759]' : tg.scope === 'external' ? 'bg-[#5856d6]/10 text-[#5856d6]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{tg.scope === 'internal' ? '内' : tg.scope === 'external' ? '外' : '混'}</span>
                            </div>
                          );
                        })}
                        {tablesInLayer.length > 5 && <p className="text-[9px] text-[#B5AFA8] text-center">+{tablesInLayer.length - 5} more</p>}
                      </div>
                      {li < 3 && <div className="hidden md:flex justify-center mt-2"><ChevronRight className="w-4 h-4 text-[#B5AFA8] rotate-90 md:rotate-0" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 内外部数据分布 */}
            <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#5856d6]" /> 内外部数据分布
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {(['internal', 'external', 'hybrid'] as SourceScope[]).map(scope => {
                  const info = classifySource(scope);
                  const count = Object.values(tableGovernance).filter(g => g.layer !== undefined && g.scope === scope).length;
                  const avgScore = Math.round(Object.values(tableGovernance).filter(g => g.scope === scope).reduce((s, g) => s + g.qualityScore, 0) / (count || 1));
                  return (
                    <div key={scope} className="p-4 rounded-xl border" style={{ borderColor: `${info.color}30`, backgroundColor: info.bg }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                        <span className="text-xs font-semibold" style={{ color: info.color }}>{info.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-[#1d1d1f]">{count}<span className="text-sm text-[#86868b] ml-1">张表</span></p>
                      <p className="text-[10px] text-[#86868b] mt-1">{info.desc}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[10px] text-[#86868b]">平均质量分</span>
                        <div className="flex-1 min-w-0 h-1.5 rounded-full bg-white/60 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${avgScore}%`, backgroundColor: avgScore >= 85 ? '#34c759' : avgScore >= 70 ? '#ff9500' : '#ff3b30' }} />
                        </div>
                        <span className="text-[10px] font-medium" style={{ color: avgScore >= 85 ? '#34c759' : avgScore >= 70 ? '#ff9500' : '#ff3b30' }}>{avgScore}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* R10b: 数据治理视图 */}
        {governanceView === 'governance' && (
          <div className="space-y-6">
            {/* 治理评分总览 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '已治理表', value: Object.values(tableGovernance).filter(g => g.status === 'governed').length, total: Object.keys(tableGovernance).length, color: '#34c759' },
                { label: '待治理表', value: Object.values(tableGovernance).filter(g => g.status === 'pending').length, total: Object.keys(tableGovernance).length, color: '#ff9500' },
                { label: '未追踪表', value: Object.values(tableGovernance).filter(g => g.status === 'untracked').length, total: Object.keys(tableGovernance).length, color: '#ff3b30' },
                { label: '平均质量分', value: Math.round(Object.values(tableGovernance).reduce((s, g) => s + g.qualityScore, 0) / Object.keys(tableGovernance).length), total: 100, color: '#5856d6', suffix: '/100' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <p className="text-xs text-[#86868b] mb-1">{s.label}</p>
                  <div className="flex items-end gap-1">
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <span className="text-xs text-[#B5AFA8] mb-1">{s.suffix || `/ ${s.total}`}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[#FBF8F5] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(s.value / s.total) * 100}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
            {/* R14-R15: 数据质量趋势监控 */}
            <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#34c759]" /> 数据质量评分分布
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { range: '90-100', label: '优秀', color: '#34c759', count: Object.values(tableGovernance).filter(g => g.qualityScore >= 90).length },
                  { range: '80-89', label: '良好', color: '#5856d6', count: Object.values(tableGovernance).filter(g => g.qualityScore >= 80 && g.qualityScore < 90).length },
                  { range: '70-79', label: '一般', color: '#ff9500', count: Object.values(tableGovernance).filter(g => g.qualityScore >= 70 && g.qualityScore < 80).length },
                  { range: '60-69', label: '待改善', color: '#ff3b30', count: Object.values(tableGovernance).filter(g => g.qualityScore >= 60 && g.qualityScore < 70).length },
                  { range: '<60', label: '危险', color: '#86868b', count: Object.values(tableGovernance).filter(g => g.qualityScore < 60).length },
                ].map((s, i) => (
                  <div key={i} className="p-3 rounded-xl border text-center" style={{ borderColor: `${s.color}30`, backgroundColor: `${s.color}08` }}>
                    <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
                    <p className="text-[10px] text-[#86868b]">{s.range} · {s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* R26: 敏感度分布 + Owner工作量 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-[#ff3b30]" /> 数据敏感度分布</h4>
                <div className="space-y-2">
                  {[
                    { level: 'L1-公开', color: '#34c759', count: Object.values(tableGovernance).filter(g => g.sensitivity === 'L1-公开').length },
                    { level: 'L2-内部', color: '#5856d6', count: Object.values(tableGovernance).filter(g => g.sensitivity === 'L2-内部').length },
                    { level: 'L3-机密', color: '#ff9500', count: Object.values(tableGovernance).filter(g => g.sensitivity === 'L3-机密').length },
                    { level: 'L4-绝密', color: '#ff3b30', count: Object.values(tableGovernance).filter(g => g.sensitivity === 'L4-绝密').length },
                  ].map(s => (
                    <div key={s.level} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#86868b] w-16">{s.level}</span>
                      <div className="flex-1 min-w-0 h-2 rounded-full bg-[#FBF8F5] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(s.count / Object.keys(tableGovernance).length) * 100}%`, backgroundColor: s.color }} />
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: s.color }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#5856d6]" /> Owner工作量</h4>
                <div className="space-y-1.5">
                  {Object.entries(Object.values(tableGovernance).reduce((acc, g) => {
                      const k = g.owner;
                      if (!acc[k]) acc[k] = [];
                      acc[k].push(g);
                      return acc;
                    }, {} as Record<string, DataGovernance[]>)).sort(([, a], [, b]) => b.length - a.length).slice(0, 6).map(([owner, tables]) => {
                    const avgScore = Math.round(tables.reduce((s, g) => s + g.qualityScore, 0) / (tables.length || 1));
                    return (
                      <div key={owner} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#86868b] w-16 truncate">{owner}</span>
                        <span className="text-[10px] text-[#C25B6E] font-medium w-6">{tables.length}表</span>
                        <div className="flex-1 min-w-0 h-1.5 rounded-full bg-[#FBF8F5] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${avgScore}%`, backgroundColor: avgScore >= 85 ? '#34c759' : '#ff9500' }} />
                        </div>
                        <span className="text-[9px] text-[#B5AFA8]">{avgScore}分</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* 治理详情表 */}
            <div className="bg-white rounded-2xl card-shadow-sm border border-[#EDE6DF] overflow-hidden">
              <div className="p-4 border-b border-[#EDE6DF] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#af52de]" /> 数据治理清单
                </h3>
                <span className="text-[10px] text-[#86868b]">{Object.keys(tableGovernance).length}张表 · 5维度评估</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#EDE6DF] bg-[#FAF8F6]">
                      {['数据表', '分层', '范围', '敏感度', '质量分', 'Owner', 'Steward', '状态', '刷新状态', 'PII', '保留策略'].map((h, i) => (
                        <th key={i} className="py-2.5 px-3 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(tableGovernance)
                      .filter(([tid, g]) => {
                        if (scopeFilter !== 'all' && g.scope !== scopeFilter) return false;
                        if (searchQuery) {
                          const tname = dataModules.flatMap(m => m.tables).find(t => t.id === tid)?.name || tid;
                          return tname.toLowerCase().includes(searchQuery.toLowerCase()) || g.owner.includes(searchQuery) || tid.toLowerCase().includes(searchQuery.toLowerCase());
                        }
                        return true;
                      })
                      .sort(([, a], [, b]) => b.qualityScore - a.qualityScore)
                      .map(([tid, g]) => {
                        const tname = dataModules.flatMap(m => m.tables).find(t => t.id === tid)?.name || tid;
                        return (
                          <tr key={tid} className="border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors">
                            <td className="py-2 px-3">
                              <span className="text-xs font-medium text-[#1d1d1f] truncate">{tname}</span>
                              <span className="text-[9px] text-[#B5AFA8] ml-1 font-mono">{tid}</span>
                            </td>
                            <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: `${layerMeta[g.layer].color}15`, color: layerMeta[g.layer].color }}>{layerMeta[g.layer].label}</span></td>
                            <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${g.scope === 'internal' ? 'bg-[#34c759]/10 text-[#34c759]' : g.scope === 'external' ? 'bg-[#5856d6]/10 text-[#5856d6]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{g.scope === 'internal' ? '内部' : g.scope === 'external' ? '外部' : '混合'}</span></td>
                            <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${g.sensitivity === 'L1-公开' ? 'bg-[#34c759]/10 text-[#34c759]' : g.sensitivity === 'L2-内部' ? 'bg-[#5856d6]/10 text-[#5856d6]' : g.sensitivity === 'L3-机密' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>{g.sensitivity}</span></td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-10 h-1.5 rounded-full bg-[#FBF8F5] overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${g.qualityScore}%`, backgroundColor: g.qualityScore >= 85 ? '#34c759' : g.qualityScore >= 70 ? '#ff9500' : '#ff3b30' }} />
                                </div>
                                <span className="text-[10px] font-medium text-[#1d1d1f] truncate">{g.qualityScore}</span>
                              </div>
                            </td>
	                            <td className="py-2 px-3 text-[10px] text-[#86868b]">{g.owner}</td>
	                            <td className="py-2 px-3 text-[10px] text-[#86868b]">{g.steward}</td>
	                            <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${g.status === 'governed' ? 'bg-[#34c759]/10 text-[#34c759]' : g.status === 'pending' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>{g.status === 'governed' ? '已治理' : g.status === 'pending' ? '待治理' : '未追踪'}</span></td>
	                            <td className="py-2 px-3"><span className="inline-flex max-w-[120px] truncate rounded bg-[#FBF8F5] px-1.5 py-0.5 text-[9px] font-medium text-[#6E625D]" title={g.freshness}>{g.freshness}</span></td>
	                            <td className="py-2 px-3">{g.pii ? <Lock className="w-3.5 h-3.5 text-[#ff3b30]" /> : <span className="text-[10px] text-[#B5AFA8]">-</span>}</td>
                            <td className="py-2 px-3 text-[10px] text-[#86868b]">{g.retention}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {/* R23: 样例治理记录 */}
              <div className="mt-4 p-4 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#5856d6]" /> 样例治理记录</h4>
                  <span className="text-[9px] text-[#86868b]">{changeHistory.length}条记录 · 非真实刷新日志</span>
                </div>
                <div className="space-y-2">
                  {changeHistory.slice(0, 6).map((ch, i) => {
                    const tname = dataModules.flatMap(m => m.tables).find(t => t.id === ch.tableId)?.name || ch.tableId;
                    return (
                      <div key={i} className="flex items-center gap-3 text-[10px]">
                        <span className="text-[#B5AFA8] w-20 flex-shrink-0">{ch.date}</span>
                        <span className={`px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${ch.action === '更新' ? 'bg-[#C25B6E]/10 text-[#C25B6E]' : ch.action === '采集' ? 'bg-[#34c759]/10 text-[#34c759]' : ch.action === '异常' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : 'bg-[#5856d6]/10 text-[#5856d6]'}`}>{ch.action}</span>
                        <span className="text-[#1d1d1f] font-medium truncate">{tname}</span>
                        <span className="text-[#86868b] truncate flex-1">{ch.desc}</span>
                        <span className="text-[#B5AFA8] flex-shrink-0">{ch.user}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* R50: 操作手册与业务价值中心 */}
        {governanceView === 'manual' && !showLineage && (
          <Suspense fallback={<div className="rounded-2xl border border-[#EDE6DF] bg-white p-6 text-sm text-[#86868b]">正在加载操作手册…</div>}>
            <OperationsManual />
          </Suspense>
        )}

        {/* Module Detail */}
        {governanceView === 'tables' && !showLineage && (
          <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
            <div className="flex items-center gap-2 mb-1">
              <currentModule.icon className="w-4 h-4" style={{ color: currentModule.color }} />
              <h2 className="text-sm font-semibold text-[#1d1d1f]">{currentModule.name}</h2>
              <span className="text-[10px] text-[#86868B] bg-[#FBF8F5] px-2 py-0.5 rounded-full">{currentModule.tables.length}张表 · {currentModule.tables.reduce((s, t) => s + t.fields.length, 0)}个字段</span>
            </div>
            <p className="text-xs text-[#86868b] mb-5">{currentModule.desc}</p>

            {/* Tables */}
            <div className="space-y-4">
              {currentModule.tables.map(table => {
                const isExpanded = expandedTables.has(table.id);
                return (
                  <div key={table.id} className="border border-[#EDE6DF] rounded-xl overflow-hidden">
                    {/* R25: 表头部 + 导出 */}
                    <div className="w-full flex items-center gap-4 p-4 bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200 text-left">
                      <button onClick={() => toggleTable(table.id)} className="flex flex-1 min-w-0 items-center gap-4 text-left">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[#86868b] flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#86868b] flex-shrink-0" />}
                        <Table className="w-4 h-4 text-[#C25B6E] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#1d1d1f]">{table.name}</span>
                            <span className="text-[10px] text-[#86868b] bg-white px-1.5 py-0.5 rounded">{table.fields.length}字段</span>
                            <span className="text-[10px] text-[#C25B6E] bg-[#C25B6E]/10 px-1.5 py-0.5 rounded">{table.updateFreq}更新</span>
                          </div>
                          <p className="text-xs text-[#86868b] mt-0.5">{table.desc}</p>
                        </div>
                      </button>
                      <button onClick={e => { e.stopPropagation(); exportToCsv(table.fields.map(f => ({ name: f.name, type: f.type, desc: f.desc, source: f.source, required: f.required ? '是' : '否' })), { name: '字段名', type: '数据类型', desc: '说明', source: '数据来源', required: '必填' }, table.name + '_' + new Date().toISOString().slice(0, 10)); }} className="flex items-center gap-1 px-2 py-1 rounded bg-white text-[9px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all flex-shrink-0"><Download className="w-3 h-3" />导出</button>
                      {table.upstream && table.upstream.length > 0 && (
                        <div className="hidden md:flex items-center gap-1 text-[10px] text-[#86868b]">
                          <Info className="w-3 h-3" />
                          上游：{table.upstream.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Table Fields */}
                    {isExpanded && (
                      <div className="p-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-[#EDE6DF] table-row-hover">
                                {['字段名', '数据类型', '字段说明', '数据来源', '必填'].map((h, i) => (
                                  <th key={i} className="py-2 px-3 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.fields.map((field, fi) => (
                                <tr key={fi} className="border-b border-[#EDE6DF]/50 hover:bg-[#FBF8F5] transition-colors duration-200 duration-200">
                                  <td className="py-2 px-3 text-xs font-medium text-[#1d1d1f] truncate">{field.name}</td>
                                  <td className="py-2 px-3"><code className="text-[10px] bg-[#FBF8F5] px-1.5 py-0.5 rounded text-[#af52de]">{field.type}</code></td>
                                  <td className="py-2 px-3 text-xs text-[#86868b]">{field.desc}</td>
                                  <td className="py-2 px-3 text-xs text-[#86868b]">{field.source}</td>
                                  <td className="py-2 px-3">
                                    {field.required ? (
                                      <span className="flex items-center gap-1 text-[10px] text-[#ff3b30]"><AlertCircle className="w-3 h-3" />必填</span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-[10px] text-[#86868b]"><CheckCircle className="w-3 h-3" />可选</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Upstream/Downstream */}
                        <div className="flex items-center gap-4 mt-3 text-[10px]">
                          {table.upstream && table.upstream.length > 0 && (
                            <div className="flex items-center gap-1 text-[#86868b]">
                              <Link2 className="w-3 h-3" />
                              上游：{table.upstream.join('、')}
                            </div>
                          )}
                          {table.downstream && table.downstream.length > 0 && (
                            <div className="flex items-center gap-1 text-[#C25B6E]">
                              <Link2 className="w-3 h-3" />
                              下游：{table.downstream.join('、')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MECE说明 */}
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] mt-5">
          {/* audit-source: ds-027 */}
          <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#5856d6]" /> MECE数据架构说明
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#86868b] leading-relaxed truncate">
            <div className="p-3 rounded-xl bg-[#FBF8F5]">
              <p className="font-medium text-[#1d1d1f] truncate mb-1">Mutually Exclusive（相互独立）</p>
              <p>6大模块按业务域严格划分：市场洞察（外部市场环境）↔ 竞争情报（竞争对手）↔ 用户研究（消费者）↔ 行业动态（政策法规/供应链/IP）↔ 品牌自研（Momcozy自身）↔ AI辅助（AI工具链）。每类数据只归属一个模块，避免重复存储。</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FBF8F5]">
              <p className="font-medium text-[#1d1d1f] truncate mb-1">Collectively Exhaustive（完全穷尽）</p>
              <p>{totalTables}张数据表覆盖当前网站核心页面的数据需求。从市场规模和份额分母测算到单条评论的情感分析，从全球政策追踪到AI设计助手的Prompt记录，确保工作台数据持续按当前资产目录校准。</p>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-[#34c759]/5 border border-[#34c759]/10">
            <p className="text-[10px] text-[#34c759] font-medium mb-1">数据接入建议</p>
            <p className="text-[10px] text-[#86868b] leading-relaxed">方式1：数仓直连 — 通过ETL管道将上述数据表对接至Snowflake/BigQuery数仓，设置定时任务同步。方式2：文件上传 — 通过CSV/Excel文件批量导入，适合外部采购的研报数据。方式3：API对接 — Amazon SP-API/海关API/社交媒体API直接对接，实现数据自动化采集。建议优先对接Amazon和CRM系统，这两类数据覆盖面最广、更新频率最高。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
