import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildRegulationSkuContractReport,
  validateRegulationSkuContract,
} from '../../scripts/data/validate-regulation-sku-contract.mjs';

const fixturePath = 'tests/fixtures/regulation-sku-matrix.synthetic.json';

function readFixture() {
  return JSON.parse(readFileSync(fixturePath, 'utf8'));
}

function officialFixture() {
  const fixture = readFixture();
  const record = fixture.records[0];
  fixture.evidenceClass = 'official-source-snapshot';
  Object.assign(record.source, {
    sourceRegistryId: 'policy-cpsc-efiling',
    jurisdiction: 'US',
    authority: 'U.S. Consumer Product Safety Commission',
    title: 'CPSC eFiling',
    officialUrl: 'https://www.cpsc.gov/eFiling',
    retrievedAt: '2026-07-24T00:00:00Z',
    contentSha256: 'a'.repeat(64),
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
  });
  Object.assign(record.decision, {
    applicability: 'in-scope',
    status: 'approved',
    reviewerId: 'reviewer-1',
    reviewedAt: '2026-07-24T01:00:00Z',
    reason: 'Fixture verifies the official-source publication contract.',
  });
  Object.assign(record.evidence, {
    snapshotId: 'snap-cpsc-efiling-20260724',
    reviewDecisionId: 'review-cpsc-efiling-20260724',
    sourceEvidencePath: 'tmp/regulation/cpsc-efiling.json',
  });
  Object.assign(record.publication, {
    canDisplayAsComplianceFact: true,
    blockedReasons: [],
  });
  Object.assign(fixture.disclosure, {
    officialSnapshots: 1,
    reviewedSkuDecisions: 1,
    publishableComplianceFacts: 1,
  });
  return fixture;
}

describe('DATA-REG regulation to SKU contract', () => {
  it('accepts the contract-only synthetic fixture with zero publishable facts', () => {
    const report = buildRegulationSkuContractReport(readFixture(), fixturePath);

    expect(report).toMatchObject({
      passed: true,
      status: 'contract-valid',
      evidenceGrade: 'L2-fixture-or-dry-run',
      counts: {
        records: 1,
        officialSnapshots: 0,
        reviewedSkuDecisions: 0,
        publishableComplianceFacts: 0,
      },
      boundaries: {
        noNetwork: true,
        providerCalls: 0,
        connectorCalls: 0,
        businessDataWrites: 0,
        canonicalPublicWrites: 0,
        productionWrites: 0,
        deployment: false,
        legalConclusionGenerated: false,
        factPromotion: false,
      },
    });
  });

  it('rejects missing required fields', () => {
    const fixture = readFixture();
    delete fixture.records[0].decision.scopeBasis;

    const result = validateRegulationSkuContract(fixture);
    expect(result.passed).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: 'records[0].decision.scopeBasis',
      code: 'required',
    }));
  });

  it('rejects synthetic fact promotion or a synthetic applicability decision', () => {
    const fixture = readFixture();
    fixture.records[0].decision.applicability = 'in-scope';
    fixture.records[0].publication.canDisplayAsComplianceFact = true;

    const result = validateRegulationSkuContract(fixture);
    expect(result.passed).toBe(false);
    expect(result.errors.map((error: { code: string }) => error.code)).toEqual(expect.arrayContaining([
      'synthetic-applicability',
      'synthetic-fact-promotion',
      'official-evidence-required',
    ]));
  });

  it('rejects an approved decision without official evidence and legal review fields', () => {
    const fixture = readFixture();
    fixture.evidenceClass = 'official-source-snapshot';
    fixture.records[0].decision.status = 'approved';

    const result = validateRegulationSkuContract(fixture);
    expect(result.passed).toBe(false);
    expect(result.errors.map((error: { code: string }) => error.code)).toEqual(expect.arrayContaining([
      'source-not-allowlisted',
      'official-host-not-allowlisted',
      'sha256-required',
      'snapshot-required',
      'reviewer-required',
      'review-decision-required',
    ]));
  });

  it('accepts a complete official snapshot only for its registry-specific authority host', () => {
    expect(validateRegulationSkuContract(officialFixture())).toEqual({ passed: true, errors: [] });
  });

  it('rejects an untrusted authority host, unsafe evidence path, and invalid effective dates', () => {
    const fixture = officialFixture();
    Object.assign(fixture.records[0].source, {
      officialUrl: 'https://evil.example/phish',
      retrievedAt: '2026-02-30T00:00:00Z',
      effectiveFrom: '2026-02-30',
      effectiveTo: '2026-02-31',
    });
    fixture.records[0].decision.reviewedAt = '2026-02-30T01:00:00Z';
    fixture.records[0].evidence.sourceEvidencePath = '/arbitrary/path';

    const result = validateRegulationSkuContract(fixture);
    expect(result.passed).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'records[0].source.officialUrl', code: 'official-host-not-allowlisted' }),
      expect.objectContaining({ path: 'records[0].source.retrievedAt', code: 'retrieved-at-required' }),
      expect.objectContaining({ path: 'records[0].source.effectiveFrom', code: 'effective-date-required' }),
      expect.objectContaining({ path: 'records[0].source.effectiveTo', code: 'effective-date-required' }),
      expect.objectContaining({ path: 'records[0].decision.reviewedAt', code: 'reviewed-at-required' }),
      expect.objectContaining({ path: 'records[0].evidence.sourceEvidencePath', code: 'safe-evidence-path-required' }),
    ]));
  });

  it('accepts the official Canadian law host but rejects a secondary summary as official evidence', () => {
    const official = officialFixture();
    Object.assign(official.records[0].source, {
      sourceRegistryId: 'ds-016',
      jurisdiction: 'CA',
      authority: 'Justice Canada',
      title: 'Canada Consumer Product Safety Act',
      officialUrl: 'https://laws-lois.justice.gc.ca/eng/acts/c-1.68/',
    });
    expect(validateRegulationSkuContract(official)).toEqual({ passed: true, errors: [] });

    official.records[0].source.authority = 'TUV Rheinland';
    official.records[0].source.title = 'China standards secondary summary';
    official.records[0].source.officialUrl =
      'https://www.tuv.com/regulations-and-standards/en/china-three-gb-standards-on-children-s-product-will-become-effective.html';
    expect(validateRegulationSkuContract(official)).toMatchObject({
      passed: false,
      errors: [expect.objectContaining({ code: 'official-host-not-allowlisted' })],
    });
  });

  it('rejects withdrawn decisions that are still marked publishable', () => {
    const fixture = readFixture();
    fixture.evidenceClass = 'official-source-snapshot';
    fixture.records[0].decision.status = 'withdrawn';
    fixture.records[0].decision.reason = 'Superseded fixture decision.';
    fixture.records[0].publication.canDisplayAsComplianceFact = true;

    const result = validateRegulationSkuContract(fixture);
    expect(result.passed).toBe(false);
    expect(result.errors.map((error: { code: string }) => error.code)).toContain('withdrawn-fact-promotion');
  });

  it('runs the CLI without changing canonical public manifests', () => {
    const canonicalPaths = [
      'public/periodic-data/latest.json',
      'public/weekly-data/latest.json',
    ];
    const before = canonicalPaths.map((path) => readFileSync(path));

    const output = execFileSync('node', ['scripts/data/validate-regulation-sku-contract.mjs', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const report = JSON.parse(output);

    expect(report.passed).toBe(true);
    expect(report.boundaries).toMatchObject({ noNetwork: true, canonicalPublicWrites: 0, productionWrites: 0 });
    canonicalPaths.forEach((path, index) => expect(readFileSync(path)).toEqual(before[index]));
  });
});
