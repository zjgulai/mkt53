import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readJsonObject(path, label, { cwd = process.cwd() } = {}) {
  if (!path) return undefined;

  const payload = JSON.parse(readFileSync(resolve(cwd, path), 'utf8'));
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload;

  throw new Error(`${label} must be a JSON object.`);
}

export function unwrapJsonObject(payload, propertyName) {
  if (!payload) return undefined;
  const nestedValue = payload[propertyName];
  if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) return nestedValue;
  return payload;
}

export function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function numberValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
}

export function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

export function findForbiddenKeys(value, patterns, prefix = '') {
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const ownMatches = patterns.some((pattern) => pattern.test(key)) ? [path] : [];
    return [...ownMatches, ...findForbiddenKeys(nestedValue, patterns, path)];
  });
}

export function buildCheck(id, label, ready, details, blocker) {
  return {
    id,
    label,
    status: ready ? 'ready' : 'blocked',
    details,
    blockers: ready || !blocker ? [] : [blocker],
  };
}

export function readinessValue(readiness, sidecar, key) {
  if (readiness && readiness[key] !== undefined) return readiness[key];
  if (sidecar && sidecar[key] !== undefined) return sidecar[key];
  return undefined;
}

export function configuredPathSource({ explicitPath, envPath, envName }) {
  if (explicitPath) return 'cli';
  if (envPath) return `env:${envName}`;
  return 'none';
}
