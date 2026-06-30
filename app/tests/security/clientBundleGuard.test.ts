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
  /18%份额\+12\.8%增速/,
  /\$1\.16B/,
  /\$268M/,
  /17%\+增速/,
  /电商渠道12%\+增速/,
  /\+300%配件增长/,
  /2026 Nielsen研究：33%/,
  /activeSection === 'flavor-details'/,
  /activeSection === 'supply-details'/,
  /activeSection === 'ip-details'/,
  /activeSection === 'macro-details'/,
  /function SupplyChainSection/,
  /function MacroSection/,
  /const macroRegions/,
  /const materialPriceData/,
  /19\.32% 全球第一/,
  /22\.21% 北美第一/,
  /20\.2% 欧洲第一/,
  /520\+.*授权专利/,
  /330\+.*注册商标/,
  /授权专利.*520\+/,
  /注册商标.*330\+/,
  /准确率突破95%/,
  /成本下降40%/,
  /匹配率提升30%/,
  /基于500万\+消费者评论/,
  /增长18\.2%.*APP智能控制/,
  /800\+展商.*15000访客/,
  /国际展商占比.*91%/,
  /专业访客.*15,000/,
  /Hall 10\.1 C-020\/D-021/,
  /€280\/㎡起/,
  /label: '上层TAM'[\s\S]{0,260}sourceIds: \['ds-001'\]/,
  /label: '品类TAM'[\s\S]{0,260}sourceIds: \['ds-044'\]/,
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
