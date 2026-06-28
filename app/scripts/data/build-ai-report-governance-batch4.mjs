#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const OUTPUT_DIR_NAME = 'ai-report-governance-batch4-20260625';
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L2-fixture-or-dry-run';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'authorized-dataset-model-run-and-human-review-required';

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

const datasetRows = [
  {
    dataset_id: 'comments_voc_dataset',
    dataset_name: 'Comments and VOC evidence dataset',
    source_ids: 'ds-021|ds-030|ds-032|ds-033',
    data_scope: 'review_sample_manifest + sentiment_score_snapshot + topic_cluster_snapshot',
    required_artifacts: 'review_sample_manifest; model_eval_report; human_review_sample',
    current_status: 'blocked_missing_review_sample_manifest',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  },
  {
    dataset_id: 'youtube_video_dataset',
    dataset_name: 'YouTube video/comment metadata dataset',
    source_ids: 'ds-031',
    data_scope: 'video_id_list + query_terms + quota_window + crawl_timestamp',
    required_artifacts: 'youtube_api_manifest; video_metadata_hash; quota_record',
    current_status: 'blocked_missing_youtube_api_manifest',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  },
  {
    dataset_id: 'web_review_dataset',
    dataset_name: 'Web review and competitor page dataset',
    source_ids: 'ds-023',
    data_scope: 'robots_policy + sampled_url_manifest + page_hash',
    required_artifacts: 'robots_review; source_url_manifest; crawl_log',
    current_status: 'blocked_missing_robots_sampling_manifest',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  },
  {
    dataset_id: 'knowledge_base_dataset',
    dataset_name: 'Internal knowledge base retrieval dataset',
    source_ids: 'ds-022',
    data_scope: 'knowledge_asset_snapshot + retrieval_eval_set + version_manifest',
    required_artifacts: 'kb_version_manifest; retrieval_eval_report; owner_review',
    current_status: 'versioned_internal_asset_needs_eval',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: 'retrieval-eval-and-version-isolation-required',
  },
  {
    dataset_id: 'ai_gallery_asset_dataset',
    dataset_name: 'AI gallery and design generation asset dataset',
    source_ids: 'ds-026|ds-029',
    data_scope: 'asset_hash + generation_request_id + model_version + review_status',
    required_artifacts: 'generation_audit_log; asset_hash_manifest; commercial_review',
    current_status: 'blocked_missing_generation_audit_log',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: BLOCKING_REASON,
  },
  {
    dataset_id: 'erp_context_dataset',
    dataset_name: 'ERP internal context bridge dataset',
    source_ids: 'ds-047|ds-049|ds-050|ds-051',
    data_scope: 'internal proxy numerator + sku/category/channel hash context',
    required_artifacts: 'erp_field_dictionary; display_approval; pii_review',
    current_status: 'gated_internal_proxy_available',
    evidence_grade: 'L3-production-read-only',
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: 'erp-context-is-numerator-not-ai-or-market-fact',
  },
  {
    dataset_id: 'report_catalog_dataset',
    dataset_name: 'Report catalog and generation queue dataset',
    source_ids: 'ds-024',
    data_scope: 'report_metadata + source_claim_matrix + generation_status',
    required_artifacts: 'report_claim_matrix; reviewer_record; export_manifest',
    current_status: 'metadata_only',
    evidence_grade: EVIDENCE_GRADE,
    privacy_level: PRIVACY_LEVEL,
    can_display_as_fact: 'false',
    blocking_reason: 'claim-level-source-matrix-required',
  },
];

const modelRunRows = [
  ['comment_nlp_run', 'ReviewAnalysis/CommentData', 'comments_voc_dataset', 'sentiment + topic + risk clustering', 'blocked_missing_model_eval_report'],
  ['youtube_nlp_run', 'YoutubeReview', 'youtube_video_dataset', 'video metadata + comment/topic summarization', 'blocked_missing_api_manifest'],
  ['web_review_run', 'WebReview', 'web_review_dataset', 'site review summarization + competitor page comparison', 'blocked_missing_robots_sampling_manifest'],
  ['design_generation_run', 'DesignAssistant/AIGallery', 'ai_gallery_asset_dataset', 'image generation + prompt versioning + cost audit', 'blocked_missing_generation_audit_log'],
  ['rag_assistant_run', 'AIAssistantPage', 'knowledge_base_dataset', 'retrieval augmented answer with citations', 'blocked_missing_retrieval_trace'],
  ['knowledge_retrieval_eval', 'KnowledgeBase', 'knowledge_base_dataset', 'retrieval evaluation + answer citation coverage', 'blocked_missing_eval_set'],
  ['report_drafting_run', 'ReportsPage/ReportPreview', 'report_catalog_dataset|erp_context_dataset', 'draft report assembly from claim matrix', 'blocked_missing_human_review'],
].map(([model_run_id, surface, input_dataset_id, output_contract, current_status]) => ({
  model_run_id,
  surface,
  input_dataset_id,
  output_contract,
  model_name_status: 'blocked_missing_model_version',
  prompt_version_status: 'blocked_missing_prompt_version',
  run_trace_status: 'blocked_missing_request_id_and_trace',
  human_review_required: 'true',
  current_status,
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  can_display_as_fact: 'false',
  blocking_reason: BLOCKING_REASON,
}));

const humanReviewRows = [
  ['comment_review_gate', 'ReviewAnalysis/CommentData/FlavorMap/FlavorReport', 'user-research; data-governance', 'human_review_sample + inter-rater consistency', 'blocked_missing_review_sample'],
  ['youtube_review_gate', 'YoutubeReview', 'growth-marketing; legal', 'video_id_sample + quota review + rights notes', 'blocked_missing_api_review'],
  ['web_review_gate', 'WebReview', 'crawler-owner; legal', 'robots review + sampled_url approval', 'blocked_missing_robots_review'],
  ['design_asset_review_gate', 'DesignAssistant/AIGallery', 'brand; legal; creative', 'asset_hash + commercial-use approval', 'blocked_missing_asset_review'],
  ['report_review_gate', 'ReportsPage/ReportPreview', 'insight-owner; data-governance; business-owner', 'claim matrix + source trace + export approval', 'blocked_missing_claim_review'],
].map(([review_gate_id, surface, required_review_roles, minimum_sample_contract, current_status]) => ({
  review_gate_id,
  surface,
  required_review_roles,
  minimum_sample_contract,
  current_status,
  approval_state: 'not_approved',
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  can_display_as_fact: 'false',
  blocking_reason: BLOCKING_REASON,
}));

const reportQueueRows = [
  {
    report_id: 'internal_ops_monthly',
    report_type: '内部经营月报',
    source_ids: 'ds-047|ds-049|ds-050|ds-051|ds-024',
    input_datasets: 'erp_context_dataset|report_catalog_dataset',
    output_artifact_status: 'blocked_missing_field_dictionary_and_review',
    blocked_claims: 'revenue; target attainment; channel ranking; business recommendation',
    next_evidence: 'ERP field dictionary + monthly/channel export + reviewer approval',
    can_generate: 'false',
    can_display_as_fact: 'false',
  },
  {
    report_id: 'category_review',
    report_type: '品类复盘',
    source_ids: 'ds-047|ds-048|ds-049|ds-024',
    input_datasets: 'erp_context_dataset|report_catalog_dataset',
    output_artifact_status: 'blocked_missing_category_review',
    blocked_claims: 'category share; SKU ranking; lifecycle stage',
    next_evidence: 'category dictionary + source claim matrix + owner review',
    can_generate: 'false',
    can_display_as_fact: 'false',
  },
  {
    report_id: 'channel_review',
    report_type: '渠道复盘',
    source_ids: 'ds-049|ds-050|ds-051|ds-024',
    input_datasets: 'erp_context_dataset|report_catalog_dataset',
    output_artifact_status: 'blocked_missing_channel_split',
    blocked_claims: 'channel share; country ranking; customer conclusion',
    next_evidence: 'authorized channel split + anonymization policy + review',
    can_generate: 'false',
    can_display_as_fact: 'false',
  },
  {
    report_id: 'supply_risk_report',
    report_type: '供应链风险报告',
    source_ids: 'ds-035|ds-024',
    input_datasets: 'report_catalog_dataset',
    output_artifact_status: 'blocked_missing_inventory_snapshot',
    blocked_claims: 'inventory risk; stockout; warehouse allocation; supplier exposure',
    next_evidence: 'authorized WMS/ERP inventory snapshot + field dictionary',
    can_generate: 'false',
    can_display_as_fact: 'false',
  },
  {
    report_id: 'competitive_landscape_report',
    report_type: '竞品格局报告',
    source_ids: 'ds-009|ds-010|ds-024',
    input_datasets: 'report_catalog_dataset',
    output_artifact_status: 'blocked_missing_competitor_panel',
    blocked_claims: 'market share; competitor rank; price band; rating conclusion',
    next_evidence: 'Amazon/retail panel connector + SKU mapping + timestamped evidence',
    can_generate: 'false',
    can_display_as_fact: 'false',
  },
].map((row) => ({
  ...row,
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  blocking_reason: BLOCKING_REASON,
}));

const erpBridgeRows = [
  ['review_weighting_bridge', 'ReviewAnalysis/CommentData', 'ds-047|ds-049', 'weight AI review queue by gated SKU/category proxy context', 'cannot infer user sentiment or review counts from ERP'],
  ['design_brief_bridge', 'DesignAssistant/AIGallery', 'ds-047|ds-049', 'prioritize design brief categories from internal proxy demand context', 'cannot claim generated asset performance or commercial approval'],
  ['report_context_bridge', 'ReportsPage/ReportPreview', 'ds-047|ds-049|ds-050|ds-051', 'add internal numerator context to report queue after review', 'cannot replace market denominator, TAM, SAM, SOM, or competitor share'],
  ['supply_risk_bridge', 'ReportsPage/ReportPreview', 'ds-035', 'reserve report queue slot for inventory snapshot once authorized', 'cannot display inventory values from readiness artifact'],
  ['category_prioritization_bridge', 'KnowledgeBase/AIAssistantPage', 'ds-047|ds-049', 'route retrieval context to SKU/category governance topics', 'cannot expose raw SKU, customer, operator, or warehouse identifiers'],
].map(([bridge_id, ai_surface, erp_source_ids, allowed_use, forbidden_use]) => ({
  bridge_id,
  ai_surface,
  erp_source_ids,
  allowed_use,
  forbidden_use,
  current_status: 'gated_context_only',
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  can_display_as_fact: 'false',
  blocking_reason: 'erp-context-bridge-requires-review-before-ai-output',
}));

const files = {
  'ai_dataset_manifest.csv': {
    rows: datasetRows,
    headers: ['dataset_id', 'dataset_name', 'source_ids', 'data_scope', 'required_artifacts', 'current_status', 'evidence_grade', 'privacy_level', 'can_display_as_fact', 'blocking_reason'],
  },
  'ai_model_run_manifest.csv': {
    rows: modelRunRows,
    headers: ['model_run_id', 'surface', 'input_dataset_id', 'output_contract', 'model_name_status', 'prompt_version_status', 'run_trace_status', 'human_review_required', 'current_status', 'evidence_grade', 'privacy_level', 'can_display_as_fact', 'blocking_reason'],
  },
  'ai_human_review_gate.csv': {
    rows: humanReviewRows,
    headers: ['review_gate_id', 'surface', 'required_review_roles', 'minimum_sample_contract', 'current_status', 'approval_state', 'evidence_grade', 'privacy_level', 'can_display_as_fact', 'blocking_reason'],
  },
  'report_generation_queue.csv': {
    rows: reportQueueRows,
    headers: ['report_id', 'report_type', 'source_ids', 'input_datasets', 'output_artifact_status', 'blocked_claims', 'next_evidence', 'can_generate', 'can_display_as_fact', 'evidence_grade', 'privacy_level', 'blocking_reason'],
  },
  'ai_erp_context_bridge.csv': {
    rows: erpBridgeRows,
    headers: ['bridge_id', 'ai_surface', 'erp_source_ids', 'allowed_use', 'forbidden_use', 'current_status', 'evidence_grade', 'privacy_level', 'can_display_as_fact', 'blocking_reason'],
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
    generatedRule: 'Local governance readiness derivation only; no provider call, model call, production write, live connector access, review text, credentials, or customer data.',
    sourceIds: ['ds-021', 'ds-022', 'ds-023', 'ds-024', 'ds-025', 'ds-026', 'ds-029', 'ds-030', 'ds-031', 'ds-032', 'ds-033', 'ds-035', 'ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051'],
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
      rawReviewTextIncluded: false,
      rawPromptIncluded: false,
      credentialsIncluded: false,
      customerDataIncluded: false,
      reportConclusionsGenerated: false,
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
      datasetManifestRows: datasetRows.length,
      modelRunManifestRows: modelRunRows.length,
      humanReviewGateRows: humanReviewRows.length,
      reportQueueRows: reportQueueRows.length,
      erpBridgeRows: erpBridgeRows.length,
      blockedRows: datasetRows.length + modelRunRows.length + humanReviewRows.length + reportQueueRows.length + erpBridgeRows.length,
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
    writeFileSync(join(OUTPUT_DIR, 'batch4_ai_report_governance_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `AI/report Batch4 governance artifacts ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.datasetManifestRows} datasets, ${manifest.summary.modelRunManifestRows} model-run gates, ${manifest.summary.reportQueueRows} report queue rows.\n`,
  );
}

main();
