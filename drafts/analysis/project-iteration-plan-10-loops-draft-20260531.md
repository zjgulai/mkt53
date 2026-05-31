---
title: mkt53 下一阶段 10 个迭代闭环规划
doc_type: analysis
module: project
topic: iteration-plan-10-loops
status: draft
created: 2026-05-31
updated: 2026-05-31
owner: self
source: human+ai
---

# mkt53 下一阶段 10 个迭代闭环规划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已完成安全修复、历史清理、依赖审计清零的基础上，把项目推进到可持续维护、可信数据、可验证发布的状态。

**Architecture:** 后续迭代按“质量底座 -> 数据可信度 -> 性能体验 -> 发布治理 -> 产品能力”推进。每个 loop 必须有测试或命令验证，不允许只改 UI 文案后直接部署。

**Tech Stack:** React 19, TypeScript strict, Vite 7, Vitest, Testing Library, ESLint, Tailwind CSS, Recharts, nginx static deploy.

---

## 当前基线

- 当前分支：`codex/mkt53-risk-remediation`
- 远端主分支：`origin/main`
- 已通过：`npm run test`、`npm run lint`、`npm run build`、`npm audit`
- 已部署：`https://mkt.lute-tlz-dddd.top`
- 已处理：前端密钥移除、git 历史重写、依赖漏洞清零、基础测试、首轮拆包、CPSC 高风险错误文案降级

---

## Loop 1: 建立 CI 质量门禁

**目标:** 让每次 push/PR 自动跑测试、lint、build、audit 和 secret guard。

**Files:**
- Create: `.github/workflows/quality-gate.yml`
- Modify: `app/package.json`
- Test: GitHub Actions workflow syntax + local command全量验证

- [x] 新建 GitHub Actions workflow：

```yaml
name: quality-gate

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  app:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: app
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: app/package-lock.json
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm audit
      - run: npm run build
```

- [x] 本地验证：

```bash
cd /Users/pray/project/mkt53/app
npm ci
npm run test
npm run lint
npm audit
npm run build
```

- [x] 验收标准：所有命令 exit 0；CI 文件不包含 secret；workflow 不依赖本地 `ai_video.pem`。

- [x] 提交：

```bash
git add .github/workflows/quality-gate.yml app/package.json app/package-lock.json
git commit -m "增加自动化质量门禁"
```

---

## Loop 2: 扩展回归测试覆盖核心交互

**目标:** 保护首页导航、搜索面板、AI 设计助手演示模式、地图点击等核心用户流。

**Files:**
- Create: `app/tests/components/SearchPanel.test.tsx`
- Create: `app/tests/pages/DesignAssistant.test.tsx`
- Modify: `app/tests/setup.ts`

- [x] 为 `SearchPanel` 写测试：打开后可搜索、点击结果调用导航、关闭后清空 query。
- [x] 为 `DesignAssistant` 写测试：点击生成不发起真实网络请求，只展示本地 demo 图。
- [x] 为 `WorldMap` 增补测试：active marker 有可见 label，点击非 active marker 回调正确 id。

**Required commands:**

```bash
cd /Users/pray/project/mkt53/app
npm run test
npm run lint
npm run build
```

**验收标准:**
- 测试数不少于 8 个。
- 禁止 mock 成“永远通过”；至少断言 DOM、回调和无网络请求。

---

## Loop 3: 数据可信度注册表

**目标:** 把分散在页面里的数据来源、可信度、待复核状态集中成可检索 registry，避免每页各写一套事实。

**执行状态:** 已完成。`app/src/data/source-registry.ts` 已成为数据来源 registry，`DataSourcePage`、`HomePage` 和法规模块已接入条目级复核状态。

**Files:**
- Create: `app/src/data/source-registry.ts`
- Create: `app/tests/data/source-registry.test.ts`
- Modify: `app/src/pages/DataSourcePage.tsx`
- Modify: `app/src/pages/HomePage.tsx`

**Registry type:**

```ts
export type SourceReliability = 'A' | 'B' | 'C' | 'D';
export type VerificationStatus = 'verified' | 'needs-review' | 'example';

export interface SourceRegistryItem {
  id: string;
  module: string;
  metric: string;
  sourceName: string;
  sourceUrl?: string;
  reliability: SourceReliability;
  verificationStatus: VerificationStatus;
  lastVerified: string;
  note: string;
}
```

**验收标准:**
- 所有 `needs-review` 项在 UI 上不可显示为“已验证原文”。
- CPSC/eFiling 相关项目必须是 `needs-review`，直到法务给出官方结论。
- `npm run test && npm run lint && npm run build` 通过。

---

## Loop 4: 法规数据二次审计

**目标:** 清理法规模块中仍可能混用“事实、推断、示例”的内容。

**执行状态:** 已完成。CPSC/eFiling、EU MDR 等高风险法规已降级为 `needs-review`；强判断关键词扫描在 `src/pages` 和 `src/components` 已无命中。

**Files:**
- Modify: `app/src/pages/IndustryPage.tsx`
- Modify: `app/src/pages/industry/RegulationDetail.tsx`
- Modify: `app/src/pages/industry/PolicyInsight.tsx`
- Modify: `app/src/components/OperationsManual.tsx`
- Test: `app/tests/security/clientBundleGuard.test.ts`

**执行清单:**
- [x] 搜索 `已验证原文`、`极高`、`已实施`、`正式实施`、`必须`。
- [x] 每条法规标记为 `verified`、`needs-review`、`example`。
- [x] 没有官方链接的强判断统一降级。
- [x] 将用户可见文案从“确定结论”改为“复核任务”。

**Required command:**

```bash
cd /Users/pray/project/mkt53/app
rg -n "已验证原文|极高|已实施|正式实施|必须" src/pages src/components
npm run test
npm run lint
npm run build
```

---

## Loop 5: 性能与按路由懒加载

**目标:** 在现有 manualChunks 基础上做 route-level lazy loading，降低首屏 `index` chunk。

**Files:**
- Modify: `app/src/App.tsx`
- Create: `app/src/routes/lazy-pages.tsx`
- Test: `app/tests/routes/lazy-pages.test.tsx`

**执行方向:**
- 页面组件用 `React.lazy` 分组加载。
- `Suspense` fallback 使用轻量骨架，不引入新视觉风格。
- 保持所有现有 route path 不变。

**验收标准:**
- 最大 app chunk 目标：`< 500 KB minified`。
- `dist/index.html` 仍包含 vendor preload。
- 首页、`/industry/regulation`、`/ai-assistant/design` 返回 SPA 200。

**Required commands:**

```bash
cd /Users/pray/project/mkt53/app
npm run build
find dist/assets -maxdepth 1 -type f -name "*.js" -exec ls -lh {} \;
npm run test
```

---

## Loop 6: 生产部署脚本化

**目标:** 把当前手工 build + rsync 流程固化成可复用脚本，并避免误传错误 dist。

**执行状态:** 已完成。`app/scripts/deploy-static.sh` 已跑通，并已上传到腾讯云轻量服务器。

**Files:**
- Create: `app/scripts/deploy-static.sh`
- Modify: `AGENTS.md`

**Script contract:**

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
npm run test
npm run lint
npm audit
npm run build
rsync -az --delete -e "ssh -i ../ai_video.pem -o BatchMode=yes" dist/ ubuntu@101.34.52.232:/opt/mkt53/html/
```

**验收标准:**
- 脚本失败时不继续 rsync。
- `ai_video.pem` 不进入 git。
- `AGENTS.md` 部署说明与脚本一致。

---

## Loop 7: 线上烟雾测试脚本

**目标:** 部署后自动验证关键路由、静态资源、安全扫描关键词。

**执行状态:** 已完成。`app/scripts/smoke-prod.sh` 已跑通，生产地址 `https://mkt.lute-tlz-dddd.top` smoke 通过。

**Files:**
- Create: `app/scripts/smoke-prod.sh`
- Create: `app/tests/scripts/smoke-prod.test.ts`

**Smoke checks:**
- `/`
- `/market/trend`
- `/industry/regulation`
- `/ai-assistant/design`
- `/assets/*.js` 不含 `sk-`、`ghp_`、`Authorization: Bearer`、`code-path`

**验收命令:**

```bash
cd /Users/pray/project/mkt53/app
bash scripts/smoke-prod.sh
npm run test
```

---

## Loop 8: UI 视觉回归与移动端检查

**目标:** 建立可重复的页面截图检查，重点防止导航、地图、表格、卡片在移动端溢出。

**Files:**
- Add dependency: `@playwright/test`
- Create: `app/tests/e2e/core-pages.spec.ts`
- Modify: `app/package.json`

**Routes:**
- `/`
- `/industry`
- `/industry/regulation`
- `/data-source`
- `/ai-assistant/design`

**验收标准:**
- Chromium desktop 1440x900 通过。
- Mobile 390x844 通过。
- 不要求像素完全一致，只断言关键标题、无水平滚动、无控制台 error。

**执行记录（2026-05-31）:**
- [x] 添加 `@playwright/test`、`app/playwright.config.ts` 和 `npm run test:e2e`。
- [x] 新增 `app/tests/e2e/core-pages.spec.ts`，覆盖桌面与移动端核心路由。
- [x] 隔离 Vitest 与 Playwright 测试发现范围，避免 `npm run test` 误执行 E2E 文件。
- [x] 修复移动端侧栏挤压导致的水平溢出。
- [x] 修复法规时间线重复 key 控制台错误。
- [x] 已验证：`npm run test`、`npm run lint`、`npm audit`、`npm run build`、`npm run test:e2e`。

---

## Loop 9: 文档与目录治理

**目标:** 把本轮风险整改、CI、部署、数据可信度规则沉淀到正式文档。

**Files:**
- Create: `docs/workflows/workflow-quality-gate-stable.md`
- Create: `docs/workflows/workflow-static-deploy-stable.md`
- Create: `docs/knowledge/knowledge-data-source-governance-stable.md`
- Modify: `README.md`

**文档要求:**
- 每个 Markdown 必须带项目规范 frontmatter。
- 文档只写当前有效流程，不记录临时过程。
- `README.md` 只放入口和最短操作路径。

**验收标准:**
- 无草稿文档进入正式目录。
- `rg -n "TODO|TBD|final_v2|最新版" docs README.md` 无命中。

**执行记录（2026-05-31）:**
- [x] 创建质量门禁、静态部署、数据来源治理三份正式文档。
- [x] 创建根目录 `README.md`，收敛项目入口、质量门禁、部署和文档索引。
- [x] 更新 `app/README.md`，移除旧依赖和手工 rsync 部署说明。
- [x] 已验证：正式文档均有 frontmatter，`docs` 与 `README.md` 无禁用占位词。

---

## Loop 10: 产品能力收敛与下一阶段路线图

**目标:** 把当前“展示型看板”拆成可执行的产品路线：数据导入、来源审核、报告生成、AI 代理服务。

**Files:**
- Create: `docs/product/product-roadmap-market-insight-stable.md`
- Create: `docs/architecture/architecture-data-and-ai-proxy-stable.md`

**输出结构:**
- 当前能力清单
- 不可信/示例数据清单
- 真实数据接入优先级
- AI image proxy 最小架构
- 90 天路线图

**验收标准:**
- 每个路线图项必须有 owner、数据依赖、验收指标。
- 明确“不做项”：不在浏览器保存供应商 API key；不把未核实法规显示为已验证事实。

---

## 迭代顺序与提交策略

1. Loop 1 单独提交：CI 质量门禁
2. Loop 2 单独提交：测试覆盖扩展
3. Loop 3-4 可拆两个提交：数据 registry、法规复核
4. Loop 5 单独提交：懒加载与性能
5. Loop 6-7 可拆两个提交：部署脚本、烟雾测试
6. Loop 8 单独提交：E2E 视觉检查
7. Loop 9-10 可拆两个提交：正式文档、路线图

每个 loop 结束必须运行：

```bash
cd /Users/pray/project/mkt53/app
npm run test
npm run lint
npm audit
npm run build
```

部署类 loop 额外运行：

```bash
cd /Users/pray/project/mkt53/app
bash scripts/smoke-prod.sh
```

---

## 当前不纳入自动执行的事项

- 外部供应商 API key 吊销：需要在供应商控制台操作。
- 大规模删除未使用图片：需要先确认视觉资产保留策略。
- 法规结论最终定稿：需要法务或业务 owner 复核。
