import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const candidatePath = join(process.cwd(), 'configs/nginx/mkt53-portal-gate.candidate.conf');
const validatorPath = join(process.cwd(), 'scripts/quality/validate-p0-05-nginx-candidate.sh');
const candidate = readFileSync(candidatePath, 'utf8');
const validator = readFileSync(validatorPath, 'utf8');
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

describe('P0-05 nginx portal-gate candidate', () => {
  it('protects the complete mkt server surface with the shared portal auth contract', () => {
    expect(candidate).toContain('server_name mkt.lute-tlz-dddd.top;');
    expect(candidate).toContain('location = /_portal_auth');
    expect(candidate).toContain('internal;');
    expect(candidate).toContain('proxy_pass http://portal_auth/portal/auth;');
    expect(candidate).toContain('proxy_set_header Cookie $http_cookie;');
    expect(candidate).toContain('proxy_set_header X-Original-URI $request_uri;');
    expect(candidate).toContain('auth_request /_portal_auth;');
    expect(candidate).toContain(
      'error_page 401 =302 https://lute-tlz-dddd.top/login.html?next=$scheme://$host$request_uri;',
    );
    expect(candidate).toContain('add_header Cache-Control "private, no-store" always;');
  });

  it('pins the observed block hash and remains free of embedded credentials', () => {
    expect(candidate).toContain('4f78ab917e7c61508d374da5b318f4d49ce2de7da9f9142c76714b4eb9206342');
    expect(candidate).not.toMatch(/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/);
    expect(candidate).not.toMatch(/password\s*=|client_secret|bearer\s+[a-z0-9._-]+/i);
  });

  it('validates only an isolated local Docker fixture', () => {
    expect(packageJson.scripts['quality:p0-05-nginx-candidate']).toBe(
      'bash scripts/quality/validate-p0-05-nginx-candidate.sh',
    );
    expect(validator).toContain('L2-isolated-docker-fixture');
    expect(validator).toContain('"productionWrites": false');
    expect(validator).toContain('127.0.0.1::443');
    expect(validator).not.toMatch(/\b(?:ssh|scp|rsync)\b/);
    expect(validator).not.toContain('101.34.52.232');
    expect(validator).not.toContain('/opt/ai-video');
  });
});
