---
title: mkt53 全网页数据完整性 MECE 排查与执行 TODO
created_at: 2026-07-29
baseline_commit: cead7b7
evidence_scope: local-read-only-and-local-code-change
production_writes: false
provider_calls: false
restricted_connector_access: false
---

<!-- markdownlint-disable MD013 MD025 MD060 -->

# mkt53 全网页数据完整性 MECE 排查与执行 TODO

## 1. 结论

当前应用的“证据安全”明显强于“业务数据完整性”：

- 46 条声明路由中有 45 条业务路由和 1 条 404 路由。
- 45 条业务路由已全部绑定至少一个 source registry 来源，不再存在审计矩阵漏映射。
- 855 条当前可见数字/导出声明全部处于低风险，high / medium / unsupported 均为 0。
- 但来源就绪度只有 4 条路由为 `source-backed`，22 条为 `partial`，19 条为 `blocked`。
- 45/45 条业务路由已经建立唯一 target metric contract，覆盖公式、粒度、单位、分母、窗口、owner、SLA、允许比较和禁止推断；机器校验 0 missing / 0 unexpected / 0 invalid。
- `source-backed` 只表示当前 claim scope 内有可展示来源，不等于页面已经“决策就绪”。45 份合同均为 `definition-only`，不含指标值、不证明已采集数据；当前 decision-ready 路由仍为 0。
- 53 个来源中，22 个为 L1 公开/运行时证据、5 个为 L3 生产只读快照、14 个为 L0 未验证、10 个为合成示例、2 个为 L2 fixture/dry-run；26 个来源当前不得展示为业务事实。

本轮没有补造业务数字。Wave 0 已把原来会漏掉“零数字声明页面”的路由审计修成 45/45 来源覆盖；DQ-010 将逐页目标指标写入 `app/contracts/route-target-metrics.json`；DQ-011 已把深审计矩阵投影为 45/45 路由可见的“来源就绪度 + 决策就绪度”双层状态；DQ-012 已将 `/industry/macro` 与 `/industry/reports` 拆为独立职责页面；DQ-013 已为 4 个 source-backed 页面建立业务复核候选包，并把 AI 根页转入显式 AI/VOC 阻断治理；DQ-014 已更新 ds-002、ds-044、ds-045 的公开报告人工凭证，其中前两项仅保留限定 L1 公开语境，ds-045 因公开页内部口径冲突继续阻断；DQ-015 已为消费者访谈、美学研究、门店访谈、CPSC 与 EU MDR/IVDR 建立五份 source-specific owner packets，55 个必填证据槽位仍全部 missing；DQ-016 已建立 53 来源 freshness 合同、确定性投影、运行时评分与页面级过期告警，5 个 L3 ERP 来源保留历史等级但因当前 artifact/hash 合同/refresh receipt 缺失而全部 fail closed；DQ-017 已把过期半月计划、错误模块数、伪 JSX、未接入日/周频和无 owner 回执的法规进度改为 fail-closed 展示；DQ-020 已完成七源本地 intake 合同、67 条最低私有映射规则、133 个必填证据槽位与 fail-closed 校验，并完成私有路径/权限/coverage/readiness 的脱敏盘点，但正式 mapping/readiness 文件仍不存在，67/67 映射无效且真实 owner、授权、ASIN/SKU、站点/窗口、字段字典及 snapshot hash 仍全部为 0，因此总体门禁继续阻断。所有页面仍明确保持 0 decision-ready。当前第一项未闭环门禁仍是 DQ-020 的私有 owner 证据。

## 2. 事实、推断与未验证项

### 已验证事实

- 当前分支为 `main`，审计起点为 `cead7b7`，起点工作树干净。
- 本地一致性审计：45 个页面组件、107 张数据表、107/107 governance、53 个来源、0 issue。
- 2026-08-09 深度审计：46 routes、85 个扫描文件、855 claims、12 个 CSV export claims、0 high、0 medium、0 unsupported。
- 页面来源就绪度：19 blocked / 22 partial / 4 source-backed / 0 unmapped。
- 目标指标合同：45 expected / 45 covered / 45 unique metrics / 0 missing / 0 unexpected / 0 invalid / 0 decision-ready。
- 2026-08-09 DQ-020 Owner submission 门禁后当前复核通过 8/8 本地 release evidence：37 个测试文件、266/266 串行单测、lint、0 vulnerabilities、2397 modules build、85/85 bundle assets、数据一致性 0 issue、855 claims 深审计 0 high/medium/unsupported、完整 E2E 154/154；其中 45 路由 × 桌面/移动来源门禁为 90/90。

### 可据此做出的推断

- 最大瓶颈不是再增加静态图表，而是补齐目标指标合同、授权快照、人工研究证据、模型评估和 owner review。
- 首页、数据管理和来源管理页聚合多个域，单一“已复核”标签不足以表达内部代理、公开语境和未授权连接器之间的差异。
- `/industry/macro` 与 `/industry/reports` 已分别承担宏观指标治理和行业报告版本治理；两页仍因指标字典、官方宏观数据、报告目录、不可变版本、审批与撤回链路缺失而保持 `partial / not-ready`。
- `/market/trend`、`/industry/tech`、`/industry/ip` 与 `/industry/exhibition` 已具备模型合同、证据范围、允许/禁止用途、owner 和待签核项，可进入业务复核，但仍是 `source-backed / not-ready`。
- `/ai-assistant` 已显式展示授权评论/VOC 数据、模型评估与人工一致率、provider request lineage 三类阻断，仍是 `partial / not-ready`，且本门禁没有 provider 调用或生产写入。

### 尚未验证

- 任何 Amazon、Brand Analytics、CRM、社交媒体、YouTube、VOC/NLP、Import Genius 或 AI provider 的真实连接状态。
- 2026-08-01 09:00 半月 cron 是否首次按计划成功执行。
- 2026-08-09 执行本地半月候选刷新后，manifest 已推进为 `2026-08-H1`，`nextScheduledAt=2026-08-16T09:00:00+08:00`；刷新前的 `2026-07-H2` 过期计划已被页面正确标红。两者都只是本地候选证据，不证明 2026-08-01 生产 cron 成功或失败。
- 本轮代码尚未部署；本文件也不构成生产数据已经补齐的证据。

## 3. MECE 排查模型

### 3.1 业务域：每条业务路由只归入一个主域

1. `navigation_misc`：首页与跨域导航。
2. `market_size_share_trend`：市场规模、份额、趋势、品类和海关。
3. `competitor_price_rank_product`：竞品、价格、排名、产品和区域竞争。
4. `user_voc_interview_social`：用户、画像、社媒、评论和访谈。
5. `industry_policy_ip_exhibition_supply`：行业、法规、专利、展会、技术和供应链。
6. `self_business_channel_promo`：自有经营、渠道、定价和促销。
7. `ai_analysis_output`：AI 分析、生成、知识库和网页处理。
8. `reports_exports_governance`：报告、导出、数据目录与来源治理。

### 3.2 数据生命周期：每页按同一组互不替代的门检查

1. **决策问题**：页面要支持什么决策，谁使用，错误决策的代价是什么。
2. **指标合同**：指标名、公式、分子、分母、单位、币种、时区、粒度和允许比较范围。
3. **采集合同**：来源、授权方式、窗口、站点/国家、实体映射、row count、hash 和重试策略。
4. **质量合同**：完整性、唯一性、时效性、异常、对账、抽样复核和模型评估。
5. **证据与审批**：snapshot id、evidence grade、reviewer、decision、ETag、撤回和审计日志。
6. **展示与导出**：claim scope、freshness、样例标签、空态、跨分母禁用和 CSV 同口径。
7. **运行与责任**：owner、SLA、刷新频率、失败告警、回滚、成本和权限。

只有七个生命周期门都通过，页面才可标记为 `decision-ready`。当前脚本中的 `source-backed` 仅代表第 3/5/6 门在有限 claim scope 内可用。

## 4. 逐页排查矩阵

状态含义：

- `blocked`：当前绑定来源均不可作为业务事实。
- `partial`：有可展示来源，但仍混有阻断来源或明确 scope gap。
- `source-backed`：当前登记来源均可在其 claim scope 内展示；仍需目标指标合同才能升级为 decision-ready。

### 4.1 首页与市场

| 路由 | 状态 | 当前可用边界 | 主要缺口 | 下一动作 | 优先级 |
|---|---|---|---|---|---|
| `/` | partial | 聚合公开语境、L3 ERP proxy 和治理状态 | 混入 3 个阻断来源；首页无法区分决策可用与仅登记 | 按角色拆分“可决策 / 待补证 / 仅治理”，隐藏无目标合同 KPI | P0 |
| `/market` | partial | TAM、segment TAM、公开兴趣代理、L3 ERP count proxy | 10 个 scope gap；品牌份额、SAM/SOM、自动刷新未闭环 | 建立 TAM/SAM/SOM/渠道 proxy 分表合同，补人工报告凭证和 ERP freshness | P0 |
| `/market/trend` | source-backed | PEST 官方语境、内部五力模型输入与 `trend-signal-review-v1` 复核候选包 | 实际权重、情景实例和 owner 签核仍缺失 | 补权重/情景实例、逐条引用、reviewer 与 owner approval | P1 |
| `/market/mtl` | partial | 全球 TAM、segment-TAM 与 L3 ERP 内部 proxy | ERP 自动刷新、SAM/SOM、地域和可服务范围不在当前 claim scope | 增加 freshness 与地域×渠道×可服务范围测算表，禁止由 TAM 推导 SOM | P1 |
| `/market/dtl` | blocked | 仅保留来源/治理说明 | 缺 Amazon 类目任务、品牌与 ASIN 映射、窗口、快照和 hash | 完成 Amazon owner intake；授权后生成类目快照并过 release review | P0 |
| `/market/consumables` | blocked | 仅保留报告入口和治理说明 | 缺 baby-care ontology、类目边界、映射、权重和可复算表 | 先定 ontology 和计算合同，再接授权类目快照 | P0 |
| `/market/customs` | blocked | Census/CBP 公开入口与 HTS 语境 | 缺 HS 清单、国家/窗口、shipment/公司级授权快照 | owner 确认查询合同；授权 Import Genius/数仓快照后再展示贸易事实 | P0 |
| `/market/category` | partial | L3 ERP 内部 proxy 可受限展示 | 缺 BSR 快照、SKU 映射、权重公式和复算表 | 将内部 proxy 与外部 category scorecard 分层，补公式和 Amazon 快照 | P0 |

### 4.2 竞争

| 路由 | 状态 | 当前可用边界 | 主要缺口 | 下一动作 | 优先级 |
|---|---|---|---|---|---|
| `/competition` | blocked | 公开品牌入口和 Amazon readiness gate | 缺授权快照、SKU/ASIN、站点、字段、row count、hash | 完成 `p0-amazon-connector-owner-01`，建立竞品实体和变更事件 | P0 |
| `/competition/new` | partial | 官方产品页/新闻支持新品线索 | TAM 供应商人工凭证波动；平台销量/排名不支持 | 将“发布事实”和“商业表现”拆开，补事件时间线与人工确认 | P1 |
| `/competition/region` | partial | L3 内部渠道增长/目标 proxy | 缺 marketplace/国家合同、Amazon BA 和外部渠道分母 | 禁止跨分母排名；授权后补国家×marketplace×channel 快照 | P0 |
| `/competition/products` | blocked | 仅保留产品治理说明 | 缺授权价格/参数快照、变体关系、采集时间和字段字典 | 建产品版本、变体、价格历史、截图/hash 和差异告警 | P0 |

### 4.3 用户

| 路由 | 状态 | 当前可用边界 | 主要缺口 | 下一动作 | 优先级 |
|---|---|---|---|---|---|
| `/users` | partial | 公开调研语境与已标注样例边界 | 5 个阻断来源；CRM、社媒、访谈、门店未闭环 | 分离 public persona 与 private customer；建立 region coverage matrix | P0 |
| `/users/overseas` | blocked | 仅展示 social listening readiness | 缺 API 授权、query set、语言/地区、窗口和去重 | 完成 social owner intake，建立抽样覆盖和 sentiment QA | P0 |
| `/users/consumer` | blocked | 仅展示研究计划 | 缺样本、招募、consent、原文、编码和 saturation | 建访谈库、同意书、编码框架、引用 hash 和饱和度 | P0 |
| `/users/channel` | blocked | 仅展示 private snapshot readiness | 缺访谈记录、授权、销售快照和健康度口径 | 访谈与销售快照双轨；每条结论标注证据类型 | P0 |
| `/users/store` | blocked | 仅展示 manual evidence gate | 缺门店实体、现场记录、快照、授权和复访闭环 | 建 store entity 与问题—行动—复访工作流 | P0 |
| `/users/regional` | partial | 复用 UsersPage 的公开/治理数据 | 与主页面同源，缺地区样本覆盖和可比性合同 | 每地区显示样本量、窗口和 unknown；禁止静态百分比外推 | P1 |
| `/users/global` | partial | 复用 UsersPage 的公开/治理数据 | 美国/中国样本不能外推全球 | 建 coverage matrix；无样本地区保持 unknown | P1 |
| `/users/aesthetics` | blocked | 仅为样例/资产标签边界 | 缺实验、样本、地区、题目、素材版本和显著性 | 执行成对偏好实验，区分官方资产和 AI 资产 | P1 |

### 4.4 行业

| 路由 | 状态 | 当前可用边界 | 主要缺口 | 下一动作 | 优先级 |
|---|---|---|---|---|---|
| `/industry` | partial | 官方/公开行业语境可用 | VOC、趋势报告、供应链为阻断/样例；法规只到入口 | 改为事件+owner watchlist，按证据等级分栏 | P1 |
| `/industry/regulation` | partial | CPSC/eFiling 官方入口 | 不支撑 SKU 适用性、证书、账号或进口合规 | 建 SKU×jurisdiction×requirement×certificate 矩阵和法务签核 | P0 |
| `/industry/policy-insight` | partial | 官方法规时间线 | 不支撑产品分类、证书和 notified body 路径 | 建法规版本 diff、适用性决策、证书到期和责任人 | P0 |
| `/industry/flavor-map` | blocked | 仅展示 VOC/NLP readiness | 缺 corpus、窗口、taxonomy、地区、模型和人工一致率 | 完成 VOC owner intake、sample manifest、model card、agreement QA | P0 |
| `/industry/flavor-report` | blocked | 合成报告边界 | 缺 snapshot id、模型版本、prompt hash 和 reviewer | 报告生成必须冻结输入、模型和复核状态 | P0 |
| `/industry/news` | partial | 已补证条目与线索可分开 | 个别法规来源不支持产品级结论 | 增加去重、主题聚类、影响假设和引用级 URL | P1 |
| `/industry/tech` | source-backed | 公开品牌规格语境与 `technology-spec-ontology-v1` 复核候选包 | 实际 ontology、单位换算、版本 lineage 和 owner 签核仍缺失 | 落地规格 ontology；补单位换算/版本链；公开 claim 与实验结果分层 | P1 |
| `/industry/reports` | partial | 已拆为独立行业报告治理页 | 缺报告目录、不可变版本、输入快照、审批与撤回 | 接入报告状态机；版本绑定 source/snapshot/reviewer | P1 |
| `/industry/supply` | partial | L3 ERP 渠道/目标 proxy 与受阻供应链演示 | 1 个来源受阻、4 个 scope gap；缺供应商主数据、仓库范围、库存和成本模型 | 授权 ERP/供应商快照；分离经营 proxy 与供应链事实，落实权限和成本口径 | P0 |
| `/industry/ip` | source-backed | 公开专利数据库入口与 `patent-query-family-review-v1` 复核候选包 | query 结果、claim chart、产品相关性和专业法律复核仍未闭环 | 补 query、family、legal status、claim chart 和专业法律复核 | P1 |
| `/industry/exhibition` | source-backed | 官方展会日程与 `exhibition-task-evidence-v1` 复核候选包 | 竞品清单、现场任务、follow-up 和经营复盘证据尚未采集 | 建参展商清单、任务 owner/due date、现场记录和会后 action | P1 |
| `/industry/macro` | partial | 已拆为独立宏观指标治理页 | 缺官方宏观指标、指标字典、不可变快照与 owner 审批 | 补官方指标合同与版本快照；保持 definition-only | P0 |

### 4.5 自我洞察、AI、报告与数据治理

| 路由 | 状态 | 当前可用边界 | 主要缺口 | 下一动作 | 优先级 |
|---|---|---|---|---|---|
| `/self` | partial | L3 ERP 历史 proxy 当前 fail closed | 平台数据缺失；BCG 主观；artifact/hash/refresh receipt 缺失 | 补经营 snapshot、利润/库存/广告字典、freshness 回执和可回放 BCG | P0 |
| `/ai-assistant` | partial | 本地配置/readiness UI 与显式 AI/VOC 阻断面板 | 11 个来源受阻、13 个 scope gap；授权数据、模型评估/人工一致率、provider lineage 未闭环 | 在 DQ-023/DQ-032 接入授权数据、评估与 provider proxy 后再进入任务型执行 | P1 |
| `/ai-assistant/review-analysis` | blocked | 合成评论分析演示 | 缺 corpus、窗口、评估集、模型和人工一致率 | 建授权 dataset、evaluation set、model card 和 review queue | P0 |
| `/ai-assistant/youtube` | blocked | 合成追踪演示 | 缺 API、query/video/channel manifest、quota 和去重 | 授权后保存采集 manifest、样本和配额成本 | P1 |
| `/ai-assistant/design` | blocked | 本地 demo | 缺服务端代理、request id、model、cost、license 和审核 | 建 provider proxy、资产许可、品牌/商用复核和 cost ledger | P0 |
| `/ai-assistant/knowledge` | blocked | L2 fixture / 内部维护入口 | 非生产 RAG；缺版本、权限过滤、引用准确率和撤回 | 接后端 snapshot/review；建立 citation evaluation | P0 |
| `/ai-assistant/comment-data` | blocked | 仅 VOC/NLP readiness | 缺评论快照、PII、去重、语言覆盖和人工一致率 | 建 comment governance、PII 策略、evaluation 和 review queue | P0 |
| `/ai-assistant/web-review` | blocked | 合规 gate | 缺 robots/条款、allowlist、窗口、限速、脱敏和 hash | 建受控 URL ingestion；违规目标 fail closed | P0 |
| `/ai-gallery` | blocked | 本地示例资产 | 缺 request/model/prompt hash/cost/license/review/usage | 建 AI asset ledger 与审核状态机 | P1 |
| `/reports` | partial | L3 ERP proxy 可作受限报告上下文；L2 报告治理仍受阻 | 4 个来源受阻、8 个 scope gap；缺 immutable version、input snapshot、approval、revocation | 激活报告状态机；每个队列项绑定 source/snapshot/reviewer，继续阻断事实正文 | P0 |
| `/report/:id` | partial | 封面可引用公开市场来源，L3 ERP proxy 可作受限上下文 | 3 个来源受阻、8 个 scope gap；缺 citation map、审批、撤回和下载审计 | 每个报告版本绑定 source、snapshot、reviewer 与撤回状态 | P0 |
| `/data` | partial | 107/107 表治理与 L3 内部 proxy | 14 个阻断来源、24 个 scope gap；目录不等于数据已采集 | 接版本化 catalog API；分别显示 schema、snapshot、quality、freshness | P0 |
| `/data-source` | partial | 53 个来源 registry UI | 仍含示例 CRM 来源和供应商人工复核 gap | 增加 owner SLA、review history、freshness alert、批量 intake | P0 |

## 5. 完整解决方案

### 5.1 目标数据链路

```text
决策问题
  → 指标合同
  → 来源与授权合同
  → immutable snapshot + hash
  → schema / completeness / reconciliation / model QA
  → owner review + ETag + audit
  → page-scoped adapter
  → FactDisplayGate / evidence notice / CSV contract
  → freshness monitor + rollback
```

### 5.2 分层策略

- **公开事实层**：官方/公开报告，只允许在明确 claim scope 内展示；保存 URL、标题、hash、窗口和引用。
- **内部只读层**：ERP/CRM/BI 等采用不可变授权快照；默认 private/internal，不混入公开市场分母。
- **连接器层**：Amazon、社媒、YouTube、VOC、贸易数据必须经过 owner intake、权限、配额、字段和快照合同。
- **人工研究层**：访谈、法规、美学和展会使用 consent、样本、编码、证据 hash、reviewer。
- **模型层**：NLP/生成/RAG 保存 dataset snapshot、model、prompt hash、evaluation、cost、human review 和 lineage。
- **展示层**：`verified`、`needs-review`、`example` 与 `source-backed/partial/blocked` 分开；无证据保持 unknown，不用 0 填充。

## 6. 执行 TODO

### Wave 0：审计基线与防漏门禁

- [x] **DQ-000** 恢复当前 branch/head/worktree，废弃旧 PR 状态作为当前事实。
- [x] **DQ-001** 运行一致性与深度审计，记录 45 business routes / 884 claims / 53 sources。
- [x] **DQ-002** 修复 route matrix 对零数字声明页面的来源漏映射。
- [x] **DQ-003** 为 45/45 业务路由加入 registry/alias 覆盖、MECE 分类、阻断来源、scope gap 和下一动作。
- [x] **DQ-004** 增加“0 unmapped business route”及关键路由回归测试；当前定向测试 91/91 通过。
- [x] **DQ-005** 跑完整 45 路由 × 桌面/移动浏览器 sweep：90/90 通过。
- [x] **DQ-006** 生成本轮深度审计机器证据目录：`app/tmp/audits/full-data-quality-20260729-mece/`；纳入正式 release evidence 仍待后续发布批次。

### Wave 1：无需受限连接器的本地完善

- [x] **DQ-010** 为 45 条业务路由建立 target metric contract；每项含公式、粒度、单位、分母、窗口、owner、SLA、允许比较、禁止推断和所需 source id；校验结果 45/45、decision-ready=0。
- [x] **DQ-011** 将 45/45 页面状态改为“来源就绪度 + 决策就绪度”双层展示；来源为 19 blocked / 22 partial / 4 source-backed，决策为 45 not-ready / 0 ready；投影防漂移、MECE 分类防漂移、`unmapped`、整体合同校验失败和顶层 `null` 合同均 fail-closed；单测、lint、build 与 90/90 E2E 均通过。
- [x] **DQ-012** 拆除 `/industry/macro` 与 `/industry/reports` 的职责错配：新增独立宏观分析与行业报告页面，更新路由、目标指标合同和就绪投影；两页均保持 `partial / not-ready`，不展示虚构指标值或可下载报告；导航唯一 active，definition-only 负向门禁成立；223/223 单测、lint、build、90/90 E2E、Graphify 与独立 review 全部通过。
- [x] **DQ-013** 为 MarketTrend、TechNews、IP、Exhibition 建立业务复核候选包，显式展示模型合同、指标、粒度、owner、证据范围、允许/禁止用途和待签核项；指标身份直接读取 route-readiness 生成投影，前提漂移时 fail-closed；4 页仍保持 `source-backed / not-ready`。AIAssistant 根页已转入 AI/VOC 阻断治理，显式锁定授权数据、模型评估/人工一致率、provider lineage 和 fixture/synthetic 升级禁令；229/229 单测、lint/build、深审计 0 high/medium/unsupported、90/90 路由 sweep、154/154 完整 E2E、Graphify 与独立 review 全部通过。
- [x] **DQ-014** 更新公开报告人工证据凭证：ds-002、ds-044、ds-045。三条受控 Chromium 诊断均保留 HTTP 403 且未登录或绕过；ds-002、ds-044 仅按限定 L1 公开语境接受，证据等级、事实提升和 decision-ready 均未升级；ds-045 因同页市场规模、区域金额和份额标签无法相互校验，降为 `needs-review / canDisplayAsFact=false`，并从页面数值、CAGR、趋势线、搜索卡片与 CSV 事实字段中移除。专项验证 4/4、全量单测 233/233、深审计 0 high/medium/unsupported、完整 E2E 154/154、release evidence 8/8 与 Graphify 更新均通过；未执行自动/生产 registry 写入、provider、restricted connector、部署、commit 或 push。机器证据见 `evidence/dq-014-public-report-receipts-20260730.json`。
- [x] **DQ-015** 已为 ds-014、ds-040、ds-042、policy-cpsc-efiling、policy-eu-mdr-transition 生成五份 source-specific owner packets，共 55 个必填证据槽位；当前全部 missing，owner/reviewer/decision-ready/fact promotion 均为 0。访谈与美学来源保持 `L0/LO-S` 且不可作事实，两个 policy 来源仅保留原有 `L1` 公开入口/时间线 scope，SKU/证书/分类/法务结论继续阻断。专项 5/5、全量单测 238/238、深审计 0 high/medium/unsupported、完整 E2E 154/154、release evidence 8/8、bundle budget、Graphify 与 `git diff --check` 全部通过；未执行真实采集、外发、provider/connector、数据库、生产写入、部署、commit 或 push。机器证据见 `evidence/dq-015-owner-packets-20260730.json`，packet bundle 见 `evidence/dq-015-owner-packets-20260730/`。
- [x] **DQ-016** 已为 53 个来源建立按 collection method 分层的 freshness SLA、确定性投影与运行时评分；投影当前有 43 条告警、0 unmapped、0 validator blocker。ds-047–051 保留原 L3 历史等级与限定 claim scope，但全部缺当前 artifact 可用性、受控 sha256 合同和 refresh receipt，因此 5/5 当前使用资格为 false，市场、品类、区域竞争、自我洞察、数据管理与来源管理均显示过期/证据告警，并对受影响数值与 CSV fail closed。日期-only 篡改提升会被四类负向门禁拒绝；247/247 单测、0 high/medium/unsupported 深审计、154/154 E2E、8/8 release evidence 全通过。机器证据见 `evidence/dq-016-source-freshness-20260730.json` 与 `evidence/dq-016-source-freshness-projection-20260730.json`。
- [x] **DQ-017** 修复全站当前态误导：半月 `nextScheduledAt` 早于当前时间时显示红色“计划已逾期”，缺失或非法值显示黄色“调度未知”，仅合法未来计划显示绿色成功；数据管理页头、统计卡和 MECE 说明统一由 `dataModules.length` 派生（当前 7），并明确 ERP 内部经营为第七域；目录血缘移除伪 JSX 字符串；Amazon/社媒/评论表的日/周频改为“目标频率 · 当前未接入/公开线索复核”；首页法规行动的硬编码 10%–100% 和“已完成”改为 owner 回执缺失时进度 unknown，并将产品/报告/画像数量标清为目录、线索或示例。刷新前的 `2026-07-H2` 过期计划被正确识别；本地半月候选随后推进到 `2026-08-H1`、下次计划 `2026-08-16T09:00:00+08:00`，不冒充生产 cron 收据。默认 Vitest 已改为稳定单 worker，显式并行仅作诊断。DQ-020 Owner submission 门禁后的当前全量验收为 266/266 单测、154/154 E2E、8/8 release evidence、0 vulnerabilities、85/85 bundle assets、0 consistency issue、0 high/medium/unsupported claim；独立只读复审最终 0 actionable finding，Codex CLI helper 因连续自递归未作为 clean 收据。机器证据见 `evidence/dq-017-current-state-integrity-20260809.json`。

### Wave 2：需要业务 owner 或授权快照

- [ ] **DQ-020** Amazon：ds-007/009/010/019/037/038/039 的 owner intake、ASIN/SKU/站点/窗口/字段/hash。当前为 `local-intake-contract-ready / blocked-owner-evidence-required`，不得前移到 DQ-021。
  - [x] 七个 source-specific 空 intake packet、67 条最低映射、11 个 mapping 字段、四类 snapshot 字段合同与 133 个必填槽位已建立；本地 validator、hash 防篡改、source registry 绑定、source task 刷新和 Amazon/VOC 分类防漂移均通过。
  - [x] 本地验证完成：DQ-020 专项 5/5、聚焦回归 115/115、全量单测 252/252、lint、build、bundle budget、数据一致性 0 issue、深审计 0 high-risk、154/154 E2E、release evidence 8/8、Graphify update/cluster/query 均通过。
  - [x] 私有输入盘点已完成：`app/configs/private/` 为 gitignored、目录 `700`、草稿/清单 `600`；正式 mapping/readiness 文件均不存在。脱敏 private audit 与零网络 coverage/readiness 均 fail closed：0/67 valid mapping、7/7 来源缺映射，credentials/authorization/window/owner review 阻断，networkCalls=0、businessDataWrites=0。脚手架中的 compliance/snapshot scope 仅为模板默认值，不构成审批或快照证据；未执行 final promotion。机器证据见 `evidence/dq-020-private-owner-evidence-20260730.json`。
  - [x] 2026-08-01 从故障断点恢复并执行 owner-fill acceptance：私有草稿修改时间仍停在 2026-07-02，未检测到 owner submission；mapping/readiness promote 预检均为 `blocked-not-written`，正式文件仍不存在。coverage 为 0/67、readiness 的 credentials/mapping/authorization/window/owner review 五项阻断；全程 networkCalls=0、businessDataWrites=0、privateInputWrites=0。程序执行授权未被冒充为业务 owner 审批，机器证据见 `evidence/dq-020-owner-fill-acceptance-20260801.json`。
  - [x] 2026-08-09 将 Amazon 默认窗口从硬编码 2026-06-H1 改为读取当前半月 manifest，并保留 start/end 成对显式覆盖；private audit 新增窗口一致性门禁，防止正确 Owner 提交被旧程序窗口误阻断。
  - [x] 2026-08-09 新增统一脱敏 acceptance：聚合 packet validator、mapping/readiness promotion dry-run、draft private audit 与 connector readiness；CLI 不再回显 ASIN/SKU、authorization id 或 owner 值。schema v2 已修正状态顺序为“完整 draft → 独立复核 → 单独授权 private promotion”，并将 `complianceReviewer` 纳入 readiness 必填。合成完整草稿在 formal 0/2、全部写入为 0 时可正确进入 `ready-for-independent-owner-review`；当前真实目录仍为 `blocked-no-owner-submission`，draft 2/2 只是空脚手架、owner content=false、0/67 mapping、readiness 缺 4 个责任/授权字段与 4 个有效日期、正式文件 0/2、DQ-020 未关闭、fact promotion=false。机器证据见 `evidence/dq-020-owner-evidence-acceptance-20260809.json`，操作与角色手册见 `DQ-020_OWNER_HANDOFF.md`。
  - [x] 2026-08-09 在本地授权门禁内先备份旧私有 checklist，再同步当前 schema；新清单与模板完全匹配，私有目录/文件保持 `700/600`，`checklist-items-missing` 已消除。该操作仅产生 1 次私有模板覆盖和 1 份私有备份，network/business/production writes 均为 0；acceptance 仍为 `blocked-no-owner-submission`，未把工程合同同步冒充为 Owner 提交。机器证据见 `evidence/dq-020-checklist-contract-sync-20260809.json`。
  - [x] 2026-08-09 已按授权进入 Business Owner submission 门禁并完成脱敏验收：两个 draft 仍是 2026-07-02 空脚手架，owner content=false；0/67 valid mapping、4 个责任字段和 4 个有效日期缺失，promotion dry-run/private audit/connector readiness 均 blocked，全部私有写入、网络和生产副作用为 0。执行许可没有被冒充为业务审批，机器证据见 `evidence/dq-020-business-owner-submission-gate-20260809.json`。
  - [ ] 业务 owner 在获批私有路径填写授权记录、ASIN/SKU/品牌/类目映射、site/marketplace、窗口/时区、字段字典及其 SHA-256；当前 mapped/owner-approved 均为 0。
  - [ ] 在另行授权后生成不可变 Amazon 只读 snapshot、row/rejected-row count、schema/version/content hash，并通过 owner/compliance/独立 release review；当前 authorized-snapshot/hash/decision-ready/fact-promotion 均为 0。机器证据见 `evidence/dq-020-amazon-owner-intake-20260730.json`，空 packet bundle 见 `evidence/dq-020-amazon-owner-intake-20260730/`。
- [ ] **DQ-021** CRM：ds-012 的脱敏 snapshot、RFM/cohort contract、用途和权限。
- [ ] **DQ-022** Social：ds-013 的 query set、语言/地区、窗口、去重和 sentiment QA。
- [ ] **DQ-023** VOC/NLP：ds-021/023/030/032/033 的 corpus、model card、evaluation 和 human agreement。
- [ ] **DQ-024** ERP/供应链：ds-035 及 ds-047–051 的刷新合同、供应商/库存/成本和 owner approval。
- [ ] **DQ-025** Customs：ds-006 的 HS/HTS、国家/港口/窗口合同与授权贸易快照。
- [ ] **DQ-026** Interviews：消费者/渠道/门店的 consent、样本、原文 hash、编码和 saturation。

### Wave 3：后端与 AI 产品化

- [ ] **DQ-030** 将 source registry、snapshot、review、audit 的本地后端接入非生产集成环境。
- [ ] **DQ-031** 报告 immutable version、citation map、approval/revocation/download audit。
- [ ] **DQ-032** AI provider proxy、预算、request lineage、license 和 review。
- [ ] **DQ-033** RAG 文档版本、permission filter、citation accuracy 和撤回。
- [ ] **DQ-034** 端到端 freshness/quality/owner SLA dashboard。

### Wave 4：发布门禁

- [x] **DQ-040** 45/45 target metric contract coverage；仅代表本地定义覆盖，不代表数据采集或发布认证。
- [ ] **DQ-041** P0 页面 decision-ready claim rate ≥ 80%。
- [ ] **DQ-042** `data:audit` issue=0，deep audit high/medium/unsupported=0，unmapped route=0。
- [ ] **DQ-043** blocked 页面不得显示业务金额、份额、销量、排名或导出。
- [ ] **DQ-044** unit/lint/build/full route E2E/Graphify/Codex review 全部通过。
- [ ] **DQ-045** 生产部署、provider、数据库、连接器和 live capture 分别取得独立授权后再执行。

## 7. 依赖与关键路径

1. DQ-010 指标合同、DQ-011 双层就绪状态、DQ-012 路由职责拆分、DQ-013 业务复核候选包/AI 阻断治理、DQ-014 公开报告人工凭证、DQ-015 source-specific owner packets、DQ-016 freshness 评分/过期告警与 DQ-017 当前态误导修复已经闭环；DQ-020 的本地 intake 合同已闭环，但私有 owner/授权/mapping/snapshot/hash/review 仍为当前第一项未完成工作。
2. DQ-020 Amazon 同时解锁市场哺乳用品、婴儿护理、品类、竞品、区域和自我洞察。
3. DQ-023 VOC/NLP 同时解锁评论分析、评论数据、功能地图、趋势报告和网页评论。
4. DQ-024 ERP/供应链决定首页、市场、区域竞争、自我洞察和供应链的新鲜度。
5. DQ-030 后端集成是报告、RAG、owner review 和审计状态持久化的前置条件。

## 8. Definition of Done

一条页面任务只有同时满足以下条件才可关闭：

- 路由、页面职责和主业务域一致。
- 所有目标指标有完整指标合同，且不存在跨分母或跨粒度比较。
- 所有事实绑定 source id、snapshot/hash、窗口、grade、reviewer 和 claim scope。
- 缺失值保持 unknown；example/synthetic 不进入 KPI、排序、报告或 CSV。
- 页面、导出和报告使用同一口径。
- freshness、owner、SLA、失败状态和回滚路径可见。
- 自动化审计、定向测试、全路由 E2E、lint、build 和 review 通过。
- 若涉及外部系统，授权、只读边界、隐私和生产收据分别成立。

## 9. 本轮执行证据

```bash
cd app
npm run data:audit:json
npm run data:target-metrics:validate
npm run data:route-readiness:build
npm run data:route-readiness:check
npm run data:audit:deep:summary
npm run data:audit:deep -- --strict --out tmp/audits/full-data-quality-20260809-mece-final
npm run test:serial
npm run test:e2e -- full-data-quality-routes.spec.ts
npm run test:e2e
npm run lint
npm audit
npm run build
npm run quality:bundle-budget
npm run quality:release-evidence
```

目标指标校验器确认 45 expected / 45 covered / 45 unique metrics / 0 missing / 0 unexpected / 0 invalid，深审计将合同 ID、状态、owner、grain 和所需来源写回 45 条路由矩阵，并保持 0 decision-ready。DQ-011 进一步生成确定性的路由就绪投影，构建时会拒绝过期投影、`unmapped` 路由、不完整指标身份和整体合同校验失败；共享 route taxonomy 会拒绝“值合法但路由错误”的 MECE 分类，合同 CLI 对顶层 `null` 也会以结构化错误 fail-closed。DQ-012 新建 `MacroAnalysis` 与 `IndustryReports` 页面，修正两条路由、指标合同组件身份和 E2E 职责断言。DQ-013 为 MarketTrend、TechNews、IPAnalysis、Exhibition 增加统一 `business-review-candidate` 候选包，以模型合同、证据范围、允许/禁止用途、owner 和待签核项锁定有限用途；指标 ID、名称、owner 与 grain 直接读取 route-readiness 生成投影，只有 `source-backed + defined-not-certified + not-ready` 才允许展示候选合同，任何漂移均 fail-closed。AI 根页增加 `partial / blocked / not-ready` 面板，显式列出授权数据、模型评估和 provider lineage 缺口，并禁止 fixture/synthetic 升级为真实输出。DQ-014–016 固化公开报告凭证、source-specific owner packets 与 freshness 合同。DQ-017 修正过期/未知调度、错误模块数、伪 JSX、虚假日/周频和无回执法规进度，并补 no-network 恢复候选与 live canonical 观测字段的严格兼容回归。浏览器门禁为 45 routes × desktop/mobile = 90/90，完整 core/chart/route E2E 为 154/154；每页均通过双状态可见、来源文案、非 404、无横向溢出、无 console/page error 和过度声明检查。DQ-020 Owner submission 门禁后全量串行单测 266/266，深审计 855 claims、0 high/medium/unsupported，一致性审计 0 issue，依赖审计 0 vulnerabilities，bundle budget 85/85，release evidence 8/8；本轮机器证据见 `evidence/dq-017-current-state-integrity-20260809.json` 与 `evidence/dq-020-owner-evidence-acceptance-20260809.json`。

本轮只做本地审计、代码、报告和测试变更；没有生产写入、provider 调用、受限连接器访问、数据库写入、部署、commit 或 push。
