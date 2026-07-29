---
title: BE-01 后端部署形态决策
doc_type: adr
adr_id: BE-01
status: accepted-for-local-implementation
created: 2026-07-24
updated: 2026-07-24
owner: architecture-and-ops
evidence_layer: L0-accepted-design
provider_calls: false
production_reads: false
production_writes: false
production_deploy: false
business_data_writes: false
fact_promotion: false
---

# BE-01 后端部署形态决策

## 1. 决策摘要

mkt53 Phase 1 采用“**静态前端保持不变 + 同一台腾讯云轻量服务器上的独立后端 Compose 项目 + PostgreSQL + 同源 `/api/v1/` 入口**”作为首阶段部署形态。

- React/Vite 继续由共享 `ai_video_nginx` 从 `/opt/mkt53/html/` 提供，不把前端构建物放进后端容器。
- 新建独立生命周期的 `mkt53_backend` Compose 项目，首批只包含 `api`、`postgres` 和一次性 `migrate` 任务；不并入 Lighthouse 共享 Compose。
- `ai_video_nginx` 只通过专用外部网络 `mkt53_edge` 访问 API；PostgreSQL 只在内部网络 `mkt53_data` 可见，API 和数据库都不绑定公网或宿主机端口。
- API 使用现有文档已选定的 Python 3.12 + FastAPI + SQLAlchemy 2 + Pydantic 2；数据库使用受支持且固定 major/镜像 digest 的 PostgreSQL。
- Phase 1 只承载身份/RBAC、source registry、snapshot metadata、review log 和 audit events。连接器、AI provider、报告任务和大对象业务存储继续保持 gated/deferred。
- 生产实施必须另行取得 compose、nginx、网络、密钥和数据库写入授权；本 ADR 不构成部署授权或运行证据。

状态定义：`accepted-for-local-implementation` 表示可以按本文在本地实现和测试。BE-02 已完成本地骨架与隔离联调，但这仍不表示后端已部署或已通过生产验收。

## 2. 背景与约束

### 2.1 已确认基线

1. 当前生产是 nginx 托管的 React/Vite 静态应用，页面数据主要来自 TypeScript 与 `public/periodic-data` 静态 JSON。
2. 统一门户门禁已保护 mkt 根路径、深层路径和 manifest；P0-05 生产正负向验收为 8/8。
3. `source-registry.ts` 当前有 53 条显式来源合同；Phase 1 的范围是 registry/review/snapshot 最小治理闭环，而不是一次性迁移所有页面数据。
4. 现有架构基线已选择 FastAPI、PostgreSQL、SQLAlchemy 与 Pydantic，并约定 nginx 新增 `/api/` 反向代理。
5. 当前 portal auth 的生产证据只确认有效 session 返回 204、无效 session 返回 401；没有证据证明它已经输出可供 RBAC 使用的用户身份和角色头。

### 2.2 决策驱动因素

- 保持静态前端的简单发布和快速回滚。
- 将共享 Lighthouse 服务的变更爆炸半径限制在 nginx 路由与专用网络接入。
- 支持可审计写入、并发控制、不可变快照元数据和撤回状态机。
- 所有生产密钥只存在服务端，浏览器 bundle 不包含数据库、连接器或 provider 凭据。
- 首阶段不新增独立计算实例，同时保留迁往托管 PostgreSQL 或独立计算节点的退出路径。

## 3. 目标部署拓扑

配套可视化：[BE-01 后端部署形态图](./mkt53-backend-deployment-shape-be-01-20260724.html)。

```text
Browser
  └─ HTTPS mkt.lute-tlz-dddd.top
      └─ shared ai_video_nginx
          ├─ /, assets, manifests -> /opt/mkt53/html (unchanged)
          ├─ auth_request -> portal-auth (existing session gate)
          └─ /api/v1/* -> mkt53_api:8000 over mkt53_edge
                              └─ mkt53_postgres:5432 over mkt53_data

Backup job -> encrypted logical backup -> root-only local staging -> off-host object storage
Deferred workers/connectors -> not activated in Phase 1
```

### 3.1 容器与网络边界

| 组件 | 所属生命周期 | 网络 | 暴露 | 说明 |
|---|---|---|---|---|
| `ai_video_nginx` | Lighthouse 共享 Compose | 现有网络 + `mkt53_edge` | `443` | 只增加 API 反代和可信身份头注入；静态发布路径不变 |
| `mkt53_api` | `mkt53_backend` 独立 Compose | `mkt53_edge` + `mkt53_data` | 容器内 `8000` | 无 host port；仅 nginx 和内部健康检查可访问 |
| `mkt53_postgres` | `mkt53_backend` 独立 Compose | 仅 `mkt53_data` internal network | 容器内 `5432` | 无 host/public port；持久卷与应用镜像分离 |
| `mkt53_migrate` | 一次性任务 | `mkt53_data` | 无 | 发布前显式运行；API 启动不得自动迁移 schema |
| backup job | 定时/人工任务 | `mkt53_data` + 受控出站 | 无 | 只读取数据库；备份加密后离机 |

选择独立 Compose 而不修改共享 Compose 的服务归属，是为了让 mkt53 API/数据库能够独立启动、回滚和恢复。共享 nginx 只通过明确授权的网络与路由变更接入。

### 3.2 路由与健康检查

| 路径 | 可见性 | 合同 |
|---|---|---|
| `/api/v1/*` | 同源、门户 session 保护 | nginx 先执行 portal auth，再转发；API 仍执行身份与 RBAC 校验 |
| `/api/v1/health` | 已认证用户 | 只返回版本、环境标签、启动时间和 redacted readiness，不泄露依赖地址或密钥 |
| `/internal/health/live` | Docker/internal only | 仅证明进程存活，不检查数据库 |
| `/internal/health/ready` | Docker/internal only | 检查数据库连通、迁移版本和只读探针；失败即从流量中摘除 |

nginx 必须剥离客户端提交的所有 `X-Mkt53-*` 和约定的 portal identity 头，只允许使用 portal auth 子请求返回值重新注入，防止身份头伪造。

## 4. 身份与 RBAC 前置合同

BE-02 不得仅凭“portal auth 返回 204”推断用户身份。进入任何 API 写实现前，必须完成以下可测试合同：

1. portal auth 对有效 session 返回稳定、非空的主体标识；推荐头为 `X-Portal-Subject`，显示名和邮箱不是授权主键。
2. 角色来自受信任服务端映射，至少覆盖 `viewer / analyst / reviewer / admin`；不得接受浏览器自报角色。
3. nginx 清除外部同名头，通过 `auth_request_set` 注入主体、角色和 request id。
4. API 在缺少主体时返回 401、角色不足时返回 403；写接口同时记录 actor、role、request id 和 idempotency key。
5. 在上述合同的生产正负向验收完成前，`/api/v1/` 不得开放写路由；本地开发身份只能在 test/dev profile 启用，production 启动时遇到 dev identity 配置必须 fail closed。

如果现有 portal auth 无法提供身份与角色，应在 BE-02 新增兼容响应头或使用后端到 portal identity endpoint 的服务端校验；不得把 session cookie 解码逻辑复制到前端。

## 5. 数据、迁移与一致性

### 5.1 Phase 1 数据范围

| 表/领域 | 最小责任 | 核心约束 |
|---|---|---|
| `sources` | 版本化 source registry | 稳定 source id；显式治理字段；撤回不物理删除 |
| `snapshots` | 快照元数据 | immutable；window、schema version、row count、hash、artifact URI |
| `reviews` | 复核决定与撤回 | 合法状态迁移；actor/reason/time 完整 |
| `claims` | 页面/报告声明绑定 | source/snapshot 多对多；不在 BE-01 搬运全部业务事实 |
| `audit_events` | 变更审计 | append-only；request id、before/after、idempotency key |

业务大对象、原始导入、AI 资产和报告文件以后进入对象存储；PostgreSQL 只保存元数据和引用。Phase 1 不激活任何真实连接器或 provider 调用。

### 5.2 迁移策略

- 使用 Alembic 管理 schema，迁移作为显式 one-shot 任务运行，不在 API 启动时自动执行。
- 采用 expand/contract：先新增兼容字段/表，再切读写，最后在独立变更窗清理旧结构。
- `source-registry.ts` 到数据库的首次 seed 必须确定性生成，记录源文件 hash、条目数和导入 hash；重复导入使用幂等键并拒绝静默覆盖。
- BE-03 至 BE-05 先做 API/数据库本地实现；BE-06 之前生产 UI 仍以静态来源为 canonical。
- 前端适配器使用 `static → shadow → api` 三态。`shadow` 只比较读取结果，不写数据库、不改变页面事实状态。

## 6. 配置与密钥隔离

| 环境 | 配置来源 | 密钥策略 | 禁止项 |
|---|---|---|---|
| test | fixture + 临时数据库 | 固定测试值 | 访问生产、真实连接器或外网 provider |
| dev | ignored `.env.local` / 本地 secret files | 本地独立凭据 | 复用生产数据库、cookie signing secret 或 provider key |
| production | `/opt/mkt53/private/backend/` 下 root-only 文件或云密钥管理 | 以只读文件挂载到 `/run/secrets`；最小权限、可轮换 | 凭据进入 git、镜像、前端 bundle、日志或健康响应 |

生产镜像必须按 digest 固定；环境差异通过配置注入，不为生产维护另一份业务代码。production 启动检查必须拒绝默认密码、dev identity、宽松 CORS、debug 模式和未知环境标签。

## 7. 备份、恢复与回滚

### 7.1 数据保护目标

- PostgreSQL 每日逻辑备份；schema 变更和重要发布前额外备份。
- 本地备份只作为恢复暂存，不是唯一副本；加密后复制到独立故障域的对象存储。
- 建议保留 7 个日备、5 个周备、12 个月备；具体容量在实施前以脱敏数据量核算。
- Phase 1 暂定 `RPO ≤ 24h`、`RTO ≤ 4h`；每季度和重大 schema 变更前后执行一次隔离恢复演练。
- 备份成功不等于可恢复；只有在临时数据库完成 restore、schema 版本和行数/hash 抽检后才计为恢复证据。

### 7.2 应用回滚

1. API 镜像按 digest 保留前一版本，失败时回切 digest，不现场覆盖镜像内容。
2. 前端在 BE-06 前保持静态 canonical；API 故障可关闭 `/api/` adapter 并回到 `static`，不得把错误回退为“已验证”。
3. 数据库迁移优先 forward-fix；破坏性迁移必须有独立备份与恢复演练，不依赖未验证的 down migration。
4. nginx/compose/network 的生产变更必须像 P0-05 一样：冻结 hash、完整备份、syntax/config 检查、最小激活、正负向验收、失败自动回滚。

## 8. SLO、可观测性与容量退出条件

这些是 Phase 1 的初始服务目标，不是当前已实现指标：

| 指标 | 初始目标 | 证据 |
|---|---|---|
| API availability | 月度 99.5%，排除已公告维护窗 | 外部同源探针 + 容器/进程事件 |
| 读取延迟 | p95 < 500 ms | 按 route 记录服务端 histogram |
| 治理写入延迟 | p95 < 1 s | reviews/sources 写 route histogram |
| 5xx error rate | 5 分钟窗口 < 1% | request status counter + alert |
| 审计完整性 | 100% 写操作有 actor/request id/idempotency key | 数据库约束 + 审计测试 |
| 备份 | 计划任务成功率 100%；季度恢复演练通过 | backup manifest + restore report |

API 至少输出结构化日志、request id、route、status、latency 和 actor pseudonymous id；不得记录 session cookie、Authorization、密钥、原始 PII 或受限业务明细。

同机形态命中任一条件即触发迁移评审：

- 月度 availability 连续两个月低于 99.5%，或一次宿主故障同时破坏应用和唯一数据库副本。
- 主机 CPU 持续 15 分钟高于 70%、内存高于 75%、数据盘高于 70%，且通过限流/索引优化不能恢复余量。
- API p95 连续两个观测窗口超目标，或备份/恢复无法在 RPO/RTO 内完成。
- 合规、隔离、审计或数据保留要求禁止应用与数据库共用宿主。

退出顺序：先迁移 PostgreSQL 到托管或独立数据库，再按流量把 API 迁到独立计算节点；同源 `/api/v1/` 和数据合同保持不变。

## 9. 成本决策

首阶段选择 `C0/C1` 成本档：复用现有计算实例，不新增常驻 VM；新增成本主要来自加密离机备份的对象存储与流量。初始增量预算护栏为 **不超过 ¥100/月（不含现有服务器）**，这是内部决策阈值，不是云厂商报价。

实施前必须用实际数据库、备份保留和流量估算复核。预测超过护栏、需要高可用数据库或命中上节退出条件时，提交替代 ADR 与 owner 成本批准，不通过削减备份或安全控制来满足预算。

## 10. 被否决或延期的选项

| 选项 | 结论 | 原因/退出路径 |
|---|---|---|
| 把 API/DB 加入 Lighthouse 共享 Compose | 否决 | 生命周期和回滚爆炸半径过大；只共享受控 edge network |
| SQLite 生产数据库 | 否决 | 不满足并发写、迁移、审计和恢复目标 |
| 立即使用独立 VM + 托管 PostgreSQL | 延期 | 当前流量/数据量证据不足；命中容量、SLO 或合规阈值后迁移 |
| Serverless API/数据库 | 延期 | 增加身份、冷启动、私网和本地恢复复杂度；保持同源 API 合同可后迁移 |
| 浏览器直接调用连接器/provider | 否决 | 密钥、审计、授权范围和数据治理不可控 |
| Phase 1 搬运所有页面事实 | 否决 | 路线图明确只迁 registry/review/snapshot 最小闭环 |

## 11. 实施顺序与门禁

1. **BE-02 local**：建立 API 骨架、内部 health、portal identity contract fixture 和 RBAC 负向测试。
2. **BE-03 local**：实现 versioned source API、ETag/If-Match、幂等键和审计。
3. **BE-04 local**：实现 immutable snapshot metadata 与 hash 重算。
4. **BE-05 local**：实现 review 状态机、撤回和非法跳转拒绝。
5. **BE-06 candidate**：前端先 `shadow` 比较，再经独立授权切换读取；读取失败保持 gated/unknown，不伪装 verified。
6. **Production authorization**：另行评审主机容量、真实 portal identity、备份目的地、密钥路径、compose/nginx candidate、恢复演练和回滚脚本。

生产候选在以下条件全部满足前不得激活：

- API/DB 无公网或 host port；网络隔离测试通过。
- portal identity 头可验证、外部伪造头被清除、401/403 矩阵通过。
- 迁移、幂等、并发冲突、audit append-only 和 restore 演练通过。
- production secret 不在仓库、镜像、bundle、日志或证据包。
- nginx/compose candidate 有冻结 hash、完整备份、回滚命令和独立生产授权。
- 未获得真实连接器/provider 授权时，相关调用数保持 0。

## 12. 验收与未决项

BE-01 只在以下文档合同完成后关闭：runtime、数据库、备份、密钥、SLO、成本、回滚、开发/生产隔离和退出条件均已明确，并有机器可读证据。

仍留给后续任务的未决项：

- BE-02 已固定 API 期待的 identity/role fixture；生产 portal auth 的实际 subject/role 响应头或服务端身份查询仍需独立候选与真实验收。
- BE-02 已固定 Python 3.12.13、PostgreSQL 17.10 镜像 digest、`uv.lock` 与容器 requirements lock；后续升级必须重新验证并显式更新证据。
- 生产候选前重新测量主机 CPU、内存、磁盘、Docker 网络和备份容量。
- owner 在生产实施前确认 ¥100/月预算护栏、RPO/RTO 与离机备份保留策略。

这些未决项不会改变本 ADR 的同源 API、独立 Compose、双网络隔离和可逆迁移方向；如果任何一项要求改变这些核心选择，应以替代 ADR 显式 supersede 本文。

### 12.1 BE-02 本地实现证据

2026-07-24 已按本 ADR 在 `backend/` 完成 FastAPI、internal health、fail-closed 配置、portal identity/RBAC fixture、PostgreSQL/Alembic 与零发布端口 Compose 骨架。新鲜门禁为 36 tests、95.81% branch coverage；一次性隔离联调确认 migration head、401/403/200 矩阵、双网络与 file-only secrets，测试容器/网络/volume 随后清理为 0。

详细合同与边界见 [BE-02 身份与 RBAC 本地骨架](./be-02-identity-rbac-local-skeleton-20260724.md)。该证据为 L1 local validation；生产 `/api/v1/`、真实 portal identity、备份/恢复和生产 secret 仍未激活。
