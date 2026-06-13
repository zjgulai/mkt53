---
title: mkt53 系统图谱输出目录
doc_type: architecture
module: mkt53
topic: system-map-artifacts
status: stable
created: 2026-06-04
updated: 2026-06-12
owner: self
source: human+ai
---

# mkt53 系统图谱输出目录

## 产物清单

| 类型 | 文件 |
|---|---|
| 深度理解与问题工作流文档 | `project-understanding-and-workflows-stable.md` |
| 业务架构图 | `diagrams/business-architecture.excalidraw`、`renders/business-architecture.svg` |
| 业务流程图 | `diagrams/business-workflow.excalidraw`、`renders/business-workflow.svg` |
| 数据流转图 | `diagrams/data-flow.excalidraw`、`renders/data-flow.svg` |
| 指标体系图 | `diagrams/indicator-system.excalidraw`、`renders/indicator-system.svg` |
| 数据血缘关系图 | `diagrams/data-lineage.excalidraw`、`renders/data-lineage.svg` |
| 图谱生成器 | `generate-excalidraw-diagrams.mjs` |
| 离线渲染器 | `render-excalidraw-fallback.mjs` |
| skill 模板渲染适配器 | `render-excalidraw-with-app-playwright.mjs` |

## 使用的证据源

- CodeGraph 对 2026-06-04 项目快照的索引：163 文件、1,578 节点、2,633 边。
- `app/src/App.tsx` 路由定义：46 条路由。
- `app/src/pages/DataManage.tsx`：6 大数据模块、27 张数据表、数据治理与血缘视图。
- `app/src/data/source-registry.ts`：45 个来源条目。
- `app/scripts/data/*`：一致性审计、半月采集、公开证据样本、连接器 backlog、Amazon 私有输入脚本。
- `app/public/periodic-data/latest.json`：2026-06-12 半月 manifest，周期 `2026-06-H1`。
- `app/public/periodic-data/public-evidence-samples.json`：2026-06-12 浏览器辅助公开证据样本，12/12 captured。
- `app/public/weekly-data/latest.json`：兼容路径，由半月刷新脚本同步写入。
- `app/package.json`：测试、构建、部署、E2E 和数据刷新脚本。

## Skill 状态

- `excalidraw-diagram-generator`：已安装并使用。
- `figma-generate-diagram` 的 architecture reference：已读取并用于架构图约束参考。
- `fireworks-tech-graph`：本机未安装，OpenAI curated skills 查询未发现同名候选；未伪造安装。
- `Architecture Diagram Skill`：本机未发现同名单独 skill；使用 Figma 插件中的 `figma-generate-diagram/references/architecture.md` 作为架构图规范替代。

## 渲染说明

标准 Excalidraw 源文件保存在 `diagrams/`，可直接导入 Excalidraw 编辑。`renders/*.svg` 是可提交的轻量渲染结果；`renders/*.png` 是本地生成物，默认不进入 git。

首次尝试使用 `excalidraw-diagram-generator` 自带 `render_excalidraw.py`，但当前环境中该 skill 的独立 Playwright Chromium 下载卡住，且 `render_template.html` 依赖的 `esm.sh` 模块在浏览器渲染时超时。为保证交付，本目录提供 `render-excalidraw-fallback.mjs`，使用项目已验证可用的 Playwright Chromium 离线渲染矩形、菱形、箭头与文本，并保留手绘线条效果。

## 复生成命令

```bash
node docs/architecture/mkt53-system-map-20260604/generate-excalidraw-diagrams.mjs

node docs/architecture/mkt53-system-map-20260604/render-excalidraw-fallback.mjs \
  docs/architecture/mkt53-system-map-20260604/diagrams/business-architecture.excalidraw \
  docs/architecture/mkt53-system-map-20260604/renders/business-architecture.png \
  2600
```

其余图同理替换文件名。
