import { execFileSync } from 'node:child_process';
import { accessSync, constants, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('production helper scripts', () => {
  it('keeps deploy-static executable and guarded by local quality gates', () => {
    const scriptPath = join(process.cwd(), 'scripts/deploy-static.sh');
    const script = readFileSync(scriptPath, 'utf8');

    expect(() => accessSync(scriptPath, constants.X_OK)).not.toThrow();
    expect(script).toContain('npm run test');
    expect(script).toContain('npm run lint');
    expect(script).toContain('npm audit');
    expect(script).toContain('npm run build');
    expect(script).toContain('rsync -az --delete');
  });

  it('keeps production smoke checks focused on routing, assets, and known leak markers', () => {
    const scriptPath = join(process.cwd(), 'scripts/smoke-prod.sh');
    const script = readFileSync(scriptPath, 'utf8');

    expect(() => accessSync(scriptPath, constants.X_OK)).not.toThrow();
    expect(script).toContain('/market/trend');
    expect(script).toContain('/industry/regulation');
    expect(script).toContain('/ai-assistant/design');
    expect(script).toContain('react-simple-maps');
    expect(script).toContain('2026-08452');
    expect(script).toContain('/images/world-map.jpg');
  });

  it('keeps weekly data collection scripts discoverable from npm', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { scripts: Record<string, string> };

    expect(packageJson.scripts['data:audit']).toContain('scripts/data/audit-consistency.mjs');
    expect(packageJson.scripts['data:collect:weekly']).toContain('scripts/data/collect-weekly-sources.mjs');
    expect(packageJson.scripts['data:refresh:weekly']).toContain('scripts/data/refresh-weekly-data.mjs');
    expect(packageJson.scripts['data:deploy:weekly']).toContain('scripts/data/weekly-refresh-and-deploy.sh');
    expect(packageJson.scripts['data:publish:weekly:local']).toContain('scripts/data/weekly-refresh-local-static.sh');

    for (const script of [
      'scripts/data/audit-consistency.mjs',
      'scripts/data/collect-weekly-sources.mjs',
      'scripts/data/refresh-weekly-data.mjs',
      'scripts/data/weekly-refresh-and-deploy.sh',
      'scripts/data/weekly-refresh-local-static.sh',
      'scripts/data/install-weekly-cron.sh',
    ]) {
      expect(() => accessSync(join(process.cwd(), script), constants.X_OK)).not.toThrow();
    }
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
        criticalIssueCount: number;
        collectionMethods: Record<string, number>;
      };
    };

    expect(audit.summary.tableCount).toBe(27);
    expect(audit.summary.sourceRegistryCount).toBe(26);
    expect(audit.summary.tableGovernanceCount).toBe(27);
    expect(audit.summary.criticalIssueCount).toBe(0);
    expect(audit.summary.collectionMethods['connector-required']).toBeGreaterThan(0);
    expect(audit.summary.collectionMethods['public-url-check']).toBeGreaterThan(0);
  });
});
