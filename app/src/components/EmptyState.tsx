// ═══════════════════════════════════════════════════════════════════
// EmptyState.tsx — 空状态/无数据提示
// ═══════════════════════════════════════════════════════════════════

import { FileSearch, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  desc?: string;
  onRefresh?: () => void;
}

export default function EmptyState({ title = '暂无数据', desc = '当前筛选条件下没有找到匹配的数据', onRefresh }: EmptyStateProps) {
  return (
    <div className="min-h-[300px] flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FBF8F5] flex items-center justify-center mx-auto mb-4">
          <FileSearch className="w-7 h-7 text-[#B5AFA8]" />
        </div>
        <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">{title}</h3>
        <p className="text-xs text-[#86868b] mb-4 max-w-xs">{desc}</p>
        {onRefresh && (
          <button onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FBF8F5] text-[#86868b] text-xs hover:bg-[#EDE6DF] transition-colors mx-auto">
            <RefreshCw className="w-3.5 h-3.5" /> 刷新
          </button>
        )}
      </div>
    </div>
  );
}
