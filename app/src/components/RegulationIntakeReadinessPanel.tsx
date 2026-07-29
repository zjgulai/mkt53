import { ClipboardList, FileCheck2, Scale, ShieldCheck, UserRoundCheck, Undo2 } from 'lucide-react';

const readinessGroups = [
  { icon: FileCheck2, label: '官方来源范围' },
  { icon: UserRoundCheck, label: 'SKU owner' },
  { icon: Scale, label: '法务 reviewer 与 SLA' },
  { icon: ClipboardList, label: '证据交接' },
  { icon: Undo2, label: '撤回治理' },
  { icon: ShieldCheck, label: '提交确认' },
];

export default function RegulationIntakeReadinessPanel() {
  return (
    <section aria-labelledby="data-reg-intake-title" data-testid="regulation-intake-readiness-panel" className="border-t border-[#EDE6DF] pt-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5B8C5A]">Source + legal intake</p>
          <h2 id="data-reg-intake-title" className="mt-1 text-sm font-semibold text-[#1d1d1f]">
            Owner 与法务输入准备包
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#6e6e73]">
            空模板已建立，但真实 owner、reviewer、来源范围和授权记录均未提供。完整填写也只能进入独立授权复核，不能自行授权采集或发布。
          </p>
        </div>
        <span className="inline-flex self-start rounded-lg border border-[#5B8C5A]/20 bg-[#5B8C5A]/5 px-2.5 py-1 text-[11px] font-medium text-[#476F46]">
          0 / 6 输入组就绪
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {readinessGroups.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] px-3 py-2.5">
            <span className="flex items-center gap-2 text-xs text-[#1d1d1f]">
              <Icon className="h-3.5 w-3.5 text-[#5B8C5A]" />{label}
            </span>
            <span className="text-[10px] font-medium text-[#a85f00]">待输入</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {['授权采集 0', '真实 SKU 评估 0', '可发布结论 0'].map((label) => (
          <div key={label} className="rounded-lg border border-[#ff9500]/20 bg-[#ff9500]/5 px-3 py-2 text-center text-[11px] font-medium text-[#8a5400]">
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
