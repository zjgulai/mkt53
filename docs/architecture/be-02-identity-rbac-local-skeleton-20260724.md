---
title: BE-02 身份与 RBAC 本地骨架
doc_type: implementation-evidence
task_id: BE-02
status: local-validated
created: 2026-07-24
updated: 2026-07-24
owner: backend-and-security
evidence_layer: L1-local-validation
provider_calls: false
production_reads: false
production_writes: false
production_deploy: false
business_data_writes: false
fact_promotion: false
---

# BE-02 身份与 RBAC 本地骨架

## 1. 结果

BE-02 已在 `backend/` 建立可运行、可测试、可回收的本地后端骨架：FastAPI API、portal identity fixture、四角色 RBAC、fail-closed 配置、PostgreSQL 17、显式 Alembic 迁移和独立 Compose 网络边界均已通过本地质量门与一次性容器联调。

这是一项 **L1 本地实现证据**，不是生产后端上线。当前生产仍由静态 React/Vite 应用承担 canonical 读取；没有修改共享 nginx、生产 Compose、服务器网络、数据库或真实密钥。

## 2. 已实现合同

### 2.1 API 与健康检查

| 路径 | 身份要求 | 当前责任 |
|---|---|---|
| `/internal/health/live` | internal only | 只证明 API 进程存活，不访问数据库 |
| `/internal/health/ready` | internal only | 校验 PostgreSQL 连通性和 Alembic revision；错误详情被脱敏 |
| `/api/v1/health` | `health:read` | 返回服务版本、环境和 redacted readiness |
| `/api/v1/authz/me` | `health:read` | 返回受信主体、角色和权限 |
| `/api/v1/authz/write-probe` | `review:write` | 只验证授权矩阵，固定 `side_effects=false`，不写业务数据 |

生产模式关闭 `/docs`、`/redoc` 和 `/openapi.json`。所有响应返回 `private, no-store` 与校验后的 request id；readiness 不返回数据库主机、密码或底层异常文本。

### 2.2 Portal identity fixture

API 只有在以下三项同时成立时才建立 `Principal`：

1. `X-Mkt53-Proxy-Token` 与服务端只读 secret file 相符。
2. `X-Portal-Subject` 存在并满足稳定主体格式。
3. `X-Portal-Roles` 至少包含一个已知角色。

仅提交 `X-Portal-Subject` 或 `X-Portal-Roles` 不足以伪造身份。缺少或伪造 trusted-proxy token、缺少主体均返回 401；角色缺失、未知或权限不足返回 403。

该 fixture 固定了 API 期待的服务端合同，但没有证明现有生产 portal-auth 已输出主体/角色。生产候选仍须由 nginx 清除客户端提交的三个同名头，再从受信 auth 路径注入；在真实正负向验收前不得开放生产写 API。

### 2.3 RBAC

| 角色 | `health:read` | `source:read` | `snapshot:read` | `review:write` | `admin:*` |
|---|---:|---:|---:|---:|---:|
| `viewer` | yes | no | no | no | no |
| `analyst` | yes | yes | yes | no | no |
| `reviewer` | yes | yes | yes | yes | no |
| `admin` | yes | yes | yes | yes | yes |

BE-02 没有新增真正的写业务路由。`write-probe` 的 200 只代表 reviewer/admin 授权判定成功，不代表数据库写入或 review 状态机已经实现。

## 3. 配置与供应链边界

- Python 固定为 `3.12.13` 系列，运行依赖由 `uv.lock` 与 `requirements.lock` 精确锁定。
- API 基础镜像固定为 `python:3.12.13-slim-bookworm@sha256:d50fb7…aa30b`。
- PostgreSQL 固定为 `postgres:17.10-bookworm@sha256:4f736a…b394`。
- test/dev/prod 使用同一配置模型；production 会拒绝 debug、dev identity、fixture/default secret、非 HTTPS 或非 mkt53 origin 的 CORS。
- database password 与 trusted-proxy token 只从 `/run/secrets` 文件读取；Compose 联调确认二者没有进入容器环境变量。
- fixture secrets 位于 `backend/tests/fixtures/secrets/`，名称和值均明确只供本地测试；production 模式会拒绝这些值。

## 4. Compose 与迁移边界

本地 Compose 只包含 `postgres`、一次性 `migrate` 和 `api`：

- 没有任何 `ports:`；API 的 `8000/tcp` 与 PostgreSQL 的 `5432/tcp` 均没有 host binding。
- `postgres` 只加入 internal `data` 网络；`api` 同时加入 `edge` 与 `data`。
- `migrate` 在数据库 healthy 后显式执行 `alembic upgrade head`，成功后 API 才启动。
- API/migrate 使用 read-only root filesystem、`cap_drop: ALL`、`no-new-privileges:true` 和受限 tmpfs。
- BE-02 baseline revision 为 `0001_be02_baseline`，只建立迁移链，不创建领域表；`sources` 首个 schema 归 BE-03。

一次性联调使用独立项目、网络和 volume 名称 `mkt53_be02_*_20260724`，验证完成后容器、网络和测试卷均已删除；没有影响正在运行的其他 Docker 项目。

## 5. 新鲜验证

| 验证 | 结果 |
|---|---|
| `uv lock --check` | passed |
| Ruff format/lint | passed |
| Pytest | 36 passed |
| branch coverage | 95.81%，门槛 90% |
| Compose config | passed；published ports = 0 |
| Alembic | `0001_be02_baseline (head)` |
| internal live / ready | 200 / 200 |
| missing identity / wrong proxy token | 401 / 401 |
| viewer identity / viewer write probe | 200 / 403 |
| reviewer write probe | 200；`side_effects=false` |
| secret placement | files=true；password/token env=false |
| isolated cleanup | containers=0；networks=0；test volumes=0 |

FastAPI `TestClient` 当前产生一条 Starlette 的 httpx 迁移告警，但不影响测试结果；后续依赖升级时应迁移到官方建议的新测试客户端并重新冻结 lock，而不是屏蔽告警。

## 6. 生产停止条件

- 不得把 fixture secret、local image 或本地 Compose 文件直接当作生产配置。
- 不得在 API/DB 上添加 host/public port。
- 不得仅凭 portal-auth 204 推断主体或角色。
- 不得在共享 nginx 中激活 `/api/v1/`，直到真实 portal identity、头清除/注入、生产 secret、备份/恢复、容量和回滚均另行评审并授权。
- 不得把 BE-02 的零业务写探针描述为 source registry、snapshot 或 review 已后端化。
- 不得调用 connector/provider，或把 fixture/example 数据提升为业务事实。

## 7. 下一批

下一项安全的本地任务是 BE-03：在现有骨架中实现 `source_registry` 的首个领域迁移与版本化 API，并同时实现 ETag/`If-Match`、幂等键、撤回语义和 append-only audit。BE-03 仍应保持本地隔离，不切换 `/#/data-source` 的生产 canonical 数据源。

机器证据：[BE-02 本地骨架证据](../reviews/mkt53-project-review-20260722/evidence/be-02-identity-rbac-local-skeleton-20260724.json)。
