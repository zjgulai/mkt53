import { ClipboardCheck, FileLock2, MapPinned, ShieldAlert, ShoppingBag } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import { erpChannelCustomerProxySummary, erpDerivedBatch3Artifact } from '@/data/market-insight-data';

const sidebarItems = [
  { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
  { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
  { label: '区域用户画像', path: '/users/regional' },
  { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
];

const governanceTasks = [
  { title: '门店清单', state: '待核准', detail: '确认门店类型、地区、授权展示范围和可公开名称。' },
  { title: '运营快照', state: 'ERP内部代理已放行', detail: 'ds-049 hash维度和代理量可展示；客流、转化、坪效、人效和退换货仍待授权快照。' },
  { title: '访谈证据', state: '待脱敏', detail: '补访谈记录、观察笔记、照片授权和门店经理审阅意见。' },
  { title: '导出治理', state: 'Batch19内部代理可导出', detail: '仅导出ERP内部proxy；门店指标和人员访谈字段仍待复核。' },
];

const safeFields = [
  '门店类型',
  '地区标签',
  '访谈状态',
  '快照状态',
  '授权范围',
  '证据路径',
  '计算口径',
  '复核意见',
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

export default function StoreInterviews() {
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
                    <ShoppingBag className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">门店运营深度访谈</h1>
                    <p className="text-xs text-[#86868b]">ERP内部代理已放行 · 门店运营与访谈证据仍待复核</p>
                  </div>
                </div>
                <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg">
                  <span className="text-[#B5AFA8]">展示状态：</span>ERP proxy 已放行
                </span>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-042', 'ds-049']}
              title="门店访谈复核口径"
              description="门店访谈、运营快照和现场观察仍需授权与证据 artifact；ERP ds-049 已经Batch19放行，可补客户/目的仓hash维度和代理量覆盖度，但不能替代转化率、坪效、NPS 或访谈原话。"
            />

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP门店/渠道快照辅助源 · Batch19已放行</h2>
                  <p className="text-[10px] text-[#86868b] mt-1">
                    {erpDerivedBatch3Artifact.batchId}；source ids: {erpChannelCustomerProxySummary.sourceIds.join(' / ')}；private/internal L3；canDisplayAsFact=true；仅限内部proxy。
                  </p>
                </div>
                <span className="rounded-lg bg-[#34c759]/10 px-3 py-1.5 text-[10px] font-medium text-[#2f7d32]">
                  脱敏聚合 · internal proxy
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
                <div className="border-b border-[#EDE6DF] pb-2">
                  <p className="text-[10px] text-[#86868b]">客户/目的仓hash组合</p>
                  <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpChannelCustomerProxySummary.channelCustomerHashRows)}</p>
                </div>
                <div className="border-b border-[#EDE6DF] pb-2">
                  <p className="text-[10px] text-[#86868b]">目的仓月度代理行</p>
                  <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpChannelCustomerProxySummary.destinationMonthlyRows)}</p>
                </div>
                <div className="border-b border-[#EDE6DF] pb-2">
                  <p className="text-[10px] text-[#86868b]">top hash组合代理量</p>
                  <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpChannelCustomerProxySummary.topChannelCustomerVisibleProxyUnits)}</p>
                </div>
                <div className="border-b border-[#EDE6DF] pb-2">
                  <p className="text-[10px] text-[#86868b]">库存字段阻断项</p>
                  <p className="font-semibold text-[#1d1d1f]">{formatNumber(erpChannelCustomerProxySummary.inventoryReadinessRows)}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-[#86868b]">
                该辅助源不能还原门店名称、地点、人员或现场访谈；可以用于内部proxy展示和CSV导出，只能帮助后续选择样本和核对快照范围。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardCheck className="w-4 h-4 text-[#C25B6E]" />
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">门店数据治理清单</h2>
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
                    '门店名称和地点必须符合授权展示范围。',
                    'ERP内部proxy不得升级为门店经营指标或现场访谈结论。',
                    '现场访谈未脱敏前不展示原话。',
                    '导出文件只能来自已复核的数据源。',
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
                <MapPinned className="w-4 h-4 text-[#34c759]" />
                <h2 className="text-sm font-semibold text-[#1d1d1f]">授权后可恢复字段</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {safeFields.map((field) => (
                  <span key={field} className="px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] border border-[#EDE6DF]">
                    {field}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-[#86868b] mt-4 leading-relaxed">
                本页后续恢复门店图表时，应以门店快照版本作为唯一上游，并在 CSV 导出中复用同一份治理数据。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
