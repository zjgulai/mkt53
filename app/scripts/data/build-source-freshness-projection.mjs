#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractSourceRegistry } from './lib/project-analysis.mjs';

const DEFAULT_POLICY_PATH = join('contracts', 'source-freshness-policy.json');
const DEFAULT_JSON_PATH = join(
  '..',
  'docs',
  'reviews',
  'mkt53-data-completeness-mece-20260729',
  'evidence',
  'dq-016-source-freshness-projection-20260730.json',
);
const DEFAULT_TS_PATH = join('src', 'data', 'source-freshness.generated.ts');
const DAY_MS = 86_400_000;

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function absoluteFromApp(appRoot, path) {
  if (!path) return null;
  return isAbsolute(path) ? path : resolve(appRoot, path);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function addDays(dateText, days) {
  const date = new Date(dateText);
  return new Date(date.getTime() + days * DAY_MS).toISOString();
}

function ageInDays(basisDate, evaluatedAt) {
  const basis = new Date(basisDate);
  const evaluation = new Date(evaluatedAt);
  if (!Number.isFinite(basis.getTime()) || !Number.isFinite(evaluation.getTime())) return null;
  return Math.max(0, (evaluation.getTime() - basis.getTime()) / DAY_MS);
}

function temporalResult(basisDate, evaluatedAt, warnAfterDays, expireAfterDays) {
  const ageDays = ageInDays(basisDate, evaluatedAt);
  if (ageDays === null) return { ageDays: null, temporalScore: 0, temporalStatus: 'unknown' };
  if (ageDays <= warnAfterDays) {
    return { ageDays: Number(ageDays.toFixed(2)), temporalScore: 100, temporalStatus: 'fresh' };
  }
  if (ageDays <= expireAfterDays) {
    const remainingRatio = (expireAfterDays - ageDays) / (expireAfterDays - warnAfterDays);
    return {
      ageDays: Number(ageDays.toFixed(2)),
      temporalScore: Math.max(1, Math.round(remainingRatio * 100)),
      temporalStatus: 'due-soon',
    };
  }
  return { ageDays: Number(ageDays.toFixed(2)), temporalScore: 0, temporalStatus: 'stale' };
}

function buildSourceRecord(appRoot, source, policy, evaluatedAt) {
  const thresholds = policy.defaultsByCollectionMethod[source.collectionMethod];
  if (!thresholds) {
    return {
      sourceId: source.id,
      evidenceGrade: source.evidenceGrade,
      canDisplayAsFact: source.canDisplayAsFact,
      collectionMethod: source.collectionMethod,
      basisType: 'unmapped-collection-method',
      basisDate: source.lastVerified || null,
      warnAfterDays: null,
      expireAfterDays: null,
      warningAt: null,
      expiresAt: null,
      ageDays: null,
      temporalScore: 0,
      effectiveScore: 0,
      temporalStatus: 'unknown',
      status: 'unknown',
      artifactPath: source.evidenceArtifactPath || null,
      artifactAvailable: false,
      artifactSha256: null,
      expectedArtifactSha256: null,
      artifactSha256MatchesContract: false,
      refreshReceiptPath: null,
      refreshReceiptAvailable: false,
      artifactReady: false,
      currentUseAllowed: false,
      displayDecision: source.canDisplayAsFact ? 'historical-only-current-blocked' : 'blocked-by-evidence-gate',
    };
  }

  const isL3 = source.evidenceGrade === 'L3-production-read-only';
  const override = policy.overrides.find((entry) => entry.sourceId === source.id);
  const basisType = isL3
    ? override?.basisType ?? 'missing-l3-freshness-override'
    : 'registry-last-verified';
  const basisDate = isL3
    ? override?.snapshotObservedThrough ?? null
    : source.lastVerified || null;
  const temporal = temporalResult(
    basisDate,
    evaluatedAt,
    thresholds.warnAfterDays,
    thresholds.expireAfterDays,
  );
  const artifactPath = isL3
    ? (override?.expectedArtifactPath ?? source.evidenceArtifactPath ?? null)
    : source.evidenceArtifactPath || null;
  const artifactAbsolutePath = absoluteFromApp(appRoot, artifactPath);
  const artifactAvailable = Boolean(
    isL3 && artifactAbsolutePath && existsSync(artifactAbsolutePath),
  );
  const artifactSha256 = artifactAvailable ? sha256(artifactAbsolutePath) : null;
  const expectedArtifactSha256 = override?.expectedArtifactSha256 ?? null;
  const artifactSha256MatchesContract = Boolean(
    artifactSha256 &&
    expectedArtifactSha256 &&
    artifactSha256 === expectedArtifactSha256,
  );
  const refreshReceiptPath = override?.refreshReceiptPath ?? null;
  const refreshReceiptAbsolutePath = absoluteFromApp(appRoot, refreshReceiptPath);
  const refreshReceiptAvailable = Boolean(
    refreshReceiptAbsolutePath && existsSync(refreshReceiptAbsolutePath),
  );
  const artifactReady = isL3
    ? Boolean(
      override?.snapshotObservedThrough &&
      artifactAvailable &&
      artifactSha256MatchesContract &&
      refreshReceiptAvailable,
    )
    : true;
  const status = isL3 && !artifactReady
    ? 'blocked-evidence-unavailable'
    : temporal.temporalStatus;
  const currentUseAllowed = Boolean(
    source.canDisplayAsFact &&
    artifactReady &&
    (status === 'fresh' || status === 'due-soon'),
  );

  return {
    sourceId: source.id,
    evidenceGrade: source.evidenceGrade,
    canDisplayAsFact: source.canDisplayAsFact,
    collectionMethod: source.collectionMethod,
    basisType,
    basisDate,
    warnAfterDays: thresholds.warnAfterDays,
    expireAfterDays: thresholds.expireAfterDays,
    warningAt: basisDate ? addDays(basisDate, thresholds.warnAfterDays) : null,
    expiresAt: basisDate ? addDays(basisDate, thresholds.expireAfterDays) : null,
    ageDays: temporal.ageDays,
    temporalScore: temporal.temporalScore,
    effectiveScore: artifactReady ? temporal.temporalScore : 0,
    temporalStatus: temporal.temporalStatus,
    status,
    artifactPath,
    artifactAvailable,
    artifactSha256,
    expectedArtifactSha256,
    artifactSha256MatchesContract,
    refreshReceiptPath,
    refreshReceiptAvailable,
    artifactReady,
    currentUseAllowed,
    displayDecision: currentUseAllowed
      ? 'allowed-with-freshness-label'
      : source.canDisplayAsFact
        ? 'historical-only-current-blocked'
        : 'blocked-by-evidence-gate',
  };
}

export function buildSourceFreshnessProjection(appRoot = process.cwd(), options = {}) {
  const policyPath = absoluteFromApp(appRoot, options.policyPath ?? DEFAULT_POLICY_PATH);
  const policy = options.policy ?? readJson(policyPath);
  const evaluatedAt = options.evaluatedAt ?? policy.projectionAsOf;
  if (!evaluatedAt || !Number.isFinite(new Date(evaluatedAt).getTime())) {
    throw new Error('Freshness projection requires a valid evaluatedAt timestamp.');
  }

  const registry = options.registry ?? extractSourceRegistry(appRoot);
  const sources = registry.map((source) => buildSourceRecord(appRoot, source, policy, evaluatedAt));
  const alerts = sources
    .filter((source) => source.status !== 'fresh')
    .map((source) => ({
      sourceId: source.sourceId,
      status: source.status,
      currentUseAllowed: source.currentUseAllowed,
      expiresAt: source.expiresAt,
    }));
  const l3Sources = sources.filter((source) => source.evidenceGrade === 'L3-production-read-only');

  return {
    gate: policy.gate,
    contractVersion: policy.contractVersion,
    evaluatedAt,
    rule:
      'Freshness is independent from historical evidence grade. L3 current use requires snapshot window, artifact hash contract, available artifact, and refresh receipt.',
    boundaries: policy.boundaries,
    summary: {
      sourceCount: sources.length,
      l3SourceCount: l3Sources.length,
      l3DateOnlyBasisCount: l3Sources.filter(
        (source) => source.basisType === 'registry-last-verified-only',
      ).length,
      l3ArtifactUnavailableCount: l3Sources.filter((source) => !source.artifactReady).length,
      l3CurrentUseAllowedCount: l3Sources.filter((source) => source.currentUseAllowed).length,
      unmappedSourceCount: sources.filter(
        (source) => source.basisType === 'unmapped-collection-method',
      ).length,
      alertCount: alerts.length,
      validationPassed: true,
    },
    alerts,
    sources,
  };
}

export function serializeSourceFreshnessProjection(projection) {
  return `${JSON.stringify(projection, null, 2)}\n`;
}

export function serializeSourceFreshnessTypeScript(projection) {
  return [
    '// This file is generated by scripts/data/build-source-freshness-projection.mjs.',
    '// Do not edit it by hand; run npm run data:freshness:build.',
    `export const sourceFreshnessProjection = ${JSON.stringify(projection, null, 2)} as const;`,
    '',
  ].join('\n');
}

function writeOutput(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function main() {
  const args = process.argv.slice(2);
  const appRoot = process.cwd();
  const policyPath = absoluteFromApp(appRoot, valueAfter(args, '--policy') ?? DEFAULT_POLICY_PATH);
  const evaluatedAt = valueAfter(args, '--as-of');
  const jsonPath = absoluteFromApp(appRoot, valueAfter(args, '--write-json') ?? DEFAULT_JSON_PATH);
  const tsPath = absoluteFromApp(appRoot, valueAfter(args, '--write-ts') ?? DEFAULT_TS_PATH);
  const projection = buildSourceFreshnessProjection(appRoot, { policyPath, evaluatedAt });
  const json = serializeSourceFreshnessProjection(projection);
  const ts = serializeSourceFreshnessTypeScript(projection);

  if (args.includes('--check')) {
    const stale = [];
    if (!existsSync(jsonPath) || readFileSync(jsonPath, 'utf8') !== json) stale.push(relative(appRoot, jsonPath));
    if (!existsSync(tsPath) || readFileSync(tsPath, 'utf8') !== ts) stale.push(relative(appRoot, tsPath));
    if (stale.length > 0) {
      process.stderr.write(`Source freshness projection is stale: ${stale.join(', ')}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Source freshness projection is current: ${relative(appRoot, jsonPath)}\n`);
  } else {
    writeOutput(jsonPath, json);
    writeOutput(tsPath, ts);
    if (!args.includes('--json')) {
      process.stdout.write(
        `Wrote ${relative(appRoot, jsonPath)} and ${relative(appRoot, tsPath)}\n`,
      );
    }
  }

  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(projection.summary)}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
