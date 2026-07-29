---
title: BE-03 Source Registry 本地 API
doc_type: implementation-evidence
task_id: BE-03
status: local-validated
created: 2026-07-24
updated: 2026-07-24
owner: backend-and-data-governance
evidence_layer: L1-local-validation
provider_calls: false
production_reads: false
production_writes: false
production_deploy: false
business_data_writes: false
fact_promotion: false
---

# BE-03 Source Registry 本地 API

## 1. 结果

BE-03 已在 `backend/` 完成首个领域迁移与版本化 Source Registry API：来源的创建、读取、更新、撤回和审计均有显式合同；写操作使用 ETag/`If-Match` 防止静默覆盖，使用幂等键避免同一请求重复落库，审计事件在应用层和 PostgreSQL 层都禁止修改或删除。

这是一项 **L1 本地实现与隔离 PostgreSQL 验证**，不是生产上线。生产 `/#/data-source` 仍读取 `app/src/data/source-registry.ts` 的 53 条静态合同；本批没有 seed 这些条目，没有切换前端 adapter，没有修改生产 nginx/Compose/数据库/密钥，也没有调用真实 connector/provider。

## 2. API 合同

| 方法与路径 | 权限 | 合同 |
|---|---|---|
| `GET /api/v1/sources` | `source:read` | 默认排除已撤回来源；支持 module、verification status、分页筛选 |
| `GET /api/v1/sources/{id}` | `source:read` | 返回强 ETag：`"source:{id}:v{version}"` |
| `POST /api/v1/sources` | `source:write` | 必须提交 `Idempotency-Key`；成功为 201、version 1，并写 create audit |
| `PATCH /api/v1/sources/{id}` | `source:write` | 必须提交 `If-Match` 与 `Idempotency-Key`；成功递增 version 并写 update audit |
| `POST /api/v1/sources/{id}/withdraw` | `source:write` | 逻辑撤回，不物理删除；记录 reason/time 并写 withdraw audit |
| `GET /api/v1/sources/{id}/audit` | `source:read` | 按时间返回 actor、request id、idempotency key、before/after |

`analyst`、`reviewer`、`admin` 可读来源；只有 `reviewer`、`admin` 具有 `source:write`。现有 portal identity 仍是本地受信代理合同，未证明生产 portal 已提供可安全注入的主体与角色。

## 3. 并发与幂等语义

- PATCH/withdraw 缺少 `If-Match` 返回 428；版本不匹配返回 412。
- `sources.version` 同时配置为 SQLAlchemy `version_id_col`。即便两个事务先后读到同一版本，后提交的陈旧事务也会因更新行数为 0 而失败，不会覆盖先写结果。
- 幂等记录按 `actor + operation + idempotency key` 唯一。相同 payload 重放原始 status/body/ETag，并返回 `Idempotent-Replayed: true`；同一 key 换 payload 返回 409。
- 业务变更、audit event 与 idempotency record 在同一数据库事务提交；失败时整体回滚。
- 该实现采用每个请求一个 Session/事务的 unit-of-work，符合 [SQLAlchemy Session 基础合同](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)；乐观并发使用 [SQLAlchemy version counter](https://docs.sqlalchemy.org/en/20/orm/versioning.html)。

## 4. 数据模型与迁移

Alembic head 为 `0002_be03_source_registry`，在 BE-02 baseline 后新增：

| 表 | 责任 |
|---|---|
| `sources` | 静态 registry 的 22 个显式业务/治理字段，加 owner、lifecycle、version 和时间字段 |
| `audit_events` | append-only create/update/withdraw 事件及 before/after 快照 |
| `idempotency_records` | 请求 hash 与已提交响应，用于安全重放 |

应用层 SQLAlchemy event 拒绝 audit update/delete；PostgreSQL migration 另创建 `audit_events_append_only` trigger。隔离联调中直接执行 audit UPDATE 得到 `audit_events are append-only`，随后事件序列仍为 `create,update,withdraw`。

本批刻意不做静态 registry seed。首次 seed 仍需在后续单独任务中固定源文件 hash、53 条记录数、导入 hash、owner 映射和重复导入策略；不得把默认 owner 或示例输入伪装成真实治理责任人。

## 5. 新鲜验证

| 验证 | 结果 |
|---|---|
| `uv lock --check` | passed |
| Ruff format/lint | passed |
| Pytest | 43 passed |
| branch coverage | 93.74%，门槛 90% |
| Compose config | passed；published ports = 0 |
| Alembic/PostgreSQL | `0002_be03_source_registry` current |
| PostgreSQL API 生命周期 | version `1 → 2 → 3`；create/update/withdraw audit 完整 |
| 陈旧写 | HTTP 412；原记录未被覆盖 |
| 幂等重放 | HTTP 200；`Idempotent-Replayed: true`；无重复 audit |
| audit 防改 | PostgreSQL trigger 拒绝 UPDATE |
| isolated cleanup | containers=0；networks=0；test volume=0 |
| Graphify | 3,395 nodes / 5,419 edges / 261 communities；完整性告警为 0 |

FastAPI `TestClient` 仍产生一条 Starlette/httpx 迁移告警；它不影响本次结果，但应在依赖升级任务中按官方迁移路径处理，不应静默屏蔽。

## 6. 生产停止条件

- 不得将 `mkt53-api:be03-local`、fixture secret 或本地 Compose 直接用于生产。
- 不得在 API/PostgreSQL 添加 host/public port。
- 不得在真实 subject/role 注入、头清除、生产 secret、备份恢复和回滚均完成前启用生产 `/api/v1/sources`。
- 不得在 BE-06 前把 `/#/data-source` 从静态 canonical 切到此本地 API。
- 不得导入 53 条静态 registry，直到 owner 映射和确定性 seed 证据另行验收。
- 不得由此调用 connector/provider，或把 fixture/example 提升为业务事实。

## 7. 下一批建议

按路线图继续 `BE-04 local snapshot metadata`：新增不可变 snapshot metadata、可复算 hash、重复导入幂等和 source 绑定；仍只使用本地 fixture/隔离 PostgreSQL，不接真实连接器、不导入业务快照、不切换生产前端。

机器证据：[BE-03 本地 API 证据](../reviews/mkt53-project-review-20260722/evidence/be-03-source-registry-local-api-20260724.json)。
