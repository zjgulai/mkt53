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
      evidenceDescription="PEST 已拆分到 FDA、DOL、CDC、WHO 官方来源；波特五力已补公开报告交叉证据，但评分只能展示为 Momcozy 内部模型口径，不得写成外部机构原始结论。"
      gateStatus={{
        label: '公开来源矩阵已放行，模型限内部口径',
        tone: 'approved',
        description: '本页可展示 PEST 官方来源语境和五力模型依据；五力分数如后续恢复，必须保留内部模型版本、输入来源和复核状态，不能作为 Mordor、Precedence 或 Fortune 的原始评分。',
      }}
      tabs={['PEST', '波特五力', '技术趋势', '消费者画像', '市场周期']}
      blockedItems={[
        'PEST 可展示官方来源语境，但业务影响判断仍需标为内部解读。',
        '波特五力可展示内部模型依据；外部机构原始评分仍不存在。',
        '技术趋势和消费者画像仍不能由解释性模型直接写成市场事实。',
      ]}
      collectionPlan={[
        '保留 ds-003 的 FDA/DOL/CDC/WHO Jina 快照与hash。',
        '保留 ds-004 的 Mordor/Precedence/Fortune 公开报告快照与模型输入矩阵。',
        '下一批补技术趋势、消费者画像和市场周期的条目级来源。',
      ]}
      displayPolicy={[
        '官方政策和公共健康语境可作为 L1 public-source context 展示。',
        '五力评分只能标注为内部模型，不可写成外部咨询机构结论。',
        '市场阶段、技术趋势和消费者画像需要独立 source_id 后再恢复图表。',
      ]}
      internalFactSummary={
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">P0公开证据矩阵 · ds-003 / ds-004</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-[#86868b]">
                Artifact: tmp/audits/p0-public-source-fill-20260630/p0_cross_validation_matrix.csv；providerCalls=false；productionWrites=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#34c759]/10 px-3 py-1.5 text-[10px] font-medium text-[#2f7d32]">
              L1 public-source
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              { title: 'PEST官方来源', body: 'FDA吸奶器监管、DOL Pump at Work、CDC breastfeeding data、WHO infant feeding 支撑政策/监管/公共健康语境。' },
              { title: '波特五力模型', body: 'Mordor、Precedence、Fortune 支撑市场结构、增长、区域和细分输入；评分仍是内部解释模型。' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                <p className="text-xs font-semibold text-[#1d1d1f]">{item.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#86868b]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}
