import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildSemiMonthlyRecoveryCandidate,
  compareCandidateContract,
  describeContract,
} from '../../scripts/data/build-semi-monthly-recovery-candidate.mjs';

const cleanupPaths: string[] = [];

afterEach(() => {
  for (const path of cleanupPaths.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

describe('P0-04 semi-monthly recovery candidate', () => {
  it('captures nested fields and every distinct array item shape in the compatibility contract', () => {
    const canonical = describeContract({
      records: [
        { safety: { networkCalls: 1, businessDataWrites: 0 } },
        { safety: { networkCalls: 'unknown', businessDataWrites: 0 } },
      ],
    });
    const reordered = describeContract({
      records: [
        { safety: { networkCalls: 'unknown', businessDataWrites: 0 } },
        { safety: { networkCalls: 1, businessDataWrites: 0 } },
      ],
    });
    const missingVariant = describeContract({
      records: [{ safety: { networkCalls: 1, businessDataWrites: 0 } }],
    });

    expect(reordered).toEqual(canonical);
    expect(missingVariant).not.toEqual(canonical);
  });

  it('accepts live-only evidence fields and changing count-map keys without hiding nested type drift', () => {
    const root = mkdtempSync(join(tmpdir(), 'mkt53-contract-'));
    cleanupPaths.push(root);
    const candidatePath = join(root, 'candidate.json');
    const canonicalPath = join(root, 'canonical.json');
    const candidate = {
      summary: { captureStatusCounts: { planned: 1 } },
      records: [{ seedId: 'seed-1', safety: { networkCalls: 0, businessDataWrites: 0 } }],
    };
    const canonical = {
      summary: { captureStatusCounts: { captured: 1, 'fetch-error': 1 } },
      records: [
        {
          seedId: 'seed-1',
          title: 'Captured title',
          finalUrl: 'https://example.com',
          matchedEvidenceTerms: ['evidence'],
          localEvidence: {
            textArchivePath: 'tmp/public-evidence/text/seed-1.txt',
            textArchiveBytes: 128,
            screenshotPath: 'tmp/public-evidence/screenshots/seed-1.png',
            screenshotHash: 'a'.repeat(64),
          },
          safety: { networkCalls: 1, businessDataWrites: 0 },
        },
        {
          seedId: 'seed-2',
          error: 'timeout',
          safety: { networkCalls: 1, businessDataWrites: 0 },
        },
      ],
    };
    writeFileSync(candidatePath, JSON.stringify(candidate));
    writeFileSync(canonicalPath, JSON.stringify(canonical));

    expect(compareCandidateContract(candidatePath, canonicalPath).compatible).toBe(true);

    canonical.records[0].title = 123 as unknown as string;
    writeFileSync(canonicalPath, JSON.stringify(canonical));
    expect(compareCandidateContract(candidatePath, canonicalPath).compatible).toBe(false);

    canonical.records[0].title = 'Captured title';
    canonical.records[0].matchedEvidenceTerms = 'evidence' as unknown as string[];
    writeFileSync(canonicalPath, JSON.stringify(canonical));
    expect(compareCandidateContract(candidatePath, canonicalPath).compatible).toBe(false);

    canonical.records[0].matchedEvidenceTerms = ['evidence'];
    canonical.records[0].localEvidence.textArchiveBytes = 'oops' as unknown as number;
    writeFileSync(canonicalPath, JSON.stringify(canonical));
    expect(compareCandidateContract(candidatePath, canonicalPath).compatible).toBe(false);

    canonical.records[0].localEvidence.textArchiveBytes = 128;
    canonical.records[0].localEvidence.screenshotHash = 'not-a-sha256';
    writeFileSync(canonicalPath, JSON.stringify(canonical));
    expect(compareCandidateContract(candidatePath, canonicalPath).compatible).toBe(false);

    canonical.records[0].localEvidence.screenshotHash = 'a'.repeat(64);
    canonical.records[1].safety.networkCalls = 'one' as unknown as number;
    writeFileSync(canonicalPath, JSON.stringify(canonical));
    expect(compareCandidateContract(candidatePath, canonicalPath).compatible).toBe(false);
  });

  it('does not treat arbitrary empty and populated arrays as the same contract', () => {
    const root = mkdtempSync(join(tmpdir(), 'mkt53-array-contract-'));
    cleanupPaths.push(root);
    const candidatePath = join(root, 'candidate.json');
    const canonicalPath = join(root, 'canonical.json');
    writeFileSync(candidatePath, JSON.stringify({ requiredAccess: [] }));
    writeFileSync(canonicalPath, JSON.stringify({ requiredAccess: [{ role: 'reviewer' }] }));

    expect(compareCandidateContract(candidatePath, canonicalPath).compatible).toBe(false);
  });

  it('accepts explicitly modeled customs status arrays without accepting malformed blockers', () => {
    const root = mkdtempSync(join(tmpdir(), 'mkt53-status-array-contract-'));
    cleanupPaths.push(root);
    const candidatePath = join(root, 'candidate.json');
    const canonicalPath = join(root, 'canonical.json');
    const candidate = {
      checks: [{ details: { readySeedIds: [] }, blockers: [{ type: 'missing-public-evidence' }] }],
      blockers: [{ type: 'missing-public-evidence' }],
      evidenceRecords: [
        {
          seedId: 'seed-1',
          missingProofFields: ['title'],
          missingMatchedTerms: ['evidence'],
        },
      ],
    };
    const canonical = {
      checks: [{ details: { readySeedIds: ['seed-1'] }, blockers: [] }],
      blockers: [],
      evidenceRecords: [
        {
          seedId: 'seed-1',
          title: 'Captured title',
          visibleTextHash: 'a'.repeat(64),
          localEvidence: { textArchivePath: 'tmp/public-evidence/text/seed-1.txt', textArchiveBytes: 128 },
          missingProofFields: [],
          missingMatchedTerms: [],
        },
      ],
    };
    writeFileSync(candidatePath, JSON.stringify(candidate));
    writeFileSync(canonicalPath, JSON.stringify(canonical));

    expect(compareCandidateContract(candidatePath, canonicalPath).compatible).toBe(true);

    candidate.blockers = [{ type: 42 as unknown as string }];
    writeFileSync(candidatePath, JSON.stringify(candidate));
    expect(compareCandidateContract(candidatePath, canonicalPath).compatible).toBe(false);
  });

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
