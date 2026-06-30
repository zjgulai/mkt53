import { BarChart3 } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';
import AiReportGovernancePanel from '@/components/AiReportGovernancePanel';
import AiReviewGovernancePanel from '@/components/AiReviewGovernancePanel';
import { aiAssistantSidebarItems } from './constants';

export default function ReviewAnalysis() {
  return (
    <EvidenceGatePage
      title="评论分析"
      subtitle="评论样本 · 情绪模型 · 准确率评估 · 人工复核"
      icon={BarChart3}
      accent="#C25B6E"
      sourceIds={['ds-030']}
      evidenceTitle="评论分析示例口径"
      evidenceDescription="统计卡、关键词和洞察为功能演示数据，缺少评论采集窗口、模型评估和人工复核一致率；当前不展示评论数量、准确率、关键词数量或洞察排名。"
      tabs={['样本采集', '模型评估', '主题聚类', '人工复核']}
      blockedItems={[
        '评论来源、采集窗口、去重规则和样本量未绑定。',
        '情绪模型准确率、提示词版本和人工一致率缺少证据。',
        'AI 洞察没有原始评论片段和复核记录支撑。',
      ]}
      collectionPlan={[
        '接入公开评论或授权平台评论的只读证据包。',
        '保存评论文本 hash、语言、地区、产品、模型版本和复核状态。',
        '把情绪、主题、风险和产品建议拆成独立 claim。',
      ]}
      displayPolicy={[
        '未补证据前只展示采集任务，不展示统计卡或 TOP 洞察。',
        '模型输出必须标注为线索，不能单独作为用户事实。',
        '报告和导出必须引用同一份评论样本和模型审计记录。',
      ]}
      internalFactSummary={
        <div className="space-y-5">
          {/* audit-source: ds-030 */}
          <AiReportGovernancePanel
            title="评论分析 Batch 4 blocked 模型运行 readiness"
            focus="model"
            compact
            framed={false}
          />
          {/* audit-source: ds-030 */}
          <AiReviewGovernancePanel
            title="评论分析 Batch 5 样本/eval/人工复核 gate"
            focus="comments"
            compact
            framed={false}
          />
        </div>
      }
      sidebarItems={aiAssistantSidebarItems}
      cadence="演示数据"
    />
  );
}
