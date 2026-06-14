import { basename, dirname, resolve } from 'node:path';

const defaultBlockedPrivatePathSegments = new Set(['public', 'src', 'tests', 'fixtures', 'dist', 'node_modules']);

export function pathSegments(path, { cwd = process.cwd() } = {}) {
  return resolve(cwd, path)
    .split(/[\\/]+/)
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());
}

export function isPrivatePath(path, { cwd = process.cwd() } = {}) {
  const target = resolve(cwd, path);
  const segments = pathSegments(path, { cwd });
  return (
    segments.includes('private') ||
    basename(target).toLowerCase().includes('private') ||
    basename(dirname(target)).toLowerCase().includes('private')
  );
}

export function assertSafePrivatePath(
  path,
  label,
  { cwd = process.cwd(), blockedSegments = defaultBlockedPrivatePathSegments } = {},
) {
  const target = resolve(cwd, path);
  const blockedSegment = pathSegments(target, { cwd }).find((segment) => blockedSegments.has(segment));
  if (blockedSegment) throw new Error(`Refusing to use Amazon ${label} inside ${blockedSegment}: ${target}`);
  if (!isPrivatePath(target, { cwd })) throw new Error(`Refusing to use Amazon ${label} outside a private directory: ${target}`);
  return target;
}
