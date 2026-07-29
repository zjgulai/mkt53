import { AlertTriangle, CheckCircle, LoaderCircle, RefreshCw, WifiOff } from 'lucide-react';
import type { UseDataSourceRegistryResult } from '@/hooks/useDataSourceRegistry';

type Props = Pick<UseDataSourceRegistryResult, 'runtime' | 'status' | 'sources' | 'errorMessage' | 'retry'>;

export function DataSourceRegistryStatus({ runtime, status, sources, errorMessage, retry }: Props) {
  const isApi = runtime.mode === 'api';

  if (status === 'loading') {
    return (
      <div role="status" data-testid="source-registry-loading" className="bg-[#5856d6]/5 border border-[#5856d6]/15 rounded-2xl p-4 mb-6 flex items-start gap-4">
        <LoaderCircle className="w-5 h-5 text-[#5856d6] flex-shrink-0 mt-0.5 animate-spin" />
        <div>
          <p className="text-sm font-medium text-[#5856d6]">正在读取本地 Source API</p>
          <p className="text-xs text-[#86868b] mt-1">API 尚未返回来源；当前不展示来源统计，也不会回退静态数据或显示“已复核”结果。</p>
        </div>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div role="alert" data-testid="source-registry-offline" className="bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-2xl p-4 mb-6 flex items-start gap-4">
        <WifiOff className="w-5 h-5 text-[#ff9500] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-[#a85f00]">Source API 离线</p>
          <p className="text-xs text-[#86868b] mt-1">{errorMessage} 来源未加载，不得视作已验证；未使用静态 registry 回填。</p>
        </div>
        <button type="button" onClick={retry} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#a85f00] border border-[#ff9500]/30 bg-white">
          <RefreshCw className="w-3.5 h-3.5" />重试
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div role="alert" data-testid="source-registry-error" className="bg-[#ff3b30]/5 border border-[#ff3b30]/20 rounded-2xl p-4 mb-6 flex items-start gap-4">
        <AlertTriangle className="w-5 h-5 text-[#ff3b30] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-[#ff3b30]">Source API 读取失败</p>
          <p className="text-xs text-[#86868b] mt-1">{errorMessage} 来源状态保持未知；未使用静态 registry 回退成“已复核”。</p>
        </div>
        <button type="button" onClick={retry} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#ff3b30] border border-[#ff3b30]/30 bg-white">
          <RefreshCw className="w-3.5 h-3.5" />重试
        </button>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div role="status" data-testid="source-registry-empty" className="bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-2xl p-4 mb-6 flex items-start gap-4">
        <AlertTriangle className="w-5 h-5 text-[#ff9500] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-[#a85f00]">Source API 返回空结果</p>
          <p className="text-xs text-[#86868b] mt-1">当前为 0 条来源；未使用静态 registry 回填，不能据此显示任何“已复核”统计。</p>
        </div>
        {isApi ? (
          <button type="button" onClick={retry} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#a85f00] border border-[#ff9500]/30 bg-white">
            <RefreshCw className="w-3.5 h-3.5" />重试
          </button>
        ) : null}
      </div>
    );
  }

  const title = isApi ? '本地 Source API 已加载' : runtime.isProduction ? '生产静态 registry（canonical）' : '本地静态 registry';
  const detail = runtime.productionForcedStatic
    ? '检测到 API 模式请求，但生产构建已强制锁定静态 registry，未发起 API 请求。'
    : isApi
      ? `已从同源只读 API 加载 ${sources.length} 条来源。浏览器未注入身份或代理密钥。`
      : `当前读取 ${sources.length} 条静态来源；生产切换仍需独立授权与真实会话验收。`;

  return (
    <div role="status" data-testid="source-registry-ready" className="bg-[#34c759]/5 border border-[#34c759]/15 rounded-2xl p-4 mb-6 flex items-start gap-4">
      <CheckCircle className="w-5 h-5 text-[#34c759] flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-[#237a35]">{title}</p>
        <p className="text-xs text-[#86868b] mt-1">{detail}</p>
      </div>
    </div>
  );
}
