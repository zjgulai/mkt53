---
title: 静态部署工作流
doc_type: workflow
module: deployment
topic: static-deploy
status: stable
created: 2026-05-31
updated: 2026-06-14
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
npm run deploy:prod:verified
```

`npm run deploy:prod:verified` 调用 `app/scripts/deploy-static-and-verify.sh`，按顺序执行：

1. `npm run deploy:prod`
2. `npm run smoke:prod`
3. `npm run test:e2e:prod`

`npm run deploy:prod` 是底层静态同步入口，调用 `app/scripts/deploy-static.sh`，按顺序执行：

```bash
npm run test
npm run lint
npm audit
npm run build
rsync -az --delete dist/ ubuntu@101.34.52.232:/opt/mkt53/html/
```

`rsync --delete` 会让远端静态目录与本地 `dist/` 保持一致。普通生产发布默认使用 `deploy:prod:verified`，避免部署后漏跑生产 smoke 或生产 E2E；只有排查失败阶段才单独使用 `deploy:prod`。

## 半月数据刷新部署

半月数据刷新不改 nginx，不改宿主 landing，只刷新 mkt53 静态构建中的 `public/periodic-data/*`，并同步写入 `public/weekly-data/*` 作为兼容路径：

```bash
cd app
npm run data:deploy:semi-monthly
```

该命令会先运行 `npm run data:refresh:semi-monthly`，再执行 `deploy:prod:verified`。受限来源会保留为 `connector-required` 或 `manual-required`，不能用脚本输出替代真实授权采集。
该命令会在 `deploy:prod:verified` 基础上产出 `tmp/reports/semi-monthly-run-report-<period>.json`，并在完成后校验 `run report gate` 结果。

需要随生产发布同步 live 浏览器公开证据样本时，显式传参：

```bash
cd app
npm run data:deploy:semi-monthly -- --public-evidence-live --timeout-ms 12000 --max-attempts 2 --public-evidence-timeout-ms 30000
```

服务器 cron 使用本地静态发布入口：

```bash
cd /opt/mkt53/automation/app
npm run data:publish:semi-monthly:local
```

该入口默认写入 `/opt/mkt53/html/`，不依赖 SSH key，不触碰 `ai_video_nginx`、宿主 landing 或其他应用目录。

### 半月发布报告

本地静态发布入口与生产半月发布入口执行后均应同时产出：

- `tmp/reports/semi-monthly-run-report-<period>.json`
- `tmp/reports/semi-monthly-run-report-<period>.md`
- `tmp/data-collection/runs/<period>-report.json`

验收要求：

- `tmp/reports/semi-monthly-run-report-<period>.json` 存在；
- `gate.status = pass`；
- `checks.refresh.status = passed`；
- `checks.deploy.status = passed`；
- `checks.smoke.status = passed`；
- `checks.e2eProd.status = passed` 或 `not-run`（仅本地静态发布时）；
- `checks.dataAudit.status = passed`。

需要重放或补充证据时执行：

```bash
cd app
npm run data:semi-monthly:report -- --period 2026-06-H1 --json
```

## 最新生产验证

2026-06-14，沿用 2026-06-13 DNS 恢复后的验证链路后完成半月发布回归：

| 检查项 | 结果 |
|---|---|
| PR / main CI | PR #17 已合并，main `quality-gate` run `27457652365` 通过 |
| 发布命令 | `npm run deploy:prod:verified` 已执行；`test` 50/50、`lint`、`npm audit`、`build`、`rsync`、`smoke:prod` 均通过 |
| DNS 复核 | `lute-tlz-dddd.top` 在 DNSPod 权威 NS、system、1.1.1.1、8.8.8.8 下均返回 `101.34.52.232`，TTL 600 |
| 完整生产 E2E | `npm run test:e2e:prod` 14/14 通过，覆盖宿主 landing 与 mkt53 目标页桌面/移动端 |
| 生产 manifest | `period=2026-06-H1`，`generatedAt=2026-06-14T05:06:31.080Z`，`refreshCadence=semi-monthly`，`issueCount=0` |
| nginx | `docker exec ai_video_nginx nginx -t` 通过；`/opt/mkt53/html/index.html` 更新时间为 `2026-06-13 13:23:36 +0800` |

历史事故线索：2026-06-13 曾短暂缺失 `lute-tlz-dddd.top` apex A 记录，导致完整生产 E2E 的宿主 landing 用例失败；已通过恢复 `lute-tlz-dddd.top A 101.34.52.232` 解除。

2026-06-12 半月数据发布已完成生产回归：

| 检查项 | 结果 |
|---|---|
| 发布命令 | `npm run data:deploy:semi-monthly -- --public-evidence-live --timeout-ms 12000 --max-attempts 2 --public-evidence-timeout-ms 30000` 通过 |
| 生产 smoke | `npm run smoke:prod` 通过 |
| 生产 E2E | `npm run test:e2e:prod` 14/14 通过 |
| 生产 manifest | `period=2026-06-H1`，`generatedAt=2026-06-14T05:06:31.080Z`，`refreshCadence=semi-monthly`，`issueCount=0` |
| 公开证据 manifest | `mode=live-browser-capture`，`generatedAt=2026-06-14T05:06:37.375Z`，12/12 captured，`businessDataWrites=0` |
| 证据边界页面 | `/#/ai-assistant`、`/#/ai-gallery`、`/#/reports`、`/#/report/r009` 已进入生产 E2E |
| nginx | `docker exec ai_video_nginx nginx -t` 通过 |
| 首页 | `https://mkt.lute-tlz-dddd.top` 返回 HTTP/2 200 |
| 数据来源页 | `/#/data-source` 桌面/移动端显示公开证据状态，无横向溢出 |

本次发布同步 `/opt/mkt53/html/`，并在发布前同步远端自动化副本 `/opt/mkt53/automation/app`；自动化副本备份为 `/opt/mkt53/backups/automation-app-20260612102246/app-code.tgz`。未修改宿主 landing、nginx 配置、compose 配置或其他应用目录。

## 宿主导航页入口

宿主域名 `https://lute-tlz-dddd.top` 是共享静态 landing page，不属于 mkt53 的 Vite 构建产物。2026-06-13 线上回归确认：当前页面是多服务卡片网格，包含 12 个服务入口，其中 mkt 卡片进入本项目；apex DNS 已恢复到 `101.34.52.232`，完整生产 E2E 14/14 通过。

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
5. 修改后执行 `cd app && npm run test:e2e:prod`，把宿主入口和 mkt 目标页一起回归。

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
