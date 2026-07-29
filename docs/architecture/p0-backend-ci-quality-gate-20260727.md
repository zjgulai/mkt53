# Batch 25：P0 后端 CI 质量门禁

> 状态：本地实现与等价门禁验证完成；尚未 stage、commit、push 或触发 GitHub 托管 runner
> 日期：2026-07-27
> 范围：`.github/workflows/quality-gate.yml`、`backend/tests/test_ci_workflow_contract.py`、质量门禁文档
> 证据等级：L1 本地 CI-equivalent + L2 fixture recovery

## 1. 目标与结论

Batch 24 识别的 `BACKEND-CI` 硬前置已在工作树中关闭：`quality-gate` 现在包含独立的 `backend` job，与静态 app job 并行。它固定后端运行时和 lock，执行完整 `quality-be07.sh`，并保留恢复演练的 report/cleanup 证据。

这不是 GitHub runner 绿灯或生产后端证明。当前只验证了 workflow 结构、合同测试和本机等价执行；只有分支 push 后实际 Actions 运行通过，才能声称远端 CI 通过。后端仍未生产激活。

## 2. 设计逻辑

### 2.1 独立失败域

`app` 与 `backend` 不使用串行依赖。任一 job 失败都能单独定位，并共同构成合并门：

```text
push / pull_request to main
├── app: npm ci → Chromium → release evidence 8/8
└── backend: uv frozen sync → BE-07 → recovery artifacts
```

后端失败不会被前端成功掩盖，也不会让长时间的 E2E 阻塞后端开始。

### 2.2 可复现运行时

| 项 | 固定值 | 原因 |
|---|---|---|
| runner | `ubuntu-latest` | 完整托管 VM，提供 Docker 能力 |
| Python | `3.12.13` | 与 `uv.lock` 和本地已验证运行时一致 |
| uv | `0.11.11` | 与本地通过的 BE-07 工具链一致 |
| setup action | 完整 commit SHA，注释 `v9.0.0` | 防止浮动 tag 静默变化 |
| dependency input | `backend/uv.lock` | 缓存和 frozen sync 使用同一锁文件 |

不设置 job 级 `UV_FROZEN=1`。该环境变量会让 `uv lock --check` 只验证 lock 语法、跳过与项目元数据的新鲜度比较；因此仅对依赖同步显式使用 `uv sync --frozen`，保留脚本中的 `uv lock --check` 强验证。

### 2.3 最小权限与零外部写入

工作流顶层只授予 `contents: read`。backend job 没有 GitHub environment、SSH、rsync、deploy、crontab、生产 DSN 或 provider/connector secret。Docker 只由 `quality-be07.sh` 在本地 Unix/npipe endpoint 运行：

- 两个 Compose 网络都是 internal；
- 不发布宿主端口；
- 数据库名固定为显眼的测试名称；
- secret 来自 fixture-only 文件；
- 报告明确记录 production read/write、task install 和 provider calls 为 false/0；
- 结束后验证 containers/networks/volumes 残留为 0。

### 2.4 失败证据

artifact step 使用 `if: always()`，因此门禁失败后仍尝试上传：

```text
tmp/backend-recovery/be07/**/report.json
tmp/backend-recovery/be07/**/cleanup.json
```

`if-no-files-found: warn` 是有意设计：如果失败发生在创建报告前，artifact 缺失不应覆盖原始失败；如果 recovery 已启动，report/cleanup 可用于区分业务断言失败与资源清理失败。保留期为 14 天。

## 3. 永久合同测试

`backend/tests/test_ci_workflow_contract.py` 使用项目现有 PyYAML 解析 workflow，并固定：

- `contents: read`；
- backend runner、30 分钟超时和 `backend` working directory；
- setup-uv 的完整 SHA、uv/Python 版本和 lock 缓存；
- `uv sync --frozen` 与 `./scripts/quality-be07.sh`；
- recovery report/cleanup artifact 名称、路径与保留期；
- workflow 中不出现 SSH、rsync、deploy、cron、半月刷新或直接 `docker compose up`。

任何后续运行时升级必须同时更新 workflow、lock/本地验证证据和该合同测试；不能只修改浮动 tag。

## 4. 使用手册

### 本地聚焦检查

```bash
cd backend
uv run ruff format --check tests/test_ci_workflow_contract.py
uv run ruff check tests/test_ci_workflow_contract.py
uv run pytest tests/test_ci_workflow_contract.py -q
```

### 本地完整等价门禁

```bash
cd backend
uv sync --frozen
./scripts/quality-be07.sh
```

本次实测结果：

- 64 tests passed；
- total coverage 92.73%，阈值 90%；
- lock、format、lint、普通/恢复 Compose 合同通过；
- fixture backup/restore、fingerprint、withdrawal replay、append-only probes 通过；
- cleanup containers/networks/volumes = `0/0/0`；
- production DB read/write = false，provider/connector calls = 0。

### GitHub Actions 结果读取

1. 分别检查 `app` 与 `backend` job，不能只看总体图标；
2. backend 失败时先定位 `Run BE-07 backend quality gate`；
3. 下载 `mkt53-backend-be07-evidence`；
4. 检查 `report.json.status`、`scope`、`restoreVerification`、`recoveryObjectives`；
5. 检查 `cleanup.json` 或 report 内 cleanup 是否为零残留；
6. 若 artifact 缺失，回到日志找 lock、依赖、Docker 或预检阶段的首个错误。

## 5. 变更与升级规则

### Python / uv 升级

1. 更新 `pyproject.toml` 和 lock；
2. 本地 `uv sync --frozen`；
3. 完整运行 BE-07；
4. 更新 workflow 固定版本和合同测试；
5. 记录新运行时、测试、覆盖率和恢复证据。

### action 升级

1. 只使用上游官方仓库发布的 commit SHA；
2. 核对 release/tag 与 SHA；
3. 更新内联版本注释；
4. 运行合同测试；
5. 在真实 PR/push 后再确认托管 runner 结果。

### 失败处理

- lock 不新鲜：更新项目依赖/lock，不使用 job 级 frozen 环境变量掩盖；
- coverage 低于 90%：补测试或删除不可达代码，不降低阈值；
- Docker/镜像失败：区分 GitHub 基础设施与项目 Compose 合同；
- recovery 失败：先保留报告，再核对 cleanup，不能手工跳过恢复步骤；
- runner 时间超限：先画像 build、health wait、backup/restore 各阶段，不能删掉安全断言换速度。

## 6. 验收与剩余门

本批已完成：

- workflow backend job；
- 最小权限、固定运行时、frozen lock 与 artifact 合同；
- 2 项 CI workflow 合同测试；
- 本地完整 BE-07 回归；
- 文档与路线图同步。

仍未完成：

- GitHub-hosted runner 的真实 job 结果：需要未来 push/PR；
- patch-stage 与 8 个本地原子提交：需要独立 Git 写入授权；
- Commit 1–6 后按新 HEAD 重建 Graphify；
- push、PR 与 deploy：分别授权；
- backend 生产部署、数据库、nginx、身份注入、备份计划：不在本批范围。

机器证据见 `docs/reviews/mkt53-project-review-20260722/evidence/p0-backend-ci-quality-gate-20260727.json`。
