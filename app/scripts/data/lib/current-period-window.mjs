import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_MANIFEST_PATH = 'public/periodic-data/latest.json';

function isIsoDate(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validateWindow(windowStart, windowEnd, source) {
  if (!isIsoDate(windowStart) || !isIsoDate(windowEnd)) {
    throw new Error(`${source} must provide valid ISO collection-window dates.`);
  }
  if (windowStart > windowEnd) {
    throw new Error(`${source} collection window start must not be after its end.`);
  }
}

export function resolveCurrentPeriodWindow({
  windowStart,
  windowEnd,
  manifestPath = process.env.MKT53_PERIODIC_MANIFEST_PATH ?? DEFAULT_MANIFEST_PATH,
  appRoot = process.cwd(),
} = {}) {
  const hasExplicitStart = typeof windowStart === 'string' && windowStart.length > 0;
  const hasExplicitEnd = typeof windowEnd === 'string' && windowEnd.length > 0;

  if (hasExplicitStart !== hasExplicitEnd) {
    throw new Error('--window-start and --window-end must be provided together.');
  }
  if (hasExplicitStart && hasExplicitEnd) {
    validateWindow(windowStart, windowEnd, 'Explicit');
    return {
      windowStart,
      windowEnd,
      period: undefined,
      source: 'cli',
      manifestPath: undefined,
    };
  }

  const resolvedManifestPath = resolve(appRoot, manifestPath);
  const manifest = JSON.parse(readFileSync(resolvedManifestPath, 'utf8'));
  validateWindow(manifest.windowStart, manifest.windowEnd, 'Periodic manifest');

  return {
    windowStart: manifest.windowStart,
    windowEnd: manifest.windowEnd,
    period: typeof manifest.period === 'string' ? manifest.period : undefined,
    source: 'periodic-manifest',
    manifestPath: resolvedManifestPath,
  };
}

