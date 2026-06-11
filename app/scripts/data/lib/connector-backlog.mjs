import { classifyCollectionMethod } from './project-analysis.mjs';

const connectorDefinitions = [
  {
    connectorId: 'amazon-commerce',
    label: 'Amazon Marketplace / Brand Analytics',
    priority: 'P0',
    match: /amazon|brand analytics|bsr|vendorcentral/i,
    requiredAccess: ['Amazon SP-API 或 Vendor Central Brand Analytics 授权', 'ASIN/SKU/品牌映射表', '采集窗口和站点范围'],
    outputContract: ['product_snapshot', 'review_snapshot', 'brand_share_snapshot', 'category_rank_snapshot'],
    stopCondition: 'dry-run 输出带 requestId、site、window、sampleCount、sourceIds，且不含真实凭据。',
  },
  {
    connectorId: 'review-nlp',
    label: 'Review / VOC NLP Pipeline',
    priority: 'P0',
    match: /评论|review|voc|nlp|情感分析/i,
    requiredAccess: ['评论原文数据集或平台 API 授权', '关键词词典和产品映射', '模型版本与人工复核样本'],
    outputContract: ['review_sample_manifest', 'sentiment_score_snapshot', 'topic_cluster_snapshot', 'human_review_sample'],
    stopCondition: 'dry-run 输出样本窗口、模型版本、人工复核比例和 sourceIds，未授权时保持 blocked。',
  },
  {
    connectorId: 'social-listening',
    label: 'TikTok / Instagram / Facebook Social Listening',
    priority: 'P0',
    match: /tiktok|instagram|facebook|社交媒体|社交声量|(^|[^a-z])ig([^a-z]|$)|(^|[^a-z])fb([^a-z]|$)/i,
    requiredAccess: ['Meta / TikTok API 授权或合规社媒监听供应商账号', '查询词、国家和语言配置', '采样频率与去重规则'],
    outputContract: ['social_mentions_snapshot', 'sentiment_by_country', 'topic_keyword_snapshot'],
    stopCondition: 'dry-run 输出 querySet、countrySet、window、sampleCount 和去重策略。',
  },
  {
    connectorId: 'youtube-data',
    label: 'YouTube Data API',
    priority: 'P1',
    match: /youtube/i,
    requiredAccess: ['YouTube Data API key 或 OAuth client', '视频 ID / 频道 ID / 查询词清单', '配额和地区语言边界'],
    outputContract: ['youtube_video_snapshot', 'youtube_comment_snapshot', 'creator_profile_snapshot'],
    stopCondition: 'dry-run 输出 videoCount、commentSampleCount、quotaCost 和 sourceIds。',
  },
  {
    connectorId: 'trade-import',
    label: 'Import Genius / Customs Trade Data',
    priority: 'P1',
    match: /import genius|海关|hs编码|进出口/i,
    requiredAccess: ['Import Genius 授权或海关数据导出', 'HS code 清单', '国家、港口和时间窗口'],
    outputContract: ['customs_shipment_snapshot', 'hs_code_market_snapshot'],
    stopCondition: 'dry-run 输出 hsCodes、countrySet、window、sampleCount 和授权状态。',
  },
  {
    connectorId: 'internal-crm',
    label: 'Momcozy CRM',
    priority: 'P0',
    match: /crm|rfm/i,
    requiredAccess: ['CRM 只读导出或数仓视图', '客户脱敏规则', 'RFM 计算口径和时间窗口'],
    outputContract: ['customer_rfm_snapshot', 'retention_segment_snapshot'],
    stopCondition: 'dry-run 输出脱敏字段清单、rowCount、window 和 owner。',
  },
  {
    connectorId: 'internal-erp',
    label: 'Momcozy ERP / Supply Chain',
    priority: 'P1',
    match: /erp|供应链|库存|供应商/i,
    requiredAccess: ['ERP 只读导出或库存快照', '供应商主数据映射', '脱敏和权限审批记录'],
    outputContract: ['inventory_snapshot', 'supplier_master_snapshot', 'supply_cost_snapshot'],
    stopCondition: 'dry-run 输出 warehouseSet、skuCount、snapshotAt 和 owner。',
  },
  {
    connectorId: 'ai-generation',
    label: 'AI Generation Audit Log',
    priority: 'P2',
    match: /kimi|生成资产|设计助手|图像|ai模型配置/i,
    requiredAccess: ['AI 代理服务端调用日志', '模型版本、成本和请求状态字段', '素材审核结果'],
    outputContract: ['ai_generation_request_log', 'asset_review_snapshot'],
    stopCondition: 'dry-run 输出 requestCount、modelSet、costFieldsPresent 和审核状态分布。',
  },
  {
    connectorId: 'crawler-compliance',
    label: 'Compliant Web Review Crawler',
    priority: 'P2',
    match: /爬虫|网页评论/i,
    requiredAccess: ['robots.txt 和平台条款复核', '允许采集的 URL 模式', '限速、去重和原文留存策略'],
    outputContract: ['web_review_crawl_manifest', 'robots_compliance_record'],
    stopCondition: 'dry-run 输出 allowedUrlPatterns、robotsStatus、rateLimit 和 sourceIds。',
  },
  {
    connectorId: 'internal-knowledge-reporting',
    label: 'Internal Knowledge / Reporting Assets',
    priority: 'P2',
    match: /内部维护|内部管理|内部测算|报告元数据|知识库|渠道访谈|内部销售/i,
    requiredAccess: ['内部资产目录或报告库只读导出', 'owner、版本号和更新时间字段', '脱敏规则和审批记录'],
    outputContract: ['knowledge_asset_snapshot', 'report_metadata_snapshot', 'qualitative_source_manifest'],
    stopCondition: 'dry-run 输出 assetCount、ownerCoverage、versionCoverage 和 sourceIds。',
  },
];

function connectorDefinitionFor(source) {
  const text = `${source.id} ${source.page} ${source.metric} ${source.sourceName} ${source.sourceType} ${source.note} ${source.action}`.toLowerCase();

  const exactOrder = [
    ['youtube-data', /youtube/i],
    ['crawler-compliance', /爬虫|网页评论/i],
    ['review-nlp', /评论|review|voc|nlp|情感分析/i],
    ['ai-generation', /kimi|生成资产|设计助手|图像|ai模型配置/i],
  ];
  const exactMatch = exactOrder.find(([, pattern]) => pattern.test(text));
  if (exactMatch) {
    return connectorDefinitions.find((definition) => definition.connectorId === exactMatch[0]);
  }

  return connectorDefinitions.find((definition) => definition.match.test(text)) ?? {
    connectorId: 'unclassified-connector',
    label: 'Unclassified Connector',
    priority: 'P2',
    requiredAccess: ['明确授权系统、owner、采集窗口和输出契约'],
    outputContract: ['source_specific_snapshot'],
    stopCondition: 'dry-run 输出 sourceIds、owner、window 和 blockedReason。',
  };
}

function groupByConnector(items) {
  const groups = new Map();

  for (const item of items) {
    const existing = groups.get(item.connectorId) ?? {
      connectorId: item.connectorId,
      label: item.connectorLabel,
      priority: item.priority,
      sourceCount: 0,
      sourceIds: [],
      pages: [],
      requiredAccess: item.requiredAccess,
      outputContract: item.outputContract,
      stopCondition: item.stopCondition,
      blockedReason: item.blockedReason,
    };

    existing.sourceCount += 1;
    existing.sourceIds.push(item.id);
    if (!existing.pages.includes(item.page)) existing.pages.push(item.page);
    groups.set(item.connectorId, existing);
  }

  return [...groups.values()].sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority] || b.sourceCount - a.sourceCount || a.connectorId.localeCompare(b.connectorId);
  });
}

export function buildConnectorBacklog(sourceRegistry) {
  const items = sourceRegistry
    .filter((source) => classifyCollectionMethod(source) === 'connector-required')
    .map((source) => {
      const definition = connectorDefinitionFor(source);

      return {
        id: source.id,
        page: source.page,
        metric: source.metric,
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl,
        verificationStatus: source.verificationStatus,
        connectorId: definition.connectorId,
        connectorLabel: definition.label,
        priority: definition.priority,
        requiredAccess: definition.requiredAccess,
        outputContract: definition.outputContract,
        stopCondition: definition.stopCondition,
        blockedReason: '缺少授权连接器、采集窗口或脱敏复核记录；刷新脚本不得伪造已采集数据。',
        nextAction: source.action,
      };
    })
    .sort((a, b) => a.connectorId.localeCompare(b.connectorId) || a.id.localeCompare(b.id));

  const groups = groupByConnector(items);

  return {
    total: items.length,
    groupCount: groups.length,
    generatedRule: 'connector-required来源只产出接入队列，不产出真实业务数据。',
    groups,
    items,
  };
}
