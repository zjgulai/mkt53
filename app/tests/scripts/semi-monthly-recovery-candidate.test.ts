import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

import { buildSemiMonthlyRecoveryCandidate } from '../../scripts/data/build-semi-monthly-recovery-candidate.mjs';

const cleanupPaths: string[] = [];

afterEach(() => {
  for (const path of cleanupPaths.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

describe('P0-04 semi-monthly recovery candidate', () => {
  it('builds an isolated H2 candidate without changing canonical public manifests', async () => {
    const candidateParent = join(process.cwd(), 'tmp/data-collection/recovery-candidates');
    mkdirSync(candidateParent, { recursive: true });
    const candidateRoot = mkdtempSync(join(candidateParent, 'test-'));
    cleanupPaths.push(candidateRoot);
    const canonicalPaths = [
      'public/periodic-data/latest.json',
      'public/periodic-data/public-evidence-samples.json',
      'public/weekly-data/latest.json',
      'public/weekly-data/public-evidence-samples.json',
    ];
    const before = new Map(canonicalPaths.map((path) => [path, readFileSync(path)]));

    const report = await buildSemiMonthlyRecoveryCandidate({
      appRoot: process.cwd(),
      generatedAt: '2026-07-23T06:30:00.000Z',
      outputDir: candidateRoot,
      cronAppDir: '/opt/mkt53/automation/app',
    });

    expect(report.status).toBe('local-candidate-ready');
    expect(report.evidenceGrade).toBe('L2-fixture-or-dry-run');
    expect(report.period).toMatchObject({
      period: '2026-07-H2',
      windowStart: '2026-07-16',
      windowEnd: '2026-07-31',
      nextScheduledAt: '2026-08-01T09:00:00+08:00',
    });
    expect(report.boundaries).toMatchObject({
      noNetwork: true,
      publicEvidenceLiveCapture: false,
      providerCalls: false,
      restrictedConnectorCalls: false,
      businessDataWrites: false,
      canonicalPublicWrites: false,
      productionWrites: false,
      productionDeploy: false,
      cronInstalled: false,
      factPromotion: false,
    });
    expect(report.checks.every((check) => check.status === 'passed')).toBe(true);
    expect(report.checks.find((check) => check.id === 'canonical-contract-compatibility')).toMatchObject({
      status: 'passed',
      facts: { comparisons: expect.arrayContaining([expect.objectContaining({ path: 'periodic-data/latest.json', compatible: true })]) },
    });
    expect(report.publicEvidenceSummary).toMatchObject({ networkCalls: 0, businessDataWrites: 0 });
    expect(report.sourceStatusCounts['connector-required']).toBeGreaterThan(0);
    expect(report.sourceStatusCounts['manual-required']).toBeGreaterThan(0);
    expect(report.releaseDecision).toMatchObject({
      status: 'blocked-auth',
      authorizedToPublish: false,
      authorizedToInstallCron: false,
    });
    const periodicLatest = JSON.parse(readFileSync(join(candidateRoot, 'periodic-data/latest.json'), 'utf8'));
    const weeklyLatest = JSON.parse(readFileSync(join(candidateRoot, 'weekly-data/latest.json'), 'utf8'));
    expect(periodicLatest.publicEvidence.manifestPath).toBe('public/periodic-data/public-evidence-samples.json');
    expect(periodicLatest.customsPublicAdapter.manifestPath).toBe('public/periodic-data/customs-public-adapter.json');
    expect(weeklyLatest).toEqual(periodicLatest);
    for (const file of ['latest.json', 'connectors.json', 'source-tasks.json', 'customs-public-adapter.json', 'public-evidence-samples.json']) {
      expect(readFileSync(join(candidateRoot, 'periodic-data', file))).toEqual(readFileSync(join(candidateRoot, 'weekly-data', file)));
    }
    expect(existsSync(join(candidateRoot, 'recovery-preflight.json'))).toBe(true);
    for (const [path, snapshot] of before) {
      expect(readFileSync(path)).toEqual(snapshot);
    }
  }, 30_000);

  it('makes cron --print a true read-only preview', () => {
    const root = mkdtempSync(join(tmpdir(), 'mkt53-cron-print-'));
    cleanupPaths.push(root);
    const appDir = join(root, 'automation/app');

    const output = execFileSync('bash', ['scripts/data/install-semi-monthly-cron.sh', '--print'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        MKT53_APP_DIR: appDir,
      },
    });

    expect(output).toContain('# mkt53 semi-monthly data refresh');
    expect(output).toContain('0 9 1,16 * *');
    expect(output).toContain(`cd "${appDir}"`);
    expect(output).toContain('npm run data:publish:semi-monthly:local');
    expect(existsSync(appDir)).toBe(false);
  });

  it('rejects candidate outputs outside the recovery-candidates directory', async () => {
    await expect(
      buildSemiMonthlyRecoveryCandidate({
        appRoot: process.cwd(),
        generatedAt: '2026-07-23T06:30:00.000Z',
        outputDir: 'public/periodic-data',
      }),
    ).rejects.toThrow('Recovery candidate output must be a child');
  });
});
