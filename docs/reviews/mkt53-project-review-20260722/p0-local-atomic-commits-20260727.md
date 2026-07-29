---
title: Batch 26 本地原子提交、复审修复与交接
status: local-committed-not-pushed-not-deployed
created: 2026-07-27
updated: 2026-07-27
owner: engineering
source: git+local-evidence+codex-review
---

# Batch 26：本地原子提交、复审修复与交接

## 1. 结果

本批已把 Batch 01–26 的实现按 concern 精确 stage，形成 9 个本地实现/图谱提交；本文件、路线图、总复盘 HTML 和机器证据作为第 10 个 docs 提交交付。当前仍停在本地分支，没有 push、PR、部署或生产变更。

最终本地质量结论：

- 前端 release evidence：8/8，23 files / 182 tests，Chrome E2E 150/150；
- 依赖：`npm audit` 0 vulnerabilities；
- build：2,383 modules；bundle budget 77/77，0 temporary exception；
- 数据：43 pages / 107 tables / 53 sources / 0 issues；888 claims / 0 high-risk / 0 unsupported；
- 后端：64/64、92.73% coverage，BE-07 隔离恢复通过且残留 0；
- Graphify：4,546 nodes / 7,204 edges / 346 communities，integrity defects 0。

## 2. 原子提交清单

| 顺序 | 提交 | concern | 核心结果 |
|---:|---|---|---|
| 1 | `4a0e44e` | DataManage / bundle | 拆分领域 catalog，退出临时 bundle 例外 |
| 2 | `e08f270` | source governance | 53 条来源治理合同显式化 |
| 3 | `cac2884` | BE-01–07 | identity/RBAC、registry、snapshot、review、recovery 本地链 |
| 4 | `aa23dc7` | DATA-REG | intake、synthetic projection、review handoff fail closed |
| 5 | `09dee22` | ops | release evidence、恢复候选、portal gate 与 SSH/cron 合同 |
| 6 | `beb8ddb` | dependency | Router 8、React 19.2.8、ESLint 10、audit 0 |
| 7 | `e9a4b0a` | Graphify | 项目 skill/hook 与 canonical 图谱 |
| 8 | `d3fb8c4` | review fixes | 关闭 5 项证据与生产 smoke fail-closed 缺陷 |
| 9 | `19b3ab0` | Graphify refresh | 图谱绑定治理修复提交并再次重聚类 |
| 10 | `docs(review): publish Batch 01-26 atomic handoff` | docs | 本文件、机器证据、路线图、HTML 和手册；SHA 为包含本文件的提交 |

所有提交都位于 `codex/mkt53-release-candidate-20260630`，相对于远端同名分支基线 `0d44c332`。未重写共享历史。

## 3. `codex-review` 发现与处置

全分支 review 范围过宽，但在停止前已通过可执行复现确认 5 类问题：

1. `official-source-snapshot` 只检查 `https://`，伪权威 host、绝对证据路径和无效生效日期仍可被标为可发布；
2. public manual evidence 只提交一行 `decision` 也会被判为问卷完整；
3. source-gap owner intake 删除必填问题后仍可能通过，因为 validator 信任剩余行数；
4. customs adapter 把上游实际 `networkCalls` / `businessDataWrites` 硬编码为 0；
5. `smoke-prod.sh` 接受未授权请求返回 200，无法识别 portal auth 被意外关闭。

`d3fb8c4` 已完成对应修复和回归测试。修复提交的定向 `codex review --commit d3fb8c4` 因 Codex 外部用量额度耗尽被中断，因此本批不声明二次自动复审 clean；测试、静态审计和人工 diff 复核仍完整通过。

## 4. 使用与验证

前端完整候选：

```bash
cd app
MKT53_E2E_BROWSER_CHANNEL=chrome MKT53_E2E_REUSE_EXISTING=0 \
  npm run quality:release-evidence
```

后端隔离门：

```bash
cd backend
uv sync --frozen
./scripts/quality-be07.sh
```

Graphify：

```bash
graphify update .
graphify cluster-only . --min-community-size=0
graphify diagnose multigraph --json
```

生产 smoke 合同现在要求所有未授权 root/deep route 均返回 apex login 302。只有在单独取得生产验证授权并具备有效 SSH key 后，才能运行 `npm run smoke:prod`；本批没有运行该生产命令。

## 5. 回滚

本地或 push 后均使用非破坏性的 `git revert`，从最新 concern 逆序处理：

1. 先 revert docs 提交；
2. 再按需 revert `19b3ab0`、`d3fb8c4`；
3. 继续按 `e9a4b0a` → `4a0e44e` 逆序回滚。

不要使用 `git reset --hard`、force-push 或把静态 app 回滚扩展为 nginx、cron、数据库、backend 的生产回滚。当前没有发生部署，因此没有生产状态需要恢复。

## 6. 下一门

1. 独立取得 push 授权；
2. 运行真实 GitHub-hosted app/backend CI；
3. Codex 额度恢复后重试修复提交和最终 docs 的定向 review；
4. 2026-08-01 09:00 后只读观察首次半月 cron 日志、run-report 和哈希；
5. DATA-REG 等待 6 组真实输入与独立法务授权，当前仍为 0/6；
6. deploy、backend、nginx、cron、数据库、provider/connector 均继续使用独立授权门。
