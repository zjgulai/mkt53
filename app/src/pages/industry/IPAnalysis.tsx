import { Shield } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';

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

export default function IPAnalysis() {
  return (
    <EvidenceGatePage
      title="IP分析"
      subtitle="专利数据库 · 权利状态 · 诉讼记录 · 风险复核"
      icon={Shield}
      accent="#C25B6E"
      sourceIds={['ds-017']}
      evidenceTitle="专利数据库公开入口已补证"
      evidenceDescription="本页已绑定 WIPO PATENTSCOPE、USPTO Patent Public Search、EPO Espacenet 和 CNIPA 专利资源入口；当前只展示检索来源和证据边界，不展示专利数量、授权状态、覆盖国家或风险预警。"
      tabs={['专利快照', '权利状态', '诉讼检索', '风险复核']}
      blockedItems={[
        '本批未执行 query-specific 专利族检索，也未保存检索式结果集。',
        '权利状态、审查状态和地域覆盖仍缺少可复现查询证据。',
        '侵权风险标签需要法律意见或外部数据库交叉验证。',
      ]}
      collectionPlan={[
        '通过 WIPO、USPTO、CNIPA、EPO 等公开数据库保存检索式和结果快照。',
        '保存检索式、URL、标题、时间、hash、摘要和截图证据。',
        '把专利事实、法律风险和内部应对措施分开复核。',
      ]}
      displayPolicy={[
        '公开数据库入口可以展示为 L1 来源事实。',
        '专利数量、权利状态和申请人维度必须等待检索结果快照。',
        '侵权风险只能在法律复核后展示为风险等级。',
      ]}
      statusLabel="公开检索入口已补证，专利结论仍门禁"
      cadence="公开证据批次：tmp/audits/public-source-fill-batch2-industry-20260630/ds017_evidence.json"
      internalFactSummary={
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1d1d1f]">本批可展示事实范围</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#86868b]">
              ds-017 仅支撑专利数据库入口存在性和可复核来源，不支撑任何 Momcozy 或竞品的专利数、侵权风险、FTO 或诉讼结论。
            </p>
          </div>
          <div className="grid gap-2 text-[11px] text-[#1d1d1f] sm:grid-cols-2">
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">WIPO：PATENTSCOPE</span>
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">USPTO：Patent Public Search</span>
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">EPO：Espacenet</span>
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">CNIPA：Patent resources</span>
          </div>
        </div>
      }
      sidebarItems={getIndustrySidebarItems()}
    />
  );
}
