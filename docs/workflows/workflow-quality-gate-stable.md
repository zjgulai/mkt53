---
title: 质量门禁工作流
doc_type: workflow
module: engineering
topic: quality-gate
status: stable
created: 2026-05-31
updated: 2026-07-27
owner: self
source: human+ai
---

# 质量门禁工作流

## 适用范围

本流程适用于所有进入 `main` 的应用代码、测试、构建配置、部署脚本和正式文档变更。

## 前端本地门禁

在仓库根目录执行：

```bash
cd app
npm run quality:release-evidence
```

该聚合命令串行执行 unit、lint、dependency audit、build、bundle budget、数据一致性、deep audit 与本地 E2E，并把机器证据写到 `app/tmp/release-evidence/latest.json`。临时目录不进入版本控制。

需要单独诊断页面布局、导航、核心路由、移动端样式或可视化组件时执行：

```bash
cd app
npm run test:e2e
```

`npm run test:e2e` 使用 Playwright 启动本地 Vite 服务，覆盖桌面 `1440x900` 与移动端 `390x844`，断言核心页面标题可见、无水平滚动、无控制台 error。

本机存在其他高 CPU Node/Vitest 任务时，组件测试可能出现交互超时。此时先不要把超时直接判定为业务回归，改用串行诊断入口复核：

```bash
cd app
npm run test:serial
```

改动宿主导航页入口、生产域名、landing 卡片文案或发布验收规则时，额外执行：

```bash
cd app
npm run test:e2e:prod
```

`npm run test:e2e:prod` 使用独立的 `playwright.prod.config.ts`，不启动本地 dev server。它直接检查 `https://lute-tlz-dddd.top/` 和 `https://mkt.lute-tlz-dddd.top`，覆盖桌面 `1440x900` 与移动端 `390x844`。

## 后端本地门禁

```bash
cd backend
uv sync --frozen
./scripts/quality-be07.sh
```

`quality-be07.sh` 依次验证：

1. `uv.lock` 新鲜度；
2. Ruff format 与 lint；
3. Pytest、分支覆盖率和 90% 硬阈值；
4. 普通与恢复 Compose 配置、零宿主端口合同；
5. fixture-only PostgreSQL 备份、恢复、幂等重放、撤回和 append-only 约束；
6. 容器、内部网络和卷的零残留清理。

恢复证据只属于 L2 fixture/dry-run。它不读取或写入生产数据库，不安装任务，不调用 provider/connector，也不证明生产 RPO/RTO。

## CI 门禁设计

GitHub Actions 工作流位于 `.github/workflows/quality-gate.yml`，在 `main` 的 push 和 pull request 上并行运行 `app` 与 `backend` 两个独立 job。工作流只授予 `contents: read`：

```bash
# app job
cd app
npm ci
npx playwright install --with-deps chromium
npm run quality:release-evidence

# backend job
cd backend
uv sync --frozen
./scripts/quality-be07.sh
```

前端使用 Node.js 22，并按 `app/package-lock.json` 缓存 npm 依赖。后端固定 Python `3.12.13`、uv `0.11.11` 和 `backend/uv.lock` 缓存；`setup-uv` 使用完整提交 SHA 固定，避免浮动 tag 改变执行内容。两个 job 都运行在完整 `ubuntu-latest` VM 上，后端可使用本地 Docker daemon 完成隔离恢复演练。

前端 Playwright 只安装 Chromium，并通过 `MKT53_E2E_PORT=3030` 与 `MKT53_E2E_REUSE_EXISTING=0` 强制启动独立 Vite 服务。后端 job 不接收 SSH key、生产数据库 DSN、connector 或 provider secret，也不包含 deploy、rsync 或 cron 命令。

两个 job 都保留 14 天机器证据：

- app：`app/tmp/release-evidence/latest.json`，缺失时 artifact step 失败；
- backend：`tmp/backend-recovery/be07/**/{report,cleanup}.json`，门禁失败时也尝试上传，缺失只告警，不覆盖原始失败。

## 测试职责边界

| 命令 | 职责 |
|---|---|
| `npm run quality:release-evidence` | 前端 8 项候选门禁与单份 JSON 汇总证据 |
| `npm run test` | Vitest 单元测试、组件测试、路由懒加载、脚本约束、客户端 bundle 泄漏检查 |
| `npm run test:serial` | 本机资源紧张时的串行 Vitest 诊断入口，不替代 CI 默认并行测试 |
| `npm run lint` | ESLint 静态检查，范围限定为 `src`、`tests`、Playwright 配置和 Vite 配置 |
| `npm audit` | npm 依赖漏洞检查 |
| `npm run build` | TypeScript 编译与 Vite 生产构建 |
| `npm run data:audit` | 页面、数据管理表、source registry 和采集状态一致性审计 |
| `npm run test:e2e` | Playwright 核心页面视觉与移动端回归 |
| `npm run test:e2e:prod` | Playwright 生产入口回归，检查宿主 landing 的 `card mkt`、12 卡片数量和 mkt 目标页 |
| `uv sync --frozen` | 只按已提交 lock 同步后端依赖，不在 CI 解析新版本 |
| `./scripts/quality-be07.sh` | 后端 lock、format、lint、test、coverage、Compose 与隔离恢复总门禁 |
| `pytest tests/test_ci_workflow_contract.py` | 固定 backend job 运行时、命令、artifact 和无外部变更边界 |

Vitest 只发现 `tests/**/*.{test,spec}.{ts,tsx}`，并排除 `tests/e2e/**` 与 `tests/e2e-prod/**`。本地 Playwright 只发现 `tests/e2e/**`，生产 Playwright 只发现 `tests/e2e-prod/**`。三类测试不得互相执行。

## 失败处理

1. 任一 job 失败都阻止合并；不得用另一个 job 的成功替代。
2. `npm audit` 非零退出时，先判断是否能通过兼容升级直接消除漏洞。
3. `npm run build` 失败时，先修复 TypeScript 或 Vite 构建错误，再处理视觉问题。
4. 数据审计出现 critical/high-risk 时，先修复治理字段、registry id、页面映射或 claim 证据。
5. 本地 E2E 失败时，优先区分 worker 生命周期、选择器误判、控制台错误、水平滚动和路由渲染错误。
6. 后端失败时先看 pytest/coverage，再看恢复 `report.json`；若报告缺失，检查 Docker endpoint、镜像拉取、健康检查和 fail-closed 预检。
7. 恢复演练失败后必须确认 cleanup 结果；不能把有容器、网络或卷残留的运行标记为通过。
8. GitHub backend job 通过只证明托管 runner 上的本地 fixture 链；不能据此声称后端已生产部署。
9. 生产部署前不得跳过 `deploy-static.sh` 内置门禁，且生产写入仍需独立授权。

详细设计、使用和维护说明见 `docs/architecture/p0-backend-ci-quality-gate-20260727.md`。
