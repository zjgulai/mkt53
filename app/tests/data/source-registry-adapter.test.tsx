import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DataSourceRegistryLoadError,
  fetchDataSourceRegistry,
  resolveDataSourceRegistryRuntime,
} from '@/data/source-registry-adapter';
import { sourceRegistry } from '@/data/source-registry';
import { useDataSourceRegistry } from '@/hooks/useDataSourceRegistry';

function apiSource(id: string) {
  return {
    id,
    module: '看市场',
    page: 'MarketPage',
    metric: '本地 API 合同测试',
    sourceName: 'Contract Fixture',
    sourceUrl: null,
    sourceType: '官方数据',
    year: '2026',
    reliability: 'A',
    verificationStatus: 'verified',
    lastVerified: '2026-07-24',
    note: 'local-only fixture',
    gap: '',
    action: 'OK',
    privacyLevel: 'public',
    collectionMethod: 'public-url-check',
    evidenceGrade: 'L1-public-or-runtime',
    canDisplayAsFact: true,
    blockingReason: '',
    evidenceArtifactPath: '',
    claimScope: 'local adapter contract test only',
    owner: 'team:data-governance',
    lifecycleStatus: 'active',
    version: 1,
    createdAt: '2026-07-24T00:00:00Z',
    updatedAt: '2026-07-24T00:00:00Z',
    withdrawnAt: null,
    withdrawnReason: null,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('source registry runtime mode', () => {
  it('forces production builds to static even when API mode is requested', () => {
    expect(resolveDataSourceRegistryRuntime('api', true)).toEqual({
      requestedMode: 'api',
      mode: 'static',
      isProduction: true,
      productionForcedStatic: true,
    });
  });

  it('only enables API mode for the exact local api value', () => {
    expect(resolveDataSourceRegistryRuntime('api', false).mode).toBe('api');
    expect(resolveDataSourceRegistryRuntime('shadow', false).mode).toBe('static');
    expect(resolveDataSourceRegistryRuntime(undefined, false).mode).toBe('static');
  });
});

describe('fetchDataSourceRegistry', () => {
  it('loads and maps every API page without sending trusted proxy headers', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(init).toMatchObject({
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      expect(JSON.stringify(init?.headers)).not.toMatch(/token|subject|role/i);
      if (url.endsWith('offset=0')) {
        return jsonResponse({ items: [apiSource('src-api-001')], total: 2, limit: 200, offset: 0 });
      }
      return jsonResponse({ items: [apiSource('src-api-002')], total: 2, limit: 200, offset: 1 });
    }) as typeof fetch;

    const result = await fetchDataSourceRegistry({ fetchImpl, isOnline: () => true });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'src-api-001',
      sourceName: 'Contract Fixture',
      sourceUrl: undefined,
      verificationStatus: 'verified',
      canDisplayAsFact: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('preserves a valid empty API response as empty', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ items: [], total: 0, limit: 200, offset: 0 })) as typeof fetch;

    await expect(fetchDataSourceRegistry({ fetchImpl, isOnline: () => true })).resolves.toEqual([]);
  });

  it('reports offline before making a request', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;

    await expect(fetchDataSourceRegistry({ fetchImpl, isOnline: () => false })).rejects.toMatchObject({ kind: 'offline' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('separates HTTP and online network failures', async () => {
    const deniedFetch = vi.fn(async () => jsonResponse({ detail: 'forbidden' }, 403)) as typeof fetch;
    await expect(fetchDataSourceRegistry({ fetchImpl: deniedFetch, isOnline: () => true })).rejects.toMatchObject({
      kind: 'http',
      status: 403,
    });

    const failedFetch = vi.fn(async () => {
      throw new TypeError('network down');
    }) as typeof fetch;
    await expect(fetchDataSourceRegistry({ fetchImpl: failedFetch, isOnline: () => true })).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('fails closed on malformed source fields and pagination', async () => {
    const malformed = { ...apiSource('src-api-001'), verificationStatus: 'approved' };
    const malformedFetch = vi.fn(async () => jsonResponse({ items: [malformed], total: 1, limit: 200, offset: 0 })) as typeof fetch;
    await expect(fetchDataSourceRegistry({ fetchImpl: malformedFetch, isOnline: () => true })).rejects.toMatchObject({
      kind: 'invalid-response',
    });

    const stalledFetch = vi.fn(async () => jsonResponse({ items: [], total: 1, limit: 200, offset: 0 })) as typeof fetch;
    await expect(fetchDataSourceRegistry({ fetchImpl: stalledFetch, isOnline: () => true })).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });
});

describe('useDataSourceRegistry', () => {
  it('uses static canonical data without calling the loader in static mode', () => {
    const runtime = resolveDataSourceRegistryRuntime('static', true);
    const loader = vi.fn();
    const { result } = renderHook(() => useDataSourceRegistry(runtime, loader));

    expect(result.current.status).toBe('ready');
    expect(result.current.sources).toHaveLength(sourceRegistry.length);
    expect(loader).not.toHaveBeenCalled();
  });

  it('keeps sources empty when local API loading fails', async () => {
    const runtime = resolveDataSourceRegistryRuntime('api', false);
    const loader = vi.fn(async () => {
      throw new DataSourceRegistryLoadError('http', 'denied', 403);
    });
    const { result } = renderHook(() => useDataSourceRegistry(runtime, loader));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.sources).toEqual([]);
    expect(result.current.errorMessage).toBe('API 返回 HTTP 403。');
  });

  it('keeps a local API empty result distinct from loading and error', async () => {
    const runtime = resolveDataSourceRegistryRuntime('api', false);
    const loader = vi.fn(async () => []);
    const { result } = renderHook(() => useDataSourceRegistry(runtime, loader));

    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.sources).toEqual([]);
  });
});
