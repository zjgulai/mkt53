import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ClipboardCheck, Database, Lock, ShieldAlert } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import Sidebar, { type SidebarItem } from '@/components/Sidebar';

interface EvidenceGatePageProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  sourceIds: string[];
  evidenceTitle: string;
  evidenceDescription: ReactNode;
  tabs: string[];
  blockedItems: string[];
  collectionPlan: string[];
  displayPolicy: string[];
  sidebarItems?: SidebarItem[];
  statusLabel?: string;
  cadence?: string;
  internalFactSummary?: ReactNode;
}

export default function EvidenceGatePage({
  title,
  subtitle,
  icon: Icon,
  accent,
  sourceIds,
  evidenceTitle,
  evidenceDescription,
  tabs,
  blockedItems,
  collectionPlan,
  displayPolicy,
  sidebarItems,
  statusLabel = '事实展示已暂停，等待来源复核',
  cadence,
  internalFactSummary,
}: EvidenceGatePageProps) {
  const [activeTab, setActiveTab] = useState(tabs[0] ?? '数据边界');

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          {sidebarItems && <Sidebar items={sidebarItems} />}
          <div className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: accent }}>
                    <Icon className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">{title}</h1>
                    <p className="text-xs text-[#86868b]">{subtitle}</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 self-start rounded-xl bg-[#ff9500]/10 px-3 py-2 text-xs font-medium text-[#a85f00] lg:self-auto">
                  <Lock className="w-3.5 h-3.5" />{statusLabel}
                </div>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={sourceIds}
              title={evidenceTitle}
              description={evidenceDescription}
              cadence={cadence}
            />

            {internalFactSummary ? (
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                {internalFactSummary}
              </div>
            ) : null}

            <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-1 flex-wrap">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'text-white' : 'text-[#86868b] hover:bg-[#FBF8F5]'}`}
                    style={activeTab === tab ? { backgroundColor: accent } : undefined}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#ff9500]" />当前阻断
                </h2>
                <div className="space-y-3">
                  {blockedItems.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#ff9500] flex-shrink-0" />
                      <p className="text-xs leading-relaxed text-[#1d1d1f]">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#C25B6E]" />采集任务
                </h2>
                <div className="space-y-3">
                  {collectionPlan.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <ClipboardCheck className="w-3.5 h-3.5 text-[#C25B6E] mt-0.5 flex-shrink-0" />
                      <p className="text-xs leading-relaxed text-[#1d1d1f]">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#34c759]" />展示策略
                </h2>
                <div className="space-y-3">
                  {displayPolicy.map((item) => (
                    <div key={item} className="rounded-xl bg-[#FBF8F5] border border-[#EDE6DF] p-3">
                      <p className="text-xs leading-relaxed text-[#1d1d1f]">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="rounded-2xl border border-[#EDE6DF] bg-[#FBF8F5] p-5">
              <p className="text-sm font-semibold text-[#1d1d1f] mb-2">{activeTab}</p>
              <p className="text-xs leading-relaxed text-[#86868b]">
                当前标签页只保留业务问题和治理状态。待来源 URL、采集窗口、字段口径、hash、复核人和证据路径补齐后，才恢复图表、排行榜、金额、百分比、价格、税率或品牌份额展示。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
