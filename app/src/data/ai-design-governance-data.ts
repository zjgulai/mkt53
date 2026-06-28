export const aiDesignBatch6Artifact = {
  batchId: 'ai-design-governance-batch6-20260625',
  artifactDir: 'tmp/exports/ai-design-governance-batch6-20260625',
  manifestPath: 'tmp/exports/ai-design-governance-batch6-20260625/batch6_ai_design_governance_manifest.json',
  sourceIds: ['ds-024', 'ds-026', 'ds-029', 'ds-047', 'ds-049'],
  evidenceGrade: 'L2-fixture-or-dry-run',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'server-proxy-request-asset-hash-cost-and-commercial-review-required',
  generatedRule: 'Local design governance derivation only; no provider call, model call, production write, live connector access, prompt body, generated image bytes, credentials, invoice details, or commercial approval.',
  summary: {
    designRunRows: 5,
    assetHashRows: 5,
    costQueueRows: 5,
    commercialReviewRows: 5,
    blockedRows: 20,
  },
  outputs: [
    'ai_design_run_manifest.csv',
    'ai_design_asset_hash_manifest.csv',
    'ai_design_cost_queue.csv',
    'ai_design_commercial_review_gate.csv',
  ],
};

export const aiDesignBatch6Metrics = [
  { label: 'design run manifest', value: 5, note: 'RequestId, model version, prompt version and parameter hash are all blocked until server proxy logs exist.', sourceIds: ['ds-029', 'ds-026'] },
  { label: 'asset hash manifest', value: 5, note: 'Generated/imported asset origin, prompt hash and final asset hash are missing.', sourceIds: ['ds-026', 'ds-029'] },
  { label: 'cost queue', value: 5, note: 'Provider invoice, unit cost, currency policy and cost center are not connected.', sourceIds: ['ds-026', 'ds-029'] },
  { label: 'commercial review gate', value: 5, note: 'Brand, legal, rights and commercial-use review are not approved.', sourceIds: ['ds-026', 'ds-029', 'ds-024'] },
];

export const aiDesignRunRows = [
  { runId: 'design_assistant_generation_proxy', surface: 'DesignAssistant', status: 'blocked_missing_generation_proxy_log', sourceIds: ['ds-029'], canDisplayAsFact: false },
  { runId: 'gallery_asset_ingestion_run', surface: 'AIGallery', status: 'blocked_missing_asset_origin_manifest', sourceIds: ['ds-026'], canDisplayAsFact: false },
  { runId: 'erp_brief_context_run', surface: 'DesignAssistant/AIGallery', status: 'gated_context_only', sourceIds: ['ds-029', 'ds-026', 'ds-047', 'ds-049'], canDisplayAsFact: false },
  { runId: 'report_visual_asset_run', surface: 'ReportsPage/ReportPreview', status: 'blocked_missing_report_claim_matrix', sourceIds: ['ds-024', 'ds-026', 'ds-029'], canDisplayAsFact: false },
  { runId: 'commercial_asset_release_run', surface: 'DesignAssistant/AIGallery', status: 'blocked_missing_commercial_review', sourceIds: ['ds-026', 'ds-029'], canDisplayAsFact: false },
];

export const aiDesignAssetHashRows = [
  { assetId: 'design_assistant_output_asset', surface: 'DesignAssistant', status: 'blocked_missing_asset_hash_and_origin_record', storagePolicy: 'no_image_bytes_in_artifact', canDisplayAsFact: false },
  { assetId: 'gallery_local_asset_origin', surface: 'AIGallery', status: 'blocked_missing_asset_hash_and_origin_record', storagePolicy: 'local_path_only_no_binary_export', canDisplayAsFact: false },
  { assetId: 'erp_brief_reference_asset', surface: 'DesignAssistant/AIGallery', status: 'blocked_missing_asset_hash_and_origin_record', storagePolicy: 'hashed_context_only', canDisplayAsFact: false },
  { assetId: 'report_visual_asset_candidate', surface: 'ReportsPage/ReportPreview', status: 'blocked_missing_asset_hash_and_origin_record', storagePolicy: 'no_report_visual_export', canDisplayAsFact: false },
  { assetId: 'commercial_release_asset_candidate', surface: 'AIGallery', status: 'blocked_missing_asset_hash_and_origin_record', storagePolicy: 'review_metadata_only', canDisplayAsFact: false },
];

export const aiDesignCostRows = [
  { costId: 'design_assistant_cost_audit', surface: 'DesignAssistant', status: 'blocked_missing_provider_invoice', costCharged: false },
  { costId: 'gallery_asset_cost_audit', surface: 'AIGallery', status: 'blocked_missing_provider_or_import_record', costCharged: false },
  { costId: 'erp_brief_cost_audit', surface: 'DesignAssistant/AIGallery', status: 'not_applicable_until_generation_call', costCharged: false },
  { costId: 'report_visual_cost_audit', surface: 'ReportsPage/ReportPreview', status: 'blocked_missing_report_visual_invoice', costCharged: false },
  { costId: 'commercial_release_cost_audit', surface: 'AIGallery', status: 'blocked_missing_release_invoice', costCharged: false },
];

export const aiDesignCommercialReviewRows = [
  { reviewGateId: 'design_assistant_commercial_review', surface: 'DesignAssistant', approvalState: 'not_approved', canUseCommercially: false, canPublish: false },
  { reviewGateId: 'gallery_asset_commercial_review', surface: 'AIGallery', approvalState: 'not_approved', canUseCommercially: false, canPublish: false },
  { reviewGateId: 'erp_brief_commercial_review', surface: 'DesignAssistant/AIGallery', approvalState: 'not_approved', canUseCommercially: false, canPublish: false },
  { reviewGateId: 'report_visual_commercial_review', surface: 'ReportsPage/ReportPreview', approvalState: 'not_approved', canUseCommercially: false, canPublish: false },
  { reviewGateId: 'commercial_release_final_review', surface: 'AIGallery', approvalState: 'not_approved', canUseCommercially: false, canPublish: false },
];

export const aiDesignBatch6DisplayPolicy = [
  'Batch 6 只生成设计助手/AI图库治理队列，不包含真实 requestId、提示词正文、生成图片二进制、provider invoice、密钥或商用批准。',
  'design run、asset hash、cost queue 和 commercial review gate 均为 private/internal L2 gate，canDisplayAsFact=false。',
  '页面允许展示缺失证据、资产来源策略和审核阻断；不得展示真实生成历史、成本节省、素材可商用或模型质量结论。',
  'ERP 只能作为设计 brief 的 gated category/SKU context，不能证明生成资产表现、版权状态、商用许可或广告效果。',
];
