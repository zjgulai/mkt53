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

export default function PolicyInsight() {
  return (
    <EvidenceGatePage
      title="区域标准洞察"
      subtitle="区域法规 · 合规状态 · 风险等级 · 审批证据"
      icon={Shield}
      accent="#C25B6E"
      sourceIds={['ds-016', 'policy-cpsc-efiling', 'policy-eu-mdr-transition']}
      evidenceTitle="区域法规公开来源矩阵已补证"
      evidenceDescription="本页已绑定 EU Commission、GOV.UK、Justice Canada 和中国 GB 标准二级摘要等公开入口，只展示法规来源语境；SKU 适用矩阵、合规通过率、风险等级和法律结论仍需内部审批证据。"
      tabs={['区域标准', '风险分层', '合规状态', '变更追踪']}
      blockedItems={[
        '公开法规入口不能直接推导 Momcozy SKU 合规状态。',
        'METI 日本入口快照返回 Page Not Found，已排除出本批采信矩阵。',
        '风险等级、合规通过率和上市准入判断仍需要法务/SKU 逐条审批证据。',
      ]}
      collectionPlan={[
        '保留 EU、英国、加拿大和中国 GB 标准入口的 URL、标题、时间和 hash。',
        '继续补日本、澳洲等缺失区域的稳定官方入口。',
        '建立区域、产品、SKU、证据路径和审批状态的内部矩阵。',
      ]}
      displayPolicy={[
        '公开法规来源入口可以展示为来源矩阵。',
        '内部合规状态、SKU 适用范围和法律意见必须与公开入口分开展示。',
        'CSV 导出需按同一证据矩阵生成，禁止从页面静态数组导出。',
      ]}
      statusLabel="公开来源矩阵已补证，合规结论仍门禁"
      cadence="公开证据批次：tmp/audits/public-source-fill-batch2-industry-20260630/ds016_evidence.json"
      internalFactSummary={
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1d1d1f]">本批可展示事实范围</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#86868b]">
              ds-016 仅支撑公开法规来源入口：EU MDR/IVDR、新旧 UKCA/CE 英国市场准入、加拿大 CCPSA、中国儿童产品 GB 标准二级摘要。页面不展示区域数量、合规百分比或风险分。
            </p>
          </div>
          <div className="grid gap-2 text-[11px] text-[#1d1d1f] sm:grid-cols-2">
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">EU Commission：New Regulations</span>
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">GOV.UK：UKCA / CE market guidance</span>
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">Justice Canada：CCPSA</span>
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">TUV：China GB standards secondary summary</span>
          </div>
        </div>
      }
      sidebarItems={getIndustrySidebarItems()}
    />
  );
}
