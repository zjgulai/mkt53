import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROUTE_TARGET_METRIC_CONTRACT_VERSION = 'mkt53.route-target-metrics.v1';

const MECE_CATEGORIES = new Set([
  'navigation_misc',
  'market_size_share_trend',
  'competitor_price_rank_product',
  'user_voc_interview_social',
  'industry_policy_ip_exhibition_supply',
  'self_business_channel_promo',
  'ai_analysis_output',
  'reports_exports_governance',
]);
const ISO_DURATION_PATTERN = /^P(?=\d|T\d)(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?)?$/;
const SOURCE_ID_PATTERN = /^(?:ds-\d{3}|policy-[a-z0-9-]+)$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function addError(errors, path, code, message) {
  errors.push({ path, code, message });
}

function requireExactKeys(value, keys, path, errors) {
  if (!isObject(value)) {
    addError(errors, path, 'object-required', 'Expected an object.');
    return false;
  }

  for (const key of keys) {
    if (!Object.hasOwn(value, key)) addError(errors, `${path}.${key}`, 'required', 'Required field is missing.');
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) addError(errors, `${path}.${key}`, 'additional-property', 'Unexpected field is not allowed.');
  }
  return true;
}

function validateStringArray(value, path, errors, { minLength = 1, sourceIds = false } = {}) {
  if (!Array.isArray(value) || value.length < minLength) {
    addError(errors, path, 'non-empty-array', `Expected an array with at least ${minLength} item(s).`);
    return false;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) addError(errors, `${path}[${index}]`, 'non-empty-string', 'Expected a non-empty string.');
    if (sourceIds && isNonEmptyString(item) && !SOURCE_ID_PATTERN.test(item)) {
      addError(errors, `${path}[${index}]`, 'source-id-format', 'Expected a registered source id format.');
    }
  });
  if (new Set(value).size !== value.length) addError(errors, path, 'duplicate-array-item', 'Array items must be unique.');
  return true;
}

function validateSla(sla, path, errors) {
  const keys = ['freshnessTarget', 'reviewTarget', 'breachResponse'];
  if (!requireExactKeys(sla, keys, path, errors)) return;

  for (const key of keys) {
    if (!isNonEmptyString(sla[key]) || !ISO_DURATION_PATTERN.test(sla[key])) {
      addError(errors, `${path}.${key}`, 'iso-duration-required', 'SLA must be a positive ISO-8601 day/hour/minute duration.');
    }
  }
}

function validateMetric(metric, path, errors, knownSourceIds) {
  const keys = [
    'metricId',
    'name',
    'formula',
    'grain',
    'unit',
    'denominator',
    'window',
    'owner',
    'sla',
    'requiredSourceIds',
    'allowedComparisons',
    'prohibitedInferences',
  ];
  if (!requireExactKeys(metric, keys, path, errors)) return;

  for (const key of ['metricId', 'name', 'formula', 'grain', 'unit', 'denominator', 'window', 'owner']) {
    if (!isNonEmptyString(metric[key])) addError(errors, `${path}.${key}`, 'non-empty-string', 'Expected a non-empty string.');
  }
  if (isNonEmptyString(metric.metricId) && !/^[a-z][a-z0-9_]*$/.test(metric.metricId)) {
    addError(errors, `${path}.metricId`, 'metric-id-format', 'Metric id must use lower snake case.');
  }

  validateSla(metric.sla, `${path}.sla`, errors);
  const requiredSourceIdsValid = validateStringArray(
    metric.requiredSourceIds,
    `${path}.requiredSourceIds`,
    errors,
    { sourceIds: true },
  );
  validateStringArray(metric.allowedComparisons, `${path}.allowedComparisons`, errors);
  validateStringArray(metric.prohibitedInferences, `${path}.prohibitedInferences`, errors);

  if (knownSourceIds && requiredSourceIdsValid) {
    for (const sourceId of metric.requiredSourceIds) {
      if (!knownSourceIds.has(sourceId)) {
        addError(errors, `${path}.requiredSourceIds`, 'source-id-not-registered', `Source id ${sourceId} is not in the source registry.`);
      }
    }
  }
}

export function validateRouteTargetMetrics(input, expectedRoutes = [], knownSourceIds = undefined) {
  const errors = [];
  const topLevelKeys = [
    'contractVersion',
    'generatedAt',
    'definitionStatus',
    'evidenceBoundary',
    'routes',
  ];
  if (!requireExactKeys(input, topLevelKeys, '$', errors)) return { passed: false, errors, summary: {} };

  if (input.contractVersion !== ROUTE_TARGET_METRIC_CONTRACT_VERSION) {
    addError(errors, '$.contractVersion', 'contract-version', `Expected ${ROUTE_TARGET_METRIC_CONTRACT_VERSION}.`);
  }
  if (!isNonEmptyString(input.generatedAt) || Number.isNaN(Date.parse(input.generatedAt))) {
    addError(errors, '$.generatedAt', 'date-time-required', 'generatedAt must be an ISO date-time.');
  }
  if (input.definitionStatus !== 'definition-only') {
    addError(errors, '$.definitionStatus', 'definition-only-required', 'Target metric definitions cannot certify collected data.');
  }

  const boundaryKeys = ['containsMetricValues', 'certifiesDataCollection', 'certifiesDecisionReadiness', 'productionWrites'];
  if (requireExactKeys(input.evidenceBoundary, boundaryKeys, '$.evidenceBoundary', errors)) {
    for (const key of boundaryKeys) {
      if (input.evidenceBoundary[key] !== false) {
        addError(errors, `$.evidenceBoundary.${key}`, 'false-required', 'Definition-only contracts must keep this boundary false.');
      }
    }
  }

  if (!Array.isArray(input.routes)) {
    addError(errors, '$.routes', 'array-required', 'routes must be an array.');
    return { passed: false, errors, summary: {} };
  }

  const expectedByRoute = new Map(expectedRoutes.map((route) => [route.route, route]));
  const routeKeys = [
    'route',
    'component',
    'meceCategory',
    'decisionQuestion',
    'definitionStatus',
    'decisionReady',
    'metric',
    'acceptanceCriteria',
    'blockers',
  ];
  for (const [index, routeContract] of input.routes.entries()) {
    const path = `$.routes[${index}]`;
    if (!requireExactKeys(routeContract, routeKeys, path, errors)) continue;

    for (const key of ['route', 'component', 'decisionQuestion']) {
      if (!isNonEmptyString(routeContract[key])) addError(errors, `${path}.${key}`, 'non-empty-string', 'Expected a non-empty string.');
    }
    if (!MECE_CATEGORIES.has(routeContract.meceCategory)) {
      addError(errors, `${path}.meceCategory`, 'invalid-mece-category', 'Unknown MECE category.');
    }
    if (routeContract.definitionStatus !== 'definition-only') {
      addError(errors, `${path}.definitionStatus`, 'definition-only-required', 'Route contracts must remain definition-only.');
    }
    if (routeContract.decisionReady !== false) {
      addError(errors, `${path}.decisionReady`, 'false-required', 'A metric definition alone cannot certify decision readiness.');
    }
    validateMetric(routeContract.metric, `${path}.metric`, errors, knownSourceIds);
    validateStringArray(routeContract.acceptanceCriteria, `${path}.acceptanceCriteria`, errors);
    validateStringArray(routeContract.blockers, `${path}.blockers`, errors);

    if (expectedByRoute.size > 0) {
      if (!expectedByRoute.has(routeContract.route)) {
        addError(errors, `${path}.route`, 'unexpected-route', 'Route is not declared in App.tsx.');
      } else if (expectedByRoute.get(routeContract.route).component !== routeContract.component) {
        addError(errors, `${path}.component`, 'component-mismatch', 'Component does not match App.tsx.');
      } else if (
        expectedByRoute.get(routeContract.route).meceCategory
        && expectedByRoute.get(routeContract.route).meceCategory !== routeContract.meceCategory
      ) {
        addError(errors, `${path}.meceCategory`, 'mece-category-mismatch', 'MECE category does not match the route taxonomy.');
      }
    }
  }

  const contractRoutes = input.routes.filter(isObject).map((entry) => entry.route).filter(isNonEmptyString);
  const metricIds = input.routes.filter(isObject).map((entry) => entry.metric?.metricId).filter(isNonEmptyString);
  if (new Set(contractRoutes).size !== contractRoutes.length) {
    addError(errors, '$.routes', 'duplicate-route', 'Each business route must have exactly one target metric contract.');
  }
  if (new Set(metricIds).size !== metricIds.length) {
    addError(errors, '$.routes', 'duplicate-metric-id', 'Metric ids must be globally unique.');
  }

  const contractRouteSet = new Set(contractRoutes);
  const expectedRouteSet = new Set(expectedRoutes.map((route) => route.route));
  const missingRoutes = [...expectedRouteSet].filter((route) => !contractRouteSet.has(route)).sort();
  const unexpectedRoutes = [...contractRouteSet].filter((route) => !expectedRouteSet.has(route)).sort();
  for (const route of missingRoutes) addError(errors, '$.routes', 'missing-route', `Missing target metric contract for ${route}.`);

  const summary = {
    expectedRouteCount: expectedRouteSet.size,
    contractRouteCount: contractRoutes.length,
    coveredRouteCount: [...expectedRouteSet].filter((route) => contractRouteSet.has(route)).length,
    missingRouteCount: missingRoutes.length,
    unexpectedRouteCount: unexpectedRoutes.length,
    metricDefinitionCount: metricIds.length,
    decisionReadyRouteCount: input.routes.filter((entry) => entry?.decisionReady === true).length,
    errorCount: errors.length,
  };
  return { passed: errors.length === 0, errors, summary };
}

export function loadRouteTargetMetrics(appRoot, expectedRoutes = [], knownSourceIds = undefined) {
  const contractPath = join(appRoot, 'contracts', 'route-target-metrics.json');
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  const validation = validateRouteTargetMetrics(contract, expectedRoutes, knownSourceIds);
  const routeContracts = isObject(contract) && Array.isArray(contract.routes) ? contract.routes : [];
  const contractByRoute = new Map(
    routeContracts
      .filter((entry) => isObject(entry) && isNonEmptyString(entry.route))
      .map((entry) => [entry.route, entry]),
  );
  return { contractPath, contract, contractByRoute, validation };
}
