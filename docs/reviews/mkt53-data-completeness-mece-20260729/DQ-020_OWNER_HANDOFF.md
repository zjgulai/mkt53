# DQ-020 Amazon Owner Evidence 填报与验收手册

## 1. 当前结论

DQ-020 当前为 `blocked-no-owner-submission`。两份 draft 文件虽然存在，但仍是 2026-07-02 的空脚手架：`ownerSubmissionDetected=false`、67 条最低映射中有效条目为 0，readiness 缺 authorization owner、business review owner、compliance reviewer 与有效日期。正式 `amazon-commerce-mapping.json` 和 `amazon-commerce-readiness.json` 为 0/2，只表示尚未执行复核后的 private promotion，不再作为进入独立复核的前置条件。

2026-08-09 已在获授权的本地门禁内先备份旧 checklist，再用当前 schema 模板同步；新文件与模板完全一致，私有目录/文件继续保持 `700/600`。重跑 acceptance 后 `checklist-items-missing` 已消除，但 Owner business content、0/67 mapping、4 个责任字段和 4 个有效日期仍缺失，因此业务门禁没有前移。操作收据为 `evidence/dq-020-checklist-contract-sync-20260809.json`。

随后再次获准进入 Business Owner submission 门禁并完成脱敏验收：两份 draft 的修改时间仍停在 2026-07-02，`ownerSubmissionDetected=false`；mapping/readiness promotion dry-run、draft private audit 与 connector readiness 均保持 blocked、零网络和零私有写入。该结果证明门禁已经执行，但缺少外部 Owner 输入，不能进入独立复核。门禁收据为 `evidence/dq-020-business-owner-submission-gate-20260809.json`。

本手册只定义业务 Owner 如何提交私有材料及如何进入独立复核。它不授予 Amazon 凭据使用、连接器调用、`--write-final`、生产写入、部署或事实晋级权限。

## 2. 角色与职责

| 角色 | 必须完成 | 不可替代 |
|---|---|---|
| Commerce/Data Owner | 67 行 ASIN/SKU/产品映射，mapping owner/date | 不能代替合规审批或 release review |
| Authorization Owner | 授权记录 ID、授权范围、批准日期 | 不能用程序执行许可代替业务授权 |
| Business Review Owner | collection window、用途、业务复核日期 | 不能自行批准连接器 live run |
| Compliance Reviewer | 平台条款、隐私、许可和快照范围 | 模板默认 `approved` 不构成真实审批 |
| Independent Release Reviewer | 核对脱敏收据、私有 hash、row/rejected-row count | 不得与材料填写者为同一验收动作 |
| Connector Operator | 仅在另行授权后加载凭据、执行只读采集 | 不得在 Owner 门禁未通过时提前采集 |

## 3. 私有文件边界

仅允许使用以下 gitignored 私有路径：

| 文件 | 用途 | 权限 |
|---|---|---:|
| `app/configs/private/amazon-commerce-mapping-fill-draft.json` | 67 行映射填报草稿 | `600` |
| `app/configs/private/amazon-commerce-mapping-fill-draft.csv` | 供业务团队离线填写的同构表格 | `600` |
| `app/configs/private/amazon-commerce-readiness-fill-draft.json` | 授权、窗口与复核填报草稿 | `600` |
| `app/configs/private/amazon-commerce-readiness-checklist.md` | 逐项交付清单 | `600` |
| `app/configs/private/amazon-commerce-mapping.json` | 校验通过后才能生成的正式 mapping | `600` |
| `app/configs/private/amazon-commerce-readiness.json` | 校验通过后才能生成的正式 readiness | `600` |

私有目录必须保持 `700`。不得把真实 ASIN/SKU、owner、authorization record、凭据或私有快照复制到 `public/`、`src/`、`tests/fixtures/`、报告 HTML、Git 或聊天内容。

## 4. Mapping 填报合同

最低 67 行按来源分配：

| Source | 页面/范围 | 最低行数 |
|---|---|---:|
| `ds-007` | CompetitionPage / competitor catalog | 15 |
| `ds-009` | ProductManage / product price rating | 25 |
| `ds-010` | RegionCompetition / Brand Analytics region share | 1 |
| `ds-019` | SelfInsight / Momcozy channel product snapshot | 8 |
| `ds-037` | BabyCare / category rank | 5 |
| `ds-038` | CategoryAnalysis / lifecycle and BSR | 8 |
| `ds-039` | NursingProducts / category rank | 5 |

每行必须填写 `sourceId`、`site`、`marketplaceId`、`asin`、`sku`、`brand`、`productName`、`category`、`mappingStatus=ready`、`mappingUpdatedAt`、`mappingOwner`。唯一键为 `sourceId + site + marketplaceId + asin`；ASIN 必须为 10 位大写字母/数字格式，日期为 `YYYY-MM-DD`。

## 5. Readiness 填报合同

必须由真实责任人填写并保留私有证据：

- `authorizationRecordId`、`authorizationOwner`、`authorizationApprovedAt`
- `collectionWindowStart`、`collectionWindowEnd`
- `reviewOwner`、`reviewApprovedAt`
- `complianceReviewer`、`complianceReviewStatus`
- `allowedSnapshotTypes`

collection window 默认从 `public/periodic-data/latest.json` 读取；当前候选为 `2026-08-01..2026-08-15`。若业务材料不是这个窗口，必须先明确刷新/回溯批次，不能通过修改程序默认值绕过门禁。

## 6. 安全验收命令

在 `app/` 目录执行。以下命令均为只读或 dry-run，不调用 Amazon、不写业务数据：

```bash
npm run data:dq020:amazon-owner-evidence:accept
npm run data:connector:amazon:mapping:promote -- --private-dir configs/private
npm run data:connector:amazon:readiness:promote -- --private-dir configs/private
npm run data:connector:amazon:private:audit -- --private-dir configs/private
```

acceptance 结果解释：

| 状态 | 含义 | 下一步 |
|---|---|---|
| `blocked-no-owner-submission` | draft 缺失，或只有未填写的脚手架；正式文件是否存在不改变该判断 | Owner 完成两份私有草稿 |
| `blocked-partial-owner-submission` | 只存在一份含 Owner 内容的 draft | 补齐另一份 draft 并重新验收 |
| `blocked-owner-submission-incomplete` | draft 已有 Owner 内容，但 coverage/window/字段/权限/清单未全部通过 | 修正私有材料，不运行连接器、不写 final |
| `ready-for-independent-owner-review` | 两个 draft dry-run 均为 `ready-to-promote`，且 draft private audit 通过 | 进入独立 Owner/合规/release review；正式文件仍可为 0/2 |

`privatePromotion.status` 单独描述复核后的写入状态：`not-promoted`、`partial-private-promotion` 或 `promoted-private-files-present`。它不替代 Owner submission 判定；任何 `--write-final` 都需要独立复核完成后的单独写入授权。

## 7. 分阶段执行门禁

1. **Owner submission**：67 行 mapping、readiness 与当前模板清单全部完成；两个 promotion dry-run 和 draft private audit 均通过。
2. **Independent review**：acceptance 达到 `ready-for-independent-owner-review` 后，独立复核人核对授权范围、窗口、私有 draft hash、owner 身份与用途。
3. **Private promotion**：只有独立复核和单独写入授权都存在时，才能运行两个 `--write-final`；本批未授权。
4. **Connector authorization**：单独批准凭据加载和 Amazon 只读调用；Owner submission 不等于此授权。
5. **Immutable snapshot**：记录 row count、rejected-row count、schema/version、field-dictionary SHA-256 与 content SHA-256。
6. **Release review and fact promotion**：逐 source/claim 核对页面分母和用途后，才能考虑提升 source grade 或页面事实；DQ-020 才可能关闭。

任一门禁缺失时立即停止，不得前移到 DQ-021，也不得用公开 Amazon 页面、模型生成内容或模板默认值补造真实平台数据。

## 8. 当前执行 TODO

- [x] 当前周期默认窗口与 manifest 对齐。
- [x] packet、promotion、private audit、connector readiness 聚合为脱敏 acceptance 收据。
- [x] CLI 不再回显 ASIN/SKU、authorization id 或 owner 值。
- [x] acceptance schema v2 修正为“完整 draft → 独立复核 → 单独授权 private promotion”，正式文件不再错误阻塞独立复核。
- [x] `complianceReviewer` 纳入 readiness 必填责任人，缺失时 fail closed。
- [x] 已备份旧 checklist 并同步当前 schema；模板匹配、`700/600` 权限和脱敏 acceptance 回读通过。
- [x] 已执行 Business Owner submission 脱敏门禁；当前没有检测到真实 Owner 内容，状态保持 `blocked-no-owner-submission`。
- [ ] 业务 Owner 完成 67 行私有 mapping。
- [ ] Authorization/Business/Compliance Owner 完成 readiness 与证据引用。
- [ ] Owner 逐项确认当前 checklist；模板已同步，但任何勾选仍必须由对应 Owner 基于真实私有证据完成。
- [ ] 独立 reviewer 核验提交与不可变 hash。
- [ ] 另行批准 private final promotion。
- [ ] 另行批准连接器只读执行与凭据加载。
- [ ] 生成并验收 immutable snapshot 后，再逐 claim 决定是否事实晋级。

当前机器收据：`evidence/dq-020-owner-evidence-acceptance-20260809.json`；checklist 同步操作收据：`evidence/dq-020-checklist-contract-sync-20260809.json`；Business Owner submission 门禁收据：`evidence/dq-020-business-owner-submission-gate-20260809.json`。
