---
title: mkt53 Loop Engineering 目标与执行计划
doc_type: analysis
module: project
topic: loop-engineering-execution-plan
status: draft
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
provider_calls: false
production_writes: false
production_deploy: false
restricted_connector_access: false
fact_promotion: false
---

# mkt53 Loop Engineering 目标与执行计划

## 0. 证据基线与边界

### 0.1 本轮输入

**事实**

- 项目规则来自 `AGENTS.md`；本轮未发现 `.codex/context-pack.md` 或 `.codex/session-thread.md`。
- 当前工作区已有未提交变更与未跟踪文件，本轮不切分支、不重置、不覆盖既有业务代码。
- Loop Engineering 五大组件按 Addy Osmani 的定义映射为：`Automations`、`Worktrees`、`Skills`、`Plugins/Connectors`、`Sub-agents`。
- mkt53 当前核心产品方向不是继续堆页面，而是把市场、竞品、用户、行业、AI、报告和数据源治理推进到可复核、可导入、可生成报告的经营智能闭环。

**本轮本地验证**

| 验证项 | 命令 | 结果 |
|---|---|---|
| 数据一致性审计 | `node scripts/data/audit-consistency.mjs --json` | `pageCount=43`、`tableCount=107`、`sourceRegistryCount=53`、`issueCount=0`、`criticalIssueCount=0` |
| 深度证据审计 | `node scripts/data/audit-deep.mjs --summary-json --no-write` | `claimCount=670`、`sourceGapCount=26`、`highRiskClaimCount=0`、`unsupportedClaimCount=0` |
| source gap 优先级 | `node scripts/data/prioritize-source-gaps.mjs --json --no-write` | `totalGaps=26`，其中 `P0=11`、`P1=11`、`P2=4`；`connector-required=23`、`manual-required=3` |
| P0 readiness 覆盖 | `node scripts/data/build-source-gap-readiness-coverage.mjs --json --no-write` | `P0 sourceGapCount=11`、`coveredSourceGapCount=11`、`uncoveredSourceIds=[]` |
| 半月 manifest 状态 | 读取 `app/public/periodic-data/latest.json` | 本地仍为 `period=2026-06-H1`、`generatedAt=2026-06-14T05:06:31.080Z`、`nextScheduledAt=2026-06-16T09:00:00+08:00`、`totals={total:45, ok:10, manual-required:12, connector-required:23}` |

**边界**

- 本轮未执行 `deploy:*`、`data:deploy:*`、`data:publish:*`。
- 本轮未执行 `data:public-evidence:live`，未启动公开网页 live capture。
- 本轮未调用 Amazon、CRM、ERP、VOC、YouTube、社媒、Import Genius 等受限连接器。
- 本轮未写生产数据、未生产部署、未做事实晋升。

### 0.2 当前核心矛盾

**事实**：本地审计已把高风险事实错误压到 `0`，但仍保留 `26` 个 source gap，其中 `23` 个依赖连接器或授权快照。

**推断**：mkt53 下一阶段最大瓶颈不是前端页面完成度，而是从“证据治理框架可用”跨到“业务 owner 可持续补证、连接器可控接入、报告输出可追溯”。

**不确定项**：生产站点当前 manifest 是否已由 cron 刷到更新周期，本轮未做生产只读核验，不能下结论。

## 1. 完整目标

**目标**：用 Loop Engineering 把 mkt53 从“静态市场洞察看板 + 本地证据治理”推进为“可重复执行的跨境电商经营证据循环系统”，优先解决三件事：

1. **P0 source gap 闭环**：把 `11` 个 P0 connector-required 缺口从 readiness packet 推进到 owner intake、授权快照或只读连接器证据。
2. **半月数据刷新闭环**：把本地 `2026-06-H1` manifest 与当前日期、生产 cron、public evidence dry-run/live 边界重新对齐。
3. **报告与页面事实晋升闭环**：每个页面事实、CSV 导出和报告结论都绑定 `source_id`、snapshot/manifest、evidence grade、owner decision，避免把样例、dry-run 或代理数据包装为经营事实。

一句话目标：**让领导看到 mkt53 不是一次性报告工具，而是跨境电商选品、竞品、合规、用户、履约、广告 ROI 和经营复盘的数据操作系统雏形。**

## 2. 五大组件约束

| 组件 | 在 mkt53 的落点 | 必须遵守的约束 | 本轮状态 |
|---|---|---|---|
| `Automations` | `npm` 数据审计、半月刷新、source task、readiness packet、CI quality gate、未来 cron | 自动化只能推进“审计、排队、补证、验证”；不能自动把 `connector-required` / `manual-required` 晋升为事实；`data:deploy:*` 和 live capture 必须显式授权 | Loop 0 已执行 no-write 审计和 readiness coverage |
| `Worktrees` | 按 loop 主题隔离，如 source-gap、manifest-refresh、connector-readiness、report-binding | 当前工作区已脏，本轮不切换分支、不重置；后续真正改代码前应新建 `codex/mkt53-loop-*` 分支或独立 worktree，并先保护用户改动 | Loop 0 仅新增 draft 文档 |
| `Skills` | 项目 `AGENTS.md`、证据分级规则、数据治理文档、自进化候选复盘 | `docs-only`、`draft`、`read-only`、`production unchanged`、`no provider call`、`manual review` 必须字面保留；失败/纠正后才沉淀候选经验 | Loop 0 按 draft/read-only 边界执行 |
| `Plugins/Connectors` | Amazon SP-API/Vendor Central、CRM/RFM、ERP、VOC NLP、YouTube、社媒、Import Genius、公开证据采集 | 无授权前只允许 readiness、template、mapping、dry-run；不得把公开 Amazon 页面样本写成平台级价格、销量、BSR 或份额；secret 不进仓库和文档 | P0 readiness 已有 11/11 覆盖，等待 owner intake 或授权快照 |
| `Sub-agents` | 可拆给数据治理、连接器合规、页面/报告、生产验证四类审计代理 | 每个代理必须声明边界：是否联网、是否写文件、是否触达生产、是否调用 provider；代理输出必须回到主 loop 的 evidence gate | Loop 0 未启用子代理，后续按任务拆分 |
| `State/Memory` | `drafts/analysis/*`、`app/tmp/audits/*`、`app/public/periodic-data/*`、`source-registry.ts`、owner intake ledger | 项目状态优先写入本地 draft/audit artifact；不自动写长期记忆；source gap 和 approval 状态不能只停留在对话里 | 本文件作为 Loop 0 state artifact |

## 3. Loop 机制

每个 loop 固定按七步执行：

1. **Goal**：定义本轮业务目标和可验收输出。
2. **Scope**：声明会读/写哪些文件、是否联网、是否生产、是否 provider。
3. **Evidence**：先跑本地审计或只读验证，建立新鲜基线。
4. **Action**：只做本轮最小动作，不顺手重构。
5. **Verification**：用命令、审计、页面检查或人工记录证明结果。
6. **Boundary Closeout**：明确 `providerCalls`、`productionWrites`、`factPromotion` 等状态。
7. **Next Loop Handoff**：留下下一轮输入、阻塞项和 owner 问题。

验收口径：

| 证据层级 | 可接受用途 | 不可越界 |
|---|---|---|
| `draft` | 方案、计划、问题拆解、owner 问题设计 | 不代表已实施 |
| `local no-write` | 审计、readiness、优先级、覆盖率判断 | 不代表生产状态 |
| `dry-run` | 验证脚本逻辑、字段合同、连接器路径 | 不代表真实采集成功 |
| `production read-only` | 验证线上页面、manifest、静态资源可访问 | 不代表生产写入或 provider 调用 |
| `authorized live` | 在明确授权下采集或写入 | 必须记录 owner、窗口、字段、hash、回滚策略 |
| `manual review` | 事实晋升、CSV 导出、报告发布的最终业务门禁 | 不能由测试或脚本自动替代 |

## 4. 待完成任务分层

### 4.1 P0：先把可用性变成可信经营输入

| 任务 | 业务意义 | 输入 | 输出 | 验收 |
|---|---|---|---|---|
| P0 source gap owner intake | 让 Amazon/VOC/社媒/私有快照类缺口进入业务 owner 补证流程 | P0 readiness packets、owner questionnaire | owner answers、ledger、validated intake CSV | P0 `11/11` 均有 owner、时间窗、字段字典、证据路径或明确阻塞 |
| 半月 manifest freshness | 防止数据页显示过期采集周期 | 本地 `2026-06-H1` manifest、生产只读 manifest | 当前周期 manifest 差异结论、刷新方案 | 明确本地与生产是否一致；不把本地过期误报成生产过期 |
| Amazon/VOC/CRM/ERP readiness gate | 建立竞品、评论、用户、内部经营数据最小可信合同 | connector readiness scripts | readiness checklist、mapping coverage、no secret artifact | `providerCalls=false`，但字段、窗口、owner、隐私等级齐全 |

### 4.2 P1：把治理能力转为页面与报告价值

| 任务 | 业务意义 | 输入 | 输出 | 验收 |
|---|---|---|---|---|
| 页面事实绑定复核 | 让市场、竞品、用户、行业页面只展示可用证据等级内的结论 | `source-registry.ts`、deep audit | 页面事实绑定清单 | `unsupportedClaimCount=0`，所有 gated disclosure 可见 |
| 报告生成 snapshot 绑定 | 让报告中心从目录升级为可追溯报告队列 | report queue、AI governance data | report manifest schema、snapshot contract | 每份报告有 source ids、snapshot id、manual review 状态 |
| CSV 导出边界复核 | 让导出文件可给领导/业务 owner 复核，不误当生产事实库 | exports、schema、manifest | reviewer-facing CSV package | L0/L1/L2/L3 标签保留，未审核行不被事实晋升 |

### 4.3 P2：形成可复制平台能力

| 任务 | 业务意义 | 输出 | 验收 |
|---|---|---|---|
| source registry 后端化设计 | 从前端静态治理升级为可多人协作的证据台账 | API/schema/权限设计草案 | 审批、状态、审计日志可落库 |
| 多平台数据主键设计 | 支撑 Amazon、Shopify、Walmart、TikTok Shop 等多平台铺货分析 | SKU/ASIN/channel/country 主数据合同 | 广告 ROI、库存、评论、价格可跨表关联 |
| 自动报告循环 | 把月报、竞品周报、法规预警从手工 PPT 变成可复核产物 | report generation loop | 报告结论可追溯、可重跑、可人工驳回 |

## 5. 执行计划

### Loop 0：基线与目标约束

**状态：已执行。**

| 项 | 结果 |
|---|---|
| 目标 | 建立 Loop Engineering 的项目目标、组件约束、当前数据证据基线 |
| 写入 | 仅新增本 draft 文档 |
| 本地审计 | `data:audit` 与 `data:audit:deep --no-write` 均通过；无 critical/high-risk/unsupported claim |
| 关键发现 | 剩余主任务是 `sourceGapCount=26`，其中 P0 `11` 个已被 readiness packet 覆盖 |
| 边界 | `providerCalls=false`、`productionWrites=false`、`productionDeploy=false`、`factPromotion=false` |

### Loop 1：P0 Owner Intake Pack

**状态：已执行，等待真实业务 owner 提交。**

**目标**：把 P0 `11` 个 connector-required 缺口转成可向业务 owner 提问、回收、验证的最小补证包。

执行步骤：

1. 读取最新 P0 readiness packet 与 owner questionnaire。
2. 若已有 owner chat answers，则只做 schema/hash/URI no-write 校验。
3. 若没有 answers，生成本地 intake pack，问题限定为 owner、时间窗、系统、字段、样本量、证据路径、展示/导出决策、限制解释。
4. 验证 owner intake，不做事实晋升。

建议命令：

```bash
cd /Users/pray/project/mkt53/app
node scripts/data/build-source-gap-readiness-coverage.mjs --json --no-write
npm run data:source-gaps:owner-intake -- --coverage tmp/audits/source-gap-readiness-coverage-20260701/source_gap_readiness_coverage.csv
```

验收：

- P0 `uncoveredSourceIds=[]`。
- 每个 P0 packet 有 owner lane、source ids、required artifact fields、forbidden claims。
- 仍保持 `providerCalls=false`、`restrictedConnectorAccess=false`、`factPromotion=false`。

本轮执行结果：

| 输出 | 路径 | 结果 |
|---|---|---|
| P0 readiness coverage | `app/tmp/audits/source-gap-readiness-coverage-loop1-20260701/` | `sourceGapCount=11`、`coveredSourceGapCount=11`、`uncoveredSourceIds=[]` |
| owner intake pack | `app/tmp/audits/source-gap-owner-intake-loop1-20260701/` | `packetCount=4`、`questionCount=24`、`releaseGateCount=4`、全部 `awaiting_owner_submission` |
| owner intake validation | `app/tmp/audits/source-gap-owner-intake-validation-loop1-20260701/` | `answeredQuestionCount=0`、`missingRequiredQuestionCount=24`、`packetBlockedCount=4`、`sourceBlockedCount=11` |

本轮 owner lanes：

- `amazon_connector_owner`: 6 个 P0 source gaps，覆盖竞品概览、产品参数/价格、区域份额、营销 4P、品类生命周期、哺乳用品趋势。
- `voc_nlp_connector_owner`: 3 个 P0 source gaps，覆盖评论情感、网页评论、VOC 功能趋势。
- `social_connector_owner`: 1 个 P0 source gap，覆盖海外社交声量。
- `connector_owner_private_snapshot`: 1 个 P0 source gap，覆盖渠道合作伙伴访谈私有快照。

当前阻塞并非脚本失败，而是正确的 manual gate：真实 owner 还没有提交 owner answer、evidence path、sha256 hash、answered_by、answered_at，因此不得写 source registry、不得更新页面事实、不得导出 factual CSV。

### Loop 2：Semi-monthly Manifest Freshness

**状态：已执行 production read-only freshness audit，等待 09:10 后 cron 复查或刷新授权。**

**目标**：核清本地和生产半月 manifest 是否同步，并决定是否进入本地刷新或生产发布。

执行步骤：

1. 本地读取 `app/public/periodic-data/latest.json`。
2. 生产只读读取 `https://mkt.lute-tlz-dddd.top/periodic-data/latest.json`。
3. 比对 `period`、`generatedAt`、`nextScheduledAt`、`totals`、`publicEvidence`。
4. 若仅本地 stale，先同步本地证据；若生产也 stale，再提出刷新/发布授权。

验收：

- 明确区分 `local stale`、`production stale`、`cron stale`、`data source stale`。
- 未授权前不运行 `data:deploy:semi-monthly`。
- live public evidence 只能在显式 `--public-evidence-live` 授权后执行。

本轮执行结果：

| 分类 | 状态 | 证据 |
|---|---|---|
| `local stale` | `true` | 本地 `app/public/periodic-data/latest.json` 为 `period=2026-06-H1`，当前预期周期为 `2026-07-H1` |
| `production stale` | `true` | 生产 `https://mkt.lute-tlz-dddd.top/periodic-data/latest.json` HTTP `200`，但内容仍为 `period=2026-06-H1` |
| `cron stale` | `likely` | manifest `nextScheduledAt=2026-06-16T09:00:00+08:00` 已过期；`2026-07-01 09:00 +08:00` 计划点在本轮核对时尚未到点 |
| `data source stale` | `unknown-by-readonly-check` | 本轮只读检查未执行刷新或采集，不能确认每个上游数据源当前状态 |

本轮产物：

- `drafts/analysis/mkt53-loop2-manifest-freshness-report-draft-20260701.md`

边界：

- 未执行 `npm run data:refresh:semi-monthly`
- 未执行 `npm run data:deploy:semi-monthly`
- 未执行 `npm run data:public-evidence:live`
- `providerCalls=false`
- `productionWrites=false`
- `productionDeploy=false`
- `publicEvidenceLiveCapture=false`

建议下一步：

1. 在 `2026-07-01 09:10 +08:00` 后再次只读检查生产 manifest。
2. 若仍为 `2026-06-H1`，单独授权本地刷新。
3. 本地刷新与质量门通过后，再单独授权生产发布。

### Loop 3：Connector Readiness To L3

**状态：已执行 readiness-gate，四条连接器均处于授权前 blocked。**

**目标**：优先打通跨境电商最高频的四条业务证据链。

| 优先级 | 连接器/快照 | 业务价值 | 最小证据 |
|---|---|---|---|
| 1 | Amazon / Vendor Central | 竞品价格、评论、BSR、ASIN 映射、广告 ROI 输入 | 授权快照或只读导出、字段字典、采集窗口、hash |
| 2 | VOC NLP / 评论样本 | 产品迭代、差评归因、本地化营销、素材洞察 | 样本 manifest、模型版本、人工一致率、发布门禁 |
| 3 | CRM / RFM | 复购、LTV、区域用户价值、本地化营销 | 脱敏样本、分群口径、隐私等级、owner approval |
| 4 | ERP / 库存履约 | 海外仓/FBA/FBT 补货、断货/滞销、渠道目标 | 只读快照、SKU 映射、库存口径、刷新 owner |

验收：

- 只把 L3/L4 证据用于事实展示；dry-run/readiness 继续显示为 gate。
- 不提交凭据、密钥或任何可用于认证的私密信息。
- 不用公开页面样本替代平台级经营数据。

本轮执行结果：

| 连接器 | Gate 状态 | 安全计数 | 当前阻塞 |
|---|---|---|---|
| Amazon / Vendor Central | `blocked` | `networkCalls=0`、`businessDataWrites=0` | 缺授权环境、ASIN/SKU 映射、readiness record、owner review、compliance review |
| VOC NLP / 评论样本 | `blocked` | `networkCalls=0`、`modelCalls=0`、`businessDataWrites=0` | 缺 sample manifest、模型版本、样本量、人工一致率、隐私合规复核 |
| CRM / RFM | `blocked` | `networkCalls=0`、`databaseReads=0`、`businessDataWrites=0` | 缺脱敏快照、RFM 口径、分群覆盖、owner review、compliance review |
| ERP / 库存履约 | `blocked` | `networkCalls=0`、`databaseReads=0`、`businessDataWrites=0` | 缺 ERP 库存/供应商快照、版本化口径、商业边界、owner review、compliance review |

本轮产物：

- `drafts/analysis/mkt53-loop3-connector-readiness-report-draft-20260701.md`

额外发现：

- Amazon readiness gate 覆盖全 Amazon backlog，Loop1 P0 owner-intake 只覆盖其中 P0 子集，需要拆 `P0-release-scope` 与 `full-backlog-scope`。
- VOC readiness gate 与 Loop1 P0 owner-intake 的 source id 范围存在差异，需要做 `review-nlp` source id mapping review。
- CRM/ERP 自动连接器 readiness 不能和已批准的内部代理展示混同。

边界：

- 未读取私有连接器输入。
- 未执行平台 API。
- 未生成真实业务快照。
- `providerCalls=false`、`restrictedConnectorAccess=false`、`productionWrites=false`、`factPromotion=false`。

### Loop 4：Report And Page Fact Promotion

**状态：已执行 fact promotion gate，结论为 blocked for promotion。**

**目标**：将通过 owner/manual review 的证据绑定回页面和报告，而不是停在 audit artifact。

执行步骤：

1. 更新 source registry 指向已批准 artifact。
2. 页面保持 evidence badge、claim scope、forbidden interpretation。
3. 报告中心绑定 snapshot id 和 source ids。
4. 重跑 `data:audit:json`、`data:audit:deep:summary`、`npm run test`。

验收：

- `unsupportedClaimCount=0`。
- 需要导出的 CSV 保留 evidence grade 和 reviewer-facing 边界。
- 无 owner/manual review 的数据不能进入事实图表或报告结论。

本轮执行结果：

| Gate | 结果 | 证据 |
|---|---|---|
| owner intake | `blocked` | Loop1 intake validation 复跑：`answeredQuestionCount=0`、`missingRequiredQuestionCount=24`、`packetBlockedCount=4`、`sourceBlockedCount=11` |
| AI/report readiness | `blocked` | Batch4 dry-run：`canDisplayAsFact=false`、`blockedRows=29`、`reportQueueRows=5`、`providerCalls=false`、`modelCalls=false` |
| Amazon readiness | `blocked` | 缺授权环境、ASIN/SKU mapping、readiness record、owner/compliance review；`networkCalls=0`、`businessDataWrites=0` |
| VOC/NLP readiness | `blocked` | 缺 sample manifest、模型 trace、人工复核、隐私合规、snapshot scope；`networkCalls=0`、`modelCalls=0`、`businessDataWrites=0` |
| CRM readiness | `blocked` | 缺脱敏快照、RFM 口径、隐私边界、owner/compliance review；`databaseReads=0`、`businessDataWrites=0` |
| ERP readiness | `blocked` | 缺库存/供应商快照、版本化口径、商业边界、owner/compliance review；`databaseReads=0`、`businessDataWrites=0` |
| report/page code state | `gated` | `ReportsPage`、`ReportPreview`、`AiReportGovernancePanel` 和 `ai-report-governance-data.ts` 均保持目录/封面/补证队列口径，`canGenerate=false` 或 `canDisplayAsFact=false` |

本轮产物：

- `drafts/analysis/mkt53-loop4-report-page-fact-promotion-gate-draft-20260701.md`

边界：

- 未更新 `source-registry.ts`。
- 未改页面事实、报告正文或 CSV 导出。
- 未调用 provider、模型或受限连接器。
- 未执行生产写入或部署。
- `providerCalls=false`、`restrictedConnectorAccess=false`、`productionWrites=false`、`factPromotion=false`、`sourceRegistryWrites=false`、`pageWrites=false`、`csvFactExport=false`。

解锁条件：

1. 业务 owner 提交 Loop1 的 24 个必答项、证据 URI/path、sha256、answered_by、answered_at。
2. owner intake validation 通过后，单独执行 manual release review。
3. 完成 `report_id -> claim -> source_id -> snapshot_id -> reviewer decision` 矩阵。
4. 半月 manifest 与当前周期对齐后，再进入生产只读 release gate。

### Loop 5：Semi-monthly Refresh Gate

**状态：已执行本地刷新门禁；local refreshed，production unchanged。**

**目标**：把本地半月数据周期从 `2026-06-H1` 刷新到当前周期 `2026-07-H1`，并判断是否具备进入生产发布授权的条件。

执行步骤：

1. 刷新前读取本地和生产 manifest。
2. 预检当前代码预期半月周期和 public evidence dry-run 边界。
3. 备份会被覆盖的 local public/weekly manifest。
4. 执行本地 `npm run data:refresh:semi-monthly`。
5. 复核刷新后 manifest、source-error、production read-only 状态。
6. 跑数据审计、测试、lint、audit 和 build。

验收：

- 本地 manifest 为 `2026-07-H1`。
- `publicEvidenceLiveCapture=false`。
- production read-only 状态单独表述。
- 不把 local refreshed 写成 production updated。

本轮执行结果：

| 项 | 结果 |
|---|---|
| 本地刷新 | `period=2026-07-H1`、`week=2026-W27`、`window=2026-07-01..2026-07-15`、`nextScheduledAt=2026-07-16T09:00:00+08:00` |
| 本地 totals | `total=53`、`ok=16`、`source-error=3`、`connector-required=28`、`manual-required=6`、`fetch-error=0` |
| public evidence | `mode=dry-run`、`planned=12`、`networkCalls=0`、`businessDataWrites=0` |
| 兼容路径 | `public/weekly-data/latest.json` 与 `public/periodic-data/latest.json` 一致 |
| 生产只读 | 仍为 `period=2026-06-H1`、`generatedAt=2026-06-14T05:06:31.080Z`，即 `production unchanged` |
| source-error | `ds-002` HTTP `500`、`ds-044` HTTP `403`、`ds-045` HTTP `500` |

本轮验证：

| 验证项 | 结果 |
|---|---|
| `node scripts/data/audit-consistency.mjs --json` | `issueCount=0`、`criticalIssueCount=0` |
| `node scripts/data/audit-deep.mjs --summary-json --no-write` | `unsupportedClaimCount=0`、`highRiskClaimCount=0`、`sourceGapCount=26` |
| `npm run test` | 8 个测试文件、90 个测试通过 |
| `npm run build` | 通过 |
| `npm run lint` | 通过 |
| `npm audit` | `found 0 vulnerabilities` |

本轮产物：

- `drafts/analysis/mkt53-loop5-semi-monthly-refresh-gate-draft-20260701.md`
- `app/public/periodic-data/latest.json`
- `app/public/periodic-data/connectors.json`
- `app/public/periodic-data/source-tasks.json`
- `app/public/periodic-data/public-evidence-samples.json`
- `app/public/weekly-data/latest.json`
- `app/public/weekly-data/connectors.json`
- `app/public/weekly-data/source-tasks.json`
- `app/public/weekly-data/public-evidence-samples.json`
- `app/tmp/data-collection/runs/2026-07-H1.json`
- `app/tmp/data-collection/runs/2026-07-H1-connectors.json`
- `app/tmp/data-collection/runs/2026-07-H1-source-tasks.json`
- `app/tmp/data-collection/runs/2026-07-H1-public-evidence-samples.json`

边界：

- 未执行 `data:deploy:semi-monthly`。
- 未执行 `deploy:prod`。
- 未执行 `data:public-evidence:live`。
- 未调用 provider、模型或受限连接器。
- 未进行事实晋升。
- `localRefresh=true`、`productionWrites=false`、`productionDeploy=false`、`publicEvidenceLiveCapture=false`、`providerCalls=false`、`restrictedConnectorAccess=false`、`factPromotion=false`。

### Loop 6：Production Read-only And Release Gate

**状态：已执行生产数据 JSON 发布；production data updated，production code unchanged。**

**目标**：在本地刷新产物通过质量门后，进入生产只读验证和授权发布。

执行步骤：

1. 明确是否接受 `2026-07-H1` local manifest 中的 3 个 `source-error` 以错误状态上线。
2. 若接受，先取得生产发布授权。
3. 执行 `npm run data:deploy:semi-monthly` 或等价发布链。
4. 发布后跑 `smoke:prod` 和 `test:e2e:prod`。

验收：

- 发布前后 evidence 层级分开写明。
- `local refreshed`、`review-ready`、`deployed`、`production-updated` 不混用。
- provider/data live side effects 单独记录。

本轮执行结果：

| 项 | 结果 |
|---|---|
| 用户授权 | 已接受 `ds-002`、`ds-044`、`ds-045` 三个 `source-error` 以上线状态保留 |
| 发布策略 | 只同步 `periodic-data/` 与 `weekly-data/` 静态 JSON；未执行全量 `deploy:prod` |
| 远端备份 | `/opt/mkt53/backups/20260701-loop6-semi-monthly-data-before-json-sync/` |
| 生产 manifest | `period=2026-07-H1`、`total=53`、`ok=16`、`source-error=3`、`connector-required=28`、`manual-required=6` |
| public evidence | `mode=dry-run`、`planned=12`、`networkCalls=0`、`businessDataWrites=0` |
| nginx | `docker exec ai_video_nginx nginx -t` 通过；未重启 nginx |
| 静态代码边界 | `/opt/mkt53/html/index.html` 时间戳保持 `2026-06-30 15:18:43 +0800`，未覆盖 |
| production smoke | `npm run smoke:prod` 通过 |
| production E2E | 首次因旧硬编码基线失败；修正测试基线后 `npm run test:e2e:prod` 14/14 通过 |
| 本地质量门 | `npm run lint` 通过；`npm run test` 90 passed |

本轮测试修正：

- `app/tests/e2e-prod/lute-landing.spec.ts` 不再硬编码旧 `45/23` 基线，改为验证 manifest total、auditSummary sourceRegistryCount、connector-required 和 backlog items 的一致性，并保留不低于旧基线的回归约束。

本轮产物：

- `drafts/analysis/mkt53-loop6-production-release-gate-draft-20260701.md`

边界：

- `productionWrites=true`，仅限 `/opt/mkt53/html/periodic-data/` 和 `/opt/mkt53/html/weekly-data/`。
- `productionDeploy=true`，仅指静态数据 JSON 上线。
- `productionCodeDeploy=false`，未同步 `dist/`，未覆盖 `index.html`。
- `providerCalls=false`、`restrictedConnectorAccess=false`、`publicEvidenceLiveCapture=false`、`factPromotion=false`、`nginxRestart=false`。

### Loop 7：Source Error Remediation Gate

**状态：已执行只读补证门禁；source-error retained，no fact promotion。**

**目标**：针对用户已授权以 `source-error` 状态上线保留的 `ds-002`、`ds-044`、`ds-045`，执行公开来源重试、历史证据核验和补证路径收敛。

执行步骤：

1. 读取 `2026-07-H1` 本地 manifest 与兼容 weekly manifest，确认三个来源状态一致。
2. 使用普通浏览器 UA、短超时、小范围读取，对三个公开 URL 执行 `HEAD` / `GET` 只读重试。
3. 核验既有 artifact 与 source task 队列覆盖情况。
4. 生成 source-error 补证门禁报告。

本轮执行结果：

| 项 | 结果 |
|---|---|
| manifest 基线 | `period=2026-07-H1`、`total=53`、`source-error=3`，三份本地/兼容 manifest 一致 |
| `ds-002` | Fortune Business Insights breast pump market URL，`HEAD=500`、`GET=500`，仍不可晋升 |
| `ds-044` | Grand View Research baby products URL，`HEAD=403`、`GET=403`，仍不可晋升 |
| `ds-045` | Fortune Business Insights wearable breast pumps URL，`HEAD=500`、`GET=500`，仍不可晋升 |
| 历史 artifact | `ds-044` registry 引用的 `tmp/audits/source-cross-validation-20260629-batch-market-tam/ds044_gvr_baby_products_evidence.json` 当前工作区未找到 |
| 任务队列 | `source-tasks.json` 仅生成 `public-source-review:ds-002`；`ds-044` / `ds-045` 未被补证任务覆盖 |

本轮产物：

- `drafts/analysis/mkt53-loop7-source-error-remediation-gate-draft-20260701.md`

边界：

- 未执行 `deploy:*`、`data:deploy:*`、`data:publish:*`。
- 未执行 `data:public-evidence:live`。
- 未调用 provider 或受限连接器。
- 未写生产、未重启 nginx、未覆盖静态构建产物。
- 未对 `ds-002`、`ds-044`、`ds-045` 做事实晋升。

### Loop 8：Source Task Coverage Gate

**状态：已执行本地修复与刷新；source task coverage fixed，production unchanged。**

**目标**：修复 `source-tasks.json` 对当期 `source-error` 公开来源的覆盖缺口，让 `ds-002`、`ds-044`、`ds-045` 均进入公开来源复核任务队列。

本轮执行结果：

| 项 | 结果 |
|---|---|
| 根因 | `buildSourceTaskQueue` 只看 registry 的 `verificationStatus/gap`，未接收当期 public URL 采集结果 |
| 代码修复 | `buildSourceTaskQueue` 增加可选 `sourceResults`；`collect-weekly-sources.mjs` 在采集完成后生成任务队列 |
| 测试覆盖 | `app/tests/scripts/static-scripts.test.ts` 增加 verified registry 行 + 当期 public URL 异常结果的覆盖测试 |
| no-network 基线 | `total=39`、`connector-readiness=28`、`manual-evidence=6`、`public-source-review=5`，保持 registry-only dry-run 行为 |
| 半月刷新 | `period=2026-07-H1`、`total=53`、`source-error=3`、`connector-required=28`、`manual-required=6` |
| 刷新后任务队列 | `total=41`、`connector-readiness=28`、`manual-evidence=6`、`public-source-review=7` |
| 目标覆盖 | `public-source-review:ds-002`、`public-source-review:ds-044`、`public-source-review:ds-045` 均存在 |
| 质量门 | `npm run test` 91 passed；`npm run lint` 通过；`npm run build` 通过；数据一致性与深度证据审计均通过 |

本轮产物：

- `drafts/analysis/mkt53-loop8-source-task-coverage-gate-draft-20260701.md`
- `app/scripts/data/lib/source-tasks.mjs`
- `app/scripts/data/collect-weekly-sources.mjs`
- `app/tests/scripts/static-scripts.test.ts`
- `app/public/periodic-data/latest.json`
- `app/public/periodic-data/source-tasks.json`
- `app/public/periodic-data/connectors.json`
- `app/public/periodic-data/public-evidence-samples.json`
- `app/public/weekly-data/latest.json`
- `app/public/weekly-data/source-tasks.json`
- `app/public/weekly-data/connectors.json`
- `app/public/weekly-data/public-evidence-samples.json`
- `app/tmp/data-collection/runs/2026-07-H1.json`
- `app/tmp/data-collection/runs/2026-07-H1-source-tasks.json`
- `app/tmp/data-collection/runs/2026-07-H1-connectors.json`
- `app/tmp/data-collection/runs/2026-07-H1-public-evidence-samples.json`

边界：

- 未执行 `deploy:*`、`data:deploy:*`、`data:publish:*`。
- 未执行 `data:public-evidence:live`。
- 未调用 provider 或受限连接器。
- 未写生产、未重启 nginx、未覆盖线上静态构建产物。
- 未对 `ds-002`、`ds-044`、`ds-045` 做事实晋升。

### Loop 9：Manual Evidence Pack Gate

**状态：已执行本地人工补证包生成；manual review pending，production unchanged。**

**目标**：在已接受 `ds-002`、`ds-044`、`ds-045` 三条公开来源异常以上线状态保留的前提下，把它们转成可交给市场研究 owner 的人工补证包，避免“允许上线保留”被误读为“事实已复核通过”。

本轮执行结果：

| 项 | 结果 |
|---|---|
| 输入任务 | `public-source-review:ds-002`、`public-source-review:ds-044`、`public-source-review:ds-045` 均已存在 |
| 补证包目录 | `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/` |
| 目标数量 | `targetCount=3` |
| 人工复核状态 | `manualReviewRequired=3`、全部 `pending_manual_review` |
| 晋升门禁 | `factPromotionAllowed=0`、`productionWriteAuthorized=0`、`providerCallsAuthorized=0` |
| 单来源复核单 | 已生成 `ds-002`、`ds-044`、`ds-045` 三份 Markdown packet |
| 业务边界 | `ds-002` 只用于北美区域份额复核；`ds-044` 只作全球婴童用品上层 TAM；`ds-045` 只作穿戴式吸奶器细分 TAM |

本轮产物：

- `drafts/analysis/mkt53-loop9-manual-evidence-pack-gate-draft-20260701.md`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/manual_evidence_manifest.json`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/manual_evidence_packets.csv`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/manual_evidence_questionnaire.csv`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/manual_evidence_acceptance_gate.csv`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/manual_evidence_packet_index.md`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/packets/public-source-review:ds-002.md`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/packets/public-source-review:ds-044.md`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/packets/public-source-review:ds-045.md`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/artifact_hashes.csv`

边界：

- 未执行 `deploy:*`、`data:deploy:*`、`data:publish:*`。
- 未执行 `data:public-evidence:live`。
- 未调用 provider、报告供应商 API 或受限连接器。
- 未写生产、未重启 nginx、未覆盖线上静态构建产物。
- 未对 `ds-002`、`ds-044`、`ds-045` 做事实晋升。

## 6. 领导汇报口径

**事实**：mkt53 已有完整前端工作台、source registry、107 张治理表、53 条来源登记、半月 manifest、P0 readiness 覆盖和本地审计命令。

**推断**：继续投入的最高 ROI 是把 `sourceGapCount=26` 中的 P0/P1 缺口变成可复用连接器和 owner intake 流程，而不是继续扩页面数量。

**商业价值**：

- 对一线运营：减少 Amazon 竞品价格/评论、法规条款、用户反馈手工找数和误引用。
- 对管理层：把选品、广告投放 ROI、库存履约、法规准入、用户 VOC 的数据缺口和 owner 拉到同一张待办图。
- 对战略层：沉淀一套可复制到 Amazon、Shopify、Walmart、TikTok Shop 的跨境电商经营证据系统。

**资源申请建议**：

1. 给 P0 connector readiness 配业务 owner：Amazon、VOC、CRM、ERP 至少各 1 名。
2. 给只读快照/字段字典/脱敏样本开权限，不先要求 live 写入。
3. 给报告生成和 source registry 后端化预留开发资源。
4. 把生产刷新、public evidence live capture、provider call 作为单独审批事项。

## 7. 下一步

**Loop 9 已完成人工补证包门禁，当前不能进入新事实晋升。**可直接交给业务 owner 的输入是：

- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/manual_evidence_packets.csv`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/manual_evidence_questionnaire.csv`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/manual_evidence_acceptance_gate.csv`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/manual_evidence_packet_index.md`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/packets/public-source-review:ds-002.md`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/packets/public-source-review:ds-044.md`
- `app/tmp/audits/source-error-manual-evidence-pack-loop9-20260701/packets/public-source-review:ds-045.md`

下一步是收集 owner 回答，并对 reviewer、访问时间、证据路径、hash、口径边界和人工结论做 validation。在 owner 回答通过 validation 且完成单独 manual release review 之前，不需要生产部署、不需要 provider、不需要 live connector，也不得进行事实晋升。

若继续进入下一个 loop，建议优先选择二者之一：

1. **Manual Evidence Intake Validation Gate**：校验 owner 填回的人工补证 CSV，只接受 `accepted_for_l3_evidence`、`needs_replacement_source`、`rejected_scope_mismatch`、`blocked_vendor_access` 四类结论。
2. **ds-044 artifact lineage 门禁**：找回或重新生成 `tmp/audits/source-cross-validation-20260629-batch-market-tam/ds044_gvr_baby_products_evidence.json`，核对 registry 中 `evidenceArtifactPath` 的真实存在性。
