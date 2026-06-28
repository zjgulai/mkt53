import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardCheck, FileLock2, Globe, MessageCircle, Route, ShieldAlert, Users } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const sidebarItems = [
  { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
  { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
  { label: '区域用户画像', path: '/users/regional' },
  { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
];

const routeCopy: Record<string, { title: string; subtitle: string; icon: ReactNode }> = {
  '/users': {
    title: '用户洞察',
    subtitle: '社媒声量、公开调研和私域样本待拆分复核',
    icon: <Users className="w-5 h-5 text-white" strokeWidth={2} />,
  },
  '/users/regional': {
    title: '区域用户画像',
    subtitle: '区域画像需要公开样本、内部订单和口径说明共同支撑',
    icon: <Route className="w-5 h-5 text-white" strokeWidth={2} />,
  },
  '/users/global': {
    title: '全球用户画像',
    subtitle: '全球画像和 RFM 分层待接入授权 CRM 或调研证据',
    icon: <Globe className="w-5 h-5 text-white" strokeWidth={2} />,
  },
};

const governanceTasks = [
  { title: '公开声量', state: '待采集复核', detail: '仅能作为公开代理信号，不能替代评论、销量或用户规模。' },
  { title: '海外调研', state: '待补报告证据', detail: '需要保存报告来源、样本说明、引用页和摘要 hash。' },
  { title: '私域与 CRM', state: '待授权快照', detail: '未接入授权只读快照前，不展示 RFM、复购或 LTV。' },
  { title: '画像模型', state: '待治理', detail: '画像分群需要样本、字段、算法版本和人工审阅记录。' },
];

const childRoutes = [
  { label: '消费者访谈', path: '/users/consumer', desc: '访谈样本门控' },
  { label: '渠道访谈', path: '/users/channel', desc: '渠道快照门控' },
  { label: '店铺访谈', path: '/users/store', desc: '门店证据门控' },
  { label: '海外舆情', path: '/users/overseas', desc: '公开舆情待复核' },
  { label: '美学风格', path: '/users/aesthetics', desc: '偏好样本待复核' },
];

const blockedDisplays = [
  '地区占比',
  '社媒增长',
  'RFM 分层',
  '用户规模',
  '画像收入',
  '转化建议',
  '竞品评分',
  'CSV 指标导出',
];

export default function UsersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const copy = routeCopy[location.pathname] ?? routeCopy['/users'];

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
                    {copy.icon}
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">{copy.title}</h1>
                    <p className="text-xs text-[#86868b]">{copy.subtitle}</p>
                  </div>
                </div>
                <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg">
                  <span className="text-[#B5AFA8]">展示状态：</span>用户指标已暂停
                </span>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-011', 'ds-043', 'ds-012']}
              title="用户洞察来源口径"
              description="中国有孩家庭画像、海外母乳喂养调研和私域样本不是同一数据口径；当前页面只展示治理任务，不展示用户事实。"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardCheck className="w-4 h-4 text-[#C25B6E]" />
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">用户数据治理任务</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {governanceTasks.map((task) => (
                    <div key={task.title} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-4">
                      <p className="text-xs font-semibold text-[#1d1d1f] mb-1">{task.title}</p>
                      <p className="text-[11px] text-[#ff9500] font-medium mb-1">{task.state}</p>
                      <p className="text-[11px] text-[#86868b] leading-relaxed">{task.detail}</p>
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
                    '公开代理信号必须标注为 proxy，不能写成真实用户事实。',
                    '未授权 CRM 或调研样本不得生成 RFM、LTV 或人群占比。',
                    '页面和 CSV 必须复用同一份治理后的数据源。',
                    '样例画像只能放在样例区，不进入真实 KPI。',
                  ].map((rule) => (
                    <div key={rule} className="flex items-start gap-2 text-[11px] text-[#86868b] leading-relaxed">
                      <FileLock2 className="w-3.5 h-3.5 text-[#ff9500] flex-shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="w-4 h-4 text-[#34c759]" />
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">可进入的子页面</h2>
                </div>
                <div className="space-y-2">
                  {childRoutes.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center justify-between gap-3 rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] px-4 py-3 text-left hover:border-[#C25B6E]/30 hover:bg-[#F5EDE8] transition-colors"
                    >
                      <span>
                        <span className="block text-xs font-semibold text-[#1d1d1f]">{item.label}</span>
                        <span className="block text-[11px] text-[#86868b] mt-0.5">{item.desc}</span>
                      </span>
                      <span className="text-[10px] text-[#C25B6E]">进入</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-4">
                  <FileLock2 className="w-4 h-4 text-[#C25B6E]" />
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">已暂停展示项</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {blockedDisplays.map((item) => (
                    <span key={item} className="px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] border border-[#EDE6DF]">
                      {item}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[#86868b] mt-4 leading-relaxed">
                  本页恢复数据前，需要先完成公开证据、调研样本和私域快照的 MECE 拆分，再由深度审计确认可展示范围。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
