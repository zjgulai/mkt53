---
title: BE-06 本地数据来源 API Adapter
doc_type: architecture
module: frontend+backend
topic: data-source-api-adapter
status: local-validated-not-deployed
created: 2026-07-24
updated: 2026-07-24
owner: frontend+backend
source: code+local-evidence
---

# BE-06 本地数据来源 API Adapter

## 1. 结论与边界

BE-06 已为 `/#/data-source` 增加双模式读取合同：本地开发可显式请求 `api`，生产构建始终强制 `static`。在本地 API 模式中，页面从同源 `GET /api/v1/sources` 读取来源，不再从 `sourceRegistry` 回填；loading、empty、offline、HTTP/network error 和合同校验失败都保持来源数组为空，因此不会把读取失败显示成 53 条静态“已复核”结果。

这是一项 **L1 本地实现与浏览器验收**，不是线上切换。生产 `mkt.lute-tlz-dddd.top` 仍以 `app/src/data/source-registry.ts` 的 53 条静态合同为 canonical；本批没有 seed 后端数据库，没有启用生产 `/api/v1/`，没有修改生产 nginx、Compose、数据库或密钥，也没有调用 connector/provider 或写业务数据。

## 2. 运行模式

| 输入 | 构建环境 | 实际模式 | 结果 |
|---|---|---|---|
| 未配置或非 `api` | development | `static` | 读取静态 53 条 |
| `VITE_MKT53_DATA_SOURCE_MODE=api` | development | `api` | 请求同源 `/api/v1/sources` |
| 任意值 | production | `static` | 生产强制锁定静态 canonical |
| `api` | production | `static` | 显式显示强制锁定，API 请求数必须为 0 |

本地启用命令：

```bash
cd app
VITE_MKT53_DATA_SOURCE_MODE=api npm run dev
```

仓库当前没有把后端 `8000` 暴露为 host port，也没有在 Vite 中注入 trusted-proxy token。若没有同源、受信的本地 identity edge，上述页面会按设计进入 HTTP/network error，而不是绕过身份门禁。浏览器代码只发送 `Accept: application/json`、`credentials: same-origin` 和 `cache: no-store`；禁止在前端设置 `X-Mkt53-Proxy-Token`、`X-Portal-Subject` 或 `X-Portal-Roles`。

## 3. Adapter 合同

- endpoint 固定为同源 `/api/v1/sources`，每页最多 200 条，按返回总数继续分页。
- 校验 BE-03 camelCase response 的来源字段、owner、lifecycle、version、时间戳和分页 envelope。
- 默认列表只接受 `lifecycleStatus=active`；withdrawn 项、重复 id、总数漂移、提前空页、非法 enum 或非 JSON 均 fail closed。
- 最多接受 10,000 条，避免异常 total 导致无界请求。
- HTTP、在线网络失败、浏览器离线和 invalid-response 保留为不同错误类型。
- Adapter 不包含静态 fallback；`useDataSourceRegistry` 只在明确的 static 模式读取 `sourceRegistry`。
- 取消页面或重新加载时通过 `AbortController` 终止旧请求。

## 4. 页面状态

| 状态 | 页面行为 |
|---|---|
| `loading` | 显示正在读取；隐藏来源统计和表格 |
| `ready` | 只渲染当前模式返回的来源和统计 |
| `empty` | 明确显示 0 条；不回填静态 53 条 |
| `offline` | 显示离线和重试；来源状态保持未知 |
| `error` | 显示 HTTP/network/合同错误和重试；来源状态保持未知 |

半月 manifest 是独立合同，仍由 `usePeriodicManifest` 读取。API 来源未 ready 时，即使 manifest 已加载，来源总数和“公开/本地可验证”也显示 `-`；connector/manual/error 等采集运行统计可以继续按 manifest 展示。API ready 后，来源总数与 verified 数只使用 API 结果，不混入静态 manifest 的 53/16。

## 5. 新鲜验证

| 验证 | 结果 |
|---|---|
| Vitest | 132 passed；其中 BE-06 adapter/hook/status/page 定向 15 passed |
| TypeScript + Vite production build | passed |
| ESLint | passed |
| npm audit | 0 vulnerabilities |
| data audit | 53 sources、43 pages、107 tables、0 issues |
| bundle budget | passed；DataSourcePage 34.81 KiB raw / 9.92 KiB gzip |
| local API browser states | success、empty、HTTP error、offline 均通过；失败态无 53 条 fallback |
| production anti-misconfiguration | 以 `VITE_MKT53_DATA_SOURCE_MODE=api` 构建后仍显示 static 53，`/api/v1/sources` 请求数 0 |
| data-source E2E | desktop/mobile 的 core + data-quality 共 4 passed，无 console error 或水平溢出 |
| Graphify | 3,645 nodes / 6,072 edges / 277 communities；missing/dangling、self-loop、duplicate/collapsed edge 均为 0 |

本机 Playwright bundled Chromium 在依赖更新后缺少 executable；首次全量命令因此未进入页面。改用已安装 Chrome 后发现既有 `/favicon.ico` 404，并通过把现有 Momcozy logo 声明为 favicon 消除。修复后的全量截图扫描因本机 `networkidle` 等待速度异常，在 26/138 无失败时主动停止；本批直接相关的 4 个 `/data-source` E2E 随后完整通过。该停止记录不能写成全量 138 passed。

Graphify 本批执行 code-only AST 增量更新和 `cluster-only --min-community-size=0`，未调用 LLM/provider 进行文档语义抽取。40 个 JSON/config 源文件仍产生 zero AST node，这是可见性限制，不是将其内容判定为空或已验证。

## 6. 生产停止条件

- 不得仅通过设置环境变量切换生产读取；production bundle 会强制 static。
- 不得把 trusted proxy token、portal subject 或 role 放进 Vite env、浏览器 bundle 或请求代码。
- 不得在 53 条静态来源完成 owner 映射、确定性 seed、shadow diff 和回滚验收前启用 API canonical。
- 不得在真实 portal identity 响应头、nginx 客户端头清除/服务端注入和授权会话通过前开放生产 `/api/v1/sources`。
- 不得把本地 API fixture、empty/error 状态或浏览器 mock 写成生产数据已迁移。

## 7. 下一批建议

按路线图继续 `BE-07 local audit and recovery drill`：只在隔离 PostgreSQL/本地 artifact 中演练备份、恢复、source 撤回、幂等重放与 audit/review append-only 验证，记录实测 RPO/RTO；不读取或写入生产数据库，不安装生产任务，不修改线上配置。

机器证据：[BE-06 本地 adapter 证据](../reviews/mkt53-project-review-20260722/evidence/be-06-data-source-api-adapter-20260724.json)。
