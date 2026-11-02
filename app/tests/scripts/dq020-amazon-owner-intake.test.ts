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
  'docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-020-amazon-owner-intake-spec.json',
);
const BUNDLE_PATH = join(
  REPO_ROOT,
  'docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-020-amazon-owner-intake-20260730',
);
const GENERATOR_PATH = 'scripts/data/build-dq020-amazon-owner-intake.mjs';
const VALIDATOR_PATH = 'scripts/data/validate-dq020-amazon-owner-intake.mjs';
const SOURCE_IDS = ['ds-007', 'ds-009', 'ds-010', 'ds-019', 'ds-037', 'ds-038', 'ds-039'] as const;
const FALSE_BOUNDARIES = [
  'providerCalls',
  'restrictedConnectorAccess',
  'connectorCalls',
  'databaseWrites',
  'productionWrites',
  'deployment',
  'liveCollection',
  'externalSend',
  'realAsinSkuIncluded',
  'credentialValuesIncluded',
  'ownerIdentityIncluded',
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
      localContractDecision: string;
      overallGateDecision: string;
      blockers: string[];
      summary: Record<string, number | boolean>;
    },
  };
}

describe('DQ-020 Amazon source-specific owner intake', () => {
  it('defines the exact seven sources, 67 private mappings, fields, hashes, and fail-closed boundaries', () => {
    const spec = readJson(SPEC_PATH) as {
      gate: string;
      connectorId: string;
      exactSourceIds: string[];
      commonMappingFields: string[];
      snapshotFieldContracts: Record<string, string[]>;
      commonRequiredEvidenceSlots: Array<{ id: string; required: boolean }>;
      boundaries: Record<string, boolean>;
      packets: Array<{
        sourceId: string;
        minimumMappedItems: number;
        requiredSnapshotTypes: string[];
        sourceSpecificEvidenceSlots: Array<{ id: string; required: boolean }>;
      }>;
    };

    expect(spec.gate).toBe('DQ-020');
    expect(spec.connectorId).toBe('amazon-commerce');
    expect(spec.exactSourceIds).toEqual(SOURCE_IDS);
    expect(spec.packets.map((packet) => packet.sourceId)).toEqual(SOURCE_IDS);
    expect(spec.packets.reduce((sum, packet) => sum + packet.minimumMappedItems, 0)).toBe(67);
    expect(spec.commonMappingFields).toEqual(expect.arrayContaining([
      'sourceId',
      'site',
      'marketplaceId',
      'asin',
      'sku',
      'mappingUpdatedAt',
      'mappingOwner',
    ]));
    expect(spec.snapshotFieldContracts.product_snapshot).toEqual(expect.arrayContaining([
      'priceAmount',
      'currency',
      'taxIncluded',
      'promotionType',
      'collectionWindowStart',
      'collectionWindowEnd',
      'schemaVersion',
    ]));
    expect(spec.snapshotFieldContracts.brand_share_snapshot).toEqual(expect.arrayContaining([
      'countryOrRegion',
      'numerator',
      'denominator',
      'unit',
      'metricDefinitionVersion',
    ]));
    expect(spec.commonRequiredEvidenceSlots.map((slot) => slot.id)).toEqual(expect.arrayContaining([
      'site-marketplace-scope',
      'collection-window-timezone',
      'asin-sku-mapping-artifact',
      'asin-sku-mapping-hash',
      'field-dictionary-artifact',
      'field-dictionary-hash',
      'snapshot-content-hash',
    ]));
    expect(spec.packets.every((packet) => packet.sourceSpecificEvidenceSlots.length >= 2)).toBe(true);
    expect(FALSE_BOUNDARIES.every((boundary) => spec.boundaries[boundary] === false)).toBe(true);
  });

  it('validates the committed bundle while keeping owner, mapping, snapshot, and fact readiness at zero', () => {
    const { status, payload } = validateBundle(BUNDLE_PATH);

    expect(status).toBe(0);
    expect(payload.localContractDecision).toBe('allowed-intake-template-only');
    expect(payload.overallGateDecision).toBe('blocked-owner-evidence-required');
    expect(payload.summary).toMatchObject({
      packetCount: 7,
      totalMinimumMappedItems: 67,
      mappedItemCount: 0,
      siteMarketplaceReadyCount: 0,
      collectionWindowReadyCount: 0,
      fieldDictionaryReadyCount: 0,
      snapshotHashReadyCount: 0,
      ownerApprovedCount: 0,
      authorizedSnapshotReadyCount: 0,
      decisionReadyCount: 0,
      factPromotionCount: 0,
      validationPassed: true,
    });
    expect(payload.summary.missingRequiredSlotCount).toBeGreaterThanOrEqual(130);
  });

  it('fails closed on private value completion, authorization, readiness, production writes, or hash tampering', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-dq020-tamper-'));
    tempDirs.push(tempDir);
    cpSync(BUNDLE_PATH, tempDir, { recursive: true });
    const packetPath = join(tempDir, 'packets/dq020-ds-009-amazon-owner-intake.json');
    const packet = readJson(packetPath);
    packet.requiredEvidenceSlots[0].status = 'provided';
    packet.requiredEvidenceSlots[0].value = 'unreviewed-owner';
    packet.readiness.mappedItemCount = 25;
    packet.readiness.siteMarketplaceReady = true;
    packet.readiness.ownerApproved = true;
    packet.decision.readyForAuthorizedConnector = true;
    packet.decision.factPromotionAllowed = true;
    packet.boundaries.productionWrites = true;
    writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);

    const { status, payload } = validateBundle(tempDir);

    expect(status).not.toBe(0);
    expect(payload.localContractDecision).toBe('blocked-local-contract');
    expect(payload.overallGateDecision).toBe('blocked-owner-evidence-required');
    expect(payload.blockers).toEqual(expect.arrayContaining([
      'ds-009:required-slot-must-remain-missing:owner-role-alias',
      'ds-009:mapped-item-count-must-be-zero',
      'ds-009:readiness-siteMarketplaceReady-must-be-false',
      'ds-009:readiness-ownerApproved-must-be-false',
      'ds-009:decision-readyForAuthorizedConnector-must-be-false',
      'ds-009:decision-factPromotionAllowed-must-be-false',
      'ds-009:boundary-productionWrites-must-be-false',
      'manifest-packet-hash-mismatch:ds-009',
    ]));
  });

  it('generates deterministic isolated packets without changing canonical public manifests', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-dq020-generate-'));
    tempDirs.push(tempDir);
    const firstBundle = join(tempDir, 'first');
    const secondBundle = join(tempDir, 'second');
    const canonicalPaths = ['public/periodic-data/latest.json', 'public/weekly-data/latest.json'];
    const before = canonicalPaths.map((path) => readFileSync(join(APP_ROOT, path)));
    const args = [
      GENERATOR_PATH,
      '--spec',
      SPEC_PATH,
      '--generated-at',
      '2026-07-30T10:00:00.000Z',
    ];

    execFileSync('node', [...args, '--output', firstBundle, '--json'], {
      cwd: APP_ROOT,
      encoding: 'utf8',
    });
    execFileSync('node', [...args, '--output', secondBundle, '--json'], {
      cwd: APP_ROOT,
      encoding: 'utf8',
    });

    expect(readFileSync(join(firstBundle, 'manifest.json'), 'utf8')).toBe(
      readFileSync(join(secondBundle, 'manifest.json'), 'utf8'),
    );
    expect(validateBundle(firstBundle)).toMatchObject({
      status: 0,
      payload: {
        localContractDecision: 'allowed-intake-template-only',
        overallGateDecision: 'blocked-owner-evidence-required',
      },
    });
    canonicalPaths.forEach((path, index) => {
      expect(readFileSync(join(APP_ROOT, path))).toEqual(before[index]);
    });
  });

  it('binds all seven registry rows to empty packets without upgrading source facts', () => {
    const sourceById = new Map(sourceRegistry.map((source) => [source.id, source]));
    for (const sourceId of SOURCE_IDS) {
      const source = sourceById.get(sourceId);
      expect(source).toMatchObject({
        verificationStatus: 'needs-review',
        collectionMethod: 'connector-required',
        evidenceGrade: 'L0-unverified',
        canDisplayAsFact: false,
        blockingReason: 'authorized-connector-or-private-snapshot-required',
      });
      expect(source?.evidenceArtifactPath).toBe(
        `../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-020-amazon-owner-intake-20260730/packets/dq020-${sourceId}-amazon-owner-intake.json`,
      );
      expect(source?.note).toContain('DQ-020');
      expect(source?.note).toContain('0 approved');
      expect(source?.action).toContain('私有');
    }
  });
});
