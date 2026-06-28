import { Gavel } from 'lucide-react';
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

export default function RegulationDetail() {
  return (
    <EvidenceGatePage
      title="行业法规与标准解读"
      subtitle="官方条文 · SKU 适用性 · 法务复核 · 导出隔离"
      icon={Gavel}
      accent="#C25B6E"
      sourceIds={['ds-016', 'policy-cpsc-efiling', 'policy-eu-mdr-transition']}
      evidenceTitle="法规条目逐项复核中"
      evidenceDescription="CPSC CPC/eFiling、EU MDR 过渡安排和部分区域法规需要官方条文、SKU 适用范围与法务复核记录逐项绑定；未完成前不展示合规进度、负责人结论或 CSV 清单。"
      tabs={['官方来源', 'SKU适用性', '法务复核', '导出治理']}
      blockedItems={[
        '部分法规条目的官方链接、实施范围和产品适用性仍需逐项确认。',
        '内部合规状态、负责人和进度缺少可审计审批记录。',
        'CSV 导出可能把待复核法规写成已完成结论，已临时暂停。',
      ]}
      collectionPlan={[
        '用官方监管网站或法规原文采集 URL、标题、时间和 hash。',
        '为每条法规补 SKU 适用性矩阵、法务意见和下次复核记录。',
        '把公开法规事实和内部合规执行状态分成不同证据等级。',
      ]}
      displayPolicy={[
        '官方法规可以展示为公开事实，但 SKU 影响必须待法务复核。',
        '内部合规进度只有审批记录齐全后才可展示或导出。',
        '待复核条目在页面和 CSV 中必须显示为阻断状态。',
      ]}
      sidebarItems={getIndustrySidebarItems()}
    />
  );
}
