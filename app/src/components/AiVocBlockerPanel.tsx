import { AlertTriangle, Database, FileWarning, GitBranch } from 'lucide-react';

const blockerLanes = [
  {
    icon: Database,
    title: '授权评论/VOC 数据集',
    source: 'ds-021 · ds-023',
    detail: '仍缺合规授权、样本范围、去重规则与可复现数据快照；当前不可计算真实 VOC 指标。',
  },
  {
    icon: FileWarning,
    title: '模型评估与人工一致率',
    source: 'ds-022 · ds-024',
    detail: '现有 fixture 与 dry-run 目录只证明流程结构，尚未形成模型评估集、人工标注协议和一致率证据。',
  },
  {
    icon: GitBranch,
    title: 'provider request lineage',
    source: 'ds-029',
    detail: '仍缺 provider 代理、requestId、模型与提示词版本、引用来源以及人工复核结果的只读审计链。',
  },
];

export default function AiVocBlockerPanel() {
  return (
    <section
      data-testid="ai-voc-blocker-panel"
      data-governance-state="blocked"
      data-source-readiness="partial"
      data-decision-readiness="not-ready"
      data-provider-calls="false"
      data-production-writes="false"
      className="rounded-2xl border border-[#C44545]/20 bg-[#C44545]/5 p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C44545]/10">
            <AlertTriangle className="h-4 w-4 text-[#C44545]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#1d1d1f]">AI / VOC 阻断治理</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[#6b5b5f]">
              本页只展示 readiness 与阻断项。未取得真实数据、评估和调用血缘前，不生成或发布 AI/VOC 业务结论。
            </p>
          </div>
        </div>
        <span className="w-fit rounded-lg bg-[#C44545]/10 px-3 py-1.5 text-[10px] font-medium text-[#9d3030]">
          blocked · partial · not-ready
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {blockerLanes.map(({ icon: Icon, title, source, detail }) => (
          <section key={title} className="rounded-xl border border-[#E8D4D4] bg-white p-4">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-[#C44545]" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-[#1d1d1f]">{title}</h3>
            </div>
            <p className="mt-2 text-[10px] font-medium text-[#C25B6E]">{source}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#6b5b5f]">{detail}</p>
          </section>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-[#C44545]/30 bg-white px-4 py-3">
        <p className="text-xs font-semibold text-[#9d3030]">升级禁令</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#6b5b5f]">
          fixture / synthetic 不得升级为真实输出；不得把目录存在性、dry-run 成功或静态 UI 配置解释为模型质量、用户洞察或经营事实。
        </p>
      </div>
    </section>
  );
}
