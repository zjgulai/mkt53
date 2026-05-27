// ═══════════════════════════════════════════════════════════════════
// ErrorBoundary.tsx — 全局错误边界（达尔文进化论：故障自愈）
// 捕获渲染错误，提供优雅降级，自动上报
// ═══════════════════════════════════════════════════════════════════

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; retryCount: number; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    // 实际项目中这里会上报Sentry
  }

  handleRetry = () => {
    this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
  };

  render() {
    if (this.state.hasError && this.state.retryCount < 3) {
      return this.props.fallback || (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-[#ff3b30]/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-[#ff3b30]" />
            </div>
            <h3 className="text-base font-semibold text-[#1d1d1f] mb-2">页面渲染异常</h3>
            <p className="text-xs text-[#86868b] mb-4">组件发生错误，正在尝试恢复...</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C25B6E] text-white text-sm font-medium hover:bg-[#A34759] transition-colors">
                <RefreshCw className="w-4 h-4" /> 重试 (第{this.state.retryCount + 1}次)
              </button>
              <a href="#/" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FBF8F5] text-[#86868b] text-sm hover:bg-[#EDE6DF] transition-colors">
                <Home className="w-4 h-4" /> 首页
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (this.state.retryCount >= 3) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-[#ff9500]/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-[#ff9500]" />
            </div>
            <h3 className="text-base font-semibold text-[#1d1d1f] mb-2">多次重试失败</h3>
            <p className="text-xs text-[#86868b] mb-4">已尝试3次恢复均失败，建议刷新页面或联系技术支持。</p>
            <button onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#007aff] text-white text-sm font-medium hover:bg-[#0051d5] transition-colors">
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
