import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FALSE_BOUNDARIES = [
  'providerCalls',
  'restrictedConnectorAccess',
  'connectorCalls',
  'databaseWrites',
  'productionWrites',
  'deployment',
  'liveCollection',
  'externalSend',
  'realUserDataIncluded',
  'realSkuEvaluation',
  'legalAdviceGenerated',
  'factPromotion',
  'decisionReady',
];
const FORBIDDEN_KEYS = /^(ownerId|ownerName|reviewerId|reviewerName|signature|email|phone|apiKey|accessToken|refreshToken|token|secret|password)$/i;
const SHA256_RE = /^[a-f0-9]{64}$/;

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

function validateSpec(spec, blockers) {
  if (!isRecord(spec)) {
    blockers.push('spec-invalid');
    return [];
  }
  if (spec.gate !== 'DQ-015') blockers.push('spec-gate-must-be-DQ-015');
  if (spec.maximumPacketEvidenceGrade !== 'L2-fixture-or-dry-run') {
    blockers.push('spec-maximum-packet-evidence-grade-invalid');
  }
  if (!Array.isArray(spec.packets) || spec.packets.length !== 5) {
    blockers.push('spec-must-define-exactly-five-packets');
    return [];
  }
  const sourceIds = spec.packets.map((packet) => packet?.sourceId);
  if (new Set(sourceIds).size !== sourceIds.length) blockers.push('spec-source-ids-must-be-unique');
  for (const boundary of FALSE_BOUNDARIES) {
    if (spec.boundaries?.[boundary] !== false) {
      blockers.push(`spec-boundary-${boundary}-must-be-false`);
    }
  }
  for (const packet of spec.packets) {
    const sourceId = packet?.sourceId ?? 'unknown-source';
    if (!packet?.packetId) blockers.push(`${sourceId}:spec-packet-id-missing`);
    if (!['interview', 'aesthetics', 'regulation'].includes(packet?.domain)) {
      blockers.push(`${sourceId}:spec-domain-invalid`);
    }
    if (!packet?.sourceEvidenceGrade) blockers.push(`${sourceId}:spec-source-evidence-grade-missing`);
    if (!packet?.ownerRole) blockers.push(`${sourceId}:spec-owner-role-missing`);
    if (!Array.isArray(packet?.reviewerRoles) || packet.reviewerRoles.length === 0) {
      blockers.push(`${sourceId}:spec-reviewer-roles-missing`);
    }
    if (!Array.isArray(packet?.requiredEvidenceSlots) || packet.requiredEvidenceSlots.length < 10) {
      blockers.push(`${sourceId}:spec-required-evidence-slots-insufficient`);
    } else {
      const slotIds = packet.requiredEvidenceSlots.map((slot) => slot?.id);
      if (new Set(slotIds).size !== slotIds.length) blockers.push(`${sourceId}:spec-slot-ids-must-be-unique`);
      for (const slot of packet.requiredEvidenceSlots) {
        if (slot?.required !== true) blockers.push(`${sourceId}:spec-slot-must-be-required:${slot?.id ?? 'unknown'}`);
      }
    }
  }
  return sourceIds;
}

function validatePacket(packet, packetSpec, manifestRecord, serialized, blockers) {
  const sourceId = packetSpec.sourceId;
  if (!isRecord(packet)) {
    blockers.push(`${sourceId}:packet-invalid`);
    return;
  }
  const exactFields = {
    schemaVersion: 1,
    contractVersion: packetSpec.contractVersion,
    gate: 'DQ-015',
    packetId: packetSpec.packetId,
    sourceId,
    domain: packetSpec.domain,
    page: packetSpec.page,
    status: 'awaiting-owner-input',
    packetEvidenceGrade: 'L2-fixture-or-dry-run',
    sourceEvidenceGrade: packetSpec.sourceEvidenceGrade,
    ownerRole: packetSpec.ownerRole,
    claimBoundary: packetSpec.claimBoundary,
    templateRef: packetSpec.templateRef,
  };
  for (const [field, expected] of Object.entries(exactFields)) {
    if (packet[field] !== expected) blockers.push(`${sourceId}:packet-${field}-mismatch`);
  }
  if (JSON.stringify(packet.reviewerRoles) !== JSON.stringify(packetSpec.reviewerRoles)) {
    blockers.push(`${sourceId}:reviewer-roles-mismatch`);
  }
  if (!Array.isArray(packet.forbiddenClaims) || packet.forbiddenClaims.length === 0) {
    blockers.push(`${sourceId}:forbidden-claims-missing`);
  }
  if (packet.decision?.ownerApproved !== false) blockers.push(`${sourceId}:owner-approved-must-be-false`);
  if (packet.decision?.reviewerApproved !== false) blockers.push(`${sourceId}:reviewer-approved-must-be-false`);
  if (packet.decision?.acceptanceStatus !== 'blocked-required-input') {
    blockers.push(`${sourceId}:acceptance-status-must-remain-blocked`);
  }
  if (packet.decision?.factPromotionAllowed !== false) blockers.push(`${sourceId}:fact-promotion-must-be-false`);
  if (packet.decision?.decisionReady !== false) blockers.push(`${sourceId}:decision-ready-must-be-false`);
  for (const boundary of FALSE_BOUNDARIES) {
    if (packet.boundaries?.[boundary] !== false) {
      blockers.push(`${sourceId}:boundary-${boundary}-must-be-false`);
    }
  }

  const slots = Array.isArray(packet.requiredEvidenceSlots) ? packet.requiredEvidenceSlots : [];
  if (slots.length !== packetSpec.requiredEvidenceSlots.length) {
    blockers.push(`${sourceId}:required-slot-count-mismatch`);
  }
  packetSpec.requiredEvidenceSlots.forEach((slotSpec, index) => {
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
  for (const forbiddenPath of findForbiddenKeys(packet)) {
    blockers.push(`${sourceId}:identity-or-secret-field-forbidden:${forbiddenPath}`);
  }
  if (!SHA256_RE.test(manifestRecord?.sha256 ?? '')) {
    blockers.push(`${sourceId}:manifest-packet-hash-invalid`);
  } else if (sha256(serialized) !== manifestRecord.sha256) {
    blockers.push(`manifest-packet-hash-mismatch:${sourceId}`);
  }
  if (manifestRecord?.ownerApproved !== false) blockers.push(`${sourceId}:manifest-owner-approved-must-be-false`);
  if (manifestRecord?.reviewerApproved !== false) blockers.push(`${sourceId}:manifest-reviewer-approved-must-be-false`);
  if (manifestRecord?.decisionReady !== false) blockers.push(`${sourceId}:manifest-decision-ready-must-be-false`);
  if (manifestRecord?.factPromotion !== false) blockers.push(`${sourceId}:manifest-fact-promotion-must-be-false`);
}

export function validateDq015OwnerPacketBundle(spec, bundlePath) {
  const blockers = [];
  const sourceIds = validateSpec(spec, blockers);
  const resolvedBundle = resolve(bundlePath);
  const manifestPath = join(resolvedBundle, 'manifest.json');
  const manifest = readJson(manifestPath, blockers, 'manifest');
  const packets = [];

  if (isRecord(manifest)) {
    if (manifest.gate !== 'DQ-015') blockers.push('manifest-gate-must-be-DQ-015');
    if (manifest.contractVersion !== spec?.contractVersion) blockers.push('manifest-contract-version-mismatch');
    if (manifest.maximumPacketEvidenceGrade !== 'L2-fixture-or-dry-run') {
      blockers.push('manifest-maximum-packet-evidence-grade-invalid');
    }
    if (manifest.status !== 'readiness-packet-only') blockers.push('manifest-status-invalid');
    for (const boundary of FALSE_BOUNDARIES) {
      if (manifest.boundaries?.[boundary] !== false) {
        blockers.push(`manifest-boundary-${boundary}-must-be-false`);
      }
    }
    const manifestRecords = Array.isArray(manifest.packets) ? manifest.packets : [];
    if (manifestRecords.length !== sourceIds.length) blockers.push('manifest-packet-count-mismatch');
    if (JSON.stringify(manifestRecords.map((record) => record?.sourceId)) !== JSON.stringify(sourceIds)) {
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
      validatePacket(
        packet,
        { ...packetSpec, contractVersion: spec.contractVersion },
        manifestRecord,
        serialized,
        blockers,
      );
      packets.push(packet);
    });
  }

  const countDomain = (domain) => packets.filter((packet) => packet.domain === domain).length;
  const summary = {
    packetCount: packets.length,
    interviewPacketCount: countDomain('interview'),
    aestheticsPacketCount: countDomain('aesthetics'),
    regulationPacketCount: countDomain('regulation'),
    missingRequiredSlotCount: packets.reduce(
      (sum, packet) => sum + packet.requiredEvidenceSlots.filter((slot) => slot.status === 'missing').length,
      0,
    ),
    ownerApprovedCount: packets.filter((packet) => packet.decision?.ownerApproved === true).length,
    reviewerApprovedCount: packets.filter((packet) => packet.decision?.reviewerApproved === true).length,
    decisionReadyCount: packets.filter((packet) => packet.decision?.decisionReady === true).length,
    factPromotionCount: packets.filter((packet) => packet.decision?.factPromotionAllowed === true).length,
    validationPassed: blockers.length === 0,
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
    gate: 'DQ-015',
    decision: blockers.length === 0 ? 'allowed-readiness-only' : 'blocked',
    bundlePath: relative(process.cwd(), resolvedBundle) || '.',
    blockers,
    summary,
    boundaries: Object.fromEntries(FALSE_BOUNDARIES.map((boundary) => [boundary, false])),
    disclosures: [
      'Validation success means only that empty, source-specific readiness packets are complete.',
      'It does not prove owner identity, reviewer approval, real evidence receipt, legal advice, fact promotion, decision readiness, or production activation.',
    ],
  };
}

function runCli() {
  let options;
  let payload;
  try {
    options = parseArgs(process.argv.slice(2));
    const specPath = isAbsolute(options.spec) ? options.spec : resolve(options.spec);
    const bundlePath = isAbsolute(options.bundle) ? options.bundle : resolve(options.bundle);
    const blockers = [];
    const spec = readJson(specPath, blockers, 'spec');
    payload = spec
      ? validateDq015OwnerPacketBundle(spec, bundlePath)
      : {
          schemaVersion: 1,
          gate: 'DQ-015',
          decision: 'blocked',
          blockers,
          summary: { validationPassed: false },
        };
    if (options.write) {
      const writePath = isAbsolute(options.write) ? options.write : resolve(options.write);
      mkdirSync(dirname(writePath), { recursive: true });
      writeFileSync(writePath, serializeJson(payload));
    }
    if (options.json) {
      process.stdout.write(serializeJson(payload));
    } else {
      process.stdout.write(`DQ-015 owner packet validation: ${payload.decision}\n`);
    }
    if (payload.decision === 'blocked') process.exitCode = 1;
  } catch (error) {
    payload = {
      schemaVersion: 1,
      gate: 'DQ-015',
      decision: 'blocked',
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
