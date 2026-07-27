# BE-07 审计与恢复隔离演练

日期：2026-07-24
状态：`done-local-l2`
证据层级：`L2-fixture-or-dry-run`

## 1. 结论

BE-07 已在本机 Docker 与两个隔离 PostgreSQL 数据库中完成逻辑备份、恢复、source 撤回、幂等重放以及 audit/review/snapshot 不可变控制演练。最终质量门实测 RPO 为 `0.816373s`，RTO 为 `3.006525s`，均低于 BE-01 暂定目标 `RPO ≤ 24h`、`RTO ≤ 4h`。

本结论只覆盖合成 fixture 与本地隔离资源，不表示生产数据库已备份、生产恢复已验证或生产定时备份已安装。

## 2. 隔离与 fail-closed 边界

- 只接受 `MKT53_APP_ENV=test`、Compose 主机名 `postgres`、用户 `mkt53`，以及数据库白名单 `mkt53_be07_source` / `mkt53_be07_restore`。
- Docker endpoint 只允许本机 Unix socket 或 named pipe；TCP/SSH/远程 context 直接拒绝。
- `edge` 与 `data` 两个演练网络均为 `internal: true`，所有服务保持零 host port。
- 每次运行使用唯一 Compose project、网络与 volume 名称；退出时执行 `down --volumes --remove-orphans`，报告生成前核对三类残留均为 0。
- 不读取或写入生产数据库，不修改生产 nginx/Compose/密钥/cron，不部署，不调用 connector/provider。
- 演练归档仅含合成 fixture，权限为 `0600`；它没有加密或离机复制，因此不能替代 BE-01 的生产备份合同。

## 3. 实现

| 文件 | 责任 |
|---|---|
| `backend/scripts/recovery-drill-be07.sh` | 校验本机 Docker、创建隔离资源、执行 dump/restore、计时、清理与报告汇总 |
| `backend/scripts/recovery_drill_be07.py` | 生成确定性 fixture、计算逻辑指纹、撤回/重放、恢复核对和数据库触发器负向探针 |
| `backend/compose.recovery-drill.yaml` | 关闭 restart，并把 edge 网络收紧为 internal |
| `backend/scripts/quality-be07.sh` | 串联 lock、format、lint、pytest/coverage、Compose 与完整恢复演练 |
| `backend/tests/test_recovery_drill.py` | 覆盖数据库白名单、fixture 状态机、幂等计数、探针矩阵、清理和脚本边界 |

后端版本更新为 `0.5.0-be07` / `mkt53-api:be07-local`；数据库 schema 仍为已验收的 Alembic head `0004_be05_review_state_machine`，BE-07 没有增加业务表或迁移。

## 4. 演练流程

1. 在空的 `mkt53_be07_source` 创建一条 source、一条 snapshot 和各自 review；create/approve 的精确重放均命中既有幂等记录。
2. 计算六张业务表的规范化 JSON 指纹，再用 `pg_dump --format custom --no-owner --no-acl` 生成 mode `0600` 的本地逻辑归档。
3. 备份完成后撤回 source，并使用原 idempotency key 精确重放；source audit 只出现 `create → withdraw`，review 只出现 `pending → approved → withdrawn`。
4. 将归档恢复到新的 `mkt53_be07_restore`，核对 Alembic revision、六表行数和规范化 SHA-256 与备份基线逐字一致。
5. 在恢复库重放 source/snapshot create 和两次 approve；四项均返回 replay，所有表计数不变。
6. 在恢复库再次撤回并重放，然后直接尝试 UPDATE/DELETE `audit_events`、`review_events` 与 `snapshots`；六项均由 PostgreSQL trigger 拒绝，失败前后指纹一致。
7. 删除演练 Compose 的容器、两个网络和 volume，核对残留为 `0/0/0` 后生成报告。

## 5. 最终实测证据

最终质量门 run：`be07-20260724t043838z-99547`。

| 项 | 结果 |
|---|---|
| archive | 26,163 bytes；SHA-256 `c91d990471f186bc58f589575b261c83f651951c51f9d60bd5cdb39efc70e263`；mode `0600` |
| dump duration | `0.449105s` |
| baseline fingerprint | `2f6523499191bbb88d4e4fb279d8cd5ace8e6bcdc881c72cfe5524901ff0bde3` |
| baseline counts | sources 1；snapshots 1；audit 2；reviews 2；review events 4；idempotency 4 |
| restore equality | revision current；baseline fingerprint matched；seed replay 后计数不变 |
| source withdrawal replay | 首次写入、第二次精确 replay；audit/review 各只新增 1 条 |
| append-only/immutable | audit/review/snapshot 的 UPDATE 与 DELETE 共 6/6 被拒绝 |
| RPO | `0.816373s / 86400s`，pass |
| RTO | `3.006525s / 14400s`，pass |
| cleanup | containers/networks/volumes = `0/0/0` |
| quality | 62 tests；92.73% coverage；Ruff、lock、Compose 全通过 |

原始本地报告保留在 `tmp/backend-recovery/be07/be07-20260724t043838z-99547/report.json`，完整自包含机器证据见 [BE-07 演练证据](../reviews/mkt53-project-review-20260722/evidence/be-07-audit-recovery-drill-20260724.json)。

## 6. 未覆盖与生产停止条件

- 没有读取生产数据库、生产日志、对象存储或真实业务快照。
- 没有安装每日备份任务、加密归档、离机复制、保留策略或告警。
- 没有验证生产数据规模、生产磁盘吞吐或灾难场景下的 RPO/RTO。
- 在真实 portal identity、生产 secret、主机容量、备份目的地和独立生产授权齐备前，不得部署后端或切换生产 adapter。

## 7. 下一批建议

Phase 1 本地闭环已经完成。下一项安全任务是 `DATA-REG contract-only discovery`：只盘点现有法规页面/registry 与本地需求，先定义法规条款、适用范围、SKU decision、reviewer 和 disclosure 的字段合同及 fixture 验证；在法务 owner、官方来源采集范围和复核流程确认前，不采集或发布新的法规事实，也不自动给法律结论。
