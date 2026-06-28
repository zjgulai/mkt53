#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const OUTPUT_DIR_NAME = 'ai-review-governance-batch5-20260625';
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L2-fixture-or-dry-run';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'sample-manifest-eval-and-human-review-required';

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
  };
}

function csvEscape(value) {
  const normalized = String(value ?? '');
  if (/[",\n\r]/.test(normalized)) return `"${normalized.replace(/"/g, '""')}"`;
  return normalized;
}

function toCsv(rows, headers) {
  return `${[headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n')}\n`;
}

function fileHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

const sampleManifestRows = [
  {
    sample_manifest_id: 'commentdata_authorized_review_snapshot',
    surface: 'CommentData',
    source_ids: 'ds-021',
    sample_scope: 'authorized Amazon/owned-site/VOC review snapshot metadata only',
    required_connector: 'VOC or platform review connector with owner approval',
    sampling_window_status: 'blocked_missing_authorized_window',
    dedupe_policy_status: 'blocked_missing_dedupe_rule',
    raw_text_policy: 'hash-and-summary-only',
    sample_hash_policy: 'required_before_nlp',
    pii_policy: 'redaction_required_before_storage',
    current_status: 'blocked_missing_sample_manifest',
  },
  {
    sample_manifest_id: 'review_analysis_voc_model_sample',
    surface: 'ReviewAnalysis',
    source_ids: 'ds-030|ds-021',
    sample_scope: 'sentiment/topic/risk model input sample contract',
    required_connector: 'VOC NLP sample manifest plus model eval set',
    sampling_window_status: 'blocked_missing_sample_window',
    dedupe_policy_status: 'blocked_missing_product_language_mapping',
    raw_text_policy: 'no_raw_text_in_output',
    sample_hash_policy: 'required_for_each_sample_row',
    pii_policy: 'reviewer-redacted',
    current_status: 'blocked_missing_review_sample_manifest',
  },
  {
    sample_manifest_id: 'youtube_video_comment_manifest',
    surface: 'YoutubeReview',
    source_ids: 'ds-031',
    sample_scope: 'video id list, query terms, public metadata and comment sampling rules',
    required_connector: 'YouTube Data API manifest with quota window',
    sampling_window_status: 'blocked_missing_video_id_manifest',
    dedupe_policy_status: 'blocked_missing_channel_video_dedupe_rule',
    raw_text_policy: 'metadata-first-no-comment-body',
    sample_hash_policy: 'video_id_and_comment_id_hash_required',
    pii_policy: 'public-metadata-only-until-reviewed',
    current_status: 'blocked_missing_api_manifest',
  },
  {
    sample_manifest_id: 'web_review_url_sampling_manifest',
    surface: 'WebReview',
    source_ids: 'ds-023',
    sample_scope: 'robots-reviewed URLs, page hash, crawl timestamp and platform terms',
    required_connector: 'compliant crawler or manual URL evidence pack',
    sampling_window_status: 'blocked_missing_url_sample',
    dedupe_policy_status: 'blocked_missing_page_hash_rule',
    raw_text_policy: 'no-page-body-export',
    sample_hash_policy: 'url_and_page_hash_required',
    pii_policy: 'no-account-data',
    current_status: 'blocked_missing_robots_sampling_manifest',
  },
  {
    sample_manifest_id: 'flavor_map_voc_topic_sample',
    surface: 'FlavorMap',
    source_ids: 'ds-032|ds-021',
    sample_scope: 'VOC keyword dictionary, function taxonomy and country/channel mapping',
    required_connector: 'VOC snapshot plus keyword dictionary review',
    sampling_window_status: 'blocked_missing_voc_window',
    dedupe_policy_status: 'blocked_missing_topic_dictionary_version',
    raw_text_policy: 'hash-and-topic-label-only',
    sample_hash_policy: 'sample_hash_and_keyword_rule_required',
    pii_policy: 'aggregate-only-before-map-display',
    current_status: 'blocked_missing_keyword_sample_manifest',
  },
  {
    sample_manifest_id: 'flavor_report_trend_sample',
    surface: 'FlavorReport',
    source_ids: 'ds-033|ds-032',
    sample_scope: 'VOC trend report claim sample, forecast boundary and evidence snapshot',
    required_connector: 'VOC snapshot, trend claim matrix and reviewer record',
    sampling_window_status: 'blocked_missing_trend_snapshot',
    dedupe_policy_status: 'blocked_missing_trend_claim_rule',
    raw_text_policy: 'claim-evidence-summary-only',
    sample_hash_policy: 'claim_sample_hash_required',
    pii_policy: 'report-export-gated',
    current_status: 'blocked_missing_report_sample_snapshot',
  },
].map((row) => ({
  ...row,
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  can_display_as_fact: 'false',
  blocking_reason: BLOCKING_REASON,
}));

const evalQueueRows = [
  ['commentdata_sentiment_eval', 'commentdata_authorized_review_snapshot', 'CommentData', 'sentiment accuracy + topic coverage + language split', 'blocked_missing_gold_set'],
  ['review_analysis_topic_eval', 'review_analysis_voc_model_sample', 'ReviewAnalysis', 'topic precision + risk label recall + reviewer agreement', 'blocked_missing_model_eval_report'],
  ['youtube_comment_metadata_eval', 'youtube_video_comment_manifest', 'YoutubeReview', 'video metadata coverage + comment sample audit + quota compliance', 'blocked_missing_api_quota_record'],
  ['web_review_sampling_eval', 'web_review_url_sampling_manifest', 'WebReview', 'robots compliance + page hash reproducibility + crawl error rate', 'blocked_missing_robots_review'],
  ['flavor_map_topic_eval', 'flavor_map_voc_topic_sample', 'FlavorMap', 'keyword dictionary precision + country mapping coverage', 'blocked_missing_keyword_eval'],
  ['flavor_report_claim_eval', 'flavor_report_trend_sample', 'FlavorReport', 'trend claim support rate + forecast boundary review', 'blocked_missing_claim_eval'],
].map(([eval_queue_id, sample_manifest_id, surface, metric_contract, current_status]) => ({
  eval_queue_id,
  sample_manifest_id,
  surface,
  metric_contract,
  model_version_status: 'blocked_missing_model_version',
  prompt_version_status: 'blocked_missing_prompt_or_rule_version',
  golden_set_status: 'blocked_missing_human_labeled_sample',
  request_trace_status: 'blocked_missing_request_or_job_id',
  current_status,
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  can_display_as_fact: 'false',
  blocking_reason: BLOCKING_REASON,
}));

const humanReviewRows = [
  ['commentdata_human_review', 'commentdata_sentiment_eval', 'CommentData', 'user-research; data-governance', 'minimum 30 sampled records or owner-approved exception'],
  ['review_analysis_human_review', 'review_analysis_topic_eval', 'ReviewAnalysis', 'user-research; NLP-owner; data-governance', 'topic/risk sample plus disagreement log'],
  ['youtube_human_review', 'youtube_comment_metadata_eval', 'YoutubeReview', 'growth-marketing; legal; data-governance', 'video id sample, query term review and quota note'],
  ['web_review_human_review', 'web_review_sampling_eval', 'WebReview', 'crawler-owner; legal; data-governance', 'robots evidence, sampled URL list and crawl policy'],
  ['flavor_map_human_review', 'flavor_map_topic_eval', 'FlavorMap', 'product-research; user-research; data-governance', 'keyword dictionary review and country/channel sample'],
  ['flavor_report_human_review', 'flavor_report_claim_eval', 'FlavorReport', 'insight-owner; business-owner; data-governance', 'claim matrix plus reviewer approval before export'],
].map(([review_task_id, eval_queue_id, surface, required_roles, minimum_review_contract]) => ({
  review_task_id,
  eval_queue_id,
  surface,
  required_roles,
  minimum_review_contract,
  approval_state: 'not_approved',
  escalation_rule: 'block_publish_until_owner_review',
  can_publish: 'false',
  can_display_as_fact: 'false',
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  blocking_reason: BLOCKING_REASON,
}));

const publishGateRows = [
  {
    publish_gate_id: 'commentdata_publish_gate',
    surface: 'CommentData',
    source_ids: 'ds-021',
    blocked_claim_types: 'review volume; positive rate; platform ranking; user conclusion',
    allowed_display: 'connector status, sample contract and missing approval',
    forbidden_display: 'real review count, sentiment percent or platform-wide facts',
    next_evidence: 'authorized snapshot, hash manifest, eval report and human approval',
  },
  {
    publish_gate_id: 'review_analysis_publish_gate',
    surface: 'ReviewAnalysis',
    source_ids: 'ds-030|ds-021',
    blocked_claim_types: 'keyword ranking; sentiment conclusion; product recommendation',
    allowed_display: 'model readiness and evaluation queue',
    forbidden_display: 'AI insight as customer fact or exportable KPI',
    next_evidence: 'sample manifest, model eval report, reviewer agreement record',
  },
  {
    publish_gate_id: 'youtube_publish_gate',
    surface: 'YoutubeReview',
    source_ids: 'ds-031',
    blocked_claim_types: 'video volume; views; creator score; brand sentiment',
    allowed_display: 'API manifest status and quota blocker',
    forbidden_display: 'YouTube platform metrics or influencer ranking',
    next_evidence: 'video id list, quota record, timestamped metadata hash',
  },
  {
    publish_gate_id: 'web_review_publish_gate',
    surface: 'WebReview',
    source_ids: 'ds-023',
    blocked_claim_types: 'site score; UX conclusion; competitor comparison score',
    allowed_display: 'robots review status and sampled URL backlog',
    forbidden_display: 'real website audit score or crawler-derived conclusion',
    next_evidence: 'robots review, URL sample, crawl log and reviewer approval',
  },
  {
    publish_gate_id: 'flavor_map_publish_gate',
    surface: 'FlavorMap',
    source_ids: 'ds-032|ds-021',
    blocked_claim_types: 'feature heat; country preference; adoption rate',
    allowed_display: 'keyword dictionary and VOC sample blocker',
    forbidden_display: 'global VOC trend, region rank or adoption percentage',
    next_evidence: 'VOC snapshot, keyword version and mapping review',
  },
  {
    publish_gate_id: 'flavor_report_publish_gate',
    surface: 'FlavorReport',
    source_ids: 'ds-033|ds-032',
    blocked_claim_types: 'trend forecast; report conclusion; exportable recommendation',
    allowed_display: 'claim matrix queue and review state',
    forbidden_display: 'forecast value, trend percent or report conclusion',
    next_evidence: 'claim-level source matrix, trend eval report and approval record',
  },
].map((row) => ({
  ...row,
  can_publish: 'false',
  can_export: 'false',
  can_display_as_fact: 'false',
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  blocking_reason: BLOCKING_REASON,
}));

const files = {
  'ai_review_sample_manifest.csv': {
    rows: sampleManifestRows,
    headers: ['sample_manifest_id', 'surface', 'source_ids', 'sample_scope', 'required_connector', 'sampling_window_status', 'dedupe_policy_status', 'raw_text_policy', 'sample_hash_policy', 'pii_policy', 'current_status', 'evidence_grade', 'privacy_level', 'can_display_as_fact', 'blocking_reason'],
  },
  'ai_review_eval_queue.csv': {
    rows: evalQueueRows,
    headers: ['eval_queue_id', 'sample_manifest_id', 'surface', 'metric_contract', 'model_version_status', 'prompt_version_status', 'golden_set_status', 'request_trace_status', 'current_status', 'evidence_grade', 'privacy_level', 'can_display_as_fact', 'blocking_reason'],
  },
  'ai_review_human_queue.csv': {
    rows: humanReviewRows,
    headers: ['review_task_id', 'eval_queue_id', 'surface', 'required_roles', 'minimum_review_contract', 'approval_state', 'escalation_rule', 'can_publish', 'can_display_as_fact', 'evidence_grade', 'privacy_level', 'blocking_reason'],
  },
  'ai_review_publish_gate.csv': {
    rows: publishGateRows,
    headers: ['publish_gate_id', 'surface', 'source_ids', 'blocked_claim_types', 'allowed_display', 'forbidden_display', 'next_evidence', 'can_publish', 'can_export', 'can_display_as_fact', 'evidence_grade', 'privacy_level', 'blocking_reason'],
  },
};

function buildArtifacts() {
  const materialized = Object.fromEntries(
    Object.entries(files).map(([fileName, file]) => {
      const csv = toCsv(file.rows, file.headers);
      return [
        fileName,
        {
          path: `tmp/exports/${OUTPUT_DIR_NAME}/${fileName}`,
          rowCount: file.rows.length,
          headers: file.headers,
          sha256: fileHash(csv),
          csv,
        },
      ];
    }),
  );

  const manifest = {
    batchId: OUTPUT_DIR_NAME,
    generatedAt: new Date().toISOString(),
    generatedRule: 'Local review governance derivation only; no provider call, model call, production write, live connector access, review body, credentials, or customer identifiers.',
    sourceIds: ['ds-021', 'ds-023', 'ds-030', 'ds-031', 'ds-032', 'ds-033'],
    evidenceGrade: EVIDENCE_GRADE,
    privacyLevel: PRIVACY_LEVEL,
    canDisplayAsFact: false,
    blockingReason: BLOCKING_REASON,
    boundaries: {
      networkCalls: 0,
      providerCalls: false,
      modelCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      reviewBodyIncluded: false,
      promptBodyIncluded: false,
      credentialsIncluded: false,
      customerIdentifiersIncluded: false,
      platformPersonalDataIncluded: false,
      publishEnabled: false,
      exportEnabled: false,
    },
    outputs: Object.fromEntries(
      Object.entries(materialized).map(([fileName, file]) => [
        fileName,
        {
          path: file.path,
          rowCount: file.rowCount,
          sha256: file.sha256,
          headers: file.headers,
        },
      ]),
    ),
    summary: {
      sampleManifestRows: sampleManifestRows.length,
      evalQueueRows: evalQueueRows.length,
      humanReviewRows: humanReviewRows.length,
      publishGateRows: publishGateRows.length,
      blockedRows: sampleManifestRows.length + evalQueueRows.length + humanReviewRows.length + publishGateRows.length,
    },
  };

  return { files: materialized, manifest };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { files: builtFiles, manifest } = buildArtifacts();

  if (!args.noWrite) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    for (const [fileName, file] of Object.entries(builtFiles)) writeFileSync(join(OUTPUT_DIR, fileName), file.csv, 'utf8');
    writeFileSync(join(OUTPUT_DIR, 'batch5_ai_review_governance_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `AI review Batch5 governance artifacts ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.sampleManifestRows} sample manifests, ${manifest.summary.evalQueueRows} eval queues, ${manifest.summary.humanReviewRows} human review queues.\n`,
  );
}

main();
