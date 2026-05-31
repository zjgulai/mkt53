export type SourceReliability = 'A' | 'B' | 'C' | 'D';
export type VerificationStatus = 'verified' | 'needs-review' | 'example';

export interface SourceRegistryItem {
  id: string;
  module: string;
  metric: string;
  sourceName: string;
  sourceUrl?: string;
  reliability: SourceReliability;
  verificationStatus: VerificationStatus;
  lastVerified: string;
  note: string;
  page: string;
  sourceType: string;
  year: string;
  gap: string;
  action: string;
}

export const verificationStatusMeta: Record<VerificationStatus, { label: string; color: string }> = {
  verified: { label: '已复核', color: '#34c759' },
  'needs-review': { label: '待复核', color: '#ff9500' },
  example: { label: '示例数据', color: '#ff3b30' },
};

export const sourceRegistry = [
  { id: 'ds-001', module: '看市场', page: 'MarketPage', metric: 'TAM/SAM/SOM', sourceName: 'Precedence Research', sourceType: '行业报告', year: '2026-04', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '用于SAM口径市场规模，需保留机构口径说明。', gap: '', action: 'OK', sourceUrl: 'https://www.precedenceresearch.com/breast-pump-market' },
  { id: 'ds-002', module: '看市场', page: 'MarketPage', metric: '区域份额', sourceName: 'Fortune Business Insights', sourceType: '行业报告', year: '2025', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '用于区域市场份额参考。', gap: '', action: 'OK', sourceUrl: 'https://www.fortunebusinessinsights.com' },
  { id: 'ds-003', module: '看市场', page: 'MarketTrend', metric: 'PEST分析', sourceName: 'WHO/FDA/各国政府', sourceType: '官方数据', year: '2024-2026', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '来源组合跨度大，展示前需按具体政策条目复核。', gap: '来源组合需拆分', action: '拆分到具体来源URL' },
  { id: 'ds-004', module: '看市场', page: 'MarketTrend', metric: '波特五力定量评分', sourceName: 'Mordor Intelligence框架', sourceType: '专家评估', year: '2026', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-05-31', note: '评分是内部解释性模型，不应展示为机构原始结论。', gap: '缺乏定量原始数据', action: '建议采购IBISWorld完整报告', sourceUrl: 'https://www.mordorintelligence.com' },
  { id: 'ds-005', module: '看市场', page: 'BreastPump', metric: '品类拆分', sourceName: 'Precedence/Technavio加权', sourceType: '推算', year: '2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '加权口径需补公式和权重来源。', gap: '', action: '补充测算说明' },
  { id: 'ds-006', module: '看市场', page: 'CustomsData', metric: 'HS编码进出口', sourceName: '海关总署/Import Genius', sourceType: '官方数据', year: '2025-2026', reliability: 'D', verificationStatus: 'example', lastVerified: '2026-05-31', note: '当前是示例数据，不能作为真实贸易结论。', gap: '当前为示例数据', action: '需接入Import Genius API或数仓', sourceUrl: 'https://www.importgenius.com' },
  { id: 'ds-007', module: '看竞争', page: 'CompetitionPage', metric: '竞品概览', sourceName: 'Amazon.com 实时采集', sourceType: '平台API', year: '2026-05', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '需确认采集任务、时间戳和平台合规授权。', gap: '', action: '补采集任务记录' },
  { id: 'ds-008', module: '看竞争', page: 'NewCompetition', metric: '新品追踪', sourceName: '品牌官网/新闻稿', sourceType: '新闻', year: '2025-2026', reliability: 'B', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '适合做新品线索，不适合作销量结论。', gap: '', action: 'OK' },
  { id: 'ds-009', module: '看竞争', page: 'ProductManage', metric: '产品参数/价格', sourceName: 'Amazon.com 2026-05', sourceType: '实时采集', year: '2026', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '需补采集时间和SKU映射，避免价格时点误读。', gap: '', action: '补采集时间戳' },
  { id: 'ds-010', module: '看竞争', page: 'RegionCompetition', metric: '区域份额', sourceName: 'Amazon Brand Analytics', sourceType: '平台数据', year: '2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '仅覆盖Amazon渠道，不能外推全渠道区域份额。', gap: '仅Amazon渠道', action: '建议叠加NPD/IRI线下数据', sourceUrl: 'https://vendorcentral.amazon.com' },
  { id: 'ds-011', module: '看用户', page: 'UsersPage', metric: '用户画像', sourceName: 'QuestMobile 2025 / Mamava Survey', sourceType: '行业报告', year: '2025', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '两个来源需拆分样本、地域和口径。', gap: '', action: '补来源口径', sourceUrl: 'https://www.questmobile.com' },
  { id: 'ds-012', module: '看用户', page: 'UsersPage', metric: 'RFM分层', sourceName: 'Momcozy CRM', sourceType: '内部系统', year: '2026 Q1', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-05-31', note: '当前为示例分层，等待真实CRM接入。', gap: '示例数据', action: '需对接真实CRM数据库' },
  { id: 'ds-013', module: '看用户', page: 'OverseasSentiment', metric: '社交声量', sourceName: 'TikTok/IG/FB API', sourceType: '社交媒体API', year: '2025-2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '需补API授权、查询词和采样窗口。', gap: '', action: '补采集配置' },
  { id: 'ds-014', module: '看用户', page: 'ConsumerInterviews', metric: '消费者访谈', sourceName: '定性研究', sourceType: '定性', year: '2025', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '样本量和招募条件未完整展示。', gap: '样本量未标注', action: '补充样本量说明' },
  { id: 'ds-015', module: '看行业', page: 'IndustryPage', metric: '行业概况', sourceName: 'Grand View Research / Fortune BI', sourceType: '行业报告', year: '2025', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '用于行业背景，不替代单条法规来源。', gap: '', action: 'OK' },
  { id: 'ds-016', module: '看行业', page: 'PolicyInsight', metric: '政策法规总览', sourceName: '各国政府官网', sourceType: '官方数据', year: '2025-2026', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '总览不可写成全部法规已复核；需逐条标注状态。', gap: '法规来源需逐条状态化', action: '接入条目级复核状态' },
  { id: 'ds-017', module: '看行业', page: 'IPAnalysis', metric: '专利数据', sourceName: 'WIPO/USPTO', sourceType: '官方数据库', year: '2020-2024', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '2025数据缺失，诉讼状态需单独复核。', gap: '2025数据缺失', action: '需更新WIPO 2025数据', sourceUrl: 'https://www.wipo.int' },
  { id: 'ds-018', module: '看行业', page: 'Exhibition', metric: '展会情报', sourceName: '展会官网', sourceType: '官网', year: '2025-2026', reliability: 'B', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '适合用于展会日程和参展线索。', gap: '', action: 'OK' },
  { id: 'ds-019', module: '看自己', page: 'SelfInsight', metric: '营销4P', sourceName: 'Momcozy内部/Amazon', sourceType: '混合', year: '2025-2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '内部与平台数据需拆分来源和更新时间。', gap: '', action: '补数据快照' },
  { id: 'ds-020', module: '看自己', page: 'SelfInsight', metric: 'BCG矩阵', sourceName: '内部测算', sourceType: '内部', year: '2026', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-05-31', note: '内部主观评估，需外部份额校准。', gap: '主观评估', action: '建议引用外部份额数据校准' },
  { id: 'ds-021', module: 'AI助手', page: 'CommentData', metric: '评论情感分析', sourceName: 'Amazon API / NLP模型', sourceType: 'AI模型', year: '2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '需补模型准确率和人工复核一致率。', gap: '准确率未标注', action: '补充模型准确率指标' },
  { id: 'ds-022', module: 'AI助手', page: 'KnowledgeBase', metric: '知识库', sourceName: '内部维护', sourceType: '内部', year: '2026', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '内部维护源，需持续版本化。', gap: '', action: 'OK' },
  { id: 'ds-023', module: 'AI助手', page: 'WebReview', metric: '网页评论爬取', sourceName: '爬虫采集', sourceType: '爬虫', year: '2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '需标注robots.txt和平台条款合规性。', gap: '合规风险', action: '需标注robots.txt合规性' },
  { id: 'ds-024', module: '报告中心', page: 'ReportsPage', metric: '报告元数据', sourceName: '内部管理', sourceType: '内部', year: '2026', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '内部报告目录数据。', gap: '', action: 'OK' },
  { id: 'policy-cpsc-efiling', module: '看行业', page: 'RegulationDetail', metric: 'CPSC CPC/eFiling证书数据要求', sourceName: 'U.S. CPSC CPC/eFiling', sourceType: '官方数据', year: '2026', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '官方页面可支撑CPC/eFiling复核任务；未发现“官网实时声明强制要求”的官方依据。', gap: 'SKU适用范围和实施节奏待法务复核', action: '按CPSC官方页面复核证书字段、测试报告和进口eFiling适用范围', sourceUrl: 'https://www.cpsc.gov/eFiling' },
  { id: 'policy-eu-mdr-transition', module: '看行业', page: 'PolicyInsight', metric: 'EU MDR Class IIa过渡期', sourceName: 'European Commission Medical Devices', sourceType: '官方数据', year: '2027-2028', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: 'MDR过渡期存在条件和类别差异，不应写成单一确定截止。', gap: '产品分类和证书条件待法务复核', action: '按Class IIa分类、证书状态和notified body路径复核', sourceUrl: 'https://health.ec.europa.eu/medical-devices-sector/new-regulations_en' },
] as const satisfies SourceRegistryItem[];

export function getSourceRegistryItem(id: string): SourceRegistryItem {
  const item = sourceRegistry.find((entry) => entry.id === id);

  if (!item) {
    throw new Error(`Unknown source registry item: ${id}`);
  }

  return item;
}

export function getSourceRegistryItemsByModule(module: string): SourceRegistryItem[] {
  return sourceRegistry.filter((entry) => entry.module === module);
}

export function getVerificationStatusMeta(status: VerificationStatus): { label: string; color: string } {
  return verificationStatusMeta[status];
}
