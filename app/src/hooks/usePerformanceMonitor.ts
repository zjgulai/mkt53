// R29: 性能监控Hook — 页面加载时间追踪
import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  pageName: string;
  loadTime: number;
  renderCount: number;
}

export function usePerformanceMonitor(pageName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const loadTime = performance.now() - startTime.current;

    // 开发环境打印性能指标
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${pageName}: load=${loadTime.toFixed(0)}ms, renders=${renderCount.current}`);
    }

    // 超过2秒的页面记录警告
    if (loadTime > 2000) {
      console.warn(`[Performance] ${pageName} slow load: ${loadTime.toFixed(0)}ms`);
    }
  });

  return {
    getMetrics: (): PerformanceMetrics => ({
      pageName,
      loadTime: performance.now() - startTime.current,
      renderCount: renderCount.current,
    }),
  };
}
