import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildRegulationSourceLegalIntakeReport,
  validateRegulationSourceLegalIntake,
} from '../../scripts/data/validate-regulation-source-legal-intake.mjs';

const templatePath = 'scripts/data/templates/regulation-source-legal-intake-template.json';

function readTemplate() {
  return JSON.parse(readFileSync(templatePath, 'utf8'));
}

function buildSyntheticPacket() {
  const packet = readTemplate();
  packet.inputClass = 'synthetic-readiness-fixture';
  packet.requestId = 'fixture-request-001';
  packet.sourceScope = {
    sourceRegistryIds: ['fixture-source-001'],
    jurisdictionCodes: ['TEST-ONLY'],
    officialSourceHosts: ['regulation-fixture.invalid'],
    allowedDocumentTypes: ['regulation-text'],
    requestedClaimScopes: ['fixture-contract-shape-only'],
    collectionWindowStart: '2026-07-01',
    collectionWindowEnd: '2026-07-31',
    scopeOwnerId: 'fixture-owner-source',
  };
  packet.skuOwnership = {
    skuOwnerId: 'fixture-owner-sku',
    ownerRole: 'TEST-ONLY',
    skuIds: ['fixture-sku-001'],
    targetMarkets: ['TEST-ONLY'],
    authorizationEvidenceRef: 'fixture://authorization/sku-001',
    expiresAt: '2026-08-31T00:00:00.000Z',
  };
  packet.legalReviewWorkflow = {
    ...packet.legalReviewWorkflow,
    reviewerId: 'fixture-reviewer-001',
    reviewerRole: 'TEST-ONLY',
    approvalSlaHours: 48,
    escalationOwnerId: 'fixture-owner-escalation',
    decisionPolicyRef: 'fixture://policy/review-v1',
  };
  packet.evidenceHandoff = {
    ...packet.evidenceHandoff,
    handoffOwnerId: 'fixture-owner-evidence',
    snapshotStoreRef: 'fixture://snapshot-store',
    reviewEventStoreRef: 'fixture://review-events',
    retentionDays: 30,
  };
  packet.withdrawalGovernance = {
    ...packet.withdrawalGovernance,
    withdrawalOwnerId: 'fixture-owner-withdrawal',
    propagationSlaHours: 24,
    affectedSurfaces: ['dashboard', 'csv-export', 'report-export'],
  };
  packet.submissionConfirmations = {
    ownerSubmissionRef: 'fixture://submission/001',
    sourceScopeConfirmedBy: 'fixture-owner-source',
    skuScopeConfirmedBy: 'fixture-owner-sku',
    legalWorkflowConfirmedBy: 'fixture-reviewer-001',
    submittedAt: '2026-07-24T00:00:00.000Z',
  };
  return packet;
}

function buildOwnerPacket() {
  const packet = buildSyntheticPacket();
  packet.inputClass = 'owner-submitted-intake';
  packet.requestId = 'request-001';
  packet.sourceScope = {
    ...packet.sourceScope,
    sourceRegistryIds: ['ds-016'],
    jurisdictionCodes: ['XX'],
    officialSourceHosts: ['regulator.example.org'],
    requestedClaimScopes: ['public-entrypoint-only'],
    scopeOwnerId: 'owner-source-001',
  };
  packet.skuOwnership = {
    ...packet.skuOwnership,
    skuOwnerId: 'owner-sku-001',
    ownerRole: 'product-owner',
    skuIds: ['internal-sku-001'],
    targetMarkets: ['XX'],
    authorizationEvidenceRef: 'record://authorization/sku-001',
  };
  packet.legalReviewWorkflow = {
    ...packet.legalReviewWorkflow,
    reviewerId: 'reviewer-001',
    reviewerRole: 'legal-reviewer',
    escalationOwnerId: 'owner-escalation-001',
    decisionPolicyRef: 'record://policy/review-v1',
  };
  packet.evidenceHandoff = {
    ...packet.evidenceHandoff,
    handoffOwnerId: 'owner-evidence-001',
    snapshotStoreRef: 'record://snapshot-store',
    reviewEventStoreRef: 'record://review-events',
  };
  packet.withdrawalGovernance = {
    ...packet.withdrawalGovernance,
    withdrawalOwnerId: 'owner-withdrawal-001',
  };
  packet.submissionConfirmations = {
    ownerSubmissionRef: 'record://submission/001',
    sourceScopeConfirmedBy: 'owner-source-001',
    skuScopeConfirmedBy: 'owner-sku-001',
    legalWorkflowConfirmedBy: 'reviewer-001',
    submittedAt: '2026-07-24T00:00:00.000Z',
  };
  return packet;
}

describe('DATA-REG source and legal intake readiness', () => {
  it('keeps the empty template structurally valid but fail-closed at 0/6', () => {
    const report = buildRegulationSourceLegalIntakeReport(readTemplate(), { inputPath: templatePath });

    expect(report).toMatchObject({
      passed: true,
      status: 'blocked-required-input',
      readiness: { complete: false, readyGroups: 0, totalGroups: 6 },
      decision: {
        readyForIndependentAuthorizationReview: false,
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
        secretsAccepted: false,
      },
    });
    expect(report.readiness.missingFields.length).toBeGreaterThan(0);
  });

  it('accepts a complete synthetic shape without granting authorization', () => {
    const report = buildRegulationSourceLegalIntakeReport(buildSyntheticPacket(), { inputPath: 'tests/fixtures/synthetic-memory.json' });

    expect(report).toMatchObject({
      passed: true,
      status: 'synthetic-shape-valid-not-authorized',
      readiness: { complete: true, readyGroups: 6, totalGroups: 6, missingFields: [] },
      decision: {
        readyForIndependentAuthorizationReview: false,
        authorizedToCollect: false,
        authorizedToPublish: false,
      },
    });
  });

  it('requires owner-submitted inputs to stay in the ignored private config directory', () => {
    const mislabeledSynthetic = buildSyntheticPacket();
    mislabeledSynthetic.inputClass = 'owner-submitted-intake';
    const mislabeledResult = validateRegulationSourceLegalIntake(mislabeledSynthetic, { appRoot: process.cwd(), inputPath: 'configs/private/regulation-owner-intake.json' });
    expect(mislabeledResult.contractValid).toBe(false);
    expect(mislabeledResult.errors.map((error: { code: string }) => error.code)).toContain('synthetic-marker-forbidden');

    const packet = buildOwnerPacket();

    const outside = validateRegulationSourceLegalIntake(packet, { appRoot: process.cwd(), inputPath: 'tests/fixtures/owner-intake.json' });
    expect(outside.contractValid).toBe(false);
    expect(outside.errors.map((error: { code: string }) => error.code)).toContain('private-input-path-required');

    const privateReport = buildRegulationSourceLegalIntakeReport(packet, { appRoot: process.cwd(), inputPath: 'configs/private/regulation-owner-intake.json' });
    expect(privateReport).toMatchObject({
      passed: true,
      status: 'ready-for-independent-authorization-review',
      decision: { readyForIndependentAuthorizationReview: true, authorizedToCollect: false, authorizedToPublish: false },
    });
  });

  it('rejects unregistered source ids in owner submissions', () => {
    const packet = buildOwnerPacket();
    packet.sourceScope.sourceRegistryIds = ['unknown-source'];

    const result = validateRegulationSourceLegalIntake(packet, { appRoot: process.cwd(), inputPath: 'configs/private/regulation-owner-intake.json' });
    expect(result.contractValid).toBe(false);
    expect(result.errors.map((error: { code: string }) => error.code)).toContain('source-not-allowlisted');
  });

  it('rejects secret-shaped fields and weakened disclosure controls', () => {
    const packet = readTemplate();
    packet.apiToken = 'must-not-be-accepted';
    packet.disclosure.noLiveCollection = false;

    const result = validateRegulationSourceLegalIntake(packet, { inputPath: templatePath });
    expect(result.contractValid).toBe(false);
    expect(result.errors.map((error: { code: string }) => error.code)).toEqual(expect.arrayContaining([
      'additional-property',
      'sensitive-key-forbidden',
      'disclosure-boundary-required',
    ]));
  });

  it('keeps incomplete withdrawal governance blocked', () => {
    const packet = buildSyntheticPacket();
    packet.withdrawalGovernance.propagationSlaHours = null;
    packet.withdrawalGovernance.affectedSurfaces = ['dashboard'];

    const report = buildRegulationSourceLegalIntakeReport(packet, { inputPath: 'tests/fixtures/synthetic-memory.json' });
    expect(report.status).toBe('blocked-required-input');
    expect(report.readiness.readyGroups).toBe(5);
    expect(report.readiness.groups.find((group: { id: string }) => group.id === 'withdrawal-governance')).toMatchObject({ ready: false });
  });

  it('rejects impossible calendar dates and timezone-less review timestamps', () => {
    const packet = buildSyntheticPacket();
    packet.generatedAt = '2026-02-30T00:00:00.000Z';
    packet.sourceScope.collectionWindowStart = '2026-02-30';
    packet.sourceScope.collectionWindowEnd = '2026-13-01';
    packet.skuOwnership.expiresAt = '2026-08-31T00:00:00';
    packet.submissionConfirmations.submittedAt = '2026-07-24T00:00:00';

    const result = validateRegulationSourceLegalIntake(packet, { inputPath: 'tests/fixtures/synthetic-memory.json' });
    expect(result.contractValid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '$.generatedAt', code: 'date-time-required' }),
      expect.objectContaining({ path: '$.sourceScope.collectionWindowStart', code: 'date-required' }),
      expect.objectContaining({ path: '$.sourceScope.collectionWindowEnd', code: 'date-required' }),
      expect.objectContaining({ path: '$.skuOwnership.expiresAt', code: 'date-time-required' }),
      expect.objectContaining({ path: '$.submissionConfirmations.submittedAt', code: 'date-time-required' }),
    ]));
  });

  it('runs the empty-template CLI without changing canonical public manifests', () => {
    const canonicalPaths = ['public/periodic-data/latest.json', 'public/weekly-data/latest.json'];
    const before = canonicalPaths.map((path) => readFileSync(path));
    const output = execFileSync('node', ['scripts/data/validate-regulation-source-legal-intake.mjs', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const report = JSON.parse(output);

    expect(report).toMatchObject({ passed: true, status: 'blocked-required-input', readiness: { readyGroups: 0, totalGroups: 6 } });
    canonicalPaths.forEach((path, index) => expect(readFileSync(path)).toEqual(before[index]));
  });
});
