# DATA-REG 合成 Draft → Review Handoff 门禁

日期：2026-07-24
状态：`synthetic-review-handoff-gate-ready-local-l2`
证据层级：`L2-fixture-or-dry-run`

## 1. 结论

DATA-REG 已把 Batch 19 的 deterministic projection 绑定为一个本地 pending review handoff candidate，并证明在缺少官方 snapshot/hash、官方字节核验和独立 reviewer authorization 时，`approved` 与 `rejected` 均不可达。

这个 candidate 不是后端 review subject：`backendEntityType=null`、`backendSubjectCreated=false`、`backendPersisted=false`、`reviewEventId=null`、`legalDecision=null`。本批只验证交接前置条件与阻断语义，没有调用 BE-04/05 API、没有写数据库，也没有生成法律决定。

## 2. 设计逻辑

```text
synthetic draft projection
  ├─ verify projection matrix SHA + DATA-REG contract
  ├─ verify lineage keeps 0 official snapshots / 0 review decisions
  ├─ bind projection id + prerequisites + requested state to operation SHA
  └─ create local pending handoff candidate
       ├─ missing official snapshot/hash/byte verification → block
       ├─ missing independent reviewer authorization → block
       ├─ synthetic complete shape → still not authorized
       ├─ approved/rejected attempt → block
       └─ withdrawn projection → no candidate
```

### 前置条件合同

- 合同版本为 `mkt53.regulation-review-handoff-prerequisites.v1`。
- 仅接受 `empty-handoff-template` 和保留的 `synthetic-handoff-fixture`；额外字段、secret/token/cookie/private-key 形状或弱化 disclosure 均 fail closed。
- snapshot 形状覆盖 `snapshotId`、`sourceRegistryId`、artifact/metadata SHA-256、retrieved time、evidence path 与字节核验状态。
- reviewer 形状覆盖 reviewer id/role、authorization ref、授权窗口与是否独立于 request owner。
- 本批 schema 固定 `verifiedAgainstBytes=false`；因此即使合成字段 6/6 完整，也不能自称官方证据已核验。

### Review handoff 合同

- 活动 projection 必须保持 `synthetic-draft-ready-not-authorized`，matrix hash 可复算，并且每条记录仍是 `unknown + legal-review-required`。
- projection lineage 必须保持 `materializedOfficialSnapshots=0`、`snapshotIds=[]`、`reviewDecisionIds=[]`、`pending-not-reviewed` 与 `not-withdrawn`。
- candidate 只创建本地 subject identity；不会创建后端 entity、review event 或 decision。
- `approved` / `rejected` 请求在缺少官方证据和独立授权时返回 `blocked-review-transition`，命令成功代表门禁正确阻断，不代表业务审批成功。
- 已撤回 projection 返回 `blocked-projection-withdrawn` 且 candidate 数量为 `0`；撤回应继续使用 Batch 19 的 withdrawal contract。

### 幂等与写入边界

- `projectionSha256 + prerequisitesSha256 + targetState` 共同生成 operation SHA-256 与 handoff id。
- 相同输入重复执行输出逐字节一致；pending 两次输出 SHA-256 均为 `420500…06f8f`。
- CLI 默认只输出 stdout；`--write` 只允许 `app/tmp/` 内的具体文件，落盘 mode 为 `0600`。
- 所有结果固定 `network/provider/connector/backend API/snapshot/review/business/public/production writes = 0`。

## 3. 使用手册

在 `app/` 下执行：

```bash
# 空前置条件：生成 pending candidate，但保持 review decision 不可达
npm run data:regulation-review:handoff-gate

# 记录本地可审计输出，只能写 app/tmp/
node scripts/data/build-regulation-review-handoff-gate.mjs \
  --json \
  --write tmp/data-reg/review-handoff/pending.json

# 尝试 approve：预期 status=blocked-review-transition，且不产生 decision
node scripts/data/build-regulation-review-handoff-gate.mjs \
  --json \
  --target-state approved \
  --write tmp/data-reg/review-handoff/approve-attempt.json

# 完整合成形状也不得自我授权
node scripts/data/build-regulation-review-handoff-gate.mjs \
  --json \
  --prerequisites-file tests/fixtures/regulation-review-handoff-prerequisites.synthetic.json \
  --target-state approved \
  --write tmp/data-reg/review-handoff/synthetic-approve-attempt.json

# 已撤回 projection 不创建 handoff candidate
node scripts/data/build-regulation-review-handoff-gate.mjs \
  --json \
  --withdrawal-file tests/fixtures/regulation-intake-withdrawal.synthetic.json \
  --write tmp/data-reg/review-handoff/withdrawn-projection.json
```

判断结果时必须同时查看 `status`、`passed`、`readyForReviewerDecision`、`reviewGate.transitionAuthorized`、`decision` 和 `boundaries`。`passed=true` 在本批表示 fail-closed 门禁按合同工作，不表示 approve/reject 获准。

## 4. 实测结果

| 场景 | 状态 | 关键证据 |
|---|---|---|
| 空前置条件 pending | `pending-review-handoff-blocked-prerequisites` | 1 candidate；ready=false；artifact SHA `420500…06f8f` |
| 相同输入重放 | byte-identical | 两份文件 SHA-256 相同 |
| 空前置条件 approve | `blocked-review-transition` | transitionAuthorized=false；decision=null；SHA `08210f…26f6e` |
| 完整合成形状 approve | `blocked-review-transition` | shape complete，但 official/reviewer authorization 仍 false；SHA `c2cf39…ac47f` |
| 已撤回 projection | `blocked-projection-withdrawn` | 0 candidate；SHA `812a7e…098c7` |
| DATA-REG 组合测试 | 4 files / 33 tests passed | matrix、intake、projection、handoff 全链路 |
| 全量 Vitest | 21 files / 169 tests passed | `--maxWorkers=1`；132.42s |
| 工程质量 | passed | lint、0 vulnerabilities、2,328 modules build、bundle budget |
| 数据治理 | passed | 43 pages / 107 tables / 53 sources / 0 issues；888 claims / 26 source gaps |
| Graphify | passed | 4,405 nodes / 7,043 edges / 343 communities；0 integrity defects；51 zero-AST source files |

## 5. 未覆盖与停止条件

- 没有官方法规字节、真实 snapshot/hash 或真实 reviewer authorization。
- 没有真实 SKU 评估、approve/reject、legal conclusion 或可发布事实。
- 没有调用后端 API；Graphify 在实现前确认 projector 与 `ReviewRegistryService` / `SnapshotRegistryService` 没有直接路径，本批没有用伪路径替代集成。
- 没有读取或写入生产、`public/`、nginx、Compose、cron、provider 或 connector。
- 没有执行 git stage/commit/push。

## 6. 下一执行门

DATA-REG 继续推进需要真实 owner/source/SKU/legal/evidence/withdrawal 六组输入与独立授权；当前仍为 `0/6`，不应继续用合成 fixture 冒充业务闭环。

在等待真实输入和 2026-08-01 09:00 的 P0-04 首次 cron 观察期间，下一项有明确本地价值的安全批次是 `P0-03 temporary exception retirement`：拆分 `DataManage` route，目标把主 chunk 从 233.53 KiB 降至 120 KiB 以内，并在 2026-08-15 前移除书面例外；仅做本地代码、测试和构建，不部署。
