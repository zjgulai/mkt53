import { Zap } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';
import AiReportGovernancePanel from '@/components/AiReportGovernancePanel';
import AiReviewGovernancePanel from '@/components/AiReviewGovernancePanel';
import { aiAssistantSidebarItems } from './ai-assistant/constants';

export default function AIAssistantPage() {
  return (
    <EvidenceGatePage
      title="AI 助手"
      subtitle="检索链路 · 调用日志 · 提示词版本 · 人工复核"
      icon={Zap}
      accent="#C25B6E"
      sourceIds={['ds-025']}
      evidenceTitle="AI助手演示边界"
      evidenceDescription="快捷指令、最近分析和对话回复仍属于静态演示配置，未接入真实调用日志、检索证据链或服务端审计；当前不生成已验证市场结论。"
      tabs={['智能问答', '检索证据', '模型审计', '人工复核']}
      blockedItems={[
        '缺少真实会话日志、检索命中文档和响应证据链。',
        '提示词版本、模型版本、调用参数和引用来源未记录。',
        'AI 输出没有人工复核结果，不能作为经营事实展示。',
      ]}
      collectionPlan={[
        '接入服务端调用日志和检索命中文档的只读审计记录。',
        '为每次回答保存 requestId、输入、来源、hash 和复核状态。',
        '把 AI 线索、公开证据和内部数据结论分开治理。',
      ]}
      displayPolicy={[
        '未接入审计链路前只展示能力边界和采集任务。',
        'AI 生成内容必须标注为线索，不能替代来源事实。',
        '报告或 CSV 引用 AI 结论时必须带原始证据路径。',
      ]}
      internalFactSummary={
        <div className="space-y-5">
          <AiReportGovernancePanel
            title="AI助手 Batch 4 审计链路 readiness"
            focus="all"
            framed={false}
          />
          <AiReviewGovernancePanel
            title="AI助手 Batch 5 评论/VOC样本治理 readiness"
            focus="all"
            compact
            framed={false}
          />
        </div>
      }
      sidebarItems={aiAssistantSidebarItems}
      cadence="演示配置"
    />
  );
}
