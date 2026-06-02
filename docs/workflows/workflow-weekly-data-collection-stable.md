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
| source registry 来源 | 26 |
| 治理配置表 | 27 |
| critical issue | 0 |
| 静态数据但未绑定 registry 的页面 | 18 |

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
| `public/data/weekly/latest.json` | 前端可读取的最新周度采集 manifest |
| `tmp/data-collection/audit-latest.json` | 本次一致性审计结果 |
| `tmp/data-collection/runs/<week>.json` | 本地周度运行留痕 |

## 采集状态

| 状态 | 含义 |
|---|---|
| `ok` | 公开来源 URL 可达，已记录 HTTP 状态、content-type、etag/last-modified 和样本哈希 |
| `fetch-error` | 公开来源请求失败，下次重试或人工复核 |
| `source-error` | 公开来源返回非 2xx |
| `connector-required` | 需要授权 API、内部系统或合规爬虫连接器 |
| `manual-required` | 需要采购报告、人工上传或补充来源 URL |

## 周度部署

人工触发：

```bash
cd app
npm run data:deploy:weekly
```

该命令依次执行：

1. `npm run data:refresh:weekly`
2. `npm run deploy:prod`
3. `npm run smoke:prod`
4. `npm run test:e2e:prod`

## 服务器 cron

只在 mkt53 专属应用目录安装：

```bash
cd app
bash scripts/data/install-weekly-cron.sh --print
bash scripts/data/install-weekly-cron.sh
```

默认计划：每周一 03:15 执行 `npm run data:deploy:weekly`。如需调整：

```bash
MKT53_WEEKLY_CRON="30 2 * * 1" bash scripts/data/install-weekly-cron.sh
```

## 当前补齐队列

下列页面有静态数组数据，但尚未与 `source-registry.ts` 建立明确绑定。下一阶段按业务优先级补 source id、来源口径和采集状态：

| 页面 | 当前处理 |
|---|---|
| `AIAssistantPage`、`AIGallery`、`DesignAssistant`、`ReviewAnalysis`、`YoutubeReview` | 标记 AI/内容资产来源 |
| `FlavorMap`、`FlavorReport`、`IndustryNews`、`SupplyChain`、`TechNews` | 补行业来源 URL 或手工采集规则 |
| `BabyCare`、`CategoryAnalysis`、`NursingProducts` | 补品类数据来源和采集窗口 |
| `Aesthetics`、`ChannelInterviews`、`StoreInterviews` | 补用户研究样本口径 |
| `DataManage`、`DataSourcePage` | 作为治理页面，不直接作为业务事实来源 |

## 边界

Amazon、CRM、ERP、社交媒体 API、Import Genius、AI/NLP 模型输出必须通过授权连接器接入。当前脚本只记录缺口状态，不绕过平台权限、robots.txt 或内部系统访问控制。
