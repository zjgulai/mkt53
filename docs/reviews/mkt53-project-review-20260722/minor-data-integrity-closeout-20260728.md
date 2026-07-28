# Batch 30 — 数据完整性与 owner intake 失败关闭收口

日期：2026-07-28

分支：`codex/mkt53-release-candidate-20260630`

起始 HEAD：`06bf98cb5b9bbafaafb61c84bfbdd3fb955d4350`

状态：本地实现与复审完成，待本批提交、推送及精确 head CI 复核

## 1. 本批结论

本批关闭了 Batch 29 之后保留的 Minor 数据完整性风险。修复重点不是增加业务数据，而是确保数据缺失、结构错配、时间错误或证据不足时系统统一失败关闭，不再产生“看似 ready”“看似已采集”或跨页面误用全局安全计数的状态。

最终 Codex 受控只读复审结论为 `No actionable findings.`。本批没有调用 provider、受限连接器或 live public evidence，没有写入生产、安装 cron、修改 nginx、合并 PR 或部署应用。

## 2. 完整设计逻辑

### 2.1 产物发现与路径安全

- manual release review 按修改时间发现最新 validation gate，避免目录名排序选择旧产物。
- readiness packet 的 `packet_id` 经 NFKC 归一化和文件名安全字符收敛；写入前再次校验，阻断路径穿越与危险文件名。
- owner intake 只导入 coverage 明确引用的 packet；coverage 引用不存在 packet 时直接报错。
- 测试临时目录登记并在 `afterEach` 清理，避免失败测试污染后续发现逻辑。

### 2.2 Owner 问题合同

- 空问题包不会因 `0 === 0` 被误判为 ready；缺失标准问题行会按 Q1–Q6 合同恢复为 `missing`，继续等待 owner。
- Q2 只能来自真实 owner/证据答案，不再用当前季度范围代填采集窗口。
- chat prompt、Markdown 模板、JSON 模板和 merge skeleton 只展示该 packet 实际请求的问题 ID；已预填问题不会重复索取。
- `suggested_question_batch` 只接受 Q1–Q6、合法范围与 `|` 组合，拒绝 `Q10|Q7` 等部分前缀匹配。
- merge 只统计 chat pack 明确请求的 `(packet_id, question_id)`；每个请求键必须属于选中 packet，并且恰好匹配一条 `required_for_promotion=yes` 的 intake 行。
- chat packet 声明的 `question_count` 必须与实际 question rows 一致；重复键、外部 packet、缺行与零问题均失败关闭。
- 下游 validator 对所有 required question ID 执行 Q1–Q6 白名单校验，部分问卷中的 Q7 等未知 ID 不能进入 `ready_for_manual_review`。

### 2.3 公开证据与页面计数

- dry-run 记录不再伪造 `finalUrl`；live Amazon 文档发生跨 host 跳转时保留警告。
- 只要 `missingEvidenceTerms` 非空就记录缺项警告，不再仅在完全零匹配时警告。
- Customs adapter 对 `generatedAt` 使用严格 ISO 日期/时区校验，CLI 缺少参数值时直接失败。
- 六个市场/竞争页面从当前页面过滤后的 records 计算 `businessDataWrites`，不再误用全局 summary。
- `ds-027` 的 DataManage 文件大小、SHA-256 与 `checkedAt` 已随当前源码刷新。

### 2.4 恢复候选与敏感草稿

- 半月恢复候选同时校验 periodic/weekly 逐字节一致，并对每个候选与 canonical 文件做顶层字段/类型合同对比；只比较 lane 仍不足以证明兼容的问题已关闭。
- 法规 draft 覆盖既有文件后强制恢复 `0600`，不依赖文件首次创建时的 mode。
- 本地 canonical manifest 更新为 `2026-07-H2` dry-run 候选：39/39 planned、`networkCalls=0`、`businessDataWrites=0`；它不表示 live evidence 已刷新。

## 3. 使用手册

### 3.1 Owner intake 流程

```bash
cd app
npm run data:source-gaps:owner-intake
npm run data:source-gaps:owner-intake:prefill
npm run data:source-gaps:owner-chat-intake-pack
npm run data:source-gaps:owner-chat-merge -- --intake <prefill_dir> --chat-pack <chat_pack_dir> --answers <answers.json> --batch-id <batch_id>
npm run data:source-gaps:owner-intake:validate -- --intake <merged_dir>
```

注意：`ready_for_manual_review` 只代表答案结构和证据元数据足以进入人工复核，不允许写 source registry、更新页面事实或导出事实 CSV。

### 3.2 半月本地候选

```bash
cd app
npm run data:refresh:semi-monthly -- --no-network
npm run data:recovery:semi-monthly:candidate
npm run data:audit
npm run data:audit:deep:summary
```

默认刷新为 dry-run；要产生 live public evidence 必须显式执行授权的 live 命令，并单独复核网页证据。候选通过不授权发布、cron、provider、connector 或生产写入。

### 3.3 法规 draft

法规投影仍只允许写入 `app/tmp/`。每次写入后文件权限固定为 `0600`；不得把 synthetic draft 当成法务审批或可发布事实。

## 4. 验证证据

| 门禁 | 结果 |
|---|---|
| Vitest | 24 files / 195 tests passed |
| ESLint | passed |
| Production build | 2,384 modules transformed / passed |
| Data audit | 43 pages / 107 tables / 53 sources / 0 issues |
| Deep audit | 46 routes / 888 claims / 0 high-risk / 0 unsupported |
| Safety boundary | `providerCalls=false` / `productionWrites=false` / `publicEvidenceLiveCapture=false` |
| Focused owner workflow | 87/87 static script tests passed；最终单例回归通过 |
| Codex review | 多轮 P2 修复后 `No actionable findings.` |
| Graphify | 4,629 nodes / 7,359 edges / 350 communities；AST-only，0 模型 token |

机器可读证据：[`evidence/minor-data-integrity-closeout-20260728.json`](./evidence/minor-data-integrity-closeout-20260728.json)

## 5. 回滚与故障处理

- 本批尚未产生生产副作用；回滚只需回退本批 Git 提交，不需要恢复服务器、数据库、nginx 或 cron。
- 若 owner merge 报 question key/count 错配，重新生成 chat pack，不要手改 intake 来绕过校验。
- 若 canonical H2 dry-run 不适合作为发布候选，保留当前提交并重新执行经授权的 live evidence 流程；不要把旧 live 抓取时间戳伪装成本期数据。
- 若恢复候选合同失败，比较 candidate 与 `public/periodic-data` / `public/weekly-data` 的顶层 schema；不得跳过门禁直接 rsync。

## 6. 下一批执行 TODO

- [ ] 推送本批提交后，确认 PR #32 指向精确新 head，并等待 app/backend GitHub Actions 完成。
- [ ] 将 GitHub check、annotations 与新 review thread 状态写回证据；本地通过不能替代 GitHub-hosted 结果。
- [ ] 继续保留 human review 与 merge 为独立决策，不自动合并。
- [ ] 2026-08-01 09:00 +08:00 后检查首次 cron 日志、生产 period 与 10 个发布文件 hash；时间窗之前不得声称首次定时执行成功。
- [ ] Amazon、CRM、ERP、VOC/NLP、YouTube、Import Genius 与访谈数据继续保持 connector/manual gate，直到获得独立授权和可复核快照。
- [ ] 生产应用部署、nginx、cron 变更、provider 调用和受限连接器访问继续需要新的明确授权。
