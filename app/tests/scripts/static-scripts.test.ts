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
});
