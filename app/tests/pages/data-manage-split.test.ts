import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { dataModules } from '../../src/features/data-manage/catalog';
import { tableGovernance } from '../../src/features/data-manage/governance';

describe('DataManage route split contract', () => {
  it('preserves the seven-module, 107-table governance catalog', () => {
    const tables = dataModules.flatMap((module) => module.tables);

    expect(dataModules.map((module) => module.id)).toEqual([
      'mkt',
      'comp',
      'user',
      'ind',
      'self',
      'erp',
      'ai',
    ]);
    expect(tables).toHaveLength(107);
    expect(new Set(tables.map((table) => table.id)).size).toBe(107);
    expect(Object.keys(tableGovernance)).toHaveLength(107);
    expect(new Set(Object.keys(tableGovernance))).toEqual(new Set(tables.map((table) => table.id)));
  });

  it('keeps static datasets out of the route shell and lazily loads the manual', () => {
    const pageSource = readFileSync(resolve(process.cwd(), 'src/pages/DataManage.tsx'), 'utf8');

    expect(pageSource).not.toContain('const dataModules');
    expect(pageSource).not.toContain("import OperationsManual from '@/components/OperationsManual'");
    expect(pageSource).toContain("lazy(() => import('@/components/OperationsManual'))");
    expect(pageSource).toContain('<Suspense fallback=');
  });

  it('retires the DataManage exception from the checked bundle contract', () => {
    const bundleConfig = JSON.parse(
      readFileSync(resolve(process.cwd(), 'scripts/quality/bundle-budgets.json'), 'utf8'),
    ) as { rules: Array<{ id: string; pattern: string }> };

    expect(bundleConfig.rules.some((rule) => rule.id.includes('data-manage'))).toBe(false);
    expect(bundleConfig.rules.some((rule) => new RegExp(rule.pattern).test('DataManage-example.js'))).toBe(false);
  });

  it('keeps the extracted catalog inside deep-audit coverage', () => {
    const auditSource = readFileSync(resolve(process.cwd(), 'scripts/data/audit-deep.mjs'), 'utf8');

    expect(auditSource).toContain("join(srcRoot, 'features')");
    expect(auditSource).toContain("rel.startsWith(join('features', 'data-manage'))");
    expect(auditSource).toContain("return 'DataManage'");
  });
});
