---
title: 半月数据采集刷新工作流
doc_type: workflow
module: data-collection
topic: semi-monthly-refresh
status: stable
created: 2026-06-11
updated: 2026-06-13
owner: self
source: human+ai
---

# 半月数据采集刷新工作流

## 当前结论

mkt53 数据刷新节奏从周度调整为半月一次。正式计划为每月 1 日和 16 日 09:00（`Asia/Shanghai`）执行，生成当期 `YYYY-MM-H1` 或 `YYYY-MM-H2` manifest。

该工作流仍采用“脚本采集 → 生成静态 manifest → 构建部署”的方式。受限来源保持 `connector-required` 或 `manual-required`，不使用脚本伪造真实授权采集结果。

## 最新验证状态

2026-06-12 已完成一次带浏览器辅助公开证据的半月生产发布和线上复核：

| 项 | 结果 |
|---|---|
| 生产周期 | `2026-06-H1` |
| 生产 manifest | `refreshCadence=semi-monthly`，`generatedAt=2026-06-12T02:23:17.911Z` |
| 公开证据 manifest | `mode=live-browser-capture`，`generatedAt=2026-06-12T02:23:22.683Z`，12/12 captured，`businessDataWrites=0` |
| 下次计划刷新 | `2026-06-16T09:00:00+08:00` |
| 来源状态 | total 45，ok 10，connector-required 23，manual-required 12，issueCount 0 |
| 发布命令 | `npm run data:deploy:semi-monthly -- --public-evidence-live --timeout-ms 12000 --max-attempts 2 --public-evidence-timeout-ms 30000` 已通过 |
| 生产验证 | `npm run smoke:prod` 已通过，`npm run test:e2e:prod` 14/14 通过 |
| nginx 验证 | `docker exec ai_video_nginx nginx -t` 通过，首页返回 HTTP/2 200 |
| 服务器 cron | `/opt/mkt53/automation/app` 已同步当前代码并安装半月 cron；默认公开证据为 dry-run |

## 脚本入口

```bash
cd app
npm run data:audit
npm run data:public-evidence:dry-run
npm run data:source-tasks
npm run data:refresh:semi-monthly
npm run data:refresh:semi-monthly:public-evidence
```

输出文件：

| 文件 | 用途 |
|---|---|
| `public/periodic-data/latest.json` | 前端读取的最新半月采集 manifest，包含公开证据摘要 |
| `public/periodic-data/connectors.json` | 最新授权连接器接入 backlog |
| `public/periodic-data/source-tasks.json` | 最新补证任务队列，覆盖连接器接入、人工凭证和公开来源复核 |
| `public/periodic-data/public-evidence-samples.json` | 浏览器辅助公开证据样本 manifest |
| `public/weekly-data/latest.json` | 兼容旧路径的同内容 manifest |
| `public/weekly-data/connectors.json` | 兼容旧路径的同内容 connector backlog |
| `public/weekly-data/source-tasks.json` | 兼容旧路径的同内容补证任务队列 |
| `public/weekly-data/public-evidence-samples.json` | 兼容旧路径的公开证据样本 manifest |
| `tmp/data-collection/audit-latest.json` | 本次一致性审计结果 |
| `tmp/data-collection/runs/<period>.json` | 本地半月运行留痕 |
| `tmp/data-collection/runs/<period>-connectors.json` | 本地连接器 backlog 留痕 |
| `tmp/data-collection/runs/<period>-source-tasks.json` | 本地补证任务队列留痕 |
| `tmp/data-collection/runs/<period>-public-evidence-samples.json` | 本地公开证据样本留痕 |

## 浏览器辅助公开证据

对 Amazon 公开页、品牌官网、公开新闻、法规页和展会官网，半月刷新机制会同步生成公开证据 manifest。

默认刷新只做 dry-run 规划，不启动浏览器：

```bash
cd app
npm run data:refresh:semi-monthly
```

需要同步更新当前公开证据样本时，人工触发 live 模式：

```bash
cd app
npm run data:public-evidence:dry-run
npm run data:public-evidence:live
npm run data:refresh:semi-monthly -- --public-evidence-live --public-evidence-timeout-ms 30000
npm run data:refresh:semi-monthly:public-evidence -- --public-evidence-timeout-ms 30000
```

该链路只采集公开可见页面证据，用于补强 `manual-evidence` 和 `public-source-review`，不替代授权连接器。默认半月 cron 会生成 dry-run 公开证据 manifest；如需服务器定期 live 采集，必须显式配置 `MKT53_PUBLIC_EVIDENCE_MODE=live` 并确认服务器 Playwright/Chromium 环境可用。

输出规则：

| 文件 | 用途 |
|---|---|
| `public/periodic-data/public-evidence-samples.json` | 可随前端发布的公开证据样本 manifest，只含 URL、标题、哈希、摘要、边界和本地证据路径 |
| `public/weekly-data/public-evidence-samples.json` | 兼容旧路径的同内容 manifest |
| `tmp/public-evidence/latest.json` | 本地最近一次浏览器采集完整 manifest |
| `tmp/public-evidence/screenshots/*.png` | 本地截图证据，默认不进 git、不进 public bundle |
| `tmp/public-evidence/text/*.txt` | 本地可见文本归档，默认不进 git、不进 public bundle |

硬边界：

- 不登录，不绕过验证码、反爬、付费墙或平台权限。
- 不把 Amazon 公开页样本写成 Amazon 平台级价格、评论、销量或 BSR 数据。
- 不把公开页面样本改写为 CRM、ERP、VOC、海关或访谈记录。
- `public-evidence-samples.json` 不包含完整正文和截图，只保留哈希、短摘要、匹配项和本地证据路径。
- 若页面返回 403、验证码、空白或错误，保留失败状态，不改写为 `ok`。
- `--no-network` 会强制公开证据进入 dry-run，不启动浏览器。
- `--skip-public-evidence` 可临时跳过公开证据 manifest 生成。

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
| `publicEvidence` | 浏览器辅助公开证据摘要，包含模式、状态分布、样本数、网络调用数和业务写入数 |

## 部署入口

开发机人工触发远程部署：

```bash
cd app
npm run data:deploy:semi-monthly
```

需要随生产发布同步 live 公开证据样本时，使用：

```bash
cd app
npm run data:deploy:semi-monthly -- --public-evidence-live --timeout-ms 12000 --max-attempts 2 --public-evidence-timeout-ms 30000
```

该命令依次执行：

1. `npm run data:refresh:semi-monthly`
2. `npm run deploy:prod:verified`

`deploy:prod:verified` 内部继续执行 `deploy:prod`、`smoke:prod` 和 `test:e2e:prod`，保证半月数据发布与普通静态发布共用同一条生产回归链。

服务器本地触发静态刷新：

```bash
cd /opt/mkt53/automation/app
npm run data:publish:semi-monthly:local
```

该命令只写入 `MKT53_STATIC_HTML_DIR`，默认是 `/opt/mkt53/html`，不依赖 SSH key，不触碰宿主 landing、nginx 配置或其他应用目录。服务器存在 `MKT53_AMAZON_PRIVATE_DIR` 时，会继续生成 Amazon 私有输入交叉审计报告。

## Amazon 私有输入 sidecar

Amazon 价格、评论、SKU、BSR 和 Brand Analytics 数据不能由公开证据或大模型补齐。半月刷新只允许在私有目录中维护授权前置材料和脱敏审计结果，真实采集必须等私有映射、授权记录、owner 复核和合规复核全部通过。

私有目录首次初始化：

```bash
cd app
npm run data:connector:amazon:private:bootstrap -- --target-dir configs/private

cd /opt/mkt53/automation/app
npm run data:connector:amazon:private:bootstrap -- --target-dir /opt/mkt53/private
```

该命令创建 `amazon-commerce-mapping.json`、`amazon-commerce-readiness.json`、`amazon-commerce-readiness-checklist.md` 和 `reports/`，目录权限为 `700`，文件权限为 `600`。默认不覆盖已有私有文件；服务器已有真实映射或 readiness record 时不得使用 `--force`。

生成 67 行 ASIN/SKU 私有填报草稿：

```bash
cd app
npm run data:connector:amazon:mapping:scaffold -- --target-dir configs/private

cd /opt/mkt53/automation/app
npm run data:connector:amazon:mapping:scaffold -- --target-dir /opt/mkt53/private
```

该命令只生成 `amazon-commerce-mapping-fill-draft.json` 和 `amazon-commerce-mapping-fill-draft.csv`，不覆盖最终 `amazon-commerce-mapping.json`。草稿按七个 Amazon source id 展开为 67 行空白映射，权限为 `600`，只能由业务/数据 owner 在私有目录中填写。填完后先对草稿执行 `mapping:validate` 和 `mapping:coverage`；覆盖率 ready 后，再把通过校验的草稿作为最终 `amazon-commerce-mapping.json` 输入 private audit。

私有输入交叉审计：

```bash
MKT53_AMAZON_PRIVATE_DIR=/opt/mkt53/private npm run data:connector:amazon:private:audit -- --write /opt/mkt53/private/amazon-commerce-private-input-audit.json --force
```

审计输出只允许包含缺项、计数、source id、字段名和安全边界，不得输出真实 ASIN、SKU、授权记录、owner、竞品明细或凭据值。报告状态为 `ready-for-readiness-gate` 后，才允许进入：

```bash
MKT53_AMAZON_MAPPING_PATH=/opt/mkt53/private/amazon-commerce-mapping.json MKT53_AMAZON_READINESS_PATH=/opt/mkt53/private/amazon-commerce-readiness.json npm run data:connector:amazon:readiness
```

即使 readiness gate 通过，也只表示可以开始实现授权 Amazon 连接器；不表示已经有 Amazon 业务数据快照。

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

2026-06-12 线上 crontab 已确认使用该计划：

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
| 公开证据 manifest | `npm run data:public-evidence:dry-run`；需要 live 样本时使用 `--public-evidence-live` |
| 本地测试 | `npm run test` |
| 静态质量门 | `npm run lint && npm audit && npm run build` |
| 生产静态路由 | `npm run smoke:prod` |
| 生产数据页 | `npm run test:e2e:prod` |

禁止把私有 ASIN、SKU、授权记录、owner 信息或凭据写入 `app/public/`、`tmp/data-collection/`、测试夹具或 git。

## 服务器出口边界

服务器 cron 使用服务器出口网络采集公开 URL。若公开来源返回 `403`，manifest 必须保留为 `source-error`，不得为了维持指标好看改写为 `ok`。2026-06-12 生产发布中，浏览器辅助公开证据样本 live 采集 12/12 captured；下列公开 URL 仍需在常规 public-url-check 与人工复核链路中保留边界：

| source id | 来源 |
|---|---|
| `ds-002` | Fortune Business Insights |
| `ds-004` | Mordor Intelligence |
| `ds-043` | Mamava / Medela 2025 State of Breastfeeding Survey |

这些来源进入人工复核或供应商权限复核，不影响半月刷新任务本身继续产出 manifest。
