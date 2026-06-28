import { Wand2 } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';
import AiReportGovernancePanel from '@/components/AiReportGovernancePanel';
import AiDesignGovernancePanel from '@/components/AiDesignGovernancePanel';
import { aiAssistantSidebarItems } from './constants';

export default function DesignAssistant() {
  return (
    <EvidenceGatePage
      title="产品设计助手"
      subtitle="服务端代理 · 生成记录 · 成本口径 · 审核结果"
      icon={Wand2}
      accent="#af52de"
      sourceIds={['ds-029']}
      evidenceTitle="设计助手代理与审核边界"
      evidenceDescription="模型配置、生成历史、产品图和成本估算仍属于本地演示资产。真实生图必须经服务端代理，并记录 requestId、模型、成本、状态和人工审核结果。"
      tabs={['生成代理', '素材证据', '成本审计', '人工审核']}
      blockedItems={[
        '静态站未接入服务端代理和供应商调用日志。',
        '生成历史、耗时、成本和采纳结果缺少 requestId 证据链。',
        '本地素材不能证明真实生成、采集时间或商用审核状态。',
      ]}
      collectionPlan={[
        '建设服务端代理审计表，记录模型、参数、状态和成本字段。',
        '为每张素材保存来源、生成请求、hash、授权和人工审核结果。',
        '把官方产品图、AI 生成图和本地演示图分开标注。',
      ]}
      displayPolicy={[
        '没有代理日志和审核记录时只展示治理状态。',
        '本地演示图不得标注为真实生成历史或成本节省事实。',
        '导出或报告引用素材时必须带素材来源与审核状态。',
      ]}
      internalFactSummary={
        <div className="space-y-5">
          <AiReportGovernancePanel
            title="设计助手 Batch 4 生成审计 readiness"
            focus="review"
            compact
            framed={false}
          />
          <AiDesignGovernancePanel
            title="设计助手 Batch 6 requestId/model/cost/审核 gate"
            focus="design"
            compact
            framed={false}
          />
        </div>
      }
      sidebarItems={aiAssistantSidebarItems}
      cadence="演示模式"
    />
  );
}
