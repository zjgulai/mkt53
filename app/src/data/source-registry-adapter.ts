import type {
  SourceRegistryItem,
  SourceReliability,
  VerificationStatus,
} from '@/data/source-registry';

export type DataSourceRegistryMode = 'static' | 'api';
export type DataSourceRegistryErrorKind = 'offline' | 'network' | 'http' | 'invalid-response';

export interface DataSourceRegistryRuntime {
  mode: DataSourceRegistryMode;
  requestedMode: DataSourceRegistryMode;
  isProduction: boolean;
  productionForcedStatic: boolean;
}

export interface FetchDataSourceRegistryOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  isOnline?: () => boolean;
  signal?: AbortSignal;
}

const PAGE_SIZE = 200;
const MAX_SOURCE_COUNT = 10_000;
const reliabilities = new Set<SourceReliability>(['A', 'B', 'C', 'D']);
const verificationStatuses = new Set<VerificationStatus>(['verified', 'needs-review', 'example']);
const privacyLevels = new Set<SourceRegistryItem['privacyLevel']>(['public', 'private/internal', 'sensitive', 'secret']);
const collectionMethods = new Set<SourceRegistryItem['collectionMethod']>([
  'public-url-check',
  'connector-required',
  'manual-required',
  'local-file-check',
]);
const evidenceGrades = new Set<SourceRegistryItem['evidenceGrade']>([
  'L0-unverified',
  'L1-public-or-runtime',
  'L2-fixture-or-dry-run',
  'L3-production-read-only',
  'LO-S-synthetic',
]);

export class DataSourceRegistryLoadError extends Error {
  readonly kind: DataSourceRegistryErrorKind;
  readonly status?: number;

  constructor(kind: DataSourceRegistryErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'DataSourceRegistryLoadError';
    this.kind = kind;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string') {
    throw new DataSourceRegistryLoadError('invalid-response', `Invalid source API field: ${field}`);
  }
  return value;
}

function optionalString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new DataSourceRegistryLoadError('invalid-response', `Invalid source API field: ${field}`);
  }
  return value;
}

function requireBoolean(record: Record<string, unknown>, field: string): boolean {
  const value = record[field];
  if (typeof value !== 'boolean') {
    throw new DataSourceRegistryLoadError('invalid-response', `Invalid source API field: ${field}`);
  }
  return value;
}

function requireInteger(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DataSourceRegistryLoadError('invalid-response', `Invalid source API field: ${field}`);
  }
  return value;
}

function requireEnum<T extends string>(record: Record<string, unknown>, field: string, values: Set<T>): T {
  const value = requireString(record, field);
  if (!values.has(value as T)) {
    throw new DataSourceRegistryLoadError('invalid-response', `Invalid source API field: ${field}`);
  }
  return value as T;
}

function mapApiSource(value: unknown): SourceRegistryItem {
  if (!isRecord(value)) {
    throw new DataSourceRegistryLoadError('invalid-response', 'Invalid source API item');
  }

  const lifecycleStatus = requireString(value, 'lifecycleStatus');
  if (lifecycleStatus !== 'active') {
    throw new DataSourceRegistryLoadError('invalid-response', 'Source API returned a non-active item');
  }

  // Validate the complete BE-03 response envelope even though the current page
  // only renders the SourceRegistryItem subset. This keeps contract drift fail closed.
  requireString(value, 'owner');
  requireInteger(value, 'version');
  requireString(value, 'createdAt');
  requireString(value, 'updatedAt');
  optionalString(value, 'withdrawnAt');
  optionalString(value, 'withdrawnReason');

  return {
    id: requireString(value, 'id'),
    module: requireString(value, 'module'),
    page: requireString(value, 'page'),
    metric: requireString(value, 'metric'),
    sourceName: requireString(value, 'sourceName'),
    sourceUrl: optionalString(value, 'sourceUrl'),
    sourceType: requireString(value, 'sourceType'),
    year: requireString(value, 'year'),
    reliability: requireEnum(value, 'reliability', reliabilities),
    verificationStatus: requireEnum(value, 'verificationStatus', verificationStatuses),
    lastVerified: requireString(value, 'lastVerified'),
    note: requireString(value, 'note'),
    gap: requireString(value, 'gap'),
    action: requireString(value, 'action'),
    privacyLevel: requireEnum(value, 'privacyLevel', privacyLevels),
    collectionMethod: requireEnum(value, 'collectionMethod', collectionMethods),
    evidenceGrade: requireEnum(value, 'evidenceGrade', evidenceGrades),
    canDisplayAsFact: requireBoolean(value, 'canDisplayAsFact'),
    blockingReason: requireString(value, 'blockingReason'),
    evidenceArtifactPath: requireString(value, 'evidenceArtifactPath'),
    claimScope: requireString(value, 'claimScope'),
  };
}

function parsePage(value: unknown, expectedOffset: number, expectedTotal?: number) {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new DataSourceRegistryLoadError('invalid-response', 'Invalid source API list response');
  }

  const total = requireInteger(value, 'total');
  const limit = requireInteger(value, 'limit');
  const offset = requireInteger(value, 'offset');
  if (total > MAX_SOURCE_COUNT || limit < 1 || limit > PAGE_SIZE || offset !== expectedOffset) {
    throw new DataSourceRegistryLoadError('invalid-response', 'Invalid source API pagination');
  }
  if (expectedTotal !== undefined && total !== expectedTotal) {
    throw new DataSourceRegistryLoadError('invalid-response', 'Source API total changed during pagination');
  }
  if (value.items.length > limit || offset + value.items.length > total) {
    throw new DataSourceRegistryLoadError('invalid-response', 'Invalid source API page size');
  }

  return { items: value.items.map(mapApiSource), total };
}

function endpointWithPagination(endpoint: string, offset: number) {
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}limit=${PAGE_SIZE}&offset=${offset}`;
}

function defaultIsOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function resolveDataSourceRegistryRuntime(
  requestedValue: string | undefined,
  isProduction: boolean,
): DataSourceRegistryRuntime {
  const requestedMode: DataSourceRegistryMode = requestedValue === 'api' ? 'api' : 'static';
  const productionForcedStatic = isProduction && requestedMode === 'api';

  return {
    requestedMode,
    mode: isProduction ? 'static' : requestedMode,
    isProduction,
    productionForcedStatic,
  };
}

export const dataSourceRegistryRuntime = resolveDataSourceRegistryRuntime(
  import.meta.env.VITE_MKT53_DATA_SOURCE_MODE,
  import.meta.env.PROD,
);

export async function fetchDataSourceRegistry({
  endpoint = '/api/v1/sources',
  fetchImpl = fetch,
  isOnline = defaultIsOnline,
  signal,
}: FetchDataSourceRegistryOptions = {}): Promise<SourceRegistryItem[]> {
  if (!isOnline()) {
    throw new DataSourceRegistryLoadError('offline', 'Browser is offline');
  }

  const sources: SourceRegistryItem[] = [];
  const seenIds = new Set<string>();
  let expectedTotal: number | undefined;

  while (expectedTotal === undefined || sources.length < expectedTotal) {
    let response: Response;
    try {
      response = await fetchImpl(endpointWithPagination(endpoint, sources.length), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (!isOnline()) {
        throw new DataSourceRegistryLoadError('offline', 'Browser went offline while loading sources');
      }
      throw new DataSourceRegistryLoadError('network', 'Source API request failed');
    }

    if (!response.ok) {
      throw new DataSourceRegistryLoadError('http', `Source API returned HTTP ${response.status}`, response.status);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new DataSourceRegistryLoadError('invalid-response', 'Source API did not return valid JSON');
    }

    const page = parsePage(body, sources.length, expectedTotal);
    expectedTotal = page.total;
    if (page.items.length === 0 && sources.length < expectedTotal) {
      throw new DataSourceRegistryLoadError('invalid-response', 'Source API pagination stopped early');
    }

    for (const source of page.items) {
      if (seenIds.has(source.id)) {
        throw new DataSourceRegistryLoadError('invalid-response', `Source API returned duplicate id: ${source.id}`);
      }
      seenIds.add(source.id);
      sources.push(source);
    }
  }

  return sources;
}
