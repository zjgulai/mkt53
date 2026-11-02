import { Cpu } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';
import SourceBackedReviewPacket from '@/components/SourceBackedReviewPacket';
import { industrySidebarItems } from './industry-sidebar-items';

export default function TechNews() {
  return (
    <EvidenceGatePage
      title="母婴科技资讯"
      subtitle="品牌官网 · 产品规格 · 新闻原文 · 手动复核"
      icon={Cpu}
      accent="#C25B6E"
      sourceIds={['ds-036']}
      evidenceTitle="技术资讯公开规格来源已补证"
      evidenceDescription="本页已绑定 Momcozy、Elvie、Willow 和 Medela 的公开产品/规格入口；当前只展示来源矩阵和技术语境，不展示性能提升、响应速度、品牌跟进数量或技术排名。"
      tabs={['产品规格', '新闻原文', '专利公开', '技术观察']}
      blockedItems={[
        '公开规格入口不能替代实验室性能测试或用户体验结论。',
        '响应速度、吸力表现、噪音对比和品牌跟进数量没有统一测评样本。',
        '技术趋势判断仍需标为内部解读或待测，不得写成行业事实。',
      ]}
      collectionPlan={[
        '继续补齐每个技术点对应的品牌规格页、新闻稿或专利公开记录。',
        '为后续性能对比建立测评样本、测试方法和复核人。',
        '区分已发布产品规格、公开研发方向、内部观察和预测。',
      ]}
      displayPolicy={[
        '公开规格入口可以展示为 L1 来源事实。',
        '趋势判断必须标注推断，性能数值必须有测试或官网规格证据。',
        '导出与报告只允许引用已绑定证据 artifact 的条目。',
      ]}
      statusLabel="公开规格来源已补证，性能结论仍门禁"
      cadence="公开证据批次：tmp/audits/public-source-fill-batch2-industry-20260630/ds036_evidence.json"
      internalFactSummary={
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1d1d1f]">本批可展示事实范围</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#86868b]">
              ds-036 仅支撑公开产品/规格来源矩阵；不支撑性能排名、品牌技术领先性、市场采用率或未来产品预测。
            </p>
          </div>
          <div className="grid gap-2 text-[11px] text-[#1d1d1f] sm:grid-cols-2">
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">Momcozy：M9 Mobile Flow</span>
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">Elvie：Elvie Pump</span>
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">Willow：Willow 360</span>
            <span className="rounded-lg bg-[#FBF8F5] px-3 py-2">Medela：Pump In Style Pro</span>
          </div>
          <SourceBackedReviewPacket
            route="/industry/tech"
            modelContract="technology-spec-ontology-v1"
            evidenceScope={[
              'ds-036：仅覆盖品牌公开产品页、规格页和可复核的产品版本入口。',
              '单位换算、版本沿革与同义规格必须在 ontology 内显式记录。',
            ]}
            allowedUses={[
              '复核同版本、同规格定义与同单位下的公开规格可比性。',
              '形成带来源、版本和换算规则的技术观察候选。',
            ]}
            prohibitedUses={[
              '不得解释为独立性能排名、实验室结论或技术领先性。',
              '不得用不同版本、不同测试条件或营销文案拼接性能结论。',
            ]}
            reviewChecklist={[
              '业务 owner 签核规格 ontology、单位换算和产品版本链。',
              '逐项确认来源日期、适用型号、缺失值与不可比原因。',
            ]}
          />
        </div>
      }
      sidebarItems={industrySidebarItems}
    />
  );
}
