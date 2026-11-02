import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveCurrentPeriodWindow } from '../../scripts/data/lib/current-period-window.mjs';

const tempDirs = new Set<string>();

function createPrivateDir() {
  const privateDir = mkdtempSync(join(tmpdir(), 'mkt53-dq020-private-'));
  chmodSync(privateDir, 0o700);
  tempDirs.add(privateDir);
  return privateDir;
}

afterEach(() => {
  for (const path of tempDirs) rmSync(path, { recursive: true, force: true });
  tempDirs.clear();
});

describe('DQ-020 owner evidence acceptance', () => {
  it('keeps the committed 2026-08-09 receipt fail-closed and redacted', () => {
    const receipt = JSON.parse(readFileSync(
      join(process.cwd(), '../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-020-owner-evidence-acceptance-20260809.json'),
      'utf8',
    )) as {
      acceptanceStatus: string;
      dq020Closed: boolean;
      factPromotionAllowed: boolean;
      packetContract: { summary: { packetCount: number; missingRequiredSlotCount: number } };
      privateSubmission: { ownerSubmissionDetected: boolean };
      mappingPromotion: { coverage: { totalRequiredItems: number; totalMappedItems: number; missingItemCount: number } };
      safety: Record<string, boolean | number>;
    };

    expect(receipt).toMatchObject({
      acceptanceStatus: 'blocked-no-owner-submission',
      dq020Closed: false,
      factPromotionAllowed: false,
      packetContract: { summary: { packetCount: 7, missingRequiredSlotCount: 133 } },
      privateSubmission: { ownerSubmissionDetected: false },
      mappingPromotion: { coverage: { totalRequiredItems: 67, totalMappedItems: 0, missingItemCount: 67 } },
    });
    expect(receipt.safety).toMatchObject({
      credentialValuesIncluded: false,
      asinValuesIncluded: false,
      skuValuesIncluded: false,
      ownerValuesIncluded: false,
      authorizationValuesIncluded: false,
      networkCalls: 0,
      businessDataWrites: 0,
      privateInputWrites: 0,
      productionWrites: 0,
    });
  });

  it('uses the current periodic manifest unless a complete explicit window is provided', () => {
    const privateDir = createPrivateDir();
    const manifestPath = join(privateDir, 'periodic-manifest.json');
    writeFileSync(manifestPath, JSON.stringify({ period: '2030-01-H1', windowStart: '2030-01-01', windowEnd: '2030-01-15' }));
    const current = resolveCurrentPeriodWindow({ manifestPath });
    expect(current).toMatchObject({
      windowStart: '2030-01-01',
      windowEnd: '2030-01-15',
      period: '2030-01-H1',
      source: 'periodic-manifest',
    });
    expect(resolveCurrentPeriodWindow({ windowStart: '2026-06-01', windowEnd: '2026-06-15' })).toMatchObject({
      windowStart: '2026-06-01',
      windowEnd: '2026-06-15',
      source: 'cli',
    });
    expect(() => resolveCurrentPeriodWindow({ windowStart: '2026-06-01' })).toThrow(
      '--window-start and --window-end must be provided together',
    );
  });

  it('keeps an empty private submission blocked and emits only redacted evidence', () => {
    const privateDir = createPrivateDir();
    const manifestPath = join(privateDir, 'periodic-manifest.json');
    writeFileSync(manifestPath, JSON.stringify({ period: '2030-01-H1', windowStart: '2030-01-01', windowEnd: '2030-01-15' }));
    const output = execFileSync(
      'node',
      [
        'scripts/data/build-dq020-amazon-owner-evidence-acceptance.mjs',
        '--private-dir',
        privateDir,
        '--manifest',
        manifestPath,
        '--json',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    const receipt = JSON.parse(output) as {
      acceptanceStatus: string;
      dq020Closed: boolean;
      factPromotionAllowed: boolean;
      currentPeriod: { period: string; windowStart: string; windowEnd: string };
      privateSubmission: { ownerSubmissionDetected: boolean; privateDirectoryMode: string };
      safety: Record<string, boolean | number>;
    };

    expect(receipt).toMatchObject({
      acceptanceStatus: 'blocked-no-owner-submission',
      dq020Closed: false,
      factPromotionAllowed: false,
      currentPeriod: { period: '2030-01-H1', windowStart: '2030-01-01', windowEnd: '2030-01-15' },
      privateSubmission: { ownerSubmissionDetected: false, privateDirectoryMode: '700' },
    });
    expect(receipt.safety).toMatchObject({
      credentialValuesIncluded: false,
      asinValuesIncluded: false,
      skuValuesIncluded: false,
      ownerValuesIncluded: false,
      authorizationValuesIncluded: false,
      privateFileContentsIncluded: false,
      privateFileHashesIncluded: false,
      networkCalls: 0,
      businessDataWrites: 0,
      privateInputWrites: 0,
      productionWrites: 0,
      deployment: false,
      restrictedConnectorAccess: false,
    });
  });

  it('can be imported without a script argv entry', () => {
    const output = execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        "import('./scripts/data/build-dq020-amazon-owner-evidence-acceptance.mjs').then((module) => process.stdout.write(typeof module.buildDq020AmazonOwnerEvidenceAcceptance))",
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(output).toBe('function');
  });

  it('does not treat structurally empty draft JSON as owner content', () => {
    const privateDir = createPrivateDir();
    const manifestPath = join(privateDir, 'periodic-manifest.json');
    writeFileSync(manifestPath, JSON.stringify({ period: '2030-01-H1', windowStart: '2030-01-01', windowEnd: '2030-01-15' }));
    writeFileSync(join(privateDir, 'amazon-commerce-mapping-fill-draft.json'), JSON.stringify({ mappings: [] }), { mode: 0o600 });
    writeFileSync(join(privateDir, 'amazon-commerce-readiness-fill-draft.json'), JSON.stringify({ readiness: {} }), { mode: 0o600 });

    const output = execFileSync(
      'node',
      [
        'scripts/data/build-dq020-amazon-owner-evidence-acceptance.mjs',
        '--private-dir',
        privateDir,
        '--manifest',
        manifestPath,
        '--json',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    const receipt = JSON.parse(output) as {
      acceptanceStatus: string;
      privateSubmission: { ownerSubmissionDetected: boolean; draftValidationReady: boolean };
      readinessPromotion: { checks: { ownerContent: { status: string; detected: boolean } } };
    };

    expect(receipt).toMatchObject({
      acceptanceStatus: 'blocked-no-owner-submission',
      privateSubmission: { ownerSubmissionDetected: false, draftValidationReady: false },
      readinessPromotion: { checks: { ownerContent: { status: 'absent', detected: false } } },
    });
  });

  it('advances complete drafts to independent review without writing formal files', () => {
    const privateDir = createPrivateDir();
    const manifestPath = join(privateDir, 'periodic-manifest.json');
    const mappingPath = join(privateDir, 'amazon-commerce-mapping-fill-draft.json');
    const readinessPath = join(privateDir, 'amazon-commerce-readiness-fill-draft.json');
    const checklistPath = join(privateDir, 'amazon-commerce-readiness-checklist.md');
    const mappingTemplate = JSON.parse(readFileSync(
      join(process.cwd(), 'scripts/data/connectors/templates/amazon-commerce-mapping-template.json'),
      'utf8',
    )) as {
      mappings: Array<{ sourceId: string; site: string; marketplaceId: string; minimumMappedItems: number }>;
    };
    let mappingIndex = 0;
    const mappings = mappingTemplate.mappings.flatMap((source) =>
      Array.from({ length: source.minimumMappedItems }, () => {
        mappingIndex += 1;
        return {
          sourceId: source.sourceId,
          site: source.site,
          marketplaceId: source.marketplaceId,
          asin: `B0${String(mappingIndex).padStart(8, '0')}`,
          sku: `SYNTHETIC-SKU-${mappingIndex}`,
          brand: 'Synthetic Brand',
          productName: `Synthetic Product ${mappingIndex}`,
          category: 'synthetic-category',
          mappingStatus: 'ready',
          mappingUpdatedAt: '2030-01-01',
          mappingOwner: 'synthetic-mapping-owner',
        };
      }),
    );
    const readiness = {
      authorizationRecordId: 'SYNTHETIC-AUTHORIZATION',
      authorizationOwner: 'synthetic-authorization-owner',
      authorizationApprovedAt: '2030-01-01',
      collectionWindowStart: '2030-01-01',
      collectionWindowEnd: '2030-01-15',
      reviewOwner: 'synthetic-review-owner',
      reviewApprovedAt: '2030-01-15',
      complianceReviewer: 'synthetic-compliance-reviewer',
      complianceReviewStatus: 'approved',
      allowedSnapshotTypes: [
        'product_snapshot',
        'review_snapshot',
        'brand_share_snapshot',
        'category_rank_snapshot',
      ],
    };

    writeFileSync(manifestPath, JSON.stringify({ period: '2030-01-H1', windowStart: '2030-01-01', windowEnd: '2030-01-15' }));
    writeFileSync(mappingPath, JSON.stringify({ mappings }), { mode: 0o600 });
    writeFileSync(readinessPath, JSON.stringify({ readiness }), { mode: 0o600 });
    const checklist = execFileSync(
      'node',
      ['scripts/data/connectors/amazon-commerce-readiness-checklist.mjs'],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    writeFileSync(checklistPath, checklist, { mode: 0o600 });
    chmodSync(mappingPath, 0o600);
    chmodSync(readinessPath, 0o600);
    chmodSync(checklistPath, 0o600);

    const output = execFileSync(
      'node',
      [
        'scripts/data/build-dq020-amazon-owner-evidence-acceptance.mjs',
        '--private-dir',
        privateDir,
        '--manifest',
        manifestPath,
        '--json',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    const receipt = JSON.parse(output) as {
      schemaVersion: number;
      acceptanceStatus: string;
      privateSubmission: Record<string, boolean | number | string>;
      privatePromotion: Record<string, boolean | number | string>;
      mappingPromotion: { status: string };
      readinessPromotion: { status: string };
      privateAudit: { status: string };
      safety: Record<string, boolean | number>;
    };

    expect(receipt).toMatchObject({
      schemaVersion: 2,
      acceptanceStatus: 'ready-for-independent-owner-review',
      privateSubmission: {
        status: 'draft-ready-for-independent-review',
        draftFileCount: 2,
        ownerSubmissionDetected: true,
        ownerSubmissionComplete: true,
        draftValidationReady: true,
      },
      privatePromotion: {
        status: 'not-promoted',
        formalFileCount: 0,
        formalFilesComplete: false,
        independentlyAuthorizedWriteRequired: true,
      },
      mappingPromotion: { status: 'ready-to-promote' },
      readinessPromotion: { status: 'ready-to-promote' },
      privateAudit: { status: 'ready-for-readiness-gate' },
    });
    expect(output).not.toContain('B000000001');
    expect(output).not.toContain('SYNTHETIC-SKU');
    expect(output).not.toContain('synthetic-mapping-owner');
    expect(output).not.toContain('SYNTHETIC-AUTHORIZATION');
    expect(receipt.safety).toMatchObject({
      networkCalls: 0,
      businessDataWrites: 0,
      privateInputWrites: 0,
      productionWrites: 0,
      deployment: false,
    });
  });

  it('redacts invalid mapping and readiness identities from Amazon gate JSON', () => {
    const privateDir = createPrivateDir();
    const mappingPath = join(privateDir, 'amazon-commerce-mapping.json');
    writeFileSync(mappingPath, JSON.stringify({
      mappings: [{
        sourceId: 'ds-010',
        site: 'amazon.com',
        marketplaceId: 'ATVPDKIKX0DER',
        asin: 'PRIVATE-ASIN',
        sku: 'PRIVATE-SKU',
        brand: 'Private Brand',
        productName: 'Private Product',
        category: 'private-category',
        mappingStatus: 'ready',
        mappingUpdatedAt: '2026-08-01',
        mappingOwner: 'private-mapping-owner',
      }],
    }), { mode: 0o600 });
    chmodSync(mappingPath, 0o600);

    const output = execFileSync(
      'node',
      [
        'scripts/data/connectors/amazon-commerce-dry-run.mjs',
        '--json',
        '--no-write',
        '--mapping',
        mappingPath,
        '--window-start',
        '2026-08-01',
        '--window-end',
        '2026-08-15',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    const dryRun = JSON.parse(output) as {
      mapping: { invalidMappings: Array<{ rowIndex: number; sourceId: string }> };
      safety: { asinValuesRedacted: boolean; skuValuesRedacted: boolean };
    };

    expect(output).not.toContain('PRIVATE-ASIN');
    expect(output).not.toContain('PRIVATE-SKU');
    expect(output).not.toContain('private-mapping-owner');
    expect(dryRun.mapping.invalidMappings[0]).toMatchObject({ rowIndex: 0, sourceId: 'ds-010' });
    expect(dryRun.safety).toMatchObject({ asinValuesRedacted: true, skuValuesRedacted: true });
  });
});
