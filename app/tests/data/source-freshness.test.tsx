import { render, screen } from '@testing-library/react';
import { Database } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import MarketDataGate from '@/components/MarketDataGate';
import SourceFreshnessOverview from '@/components/SourceFreshnessOverview';
import { getSourceFreshness } from '@/data/source-freshness';

describe('source freshness runtime gate', () => {
  it('keeps L3 historical evidence separate from current-use readiness', () => {
    const freshness = getSourceFreshness('ds-047', new Date('2026-07-30T09:00:00.000Z'));

    expect(freshness.evidenceGrade).toBe('L3-production-read-only');
    expect(freshness.canDisplayAsFact).toBe(true);
    expect(freshness.status).toBe('blocked-evidence-unavailable');
    expect(freshness.effectiveScore).toBe(0);
    expect(freshness.currentUseAllowed).toBe(false);
    expect(freshness.displayDecision).toBe('historical-only-current-blocked');
  });

  it('recomputes expiry at runtime instead of freezing the generated score', () => {
    const current = getSourceFreshness('ds-002', new Date('2026-07-30T09:00:00.000Z'));
    const expired = getSourceFreshness('ds-002', new Date('2026-10-31T09:00:00.000Z'));

    expect(current.status).toBe('fresh');
    expect(current.currentUseAllowed).toBe(true);
    expect(expired.status).toBe('stale');
    expect(expired.effectiveScore).toBe(0);
    expect(expired.currentUseAllowed).toBe(false);
  });

  it('renders explicit L3 evidence alerts without promoting missing receipts', () => {
    render(
      <SourceFreshnessOverview
        sourceIds={['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']}
      />,
    );

    expect(screen.getByText('当前可用 0/5')).toBeInTheDocument();
    expect(screen.getByText('证据阻断 5')).toBeInTheDocument();
    expect(screen.getAllByText(/当前阻断/)).toHaveLength(5);
    expect(screen.getByText(/静态复核日期不能单独放行/)).toBeInTheDocument();
  });

  it('fails closed instead of rendering an approved internal summary when freshness is blocked', () => {
    render(
      <MemoryRouter>
        <MarketDataGate
          title="测试门禁"
          subtitle="freshness"
          icon={Database}
          accent="#8B354A"
          sourceIds={['ds-005']}
          evidenceTitle="公开证据"
          evidenceDescription="公开证据说明"
          tabs={['数据边界']}
          blockedItems={['等待当前证据']}
          collectionPlan={['补回执']}
          displayPolicy={['失败关闭']}
          gateStatus={{
            sourceIds: ['ds-047', 'ds-049'],
            label: '历史审批',
            description: '旧状态',
            tone: 'approved',
          }}
          internalFactSummary={<p>不应渲染的内部代理数值</p>}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('历史证据保留 · 当前新鲜度阻断')).toBeInTheDocument();
    expect(screen.queryByText('不应渲染的内部代理数值')).not.toBeInTheDocument();
    expect(screen.getByText(/本页不渲染其代理数值或导出内容/)).toBeInTheDocument();
  });
});
