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

export default function IPAnalysis() {
  return (
    <EvidenceGatePage
      title="IP分析"
      subtitle="专利数据库 · 权利状态 · 诉讼记录 · 风险复核"
      icon={Shield}
      accent="#C25B6E"
      sourceIds={['ds-017']}
      evidenceTitle="IP数据待复核口径"
      evidenceDescription="专利清单、授权状态、审查状态和侵权风险标签需要 WIPO、USPTO、CNIPA、EPO 或诉讼数据库快照；当前不展示专利数量、申请日期、覆盖国家或风险预警。"
      tabs={['专利快照', '权利状态', '诉讼检索', '风险复核']}
      blockedItems={[
        '专利数据库快照和检索式未保存。',
        '权利状态、审查状态和地域覆盖缺少可复现查询证据。',
        '侵权风险标签需要法律意见或外部数据库交叉验证。',
      ]}
      collectionPlan={[
        '通过 WIPO、USPTO、CNIPA、EPO 等公开数据库采集专利快照。',
        '保存检索式、URL、标题、时间、hash、摘要和截图证据。',
        '把专利事实、法律风险和内部应对措施分开复核。',
      ]}
      displayPolicy={[
        '公开专利事实需有数据库记录后才展示。',
        '侵权风险只能在法律复核后展示为风险等级。',
        '导出必须包含检索式和证据路径，不从静态页面数组生成。',
      ]}
      sidebarItems={getIndustrySidebarItems()}
    />
  );
}
