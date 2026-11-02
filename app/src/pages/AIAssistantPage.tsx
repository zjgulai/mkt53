import { Zap } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';
import AiReportGovernancePanel from '@/components/AiReportGovernancePanel';
import AiReviewGovernancePanel from '@/components/AiReviewGovernancePanel';
import AiVocBlockerPanel from '@/components/AiVocBlockerPanel';
import { aiAssistantSidebarItems } from './ai-assistant/constants';

export default function AIAssistantPage() {
  return (
    <EvidenceGatePage
      title="AI 助手"
      subtitle="检索链路 · 调用日志 · 提示词版本 · 人工复核"
      icon={Zap}
      accent="#C25B6E"
      sourceIds={['ds-025', 'ds-021', 'ds-022', 'ds-023', 'ds-024', 'ds-026', 'ds-029']}
      evidenceTitle="AI / VOC 证据链仍处于阻断治理"
      evidenceDescription="静态入口只证明本地 UI/readiness 配置；授权数据集、模型评估、人工一致率和 provider request lineage 均未闭环，因此本页保持 partial / not-ready。"
      tabs={['智能问答', '检索证据', '模型审计', '人工复核']}
      blockedItems={[
        '评论与 VOC 来源仍缺授权数据集、合规范围和可复现快照。',
        '现有 fixture / dry-run 结构尚无模型评估与人工一致率证据。',
        '生成链路尚未形成 provider 代理、requestId、模型版本和人工复核血缘。',
      ]}
      collectionPlan={[
        '先取得评论/VOC 数据授权并固定样本、去重、脱敏和快照合同。',
        '建立模型评估集、人工标注协议和一致率验收阈值。',
        '接入只读 provider proxy 日志，保存 requestId、模型、提示词、引用和复核状态。',
        '继续保持 fixture、synthetic、公开证据和真实业务数据分层。',
      ]}
      displayPolicy={[
        '当前只展示治理状态、缺口和静态代码资产事实。',
        'fixture / synthetic 不得升级为真实输出、模型质量或用户洞察。',
        '在数据授权、评估和调用血缘闭环前，不展示真实 AI/VOC 业务结论。',
      ]}
      internalFactSummary={
        <div className="space-y-5">
          <AiVocBlockerPanel />
          <AiReportGovernancePanel
            title="AI助手 Batch 4 审计链路 readiness"
            focus="all"
            framed={false}
          />
          {/* audit-source: ds-025 */}
          <AiReviewGovernancePanel
            title="AI助手 Batch 5 评论/VOC样本治理 readiness"
            focus="all"
            compact
            framed={false}
          />
        </div>
      }
      sidebarItems={aiAssistantSidebarItems}
      statusLabel="AI / VOC 证据链阻断，保持 partial / not-ready"
      cadence="代码资产证据：tmp/audits/manual-code-source-fill-batch3-20260630/ds025_code_asset_evidence.json"
    />
  );
}

// route-audit-source: AiReportGovernancePanel focus=all ds-021 ds-022 ds-023 ds-024 ds-026 ds-029 ds-030 ds-031 ds-035 ds-047 ds-049 ds-050 ds-051
