import { execFileSync } from 'node:child_process';
import { accessSync, chmodSync, constants, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const SCRIPT_INTEGRATION_TIMEOUT_MS = 90_000;
const FORBIDDEN_ERP_SCRIPT_OUTPUT_RE =
  /AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK|password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i;
const LOCAL_ERP_ARTIFACT_MISSING_RE = /Missing (?:ERP export input|ERP Batch3 input|Batch\d+ input|Batch\d+ manifest)/;
const MANUAL_EVIDENCE_EMPTY_FIXTURE_DIR = join(process.cwd(), 'tests/fixtures/manual-evidence-empty-intake');

function runOptionalLocalErpArtifactScript(args: string[]) {
  try {
    return execFileSync('node', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
  } catch (error) {
    const failedRun = error as { stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
    const output = [failedRun.stdout, failedRun.stderr, failedRun.message].map((part) => String(part ?? '')).join('\n');

    if (!LOCAL_ERP_ARTIFACT_MISSING_RE.test(output)) throw error;

    expect(output).toMatch(LOCAL_ERP_ARTIFACT_MISSING_RE);
    expect(output).not.toMatch(FORBIDDEN_ERP_SCRIPT_OUTPUT_RE);
    return null;
  }
}

function copyManualEvidencePackToTemp() {
  const targetDir = mkdtempSync(join(tmpdir(), 'mkt53-manual-evidence-'));

  for (const file of ['manual_evidence_packets.csv', 'manual_evidence_acceptance_gate.csv']) {
    writeFileSync(join(targetDir, file), readFileSync(join(MANUAL_EVIDENCE_EMPTY_FIXTURE_DIR, file), 'utf8'));
  }

  const questionnaire = readFileSync(join(MANUAL_EVIDENCE_EMPTY_FIXTURE_DIR, 'manual_evidence_questionnaire.csv'), 'utf8')
    .trimEnd()
    .split('\n');
  const header = questionnaire[0].split(',');
  const fieldIndex = Object.fromEntries(header.map((field, index) => [field, index]));
  const decisions: Record<string, string> = {
    'ds-002': 'accepted_for_l3_evidence',
    'ds-044': 'needs_replacement_source',
    'ds-045': 'blocked_vendor_access',
  };
  const hash = 'a'.repeat(64);
  const filledRows = questionnaire.slice(1).map((line) => {
    const row = line.split(',');
    const sourceId = row[fieldIndex.source_id];
    const requiredField = row[fieldIndex.required_field];

    row[fieldIndex.answer] = requiredField === 'decision' ? decisions[sourceId] : `${requiredField}_submitted_${sourceId}`;
    row[fieldIndex.reviewer] = 'market-research-owner';
    row[fieldIndex.answered_at] = '2026-07-01';
    row[fieldIndex.evidence_path] = `tmp/manual-evidence/${sourceId}.json`;
    row[fieldIndex.artifact_sha256] = hash;
    row[fieldIndex.validation_status] = 'owner_submitted';

    return row.join(',');
  });

  writeFileSync(join(targetDir, 'manual_evidence_questionnaire.csv'), `${[questionnaire[0], ...filledRows].join('\n')}\n`);
  return targetDir;
}

function buildManualEvidenceValidationToTemp() {
  const tempRoot = mkdtempSync(join(tmpdir(), 'mkt53-manual-release-review-'));
  const intakeDir = copyManualEvidencePackToTemp();
  const validationDir = join(tempRoot, 'validation');

  execFileSync(
    'node',
    ['scripts/data/validate-public-source-manual-evidence.mjs', '--intake', intakeDir, '--out', validationDir],
    { cwd: process.cwd(), encoding: 'utf8' },
  );

  return { tempRoot, intakeDir, validationDir };
}

function buildBlockedManualEvidenceValidationToTemp() {
  const tempRoot = mkdtempSync(join(tmpdir(), 'mkt53-blocked-manual-release-review-'));
  const validationDir = join(tempRoot, 'validation');

  execFileSync(
    'node',
    [
      'scripts/data/validate-public-source-manual-evidence.mjs',
      '--intake',
      MANUAL_EVIDENCE_EMPTY_FIXTURE_DIR,
      '--out',
      validationDir,
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  );

  return { tempRoot, validationDir };
}

describe('production helper scripts', { timeout: SCRIPT_INTEGRATION_TIMEOUT_MS }, () => {
  it('keeps deploy-static executable and guarded by local quality gates', () => {
    const scriptPath = join(process.cwd(), 'scripts/deploy-static.sh');
    const script = readFileSync(scriptPath, 'utf8');

    expect(() => accessSync(scriptPath, constants.X_OK)).not.toThrow();
    expect(script).toContain('npm run test');
    expect(script).toContain('npm run lint');
    expect(script).toContain('npm audit');
    expect(script).toContain('npm run build');
    expect(script).toContain('npm run quality:bundle-budget');
    expect(script).toContain('rsync -az --delete');
  });

  it('uses one explicit SSH key contract for deploy and auth-protected smoke checks', () => {
    const contractPath = join(process.cwd(), 'scripts/lib/ssh-key-contract.sh');
    const contract = readFileSync(contractPath, 'utf8');
    const deployScript = readFileSync(join(process.cwd(), 'scripts/deploy-static.sh'), 'utf8');
    const smokeScript = readFileSync(join(process.cwd(), 'scripts/smoke-prod.sh'), 'utf8');

    expect(contract).toContain('MKT53_SSH_KEY_PATH');
    expect(contract).toContain('${KEY_PATH:-${repo_root}/DDDD.pem}');
    expect(contract).toContain('mkt53_require_ssh_key');
    expect(contract).not.toContain('ai_video.pem');
    expect(deployScript).toContain('source "${APP_DIR}/scripts/lib/ssh-key-contract.sh"');
    expect(deployScript).toContain('mkt53_require_ssh_key "${KEY_PATH}" "production deploy"');
    expect(smokeScript).toContain('source "${APP_DIR}/scripts/lib/ssh-key-contract.sh"');
    expect(smokeScript).toContain('mkt53_require_ssh_key "${KEY_PATH}" "auth-protected production static check"');
  });

  it('keeps bundle and release evidence quality commands discoverable from npm', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { scripts: Record<string, string> };

    expect(packageJson.scripts['quality:bundle-budget']).toContain('scripts/quality/check-bundle-budget.mjs');
    expect(packageJson.scripts['quality:release-evidence']).toContain('scripts/quality/build-release-evidence.mjs');
    expect(packageJson.scripts['quality:release-evidence']).toContain('tmp/release-evidence/latest.json');
  });

  it('keeps verified production deploy chained through smoke and E2E checks', () => {
    const scriptPath = join(process.cwd(), 'scripts/deploy-static-and-verify.sh');
    const script = readFileSync(scriptPath, 'utf8');
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { scripts: Record<string, string> };

    expect(() => accessSync(scriptPath, constants.X_OK)).not.toThrow();
    expect(packageJson.scripts['deploy:prod:verified']).toContain('scripts/deploy-static-and-verify.sh');
    expect(script).toContain('npm run deploy:prod');
    expect(script).toContain('npm run smoke:prod');
    expect(script).toContain('npm run test:e2e:prod');
  });

  it('keeps production smoke checks focused on routing, assets, and known leak markers', () => {
    const scriptPath = join(process.cwd(), 'scripts/smoke-prod.sh');
    const script = readFileSync(scriptPath, 'utf8');
    const routeSmokeScriptPath = join(process.cwd(), 'scripts/smoke-prod-routes.mjs');
    const routeSmokeScript = readFileSync(routeSmokeScriptPath, 'utf8');
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { scripts: Record<string, string> };

    expect(() => accessSync(scriptPath, constants.X_OK)).not.toThrow();
    expect(script).toContain('/market/trend');
    expect(script).toContain('/industry/regulation');
    expect(script).toContain('/ai-assistant/design');
    expect(script).toContain('react-simple-maps');
    expect(script).toContain('2026-08452');
    expect(script).toContain('/images/world-map.jpg');
    expect(packageJson.scripts['smoke:prod:routes']).toContain('scripts/smoke-prod-routes.mjs');
    expect(routeSmokeScript).toContain("channel: 'chrome'");
    expect(routeSmokeScript).toContain("boundary: 'production-read-only'");
    expect(routeSmokeScript).toContain('/#/data-source');
    expect(routeSmokeScript).toContain('full_route_chrome_smoke.json');
  });

  it('keeps restored user insight pages populated with business data and evidence boundaries', () => {
    const userPage = readFileSync(join(process.cwd(), 'src/pages/UsersPage.tsx'), 'utf8');
    const consumerPage = readFileSync(join(process.cwd(), 'src/pages/users/ConsumerInterviews.tsx'), 'utf8');
    const channelPage = readFileSync(join(process.cwd(), 'src/pages/users/ChannelInterviews.tsx'), 'utf8');
    const storePage = readFileSync(join(process.cwd(), 'src/pages/users/StoreInterviews.tsx'), 'utf8');
    const overseasPage = readFileSync(join(process.cwd(), 'src/pages/users/OverseasSentiment.tsx'), 'utf8');
    const aestheticsPage = readFileSync(join(process.cwd(), 'src/pages/users/Aesthetics.tsx'), 'utf8');

    const personaAssets = [
      'public/images/personas/persona-pregnant.jpg',
      'public/images/personas/persona-newmom.jpg',
      'public/images/personas/persona-working.jpg',
      'public/images/personas/persona-secondchild.jpg',
      'public/images/personas/persona-quality.jpg',
      'public/images/personas/persona-tech.jpg',
    ];

    for (const asset of personaAssets) {
      expect(() => accessSync(join(process.cwd(), asset), constants.R_OK)).not.toThrow();
    }

    for (const marker of [
      'const personaTable = [',
      'const detailedPersonas = [',
      '孕期妈妈',
      '新手妈妈',
      '背奶妈妈',
      '二胎妈妈',
      '品质追求者',
      '科技爱好者',
      'Sarah',
      'Rebecca',
      'Michelle',
      'Linda',
      'Victoria',
      'Rachel',
      '/images/personas/persona-pregnant.jpg',
      '/images/personas/persona-newmom.jpg',
      '/images/personas/persona-working.jpg',
      '/images/personas/persona-secondchild.jpg',
      '/images/personas/persona-quality.jpg',
      '/images/personas/persona-tech.jpg',
      '潮流新手妈妈',
      '跨国精英妈妈',
      'RFM用户价值分层模型',
      'audit-source: ds-011 ds-043',
      'audit-source: ds-012; sample-only',
      'audit-source: ds-013; sample-only',
    ]) {
      expect(userPage).toContain(marker);
    }
    expect(userPage).not.toContain('const governanceTasks = [');
    expect(userPage).not.toContain('const blockedDisplays = [');

    for (const marker of ['const interviews = [', 'Emily R.', 'Sophie M.', 'Claudia W.', 'Kano模型', 'PageEvidenceNotice', 'audit-source: ds-014; sample-only']) {
      expect(consumerPage).toContain(marker);
    }

    for (const marker of ['const channelPerformance = [', 'Amazon US', 'TikTok Shop', 'Shopee Southeast Asia', 'PageEvidenceNotice', 'audit-source: ds-041; sample-only']) {
      expect(channelPage).toContain(marker);
    }

    for (const marker of ['const stores = [', 'Momcozy LA Experience Store', 'Momcozy Dubai Mall', 'PageEvidenceNotice', 'audit-source: ds-042; sample-only']) {
      expect(storePage).toContain(marker);
    }

    for (const marker of ['const sentimentTrend = [', 'Reddit', 'TikTok', '海外舆情采集状态', 'PageEvidenceNotice', 'audit-source: ds-013; sample-only']) {
      expect(overseasPage).toContain(marker);
    }

    for (const marker of ['colorPreference', 'styleTrends', 'regionStyle', 'designCases', 'M5 Wearable Pump', 'PageEvidenceNotice', "sourceIds={['ds-040']}"]) {
      expect(aestheticsPage).toContain(marker);
    }
  });

  it('keeps public source manual evidence validation blocked for an empty owner submission', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/data/validate-public-source-manual-evidence.mjs',
        '--intake',
        MANUAL_EVIDENCE_EMPTY_FIXTURE_DIR,
        '--json',
        '--no-write',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    const payload = JSON.parse(output) as {
      summary: {
        targetCount: number;
        readyForManualReleaseReviewCount: number;
        blockedPacketCount: number;
        allowedDecisions: string[];
        boundaries: Record<string, boolean>;
      };
      samplePacketValidation: Array<Record<string, string>>;
    };

    expect(payload.summary.targetCount).toBe(3);
    expect(payload.summary.readyForManualReleaseReviewCount).toBe(0);
    expect(payload.summary.blockedPacketCount).toBe(3);
    expect(payload.summary.allowedDecisions).toEqual(
      expect.arrayContaining([
        'accepted_for_l3_evidence',
        'needs_replacement_source',
        'rejected_scope_mismatch',
        'blocked_vendor_access',
      ]),
    );
    expect(payload.summary.boundaries.factPromotion).toBe(false);
    expect(payload.summary.boundaries.sourceRegistryWrites).toBe(false);
    expect(payload.summary.boundaries.productionWrites).toBe(false);
    expect(payload.samplePacketValidation.every((packet) => packet.packet_validation_status === 'blocked_manual_evidence_incomplete')).toBe(true);
  });

  it('accepts complete public source manual evidence intake only as a manual release review queue', () => {
    const tempDir = copyManualEvidencePackToTemp();

    try {
      const output = execFileSync(
        'node',
        ['scripts/data/validate-public-source-manual-evidence.mjs', '--intake', tempDir, '--json', '--no-write'],
        { cwd: process.cwd(), encoding: 'utf8' },
      );
      const payload = JSON.parse(output) as {
        summary: {
          targetCount: number;
          readyForManualReleaseReviewCount: number;
          blockedPacketCount: number;
          acceptedForL3EvidenceCount: number;
          needsReplacementSourceCount: number;
          blockedVendorAccessCount: number;
          rejectedScopeMismatchCount: number;
          boundaries: Record<string, boolean>;
        };
        samplePacketValidation: Array<Record<string, string>>;
      };

      expect(payload.summary.targetCount).toBe(3);
      expect(payload.summary.readyForManualReleaseReviewCount).toBe(3);
      expect(payload.summary.blockedPacketCount).toBe(0);
      expect(payload.summary.acceptedForL3EvidenceCount).toBe(1);
      expect(payload.summary.needsReplacementSourceCount).toBe(1);
      expect(payload.summary.blockedVendorAccessCount).toBe(1);
      expect(payload.summary.rejectedScopeMismatchCount).toBe(0);
      expect(payload.summary.boundaries.manualReleaseReviewRequired).toBe(true);
      expect(payload.summary.boundaries.factPromotion).toBe(false);
      expect(payload.summary.boundaries.sourceRegistryWrites).toBe(false);
      expect(payload.summary.boundaries.pageWrites).toBe(false);
      expect(payload.samplePacketValidation.every((packet) => packet.packet_validation_status === 'ready_for_manual_release_review')).toBe(
        true,
      );
      expect(payload.samplePacketValidation.every((packet) => packet.can_write_source_registry === 'false')).toBe(true);
      expect(payload.samplePacketValidation.every((packet) => packet.can_update_page_display === 'false')).toBe(true);
      expect(payload.samplePacketValidation.every((packet) => packet.can_export_as_fact_csv === 'false')).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps public source manual release review empty when current intake is blocked', () => {
    const { tempRoot, validationDir } = buildBlockedManualEvidenceValidationToTemp();

    try {
      const output = execFileSync(
        'node',
        ['scripts/data/build-public-source-manual-release-review.mjs', '--validation', validationDir, '--json', '--no-write'],
        { cwd: process.cwd(), encoding: 'utf8' },
      );
      const payload = JSON.parse(output) as {
        summary: {
          packetCount: number;
          readyPacketCount: number;
          queuedForManualReleaseReviewCount: number;
          blockedIntakePacketCount: number;
          approvedPatchCandidateCount: number;
          boundaries: Record<string, boolean>;
        };
        sampleDecisionRows: Array<Record<string, string>>;
      };

      expect(payload.summary.packetCount).toBe(3);
      expect(payload.summary.readyPacketCount).toBe(0);
      expect(payload.summary.queuedForManualReleaseReviewCount).toBe(0);
      expect(payload.summary.blockedIntakePacketCount).toBe(3);
      expect(payload.summary.approvedPatchCandidateCount).toBe(0);
      expect(payload.summary.boundaries.sourceRegistryWrites).toBe(false);
      expect(payload.summary.boundaries.pageWrites).toBe(false);
      expect(payload.summary.boundaries.csvFactExport).toBe(false);
      expect(payload.sampleDecisionRows.every((row) => row.release_review_status === 'blocked_intake_not_ready')).toBe(true);
      expect(payload.sampleDecisionRows.every((row) => row.can_write_source_registry === 'false')).toBe(true);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('keeps completed public source intake queued until a release review record is supplied', () => {
    const { tempRoot, intakeDir, validationDir } = buildManualEvidenceValidationToTemp();

    try {
      const output = execFileSync(
        'node',
        ['scripts/data/build-public-source-manual-release-review.mjs', '--validation', validationDir, '--json', '--no-write'],
        { cwd: process.cwd(), encoding: 'utf8' },
      );
      const payload = JSON.parse(output) as {
        summary: {
          packetCount: number;
          readyPacketCount: number;
          queuedForManualReleaseReviewCount: number;
          blockedIntakePacketCount: number;
          reviewRecordPresent: boolean;
          approvedPatchCandidateCount: number;
          replacementSourceRequiredCount: number;
          vendorAccessBlockedCount: number;
          boundaries: Record<string, boolean>;
        };
        sampleDecisionRows: Array<Record<string, string>>;
      };

      expect(payload.summary.packetCount).toBe(3);
      expect(payload.summary.readyPacketCount).toBe(3);
      expect(payload.summary.queuedForManualReleaseReviewCount).toBe(3);
      expect(payload.summary.blockedIntakePacketCount).toBe(0);
      expect(payload.summary.reviewRecordPresent).toBe(false);
      expect(payload.summary.approvedPatchCandidateCount).toBe(0);
      expect(payload.summary.replacementSourceRequiredCount).toBe(1);
      expect(payload.summary.vendorAccessBlockedCount).toBe(1);
      expect(payload.summary.boundaries.sourceRegistryWrites).toBe(false);
      expect(payload.summary.boundaries.pageWrites).toBe(false);
      expect(payload.summary.boundaries.csvFactExport).toBe(false);
      expect(payload.sampleDecisionRows.some((row) => row.release_review_status === 'blocked_missing_review_record')).toBe(true);
      expect(payload.sampleDecisionRows.every((row) => row.can_update_page_display === 'false')).toBe(true);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
      rmSync(intakeDir, { recursive: true, force: true });
    }
  });

  it('turns reviewed accepted evidence into source registry patch candidates only', () => {
    const { tempRoot, intakeDir, validationDir } = buildManualEvidenceValidationToTemp();
    const reviewRecordPath = join(tempRoot, 'release-review-record.json');

    writeFileSync(
      reviewRecordPath,
      `${JSON.stringify(
        {
          review_record_id: 'loop12-public-source-release-review-001',
          reviewer_alias: 'source-governance-reviewer',
          reviewed_at: '2026-07-02',
          manual_release_review_completed: true,
          approved_task_ids: ['public-source-manual-evidence:ds-002'],
          approved_source_ids: ['ds-002'],
          decision_scope: 'source registry patch planning only',
          source_registry_patch_authorized: true,
          page_display_authorized: false,
          csv_fact_export_authorized: false,
          production_deploy_authorized: false,
          provider_calls_authorized: false,
        },
        null,
        2,
      )}\n`,
    );

    try {
      const output = execFileSync(
        'node',
        [
          'scripts/data/build-public-source-manual-release-review.mjs',
          '--validation',
          validationDir,
          '--review-record',
          reviewRecordPath,
          '--json',
          '--no-write',
        ],
        { cwd: process.cwd(), encoding: 'utf8' },
      );
      const payload = JSON.parse(output) as {
        summary: {
          reviewRecordPresent: boolean;
          reviewRecordCoreReady: boolean;
          approvedPatchCandidateCount: number;
          replacementSourceRequiredCount: number;
          vendorAccessBlockedCount: number;
          blockedBoundaryCount: number;
          validationPassed: boolean;
          boundaries: Record<string, boolean>;
        };
        sampleDecisionRows: Array<Record<string, string>>;
      };

      expect(payload.summary.reviewRecordPresent).toBe(true);
      expect(payload.summary.reviewRecordCoreReady).toBe(true);
      expect(payload.summary.approvedPatchCandidateCount).toBe(1);
      expect(payload.summary.replacementSourceRequiredCount).toBe(1);
      expect(payload.summary.vendorAccessBlockedCount).toBe(1);
      expect(payload.summary.blockedBoundaryCount).toBe(0);
      expect(payload.summary.validationPassed).toBe(true);
      expect(payload.summary.boundaries.sourceRegistryWrites).toBe(false);
      expect(payload.summary.boundaries.pageWrites).toBe(false);
      expect(payload.summary.boundaries.csvFactExport).toBe(false);
      expect(payload.summary.boundaries.sourceRegistryPatchPlanningOnly).toBe(true);
      expect(payload.sampleDecisionRows.find((row) => row.source_id === 'ds-002')).toMatchObject({
        release_review_status: 'approved_for_source_registry_patch_candidate',
        can_prepare_source_registry_patch: 'true',
        can_write_source_registry: 'false',
      });
      expect(payload.sampleDecisionRows.find((row) => row.source_id === 'ds-044')).toMatchObject({
        release_review_status: 'replacement_source_required',
      });
      expect(payload.sampleDecisionRows.find((row) => row.source_id === 'ds-045')).toMatchObject({
        release_review_status: 'blocked_vendor_access',
      });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
      rmSync(intakeDir, { recursive: true, force: true });
    }
  });

  it('keeps periodic data collection scripts discoverable from npm', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { scripts: Record<string, string> };

    expect(packageJson.scripts['data:audit']).toContain('scripts/data/audit-consistency.mjs');
    expect(packageJson.scripts['data:audit:deep']).toContain('scripts/data/audit-deep.mjs');
    expect(packageJson.scripts['data:audit:deep:json']).toContain('--json --no-write');
    expect(packageJson.scripts['data:audit:deep:summary']).toContain('--summary-json --no-write');
    expect(packageJson.scripts['data:source-gaps:prioritize']).toContain('scripts/data/prioritize-source-gaps.mjs');
    expect(packageJson.scripts['data:source-gaps:readiness-packets']).toContain('scripts/data/build-source-gap-readiness-packets.mjs');
    expect(packageJson.scripts['data:source-gaps:readiness-coverage']).toContain('scripts/data/build-source-gap-readiness-coverage.mjs');
    expect(packageJson.scripts['data:source-gaps:owner-intake']).toContain('scripts/data/build-source-gap-owner-intake.mjs');
    expect(packageJson.scripts['data:source-gaps:owner-intake:prefill']).toContain('scripts/data/prefill-source-gap-owner-intake.mjs');
    expect(packageJson.scripts['data:source-gaps:owner-chat-intake-pack']).toContain(
      'scripts/data/build-source-gap-owner-chat-intake-pack.mjs',
    );
    expect(packageJson.scripts['data:source-gaps:owner-chat-merge']).toContain(
      'scripts/data/merge-source-gap-owner-chat-answers.mjs',
    );
    expect(packageJson.scripts['data:source-gaps:owner-intake:validate']).toContain('scripts/data/validate-source-gap-owner-intake.mjs');
    expect(packageJson.scripts['data:collect:weekly']).toContain('scripts/data/collect-weekly-sources.mjs');
    expect(packageJson.scripts['data:public-evidence:dry-run']).toContain('scripts/data/collect-public-evidence.mjs');
    expect(packageJson.scripts['data:public-evidence:dry-run']).toContain('--dry-run');
    expect(packageJson.scripts['data:public-evidence:live']).toContain('scripts/data/collect-public-evidence.mjs');
    expect(packageJson.scripts['data:public-evidence:live']).toContain('--live');
    expect(packageJson.scripts['data:public-evidence:live']).toContain('--write-public');
    expect(packageJson.scripts['data:source-tasks']).toContain('scripts/data/build-source-tasks.mjs');
    expect(packageJson.scripts['data:manual-evidence:validate']).toContain('scripts/data/validate-public-source-manual-evidence.mjs');
    expect(packageJson.scripts['data:manual-evidence:release-review']).toContain('scripts/data/build-public-source-manual-release-review.mjs');
    expect(packageJson.scripts['data:refresh:weekly']).toContain('scripts/data/refresh-weekly-data.mjs');
    expect(packageJson.scripts['data:refresh:semi-monthly']).toContain('scripts/data/refresh-semi-monthly-data.mjs');
    expect(packageJson.scripts['data:refresh:semi-monthly:public-evidence']).toContain('scripts/data/refresh-semi-monthly-data.mjs');
    expect(packageJson.scripts['data:refresh:semi-monthly:public-evidence']).toContain('--public-evidence-live');
    expect(packageJson.scripts['data:recovery:semi-monthly:candidate']).toContain(
      'scripts/data/build-semi-monthly-recovery-candidate.mjs',
    );
    expect(packageJson.scripts['data:connector:amazon:dry-run']).toContain('scripts/data/connectors/amazon-commerce-dry-run.mjs');
    expect(packageJson.scripts['data:connector:amazon:mapping:validate']).toContain('--json --no-write');
    expect(packageJson.scripts['data:connector:amazon:mapping:template']).toContain('--print-mapping-template');
    expect(packageJson.scripts['data:connector:amazon:mapping:coverage']).toContain('--coverage-report');
    expect(packageJson.scripts['data:connector:amazon:mapping:archive']).toContain('--archive-coverage-report');
    expect(packageJson.scripts['data:connector:amazon:mapping:scaffold']).toContain('scaffold-amazon-mapping-fill-draft.mjs');
    expect(packageJson.scripts['data:connector:amazon:mapping:promote']).toContain('promote-amazon-mapping-fill-draft.mjs');
    expect(packageJson.scripts['data:connector:amazon:private:bootstrap']).toContain('bootstrap-amazon-private-inputs.mjs');
    expect(packageJson.scripts['data:connector:amazon:private:audit']).toContain('amazon-commerce-private-input-audit.mjs');
    expect(packageJson.scripts['data:connector:amazon:readiness']).toContain('--readiness-gate');
    expect(packageJson.scripts['data:connector:amazon:readiness:checklist']).toContain('amazon-commerce-readiness-checklist.mjs');
    expect(packageJson.scripts['data:connector:amazon:readiness:template']).toContain('--print-readiness-template');
    expect(packageJson.scripts['data:connector:amazon:readiness:scaffold']).toContain('scaffold-amazon-readiness-fill-draft.mjs');
    expect(packageJson.scripts['data:connector:amazon:readiness:promote']).toContain('promote-amazon-readiness-fill-draft.mjs');
    expect(packageJson.scripts['data:connector:customs:public']).toContain('customs-public-data-adapter.mjs');
    expect(packageJson.scripts['data:connector:voc-nlp:dry-run']).toContain('scripts/data/connectors/voc-nlp-dry-run.mjs');
    expect(packageJson.scripts['data:connector:voc-nlp:readiness']).toContain('--readiness-gate');
    expect(packageJson.scripts['data:connector:voc-nlp:readiness:template']).toContain('--print-readiness-template');
    expect(packageJson.scripts['data:connector:voc-nlp:sample:template']).toContain('--print-sample-manifest-template');
    expect(packageJson.scripts['data:connector:crm:dry-run']).toContain('scripts/data/connectors/internal-crm-dry-run.mjs');
    expect(packageJson.scripts['data:connector:crm:readiness']).toContain('--readiness-gate');
    expect(packageJson.scripts['data:connector:crm:readiness:template']).toContain('--print-readiness-template');
    expect(packageJson.scripts['data:connector:crm:snapshot:template']).toContain('--print-snapshot-manifest-template');
    expect(packageJson.scripts['data:connector:erp:dry-run']).toContain('scripts/data/connectors/internal-erp-dry-run.mjs');
    expect(packageJson.scripts['data:connector:erp:readiness']).toContain('--readiness-gate');
    expect(packageJson.scripts['data:connector:erp:readiness:template']).toContain('--print-readiness-template');
    expect(packageJson.scripts['data:connector:erp:snapshot:template']).toContain('--print-snapshot-manifest-template');
    expect(packageJson.scripts['data:erp:derive-batch2']).toContain('scripts/data/build-erp-derived-batch2.mjs');
    expect(packageJson.scripts['data:erp:derive-batch3']).toContain('scripts/data/build-erp-derived-batch3.mjs');
    expect(packageJson.scripts['data:erp:governance-batch7']).toContain('scripts/data/build-erp-governance-batch7.mjs');
    expect(packageJson.scripts['data:erp:owner-approval-batch8']).toContain('scripts/data/build-erp-owner-approval-batch8.mjs');
    expect(packageJson.scripts['data:erp:owner-approval-intake-batch9']).toContain('scripts/data/build-erp-owner-approval-intake-batch9.mjs');
    expect(packageJson.scripts['data:erp:owner-approval-template-batch10']).toContain('scripts/data/build-erp-owner-approval-record-template-batch10.mjs');
    expect(packageJson.scripts['data:erp:owner-approval-preflight-batch11']).toContain('scripts/data/build-erp-owner-approval-preflight-batch11.mjs');
    expect(packageJson.scripts['data:erp:owner-submission-intake-batch12']).toContain('scripts/data/build-erp-owner-submission-intake-batch12.mjs');
    expect(packageJson.scripts['data:erp:owner-submission-pack-batch13']).toContain('scripts/data/build-erp-owner-submission-pack-batch13.mjs');
    expect(packageJson.scripts['data:erp:owner-submission-dropbox-batch14']).toContain('scripts/data/build-erp-owner-submission-dropbox-watchlist-batch14.mjs');
    expect(packageJson.scripts['data:erp:owner-submission-acceptance-batch15']).toContain('scripts/data/build-erp-owner-submission-acceptance-gate-batch15.mjs');
    expect(packageJson.scripts['data:erp:owner-submission-synthetic-batch16']).toContain('scripts/data/build-erp-owner-submission-synthetic-fixture-batch16.mjs');
    expect(packageJson.scripts['data:erp:owner-submission-synthetic-pipeline-batch17']).toContain('scripts/data/build-erp-owner-submission-synthetic-pipeline-batch17.mjs');
    expect(packageJson.scripts['data:erp:owner-submission-real-owner-checklist-batch18']).toContain('scripts/data/build-erp-owner-submission-real-owner-checklist-batch18.mjs');
    expect(packageJson.scripts['data:ai-report:governance-batch4']).toContain('scripts/data/build-ai-report-governance-batch4.mjs');
    expect(packageJson.scripts['data:ai-review:governance-batch5']).toContain('scripts/data/build-ai-review-governance-batch5.mjs');
    expect(packageJson.scripts['data:ai-design:governance-batch6']).toContain('scripts/data/build-ai-design-governance-batch6.mjs');
    expect(packageJson.scripts['data:deploy:weekly']).toContain('scripts/data/weekly-refresh-and-deploy.sh');
    expect(packageJson.scripts['data:publish:weekly:local']).toContain('scripts/data/weekly-refresh-local-static.sh');
    expect(packageJson.scripts['data:deploy:semi-monthly']).toContain('scripts/data/semi-monthly-refresh-and-deploy.sh');
    expect(packageJson.scripts['data:publish:semi-monthly:local']).toContain('scripts/data/semi-monthly-refresh-local-static.sh');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-weekly-data.mjs'), 'utf8')).toContain('public/weekly-data/latest.json');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-weekly-data.mjs'), 'utf8')).toContain('public/weekly-data/connectors.json');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-weekly-data.mjs'), 'utf8')).toContain('public/weekly-data/source-tasks.json');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-semi-monthly-data.mjs'), 'utf8')).toContain('public/periodic-data/latest.json');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-semi-monthly-data.mjs'), 'utf8')).toContain('public/periodic-data/source-tasks.json');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-semi-monthly-data.mjs'), 'utf8')).toContain('collectPublicEvidence');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-semi-monthly-data.mjs'), 'utf8')).toContain('buildCustomsPublicDataAdapter');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-semi-monthly-data.mjs'), 'utf8')).toContain('public/periodic-data/public-evidence-samples.json');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-semi-monthly-data.mjs'), 'utf8')).toContain('public/periodic-data/customs-public-adapter.json');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-semi-monthly-data.mjs'), 'utf8')).toContain('public/weekly-data/customs-public-adapter.json');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-semi-monthly-data.mjs'), 'utf8')).toContain('--public-evidence-live');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-semi-monthly-data.mjs'), 'utf8')).toContain('--skip-public-evidence');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-semi-monthly-data.mjs'), 'utf8')).toContain('public/weekly-data/latest.json');
    const weeklyLocalPublishScript = readFileSync(join(process.cwd(), 'scripts/data/weekly-refresh-local-static.sh'), 'utf8');
    expect(weeklyLocalPublishScript).toContain('data:connector:amazon:private:audit');
    expect(weeklyLocalPublishScript).toContain('MKT53_AMAZON_PRIVATE_DIR');
    expect(weeklyLocalPublishScript).toContain('MKT53_PRIVATE_AUDIT_REQUIRED');
    expect(weeklyLocalPublishScript).toContain('data:refresh:weekly -- "$@"');
    expect(weeklyLocalPublishScript).toContain('Continuing public weekly refresh');
    expect(weeklyLocalPublishScript).toContain('npm run quality:bundle-budget');
    const semiMonthlyLocalPublishScript = readFileSync(join(process.cwd(), 'scripts/data/semi-monthly-refresh-local-static.sh'), 'utf8');
    expect(semiMonthlyLocalPublishScript).toContain('data:connector:amazon:private:audit');
    expect(semiMonthlyLocalPublishScript).toContain('MKT53_AMAZON_PRIVATE_DIR');
    expect(semiMonthlyLocalPublishScript).toContain('MKT53_PRIVATE_AUDIT_REQUIRED');
    expect(semiMonthlyLocalPublishScript).toContain('data:refresh:semi-monthly -- "$@"');
    expect(semiMonthlyLocalPublishScript).toContain('Continuing public semi-monthly refresh');
    expect(semiMonthlyLocalPublishScript).toContain('npm run quality:bundle-budget');
    expect(semiMonthlyLocalPublishScript).toContain('Skipped static publish because one or more local quality gates failed');
    const semiMonthlyDeployScript = readFileSync(join(process.cwd(), 'scripts/data/semi-monthly-refresh-and-deploy.sh'), 'utf8');
    expect(semiMonthlyDeployScript).toContain('npm run deploy:prod');
    expect(semiMonthlyDeployScript).toContain('npm run smoke:prod');
    expect(semiMonthlyDeployScript).toContain('npm run test:e2e:prod');
    expect(semiMonthlyDeployScript).toContain('npm run data:semi-monthly:report');
    expect(readFileSync(join(process.cwd(), 'scripts/data/install-semi-monthly-cron.sh'), 'utf8')).toContain('mkt53 weekly data refresh');
    expect(readFileSync(join(process.cwd(), 'scripts/data/install-semi-monthly-cron.sh'), 'utf8')).toContain('npm run data:publish:weekly:local');

    for (const script of [
      'scripts/data/audit-consistency.mjs',
      'scripts/data/audit-deep.mjs',
      'scripts/data/prioritize-source-gaps.mjs',
      'scripts/data/build-source-gap-readiness-packets.mjs',
      'scripts/data/validate-public-source-manual-evidence.mjs',
      'scripts/data/build-public-source-manual-release-review.mjs',
      'scripts/data/connectors/customs-public-data-adapter.mjs',
      'scripts/data/build-source-gap-owner-intake.mjs',
      'scripts/data/prefill-source-gap-owner-intake.mjs',
      'scripts/data/build-source-gap-owner-chat-intake-pack.mjs',
      'scripts/data/merge-source-gap-owner-chat-answers.mjs',
      'scripts/data/validate-source-gap-owner-intake.mjs',
      'scripts/data/build-source-tasks.mjs',
      'scripts/data/collect-public-evidence.mjs',
      'scripts/data/collect-weekly-sources.mjs',
      'scripts/data/refresh-weekly-data.mjs',
      'scripts/data/refresh-semi-monthly-data.mjs',
      'scripts/data/build-semi-monthly-recovery-candidate.mjs',
      'scripts/data/weekly-refresh-and-deploy.sh',
      'scripts/data/weekly-refresh-local-static.sh',
      'scripts/data/install-weekly-cron.sh',
      'scripts/data/semi-monthly-refresh-and-deploy.sh',
      'scripts/data/semi-monthly-refresh-local-static.sh',
      'scripts/data/install-semi-monthly-cron.sh',
      'scripts/deploy-static-and-verify.sh',
    ]) {
      expect(() => accessSync(join(process.cwd(), script), constants.X_OK)).not.toThrow();
    }

    expect(() => accessSync(join(process.cwd(), 'scripts/data/lib/connector-backlog.mjs'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/lib/connector-readiness.mjs'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/lib/source-tasks.mjs'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/public-evidence-seeds.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/amazon-commerce-dry-run.mjs'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/scaffold-amazon-mapping-fill-draft.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/bootstrap-amazon-private-inputs.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/amazon-commerce-private-input-audit.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/amazon-commerce-readiness-checklist.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/voc-nlp-dry-run.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/internal-crm-dry-run.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/internal-erp-dry-run.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-derived-batch2.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-derived-batch3.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-governance-batch7.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-approval-batch8.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-approval-intake-batch9.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-approval-record-template-batch10.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-approval-preflight-batch11.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-submission-intake-batch12.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-submission-pack-batch13.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-submission-dropbox-watchlist-batch14.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-submission-acceptance-gate-batch15.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-submission-synthetic-fixture-batch16.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-submission-synthetic-pipeline-batch17.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-erp-owner-submission-real-owner-checklist-batch18.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-ai-report-governance-batch4.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-ai-review-governance-batch5.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/build-ai-design-governance-batch6.mjs'), constants.X_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/templates/amazon-commerce-mapping-template.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/templates/amazon-commerce-readiness-template.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/templates/voc-nlp-readiness-template.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/templates/voc-nlp-sample-manifest-template.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/templates/internal-crm-readiness-template.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/templates/internal-crm-snapshot-manifest-template.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/templates/internal-erp-readiness-template.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/templates/internal-erp-snapshot-manifest-template.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'tests/fixtures/amazon-commerce-mapping-partial-valid.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'tests/fixtures/amazon-commerce-readiness-partial-valid.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'tests/fixtures/voc-nlp-readiness-valid.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'tests/fixtures/internal-crm-readiness-valid.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'tests/fixtures/internal-erp-readiness-valid.json'), constants.R_OK)).not.toThrow();
    expect(readFileSync(join(process.cwd(), '.gitignore'), 'utf8')).toContain('configs/private/');
  });

  it('prioritizes source gaps as a no-write governance queue', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-source-gap-priority-'));
    const sourcePath = join(tempDir, 'source_gap_matrix.csv');
    const outDir = join(tempDir, 'out');
    const header =
      'source_id,module,page,metric,source_name,source_type,verification_status,reliability,last_verified,collection_method,evidence_grade,can_display_as_fact,blocking_reason,privacy_level,evidence_artifact_path,claim_scope,source_url,action,gap,recommended_collection_lane';
    const rows = [
      'ds-visible,看市场,MarketPage,displayable metric,Public Source,行业报告,verified,A,2026-06-30,public-url-check,L1-public-or-runtime,true,,public,,,https://example.com,OK,,agent-reach-web-or-public-evidence-capture',
      'ds-connector,看竞争,CompetitionPage,竞品销量,Amazon API,平台API,needs-review,A,2026-06-30,connector-required,L0-unverified,false,authorized-connector-or-private-snapshot-required,private/internal,,,,补采集任务记录,,connector-readiness-or-authorized-private-snapshot',
      'ds-manual,看用户,ConsumerInterviews,访谈样本,定性研究,定性,needs-review,B,2026-06-30,manual-required,L0-unverified,false,manual-evidence-artifact-required,public,,,,补充样本量说明,样本量未标注,manual-review-artifact',
      'ds-public,看行业,IPAnalysis,专利数据,WIPO,官方数据库,needs-review,B,2026-06-30,public-url-check,L0-unverified,false,public-source-needs-review,public,,,https://www.wipo.int,需更新WIPO数据,2025数据缺失,agent-reach-web-or-public-evidence-capture',
    ];
    writeFileSync(sourcePath, `${header}\n${rows.join('\n')}\n`);

    const output = execFileSync('node', ['scripts/data/prioritize-source-gaps.mjs', '--source', sourcePath, '--out', outDir, '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const result = JSON.parse(output) as {
      summary: {
        totalRegistryRows: number;
        totalGaps: number;
        byCollectionMethod: Record<string, number>;
        byPriority: Record<string, number>;
        boundaries: Record<string, boolean>;
      };
      priorityRows: Array<{ priority: string; owner_lane: string; next_action: string; smallest_evidence_needed: string }>;
    };

    expect(result.summary.totalRegistryRows).toBe(4);
    expect(result.summary.totalGaps).toBe(3);
    expect(result.summary.byCollectionMethod['connector-required']).toBe(1);
    expect(result.summary.byCollectionMethod['manual-required']).toBe(1);
    expect(result.summary.byCollectionMethod['public-url-check']).toBe(1);
    expect(result.summary.boundaries.providerCalls).toBe(false);
    expect(result.summary.boundaries.productionWrites).toBe(false);
    expect(result.summary.boundaries.productionDeploy).toBe(false);
    expect(result.summary.boundaries.factPromotion).toBe(false);
    expect(result.priorityRows.every((row) => row.priority && row.owner_lane && row.next_action && row.smallest_evidence_needed)).toBe(true);
    expect(Object.values(result.summary.byPriority).reduce((sum, count) => sum + count, 0)).toBe(result.summary.totalGaps);
    expect(existsSync(outDir)).toBe(false);
    expect(output).not.toMatch(FORBIDDEN_ERP_SCRIPT_OUTPUT_RE);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('builds P0 readiness packets without provider or production side effects', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-source-gap-packets-'));
    const sourcePath = join(tempDir, 'source_gap_priority_matrix.csv');
    const outDir = join(tempDir, 'out');
    const header =
      'priority,priority_reason,owner_lane,recommended_collection_lane,source_id,module,page,metric,source_name,source_type,collection_method,evidence_grade,verification_status,privacy_level,allowed_current_display_state,can_display_as_fact_current,next_action,smallest_evidence_needed,blocking_reason,gap,source_url,evidence_artifact_path,last_verified,action';
    const rows = [
      'P0,Core connector gap,amazon_connector_owner,connector-readiness-or-authorized-private-snapshot,ds-007,看竞争,CompetitionPage,竞品概览,Amazon.com 实时采集,平台API,connector-required,L0-unverified,needs-review,private/internal,display_as_gate_only,false,Create connector readiness record,Authorized read-only export or connector readiness artifact,authorized-connector-or-private-snapshot-required,,,,2026-06-30,补采集任务记录',
      'P0,Core connector gap,voc_nlp_connector_owner,connector-readiness-or-authorized-private-snapshot,ds-032,看行业,FlavorMap,VOC功能趋势地图,VOC NLP,AI模型,connector-required,L0-unverified,needs-review,private/internal,display_as_gate_only,false,Create connector readiness record,Authorized read-only export or connector readiness artifact,authorized-connector-or-private-snapshot-required,缺少VOC样本窗口,,,2026-06-30,补运行记录',
      'P1,Manual gap,business_owner_manual_review,manual-review-artifact,ds-014,看用户,ConsumerInterviews,消费者访谈,定性研究,定性,manual-required,L0-unverified,needs-review,public,display_as_gate_only,false,Create manual review artifact,Manual evidence artifact signed by business owner,manual-evidence-artifact-required,样本量未标注,,,2026-06-30,补充样本量说明',
    ];
    writeFileSync(sourcePath, `${header}\n${rows.join('\n')}\n`);

    const output = execFileSync(
      'node',
      ['scripts/data/build-source-gap-readiness-packets.mjs', '--source', sourcePath, '--out', outDir, '--json', '--no-write'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as {
      summary: {
        sourceRowCount: number;
        packetCount: number;
        questionCount: number;
        byOwnerLane: Record<string, number>;
        boundaries: Record<string, boolean>;
      };
      packets: Array<{ packet_id: string; priority: string; owner_lane: string; required_artifact_fields: string; forbidden_claims: string }>;
      questions: Array<{ packet_id: string; question_id: string }>;
    };

    expect(result.summary.sourceRowCount).toBe(2);
    expect(result.summary.packetCount).toBe(2);
    expect(result.summary.questionCount).toBe(12);
    expect(result.summary.byOwnerLane.amazon_connector_owner).toBe(1);
    expect(result.summary.byOwnerLane.voc_nlp_connector_owner).toBe(1);
    expect(result.summary.boundaries.providerCalls).toBe(false);
    expect(result.summary.boundaries.restrictedConnectorAccess).toBe(false);
    expect(result.summary.boundaries.productionWrites).toBe(false);
    expect(result.summary.boundaries.factPromotion).toBe(false);
    expect(result.packets.every((packet) => packet.priority === 'P0')).toBe(true);
    expect(result.packets.some((packet) => packet.required_artifact_fields.includes('field_dictionary_path'))).toBe(true);
    expect(result.packets.some((packet) => packet.forbidden_claims.includes('Amazon platform-level'))).toBe(true);
    expect(result.questions.every((question) => question.packet_id && question.question_id)).toBe(true);
    expect(existsSync(outDir)).toBe(false);
    expect(output).not.toMatch(FORBIDDEN_ERP_SCRIPT_OUTPUT_RE);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('builds readiness coverage from priority rows and packet outputs', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-source-gap-coverage-'));
    const sourcePath = join(tempDir, 'source_gap_priority_matrix.csv');
    const packetDir = join(tempDir, 'packets');
    const outDir = join(tempDir, 'out');
    mkdirSync(packetDir, { recursive: true });

    const priorityHeader =
      'priority,priority_reason,owner_lane,recommended_collection_lane,source_id,module,page,metric,source_name,source_type,collection_method,evidence_grade,verification_status,privacy_level,allowed_current_display_state,can_display_as_fact_current,next_action,smallest_evidence_needed,blocking_reason,gap,source_url,evidence_artifact_path,last_verified,action';
    const priorityRows = [
      'P0,Core connector gap,amazon_connector_owner,connector-readiness-or-authorized-private-snapshot,ds-007,看竞争,CompetitionPage,竞品概览,Amazon.com 实时采集,平台API,connector-required,L0-unverified,needs-review,private/internal,display_as_gate_only,false,Create connector readiness record,Authorized read-only export or connector readiness artifact,authorized-connector-or-private-snapshot-required,,,,2026-06-30,补采集任务记录',
      'P0,Core connector gap,voc_nlp_connector_owner,connector-readiness-or-authorized-private-snapshot,ds-032,看行业,FlavorMap,VOC功能趋势地图,VOC NLP,AI模型,connector-required,L0-unverified,needs-review,private/internal,display_as_gate_only,false,Create connector readiness record,Authorized read-only export or connector readiness artifact,authorized-connector-or-private-snapshot-required,缺少VOC样本窗口,,,2026-06-30,补运行记录',
      'P1,Manual gap,business_owner_manual_review,manual-review-artifact,ds-014,看用户,ConsumerInterviews,消费者访谈,定性研究,定性,manual-required,L0-unverified,needs-review,public,display_as_gate_only,false,Create manual review artifact,Manual evidence artifact signed by business owner,manual-evidence-artifact-required,样本量未标注,,,2026-06-30,补充样本量说明',
    ];
    writeFileSync(sourcePath, `${priorityHeader}\n${priorityRows.join('\n')}\n`);

    const packetHeader =
      'packet_id,priority,owner_lane,source_count,source_ids,pages,collection_methods,current_max_evidence_grade,target_min_evidence_grade,decision_boundary,blocked_fact_display_until,required_artifact_fields,acceptance_gate,forbidden_claims';
    const packetRows = [
      'p0-amazon-connector-owner-01,P0,amazon_connector_owner,1,ds-007,CompetitionPage,connector-required,L0-unverified,L3-production-read-only,readiness_packet_only,required evidence artifact is created,artifact_id|owner_alias|evidence_file_path|evidence_hash,Owner provides authorized read-only snapshot,Do not display these rows as verified facts.',
      'p0-voc-nlp-connector-owner-02,P0,voc_nlp_connector_owner,1,ds-032,FlavorMap,connector-required,L0-unverified,L3-production-read-only,readiness_packet_only,required evidence artifact is created,artifact_id|owner_alias|evidence_file_path|evidence_hash,Owner provides authorized read-only snapshot,Do not promote NLP output without review.',
    ];
    writeFileSync(join(packetDir, 'readiness_packets.csv'), `${packetHeader}\n${packetRows.join('\n')}\n`);

    const output = execFileSync(
      'node',
      [
        'scripts/data/build-source-gap-readiness-coverage.mjs',
        '--source',
        sourcePath,
        '--packet-dir',
        packetDir,
        '--out',
        outDir,
        '--json',
        '--no-write',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as {
      summary: {
        sourceGapCount: number;
        coveredSourceGapCount: number;
        uncoveredSourceIds: string[];
        byOwnerLane: Record<string, number>;
        boundaries: Record<string, boolean>;
      };
      coverageRows: Array<{
        source_id: string;
        covered_by_packet: string;
        packet_id: string;
        packet_dir: string;
        can_display_as_fact_current: string;
      }>;
    };

    expect(result.summary.sourceGapCount).toBe(2);
    expect(result.summary.coveredSourceGapCount).toBe(2);
    expect(result.summary.uncoveredSourceIds).toEqual([]);
    expect(result.summary.byOwnerLane.amazon_connector_owner).toBe(1);
    expect(result.summary.byOwnerLane.voc_nlp_connector_owner).toBe(1);
    expect(result.summary.boundaries.providerCalls).toBe(false);
    expect(result.summary.boundaries.restrictedConnectorAccess).toBe(false);
    expect(result.summary.boundaries.productionWrites).toBe(false);
    expect(result.summary.boundaries.factPromotion).toBe(false);
    expect(result.coverageRows.map((row) => row.source_id)).toEqual(['ds-007', 'ds-032']);
    expect(result.coverageRows.every((row) => row.covered_by_packet === 'yes')).toBe(true);
    expect(result.coverageRows.every((row) => row.packet_id.startsWith('p0-'))).toBe(true);
    expect(result.coverageRows.every((row) => row.packet_dir === packetDir)).toBe(true);
    expect(result.coverageRows.every((row) => row.can_display_as_fact_current === 'false')).toBe(true);
    expect(existsSync(outDir)).toBe(false);
    expect(output).not.toMatch(FORBIDDEN_ERP_SCRIPT_OUTPUT_RE);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('builds P1 manual and public evidence packets without mixing connector gaps', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-source-gap-p1-packets-'));
    const sourcePath = join(tempDir, 'source_gap_priority_matrix.csv');
    const outDir = join(tempDir, 'out');
    const header =
      'priority,priority_reason,owner_lane,recommended_collection_lane,source_id,module,page,metric,source_name,source_type,collection_method,evidence_grade,verification_status,privacy_level,allowed_current_display_state,can_display_as_fact_current,next_action,smallest_evidence_needed,blocking_reason,gap,source_url,evidence_artifact_path,last_verified,action';
    const rows = [
      'P1,Manual evidence gap,business_owner_manual_review,manual-review-artifact,ds-003,看市场,MarketTrend,PEST分析,WHO/FDA/各国政府,官方数据,manual-required,L0-unverified,needs-review,public,display_as_gate_only,false,Create manual review artifact,Manual evidence artifact signed by business owner,manual-evidence-artifact-required,来源组合需拆分,,,2026-06-30,拆分到具体来源URL',
      'P1,Public source gap,public_research_owner,agent-reach-web-or-public-evidence-capture,ds-011,看用户,UsersPage,中国有孩家庭用户画像,QuestMobile,行业报告,public-url-check,L0-unverified,needs-review,public,display_as_gate_only,false,Capture public evidence,One primary public source or two independent public sources,public-source-needs-review,页面仍需拆分地域,https://example.com,,2026-06-30,拆分地域口径',
      'P1,Connector gap,amazon_connector_owner,connector-readiness-or-authorized-private-snapshot,ds-037,看市场,BabyCare,婴儿护理品类规模,Amazon品类采集,推算,connector-required,LO-S-synthetic,example,private/internal,sample_only_excluded_from_fact_and_csv,false,Keep page wording as sample,Authorized read-only export or connector readiness artifact,example-data-must-not-display-as-fact,缺少采集窗口,,,2026-06-30,补采集窗口',
    ];
    writeFileSync(sourcePath, `${header}\n${rows.join('\n')}\n`);

    const output = execFileSync(
      'node',
      [
        'scripts/data/build-source-gap-readiness-packets.mjs',
        '--source',
        sourcePath,
        '--out',
        outDir,
        '--priority',
        'P1',
        '--collection-method',
        'manual-required,public-url-check',
        '--json',
        '--no-write',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as {
      summary: {
        sourceRowCount: number;
        packetCount: number;
        questionCount: number;
        selectedCollectionMethods: string[];
        byCollectionMethod: Record<string, number>;
        byOwnerLane: Record<string, number>;
        boundaries: Record<string, boolean>;
      };
      packets: Array<{ packet_id: string; priority: string; owner_lane: string; collection_methods: string; required_artifact_fields: string }>;
    };

    expect(result.summary.sourceRowCount).toBe(2);
    expect(result.summary.packetCount).toBe(2);
    expect(result.summary.questionCount).toBe(12);
    expect(result.summary.selectedCollectionMethods).toEqual(['manual-required', 'public-url-check']);
    expect(result.summary.byCollectionMethod['manual-required']).toBe(1);
    expect(result.summary.byCollectionMethod['public-url-check']).toBe(1);
    expect(result.summary.byCollectionMethod['connector-required'] ?? 0).toBe(0);
    expect(result.summary.byOwnerLane.business_owner_manual_review).toBe(1);
    expect(result.summary.byOwnerLane.public_research_owner).toBe(1);
    expect(result.summary.boundaries.providerCalls).toBe(false);
    expect(result.summary.boundaries.restrictedConnectorAccess).toBe(false);
    expect(result.summary.boundaries.productionWrites).toBe(false);
    expect(result.summary.boundaries.factPromotion).toBe(false);
    expect(result.packets.every((packet) => packet.priority === 'P1')).toBe(true);
    expect(result.packets.every((packet) => !packet.collection_methods.includes('connector-required'))).toBe(true);
    expect(result.packets.some((packet) => packet.required_artifact_fields.includes('business_owner_signoff'))).toBe(true);
    expect(result.packets.some((packet) => packet.required_artifact_fields.includes('source_url'))).toBe(true);
    expect(existsSync(outDir)).toBe(false);
    expect(output).not.toMatch(FORBIDDEN_ERP_SCRIPT_OUTPUT_RE);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('builds source gap owner intake templates without promoting approvals', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-source-gap-owner-intake-'));
    const packetDir = join(tempDir, 'packets');
    const outDir = join(tempDir, 'out');
    mkdirSync(packetDir, { recursive: true });

    const coveragePath = join(tempDir, 'source_gap_readiness_coverage.csv');
    const coverageHeader =
      'source_id,priority,module,page,metric,collection_method,evidence_grade,verification_status,owner_lane,covered_by_packet,packet_id,packet_dir,allowed_current_display_state,can_display_as_fact_current,next_action,blocking_reason';
    const coverageRows = [
      `ds-007,P0,看竞争,CompetitionPage,竞品概览,connector-required,L0-unverified,needs-review,amazon_connector_owner,yes,p0-amazon-connector-owner-01,${packetDir},display_as_gate_only,false,Create connector readiness record,authorized-connector-or-private-snapshot-required`,
      `ds-014,P1,看用户,ConsumerInterviews,消费者访谈,manual-required,L0-unverified,needs-review,business_owner_manual_review,yes,p1-business-owner-manual-review-01,${packetDir},display_as_gate_only,false,Create manual review artifact,manual-evidence-artifact-required`,
    ];
    writeFileSync(coveragePath, `${coverageHeader}\n${coverageRows.join('\n')}\n`);

    const packetHeader =
      'packet_id,priority,owner_lane,source_count,source_ids,pages,collection_methods,current_max_evidence_grade,target_min_evidence_grade,decision_boundary,blocked_fact_display_until,required_artifact_fields,acceptance_gate,forbidden_claims';
    const packetRows = [
      'p0-amazon-connector-owner-01,P0,amazon_connector_owner,1,ds-007,CompetitionPage,connector-required,L0-unverified,L3-production-read-only or L4-authorized-live,readiness_packet_only; no provider call; no restricted connector access; no production write; no fact promotion,required evidence artifact is created,artifact_id|owner_alias|evidence_file_path|evidence_hash|display_decision|export_decision,Owner provides authorized read-only snapshot,Do not display these rows as verified facts.',
      'p1-business-owner-manual-review-01,P1,business_owner_manual_review,1,ds-014,ConsumerInterviews,manual-required,L0-unverified,L1-public-or-runtime plus signed manual artifact,readiness_packet_only; no provider call; no restricted connector access; no production write; no fact promotion,required evidence artifact is created,artifact_id|owner_alias|evidence_file_path|evidence_hash|business_owner_signoff,Business owner provides signed review artifact,Do not export these rows as factual CSV data.',
    ];
    writeFileSync(join(packetDir, 'readiness_packets.csv'), `${packetHeader}\n${packetRows.join('\n')}\n`);

    const questionHeader = 'packet_id,question_id,owner_lane,source_ids,question,expected_answer_format,required_for_promotion';
    const questionRows = [
      'p0-amazon-connector-owner-01,Q1,amazon_connector_owner,ds-007,Who owns this source packet?,owner_alias / owner_role,yes',
      'p0-amazon-connector-owner-01,Q2,amazon_connector_owner,ds-007,Where is the evidence file?,path or URI / sha256,yes',
      'p1-business-owner-manual-review-01,Q1,business_owner_manual_review,ds-014,Who owns this source packet?,owner_alias / owner_role,yes',
      'p1-business-owner-manual-review-01,Q2,business_owner_manual_review,ds-014,Where is the evidence file?,path or URI / sha256,yes',
    ];
    writeFileSync(join(packetDir, 'owner_questionnaire.csv'), `${questionHeader}\n${questionRows.join('\n')}\n`);

    const output = execFileSync(
      'node',
      ['scripts/data/build-source-gap-owner-intake.mjs', '--coverage', coveragePath, '--out', outDir, '--json', '--no-write'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as {
      summary: {
        sourceGapCount: number;
        packetCount: number;
        questionCount: number;
        releaseGateCount: number;
        byOwnerLane: Record<string, number>;
        boundaries: Record<string, boolean>;
      };
      manifest: {
        outputs: Record<string, { rowCount: number; headers: string[] }>;
        boundaries: Record<string, boolean>;
      };
      samplePacketQueue: Array<{ intake_status: string; ready_for_fact_display: string; ready_for_csv_export: string }>;
      sampleQuestionnaire: Array<{ answer_status: string; owner_answer: string; evidence_hash: string }>;
      sampleReleaseGate: Array<{ gate_status: string; can_write_source_registry: string; can_update_page_display: string }>;
    };

    expect(result.summary.sourceGapCount).toBe(2);
    expect(result.summary.packetCount).toBe(2);
    expect(result.summary.questionCount).toBe(4);
    expect(result.summary.releaseGateCount).toBe(2);
    expect(result.summary.byOwnerLane.amazon_connector_owner).toBe(1);
    expect(result.summary.byOwnerLane.business_owner_manual_review).toBe(1);
    expect(result.summary.boundaries.providerCalls).toBe(false);
    expect(result.summary.boundaries.restrictedConnectorAccess).toBe(false);
    expect(result.summary.boundaries.productionWrites).toBe(false);
    expect(result.summary.boundaries.factPromotion).toBe(false);
    expect(result.summary.boundaries.sourceRegistryWrites).toBe(false);
    expect(result.manifest.outputs['owner_intake_questionnaire.csv']).toMatchObject({ rowCount: 4 });
    expect(result.manifest.outputs['owner_intake_release_gate.csv'].headers).toEqual(
      expect.arrayContaining(['can_write_source_registry', 'can_update_page_display', 'can_export_as_fact_csv']),
    );
    expect(result.samplePacketQueue.every((packet) => packet.intake_status === 'awaiting_owner_submission')).toBe(true);
    expect(result.samplePacketQueue.every((packet) => packet.ready_for_fact_display === 'false')).toBe(true);
    expect(result.samplePacketQueue.every((packet) => packet.ready_for_csv_export === 'false')).toBe(true);
    expect(result.sampleQuestionnaire.every((question) => question.answer_status === 'missing')).toBe(true);
    expect(result.sampleQuestionnaire.every((question) => question.owner_answer === '' && question.evidence_hash === '')).toBe(true);
    expect(result.sampleReleaseGate.every((gate) => gate.gate_status === 'blocked_owner_submission_required')).toBe(true);
    expect(result.sampleReleaseGate.every((gate) => gate.can_write_source_registry === 'false' && gate.can_update_page_display === 'false')).toBe(true);
    expect(existsSync(outDir)).toBe(false);
    expect(output).not.toMatch(FORBIDDEN_ERP_SCRIPT_OUTPUT_RE);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('validates source gap owner intake submissions without promoting them', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-source-gap-owner-intake-validation-'));
    const intakeDir = join(tempDir, 'intake');
    const outDir = join(tempDir, 'out');
    const evidenceHash = 'a'.repeat(64);
    mkdirSync(intakeDir, { recursive: true });

    const sourceHeader =
      'source_id,priority,module,page,metric,collection_method,evidence_grade,verification_status,owner_lane,packet_id,packet_dir,current_display_state,can_display_as_fact_current,intake_status,promotion_state,owner_answer_required,evidence_required,next_action,blocking_reason';
    const sourceRows = [
      'ds-007,P0,看竞争,CompetitionPage,竞品概览,connector-required,L0-unverified,needs-review,amazon_connector_owner,p0-amazon-connector-owner-01,tmp/audits/packets,display_as_gate_only,false,awaiting_owner_submission,blocked_until_owner_evidence_validated,yes,yes,Create connector readiness record,authorized-connector-or-private-snapshot-required',
      'ds-014,P1,看用户,ConsumerInterviews,消费者访谈,manual-required,L0-unverified,needs-review,business_owner_manual_review,p1-business-owner-manual-review-01,tmp/audits/packets,display_as_gate_only,false,awaiting_owner_submission,blocked_until_owner_evidence_validated,yes,yes,Create manual review artifact,manual-evidence-artifact-required',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_source_matrix.csv'), `${sourceHeader}\n${sourceRows.join('\n')}\n`);

    const packetHeader =
      'packet_id,priority,owner_lane,source_count,source_ids,pages,collection_methods,current_max_evidence_grade,target_min_evidence_grade,required_artifact_fields,acceptance_gate,forbidden_claims,intake_status,submitted_owner_answers,required_owner_answers,ready_for_registry_binding,ready_for_fact_display,ready_for_csv_export';
    const packetRows = [
      'p0-amazon-connector-owner-01,P0,amazon_connector_owner,1,ds-007,CompetitionPage,connector-required,L0-unverified,L3-production-read-only,artifact_id|owner_alias|evidence_file_path|evidence_hash,Owner provides authorized read-only snapshot,Do not display these rows as verified facts.,awaiting_owner_submission,0,2,false,false,false',
      'p1-business-owner-manual-review-01,P1,business_owner_manual_review,1,ds-014,ConsumerInterviews,manual-required,L0-unverified,L1-public-or-runtime,artifact_id|owner_alias|evidence_file_path|evidence_hash,Owner provides signed review artifact,Do not export these rows as factual CSV data.,awaiting_owner_submission,0,2,false,false,false',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_packet_queue.csv'), `${packetHeader}\n${packetRows.join('\n')}\n`);

    const questionHeader =
      'packet_id,question_id,owner_lane,source_ids,question,expected_answer_format,required_for_promotion,answer_status,owner_answer,evidence_uri_or_path,evidence_hash,answered_by,answered_at,validation_note';
    const questionRows = [
      `p0-amazon-connector-owner-01,Q1,amazon_connector_owner,ds-007,Who owns this source packet?,owner_alias / owner_role,yes,answered,pray owner,tmp/evidence/p0-owner.json,${evidenceHash},pray,2026-06-30,ready for manual review`,
      `p0-amazon-connector-owner-01,Q2,amazon_connector_owner,ds-007,Where is the evidence file?,path or URI / sha256,yes,answered,tmp evidence snapshot,tmp/evidence/p0-owner.json,sha256:${evidenceHash},pray,2026-06-30,ready for manual review`,
      'p1-business-owner-manual-review-01,Q1,business_owner_manual_review,ds-014,Who owns this source packet?,owner_alias / owner_role,yes,missing,,,,,,Owner answer and evidence are required.',
      'p1-business-owner-manual-review-01,Q2,business_owner_manual_review,ds-014,Where is the evidence file?,path or URI / sha256,yes,missing,,,,,,Owner answer and evidence are required.',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_questionnaire.csv'), `${questionHeader}\n${questionRows.join('\n')}\n`);

    const releaseHeader =
      'release_gate_id,packet_id,owner_lane,priority,source_ids,required_question_count,submitted_question_count,submitted_evidence_count,missing_required_questions,gate_status,can_write_source_registry,can_update_page_display,can_export_as_fact_csv,blocking_reason,next_command_after_owner_submission';
    const releaseRows = [
      'owner-intake-gate:p0-amazon-connector-owner-01,p0-amazon-connector-owner-01,amazon_connector_owner,P0,ds-007,2,0,0,2,blocked_owner_submission_required,false,false,false,owner answers required,future validation batch only',
      'owner-intake-gate:p1-business-owner-manual-review-01,p1-business-owner-manual-review-01,business_owner_manual_review,P1,ds-014,2,0,0,2,blocked_owner_submission_required,false,false,false,owner answers required,future validation batch only',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_release_gate.csv'), `${releaseHeader}\n${releaseRows.join('\n')}\n`);

    const output = execFileSync(
      'node',
      ['scripts/data/validate-source-gap-owner-intake.mjs', '--intake', intakeDir, '--out', outDir, '--json', '--no-write'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as {
      summary: {
        sourceGapCount: number;
        packetCount: number;
        questionCount: number;
        answeredQuestionCount: number;
        missingRequiredQuestionCount: number;
        packetReadyForManualReviewCount: number;
        packetBlockedCount: number;
        sourceReadyForManualReviewCount: number;
        sourceBlockedCount: number;
        validationStatusCounts: Record<string, number>;
        boundaries: Record<string, boolean>;
      };
      samplePacketValidation: Array<{
        packet_id: string;
        packet_validation_status: string;
        ready_for_manual_review: string;
        can_write_source_registry: string;
        can_update_page_display: string;
        can_export_as_fact_csv: string;
      }>;
      sampleQuestionValidation: Array<{ validation_status: string; hash_validation_status: string; blockers: string }>;
    };

    expect(result.summary.sourceGapCount).toBe(2);
    expect(result.summary.packetCount).toBe(2);
    expect(result.summary.questionCount).toBe(4);
    expect(result.summary.answeredQuestionCount).toBe(2);
    expect(result.summary.missingRequiredQuestionCount).toBe(2);
    expect(result.summary.packetReadyForManualReviewCount).toBe(1);
    expect(result.summary.packetBlockedCount).toBe(1);
    expect(result.summary.sourceReadyForManualReviewCount).toBe(1);
    expect(result.summary.sourceBlockedCount).toBe(1);
    expect(result.summary.validationStatusCounts.ready_for_manual_review).toBe(1);
    expect(result.summary.validationStatusCounts.blocked_owner_submission_incomplete).toBe(1);
    expect(result.summary.boundaries.providerCalls).toBe(false);
    expect(result.summary.boundaries.restrictedConnectorAccess).toBe(false);
    expect(result.summary.boundaries.productionWrites).toBe(false);
    expect(result.summary.boundaries.factPromotion).toBe(false);
    expect(result.summary.boundaries.sourceRegistryWrites).toBe(false);
    expect(result.summary.boundaries.pageWrites).toBe(false);
    expect(result.summary.boundaries.csvFactExport).toBe(false);
    expect(result.samplePacketValidation.every((packet) => packet.can_write_source_registry === 'false')).toBe(true);
    expect(result.samplePacketValidation.every((packet) => packet.can_update_page_display === 'false')).toBe(true);
    expect(result.samplePacketValidation.every((packet) => packet.can_export_as_fact_csv === 'false')).toBe(true);
    expect(result.samplePacketValidation.find((packet) => packet.packet_id === 'p0-amazon-connector-owner-01')).toMatchObject({
      packet_validation_status: 'ready_for_manual_review',
      ready_for_manual_review: 'true',
    });
    expect(result.samplePacketValidation.find((packet) => packet.packet_id === 'p1-business-owner-manual-review-01')).toMatchObject({
      packet_validation_status: 'blocked_owner_submission_incomplete',
      ready_for_manual_review: 'false',
    });
    expect(result.sampleQuestionValidation.filter((question) => question.hash_validation_status === 'valid_sha256')).toHaveLength(2);
    expect(result.sampleQuestionValidation.some((question) => question.blockers.includes('missing-required-answer'))).toBe(true);
    expect(existsSync(outDir)).toBe(false);
    expect(output).not.toMatch(FORBIDDEN_ERP_SCRIPT_OUTPUT_RE);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('prefills source gap owner intake from local evidence while keeping release gates closed', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-source-gap-owner-intake-prefill-'));
    const intakeDir = join(tempDir, 'intake');
    const evidenceDir = join(tempDir, 'evidence');
    const outDir = join(tempDir, 'out');
    mkdirSync(intakeDir, { recursive: true });
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(join(evidenceDir, 'ds-public.txt'), 'public source evidence for ds-public');

    const sourceHeader =
      'source_id,priority,module,page,metric,collection_method,evidence_grade,verification_status,owner_lane,packet_id,packet_dir,current_display_state,can_display_as_fact_current,intake_status,promotion_state,owner_answer_required,evidence_required,next_action,blocking_reason';
    const sourceRows = [
      'ds-public,P1,看行业,IPAnalysis,专利入口,public-url-check,L0-unverified,needs-review,public_research_owner,p1-public-research-owner-01,tmp/audits/packets,display_as_gate_only,false,awaiting_owner_submission,blocked_until_owner_evidence_validated,yes,yes,Capture public evidence,public-source-needs-review',
      'ds-manual,P1,看用户,ConsumerInterviews,访谈样本,manual-required,L0-unverified,needs-review,business_owner_manual_review,p1-business-owner-manual-review-01,tmp/audits/packets,display_as_gate_only,false,awaiting_owner_submission,blocked_until_owner_evidence_validated,yes,yes,Create manual review artifact,manual-evidence-artifact-required',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_source_matrix.csv'), `${sourceHeader}\n${sourceRows.join('\n')}\n`);

    const packetHeader =
      'packet_id,priority,owner_lane,source_count,source_ids,pages,collection_methods,current_max_evidence_grade,target_min_evidence_grade,required_artifact_fields,acceptance_gate,forbidden_claims,intake_status,submitted_owner_answers,required_owner_answers,ready_for_registry_binding,ready_for_fact_display,ready_for_csv_export';
    const packetRows = [
      'p1-public-research-owner-01,P1,public_research_owner,1,ds-public,IPAnalysis,public-url-check,L0-unverified,L1-public-or-runtime,artifact_id|owner_alias|evidence_file_path|evidence_hash,Public evidence capture records URL and hash,Do not promote without manual review,awaiting_owner_submission,0,6,false,false,false',
      'p1-business-owner-manual-review-01,P1,business_owner_manual_review,1,ds-manual,ConsumerInterviews,manual-required,L0-unverified,L1-public-or-runtime,artifact_id|owner_alias|evidence_file_path|evidence_hash,Business owner provides signed review artifact,Do not promote without manual review,awaiting_owner_submission,0,6,false,false,false',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_packet_queue.csv'), `${packetHeader}\n${packetRows.join('\n')}\n`);

    const questionHeader =
      'packet_id,question_id,owner_lane,source_ids,question,expected_answer_format,required_for_promotion,answer_status,owner_answer,evidence_uri_or_path,evidence_hash,answered_by,answered_at,validation_note';
    const questionRows = [
      ...['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'].map(
        (questionId) =>
          `p1-public-research-owner-01,${questionId},public_research_owner,ds-public,Question ${questionId},answer format,yes,missing,,,,,,Owner answer and evidence are required.`,
      ),
      ...['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'].map(
        (questionId) =>
          `p1-business-owner-manual-review-01,${questionId},business_owner_manual_review,ds-manual,Question ${questionId},answer format,yes,missing,,,,,,Owner answer and evidence are required.`,
      ),
    ];
    writeFileSync(join(intakeDir, 'owner_intake_questionnaire.csv'), `${questionHeader}\n${questionRows.join('\n')}\n`);

    const releaseHeader =
      'release_gate_id,packet_id,owner_lane,priority,source_ids,required_question_count,submitted_question_count,submitted_evidence_count,missing_required_questions,gate_status,can_write_source_registry,can_update_page_display,can_export_as_fact_csv,blocking_reason,next_command_after_owner_submission';
    const releaseRows = [
      'owner-intake-gate:p1-public-research-owner-01,p1-public-research-owner-01,public_research_owner,P1,ds-public,6,0,0,6,blocked_owner_submission_required,false,false,false,owner answers required,future validation batch only',
      'owner-intake-gate:p1-business-owner-manual-review-01,p1-business-owner-manual-review-01,business_owner_manual_review,P1,ds-manual,6,0,0,6,blocked_owner_submission_required,false,false,false,owner answers required,future validation batch only',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_release_gate.csv'), `${releaseHeader}\n${releaseRows.join('\n')}\n`);

    const sourceCrossPath = join(tempDir, 'source_cross_validation_matrix.csv');
    const sourceCrossHeader =
      'source_id,page,source_name,url,primary_capture_status,secondary_capture_status,evidence_artifacts,evidence_grade,max_supported_claim,blocked_claims,display_decision,next_action';
    const sourceCrossRows = [
      'ds-public,IPAnalysis,WIPO,https://example.com,captured:200,not-needed,evidence/ds-public.txt,L1-public-or-runtime,Public entry page exists,Product-level patent claims remain pending,blocked,Run query-specific patent search',
    ];
    writeFileSync(sourceCrossPath, `${sourceCrossHeader}\n${sourceCrossRows.join('\n')}\n`);

    const output = execFileSync(
      'node',
      [
        'scripts/data/prefill-source-gap-owner-intake.mjs',
        '--intake',
        intakeDir,
        '--out',
        outDir,
        '--source-cross-matrix',
        sourceCrossPath,
        '--data-point-matrix',
        join(tempDir, 'missing_data_point_matrix.csv'),
        '--json',
        '--no-write',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as {
      summary: {
        sourceGapCount: number;
        packetCount: number;
        questionCount: number;
        usableEvidenceRowCount: number;
        prefilledQuestionCount: number;
        prefilledReadyPacketCount: number;
        chatQuestionPacketCount: number;
        boundaries: Record<string, boolean>;
      };
      readyPackets: Array<{
        packet_id: string;
        intake_status: string;
        submitted_owner_answers: number;
        ready_for_registry_binding: string;
        ready_for_fact_display: string;
        ready_for_csv_export: string;
      }>;
      chatQuestions: Array<{ packet_id: string; missing_source_ids: string }>;
    };

    expect(result.summary.sourceGapCount).toBe(2);
    expect(result.summary.packetCount).toBe(2);
    expect(result.summary.questionCount).toBe(12);
    expect(result.summary.usableEvidenceRowCount).toBe(1);
    expect(result.summary.prefilledQuestionCount).toBe(6);
    expect(result.summary.prefilledReadyPacketCount).toBe(1);
    expect(result.summary.chatQuestionPacketCount).toBe(1);
    expect(result.summary.boundaries.providerCalls).toBe(false);
    expect(result.summary.boundaries.productionWrites).toBe(false);
    expect(result.summary.boundaries.factPromotion).toBe(false);
    expect(result.summary.boundaries.sourceRegistryWrites).toBe(false);
    expect(result.summary.boundaries.pageWrites).toBe(false);
    expect(result.summary.boundaries.csvFactExport).toBe(false);
    expect(result.readyPackets).toHaveLength(1);
    expect(result.readyPackets[0]).toMatchObject({
      packet_id: 'p1-public-research-owner-01',
      intake_status: 'prefilled_ready_for_validator',
      submitted_owner_answers: 6,
      ready_for_registry_binding: 'false',
      ready_for_fact_display: 'false',
      ready_for_csv_export: 'false',
    });
    expect(result.chatQuestions).toEqual([
      expect.objectContaining({
        packet_id: 'p1-business-owner-manual-review-01',
        missing_source_ids: 'ds-manual',
      }),
    ]);
    expect(existsSync(outDir)).toBe(false);
    expect(output).not.toMatch(FORBIDDEN_ERP_SCRIPT_OUTPUT_RE);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('builds owner chat intake batches from remaining source gap packets without merging answers', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-source-gap-owner-chat-intake-'));
    const chatQueuePath = join(tempDir, 'owner_intake_prefill_chat_questions.csv');
    const outDir = join(tempDir, 'out');

    const header =
      'packet_id,priority,owner_lane,source_ids,pages,missing_source_ids,suggested_question_batch,chat_prompt,blocking_reason';
    const rows = [
      'p1-manual-owner-01,P1,business_owner_manual_review,ds-manual,ConsumerInterviews,ds-manual,Q1-Q6,Answer Q1-Q6 for p1-manual-owner-01,source-level evidence artifact is missing',
      'p0-connector-owner-01,P0,amazon_connector_owner,ds-amz-a|ds-amz-b,CompetitionPage|ProductManage,ds-amz-a|ds-amz-b,Q1-Q6,Answer Q1-Q6 for p0-connector-owner-01,source-level evidence artifact is missing',
      'p2-public-owner-01,P2,public_research_owner,ds-public,IndustryNews,ds-public,Q1-Q6,Answer Q1-Q6 for p2-public-owner-01,source-level evidence artifact is missing',
    ];
    writeFileSync(chatQueuePath, `${header}\n${rows.join('\n')}\n`);

    const output = execFileSync(
      'node',
      [
        'scripts/data/build-source-gap-owner-chat-intake-pack.mjs',
        '--chat-queue',
        chatQueuePath,
        '--out',
        outDir,
        '--batch-size',
        '2',
        '--json',
        '--no-write',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as {
      summary: {
        batchCount: number;
        packetCount: number;
        questionCount: number;
        sourceCount: number;
        byPriority: Record<string, number>;
        byOwnerLane: Record<string, number>;
        boundaries: Record<string, boolean>;
      };
      manifest: {
        outputs: Record<string, { rowCount: number; headers: string[] }>;
      };
      sampleBatches: Array<{ batch_id: string; priority_mix: string; packet_count: number; question_count: number }>;
      samplePackets: Array<{ batch_id: string; packet_id: string; answer_status: string; merge_target: string }>;
      sampleQuestions: Array<{ packet_id: string; question_id: string; response_key: string; required_for_manual_review: string }>;
    };

    expect(result.summary.batchCount).toBe(2);
    expect(result.summary.packetCount).toBe(3);
    expect(result.summary.questionCount).toBe(18);
    expect(result.summary.sourceCount).toBe(4);
    expect(result.summary.byPriority.P0).toBe(1);
    expect(result.summary.byPriority.P1).toBe(1);
    expect(result.summary.byPriority.P2).toBe(1);
    expect(result.summary.byOwnerLane.amazon_connector_owner).toBe(1);
    expect(result.summary.boundaries.providerCalls).toBe(false);
    expect(result.summary.boundaries.restrictedConnectorAccess).toBe(false);
    expect(result.summary.boundaries.productionWrites).toBe(false);
    expect(result.summary.boundaries.factPromotion).toBe(false);
    expect(result.summary.boundaries.sourceRegistryWrites).toBe(false);
    expect(result.summary.boundaries.pageWrites).toBe(false);
    expect(result.summary.boundaries.csvFactExport).toBe(false);
    expect(result.summary.boundaries.answerMerge).toBe(false);
    expect(result.manifest.outputs['owner_chat_intake_questions.csv']).toMatchObject({ rowCount: 18 });
    expect(result.manifest.outputs['owner_chat_answer_template.json'].headers).toEqual(['answerBatches']);
    expect(result.sampleBatches[0]).toMatchObject({
      batch_id: 'owner-chat-batch-01-p0',
      packet_count: 2,
      question_count: 12,
    });
    expect(result.sampleBatches[0].priority_mix).toContain('P0:1');
    expect(result.samplePackets.every((packet) => packet.answer_status === 'awaiting_chat_owner_answer')).toBe(true);
    expect(result.samplePackets.every((packet) => packet.merge_target === 'owner_intake_questionnaire.csv')).toBe(true);
    expect(result.sampleQuestions.map((question) => question.question_id)).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']);
    expect(result.sampleQuestions.every((question) => question.required_for_manual_review === 'yes')).toBe(true);
    expect(result.sampleQuestions[0].response_key).toBe('p0-connector-owner-01.Q1');
    expect(existsSync(outDir)).toBe(false);
    expect(output).not.toMatch(FORBIDDEN_ERP_SCRIPT_OUTPUT_RE);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('merges owner chat answers into intake CSVs while keeping release gates closed', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-source-gap-owner-chat-merge-'));
    const intakeDir = join(tempDir, 'intake');
    const chatPackDir = join(tempDir, 'chat-pack');
    const answersPath = join(tempDir, 'answers.json');
    const outDir = join(tempDir, 'out');
    const evidenceHash = 'b'.repeat(64);
    mkdirSync(intakeDir, { recursive: true });
    mkdirSync(chatPackDir, { recursive: true });

    const questionHeader =
      'packet_id,question_id,owner_lane,source_ids,question,expected_answer_format,required_for_promotion,answer_status,owner_answer,evidence_uri_or_path,evidence_hash,answered_by,answered_at,validation_note';
    const questionRows = [
      'p0-owner-01,Q1,amazon_connector_owner,ds-a,Who owns this source packet?,owner_alias / owner_role,yes,missing,,,,,,Owner answer and evidence are required.',
      'p0-owner-01,Q2,amazon_connector_owner,ds-a,Where is the evidence file?,path or URI / sha256,yes,missing,,,,,,Owner answer and evidence are required.',
      'p1-owner-01,Q1,business_owner_manual_review,ds-b,Who owns this source packet?,owner_alias / owner_role,yes,missing,,,,,,Owner answer and evidence are required.',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_questionnaire.csv'), `${questionHeader}\n${questionRows.join('\n')}\n`);

    const packetHeader =
      'packet_id,priority,owner_lane,source_count,source_ids,pages,collection_methods,current_max_evidence_grade,target_min_evidence_grade,required_artifact_fields,acceptance_gate,forbidden_claims,intake_status,submitted_owner_answers,required_owner_answers,ready_for_registry_binding,ready_for_fact_display,ready_for_csv_export';
    const packetRows = [
      'p0-owner-01,P0,amazon_connector_owner,1,ds-a,CompetitionPage,connector-required,L0-unverified,L3-production-read-only,artifact_id|owner_alias|evidence_file_path|evidence_hash,Owner provides authorized read-only snapshot,Do not promote without manual review,awaiting_owner_submission,0,2,false,false,false',
      'p1-owner-01,P1,business_owner_manual_review,1,ds-b,ConsumerInterviews,manual-required,L0-unverified,L1-public-or-runtime,artifact_id|owner_alias|evidence_file_path|evidence_hash,Business owner provides signed review artifact,Do not promote without manual review,awaiting_owner_submission,0,1,false,false,false',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_packet_queue.csv'), `${packetHeader}\n${packetRows.join('\n')}\n`);

    const releaseHeader =
      'release_gate_id,packet_id,owner_lane,priority,source_ids,required_question_count,submitted_question_count,submitted_evidence_count,missing_required_questions,gate_status,can_write_source_registry,can_update_page_display,can_export_as_fact_csv,blocking_reason,next_command_after_owner_submission';
    const releaseRows = [
      'owner-intake-gate:p0-owner-01,p0-owner-01,amazon_connector_owner,P0,ds-a,2,0,0,2,blocked_owner_submission_required,false,false,false,owner answers required,future validation batch only',
      'owner-intake-gate:p1-owner-01,p1-owner-01,business_owner_manual_review,P1,ds-b,1,0,0,1,blocked_owner_submission_required,false,false,false,owner answers required,future validation batch only',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_release_gate.csv'), `${releaseHeader}\n${releaseRows.join('\n')}\n`);

    const sourceHeader =
      'source_id,priority,module,page,metric,collection_method,evidence_grade,verification_status,owner_lane,packet_id,packet_dir,current_display_state,can_display_as_fact_current,intake_status,promotion_state,owner_answer_required,evidence_required,next_action,blocking_reason';
    const sourceRows = [
      'ds-a,P0,看竞争,CompetitionPage,竞品概览,connector-required,L0-unverified,needs-review,amazon_connector_owner,p0-owner-01,tmp/audits/packets,display_as_gate_only,false,awaiting_owner_submission,blocked_until_owner_evidence_validated,yes,yes,Create connector readiness record,authorized-connector-or-private-snapshot-required',
      'ds-b,P1,看用户,ConsumerInterviews,访谈样本,manual-required,L0-unverified,needs-review,business_owner_manual_review,p1-owner-01,tmp/audits/packets,display_as_gate_only,false,awaiting_owner_submission,blocked_until_owner_evidence_validated,yes,yes,Create manual review artifact,manual-evidence-artifact-required',
    ];
    writeFileSync(join(intakeDir, 'owner_intake_source_matrix.csv'), `${sourceHeader}\n${sourceRows.join('\n')}\n`);

    const chatPacketHeader =
      'batch_id,packet_id,priority,owner_lane,source_ids,pages,missing_source_ids,suggested_question_batch,blocking_reason,question_count,answer_status,merge_target';
    const chatPacketRows = [
      'owner-chat-batch-01-p0,p0-owner-01,P0,amazon_connector_owner,ds-a,CompetitionPage,ds-a,Q1-Q2,source-level evidence artifact is missing,2,awaiting_chat_owner_answer,owner_intake_questionnaire.csv',
    ];
    writeFileSync(join(chatPackDir, 'owner_chat_intake_packets.csv'), `${chatPacketHeader}\n${chatPacketRows.join('\n')}\n`);

    const chatQuestionHeader =
      'batch_id,packet_id,question_id,priority,owner_lane,source_ids,pages,prompt,expected_answer_format,response_key,required_for_manual_review';
    const chatQuestionRows = [
      'owner-chat-batch-01-p0,p0-owner-01,Q1,P0,amazon_connector_owner,ds-a,CompetitionPage,Confirm owner,owner_alias / owner_role,p0-owner-01.Q1,yes',
      'owner-chat-batch-01-p0,p0-owner-01,Q2,P0,amazon_connector_owner,ds-a,CompetitionPage,Confirm source,source_system / scope,p0-owner-01.Q2,yes',
    ];
    writeFileSync(join(chatPackDir, 'owner_chat_intake_questions.csv'), `${chatQuestionHeader}\n${chatQuestionRows.join('\n')}\n`);

    writeFileSync(
      answersPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          batchId: 'owner-chat-batch-01-p0',
          answeredBy: 'pray',
          answeredAt: '2026-06-30',
          packets: [
            {
              packet_id: 'p0-owner-01',
              evidence_uri_or_path: 'tmp/audits/evidence/p0-owner-01.json',
              evidence_hash: evidenceHash,
              answers: {
                Q1: 'pray / market data owner / connector-readiness packet scope only',
                Q2: '2026-06-01..2026-06-30 / authorized read-only snapshot / CompetitionPage scope',
              },
            },
          ],
        },
        null,
        2,
      )}\n`,
    );

    const output = execFileSync(
      'node',
      [
        'scripts/data/merge-source-gap-owner-chat-answers.mjs',
        '--intake',
        intakeDir,
        '--chat-pack',
        chatPackDir,
        '--answers',
        answersPath,
        '--out',
        outDir,
        '--batch-id',
        'owner-chat-batch-01-p0',
        '--json',
        '--no-write',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as {
      summary: {
        packetCount: number;
        questionCount: number;
        answerPacketCount: number;
        selectedQuestionCount: number;
        mergedQuestionCount: number;
        missingQuestionCount: number;
        needsUpdateQuestionCount: number;
        readyCandidatePacketCount: number;
        boundaries: Record<string, boolean>;
      };
      sampleMergedQuestions: Array<{
        packet_id: string;
        question_id: string;
        answer_status: string;
        evidence_hash: string;
        answered_by: string;
      }>;
      samplePacketQueue: Array<{
        packet_id: string;
        intake_status: string;
        submitted_owner_answers: number;
        ready_for_fact_display: string;
        ready_for_csv_export: string;
      }>;
    };

    expect(result.summary.packetCount).toBe(1);
    expect(result.summary.questionCount).toBe(2);
    expect(result.summary.answerPacketCount).toBe(1);
    expect(result.summary.selectedQuestionCount).toBe(2);
    expect(result.summary.mergedQuestionCount).toBe(2);
    expect(result.summary.missingQuestionCount).toBe(0);
    expect(result.summary.needsUpdateQuestionCount).toBe(0);
    expect(result.summary.readyCandidatePacketCount).toBe(1);
    expect(result.summary.boundaries.providerCalls).toBe(false);
    expect(result.summary.boundaries.productionWrites).toBe(false);
    expect(result.summary.boundaries.factPromotion).toBe(false);
    expect(result.summary.boundaries.sourceRegistryWrites).toBe(false);
    expect(result.summary.boundaries.pageWrites).toBe(false);
    expect(result.summary.boundaries.csvFactExport).toBe(false);
    expect(result.sampleMergedQuestions).toHaveLength(2);
    expect(result.sampleMergedQuestions.every((question) => question.answer_status === 'answered')).toBe(true);
    expect(result.sampleMergedQuestions.every((question) => question.evidence_hash === evidenceHash)).toBe(true);
    expect(result.sampleMergedQuestions.every((question) => question.answered_by === 'pray')).toBe(true);
    expect(result.samplePacketQueue[0]).toMatchObject({
      packet_id: 'p0-owner-01',
      intake_status: 'chat_answers_merged_pending_validator',
      submitted_owner_answers: 2,
      ready_for_fact_display: 'false',
      ready_for_csv_export: 'false',
    });
    expect(existsSync(outDir)).toBe(false);
    expect(output).not.toMatch(FORBIDDEN_ERP_SCRIPT_OUTPUT_RE);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('keeps shared connector readiness helpers fail-closed and secret-aware', () => {
    const output = execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        [
          "import { buildCheck, configuredPathSource, findForbiddenKeys, isIsoDate, numberValue, stringArray } from './scripts/data/lib/connector-readiness.mjs';",
          "const check = buildCheck('authorizationRecord', 'Authorization exists', false, { configured: false }, { type: 'missing-readiness-record' });",
          "const forbiddenKeys = findForbiddenKeys({ readiness: { clientSecret: 'redacted', nested: { reviewText: 'redacted' }, safeField: 'ok' } }, [/secret/i, /^reviewText$/i]);",
          "const result = { check, forbiddenKeys, cliSource: configuredPathSource({ explicitPath: 'private.json', envPath: 'ignored', envName: 'IGNORED' }), envSource: configuredPathSource({ explicitPath: undefined, envPath: 'private.json', envName: 'MKT53_PRIVATE' }), invalidNumberIsNaN: Number.isNaN(numberValue('10')), dateValid: isIsoDate('2026-06-14'), filtered: stringArray(['ds-001', 42, 'ds-002']) };",
          'process.stdout.write(JSON.stringify(result));',
        ].join(''),
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as {
      check: { status: string; blockers: Array<{ type: string }> };
      forbiddenKeys: string[];
      cliSource: string;
      envSource: string;
      invalidNumberIsNaN: boolean;
      dateValid: boolean;
      filtered: string[];
    };

    expect(output).not.toContain('redacted');
    expect(result.check).toMatchObject({
      status: 'blocked',
      blockers: [expect.objectContaining({ type: 'missing-readiness-record' })],
    });
    expect(result.forbiddenKeys).toEqual(['readiness.clientSecret', 'readiness.nested.reviewText']);
    expect(result.cliSource).toBe('cli');
    expect(result.envSource).toBe('env:MKT53_PRIVATE');
    expect(result.invalidNumberIsNaN).toBe(true);
    expect(result.dateValid).toBe(true);
    expect(result.filtered).toEqual(['ds-001', 'ds-002']);
  });

  it('audits data management and source registry consistency without network access', () => {
    const output = execFileSync('node', ['scripts/data/audit-consistency.mjs', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const audit = JSON.parse(output) as {
      summary: {
        tableCount: number;
        sourceRegistryCount: number;
        tableGovernanceCount: number;
        pagesWithStaticDataWithoutRegistry: number;
        issueCount: number;
        criticalIssueCount: number;
        collectionMethods: Record<string, number>;
      };
    };

    expect(audit.summary.tableCount).toBe(107);
    expect(audit.summary.sourceRegistryCount).toBe(53);
    expect(audit.summary.tableGovernanceCount).toBe(107);
    expect(audit.summary.pagesWithStaticDataWithoutRegistry).toBe(0);
    expect(audit.summary.issueCount).toBe(0);
    expect(audit.summary.criticalIssueCount).toBe(0);
    expect(audit.summary.collectionMethods['local-file-check']).toBe(3);
    expect(audit.summary.collectionMethods['connector-required']).toBeGreaterThan(0);
    expect(audit.summary.collectionMethods['public-url-check']).toBeGreaterThan(0);
  });

  it('deep-audits visible data claims without provider calls or production writes', () => {
    const output = execFileSync('node', ['scripts/data/audit-deep.mjs', '--summary-json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const audit = JSON.parse(output) as {
      boundaries: {
        productionWrites: boolean;
        providerCalls: boolean;
        publicEvidenceLiveCapture: boolean;
        restrictedConnectorAccess: boolean;
      };
      summary: {
        pageCount: number;
        tableCount: number;
        sourceRegistryCount: number;
        claimCount: number;
        csvExportClaimCount: number;
        highRiskClaimCount: number;
        unsupportedClaimCount: number;
        sourceGapCount: number;
        issueCounts: Record<string, number>;
      };
      highRiskClaimSamples: Array<{ risk: string; issue_code: string; source_coverage: string }>;
      sourceGapMatrix: Array<{ source_id: string; can_display_as_fact: boolean; recommended_collection_lane: string }>;
    };

    expect(audit.boundaries).toMatchObject({
      productionWrites: false,
      providerCalls: false,
      publicEvidenceLiveCapture: false,
      restrictedConnectorAccess: false,
    });
    expect(audit.summary.pageCount).toBe(43);
    expect(audit.summary.tableCount).toBe(107);
    expect(audit.summary.sourceRegistryCount).toBe(53);
    expect(audit.summary.claimCount).toBeGreaterThan(0);
    expect(audit.summary.csvExportClaimCount).toBeGreaterThan(0);
    expect(audit.summary.highRiskClaimCount).toBe(0);
    expect(audit.summary.unsupportedClaimCount).toBe(0);
    expect(audit.summary.sourceGapCount).toBeGreaterThan(0);
    expect(audit.summary.issueCounts['no-displayable-source-evidence'] ?? 0).toBe(0);
    expect(audit.summary.issueCounts['gated-source-disclosure'] ?? 0).toBe(0);
    expect(audit.summary.issueCounts['claim-is-explicit-gated-disclosure'] ?? 0).toBeGreaterThan(0);
    expect(audit.highRiskClaimSamples).toHaveLength(0);
    expect(audit.sourceGapMatrix.some((source) => !source.can_display_as_fact)).toBe(true);
    expect(audit.sourceGapMatrix.some((source) => source.recommended_collection_lane === 'connector-readiness-or-authorized-private-snapshot')).toBe(true);
  }, 30_000);

  it('builds a connector backlog without claiming restricted sources were collected', () => {
    const output = execFileSync('node', ['scripts/data/collect-weekly-sources.mjs', '--json', '--no-network'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const manifest = JSON.parse(output) as {
      connectorBacklog: {
        total: number;
        groupCount: number;
        groups: Array<{ connectorId: string; sourceCount: number; sourceIds: string[] }>;
        items: Array<{ id: string; connectorId: string; blockedReason: string }>;
      };
      totals: Record<string, number>;
    };

    expect(manifest.connectorBacklog.total).toBe(28);
    expect(manifest.connectorBacklog.groupCount).toBeGreaterThanOrEqual(8);
    expect(manifest.connectorBacklog.groups.find((group) => group.connectorId === 'amazon-commerce')?.sourceCount).toBeGreaterThan(0);
    expect(manifest.connectorBacklog.groups.find((group) => group.connectorId === 'review-nlp')?.sourceIds).toEqual(
      expect.arrayContaining(['ds-021', 'ds-030', 'ds-032', 'ds-033']),
    );
    expect(manifest.connectorBacklog.groups.find((group) => group.connectorId === 'review-nlp')?.sourceIds).not.toContain('ds-006');
    expect(manifest.connectorBacklog.groups.find((group) => group.connectorId === 'trade-import')?.sourceIds).toEqual(['ds-006']);
    expect(manifest.connectorBacklog.items.every((item) => item.blockedReason.includes('不得伪造'))).toBe(true);
    expect(manifest.connectorBacklog.groups.find((group) => group.connectorId === 'internal-erp')?.sourceIds).toEqual(
      expect.arrayContaining(['ds-035', 'ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']),
    );
    expect(manifest.totals['connector-required']).toBe(28);
  });

  it('builds a source task queue for connector, manual, and public review work', () => {
    const output = execFileSync('node', ['scripts/data/collect-weekly-sources.mjs', '--json', '--no-network'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const manifest = JSON.parse(output) as {
      sourceTaskQueue: {
        total: number;
        queueTypeCounts: Record<string, number>;
        priorityCounts: Record<string, number>;
        ownerTeamCounts: Record<string, number>;
        tasks: Array<{
          taskId: string;
          sourceId: string;
          queueType: string;
          requiredEvidence: string[];
          acceptanceCriteria: string[];
        }>;
      };
    };

    expect(manifest.sourceTaskQueue.total).toBe(41);
    expect(manifest.sourceTaskQueue.queueTypeCounts['connector-readiness']).toBe(28);
    expect(manifest.sourceTaskQueue.queueTypeCounts['manual-evidence']).toBe(9);
    expect(manifest.sourceTaskQueue.queueTypeCounts['public-source-review']).toBe(4);
    expect(manifest.sourceTaskQueue.priorityCounts.P0).toBeGreaterThan(0);
    expect(manifest.sourceTaskQueue.ownerTeamCounts['market-research']).toBeGreaterThan(0);
    expect(manifest.sourceTaskQueue.tasks.some((task) => task.taskId === 'manual-evidence:ds-003')).toBe(false);
    expect(manifest.sourceTaskQueue.tasks.some((task) => task.taskId === 'public-source-review:ds-016')).toBe(false);
    expect(manifest.sourceTaskQueue.tasks.some((task) => task.taskId === 'public-source-review:ds-017')).toBe(false);
    expect(manifest.sourceTaskQueue.tasks.some((task) => task.taskId === 'public-source-review:ds-034')).toBe(false);
    expect(manifest.sourceTaskQueue.tasks.some((task) => task.taskId === 'public-source-review:ds-036')).toBe(false);
    expect(manifest.sourceTaskQueue.tasks.some((task) => task.taskId === 'manual-evidence:ds-025')).toBe(false);
    expect(manifest.sourceTaskQueue.tasks.some((task) => task.taskId === 'public-source-review:ds-002')).toBe(false);
    expect(manifest.sourceTaskQueue.tasks.some((task) => task.taskId === 'manual-evidence:ds-002')).toBe(true);
    expect(manifest.sourceTaskQueue.tasks.some((task) => task.taskId === 'manual-evidence:ds-044')).toBe(true);
    expect(manifest.sourceTaskQueue.tasks.some((task) => task.taskId === 'manual-evidence:ds-045')).toBe(true);
    expect(manifest.sourceTaskQueue.tasks.every((task) => task.requiredEvidence.length > 0)).toBe(true);
    expect(manifest.sourceTaskQueue.tasks.every((task) => task.acceptanceCriteria.join(' ').includes('不得'))).toBe(true);
  });

  it('adds public review tasks for current public collection issues even when registry rows are verified', async () => {
    const { buildSourceTaskQueue } = (await import('../../scripts/data/lib/source-tasks.mjs')) as {
      buildSourceTaskQueue: (sourceRegistry: unknown[], options: Record<string, unknown>) => {
        total: number;
        queueTypeCounts: Record<string, number>;
        tasks: Array<{ taskId: string; sourceId: string; blockedReason: string }>;
      };
    };
    const taskQueue = buildSourceTaskQueue(
      [
        {
          id: 'ds-044',
          module: '看市场',
          page: 'MarketPage',
          metric: '全球婴童用品上层TAM',
          sourceName: 'Grand View Research',
          sourceType: '行业报告',
          reliability: 'A',
          verificationStatus: 'verified',
          sourceUrl: 'https://www.grandviewresearch.com/industry-analysis/baby-products-market',
          gap: '',
          action: 'OK',
        },
        {
          id: 'ds-045',
          module: '看市场',
          page: 'MarketPage',
          metric: '穿戴式吸奶器细分TAM',
          sourceName: 'Fortune Business Insights',
          sourceType: '行业报告',
          reliability: 'A',
          verificationStatus: 'verified',
          sourceUrl: 'https://www.fortunebusinessinsights.com/wearable-breast-pumps-market-112880',
          gap: '',
          action: 'OK',
        },
      ],
      {
        generatedAt: '2026-07-01T00:00:00.000Z',
        connectorBacklog: { items: [] },
        sourceResults: [
          {
            id: 'ds-044',
            method: 'public-url-check',
            status: 'source-error',
            httpStatus: 403,
            note: '公开来源返回非 2xx，需要人工确认链接或供应商权限。',
          },
          {
            id: 'ds-045',
            method: 'public-url-check',
            status: 'ok',
            httpStatus: 200,
          },
        ],
      },
    );

    expect(taskQueue.total).toBe(1);
    expect(taskQueue.queueTypeCounts['public-source-review']).toBe(1);
    expect(taskQueue.tasks.some((task) => task.taskId === 'public-source-review:ds-044')).toBe(true);
    expect(taskQueue.tasks.some((task) => task.taskId === 'public-source-review:ds-045')).toBe(false);
    expect(taskQueue.tasks[0].blockedReason).toContain('HTTP 403');
  });

  it('plans browser-assisted public evidence capture without network or business writes', () => {
    const output = execFileSync('node', ['scripts/data/collect-public-evidence.mjs', '--json', '--dry-run'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const manifest = JSON.parse(output) as {
      mode: string;
      generatedRule: string;
      publicBundlePolicy: { rawTextIncluded: boolean; screenshotsIncluded: boolean };
      summary: {
        total: number;
        captureStatusCounts: Record<string, number>;
        networkCalls: number;
        businessDataWrites: number;
      };
      records: Array<{
        seedId: string;
        sourceId: string;
        url: string;
        captureStatus: string;
        notFullPlatformDataset: boolean;
        rawTextPublicBundleAllowed: boolean;
        screenshotPublicBundleAllowed: boolean;
        collectionBoundary: string;
        safety: { networkCalls: number; loginAttempted: boolean; bypassAttempted: boolean; businessDataWrites: number };
      }>;
    };

    expect(manifest.mode).toBe('dry-run');
    expect(manifest.generatedRule).toContain('does not log in');
    expect(manifest.publicBundlePolicy).toMatchObject({ rawTextIncluded: false, screenshotsIncluded: false });
    expect(manifest.summary.total).toBeGreaterThanOrEqual(10);
    expect(manifest.summary.captureStatusCounts.planned).toBe(manifest.summary.total);
    expect(manifest.summary.networkCalls).toBe(0);
    expect(manifest.summary.businessDataWrites).toBe(0);
    expect(manifest.records.some((record) => record.seedId.includes('amazon'))).toBe(true);
    expect(manifest.records.every((record) => record.url.startsWith('https://'))).toBe(true);
    expect(manifest.records.every((record) => record.notFullPlatformDataset === true)).toBe(true);
    expect(manifest.records.every((record) => record.rawTextPublicBundleAllowed === false)).toBe(true);
    expect(manifest.records.every((record) => record.screenshotPublicBundleAllowed === false)).toBe(true);
    expect(manifest.records.every((record) => record.collectionBoundary.length > 20)).toBe(true);
    expect(manifest.records.every((record) => record.safety.networkCalls === 0)).toBe(true);
    expect(manifest.records.every((record) => record.safety.loginAttempted === false)).toBe(true);
    expect(manifest.records.every((record) => record.safety.bypassAttempted === false)).toBe(true);
    expect(manifest.records.every((record) => record.safety.businessDataWrites === 0)).toBe(true);
  });

  it('adds semi-monthly period metadata without dropping weekly compatibility', async () => {
    const { semiMonthlyPeriod } = (await import('../../scripts/data/collect-weekly-sources.mjs')) as {
      semiMonthlyPeriod: (input: Date) => {
        periodType: string;
        period: string;
        windowStart: string;
        windowEnd: string;
        timezone: string;
        nextScheduledAt: string;
        scheduleCron: string;
      };
    };

    expect(semiMonthlyPeriod(new Date('2026-06-11T00:00:00.000Z'))).toMatchObject({
      periodType: 'semi-monthly',
      period: '2026-06-H1',
      windowStart: '2026-06-01',
      windowEnd: '2026-06-15',
      timezone: 'Asia/Shanghai',
      nextScheduledAt: '2026-06-16T09:00:00+08:00',
      scheduleCron: '0 9 1,16 * *',
    });
    expect(semiMonthlyPeriod(new Date('2026-06-16T01:00:00.000Z'))).toMatchObject({
      period: '2026-06-H2',
      windowStart: '2026-06-16',
      windowEnd: '2026-06-30',
      nextScheduledAt: '2026-07-01T09:00:00+08:00',
    });

    const output = execFileSync('node', ['scripts/data/collect-weekly-sources.mjs', '--json', '--no-network', '--cadence', 'semi-monthly'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const manifest = JSON.parse(output) as {
      refreshCadence: string;
      periodType: string;
      period: string;
      week: string;
      windowStart: string;
      windowEnd: string;
      nextScheduledAt: string;
      totals: Record<string, number>;
    };

    expect(manifest.refreshCadence).toBe('semi-monthly');
    expect(manifest.periodType).toBe('semi-monthly');
    expect(manifest.period).toMatch(/^\d{4}-\d{2}-H[12]$/);
    expect(manifest.week).toMatch(/^\d{4}-W\d{2}$/);
    expect(manifest.windowStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(manifest.windowEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(manifest.nextScheduledAt).toMatch(/^\d{4}-\d{2}-\d{2}T09:00:00\+08:00$/);
    expect(manifest.totals.total).toBe(53);
  });

  it('checks code asset sources from local files without external network access', () => {
    const output = execFileSync('node', ['scripts/data/collect-weekly-sources.mjs', '--json', '--no-network'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const manifest = JSON.parse(output) as {
      totals: Record<string, number>;
      sources: Array<{ id: string; method: string; status: string; localPath?: string; sampleHash?: string; fileSizeBytes?: number }>;
    };
    const codeAssets = manifest.sources.filter((source) => ['ds-027', 'ds-028'].includes(source.id));

    expect(codeAssets).toHaveLength(2);
    expect(codeAssets.every((source) => source.method === 'local-file-check')).toBe(true);
    expect(codeAssets.every((source) => source.status === 'ok')).toBe(true);
    expect(codeAssets.map((source) => source.localPath)).toEqual(expect.arrayContaining(['src/pages/DataManage.tsx', 'src/data/source-registry.ts']));
    expect(codeAssets.every((source) => typeof source.sampleHash === 'string' && source.sampleHash.length === 64)).toBe(true);
    expect(codeAssets.every((source) => Number(source.fileSizeBytes) > 0)).toBe(true);
    expect(manifest.totals.ok).toBeGreaterThanOrEqual(2);
  });

  it('falls back from transient ranged public URL failures before marking weekly sources as failed', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;

    globalThis.fetch = vi.fn(async () => {
      callCount += 1;
      if (callCount % 2 === 1) {
        throw new Error('temporary network timeout');
      }

      return new Response('fixture public source body', {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          etag: 'fixture-etag',
          'last-modified': 'Tue, 02 Jun 2026 00:00:00 GMT',
        },
      });
    }) as typeof fetch;

    try {
      const { collectWeeklySources } = (await import('../../scripts/data/collect-weekly-sources.mjs')) as {
        collectWeeklySources: (options: { appRoot: string; timeoutMs: number; maxAttempts: number; retryDelayMs: number }) => Promise<{
          collectionPolicy: { publicUrl: { maxAttempts: number; retryDelayMs: number } };
          sources: Array<{ method: string; status: string; checkAttemptCount?: number; statusStability?: string; attempts?: Array<{ status: string; retryable: boolean }> }>;
          totals: Record<string, number>;
        }>;
      };
      const manifest = await collectWeeklySources({
        appRoot: process.cwd(),
        timeoutMs: 100,
        maxAttempts: 2,
        retryDelayMs: 0,
      });
      const publicSources = manifest.sources.filter((source) => source.method === 'public-url-check');

      expect(manifest.collectionPolicy.publicUrl).toMatchObject({ maxAttempts: 2, retryDelayMs: 0 });
      expect(publicSources.length).toBeGreaterThan(0);
      expect(publicSources.every((source) => source.status === 'ok')).toBe(true);
      expect(publicSources.every((source) => source.checkAttemptCount === 1)).toBe(true);
      expect(publicSources.every((source) => source.statusStability === 'fresh-ok')).toBe(true);
      expect(publicSources.every((source) => source.attempts?.[0]?.status === 'ok' && source.attempts?.[0]?.retryable === false)).toBe(true);
      expect(manifest.totals['fetch-error'] ?? 0).toBe(0);
      expect(callCount).toBe(publicSources.length * 2);
    } finally {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    }
  });

  it('builds customs public adapter from public evidence without promoting shipment facts', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mkt53-customs-public-adapter-'));
    const evidencePath = join(tempDir, 'public-evidence-samples.json');

    try {
      writeFileSync(
        evidencePath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            mode: 'fixture',
            generatedAt: '2026-07-02T00:00:00.000Z',
            summary: {
              total: 2,
              networkCalls: 0,
              businessDataWrites: 0,
            },
            records: [
              {
                seedId: 'us-census-merchandise-imports-database',
                sourceId: 'ds-006',
                url: 'https://www.census.gov/foreign-trade/data/IMDB.html',
                evidenceClass: 'official-trade-data-page',
                captureStatus: 'captured',
                title: 'Merchandise Trade Imports',
                visibleTextHash: 'fixture-census-hash',
                matchedEvidenceTerms: ['Merchandise Trade Imports', 'HTSUSA'],
                missingEvidenceTerms: [],
                nonVerbatimSummary: 'fixture public source summary',
                localEvidence: { textArchivePath: 'tmp/public-evidence/text/us-census.txt' },
              },
              {
                seedId: 'cbp-electric-breast-pump-hts-ruling',
                sourceId: 'ds-006',
                url: 'https://rulings.cbp.gov/ruling/N021593',
                evidenceClass: 'official-customs-ruling-page',
                captureStatus: 'captured',
                title: 'CROSS Ruling',
                visibleTextHash: 'fixture-cbp-hash',
                matchedEvidenceTerms: ['electric breast pump', '8413.81.0040'],
                missingEvidenceTerms: [],
                nonVerbatimSummary: 'fixture classification summary',
                localEvidence: { textArchivePath: 'tmp/public-evidence/text/cbp.txt' },
              },
            ],
          },
          null,
          2,
        )}\n`,
      );

      const output = execFileSync(
        'node',
        ['scripts/data/connectors/customs-public-data-adapter.mjs', '--public-evidence', evidencePath, '--json', '--no-write'],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );
      const adapter = JSON.parse(output) as {
        status: string;
        sourceId: string;
        boundaries: { networkCalls: number; businessDataWrites: number; factPromotion: boolean; shipmentRowsIncluded: boolean };
        hsCodeCandidates: Array<{ code: string; reviewRequiredBeforeQuery: boolean }>;
        forbiddenClaimScopes: string[];
        evidenceRecords: Array<{ seedId: string; ready: boolean; visibleTextHash?: string }>;
        queryPlan: { status: string; candidateCommodityCodes: string[]; requiredOwnerInputs: string[] };
      };

      expect(adapter.status).toBe('ready-for-public-query-planning');
      expect(adapter.sourceId).toBe('ds-006');
      expect(adapter.boundaries).toMatchObject({
        networkCalls: 0,
        businessDataWrites: 0,
        factPromotion: false,
        shipmentRowsIncluded: false,
      });
      expect(adapter.hsCodeCandidates).toContainEqual(expect.objectContaining({ code: '8413.81.0040', reviewRequiredBeforeQuery: true }));
      expect(adapter.queryPlan).toMatchObject({
        status: 'ready-for-owner-query-parameter-review',
        candidateCommodityCodes: ['8413.81.0040'],
      });
      expect(adapter.queryPlan.requiredOwnerInputs).toEqual(expect.arrayContaining(['confirm final HS/HTS code list for Momcozy product scope']));
      expect(adapter.forbiddenClaimScopes).toEqual(expect.arrayContaining(['shipment-level facts', 'Import Genius replacement']));
      expect(adapter.evidenceRecords.every((record) => record.ready)).toBe(true);
      expect(adapter.evidenceRecords.map((record) => record.visibleTextHash)).toEqual(['fixture-census-hash', 'fixture-cbp-hash']);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('runs the Amazon commerce connector in blocked dry-run mode without leaking credentials', () => {
    const output = execFileSync('node', ['scripts/data/connectors/amazon-commerce-dry-run.mjs', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        AMAZON_SP_API_CLIENT_SECRET: 'SHOULD_NOT_LEAK_IN_DRY_RUN',
      },
    });
    const dryRun = JSON.parse(output) as {
      connectorId: string;
      mode: string;
      status: string;
      sourceCount: number;
      sourceIds: string[];
      safety: { networkCalls: number; businessDataWrites: number; credentialValuesRedacted: boolean };
      collectionWindow: { start: string; end: string };
      mapping: { missingSourceIds: string[] };
      blockers: Array<{ type: string; key?: string; sourceId?: string }>;
      snapshotContracts: Array<{ snapshotType: string; requiredFields: string[] }>;
    };

    expect(output).not.toContain('SHOULD_NOT_LEAK_IN_DRY_RUN');
    expect(dryRun.connectorId).toBe('amazon-commerce');
    expect(dryRun.mode).toBe('dry-run');
    expect(dryRun.status).toBe('blocked');
    expect(dryRun.sourceCount).toBe(7);
    expect(dryRun.sourceIds).toEqual(expect.arrayContaining(['ds-007', 'ds-009', 'ds-010', 'ds-019', 'ds-037', 'ds-038', 'ds-039']));
    expect(dryRun.safety.networkCalls).toBe(0);
    expect(dryRun.safety.businessDataWrites).toBe(0);
    expect(dryRun.safety.credentialValuesRedacted).toBe(true);
    expect(dryRun.collectionWindow).toMatchObject({ start: '2026-06-01', end: '2026-06-15' });
    expect(dryRun.mapping.missingSourceIds).toEqual(expect.arrayContaining(dryRun.sourceIds));
    expect(dryRun.blockers.some((item) => item.type === 'missing-credential')).toBe(true);
    expect(dryRun.blockers.some((item) => item.type === 'missing-asin-sku-mapping')).toBe(true);
    expect(dryRun.snapshotContracts.map((contract) => contract.snapshotType)).toEqual([
      'product_snapshot',
      'review_snapshot',
      'brand_share_snapshot',
      'category_rank_snapshot',
    ]);
  });

  it('runs the VOC NLP connector in blocked dry-run mode without reading review text or calling models', () => {
    const output = execFileSync('node', ['scripts/data/connectors/voc-nlp-dry-run.mjs', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        MKT53_VOC_NLP_API_SECRET: 'SHOULD_NOT_LEAK_IN_DRY_RUN',
      },
    });
    const dryRun = JSON.parse(output) as {
      connectorId: string;
      mode: string;
      status: string;
      sourceCount: number;
      sourceIds: string[];
      safety: { networkCalls: number; modelCalls: number; businessDataWrites: number; privateValuesRedacted: boolean };
      privateInput: { publicBundleAllowed: boolean; gitAllowed: boolean };
      blockers: Array<{ type: string }>;
      snapshotContracts: Array<{ snapshotType: string; requiredFields: string[] }>;
    };

    expect(output).not.toContain('SHOULD_NOT_LEAK_IN_DRY_RUN');
    expect(dryRun.connectorId).toBe('review-nlp');
    expect(dryRun.mode).toBe('dry-run');
    expect(dryRun.status).toBe('blocked');
    expect(dryRun.sourceCount).toBe(4);
    expect(dryRun.sourceIds).toEqual(expect.arrayContaining(['ds-021', 'ds-030', 'ds-032', 'ds-033']));
    expect(dryRun.safety).toMatchObject({
      networkCalls: 0,
      modelCalls: 0,
      businessDataWrites: 0,
      privateValuesRedacted: true,
    });
    expect(dryRun.privateInput).toMatchObject({ publicBundleAllowed: false, gitAllowed: false });
    expect(dryRun.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'missing-private-voc-nlp-readiness-record' }),
        expect.objectContaining({ type: 'missing-private-voc-sample-manifest' }),
        expect.objectContaining({ type: 'missing-model-evaluation-record' }),
        expect.objectContaining({ type: 'missing-human-review-agreement-record' }),
      ]),
    );
    expect(dryRun.snapshotContracts.map((contract) => contract.snapshotType)).toEqual([
      'review_sample_manifest',
      'sentiment_score_snapshot',
      'topic_cluster_snapshot',
      'human_review_sample',
    ]);
  });

  it('prints private VOC NLP readiness templates without credentials or business values', () => {
    const readinessOutput = execFileSync('node', ['scripts/data/connectors/voc-nlp-dry-run.mjs', '--print-readiness-template'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const sampleOutput = execFileSync('node', ['scripts/data/connectors/voc-nlp-dry-run.mjs', '--print-sample-manifest-template'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const readinessTemplate = JSON.parse(readinessOutput) as {
      privateData: boolean;
      publicBundleAllowed: boolean;
      gitAllowed: boolean;
      recommendedLocalPrivateReadinessPath: string;
      expectedSnapshotTypes: string[];
      readiness: { sourceIds: string[]; totalReviewSampleCount: number; containsRawReviewText: boolean };
    };
    const sampleTemplate = JSON.parse(sampleOutput) as {
      privateData: boolean;
      publicBundleAllowed: boolean;
      gitAllowed: boolean;
      sampleManifest: { sourceIds: string[]; containsRawReviewText: boolean; totalReviewSampleCount: number };
    };

    expect(`${readinessOutput}\n${sampleOutput}`).not.toMatch(/clientSecret|refreshToken|accessToken|password|privateKey|authorizationHeader/i);
    expect(readinessTemplate).toMatchObject({
      privateData: true,
      publicBundleAllowed: false,
      gitAllowed: false,
      recommendedLocalPrivateReadinessPath: 'configs/private/voc-nlp-readiness.json',
    });
    expect(readinessTemplate.expectedSnapshotTypes).toEqual([
      'review_sample_manifest',
      'sentiment_score_snapshot',
      'topic_cluster_snapshot',
      'human_review_sample',
    ]);
    expect(readinessTemplate.readiness.sourceIds).toEqual(['ds-021', 'ds-030', 'ds-032', 'ds-033']);
    expect(readinessTemplate.readiness.totalReviewSampleCount).toBe(0);
    expect(readinessTemplate.readiness.containsRawReviewText).toBe(false);
    expect(sampleTemplate).toMatchObject({
      privateData: true,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(sampleTemplate.sampleManifest.sourceIds).toEqual(readinessTemplate.readiness.sourceIds);
    expect(sampleTemplate.sampleManifest.totalReviewSampleCount).toBe(0);
    expect(sampleTemplate.sampleManifest.containsRawReviewText).toBe(false);
  });

  it('passes VOC NLP readiness only with private sample, model, human review, and compliance evidence', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/data/connectors/voc-nlp-dry-run.mjs',
        '--readiness-gate',
        '--readiness',
        'tests/fixtures/voc-nlp-readiness-valid.json',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          MKT53_VOC_NLP_API_SECRET: 'fixture-voc-secret',
        },
      },
    );
    const gate = JSON.parse(output) as {
      status: string;
      readinessPathSource: string;
      privateInput: { readinessPathConfigured: boolean; publicBundleAllowed: boolean; gitAllowed: boolean };
      thresholds: { minimumTotalReviewSampleCount: number; minimumLabeledSampleCount: number; minimumHumanAgreementValue: number };
      checks: Array<{ id: string; status: string; details: Record<string, unknown>; blockers: Array<{ type: string }> }>;
      blockers: Array<{ type: string }>;
      safety: { networkCalls: number; modelCalls: number; businessDataWrites: number };
    };

    expect(output).not.toContain('fixture-voc-secret');
    expect(gate.status).toBe('ready-for-authorized-voc-nlp-pipeline-implementation');
    expect(gate.readinessPathSource).toBe('cli');
    expect(gate.privateInput).toMatchObject({
      readinessPathConfigured: true,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(gate.thresholds).toMatchObject({
      minimumTotalReviewSampleCount: 1000,
      minimumLabeledSampleCount: 100,
      minimumHumanAgreementValue: 0.75,
    });
    expect(gate.checks.every((check) => check.status === 'ready')).toBe(true);
    expect(gate.checks.find((check) => check.id === 'sourceCoverage')?.details).toMatchObject({
      missingSourceIds: [],
    });
    expect(gate.checks.find((check) => check.id === 'sampleVolume')?.details).toMatchObject({
      totalReviewSampleCount: 1000,
      labeledSampleCount: 120,
      sourceSampleCountsCovered: true,
    });
    expect(gate.checks.find((check) => check.id === 'humanReview')?.details).toMatchObject({
      humanAgreementValue: 0.82,
    });
    expect(gate.checks.find((check) => check.id === 'privacyCompliance')?.details).toMatchObject({
      piiHandlingStatus: 'approved',
      complianceReviewStatus: 'approved',
      containsRawReviewText: false,
    });
    expect(gate.blockers).toHaveLength(0);
    expect(gate.safety).toMatchObject({ networkCalls: 0, modelCalls: 0, businessDataWrites: 0 });
  });

  it('runs the internal CRM connector in blocked dry-run mode without reading CRM rows', () => {
    const output = execFileSync('node', ['scripts/data/connectors/internal-crm-dry-run.mjs', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        MKT53_CRM_CONNECTION_SECRET: 'SHOULD_NOT_LEAK_IN_DRY_RUN',
      },
    });
    const dryRun = JSON.parse(output) as {
      connectorId: string;
      mode: string;
      status: string;
      sourceCount: number;
      sourceIds: string[];
      safety: { networkCalls: number; databaseReads: number; businessDataWrites: number; privateValuesRedacted: boolean };
      thresholds: { minimumAnonymizedCustomerRows: number; minimumSegmentCount: number; requiredSegments: string[] };
      privateInput: { publicBundleAllowed: boolean; gitAllowed: boolean };
      blockers: Array<{ type: string }>;
      snapshotContracts: Array<{ snapshotType: string; requiredFields: string[] }>;
    };

    expect(output).not.toContain('SHOULD_NOT_LEAK_IN_DRY_RUN');
    expect(dryRun.connectorId).toBe('internal-crm');
    expect(dryRun.mode).toBe('dry-run');
    expect(dryRun.status).toBe('blocked');
    expect(dryRun.sourceCount).toBe(1);
    expect(dryRun.sourceIds).toEqual(['ds-012']);
    expect(dryRun.safety).toMatchObject({
      networkCalls: 0,
      databaseReads: 0,
      businessDataWrites: 0,
      privateValuesRedacted: true,
    });
    expect(dryRun.thresholds).toMatchObject({
      minimumAnonymizedCustomerRows: 1000,
      minimumSegmentCount: 7,
    });
    expect(dryRun.thresholds.requiredSegments).toEqual([
      'champions',
      'loyal-customers',
      'potential-loyalists',
      'new-customers',
      'at-risk',
      'hibernating',
      'lost',
    ]);
    expect(dryRun.privateInput).toMatchObject({ publicBundleAllowed: false, gitAllowed: false });
    expect(dryRun.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'missing-private-crm-readiness-record' }),
        expect.objectContaining({ type: 'missing-private-crm-snapshot-manifest' }),
        expect.objectContaining({ type: 'missing-rfm-scoring-rule-version' }),
        expect.objectContaining({ type: 'missing-anonymization-approval' }),
      ]),
    );
    expect(dryRun.snapshotContracts.map((contract) => contract.snapshotType)).toEqual(['customer_rfm_snapshot', 'retention_segment_snapshot']);
  });

  it('prints private CRM readiness templates without credentials or customer identifiers', () => {
    const readinessOutput = execFileSync('node', ['scripts/data/connectors/internal-crm-dry-run.mjs', '--print-readiness-template'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const snapshotOutput = execFileSync('node', ['scripts/data/connectors/internal-crm-dry-run.mjs', '--print-snapshot-manifest-template'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const readinessTemplate = JSON.parse(readinessOutput) as {
      privateData: boolean;
      publicBundleAllowed: boolean;
      gitAllowed: boolean;
      expectedSnapshotTypes: string[];
      readiness: {
        sourceIds: string[];
        allowedExportFields: string[];
        anonymizedCustomerRowCount: number;
        containsRawPii: boolean;
      };
    };
    const snapshotTemplate = JSON.parse(snapshotOutput) as {
      privateData: boolean;
      publicBundleAllowed: boolean;
      gitAllowed: boolean;
      snapshotManifest: {
        sourceIds: string[];
        allowedExportFields: string[];
        anonymizedCustomerRowCount: number;
        containsRawPii: boolean;
      };
    };

    expect(`${readinessOutput}\n${snapshotOutput}`).not.toMatch(
      /clientSecret|refreshToken|accessToken|password|privateKey|authorizationHeader|connectionString|rawCustomerId|crmCustomerId|email|phone|address/i,
    );
    expect(readinessTemplate).toMatchObject({
      privateData: true,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(readinessTemplate.expectedSnapshotTypes).toEqual(['customer_rfm_snapshot', 'retention_segment_snapshot']);
    expect(readinessTemplate.readiness.sourceIds).toEqual(['ds-012']);
    expect(readinessTemplate.readiness.anonymizedCustomerRowCount).toBe(0);
    expect(readinessTemplate.readiness.containsRawPii).toBe(false);
    expect(readinessTemplate.readiness.allowedExportFields).toEqual(
      expect.arrayContaining(['anonymizedCustomerId', 'segment', 'recencyDays', 'frequency', 'monetaryUsd']),
    );
    expect(snapshotTemplate).toMatchObject({
      privateData: true,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(snapshotTemplate.snapshotManifest.sourceIds).toEqual(readinessTemplate.readiness.sourceIds);
    expect(snapshotTemplate.snapshotManifest.anonymizedCustomerRowCount).toBe(0);
    expect(snapshotTemplate.snapshotManifest.containsRawPii).toBe(false);
  });

  it('passes CRM readiness only with anonymized rows, RFM rules, owner review, and compliance evidence', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/data/connectors/internal-crm-dry-run.mjs',
        '--readiness-gate',
        '--readiness',
        'tests/fixtures/internal-crm-readiness-valid.json',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          MKT53_CRM_CONNECTION_SECRET: 'fixture-crm-secret',
        },
      },
    );
    const gate = JSON.parse(output) as {
      status: string;
      readinessPathSource: string;
      privateInput: { readinessPathConfigured: boolean; publicBundleAllowed: boolean; gitAllowed: boolean };
      thresholds: { minimumAnonymizedCustomerRows: number; minimumSegmentCount: number; requiredSegments: string[] };
      checks: Array<{ id: string; status: string; details: Record<string, unknown>; blockers: Array<{ type: string }> }>;
      blockers: Array<{ type: string }>;
      safety: { networkCalls: number; databaseReads: number; businessDataWrites: number };
    };

    expect(output).not.toContain('fixture-crm-secret');
    expect(gate.status).toBe('ready-for-authorized-crm-rfm-pipeline-implementation');
    expect(gate.readinessPathSource).toBe('cli');
    expect(gate.privateInput).toMatchObject({
      readinessPathConfigured: true,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(gate.thresholds).toMatchObject({
      minimumAnonymizedCustomerRows: 1000,
      minimumSegmentCount: 7,
    });
    expect(gate.checks.every((check) => check.status === 'ready')).toBe(true);
    expect(gate.checks.find((check) => check.id === 'sourceCoverage')?.details).toMatchObject({
      missingSourceIds: [],
    });
    expect(gate.checks.find((check) => check.id === 'snapshotVolume')?.details).toMatchObject({
      anonymizedCustomerRowCount: 1200,
      segmentCount: 7,
      segmentCountsCovered: true,
    });
    expect(gate.checks.find((check) => check.id === 'rfmDefinition')?.details).toMatchObject({
      rfmModelVersion: 'fixture-rfm-2026-06-h1',
      scoringRuleVersion: 'fixture-rfm-rules-v1',
      monetaryCurrency: 'USD',
    });
    expect(gate.checks.find((check) => check.id === 'privacyBoundary')?.details).toMatchObject({
      anonymizationStatus: 'approved',
      piiHandlingStatus: 'approved',
      containsRawPii: false,
      forbiddenKeys: [],
    });
    expect(gate.blockers).toHaveLength(0);
    expect(gate.safety).toMatchObject({ networkCalls: 0, databaseReads: 0, businessDataWrites: 0 });
  });

  it('runs the internal ERP connector in blocked dry-run mode without reading supply chain rows', () => {
    const output = execFileSync('node', ['scripts/data/connectors/internal-erp-dry-run.mjs', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        MKT53_ERP_CONNECTION_SECRET: 'SHOULD_NOT_LEAK_IN_DRY_RUN',
      },
    });
    const dryRun = JSON.parse(output) as {
      connectorId: string;
      mode: string;
      status: string;
      sourceCount: number;
      sourceIds: string[];
      safety: { networkCalls: number; databaseReads: number; businessDataWrites: number; privateValuesRedacted: boolean };
      thresholds: { minimumSkuCount: number; minimumSupplierCount: number; minimumWarehouseCount: number; minimumInventoryRecordCount: number };
      privateInput: { publicBundleAllowed: boolean; gitAllowed: boolean };
      blockers: Array<{ type: string }>;
      snapshotContracts: Array<{ snapshotType: string; requiredFields: string[] }>;
    };

    expect(output).not.toContain('SHOULD_NOT_LEAK_IN_DRY_RUN');
    expect(dryRun.connectorId).toBe('internal-erp');
    expect(dryRun.mode).toBe('dry-run');
    expect(dryRun.status).toBe('blocked');
    expect(dryRun.sourceCount).toBe(1);
    expect(dryRun.sourceIds).toEqual(['ds-035']);
    expect(dryRun.safety).toMatchObject({
      networkCalls: 0,
      databaseReads: 0,
      businessDataWrites: 0,
      privateValuesRedacted: true,
    });
    expect(dryRun.thresholds).toMatchObject({
      minimumSkuCount: 50,
      minimumSupplierCount: 5,
      minimumWarehouseCount: 2,
      minimumInventoryRecordCount: 50,
    });
    expect(dryRun.privateInput).toMatchObject({ publicBundleAllowed: false, gitAllowed: false });
    expect(dryRun.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'missing-private-erp-readiness-record' }),
        expect.objectContaining({ type: 'missing-private-erp-snapshot-manifest' }),
        expect.objectContaining({ type: 'missing-inventory-policy-version' }),
        expect.objectContaining({ type: 'missing-commercial-data-approval' }),
      ]),
    );
    expect(dryRun.snapshotContracts.map((contract) => contract.snapshotType)).toEqual([
      'inventory_snapshot',
      'supplier_master_snapshot',
      'supply_cost_snapshot',
    ]);
  });

  it('derives gated ERP Batch 2 facts without publishing raw business identifiers', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-derived-batch2.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        rawSkuIncluded: boolean;
        rawProductNameIncluded: boolean;
        rawCustomerIncluded: boolean;
        rawOperatorIncluded: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        salesMonthlyFactRows: number;
        afterSalesMonthlyFactRows: number;
        retailMonthlyFactRows: number;
        skuHashRows: number;
        categoryMappingRows: number;
        combinedCategoryMonthlyRows: number;
        breastPumpProxySkuRows: number;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器/);
    expect(manifest.batchId).toBe('erp-derived-batch2-20260625');
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      rawSkuIncluded: false,
      rawProductNameIncluded: false,
      rawCustomerIncluded: false,
      rawOperatorIncluded: false,
    });
    expect(manifest.outputs['erp_product_sku_dim.csv'].headers).toEqual(
      expect.arrayContaining(['sku_hash', 'product_name_hash', 'category_proxy', 'can_display_as_fact']),
    );
    expect(manifest.outputs['erp_category_mapping.csv'].headers).toEqual(
      expect.arrayContaining(['category_proxy', 'source_keyword_rule', 'source_ids', 'review_status']),
    );
    expect(manifest.outputs['erp_category_monthly_proxy.csv'].headers).toEqual(
      expect.arrayContaining(['internal_mix_proxy_pct', 'source_ids', 'note']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.salesMonthlyFactRows).toBe(12);
    expect(manifest.summary.afterSalesMonthlyFactRows).toBe(12);
    expect(manifest.summary.retailMonthlyFactRows).toBe(12);
    expect(manifest.summary.skuHashRows).toBeGreaterThan(0);
    expect(manifest.summary.categoryMappingRows).toBeGreaterThan(0);
    expect(manifest.summary.combinedCategoryMonthlyRows).toBe(12);
    expect(manifest.summary.breastPumpProxySkuRows).toBeGreaterThan(0);
  });

  it('derives gated ERP Batch 3 channel and inventory readiness without raw business identifiers', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-derived-batch3.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        rawSkuIncluded: boolean;
        rawProductNameIncluded: boolean;
        rawCustomerIncluded: boolean;
        rawWarehouseIncluded: boolean;
        rawOperatorIncluded: boolean;
        inventoryValuesIncluded: boolean;
        pseudonymizedNotAnonymized: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        growthSnapshotRows: number;
        targetAttainmentRows: number;
        channelCustomerHashRows: number;
        destinationMonthlyRows: number;
        inventoryReadinessRows: number;
        topChannelCustomerVisibleProxyUnits: number;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器/);
    expect(manifest.batchId).toBe('erp-derived-batch3-20260625');
    expect(manifest.sourceIds).toEqual(['ds-035', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      rawSkuIncluded: false,
      rawProductNameIncluded: false,
      rawCustomerIncluded: false,
      rawWarehouseIncluded: false,
      rawOperatorIncluded: false,
      inventoryValuesIncluded: false,
      pseudonymizedNotAnonymized: true,
    });
    expect(manifest.outputs['erp_channel_growth_snapshot.csv'].headers).toEqual(
      expect.arrayContaining(['actual_sales_cny', 'sales_growth_pct', 'source_id', 'can_display_as_fact']),
    );
    expect(manifest.outputs['erp_channel_target_attainment.csv'].headers).toEqual(
      expect.arrayContaining(['sales_attainment_pct', 'units_attainment_pct', 'target_sales_cny', 'can_display_as_fact']),
    );
    expect(manifest.outputs['erp_channel_customer_dim.csv'].headers).toEqual(
      expect.arrayContaining(['channel_customer_hash', 'destination_warehouse_hash', 'operator_hash', 'visible_proxy_units']),
    );
    expect(manifest.outputs['erp_inventory_snapshot_readiness.csv'].headers).toEqual(
      expect.arrayContaining(['field_name', 'readiness_status', 'source_id', 'can_display_as_fact']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.growthSnapshotRows).toBe(1);
    expect(manifest.summary.targetAttainmentRows).toBe(1);
    expect(manifest.summary.channelCustomerHashRows).toBeGreaterThan(0);
    expect(manifest.summary.destinationMonthlyRows).toBeGreaterThan(0);
    expect(manifest.summary.inventoryReadinessRows).toBe(10);
    expect(manifest.summary.topChannelCustomerVisibleProxyUnits).toBeGreaterThan(0);
  });

  it('derives gated ERP Batch 7 field dictionary, category review, and display gates without raw business values', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-governance-batch7.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        fieldNamesIncluded: boolean;
        displayApprovalGranted: boolean;
        categoryApprovalGranted: boolean;
        subtotalBehaviorApproved: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        fieldDictionaryRows: number;
        categoryReviewRows: number;
        subtotalReconciliationRows: number;
        displayApprovalRows: number;
        blockedRows: number;
        p0CategoryReviewRows: number;
        unresolvedSubtotalRows: number;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(manifest.batchId).toBe('erp-governance-batch7-20260625');
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      fieldNamesIncluded: true,
      displayApprovalGranted: false,
      categoryApprovalGranted: false,
      subtotalBehaviorApproved: false,
      exportEnabled: false,
    });
    expect(manifest.outputs['erp_field_dictionary_readiness.csv'].headers).toEqual(
      expect.arrayContaining(['source_id', 'field_name', 'unit', 'hidden_column_behavior', 'dictionary_status']),
    );
    expect(manifest.outputs['erp_category_review_queue.csv'].headers).toEqual(
      expect.arrayContaining(['review_task_id', 'category_proxy', 'priority', 'approval_status']),
    );
    expect(manifest.outputs['erp_subtotal_reconciliation_queue.csv'].headers).toEqual(
      expect.arrayContaining(['reconciliation_id', 'observed_delta_units', 'reconciliation_status']),
    );
    expect(manifest.outputs['erp_display_approval_gate.csv'].headers).toEqual(
      expect.arrayContaining(['approval_gate_id', 'forbidden_display', 'can_export', 'can_display_as_fact']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.fieldDictionaryRows).toBe(61);
    expect(manifest.summary.categoryReviewRows).toBe(5);
    expect(manifest.summary.subtotalReconciliationRows).toBe(4);
    expect(manifest.summary.displayApprovalRows).toBe(9);
    expect(manifest.summary.blockedRows).toBe(79);
    expect(manifest.summary.p0CategoryReviewRows).toBe(3);
    expect(manifest.summary.unresolvedSubtotalRows).toBe(2);
  });

  it('derives ERP Batch 8 owner approval packets without promoting any approval state', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-approval-batch8.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      upstreamBatch: { batchId: string; blockedRows: number };
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        approvalRecordsApplied: number;
        approvalsGranted: boolean;
        fieldDictionaryApproved: boolean;
        categoryApprovalGranted: boolean;
        subtotalBehaviorApproved: boolean;
        displayApprovalGranted: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        fieldOwnerPackets: number;
        categoryOwnerPackets: number;
        subtotalOwnerPackets: number;
        displayApprovalTemplates: number;
        approvalBacklogRows: number;
        p0ApprovalRows: number;
        p1ApprovalRows: number;
        approvalRecordsApplied: number;
        readyToDisplayRows: number;
        remainingBlockedRows: number;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(manifest.batchId).toBe('erp-owner-approval-batch8-20260625');
    expect(manifest.upstreamBatch).toMatchObject({ batchId: 'erp-governance-batch7-20260625', blockedRows: 79 });
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      approvalRecordsApplied: 0,
      approvalsGranted: false,
      fieldDictionaryApproved: false,
      categoryApprovalGranted: false,
      subtotalBehaviorApproved: false,
      displayApprovalGranted: false,
      exportEnabled: false,
    });
    expect(manifest.outputs['erp_field_owner_approval_packet.csv'].headers).toEqual(
      expect.arrayContaining(['approval_packet_id', 'owner_role', 'editable_decision_fields', 'approval_status']),
    );
    expect(manifest.outputs['erp_category_owner_approval_packet.csv'].headers).toEqual(
      expect.arrayContaining(['required_decision', 'editable_decision_fields', 'approval_status']),
    );
    expect(manifest.outputs['erp_subtotal_owner_explanation_packet.csv'].headers).toEqual(
      expect.arrayContaining(['observed_delta_units', 'editable_decision_fields', 'approval_status']),
    );
    expect(manifest.outputs['erp_display_approval_record_template.csv'].headers).toEqual(
      expect.arrayContaining(['approval_decision', 'approver_name_hash', 'approval_record_uri', 'record_status']),
    );
    expect(manifest.outputs['erp_owner_approval_backlog.csv'].headers).toEqual(
      expect.arrayContaining(['approval_lane', 'required_evidence', 'editable_packet', 'can_display_as_fact']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.fieldOwnerPackets).toBe(5);
    expect(manifest.summary.categoryOwnerPackets).toBe(5);
    expect(manifest.summary.subtotalOwnerPackets).toBe(4);
    expect(manifest.summary.displayApprovalTemplates).toBe(9);
    expect(manifest.summary.approvalBacklogRows).toBe(23);
    expect(manifest.summary.p0ApprovalRows).toBe(9);
    expect(manifest.summary.p1ApprovalRows).toBe(14);
    expect(manifest.summary.approvalRecordsApplied).toBe(0);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.remainingBlockedRows).toBe(23);
  });

  it('validates ERP Batch 9 owner approval intake in fail-closed mode when no approval records are supplied', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-approval-intake-batch9.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      upstreamBatch: { batchId: string; approvalBacklogRows: number };
      approvalRecordsInput: { provided: boolean; rowCount: number };
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        approvalRecordsApplied: number;
        approvalsFabricated: boolean;
        automaticPromotionApplied: boolean;
        fieldDictionaryApproved: boolean;
        categoryApprovalGranted: boolean;
        subtotalBehaviorApproved: boolean;
        displayApprovalGranted: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        intakeContractRows: number;
        approvalBacklogRows: number;
        approvalRecordsInputRows: number;
        validationRows: number;
        passedValidationRows: number;
        blockedValidationRows: number;
        releaseGateRows: number;
        readyReleaseGateRows: number;
        promotionCandidateRows: number;
        readyToDisplayRows: number;
        readyToExportRows: number;
        validationPassed: boolean;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(manifest.batchId).toBe('erp-owner-approval-intake-batch9-20260626');
    expect(manifest.upstreamBatch).toMatchObject({ batchId: 'erp-owner-approval-batch8-20260625', approvalBacklogRows: 23 });
    expect(manifest.approvalRecordsInput).toMatchObject({ provided: false, rowCount: 0 });
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      fieldDictionaryApproved: false,
      categoryApprovalGranted: false,
      subtotalBehaviorApproved: false,
      displayApprovalGranted: false,
      exportEnabled: false,
    });
    expect(manifest.outputs['erp_owner_approval_intake_contract.csv'].headers).toEqual(
      expect.arrayContaining(['approval_lane', 'required_fields', 'decision_vocab', 'fail_closed_rule']),
    );
    expect(manifest.outputs['erp_owner_approval_validation_result.csv'].headers).toEqual(
      expect.arrayContaining(['approval_record_present', 'validation_status', 'validation_messages', 'can_promote']),
    );
    expect(manifest.outputs['erp_owner_approval_release_gate.csv'].headers).toEqual(
      expect.arrayContaining(['release_status', 'passed_validation_rows', 'required_next_step']),
    );
    expect(manifest.outputs['erp_owner_approval_promotion_manifest.csv'].headers).toEqual(
      expect.arrayContaining(['promotion_candidate_id', 'promotion_status', 'can_display_as_fact']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.intakeContractRows).toBe(4);
    expect(manifest.summary.approvalBacklogRows).toBe(23);
    expect(manifest.summary.approvalRecordsInputRows).toBe(0);
    expect(manifest.summary.validationRows).toBe(23);
    expect(manifest.summary.passedValidationRows).toBe(0);
    expect(manifest.summary.blockedValidationRows).toBe(23);
    expect(manifest.summary.releaseGateRows).toBe(9);
    expect(manifest.summary.readyReleaseGateRows).toBe(0);
    expect(manifest.summary.promotionCandidateRows).toBe(0);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.readyToExportRows).toBe(0);
    expect(manifest.summary.validationPassed).toBe(false);
  });

  it('builds ERP Batch 10 owner approval record templates without applying approvals', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-approval-record-template-batch10.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      upstreamBatches: Array<{ batchId: string; approvalBacklogRows?: number; validationRows?: number; blockedValidationRows?: number }>;
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        approvalRecordsApplied: number;
        approvalsFabricated: boolean;
        automaticPromotionApplied: boolean;
        ownerRecordTemplateOnly: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        ownerPacketIndexRows: number;
        approvalRecordTemplateRows: number;
        requiredEvidenceRows: number;
        submissionReadinessRows: number;
        prefilledApprovalItemIds: number;
        blankDecisionRows: number;
        submittedOwnerRecords: number;
        readyToValidateRows: number;
        readyToDisplayRows: number;
        readyToExportRows: number;
        validationPassed: boolean;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(manifest.batchId).toBe('erp-owner-approval-record-template-batch10-20260626');
    expect(manifest.upstreamBatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchId: 'erp-owner-approval-batch8-20260625', approvalBacklogRows: 23 }),
        expect.objectContaining({ batchId: 'erp-owner-approval-intake-batch9-20260626', validationRows: 23, blockedValidationRows: 0 }),
      ]),
    );
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerRecordTemplateOnly: true,
      exportEnabled: false,
    });
    expect(manifest.outputs['erp_owner_approval_owner_packet_index.csv'].headers).toEqual(
      expect.arrayContaining(['approval_lane', 'editable_packet', 'backlog_items', 'required_fields']),
    );
    expect(manifest.outputs['erp_owner_approval_record_input_template.csv'].headers).toEqual(
      expect.arrayContaining(['approval_item_id', 'approval_decision', 'approver_name_hash', 'approval_record_uri', 'next_validator_command']),
    );
    expect(manifest.outputs['erp_owner_approval_required_evidence_matrix.csv'].headers).toEqual(
      expect.arrayContaining(['required_evidence', 'acceptance_criteria', 'required_uri_scheme', 'forbidden_raw_values']),
    );
    expect(manifest.outputs['erp_owner_approval_submission_readiness.csv'].headers).toEqual(
      expect.arrayContaining(['required_owner_records', 'submitted_owner_records', 'missing_owner_records', 'current_release_status']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.ownerPacketIndexRows).toBe(4);
    expect(manifest.summary.approvalRecordTemplateRows).toBe(23);
    expect(manifest.summary.requiredEvidenceRows).toBe(23);
    expect(manifest.summary.submissionReadinessRows).toBe(9);
    expect(manifest.summary.prefilledApprovalItemIds).toBe(23);
    expect(manifest.summary.blankDecisionRows).toBe(23);
    expect(manifest.summary.submittedOwnerRecords).toBe(0);
    expect(manifest.summary.readyToValidateRows).toBe(0);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.readyToExportRows).toBe(0);
    expect(manifest.summary.validationPassed).toBe(false);
  });

  it('preflights ERP Batch 11 owner approval records before Batch9 handoff', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-approval-preflight-batch11.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      upstreamBatch: {
        batchId: string;
        approvalRecordTemplateRows: number;
        submittedOwnerRecords: number;
      };
      approvalRecordsInput: {
        provided: boolean;
        path: string;
        rowCount: number;
      };
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        approvalRecordsApplied: number;
        approvalsFabricated: boolean;
        automaticPromotionApplied: boolean;
        ownerRecordPreflightOnly: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        preflightRulebookRows: number;
        approvalRecordRows: number;
        preflightRows: number;
        readyForBatch9Rows: number;
        blockedPreflightRows: number;
        forbiddenScanRows: number;
        forbiddenHitRows: number;
        releasePreflightRows: number;
        batch9HandoffRows: number;
        readyToDisplayRows: number;
        readyToExportRows: number;
        validationPassed: boolean;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(output).not.toMatch(/password|client_secret|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i);
    expect(manifest.batchId).toBe('erp-owner-approval-preflight-batch11-20260626');
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.upstreamBatch).toMatchObject({
      batchId: 'erp-owner-approval-record-template-batch10-20260626',
      approvalRecordTemplateRows: 23,
      submittedOwnerRecords: 0,
    });
    expect(manifest.approvalRecordsInput).toEqual({
      provided: false,
      path: 'tmp/exports/erp-owner-approval-record-template-batch10-20260626/erp_owner_approval_record_input_template.csv',
      rowCount: 23,
    });
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerRecordPreflightOnly: true,
      exportEnabled: false,
    });
    expect(manifest.outputs['erp_owner_approval_preflight_rulebook.csv'].headers).toEqual(
      expect.arrayContaining(['rule_id', 'required_condition', 'failure_status']),
    );
    expect(manifest.outputs['erp_owner_approval_preflight_result.csv'].headers).toEqual(
      expect.arrayContaining(['preflight_status', 'preflight_messages', 'ready_for_batch9_validator']),
    );
    expect(manifest.outputs['erp_owner_approval_forbidden_value_scan.csv'].headers).toEqual(
      expect.arrayContaining(['forbidden_pattern_hits', 'scan_status', 'redaction_action']),
    );
    expect(manifest.outputs['erp_owner_approval_batch9_handoff_queue.csv'].headers).toEqual(
      expect.arrayContaining(['handoff_status', 'batch9_validator_command']),
    );
    expect(manifest.outputs['erp_owner_approval_release_preflight_summary.csv'].headers).toEqual(
      expect.arrayContaining(['preflight_ready_rows', 'handoff_status']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.preflightRulebookRows).toBe(6);
    expect(manifest.summary.approvalRecordRows).toBe(23);
    expect(manifest.summary.preflightRows).toBe(23);
    expect(manifest.summary.readyForBatch9Rows).toBe(0);
    expect(manifest.summary.blockedPreflightRows).toBe(23);
    expect(manifest.summary.forbiddenScanRows).toBe(23);
    expect(manifest.summary.forbiddenHitRows).toBe(0);
    expect(manifest.summary.releasePreflightRows).toBe(9);
    expect(manifest.summary.batch9HandoffRows).toBe(0);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.readyToExportRows).toBe(0);
    expect(manifest.summary.validationPassed).toBe(false);
  });

  it('audits ERP Batch 12 owner submission intake before Batch11 preflight', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-submission-intake-batch12.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      upstreamBatches: Array<{ batchId: string; approvalRecordTemplateRows?: number; readyForBatch9Rows?: number; batch9HandoffRows?: number }>;
      submissionInput: {
        provided: boolean;
        path: string;
        directoryExists: boolean;
        csvFileCount: number;
      };
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        rawApprovalValuesEchoed: boolean;
        approvalRecordsApplied: number;
        approvalsFabricated: boolean;
        automaticPromotionApplied: boolean;
        ownerSubmissionIntakeOnly: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        inventoryRows: number;
        submissionCsvFiles: number;
        expectedApprovalRecords: number;
        submittedApprovalRecords: number;
        schemaAuditRows: number;
        schemaReadyRows: number;
        redactionAuditRows: number;
        forbiddenHitRows: number;
        batch11QueueRows: number;
        releaseReadinessRows: number;
        readyToDisplayRows: number;
        readyToExportRows: number;
        validationPassed: boolean;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(output).not.toMatch(/password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i);
    expect(manifest.batchId).toBe('erp-owner-submission-intake-batch12-20260626');
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.upstreamBatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchId: 'erp-owner-approval-record-template-batch10-20260626', approvalRecordTemplateRows: 23 }),
        expect.objectContaining({ batchId: 'erp-owner-approval-preflight-batch11-20260626', readyForBatch9Rows: 23, batch9HandoffRows: 1 }),
      ]),
    );
    expect(manifest.submissionInput).toEqual({
      provided: true,
      path: 'tmp/inputs/erp-owner-approval-submissions-batch12',
      directoryExists: true,
      csvFileCount: 1,
    });
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      rawApprovalValuesEchoed: false,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerSubmissionIntakeOnly: true,
      exportEnabled: false,
    });
    expect(manifest.outputs['erp_owner_submission_intake_inventory.csv'].headers).toEqual(
      expect.arrayContaining(['submission_dir', 'inventory_status', 'blocking_reason']),
    );
    expect(manifest.outputs['erp_owner_submission_schema_audit.csv'].headers).toEqual(
      expect.arrayContaining(['source_ids', 'missing_required_fields', 'schema_status', 'ready_for_batch11_preflight']),
    );
    expect(manifest.outputs['erp_owner_submission_redaction_audit.csv'].headers).toEqual(
      expect.arrayContaining(['forbidden_pattern_hits', 'redaction_status', 'redaction_action']),
    );
    expect(manifest.outputs['erp_owner_submission_batch11_queue.csv'].headers).toEqual(
      expect.arrayContaining(['approval_records_path', 'batch11_preflight_command', 'queue_status']),
    );
    expect(manifest.outputs['erp_owner_submission_release_readiness.csv'].headers).toEqual(
      expect.arrayContaining(['submitted_owner_records', 'schema_ready_records', 'batch11_queue_rows', 'readiness_status']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.inventoryRows).toBe(1);
    expect(manifest.summary.submissionCsvFiles).toBe(1);
    expect(manifest.summary.expectedApprovalRecords).toBe(23);
    expect(manifest.summary.submittedApprovalRecords).toBe(23);
    expect(manifest.summary.schemaAuditRows).toBe(23);
    expect(manifest.summary.schemaReadyRows).toBe(23);
    expect(manifest.summary.redactionAuditRows).toBe(23);
    expect(manifest.summary.forbiddenHitRows).toBe(0);
    expect(manifest.summary.batch11QueueRows).toBe(1);
    expect(manifest.summary.releaseReadinessRows).toBe(9);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.readyToExportRows).toBe(0);
    expect(manifest.summary.validationPassed).toBe(false);
  });

  it('builds ERP Batch 13 owner submission templates without creating approval records', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-submission-pack-batch13.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      upstreamBatches: Array<{ batchId: string; approvalRecordTemplateRows?: number; submissionCsvFiles?: number; batch11QueueRows?: number }>;
      templateOutput: {
        targetSubmissionDir: string;
        templateDir: string;
        templateFiles: Record<string, { path: string; rowCount: number; sha256: string; approvalLane: string }>;
      };
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        rawApprovalValuesEchoed: boolean;
        approvalRecordsApplied: number;
        approvalsFabricated: boolean;
        automaticPromotionApplied: boolean;
        ownerSubmissionPackOnly: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        packetIndexRows: number;
        templateManifestRows: number;
        templateFiles: number;
        combinedTemplateRows: number;
        laneTemplateRows: number;
        checklistRows: number;
        releasePacketRows: number;
        handoffGuideRows: number;
        readyForBatch12Rows: number;
        submittedApprovalRecords: number;
        readyToDisplayRows: number;
        readyToExportRows: number;
        validationPassed: boolean;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(output).not.toMatch(/password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i);
    expect(manifest.batchId).toBe('erp-owner-submission-pack-batch13-20260626');
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.upstreamBatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchId: 'erp-owner-approval-record-template-batch10-20260626', approvalRecordTemplateRows: 23 }),
        expect.objectContaining({ batchId: 'erp-owner-submission-intake-batch12-20260626', submissionCsvFiles: 1, batch11QueueRows: 1 }),
      ]),
    );
    expect(manifest.templateOutput).toMatchObject({
      targetSubmissionDir: 'tmp/inputs/erp-owner-approval-submissions-batch12',
      templateDir: 'tmp/exports/erp-owner-submission-pack-batch13-20260626/owner-submission-templates',
    });
    expect(manifest.templateOutput.templateFiles['combined_owner_submission_template.csv']).toMatchObject({ rowCount: 23, approvalLane: 'all_owner_lanes' });
    expect(manifest.templateOutput.templateFiles['category_owner_approval_submission_template.csv']).toMatchObject({ rowCount: 5 });
    expect(manifest.templateOutput.templateFiles['display_approval_record_submission_template.csv']).toMatchObject({ rowCount: 9 });
    expect(manifest.templateOutput.templateFiles['field_dictionary_owner_approval_submission_template.csv']).toMatchObject({ rowCount: 5 });
    expect(manifest.templateOutput.templateFiles['subtotal_behavior_owner_approval_submission_template.csv']).toMatchObject({ rowCount: 4 });
    expect(Object.values(manifest.templateOutput.templateFiles).every((template) => template.sha256.length === 64)).toBe(true);
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      rawApprovalValuesEchoed: false,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerSubmissionPackOnly: true,
      exportEnabled: false,
    });
    expect(manifest.outputs['erp_owner_submission_packet_index.csv'].headers).toEqual(
      expect.arrayContaining(['packet_id', 'template_file', 'target_submission_dir', 'next_batch12_command']),
    );
    expect(manifest.outputs['erp_owner_submission_template_manifest.csv'].headers).toEqual(
      expect.arrayContaining(['template_id', 'template_file', 'editable_fields', 'sha256']),
    );
    expect(manifest.outputs['erp_owner_submission_field_completion_checklist.csv'].headers).toEqual(
      expect.arrayContaining(['approval_item_id', 'blank_fields_to_complete', 'required_uri_scheme', 'owner_action']),
    );
    expect(manifest.outputs['erp_owner_submission_release_packet_matrix.csv'].headers).toEqual(
      expect.arrayContaining(['release_gate_id', 'submission_template_file', 'target_submission_dir', 'next_batch12_command']),
    );
    expect(manifest.outputs['erp_owner_submission_handoff_guide.csv'].headers).toEqual(
      expect.arrayContaining(['step_id', 'step_order', 'next_command', 'current_status']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.packetIndexRows).toBe(5);
    expect(manifest.summary.templateManifestRows).toBe(5);
    expect(manifest.summary.templateFiles).toBe(5);
    expect(manifest.summary.combinedTemplateRows).toBe(23);
    expect(manifest.summary.laneTemplateRows).toBe(23);
    expect(manifest.summary.checklistRows).toBe(23);
    expect(manifest.summary.releasePacketRows).toBe(9);
    expect(manifest.summary.handoffGuideRows).toBe(5);
    expect(manifest.summary.readyForBatch12Rows).toBe(0);
    expect(manifest.summary.submittedApprovalRecords).toBe(0);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.readyToExportRows).toBe(0);
    expect(manifest.summary.validationPassed).toBe(false);
  });

  it('tracks ERP Batch 14 owner submission dropbox without reading approval CSV contents', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-submission-dropbox-watchlist-batch14.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      upstreamBatches: Array<{ batchId: string; templateFiles?: number; checklistRows?: number; submissionCsvFiles?: number; batch11QueueRows?: number }>;
      dropboxInput: {
        targetSubmissionDir: string;
        directoryExists: boolean;
        csvFileCount: number;
        csvFileNameHashes: string[];
        rawCsvContentsRead: boolean;
        inputDirectoryCreated: boolean;
      };
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        inputDirectoryCreated: boolean;
        rawCsvContentsRead: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        rawApprovalValuesEchoed: boolean;
        approvalRecordsApplied: number;
        approvalsFabricated: boolean;
        automaticPromotionApplied: boolean;
        ownerSubmissionWatchlistOnly: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        dropboxStatusRows: number;
        ownerActionRows: number;
        templateDistributionRows: number;
        releaseWatchlistRows: number;
        commandRunbookRows: number;
        batch13TemplateFiles: number;
        batch13ChecklistRows: number;
        batch13HandoffRows: number;
        submissionCsvFiles: number;
        submittedApprovalRecords: number;
        readyForBatch12Rows: number;
        batch11QueueRows: number;
        readyToDisplayRows: number;
        readyToExportRows: number;
        validationPassed: boolean;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(output).not.toMatch(/password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i);
    expect(manifest.batchId).toBe('erp-owner-submission-dropbox-watchlist-batch14-20260627');
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.upstreamBatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchId: 'erp-owner-submission-pack-batch13-20260626', templateFiles: 5, checklistRows: 23 }),
        expect.objectContaining({ batchId: 'erp-owner-submission-intake-batch12-20260626', submissionCsvFiles: 1, batch11QueueRows: 1 }),
      ]),
    );
    expect(manifest.dropboxInput).toMatchObject({
      targetSubmissionDir: 'tmp/inputs/erp-owner-approval-submissions-batch12',
      directoryExists: true,
      csvFileCount: 1,
      rawCsvContentsRead: false,
      inputDirectoryCreated: false,
    });
    expect(manifest.dropboxInput.csvFileNameHashes).toHaveLength(1);
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      inputDirectoryCreated: false,
      rawCsvContentsRead: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      rawApprovalValuesEchoed: false,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerSubmissionWatchlistOnly: true,
      exportEnabled: false,
    });
    expect(manifest.outputs['erp_owner_submission_dropbox_status.csv'].headers).toEqual(
      expect.arrayContaining(['target_submission_dir', 'directory_exists', 'csv_file_count', 'current_status']),
    );
    expect(manifest.outputs['erp_owner_submission_owner_action_queue.csv'].headers).toEqual(
      expect.arrayContaining(['approval_item_id', 'template_file', 'blank_fields_to_complete', 'next_batch12_command']),
    );
    expect(manifest.outputs['erp_owner_submission_template_distribution.csv'].headers).toEqual(
      expect.arrayContaining(['template_id', 'template_file', 'sha256', 'distribution_status']),
    );
    expect(manifest.outputs['erp_owner_submission_release_watchlist.csv'].headers).toEqual(
      expect.arrayContaining(['release_gate_id', 'submitted_owner_records', 'ready_for_batch12_rows', 'batch11_queue_rows']),
    );
    expect(manifest.outputs['erp_owner_submission_command_runbook.csv'].headers).toEqual(
      expect.arrayContaining(['step_id', 'step_order', 'command', 'prerequisite', 'current_status']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.dropboxStatusRows).toBe(1);
    expect(manifest.summary.ownerActionRows).toBe(23);
    expect(manifest.summary.templateDistributionRows).toBe(5);
    expect(manifest.summary.releaseWatchlistRows).toBe(9);
    expect(manifest.summary.commandRunbookRows).toBe(5);
    expect(manifest.summary.batch13TemplateFiles).toBe(5);
    expect(manifest.summary.batch13ChecklistRows).toBe(23);
    expect(manifest.summary.batch13HandoffRows).toBe(5);
    expect(manifest.summary.submissionCsvFiles).toBe(1);
    expect(manifest.summary.submittedApprovalRecords).toBe(0);
    expect(manifest.summary.readyForBatch12Rows).toBe(0);
    expect(manifest.summary.batch11QueueRows).toBe(1);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.readyToExportRows).toBe(0);
    expect(manifest.summary.validationPassed).toBe(false);
  });

  it('gates ERP Batch 15 owner submission acceptance before Batch12 promotion', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-submission-acceptance-gate-batch15.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      upstreamBatches: Array<{ batchId: string; submissionCsvFiles?: number; ownerActionRows?: number; templateFiles?: number; checklistRows?: number }>;
      acceptanceInput: {
        targetSubmissionDir: string;
        submissionCsvFiles: number;
        rawCsvContentsRead: boolean;
        inputDirectoryCreated: boolean;
        commandRunbookRows: number;
      };
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        inputDirectoryCreated: boolean;
        rawCsvContentsRead: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        rawApprovalValuesEchoed: boolean;
        approvalRecordsApplied: number;
        approvalsFabricated: boolean;
        automaticPromotionApplied: boolean;
        ownerSubmissionAcceptanceOnly: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        acceptanceRulebookRows: number;
        acceptanceResultRows: number;
        evidenceUriContractRows: number;
        releaseAcceptanceRows: number;
        escalationRows: number;
        ownerActionRows: number;
        submissionCsvFiles: number;
        submittedApprovalRecords: number;
        acceptedOwnerRecords: number;
        readyForBatch12Rows: number;
        batch11QueueRows: number;
        readyToDisplayRows: number;
        readyToExportRows: number;
        validationPassed: boolean;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(output).not.toMatch(/password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i);
    expect(manifest.batchId).toBe('erp-owner-submission-acceptance-gate-batch15-20260627');
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L3-production-read-only');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.upstreamBatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchId: 'erp-owner-submission-dropbox-watchlist-batch14-20260627', submissionCsvFiles: 0, ownerActionRows: 23 }),
        expect.objectContaining({ batchId: 'erp-owner-submission-pack-batch13-20260626', templateFiles: 5, checklistRows: 23 }),
      ]),
    );
    expect(manifest.acceptanceInput).toEqual({
      targetSubmissionDir: 'tmp/inputs/erp-owner-approval-submissions-batch12',
      submissionCsvFiles: 0,
      rawCsvContentsRead: false,
      inputDirectoryCreated: false,
      commandRunbookRows: 5,
    });
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      inputDirectoryCreated: false,
      rawCsvContentsRead: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      rawApprovalValuesEchoed: false,
      approvalRecordsApplied: 0,
      approvalsFabricated: false,
      automaticPromotionApplied: false,
      ownerSubmissionAcceptanceOnly: true,
      exportEnabled: false,
    });
    expect(manifest.outputs['erp_owner_submission_acceptance_rulebook.csv'].headers).toEqual(
      expect.arrayContaining(['rule_id', 'required_condition', 'acceptance_status', 'next_check']),
    );
    expect(manifest.outputs['erp_owner_submission_acceptance_result.csv'].headers).toEqual(
      expect.arrayContaining(['approval_item_id', 'acceptance_status', 'missing_acceptance_inputs', 'next_batch12_command']),
    );
    expect(manifest.outputs['erp_owner_submission_evidence_uri_contract.csv'].headers).toEqual(
      expect.arrayContaining(['approval_lane', 'required_uri_scheme', 'forbidden_values_policy', 'current_status']),
    );
    expect(manifest.outputs['erp_owner_submission_release_acceptance_matrix.csv'].headers).toEqual(
      expect.arrayContaining(['release_gate_id', 'accepted_owner_records', 'ready_for_batch12_rows', 'acceptance_status']),
    );
    expect(manifest.outputs['erp_owner_submission_escalation_queue.csv'].headers).toEqual(
      expect.arrayContaining(['approval_item_id', 'escalation_status', 'next_command']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.acceptanceRulebookRows).toBe(6);
    expect(manifest.summary.acceptanceResultRows).toBe(23);
    expect(manifest.summary.evidenceUriContractRows).toBe(4);
    expect(manifest.summary.releaseAcceptanceRows).toBe(9);
    expect(manifest.summary.escalationRows).toBe(23);
    expect(manifest.summary.ownerActionRows).toBe(23);
    expect(manifest.summary.submissionCsvFiles).toBe(0);
    expect(manifest.summary.submittedApprovalRecords).toBe(0);
    expect(manifest.summary.acceptedOwnerRecords).toBe(0);
    expect(manifest.summary.readyForBatch12Rows).toBe(0);
    expect(manifest.summary.batch11QueueRows).toBe(0);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.readyToExportRows).toBe(0);
    expect(manifest.summary.validationPassed).toBe(false);
  });

  it('generates ERP Batch 16 synthetic owner submission fixture without promoting facts', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-submission-synthetic-fixture-batch16.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      blockingReason: string;
      dryRun: boolean;
      upstreamBatches: Array<{ batchId: string; approvalRecordTemplateRows?: number; acceptanceResultRows?: number; acceptedOwnerRecords?: number }>;
      syntheticInput: { directory: string; recordFile: string; rowCount: number; sha256: string };
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        writesSyntheticInputDir: boolean;
        writesRealBatch12InputDir: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        realApprovalRecordsApplied: number;
        realApprovalsFabricated: boolean;
        syntheticApprovalRecordsGenerated: number;
        automaticPromotionApplied: boolean;
        syntheticOwnerRecordsOnly: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        syntheticRecordRows: number;
        fixtureCsvFiles: number;
        fixtureIndexRows: number;
        recordFillAuditRows: number;
        gatePlanRows: number;
        readyForSyntheticBatch12DryRun: boolean;
        readyForSyntheticBatch11DryRun: boolean;
        readyForSyntheticBatch9DryRun: boolean;
        realApprovalRecordsApplied: number;
        readyToDisplayRows: number;
        readyToExportRows: number;
        validationPassed: boolean;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(output).not.toMatch(/password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i);
    expect(manifest.batchId).toBe('erp-owner-submission-synthetic-fixture-batch16-20260627');
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L2-fixture-or-dry-run');
    expect(manifest.privacyLevel).toBe('synthetic/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.blockingReason).toBe('synthetic-fixture-not-owner-approval');
    expect(manifest.dryRun).toBe(true);
    expect(manifest.upstreamBatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchId: 'erp-owner-approval-record-template-batch10-20260626', approvalRecordTemplateRows: 23 }),
        expect.objectContaining({ batchId: 'erp-owner-submission-acceptance-gate-batch15-20260627', acceptanceResultRows: 23, acceptedOwnerRecords: 0 }),
      ]),
    );
    expect(manifest.syntheticInput).toMatchObject({
      directory: 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic',
      recordFile: 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic/synthetic_owner_approval_records_batch16.csv',
      rowCount: 23,
    });
    expect(manifest.syntheticInput.sha256).toHaveLength(64);
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      writesSyntheticInputDir: true,
      writesRealBatch12InputDir: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      realApprovalRecordsApplied: 0,
      realApprovalsFabricated: false,
      syntheticApprovalRecordsGenerated: 23,
      automaticPromotionApplied: false,
      syntheticOwnerRecordsOnly: true,
      exportEnabled: false,
    });
    expect(manifest.outputs['synthetic_owner_approval_records_batch16.csv'].headers).toEqual(
      expect.arrayContaining(['approval_item_id', 'approval_decision', 'approver_name_hash', 'approval_record_uri', 'can_display_as_fact_decision', 'evidence_grade']),
    );
    expect(manifest.outputs['erp_owner_submission_synthetic_fixture_index.csv'].headers).toEqual(
      expect.arrayContaining(['synthetic_input_dir', 'record_file_path', 'fixture_scope', 'can_display_as_fact']),
    );
    expect(manifest.outputs['erp_owner_submission_synthetic_record_fill_audit.csv'].headers).toEqual(
      expect.arrayContaining(['approval_item_id', 'approver_hash_present', 'synthetic_marker', 'can_display_as_fact']),
    );
    expect(manifest.outputs['erp_owner_submission_synthetic_gate_plan.csv'].headers).toEqual(
      expect.arrayContaining(['gate', 'command', 'expected_synthetic_result', 'can_write_real_gate']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.syntheticRecordRows).toBe(23);
    expect(manifest.summary.fixtureCsvFiles).toBe(1);
    expect(manifest.summary.fixtureIndexRows).toBe(1);
    expect(manifest.summary.recordFillAuditRows).toBe(23);
    expect(manifest.summary.gatePlanRows).toBe(4);
    expect(manifest.summary.readyForSyntheticBatch12DryRun).toBe(true);
    expect(manifest.summary.readyForSyntheticBatch11DryRun).toBe(true);
    expect(manifest.summary.readyForSyntheticBatch9DryRun).toBe(true);
    expect(manifest.summary.realApprovalRecordsApplied).toBe(0);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.readyToExportRows).toBe(0);
    expect(manifest.summary.validationPassed).toBe(false);
  });

  it('rehearses ERP Batch 17 synthetic owner submission pipeline with fixture evidence only', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-submission-synthetic-pipeline-batch17.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      blockingReason: string;
      dryRun: boolean;
      upstreamBatches: Array<{ batchId: string; evidenceGrade?: string; fixtureMode?: boolean; syntheticRecordRows?: number }>;
      syntheticInput: { directory: string; recordFile: string; rowCount: number; sha256: string; runtimePathIsTemporary: boolean };
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        childRunsNoWrite: boolean;
        fixtureMode: boolean;
        allChildEvidenceGradesL2: boolean;
        allChildFixtureModes: boolean;
        writesSyntheticInputDir: boolean;
        writesRealBatch12InputDir: boolean;
        rawBusinessValuesIncluded: boolean;
        rawSkuValuesIncluded: boolean;
        rawProductNameValuesIncluded: boolean;
        rawCustomerValuesIncluded: boolean;
        rawOperatorValuesIncluded: boolean;
        rawWarehouseValuesIncluded: boolean;
        realApprovalRecordsApplied: number;
        realApprovalsFabricated: boolean;
        syntheticApprovalRecordsGenerated: number;
        automaticPromotionApplied: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        syntheticRecordRows: number;
        pipelineStageRows: number;
        releaseGateRows: number;
        boundaryAuditRows: number;
        batch12SchemaReadyRows: number;
        batch12QueueRows: number;
        batch11ReadyRows: number;
        batch11HandoffRows: number;
        batch9PassedValidationRows: number;
        batch9ReadyReleaseGateRows: number;
        promotionCandidateRows: number;
        readyToDisplayRows: number;
        readyToExportRows: number;
        validationPassed: boolean;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(output).not.toMatch(/password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i);
    expect(manifest.batchId).toBe('erp-owner-submission-synthetic-pipeline-batch17-20260627');
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L2-fixture-or-dry-run');
    expect(manifest.privacyLevel).toBe('synthetic/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.blockingReason).toBe('synthetic-fixture-not-owner-approval');
    expect(manifest.dryRun).toBe(true);
    expect(manifest.upstreamBatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchId: 'erp-owner-submission-synthetic-fixture-batch16-20260627', syntheticRecordRows: 23 }),
        expect.objectContaining({ batchId: 'erp-owner-submission-intake-batch12-20260626', evidenceGrade: 'L2-fixture-or-dry-run', fixtureMode: true }),
        expect.objectContaining({ batchId: 'erp-owner-approval-preflight-batch11-20260626', evidenceGrade: 'L2-fixture-or-dry-run', fixtureMode: true }),
        expect.objectContaining({ batchId: 'erp-owner-approval-intake-batch9-20260626', evidenceGrade: 'L2-fixture-or-dry-run', fixtureMode: true }),
      ]),
    );
    expect(manifest.syntheticInput).toMatchObject({
      directory: 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic',
      recordFile: 'tmp/inputs/erp-owner-approval-submissions-batch12-synthetic/synthetic_owner_approval_records_batch16.csv',
      rowCount: 23,
      runtimePathIsTemporary: true,
    });
    expect(manifest.syntheticInput.sha256).toHaveLength(64);
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      childRunsNoWrite: true,
      fixtureMode: true,
      allChildEvidenceGradesL2: true,
      allChildFixtureModes: true,
      writesSyntheticInputDir: false,
      writesRealBatch12InputDir: false,
      rawBusinessValuesIncluded: false,
      rawSkuValuesIncluded: false,
      rawProductNameValuesIncluded: false,
      rawCustomerValuesIncluded: false,
      rawOperatorValuesIncluded: false,
      rawWarehouseValuesIncluded: false,
      realApprovalRecordsApplied: 0,
      realApprovalsFabricated: false,
      syntheticApprovalRecordsGenerated: 23,
      automaticPromotionApplied: false,
      exportEnabled: false,
    });
    expect(manifest.outputs['erp_owner_submission_synthetic_pipeline_run_matrix.csv']).toMatchObject({ rowCount: 5 });
    expect(manifest.outputs['erp_owner_submission_synthetic_release_gate_matrix.csv']).toMatchObject({ rowCount: 9 });
    expect(manifest.outputs['erp_owner_submission_synthetic_boundary_audit.csv']).toMatchObject({ rowCount: 4 });
    expect(manifest.outputs['erp_owner_submission_synthetic_pipeline_run_matrix.csv'].headers).toEqual(
      expect.arrayContaining(['stage_id', 'observed_evidence_grade', 'can_display_as_fact', 'can_export']),
    );
    expect(manifest.outputs['erp_owner_submission_synthetic_release_gate_matrix.csv'].headers).toEqual(
      expect.arrayContaining(['release_gate_id', 'synthetic_validation_status', 'ready_for_manual_review', 'can_export']),
    );
    expect(manifest.outputs['erp_owner_submission_synthetic_boundary_audit.csv'].headers).toEqual(
      expect.arrayContaining(['checked_item', 'expected_value', 'observed_value', 'boundary_status']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.syntheticRecordRows).toBe(23);
    expect(manifest.summary.pipelineStageRows).toBe(5);
    expect(manifest.summary.releaseGateRows).toBe(9);
    expect(manifest.summary.boundaryAuditRows).toBe(4);
    expect(manifest.summary.batch12SchemaReadyRows).toBe(23);
    expect(manifest.summary.batch12QueueRows).toBe(1);
    expect(manifest.summary.batch11ReadyRows).toBe(23);
    expect(manifest.summary.batch11HandoffRows).toBe(1);
    expect(manifest.summary.batch9PassedValidationRows).toBe(23);
    expect(manifest.summary.batch9ReadyReleaseGateRows).toBe(9);
    expect(manifest.summary.promotionCandidateRows).toBe(0);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.readyToExportRows).toBe(0);
    expect(manifest.summary.validationPassed).toBe(false);
  });

  it('builds ERP Batch 18 real owner submission checklist without creating approvals', () => {
    const output = runOptionalLocalErpArtifactScript(['scripts/data/build-erp-owner-submission-real-owner-checklist-batch18.mjs', '--json', '--no-write']);
    if (!output) return;
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      blockingReason: string;
      dryRun: boolean;
      targetSubmissionDir: string;
      syntheticReferenceDir: string;
      upstreamBatches: Array<{ batchId: string; approvalRecordTemplateRows?: number; acceptanceResultRows?: number; acceptedOwnerRecords?: number; pipelineStageRows?: number; allChildEvidenceGradesL2?: boolean }>;
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        writesRealBatch12InputDir: boolean;
        readsRealBatch12InputDir: boolean;
        writesSyntheticInputDir: boolean;
        realOwnerRecordsGenerated: number;
        realApprovalRecordsApplied: number;
        syntheticApprovalRecordsApplied: number;
        automaticPromotionApplied: boolean;
        exportEnabled: boolean;
        displayEnabled: boolean;
        manualReleaseReviewCompleted: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        fieldChecklistRows: number;
        releaseGateChecklistRows: number;
        swapRunbookRows: number;
        boundaryAuditRows: number;
        requiredApprovalLanes: number;
        requiredSourceIds: number;
        uriContractRows: number;
        syntheticPipelineRows: number;
        realOwnerRecordsAccepted: number;
        readyToRunBatch12Rows: number;
        readyToRunBatch11Rows: number;
        readyToRunBatch9Rows: number;
        readyToDisplayRows: number;
        readyToExportRows: number;
        validationPassed: boolean;
      };
    };

    expect(output).not.toMatch(/AS104-NA00NB|Aeroflow Breastpumps|叶钰铭|Momcozy可穿戴式吸奶器|SHOULD_NOT_LEAK/i);
    expect(output).not.toMatch(/password|client_secret|cookie|session_token|private_key|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/i);
    expect(manifest.batchId).toBe('erp-owner-submission-real-owner-checklist-batch18-20260627');
    expect(manifest.sourceIds).toEqual(['ds-047', 'ds-048', 'ds-049', 'ds-050', 'ds-051']);
    expect(manifest.evidenceGrade).toBe('L2-fixture-or-dry-run');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.blockingReason).toBe('real-owner-submission-required');
    expect(manifest.dryRun).toBe(true);
    expect(manifest.targetSubmissionDir).toBe('tmp/inputs/erp-owner-approval-submissions-batch12');
    expect(manifest.syntheticReferenceDir).toBe('tmp/inputs/erp-owner-approval-submissions-batch12-synthetic');
    expect(manifest.upstreamBatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchId: 'erp-owner-approval-record-template-batch10-20260626', approvalRecordTemplateRows: 23 }),
        expect.objectContaining({ batchId: 'erp-owner-submission-acceptance-gate-batch15-20260627', acceptanceResultRows: 23, acceptedOwnerRecords: 0 }),
        expect.objectContaining({ batchId: 'erp-owner-submission-synthetic-pipeline-batch17-20260627', pipelineStageRows: 5, allChildEvidenceGradesL2: true }),
      ]),
    );
    expect(manifest.boundaries).toMatchObject({
      networkCalls: 0,
      providerCalls: false,
      productionWrites: false,
      browserLogin: false,
      liveConnectorAccess: false,
      writesRealBatch12InputDir: false,
      readsRealBatch12InputDir: false,
      writesSyntheticInputDir: false,
      realOwnerRecordsGenerated: 0,
      realApprovalRecordsApplied: 0,
      syntheticApprovalRecordsApplied: 0,
      automaticPromotionApplied: false,
      exportEnabled: false,
      displayEnabled: false,
      manualReleaseReviewCompleted: false,
    });
    expect(manifest.outputs['erp_owner_real_submission_field_checklist.csv']).toMatchObject({ rowCount: 23 });
    expect(manifest.outputs['erp_owner_real_submission_release_gate_checklist.csv']).toMatchObject({ rowCount: 9 });
    expect(manifest.outputs['erp_owner_real_submission_swap_runbook.csv']).toMatchObject({ rowCount: 7 });
    expect(manifest.outputs['erp_owner_real_submission_boundary_audit.csv']).toMatchObject({ rowCount: 6 });
    expect(manifest.outputs['erp_owner_real_submission_field_checklist.csv'].headers).toEqual(
      expect.arrayContaining(['approval_item_id', 'required_fields', 'required_uri_scheme', 'real_owner_record_status']),
    );
    expect(manifest.outputs['erp_owner_real_submission_release_gate_checklist.csv'].headers).toEqual(
      expect.arrayContaining(['release_gate_id', 'required_owner_records', 'next_batch12_command', 'can_export']),
    );
    expect(manifest.outputs['erp_owner_real_submission_swap_runbook.csv'].headers).toEqual(
      expect.arrayContaining(['step_id', 'runbook_step', 'command_or_action', 'can_write_real_gate']),
    );
    expect(manifest.outputs['erp_owner_real_submission_boundary_audit.csv'].headers).toEqual(
      expect.arrayContaining(['checked_item', 'observed_value', 'boundary_status']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.fieldChecklistRows).toBe(23);
    expect(manifest.summary.releaseGateChecklistRows).toBe(9);
    expect(manifest.summary.swapRunbookRows).toBe(7);
    expect(manifest.summary.boundaryAuditRows).toBe(6);
    expect(manifest.summary.requiredApprovalLanes).toBe(4);
    expect(manifest.summary.requiredSourceIds).toBe(5);
    expect(manifest.summary.uriContractRows).toBe(4);
    expect(manifest.summary.syntheticPipelineRows).toBe(5);
    expect(manifest.summary.realOwnerRecordsAccepted).toBe(0);
    expect(manifest.summary.readyToRunBatch12Rows).toBe(0);
    expect(manifest.summary.readyToRunBatch11Rows).toBe(0);
    expect(manifest.summary.readyToRunBatch9Rows).toBe(0);
    expect(manifest.summary.readyToDisplayRows).toBe(0);
    expect(manifest.summary.readyToExportRows).toBe(0);
    expect(manifest.summary.validationPassed).toBe(false);
  });

  it('derives gated AI/report Batch 4 readiness without model calls or customer content', () => {
    const output = execFileSync('node', ['scripts/data/build-ai-report-governance-batch4.mjs', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        modelCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        rawReviewTextIncluded: boolean;
        rawPromptIncluded: boolean;
        credentialsIncluded: boolean;
        customerDataIncluded: boolean;
        reportConclusionsGenerated: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        datasetManifestRows: number;
        modelRunManifestRows: number;
        humanReviewGateRows: number;
        reportQueueRows: number;
        erpBridgeRows: number;
        blockedRows: number;
      };
    };

    expect(output).not.toMatch(/password|client_secret|cookie|raw_review_text|customer_email|SHOULD_NOT_LEAK/i);
    expect(manifest.batchId).toBe('ai-report-governance-batch4-20260625');
    expect(manifest.sourceIds).toEqual(
      expect.arrayContaining(['ds-021', 'ds-022', 'ds-023', 'ds-024', 'ds-026', 'ds-029', 'ds-030', 'ds-031', 'ds-035', 'ds-047', 'ds-049', 'ds-050', 'ds-051']),
    );
    expect(manifest.evidenceGrade).toBe('L2-fixture-or-dry-run');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.boundaries).toMatchObject({
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
    });
    expect(manifest.outputs['ai_dataset_manifest.csv'].headers).toEqual(
      expect.arrayContaining(['dataset_id', 'source_ids', 'required_artifacts', 'can_display_as_fact']),
    );
    expect(manifest.outputs['ai_model_run_manifest.csv'].headers).toEqual(
      expect.arrayContaining(['model_run_id', 'model_name_status', 'prompt_version_status', 'human_review_required']),
    );
    expect(manifest.outputs['ai_human_review_gate.csv'].headers).toEqual(
      expect.arrayContaining(['review_gate_id', 'approval_state', 'can_display_as_fact']),
    );
    expect(manifest.outputs['report_generation_queue.csv'].headers).toEqual(
      expect.arrayContaining(['report_id', 'can_generate', 'can_display_as_fact']),
    );
    expect(manifest.outputs['ai_erp_context_bridge.csv'].headers).toEqual(
      expect.arrayContaining(['bridge_id', 'allowed_use', 'forbidden_use']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.datasetManifestRows).toBe(7);
    expect(manifest.summary.modelRunManifestRows).toBe(7);
    expect(manifest.summary.humanReviewGateRows).toBe(5);
    expect(manifest.summary.reportQueueRows).toBe(5);
    expect(manifest.summary.erpBridgeRows).toBe(5);
    expect(manifest.summary.blockedRows).toBe(29);
  });

  it('derives gated AI review Batch 5 sample and review queues without live connector access', () => {
    const output = execFileSync('node', ['scripts/data/build-ai-review-governance-batch5.mjs', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        modelCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        reviewBodyIncluded: boolean;
        promptBodyIncluded: boolean;
        credentialsIncluded: boolean;
        customerIdentifiersIncluded: boolean;
        platformPersonalDataIncluded: boolean;
        publishEnabled: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        sampleManifestRows: number;
        evalQueueRows: number;
        humanReviewRows: number;
        publishGateRows: number;
        blockedRows: number;
      };
    };

    expect(output).not.toMatch(/password|client_secret|cookie|raw_review_text|customer_email|SHOULD_NOT_LEAK/i);
    expect(manifest.batchId).toBe('ai-review-governance-batch5-20260625');
    expect(manifest.sourceIds).toEqual(expect.arrayContaining(['ds-021', 'ds-023', 'ds-030', 'ds-031', 'ds-032', 'ds-033']));
    expect(manifest.evidenceGrade).toBe('L2-fixture-or-dry-run');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.boundaries).toMatchObject({
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
    });
    expect(manifest.outputs['ai_review_sample_manifest.csv'].headers).toEqual(
      expect.arrayContaining(['sample_manifest_id', 'source_ids', 'raw_text_policy', 'can_display_as_fact']),
    );
    expect(manifest.outputs['ai_review_eval_queue.csv'].headers).toEqual(
      expect.arrayContaining(['eval_queue_id', 'metric_contract', 'model_version_status', 'golden_set_status']),
    );
    expect(manifest.outputs['ai_review_human_queue.csv'].headers).toEqual(
      expect.arrayContaining(['review_task_id', 'approval_state', 'can_publish', 'can_display_as_fact']),
    );
    expect(manifest.outputs['ai_review_publish_gate.csv'].headers).toEqual(
      expect.arrayContaining(['publish_gate_id', 'blocked_claim_types', 'can_export', 'can_display_as_fact']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.sampleManifestRows).toBe(6);
    expect(manifest.summary.evalQueueRows).toBe(6);
    expect(manifest.summary.humanReviewRows).toBe(6);
    expect(manifest.summary.publishGateRows).toBe(6);
    expect(manifest.summary.blockedRows).toBe(24);
  });

  it('derives gated AI design Batch 6 request, asset, cost, and commercial-review queues without model calls', () => {
    const output = execFileSync('node', ['scripts/data/build-ai-design-governance-batch6.mjs', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const manifest = JSON.parse(output) as {
      batchId: string;
      sourceIds: string[];
      evidenceGrade: string;
      privacyLevel: string;
      canDisplayAsFact: boolean;
      dryRun: boolean;
      boundaries: {
        networkCalls: number;
        providerCalls: boolean;
        modelCalls: boolean;
        productionWrites: boolean;
        browserLogin: boolean;
        liveConnectorAccess: boolean;
        requestIdIncluded: boolean;
        promptBodyIncluded: boolean;
        generatedImageBytesIncluded: boolean;
        credentialsIncluded: boolean;
        invoiceDetailsIncluded: boolean;
        costCharged: boolean;
        commercialUseApproved: boolean;
        publishEnabled: boolean;
        exportEnabled: boolean;
      };
      outputs: Record<string, { rowCount: number; headers: string[]; sha256: string }>;
      summary: {
        designRunRows: number;
        assetHashRows: number;
        costQueueRows: number;
        commercialReviewRows: number;
        blockedRows: number;
      };
    };

    expect(output).not.toMatch(/password|client_secret|cookie|raw_prompt|prompt_body|generated_image_bytes|customer_email|SHOULD_NOT_LEAK/i);
    expect(manifest.batchId).toBe('ai-design-governance-batch6-20260625');
    expect(manifest.sourceIds).toEqual(expect.arrayContaining(['ds-024', 'ds-026', 'ds-029', 'ds-047', 'ds-049']));
    expect(manifest.evidenceGrade).toBe('L2-fixture-or-dry-run');
    expect(manifest.privacyLevel).toBe('private/internal');
    expect(manifest.canDisplayAsFact).toBe(false);
    expect(manifest.dryRun).toBe(true);
    expect(manifest.boundaries).toMatchObject({
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
    });
    expect(manifest.outputs['ai_design_run_manifest.csv'].headers).toEqual(
      expect.arrayContaining(['design_run_id', 'request_id_status', 'model_version_status', 'can_display_as_fact']),
    );
    expect(manifest.outputs['ai_design_asset_hash_manifest.csv'].headers).toEqual(
      expect.arrayContaining(['asset_manifest_id', 'asset_hash_status', 'prompt_hash_status', 'storage_policy']),
    );
    expect(manifest.outputs['ai_design_cost_queue.csv'].headers).toEqual(
      expect.arrayContaining(['cost_queue_id', 'provider_invoice_status', 'unit_cost_status', 'cost_charged']),
    );
    expect(manifest.outputs['ai_design_commercial_review_gate.csv'].headers).toEqual(
      expect.arrayContaining(['review_gate_id', 'rights_status', 'can_use_commercially', 'can_publish']),
    );
    expect(Object.values(manifest.outputs).every((outputFile) => outputFile.sha256.length === 64)).toBe(true);
    expect(manifest.summary.designRunRows).toBe(5);
    expect(manifest.summary.assetHashRows).toBe(5);
    expect(manifest.summary.costQueueRows).toBe(5);
    expect(manifest.summary.commercialReviewRows).toBe(5);
    expect(manifest.summary.blockedRows).toBe(20);
  });

  it('prints private ERP readiness templates without credentials or supplier commercial details', () => {
    const readinessOutput = execFileSync('node', ['scripts/data/connectors/internal-erp-dry-run.mjs', '--print-readiness-template'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const snapshotOutput = execFileSync('node', ['scripts/data/connectors/internal-erp-dry-run.mjs', '--print-snapshot-manifest-template'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const readinessTemplate = JSON.parse(readinessOutput) as {
      privateData: boolean;
      publicBundleAllowed: boolean;
      gitAllowed: boolean;
      expectedSnapshotTypes: string[];
      readiness: {
        sourceIds: string[];
        skuCount: number;
        supplierCount: number;
        warehouseCount: number;
        allowedExportFields: string[];
        containsRawSupplierNames: boolean;
        containsPurchaseOrderLines: boolean;
        containsUnitCostValues: boolean;
      };
    };
    const snapshotTemplate = JSON.parse(snapshotOutput) as {
      privateData: boolean;
      publicBundleAllowed: boolean;
      gitAllowed: boolean;
      snapshotManifest: {
        sourceIds: string[];
        skuCount: number;
        allowedExportFields: string[];
        containsRawSupplierNames: boolean;
        containsPurchaseOrderLines: boolean;
        containsUnitCostValues: boolean;
      };
    };

    expect(`${readinessOutput}\n${snapshotOutput}`).not.toMatch(
      /clientSecret|refreshToken|accessToken|password|privateKey|authorizationHeader|connectionString|"supplierName"\s*:|"supplierEmail"\s*:|"supplierPhone"\s*:|"supplierAddress"\s*:|"purchaseOrderId"\s*:|"invoiceId"\s*:|"unitCost"\s*:|"purchasePrice"\s*:/i,
    );
    expect(readinessTemplate).toMatchObject({
      privateData: true,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(readinessTemplate.expectedSnapshotTypes).toEqual(['inventory_snapshot', 'supplier_master_snapshot', 'supply_cost_snapshot']);
    expect(readinessTemplate.readiness.sourceIds).toEqual(['ds-035']);
    expect(readinessTemplate.readiness.skuCount).toBe(0);
    expect(readinessTemplate.readiness.supplierCount).toBe(0);
    expect(readinessTemplate.readiness.warehouseCount).toBe(0);
    expect(readinessTemplate.readiness.containsRawSupplierNames).toBe(false);
    expect(readinessTemplate.readiness.containsPurchaseOrderLines).toBe(false);
    expect(readinessTemplate.readiness.containsUnitCostValues).toBe(false);
    expect(readinessTemplate.readiness.allowedExportFields).toEqual(
      expect.arrayContaining(['skuHash', 'warehouseCode', 'supplierHash', 'costBucket', 'costIndex']),
    );
    expect(snapshotTemplate).toMatchObject({
      privateData: true,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(snapshotTemplate.snapshotManifest.sourceIds).toEqual(readinessTemplate.readiness.sourceIds);
    expect(snapshotTemplate.snapshotManifest.skuCount).toBe(0);
    expect(snapshotTemplate.snapshotManifest.containsRawSupplierNames).toBe(false);
    expect(snapshotTemplate.snapshotManifest.containsPurchaseOrderLines).toBe(false);
    expect(snapshotTemplate.snapshotManifest.containsUnitCostValues).toBe(false);
  });

  it('passes ERP readiness only with inventory coverage, versioned mappings, commercial boundary, and compliance evidence', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/data/connectors/internal-erp-dry-run.mjs',
        '--readiness-gate',
        '--readiness',
        'tests/fixtures/internal-erp-readiness-valid.json',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          MKT53_ERP_CONNECTION_SECRET: 'fixture-erp-secret',
        },
      },
    );
    const gate = JSON.parse(output) as {
      status: string;
      readinessPathSource: string;
      privateInput: { readinessPathConfigured: boolean; publicBundleAllowed: boolean; gitAllowed: boolean };
      thresholds: { minimumSkuCount: number; minimumSupplierCount: number; minimumWarehouseCount: number; minimumInventoryRecordCount: number };
      checks: Array<{ id: string; status: string; details: Record<string, unknown>; blockers: Array<{ type: string }> }>;
      blockers: Array<{ type: string }>;
      safety: { networkCalls: number; databaseReads: number; businessDataWrites: number };
    };

    expect(output).not.toContain('fixture-erp-secret');
    expect(gate.status).toBe('ready-for-authorized-erp-supply-chain-pipeline-implementation');
    expect(gate.readinessPathSource).toBe('cli');
    expect(gate.privateInput).toMatchObject({
      readinessPathConfigured: true,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(gate.thresholds).toMatchObject({
      minimumSkuCount: 50,
      minimumSupplierCount: 5,
      minimumWarehouseCount: 2,
      minimumInventoryRecordCount: 50,
    });
    expect(gate.checks.every((check) => check.status === 'ready')).toBe(true);
    expect(gate.checks.find((check) => check.id === 'sourceCoverage')?.details).toMatchObject({
      missingSourceIds: [],
    });
    expect(gate.checks.find((check) => check.id === 'snapshotVolume')?.details).toMatchObject({
      skuCount: 80,
      supplierCount: 8,
      warehouseCount: 3,
      inventoryRecordCount: 120,
    });
    expect(gate.checks.find((check) => check.id === 'snapshotDefinition')?.details).toMatchObject({
      erpSnapshotVersion: 'fixture-erp-2026-06-h1',
      supplierMappingVersion: 'fixture-supplier-map-v1',
      costModelVersion: 'fixture-cost-index-v1',
      currency: 'USD',
    });
    expect(gate.checks.find((check) => check.id === 'commercialBoundary')?.details).toMatchObject({
      commercialDataHandlingStatus: 'approved',
      costDisclosureMode: 'aggregated-index',
      containsRawSupplierNames: false,
      containsPurchaseOrderLines: false,
      containsUnitCostValues: false,
      forbiddenKeys: [],
    });
    expect(gate.blockers).toHaveLength(0);
    expect(gate.safety).toMatchObject({ networkCalls: 0, databaseReads: 0, businessDataWrites: 0 });
  });

  it('validates a partial Amazon ASIN/SKU mapping without treating it as full coverage', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/data/connectors/amazon-commerce-dry-run.mjs',
        '--json',
        '--no-write',
        '--mapping',
        'tests/fixtures/amazon-commerce-mapping-partial-valid.json',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          AMAZON_SP_API_CLIENT_ID: 'fixture-client-id',
          AMAZON_SP_API_CLIENT_SECRET: 'fixture-client-secret',
          AMAZON_SP_API_REFRESH_TOKEN: 'fixture-refresh-token',
          AMAZON_MARKETPLACE_IDS: 'ATVPDKIKX0DER',
        },
      },
    );
    const dryRun = JSON.parse(output) as {
      status: string;
      privateInput: { mappingPathSource: string; mappingPathConfigured: boolean; publicBundleAllowed: boolean; gitAllowed: boolean };
      collectionWindow: { start: string; end: string };
      mappingContract: { requiredFields: string[]; uniqueKey: string[] };
      mapping: {
        mappingCount: number;
        validMappingCount: number;
        uniqueValidMappingCount: number;
        invalidMappingCount: number;
        duplicateMappingCount: number;
        missingSourceIds: string[];
        sourceCoverage: Array<{ sourceId: string; mappedItems: number; status: string }>;
      };
      mappingCoverage: {
        status: string;
        totalRequiredItems: number;
        totalMappedItems: number;
        missingItemCount: number;
        readySourceCount: number;
        missingSourceCount: number;
      };
      blockers: Array<{ type: string; key?: string; sourceId?: string; count?: number }>;
    };

    expect(output).not.toContain('fixture-client-secret');
    expect(dryRun.status).toBe('blocked');
    expect(dryRun.privateInput).toMatchObject({
      mappingPathSource: 'cli',
      mappingPathConfigured: true,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(dryRun.collectionWindow).toMatchObject({ start: '2026-06-01', end: '2026-06-15' });
    expect(dryRun.mappingContract.requiredFields).toEqual(
      expect.arrayContaining(['sourceId', 'site', 'marketplaceId', 'asin', 'sku', 'brand', 'productName', 'mappingOwner']),
    );
    expect(dryRun.mappingContract.uniqueKey).toEqual(['sourceId', 'site', 'marketplaceId', 'asin']);
    expect(dryRun.mapping.mappingCount).toBe(1);
    expect(dryRun.mapping.validMappingCount).toBe(1);
    expect(dryRun.mapping.uniqueValidMappingCount).toBe(1);
    expect(dryRun.mapping.invalidMappingCount).toBe(0);
    expect(dryRun.mapping.duplicateMappingCount).toBe(0);
    expect(dryRun.mapping.sourceCoverage.find((item) => item.sourceId === 'ds-010')).toMatchObject({
      mappedItems: 1,
      status: 'ready',
    });
    expect(dryRun.mappingCoverage).toMatchObject({
      status: 'blocked',
      totalRequiredItems: 67,
      totalMappedItems: 1,
      missingItemCount: 66,
      readySourceCount: 1,
      missingSourceCount: 6,
    });
    expect(dryRun.mapping.missingSourceIds).not.toContain('ds-010');
    expect(dryRun.mapping.missingSourceIds).toEqual(expect.arrayContaining(['ds-007', 'ds-009', 'ds-019', 'ds-037', 'ds-038', 'ds-039']));
    expect(dryRun.blockers.some((item) => item.type === 'missing-credential')).toBe(false);
    expect(dryRun.blockers.some((item) => item.type === 'invalid-asin-sku-mapping')).toBe(false);
    expect(dryRun.blockers.some((item) => item.type === 'missing-asin-sku-mapping' && item.sourceId === 'ds-007')).toBe(true);
  });

  it('prints a private Amazon mapping template without business ASIN/SKU values', () => {
    const output = execFileSync('node', ['scripts/data/connectors/amazon-commerce-dry-run.mjs', '--print-mapping-template'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const template = JSON.parse(output) as {
      privateData: boolean;
      publicBundleAllowed: boolean;
      gitAllowed: boolean;
      recommendedLocalPrivateMappingPath: string;
      recommendedServerPrivateMappingPath: string;
      mappings: Array<{ sourceId: string; asin: string; sku: string; mappingOwner: string; minimumMappedItems: number }>;
    };

    expect(template.privateData).toBe(true);
    expect(template.publicBundleAllowed).toBe(false);
    expect(template.gitAllowed).toBe(false);
    expect(template.recommendedLocalPrivateMappingPath).toBe('configs/private/amazon-commerce-mapping.json');
    expect(template.recommendedServerPrivateMappingPath).toBe('/opt/mkt53/private/amazon-commerce-mapping.json');
    expect(template.mappings.map((mapping) => mapping.sourceId)).toEqual(['ds-007', 'ds-009', 'ds-010', 'ds-019', 'ds-037', 'ds-038', 'ds-039']);
    expect(template.mappings.every((mapping) => mapping.asin === '' && mapping.sku === '' && mapping.mappingOwner === '')).toBe(true);
    expect(template.mappings.find((mapping) => mapping.sourceId === 'ds-009')?.minimumMappedItems).toBe(25);
  });

  it('prints a private Amazon readiness template without credentials or business values', () => {
    const output = execFileSync('node', ['scripts/data/connectors/amazon-commerce-dry-run.mjs', '--print-readiness-template'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const template = JSON.parse(output) as {
      privateData: boolean;
      publicBundleAllowed: boolean;
      gitAllowed: boolean;
      recommendedLocalPrivateReadinessPath: string;
      recommendedServerPrivateReadinessPath: string;
      expectedSnapshotTypes: string[];
      readiness: { authorizationRecordId: string; allowedSnapshotTypes: string[]; note: string };
    };

    expect(output).not.toMatch(/clientSecret|refreshToken|accessToken|password/i);
    expect(template.privateData).toBe(true);
    expect(template.publicBundleAllowed).toBe(false);
    expect(template.gitAllowed).toBe(false);
    expect(template.recommendedLocalPrivateReadinessPath).toBe('configs/private/amazon-commerce-readiness.json');
    expect(template.recommendedServerPrivateReadinessPath).toBe('/opt/mkt53/private/amazon-commerce-readiness.json');
    expect(template.expectedSnapshotTypes).toEqual(['product_snapshot', 'review_snapshot', 'brand_share_snapshot', 'category_rank_snapshot']);
    expect(template.readiness.authorizationRecordId).toBe('');
    expect(template.readiness.allowedSnapshotTypes).toEqual(template.expectedSnapshotTypes);
  });

  it('bootstraps Amazon private inputs with a readiness checklist for audit handoff', () => {
    const privateDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-'));

    try {
      const bootstrapOutput = execFileSync(
        'node',
        ['scripts/data/connectors/bootstrap-amazon-private-inputs.mjs', '--target-dir', privateDir],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );
      const bootstrap = JSON.parse(bootstrapOutput) as {
        targetDirMode: string;
        files: {
          mapping: { path: string; status: string; mode: string };
          readiness: { path: string; status: string; mode: string };
          readinessChecklist: { path: string; status: string; mode: string };
        };
        safety: { publicBundleAllowed: boolean; gitAllowed: boolean; containsBusinessAsinSkuValues: boolean };
        nextCommands: string[];
      };

      expect(bootstrap.targetDirMode).toBe('700');
      expect(bootstrap.files.mapping).toMatchObject({ status: 'created', mode: '600' });
      expect(bootstrap.files.readiness).toMatchObject({ status: 'created', mode: '600' });
      expect(bootstrap.files.readinessChecklist).toMatchObject({ status: 'created', mode: '600' });
      expect(statSync(privateDir).mode & 0o777).toBe(0o700);
      expect(statSync(bootstrap.files.mapping.path).mode & 0o777).toBe(0o600);
      expect(statSync(bootstrap.files.readiness.path).mode & 0o777).toBe(0o600);
      expect(statSync(bootstrap.files.readinessChecklist.path).mode & 0o777).toBe(0o600);
      expect(readFileSync(bootstrap.files.readinessChecklist.path, 'utf8')).toContain('Amazon Commerce Private Input Readiness Checklist');
      expect(bootstrap.safety).toMatchObject({
        publicBundleAllowed: false,
        gitAllowed: false,
        containsBusinessAsinSkuValues: false,
      });
      expect(bootstrap.nextCommands.some((command) => command.includes('data:connector:amazon:private:audit'))).toBe(true);

      const auditOutput = execFileSync(
        'node',
        ['scripts/data/connectors/amazon-commerce-private-input-audit.mjs', '--private-dir', privateDir],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );
      const audit = JSON.parse(auditOutput) as {
        status: string;
        checklist: { status: string; missingChecklistItems: string[] };
        blockers: Array<{ scope: string; type: string }>;
      };

      expect(audit.status).toBe('blocked');
      expect(audit.checklist).toMatchObject({ status: 'ready', missingChecklistItems: [] });
      expect(audit.blockers.some((blocker) => blocker.scope === 'checklist' && blocker.type === 'missing-checklist-file')).toBe(false);
    } finally {
      rmSync(privateDir, { recursive: true, force: true });
    }
  });

  it('scaffolds a private Amazon mapping fill draft without business values', () => {
    const privateDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-'));

    try {
      const output = execFileSync(
        'node',
        ['scripts/data/connectors/scaffold-amazon-mapping-fill-draft.mjs', '--target-dir', privateDir],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );
      const scaffold = JSON.parse(output) as {
        rowCount: number;
        sourceCoverage: Array<{ sourceId: string; requiredRows: number; draftRows: number }>;
        files: {
          json: { path: string; status: string; overwritten: boolean; mode: string };
          csv: { path: string; status: string; overwritten: boolean; mode: string };
        };
        safety: { publicBundleAllowed: boolean; gitAllowed: boolean; containsBusinessAsinSkuValues: boolean };
        nextCommands: string[];
      };

      expect(output).not.toMatch(/clientSecret|refreshToken|accessToken|password|privateKey|authorizationHeader/i);
      expect(scaffold.rowCount).toBe(67);
      expect(scaffold.sourceCoverage).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ sourceId: 'ds-007', requiredRows: 15, draftRows: 15 }),
          expect.objectContaining({ sourceId: 'ds-009', requiredRows: 25, draftRows: 25 }),
          expect.objectContaining({ sourceId: 'ds-010', requiredRows: 1, draftRows: 1 }),
          expect.objectContaining({ sourceId: 'ds-019', requiredRows: 8, draftRows: 8 }),
          expect.objectContaining({ sourceId: 'ds-037', requiredRows: 5, draftRows: 5 }),
          expect.objectContaining({ sourceId: 'ds-038', requiredRows: 8, draftRows: 8 }),
          expect.objectContaining({ sourceId: 'ds-039', requiredRows: 5, draftRows: 5 }),
        ]),
      );
      expect(scaffold.files.json).toMatchObject({ status: 'created', overwritten: false, mode: '600' });
      expect(scaffold.files.csv).toMatchObject({ status: 'created', overwritten: false, mode: '600' });
      expect(statSync(privateDir).mode & 0o777).toBe(0o700);
      expect(statSync(scaffold.files.json.path).mode & 0o777).toBe(0o600);
      expect(statSync(scaffold.files.csv.path).mode & 0o777).toBe(0o600);
      expect(scaffold.safety).toMatchObject({
        publicBundleAllowed: false,
        gitAllowed: false,
        containsBusinessAsinSkuValues: false,
      });
      expect(scaffold.nextCommands.some((command) => command.includes('data:connector:amazon:mapping:validate'))).toBe(true);

      const jsonDraft = JSON.parse(readFileSync(scaffold.files.json.path, 'utf8')) as {
        privateData: boolean;
        publicBundleAllowed: boolean;
        gitAllowed: boolean;
        mappings: Array<{ sourceId: string; asin: string; sku: string; mappingOwner: string; mappingUpdatedAt: string }>;
      };
      const csvDraft = readFileSync(scaffold.files.csv.path, 'utf8');
      const ds009Rows = jsonDraft.mappings.filter((mapping) => mapping.sourceId === 'ds-009');

      expect(jsonDraft).toMatchObject({ privateData: true, publicBundleAllowed: false, gitAllowed: false });
      expect(jsonDraft.mappings).toHaveLength(67);
      expect(ds009Rows).toHaveLength(25);
      expect(jsonDraft.mappings.every((mapping) => mapping.asin === '' && mapping.sku === '' && mapping.mappingOwner === '')).toBe(true);
      expect(jsonDraft.mappings.every((mapping) => mapping.mappingUpdatedAt === 'YYYY-MM-DD')).toBe(true);
      expect(csvDraft.trimEnd().split('\n')).toHaveLength(68);
      expect(csvDraft).toContain('sourceId,site,marketplaceId,rowNumberWithinSource');

      const secondOutput = execFileSync(
        'node',
        ['scripts/data/connectors/scaffold-amazon-mapping-fill-draft.mjs', '--target-dir', privateDir],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );
      const secondScaffold = JSON.parse(secondOutput) as {
        files: { json: { status: string; overwritten: boolean }; csv: { status: string; overwritten: boolean } };
      };

      expect(secondScaffold.files.json).toMatchObject({ status: 'exists', overwritten: false });
      expect(secondScaffold.files.csv).toMatchObject({ status: 'exists', overwritten: false });
    } finally {
      rmSync(privateDir, { recursive: true, force: true });
    }
  });

  it('keeps Amazon mapping promotion blocked for an unfilled private draft', () => {
    const privateDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-'));

    try {
      execFileSync('node', ['scripts/data/connectors/scaffold-amazon-mapping-fill-draft.mjs', '--target-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const output = execFileSync('node', ['scripts/data/connectors/promote-amazon-mapping-fill-draft.mjs', '--private-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const manifest = JSON.parse(output) as {
        status: string;
        output: { status: string; overwritten: boolean };
        validation: {
          counts: { mappingCount: number; validMappingCount: number; invalidMappingCount: number };
          coverage: { totalRequiredItems: number; totalMappedItems: number; missingItemCount: number };
          blockers: Array<{ type: string; count?: number; sourceId?: string }>;
        };
        safety: { networkCalls: number; businessDataWrites: number; privateInputWrites: number; requiresExplicitWriteFinal: boolean };
      };

      expect(output).not.toMatch(/clientSecret|refreshToken|accessToken|password|privateKey|authorizationHeader/i);
      expect(manifest.status).toBe('blocked');
      expect(manifest.output).toMatchObject({ status: 'blocked-not-written', overwritten: false });
      expect(manifest.validation.counts).toMatchObject({ mappingCount: 67, validMappingCount: 0, invalidMappingCount: 67 });
      expect(manifest.validation.coverage).toMatchObject({
        totalRequiredItems: 67,
        totalMappedItems: 0,
        missingItemCount: 67,
      });
      expect(manifest.validation.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'invalid-mapping-rows', count: 67 })]));
      expect(manifest.safety).toMatchObject({
        networkCalls: 0,
        businessDataWrites: 0,
        privateInputWrites: 0,
        requiresExplicitWriteFinal: true,
      });
      expect(existsSync(join(privateDir, 'amazon-commerce-mapping.json'))).toBe(false);
    } finally {
      rmSync(privateDir, { recursive: true, force: true });
    }
  });

  it('promotes a complete private Amazon mapping JSON with backup and redacted output', () => {
    const privateDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-'));

    try {
      const scaffoldOutput = execFileSync('node', ['scripts/data/connectors/scaffold-amazon-mapping-fill-draft.mjs', '--target-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const scaffold = JSON.parse(scaffoldOutput) as { files: { json: { path: string } } };
      const draft = JSON.parse(readFileSync(scaffold.files.json.path, 'utf8')) as {
        mappings: Array<Record<string, string | number>>;
      };

      draft.mappings = draft.mappings.map((mapping, index) => ({
        ...mapping,
        asin: `B0MKT${String(index + 1).padStart(5, '0')}`,
        sku: `SKU-${String(index + 1).padStart(3, '0')}`,
        brand: index % 2 === 0 ? 'Momcozy' : 'Competitor',
        productName: `Mapped Product ${index + 1}`,
        category: 'breast-pump',
        mappingStatus: 'ready',
        mappingUpdatedAt: '2026-06-13',
        mappingOwner: 'data-owner',
      }));
      writeFileSync(scaffold.files.json.path, `${JSON.stringify(draft, null, 2)}\n`);

      const finalPath = join(privateDir, 'amazon-commerce-mapping.json');
      writeFileSync(finalPath, '{"mappings":[]}\n', { mode: 0o600 });
      chmodSync(finalPath, 0o600);

      const dryRunOutput = execFileSync('node', ['scripts/data/connectors/promote-amazon-mapping-fill-draft.mjs', '--private-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const dryRun = JSON.parse(dryRunOutput) as {
        status: string;
        output: { status: string; overwritten: boolean };
        validation: { coverage: { status: string; totalMappedItems: number; missingItemCount: number; invalidMappingCount: number } };
      };

      expect(dryRunOutput).not.toContain('B0MKT00001');
      expect(dryRunOutput).not.toContain('SKU-001');
      expect(dryRun.status).toBe('ready-to-promote');
      expect(dryRun.output).toMatchObject({ status: 'ready-not-written', overwritten: false });
      expect(dryRun.validation.coverage).toMatchObject({
        status: 'ready',
        totalMappedItems: 67,
        missingItemCount: 0,
        invalidMappingCount: 0,
      });
      expect(readFileSync(finalPath, 'utf8')).toContain('"mappings":[]');

      const writeOutput = execFileSync(
        'node',
        ['scripts/data/connectors/promote-amazon-mapping-fill-draft.mjs', '--private-dir', privateDir, '--write-final'],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );
      const manifest = JSON.parse(writeOutput) as {
        status: string;
        output: { status: string; overwritten: boolean; mode: string; backup: { path: string; status: string; mode: string } };
        safety: { privateInputWrites: number; publicBundleAllowed: boolean; gitAllowed: boolean };
      };
      const finalMapping = JSON.parse(readFileSync(finalPath, 'utf8')) as {
        privateData: boolean;
        publicBundleAllowed: boolean;
        gitAllowed: boolean;
        mappings: Array<{ asin: string; sku: string }>;
      };

      expect(writeOutput).not.toContain('B0MKT00001');
      expect(writeOutput).not.toContain('SKU-001');
      expect(manifest.status).toBe('promoted');
      expect(manifest.output).toMatchObject({ status: 'replaced', overwritten: true, mode: '600' });
      expect(manifest.output.backup).toMatchObject({ status: 'created', mode: '600' });
      expect(manifest.safety).toMatchObject({ privateInputWrites: 1, publicBundleAllowed: false, gitAllowed: false });
      expect(statSync(privateDir).mode & 0o777).toBe(0o700);
      expect(statSync(finalPath).mode & 0o777).toBe(0o600);
      expect(statSync(manifest.output.backup.path).mode & 0o777).toBe(0o600);
      expect(finalMapping).toMatchObject({ privateData: true, publicBundleAllowed: false, gitAllowed: false });
      expect(finalMapping.mappings).toHaveLength(67);
      expect(finalMapping.mappings[0]).toMatchObject({ asin: 'B0MKT00001', sku: 'SKU-001' });
    } finally {
      rmSync(privateDir, { recursive: true, force: true });
    }
  });

  it('accepts a complete private Amazon mapping CSV as promotion input', () => {
    const privateDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-'));

    try {
      const scaffoldOutput = execFileSync('node', ['scripts/data/connectors/scaffold-amazon-mapping-fill-draft.mjs', '--target-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const scaffold = JSON.parse(scaffoldOutput) as { files: { json: { path: string }; csv: { path: string } } };
      const draft = JSON.parse(readFileSync(scaffold.files.json.path, 'utf8')) as {
        fields: string[];
        mappings: Array<Record<string, string | number>>;
      };
      const rows = draft.mappings.map((mapping, index) => ({
        ...mapping,
        asin: `B0CSV${String(index + 1).padStart(5, '0')}`,
        sku: `CSV-SKU-${String(index + 1).padStart(3, '0')}`,
        brand: 'Momcozy',
        productName: `CSV Product ${index + 1}`,
        category: 'nursing-products',
        mappingStatus: 'ready',
        mappingUpdatedAt: '2026-06-13',
        mappingOwner: 'data-owner',
      }));
      const csv = [draft.fields.join(','), ...rows.map((row) => draft.fields.map((field) => row[field]).join(','))].join('\n');
      writeFileSync(scaffold.files.csv.path, `${csv}\n`);

      const output = execFileSync(
        'node',
        ['scripts/data/connectors/promote-amazon-mapping-fill-draft.mjs', '--private-dir', privateDir, '--input', scaffold.files.csv.path],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );
      const manifest = JSON.parse(output) as {
        status: string;
        input: { format: string; rowCount: number };
        validation: { coverage: { status: string; totalMappedItems: number; missingItemCount: number; invalidMappingCount: number } };
        safety: { privateInputWrites: number };
      };

      expect(output).not.toContain('B0CSV00001');
      expect(output).not.toContain('CSV-SKU-001');
      expect(manifest.status).toBe('ready-to-promote');
      expect(manifest.input).toMatchObject({ format: 'csv', rowCount: 67 });
      expect(manifest.validation.coverage).toMatchObject({
        status: 'ready',
        totalMappedItems: 67,
        missingItemCount: 0,
        invalidMappingCount: 0,
      });
      expect(manifest.safety.privateInputWrites).toBe(0);
      expect(existsSync(join(privateDir, 'amazon-commerce-mapping.json'))).toBe(false);
    } finally {
      rmSync(privateDir, { recursive: true, force: true });
    }
  });

  it('scaffolds a private Amazon readiness fill draft without credential or owner values', () => {
    const privateDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-'));

    try {
      const output = execFileSync('node', ['scripts/data/connectors/scaffold-amazon-readiness-fill-draft.mjs', '--target-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const scaffold = JSON.parse(output) as {
        files: { json: { path: string; status: string; overwritten: boolean; mode: string } };
        safety: { containsCredentialValues: boolean; containsAuthorizationValues: boolean; containsOwnerValues: boolean };
        nextCommands: string[];
      };
      const draft = JSON.parse(readFileSync(scaffold.files.json.path, 'utf8')) as {
        privateData: boolean;
        publicBundleAllowed: boolean;
        gitAllowed: boolean;
        readiness: {
          authorizationRecordId: string;
          authorizationOwner: string;
          authorizationApprovedAt: string;
          collectionWindowStart: string;
          collectionWindowEnd: string;
          reviewOwner: string;
          reviewApprovedAt: string;
          complianceReviewStatus: string;
          allowedSnapshotTypes: string[];
        };
      };

      expect(output).not.toMatch(/clientSecret|refreshToken|accessToken|password|privateKey|authorizationHeader/i);
      expect(scaffold.files.json).toMatchObject({ status: 'created', overwritten: false, mode: '600' });
      expect(scaffold.safety).toMatchObject({
        containsCredentialValues: false,
        containsAuthorizationValues: false,
        containsOwnerValues: false,
      });
      expect(scaffold.nextCommands.some((command) => command.includes('data:connector:amazon:readiness:promote'))).toBe(true);
      expect(statSync(privateDir).mode & 0o777).toBe(0o700);
      expect(statSync(scaffold.files.json.path).mode & 0o777).toBe(0o600);
      expect(draft).toMatchObject({ privateData: true, publicBundleAllowed: false, gitAllowed: false });
      expect(draft.readiness).toMatchObject({
        authorizationRecordId: '',
        authorizationOwner: '',
        authorizationApprovedAt: 'YYYY-MM-DD',
        collectionWindowStart: 'YYYY-MM-DD',
        collectionWindowEnd: 'YYYY-MM-DD',
        reviewOwner: '',
        reviewApprovedAt: 'YYYY-MM-DD',
        complianceReviewStatus: 'approved',
      });
      expect(draft.readiness.allowedSnapshotTypes).toEqual([
        'product_snapshot',
        'review_snapshot',
        'brand_share_snapshot',
        'category_rank_snapshot',
      ]);

      const secondOutput = execFileSync('node', ['scripts/data/connectors/scaffold-amazon-readiness-fill-draft.mjs', '--target-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const secondScaffold = JSON.parse(secondOutput) as { files: { json: { status: string; overwritten: boolean } } };

      expect(secondScaffold.files.json).toMatchObject({ status: 'exists', overwritten: false });
    } finally {
      rmSync(privateDir, { recursive: true, force: true });
    }
  });

  it('keeps Amazon readiness promotion blocked for an unfilled private draft', () => {
    const privateDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-'));

    try {
      execFileSync('node', ['scripts/data/connectors/scaffold-amazon-readiness-fill-draft.mjs', '--target-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const output = execFileSync('node', ['scripts/data/connectors/promote-amazon-readiness-fill-draft.mjs', '--private-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const manifest = JSON.parse(output) as {
        status: string;
        output: { status: string; overwritten: boolean };
        validation: {
          checks: {
            requiredFields: { status: string; missingRequiredFields: string[] };
            dates: { status: string; invalidDateFields: string[] };
            collectionWindow: { status: string; matchesExpected: boolean };
          };
          blockers: Array<{ type: string; fields?: string[] }>;
        };
        safety: { networkCalls: number; businessDataWrites: number; privateInputWrites: number; requiresExplicitWriteFinal: boolean };
      };

      expect(output).not.toMatch(/clientSecret|refreshToken|accessToken|password|privateKey|authorizationHeader/i);
      expect(manifest.status).toBe('blocked');
      expect(manifest.output).toMatchObject({ status: 'blocked-not-written', overwritten: false });
      expect(manifest.validation.checks.requiredFields).toMatchObject({
        status: 'blocked',
        missingRequiredFields: ['authorizationRecordId', 'authorizationOwner', 'reviewOwner'],
      });
      expect(manifest.validation.checks.dates.status).toBe('blocked');
      expect(manifest.validation.checks.collectionWindow).toMatchObject({ status: 'blocked', matchesExpected: false });
      expect(manifest.validation.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'missing-readiness-fields' })]));
      expect(manifest.safety).toMatchObject({
        networkCalls: 0,
        businessDataWrites: 0,
        privateInputWrites: 0,
        requiresExplicitWriteFinal: true,
      });
      expect(existsSync(join(privateDir, 'amazon-commerce-readiness.json'))).toBe(false);
    } finally {
      rmSync(privateDir, { recursive: true, force: true });
    }
  });

  it('promotes a complete private Amazon readiness JSON with backup and redacted output', () => {
    const privateDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-'));

    try {
      const scaffoldOutput = execFileSync('node', ['scripts/data/connectors/scaffold-amazon-readiness-fill-draft.mjs', '--target-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const scaffold = JSON.parse(scaffoldOutput) as { files: { json: { path: string } } };
      const draft = JSON.parse(readFileSync(scaffold.files.json.path, 'utf8')) as {
        readiness: Record<string, unknown>;
      };

      draft.readiness = {
        ...draft.readiness,
        authorizationRecordId: 'AUTH-2026-PRIVATE-001',
        authorizationOwner: 'commerce-owner',
        authorizationApprovedAt: '2026-06-01',
        collectionWindowStart: '2026-06-01',
        collectionWindowEnd: '2026-06-15',
        reviewOwner: 'business-reviewer',
        reviewApprovedAt: '2026-06-13',
        complianceReviewer: 'legal-reviewer',
        complianceReviewStatus: 'approved',
        allowedSnapshotTypes: ['product_snapshot', 'review_snapshot', 'brand_share_snapshot', 'category_rank_snapshot'],
      };
      writeFileSync(scaffold.files.json.path, `${JSON.stringify(draft, null, 2)}\n`);

      const finalPath = join(privateDir, 'amazon-commerce-readiness.json');
      writeFileSync(finalPath, '{"readiness":{"preserve":"existing-readiness"}}\n', { mode: 0o600 });
      chmodSync(finalPath, 0o600);

      const dryRunOutput = execFileSync('node', ['scripts/data/connectors/promote-amazon-readiness-fill-draft.mjs', '--private-dir', privateDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const dryRun = JSON.parse(dryRunOutput) as {
        status: string;
        output: { status: string; overwritten: boolean };
        validation: { checks: { collectionWindow: { status: string }; snapshotScope: { status: string } } };
      };

      expect(dryRunOutput).not.toContain('AUTH-2026-PRIVATE-001');
      expect(dryRunOutput).not.toContain('commerce-owner');
      expect(dryRunOutput).not.toContain('business-reviewer');
      expect(dryRun.status).toBe('ready-to-promote');
      expect(dryRun.output).toMatchObject({ status: 'ready-not-written', overwritten: false });
      expect(dryRun.validation.checks.collectionWindow.status).toBe('ready');
      expect(dryRun.validation.checks.snapshotScope.status).toBe('ready');
      expect(readFileSync(finalPath, 'utf8')).toContain('existing-readiness');

      const writeOutput = execFileSync(
        'node',
        ['scripts/data/connectors/promote-amazon-readiness-fill-draft.mjs', '--private-dir', privateDir, '--write-final'],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );
      const manifest = JSON.parse(writeOutput) as {
        status: string;
        output: { status: string; overwritten: boolean; mode: string; backup: { path: string; status: string; mode: string } };
        safety: { privateInputWrites: number; publicBundleAllowed: boolean; gitAllowed: boolean };
      };
      const finalReadiness = JSON.parse(readFileSync(finalPath, 'utf8')) as {
        privateData: boolean;
        publicBundleAllowed: boolean;
        gitAllowed: boolean;
        readiness: { authorizationRecordId: string; authorizationOwner: string; reviewOwner: string };
      };

      expect(writeOutput).not.toContain('AUTH-2026-PRIVATE-001');
      expect(writeOutput).not.toContain('commerce-owner');
      expect(writeOutput).not.toContain('business-reviewer');
      expect(manifest.status).toBe('promoted');
      expect(manifest.output).toMatchObject({ status: 'replaced', overwritten: true, mode: '600' });
      expect(manifest.output.backup).toMatchObject({ status: 'created', mode: '600' });
      expect(manifest.safety).toMatchObject({ privateInputWrites: 1, publicBundleAllowed: false, gitAllowed: false });
      expect(statSync(privateDir).mode & 0o777).toBe(0o700);
      expect(statSync(finalPath).mode & 0o777).toBe(0o600);
      expect(statSync(manifest.output.backup.path).mode & 0o777).toBe(0o600);
      expect(finalReadiness).toMatchObject({ privateData: true, publicBundleAllowed: false, gitAllowed: false });
      expect(finalReadiness.readiness).toMatchObject({
        authorizationRecordId: 'AUTH-2026-PRIVATE-001',
        authorizationOwner: 'commerce-owner',
        reviewOwner: 'business-reviewer',
      });
    } finally {
      rmSync(privateDir, { recursive: true, force: true });
    }
  });

  it('loads a private Amazon mapping path from MKT53_AMAZON_MAPPING_PATH', () => {
    const output = execFileSync('node', ['scripts/data/connectors/amazon-commerce-dry-run.mjs', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        MKT53_AMAZON_MAPPING_PATH: 'tests/fixtures/amazon-commerce-mapping-partial-valid.json',
        AMAZON_SP_API_CLIENT_ID: 'fixture-client-id',
        AMAZON_SP_API_CLIENT_SECRET: 'fixture-client-secret',
        AMAZON_SP_API_REFRESH_TOKEN: 'fixture-refresh-token',
        AMAZON_MARKETPLACE_IDS: 'ATVPDKIKX0DER',
      },
    });
    const dryRun = JSON.parse(output) as {
      privateInput: { mappingPathSource: string; mappingPathConfigured: boolean; recommendedServerPrivateMappingPath: string };
      mapping: {
        validMappingCount: number;
        sourceCoverage: Array<{ sourceId: string; mappedItems: number; status: string }>;
      };
    };

    expect(output).not.toContain('fixture-client-secret');
    expect(dryRun.privateInput).toMatchObject({
      mappingPathSource: 'env:MKT53_AMAZON_MAPPING_PATH',
      mappingPathConfigured: true,
      recommendedServerPrivateMappingPath: '/opt/mkt53/private/amazon-commerce-mapping.json',
    });
    expect(dryRun.mapping.validMappingCount).toBe(1);
    expect(dryRun.mapping.sourceCoverage.find((item) => item.sourceId === 'ds-010')).toMatchObject({
      mappedItems: 1,
      status: 'ready',
    });
  });

  it('prints an auditable Amazon mapping coverage report', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/data/connectors/amazon-commerce-dry-run.mjs',
        '--coverage-report',
        '--no-write',
        '--mapping',
        'tests/fixtures/amazon-commerce-mapping-partial-valid.json',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          AMAZON_SP_API_CLIENT_ID: 'fixture-client-id',
          AMAZON_SP_API_CLIENT_SECRET: 'fixture-client-secret',
          AMAZON_SP_API_REFRESH_TOKEN: 'fixture-refresh-token',
          AMAZON_MARKETPLACE_IDS: 'ATVPDKIKX0DER',
        },
      },
    );

    expect(output).not.toContain('fixture-client-secret');
    expect(output).toContain('# Amazon Commerce Mapping Coverage Report');
    expect(output).toContain('mappingCoverageStatus: blocked');
    expect(output).toContain('networkCalls: 0');
    expect(output).toContain('businessDataWrites: 0');
    expect(output).toContain('totalRequiredItems: 67');
    expect(output).toContain('totalMappedItems: 1');
    expect(output).toContain('missingItemCount: 66');
    expect(output).toContain('| ds-010 | RegionCompetition | brand_analytics_region_share | 1 | 1 | 0 | ready |');
    expect(output).toContain('| ds-007 | CompetitionPage | competitor_catalog | 15 | 0 | 15 | missing-mapping |');
  });

  it('keeps Amazon readiness blocked when the private readiness record is missing', () => {
    const output = execFileSync('node', ['scripts/data/connectors/amazon-commerce-dry-run.mjs', '--readiness-gate', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        AMAZON_SP_API_CLIENT_ID: 'fixture-client-id',
        AMAZON_SP_API_CLIENT_SECRET: 'fixture-client-secret',
        AMAZON_SP_API_REFRESH_TOKEN: 'fixture-refresh-token',
        AMAZON_MARKETPLACE_IDS: 'ATVPDKIKX0DER',
      },
    });
    const gate = JSON.parse(output) as {
      status: string;
      readinessPathSource: string;
      checks: Array<{ id: string; status: string; blockers: Array<{ type: string }> }>;
      privateInput: { readinessPathConfigured: boolean; publicBundleAllowed: boolean; gitAllowed: boolean };
      safety: { networkCalls: number; businessDataWrites: number };
    };

    expect(output).not.toContain('fixture-client-secret');
    expect(gate.status).toBe('blocked');
    expect(gate.readinessPathSource).toBe('none');
    expect(gate.privateInput).toMatchObject({
      readinessPathConfigured: false,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(gate.checks.find((check) => check.id === 'credentials')?.status).toBe('ready');
    expect(gate.checks.find((check) => check.id === 'authorizationRecord')?.blockers[0]?.type).toBe('missing-readiness-record');
    expect(gate.safety).toMatchObject({ networkCalls: 0, businessDataWrites: 0 });
  });

  it('keeps Amazon readiness blocked until mapping coverage is complete even with an approved private record', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/data/connectors/amazon-commerce-dry-run.mjs',
        '--readiness-gate',
        '--mapping',
        'tests/fixtures/amazon-commerce-mapping-partial-valid.json',
        '--readiness',
        'tests/fixtures/amazon-commerce-readiness-partial-valid.json',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          AMAZON_SP_API_CLIENT_ID: 'fixture-client-id',
          AMAZON_SP_API_CLIENT_SECRET: 'fixture-client-secret',
          AMAZON_SP_API_REFRESH_TOKEN: 'fixture-refresh-token',
          AMAZON_MARKETPLACE_IDS: 'ATVPDKIKX0DER',
        },
      },
    );
    const gate = JSON.parse(output) as {
      status: string;
      readinessPathSource: string;
      checks: Array<{ id: string; status: string; details: Record<string, unknown>; blockers: Array<{ type: string; missingItemCount?: number }> }>;
      blockers: Array<{ type: string; missingItemCount?: number }>;
      mappingCoverage: { totalRequiredItems: number; totalMappedItems: number; missingItemCount: number };
      safety: { networkCalls: number; businessDataWrites: number };
    };

    expect(output).not.toContain('fixture-client-secret');
    expect(gate.status).toBe('blocked');
    expect(gate.readinessPathSource).toBe('cli');
    expect(gate.checks.find((check) => check.id === 'authorizationRecord')?.status).toBe('ready');
    expect(gate.checks.find((check) => check.id === 'collectionWindow')?.status).toBe('ready');
    expect(gate.checks.find((check) => check.id === 'collectionWindow')?.details).toMatchObject({
      expectedStart: '2026-06-01',
      expectedEnd: '2026-06-15',
      configuredStart: '2026-06-01',
      configuredEnd: '2026-06-15',
    });
    expect(gate.checks.find((check) => check.id === 'ownerReview')?.status).toBe('ready');
    expect(gate.checks.find((check) => check.id === 'complianceReview')?.status).toBe('ready');
    expect(gate.checks.find((check) => check.id === 'snapshotScope')?.status).toBe('ready');
    expect(gate.checks.find((check) => check.id === 'privateBoundary')?.status).toBe('ready');
    expect(gate.checks.find((check) => check.id === 'mappingCoverage')?.blockers[0]).toMatchObject({
      type: 'mapping-coverage-blocked',
      missingItemCount: 66,
    });
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'mapping-coverage-blocked', missingItemCount: 66 })]));
    expect(gate.mappingCoverage).toMatchObject({
      totalRequiredItems: 67,
      totalMappedItems: 1,
      missingItemCount: 66,
    });
    expect(gate.safety).toMatchObject({ networkCalls: 0, businessDataWrites: 0 });
  });

  it('bootstraps Amazon private placeholder inputs without overwriting existing files', () => {
    const targetDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-'));

    try {
      const output = execFileSync('node', ['scripts/data/connectors/bootstrap-amazon-private-inputs.mjs', '--target-dir', targetDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const manifest = JSON.parse(output) as {
        targetDir: string;
        reportsDir: string;
        files: {
          mapping: { path: string; status: string; overwritten: boolean };
          readiness: { path: string; status: string; overwritten: boolean };
        };
        safety: {
          containsCredentialValues: boolean;
          containsBusinessAsinSkuValues: boolean;
          publicBundleAllowed: boolean;
          gitAllowed: boolean;
          overwritesExistingFilesByDefault: boolean;
        };
      };
      const mapping = JSON.parse(readFileSync(manifest.files.mapping.path, 'utf8')) as {
        privateData: boolean;
        mappings: Array<{ asin: string; sku: string; mappingOwner: string }>;
      };
      const readiness = JSON.parse(readFileSync(manifest.files.readiness.path, 'utf8')) as {
        privateData: boolean;
        readiness: { authorizationRecordId: string; authorizationOwner: string; reviewOwner: string };
      };

      expect(manifest.files.mapping).toMatchObject({ status: 'created', overwritten: false });
      expect(manifest.files.readiness).toMatchObject({ status: 'created', overwritten: false });
      expect(manifest.safety).toMatchObject({
        containsCredentialValues: false,
        containsBusinessAsinSkuValues: false,
        publicBundleAllowed: false,
        gitAllowed: false,
        overwritesExistingFilesByDefault: false,
      });
      expect(mapping.privateData).toBe(true);
      expect(mapping.mappings.every((item) => item.asin === '' && item.sku === '' && item.mappingOwner === '')).toBe(true);
      expect(readiness.privateData).toBe(true);
      expect(readiness.readiness.authorizationRecordId).toBe('');
      expect(readiness.readiness.authorizationOwner).toBe('');
      expect(readiness.readiness.reviewOwner).toBe('');
      expect(statSync(manifest.targetDir).mode & 0o777).toBe(0o700);
      expect(statSync(manifest.reportsDir).mode & 0o777).toBe(0o700);
      expect(statSync(manifest.files.mapping.path).mode & 0o777).toBe(0o600);
      expect(statSync(manifest.files.readiness.path).mode & 0o777).toBe(0o600);

      writeFileSync(manifest.files.readiness.path, '{"preserve":"existing-readiness"}\n');
      const secondOutput = execFileSync('node', ['scripts/data/connectors/bootstrap-amazon-private-inputs.mjs', '--target-dir', targetDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const secondManifest = JSON.parse(secondOutput) as typeof manifest;

      expect(secondManifest.files.mapping).toMatchObject({ status: 'exists', overwritten: false });
      expect(secondManifest.files.readiness).toMatchObject({ status: 'exists', overwritten: false });
      expect(readFileSync(manifest.files.readiness.path, 'utf8')).toContain('existing-readiness');
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it('prints and writes an Amazon manual readiness checklist without public or credential leakage', () => {
    const output = execFileSync('node', ['scripts/data/connectors/amazon-commerce-readiness-checklist.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toContain('# Amazon Commerce Private Input Readiness Checklist');
    expect(output).toContain('totalMinimumMappedItems: 67');
    expect(output).toContain('| [ ] | ds-007 | amazon.com | ATVPDKIKX0DER | 15 |');
    expect(output).toContain('| [ ] | ds-009 | amazon.com | ATVPDKIKX0DER | 25 |');
    expect(output).toContain('| [ ] | ds-010 | amazon.com | ATVPDKIKX0DER | 1 |');
    expect(output).toContain('authorizationRecordId');
    expect(output).toContain('complianceReviewStatus');
    expect(output).toContain('expectedSnapshotTypes: product_snapshot, review_snapshot, brand_share_snapshot, category_rank_snapshot');
    expect(output).not.toMatch(/clientSecret|refreshToken|accessToken|password|privateKey/i);

    const targetDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-checklist-'));
    const targetPath = join(targetDir, 'amazon-commerce-readiness-checklist.md');

    try {
      const writeOutput = execFileSync('node', ['scripts/data/connectors/amazon-commerce-readiness-checklist.mjs', '--write', targetPath], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const manifest = JSON.parse(writeOutput) as { checklist: { path: string; status: string; overwritten: boolean } };

      expect(manifest.checklist).toMatchObject({ status: 'created', overwritten: false });
      expect(readFileSync(manifest.checklist.path, 'utf8')).toContain('totalMinimumMappedItems: 67');
      expect(statSync(targetDir).mode & 0o777).toBe(0o700);
      expect(statSync(manifest.checklist.path).mode & 0o777).toBe(0o600);

      writeFileSync(targetPath, 'preserve existing checklist\n');
      const secondOutput = execFileSync('node', ['scripts/data/connectors/amazon-commerce-readiness-checklist.mjs', '--write', targetPath], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      const secondManifest = JSON.parse(secondOutput) as typeof manifest;

      expect(secondManifest.checklist).toMatchObject({ status: 'exists', overwritten: false });
      expect(readFileSync(targetPath, 'utf8')).toContain('preserve existing checklist');
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it('audits Amazon private inputs without exposing business or authorization values', () => {
    const targetDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-private-audit-'));
    const mappingPath = join(targetDir, 'amazon-commerce-mapping.json');
    const readinessPath = join(targetDir, 'amazon-commerce-readiness.json');
    const checklistPath = join(targetDir, 'amazon-commerce-readiness-checklist.md');
    const auditPath = join(targetDir, 'amazon-commerce-private-input-audit.json');

    try {
      writeFileSync(mappingPath, readFileSync(join(process.cwd(), 'tests/fixtures/amazon-commerce-mapping-partial-valid.json'), 'utf8'), { mode: 0o600 });
      writeFileSync(readinessPath, readFileSync(join(process.cwd(), 'tests/fixtures/amazon-commerce-readiness-partial-valid.json'), 'utf8'), { mode: 0o600 });
      chmodSync(mappingPath, 0o600);
      chmodSync(readinessPath, 0o600);
      execFileSync('node', ['scripts/data/connectors/amazon-commerce-readiness-checklist.mjs', '--write', checklistPath], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });

      const output = execFileSync('node', ['scripts/data/connectors/amazon-commerce-private-input-audit.mjs', '--private-dir', targetDir], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          AMAZON_SP_API_CLIENT_SECRET: 'fixture-client-secret',
        },
      });
      const audit = JSON.parse(output) as {
        status: string;
        mapping: {
          status: string;
          coverage: { totalRequiredItems: number; totalMappedItems: number; missingItemCount: number };
          sourceCoverage: Array<{ sourceId: string; mapped: number; missing: number; status: string }>;
        };
        readiness: { status: string };
        checklist: { status: string };
        blockers: Array<{ scope: string; type: string; missingItemCount?: number }>;
        safety: {
          credentialValuesRedacted: boolean;
          businessValuesRedacted: boolean;
          authorizationValuesRedacted: boolean;
          networkCalls: number;
          businessDataWrites: number;
          publicBundleAllowed: boolean;
          gitAllowed: boolean;
        };
      };

      expect(output).not.toContain('B0TEST0001');
      expect(output).not.toContain('FIXTURE-SKU-001');
      expect(output).not.toContain('Fixture Brand');
      expect(output).not.toContain('fixture-auth-record-20260602');
      expect(output).not.toContain('fixture-commerce-owner');
      expect(output).not.toContain('fixture-client-secret');
      expect(audit.status).toBe('blocked');
      expect(audit.mapping.status).toBe('blocked');
      expect(audit.mapping.coverage).toMatchObject({
        totalRequiredItems: 67,
        totalMappedItems: 1,
        missingItemCount: 66,
      });
      expect(audit.mapping.sourceCoverage.find((item) => item.sourceId === 'ds-010')).toMatchObject({
        mapped: 1,
        missing: 0,
        status: 'ready',
      });
      expect(audit.readiness.status).toBe('ready');
      expect(audit.checklist.status).toBe('ready');
      expect(audit.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ scope: 'mapping', type: 'mapping-coverage-blocked', missingItemCount: 66 })]));
      expect(audit.safety).toMatchObject({
        credentialValuesRedacted: true,
        businessValuesRedacted: true,
        authorizationValuesRedacted: true,
        networkCalls: 0,
        businessDataWrites: 0,
        publicBundleAllowed: false,
        gitAllowed: false,
      });

      const writeOutput = execFileSync(
        'node',
        ['scripts/data/connectors/amazon-commerce-private-input-audit.mjs', '--private-dir', targetDir, '--write', auditPath],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );
      const writeManifest = JSON.parse(writeOutput) as { audit: { status: string; overwritten: boolean; mode: string; path: string }; status: string };

      expect(writeManifest).toMatchObject({
        status: 'blocked',
        audit: { status: 'created', overwritten: false, mode: '600' },
      });
      expect(statSync(writeManifest.audit.path).mode & 0o777).toBe(0o600);
      expect(readFileSync(writeManifest.audit.path, 'utf8')).not.toContain('B0TEST0001');

      const secondWriteOutput = execFileSync(
        'node',
        ['scripts/data/connectors/amazon-commerce-private-input-audit.mjs', '--private-dir', targetDir, '--write', auditPath],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
        },
      );
      const secondWriteManifest = JSON.parse(secondWriteOutput) as typeof writeManifest;

      expect(secondWriteManifest.audit).toMatchObject({ status: 'exists', overwritten: false, mode: '600' });
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  }, SCRIPT_INTEGRATION_TIMEOUT_MS);

  it('archives Amazon mapping coverage reports with retention and private permissions', () => {
    const archiveDir = mkdtempSync(join(tmpdir(), 'mkt53-amazon-coverage-'));

    try {
      let manifest = {
        reportCount: 0,
        retainedReports: [] as string[],
        deletedReports: [] as string[],
        currentReportPath: '',
        latestReportPath: '',
        manifestPath: '',
        safety: { networkCalls: -1, businessDataWrites: -1, publicBundleAllowed: true, gitAllowed: true },
        mappingCoverage: { totalRequiredItems: 0, totalMappedItems: 0, missingItemCount: 0 },
      };

      for (let i = 0; i < 3; i += 1) {
        const output = execFileSync(
          'node',
          [
            'scripts/data/connectors/amazon-commerce-dry-run.mjs',
            '--archive-coverage-report',
            '--archive-dir',
            archiveDir,
            '--retention',
            '2',
            '--mapping',
            'tests/fixtures/amazon-commerce-mapping-partial-valid.json',
          ],
          {
            cwd: process.cwd(),
            encoding: 'utf8',
            env: {
              ...process.env,
              AMAZON_SP_API_CLIENT_ID: 'fixture-client-id',
              AMAZON_SP_API_CLIENT_SECRET: 'fixture-client-secret',
              AMAZON_SP_API_REFRESH_TOKEN: 'fixture-refresh-token',
              AMAZON_MARKETPLACE_IDS: 'ATVPDKIKX0DER',
            },
          },
        );

        expect(output).not.toContain('fixture-client-secret');
        manifest = JSON.parse(output) as typeof manifest;
      }

      const files = readdirSync(archiveDir);
      const retainedMarkdownReports = files.filter(
        (fileName) => fileName.startsWith('amazon-commerce-mapping-coverage-') && fileName.endsWith('.md') && !fileName.endsWith('-latest.md'),
      );

      expect(manifest.reportCount).toBe(2);
      expect(manifest.retainedReports).toHaveLength(2);
      expect(manifest.deletedReports).toHaveLength(1);
      expect(retainedMarkdownReports).toHaveLength(2);
      expect(files).toEqual(expect.arrayContaining(['amazon-commerce-mapping-coverage-latest.md', 'amazon-commerce-mapping-coverage-manifest.json']));
      expect(readFileSync(manifest.latestReportPath, 'utf8')).toContain('missingItemCount: 66');
      expect(readFileSync(manifest.manifestPath, 'utf8')).toContain('"reportCount": 2');
      expect(statSync(archiveDir).mode & 0o777).toBe(0o700);
      expect(statSync(manifest.latestReportPath).mode & 0o777).toBe(0o600);
      expect(statSync(manifest.manifestPath).mode & 0o777).toBe(0o600);
      expect(manifest.safety).toMatchObject({
        networkCalls: 0,
        businessDataWrites: 0,
        publicBundleAllowed: false,
        gitAllowed: false,
      });
      expect(manifest.mappingCoverage).toMatchObject({
        totalRequiredItems: 67,
        totalMappedItems: 1,
        missingItemCount: 66,
      });
    } finally {
      rmSync(archiveDir, { recursive: true, force: true });
    }
  }, SCRIPT_INTEGRATION_TIMEOUT_MS);
});
