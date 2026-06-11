#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const diagramsDir = join(root, 'diagrams');
mkdirSync(diagramsDir, { recursive: true });

const palette = {
  primaryFill: '#dbeafe',
  primaryStroke: '#1e3a5f',
  secondaryFill: '#bfdbfe',
  tertiaryFill: '#eff6ff',
  startFill: '#fed7aa',
  startStroke: '#c2410c',
  successFill: '#a7f3d0',
  successStroke: '#047857',
  warningFill: '#fee2e2',
  warningStroke: '#dc2626',
  decisionFill: '#fef3c7',
  decisionStroke: '#b45309',
  aiFill: '#ddd6fe',
  aiStroke: '#6d28d9',
  dataFill: '#dcfce7',
  dataStroke: '#166534',
  opsFill: '#f1f5f9',
  opsStroke: '#334155',
  textTitle: '#1e40af',
  textBody: '#374151',
  textMuted: '#64748b',
  dark: '#1e293b',
  jsonGreen: '#22c55e',
};

let idCounter = 1;
const nextId = (prefix) => `${prefix}_${idCounter++}`;

function baseElement(type, x, y, width, height, options = {}) {
  return {
    id: options.id ?? nextId(type),
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: options.strokeColor ?? palette.primaryStroke,
    backgroundColor: options.backgroundColor ?? 'transparent',
    fillStyle: options.fillStyle ?? 'hachure',
    strokeWidth: options.strokeWidth ?? 2,
    strokeStyle: options.strokeStyle ?? 'solid',
    roughness: options.roughness ?? 2,
    opacity: 100,
    groupIds: options.groupIds ?? [],
    frameId: null,
    roundness: type === 'rectangle' ? { type: 3 } : null,
    seed: options.seed ?? idCounter * 101,
    version: 1,
    versionNonce: idCounter * 997,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
  };
}

function text(textValue, x, y, options = {}) {
  const fontSize = options.fontSize ?? 18;
  const lines = String(textValue).split('\n');
  const width = options.width ?? Math.max(...lines.map((line) => line.length), 1) * fontSize * 0.62;
  const height = options.height ?? lines.length * fontSize * 1.28;
  return {
    ...baseElement('text', x, y, width, height, {
      strokeColor: options.strokeColor ?? palette.textBody,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      roughness: 0,
      seed: options.seed,
    }),
    text: textValue,
    fontSize,
    fontFamily: 3,
    textAlign: options.textAlign ?? 'left',
    verticalAlign: options.verticalAlign ?? 'top',
    baseline: Math.round(fontSize * 0.95),
    containerId: null,
    originalText: textValue,
    lineHeight: 1.25,
  };
}

function node(label, x, y, width, height, options = {}) {
  const shape = baseElement(options.type ?? 'rectangle', x, y, width, height, options);
  const labelElement = text(label, x + 14, y + 12, {
    width: width - 28,
    fontSize: options.fontSize ?? 18,
    strokeColor: options.textColor ?? palette.textBody,
    textAlign: options.textAlign ?? 'center',
  });
  return [shape, labelElement];
}

function artifact(label, code, x, y, width, height) {
  return [
    baseElement('rectangle', x, y, width, height, {
      strokeColor: palette.opsStroke,
      backgroundColor: palette.dark,
      fillStyle: 'solid',
      roughness: 1,
    }),
    text(label, x + 14, y + 12, {
      width: width - 28,
      fontSize: 15,
      strokeColor: '#ffffff',
    }),
    text(code, x + 14, y + 42, {
      width: width - 28,
      fontSize: 14,
      strokeColor: palette.jsonGreen,
    }),
  ];
}

function arrow(x1, y1, x2, y2, label = '', options = {}) {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const el = {
    ...baseElement('arrow', minX, minY, Math.abs(x2 - x1), Math.abs(y2 - y1), {
      strokeColor: options.strokeColor ?? palette.primaryStroke,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      roughness: 1,
      strokeStyle: options.strokeStyle ?? 'solid',
    }),
    points: [
      [x1 - minX, y1 - minY],
      [x2 - minX, y2 - minY],
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: options.endArrowhead ?? 'arrow',
  };

  if (!label) return [el];
  const lx = (x1 + x2) / 2 - Math.min(120, label.length * 4);
  const ly = (y1 + y2) / 2 - 20;
  return [
    el,
    text(label, lx, ly, {
      fontSize: options.fontSize ?? 13,
      strokeColor: options.strokeColor ?? palette.textMuted,
      width: Math.max(120, label.length * 8),
    }),
  ];
}

function section(label, x, y, width, height, options = {}) {
  return [
    baseElement('rectangle', x, y, width, height, {
      strokeColor: options.strokeColor ?? palette.primaryStroke,
      backgroundColor: options.backgroundColor ?? palette.tertiaryFill,
      fillStyle: 'hachure',
      strokeStyle: options.strokeStyle ?? 'dashed',
      roughness: 2,
    }),
    text(label, x + 16, y + 14, {
      fontSize: options.fontSize ?? 22,
      strokeColor: options.titleColor ?? palette.textTitle,
      width: width - 32,
    }),
  ];
}

function diagram(elements) {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'mkt53-system-map-20260604',
    elements,
    appState: {
      gridSize: null,
      viewBackgroundColor: '#ffffff',
    },
    files: {},
  };
}

function save(name, elements) {
  const path = join(diagramsDir, `${name}.excalidraw`);
  writeFileSync(path, `${JSON.stringify(diagram(elements), null, 2)}\n`);
  return path;
}

function businessArchitecture() {
  idCounter = 1;
  const e = [];
  e.push(text('mkt53 业务架构图', 40, 30, { fontSize: 34, strokeColor: palette.textTitle, width: 900 }));
  e.push(text('Momcozy 市场洞察工作台：业务问题 -> 页面域 -> 数据治理 -> 半月采集 -> 腾讯云静态部署', 44, 78, { fontSize: 17, strokeColor: palette.textMuted, width: 1260 }));

  e.push(...section('用户与决策入口', 40, 130, 330, 640, { backgroundColor: '#fff7ed', strokeColor: palette.startStroke }));
  [
    ['市场负责人\n区域/品类机会', 70, 205],
    ['竞品分析\nSKU/价格/新品', 70, 325],
    ['用户研究\n画像/访谈/情感', 70, 445],
    ['产品/运营\n路线/投放/报告', 70, 565],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 270, 78, { backgroundColor: palette.startFill, strokeColor: palette.startStroke })));

  e.push(...section('前端业务域 (HashRouter)', 430, 130, 520, 640, { backgroundColor: '#eff6ff' }));
  [
    ['首页 /', 465, 205],
    ['看市场\n/market + 6 子页', 640, 205],
    ['看竞争\n/competition + 3 子页', 815, 205],
    ['看用户\n/users + 7 子页', 465, 335],
    ['看行业\n/industry + 11 子页', 640, 335],
    ['看自己\n/self', 815, 335],
    ['AI助手\n/ai-assistant + 6 子页', 465, 465],
    ['AI图库 / 报告\n/ai-gallery /reports', 640, 465],
    ['数据管理 / 来源\n/data /data-source', 815, 465],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 145, 84, { backgroundColor: palette.primaryFill, strokeColor: palette.primaryStroke, fontSize: 15 })));

  e.push(...section('数据治理内核', 1010, 130, 430, 640, { backgroundColor: '#ecfdf5', strokeColor: palette.dataStroke }));
  [
    ['sourceRegistry.ts\n45 来源条目', 1045, 215],
    ['DataManage.tsx\n6 模块 / 27 表 / 血缘', 1045, 340],
    ['tableGovernance\nowner / steward / PII / freshness', 1045, 465],
    ['periodic-data/latest.json\n2026-06-H1 状态', 1045, 590],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 350, 84, { backgroundColor: palette.dataFill, strokeColor: palette.dataStroke, fontSize: 15 })));

  e.push(...section('采集与连接器', 1500, 130, 410, 640, { backgroundColor: '#fff7ed', strokeColor: palette.decisionStroke }));
  [
    ['public-url-check\n8 类公开来源', 1535, 205],
    ['local-file-check\n2 个代码资产', 1535, 315],
    ['manual-required\n12 个人工/报告来源', 1535, 425],
    ['connector-required\n23 个授权来源', 1535, 535],
    ['connector backlog\n10 组接入任务', 1535, 645],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 335, 74, { backgroundColor: palette.decisionFill, strokeColor: palette.decisionStroke, fontSize: 15 })));

  e.push(...section('部署与验收', 1970, 130, 400, 640, { backgroundColor: '#f8fafc', strokeColor: palette.opsStroke }));
  [
    ['test / lint / npm audit\nbuild 质量门', 2005, 205],
    ['Vite dist 静态包\nassets + periodic-data', 2005, 325],
    ['腾讯云轻量服务器\n/opt/mkt53/html', 2005, 445],
    ['ai_video_nginx\nmkt.lute-tlz-dddd.top', 2005, 565],
    ['smoke + Playwright E2E\n14 prod / 46 local', 2005, 685],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 330, 74, { backgroundColor: palette.opsFill, strokeColor: palette.opsStroke, fontSize: 15 })));

  [250, 370, 490, 610].forEach((y) => e.push(...arrow(370, y, 430, y, '业务问题进入页面域')));
  e.push(...arrow(950, 380, 1010, 380, '页面读取/展示'));
  e.push(...arrow(1440, 380, 1500, 380, '分类采集'));
  e.push(...arrow(1910, 380, 1970, 380, '构建部署'));
  e.push(...arrow(2170, 685, 2170, 760, '线上验收', { strokeColor: palette.successStroke }));
  e.push(...artifact('当前线上数据状态', '{ total:45, ok:10, manual:12, connector:23, issues:0 }', 990, 800, 930, 110));
  return e;
}

function businessWorkflow() {
  idCounter = 1;
  const e = [];
  e.push(text('mkt53 业务流程图', 40, 30, { fontSize: 34, strokeColor: palette.textTitle, width: 820 }));
  e.push(text('从业务问题到证据分层、分析产出、补采集任务和部署验收的闭环', 44, 78, { fontSize: 17, strokeColor: palette.textMuted, width: 1180 }));

  const steps = [
    ['业务问题输入\n市场/竞品/用户/行业/AI', 80, 170, palette.startFill, palette.startStroke],
    ['路由到专题页面\n46 routes / 43 pages', 420, 170, palette.primaryFill, palette.primaryStroke],
    ['读取页面数据与指标\n静态数组 / 表资产 / registry', 760, 170, palette.primaryFill, palette.primaryStroke],
    ['来源状态判断\nverified / needs-review / example', 1100, 170, palette.decisionFill, palette.decisionStroke],
  ];
  steps.forEach(([label, x, y, fill, stroke]) => e.push(...node(label, x, y, 255, 90, { backgroundColor: fill, strokeColor: stroke })));
  e.push(...arrow(335, 215, 420, 215, '选择业务域'));
  e.push(...arrow(675, 215, 760, 215, '进入页面'));
  e.push(...arrow(1015, 215, 1100, 215, '追溯来源'));

  e.push(...node('是否已具备\n可用证据?', 1470, 165, 150, 110, { type: 'diamond', backgroundColor: palette.decisionFill, strokeColor: palette.decisionStroke, fontSize: 16 }));
  e.push(...arrow(1355, 215, 1470, 220, '证据门'));

  e.push(...node('产出洞察/报告\n机会点/风险/行动建议', 1780, 120, 300, 90, { backgroundColor: palette.successFill, strokeColor: palette.successStroke }));
  e.push(...node('生成补证任务\nmanual / connector backlog', 1780, 290, 300, 90, { backgroundColor: palette.warningFill, strokeColor: palette.warningStroke }));
  e.push(...arrow(1620, 200, 1780, 165, '是: ok/verified/A-B', { strokeColor: palette.successStroke }));
  e.push(...arrow(1620, 245, 1780, 335, '否: 缺样本/授权/口径', { strokeColor: palette.warningStroke }));

  e.push(...section('横向问题分流', 100, 410, 760, 360, { backgroundColor: '#eff6ff' }));
  [
    ['市场机会\nTAM/SAM/SOM/区域/品类', 130, 485],
    ['竞品监测\nAmazon/SKU/价格/新品', 390, 485],
    ['用户洞察\n画像/访谈/情感/审美', 650, 485],
    ['行业风险\n法规/供应链/IP/展会', 130, 610],
    ['AI工作流\n评论/NLP/设计/知识库', 390, 610],
    ['数据治理\n来源/表/字段/血缘', 650, 610],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 205, 76, { backgroundColor: palette.tertiaryFill, strokeColor: palette.primaryStroke, fontSize: 14 })));

  e.push(...section('纵向治理闭环', 940, 410, 620, 360, { backgroundColor: '#ecfdf5', strokeColor: palette.dataStroke }));
  [
    ['决策层\n优先级/风险边界', 980, 485],
    ['分析层\n指标/样本/口径', 1180, 485],
    ['数据层\n表/字段/owner', 1380, 485],
    ['采集层\nURL/连接器/人工', 1080, 620],
    ['运维层\n测试/部署/E2E', 1280, 620],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 165, 76, { backgroundColor: palette.dataFill, strokeColor: palette.dataStroke, fontSize: 14 })));

  e.push(...section('停止条件', 1640, 430, 520, 320, { backgroundColor: '#f8fafc', strokeColor: palette.opsStroke }));
  e.push(...artifact('质量门', 'issueCount=0\ncriticalIssueCount=0\nconnector-required 不伪造为 ok\n生产 E2E 14 passed', 1680, 500, 440, 185));
  e.push(...arrow(1930, 380, 1930, 500, '进入任务/发布队列', { strokeColor: palette.opsStroke }));
  e.push(...arrow(1780, 165, 1780, 430, '沉淀报告'));
  e.push(...arrow(1930, 380, 1560, 700, '刷新后回流治理'));
  return e;
}

function dataFlow() {
  idCounter = 1;
  const e = [];
  e.push(text('mkt53 数据流转图', 40, 30, { fontSize: 34, strokeColor: palette.textTitle, width: 820 }));
  e.push(text('真实数据、人工来源、授权连接器和静态部署之间的流向与边界', 44, 78, { fontSize: 17, strokeColor: palette.textMuted, width: 1280 }));

  e.push(...section('来源层', 50, 140, 420, 700, { backgroundColor: '#fff7ed', strokeColor: palette.startStroke }));
  [
    ['公开研报/官网\nPrecedence/Fortune/Mordor', 90, 215],
    ['官方/行业来源\nCPSC/EU/WIPO/展会', 90, 335],
    ['授权平台\nAmazon/YouTube/Import Genius', 90, 455],
    ['内部系统\nCRM/ERP/知识库/报告', 90, 575],
    ['AI与爬虫\nNLP/生成日志/网页评论', 90, 695],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 330, 78, { backgroundColor: palette.startFill, strokeColor: palette.startStroke, fontSize: 15 })));

  e.push(...section('注册与审计层', 540, 140, 460, 700, { backgroundColor: '#ecfdf5', strokeColor: palette.dataStroke }));
  [
    ['sourceRegistry.ts\n45 sources', 585, 230],
    ['analyzeConsistency()\n43 pages / 27 tables / 0 issues', 585, 380],
    ['classifyCollectionMethod()\npublic/manual/connector/local', 585, 530],
    ['buildConnectorBacklog()\n23 sources / 10 groups', 585, 680],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 370, 88, { backgroundColor: palette.dataFill, strokeColor: palette.dataStroke, fontSize: 15 })));

  e.push(...section('采集执行层', 1070, 140, 520, 700, { backgroundColor: '#fffbeb', strokeColor: palette.decisionStroke }));
  [
    ['public-url-check\n8 methods -> ok/fetch/source-error', 1115, 205],
    ['local-file-check\n代码资产存在性 + hash', 1115, 325],
    ['manual-required\n12 人工/采购/访谈凭证', 1115, 445],
    ['connector-required\n23 授权/内部/合规连接器', 1115, 565],
    ['public/periodic-data/latest.json\n2026-06-11T07:30:40Z', 1115, 705],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 430, 78, { backgroundColor: palette.decisionFill, strokeColor: palette.decisionStroke, fontSize: 15 })));

  e.push(...section('消费与发布层', 1660, 140, 560, 700, { backgroundColor: '#eff6ff', strokeColor: palette.primaryStroke }));
  [
    ['DataManage /data\nfetch periodic manifest', 1705, 215],
    ['DataSourcePage /data-source\n展示来源可信度', 1705, 335],
    ['业务页面\nmarket / competition / users / industry / self / ai', 1705, 455],
    ['Vite dist\nassets + periodic-data', 1705, 575],
    ['腾讯云 nginx\nmkt.lute-tlz-dddd.top', 1705, 695],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 470, 78, { backgroundColor: palette.primaryFill, strokeColor: palette.primaryStroke, fontSize: 15 })));

  [255, 375, 495, 615, 735].forEach((y) => e.push(...arrow(470, y, 540, y, '登记')));
  e.push(...arrow(1000, 275, 1070, 245, '读取'));
  e.push(...arrow(1000, 425, 1070, 365, '一致性'));
  e.push(...arrow(1000, 575, 1070, 525, '分类'));
  e.push(...arrow(1000, 725, 1070, 605, 'backlog'));
  e.push(...arrow(1545, 745, 1660, 255, 'manifest'));
  e.push(...arrow(1545, 745, 1660, 375, 'registry状态'));
  e.push(...arrow(1545, 745, 1660, 615, '随 dist 发布'));
  e.push(...arrow(1940, 653, 1940, 695, 'rsync部署', { strokeColor: palette.opsStroke }));
  e.push(...artifact('最新 manifest totals', '{ total:45, ok:10,\n  manual-required:12,\n  connector-required:23,\n  source-error:0, fetch-error:0 }', 1010, 875, 760, 150));
  return e;
}

function indicatorSystem() {
  idCounter = 1;
  const e = [];
  e.push(text('mkt53 指标体系图', 40, 30, { fontSize: 34, strokeColor: palette.textTitle, width: 820 }));
  e.push(text('以 Momcozy 市场决策为中心，把指标按业务域、数据表、证据质量和动作输出组织', 44, 78, { fontSize: 17, strokeColor: palette.textMuted, width: 1380 }));
  e.push(...node('战略决策问题\n进入品类/区域/产品/渠道/投放/合规', 870, 135, 440, 90, { backgroundColor: palette.startFill, strokeColor: palette.startStroke }));

  const columns = [
    ['市场指标', 70, ['TAM/SAM/SOM', '区域份额', '市场增速', '品类生命周期', '海关/HS 趋势']],
    ['竞争指标', 430, ['竞品 SKU 数', '价格带/评分', '新品速度', '区域竞争强度', '品牌份额']],
    ['用户指标', 790, ['用户画像', '社媒声量', '评论情感', 'RFM 分层', '审美偏好']],
    ['行业指标', 1150, ['法规风险', '政策趋势', '供应链节点', '专利/IP', '展会情报']],
    ['自我指标', 1510, ['产品矩阵', '价格策略', '渠道表现', '促销活动', 'BCG/4P']],
    ['AI辅助指标', 1870, ['评论主题', 'NLP 置信度', '设计输出', '知识库版本', '网页评论采集']],
  ];

  columns.forEach(([title, x, metrics], index) => {
    const stroke = index === 5 ? palette.aiStroke : palette.primaryStroke;
    const fill = index === 5 ? palette.aiFill : palette.primaryFill;
    e.push(...section(title, x, 300, 300, 470, { backgroundColor: index === 5 ? '#f5f3ff' : '#eff6ff', strokeColor: stroke, fontSize: 20 }));
    metrics.forEach((metric, i) => {
      e.push(...node(metric, x + 38, 370 + i * 70, 225, 50, { backgroundColor: fill, strokeColor: stroke, fontSize: 14 }));
    });
    e.push(...arrow(1090, 225, x + 150, 300, '拆解'));
  });

  e.push(...section('指标质量维度', 120, 830, 1950, 210, { backgroundColor: '#ecfdf5', strokeColor: palette.dataStroke }));
  [
    ['来源等级\nA/B/C/D', 170],
    ['复核状态\nverified / needs-review / example', 480],
    ['采集状态\nok / manual / connector', 850],
    ['时间窗口\nlastVerified / generatedAt', 1220],
    ['血缘影响\n上游表 -> 下游页面', 1580],
  ].forEach(([label, x]) => e.push(...node(label, x, 905, 250, 70, { backgroundColor: palette.dataFill, strokeColor: palette.dataStroke, fontSize: 15 })));
  e.push(...artifact('当前证据边界', 'verified:9 | needs-review:23 | example:13\nreliability A:14 B:12 C:16 D:3', 720, 1090, 780, 120));
  return e;
}

function dataLineage() {
  idCounter = 1;
  const e = [];
  e.push(text('mkt53 数据血缘关系图', 40, 30, { fontSize: 34, strokeColor: palette.textTitle, width: 900 }));
  e.push(text('从外部/内部来源到 27 张表，再到 dashboard、AI、报告与页面的关键血缘', 44, 78, { fontSize: 17, strokeColor: palette.textMuted, width: 1280 }));

  e.push(...section('来源入口', 50, 145, 430, 820, { backgroundColor: '#fff7ed', strokeColor: palette.startStroke }));
  [
    ['行业研报\nGrand View / Statista / Mordor', 90, 220],
    ['平台/电商\nAmazon / Vendor Central', 90, 335],
    ['用户与社媒\n访谈 / 社媒 API / 评论', 90, 450],
    ['政府/行业\nCPSC / EU / WIPO / 展会', 90, 565],
    ['内部系统\nERP / CRM / 知识库 / 报告', 90, 680],
    ['AI/爬虫\nNLP / 生成日志 / 网页评论', 90, 795],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 340, 72, { backgroundColor: palette.startFill, strokeColor: palette.startStroke, fontSize: 14 })));

  const modules = [
    ['市场洞察数据', 560, 145, ['market_size_global', 'market_trend_monthly', 'pest_analysis', 'porter_five_forces', 'customs_data', 'category_analysis']],
    ['竞争情报数据', 910, 145, ['competitor_products', 'new_product_tracker', 'region_competitive_landscape', 'price_analysis']],
    ['用户研究数据', 1260, 145, ['user_personas', 'social_mention_data', 'user_comments', 'consumer_interviews', 'rfm_user_segments']],
    ['行业动态数据', 560, 585, ['policy_regulations', 'supply_chain_nodes', 'ip_patents', 'trade_exhibitions']],
    ['品牌自研数据', 910, 585, ['momcozy_products', 'pricing_strategy', 'channel_performance', 'promotion_campaigns']],
    ['AI辅助数据', 1260, 585, ['comment_analysis_ai', 'design_assistant_output', 'knowledge_base', 'web_review_scraped']],
  ];
  modules.forEach(([title, x, y, tables], index) => {
    const isAi = title.includes('AI');
    e.push(...section(`${title}\n${tables.length} tables`, x, y, 290, 350, { backgroundColor: isAi ? '#f5f3ff' : '#ecfdf5', strokeColor: isAi ? palette.aiStroke : palette.dataStroke, fontSize: 18 }));
    tables.forEach((table, i) => {
      e.push(...node(table, x + 24, y + 78 + i * 40, 240, 30, { backgroundColor: isAi ? palette.aiFill : palette.dataFill, strokeColor: isAi ? palette.aiStroke : palette.dataStroke, fontSize: 12 }));
    });
  });

  e.push(...section('输出与应用', 1660, 205, 480, 590, { backgroundColor: '#eff6ff', strokeColor: palette.primaryStroke }));
  [
    ['dashboard_kpi\n首页/模块 KPI', 1710, 295],
    ['market / competition / users / industry\n专题页面', 1710, 410],
    ['comment_analysis_ai\nAI 评论洞察', 1710, 525],
    ['product_analysis\n产品/价格/渠道策略', 1710, 640],
    ['reports / ai-assistant\n报告与问答输出', 1710, 755],
  ].forEach(([label, x, y]) => e.push(...node(label, x, y, 380, 74, { backgroundColor: palette.primaryFill, strokeColor: palette.primaryStroke, fontSize: 14 })));

  e.push(...arrow(480, 255, 560, 255, '研报入库'));
  e.push(...arrow(480, 370, 910, 255, 'Amazon'));
  e.push(...arrow(480, 490, 1260, 255, '访谈/评论'));
  e.push(...arrow(480, 600, 560, 695, '法规/IP'));
  e.push(...arrow(480, 715, 910, 695, '内部经营'));
  e.push(...arrow(480, 830, 1260, 695, 'AI/爬虫'));

  e.push(...arrow(850, 310, 1660, 330, 'market_trend -> KPI'));
  e.push(...arrow(1200, 310, 1660, 455, '竞品表 -> 页面'));
  e.push(...arrow(1550, 310, 1660, 560, 'user_comments -> AI'));
  e.push(...arrow(1200, 750, 1660, 675, '自研表 -> 产品分析'));
  e.push(...arrow(1550, 750, 1660, 790, '知识库/报告'));
  e.push(...artifact('关键血缘路径', '研报 -> market_size_global -> market_trend_monthly -> dashboard_kpi\nAmazon -> competitor_products -> price_analysis/new_product_tracker\nuser_comments -> comment_analysis_ai -> dashboard_kpi', 520, 1030, 1220, 150));
  return e;
}

const outputs = [
  ['business-architecture', businessArchitecture()],
  ['business-workflow', businessWorkflow()],
  ['data-flow', dataFlow()],
  ['indicator-system', indicatorSystem()],
  ['data-lineage', dataLineage()],
].map(([name, elements]) => save(name, elements));

for (const output of outputs) {
  console.log(output);
}
