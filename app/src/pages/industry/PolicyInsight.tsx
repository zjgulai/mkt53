import { Shield } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';

function getIndustrySidebarItems() {
  return [
    {
      label: '政策分析',
      children: [
        { label: '母婴标准与法规地图', path: '/industry' },
        { label: '行业法规与标准解读', path: '/industry/regulation' },
        { label: '区域标准洞察', path: '/industry/policy-insight' },
      ],
    },
    {
      label: 'VOC趋势',
      children: [
        { label: 'VOC趋势地图', path: '/industry/flavor-map' },
        { label: 'VOC趋势报告', path: '/industry/flavor-report' },
      ],
    },
    {
      label: '行业新闻',
      children: [
        { label: '母婴行业资讯', path: '/industry/news' },
        { label: '母婴科技资讯', path: '/industry/tech' },
        { label: '母婴行业报告', path: '/industry/reports' },
      ],
    },
    { label: '母婴供应链情报', path: '/industry/supply' },
    { label: 'IP分析', path: '/industry/ip' },
    { label: '母婴展会调研', path: '/industry/exhibition' },
    { label: '区域宏观分析', path: '/industry/macro' },
  ];
}

export default function PolicyInsight() {
  return (
    <EvidenceGatePage
      title="区域标准洞察"
      subtitle="区域法规 · 合规状态 · 风险等级 · 审批证据"
      icon={Shield}
      accent="#C25B6E"
      sourceIds={['ds-016', 'policy-cpsc-efiling', 'policy-eu-mdr-transition']}
      evidenceTitle="区域标准汇总待复核"
      evidenceDescription="区域标准数量、风险等级、合规度和待更新项需要官方来源、SKU 适用矩阵和内部审批证据；当前不展示汇总数量、百分比或导出清单。"
      tabs={['区域标准', '风险分层', '合规状态', '变更追踪']}
      blockedItems={[
        '区域标准汇总把公开法规与内部合规执行混在同一层级。',
        'CPSC CPC/eFiling 与 EU MDR 相关条目仍需官方原文和法务确认。',
        '风险等级和合规状态没有逐条审批证据。',
      ]}
      collectionPlan={[
        '从官方监管网站采集区域法规原文与变更记录。',
        '建立区域、产品、SKU、证据路径和审批状态的矩阵。',
        '用法务复核结果决定哪些字段可展示为事实。',
      ]}
      displayPolicy={[
        '公开法规事实和内部合规状态必须分开展示。',
        '未复核的区域汇总只能显示为待复核，不给出百分比或数量。',
        'CSV 导出需按同一证据矩阵生成，禁止从页面静态数组导出。',
      ]}
      sidebarItems={getIndustrySidebarItems()}
    />
  );
}
