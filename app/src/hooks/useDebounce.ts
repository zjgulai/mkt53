// ═══════════════════════════════════════════════════════════════════
// useDebounce.ts — 防抖Hook（达尔文进化论：减少无效计算）
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
