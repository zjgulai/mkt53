---
title: mkt53 项目入口
doc_type: other
module: project
topic: readme
status: stable
created: 2026-05-31
updated: 2026-06-02
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

## 当前产品形态

mkt53 已作为 `Lute Data Science Hub` 的一个正式入口上线。截至 2026-06-02，当前线上形态是：

| 入口 | 链接 | 当前状态 |
|---|---|---|
| 宿主导航页 | `https://lute-tlz-dddd.top` | 多服务卡片网格，当前包含 12 个服务入口 |
| 市场洞察入口卡片 | `https://mkt.lute-tlz-dddd.top` | subtitle `Market Insight Platform`，标题「市场洞察工作台」，CTA「打开市场看板」 |
| mkt53 看板本体 | `https://mkt.lute-tlz-dddd.top` | Vite 静态看板，首页标题为 Momcozy 市场洞察工作台 |

本项目自身仍是 Vite 静态看板，部署到 `/opt/mkt53/html/`；宿主首页卡片是共享 nginx 的 landing HTML，不由 `npm run deploy:prod` 自动更新。

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

## 生产部署

```bash
cd app
npm run deploy:prod
npm run smoke:prod
```

部署依赖仓库根目录的 `ai_video.pem`。该文件已被 `.gitignore` 排除，不进入仓库。

宿主首页卡片文案或链接变更时，单独维护远端 `/opt/ai-video/deploy/lighthouse/landing/index.html`，先备份再替换；不要通过 mkt53 的 `dist/` 覆盖宿主 landing。

## 正式文档

| 文档 | 用途 |
|---|---|
| `docs/workflows/workflow-quality-gate-stable.md` | 本地与 CI 质量门禁 |
| `docs/workflows/workflow-static-deploy-stable.md` | 腾讯云轻量服务器静态部署 |
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
├─ public/images/
├─ scripts/
├─ playwright.config.ts
└─ playwright.prod.config.ts
```
