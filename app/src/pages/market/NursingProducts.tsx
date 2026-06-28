import { Shirt } from 'lucide-react';
import MarketDataGate from '@/components/MarketDataGate';

export default function NursingProducts() {
  return (
    <MarketDataGate
      title="哺乳用品分析"
      subtitle="哺乳文胸 · 防溢乳垫 · 储奶袋 · 乳头护理"
      icon={Shirt}
      accent="#C25B6E"
      sourceIds={['ds-039']}
      evidenceTitle="哺乳用品采集状态"
      evidenceDescription="趋势、品牌份额和细分品类表现需要平台采集授权、类目定义和品牌映射；未接入前只作为半月复核线索。"
      tabs={['趋势', '品牌', '细分品类']}
      blockedItems={[
        '品牌份额和排名缺少平台授权采集或零售面板。',
        '月度趋势缺少 GMV、销量或搜索词快照。',
        '细分品类规模缺少报告口径和权重公式。',
      ]}
      collectionPlan={[
        '建立 Amazon 类目、品牌、SKU 和关键词映射。',
        '接入授权平台快照或保存公开代理指标说明。',
        '为每个细分品类补报告来源、采集时间和可展示状态。',
      ]}
      displayPolicy={[
        '未授权前不展示品牌份额、销量、GMV或排行榜。',
        '公开代理指标必须明确标为 proxy，不能写成交易趋势。',
        'CSV 导出只允许包含已复核字段和阻断状态。',
      ]}
    />
  );
}
