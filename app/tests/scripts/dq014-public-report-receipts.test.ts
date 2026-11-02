import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sourceRegistry } from '@/data/source-registry';

const REPO_ROOT = resolve(process.cwd(), '..');
const SEED_PATH = join(
  REPO_ROOT,
  'docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-014-public-report-seeds.json',
);
const VALIDATOR_PATH = 'scripts/data/validate-dq014-public-report-receipts.mjs';
const SOURCE_IDS = ['ds-002', 'ds-044', 'ds-045'] as const;
const tempDirs: string[] = [];

function buildCaptureRecord(sourceId: (typeof SOURCE_IDS)[number], hashCharacter: string) {
  const urls = {
    'ds-002': 'https://www.fortunebusinessinsights.com/breast-pump-market-107054',
    'ds-044': 'https://www.grandviewresearch.com/industry-analysis/baby-products-market',
    'ds-045': 'https://www.fortunebusinessinsights.com/wearable-breast-pumps-market-112880',
  };
  const url = urls[sourceId];

  return {
    seedId: `dq014-${sourceId}`,
    sourceId,
    page: 'MarketPage',
    metric: `${sourceId} public report`,
    evidenceClass: 'market-report-public-page',
    captureStatus: 'captured',
    capturedAt: '2026-07-30T03:00:00.000Z',
    title: `${sourceId} report title`,
    url,
    finalUrl: url,
    collectionBoundary: 'Public landing page only; no paid report extraction.',
    notFullPlatformDataset: true,
    publicBundleAllowed: true,
    rawTextPublicBundleAllowed: false,
    screenshotPublicBundleAllowed: false,
    matchedEvidenceTerms: ['market', '2025'],
    missingEvidenceTerms: [],
    nonVerbatimSummary: `${sourceId} public report terms matched.`,
    visibleTextHash: hashCharacter.repeat(64),
    warnings: [],
    pageErrors: [],
    validation: {
      valid: true,
      missingFields: [],
      urlValid: true,
      termsValid: true,
      boundaryValid: true,
    },
    safety: {
      networkCalls: 1,
      loginAttempted: false,
      bypassAttempted: false,
      businessDataWrites: 0,
      rawTextWrittenToPublicBundle: false,
    },
    localEvidence: {
      textArchivePath: `tmp/public-evidence/dq-014/${sourceId}.txt`,
      screenshotPath: `output/playwright/dq-014/${sourceId}.png`,
      screenshotHash: hashCharacter.repeat(64),
    },
  };
}

function buildFixture() {
  const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-dq014-'));
  tempDirs.push(tempDir);
  const capturePath = join(tempDir, 'capture.json');
  const reviewPath = join(tempDir, 'review.json');
  const records = [
    buildCaptureRecord('ds-002', 'a'),
    buildCaptureRecord('ds-044', 'b'),
    buildCaptureRecord('ds-045', 'c'),
  ];
  const capture = {
    schemaVersion: 1,
    generatedAt: '2026-07-30T03:00:00.000Z',
    mode: 'live-browser-capture',
    publicBundlePolicy: {
      rawTextIncluded: false,
      screenshotsIncluded: false,
      localEvidencePathsMayPointToTmp: true,
    },
    summary: {
      total: 3,
      captureStatusCounts: { captured: 3 },
      networkCalls: 3,
      businessDataWrites: 0,
    },
    records,
  };
  const manualArtifacts = Object.fromEntries(records.map((record) => {
    const artifactPath = join(tempDir, `${record.sourceId}-manual-observation.json`);
    const artifact = {
      schemaVersion: 1,
      gate: 'DQ-014',
      sourceId: record.sourceId,
      publisher: 'Public report publisher',
      canonicalUrl: record.url,
      accessedAt: '2026-07-30T03:05:00.000Z',
      retrievedVia: 'official-public-page-read-only',
      evidenceGrade: 'L1-public-or-runtime',
      pageTitle: record.title,
      publisherUpdatedAt: 'July 2026',
      observedFacts: ['A bounded public landing-page fact was observed.'],
      contradictions: record.sourceId === 'ds-045'
        ? ['Separate sections expose mutually inconsistent market values.']
        : [],
      limitations: ['Public landing page only; not the paid report dataset.'],
      boundaries: {
        loginAttempted: false,
        bypassAttempted: false,
        paidReportExtracted: false,
        rawPageTextStored: false,
        businessDataWrites: 0,
        productionWrites: false,
      },
    };
    const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
    writeFileSync(artifactPath, serialized);
    return [record.sourceId, {
      path: artifactPath,
      sha256: createHash('sha256').update(serialized).digest('hex'),
    }];
  }));
  const review = {
    schemaVersion: 1,
    gate: 'DQ-014',
    reviewedAt: '2026-07-30T03:10:00.000Z',
    maximumEvidenceGrade: 'L1-public-or-runtime',
    boundaries: {
      providerCalls: false,
      restrictedConnectorAccess: false,
      productionWrites: false,
      deployment: false,
      automaticSourceRegistryWrites: false,
      productionSourceRegistryWrites: false,
      localSourceRegistryContractPatch: true,
      pageWrites: false,
      csvFactExport: false,
      factPromotion: false,
      decisionReady: false,
    },
    records: records.map((record) => ({
      sourceId: record.sourceId,
      canonicalUrl: record.url,
      captureVisibleTextHash: record.visibleTextHash,
      manualObservationArtifactPath: manualArtifacts[record.sourceId].path,
      manualObservationArtifactSha256: manualArtifacts[record.sourceId].sha256,
      reviewerAlias: 'codex-public-web-review',
      reviewedAt: '2026-07-30T03:10:00.000Z',
      evidenceGrade: 'L1-public-or-runtime',
      decision: record.sourceId === 'ds-045'
        ? 'blocked_source_inconsistency'
        : 'accepted_for_l1_public_context',
      supportedClaims: ['Public report landing-page context within the declared metric scope.'],
      forbiddenClaims: ['No brand share, channel share, SAM, SOM, sales, or decision-ready claim.'],
      contradictions: record.sourceId === 'ds-045'
        ? ['The page exposes mutually inconsistent market values in separate sections.']
        : [],
      limitations: ['Public landing page only; not the paid report dataset.'],
      sourceRegistryPatchAllowed: true,
      factPromotion: false,
      decisionReady: false,
    })),
  };
  writeFileSync(capturePath, `${JSON.stringify(capture, null, 2)}\n`);
  writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
  return { capturePath, reviewPath, review };
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe('DQ-014 public report manual evidence receipts', () => {
  it('defines exactly three original-source capture seeds with fail-closed public boundaries', () => {
    const payload = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as {
      gate: string;
      seeds: Array<Record<string, unknown>>;
    };

    expect(payload.gate).toBe('DQ-014');
    expect(payload.seeds.map((seed) => seed.sourceId)).toEqual(SOURCE_IDS);
    expect(payload.seeds.every((seed) => seed.notFullPlatformDataset === true)).toBe(true);
    expect(payload.seeds.every((seed) => String(seed.collectionBoundary).includes('no paid report extraction'))).toBe(true);
  });

  it('accepts two bounded L1 receipts while keeping the inconsistent source blocked', () => {
    const { capturePath, reviewPath } = buildFixture();
    const output = execFileSync(
      'node',
      [VALIDATOR_PATH, '--capture', capturePath, '--review', reviewPath, '--json'],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    const payload = JSON.parse(output) as {
      decision: string;
      summary: Record<string, number | string | boolean>;
    };

    expect(payload.decision).toBe('allowed-with-label');
    expect(payload.summary).toMatchObject({
      targetSourceCount: 3,
      validCaptureCount: 3,
      validCaptureDiagnosticCount: 3,
      manualObservationArtifactCount: 3,
      acceptedL1Count: 2,
      blockedSourceInconsistencyCount: 1,
      decisionReadyCount: 0,
      validationPassed: true,
    });
  });

  it('fails closed on grade promotion, production registry writes, hash drift, or approving a contradictory source', () => {
    const { capturePath, reviewPath, review } = buildFixture();
    const invalidReview = {
      ...review,
      maximumEvidenceGrade: 'L3-production-read-only',
      boundaries: { ...review.boundaries, productionSourceRegistryWrites: true },
      records: review.records.map((record) => record.sourceId === 'ds-045'
        ? {
            ...record,
            captureVisibleTextHash: 'f'.repeat(64),
            decision: 'accepted_for_l1_public_context',
          }
        : record),
    };
    writeFileSync(reviewPath, `${JSON.stringify(invalidReview, null, 2)}\n`);

    const result = spawnSync(
      'node',
      [VALIDATOR_PATH, '--capture', capturePath, '--review', reviewPath, '--json'],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).not.toBe(0);
    const payload = JSON.parse(result.stdout) as { blockers: string[] };
    expect(payload.blockers).toEqual(expect.arrayContaining([
      'maximum-evidence-grade-must-remain-l1',
      'boundary-productionSourceRegistryWrites-must-be-false',
      'ds-045:capture-visible-text-hash-mismatch',
      'ds-045:contradictory-source-cannot-be-accepted',
    ]));
  });

  it('binds current receipts and removes ds-045 numeric claims from user-facing surfaces', () => {
    const sourceById = new Map(sourceRegistry.map((source) => [source.id, source]));
    expect(sourceById.get('ds-002')).toMatchObject({
      verificationStatus: 'verified',
      lastVerified: '2026-07-30',
      evidenceGrade: 'L1-public-or-runtime',
      canDisplayAsFact: true,
      evidenceArtifactPath: '../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-014-manual-observation-ds-002-20260730.json',
    });
    expect(sourceById.get('ds-044')).toMatchObject({
      verificationStatus: 'verified',
      lastVerified: '2026-07-30',
      evidenceGrade: 'L1-public-or-runtime',
      canDisplayAsFact: true,
      evidenceArtifactPath: '../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-014-manual-observation-ds-044-20260730.json',
    });
    expect(sourceById.get('ds-045')).toMatchObject({
      verificationStatus: 'needs-review',
      lastVerified: '2026-07-30',
      evidenceGrade: 'L1-public-or-runtime',
      canDisplayAsFact: false,
      blockingReason: 'public-source-internal-inconsistency-and-automation-403',
      evidenceArtifactPath: '../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-014-manual-observation-ds-045-20260730.json',
    });

    const userFacingPaths = [
      'src/data/market-insight-data.ts',
      'src/pages/HomePage.tsx',
      'src/pages/MarketPage.tsx',
      'src/pages/competition/NewCompetition.tsx',
      'src/pages/DataSourcePage.tsx',
      'src/components/SearchPanel.tsx',
      'src/components/OperationsManual.tsx',
    ];
    for (const path of userFacingPaths) {
      const source = readFileSync(join(process.cwd(), path), 'utf8');
      expect(source, path).not.toMatch(/\$233M|15\.08%|wearableTam|ds-045[^'\n]*(?:233|15\.08)/);
    }
  });
});
