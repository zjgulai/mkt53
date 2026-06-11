---
title: mkt53 项目理解、问题地图与工作流
doc_type: architecture
module: mkt53
topic: system-map-and-workflows
status: stable
created: 2026-06-04
updated: 2026-06-11
owner: self
source: human+ai
---

# mkt53 项目理解、问题地图与工作流

## 1. 结论摘要

mkt53 当前不是单一静态展示站，而是一个“Momcozy 市场洞察工作台”。它把母婴市场研究、竞品追踪、用户研究、行业政策、品牌自研、AI 辅助分析、报告中心、数据治理和半月采集状态放在同一前端产品中。

当前系统事实：

- 前端：React 19 + TypeScript + Vite 7 + React Router v7。
- 路由：`App.tsx` 中定义 46 条路由，其中业务页面覆盖市场、竞争、用户、行业、自我洞察、AI 助手、AI 图库、报告、数据管理、数据来源管理。
- 数据资产：`DataManage.tsx` 中维护 6 大数据模块、27 张数据表、字段字典、治理信息和数据血缘。
- 来源注册：`source-registry.ts` 中维护 45 个来源条目。
- 半月刷新：`refresh-semi-monthly-data.mjs` 读取 `sourceRegistry`，结合一致性审计和连接器 backlog，生成 `public/periodic-data/latest.json`，并同步写入 `public/weekly-data/latest.json` 兼容路径。
- 最新线上数据状态：`period=2026-06-H1`，`generatedAt=2026-06-11T07:30:40.503Z`，`total=45`，`ok=10`，`manual-required=12`，`connector-required=23`，`issueCount=0`。
- 部署：`deploy:prod` 通过 test、lint、audit、build 后 rsync 到腾讯云轻量服务器 `/opt/mkt53/html/`，由共享 nginx 容器 `ai_video_nginx` 服务。

核心判断：

- 当前项目已经具备“数据状态透明化”和“证据边界显性化”的基础能力。
- 当前项目还不是完整自动化数据平台，因为 23 个来源仍依赖授权连接器或内部系统输入。
- 当前项目最适合作为市场/品牌/产品团队的“决策前置工作台”，不应被包装成已经具备全量真实实时数据的 BI 系统。

## 2. 业务定位

### 2.1 服务对象

主要用户：

- 市场负责人：判断市场规模、区域机会、品类趋势。
- 竞品分析人员：跟踪 Amazon / 品牌官网 / 新品 / 价格 / 区域竞争。
- 用户研究人员：汇总用户画像、访谈、情感、审美偏好和渠道反馈。
- 产品经理：把市场、用户、竞品、法规和供应链信息转成产品机会。
- 运营与管理层：查看 KPI、报告、风险和数据可信度。
- 数据治理维护者：维护来源、表、字段、血缘、连接器和半月刷新状态。

### 2.2 核心业务闭环

业务闭环可抽象为：

```text
外部/内部来源识别
-> 来源可信度与采集方式分类
-> 数据表/字段/血缘/治理建模
-> 页面专题化展示
-> AI/报告/工作流辅助分析
-> 半月刷新与异常透明化
-> 决策或补采集任务
```

这个闭环的关键不是“把所有数据都显示出来”，而是把每个数据的来源、状态、缺口、下一步动作明确化。

## 3. 产品结构

### 3.1 一级业务域

| 业务域 | 入口 | 主要问题 |
|---|---|---|
| 首页 | `/` | 总览、KPI、业务导航、核心洞察入口 |
| 看市场 | `/market` | 市场规模、趋势、品类、海关、TAM/SAM/SOM |
| 看竞争 | `/competition` | 竞品概览、新品、区域竞争、产品管理 |
| 看用户 | `/users` | 用户画像、海外情感、访谈、渠道、门店、审美 |
| 看行业 | `/industry` | 法规、政策、功能地图、新闻、供应链、IP、展会 |
| 看自己 | `/self` | Momcozy 产品、价格、渠道、营销、BCG/4P |
| AI 助手 | `/ai-assistant` | 评论分析、YouTube、设计、知识库、网页评论 |
| AI 图库 | `/ai-gallery` | AI 图像素材与提示词资产 |
| 报告中心 | `/reports` | 内部报告目录和报告预览 |
| 数据管理 | `/data` | 表、字段、治理、血缘、半月采集状态 |
| 数据来源 | `/data-source` | `sourceRegistry` 的来源可信度与复核状态 |

### 3.2 数据管理结构

数据管理页维护 6 大模块：

| 模块 | 页面 | 表数 | 典型表 |
|---|---:|---:|---|
| 市场洞察数据 | `/market` | 6 | `market_size_global`、`market_trend_monthly`、`customs_data`、`category_analysis` |
| 竞争情报数据 | `/competition` | 4 | `competitor_products`、`new_product_tracker`、`price_analysis` |
| 用户研究数据 | `/users` | 5 | `user_personas`、`social_mention_data`、`user_comments`、`rfm_user_segments` |
| 行业动态数据 | `/industry` | 4 | `policy_regulations`、`supply_chain_nodes`、`ip_patents`、`trade_exhibitions` |
| 品牌自研数据 | `/self` | 4 | `momcozy_products`、`pricing_strategy`、`channel_performance` |
| AI辅助数据 | `/ai-assistant` | 4 | `comment_analysis_ai`、`design_assistant_output`、`knowledge_base`、`web_review_scraped` |

## 4. 数据来源与证据边界

### 4.1 来源注册状态

当前 `sourceRegistry` 有 45 个来源：

| 维度 | 分布 |
|---|---|
| 模块分布 | 看市场 9、看竞争 4、看用户 8、看行业 11、看自己 2、AI助手 8、报告中心 1、数据治理 2 |
| 复核状态 | verified 9、needs-review 23、example 13 |
| 可信度 | A 14、B 12、C 16、D 3 |
| 采集方法 | public-url-check 8、manual-required 12、connector-required 23、local-file-check 2 |

### 4.2 连接器 backlog

当前 23 个 `connector-required` 来源分为 10 组：

| 连接器 | 优先级 | 来源数 | 影响页面 |
|---|---:|---:|---|
| Amazon Marketplace / Brand Analytics | P0 | 7 | CompetitionPage、ProductManage、RegionCompetition、SelfInsight、BabyCare、CategoryAnalysis、NursingProducts |
| Review / VOC NLP Pipeline | P0 | 4 | CommentData、ReviewAnalysis、FlavorMap、FlavorReport |
| Momcozy CRM | P0 | 1 | UsersPage |
| TikTok / Instagram / Facebook Social Listening | P0 | 1 | OverseasSentiment |
| Momcozy ERP / Supply Chain | P1 | 1 | SupplyChain |
| Import Genius / Customs Trade Data | P1 | 1 | CustomsData |
| YouTube Data API | P1 | 1 | YoutubeReview |
| Internal Knowledge / Reporting Assets | P2 | 4 | SelfInsight、KnowledgeBase、ReportsPage、ChannelInterviews |
| AI Generation Audit Log | P2 | 2 | AIGallery、DesignAssistant |
| Compliant Web Review Crawler | P2 | 1 | WebReview |

### 4.3 证据分层规则

当前系统必须保持以下边界：

- `ok`：只能说明公开 URL 或本地代码资产在本次半月任务中可达/可校验。
- `manual-required`：说明需要人工上传、采购报告、访谈记录或条目级复核。
- `connector-required`：说明缺少授权 API、内部系统、合规爬虫或脱敏审计，不能产出真实业务数据。
- `example`：说明当前页面数据只能作为产品形态或分析口径样例。
- `needs-review`：说明来源存在，但还需要补采集任务、样本、口径、复核记录或人工凭证。

## 5. 横向问题地图

横向问题是跨页面、跨模块、跨团队反复出现的问题。

### 5.1 数据可信度问题

大类问题：

- 页面展示的数据是否有明确来源。
- 来源是否已复核。
- 来源是否具备 URL、采集任务、样本窗口、时间戳。
- 示例数据是否被误读为真实业务事实。

细分问题：

- 公开研报能访问，但口径、年份、地区、样本不一致。
- Amazon 数据需要授权和 SKU/ASIN 映射。
- CRM/ERP 是内部系统，必须脱敏、授权和记录 owner。
- AI/NLP 输出需要模型版本、样本窗口、准确率和人工复核一致率。
- 访谈和定性研究需要样本量、招募条件、授权状态。

解决工作流：

1. 在页面找到指标或结论。
2. 追溯到 `sourceRegistry` 条目。
3. 检查 `verificationStatus`、`reliability`、`lastVerified`、`gap`、`action`。
4. 运行 `npm run data:audit` 检查页面/表/来源一致性。
5. 运行 `npm run data:refresh:semi-monthly` 更新 manifest。
6. 对 `connector-required` 生成接入任务，不伪造数据。
7. 对 `manual-required` 建立人工复核材料或报告凭证。

### 5.2 市场机会判断问题

大类问题：

- 哪些品类值得进入或加码。
- 哪些区域增长最快。
- 哪些趋势会影响产品路线。
- Momcozy 当前机会在哪里。

细分问题：

- TAM/SAM/SOM 的报告口径不统一。
- 区域份额来自外部研报，自动化访问可能受 Cloudflare 或采购墙限制。
- 品类拆分存在推算权重，需要补公式。
- 海关数据当前需要 Import Genius 或海关数据授权。

解决工作流：

1. 从 `/market` 进入市场总览。
2. 按 `/market/trend`、`/market/category`、`/market/customs` 拆解趋势、品类、贸易。
3. 对每个关键指标检查来源等级。
4. 把 A/B 级来源作为方向性依据，把 C/D 或 example 标记为待复核。
5. 输出机会清单：品类、区域、证据强度、数据缺口、下一步采集任务。

### 5.3 竞品与价格监测问题

大类问题：

- 竞品 SKU、价格、评分、卖点和新品变化如何影响 Momcozy。
- Amazon 渠道数据是否能支撑竞品判断。

细分问题：

- Amazon/Brand Analytics 需要授权。
- SKU/ASIN/品牌映射必须私有保存，不能进入公开静态包。
- 当前若没有真实采集窗口，不能把价格和排名展示为实时结论。
- 新品线索可以来自官网/新闻稿，但销量结论不能只靠新闻稿。

解决工作流：

1. 在 `/competition` 识别竞品主题。
2. 进入 `/competition/products` 或 `/competition/new` 检查 SKU、新品、价格。
3. 对 Amazon 来源执行 private mapping dry-run 或 readiness checklist。
4. 输出竞品观察结论时附带采集窗口和 sampleCount。
5. 未授权时只输出 backlog 和接入要求。

### 5.4 用户洞察问题

大类问题：

- 目标用户是谁。
- 用户痛点是什么。
- 不同区域、渠道、门店、审美偏好如何变化。
- 社媒和评论是否支持产品需求判断。

细分问题：

- QuestMobile 中国有孩家庭画像不能外推全球哺乳用户。
- Mamava/Medela 海外母乳喂养调研需要样本、题目和地区说明。
- 社媒声量需要 Meta/TikTok 授权或合规供应商。
- 用户评论需要 Amazon/API 授权和 NLP 模型评估。
- 访谈需要样本、招募、脱敏和授权。

解决工作流：

1. 从 `/users` 查看用户画像。
2. 分别进入海外情感、消费者访谈、渠道访谈、门店访谈、审美偏好。
3. 按“定量、定性、社媒、评论、内部 CRM”分层。
4. 对每条洞察标注来源、样本、地区、时间窗口。
5. 输出用户机会：痛点、场景、影响页面、证据等级、补证动作。

### 5.5 行业合规与供应链问题

大类问题：

- 法规变化、政策趋势、供应链、专利、展会和行业新闻如何影响产品和上市节奏。

细分问题：

- CPSC/eFiling、EU MDR 等法规需要逐条官方来源和法务复核。
- 行业新闻需要条目级 URL 与发布日期，不应整体视为已复核事实。
- ERP/供应链数据是内部敏感数据，需要脱敏和权限。
- WIPO/USPTO 专利数据需要更新范围和法律状态复核。

解决工作流：

1. 从 `/industry` 进入法规、政策、供应链、IP、展会。
2. 对法规逐条标注官方来源、适用产品、实施时间、风险等级。
3. 对供应链数据检查 ERP 快照和脱敏规则。
4. 对行业新闻拆成条目级 registry。
5. 输出合规/供应链风险清单和产品动作。

### 5.6 AI 辅助与内容资产问题

大类问题：

- AI 助手、评论分析、YouTube、设计助手、知识库和网页评论如何成为可靠工作流，而不是演示功能。

细分问题：

- AI 助手当前偏前端演示和快捷命令，缺少服务端调用审计。
- 图库需要生成请求、模型版本、成本和审核状态。
- 评论分析需要真实评论样本、模型版本、准确率、人工复核。
- YouTube 需要 API key、视频 ID、配额、评论采样窗口。
- 网页评论爬虫需要 robots.txt、平台条款、限速和原文留存规则。

解决工作流：

1. 识别 AI 页面使用的输入来源。
2. 判断是 demo、代码资产、内部知识库还是真实模型输出。
3. 补齐 requestId、model、cost、status、sample window。
4. 对 NLP 输出保留人工复核样本。
5. 将 AI 输出接入报告中心或数据治理页。

## 6. 纵向问题地图

纵向问题按“决策深度”从业务目标下钻到数据资产和采集任务。

### 6.1 决策层

需要回答：

- 是否进入某区域或品类。
- 是否调整产品路线。
- 是否需要竞品防守或价格策略。
- 是否需要加快法规/认证准备。
- 是否投放某类内容、达人或渠道。

输出：

- 决策建议。
- 机会优先级。
- 风险边界。
- 证据等级。
- 待补数据任务。

### 6.2 分析层

需要回答：

- 指标怎么定义。
- 样本来自哪里。
- 时间窗口是什么。
- 竞品、用户、行业、品牌四类证据是否相互印证。

输出：

- 分析报告。
- 趋势图。
- 指标卡片。
- 关键路径。
- 血缘解释。

### 6.3 数据层

需要回答：

- 哪张表支撑哪个页面。
- 字段是否完整。
- owner 和 steward 是谁。
- 更新频率和新鲜度是否满足需求。
- PII 或内部敏感数据如何处理。

输出：

- 数据字典。
- 表清单。
- 治理报告。
- 分层架构。
- 数据血缘。

### 6.4 采集层

需要回答：

- 是否公开可采集。
- 是否需要授权连接器。
- 是否需要人工复核。
- 是否存在反爬、采购墙、合规边界。

输出：

- semi-monthly manifest。
- connector backlog。
- manual-required 清单。
- private audit sidecar。
- readiness checklist。

### 6.5 运维层

需要回答：

- 构建是否通过。
- audit 是否通过。
- 部署是否只影响 mkt53。
- nginx 是否健康。
- 线上 E2E 是否通过。

输出：

- `test/lint/audit/build` 结果。
- rsync 部署结果。
- smoke/E2E 结果。
- 线上 manifest 校验。
- 回滚和备份边界。

## 7. 关键工作流

### 7.1 半月数据刷新工作流

```text
sourceRegistry.ts
-> analyzeConsistency()
-> classifyCollectionMethod()
-> public-url-check / local-file-check / manual-required / connector-required
-> buildConnectorBacklog()
-> public/periodic-data/latest.json
-> 同步 public/weekly-data/latest.json 兼容路径
-> DataManage 优先 fetch('/periodic-data/latest.json')
-> /data 页面展示半月刷新状态
```

停止条件：

- `issueCount=0`。
- `criticalIssueCount=0`。
- `source-error=0` 和 `fetch-error=0`，或异常被显式记录。
- `connector-required` 未被伪造成 `ok`。
- manifest 的 `generatedAt` 更新到目标时间节点。

### 7.2 来源复核工作流

```text
页面指标
-> sourceRegistry item
-> reliability / verificationStatus / sourceType / sourceUrl
-> semi-monthly manifest source status
-> gap / action
-> 人工凭证或连接器任务
```

停止条件：

- 公开来源可达并记录 hash、HTTP status、content-type。
- 代码资产完成本地文件校验。
- 内部/授权/AI/爬虫来源进入 backlog，而不是伪造数据。
- 数据治理页显示状态与 source registry 一致。

### 7.3 Amazon 私有输入工作流

```text
mapping template
-> private mapping input
-> dry-run validate
-> coverage report
-> private audit sidecar
-> readiness gate
-> public semi-monthly publish
```

硬边界：

- 真实 mapping、readiness、audit 输入应保留在私有路径。
- `/opt/mkt53/private` 和 `/opt/mkt53/html` 必须分层。
- public frontend package 不得包含私有 mapping 或 readiness 输入。

### 7.4 生产部署工作流

```text
git clean state
-> npm run test
-> npm run lint
-> npm audit
-> npm run build
-> rsync dist/ to /opt/mkt53/html/
-> smoke:prod
-> test:e2e:prod
-> curl periodic-data/latest.json
-> ssh remote stat/nginx health
```

停止条件：

- `npm audit` 无漏洞。
- build 成功。
- nginx healthy。
- 线上 HTTP 200。
- E2E 全部通过。
- 线上 `periodic-data/latest.json` 的 `generatedAt` 与目标刷新一致。

## 8. 当前项目可解决的问题清单

### 8.1 已能较好解决

- 多业务域集中导航和页面化展示。
- 数据来源状态透明化。
- 半月公开来源/本地代码资产检查。
- 数据管理页与来源注册表一致性审计。
- 数据表、字段、治理、血缘、导出。
- 生产部署和 E2E 验收。
- 连接器缺口 backlog 明确化。

### 8.2 可部分解决但需要证据补齐

- 市场规模与区域机会判断。
- 品类趋势与竞品风险判断。
- 用户画像与情感洞察。
- 法规与供应链风险判断。
- AI 辅助分析和报告沉淀。

这些问题目前可以形成方向性判断，但必须附带来源等级、样本边界和补证任务。

### 8.3 当前不能直接解决

- 没有授权 API 时，不能给出 Amazon 实时销售、价格、排名、ABA 数据结论。
- 没有 CRM/ERP 输入时，不能给出真实客户分层、库存、成本、渠道表现。
- 没有 NLP 评估与人工复核时，不能把 AI 评论分析当作真实情感结论。
- 没有采购报告或人工复核凭证时，不能把反爬/采购墙页面当作完全验证事实。
- 没有法务复核时，不能把法规条目当作上市合规结论。

## 9. 图谱产物说明

本目录下生成 5 张 Excalidraw 手绘风格图：

| 图 | 文件 | 目的 |
|---|---|---|
| 业务架构图 | `diagrams/business-architecture.excalidraw` | 展示用户、业务域、数据治理、采集、部署与外部系统的总体结构 |
| 业务流程图 | `diagrams/business-workflow.excalidraw` | 展示从业务问题到页面分析、复核、报告和行动的闭环 |
| 数据流转图 | `diagrams/data-flow.excalidraw` | 展示来源、采集分类、manifest、前端页面和部署的流转 |
| 指标体系图 | `diagrams/indicator-system.excalidraw` | 展示市场、竞争、用户、行业、自我、AI 六类指标体系 |
| 数据血缘关系图 | `diagrams/data-lineage.excalidraw` | 展示外部/内部来源到核心数据表再到页面/报告/AI 的血缘 |

PNG 渲染结果保存在 `renders/`。

## 10. 后续升级路线

优先级建议：

1. P0：接入 Amazon Marketplace / Brand Analytics 连接器，补 SKU/ASIN/品牌映射和采集窗口。
2. P0：接入 Review / VOC NLP pipeline，补样本窗口、模型版本和人工复核一致率。
3. P0：接入 CRM 和社媒监听，拆分中国画像与海外母乳喂养画像。
4. P1：接入 ERP/供应链、Import Genius、YouTube Data API。
5. P1：把行业新闻、法规、技术新闻拆成条目级 registry。
6. P2：接入 AI 生成日志、素材审核、知识库版本和报告元数据。
7. P2：把当前静态表治理升级为可编辑、可追踪、可审批的数据资产台账。
