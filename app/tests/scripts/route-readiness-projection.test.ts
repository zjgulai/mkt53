import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildRouteReadinessProjection } from '../../scripts/data/build-route-readiness-projection.mjs';

describe('route readiness projection', () => {
  it('matches the current deep-audit route evidence matrix', () => {
    const output = execFileSync(
      'node',
      ['scripts/data/build-route-readiness-projection.mjs', '--check'],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(output).toContain('Route readiness projection is current');
  }, 60_000);

  it('rejects an unmapped business route before generating browser data', () => {
    const audit = {
      targetMetricContractValidation: {
        passed: true,
        errors: [],
      },
      targetMetricContracts: {
        contractVersion: 'test',
        generatedAt: '2026-07-30T00:00:00Z',
      },
      routeEvidenceMatrix: [
        {
          route: '/missing-source',
          component: 'MissingSourcePage',
          embedded: false,
          source_readiness: 'unmapped',
        },
      ],
    };

    expect(() => buildRouteReadinessProjection(process.cwd(), { audit })).toThrow(
      /source readiness projection rejected.*unmapped/i,
    );
  });

  it('rejects projection when the target metric contract validation failed', () => {
    const audit = {
      targetMetricContractValidation: {
        passed: false,
        errors: [
          {
            path: '$.routes[0].component',
            code: 'component-mismatch',
            message: 'Component does not match App.tsx.',
          },
        ],
      },
      targetMetricContracts: {
        contractVersion: 'test',
        generatedAt: '2026-07-30T00:00:00Z',
      },
      routeEvidenceMatrix: [
        {
          route: '/market/trend',
          component: 'MarketTrend',
          embedded: false,
          source_readiness: 'source-backed',
          source_count: 1,
          displayable_source_count: 1,
          blocked_source_count: 0,
          scope_gap_source_count: 0,
          target_metric_contract_status: 'defined-not-certified',
          target_metric_contract_id: 'market_trend_growth_rate',
          target_metric_name: 'Market trend growth rate',
          target_metric_owner: 'Market Intelligence Owner',
          target_metric_grain: 'month × market',
          decision_ready: false,
        },
      ],
    };

    expect(() => buildRouteReadinessProjection(process.cwd(), { audit })).toThrow(
      /target metric contract validation failed.*component-mismatch/i,
    );
  });
});
