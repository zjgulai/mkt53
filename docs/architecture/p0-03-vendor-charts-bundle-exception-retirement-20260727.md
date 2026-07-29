# P0-03 vendor-charts Bundle 临时例外退出方案

日期：2026-07-27
状态：`vendor-charts-bundle-exception-retired-local-l1`
证据层级：`L1-local-validated`
发布候选状态：`blocked-by-new-dependency-audit-findings`

## 1. 结论

最后一个 bundle 临时例外已经退出。原先由 `manualChunks()` 强制聚合的 `vendor-charts` 为 `361,668 bytes / 353.19 KiB`；本批将共享 Recharts Cartesian runtime 固定为 `vendor-chart-core`，把其余 Recharts、D3 与 lodash 模块交还 Vite 按实际 lazy route 依赖拆分。最终共享核心为 `153,109 bytes / 149.52 KiB`，比原聚合块减少 `208,559 bytes / 57.67%`。

`bundle-budgets.json` 已删除 2026-08-15 到期的 `vendor-charts-temporary-exception`，替换为无例外、必需匹配的 `vendor-chart-core-180-kib` 永久规则。最终生产构建包含 2,333 modules、77 个 JavaScript assets，预算结果为 `77 pass / 0 exception / 0 failure`。

本批没有部署应用、写入 `public/` 或生产，没有调用 provider/受限 connector，也没有执行 git stage/commit/push。完整测试、lint、build、bundle budget、两层数据审计和桌面/移动图表路由验收通过；但 2026-07-27 的新鲜 `npm audit` 返回 14 个 high advisories，因此当前整体 release candidate 必须保持 blocked，不能用 bundle 通过替代依赖安全门。

## 2. 问题与退出标准

旧配置把所有 `/recharts/`、`/d3-` 和 `/lodash/` 依赖强制放入同一个 `vendor-charts`。这让首页、市场折线图、用户雷达图和访谈页饼图共享一个与各自真实用途无关的 353.19 KiB 聚合块，并依赖 380 KiB 临时上限继续通过。

退出标准同时包含：

1. 删除 `vendor-charts` 命名和临时例外；
2. 最大共享图表基础块低于路线图 300 KiB 目标；
3. 图表基础块受永久硬上限约束，不以延长日期或提高临时上限过关；
4. line、bar、pie、radar、scatter 等图表族保持 route-aware，不再次聚合；
5. 所有其他普通 chunk 继续受 120 KiB 默认门禁；
6. 关键图表路由桌面与移动端均可见、无 console/page error、无横向溢出。

## 3. 完整设计逻辑

```text
HashRouter lazy route
  ├─ Home / Market / Overseas     line family
  ├─ Aesthetics                   bar family
  ├─ Users                        radar family
  └─ Consumer / Store             pie, scatter, composed families

Vite manualChunks
  ├─ recharts/es6/chart/CartesianChart.js
  │    └─ stable vendor-chart-core
  └─ other Recharts / D3 / lodash modules
       └─ return undefined → Vite derives route/family chunks

bundle budget
  ├─ vendor-chart-core-*.js       required, hard 180 KiB, no exception
  ├─ vendor-react-*.js            required, hard 220 KiB
  └─ every other *.js             hard 120 KiB
```

### 为什么只命名 Cartesian core

Recharts 的 Cartesian chart 运行时由多个图表页共同使用，保留一个稳定命名有两个作用：构建产物可被永久预算规则精确匹配；共同依赖不会在各 route 中重复复制。

其余模块不再按目录手工分组。实验中把 cartesian、polar、state、shape 等目录分别命名，会被 Rolldown 根据依赖关系重新合并为约 303 KiB 的 cartesian 聚合块，仍然弱化 route 隔离。只固定真正共享的 `CartesianChart.js`，让构建器处理其余依赖，最终形成 `YAxis`、`RadarChart`、`BarChart`、`PieChart`、`ScatterChart`、`Line` 等独立块。

### 为什么是永久 180 KiB

`evaluateBundleAssets()` 的合同是：`size <= targetBytes` 才直接通过；超过 target 且没有有效 exception 会失败。因此永久规则必须使用相同的 `targetBytes` 与 `maxBytes`。180 KiB 对当前 149.52 KiB 核心保留 `31,211 bytes / 16.93%` 余量，同时不会把旧 300–380 KiB 聚合块伪装为正常基础设施。

该规则设置 `required: true`。如果后续构建改名、删除或意外重新聚合，门禁会因“required rule 无匹配资产”或普通 120 KiB 超限而 fail closed。

## 4. 构建与预算结果

| Chunk | 未压缩 bytes | KiB | 预算 |
|---|---:|---:|---|
| `vendor-chart-core` | 153,109 | 149.52 | permanent 180 KiB |
| `YAxis` | 101,677 | 99.29 | default 120 KiB |
| `RadarChart` | 24,699 | 24.12 | default 120 KiB |
| `BarChart` | 16,541 | 16.15 | default 120 KiB |
| `PieChart` | 13,088 | 12.78 | default 120 KiB |
| `ScatterChart` | 10,430 | 10.19 | default 120 KiB |
| `Line` | 9,710 | 9.48 | default 120 KiB |
| `vendor-react` | 223,706 | 218.46 | permanent 220 KiB |

整体预算为 `77 assets / 77 pass / 0 exception / 0 failure`。DataManage 和 chart 两个历史临时例外现均已退出，配置中不存在任何 `exception` 字段。

## 5. 回归合同

### 单元与配置合同

`release-quality-gates.test.ts` 新增两类保护：

- `vendor-chart-core` 在 180 KiB 边界内通过，超过 1 byte 即失败；
- 当前预算配置不得存在任何 exception；
- `vite.config.ts` 必须包含稳定 `vendor-chart-core` 和 `CartesianChart.js` 映射，不得重新返回 `vendor-charts`。

### 浏览器合同

`tests/e2e/chart-routes.spec.ts` 固化六个代表性路由：

- `/`
- `/#/market`
- `/#/users`
- `/#/users/aesthetics`
- `/#/users/consumer`
- `/#/users/store`

每个路由都要求至少一个 `.recharts-wrapper` 可见，并检查 console error、page error 和水平溢出。当前使用系统 Chrome 在 desktop `1440×900` 与 mobile `390×844` 两个项目运行，共 `12/12` 通过。

## 6. 使用与维护手册

在 `app/` 下执行：

```bash
# 预算逻辑与配置回归
npx vitest run tests/scripts/release-quality-gates.test.ts --maxWorkers=1

# 生产构建与实际 chunk 预算
npm run build
npm run quality:bundle-budget

# 完整本地门禁
npm test -- --maxWorkers=1
npm run lint
npm audit
npm run data:audit
npm run data:audit:deep:summary

# 图表路由浏览器回归
npm run test:e2e -- tests/e2e/chart-routes.spec.ts
```

新增图表时：

1. 保持页面通过 `lazy-pages.tsx` 按 route 动态装载；
2. 只从 Recharts 导入实际使用的 chart、series、axis、tooltip 与 legend；
3. build 后确认新模块进入对应 route/family chunk，而不是进入 `vendor-chart-core`；
4. 不要为新图表族增加临时例外；普通块超过 120 KiB 时先拆 page、data 或 chart family；
5. 若 Recharts 升级改变 `CartesianChart.js` 路径，required rule 会失败；应重新验证共享核心路径与真实 route payload，再更新映射和测试；
6. bundle 通过后仍必须运行桌面/移动图表路由 E2E，避免“拆分成功但运行时 chunk 缺失”。

## 7. 实测证据与未通过门禁

| 验证 | 结果 |
|---|---|
| 定向 Vitest | 3 files / 94 tests passed |
| 全量 Vitest | 22 files / 176 tests passed；56.08s |
| ESLint | passed |
| TypeScript + Vite | 2,333 modules；passed |
| Bundle budget | 77 / 77 pass；0 exception；0 failure |
| Data consistency | 43 pages / 107 tables / 53 sources / 107 governance / 0 issues |
| Deep audit | 888 claims / 0 high / 0 medium / 0 unsupported / 26 source gaps |
| Browser acceptance | desktop + mobile，6 routes × 2；12/12 passed |
| Graphify | 4,442 nodes / 7,095 edges / 344 communities；0 integrity defects；52 zero-AST source files |
| npm audit | **failed**；14 high / 0 critical |

`npm audit` 的当前高危项涉及 React Router、PostCSS、ESLint/typescript-eslint 及其 minimatch/brace-expansion 链。可用修复包含 React Router 8、ESLint 10 等大版本变更；本批没有把这些升级混入图表拆分。后续依赖安全批次需要逐项确认可修版本、路由兼容性、lint 配置和完整 E2E，完成前 `quality:release-evidence` 不得宣称 8/8 或 release-ready。

## 8. 边界与下一批

- 本批只修改前端构建分块、预算合同和回归测试。
- npm registry 仅用于安全审计；没有业务采集、provider 或受限 connector 调用。
- 没有 `public/`、数据库、生产 nginx、生产静态目录或 cron 写入。
- 没有部署、生产 smoke/E2E、git stage、commit 或 push。
- Graphify 的 52 个 zero-AST 文件主要为 JSON/config 可见性限制，不能被写成这些文件已完成 AST 级分析。

下一安全批次应处理 `P0-02 dependency security refresh`：先在本地验证 React Router、PostCSS、ESLint/typescript-eslint 的兼容升级，再重跑 176 unit tests、完整 E2E、build、bundle 与数据审计。P0-04 仍须等待 2026-08-01 09:00 首次 cron 时间窗做只读观察；DATA-REG 仍须等待真实 6/6 输入和独立授权。
