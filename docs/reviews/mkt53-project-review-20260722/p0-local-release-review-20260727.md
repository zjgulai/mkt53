# Batch 24：P0 本地发布复审与原子提交方案

> 状态：本地复审完成，Git handoff 未放行
> 日期：2026-07-27
> 分支：`codex/mkt53-release-candidate-20260630`
> 基线：`0d44c3329b759a7886a69e4333bf56917b60e948`
> 边界：未 stage、commit、push、deploy；未写生产、数据库、nginx、cron；未调用 provider 或 connector。
>
> Batch 25 补充：`BACKEND-CI` 已在当前工作树关闭并通过本地 CI-equivalent 门禁；本文件的 62-test 数据仍保留为 Batch 24 时间点证据。Git handoff 继续等待 Graphify 新 HEAD 和独立 Git 写入授权。
>
> Batch 26 补充：用户已授权本地 patch-stage 与 commit。实现、治理修复和 Graphify 共 9 个本地提交已完成；本文档与总复盘作为第 10 个 docs 提交交付。最终前端 release evidence 为 8/8（182 unit、150 E2E），BE-07 为 64/64、92.73%，Graphify 为 4,546 nodes / 7,204 edges / 346 communities、integrity defects 0。未 push、未部署、未写生产。

## 1. 复审结论

Batch 01–23 的候选变更可以追溯到 2026-07-22 启动的 Graphify、全项目复盘和后续连续执行链；起点工作树为 clean，本轮没有发现需要隔离为未知用户改动的文件。当前候选跨越数据治理、后端、法规门禁、运维、依赖、Graphify 和文档多个关注点，不能使用 `git add -A` 合并提交。

代码与安全复审没有发现已接受的可执行缺陷：

- `codex-review` 对 uncommitted worktree 的结果为 `clean: no accepted/actionable findings reported`。
- 高置信敏感信息模式没有命中私钥、AWS key、GitHub token、OpenAI key 或 Slack token。
- `DDDD.pem`、真实 secrets、依赖、构建和本地恢复产物均保持 ignored。
- 后端 BE-07 本地质量门通过；恢复演练只使用 fixture 和隔离 PostgreSQL。

Git handoff 仍未放行，原因是：

1. `.github/workflows/quality-gate.yml` 还没有覆盖 BE-03–07 的 backend job；
2. Graphify 报告仍记录基线 HEAD，必须在代码提交后重新生成；
3. stage / commit、push 和 deploy 分别需要独立授权。

第一次聚合运行在 E2E 退出诊断中被终止，正确返回 7/8，未被接受为成功证据；随后独立 E2E 150/150 通过，最终不受干预的聚合重跑恢复为 8/8。聚合 E2E 1,403,478ms 与独立运行 6.3 分钟之间的时长差异保留为 QA runtime determinism 债务，不阻断本次代码结论。

## 2. 工作树归属

复审起点：

| 项 | 数量或状态 | 结论 |
|---|---:|---|
| tracked modified | 46 | 全部属于当前连续执行链 |
| untracked candidate | 161 | Graphify、Batch 01–23、架构/复盘和机器证据 |
| staged | 0 | 保持不变 |
| tracked diff | +807 / -2,561 | 大量删除来自 DataManage 领域拆分 |
| HEAD / origin | `0d44c33` / 一致 | 本地复审不需要 rebase |

明确排除：

- `*.pem`、`private/`、`configs/private/`、`backend/secrets/`；
- `node_modules/`、`dist/`、`tmp/`、`.venv/`、coverage、cache、pyc；
- Graphify cache、memory、reflections、日期快照和本地解释器。

## 3. 质量与安全证据

### 前端

- fresh 聚合 release evidence：8/8，`localCandidateReady=true`；
- unit 23 files / 179 tests、lint、dependency audit、build、bundle budget、数据一致性和 deep audit：全部通过；
- 独立 Chrome desktop/mobile E2E：150/150 通过，真实退出码为 0，耗时 6.3 分钟；
- `npm audit`：0 vulnerabilities；
- build：2,383 modules；
- bundle：77/77 通过，0 temporary exception；
- 数据合同：43 pages / 107 tables / 53 sources；deep audit 888 claims。
- 聚合 E2E：150/150，1,403,478ms；聚合证据 SHA-256 为 `e7adff411201eaf2128dc30a0b5bba746703ff33012e92cef571485a15d1861f`。

### 后端

- `./scripts/quality-be07.sh`：62 tests 通过；
- total coverage：92.73%；
- Starlette/httpx TestClient 有 1 条迁移 warning，不阻断本批；
- BE-07 隔离恢复：baseline fingerprint 匹配、撤回精确重放、append-only update/delete 全部拒绝；
- RPO 4.838633s / 目标 86,400s；RTO 12.869051s / 目标 14,400s；
- 演练结束 containers / networks / volumes 残留均为 0；
- `productionDatabaseRead=false`、`productionDatabaseWrite=false`、`providerOrConnectorCalls=0`。

### 非阻断证据债务

- `ds-015`、`ds-018` 为 `manual-required + L1` 且沿用既有已复核展示语义，但缺 `sourceUrl` 或持久化 `evidenceArtifactPath`；后续 owner 复核应补齐。
- TestClient 迁移 warning 应在后续后端依赖批次消除。

## 4. 八个原子提交

| 顺序 | 建议提交 | 范围 | 关键门禁 |
|---:|---|---|---|
| 1 | `perf(data): split DataManage and enforce bundle budgets` | DataManage 领域拆分、route-aware chunk、永久 bundle 预算、deep audit 覆盖 | 定向测试、lint、build、77/77 bundle、两层数据审计 |
| 2 | `feat(data): make source governance contracts explicit` | 53/53 source 显式治理字段、DataSource 去运行时推断 | source contract、两层数据审计 |
| 3 | `feat(backend): add governed registry review and recovery APIs` | BE-01–07、前端只读 adapter、后端架构与证据 | **先补 backend CI**；BE-07、adapter/page tests |
| 4 | `feat(regulation): add fail-closed intake and review handoff` | DATA-REG contract、0/6 intake、synthetic projection、review handoff | 法规专项测试；空 intake 必须 fail closed |
| 5 | `feat(ops): add release recovery and portal gate evidence` | release evidence、P0-04 recovery、P0-05 candidate、SSH/cron/发布合同 | 只做本地/隔离验证，不运行 SSH、rsync、crontab、deploy |
| 6 | `fix(deps): close frontend dependency advisories` | Router 8、React 19.2.8、ESLint 10、PostCSS 8.5.23、lockfile、E2E browser contract | `npm ci`、audit 0、179 unit、lint、build、150 E2E |
| 7 | `chore(graphify): add project knowledge graph tooling` | 项目 skill/hook 与 6 个 canonical 图谱文件 | Commit 1–6 后重建；报告 HEAD 必须等于新 HEAD；integrity 0 |
| 8 | `docs(review): publish Batch 01–24 closeout and handoff` | AGENTS、路线图、复盘 HTML、机器证据、使用手册 | 链接/锚点/桌面移动渲染；证据等级边界清晰 |

混合文件必须使用 `git add -p` 拆 hunk，重点包括：

- `app/package.json`
- `AGENTS.md`
- `app/src/pages/DataSourcePage.tsx`
- `app/tests/scripts/release-quality-gates.test.ts`
- `app/tests/scripts/static-scripts.test.ts`
- `app/tests/e2e/core-pages.spec.ts`
- `.gitignore`

禁止 `git add -A`、`git add .`、`git commit -am`、`git reset --hard`、`git checkout --` 和 `git clean`。

## 5. 提交、推送和发布门

### 每个本地提交前

1. 精确 patch-stage；
2. 检查 staged 文件列表、stat、完整 diff；
3. `git diff --cached --check`；
4. 对 staged diff 重跑敏感信息扫描；
5. 运行该 concern 的定向测试；
6. 失败时只取消该次 index，不覆盖工作树。

### 八个提交完成后、push 前

1. 前端聚合 release evidence 8/8；
2. 后端 BE-07 质量门；
3. backend CI job 已加入并可在 push 后执行；
4. Graphify integrity 0，报告 HEAD 与新 HEAD 一致；
5. 对完整提交范围执行 `codex review --base`；
6. 取得独立 push 授权。

### deploy 前

1. GitHub app + backend CI 全绿；
2. 远端分支 SHA 与本地 HEAD 一致；
3. 静态 bundle、数据、nginx、cron、backend 分别列出差异和回滚；
4. 取得独立生产发布授权。

静态 app 发布授权不会自动包含 backend、nginx、cron、数据刷新或 provider/connector。

## 6. 回滚

- 本地提交：每个 concern 独立，可使用 `git revert <sha>`；不重写共享历史。
- push 前：停止即可，不产生外部状态。
- push 后、deploy 前：只处理 Git/PR，不触碰生产。
- 静态部署：使用既有 `/opt/mkt53/html/` 备份与 exact-SHA smoke。
- nginx：只使用 2026-07-24 root-only 完整备份合同，不能由本方案自动触发。
- backend：当前未部署；未来激活需单独提供数据库备份、迁移、网络和 nginx 回滚方案。

## 7. 下一执行 TODO

1. [x] 为 `.github/workflows/quality-gate.yml` 增加 backend CI job，并用合同测试保护；
2. [x] 取得本地 Git 写入授权后，按 concern 精确 stage 并完成 9 个实现/图谱提交；
3. [x] Commit 1–6 后重建 Graphify；治理复审修复后再次增量更新并提交 canonical 图谱；
4. [x] 完整前端 release evidence 8/8、BE-07、Graphify integrity 已通过；
5. [x] 初次全分支 review 复现 5 项 fail-closed 缺陷并完成修复；修复提交的定向自动复审因 Codex 外部额度耗尽被中断，未伪装为 clean；
6. [ ] push 前执行真实 GitHub-hosted app/backend CI；push 与 deploy 分别请求独立授权；
7. [ ] 2026-08-01 09:00 后只读观察首次 cron 运行证据；
8. [ ] DATA-REG 等待 6 组真实输入与独立法务授权，当前仍为 0/6。
