---
title: 周度数据采集刷新工作流
doc_type: workflow
module: data-collection
topic: weekly-refresh
status: stable
created: 2026-06-02
updated: 2026-06-02
owner: self
source: human+ai
---

# 周度数据采集刷新工作流

## 当前结论

2026-06-02 审计基线：

| 项 | 结果 |
|---|---:|
| 页面组件 | 43 |
| 数据管理表 | 27 |
| source registry 来源 | 45 |
| 治理配置表 | 27 |
| critical issue | 0 |
| 静态数据但未绑定 registry 的页面 | 0 |

当前没有后端数据库或常驻任务。周度刷新采用“脚本采集 → 生成静态 manifest → 构建部署”的方式，不把受限来源伪装成已采集数据。

## 脚本入口

```bash
cd app
npm run data:audit
npm run data:refresh:weekly
```

输出文件：

| 文件 | 用途 |
|---|---|
| `public/weekly-data/latest.json` | 前端可读取的最新周度采集 manifest |
| `public/weekly-data/connectors.json` | 授权连接器接入 backlog，按连接器类型分组 |
| `tmp/data-collection/audit-latest.json` | 本次一致性审计结果 |
| `tmp/data-collection/runs/<week>.json` | 本地周度运行留痕 |
| `tmp/data-collection/runs/<week>-connectors.json` | 本地连接器 backlog 留痕 |

## 采集状态

| 状态 | 含义 |
|---|---|
| `ok` | 公开来源 URL 可达，已记录 HTTP 状态、content-type、etag/last-modified 和样本哈希 |
| `fetch-error` | 公开来源请求失败，下次重试或人工复核 |
| `source-error` | 公开来源返回非 2xx |
| `connector-required` | 需要授权 API、内部系统或合规爬虫连接器 |
| `manual-required` | 需要采购报告、人工上传或补充来源 URL |

## 周度部署

开发机人工触发远程部署：

```bash
cd app
npm run data:deploy:weekly
```

该命令依次执行：

1. `npm run data:refresh:weekly`
2. `npm run deploy:prod`
3. `npm run smoke:prod`
4. `npm run test:e2e:prod`

服务器本地触发静态刷新：

```bash
cd /opt/mkt53/automation/app
npm run data:publish:weekly:local
```

该命令只写入 `MKT53_STATIC_HTML_DIR`，默认是 `/opt/mkt53/html`，不需要 SSH key，不触碰宿主 landing 或其他应用。

## 服务器 cron

只在 mkt53 专属自动化目录安装：

```bash
cd /opt/mkt53/automation/app
bash scripts/data/install-weekly-cron.sh --print
bash scripts/data/install-weekly-cron.sh
```

默认计划：每周一 03:15 执行 `npm run data:publish:weekly:local`。如需调整：

```bash
MKT53_WEEKLY_CRON="30 2 * * 1" bash scripts/data/install-weekly-cron.sh
```

## 当前连接器实现队列

静态页面已全部绑定 `source-registry.ts`。`npm run data:refresh:weekly` 会根据 `connector-required` 来源生成 `connectorBacklog` 和 `connectors.json`。下一阶段不再是补 source id，而是补真实连接器、采集窗口和复核证据：

| 连接器类型 | 主要来源 | 优先级 |
|---|---|---|
| Amazon Marketplace / Brand Analytics | Amazon、Brand Analytics、BSR、品类采集 | P0 |
| Review / VOC NLP Pipeline | 评论分析、VOC功能趋势、NLP模型 | P0 |
| TikTok / Instagram / Facebook Social Listening | 海外社交声量 | P0 |
| Momcozy CRM | RFM 分层 | P0 |
| YouTube Data API | YouTube 测评追踪 | P1 |
| Import Genius / Customs Trade Data | 海关与进出口数据 | P1 |
| Momcozy ERP / Supply Chain | 供应链、库存、供应商 | P1 |
| AI Generation Audit Log | AI图库、设计助手生成日志 | P2 |
| Compliant Web Review Crawler | 网页评论采集 | P2 |
| Internal Knowledge / Reporting Assets | 知识库、报告元数据、内部定性资料 | P2 |

| 页面 | 下一步 |
|---|---|
| `ReviewAnalysis`、`YoutubeReview`、`FlavorMap`、`FlavorReport` | 接入评论、YouTube 和 VOC NLP 采集任务 |
| `SupplyChain`、`ChannelInterviews`、`StoreInterviews` | 接入 ERP、销售快照、访谈样本和脱敏记录 |
| `BabyCare`、`CategoryAnalysis`、`NursingProducts` | 接入行业报告、Amazon 类目采集和测算公式 |
| `IndustryNews`、`TechNews` | 拆成条目级 URL、发布日期和复核状态 |
| `AIAssistantPage`、`AIGallery`、`DesignAssistant` | 接入 AI 代理请求日志、模型版本、成本和审核状态 |

## 边界

Amazon、CRM、ERP、社交媒体 API、Import Genius、AI/NLP 模型输出必须通过授权连接器接入。当前脚本只记录缺口状态，不绕过平台权限、robots.txt 或内部系统访问控制。
