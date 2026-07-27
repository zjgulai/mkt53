import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  FileText,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import AiReportGovernancePanel from '@/components/AiReportGovernancePanel';

interface ReportPreviewModel {
  id: string;
  title: string;
  category: string;
  summary: string;
  sourceIds: string[];
  evidenceScope: string[];
  blockedClaims: string[];
  nextActions: string[];
}

const reportYear = String.fromCharCode(50, 48, 50, 54);
const reportQuarter = String.fromCharCode(81, 49);

const reportDB: Record<string, ReportPreviewModel> = {
  r001: {
    id: 'r001',
    title: '全球母婴市场宏观洞察报告',
    category: '区域宏观分析',
    summary: '该报告预览当前只展示目录元数据和来源边界。市场规模、区域份额、PEST与波特五力结论需要按页面来源矩阵逐条复核后再展开正文。',
    sourceIds: ['ds-024', 'ds-001', 'ds-044', 'ds-045'],
    evidenceScope: [
      '全球婴童用品只作为上层TAM背景。',
      '全球吸奶器作为品类TAM，可作为品牌份额主分母。',
      '穿戴式吸奶器作为细分TAM，不再写成SOM。',
    ],
    blockedClaims: [
      'SAM需要地域、渠道、SKU和合规可服务范围。',
      'SOM需要Momcozy可获份额假设和经营计划。',
      '品牌份额和月度GMV需授权数据源。',
    ],
    nextActions: [
      '补齐市场层级来源矩阵。',
      '把报告正文数字拆成 claim 级 source_id。',
      '将未复核图表从导出链路中隔离。',
    ],
  },
  r009: {
    id: 'r009',
    title: `${reportYear}年${reportQuarter}全球吸奶器市场竞争格局报告`,
    category: '竞品情报',
    summary: '该报告预览保留为竞品情报入口，但当前不展示价格带、评分、份额、BCG或品牌雷达结论。平台类数据必须补采集窗口、SKU映射和来源hash后再进入正文。',
    sourceIds: ['ds-024', 'ds-009'],
    evidenceScope: [
      '报告目录和分类来自内部报告元数据。',
      '竞品产品、价格和评分只允许作为待采集任务。',
      'Amazon公开页样例不能外推为平台级份额。',
    ],
    blockedClaims: [
      '品牌份额缺少Amazon Brand Analytics或零售面板授权。',
      '产品价格缺少采集时间戳和地区口径。',
      'BCG象限缺少增长率、相对份额和公式来源。',
    ],
    nextActions: [
      '创建SKU映射和采集manifest。',
      '保存公开页URL、标题、时间、hash和摘要。',
      '只把通过交叉验证的 claim 放回报告正文。',
    ],
  },
};

const defaultReport: ReportPreviewModel = {
  id: 'default',
  title: '报告预览',
  category: '报告目录',
  summary: '该报告尚未完成来源拆分，仅作为目录入口保留。正文数值和结论不会在当前版本展示。',
  sourceIds: ['ds-024'],
  evidenceScope: [
    '目录元数据可展示。',
    '正文 claim 需要单独登记来源。',
    '未复核图表不进入导出链路。',
  ],
  blockedClaims: [
    '缺少 claim 级来源矩阵。',
    '缺少采集窗口或授权快照。',
    '缺少报告版本与复核人记录。',
  ],
  nextActions: [
    '补 report_id 到 source_id 的映射。',
    '拆分正文指标和证据路径。',
    '完成复核后再开放下载。',
  ],
};

export default function ReportPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const report = id && reportDB[id] ? reportDB[id] : defaultReport;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="inline-flex items-center gap-2 text-sm text-[#86868b] hover:text-[#C25B6E] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />返回报告中心
          </button>
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#ff9500]/10 px-3 py-2 text-xs font-medium text-[#a85f00]">
            <Lock className="w-3.5 h-3.5" />正文下载已暂停，等待证据复核
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-2 py-0.5 rounded bg-[#C25B6E]/10 text-[#C25B6E] text-xs font-medium">{report.category}</span>
            <span className="px-2 py-0.5 rounded bg-[#FBF8F5] text-[#86868b] text-xs">证据封面</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] mb-5">{report.title}</h1>
          <p className="text-sm text-[#86868b] mb-6 leading-relaxed">{report.summary}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: '展示状态', value: '封面可见', icon: FileText, color: '#34c759' },
              { label: '正文状态', value: '待复核', icon: ShieldAlert, color: '#ff9500' },
              { label: '导出状态', value: '已隔离', icon: Lock, color: '#C25B6E' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-xl bg-[#FBF8F5] border border-[#EDE6DF] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    <span className="text-[10px] text-[#86868b]">{item.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#1d1d1f]">{item.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <PageEvidenceNotice
          sourceIds={report.sourceIds}
          title="报告内容来源边界"
          description="报告预览只展示目录和证据治理状态。涉及平台价格、市场份额、评分、下载、页数、BCG和雷达评分时，必须补采集窗口、SKU映射、hash和复核状态后再作为正文事实。"
          className="mb-6"
          cadence="报告复核口径"
        />

        <div className="mb-6">
          <AiReportGovernancePanel
            title="报告预览 Batch 4 生成 gate"
            focus="report"
            compact
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
          <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#34c759]" />可展示范围
            </h2>
            <div className="space-y-3">
              {report.evidenceScope.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#34c759] mt-0.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed text-[#1d1d1f]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#ff9500]" />暂停展示项
            </h2>
            <div className="space-y-3">
              {report.blockedClaims.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#ff9500] flex-shrink-0" />
                  <p className="text-xs leading-relaxed text-[#1d1d1f]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#C25B6E]" />下一步补证
            </h2>
            <div className="space-y-3">
              {report.nextActions.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-[#C25B6E] mt-0.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed text-[#1d1d1f]">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="bg-[#FBF8F5] rounded-2xl p-5 border border-[#EDE6DF] mb-6">
          <p className="text-sm font-semibold text-[#1d1d1f] mb-2">报告导出规则</p>
          <p className="text-xs leading-relaxed text-[#86868b]">
            当前版本不提供 PDF 或 CSV 正文导出。只有当每个可见数字都具备 source_id、证据等级、采集方法、证据路径和最后复核时间时，报告正文才会重新开放下载。
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 pb-8">
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="px-6 py-3 rounded-xl border border-[#EDE6DF] text-sm text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200"
          >
            返回报告列表
          </button>
          <button
            type="button"
            onClick={() => navigate('/data-source')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C25B6E] text-white text-sm font-medium hover:bg-[#A34759] transition-colors duration-200"
          >
            查看来源登记 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
