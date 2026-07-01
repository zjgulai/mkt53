---
title: mkt53 Loop3 Connector Readiness To L3 报告
doc_type: analysis
module: project
topic: loop3-connector-readiness
status: draft
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
production_read_only: true
provider_calls: false
restricted_connector_access: false
production_writes: false
production_deploy: false
business_data_writes: false
fact_promotion: false
---

# mkt53 Loop3 Connector Readiness To L3 报告

## 1. 边界

本轮目标是检查四条高价值连接器能否进入 L3 只读证据状态。执行方式为 readiness/dry-run gate。

- `providerCalls=false`
- `restrictedConnectorAccess=false`
- `productionWrites=false`
- `productionDeploy=false`
- `businessDataWrites=false`
- `factPromotion=false`

本轮执行了 HTTPS 生产只读复查和本地 readiness gate。未读取私有连接器输入，未执行平台 API，未生成真实业务快照。

## 2. Loop2 前置复查

本轮开始时间已过 `2026-07-01 09:10 +08:00`，因此先复查生产 manifest。

| 项 | 结果 |
|---|---|
| 复查时间 | `2026-07-01 09:25:55 CST` |
| URL | `https://mkt.lute-tlz-dddd.top/periodic-data/latest.json` |
| HTTP | `200` |
| `period` | `2026-06-H1` |
| `generatedAt` | `2026-06-14T05:06:31.080Z` |
| `nextScheduledAt` | `2026-06-16T09:00:00+08:00` |
| `expectedCurrentPeriod` | `2026-07-H1` |
| `productionFresh` | `false` |

结论：生产 manifest 在 09:10 后仍停留在 `2026-06-H1`，Loop2 的 stale 判断保持成立。该问题需要独立刷新/发布授权处理。

## 3. Readiness Gate 总览

| 连接器 | 业务价值 | Gate 状态 | 安全计数 | 当前结论 |
|---|---|---|---|---|
| Amazon / Vendor Central | 竞品价格、评论、BSR、ASIN/SKU、广告 ROI 输入 | `blocked` | `networkCalls=0`、`businessDataWrites=0` | 缺少授权环境、ASIN/SKU 映射、readiness record、owner review、compliance review |
| VOC NLP / 评论样本 | 产品迭代、差评归因、本地化营销、素材洞察 | `blocked` | `networkCalls=0`、`modelCalls=0`、`businessDataWrites=0` | 缺少样本 manifest、模型版本、样本量、人工一致率、隐私合规复核 |
| CRM / RFM | 复购、LTV、区域用户价值、本地化营销 | `blocked` | `networkCalls=0`、`databaseReads=0`、`businessDataWrites=0` | 缺少脱敏快照、RFM 口径、分群覆盖、owner review、compliance review |
| ERP / 库存履约 | 海外仓/FBA/FBT 补货、断货/滞销、渠道目标 | `blocked` | `networkCalls=0`、`databaseReads=0`、`businessDataWrites=0` | 缺少 ERP 库存/供应商快照、版本化口径、商业边界、owner review、compliance review |

## 4. Amazon Readiness

命令：

```bash
node scripts/data/connectors/amazon-commerce-dry-run.mjs --readiness-gate --json --no-write
```

核心阻塞：

| 阻塞项 | 证据 |
|---|---|
| 授权环境缺失 | 4 个必需环境项均未配置 |
| ASIN/SKU 映射缺失 | `totalRequiredItems=67`、`totalMappedItems=0`、`missingItemCount=67` |
| source 覆盖缺失 | 7 个 Amazon source 均为 `missing-mapping` |
| readiness record 缺失 | `readinessPathSource=none` |
| 采集窗口缺失 | configured window 为空 |
| owner/compliance review 缺失 | review owner 与 compliance reviewer 均为空 |
| snapshot scope 缺失 | `product_snapshot`、`review_snapshot`、`brand_share_snapshot`、`category_rank_snapshot` 均未授权 |

Amazon readiness 覆盖的是完整 Amazon backlog，包含 `ds-037`；Loop1 P0 owner-intake 子集只覆盖其中 6 个 Amazon P0 source gaps。后续需要明确 P0 子集和全 backlog 的推进节奏。

## 5. VOC NLP Readiness

命令：

```bash
node scripts/data/connectors/voc-nlp-dry-run.mjs --readiness-gate --json --no-write
```

核心阻塞：

| 阻塞项 | 证据 |
|---|---|
| readiness/sample manifest 缺失 | `readinessPathSource=none`、`sampleManifestPathSource=none` |
| source coverage 缺失 | 缺少 `ds-021`、`ds-030`、`ds-032`、`ds-033` |
| 样本量缺失 | `minimumTotalReviewSampleCount=1000`、`minimumLabeledSampleCount=100`，当前均为 0 |
| 模型追踪缺失 | model、version、dictionary、product mapping 均为空 |
| 人工复核缺失 | `minimumHumanAgreementValue=0.75`，当前为 0 |
| 隐私合规缺失 | PII handling 与 compliance review 均为空 |
| snapshot scope 缺失 | 4 类 VOC/NLP 输出快照均未授权 |

注意：Loop1 P0 owner-intake 包含 `ds-023`，而 VOC readiness gate 当前覆盖 `ds-030` 和 `ds-033`。这说明 P0 owner-intake 和 connector dry-run backlog 需要做 source scope 对齐，避免后续 owner 回答覆盖错对象。

## 6. CRM / RFM Readiness

命令：

```bash
node scripts/data/connectors/internal-crm-dry-run.mjs --readiness-gate --json --no-write
```

核心阻塞：

| 阻塞项 | 证据 |
|---|---|
| readiness/snapshot manifest 缺失 | 两个私有输入路径均为 `none` |
| source coverage 缺失 | 缺少 `ds-012` |
| 脱敏样本量缺失 | `minimumAnonymizedCustomerRows=1000`，当前为 0 |
| RFM 分群缺失 | 需要 7 类 segment，当前无覆盖 |
| RFM 口径缺失 | snapshotId、model version、scoring rule、时间窗和币种均为空 |
| 隐私边界缺失 | anonymization、PII handling、allowed export fields 均未满足 |
| owner/compliance review 缺失 | 业务 owner 与合规 reviewer 均为空 |

CRM readiness 仍停留在授权前门禁，无法进入 L3 只读证据。

## 7. ERP / 库存履约 Readiness

命令：

```bash
node scripts/data/connectors/internal-erp-dry-run.mjs --readiness-gate --json --no-write
```

核心阻塞：

| 阻塞项 | 证据 |
|---|---|
| readiness/snapshot manifest 缺失 | 两个私有输入路径均为 `none` |
| source coverage 缺失 | 缺少 `ds-035` |
| 库存/供应商覆盖缺失 | `minimumSkuCount=50`、`minimumSupplierCount=5`、`minimumWarehouseCount=2`、`minimumInventoryRecordCount=50`，当前均为 0 |
| 口径版本缺失 | ERP snapshot、inventory policy、supplier mapping、cost model 均为空 |
| 商业边界缺失 | cost disclosure、safe fields、商业数据处理状态均未满足 |
| owner/compliance review 缺失 | 业务 owner 与合规 reviewer 均为空 |
| snapshot scope 缺失 | `inventory_snapshot`、`supplier_master_snapshot`、`supply_cost_snapshot` 均未授权 |

ERP readiness 仍停留在授权前门禁，无法进入 L3 只读证据。

## 8. Source Scope 待对齐项

| 主题 | 发现 | 风险 | 建议 |
|---|---|---|---|
| Amazon P0 vs 全 backlog | Loop1 P0 owner-intake 覆盖 6 个 Amazon P0 source gaps；Amazon readiness gate 覆盖 7 个 Amazon source ids，包括 `ds-037` | owner 回答可能只覆盖 P0，connector gate 仍因全 backlog 未满足而 blocked | 将 Amazon 分为 `P0-release-scope` 与 `full-backlog-scope` 两张 readiness matrix |
| VOC P0 vs readiness source ids | Loop1 P0 包含 `ds-023`，readiness gate 当前期望 `ds-030`、`ds-033` | 评论样本与 WebReview/VOC 报告 source id 可能错配 | 对 `review-nlp` backlog 与 P0 owner packet 做 source id mapping review |
| CRM/ERP 独立 lane | CRM 只有 `ds-012`，ERP readiness 当前只看 `ds-035` | 其它已 L3 的 ERP internal proxy 和 CRM/RFM 待接入边界容易混同 | 把“已批准内部代理展示”和“自动化连接器 readiness”分开记录 |

## 9. 下一步

Loop3 结论是：四条连接器都具备 readiness gate 机制，但都停留在授权前 blocked 状态。下一步不是写业务代码，而是补齐私有 readiness/snapshot manifest 和 owner/compliance review。

建议拆成三个本地动作：

1. 生成四类私有输入模板，只放入 `configs/private/` 或 `/opt/mkt53/private/`，并保持 gitignore。
2. 建立 `P0-release-scope` 与 `full-backlog-scope` 的 source id 对照表。
3. 在业务 owner 提交只读快照、字段字典、hash 和 review 记录后，重跑 readiness gate。

生产 manifest stale 仍由 Loop2 refresh lane 单独处理，避免连接器 readiness 与半月发布混在同一结论里。
