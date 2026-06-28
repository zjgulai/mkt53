import { TrendingUp } from 'lucide-react';
import MarketDataGate from '@/components/MarketDataGate';

export default function MarketTrend() {
  return (
    <MarketDataGate
      title="大盘趋势"
      subtitle="PEST分析 · 波特五力 · 技术趋势 · 消费者画像 · 市场周期"
      icon={TrendingUp}
      accent="#5856d6"
      sourceIds={['ds-003', 'ds-004']}
      evidenceTitle="大盘趋势复核边界"
      evidenceDescription="PEST 来源组合仍需拆分到具体政策、官方或报告 URL；波特五力评分是内部解释模型，当前不得展示为机构原始结论。"
      tabs={['PEST', '波特五力', '技术趋势', '消费者画像', '市场周期']}
      blockedItems={[
        'PEST 因子需要逐条绑定政策文本、报告页面或新闻原文。',
        '波特五力分数缺少公式、打分人和复核记录。',
        '技术趋势和消费者画像不能由解释性模型直接写成市场事实。',
      ]}
      collectionPlan={[
        '按政治、经济、社会、技术四类拆分 source registry 条目。',
        '把波特五力从机构事实降级为内部模型，并保存评分依据。',
        '公开报告和官方来源优先走 Agent Reach/Jina 证据采集。',
      ]}
      displayPolicy={[
        '未复核前只展示趋势议题和采集队列，不展示评分、百分比或阶段判断。',
        '公开政策可以展示原文链接和摘要，业务影响必须标为待法务复核。',
        '内部模型输出必须带模型版本、输入来源和人工复核状态。',
      ]}
    />
  );
}
