---
title: mkt53 Loop5 半月数据刷新门禁
doc_type: analysis
module: project
topic: semi-monthly-refresh-gate
status: draft
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
provider_calls: false
restricted_connector_access: false
public_evidence_live_capture: false
production_writes: false
production_deploy: false
fact_promotion: false
local_refresh: true
---

# mkt53 Loop5 半月数据刷新门禁

## 1. 本轮目标

将本地半月数据 manifest 从 `2026-06-H1` 刷新到当前周期 `2026-07-H1`，并验证刷新产物是否可以进入后续生产发布授权。

本轮仅执行 **local refresh gate**：

- 不执行 `data:deploy:semi-monthly`
- 不执行 `deploy:prod`
- 不执行 `data:public-evidence:live`
- 不调用 Amazon、CRM、ERP、VOC、YouTube、社媒、Import Genius 等受限连接器
- 不进行事实晋升

## 2. 刷新前基线

| 检查项 | 结果 |
|---|---|
| 本地 `public/periodic-data/latest.json` | `period=2026-06-H1`、`generatedAt=2026-06-14T05:06:31.080Z`、`nextScheduledAt=2026-06-16T09:00:00+08:00` |
| 本地 `public/weekly-data/latest.json` | 与 periodic 兼容路径一致，仍为 `2026-06-H1` |
| 生产只读 manifest | `https://mkt.lute-tlz-dddd.top/periodic-data/latest.json` 仍为 `2026-06-H1` |
| 当前代码预期周期 | `2026-07-H1`、窗口 `2026-07-01..2026-07-15`、下一次计划 `2026-07-16T09:00:00+08:00` |
| public evidence dry-run 预检 | `total=12`、`captureStatusCounts={planned:12}`、`networkCalls=0`、`businessDataWrites=0` |

备份位置：

`/Users/pray/.Codex/file-history/mkt53/20260701-loop5-semi-monthly-refresh/`

已备份：

- `app/public/periodic-data/latest.json`
- `app/public/periodic-data/connectors.json`
- `app/public/periodic-data/source-tasks.json`
- `app/public/periodic-data/public-evidence-samples.json`
- `app/public/weekly-data/latest.json`
- `app/public/weekly-data/connectors.json`
- `app/public/weekly-data/source-tasks.json`
- `app/public/weekly-data/public-evidence-samples.json`

## 3. 本地刷新执行

执行命令：

```bash
cd /Users/pray/project/mkt53/app
env -u MKT53_PUBLIC_EVIDENCE_MODE -u MKT53_PUBLIC_EVIDENCE_LIVE npm run data:refresh:semi-monthly
```

执行结果：

| 输出项 | 结果 |
|---|---|
| `period` | `2026-07-H1` |
| `week` | `2026-W27` |
| `window` | `2026-07-01..2026-07-15` |
| `nextScheduledAt` | `2026-07-16T09:00:00+08:00` |
| `latest` | `public/periodic-data/latest.json` |
| `compatLatest` | `public/weekly-data/latest.json` |
| `run` | `tmp/data-collection/runs/2026-07-H1.json` |
| `publicEvidenceMode` | `dry-run` |
| `publicEvidenceCaptured` | `0/12` |
| `publicEvidenceBusinessDataWrites` | `0` |
| `total` | `53` |
| `ok` | `16` |
| `connector-required` | `28` |
| `manual-required` | `6` |
| `source-error` | `3` |
| `fetch-error` | `0` |

## 4. 刷新后产物核验

### 4.1 manifest 摘要

| 文件 | 关键状态 |
|---|---|
| `public/periodic-data/latest.json` | `period=2026-07-H1`、`generatedAt=2026-07-01T01:41:59.829Z` |
| `public/weekly-data/latest.json` | 与 periodic latest 完全一致 |
| `public/periodic-data/public-evidence-samples.json` | `mode=dry-run`、`planned=12`、`networkCalls=0`、`businessDataWrites=0` |
| `tmp/data-collection/runs/2026-07-H1.json` | 保存完整本地运行 manifest |

### 4.2 source-error 明细

| source id | 页面 | 指标 | HTTP | 处理口径 |
|---|---|---|---|---|
| `ds-002` | `MarketPage` | 北美区域份额 | `500` | 公开报告源返回非 2xx，保持 `source-error`，需人工复核或下次重试 |
| `ds-044` | `MarketPage` | 全球婴童用品上层 TAM | `403` | 公开报告源访问受限，保持 `source-error`，不得用旧样本替代当前刷新事实 |
| `ds-045` | `MarketPage` | 穿戴式吸奶器细分 TAM | `500` | 公开报告源返回非 2xx，保持 `source-error`，需人工复核或下次重试 |

### 4.3 生产只读复核

刷新后重新读取生产 manifest：

| 环境 | period | generatedAt | 状态 |
|---|---|---|---|
| local | `2026-07-H1` | `2026-07-01T01:41:59.829Z` | 已刷新 |
| production read-only | `2026-06-H1` | `2026-06-14T05:06:31.080Z` | production unchanged |

结论：本轮只完成本地刷新；生产仍处于旧周期，后续必须单独授权发布。

## 5. 质量门验证

| 验证项 | 命令 | 结果 |
|---|---|---|
| 数据一致性审计 | `node scripts/data/audit-consistency.mjs --json` | `pageCount=43`、`tableCount=107`、`sourceRegistryCount=53`、`issueCount=0`、`criticalIssueCount=0` |
| 深度证据审计 | `node scripts/data/audit-deep.mjs --summary-json --no-write` | `claimCount=670`、`unsupportedClaimCount=0`、`highRiskClaimCount=0`、`sourceGapCount=26` |
| 单元测试 | `npm run test` | 8 个测试文件、90 个测试通过 |
| 构建 | `npm run build` | 生产构建通过 |
| lint | `npm run lint` | 通过 |
| npm audit | `npm audit` | `found 0 vulnerabilities` |

## 6. 门禁判定

### 6.1 事实

- 本地半月 manifest 已刷新到 `2026-07-H1`。
- 兼容 `weekly-data` 路径已同步到同一份 `2026-07-H1` 内容。
- public evidence 本轮为 dry-run：只生成 planned manifest，未启动浏览器 live capture。
- 生产只读仍为 `2026-06-H1`，生产未更新。
- 3 个公开报告源在当前刷新窗口返回 `403/500`，已保留为 `source-error`。

### 6.2 推断

- 本地刷新产物可以作为后续生产发布候选，但不应直接当成“线上已更新”。
- 3 个 `source-error` 不阻断本地 manifest 生成，但会影响领导汇报中关于市场规模/区域份额的“当前可达证据”叙述，需要保留错误状态或人工补证。
- `connector-required=28` 与 `manual-required=6` 表明高价值经营数据仍依赖 owner intake、授权快照和连接器 readiness。

### 6.3 不确定项

- 本轮未执行生产发布，无法确认生产部署后页面加载和生产 E2E 结果。
- 本轮未执行 live public evidence，无法确认 12 个 public evidence seed 的当前网页截图或文本归档。
- 本轮未接入受限连接器，无法确认 Amazon、CRM、ERP、VOC 等真实业务数据刷新。

## 7. 边界关闭

| 边界项 | 状态 |
|---|---|
| `localRefresh` | `true` |
| `publicEvidenceLiveCapture` | `false` |
| `providerCalls` | `false` |
| `restrictedConnectorAccess` | `false` |
| `productionWrites` | `false` |
| `productionDeploy` | `false` |
| `factPromotion` | `false` |
| `sourceRegistryWrites` | `false` |
| `pageWrites` | `false` |

## 8. 下一步

推荐进入单独的 **Production Read-only And Release Authorization Gate**：

1. 先确认是否接受本地 `2026-07-H1` manifest 中的 3 个 `source-error` 以错误状态上线。
2. 若接受，明确授权执行生产发布链。
3. 发布后运行 production smoke 和 production E2E。
4. 若不接受，先补 `ds-002`、`ds-044`、`ds-045` 的人工证据或下一轮 public URL 重试，再发布。
