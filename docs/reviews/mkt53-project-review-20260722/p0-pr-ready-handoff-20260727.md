---
title: Batch 29 最终复审、PR Ready 门禁与合并前交接
status: pr-ready-ci-green-coderabbit-recheck-pending-not-merged-not-deployed
created: 2026-07-27
updated: 2026-07-27
owner: engineering
source: git+github-actions+codex-review+coderabbit+graphify
---

# Batch 29：最终复审、PR Ready 门禁与合并前交接

## 1. 结果

本批在 Batch 28 完整分支复核基础上执行最终 PR Ready 门禁。PR [#32](https://github.com/zjgulai/mkt53/pull/32) 已从 Draft 转为 Ready for review，当前仍为 open，merge state 为 `CLEAN`；没有执行 merge、应用部署、生产写入、nginx 修改、cron 操作或 provider/connector 调用。

第一轮远端候选绑定精确 SHA `91fe39359dcd1119cebd8d342e0d5ae055770c56`。GitHub Actions [run 30266769844](https://github.com/zjgulai/mkt53/actions/runs/30266769844) 的 app/backend 均为 success，两个 check-run annotations 均为 0。PR 转为 Ready 后，CodeRabbit 已启动完整差异复审；截至本文件首次写入时，该外部复审因 294 个文件规模重新进入 queued/pending，尚未产出 finding 或终态，不能写成“通过”。

## 2. 本批关闭的缺口

| 优先级 | Finding | 修复与永久合同 |
|---|---|---|
| P1 | 已处于 pending 的 review 在关联 Source 更新后不刷新 version，旧 ETag 仍可能批准 | `reopen_review()` 对既有 pending review 也刷新 `updated_at`；双 session 回归证明旧 ETag 返回 412 |
| P1 | 用户模块仍从 `canDisplayAsFact=false` 来源渲染情绪、NPS、门店与渠道数值 | 新增 `FactDisplayGate`，对 ds-012/013/014/041/042 fail closed，只显示治理状态 |
| P2 | 三条人工 intake 链仍接受 `2026-02-30` 等不可能日期 | 复用共享 `isValidIsoDateOrDateTime`，静态脚本测试覆盖三个入口 |
| P2 | 页面级 gate 隐藏内容时同时移除了独立用户子页导航 | `FactDisplayGate` 支持保留 navigation，四个子页恢复用户模块导航 |
| P2 | 导航回归只检查 DOM 数量，移动端实际仍因 `hidden lg:block` 不可见 | `Sidebar` 新增受控 responsive 模式，gate 使用纵向小屏布局；E2E 改为 `toBeVisible()` |

完整分支复审第一次尝试因本机内存压力收到 SIGKILL/137，因此只记为无结论环境失败。本批采用 Batch 28 已完成的完整分支 review 作为基线，再对 `4b7b687..HEAD` 与每个 follow-up fix 做增量复审；发现与修复相互绑定，不把 exit code、包装器尾句或测试绿色单独解释为 clean review。

## 3. 提交链

| 提交 | 作用 |
|---|---|
| `1535602` | 后端并发失效、用户事实展示门、三条严格日期合同 |
| `2b9dbed` | 同步第一轮修复后的 Graphify 图谱 |
| `257c1aa` | gate 状态保留独立用户子页导航 |
| `9ccf86a` | 将 Graphify built-from 对齐到导航修复 |
| `99cfc3d` | 移动/平板可见的响应式导航与可见性回归 |
| `91fe393` | 将 Graphify built-from 对齐到最终响应式修复 |

这些提交均已推送到 `codex/mkt53-release-candidate-20260630`，没有改写共享历史。

## 4. 本地验证

- app 完整 Vitest：24 files / 189 tests；
- ESLint：通过；
- Vite build：2,384 modules；
- bundle：78 JS assets，预算通过；
- 数据一致性：43 pages / 107 tables / 53 sources / 0 issues；
- 深度审计：46 routes / 888 claims / 0 high risk；
- Chromium E2E：154 / 154，桌面与移动双视口；
- backend BE-07：65 tests，coverage 92.74%，Ruff/format、Compose 隔离恢复与清理均通过；
- Codex 最终定向复审：响应式导航修复无新 finding。

## 5. Graphify

代码变更后已执行：

```bash
graphify update .
graphify cluster-only . --min-community-size=0
```

当前 canonical 图谱由 `13e72a8` 提交，报告 built from `db04b38a`：4,599 nodes / 7,308 edges / 347 communities。60 个 JSON/config 等源文件仍产生 zero nodes，图谱不替代这些文件的原文与运行证据。

## 6. PR Ready 操作与外部门禁

执行顺序：

1. 推送 `91fe393`；
2. 确认 PR head 与本地 SHA 完全一致；
3. 等待 app/backend CI 完成并核对 annotations=0；
4. 重新抓取 review threads，确认当时为 0；
5. 执行 `gh pr ready 32 --repo zjgulai/mkt53`；
6. 等待 CodeRabbit 对 Ready 事件启动完整复审。

CodeRabbit 的 pending/queued 是外部审查未决，不等于失败，也不等于通过。在它结束前，合并者应重新抓取 status、reviews 与 review threads；任何 actionable finding 都要先复现、修复并通过新 SHA 门禁。

## 7. 合并前 TODO

1. 等待 CodeRabbit 当前 run 进入明确终态并处理全部 actionable threads；
2. 若分支新增提交，重新绑定精确 PR head，等待 app/backend 和 annotations 复核；
3. 由人工 reviewer 做最终业务边界确认；
4. 单独决定是否 merge；本批不含 merge 授权；
5. merge 后仍需独立部署授权，不能把合并解释为生产发布；
6. 2026-08-01 09:00 后只读观察首次半月 cron 日志、run report 与双路径哈希；
7. DATA-REG 继续等待六组真实 owner/source/SKU/legal/evidence/withdrawal 输入与独立法务授权。

## 8. 回滚

PR 未合并、未部署时，优先保持共享历史并按逆序创建 revert：

```bash
git revert 91fe393
git revert 99cfc3d
git revert 9ccf86a
git revert 257c1aa
git revert 2b9dbed
git revert 1535602
```

不要 force-push。当前没有生产应用变更，因此不需要 nginx、静态目录、cron 或数据库回滚。

机器证据见 [`evidence/p0-pr-ready-handoff-20260727.json`](./evidence/p0-pr-ready-handoff-20260727.json)。
