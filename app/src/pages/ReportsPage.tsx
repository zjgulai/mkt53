import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Download, Eye, Clock, Star, ChevronRight, TrendingUp, Cpu, Globe, BarChart3, Bell } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import { exportToCsv } from '@/utils/csvExport';

interface Report {
  id: string; title: string; category: string; date: string; author: string;
  pages: number; downloads: number; isStarred: boolean; status: string;
  summary: string; tags: string[];
}

// ═══════════════════════════════════════════════════════════════════
// 报告数据库 — 16份行业标准报告 · 4大分类 · 2025-2026
// ═══════════════════════════════════════════════════════════════════
const allReports: Report[] = [
  // 区域宏观分析
  { id: 'r001', title: '2026年Q1全球母婴市场宏观洞察报告', category: '区域宏观分析', date: '2026-05-23', author: '市场研究团队', pages: 68, downloads: 342, isStarred: true, status: '本期推荐', summary: '覆盖北美/欧洲/亚太/中东/拉美5大区域，TAM/SAM/SOM三级市场规模测算，PEST分析+波特五力模型', tags: ['TAM测算', 'PEST', '波特五力'] },
  { id: 'r002', title: '北美母婴护理市场深度分析（2025-2026年度）', category: '区域宏观分析', date: '2026-03-22', author: '北美研究组', pages: 86, downloads: 528, isStarred: true, status: '热门', summary: '美国FDA 510(k)路径分析，Momcozy 38%份额拆解，Medela/Willow竞争策略对标', tags: ['FDA', '份额分析', '竞争对标'] },
  { id: 'r003', title: '亚太区母婴产品消费趋势与政策环境研究', category: '区域宏观分析', date: '2026-02-10', author: '亚太研究组', pages: 72, downloads: 289, isStarred: false, status: '已发布', summary: '中国GB标准/日本PSC/韩国KC认证路径对比，Shopee/Lazada渠道份额分析', tags: ['认证对比', '渠道分析', '政策环境'] },
  { id: 'r004', title: '欧洲MDR法规对母婴医疗器械市场影响评估', category: '区域宏观分析', date: '2026-01-18', author: '欧洲研究组', pages: 54, downloads: 198, isStarred: false, status: '已发布', summary: 'MDR 2017/745过渡期延至2028，CE认证成本增加30%影响分析，Boots/MediaWorld渠道准入', tags: ['MDR', 'CE认证', '渠道准入'] },
  // 新品/技术监测
  { id: 'r005', title: '2026年Q1母婴行业新品上市监测报告', category: '新品/技术监测', date: '2026-04-20', author: '产品监测组', pages: 45, downloads: 456, isStarred: true, status: '本期推荐', summary: '2026年Q1全球15款新品追踪，Momcozy W1加热款/Medela Melody InBra/Willow Sync技术参数对比', tags: ['新品追踪', '技术参数', '发布日历'] },
  { id: 'r006', title: '可穿戴吸奶器技术发展趋势与专利分析（2026）', category: '新品/技术监测', date: '2026-03-08', author: 'IP分析组', pages: 62, downloads: 367, isStarred: false, status: '热门', summary: '加热差异化/AI集成/保险渠道3大技术趋势，520+专利地图分析，技术成熟度曲线', tags: ['专利地图', '技术趋势', 'S曲线'] },
  { id: 'r007', title: 'AI智能控制在母婴产品中的应用前景研究', category: '新品/技术监测', date: '2026-02-25', author: '技术研究组', pages: 48, downloads: 245, isStarred: false, status: '已发布', summary: 'APP数据分析/远程控制/智能提醒3大应用场景，BM08 AI监视器技术架构解析', tags: ['AI应用', '智能控制', '技术架构'] },
  { id: 'r008', title: 'UV-C LED消毒技术在家用母婴电器中的创新应用', category: '新品/技术监测', date: '2026-01-30', author: '技术研究组', pages: 38, downloads: 178, isStarred: false, status: '已发布', summary: 'KleanPal Pro UV消毒技术深度解析，vs蒸汽消毒/化学消毒对比实验数据', tags: ['UV消毒', '对比实验', '创新应用'] },
  // 竞品情报
  { id: 'r009', title: '2026年Q1全球吸奶器市场竞争格局报告', category: '竞品情报', date: '2026-04-12', author: '竞争分析组', pages: 78, downloads: 623, isStarred: true, status: '本期推荐', summary: '8大品牌25款产品公开页样例与待采集任务复核，价格带竞争地图，BCG矩阵分析', tags: ['竞争格局', '价格地图', 'BCG矩阵'] },
  { id: 'r010', title: 'Momcozy vs Medela vs Willow 品牌竞争力深度对比', category: '竞品情报', date: '2026-05-23', author: '竞争分析组', pages: 92, downloads: 891, isStarred: true, status: '热门', summary: '8维度雷达对比：品牌知名度/产品满意度/技术创新/价格竞争力/渠道覆盖/社媒影响力/信任度/生态完整性', tags: ['品牌雷达', '8维对比', 'SWOT'] },
  { id: 'r011', title: '2026 Q1 竞品动态监测与价格策略分析', category: '竞品情报', date: '2026-02-20', author: '价格监测组', pages: 56, downloads: 334, isStarred: false, status: '已发布', summary: 'Prime Day/Brand Day/Black Friday促销日历，套装定价策略，ASP趋势对比', tags: ['价格策略', '促销日历', 'ASP趋势'] },
  { id: 'r012', title: 'Willow Sync上市对穿戴式吸奶器市场影响评估', category: '竞品情报', date: '2026-01-25', author: '竞争分析组', pages: 42, downloads: 267, isStarred: false, status: '已发布', summary: 'Willow Sync AI助手Ema技术解析，保险独家渠道策略，对Momcozy威胁评估', tags: ['Willow', 'AI助手', '威胁评估'] },
  // 拆机报告
  { id: 'r013', title: 'Momcozy W1 加热款穿戴式吸奶器拆解与BOM成本分析', category: '拆机报告', date: '2026-05-23', author: '拆解分析组', pages: 52, downloads: 445, isStarred: true, status: '本期推荐', summary: '内置加热膜/隔膜泵/主控芯片3大核心模块拆解，BOM成本$38.6，vs eufy HeatFlow/Medela FluidFeel对标', tags: ['BOM成本', '核心模块', '对标分析'] },
  { id: 'r014', title: 'Medela Melody InBra 超静音吸奶器拆机技术解析', category: '拆机报告', date: '2026-03-28', author: '拆解分析组', pages: 48, downloads: 312, isStarred: false, status: '热门', summary: 'FluidFeel Technology核心揭秘，36dB静音方案，隔膜泵结构分析', tags: ['FluidFeel', '静音方案', '隔膜泵'] },
  { id: 'r015', title: 'eufy S1 Pro HeatFlow 内部结构拆解与电机技术分析', category: '拆机报告', date: '2026-02-15', author: '拆解分析组', pages: 44, downloads: 198, isStarred: false, status: '已发布', summary: 'HeatFlow温热技术架构，Anker供应链优势，电机效率对比测试', tags: ['HeatFlow', '供应链', '电机效率'] },
  { id: 'r016', title: 'Haakaa Gen.2 Plus 硅胶手动吸奶器材料与工艺分析', category: '拆机报告', date: '2026-01-20', author: '材料分析组', pages: 32, downloads: 156, isStarred: false, status: '已发布', summary: '100%食品级硅胶材料测试，Multi-Ring ComfortCARE工艺解析，$14.5定价策略拆解', tags: ['硅胶材料', '工艺解析', '定价拆解'] },
];

const categoryIcons: Record<string, typeof Globe> = {
  '区域宏观分析': Globe,
  '新品/技术监测': Cpu,
  '竞品情报': BarChart3,
  '拆机报告': FileText,
};

const categoryColors: Record<string, string> = {
  '区域宏观分析': '#5856d6',
  '新品/技术监测': '#ff9500',
  '竞品情报': '#C25B6E',
  '拆机报告': '#34c759',
};

export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const navigate = useNavigate();

  const categories = ['全部', '区域宏观分析', '新品/技术监测', '竞品情报', '拆机报告'];

  const filtered = useMemo(() => {
    let result = allReports;
    if (activeCategory !== '全部') result = result.filter(r => r.category === activeCategory);
    if (searchQuery) result = result.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.tags.some(t => t.includes(searchQuery)));
    if (sortBy === 'date') result = [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sortBy === 'downloads') result = [...result].sort((a, b) => b.downloads - a.downloads);
    if (sortBy === 'pages') result = [...result].sort((a, b) => b.pages - a.pages);
    return result;
  }, [activeCategory, searchQuery, sortBy]);

  const starredCount = allReports.filter(r => r.isStarred).length;
  const totalDownloads = allReports.reduce((s, r) => s + r.downloads, 0);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#1d1d1f]">报告中心</h1>
                <p className="text-xs text-[#86868b]">{allReports.length}份报告 · 4大分类 · {totalDownloads.toLocaleString()}次下载</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索报告或标签..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]/60 border border-[#EDE6DF] focus:border-[#C25B6E]" />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none border border-[#EDE6DF] cursor-pointer">
                <option value="date">按日期</option>
                <option value="downloads">按下载量</option>
                <option value="pages">按页数</option>
              </select>
            </div>
          </div>
        </div>

        <PageEvidenceNotice
          sourceIds={['ds-024']}
          title="报告目录元数据口径"
          description="报告日期表示报告发布或入库日期，不等于当前半月数据刷新时间。报告正文中的平台价格、份额和采集类结论仍需按各自来源补采集窗口与复核状态。"
          className="mb-6"
          cadence="报告元数据"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '报告总数', value: String(allReports.length), icon: <FileText className="w-4 h-4" />, color: '#C25B6E' },
            { label: '收藏报告', value: String(starredCount), icon: <Star className="w-4 h-4" />, color: '#ff9500' },
            { label: '总下载量', value: `${(totalDownloads / 1000).toFixed(1)}K`, icon: <Download className="w-4 h-4" />, color: '#34c759' },
            { label: '本期推荐', value: '4', icon: <TrendingUp className="w-4 h-4" />, color: '#5856d6' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                <span className="text-xs text-[#86868b]">{s.label}</span>
              </div>
              <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* R26: 本期必读TOP3 */}
        <div className="bg-gradient-to-r from-[#C25B6E]/5 to-[#FBF8F5] rounded-2xl p-5 card-shadow-sm border border-[#C25B6E]/15 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-[#C25B6E] fill-[#C25B6E]" />
            <h3 className="text-sm font-semibold text-[#C25B6E]">本期必读 TOP3</h3>
            <span className="text-[10px] text-[#86868b] bg-white/60 px-2 py-0.5 rounded-full ml-auto">编辑精选</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'r010', title: 'Momcozy vs Medela vs Willow 品牌竞争力深度对比', category: '竞品情报', value: '战略决策必读：8维雷达+SWOT+价格地图，CEO/产品负责人必读', pages: 92, downloads: 891 },
              { id: 'r009', title: '2026年Q1全球吸奶器市场竞争格局报告', category: '竞品情报', value: '市场全景：8品牌25款产品公开页样例与待采集任务，市场团队季度规划参考', pages: 78, downloads: 623 },
              { id: 'r013', title: 'Momcozy W1 加热款拆解与BOM成本分析', category: '拆机报告', value: '产品深度：BOM $38.6，供应链团队成本优化参考', pages: 52, downloads: 445 },
            ].map((r, i) => (
              <div key={r.id} className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF] cursor-pointer hover:border-[#C25B6E]/30 transition-all" onClick={() => navigate(`/report/${r.id}`)}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#C25B6E] text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-[10px] text-[#86868b]">{r.category}</span>
                </div>
                <p className="text-xs font-medium text-[#1d1d1f] truncate mb-1">{r.title}</p>
                <p className="text-[10px] text-[#C25B6E] leading-relaxed mb-2">{r.value}</p>
                <div className="flex items-center gap-2 text-[9px] text-[#B5AFA8]">
                  <span>{r.pages}页</span><span>·</span><span>{r.downloads}次下载</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* R29: 推荐阅读顺序 */}
        <div className="flex flex-col gap-2 mb-6 p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF] sm:flex-row sm:items-center sm:gap-3">
          <span className="text-[10px] text-[#86868b] font-medium">推荐阅读路径：</span>
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-[#5856d6]/10 text-[#5856d6]">区域宏观</span>
            <ChevronRight className="w-3 h-3 text-[#B5AFA8]" />
            <span className="px-2 py-0.5 rounded bg-[#C25B6E]/10 text-[#C25B6E]">竞品情报</span>
            <ChevronRight className="w-3 h-3 text-[#B5AFA8]" />
            <span className="px-2 py-0.5 rounded bg-[#ff9500]/10 text-[#ff9500]">新品监测</span>
            <ChevronRight className="w-3 h-3 text-[#B5AFA8]" />
            <span className="px-2 py-0.5 rounded bg-[#34c759]/10 text-[#34c759]">拆机报告</span>
          </div>
          <span className="text-[9px] text-[#B5AFA8] sm:ml-auto">由广到深 · 先市场后产品</span>
        </div>

        {/* R28: 报告应用场景说明 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Globe, label: '区域宏观', desc: '市场进入、区域优先级、TAM/SAM测算', color: '#5856d6' },
            { icon: BarChart3, label: '竞品情报', desc: '竞争策略、价格对标、份额分析', color: '#C25B6E' },
            { icon: Cpu, label: '新品监测', desc: '产品规划、技术趋势、威胁预警', color: '#ff9500' },
            { icon: FileText, label: '拆机报告', desc: '成本优化、BOM分析、供应链谈判', color: '#34c759' },
          ].map((s, i) => {
            const IconComp = s.icon;
            return (
              <div key={i} className="p-3 rounded-xl bg-white border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium text-[#1d1d1f] truncate">{s.label}</span>
                </div>
                <p className="text-[10px] text-[#86868b]">{s.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={() => exportToCsv(filtered, { title: "报告标题", category: "分类", date: "日期", author: "作者", pages: "页数", downloads: "下载量" }, "报告列表_" + new Date().toISOString().slice(0, 10))} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all border border-[#EDE6DF]"><Download className="w-3.5 h-3.5"/>导出CSV</button>
        </div>
        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeCategory === cat ? 'bg-[#C25B6E] text-white' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Report List */}
        <div className="space-y-4">
          {filtered.map(report => {
            const IconComp = categoryIcons[report.category] || FileText;
            const color = categoryColors[report.category] || '#86868b';
            return (
              <div key={report.id} onClick={() => navigate(`/report/${report.id}`)}
                className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] hover:border-[#C25B6E]/20 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15`, color }}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[#1d1d1f] group-hover:text-[#C25B6E] transition-colors duration-200">{report.title}</h3>
                      {report.status === '本期推荐' && <span className="px-1.5 py-0.5 rounded bg-[#ff3b30]/10 text-[#ff3b30] text-[10px] font-medium">推荐</span>}
                      {report.status === '热门' && <span className="px-1.5 py-0.5 rounded bg-[#ff9500]/10 text-[#ff9500] text-[10px] font-medium">HOT</span>}
                      {report.isStarred && <Star className="w-3.5 h-3.5 text-[#ff9500] fill-[#ff9500]" />}
                    </div>
                    <p className="text-xs text-[#86868b] mb-2 line-clamp-2">{report.summary}</p>
                    {/* R27: 业务价值标签 */}
                    <div className="mb-2 p-1.5 rounded-lg bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                      <span className="text-[9px] text-[#C25B6E] font-medium">业务价值：</span>
                      <span className="text-[9px] text-[#1d1d1f]">{report.summary.split('，')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {report.tags.map((tag, t) => (
                        <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#86868b] sm:flex-shrink-0 sm:gap-4">
                    <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{report.date}</div>
                    <div className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{report.pages}页</div>
                    <div className="flex items-center gap-1"><Download className="w-3.5 h-3.5" />{report.downloads}</div>
                    <div className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />预览</div>
                    <ChevronRight className="w-4 h-4 text-[#86868b] group-hover:text-[#C25B6E]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* R30: 报告订阅提示 */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#C25B6E]/5 to-[#FBF8F5] border border-[#C25B6E]/15 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-10 h-10 rounded-xl bg-[#C25B6E]/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-[#C25B6E]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#1d1d1f] truncate">订阅报告更新</p>
            <p className="text-[10px] text-[#86868b]">半月精选2-3份报告线索推送，覆盖竞品动态、政策变化、技术趋势</p>
          </div>
          <button className="w-full px-4 py-2 rounded-xl bg-[#C25B6E] text-white text-xs font-medium hover:bg-[#A34759] transition-colors duration-200 sm:w-auto">立即订阅</button>
        </div>
      </div>
    </div>
  );
}
