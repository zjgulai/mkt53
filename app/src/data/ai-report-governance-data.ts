export const aiReportBatch4Artifact = {
  batchId: 'ai-report-governance-batch4-20260625',
  artifactDir: 'tmp/exports/ai-report-governance-batch4-20260625',
  manifestPath: 'tmp/exports/ai-report-governance-batch4-20260625/batch4_ai_report_governance_manifest.json',
  sourceIds: ['ds-021', 'ds-022', 'ds-023', 'ds-024', 'ds-025', 'ds-026', 'ds-029', 'ds-030', 'ds-031', 'ds-032', 'ds-033', 'ds-035', 'ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
  evidenceGrade: 'L2-fixture-or-dry-run',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'authorized-dataset-model-run-and-human-review-required',
  generatedRule: 'Local governance readiness derivation only; no provider call, model call, production write, live connector access, review text, credentials, or customer data.',
  summary: {
    datasetManifestRows: 7,
    modelRunManifestRows: 7,
    humanReviewGateRows: 5,
    reportQueueRows: 5,
    erpBridgeRows: 5,
    blockedRows: 29,
  },
  outputs: [
    'ai_dataset_manifest.csv',
    'ai_model_run_manifest.csv',
    'ai_human_review_gate.csv',
    'report_generation_queue.csv',
    'ai_erp_context_bridge.csv',
  ],
};

export const aiReportBatch4Metrics = [
  { label: 'dataset manifest', value: 7, note: 'review/VOC, YouTube, web review, KB, gallery/design, ERP context, report catalog', sourceIds: ['ds-021', 'ds-022', 'ds-023', 'ds-024', 'ds-026', 'ds-029', 'ds-030', 'ds-031'] },
  { label: 'model run gate', value: 7, note: 'model version, prompt version, request trace and eval report all blocked', sourceIds: ['ds-025', 'ds-029', 'ds-030', 'ds-031'] },
  { label: 'human review gate', value: 5, note: 'comment, YouTube, web review, design asset and report review gates are not approved', sourceIds: ['ds-021', 'ds-023', 'ds-024', 'ds-026'] },
  { label: 'report queue', value: 5, note: 'internal ops, category, channel, supply risk and competitive landscape reports are queued only', sourceIds: ['ds-024', 'ds-035', 'ds-047', 'ds-049', 'ds-050', 'ds-051'] },
  { label: 'ERP bridge', value: 5, note: 'ERP context can route numerator/proxy context but cannot become AI or market fact', sourceIds: ['ds-035', 'ds-047', 'ds-049', 'ds-050', 'ds-051'] },
];

export const aiDatasetReadinessRows = [
  { datasetId: 'comments_voc_dataset', surface: '评论/VOC', status: 'blocked_missing_review_sample_manifest', sourceIds: ['ds-021', 'ds-030', 'ds-032', 'ds-033'], canDisplayAsFact: false },
  { datasetId: 'youtube_video_dataset', surface: 'YouTube测评', status: 'blocked_missing_youtube_api_manifest', sourceIds: ['ds-031'], canDisplayAsFact: false },
  { datasetId: 'web_review_dataset', surface: '网页评测', status: 'blocked_missing_robots_sampling_manifest', sourceIds: ['ds-023'], canDisplayAsFact: false },
  { datasetId: 'knowledge_base_dataset', surface: '知识库', status: 'versioned_internal_asset_needs_eval', sourceIds: ['ds-022'], canDisplayAsFact: false },
  { datasetId: 'ai_gallery_asset_dataset', surface: '设计/图库', status: 'blocked_missing_generation_audit_log', sourceIds: ['ds-026', 'ds-029'], canDisplayAsFact: false },
  { datasetId: 'erp_context_dataset', surface: 'ERP上下文', status: 'gated_internal_proxy_available', sourceIds: ['ds-047', 'ds-049', 'ds-050', 'ds-051'], canDisplayAsFact: false },
  { datasetId: 'report_catalog_dataset', surface: '报告目录', status: 'metadata_only', sourceIds: ['ds-024'], canDisplayAsFact: false },
];

export const aiModelRunReadinessRows = [
  { runId: 'comment_nlp_run', surface: '评论分析/评论数据', status: 'blocked_missing_model_eval_report', sourceIds: ['ds-021', 'ds-030'], canDisplayAsFact: false },
  { runId: 'youtube_nlp_run', surface: 'YouTube测评', status: 'blocked_missing_api_manifest', sourceIds: ['ds-031'], canDisplayAsFact: false },
  { runId: 'web_review_run', surface: '网页评测', status: 'blocked_missing_robots_sampling_manifest', sourceIds: ['ds-023'], canDisplayAsFact: false },
  { runId: 'design_generation_run', surface: '设计助手/AI图库', status: 'blocked_missing_generation_audit_log', sourceIds: ['ds-026', 'ds-029'], canDisplayAsFact: false },
  { runId: 'rag_assistant_run', surface: 'AI助手', status: 'blocked_missing_retrieval_trace', sourceIds: ['ds-025', 'ds-022'], canDisplayAsFact: false },
  { runId: 'knowledge_retrieval_eval', surface: '知识库', status: 'blocked_missing_eval_set', sourceIds: ['ds-022'], canDisplayAsFact: false },
  { runId: 'report_drafting_run', surface: '报告中心/报告预览', status: 'blocked_missing_human_review', sourceIds: ['ds-024'], canDisplayAsFact: false },
];

export const reportGenerationQueueRows = [
  { reportId: 'internal_ops_monthly', title: '内部经营月报', status: 'blocked_missing_field_dictionary_and_review', sourceIds: ['ds-047', 'ds-049', 'ds-050', 'ds-051', 'ds-024'], canGenerate: false },
  { reportId: 'category_review', title: '品类复盘', status: 'blocked_missing_category_review', sourceIds: ['ds-047', 'ds-048', 'ds-049', 'ds-024'], canGenerate: false },
  { reportId: 'channel_review', title: '渠道复盘', status: 'blocked_missing_channel_split', sourceIds: ['ds-049', 'ds-050', 'ds-051', 'ds-024'], canGenerate: false },
  { reportId: 'supply_risk_report', title: '供应链风险报告', status: 'blocked_missing_inventory_snapshot', sourceIds: ['ds-035', 'ds-024'], canGenerate: false },
  { reportId: 'competitive_landscape_report', title: '竞品格局报告', status: 'blocked_missing_competitor_panel', sourceIds: ['ds-009', 'ds-010', 'ds-024'], canGenerate: false },
];

export const aiErpContextBridgeRows = [
  { bridgeId: 'review_weighting_bridge', surface: '评论分析/评论数据', allowedUse: '用 ERP gated SKU/category proxy 排序采集优先级', forbiddenUse: '不能从 ERP 推断用户情绪或评论数量', sourceIds: ['ds-047', 'ds-049'] },
  { bridgeId: 'design_brief_bridge', surface: '设计助手/AI图库', allowedUse: '用内部动销 proxy 约束设计 brief 类目', forbiddenUse: '不能证明素材表现或商用审核状态', sourceIds: ['ds-047', 'ds-049'] },
  { bridgeId: 'report_context_bridge', surface: '报告中心/报告预览', allowedUse: '经复核后补内部 numerator 上下文', forbiddenUse: '不能替代 TAM、SAM、SOM、竞品份额或市场分母', sourceIds: ['ds-047', 'ds-049', 'ds-050', 'ds-051'] },
  { bridgeId: 'supply_risk_bridge', surface: '供应链报告', allowedUse: '为授权库存快照预留报告队列', forbiddenUse: '不能从 readiness artifact 展示库存数值', sourceIds: ['ds-035'] },
  { bridgeId: 'category_prioritization_bridge', surface: '知识库/AI助手', allowedUse: '把检索上下文路由到 SKU/category 治理主题', forbiddenUse: '不能暴露原始 SKU、客户、运营或仓库标识', sourceIds: ['ds-047', 'ds-049'] },
];

export const aiReportBatch4DisplayPolicy = [
  'Batch 4 只生成 AI/报告治理 private/internal gated readiness，不包含真实评论、模型输出、生成图片调用日志、客户数据或报告结论。',
  'dataset_manifest、model_run_manifest、human_review_status 和 report_generation_queue 均为 private/internal L2 gate，canDisplayAsFact=false。',
  'ERP 只能作为 AI brief、报告队列或采集优先级的 gated context，不能替代用户态度、VOC、竞品份额、TAM/SAM/SOM 或库存事实。',
  '报告中心只能展示目录和补证状态；未完成 claim 级 source matrix 与人工复核前，不生成 PDF/CSV 正文导出。',
];
