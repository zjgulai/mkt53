import { useEffect, useState } from 'react';

export interface PeriodicCollectionManifest {
  week?: string;
  period?: string;
  periodType?: string;
  windowStart?: string;
  windowEnd?: string;
  timezone?: string;
  nextScheduledAt?: string;
  scheduleCron?: string;
  generatedAt: string;
  refreshCadence: string;
  auditSummary?: {
    pagesWithStaticDataWithoutRegistry?: number;
    issueCount?: number;
    sourceRegistryCount?: number;
  };
  connectorBacklog?: {
    total: number;
    groupCount?: number;
  };
  sourceTaskQueue?: {
    total: number;
    queueTypeCounts?: Record<string, number>;
    priorityCounts?: Record<string, number>;
    ownerTeamCounts?: Record<string, number>;
  };
  publicEvidence?: {
    mode: string;
    generatedAt: string;
    total: number;
    captureStatusCounts?: Record<string, number>;
    evidenceClassCounts?: Record<string, number>;
    networkCalls: number;
    businessDataWrites: number;
    manifestPath?: string;
  };
  totals: Record<string, number>;
}

export type CollectionManifestPath = '/periodic-data/latest.json' | '/weekly-data/latest.json';
export type CollectionManifestStatus = 'loading' | 'ready' | 'missing';

export function formatManifestDateTime(value?: string) {
  if (!value) return '-';
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString('zh-CN', { hour12: false });
}

export async function fetchCollectionManifest(): Promise<{ manifest: PeriodicCollectionManifest; path: CollectionManifestPath }> {
  const endpoints: CollectionManifestPath[] = ['/periodic-data/latest.json', '/weekly-data/latest.json'];

  for (const path of endpoints) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) continue;

    return {
      manifest: (await response.json()) as PeriodicCollectionManifest,
      path,
    };
  }

  throw new Error('Collection manifest unavailable.');
}

export function usePeriodicManifest() {
  const [manifest, setManifest] = useState<PeriodicCollectionManifest | null>(null);
  const [path, setPath] = useState<CollectionManifestPath>('/periodic-data/latest.json');
  const [status, setStatus] = useState<CollectionManifestStatus>('loading');

  useEffect(() => {
    let active = true;

    fetchCollectionManifest()
      .then(({ manifest: nextManifest, path: nextPath }) => {
        if (!active) return;
        setManifest(nextManifest);
        setPath(nextPath);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setManifest(null);
        setStatus('missing');
      });

    return () => {
      active = false;
    };
  }, []);

  const totals = manifest?.totals ?? {};
  const period = manifest?.period ?? manifest?.week ?? '-';
  const generatedAtText = formatManifestDateTime(manifest?.generatedAt);
  const windowText =
    manifest?.windowStart && manifest?.windowEnd
      ? `${manifest.windowStart} 至 ${manifest.windowEnd}`
      : manifest?.refreshCadence === 'weekly'
        ? '兼容周度窗口'
        : '等待采集窗口';
  const nextScheduleText = manifest?.nextScheduledAt ? `下次计划 ${formatManifestDateTime(manifest.nextScheduledAt)}` : '等待调度信息';

  return {
    manifest,
    path,
    status,
    totals,
    period,
    generatedAtText,
    windowText,
    nextScheduleText,
  };
}
