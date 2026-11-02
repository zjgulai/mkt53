import { Globe } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';
import { industrySidebarItems } from '@/pages/industry/industry-sidebar-items';

export default function MacroAnalysis() {
  return (
    <EvidenceGatePage
      title="区域宏观分析"
      subtitle="指标字典 · 区域基线 · 变化阈值 · 资源规划"
      icon={Globe}
      accent="#5856D6"
      sourceIds={['ds-002', 'ds-044', 'ds-045']}
      evidenceTitle="宏观指标职责已独立，数据链路仍待建立"
      evidenceDescription="当前登记来源只提供区域份额、婴童用品上层市场和穿戴式吸奶器细分市场的公开报告语境；宏观指标字典、基线和阈值仍需绑定官方统计来源、口径、窗口与 reviewer，不能从市场规模报告直接推导。"
      statusLabel="独立页面已建立，宏观指标仍未决策就绪"
      cadence="definition-only · indicator dictionary pending · threshold approval pending"
      tabs={['指标字典', '区域基线', '阈值管理', '复核记录']}
      blockedItems={[
        '缺少国家、月份、指标、单位、币种和季调口径一致的宏观指标字典。',
        '现有市场报告只能作为市场背景，不能替代官方宏观统计或资源规划基线。',
        '变化阈值、reviewer 和资源调整规则尚未形成可审计审批记录。',
      ]}
      collectionPlan={[
        '定义指标、国家、时间粒度、单位、币种、季调方式和缺失值处理合同。',
        '为每个指标绑定官方统计 URL、采集时间、hash、基线窗口和复核人。',
        '由 Macro Strategy Owner 审批阈值、告警条件和资源规划使用范围。',
      ]}
      displayPolicy={[
        '指标字典、基线、阈值和复核链未闭环前只展示治理状态与采集任务。',
        '公开市场报告只能展示其限定市场语境，不得改写为宏观因果或经营预测。',
        '宏观值、变化率、阈值命中和 CSV 导出必须由同一版本化证据快照生成。',
      ]}
      sidebarItems={industrySidebarItems}
    />
  );
}
