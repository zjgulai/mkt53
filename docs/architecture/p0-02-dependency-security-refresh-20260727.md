# P0-02 依赖安全刷新与兼容迁移方案

日期：2026-07-27
状态：`p0-02-dependency-security-refresh-local-l1-complete`
证据层级：`L1-local-validated`
本地候选状态：`ready`
生产状态：`not-deployed-not-verified`

## 1. 结论

P0-02 已在本地关闭。2026-07-27 的新鲜基线为 `14 high / 0 critical`；本批完成 React Router 8、React 19.2.8、ESLint 10、TypeScript-ESLint 8.65 与 PostCSS 8.5.23 的兼容升级，最终安装审计和独立 `npm audit` 均返回 `0 vulnerabilities`。

升级不是只改 lockfile：

- 删除 `react-router-dom`，20 个应用/测试文件统一迁移到 `react-router`；
- 将 React/ReactDOM 提升到 Router v8 所需的运行时下限以上；
- 将 ESLint、`@eslint/js`、TypeScript-ESLint 和两个 React ESLint 插件升级到彼此声明兼容的版本；
- 修正 ESLint 10 暴露的移动端 Hook 和 Carousel effect 生命周期问题；
- 新增永久安全版本、禁用旧 Router 包和禁止旧导入回流的回归合同；
- 完整通过 179 项单测、lint、build、77 资产预算、两层数据审计和桌面/移动 150 项 E2E。

本批没有部署、生产读取/写入、`public/` 业务数据写入、数据库/nginx/cron 修改、provider/connector 调用，也没有 git stage、commit 或 push。

## 2. 基线问题与修复映射

| 漏洞链 | 基线 | 修复 |
|---|---|---|
| React Router data route XSS | `react-router` / `react-router-dom` 7.18.1 | `react-router` 8.3.0；删除兼容包并迁移全部导入 |
| PostCSS line return parsing | PostCSS 8.5.15 | PostCSS 8.5.23 |
| minimatch / brace-expansion 传递链 | ESLint 9.39.2、TypeScript-ESLint 8.52.0 | ESLint 10.8.0、TypeScript-ESLint 8.65.0 |
| ESLint 10 peer 合同 | React Hooks 7.0.1，React Refresh 旧版本 | React Hooks 7.1.1、React Refresh 0.5.3 |

React Router 的官方 v7→v8 指南要求 Node `22.22+`、React/ReactDOM `19.2.7+` 和 Vite `7+`，并明确 v8 移除 `react-router-dom`；当前环境 Node 为 `22.22.0`，项目 Vite 为 `8.0.16`，升级后的 React/ReactDOM 为 `19.2.8`。[React Router v8 升级指南](https://reactrouter.com/upgrading/v7)

本批修复的 Router 风险对应 GitHub Advisory `GHSA-qwww-vcr4-c8h2`，修复版本为 8.3.0。[GitHub Advisory](https://github.com/advisories/GHSA-qwww-vcr4-c8h2/dependabot)

ESLint 使用现有 flat config，不需要从 eslintrc 重写；迁移重点是 Node/插件兼容和新增规则反馈。[ESLint v10 迁移指南](https://eslint.org/docs/latest/use/migrate-to-10.0.0)

## 3. 完整设计逻辑

```text
安全审计
  ├─ direct runtime
  │    ├─ react-router 7 → 8
  │    ├─ react / react-dom → 19.2.8
  │    └─ postcss → 8.5.23
  ├─ lint toolchain
  │    ├─ eslint → 10.8.0
  │    ├─ @eslint/js → 10.0.1
  │    ├─ typescript-eslint → 8.65.0
  │    └─ React lint plugins → ESLint 10 compatible
  └─ permanent contract
       ├─ minimum versions
       ├─ no react-router-dom package
       └─ no react-router-dom source/test imports

验证
  ├─ dependency tree + npm audit
  ├─ serial unit tests + ESLint
  ├─ TypeScript + Vite build
  ├─ bundle budget
  ├─ data consistency + deep audit
  └─ 75 desktop + 75 mobile E2E
```

### 3.1 Router 为什么直接迁移而不是继续保留兼容包

项目使用 `HashRouter`、`Routes`、`Route`、`Link`、`MemoryRouter`、`useNavigate`、`useLocation` 和 `useParams`，没有使用需要从 `react-router/dom` 导入的 `RouterProvider` 或 `HydratedRouter`。因此 20 个文件可以直接从 `react-router` 导入，不需要兼容层或双包共存。

保留 `react-router-dom` 会形成三个问题：

1. v8 官方包模型已经移除该兼容包；
2. 应用和测试可能继续出现两套导入路径；
3. 未来升级时安全门只能检查版本，无法阻止旧包回流。

永久合同同时检查 package manifest 和 `src/`、`tests/` 的实际导入，旧依赖或旧导入任一回流都会使单测失败。

### 3.2 ESLint 10 为什么修代码而不是关闭新规则

升级后的 React Hooks 插件报告两处 `set-state-in-effect`：

- `useIsMobile()` 在 effect 内同步设置初值；
- Carousel 在订阅 effect 内立即调用会触发 state 的 `onSelect(api)`。

处理方式：

- 移动端状态改为惰性初值，effect 只负责订阅/解除 `matchMedia` 事件；
- Carousel 首次 render 直接读取 Embla API 当前可滚动状态，effect 只注册事件；
- Carousel cleanup 同时解除 `select` 和此前遗漏的 `reInit` 监听。

这保留了原 UI 行为，并消除了同步级联 render 与 `reInit` 监听器残留，没有通过 disable rule 绕过。

### 3.3 为什么保留串行单测作为正式门禁

项目的正式 release evidence 原本就执行 `npm run test:serial`。本批在高系统负载下试跑默认并发套件时，多个 CLI/页面用例触发相同的默认 5 秒超时；相关用例独立运行通过，串行全套 `23 files / 179 tests` 也全部通过。

半月恢复候选测试是实际文件/脚本型集成测试，单独运行接近 5 秒，因此只把该测试的上限调整为 30 秒；其余断言和副作用边界未改变。正式证据使用确定性的串行门禁，不把并发机器争用写成代码回归，也不把失败的探索性并发运行隐藏为通过。

## 4. 依赖结果

| 依赖 | 修复后 |
|---|---:|
| React | 19.2.8 |
| ReactDOM | 19.2.8 |
| React Router | 8.3.0 |
| `react-router-dom` | removed |
| ESLint | 10.8.0 |
| `@eslint/js` | 10.0.1 |
| TypeScript-ESLint | 8.65.0 |
| React Hooks ESLint plugin | 7.1.1 |
| React Refresh ESLint plugin | 0.5.3 |
| PostCSS | 8.5.23 |

安装树完整，顶层依赖没有 unmet peer；最终审计为 `0 info / 0 low / 0 moderate / 0 high / 0 critical`。

## 5. 永久回归合同

`tests/scripts/dependency-security-contract.test.ts` 固化三类边界：

1. Router ≥8.3.0、React/ReactDOM ≥19.2.7，且 package manifest 不得重新出现 `react-router-dom`；
2. ESLint、`@eslint/js`、TypeScript-ESLint、PostCSS 和 React lint plugins 不得降到本批修复下限以下；
3. `src/` 与 `tests/` 的 TypeScript/JavaScript 文件不得重新导入 `react-router-dom`。

合同使用最低安全版本而不是锁死所有 patch 版本，允许后续正常补丁升级，同时阻止已知漏洞版本和旧架构回流。

## 6. 验证结果

| 门禁 | 结果 |
|---|---|
| Dependency security contract | 1 file / 3 tests passed |
| 正式全量 Vitest | 23 files / 179 tests passed；200.80s；`maxWorkers=1` |
| ESLint | passed |
| npm dependency tree | complete；0 unmet top-level dependencies |
| npm audit | 0 vulnerabilities |
| TypeScript + Vite | 2,383 modules；passed |
| Bundle budget | 77 assets / 77 pass / 0 exception / 0 failure |
| 最大共享 React chunk | 221,738 bytes；既有永久预算内 |
| Data consistency | 43 pages / 107 tables / 53 sources / 107 governance / 0 issues |
| Deep audit | 888 claims / 0 high-risk / 26 source gaps |
| Browser acceptance | desktop 75 + mobile 75；150/150 passed；9.8m |
| Graphify | 4,488 nodes / 7,137 edges / 341 communities；0 integrity defects；54 zero-AST source files |

E2E 使用新增的 `MKT53_E2E_BROWSER_CHANNEL=chrome` 配置接入本机系统 Chrome，并使用独立端口避免干扰已有本地服务。150 条测试全部完成后，一个已完成的移动 worker 未自行退出；对该精确 PID 发送 TERM 后，Playwright 正常生成 `150 passed` 汇总并以退出码 0 结束。

## 7. 使用手册

在 `app/` 下执行：

```bash
# 安装 lockfile 中的确定依赖
npm ci

# 永久安全合同
npm run test -- tests/scripts/dependency-security-contract.test.ts

# 正式本地质量门
npm run test:serial
npm run lint
npm audit
npm run build
npm run quality:bundle-budget
npm run data:audit
npm run data:audit:deep

# 使用系统 Chrome 运行全量桌面/移动端 E2E
MKT53_E2E_BROWSER_CHANNEL=chrome \
MKT53_E2E_PORT=41731 \
MKT53_E2E_REUSE_EXISTING=0 \
npm run test:e2e
```

维护规则：

1. Router 升级先阅读官方 changelog 和迁移指南，不重新安装 `react-router-dom`；
2. React Router v8 的 Node/React/Vite 下限必须同时满足；
3. ESLint、TypeScript-ESLint 和 React plugins 必须作为一个兼容组升级；
4. `npm audit fix --force` 不能替代兼容分析、单测和完整 E2E；
5. 任一 major upgrade 后必须重跑 build、bundle 和两层数据审计，不能只看 audit 数量；
6. CI/正式 release evidence 使用串行 Vitest；并发套件可用于提速观察，但系统资源不足导致的 timeout 应单独记录；
7. `MKT53_E2E_BROWSER_CHANNEL` 只改变本地浏览器选择，不改变生产目标或部署状态。

## 8. 边界与下一批

- P0-02 只在 L1 本地证据层完成；没有生产部署或线上回归。
- 本批联网仅用于 npm registry 安装/安全审计和官方文档核对，不含业务数据采集。
- 54 个 zero-AST 文件主要是 JSON/config 图谱可见性限制，不能被描述为这些文件已完成 AST 级分析。
- P0-04 必须等待 2026-08-01 09:00 首次 cron 时间窗，再做只读运行日志、run-report、H1 周期和双路径哈希观察。
- DATA-REG 仍为真实输入 `0/6`；没有 owner/source/SKU/legal/evidence/withdrawal 输入与独立授权时，不启动 live collection 或真实 review handoff。

机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/p0-02-dependency-security-refresh-20260727.json`。
