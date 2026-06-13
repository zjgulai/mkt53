---
title: 数据时效与联网补证审计草稿
doc_type: analysis
module: mkt53
topic: data-recency-web-collection
status: draft
created: 2026-06-11
updated: 2026-06-11
owner: self
source: human+ai
---

# 数据时效与联网补证审计草稿

## 结论

[事实] 当前仓库没有业务数据库、迁移层或可写业务数据表。唯一发现的 `.db` 文件是 `.codegraph/codegraph.db`，属于本地代码图谱缓存，不是网站数据存储。因此本轮不能执行“更新数据库”。可更新对象只有：

- `app/src/pages/**/*.tsx` 中的页面常量
- `app/src/data/source-registry.ts` 中的来源登记
- `app/public/periodic-data/*.json` 中的静态 manifest 和任务队列

[事实] 本地扫描在 `app/src/pages`、`app/src/data`、`app/public/periodic-data` 中发现 39 个文件包含 `2026-06-01` 之前的日期或历史年份，原始命中 1122 次。这个数字不能直接等同于过期数据，因为大量命中是历史趋势轴、法规生效日期、产品上市年份、报告发布日期或 AI 素材生成元数据。

[判断] 当前可以通过联网补证立即更新的主要是公开官网型数据，例如展会日程、法规生效日期、FDA 510(k) 条目、公开行业报告中的市场规模口径。不能通过大模型临时抓取并替代的包括 Amazon 价格/评论/销量、TikTok/Instagram/Facebook 声量、CRM/RFM、ERP/库存、海关/Import Genius、VOC NLP 结果和内部访谈记录。

[判断] 页面中 2025 年数据分三类处理：

| 类型 | 处理方式 |
|---|---|
| 历史序列、法规发布时间、产品上市年份 | 保留，不算过期 |
| 公开官网已有 2026 页面或当前生效规则 | 可联网补证后更新页面常量和来源登记 |
| 私域、平台、API、付费库、内部系统数据 | 不能用大模型补，继续走 connector/readiness/manual evidence |

## 本轮检查方法

1. 扫描页面、来源登记和 periodic manifest 中 `2026-06-01` 之前的日期。
2. 对照 `source-registry.ts` 的 `verificationStatus`、`sourceType`、`gap` 和 `action`。
3. 对照 `source-tasks.json` 的 `collectionMethod`、`queueType` 和 `blockedReason`。
4. 使用 anysearch 和 Web 搜索对 P1 公开来源做样本补证。
5. 按“可公开补证更新 / 需授权连接器 / 需人工凭证 / 应保留历史”分类。

## 命中最高的旧日期文件

| 文件 | 命中数 | 诊断 |
|---|---:|---|
| `app/src/pages/AIGallery.tsx` | 145 | 主要是 AI 素材元数据和尺寸，不是业务数据过期 |
| `app/src/pages/IndustryPage.tsx` | 135 | 行业报告、法规年份、预测期混合，需逐条看来源 |
| `app/src/data/source-registry.ts` | 107 | 来源登记保留历史年份，需关注 `needs-review/example` |
| `app/src/pages/HomePage.tsx` | 73 | 市场趋势历史轴和报告元数据，不应整体替换 |
| `app/public/periodic-data/latest.json` | 68 | manifest 摘要含来源年份，不等于页面数据过期 |
| `app/src/pages/DataManage.tsx` | 47 | 数据资产表 freshness 仍大量停在 2026-05，需要来源级解释，不可直接改成 2026-06 |
| `app/src/pages/industry/IndustryNews.tsx` | 16 | 有多条待复核新闻，部分可通过官网更新 |
| `app/src/pages/industry/Exhibition.tsx` | 8 | 展会日程仍有 2025 和“样例日期待复核”，可优先更新 |
| `app/src/pages/industry/IPAnalysis.tsx` | 9 | 专利数据源登记为 2020-2024，2025 缺失，需结构化检索 |

## 可联网补证并优先更新

### 1. 展会页 `Exhibition.tsx`

当前问题：

- `ABC Kids Expo 2025` 仍是旧名称，日期为“样例日期待复核”。
- `Kind + Jugend 2025` 仍显示 `2025-09-04 ~ 09-06` 且状态“即将举办”。
- `CBME China 2025` 仍显示 `2025-07-16 ~ 07-18` 且状态“报名中”。
- `Pueri Expo 2025` 仍是旧名称，日期为“样例日期待复核”。
- `Tokyo Baby Show 2025` 仍是旧名称，日期为“样例日期待复核”。

联网补证结果：

| 页面条目 | 可替换为 | 来源 |
|---|---|---|
| ABC Kids Expo 2025 | ABC Kids Expo 2026，Mandalay Bay，2026-05-13 至 2026-05-15，按 2026-06-11 已结束 | [ABC Kids Expo 2026 exhibitor page](https://theabcshow.com/pages/exhibitors-2024)、[ABC exhibitor list](https://abckids2026.mapyourshow.com/8_0/explore/exhibitor-alphalist.cfm?nav=1) |
| Kind + Jugend 2025 | Kind + Jugend 2026，Cologne，2026-09-15 至 2026-09-17，报名中/待举办 | [Kind + Jugend official](https://www.kindundjugend.com/trade-fair/kind-jugend/) |
| CBME China 2025 | CBME China 2026，NECC Shanghai，2026-07-15 至 2026-07-17，报名中/待举办 | [CBME China official](https://www.cbmexpochina.com/about-cbme-china/) |
| Pueri Expo 2025 | Pueri Expo 2026，São Paulo，2026-04-26 至 2026-04-28，按 2026-06-11 已结束 | [Fit Pueri Expo official 2027 page](https://fitpueriexpo.com.br/en/home-en/)、[Pueri Expo 2026 listing](https://en.cns.travel/trade-show/pueri-expo-sao-paulo) |
| Tokyo Baby Show 2025 | Baby & Kids Expo Tokyo Summer 2026，Tokyo Big Sight，2026-06-24 至 2026-06-26，即将举办 | [Lifestyle Week Tokyo Summer official](https://www.lifestyle-expo.jp/summer/en-gb.html) |

限制：

- 只能更新展会名称、日期、地点和状态。
- `visitors`、`leads`、`orders`、`satisfaction`、`ROI` 属于经营复盘或预测，不应由联网搜索补。
- 当前 `roiData` 仍是经营展示口径，需要保留“待 CRM/展会复盘快照复核”提示，或在下一步改成“示例复盘”。

建议动作：

1. 第一批直接更新 `Exhibition.tsx` 的展会名称、日期、状态。
2. 将无凭证的 `leads/orders/satisfaction` 保留为 `null` 或明确标为样例。
3. 增加 `sourceUrl` 字段或后续拆到条目级来源登记。

### 2. 行业资讯页 `IndustryNews.tsx`

当前问题：

- 多条新闻日期为 `待复核 2026-05-23`。
- `Medela发布Sonata Pro智能吸奶器，集成AI泌乳分析功能` 未在官网检索到足够证据。
- `Willow Go 3.0发布，续航提升至8小时` 可能混淆了 Willow Go 与 Willow 3.0，不应直接保留为事实。
- `全球可穿戴吸奶器市场规模2025年预计达18.2亿美元` 本轮没有找到稳定来源支撑这个数值。

可更新条目：

| 当前条目 | 建议处理 | 来源 |
|---|---|---|
| Momcozy FDA 510(k) K253283 | 保留，但补官方 PDF 来源和 FDA 日期字段 | [FDA K253283 PDF](https://www.accessdata.fda.gov/cdrh_docs/pdf25/K253283.pdf) |
| CPSC 16 CFR Part 1242 哺乳枕安全标准 | 可改为“适用于 2025-04-23 后生产的产品”，来源明确 | [CPSC Nursing Pillows guidance](https://www.cpsc.gov/Business--Manufacturing/Business-Education/Business-Guidance/Nursing-Pillows) |
| Medela Sonata Pro AI | 不应继续作为事实；可替换为 Pump In Style Pro 2026 获奖/信任品牌新闻 | [Medela 2026 Pump In Style Pro news](https://www.medela.com/en/about-medela/medela-news/pump-in-style-pro-named-best-new-product-in-the-us-for-2026) |
| wearable breast pump 市场规模 | 不保留 `$18.2B`，改用具体报告口径，例如 Mordor wearable breast pumps 2025 为 USD 615.55m，或 Fortune BI 全吸奶器市场 2025 为 USD 2.14b | [Mordor wearable breast pumps](https://www.mordorintelligence.com/industry-reports/wearable-breast-pumps-market)、[Fortune BI breast pump market](https://www.fortunebusinessinsights.com/breast-pump-market-107054) |
| Willow Go 3.0 | 暂不自动更新；需官网产品页或新闻稿确认后再写 | [Willow official](https://onewillow.com/) |

建议动作：

1. 将 `newsItems` 扩展 `sourceUrl`、`verificationStatus`。
2. 先删除或降级无法验证的 Sonata Pro AI、Willow Go 3.0 和 $18.2B 数值。
3. 只把 FDA、CPSC、Medela 官方新闻和明确报告页写入页面。

### 3. 市场报告口径

可公开补证：

- Fortune Business Insights 报告显示 breast pump market 2025 为 USD 2.14B、2026 为 USD 2.31B、2034 为 USD 4.47B，并给出 CAGR 8.60%。来源：[Fortune BI breast pump market](https://www.fortunebusinessinsights.com/breast-pump-market-107054)。
- Mordor wearable breast pumps 报告显示 wearable breast pumps 2025 为 USD 615.55M、2030 为 USD 899.53M、CAGR 7.88%。来源：[Mordor wearable breast pumps](https://www.mordorintelligence.com/industry-reports/wearable-breast-pumps-market)。

限制：

- 这些报告口径不同，不能混成同一个 TAM/SAM/SOM 数字。
- 如果页面当前图表是内部加权测算，需要保留为“测算口径”，不能改成“报告原始值”。

建议动作：

1. 更新 `MarketPage`、`MarketTrend`、`IndustryPage` 中的来源提示，明确 report scope。
2. 不直接批量替换趋势图历史序列，除非同步重算图表口径和测试。

### 4. 法规与官方条目

可公开补证：

- FDA K253283 官方 PDF 可作为 Momcozy Wearable Breast Pump 510(k) 条目依据。
- CPSC Nursing Pillows 页面可支撑 `16 CFR Part 1242` 和 `2025-04-23 后生产产品适用`。
- EU MDR 过渡期、CPSC eFiling、SAC/GB 标准等应继续逐条官网复核，不能用二手新闻替代。

建议动作：

1. `IndustryNews.tsx` 和 `RegulationDetail.tsx` 增加条目级 `sourceUrl`。
2. `source-registry.ts` 中 `ds-034` 拆为条目级 registry 或增加新闻 manifest。

## 不应通过大模型补的数据

| 页面/来源 | 原因 | 当前正确状态 |
|---|---|---|
| `CompetitionPage` / `ProductManage` 的 Amazon 价格、评论、SKU | 需要 SP-API、Vendor Central、ASIN/SKU 映射和采集时间戳 | `connector-required` |
| `UsersPage` 的 CRM/RFM | 内部系统，涉及客户数据和脱敏边界 | `connector-required` |
| `OverseasSentiment` 的 TikTok/IG/FB 声量 | 需要平台 API 授权、查询词和采样窗口 | `connector-required` |
| `CustomsData` 的海关/Import Genius | 需要付费库/API 或数仓 | `connector-required` / `example` |
| `SupplyChain` 的 ERP、供应商、库存 | 内部系统和供应商授权数据 | `connector-required` / `example` |
| `FlavorMap`、`FlavorReport`、`CommentData`、`ReviewAnalysis` 的 VOC/NLP | 需要评论样本、模型版本、人工一致率 | `connector-required` / `example` |
| 消费者、渠道、门店访谈 | 需要访谈记录、样本说明和授权脱敏 | `manual-evidence` |

## 2025 年来源复核判断

### QuestMobile 2025 有孩家庭

[判断] 暂不替换。anysearch 找到 QuestMobile 2026 的相邻报告，例如“童心经济”“全景生态流量春季报告”，但没有找到同一口径的 2026 “有孩家庭人群消费洞察”直接替代源。当前 `ds-011` 应继续保留 `needs-review`，同时在页面中拆清中国有孩家庭画像与全球哺乳用户画像。

来源入口：[QuestMobile research reports](https://www.questmobile.com.cn/research/report/1927204984337829890/)

### Mamava / Medela 2025 State of Breastfeeding Survey

[判断] 暂不替换。公开页面显示 2025 survey 是已发布报告，2026 survey 本轮只看到征集线索，没有稳定发布页。当前 `ds-043` 应继续保留 `needs-review`，补样本量、调查时间、地域、题目口径和人工访问凭证。

来源：[Mamava 2025 State of Breastfeeding Survey](https://www.mamava.com/why-buy-blog/2025-state-of-breastfeeding-survey)

### WIPO/USPTO 专利数据

[判断] 不能用搜索结果直接更新。anysearch 能找到部分 USPTO、Google Patents 和诉讼相关线索，但没有形成可直接替换 `IPAnalysis` 表格的完整 2025/2026 专利清单。需要结构化检索申请人、专利族、地区和法律状态。

当前任务：`public-source-review:ds-017`，阻塞原因为 `2025数据缺失`。

## 下一步执行计划

### P0：立即可做，不需要私域授权

1. 更新 `Exhibition.tsx` 的 5 个展会名称、日期、地点和状态。
2. 将无来源的线索数、订单数、满意度和 ROI 改为示例或待复核。
3. 更新 `IndustryNews.tsx`：删除或降级无法验证的 Sonata Pro AI、Willow Go 3.0、$18.2B；补 FDA、CPSC、Medela、Mordor/Fortune BI 来源。
4. 对 `ds-018`、`ds-034` 补来源说明；必要时新增条目级 manifest。

### P1：公开来源可补，但需要口径重算

1. 用 Fortune BI / Mordor / Precedence 分别整理 breast pump、wearable breast pumps、regional share 的 report scope。
2. 不直接替换图表数据，先建立 `market-report-sources` 结构或静态 JSON。
3. 更新页面文案为“报告口径”而非统一市场真值。

### P1：继续排队，不能用大模型补

1. Amazon 私有映射和采集时间戳。
2. VOC NLP 样本、模型版本和人工一致率。
3. CRM/RFM readiness record。
4. ERP/供应链 readiness record。
5. 社媒 API 授权、查询词和采样窗口。
6. Import Genius 或海关数仓接入。

## 审计边界

- 本报告不把联网搜索摘要视为最终业务数据。
- 本报告不修改生产页面。
- 本报告不更改任何 `connector-required` 或 `manual-required` 状态。
- 后续页面更新必须逐条引用 source URL，并通过 `npm run data:audit`、`npm run test`、`npm run lint`、`npm run build` 验证。
