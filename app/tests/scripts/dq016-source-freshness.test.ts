import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sourceRegistry } from '@/data/source-registry';

const APP_ROOT = process.cwd();
const REPO_ROOT = resolve(APP_ROOT, '..');
const POLICY_PATH = join(APP_ROOT, 'contracts/source-freshness-policy.json');
const PROJECTION_PATH = join(
  REPO_ROOT,
  'docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-016-source-freshness-projection-20260730.json',
);
const BUILDER_PATH = 'scripts/data/build-source-freshness-projection.mjs';
const VALIDATOR_PATH = 'scripts/data/validate-source-freshness-projection.mjs';
const L3_SOURCE_IDS = ['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'] as const;
const FALSE_BOUNDARIES = [
  'networkCalls',
  'providerCalls',
  'restrictedConnectorAccess',
  'connectorCalls',
  'databaseWrites',
  'productionWrites',
  'deployment',
  'liveCollection',
  'externalSend',
  'factPromotion',
  'evidenceGradePromotion',
] as const;
const tempDirs: string[] = [];

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function validateProjection(projectionPath: string) {
  const result = spawnSync(
    'node',
    [VALIDATOR_PATH, '--policy', POLICY_PATH, '--projection', projectionPath, '--json'],
    { cwd: APP_ROOT, encoding: 'utf8' },
  );
  return {
    status: result.status,
    payload: JSON.parse(result.stdout) as {
      decision: string;
      blockers: string[];
      summary: Record<string, number | boolean>;
    },
  };
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe('DQ-016 source freshness scoring and expiry alerts', () => {
  it('defines MECE freshness thresholds and forbids date-only L3 readiness', () => {
    const policy = readJson(POLICY_PATH) as {
      gate: string;
      defaultsByCollectionMethod: Record<string, { warnAfterDays: number; expireAfterDays: number }>;
      l3Rules: Record<string, unknown>;
      overrides: Array<Record<string, unknown>>;
      boundaries: Record<string, boolean>;
    };

    expect(policy.gate).toBe('DQ-016');
    expect(Object.keys(policy.defaultsByCollectionMethod).sort()).toEqual([
      'connector-required',
      'local-file-check',
      'manual-required',
      'public-url-check',
    ]);
    expect(Object.values(policy.defaultsByCollectionMethod).every(
      ({ warnAfterDays, expireAfterDays }) => warnAfterDays > 0 && expireAfterDays > warnAfterDays,
    )).toBe(true);
    expect(policy.l3Rules).toMatchObject({
      forbidRegistryLastVerifiedOnly: true,
      requireSnapshotObservedThrough: true,
      requireEvidenceArtifact: true,
      requireArtifactSha256Contract: true,
      requireRefreshReceipt: true,
    });
    expect(policy.overrides.map((entry) => entry.sourceId)).toEqual(L3_SOURCE_IDS);
    expect(FALSE_BOUNDARIES.every((boundary) => policy.boundaries[boundary] === false)).toBe(true);
  });

  it('validates all registry sources while keeping unavailable L3 proxies blocked for current use', () => {
    const { status, payload } = validateProjection(PROJECTION_PATH);

    expect(status).toBe(0);
    expect(payload.decision).toBe('allowed-with-alerts');
    expect(payload.summary).toMatchObject({
      sourceCount: sourceRegistry.length,
      l3SourceCount: 5,
      l3DateOnlyBasisCount: 0,
      l3ArtifactUnavailableCount: 5,
      l3CurrentUseAllowedCount: 0,
      unmappedSourceCount: 0,
      validationPassed: true,
    });
    expect(payload.summary.alertCount).toBeGreaterThanOrEqual(5);
  });

  it('fails closed when an L3 proxy is promoted using only lastVerified', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-dq016-tamper-'));
    tempDirs.push(tempDir);
    const tamperedPath = join(tempDir, 'tampered.json');
    const projection = readJson(PROJECTION_PATH);
    const record = projection.sources.find((entry: { sourceId: string }) => entry.sourceId === 'ds-047');
    record.basisType = 'registry-last-verified-only';
    record.artifactReady = true;
    record.status = 'fresh';
    record.effectiveScore = 100;
    record.currentUseAllowed = true;
    record.displayDecision = 'allowed-with-freshness-label';
    writeFileSync(tamperedPath, `${JSON.stringify(projection, null, 2)}\n`);

    const { status, payload } = validateProjection(tamperedPath);

    expect(status).not.toBe(0);
    expect(payload.decision).toBe('blocked');
    expect(payload.blockers).toEqual(expect.arrayContaining([
      'ds-047:l3-date-only-basis-forbidden',
      'ds-047:l3-artifact-contract-incomplete',
      'ds-047:l3-current-use-must-be-blocked',
      'projection-record-mismatch:ds-047',
    ]));
  });

  it('builds deterministically without modifying canonical periodic manifests', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-dq016-build-'));
    tempDirs.push(tempDir);
    const firstJson = join(tempDir, 'first.json');
    const firstTs = join(tempDir, 'first.ts');
    const secondJson = join(tempDir, 'second.json');
    const secondTs = join(tempDir, 'second.ts');
    const canonicalPaths = [
      'public/periodic-data/latest.json',
      'public/weekly-data/latest.json',
    ];
    const before = canonicalPaths.map((path) => readFileSync(join(APP_ROOT, path)));
    const args = [
      BUILDER_PATH,
      '--policy',
      POLICY_PATH,
      '--as-of',
      '2026-07-30T09:00:00.000Z',
    ];

    execFileSync('node', [...args, '--write-json', firstJson, '--write-ts', firstTs, '--json'], {
      cwd: APP_ROOT,
      encoding: 'utf8',
    });
    execFileSync('node', [...args, '--write-json', secondJson, '--write-ts', secondTs, '--json'], {
      cwd: APP_ROOT,
      encoding: 'utf8',
    });

    expect(readFileSync(firstJson, 'utf8')).toBe(readFileSync(secondJson, 'utf8'));
    expect(readFileSync(firstTs, 'utf8')).toBe(readFileSync(secondTs, 'utf8'));
    expect(validateProjection(firstJson)).toMatchObject({
      status: 0,
      payload: { decision: 'allowed-with-alerts' },
    });
    canonicalPaths.forEach((path, index) => {
      expect(readFileSync(join(APP_ROOT, path))).toEqual(before[index]);
    });
  });

  it('binds freshness alerts without changing historical evidence grades', () => {
    const sourceById = new Map(sourceRegistry.map((source) => [source.id, source]));
    for (const sourceId of L3_SOURCE_IDS) {
      expect(sourceById.get(sourceId)).toMatchObject({
        evidenceGrade: 'L3-production-read-only',
        canDisplayAsFact: true,
      });
      expect(sourceById.get(sourceId)?.blockingReason).toContain('freshness-current-use-blocked');
      expect(sourceById.get(sourceId)?.action).toContain('历史快照');
      expect(sourceById.get(sourceId)?.action).toContain('当前新鲜度阻断');
    }

    const pageBindings = [
      ['src/components/PageEvidenceNotice.tsx', 'getSourceFreshness'],
      ['src/components/MarketDataGate.tsx', 'freshnessBlocked'],
      ['src/pages/DataSourcePage.tsx', 'SourceFreshnessOverview'],
      ['src/pages/DataManage.tsx', 'SourceFreshnessOverview'],
      ['src/pages/MarketPage.tsx', '历史快照'],
      ['src/pages/SelfInsight.tsx', 'erpSelfCurrentUseAllowed'],
      ['src/pages/competition/RegionCompetition.tsx', 'erpRegionCurrentUseAllowed'],
    ] as const;
    for (const [path, marker] of pageBindings) {
      expect(readFileSync(join(APP_ROOT, path), 'utf8')).toContain(marker);
    }
    expect(readFileSync(join(APP_ROOT, 'scripts/data/audit-deep.mjs'), 'utf8')).toContain(
      "!path.endsWith('.generated.ts')",
    );
  });
});
