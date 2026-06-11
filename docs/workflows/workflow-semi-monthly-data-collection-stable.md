---
title: 半月数据采集刷新工作流
doc_type: workflow
module: data-collection
topic: semi-monthly-refresh
status: stable
created: 2026-06-11
updated: 2026-06-11
owner: self
source: human+ai
---

# 半月数据采集刷新工作流

## 当前结论

mkt53 数据刷新节奏从周度调整为半月一次。正式计划为每月 1 日和 16 日 09:00（`Asia/Shanghai`）执行，生成当期 `YYYY-MM-H1` 或 `YYYY-MM-H2` manifest。

该工作流仍采用“脚本采集 → 生成静态 manifest → 构建部署”的方式。受限来源保持 `connector-required` 或 `manual-required`，不使用脚本伪造真实授权采集结果。

## 最新验证状态

2026-06-11 已完成一次半月生产发布和线上复核：

| 项 | 结果 |
|---|---|
| 生产周期 | `2026-06-H1` |
| 生产 manifest | `refreshCadence=semi-monthly`，`generatedAt=2026-06-11T07:30:40.503Z` |
| 下次计划刷新 | `2026-06-16T09:00:00+08:00` |
| 来源状态 | total 45，ok 10，connector-required 23，manual-required 12，issueCount 0 |
| 发布命令 | `npm run data:deploy:semi-monthly` 已通过 |
| 生产验证 | `npm run smoke:prod` 已通过，`npm run test:e2e:prod` 14/14 通过 |
| nginx 验证 | `docker exec ai_video_nginx nginx -t` 通过，首页返回 HTTP/2 200 |
| 服务器 cron | `/opt/mkt53/automation/app` 已安装半月 cron |

## 脚本入口

```bash
cd app
npm run data:audit
npm run data:source-tasks
npm run data:refresh:semi-monthly
```

输出文件：

| 文件 | 用途 |
|---|---|
| `public/periodic-data/latest.json` | 前端读取的最新半月采集 manifest |
| `public/periodic-data/connectors.json` | 最新授权连接器接入 backlog |
| `public/periodic-data/source-tasks.json` | 最新补证任务队列，覆盖连接器接入、人工凭证和公开来源复核 |
| `public/weekly-data/latest.json` | 兼容旧路径的同内容 manifest |
| `public/weekly-data/connectors.json` | 兼容旧路径的同内容 connector backlog |
| `public/weekly-data/source-tasks.json` | 兼容旧路径的同内容补证任务队列 |
| `tmp/data-collection/audit-latest.json` | 本次一致性审计结果 |
| `tmp/data-collection/runs/<period>.json` | 本地半月运行留痕 |
| `tmp/data-collection/runs/<period>-connectors.json` | 本地连接器 backlog 留痕 |
| `tmp/data-collection/runs/<period>-source-tasks.json` | 本地补证任务队列留痕 |

manifest 必须包含：

| 字段 | 含义 |
|---|---|
| `refreshCadence` | 固定为 `semi-monthly` |
| `period` | `YYYY-MM-H1` 或 `YYYY-MM-H2` |
| `windowStart` / `windowEnd` | 当期采集窗口 |
| `nextScheduledAt` | 下次计划执行时间，带 `+08:00` 时区 |
| `week` | ISO week 兼容字段，供旧消费者平滑迁移 |
| `connectorBacklog` | 授权连接器接入队列摘要 |
| `sourceTaskQueue` | 补证任务队列摘要，包含 `connector-readiness`、`manual-evidence`、`public-source-review` |

## 部署入口

开发机人工触发远程部署：

```bash
cd app
npm run data:deploy:semi-monthly
```

该命令依次执行：

1. `npm run data:refresh:semi-monthly`
2. `npm run deploy:prod`
3. `npm run smoke:prod`
4. `npm run test:e2e:prod`

服务器本地触发静态刷新：

```bash
cd /opt/mkt53/automation/app
npm run data:publish:semi-monthly:local
```

该命令只写入 `MKT53_STATIC_HTML_DIR`，默认是 `/opt/mkt53/html`，不依赖 SSH key，不触碰宿主 landing、nginx 配置或其他应用目录。服务器存在 `MKT53_AMAZON_PRIVATE_DIR` 时，会继续生成 Amazon 私有输入交叉审计报告。

需要调整公开 URL 稳定性策略时，直接把参数传给刷新命令：

```bash
cd /opt/mkt53/automation/app
npm run data:publish:semi-monthly:local -- --timeout-ms 12000 --max-attempts 3 --retry-delay-ms 1000
```

## 服务器 cron

只在 mkt53 专属自动化目录安装：

```bash
cd /opt/mkt53/automation/app
bash scripts/data/install-semi-monthly-cron.sh --print
bash scripts/data/install-semi-monthly-cron.sh
```

默认计划：

```cron
0 9 1,16 * *
```

2026-06-11 线上 crontab 已确认使用该计划：

```cron
# mkt53 semi-monthly data refresh
0 9 1,16 * * cd "/opt/mkt53/automation/app" && npm run data:publish:semi-monthly:local >> "/opt/mkt53/automation/app/tmp/data-collection/semi-monthly-refresh.log" 2>&1
```

如需调整：

```bash
MKT53_SEMI_MONTHLY_CRON="30 8 1,16 * *" bash scripts/data/install-semi-monthly-cron.sh
```

安装脚本会移除旧的 mkt53 weekly cron marker 和旧的 `data:publish:weekly:local` / `data:deploy:weekly` 任务。`weekly-data` 文件路径只保留为消费者兼容层，不再保留 weekly 调度。

## 兼容边界

`public/periodic-data/*` 是新主路径。`public/weekly-data/*` 只作为兼容层保留，内容由半月刷新脚本同步写入，不再代表真实周度节奏。

`npm run data:refresh:weekly`、`npm run data:deploy:weekly` 和 `npm run data:publish:weekly:local` 暂不删除，原因是生产 e2e、历史文档和外部书签仍可能引用旧路径。后续确认没有消费者依赖后，再进入归档或删除流程。

## 验收标准

每次半月刷新完成后必须确认：

| 检查项 | 命令或证据 |
|---|---|
| 数据一致性 | `npm run data:audit` |
| 半月 manifest | `npm run data:refresh:semi-monthly -- --no-network` 或正式刷新输出 |
| 本地测试 | `npm run test` |
| 静态质量门 | `npm run lint && npm audit && npm run build` |
| 生产静态路由 | `npm run smoke:prod` |
| 生产数据页 | `npm run test:e2e:prod` |

禁止把私有 ASIN、SKU、授权记录、owner 信息或凭据写入 `app/public/`、`tmp/data-collection/`、测试夹具或 git。

## 服务器出口边界

服务器 cron 使用服务器出口网络采集公开 URL。若公开来源返回 `403`，manifest 必须保留为 `source-error`，不得为了维持指标好看改写为 `ok`。截至 2026-06-11，服务器出口已观察到以下公开来源返回 `403`：

| source id | 来源 |
|---|---|
| `ds-002` | Fortune Business Insights |
| `ds-004` | Mordor Intelligence |
| `ds-043` | Mamava / Medela 2025 State of Breastfeeding Survey |

这些来源进入人工复核或供应商权限复核，不影响半月刷新任务本身继续产出 manifest。
