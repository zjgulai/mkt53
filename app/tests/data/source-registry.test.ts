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

  it('keeps public report URLs specific and separates verified model inputs from survey evidence', () => {
    const fortune = getSourceRegistryItem('ds-002');
    const mordor = getSourceRegistryItem('ds-004');
    const mamava = getSourceRegistryItem('ds-043');

    expect(fortune.sourceUrl).toBe('https://www.fortunebusinessinsights.com/breast-pump-market-107054');
    expect(fortune.collectionMethod).toBe('public-url-check');
    expect(fortune.canDisplayAsFact).toBe(true);
    expect(fortune.action).toContain('品牌份额仍需');
    expect(mordor.sourceUrl).toBe('https://www.mordorintelligence.com/industry-reports/breast-pumps-market');
    expect(mordor.verificationStatus).toBe('verified');
    expect(mordor.note).toContain('公开报告交叉证据');
    expect(mordor.note).toContain('外部机构原始结论');
    expect(fortune.note).toContain('普通公开GET可达');
    expect(mamava.verificationStatus).toBe('verified');
    expect(mamava.note).toContain('2,842份回复');
    expect(mamava.gap).toContain('不支撑全球用户画像');
  });

  it('keeps customs public adapter as source planning evidence instead of shipment facts', () => {
    const customs = getSourceRegistryItem('ds-006');

    expect(customs.sourceName).toContain('U.S. Census');
    expect(customs.sourceName).toContain('Import Genius gate');
    expect(customs.collectionMethod).toBe('connector-required');
    expect(customs.evidenceGrade).toBe('LO-S-synthetic');
    expect(customs.canDisplayAsFact).toBe(false);
    expect(customs.evidenceArtifactPath).toBe('public/periodic-data/customs-public-adapter.json');
    expect(customs.claimScope).toContain('not shipment');
    expect(customs.note).toContain('HTS 8413.81.0040');
    expect(customs.note).toContain('不支撑进口商');
    expect(customs.action).toContain('release review');
  });

  it('binds every static-data page from the weekly audit backlog to a registry item', () => {
    const pages = [
      'AIGallery',
      'DataManage',
      'DataSourcePage',
      'DesignAssistant',
      'ReviewAnalysis',
      'YoutubeReview',
      'FlavorMap',
      'FlavorReport',
      'SupplyChain',
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
      'AIGallery',
      'DesignAssistant',
      'ReviewAnalysis',
      'YoutubeReview',
      'FlavorMap',
      'FlavorReport',
      'SupplyChain',
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

  it('promotes AI assistant only as a static local code asset while keeping runtime claims gated', () => {
    const assistant = getSourceRegistryItem('ds-025');

    expect(assistant.verificationStatus).toBe('verified');
    expect(assistant.collectionMethod).toBe('local-file-check');
    expect(assistant.evidenceGrade).toBe('L1-public-or-runtime');
    expect(assistant.canDisplayAsFact).toBe(true);
    expect(assistant.sourceName).toBe('app/src/pages/AIAssistantPage.tsx');
    expect(assistant.claimScope).toContain('static AI assistant entry');
    expect(assistant.note).toContain('不代表真实助手调用量');
    expect(assistant.note).toContain('模型效果');
  });

  it('keeps P0 connector gaps as explicit L0 readiness gates instead of fact surfaces', () => {
    const p0ConnectorSourceIds = ['ds-007', 'ds-009', 'ds-010', 'ds-013', 'ds-019', 'ds-021', 'ds-023', 'ds-032', 'ds-038', 'ds-039', 'ds-041'];
    const p0Sources = p0ConnectorSourceIds.map((id) => getSourceRegistryItem(id));

    expect(p0Sources.every((item) => item.collectionMethod === 'connector-required')).toBe(true);
    expect(p0Sources.every((item) => item.evidenceGrade === 'L0-unverified')).toBe(true);
    expect(p0Sources.every((item) => item.privacyLevel === 'private/internal')).toBe(true);
    expect(p0Sources.every((item) => item.canDisplayAsFact === false)).toBe(true);
    expect(p0Sources.every((item) => item.blockingReason === 'authorized-connector-or-private-snapshot-required')).toBe(true);
    expect(p0Sources.every((item) => item.evidenceArtifactPath === 'tmp/audits/p0-connector-readiness-binding-batch4-20260630/readiness_packets.csv')).toBe(true);
    expect(p0Sources.map((item) => item.note).join(' ')).toContain('P0');
    expect(p0Sources.map((item) => item.action).join(' ')).toContain('证据包');
    expect(p0Sources.map((item) => item.claimScope).join(' ')).toContain('readiness gate only');
  });

  it('promotes bounded public industry evidence without implying legal, patent, or benchmark conclusions', () => {
    const policy = getSourceRegistryItem('ds-016');
    const patents = getSourceRegistryItem('ds-017');
    const news = getSourceRegistryItem('ds-034');
    const tech = getSourceRegistryItem('ds-036');

    expect([policy, patents, news, tech].every((item) => item.verificationStatus === 'verified')).toBe(true);
    expect([policy, patents, news, tech].every((item) => item.evidenceGrade === 'L1-public-or-runtime')).toBe(true);
    expect([policy, patents, news, tech].every((item) => item.collectionMethod === 'public-url-check')).toBe(true);
    expect(policy.note).toContain('METI日本入口快照返回Page Not Found');
    expect(policy.note).toContain('不支撑SKU合规结论');
    expect(patents.note).toContain('不支撑专利数量');
    expect(news.claimScope).toContain('verified rows only');
    expect(tech.note).toContain('不支撑性能排名');
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
