---
title: Batch 27 GitHub CI、定向复审修复与草稿 PR 交接
status: draft-pr-ci-green-not-merged-not-deployed
created: 2026-07-27
updated: 2026-07-27
owner: engineering
source: git+github-actions+codex-review
---

# Batch 27：GitHub CI、定向复审修复与草稿 PR 交接

## 1. 结果

本批已把 `codex/mkt53-release-candidate-20260630` 推送到 GitHub，并创建草稿 PR [#32](https://github.com/zjgulai/mkt53/pull/32)。PR 仍为 open/draft，没有 merge、部署或生产写入。

修复提交 `6674e0f` 对应的 GitHub Actions [run 30257673802](https://github.com/zjgulai/mkt53/actions/runs/30257673802) 已完成：

- app：success，release evidence 8/8；
- backend：success，64 tests / 92.73% coverage；
- app/backend annotations：`0/0`；
- 前端：23 files / 183 unit，audit 0，2,383 modules，77/77 bundle，150/150 Chrome E2E；
- 后端 L2 恢复：RPO 0.426246s、RTO 1.938102s，容器/网络/卷残留 `0/0/0`。

这些结果证明 GitHub-hosted 候选门禁通过，不证明 PR 已合并、应用已部署、后端已生产激活或生产数据已变化。

## 2. 本批修复

定向复审额外复现并关闭了四项缺口：

1. 严格校验真实日历日期和 ISO date-time，拒绝 `2026-02-30` 等不可能日期；
2. `required_question_count` 必须是正的十进制安全整数，不再接受 `1junk` 的数字前缀；
3. `ds-016` 以 `laws-lois.justice.gc.ca` 作为加拿大法规权威 host，TUV 只保留为二级来源，不能提升为 official；
4. backend job 的 uv cache glob 改为相对工作目录的 `uv.lock`，并由 CI 合同测试固定。

初始 GitHub run `30256791125` 的 app/backend 已通过，但 backend 出现 `backend/backend/uv.lock` 缓存告警。修复后的 run `30257673802` 两个 job 均无 annotation。

## 3. Review 结论

`codex review --commit d3fb8c4...` 复现了日期、问卷计数和权威 host 三组问题，均由 `6674e0f` 修复。

`codex review --commit 6674e0f...` 已检查 diff、官方 setup-uv 相对路径规则、日期边界、host policy，并复跑 88 项前端聚焦测试和 2 项 backend workflow 合同测试；在没有发出新 actionable finding 的情况下，审查器连续自调用出三层同命令进程。为避免无界重入，进程被终止。因此本批如实记录：

- 已完成定向人工/工具检查；
- 未收到新的 actionable finding；
- 自动审查没有正常结束；
- 不声明 `clean review`。

GitHub-hosted 质量门的成功与 Codex advisory review 是两类证据，前者不能替代后者的正常结束，后者的递归故障也不能抹去已完成的测试和 CI 结果。

## 4. 使用与复核

查看 PR 与状态：

```bash
gh pr view 32 --json url,isDraft,state,headRefOid,statusCheckRollup
```

查看修复提交的 GitHub-hosted 门禁：

```bash
gh run view 30257673802
gh run view 30257673802 --log
```

下载两类证据：

```bash
tmp_dir="$(mktemp -d)"
gh run download 30257673802 --dir "$tmp_dir"
jq . "$tmp_dir/mkt53-release-evidence/latest.json"
find "$tmp_dir/mkt53-backend-be07-evidence" -name report.json -o -name cleanup.json
```

本地聚焦回归：

```bash
cd app
npm test -- --run \
  tests/scripts/regulation-sku-contract.test.ts \
  tests/scripts/static-scripts.test.ts

cd ../backend
uv run --frozen pytest tests/test_ci_workflow_contract.py
```

## 5. 回滚

如果只需要撤销本批 review/CI 修复，在未 merge 的草稿分支上优先使用：

```bash
git revert 6674e0fd29897f00e7d75b4da8f93e56e725341b
```

不要 force-push 或重写共享历史。若决定放弃整个候选，关闭草稿 PR 即可；关闭 PR 不会删除远端分支，也不会改变生产。当前没有部署，因此不需要 nginx、cron、数据库或静态目录的生产回滚。

## 6. 下一门与 TODO

1. 保持 PR #32 为 draft，等待人工 review 和明确的 merge 决策；
2. 若继续要求 Codex clean 信号，先解决/规避 CLI 自递归，再运行一次有界的最终 HEAD review；
3. merge 与 deploy 分别授权，merge 不自动触发或授权生产发布；
4. 2026-08-01 09:00 后只读观察首次半月 cron 日志、run-report 和双路径哈希；
5. DATA-REG 继续等待六组真实 owner/source/SKU/legal/evidence/withdrawal 输入和独立法务授权；
6. backend、nginx、cron、数据库、provider/connector 生产动作继续保持独立门禁。

机器证据见 [`evidence/p0-github-ci-review-closeout-20260727.json`](./evidence/p0-github-ci-review-closeout-20260727.json)。
