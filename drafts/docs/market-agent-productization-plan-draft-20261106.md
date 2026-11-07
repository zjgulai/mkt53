---
title: Market Agent 与工作台新品准入产品化方案及执行计划
doc_type: prd
module: market-agent
topic: new-product-entry
status: draft
created: 2026-11-06
updated: 2026-11-06
owner: self
source: human+ai
---

# Market Agent 与工作台新品准入产品化方案及执行计划

## 1. 结论与授权边界

**推荐：独立 `@Market` 应用身份 + 共享新品决策记录 + 复用现有治理与核算能力。**

首批不是扩展页面或建设万能聊天助手，而是贯通：

`候选立项 → 市场证据 → 美国 SKU 准入复核 → DTC 场景核算 → 人工决定 → 守衡 / Shopify 受控交接`

- 飞书 Agent：承接即时问题、补齐输入、调用受控工具、返回卡片、回写有权限的动作。
- Web 工作台：保存候选、证据、测算、复核与交接状态；现有“五看”作为证据下钻入口。
- 稳定 SOP：经过真实使用和版本稳定验证后，才固化为工位或定时任务。
- 本轮只做只读调研、产品讨论与草案。**没有执行产品编码、生产部署、真实连接器/核算服务调用、飞书发送或业务事实晋升。**
- 以下执行计划指“后续取得对应授权后实施”，不是“本轮已经获准实施”。

本稿承载 11 月新产品形态，不覆盖 `docs/product/product-roadmap-execution-20260723.md` 的历史批次与证据。完整设计未批准，暂存 `drafts/docs/`。

## 2. 用户已定选择与待落实条件

| 项目 | 本轮确定内容 | 不能据此声称 |
|---|---|---|
| 首批业务场景 | 新品准入 | 完整设计已经批准 |
| 试点 | 美国 DTC；穿戴式吸奶器单品类。**2026-11-06 收口：11 月只推 M5 Smart 一个主样本**，S12 Pro / M6 延后 | 三个候选同期交付；产品分类与规格已签认 |
| 候选组（第 1/6 组） | 已选 3 项并完成商品/变体/SKU 只读映射（第 11.3 节）；**11 月主样本收口为 M5 Smart / `BP380-MR70000B00104-C`**，另两项仅保留目录映射。三项均为既有目录商品的流程回放，非新品首次上市成果。 | SKU 映射只读取证；不等于真实成本、产品规格或准入签认 |
| 店铺身份（第 2/6 组） | 已确认 Momcozy 美国 DTC、`market=US`、`channel=DTC`、`displayCurrency=USD`；正式 storeRef、店铺后台身份、运营时区和授权未提供。 | Feishu Base 的 Asia/Shanghai 只是表数据时区，不能代填店铺时区 |
| 规格与用途（第 3/6 组） | 三款统一用途为“美国 DTC 穿戴式吸奶器”；specRevision、功能/宣称、产品分类和证书待 SKU/合规 Owner 签认。 | 商品标题、Single 变体规格及目录版本不是正式产品规格证据 |
| 责任人组（第 4/6 组） | businessOwner、finalGoDecider、financeOwner、complianceReviewer、dataSubmitter 角色位已占；用户明确选择占位，身份未定、姓名/账号未提供。 | 人审与资料签认仍阻断，不由工程三人代签 |
| 接口责任（第 5/6 组） | 用户确认周健负责 Market 技术交付与接口协调；Main、Sage、飞书、守衡、Shopify 的外部 Owner/管理员仍待具名。 | 技术协调不授予外部系统管理员权限，不证明接口可调用 |
| 日期与容量（第 6/6 组） | 三人上限：吴雨宁 10 h/周、周健 20 h/周、刘华丽 10 h/周；**资料交接日已定 2026-11-10**；11-23 出席周健，11-29 出席吴雨宁。有效期与保留政策仍未给。 | 窗口合计约 120 h 上限；出席者不是验收主责人，不能构成独立验收 |
| 时间 | 保留 2026-11-23 / 2026-11-29 节点，分层验收；12 月另验 SOP 稳定性 | 两个日期已经成为无条件完成承诺 |
| 业务输入 | 用户表示能提供资料与复核人 | 成本、证书、姓名和签认已经取得 |
| 实施容量 | 现有三人锁定 Market 投入窗口 | 具体人天、接口 Owner 和变更窗口已经排定 |
| GO 产品边界 | 2026-11-06 用户接受：仅限已签认范围的内部立项与受控交接，不代表法律保证或公开销售发布 | 不等于任一 SKU 已获 GO、接口写入或部署已授权 |
| 可视化 | 启用本地浏览器讨论页；前次预览进程已到时停止，HTML 保留 | 生产网站已改版 |

讨论页：`tmp/outputs/market-agent-discovery-20261106/tmp-market-planning-discussion-20261106.html`。

## 3. PMO 目标与意图识别

### 3.1 业务定位

PMO 将 Market 放在 **G2：敏捷响应品牌声量带来的影响和机会 / S3：VOC 与市场洞察融合**。

其产品意图是把市场机会转为可执行、可复核的新品决策。Market 不是 mkt53 的简单改名；PMO 把 mkt53、Sage、DataPilot 合并描述为 Market 的能力供给。

| 系统 | 建议职责 | 不承担 |
|---|---|---|
| mkt53 / Market 工作台 | 市场证据、候选决策单、复核与交接可视化 | 在前端保管私有原始成本、密钥或复制核算真值 |
| Market Agent | 意图识别、补输入、受控工具编排、交互卡片 | 财务数字自由生成、法律裁决、最终批准 |
| Sage | 经验证的确定性核算与工具结果 | 把默认费率当真实 DTC 参数；替代法务 |
| DataPilot | 后续真实经营基线、渠道诊断和复盘 | 本期未经验证的接口或收益承诺 |
| 守衡 | 合规审查、索证与相关放行合同 | 用关键词扫描代替真实证书与适用性复核 |
| Shopify | 经批准的 DRAFT 接收与后续上架流程 | 接收未经审批的自动公开发布 |

PMO `/sites` 的选品准入链为：`product → Market → 守衡 → Shopify`。Echo 的用户机会包可作为候选输入；不在本期重建 Echo 的采集或 NLP。

### 3.2 PMO 原始三棒安排

| 能力 | P1 吴雨宁：需求/前端/数据架构 | P2 周健：全栈/Bot/算法 | P3 刘华丽：测试/运营/协同推广 |
|---|---|---|---|
| #24 市场洞察工作台 | 11-10～11-13 | 11-14～11-18 | 11-19～11-23 |
| #25 跨境核算与专家工作流 | 11-14～11-18 | 11-19～11-24 | 11-25～11-29 |

业务编号 #24/#25 与页面数据对象 id 73/74 不同；后续对账保留映射，避免混用。

PMO 显示 Market 为“50% / 已验证”，但这只是其登记状态。本轮不重新猜测百分比，也不把该状态视作完整能力验收。

### 3.3 四阶标准与时间约束

1. Stage 1：工作台基座、数据模型和初版 SOP。
2. Stage 2：独立飞书应用真实调用工具，返回可交互卡片并回写。
3. Stage 3：周提问 ≥10 或人工纠正 ≥3，触发 SOP 候选；候选需要门禁验证。
4. Stage 4：候选 SOP 至少两周稳定后，正式固化为工作台自动化能力。

“未有独立 Bot 最高封顶 50%”只是上限，不是已达成 50% 的证明。PMO 登记的 Market 8 次/周、1 次打回、20% 返工率，本轮没有取得原始事件；即使登记值准确，也不能直接证明候选触发或返工率 <20%。

**11-29 首次联通，不可能当天同时完成两周稳定验证。**

## 4. 当前现状：分开 PMO、生产和仓库

### 4.1 证据分层

- **本轮生产只读观测**：PMO 页面、新域工作台、法规页和匿名 HTTP 响应。
- **本轮本地核验**：源码、合同、已有 no-write 数据审计与就绪度检查。
- **历史证据**：7～8 月验收记录、11-02 复盘、PMO 引用的 Sage 报告。
- **PMO 自报**：DataPilot 行数、87M/635M 和十四渠道经营读数；没有独立验证其输入、执行与实际收益。
- **建议**：本稿所有未来实现、指标和排期。

### 4.2 业务与功能对比

| 业务问题 | 现有功能/资产 | 真实能力边界 | 本期处理 |
|---|---|---|---|
| 市场是否足够大？ | 市场总览、三层 TAM 标签、趋势、区域份额 | 当前源码上层/品类为历史公开口径；细分 ds-045 因来源冲突阻断；SAM/SOM 未建立 | 补试点来源复核；区分全球背景、美国 DTC 可服务假设与预测 |
| 竞品在做什么？ | 竞品目录、筛选、对比、新品线索 | 授权价格、评价、份额、排名仍缺；目录交互不等于真实竞品采集 | 保留为证据补充；不把全量 Amazon 接入纳入关键路径 |
| 用户需要什么？ | 用户研究、访谈、画像和审美入口 | 多数受样本/授权门禁限制；部分示例数值仅有角标提示 | 接受 Echo/业务已复核机会包；不把示例画像写入新品理由 |
| 能在美国销售吗？ | 法规导航、SKU 合同、intake 模板 | 0 官方条款快照、0 已复核 SKU 决策、0 可发布合规结论；intake 0/6 | 先补美国试点适用性、证书/测试资料和法务复核；缺证 HOLD |
| 这个价格能赚钱吗？ | Sage 存在本地确定性函数 | mkt53 无接入；Sage 服务接口未验证，默认参数不适用于 DTC | 经受控边界复用公式；显式签认输入，不复制第二套公式 |
| 谁批准与执行？ | 本地 Source/Snapshot/Review/Audit/RBAC 骨架 | 无生产业务审批、决策/行动/交接闭环；前端生产强制静态 | 做最小决策记录和审批/交接路径；复用治理机制 |
| 如何在飞书处理？ | PMO 对独立 @Market 的目标 | 本仓库无 Bot 回调、Agent runtime 或工具适配 | 独立身份 + 共享网关；真实双向回写是验收项 |
| 能否生成可追溯报告？ | 报告目录、有限预览、生成队列 | 目录/预览不是不可变正文生成；首页与目录计数存在差异 | 先交一类新品决策摘要，绑定任务版本；不建设通用报告工厂 |
| 数据是否当前可用？ | 来源、新鲜度、半月 manifest、审计脚本 | 来源存在/URL 可达/合同通过均不能证明当前业务事实 | 试点使用范围内逐项核验；过期或撤回不得晋升 |

### 4.3 已核验基线

- 当前仓库：45 条业务路由、45 个页面组件；含 404 共 46 条声明路由。
- 107 是前端数据表定义，53 是来源登记；不是 107 张生产物理表或 53 个活跃连接器。
- 路由目标合同覆盖 45/45，但均为 definition-only；**0/45 完成 decision-ready 声明/验收**。这不等于网站没有价值，也不证明已完成业务闭环。
- source-readiness 投影：22 partial、4 source-backed、19 blocked。
- 53 条来源中 28 connector-required、9 manual-required、13 public-url-check、3 local-file-check。
- 按本轮日期与登记/使用规则重算，53 条均不满足当前使用条件：48 stale、5 evidence artifact unavailable。该结论不是对外部网站健康度或原始事实真假的判断。
- 仓库 canonical manifest：`2026-08-H1`，生成 08-09，下次计划 08-16；`data:audit:plane` 返回一项调度逾期问题。39 条公开证据仍为 planned，不能算已采集。
- 新域生产 manifest：`2026-07-H2`，生成 07-28，下次计划 08-01。与仓库版本不同；没有本轮生产 cron 运行日志证据。
- 线上仍显示旧细分 TAM 和历史内部 proxy；当前源码已增加阻断。更新 manifest 本身不会自动更新打包在源码中的业务数组。
- 本地治理后端已有 6 张表、19 条静态定义路由；没有启用生产，也没有真实 artifact 导入证明。仅记录 metadata/hash 声明不等于校验了内容。

### 4.4 首要风险

**权限与版本漂移：**匿名请求下，`mkt.luteos.com` 首页及 manifest 返回 200 与 public 缓存；旧域 `mkt.lute-tlz-dddd.top` 返回 302 登录和 private, no-store。旧域验收不能覆盖新域。

本轮看到线上“private/internal proxy”内容。没有检查全部 bundle、资源和身份路径；不得据此声称完整泄露范围。新试点私有报价与经营输入必须进入受保护的数据路径，不得写进 public JSON 或前端 bundle。

**门禁误读：**build 确实间接执行 freshness 检查；其评估日期固定在 7 月且允许带告警通过，因此“build 通过”仍不证明 11 月数据新鲜。静态 claim 审计也存在裸数值覆盖盲区，0 unsupported 不等于所有数值已被验证。

## 5. 三种路径与最佳推荐

| 路径 | 优势 | 代价 | 判断 |
|---|---|---|---|
| A：一个新品决策记录贯通 | 直接验证业务闭环；两个入口共享状态；可追溯、拒绝与撤回 | 前置依赖是资料、签认、身份和工具接口 | **推荐** |
| B：先做对话查询与报告 | 较快改善来源查找和使用入口 | 不解决经济性、人审和交接；容易停在聊天导航 | 作为 A 的 11-23 层，不作为终局 |
| C：先统一大平台/全量数仓 | 长期覆盖更广 | 全量数据、七国法规、十四渠道和所有页面拖长关键路径 | 11 月不做 |

真诚反面论点：A 同时依赖多个系统和业务审批；若实际接口不存在，先完成一个真实 SKU 的查询/核验闭环，比三个系统的空壳集成更稳。处理方式是在 11-10 明确接口门，优先一个端到端个案。**该判断已落实：11 月只推 M5 单主样本**，S12 Pro / M6 推迟到 12 月复用同一合同；不因扩候选降低证据标准。

## 6. 产品结构与意图识别

### 6.1 两个入口共用一份记录

工作台首批只新增必要的任务面，不重写“五看”：

- 候选/决策任务列表：状态、Owner、缺口、截止日。
- 决策详情：需求、证据、测算、人工复核、交接五个分区。
- 复用来源/数据治理组件呈现 provenance 和阻断。
- 新品决策摘要/导出：引用同一任务版本；没有证据的正文不生成。

独立 `@Market` 应用可以使用 Main 的共享 Bot 传输。独立身份、权限、回调目标和审计路由仍需配置与核验；用 `@Main` 代播不能冒充独立 Market。11 月只挂 M5 一个主样本，任务面不做候选批量管理。

### 6.2 意图与安全动作

| 用户表述 | 识别意图 | 必需输入/响应 | 不能自动做 |
|---|---|---|---|
| “新品值得做吗？” | 新品准入 | 追问品类、SKU、市场、渠道、窗口；创建候选任务 | 凭聊天直接批准 |
| “市场多大？” | 市场证据查询 | 区分全球/美国、品类/细分、TAM/服务假设；引用来源 | 将全球 TAM 直接当 DTC SAM |
| “能卖美国吗？” | SKU 准入复核 | 收集用途/分类/证据/Reviewer；返回准备度和索证清单 | 生成法律批准 |
| “这个价格有利润吗？” | 场景核算 | 校验币种/成本/费率，调用确定性工具 | 静默采用 FBA 或通用默认值 |
| “帮我批准/上架” | 审批或交接 | 校验身份、版本、审批状态；返回允许的动作 | 越权批准、公开发布 |
| “这单进度怎样？” | 状态查询 | 返回同一任务版本、阻断与回执 | 用静态百分比代替执行状态 |

意图模糊时先追问。稳定意图与字段用显式合同；需要模型时只承担理解与说明，不承担财务计算或决定权。模型/运行时选型在接口核验后确定，不先新增复杂 MAS。

## 7. 字段、状态与接口合同草案

### 7.1 数据所有权与命名

**一个候选销售单元对应一个 case；一个评估对应一份冻结依据。** 不先建独立产品主数据平台。已有 SKU 可引用，尚未建档的新品用 candidateId，不制造假 SKU/ASIN。

- Market 后端持有 case、evaluation、review、decision、handoff 的唯一记录；飞书和工作台只读/提交同一记录。
- 外部 JSON 沿用 `camelCase`，Python 模型沿用 `snake_case`；未知请求字段拒绝。下表均为拟定字段，不是已有模型声明。
- 金额用 Decimal 字符串；归一化核算币种为 USD。原始报价币种、转换汇率/方向/日期与证据一并保留，不能静默取默认汇率。
- 比例用 0～1 的 Decimal 字符串，展示层才转百分比；事件时间为带时区的 RFC3339，业务日期为 ISO date。
- 缺失、显式零、不适用分开：`inputState=provided / missing / notApplicable`；missing 不补零，notApplicable 必须有理由且符合该字段合同。
- **核算粒度已确认。** 首批固定 `orderBasis=singleSkuSingleUnit`、`quantity=1`：一个销售 SKU、一件/单。该基准用于候选内部准入比较（11 月为 M5 单主样本），不外推全站订单利润；多件、多 SKU、套装和购物篮分析另行立项。

### 7.2 字段字典与输入责任

“创建”允许草稿不完整；必填时机按表控制。不用一张巨大必填表阻断建单，也不让草稿缺项流入决定。

| 分区 / 字段 | 语义与约束 | 提供或生成者 | 必填时机 |
|---|---|---|---|
| caseId、candidateId、caseVersion | caseId/version 由服务端生成；候选 ID 是稳定内部标识 | 系统 / 业务供候选 | 创建 |
| candidateName、skuCode、specRevision | 名称与规格版本必需；skuCode 尚未建档可空，不用占位值 | SKU Owner | 创建 / 评估前 |
| market、channel、storeRef | market=US、channel=DTC；storeRef 是真实店铺注册引用，不是自由 URL | 电商 Owner，吴雨宁整理 | 评估前 |
| category、intendedUse、regulatoryScope | 销售单元、用途/宣称、法务确认的适用范围；不从“吸奶器”名称推断分类 | SKU Owner / 合规 Reviewer | 评估前 |
| caseOwnerId、submittedBy、targetDate | caseOwnerId由有权人员分派；submittedBy仅从已验证 human 身份生成，忽略请求体自报身份；targetDate为希望决定日期 | 业务分派 / 可信身份 / 系统 | 创建 / 提审 |
| orderBasis、quantity | 固定为 `singleSkuSingleUnit`、quantity=1；单价/每单费用仍按字段 basis 区分 | 业务 + 财务签认 | case 创建时记录；核算前复核 |
| evidenceRefs[] | evidenceId、sourceId/sourceVersion、snapshotId、artifactSha256；复用现有登记与快照引用 | 数据提供人 / 系统 | 挂证据 |
| evidenceRefs[].claimScope、evidenceType | 该证据支持哪些用途；historicalPublic、approvedInput、scenario、actualResults、synthetic 分开 | 供数人与 Reviewer | 挂证据 / 使用前 |
| evidenceRefs[].observedAt、validUntil、reviewRef | 观察/有效窗口与签认引用；当前过期/撤回状态由服务端重验，不信任客户端 freshness | 供数人 / 系统 / Reviewer | 评估、决定、交接前 |
| financialInputs.currency、fxRefs[] | USD 归一化；外币原值/币种、base/quote、rate、asOf、sourceRef 保留 | 财务提供人 / 签认人 | 核算前 |
| itemPriceBeforeDiscount、discountAmount | 不含代收销售税的商品金额；折扣只扣一次，原始含税价先显式拆分 | 业务 / 财务签认 | 核算前 |
| customerShippingAmount、salesTaxCollected | 向客人收取的运费与代收销售税分开；代收税不是收入 | DTC / 财务签认 | 核算前 |
| costLines[] | sourcing、packaging、firstLeg、fulfillment、payment、platform、taxBorne、returnLoss 等分项；每项有 amount、basis、coverage、evidenceRef | 财务 / 供应链 / DTC | 核算前 |
| feeBasis、returnLossBasis | 费用基数、固定费及退款政策；退货为相对“不退货基线”的期望净损失，不重复计已入成本的项 | 财务签认 | 核算前 |
| plannedAdCost、targetMarginRate | 广告费用可缺，但广告后指标不可算；目标口径与阈值须签认，不默认 15% | 投放 / 财务 / 业务 | 对应指标 / GO 前 |
| inputManifestRef、inputHash、inputApprovalRefs[] | 绑定实际输入内容和独立签认，不仅是上传文件名称；签认覆盖精确字段/版本 | 系统 / 输入 Reviewer | 评估前 |
| evaluationId、basisHash | 冻结本次范围、证据、输入、公式、gatePolicyVersion 的规范化 hash | 系统 | 评估创建 |
| formulaId、formulaVersion、engineRef | 财务口径与 Sage 唯一核算真值；endpoint 未核验不得记已联通 | 财务 Owner / Sage 技术 Owner | 评估创建 |
| results、resultHash、assumptions、notComputedMetrics | 结果与精度、显式假设、未算指标；结果未知不能进入实审 | 核算服务 / 系统 | 计算完成 |
| reviewId、reviewRole、verdict、reason | financial / regulatory 的 approve、reject、requestChanges；结论仅覆盖已确认内部立项范围 | 对应独立 human Reviewer | 实审 |
| actorId、actorType、reviewedAt、evaluationId、basisHash | 可信身份和冻结依据；actorType/权限由服务端派生，客户端不可填 role 自授权 | 系统 | 实审 |
| decisionId、outcome、decisionScope、constraints | GO / NO_GO / HOLD；decisionScope=internalProject；约束与批准范围必需 | 指定业务决定人 / 系统 | 决定 |
| evaluationId、reviewRefs[]、decidedAt、validUntil | 决定绑定评估与有效人审；不能因 case 状态写“已批准”省掉依据 | 系统 | 决定 |
| blockers[].code、ownerId、nextReviewAt、resolutionRequired | 缺口、解除责任人、下一复核日和所需证据；逾期催办，不自动转 NO_GO | 系统 / 业务分派 | HOLD |
| handoffId、decisionId、target、operation、payloadHash | 守衡 complianceReview 或 Shopify draftCreate；派单与业务批准分开 | 授权发起人 / 系统 | 交接 |
| handoffState、receipt.outcome | handoffState=queued / prepared / sending / received / rejected / unknown / cancelled；receipt为accepted或rejected的目标接收结果，接收不等于执行成功 | 系统 / 下游 | 交接运行 |
| receiptId、producerId、outcome、destinationRef、receivedAt | 下游真实接收/拒绝引用；producer 身份验证，不凭“准备好文件”生成回执 | 下游服务 / 系统 | 接收回执 |
| auditEventId、requestId、idempotencyKey、runKind | 关联留痕与去重；business/test/fixture 分开，服务端记录 | 系统 | 每次写入/运行 |

敏感成本、原文、证书与身份映射留在受保护后端；飞书卡片默认只显示准备度、阻断与有权限的深链。原始内容不进 public JSON、bundle、Git 或未经许可群聊。

### 7.3 DTC 金额与公式口径

以下为待财务签认的最小计算合同，不宣称当前 Sage 默认函数已经支持：

- `netRevenueBeforeReturns = itemPriceBeforeDiscount - discountAmount + customerShippingAmount`，全部不含代收销售税；不把已扣折扣重复计为成本。salesTaxCollected是代收负债，不进收入或costLines；taxBorne仅记公司实际承担且未在其他成本计入的非代收税费，财务签认类型与basis。
- `preAdContribution = netRevenueBeforeReturns - sum(costLines)`。每个成本业务项只计一次；采购/头程等已含税费、包装时，coverage 必须注明，不能又单列重复扣除。
- payment/platform 优先供已换算的每单金额；费率报价必须带收费基数、固定费及退款处理规则后再换算，不能默认按售价相乘。
- returnLoss 是相对“不退货基线”的期望净损失，说明退款、逆向物流、不可退手续费、残值/可回收成本各落在哪；若收入已扣预计退款，不得再把同一退款计入 returnLoss。
- `postAdContribution = preAdContribution - plannedAdCost`；plannedAdCost 缺失时返回未计算及原因，不等同广告费用为零。
- 规划保本 ROAS 使用上述收入口径与广告费用口径；preAdContribution≤0 时返回不可保本，不输出 999 或 Infinity。它不是平台归因 ROAS、增量 ROAS 或十四渠道边际前沿线。
- targetMarginRate、广告假设与 GO 阈值由财务/业务冻结；不给 15%、5% 退货率或 FBA 费用默认值。
- 金额、比例与汇率的有效精度/舍入由 formulaVersion 固定；核算中避免二进制浮点累计，展示舍入不得反向成为计算输入。

先核验 Sage 是否完整支持此签名。不支持时由 Sage Owner 在唯一核算真值处补齐 DTC 合同；前端不补算，Market/Python 不再复制另一套公式。无需为了“四大引擎”数量把 Listing 扫描和 MOQ/FOB 全部接入。

### 7.4 状态、人审与版本不变量

- case 工作阶段是 drafted、collectingEvidence、evaluating、awaitingReview、decided、closed 的投影；GO/NO_GO/HOLD、评估运行状态和交接状态分别记录，不揉成一个百分比。
- caseVersion/ETag 控制任务写入并发；它不是审批有效性的依据。追加一位 Reviewer 的签字，不使另一位对同一评估的有效签字失效。
- evaluation 的 basis 在创建时冻结；运行和结果通过只追加事件投影，完成结果不可覆盖。审批只接受计算完成的 evaluationId + basisHash + 不可变结果。
- 输入、范围、specRevision、证据版本、公式或 gatePolicy 改变时新建 evaluation；旧人审仍保留历史，但不授权新依据。迟到的旧计算结果不能覆盖当前任务指针。
- financial/regulatory Reviewers 分别签认该 evaluation 的内部立项范围；批准不得只留一句“OK”。资料/评估真正提交人不能审批自己的同件评估；Bot 代传仍保留 human submittedBy。
- evidenceRefs[].reviewRef只引用source/snapshot证据治理复核；Market evaluation的reviewId是另一种批准对象，两者不可互认。首版新增明确的evaluation review记录，复用审计/并发机制，不直接扩现有两类review实体枚举绕过语义。
- 指定业务决定人对有效 evaluation 写内部 GO/NO_GO/HOLD。关键资料/审批缺失为 HOLD；有充分证据的财务、法规或业务否定才可 NO_GO。接口失败不是业务 NO_GO。
- 内部 GO 允许按批准范围派送守衡复核；**不授予销售许可、Shopify DRAFT 或发布权限**。Shopify draftCreate 另验适用性/证书、内容复核、店铺授权及下游 gate。
- 决定、签认及 source 撤回/过期均留事件并使当前依据失效；交接前再次校验。HOLD 带 owner/nextReviewAt，过期仍 HOLD/overdue，不能自动冒充新的否定决定。
- 未发交接可以取消；已接收交接不能声称回滚。暂停后续动作并发起有授权的更正/撤回请求，原 receipt 保留；已存在 DRAFT 不自动删除或公开发布。
- sending阶段崩溃或超时按unknown恢复，不回落prepared再发；received必须有目标receipt。decision/evidence失效不抹掉已sending/received事实，另保留失效/更正事件；只有明确尚未发出的queued/prepared可cancelled。

### 7.5 Market REST 面：均为拟新增，尚未实现

外部业务 API 前缀拟为 `/api/v1/market`；`/internal/market/*` 只供受信网关/下游，不能匿名开放。case 详情返回当前评估、签认、决定与交接回执投影，复用它查状态，不再造独立任务平台。

| 方法 / 路径 | 目的 | 写入者与前置 |
|---|---|---|
| GET / POST `/api/v1/market/cases` | 列表 / 建候选单；列表沿用 limit/offset | 只返回有权 case；创建需 submit 权限与幂等键 |
| GET / PATCH `/api/v1/market/cases/{caseId}` | 读同一任务 / 更新范围、输入或证据引用 | 受保护权限；PATCH 需 If-Match + 幂等键，影响 basis 即失效旧评估 |
| POST `/api/v1/market/cases/{caseId}/evaluations` | 冻结依据并发起核算 | submit 权限；If-Match、幂等键；无真实可调用工具时返回阻断/不可用 |
| GET `/api/v1/market/evaluations/{evaluationId}` | 查冻结依据、运行结果及历史明细 | 与关联 case 相同权限，不允许凭 ID 越权 |
| POST `/api/v1/market/evaluations/{evaluationId}/reviews` | 追加 financial/regulatory 实审 | 对应 human Reviewer；当前有效 basis、独立身份、幂等键 |
| POST `/api/v1/market/cases/{caseId}/decisions` | 追加内部 GO/NO_GO/HOLD | 指定业务决定人；If-Match与幂等键；GO需完整有效人审，NO_GO需相应已复核否定依据，HOLD记录缺口不要求完整通过 |
| POST `/api/v1/market/cases/{caseId}/withdrawals` | 撤回本人签认/决定或有权停用 case | subjectType/subjectId/reason；If-Match、权限、幂等键；不删历史 |
| POST `/api/v1/market/cases/{caseId}/handoffs` | 请求守衡复核或 Shopify DRAFT | 授权发起人；If-Match、有效决定、目标权限、幂等键；两目标 gate 不相同 |
| POST `/internal/market/feishu-events` | 接受已验证并规范化的飞书消息/卡片动作 | 受信 Main 网关；app/event 去重；不能代造人审 |
| POST `/internal/market/handoff-receipts` | 收下游回执并校验关联对象 | 下游服务身份；receipt/event 去重、payloadHash 对账 |

创建完成 201；已持久受理的异步核算/交接 202，返回 operation/evaluation/handoff 引用。`accepted` 仅证明受理，不证明目标 received。无需因此新增 Redis/Temporal；执行状态应持久化，不能只靠进程内后台任务。

- 沿用本地合同：缺幂等键 400、非法键或字段验证 422、无身份 401、越权 403、不可见/不存在 404、幂等键同键不同 payload 或状态冲突 409、ETag 不符 412、缺 If-Match 428。
- 合法请求得到缺证/不适用，是有理由的 businessBlocked，不伪装系统故障；禁止的审批/交接写入仍按权限/状态错误拒绝，不能一律返回成功。
- 网络/下游故障保留故障码；写入结果不明记 handoff unknown，并先查询既有记录/目标状态。只有目标支持可证明幂等重放才允许同键重试；无查询/去重保证转人工，不换键盲发。
- 所有 actor、状态投影、审批可用性由服务端计算；错误只返回 code/requestId/字段路径，不回显凭据、私有原文或完整错误 body。

### 7.6 跨系统合同与飞书入口

下列 operation 名是逻辑合同建议，不是现有服务 URL。接口对账要交 actual endpoint、身份、请求/响应 schema、幂等/查询语义、错误样例、测试 receipt；不得只交“服务可达”。

| 提供方 → 消费方 | 最小输入 / 输出 | 合同主责与准入 |
|---|---|---|
| Main gateway → Market | appId、tenantKey、eventId、message/cardAction；可信 human ref、caseId/evaluationId/expectedVersion/actionId | 周健协调网关 Owner；Market 应用/群范围/权限独立核验 |
| Market → Sage | evaluationId、basisHash、formulaVersion、签认 USD 输入 / resultHash、精度、假设、拒绝原因 | 周健 + Sage Owner；财务签认公式；服务不存在时不算联通 |
| Market → 守衡 | decision/evaluation refs、scope、证据摘要与受保护 artifact refs / review receipt、索证或拒绝 | 守衡 Owner 接口；合规 Reviewer 决定真实范围 |
| Market → Shopify | 有效内部决定 + 守衡复核 + draft gate + storeRef + payloadHash / DRAFT id 或真实拒绝 | Shopify Owner；独立店铺写入授权；没有 receipt 只算 prepared |
| product/Echo → Market | 候选/机会 ID、SKU/规格引用、source/snapshot、scope / caseId、accepted 或缺口 | 本期可人工受控提交，不强依赖上游全量联通 |

平台原始字段（例如 header.event_id、event.operator.open_id）只在 gateway 解析；规范化合同保留原 app/tenant/event 来源。open_id 按应用作用域映射，不跨应用误认同一用户。

官方文档区分普通异步事件和同步 card.action.trigger：卡片要在 3 秒内响应且无普通事件那样的补推保证。入口先验证并持久接单，返回平台要求的响应/“已受理”；后台结果再刷新卡片。Market 内部 202 不能原样替代飞书卡片响应。Webhook/WS 用官方 SDK 与已有网关能力，按实际通道核验，不手写猜测的签名协议。

Main 服务身份可以代传经过验证的 human 操作，但**服务身份本身没有 human 审批权**。后台由受管身份目录核对 actorType、角色与 case/store 权限；不接受浏览器或卡片 value 的 roles/approved=true 作为权威。

### 7.7 数据 SLA、变更与必须覆盖的负向用例

- 读取当前可用性用当前时间，不沿用历史 projectionAsOf 作为准入时钟。报价、汇率、证书、研报各自有效期由供数/财务/合规签认；未给关键有效期保持对应 gate blocked，不设置通用拍脑袋 TTL。
- 私有资料默认仅试点具名角色可读；保留/删除政策由数据 Owner 与法务确认，不能把“不可变审计”理解为无限期保留原始资料。
- 字段/公式/gate 的破坏性变更提高合同版本，重建 evaluation，重获必要签认；不覆盖旧快照或静默修改历史结果。
- 必测：缺值与零/N/A、按单/按件混用、折扣/税/退款重复、同输入复算、负贡献/无法保本、同键不同内容、自审/伪造 human、两人并发签认、提审后输入变更、过期/撤回、旧卡动作、旧计算迟到、未知交接不重复发、收到后撤回不伪造回滚。
- 合同测试/fixture 只证明实现边界；真实人审、目标接收与业务 KPI 另有验收证据。上述新接口仍 proposed，后续分别记录 localImplemented、integrationVerified、authorizedLive，不因文档定稿直接晋升。

## 8. 实施包与影响范围

以下仅定义未来必要修改范围；调用方、测试、fixtures、配置和导出需同批完成。

| 包 | 输出 | 复用/涉及资产 | 验证 |
|---|---|---|---|
| MP-01 范围与口径 | 候选/输入/人审/验收合同 | 现有产品路线图、SKU/法规合同、PMO 编号 | 业务/财务/法务确认，无隐式默认 |
| MP-02 保护与版本 | 新域权限一致性、部署/数据范围 | 当前 nginx 合同、部署/质量脚本、静态 canonical | 未授权拒绝、授权可见、回滚证据；另获生产授权 |
| MP-03 决策骨架 | case/version/event/摘要 | backend source/snapshot/review/audit/RBAC 模式 | 创建、拒绝、自审、撤回、并发与幂等测试 |
| MP-04 独立 Bot | 提问→工具→卡片→动作回写 | Main 网关/PMO 传输（待核验）；Market 应用配置 | 真实身份往返；重放/伪造/过期卡负向测试 |
| MP-05 证据查询 | 市场与法规准备度卡 | source registry、PageEvidenceNotice、FactDisplayGate、法规 intake | scope/freshness/冲突/缺证不晋升 |
| MP-06 DTC 核算 | 显式输入与确定性结果 | Sage 公式与受控工具适配（待核验） | 单位/币种/舍入、异常值、缺项、同输入复算 |
| MP-07 工作台任务面 | M5 单任务详情、人审与摘要（不做候选批量管理） | 现有路由、UI、来源 GET adapter；新增最小 case adapter | loading/error/empty/权限/撤回、桌面/移动端 |
| MP-08 交接与运营 | 守衡/Shopify receipt、任务追踪 | 下游合同、append-only 事件、PMO 证据索引 | 真实接收或真实拒绝；不公开发布、不调预算 |
| MP-09 SOP 稳定化 | 高频候选、版本/门禁与工位 | 已有工作流/半月管线，成熟后接入 | 去除测试流量；≥14 天稳定窗口；不足则继续观察 |

不将所有 45 路由切换 API。只放行试点必要的受保护读写路径；旧页面继续保留其证据边界。全站示例数值/计数问题单列后续治理，不借本期顺手大改。

## 9. 条件化执行时间线

| 日期 | 工作/交付 | 主责 | 退出条件与失败处理 |
|---|---|---|---|
| 11-06～11-09 | 单样本范围、资料清单、复核人、投入窗口；权限/版本风险 | 吴雨宁协调；周健/运维；业务提供 | M5 主样本与 Owner 明确；私有数据受保护范围确认。缺项只推进合同，不接真实输入 |
| **11-10** | **双门同日：Gate A 接口核验 + 资料交接**。Gate A 覆盖 Market 身份、Main 网关、Sage、下游合同；资料覆盖 M5 报价格式、规格/宣称依据、证书、费率/税/退货口径 | 周健 + 接口 Owner；吴雨宁收资料；业务/财务/合规提供 | 两条独立轨道：接口未成立则缩范围/报延期；**资料未齐则对应 gate 转 HOLD，不阻塞证据卡路线**。当日必出「接口清单 + 资料到件/缺件清单」 |
| 11-10～11-13 | #24 P1：需求、卡片、任务面与证据合同；**消化 11-10 到件资料并标缺件** | 吴雨宁 | 字段/拒绝路径冻结；到件项与缺项分列；原型不是生产成果。**资料 11-10 才到，本窗口无返工余量** |
| 11-14～11-18 | #24 P2：最小后端/独立 Bot/证据卡；#25 P1：M5 DTC 核算合同 | 周健；吴雨宁；财务签认 | 身份、hash、审批分离、撤回/幂等具备测试；M5 输入齐项才冻结公式，缺项保持核算阻断 |
| 11-19～11-23 | #24 P3：M5 真实查询/证据卡试点；#25 P2 前置 | 刘华丽测试；周健核算；吴雨宁推广 | 独立 @Market 真实往返、任务回写、来源/缺口可解释。**出席仅周健 → 记技术检查点，不记 P3 验收** |
| 11-19～11-24 | #25 P2：M5 核算、人审与受控交接 | 周健 + 财务/合规/下游 Owner | 真实输入可复算，拒绝/撤回有效；下游状态有可验证回执。财务/合规未出席则人审不成立 |
| 11-25～11-29 | #25 P3：M5 单样本定向验收 + 交接回执 | 刘华丽；业务/财务/合规实审 | M5 有可复算结果或明确阻断；至少一件真实实审；适用交接有 receipt，否则只记 prepared。**出席仅吴雨宁 → 技术检查点** |
| 12-01 起 | S12 Pro / M6 补位、真实使用、SOP 候选与稳定窗口 | 刘华丽运营；周健规则；吴雨宁固化 | 延后候选按同一合同复用；达阈值只触发候选；固定版本后 ≥14 天稳定才评审 Stage 4 |

12-14 是最早建议稳定性评审点，不是必达日期。候选生成更晚或中途重大修改，稳定窗口顺延。

关键路径：**资料/口径与签认 → 保护/身份/接口 → 证据与核算 → 人审 → 下游回执**。

## 10. 分层验收与业务指标

### 10.1 11-23：#24 技术检查点（M5 单样本，非验收）

- 独立 @Market：M5 真实提问、受控工具、卡片动作、同一任务回写。
- 单主样本有证据/资料处理状态；缺证列 Owner 与解除条件。S12 Pro / M6 不计入本期覆盖要求。
- 市场卡明确时间、scope、冲突；法规卡是准备度/复核状态，不自动生成法律意见。
- 权限不足、伪造事件、重放、过期卡、自审与撤回负向路径通过。
- 保留有来源的历史语境，但不能将其作为当前商业准入事实。

### 10.2 11-29：#25 测算技术检查点（非验收）

- M5 关键输入未齐时明确阻断，不静默补假设；不追求候选数量覆盖。
- 同输入/同公式版本可复算；试点决策使用的每个数值有来源或签认输入。
- **11 月只交测算与阻断，不产生财务/合规实审结论或业务决定**；实审与决定移 12 月。工程代签记 0。
- 11 月结论只有「可复算 / 因缺项 HOLD」两类；GO / NO_GO 需 12 月真实人审，不在此窗口造假。
- **11 月不开放 GO → 交接正向链**；receipt 子门整体移 12 月，prepared 在本期即上限。
- 若 M5 为 HOLD，验证阻断、缺件清单与解除条件；**Shopify 生产 DRAFT 子门标未验证**。
- 不公开发布、不执行预算调拨；两者需另设授权。

### 10.3 12 月：SOP 稳定性

- 原始事件标区分 business/test/fixture；重复请求去重。
- ≥10 次/周或 ≥3 次人工纠正只触发 SOP 候选。
- 定义返工分母；少量案例不足以支持可靠返工率，需报告样本数。
- 候选通过固定正负向测试、人工评审和版本控制后，观察 ≥14 天。
- 返工率 <20%、证据可追溯和权限边界稳定才固化；否则继续观察。

### 10.4 指标

北极星指标：**资料齐备候选从完整输入到有签认决定的中位耗时**。先采手工基线，再冻结改善目标；本轮没有测得节省时间或收益。

辅助指标：候选处理覆盖率、缺证正确阻断率、决策证据可追溯率、人审完成数、真实下游接收率。

反指标：无证据批准数、越权/自审放行数、重复交接数、撤回后仍可用数、私有信息进入公开产物数；试点要求均为 0。

资料不齐导致的等待单独统计，不用它掩盖工程耗时，也不以简单点击数充当 measuredActions。

## 11. 单一主责、签认与实际交付

A 是该交付物最终责任，R 是执行者；同一交付物只一个 A。产品合同 A 和财务/法务签认不是互相代替的角色。当前具名工程分工来自 PMO；业务审批身份仍待指定，不能给三名工程人员默认商业/法律批准权。

### 11.1 责任与签认矩阵

| 交付物 / 决定 | 唯一 A | R / 必须协作 | 签认产物与禁止代签 |
|---|---|---|---|
| 试点边界、功能/字段、卡片与推广 | 吴雨宁 | 业务 Owner、周健、刘华丽 | 需求/字段版本；吴不替业务作最终 GO，不替财务/合规签认 |
| 候选真实身份、资料提交、范围接受 | 业务 Owner（待具名） | SKU/DTC/供应链提供人，吴雨宁整理 | 候选清单、storeRef/specRevision、输入交接；真实内容责任不转嫁开发 |
| 财务口径与输入批准 | 财务 Owner（待具名） | 报价/费率提供人、周健适配 | 公式、单位/税/退货口径与输入签认；独立财务 Reviewer 不审批自己提交的同件评估 |
| 内部立项所需法规/证书适用性复核 | 合规/法务 Reviewer（待具名） | SKU资料提供人、守衡 Owner | evaluation/证据/范围签认；仍不作无限法律保证，不用关键词扫描替代 |
| 每个候选内部 GO/NO_GO/HOLD | 业务决定人（待具名） | financial/regulatory Reviewers 提供有效结论 | 决定仅 internalProject；不得为赶时间省略必要专业签认 |
| schema/API、治理、人审/核算适配 | 周健 | 吴雨宁字段设计、Sage/Main 提供方、刘华丽测试 | 接口版本、端到端证据、负向用例；不能代财务/法律判定 |
| 独立 Market 应用、群/角色映射和网关 | 周健 | 飞书管理员、Main Owner、刘华丽控制台 | 应用权限/身份路由和真实往返；@Main 代播不算 @Market |
| 新域保护、后端激活与回滚 | 周健（Market 技术交付） | 运维/安全执行生产，吴确认数据可见范围 | 各自授权记录；技术主责不自动取得生产变更权限 |
| 守衡接收与复核回执 | 守衡 Owner（待具名） | 周健适配、合规 Reviewer | 接收/复核/索证 receipt；系统验收不代 SKU 适用性签认 |
| Shopify DRAFT 接收与店铺闸口 | Shopify Owner（待具名） | 电商授权人、周健、守衡 | 店铺授权、DRAFT receipt；不含公开 publish，不用内部 GO 代替写授权 |
| 测试、分层验收、运营和高频统计 | 刘华丽 | 周健修复，吴推广，业务参与 | 测试/live 分开证据，真实事件与返工基线；QA签字不等于业务/财务批准 |
| SOP 产品固化 | 吴雨宁 | 周健实现，刘华丽稳定性验证，业务 Owner 接受 | ≥14天稳定版本与验收；高频阈值本身不是固化批准 |

试点允许业务 Owner 兼任业务决定人，但 financial/regulatory 复核独立且不能绕过自审约束。若同一人既供数又签认，需另指定该材料的独立 Reviewer；不是为了形式新增岗位，而是避免自己证明自己正确。每份签认只覆盖其领域和该候选评估；11 月只对 M5 生效，不能将一件通过外推到延后的 S12 Pro / M6。

### 11.2 与三棒排期对应的交棒包

| 检查点 | 吴雨宁必须交付 | 周健必须交付 | 刘华丽必须交付 | 外部依赖 |
|---|---|---|---|---|
| 11-09 前（吴雨宁 A 催办；11-06 至 11-09 仅一个工作日，未齐即顺延至 11-10 与 Gate A 同判） | M5 单样本范围、字段清单与具名签认回填表 | 数据保护/接口风险和实际接入核验清单 | 试点角色/群范围、可用时段与负向用例清单 | 业务、财务、合规与电商 Owner 提交具名责任人；**资料交接日已定 2026-11-10** |
| **11-10 Gate A + 资料交接** | 接受各接口业务输入/输出与缺口；收 M5 资料并标缺件 | Main/Sage/守衡/Shopify 请求响应合同、身份/查询/去重/回执证据 | 管理员应用权限核验与阻断升级 | 提供方对实际 endpoint/权限签认，不存在即报阻塞；资料未齐则 M5 转 HOLD 并列缺件 |
| 11-13 #24 P1 | decision_contract、卡片字段与任务详情；与业务/财务/合规确认 | 技术可实现性签认，不向 P2 交含糊接口 | 冻结 11-23 正负向验收表 | 数据有效期、私密范围须由 Owner 签认（当前未提供）；订单粒度按单 SKU 一件/单执行 |
| 11-18 #24 P2 / #25 P1 | DTC 口径与测算展示合同，提供人签认 | 身份、持久事件、hash/版本/审批隔离、独立 Bot 与来源工具局部联通 | 重放/自审/撤回/旧卡/权限负向测试 | 真实资料交接与独立 input review；公式能力未满足保持核算阻断 |
| 11-23 #24 P3 | 业务试用与培训，报告使用/阻断反馈 | 修复证据/回调问题；#25 核算按合同联调 | 真实 @Market 查询→卡片→动作回写证据；不替代商业签认 | 不将 #24 提前变成完整 Go/No-Go 验收 |
| 11-24 P2收口 / 11-25～11-29 P3 | 接受 M5 决策摘要和交接可用性，保留缺口 | 实现可复算 DTC、有效人审与下游受控交接 | M5 有可复算结果或明确阻断、真实实审、真实receipt与未验子门清单 | 业务/财务/合规真正参与；下游真实接收或拒绝，不制造正向 GO |
| 12-01 起 | 成熟 SOP 工位设计与业务接受 | 候选规则/版本与回归，未稳定不迁移 | business/test分离的高频/返工统计，≥14天稳定验证 | 未达到真实样本/稳定要求则继续观察 |

容量上限（2026-11-06 回填）：吴雨宁 10 h/周、周健 20 h/周、刘华丽 10 h/周，11-10～11-29 三周合计约 120 h。这是上限而非承诺；周健仍承担 PMO 名下其他在办能力。验收出席：11-23 仅周健，11-29 仅吴雨宁。

**这两组出席都不满足本稿自己的验收规则。**11-23 是 #24 的 P3 窗口、11-29 是 #25 的 P3 窗口，两个窗口的验收主责都是刘华丽；周健是 P2 技术、吴雨宁是产品合同。按第 10 节「测试与 live 分开、工程代签记 0」，单人出席只能产出技术走查记录，不能产出独立验收结论；11-29 还没有财务/合规人员出席，无法支撑第 10.2 节原定的财务/合规实审（该条已移 12 月）。因此这两次出席必须改称**技术检查点**，而不是 P3 验收通过。

### 11.3 六组回填与候选溯源

订单基准已确认：`singleSkuSingleUnit`、quantity=1。用户授权从指定 Feishu 目录自选；据此选择三款的 Single 基础变体（非赠袋 SKU），不是随机抽样或经营优先级评估。sourceProductRecordId/sourceSkuRecordId 是两个表的原始定位；productId、variantId、skuCode 分开。candidateId 以现有 variantId 定位该销售单元，不拿商品 record_id 当 SKU。

| 候选 | sourceProductRecordId / productId | candidateId (=variantId) / sourceSkuRecordId | skuCode / 目录规格 |
|---|---|---|---|
| M5 Smart Wearable | `reczz28VpqMBp0SK` / `8673508131014` | `45415255507142` / `reczz28VprAcZlFJ` | `BP380-MR70000B00104-C` / Single · Cozy Red |
| S12 Pro Quick | `reczz28VpqMBopb7` / `8782433452230` | `45528303927494` / `reczz28Vpr8Ltie5` | `BP335-WH70000B00103-A` / Single · White |
| M6 Mobile Style | `reczz28VpqMBmL0A` / `7918308491462` | `43054628864198` / `reczz28VprIlhLNd` | `BP345-NR70BA-A` / Single · Cozy Red |

目录发布时间分别为 M5 2025-10-14、S12 2026-03-04、M6 2024-04-24（Feishu 时区日期）；三项定位为已有商品的准入流程回放。日期和“可售”只是目录字段，不能证明美国市场当前库存/销售状态；本次不计作新品首次上市或已获 GO。Single 仅是减少差异的选样，不意味着一个 Double 销售包装必然违反“一件/单”。

| 组 | 已回填 | OPEN 项 / 解除责任 |
|---|---|---|
| 1 候选 | 三个销售单元及映射；**11 月主样本锁定 M5 / `BP380-MR70000B00104-C`**，另两项延后至 12 月 | M5 回放用途由业务 Owner 接受；另两项复用同一合同 |
| 2 店铺 | Momcozy 美国 DTC、US/DTC/USD | storeRef、后台店铺身份、运营时区、写授权；电商 Owner |
| 3 规格/用途 | 用途“美国 DTC 穿戴式吸奶器”、目录 Single 规格 | specRevision、分类、宣称、证书；SKU/合规 Owner；目录 rev 不代填 specRevision |
| 4 业务/人审 | 五角色已定义，用户选择保留占位 | 具名 businessOwner/finalGoDecider/financeOwner/complianceReviewer/dataSubmitter 与独立复核关系 |
| 5 接口/管理 | 周健负责 Market 技术交付及接口协调 | Main/Sage/飞书/守衡/Shopify Owner/管理员、实际接口/权限/receipt；各提供方，周健协调 |
| 6 日期/容量 | 三人上限 10/20/10 h/周；**资料交接 2026-11-10 已定**；11-23 周健出席、11-29 吴雨宁出席 | 刘华丽未列入任一验收出席；11-29 缺财务/合规实审出席；报价/汇率/证书有效期、保留政策；对应 Owner |

成本报价、支付/履约/退货、税费/汇率、目标阈值及签认均未从目录获得；仍是财务 gate，不用商品最低/最高售价替代。查询范围：指定商品 view `vewpgznLye` filter为空；商品表rev76、SKU表rev32，14条关联变体/3条商品已读到 has_more=false，并核验双向link与productId一致。

证据：`tmp/outputs/market-agent-discovery-20261106/feishu-intake/` 的 selected-product-provenance / candidate-sku-links NDJSON 与 manifest；先前17条 Breast Pump目录池在 `tmp/market-candidate-breast-pump-20261106.ndjson`。原 Feishu 只读，未改写任何记录；旧审核、审计优先级和目录价格不晋升 Market 结论。

### 11.4 冻结范围、授权与升级

**本轮结论：已确认业务范围可以锁定；整体实施/业务合同未冻结。** 第7节为接口/字段设计候选，不因目录可读而变 integrationVerified。六组触达不等于六组资料齐备；第4组占位、第5组仅协调责任、第6组未提交，不能写“真实回填完成”。

- 范围基线：US DTC/USD、穿戴式品类、**唯一主样本 M5 / `BP380-MR70000B00104-C`**、一件/单、内部GO边界、周健协调；S12 Pro / M6 仅存目录映射，不入 11 月范围。变更须重新确认。
- 设计候选：第7节字段/状态/API/人审与撤回规则，可用于合同评审；暂无具名签认，不标稳定/执行冻结。
- 实施冻结需具名产品/技术责任人接受schema和接口合同；业务冻结还需店铺/spec/真实输入/独立人审与有效期。测试/fixture不替代签认或真实接收。
- OPEN 门禁按上表挂账，资料未到不反复问已定范围；缺人审不开放审批，缺店铺写授权不发Shopify请求。原日期保留为有条件目标，缺资料不自动NO_GO。
- 方案冻结不授权生产、nginx、真实成本/证书读取导入、provider、飞书发送、Shopify写入或事实晋升。用户指定目录的本轮最小只读是当前具体授权，不扩到其他私有资源；每项副作用另留范围、窗口与验收。
- Gate A失败由周健出证据、吴雨宁调整受影响范围、刘华丽记录未验子门；已发送的更正不冒充自动回滚，目录回放不冒充新品商业成果。

### 11.5 容量决定：11 月只做 M5 单主样本

已回填 120 h 上限（三周）覆盖 Gate A 四系统对账、最小决策骨架、独立 Bot 双向回调、证据卡、DTC 核算适配、工作台任务面和交接回执本就不足；周健 60 h 还要扣他名下其他在办能力。**2026-11-06 已决定收口，不再作为待选项。**

- 11 月唯一主样本：M5 Smart / `BP380-MR70000B00104-C`（Single · Cozy Red）。
- S12 Pro、M6 在 11 月只保留目录映射，12 月复用同一合同补位。
- 11-23：M5 真实 @Market 提问 → 市场/法规准备度卡 → 同一任务回写，记技术检查点。
- 11-29：M5 DTC 情景测算；交接最多到 prepared，没有真实 receipt 不写 received。
- 财务/合规实审、代理治理项与另两个候选移到 12 月。

**资料交接 2026-11-10 已定**，与 Gate A 同日。单样本工时未估，可行性在 11-10 复核后判定。P1 窗口（11-10～11-13）要同时消化接口结论和到件资料，没有返工余量；资料延迟会直接压到 11-18 的核算合同冻结。资料未齐时 M5 转 HOLD 并列出缺件，不阻塞证据卡路线，也不因此改判 NO_GO。

## 12. 不做项与阶段后续

11 月不做：重写 React/Vite、新建站点、53 个子 Agent、重建采集中台、全量 Amazon/CRM/VOC/ERP 接入、七国自动法律裁决、十四渠道预算最优、自动 Shopify 公开发布、无审查的 SOP 自改。

后续顺序：

1. 美国 DTC 试点真正通过后，再扩国家/渠道；新法域重新取得适用性依据。
2. 按业务价值补竞品授权数据；DQ-020 全量映射不阻塞本期受控 DTC 情景。
3. 独立验证 DataPilot 快照与接口后，接存量盈利/预算诊断；不沿用未经验证的收益读数。
4. 真实 SOP 成熟后再接半月流水线；流水线运行、新数据采集和业务发布分别验收。

## 13. 本轮验证与未验证

已完成：PMO 目标/排期/SOP/交接只读核对；新域首页/市场/法规和 manifest 观测；匿名新旧域门禁对比；源码与 no-write 数据/法规审计；两轮方案及反面审查；本地讨论页桌面和 390px 移动端检查，页面无水平溢出，表格溢出限制在容器内；按用户指定 Feishu Wiki 表只读解析、筛选 `Breast Pump`、读取三款商品与14条关联变体，并完成三条 Single 变体映射。

未执行：全量 Vitest/pytest/生产 E2E、生产 SSH/cron 日志核验、真实门户身份、Main 网关/Sage/DataPilot/守衡/Shopify 接口联调、真实 SKU 人审、供应商/应用 provider 调用或飞书发送。本轮 Feishu 读取仅是用户指定表的只读观察，不是业务 Owner 提交或审批回执；本轮审计结果不是一次 release 验收。

浏览器讨论页无外部脚本/样式/图片依赖；控制台仅发现缺 favicon 的 404，不影响正文，未为此增加依赖或文件。

## 14. 主要证据与接续讨论

- PMO：<https://pmo.luteos.com/>、<https://pmo.luteos.com/projects>、<https://pmo.luteos.com/roadmap>、<https://pmo.luteos.com/sop>、<https://pmo.luteos.com/sites>。
- 线上：<https://mkt.luteos.com/#/market>、<https://mkt.luteos.com/#/industry/regulation>、`/periodic-data/latest.json`。
- 当前市场边界：`app/src/data/market-insight-data.ts:4-98`。
- 新鲜度固定基准：`app/contracts/source-freshness-policy.json:4`；当前使用规则 `app/src/data/source-freshness.ts`。
- 路由合同：`app/contracts/route-target-metrics.json`、`app/src/data/route-readiness.generated.ts`。
- 后端/生产边界：`backend/README.md`、`backend/src/mkt53_backend/`、`app/src/data/source-registry-adapter.ts:178-221`。
- 部署链：`app/scripts/deploy-static.sh:15-24`、`app/package.json:11`。
- 历史执行与 DQ：`docs/product/product-roadmap-execution-20260723.md`、`docs/reviews/mkt53-data-completeness-mece-20260729/EXECUTION_TODO.md`。
- 本轮机器取证：`tmp/outputs/market-agent-discovery-20261106/` 的 PMO、manifest 与交接合同 JSON；只作为临时调研输出。
- 2026-11-06 合同细化重新读取现有 schemas/auth/source_api/review_registry，核验 camelCase、400/422/428、ETag 与当前身份边界；新增 Market 端点尚未实现。
- 飞书响应/身份依据：<https://open.feishu.cn/document/event-subscription-guide/callback-subscription/callback-overview>、<https://open.feishu.cn/document/feishu-cards/card-components/interactive-components/input>、<https://open.feishu.cn/document/server-side-sdk/python--sdk/handle-events>。通过 Context7 读取官方文档，未调用应用/平台 API。
- FastAPI 字段校验默认 422 依据：<https://fastapi.tiangolo.com/tutorial/handling-errors/>；本项目缺 Idempotency-Key 400、缺 If-Match 428 以 `backend/src/mkt53_backend/source_api.py:35-46` 为准。

**2026-11-06 用户已接受 GO 产品边界，并确认首批核算基准为一个销售 SKU、一件/单；用户随后授权从指定 Feishu 商品表自选候选，已完成三条商品到 Single 变体的只读映射。当前仅锁定已确认业务范围；第 7 节接口形状与第 11 节单 A 分工仍是设计候选，未标稳定/实施冻结。规格、店铺正式身份、具名责任人、接口 Owner、资料交接和工时仍是 OPEN 门禁。该基准仅用于候选内部准入比较，不外推全站利润。**
