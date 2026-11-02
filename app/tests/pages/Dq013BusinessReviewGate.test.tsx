import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SourceBackedReviewPacket from '@/components/SourceBackedReviewPacket';
import AIAssistantPage from '@/pages/AIAssistantPage';
import Exhibition from '@/pages/industry/Exhibition';
import IPAnalysis from '@/pages/industry/IPAnalysis';
import TechNews from '@/pages/industry/TechNews';
import MarketTrend from '@/pages/market/MarketTrend';

const sourceBackedPages = [
  {
    route: '/market/trend',
    Component: MarketTrend,
    heading: '大盘趋势',
    activeNav: '大盘趋势',
    metricId: 'market_trend_verified_signal_rate',
    metricOwner: 'Strategic Insights Owner',
    metricGrain: 'review_cycle × signal × market',
    modelContract: 'trend-signal-review-v1',
    prohibitedUse: '不得解释为销量、GMV、市场份额或外部机构评分',
  },
  {
    route: '/industry/tech',
    Component: TechNews,
    heading: '母婴科技资讯',
    activeNav: '母婴科技资讯',
    metricId: 'technology_spec_comparability_rate',
    metricOwner: 'Product Technology Intelligence Owner',
    metricGrain: 'product_version × specification',
    modelContract: 'technology-spec-ontology-v1',
    prohibitedUse: '不得解释为独立性能排名、实验室结论或技术领先性',
  },
  {
    route: '/industry/ip',
    Component: IPAnalysis,
    heading: 'IP分析',
    activeNav: 'IP分析',
    metricId: 'patent_family_review_coverage',
    metricOwner: 'IP Intelligence Owner',
    metricGrain: 'query_version × patent_family × jurisdiction',
    modelContract: 'patent-query-family-review-v1',
    prohibitedUse: '不得解释为侵权判断、FTO 或法律意见',
  },
  {
    route: '/industry/exhibition',
    Component: Exhibition,
    heading: '展会调研',
    activeNav: '母婴展会调研',
    metricId: 'exhibition_intelligence_action_rate',
    metricOwner: 'Events Intelligence Owner',
    metricGrain: 'exhibition × task × target_entity',
    modelContract: 'exhibition-task-evidence-v1',
    prohibitedUse: '不得解释为线索转化、订单、ROI 或参展成效',
  },
] as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DQ-013 source-backed business review gates', () => {
  it('fails closed when a review packet route is absent from the readiness projection', () => {
    render(
      <SourceBackedReviewPacket
        route="/unmapped-review-candidate"
        modelContract="test-review-v1"
        evidenceScope={['test']}
        allowedUses={['test']}
        prohibitedUses={['test']}
        reviewChecklist={['test']}
      />,
    );

    const packet = screen.getByTestId('source-backed-review-packet');
    expect(packet).toHaveAttribute('data-contract-state', 'invalid');
    expect(packet).toHaveAttribute('data-source-readiness', 'unmapped');
    expect(packet).toHaveTextContent('业务复核候选包已阻断');
    expect(packet).not.toHaveAttribute('data-review-status', 'business-review-candidate');
  });

  for (const page of sourceBackedPages) {
    it(`${page.route} exposes a bounded business-review candidate`, () => {
      render(
        <MemoryRouter initialEntries={[page.route]}>
          <page.Component />
        </MemoryRouter>,
      );

      expect(screen.getByRole('heading', { name: page.heading })).toBeInTheDocument();

      const packet = screen.getByTestId('source-backed-review-packet');
      expect(packet).toHaveAttribute('data-route', page.route);
      expect(packet).toHaveAttribute('data-source-readiness', 'source-backed');
      expect(packet).toHaveAttribute('data-review-status', 'business-review-candidate');
      expect(packet).toHaveAttribute('data-decision-readiness', 'not-ready');
      expect(packet).toHaveAttribute('data-contract-state', 'aligned');
      expect(packet).toHaveAttribute('data-metric-id', page.metricId);
      expect(packet).toHaveAttribute('data-metric-owner', page.metricOwner);
      expect(packet).toHaveAttribute('data-metric-grain', page.metricGrain);
      expect(packet).toHaveTextContent(page.metricOwner);
      expect(packet).toHaveTextContent(page.metricGrain);
      expect(packet).toHaveTextContent(page.modelContract);
      expect(packet).toHaveTextContent('证据范围');
      expect(packet).toHaveTextContent('允许用途');
      expect(packet).toHaveTextContent('禁止用途');
      expect(packet).toHaveTextContent(page.prohibitedUse);
      expect(packet).toHaveTextContent('待签核项');

      const currentLinks = screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page');
      expect(currentLinks).toHaveLength(1);
      expect(currentLinks[0]).toHaveAccessibleName(page.activeNav);
    });
  }

  it('moves the AI assistant root into explicit AI/VOC blocked governance', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(
      <MemoryRouter initialEntries={['/ai-assistant']}>
        <AIAssistantPage />
      </MemoryRouter>,
    );

    const blocker = screen.getByTestId('ai-voc-blocker-panel');
    expect(blocker).toHaveAttribute('data-governance-state', 'blocked');
    expect(blocker).toHaveAttribute('data-source-readiness', 'partial');
    expect(blocker).toHaveAttribute('data-decision-readiness', 'not-ready');
    expect(blocker).toHaveAttribute('data-provider-calls', 'false');
    expect(blocker).toHaveAttribute('data-production-writes', 'false');
    expect(blocker).toHaveTextContent('授权评论/VOC 数据集');
    expect(blocker).toHaveTextContent('模型评估与人工一致率');
    expect(blocker).toHaveTextContent('provider request lineage');
    expect(blocker).toHaveTextContent('fixture / synthetic 不得升级为真实输出');

    const sourceList = screen.getByTestId('evidence-gate-page').querySelector('[data-evidence-source-list]');
    expect(sourceList).not.toBeNull();
    for (const sourceId of ['ds-021', 'ds-022', 'ds-023', 'ds-024', 'ds-029']) {
      expect(sourceList).toHaveTextContent(sourceId);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
