import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = process.cwd();
const REPO_ROOT = resolve(APP_ROOT, '..');
const REVIEW_ROOT = resolve(
  REPO_ROOT,
  'docs/reviews/mkt53-data-completeness-mece-20260729',
);
const EVIDENCE_PATH = resolve(
  REVIEW_ROOT,
  'evidence/dq-017-current-state-integrity-20260809.json',
);
const REQUIRED_CANDIDATE_ARTIFACT_PATHS = [
  'app/package-lock.json',
  'app/package.json',
  'app/public/periodic-data/latest.json',
  'app/public/weekly-data/latest.json',
  'app/scripts/data/build-semi-monthly-recovery-candidate.mjs',
  'app/src/features/data-manage/catalog-core.tsx',
  'app/src/features/data-manage/governance.ts',
  'app/src/hooks/usePeriodicManifest.ts',
  'app/src/pages/DataManage.tsx',
  'app/src/pages/DataSourcePage.tsx',
  'app/src/pages/HomePage.tsx',
] as const;

function sha256(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

describe('DQ-017 current-state integrity evidence', () => {
  it('keeps the completion receipt present, bounded, and bound to the reviewed candidate files', () => {
    expect(existsSync(EVIDENCE_PATH)).toBe(true);
    const evidence = JSON.parse(readFileSync(EVIDENCE_PATH, 'utf8')) as {
      gate: string;
      evidenceGrade: string;
      boundaries: Record<string, boolean>;
      candidateArtifacts: Array<{ path: string; sha256: string }>;
    };
    const todo = readFileSync(resolve(REVIEW_ROOT, 'EXECUTION_TODO.md'), 'utf8');

    expect(todo).toContain('evidence/dq-017-current-state-integrity-20260809.json');
    expect(evidence.gate).toBe('DQ-017');
    expect(evidence.evidenceGrade).toBe('L1-local-candidate');
    expect(evidence.candidateArtifacts.map((artifact) => artifact.path).sort()).toEqual(
      [...REQUIRED_CANDIDATE_ARTIFACT_PATHS].sort(),
    );
    expect(Object.values(evidence.boundaries).every((value) => value === false)).toBe(true);

    for (const artifact of evidence.candidateArtifacts) {
      const artifactPath = resolve(REPO_ROOT, artifact.path);
      expect(existsSync(artifactPath), artifact.path).toBe(true);
      expect(artifact.sha256, artifact.path).toMatch(/^[a-f0-9]{64}$/);
      expect(sha256(artifactPath), artifact.path).toBe(artifact.sha256);
    }
  });
});
