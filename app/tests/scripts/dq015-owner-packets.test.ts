import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sourceRegistry } from '@/data/source-registry';

const APP_ROOT = process.cwd();
const REPO_ROOT = resolve(APP_ROOT, '..');
const SPEC_PATH = join(
  REPO_ROOT,
  'docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-015-owner-packet-spec.json',
);
const BUNDLE_PATH = join(
  REPO_ROOT,
  'docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-015-owner-packets-20260730',
);
const GENERATOR_PATH = 'scripts/data/build-dq015-owner-packets.mjs';
const VALIDATOR_PATH = 'scripts/data/validate-dq015-owner-packets.mjs';
const SOURCE_IDS = [
  'ds-014',
  'ds-040',
  'ds-042',
  'policy-cpsc-efiling',
  'policy-eu-mdr-transition',
] as const;
const FALSE_BOUNDARIES = [
  'providerCalls',
  'restrictedConnectorAccess',
  'connectorCalls',
  'databaseWrites',
  'productionWrites',
  'deployment',
  'liveCollection',
  'externalSend',
  'realUserDataIncluded',
  'realSkuEvaluation',
  'legalAdviceGenerated',
  'factPromotion',
  'decisionReady',
] as const;
const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function validateBundle(bundlePath: string) {
  const result = spawnSync(
    'node',
    [VALIDATOR_PATH, '--spec', SPEC_PATH, '--bundle', bundlePath, '--json'],
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

describe('DQ-015 interview, aesthetics, and regulation owner packets', () => {
  it('defines exactly five source-specific packets with fail-closed boundaries', () => {
    const spec = readJson(SPEC_PATH) as {
      gate: string;
      maximumPacketEvidenceGrade: string;
      boundaries: Record<string, boolean>;
      packets: Array<{
        sourceId: string;
        requiredEvidenceSlots: Array<{ id: string; required: boolean }>;
      }>;
    };

    expect(spec.gate).toBe('DQ-015');
    expect(spec.maximumPacketEvidenceGrade).toBe('L2-fixture-or-dry-run');
    expect(spec.packets.map((packet) => packet.sourceId)).toEqual(SOURCE_IDS);
    expect(spec.packets.every((packet) => packet.requiredEvidenceSlots.length >= 10)).toBe(true);
    expect(spec.packets.every((packet) => packet.requiredEvidenceSlots.every((slot) => slot.required))).toBe(true);
    expect(FALSE_BOUNDARIES.every((boundary) => spec.boundaries[boundary] === false)).toBe(true);
  });

  it('validates the committed bundle while keeping every approval and decision count at zero', () => {
    const { status, payload } = validateBundle(BUNDLE_PATH);

    expect(status).toBe(0);
    expect(payload.decision).toBe('allowed-readiness-only');
    expect(payload.summary).toMatchObject({
      packetCount: 5,
      interviewPacketCount: 2,
      aestheticsPacketCount: 1,
      regulationPacketCount: 2,
      ownerApprovedCount: 0,
      reviewerApprovedCount: 0,
      decisionReadyCount: 0,
      factPromotionCount: 0,
      validationPassed: true,
    });
    expect(payload.summary.missingRequiredSlotCount).toBeGreaterThanOrEqual(50);
  });

  it('fails closed on approval, decision readiness, production writes, or completed evidence slots', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-dq015-tamper-'));
    tempDirs.push(tempDir);
    cpSync(BUNDLE_PATH, tempDir, { recursive: true });
    const packetPath = join(tempDir, 'packets/dq015-ds-014-owner-packet.json');
    const packet = readJson(packetPath);
    packet.decision.ownerApproved = true;
    packet.decision.decisionReady = true;
    packet.boundaries.productionWrites = true;
    packet.requiredEvidenceSlots[0].status = 'provided';
    packet.requiredEvidenceSlots[0].value = 'unreviewed-owner';
    writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);

    const { status, payload } = validateBundle(tempDir);

    expect(status).not.toBe(0);
    expect(payload.decision).toBe('blocked');
    expect(payload.blockers).toEqual(expect.arrayContaining([
      'ds-014:owner-approved-must-be-false',
      'ds-014:decision-ready-must-be-false',
      'ds-014:boundary-productionWrites-must-be-false',
      'ds-014:required-slot-must-remain-missing:research-owner',
      'manifest-packet-hash-mismatch:ds-014',
    ]));
  });

  it('generates a deterministic isolated bundle without changing canonical public manifests', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-dq015-generate-'));
    tempDirs.push(tempDir);
    const firstBundle = join(tempDir, 'first');
    const secondBundle = join(tempDir, 'second');
    const canonicalPaths = [
      'public/periodic-data/latest.json',
      'public/weekly-data/latest.json',
    ];
    const before = canonicalPaths.map((path) => readFileSync(join(APP_ROOT, path)));
    const args = [
      GENERATOR_PATH,
      '--spec',
      SPEC_PATH,
      '--generated-at',
      '2026-07-30T08:00:00.000Z',
    ];

    execFileSync('node', [...args, '--output', firstBundle, '--json'], {
      cwd: APP_ROOT,
      encoding: 'utf8',
    });
    execFileSync('node', [...args, '--output', secondBundle, '--json'], {
      cwd: APP_ROOT,
      encoding: 'utf8',
    });

    const firstManifest = readFileSync(join(firstBundle, 'manifest.json'), 'utf8');
    const secondManifest = readFileSync(join(secondBundle, 'manifest.json'), 'utf8');
    expect(firstManifest).toBe(secondManifest);
    expect(validateBundle(firstBundle)).toMatchObject({
      status: 0,
      payload: { decision: 'allowed-readiness-only' },
    });
    canonicalPaths.forEach((path, index) => {
      expect(readFileSync(join(APP_ROOT, path))).toEqual(before[index]);
    });
  });

  it('binds source-specific packets without upgrading registry evidence grades or policy facts', () => {
    const sourceById = new Map(sourceRegistry.map((source) => [source.id, source]));
    expect(sourceById.get('ds-014')).toMatchObject({
      evidenceGrade: 'L0-unverified',
      canDisplayAsFact: false,
      evidenceArtifactPath: '../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-015-owner-packets-20260730/packets/dq015-ds-014-owner-packet.json',
    });
    expect(sourceById.get('ds-040')).toMatchObject({
      evidenceGrade: 'LO-S-synthetic',
      canDisplayAsFact: false,
      evidenceArtifactPath: '../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-015-owner-packets-20260730/packets/dq015-ds-040-owner-packet.json',
    });
    expect(sourceById.get('ds-042')).toMatchObject({
      evidenceGrade: 'L0-unverified',
      canDisplayAsFact: false,
      evidenceArtifactPath: '../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-015-owner-packets-20260730/packets/dq015-ds-042-owner-packet.json',
    });
    for (const sourceId of ['policy-cpsc-efiling', 'policy-eu-mdr-transition']) {
      expect(sourceById.get(sourceId)).toMatchObject({
        evidenceGrade: 'L1-public-or-runtime',
        canDisplayAsFact: true,
        evidenceArtifactPath: 'tmp/audits/source-cross-validation-20260624-batch13-data-point-sources/data_point_source_matrix.csv',
      });
      expect(sourceById.get(sourceId)?.action).toContain('DQ-015 owner packet');
      expect(sourceById.get(sourceId)?.action).toContain('0 approved');
    }

    const pagePaths = [
      'src/pages/users/ConsumerInterviews.tsx',
      'src/pages/users/Aesthetics.tsx',
      'src/pages/users/StoreInterviews.tsx',
      'src/pages/industry/RegulationDetail.tsx',
      'src/pages/industry/PolicyInsight.tsx',
    ];
    for (const pagePath of pagePaths) {
      const source = readFileSync(join(APP_ROOT, pagePath), 'utf8');
      expect(source).toContain('owner packet');
      expect(source).toContain('尚未获批');
    }
  });
});
