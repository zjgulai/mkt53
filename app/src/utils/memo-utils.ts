// ═══════════════════════════════════════════════════════════════════
// memo-utils.ts — React.memo包装工具（达尔文进化论：性能适者生存）
// ═══════════════════════════════════════════════════════════════════

import { memo, type ComponentType, type MemoExoticComponent } from 'react';

/**
 * 深度比较props的memo包装
 * 用于图表卡片等不常变的数据展示组件
 */
export function memoDeep<P extends object>(
  Component: ComponentType<P>
): MemoExoticComponent<ComponentType<P>> {
  return memo(Component, (prev, next) => {
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const key of keys) {
      if (prev[key as keyof P] !== next[key as keyof P]) return false;
    }
    return true;
  });
}

/**
 * 浅比较memo（默认行为）
 * 用于纯展示组件
 */
export function memoShallow<P extends object>(
  Component: ComponentType<P>
): MemoExoticComponent<ComponentType<P>> {
  return memo(Component);
}
