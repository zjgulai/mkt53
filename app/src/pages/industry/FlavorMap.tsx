import { MapPin } from 'lucide-react';
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

export default function FlavorMap() {
  return (
    <EvidenceGatePage
      title="VOC趋势地图"
      subtitle="关键词词典 · 样本窗口 · NLP 模型 · 地区映射"
      icon={MapPin}
      accent="#C25B6E"
      sourceIds={['ds-032']}
      evidenceTitle="VOC功能趋势待复核"
      evidenceDescription="功能热度、采用率和国家偏好需要绑定评论样本、关键词词典、NLP 模型版本和地区映射；当前不展示关注度、采用率或国家排名。"
      tabs={['功能词典', '评论样本', '地区映射', '模型复核']}
      blockedItems={[
        '评论样本、关键词词典和去重规则尚未绑定。',
        'NLP 模型版本、地区映射和人工抽检结果缺失。',
        '功能热度和技术采用率没有外部来源或样本证据支撑。',
      ]}
      collectionPlan={[
        '采集评论、问答、工单和社媒样本的证据包。',
        '保存关键词词典、模型版本、抽检记录和 hash。',
        '按功能、国家和渠道拆分 claim，逐项验证后再恢复地图。',
      ]}
      displayPolicy={[
        '证据不足时只展示治理状态和采集任务。',
        '功能热度只能作为样本窗口内 proxy，不能写成全球趋势事实。',
        '导出必须绑定同一份 VOC 样本与模型复核记录。',
      ]}
      internalFactSummary={
        <AiReviewGovernancePanel
          title="VOC趋势地图 Batch 5 关键词样本/eval gate"
          focus="voc"
          compact
          framed={false}
        />
      }
      sidebarItems={getIndustrySidebarItems()}
    />
  );
}
