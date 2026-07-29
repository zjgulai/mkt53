import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDataSourceRegistryRuntime } from '@/data/source-registry-adapter';
import { sourceRegistry } from '@/data/source-registry';
import { useDataSourceRegistry } from '@/hooks/useDataSourceRegistry';
import { usePeriodicManifest } from '@/hooks/usePeriodicManifest';
import DataSourcePage from '@/pages/DataSourcePage';

vi.mock('@/hooks/useDataSourceRegistry');
vi.mock('@/hooks/usePeriodicManifest');

const apiRuntime = resolveDataSourceRegistryRuntime('api', false);
const retry = vi.fn();

describe('DataSourcePage source metrics', () => {
  beforeEach(() => {
    vi.mocked(usePeriodicManifest).mockReturnValue({
      manifest: null,
      path: '/periodic-data/latest.json',
      status: 'ready',
      totals: { total: 53, ok: 16 },
      period: '2026-07-H1',
      generatedAtText: '2026/7/6 11:40:50',
      windowText: '2026-07-01 至 2026-07-15',
      nextScheduleText: '下次计划 2026/7/16 09:00:00',
    });
  });

  it('does not expose manifest source counts while the API registry is unavailable', () => {
    vi.mocked(useDataSourceRegistry).mockReturnValue({
      runtime: apiRuntime,
      status: 'error',
      sources: [],
      errorKind: 'http',
      errorMessage: 'API 返回 HTTP 503。',
      retry,
    });

    render(<DataSourcePage />);

    expect(screen.getByText(/来源数据未加载 · 统计保持未知/)).toBeInTheDocument();
    expect(screen.getByText('来源总数').parentElement).toHaveTextContent('-');
    expect(screen.getByText('公开/本地可验证').parentElement).toHaveTextContent('-');
    expect(screen.queryByText('53条数据溯源')).not.toBeInTheDocument();
  });

  it('uses API-derived source counts instead of static manifest totals when ready', () => {
    vi.mocked(useDataSourceRegistry).mockReturnValue({
      runtime: apiRuntime,
      status: 'ready',
      sources: [sourceRegistry[0]],
      retry,
    });

    render(<DataSourcePage />);

    expect(screen.getByText('来源总数').parentElement).toHaveTextContent('1');
    expect(screen.getByText('来源总数').parentElement).not.toHaveTextContent('53');
    expect(screen.getByText('公开/本地可验证').parentElement).toHaveTextContent('1');
    expect(screen.getByText('公开/本地可验证').parentElement).not.toHaveTextContent('16');
  });
});
