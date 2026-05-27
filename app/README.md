# mkt53 — Momcozy 市场洞察看板

Momcozy 母婴品牌全球市场分析看板，面向内部团队的数据洞察平台。

**线上地址**：https://mkt.lute-tlz-dddd.top

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 7 |
| 样式 | Tailwind CSS v3 + shadcn/ui |
| 路由 | React Router v7 |
| 图表 | Recharts |
| 地图 | react-simple-maps |
| UI 组件 | Radix UI 全套（40+ 组件）|

## 快速开始

```bash
# 安装依赖（react-simple-maps@3 不支持 React 19，必须加 flag）
npm install --legacy-peer-deps

# 本地开发
npm run dev       # http://localhost:3000

# 生产构建
npm run build     # 产物输出到 dist/
```

## 目录说明

```
app/
├── src/
│   ├── pages/         # 页面组件（按模块分目录）
│   │   ├── market/    # 看市场（6 个子页面）
│   │   ├── competition/ # 看竞争（3 个子页面）
│   │   ├── users/     # 看用户（5 个子页面）
│   │   ├── industry/  # 看行业（9 个子页面）
│   │   └── ai-assistant/ # AI 助手（6 个子页面）
│   ├── components/
│   │   └── ui/        # shadcn/ui 组件库
│   ├── hooks/         # 自定义 Hook
│   └── types/         # TypeScript 类型定义
└── public/images/     # 静态图片（42MB，含品牌/竞品/用户画像）
```

## 部署

构建后直接 rsync 静态文件到服务器，无需重启任何服务：

```bash
npm run build
rsync -avz --progress \
  -e "ssh -i ../ai_video.pem" \
  dist/ ubuntu@101.34.52.232:/opt/mkt53/html/
```

详细部署文档见项目根目录 `AGENTS.md`。
