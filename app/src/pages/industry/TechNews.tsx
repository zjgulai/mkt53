import { Cpu } from 'lucide-react';
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

export default function TechNews() {
  return (
    <EvidenceGatePage
      title="母婴科技资讯"
      subtitle="品牌官网 · 产品规格 · 新闻原文 · 手动复核"
      icon={Cpu}
      accent="#C25B6E"
      sourceIds={['ds-036']}
      evidenceTitle="技术资讯事实待复核"
      evidenceDescription="技术趋势描述需要逐条绑定品牌官网、产品规格、新闻原文或专利公开记录；当前不展示性能提升、响应速度、品牌跟进数量或技术排名。"
      tabs={['产品规格', '新闻原文', '专利公开', '技术观察']}
      blockedItems={[
        '技术描述混合了产品规格、行业观察和预测推断。',
        '性能提升、响应速度和品牌跟进判断缺少原文证据。',
        'source registry 为 manual-required，需人工证据 artifact 后才能展示事实。',
      ]}
      collectionPlan={[
        '从品牌官网、新闻稿、规格页和专利数据库采集公开证据。',
        '为每条技术趋势保存 URL、标题、时间、hash 和摘要。',
        '区分已发布产品规格、公开研发方向和内部预测。',
      ]}
      displayPolicy={[
        '未复核前只展示采集状态，不展示性能数值或预测数量。',
        '公开规格可以展示为来源事实，趋势判断必须标注推断。',
        '导出与报告只允许引用已绑定证据 artifact 的条目。',
      ]}
      sidebarItems={getIndustrySidebarItems()}
    />
  );
}
