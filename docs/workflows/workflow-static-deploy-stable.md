---
title: 静态部署工作流
doc_type: workflow
module: deployment
topic: static-deploy
status: stable
created: 2026-05-31
updated: 2026-06-02
owner: self
source: human+ai
---

# 静态部署工作流

## 生产环境

| 项 | 值 |
|---|---|
| 线上地址 | `https://mkt.lute-tlz-dddd.top` |
| 宿主入口 | `https://lute-tlz-dddd.top` |
| 服务器 | `ubuntu@101.34.52.232` |
| SSH key | 仓库根目录 `ai_video.pem`，已被 `.gitignore` 排除 |
| 静态文件路径 | `/opt/mkt53/html/` |
| 宿主 landing 文件 | `/opt/ai-video/deploy/lighthouse/landing/index.html` |
| 应用构建目录 | `app/dist/` |
| nginx 容器 | `ai_video_nginx` |
| nginx root | `/var/www/mkt53` |
| landing root | `/var/www/landing`，由 `./landing:/var/www/landing:ro` 挂载 |

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

## 宿主导航页入口

宿主域名 `https://lute-tlz-dddd.top` 是共享静态 landing page，不属于 mkt53 的 Vite 构建产物。2026-06-02 线上确认：当前页面是多服务卡片网格，包含 12 个服务入口，其中 mkt 卡片进入本项目：

| 字段 | 当前值 |
|---|---|
| CSS class | `card mkt` |
| subtitle | `Market Insight Platform` |
| 标题 | `市场洞察工作台` |
| 链接 | `https://mkt.lute-tlz-dddd.top` |
| 中文描述 | `Momcozy 母婴品牌全球市场分析 · 竞品追踪 · 用户画像 · 行业趋势` |
| chips | `竞品分析`、`用户画像`、`市场趋势` |
| CTA | `打开市场看板` |

维护规则：

1. `npm run deploy:prod` 只更新 `/opt/mkt53/html/`，不会更新宿主 landing。
2. 修改宿主卡片前，先备份 `/opt/ai-video/deploy/lighthouse/landing/index.html`。
3. 只替换 landing 的 `index.html`；不改 `docker-compose.prod.yml`，不改 `nginx.conf`，不重启容器。
4. 修改后验证 `https://lute-tlz-dddd.top/` 桌面和移动端无水平溢出，并确认 mkt 卡片链接可打开。

备份与回滚模板：

```bash
ts=$(date +%Y%m%d_%H%M%S)
ssh -i ai_video.pem ubuntu@101.34.52.232 \
  "mkdir -p /opt/backups/lute_landing_${ts} && \
   cp /opt/ai-video/deploy/lighthouse/landing/index.html /opt/backups/lute_landing_${ts}/index.html"

# 回滚时把 {backup_dir} 换成实际备份目录
ssh -i ai_video.pem ubuntu@101.34.52.232 \
  "cp /opt/backups/{backup_dir}/index.html /opt/ai-video/deploy/lighthouse/landing/index.html"
```

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
