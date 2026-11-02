import { sourceFreshnessProjection } from '@/data/source-freshness.generated';

export type SourceFreshnessStatus =
  | 'fresh'
  | 'due-soon'
  | 'stale'
  | 'blocked-evidence-unavailable'
  | 'unknown';

export interface SourceFreshnessRecord {
  sourceId: string;
  evidenceGrade: string;
  canDisplayAsFact: boolean;
  collectionMethod: string;
  basisType: string;
  basisDate: string | null;
  warnAfterDays: number | null;
  expireAfterDays: number | null;
  warningAt: string | null;
  expiresAt: string | null;
  ageDays: number | null;
  temporalScore: number;
  effectiveScore: number;
  temporalStatus: SourceFreshnessStatus;
  status: SourceFreshnessStatus;
  artifactPath: string | null;
  artifactAvailable: boolean;
  artifactSha256: string | null;
  expectedArtifactSha256: string | null;
  artifactSha256MatchesContract: boolean;
  refreshReceiptPath: string | null;
  refreshReceiptAvailable: boolean;
  artifactReady: boolean;
  currentUseAllowed: boolean;
  displayDecision:
    | 'allowed-with-freshness-label'
    | 'historical-only-current-blocked'
    | 'blocked-by-evidence-gate';
}

const DAY_MS = 86_400_000;
const sourceFreshnessById = new Map<string, SourceFreshnessRecord>(
  sourceFreshnessProjection.sources.map((source) => [
    source.sourceId,
    source as SourceFreshnessRecord,
  ]),
);

export const sourceFreshnessStatusMeta: Record<
  SourceFreshnessStatus,
  { label: string; color: string; description: string }
> = {
  fresh: { label: '当前新鲜', color: '#34c759', description: '仍在预警窗口之前' },
  'due-soon': { label: '临近过期', color: '#ff9500', description: '已进入预警窗口' },
  stale: { label: '已过期', color: '#ff3b30', description: '已超过来源SLA' },
  'blocked-evidence-unavailable': {
    label: '当前阻断',
    color: '#ff3b30',
    description: '缺少当前artifact、hash合同或刷新回执',
  },
  unknown: { label: '时效未知', color: '#86868b', description: '缺少可计算的时效基准' },
};

function runtimeTemporalStatus(
  basisDate: string | null,
  warnAfterDays: number | null,
  expireAfterDays: number | null,
  asOf: Date,
) {
  const basisTime = basisDate ? new Date(basisDate).getTime() : Number.NaN;
  if (
    !Number.isFinite(basisTime) ||
    !Number.isFinite(asOf.getTime()) ||
    warnAfterDays === null ||
    expireAfterDays === null
  ) {
    return { ageDays: null, score: 0, status: 'unknown' as const };
  }

  const ageDays = Math.max(0, (asOf.getTime() - basisTime) / DAY_MS);
  if (ageDays <= warnAfterDays) {
    return { ageDays: Number(ageDays.toFixed(2)), score: 100, status: 'fresh' as const };
  }
  if (ageDays <= expireAfterDays) {
    const score = Math.max(
      1,
      Math.round(((expireAfterDays - ageDays) / (expireAfterDays - warnAfterDays)) * 100),
    );
    return { ageDays: Number(ageDays.toFixed(2)), score, status: 'due-soon' as const };
  }
  return { ageDays: Number(ageDays.toFixed(2)), score: 0, status: 'stale' as const };
}

export function getSourceFreshness(sourceId: string, asOf = new Date()): SourceFreshnessRecord {
  const record = sourceFreshnessById.get(sourceId);
  if (!record) throw new Error(`Unknown source freshness record: ${sourceId}`);

  const temporal = runtimeTemporalStatus(
    record.basisDate,
    record.warnAfterDays,
    record.expireAfterDays,
    asOf,
  );
  const status: SourceFreshnessStatus =
    record.evidenceGrade === 'L3-production-read-only' && !record.artifactReady
      ? 'blocked-evidence-unavailable'
      : temporal.status;
  const currentUseAllowed = Boolean(
    record.canDisplayAsFact &&
    record.artifactReady &&
    (status === 'fresh' || status === 'due-soon'),
  );

  return {
    ...record,
    ageDays: temporal.ageDays,
    temporalScore: temporal.score,
    effectiveScore: record.artifactReady ? temporal.score : 0,
    temporalStatus: temporal.status,
    status,
    currentUseAllowed,
    displayDecision: currentUseAllowed
      ? 'allowed-with-freshness-label'
      : record.canDisplayAsFact
        ? 'historical-only-current-blocked'
        : 'blocked-by-evidence-gate',
  };
}

export function getSourceFreshnessMeta(status: SourceFreshnessStatus) {
  return sourceFreshnessStatusMeta[status];
}

export function getAllSourceFreshness(asOf = new Date()) {
  return sourceFreshnessProjection.sources.map((source) =>
    getSourceFreshness(source.sourceId, asOf),
  );
}
