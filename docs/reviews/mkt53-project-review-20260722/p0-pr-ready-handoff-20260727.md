---
title: Batch 29 最终复审、PR Ready 门禁与合并前交接
status: pr-ready-2365-ci-green-coderabbit-follow-up-local-clean-pending-push-ci-external-recheck-not-merged-not-deployed
created: 2026-07-27
updated: 2026-07-28
owner: engineering
source: git+github-actions+codex-review+coderabbit+graphify
---

# Batch 29：最终复审、PR Ready 门禁与合并前交接

## 1. 结果

本批在 Batch 28 完整分支复核基础上执行最终 PR Ready 门禁。PR [#32](https://github.com/zjgulai/mkt53/pull/32) 已从 Draft 转为 Ready for review，当前仍为 open；没有执行 merge、应用部署、生产写入、nginx 修改、cron 操作或 provider/connector 调用。

第一轮远端候选绑定精确 SHA `91fe39359dcd1119cebd8d342e0d5ae055770c56`。PR 转为 Ready 后，CodeRabbit 完成 294 文件差异复审，给出 3 个 Critical inline finding 和 1 个 Major outside-diff finding；本批已逐项复现并在代码提交 `f880ea5d7f379c6422f95a87bc1f9daa212bbef9` 中关闭。包含代码、图谱和本文档的精确 PR head `7ae8a1993b175f66503f65878f003b03f1a43044` 已由 GitHub Actions [run 30271729225](https://github.com/zjgulai/mkt53/actions/runs/30271729225) 验证：app 4m20s、backend 1m1s，均为 success，两个 check-run annotations 均为 0。3 个 Critical inline thread 已回复并全部 resolved；本文最初生成时 CodeRabbit recheck 仍为 `Review queued`，该状态只保留为当时快照。

2026-07-28 follow-up：CodeRabbit 已在精确 head `c2fe523b05bac1084b15bc91c1a99e043b087539` 完成新一轮 review（run `26df0c06-5f2a-4306-88da-d2e33dc194c2`，GitHub review state=`COMMENTED`），给出 5 项 actionable finding。`CodeRabbit=SUCCESS` 只表示机器人运行完成，不表示批准。recursive contract、runtime manifest/eligible record、ds-008 页面/来源绑定、ABC Kids Expo/Nielsen 错误归因、三条 seed provenance 与测试保护已在本地 5/5 修复。前六轮受控 Codex follow-up 累计发现 16 项（P1×2 / P2×12 / P3×2），全部关闭；第七轮 session `019fa730-f7e9-7910-919b-a1dcc651fc06` clean。随后推送的 `2365bfc965550c1b236ca4b32c1df197a9d2e592` 已由 GitHub Actions run `30332364362` 精确验证：app 4m33s、backend 58s、annotations 均为 0。CodeRabbit run `7a7909e3-566e-4df4-8009-53e69ace746c` / review `4794237146` 在该 head 给出 2 项 inline finding 和 1 项 outside-diff Major；static 结果合同、Graphify MD037、共享 Hook 与品牌色均已本地关闭。Codex session `019fa757-aec6-75a3-858c-b0e0157068c7` 进一步发现并关闭长会话 stale cache P2，最终 session `019fa764-ac58-7380-99f4-0c5e7fcc3bb7` completed 且 0 actionable finding。当前通过 25 files / 204 tests、lint、build；本轮工作树推送、精确 head CI 和 CodeRabbit recheck 完成前，仍不能合并。

## 2. 本批关闭的缺口

| 优先级 | Finding | 修复与永久合同 |
|---|---|---|
| P1 | 已处于 pending 的 review 在关联 Source 更新后不刷新 version，旧 ETag 仍可能批准 | `reopen_review()` 对既有 pending review 也刷新 `updated_at`；双 session 回归证明旧 ETag 返回 412 |
| P1 | 用户模块仍从 `canDisplayAsFact=false` 来源渲染情绪、NPS、门店与渠道数值 | 新增 `FactDisplayGate`，对 ds-012/013/014/041/042 fail closed，只显示治理状态 |
| P2 | 三条人工 intake 链仍接受 `2026-02-30` 等不可能日期 | 复用共享 `isValidIsoDateOrDateTime`，静态脚本测试覆盖三个入口 |
| P2 | 页面级 gate 隐藏内容时同时移除了独立用户子页导航 | `FactDisplayGate` 支持保留 navigation，四个子页恢复用户模块导航 |
| P2 | 导航回归只检查 DOM 数量，移动端实际仍因 `hidden lg:block` 不可见 | `Sidebar` 新增受控 responsive 模式，gate 使用纵向小屏布局；E2E 改为 `toBeVisible()` |
| Critical | Graphify query 文档把用户问题、答案、节点和 budget 插入 shell/Python 源码 | 改为引用 shell 变量、环境变量与 quoted heredoc；mode 仅允许 bfs/dfs，budget 限定为 1–100000 |
| Critical | customs adapter 顶层 `networkCalls=0` 与同一证据和 safety check 的 39 相互矛盾 | periodic/weekly adapter 与 latest 摘要统一为 39，并增加四份兼容产物、证据摘要和 safety check 的一致性回归 |
| Critical | 业务数据库 session engine 未继承 readiness probe 的连接超时 | `DatabaseSessionManager` 使用相同 `database_connect_timeout_seconds`，并新增 engine/sessionmaker 参数与 dispose 回归 |
| Major | 数据审计仍查找已经不存在的 `NN张数据表` 字面量，导致漂移检查永久失效 | 移除失效正则和死检查；以实际 catalog/governance 数量合同为 canonical |
| P2 | customs 页面优先读取 `latest.json` 的旧 `networkCalls=0`，会覆盖已修复 adapter | 同步修复 periodic/weekly latest 摘要，并将该覆盖路径纳入静态脚本回归 |

完整分支复审第一次尝试因本机内存压力收到 SIGKILL/137，因此只记为无结论环境失败。本批采用 Batch 28 已完成的完整分支 review 作为基线，再对 `4b7b687..HEAD` 与每个 follow-up fix 做增量复审。修复 CodeRabbit 高优先级 finding 后，Codex Review 又发现 latest 摘要覆盖 adapter 的 P2 问题；修复后通过受控、只读、禁止递归调用的最终复审，结果为 `No actionable findings.`。发现与修复相互绑定，不把 exit code、包装器尾句或测试绿色单独解释为 clean review。

## 3. 提交链

| 提交 | 作用 |
|---|---|
| `1535602` | 后端并发失效、用户事实展示门、三条严格日期合同 |
| `2b9dbed` | 同步第一轮修复后的 Graphify 图谱 |
| `257c1aa` | gate 状态保留独立用户子页导航 |
| `9ccf86a` | 将 Graphify built-from 对齐到导航修复 |
| `99cfc3d` | 移动/平板可见的响应式导航与可见性回归 |
| `91fe393` | 将 Graphify built-from 对齐到最终响应式修复 |
| `f880ea5` | 关闭 CodeRabbit 3 Critical、1 Major 与 Codex Review 1 P2，并新增回归 |
| `5360ea6` | 从 `f880ea5` 重建 Graphify 图谱与全部非文件社区 |

以上提交均已推送到 `codex/mkt53-release-candidate-20260630`，没有改写共享历史。实现/图谱/交接文档的远端验证 head 为 `7ae8a1993b175f66503f65878f003b03f1a43044`；随后用于记录这份远端回执的提交只改变文档，业务代码树仍由 `f880ea5` 定义。

## 4. 本地验证

- app 完整 Vitest：24 files / 190 tests；
- ESLint：通过；
- Vite build：2,384 modules；
- bundle：78 JS assets，预算通过；
- 数据一致性：43 pages / 107 tables / 53 sources / 0 issues；
- 深度审计：46 routes / 888 claims / 0 high risk；
- Chromium E2E：154 / 154，桌面与移动双视口；
- backend BE-07：66 tests，coverage 92.74%，Ruff/format、Compose 隔离恢复与清理均通过；
- Codex 最终受控只读复审：`No actionable findings.`；
- customs 产物边界：evidence、adapter、latest 和 safety check 的 `networkCalls=39`、`businessDataWrites=0` 一致；periodic/weekly 双份产物分别 byte-identical。

## 5. Graphify

代码变更后已执行：

```bash
graphify update .
graphify cluster-only . --min-community-size=0
```

当前 canonical 图谱由 `5360ea6830df6aa30f86125f5c762729f6fa5f8b` 提交，报告 built from 代码修复 `f880ea5d7f379c6422f95a87bc1f9daa212bbef9`：4,600 nodes / 7,312 edges / 346 communities。60 个 JSON/config 等源文件仍产生 zero nodes，图谱不替代这些文件的原文与运行证据。

## 6. PR Ready 操作与外部门禁

执行顺序：

1. 推送 `91fe393`；
2. 确认 PR head 与本地 SHA 完全一致；
3. 等待 app/backend CI 完成并核对 annotations=0；
4. 重新抓取 review threads，确认当时为 0；
5. 执行 `gh pr ready 32 --repo zjgulai/mkt53`；
6. 接收 CodeRabbit 3 个 Critical inline 与 1 个 Major outside-diff finding；
7. 在 `f880ea5` 修复，并以 Codex Review 发现和关闭额外 latest 摘要 P2；
8. 从修复提交重建图谱并推送；
9. 精确 head `7ae8a19` 的 app/backend CI 成功、annotations=0；
10. 回复并 resolve 3/3 Critical inline threads；CodeRabbit recheck 进入 `Review queued`。

CodeRabbit 的 3 个 Critical inline finding 已修复、回复并 resolved；1 个 Major 因 GitHub outside-diff 限制没有独立线程，已在 PR 总结评论中记录修复。recheck 的 `Review queued` 是外部审查未决，不等于失败，也不等于通过。其余 33 个 Minor 建议不混入本次高优先级安全/正确性批次，后续应按风险和产品价值分批验证，不能笼统写成已关闭。

## 7. 合并前 TODO

1. 提交并推送已经通过最终无 finding Codex recheck 的共享 public-evidence Hook、页面安全失效关闭、仅 in-flight 去重与 Graphify MD037 follow-up，等待新精确 head app/backend CI 与 CodeRabbit recheck；若再产生 finding，继续走复现、修复与 exact-head CI；
2. 对 33 个 Minor 建议建立独立批次，逐项验证后再决定修复或保留；
3. 由人工 reviewer 做最终业务边界确认；
4. 单独决定是否 merge；本批不含 merge 授权；
5. merge 后仍需独立部署授权，不能把合并解释为生产发布；
6. 2026-08-01 09:00 后只读观察首次半月 cron 日志、run report 与双路径哈希；
7. DATA-REG 继续等待六组真实 owner/source/SKU/legal/evidence/withdrawal 输入与独立法务授权。

## 8. 回滚

PR 未合并、未部署时，优先保持共享历史。截至本文验证 head `7ae8a19` 的 Batch 29 提交应按逆序创建 revert：

```bash
git revert 7ae8a19
git revert 5360ea6
git revert f880ea5
git revert 32148dc
git revert 13e72a8
git revert db04b38
git revert 91fe393
git revert 99cfc3d
git revert 9ccf86a
git revert 257c1aa
git revert 2b9dbed
git revert 1535602
```

不要 force-push。当前没有生产应用变更，因此不需要 nginx、静态目录、cron 或数据库回滚。

机器证据见 [`evidence/p0-pr-ready-handoff-20260727.json`](./evidence/p0-pr-ready-handoff-20260727.json)。
