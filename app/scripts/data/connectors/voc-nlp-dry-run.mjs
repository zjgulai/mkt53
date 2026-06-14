#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildConnectorBacklog } from '../lib/connector-backlog.mjs';
import {
  buildCheck,
  configuredPathSource,
  findForbiddenKeys,
  isIsoDate,
  numberValue,
  readJsonObject,
  readinessValue,
  stringArray,
  unwrapJsonObject,
} from '../lib/connector-readiness.mjs';
import { extractSourceRegistry, isoWeek } from '../lib/project-analysis.mjs';

const connectorId = 'review-nlp';
const defaultWritePath = 'tmp/data-collection/connectors/voc-nlp-dry-run.json';
const readinessTemplatePath = 'scripts/data/connectors/templates/voc-nlp-readiness-template.json';
const sampleManifestTemplatePath = 'scripts/data/connectors/templates/voc-nlp-sample-manifest-template.json';
const recommendedLocalPrivateReadinessPath = 'configs/private/voc-nlp-readiness.json';
const recommendedServerPrivateReadinessPath = '/opt/mkt53/private/voc-nlp-readiness.json';
const recommendedLocalPrivateSampleManifestPath = 'configs/private/voc-nlp-sample-manifest.json';
const recommendedServerPrivateSampleManifestPath = '/opt/mkt53/private/voc-nlp-sample-manifest.json';
const minimumTotalReviewSampleCount = 1000;
const minimumLabeledSampleCount = 100;
const minimumHumanAgreementValue = 0.75;
const forbiddenSecretKeyPattern = /secret|password|accessToken|refreshToken|clientSecret|privateKey|authorizationHeader|apiKey/i;
const forbiddenRawDataKeyPattern = /^(rawReviewText|reviewText|commentText|reviewBody|customerEmail|customerPhone|customerName|orderId)$/i;

const snapshotContracts = [
  {
    snapshotType: 'review_sample_manifest',
    requiredFields: ['requestId', 'sourceId', 'datasetManifestId', 'collectionWindowStart', 'collectionWindowEnd', 'sampleCount', 'labeledSampleCount'],
  },
  {
    snapshotType: 'sentiment_score_snapshot',
    requiredFields: ['requestId', 'sourceId', 'modelName', 'modelVersion', 'sentimentLabel', 'sentimentScore', 'capturedAt'],
  },
  {
    snapshotType: 'topic_cluster_snapshot',
    requiredFields: ['requestId', 'sourceId', 'modelName', 'modelVersion', 'topicId', 'topicLabel', 'keywordDictionaryVersion', 'capturedAt'],
  },
  {
    snapshotType: 'human_review_sample',
    requiredFields: ['requestId', 'sourceId', 'reviewOwner', 'humanAgreementValue', 'labeledSampleCount', 'reviewApprovedAt'],
  },
];

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    readinessGate: argv.includes('--readiness-gate'),
    printReadinessTemplate: argv.includes('--print-readiness-template'),
    printSampleManifestTemplate: argv.includes('--print-sample-manifest-template'),
    writePath: defaultWritePath,
    readinessPath: undefined,
    sampleManifestPath: undefined,
    windowStart: '2026-06-01',
    windowEnd: '2026-06-15',
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--write') options.writePath = argv[i + 1];
    if (argv[i] === '--readiness') options.readinessPath = argv[i + 1];
    if (argv[i] === '--sample-manifest') options.sampleManifestPath = argv[i + 1];
    if (argv[i] === '--window-start') options.windowStart = argv[i + 1];
    if (argv[i] === '--window-end') options.windowEnd = argv[i + 1];
  }

  return options;
}

function readTemplate(path) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function readReadinessRecord(readinessPath) {
  const payload = readJsonObject(readinessPath, 'VOC NLP readiness file');
  return unwrapJsonObject(payload, 'readiness');
}

function readSampleManifest(sampleManifestPath) {
  const payload = readJsonObject(sampleManifestPath, 'VOC NLP sample manifest file');
  return unwrapJsonObject(payload, 'sampleManifest');
}

function buildReadinessView(readiness, sampleManifest) {
  return {
    authorizationRecordId: readiness?.authorizationRecordId,
    authorizationOwner: readiness?.authorizationOwner,
    authorizationApprovedAt: readiness?.authorizationApprovedAt,
    collectionWindowStart: readinessValue(readiness, sampleManifest, 'collectionWindowStart'),
    collectionWindowEnd: readinessValue(readiness, sampleManifest, 'collectionWindowEnd'),
    datasetManifestId: readinessValue(readiness, sampleManifest, 'datasetManifestId') ?? readinessValue(readiness, sampleManifest, 'sampleManifestId'),
    sourceIds: stringArray(readinessValue(readiness, sampleManifest, 'sourceIds')),
    totalReviewSampleCount: numberValue(readinessValue(readiness, sampleManifest, 'totalReviewSampleCount')),
    labeledSampleCount: numberValue(readinessValue(readiness, sampleManifest, 'labeledSampleCount')),
    sourceSampleCounts: readinessValue(readiness, sampleManifest, 'sourceSampleCounts') ?? {},
    humanAgreementValue: numberValue(readiness?.humanAgreementValue),
    reviewOwner: readiness?.reviewOwner,
    reviewApprovedAt: readiness?.reviewApprovedAt,
    modelName: readiness?.modelName,
    modelVersion: readiness?.modelVersion,
    keywordDictionaryVersion: readinessValue(readiness, sampleManifest, 'keywordDictionaryVersion'),
    productMappingStatus: readinessValue(readiness, sampleManifest, 'productMappingStatus'),
    piiHandlingStatus: readinessValue(readiness, sampleManifest, 'piiHandlingStatus'),
    complianceReviewer: readiness?.complianceReviewer,
    complianceReviewStatus: readiness?.complianceReviewStatus,
    allowedSnapshotTypes: stringArray(readiness?.allowedSnapshotTypes),
    containsRawReviewText: readinessValue(readiness, sampleManifest, 'containsRawReviewText'),
  };
}

function sourceCountsCoverRequiredSources(sourceSampleCounts, sourceIds) {
  if (!sourceSampleCounts || typeof sourceSampleCounts !== 'object' || Array.isArray(sourceSampleCounts)) return false;
  return sourceIds.every((sourceId) => numberValue(sourceSampleCounts[sourceId]) > 0);
}

function buildVocNlpReadinessGate(dryRun, options = {}, env = process.env) {
  const readinessPath = options.readinessPath ?? env.MKT53_VOC_NLP_READINESS_PATH;
  const sampleManifestPath = options.sampleManifestPath ?? env.MKT53_VOC_NLP_SAMPLE_MANIFEST_PATH;
  const readinessPathSource = configuredPathSource({
    explicitPath: options.readinessPath,
    envPath: env.MKT53_VOC_NLP_READINESS_PATH,
    envName: 'MKT53_VOC_NLP_READINESS_PATH',
  });
  const sampleManifestPathSource = configuredPathSource({
    explicitPath: options.sampleManifestPath,
    envPath: env.MKT53_VOC_NLP_SAMPLE_MANIFEST_PATH,
    envName: 'MKT53_VOC_NLP_SAMPLE_MANIFEST_PATH',
  });
  const readiness = readReadinessRecord(readinessPath);
  const sampleManifest = readSampleManifest(sampleManifestPath);
  const record = buildReadinessView(readiness, sampleManifest);
  const expectedSnapshotTypes = snapshotContracts.map((contract) => contract.snapshotType);
  const missingSourceIds = dryRun.sourceIds.filter((sourceId) => !record.sourceIds.includes(sourceId));
  const missingSnapshotTypes = expectedSnapshotTypes.filter((snapshotType) => !record.allowedSnapshotTypes.includes(snapshotType));
  const forbiddenKeyPatterns = [forbiddenSecretKeyPattern, forbiddenRawDataKeyPattern];
  const forbiddenKeys = [...findForbiddenKeys(readiness, forbiddenKeyPatterns), ...findForbiddenKeys(sampleManifest, forbiddenKeyPatterns)];
  const collectionWindowStartValid = isIsoDate(record.collectionWindowStart);
  const collectionWindowEndValid = isIsoDate(record.collectionWindowEnd);
  const collectionWindowOrderValid =
    collectionWindowStartValid && collectionWindowEndValid && record.collectionWindowStart <= record.collectionWindowEnd;
  const collectionWindowMatchesDryRun =
    record.collectionWindowStart === dryRun.collectionWindow.start && record.collectionWindowEnd === dryRun.collectionWindow.end;
  const rawTextAbsent = record.containsRawReviewText === false || record.containsRawReviewText === 'false';

  const checks = [
    buildCheck(
      'authorizationRecord',
      'VOC dataset authorization record is approved and owned',
      Boolean(readiness?.authorizationRecordId && readiness?.authorizationOwner && isIsoDate(readiness?.authorizationApprovedAt)),
      {
        readinessPathSource,
        configured: Boolean(readinessPath),
        authorizationRecordId: readiness?.authorizationRecordId ?? '',
        authorizationOwner: readiness?.authorizationOwner ?? '',
        authorizationApprovedAt: readiness?.authorizationApprovedAt ?? '',
      },
      { type: readinessPath ? 'invalid-authorization-record' : 'missing-readiness-record' },
    ),
    buildCheck(
      'collectionWindow',
      'Collection window is dated and matches this gate run',
      collectionWindowOrderValid && collectionWindowMatchesDryRun,
      {
        expectedStart: dryRun.collectionWindow.start,
        expectedEnd: dryRun.collectionWindow.end,
        configuredStart: record.collectionWindowStart ?? '',
        configuredEnd: record.collectionWindowEnd ?? '',
        validDateOrder: collectionWindowOrderValid,
      },
      { type: 'invalid-collection-window' },
    ),
    buildCheck(
      'sourceCoverage',
      'Private VOC sample manifest covers every Review NLP source id',
      missingSourceIds.length === 0,
      {
        expectedSourceIds: dryRun.sourceIds,
        configuredSourceIds: record.sourceIds,
        missingSourceIds,
      },
      { type: 'source-coverage-incomplete', missingSourceIds },
    ),
    buildCheck(
      'sampleVolume',
      'VOC sample volume and source distribution meet minimum thresholds',
      record.totalReviewSampleCount >= minimumTotalReviewSampleCount &&
        record.labeledSampleCount >= minimumLabeledSampleCount &&
        sourceCountsCoverRequiredSources(record.sourceSampleCounts, dryRun.sourceIds),
      {
        minimumTotalReviewSampleCount,
        minimumLabeledSampleCount,
        totalReviewSampleCount: Number.isNaN(record.totalReviewSampleCount) ? 0 : record.totalReviewSampleCount,
        labeledSampleCount: Number.isNaN(record.labeledSampleCount) ? 0 : record.labeledSampleCount,
        sourceSampleCountsCovered: sourceCountsCoverRequiredSources(record.sourceSampleCounts, dryRun.sourceIds),
      },
      { type: 'sample-volume-incomplete' },
    ),
    buildCheck(
      'modelTraceability',
      'Model, keyword dictionary, and product mapping are versioned',
      Boolean(record.modelName && record.modelVersion && record.keywordDictionaryVersion && record.productMappingStatus === 'ready'),
      {
        modelName: record.modelName ?? '',
        modelVersion: record.modelVersion ?? '',
        keywordDictionaryVersion: record.keywordDictionaryVersion ?? '',
        productMappingStatus: record.productMappingStatus ?? '',
      },
      { type: 'model-traceability-incomplete' },
    ),
    buildCheck(
      'humanReview',
      'Human review agreement and owner approval meet threshold',
      record.humanAgreementValue >= minimumHumanAgreementValue && Boolean(record.reviewOwner && isIsoDate(record.reviewApprovedAt)),
      {
        minimumHumanAgreementValue,
        humanAgreementValue: Number.isNaN(record.humanAgreementValue) ? 0 : record.humanAgreementValue,
        reviewOwner: record.reviewOwner ?? '',
        reviewApprovedAt: record.reviewApprovedAt ?? '',
      },
      { type: 'human-review-incomplete' },
    ),
    buildCheck(
      'privacyCompliance',
      'PII handling and compliance review are approved without raw review text in readiness files',
      record.piiHandlingStatus === 'approved' && record.complianceReviewStatus === 'approved' && rawTextAbsent,
      {
        piiHandlingStatus: record.piiHandlingStatus ?? '',
        complianceReviewer: record.complianceReviewer ?? '',
        complianceReviewStatus: record.complianceReviewStatus ?? '',
        containsRawReviewText: record.containsRawReviewText ?? '',
      },
      { type: 'privacy-compliance-incomplete' },
    ),
    buildCheck(
      'snapshotScope',
      'Allowed snapshot types cover the Review NLP output contract',
      missingSnapshotTypes.length === 0,
      {
        expectedSnapshotTypes,
        allowedSnapshotTypes: record.allowedSnapshotTypes,
        missingSnapshotTypes,
      },
      { type: 'snapshot-scope-incomplete', missingSnapshotTypes },
    ),
    buildCheck(
      'privateBoundary',
      'Readiness inputs contain no secret-like or raw customer fields',
      forbiddenKeys.length === 0,
      {
        readinessPathSource,
        sampleManifestPathSource,
        publicBundleAllowed: false,
        gitAllowed: false,
        forbiddenKeys,
      },
      { type: 'private-boundary-violated', fields: forbiddenKeys },
    ),
    buildCheck(
      'safetyBoundary',
      'Gate does not call platforms, models, or write business snapshots',
      dryRun.safety.networkCalls === 0 && dryRun.safety.modelCalls === 0 && dryRun.safety.businessDataWrites === 0 && dryRun.safety.dryRunOnly,
      {
        networkCalls: dryRun.safety.networkCalls,
        modelCalls: dryRun.safety.modelCalls,
        businessDataWrites: dryRun.safety.businessDataWrites,
        dryRunOnly: dryRun.safety.dryRunOnly,
      },
      { type: 'safety-boundary-violated' },
    ),
  ];
  const blockers = checks.flatMap((check) => check.blockers);

  return {
    schemaVersion: 1,
    connectorId,
    mode: 'readiness-gate',
    generatedAt: dryRun.generatedAt,
    requestId: dryRun.requestId.replace('voc-nlp-dry-run-', 'voc-nlp-readiness-'),
    status: blockers.length === 0 ? 'ready-for-authorized-voc-nlp-pipeline-implementation' : 'blocked',
    readinessPathSource,
    sampleManifestPathSource,
    privateInput: {
      readinessPathConfigured: Boolean(readinessPath),
      sampleManifestPathConfigured: Boolean(sampleManifestPath),
      recommendedLocalPrivateReadinessPath,
      recommendedServerPrivateReadinessPath,
      recommendedLocalPrivateSampleManifestPath,
      recommendedServerPrivateSampleManifestPath,
      publicBundleAllowed: false,
      gitAllowed: false,
    },
    thresholds: {
      minimumTotalReviewSampleCount,
      minimumLabeledSampleCount,
      minimumHumanAgreementValue,
    },
    checks,
    blockers,
    safety: dryRun.safety,
    stopCondition:
      'status=ready-for-authorized-voc-nlp-pipeline-implementation only when authorization, sample coverage, model traceability, human review, privacy compliance, snapshot scope and private boundary are all ready.',
  };
}

export function buildVocNlpDryRun(options = {}, env = process.env) {
  const appRoot = options.appRoot ?? process.cwd();
  const generatedAt = new Date().toISOString();
  const sourceRegistry = extractSourceRegistry(appRoot);
  const connectorBacklog = buildConnectorBacklog(sourceRegistry);
  const reviewBacklog = connectorBacklog.groups.find((group) => group.connectorId === connectorId);
  const backlogItems = connectorBacklog.items.filter((item) => item.connectorId === connectorId);
  const sourceIds = reviewBacklog?.sourceIds ?? [];
  const sourceCount = reviewBacklog?.sourceCount ?? 0;
  const blockers = [
    ...(sourceCount === 0 ? [{ type: 'missing-review-nlp-backlog' }] : []),
    { type: 'missing-private-voc-nlp-readiness-record' },
    { type: 'missing-private-voc-sample-manifest' },
    { type: 'missing-model-evaluation-record' },
    { type: 'missing-human-review-agreement-record' },
  ];

  return {
    schemaVersion: 1,
    connectorId,
    mode: 'dry-run',
    status: 'blocked',
    generatedAt,
    week: isoWeek(new Date(generatedAt)),
    requestId: `voc-nlp-dry-run-${randomUUID()}`,
    safety: {
      networkCalls: 0,
      modelCalls: 0,
      businessDataWrites: 0,
      privateValuesRedacted: true,
      dryRunOnly: true,
      rule: '该脚本只校验VOC/NLP授权前置条件和输出契约，不读取评论原文，不调用模型，不生成真实业务快照。',
    },
    collectionWindow: {
      start: options.windowStart,
      end: options.windowEnd,
      timezone: 'Asia/Shanghai',
    },
    sourceIds,
    sourceCount,
    backlogItems,
    requiredAccess: reviewBacklog?.requiredAccess ?? ['评论原文数据集或平台 API 授权', '关键词词典和产品映射', '模型版本与人工复核样本'],
    outputContract: reviewBacklog?.outputContract ?? snapshotContracts.map((contract) => contract.snapshotType),
    privateInput: {
      recommendedLocalPrivateReadinessPath,
      recommendedServerPrivateReadinessPath,
      recommendedLocalPrivateSampleManifestPath,
      recommendedServerPrivateSampleManifestPath,
      readinessTemplatePath,
      sampleManifestTemplatePath,
      publicBundleAllowed: false,
      gitAllowed: false,
      rule: '真实评论原文、标注样本、模型评估记录和owner信息只能留在私有路径；不得放入 public、src、tests/fixtures 或提交到 git。',
    },
    thresholds: {
      minimumTotalReviewSampleCount,
      minimumLabeledSampleCount,
      minimumHumanAgreementValue,
    },
    snapshotContracts,
    plannedSnapshots: snapshotContracts.map((contract) => ({
      snapshotType: contract.snapshotType,
      status: 'blocked',
      reason: '授权数据集、样本manifest、模型版本、人工一致率或合规复核未满足，不能生成真实VOC/NLP快照。',
      requiredFields: contract.requiredFields,
    })),
    blockers,
    stopCondition: reviewBacklog?.stopCondition ?? 'dry-run 输出样本窗口、模型版本、人工复核比例和 sourceIds，未授权时保持 blocked。',
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.printReadinessTemplate) {
    process.stdout.write(readTemplate(readinessTemplatePath));
    return;
  }

  if (options.printSampleManifestTemplate) {
    process.stdout.write(readTemplate(sampleManifestTemplatePath));
    return;
  }

  const result = buildVocNlpDryRun(options);

  if (options.readinessGate) {
    const gate = buildVocNlpReadinessGate(result, options);
    process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
    return;
  }

  if (!options.noWrite) {
    const target = resolve(process.cwd(), options.writePath);
    if (existsSync(target)) {
      writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
    } else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
    }
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    'mkt53 voc-nlp connector dry-run',
    `status=${result.status}`,
    `requestId=${result.requestId}`,
    `sourceCount=${result.sourceCount}`,
    `networkCalls=${result.safety.networkCalls}`,
    `modelCalls=${result.safety.modelCalls}`,
    `businessDataWrites=${result.safety.businessDataWrites}`,
    options.noWrite ? 'write=disabled' : `write=${options.writePath}`,
    '',
  ].join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
