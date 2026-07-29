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
      evidenceTitle="AI助手静态入口配置已复核"
      evidenceDescription="AI助手入口、侧边栏和治理面板已按本地代码资产 hash 复核；该证据只支撑静态 UI/readiness 配置，不代表真实调用量、模型效果、检索证据链或经营结论。"
      tabs={['智能问答', '检索证据', '模型审计', '人工复核']}
      blockedItems={[
        '静态入口配置已复核，但仍缺少真实会话日志、检索命中文档和响应证据链。',
        '提示词版本、模型版本、调用参数和引用来源未记录。',
        'AI 输出没有人工复核结果，不能作为经营事实展示。',
      ]}
      collectionPlan={[
        '保留本地代码资产 hash 作为静态配置证据。',
        '接入服务端调用日志和检索命中文档的只读审计记录。',
        '为每次回答保存 requestId、输入、来源、hash 和复核状态。',
        '把 AI 线索、公开证据和内部数据结论分开治理。',
      ]}
      displayPolicy={[
        '静态入口和 readiness 面板可以作为代码资产事实展示。',
        '未接入审计链路前不展示真实调用量、模型效果或业务结论。',
        'AI 生成内容必须标注为线索，不能替代来源事实。',
      ]}
      internalFactSummary={
        <div className="space-y-5">
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
      statusLabel="静态入口已复核，运行证据仍门禁"
      cadence="代码资产证据：tmp/audits/manual-code-source-fill-batch3-20260630/ds025_code_asset_evidence.json"
    />
  );
}
