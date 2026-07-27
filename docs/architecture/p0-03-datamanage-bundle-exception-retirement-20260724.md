# P0-03 DataManage Bundle 临时例外退出方案

日期：2026-07-24
状态：`datamanage-bundle-exception-retired-local-l1`
证据层级：`L1-local-validated`

## 1. 结论

`DataManage` 主 route chunk 已从基线 `239,136 bytes / 233.53 KiB` 降至 `36,656 bytes / 35.80 KiB`，减少 `202,480 bytes / 84.67%`。它现在直接受普通 route `120 KiB` 硬门禁约束，原 `256 KiB`、2026-08-15 到期的书面临时例外已经从 `bundle-budgets.json` 删除。

本批保持 7 个业务模块、107 张数据表及 107 条治理记录不变。完整 Vitest、lint、依赖审计、build、bundle budget、两层数据审计和桌面/移动浏览器验收均通过；没有部署应用、写入 `public/` 或生产，也没有执行 git stage/commit/push。

## 2. 问题与目标

拆分前，`DataManage.tsx` 同时负责 route UI、领域类型、7 模块静态目录、ERP 大目录、治理元数据、血缘与操作手册装载，共 2,487 行。Vite 因此把这些职责聚合到单个 route chunk，基线达到 `239,136 bytes`，只能依赖临时上限继续通过质量门。

退出标准不是仅让 build 不告警，而是同时满足：

1. `DataManage-*.js < 122,880 bytes`；
2. 删除 DataManage 专属例外，由默认规则直接判定；
3. 7 模块顺序、107 表和治理 ID 集合不变；
4. 静态目录拆分后仍被一致性审计和 deep audit 覆盖；
5. 操作手册只有在用户打开对应 tab 时才加载；
6. 桌面与移动端无水平溢出、无 console error。

## 3. 完整设计逻辑

```text
/#/data
  └─ DataManage.tsx                         641-line route shell
       ├─ catalog.ts                        stable seven-module ordering
       │    ├─ catalog-core.tsx             market/competition/user/industry/self/AI
       │    └─ catalog-erp.tsx              ERP internal catalog
       ├─ governance.ts                     quality/lineage/change history
       ├─ model.ts                          shared domain types + source classifier
       └─ lazy OperationsManual             loaded only when the manual tab is opened

audit contract
  ├─ project-analysis.mjs reads both catalog files and reconstructs order
  ├─ project-analysis.mjs reads governance IDs from governance.ts
  └─ audit-deep.mjs scans src/features and maps data-manage claims to DataManage

bundle contract
  ├─ named catalog-core chunk
  ├─ named catalog-erp chunk
  ├─ named governance chunk
  ├─ separate lazy OperationsManual chunk
  └─ DataManage route evaluated by default 120 KiB rule
```

### 职责边界

| 模块 | 责任 | 不应继续放入的内容 |
|---|---|---|
| `DataManage.tsx` | tab 状态、交互、视图编排、导出触发 | 新的大型静态目录、长篇手册正文 |
| `model.ts` | 数据目录与治理领域类型、纯分类函数 | JSX、页面状态、网络请求 |
| `catalog-core.tsx` | 六个非 ERP 模块的静态 schema catalog | 治理评分与页面交互 |
| `catalog-erp.tsx` | ERP 内部经营数据目录 | 对外市场事实或生产连接器逻辑 |
| `governance.ts` | 107 表治理、变更历史、血缘 | 页面 UI 和远端写入 |
| `catalog.ts` | 维持 `mkt → comp → user → ind → self → erp → ai` 顺序 | 新业务规则 |

`manualChunks()` 使用规范化路径命名三个静态数据 chunk。命名的目的不是绕开预算，而是让每个独立责任都能被相同的 120 KiB 默认门禁检查；任何一个新 chunk 超限仍会使质量门失败。

### 审计覆盖修复

首次全量测试暴露了一个真实回归：将声明移到 `src/features` 后，deep audit 原先只扫描 pages、components 和 data，且跨文件常量解析不会自动继承 source ID，导致 19 条声明被误判为 unsupported。

修复分两层完成：

- `businessFiles()` 显式扫描 `src/features/**/*.{ts,tsx}`，并把 `features/data-manage/*` 统一归属到 `DataManage`；
- 每个 catalog/governance 文件保留本文件可解析的 source ID 常量，避免用无法被静态审计解析的跨文件隐式引用。

最终 deep audit 恢复为 `888 claims / 0 high-risk / 0 medium / 0 unsupported / 26 source gaps`。26 个来源缺口仍是业务证据待补，不因代码审计通过而消失。

## 4. 构建与预算结果

| Chunk | 未压缩 bytes | KiB | 预算状态 |
|---|---:|---:|---|
| `DataManage` | 36,656 | 35.80 | 普通 120 KiB 规则通过 |
| `data-manage-catalog-core` | 56,701 | 55.37 | 普通 120 KiB 规则通过 |
| `data-manage-catalog-erp` | 91,393 | 89.25 | 普通 120 KiB 规则通过 |
| `data-manage-governance` | 39,185 | 38.27 | 普通 120 KiB 规则通过 |
| `OperationsManual` | 26,878 | 26.25 | 普通 120 KiB 规则通过；按需加载 |

最终 build 包含 2,333 modules、64 个 JavaScript assets；预算结果为 `63 pass / 1 temporary exception / 0 failure`。仅 `vendor-charts` 保留已有临时例外，当前 `361,668 bytes / 353.19 KiB`，不属于本批已关闭范围。

## 5. 使用与维护手册

在 `app/` 下执行：

```bash
# 回归目录与审计覆盖合同
npx vitest run tests/pages/data-manage-split.test.ts --maxWorkers=1

# 完整本地质量门
npm test -- --maxWorkers=1
npm run lint
npm audit
npm run build
npm run quality:bundle-budget
npm run data:audit
npm run data:audit:deep
```

新增或修改数据表时：

1. 把核心模块 schema 放入 `catalog-core.tsx`，ERP schema 放入 `catalog-erp.tsx`；
2. 在 `governance.ts` 增加同名 table ID 的治理记录；
3. 保持表和治理 ID 一一对应，运行 `data-manage-split.test.ts` 与两层 data audit；
4. build 后检查每个 data-manage chunk，而不是只看 `DataManage` 主块；
5. 不允许重新添加例外来掩盖静态数组继续膨胀；超限时应继续按业务域拆分或改为真正的 tab-level 动态导入。

浏览器验收入口使用 HashRouter 地址：`http://127.0.0.1:3000/#/data`。桌面 `1440×900` 和移动 `390×844` 均应确认：初始视图可见数据目录与 107 表统计、未请求 OperationsManual chunk；点击“操作手册”后才请求该 chunk并显示手册标题；两个视口均无水平溢出和 console error。

## 6. 实测证据

| 验证 | 结果 |
|---|---|
| 定向 Vitest | 3 files / 91 tests passed |
| 全量 Vitest | 22 files / 174 tests passed；54.89s |
| Lint / dependency audit | passed / 0 vulnerabilities |
| Build / bundle | 2,333 modules；64 assets；63 pass；1 exception；0 failures |
| Data consistency | 43 pages / 107 tables / 53 sources / 107 governance / 0 issues |
| Deep audit | 888 claims / 0 high / 0 medium / 0 unsupported / 26 source gaps |
| Browser acceptance | desktop + mobile passed；manual lazy request verified；0 overflow；0 console errors |
| Graphify | 4,421 nodes / 7,077 edges / 351 communities；0 integrity defects；51 zero-AST source files |

项目 Playwright 自带 Chromium 的首次尝试因本机缓存缺失可执行文件而没有进入应用；随后使用已安装的系统 Chrome 完成同等桌面/移动验收。该项记录为工具环境限制，不伪写为应用测试失败或官方 Playwright 全套通过。

## 7. 边界与下一批

- 本批没有改变 107 表业务语义，没有接入新的真实数据或连接器。
- 没有网络/provider/connector 调用，没有业务、`public/`、数据库或生产写入。
- 没有运行生产 smoke/E2E，没有部署，也没有 git stage/commit/push。
- Graphify 的 51 个 zero-AST 文件主要是 JSON/config 可见性限制；不能被写成这些文件已经得到 AST 级分析。

下一项同类安全批次是退出 `vendor-charts` 临时例外：先按 route 的 Recharts/D3 使用面做归因与按需拆分，再以 `≤300 KiB` 目标、普通或新明确规则验收；不得仅提高上限。P0-04 仍需等待 2026-08-01 09:00 首次 cron 时间窗进行只读观察，DATA-REG 仍需真实输入与独立授权。
