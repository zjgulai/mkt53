import { useEffect, useState } from 'react';

import {
  derivePublicEvidenceView,
  parsePublicEvidenceManifest,
  type PublicEvidenceManifest,
  type PublicEvidenceStatus,
} from '@/lib/public-evidence';

let manifestRequest: Promise<PublicEvidenceManifest> | null = null;

export function fetchPublicEvidenceManifest(): Promise<PublicEvidenceManifest> {
  if (manifestRequest) return manifestRequest;

  manifestRequest = fetch('/periodic-data/public-evidence-samples.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('Public evidence samples unavailable.');
      return response.json() as Promise<unknown>;
    })
    .then((payload) => parsePublicEvidenceManifest(payload))
    .finally(() => {
      manifestRequest = null;
    });

  return manifestRequest;
}

export function usePublicEvidence(sourceId: string, page: string) {
  const [manifest, setManifest] = useState<PublicEvidenceManifest | null>(null);
  const [status, setStatus] = useState<PublicEvidenceStatus>('loading');

  useEffect(() => {
    let active = true;

    fetchPublicEvidenceManifest()
      .then((nextManifest) => {
        if (!active) return;
        setManifest(nextManifest);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setManifest(null);
        setStatus('missing');
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    manifest,
    status,
    ...derivePublicEvidenceView(manifest, status, sourceId, page),
  };
}
