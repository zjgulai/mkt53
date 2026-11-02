import { FileText } from 'lucide-react';
import EvidenceGatePage from '@/components/EvidenceGatePage';
import { industrySidebarItems } from '@/pages/industry/industry-sidebar-items';

export default function IndustryReports() {
  return (
    <EvidenceGatePage
      title="母婴行业报告"
      subtitle="报告目录 · 不可变版本 · 引用映射 · 审批与撤回"
      icon={FileText}
      accent="#FF9500"
      sourceIds={['ds-001', 'ds-002', 'ds-034']}
      evidenceTitle="行业报告职责已独立，版本治理仍待建立"
      evidenceDescription="当前登记来源可作为公开市场报告和行业资讯的采集入口，但报告目录、不可变版本、引用映射和审批记录尚未形成；新闻条目不能自动升级为行业报告，未审批内容不得进入事实正文或下载。"
      statusLabel="独立页面已建立，报告版本仍未审批"
      cadence="definition-only · report catalog pending · approval chain pending"
      tabs={['报告目录', '版本治理', '引用映射', '审批与撤回']}
      blockedItems={[
        '缺少 report_id、version、scope、owner、citation map 和 approval status 的报告目录。',
        '公开报告入口与新闻证据尚未绑定到不可变报告版本和段落级引用。',
        '审批、撤回、替换和下载权限没有可审计状态机与复核记录。',
      ]}
      collectionPlan={[
        '建立报告目录，记录报告类型、范围、版本、owner、来源和生命周期状态。',
        '为每个报告版本生成不可变内容 hash、段落级引用映射和证据快照。',
        '补齐审批人、审批时间、撤回原因、替代版本和下载门禁记录。',
      ]}
      displayPolicy={[
        '报告目录未建立前只展示治理状态和采集任务，不展示报告数量或完成率。',
        '新闻条目只能作为线索或引用来源，不能替代已审批的报告版本。',
        '事实正文、预览和下载必须指向同一不可变版本，并执行撤回门禁。',
      ]}
      sidebarItems={industrySidebarItems}
    />
  );
}
