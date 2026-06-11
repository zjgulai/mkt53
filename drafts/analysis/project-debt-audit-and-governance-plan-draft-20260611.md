---
title: mkt53 项目债务深度审计与治理计划
doc_type: analysis
module: mkt53
topic: project-debt-audit-and-governance-plan
status: draft
created: 2026-06-11
updated: 2026-06-11
owner: self
source: human+ai
---

# mkt53 项目债务深度审计与治理计划

## 1. 结论

[事实] 截至 2026-06-11，半月更新机制、页面证据口径、正式文档同步、未跟踪资产忽略规则和系统图谱转正均已合并到 `main`。当前主分支最新合并提交为 `c3864c0`。

[事实] 线上产品已发布半月 manifest。`https://mkt.lute-tlz-dddd.top` 返回 HTTP/2 200，生产 `periodic-data/latest.json` 为 `period=2026-06-H1`，`refreshCadence=semi-monthly`，`generatedAt=2026-06-11T07:30:40.503Z`，`nextScheduledAt=2026-06-16T09:00:00+08:00`，`issueCount=0`。

[事实] 当前本地源码已包含 `app/public/periodic-data/latest.json` 和兼容路径 `app/public/weekly-data/latest.json`。主路径为 `periodic-data`，`weekly-data` 仅保留兼容与回滚用途。

[事实] 本轮发布前本地质量门已通过：`npm run data:audit`、`npm run test`、`npm run lint`、`npm audit`、`npm run build`、`npm run test:e2e`。生产 E2E 通过 14/14。

[事实] 生产站点已发布本轮半月 manifest。生产 E2E 验证 `https://mkt.lute-tlz-dddd.top/periodic-data/latest.json`、`/periodic-data/connectors.json`、`/weekly-data/latest.json` 兼容路径和 `/#/data` 数据页均通过。

[事实] 服务器 crontab 已移除旧 mkt53 weekly 计划，保留新的半月计划：`0 9 1,16 * * cd "/opt/mkt53/automation/app" && npm run data:publish:semi-monthly:local >> "/opt/mkt53/automation/app/tmp/data-collection/semi-monthly-refresh.log" 2>&1`。

[事实] 服务器出口网络对 3 个公开来源返回 `403`：`ds-002` Fortune Business Insights、`ds-004` Mordor Intelligence、`ds-043` Mamava / Medela survey。线上当前 manifest 来自本地发布链路，公开来源为 `sourceError=0`；未来服务器 cron 若继续得到 403，应保留 `source-error`，不得伪造为 `ok`。

[推断] 当前最大剩余债务从“版本基线漂移”切换为“连接器真实接入与页面数据结构化”。半月频率已生效，但 23 个来源仍是 `connector-required`，12 个来源仍是 `manual-required`。

[计划] 治理顺序进入第二阶段：处理页面模块过厚、数据资产结构化、Amazon / VOC / 社媒等 P0 连接器接入、人工补录复核机制和文档状态收口。

## 2. 审计证据

### 2.1 Git 与版本基线

| 项 | 当前状态 |
|---|---|
| 当前分支 | `main` 基线已同步，当前收口工作在 `codex/sync-governance-docs` 分支 |
| 主分支关系 | `main...origin/main` 已同步到 `c3864c0` |
| 最新合并 | PR #1 `c0f5545`、PR #2 `670ff26`、PR #3 `c3864c0` |
| 本轮收口对象 | 会话总结、项目债务草稿、一次性原子提交计划草稿 |
| 当前资产治理状态 | `.codegraph/`、`.kiro/`、百度云上传临时配置、架构图 PNG 渲染物已忽略；系统图谱已转正 |

2026-06-11 收口后，主线已具备的核心资产：

- `.github/workflows/quality-gate.yml`
- `app/playwright.config.ts`
- `app/playwright.prod.config.ts`
- `app/public/periodic-data/latest.json`
- `app/public/periodic-data/connectors.json`
- `app/public/weekly-data/latest.json`
- `app/public/weekly-data/connectors.json`
- `app/scripts/data/*`
- `app/scripts/deploy-static.sh`
- `app/scripts/smoke-prod.sh`
- `app/src/data/source-registry.ts`
- `app/src/routes/lazy-pages.tsx`
- 多组 E2E、数据、脚本测试
- 正式 `docs/workflows/`、`docs/product/`、`docs/architecture/`、`docs/knowledge/`

### 2.2 质量门

| 命令 | 当前已验证结果 |
|---|---|
| `npm run data:audit` | 通过，`issues=0` |
| `npm run test` | 通过，8 个测试文件，38 个用例 |
| `npm run lint` | 通过 |
| `npm run build` | 通过 |
| `npm audit` | 通过，0 vulnerabilities |
| `npm run test:e2e` | 通过，桌面/移动共 46 个页面守护用例 |
| `npm run test:e2e:prod` | 通过，桌面/移动共 14 个生产用例 |

[事实] `origin/main` 的 lockfile 已锁定 `react-router` 和 `react-router-dom` 为 `7.16.0`，此前依赖锁漂移和 `npm audit` 阻塞已经在主线修复。

### 2.3 产品与线上状态

| 项 | 状态 |
|---|---|
| 线上首页 | HTTP/2 200 |
| 线上半月 manifest | 存在，`period=2026-06-H1` |
| 线上兼容 weekly manifest | 存在，仅作兼容路径 |
| 数据窗口 | `2026-06-01` 至 `2026-06-15` |
| 下次计划刷新 | `2026-06-16T09:00:00+08:00` |
| 线上数据状态 | total 45，ok 10，manual-required 12，connector-required 23，issueCount 0 |

抽样路由巡检：

| 目标 | 桌面结果 | 移动结果 |
|---|---|---|
| 本地 E2E | 桌面/移动共 46 个页面守护用例通过 | 已覆盖 P0/P1/P2 页面 |
| 生产 E2E | 桌面/移动共 14 个生产用例通过 | 已覆盖宿主入口、mkt 入口、首页、数据页、AI、图库、报告与移动溢出 |

历史初始审计曾发现多处移动端横向溢出；P1/P2 页面治理中已修复并纳入 E2E 守护。

### 2.4 代码规模与形态

| 指标 | 当前本地源码 |
|---|---:|
| TypeScript / TSX 文件 | 121 |
| 源码总行数 | 22,230 |
| 路由数 | 46 |
| 静态数组定义估算 | 225 |
| 硬编码年份/日期命中估算 | 696 |

最大文件：

| 文件 | 行数 |
|---|---:|
| `app/src/pages/IndustryPage.tsx` | 1,412 |
| `app/src/pages/DataManage.tsx` | 1,182 |
| `app/src/pages/UsersPage.tsx` | 953 |
| `app/src/pages/SelfInsight.tsx` | 880 |
| `app/src/pages/HomePage.tsx` | 657 |
| `app/src/pages/ai-assistant/DesignAssistant.tsx` | 580 |

### 2.5 资产与目录状态

| 路径 | 大小/数量 |
|---|---:|
| `app/public/images` | 42MB，221 个文件 |
| `app/dist` | 52MB，已忽略 |
| `app/tmp` | 21MB，已忽略 |
| `docs` | 系统图谱已转正；剩余文档进入本轮状态收口 |
| `docx_extracted` | 11MB，已跟踪/存在于根层级 |

## 3. 债务诊断

### 3.1 已治理：P0 项目管理债务，版本基线漂移

问题：

- 初始审计时本地 `main` 落后远端 30 个提交。
- 初始审计时未跟踪 `docs/` 中包含标记为 `stable` 的文档和图谱，但未进入版本治理。
- 初始审计时本地源码缺失远端主线中的数据、部署、E2E、CI 能力。

风险：

- 若继续从旧本地 HEAD 构建部署，会回退线上功能。
- 旧本地审计结果容易误判为“系统能力缺失”，实际部分能力已在远端主线。
- 未跟踪文档与远端正式文档可能发生路径冲突。

根因：

- 缺少接手前的基线同步检查。
- 文档产物、临时产物、正式资产没有在会话结束时完成归属决策。

治理状态：

- 已通过 PR #1 合并半月刷新、页面证据口径和正式文档同步。
- 已通过 PR #2 忽略本地工具缓存和同步临时文件。
- 已通过 PR #3 将系统图谱转正。
- 剩余会话总结和项目债务草稿正在本轮收口。

### 3.2 已治理：P0 工程债务，质量门与依赖锁漂移

问题：

- 初始审计时本地 `npm audit` 失败。
- 初始审计时 `node_modules` 与 `package-lock.json` 不一致。
- 初始审计时本地 `package.json` 缺少远端主线中的 E2E、数据刷新、部署、smoke 脚本。

风险：

- CI 与本地结果不一致。
- 部署前无法信任本地依赖状态。
- 安全修复可能只存在于安装目录，不存在于可复现构建。

根因：

- 本地分支过旧。
- 曾执行过安装/修复，但未把 lockfile 与脚本状态统一到当前本地基线。

治理状态：

- 当前 lockfile 已统一到 `react-router` / `react-router-dom` `7.16.0`。
- 本地和主分支 CI 已通过 test、lint、audit、build、data audit。

### 3.3 已治理：P0 产品脆弱点债务，线上数据状态不可由本地复现

问题：

- 初始审计时线上 `/weekly-data/latest.json` 存在，但旧本地源码无法复现。
- 初始审计时旧本地构建不包含 `sourceRegistry` 和数据刷新脚本。

风险：

- 若从旧本地分支部署，会删除线上数据 manifest。
- 数据管理页、数据来源页会出现“页面承诺数据治理，但静态资产缺失”的断裂。

根因：

- 数据刷新链路在远端主线，不在本地基线。
- 生产状态依赖已部署残留，未被当前本地源码保护。

治理状态：

- 当前源码已包含 `periodic-data` 主路径和 `weekly-data` 兼容路径。
- 生产站点已发布半月 manifest，生产 E2E 14/14 通过。

### 3.4 P1 技术债务：页面模块过厚，数据与 UI 混合

问题：

- 页面组件内大量硬编码数组、日期、数据口径、来源说明。
- `IndustryPage`、`DataManage`、`UsersPage`、`SelfInsight` 等页面超过 800 行。
- 数据表结构、展示文案、治理配置和 UI 渲染混在同一个 TSX 文件中。
- 路由已使用 lazy pages，但页面内部仍保留大量静态数组和业务文案。

风险：

- 修改一项业务口径需要进入 UI 文件。
- 难以建立数据可信度测试。
- 页面扩展会持续增加首屏包与维护成本。

根因：

- 原型期为了快速成型，把产品内容、模拟数据和展示逻辑放在页面文件。
- 后续没有及时把“产品演示数据”提升为结构化数据资产。

### 3.5 P1 文档管理债务：正式文档、草稿、临时同步文件混杂

问题：

- 初始审计时 `docs/` 未跟踪，但内部文档 frontmatter 标记为 `stable`。
- 初始审计时 `docs/knowledge/.knowledge-session-summary-20260605-stable.md.baiduyun.uploading.cfg` 等临时同步文件混入文档目录。
- 当前剩余风险是历史会话总结和草稿分析需要继续校正状态，避免旧事实被当作当前事实。

风险：

- 新接手者无法判断文档是事实、计划还是历史快照。
- 执行性草稿进入正式提交会污染项目结构。
- `stable` 文档若不及时更新，会削弱文档作为协作契约的可信度。

根因：

- 文档沉淀后没有执行“归属状态 -> 版本跟踪 -> 临时产物清理”的收口流程。

### 3.6 P1 数据可信度债务：业务指标仍是静态声明主导

问题：

- 页面存在大量“实时采集”“已验证”“已审核”“OK”等强事实表达。
- 当前最新线上 manifest 明确显示 45 个来源中 23 个仍是 `connector-required`，12 个是 `manual-required`。
- 静态页面数据和 source registry 之间已经建立基础审计关系，但页面内联数据仍未完全结构化。

风险：

- 业务用户可能把样例数据当成真实决策数据。
- 合规、市场规模、竞品份额等高风险结论缺少可追溯证据链。

根因：

- 产品定位从“展示型工作台”向“证据型决策系统”迁移，但数据层和证据层还没完全接上。

### 3.7 P2 UI 与前端体验债务：移动端回归保护不足

问题：

- 本地抽样构建在多个移动路由出现横向溢出。
- `/users`、`/industry` 抽样检测不到标准 `h1/h2/[data-page-title]`，影响自动化验收稳定性。
- 大量页面重复构造侧边栏、卡片、表格、图表和导出控件。

风险：

- 页面视觉修复容易局部生效、跨页面回归。
- 自动化测试只能靠文本片段，不利于稳定验收。

根因：

- 缺少统一 PageShell、ResponsiveTable、MetricCard、EvidenceBadge 等产品级组件。
- 已同步 E2E 基线，但仍缺少更高层的页面壳、表格和证据组件抽象。

## 4. 反面论证

反面论点：如果只以线上产品为准，当前系统并非不可用。生产站点 HTTP/2 200，线上半月 manifest 存在，生产 E2E 14/14 通过，主分支 CI 也已通过质量门。

保留意见：项目协作不能只看线上。当前剩余风险已从“旧基线回退线上”转向“连接器真实接入、人工补录、页面数据结构化和持续文档收口”。这些问题不影响当前静态站点可访问，但会影响它作为决策系统的可信度。

## 5. 整合治理方案

### Phase 0：冻结错误基线（已完成）

目标：防止从旧工作区继续扩散债务。

动作：

1. 已停止从旧本地 HEAD 执行部署。
2. 已保留并分类未跟踪产物清单。
3. 已将 `.codegraph/`、`.DS_Store`、`.baiduyun.uploading.cfg` 归为临时产物，不进入正式文档。
4. 已将系统图谱转正，剩余会话总结和债务草稿进入本轮收口。

验收：

- 已明确“旧本地基线不可部署”。
- 未跟踪文档不再和正式图谱资产混淆。

### Phase 1：统一项目事实基线（已完成）

目标：让本地、远端、线上至少恢复到同一条主线。

动作：

1. 已将本地 `main` 同步到 `origin/main`。
2. 已执行依赖和质量门恢复。
3. 已执行 `npm run test`、`npm run lint`、`npm audit`、`npm run build`、`npm run data:audit`。
4. 已执行 `npm run test:e2e` 和 `npm run test:e2e:prod`。

验收：

- 本地 `git status` 只剩明确待处理文档草稿。
- `npm audit` 通过。
- `app/public/periodic-data/latest.json` 与兼容路径 `app/public/weekly-data/latest.json` 在源码层可见。
- 本地构建与生产数据状态链路一致。

### Phase 2：修复部署与质量门债务

目标：让部署路径可复现、可阻断、可追责。

动作：

1. 以 `origin/main` 的 `deploy:prod`、`smoke:prod`、Playwright 配置为基线。
2. 将移动端横向溢出检查纳入 E2E 必跑项。
3. 将 `/users`、`/industry` 加入稳定页面标题标识。
4. 禁止手动 rsync 绕过 `test -> lint -> audit -> build -> smoke`。

验收：

- 本地 E2E 覆盖桌面与移动核心路由。
- 生产 E2E 至少覆盖首页、数据页、数据来源页、报告页、重点业务页。
- 部署前后 manifest 时间戳和静态资源 hash 有记录。

### Phase 3：建立数据资产事实源

目标：把页面静态数据从“展示内容”提升为“可审计数据资产”。

动作：

1. 以 `app/src/data/source-registry.ts` 为来源事实源。
2. 将 `DataSourcePage`、`DataManage` 中的内联数据逐步迁到结构化数据模块。
3. 每个业务指标增加来源状态：`verified`、`example`、`needs-review`、`connector-required`。
4. 页面上避免使用“实时采集”“已验证”等强事实词，除非有 manifest 或 source registry 支撑。

验收：

- 页面指标能追到 source id。
- `example` 数据不会在 UI 中显示成真实事实。
- connector backlog 是产品功能的一部分，而不是文档附录。

### Phase 4：前端架构瘦身

目标：降低页面模块复杂度，提高变更局部性。

动作：

1. 保留远端主线的 lazy routes。
2. 抽出产品级布局组件：`PageShell`、`SectionHeader`、`MetricCard`、`EvidenceBadge`、`ResponsiveDataTable`。
3. 对超过 800 行页面拆出数据、配置、子视图，不先拆 UI 小碎片。
4. 图表数据先结构化，再考虑抽公共图表组件。

验收：

- 最大页面文件降到 600 行以下。
- 首页首屏主包不再加载全部业务页面。
- 静态数组数量明显下降，业务数据集中在数据目录。

### Phase 5：文档治理

目标：让文档状态可信。

动作：

1. 正式文档只放入 `docs/`，草稿放入 `drafts/`，临时同步文件放入 `tmp/` 或删除。
2. `stable` 文档必须进入 Git 跟踪，否则降级为 `draft`。
3. 建立 `docs/README.md` 或文档索引，列出当前有效文档。
4. 将 `docx_extracted/` 归类：若为原始需求证据，迁入 `archive/snapshots/` 或明确保留理由。

验收：

- `docs/` 无未跟踪临时文件。
- 文档引用的脚本和文件在当前基线真实存在。
- 每份 Markdown 都有 frontmatter，状态与目录一致。

### Phase 6：生产韧性治理

目标：减少共享 nginx 和手动静态部署带来的脆弱性。

动作：

1. 部署前固定执行远端映射检查：nginx server block、`/opt/mkt53/html`、容器挂载。
2. `deploy:prod` 只允许更新 `/opt/mkt53/html/`。
3. 每次部署记录生产 `index.html` asset hash、manifest `generatedAt`、E2E pass count。
4. 对共享 nginx 配置变更设置单独审批与 `nginx -t` 门禁。

验收：

- 部署不影响 `video`、`voc`、`report`、`shopify` 等关联服务。
- 生产数据文件不会被本地旧构建删除。
- 每次线上状态可回溯到 Git 提交。

## 6. 优先级队列

| 优先级 | 事项 | 原因 |
|---|---|---|
| 已完成 | 处理本地落后远端 30 提交 | 已同步到主线并合并 PR #1/#2/#3 |
| 已完成 | 禁止从旧本地基线部署 | 半月发布链路和生产 E2E 已验证 |
| 已完成 | 解决 lockfile 与 node_modules 漂移 | `npm audit` 已通过 |
| 已完成 | 整理未跟踪架构资产与临时文件 | 工具缓存、上传临时配置、PNG 渲染物已忽略，系统图谱已转正 |
| 已完成 | 恢复并执行质量门 | test/lint/audit/build/data audit/E2E 已统一 |
| 已完成 | 修复移动端溢出回归 | P1/P2 页面已纳入 E2E 守护 |
| P0 | 连接器真实接入 | Amazon、VOC、CRM、社媒、ERP 等 23 个来源仍为 `connector-required` |
| P0 | 人工补录和复核机制 | 12 个来源仍为 `manual-required` |
| P1 | 建立数据来源事实源 | 避免静态样例数据被误当真实业务事实 |
| P2 | 拆分超大页面和内联数据 | 降低长期维护成本 |
| P2 | 建立文档索引与状态规则 | 降低接手成本 |

## 7. 第一轮执行结果

第一轮只做基线治理，不做业务功能开发。当前结果：

1. 已备份并列出未跟踪文件。
2. 已将 `.codegraph/`、`.kiro/`、`.DS_Store`、`.baiduyun.uploading.cfg` 等临时产物归入忽略规则。
3. 已将系统图谱转为正式架构资产。
4. 已快进并合并本地 `main` 到 `origin/main` 最新状态。
5. 已执行完整质量门。
6. 已用本地和生产 E2E 复核移动端溢出、数据页、数据来源页和 P2 页面。
7. 当前第二版债务清单只保留连接器、人工补录、数据结构化、超大页面和文档持续治理。

## 8. 半月数据更新目标

### 8.1 目标定义

[计划] 将 mkt53 的数据更新节奏从“周度刷新”调整为“半月刷新”。默认执行窗口为每月 `1 日` 和 `16 日` 上午 `09:00`，时区使用 `Asia/Shanghai`。

该目标不是只改 cron 表达式，而是统一以下四个层面的节奏：

- 项目源码中的数据 manifest 命名和刷新脚本。
- 网站静态文件中的最新数据状态。
- 文档中对数据新鲜度、人工复核和连接器 backlog 的描述。
- 部署前后的 smoke、E2E 和 manifest 验证。

### 8.2 半月周期命名

历史远端主线曾使用 `week=2026-W23` 和 `public/weekly-data/latest.json`。当前已切换为 `period=2026-06-H1` 和 `public/periodic-data/latest.json`，`weekly-data` 仅作兼容路径。

建议新周期字段：

| 字段 | 示例 | 用途 |
|---|---|---|
| `periodType` | `semi-monthly` | 明确周期类型 |
| `period` | `2026-06-H1` / `2026-06-H2` | 半月周期标识 |
| `windowStart` | `2026-06-01` | 本期数据窗口开始 |
| `windowEnd` | `2026-06-15` | 本期数据窗口结束 |
| `generatedAt` | ISO 时间 | 本次生成时间 |
| `nextScheduledAt` | ISO 时间 | 下次计划更新时间 |

半月窗口规则：

- `H1`：每月 1 日至 15 日。
- `H2`：每月 16 日至月末。
- 如果任务在 1 日或 16 日失败，重跑仍写入当前半月周期，不额外制造新周期名。

### 8.3 脚本改造范围

基线已同步到 `origin/main`，本轮采用“新增半月链路 + 保留 weekly 兼容路径”的改造方式。

| 当前远端资产 | 半月改造方向 |
|---|---|
| `collect-weekly-sources.mjs` | 已新增 `refreshCadence` 参数、半月周期函数和 `collectSemiMonthlySources` wrapper |
| `refresh-weekly-data.mjs` | 已新增 `refresh-semi-monthly-data.mjs` |
| `public/weekly-data/latest.json` | 已新增 `public/periodic-data/latest.json`，前端优先读新路径 |
| `public/weekly-data/connectors.json` | 已新增 `public/periodic-data/connectors.json` |
| `tmp/data-collection/runs/<week>.json` | 已新增 `tmp/data-collection/runs/<period>.json` |
| `install-weekly-cron.sh` | 已新增 `install-semi-monthly-cron.sh` |
| `data:refresh:weekly` | 已新增 `data:refresh:semi-monthly` |
| `data:deploy:weekly` | 已新增 `data:deploy:semi-monthly` |

过渡原则：

- 第一阶段保留 weekly 命令和输出路径，半月脚本同步写入 weekly 兼容 manifest，避免历史文档和旧消费者立即断裂。
- 服务器调度不保留 weekly cron。安装半月 cron 时必须移除旧 `mkt53 weekly data refresh` 任务，避免实际频率高于半月一次。
- 第二阶段更新文档和自动化后，再废弃 weekly 命名。
- 不把受限来源从 `connector-required` 改成 `ok`，频率变化不等于数据授权完成。

### 8.4 半月更新执行链路

每次半月更新必须执行：

```bash
cd app
npm run data:audit
npm run data:refresh:semi-monthly
npm run test
npm run lint
npm audit
npm run build
npm run test:e2e
npm run deploy:prod
npm run smoke:prod
npm run test:e2e:prod
```

服务器本地自动刷新建议执行：

```bash
cd /opt/mkt53/automation/app
npm run data:publish:semi-monthly:local
```

默认 cron：

```cron
0 9 1,16 * *
```

含义：每月 1 日和 16 日 09:00，以服务器本地时区执行。服务器必须确认时区为 `Asia/Shanghai`，否则 cron 时间会漂移。

### 8.5 网站展示规则

前端数据页应展示：

- 当前周期：`2026-06-H1` 或 `2026-06-H2`。
- 数据窗口：`YYYY-MM-DD ~ YYYY-MM-DD`。
- 最近更新时间：`generatedAt`。
- 下次计划更新时间：`nextScheduledAt`。
- 来源状态分布：`ok`、`manual-required`、`connector-required`、`fetch-error`、`source-error`。
- 未完成项：连接器 backlog 和人工复核清单。

禁止展示：

- “实时更新”。
- “每周自动采集”。
- 没有 source registry 支撑的“已验证”。
- 把 `manual-required` 或 `connector-required` 包装成已采集数据。

### 8.6 验收标准

半月更新机制完成后，必须满足：

| 验收项 | 标准 |
|---|---|
| 本地基线 | 已完成，`main` 与 `origin/main` 同步 |
| 脚本 | 已完成，存在 `data:refresh:semi-monthly`、`data:deploy:semi-monthly` 和本地发布入口 |
| manifest | 已完成，`public/periodic-data/latest.json` 存在且 `periodType=semi-monthly` |
| 前端 | 已完成，数据页显示半月周期、采集窗口和下一次更新时间 |
| 质量门 | 已完成，test、lint、audit、build、data audit 通过 |
| E2E | 已完成，本地和生产核心路由通过桌面/移动检查 |
| 生产 | 已完成，`https://mkt.lute-tlz-dddd.top/periodic-data/latest.json` 返回 200 并通过生产 E2E |
| 服务器 cron | 已完成，旧 mkt53 weekly cron 已移除，新半月 cron 已安装 |
| 文档 | 已完成，新增 semi-monthly 正式工作流，weekly 文档降为兼容说明 |

### 8.7 第一轮半月化计划

1. 已完成 Phase 1：同步本地到 `origin/main`。
2. 已新增半月周期计算函数，并用测试覆盖 H1、H2 和跨月下一次计划时间。
3. 已新增 `periodic-data` 输出路径，保留 `weekly-data` 兼容输出。
4. 已让前端数据页优先读取 `periodic-data/latest.json`，失败时降级读取 legacy weekly 路径。
5. 已新增半月 cron 安装脚本和 `package.json` 命令。
6. 已更新工作流文档：从周度刷新改为半月刷新，旧周度文档标注为兼容说明。
7. 已完成本地正式联网运行、生产发布、远端 `periodic-data` 验证和服务器半月 cron 安装。

## 9. 当前不可做事项

- 不恢复旧 mkt53 weekly cron。
- 不把一次性执行草稿当作正式知识资产提交。
- 不在未完成连接器和人工补录前，把静态展示数据升级为经营事实。
- 不把 `app/tmp` 或 `.codegraph` 产物提升为正式资产。
- 不把 `connector-required` 数据包装成已采集事实。
