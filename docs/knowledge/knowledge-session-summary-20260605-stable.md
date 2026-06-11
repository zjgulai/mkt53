---
title: mkt53 Codex Session 接手摘要
doc_type: knowledge
module: mkt53
topic: session-summary-20260605
status: stable
created: 2026-06-05
updated: 2026-06-11
owner: self
source: human+ai
---

# mkt53 Codex Session 接手摘要

## 1. 当前主线

本轮 session 已从 2026-06-04 的周度数据采集状态，推进到 2026-06-11 的半月数据刷新、页面证据口径治理、生产部署、系统图谱转正和未跟踪资产治理状态。

当前项目定位：Momcozy 母婴品牌全球市场洞察工作台，线上地址为 `https://mkt.lute-tlz-dddd.top`，宿主入口为 `https://lute-tlz-dddd.top` 首页卡片「市场洞察工作台」。

## 2. 当前代码与部署状态

已完成并验证：

- `main` 已同步到 `origin/main` 的 merge commit `c3864c0`。
- 生产站点已部署到腾讯云轻量服务器 `101.34.52.232`。
- 远端静态目录：`/opt/mkt53/html/`。
- nginx 容器：`ai_video_nginx`，生产检查 `nginx -t` 通过。
- 线上入口：`https://mkt.lute-tlz-dddd.top`。
- 宿主入口：`https://lute-tlz-dddd.top`，首页卡片链接到 mkt53。
- 当前生产数据刷新频率：半月一次，每月 1 日和 16 日 09:00 执行。

最近一次生产验收结果：

- `npm run smoke:prod` 通过。
- `npm run test:e2e:prod` 通过，桌面/移动共 14 个用例 passed。
- 线上 `periodic-data/latest.json` 返回 200。
- 线上兼容路径 `weekly-data/latest.json` 返回 200，但只作为兼容入口，不再作为主数据路径。
- 线上 manifest：`period=2026-06-H1`，`refreshCadence=semi-monthly`，`generatedAt=2026-06-11T07:30:40.503Z`，`nextScheduledAt=2026-06-16T09:00:00+08:00`，`issueCount=0`。

注意：上述线上状态来自 2026-06-11 本轮发布与验收记录。后续接手如需声明“当前最新线上状态”，必须重新 curl/ssh 验证。

## 3. 关键 PR 与提交

已合并到 `main` 的关键 PR：

| PR | 合并提交 | 说明 |
|---|---|
| `#1` | `c0f5545` | 切换半月数据刷新并统一页面证据口径 |
| `#2` | `670ff26` | 忽略本地工具缓存与同步临时文件 |
| `#3` | `c3864c0` | 刷新系统图谱为半月数据状态 |

重要历史提交：

| 提交 | 说明 |
|---|---|
| `997295f` | 刷新 20260604 周度数据状态 |
| `4e3e438` | 修复路由依赖审计阻塞 |

`4e3e438` 的直接原因：`npm audit` 曾发现 `react-router/react-router-dom <= 7.14.2` 高危 DoS 公告，部署脚本会因此失败。通过 `npm audit fix` 将 lockfile 中 `react-router` 和 `react-router-dom` 升到 `7.16.0`，`npm audit` 后为 0 vulnerabilities。

## 4. 当前数据状态

`app/public/periodic-data/latest.json` 最新本地/线上部署版本：

```json
{
  "period": "2026-06-H1",
  "refreshCadence": "semi-monthly",
  "window": {
    "start": "2026-06-01",
    "end": "2026-06-15"
  },
  "generatedAt": "2026-06-11T07:30:40.503Z",
  "nextScheduledAt": "2026-06-16T09:00:00+08:00",
  "totals": {
    "total": 45,
    "ok": 10,
    "manual-required": 12,
    "connector-required": 23
  },
  "auditSummary": {
    "pageCount": 43,
    "tableCount": 27,
    "dataModuleCount": 6,
    "sourceRegistryCount": 45,
    "tableGovernanceCount": 27,
    "pagesWithStaticDataWithoutRegistry": 0,
    "issueCount": 0,
    "criticalIssueCount": 0
  }
}
```

必须保持的数据边界：

- `connector-required` 不得伪造成真实已采集数据。
- `manual-required` 需要人工上传、采购报告、访谈记录或条目级复核。
- `example` 不等于真实业务证据。
- `ok` 只表示公开 URL 或本地代码资产在本次任务中可达/可校验。

当前 23 个 `connector-required` 来源分为 10 组，重点包括 Amazon、Review/VOC NLP、CRM、社媒监听、ERP、Import Genius、YouTube、内部知识/报告、AI 生成日志、合规网页评论爬虫。

## 5. 当前项目结构理解

核心前端：

- `app/src/App.tsx`：46 条路由定义。
- `app/src/routes/lazy-pages.tsx`：页面懒加载入口。
- `app/src/pages/DataManage.tsx`：数据管理页，包含 6 大数据模块、27 张表、字段字典、治理、血缘和半月 manifest 展示。
- `app/src/pages/DataSourcePage.tsx`：数据来源管理页。
- `app/src/data/source-registry.ts`：45 个来源条目。

核心脚本：

- `app/scripts/data/audit-consistency.mjs`：页面、数据表、source registry 一致性审计。
- `app/scripts/data/collect-weekly-sources.mjs`：周度来源检查。
- `app/scripts/data/refresh-semi-monthly-data.mjs`：生成 `public/periodic-data/latest.json` 与兼容路径 `public/weekly-data/latest.json`。
- `app/scripts/data/refresh-weekly-data.mjs`：周度兼容脚本，保留用于历史回滚，不再是主路径。
- `app/scripts/data/lib/project-analysis.mjs`：提取 source registry、data modules、table governance、页面组件和采集方法分类。
- `app/scripts/data/lib/connector-backlog.mjs`：生成授权连接器 backlog。
- `app/scripts/data/connectors/*amazon*`：Amazon dry-run、private audit、readiness checklist、bootstrap 模板。
- `app/scripts/data/install-semi-monthly-cron.sh`：安装服务器半月刷新 cron。

部署与验收：

- `app/scripts/deploy-static.sh`：`test -> lint -> npm audit -> build -> rsync dist/`。
- `app/scripts/smoke-prod.sh`：生产 smoke。
- `app/playwright.prod.config.ts` 与 `app/tests/e2e-prod/`：生产 E2E，覆盖宿主卡片、mkt 目标页、首页半月周期、数据页 manifest、connector backlog、AI/图库/报告页证据边界、桌面/移动端溢出。

## 6. 已沉淀的长期文档

已有重要文档：

- `AGENTS.md`：项目主说明、部署、路由、设计规范、数据刷新说明。
- `docs/workflows/workflow-static-deploy-stable.md`。
- `docs/workflows/workflow-semi-monthly-data-collection-stable.md`。
- `docs/workflows/workflow-weekly-data-collection-stable.md`。
- `docs/workflows/workflow-quality-gate-stable.md`。
- `docs/architecture/architecture-data-and-ai-proxy-stable.md`。
- `docs/architecture/mkt53-system-map-20260604/`。
- `docs/product/product-roadmap-market-insight-stable.md`。
- `docs/knowledge/knowledge-data-source-governance-stable.md`。

其中 `docs/architecture/mkt53-system-map-20260604/` 已转为正式架构资产：

- `project-understanding-and-workflows-stable.md`：深度项目理解、问题地图、横向/纵向问题拆解、工作流。
- 5 张 `.excalidraw` 图：业务架构、业务流程、数据流转、指标体系、数据血缘。
- 5 张 SVG 渲染图。
- PNG 渲染图通过 `.gitignore` 保留为本地生成物，不进入版本库。
- `generate-excalidraw-diagrams.mjs`：图谱生成器。
- `render-excalidraw-fallback.mjs`：离线渲染器。

## 7. 图谱与 skill 状态

用户要求使用 `fireworks-tech-graph skill`、`Architecture Diagram Skill`、`Excalidraw skill`。

实际检查结果：

- 已安装并使用：`excalidraw-diagram-generator`。
- 已参考：Figma 插件中的 `figma-generate-diagram/references/architecture.md` 架构图规范。
- 未发现：`fireworks-tech-graph`。
- 未发现同名单独 skill：`Architecture Diagram Skill`。
- 查询 OpenAI curated skills 未发现同名候选，因此没有伪造安装。

渲染说明：

- 标准 Excalidraw skill 自带渲染器依赖的 Chromium 下载在当前环境中卡住。
- `render_template.html` 依赖 `esm.sh` 模块，浏览器加载超时。
- 已改用 `render-excalidraw-fallback.mjs` 离线渲染，使用项目已验证可用的 Playwright Chromium。
- `.excalidraw` 源文件仍可导入 Excalidraw 编辑。

## 8. CodeGraph 状态

本轮多次临时初始化 CodeGraph，`.codegraph/` 已通过 `.gitignore` 归为本地工具缓存：

- 解析规模：163 文件、1,578 节点、2,633 边。
- 用途：抽取路由、页面、数据治理、source registry、采集脚本、部署链路。
- 临时 `.codegraph/` 索引不作为项目资产提交。

如后续需要继续 CodeGraph 分析，需要重新执行：

```bash
codegraph init .
```

完成后建议清理：

```bash
codegraph uninit --force .
```

## 9. 常用命令

本地数据与质量门：

```bash
cd app
npm run data:audit
npm run data:refresh:semi-monthly
npm audit
npm run test
npm run lint
npm run build
```

生产部署：

```bash
cd app
npm run deploy:prod
npm run smoke:prod
npm run test:e2e:prod
```

远端只读核验：

```bash
ssh -i ai_video.pem ubuntu@101.34.52.232 \
  'docker ps --format "{{.Names}}\t{{.Status}}" | grep ai_video_nginx'

curl -fsS https://mkt.lute-tlz-dddd.top/weekly-data/latest.json
curl -fsS https://mkt.lute-tlz-dddd.top/periodic-data/latest.json
```

## 10. 重要注意事项

1. 不要污染根目录。新增长期文档优先放 `docs/`，临时产物放 `tmp/`。
2. `ai_video.pem` 在本地根目录，但已 gitignore，不得提交。
3. `app/dist/`、`app/node_modules/` 不提交。
4. 真实 Amazon/CRM/ERP/AI/社媒/YouTube/Import Genius 输入不得进入 public 静态包。
5. `/opt/mkt53/private` 和 `/opt/mkt53/html` 必须严格分层。
6. 通过技术测试不等于业务证据已完全放行。
7. 更新“当前/最新”状态前必须重新验证线上，不要只依赖旧文档或 session 记忆。
8. 生产路由使用 HashRouter，真实数据页入口是 `https://mkt.lute-tlz-dddd.top/#/data`。
9. 宿主 landing 卡片不在 mkt53 Vite 构建产物中，变更需维护远端 `/opt/ai-video/deploy/lighthouse/landing/index.html`。

## 11. 下次建议接手顺序

如果继续本项目，建议顺序：

1. 先跑 `git status --short --branch`，确认是否有未归类草稿或临时产物。
2. 如需继续数据更新，先跑 `npm run data:audit` 和 `npm run data:refresh:semi-monthly`。
3. 如需部署，必须先跑 `npm audit`，避免依赖漏洞阻塞 `deploy:prod`。
4. 如需声称线上最新状态，重新跑 smoke、E2E、curl manifest 和 ssh nginx health。
5. 下一阶段重点是连接器真实接入、人工补录机制和页面数据结构化，不再是刷新频率切换。
