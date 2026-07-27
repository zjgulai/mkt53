---
title: mkt53 90 天迭代路线图执行方案
doc_type: prd
module: project
topic: roadmap-execution
status: active
created: 2026-07-23
updated: 2026-07-27
owner: product-and-engineering
source: project-review-20260722
provider_calls: false
production_writes: false
production_deploy: false
fact_promotion: false
---

# mkt53 90 天迭代路线图执行方案

## 1. 目标与完成定义

本方案把《mkt53 全项目复盘与迭代手册》中的 90 天路线图转成唯一的执行基线。目标不是继续增加静态页面，而是把 mkt53 推进为有来源、有快照、有复核、有权限、有行动回写的市场决策工作台。

90 天结束时，项目必须同时满足：

1. **可信**：核心 P0 页面中至少 80% 的业务声明绑定 source、scope、fresh snapshot 和 review decision。
2. **新鲜**：半月数据快照按时生成并通过审计的比例不低于 95%，过期 24 小时内可见告警。
3. **可治理**：来源状态的变更可授权、可审计、可撤回、可重放，前端不保存供应商密钥。
4. **可决策**：至少三类报告使用不可变快照；洞察到 action、owner、result 的谱系覆盖不低于 60%。
5. **可发布**：每次候选版本保留 test、lint、audit、build、E2E 和 data audit 的分层证据。

## 2. 当前基线与边界

### 2.1 已确认事实

| 基线 | 当前状态 | 本方案处理 |
|---|---|---|
| 前端产品 | React 19 + TypeScript + Vite，45 条业务路径 | 不扩页面数量，优先补真实能力和治理闭环 |
| 数据治理 | 53 条 source registry、107 张数据表、半月 manifest | 先消除隐式默认值，再后端化 registry/review/snapshot |
| 本地质量 | 单测、lint、build、数据审计和本地 E2E 已有门禁 | 增加 schema、bundle budget 和 release evidence 门禁 |
| 生产入口 | P0-05 已独立授权激活，统一门户与 manifest 门禁生产 E2E 8/8 | 保留完整回滚备份与 auth-gated 回归 |
| 安全依赖 | 2026-07-27 回归到 14 high，现已完成 Router 8、ESLint 10、PostCSS 与传递链兼容升级并恢复 0 vulnerabilities | 由永久版本/旧导入合同防止回流 |
| 数据新鲜度 | 复盘时生产 manifest 已过期 | 本地/生产/cron/上游四层分别验证，不混写结论 |
| 业务连接器 | Amazon、CRM、VOC、ERP 等多数仍是 readiness 或授权快照 | 未授权前只做合同、模板、dry-run 和 owner intake |

### 2.2 本轮授权边界

- 可以：本地代码、测试、文档、lockfile、静态审计、dry-run、Graphify 更新。
- 不可以自动扩大到：生产部署、nginx 修改、远端文件写入、真实连接器调用、provider/model 调用、业务事实晋升。
- 生产只读验证只能证明当时的线上状态，不能证明已完成生产修复。

## 3. 执行模型

### 3.1 工作流

每个任务固定经过：`Ready → In progress → Local verified → Review required → Release authorized → Production verified → Done`。

例外状态：

- `Blocked-owner`：缺业务 owner、字段定义、样本或人工结论。
- `Blocked-auth`：缺生产、连接器或 provider 的明确授权。
- `Rejected`：范围或证据不满足合同，保留拒绝原因，不静默降级。

### 3.2 证据层级

| 层级 | 可证明 | 不可证明 |
|---|---|---|
| L0 计划/草案 | 范围、合同、TODO 已定义 | 功能已实现 |
| L1 本地验证 | 代码、fixture、审计和本地 UI 满足合同 | 生产状态或真实业务数据 |
| L2 dry-run/候选 | 工作流可执行且副作用受控 | 真实采集成功或可作为业务事实 |
| L3 生产只读 | 指定时间点线上行为和快照可读取 | 生产写入、长期 SLA 或 owner 批准 |
| L4 授权 live | 指定授权窗口内的真实调用或写入 | 自动等同于事实晋升 |
| L5 人工发布复核 | owner 对 scope、hash、window 和结论作出决定 | 免除后续撤回与审计 |

### 3.3 Definition of Done

一个任务只有在以下条件全部满足时才可标记 Done：

- 需求合同、禁止解释和验收指标明确；
- 正向、负向和权限/撤回路径有测试或人工证据；
- 代码、数据、文档和 Graphify 同步；
- 没有把 demo、fixture、dry-run、readiness 写成 live/production；
- 若有外部副作用，授权、执行窗口、回滚和生产验证证据齐全。

## 4. 90 天分阶段方案

### Phase 0 — Day 0–15：可信基线与发布门禁

目标：先消除会让后续建设建立在错误状态上的安全、新鲜度和治理问题。

| ID | TODO | Owner | 依赖/权限 | 验收 | 状态 |
|---|---|---|---|---|---|
| P0-01 | 将全部 source registry 治理字段改为显式合同 | 数据治理 + 前端 | 本地 | 53/53 显式声明 7 个治理字段；无运行时推断；回归测试通过 | **Done · L1** |
| P0-02 | 修复依赖 high advisories | 工程 | 本地 lockfile | `npm audit` 为 0 high；test/lint/build/E2E 无回归 | **Done · L1；14 high → 0 vulnerabilities；Router 8 / ESLint 10 完整回归通过** |
| P0-03 | 建立 route bundle budget | 前端 | P0-01 后可并行 | DataManage 主 route <120 KB 或有书面例外；超限使 CI 失败 | **Done · L1；DataManage 与 charts 临时例外均已退出** |
| P0-04 | 核对并恢复半月 manifest/cron 新鲜度 | 数据运营 | 已取得本次范围内生产写入授权 | local、production、cron、upstream 四类状态分开；最新周期未过期 | **Production recovered · L4；first scheduled observation pending** |
| P0-05 | 恢复 nginx 统一门户和 manifest 保护契约 | 运维 + 安全 | 生产写入授权 + 真实授权会话 | 未授权 manifest 返回预期 302；授权会话可访问；生产 E2E 8/8；有备份/回滚 | **Done · L4 authorized production write + real-session verified** |
| P0-06 | 固化候选质量门 | 工程 | P0-01/02/03 | test、lint、audit、build、local E2E、data audit 证据一键汇总 | **Done · L1** |
| OPS-KEY | 统一生产 SSH key 路径合同 | 工程 + 运维 | 本地 | deploy/smoke 共用解析器；默认与实际 key 一致；可显式覆盖；私钥不入库 | **Done · L1** |

Phase 0 退出条件：`P0-01/02/03/06 Done`，`P0-04/05` 要么生产验证 Done，要么由 owner 明确接受风险和延期窗口；不得用本地通过替代生产门禁。

### Phase 1 — Day 16–30：身份、Registry 与 Review 后端骨架

目标：只迁移最小治理闭环，不先搬运所有业务数据。

| ID | TODO | Owner | 关键输出 | 验收 | 状态 |
|---|---|---|---|---|---|
| BE-01 | 决策并记录后端部署形态 | 架构 + 运维 | ADR：runtime、数据库、备份、密钥、SLO、成本 | 有可逆选择和退出方案；开发/生产配置隔离 | **Done · L0 accepted ADR** |
| BE-02 | 建立身份与 RBAC | 后端 + 安全 | `viewer / analyst / reviewer / admin` 权限矩阵 | 未授权写入 401/403；前端 bundle 无密钥 | **Done · L1 local skeleton；production identity activation pending** |
| BE-03 | 建立 `source_registry` API | 后端 + 数据治理 | 版本化来源合同、ETag/幂等键 | 创建、更新、撤回可审计；并发冲突不静默覆盖 | **Done · L1 local API；production/static seed pending** |
| BE-04 | 建立 snapshot metadata | 后端 + 数据工程 | snapshot id、window、row count、hash、schema version | 快照不可变；重复导入幂等；hash 可复算 | **Done · L1 local metadata；real artifact importer pending** |
| BE-05 | 建立 review 状态机 | 后端 + 数据治理 | review log 与合法状态迁移 | approve/reject/withdraw 有 actor、reason、time；非法跳转被拒绝 | **Done · L1 local state machine；production activation pending** |
| BE-06 | 迁移数据来源管理页 | 前端 + 后端 | API adapter、loading/error/empty/offline 状态 | 页面不再依赖静态写入；读取失败不回退成“已验证” | **Done · L1 local adapter；production static canonical** |
| BE-07 | 审计与恢复演练 | QA + 运维 | 备份、恢复、撤回、重放证据 | 恢复演练通过；RPO/RTO 被记录 | **Done · L2 isolated fixture；production backup pending** |

最小数据模型：

- `sources`：身份、类型、隐私、采集方式、claim scope、owner。
- `snapshots`：来源、窗口、schema、row count、hash、artifact URI、freshness。
- `reviews`：snapshot/source、decision、reason、reviewer、created_at、withdrawn_at。
- `claims`：页面/报告声明与 source/snapshot 的多对多绑定。
- `audit_events`：actor、action、before/after、request id、idempotency key。

### Phase 2 — Day 31–60：P0 数据闭环

目标：按“一个数据域完成后再扩下一个”的顺序，停止同时制造多个半成品。

| 顺序 | ID | 数据域 | 最小闭环 | 业务验收 | 状态 |
|---|---|---|---|---|---|
| 1 | DATA-REG | 法规 SKU 矩阵 | 官方法规 → 适用范围 → SKU 决策 → 法务复核 | 每条 SKU 结论有法规条款、scope、reviewer；不自动给法律结论 | Contract + intake + synthetic projection + review handoff gate ready L2；0/6 real inputs；0 official snapshot / reviewed decision / publishable fact |
| 2 | DATA-AMZ | Amazon 竞品 SKU | marketplace/ASIN 映射 → 只读快照 → hash → review | 价格/评分/评论数/BSR 均带站点、窗口、样本与禁止外推边界 | Blocked-owner/auth |
| 3 | DATA-CRM | CRM/RFM | 脱敏快照 → RFM 口径 → 分群 → owner review | PII 不入前端；分群可复算；删除/撤回可传播 | Blocked-owner/auth |
| 4 | DATA-VOC | VOC corpus/NLP | 样本 manifest → 模型 run → 人工抽检 → 发布 | corpus 来源/窗口/语言可追溯；评估集、模型版本、一致率齐全 | Blocked-owner/auth |

每个数据域必须交付同一套八件套：数据合同、字段字典、授权记录、快照、hash、质量报告、review decision、页面 disclosure。缺任何一件，不从 gated 状态晋升为事实。

### Phase 3 — Day 61–90：报告、AI 与行动反馈

目标：把洞察从“可看”推进为“可引用、可行动、可复盘”。

| ID | TODO | Owner | 验收 | 状态 |
|---|---|---|---|---|
| DEC-01 | 报告绑定不可变 snapshot | 报告产品 + 后端 | 至少月度市场、竞品、VOC 三类报告；每个 claim 可追溯 | Pending |
| DEC-02 | 报告人工复核与撤回 | 数据治理 + 业务 owner | 发布/拒绝/撤回均有原因；撤回后 UI 和导出同步 | Pending |
| DEC-03 | AI 服务端 proxy | AI 工程 + 安全 | 100% 请求有 request id、dataset/model/prompt version、cost、status | Blocked-provider/auth |
| DEC-04 | AI 评估与人工门禁 | AI 工程 + reviewer | 进入报告/决策的 AI 输出 100% 人工复核 | Pending |
| DEC-05 | Insight → Action lineage | 产品 + 后端 | action 有 source claim、owner、due date、result；覆盖 ≥60% | Pending |
| DEC-06 | 90 天发布复盘 | 产品 + QA | KPI、风险、剩余债务和下一季决策形成可审计报告 | Pending |

## 5. 产品模块迭代映射

| 产品域 | 本阶段主任务 | 后续能力 | 成功信号 |
|---|---|---|---|
| 首页/全局导航 | 统一 freshness、evidence、action 状态 | 个性化角色首页 | 用户无需进入详情即可识别数据周期和阻塞 |
| 看市场 | TAM/SAM/SOM 与内部经营 proxy 分层 | 海关、ERP、品类趋势快照 | 不再混用公开 TAM、内部 numerator 和平台份额 |
| 看竞争 | Amazon SKU/ASIN 只读快照 | 价格、评论、BSR 时序和新品预警 | 任一竞品数字可定位到 marketplace + snapshot |
| 看用户 | CRM/RFM、访谈授权、样本合同 | cohort、LTV、审美实验 | 分群可复算，隐私和撤回可传播 |
| 看行业 | 法规 SKU 矩阵、公开资讯条目证据 | 合规预警、供应链、IP review | 法规语境与产品级法律结论严格分离 |
| AI 助手/图库 | 维持 gated，先建 proxy 与审计 | RAG、NLP、图像生成评估 | 进入决策的输出都有 trace + human review |
| 报告中心 | snapshot/claim/review 绑定 | 自动草拟、差异报告、撤回 | 报告可重跑、可拒绝、可追溯 |
| 数据管理/数据源 | 先完成显式 schema，再迁移后端 | lineage、质量 SLA、owner queue | 隐式默认值为 0，状态变更 100% 可审计 |

## 6. 责任与审批

| 角色 | 主要责任 | 不可替代的审批 |
|---|---|---|
| Product Owner | 优先级、范围、成功指标 | 业务范围和延期风险接受 |
| Tech Lead | 架构、接口、质量门、发布候选 | 技术 DoD 和回滚可行性 |
| Data Governance | source/snapshot/claim/review 合同 | 证据等级和事实晋升规则 |
| Data Owner | 字段定义、窗口、样本、业务解释 | 私有快照和口径正确性 |
| Security/Legal | 密钥、隐私、条款、法规边界 | 连接器、PII、法律结论和外部发布 |
| Reviewer | 接受、拒绝、撤回具体证据 | L5 人工发布决定 |
| Ops/QA | 部署、监控、回滚、生产验证 | 生产变更窗口与验收证据 |

## 7. 风险与控制

| 风险 | 控制 | 触发停止条件 |
|---|---|---|
| 把 readiness 当真实数据 | 页面显式 gate + schema test + manual review | 缺 snapshot/hash/window/review 任一项 |
| 后端范围膨胀 | Phase 1 只迁移 registry/review/snapshot | 出现一次性搬运所有页面数据的方案 |
| 生产与本地证据混写 | 每个结果标 evidence layer | 未做生产验证却声称 production fixed |
| 连接器泄密或越权 | 服务端 secret、只读 scope、授权窗口 | 凭据进入仓库/前端或 scope 不明确 |
| 隐私与撤回失效 | 脱敏、最小字段、withdraw propagation | PII 无用途/保留期或撤回无法传播 |
| 性能回退 | route budget + E2E + bundle report | 预算超限且无批准例外 |
| 文档与代码漂移 | 同批更新执行看板、测试和 Graphify | 任务状态无验证命令/证据 |

## 8. 执行看板（2026-07-23）

### Batch 01 — Source governance explicit contract

- [x] 使用 Graphify 查询路线图、source registry、manifest 和 review 依赖。
- [x] 核对历史 Loop 0–9，确认其作为历史证据而非当前执行看板。
- [x] 新增失败测试，确认 53 条来源中 31 条至少缺一个治理字段；其中 19 条依赖主要治理字段默认值。
- [x] 补齐 53/53 的 `privacyLevel`、`collectionMethod`、`evidenceGrade`、`canDisplayAsFact`、`blockingReason`、`evidenceArtifactPath`、`claimScope`。
- [x] 将 TypeScript 接口由可选字段收紧为必填字段，并删除 DataSourcePage 的运行时推断。
- [x] 运行 source registry 测试、全量测试、lint、build、data audit、deep audit。
- [x] 更新复盘 HTML 和 Graphify，记录实际完成证据（2,974 nodes / 4,598 edges / 237 communities）。

Batch 01 本地验收：

| 验证 | 结果 |
|---|---|
| Source schema | 53/53 显式；31 条不完整记录归零；19 条主要默认值归零 |
| Vitest | 8 files / 100 tests passed |
| Data consistency | 43 pages / 107 tables / 53 sources / 0 issues |
| Deep audit | 888 claims / 0 high-risk / 0 unsupported |
| TypeScript + Vite | 2,323 modules；build passed |
| ESLint | passed |
| Local E2E | desktop + mobile，138/138 passed |
| Production | 未验证、未变更 |

### Batch 02 — Dependency security remediation

- [x] 用本地依赖树和 GitHub Reviewed advisory 复核影响范围。
- [x] 将传递依赖 `brace-expansion` 从 1.1.15/2.1.1 升级到修复版本 1.1.16/2.1.2。
- [x] `npm audit`：0 vulnerabilities。
- [x] 修复后复跑 100 tests、lint、build 和 138 local E2E。
- [x] 未改直接依赖范围，未部署生产。

### Batch 03 — Bundle budget and release evidence gate

- [x] 新增 `scripts/quality/bundle-budgets.json`，对所有构建 JS chunk 使用未压缩字节预算。
- [x] 普通 route/app chunk 默认上限为 120 KiB；`vendor-react` 固定上限为 220 KiB。
- [x] `DataManage` 239,136 bytes 与 `vendor-charts` 361,616 bytes 以书面临时例外进入门禁；owner 为 frontend，2026-08-15 到期。
- [x] 新增正向、超限、例外过期、必需 chunk 缺失与发布证据边界测试。
- [x] 将 bundle gate 接入 CI、标准部署、周静态发布和半月静态发布；半月链路在质量失败时跳过静态发布。
- [x] 新增 `npm run quality:release-evidence`，一次执行 unit、lint、dependency audit、build、bundle、两层 data audit 和 local E2E。
- [x] 生成 `app/tmp/release-evidence/latest.json`：8/8 checks passed，`localCandidateReady=true`；原始输出只保留 hash/字节/行数与安全计数。
- [x] 证据边界明确为 `L1-local`；production deploy/verify/write、provider call、restricted connector call 全为 false。
- [x] CI 使用单一证据命令并保留 14 天 artifact；本地未部署、未推送、未写生产。

Batch 03 本地验收：

| 验证 | 结果 |
|---|---|
| Bundle assets | 60；58 within target；2 temporary exceptions；0 failures |
| DataManage | 233.53 KiB；临时上限 256 KiB；到期 2026-08-15 |
| vendor-charts | 353.14 KiB；临时上限 380 KiB；到期 2026-08-15 |
| Release checks | 8/8 passed；0 failed；0 skipped |
| Vitest | 10 files / 114 tests passed |
| Data consistency | 43 pages / 107 tables / 53 sources / 0 issues |
| Deep audit | 888 claims / 0 high-risk / 0 unsupported |
| Local E2E | 138/138 passed |
| Production | 未验证、未变更 |

> 历史基线说明：上表保留 Batch 03 建门禁时的原始测量。Batch 21 已将 DataManage 主块降至 35.80 KiB；Batch 22 又把 `vendor-charts` 353.19 KiB 聚合块拆为 149.52 KiB 共享核心和 route-aware 图表族。当前为 77 assets / 77 pass / 0 temporary exception / 0 failures。

### Batch 04 — P0-04 production-readonly freshness audit

- [x] 使用 Graphify 定位 `refresh-semi-monthly-data.mjs`、`collect-weekly-sources.mjs`、`usePeriodicManifest()`、cron installer 与历史 Loop2 证据。
- [x] 本地 manifest：`period=2026-07-H1`、窗口 7 月 1–15 日、`nextScheduledAt=2026-07-16 09:00 +08:00`；相对 7 月 23 日应为 `2026-07-H2`，判定 stale。
- [x] 生产 HTTP：6 个 periodic/weekly JSON 均为 200、可解析且 SHA-256 与本地逐字节一致；不是浏览器缓存误判，生产同样 stale。
- [x] 生产主机：Asia/Shanghai、NTP synchronized、cron service active；ubuntu/root/system cron、systemd timers 和 7 月 cron journal 均无 mkt53 调度记录。
- [x] 自动化副本：`/opt/mkt53/automation/app` 仍为 `2026-06-H1`；最后 run artifact 为 6 月 11 日，无半月刷新日志。
- [x] 历史 weekly log：6 月 8 日在当时的 React Router 2 high `npm audit` 处停止，未进入 build/publish；在 Batch 04 审计时本地依赖已修复，但生产 cron 仍未安装。
- [x] 上游边界：41 个任务仍为 28 connector-readiness、9 manual-evidence、4 public-source-review；只读审计不能证明受限上游数据当前新鲜。
- [x] 生产静态 smoke 通过；portal/manifest 合同 E2E 为 2/8，6 项失败属于 P0-05 现状证据，本批未修改 nginx。
- [x] 记录密钥路径漂移：文档默认 `ai_video.pem` 不存在；只读连接使用项目内 0600 `DDDD.pem`，未读取或输出私钥内容。
- [x] 生成机器可读证据 `docs/reviews/mkt53-project-review-20260722/evidence/p0-04-production-readonly-20260723.json`。
- [x] 未执行 refresh、cron install、rsync、nginx 修改、部署、provider 或受限连接器调用。

Batch 04 分类结论：

| 层 | 状态 | 结论 |
|---|---|---|
| Local manifest | stale | H1，预期 H2 |
| Production manifest | stale | 与本地 H1 SHA 完全一致 |
| Cron | stale / missing | 服务 active，但无 mkt53 job/timer/journal |
| Upstream sources | unknown-gated | readiness/manual/public-review 队列不等于当前数据快照 |
| P0-04 | audit complete / acceptance failed | 恢复动作仍需生产写入授权 |
| P0-05 | observed failed / no write | production E2E 2/8，不在本批修复 |

### Batch 05 — Production SSH key contract

- [x] 盘点运行时代码、当前文档、历史总结和草案中的 `ai_video.pem` / `DDDD.pem` 引用。
- [x] 新增 `app/scripts/lib/ssh-key-contract.sh`，让 deploy 与 auth-protected smoke 共用同一解析和 fail-closed 检查。
- [x] 默认使用仓库根目录 `DDDD.pem`；支持 `MKT53_SSH_KEY_PATH` 显式绝对路径，旧 `KEY_PATH` 仅保留兼容。
- [x] 更新 README、AGENTS 和当前静态部署工作流；历史只读证据 JSON 保持不可变。
- [x] 验证 shell 语法与 default/primary/legacy 三种解析路径；脚本测试 78/78、全量 Vitest 111/111、release evidence 8/8、local E2E 138/138。
- [x] Graphify AST 增量、4 条显式 Shell 调用边和全社区重聚类完成：3,021 nodes / 4,669 edges / 238 communities；图健康检查无 dangling、missing、self-loop 或 collapsed edge。
- [x] 私钥内容未读取、未复制、未提交；未建立 SSH 连接、未部署、未写生产。

### Batch 06 — P0-04 isolated recovery candidate

- [x] 新增 `data:recovery:semi-monthly:candidate`，固定 no-network 与公开证据 dry-run，仅写 `tmp/data-collection/recovery-candidates/<period>/`。
- [x] 生成 `2026-07-H2` 候选：窗口 7 月 16–31 日，下次调度 `2026-08-01 09:00 +08:00`。
- [x] 候选预检 6/6：43 pages、107 tables、53 sources、0 issues；periodic/weekly 候选逐字节一致。
- [x] 公开证据 39 条均为 planned；networkCalls=0、businessDataWrites=0；28 个 connector-required 与 9 个 manual-required 保持 gated。
- [x] `install-semi-monthly-cron.sh --print` 改为真正零目录写入，并把目标 cron 保存到候选，未修改 crontab。
- [x] canonical `public/periodic-data/*` 与 `public/weekly-data/*` 未被改写；未联网、未调用 provider/真实连接器、未部署、未写生产。
- [x] 发布结论仍为 `blocked-auth`；L2 候选不等于生产新鲜度恢复。
- [x] 全量 release evidence 8/8：Vitest 10 files / 114 tests、lint、0 vulnerabilities、2,323 modules build、bundle 60/58/2/0、data audit 0 issues、deep audit 0 high-risk/unsupported、local E2E 138/138。
- [x] Graphify 同步完成：3,052 nodes / 4,726 edges / 241 communities；候选构建器到 cron installer 的两跳调用关系可查询，multigraph integrity defects 为 0。

### Batch 07 — P0-04 authorized production recovery

- [x] 授权范围仅含 P0-04 automation 同步/校验、H2 静态数据备份与发布、半月 cron 安装及生产核对；排除 P0-05、nginx 写入/重启、应用 bundle、provider、受限连接器、事实提升和 git commit/push。
- [x] 生产预检确认主机时间、NTP、磁盘、目录权限、nginx volume、Node/npm 与恢复前 H1/缺 cron 状态。
- [x] 创建 `/opt/mkt53/backups/p0-04/20260723T152641+0800/` 回滚包，包含生产 periodic/weekly、原 crontab 与 automation source；权限和 SHA-256 已复核。
- [x] automation 首次 staging gate 在写生产前 fail closed：114 项中 5 项依赖被 gitignore 的 `tmp/audits` fixtures；生产 HTML 与 cron 均未写。
- [x] 将空人工证据输入移入 `tests/fixtures`，阻断校验在测试临时目录生成；本地 release evidence 8/8、114/114 tests、138/138 local E2E、lint、audit、build 全部通过。
- [x] 第二次服务器 staging gate 通过：114/114 tests、lint、0 vulnerabilities、2,323 modules、bundle pass、data audit 0 issues、run-report gate pass。
- [x] 原子发布 5 个 periodic 与 5 个 weekly 文件，`latest.json` 最后切换；HTTPS 10/10 SHA-256 与候选一致，periodic/weekly parity 成立，Vite `index.html` 未改变。
- [x] 安装唯一 `0 9 1,16 * *` mkt53 cron，cron service active/enabled，无关 job 保留；下一次计划运行是 `2026-08-01T09:00:00+08:00`。
- [x] `nginx -t` 与 production smoke 通过；生产 E2E 仍为 2/8，6 项失败全部属于未授权的 P0-05，未修改或重启 nginx。
- [x] 机器可读证据：`docs/reviews/mkt53-project-review-20260722/evidence/p0-04-production-recovery-20260723.json`。
- [x] Graphify 更新完成：3,060 nodes / 4,733 edges / 241 communities；multigraph integrity defects 为 0。
- [ ] 首次 cron 时间窗观察：8 月 1 日 09:00 后验证 `semi-monthly-refresh.log`、run-report gate、生产推进到 `2026-08-H1`，以及 periodic/weekly 哈希一致。

### Batch 08 — P0-05 portal-gate isolated candidate

- [x] 恢复 Playwright 1.60.0 对应 Chromium 148 / revision 1223；仅写本机浏览器缓存，不改仓库依赖或生产。
- [x] 新鲜生产只读 E2E 为 2/8：桌面/移动 landing 通过；root、deep routes、manifest 的桌面/移动 6 项门禁失败。
- [x] 生产 root、`/market/trend` 与 periodic manifest 均为 HTTP 200；H2 manifest 内容正常，但未受门户保护。
- [x] 只读冻结远端合同：nginx config SHA `fa36f3…93eff`、mkt block SHA `4f78ab…06342`、compose SHA `77ec0c…c239`；当前 block 只有 `try_files`，无 `auth_request`。
- [x] 新增 `app/configs/nginx/mkt53-portal-gate.candidate.conf`，复用 portal auth 子请求，将未授权请求 302 到 apex login，并将授权响应设为 `private, no-store`。
- [x] 新增本地双容器验证器：mock portal auth + nginx 1.29.8；验证 syntax、未授权 root/deep/manifest 302、合成授权 root/manifest 200、内部 auth 404、缓存策略。
- [x] 首次隔离验证因 macOS awk 响应头大小写假设 fail closed；修复为 `tolower($1)` 后通过，生产写入始终为 false。
- [x] 候选单测 3/3；临时容器和网络残留均为 0。
- [x] 首轮完整 release evidence 在当日新增的 React Router moderate advisories 处 7/8 fail closed；将直接依赖升级到 7.18.1 后 audit 恢复 0。
- [x] 最终 release evidence 8/8：11 files / 117 tests、lint、audit 0、2,323 modules、bundle 60/58/2/0、data audit 0 issues、deep audit 0 high-risk/unsupported、local E2E 138/138。
- [x] 机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/p0-05-nginx-candidate-20260724.json`。
- [x] Graphify 更新完成：3,088 nodes / 4,760 edges / 243 communities；P0-05 validator/candidate/test 已入图，multigraph integrity defects 为 0。
- [x] 真实授权会话正向验收与生产激活已在 Batch 09 完成；L2 合成会话没有被用作生产证据。

### Batch 09 — P0-05 production activation preflight

- [x] 用户已授权 P0-05 nginx 生产激活；授权尚未消费，未扩大到应用部署、P0-04、provider/connector 或 Git 操作。
- [x] Graphify DFS 映射 candidate validator、portal redirect E2E、SSH contract、deploy/smoke 与 manifest 验收链路。
- [x] 本地隔离候选复验通过，candidate SHA 仍为 `f33342…d696`，临时容器与网络残留为 0。
- [x] 生产只读冻结值未漂移：full config `fa36f3…93eff`、mkt block `4f78ab…06342`、compose `77ec0c…c239`；`nginx -t` 通过，nginx 与 portal-auth 均运行且 portal-auth healthy。
- [x] 核对真实 session 合同：cookie `lute_portal_session` 的 Domain 为 `.lute-tlz-dddd.top`，具备跨 apex/mkt 子域传递条件；有效 token 对 `/portal/auth` 返回 204，无效 token 返回 401。
- [x] 新鲜生产 E2E 仍为 2/8，5 个 root/deep/manifest 端点仍为 HTTP 200 且 public cache，证明生产门禁尚未激活。
- [x] 唯一可控浏览器落到超级管理员登录页；未读取账号、密码、cookie 或浏览器存储。
- [x] Fail closed：由于没有可立即执行正向验收的真实登录态，没有创建生产备份、没有写 nginx、没有 reload/restart。
- [x] 机器可读证据：`docs/reviews/mkt53-project-review-20260722/evidence/p0-05-production-activation-preflight-20260724.json`。
- [x] 用户完成真实登录后，full backup → complete `nginx -t` → mkt-only activation → nginx reload → negative/positive acceptance → E2E 8/8 全部通过；回滚未触发。
- [x] 完整旧配置 root-only 备份保留在 `/opt/ai-video/deploy/lighthouse/nginx.conf.p0-05-backup-20260724T012911Z`，SHA `fa36f3…93eff`。
- [x] 激活后 full config SHA `f466cf…cf2e`、mkt block SHA `6c02b5…5544`；compose SHA 未改变，nginx startedAt 未改变。
- [x] 未授权 root、deep、periodic/weekly manifest 共 5 项均 302 且 `private, no-store`，内部 auth 直访 404。
- [x] 真实会话首页与 `/#/data` 正向通过，H2 可见、无水平溢出或浏览器 error；production E2E 8/8，auth-gated smoke 通过。
- [x] 机器可读证据：`docs/reviews/mkt53-project-review-20260722/evidence/p0-05-production-activation-20260724.json`。
- [x] Graphify 更新完成：3,104 nodes / 4,773 edges / 252 communities；生产激活结果已写入 graph memory，随后完成全社区重聚类。

### Batch 10 — BE-01 backend deployment-shape ADR

- [x] 选择 Phase 1 可逆形态：静态前端保持不变；同机独立 `mkt53_backend` Compose；共享 nginx 通过专用 `mkt53_edge` 网络反代同源 `/api/v1/`；PostgreSQL 只在 internal `mkt53_data` 网络可见。
- [x] 固定 runtime 与数据边界：Python 3.12 + FastAPI + SQLAlchemy 2 + Pydantic 2；首批只做 identity/RBAC、source registry、snapshot metadata、review 和 audit，不激活 connector/provider/report worker。
- [x] 固定配置与密钥边界：test/dev/prod 分离；生产 secret 只用 root-only 文件或云密钥管理，API/DB 无 host/public port，production 遇到 dev identity/default secret 必须 fail closed。
- [x] 固定恢复合同：每日逻辑备份、加密离机副本、季度隔离恢复演练；初始 RPO ≤24h、RTO ≤4h；前端 `static → shadow → api`，BE-06 前 static 保持 canonical。
- [x] 固定初始 SLO 与成本护栏：availability 99.5%、read p95 <500ms、write p95 <1s、5xx <1%；增量预算阈值 ≤¥100/月（内部决策护栏，不是云报价）。
- [x] 明确退出条件：同机形态命中容量、SLO、恢复或合规阈值时，先迁移托管/独立 PostgreSQL，再迁 API；同源 API 合同保持不变。
- [x] 明确 BE-02 硬前置：portal auth 必须提供可验证 subject/role；nginx 清除客户端同名头并注入可信身份。仅有 204/401 session gate 不能推导 RBAC。
- [x] ADR：`docs/architecture/adr-be-01-backend-deployment-shape-20260724.md`；独立架构图：`docs/architecture/mkt53-backend-deployment-shape-be-01-20260724.html`。
- [x] Graphify 更新完成：3,132 nodes / 4,799 edges / 253 communities；duplicate node、missing endpoint、self-loop 均为 0。34 个 JSON/config 源文件仍为 zero-AST-node 可见性限制，未把它们误写成已入图。
- [x] 本批为 L0 accepted design：未新增后端代码、未修改 compose/nginx、未创建数据库/密钥、未部署生产、未调用 provider/connector、未执行 git stage/commit/push。

### Batch 11 — BE-02 identity and RBAC local skeleton

- [x] 在 `backend/` 建立 Python 3.12 / FastAPI / SQLAlchemy / Pydantic Settings / Alembic 骨架；`uv.lock` 与容器 `requirements.lock` 均已冻结。
- [x] 实现 internal live/ready、authenticated health、portal identity fixture、`viewer / analyst / reviewer / admin` 权限映射与零副作用 write authorization probe。
- [x] production 配置 fail closed：拒绝 debug、dev identity、fixture/default secret 和不安全 CORS；生产关闭 OpenAPI/docs。
- [x] 建立独立 Compose：PostgreSQL 17 只在 internal data network，API 位于 edge+data；API/DB 零 host/public port，secret 只读文件挂载且不进入环境变量。
- [x] 显式 Alembic `0001_be02_baseline` 在 API 前运行；baseline 不创建领域表，BE-03 才拥有 `sources` 首个 schema。
- [x] 新鲜质量门通过：36 tests、95.81% branch coverage、Ruff、lock、Compose config 与 zero-published-port 均通过。
- [x] 一次性隔离 Compose 联调通过：migration head；live/ready 200；missing/wrong identity 401；viewer write 403；reviewer write 200 且 `side_effects=false`。
- [x] 本批创建的容器、两个网络和测试 volume 已清理为 0；没有影响其他 Docker 项目。
- [x] 实现说明：`docs/architecture/be-02-identity-rbac-local-skeleton-20260724.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/be-02-identity-rbac-local-skeleton-20260724.json`。
- [x] Graphify 更新完成：3,269 nodes / 5,068 edges / 259 communities；BE-02 API、RBAC、readiness 与迁移节点已入图，duplicate node / missing endpoint / self-loop 均为 0。
- [x] 证据边界为 L1 local validation：未修改生产 compose/nginx/network/database/secret，未部署后端，未调用 provider/connector，未写业务数据，未执行 git stage/commit/push。

### Batch 12 — BE-03 source registry local API

- [x] 新增 Alembic `0002_be03_source_registry`：`sources`、`audit_events`、`idempotency_records` 三表及治理枚举/版本/唯一约束。
- [x] 新增 `/api/v1/sources` 读、创建、更新、撤回与 audit API；reviewer/admin 获得独立 `source:write`，viewer/analyst 写入继续 fail closed。
- [x] 写入合同要求 `Idempotency-Key`；PATCH/withdraw 同时要求强 ETag `If-Match`。缺失 precondition 为 428、陈旧版本为 412、换 payload 复用 key 为 409。
- [x] SQLAlchemy `version_id_col` 防止竞态静默覆盖；业务状态、audit 与 idempotency record 同事务提交。
- [x] 撤回只变更 lifecycle，不物理删除；audit 在 ORM 层拒绝 update/delete，PostgreSQL 另以 trigger 执行数据库级防改。
- [x] 新鲜质量门通过：43 tests、93.74% branch coverage、Ruff、lock、Compose config 与 zero-published-port 均通过。
- [x] 一次性 PostgreSQL 17 联调通过：revision current，version `1 → 2 → 3`，陈旧写 412，幂等重放成功，audit 顺序为 create/update/withdraw，直接 UPDATE audit 被 trigger 拒绝。
- [x] 隔离项目 `mkt53_be03_local_20260724` 的容器、两个网络和测试 volume 已全部清理；未影响其他 Docker 项目。
- [x] Graphify 更新完成：3,395 nodes / 5,419 edges / 261 communities；missing/dangling endpoint、self-loop、exact duplicate/collapsed edge 均为 0。36 个 JSON/config 源文件仍为 zero-AST-node 可见性限制。
- [x] 未 seed 现有 53 条静态 registry，未切换 `/#/data-source`，未修改生产 nginx/Compose/数据库/密钥，未调用 provider/connector，未执行 git stage/commit/push。
- [x] 实现说明：`docs/architecture/be-03-source-registry-local-api-20260724.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/be-03-source-registry-local-api-20260724.json`。

### Batch 13 — BE-04 immutable snapshot metadata local API

- [x] 新增 Alembic `0003_be04_snapshot_metadata` 与 `snapshots` 表：source 外键、window、row count、artifact URI/size/SHA-256、schema version/SHA-256、采集/导入时间和导入主体。
- [x] 服务端实现 `mkt53.snapshot-metadata.v1` canonical JSON 与可独立复算的 `metadataSha256`；snapshot ETag 绑定 id + metadata hash。
- [x] 新增 snapshot list/get/create/audit API；reviewer/admin 获得 `snapshot:write`，analyst 只读，viewer/analyst 写入 fail closed；没有 PATCH/PUT/DELETE。
- [x] 精确重复 metadata 使用原 key 时重放原始 201，使用新 key 时返回既有 snapshot 200；两种情况均不生成重复 snapshot/audit。id 或 source+artifact+schema 冲突返回显式 409。
- [x] snapshot 在 ORM 层拒绝 update/delete；PostgreSQL `snapshots_immutable` trigger 拒绝直接 UPDATE/DELETE。withdrawn source 禁止新增 snapshot。
- [x] `idempotency_records.operation` 扩为 256，消除长 source/snapshot id 对 operation 字段的截断风险。
- [x] 新鲜质量门通过：48 tests、92.25% branch coverage、Ruff、lock、Compose config 与 zero-published-port 均通过。
- [x] 一次性 PostgreSQL 17 联调通过：revision current，source/snapshot/snapshot-audit 为 1/1/1，metadata hash 独立复算一致，重复导入 201/200，PATCH 405，直接 UPDATE 被 trigger 拒绝。
- [x] 隔离项目 `mkt53_be04_local_20260724` 的容器、两个网络和测试 volume 已全部清理；未影响其他 Docker 项目。
- [x] Graphify 更新完成：3,481 nodes / 5,645 edges / 266 communities；missing/dangling endpoint、self-loop、exact duplicate/collapsed edge 均为 0。38 个 JSON/config 源文件仍为 zero-AST-node 可见性限制。
- [x] 本批只使用本地 fixture bytes；未上传/读取真实 artifact，未 seed 53 条静态 registry，未切换前端，未修改生产 nginx/Compose/数据库/密钥，未调用 provider/connector，未执行 git stage/commit/push。
- [x] 实现说明：`docs/architecture/be-04-snapshot-metadata-local-api-20260724.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/be-04-snapshot-metadata-local-api-20260724.json`。

### Batch 14 — BE-05 local review state machine

- [x] 新增 Alembic `0004_be05_review_state_machine`、`review_subjects` current-state 投影与 `review_events` append-only 日志；source/snapshot 创建时在同一事务原子打开 `pending` review。
- [x] 固定合法迁移：`pending → approved/rejected/withdrawn`、`approved/rejected → withdrawn`，`withdrawn` 为终态；非法跳转返回 409。
- [x] source 元数据更新会在同一事务把已决定 review 自动重开为 pending；source 生命周期撤回会同步 review withdrawn，避免旧 approval 覆盖新版本内容。
- [x] 新增 review list/get/transition/events API；analyst/reviewer/admin 可读，reviewer/admin 可写，viewer 与 analyst 写入 fail closed。
- [x] transition 强制 `If-Match` + `Idempotency-Key`；stale ETag 返回 412，精确重放返回原响应且不新增 event，复用 key 提交不同 payload 返回 409。
- [x] 每条 open/approve/reject/withdraw event 均记录 actor、reason、request id、idempotency key 与 occurredAt；ORM 与 PostgreSQL trigger 都拒绝 review event update/delete。
- [x] 迁移 downgrade→upgrade 回放验证既有 source/snapshot 会确定性回填为 pending v1，并带显式 `system:migration:0004` 事件。
- [x] 新鲜质量门通过：56 tests、92.60% branch coverage、Ruff、lock、Compose config 与 zero-published-port 均通过。
- [x] 一次性 PostgreSQL 17 联调通过：revision current，source/snapshot/review 为 1/1/2；正常决策/联动 event=7，approve/reject/withdraw、source update→pending、source lifecycle withdraw→review withdrawn、幂等重放、非法跳转 409 与数据库 append-only trigger 均通过。
- [x] 隔离项目 `mkt53_be05_local_20260724` 的容器、两个网络和测试 volume 已全部清理；未影响其他 Docker 项目。
- [x] Graphify 更新完成：3,581 nodes / 5,959 edges / 275 communities；missing/dangling endpoint、self-loop、exact duplicate/collapsed edge 均为 0。39 个 JSON/config 源文件仍为 zero-AST-node 可见性限制。
- [x] 本批未 seed 53 条静态 registry，未上传/读取真实 artifact，未审批真实业务事实，未切换前端，未修改生产 nginx/Compose/数据库/密钥，未调用 provider/connector，未执行 git stage/commit/push。
- [x] 实现说明：`docs/architecture/be-05-review-state-machine-local-api-20260724.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/be-05-review-state-machine-local-api-20260724.json`。

### Batch 15 — BE-06 local data-source API adapter

- [x] 新增来源 registry 双模式合同：development 默认 static，可显式请求 api；production 无条件强制 static，API 环境变量误配也不能切换线上读取。
- [x] 新增同源只读 `/api/v1/sources` adapter；分页、BE-03 camelCase response、active lifecycle、duplicate id、enum 与完整 envelope 都 fail closed 校验。
- [x] 浏览器只发送 `Accept`、same-origin credentials 和 no-store；没有 trusted proxy token、portal subject 或 role header。
- [x] API 模式无静态 fallback；loading、empty、offline、HTTP/network error、invalid-response 时来源列表为空，来源统计保持未知。
- [x] `DataSourcePage` 只在 ready 时显示来源统计、筛选和表格；API 未 ready 时来源总数/verified 固定为 `-`，API ready 后也不混入静态 manifest 的 53/16。
- [x] 新增 adapter/hook/status/page 测试；132 Vitest 全部通过，BE-06 定向 15/15，lint、0 vulnerabilities、build、bundle budget、data audit 0 issue 均通过。
- [x] 本地 API 浏览器四态 success/empty/error/offline 全部通过；失败态没有 53 条 fallback。生产反误配构建显示 static 53 且 `/api/v1/sources` 请求数为 0。
- [x] `/data-source` desktop/mobile core + data-quality E2E 4/4 通过；修复 Chrome 自动请求缺失 favicon 导致的全站 console 404。
- [x] 全量 138 E2E 未宣称通过：bundled Chromium 缺失；改用本机 Chrome 后全量截图扫描在 26/138 无失败时因 networkidle 速度异常主动停止。
- [x] Graphify code-only update + cluster-only 完成：3,645 nodes / 6,072 edges / 277 communities；missing/dangling、self-loop、duplicate/collapsed edge 均为 0；40 个 JSON/config 文件为 zero-AST 可见性限制。
- [x] 本批未 seed 静态 53 条到后端，未启用生产 API，未修改生产 nginx/Compose/数据库/密钥，未调用 provider/connector，未部署，未执行 git stage/commit/push。
- [x] 实现说明：`docs/architecture/be-06-data-source-api-adapter-20260724.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/be-06-data-source-api-adapter-20260724.json`。

### Batch 16 — BE-07 isolated audit and recovery drill

- [x] 新增 fail-closed 演练入口：只接受 test、Compose `postgres`、`mkt53` fixture role 和 `mkt53_be07_source/restore` 白名单数据库；远程 Docker endpoint 直接拒绝。
- [x] 演练覆盖两张 isolated internal 网络、零 host port、唯一 Compose project/volume；未复用常规 dev/production 数据库。
- [x] 用合成 source/snapshot/review 生成 PostgreSQL custom logical archive；最终 archive 26,163 bytes、mode 0600、SHA-256 `c91d99…e263`，dump `0.449105s`。
- [x] 恢复库 Alembic revision 为 `0004_be05_review_state_machine`；六表规范化基线指纹 `2f6523…bde3` 与备份前完全一致。
- [x] 恢复后的 source/snapshot create 与两个 approve 共 4 项精确重放全部命中幂等记录，重放前后表计数不变。
- [x] 备份后和恢复库内均完成 source 撤回 + 精确重放；audit 保持 `create → withdraw`，review 保持 `pending → approved → withdrawn`，各只新增一条事件。
- [x] PostgreSQL 直接 UPDATE/DELETE `audit_events`、`review_events`、`snapshots` 共 6/6 被 trigger 拒绝；失败前后逻辑指纹一致。
- [x] 最终实测 RPO `0.816373s / 24h`、RTO `3.006525s / 4h`，均通过；定义和本地 fixture 限制已写入报告。
- [x] 完整质量门通过：62 tests、92.73% coverage、lock、Ruff、Compose 与恢复演练；仅保留一条 upstream TestClient deprecation warning。
- [x] 演练容器、两个网络和 volume 残留均为 0；本地 fixture archive/report 保留在 gitignored `tmp/backend-recovery/be07/`。
- [x] Graphify 增量更新与 cluster-only 完成：3,712 nodes / 6,212 edges / 299 communities；duplicate node、missing endpoint、self-loop、exact duplicate/collapsed edge 均为 0；41 个 JSON/config 文件仍为 zero-AST 可见性限制。
- [x] 本批未读取或写入生产数据库，未安装生产备份/cron，未修改生产 nginx/Compose/密钥，未部署、未调用 provider/connector、未执行 git stage/commit/push。
- [x] 实现说明：`docs/architecture/be-07-audit-recovery-drill-20260724.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/be-07-audit-recovery-drill-20260724.json`。

### Batch 17 — DATA-REG contract-only discovery

- [x] 盘点法规详情/区域政策页、`ds-016`、CPSC/eFiling、EU MDR registry 条目，以及 BE-03/04/05 source、snapshot、review 治理链路。
- [x] 新增 `mkt53.regulation-sku-matrix.v1` JSON Schema，覆盖 official source、SKU scope、applicability、legal decision、snapshot/hash、review event、publication/withdrawal 和 disclosure count。
- [x] 新增 1 条纯合成 fixture；官方 URL/hash、registry id、snapshot、reviewer 和 review decision 全部为空，状态固定为 `unknown + legal-review-required`。
- [x] 新增 fail-closed 校验器和 npm 质量门；拒绝合成事实提升、缺官方证据的决定、缺复核字段的 approved/rejected、withdrawn 继续发布和 disclosure 自报计数漂移。
- [x] 法规详情页新增合同披露面板，只显示字段链路与 `0 官方快照 / 0 已复核 SKU 决策 / 0 可发布合规结论`，不导入 fixture、不新增网络请求。
- [x] DATA-REG 定向 9/9、全量 141/141、lint、0 vulnerabilities、build、bundle budget、data audit 0 issue、deep audit 0 high/medium/unsupported claim 均通过。
- [x] Graphify 更新与 cluster-only 完成：3,927 nodes / 6,451 edges / 314 communities；duplicate node、missing endpoint、self-loop、exact duplicate/same-endpoint extra edge 均为 0。
- [x] 本批未联网采集/验证法规、未评估真实 SKU、未生成法律结论、未调用 provider/connector、未写生产、未部署、未执行 git stage/commit/push。
- [x] 实现说明：`docs/architecture/data-reg-contract-only-discovery-20260724.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/data-reg-contract-only-discovery-20260724.json`。

### Batch 18 — DATA-REG source-and-legal intake readiness packet

- [x] 新增 `mkt53.regulation-source-legal-intake.v1` schema 和可填写空模板，覆盖官方来源范围、SKU owner、法务 reviewer/SLA、证据交接、撤回治理与提交确认六组输入。
- [x] 空模板实测为 contract-valid + `blocked-required-input`：`0/6` 输入组就绪、32 个字段缺失；本地 blocked 状态被视为正确门禁，不伪装成 readiness 完成。
- [x] 合成 6/6 packet 仅能得到 `synthetic-shape-valid-not-authorized`；fixture source/SKU id、`TEST-ONLY` 范围和 `.invalid` host 不能提升为真实输入。
- [x] owner-submitted packet 只允许从 gitignored `app/configs/private/` 读取，并限制到 DATA-REG source allowlist；仓库内、未知 source id 或伪装成 owner 输入的 fixture 标记均拒绝。
- [x] password/secret/token/cookie/private-key 类字段、弱化 disclosure、过期授权、非法 SLA、缺撤回传播面均 fail closed。
- [x] 即使 owner packet 6/6 完整，也只能进入 `ready-for-independent-authorization-review`；采集、真实 SKU 评估、发布、生产写入四项授权始终为 false。
- [x] 法规详情页新增六组 readiness disclosure：`0/6`、授权采集 0、真实 SKU 评估 0、可发布结论 0；不读取 private packet、不新增网络请求。
- [x] DATA-REG 组合定向 17/17、全量 149/149、lint、0 vulnerabilities、build、bundle budget、data audit 0 issue、deep audit 0 high/medium/unsupported claim 均通过。
- [x] Graphify 更新与 cluster-only 完成：4,222 nodes / 6,793 edges / 331 communities；duplicate node、missing endpoint、self-loop、exact duplicate/same-endpoint extra edge 均为 0。
- [x] 本批未联网采集法规、未创建真实 private packet、未评估真实 SKU、未生成法律结论、未写生产、未部署、未执行 git stage/commit/push。
- [x] 实现说明：`docs/architecture/data-reg-source-legal-intake-readiness-20260724.md`；填写说明：`docs/templates/data-reg-source-legal-intake-readiness-packet.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/data-reg-source-legal-intake-readiness-20260724.json`。

### Batch 19 — DATA-REG synthetic intake-to-draft projection rehearsal

- [x] 新增只接受完整 `synthetic-readiness-fixture` 的 deterministic projector；空模板、owner input 或不完整 packet 均拒绝投影。
- [x] `SKU × target market × claim scope` 生成稳定 record id；matrix 固定为 `unknown + legal-review-required`，官方 source/snapshot/reviewer/review event 全部为空。
- [x] 建立 request、source scope、planned snapshot store、planned review store 与 withdrawal event 的跨合同 lineage；计划引用没有被写成已发生证据。
- [x] canonical input、operation 与 matrix 分别计算 SHA-256；相同输入重复执行输出逐字节一致，活动 artifact SHA-256 均为 `e4c640…f9e21`。
- [x] withdrawal event 纳入 operation key；合法撤回返回 `blocked-withdrawn + 0 records`，request 不匹配、无 audit 或传播面不完整 fail closed。
- [x] CLI 默认 stdout，`--write` 只允许 `app/tmp/` 内文件；`public/` 与其他目录在创建前拒绝；实测落盘 mode 0600。
- [x] Batch 定向 8/8、DATA-REG 组合 21/21、全量 157/157、lint、0 vulnerabilities、build、bundle budget、data audit 0 issue、deep audit 0 high-risk 均通过。
- [x] Graphify 更新与全社区重聚类完成：4,255 nodes / 6,853 edges / 328 communities；duplicate node、missing/dangling endpoint、self-loop、exact duplicate/same-endpoint extra edge 均为 0；48 个 JSON/config 源文件为 zero-AST 可见性限制。
- [x] 本批未联网、未调用 provider/connector、未采集法规、未评估真实 SKU、未生成法律结论、未写 `public/`/生产、未部署、未执行 git stage/commit/push。
- [x] 实现说明：`docs/architecture/data-reg-synthetic-intake-draft-projection-20260724.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/data-reg-synthetic-intake-draft-projection-20260724.json`。

### Batch 20 — DATA-REG synthetic draft-to-review handoff gate

- [x] 新增 `mkt53.regulation-review-handoff-prerequisites.v1` schema、空模板和完整合成 shape fixture；额外字段、敏感字段与 disclosure 弱化全部 fail closed。
- [x] projection id、前置条件与 target state 绑定 deterministic operation hash；活动草稿生成 1 个本地 pending candidate，相同输入两次输出 SHA-256 均为 `420500…06f8f`。
- [x] candidate 明确不是后端 review subject：`backendEntityType=null`、`backendSubjectCreated=false`、`backendPersisted=false`、`reviewEventId=null`、`legalDecision=null`。
- [x] 空前置条件与完整合成形状的 approve/reject 均返回 `blocked-review-transition`；合成字段完整不等于官方字节已核验或 reviewer 已独立授权。
- [x] projection matrix hash、DATA-REG matrix 合同、空 snapshot/review lineage 与 `unknown + legal-review-required` 逐层复核；伪造 snapshot/review id 或篡改 hash 会阻断。
- [x] 已撤回 projection 返回 `blocked-projection-withdrawn + 0 candidate`；withdraw target 被引导回 Batch 19 的 withdrawal contract。
- [x] CLI 默认 stdout，`--write` 只允许 `app/tmp/` 内文件；5 份演练产物实测 mode 0600；network/provider/connector/backend API/snapshot/review/public/production writes 均为 0。
- [x] Batch 定向 12/12、DATA-REG 组合 33/33、全量 169/169、lint、0 vulnerabilities、build、bundle budget、data audit 0 issue、deep audit 0 high-risk 均通过。
- [x] Graphify 增量与全社区重聚类完成：4,405 nodes / 7,043 edges / 343 communities；duplicate node、missing/dangling endpoint、self-loop、exact duplicate/same-endpoint extra edge 均为 0；51 个 JSON/config 源文件为 zero-AST 可见性限制。
- [x] 本批未采集法规、未评估真实 SKU、未生成 approve/reject 或法律结论、未写 `public/`/生产、未部署、未执行 git stage/commit/push。
- [x] 实现说明：`docs/architecture/data-reg-synthetic-draft-review-handoff-gate-20260724.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/data-reg-synthetic-draft-review-handoff-gate-20260724.json`。

### Batch 21 — P0-03 DataManage temporary bundle exception retirement

- [x] 将 2,487 行的 `DataManage.tsx` 拆为 641 行 route shell、领域模型、核心目录、ERP 目录和治理/血缘模块；保持 `mkt → comp → user → ind → self → erp → ai` 顺序与 107 表不变。
- [x] 将 `OperationsManual` 改为 tab 触发的 lazy chunk；桌面 `1440×900` 与移动 `390×844` 均确认初始不请求、点击后请求，且无水平溢出和 console error。
- [x] Vite 为 core catalog、ERP catalog 与 governance 生成稳定命名 chunk；五个 DataManage 相关 chunk 分别为 35.80、55.37、89.25、38.27、26.25 KiB，全部受普通 120 KiB 规则约束。
- [x] DataManage 主块由 239,136 bytes 降至 36,656 bytes，减少 84.67%，并从 `bundle-budgets.json` 删除 256 KiB 临时例外；当前仅保留 `vendor-charts` 例外。
- [x] 扩展 `project-analysis.mjs` 重建拆分目录顺序，扩展 deep audit 扫描 `src/features` 并映射回 DataManage；首次暴露的 19 条跨文件 source ID unsupported 回归已通过文件内可解析常量修复。
- [x] 新增目录/治理一致性、lazy manual、例外退出与 deep-audit 覆盖合同测试；定向 91/91、全量 174/174、lint、0 vulnerabilities、build 和 bundle budget 均通过。
- [x] 数据一致性保持 43 pages / 107 tables / 53 sources / 107 governance / 0 issues；deep audit 为 888 claims / 0 high / 0 medium / 0 unsupported / 26 source gaps。
- [x] 最终 bundle 为 64 assets / 63 pass / 1 temporary exception / 0 failures；`vendor-charts` 当前 353.19 KiB，仍须在 2026-08-15 前单独退出。
- [x] Graphify 更新与全社区重聚类完成：4,421 nodes / 7,077 edges / 351 communities；duplicate node、missing/dangling endpoint、self-loop、exact duplicate/same-endpoint extra edge 均为 0；51 个 JSON/config 源文件为 zero-AST 可见性限制。
- [x] 本批未联网、未调用 provider/connector、未写 `public/`/生产、未部署、未执行 git stage/commit/push。
- [x] 实现与使用手册：`docs/architecture/p0-03-datamanage-bundle-exception-retirement-20260724.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/p0-03-datamanage-bundle-exception-retirement-20260724.json`。

### Batch 22 — P0-03 vendor-charts temporary bundle exception retirement

- [x] 通过 Graphify 查询 `manualChunks()`、`evaluateBundleAssets()`、Recharts、lazy routes 与图表页面使用面；保存可复用架构查询并刷新 lessons。
- [x] 删除将全部 Recharts/D3/lodash 强制聚合到 `vendor-charts` 的逻辑；仅把共享 `CartesianChart.js` 固定为 `vendor-chart-core`，其余模块交还 Vite 按 route/family 自动拆分。
- [x] 原 `vendor-charts` 为 361,668 bytes / 353.19 KiB；当前共享核心为 153,109 bytes / 149.52 KiB，减少 57.67%，并形成 YAxis、RadarChart、BarChart、PieChart、ScatterChart、Line 等独立块。
- [x] 从 `bundle-budgets.json` 删除 2026-08-15 到期的最后一个临时例外；新增 required、无 exception 的永久 180 KiB shared-core 规则。最终 77 assets / 77 pass / 0 exception / 0 failure。
- [x] 新增永久预算边界、配置零 exception、禁止 `vendor-charts` 重新聚合的单元合同；定向 94/94、全量 176/176、lint、build、两层数据审计均通过。
- [x] 新增六个代表性图表 route 的 E2E；系统 Chrome desktop/mobile 共 12/12 通过，图表可见、0 console/page error、0 horizontal overflow。
- [x] 新鲜 `npm audit` 返回 14 high / 0 critical，涉及 React Router、PostCSS、ESLint/typescript-eslint 与传递链；由于包含 major upgrade 候选，本批未混入依赖升级，整体 release candidate 保持 blocked。
- [x] Graphify 更新与全社区重聚类完成：4,442 nodes / 7,095 edges / 344 communities；duplicate node、missing/dangling endpoint、self-loop、exact duplicate/same-endpoint extra edge 均为 0；52 个 JSON/config 源文件为 zero-AST 可见性限制。
- [x] 本批除 npm registry 安全审计外没有业务联网；未调用 provider/connector，未写 `public/`/生产，未部署，未执行 git stage/commit/push。
- [x] 实现与使用手册：`docs/architecture/p0-03-vendor-charts-bundle-exception-retirement-20260727.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/p0-03-vendor-charts-bundle-exception-retirement-20260727.json`。

### Batch 23 — P0-02 dependency security refresh

- [x] 将 React/ReactDOM 从 19.2.3 升至 19.2.8、React Router 从 7.18.1 升至 8.3.0；删除 `react-router-dom`，20 个应用/测试文件统一改用 `react-router`。
- [x] 在 `package.json` 固化 Node `>=22.22.0`；该下限与 Router v8 官方运行时合同一致，并由安全合同测试保护。
- [x] 将 ESLint 升至 10.8.0、`@eslint/js` 升至 10.0.1、TypeScript-ESLint 升至 8.65.0、PostCSS 升至 8.5.23；React Hooks/Refresh plugins 同步升级到声明支持 ESLint 10 的版本。
- [x] 没有关闭 ESLint 10 新规则：`useIsMobile()` 改为惰性初值；Carousel 移除 effect 内同步 state 更新，并补齐 `reInit` listener cleanup。
- [x] 新增永久依赖安全合同：固定 Node/React/Router/lint/PostCSS 最低版本，禁止 `react-router-dom` package 与 `src/`/`tests/` 导入回流。
- [x] 安装审计和独立 `npm audit` 均为 0 vulnerabilities；依赖树完整，无顶层 unmet peer。
- [x] 正式串行单测 23 files / 179 tests、lint、2,383-module build、77/77 bundle、43/107/53 数据一致性、888 claims deep audit 全部通过。
- [x] 新增 `MKT53_E2E_BROWSER_CHANNEL` 本地浏览器选择合同；系统 Chrome desktop/mobile 150/150 全量 E2E 通过，覆盖 46 路由、核心页面与数据来源护栏。
- [x] Graphify 查询保存、25 条 useful memory 反思、增量更新与全社区重聚类完成：4,488 nodes / 7,137 edges / 341 communities；missing/dangling endpoint、self-loop、exact duplicate/same-endpoint extra edge 均为 0；54 个 JSON/config 源文件为 zero-AST 可见性限制。
- [x] 本批联网仅限 npm registry 与官方文档；未采集业务数据、未调用 provider/connector、未写 `public/`/生产、未部署、未执行 git stage/commit/push。
- [x] 实现与使用手册：`docs/architecture/p0-02-dependency-security-refresh-20260727.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/p0-02-dependency-security-refresh-20260727.json`。

### Batch 24 — P0 local release review and atomic commit plan

- [x] 复原 2026-07-22 任务起点和当前分支：起点工作树 clean；复审基线为 46 个 tracked modified、161 个 untracked candidate、0 staged，全部可追溯到 Graphify、全项目复盘和 Batch 01–23 连续执行链。
- [x] 高置信敏感信息模式未命中私钥、AWS/GitHub/OpenAI/Slack token；`DDDD.pem`、真实 secrets、依赖、构建、coverage、恢复和 Graphify 临时状态继续保持 ignored。
- [x] `codex-review` 完成本地 uncommitted review，结果为 `clean: no accepted/actionable findings reported`；人工复审没有发现新增代码正确性或安全性阻断。
- [x] 后端 `quality-be07.sh` 通过：62 tests、92.73% coverage；L2 fixture-only 恢复的 baseline fingerprint、撤回精确重放和 append-only 拒绝均通过，RPO 4.838633s、RTO 12.869051s，容器/网络/卷残留 0。
- [x] 前端 fresh release evidence 8/8：179 unit、lint、audit 0、2,383-module build、77/77 bundle、43/107/53 数据一致性、888 claims deep audit、Chrome desktop/mobile E2E 150/150；最终聚合 E2E 用时 1,403,478ms。第一次诊断中被终止的 worker 结果没有被当作成功证据。
- [x] 将 207 个基线候选文件拆为 8 个原子 concern：DataManage/bundle、source governance、BE-01–07、DATA-REG、ops、dependency、Graphify、docs；跨批次混合文件必须 patch-stage，禁止 `git add -A`。
- [x] 发现两个 Git handoff 硬前置：为 BE-03–07 增加 backend CI job；Commit 1–6 后重建 Graphify，使报告 HEAD 与新 HEAD 一致。
- [x] `ds-015` / `ds-018` 的持久化 URL/证据路径和 1 条 TestClient 迁移 warning 记录为非阻断债务，不伪装为已补齐。
- [x] 本批未执行 stage、commit、push、deploy，未写生产/数据库/nginx/cron，未调用 provider/connector。方案与使用手册：`docs/reviews/mkt53-project-review-20260722/p0-local-release-review-20260727.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/p0-local-release-review-20260727.json`。

### Batch 25 — P0 backend CI quality gate

- [x] 在 `.github/workflows/quality-gate.yml` 增加独立并行 `backend` job；工作流顶层权限收敛为 `contents: read`，不接收 production environment 或业务 secret。
- [x] 固定 Python `3.12.13`、uv `0.11.11` 与 `astral-sh/setup-uv` 完整提交 SHA；按 `backend/uv.lock` 缓存并执行 `uv sync --frozen`。
- [x] CI 执行现有 `./scripts/quality-be07.sh`，完整覆盖 lock 新鲜度、Ruff、pytest/coverage、普通/恢复 Compose、fixture backup/restore、幂等重放、撤回与 append-only。
- [x] `if: always()` 保留 `report.json` / `cleanup.json` 14 天；缺失 artifact 只告警，确保不会覆盖更早的真实门禁失败。
- [x] 新增 2 项永久 workflow 合同测试，固定最小权限、运行时、命令和 artifact，并禁止 SSH、rsync、deploy、cron、半月刷新或直接 Compose 启动回流。
- [x] 聚焦合同 2/2 通过；完整后端门禁 64/64、92.73% coverage 通过；恢复演练 fingerprint、withdrawal replay、append-only、RPO/RTO 均通过，容器/网络/卷残留 `0/0/0`。
- [x] 演练证据保持 `productionDatabaseRead=false`、`productionDatabaseWrite=false`、`providerOrConnectorCalls=0`；本地通过不冒充 GitHub-hosted runner 已绿或后端已生产部署。
- [x] `BACKEND-CI` 工作树硬前置已关闭；`GRAPHIFY-HEAD` 仍必须在 Commit 1–6 后按新 HEAD 再生成，patch-stage/local commit、push、deploy 继续分别等待授权。
- [x] 设计与使用手册：`docs/architecture/p0-backend-ci-quality-gate-20260727.md`；机器证据：`docs/reviews/mkt53-project-review-20260722/evidence/p0-backend-ci-quality-gate-20260727.json`。

### Batch 26 — local atomic commits, review fixes, and handoff

- [x] 按精确 concern 完成 9 个本地实现/图谱提交；本文档与总复盘作为第 10 个 docs 提交交付。未使用 `git add -A`，每批均执行 staged diff、whitespace 和高置信 secret scan。
- [x] 全分支 `codex review` 复现 5 项真实问题：法规 official-source 可接受伪权威 URL/不安全路径/无效日期；两类 owner 问卷可用删行伪装完整；海关适配器会把上游实际网络/写入计数硬编码为 0；生产 smoke 会接受未授权 200。
- [x] 新增 fail-closed 修复与 3 项回归测试：法规 URL 按 registry-specific host allowlist、日期与路径校验；public manual evidence 固定 17 字段；owner intake 必须匹配 release gate 的 question count、owner lane 与 source scope。
- [x] `smoke-prod.sh` 现在要求所有未授权探测均为 apex login 302；200 或错误 redirect 直接失败。该变化只修改本地发布合同，没有访问生产。
- [x] 最终 release evidence 8/8：23 files / 182 unit、lint、audit 0、2,383-module build、77/77 bundle、43 pages / 107 tables / 53 sources / 0 issues、888 claims / 0 high-risk / 0 unsupported、Chrome 150/150。
- [x] BE-07 64/64、92.73% coverage；隔离恢复 RPO 1.246062s、RTO 4.695664s，containers/networks/volumes 残留 0，production DB read/write=false，provider/connector calls=0。
- [x] Graphify 更新为 4,546 nodes / 7,204 edges / 346 communities；missing/dangling endpoint、self-loop、exact duplicate/collapsed edge 均为 0；报告绑定代码修复提交 `d3fb8c4b`。
- [x] 修复提交的定向 `codex review --commit d3fb8c4` 因本机 Codex 外部用量额度耗尽被中断；本批只声明初次审查问题已复现和修复，不声明二次自动审查 clean。
- [x] 完整交付：`docs/reviews/mkt53-project-review-20260722/p0-local-atomic-commits-20260727.md`、机器证据 JSON 与更新后的自包含 HTML。
- [x] 边界保持：未 push、未建 PR、未部署、未写生产/数据库/nginx/cron，未调用 provider/connector。

### Batch 27 — GitHub CI, targeted review fixes, and draft PR handoff

- [x] 已将 `codex/mkt53-release-candidate-20260630` 推送至 GitHub，并创建 open/draft PR [#32](https://github.com/zjgulai/mkt53/pull/32)；base=`main`，没有 merge 或 deploy。
- [x] 首次 GitHub-hosted run `30256791125` 的 app/backend 均通过，同时捕获 backend cache glob 错配：工作目录已是 `backend/`，`backend/uv.lock` 被解析为不存在的 `backend/backend/uv.lock`。
- [x] 定向 review 复现并修复三组新增 fail-closed 缺口：不可能日历日期、`required_question_count=1junk` 数字前缀、`ds-016` 权威 host 错配；同时修复 uv cache glob 并增加 workflow 合同测试。
- [x] 修复提交 `6674e0f` 的 GitHub-hosted run `30257673802` 通过：app 8/8、23 files / 183 unit、audit 0、2,383 modules、77/77 bundle、43/107/53、888 claims、Chrome 150/150；backend 64/64、92.73% coverage。
- [x] GitHub backend L2 恢复演练通过：RPO 0.426246s、RTO 1.938102s，containers/networks/volumes=`0/0/0`，production DB/config/deploy=false，provider/connector calls=0。
- [x] 修复 run 的 app/backend annotations 为 `0/0`；初始 cache warning 已关闭。
- [x] Graphify 更新为 4,556 nodes / 7,215 edges / 344 communities；missing/dangling endpoint、self-loop、exact duplicate/collapsed edge 均为 0。
- [x] `codex review --commit 6674e0f` 完成 diff、官方 setup-uv 规则、边界用例和 88+2 聚焦测试检查，未发出新的 actionable finding；随后出现三层同命令自递归并被有界终止，因此不声明 clean review。
- [x] 交付：`docs/reviews/mkt53-project-review-20260722/p0-github-ci-review-closeout-20260727.md` 与机器证据 JSON。
- [x] 边界保持：push/PR=true；merge/deploy/production/database/nginx/cron/provider/connector write=false。

### Next decision batch

1. `P0-04 observation`：等待 2026-08-01 09:00 首次 cron 时间窗，再核对运行日志、run-report、H1 周期和双路径哈希；这是时间窗待观察，不需要提前重复写生产。
2. `PR decision`：草稿 PR #32、GitHub-hosted app/backend CI 与修复提交已关闭当前交接门；下一门是人工 review 和明确 merge 决策。merge 不自动授权 deploy。
3. `DATA-REG real intake`：只有六组 owner/source/SKU/legal/evidence/withdrawal 真实输入与独立授权齐备后，才允许设计 official snapshot importer 和真实 review handoff；当前不继续用合成 fixture 模拟业务完成。
4. `Review retry`：若合并门仍要求 Codex clean 信号，先解决或规避 CLI 自递归，再对最终 HEAD 运行一次有界 review；当前不把“未发出新 finding”写成 completed/clean。

### 需要额外授权或业务输入的队列

- `P0-04 observation`：2026-08-01 09:00 后进行只读运行证据核对；当前不是授权阻塞。
- `Git handoff`：push、草稿 PR 和 GitHub-hosted CI 已关闭；人工 review、merge 与 deploy 仍是独立门，任一授权不向后传递。
- `DATA-REG real intake`：仍缺六组真实 owner/source/SKU/legal/evidence/withdrawal 输入和独立授权；当前 `0/6`，不得启动 live collection。
- `DATA-AMZ/DATA-CRM/DATA-VOC`：连接器、只读快照、owner 字段合同与合规审批。
- `DEC-03`：AI/provider 调用、成本和内容审核策略。

## 9. 每周节奏与汇报模板

- 周一：更新 P0 backlog、owner、依赖和本周可完成验收。
- 周三：只汇报新增证据、风险变化和需要决策的问题。
- 周五：关闭已验收任务；未通过的任务回到具体阻塞状态，不使用模糊“完成度”。
- 半月：核对 manifest、source tasks、snapshot freshness、review backlog 和 release evidence。

周报只保留五项：`本周完成`、`验证证据`、`仍然阻塞`、`下周 TODO`、`需要谁在何时做什么决定`。
