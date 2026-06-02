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

  it('keeps public report URLs specific when automated access is blocked by challenge pages', () => {
    const fortune = getSourceRegistryItem('ds-002');
    const mordor = getSourceRegistryItem('ds-004');
    const mamava = getSourceRegistryItem('ds-043');

    expect(fortune.sourceUrl).toBe('https://www.fortunebusinessinsights.com/breast-pump-market-107054');
    expect(fortune.action).toContain('人工复核凭证');
    expect(mordor.sourceUrl).toBe('https://www.mordorintelligence.com/industry-reports/breast-pumps-market');
    expect(mordor.verificationStatus).toBe('example');
    expect([fortune, mordor, mamava].every((item) => item.note.includes('Cloudflare challenge'))).toBe(true);
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
});
