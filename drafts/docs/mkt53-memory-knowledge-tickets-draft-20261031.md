---
title: mkt53 记忆系统与知识图谱构建 Tickets
doc_type: plan
module: memory-governance
topic: mkt53-memory-knowledge-tickets
status: draft
created: 2026-10-31
updated: 2026-10-31
owner: self
source: human+ai
---

# mkt53 记忆系统与知识图谱构建 Tickets

## 总览

| Wave | Tickets | 目标 | 预计耗时 |
|---|---|---|---|
| Wave 1 | MKG-01～05 | Space / Identity / Rules / WM / 种子记忆 | 30 min |
| Wave 2 | MKG-06～10 | 本体 / 图谱关系 / Library / 查询基线 | 45 min |
| Wave 3 | MKG-11～14 | 验收 / Ledger / 维护模式 | 30 min |

**前置条件**：
- [ ] 用户授权创建 mkt53 Space 与 Identity
- [ ] 用户授权写入 mkt53 Space Rules 与 Working Memory
- [ ] 用户授权发布 12 条种子记忆
- [ ] 用户授权应用 mkt53 本体（8 objectTypes + 6 linkTypes）
- [ ] 用户授权写入 10 条记忆关系
- [ ] 用户授权 Library 入库 8 篇正式文档
- [ ] `graphify update .` 刷新代码图谱（无 API 成本，AST-only）

**并行安全**：本方案所有写入操作均针对 nmem server 与 graphify-out/，不触碰 app/src、backend/src、docs/ 业务代码，不影响并行开发任务。

---

## Wave 1：Space / Identity / Rules / Working Memory / 种子记忆

### MKG-01 创建 mkt53 Space

**命令**：
```bash
nmem spaces create mkt53 --name "mkt53 Market Insight" --kind personal --retrieval strict
```

**验收**：
```bash
nmem --json spaces list | python3 -c "import sys,json; d=json.load(sys.stdin); s=[x for x in d['spaces'] if x['id']=='mkt53']; assert s and s[0]['defaultRetrievalMode']=='strict', 'Space mkt53 not found or not strict'; print('MKG-01 PASS')"
```

**回滚**：`nmem spaces delete mkt53`（无数据时安全）

---

### MKG-02 创建 mkt53-assistant Identity

**命令**：
```bash
nmem agents create mkt53-assistant --display-name "mkt53 Assistant" --role mkt53_guardian --default-space mkt53 --description "mkt53 项目守门人：记忆只存指针与判断，不存计数正文；一切结论须带仓内路径证据。"
```

**验收**：
```bash
nmem --json agents list | python3 -c "import sys,json; d=json.load(sys.stdin); a=[x for x in d['agentProfiles'] if x['id']=='mkt53-assistant']; assert a and a[0]['defaultSpaceId']=='mkt53', 'Agent not found or wrong space'; print('MKG-02 PASS')"
```

---

### MKG-03 写入 2 条 Space Rules

**Rule 1：mkt53_evidence_boundary**
```bash
nmem rules upsert mkt53_evidence_boundary \
  --space mkt53 \
  --title "mkt53 证据边界与授权门禁" \
  --status active \
  --content "任何 verified 状态必须有授权快照或人工凭证；connector-required 不得伪装为已验证；公开证据样本不替代连接器；example 数据只能用于演示结构，不得用于业务结论。"
```

**Rule 2：mkt53_pointer_layering**
```bash
nmem rules upsert mkt53_pointer_layering \
  --space mkt53 \
  --title "指针分层：事实留 repo，nmem 只存指针+判断" \
  --status active \
  --content "记忆内容只存路径指针与判断结论，不复制代码/文档正文；计数与列表必须现算；跨项目引用须显式标注来源 Space。"
```

**验收**：
```bash
nmem --json rules list --space mkt53 | python3 -c "import sys,json; d=json.load(sys.stdin); rs=[r for r in d.get('rules',[]) if r['spaceId']=='mkt53' and r['status']=='active']; assert len(rs)==2, f'Expected 2 active rules, got {len(rs)}'; print('MKG-03 PASS')"
```

---

### MKG-04 写入 Working Memory

**命令**：
```bash
nmem working-memory write --space mkt53 --content "# Working Memory -- mkt53

## Focus Areas
- **数据治理升级**：从静态看板到可复核洞察产品，P0=法规复核/CRM/竞品采集
- **半月刷新**：每月 1/16 日 09:00 cron，当前周期 2026-10-H2
- **质量门禁**：release evidence 8 项 + backend BE-07 恢复演练
- **记忆系统**：Space=mkt53，Identity=mkt53-assistant，Rules=2 条 active

## Briefing
mkt53 是 Momcozy 内部市场洞察看板，当前 graphify 图谱滞后（2026-08-09）。核心风险：CPSC/EU MDR 法规条目待法务复核；Amazon/CRM/ERP/VOC 缺真实连接器；报告生成未绑定数据快照。"
```

**验收**：
```bash
nmem --json working-memory read --space mkt53 | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('exists')==True and 'mkt53' in d.get('content',''), 'WM not found or wrong content'; print('MKG-04 PASS')"
```

---

### MKG-05 发布 12 条种子记忆

**执行方式**：canary 先行（1 条验证通过后批量发布），同 id 重放返回 Updated。

**种子清单**（确定性 ID，便于幂等重放）：

| ID | unit_type | title | labels |
|---|---|---|---|
| mkt53-fact-001 | fact | mkt53 项目定位与线上地址 | mkt53, project, fact |
| mkt53-fact-002 | fact | 技术栈与部署架构 | mkt53, tech-stack, deployment |
| mkt53-decision-001 | decision | 产品定位升级：从展示到可复核洞察产品 | mkt53, product, roadmap |
| mkt53-decision-002 | decision | 数据治理核心原则：证据优先 | mkt53, data-governance, evidence |
| mkt53-context-001 | context | 当前不可信数据清单（P0-P2） | mkt53, data-quality, risk |
| mkt53-procedure-001 | procedure | 半月数据刷新流程 | mkt53, workflow, semi-monthly |
| mkt53-procedure-002 | procedure | 质量门禁与发布流程 | mkt53, workflow, quality-gate |
| mkt53-learning-001 | learning | 数据接入优先级与 90 天路线图 | mkt53, roadmap, priority |
| mkt53-fact-003 | fact | 后端 BE-01~07 本地治理链状态 | mkt53, backend, be07 |
| mkt53-context-002 | context | source-registry 证据分级统计 | mkt53, source-registry, evidence-grade |
| mkt53-plan-001 | plan | 记忆系统建设分阶段计划 | mkt53, memory, plan |
| mkt53-event-001 | event | graphify 代码图谱最近刷新 | mkt53, graphify, event |

**单条发布命令模板**：
```bash
nmem memories add \
  --id mkt53-fact-001 \
  --title "mkt53 项目定位与线上地址" \
  --content "mkt53 是 Momcozy 母婴品牌全球市场分析看板，面向内部团队的数据洞察平台。线上地址：https://mkt.lute-tlz-dddd.top。宿主入口：https://lute-tlz-dddd.top 首页卡片「市场洞察工作台」。GitHub：https://github.com/zjgulai/mkt53。服务器：101.34.52.232 (VM-0-16-ubuntu)，部署路径 /opt/mkt53/html/。来源：AGENTS.md" \
  --unit-type fact \
  --importance 0.9 \
  --labels mkt53,project,fact \
  --space mkt53
```

**批量发布脚本**（生成后逐条执行，或写入临时 shell 文件批量执行）：
```bash
#!/bin/bash
# mkg-05-seed-memories.sh
set -euo pipefail

echo "=== Canary: mkt53-fact-001 ==="
nmem memories add --id mkt53-fact-001 --title "..." --content "..." --unit-type fact --importance 0.9 --labels mkt53,project,fact --space mkt53

# ... 其余 11 条
```

**验收**：
```bash
nmem --json memories search "mkt53" --space mkt53 -n 20 | python3 -c "
import sys, json
d = json.load(sys.stdin)
ids = {m['id'] for m in d.get('memories',[])}
expected = {f'mkt53-{t}-{n:03d}' for t in ['fact','decision','context','procedure','learning','plan','event'] for n in range(1,3) if not (t in ['fact'] and n>3) and not (t in ['decision','context','procedure'] and n>2) and not (t in ['learning','plan','event'] and n>1)}
missing = expected - ids
assert not missing, f'Missing: {missing}'
print(f'MKG-05 PASS: {len(ids)}/12 seeds found')
"
```

---

## Wave 2：本体与图谱

### MKG-06 应用 mkt53 本体

**前置**：确认 nmem ontology apply 命令格式（参考 MAS 项目经验，patch 根类型仅接受 `objectTypes/linkTypes/openWorld/policy/seedFromDefaults`）

**命令**：
```bash
nmem ontology apply --space-id mkt53 --patch '{
  "objectTypes": [
    {"key":"MKT53_PRODUCT","displayName":"产品模块","description":"市场/竞争/用户/行业/AI助手/报告/数据管理","status":"active"},
    {"key":"MKT53_DATA_SOURCE","displayName":"数据来源","description":"source-registry 条目，含证据分级与采集方式","status":"active"},
    {"key":"MKT53_CONTRACT","displayName":"数据契约","description":"字段口径、快照契约、脱敏边界","status":"active"},
    {"key":"MKT53_WORKFLOW","displayName":"工作流","description":"半月刷新、质量门禁、发布流程","status":"active"},
    {"key":"MKT53_DECISION","displayName":"产品决策","description":"路线图优先级、不做项、数据接入决策","status":"active"},
    {"key":"MKT53_TICKET","displayName":"治理票据","description":"DQ-xxx 数据质量票据、P0-xxx 优先级票据","status":"active"},
    {"key":"MKT53_RISK","displayName":"风险项","description":"不可信数据、示例数据、合规缺口","status":"active"},
    {"key":"MKT53_RELEASE","displayName":"发布版本","description":"生产发布记录、半月快照版本","status":"active"}
  ],
  "linkTypes": [
    {"key":"MKT53_PRODUCT_USES_SOURCE","displayName":"产品模块使用来源","inverseDisplayName":"被产品模块使用","directional":true,"status":"active"},
    {"key":"MKT53_CONTRACT_GOVERNS_SOURCE","displayName":"契约约束来源","inverseDisplayName":"被契约约束","directional":true,"status":"active"},
    {"key":"MKT53_WORKFLOW_PRODUCES_RELEASE","displayName":"工作流产出发布","inverseDisplayName":"被工作流产出","directional":true,"status":"active"},
    {"key":"MKT53_DECISION_ADDRESSES_RISK","displayName":"决策应对风险","inverseDisplayName":"被决策应对","directional":true,"status":"active"},
    {"key":"MKT53_TICKET_BLOCKS_RELEASE","displayName":"票据阻塞发布","inverseDisplayName":"被票据阻塞","directional":true,"status":"active"},
    {"key":"MKT53_TICKET_RESOLVES_RISK","displayName":"票据解决风险","inverseDisplayName":"被票据解决","directional":true,"status":"active"}
  ],
  "openWorld": false,
  "policy": "strict"
}'
```

**验收**：
```bash
nmem --json ontology show | python3 -c "
import sys, json
d = json.load(sys.stdin)
sp = d.get('store',{}).get('spaces',{}).get('mkt53',{})
ots = [ot['key'] for ot in sp.get('objectTypes',[])]
lts = [lt['key'] for lt in sp.get('linkTypes',[])]
assert len(ots)==8 and len(lts)==6, f'Expected 8+6, got {len(ots)}+{len(lts)}'
assert sp.get('openWorld')==False and sp.get('policy')=='strict'
print('MKG-06 PASS')
"
```

---

### MKG-07 写入 10 条记忆关系

**关系清单**（基于 12 条种子记忆 + 业务逻辑）：

| # | from | relation | to | 说明 |
|---|---|---|---|---|
| 1 | mkt53-decision-001 (产品升级) | MKT53_DECISION_ADDRESSES_RISK | mkt53-context-001 (不可信数据) | 路线图决策应对数据质量风险 |
| 2 | mkt53-procedure-001 (半月刷新) | MKT53_WORKFLOW_PRODUCES_RELEASE | mkt53-event-001 (graphify 刷新) | 半月刷新触发图谱更新 |
| 3 | mkt53-fact-001 (项目定位) | MKT53_PRODUCT_USES_SOURCE | mkt53-context-002 (source-registry 统计) | 产品模块依赖数据来源 |
| 4 | mkt53-decision-002 (证据优先) | MKT53_CONTRACT_GOVERNS_SOURCE | mkt53-context-002 (source-registry 统计) | 数据治理契约约束来源 |
| 5 | mkt53-learning-001 (90 天路线图) | MKT53_DECISION_ADDRESSES_RISK | mkt53-context-001 (不可信数据) | 路线图按优先级解决风险 |
| 6 | mkt53-procedure-002 (质量门禁) | MKT53_WORKFLOW_PRODUCES_RELEASE | mkt53-event-001 (graphify 刷新) | 质量门禁包含图谱更新 |
| 7 | mkt53-fact-003 (后端状态) | MKT53_PRODUCT_USES_SOURCE | mkt53-context-002 (source-registry 统计) | 后端 API 暴露 source-registry |
| 8 | mkt53-plan-001 (记忆系统计划) | MKT53_TICKET_BLOCKS_RELEASE | mkt53-event-001 (graphify 刷新) | 记忆系统建设阻塞图谱发布 |
| 9 | mkt53-plan-001 (记忆系统计划) | MKT53_TICKET_RESOLVES_RISK | mkt53-context-001 (不可信数据) | 记忆系统帮助追踪数据风险 |
| 10 | mkt53-fact-002 (技术栈) | MKT53_PRODUCT_USES_SOURCE | mkt53-context-002 (source-registry 统计) | 前端架构依赖数据层 |

**写入命令模板**：
```bash
nmem memories link create \
  --from mkt53-decision-001 \
  --to mkt53-context-001 \
  --relation-type MKT53_DECISION_ADDRESSES_RISK \
  --space mkt53
```

**验收**：
```bash
# 验证 link list 双向扫描
for id in mkt53-decision-001 mkt53-context-001 mkt53-procedure-001 mkt53-event-001; do
  echo "=== $id ==="
  nmem --json memories link list --memory-id "$id" --space mkt53
done
```

---

### MKG-08 图谱实体与 graphify 映射

**目标**：建立 nmem 业务图谱节点与 graphify 代码图谱节点的映射关系，实现双向导航。

**映射表**：

| nmem 节点 | graphify 节点 | 映射方式 |
|---|---|---|
| MKT53_PRODUCT (产品模块) | app/src/pages/*.tsx | 页面文件路径 |
| MKT53_DATA_SOURCE (数据来源) | app/src/data/source-registry.ts | 文件路径 + registry id |
| MKT53_WORKFLOW (半月刷新) | app/scripts/data/build-semi-monthly-*.mjs | 脚本文件路径 |
| MKT53_WORKFLOW (质量门禁) | app/package.json scripts.quality:release-evidence | package.json 脚本路径 |
| MKT53_CONTRACT (数据契约) | app/src/data/source-registry.ts SourceRegistryItem | TypeScript 接口路径 |
| MKT53_RELEASE (半月快照) | app/public/periodic-data/latest.json | 静态文件路径 |

**执行方式**：在 nmem 记忆内容中嵌入 graphify 节点 ID 作为路径指针。

**验收**：随机抽查 3 条记忆，确认内容中包含可解析的 graphify 节点路径。

---

### MKG-09 Library 入库正式文档

**文档清单**（8 篇，统一改 `.markdown` 后缀）：

| # | 源路径 | 目标名 | 内容类型 |
|---|---|---|---|
| 1 | docs/product/product-roadmap-market-insight-stable.md | mkt53-product-roadmap.markdown | PRD |
| 2 | docs/workflows/workflow-quality-gate-stable.md | mkt53-workflow-quality-gate.markdown | 工作流 |
| 3 | docs/workflows/workflow-semi-monthly-data-collection-stable.md | mkt53-workflow-semi-monthly.markdown | 工作流 |
| 4 | docs/workflows/workflow-static-deploy-stable.md | mkt53-workflow-static-deploy.markdown | 工作流 |
| 5 | docs/workflows/workflow-weekly-data-collection-stable.md | mkt53-workflow-weekly-data.markdown | 工作流 |
| 6 | docs/knowledge/knowledge-data-source-governance-stable.md | mkt53-knowledge-data-governance.markdown | 知识 |
| 7 | docs/knowledge/knowledge-session-summary-20260605-stable.md | mkt53-knowledge-session-summary.markdown | 知识 |
| 8 | docs/architecture/adr-be-01-backend-deployment-shape-20260724.md | mkt53-architecture-be01.markdown | 架构 |

**命令模板**：
```bash
cp docs/product/product-roadmap-market-insight-stable.md /tmp/mkt53-product-roadmap.markdown
nmem library add /tmp/mkt53-product-roadmap.markdown --space mkt53
```

**验收**：
```bash
nmem --json library list --space mkt53 | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d.get('items', [])
assert len(items) >= 8, f'Expected >=8 library items, got {len(items)}'
print(f'MKG-09 PASS: {len(items)} items')
"
```

---

### MKG-10 图谱查询基线

**正向问题（8 条，预期 verbatim 命中）**：
1. "mkt53 项目定位是什么"
2. "mkt53 技术栈有哪些"
3. "mkt53 半月刷新流程是什么"
4. "mkt53 质量门禁包含哪些步骤"
5. "mkt53 数据治理原则是什么"
6. "mkt53 当前有哪些不可信数据"
7. "mkt53 后端 BE-07 是什么"
8. "mkt53 source-registry 有多少条来源"

**负向问题（8 条，预期拒答或低置信）**：
1. "mkt53 的生产数据库密码是什么"
2. "mkt53 的 Amazon API key 是什么"
3. "mkt53 下周会发布什么功能"
4. "mkt53 的 CEO 是谁"
5. "mkt53 的竞争对手财报数据"
6. "mkt53 的供应商合同细节"
7. "mkt53 的内部员工薪资"
8. "mkt53 的未公开并购计划"

**图问题（3 条，预期返回关系路径）**：
1. "mkt53 产品升级决策与不可信数据有什么关系"
2. "mkt53 半月刷新工作流产出什么"
3. "mkt53 数据治理原则约束哪些来源"

**验收标准**：verbatim ≥7/8，负向 8/8 拒答，图问题 3/3 返回有效路径。

---

## Wave 3：验收与维护

### MKG-11 检索验收

**检查项**：
- [ ] 12 条种子记忆全部可检索（`nmem memories search "mkt53" --space mkt53`）
- [ ] 来源指纹零漂移（对比种子内容与检索结果）
- [ ] 幂等重放（同 id 重放返回 Updated，计数保持 12）
- [ ] 跨项目污染 0（在 sage/voc-agent Space 搜索 mkt53 返回 0 条）

---

### MKG-12 图谱验收

**检查项**：
- [ ] 正向检索 ≥7/8
- [ ] 负向拒答 8/8
- [ ] 图问题 3/3 有效
- [ ] `nmem graph expand mkt53-decision-001 --space mkt53` 可见 MKT53_DECISION_ADDRESSES_RISK 关系
- [ ] `nmem graph expand mkt53-procedure-001 --space mkt53` 可见 MKT53_WORKFLOW_PRODUCES_RELEASE 关系

---

### MKG-13 写入 ledger

**文件**：`docs/knowledge/mkt53-memory-write-ledger.jsonl`

**格式**：
```json
{"ticket":"MKG-01","action":"create_space","space":"mkt53","timestamp":"2026-10-31T...","result":"pass","evidence":"nmem spaces list output"}
{"ticket":"MKG-05","action":"seed_memory","id":"mkt53-fact-001","space":"mkt53","timestamp":"...","result":"pass","evidence":"nmem memories search top-1 score"}
...
```

---

### MKG-14 维护模式固化

**写入维护文档**：`docs/knowledge/mkt53-memory-maintenance-stable.md`

**内容**：
- 增量触发器：graphify update 纳入半月刷新（每月 1/16 日）
- 记忆复审触发器：source-registry.ts 变更时自动标记相关记忆为 stale
- 图谱关系复审：每季度检查 MKT53_* 关系是否仍与代码结构一致

---

## 风险与升级路径

| 风险 | 触发条件 | 升级动作 |
|---|---|---|
| 种子记忆 verbatim <7/8 | MKG-12 验收失败 | 补术语别名到种子内容，重放 MKG-05 |
| 本体 apply 返回 422 | MKG-06 失败 | 检查 patch 根字段，移除多余 envelope |
| Library 入库失败 | MKG-09 失败 | 确认后缀为 `.markdown`，检查文件编码 |
| graphify update 后图谱节点减少 | MKG-08 前置检查 | 使用 `--force` 或检查代码变更是否删除大量文件 |
| 跨项目污染 >0 | MKG-11 失败 | 检查 Space 隔离，确认种子记忆未误写 default Space |
