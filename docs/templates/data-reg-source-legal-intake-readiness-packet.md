# DATA-REG 来源与法务输入准备包

合同版本：`mkt53.regulation-source-legal-intake.v1`
用途：收集独立授权复核所需的 owner、scope、review 与撤回治理信息。
边界：填写完整不等于获准采集、评估 SKU、发布合规结论或写入生产，也不构成法律意见。

## 使用方式

真实 owner 输入只能保存在 gitignored 的 `app/configs/private/`：

```bash
cd app
mkdir -p configs/private
cp scripts/data/templates/regulation-source-legal-intake-template.json \
  configs/private/regulation-source-legal-intake.json
```

把 `inputClass` 改为 `owner-submitted-intake`，完成下列六组字段后运行：

```bash
npm run data:regulation-intake:readiness -- \
  --file configs/private/regulation-source-legal-intake.json
```

只有 `status=ready-for-independent-authorization-review` 才能交给独立授权人继续审核；报告中的 `authorizedToCollect`、`authorizedToEvaluateRealSkus`、`authorizedToPublish` 和 `authorizedToWriteProduction` 始终为 `false`。

## 六组输入

### 1. 官方来源范围

- `sourceRegistryIds`：只能选已登记的 DATA-REG source id。
- `jurisdictionCodes`：明确允许核对的司法辖区，不得用“全球”等模糊范围。
- `officialSourceHosts`：只填小写 host，不带协议、路径、query 或凭证。
- `allowedDocumentTypes`：仅允许 `regulation-text`、`official-guidance`、`implementation-notice`。
- `requestedClaimScopes`：写明允许形成的有限事实范围和明确禁止的外推。
- `collectionWindowStart` / `collectionWindowEnd`：授权核对窗口。
- `scopeOwnerId`：对来源范围负责的内部 owner id。

### 2. SKU owner

- `skuOwnerId` / `ownerRole`：真实业务 owner 与职责。
- `skuIds` / `targetMarkets`：授权评估的精确 SKU 和市场集合。
- `authorizationEvidenceRef`：授权记录引用；不要粘贴密钥、cookie 或 token。
- `expiresAt`：授权到期时间，必须晚于 packet 的 `generatedAt`。

### 3. 法务 reviewer 与 SLA

- `reviewerId` / `reviewerRole`：有权复核适用范围的 reviewer。
- `approvalSlaHours`：1–720 小时。
- `escalationOwnerId`：超时或争议升级 owner。
- `decisionPolicyRef`：审批/驳回/撤回规则引用。
- `requiredDecisionStates` 固定为 `approved / rejected / withdrawn`，不可删除。

### 4. 证据交接

- `handoffOwnerId`：证据交接责任人。
- `snapshotStoreRef`：immutable source snapshot 元数据存储引用。
- `reviewEventStoreRef`：append-only review event 存储引用。
- `retentionDays`：正整数。
- `hashAlgorithm` 固定为 `sha256`。
- `requiredArtifacts` 七件套不可删改：官方文件、采集元数据、hash、snapshot、SKU scope basis、法务 review event、withdrawal event。

### 5. 撤回治理

- `withdrawalOwnerId`：撤回责任人。
- `propagationSlaHours`：1–168 小时。
- `affectedSurfaces` 至少覆盖 `dashboard`、`csv-export`、`report-export`。
- `reasonRequired` / `auditEventRequired` 必须保持 `true`。

### 6. 提交确认

- 顶层 `requestId`。
- `ownerSubmissionRef`。
- `sourceScopeConfirmedBy`、`skuScopeConfirmedBy`、`legalWorkflowConfirmedBy`。
- `submittedAt`。

## 禁止内容

- 密码、API token、cookie、session、client secret、private key 或其他凭证。
- 未授权的真实 SKU、个人敏感信息或完整法规内容副本。
- “已合规”“已认证”“法律已确认”等未经独立 review event 支撑的结论。
- 任何把本地 readiness 状态当作生产授权的描述。
