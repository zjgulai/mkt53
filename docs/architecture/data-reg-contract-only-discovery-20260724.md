# DATA-REG 法规 SKU 合同发现与本地门禁

日期：2026-07-24
状态：`contract-ready-local-l2`
证据层级：`L2-fixture-or-dry-run`

## 1. 结论

DATA-REG 已完成 contract-only discovery：仓库现在有一份版本化 JSON Schema、一条纯合成 fixture、一个 fail-closed 校验器、自动化测试，以及法规页面上的合同与披露面板。它定义了“官方来源 → SKU 范围 → 法务决策 → 证据与发布/撤回”的最小字段链路，但没有新增、采集或验证任何法规事实，也没有对真实 SKU 作出适用性或合规判断。

当前真实计数固定为：`0` 个官方条款快照、`0` 个已复核 SKU 决策、`0` 个可发布合规结论。合同通过只说明字段形状和阻断规则成立，不构成法律意见。

## 2. 盘点结果

- 法规详情页已经通过 `EvidenceGatePage` 和 `PageEvidenceNotice` 绑定 `ds-016`、`policy-cpsc-efiling`、`policy-eu-mdr-transition`，并明确区分公开来源入口、SKU 适用性和法务复核。
- source registry 的现有条目只允许公开入口/时间线等有限 claim scope；它们不能证明 SKU 合规、账户准备度、产品分类、认证状态或法律结论。
- BE-03 至 BE-05 已提供 source、immutable snapshot、review event 的本地治理语义；DATA-REG 合同复用这些证据身份，不新增后端业务表或生产接口。
- 原始需求只确认“法规解读”业务模块存在，没有提供可直接发布的 SKU 适用性台账、法务 owner 或审批记录。

## 3. 合同结构

合同版本为 `mkt53.regulation-sku-matrix.v1`，机器可读 schema 位于 `app/contracts/regulation-sku-matrix.schema.json`。

| 分组 | 关键字段 | 发布前条件 |
|---|---|---|
| source | registry id、jurisdiction、authority、title、official HTTPS URL、retrievedAt、SHA-256、effective window、claim scope | 官方来源必须属于 allowlist，具备内容 hash 与 immutable snapshot |
| sku | skuId、productFamily、targetMarket | 必须是经授权的真实 SKU 范围，不得用 fixture 代替 |
| decision | applicability、status、scopeBasis、rationale、reviewerId、reviewedAt、reason | approved/rejected 必须有 reviewer、时间、reason 与 review event |
| evidence | snapshotId、reviewDecisionId、sourceEvidencePath | 能回溯到官方来源快照和 append-only 复核事件 |
| publication | canDisplayAsComplianceFact、notLegalAdvice、blockedReasons | 只有 official + approved 的完整链路才允许进入发布判断；withdrawn 永久阻断 |
| disclosure | officialSnapshots、reviewedSkuDecisions、publishableComplianceFacts | 声明计数必须与记录逐条计算结果一致 |

## 4. Fail-closed 规则

1. `synthetic-contract-fixture` 只能使用 `unknown + legal-review-required`。
2. 合成 fixture 的 registry id、官方 URL、标题、authority、hash、snapshot、reviewer、review decision 和证据路径必须全部为 `null`。
3. 合成 fixture 的三个披露计数必须为 `0`，且 `canDisplayAsComplianceFact` 必须为 `false`。
4. `official-source-snapshot` 必须使用已登记的法规来源 ID、HTTPS URL、retrievedAt、64 位 SHA-256、snapshot id 与证据路径。
5. `approved/rejected` 必须具备 reviewer、reviewedAt、reason 和 append-only review decision id。
6. `withdrawn` 必须写明 reason，且不能继续展示为合规事实。
7. disclosure 中的三个计数由记录重新计算；自报计数不一致时校验失败。
8. 校验器只读本地文件并输出 stdout，不联网、不写 `public/`、不调用 connector/provider、不写生产、不部署、不生成法律结论。

## 5. 页面披露

`RegulationDetail` 新增 `RegulationSkuContractPanel`，只展示：

- 合同版本和四组字段链路；
- `0 / 0 / 0` 真实证据计数；
- “未采集新法规事实、未评估真实 SKU、不构成法律意见”；
- 未完成官方快照、scope basis 和法务复核事件前，页面与 CSV 均不得提升为合规事实。

页面没有导入 fixture，也没有新增网络请求。既有 source registry 状态和法规描述未被改写。

## 6. 验证

| 门禁 | 结果 |
|---|---|
| DATA-REG 定向测试 | 3 files / 9 tests passed |
| 全量 Vitest | 17 files / 141 tests passed（`--maxWorkers=1`） |
| ESLint | passed |
| npm audit | 0 vulnerabilities |
| production build | passed；60 JS assets |
| bundle budget | passed；仅保留既有 DataManage/vendor-charts 两项临时 exception |
| data consistency | 43 pages / 107 tables / 53 sources / 0 issues |
| deep data audit | 888 claims / 0 high-risk / 0 medium-risk / 0 unsupported claims |
| Graphify | 3,927 nodes / 6,451 edges / 314 communities；结构异常均为 0 |

并行运行完整测试、lint、build 和 deep audit 时，既有半月恢复候选测试曾因超过默认 5 秒而超时；资源竞争结束后以串行全量命令复跑，141/141 通过。没有为掩盖该现象而放宽测试超时。

## 7. 未覆盖与停止条件

- 没有联网搜索、下载或验证法规原文；没有法律事实刷新声明。
- 没有真实 SKU、目标市场、适用范围、法务 owner、reviewer 或审批事件。
- 没有官方内容快照、hash、证据路径或发布记录。
- 没有修改后端 schema/API、生产 nginx/Compose/数据库/cron/密钥。
- 没有执行生产部署，也没有执行 git stage/commit/push。
- 在法务 owner、官方来源采集范围、真实 SKU 输入授权和复核流程确认前，DATA-REG 不得从 `contract-ready-local-l2` 晋升为真实事实闭环。

## 8. 下一批建议

下一项安全任务是 `DATA-REG source-and-legal intake readiness packet`：只生成可填写的官方来源范围、SKU owner、法务 reviewer、审批 SLA、撤回规则和证据交接清单，并对空输入做 fail-closed 验证。它仍不联网采集法规、不填充真实 SKU、不作法律结论；真实采集与复核需另行提供 owner、范围和授权。
