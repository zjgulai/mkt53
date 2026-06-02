---
title: 周度数据采集刷新工作流
doc_type: workflow
module: data-collection
topic: weekly-refresh
status: stable
created: 2026-06-02
updated: 2026-06-02
owner: self
source: human+ai
---

# 周度数据采集刷新工作流

## 当前结论

2026-06-02 审计基线：

| 项 | 结果 |
|---|---:|
| 页面组件 | 43 |
| 数据管理表 | 27 |
| source registry 来源 | 45 |
| 治理配置表 | 27 |
| critical issue | 0 |
| 静态数据但未绑定 registry 的页面 | 0 |

当前没有后端数据库或常驻任务。周度刷新采用“脚本采集 → 生成静态 manifest → 构建部署”的方式，不把受限来源伪装成已采集数据。

## 脚本入口

```bash
cd app
npm run data:audit
npm run data:refresh:weekly
npm run data:connector:amazon:dry-run
npm run data:connector:amazon:mapping:archive
```

输出文件：

| 文件 | 用途 |
|---|---|
| `public/weekly-data/latest.json` | 前端可读取的最新周度采集 manifest |
| `public/weekly-data/connectors.json` | 授权连接器接入 backlog，按连接器类型分组 |
| `tmp/data-collection/audit-latest.json` | 本次一致性审计结果 |
| `tmp/data-collection/runs/<week>.json` | 本地周度运行留痕 |
| `tmp/data-collection/runs/<week>-connectors.json` | 本地连接器 backlog 留痕 |
| `tmp/data-collection/connectors/amazon-commerce-dry-run.json` | Amazon 授权连接器 dry-run 前置检查和输出契约 |
| `tmp/data-collection/connectors/amazon-commerce-mapping-coverage.md` | Amazon ASIN/SKU 映射覆盖率验收报告 |
| `tmp/data-collection/connectors/reports/` | 本地 Amazon 映射覆盖率归档目录，默认保留最近 12 份 |

## 采集状态

| 状态 | 含义 |
|---|---|
| `ok` | 公开来源 URL 可达，已记录 HTTP 状态、content-type、etag/last-modified 和样本哈希 |
| `fetch-error` | 公开来源请求失败，下次重试或人工复核 |
| `source-error` | 公开来源返回非 2xx |
| `connector-required` | 需要授权 API、内部系统或合规爬虫连接器 |
| `manual-required` | 需要采购报告、人工上传或补充来源 URL |

## 周度部署

开发机人工触发远程部署：

```bash
cd app
npm run data:deploy:weekly
```

该命令依次执行：

1. `npm run data:refresh:weekly`
2. `npm run deploy:prod`
3. `npm run smoke:prod`
4. `npm run test:e2e:prod`

服务器本地触发静态刷新：

```bash
cd /opt/mkt53/automation/app
npm run data:publish:weekly:local
```

该命令只写入 `MKT53_STATIC_HTML_DIR`，默认是 `/opt/mkt53/html`，不需要 SSH key，不触碰宿主 landing 或其他应用。

## 服务器 cron

只在 mkt53 专属自动化目录安装：

```bash
cd /opt/mkt53/automation/app
bash scripts/data/install-weekly-cron.sh --print
bash scripts/data/install-weekly-cron.sh
```

默认计划：每周一 03:15 执行 `npm run data:publish:weekly:local`。如需调整：

```bash
MKT53_WEEKLY_CRON="30 2 * * 1" bash scripts/data/install-weekly-cron.sh
```

## 当前连接器实现队列

静态页面已全部绑定 `source-registry.ts`。`npm run data:refresh:weekly` 会根据 `connector-required` 来源生成 `connectorBacklog` 和 `connectors.json`。下一阶段不再是补 source id，而是补真实连接器、采集窗口和复核证据：

| 连接器类型 | 主要来源 | 优先级 |
|---|---|---|
| Amazon Marketplace / Brand Analytics | Amazon、Brand Analytics、BSR、品类采集 | P0 |
| Review / VOC NLP Pipeline | 评论分析、VOC功能趋势、NLP模型 | P0 |
| TikTok / Instagram / Facebook Social Listening | 海外社交声量 | P0 |
| Momcozy CRM | RFM 分层 | P0 |
| YouTube Data API | YouTube 测评追踪 | P1 |
| Import Genius / Customs Trade Data | 海关与进出口数据 | P1 |
| Momcozy ERP / Supply Chain | 供应链、库存、供应商 | P1 |
| AI Generation Audit Log | AI图库、设计助手生成日志 | P2 |
| Compliant Web Review Crawler | 网页评论采集 | P2 |
| Internal Knowledge / Reporting Assets | 知识库、报告元数据、内部定性资料 | P2 |

### Amazon P0 dry-run

Amazon P0 当前只建立授权前置检查和输出契约，不调用 Amazon，不生成真实业务快照。

```bash
cd app
npm run data:connector:amazon:dry-run
npm run data:connector:amazon:dry-run -- --json --no-write
npm run data:connector:amazon:mapping:validate -- --mapping <mapping-json-path>
npm run data:connector:amazon:mapping:template
npm run data:connector:amazon:mapping:coverage -- --mapping <mapping-json-path>
npm run data:connector:amazon:mapping:archive -- --mapping <mapping-json-path>
```

| 检查项 | 当前规则 |
|---|---|
| 授权 | 只检查 `AMAZON_SP_API_CLIENT_ID`、`AMAZON_SP_API_CLIENT_SECRET`、`AMAZON_SP_API_REFRESH_TOKEN`、`AMAZON_MARKETPLACE_IDS` 是否存在，不输出凭据值 |
| ASIN/SKU 映射 | 覆盖 `ds-007`、`ds-009`、`ds-010`、`ds-019`、`ds-037`、`ds-038`、`ds-039` 七个 Amazon 来源；按 `sourceId + site + marketplaceId + asin` 去重 |
| 输出契约 | `product_snapshot`、`review_snapshot`、`brand_share_snapshot`、`category_rank_snapshot` |
| 安全边界 | `networkCalls=0`、`businessDataWrites=0`、`dryRunOnly=true` |
| 覆盖报告 | 输出总需映射数、已映射数、缺口数、ready source 数和逐 source 阈值表 |
| 归档报告 | 写入 `amazon-commerce-mapping-coverage-*.md`、`amazon-commerce-mapping-coverage-latest.md` 和 `amazon-commerce-mapping-coverage-manifest.json`，默认保留最近 12 份 |

映射模板是正式资产：`app/scripts/data/connectors/templates/amazon-commerce-mapping-template.json`。该文件只包含空字段和字段规则，不包含真实 ASIN、SKU、竞品或负责人信息。

真实映射文件必须放在私有路径：

| 环境 | 路径 |
|---|---|
| 本地开发 | `app/configs/private/amazon-commerce-mapping.json` |
| 服务器 | `/opt/mkt53/private/amazon-commerce-mapping.json` |

通过环境变量读取私有映射：

```bash
cd app
MKT53_AMAZON_MAPPING_PATH=configs/private/amazon-commerce-mapping.json npm run data:connector:amazon:mapping:validate
```

服务器自动化目录使用：

```bash
cd /opt/mkt53/automation/app
MKT53_AMAZON_MAPPING_PATH=/opt/mkt53/private/amazon-commerce-mapping.json npm run data:connector:amazon:mapping:validate
MKT53_AMAZON_MAPPING_PATH=/opt/mkt53/private/amazon-commerce-mapping.json npm run data:connector:amazon:mapping:coverage
MKT53_AMAZON_MAPPING_PATH=/opt/mkt53/private/amazon-commerce-mapping.json MKT53_AMAZON_COVERAGE_REPORT_DIR=/opt/mkt53/private/reports npm run data:connector:amazon:mapping:archive
```

禁止把真实映射放入 `app/public/`、`app/src/`、`app/tests/fixtures/` 或提交到 git。`app/configs/private/` 已被 `.gitignore` 排除。

覆盖率报告达到 `ready` 的条件：七个 Amazon source id 全部达到最低映射数量，且不存在无效映射行或重复 `sourceId + site + marketplaceId + asin`。该报告只证明映射输入满足采集前置条件，不代表 Amazon 平台数据已采集。

服务器归档目录固定为 `/opt/mkt53/private/reports`。目录权限必须保持 `700`，报告和 manifest 文件权限必须保持 `600`。可通过 `MKT53_AMAZON_COVERAGE_REPORT_RETENTION` 或 `--retention <n>` 调整留存数量；归档 manifest 只记录覆盖率、缺口、安全边界和文件路径，不写入真实 ASIN、SKU、竞品名称或授权凭据。该归档是接入前后的审计对比材料，不是 Amazon 平台采集证据。

映射文件接受数组或 `{ "mappings": [] }` 两种形态。每行必须包含：

| 字段 | 规则 |
|---|---|
| `sourceId` | 必须属于七个 Amazon source id |
| `site` | 必须匹配本次 dry-run 站点，默认 `amazon.com` |
| `marketplaceId` | 必须匹配本次 dry-run marketplace，默认 `ATVPDKIKX0DER` |
| `asin` | 10 位大写字母或数字 |
| `sku`、`brand`、`productName`、`category` | 不允许为空 |
| `mappingStatus` | 当前只接受 `ready`，待复核行不得计入覆盖率 |
| `mappingUpdatedAt` | `YYYY-MM-DD` |
| `mappingOwner` | 映射负责人或来源责任方 |

即使本地或服务器存在 Amazon 环境变量，dry-run 脚本也只做前置校验，不发起平台请求。只有授权、ASIN/SKU 映射、采集窗口和合规边界全部满足后，才能进入真实连接器实现。

| 页面 | 下一步 |
|---|---|
| `ReviewAnalysis`、`YoutubeReview`、`FlavorMap`、`FlavorReport` | 接入评论、YouTube 和 VOC NLP 采集任务 |
| `SupplyChain`、`ChannelInterviews`、`StoreInterviews` | 接入 ERP、销售快照、访谈样本和脱敏记录 |
| `BabyCare`、`CategoryAnalysis`、`NursingProducts` | 接入行业报告、Amazon 类目采集和测算公式 |
| `IndustryNews`、`TechNews` | 拆成条目级 URL、发布日期和复核状态 |
| `AIAssistantPage`、`AIGallery`、`DesignAssistant` | 接入 AI 代理请求日志、模型版本、成本和审核状态 |

## 边界

Amazon、CRM、ERP、社交媒体 API、Import Genius、AI/NLP 模型输出必须通过授权连接器接入。当前脚本只记录缺口状态，不绕过平台权限、robots.txt 或内部系统访问控制。
