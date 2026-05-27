# mkt53 — Momcozy 市场洞察看板

## 项目概述

Momcozy 母婴品牌全球市场分析看板，面向内部团队的数据洞察平台。

- **线上地址**：https://mkt.lute-tlz-dddd.top
- **GitHub**：https://github.com/zjgulai/mkt53
- **服务器**：101.34.52.232 (VM-0-16-ubuntu)，部署路径 `/opt/mkt53/html/`

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 7 |
| 样式 | Tailwind CSS v3 + shadcn/ui |
| 路由 | React Router v7 |
| 图表 | Recharts |
| 地图 | react-simple-maps |
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
└── docx_extracted/    # 原始需求文档（Word 解析产物）
```

## 路由结构

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
npm install --legacy-peer-deps  # react-simple-maps@3 不支持 React 19，需要此 flag
npm run dev                      # 启动开发服务器 http://localhost:3000
npm run build                    # 构建生产产物到 dist/
```

> **注意**：`npm ci` 会因 `react-simple-maps@3.0.0` peer dep 冲突报错，必须加 `--legacy-peer-deps`。

## 部署

### 服务器环境

| 项 | 值 |
|---|---|
| 服务器 | 101.34.52.232 (腾讯云轻量) |
| OS | Ubuntu 22.04 LTS |
| SSH Key | `ai_video.pem`（仓库根目录，已 gitignore）|
| 静态文件路径 | `/opt/mkt53/html/` |
| nginx 容器 | `ai_video_nginx`（与其他应用共用）|
| nginx 配置 | `/opt/ai-video/deploy/lighthouse/nginx.conf` |
| compose 文件 | `/opt/ai-video/deploy/lighthouse/docker-compose.prod.yml` |
| SSL 证书 | Let's Encrypt 泛域名 `*.lute-tlz-dddd.top`（容器内 `/etc/letsencrypt`）|

### 更新部署（日常流程）

```bash
# 1. 构建
cd app && npm run build

# 2. 上传（静态文件替换，nginx 无需重启）
rsync -avz --progress \
  -e "ssh -i ../ai_video.pem" \
  dist/ ubuntu@101.34.52.232:/opt/mkt53/html/
```

### 首次/变更 nginx 配置后重建容器

```bash
# 只重建 nginx，不影响其他容器
ssh -i ai_video.pem ubuntu@101.34.52.232 \
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
| lute-tlz-dddd.top | 宿主导航页（landing），包含本项目入口卡片 |
| mkt.lute-tlz-dddd.top | **本项目** |
| video.lute-tlz-dddd.top | AI 视频创作平台 |
| voc.lute-tlz-dddd.top | Apache Superset VOC 分析 |
| report.lute-tlz-dddd.top | VOC 洞察报告 |
| shopify.lute-tlz-dddd.top | Momcozy 独立站诊断报告 |

## 注意事项

- `ai_video.pem` 已加入 `.gitignore`，不进仓库，本地保留在项目根目录
- `app/dist/` 和 `app/node_modules/` 已 gitignore，不提交
- 构建产物直接 rsync 到服务器，无 CI/CD 流程
- `docx_extracted/` 为原始需求文档解析产物，仅供参考，不参与构建
