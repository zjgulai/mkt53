---
title: 质量门禁工作流
doc_type: workflow
module: engineering
topic: quality-gate
status: stable
created: 2026-05-31
updated: 2026-05-31
owner: self
source: human+ai
---

# 质量门禁工作流

## 适用范围

本流程适用于所有进入 `main` 的应用代码、测试、构建配置、部署脚本和正式文档变更。

## 本地门禁

在仓库根目录执行：

```bash
cd app
npm ci
npm run test
npm run lint
npm audit
npm run build
```

改动页面布局、导航、核心路由、移动端样式或可视化组件时，额外执行：

```bash
cd app
npm run test:e2e
```

`npm run test:e2e` 使用 Playwright 启动本地 Vite 服务，覆盖桌面 `1440x900` 与移动端 `390x844`，断言核心页面标题可见、无水平滚动、无控制台 error。

## CI 门禁

GitHub Actions 工作流位于 `.github/workflows/quality-gate.yml`，在 `main` 的 push 和 pull request 上运行：

```bash
cd app
npm ci
npm run test
npm run lint
npm audit
npm run build
```

CI 使用 Node.js 22，并按 `app/package-lock.json` 缓存 npm 依赖。

## 测试职责边界

| 命令 | 职责 |
|---|---|
| `npm run test` | Vitest 单元测试、组件测试、路由懒加载、脚本约束、客户端 bundle 泄漏检查 |
| `npm run lint` | ESLint 静态检查 |
| `npm audit` | npm 依赖漏洞检查 |
| `npm run build` | TypeScript 编译与 Vite 生产构建 |
| `npm run test:e2e` | Playwright 核心页面视觉与移动端回归 |

Vitest 只发现 `tests/**/*.{test,spec}.{ts,tsx}`，并排除 `tests/e2e/**`。Playwright 只发现 `tests/e2e/**`。两类测试不得互相执行。

## 失败处理

1. `npm audit` 非零退出时，先判断是否能通过升级直接消除漏洞。
2. `npm run build` 失败时，先修复 TypeScript 或 Vite 构建错误，再处理视觉问题。
3. `npm run test:e2e` 失败时，优先区分测试选择器误判、控制台错误、水平滚动和路由渲染错误。
4. 生产部署前不得跳过 `deploy-static.sh` 内置门禁。
