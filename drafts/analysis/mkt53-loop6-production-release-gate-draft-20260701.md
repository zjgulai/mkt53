---
title: mkt53 Loop6 生产发布授权门禁
doc_type: analysis
module: project
topic: production-release-gate
status: draft
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
provider_calls: false
restricted_connector_access: false
public_evidence_live_capture: false
production_writes: true
production_deploy: true
production_code_deploy: false
fact_promotion: false
---

# mkt53 Loop6 生产发布授权门禁

## 1. 授权与目标

用户已明确接受 `ds-002`、`ds-044`、`ds-045` 三个 `source-error` 以上线状态保留。

本轮目标：把 Loop5 生成的 `2026-07-H1` 半月数据 manifest 发布到生产，并验证生产只读结果。

## 2. 发布策略

发布前检查发现当前工作区有多项既有前端代码和测试文件改动。若执行全量 `npm run deploy:prod` 或 `data:deploy:semi-monthly`，会把这些代码一并打入生产静态包。

因此本轮采用更窄的生产写入策略：

- 只同步 `app/public/periodic-data/` 到 `/opt/mkt53/html/periodic-data/`
- 只同步 `app/public/weekly-data/` 到 `/opt/mkt53/html/weekly-data/`
- 不重建或重启 nginx
- 不同步 `dist/`
- 不覆盖 `/opt/mkt53/html/index.html`

这是一次 **production data JSON sync**，不是全量前端代码发布。

## 3. 发布前证据

| 检查项 | 结果 |
|---|---|
| 远端 nginx 容器 | `ai_video_nginx` running |
| nginx server block | `server_name mkt.lute-tlz-dddd.top` |
| nginx root | `/var/www/mkt53` |
| compose mount | `/opt/mkt53/html:/var/www/mkt53:ro` |
| 本地 manifest | `period=2026-07-H1`、`total=53`、`ok=16`、`source-error=3`、`connector-required=28`、`manual-required=6` |
| public evidence | `mode=dry-run`、`planned=12`、`networkCalls=0`、`businessDataWrites=0` |
| 数据一致性审计 | `criticalIssueCount=0` |
| 深度证据审计 | `highRiskClaimCount=0`、`unsupportedClaimCount=0`、`sourceGapCount=26` |

## 4. 远端备份

发布前已备份生产旧数据目录：

`/opt/mkt53/backups/20260701-loop6-semi-monthly-data-before-json-sync/`

备份内容：

- `periodic-data/connectors.json`
- `periodic-data/latest.json`
- `periodic-data/public-evidence-samples.json`
- `periodic-data/source-tasks.json`
- `weekly-data/connectors.json`
- `weekly-data/latest.json`
- `weekly-data/public-evidence-samples.json`
- `weekly-data/source-tasks.json`

第一次远端备份命令因本地 shell 提前展开远端变量而失败，未写生产文件；随后改用单引号包裹远端脚本并备份成功。

## 5. 生产写入

执行了两条窄范围 `rsync`：

```bash
rsync -az --delete \
  -e "ssh -i /Users/pray/project/mkt53/ai_video.pem -o BatchMode=yes -o ConnectTimeout=15" \
  /Users/pray/project/mkt53/app/public/periodic-data/ \
  ubuntu@101.34.52.232:/opt/mkt53/html/periodic-data/

rsync -az --delete \
  -e "ssh -i /Users/pray/project/mkt53/ai_video.pem -o BatchMode=yes -o ConnectTimeout=15" \
  /Users/pray/project/mkt53/app/public/weekly-data/ \
  ubuntu@101.34.52.232:/opt/mkt53/html/weekly-data/
```

## 6. 发布后验证

| 验证项 | 结果 |
|---|---|
| `https://mkt.lute-tlz-dddd.top/periodic-data/latest.json` | `period=2026-07-H1`、`total=53`、`source-error=3`、`publicEvidence.mode=dry-run` |
| `https://mkt.lute-tlz-dddd.top/weekly-data/latest.json` | `period=2026-07-H1`，兼容路径已更新 |
| `docker exec ai_video_nginx nginx -t` | 通过 |
| `curl -I https://mkt.lute-tlz-dddd.top` | HTTP `200` |
| `npm run smoke:prod` | 通过 |
| `npm run test:e2e:prod` | 首次 `8/14` 通过、`6` 个断言失败；修正测试基线后 `14/14` 通过 |
| `npm run lint` | 通过 |
| `npm run test` | 8 个测试文件、90 个测试通过 |

生产文件时间戳复核：

| 文件 | 状态 |
|---|---|
| `/opt/mkt53/html/index.html` | `2026-06-30 15:18:43 +0800`，未覆盖 |
| `/opt/mkt53/html/periodic-data/latest.json` | `2026-07-01 09:42:10 +0800`，已更新 |
| `/opt/mkt53/html/weekly-data/latest.json` | `2026-07-01 09:42:10 +0800`，已更新 |

## 7. E2E 修正说明

首次 production E2E 失败原因：测试仍硬编码旧基线 `sourceRegistryCount=45` 和 `connectorBacklog.total=23`，而本轮生产数据已更新为 `sourceRegistryCount=53`、`connectorBacklog.total=28`。

修正文件：

`app/tests/e2e-prod/lute-landing.spec.ts`

修正口径：

- manifest `totals.total` 必须等于 `auditSummary.sourceRegistryCount`
- manifest `connectorBacklog.total` 必须等于 `totals['connector-required']`
- connector backlog `total` 必须等于 `items.length`
- 保留不低于旧基线的回归约束

该修正只更新生产 E2E 的验证口径，不改变生产页面代码。

## 8. 边界关闭

| 边界项 | 状态 |
|---|---|
| `productionWrites` | `true`，仅限 `/opt/mkt53/html/periodic-data/` 和 `/opt/mkt53/html/weekly-data/` |
| `productionDeploy` | `true`，静态数据 JSON 已上线 |
| `productionCodeDeploy` | `false`，未同步 `dist/`，未覆盖 `index.html` |
| `providerCalls` | `false` |
| `restrictedConnectorAccess` | `false` |
| `publicEvidenceLiveCapture` | `false` |
| `factPromotion` | `false` |
| `nginxRestart` | `false` |

## 9. 结论

Loop6 已完成生产数据 JSON 发布。线上半月 manifest 已从 `2026-06-H1` 更新为 `2026-07-H1`。

本次上线保留 3 个公开来源 `source-error`，符合用户授权；同时保留 `connector-required=28`、`manual-required=6` 的治理边界。下一步不应继续做生产写入，而应回到 owner intake、connector readiness 或 source-error 补证。
