---
title: mkt53 Loop4 报告与页面事实晋升门禁
doc_type: analysis
module: project
topic: report-page-fact-promotion-gate
status: draft
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
provider_calls: false
restricted_connector_access: false
production_writes: false
production_deploy: false
fact_promotion: false
source_registry_writes: false
page_writes: false
csv_fact_export: false
report_publish: false
---

# mkt53 Loop4 报告与页面事实晋升门禁

## 1. 本轮目标

本轮原目标是将已经通过 owner/manual review 的证据绑定回页面和报告，使报告中心、页面图表和 CSV 导出可以引用新的事实级数据。

本轮实际执行口径调整为 **fact promotion gate**：只判断是否具备事实上架条件，不更新 source registry，不改页面事实，不生成报告正文，不开放 CSV/PDF 导出。

## 2. 证据基线

### 2.1 新鲜命令证据

| 检查项 | 命令 | 关键结果 | 结论 |
|---|---|---|---|
| P0 owner intake validation | `node scripts/data/validate-source-gap-owner-intake.mjs --intake tmp/audits/source-gap-owner-intake-loop1-20260701 --json --no-write` | `answeredQuestionCount=0`、`missingRequiredQuestionCount=24`、`packetBlockedCount=4`、`sourceBlockedCount=11` | owner 补证未提交，不能进入 manual review |
| AI/report Batch4 dry-run | `node scripts/data/build-ai-report-governance-batch4.mjs --json --no-write` | `canDisplayAsFact=false`、`blockedRows=29`、`reportQueueRows=5`、`providerCalls=false`、`modelCalls=false` | 报告队列仍为 readiness gate |
| Amazon readiness gate | `node scripts/data/connectors/amazon-commerce-dry-run.mjs --readiness-gate --json --no-write` | `status=blocked`、`missingItemCount=67`、`networkCalls=0`、`businessDataWrites=0` | 竞品/价格/区域份额证据链未就绪 |
| VOC/NLP readiness gate | `node scripts/data/connectors/voc-nlp-dry-run.mjs --readiness-gate --json --no-write` | `status=blocked`、缺 sample、模型、人工复核、隐私、snapshot scope | 评论/VOC/AI 洞察未就绪 |
| CRM readiness gate | `node scripts/data/connectors/internal-crm-dry-run.mjs --readiness-gate --json --no-write` | `status=blocked`、`databaseReads=0`、`businessDataWrites=0` | RFM/用户价值证据链未就绪 |
| ERP readiness gate | `node scripts/data/connectors/internal-erp-dry-run.mjs --readiness-gate --json --no-write` | `status=blocked`、`databaseReads=0`、`businessDataWrites=0` | 库存/供应链刷新证据链未就绪 |
| 深度证据审计 | `node scripts/data/audit-deep.mjs --summary-json --no-write` | `claimCount=670`、`highRiskClaimCount=0`、`unsupportedClaimCount=0`、`sourceGapCount=26` | 当前页面风险受控，但仍有 26 个来源缺口 |
| 数据一致性审计 | `node scripts/data/audit-consistency.mjs --json` | `pageCount=43`、`tableCount=107`、`sourceRegistryCount=53`、`criticalIssueCount=0` | 页面/治理表/registry 结构一致 |

### 2.2 页面与报告代码现状

| 文件 | 当前状态 | 对事实晋升的影响 |
|---|---|---|
| `app/src/pages/ReportsPage.tsx` | 报告中心展示目录、补证状态、阻断项；文案明确“未复核正文不作为事实导出” | 可保留为报告目录，不具备正文事实发布条件 |
| `app/src/pages/ReportPreview.tsx` | 报告预览展示“正文下载已暂停，等待证据复核”；导出规则写明当前版本不提供 PDF/CSV 正文导出 | 预览页只能承载证据封面和补证清单 |
| `app/src/components/AiReportGovernancePanel.tsx` | 展示 `canDisplayAsFact=false`、`no model call · no provider call` | 组件定位是治理门禁，不是事实输出 |
| `app/src/data/ai-report-governance-data.ts` | Batch4 artifact 为 `L2-fixture-or-dry-run`、`canDisplayAsFact=false`；5 个 report queue 均 `canGenerate=false` | 报告生成队列全部 blocked |
| `app/scripts/data/build-ai-report-governance-batch4.mjs` | dry-run manifest 写明 `reportConclusionsGenerated=false`、`providerCalls=false`、`modelCalls=false`、`productionWrites=false` | 脚本只能生成 readiness artifact，不能生成经营结论 |

## 3. 门禁判定

### 3.1 事实

- Loop1 owner intake 仍有 `24` 个必答项未提交，`4` 个 packet 全部 blocked。
- Loop3 四条连接器 readiness gate 均 blocked，且安全计数均为 `0`，说明本轮没有读取受限系统、没有模型调用、没有业务数据写入。
- Loop2 已确认本地与生产半月 manifest 仍处于 `2026-06-H1`，与 `2026-07-01` 当前周期不一致。
- 报告中心与报告预览页当前已经采用“目录/封面可见，正文/导出隔离”的产品状态。
- 深度审计显示当前 `unsupportedClaimCount=0`、`highRiskClaimCount=0`，说明现有页面口径受控；这不能替代 owner approval 或 manual release review。

### 3.2 推断

- mkt53 当前可安全推进的是 **补证与门禁自动化**，还不能推进“新事实上架”。
- 报告中心最有价值的下一步不是生成报告正文，而是补齐 `report_id -> claim -> source_id -> snapshot_id -> reviewer decision` 的链路。
- 对跨境电商业务而言，当前阻断集中在高价值数据链：Amazon 竞品/价格/评价、VOC 评论、CRM/RFM、ERP 库存履约。这些正是选品、广告 ROI、评论运营、海外仓补货和本地化营销要用的核心输入。

### 3.3 不确定项

- 本轮未收到真实 owner answer 文件，因此无法判断任何 P0 packet 是否可进入人工 release review。
- 本轮未执行半月刷新，也未调用 live public evidence capture，因此不能确认 `2026-07-H1` 新周期数据是否可生成。
- 本轮未改代码、未部署，生产页面状态只沿用 Loop2 的只读 manifest 结论。

## 4. 晋升决策

| 决策项 | 结果 | 原因 |
|---|---|---|
| `sourceRegistryWrites` | `false` | owner intake 未通过，manual release review 未发生 |
| `pageWrites` | `false` | 新事实缺少可晋升证据，不更新页面图表或指标 |
| `reportPublish` | `false` | Batch4 `canDisplayAsFact=false`，report queue `canGenerate=false` |
| `csvFactExport` | `false` | owner/manual review 前不能把 blocked 或 readiness 行作为事实导出 |
| `providerCalls` | `false` | 本轮只执行 dry-run/readiness gate |
| `restrictedConnectorAccess` | `false` | 未读取 Amazon、CRM、ERP、VOC 等受限系统 |
| `productionWrites` | `false` | 未执行部署、发布或生产数据写入 |
| `factPromotion` | `false` | 本轮是晋升门禁，不是晋升动作 |

## 5. 对业务价值的解释

**本轮的商业价值不是“多上几个图表”，而是阻止低可信数据进入领导决策链。**

如果把 Amazon 公开页样例、VOC 样例、ERP readiness artifact 或报告目录直接包装成事实，跨境电商业务会面临三类风险：

1. **选品和广告 ROI 误判**：未授权的价格、评分、BSR 或评论样本会导致投放预算和 SKU 优先级偏离真实市场。
2. **合规与品牌风险**：未复核的用户评论、生成素材或报告结论进入对外/跨团队材料，会放大隐私、版权和商用审核风险。
3. **经营复盘失真**：ERP/CRM 代理数据若缺字段字典、时间窗和 owner decision，容易把内部 numerator 写成市场份额、区域份额或用户 LTV。

因此 Loop4 当前最正确的产出是：**保持报告和页面的证据边界，同时把缺什么证据、谁来补、补完后如何晋升说清楚。**

## 6. 下一步解锁条件

| 解锁项 | 必须输入 | 通过后允许进入 |
|---|---|---|
| Owner intake completion | `owner_intake_questionnaire.csv` 中 24 个必答项、证据路径、sha256、answered_by、answered_at | packet manual review |
| Manual release review | reviewer decision、allowed display scope、forbidden display confirmation、export decision | source registry binding |
| Connector readiness | Amazon/VOC/CRM/ERP 私有 readiness record、mapping/snapshot manifest、owner/compliance approval | L3/L4 pipeline implementation |
| Manifest freshness | 本地和生产半月 manifest 对齐到当前周期，刷新/发布边界明确 | production release gate |
| Report claim matrix | 每个 `report_id` 拆成 claim 级 source ids、snapshot ids、evidence grade、review status | report body generation |

## 7. Loop4 结论

**Loop4 已完成门禁检查，结论为 blocked for promotion。**

当前 mkt53 的报告中心应继续保持目录、封面、补证队列和治理状态展示；页面可继续展示现有已受控的低风险内容与 gated disclosure；新的事实上架、CSV 事实导出、报告正文生成和生产发布应进入后续单独授权 loop。

推荐下一个 loop：

1. 若目标是刷新数据周期：进入 `Loop5 Semi-monthly Refresh Authorization`，先本地刷新再决定生产发布。
2. 若目标是推进事实晋升：先让业务 owner 填写 Loop1 的 `owner_intake_questionnaire.csv`，再进入 `Owner Intake Validation -> Manual Release Review -> Source Registry Binding`。
