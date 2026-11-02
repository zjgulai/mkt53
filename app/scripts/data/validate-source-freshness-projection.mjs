#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSourceFreshnessProjection } from './build-source-freshness-projection.mjs';

const DEFAULT_POLICY_PATH = join('contracts', 'source-freshness-policy.json');
const DEFAULT_PROJECTION_PATH = join(
  '..',
  'docs',
  'reviews',
  'mkt53-data-completeness-mece-20260729',
  'evidence',
  'dq-016-source-freshness-projection-20260730.json',
);
const REQUIRED_FALSE_BOUNDARIES = [
  'networkCalls',
  'providerCalls',
  'restrictedConnectorAccess',
  'connectorCalls',
  'databaseWrites',
  'productionWrites',
  'deployment',
  'liveCollection',
  'externalSend',
  'factPromotion',
  'evidenceGradePromotion',
];

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function absoluteFromApp(appRoot, path) {
  return isAbsolute(path) ? path : resolve(appRoot, path);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function stable(value) {
  return JSON.stringify(value);
}

export function validateSourceFreshnessProjection(appRoot, policy, projection) {
  const blockers = [];
  const alerts = [];

  if (policy.gate !== 'DQ-016') blockers.push('policy:unexpected-gate');
  for (const [method, thresholds] of Object.entries(policy.defaultsByCollectionMethod ?? {})) {
    if (
      !Number.isFinite(thresholds.warnAfterDays) ||
      !Number.isFinite(thresholds.expireAfterDays) ||
      thresholds.warnAfterDays <= 0 ||
      thresholds.expireAfterDays <= thresholds.warnAfterDays
    ) {
      blockers.push(`policy:invalid-thresholds:${method}`);
    }
  }
  for (const boundary of REQUIRED_FALSE_BOUNDARIES) {
    if (policy.boundaries?.[boundary] !== false) blockers.push(`policy:boundary-must-be-false:${boundary}`);
  }

  const expected = buildSourceFreshnessProjection(appRoot, {
    policy,
    evaluatedAt: projection.evaluatedAt,
  });
  const expectedById = new Map(expected.sources.map((source) => [source.sourceId, source]));
  const actualById = new Map((projection.sources ?? []).map((source) => [source.sourceId, source]));

  for (const source of projection.sources ?? []) {
    const isL3 = source.evidenceGrade === 'L3-production-read-only';
    const l3ArtifactContractIncomplete = Boolean(
      isL3 &&
      (
        !source.artifactPath ||
        !source.expectedArtifactSha256 ||
        !source.refreshReceiptPath ||
        !source.artifactAvailable ||
        !source.artifactSha256MatchesContract ||
        !source.refreshReceiptAvailable
      ),
    );
    if (isL3 && source.basisType === 'registry-last-verified-only') {
      blockers.push(`${source.sourceId}:l3-date-only-basis-forbidden`);
    }
    if (source.artifactReady && l3ArtifactContractIncomplete) {
      blockers.push(`${source.sourceId}:l3-artifact-contract-incomplete`);
    }
    if (isL3 && source.currentUseAllowed && (!source.artifactReady || l3ArtifactContractIncomplete)) {
      blockers.push(`${source.sourceId}:l3-current-use-must-be-blocked`);
    }
    if (source.status !== 'fresh') {
      alerts.push(`${source.sourceId}:${source.status}`);
    }

    const expectedSource = expectedById.get(source.sourceId);
    if (!expectedSource || stable(expectedSource) !== stable(source)) {
      blockers.push(`projection-record-mismatch:${source.sourceId}`);
    }
  }

  for (const source of expected.sources) {
    if (!actualById.has(source.sourceId)) blockers.push(`projection-source-missing:${source.sourceId}`);
  }
  for (const source of projection.sources ?? []) {
    if (!expectedById.has(source.sourceId)) blockers.push(`projection-source-unexpected:${source.sourceId}`);
  }
  if (stable(projection.boundaries) !== stable(policy.boundaries)) {
    blockers.push('projection-boundaries-mismatch');
  }

  const uniqueBlockers = [...new Set(blockers)];
  const uniqueAlerts = [...new Set(alerts)];
  const summary = {
    ...expected.summary,
    alertCount: uniqueAlerts.length,
    validationPassed: uniqueBlockers.length === 0,
  };

  return {
    gate: 'DQ-016',
    decision: uniqueBlockers.length > 0
      ? 'blocked'
      : uniqueAlerts.length > 0
        ? 'allowed-with-alerts'
        : 'allowed',
    blockers: uniqueBlockers,
    alerts: uniqueAlerts,
    summary,
  };
}

function main() {
  const args = process.argv.slice(2);
  const appRoot = process.cwd();
  const policyPath = absoluteFromApp(appRoot, valueAfter(args, '--policy') ?? DEFAULT_POLICY_PATH);
  const projectionPath = absoluteFromApp(
    appRoot,
    valueAfter(args, '--projection') ?? DEFAULT_PROJECTION_PATH,
  );
  const result = validateSourceFreshnessProjection(
    appRoot,
    readJson(policyPath),
    readJson(projectionPath),
  );

  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    process.stdout.write(
      `DQ-016 ${result.decision}: ${result.summary.sourceCount} sources, ${result.summary.alertCount} alerts, ${result.blockers.length} blockers\n`,
    );
  }
  if (result.decision === 'blocked') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
