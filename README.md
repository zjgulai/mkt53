---
title: mkt53 项目入口
doc_type: other
module: project
topic: readme
status: stable
created: 2026-05-31
updated: 2026-06-12
owner: self
source: human+ai
---

# mkt53 — Momcozy 市场洞察看板

Momcozy 母婴品牌全球市场分析看板，面向内部团队的数据洞察、数据来源复核和报告工作流。

| 项 | 值 |
|---|---|
| 线上地址 | `https://mkt.lute-tlz-dddd.top` |
| 宿主入口 | `https://lute-tlz-dddd.top`，服务卡片「市场洞察工作台」进入本项目 |
| 应用目录 | `app/` |
| 生产静态目录 | `/opt/mkt53/html/` |
| 宿主 landing 文件 | `/opt/ai-video/deploy/lighthouse/landing/index.html` |
| 质量门禁 | `.github/workflows/quality-gate.yml` |
| 部署脚本 | `app/scripts/deploy-static.sh` |
| 生产 smoke | `app/scripts/smoke-prod.sh` |
| 生产 E2E | `npm run test:e2e:prod` |
| 半月数据刷新 | `npm run data:refresh:semi-monthly` |
| 公开证据刷新 | `npm run data:refresh:semi-monthly:public-evidence` |
| 半月数据发布 | `npm run data:deploy:semi-monthly` |

## 当前产品形态

mkt53 已作为 `Lute Data Science Hub` 的一个正式入口上线。截至 2026-06-12，当前线上形态是：

| 入口 | 链接 | 当前状态 |
|---|---|---|
| 宿主导航页 | `https://lute-tlz-dddd.top` | 多服务卡片网格，当前包含 12 个服务入口 |
| 市场洞察入口卡片 | `https://mkt.lute-tlz-dddd.top` | subtitle `Market Insight Platform`，标题「市场洞察工作台」，CTA「打开市场看板」 |
| mkt53 看板本体 | `https://mkt.lute-tlz-dddd.top` | Vite 静态看板，首页标题为 Momcozy 市场洞察工作台 |
| 数据管理页 | `https://mkt.lute-tlz-dddd.top/#/data` | 生产使用 hash 路由；裸 `/data` 不是数据页入口 |

本项目自身仍是 Vite 静态看板，部署到 `/opt/mkt53/html/`；宿主首页卡片是共享 nginx 的 landing HTML，不由 `npm run deploy:prod` 自动更新。

生产环境当前使用 `HashRouter`。文档中的业务路径用 `/data`、`/market` 表达页面意图；浏览器可访问地址需要写成 `/#/data`、`/#/market`。

## 当前数据状态

| 项 | 当前值 |
|---|---|
| 刷新频率 | 半月一次 |
| 当前周期 | `2026-06-H1` |
| 数据窗口 | `2026-06-01` 至 `2026-06-15` |
| 生产 manifest 生成时间 | `2026-06-12T02:23:17.911Z` |
| 公开证据 manifest 生成时间 | `2026-06-12T02:23:22.683Z` |
| 下次计划刷新 | `2026-06-16T09:00:00+08:00` |
| 来源总数 | 45 |
| 可自动或本地验证 | 10 |
| 连接器待接入 | 23 |
| 人工补录或复核 | 12 |
| 公开证据样本 | 12/12 live browser captured，`businessDataWrites=0` |
| 当前审计问题数 | 0 |

服务器自动化目录 `/opt/mkt53/automation/app` 已同步当前半月机制并安装半月 cron：每月 1 日和 16 日 09:00 执行 `npm run data:publish:semi-monthly:local`，只写入 `/opt/mkt53/html/`。默认 cron 公开证据为 dry-run 规划；人工发布需要 live 公开证据时显式传入 `--public-evidence-live`。

## 最短路径

```bash
cd app
npm ci
npm run dev
```

本地开发服务默认运行在 `http://localhost:3000`。

## 质量门禁

```bash
cd app
npm run test
npm run lint
npm audit
npm run build
npm run data:audit
```

页面布局、核心路由或移动端体验发生变化时，额外执行：

```bash
cd app
npm run test:e2e
```

宿主入口或生产导航状态发生变化时，额外执行：

```bash
cd app
npm run test:e2e:prod
```

数据来源、数据管理表或页面静态数据发生变化时，额外执行：

```bash
cd app
npm run data:audit
npm run data:refresh:semi-monthly
npm run data:public-evidence:dry-run
```

## 生产部署

```bash
cd app
npm run deploy:prod
npm run smoke:prod
```

半月数据刷新需要同时发布生产 manifest 时执行：

```bash
cd app
npm run data:deploy:semi-monthly -- --public-evidence-live --timeout-ms 12000 --max-attempts 2 --public-evidence-timeout-ms 30000
```

部署依赖仓库根目录的 `ai_video.pem`。该文件已被 `.gitignore` 排除，不进入仓库。

宿主首页卡片文案或链接变更时，单独维护远端 `/opt/ai-video/deploy/lighthouse/landing/index.html`，先备份再替换；不要通过 mkt53 的 `dist/` 覆盖宿主 landing。

## 正式文档

| 文档 | 用途 |
|---|---|
| `docs/workflows/workflow-quality-gate-stable.md` | 本地与 CI 质量门禁 |
| `docs/workflows/workflow-static-deploy-stable.md` | 腾讯云轻量服务器静态部署 |
| `docs/workflows/workflow-semi-monthly-data-collection-stable.md` | 半月数据采集与刷新 |
| `docs/workflows/workflow-weekly-data-collection-stable.md` | 周度刷新兼容链路 |
| `docs/knowledge/knowledge-data-source-governance-stable.md` | 数据来源 registry 与复核规则 |
| `docs/product/product-roadmap-market-insight-stable.md` | 产品能力收敛与 90 天路线图 |
| `docs/architecture/architecture-data-and-ai-proxy-stable.md` | 数据接入与 AI 代理目标架构 |
| `AGENTS.md` | 项目协作、目录治理、技术栈和部署上下文 |

## 应用结构

```text
app/
├─ src/
│  ├─ pages/
│  ├─ components/
│  ├─ data/
│  ├─ hooks/
│  └─ routes/
├─ tests/
│  ├─ components/
│  ├─ data/
│  ├─ e2e/
│  ├─ e2e-prod/
│  ├─ pages/
│  ├─ routes/
│  ├─ scripts/
│  ├─ security/
│  └─ utils/
├─ public/
│  ├─ images/
│  ├─ periodic-data/
│  │  ├─ latest.json
│  │  ├─ connectors.json
│  │  ├─ source-tasks.json
│  │  └─ public-evidence-samples.json
│  └─ weekly-data/      # 兼容旧路径
│     ├─ latest.json
│     ├─ connectors.json
│     ├─ source-tasks.json
│     └─ public-evidence-samples.json
├─ scripts/
│  └─ data/
├─ playwright.config.ts
└─ playwright.prod.config.ts
```
