---
title: mkt53 Loop8 Source Task 覆盖修复门禁
doc_type: analysis
module: data-governance
topic: source-task-coverage-gate
status: draft
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
provider_calls: false
production_writes: false
production_deploy: false
restricted_connector_access: false
public_evidence_live_capture: false
fact_promotion: false
---

# mkt53 Loop8 Source Task 覆盖修复门禁

## 1. 本轮目标

**目标**：修复 `source-tasks.json` 对当期 `source-error` 公开来源的覆盖缺口，让 `ds-002`、`ds-044`、`ds-045` 均进入公开来源复核任务队列。

## 2. 问题基线

Loop7 发现：

| source_id | 当期采集状态 | registry 状态 | 修复前任务覆盖 |
|---|---|---|---|
| `ds-002` | `source-error` / HTTP `500` | `verified`，且 `gap` 有值 | 已覆盖 |
| `ds-044` | `source-error` / HTTP `403` | `verified`，`gap=''` | 未覆盖 |
| `ds-045` | `source-error` / HTTP `500` | `verified`，`gap=''` | 未覆盖 |

**根因**：`buildSourceTaskQueue` 只根据 source registry 的 `verificationStatus` 和 `gap` 建公开复核任务；当期 public URL 采集结果没有传入任务队列生成逻辑，因此 `verified + gap=''` 的来源即使本期不可达，也不会生成补证任务。

## 3. 本轮修改

| 文件 | 修改 |
|---|---|
| `app/scripts/data/lib/source-tasks.mjs` | `buildSourceTaskQueue` 增加可选 `sourceResults` 输入；当 `public-url-check` 的当期结果为 `source-error` 或 `fetch-error` 时生成 `public-source-review` 任务 |
| `app/scripts/data/collect-weekly-sources.mjs` | 将 source task queue 生成移动到采集结果完成之后，并传入 `sourceResults: sources` |
| `app/tests/scripts/static-scripts.test.ts` | 增加 verified registry 行 + 当期 public URL 异常结果的覆盖测试 |

## 4. 刷新结果

执行：

```bash
cd /Users/pray/project/mkt53/app
npm run data:refresh:semi-monthly
```

结果：

| 项 | 值 |
|---|---|
| `period` | `2026-07-H1` |
| `week` | `2026-W27` |
| `window` | `2026-07-01..2026-07-15` |
| `totals.total` | `53` |
| `totals.ok` | `16` |
| `totals.source-error` | `3` |
| `totals.connector-required` | `28` |
| `totals.manual-required` | `6` |
| `publicEvidenceMode` | `dry-run` |
| `publicEvidenceBusinessDataWrites` | `0` |

刷新后的任务队列：

| 文件 | total | connector-readiness | manual-evidence | public-source-review | `ds-002` | `ds-044` | `ds-045` |
|---|---:|---:|---:|---:|---|---|---|
| `app/public/periodic-data/source-tasks.json` | `41` | `28` | `6` | `7` | yes | yes | yes |
| `app/public/weekly-data/source-tasks.json` | `41` | `28` | `6` | `7` | yes | yes | yes |
| `app/tmp/data-collection/runs/2026-07-H1-source-tasks.json` | `41` | `28` | `6` | `7` | yes | yes | yes |

保留的当期公开 URL 状态：

| source_id | 状态 | HTTP | 任务 blockedReason |
|---|---|---:|---|
| `ds-002` | `source-error` | `500` | `自动化访问受反爬限制` |
| `ds-044` | `source-error` | `403` | `HTTP 403：公开来源返回非 2xx，需要人工确认链接或供应商权限。` |
| `ds-045` | `source-error` | `500` | `HTTP 500：公开来源返回非 2xx，需要人工确认链接或供应商权限。` |

## 5. 验证记录

| 验证项 | 结果 |
|---|---|
| `npm run test -- static-scripts` | 69 passed |
| `npm run test` | 8 files / 91 tests passed |
| `npm run lint` | passed |
| `npm run build` | passed |
| `node scripts/data/audit-consistency.mjs --json` | `issueCount=0`、`criticalIssueCount=0` |
| `node scripts/data/audit-deep.mjs --summary-json --no-write` | `claimCount=670`、`sourceGapCount=26`、`highRiskClaimCount=0`、`unsupportedClaimCount=0` |
| no-network 队列摘要 | `total=39`、`connector-readiness=28`、`manual-evidence=6`、`public-source-review=5`，保持 registry-only dry-run 基线 |
| 半月刷新 | 通过，产物写入本地 `public/periodic-data/*`、`public/weekly-data/*` 和 `tmp/data-collection/runs/2026-07-H1*` |

## 6. 边界

- `productionWrites=false`：未同步 `/opt/mkt53/html/`。
- `productionDeploy=false`：未执行 `deploy:prod` 或 `data:deploy:semi-monthly`。
- `providerCalls=false`：未调用模型或外部 provider。
- `restrictedConnectorAccess=false`：未调用 Amazon、CRM、ERP、VOC、YouTube、社媒或 Import Genius。
- `publicEvidenceLiveCapture=false`：公开证据仍为 dry-run。
- `factPromotion=false`：三条来源仍保持 `source-error`，没有晋升为 `ok` 或 verified 事实。

## 7. 下一步建议

建议进入 **Loop9：人工补证包门禁**：

1. 为 `public-source-review:ds-002`、`public-source-review:ds-044`、`public-source-review:ds-045` 生成人工补证包。
2. 找回或重新生成 `ds-044` artifact，并核对 registry 中 `evidenceArtifactPath` 的真实存在性。
3. 若真实浏览器仍无法访问，准备替代来源候选和 TAM/SAM/SOM 口径差异表。
