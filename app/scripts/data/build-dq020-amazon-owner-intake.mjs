#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_GENERATED_AT = '2026-07-30T10:00:00.000Z';

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function parseArgs(argv) {
  const options = {
    spec: undefined,
    output: undefined,
    generatedAt: DEFAULT_GENERATED_AT,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--spec') {
      options.spec = argv[index += 1];
    } else if (arg === '--output') {
      options.output = argv[index += 1];
    } else if (arg === '--generated-at') {
      options.generatedAt = argv[index += 1];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.spec) throw new Error('--spec is required');
  if (!options.output) throw new Error('--output is required');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(options.generatedAt)) {
    throw new Error('--generated-at must be a canonical UTC timestamp');
  }
  return options;
}

function requiredSlots(spec, packetSpec) {
  return [...spec.commonRequiredEvidenceSlots, ...packetSpec.sourceSpecificEvidenceSlots];
}

function buildPacket(spec, packetSpec, generatedAt) {
  const slots = requiredSlots(spec, packetSpec);
  return {
    schemaVersion: 1,
    contractVersion: spec.contractVersion,
    gate: spec.gate,
    connectorId: spec.connectorId,
    generatedAt,
    packetId: packetSpec.packetId,
    sourceId: packetSpec.sourceId,
    page: packetSpec.page,
    scope: packetSpec.scope,
    status: 'awaiting-private-owner-input',
    packetEvidenceGrade: spec.maximumPacketEvidenceGrade,
    sourceEvidenceGrade: packetSpec.sourceEvidenceGrade,
    ownerRole: packetSpec.ownerRole,
    reviewerRoles: packetSpec.reviewerRoles,
    claimBoundary: packetSpec.claimBoundary,
    templateRefs: { ...spec.templateRefs },
    mappingContract: {
      minimumMappedItems: packetSpec.minimumMappedItems,
      requiredFields: [...spec.commonMappingFields],
      rowIdentity: ['sourceId', 'site', 'marketplaceId', 'asin'],
      privateOnly: true,
      hashAlgorithm: spec.hashAlgorithm,
    },
    snapshotContract: {
      requiredSnapshotTypes: [...packetSpec.requiredSnapshotTypes],
      requiredFieldsBySnapshotType: Object.fromEntries(
        packetSpec.requiredSnapshotTypes.map((snapshotType) => [
          snapshotType,
          [...spec.snapshotFieldContracts[snapshotType]],
        ]),
      ),
      requiredManifestFields: [
        'sourceId',
        'site',
        'marketplaceId',
        'collectionWindowStart',
        'collectionWindowEnd',
        'timezone',
        'capturedAt',
        'rowCount',
        'rejectedRowCount',
        'schemaVersion',
        'fieldDictionaryVersion',
        'fieldDictionarySha256',
        'contentSha256',
      ],
      hashAlgorithm: spec.hashAlgorithm,
      privateOnly: true,
    },
    requiredEvidenceSlots: slots.map((slot) => ({
      ...slot,
      value: null,
      evidenceHash: null,
      receivedAt: null,
      status: 'missing',
    })),
    readiness: {
      mappedItemCount: 0,
      siteMarketplaceReady: false,
      collectionWindowReady: false,
      fieldDictionaryReady: false,
      snapshotManifestReady: false,
      snapshotHashReady: false,
      ownerApproved: false,
      complianceApproved: false,
      releaseReviewApproved: false,
    },
    decision: {
      acceptanceStatus: 'blocked-owner-evidence-required',
      readyForPrivateValidation: false,
      readyForAuthorizedConnector: false,
      factPromotionAllowed: false,
      decisionReady: false,
    },
    boundaries: { ...spec.boundaries },
    forbiddenClaims: packetSpec.forbiddenClaims,
    disclosures: [
      'This committed file is an empty deterministic owner-intake template, not an owner submission or approval record.',
      'Real owner aliases, authorization records, ASIN/SKU mappings, snapshot paths, field dictionaries, and hashes belong only in approved private paths.',
      'No provider call, connector call, restricted access, live collection, database write, production write, deployment, or fact promotion occurred.',
      'The source remains L0, needs-review, non-displayable, and not decision-ready until private evidence passes separate mapping, readiness, and release-review gates.',
    ],
  };
}

function buildIndex(spec, manifest) {
  const rows = manifest.packets.map((packet) => (
    `| ${packet.sourceId} | ${packet.page} | ${packet.scope} | ${packet.minimumMappedItems} | ${packet.requiredSlotCount} | 0 | blocked |`
  ));
  return [
    '# DQ-020 Amazon owner intake bundle',
    '',
    `Generated at: \`${manifest.generatedAt}\``,
    '',
    'This checked-in bundle contains seven source-specific, empty intake templates. It proves only the local L2 fail-closed contract. It does not contain private ASIN/SKU values, owner identities, credentials, authorization records, field dictionaries, platform snapshots, or approved hashes.',
    '',
    '| Source | Page | Scope | Minimum mappings | Missing slots | Approved | Gate |',
    '|---|---|---|---:|---:|---:|---|',
    ...rows,
    '',
    `Summary: ${manifest.summary.packetCount} packets, ${manifest.summary.totalMinimumMappedItems} minimum private mappings, ${manifest.summary.missingRequiredSlotCount} required slots missing, 0 mapped rows, 0 owner approvals, 0 authorized snapshots, 0 decision-ready records, and 0 fact promotions.`,
    '',
    'Overall gate: `blocked-owner-evidence-required`. DQ-020 must remain open until an authorized business owner completes the private mapping/readiness drafts and independent release review accepts immutable snapshot evidence.',
    '',
    `Contract: \`${spec.contractVersion}\``,
    '',
  ].join('\n');
}

export function buildDq020AmazonOwnerIntakeBundle(
  spec,
  { outputPath, generatedAt = DEFAULT_GENERATED_AT },
) {
  if (spec?.gate !== 'DQ-020') throw new Error('Spec gate must be DQ-020');
  if (!Array.isArray(spec.packets) || spec.packets.length !== 7) {
    throw new Error('DQ-020 spec must define exactly seven packets');
  }

  const resolvedOutput = resolve(outputPath);
  const packetDirectory = join(resolvedOutput, 'packets');
  mkdirSync(packetDirectory, { recursive: true });

  const packetRecords = spec.packets.map((packetSpec) => {
    const packet = buildPacket(spec, packetSpec, generatedAt);
    const relativePath = `packets/${packet.packetId}.json`;
    const serialized = serializeJson(packet);
    writeFileSync(join(resolvedOutput, relativePath), serialized);
    return {
      packetId: packet.packetId,
      sourceId: packet.sourceId,
      page: packet.page,
      scope: packet.scope,
      path: relativePath,
      sha256: sha256(serialized),
      packetEvidenceGrade: packet.packetEvidenceGrade,
      sourceEvidenceGrade: packet.sourceEvidenceGrade,
      minimumMappedItems: packet.mappingContract.minimumMappedItems,
      requiredSlotCount: packet.requiredEvidenceSlots.length,
      mappedItemCount: 0,
      siteMarketplaceReady: false,
      collectionWindowReady: false,
      fieldDictionaryReady: false,
      snapshotHashReady: false,
      ownerApproved: false,
      authorizedSnapshotReady: false,
      decisionReady: false,
      factPromotion: false,
    };
  });

  const manifest = {
    schemaVersion: 1,
    contractVersion: spec.contractVersion,
    gate: spec.gate,
    connectorId: spec.connectorId,
    generatedAt,
    maximumPacketEvidenceGrade: spec.maximumPacketEvidenceGrade,
    status: 'intake-template-ready',
    overallGateDecision: 'blocked-owner-evidence-required',
    boundaries: { ...spec.boundaries },
    packets: packetRecords,
    summary: {
      packetCount: packetRecords.length,
      totalMinimumMappedItems: packetRecords.reduce((sum, packet) => sum + packet.minimumMappedItems, 0),
      missingRequiredSlotCount: packetRecords.reduce((sum, packet) => sum + packet.requiredSlotCount, 0),
      mappedItemCount: 0,
      siteMarketplaceReadyCount: 0,
      collectionWindowReadyCount: 0,
      fieldDictionaryReadyCount: 0,
      snapshotHashReadyCount: 0,
      ownerApprovedCount: 0,
      authorizedSnapshotReadyCount: 0,
      decisionReadyCount: 0,
      factPromotionCount: 0,
    },
    nextAction: 'Complete the private Amazon mapping and readiness drafts, then run mapping coverage, readiness, private audit, and independent release review.',
  };
  writeFileSync(join(resolvedOutput, 'manifest.json'), serializeJson(manifest));
  writeFileSync(join(resolvedOutput, 'index.md'), buildIndex(spec, manifest));

  return {
    decision: 'generated-intake-template-only',
    outputPath: resolvedOutput,
    manifest,
  };
}

function runCli() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const spec = JSON.parse(readFileSync(resolve(options.spec), 'utf8'));
    const result = buildDq020AmazonOwnerIntakeBundle(spec, {
      outputPath: resolve(options.output),
      generatedAt: options.generatedAt,
    });
    const payload = {
      decision: result.decision,
      outputPath: result.outputPath,
      overallGateDecision: result.manifest.overallGateDecision,
      summary: result.manifest.summary,
    };
    process.stdout.write(options.json
      ? serializeJson(payload)
      : `DQ-020 Amazon owner intake bundle generated: ${result.outputPath}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) runCli();
