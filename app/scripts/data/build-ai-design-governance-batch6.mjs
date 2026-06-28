#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const OUTPUT_DIR_NAME = 'ai-design-governance-batch6-20260625';
const OUTPUT_DIR = join(repoRoot, 'tmp/exports', OUTPUT_DIR_NAME);
const EVIDENCE_GRADE = 'L2-fixture-or-dry-run';
const PRIVACY_LEVEL = 'private/internal';
const BLOCKING_REASON = 'server-proxy-request-asset-hash-cost-and-commercial-review-required';

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

const runRows = [
  {
    design_run_id: 'design_assistant_generation_proxy',
    surface: 'DesignAssistant',
    source_ids: 'ds-029',
    run_scope: 'browser design assistant request routed through server proxy',
    request_id_status: 'blocked_missing_server_request_id',
    model_version_status: 'blocked_missing_provider_model_version',
    prompt_version_status: 'blocked_missing_prompt_template_hash',
    parameter_hash_status: 'blocked_missing_generation_parameter_hash',
    current_status: 'blocked_missing_generation_proxy_log',
  },
  {
    design_run_id: 'gallery_asset_ingestion_run',
    surface: 'AIGallery',
    source_ids: 'ds-026',
    run_scope: 'local gallery asset ingestion with origin and generated-vs-imported split',
    request_id_status: 'blocked_missing_origin_request_id',
    model_version_status: 'blocked_missing_source_model_version',
    prompt_version_status: 'blocked_missing_prompt_hash',
    parameter_hash_status: 'blocked_missing_asset_intake_hash',
    current_status: 'blocked_missing_asset_origin_manifest',
  },
  {
    design_run_id: 'erp_brief_context_run',
    surface: 'DesignAssistant/AIGallery',
    source_ids: 'ds-029|ds-026|ds-047|ds-049',
    run_scope: 'ERP gated SKU/category proxy context for design brief prioritization',
    request_id_status: 'blocked_missing_brief_request_id',
    model_version_status: 'not_applicable_until_generation_call',
    prompt_version_status: 'blocked_missing_brief_template_version',
    parameter_hash_status: 'blocked_missing_erp_context_hash',
    current_status: 'gated_context_only',
  },
  {
    design_run_id: 'report_visual_asset_run',
    surface: 'ReportsPage/ReportPreview',
    source_ids: 'ds-024|ds-026|ds-029',
    run_scope: 'report visual generation slot linked to claim matrix',
    request_id_status: 'blocked_missing_report_visual_request_id',
    model_version_status: 'blocked_missing_visual_model_version',
    prompt_version_status: 'blocked_missing_report_prompt_version',
    parameter_hash_status: 'blocked_missing_report_asset_parameter_hash',
    current_status: 'blocked_missing_report_claim_matrix',
  },
  {
    design_run_id: 'commercial_asset_release_run',
    surface: 'DesignAssistant/AIGallery',
    source_ids: 'ds-026|ds-029',
    run_scope: 'commercial candidate release workflow for generated assets',
    request_id_status: 'blocked_missing_release_request_id',
    model_version_status: 'blocked_missing_generation_provider_record',
    prompt_version_status: 'blocked_missing_release_prompt_hash',
    parameter_hash_status: 'blocked_missing_final_asset_hash',
    current_status: 'blocked_missing_commercial_review',
  },
].map((row) => ({
  ...row,
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  can_display_as_fact: 'false',
  blocking_reason: BLOCKING_REASON,
}));

const assetRows = [
  ['design_assistant_output_asset', 'DesignAssistant', 'design_assistant_generation_proxy', 'single generated candidate or reference image output', 'blocked_missing_output_asset_hash', 'blocked_missing_source_image_hash', 'blocked_missing_prompt_hash', 'no_image_bytes_in_artifact'],
  ['gallery_local_asset_origin', 'AIGallery', 'gallery_asset_ingestion_run', 'local gallery images with generated/imported/original split', 'blocked_missing_asset_hash_manifest', 'blocked_missing_origin_file_hash', 'blocked_missing_prompt_hash', 'local_path_only_no_binary_export'],
  ['erp_brief_reference_asset', 'DesignAssistant/AIGallery', 'erp_brief_context_run', 'brief reference derived from ERP category proxy context', 'blocked_missing_brief_context_hash', 'not_applicable', 'blocked_missing_brief_template_hash', 'hashed_context_only'],
  ['report_visual_asset_candidate', 'ReportsPage/ReportPreview', 'report_visual_asset_run', 'report chart/image candidate linked to claim matrix', 'blocked_missing_report_visual_hash', 'blocked_missing_report_source_hash', 'blocked_missing_report_prompt_hash', 'no_report_visual_export'],
  ['commercial_release_asset_candidate', 'AIGallery', 'commercial_asset_release_run', 'candidate asset requiring brand/legal/commercial approval', 'blocked_missing_final_asset_hash', 'blocked_missing_source_rights_hash', 'blocked_missing_release_prompt_hash', 'review_metadata_only'],
].map(([asset_manifest_id, surface, design_run_id, asset_scope, asset_hash_status, source_asset_hash_status, prompt_hash_status, storage_policy]) => ({
  asset_manifest_id,
  surface,
  design_run_id,
  asset_scope,
  asset_hash_status,
  source_asset_hash_status,
  prompt_hash_status,
  storage_policy,
  current_status: 'blocked_missing_asset_hash_and_origin_record',
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  can_display_as_fact: 'false',
  blocking_reason: BLOCKING_REASON,
}));

const costRows = [
  ['design_assistant_cost_audit', 'design_assistant_generation_proxy', 'DesignAssistant', 'provider usage line item for generated image request', 'blocked_missing_provider_invoice', 'blocked_missing_unit_cost', 'blocked_missing_currency_policy', 'blocked_missing_cost_center'],
  ['gallery_asset_cost_audit', 'gallery_asset_ingestion_run', 'AIGallery', 'asset-level generation/import cost split', 'blocked_missing_provider_or_import_record', 'blocked_missing_asset_cost', 'blocked_missing_currency_policy', 'blocked_missing_asset_owner'],
  ['erp_brief_cost_audit', 'erp_brief_context_run', 'DesignAssistant/AIGallery', 'brief derivation cost and context-preparation effort', 'not_applicable_until_generation_call', 'blocked_missing_internal_cost_policy', 'blocked_missing_currency_policy', 'blocked_missing_owner'],
  ['report_visual_cost_audit', 'report_visual_asset_run', 'ReportsPage/ReportPreview', 'report visual generation and export cost queue', 'blocked_missing_report_visual_invoice', 'blocked_missing_report_unit_cost', 'blocked_missing_currency_policy', 'blocked_missing_report_owner'],
  ['commercial_release_cost_audit', 'commercial_asset_release_run', 'AIGallery', 'commercial candidate finalization and review cost queue', 'blocked_missing_release_invoice', 'blocked_missing_release_unit_cost', 'blocked_missing_currency_policy', 'blocked_missing_commercial_owner'],
].map(([cost_queue_id, design_run_id, surface, cost_scope, provider_invoice_status, unit_cost_status, currency_policy_status, cost_center_status]) => ({
  cost_queue_id,
  design_run_id,
  surface,
  cost_scope,
  provider_invoice_status,
  unit_cost_status,
  currency_policy_status,
  cost_center_status,
  cost_charged: 'false',
  can_display_as_fact: 'false',
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  blocking_reason: BLOCKING_REASON,
}));

const reviewRows = [
  ['design_assistant_commercial_review', 'DesignAssistant', 'design_assistant_output_asset', 'brand; legal; product-owner; data-governance', 'blocked_missing_brand_review', 'blocked_missing_rights_review', 'blocked_missing_commercial_use_policy'],
  ['gallery_asset_commercial_review', 'AIGallery', 'gallery_local_asset_origin', 'brand; legal; creative-owner; data-governance', 'blocked_missing_gallery_asset_review', 'blocked_missing_origin_rights_review', 'blocked_missing_gallery_use_policy'],
  ['erp_brief_commercial_review', 'DesignAssistant/AIGallery', 'erp_brief_reference_asset', 'product-owner; ERP-data-owner; data-governance', 'blocked_missing_brief_review', 'blocked_missing_internal_data_use_review', 'blocked_missing_brief_display_policy'],
  ['report_visual_commercial_review', 'ReportsPage/ReportPreview', 'report_visual_asset_candidate', 'insight-owner; brand; legal; data-governance', 'blocked_missing_report_visual_review', 'blocked_missing_report_rights_review', 'blocked_missing_report_export_policy'],
  ['commercial_release_final_review', 'AIGallery', 'commercial_release_asset_candidate', 'brand; legal; commercial-owner; creative-owner', 'blocked_missing_final_brand_review', 'blocked_missing_final_rights_review', 'blocked_missing_commercial_release_policy'],
].map(([review_gate_id, surface, asset_manifest_id, required_roles, brand_review_status, rights_status, commercial_policy_status]) => ({
  review_gate_id,
  surface,
  asset_manifest_id,
  required_roles,
  brand_review_status,
  rights_status,
  commercial_policy_status,
  approval_state: 'not_approved',
  can_use_commercially: 'false',
  can_publish: 'false',
  can_display_as_fact: 'false',
  evidence_grade: EVIDENCE_GRADE,
  privacy_level: PRIVACY_LEVEL,
  blocking_reason: BLOCKING_REASON,
}));

const files = {
  'ai_design_run_manifest.csv': {
    rows: runRows,
    headers: ['design_run_id', 'surface', 'source_ids', 'run_scope', 'request_id_status', 'model_version_status', 'prompt_version_status', 'parameter_hash_status', 'current_status', 'evidence_grade', 'privacy_level', 'can_display_as_fact', 'blocking_reason'],
  },
  'ai_design_asset_hash_manifest.csv': {
    rows: assetRows,
    headers: ['asset_manifest_id', 'surface', 'design_run_id', 'asset_scope', 'asset_hash_status', 'source_asset_hash_status', 'prompt_hash_status', 'storage_policy', 'current_status', 'evidence_grade', 'privacy_level', 'can_display_as_fact', 'blocking_reason'],
  },
  'ai_design_cost_queue.csv': {
    rows: costRows,
    headers: ['cost_queue_id', 'design_run_id', 'surface', 'cost_scope', 'provider_invoice_status', 'unit_cost_status', 'currency_policy_status', 'cost_center_status', 'cost_charged', 'can_display_as_fact', 'evidence_grade', 'privacy_level', 'blocking_reason'],
  },
  'ai_design_commercial_review_gate.csv': {
    rows: reviewRows,
    headers: ['review_gate_id', 'surface', 'asset_manifest_id', 'required_roles', 'brand_review_status', 'rights_status', 'commercial_policy_status', 'approval_state', 'can_use_commercially', 'can_publish', 'can_display_as_fact', 'evidence_grade', 'privacy_level', 'blocking_reason'],
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
    generatedRule: 'Local design governance derivation only; no provider call, model call, production write, live connector access, prompt body, generated image bytes, credentials, invoice details, or commercial approval.',
    sourceIds: ['ds-024', 'ds-026', 'ds-029', 'ds-047', 'ds-049'],
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
      requestIdIncluded: false,
      promptBodyIncluded: false,
      generatedImageBytesIncluded: false,
      credentialsIncluded: false,
      invoiceDetailsIncluded: false,
      costCharged: false,
      commercialUseApproved: false,
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
      designRunRows: runRows.length,
      assetHashRows: assetRows.length,
      costQueueRows: costRows.length,
      commercialReviewRows: reviewRows.length,
      blockedRows: runRows.length + assetRows.length + costRows.length + reviewRows.length,
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
    writeFileSync(join(OUTPUT_DIR, 'batch6_ai_design_governance_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(args.noWrite ? { ...manifest, dryRun: true } : manifest, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `AI design Batch6 governance artifacts ${args.noWrite ? 'planned' : 'written'}: ${manifest.summary.designRunRows} design-run gates, ${manifest.summary.assetHashRows} asset hash rows, ${manifest.summary.commercialReviewRows} commercial review rows.\n`,
  );
}

main();
