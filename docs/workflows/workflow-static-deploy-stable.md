---
title: 静态部署工作流
doc_type: workflow
module: deployment
topic: static-deploy
status: stable
created: 2026-05-31
updated: 2026-05-31
owner: self
source: human+ai
---

# 静态部署工作流

## 生产环境

| 项 | 值 |
|---|---|
| 线上地址 | `https://mkt.lute-tlz-dddd.top` |
| 服务器 | `ubuntu@101.34.52.232` |
| SSH key | 仓库根目录 `ai_video.pem`，已被 `.gitignore` 排除 |
| 静态文件路径 | `/opt/mkt53/html/` |
| 应用构建目录 | `app/dist/` |
| nginx 容器 | `ai_video_nginx` |
| nginx root | `/var/www/mkt53` |

## 日常部署

在仓库根目录执行：

```bash
cd app
npm run deploy:prod
npm run smoke:prod
```

`npm run deploy:prod` 调用 `app/scripts/deploy-static.sh`，按顺序执行：

```bash
npm run test
npm run lint
npm audit
npm run build
rsync -az --delete dist/ ubuntu@101.34.52.232:/opt/mkt53/html/
```

`rsync --delete` 会让远端静态目录与本地 `dist/` 保持一致。执行前必须确认当前构建产物来自已通过门禁的代码。

## 生产 smoke

`npm run smoke:prod` 调用 `app/scripts/smoke-prod.sh`，默认检查 `https://mkt.lute-tlz-dddd.top`。

当前检查范围：

| 检查项 | 判定 |
|---|---|
| `/`、`/market/trend`、`/industry/regulation`、`/ai-assistant/design` | HTTP 200 |
| 首页引用的 JavaScript assets | 可下载 |
| JavaScript assets | 不包含供应商 key、GitHub token、Bearer header、调试属性和已移除依赖标记 |
| `/images/world-map.jpg` | 可访问 |

需要临时检查其他环境时使用：

```bash
cd app
BASE_URL=https://example.com npm run smoke:prod
```

## nginx 变更

静态文件更新不需要重启 nginx。只有修改 nginx server block、证书挂载、volume 映射或 compose 文件时，才重建 nginx 容器：

```bash
ssh -i ai_video.pem ubuntu@101.34.52.232 \
  "cd /opt/ai-video/deploy/lighthouse && \
   docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate nginx"
```

## 回退原则

1. 优先通过 Git 回到上一个已验证提交后重新执行 `npm run deploy:prod`。
2. 不直接在服务器 `/opt/mkt53/html/` 手工改文件。
3. 如果远端目录疑似污染，继续使用 `rsync --delete` 以本地构建产物覆盖。
