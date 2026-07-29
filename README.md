---
title: mkt53 项目入口
doc_type: other
module: project
topic: readme
status: stable
created: 2026-05-31
updated: 2026-07-27
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
| 本地后端 | `backend/`（BE-07 L2，完整治理链与隔离恢复本地验证，未部署生产） |
| 前端运行栈 | React 19 + Vite 8 + Recharts 3.8.1 |
| 生产静态目录 | `/opt/mkt53/html/` |
| 宿主 landing 文件 | `/opt/ai-video/deploy/lighthouse/landing/index.html` |
| 质量门禁 | `.github/workflows/quality-gate.yml` |
| 部署脚本 | `app/scripts/deploy-static.sh` |
| 完整生产发布 | `npm run deploy:prod:verified` |
| 生产 smoke | `app/scripts/smoke-prod.sh` |
| 生产 E2E | `npm run test:e2e:prod` |
| 半月数据刷新 | `npm run data:refresh:semi-monthly` |
| 半月恢复候选（无网络、无生产写入） | `npm run data:recovery:semi-monthly:candidate` |
| 公开证据刷新 | `npm run data:refresh:semi-monthly:public-evidence` |
| 半月数据发布 | `npm run data:deploy:semi-monthly` |

## 当前产品形态

mkt53 已作为 `Lute Data Science Hub` 的一个正式入口上线。入口结构如下；门禁状态以 2026-07-24 的独立授权验收为准：

| 入口 | 链接 | 当前状态 |
|---|---|---|
| 宿主导航页 | `https://lute-tlz-dddd.top` | 多服务卡片网格，当前包含 12 个服务入口；2026-06-13 apex DNS 已恢复并通过完整生产 E2E |
| 市场洞察入口卡片 | `https://mkt.lute-tlz-dddd.top` | subtitle `Market Insight Platform`，标题「市场洞察工作台」，CTA「打开市场看板」 |
| mkt53 看板本体 | `https://mkt.lute-tlz-dddd.top` | Vite 静态看板，首页标题为 Momcozy 市场洞察工作台 |
| 数据管理页 | `https://mkt.lute-tlz-dddd.top/#/data` | 生产使用 hash 路由；裸 `/data` 不是数据页入口 |

本项目自身仍是 Vite 静态看板，部署到 `/opt/mkt53/html/`；宿主首页卡片是共享 nginx 的 landing HTML，不由 `npm run deploy:prod` 自动更新。

2026-07-24 经独立 nginx 写入授权和真实授权会话验收，P0-05 已完成生产激活。完整旧配置以 root-only 备份保留，完整候选 `nginx -t` 通过后仅替换 mkt server block，并只 reload nginx、未重启或重建容器。未授权 root、deep path 与 manifest 均 302 到 apex login 且返回 `private, no-store`；真实会话可访问首页和 `/#/data`，`npm run test:e2e:prod` 为 8/8，`npm run smoke:prod` 通过 auth-gated 静态核对。机器证据见 `docs/reviews/mkt53-project-review-20260722/evidence/p0-05-production-activation-20260724.json`。

生产环境当前使用 `HashRouter`。文档中的业务路径用 `/data`、`/market` 表达页面意图；浏览器可访问地址需要写成 `/#/data`、`/#/market`。

## 当前数据状态

以下为 2026-07-23 经授权发布并完成 HTTPS 哈希核对的生产快照。仓库内 canonical `app/public/periodic-data/*` 仍是历史本地快照，不能代替这里的生产证据；机器可读执行记录见 `docs/reviews/mkt53-project-review-20260722/evidence/p0-04-production-recovery-20260723.json`。

| 项 | 当前值 |
|---|---|
| 刷新频率 | 半月一次 |
| 当前周期 | `2026-07-H2` |
| 数据窗口 | `2026-07-16` 至 `2026-07-31` |
| 生产 manifest 生成时间 | `2026-07-23T07:03:59.663Z` |
| 公开证据 manifest 生成时间 | `2026-07-23T07:03:59.663Z` |
| manifest 记录的下次计划刷新 | `2026-08-01T09:00:00+08:00`（首次 cron 运行观察待该时间窗完成） |
| 来源总数 | 53 |
| 可自动或本地验证 | 16 |
| 连接器待接入 | 28 |
| 人工补录或复核 | 9 |
| 公开证据样本 | 39/39 dry-run planned，`networkCalls=0`，`businessDataWrites=0` |
| 当前审计问题数 | 0 |

半月自动化的目标合同是：服务器 `/opt/mkt53/automation/app` 每月 1 日和 16 日 09:00 执行 `npm run data:publish:semi-monthly:local`，只写入 `/opt/mkt53/html/`。2026-07-23 的授权恢复已同步 automation、发布 H2 并安装唯一 cron；cron service active/enabled，首次计划运行是 2026-08-01 09:00。当前只有安装与 staging run-report 证据，尚无首次定时触发日志。默认 cron 公开证据为 dry-run 规划；人工发布需要 live 公开证据时显式传入 `--public-evidence-live`。

## 最短路径

```bash
cd app
npm ci
npm run dev
```

本地开发服务默认运行在 `http://localhost:3000`。

BE-07 本地后端可独立验证，不会修改生产：

```bash
cd backend
uv sync --frozen
./scripts/quality-be07.sh
```

该目录包含 FastAPI、portal identity/RBAC fixture、版本化 Source Registry、不可变 Snapshot Metadata、可复算 metadata hash、Review 状态机、追加式 review log、PostgreSQL/Alembic、零宿主端口 Compose 合同和隔离 backup/restore 演练。生产静态前端仍是 canonical，53 条 registry 尚未 seed，也没有导入真实业务快照；本地 approve/reject 和恢复只验证 fixture 治理链，不代表业务审批或生产恢复。完整边界见 `docs/architecture/be-07-audit-recovery-drill-20260724.md`。

## 质量门禁

```bash
cd app
npm run test
npm run lint
npm audit
npm run build
npm run data:audit
npm run test:e2e
```

CI 使用独立 `app` 与 `backend` job：前端安装 Chromium 后运行聚合 release evidence，后端固定 Python/uv、执行 frozen sync 和完整 `quality-be07.sh`，并保留隔离恢复报告。页面布局、核心路由或移动端体验发生变化时，本地也执行：

```bash
cd app
npm run test:e2e
```

后端变更在本地执行：

```bash
cd backend
uv sync --frozen
./scripts/quality-be07.sh
```

该后端门禁只使用本地 fixture 与隔离 Docker，不代表生产后端、数据库或恢复能力已激活。

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
npm run deploy:prod:verified
```

`deploy:prod:verified` 会先调用 `deploy:prod` 完成 `test`、`lint`、`npm audit`、`build` 和 `/opt/mkt53/html/` 静态同步，再执行 `smoke:prod` 和 `test:e2e:prod`。`deploy:prod` 保留为底层静态同步入口；单独使用后必须补跑生产 smoke 和生产 E2E。

半月数据刷新需要同时发布生产 manifest 时执行：

```bash
cd app
npm run data:deploy:semi-monthly -- --public-evidence-live --timeout-ms 12000 --max-attempts 2 --public-evidence-timeout-ms 30000
```

生产恢复授权前，可先生成隔离的 L2 dry-run 候选：

```bash
cd app
npm run data:recovery:semi-monthly:candidate
```

候选只写入 `tmp/data-collection/recovery-candidates/<period>/`，不会覆盖 `public/periodic-data/*`、`public/weekly-data/*`，不会联网、安装 cron、部署或写生产。`recovery-preflight.json` 会记录周期、6 项检查、文件 SHA-256 和 `blocked-auth` 发布结论。

部署和需要 SSH 的生产 smoke 默认读取仓库根目录的 `DDDD.pem`，也可通过 `MKT53_SSH_KEY_PATH=/absolute/path/to/key.pem` 显式覆盖；旧 `KEY_PATH` 仅保留兼容。私钥必须保持本地只读权限并已由 `*.pem` 规则排除，不进入仓库。

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
| `docs/reviews/mkt53-project-review-20260722/index.html` | 2026-07-22 全项目复盘、设计逻辑、使用手册与逐模块迭代方案 |
| `graphify-out/graph.html` | Graphify 本地代码知识图谱（AST，零模型调用） |
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
