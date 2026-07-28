import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchPublicEvidenceManifest } from '../../src/hooks/usePublicEvidence';

import {
  derivePublicEvidenceView,
  isEligibleCapturedPublicEvidenceRecord,
  parsePublicEvidenceManifest,
  summarizePublicEvidenceSafety,
  type PublicEvidenceRecord,
} from '../../src/lib/public-evidence';

const eligibleRecord: PublicEvidenceRecord = {
  seedId: 'seed-1',
  sourceId: 'ds-008',
  page: 'NewCompetition',
  evidenceClass: 'official-product-page',
  captureStatus: 'captured',
  capturedAt: '2026-07-28T00:00:00.000Z',
  title: 'Official product page',
  label: 'Official product page',
  url: 'https://example.com/product',
  finalUrl: 'https://example.com/product',
  collectionBoundary: 'Public page only.',
  notFullPlatformDataset: true,
  publicBundleAllowed: true,
  rawTextPublicBundleAllowed: false,
  screenshotPublicBundleAllowed: false,
  matchedEvidenceTerms: ['Product'],
  missingEvidenceTerms: [],
  nonVerbatimSummary: 'Official public product page evidence.',
  visibleTextHash: 'a'.repeat(64),
  warnings: [],
  pageErrors: [],
  validation: { valid: true, missingFields: [], urlValid: true, termsValid: true, boundaryValid: true },
  safety: {
    networkCalls: 1,
    loginAttempted: false,
    bypassAttempted: false,
    businessDataWrites: 0,
    rawTextWrittenToPublicBundle: false,
  },
};

describe('public evidence runtime gate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deduplicates only in-flight requests and revalidates after they settle', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            mode: 'live-browser-capture',
            generatedAt: '2026-07-28T00:00:00.000Z',
            records: [eligibleRecord],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const firstRequest = fetchPublicEvidenceManifest();
    const concurrentRequest = fetchPublicEvidenceManifest();

    expect(concurrentRequest).toBe(firstRequest);
    await Promise.all([firstRequest, concurrentRequest]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await fetchPublicEvidenceManifest();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/periodic-data/public-evidence-samples.json', { cache: 'no-store' });
  });

  it('rejects malformed manifests before the UI enters ready state', () => {
    expect(() => parsePublicEvidenceManifest({ mode: 'dry-run', generatedAt: 'not-a-date', records: [] })).toThrow(
      'generatedAt is invalid',
    );
    expect(() =>
      parsePublicEvidenceManifest({ mode: 'dry-run', generatedAt: '2026-02-30T00:00:00.000Z', records: [] }),
    ).toThrow('generatedAt is invalid');
    expect(() => parsePublicEvidenceManifest({ mode: 'dry-run', generatedAt: '2026-07-28T00:00:00.000Z' })).toThrow(
      'records are invalid',
    );
    expect(() =>
      parsePublicEvidenceManifest({
        mode: 'live',
        generatedAt: '2026-07-28T00:00:00.000Z',
        records: [{ ...eligibleRecord, title: 123 }],
      }),
    ).toThrow('records are invalid');
    expect(() =>
      parsePublicEvidenceManifest({
        mode: 'live-browser-capture',
        generatedAt: '2026-07-28T00:00:00.000Z',
        records: [
          {
            ...eligibleRecord,
            validation: { ...eligibleRecord.validation!, missingFields: ['url'], urlValid: false },
          },
        ],
      }),
    ).toThrow('records are invalid');
    expect(() =>
      parsePublicEvidenceManifest({
        mode: 'live-browser-capture',
        generatedAt: '2026-07-28T00:00:00.000Z',
        records: [
          {
            ...eligibleRecord,
            validation: { ...eligibleRecord.validation!, valid: false },
          },
        ],
      }),
    ).toThrow('records are invalid');
    const recordWithoutSafety = Object.fromEntries(Object.entries(eligibleRecord).filter(([key]) => key !== 'safety'));
    expect(() =>
      parsePublicEvidenceManifest({
        mode: 'live',
        generatedAt: '2026-07-28T00:00:00.000Z',
        records: [recordWithoutSafety],
      }),
    ).toThrow('records are invalid');
    expect(() =>
      parsePublicEvidenceManifest({
        mode: 'live',
        generatedAt: '2026-07-28T00:00:00.000Z',
        records: [{ ...eligibleRecord, safety: { ...eligibleRecord.safety, networkCalls: undefined } }],
      }),
    ).toThrow('records are invalid');
  });

  it('accepts only fully validated, safe captured evidence for display', () => {
    const manifest = parsePublicEvidenceManifest({
      mode: 'live',
      generatedAt: '2026-07-28T00:00:00.000Z',
      records: [eligibleRecord],
    });

    expect(isEligibleCapturedPublicEvidenceRecord(manifest.records[0], manifest.mode)).toBe(false);
    expect(isEligibleCapturedPublicEvidenceRecord(manifest.records[0], 'live-browser-capture')).toBe(true);
    expect(isEligibleCapturedPublicEvidenceRecord(manifest.records[0], 'dry-run')).toBe(false);
    expect(
      isEligibleCapturedPublicEvidenceRecord(
        { ...eligibleRecord, visibleTextHash: 'not-a-sha256' },
        'live-browser-capture',
      ),
    ).toBe(false);
    expect(
      isEligibleCapturedPublicEvidenceRecord(
        { ...eligibleRecord, finalUrl: 'https://redirected.example/product' },
        'live-browser-capture',
      ),
    ).toBe(false);
    expect(
      isEligibleCapturedPublicEvidenceRecord(
        {
          ...eligibleRecord,
          validation: { ...eligibleRecord.validation!, missingFields: ['url'], urlValid: false },
        },
        'live-browser-capture',
      ),
    ).toBe(false);
    expect(
      isEligibleCapturedPublicEvidenceRecord({
        ...eligibleRecord,
        missingEvidenceTerms: ['Product'],
        warnings: ['expected evidence terms were not matched in visible text'],
      }, 'live-browser-capture'),
    ).toBe(false);
    expect(
      isEligibleCapturedPublicEvidenceRecord({
        ...eligibleRecord,
        missingEvidenceTerms: undefined,
      }, 'live-browser-capture'),
    ).toBe(false);
    expect(
      isEligibleCapturedPublicEvidenceRecord({
        ...eligibleRecord,
        warnings: undefined,
      }, 'live-browser-capture'),
    ).toBe(false);
    expect(
      isEligibleCapturedPublicEvidenceRecord({
        ...eligibleRecord,
        pageErrors: undefined,
      }, 'live-browser-capture'),
    ).toBe(false);
    expect(
      isEligibleCapturedPublicEvidenceRecord({
        ...eligibleRecord,
        safety: { ...eligibleRecord.safety, loginAttempted: true },
      }, 'live-browser-capture'),
    ).toBe(false);
    expect(
      isEligibleCapturedPublicEvidenceRecord({
        ...eligibleRecord,
        safety: { ...eligibleRecord.safety, businessDataWrites: 1 },
      }, 'live-browser-capture'),
    ).toBe(false);
  });

  it('keeps rejected record activity in page-scoped safety totals', () => {
    const rejectedRecord: PublicEvidenceRecord = {
      ...eligibleRecord,
      seedId: 'seed-rejected',
      warnings: ['login surface detected'],
      safety: {
        ...eligibleRecord.safety,
        networkCalls: 2,
        loginAttempted: true,
        businessDataWrites: 1,
      },
    };

    expect(isEligibleCapturedPublicEvidenceRecord(rejectedRecord, 'live-browser-capture')).toBe(false);
    expect(summarizePublicEvidenceSafety([eligibleRecord, rejectedRecord])).toEqual({
      networkCalls: 3,
      businessDataWrites: 1,
    });
  });

  it('fails the scoped display closed when any matching record violates the safety boundary', () => {
    const unsafeSibling: PublicEvidenceRecord = {
      ...eligibleRecord,
      seedId: 'seed-unsafe-sibling',
      safety: {
        ...eligibleRecord.safety,
        loginAttempted: true,
        businessDataWrites: 1,
      },
    };
    const manifest = parsePublicEvidenceManifest({
      mode: 'live-browser-capture',
      generatedAt: '2026-07-28T00:00:00.000Z',
      records: [eligibleRecord, unsafeSibling, { ...eligibleRecord, seedId: 'other-page', page: 'CompetitionPage' }],
    });

    const view = derivePublicEvidenceView(manifest, 'ready', 'ds-008', 'NewCompetition');

    expect(view.evidence.map((record) => record.seedId)).toEqual(['seed-1', 'seed-unsafe-sibling']);
    expect(view.safety).toEqual({ networkCalls: 2, businessDataWrites: 1 });
    expect(view.safetyBoundaryReady).toBe(false);
    expect(view.eligibleEvidence).toEqual([]);
    expect(view.statusLabel).toBe('safety boundary blocked · writes=1');
  });
});
