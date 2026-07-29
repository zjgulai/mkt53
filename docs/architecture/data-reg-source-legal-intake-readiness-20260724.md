# DATA-REG 来源与法务 Intake Readiness

日期：2026-07-24
状态：`readiness-template-ready-local-l2`
证据层级：`L2-fixture-or-dry-run`

## 1. 结论

DATA-REG 已新增版本化 source-and-legal intake schema、可填写的空模板、只读 fail-closed 校验器、纯合成完整形状验证和法规页 readiness disclosure。空模板结构合法，但实测状态为 `blocked-required-input`：`0/6` 输入组就绪、32 个字段待提供。

本批没有真实 owner、reviewer、官方来源范围、SKU 授权或提交确认。所有授权判断保持 `false`，真实法规采集、真实 SKU 评估、法律结论和可发布事实均为 `0`。

## 2. 六组 Readiness 输入

| 输入组 | 最小字段 | 当前状态 |
|---|---|---|
| 官方来源范围 | registry ids、jurisdiction、official hosts、document types、claim scopes、window、scope owner | 0 / blocked |
| SKU owner | owner、role、SKU ids、target markets、authorization ref、expiresAt | 0 / blocked |
| 法务 reviewer 与 SLA | reviewer、role、1–720h SLA、escalation owner、decision policy | 0 / blocked |
| 证据交接 | handoff owner、snapshot store、review event store、retention、固定七件套 | 0 / blocked |
| 撤回治理 | withdrawal owner、1–168h SLA、dashboard/CSV/report propagation、reason/audit | 0 / blocked |
| 提交确认 | request id、submission ref、三方确认人、submittedAt | 0 / blocked |

## 3. 状态机

| inputClass | 完整性 | 输出状态 | 授权含义 |
|---|---|---|---|
| `empty-readiness-template` | 0/6 | `blocked-required-input` | 无授权 |
| `synthetic-readiness-fixture` | 6/6 | `synthetic-shape-valid-not-authorized` | 只证明形状；无授权 |
| `owner-submitted-intake` | 不完整 | `blocked-required-input` | 无授权 |
| `owner-submitted-intake` | 6/6 且合同有效 | `ready-for-independent-authorization-review` | 仅允许交给独立授权人复核；仍未获授权 |
| 任意 input | 合同或安全边界无效 | `blocked-contract-invalid` | fail closed |

校验报告的 `authorizedToCollect`、`authorizedToEvaluateRealSkus`、`authorizedToPublish`、`authorizedToWriteProduction` 永远为 `false`。本地 packet 不具备自我授权能力。

## 4. 安全边界

- 真实 `owner-submitted-intake` 只能从 gitignored 的 `app/configs/private/` 读取；其他路径直接拒绝。
- owner packet 的 source id 只能来自 DATA-REG allowlist；未登记 ID 或伪装成 owner 输入的 `fixture-* / TEST-ONLY / .invalid` 标记直接拒绝。
- 合成 packet 必须使用 `fixture-*` 标识、`TEST-ONLY` 范围和保留的 `.invalid` host。
- 禁止 password、secret、token、cookie、private key、client credential 等字段。
- official host 只接受裸小写 host；不接受 URL path、query 或凭证。
- source collection window、SKU authorization expiry、approval/withdrawal SLA、固定 review states 与 evidence checklist 均做 fail-closed 校验。
- disclosure 的 no-live-collection、no-real-SKU-evaluation、no-production-writes、no-fact-promotion 和 not-legal-advice 必须全部保持 `true`。
- 校验器只读本地 JSON 并输出 stdout；不写模板、不写 `public/`、不调用网络/provider/connector、不部署。

## 5. 页面披露

`RegulationDetail` 新增 `RegulationIntakeReadinessPanel`，显示六个“待输入”分组以及：

- `0 / 6 输入组就绪`；
- `授权采集 0`；
- `真实 SKU 评估 0`；
- `可发布结论 0`。

页面不读取 private packet，不显示 owner/reviewer 标识，不新增网络请求，也不会把 readiness 转成法规事实。

## 6. 验证

| 门禁 | 结果 |
|---|---|
| DATA-REG 组合定向测试 | 5 files / 17 tests passed |
| 全量 Vitest | 19 files / 149 tests passed（`--maxWorkers=1`） |
| empty-template readiness | contract valid；0/6；32 missing；blocked |
| synthetic readiness | 6/6；shape valid；not authorized |
| private path / allowlist / secret / withdrawal probes | 全部按预期拒绝或阻断 |
| ESLint | passed |
| npm audit | 0 vulnerabilities |
| production build | passed；60 JS assets |
| bundle budget | passed；仅保留既有 DataManage/vendor-charts 两项临时 exception |
| data consistency | 43 pages / 107 tables / 53 sources / 0 issues |
| deep data audit | 888 claims / 0 high-risk / 0 medium-risk / 0 unsupported claims |
| Graphify | 4,222 nodes / 6,793 edges / 331 communities；结构异常均为 0 |

## 7. 未覆盖与停止条件

- 没有联网下载或验证法规内容。
- 没有创建真实 private owner packet，也没有取得 source/SKU/legal owner 确认。
- 没有真实 SKU、官方内容 snapshot/hash 或 legal review event。
- 没有修改后端 schema/API、生产数据库、nginx、Compose、cron 或密钥。
- 没有部署，也没有执行 git stage/commit/push。
- 在六组真实输入和独立授权完成前，DATA-REG 保持 `blocked-required-input`，不得启动 live collection 或事实发布。

## 8. 下一批建议

下一项安全本地任务是 `DATA-REG synthetic intake-to-draft projection rehearsal`：用纯合成 6/6 packet 映射出 `unknown + legal-review-required` 的 SKU matrix draft，验证 request/source/snapshot/review lineage、重复执行幂等和撤回阻断；输出仍只能位于测试或 `tmp/`，不得联网、使用真实 SKU、写 `public/` 或提升为事实。
