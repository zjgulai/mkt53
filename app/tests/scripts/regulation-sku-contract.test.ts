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
      'official-https-required',
      'sha256-required',
      'snapshot-required',
      'reviewer-required',
      'review-decision-required',
    ]));
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
