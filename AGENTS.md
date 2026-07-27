# mkt53 — Momcozy 市场洞察看板

## 项目概述

Momcozy 母婴品牌全球市场分析看板，面向内部团队的数据洞察平台。

- **线上地址**：https://mkt.lute-tlz-dddd.top
- **宿主入口**：https://lute-tlz-dddd.top 首页卡片「市场洞察工作台」
- **GitHub**：https://github.com/zjgulai/mkt53
- **服务器**：101.34.52.232 (VM-0-16-ubuntu)，部署路径 `/opt/mkt53/html/`

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS v3 + shadcn/ui |
| 路由 | React Router v7 |
| 图表 | Recharts 3.8.1 |
| 地图 | 静态 world-map.jpg + 自定义坐标投影 |
| UI 组件 | Radix UI 全套 |

## 目录结构

```
mkt53/
├── AGENTS.md          # 本文件，项目主文档
├── PLAN.md            # 品牌迁移计划（Momcozy 主题化）
├── .gitignore
├── app/               # 前端应用主目录
│   ├── src/
│   │   ├── pages/     # 页面组件
│   │   │   ├── HomePage.tsx
│   │   │   ├── MarketPage.tsx
│   │   │   ├── CompetitionPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   ├── IndustryPage.tsx
│   │   │   ├── AIAssistantPage.tsx
│   │   │   ├── market/        # 市场子页面（6个）
│   │   │   ├── competition/   # 竞争子页面（3个）
│   │   │   ├── users/         # 用户子页面（5个）
│   │   │   ├── industry/      # 行业子页面（9个）
│   │   │   └── ai-assistant/  # AI助手子页面（6个）
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui 组件库（40+）
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── WorldMap.tsx
│   │   ├── hooks/             # 自定义 Hook
│   │   ├── types/             # TypeScript 类型
│   │   ├── lib/utils.ts
│   │   └── styles/
│   ├── public/images/ # 静态图片资源（42MB）
│   │   ├── brand/     # Momcozy 品牌图片
│   │   ├── brand2/    # Momcozy 产品图片
│   │   ├── competitor/ # 竞品图片
│   │   ├── personas/  # 用户画像
│   │   └── ai-gallery/ # AI 生成图片
│   ├── package.json
│   └── vite.config.ts
├── backend/           # BE-01–07 本地治理后端链（FastAPI/PostgreSQL/Alembic；未部署生产）
│   ├── src/mkt53_backend/
│   ├── migrations/
│   ├── tests/
│   ├── compose.yaml   # 独立、零 host port 的本地 Compose 合同
│   └── pyproject.toml
└── docx_extracted/    # 原始需求文档（Word 解析产物）
```

## 路由结构

当前生产使用 `HashRouter`。下列路径表达业务页面意图；真实浏览器地址需要加 `/#`，例如数据管理页是 `https://mkt.lute-tlz-dddd.top/#/data`。不要把 `https://mkt.lute-tlz-dddd.top/data` 当成数据页验证入口。

```
/                    首页（HomePage）
/market              看市场
  /market/trend      市场趋势
  /market/mtl        吸奶器品类
  /market/dtl        哺乳用品
  /market/consumables 婴儿护理
  /market/customs    海关数据
  /market/category   品类分析
/competition         看竞争
  /competition/new   新品竞争
  /competition/region 区域竞争
  /competition/products 产品管理
/users               看用户
  /users/overseas    海外情感
  /users/consumer    消费者访谈
  /users/channel     渠道访谈
  /users/store       门店访谈
  /users/aesthetics  审美偏好
/industry            看行业
  /industry/regulation 法规详情
  /industry/policy-insight 政策洞察
  /industry/flavor-map 功能地图
  /industry/news     行业新闻
  /industry/tech     技术新闻
  /industry/supply   供应链
  /industry/ip       IP分析
  /industry/exhibition 展会
/ai-assistant        AI助手
  /ai-assistant/review-analysis 评论分析
  /ai-assistant/youtube YouTube评论
  /ai-assistant/design 设计助手
  /ai-assistant/knowledge 知识库
  /ai-assistant/comment-data 评论数据
  /ai-assistant/web-review 网页评论
/self                自我洞察
/ai-gallery          AI图库
/reports             报告
/data                数据管理
/data-source         数据源
```

## 品牌设计规范

```css
--brand-primary:   #8B354A  /* Momcozy 深玫瑰红（主色）*/
--brand-primary-hover: #A33D52
--brand-primary-dark:  #6B2A3A
--bg-warm:         #F5EDE8  /* 温暖米白背景 */
--text-primary:    #2D1F1F
--text-secondary:  #7A6B6B
--accent-green:    #5B8C5A  /* 正向数据 */
--accent-red:      #C44545  /* 负向数据 */
```

## 本地开发

```bash
cd app
npm ci          # 按 package-lock.json 安装依赖
npm run dev     # 启动开发服务器 http://localhost:3000
npm run test    # 运行 Vitest 测试
npm run lint    # 运行 ESLint
npm run build   # 构建生产产物到 dist/
npm run data:audit          # 审计页面、数据管理表和 source registry 一致性
npm run data:refresh:semi-monthly # 生成半月数据采集 manifest
npm run data:recovery:semi-monthly:candidate # 生成隔离的 L2 恢复候选，不改 public/production
npm run data:public-evidence:dry-run # 规划公开证据样本，不联网、不写业务数据
npm run quality:p0-05-nginx-candidate # 本地 Docker 验证门户门禁候选，不写生产
```

BE-07 后端本地质量门：

```bash
cd backend
uv sync --frozen
./scripts/quality-be07.sh
```

`backend/` 当前覆盖 identity/RBAC、版本化 source registry、不可变 snapshot、review 状态机、append-only audit 与隔离恢复演练。该链路仍是本地/fixture 验证：没有接生产 nginx、真实 portal identity、生产数据库、connector 或 provider，前端生产仍以静态数据为 canonical。

## 部署

### 服务器环境

| 项 | 值 |
|---|---|
| 服务器 | 101.34.52.232 (腾讯云轻量) |
| OS | Ubuntu 22.04 LTS |
| SSH Key | 默认 `DDDD.pem`；可用 `MKT53_SSH_KEY_PATH` 指定绝对路径（已 gitignore）|
| 静态文件路径 | `/opt/mkt53/html/` |
| 宿主 landing 文件 | `/opt/ai-video/deploy/lighthouse/landing/index.html` |
| nginx 容器 | `ai_video_nginx`（与其他应用共用）|
| nginx 配置 | `/opt/ai-video/deploy/lighthouse/nginx.conf` |
| compose 文件 | `/opt/ai-video/deploy/lighthouse/docker-compose.prod.yml` |
| SSL 证书 | Let's Encrypt 泛域名 `*.lute-tlz-dddd.top`（容器内 `/etc/letsencrypt`）|

### 更新部署（日常流程）

```bash
cd app
npm run deploy:prod:verified
```

`deploy:prod:verified` 会先调用 `deploy:prod`，再执行 `smoke:prod` 和 `test:e2e:prod`。`deploy:prod` 会依次执行 `test`、`lint`、`npm audit`、`build`，然后通过 `rsync --delete` 替换 `/opt/mkt53/html/` 静态文件；nginx 无需重启。

需要单独重跑生产入口回归：

```bash
cd app
npm run test:e2e:prod
```

`test:e2e:prod` 不启动本地 dev server，直接验证宿主 landing 的 `card mkt`、12 个服务卡片数量、mkt 目标页标题和桌面/移动端无水平溢出。

2026-06-13 已恢复 `lute-tlz-dddd.top A 101.34.52.232`。DNSPod 权威 NS、1.1.1.1、8.8.8.8 和本机解析均返回 `101.34.52.232`，完整 `npm run test:e2e:prod` 已恢复 14/14 通过。

2026-07-24 经独立 nginx 写入授权和真实授权会话验收，P0-05 门户门禁已激活：完整旧配置以 root-only 备份保留，完整候选 `nginx -t` 通过后仅替换 mkt server block，并只 reload nginx、未重启或重建容器。未授权 root、deep route 与 manifest 均 302 到 apex login 且 `private, no-store`；真实会话首页和 `/#/data` 可访问，生产 E2E 8/8、auth-gated smoke 通过。机器证据见 `docs/reviews/mkt53-project-review-20260722/evidence/p0-05-production-activation-20260724.json`。

半月数据刷新：

```bash
cd app
npm run data:refresh:semi-monthly
npm run data:deploy:semi-monthly
```

服务器 cron 的目标合同是在 `/opt/mkt53/automation/app` 内每月 1 日和 16 日 09:00 执行 `npm run data:publish:semi-monthly:local`，默认只写入 `/opt/mkt53/html/`。2026-07-23 经独立生产写入授权，automation 副本已同步并通过 staging gate，`2026-07-H2` periodic/weekly 共 10 个生产文件完成 HTTPS 哈希核对，半月 cron 已唯一安装；首次计划运行是 `2026-08-01T09:00:00+08:00`，在该时间窗前不得声称定时执行已成功。`data:refresh:semi-monthly` 生成 `public/periodic-data/latest.json`、`connectors.json`、`source-tasks.json`，并同步 `public/weekly-data/*` 兼容路径；不要使用 `public/data/`，该路径会与前端 `/data` 路由冲突。

授权前使用 `npm run data:recovery:semi-monthly:candidate` 生成 `tmp/data-collection/recovery-candidates/<period>/` 隔离候选。该命令固定 no-network/dry-run，不覆盖 canonical public 文件，不安装 cron、不部署；`install-semi-monthly-cron.sh --print` 也必须保持零目录写入。候选通过只代表 L2 工作流与副作用边界成立；是否已生产恢复必须以独立授权后的备份、发布、哈希、cron 和运行日志证据为准。

公开证据样本通过 `data:public-evidence:dry-run` / `data:public-evidence:live` 和 `--public-evidence-live` 接入半月刷新。公开证据只保留 URL、标题、hash、匹配项、摘要和本地 `tmp/public-evidence/` 证据路径；不得把 Amazon 公开页样本写成 Amazon 平台级价格、评论、SKU、销量或 BSR 数据。Amazon、CRM、ERP、社交媒体 API、Import Genius、VOC/NLP 和访谈类来源必须保持 `connector-required` 或 `manual-required`，直到授权连接器或人工凭证接入；不得把缺失采集伪装成真实数据。

### 宿主导航页入口卡片

`https://lute-tlz-dddd.top` 是共享宿主导航页。2026-06-02 线上确认：宿主首页是多服务卡片网格，当前包含 12 个服务入口，其中 mkt 卡片进入本项目：

| 字段 | 当前值 |
|---|---|
| subtitle | `Market Insight Platform` |
| 标题 | `市场洞察工作台` |
| 链接 | `https://mkt.lute-tlz-dddd.top` |
| 描述 | `Momcozy 母婴品牌全球市场分析 · 竞品追踪 · 用户画像 · 行业趋势` |
| chips | `竞品分析`、`用户画像`、`市场趋势` |
| CTA | `打开市场看板` |

该入口卡片不在 mkt53 的 Vite 构建产物里。卡片文案或链接需要变更时，维护远端 `/opt/ai-video/deploy/lighthouse/landing/index.html`，先备份，再替换单文件；通常不需要重启 `ai_video_nginx`。

### 首次/变更 nginx 配置后重建容器

```bash
# 只重建 nginx，不影响其他容器
ssh -i "${MKT53_SSH_KEY_PATH:-./DDDD.pem}" ubuntu@101.34.52.232 \
  "cd /opt/ai-video/deploy/lighthouse && \
   docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate nginx"
```

### nginx server block 位置

`/opt/ai-video/deploy/lighthouse/nginx.conf` 中 `mkt` server block：

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name mkt.lute-tlz-dddd.top;
    ssl_certificate /etc/letsencrypt/live/lute-tlz-dddd.top/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lute-tlz-dddd.top/privkey.pem;
    root /var/www/mkt53;   # 映射自宿主 /opt/mkt53/html
    ...
}
```

## 关联服务

| 域名 | 服务 |
|---|---|
| lute-tlz-dddd.top | 宿主导航页（landing），多服务入口页，其中 mkt 卡片进入本项目 |
| mkt.lute-tlz-dddd.top | **本项目** |
| video.lute-tlz-dddd.top | AI 视频创作平台 |
| voc.lute-tlz-dddd.top | Apache Superset VOC 分析 |
| report.lute-tlz-dddd.top | VOC 洞察报告 |
| shopify.lute-tlz-dddd.top | Momcozy 独立站诊断报告 |

## 注意事项

- SSH key 默认使用仓库根目录 `DDDD.pem`；也可设置 `MKT53_SSH_KEY_PATH`，所有 `*.pem` 均不进仓库
- `app/dist/` 和 `app/node_modules/` 已 gitignore，不提交
- GitHub Actions `quality-gate` 包含独立 app/backend job：app 执行聚合 release evidence，backend 固定 Python/uv 后执行 lock、Ruff、pytest/coverage、Compose 与 BE-07 隔离恢复门禁
- `docx_extracted/` 为原始需求文档解析产物，仅供参考，不参与构建

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` and then `graphify cluster-only . --min-community-size=0` to keep the graph current and render every community that has a non-file node (AST-only, no API cost; file-only communities remain in `graph.json`/`graph.html`).
