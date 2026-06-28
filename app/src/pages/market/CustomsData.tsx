import { Anchor } from 'lucide-react';
import MarketDataGate from '@/components/MarketDataGate';

export default function CustomsData() {
  return (
    <MarketDataGate
      title="海关数据"
      subtitle="HS编码 · 贸易流向 · 关税查询 · 出口口岸"
      icon={Anchor}
      accent="#af52de"
      sourceIds={['ds-006']}
      evidenceTitle="海关数据连接器待接入"
      evidenceDescription="当前 HS 编码、贸易流向、关税和口岸数据为示例口径，尚未接入 Import Genius、海关官方数据或内部数仓，不作为真实贸易结论。"
      tabs={['HS编码', '贸易流向', '关税查询', '出口口岸']}
      blockedItems={[
        '示例贸易流向不能作为真实出口额或进口额。',
        '关税和 HS 编码需要官方税则或合规台账逐条确认。',
        '口岸份额需要海关数据源或授权贸易数据库支撑。',
      ]}
      collectionPlan={[
        '建立 HS 编码与产品类目的映射表，并记录适用边界。',
        '接入授权贸易数据库或保存官方查询证据。',
        '按国家、口岸、产品类目拆分采集窗口和复核状态。',
      ]}
      displayPolicy={[
        '未授权前不展示金额、税率、贸易份额或同比增速。',
        '官方条目可展示为合规线索，但不能替代报关事实。',
        '真实贸易数据进入页面前必须先进入 evidence artifact。',
      ]}
    />
  );
}
