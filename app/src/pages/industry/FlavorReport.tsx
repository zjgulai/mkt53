import { Beaker } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';
import AiReviewGovernancePanel from '@/components/AiReviewGovernancePanel';

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

export default function FlavorReport() {
  return (
    <EvidenceGatePage
      title="VOC趋势报告"
      subtitle="真实 VOC 快照 · 模型版本 · 预测口径 · 人工复核"
      icon={Beaker}
      accent="#C25B6E"
      sourceIds={['ds-033']}
      evidenceTitle="VOC趋势报告证据不足"
      evidenceDescription="趋势排名、采用率和预测结论需要真实 VOC 快照、模型版本、抽样窗口和人工复核记录；当前不展示具体趋势百分比或预测值。"
      tabs={['趋势主题', '模型证据', '预测边界', '报告导出']}
      blockedItems={[
        'VOC 原始记录、去重规则和样本窗口未绑定。',
        '趋势模型版本、提示词、人工复核人和复核结果缺失。',
        '预测结论没有行业报告或内部样本的交叉验证。',
      ]}
      collectionPlan={[
        '接入评论、工单、访谈和社媒样本的只读证据包。',
        '为每个趋势主题保存样本量、摘要、hash 和模型版本。',
        '预测类结论必须附交叉来源或标注为假设。',
      ]}
      displayPolicy={[
        '证据不足时只展示报告采集和复核状态。',
        '模型输出不得单独作为事实，必须有样本证据和人工复核。',
        'CSV 和报告导出在证据补齐前只输出治理字段。',
      ]}
      internalFactSummary={
        /* audit-source: ds-033 */
        <AiReviewGovernancePanel
          title="VOC趋势报告 Batch 5 claim/eval/review gate"
          focus="voc"
          compact
          framed={false}
        />
      }
      sidebarItems={getIndustrySidebarItems()}
    />
  );
}
