#!/usr/bin/env node
// 校验 audit-deep --strict 覆盖不到的发布面：生成数据文件的一致性、时间语义与调度新鲜度。
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MANIFEST_FILES = [
  'latest.json',
  'connectors.json',
  'source-tasks.json',
  'public-evidence-samples.json',
  'customs-public-adapter.json',
];

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(resolve(filePath))).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(readFileSync(resolve(filePath), 'utf8'));
}

const issues = [];
const add = (code, detail) => issues.push({ code, detail });

// periodic-data 是 canonical，weekly-data 是周度切半月度后的旧路径兼容层。
// 两者由同一脚本写入，分叉意味着有人只刷新了一侧或误跑了 legacy 命令。
for (const file of MANIFEST_FILES) {
  const canonical = sha256(`public/periodic-data/${file}`);
  const compat = sha256(`public/weekly-data/${file}`);
  if (canonical !== compat) {
    add('plane-dual-write-drift', `${file}: periodic-data 与 weekly-data 不一致`);
  }
}

const latest = readJson('public/periodic-data/latest.json');

const nextScheduledAt = latest.nextScheduledAt;
if (typeof nextScheduledAt !== 'string' || Number.isNaN(Date.parse(nextScheduledAt))) {
  add('plane-schedule-invalid', `nextScheduledAt 缺失或非法: ${nextScheduledAt}`);
} else if (Date.parse(nextScheduledAt) <= Date.now()) {
  const overdueDays = Math.floor((Date.now() - Date.parse(nextScheduledAt)) / 86400000);
  add('plane-schedule-overdue', `nextScheduledAt ${nextScheduledAt} 已逾期 ${overdueDays} 天，无采集不得重写 generatedAt`);
}

const evidence = readJson('public/periodic-data/public-evidence-samples.json');
if (evidence.mode !== 'live') {
  for (const record of evidence.records ?? []) {
    if (record.capturedAt) {
      add('plane-evidence-timestamp-drift', `${record.seedId}: captureStatus=${record.captureStatus} 却带 capturedAt`);
    }
  }
  const statusCounts = evidence.summary?.captureStatusCounts ?? {};
  const captured = Object.entries(statusCounts).filter(([status]) => status === 'captured');
  if (captured.length > 0) {
    add('plane-evidence-mode-mismatch', `mode=${evidence.mode} 但 summary 报告 ${captured} 条 captured`);
  }
}

const tasks = readJson('public/periodic-data/source-tasks.json');
const taskList = tasks.tasks ?? [];
if (tasks.total !== taskList.length) {
  add('plane-task-count-mismatch', `total=${tasks.total} 与 tasks.length=${taskList.length} 不符`);
}
const taskIds = taskList.map((task) => task.taskId ?? task.id);
if (new Set(taskIds).size !== taskIds.length) {
  add('plane-task-id-duplicate', 'taskId 存在重复');
}

const result = {
  gate: 'data-plane',
  generatedAt: new Date().toISOString(),
  checkedFiles: MANIFEST_FILES.length,
  schedule: { nextScheduledAt, cadence: latest.refreshCadence ?? null },
  evidenceMode: evidence.mode ?? null,
  issueCount: issues.length,
  issues,
};

if (asJson) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write([
    `mkt53 data plane audit`,
    `checkedFiles=${result.checkedFiles}`,
    `nextScheduledAt=${result.schedule.nextScheduledAt}`,
    `evidenceMode=${result.evidenceMode}`,
    `issues=${result.issueCount}`,
    ...issues.map((issue) => `  - [${issue.code}] ${issue.detail}`),
  ].join('\n'));
  process.stdout.write('\n');
}

process.exitCode = issues.length > 0 ? 1 : 0;
