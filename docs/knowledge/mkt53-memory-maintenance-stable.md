---
title: mkt53 记忆系统维护规范
doc_type: knowledge
module: memory-governance
topic: mkt53-memory-maintenance
status: stable
created: 2026-10-31
updated: 2026-10-31
owner: self
source: human+ai
---

# mkt53 记忆系统维护规范

## 资产清单

| 资产 | 位置 | 数量 | 更新方式 |
|---|---|---|---|
| 种子记忆 | nmem mkt53 Space | 14 条 | 显式增量，见下方触发器 |
| 记忆关系 | nmem mkt53 Space | 10 条 | 随种子记忆同步更新 |
| Space Rules | nmem mkt53 Space | 2 条 active | 需用户授权后修改 |
| Working Memory | nmem mkt53 Space | 1 条 | 每日自动归档，手动更新 |
| Library 文档 | nmem mkt53 Space | 8 篇 | 文档稳定后入库，`.markdown` 后缀 |
| graphify 图谱 | `graphify-out/` | 4623 nodes | `graphify update .`（AST-only） |
| 本体 | nmem mkt53 Space | 8+6 类型 | 需用户授权后 apply |
| Ledger | `docs/knowledge/mkt53-memory-write-ledger.jsonl` | 12 条 | 每次写入后追加 |

## 增量触发器

| 触发条件 | 动作 | 命令 |
|---|---|---|
| `app/src/data/source-registry.ts` 变更 | 标记 `mkt53-context-002` 为 stale，重新统计并更新 | `nmem memories add --id mkt53-context-002 ...` |
| `docs/product/product-roadmap-*.md` 更新 | 重新提取决策/风险/路线图到对应记忆 | 逐条重放 |
| `docs/workflows/workflow-*.md` 更新 | 更新对应 procedure 记忆 | 逐条重放 |
| graphify 图谱刷新 | 更新 `mkt53-event-001` 时间戳和统计 | `graphify update . && nmem memories add --id mkt53-event-001 ...` |
| 新数据域接入（Amazon/CRM/ERP 等） | 新增 context 记忆 + 建立与决策/风险的关系 | 新记忆 + `nmem memories link add` |
| 半月刷新完成 | 更新 Working Memory 当前周期 | `nmem working-memory edit --space mkt53` |

## 复审周期

| 周期 | 动作 | 负责 |
|---|---|---|
| 每日 | Working Memory 自动归档 | nmem 自动 |
| 每周 | 检查 `mkt53-context-002` 统计是否仍准确 | 人工 |
| 每月（半月刷新后） | 执行 `graphify update .` 并更新 `mkt53-event-001` | 人工 |
| 每季度 | 复审 10 条记忆关系是否仍与代码结构一致 | 人工 |
| 每季度 | 检查 Library 文档是否需要更新 | 人工 |

## 边界与禁止事项

1. **不自动同步**：nmem 与 graphify 之间无自动 watcher，所有同步为显式人工触发。
2. **不跨 Space 写入**：mkt53 记忆只写入 mkt53 Space，禁止写入 default/sage/voc-agent。
3. **不降低检索标准**：负向问句泄漏是已知引擎局限，不通过降低阈值解决。
4. **不复制正文**：记忆内容只存指针与判断，不复制代码/文档正文（Rule mkt53_pointer_layering）。
5. **不覆盖未授权变更**：任何修改 source-registry、产品路线图、工作流文档的操作，需先确认用户授权。

## 故障恢复

| 场景 | 恢复动作 |
|---|---|
| nmem server 不可用 | 记忆系统暂停，不影响 graphify 和代码开发 |
| graphify 图谱损坏 | `graphify update . --force` 重建 |
| 种子记忆丢失 | 按 `mkt53-memory-write-ledger.jsonl` 重放 MKG-05 |
| 本体损坏 | 按 ledger 重放 MKG-06（需授权） |
| Library 文档丢失 | 重新执行 MKG-09（`.markdown` 后缀） |

## 联系

- 方案：`drafts/docs/mkt53-memory-knowledge-plan-draft-20261031.md`
- Tickets：`drafts/docs/mkt53-memory-knowledge-tickets-draft-20261031.md`
- Ledger：`docs/knowledge/mkt53-memory-write-ledger.jsonl`
