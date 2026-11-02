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
  customsPublicAdapter?: {
    status: string;
    sourceId: string;
    mode: string;
    manifestPath?: string;
    allowedClaimScopes?: string[];
    forbiddenClaimScopes?: string[];
    networkCalls?: number;
    businessDataWrites?: number;
  };
  totals: Record<string, number>;
}

export type CollectionManifestPath = '/periodic-data/latest.json' | '/weekly-data/latest.json';
export type CollectionManifestStatus = 'loading' | 'ready' | 'missing';
export type ManifestScheduleStatus = 'scheduled' | 'overdue' | 'unknown';
export type ManifestScheduleTone = 'success' | 'warning' | 'danger';

export function getManifestSchedulePresentation(
  collectionStatus: CollectionManifestStatus,
  scheduleStatus: ManifestScheduleStatus,
): { tone: ManifestScheduleTone; label: string } {
  if (collectionStatus === 'ready' && scheduleStatus === 'scheduled') {
    return { tone: 'success', label: '调度正常' };
  }
  if (collectionStatus === 'ready' && scheduleStatus === 'overdue') {
    return { tone: 'danger', label: '调度逾期' };
  }
  return { tone: 'warning', label: scheduleStatus === 'unknown' ? '调度信息未知' : '采集状态未就绪' };
}

export function formatManifestDateTime(value?: string) {
  if (!value) return '-';
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString('zh-CN', { hour12: false });
}

export function getManifestScheduleStatus(
  value?: string,
  now: Date = new Date(),
): ManifestScheduleStatus {
  if (!value) return 'unknown';

  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) return 'unknown';

  return scheduledAt.getTime() < now.getTime() ? 'overdue' : 'scheduled';
}

export function formatManifestScheduleText(value?: string, now: Date = new Date()) {
  const scheduleStatus = getManifestScheduleStatus(value, now);
  if (scheduleStatus === 'unknown') return '等待调度信息';

  const formatted = formatManifestDateTime(value);
  return scheduleStatus === 'overdue' ? `计划已逾期 ${formatted}` : `下次计划 ${formatted}`;
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
  const scheduleStatus = getManifestScheduleStatus(manifest?.nextScheduledAt);
  const nextScheduleText = formatManifestScheduleText(manifest?.nextScheduledAt);

  return {
    manifest,
    path,
    status,
    totals,
    period,
    generatedAtText,
    windowText,
    scheduleStatus,
    nextScheduleText,
  };
}
