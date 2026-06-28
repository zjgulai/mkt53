import { ClipboardCheck, FileLock2, MessageCircle, ShieldAlert, Users } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const sidebarItems = [
  { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
  { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
  { label: '区域用户画像', path: '/users/regional' },
  { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
];

const auditLanes = [
  { title: '样本治理', state: '待补招募条件', detail: '需要补齐样本来源、筛选条件、地区配额和访谈授权。' },
  { title: '原文治理', state: '待补脱敏文本', detail: '逐条访谈需保存脱敏原文、翻译版本和审阅记录。' },
  { title: '量表治理', state: '待补问卷口径', detail: 'NPS、满意度和情绪标签必须绑定题目、量表和计算方法。' },
  { title: '导出治理', state: '事实导出关闭', detail: '在证据不足时，页面不导出姓名、评分、NPS 或情绪值。' },
];

const allowedDisplay = [
  '受访者画像标签',
  '待复核痛点主题',
  '访谈采集状态',
  '样本配额缺口',
  '授权状态',
  '证据路径',
  '复核结论',
  '下一步采集人',
];

export default function ConsumerInterviews() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm">
                    <Users className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">消费者深度访谈</h1>
                    <p className="text-xs text-[#86868b]">访谈样本待复核 · 当前只呈现治理状态和可恢复字段</p>
                  </div>
                </div>
                <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg">
                  <span className="text-[#B5AFA8]">展示状态：</span>量化结论已暂停
                </span>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-014']}
              title="消费者访谈样本口径"
              description="消费者访谈缺少完整招募条件、样本配额、原文凭证和审阅记录；当前页面只保留采集治理信息。"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardCheck className="w-4 h-4 text-[#C25B6E]" />
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">样本复核清单</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {auditLanes.map((lane) => (
                    <div key={lane.title} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-4">
                      <p className="text-xs font-semibold text-[#1d1d1f] mb-1">{lane.title}</p>
                      <p className="text-[11px] text-[#ff9500] font-medium mb-1">{lane.state}</p>
                      <p className="text-[11px] text-[#86868b] leading-relaxed">{lane.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-[#ff9500]" />
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">页面保护规则</h2>
                </div>
                <div className="space-y-3">
                  {[
                    '访谈原话未授权前不展示为真实用户证言。',
                    'NPS 和满意度缺量表口径时不展示数值。',
                    '情绪标签缺人工复核时只保留为待处理主题。',
                    'CSV 导出恢复前必须通过证据矩阵检查。',
                  ].map((rule) => (
                    <div key={rule} className="flex items-start gap-2 text-[11px] text-[#86868b] leading-relaxed">
                      <FileLock2 className="w-3.5 h-3.5 text-[#ff9500] flex-shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-4 h-4 text-[#34c759]" />
                <h2 className="text-sm font-semibold text-[#1d1d1f]">可安全展示的信息类型</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {allowedDisplay.map((item) => (
                  <span key={item} className="px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] border border-[#EDE6DF]">
                    {item}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-[#86868b] mt-4 leading-relaxed">
                本页后续恢复时，应先把访谈证据写入审计 artifact，再由页面读取同一份治理后的数据源，避免页面与导出再次分叉。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
