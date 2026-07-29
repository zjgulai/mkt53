---
title: BE-05 本地 Review 状态机
doc_type: architecture
module: backend
topic: review-state-machine
status: local-validated-not-deployed
created: 2026-07-24
updated: 2026-07-24
owner: backend+data-governance
source: code+local-evidence
---

# BE-05 本地 Review 状态机

## 1. 结论与边界

BE-05 已在 `backend/` 完成 source/snapshot review 状态机。每个新 source 或 snapshot 会在同一数据库事务中创建一个 `pending` review；review current state 与不可变 review event 分表存储，因此审批变化不会修改 Snapshot Metadata 本体。

这是一项 **L1 本地实现与隔离 PostgreSQL 验证**，不是生产上线。本批只审批本地 fixture/synthetic smoke 对象，没有 seed 53 条生产静态 registry，没有上传或读取真实 artifact，没有调用 connector/object store/provider，没有切换生产前端，也没有修改生产 nginx、Compose、数据库或密钥。测试中的 `approved` 只证明状态机工作，不代表业务事实获批。

## 2. 状态合同

| 当前状态 | 合法目标 | 说明 |
|---|---|---|
| `pending` | `approved`、`rejected`、`withdrawn` | 首次人工决定或直接撤回 |
| `approved` | `withdrawn` | 可撤回已批准决定，不允许静默改判 rejected |
| `rejected` | `withdrawn` | 可撤回已拒绝对象，不允许静默改判 approved |
| `withdrawn` | 无 | 终态 |

API 对非法跳转返回 409 `illegal_review_transition`。source 的既有 `lifecycleStatus` 与 review decision 是不同合同；BE-05 不通过审批 API 隐式修改 source 生命周期，也不修改 snapshot 元数据。

source 本体可更新，因此 BE-05 额外定义两条只由 source mutation 触发的联动规则：更新 source 元数据时，已 approved/rejected/withdrawn 的 review 在同一事务自动重开为 pending；撤回 source 生命周期时，review 在同一事务同步为 withdrawn。联动 event 复用 source mutation 的 actor、reason/requestId/idempotencyKey，避免旧 approval 继续覆盖已变化的 source 内容。pending source 更新不会制造 pending→pending 噪声事件。

## 3. 数据模型与迁移

- `review_subjects`：`entityType + entityId` 唯一，保存 current state、version、createdAt、updatedAt。
- `review_events`：保存 from/to state、actor、reason、requestId、idempotencyKey、occurredAt。
- ReviewSubject 使用 SQLAlchemy version column，避免并发 reviewer 静默覆盖。
- Source mutation 与 review invalidation/withdrawal 共用一个数据库事务，任何一侧失败都会整体回滚。
- ReviewEvent 在 ORM `before_update/before_delete` 和 PostgreSQL `review_events_append_only` trigger 两层拒绝改写。
- Alembic `0004_be05_review_state_machine` 会把升级前既有 source/snapshot 确定性回填为 `pending v1`，并写入 actor 为 `system:migration:0004` 的明确 backfill event。

## 4. API 与权限

| Endpoint | 权限与合同 |
|---|---|
| `GET /api/v1/reviews` | `review:read`；按 entityType/state 过滤与分页 |
| `GET /api/v1/reviews/{entityType}/{entityId}` | `review:read`；返回 strong version ETag |
| `POST /api/v1/reviews/{entityType}/{entityId}/transitions` | `review:write`；强制 Idempotency-Key 与当前 If-Match |
| `GET /api/v1/reviews/{entityType}/{entityId}/events` | `review:read`；按时间返回 append-only log |

`analyst/reviewer/admin` 拥有 `review:read`，仅 `reviewer/admin` 拥有 `review:write`。viewer 无 review 读取权限；analyst 写入返回 403。

## 5. 幂等与并发

- Review ETag 格式：`"review:{entityType}:{entityId}:v{version}"`。
- 缺失 `If-Match` 返回 428，stale ETag 返回 412。
- transition operation 为 `review-transition:{entityType}:{entityId}`。
- 相同 actor/operation/key/payload 重放原响应，并返回 `Idempotent-Replayed: true`，不新增 review event。
- 同一 key 更换 payload 返回 409。
- 两个 session 同时基于 v1 决策时，先提交者升级到 v2，后提交者由 version column 拒绝并映射为 412。

## 6. 新鲜验证

| 验证 | 结果 |
|---|---|
| `uv lock --check` | passed |
| Ruff format/lint | passed |
| Pytest | 56 passed |
| branch coverage | 92.60%，门槛 90% |
| Compose config | passed；published ports = 0 |
| Alembic/PostgreSQL | `0004_be05_review_state_machine` current |
| PostgreSQL API 生命周期 | source=1；snapshot=1；review subjects=2；正常决策/联动 event=7 |
| 状态迁移 | source pending→approved→pending（metadata update）→withdrawn（lifecycle withdraw）；snapshot pending→rejected→withdrawn |
| 幂等/非法迁移 | approve replay 200 且无重复 event；rejected→approved 返回 409 |
| append-only | ORM update/delete 与 PostgreSQL direct UPDATE 均被拒绝 |
| migration backfill | downgrade→upgrade 后 2 个既有对象均为 pending v1，2 条 migration open event |
| isolated cleanup | containers=0；networks=0；test volume=0 |
| Graphify | 3,581 nodes / 5,959 edges / 275 communities；missing/dangling endpoints、self-loops、exact duplicate/collapsed edges 均为 0；39 个 JSON/config 源文件为 zero-AST-node 可见性限制 |

FastAPI `TestClient` 仍有一条 Starlette/httpx 迁移告警；它不影响本批结果，但应在依赖升级任务中按官方路径处理，不应屏蔽。

## 7. 生产停止条件

- 不得将 `mkt53-api:be05-local`、fixture secret 或本地 Compose 直接用于生产。
- 不得把本地 fixture 的 approved/rejected 写成业务 owner、法务或生产发布决定。
- 不得在真实 portal subject/role 注入、生产 secret、备份恢复和回滚就绪前启用生产 review API。
- 不得在 BE-06 独立验收前切换生产数据来源页面；读取失败不得回退成“已验证”。
- 不得由 review 状态机调用 connector/provider、上传 artifact 或写真实业务数据。

## 8. 下一批建议

按路线图继续 `BE-06 local data-source API adapter`：只在本地增加 API adapter 与 loading/error/empty/offline 状态，保持生产静态 registry 为 canonical；先验证失败态不伪装成 verified，再另行申请生产切换授权。

机器证据：[BE-05 本地 API 证据](../reviews/mkt53-project-review-20260722/evidence/be-05-review-state-machine-local-api-20260724.json)。
