---
title: Batch 28 完整 Codex 复核、证据治理修复与最终候选交接
status: draft-pr-ci-green-review-findings-closed-not-merged-not-deployed
created: 2026-07-27
updated: 2026-07-27
owner: engineering
source: git+github-actions+codex-review+graphify
---

# Batch 28：完整 Codex 复核、证据治理修复与最终候选交接

## 1. 结果

本批对草稿 PR [#32](https://github.com/zjgulai/mkt53/pull/32) 的完整分支差异执行了有界 Codex review，收到 2 个 P1 和 4 个 P2 finding。六项问题均已复现、修复并加入回归合同；实现提交为 `212f7dc`，Graphify 提交为 `690fb9f`。

精确 SHA `690fb9f0f1bfa7a269752c33fe6824a6fd65c507` 对应的 GitHub Actions [run 30261698324](https://github.com/zjgulai/mkt53/actions/runs/30261698324) 已完成：

- app：success，release evidence 聚合步骤通过；
- backend：success，BE-07 本地/fixture 质量门通过；
- app/backend annotations：`0/0`；
- PR 仍为 open/draft，没有 merge、部署或生产写入。

这些证据说明本地候选和 GitHub-hosted 候选门已通过，不说明应用、后端或数据已经部署到生产。

## 2. 六项 review finding 与修复

| 优先级 | Finding | 修复与永久合同 |
|---|---|---|
| P1 | manual release review 使用 `task_id OR source_id`，可能批准错误组合 | 改为 task 与 source 双重精确匹配，并修正测试记录中的真实 task id |
| P1 | customs evidence 缺 safety counters 时被默认成 0 | 缺失或非安全非负整数时返回 blocked，不再伪造零副作用证明 |
| P2 | customs record 仅靠 seed/status/terms 即可 ready | 强制 source scope、官方 HTTPS URL、title、64 位 SHA-256 与本地文本证据路径 |
| P2 | skip public evidence 会复用旧 canonical 并写入当前时间 | skip 模式传入当前空 bundle，禁止陈旧 evidence 推动 adapter ready |
| P2 | manual review 接受不可能日期或无时区时间 | 引入共享 strict ISO calendar/date-time helper，datetime 必须带时区 |
| P2 | regulation intake 接受不可能日期或无时区时间 | collection、expiry、submitted 时间统一使用严格日期合同 |

customs 官方 host 同时收紧为精确的 `www.census.gov` / `rulings.cbp.gov` 域名边界，拒绝凭据、端口和相似后缀。

## 3. Review 证据解释

执行命令：

```bash
/Users/pray/.codex/skills/codex-review/scripts/codex-review \
  --mode branch \
  --base origin/main \
  --output /tmp/mkt53-codex-review-868d4ed.log
```

审查器正常返回 6 项结构化 finding；wrapper 尾部同时打印了与 findings 矛盾的 `clean` 文案。本批按 fail-closed 原则拒绝该尾部文案，以实际 finding 列表为准，不把 exit code 0 或 wrapper 文案解释为 clean review。六项 finding 现已全部关闭；本批不再把 Batch 27 的递归中止当作最终审查结论。

## 4. 本地与远端验证

本地候选：

- 聚焦 Vitest：3 files / 98 tests；
- 完整 Vitest：23 files / 186 tests；
- ESLint：通过；
- Vite build：2,383 modules；
- bundle：77 assets / 77 pass / 0 exception / 0 fail；
- 数据一致性：43 pages / 107 tables / 53 sources；
- 深度审计：888 claims / 0 high risk / 0 unsupported / 26 source gaps；
- Chromium E2E：150 / 150。

首次 E2E 尝试只因本机缺 Playwright Chromium 而在断言前失败；执行 `npx playwright install chromium` 后，完整 150 条 E2E 通过。该安装只写本机浏览器缓存，没有修改仓库或生产。

远端候选：

```bash
gh run view 30261698324 --repo zjgulai/mkt53
```

该 run 绑定 `690fb9f`，app 用时 4m29s、backend 用时 1m03s，均为 success，两个 check-run annotations 均为 0。

## 5. Graphify

代码修复后已执行：

```bash
graphify update .
graphify cluster-only . --min-community-size=0
```

当前报告 built from `212f7dcd`，由 `690fb9f` 提交：4,574 nodes / 7,249 edges / 335 communities / 188 inferred edges / 0 model tokens。58 个 JSON/config 等源文件仍为 zero-AST 可见性限制，图谱不能替代这些文件的原文核对。

## 6. 使用、回滚与边界

复核 PR：

```bash
gh pr view 32 --repo zjgulai/mkt53 \
  --json url,isDraft,state,headRefOid,statusCheckRollup
```

若只撤销本批实现，在未 merge 的草稿分支上使用：

```bash
git revert 690fb9f0f1bfa7a269752c33fe6824a6fd65c507
git revert 212f7dc
```

保持顺序先撤销 Graphify 产物，再撤销实现。不要 force-push 或重写共享历史。当前没有部署，因此不需要 nginx、cron、数据库或静态目录的生产回滚。

## 7. 下一门与 TODO

1. 保持 PR #32 为 draft，等待人工 review 和明确的 merge 决策；
2. merge 与 deploy 分别授权，merge 不自动触发或授权生产发布；
3. 2026-08-01 09:00 后只读观察首次半月 cron 日志、run-report 和双路径哈希；
4. DATA-REG 等待六组真实 owner/source/SKU/legal/evidence/withdrawal 输入和独立法务授权；
5. backend、nginx、cron、数据库、provider/connector 生产动作继续保持独立门禁。

机器证据见 [`evidence/p0-full-codex-review-closeout-20260727.json`](./evidence/p0-full-codex-review-closeout-20260727.json)。
