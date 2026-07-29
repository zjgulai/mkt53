export interface PublicEvidenceValidation {
  valid: boolean;
  missingFields: string[];
  urlValid: boolean;
  termsValid: boolean;
  boundaryValid: boolean;
}

export interface PublicEvidenceSafety {
  networkCalls: number;
  loginAttempted: boolean;
  bypassAttempted: boolean;
  businessDataWrites: number;
  rawTextWrittenToPublicBundle: boolean;
}

export interface PublicEvidenceRecord {
  seedId: string;
  sourceId: string;
  page: string;
  metric?: string;
  evidenceClass: string;
  captureStatus: string;
  capturedAt?: string;
  title?: string;
  label?: string;
  url: string;
  finalUrl?: string;
  collectionBoundary: string;
  notFullPlatformDataset: boolean;
  publicBundleAllowed?: boolean;
  rawTextPublicBundleAllowed?: boolean;
  screenshotPublicBundleAllowed?: boolean;
  matchedEvidenceTerms?: string[];
  missingEvidenceTerms?: string[];
  nonVerbatimSummary?: string;
  visibleTextHash?: string;
  warnings?: string[];
  pageErrors?: string[];
  validation?: PublicEvidenceValidation;
  safety: PublicEvidenceSafety;
}

export interface PublicEvidenceManifest {
  mode: string;
  generatedAt: string;
  summary?: {
    total: number;
    captureStatusCounts?: Record<string, number>;
    evidenceClassCounts?: Record<string, number>;
    networkCalls?: number;
    businessDataWrites: number;
  };
  records: PublicEvidenceRecord[];
}

export type PublicEvidenceStatus = 'loading' | 'ready' | 'missing';

export interface PublicEvidenceView {
  evidence: PublicEvidenceRecord[];
  eligibleEvidence: PublicEvidenceRecord[];
  safety: Pick<PublicEvidenceSafety, 'networkCalls' | 'businessDataWrites'>;
  safetyBoundaryReady: boolean;
  statusLabel: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isOptionalStringArray(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isSha256(value: string | undefined): boolean {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

function isConsistentValidation(value: unknown): value is PublicEvidenceValidation {
  if (!isRecord(value) || typeof value.valid !== 'boolean') return false;
  if (!Array.isArray(value.missingFields) || !value.missingFields.every((field) => typeof field === 'string')) return false;
  if (typeof value.urlValid !== 'boolean' || typeof value.termsValid !== 'boolean' || typeof value.boundaryValid !== 'boolean') {
    return false;
  }

  const derivedValid =
    value.missingFields.length === 0 && value.urlValid === true && value.termsValid === true && value.boundaryValid === true;
  return value.valid === derivedValid;
}

function isPublicEvidenceRecord(value: unknown): value is PublicEvidenceRecord {
  if (!isRecord(value)) return false;

  const requiredStrings = ['seedId', 'sourceId', 'page', 'evidenceClass', 'captureStatus', 'url', 'collectionBoundary'];
  if (!requiredStrings.every((key) => typeof value[key] === 'string' && String(value[key]).trim().length > 0)) return false;
  if (typeof value.notFullPlatformDataset !== 'boolean') return false;
  const optionalStrings = ['metric', 'capturedAt', 'title', 'label', 'finalUrl', 'nonVerbatimSummary', 'visibleTextHash'];
  if (optionalStrings.some((key) => !isOptionalString(value[key]))) return false;
  const optionalBooleans = ['publicBundleAllowed', 'rawTextPublicBundleAllowed', 'screenshotPublicBundleAllowed'];
  if (optionalBooleans.some((key) => !isOptionalBoolean(value[key]))) return false;
  if (!isOptionalStringArray(value.matchedEvidenceTerms) || !isOptionalStringArray(value.missingEvidenceTerms)) return false;
  if (!isOptionalStringArray(value.warnings) || !isOptionalStringArray(value.pageErrors)) return false;

  if (value.validation !== undefined) {
    if (!isConsistentValidation(value.validation)) return false;
  }

  if (!isRecord(value.safety)) return false;
  const safety = value.safety;
  const numericFields = ['networkCalls', 'businessDataWrites'];
  const booleanFields = ['loginAttempted', 'bypassAttempted', 'rawTextWrittenToPublicBundle'];
  if (numericFields.some((key) => !isNonNegativeNumber(safety[key]))) return false;
  if (booleanFields.some((key) => typeof safety[key] !== 'boolean')) return false;

  return true;
}

export function parsePublicEvidenceManifest(value: unknown): PublicEvidenceManifest {
  if (!isRecord(value)) throw new Error('Public evidence manifest must be an object.');
  if (typeof value.mode !== 'string' || value.mode.trim().length === 0) {
    throw new Error('Public evidence manifest mode is missing.');
  }
  if (!isCanonicalIsoTimestamp(value.generatedAt)) {
    throw new Error('Public evidence manifest generatedAt is invalid.');
  }
  if (!Array.isArray(value.records) || !value.records.every(isPublicEvidenceRecord)) {
    throw new Error('Public evidence manifest records are invalid.');
  }

  return value as unknown as PublicEvidenceManifest;
}

function isHttpsUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function hasSameHttpsOrigin(sourceUrl: string | undefined, finalUrl: string | undefined): boolean {
  if (!isHttpsUrl(sourceUrl) || !isHttpsUrl(finalUrl)) return false;
  return new URL(sourceUrl).origin === new URL(finalUrl).origin;
}

export function isEligibleCapturedPublicEvidenceRecord(
  record: PublicEvidenceRecord,
  manifestMode: string | undefined,
): boolean {
  return (
    manifestMode === 'live-browser-capture' &&
    record.captureStatus === 'captured' &&
    isConsistentValidation(record.validation) &&
    record.validation.valid === true &&
    record.notFullPlatformDataset === true &&
    record.publicBundleAllowed === true &&
    record.rawTextPublicBundleAllowed === false &&
    record.screenshotPublicBundleAllowed === false &&
    hasSameHttpsOrigin(record.url, record.finalUrl) &&
    isNonEmptyString(record.title) &&
    isSha256(record.visibleTextHash) &&
    isNonEmptyString(record.nonVerbatimSummary) &&
    (record.matchedEvidenceTerms?.length ?? 0) > 0 &&
    Array.isArray(record.missingEvidenceTerms) &&
    record.missingEvidenceTerms.length === 0 &&
    Array.isArray(record.warnings) &&
    record.warnings.length === 0 &&
    Array.isArray(record.pageErrors) &&
    record.pageErrors.length === 0 &&
    record.safety.networkCalls === 1 &&
    record.safety.loginAttempted === false &&
    record.safety.bypassAttempted === false &&
    record.safety.businessDataWrites === 0 &&
    record.safety.rawTextWrittenToPublicBundle === false
  );
}

export function summarizePublicEvidenceSafety(
  records: PublicEvidenceRecord[],
): Pick<PublicEvidenceSafety, 'networkCalls' | 'businessDataWrites'> {
  return records.reduce(
    (summary, record) => ({
      networkCalls: summary.networkCalls + record.safety.networkCalls,
      businessDataWrites: summary.businessDataWrites + record.safety.businessDataWrites,
    }),
    { networkCalls: 0, businessDataWrites: 0 },
  );
}

export function derivePublicEvidenceView(
  manifest: PublicEvidenceManifest | null,
  status: PublicEvidenceStatus,
  sourceId: string,
  page: string,
): PublicEvidenceView {
  const evidence = (manifest?.records ?? []).filter((record) => record.sourceId === sourceId && record.page === page);
  const safety = summarizePublicEvidenceSafety(evidence);
  const safetyBoundaryReasons = [
    evidence.some((record) => record.safety.loginAttempted) ? 'login attempted' : null,
    evidence.some((record) => record.safety.bypassAttempted) ? 'bypass attempted' : null,
    safety.businessDataWrites > 0 ? `writes=${safety.businessDataWrites}` : null,
    evidence.some((record) => record.safety.rawTextWrittenToPublicBundle) ? 'raw text written' : null,
  ].filter((reason): reason is string => reason !== null);
  const safetyBoundaryReady = safetyBoundaryReasons.length === 0;
  const eligibleCandidates = evidence.filter((record) => isEligibleCapturedPublicEvidenceRecord(record, manifest?.mode));
  const eligibleEvidence = safetyBoundaryReady ? eligibleCandidates : [];
  const statusLabel =
    status !== 'ready'
      ? status
      : safetyBoundaryReady
        ? `${eligibleEvidence.length}/${evidence.length} eligible captured`
        : `safety boundary blocked · ${safetyBoundaryReasons.join(', ')}`;

  return {
    evidence,
    eligibleEvidence,
    safety,
    safetyBoundaryReady,
    statusLabel,
  };
}
