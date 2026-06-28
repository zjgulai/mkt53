import { Baby } from 'lucide-react';
import MarketDataGate from '@/components/MarketDataGate';

export default function BabyCare() {
  return (
    <MarketDataGate
      title="婴儿护理分析"
      subtitle="温奶器 · 消毒器 · 监视器 · 加湿器"
      icon={Baby}
      accent="#C25B6E"
      sourceIds={['ds-037']}
      evidenceTitle="婴儿护理数据为展示性推算"
      evidenceDescription="规模、品牌份额和 Momcozy 占比缺少报告口径、Amazon 类目采集和权重公式，不能作为正式经营结论。"
      tabs={['趋势', '细分品类', '品牌份额']}
      blockedItems={[
        '婴儿护理品类边界需要先定义，不同报告口径不可混用。',
        '品牌份额需要平台采集授权或零售面板。',
        'AI功能、监视器、消毒器等细分趋势需要公开报告或SKU快照。',
      ]}
      collectionPlan={[
        '拆分温奶器、消毒器、监视器和加湿器的来源口径。',
        '按类目建立公开报告、零售页和平台数据的证据矩阵。',
        '将 Momcozy 自身占比留在待授权经营数据层。',
      ]}
      displayPolicy={[
        '未复核前不展示市场规模、增长率、品牌份额或功能渗透率。',
        '细分品类可以展示采集任务和定义，不展示未证实排行。',
        '恢复图表前先完成 source_id、证据路径和最后复核时间。',
      ]}
    />
  );
}
