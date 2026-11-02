#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAmazonCommerceDryRun } from './connectors/amazon-commerce-dry-run.mjs';
import { extractSourceRegistry } from './lib/project-analysis.mjs';

const EXPECTED_SOURCE_IDS = ['ds-007', 'ds-009', 'ds-010', 'ds-019', 'ds-037', 'ds-038', 'ds-039'];
const EXPECTED_MINIMUMS = {
  'ds-007': 15,
  'ds-009': 25,
  'ds-010': 1,
  'ds-019': 8,
  'ds-037': 5,
  'ds-038': 8,
  'ds-039': 5,
};
const FALSE_BOUNDARIES = [
  'providerCalls',
  'restrictedConnectorAccess',
  'connectorCalls',
  'databaseWrites',
  'productionWrites',
  'deployment',
  'liveCollection',
  'externalSend',
  'realAsinSkuIncluded',
  'credentialValuesIncluded',
  'ownerIdentityIncluded',
  'factPromotion',
  'decisionReady',
];
const FORBIDDEN_KEYS = /^(ownerId|ownerName|reviewerId|reviewerName|signature|email|phone|apiKey|accessToken|refreshToken|token|secret|password|asin|sku)$/i;
const SHA256_RE = /^[a-f0-9]{64}$/;
const PACKET_PATH_PREFIX = '../docs/reviews/mkt53-data-completeness-mece-20260729/evidence/dq-020-amazon-owner-intake-20260730/packets/';

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseArgs(argv) {
  const options = {
    spec: undefined,
    bundle: undefined,
    write: undefined,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--spec') {
      options.spec = argv[index += 1];
    } else if (arg === '--bundle') {
      options.bundle = argv[index += 1];
    } else if (arg === '--write') {
      options.write = argv[index += 1];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!options.spec) throw new Error('--spec is required');
  if (!options.bundle) throw new Error('--bundle is required');
  return options;
}

function readJson(path, blockers, code) {
  if (!existsSync(path)) {
    blockers.push(`${code}-missing`);
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    blockers.push(`${code}-invalid-json`);
    return undefined;
  }
}

function findForbiddenKeys(value, path = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenKeys(item, `${path}[${index}]`, findings));
    return findings;
  }
  if (!isRecord(value)) return findings;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_KEYS.test(key)) findings.push(childPath);
    findForbiddenKeys(child, childPath, findings);
  }
  return findings;
}

function exactJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateSpec(spec, appRoot, blockers) {
  if (!isRecord(spec)) {
    blockers.push('spec-invalid');
    return;
  }
  if (spec.gate !== 'DQ-020') blockers.push('spec-gate-must-be-DQ-020');
  if (spec.connectorId !== 'amazon-commerce') blockers.push('spec-connector-id-invalid');
  if (spec.maximumPacketEvidenceGrade !== 'L2-fixture-or-dry-run') {
    blockers.push('spec-maximum-packet-evidence-grade-invalid');
  }
  if (spec.hashAlgorithm !== 'sha256') blockers.push('spec-hash-algorithm-invalid');
  if (!exactJson(spec.exactSourceIds, EXPECTED_SOURCE_IDS)) blockers.push('spec-exact-source-ids-mismatch');
  if (!Array.isArray(spec.packets) || spec.packets.length !== EXPECTED_SOURCE_IDS.length) {
    blockers.push('spec-must-define-exactly-seven-packets');
    return;
  }
  if (!exactJson(spec.packets.map((packet) => packet?.sourceId), EXPECTED_SOURCE_IDS)) {
    blockers.push('spec-packet-source-id-order-mismatch');
  }
  for (const boundary of FALSE_BOUNDARIES) {
    if (spec.boundaries?.[boundary] !== false) blockers.push(`spec-boundary-${boundary}-must-be-false`);
  }
  if (!Array.isArray(spec.commonMappingFields) || spec.commonMappingFields.length < 11) {
    blockers.push('spec-common-mapping-fields-incomplete');
  }
  if (!Array.isArray(spec.commonRequiredEvidenceSlots) || spec.commonRequiredEvidenceSlots.length < 17) {
    blockers.push('spec-common-required-evidence-slots-incomplete');
  }

  const mappingTemplatePath = resolve(appRoot, spec.templateRefs?.mapping ?? '');
  const readinessTemplatePath = resolve(appRoot, spec.templateRefs?.readiness ?? '');
  const mappingTemplate = readJson(mappingTemplatePath, blockers, 'mapping-template');
  const readinessTemplate = readJson(readinessTemplatePath, blockers, 'readiness-template');
  if (isRecord(mappingTemplate)) {
    if (mappingTemplate.privateData !== true || mappingTemplate.publicBundleAllowed !== false || mappingTemplate.gitAllowed !== false) {
      blockers.push('mapping-template-private-boundary-invalid');
    }
    if (!exactJson(mappingTemplate.requiredFields, spec.commonMappingFields)) {
      blockers.push('spec-mapping-fields-drift-from-template');
    }
    const templateMinimums = Object.fromEntries(
      (mappingTemplate.mappings ?? []).map((mapping) => [mapping.sourceId, mapping.minimumMappedItems]),
    );
    if (!exactJson(Object.keys(templateMinimums), EXPECTED_SOURCE_IDS)) {
      blockers.push('mapping-template-source-id-order-mismatch');
    }
    if (!exactJson(templateMinimums, EXPECTED_MINIMUMS)) {
      blockers.push('mapping-template-minimums-mismatch');
    }
  }
  if (isRecord(readinessTemplate)) {
    const snapshotTypes = Object.keys(spec.snapshotFieldContracts ?? {});
    if (!exactJson(readinessTemplate.expectedSnapshotTypes, snapshotTypes)) {
      blockers.push('readiness-template-snapshot-types-drift');
    }
    if (readinessTemplate.privateData !== true || readinessTemplate.publicBundleAllowed !== false || readinessTemplate.gitAllowed !== false) {
      blockers.push('readiness-template-private-boundary-invalid');
    }
  }

  for (const packet of spec.packets) {
    const sourceId = packet?.sourceId ?? 'unknown-source';
    if (!packet?.packetId) blockers.push(`${sourceId}:spec-packet-id-missing`);
    if (!packet?.page || !packet?.scope) blockers.push(`${sourceId}:spec-page-or-scope-missing`);
    if (packet?.minimumMappedItems !== EXPECTED_MINIMUMS[sourceId]) {
      blockers.push(`${sourceId}:spec-minimum-mapped-items-mismatch`);
    }
    if (packet?.sourceEvidenceGrade !== 'L0-unverified') {
      blockers.push(`${sourceId}:spec-source-evidence-grade-must-remain-L0`);
    }
    if (!packet?.ownerRole) blockers.push(`${sourceId}:spec-owner-role-missing`);
    if (!Array.isArray(packet?.reviewerRoles) || packet.reviewerRoles.length < 3) {
      blockers.push(`${sourceId}:spec-reviewer-roles-incomplete`);
    }
    if (!Array.isArray(packet?.requiredSnapshotTypes) || packet.requiredSnapshotTypes.length === 0) {
      blockers.push(`${sourceId}:spec-required-snapshot-types-missing`);
    } else {
      for (const snapshotType of packet.requiredSnapshotTypes) {
        if (!Array.isArray(spec.snapshotFieldContracts?.[snapshotType])) {
          blockers.push(`${sourceId}:spec-snapshot-contract-missing:${snapshotType}`);
        }
      }
    }
    if (!Array.isArray(packet?.sourceSpecificEvidenceSlots) || packet.sourceSpecificEvidenceSlots.length < 2) {
      blockers.push(`${sourceId}:spec-source-specific-slots-incomplete`);
    }
    const slots = [...(spec.commonRequiredEvidenceSlots ?? []), ...(packet.sourceSpecificEvidenceSlots ?? [])];
    const slotIds = slots.map((slot) => slot?.id);
    if (new Set(slotIds).size !== slotIds.length) blockers.push(`${sourceId}:spec-slot-ids-must-be-unique`);
    for (const slot of slots) {
      if (slot?.required !== true) blockers.push(`${sourceId}:spec-slot-must-be-required:${slot?.id ?? 'unknown'}`);
    }
  }

  const dryRun = buildAmazonCommerceDryRun(
    {
      appRoot,
      site: 'amazon.com',
      marketplaceId: 'ATVPDKIKX0DER',
      windowStart: '2026-07-16',
      windowEnd: '2026-07-31',
    },
    {},
  );
  if (!exactJson(dryRun.sourceIds, EXPECTED_SOURCE_IDS)) blockers.push('dry-run-source-ids-mismatch');
  if (dryRun.sourceCount !== 7) blockers.push('dry-run-source-count-mismatch');
  if (dryRun.safety.networkCalls !== 0 || dryRun.safety.businessDataWrites !== 0 || dryRun.safety.dryRunOnly !== true) {
    blockers.push('dry-run-safety-boundary-violated');
  }
  if (
    dryRun.mappingCoverage.totalRequiredItems !== 67
    || dryRun.mappingCoverage.totalMappedItems !== 0
    || dryRun.mappingCoverage.readySourceCount !== 0
    || dryRun.mappingCoverage.missingSourceCount !== 7
  ) {
    blockers.push('dry-run-empty-mapping-baseline-mismatch');
  }
  const dryRunSnapshotFields = Object.fromEntries(
    dryRun.snapshotContracts.map((contract) => [contract.snapshotType, contract.requiredFields]),
  );
  if (!exactJson(dryRunSnapshotFields, spec.snapshotFieldContracts)) {
    blockers.push('spec-snapshot-fields-drift-from-dry-run');
  }

  const sourceById = new Map(extractSourceRegistry(appRoot).map((source) => [source.id, source]));
  for (const packet of spec.packets) {
    const source = sourceById.get(packet.sourceId);
    if (!source) {
      blockers.push(`${packet.sourceId}:registry-source-missing`);
      continue;
    }
    if (source.page !== packet.page) blockers.push(`${packet.sourceId}:registry-page-mismatch`);
    if (source.collectionMethod !== 'connector-required') blockers.push(`${packet.sourceId}:registry-collection-method-mismatch`);
    if (source.evidenceGrade !== 'L0-unverified') blockers.push(`${packet.sourceId}:registry-evidence-grade-must-remain-L0`);
    if (source.verificationStatus !== 'needs-review') blockers.push(`${packet.sourceId}:registry-status-must-remain-needs-review`);
    if (source.canDisplayAsFact !== false) blockers.push(`${packet.sourceId}:registry-display-must-remain-false`);
    if (source.blockingReason !== 'authorized-connector-or-private-snapshot-required') {
      blockers.push(`${packet.sourceId}:registry-blocking-reason-mismatch`);
    }
    const expectedArtifactPath = `${PACKET_PATH_PREFIX}${packet.packetId}.json`;
    if (source.evidenceArtifactPath !== expectedArtifactPath) {
      blockers.push(`${packet.sourceId}:registry-packet-binding-mismatch`);
    }
  }
}

function validatePacket(packet, packetSpec, spec, manifestRecord, serialized, blockers) {
  const sourceId = packetSpec.sourceId;
  if (!isRecord(packet)) {
    blockers.push(`${sourceId}:packet-invalid`);
    return;
  }
  const exactFields = {
    schemaVersion: 1,
    contractVersion: spec.contractVersion,
    gate: 'DQ-020',
    connectorId: 'amazon-commerce',
    packetId: packetSpec.packetId,
    sourceId,
    page: packetSpec.page,
    scope: packetSpec.scope,
    status: 'awaiting-private-owner-input',
    packetEvidenceGrade: 'L2-fixture-or-dry-run',
    sourceEvidenceGrade: 'L0-unverified',
    ownerRole: packetSpec.ownerRole,
    claimBoundary: packetSpec.claimBoundary,
  };
  for (const [field, expected] of Object.entries(exactFields)) {
    if (packet[field] !== expected) blockers.push(`${sourceId}:packet-${field}-mismatch`);
  }
  if (!exactJson(packet.reviewerRoles, packetSpec.reviewerRoles)) blockers.push(`${sourceId}:reviewer-roles-mismatch`);
  if (packet.mappingContract?.minimumMappedItems !== packetSpec.minimumMappedItems) {
    blockers.push(`${sourceId}:mapping-minimum-mismatch`);
  }
  if (!exactJson(packet.mappingContract?.requiredFields, spec.commonMappingFields)) {
    blockers.push(`${sourceId}:mapping-fields-mismatch`);
  }
  if (!exactJson(packet.snapshotContract?.requiredSnapshotTypes, packetSpec.requiredSnapshotTypes)) {
    blockers.push(`${sourceId}:snapshot-types-mismatch`);
  }
  const expectedFieldsByType = Object.fromEntries(
    packetSpec.requiredSnapshotTypes.map((snapshotType) => [snapshotType, spec.snapshotFieldContracts[snapshotType]]),
  );
  if (!exactJson(packet.snapshotContract?.requiredFieldsBySnapshotType, expectedFieldsByType)) {
    blockers.push(`${sourceId}:snapshot-fields-mismatch`);
  }

  const expectedSlots = [...spec.commonRequiredEvidenceSlots, ...packetSpec.sourceSpecificEvidenceSlots];
  const slots = Array.isArray(packet.requiredEvidenceSlots) ? packet.requiredEvidenceSlots : [];
  if (slots.length !== expectedSlots.length) blockers.push(`${sourceId}:required-slot-count-mismatch`);
  expectedSlots.forEach((slotSpec, index) => {
    const slot = slots[index];
    if (!isRecord(slot) || slot.id !== slotSpec.id) {
      blockers.push(`${sourceId}:required-slot-mismatch:${slotSpec.id}`);
      return;
    }
    if (
      slot.required !== true
      || slot.status !== 'missing'
      || slot.value !== null
      || slot.evidenceHash !== null
      || slot.receivedAt !== null
    ) {
      blockers.push(`${sourceId}:required-slot-must-remain-missing:${slotSpec.id}`);
    }
    if (slot.label !== slotSpec.label || slot.classification !== slotSpec.classification) {
      blockers.push(`${sourceId}:required-slot-contract-mismatch:${slotSpec.id}`);
    }
  });

  const falseReadinessFields = [
    'siteMarketplaceReady',
    'collectionWindowReady',
    'fieldDictionaryReady',
    'snapshotManifestReady',
    'snapshotHashReady',
    'ownerApproved',
    'complianceApproved',
    'releaseReviewApproved',
  ];
  if (packet.readiness?.mappedItemCount !== 0) blockers.push(`${sourceId}:mapped-item-count-must-be-zero`);
  for (const field of falseReadinessFields) {
    if (packet.readiness?.[field] !== false) blockers.push(`${sourceId}:readiness-${field}-must-be-false`);
  }
  if (packet.decision?.acceptanceStatus !== 'blocked-owner-evidence-required') {
    blockers.push(`${sourceId}:acceptance-status-must-remain-blocked`);
  }
  for (const field of ['readyForPrivateValidation', 'readyForAuthorizedConnector', 'factPromotionAllowed', 'decisionReady']) {
    if (packet.decision?.[field] !== false) blockers.push(`${sourceId}:decision-${field}-must-be-false`);
  }
  for (const boundary of FALSE_BOUNDARIES) {
    if (packet.boundaries?.[boundary] !== false) blockers.push(`${sourceId}:boundary-${boundary}-must-be-false`);
  }
  if (!Array.isArray(packet.forbiddenClaims) || packet.forbiddenClaims.length < 3) {
    blockers.push(`${sourceId}:forbidden-claims-incomplete`);
  }
  for (const forbiddenPath of findForbiddenKeys(packet)) {
    blockers.push(`${sourceId}:identity-secret-or-private-value-field-forbidden:${forbiddenPath}`);
  }
  if (!SHA256_RE.test(manifestRecord?.sha256 ?? '')) {
    blockers.push(`${sourceId}:manifest-packet-hash-invalid`);
  } else if (sha256(serialized) !== manifestRecord.sha256) {
    blockers.push(`manifest-packet-hash-mismatch:${sourceId}`);
  }
  const manifestFalseFields = [
    'siteMarketplaceReady',
    'collectionWindowReady',
    'fieldDictionaryReady',
    'snapshotHashReady',
    'ownerApproved',
    'authorizedSnapshotReady',
    'decisionReady',
    'factPromotion',
  ];
  if (manifestRecord?.mappedItemCount !== 0) blockers.push(`${sourceId}:manifest-mapped-item-count-must-be-zero`);
  for (const field of manifestFalseFields) {
    if (manifestRecord?.[field] !== false) blockers.push(`${sourceId}:manifest-${field}-must-be-false`);
  }
}

export function validateDq020AmazonOwnerIntakeBundle(spec, bundlePath, appRoot = process.cwd()) {
  const blockers = [];
  validateSpec(spec, appRoot, blockers);
  const resolvedBundle = resolve(bundlePath);
  const manifestPath = join(resolvedBundle, 'manifest.json');
  const manifest = readJson(manifestPath, blockers, 'manifest');
  const packets = [];

  if (isRecord(manifest)) {
    if (manifest.gate !== 'DQ-020') blockers.push('manifest-gate-must-be-DQ-020');
    if (manifest.connectorId !== 'amazon-commerce') blockers.push('manifest-connector-id-invalid');
    if (manifest.contractVersion !== spec?.contractVersion) blockers.push('manifest-contract-version-mismatch');
    if (manifest.maximumPacketEvidenceGrade !== 'L2-fixture-or-dry-run') {
      blockers.push('manifest-maximum-packet-evidence-grade-invalid');
    }
    if (manifest.status !== 'intake-template-ready') blockers.push('manifest-status-invalid');
    if (manifest.overallGateDecision !== 'blocked-owner-evidence-required') {
      blockers.push('manifest-overall-gate-must-remain-blocked');
    }
    for (const boundary of FALSE_BOUNDARIES) {
      if (manifest.boundaries?.[boundary] !== false) blockers.push(`manifest-boundary-${boundary}-must-be-false`);
    }

    const manifestRecords = Array.isArray(manifest.packets) ? manifest.packets : [];
    if (manifestRecords.length !== EXPECTED_SOURCE_IDS.length) blockers.push('manifest-packet-count-mismatch');
    if (!exactJson(manifestRecords.map((record) => record?.sourceId), EXPECTED_SOURCE_IDS)) {
      blockers.push('manifest-source-id-order-mismatch');
    }
    spec.packets.forEach((packetSpec) => {
      const manifestRecord = manifestRecords.find((record) => record?.sourceId === packetSpec.sourceId);
      const expectedPath = `packets/${packetSpec.packetId}.json`;
      if (manifestRecord?.path !== expectedPath) {
        blockers.push(`${packetSpec.sourceId}:manifest-packet-path-mismatch`);
        return;
      }
      const packetPath = resolve(resolvedBundle, manifestRecord.path);
      if (!packetPath.startsWith(`${resolvedBundle}${sep}`)) {
        blockers.push(`${packetSpec.sourceId}:packet-path-escapes-bundle`);
        return;
      }
      if (!existsSync(packetPath)) {
        blockers.push(`${packetSpec.sourceId}:packet-file-missing`);
        return;
      }
      const serialized = readFileSync(packetPath, 'utf8');
      let packet;
      try {
        packet = JSON.parse(serialized);
      } catch {
        blockers.push(`${packetSpec.sourceId}:packet-invalid-json`);
        return;
      }
      validatePacket(packet, packetSpec, spec, manifestRecord, serialized, blockers);
      packets.push(packet);
    });
  }

  const summary = {
    packetCount: packets.length,
    totalMinimumMappedItems: packets.reduce((sum, packet) => sum + packet.mappingContract.minimumMappedItems, 0),
    missingRequiredSlotCount: packets.reduce((sum, packet) => (
      sum + packet.requiredEvidenceSlots.filter((slot) => slot.status === 'missing').length
    ), 0),
    mappedItemCount: packets.reduce((sum, packet) => sum + packet.readiness.mappedItemCount, 0),
    siteMarketplaceReadyCount: packets.filter((packet) => packet.readiness.siteMarketplaceReady).length,
    collectionWindowReadyCount: packets.filter((packet) => packet.readiness.collectionWindowReady).length,
    fieldDictionaryReadyCount: packets.filter((packet) => packet.readiness.fieldDictionaryReady).length,
    snapshotHashReadyCount: packets.filter((packet) => packet.readiness.snapshotHashReady).length,
    ownerApprovedCount: packets.filter((packet) => packet.readiness.ownerApproved).length,
    authorizedSnapshotReadyCount: packets.filter((packet) => packet.decision.readyForAuthorizedConnector).length,
    decisionReadyCount: packets.filter((packet) => packet.decision.decisionReady).length,
    factPromotionCount: packets.filter((packet) => packet.decision.factPromotionAllowed).length,
    validationPassed: false,
  };
  if (isRecord(manifest?.summary)) {
    for (const [field, value] of Object.entries(summary)) {
      if (field === 'validationPassed') continue;
      if (manifest.summary[field] !== value) blockers.push(`manifest-summary-mismatch:${field}`);
    }
  }
  summary.validationPassed = blockers.length === 0;

  return {
    schemaVersion: 1,
    gate: 'DQ-020',
    localContractDecision: blockers.length === 0 ? 'allowed-intake-template-only' : 'blocked-local-contract',
    overallGateDecision: 'blocked-owner-evidence-required',
    bundlePath: relative(appRoot, resolvedBundle) || '.',
    blockers,
    summary,
    boundaries: Object.fromEntries(FALSE_BOUNDARIES.map((boundary) => [boundary, false])),
    nextPrivateSteps: [
      'Generate private mapping and readiness drafts; do not fill the committed packet bundle.',
      'Owner supplies authorized scope, ASIN/SKU mapping, site/marketplace, collection window, field dictionary, immutable snapshot, row counts, and SHA-256 references in approved private paths.',
      'Run mapping coverage, Amazon readiness, private input audit, and an independent release review.',
      'Keep DQ-020 open and all seven source facts blocked until those reviews pass.',
    ],
    disclosures: [
      'Validation success proves only the deterministic local intake-template contract.',
      'It does not prove an owner, authorization, private mapping, platform collection, snapshot, hash, reviewer approval, source upgrade, fact promotion, decision readiness, or production activation.',
    ],
  };
}

function runCli() {
  let payload;
  try {
    const options = parseArgs(process.argv.slice(2));
    const specPath = isAbsolute(options.spec) ? options.spec : resolve(options.spec);
    const bundlePath = isAbsolute(options.bundle) ? options.bundle : resolve(options.bundle);
    const blockers = [];
    const spec = readJson(specPath, blockers, 'spec');
    payload = spec
      ? validateDq020AmazonOwnerIntakeBundle(spec, bundlePath)
      : {
          schemaVersion: 1,
          gate: 'DQ-020',
          localContractDecision: 'blocked-local-contract',
          overallGateDecision: 'blocked-owner-evidence-required',
          blockers,
          summary: { validationPassed: false },
        };
    if (options.write) {
      const writePath = isAbsolute(options.write) ? options.write : resolve(options.write);
      mkdirSync(dirname(writePath), { recursive: true });
      writeFileSync(writePath, serializeJson(payload));
    }
    process.stdout.write(options.json
      ? serializeJson(payload)
      : `DQ-020 Amazon intake validation: ${payload.localContractDecision}; overall=${payload.overallGateDecision}\n`);
    if (payload.localContractDecision === 'blocked-local-contract') process.exitCode = 1;
  } catch (error) {
    payload = {
      schemaVersion: 1,
      gate: 'DQ-020',
      localContractDecision: 'blocked-local-contract',
      overallGateDecision: 'blocked-owner-evidence-required',
      blockers: [error instanceof Error ? error.message : String(error)],
      summary: { validationPassed: false },
    };
    process.stdout.write(serializeJson(payload));
    process.exitCode = 1;
  }
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) runCli();
