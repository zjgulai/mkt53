import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import {
  projectRegulationIntakeToSkuDraft,
} from '../../scripts/data/project-regulation-intake-to-sku-draft.mjs';
import { validateRegulationSkuContract } from '../../scripts/data/validate-regulation-sku-contract.mjs';

const intakePath = 'tests/fixtures/regulation-source-legal-intake.synthetic.json';
const withdrawalPath = 'tests/fixtures/regulation-intake-withdrawal.synthetic.json';

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('DATA-REG synthetic intake to SKU draft projection', () => {
  it('projects a complete synthetic intake into a fail-closed matrix draft', () => {
    const packet = readJson(intakePath);
    const report = projectRegulationIntakeToSkuDraft(packet, { inputPath: intakePath });

    expect(report).toMatchObject({
      passed: true,
      status: 'synthetic-draft-ready-not-authorized',
      projectionReady: true,
      checks: {
        intakeStatus: 'synthetic-shape-valid-not-authorized',
        intakeGroupsReady: 6,
        matrixContractValid: true,
        crossContractLineageValid: true,
        expectedRecordCount: 1,
        withdrawalBlocked: false,
      },
      decision: {
        authorizedToCollect: false,
        authorizedToEvaluateRealSkus: false,
        authorizedToPublish: false,
        authorizedToWriteProduction: false,
      },
      boundaries: {
        noNetwork: true,
        regulatoryFactsCollected: 0,
        realSkusEvaluated: 0,
        legalConclusionsGenerated: 0,
        canonicalPublicWrites: 0,
        productionWrites: 0,
        factPromotion: false,
      },
    });
    expect(validateRegulationSkuContract(report.matrixDraft)).toEqual({ passed: true, errors: [] });
    expect(report.matrixDraft.records[0]).toMatchObject({
      sku: { skuId: 'fixture-sku-001', targetMarket: 'TEST-ONLY' },
      decision: { applicability: 'unknown', status: 'legal-review-required' },
      evidence: { snapshotId: null, reviewDecisionId: null, sourceEvidencePath: null },
      publication: { canDisplayAsComplianceFact: false, notLegalAdvice: true },
    });
    expect(report.lineage).toMatchObject({
      request: { requestId: 'fixture-request-001' },
      sources: { registryIds: ['fixture-source-001'], materializedOfficialSnapshots: 0 },
      snapshots: { snapshotIds: [], status: 'missing-not-collected' },
      review: { reviewDecisionIds: [], status: 'pending-not-reviewed' },
      withdrawal: { status: 'not-withdrawn' },
    });
  });

  it('is byte-for-byte deterministic for the same canonical input', () => {
    const packet = readJson(intakePath);
    const first = projectRegulationIntakeToSkuDraft(packet, { inputPath: intakePath });
    const second = projectRegulationIntakeToSkuDraft(JSON.parse(JSON.stringify(packet)), { inputPath: intakePath });

    expect(second).toEqual(first);
    expect(second.projectionId).toBe(first.projectionId);
    expect(second.idempotency).toEqual(first.idempotency);
  });

  it('changes the projection identity when the request identity changes', () => {
    const packet = readJson(intakePath);
    const first = projectRegulationIntakeToSkuDraft(packet, { inputPath: intakePath });
    packet.requestId = 'fixture-request-002';
    const second = projectRegulationIntakeToSkuDraft(packet, { inputPath: intakePath });

    expect(second.passed).toBe(true);
    expect(second.projectionId).not.toBe(first.projectionId);
    expect(second.matrixDraft.records[0].id).not.toBe(first.matrixDraft.records[0].id);
  });

  it('rejects incomplete or non-synthetic intake instead of projecting it', () => {
    const packet = readJson('scripts/data/templates/regulation-source-legal-intake-template.json');
    const report = projectRegulationIntakeToSkuDraft(packet, { inputPath: 'scripts/data/templates/regulation-source-legal-intake-template.json' });

    expect(report).toMatchObject({
      passed: false,
      status: 'blocked-intake-not-projectable',
      projectionReady: false,
      projectionId: null,
      matrixDraft: { records: [] },
    });
    expect(report.errors.map((error: { code: string }) => error.code)).toContain('synthetic-6-of-6-required');
  });

  it('blocks every projected record after a valid audited withdrawal event', () => {
    const packet = readJson(intakePath);
    const withdrawal = readJson(withdrawalPath);
    const report = projectRegulationIntakeToSkuDraft(packet, { inputPath: intakePath, withdrawal });

    expect(report).toMatchObject({
      passed: true,
      status: 'blocked-withdrawn',
      projectionReady: false,
      matrixDraft: { records: [] },
      checks: { withdrawalBlocked: true, matrixContractValid: true, crossContractLineageValid: true },
      lineage: { withdrawal: { status: 'withdrawn-blocked', eventId: 'fixture-withdrawal-event-001' } },
    });
    const active = projectRegulationIntakeToSkuDraft(packet, { inputPath: intakePath });
    expect(report.idempotency.key).not.toBe(active.idempotency.key);
  });

  it('fails closed on a mismatched or unaudited withdrawal event', () => {
    const packet = readJson(intakePath);
    const withdrawal = readJson(withdrawalPath);
    withdrawal.requestId = 'fixture-request-other';
    withdrawal.auditEventRecorded = false;

    const report = projectRegulationIntakeToSkuDraft(packet, { inputPath: intakePath, withdrawal });
    expect(report).toMatchObject({ passed: false, status: 'blocked-withdrawal-contract-invalid', projectionReady: false });
    expect(report.errors.map((error: { code: string }) => error.code)).toEqual(expect.arrayContaining([
      'withdrawal-request-mismatch',
      'withdrawal-audit-required',
    ]));
  });

  it('runs from stdout without mutating canonical public manifests', () => {
    const canonicalPaths = ['public/periodic-data/latest.json', 'public/weekly-data/latest.json'];
    const before = canonicalPaths.map((path) => readFileSync(path));
    const output = execFileSync('node', ['scripts/data/project-regulation-intake-to-sku-draft.mjs', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const report = JSON.parse(output);

    expect(report).toMatchObject({ passed: true, status: 'synthetic-draft-ready-not-authorized' });
    canonicalPaths.forEach((path, index) => expect(readFileSync(path)).toEqual(before[index]));
  });

  it('rejects writes outside app/tmp before creating the target', () => {
    const canonicalPath = 'public/regulation-projection-forbidden.json';
    expect(() => execFileSync('node', [
      'scripts/data/project-regulation-intake-to-sku-draft.mjs',
      '--write',
      canonicalPath,
    ], { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' })).toThrow();
    expect(() => readFileSync(canonicalPath)).toThrow();
  });

  it('tightens an existing draft artifact to owner-only permissions on overwrite', () => {
    const tmpRoot = join(process.cwd(), 'tmp');
    mkdirSync(tmpRoot, { recursive: true });
    const tempDir = mkdtempSync(join(tmpRoot, 'regulation-draft-permissions-'));
    const outputPath = join(tempDir, 'draft.json');

    try {
      writeFileSync(outputPath, '{}\n', { mode: 0o644 });
      chmodSync(outputPath, 0o644);
      execFileSync('node', ['scripts/data/project-regulation-intake-to-sku-draft.mjs', '--write', outputPath, '--json'], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });

      expect(statSync(outputPath).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
