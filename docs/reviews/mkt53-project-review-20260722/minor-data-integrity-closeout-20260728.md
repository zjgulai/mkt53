# Batch 30 — 数据完整性与 owner intake 失败关闭收口

日期：2026-07-28

分支：`codex/mkt53-release-candidate-20260630`

起始 HEAD：`06bf98cb5b9bbafaafb61c84bfbdd3fb955d4350`

状态：共享 evidence gate 提交 `3cacb94adc0c813b72e3cfa35514102196c7cdf5` 的精确 head GitHub app/backend CI 已通过；CodeRabbit 随后发现 Graphify 生成报告中嵌套反引号导致的 1 项 MD038，已在本机 generator 修复并以最终 Codex review 确认生成物内部一致；当前工作树复审 clean，待提交推送、新精确 head CI 与外部 recheck

## 1. 本批结论

本批关闭了 Batch 29 之后保留的 Minor 数据完整性风险。修复重点不是增加业务数据，而是确保数据缺失、结构错配、时间错误或证据不足时系统统一失败关闭，不再产生“看似 ready”“看似已采集”或跨页面误用全局安全计数的状态。

此前写入的“最终 Codex clean”结论已被后续事实覆盖：第一次 follow-up 因递归调用被终止，不能作为 clean 证据；随后检查发现文档仍把 CodeRabbit 写成 queued。前六轮受控 review session `019fa6b9-997c-7ef3-9cc4-4d32295d2ff1`、`019fa6d5-5e27-7f92-ad4d-9f7ce9de6a9f`、`019fa6f8-6843-7282-8cb5-869fb5296664`、`019fa70a-4c60-7470-818e-8b055d6bf9e7`、`019fa716-2a69-79c1-90af-b1e5aa92e7bf`、`019fa724-6589-7101-bd85-1928e6a70837` 累计给出 2 个 P1、12 个 P2、2 个 P3，当前 16/16 已本地修复。第七轮 session `019fa730-f7e9-7910-919b-a1dcc651fc06` clean 后提交并推送 `2365bfc`；其精确 head GitHub Actions run `30332364362` 已完成，app 4m33s、backend 58s、annotations 均为 0。CodeRabbit run `7a7909e3-566e-4df4-8009-53e69ace746c` / review `4794237146` 随后指出 static test 未证明六页实际使用安全派生结果、Graphify 报告触发 MD037，以及六页重复 fetch/filter/safety/status 逻辑；三项均已关闭。修复后的 Codex session `019fa757-aec6-75a3-858c-b0e0157068c7` 发现并关闭长会话 stale cache P2，session `019fa764-ac58-7380-99f4-0c5e7fcc3bb7` 随后 clean。该实现以 `3cacb94adc0c813b72e3cfa35514102196c7cdf5` 提交并推送；精确 head GitHub Actions run `30335660462` 为 success，app job `90199862188` 用时 4m23s、backend job `90199862142` 用时 55s，两个 check annotations 均为 0。CodeRabbit run `82d9dd21-b45e-4aff-a526-11d755b6bb5c` / review `4794647488` 在该 head 发现 1 项 MD038：Graphify 社区节点标签含嵌套反引号时，固定单反引号 code span 会产生无效 Markdown。本机 generator 现按标签内最长反引号连续段选择更长 delimiter，MD037/MD038 均为 0。最新 Codex session `019fa78a-44a6-7181-ba13-eb53d4e2544f` 以 exit 0 completed，结论为生成物内部一致并指向当前 HEAD，0 actionable finding。本批没有调用 provider、受限连接器或 live public evidence，没有写入生产、安装 cron、修改 nginx、合并 PR 或部署应用。

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
- 新增共享运行时 manifest parser；`mode`、`generatedAt`、`records` 或 record 基础合同无效时，六个消费页面统一进入 missing，不再用 TypeScript cast 把任意 JSON 当 ready。
- parser 同时验证 title、hash、summary 等可选展示字段的实际类型；即使服务端 manifest 过期或畸形，也只会失败关闭，不会在渲染阶段调用非字符串 `trim()`。
- 六个市场/竞争页面同时匹配 `sourceId` 与 `page`；只有 manifest 明确为 `live-browser-capture`，且 record 通过 validation、HTTPS、证据词、无 warning/page error、无登录/绕过/业务写入时，才能进入 badge、计数和卡片。
- 六页改为统一调用 `usePublicEvidence(sourceId, page)`；共享层负责 parser、页面作用域过滤、安全汇总、eligible 派生和状态文案。仅并发中的请求去重，Promise 结算后立即释放，后续路由重新挂载会以 `cache: no-store` 重新验证，避免长期会话持有已撤回的 eligible 证据。
- 页面作用域内任一 record 发生登录、绕过、业务写入或原文写入 public bundle，整个作用域的 eligible 列表立即清空；不能用“安全 sibling 仍可展示”掩盖同页边界违规。
- 卡片继续只显示 eligible captured record，但 network/business-write 安全计数改为汇总页面作用域内全部 record，拒绝记录的登录、告警或写入活动不能因过滤而归零；无 eligible 样本时六页均显示明确等待态。
- 新品页的 ABC Kids Expo / Nielsen 趋势块不再错误归因给 ds-008；来源治理完成前只显示阻断说明，不展示趋势结论。
- Fortune BI、Global Market Insights breast pads 与 bottle warmer/sterilizer 三条 seed 已修正 label/URL，并通过 no-network H2 生成器同步到 periodic/weekly 字节一致副本。
- `ds-027` 的 DataManage 文件大小、SHA-256 与 `checkedAt` 已随当前源码刷新。

### 2.4 恢复候选与敏感草稿

- 半月恢复候选同时校验 periodic/weekly 逐字节一致，并递归描述所有嵌套对象字段与数组中的每一种元素 shape；count map 按 value schema 而不是当前观测键比较，live-only capture 字段按显式 optional 合同处理，`localEvidence` 的 archive path/bytes 与 screenshot path/hash 继续验证内层类型和成对关系，嵌套类型或必填字段漂移仍会令 compatible=false。
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
| Vitest | 25 files / 204 tests passed |
| ESLint | passed |
| Production build | 2,386 modules transformed / passed |
| Data audit | 43 pages / 107 tables / 53 sources / 0 issues |
| Deep audit | 46 routes / 884 claims / 0 high-risk / 0 medium-risk / 0 unsupported |
| Safety boundary | `providerCalls=false` / `productionWrites=false` / `publicEvidenceLiveCapture=false` |
| Focused follow-up | 3 files / 99 tests passed；runtime evidence、in-flight-only revalidation、schema-aware recovery contract 与 static scripts 回归通过 |
| Codex review | 历史 17 项已关闭；session `019fa78a-44a6-7181-ba13-eb53d4e2544f` completed-clean，确认 Graphify 生成物内部一致，0 actionable finding |
| CodeRabbit | head `3cacb94` / run `82d9dd21-b45e-4aff-a526-11d755b6bb5c` / review `4794647488`；1 项 MD038 已本地修复，待新 head recheck |
| Graphify | 4,671 nodes / 7,457 edges / 346 communities；AST-only，0 模型 token；0 dangling / 0 self-loop；GRAPH_REPORT MD037=0 / MD038=0 |
| GitHub Actions | implementation head `3cacb94`；run `30335660462`；app 4m23s、backend 55s；annotations 均为 0 |

机器可读证据：[`evidence/minor-data-integrity-closeout-20260728.json`](./evidence/minor-data-integrity-closeout-20260728.json)

## 5. 回滚与故障处理

- 本批尚未产生生产副作用；回滚只需回退本批 Git 提交，不需要恢复服务器、数据库、nginx 或 cron。
- 若 owner merge 报 question key/count 错配，重新生成 chat pack，不要手改 intake 来绕过校验。
- 若 canonical H2 dry-run 不适合作为发布候选，保留当前提交并重新执行经授权的 live evidence 流程；不要把旧 live 抓取时间戳伪装成本期数据。
- 若恢复候选合同失败，比较 candidate 与 `public/periodic-data` / `public/weekly-data` 的递归字段和数组 shape；不得跳过门禁直接 rsync。
- Graphify 0.9.28 本机用户级安装已临时修正 report generator 的 thin-community 阈值计算；社区 node label 现先去除外层空白，再根据标签中最长反引号连续段选择更长 Markdown code-span delimiter，同时消除 MD037 与嵌套反引号引起的 MD038。升级 Graphify 可能覆盖该 hotfix；升级后必须重新检查报告不得出现不可能的 `<0 nodes`，且 MD037/MD038 仍为 0。

## 6. 下一批执行 TODO

- [x] 推送实现提交 `c2fe523`，确认 PR #32 指向精确 head；GitHub app/backend checks 均成功。
- [x] 将 run `30322464479`、两个 check 终态和 annotations=0 写回证据。
- [x] 接收并复现 CodeRabbit 对 `c2fe523` 的 5 项 finding；完成 recursive contract、runtime manifest/eligible record、来源归因、seed 和测试保护修复。
- [x] 重新生成 H2 no-network periodic/weekly canonical，确认 39 planned、两份字节一致、0 network calls、0 business data writes。
- [x] 完成六轮受控 Codex review 并修复累计 16 项 finding：live/no-network 合同、字段类型、安全计数、clean 文案、eligible 空态、严格时间戳/审计数组、live mode 展示门、SHA-256 格式、`localEvidence` 内层合同、customs 状态依赖数组、跨域重定向与矛盾 validation 元数据。
- [x] 完成最终受控、非递归 Codex review；session `019fa730-f7e9-7910-919b-a1dcc651fc06` completed，0 actionable finding。
- [x] 提交并推送 `2365bfc`；精确 head run `30332364362` 的 app/backend 均成功，annotations=0。
- [x] 接收 CodeRabbit run `7a7909e3-566e-4df4-8009-53e69ace746c` 的 2 项 inline 与 1 项 outside-diff Major，完成共享 Hook、安全结果合同、MD037 与品牌色修复。
- [x] 修复 Codex session `019fa757-aec6-75a3-858c-b0e0157068c7` 的长会话 stale cache P2；最终 session `019fa764-ac58-7380-99f4-0c5e7fcc3bb7` clean。
- [x] 提交并推送共享 evidence gate 实现 `3cacb94`；精确 head run `30335660462` 的 app/backend 均成功，annotations=0。
- [x] 接收 CodeRabbit run `82d9dd21-b45e-4aff-a526-11d755b6bb5c` / review `4794647488` 的 1 项 MD038；完成可变长 code-span delimiter 修复，MD037/MD038=0，Codex session `019fa78a-44a6-7181-ba13-eb53d4e2544f` clean。
- [ ] 提交并推送 Graphify Markdown 生成物 follow-up，重新验证新的精确 head GitHub app/backend CI，并等待 CodeRabbit recheck 进入明确终态。
- [ ] 继续保留 human review 与 merge 为独立决策，不自动合并。
- [ ] 2026-08-01 09:00 +08:00 后检查首次 cron 日志、生产 period 与 10 个发布文件 hash；时间窗之前不得声称首次定时执行成功。
- [ ] Amazon、CRM、ERP、VOC/NLP、YouTube、Import Genius 与访谈数据继续保持 connector/manual gate，直到获得独立授权和可复核快照。
- [ ] 生产应用部署、nginx、cron 变更、provider 调用和受限连接器访问继续需要新的明确授权。
