---
title: BE-04 Snapshot Metadata 本地 API
doc_type: implementation-evidence
task_id: BE-04
status: local-validated
created: 2026-07-24
updated: 2026-07-24
owner: backend-and-data-engineering
evidence_layer: L1-local-validation
provider_calls: false
connector_calls: false
production_reads: false
production_writes: false
production_deploy: false
business_data_writes: false
artifact_uploads: false
fact_promotion: false
---

# BE-04 Snapshot Metadata 本地 API

## 1. 结果

BE-04 已在 `backend/` 完成不可变 Snapshot Metadata：每个快照绑定一个 active source，显式记录数据窗口、row count、artifact URI/size/SHA-256、schema version/SHA-256、采集时间和导入主体；服务端按固定 canonical v1 合同生成可独立复算的 `metadataSha256`。精确重复导入返回既有快照，不创建第二条 snapshot 或 audit。

这是一项 **L1 本地实现与隔离 PostgreSQL 验证**，不是生产上线。本批只使用两个小型 fixture 复算 hash，没有 seed 53 条静态 source，没有上传或读取真实业务 artifact，没有接 connector/object store/provider，没有切换生产前端，也没有修改生产 nginx、Compose、数据库或密钥。

## 2. API 合同

| 方法与路径 | 权限 | 合同 |
|---|---|---|
| `GET /api/v1/snapshots` | `snapshot:read` | 支持 source、schema version、重叠 window 和分页筛选 |
| `GET /api/v1/snapshots/{id}` | `snapshot:read` | 返回不可变 metadata 与基于 metadata hash 的强 ETag |
| `POST /api/v1/snapshots` | `snapshot:write` | 要求 active source 和 `Idempotency-Key`；首次创建 201，精确重复为既有记录 200 |
| `GET /api/v1/snapshots/{id}/audit` | `snapshot:read` | 返回 append-only create audit |

没有 snapshot PATCH/PUT/DELETE 路由。`analyst`、`reviewer`、`admin` 可读；只有 `reviewer`、`admin` 具有 `snapshot:write`。

## 3. Hash 与重复导入合同

### 3.1 Artifact hash

`artifactSha256` 与 `schemaSha256` 是 metadata producer 提交的 64 位小写 SHA-256。测试从 `backend/tests/fixtures/snapshots/` 的真实 bytes 独立复算后提交，证明本地算法和字段合同一致。

BE-04 不读取 artifact URI 指向的对象，因此 **不能**把已存储的 `artifactSha256` 描述为生产对象已核验。未来真实导入必须由授权 importer/object-store adapter 读取 bytes、计算 hash 并留下对象版本和读取证据。

### 3.2 Canonical metadata hash

`metadata_hash_version = mkt53.snapshot-metadata.v1`。服务端对下列 camelCase JSON 字段按 UTF-8、key 排序、无多余空格序列化后计算 SHA-256：

`artifactSha256`、`artifactSizeBytes`、`artifactUri`、`collectedAt`、`contentType`、`hashVersion`、`rowCount`、`schemaSha256`、`schemaVersion`、`sourceId`、`windowEnd`、`windowStart`。

snapshot id、actor 和 server import time 不进入 metadata hash，因此相同 metadata 即使换请求 id，也只对应一个 canonical snapshot 内容。

### 3.3 幂等与冲突

- 同一 actor/operation/idempotency key、相同 payload：重放原始 status/body/ETag。
- 同一 key 换 payload：409 `idempotency_key_reused_with_different_payload`。
- 同一 snapshot id、不同 metadata：409 `snapshot_id_conflict`。
- 同一 source + artifact SHA + schema version、metadata 不一致：409 `snapshot_fingerprint_conflict`。
- 精确重复 metadata 使用新 key：返回既有 snapshot 200、`Idempotent-Replayed: true`，audit 数仍为 1。

## 4. 数据库不可变性

Alembic head 为 `0003_be04_snapshot_metadata`，新增 `snapshots`：

- `source_id` 外键 `sources.id`，`ON DELETE RESTRICT`；新导入还要求 source lifecycle 为 active。
- window 顺序、row count、artifact size、三个 hash 长度均有数据库约束。
- `(source_id, artifact_sha256, schema_version)` 与 `metadata_sha256` 唯一。
- ORM `before_update/before_delete` 拒绝变更。
- PostgreSQL `snapshots_immutable` trigger 拒绝直接 UPDATE/DELETE。
- `idempotency_records.operation` 从 64 扩为 256，避免长 source/snapshot id 使 operation 截断或落库失败。

## 5. 新鲜验证

| 验证 | 结果 |
|---|---|
| `uv lock --check` | passed |
| Ruff format/lint | passed |
| Pytest | 48 passed |
| branch coverage | 92.25%，门槛 90% |
| Compose config | passed；published ports = 0 |
| Alembic/PostgreSQL | `0003_be04_snapshot_metadata` current |
| PostgreSQL API 生命周期 | source=1；snapshot=1；snapshot audit=1 |
| metadata hash | fixture bytes 与独立 canonical JSON 复算通过 |
| 重复导入 | 原 key 201 replay；新 key 200 existing；无重复 audit |
| snapshot 写面 | PATCH 405；ORM update/delete 拒绝 |
| 数据库防改 | PostgreSQL trigger 拒绝直接 UPDATE |
| isolated cleanup | containers=0；networks=0；test volume=0 |
| Graphify | 3,481 nodes / 5,645 edges / 266 communities；missing/dangling endpoints、self-loops、exact duplicate/collapsed edges 均为 0；38 个 JSON/config 源文件为 zero-AST-node 可见性限制 |

FastAPI `TestClient` 仍有一条 Starlette/httpx 迁移告警；它不影响本次结果，但应在依赖升级任务中按官方路径处理，不应屏蔽。

## 6. 生产停止条件

- 不得将 `mkt53-api:be04-local`、fixture secret 或本地 Compose 直接用于生产。
- 不得将 producer 提交的 artifact hash 写成生产对象已读取/核验。
- 不得导入真实业务 snapshot，直到 object store/importer、隐私、保留期和授权合同独立验收。
- 不得在真实 portal subject/role 注入、生产 secret、备份恢复和回滚就绪前启用生产 `/api/v1/snapshots`。
- 不得在 BE-06 前切换生产数据源页面；不得由此调用 connector/provider 或提升 fixture 为业务事实。

## 7. 下一批建议

按路线图继续 `BE-05 local review state machine`：为 source/snapshot 建立 pending → approved/rejected/withdrawn 的合法状态迁移、actor/reason/time 与 append-only review log；仍只用本地 fixture/隔离 PostgreSQL，不审批真实业务事实、不激活生产 API。

机器证据：[BE-04 本地 API 证据](../reviews/mkt53-project-review-20260722/evidence/be-04-snapshot-metadata-local-api-20260724.json)。
