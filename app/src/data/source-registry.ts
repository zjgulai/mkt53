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
  { id: 'ds-002', module: '看市场', page: 'MarketPage', metric: '区域份额', sourceName: 'Fortune Business Insights', sourceType: '行业报告', year: '2025', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-06-02', note: '用于区域市场份额参考；服务器自动化可能因Cloudflare challenge返回403，需保留人工访问或采购报告凭证。', gap: '自动化访问受反爬限制', action: '保留具体报告页并补人工复核凭证', sourceUrl: 'https://www.fortunebusinessinsights.com/breast-pump-market-107054' },
  { id: 'ds-003', module: '看市场', page: 'MarketTrend', metric: 'PEST分析', sourceName: 'WHO/FDA/各国政府', sourceType: '官方数据', year: '2024-2026', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '来源组合跨度大，展示前需按具体政策条目复核。', gap: '来源组合需拆分', action: '拆分到具体来源URL' },
  { id: 'ds-004', module: '看市场', page: 'MarketTrend', metric: '波特五力定量评分', sourceName: 'Mordor Intelligence框架', sourceType: '专家评估', year: '2026', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-06-02', note: '评分是内部解释性模型，不应展示为机构原始结论；服务器自动化可能因Cloudflare challenge返回403。', gap: '缺乏定量原始数据，自动化访问受反爬限制', action: '采购完整报告或补人工复核凭证', sourceUrl: 'https://www.mordorintelligence.com/industry-reports/breast-pumps-market' },
  { id: 'ds-005', module: '看市场', page: 'BreastPump', metric: '品类拆分', sourceName: 'Precedence/Technavio加权', sourceType: '推算', year: '2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '加权口径需补公式和权重来源。', gap: '', action: '补充测算说明' },
  { id: 'ds-006', module: '看市场', page: 'CustomsData', metric: 'HS编码进出口', sourceName: '海关总署/Import Genius', sourceType: '官方数据', year: '2025-2026', reliability: 'D', verificationStatus: 'example', lastVerified: '2026-05-31', note: '当前是示例数据，不能作为真实贸易结论。', gap: '当前为示例数据', action: '需接入Import Genius API或数仓', sourceUrl: 'https://www.importgenius.com' },
  { id: 'ds-007', module: '看竞争', page: 'CompetitionPage', metric: '竞品概览', sourceName: 'Amazon.com 实时采集', sourceType: '平台API', year: '2026-05', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '需确认采集任务、时间戳和平台合规授权。', gap: '', action: '补采集任务记录' },
  { id: 'ds-008', module: '看竞争', page: 'NewCompetition', metric: '新品追踪', sourceName: '品牌官网/新闻稿', sourceType: '新闻', year: '2025-2026', reliability: 'B', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '适合做新品线索，不适合作销量结论。', gap: '', action: 'OK' },
  { id: 'ds-009', module: '看竞争', page: 'ProductManage', metric: '产品参数/价格', sourceName: 'Amazon.com 2026-05', sourceType: '实时采集', year: '2026', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '需补采集时间和SKU映射，避免价格时点误读。', gap: '', action: '补采集时间戳' },
  { id: 'ds-010', module: '看竞争', page: 'RegionCompetition', metric: '区域份额', sourceName: 'Amazon Brand Analytics', sourceType: '平台数据', year: '2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '仅覆盖Amazon渠道，不能外推全渠道区域份额。', gap: '仅Amazon渠道', action: '建议叠加NPD/IRI线下数据', sourceUrl: 'https://vendorcentral.amazon.com' },
  { id: 'ds-011', module: '看用户', page: 'UsersPage', metric: '中国有孩家庭用户画像', sourceName: 'QuestMobile 2025有孩家庭人群消费洞察报告', sourceType: '行业报告', year: '2025', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-06-02', note: 'QuestMobile来源仅支撑中国有孩家庭人群线上行为和消费洞察，不能外推全球哺乳用户画像。', gap: '页面仍需拆分地域、样本和指标口径', action: '将中国有孩家庭画像与海外母乳喂养调研分开展示', sourceUrl: 'https://www.questmobile.com.cn/research/report/1927204984337829890' },
  { id: 'ds-043', module: '看用户', page: 'UsersPage', metric: '海外母乳喂养动机与场景', sourceName: 'Mamava / Medela 2025 State of Breastfeeding Survey', sourceType: '行业调研', year: '2025', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-06-02', note: 'Mamava/Medela调研可支撑海外母乳喂养动机和场景，不应与QuestMobile中国移动互联网画像合并为同一口径；服务器自动化可能因Cloudflare challenge返回403。', gap: '需要补样本量、调查时间、地域、题目口径和人工访问凭证', action: '拆分海外调研口径并补人工复核凭证', sourceUrl: 'https://www.mamava.com/why-buy-blog/2025-state-of-breastfeeding-survey' },
  { id: 'ds-012', module: '看用户', page: 'UsersPage', metric: 'RFM分层', sourceName: 'Momcozy CRM', sourceType: '内部系统', year: '2026 Q1', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-05-31', note: '当前为示例分层，等待真实CRM接入。', gap: '示例数据', action: '需对接真实CRM数据库' },
  { id: 'ds-013', module: '看用户', page: 'OverseasSentiment', metric: '社交声量', sourceName: 'TikTok/IG/FB API', sourceType: '社交媒体API', year: '2025-2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '需补API授权、查询词和采样窗口。', gap: '', action: '补采集配置' },
  { id: 'ds-014', module: '看用户', page: 'ConsumerInterviews', metric: '消费者访谈', sourceName: '定性研究', sourceType: '定性', year: '2025', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '样本量和招募条件未完整展示。', gap: '样本量未标注', action: '补充样本量说明' },
  { id: 'ds-015', module: '看行业', page: 'IndustryPage', metric: '行业概况', sourceName: 'Grand View Research / Fortune BI', sourceType: '行业报告', year: '2025', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '用于行业背景，不替代单条法规来源。', gap: '', action: 'OK' },
  { id: 'ds-016', module: '看行业', page: 'PolicyInsight', metric: '政策法规总览', sourceName: '各国政府官网', sourceType: '官方数据', year: '2025-2026', reliability: 'A', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '总览不可写成全部法规已复核；需逐条标注状态。', gap: '法规来源需逐条状态化', action: '接入条目级复核状态' },
  { id: 'ds-017', module: '看行业', page: 'IPAnalysis', metric: '专利数据', sourceName: 'WIPO/USPTO', sourceType: '官方数据库', year: '2020-2024', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '2025数据缺失，诉讼状态需单独复核。', gap: '2025数据缺失', action: '需更新WIPO 2025数据', sourceUrl: 'https://www.wipo.int' },
  { id: 'ds-018', module: '看行业', page: 'Exhibition', metric: '展会情报', sourceName: '展会官网', sourceType: '官网', year: '2026', reliability: 'B', verificationStatus: 'verified', lastVerified: '2026-06-11', note: '适合用于展会日程和参展线索；2026年主要展会日期、地点和状态已按公开来源补证，经营复盘指标仍需展后复盘快照。', gap: '', action: 'OK' },
  { id: 'ds-019', module: '看自己', page: 'SelfInsight', metric: '营销4P', sourceName: 'Momcozy内部/Amazon', sourceType: '混合', year: '2025-2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '内部与平台数据需拆分来源和更新时间。', gap: '', action: '补数据快照' },
  { id: 'ds-020', module: '看自己', page: 'SelfInsight', metric: 'BCG矩阵', sourceName: '内部测算', sourceType: '内部', year: '2026', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-05-31', note: '内部主观评估，需外部份额校准。', gap: '主观评估', action: '建议引用外部份额数据校准' },
  { id: 'ds-021', module: 'AI助手', page: 'CommentData', metric: '评论情感分析', sourceName: 'Amazon API / NLP模型', sourceType: 'AI模型', year: '2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '需补模型准确率和人工复核一致率。', gap: '准确率未标注', action: '补充模型准确率指标' },
  { id: 'ds-022', module: 'AI助手', page: 'KnowledgeBase', metric: '知识库', sourceName: '内部维护', sourceType: '内部', year: '2026', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '内部维护源，需持续版本化。', gap: '', action: 'OK' },
  { id: 'ds-023', module: 'AI助手', page: 'WebReview', metric: '网页评论爬取', sourceName: '爬虫采集', sourceType: '爬虫', year: '2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-05-31', note: '需标注robots.txt和平台条款合规性。', gap: '合规风险', action: '需标注robots.txt合规性' },
  { id: 'ds-024', module: '报告中心', page: 'ReportsPage', metric: '报告元数据', sourceName: '内部管理', sourceType: '内部', year: '2026', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-05-31', note: '内部报告目录数据。', gap: '', action: 'OK' },
  { id: 'ds-025', module: 'AI助手', page: 'AIAssistantPage', metric: 'AI助手功能入口配置', sourceName: 'mkt53静态功能清单', sourceType: '代码资产', year: '2026', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-06-02', note: '入口卡片和快捷指令为页面演示配置，不代表真实助手调用量。', gap: '缺少真实使用日志和服务端审计', action: '接入AI代理调用日志后重算使用指标' },
  { id: 'ds-026', module: 'AI助手', page: 'AIGallery', metric: 'AI图库生成资产', sourceName: 'Kimi Image Generation / 本地图片资产', sourceType: 'AI模型', year: '2026-05', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-06-02', note: '图库记录来自本地生成资产和prompt元数据，只能说明素材库状态。', gap: '缺少生成请求、成本、模型版本和人工审核记录', action: '接入生成服务端日志与素材审核状态' },
  { id: 'ds-027', module: '数据治理', page: 'DataManage', metric: '数据资产目录', sourceName: 'app/src/pages/DataManage.tsx', sourceType: '代码资产', year: '2026', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-06-02', note: '数据表、字段和治理配置来自代码内资产目录，已由data:audit校验表治理一致性。', gap: '', action: 'OK', sourceUrl: 'https://github.com/zjgulai/mkt53/blob/main/app/src/pages/DataManage.tsx' },
  { id: 'ds-028', module: '数据治理', page: 'DataSourcePage', metric: 'source registry展示', sourceName: 'app/src/data/source-registry.ts', sourceType: '代码资产', year: '2026', reliability: 'A', verificationStatus: 'verified', lastVerified: '2026-06-02', note: '数据来源管理页直接读取sourceRegistry，作为全站来源状态展示。', gap: '', action: 'OK', sourceUrl: 'https://github.com/zjgulai/mkt53/blob/main/app/src/data/source-registry.ts' },
  { id: 'ds-029', module: 'AI助手', page: 'DesignAssistant', metric: '设计助手模型与样例输出', sourceName: 'AI模型配置 / 官网采集图', sourceType: 'AI模型', year: '2026-05', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-06-02', note: '浏览器端保留本地demo输出和官网采集图占位，真实图像生成必须通过服务端代理。', gap: '缺少服务端生成请求、授权密钥隔离和审核日志', action: '接入服务端代理后记录requestId、model、cost和status' },
  { id: 'ds-030', module: 'AI助手', page: 'ReviewAnalysis', metric: '评论分析功能占位数据', sourceName: 'Amazon API / NLP模型占位', sourceType: 'AI模型', year: '2026', reliability: 'D', verificationStatus: 'example', lastVerified: '2026-06-02', note: '当前统计和洞察为功能演示数据，不能作为真实评论情感结论。', gap: '缺少评论采集窗口、样本量、模型准确率和人工复核一致率', action: '接入评论数据集与NLP评估报告' },
  { id: 'ds-031', module: 'AI助手', page: 'YoutubeReview', metric: 'YouTube测评追踪示例', sourceName: 'YouTube Data API / 达人研究占位', sourceType: '平台API', year: '2026', reliability: 'D', verificationStatus: 'example', lastVerified: '2026-06-02', note: '视频、观看量和达人指标为演示口径，未绑定真实YouTube API采集任务。', gap: '缺少查询词、视频ID清单、授权额度和采集时间', action: '接入YouTube Data API并保存采集manifest' },
  { id: 'ds-032', module: '看行业', page: 'FlavorMap', metric: 'VOC功能趋势地图', sourceName: '用户评论/VOC NLP汇总', sourceType: 'AI模型', year: '2026', reliability: 'C', verificationStatus: 'needs-review', lastVerified: '2026-06-02', note: '功能热度和技术采用率需要绑定评论样本、关键词和模型版本后才能作为趋势结论。', gap: '缺少VOC样本窗口和关键词配置', action: '补充评论来源、关键词词典和NLP运行记录' },
  { id: 'ds-033', module: '看行业', page: 'FlavorReport', metric: 'VOC趋势报告', sourceName: 'VOC NLP汇总 / 人工分析', sourceType: 'AI模型', year: '2026', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-06-02', note: '当前报告趋势为解释性展示，尚未绑定真实VOC快照。', gap: '缺少报告生成时的数据快照id', action: '绑定VOC快照、模型版本和人工复核人' },
  { id: 'ds-034', module: '看行业', page: 'IndustryNews', metric: '母婴行业资讯', sourceName: 'FDA/CPSC/EU/品牌官网/新闻源手工汇编', sourceType: '新闻', year: '2024-2026', reliability: 'B', verificationStatus: 'needs-review', lastVerified: '2026-06-11', note: '部分资讯已补原文URL和条目级复核状态；未找到稳定来源的Medela Sonata Pro AI、Willow Go 3.0和18.2B市场规模已降级为待复核线索。', gap: '仍缺少完整条目级registry或采集manifest', action: '继续拆分为新闻条目级registry或采集manifest' },
  { id: 'ds-035', module: '看行业', page: 'SupplyChain', metric: '供应链节点与库存', sourceName: 'Momcozy ERP / 供应商访谈', sourceType: '内部系统', year: '2026', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-06-02', note: '供应商、库存和成本趋势为模拟经营数据，不能作为真实供应链决策依据。', gap: '缺少ERP快照和供应商授权数据', action: '接入ERP导出、供应商主数据和库存快照' },
  { id: 'ds-036', module: '看行业', page: 'TechNews', metric: '母婴科技资讯', sourceName: '品牌官网/技术新闻/产品规格', sourceType: '新闻', year: '2026', reliability: 'C', verificationStatus: 'needs-review', lastVerified: '2026-06-02', note: '技术趋势描述需要逐条绑定品牌官网、产品规格或新闻原文。', gap: '缺少技术条目级来源URL', action: '按技术条目补来源URL、发布日期和适用产品' },
  { id: 'ds-037', module: '看市场', page: 'BabyCare', metric: '婴儿护理品类规模', sourceName: '行业报告 / Amazon品类采集', sourceType: '推算', year: '2026', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-06-02', note: '婴儿护理规模、品牌份额和Momcozy占比为展示性推算。', gap: '缺少报告口径、Amazon类目采集和权重公式', action: '补品类报告来源、采集窗口和测算公式' },
  { id: 'ds-038', module: '看市场', page: 'CategoryAnalysis', metric: '全品类对比/生命周期', sourceName: '行业报告加权 / Amazon BSR', sourceType: '推算', year: '2026', reliability: 'C', verificationStatus: 'needs-review', lastVerified: '2026-06-02', note: '品类规模、增长、利润率和竞争强度为综合测算，需补权重与来源口径。', gap: '缺少权重公式和BSR采集时间戳', action: '补测算说明、BSR快照和外部报告来源' },
  { id: 'ds-039', module: '看市场', page: 'NursingProducts', metric: '哺乳用品趋势/品牌份额', sourceName: 'Amazon品类采集 / 行业报告', sourceType: '平台数据', year: '2026', reliability: 'C', verificationStatus: 'needs-review', lastVerified: '2026-06-02', note: '哺乳用品趋势和品牌份额需要平台采集授权、类目定义和时间窗口。', gap: '缺少Amazon采集任务记录和品牌映射', action: '接入Amazon类目采集并保存SKU/品牌映射' },
  { id: 'ds-040', module: '看用户', page: 'Aesthetics', metric: '美学风格偏好', sourceName: '用户调研 / AI图像资产标签', sourceType: '定性', year: '2026', reliability: 'C', verificationStatus: 'example', lastVerified: '2026-06-02', note: '颜色、风格和区域审美偏好为方向性展示，未绑定真实调研样本。', gap: '缺少样本量、地区分布和调研题目', action: '接入用户调研样本和图片偏好实验结果' },
  { id: 'ds-041', module: '看用户', page: 'ChannelInterviews', metric: '渠道合作伙伴访谈', sourceName: '渠道访谈 / 内部销售口径', sourceType: '定性', year: '2026', reliability: 'C', verificationStatus: 'needs-review', lastVerified: '2026-06-02', note: '渠道健康度、销售占比和访谈结论需要样本说明与内部销售口径复核。', gap: '缺少访谈记录、销售快照和受访者授权状态', action: '补访谈样本、脱敏记录和销售数据版本' },
  { id: 'ds-042', module: '看用户', page: 'StoreInterviews', metric: '门店运营深度访谈', sourceName: '门店访谈 / 运营数据审计', sourceType: '定性', year: '2026', reliability: 'C', verificationStatus: 'needs-review', lastVerified: '2026-06-02', note: '门店转化率、坪效和NPS需要门店运营快照与访谈样本复核。', gap: '缺少门店运营数据源和访谈授权状态', action: '补门店数据快照、访谈样本和计算口径' },
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
