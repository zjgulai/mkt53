import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { evaluateBundleAssets } from '../../scripts/quality/check-bundle-budget.mjs';
import {
  assembleReleaseEvidence,
  extractCheckFacts,
  getReleaseCheckPlan,
} from '../../scripts/quality/build-release-evidence.mjs';

const KiB = 1024;
const currentBundleConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), 'scripts/quality/bundle-budgets.json'), 'utf8'),
);
const viteConfigSource = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

const bundleConfig = {
  schemaVersion: 1,
  defaultRule: {
    id: 'route-default',
    pattern: '.*\\.js$',
    targetBytes: 120 * KiB,
    maxBytes: 120 * KiB,
  },
  rules: [
    {
      id: 'legacy-route-temporary-exception',
      pattern: '^LegacyRoute-.*\\.js$',
      targetBytes: 120 * KiB,
      maxBytes: 256 * KiB,
      required: true,
      exception: {
        owner: 'frontend',
        reason: 'Split the existing route before removing this exception.',
        expiresOn: '2026-08-15',
      },
    },
  ],
};

describe('route bundle budget gate', () => {
  it('passes ordinary route chunks at or below the 120 KiB default budget', () => {
    const report = evaluateBundleAssets(
      [{ file: 'HomePage-abc.js', sizeBytes: 120 * KiB }],
      { ...bundleConfig, rules: [] },
      { now: new Date('2026-07-23T00:00:00Z') },
    );

    expect(report.passed).toBe(true);
    expect(report.summary).toMatchObject({ pass: 1, exception: 0, fail: 0 });
  });

  it('fails an ordinary route chunk above the 120 KiB default budget', () => {
    const report = evaluateBundleAssets(
      [{ file: 'HomePage-abc.js', sizeBytes: 120 * KiB + 1 }],
      { ...bundleConfig, rules: [] },
      { now: new Date('2026-07-23T00:00:00Z') },
    );

    expect(report.passed).toBe(false);
    expect(report.assets[0]).toMatchObject({ status: 'fail', ruleId: 'route-default' });
  });

  it('allows a documented legacy route only within its active exception', () => {
    const report = evaluateBundleAssets(
      [{ file: 'LegacyRoute-abc.js', sizeBytes: 239_136 }],
      bundleConfig,
      { now: new Date('2026-07-23T00:00:00Z') },
    );

    expect(report.passed).toBe(true);
    expect(report.assets[0]).toMatchObject({
      status: 'exception',
      ruleId: 'legacy-route-temporary-exception',
      exceptionExpiresOn: '2026-08-15',
    });
  });

  it('fails when a temporary exception is exceeded or expired', () => {
    const oversized = evaluateBundleAssets(
      [{ file: 'LegacyRoute-abc.js', sizeBytes: 256 * KiB + 1 }],
      bundleConfig,
      { now: new Date('2026-07-23T00:00:00Z') },
    );
    const expired = evaluateBundleAssets(
      [{ file: 'LegacyRoute-abc.js', sizeBytes: 239_136 }],
      bundleConfig,
      { now: new Date('2026-08-16T00:00:00Z') },
    );

    expect(oversized.passed).toBe(false);
    expect(oversized.assets[0].reason).toContain('maximum');
    expect(expired.passed).toBe(false);
    expect(expired.assets[0].reason).toContain('expired');
  });

  it('fails when a required named chunk is missing', () => {
    const report = evaluateBundleAssets(
      [{ file: 'HomePage-abc.js', sizeBytes: 10 * KiB }],
      bundleConfig,
      { now: new Date('2026-07-23T00:00:00Z') },
    );

    expect(report.passed).toBe(false);
    expect(report.missingRequiredRules).toEqual(['legacy-route-temporary-exception']);
  });

  it('holds DataManage to the ordinary 120 KiB budget after exception retirement', () => {
    const withinTarget = evaluateBundleAssets(
      [{ file: 'DataManage-abc.js', sizeBytes: 120 * KiB }],
      { ...bundleConfig, rules: [] },
      { now: new Date('2026-07-23T00:00:00Z') },
    );
    const overTarget = evaluateBundleAssets(
      [{ file: 'DataManage-abc.js', sizeBytes: 120 * KiB + 1 }],
      { ...bundleConfig, rules: [] },
      { now: new Date('2026-07-23T00:00:00Z') },
    );

    expect(withinTarget.passed).toBe(true);
    expect(withinTarget.assets[0]).toMatchObject({ status: 'pass', ruleId: 'route-default' });
    expect(overTarget.passed).toBe(false);
    expect(overTarget.assets[0]).toMatchObject({ status: 'fail', ruleId: 'route-default' });
  });

  it('holds the shared chart core to a permanent 180 KiB budget without exceptions', () => {
    const chartRule = currentBundleConfig.rules.find(
      (rule: { id?: string }) => rule.id === 'vendor-chart-core-180-kib',
    );
    const withinTarget = evaluateBundleAssets(
      [
        { file: 'vendor-chart-core-abc.js', sizeBytes: 153_164 },
        { file: 'vendor-react-abc.js', sizeBytes: 220 * KiB },
      ],
      currentBundleConfig,
      { now: new Date('2026-07-27T00:00:00Z') },
    );
    const overTarget = evaluateBundleAssets(
      [
        { file: 'vendor-chart-core-abc.js', sizeBytes: 180 * KiB + 1 },
        { file: 'vendor-react-abc.js', sizeBytes: 220 * KiB },
      ],
      currentBundleConfig,
      { now: new Date('2026-07-27T00:00:00Z') },
    );

    expect(chartRule).toMatchObject({
      targetBytes: 180 * KiB,
      maxBytes: 180 * KiB,
      required: true,
    });
    expect(currentBundleConfig.rules.some((rule: { exception?: unknown }) => rule.exception)).toBe(false);
    expect(withinTarget.passed).toBe(true);
    expect(withinTarget.assets[0]).toMatchObject({
      status: 'pass',
      ruleId: 'vendor-chart-core-180-kib',
    });
    expect(overTarget.passed).toBe(false);
    expect(overTarget.assets[0]).toMatchObject({
      status: 'fail',
      ruleId: 'vendor-chart-core-180-kib',
    });
  });

  it('keeps chart families route-aware instead of rebuilding the vendor-charts aggregate', () => {
    expect(viteConfigSource).toContain("return 'vendor-chart-core'");
    expect(viteConfigSource).toContain('/recharts/es6/chart/CartesianChart.js');
    expect(viteConfigSource).not.toContain("return 'vendor-charts'");
  });
});

describe('release candidate evidence artifact', () => {
  it('plans all required local evidence checks in one command', () => {
    const plan = getReleaseCheckPlan();

    expect(plan.map((check) => check.id)).toEqual([
      'unit-tests',
      'lint',
      'dependency-audit',
      'build',
      'bundle-budget',
      'data-consistency-audit',
      'data-deep-audit',
      'local-e2e',
    ]);
    expect(plan.find((check) => check.id === 'bundle-budget')?.dependsOn).toBe('build');
  });

  it('marks only a fully passing local candidate ready without implying production verification', () => {
    const checks = getReleaseCheckPlan().map((check) => ({
      id: check.id,
      command: check.command,
      status: 'passed',
      exitCode: 0,
      durationMs: 10,
      stdoutSha256: 'a'.repeat(64),
      stderrSha256: 'b'.repeat(64),
      stdout: 'must not be embedded in the artifact',
      stderr: '',
    }));
    const artifact = assembleReleaseEvidence({
      generatedAt: '2026-07-23T00:00:00.000Z',
      candidate: { branch: 'codex/example', commit: 'abc123', dirty: true },
      checks,
    });

    expect(artifact.summary).toMatchObject({ total: 8, passed: 8, failed: 0, skipped: 0, localCandidateReady: true });
    expect(artifact.boundaries).toEqual({
      evidenceLayer: 'L1-local',
      productionDeploy: false,
      productionVerified: false,
      productionWrites: false,
      providerCalls: false,
      restrictedConnectorCalls: false,
    });
    expect(artifact.checks[0]).not.toHaveProperty('stdout');
    expect(artifact.production).toEqual({ status: 'not-verified' });
  });

  it('keeps a failed or dependency-skipped candidate unready', () => {
    const artifact = assembleReleaseEvidence({
      generatedAt: '2026-07-23T00:00:00.000Z',
      candidate: { branch: 'codex/example', commit: 'abc123', dirty: false },
      checks: [
        { id: 'build', command: 'npm run build', status: 'failed', exitCode: 1, durationMs: 5 },
        { id: 'bundle-budget', command: 'npm run quality:bundle-budget', status: 'skipped', exitCode: null, durationMs: 0 },
      ],
    });

    expect(artifact.summary).toMatchObject({ passed: 0, failed: 1, skipped: 1, localCandidateReady: false });
  });

  it('extracts safe counts while retaining hashes instead of raw command output', () => {
    expect(extractCheckFacts('unit-tests', 'Test Files  9 passed (9)\nTests  109 passed (109)')).toEqual({
      testFilesPassed: 9,
      testsPassed: 109,
    });
    expect(extractCheckFacts('local-e2e', '138 passed (1.4m)')).toEqual({ testsPassed: 138 });
    expect(
      extractCheckFacts(
        'bundle-budget',
        'npm header\n{"summary":{"totalAssets":60,"pass":58,"exception":2,"fail":0}}',
      ),
    ).toEqual({ assets: 60, withinTarget: 58, temporaryExceptions: 2, failures: 0 });
  });
});
