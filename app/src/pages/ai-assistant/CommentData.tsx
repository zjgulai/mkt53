import { MessageSquare } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';
import AiReportGovernancePanel from '@/components/AiReportGovernancePanel';
import AiReviewGovernancePanel from '@/components/AiReviewGovernancePanel';
import { aiAssistantSidebarItems } from './constants';

export default function CommentData() {
  return (
    <EvidenceGatePage
      title="评论数据"
      subtitle="平台连接器 · 评论快照 · NLP 版本 · 样本治理"
      icon={MessageSquare}
      accent="#34c759"
      sourceIds={['ds-021']}
      evidenceTitle="评论数据待接入"
      evidenceDescription="评论聚合、好评率和新增量需要平台授权、评论样本窗口、NLP 模型版本、准确率评估和人工复核一致率；当前不展示评论数量、平台数量、好评率或新增量。"
      tabs={['平台授权', '评论快照', 'NLP治理', '导出隔离']}
      blockedItems={[
        'Amazon、官网和社媒评论连接器未完成授权或只读快照。',
        '评论时间窗口、去重规则、产品映射和语言过滤未冻结。',
        '样例评论统计不能进入真实用户口碑看板。',
      ]}
      collectionPlan={[
        '优先生成授权连接器清单和 dry-run 采集计划。',
        '采集评论 URL、时间、产品、语言、hash 和摘要证据。',
        '为 NLP 结果保存模型版本、评估记录和人工复核结果。',
      ]}
      displayPolicy={[
        '未授权前只展示连接器状态和字段治理。',
        '公开样本必须标注采样限制，不能写成全平台事实。',
        'CSV 导出必须来自同一份可追溯评论快照。',
      ]}
      internalFactSummary={
        <div className="space-y-5">
          {/* audit-source: ds-021 */}
          <AiReportGovernancePanel
            title="评论数据 Batch 4 gated dataset manifest readiness"
            focus="dataset"
            compact
            framed={false}
          />
          {/* audit-source: ds-021 */}
          <AiReviewGovernancePanel
            title="评论数据 Batch 5 授权样本清单 gate"
            focus="comments"
            compact
            framed={false}
          />
        </div>
      }
      sidebarItems={aiAssistantSidebarItems}
      cadence="待模型评估"
    />
  );
}
