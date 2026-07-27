# DATA-REG 合成 Intake → SKU Draft 投影演练

日期：2026-07-24
状态：`synthetic-draft-projection-ready-local-l2`
证据层级：`L2-fixture-or-dry-run`

## 1. 结论

DATA-REG 已把完整的 6/6 合成 intake packet 映射为一个通过 `mkt53.regulation-sku-matrix.v1` 校验的草稿。草稿只包含 `unknown + legal-review-required`，官方快照、已复核 SKU 决策、可发布合规事实仍全部为 `0`。

本批只证明跨合同映射、lineage、重复执行幂等和撤回阻断的本地形状成立。它没有采集法规、评估真实 SKU、生成法律结论、写入 canonical public 或生产环境。

## 2. 设计逻辑

```text
synthetic intake 6/6
  └─ canonical SHA-256 input identity
      ├─ request/source-scope lineage
      ├─ SKU × target market × claim scope deterministic tuples
      ├─ matrix draft: unknown + legal-review-required
      ├─ snapshot/review ids remain empty
      └─ audited withdrawal event → zero records + blocked-withdrawn
```

### 投影合同

- 输入必须是 `synthetic-readiness-fixture`，并由 intake validator 判定为 `6/6`、`synthetic-shape-valid-not-authorized`。
- 每个 `SKU × target market × requested claim scope` 生成一个稳定 record id。
- 合成 source id 只保留在 lineage envelope；SKU matrix 的 official source、URL、hash、snapshot、reviewer、review event 字段必须为 `null`。
- 决策固定为 `applicability=unknown`、`status=legal-review-required`，`canDisplayAsComplianceFact=false`。
- request、source scope、planned snapshot store、planned review store、withdrawal event 分层记录；“计划存储位置”不冒充实际 snapshot/review id。

### 幂等合同

- 输入 packet 先做 key-sorted canonical JSON，再计算 `inputSha256`。
- `operationSha256` 同时绑定输入 hash 与 withdrawal event id；因此活动投影与撤回投影不会共用幂等键。
- matrix 内容计算独立 `matrixSha256`，projection id 绑定 operation 与 matrix hash。
- 同一输入重复运行的 JSON 输出逐字节一致；实测两份活动结果 SHA-256 均为 `e4c640…f9e21`。

### 撤回合同

- 只接受 `mkt53.regulation-intake-withdrawal-fixture.v1` 合成事件。
- event 必须与 request 匹配，并包含非空 reason、ISO 时间、三类传播面和 `auditEventRecorded=true`。
- 合法撤回返回 `blocked-withdrawn`、`projectionReady=false`、`records=[]`。
- request 不匹配、未记录 audit 或传播面不完整均 fail closed。

## 3. 使用手册

在 `app/` 下执行：

```bash
# 默认只输出 stdout，不写文件
npm run data:regulation-intake:project-draft

# 只允许写到 app/tmp/ 内
node scripts/data/project-regulation-intake-to-sku-draft.mjs \
  --json \
  --write tmp/data-reg/projection-rehearsal/active.json

# 演练撤回传播阻断
node scripts/data/project-regulation-intake-to-sku-draft.mjs \
  --json \
  --withdrawal-file tests/fixtures/regulation-intake-withdrawal.synthetic.json \
  --write tmp/data-reg/projection-rehearsal/withdrawn.json
```

`--write` 指向 `public/`、仓库其他目录或 `app/tmp/` 本身会在创建目标前被拒绝。落盘文件使用 `0600`。

## 4. 验证结果

| 门禁 | 结果 |
|---|---|
| Batch 19 定向测试 | 1 file / 8 tests passed |
| DATA-REG 组合定向 | 3 files / 21 tests passed |
| 全量 Vitest | 20 files / 157 tests passed（`--maxWorkers=1`） |
| 活动投影 | 1 draft；matrix valid；lineage valid；0/0/0 evidence counts |
| 幂等重放 | byte-identical；SHA-256 `e4c640…f9e21` |
| 撤回投影 | `blocked-withdrawn`；0 records；独立 operation key |
| 写入边界 | stdout by default；只允许 `tmp/`；实测 mode 0600 |
| ESLint / npm audit | passed / 0 vulnerabilities |
| build / bundle | 2,328 modules；60 JS assets；既有 2 个临时例外 |
| data audit | 43 pages / 107 tables / 53 sources / 0 issues |
| deep audit | 888 claims / 0 high-risk / 26 source gaps |

## 5. 未覆盖与停止条件

- 没有联网或调用 provider/connector。
- 没有真实 owner packet、真实 SKU、真实法规内容、官方 snapshot/hash 或法务 review event。
- synthetic reviewer/store reference 只用于形状演练，不是身份、授权或已发生事件。
- 没有修改后端 schema/API、生产数据库、nginx、Compose、cron 或密钥。
- 没有写 `public/`、没有部署，也没有执行 git stage/commit/push。
- 在真实 intake 仍为 `0/6` 时，不能启动 live collection、真实 SKU 评估或事实发布。

## 6. 下一批建议

下一项安全本地任务是 `DATA-REG synthetic draft-to-review handoff gate`：用本批 projection id 构造 pending review handoff，证明没有 official snapshot/hash 和独立 reviewer authorization 时不能进入 approve/reject；继续只使用合成 fixture 和 `tmp/`，不生成法律决定。
