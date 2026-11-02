#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractSourceRegistry } from './lib/project-analysis.mjs';
import { routeMeceCategory } from './lib/route-taxonomy.mjs';
import { loadRouteTargetMetrics } from './lib/route-target-metrics.mjs';

function readBusinessRoutes(appRoot) {
  const source = readFileSync(join(appRoot, 'src', 'App.tsx'), 'utf8');
  return [...source.matchAll(/<Route\s+path=["']([^"']+)["']\s+element=\{<([A-Za-z0-9_]+)/g)]
    .map((match) => ({
      route: match[1],
      component: match[2],
      meceCategory: routeMeceCategory(match[1]),
    }))
    .filter((route) => route.route !== '*');
}

export function buildRouteTargetMetricValidation(appRoot = process.cwd()) {
  const expectedRoutes = readBusinessRoutes(appRoot);
  const knownSourceIds = new Set(extractSourceRegistry(appRoot).map((source) => source.id));
  const result = loadRouteTargetMetrics(appRoot, expectedRoutes, knownSourceIds);
  const routeContracts = result.contract !== null
    && typeof result.contract === 'object'
    && !Array.isArray(result.contract)
    && Array.isArray(result.contract.routes)
    ? result.contract.routes
    : [];

  return {
    contractVersion: result.contract?.contractVersion,
    definitionStatus: result.contract?.definitionStatus,
    evidenceBoundary: result.contract?.evidenceBoundary,
    contractPath: relative(appRoot, result.contractPath),
    passed: result.validation.passed,
    summary: result.validation.summary,
    errors: result.validation.errors,
    routes: routeContracts.map((entry) => ({
      route: entry.route,
      component: entry.component,
      meceCategory: entry.meceCategory,
      metricId: entry.metric?.metricId,
      definitionStatus: entry.definitionStatus,
      decisionReady: entry.decisionReady,
      requiredSourceIds: entry.metric?.requiredSourceIds ?? [],
    })),
  };
}

function printHuman(result) {
  const lines = [
    'mkt53 route target metric contract validation',
    `contract=${result.contractVersion}`,
    `contractPath=${result.contractPath}`,
    `expectedRoutes=${result.summary.expectedRouteCount}`,
    `coveredRoutes=${result.summary.coveredRouteCount}`,
    `metricDefinitions=${result.summary.metricDefinitionCount}`,
    `decisionReadyRoutes=${result.summary.decisionReadyRouteCount}`,
    `errors=${result.summary.errorCount}`,
    `passed=${result.passed}`,
    '',
  ];
  process.stdout.write(lines.join('\n'));
}

function main() {
  const result = buildRouteTargetMetricValidation(process.cwd());
  if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else printHuman(result);
  if (!result.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
