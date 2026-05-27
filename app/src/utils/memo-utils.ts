// ═══════════════════════════════════════════════════════════════════
// memo-utils.ts — React.memo包装工具（达尔文进化论：性能适者生存）
// ═══════════════════════════════════════════════════════════════════

import { memo } from 'react';

/**
 * 深度比较props的memo包装
 * 用于图表卡片等不常变的数据展示组件
 */
export function memoDeep<T extends React.ComponentType<any>>(Component: T): T {
  return memo(Component, (prev, next) => {
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const key of keys) {
      if (prev[key] !== next[key]) return false;
    }
    return true;
  }) as unknown as T;
}

/**
 * 浅比较memo（默认行为）
 * 用于纯展示组件
 */
export function memoShallow<T extends React.ComponentType<any>>(Component: T): T {
  return memo(Component) as unknown as T;
}
