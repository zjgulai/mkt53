---
title: Batch 29 最终复审、PR Ready 门禁与合并前交接
status: pr-ready-review-fixes-local-green-awaiting-exact-head-ci-not-merged-not-deployed
created: 2026-07-27
updated: 2026-07-27
owner: engineering
source: git+github-actions+codex-review+coderabbit+graphify
---

# Batch 29：最终复审、PR Ready 门禁与合并前交接

## 1. 结果

本批在 Batch 28 完整分支复核基础上执行最终 PR Ready 门禁。PR [#32](https://github.com/zjgulai/mkt53/pull/32) 已从 Draft 转为 Ready for review，当前仍为 open；没有执行 merge、应用部署、生产写入、nginx 修改、cron 操作或 provider/connector 调用。

第一轮远端候选绑定精确 SHA `91fe39359dcd1119cebd8d342e0d5ae055770c56`。GitHub Actions [run 30266769844](https://github.com/zjgulai/mkt53/actions/runs/30266769844) 的 app/backend 均为 success，两个 check-run annotations 均为 0。PR 转为 Ready 后，CodeRabbit 完成 294 文件差异复审，给出 3 个 Critical inline finding 和 1 个 Major outside-diff finding；本批已逐项复现并在代码提交 `f880ea5d7f379c6422f95a87bc1f9daa212bbef9` 中关闭。文档固化时这些提交尚待推送后的 exact-head GitHub CI 与 CodeRabbit recheck，因此不把本地绿色写成远端终态。

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

`91fe393` 及此前提交已经推送；`f880ea5`、`5360ea6` 与本交接文档将在本批统一推送到 `codex/mkt53-release-candidate-20260630`，不改写共享历史。推送成功和 exact-head CI 需要以 GitHub 实际回执为准。

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
8. 从修复提交重建图谱，准备推送后 exact-head CI 与 CodeRabbit recheck。

CodeRabbit 的 3 个 Critical inline finding 已有代码修复，但在 GitHub 上仍需在新 SHA 推送后回复、recheck 并解决线程；1 个 Major 因 GitHub outside-diff 限制没有独立线程。其余 33 个 Minor 建议不混入本次高优先级安全/正确性批次，后续应按风险和产品价值分批验证，不能笼统写成已关闭。

## 7. 合并前 TODO

1. 推送 `f880ea5`、`5360ea6` 与交接文档，重新绑定精确 PR head；
2. 等待 app/backend exact-head CI 完成并核对 annotations；
3. 回复并解决 3 个已修复的 Critical inline threads，检查 recheck 是否产生新高优先级 finding；
4. 对 33 个 Minor 建议建立独立批次，逐项验证后再决定修复或保留；
5. 由人工 reviewer 做最终业务边界确认；
6. 单独决定是否 merge；本批不含 merge 授权；
7. merge 后仍需独立部署授权，不能把合并解释为生产发布；
8. 2026-08-01 09:00 后只读观察首次半月 cron 日志、run report 与双路径哈希；
9. DATA-REG 继续等待六组真实 owner/source/SKU/legal/evidence/withdrawal 输入与独立法务授权。

## 8. 回滚

PR 未合并、未部署时，优先保持共享历史并按逆序创建 revert：

```bash
git revert 5360ea6
git revert f880ea5
git revert 91fe393
git revert 99cfc3d
git revert 9ccf86a
git revert 257c1aa
git revert 2b9dbed
git revert 1535602
```

不要 force-push。当前没有生产应用变更，因此不需要 nginx、静态目录、cron 或数据库回滚。

机器证据见 [`evidence/p0-pr-ready-handoff-20260727.json`](./evidence/p0-pr-ready-handoff-20260727.json)。
