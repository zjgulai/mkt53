import { describe, expect, it } from 'vitest';
import {
  getSourceRegistryItem,
  getSourceRegistryItemsByModule,
  getVerificationStatusMeta,
  sourceRegistry,
} from '@/data/source-registry';

describe('source registry', () => {
  it('keeps registry ids unique and usable by module', () => {
    const ids = sourceRegistry.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(getSourceRegistryItemsByModule('看行业').length).toBeGreaterThan(0);
    expect(getSourceRegistryItem('ds-001').sourceName).toBe('Precedence Research');
  });

  it('marks every CPSC eFiling item as needs-review until legal owner signs off', () => {
    const cpscItems = sourceRegistry.filter((item) => /CPSC|eFiling/i.test(`${item.metric} ${item.sourceName} ${item.note}`));

    expect(cpscItems.length).toBeGreaterThan(0);
    expect(cpscItems.every((item) => item.verificationStatus === 'needs-review')).toBe(true);
    expect(cpscItems.some((item) => item.note.includes('官网实时声明'))).toBe(true);
  });

  it('does not label needs-review data as verified source text', () => {
    const needsReviewText = sourceRegistry
      .filter((item) => item.verificationStatus === 'needs-review')
      .map((item) => `${item.note} ${getVerificationStatusMeta(item.verificationStatus).label}`)
      .join('\n');

    expect(needsReviewText).not.toContain('已验证原文');
    expect(needsReviewText).toContain('待复核');
  });
});
