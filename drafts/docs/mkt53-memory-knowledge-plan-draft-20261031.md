---
title: mkt53 记忆系统与知识图谱构建方案
doc_type: plan
module: memory-governance
topic: mkt53-memory-knowledge
status: draft
created: 2026-10-31
updated: 2026-10-31
owner: self
source: human+ai
---

# mkt53 记忆系统与知识图谱构建方案

## 背景与目标

mkt53（Momcozy 市场洞察看板）是一个"产品设计 + 代码 + 工作流 + 知识库"混合型项目，当前处于从静态展示看板向可复核、可导入、可生成报告的内部洞察产品升级阶段。项目已有：

- **graphify 代码图谱**：5080 nodes / 8212 edges / 369 communities，基于 commit `cead7b78`（2026-08-09），已滞后于当前工作树（119 个未提交文件变更）
- **Nowledge Mem**：全局 5 个 Space（default/sage/voc-agent/paper2skills/mas-router-method），mkt53 无独立 Space，mkt53 相关记忆散落在 default Space（20+ 条）
- **文档体系**：`docs/`（product/workflows/knowledge/architecture/reviews/templates）+ `drafts/` + `graphify-out/` 三层
- **数据治理**：source-registry.ts 51 条来源、4 级证据分级（L0/L1/L2/L3/LO-S）、半月刷新 cron、P0-P2 真实数据接入路线图

**目标**：按 SOP 建立 mkt53 专属记忆系统与知识图谱，实现：
1. 项目记忆与全局记忆隔离，支持独立检索与权限控制
2. 知识图谱与代码图谱（graphify）互补，覆盖业务概念、数据契约、决策链路
3. 记忆写入与图谱更新纳入现有质量门禁，不破坏并行任务

## 现状评估

### 已有资产

| 资产 | 状态 | 缺口 |
|---|---|---|
| graphify 代码图谱 | 存在但滞后（2026-08-09 vs 当前 119 文件变更） | 需 `graphify update .` 刷新；缺少业务概念层 |
| Nowledge Mem default Space | 381 memories，含 mkt53 相关 20+ 条 | 无独立 Space，检索噪音大；无项目级 Rules |
| 文档体系 | 完整（product/workflows/knowledge/architecture/reviews） | 知识沉淀未结构化入 nmem Library |
| source-registry.ts | 51 条来源、4 级证据分级、3 种采集方式 | 未映射为知识图谱实体 |
| 半月刷新/质量门禁 | 已脚本化 | 未与记忆系统联动 |

### 参考经验（MAS 项目）

- MAS 项目已验证完整链路：Space → Identity → Rules → Working Memory → 种子记忆 → 本体 → 图谱 → 验收
- 关键教训：fast_bm25_vector 对纯中文问句召回不稳定（verbatim 6/8）；nmem-server 对 `.md` 文件 MIME 误判，需改 `.markdown` 后缀；本体 patch 根类型仅接受 `objectTypes/linkTypes/openWorld/policy/seedFromDefaults`

## 方案设计

### 1. Space 与 Identity

| 项 | 值 | 说明 |
|---|---|---|
| Space ID | `mkt53` | 独立空间，避免与 default/sage/voc 混淆 |
| Space Name | `mkt53 Market Insight` | 显示名 |
| Retrieval Mode | `strict` | 与 sage/voc-agent 一致 |
| Identity ID | `mkt53-assistant` | 项目专属 Agent 身份 |
| Identity Role | `mkt53_guardian` | 守门职责：记忆只存指针与判断，不存计数正文；一切结论须带仓内路径证据 |

### 2. 本体设计（Ontology）

参考 MAS 和 VOC 项目本体，结合 mkt53 业务域设计 8 个对象类型 + 6 个关系类型。

**对象类型（Object Types）**：

| Key | Display Name | Description | 源 |
|---|---|---|---|
| `MKT53_PRODUCT` | 产品模块 | 市场/竞争/用户/行业/AI助手/报告/数据管理 | `app/src/pages/` |
| `MKT53_DATA_SOURCE` | 数据来源 | source-registry 条目，含证据分级与采集方式 | `app/src/data/source-registry.ts` |
| `MKT53_CONTRACT` | 数据契约 | 字段口径、快照契约、脱敏边界 | `app/contracts/`、`app/src/data/` |
| `MKT53_WORKFLOW` | 工作流 | 半月刷新、质量门禁、发布流程 | `docs/workflows/` |
| `MKT53_DECISION` | 产品决策 | 路线图优先级、不做项、数据接入决策 | `docs/product/` |
| `MKT53_TICKET` | 治理票据 | DQ-xxx 数据质量票据、P0-xxx 优先级票据 | `docs/reviews/`、`app/scripts/data/` |
| `MKT53_RISK` | 风险项 | 不可信数据、示例数据、合规缺口 | `docs/product/product-roadmap-market-insight-stable.md` |
| `MKT53_RELEASE` | 发布版本 | 生产发布记录、半月快照版本 | `app/public/periodic-data/` |

**关系类型（Link Types）**：

| Key | Display Name | Inverse | 场景 |
|---|---|---|---|
| `MKT53_PRODUCT_USES_SOURCE` | 产品模块使用来源 | 被产品模块使用 | 页面 → source-registry |
| `MKT53_CONTRACT_GOVERNS_SOURCE` | 契约约束来源 | 被契约约束 | 数据契约 → source-registry |
| `MKT53_WORKFLOW_PRODUCES_RELEASE` | 工作流产出发布 | 被工作流产出 | 半月刷新 → periodic-data |
| `MKT53_DECISION_ADDRESSES_RISK` | 决策应对风险 | 被决策应对 | 路线图决策 → 不可信数据 |
| `MKT53_TICKET_BLOCKS_RELEASE` | 票据阻塞发布 | 被票据阻塞 | DQ 票据 → 发布 |
| `MKT53_TICKET_RESOLVES_RISK` | 票据解决风险 | 被票据解决 | DQ 票据 → 不可信数据 |

### 3. 种子记忆（Seed Memories）

按 8 个合法 `unit_type` 枚举，从现有文档提取 12 条种子记忆，覆盖项目核心上下文：

| # | unit_type | title | 来源路径 | 内容要点 |
|---|---|---|---|---|
| 1 | fact | mkt53 项目定位与线上地址 | `AGENTS.md` | Momcozy 母婴品牌全球市场分析看板，线上 https://mkt.lute-tlz-dddd.top |
| 2 | fact | 技术栈与部署架构 | `AGENTS.md` | React 19 + Vite 8 + Tailwind + FastAPI 后端（未部署生产），静态文件部署到 /opt/mkt53/html/ |
| 3 | decision | 产品定位升级：从展示到可复核洞察产品 | `docs/product/product-roadmap-market-insight-stable.md` | 下一阶段目标：可复核、可导入、可生成报告；原则=自动化、模块化、数仓管理专业化 |
| 4 | decision | 数据治理核心原则：证据优先 | `docs/knowledge/knowledge-data-source-governance-stable.md` | `connector-required`/`manual-required`/`example` 状态只能由授权快照或人工凭证升级 |
| 5 | context | 当前不可信数据清单（P0-P2） | `docs/product/product-roadmap-market-insight-stable.md` | CPSC/eFiling、EU MDR、海关、CRM、Amazon 竞品、ERP、VOC NLP 等 12 项 |
| 6 | procedure | 半月数据刷新流程 | `docs/workflows/workflow-semi-monthly-data-collection-stable.md` | `npm run data:refresh:semi-monthly` → `data:deploy:semi-monthly`，cron 每月 1/16 日 09:00 |
| 7 | procedure | 质量门禁与发布流程 | `docs/workflows/workflow-quality-gate-stable.md` | `npm run quality:release-evidence` → `deploy:prod:verified`（含 test+lint+audit+build+smoke+e2e） |
| 8 | learning | 数据接入优先级与 90 天路线图 | `docs/product/product-roadmap-market-insight-stable.md` | P0=法规复核/CRM/竞品采集；P1=海关/ERP/VOC NLP/报告生成；P2=AI 设计代理 |
| 9 | fact | 后端 BE-01~07 本地治理链状态 | `docs/architecture/adr-be-01-backend-deployment-shape-20260724.md` | FastAPI + PostgreSQL + Alembic，本地 fixture 验证，未接生产 |
| 10 | context | source-registry 证据分级统计 | `app/src/data/source-registry.ts` | 51 条：verified 28 / needs-review 15 / example 10；connector-required 28 / public-url-check 14 / manual-required 9 |
| 11 | plan | 记忆系统建设分阶段计划 | 本文档 | Wave 1: Space+Identity+Rules+种子记忆；Wave 2: 本体+图谱；Wave 3: 验收+维护 |
| 12 | event | graphify 代码图谱最近刷新 | `graphify-out/GRAPH_REPORT.md` | 2026-08-09 cluster-only，5080 nodes，基于 commit cead7b78，当前已滞后 |

### 4. Rules（Space 级规则）

| Rule ID | Title | Status | 内容 |
|---|---|---|---|
| `mkt53_evidence_boundary` | mkt53 证据边界与授权门禁 | active | 任何 `verified` 状态必须有授权快照或人工凭证；`connector-required` 不得伪装为已验证；公开证据样本不替代连接器 |
| `mkt53_pointer_layering` | 指针分层：事实留 repo，nmem 只存指针+判断 | active | 记忆内容只存路径指针与判断结论，不复制代码/文档正文；计数与列表必须现算 |

### 5. Working Memory

写入 mkt53 Space 的 Working Memory，作为会话启动时的上下文注入：

```markdown
# Working Memory -- mkt53

## Focus Areas
- **数据治理升级**：从静态看板到可复核洞察产品，P0=法规复核/CRM/竞品采集
- **半月刷新**：每月 1/16 日 09:00 cron，当前周期 2026-10-H2
- **质量门禁**：release evidence 8 项 + backend BE-07 恢复演练
- **记忆系统**：Space=mkt53，Identity=mkt53-assistant，Rules=2 条 active

## Briefing
mkt53 是 Momcozy 内部市场洞察看板，当前 119 个文件未提交变更，graphify 图谱滞后。核心风险：CPSC/EU MDR 法规条目待法务复核；Amazon/CRM/ERP/VOC 缺真实连接器；报告生成未绑定数据快照。
```

### 6. 知识图谱与 graphify 协同

| 层 | 工具 | 覆盖范围 | 更新方式 |
|---|---|---|---|
| 代码图谱 | graphify | 文件、函数、类、导入关系 | `graphify update .`（AST-only，无 API 成本） |
| 业务图谱 | nmem graph | 产品模块、数据来源、契约、工作流、决策、风险 | 本体 + 种子记忆 + 显式关系写入 |
| 文档图谱 | nmem library | 正式文档切片索引 | `nmem library add`（`.markdown` 后缀） |

协同规则：
- graphify 负责"代码怎么连"：文件依赖、函数调用、组件关系
- nmem graph 负责"业务为什么"：数据来源 → 产品模块 → 决策依据 → 风险阻塞
- nmem library 负责"文档说了什么"：正式文档全文检索与切片引用

## 执行计划

### Wave 1：Space / Identity / Rules / Working Memory / 种子记忆（MKG-01～05）

| Ticket | 内容 | 验收标准 | 依赖 |
|---|---|---|---|
| MKG-01 | 创建 mkt53 Space | `nmem spaces list` 可见 mkt53，strict 模式 | 无 |
| MKG-02 | 创建 mkt53-assistant Identity | `nmem agents list` 可见，defaultSpaceId=mkt53 | MKG-01 |
| MKG-03 | 写入 2 条 Space Rules | `nmem rules list --space mkt53` 可见 2 条 active | MKG-01 |
| MKG-04 | 写入 Working Memory | `nmem working-memory read --space mkt53` 返回内容 | MKG-01 |
| MKG-05 | 发布 12 条种子记忆 | 12/12 可检索，canary 先行，同 id 重放 Updated | MKG-01～04 |

### Wave 2：本体与图谱（MKG-06～10）

| Ticket | 内容 | 验收标准 | 依赖 |
|---|---|---|---|
| MKG-06 | 应用 mkt53 本体 | `nmem ontology show` 可见 8 objectTypes + 6 linkTypes，policy=strict，openWorld=false | MKG-05 |
| MKG-07 | 写入 10 条记忆关系 | `nmem graph expand <id>` 可见双向关系，link list 5/5 验证 | MKG-06 |
| MKG-08 | 图谱实体与 graphify 映射 | 产品模块节点与 graphify 文件节点建立路径映射 | MKG-06 |
| MKG-09 | Library 入库正式文档 | `docs/product/`,`docs/workflows/`,`docs/knowledge/` 共 8 篇入库为 `.markdown` | MKG-05 |
| MKG-10 | 图谱查询基线 | 8 正向 + 8 负向 + 3 图问题，verbatim ≥7/8 | MKG-07 |

### Wave 3：验收与维护（MKG-11～14）

| Ticket | 内容 | 验收标准 | 依赖 |
|---|---|---|---|
| MKG-11 | 检索验收 | 12 条种子全部可检索，来源指纹零漂移，幂等重放通过 | MKG-05 |
| MKG-12 | 图谱验收 | 正向/负向/图问题基线达标，跨项目污染 0 | MKG-10 |
| MKG-13 | 写入 ledger | `docs/knowledge/mkt53-memory-write-ledger.jsonl` 完整 | 全部 |
| MKG-14 | 维护模式固化 | 增量触发器写入方案，graphify update 纳入半月刷新 | MKG-13 |

## 风险与限制

| 风险 | 等级 | 缓解 |
|---|---|---|
| fast_bm25_vector 对纯中文问句召回不稳定 | 中 | 种子记忆内容补术语别名；验收以内容词变体命中为准 |
| nmem-server `.md` MIME 误判 | 低 | Library 统一用 `.markdown` 后缀 |
| 本体 patch 字段限制 | 低 | 仅使用 `objectTypes/linkTypes/openWorld/policy/seedFromDefaults` |
| graphify 图谱滞后 | 中 | Wave 2 前执行 `graphify update .` |
| 并行任务冲突 | 高 | 本轮只读调研+草稿文档；写入操作需逐项授权；不修改运行配置 |

## 不做项

1. 不写入 default Space 的 mkt53 相关记忆迁移（保留历史，新记忆入 mkt53 Space）
2. 不修改 graphify 已有图谱结构（只做 update，不做 cluster-only 重建）
3. 不接入生产数据库或 connector
4. 不修改现有半月刷新 cron 或质量门禁脚本
5. 不将示例数据（example）升级为 verified
