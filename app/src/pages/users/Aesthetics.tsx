import { Palette } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';

function getUsersSidebarItems() {
  return [
    { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
    { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
    { label: '区域用户画像', path: '/users/regional' },
    { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
  ];
}

export default function Aesthetics() {
  return (
    <EvidenceGatePage
      title="美学风格分析"
      subtitle="调研样本 · 图片偏好实验 · 区域分布 · 设计案例"
      icon={Palette}
      accent="#C25B6E"
      sourceIds={['ds-040']}
      evidenceTitle="美学偏好样本待补"
      evidenceDescription="颜色、风格、区域审美和设计奖项需要真实用户调研样本、图片偏好实验、地区分布和官方获奖证据；当前不展示配色偏好、满意度或案例排名。"
      tabs={['配色偏好', '风格趋势', '区域差异', '设计案例']}
      blockedItems={[
        '用户调研样本、地区分布和图片偏好实验未绑定。',
        '配色偏好、满意度和设计案例没有官方或调研证据。',
        'source registry 标记为 example，不能作为真实用户画像展示。',
      ]}
      collectionPlan={[
        '补齐问卷、访谈、图片选择实验和公开设计奖项来源。',
        '记录样本筛选、地区标签、实验素材和复核人。',
        '把用户偏好、设计趋势和品牌案例拆成不同证据等级。',
      ]}
      displayPolicy={[
        '样本缺失时只展示采集状态，不展示百分比或评分。',
        '设计案例必须区分官方获奖事实与内部设计解读。',
        '导出物不得把样例偏好写成全球用户结论。',
      ]}
      sidebarItems={getUsersSidebarItems()}
    />
  );
}
