#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { analyzeConsistency, classifyCollectionMethod, extractSourceRegistry, isoWeek } from './lib/project-analysis.mjs';
import { buildConnectorBacklog } from './lib/connector-backlog.mjs';

const defaultTimeoutMs = 8000;
const defaultMaxAttempts = 2;
const defaultRetryDelayMs = 500;
const previewLimitBytes = 4096;
const retryableHttpStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noNetwork: argv.includes('--no-network'),
    writePath: undefined,
    timeoutMs: defaultTimeoutMs,
    maxAttempts: defaultMaxAttempts,
    retryDelayMs: defaultRetryDelayMs,
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--write') options.writePath = argv[i + 1];
    if (argv[i] === '--timeout-ms') options.timeoutMs = Number(argv[i + 1]);
    if (argv[i] === '--max-attempts') options.maxAttempts = Number(argv[i + 1]);
    if (argv[i] === '--retry-delay-ms') options.retryDelayMs = Number(argv[i + 1]);
  }

  return options;
}

function safePositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function wait(ms) {
  return ms > 0 ? new Promise((resolveDelay) => setTimeout(resolveDelay, ms)) : Promise.resolve();
}

async function readPreviewHash(response) {
  if (!response.body) return undefined;

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (total < previewLimitBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const next = value.slice(0, Math.max(0, previewLimitBytes - total));
      chunks.push(next);
      total += next.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  if (total === 0) return undefined;

  const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  return createHash('sha256').update(buffer).digest('hex');
}

async function checkPublicUrlAttempt(source, timeoutMs, attempt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(source.sourceUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/json,text/plain,*/*',
        Range: `bytes=0-${previewLimitBytes - 1}`,
        'User-Agent': 'mkt53-data-collector/1.0 (+https://mkt.lute-tlz-dddd.top)',
      },
    });
    const sampleHash = await readPreviewHash(response);
    const status = response.ok ? 'ok' : 'source-error';

    return {
      attempt,
      id: source.id,
      page: source.page,
      metric: source.metric,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      method: 'public-url-check',
      status,
      checkedAt,
      httpStatus: response.status,
      contentType: response.headers.get('content-type') ?? '',
      etag: response.headers.get('etag') ?? '',
      lastModified: response.headers.get('last-modified') ?? '',
      sampleHash,
      retryable: status === 'source-error' && retryableHttpStatuses.has(response.status),
      note: response.ok ? '公开来源可达，已记录元数据和样本哈希。' : '公开来源返回非 2xx，需要人工确认链接或供应商权限。',
    };
  } catch (error) {
    return {
      attempt,
      id: source.id,
      page: source.page,
      metric: source.metric,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      method: 'public-url-check',
      status: 'fetch-error',
      checkedAt,
      error: error instanceof Error ? error.message : String(error),
      retryable: true,
      note: '公开来源请求失败，需要下次周度任务重试或人工复核。',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeAttempt(attemptResult) {
  return {
    attempt: attemptResult.attempt,
    status: attemptResult.status,
    checkedAt: attemptResult.checkedAt,
    httpStatus: attemptResult.httpStatus,
    error: attemptResult.error,
    retryable: Boolean(attemptResult.retryable),
  };
}

async function checkPublicUrl(source, policy) {
  const attempts = [];

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const result = await checkPublicUrlAttempt(source, policy.timeoutMs, attempt);
    attempts.push(result);

    if (result.status === 'ok' || !result.retryable || attempt === policy.maxAttempts) {
      return {
        ...result,
        checkAttemptCount: attempts.length,
        attempts: attempts.map(summarizeAttempt),
        statusStability: result.status === 'ok' && attempts.length > 1 ? 'recovered-after-retry' : result.status === 'ok' ? 'fresh-ok' : 'failed-after-retries',
      };
    }

    await wait(policy.retryDelayMs);
  }

  throw new Error('Unexpected public URL retry loop fallthrough.');
}

function skippedSource(source, method) {
  return {
    id: source.id,
    page: source.page,
    metric: source.metric,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    method,
    status: method,
    checkedAt: new Date().toISOString(),
    note:
      method === 'public-url-check'
        ? '无网络 dry-run，仅确认该来源具备公开 URL 检查条件。'
        : method === 'connector-required'
        ? '该来源需要授权 API、内部系统或合规爬虫连接器，本脚本不伪造采集结果。'
        : '该来源缺少可自动访问 URL，需要人工上传、采购报告或补充来源入口。',
  };
}

export async function collectWeeklySources(options = {}) {
  const appRoot = options.appRoot ?? process.cwd();
  const timeoutMs = safePositiveInteger(options.timeoutMs, defaultTimeoutMs);
  const maxAttempts = safePositiveInteger(options.maxAttempts, defaultMaxAttempts);
  const retryDelayMs = Number.isFinite(options.retryDelayMs) && options.retryDelayMs >= 0 ? options.retryDelayMs : defaultRetryDelayMs;
  const noNetwork = options.noNetwork ?? false;
  const generatedAt = new Date().toISOString();
  const sourceRegistry = extractSourceRegistry(appRoot);
  const audit = analyzeConsistency(appRoot);
  const connectorBacklog = buildConnectorBacklog(sourceRegistry);
  const publicUrlPolicy = {
    timeoutMs,
    maxAttempts,
    retryDelayMs,
    retryableHttpStatuses: [...retryableHttpStatuses],
  };
  const sources = [];

  for (const source of sourceRegistry) {
    const method = classifyCollectionMethod(source);

    if (method !== 'public-url-check' || noNetwork) {
      sources.push(noNetwork && method === 'public-url-check' ? skippedSource(source, 'public-url-check') : skippedSource(source, method));
      continue;
    }

    sources.push(await checkPublicUrl(source, publicUrlPolicy));
  }

  const totals = sources.reduce(
    (acc, source) => {
      acc.total += 1;
      acc[source.status] = (acc[source.status] ?? 0) + 1;
      return acc;
    },
    { total: 0 },
  );

  return {
    schemaVersion: 1,
    week: isoWeek(new Date(generatedAt)),
    generatedAt,
    refreshCadence: 'weekly',
    collectionPolicy: {
      publicUrl: publicUrlPolicy,
    },
    auditSummary: audit.summary,
    connectorBacklog,
    totals,
    sources,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = await collectWeeklySources(options);

  if (options.writePath) {
    const target = resolve(process.cwd(), options.writePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  if (options.json || !options.writePath) {
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  } else {
    process.stdout.write([
      `mkt53 weekly source collection`,
      `week=${manifest.week}`,
      `generatedAt=${manifest.generatedAt}`,
      `total=${manifest.totals.total}`,
      `ok=${manifest.totals.ok ?? 0}`,
      `connector-required=${manifest.totals['connector-required'] ?? 0}`,
      `manual-required=${manifest.totals['manual-required'] ?? 0}`,
      `source-error=${manifest.totals['source-error'] ?? 0}`,
      `fetch-error=${manifest.totals['fetch-error'] ?? 0}`,
      '',
    ].join('\n'));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
