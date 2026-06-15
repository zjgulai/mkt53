#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const appRoot = process.cwd();

function parseArgs(argv) {
  const valueOptions = new Set([
    '--output-dir',
    '--run-dir',
    '--period',
    '--manifest',
    '--weekly-manifest',
    '--connectors',
    '--source-tasks',
    '--public-evidence',
    '--audit',
    '--run-id',
    '--source',
    '--refresh-log',
    '--deploy-log',
    '--smoke-log',
    '--e2e-log',
    '--refresh-status',
    '--deploy-status',
    '--smoke-status',
    '--e2e-status',
    '--e2e-last-run',
  ]);

  const options = {
    outputDir: 'tmp/reports',
    runDir: 'tmp/data-collection/runs',
    period: undefined,
    manifestPath: 'public/periodic-data/latest.json',
    weeklyManifestPath: 'public/weekly-data/latest.json',
    connectorsPath: 'public/periodic-data/connectors.json',
    sourceTasksPath: 'public/periodic-data/source-tasks.json',
    publicEvidencePath: 'public/periodic-data/public-evidence-samples.json',
    auditPath: 'tmp/data-collection/audit-latest.json',
    runId: undefined,
    source: 'semi-monthly-deploy-script',
    refreshLog: undefined,
    deployLog: undefined,
    smokeLog: undefined,
    e2eLog: undefined,
    smokeStatus: 'not-run',
    e2eStatus: 'not-run',
    refreshStatus: 'unknown',
    deployStatus: 'unknown',
    e2eLastRunPath: 'tmp/playwright-prod-test-results/.last-run.json',
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (valueOptions.has(arg)) {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        continue;
      }

      if (arg === '--output-dir') options.outputDir = next;
      if (arg === '--run-dir') options.runDir = next;
      if (arg === '--period') options.period = next;
      if (arg === '--manifest') options.manifestPath = next;
      if (arg === '--weekly-manifest') options.weeklyManifestPath = next;
      if (arg === '--connectors') options.connectorsPath = next;
      if (arg === '--source-tasks') options.sourceTasksPath = next;
      if (arg === '--public-evidence') options.publicEvidencePath = next;
      if (arg === '--audit') options.auditPath = next;
      if (arg === '--run-id') options.runId = next;
      if (arg === '--source') options.source = next;
      if (arg === '--refresh-log') options.refreshLog = next;
      if (arg === '--deploy-log') options.deployLog = next;
      if (arg === '--smoke-log') options.smokeLog = next;
      if (arg === '--e2e-log') options.e2eLog = next;
      if (arg === '--refresh-status') options.refreshStatus = next;
      if (arg === '--deploy-status') options.deployStatus = next;
      if (arg === '--smoke-status') options.smokeStatus = next;
      if (arg === '--e2e-status') options.e2eStatus = next;
      if (arg === '--e2e-last-run') options.e2eLastRunPath = next;

      i += 1;
      continue;
    }

    if (arg.startsWith('--') && arg.includes('=')) {
      const [flag, value] = arg.split('=', 2);
      if (flag === '--output-dir') options.outputDir = value;
      if (flag === '--run-dir') options.runDir = value;
      if (flag === '--period') options.period = value;
      if (flag === '--manifest') options.manifestPath = value;
      if (flag === '--weekly-manifest') options.weeklyManifestPath = value;
      if (flag === '--connectors') options.connectorsPath = value;
      if (flag === '--source-tasks') options.sourceTasksPath = value;
      if (flag === '--public-evidence') options.publicEvidencePath = value;
      if (flag === '--audit') options.auditPath = value;
      if (flag === '--run-id') options.runId = value;
      if (flag === '--source') options.source = value;
      if (flag === '--refresh-log') options.refreshLog = value;
      if (flag === '--deploy-log') options.deployLog = value;
      if (flag === '--smoke-log') options.smokeLog = value;
      if (flag === '--e2e-log') options.e2eLog = value;
      if (flag === '--refresh-status') options.refreshStatus = value;
      if (flag === '--deploy-status') options.deployStatus = value;
      if (flag === '--smoke-status') options.smokeStatus = value;
      if (flag === '--e2e-status') options.e2eStatus = value;
      if (flag === '--e2e-last-run') options.e2eLastRunPath = value;
      continue;
    }

  }

  return options;
}

function readJsonSafe(path, label) {
  const target = resolve(appRoot, path);
  if (!existsSync(target)) {
    return { path, exists: false, label, error: `${label} missing: ${path}` };
  }

  try {
    const content = readFileSync(target, 'utf8');
    return {
      path,
      exists: true,
      data: JSON.parse(content),
    };
  } catch (error) {
    return {
      path,
      exists: false,
      label,
      error: `Failed to parse ${label}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function readTextSafe(path) {
  const target = resolve(appRoot, path);
  if (!existsSync(target)) return null;

  try {
    return readFileSync(target, 'utf8');
  } catch {
    return null;
  }
}

function snapshot(path) {
  const target = resolve(appRoot, path);
  if (!existsSync(target)) {
    return {
      path,
      exists: false,
    };
  }

  try {
    const stat = statSync(target);
    return {
      path,
      exists: true,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      relativePath: relative(appRoot, target),
    };
  } catch {
    return {
      path,
      exists: false,
      error: 'snapshot stat failed',
    };
  }
}

function statusFromValue(rawStatus) {
  if (rawStatus === undefined || rawStatus === null || rawStatus === '') return 'unknown';
  const normalized = String(rawStatus).toLowerCase();
  if (normalized === 'not-run' || normalized === 'skipped' || normalized === 'n/a') return 'not-run';
  if (normalized === 'passed') return 'passed';
  if (normalized === 'failed') return 'failed';

  const value = Number(normalized);
  if (Number.isFinite(value)) return value === 0 ? 'passed' : 'failed';
  return 'unknown';
}

function parseSmokeSummary(logPath) {
  if (!logPath) {
    return {
      status: 'not-run',
    };
  }

  const content = readTextSafe(logPath);
  if (!content) {
    return {
      status: 'not-run',
      error: `smoke log not available: ${logPath}`,
    };
  }

  const lines = content.split('\n');
  const passLine = lines.find((line) => line.includes('Smoke passed:'));
  if (passLine) {
    return {
      status: 'passed',
      output: passLine.trim(),
      linesCaptured: lines.length,
    };
  }

  const failedLines = lines.filter((line) => line.includes('Route smoke failed') || line.includes('Smoke failed') || line.includes('No JavaScript assets found'));
  if (failedLines.length > 0) {
    return {
      status: 'failed',
      errors: failedLines,
      linesCaptured: lines.length,
    };
  }

  return {
    status: 'unknown',
    linesCaptured: lines.length,
  };
}

function parseE2eSummary(logPath, lastRunPath) {
  const result = {
    status: 'unknown',
  };

  const lastRun = readJsonSafe(lastRunPath, 'playwright last run');
  if (lastRun.exists && lastRun.data) {
    const failedCount = Array.isArray(lastRun.data.failedTests) ? lastRun.data.failedTests.length : 0;
    result.lastRun = {
      status: lastRun.data.status,
      failedCount,
      sampleFailedTests: Array.isArray(lastRun.data.failedTests) ? lastRun.data.failedTests.slice(0, 5) : [],
    };
    if (lastRun.data.status === 'passed') {
      result.status = 'passed';
    } else if (lastRun.data.status === 'failed') {
      result.status = 'failed';
    }
  }

  const content = logPath ? readTextSafe(logPath) : null;
  if (!content) {
    return {
      ...result,
      status: result.status === 'unknown' ? 'not-run' : result.status,
      linesCaptured: 0,
      parseError: logPath ? `e2e log not available: ${logPath}` : undefined,
    };
  }

  const lines = content.split('\n');
  const passedMatch = lines.join('\n').match(/(\d+)\s+passed/i);
  const failedMatch = lines.join('\n').match(/(\d+)\s+failed/i);
  const skippedMatch = lines.join('\n').match(/(\d+)\s+skipped/i);

  return {
    ...result,
    status: result.status === 'unknown' ? (failedMatch ? 'failed' : 'passed') : result.status,
    passed: passedMatch ? Number(passedMatch[1]) : undefined,
    failed: failedMatch ? Number(failedMatch[1]) : undefined,
    skipped: skippedMatch ? Number(skippedMatch[1]) : undefined,
    linesCaptured: lines.length,
  };
}

function topListBy(items, top = 6) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, top);
}

const periodic = readJsonSafe(args.manifestPath, 'periodic manifest');
if (!periodic.exists) {
  process.stderr.write(`${periodic.error}\n`);
  process.exit(1);
}

const effectivePeriod = args.period ?? periodic.data?.period;
if (!effectivePeriod) {
  process.stderr.write('Cannot determine period from periodic manifest and --period argument\n');
  process.exit(1);
}

const weeklyManifest = readJsonSafe(args.weeklyManifestPath, 'weekly-compatible manifest');
const connectors = readJsonSafe(args.connectorsPath, 'connectors manifest');
const sourceTasks = readJsonSafe(args.sourceTasksPath, 'source tasks manifest');
const publicEvidence = readJsonSafe(args.publicEvidencePath, 'public evidence manifest');
const audit = readJsonSafe(args.auditPath, 'data audit latest');

const runManifest = readJsonSafe(`tmp/data-collection/runs/${effectivePeriod}.json`, 'run manifest');

const smokeSummary = parseSmokeSummary(args.smokeLog);
const e2eSummary = parseE2eSummary(args.e2eLog, args.e2eLastRunPath);

const refreshStatus = statusFromValue(args.refreshStatus);
const deployStatus = statusFromValue(args.deployStatus);
const smokeStatus = statusFromValue(args.smokeStatus);
const e2eStatus = statusFromValue(args.e2eStatus);

const runId = args.runId || `${effectivePeriod}-${Date.now()}`;
const now = new Date().toISOString();

const periodicData = periodic.data || {};
const connectorBacklog = connectors.exists && connectors.data ? connectors.data : periodicData.connectorBacklog;
const sourceTaskQueue = sourceTasks.exists && sourceTasks.data ? sourceTasks.data : periodicData.sourceTaskQueue;
const publicEvidenceSnapshot =
  periodicData.publicEvidence && Object.keys(periodicData.publicEvidence).length > 0
    ? periodicData.publicEvidence
    : publicEvidence.exists && publicEvidence.data
      ? publicEvidence.data
      : null;

const topPriorityConnectors = connectorBacklog?.groups
  ? connectorBacklog.groups
      .filter((group) => group.priority === 'P0')
      .map((group) => `${group.connectorId}(${group.sourceCount ?? 0})`)
      .slice(0, 8)
  : [];

const runReport = {
  schemaVersion: 1,
  generatedAt: now,
  period: effectivePeriod,
  trigger: {
    source: args.source,
    runId,
    command: process.argv.slice(2).join(' '),
  },
  artifacts: {
    manifest: {
      periodic: snapshot(args.manifestPath),
      weeklyCompatible: snapshot(args.weeklyManifestPath),
      connectors: snapshot(args.connectorsPath),
      sourceTasks: snapshot(args.sourceTasksPath),
      publicEvidence: snapshot(args.publicEvidencePath),
      audit: snapshot(args.auditPath),
      runManifest: {
        path: `tmp/data-collection/runs/${effectivePeriod}.json`,
        exists: runManifest.exists,
        ...(runManifest.exists ? snapshot(`tmp/data-collection/runs/${effectivePeriod}.json`) : {}),
      },
    },
    report: {
      json: `tmp/reports/semi-monthly-run-report-${effectivePeriod}.json`,
      md: `tmp/reports/semi-monthly-run-report-${effectivePeriod}.md`,
      runArtifacts: `tmp/data-collection/runs/${effectivePeriod}-report.json`,
    },
    logs: {
      refresh: args.refreshLog ? snapshot(args.refreshLog) : { status: 'not-run' },
      deploy: args.deployLog ? snapshot(args.deployLog) : { status: 'not-run' },
      smoke: args.smokeLog ? snapshot(args.smokeLog) : { status: 'not-run' },
      e2e: args.e2eLog ? snapshot(args.e2eLog) : { status: 'not-run' },
    },
  },
  manifestSnapshot: {
    generatedAt: periodicData.generatedAt,
    refreshCadence: periodicData.refreshCadence,
    period: periodicData.period,
    windowStart: periodicData.windowStart,
    windowEnd: periodicData.windowEnd,
    nextScheduledAt: periodicData.nextScheduledAt,
    scheduleCron: periodicData.scheduleCron,
    week: periodicData.week,
    weekCompatibility: weeklyManifest.exists ? weeklyManifest.data?.week : periodicData.week,
    totals: periodicData.totals || {},
    auditSummary: periodicData.auditSummary || audit.data?.summary || null,
  },
  connectorBacklog: {
    exists: !!connectorBacklog,
    total: connectorBacklog?.total,
    groupCount: connectorBacklog?.groupCount,
    topP0: topPriorityConnectors,
    groups: Array.isArray(connectorBacklog?.groups)
      ? connectorBacklog.groups.map((group) => ({
          connectorId: group.connectorId,
          label: group.label,
          priority: group.priority,
          sourceCount: group.sourceCount,
          sourceIds: topListBy(group.sourceIds || []),
          stopCondition: group.stopCondition,
        }))
      : [],
  },
  sourceTaskQueue: {
    exists: !!sourceTaskQueue,
    total: sourceTaskQueue?.total,
    queueTypeCounts: sourceTaskQueue?.queueTypeCounts || {},
    priorityCounts: sourceTaskQueue?.priorityCounts || {},
    ownerTeamCounts: sourceTaskQueue?.ownerTeamCounts || {},
    topP0Tasks: sourceTaskQueue?.groups?.byPriority
      ? sourceTaskQueue.groups.byPriority.find((item) => item.priority === 'P0')?.taskIds?.slice(0, 10) || []
      : [],
  },
  publicEvidence: publicEvidenceSnapshot
    ? {
        mode: publicEvidenceSnapshot.mode,
        generatedAt: publicEvidenceSnapshot.generatedAt,
        total: publicEvidenceSnapshot.total,
        captureStatusCounts: publicEvidenceSnapshot.captureStatusCounts,
        evidenceClassCounts: publicEvidenceSnapshot.evidenceClassCounts,
        networkCalls: publicEvidenceSnapshot.networkCalls,
        businessDataWrites: publicEvidenceSnapshot.businessDataWrites,
      }
    : null,
  checks: {
    dataAudit: {
      exists: audit.exists,
      status: audit.exists ? statusFromValue(audit.data?.summary?.criticalIssueCount === 0 ? 0 : 1) : 'not-run',
      issueCount: audit.data?.summary?.issueCount ?? null,
      criticalIssueCount: audit.data?.summary?.criticalIssueCount ?? null,
      criticalSample: Array.isArray(audit.data?.issues)
        ? audit.data.issues
            .filter((item) => item.severity === 'critical')
            .slice(0, 10)
            .map((item) => `${item.severity}:${item.code}:${item.detail}`)
        : [],
    },
    refresh: { status: refreshStatus, log: args.refreshLog },
    deploy: {
      status: deployStatus,
      log: args.deployLog,
      includesBuild: true,
      includesLint: true,
      includesAudit: true,
      includesTest: true,
    },
    smoke: {
      status: smokeStatus,
      log: args.smokeLog,
      summary: smokeSummary,
    },
    e2eProd: {
      status: e2eStatus,
      log: args.e2eLog,
      summary: e2eSummary,
      lastRunPath: args.e2eLastRunPath,
    },
  },
};

const allPassed =
  runReport.checks.refresh.status === 'passed' &&
  runReport.checks.deploy.status === 'passed' &&
  (runReport.checks.smoke.status === 'passed' || runReport.checks.smoke.status === 'not-run') &&
  (runReport.checks.e2eProd.status === 'passed' || runReport.checks.e2eProd.status === 'not-run') &&
  runReport.checks.dataAudit.status !== 'failed';

runReport.gate = {
  status: allPassed ? 'pass' : 'block',
  reason: allPassed ? 'all required checks passed and no audit critical issues' : 'check status not fully passed or audit critical issues exist',
};

const outputDir = resolve(appRoot, args.outputDir);
const runsDir = resolve(appRoot, args.runDir);
mkdirSync(outputDir, { recursive: true });
mkdirSync(runsDir, { recursive: true });

const reportOutputPath = resolve(outputDir, `semi-monthly-run-report-${effectivePeriod}.json`);
const runArtifactPath = resolve(runsDir, `${effectivePeriod}-report.json`);
const mdReportPath = resolve(outputDir, `semi-monthly-run-report-${effectivePeriod}.md`);

writeFileSync(reportOutputPath, `${JSON.stringify(runReport, null, 2)}\n`);
writeFileSync(runArtifactPath, `${JSON.stringify(runReport, null, 2)}\n`);

const markdown = [
  '# mkt53 半月发布运行报告',
  `- 生成时间：${runReport.generatedAt}`,
  `- 周期：${runReport.period}`,
  `- 刷新窗口：${runReport.manifestSnapshot.windowStart || 'N/A'} ~ ${runReport.manifestSnapshot.windowEnd || 'N/A'}`,
  `- 触发来源：${runReport.trigger.source}`,
  `- 报告路径：
    - JSON: ${relative(appRoot, reportOutputPath)}
    - Markdown: ${relative(appRoot, mdReportPath)}
    - 归档运行文件：${relative(appRoot, runArtifactPath)}`,
  '',
  '## 门禁摘要',
  `- ` + `refresh: ${runReport.checks.refresh.status}`,
  `- deploy: ${runReport.checks.deploy.status}`,
  `- smoke: ${runReport.checks.smoke.status}`,
  `- e2e-prod: ${runReport.checks.e2eProd.status}`,
  `- data-audit: ${runReport.checks.dataAudit.status}`,
  `- 总体门禁：${runReport.gate.status}`,
  '',
  '## 清单摘要',
  `- manifest：${runReport.manifestSnapshot.refreshCadence}/${runReport.manifestSnapshot.generatedAt}`,
  `- connector backlog：${runReport.connectorBacklog.total ?? 0}（P0 ${runReport.connectorBacklog.topP0.length}）`,
  `- source tasks：${runReport.sourceTaskQueue.total ?? 0}`,
  `- public evidence mode：${runReport.publicEvidence?.mode ?? 'skipped'}`,
  `- source-error：${runReport.manifestSnapshot.totals?.['source-error'] ?? 0}`,
  `- fetch-error：${runReport.manifestSnapshot.totals?.['fetch-error'] ?? 0}`,
  '',
  '## 重点告警',
  runReport.checks.dataAudit.criticalIssueCount === 0
    ? '- 无 critical issue'
    : `- data-audit critical：${runReport.checks.dataAudit.criticalIssueCount}`,
  ...(runReport.checks.dataAudit.criticalSample.length
    ? runReport.checks.dataAudit.criticalSample.slice(0, 5).map((item) => `  - ${item}`)
    : []),
  '',
  '## 执行摘要',
  `- refresh 结果：${runReport.checks.refresh.status}`,
  args.refreshLog ? `- refresh log：${runReport.checks.refresh.log}` : '',
  `- deploy 结果：${runReport.checks.deploy.status}`,
  args.deployLog ? `- deploy log：${runReport.checks.deploy.log}` : '',
  `- smoke 结果：${runReport.checks.smoke.status}`,
  args.smokeLog ? `- smoke log：${runReport.checks.smoke.log}` : '',
  `- e2e-prod 结果：${runReport.checks.e2eProd.status}`,
  args.e2eLog ? `- e2e log：${runReport.checks.e2eProd.log}` : '',
  '',
  '## 兼容文件',
  `- periodic manifest: ${runReport.artifacts.manifest.periodic.path || 'N/A'}`,
  `- weekly兼容 manifest: ${runReport.artifacts.manifest.weeklyCompatible.path || 'N/A'}`,
].filter((line) => line !== undefined);

writeFileSync(mdReportPath, `${markdown.join('\n')}\n`);

if (args.json) {
  process.stdout.write(`${JSON.stringify(runReport, null, 2)}\n`);
}

process.stdout.write(`mkt53 semi-monthly run report generated\n`);
process.stdout.write(`period=${runReport.period}\n`);
process.stdout.write(`gate=${runReport.gate.status}\n`);
process.stdout.write(`json=${relative(appRoot, reportOutputPath)}\n`);
process.stdout.write(`md=${relative(appRoot, mdReportPath)}\n`);
