import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_GENERATED_AT = '2026-07-30T08:00:00.000Z';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
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

function buildPacket(spec, packetSpec, generatedAt) {
  return {
    schemaVersion: 1,
    contractVersion: spec.contractVersion,
    gate: spec.gate,
    generatedAt,
    packetId: packetSpec.packetId,
    sourceId: packetSpec.sourceId,
    domain: packetSpec.domain,
    page: packetSpec.page,
    purpose: packetSpec.purpose,
    status: 'awaiting-owner-input',
    packetEvidenceGrade: spec.maximumPacketEvidenceGrade,
    sourceEvidenceGrade: packetSpec.sourceEvidenceGrade,
    ownerRole: packetSpec.ownerRole,
    reviewerRoles: packetSpec.reviewerRoles,
    claimBoundary: packetSpec.claimBoundary,
    templateRef: packetSpec.templateRef,
    requiredEvidenceSlots: packetSpec.requiredEvidenceSlots.map((slot) => ({
      ...slot,
      value: null,
      evidenceHash: null,
      receivedAt: null,
      status: 'missing',
    })),
    decision: {
      ownerApproved: false,
      reviewerApproved: false,
      acceptanceStatus: 'blocked-required-input',
      factPromotionAllowed: false,
      decisionReady: false,
    },
    boundaries: { ...spec.boundaries },
    forbiddenClaims: packetSpec.forbiddenClaims,
    disclosures: [
      'This file is a deterministic readiness template, not an owner submission or approval record.',
      'No live collection, external send, provider call, connector call, database write, production write, or deployment occurred.',
      'The source evidence grade and display scope remain unchanged until independently reviewed evidence is accepted.',
    ],
  };
}

function buildIndex(spec, manifest) {
  const rows = manifest.packets.map((packet) => (
    `| ${packet.sourceId} | ${packet.domain} | ${packet.sourceEvidenceGrade} | ${packet.requiredSlotCount} | 0 | blocked |`
  ));
  return [
    '# DQ-015 owner packet readiness bundle',
    '',
    `Generated at: \`${manifest.generatedAt}\``,
    '',
    'This bundle contains source-specific, empty owner intake templates. It is readiness-only evidence at `L2-fixture-or-dry-run`; it does not identify an owner, collect real data, approve a claim, change source evidence grades, or authorize production activity.',
    '',
    '| Source | Domain | Source evidence grade | Missing required slots | Approved | Decision |',
    '|---|---|---:|---:|---:|---|',
    ...rows,
    '',
    `Summary: ${manifest.summary.packetCount} packets, ${manifest.summary.missingRequiredSlotCount} required slots missing, 0 owner approvals, 0 reviewer approvals, 0 decision-ready records, and 0 fact promotions.`,
    '',
    'Regulation packets reference the existing legal intake template. Public CPSC entrypoints and the EU regulatory timeline keep their current bounded L1 display scope; product/SKU applicability and legal conclusions remain blocked.',
    '',
    `Contract: \`${spec.contractVersion}\``,
    '',
  ].join('\n');
}

export function buildDq015OwnerPacketBundle(spec, { outputPath, generatedAt = DEFAULT_GENERATED_AT }) {
  if (spec?.gate !== 'DQ-015') throw new Error('Spec gate must be DQ-015');
  if (!Array.isArray(spec.packets) || spec.packets.length !== 5) {
    throw new Error('DQ-015 spec must define exactly five packets');
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
      domain: packet.domain,
      path: relativePath,
      sha256: sha256(serialized),
      packetEvidenceGrade: packet.packetEvidenceGrade,
      sourceEvidenceGrade: packet.sourceEvidenceGrade,
      requiredSlotCount: packet.requiredEvidenceSlots.length,
      ownerApproved: false,
      reviewerApproved: false,
      decisionReady: false,
      factPromotion: false,
    };
  });

  const domainCount = (domain) => packetRecords.filter((packet) => packet.domain === domain).length;
  const manifest = {
    schemaVersion: 1,
    contractVersion: spec.contractVersion,
    gate: spec.gate,
    generatedAt,
    maximumPacketEvidenceGrade: spec.maximumPacketEvidenceGrade,
    status: 'readiness-packet-only',
    boundaries: { ...spec.boundaries },
    packets: packetRecords,
    summary: {
      packetCount: packetRecords.length,
      interviewPacketCount: domainCount('interview'),
      aestheticsPacketCount: domainCount('aesthetics'),
      regulationPacketCount: domainCount('regulation'),
      missingRequiredSlotCount: packetRecords.reduce((sum, packet) => sum + packet.requiredSlotCount, 0),
      ownerApprovedCount: 0,
      reviewerApprovedCount: 0,
      decisionReadyCount: 0,
      factPromotionCount: 0,
    },
  };
  writeFileSync(join(resolvedOutput, 'manifest.json'), serializeJson(manifest));
  writeFileSync(join(resolvedOutput, 'index.md'), buildIndex(spec, manifest));

  return {
    decision: 'generated-readiness-only',
    outputPath: resolvedOutput,
    manifest,
  };
}

function runCli() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const specPath = resolve(options.spec);
    const outputPath = resolve(options.output);
    const spec = JSON.parse(readFileSync(specPath, 'utf8'));
    const result = buildDq015OwnerPacketBundle(spec, {
      outputPath,
      generatedAt: options.generatedAt,
    });
    const payload = {
      decision: result.decision,
      outputPath: result.outputPath,
      summary: result.manifest.summary,
    };
    if (options.json) {
      process.stdout.write(serializeJson(payload));
    } else {
      process.stdout.write(`DQ-015 owner packet bundle generated: ${outputPath}\n`);
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectExecution) runCli();
