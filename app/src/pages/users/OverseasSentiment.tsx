import { Globe } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';

function getUsersSidebarItems() {
  return [
    { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
    { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
    { label: '区域用户画像', path: '/users/regional' },
    { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
  ];
}

export default function OverseasSentiment() {
  return (
    <EvidenceGatePage
      title="海外舆情监测"
      subtitle="社媒授权 · 查询词 · 采样窗口 · 情绪模型"
      icon={Globe}
      accent="#C25B6E"
      sourceIds={['ds-013']}
      evidenceTitle="海外舆情采集待授权"
      evidenceDescription="海外社交平台尚未补齐授权、查询词、采样窗口和去重规则；页面不展示提及量、情绪占比、热门话题排名或单条用户互动数。"
      tabs={['采集边界', '情绪模型', '话题聚类', '危机预警']}
      blockedItems={[
        '社媒平台 API 或公开采集授权未完成。',
        '查询词、市场范围、语言过滤和采样窗口尚未冻结。',
        '情绪模型版本、人工抽检和去重规则没有审计记录。',
      ]}
      collectionPlan={[
        '优先建立合法公开采集 dry-run，再进入授权连接器只读采集。',
        '保存 URL、标题、时间、hash、语言、平台和摘要证据。',
        '把声量、情绪、话题和危机预警分开交叉验证。',
      ]}
      displayPolicy={[
        '未授权前只展示采集状态，不展示声量、百分比或排名。',
        '公开样本只能作为舆情线索，并标注 proxy 或样例语义。',
        'CSV 导出必须与同一份可追溯采集快照绑定。',
      ]}
      sidebarItems={getUsersSidebarItems()}
    />
  );
}
