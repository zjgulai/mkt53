import { Truck } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';
import { erpDerivedBatch3Artifact, erpInventoryReadinessSummary } from '@/data/market-insight-data';

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

export default function SupplyChain() {
  return (
    <EvidenceGatePage
      title="供应链情报"
      subtitle="供应商主数据 · 库存快照 · 成本趋势 · 交付风险"
      icon={Truck}
      accent="#C25B6E"
      sourceIds={['ds-035']}
      evidenceTitle="供应链数据授权阻断"
      evidenceDescription="供应商、库存、成本和风险预警需要 ERP 快照、供应商授权数据和字段口径复核；未授权前不展示库存、交付周期、成本指数或供应商占比。"
      tabs={['供应商治理', '库存快照', '成本趋势', '风险预警']}
      blockedItems={[
        '缺少 ERP 或供应商系统的只读快照与授权记录。',
        '供应商评级、库存、成本和风险等级没有可复现证据路径。',
        '当前 source registry 标记为 connector-required，不能展示为事实。',
      ]}
      collectionPlan={[
        '建立 ERP、WMS、供应商主数据的只读连接器待办。',
        '在 DataManage 中沉淀 erp_inventory_snapshot 与 erp_field_dictionary，再接供应链页面。',
        '采集字段口径、采集窗口、hash、样本文件和复核人记录。',
        '把供应商、库存、成本和交付风险拆成独立 claim 逐项验证。',
      ]}
      displayPolicy={[
        '授权私有快照缺失时只展示 gate 状态和采集任务。',
        '公开行业信息只能作为 proxy，并需明确不代表内部供应链事实。',
        'CSV 导出在证据补齐前不得输出库存、成本、供应商份额或评级。',
      ]}
      internalFactSummary={
        <div>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">ERP库存字段 readiness</h2>
              <p className="text-[10px] text-[#86868b] mt-1">
                {erpDerivedBatch3Artifact.batchId}；artifact: tmp/exports/erp-derived-batch3-20260625/erp_inventory_snapshot_readiness.csv；source id: ds-035；canDisplayAsFact=false。
              </p>
            </div>
            <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1.5 text-[10px] font-medium text-[#a85f00]">
              库存数值未采集
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
            {erpInventoryReadinessSummary.map((field) => (
              <div key={field.fieldName} className="rounded-xl border border-[#EDE6DF] bg-[#FBF8F5] p-3">
                <p className="text-xs font-semibold text-[#1d1d1f]">{field.label}</p>
                <p className="mt-1 text-[10px] text-[#ff9500]">{field.status}</p>
                <p className="mt-1 text-[10px] text-[#86868b]">{field.evidenceGrade} · source ids: {field.sourceIds.join(' / ')}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-[#86868b]">
            WMS/库存页面只读采集未成功落到可复现导出，当前 readiness artifact 只登记字段缺口，不包含在库、可用、预占、冻结、在途或不良品库存数值。
          </p>
        </div>
      }
      sidebarItems={getIndustrySidebarItems()}
    />
  );
}
