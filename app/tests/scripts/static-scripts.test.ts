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
    expect(packageJson.scripts['data:connector:amazon:dry-run']).toContain('scripts/data/connectors/amazon-commerce-dry-run.mjs');
    expect(packageJson.scripts['data:connector:amazon:mapping:validate']).toContain('--json --no-write');
    expect(packageJson.scripts['data:connector:amazon:mapping:template']).toContain('--print-mapping-template');
    expect(packageJson.scripts['data:connector:amazon:mapping:coverage']).toContain('--coverage-report');
    expect(packageJson.scripts['data:deploy:weekly']).toContain('scripts/data/weekly-refresh-and-deploy.sh');
    expect(packageJson.scripts['data:publish:weekly:local']).toContain('scripts/data/weekly-refresh-local-static.sh');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-weekly-data.mjs'), 'utf8')).toContain('public/weekly-data/latest.json');
    expect(readFileSync(join(process.cwd(), 'scripts/data/refresh-weekly-data.mjs'), 'utf8')).toContain('public/weekly-data/connectors.json');

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

    expect(() => accessSync(join(process.cwd(), 'scripts/data/lib/connector-backlog.mjs'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/amazon-commerce-dry-run.mjs'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'scripts/data/connectors/templates/amazon-commerce-mapping-template.json'), constants.R_OK)).not.toThrow();
    expect(() => accessSync(join(process.cwd(), 'tests/fixtures/amazon-commerce-mapping-partial-valid.json'), constants.R_OK)).not.toThrow();
    expect(readFileSync(join(process.cwd(), '..', '.gitignore'), 'utf8')).toContain('app/configs/private/');
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
        pagesWithStaticDataWithoutRegistry: number;
        issueCount: number;
        criticalIssueCount: number;
        collectionMethods: Record<string, number>;
      };
    };

    expect(audit.summary.tableCount).toBe(27);
    expect(audit.summary.sourceRegistryCount).toBe(45);
    expect(audit.summary.tableGovernanceCount).toBe(27);
    expect(audit.summary.pagesWithStaticDataWithoutRegistry).toBe(0);
    expect(audit.summary.issueCount).toBe(0);
    expect(audit.summary.criticalIssueCount).toBe(0);
    expect(audit.summary.collectionMethods['connector-required']).toBeGreaterThan(0);
    expect(audit.summary.collectionMethods['public-url-check']).toBeGreaterThan(0);
  });

  it('builds a connector backlog without claiming restricted sources were collected', () => {
    const output = execFileSync('node', ['scripts/data/collect-weekly-sources.mjs', '--json', '--no-network'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const manifest = JSON.parse(output) as {
      connectorBacklog: {
        total: number;
        groupCount: number;
        groups: Array<{ connectorId: string; sourceCount: number; sourceIds: string[] }>;
        items: Array<{ id: string; connectorId: string; blockedReason: string }>;
      };
      totals: Record<string, number>;
    };

    expect(manifest.connectorBacklog.total).toBe(23);
    expect(manifest.connectorBacklog.groupCount).toBeGreaterThanOrEqual(8);
    expect(manifest.connectorBacklog.groups.find((group) => group.connectorId === 'amazon-commerce')?.sourceCount).toBeGreaterThan(0);
    expect(manifest.connectorBacklog.groups.find((group) => group.connectorId === 'review-nlp')?.sourceIds).toEqual(
      expect.arrayContaining(['ds-021', 'ds-030', 'ds-032', 'ds-033']),
    );
    expect(manifest.connectorBacklog.items.every((item) => item.blockedReason.includes('不得伪造'))).toBe(true);
    expect(manifest.totals['connector-required']).toBe(23);
  });

  it('runs the Amazon commerce connector in blocked dry-run mode without leaking credentials', () => {
    const output = execFileSync('node', ['scripts/data/connectors/amazon-commerce-dry-run.mjs', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        AMAZON_SP_API_CLIENT_SECRET: 'SHOULD_NOT_LEAK_IN_DRY_RUN',
      },
    });
    const dryRun = JSON.parse(output) as {
      connectorId: string;
      mode: string;
      status: string;
      sourceCount: number;
      sourceIds: string[];
      safety: { networkCalls: number; businessDataWrites: number; credentialValuesRedacted: boolean };
      mapping: { missingSourceIds: string[] };
      blockers: Array<{ type: string; key?: string; sourceId?: string }>;
      snapshotContracts: Array<{ snapshotType: string; requiredFields: string[] }>;
    };

    expect(output).not.toContain('SHOULD_NOT_LEAK_IN_DRY_RUN');
    expect(dryRun.connectorId).toBe('amazon-commerce');
    expect(dryRun.mode).toBe('dry-run');
    expect(dryRun.status).toBe('blocked');
    expect(dryRun.sourceCount).toBe(7);
    expect(dryRun.sourceIds).toEqual(expect.arrayContaining(['ds-007', 'ds-009', 'ds-010', 'ds-019', 'ds-037', 'ds-038', 'ds-039']));
    expect(dryRun.safety.networkCalls).toBe(0);
    expect(dryRun.safety.businessDataWrites).toBe(0);
    expect(dryRun.safety.credentialValuesRedacted).toBe(true);
    expect(dryRun.mapping.missingSourceIds).toEqual(expect.arrayContaining(dryRun.sourceIds));
    expect(dryRun.blockers.some((item) => item.type === 'missing-credential')).toBe(true);
    expect(dryRun.blockers.some((item) => item.type === 'missing-asin-sku-mapping')).toBe(true);
    expect(dryRun.snapshotContracts.map((contract) => contract.snapshotType)).toEqual([
      'product_snapshot',
      'review_snapshot',
      'brand_share_snapshot',
      'category_rank_snapshot',
    ]);
  });

  it('validates a partial Amazon ASIN/SKU mapping without treating it as full coverage', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/data/connectors/amazon-commerce-dry-run.mjs',
        '--json',
        '--no-write',
        '--mapping',
        'tests/fixtures/amazon-commerce-mapping-partial-valid.json',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          AMAZON_SP_API_CLIENT_ID: 'fixture-client-id',
          AMAZON_SP_API_CLIENT_SECRET: 'fixture-client-secret',
          AMAZON_SP_API_REFRESH_TOKEN: 'fixture-refresh-token',
          AMAZON_MARKETPLACE_IDS: 'ATVPDKIKX0DER',
        },
      },
    );
    const dryRun = JSON.parse(output) as {
      status: string;
      privateInput: { mappingPathSource: string; mappingPathConfigured: boolean; publicBundleAllowed: boolean; gitAllowed: boolean };
      mappingContract: { requiredFields: string[]; uniqueKey: string[] };
      mapping: {
        mappingCount: number;
        validMappingCount: number;
        uniqueValidMappingCount: number;
        invalidMappingCount: number;
        duplicateMappingCount: number;
        missingSourceIds: string[];
        sourceCoverage: Array<{ sourceId: string; mappedItems: number; status: string }>;
      };
      mappingCoverage: {
        status: string;
        totalRequiredItems: number;
        totalMappedItems: number;
        missingItemCount: number;
        readySourceCount: number;
        missingSourceCount: number;
      };
      blockers: Array<{ type: string; key?: string; sourceId?: string; count?: number }>;
    };

    expect(output).not.toContain('fixture-client-secret');
    expect(dryRun.status).toBe('blocked');
    expect(dryRun.privateInput).toMatchObject({
      mappingPathSource: 'cli',
      mappingPathConfigured: true,
      publicBundleAllowed: false,
      gitAllowed: false,
    });
    expect(dryRun.mappingContract.requiredFields).toEqual(
      expect.arrayContaining(['sourceId', 'site', 'marketplaceId', 'asin', 'sku', 'brand', 'productName', 'mappingOwner']),
    );
    expect(dryRun.mappingContract.uniqueKey).toEqual(['sourceId', 'site', 'marketplaceId', 'asin']);
    expect(dryRun.mapping.mappingCount).toBe(1);
    expect(dryRun.mapping.validMappingCount).toBe(1);
    expect(dryRun.mapping.uniqueValidMappingCount).toBe(1);
    expect(dryRun.mapping.invalidMappingCount).toBe(0);
    expect(dryRun.mapping.duplicateMappingCount).toBe(0);
    expect(dryRun.mapping.sourceCoverage.find((item) => item.sourceId === 'ds-010')).toMatchObject({
      mappedItems: 1,
      status: 'ready',
    });
    expect(dryRun.mappingCoverage).toMatchObject({
      status: 'blocked',
      totalRequiredItems: 67,
      totalMappedItems: 1,
      missingItemCount: 66,
      readySourceCount: 1,
      missingSourceCount: 6,
    });
    expect(dryRun.mapping.missingSourceIds).not.toContain('ds-010');
    expect(dryRun.mapping.missingSourceIds).toEqual(expect.arrayContaining(['ds-007', 'ds-009', 'ds-019', 'ds-037', 'ds-038', 'ds-039']));
    expect(dryRun.blockers.some((item) => item.type === 'missing-credential')).toBe(false);
    expect(dryRun.blockers.some((item) => item.type === 'invalid-asin-sku-mapping')).toBe(false);
    expect(dryRun.blockers.some((item) => item.type === 'missing-asin-sku-mapping' && item.sourceId === 'ds-007')).toBe(true);
  });

  it('prints a private Amazon mapping template without business ASIN/SKU values', () => {
    const output = execFileSync('node', ['scripts/data/connectors/amazon-commerce-dry-run.mjs', '--print-mapping-template'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const template = JSON.parse(output) as {
      privateData: boolean;
      publicBundleAllowed: boolean;
      gitAllowed: boolean;
      recommendedLocalPrivateMappingPath: string;
      recommendedServerPrivateMappingPath: string;
      mappings: Array<{ sourceId: string; asin: string; sku: string; mappingOwner: string; minimumMappedItems: number }>;
    };

    expect(template.privateData).toBe(true);
    expect(template.publicBundleAllowed).toBe(false);
    expect(template.gitAllowed).toBe(false);
    expect(template.recommendedLocalPrivateMappingPath).toBe('configs/private/amazon-commerce-mapping.json');
    expect(template.recommendedServerPrivateMappingPath).toBe('/opt/mkt53/private/amazon-commerce-mapping.json');
    expect(template.mappings.map((mapping) => mapping.sourceId)).toEqual(['ds-007', 'ds-009', 'ds-010', 'ds-019', 'ds-037', 'ds-038', 'ds-039']);
    expect(template.mappings.every((mapping) => mapping.asin === '' && mapping.sku === '' && mapping.mappingOwner === '')).toBe(true);
    expect(template.mappings.find((mapping) => mapping.sourceId === 'ds-009')?.minimumMappedItems).toBe(25);
  });

  it('loads a private Amazon mapping path from MKT53_AMAZON_MAPPING_PATH', () => {
    const output = execFileSync('node', ['scripts/data/connectors/amazon-commerce-dry-run.mjs', '--json', '--no-write'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        MKT53_AMAZON_MAPPING_PATH: 'tests/fixtures/amazon-commerce-mapping-partial-valid.json',
        AMAZON_SP_API_CLIENT_ID: 'fixture-client-id',
        AMAZON_SP_API_CLIENT_SECRET: 'fixture-client-secret',
        AMAZON_SP_API_REFRESH_TOKEN: 'fixture-refresh-token',
        AMAZON_MARKETPLACE_IDS: 'ATVPDKIKX0DER',
      },
    });
    const dryRun = JSON.parse(output) as {
      privateInput: { mappingPathSource: string; mappingPathConfigured: boolean; recommendedServerPrivateMappingPath: string };
      mapping: {
        validMappingCount: number;
        sourceCoverage: Array<{ sourceId: string; mappedItems: number; status: string }>;
      };
    };

    expect(output).not.toContain('fixture-client-secret');
    expect(dryRun.privateInput).toMatchObject({
      mappingPathSource: 'env:MKT53_AMAZON_MAPPING_PATH',
      mappingPathConfigured: true,
      recommendedServerPrivateMappingPath: '/opt/mkt53/private/amazon-commerce-mapping.json',
    });
    expect(dryRun.mapping.validMappingCount).toBe(1);
    expect(dryRun.mapping.sourceCoverage.find((item) => item.sourceId === 'ds-010')).toMatchObject({
      mappedItems: 1,
      status: 'ready',
    });
  });

  it('prints an auditable Amazon mapping coverage report', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/data/connectors/amazon-commerce-dry-run.mjs',
        '--coverage-report',
        '--no-write',
        '--mapping',
        'tests/fixtures/amazon-commerce-mapping-partial-valid.json',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          AMAZON_SP_API_CLIENT_ID: 'fixture-client-id',
          AMAZON_SP_API_CLIENT_SECRET: 'fixture-client-secret',
          AMAZON_SP_API_REFRESH_TOKEN: 'fixture-refresh-token',
          AMAZON_MARKETPLACE_IDS: 'ATVPDKIKX0DER',
        },
      },
    );

    expect(output).not.toContain('fixture-client-secret');
    expect(output).toContain('# Amazon Commerce Mapping Coverage Report');
    expect(output).toContain('mappingCoverageStatus: blocked');
    expect(output).toContain('networkCalls: 0');
    expect(output).toContain('businessDataWrites: 0');
    expect(output).toContain('totalRequiredItems: 67');
    expect(output).toContain('totalMappedItems: 1');
    expect(output).toContain('missingItemCount: 66');
    expect(output).toContain('| ds-010 | RegionCompetition | brand_analytics_region_share | 1 | 1 | 0 | ready |');
    expect(output).toContain('| ds-007 | CompetitionPage | competitor_catalog | 15 | 0 | 15 | missing-mapping |');
  });
});
