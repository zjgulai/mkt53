export const aiReviewBatch5Artifact = {
  batchId: 'ai-review-governance-batch5-20260625',
  artifactDir: 'tmp/exports/ai-review-governance-batch5-20260625',
  manifestPath: 'tmp/exports/ai-review-governance-batch5-20260625/batch5_ai_review_governance_manifest.json',
  sourceIds: ['ds-021', 'ds-023', 'ds-030', 'ds-031', 'ds-032', 'ds-033'],
  evidenceGrade: 'L2-fixture-or-dry-run',
  privacyLevel: 'private/internal',
  canDisplayAsFact: false,
  blockingReason: 'sample-manifest-eval-and-human-review-required',
  generatedRule: 'Local review governance derivation only; no provider call, model call, production write, live connector access, review body, credentials, or customer identifiers.',
  summary: {
    sampleManifestRows: 6,
    evalQueueRows: 6,
    humanReviewRows: 6,
    publishGateRows: 6,
    blockedRows: 24,
  },
  outputs: [
    'ai_review_sample_manifest.csv',
    'ai_review_eval_queue.csv',
    'ai_review_human_queue.csv',
    'ai_review_publish_gate.csv',
  ],
};

export const aiReviewBatch5Metrics = [
  { label: 'sample manifest', value: 6, note: 'CommentData, ReviewAnalysis, YouTube, WebReview, FlavorMap and FlavorReport all blocked until sample contracts exist.', sourceIds: ['ds-021', 'ds-023', 'ds-030', 'ds-031', 'ds-032', 'ds-033'] },
  { label: 'eval queue', value: 6, note: 'Model/rule version, golden set, request trace and metric contracts are missing.', sourceIds: ['ds-021', 'ds-030', 'ds-031', 'ds-032', 'ds-033'] },
  { label: 'human review queue', value: 6, note: 'Each surface requires owner review before publish/export.', sourceIds: ['ds-021', 'ds-023', 'ds-030', 'ds-031', 'ds-032', 'ds-033'] },
  { label: 'publish gate', value: 6, note: 'Review volume, sentiment, trend, ranking, site score and report conclusions remain blocked.', sourceIds: ['ds-021', 'ds-023', 'ds-030', 'ds-031', 'ds-032', 'ds-033'] },
];

export const aiReviewSampleManifestRows = [
  { manifestId: 'commentdata_authorized_review_snapshot', surface: 'CommentData', status: 'blocked_missing_sample_manifest', sourceIds: ['ds-021'], rawTextPolicy: 'hash-and-summary-only', canDisplayAsFact: false },
  { manifestId: 'review_analysis_voc_model_sample', surface: 'ReviewAnalysis', status: 'blocked_missing_review_sample_manifest', sourceIds: ['ds-030', 'ds-021'], rawTextPolicy: 'no_raw_text_in_output', canDisplayAsFact: false },
  { manifestId: 'youtube_video_comment_manifest', surface: 'YoutubeReview', status: 'blocked_missing_api_manifest', sourceIds: ['ds-031'], rawTextPolicy: 'metadata-first-no-comment-body', canDisplayAsFact: false },
  { manifestId: 'web_review_url_sampling_manifest', surface: 'WebReview', status: 'blocked_missing_robots_sampling_manifest', sourceIds: ['ds-023'], rawTextPolicy: 'no-page-body-export', canDisplayAsFact: false },
  { manifestId: 'flavor_map_voc_topic_sample', surface: 'FlavorMap', status: 'blocked_missing_keyword_sample_manifest', sourceIds: ['ds-032', 'ds-021'], rawTextPolicy: 'hash-and-topic-label-only', canDisplayAsFact: false },
  { manifestId: 'flavor_report_trend_sample', surface: 'FlavorReport', status: 'blocked_missing_report_sample_snapshot', sourceIds: ['ds-033', 'ds-032'], rawTextPolicy: 'claim-evidence-summary-only', canDisplayAsFact: false },
];

export const aiReviewEvalQueueRows = [
  { evalId: 'commentdata_sentiment_eval', surface: 'CommentData', status: 'blocked_missing_gold_set', metric: 'sentiment accuracy + topic coverage + language split', canDisplayAsFact: false },
  { evalId: 'review_analysis_topic_eval', surface: 'ReviewAnalysis', status: 'blocked_missing_model_eval_report', metric: 'topic precision + risk label recall + reviewer agreement', canDisplayAsFact: false },
  { evalId: 'youtube_comment_metadata_eval', surface: 'YoutubeReview', status: 'blocked_missing_api_quota_record', metric: 'metadata coverage + sample audit + quota compliance', canDisplayAsFact: false },
  { evalId: 'web_review_sampling_eval', surface: 'WebReview', status: 'blocked_missing_robots_review', metric: 'robots compliance + page hash reproducibility', canDisplayAsFact: false },
  { evalId: 'flavor_map_topic_eval', surface: 'FlavorMap', status: 'blocked_missing_keyword_eval', metric: 'keyword precision + country mapping coverage', canDisplayAsFact: false },
  { evalId: 'flavor_report_claim_eval', surface: 'FlavorReport', status: 'blocked_missing_claim_eval', metric: 'claim support rate + forecast boundary review', canDisplayAsFact: false },
];

export const aiReviewHumanReviewRows = [
  { reviewTaskId: 'commentdata_human_review', surface: 'CommentData', roles: 'user-research; data-governance', approvalState: 'not_approved', canPublish: false },
  { reviewTaskId: 'review_analysis_human_review', surface: 'ReviewAnalysis', roles: 'user-research; NLP-owner; data-governance', approvalState: 'not_approved', canPublish: false },
  { reviewTaskId: 'youtube_human_review', surface: 'YoutubeReview', roles: 'growth-marketing; legal; data-governance', approvalState: 'not_approved', canPublish: false },
  { reviewTaskId: 'web_review_human_review', surface: 'WebReview', roles: 'crawler-owner; legal; data-governance', approvalState: 'not_approved', canPublish: false },
  { reviewTaskId: 'flavor_map_human_review', surface: 'FlavorMap', roles: 'product-research; user-research; data-governance', approvalState: 'not_approved', canPublish: false },
  { reviewTaskId: 'flavor_report_human_review', surface: 'FlavorReport', roles: 'insight-owner; business-owner; data-governance', approvalState: 'not_approved', canPublish: false },
];

export const aiReviewPublishGateRows = [
  { gateId: 'commentdata_publish_gate', surface: 'CommentData', blockedClaims: 'review volume; positive rate; platform ranking; user conclusion', allowedDisplay: 'connector status, sample contract and missing approval', sourceIds: ['ds-021'] },
  { gateId: 'review_analysis_publish_gate', surface: 'ReviewAnalysis', blockedClaims: 'keyword ranking; sentiment conclusion; product recommendation', allowedDisplay: 'model readiness and evaluation queue', sourceIds: ['ds-030', 'ds-021'] },
  { gateId: 'youtube_publish_gate', surface: 'YoutubeReview', blockedClaims: 'video volume; views; creator score; brand sentiment', allowedDisplay: 'API manifest status and quota blocker', sourceIds: ['ds-031'] },
  { gateId: 'web_review_publish_gate', surface: 'WebReview', blockedClaims: 'site score; UX conclusion; competitor comparison score', allowedDisplay: 'robots review status and sampled URL backlog', sourceIds: ['ds-023'] },
  { gateId: 'flavor_map_publish_gate', surface: 'FlavorMap', blockedClaims: 'feature heat; country preference; adoption rate', allowedDisplay: 'keyword dictionary and VOC sample blocker', sourceIds: ['ds-032', 'ds-021'] },
  { gateId: 'flavor_report_publish_gate', surface: 'FlavorReport', blockedClaims: 'trend forecast; report conclusion; exportable recommendation', allowedDisplay: 'claim matrix queue and review state', sourceIds: ['ds-033', 'ds-032'] },
];

// audit-source: ds-021 ds-023 ds-030 ds-031 ds-032 ds-033
export const aiReviewBatch5DisplayPolicy = [
  'Batch 5 只生成评论/VOC/YouTube/Web 的样本级治理队列，不包含原始评论正文、平台个人数据、客户标识或模型输出。',
  'sample manifest、eval queue、human review queue 和 publish gate 均为 private/internal L2 gate，canDisplayAsFact=false。',
  '页面允许展示采集合同、缺失证据和阻断原因；不得展示真实评论数量、情绪百分比、达人排名、站点评分、VOC趋势或报告结论。',
  '只有完成授权样本、模型/规则评估、人工复核和 claim-level source matrix 后，才允许进入报告、CSV 或 KPI 展示。',
];
