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

  it('marks CPSC eFiling as verified official entry while keeping SKU legality gated', () => {
    const cpscItems = sourceRegistry.filter((item) => /CPSC|eFiling/i.test(`${item.metric} ${item.sourceName} ${item.note}`));
    const cpscEntry = getSourceRegistryItem('policy-cpsc-efiling');

    expect(cpscItems.length).toBeGreaterThan(0);
    expect(cpscEntry.verificationStatus).toBe('verified');
    expect(cpscEntry.note).toContain('CPSC官方页面已复核');
    expect(cpscEntry.gap).toContain('不支撑SKU适用范围');
    expect(cpscEntry.action).toContain('法务SKU矩阵');
  });

  it('does not label needs-review data as verified source text', () => {
    const needsReviewText = sourceRegistry
      .filter((item) => item.verificationStatus === 'needs-review')
      .map((item) => `${item.note} ${getVerificationStatusMeta(item.verificationStatus).label}`)
      .join('\n');

    expect(needsReviewText).not.toContain('已验证原文');
    expect(needsReviewText).toContain('待复核');
  });

  it('splits QuestMobile and Mamava user research sources instead of using a dead combined URL', () => {
    const questMobile = getSourceRegistryItem('ds-011');
    const mamava = getSourceRegistryItem('ds-043');

    expect(questMobile.sourceName).toContain('QuestMobile');
    expect(questMobile.sourceUrl).toContain('questmobile.com.cn');
    expect(questMobile.sourceUrl).not.toContain('questmobile.com/');
    expect(mamava.sourceName).toContain('Mamava');
    expect(mamava.sourceUrl).toContain('mamava.com');
    expect(questMobile.note).toContain('不能外推全球');
    expect(mamava.note).toContain('不应与QuestMobile');
  });

  it('keeps public report URLs specific and separates blocked reports from verified survey evidence', () => {
    const fortune = getSourceRegistryItem('ds-002');
    const mordor = getSourceRegistryItem('ds-004');
    const mamava = getSourceRegistryItem('ds-043');

    expect(fortune.sourceUrl).toBe('https://www.fortunebusinessinsights.com/breast-pump-market-107054');
    expect(fortune.action).toContain('人工复核凭证');
    expect(mordor.sourceUrl).toBe('https://www.mordorintelligence.com/industry-reports/breast-pumps-market');
    expect(mordor.verificationStatus).toBe('example');
    expect([fortune, mordor].every((item) => item.note.includes('Cloudflare challenge'))).toBe(true);
    expect(mamava.verificationStatus).toBe('verified');
    expect(mamava.note).toContain('2,842份回复');
    expect(mamava.gap).toContain('不支撑全球用户画像');
  });

  it('binds every static-data page from the weekly audit backlog to a registry item', () => {
    const pages = [
      'AIAssistantPage',
      'AIGallery',
      'DataManage',
      'DataSourcePage',
      'DesignAssistant',
      'ReviewAnalysis',
      'YoutubeReview',
      'FlavorMap',
      'FlavorReport',
      'IndustryNews',
      'SupplyChain',
      'TechNews',
      'BabyCare',
      'CategoryAnalysis',
      'NursingProducts',
      'Aesthetics',
      'ChannelInterviews',
      'StoreInterviews',
    ];
    const registeredPages = new Set(sourceRegistry.map((item) => item.page));

    for (const page of pages) {
      expect(registeredPages.has(page)).toBe(true);
    }
  });

  it('keeps newly bound static or model-driven pages below verified until real collection evidence exists', () => {
    const evidenceGatedPages = [
      'AIAssistantPage',
      'AIGallery',
      'DesignAssistant',
      'ReviewAnalysis',
      'YoutubeReview',
      'FlavorMap',
      'FlavorReport',
      'IndustryNews',
      'SupplyChain',
      'TechNews',
      'BabyCare',
      'CategoryAnalysis',
      'NursingProducts',
      'Aesthetics',
      'ChannelInterviews',
      'StoreInterviews',
    ];

    const gatedItems = sourceRegistry.filter((item) => evidenceGatedPages.includes(item.page));

    expect(gatedItems.length).toBe(evidenceGatedPages.length);
    expect(gatedItems.every((item) => item.verificationStatus !== 'verified')).toBe(true);
  });

  it('keeps ERP internal operating sources private, connector-backed, and Batch19 approved', () => {
    const erpSourceIds = ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'];
    const erpSources = erpSourceIds.map((id) => getSourceRegistryItem(id));

    expect(getSourceRegistryItemsByModule('ERP内部经营数据').map((item) => item.id)).toEqual(['ds-050', 'ds-051']);
    expect(erpSources.every((item) => item.privacyLevel === 'private/internal')).toBe(true);
    expect(erpSources.every((item) => item.collectionMethod === 'connector-required')).toBe(true);
    expect(erpSources.every((item) => item.evidenceGrade === 'L3-production-read-only')).toBe(true);
    expect(erpSources.every((item) => item.verificationStatus === 'verified')).toBe(true);
    expect(erpSources.every((item) => item.canDisplayAsFact === true)).toBe(true);
    expect(erpSources.every((item) => item.blockingReason === 'approved-internal-proxy-display-export; connector-refresh-still-required')).toBe(true);
    expect(erpSources.map((item) => item.note).join(' ')).toContain('Batch19');
    expect(erpSources.every((item) => item.evidenceArtifactPath && item.evidenceArtifactPath.length > 20)).toBe(true);
    expect(erpSources.map((item) => item.claimScope).join(' ')).toContain('internal');
  });
});
