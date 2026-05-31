import { describe, expect, it } from 'vitest';
import * as lazyPages from '@/routes/lazy-pages';

const routeComponentNames = [
  'AIAssistantPage',
  'AIGallery',
  'Aesthetics',
  'BabyCare',
  'BreastPump',
  'CategoryAnalysis',
  'ChannelInterviews',
  'CommentData',
  'CompetitionPage',
  'ConsumerInterviews',
  'CustomsData',
  'DataManage',
  'DataSourcePage',
  'DesignAssistant',
  'Exhibition',
  'FlavorMap',
  'FlavorReport',
  'HomePage',
  'IPAnalysis',
  'IndustryNews',
  'IndustryPage',
  'KnowledgeBase',
  'MarketPage',
  'MarketTrend',
  'NewCompetition',
  'NursingProducts',
  'OverseasSentiment',
  'PolicyInsight',
  'ProductManage',
  'RegionCompetition',
  'RegulationDetail',
  'ReportsPage',
  'ReportPreview',
  'ReviewAnalysis',
  'SelfInsight',
  'StoreInterviews',
  'SupplyChain',
  'TechNews',
  'UsersPage',
  'WebReview',
  'YoutubeReview',
];

describe('lazy route registry', () => {
  it('exports every route component from the lazy registry', () => {
    expect(Object.keys(lazyPages).sort()).toEqual(routeComponentNames.sort());

    for (const component of Object.values(lazyPages)) {
      expect(component).toBeDefined();
      expect(typeof component).toBe('object');
    }
  });
});
