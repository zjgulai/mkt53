import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{30,}/,
  /ghp_[A-Za-z0-9_]{30,}/,
  /Authorization:\s*Bearer/i,
  /code-path=/,
  /react-simple-maps/,
  /2026-08452/,
  /官网必须嵌入实时可验证合规声明/,
  /官网须嵌入实时可验证合规声明/,
  /已验证原文/,
];

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return collectFiles(path);
    }

    return /\.(ts|tsx|js|jsx|json)$/.test(name) ? [path] : [];
  });
}

describe('client bundle guard', () => {
  it('keeps known client-side secret and debug markers out of source files', () => {
    const files = [
      ...collectFiles(join(ROOT, 'src')),
      join(ROOT, 'vite.config.ts'),
      join(ROOT, 'package.json'),
    ];

    const matches = files.flatMap((file) => {
      const content = readFileSync(file, 'utf8');

      return SECRET_PATTERNS.flatMap((pattern) => (
        pattern.test(content) ? [`${file}: ${pattern.source}`] : []
      ));
    });

    expect(matches).toEqual([]);
  });
});
