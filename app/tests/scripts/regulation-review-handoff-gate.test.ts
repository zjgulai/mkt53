import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { projectRegulationIntakeToSkuDraft } from '../../scripts/data/project-regulation-intake-to-sku-draft.mjs';
import {
  buildRegulationDraftReviewHandoff,
  validateRegulationReviewHandoffPrerequisites,
} from '../../scripts/data/build-regulation-review-handoff-gate.mjs';

const intakePath = 'tests/fixtures/regulation-source-legal-intake.synthetic.json';
const prerequisitesPath = 'scripts/data/templates/regulation-review-handoff-prerequisites-template.json';
const syntheticPrerequisitesPath = 'tests/fixtures/regulation-review-handoff-prerequisites.synthetic.json';
const withdrawalPath = 'tests/fixtures/regulation-intake-withdrawal.synthetic.json';

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function activeProjection() {
  return projectRegulationIntakeToSkuDraft(readJson(intakePath), { inputPath: intakePath });
}

function syntheticPrerequisites() {
  return readJson(syntheticPrerequisitesPath);
}

describe('DATA-REG synthetic draft to review handoff gate', () => {
  it('constructs a non-persisted pending candidate while prerequisites are absent', () => {
    const report = buildRegulationDraftReviewHandoff(activeProjection(), readJson(prerequisitesPath));

    expect(report).toMatchObject({
      passed: true,
      status: 'pending-review-handoff-blocked-prerequisites',
      handoffCandidateCreated: true,
      readyForReviewerDecision: false,
      handoff: {
        candidateState: 'pending',
        backendSubjectCreated: false,
        backendPersisted: false,
        reviewEventId: null,
        legalDecision: null,
      },
      reviewGate: {
        requestedTargetState: 'pending',
        transitionAuthorized: false,
        blockedTransitions: ['approved', 'rejected'],
      },
      checks: {
        projectionActive: true,
        projectionHashValid: true,
        matrixContractValid: true,
        officialSnapshotReady: false,
        independentReviewerAuthorized: false,
      },
      decision: {
        authorizedToCreateBackendReviewSubject: false,
        authorizedToApprove: false,
        authorizedToReject: false,
        authorizedToPublish: false,
      },
      boundaries: {
        backendApiCalls: 0,
        snapshotWrites: 0,
        reviewWrites: 0,
        productionWrites: 0,
        legalConclusionsGenerated: 0,
        factPromotion: false,
      },
    });
    expect(report.handoff.subjects).toHaveLength(1);
    expect(report.blockingReasons).toEqual(expect.arrayContaining([
      'official-snapshot-missing',
      'artifact-hash-missing',
      'metadata-hash-missing',
      'official-bytes-not-verified',
      'reviewer-authorization-missing',
      'independent-reviewer-not-confirmed',
    ]));
  });

  it.each(['approved', 'rejected'])('blocks a requested %s transition without producing a decision', (targetState) => {
    const report = buildRegulationDraftReviewHandoff(activeProjection(), readJson(prerequisitesPath), { targetState });

    expect(report).toMatchObject({
      passed: true,
      status: 'blocked-review-transition',
      readyForReviewerDecision: false,
      reviewGate: { requestedTargetState: targetState, transitionAuthorized: false },
      handoff: { reviewEventId: null, legalDecision: null },
    });
    expect(report.blockingReasons).toContain('approve-reject-requires-official-evidence-and-independent-authorization');
  });

  it('keeps a complete synthetic prerequisite shape unauthorized', () => {
    const prerequisites = syntheticPrerequisites();
    const validation = validateRegulationReviewHandoffPrerequisites(prerequisites);
    const report = buildRegulationDraftReviewHandoff(activeProjection(), prerequisites, { targetState: 'approved' });

    expect(validation).toMatchObject({ contractValid: true, inputClass: 'synthetic-handoff-fixture' });
    expect(report).toMatchObject({
      passed: true,
      status: 'blocked-review-transition',
      readyForReviewerDecision: false,
      checks: { syntheticPrerequisites: true, officialSnapshotReady: false, independentReviewerAuthorized: false },
      reviewGate: { transitionAuthorized: false },
    });
    expect(report.blockingReasons).toEqual(expect.arrayContaining([
      'synthetic-prerequisites-not-authorized',
      'official-bytes-not-verified',
    ]));
  });

  it('is deterministic for the same projection, prerequisites, and requested state', () => {
    const projection = activeProjection();
    const prerequisites = readJson(prerequisitesPath);
    const first = buildRegulationDraftReviewHandoff(projection, prerequisites, { targetState: 'approved' });
    const second = buildRegulationDraftReviewHandoff(JSON.parse(JSON.stringify(projection)), JSON.parse(JSON.stringify(prerequisites)), { targetState: 'approved' });

    expect(second).toEqual(first);
    expect(second.handoffId).toBe(first.handoffId);
    expect(second.idempotency).toEqual(first.idempotency);
  });

  it('rejects a tampered projection and never constructs a handoff candidate', () => {
    const projection = activeProjection();
    projection.matrixDraft.records[0].decision.status = 'approved';

    const report = buildRegulationDraftReviewHandoff(projection, readJson(prerequisitesPath));
    expect(report).toMatchObject({
      passed: false,
      status: 'blocked-projection-invalid',
      handoffCandidateCreated: false,
      readyForReviewerDecision: false,
      handoff: null,
    });
    expect(report.errors.map((error: { code: string }) => error.code)).toEqual(expect.arrayContaining([
      'projection-matrix-hash-mismatch',
      'projection-matrix-contract-invalid',
    ]));
  });

  it('rejects an altered projection hash even when the matrix body is unchanged', () => {
    const projection = activeProjection();
    projection.idempotency.matrixSha256 = '0'.repeat(64);

    const report = buildRegulationDraftReviewHandoff(projection, readJson(prerequisitesPath));
    expect(report).toMatchObject({ passed: false, status: 'blocked-projection-invalid', handoffCandidateCreated: false });
    expect(report.errors.map((error: { code: string }) => error.code)).toContain('projection-matrix-hash-mismatch');
  });

  it('rejects fabricated snapshot or review ids in active projection lineage', () => {
    const projection = activeProjection();
    projection.lineage.snapshots.snapshotIds = ['fixture-fabricated-snapshot'];
    projection.lineage.review.reviewDecisionIds = ['fixture-fabricated-review'];

    const report = buildRegulationDraftReviewHandoff(projection, readJson(prerequisitesPath));
    expect(report).toMatchObject({ passed: false, status: 'blocked-projection-invalid', handoffCandidateCreated: false });
    expect(report.errors.map((error: { code: string }) => error.code)).toContain('projection-lineage-invalid');
  });

  it('does not construct a handoff from a withdrawn projection', () => {
    const projection = projectRegulationIntakeToSkuDraft(readJson(intakePath), {
      inputPath: intakePath,
      withdrawal: readJson(withdrawalPath),
    });
    const report = buildRegulationDraftReviewHandoff(projection, readJson(prerequisitesPath));

    expect(report).toMatchObject({
      passed: true,
      status: 'blocked-projection-withdrawn',
      handoffCandidateCreated: false,
      readyForReviewerDecision: false,
      handoff: null,
    });
  });

  it('rejects additional and secret-shaped prerequisite fields', () => {
    const prerequisites = readJson(prerequisitesPath);
    prerequisites.apiToken = 'forbidden';
    prerequisites.disclosure.noApproveReject = false;

    const validation = validateRegulationReviewHandoffPrerequisites(prerequisites);
    expect(validation.contractValid).toBe(false);
    expect(validation.errors.map((error: { code: string }) => error.code)).toEqual(expect.arrayContaining([
      'additional-property',
      'sensitive-key-forbidden',
      'disclosure-boundary-required',
    ]));
  });

  it('runs the blocked approve CLI without mutating canonical public manifests', () => {
    const canonicalPaths = ['public/periodic-data/latest.json', 'public/weekly-data/latest.json'];
    const before = canonicalPaths.map((path) => readFileSync(path));
    const output = execFileSync('node', [
      'scripts/data/build-regulation-review-handoff-gate.mjs',
      '--json',
      '--target-state',
      'approved',
    ], { cwd: process.cwd(), encoding: 'utf8' });
    const report = JSON.parse(output);

    expect(report).toMatchObject({ passed: true, status: 'blocked-review-transition', reviewGate: { transitionAuthorized: false } });
    canonicalPaths.forEach((path, index) => expect(readFileSync(path)).toEqual(before[index]));
  });

  it('rejects writes outside app/tmp before creating the target', () => {
    const forbiddenPath = 'public/regulation-review-handoff-forbidden.json';
    expect(() => execFileSync('node', [
      'scripts/data/build-regulation-review-handoff-gate.mjs',
      '--write',
      forbiddenPath,
    ], { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' })).toThrow();
    expect(() => readFileSync(forbiddenPath)).toThrow();
  });
});
