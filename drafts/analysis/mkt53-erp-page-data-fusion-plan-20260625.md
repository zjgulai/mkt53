---
title: "mkt53 ERP 与全站页面数据融合治理方案"
created_at: "2026-06-25T09:25:00+08:00"
status: "draft"
scope: "deployment-readiness, page-data-audit, ERP-source-fusion"
evidence_artifacts:
  - "app/tmp/audits/full-data-quality-20260626/deep-audit-summary.json"
  - "app/tmp/audits/full-data-quality-20260626/source_gap_matrix.csv"
  - "app/tmp/audits/full-data-quality-20260626/table_source_matrix.csv"
  - "tmp/audits/erp-readonly-source-check-20260624/erp_source_matrix.csv"
  - "tmp/audits/erp-readonly-source-check-20260624/erp_market_table_mapping.csv"
  - "tmp/exports/erp_market_trend_internal_units_proxy_2026-01-01_2026-06-24.csv"
  - "tmp/exports/erp-derived-batch2-20260625/batch2_erp_derived_manifest.json"
  - "tmp/exports/erp-derived-batch3-20260625/batch3_erp_derived_manifest.json"
  - "tmp/exports/ai-report-governance-batch4-20260625/batch4_ai_report_governance_manifest.json"
  - "tmp/exports/ai-review-governance-batch5-20260625/batch5_ai_review_governance_manifest.json"
  - "tmp/exports/ai-design-governance-batch6-20260625/batch6_ai_design_governance_manifest.json"
  - "tmp/exports/erp-governance-batch7-20260625/batch7_erp_governance_manifest.json"
  - "tmp/exports/erp-owner-approval-batch8-20260625/batch8_erp_owner_approval_manifest.json"
  - "tmp/exports/erp-owner-approval-intake-batch9-20260626/batch9_erp_owner_approval_intake_manifest.json"
  - "tmp/exports/erp-owner-approval-record-template-batch10-20260626/batch10_erp_owner_approval_record_template_manifest.json"
  - "tmp/exports/erp-owner-approval-preflight-batch11-20260626/batch11_erp_owner_approval_preflight_manifest.json"
  - "tmp/exports/erp-owner-submission-intake-batch12-20260626/batch12_erp_owner_submission_intake_manifest.json"
  - "tmp/exports/erp-owner-submission-pack-batch13-20260626/batch13_erp_owner_submission_pack_manifest.json"
  - "tmp/exports/erp-owner-submission-dropbox-watchlist-batch14-20260627/batch14_erp_owner_submission_dropbox_watchlist_manifest.json"
  - "tmp/exports/erp-owner-submission-acceptance-gate-batch15-20260627/batch15_erp_owner_submission_acceptance_gate_manifest.json"
  - "tmp/exports/erp-owner-submission-synthetic-fixture-batch16-20260627/batch16_erp_owner_submission_synthetic_fixture_manifest.json"
---

# mkt53 ERP 与全站页面数据融合治理方案

## 1. 当前结论

### 1.1 已确认事实

- `npm run data:audit` 当前通过：43 个页面、96 张数据表、53 条 source registry、0 个结构挂接问题。
- `npm run data:audit:deep` 已生成新审计产物：`app/tmp/audits/full-data-quality-20260626/`。
- deep audit 当前扫描到 885 条 claim、9 条 CSV export claim、41 条 source gap、0 条 high risk claim。
- 当前没有生产写入、没有 provider live capture、没有生产部署。
- ERP 已形成三条可复用内部证据源：
  - `ds-047`：ERP 销售统计导出，118132 行，185 列，原始 xlsx hash 已记录。
  - `ds-048`：ERP 售后销量统计导出，118179 行，185 列，原始 xlsx hash 已记录。
  - `ds-049`：ERP 零售与渠道 UI 分页采集，10854 行，109 页，唯一行 10854，stale pages=0。
- `market_trend_monthly` 已接入 ERP 内部月度销量代理，但仍为 gated private/internal proxy，不能写作 GMV、市场份额、TAM、SAM、SOM 或公开事实。
- Batch 2 已生成 `tmp/exports/erp-derived-batch2-20260625/`：`erp_product_sku_dim.csv` 1749 行 SKU hash、`erp_category_mapping.csv` 5 行品类代理、三张月度事实表各 12 行、`erp_category_monthly_proxy.csv` 12 行；全部为 private/internal L3，`canDisplayAsFact=false`。
- Batch 3 已生成 `tmp/exports/erp-derived-batch3-20260625/`：全渠道增长快照 1 行、目标达成快照 1 行、渠道/客户 hash 维表 813 行、目的仓月度代理 300 行、库存字段 readiness 10 行；全部保持 private/internal gate，库存真实数值仍未采集。
- Batch 4 已生成 `tmp/exports/ai-report-governance-batch4-20260625/`：dataset manifest 7 行、model run manifest 7 行、human review gate 5 行、report queue 5 行、ERP context bridge 5 行；全部为 private/internal gate，未调用模型、未调用 provider、未生成报告结论。
- Batch 5 已生成 `tmp/exports/ai-review-governance-batch5-20260625/`：review sample manifest 6 行、eval queue 6 行、human review queue 6 行、publish gate 6 行；全部为 private/internal gate，未调用模型、未调用 provider、未接入 live connector、未发布或导出事实。
- Batch 6 已生成 `tmp/exports/ai-design-governance-batch6-20260625/`：design run manifest 5 行、asset hash manifest 5 行、cost queue 5 行、commercial review gate 5 行；全部为 private/internal gate，未调用模型、未调用 provider、未接入 live connector、未写生产、未包含真实 requestId、成本、生成图片二进制或商用批准。
- Batch 7 已生成 `tmp/exports/erp-governance-batch7-20260625/`：ERP field dictionary readiness 61 行、category review queue 5 行、subtotal reconciliation queue 4 行、display approval gate 9 行；全部为 private/internal L3 gate，未登录 ERP、未调用 provider、未写生产、未包含原始 SKU/产品/客户/运营/仓库业务值，`canDisplayAsFact=false`。
- Batch 8 已生成 `tmp/exports/erp-owner-approval-batch8-20260625/`：field owner approval packet 5 行、category owner approval packet 5 行、subtotal owner explanation packet 4 行、display approval record template 9 行、owner approval backlog 23 行；全部为 private/internal L3 gate，未应用真实审批记录，`approvalRecordsApplied=0`、`readyToDisplayRows=0`、`canDisplayAsFact=false`。
- Batch 9 已生成 `tmp/exports/erp-owner-approval-intake-batch9-20260626/`：owner approval intake contract 4 行、validation result 23 行、release gate 9 行、promotion manifest 0 行；当前未输入真实 owner approval records，`approvalRecordsInputRows=0`、`passedValidationRows=0`、`blockedValidationRows=23`、`readyReleaseGateRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`、`canDisplayAsFact=false`。
- Batch 10 已生成 `tmp/exports/erp-owner-approval-record-template-batch10-20260626/`：owner packet index 4 行、owner record input template 23 行、required evidence matrix 23 行、submission readiness 9 行；当前 `submittedOwnerRecords=0`、`blankDecisionRows=23`、`readyToValidateRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`、`canDisplayAsFact=false`。
- Batch 11 已生成 `tmp/exports/erp-owner-approval-preflight-batch11-20260626/`：preflight rulebook 6 行、preflight result 23 行、forbidden value scan 23 行、Batch9 handoff queue 0 行、release preflight summary 9 行；当前 `readyForBatch9Rows=0`、`blockedPreflightRows=23`、`forbiddenHitRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`、`canDisplayAsFact=false`。
- Batch 12 已生成 `tmp/exports/erp-owner-submission-intake-batch12-20260626/`：submission intake inventory 1 行、schema audit 23 行、redaction audit 23 行、Batch11 queue 0 行、release readiness 9 行；当前 `submissionCsvFiles=0`、`schemaReadyRows=0`、`batch11QueueRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`、`canDisplayAsFact=false`。
- Batch 13 已生成 `tmp/exports/erp-owner-submission-pack-batch13-20260626/`：owner submission packet index 5 行、template manifest 5 行、field completion checklist 23 行、release packet matrix 9 行、handoff guide 5 行，并在 `owner-submission-templates/` 下生成 5 个空白模板；当前 `readyForBatch12Rows=0`、`submittedApprovalRecords=0`、`readyToDisplayRows=0`、`readyToExportRows=0`、`canDisplayAsFact=false`。
- Batch 14 已生成 `tmp/exports/erp-owner-submission-dropbox-watchlist-batch14-20260627/`：dropbox status 1 行、owner action queue 23 行、template distribution 5 行、release watchlist 9 行、command runbook 5 行；当前 `submissionCsvFiles=0`、`readyForBatch12Rows=0`、`batch11QueueRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`、`canDisplayAsFact=false`。
- Batch 15 已生成 `tmp/exports/erp-owner-submission-acceptance-gate-batch15-20260627/`：acceptance rulebook 6 行、acceptance result 23 行、evidence URI contract 4 行、release acceptance matrix 9 行、escalation queue 23 行；当前 `submissionCsvFiles=0`、`acceptedOwnerRecords=0`、`readyForBatch12Rows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`、`canDisplayAsFact=false`。
- Batch 16 已生成 `tmp/exports/erp-owner-submission-synthetic-fixture-batch16-20260627/` 和 `tmp/inputs/erp-owner-approval-submissions-batch12-synthetic/synthetic_owner_approval_records_batch16.csv`：synthetic owner records 23 行、fixture index 1 行、record fill audit 23 行、gate plan 4 行；当前为 `L2-fixture-or-dry-run`，`realApprovalRecordsApplied=0`、`promotionCandidateRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`、`canDisplayAsFact=false`。
- `/market/mtl`、`/market/category`、`/self` 已接入 gated 内部代理摘要；`/market` 已把原 `sam/som` 图表字段改成三层 TAM 口径，并显式标注 SAM/SOM 未建立。
- `/competition/region` 已接入 ERP numerator readiness；`/industry/supply` 只接入库存字段 readiness；`/users/channel`、`/users/store` 已接入 ds-049 hash 维表覆盖度，均不展示公开经营事实。
- `/ai-assistant`、评论、YouTube、网页评测、设计助手、知识库、AI图库、报告中心和报告预览已接入 Batch4 gate；评论、YouTube、网页评测、VOC趋势地图和VOC趋势报告已接入 Batch5 样本/eval/人工复核/发布 gate；设计助手和 AI 图库已接入 Batch6 requestId/model/cost/asset hash/商用审核 gate；`/market/mtl`、`/market/category`、`/self` 和 `/data` 已接入 Batch7 字段字典/品类复核/小计解释/展示审批 gate、Batch8 owner approval backlog、Batch9 owner approval intake/release gate、Batch10 owner record fill pack、Batch11 owner preflight/forbidden scan、Batch12 owner submission intake、Batch13 owner submission pack、Batch14 dropbox/watchlist、Batch15 acceptance gate 与 Batch16 synthetic fixture；仍不展示模型结论、评论统计、素材成本、素材可商用结论、ERP 原始经营值、虚拟审批或报告正文事实。

### 1.2 部署前判断

当前已经具备本地发布候选基础，但不建议直接部署生产。原因不是结构问题，而是数据解释权还未闭合：

- 全站页面数据还没有全部完成证据升级。多数页面仍依赖 L0、LO-S 或 connector-required source。
- ERP 已把销售快照、渠道快照和目标达成聚合拆成 hash 维表、品类代理映射、月度事实表、渠道增长快照和目标达成快照；Batch7 已补字段字典 readiness、品类复核队列、小计解释队列和展示审批 gate；Batch8 已补 owner approval packets 和审批 backlog；Batch9 已补审批记录 intake validation 与 release gate；Batch10 已补 owner record 回填模板和 submission readiness；Batch11 已补 owner record preflight 与 forbidden value scan；Batch12 已补 owner submission directory intake；Batch13 已补 owner submission templates、field checklist 和 handoff guide；Batch14 已补 dropbox/watchlist 和 owner action queue；Batch15 已补真实 owner CSV 进入 Batch12 前的 acceptance gate 和 escalation queue；Batch16 已补 synthetic owner records 演练包，但真实 owner approval、库存/价格/目标达成明细仍未闭合。
- 当前 ERP 可为市场、品类、自身经营、渠道、供应链、用户价值分层提供补充，但每个页面需要不同粒度、字段字典、品类映射和展示权限。
- `market_size_global` 仍应保留为外部 TAM/category TAM 分母；ERP 只能提供 Momcozy numerator 或内部趋势，不可替代 TAM/SAM 分母。

## 2. 证据等级与部署门禁

| 等级 | 当前含义 | 是否可上生产展示为事实 |
|---|---|---|
| L1 public/runtime | 公开来源、代码运行或本地审计可复现 | 可，但需标注口径 |
| L2 dry-run/fixture | dry-run、fixture、内部配置验证 | 不可展示为业务事实 |
| L3 read-only private | ERP/BI 只读导出或页面采集 | 只能 gated 展示，需内部权限语义 |
| L4 authorized live | 明确授权且有写入或发布审计 | 可按授权范围展示 |
| L0 / LO-S | 缺证据或合成样例 | 不可展示为事实 |

生产部署前的最小门禁：

1. 所有 L0 / LO-S / example 页面必须显式显示“待复核 / 样例 / gated / connector required”。
2. 所有导出 CSV 必须与页面使用同一数据源、同一 source_id、同一证据路径。
3. ERP private/internal 数据不得进入公开 KPI 卡片、公开市场份额、TAM/SAM/SOM 字段。
4. 数据管理页必须能追溯每个正式表的上游、source_id、证据等级、可展示范围和阻塞原因。
5. 生产部署后只做 read-only smoke，不做生产写入。

## 3. 页面级数据完成度

### 3.1 首页与治理页面

| 页面 | 当前状态 | ERP 融合机会 | 部署前任务 |
|---|---|---|---|
| `/` HomePage | 有 45 条 claim，2 个 L0、1 个 L2；首页混合市场、竞品、报告中心信号 | 可接入 ERP 内部趋势摘要，但只能展示 gated badge，不进公开 KPI | 首页 KPI 分成 public facts、internal gated、sample cards 三类 |
| `/data` DataManage | 结构已覆盖 96 表；`market_trend_monthly` 已加入 ds-047/048/049，AI 评论治理已加入 Batch5 四张表，AI设计/图库治理已加入 Batch6 四张表，ERP 字段字典/复核/小计/展示审批已加入 Batch7 四张表，owner approval 已加入 Batch8 五张表，Batch9 已加入 intake validation/release gate 四张表，Batch10 已加入 owner record template/readiness 四张表，Batch11 已加入 preflight/forbidden scan/handoff/release preflight 五张表，Batch12 已加入 submission inventory/schema/redaction/queue/readiness 五张表，Batch13 已加入 submission packet/template/checklist/release/handoff 五张表，Batch14 已加入 dropbox/action/distribution/watchlist/runbook 五张表，Batch15 已加入 acceptance rulebook/result/URI contract/release matrix/escalation queue 五张表，Batch16 已加入 synthetic record/fixture index/fill audit/gate plan 四张表 | 已新增 ERP 内部经营数据模块、Batch2/Batch3 高价值表格、评论/VOC样本治理队列、设计/图库发布门禁、ERP 展示审批门禁、owner approval backlog、release gate、record fill pack、preflight handoff gate、submission intake gate、owner submission pack、dropbox watchlist、acceptance gate 和 synthetic fixture | 继续补真实 owner approval records、库存/价格授权快照、真实评论样本、生成日志和商用审批 |
| `/data-source` DataSourcePage | source registry 展示已可追溯 | 可展示 ds-047/048/049 的 private/internal 状态 | 增加筛选：public/private、canDisplayAsFact、blockingReason |
| `/reports` ReportsPage | 报告元数据为 L2/connector-required | ERP 可支撑内部经营月报、渠道月报、品类趋势报告 | 报告卡片需标注 draft/gated，禁止装作已发布正式报告 |
| `/report/:id` ReportPreview | route 存在，当前 deep audit 未发现静态数值 | 可复用 report metadata 和 ERP evidence package | 报告预览需绑定 report-source manifest |

### 3.2 市场模块

| 页面 | 当前 source 状态 | ERP 可补充什么 | 不能补什么 | 优先级 |
|---|---|---|---|---|
| `/market` MarketPage | 8 个来源，4 个可展示，4 个 gated/open；ERP ds-047/048/049 已接入 gated | 月度内部销量代理、吸奶器关键词代理、内部渠道趋势 | TAM、SAM、SOM、公开市场份额、GMV | P0 |
| `/market/trend` MarketTrend | ds-003 L0，ds-004 LO-S | ERP 可补“需求侧内部动销趋势”和“渠道动销趋势”作为 PEST/五力辅助信号 | 宏观政策、行业竞争强度原始评分 | P1 |
| `/market/mtl` BreastPump | ds-005 L0 | ERP SKU/产品名称可生成吸奶器品类 SKU taxonomy 和内部销量结构 | 外部品类规模和竞品份额 | P0 |
| `/market/dtl` NursingProducts | ds-039 L0 | ERP 可补哺乳用品自有 SKU、内部销量、渠道结构 | Amazon BSR、竞品品牌份额 | P1 |
| `/market/consumables` BabyCare | ds-037 LO-S | ERP 可补自有 consumables SKU、内部动销 | 外部婴儿护理 TAM 和 Amazon 类目 rank | P1 |
| `/market/customs` CustomsData | ds-006 LO-S | ERP 可补出口目的地、渠道、仓发结构作为内部 proxy | 海关 HS 货值和第三方进出口数据 | P2 |
| `/market/category` CategoryAnalysis | ds-038 L0 | ERP 可补品类-产品-SKU-月份-渠道的事实表 | Amazon BSR、外部生命周期结论 | P0 |

### 3.3 竞争模块

| 页面 | 当前 source 状态 | ERP 可补充什么 | 仍需外部来源 | 优先级 |
|---|---|---|---|---|
| `/competition` CompetitionPage | ds-007 L0 | ERP 可补 Momcozy 自有 SKU/价格/渠道表现作为对照基线 | Amazon 竞品采集、竞品价格、评价、BSR | P1 |
| `/competition/new` NewCompetition | ds-008 L1 | ERP 可补新品上市后内部销量爬坡、渠道达成 | 竞品新品官网/新闻源 | P2 |
| `/competition/region` RegionCompetition | ds-010 L0，ds-050/ds-051 L3 private/internal gated numerator | ERP 已补全渠道YTD numerator readiness；仍无国家/渠道拆分 | Amazon Brand Analytics、NPD/IRI、零售面板分母 | P0 |
| `/competition/products` ProductManage | ds-009 L0 | ERP 可补自有产品规格、价格、SKU 状态，与竞品表 join | Amazon 竞品规格/价格/rating/review | P1 |

### 3.4 用户模块

| 页面 | 当前 source 状态 | ERP/内部系统可补充什么 | 仍需补充来源 | 优先级 |
|---|---|---|---|---|
| `/users` UsersPage | ds-043 可展示；ds-011、ds-012 open | ERP 单独不足；CRM/订单可补用户价值分层和购买周期 | QuestMobile 口径复核、CRM/RFM 授权、海外调研样本 | P1 |
| `/users/overseas` OverseasSentiment | ds-013 L0 | ERP 可补销量变化与社媒声量相关性，不可替代声量 | TikTok/IG/FB/YouTube 授权或公开代理 | P2 |
| `/users/consumer` ConsumerInterviews | ds-014 L0 | ERP 可辅助选择高价值/高复购样本，不可替代访谈 | 访谈样本、题纲、授权、脱敏记录 | P2 |
| `/users/channel` ChannelInterviews | ds-041 L0，ds-049 L3 hash维表 | ERP 已补渠道/客户/目的仓/运营 hash 维表覆盖度 | 渠道访谈原文、授权、样本定义 | P1 |
| `/users/store` StoreInterviews | ds-042 L0，ds-049 L3 hash维表 | 零售与渠道 ds-049 已补客户/目的仓/运营 hash 覆盖度 | 门店运营数据、访谈授权、门店口径 | P1 |
| `/users/aesthetics` Aesthetics | ds-040 LO-S | ERP 贡献有限，仅能按产品系列销量验证偏好结果 | 用户调研、图片偏好实验、地区样本 | P3 |

### 3.5 行业模块

| 页面 | 当前 source 状态 | ERP 可补充什么 | 仍需外部/人工来源 | 优先级 |
|---|---|---|---|---|
| `/industry` IndustryPage | ds-015 L1，ds-016 open | ERP 只能补内部暴露度，不能补行业概况 | 行业报告、法规条目级来源 | P2 |
| `/industry/regulation` RegulationDetail | CPSC source L1 | ERP 可补 SKU/目的国/渠道映射，用于合规影响范围 | 法务 SKU 分类、证书、官方法规文本 | P1 |
| `/industry/policy-insight` PolicyInsight | EU source L1，ds-016 open | ERP 可补国家/渠道/产品 exposure matrix | 法规条目级来源、合规责任人复核 | P1 |
| `/industry/news` IndustryNews | ds-034 L0 | ERP 不适合做新闻来源，可做事件影响验证 | 新闻条目级 URL、发布时间、摘要 hash | P2 |
| `/industry/tech` TechNews | ds-036 L0 | ERP 可补技术产品的内部动销表现 | 品牌官网、规格页、技术新闻 URL | P2 |
| `/industry/supply` SupplyChain | ds-035 LO-S，Batch3 仅字段 readiness | 已登记库存字段缺口，不含库存数值 | 仓库字段字典、库存快照、供应商授权；WMS/库存浏览器只读采集未形成可复现导出 | P0 |
| `/industry/ip` IPAnalysis | ds-017 L0 | ERP 只可补产品-SKU 映射，不可补专利来源 | WIPO/USPTO 条目采集、专利状态 | P2 |
| `/industry/exhibition` Exhibition | ds-018 L1 | ERP 可补展后相关 SKU/区域动销变化 | 展会官网和参展记录 | P3 |
| `/industry/flavor-map` FlavorMap | ds-032 L0 | ERP 可补销量表现作为功能偏好验证 | VOC 样本、关键词词典、NLP run | P1 |
| `/industry/flavor-report` FlavorReport | ds-033 LO-S | ERP 可补趋势验证和产品 impact | VOC 快照、模型版本、人工复核 | P1 |

### 3.6 自身经营模块

| 页面 | 当前 source 状态 | ERP 可补充什么 | 优先级 |
|---|---|---|---|
| `/self` SelfInsight | ds-019 L0，ds-020 LO-S | ERP 是核心数据源：自有 SKU、渠道、价格、销量、目标达成、BCG numerator | P0 |

自我洞察应从“样例战略画布”升级为“内部经营驾驶舱”：

- `momcozy_products`：由 ERP 产品/SKU 主数据填充。
- `pricing_strategy`：由 ERP 售价、ASP、促销价、渠道价填充。
- `channel_performance`：由 BI 全渠道目标达成、全渠道增长表现、销售统计聚合填充。
- `promotion_campaigns`：需要广告/活动系统，不宜只靠 ERP。

### 3.7 AI 助手与 AI 资产模块

| 页面 | 当前 source 状态 | ERP 可补充什么 | 仍需来源 | 优先级 |
|---|---|---|---|---|
| `/ai-assistant` AIAssistantPage | ds-025 LO-S | ERP 可作为工具建议的业务上下文 | AI 服务端调用日志、审计日志 | P2 |
| `/ai-assistant/review-analysis` ReviewAnalysis | ds-030 LO-S | ERP 可补产品和销量背景，不可替代评论 | 评论数据集、NLP 评估、人审一致率 | P1 |
| `/ai-assistant/youtube` YoutubeReview | ds-031 LO-S | ERP 可关联视频内容提及 SKU 的销量变化 | YouTube Data API、视频 ID 清单 | P2 |
| `/ai-assistant/design` DesignAssistant | ds-029 LO-S，Batch6 L2 gate | ERP 可补热销 SKU、价格带、渠道约束作为设计 brief | 真实模型 requestId、成本、资产hash、审核记录 | P2 |
| `/ai-assistant/knowledge` KnowledgeBase | ds-022 L2 | ERP 可成为知识库数据源之一，但需脱敏和版本管理 | 文档版本、索引、权限、更新日志 | P1 |
| `/ai-assistant/comment-data` CommentData | ds-021 L0 | ERP 可补产品维表和销量权重 | Amazon 评论、VOC、模型准确率 | P1 |
| `/ai-assistant/web-review` WebReview | ds-023 L0 | ERP 可补产品维表 | robots 合规、来源站点、爬取日志 | P2 |
| `/ai-gallery` AIGallery | ds-026 LO-S，Batch6 L2 gate | ERP 可补热销产品 brief，不可作为生成资产证据 | 真实生成请求、模型版本、资产hash、成本、审核状态 | P3 |

## 4. ERP 高价值表格内化机会

### 4.1 已沉淀

| ERP 来源 | 当前 source_id | 已用页面/表 | 当前边界 |
|---|---|---|---|
| 销售统计导出 | ds-047 | `/market`、`market_trend_monthly` | gated private/internal proxy |
| 售后销量统计导出 | ds-048 | `/market`、`market_trend_monthly` | gated private/internal proxy |
| 零售与渠道销量 UI 分页采集 | ds-049 | `/market`、`market_trend_monthly` | gated private/internal proxy，需解释小计差异 |
| ERP Batch2 派生包 | ds-047/ds-048/ds-049 | `erp_product_sku_dim`、`erp_category_mapping`、三张月度 fact、`/market/mtl`、`/market/category`、`/self` | 仅 hash/聚合代理，不含原始 SKU/客户/运营字段，`canDisplayAsFact=false` |

### 4.2 尚未正式沉淀但高价值

| ERP/BI 来源 | 当前状态 | 应沉淀为 | 目标页面 |
|---|---|---|---|
| 全渠道销售增长表现 | Batch3 已生成 gated artifact，ds-050 | `erp_channel_growth_snapshot` | `/self`、`/competition/region`、`/market/category` |
| 全渠道目标达成 | Batch3 已生成 gated artifact，ds-051 | `erp_channel_target_attainment` | `/self`、`/reports`、首页 gated 经营摘要 |
| 销售统计明细 | ds-047 已拆成月度代理事实 | `erp_sales_stat_detail`、字段字典升级 | 市场、品类、自身经营、渠道 |
| 售后销量统计明细 | ds-048 已拆成月度代理事实 | 售后率分母与字段字典 | 质量/售后趋势、产品体验 |
| 零售与渠道明细 | ds-049 已拆成月度代理事实和 SKU hash 维表 | 渠道/客户维表脱敏与小计差异解释 | 渠道访谈、门店访谈、区域竞争 |
| 产品/SKU 主数据 | 已有零售导出 hash 维表；仍缺正式产品主数据 | `erp_product_sku_dim` 字段字典升级 | 自有产品、品类分析、AI brief |
| 渠道/客户/运营维表 | Batch3 已生成 hash 维表，813 行 | `erp_channel_customer_dim` | 渠道表现、门店访谈、区域竞争 |
| 仓库/库存/在途/预占/冻结 | 尚未采集 | `erp_inventory_snapshot` | 供应链、合规影响范围、经营预警 |
| 价格/促销/ASP | 尚未采集 | `erp_pricing_weekly_fact` | 价格策略、竞品对比、自我洞察 |

### 4.3 数据管理页需要新增的治理对象

建议新增一个独立模块：`ERP内部经营数据`。不要把所有 ERP 字段塞进 `market_trend_monthly`。

| 表名 | 粒度 | 关键字段 | 用途 |
|---|---|---|---|
| `erp_source_artifacts` | 每次导出/采集 | source_id、artifact_path、sha256、row_count、captured_at、privacy_level、can_display_as_fact | 证据总账 |
| `erp_product_sku_dim` | SKU | sku、product_name、category、subcategory、product_line、lifecycle_status、launch_date | 全站 SKU join |
| `erp_sales_monthly_fact` | month x sku x channel x country/store | units、amount_cny、amount_usd、source_id、currency_policy | 市场趋势、自身经营 |
| `erp_after_sales_monthly_fact` | month x sku x issue/channel | after_sales_units、rate_base、source_id | 售后/体验 |
| `erp_retail_channel_monthly_fact` | month x sku x customer x destination x operator | retail_units、subtotal、visible_month_sum、subtotal_diff | 渠道/门店 |
| `erp_channel_target_attainment` | period x channel x platform | actual_sales_cny/usd、target_sales、actual_units、target_units、achievement_pct | 目标达成 |
| `erp_inventory_snapshot` | date x warehouse x sku | on_hand、available、reserved、frozen、in_transit、defective | 供应链 |
| `erp_field_dictionary` | source x field | field_name、business_meaning、unit、currency、nullable、hidden_column_behavior | 证据升级 |
| `erp_category_mapping` | sku/product x page category | raw_name、normalized_category、confidence、reviewer | 品类归一 |
| `erp_category_review_queue` | category x source group | normalized_category、review_priority、owner_action、blocking_reason、can_display_as_fact | 品类人工复核 |
| `erp_subtotal_reconciliation_queue` | source x reconciliation issue | source_id、issue_type、hidden_or_subtotal_behavior、owner_action、can_display_as_fact | 小计/隐藏列解释 |
| `erp_display_approval_gate` | table x page scope | table_name、source_ids、display_scope、approval_status、can_display_as_fact | ERP 数据展示审批 |

## 5. MECE 补充路线

### Track A：证据门禁与展示策略

- 把页面数字分成 `public fact`、`public proxy`、`internal gated`、`sample/demo`、`blocked` 五类。
- 对所有 L0/LO-S 页面加统一 `EvidenceGatePage` 或页面内 `PageEvidenceNotice`。
- 所有导出 CSV 增加 `source_id`、`evidence_grade`、`privacy_level`、`can_display_as_fact`。
- 防回归规则：禁止 L0/LO-S 数据进入 KPI、禁止 private/internal 数据在未授权时以公开事实展示。

### Track B：ERP 高价值表格采集与字典

- 第一批：销售统计、售后销量、零售与渠道、全渠道目标达成、全渠道增长表现。
- 第二批：SKU 主数据、渠道/客户/运营维表、价格/促销/ASP。
- 第三批：仓库/库存/在途/预占/冻结、不良品、供应商节点。
- 每张表必须有：导出路径、时间窗、行列数、hash、字段字典、单位、口径、权限、脱敏规则。

### Track C：页面能力内化

- 市场页从“外部研报看板”升级为“外部市场口径 + 内部动销 proxy 的双层看板”。
- 品类页从样例分析升级为 SKU taxonomy 与内部销量结构分析。
- 自我洞察从静态 4P/BCG 升级为 SKU、渠道、价格、目标达成的经营诊断。
- 供应链页从样例节点升级为库存/仓库/在途/冻结/预占的经营风险地图。
- 用户/AI 页面用 ERP 做产品和销量权重，不把 ERP 当作用户态度或社媒情感来源。

### Track D：外部交叉验证

- TAM/SAM/SOM：继续用公开研报和授权面板作为分母；ERP 只做 numerator。
- 竞品：Amazon/Vendor Central/Brand Analytics 为主，ERP 只提供自有品牌对照。
- VOC/评论：Amazon 评论、VOC/NLP、YouTube/社媒为主，ERP 做销量权重和 SKU 维表。
- 政策/IP/展会：官方来源为主，ERP 做 SKU exposure matrix。

## 6. 分批实施计划

### Batch 1：部署前最小闭环（已完成）

目标：让生产站点可部署，但所有未证实数据不越权展示。

- 页面级 gate：`/market`、`/data`、首页、`/self`、`/market/category`。
- DataManage 增加 `ERP内部经营数据` 与 `AI/报告治理` 对象；当前治理表总数已扩展到 96 张。
- `DataSourcePage` 支持 private/internal、canDisplayAsFact、blockingReason 可见。
- `market_trend_monthly` 导出与页面保持同一源。
- 重新运行 `data:audit`、`data:audit:deep`、`test`、`lint`、`build`、E2E。

### Batch 2：市场与自我洞察内化（已完成）

目标：把 ERP 变成市场洞察工作台的内部经营核心。

- 生成 `erp_product_sku_dim` 与 `erp_category_mapping`。
- 把 ds-047/048/049 聚合到 `erp_sales_monthly_fact`、`erp_after_sales_monthly_fact`、`erp_retail_channel_monthly_fact`。
- `/market/mtl`、`/market/category`、`/self` 接入 gated 内部事实。
- 增加 TAM/category TAM/SAM/SOM 口径说明，禁止混用。

已执行产物：

- `app/scripts/data/build-erp-derived-batch2.mjs` 与 `npm run data:erp:derive-batch2`。
- `tmp/exports/erp-derived-batch2-20260625/` 下 6 个 CSV 与 manifest。
- `app/src/data/market-insight-data.ts` 中 Batch2 gated 数据模型、TAM/SAM/SOM 边界。
- `DataManage` ERP 表字段已改为 hash/聚合代理口径。
- 验证：`data:audit`、`data:audit:deep`、`test`、`lint`、`build`、`test:e2e` 均通过。

### Batch 3：渠道、区域、供应链（治理产物已接入，库存真实数值仍阻断）

目标：把 ERP 的渠道和库存数据变成业务决策页面。

- 已生成 `app/scripts/data/build-erp-derived-batch3.mjs` 与 `npm run data:erp:derive-batch3`。
- 已沉淀全渠道目标达成、全渠道增长表现为 `private/internal L3` gated artifact。
- 已生成渠道/客户/目的仓/运营 hash 维表与目的仓月度代理；原始客户、仓库、运营、SKU、产品名不进入前端。
- `/competition/region` 已接入 ERP numerator readiness；仍必须等待外部分母和国家/渠道拆分，不能计算区域份额。
- `/users/channel`、`/users/store` 已接入零售与渠道 hash 维表覆盖度；访谈证据仍需单独补齐。
- `/industry/supply` 已接入库存字段 readiness；真实库存、在途、预占、冻结、不良品数值仍因缺授权导出而阻断。

### Batch 4：AI 与报告能力放大（治理产物已接入，模型/报告事实仍阻断）

目标：让 AI 助手围绕真实业务数据工作，而不是只展示功能入口。

- 已生成 `app/scripts/data/build-ai-report-governance-batch4.mjs` 与 `npm run data:ai-report:governance-batch4`。
- 已沉淀 `ai_dataset_manifest`、`ai_model_run_manifest`、`ai_human_review_gate`、`report_generation_queue`、`ai_erp_context_bridge` 五张治理表。
- AI 页面统一接入 `dataset_manifest`、`model_run_manifest`、`human_review_status` 的 gated readiness。
- 评论分析、VOC、YouTube、网页评测仍缺真实样本、模型评估和人工复核；ERP 只能作为采集优先级或brief上下文。
- 设计助手和AI图库的 requestId、模型版本、成本和商用审核缺口已进入 Batch6 gate；真实服务端生成日志和审批记录仍未补齐。
- 报告中心已生成内部经营月报、品类复盘、渠道复盘、供应链风险报告、竞品格局报告的队列项，但 `can_generate=false`，未生成正文或导出事实。

### Batch 5：评论/VOC/YouTube/Web 样本治理（样本级 gate 已接入，真实样本仍阻断）

目标：把评论类页面从“功能演示”推进到“样本清单、评估队列、人工复核和发布门禁”可追溯。

- 已生成 `app/scripts/data/build-ai-review-governance-batch5.mjs` 与 `npm run data:ai-review:governance-batch5`。
- 已沉淀 `ai_review_sample_manifest`、`ai_review_eval_queue`、`ai_review_human_queue`、`ai_review_publish_gate` 四张治理表。
- `CommentData`、`ReviewAnalysis`、`YoutubeReview`、`WebReview`、`FlavorMap`、`FlavorReport` 已接入 Batch5 gate。
- Batch5 仅登记样本合同、缺失采集窗口、模型/规则评估、人工复核和发布阻断；不包含原始评论正文、平台个人数据、客户标识、模型输出或真实趋势结论。
- 评论数量、情绪百分比、关键词排名、达人评分、站点评分、VOC趋势和报告结论仍必须等待授权样本、评估报告、人工审批和 claim-level source matrix。

### Batch 6：设计助手/AI图库生成资产治理（requestId、成本、hash、商用 gate 已接入，真实生成日志仍阻断）

目标：把设计助手和 AI 图库从“功能入口/素材展示”推进到“生成请求、资产hash、成本和商用审核”可追溯。

- 已生成 `app/scripts/data/build-ai-design-governance-batch6.mjs` 与 `npm run data:ai-design:governance-batch6`。
- 已沉淀 `ai_design_run_manifest`、`ai_design_asset_hash_manifest`、`ai_design_cost_queue`、`ai_design_commercial_review_gate` 四张治理表。
- `DesignAssistant`、`AIGallery` 已接入 Batch6 gate；页面只展示缺失证据、资产来源策略、成本队列阻断和审核阻断。
- Batch6 仅登记 requestId、模型版本、prompt/hash、资产hash、provider invoice、成本中心、品牌/法务/商用审核的缺失状态；不包含真实 prompt 正文、生成图片二进制、provider invoice、密钥、扣费或商用批准。
- 设计生成历史、素材成本、ROI、素材可商用、广告效果和报告视觉资产仍必须等待服务端代理日志、资产hash包、财务记录和人工审批。

### Batch 7：ERP 字段字典、品类复核、小计解释与展示审批（治理产物已接入，owner approval 仍阻断）

目标：把 ds-047/048/049/050/051 从“有内部导出证据”推进到“字段、单位、品类、隐藏列/小计、展示权限可逐项审核”。

- 已生成 `app/scripts/data/build-erp-governance-batch7.mjs` 与 `npm run data:erp:governance-batch7`。
- 已沉淀 `erp_field_dictionary_readiness` 61 行、`erp_category_review_queue` 5 行、`erp_subtotal_reconciliation_queue` 4 行、`erp_display_approval_gate` 9 行。
- `/market/mtl`、`/market/category`、`/self` 已接入 Batch7 字段覆盖、品类复核、小计解释和展示审批 gate。
- `DataManage` 已新增 `t_erp_field_dictionary` 升级、`t_erp_category_review_queue`、`t_erp_subtotal_reconciliation_queue`、`t_erp_display_approval_gate`，并把 `erp_display_approval_gate` 接到 `market_trend_monthly` 和 `dashboard_kpi` 的 lineage。
- Batch7 只使用本地已存在的 ERP 证据文件和前几批 manifest；未登录 ERP、未调用 provider、未写生产、未包含原始 SKU/产品/客户/运营/仓库业务值。
- 当前 79 条显示相关 gate 仍为 blocked，3 条品类复核为最高优先级，2 条小计/隐藏列解释仍未闭合；因此 ds-047/048/049/050/051 仍不能升级为公开事实。

### Batch 8：ERP owner approval packets 与审批 backlog（审批包已接入，真实审批记录仍阻断）

目标：把 Batch7 的字段、品类、小计和展示 gate 转成 owner 可填写、可审计、可回填的数据治理审批包。

- 已生成 `app/scripts/data/build-erp-owner-approval-batch8.mjs` 与 `npm run data:erp:owner-approval-batch8`。
- 已沉淀 `erp_field_owner_approval_packet` 5 行、`erp_category_owner_approval_packet` 5 行、`erp_subtotal_owner_explanation_packet` 4 行、`erp_display_approval_record_template` 9 行、`erp_owner_approval_backlog` 23 行。
- `/market/mtl`、`/market/category`、`/self` 已接入 Batch8 owner approval backlog 摘要；页面只展示审批包路径、待审批行数、审批记录应用数和阻断原因。
- `DataManage` 已新增 `t_erp_field_owner_approval_packet`、`t_erp_category_owner_approval_packet`、`t_erp_subtotal_owner_explanation_packet`、`t_erp_display_approval_record_template`、`t_erp_owner_approval_backlog`，并把 Batch7 gate 接到 Batch8 backlog 和 `market_trend_monthly` 的 release gate。
- Batch8 只使用 Batch7 本地治理产物；未登录 ERP、未调用 provider、未写生产、未包含原始 SKU/产品/客户/运营/仓库业务值。
- 当前 `approvalRecordsApplied=0`、`readyToDisplayRows=0`、`remainingBlockedRows=23`；因此 ds-047/048/049/050/051 仍不能升级为公开事实。

### Batch 9：ERP owner approval intake validation 与 release gate（校验器已接入，真实审批记录仍阻断）

目标：让真实 owner approval records 进入系统前先经过结构、证据 URI、审批人 hash、展示/导出决策和 promotion gate 的 fail-closed 校验。

- 已生成 `app/scripts/data/build-erp-owner-approval-intake-batch9.mjs` 与 `npm run data:erp:owner-approval-intake-batch9`。
- 已沉淀 `erp_owner_approval_intake_contract` 4 行、`erp_owner_approval_validation_result` 23 行、`erp_owner_approval_release_gate` 9 行、`erp_owner_approval_promotion_manifest` 0 行。
- `/self` 已接入 Batch9 validation summary 和 artifact 清单；页面只展示 intake 结构、阻断数量和 release gate 状态。
- `DataManage` 已新增 `t_erp_owner_approval_intake_contract`、`t_erp_owner_approval_validation_result`、`t_erp_owner_approval_release_gate`、`t_erp_owner_approval_promotion_manifest`，并把 Batch8 backlog 接到 Batch9 validation，再接到 dashboard KPI、CSV export 和 promotion manifest 的 release gate。
- Batch9 默认无审批记录输入；当前 `approvalRecordsInputRows=0`、`passedValidationRows=0`、`blockedValidationRows=23`、`readyReleaseGateRows=0`、`promotionCandidateRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`。
- Batch9 不伪造审批、不自动 promotion；即使后续真实审批记录通过结构校验，仍需人工 release review 后才能把 ds-047/048/049/050/051 升级到可展示或可导出范围。
- Batch9 只读取 Batch8 本地 backlog 和可选审批 CSV；未登录 ERP、未调用 provider、未写生产、未包含原始 SKU/产品/客户/运营/仓库业务值。

### Batch 10：ERP owner approval record fill pack（回填模板已接入，真实审批记录仍阻断）

目标：把 Batch8 backlog 和 Batch9 intake contract 转成 owner 可填写、可提交、可审计的记录模板，减少真实审批记录回填时的字段错位。

- 已生成 `app/scripts/data/build-erp-owner-approval-record-template-batch10.mjs` 与 `npm run data:erp:owner-approval-template-batch10`。
- 已沉淀 `erp_owner_approval_owner_packet_index` 4 行、`erp_owner_approval_record_input_template` 23 行、`erp_owner_approval_required_evidence_matrix` 23 行、`erp_owner_approval_submission_readiness` 9 行。
- `/self` 已接入 Batch10 fill pack 摘要；页面只展示模板行数、空 decision 数量、submission readiness 和后续 validator 路径。
- `DataManage` 已新增 `t_erp_owner_approval_owner_packet_index`、`t_erp_owner_approval_record_input_template`、`t_erp_owner_approval_required_evidence_matrix`、`t_erp_owner_approval_submission_readiness`，并把 Batch8 backlog、Batch9 contract、Batch9 release gate 接到 Batch10 回填模板和 readiness。
- Batch10 默认只预填 `approval_item_id`、lane、source、受控表和必填字段；`approval_decision`、审批人hash、日期、审批URI仍为空，当前 `blankDecisionRows=23`、`submittedOwnerRecords=0`。
- Batch10 不应用审批、不自动运行 release promotion；owner 填写后必须用 Batch9 `--approval-records` 校验，再经过 manual release review。
- Batch10 只读取本地 Batch8/Batch9 产物；未登录 ERP、未调用 provider、未写生产、未包含原始 SKU/产品/客户/运营/仓库业务值。

### Batch 11：ERP owner approval preflight 与 forbidden value scan（预检已接入，真实审批记录仍阻断）

目标：在 owner records 进入 Batch9 validator 前增加 fail-closed 预检，提前拦截空字段、审批角色不合规、证据 URI 不合规、展示/导出决策不完整和 forbidden raw value 泄露风险。

- 已生成 `app/scripts/data/build-erp-owner-approval-preflight-batch11.mjs` 与 `npm run data:erp:owner-approval-preflight-batch11`。
- 已沉淀 `erp_owner_approval_preflight_rulebook` 6 行、`erp_owner_approval_preflight_result` 23 行、`erp_owner_approval_forbidden_value_scan` 23 行、`erp_owner_approval_batch9_handoff_queue` 0 行、`erp_owner_approval_release_preflight_summary` 9 行。
- `/self` 已接入 Batch11 preflight 摘要；页面只展示预检行数、阻断行数、forbidden scan 命中数、Batch9 handoff 行数和不可展示状态。
- `DataManage` 已新增 `t_erp_owner_approval_preflight_rulebook`、`t_erp_owner_approval_preflight_result`、`t_erp_owner_approval_forbidden_value_scan`、`t_erp_owner_approval_batch9_handoff_queue`、`t_erp_owner_approval_release_preflight_summary`，并把 Batch10 template/readiness 接到 Batch11 preflight，再接到 Batch9 handoff queue 和 release preflight summary。
- Batch11 默认读取 Batch10 空白回填模板；当前 `readyForBatch9Rows=0`、`blockedPreflightRows=23`、`forbiddenHitRows=0`、`batch9HandoffRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`。
- Batch11 不应用审批、不伪造审批、不自动 promotion；只有通过预检的真实 owner records 才能进入 Batch9 `--approval-records` validator，再进入 manual release review。
- Batch11 只读取本地 Batch10 产物和可选审批 CSV；未登录 ERP、未调用 provider、未写生产、未包含原始 SKU/产品/客户/运营/仓库业务值。

### Batch 12：ERP owner submission intake directory audit（提交目录审计已接入，真实审批记录仍阻断）

目标：在 owner records 进入 Batch11 preflight 前增加本地提交目录审计，先确认是否存在真实CSV、schema是否与Batch10模板对齐、是否有禁用raw value风险，以及是否可以形成Batch11 `--approval-records` 队列。

- 已生成 `app/scripts/data/build-erp-owner-submission-intake-batch12.mjs` 与 `npm run data:erp:owner-submission-intake-batch12`。
- 已沉淀 `erp_owner_submission_intake_inventory` 1 行、`erp_owner_submission_schema_audit` 23 行、`erp_owner_submission_redaction_audit` 23 行、`erp_owner_submission_batch11_queue` 0 行、`erp_owner_submission_release_readiness` 9 行。
- `/self` 已接入 Batch12 submission intake 摘要；页面只展示提交目录、CSV文件数、schema ready行数、Batch11 queue行数和不可展示状态。
- `DataManage` 已新增 `t_erp_owner_submission_intake_inventory`、`t_erp_owner_submission_schema_audit`、`t_erp_owner_submission_redaction_audit`、`t_erp_owner_submission_batch11_queue`、`t_erp_owner_submission_release_readiness`，并把 Batch10 template/readiness 接到 Batch12 submission intake，再接到 Batch11 preflight 和 release readiness。
- Batch12 默认读取 `tmp/inputs/erp-owner-approval-submissions-batch12`；当前目录不存在，`submissionCsvFiles=0`、`submittedApprovalRecords=0`、`schemaReadyRows=0`、`batch11QueueRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`。
- Batch12 不应用审批、不伪造审批、不自动 promotion；真实owner CSV进入目录后，仍需依次通过 Batch12 schema/redaction audit、Batch11 preflight、Batch9 validator 和 manual release review。
- Batch12 只读取本地Batch10/Batch11产物和可选submission目录；未登录ERP、未调用provider、未写生产、未包含原始SKU/产品/客户/运营/仓库业务值，也不回显审批CSV中的raw字段值。

### Batch 13：ERP owner submission pack（提交模板包已接入，真实审批记录仍阻断）

目标：在真实 owner records 进入 Batch12 目录前，先提供可分发、可校验、可追踪的 combined/lane 模板和字段补全清单，降低 owner 回填字段错位和证据URI缺失风险。

- 已生成 `app/scripts/data/build-erp-owner-submission-pack-batch13.mjs` 与 `npm run data:erp:owner-submission-pack-batch13`。
- 已沉淀 `erp_owner_submission_packet_index` 5 行、`erp_owner_submission_template_manifest` 5 行、`erp_owner_submission_field_completion_checklist` 23 行、`erp_owner_submission_release_packet_matrix` 9 行、`erp_owner_submission_handoff_guide` 5 行。
- `/self` 已接入 Batch13 owner submission pack 摘要；页面只展示模板目录、目标提交目录、模板行数、checklist行数和不可展示状态。
- `DataManage` 已新增 `t_erp_owner_submission_packet_index`、`t_erp_owner_submission_template_manifest`、`t_erp_owner_submission_field_completion_checklist`、`t_erp_owner_submission_release_packet_matrix`、`t_erp_owner_submission_handoff_guide`，并把 Batch10 owner record template 接到 Batch13 submission pack，再接回 Batch12 intake。
- Batch13 生成的空白模板只保存在 `tmp/exports/erp-owner-submission-pack-batch13-20260626/owner-submission-templates/`；不会写入 `tmp/inputs/erp-owner-approval-submissions-batch12`，当前 `readyForBatch12Rows=0`、`submittedApprovalRecords=0`、`readyToDisplayRows=0`、`readyToExportRows=0`。
- Batch13 不应用审批、不伪造审批、不自动 promotion；真实owner CSV仍需放入Batch12 input目录，再通过 Batch12、Batch11、Batch9 和 manual release review。
- Batch13 只读取本地Batch10/Batch12产物；未登录ERP、未调用provider、未写生产、未包含原始SKU/产品/客户/运营/仓库业务值。

### Batch 14：ERP owner submission dropbox watchlist（提交监控已接入，真实审批记录仍阻断）

目标：在 owner 模板分发后、真实CSV进入 Batch12 前，提供只读dropbox状态、owner action queue、模板分发清单、release watchlist 和命令runbook，避免把“等待提交”误判为“审批已完成”。

- 已生成 `app/scripts/data/build-erp-owner-submission-dropbox-watchlist-batch14.mjs` 与 `npm run data:erp:owner-submission-dropbox-batch14`。
- 已沉淀 `erp_owner_submission_dropbox_status` 1 行、`erp_owner_submission_owner_action_queue` 23 行、`erp_owner_submission_template_distribution` 5 行、`erp_owner_submission_release_watchlist` 9 行、`erp_owner_submission_command_runbook` 5 行。
- `/self` 已接入 Batch14 dropbox/watchlist 摘要；页面只展示CSV文件数、owner action行数、release watch行数、Batch12 readiness和Batch11 queue。
- `DataManage` 已新增 `t_erp_owner_submission_dropbox_status`、`t_erp_owner_submission_owner_action_queue`、`t_erp_owner_submission_template_distribution`、`t_erp_owner_submission_release_watchlist`、`t_erp_owner_submission_command_runbook`，并把 Batch13 templates/checklist/release matrix 接到 Batch14 watchlist，再接回 Batch12/B11/B9链路。
- Batch14 当前只读检查 `tmp/inputs/erp-owner-approval-submissions-batch12`；目录仍不存在，`submissionCsvFiles=0`、`readyForBatch12Rows=0`、`batch11QueueRows=0`。
- Batch14 不创建input目录、不读取审批CSV内容、不应用审批、不伪造审批、不自动 promotion；真实owner CSV到达后仍需重新运行 Batch12、Batch11、Batch9 和 manual release review。
- Batch14 只读取本地Batch13/Batch12产物；未登录ERP、未调用provider、未写生产、未包含原始SKU/产品/客户/运营/仓库业务值。

### Batch 15：ERP owner submission acceptance gate（提交接收门禁已接入，真实CSV仍待owner提供）

目标：在 Batch14 确认真实CSV尚未到达后，为 Batch12、Batch11、Batch9 前置一个明确的 acceptance gate，逐项判断 23 条 owner approval item 是否具备接收条件，并把缺口转成 escalation queue。

- 已生成 `app/scripts/data/build-erp-owner-submission-acceptance-gate-batch15.mjs` 与 `npm run data:erp:owner-submission-acceptance-batch15`。
- 已沉淀 `erp_owner_submission_acceptance_rulebook` 6 行、`erp_owner_submission_acceptance_result` 23 行、`erp_owner_submission_evidence_uri_contract` 4 行、`erp_owner_submission_release_acceptance_matrix` 9 行、`erp_owner_submission_escalation_queue` 23 行。
- `/self` 已接入 Batch15 acceptance gate 摘要；页面只展示acceptance行数、URI contract行数、release gate行数、Batch12 readiness和accepted owner record数量。
- `DataManage` 已新增 `t_erp_owner_submission_acceptance_rulebook`、`t_erp_owner_submission_acceptance_result`、`t_erp_owner_submission_evidence_uri_contract`、`t_erp_owner_submission_release_acceptance_matrix`、`t_erp_owner_submission_escalation_queue`，并把 Batch14 owner action/watchlist/runbook 与 Batch13 checklist 接到 Batch15 acceptance，再回流到 Batch12/B11/B9链路。
- Batch15 当前只读取 Batch13 checklist 与 Batch14 watchlist/action/runbook 产物；不创建input目录、不读取审批CSV内容、不应用审批、不伪造审批、不自动 promotion。
- 当前 `submissionCsvFiles=0`、`acceptedOwnerRecords=0`、`readyForBatch12Rows=0`、`batch11QueueRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`。
- 真实owner CSV到达后必须先重新运行 Batch14 和 Batch15，再运行 Batch12 intake audit、Batch11 preflight、Batch9 validation 和 manual release review。

### Batch 16：ERP owner submission synthetic fixture（虚拟记录已填充，只能用于dry-run）

目标：在真实 owner records 尚未到达时，用明确标记的虚拟审批记录跑通 Batch12、Batch11、Batch9 的语法链路，提前检查字段、hash、URI、禁用值和release gate流转，但不把虚拟记录升级为真实审批。

- 已生成 `app/scripts/data/build-erp-owner-submission-synthetic-fixture-batch16.mjs` 与 `npm run data:erp:owner-submission-synthetic-batch16`。
- 已写入 `tmp/inputs/erp-owner-approval-submissions-batch12-synthetic/synthetic_owner_approval_records_batch16.csv`，共 23 行，全部为 `L2-fixture-or-dry-run`、`synthetic/internal`、`can_display_as_fact=false`。
- 已沉淀 `erp_owner_submission_synthetic_fixture_index` 1 行、`erp_owner_submission_synthetic_record_fill_audit` 23 行、`erp_owner_submission_synthetic_gate_plan` 4 行。
- `/self` 已接入 Batch16 synthetic fixture 摘要；页面只展示synthetic行数、dry-run readiness、promotion=0和展示/导出仍为0。
- `DataManage` 已新增 `t_erp_owner_submission_synthetic_record`、`t_erp_owner_submission_synthetic_fixture_index`、`t_erp_owner_submission_synthetic_record_fill_audit`、`t_erp_owner_submission_synthetic_gate_plan`，并把 Batch10 record template 接到 synthetic records，再接到 dry-run gate plan。
- 本地 no-write 演练结果：Batch12 synthetic intake 23 行 schema-ready、Batch11 synthetic preflight 23 行 ready、Batch9 synthetic validation 23 行通过语法校验，但 `promotionCandidateRows=0`、`readyToDisplayRows=0`、`readyToExportRows=0`。
- Batch16 不写真实 `tmp/inputs/erp-owner-approval-submissions-batch12/`，不应用审批、不调用ERP、不调用provider、不写生产、不自动 promotion；manual release review 只能接受真实 owner records。

## 7. 生产部署前未完成清单

P0：

- ERP 字段字典、品类人工复核、小计解释和展示审批已形成 Batch7 gate，Batch8 已生成 owner approval packets 和 23 条审批 backlog，Batch9 已生成 intake validation 与 release gate，Batch10 已生成 owner record fill pack，Batch11 已生成 owner record preflight 与 forbidden value scan，Batch12 已生成 owner submission intake directory audit，Batch13 已生成 owner submission templates/checklist/handoff guide，Batch14 已生成 dropbox watchlist 和 owner action queue，Batch15 已生成 acceptance gate 和 escalation queue，Batch16 已生成 synthetic fixture；真实 owner approval records 未放入提交目录、通过 Batch15 acceptance、Batch12 schema/redaction audit、Batch11 preflight、Batch9 validator 并完成 release review 前，ds-047/048/049/050/051 不能升级为公开事实。
- `/industry/supply` 仍缺库存/仓库/在途/预占/冻结/不良品等真实 ERP 表支撑。
- 首页 KPI 需要继续拆分 public / gated / sample，避免内部代理进入公开指标卡。
- 全渠道目标达成和增长表现已有 Batch3 L3 gated 聚合快照，Batch7/Batch8/Batch9/Batch10/Batch11/Batch12/Batch13/Batch14/Batch15/Batch16 已补字段 readiness、审批包、审批记录校验、release gate、回填模板、预检扫描、提交目录审计、owner提交模板包、dropbox watchlist、acceptance gate 和 synthetic fixture，但缺正式月度导出、国家/渠道拆分和真实 owner approval records。

P1：

- `/competition/region`、`/competition/products` 缺 Amazon 或授权竞品来源；ERP 可补自有对照。
- `/users/channel`、`/users/store` 已由 ds-049 补充渠道/客户/运营 hash 维表，但仍需访谈证据和授权样本定义。
- `/ai-assistant/review-analysis`、`/ai-assistant/comment-data`、`/ai-assistant/youtube`、`/ai-assistant/web-review`、`/industry/flavor-map`、`/industry/flavor-report` 已接入 Batch4/Batch5 gate，但仍需要真实评论/VOC/YouTube/Web 样本、模型评估和人工复核一致率。
- `/ai-assistant/design`、`/ai-gallery` 已接入 Batch4/Batch6 gate，但仍需要服务端生成日志、真实 requestId、模型版本、资产hash、provider invoice、成本中心和品牌/法务/商用审批。
- `/industry/policy-insight`、`/industry/regulation` 需要法规条目级来源和 SKU exposure matrix。

P2/P3：

- `/industry/news`、`/industry/tech`、`/industry/ip`、`/industry/exhibition` 需要条目级公开来源。
- `/users/aesthetics` 需要调研/实验日志；AI图库和设计助手已接入 Batch4/Batch6 gate，但不能由 ERP 直接填充生成事实。

## 8. 验收口径

部署前验收：

- `npm run data:audit`：0 issue。
- `npm run data:audit:deep`：source gap 可存在，但所有 gap 必须进入 gated/backlog，且页面不越权展示。
- `npm run test`、`npm run lint`、`npm run build` 全通过。
- E2E route sweep 覆盖桌面/移动端，确认没有旧错误 literal、没有 private/internal 数据伪装公开事实、没有导出源错位。
- 敏感词扫描覆盖 `tmp/exports`、`tmp/audits`、`app/src`，避免 token、签名、session、cookie、secret 进入站点或仓库。

部署后验收：

- production read-only smoke：HashRouter 入口、首页、市场页、数据管理页、数据源页。
- 验证生产页面只显示允许展示的 public facts 和 gated internal proxy。
- 生产导出 CSV 抽样检查 source_id、evidence_grade、privacy_level、can_display_as_fact。

## 9. 下一步建议

Batch16 的 synthetic owner records 已接入，并已证明 Batch12/Batch11/Batch9 的语法链路可演练。下一步应让真实 owner records、授权导出、外部分母、真实样本和审批证据进入治理链，让 gated 内部能力逐步升级：

1. 由对应 owner 填写 Batch13 `combined_owner_submission_template.csv` 或四个 lane 模板，并用 Batch14 `erp_owner_submission_owner_action_queue.csv`、Batch15 `erp_owner_submission_acceptance_result.csv` 和 Batch16 synthetic fixture 的字段样式逐项检查：必须补齐 approval decision、审批角色、审批人 hash、日期、证据 URI、展示/导出决策和 forbidden display 确认；合并后的真实CSV放入 `tmp/inputs/erp-owner-approval-submissions-batch12/` 后先运行 Batch14 dropbox watchlist确认文件到达，再运行 Batch15 acceptance gate确认接收条件，再运行 Batch12 intake audit，再由 Batch12 queue 触发 Batch11 `--approval-records` 预检，生成 handoff queue 后再运行 Batch9 `--approval-records` 校验，完成 release review 前仍保持 `canDisplayAsFact=false`。
2. 获取全渠道目标达成、全渠道增长表现的正式月度导出和国家/渠道拆分，不再只依赖 YTD 聚合。
3. 采集库存/仓库/在途/预占/冻结/不良品授权快照，替换 `/industry/supply` 当前 readiness-only 状态。
4. 为 Batch5 的 `ai_review_sample_manifest`、`ai_review_eval_queue`、`ai_review_human_queue` 补授权样本、采集窗口、hash、模型/规则评估报告和人工复核一致率。
5. 为 Batch6 的 `ai_design_run_manifest`、`ai_design_asset_hash_manifest`、`ai_design_cost_queue`、`ai_design_commercial_review_gate` 补服务端 requestId、模型版本、成本、资产hash、provider invoice 和商用审核记录。
6. 为 `report_generation_queue` 补 claim-level source matrix 和人工审批后，再开放报告正文生成或导出。
