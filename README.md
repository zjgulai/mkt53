---
title: mkt53 项目入口
doc_type: other
module: project
topic: readme
status: stable
created: 2026-05-31
updated: 2026-05-31
owner: self
source: human+ai
---

# mkt53 — Momcozy 市场洞察看板

Momcozy 母婴品牌全球市场分析看板，面向内部团队的数据洞察、数据来源复核和报告工作流。

| 项 | 值 |
|---|---|
| 线上地址 | `https://mkt.lute-tlz-dddd.top` |
| 应用目录 | `app/` |
| 生产静态目录 | `/opt/mkt53/html/` |
| 质量门禁 | `.github/workflows/quality-gate.yml` |
| 部署脚本 | `app/scripts/deploy-static.sh` |
| 生产 smoke | `app/scripts/smoke-prod.sh` |

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

## 生产部署

```bash
cd app
npm run deploy:prod
npm run smoke:prod
```

部署依赖仓库根目录的 `ai_video.pem`。该文件已被 `.gitignore` 排除，不进入仓库。

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
│  ├─ routes/
│  ├─ scripts/
│  └─ security/
├─ public/images/
├─ scripts/
└─ playwright.config.ts
```
