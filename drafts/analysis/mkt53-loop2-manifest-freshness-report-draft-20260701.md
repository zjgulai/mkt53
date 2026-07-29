---
title: mkt53 Loop2 半月 Manifest 新鲜度核对报告
doc_type: analysis
module: project
topic: loop2-manifest-freshness
status: draft
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
production_read_only: true
provider_calls: false
production_writes: false
production_deploy: false
public_evidence_live_capture: false
fact_promotion: false
---

# mkt53 Loop2 半月 Manifest 新鲜度核对报告

## 1. 边界

本轮只执行本地文件读取和生产 HTTPS 只读读取。

- `providerCalls=false`
- `productionWrites=false`
- `productionDeploy=false`
- `publicEvidenceLiveCapture=false`
- `factPromotion=false`

本轮未执行：

- `npm run data:refresh:semi-monthly`
- `npm run data:deploy:semi-monthly`
- `npm run data:public-evidence:live`
- `npm run deploy:prod`
- 任何 Amazon、CRM、ERP、VOC、YouTube、社媒或 Import Genius 受限连接器

## 2. 时间基线

| 项 | 值 |
|---|---|
| 本机核对时间 | `2026-07-01 08:37:02 CST` |
| 预期当前半月周期 | `2026-07-H1` |
| 今日 cron 状态 | `2026-07-01 09:00 +08:00` 尚未到点 |
| 已经过期的上一计划时间 | `2026-06-16T09:00:00+08:00` |

判断：虽然 7 月 1 日 09:00 cron 尚未到点，但 manifest 仍指向 6 月上半月，说明至少 `2026-06-H2` 周期没有体现在当前本地和生产静态 manifest 中。

## 3. 本地 Manifest

| 字段 | 结果 |
|---|---|
| 路径 | `app/public/periodic-data/latest.json` |
| `periodType` | `semi-monthly` |
| `period` | `2026-06-H1` |
| `windowStart` | `2026-06-01` |
| `windowEnd` | `2026-06-15` |
| `generatedAt` | `2026-06-14T05:06:31.080Z` |
| `nextScheduledAt` | `2026-06-16T09:00:00+08:00` |
| `totals` | `total=45`、`ok=10`、`manual-required=12`、`connector-required=23` |
| `issueCount` | `0` |
| `sourceTaskQueueCount` | `42` |
| public evidence | `live-browser-capture`，`12/12 captured`，`businessDataWrites=0` |
| weekly 兼容路径 | `app/public/weekly-data/latest.json` 与 periodic 摘要一致 |

结论：`local stale=true`。本地 manifest 周期落后于当前日期，且 `nextScheduledAt` 已经过期。

## 4. 生产只读 Manifest

| URL | HTTP | 内容结论 |
|---|---:|---|
| `https://mkt.lute-tlz-dddd.top/periodic-data/latest.json` | `200` | `period=2026-06-H1`、`generatedAt=2026-06-14T05:06:31.080Z`、`nextScheduledAt=2026-06-16T09:00:00+08:00` |
| `https://mkt.lute-tlz-dddd.top/periodic-data/connectors.json` | `200` | JSON 可解析，`Last-Modified=Tue, 30 Jun 2026 07:18:43 GMT` |
| `https://mkt.lute-tlz-dddd.top/periodic-data/source-tasks.json` | `200` | `generatedAt=2026-06-14T05:06:31.080Z`、`taskCount=42` |
| `https://mkt.lute-tlz-dddd.top/periodic-data/public-evidence-samples.json` | `200` | `generatedAt=2026-06-14T05:06:37.375Z`、`total=12` |
| `https://mkt.lute-tlz-dddd.top/weekly-data/latest.json` | `200` | 与 periodic latest 一致，仍为 `2026-06-H1` |

结论：`production stale=true`。生产静态文件可访问、JSON 可解析，但内容周期仍为 `2026-06-H1`。

补充判断：生产 HTTP `Last-Modified=2026-06-30` 只说明静态文件可能被重新发布或触碰过，不代表 manifest 内容已刷新到 6 月下半月或 7 月上半月。

## 5. 分类结论

| 分类 | 状态 | 证据 |
|---|---|---|
| `local stale` | `true` | 本地 `period=2026-06-H1`，预期 `2026-07-H1` |
| `production stale` | `true` | 生产 `periodic-data/latest.json` 仍为 `2026-06-H1` |
| `cron stale` | `likely` | manifest 的 `nextScheduledAt=2026-06-16T09:00:00+08:00` 已过期；7 月 1 日 09:00 cron 核验仍需到点后复查 |
| `data source stale` | `unknown-by-readonly-check` | 本轮没有执行采集或刷新，只能确认 manifest 内容陈旧，不能确认每个上游数据源当前状态 |

## 6. 建议动作

### 6.1 09:10 后生产只读复查

在 `2026-07-01 09:10 +08:00` 后再次只读检查：

```bash
cd /Users/pray/project/mkt53/app
node -e "fetch('https://mkt.lute-tlz-dddd.top/periodic-data/latest.json').then(r=>r.json()).then(j=>console.log(JSON.stringify({period:j.period,generatedAt:j.generatedAt,nextScheduledAt:j.nextScheduledAt,totals:j.totals},null,2)))"
```

验收：

- 若生产已变为 `2026-07-H1`，记录 cron recovered。
- 若仍为 `2026-06-H1`，进入授权刷新。

### 6.2 授权后本地刷新

本地刷新会写入 `app/public/periodic-data/*`、`app/public/weekly-data/*` 和 `app/tmp/data-collection/runs/*`，因此应作为单独授权动作执行。

建议先使用非 live public evidence：

```bash
cd /Users/pray/project/mkt53/app
npm run data:refresh:semi-monthly -- --no-network
npm run data:audit:json
npm run data:audit:deep:summary
npm run test
```

边界：

- `--no-network` 下不进行 public evidence live capture。
- 仍不得把 `connector-required` 或 `manual-required` 晋升为 `ok`。
- 本地刷新不等于生产部署。

### 6.3 授权后生产发布

仅在本地刷新和质量门通过后，再执行发布授权：

```bash
cd /Users/pray/project/mkt53/app
npm run data:deploy:semi-monthly
```

如需公开证据 live capture，必须单独显式授权 `--public-evidence-live`。

## 7. Loop2 状态

Loop2 已完成 freshness read-only audit。当前结论是：本地和生产 manifest 均可读但周期陈旧；下一步应先在 09:10 后复查 cron，如仍陈旧，再进入授权刷新和发布链。
