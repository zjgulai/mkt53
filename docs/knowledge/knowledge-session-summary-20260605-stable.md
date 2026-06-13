---
title: mkt53 Codex Session 接手摘要
doc_type: knowledge
module: mkt53
topic: session-summary-20260605
status: stable
created: 2026-06-05
updated: 2026-06-13
owner: self
source: human+ai
---

# mkt53 Codex Session 接手摘要

## 1. 当前结论

mkt53 是 Momcozy 母婴品牌市场洞察工作台，线上地址为 `https://mkt.lute-tlz-dddd.top`，宿主入口为 `https://lute-tlz-dddd.top` 首页卡片「市场洞察工作台」。

当前已经完成：

- 全站从周度刷新切到半月刷新。
- 页面结论、提示信息、更新时间和证据状态已统一到半月 manifest。
- 数据来源页已展示补证队列和浏览器辅助公开证据状态。
- 腾讯云生产环境已部署当前 2026-06-12 半月数据。
- 远端自动化副本 `/opt/mkt53/automation/app` 已同步当前代码。

当前不要误读：

- 公开证据样本不是平台级完整数据。
- 连接器待接入和人工凭证待补不等于业务数据已采集。
- Amazon、社媒、CRM、ERP、Import Genius、VOC/NLP、访谈记录仍需授权连接器或人工凭证。

## 2. 生产状态

已验证的生产事实：

| 项 | 当前值 |
|---|---|
| 线上地址 | `https://mkt.lute-tlz-dddd.top` |
| 生产静态目录 | `/opt/mkt53/html/` |
| 自动化目录 | `/opt/mkt53/automation/app` |
| nginx 容器 | `ai_video_nginx` |
| 当前周期 | `2026-06-H1` |
| 数据窗口 | `2026-06-01..2026-06-15` |
| 生产 manifest | `https://mkt.lute-tlz-dddd.top/periodic-data/latest.json` |
| 生产 manifest 生成时间 | `2026-06-12T02:23:17.911Z` |
| 公开证据 manifest | `https://mkt.lute-tlz-dddd.top/periodic-data/public-evidence-samples.json` |
| 公开证据生成时间 | `2026-06-12T02:23:22.683Z` |
| 下次计划刷新 | `2026-06-16T09:00:00+08:00` |
| 来源总数 | 45 |
| 可公开或本地验证 | 10 |
| 连接器待接入 | 23 |
| 人工补录/复核 | 12 |
| 公开证据样本 | 12/12 captured，`networkCalls=12`，`businessDataWrites=0` |
| 审计问题数 | 0 |

生产验证结果：

- `npm run smoke:prod` 通过。
- `npm run test:e2e:prod` 14/14 通过。
- 生产 `/data-source` 桌面和移动端显示公开证据状态，未发现横向溢出或运行时错误。
- `weekly-data/*` 兼容路径仍返回 200，但只作为旧消费者兼容层，不代表周度调度。

服务器 cron：

```cron
0 9 1,16 * * cd "/opt/mkt53/automation/app" && npm run data:publish:semi-monthly:local >> "/opt/mkt53/automation/app/tmp/data-collection/semi-monthly-refresh.log" 2>&1
```

2026-06-12 远端自动化副本同步前已备份：

```text
/opt/mkt53/backups/automation-app-20260612102246/app-code.tgz
```

## 3. 本地状态

当前本地仓库路径：

```text
/Users/pray/project/mkt53
```

当前本地状态要点：

- 本地分支仍是 `main...origin/main`。
- 当前工作区有未提交改动，包含公开证据采集脚本、半月刷新集成、页面状态展示、生产 manifest、文档同步和草稿审计文档。
- `app/tmp/public-evidence/`、`tmp/screenshots/`、`app/dist/`、`node_modules/` 等是本地产物或 ignored 产物，不应提交。
- `ai_video.pem` 位于仓库根目录但已 gitignore，不得提交。

本轮新增或关键更新文件：

- `app/scripts/data/collect-public-evidence.mjs`
- `app/scripts/data/public-evidence-seeds.json`
- `app/scripts/data/refresh-semi-monthly-data.mjs`
- `app/public/periodic-data/latest.json`
- `app/public/periodic-data/public-evidence-samples.json`
- `app/public/weekly-data/latest.json`
- `app/public/weekly-data/public-evidence-samples.json`
- `app/src/pages/DataSourcePage.tsx`
- `app/src/hooks/usePeriodicManifest.ts`
- `app/src/pages/industry/Exhibition.tsx`
- `app/src/pages/industry/IndustryNews.tsx`
- `docs/workflows/workflow-semi-monthly-data-collection-stable.md`
- `drafts/analysis/data-recency-web-collection-audit-draft-20260611.md`

## 4. 当前能力边界

已具备：

- 半月数据 manifest：`periodic-data/latest.json`。
- 旧路径兼容：`weekly-data/latest.json`、`weekly-data/connectors.json`、`weekly-data/source-tasks.json`。
- 补证任务队列：`source-tasks.json`，总数 42。
- 浏览器辅助公开证据：12 个公开样本 live 采集，public bundle 不含正文和截图。
- 数据来源页可视化展示：来源总数、连接器待接入、人工补录、公开复核、公开证据样本数。
- 生产部署链路：`data:deploy:semi-monthly`、`smoke:prod`、`test:e2e:prod`。

仍未具备：

- Amazon 价格、评论、SKU、BSR 的真实授权采集。
- 社媒声量 API 真实采集。
- CRM/RFM 脱敏快照。
- ERP/库存/供应链成本快照。
- Import Genius 或海关数据快照。
- VOC/NLP 授权评论样本、模型评估和人工一致率记录。
- 访谈记录样本与人工凭证归档。

## 5. 关键命令

本地质量门：

```bash
cd app
npm run data:audit
npm run data:public-evidence:dry-run
npm run test
npm run lint
npm audit
npm run build
```

半月数据刷新：

```bash
cd app
npm run data:refresh:semi-monthly
npm run data:refresh:semi-monthly:public-evidence -- --public-evidence-timeout-ms 30000
```

生产发布：

```bash
cd app
npm run data:deploy:semi-monthly -- --public-evidence-live --timeout-ms 12000 --max-attempts 2 --public-evidence-timeout-ms 30000
```

生产核验：

```bash
cd app
npm run smoke:prod
npm run test:e2e:prod
curl -fsS https://mkt.lute-tlz-dddd.top/periodic-data/latest.json
curl -fsS https://mkt.lute-tlz-dddd.top/periodic-data/public-evidence-samples.json
```

远端自动化核验：

```bash
ssh -i ai_video.pem ubuntu@101.34.52.232 \
  'crontab -l | grep data:publish:semi-monthly:local'

ssh -i ai_video.pem ubuntu@101.34.52.232 \
  'cd /opt/mkt53/automation/app && node scripts/data/collect-public-evidence.mjs --json --dry-run'
```

## 6. 下次接手顺序

1. 先读 `.kiro/plan/task_plan.md` 和 `.kiro/plan/progress.md`，恢复当前执行上下文。
2. 跑 `git status --short --branch`，确认本轮未提交改动范围。
3. 如需提交，先执行 `git diff --check`、`cd app && npm run data:audit && npm run test && npm run lint && npm audit && npm run build`。
4. 如需声明线上状态，重新 curl 生产 manifest 和公开证据 manifest，不依赖本文旧时间。
5. 提交时建议拆分为：公开证据采集链路、页面与行业公开补证、生产 manifest、文档同步。
6. 合并前不要把 `tmp/public-evidence/` 正文、截图、私有输入、`ai_video.pem` 或任何授权数据提交。

## 7. 下一步开发动作

优先级按当前产品风险排序：

1. 补 Amazon 私有 ASIN/SKU 映射与授权记录，通过私有输入交叉审计和 readiness gate 后再实现真实连接器。
2. 补 VOC NLP 私有 readiness record 与样本 manifest，明确样本窗口、模型版本、人工标注样本和一致率。
3. 补 CRM 私有 readiness record 与脱敏 snapshot manifest，形成真实 RFM 快照前不要升级页面结论。
4. 补 ERP 私有 readiness record 与脱敏 snapshot manifest，供应链页面继续保持示例/待接入边界。
5. 处理非阻塞运维债务：Browserslist `caniuse-lite` 过期提示、Recharts 2.x 不活跃提示。

执行原则：后续迭代优先选择能提升自动化、模块化和数仓管理专业化的动作。自动化指刷新、采集、审计、发布和回归可重复执行；模块化指每个数据域都有独立契约和停止条件；数仓管理专业化指真实数据必须具备快照、字段口径、来源、窗口、脱敏和复核记录。凡是不能增强这三点的展示型扩展，默认降级排期。

## 8. 持续约束

- 新增正式 Markdown 必须有 frontmatter。
- 新增草稿进入 `drafts/`，临时证据进入 `tmp/`，不要污染根目录。
- `connector-required` 和 `manual-required` 不得被页面文案包装成已采集。
- `public-evidence-samples.json` 只作为公开证据索引，不作为业务数据库。
- 生产路由使用 HashRouter，真实页面地址形如 `https://mkt.lute-tlz-dddd.top/#/data-source`。
- 宿主 landing 不在 mkt53 Vite 构建产物中；变更宿主卡片必须单独备份远端 `landing/index.html`。
