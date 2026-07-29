#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUTPUT_PATH = resolve(process.cwd(), 'tmp/release-evidence/latest.json');

const CHECK_PLAN = [
  { id: 'unit-tests', executable: 'npm', args: ['run', 'test:serial', '--', '--reporter=dot'] },
  { id: 'lint', executable: 'npm', args: ['run', 'lint'] },
  { id: 'dependency-audit', executable: 'npm', args: ['audit'] },
  { id: 'build', executable: 'npm', args: ['run', 'build'] },
  {
    id: 'bundle-budget',
    executable: 'npm',
    args: ['run', 'quality:bundle-budget', '--', '--json', '--write', 'tmp/quality/bundle-budget-report.json'],
    dependsOn: 'build',
  },
  { id: 'data-consistency-audit', executable: 'npm', args: ['run', 'data:audit:json'] },
  { id: 'data-deep-audit', executable: 'npm', args: ['run', 'data:audit:deep:summary'] },
  { id: 'local-e2e', executable: 'npm', args: ['run', 'test:e2e'] },
];

function quoteArgument(argument) {
  return /^[A-Za-z0-9_./:=@-]+$/.test(argument) ? argument : JSON.stringify(argument);
}

export function getReleaseCheckPlan() {
  return CHECK_PLAN.map((check) => ({
    ...check,
    args: [...check.args],
    command: [check.executable, ...check.args].map(quoteArgument).join(' '),
  }));
}

function sha256(value) {
  return createHash('sha256').update(value ?? '').digest('hex');
}

function countLines(value) {
  if (!value) return 0;
  return value.split(/\r?\n/).length - (value.endsWith('\n') ? 1 : 0);
}

function parseJsonPayload(stdout) {
  const start = stdout.indexOf('{');
  if (start < 0) return null;
  try {
    return JSON.parse(stdout.slice(start));
  } catch {
    return null;
  }
}

function numericMatch(value, pattern) {
  const match = value.match(pattern);
  return match ? Number(match[1]) : undefined;
}

export function extractCheckFacts(id, stdout = '') {
  if (id === 'unit-tests') {
    return {
      testFilesPassed: numericMatch(stdout, /Test Files\s+(\d+) passed/),
      testsPassed: numericMatch(stdout, /Tests\s+(\d+) passed/),
    };
  }
  if (id === 'dependency-audit') {
    return { vulnerabilities: numericMatch(stdout, /found\s+(\d+) vulnerabilities?/) };
  }
  if (id === 'build') {
    return { modulesTransformed: numericMatch(stdout, /(\d+) modules transformed/) };
  }
  if (id === 'local-e2e') {
    return { testsPassed: numericMatch(stdout, /(\d+) passed(?:\s|\()/) };
  }

  const payload = parseJsonPayload(stdout);
  if (id === 'bundle-budget' && payload?.summary) {
    return {
      assets: payload.summary.totalAssets,
      withinTarget: payload.summary.pass,
      temporaryExceptions: payload.summary.exception,
      failures: payload.summary.fail,
    };
  }
  if (id === 'data-consistency-audit' && payload?.summary) {
    return {
      pages: payload.summary.pageCount,
      tables: payload.summary.tableCount,
      sources: payload.summary.sourceRegistryCount,
      issues: payload.summary.issueCount,
      criticalIssues: payload.summary.criticalIssueCount,
    };
  }
  if (id === 'data-deep-audit' && payload?.summary) {
    return {
      claims: payload.summary.claimCount,
      highRiskClaims: payload.summary.highRiskClaimCount,
      unsupportedClaims: payload.summary.unsupportedClaimCount,
    };
  }
  return {};
}

function compactFacts(facts) {
  return Object.fromEntries(Object.entries(facts).filter(([, value]) => value !== undefined));
}

function sanitizeCheck(check) {
  const stdout = check.stdout ?? '';
  const stderr = check.stderr ?? '';
  const facts = compactFacts(check.facts ?? extractCheckFacts(check.id, stdout));
  return {
    id: check.id,
    command: check.command,
    status: check.status,
    exitCode: check.exitCode,
    durationMs: check.durationMs,
    ...(check.dependsOn ? { dependsOn: check.dependsOn } : {}),
    ...(check.reason ? { reason: check.reason } : {}),
    stdoutSha256: check.stdoutSha256 ?? sha256(stdout),
    stderrSha256: check.stderrSha256 ?? sha256(stderr),
    stdoutBytes: Buffer.byteLength(stdout),
    stderrBytes: Buffer.byteLength(stderr),
    stdoutLines: countLines(stdout),
    stderrLines: countLines(stderr),
    ...(Object.keys(facts).length > 0 ? { facts } : {}),
  };
}

export function assembleReleaseEvidence({ generatedAt, candidate, checks, environment = {} }) {
  const sanitizedChecks = checks.map(sanitizeCheck);
  const passed = sanitizedChecks.filter((check) => check.status === 'passed').length;
  const failed = sanitizedChecks.filter((check) => check.status === 'failed').length;
  const skipped = sanitizedChecks.filter((check) => check.status === 'skipped').length;
  const localCandidateReady = sanitizedChecks.length === CHECK_PLAN.length && failed === 0 && skipped === 0;

  return {
    schemaVersion: 1,
    artifactType: 'release-candidate-evidence',
    generatedAt,
    candidate,
    environment: {
      node: environment.node ?? process.version,
      platform: environment.platform ?? process.platform,
      arch: environment.arch ?? process.arch,
      ci: environment.ci ?? Boolean(process.env.CI),
    },
    boundaries: {
      evidenceLayer: 'L1-local',
      productionDeploy: false,
      productionVerified: false,
      productionWrites: false,
      providerCalls: false,
      restrictedConnectorCalls: false,
    },
    checks: sanitizedChecks,
    summary: {
      total: sanitizedChecks.length,
      passed,
      failed,
      skipped,
      localCandidateReady,
    },
    production: { status: 'not-verified' },
  };
}

function gitValue(args, fallback) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function readCandidate() {
  const status = gitValue(['status', '--porcelain'], 'unknown');
  return {
    branch: gitValue(['branch', '--show-current'], 'unknown'),
    commit: gitValue(['rev-parse', 'HEAD'], 'unknown'),
    dirty: status === 'unknown' ? null : status.length > 0,
  };
}

function executeCheck(check) {
  const startedAt = Date.now();
  const result = spawnSync(check.executable, check.args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? result.error?.message ?? '';

  return {
    id: check.id,
    command: check.command,
    dependsOn: check.dependsOn,
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status,
    durationMs: Date.now() - startedAt,
    stdout,
    stderr,
  };
}

function parseArgs(argv) {
  const options = { writePath: DEFAULT_OUTPUT_PATH, json: false, skipE2e: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') options.json = true;
    else if (argument === '--skip-e2e') options.skipE2e = true;
    else if (argument === '--write') options.writePath = resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const plan = getReleaseCheckPlan();
  const results = [];

  for (const check of plan) {
    if (options.skipE2e && check.id === 'local-e2e') {
      results.push({
        id: check.id,
        command: check.command,
        status: 'skipped',
        exitCode: null,
        durationMs: 0,
        reason: 'explicit --skip-e2e diagnostic run',
      });
      continue;
    }

    const dependency = check.dependsOn && results.find((result) => result.id === check.dependsOn);
    if (dependency && dependency.status !== 'passed') {
      results.push({
        id: check.id,
        command: check.command,
        dependsOn: check.dependsOn,
        status: 'skipped',
        exitCode: null,
        durationMs: 0,
        reason: `dependency ${check.dependsOn} did not pass`,
      });
      continue;
    }

    console.error(`[release-evidence] START ${check.id}: ${check.command}`);
    const result = executeCheck(check);
    results.push(result);
    console.error(`[release-evidence] ${result.status.toUpperCase()} ${check.id} (${result.durationMs} ms)`);
  }

  const artifact = assembleReleaseEvidence({
    generatedAt: new Date().toISOString(),
    candidate: readCandidate(),
    checks: results,
  });
  mkdirSync(dirname(options.writePath), { recursive: true });
  writeFileSync(options.writePath, `${JSON.stringify(artifact, null, 2)}\n`);

  console.error(`[release-evidence] WROTE ${options.writePath}`);
  console.error(
    `[release-evidence] ${artifact.summary.localCandidateReady ? 'READY' : 'NOT READY'}: ` +
      `${artifact.summary.passed} passed, ${artifact.summary.failed} failed, ${artifact.summary.skipped} skipped`,
  );
  if (options.json) console.log(JSON.stringify(artifact));
  if (!artifact.summary.localCandidateReady) process.exitCode = 1;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`Release evidence generation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
