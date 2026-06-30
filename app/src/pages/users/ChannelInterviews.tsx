import { AlertTriangle, ClipboardCheck, DatabaseZap, FileLock2, Store } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import { erpChannelCustomerProxySummary, erpDerivedBatch3Artifact } from '@/data/market-insight-data';

const sidebarItems = [
  { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
  { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
  { label: '区域用户画像', path: '/users/regional' },
  { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
];

const collectionTasks = [
  { title: '访谈凭证', owner: '渠道研究', status: '待上传脱敏记录', detail: '补齐受访角色、访谈方式、授权状态和原始摘录路径。' },
  { title: '销售快照', owner: '商业分析', status: 'ERP内部代理已放行', detail: 'ds-049 hash维表和代理量可展示；平台后台、独立站后台和零售商对账仍需拆分。' },
  { title: '渠道健康度', owner: '数据治理', status: '待定义评分模型', detail: '评分权重、采集周期和缺失字段需要进入 source registry。' },
  { title: '导出治理', owner: '数据产品', status: 'Batch19内部代理可导出', detail: '仅导出已放行的ERP内部proxy；访谈结论和渠道健康度仍不可导出为事实。' },
];

const recoveryFields = [
  '渠道名称',
  '受访角色',
  '脱敏访谈摘要',
  '授权状态',
  '快照版本',
  '计算口径',
  '证据路径',
  '复核人',
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

export default function ChannelInterviews() {
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
                    <Store className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">渠道合作伙伴访谈</h1>
                    <p className="text-xs text-[#86868b]">ERP内部代理已放行 · 访谈记录和渠道健康度仍待授权补证</p>
                  </div>
                </div>
                <span className="text-xs text-[#86868b] bg-[#FBF8F5] px-3 py-1.5 rounded-lg">
                  <span className="text-[#B5AFA8]">展示状态：</span>ERP proxy 已放行
                </span>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-041']}
              title="渠道访谈复核口径"
              description="渠道访谈和渠道健康判断仍缺脱敏证据与授权说明；访谈原文、授权记录、渠道利润或渠道评分不得由内部代理替代。"
            />
            <PageEvidenceNotice
              sourceIds={['ds-049']}
              title="ERP渠道辅助源"
              description="ERP ds-049 已经Batch19放行，可补渠道/客户hash维表和代理量覆盖度，仅作为 private/internal proxy。"
            />

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP渠道访谈校验辅助源 · Batch19已放行</h2>
                  <p className="text-[10px] text-[#86868b] mt-1">
                    {erpDerivedBatch3Artifact.batchId}；source ids: {erpChannelCustomerProxySummary.sourceIds.join(' / ')}；private/internal L3；canDisplayAsFact=true；仅限内部proxy。
                  </p>
                </div>
                <span className="rounded-lg bg-[#34c759]/10 px-3 py-1.5 text-[10px] font-medium text-[#2f7d32]">
                  hash维表 · internal proxy
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
                <div className="border-b border-[#EDE6DF] pb-2">
                  <p className="text-[10px] text-[#86868b]">渠道/客户hash组合</p>
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
                该辅助源只保留客户、目的仓、运营、SKU 的 hash 与聚合代理量；可以用于内部proxy展示和CSV导出，不能替代渠道访谈原文、授权记录、渠道利润或渠道健康评分。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardCheck className="w-4 h-4 text-[#C25B6E]" />
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">采集与复核任务</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {collectionTasks.map((task) => (
                    <div key={task.title} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-semibold text-[#1d1d1f]">{task.title}</p>
                        <span className="text-[10px] text-[#C25B6E] bg-white px-2 py-0.5 rounded-full">{task.owner}</span>
                      </div>
                      <p className="text-[11px] text-[#ff9500] font-medium mb-1">{task.status}</p>
                      <p className="text-[11px] text-[#86868b] leading-relaxed">{task.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-4">
                  <FileLock2 className="w-4 h-4 text-[#ff9500]" />
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">页面保护规则</h2>
                </div>
                <div className="space-y-3">
                  {[
                    '未授权访谈不得写成渠道负责人原话。',
                    'ERP内部proxy不得生成渠道排名、外部增长或利润判断。',
                    '未通过复核的字段不得进入 CSV 导出。',
                    '恢复看板前必须绑定 source_id 和证据路径。',
                  ].map((rule) => (
                    <div key={rule} className="flex items-start gap-2 text-[11px] text-[#86868b] leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#ff9500] flex-shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-2 mb-4">
                <DatabaseZap className="w-4 h-4 text-[#34c759]" />
                <h2 className="text-sm font-semibold text-[#1d1d1f]">授权后可恢复字段</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {recoveryFields.map((field) => (
                  <span key={field} className="px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] border border-[#EDE6DF]">
                    {field}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-[#86868b] mt-4 leading-relaxed">
                本页已恢复ERP内部proxy区块。后续如果接入访谈授权和渠道评分快照，应先保存证据 artifact，再按字段恢复访谈结论、健康度图表和导出能力。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
