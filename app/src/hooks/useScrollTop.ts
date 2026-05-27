// ═══════════════════════════════════════════════════════════════════
// useScrollTop.ts — 页面切换自动滚动到顶部
// ═══════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
}
