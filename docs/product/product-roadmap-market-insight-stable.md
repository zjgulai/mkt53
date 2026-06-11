---
title: 市场洞察产品路线图
doc_type: prd
module: product
topic: market-insight-roadmap
status: stable
created: 2026-05-31
updated: 2026-06-11
owner: self
source: human+ai
---

# 市场洞察产品路线图

## 产品定位

mkt53 当前是 Momcozy 内部市场洞察看板，核心价值是把市场、竞争、用户、行业、AI 辅助、报告和数据资产放到同一个工作台。下一阶段目标不是继续堆展示页，而是把看板升级为可复核、可导入、可生成报告的内部洞察产品。

## 当前能力清单

| 能力 | 当前状态 | 主要入口 | 约束 |
|---|---|---|---|
| 市场洞察 | 已上线静态看板 | `/market` | 部分趋势和评分仍依赖解释性模型 |
| 竞争情报 | 已上线静态看板 | `/competition` | Amazon、区域份额和价格数据需要采集记录 |
| 用户研究 | 已上线静态看板 | `/users` | CRM、访谈、社媒口径需要拆分复核 |
| 行业与法规 | 已上线静态看板 | `/industry` | CPSC/eFiling 与 EU MDR 仍是待复核状态 |
| AI 助手 | 已上线演示能力 | `/ai-assistant` | 真实供应商调用必须走服务端代理 |
| AI 画廊 | 已上线静态素材库 | `/ai-gallery` | 生成历史和版权状态未结构化 |
| 报告中心 | 已上线报告目录与预览 | `/reports` | 报告生成还没有正式数据快照绑定 |
| 数据管理 | 已上线数据资产目录 | `/#/data` | 页面内数据表仍是前端静态定义；生产使用 hash 路由 |
| 数据来源管理 | 已上线 registry 展示 | `/#/data-source` | 复核工作流尚未落到后端状态机；生产使用 hash 路由 |
| 宿主导航入口 | 已上线服务卡片 | `https://lute-tlz-dddd.top` | 当前为 12 个服务入口的共享 landing，mkt 卡片标题为「市场洞察工作台」，不随 Vite 构建自动发布 |
| 质量与发布 | 已上线工程门禁 | `docs/workflows/` | Playwright 视觉检查还未接入 CI |

## 不可信与示例数据清单

| 优先级 | 数据项 | 当前状态 | 原因 | 下一动作 |
|---|---|---|---|---|
| P0 | CPSC CPC/eFiling | `needs-review` | SKU 适用范围、证书字段和进口申报节奏未由法务确认 | 法务按官方页面复核并形成条目级结论 |
| P0 | EU MDR Class IIa | `needs-review` | 产品分类、证书状态和 notified body 路径未确认 | 法务按产品线建立适用性矩阵 |
| P0 | 海关 HS 编码进出口 | `example` | 当前为示例数据，不能作为真实贸易结论 | 接入 Import Genius、海关数据或内部数仓快照 |
| P0 | Momcozy CRM RFM 分层 | `example` | 已有 CRM dry-run、私有 readiness 模板和合成门禁测试，但缺真实只读授权、脱敏客户快照和 RFM 计算留痕 | 先补私有 readiness record 与 snapshot manifest，通过 gate 后再实现真实 CRM/RFM 快照 |
| P1 | Amazon 竞品价格与评价 | `needs-review` | 已有 dry-run 输出契约、ASIN/SKU 映射校验、私有占位初始化、人工填报清单、私有输入交叉审计、私有覆盖率归档和半月窗口 readiness gate，但缺完整私有映射、平台授权记录和真实采集时间戳 | 按人工清单补齐私有映射表和授权记录，先通过私有输入交叉审计，再通过半月窗口 readiness gate 后实现真实连接器和数据快照 |
| P1 | 区域份额 | `needs-review` | 仅覆盖 Amazon 渠道，不能外推全渠道份额 | 增补渠道范围和外部份额校准源 |
| P1 | 社交声量 | `needs-review` | 缺 API 授权、查询词和采样窗口 | 固化查询词、地区、窗口和授权记录 |
| P1 | 评论情感分析 / VOC趋势 | `needs-review` / `example` | 已有 Review NLP dry-run、私有 readiness 模板和合成门禁测试，但缺真实授权样本、模型评估和人工复核记录 | 先补私有 readiness record 与样本 manifest，通过 gate 后再实现真实 VOC/NLP 快照 |
| P1 | ERP供应链节点与库存 | `example` | 已有 ERP dry-run、私有 readiness 模板和合成门禁测试，但缺真实只读授权、库存快照、供应商映射和成本模型留痕 | 先补私有 readiness record 与 snapshot manifest，通过 gate 后再实现真实 ERP/Supply Chain 快照 |
| P1 | Web 评论爬取 | `needs-review` | robots.txt 和平台条款合规性未结构化 | 建立采集白名单和合规检查 |
| P2 | 波特五力评分 | `example` | 解释性模型，不是机构原始结论 | 保留为模型输出并补充评分公式 |
| P2 | BCG 矩阵 | `example` | 内部主观评估，缺外部份额校准 | 接入份额数据后再用于决策 |
| P2 | PEST 组合来源 | `needs-review` | 来源组合跨度大，缺条目级 URL | 拆分到具体政策和数据来源 |

## 真实数据接入优先级

| 优先级 | 数据域 | 业务价值 | 首个可交付物 | Owner | 数据依赖 | 验收指标 |
|---|---|---|---|---|---|---|
| P0 | 法规复核 | 避免错误合规结论 | CPSC 与 EU MDR 条目级复核矩阵 | 合规组 | 官方页面、SKU 清单、证书状态 | P0 法规条目 100% 有状态、负责人、来源 URL |
| P0 | CRM 用户分层 | 支撑用户与增长决策 | CRM dry-run + 私有 readiness gate + 脱敏 CRM 快照 + RFM 计算结果 | CRM 组 | CRM 订单、会员、地区字段、脱敏规则、RFM 评分规则 | readiness gate 通过后才实现真实 CRM/RFM pipeline；RFM 页面无示例数据，复核状态不低于 `needs-review` |
| P0 | 竞品采集 | 支撑价格与新品监控 | Amazon dry-run 契约 + 私有输入占位 + 人工填报清单 + 私有输入交叉审计 + 私有 ASIN/SKU 映射覆盖率归档 + readiness gate + SKU 采集快照 | 竞品情报组 | 私有 ASIN/SKU 映射、平台授权、价格、评价、采集时间 | 关键竞品 SKU 映射覆盖率不低于 90%，私有输入交叉审计和 readiness gate 通过后才进入真实连接器，覆盖率归档和审计报告留在服务器私有目录，真实映射不进入前端包或 git |
| P1 | 海关与贸易 | 支撑区域和供应链判断 | HS 编码月度快照 | 数据工程组 | Import Genius、海关或内部数仓 | 海关页面移除示例标记，保留采集窗口 |
| P1 | ERP 供应链快照 | 支撑供应商、库存、成本和交付风险判断 | ERP dry-run + 私有 readiness gate + 脱敏供应链快照 | 供应链组 | ERP 库存、供应商主数据、仓库、成本指数、脱敏规则 | readiness gate 通过后才实现真实 ERP/Supply Chain pipeline；供应链页面无示例经营结论 |
| P1 | 评论与 VOC NLP | 支撑 VOC 和产品改进 | Review NLP dry-run + 私有 readiness gate + 评论语料快照 | 用户研究组 | Amazon 评论或授权评论集、关键词词典、模型版本、人工标注规则 | readiness gate 通过后才实现真实 NLP pipeline；情感模型准确率、人工一致率和样本窗口可展示 |
| P1 | 报告生成 | 缩短洞察交付周期 | 报告模板绑定数据快照 | 市场分析组 | 已复核 registry、图表快照、报告模板 | 报告每个结论可追溯到 source id |
| P2 | AI 设计代理 | 让设计助手从演示转生产 | 图像生成服务端代理 | AI 组 | 供应商 API、对象存储、审计日志 | 浏览器 bundle 不含供应商密钥，生成请求可审计 |

## 90 天路线图

| 时间 | 路线图项 | Owner | 数据依赖 | 验收指标 |
|---|---|---|---|---|
| Day 1-15 | 建立 P0 法规复核矩阵 | 合规组 | CPSC 官方页面、EU MDR 官方页面、SKU 清单、证书状态 | CPSC/eFiling 和 EU MDR 所有条目有复核状态、负责人、复核日期和来源 URL |
| Day 1-15 | 固化数据接入契约 | 数据工程组 | `source-registry.ts`、数据资产目录、现有页面字段 | 每个 P0 数据域有字段清单、主键、更新时间和脱敏规则 |
| Day 16-30 | 接入 CRM 脱敏快照 | CRM 组 | CRM readiness gate、订单、会员、地区、品类、时间窗口、RFM 评分规则 | 私有 readiness record 通过；RFM 数据不再标为 `example`，页面显示快照日期 |
| Day 16-30 | 建立竞品 SKU 采集快照 | 竞品情报组 | Amazon dry-run 契约、私有 ASIN/SKU 映射校验、半月窗口 readiness gate、价格、评分、评论数、采集时间 | 核心竞品 SKU 覆盖率不低于 90%，readiness gate 通过且采集窗口与半月周期一致，采集记录可追溯 |
| Day 31-45 | 建立数据复核后台最小闭环 | 数据工程组 | source registry、复核人、复核状态、复核记录 | `verified`、`needs-review`、`example` 状态可从后台维护并留痕 |
| Day 31-45 | 报告生成绑定数据快照 | 市场分析组 | source id、图表配置、报告模板、导出参数 | 至少 3 类报告可追溯到数据快照和来源 registry |
| Day 46-60 | 上线 AI image proxy 最小服务 | AI 组 | 供应商 API、服务端环境变量、对象存储、审计日志 | 前端不接收供应商 API key，生成请求和资产可审计 |
| Day 46-60 | 建立评论模型评估集 | 用户研究组 | Review NLP readiness gate、评论语料、人工标注、模型输出 | 私有 readiness record 通过；情感分析准确率、召回率、人工一致率和样本窗口有可展示指标 |
| Day 61-75 | 接入海关或贸易数据快照 | 供应链组 | HS 编码、地区、月份、供应商或外部数据源 | 海关页面移除示例结论，保留来源和采集窗口 |
| Day 61-75 | 接入 ERP 供应链脱敏快照 | 供应链组 | ERP readiness gate、库存快照、供应商映射、仓库范围、成本模型 | 私有 readiness record 通过；供应链页面移除示例经营结论，保留快照日期和商业敏感边界 |
| Day 76-90 | 建立业务发布评审机制 | 产品负责人 | P0/P1 数据状态、E2E 结果、生产 smoke、宿主入口卡片 | 每次生产发布有质量门禁、数据状态、宿主入口可用性和回退记录 |

## 不做项

1. 不在浏览器保存、输入或传输供应商 API key。
2. 不把未核实法规显示为已验证事实。
3. 不用示例数据支撑业务结论。
4. 不在没有授权和合规审查的情况下采集平台数据。
5. 不把报告生成做成不可追溯的静态截图导出。
