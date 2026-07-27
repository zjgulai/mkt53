import { useCallback, useEffect, useState } from 'react';
import {
  DataSourceRegistryLoadError,
  dataSourceRegistryRuntime,
  fetchDataSourceRegistry,
  type DataSourceRegistryErrorKind,
  type DataSourceRegistryRuntime,
} from '@/data/source-registry-adapter';
import { sourceRegistry, type SourceRegistryItem } from '@/data/source-registry';

export type DataSourceRegistryStatus = 'loading' | 'ready' | 'empty' | 'offline' | 'error';

export interface DataSourceRegistryState {
  runtime: DataSourceRegistryRuntime;
  status: DataSourceRegistryStatus;
  sources: SourceRegistryItem[];
  errorKind?: DataSourceRegistryErrorKind;
  errorMessage?: string;
}

export interface UseDataSourceRegistryResult extends DataSourceRegistryState {
  retry: () => void;
}

type SourceLoader = (options: { signal: AbortSignal }) => Promise<SourceRegistryItem[]>;

function staticState(runtime: DataSourceRegistryRuntime): DataSourceRegistryState {
  const sources: SourceRegistryItem[] = [...sourceRegistry];
  return {
    runtime,
    status: sources.length === 0 ? 'empty' : 'ready',
    sources,
  };
}

function loadingState(runtime: DataSourceRegistryRuntime): DataSourceRegistryState {
  return { runtime, status: 'loading', sources: [] };
}

function publicErrorMessage(error: DataSourceRegistryLoadError) {
  if (error.kind === 'http') return `API 返回 HTTP ${error.status ?? '错误'}。`;
  if (error.kind === 'invalid-response') return 'API 响应未通过来源合同校验。';
  if (error.kind === 'network') return 'API 网络请求失败。';
  return '浏览器当前离线。';
}

export function useDataSourceRegistry(
  runtime: DataSourceRegistryRuntime = dataSourceRegistryRuntime,
  loadSources: SourceLoader = fetchDataSourceRegistry,
): UseDataSourceRegistryResult {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DataSourceRegistryState>(() =>
    runtime.mode === 'static' ? staticState(runtime) : loadingState(runtime),
  );

  useEffect(() => {
    if (runtime.mode === 'static') {
      return undefined;
    }

    const controller = new AbortController();
    loadSources({ signal: controller.signal })
      .then((sources) => {
        setState({
          runtime,
          status: sources.length === 0 ? 'empty' : 'ready',
          sources,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const loadError = error instanceof DataSourceRegistryLoadError
          ? error
          : new DataSourceRegistryLoadError('network', 'Unexpected source API failure');
        setState({
          runtime,
          status: loadError.kind === 'offline' ? 'offline' : 'error',
          sources: [],
          errorKind: loadError.kind,
          errorMessage: publicErrorMessage(loadError),
        });
      });

    return () => controller.abort();
  }, [attempt, loadSources, runtime]);

  const retry = useCallback(() => {
    if (runtime.mode !== 'api') return;
    setState(loadingState(runtime));
    setAttempt((current) => current + 1);
  }, [runtime]);
  return { ...state, retry };
}
