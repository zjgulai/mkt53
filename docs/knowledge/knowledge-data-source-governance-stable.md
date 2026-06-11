---
title: 数据来源治理规则
doc_type: knowledge
module: data-governance
topic: source-registry
status: stable
created: 2026-05-31
updated: 2026-06-11
owner: self
source: human+ai
---

# 数据来源治理规则

## 核心原则

所有会影响业务判断的页面数据必须能追溯到 `app/src/data/source-registry.ts` 或明确标注为示例数据。没有复核证据的数据不得包装成确定事实。

## Registry 字段

`SourceRegistryItem` 当前字段：

| 字段 | 用途 |
|---|---|
| `id` | 稳定唯一标识 |
| `module` | 业务模块 |
| `page` | 使用页面 |
| `metric` | 指标或结论对象 |
| `sourceName` | 来源名称 |
| `sourceUrl` | 来源入口 |
| `sourceType` | 来源类型 |
| `year` | 来源年份或采集窗口 |
| `reliability` | A、B、C、D 四级可信度 |
| `verificationStatus` | `verified`、`needs-review`、`example` |
| `lastVerified` | 最近复核日期 |
| `note` | 复核说明 |
| `gap` | 当前缺口 |
| `action` | 下一步动作 |

## 复核状态

| 状态 | 显示含义 | 使用限制 |
|---|---|---|
| `verified` | 已复核 | 可用于正式看板结论，但仍需保留来源和口径说明 |
| `needs-review` | 待复核 | 只能作为线索或待确认事项，不得写成已确认事实 |
| `example` | 示例数据 | 只能用于演示结构，不得用于业务结论 |

法规、平台采集、AI 模型输出和内部测算默认不得直接标为 `verified`。必须有明确来源、口径、时间窗口和负责人复核记录。

## 可信度等级

| 等级 | 来源类型 |
|---|---|
| A | 官方机构、内部系统、已采购且口径明确的行业报告 |
| B | 品牌官网、平台数据、公开数据库、定性研究 |
| C | 专家评估、内部测算、模型推断 |
| D | 示例数据、缺少采集记录或无法复核的数据 |

可信度不等于复核状态。A 级来源如果条目口径未确认，仍应保持 `needs-review`。

## 当前硬约束

1. CPSC/eFiling 相关条目保持 `needs-review`，直到法务确认 SKU 适用范围、证书字段和进口申报节奏。
2. EU MDR Class IIa 相关条目保持 `needs-review`，直到法务按产品分类、证书状态和 notified body 路径复核。
3. 海关、CRM、社媒、Amazon、AI 模型数据缺少真实接入记录时，不得从 `example` 或 `needs-review` 升级为 `verified`。
4. 页面文案不得把 `needs-review` 显示为“已验证原文”。
5. 新增来源必须补测试，至少覆盖 id 唯一性和关键风险状态。
6. 半月采集脚本只能记录公开 URL 元数据和样本哈希；受限平台、内部系统、AI/NLP 输出必须标记为 `connector-required` 或 `manual-required`。
7. 含静态数组数据的页面必须至少有一条 `sourceRegistry.page` 绑定；新增页面不得重新制造未绑定静态数据。
8. 不同地域、样本、机构或调查方法的组合来源必须拆分为独立 registry 条目；禁止用一个 `sourceName` 合并成无法复核的混合口径。

## 修改流程

1. 在 `app/src/data/source-registry.ts` 新增或更新条目。
2. 在使用页面通过 `getSourceRegistryItem` 或 `getSourceRegistryItemsByModule` 读取来源信息。
3. 更新或新增 `app/tests/data/source-registry.test.ts` 断言关键状态。
4. 执行：

```bash
cd app
npm run test
npm run lint
npm audit
npm run build
npm run data:audit
```

涉及页面展示时额外执行：

```bash
cd app
npm run test:e2e
```

## 数据展示规则

| 场景 | 展示方式 |
|---|---|
| 已复核行业报告 | 显示来源、年份、口径提示 |
| 待复核法规 | 显示待复核状态、来源入口、负责人动作 |
| 示例模型评分 | 明确标注为解释性模型或示例数据 |
| 平台采集数据 | 显示采集时间、渠道范围、授权或合规前提 |
| 内部系统数据 | 显示系统名、时间窗口、版本或快照 |

## 半月采集 manifest

`npm run data:refresh:semi-monthly` 会生成 `app/public/periodic-data/latest.json`。该文件用于 `/data` 页面展示半月采集状态。脚本会同步写入 `app/public/weekly-data/latest.json` 作为兼容路径。禁止回退到 `app/public/data/`，否则会与 React Router 的 `/data` 页面冲突，并在生产 nginx 下触发目录 403。

2026-06-11 生产 manifest 已验证：`period=2026-06-H1`，`refreshCadence=semi-monthly`，来源总数 45，`ok=10`，`connector-required=23`，`manual-required=12`，`issueCount=0`。这些计数只描述来源接入状态，不代表 45 条来源都已完成业务数值复核。

| 状态 | 处理规则 |
|---|---|
| `ok` | 公开来源可达，可作为来源可用性证据，不等于业务数值已复核 |
| `fetch-error` / `source-error` | 公开来源按当次 `collectionPolicy.publicUrl` 多次尝试后仍失败，下次重试或人工复核 |
| `connector-required` | 需要授权连接器，未接入前不得声称已采集 |
| `manual-required` | 需要采购报告、人工上传或补充 URL |

`sourceType=代码资产` 的来源走 `local-file-check`，用当前 app 副本里的文件存在性、文件大小和 SHA-256 哈希作为可用性证据。此类来源可以保留 GitHub URL 作为人工阅读入口，但半月采集不得依赖 GitHub blob 网络请求；本地文件缺失时才应进入 `source-error`。

`connector-required` 会进入 `app/public/periodic-data/connectors.json`，并同步进入 `app/public/weekly-data/connectors.json` 兼容路径。该文件只代表授权连接器接入队列，包含 `requiredAccess`、`outputContract`、`stopCondition` 和 `blockedReason`；它不是业务数据快照，不能作为真实采集成功证据。

公开 URL 采集默认不是单次请求判定。脚本会记录 `collectionPolicy.publicUrl`、每条公开来源的 `checkAttemptCount`、`attempts` 和 `statusStability`；只有重试后仍失败时，才进入 `fetch-error` 或可重试 HTTP 的 `source-error`。`403`、`404` 等明确权限或链接错误仍直接保留为 `source-error`，避免用重试掩盖真实来源问题。

Amazon P0 当前交付物是 `npm run data:connector:amazon:dry-run`。该脚本输出授权前置条件、ASIN/SKU 映射缺口、七个 Amazon source id 覆盖情况和四类快照字段契约；`networkCalls=0`、`businessDataWrites=0`，不调用 Amazon，不提升任何来源复核状态。

ASIN/SKU 映射必须通过 `npm run data:connector:amazon:mapping:validate -- --mapping <mapping-json-path>` 校验。只有字段完整、ASIN 格式有效、source id 属于 Amazon backlog、站点和 marketplace 匹配、`mappingStatus=ready` 且无重复 `sourceId + site + marketplaceId + asin` 的行，才计入映射覆盖率。

映射模板位于 `app/scripts/data/connectors/templates/amazon-commerce-mapping-template.json`，可以提交和同步。填入真实 ASIN/SKU 后的映射文件属于私有数据输入，只能放在 `app/configs/private/amazon-commerce-mapping.json` 或服务器 `/opt/mkt53/private/amazon-commerce-mapping.json`，并通过 `MKT53_AMAZON_MAPPING_PATH` 读取；不得进入 `public`、`src`、测试夹具或 git 历史。

Amazon 映射覆盖率必须用 `npm run data:connector:amazon:mapping:coverage -- --mapping <mapping-json-path>` 生成验收报告。报告输出逐 source id 的最低映射数、当前有效映射数、缺口数和 ready 状态；只有覆盖率 ready、无无效行、无重复行时，才能进入真实连接器实现。该报告不构成业务数据采集证据。

服务器侧覆盖率留痕必须用 `npm run data:connector:amazon:mapping:archive` 写入 `/opt/mkt53/private/reports`。该目录只允许私有审计材料，权限保持 `700`；`amazon-commerce-mapping-coverage-latest.md` 和 `amazon-commerce-mapping-coverage-manifest.json` 权限保持 `600`。归档 manifest 可用于比较每次映射覆盖率变化，但不得被展示到前端、不得提交到 git，也不得作为 Amazon 平台数据已采集的证据。

Amazon 真实连接器实现前必须通过 `npm run data:connector:amazon:readiness`。该 gate 读取私有映射和私有 readiness record，只检查环境凭据存在性、映射覆盖率、授权记录、采集窗口、owner 复核、合规复核、快照范围和私有边界；脚本仍保持 `networkCalls=0`、`businessDataWrites=0`。状态不是 `ready-for-authorized-connector-implementation` 时，不得实现或调度真实 Amazon 采集。即使 gate 通过，也只表示可以开始授权连接器实现，不表示已有真实业务数据快照。

私有输入占位只能通过 `npm run data:connector:amazon:private:bootstrap -- --target-dir <private-dir>` 创建。该命令只复制空模板并设置 `700/600` 权限，默认不覆盖已有私有文件；如果服务器已经存在真实映射或 readiness record，不得使用 `--force`。占位文件仍属于私有材料，不能提交到 git、不能进入前端静态目录，也不能被用作业务数据证据。

人工填报清单通过 `npm run data:connector:amazon:readiness:checklist` 生成。清单只来自公开模板，列出七个 Amazon source id 的最低映射数、mapping 必填字段、readiness 必填字段、owner/合规复核和安全边界。服务器私有清单路径是 `/opt/mkt53/private/amazon-commerce-readiness-checklist.md`；该文件权限保持 `600`，不得进入 `/opt/mkt53/html`、git 或前端构建产物。

私有输入交叉审计通过 `npm run data:connector:amazon:private:audit -- --private-dir <private-dir>` 执行。该审计只输出映射覆盖率、无效行计数、缺失 readiness 字段、清单缺项、source id 和字段名；不得输出真实 ASIN、SKU、授权记录、owner、竞品明细或凭据值。服务器审计报告路径是 `/opt/mkt53/private/amazon-commerce-private-input-audit.json`，权限保持 `600`。报告状态不是 `ready-for-readiness-gate` 时，不得运行真实 Amazon readiness gate，更不得实现或调度真实平台采集。

服务器半月刷新会在公开静态包发布前尝试更新私有输入交叉审计报告。该 sidecar 只写 `/opt/mkt53/private`，不得写入 `/opt/mkt53/html`；默认不因私有输入缺项或审计脚本异常阻塞公开 manifest 刷新。只有显式设置 `MKT53_PRIVATE_AUDIT_REQUIRED=1` 时，半月任务才把私有审计失败升级为 hard gate。
