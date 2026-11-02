import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import RouteReadinessStatus from '@/components/RouteReadinessStatus';
import { routeReadinessProjection } from '@/data/route-readiness.generated';
import { getRouteReadiness } from '@/data/route-readiness';

describe('RouteReadinessStatus', () => {
  it('keeps source readiness separate from decision readiness', () => {
    render(
      <MemoryRouter initialEntries={['/market/trend']}>
        <RouteReadinessStatus />
      </MemoryRouter>,
    );

    const status = screen.getByTestId('route-readiness-status');
    expect(status).toHaveAttribute('data-route', '/market/trend');
    expect(status).toHaveAttribute('data-source-readiness', 'source-backed');
    expect(status).toHaveAttribute('data-decision-readiness', 'not-ready');
    expect(screen.getByText('来源 · 已支撑')).toBeInTheDocument();
    expect(screen.getByText('决策 · 未就绪')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /数据就绪口径/ }));

    expect(screen.getByText('市场趋势已验证信号率')).toBeInTheDocument();
    expect(screen.getByText(/来源可支撑不等于决策就绪/)).toBeInTheDocument();
  });

  it('maps concrete report ids to the governed dynamic route', () => {
    expect(getRouteReadiness('/report/r009')?.route).toBe('/report/:id');
    expect(getRouteReadiness('/report/r009/')?.targetMetricId).toBe('report_claim_approved_citation_rate');
  });

  it('covers every governed route and certifies none as decision-ready yet', () => {
    expect(routeReadinessProjection.routes).toHaveLength(45);
    expect(routeReadinessProjection.routes.every((route) => route.targetMetricContractStatus === 'defined-not-certified')).toBe(true);
    expect(routeReadinessProjection.routes.every((route) => route.decisionReady === false)).toBe(true);
    expect(routeReadinessProjection.routes.filter((route) => route.sourceReadiness === 'source-backed')).toHaveLength(4);
    expect(routeReadinessProjection.routes.filter((route) => route.sourceReadiness === 'partial')).toHaveLength(22);
    expect(routeReadinessProjection.routes.filter((route) => route.sourceReadiness === 'blocked')).toHaveLength(19);
  });

  it('does not render a governance badge for an unknown route', () => {
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <RouteReadinessStatus />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('route-readiness-status')).not.toBeInTheDocument();
  });
});
