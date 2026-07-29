import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataSourceRegistryStatus } from '@/components/DataSourceRegistryStatus';
import { resolveDataSourceRegistryRuntime } from '@/data/source-registry-adapter';
import { sourceRegistry } from '@/data/source-registry';

const apiRuntime = resolveDataSourceRegistryRuntime('api', false);

describe('DataSourceRegistryStatus', () => {
  it('makes loading fail-closed behavior explicit', () => {
    render(<DataSourceRegistryStatus runtime={apiRuntime} status="loading" sources={[]} retry={vi.fn()} />);

    expect(screen.getByTestId('source-registry-loading')).toHaveTextContent('不会回退静态数据');
    expect(screen.getByTestId('source-registry-loading')).toHaveTextContent('不会');
  });

  it('shows distinct empty, offline, and error states with retry', () => {
    const retry = vi.fn();
    const { rerender } = render(<DataSourceRegistryStatus runtime={apiRuntime} status="empty" sources={[]} retry={retry} />);
    expect(screen.getByTestId('source-registry-empty')).toHaveTextContent('0 条来源');
    fireEvent.click(screen.getByRole('button', { name: '重试' }));

    rerender(<DataSourceRegistryStatus runtime={apiRuntime} status="offline" sources={[]} errorMessage="浏览器当前离线。" retry={retry} />);
    expect(screen.getByTestId('source-registry-offline')).toHaveTextContent('不得视作已验证');

    rerender(<DataSourceRegistryStatus runtime={apiRuntime} status="error" sources={[]} errorMessage="API 返回 HTTP 403。" retry={retry} />);
    expect(screen.getByTestId('source-registry-error')).toHaveTextContent('未使用静态 registry 回退成“已复核”');
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('states that production remains static when an API request is configured', () => {
    const productionRuntime = resolveDataSourceRegistryRuntime('api', true);
    render(
      <DataSourceRegistryStatus
        runtime={productionRuntime}
        status="ready"
        sources={[...sourceRegistry]}
        retry={vi.fn()}
      />,
    );

    expect(screen.getByTestId('source-registry-ready')).toHaveTextContent('生产静态 registry（canonical）');
    expect(screen.getByTestId('source-registry-ready')).toHaveTextContent('未发起 API 请求');
  });
});
