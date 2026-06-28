import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileText,
  Search,
  ShieldAlert,
} from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import AiReportGovernancePanel from '@/components/AiReportGovernancePanel';
import { reportGenerationQueueRows } from '@/data/ai-report-governance-data';

interface ReportCatalogItem {
  id: string;
  title: string;
  category: string;
  status: '本期推荐' | '补证中' | '目录保留';
  summary: string;
  evidenceState: string;
  blockers: string[];
  tags: string[];
}

const reportCatalog: ReportCatalogItem[] = [
  {
    id: 'r001',
    title: '全球母婴市场宏观洞察报告',
    category: '区域宏观分析',
    status: '补证中',
    summary: '用于承接市场规模、区域宏观和政策环境的报告目录条目；正文结论需重新绑定来源矩阵。',
    evidenceState: '公开报告来源已登记，SAM/SOM服务范围假设待补。',
    blockers: ['报告正文数字需逐条绑定 source_id', '婴童用品与吸奶器份额分母不可混用'],
    tags: ['市场层级', '政策环境', '来源矩阵'],
  },
  {
    id: 'r009',
    title: '全球吸奶器市场竞争格局报告',
    category: '竞品情报',
    status: '本期推荐',
    summary: '用于承接竞品格局、产品线索和价格带分析的报告目录条目；当前只展示补证状态。',
    evidenceState: '报告元数据已登记，平台价格、份额和评分需要采集窗口与SKU映射。',
    blockers: ['Amazon公开页样例不能外推平台份额', '价格和评分需保留采集时间戳'],
    tags: ['竞品格局', '价格线索', '连接器待接入'],
  },
  {
    id: 'r010',
    title: 'Momcozy vs Medela vs Willow 品牌竞争力对比',
    category: '竞品情报',
    status: '目录保留',
    summary: '品牌对比报告入口保留为目录资产；雷达评分和权重需要重新审计。',
    evidenceState: '品牌维度和评分权重尚未完成证据拆分。',
    blockers: ['品牌评分不能展示为机构事实', '需补公开调研或授权面板'],
    tags: ['品牌对比', '评分模型', '待复核'],
  },
  {
    id: 'r013',
    title: 'Momcozy 加热款拆解资料登记',
    category: '拆机报告',
    status: '目录保留',
    summary: '拆机报告入口保留为内部报告目录；BOM和成本数据需内部授权文件支撑。',
    evidenceState: '内部成本、供应商和拆解记录未接入审计凭证。',
    blockers: ['BOM成本不能公开化展示', '供应链数据需授权快照'],
    tags: ['拆机', 'BOM', '内部授权'],
  },
  {
    id: 'r005',
    title: '母婴行业新品上市监测报告',
    category: '新品/技术监测',
    status: '补证中',
    summary: '用于承接新品监测和威胁评估的报告目录条目；发布日期、规格和上市地区需品牌官网交叉验证。',
    evidenceState: '新品线索来源需要逐条补官网、新闻稿或零售页证据。',
    blockers: ['新品参数需条目级URL', '威胁等级属于内部判断'],
    tags: ['新品监测', '官网证据', '威胁评估'],
  },
];

const categories = ['全部', '区域宏观分析', '竞品情报', '新品/技术监测', '拆机报告'];

const categoryMeta: Record<string, { icon: typeof FileText; color: string }> = {
  区域宏观分析: { icon: BarChart3, color: '#5856d6' },
  竞品情报: { icon: ShieldAlert, color: '#C25B6E' },
  '新品/技术监测': { icon: Bell, color: '#ff9500' },
  拆机报告: { icon: ClipboardCheck, color: '#34c759' },
};

export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredReports = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return reportCatalog.filter((report) => {
      const categoryMatched = activeCategory === '全部' || report.category === activeCategory;
      const keywordMatched = !keyword
        || report.title.toLowerCase().includes(keyword)
        || report.tags.some((tag) => tag.toLowerCase().includes(keyword));

      return categoryMatched && keywordMatched;
    });
  }, [activeCategory, searchQuery]);

  const recommendedReports = reportCatalog.filter((report) => report.status === '本期推荐');
  const evidenceQueue = reportCatalog.filter((report) => report.status !== '目录保留');

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#1d1d1f]">报告中心</h1>
                <p className="text-xs text-[#86868b]">报告目录已降级为元数据与补证队列，未复核正文不作为事实导出。</p>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索报告或标签..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]/60 border border-[#EDE6DF] focus:border-[#C25B6E]"
              />
            </div>
          </div>
        </div>

        <PageEvidenceNotice
          sourceIds={['ds-024']}
          title="报告目录元数据口径"
          description="报告目录来自内部管理源，只能证明入口、分类和补证状态。正文中的平台价格、份额、评分、页数、下载量和图表结论必须按各自 source_id 复核后再展示或导出。"
          className="mb-6"
          cadence="报告元数据"
        />

        <div className="mb-6">
          <AiReportGovernancePanel
            title="报告 Batch 4 生成队列 readiness"
            focus="report"
            compact
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
          {[
            { label: '目录条目', value: reportCatalog.length, icon: FileText, color: '#C25B6E' },
            { label: '补证队列', value: evidenceQueue.length, icon: ClipboardCheck, color: '#ff9500' },
            { label: '本期推荐', value: recommendedReports.length, icon: Eye, color: '#34c759' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-[#86868b]">{item.label}</p>
                    <p className="text-2xl font-semibold text-[#1d1d1f]">{item.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[#FBF8F5] rounded-2xl p-4 border border-[#EDE6DF] mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f]">本批报告治理规则</p>
              <p className="text-xs text-[#86868b] mt-1">目录可展示，正文数值必须具备来源、采集窗口、hash或授权快照；样例、待复核和连接器待接入不能导出为事实。</p>
            </div>
            <button
              onClick={() => navigate('/data-source')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-[#C25B6E] border border-[#EDE6DF] hover:bg-[#F5EDE8] transition-colors"
            >
              查看来源登记 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">报告生成队列</h2>
              <p className="text-[10px] text-[#86868b] mt-1">Batch 4 仅登记待补证报告类型，canGenerate=false，canDisplayAsFact=false。</p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">5 个队列项全部阻断</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDE6DF] text-[10px] uppercase text-[#86868b]">
                  <th className="py-2 font-medium">report_id</th>
                  <th className="py-2 font-medium">报告类型</th>
                  <th className="py-2 font-medium">当前状态</th>
                  <th className="py-2 font-medium">source ids</th>
                </tr>
              </thead>
              <tbody>
                {reportGenerationQueueRows.map((row) => (
                  <tr key={row.reportId} className="border-b border-[#F3EEE9]">
                    <td className="py-2 text-[#1d1d1f]">{row.reportId}</td>
                    <td className="py-2 text-[#1d1d1f]">{row.title}</td>
                    <td className="py-2 text-[#a85f00]">{row.status}</td>
                    <td className="py-2 text-[#86868b]">{row.sourceIds.join(' / ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeCategory === category ? 'bg-[#C25B6E] text-white' : 'bg-white text-[#86868b] border border-[#EDE6DF] hover:bg-[#FBF8F5]'}`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredReports.map((report) => {
            const meta = categoryMeta[report.category] || { icon: FileText, color: '#86868b' };
            const Icon = meta.icon;
            return (
              <button
                key={report.id}
                type="button"
                onClick={() => navigate(`/report/${report.id}`)}
                className="w-full text-left bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] hover:border-[#C25B6E]/30 hover:shadow-md transition-all"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded bg-[#FBF8F5] text-[#86868b] text-[10px] font-medium">{report.category}</span>
                      <span className="px-2 py-0.5 rounded bg-[#C25B6E]/10 text-[#C25B6E] text-[10px] font-medium">{report.status}</span>
                    </div>
                    <h2 className="text-base font-semibold text-[#1d1d1f] mb-2">{report.title}</h2>
                    <p className="text-sm text-[#86868b] leading-relaxed mb-3">{report.summary}</p>
                    <div className="rounded-xl bg-[#FBF8F5] border border-[#EDE6DF] p-3 mb-3">
                      <p className="text-[10px] font-semibold text-[#C25B6E] mb-1">证据状态</p>
                      <p className="text-xs text-[#1d1d1f] leading-relaxed">{report.evidenceState}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-[#F5EDE8] text-[#7A6B6B]">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="sm:w-64 flex-shrink-0 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/10 p-3">
                    <p className="text-[10px] font-semibold text-[#ff9500] mb-2">阻断项</p>
                    <div className="space-y-2">
                      {report.blockers.map((blocker) => (
                        <div key={blocker} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#ff9500] flex-shrink-0" />
                          <span className="text-[11px] leading-relaxed text-[#1d1d1f]">{blocker}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
