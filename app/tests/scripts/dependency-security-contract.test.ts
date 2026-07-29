import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type PackageManifest = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  engines: Record<string, string>;
};

const packageManifest = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as PackageManifest;
const retiredRouterPackage = ['react-router', 'dom'].join('-');

function numericVersion(versionRange: string) {
  const match = versionRange.match(/\d+(?:\.\d+){0,2}/);

  if (!match) {
    throw new Error(`Cannot read a numeric version from "${versionRange}".`);
  }

  return match[0].split('.').map(Number);
}

function isAtLeast(versionRange: string, minimum: string) {
  const version = numericVersion(versionRange);
  const floor = numericVersion(minimum);

  for (let index = 0; index < Math.max(version.length, floor.length); index += 1) {
    const actualPart = version[index] ?? 0;
    const floorPart = floor[index] ?? 0;

    if (actualPart !== floorPart) {
      return actualPart > floorPart;
    }
  }

  return true;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return sourceFiles(entryPath);
    }

    return ['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(extname(entry.name))
      ? [entryPath]
      : [];
  });
}

describe('dependency security floors', () => {
  it('keeps the React Router v8 migration and its React runtime floor', () => {
    expect(isAtLeast(packageManifest.engines.node, '22.22.0')).toBe(true);
    expect(packageManifest.dependencies).not.toHaveProperty(retiredRouterPackage);
    expect(isAtLeast(packageManifest.dependencies['react-router'], '8.3.0')).toBe(true);
    expect(isAtLeast(packageManifest.dependencies.react, '19.2.7')).toBe(true);
    expect(isAtLeast(packageManifest.dependencies['react-dom'], '19.2.7')).toBe(true);
  });

  it('keeps the audited lint and PostCSS toolchain above the remediated floors', () => {
    expect(isAtLeast(packageManifest.devDependencies.eslint, '10.8.0')).toBe(true);
    expect(isAtLeast(packageManifest.devDependencies['@eslint/js'], '10.0.1')).toBe(true);
    expect(isAtLeast(packageManifest.devDependencies['typescript-eslint'], '8.65.0')).toBe(true);
    expect(isAtLeast(packageManifest.devDependencies.postcss, '8.5.18')).toBe(true);
    expect(isAtLeast(packageManifest.devDependencies['eslint-plugin-react-hooks'], '7.1.1')).toBe(true);
    expect(isAtLeast(packageManifest.devDependencies['eslint-plugin-react-refresh'], '0.5.3')).toBe(true);
  });

  it('does not reintroduce imports from the retired router compatibility package', () => {
    const offenders = ['src', 'tests']
      .flatMap((directory) => sourceFiles(resolve(process.cwd(), directory)))
      .filter((filePath) => readFileSync(filePath, 'utf8').includes(retiredRouterPackage));

    expect(offenders).toEqual([]);
  });
});
