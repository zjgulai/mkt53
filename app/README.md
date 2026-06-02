---
title: mkt53 应用入口
doc_type: other
module: app
topic: readme
status: stable
created: 2026-05-31
updated: 2026-06-02
owner: self
source: human+ai
---

# mkt53 App

本目录是 Momcozy 市场洞察看板的 Vite 应用。

```bash
npm ci
npm run dev
```

本地开发服务默认运行在 `http://localhost:3000`。

常用命令：

```bash
npm run test
npm run lint
npm audit
npm run build
npm run test:e2e
npm run test:e2e:prod
```

生产部署：

```bash
npm run deploy:prod
npm run smoke:prod
```

项目入口、质量门禁、部署流程和数据来源治理见仓库根目录 `README.md` 与 `docs/`。
