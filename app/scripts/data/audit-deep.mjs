#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { analyzeConsistency, classifyCollectionMethod, extractSourceRegistry, listPageComponents } from './lib/project-analysis.mjs';

const highImpactPattern =
  /(?:\bGMV\b|\bCAGR\b|\bNPS\b|\bROI\b|\bBSR\b|market\s*share|share|revenue|sales|units|price|rating|review|rank|trend|growth|\$|%|市场规模|市场份额|份额|月度趋势|趋势|增速|同比|环比|销量|销售|营收|收入|价格|售价|评分|评价|评论|排名|库存|成本|转化率|复购|客单价|关税|货值|专利|法规|合规|展会|供应链)/i;
const gatedDisclosurePattern =
  /(?:gated|gate|readiness|manifest|governance|canDisplayAsFact=false|private\/internal|private|internal|proxy|connector|required|authorized|blocked|artifact|publish|no model call|no provider call|no connector access|待复核|待授权|待审批|需复核|需授权|需审批|展示审批|字段字典|事实表|拆入|页面读取|候选源|候选|代理|不能写成|不可替代|保留|接入|证据|来源|权限|脱敏|样例|示例|治理|门禁|阻断|不包含|不得|不可作为|仅登记)/i;
const numericPattern = /(?:[$￥]?\d+(?:,\d{3})*(?:\.\d+)?\s*(?:%|[KMB]|万|亿|千|美元|USD|usd|分|星|页|条|个|件|天|周|月|年|mAh|mmHg)?|20\d{2}(?:[-/年.]\d{1,2})?)/g;
const sourceIdPattern = /\b(?:ds-\d{3}|policy-[a-z0-9-]+)\b/g;
const jsxAttributeSkip = new Set(['className', 'style', 'src', 'href', 'to', 'path', 'id', 'key', 'color', 'fill', 'stroke', 'viewBox']);
const objectPropertySkip = new Set([
  'className',
  'style',
  'icon',
  'color',
  'bg',
  'href',
  'src',
  'to',
  'path',
  'id',
  'key',
  'sourceUrl',
  'url',
  'image',
  'avatar',
]);
const numericPropertySkip = new Set([
  'x',
  'y',
  'cx',
  'cy',
  'r',
  'width',
  'height',
  'size',
  'strokeWidth',
  'delay',
  'duration',
  'index',
  'tabIndex',
  'zIndex',
]);

const moduleSourceLabels = {
  mkt: '看市场',
  comp: '看竞争',
  user: '看用户',
  industry: '看行业',
  self: '看自己',
  ai: 'AI助手',
};

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    summaryJson: argv.includes('--summary-json'),
    write: !argv.includes('--no-write'),
    strict: argv.includes('--strict'),
    outDir: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--out') options.outDir = argv[index + 1];
  }

  return options;
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const text = Array.isArray(value) ? value.join('|') : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(path, rows, fields) {
  const csv = [fields.join(','), ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(','))].join('\n');
  writeFileSync(path, `${csv}\n`);
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function walkFiles(dir, predicate) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const stat = statSync(path);

    if (stat.isDirectory()) return walkFiles(path, predicate);
    return predicate(path) ? [path] : [];
  });
}

function businessFiles(appRoot) {
  const srcRoot = join(appRoot, 'src');
  const pages = walkFiles(join(srcRoot, 'pages'), (path) => path.endsWith('.tsx'));
  const components = walkFiles(join(srcRoot, 'components'), (path) => {
    const rel = relative(srcRoot, path);
    if (!path.endsWith('.tsx')) return false;
    if (rel.startsWith(join('components', 'ui'))) return false;
    return true;
  });
  const dataFiles = walkFiles(join(srcRoot, 'data'), (path) => path.endsWith('.ts') && !path.endsWith('source-registry.ts'));

  return unique([...pages, ...components, ...dataFiles]).sort();
}

function lineNumber(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function propertyNameText(name) {
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function nearestVariableName(node) {
  let current = node.parent;

  while (current) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) return current.name.text;
    current = current.parent;
  }

  return undefined;
}

function nearestObjectLiteral(node) {
  let current = node.parent;

  while (current) {
    if (ts.isObjectLiteralExpression(current)) return current;
    if (ts.isSourceFile(current) || ts.isFunctionLike(current)) return undefined;
    current = current.parent;
  }

  return undefined;
}

function sourceIdsFromObject(node, knownSourceIds) {
  const object = nearestObjectLiteral(node);
  if (!object) return [];

  const ids = [];
  for (const prop of object.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = propertyNameText(prop.name);
    if (key !== 'sourceId' && key !== 'sourceIds') continue;

    const initializer = prop.initializer;
    if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
      ids.push(initializer.text);
    } else if (ts.isArrayLiteralExpression(initializer)) {
      for (const element of initializer.elements) {
        if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) ids.push(element.text);
      }
    }
  }

  return unique(ids).filter((id) => knownSourceIds.has(id));
}

function nodeSourceIds(node, sourceText, sourceFile, knownSourceIds) {
  const recordIds = sourceIdsFromObject(node, knownSourceIds);
  if (recordIds.length > 0) return { ids: recordIds, coverage: 'record-level' };

  const line = lineNumber(sourceFile, node);
  const lines = sourceText.split(/\r?\n/);
  const nearby = lines.slice(Math.max(0, line - 5), Math.min(lines.length, line + 4)).join('\n');
  const nearbyIds = unique([...(nearby.match(sourceIdPattern) ?? [])]).filter((id) => knownSourceIds.has(id));
  if (nearbyIds.length > 0) return { ids: nearbyIds, coverage: 'near-line' };

  return { ids: [], coverage: 'page-level' };
}

function shouldKeepText(text) {
  const normalized = normalizeText(text);
  if (normalized.length < 2 || normalized.length > 320) return false;
  if (!numericPattern.test(normalized)) {
    numericPattern.lastIndex = 0;
    return false;
  }
  numericPattern.lastIndex = 0;
  return highImpactPattern.test(normalized) || /20\d{2}|[$￥]|\d+(?:\.\d+)?\s*%/.test(normalized);
}

function numericTokens(text) {
  return unique(normalizeText(text).match(numericPattern) ?? []);
}

function sourceEvidenceGrade(source, collectionMethod) {
  if (source.evidenceGrade) return source.evidenceGrade;

  if (source.verificationStatus === 'example') return 'LO-S-synthetic';
  if (collectionMethod === 'local-file-check') return source.verificationStatus === 'verified' ? 'L1-public-or-runtime' : 'L0-unverified';
  if (collectionMethod === 'public-url-check') return source.verificationStatus === 'verified' ? 'L1-public-or-runtime' : 'L0-unverified';
  if (collectionMethod === 'connector-required') return source.verificationStatus === 'verified' ? 'L2-fixture-or-dry-run' : 'L0-unverified';
  return source.verificationStatus === 'verified' ? 'L1-public-or-runtime' : 'L0-unverified';
}

function canDisplayAsFact(source, collectionMethod, grade) {
  if (typeof source.canDisplayAsFact === 'boolean') return source.canDisplayAsFact;

  return source.verificationStatus === 'verified' && grade === 'L1-public-or-runtime' && collectionMethod !== 'connector-required';
}

function sourceRows(sourceRegistry) {
  return sourceRegistry.map((source) => {
    const collectionMethod = classifyCollectionMethod(source);
    const evidenceGrade = sourceEvidenceGrade(source, collectionMethod);
    const displayable = canDisplayAsFact(source, collectionMethod, evidenceGrade);
    const blockingReason = source.blockingReason ?? (
      displayable
        ? ''
        : source.verificationStatus === 'example'
          ? 'example-data-must-not-display-as-fact'
          : collectionMethod === 'connector-required'
            ? 'authorized-connector-or-private-snapshot-required'
            : collectionMethod === 'manual-required'
              ? 'manual-evidence-artifact-required'
              : 'public-source-needs-review'
    );

    return {
      source_id: source.id,
      module: source.module,
      page: source.page,
      metric: source.metric,
      source_name: source.sourceName,
      source_type: source.sourceType,
      verification_status: source.verificationStatus,
      reliability: source.reliability,
      last_verified: source.lastVerified,
      collection_method: collectionMethod,
      evidence_grade: evidenceGrade,
      can_display_as_fact: displayable,
      blocking_reason: blockingReason,
      privacy_level: source.privacyLevel ?? (collectionMethod === 'connector-required' ? 'private/internal' : 'public'),
      evidence_artifact_path: source.evidenceArtifactPath ?? '',
      claim_scope: source.claimScope ?? '',
      source_url: source.sourceUrl ?? '',
      action: source.action,
      gap: source.gap,
      recommended_collection_lane: collectionLane(collectionMethod),
    };
  });
}

function collectionLane(collectionMethod) {
  return {
    'public-url-check': 'agent-reach-web-or-public-evidence-capture',
    'local-file-check': 'local-code-audit',
    'connector-required': 'connector-readiness-or-authorized-private-snapshot',
    'manual-required': 'manual-review-artifact',
  }[collectionMethod] ?? 'manual-review-artifact';
}

function readRoutes(appRoot) {
  const appSource = readFileSync(join(appRoot, 'src/App.tsx'), 'utf8');
  return [...appSource.matchAll(/<Route\s+path=["']([^"']+)["']\s+element=\{<([A-Za-z0-9_]+)/g)].map((match) => ({
    route: match[1],
    component: match[2],
  }));
}

function componentForFile(appRoot, path) {
  const rel = relative(join(appRoot, 'src'), path);
  const base = basename(path).replace(/\.(tsx|ts)$/, '');
  if (rel.startsWith(`data/`)) return base;
  return base;
}

function impliedRoutes(component, routes) {
  const exact = routes.filter((route) => route.component === component).map((route) => route.route);
  if (exact.length > 0) return exact;
  if (component === 'OperationsManual') return ['/data'];
  if (component === 'SearchPanel') return ['embedded:navbar-search'];
  if (component === 'NotificationCenter') return ['/'];
  if (component === 'market-insight-data') return ['/market'];
  return ['embedded'];
}

function impliedMeceCategory(path, component, text) {
  const haystack = `${path} ${component} ${text}`.toLowerCase();
  if (/market|mkt|breast|nursing|babycare|category|customs|市场|份额|趋势|cagr/.test(haystack)) return 'market_size_share_trend';
  if (/competition|competitor|productmanage|regioncompetition|price|bsr|竞品|新品|价格|排名/.test(haystack)) {
    return 'competitor_price_rank_product';
  }
  if (/users|sentiment|interview|persona|social|voc|用户|访谈|社媒|评论|画像/.test(haystack)) return 'user_voc_interview_social';
  if (/industry|policy|regulation|ip|exhibition|supply|tech|news|法规|政策|专利|展会|供应链/.test(haystack)) {
    return 'industry_policy_ip_exhibition_supply';
  }
  if (/self|channel|promo|price_strategy|bcg|4p|自己|渠道|促销|营收/.test(haystack)) return 'self_business_channel_promo';
  if (/ai-assistant|aiassistant|reviewanalysis|youtube|design|knowledge|ai|模型|生成/.test(haystack)) return 'ai_analysis_output';
  if (/report|data|source|export|csv|报告|数据治理|导出/.test(haystack)) return 'reports_exports_governance';
  return 'navigation_misc';
}

function riskForClaim({ text, sourceIds, coverage, sourceById }) {
  const highImpact = highImpactPattern.test(text);
  if (!highImpact) return { risk: 'low', issueCode: 'low-impact-numeric-reference' };
  const isTextualGatedDisclosure = gatedDisclosurePattern.test(text);
  if (sourceIds.length === 0 && isTextualGatedDisclosure) return { risk: 'medium', issueCode: 'gated-source-disclosure' };
  if (sourceIds.length === 0) return { risk: 'high', issueCode: 'missing-source-id' };

  const rows = sourceIds.map((id) => sourceById.get(id)).filter(Boolean);
  if (rows.length === 0) return { risk: 'high', issueCode: 'source-id-not-in-registry' };

  const displayable = rows.filter((source) => source.can_display_as_fact);
  const isGatedDisclosure = isTextualGatedDisclosure && rows.some((source) => !source.can_display_as_fact);
  if (displayable.length === 0 && isGatedDisclosure) {
    return { risk: 'medium', issueCode: 'gated-source-disclosure' };
  }
  if (displayable.length === 0) return { risk: 'high', issueCode: 'no-displayable-source-evidence' };
  if (coverage !== 'record-level' && coverage !== 'near-line') return { risk: 'medium', issueCode: 'page-level-source-only' };
  if (rows.some((source) => source.verification_status !== 'verified')) return { risk: 'medium', issueCode: 'mixed-source-verification-status' };
  return { risk: 'low', issueCode: 'claim-has-displayable-source' };
}

function collectFileSourceIds(path, sourceText, component, sourceRegistry, knownSourceIds) {
  const directIds = unique([...(sourceText.match(sourceIdPattern) ?? [])]).filter((id) => knownSourceIds.has(id));
  const registryIds = sourceRegistry.filter((source) => source.page === component).map((source) => source.id);
  return unique([...directIds, ...registryIds]);
}

function scanClaimsForFile(appRoot, path, routes, sourceRegistry, sourceById) {
  const sourceText = readFileSync(path, 'utf8');
  const sourceFile = ts.createSourceFile(path, sourceText, ts.ScriptTarget.ES2023, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const component = componentForFile(appRoot, path);
  const pageRoutes = impliedRoutes(component, routes);
  const knownSourceIds = new Set(sourceRegistry.map((source) => source.id));
  const pageSourceIds = collectFileSourceIds(path, sourceText, component, sourceRegistry, knownSourceIds);
  const filePath = relative(appRoot, path);
  const claims = [];
  const seen = new Set();

  function addClaim(node, claimType, rawText, explicitSource = undefined, forceKeep = false) {
    const text = normalizeText(rawText);
    if (!forceKeep && !shouldKeepText(text)) return;

    const sourceLink = explicitSource ?? nodeSourceIds(node, sourceText, sourceFile, knownSourceIds);
    const sourceIds = unique(sourceLink.ids.length > 0 ? sourceLink.ids : pageSourceIds);
    const coverage = sourceLink.ids.length > 0 ? sourceLink.coverage : pageSourceIds.length > 0 ? 'page-level' : 'none';
    const line = lineNumber(sourceFile, node);
    const key = `${filePath}:${line}:${claimType}:${text}`;
    if (seen.has(key)) return;
    seen.add(key);

    const risk = riskForClaim({ text, sourceIds, coverage, sourceById });
    const sources = sourceIds.map((id) => sourceById.get(id)).filter(Boolean);
    const grades = unique(sources.map((source) => source.evidence_grade));
    const methods = unique(sources.map((source) => source.collection_method));
    const statuses = unique(sources.map((source) => source.verification_status));

    claims.push({
      page_component: component,
      routes: pageRoutes.join('|'),
      file_path: filePath,
      line,
      claim_type: claimType,
      static_context: nearestVariableName(node) ?? '',
      mece_category: impliedMeceCategory(filePath, component, text),
      text,
      numeric_tokens: numericTokens(text),
      source_ids: sourceIds,
      source_coverage: coverage,
      source_statuses: statuses,
      evidence_grades: grades,
      collection_methods: methods,
      risk: risk.risk,
      issue_code: risk.issueCode,
    });
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      addClaim(node, 'jsx_text', node.getText(sourceFile));
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)) return;
      if (ts.isJsxAttribute(node.parent) && jsxAttributeSkip.has(node.parent.name.text)) return;
      if (ts.isPropertyAssignment(node.parent) && objectPropertySkip.has(propertyNameText(node.parent.name))) return;
      addClaim(node, 'string_literal', node.text);
    } else if (ts.isNumericLiteral(node)) {
      if (ts.isPropertyAssignment(node.parent) && numericPropertySkip.has(propertyNameText(node.parent.name))) return;
      const variableName = nearestVariableName(node);
      if (!variableName) return;
      addClaim(node, 'numeric_literal', node.getText(sourceFile));
    } else if (ts.isTemplateExpression(node)) {
      addClaim(node, 'template_literal', node.getText(sourceFile).replace(/[`${}]/g, ' '));
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'exportToCsv') {
      const sourceLink = nodeSourceIds(node, sourceText, sourceFile, knownSourceIds);
      const [dataArg, headersArg, filenameArg] = node.arguments;
      const text = [
        `CSV export data=${dataArg?.getText(sourceFile) ?? 'unknown'}`,
        `headers=${headersArg?.getText(sourceFile).slice(0, 180) ?? 'unknown'}`,
        `filename=${filenameArg?.getText(sourceFile).slice(0, 120) ?? 'unknown'}`,
      ].join(' ');
      addClaim(node, 'csv_export', text, sourceLink, true);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return claims;
}

function buildTableRows(consistency, sourceRowsById) {
  return consistency.tables.map((table) => {
    const sourceModule = moduleSourceLabels[table.moduleId];
    const relatedSources = [...sourceRowsById.values()].filter((source) => source.module === sourceModule);
    const gapSources = relatedSources.filter((source) => !source.can_display_as_fact);
    const requiredSourceLikeFields = table.fieldCount;
    const collectionMethods = unique(relatedSources.map((source) => source.collection_method));
    const evidenceGrades = unique(relatedSources.map((source) => source.evidence_grade));
    const risk = gapSources.length > 0 ? (gapSources.some((source) => source.verification_status === 'example') ? 'high' : 'medium') : 'low';

    return {
      module_id: table.moduleId,
      module: table.module,
      table_id: table.id,
      table_name: table.name,
      update_freq: table.updateFreq,
      field_count: table.fieldCount,
      required_field_proxy_count: requiredSourceLikeFields,
      related_source_ids: relatedSources.map((source) => source.source_id),
      related_source_count: relatedSources.length,
      source_gap_count: gapSources.length,
      evidence_grades: evidenceGrades,
      collection_methods: collectionMethods,
      risk,
      blocking_reason: gapSources.length > 0 ? 'some-related-sources-cannot-display-as-fact' : '',
      upstream: table.upstream,
      downstream: table.downstream,
    };
  });
}

function buildRouteRows(routes, consistency, claims, sourceRowsById) {
  const pageByComponent = new Map(consistency.pages.map((page) => [page.component, page]));
  const rows = routes.map((route) => {
    const componentClaims = claims.filter((claim) => claim.page_component === route.component);
    const sourceIds = unique(componentClaims.flatMap((claim) => claim.source_ids));
    const sources = sourceIds.map((id) => sourceRowsById.get(id)).filter(Boolean);
    const page = pageByComponent.get(route.component);

    return {
      route: route.route,
      component: route.component,
      file_path: page?.path ?? '',
      static_array_count: page?.staticArrayCount ?? 0,
      uses_csv_export: Boolean(page?.usesCsvExport),
      claim_count: componentClaims.length,
      high_risk_claim_count: componentClaims.filter((claim) => claim.risk === 'high').length,
      medium_risk_claim_count: componentClaims.filter((claim) => claim.risk === 'medium').length,
      source_ids: sourceIds,
      evidence_grade_counts: countBy(sources.map((source) => source.evidence_grade)),
      verification_status_counts: countBy(sources.map((source) => source.verification_status)),
      issue_counts: countBy(componentClaims.map((claim) => claim.issue_code)),
    };
  });

  const embeddedComponents = unique(claims.map((claim) => claim.page_component)).filter((component) => !routes.some((route) => route.component === component));
  for (const component of embeddedComponents) {
    const componentClaims = claims.filter((claim) => claim.page_component === component);
    const sourceIds = unique(componentClaims.flatMap((claim) => claim.source_ids));
    const sources = sourceIds.map((id) => sourceRowsById.get(id)).filter(Boolean);
    rows.push({
      route: impliedRoutes(component, routes).join('|'),
      component,
      file_path: componentClaims[0]?.file_path ?? '',
      static_array_count: 0,
      uses_csv_export: componentClaims.some((claim) => claim.claim_type === 'csv_export'),
      claim_count: componentClaims.length,
      high_risk_claim_count: componentClaims.filter((claim) => claim.risk === 'high').length,
      medium_risk_claim_count: componentClaims.filter((claim) => claim.risk === 'medium').length,
      source_ids: sourceIds,
      evidence_grade_counts: countBy(sources.map((source) => source.evidence_grade)),
      verification_status_counts: countBy(sources.map((source) => source.verification_status)),
      issue_counts: countBy(componentClaims.map((claim) => claim.issue_code)),
    });
  }

  return rows;
}

function buildReport(audit) {
  const topRoutes = [...audit.routeEvidenceMatrix]
    .sort((a, b) => b.high_risk_claim_count - a.high_risk_claim_count)
    .slice(0, 12)
    .map((row) => `| ${row.route} | ${row.component} | ${row.claim_count} | ${row.high_risk_claim_count} | ${row.source_ids.join(' ')} |`)
    .join('\n');
  const gapRows = audit.sourceGapMatrix
    .filter((row) => !row.can_display_as_fact)
    .slice(0, 20)
    .map((row) => `| ${row.source_id} | ${row.page} | ${row.verification_status} | ${row.collection_method} | ${row.blocking_reason} |`)
    .join('\n');

  return `---
title: mkt53 full data quality audit
project: mkt53
created_at: ${audit.generatedAt}
evidence_grade: L1-public-or-runtime
production_writes: false
provider_calls: false
---

# mkt53 Full Data Quality Audit

## Facts

- Route count: ${audit.summary.routeCount}
- Page component count: ${audit.summary.pageCount}
- Data table count: ${audit.summary.tableCount}
- Source registry count: ${audit.summary.sourceRegistryCount}
- Visible/data claim count: ${audit.summary.claimCount}
- High risk claim count: ${audit.summary.highRiskClaimCount}
- Source gap count: ${audit.summary.sourceGapCount}

## Evidence Boundary

This audit is local read-only/runtime evidence. It scans repository source files and does not call restricted providers, log in, bypass access controls, write production data, or deploy the site.

## P0 Route Backlog

| route | component | claims | high risk | source ids |
|---|---:|---:|---:|---|
${topRoutes}

## Source Gaps

| source id | page | status | collection method | blocker |
|---|---|---|---|---|
${gapRows}

## Collection Governance

- Public URL sources can move through agent-reach/Jina or the existing public evidence capture flow.
- Connector-required sources stay blocked until authorized private snapshots or readiness records exist.
- Manual-required sources need a review artifact before page numbers can be displayed as facts.
- Example or synthetic records must remain labeled as sample data and must not feed real KPI or CSV exports.
`;
}

export function buildDeepAudit(appRoot = process.cwd(), options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const consistency = analyzeConsistency(appRoot);
  const registry = extractSourceRegistry(appRoot);
  const routes = readRoutes(appRoot);
  const sourceGapMatrix = sourceRows(registry);
  const sourceRowsById = new Map(sourceGapMatrix.map((source) => [source.source_id, source]));
  const files = businessFiles(appRoot);
  const pageClaims = files.flatMap((file) => scanClaimsForFile(appRoot, file, routes, registry, sourceRowsById));
  const tableSourceMatrix = buildTableRows(consistency, sourceRowsById);
  const routeEvidenceMatrix = buildRouteRows(routes, consistency, pageClaims, sourceRowsById);
  const highRiskClaims = pageClaims.filter((claim) => claim.risk === 'high');
  const sourceGaps = sourceGapMatrix.filter((source) => !source.can_display_as_fact);

  const audit = {
    schemaVersion: 1,
    generatedAt,
    generatedRule:
      'Deep local data-quality audit only. It links visible numeric claims, CSV exports, tables, routes, and source registry evidence grades without provider calls or production writes.',
    boundaries: {
      productionWrites: false,
      providerCalls: false,
      publicEvidenceLiveCapture: false,
      restrictedConnectorAccess: false,
    },
    summary: {
      routeCount: routes.length,
      scannedFileCount: files.length,
      pageCount: consistency.summary.pageCount,
      tableCount: consistency.summary.tableCount,
      dataModuleCount: consistency.summary.dataModuleCount,
      sourceRegistryCount: consistency.summary.sourceRegistryCount,
      tableGovernanceCount: consistency.summary.tableGovernanceCount,
      claimCount: pageClaims.length,
      csvExportClaimCount: pageClaims.filter((claim) => claim.claim_type === 'csv_export').length,
      highRiskClaimCount: highRiskClaims.length,
      mediumRiskClaimCount: pageClaims.filter((claim) => claim.risk === 'medium').length,
      sourceGapCount: sourceGaps.length,
      unsupportedClaimCount: pageClaims.filter((claim) => ['high', 'medium'].includes(claim.risk)).length,
      meceCategories: countBy(pageClaims.map((claim) => claim.mece_category)),
      claimRiskCounts: countBy(pageClaims.map((claim) => claim.risk)),
      issueCounts: countBy(pageClaims.map((claim) => claim.issue_code)),
      sourceEvidenceGradeCounts: countBy(sourceGapMatrix.map((source) => source.evidence_grade)),
      sourceCollectionMethods: countBy(sourceGapMatrix.map((source) => source.collection_method)),
    },
    consistencySummary: consistency.summary,
    pageClaims,
    tableSourceMatrix,
    sourceGapMatrix,
    routeEvidenceMatrix,
  };

  audit.auditReportMarkdown = buildReport(audit);
  return audit;
}

function defaultOutDir() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return join('tmp', 'audits', `full-data-quality-${stamp}`);
}

function writeAudit(appRoot, audit, outDir) {
  const targetDir = resolve(appRoot, outDir);
  mkdirSync(targetDir, { recursive: true });

  writeJson(join(targetDir, 'deep-audit-summary.json'), {
    schemaVersion: audit.schemaVersion,
    generatedAt: audit.generatedAt,
    generatedRule: audit.generatedRule,
    boundaries: audit.boundaries,
    summary: audit.summary,
  });
  writeCsv(join(targetDir, 'page_claims.csv'), audit.pageClaims, [
    'page_component',
    'routes',
    'file_path',
    'line',
    'claim_type',
    'static_context',
    'mece_category',
    'text',
    'numeric_tokens',
    'source_ids',
    'source_coverage',
    'source_statuses',
    'evidence_grades',
    'collection_methods',
    'risk',
    'issue_code',
  ]);
  writeCsv(join(targetDir, 'table_source_matrix.csv'), audit.tableSourceMatrix, [
    'module_id',
    'module',
    'table_id',
    'table_name',
    'update_freq',
    'field_count',
    'required_field_proxy_count',
    'related_source_ids',
    'related_source_count',
    'source_gap_count',
    'evidence_grades',
    'collection_methods',
    'risk',
    'blocking_reason',
    'upstream',
    'downstream',
  ]);
  writeCsv(join(targetDir, 'source_gap_matrix.csv'), audit.sourceGapMatrix, [
    'source_id',
    'module',
    'page',
    'metric',
    'source_name',
    'source_type',
    'verification_status',
    'reliability',
    'last_verified',
    'collection_method',
    'evidence_grade',
    'can_display_as_fact',
    'blocking_reason',
    'privacy_level',
    'evidence_artifact_path',
    'claim_scope',
    'source_url',
    'action',
    'gap',
    'recommended_collection_lane',
  ]);
  writeJson(join(targetDir, 'route_evidence_matrix.json'), audit.routeEvidenceMatrix);
  writeFileSync(join(targetDir, 'audit-report.md'), audit.auditReportMarkdown);

  return targetDir;
}

function printHuman(audit, outputDir) {
  const lines = [
    'mkt53 deep data quality audit',
    `generatedAt=${audit.generatedAt}`,
    `routes=${audit.summary.routeCount}`,
    `pages=${audit.summary.pageCount}`,
    `tables=${audit.summary.tableCount}`,
    `sourceRegistry=${audit.summary.sourceRegistryCount}`,
    `claims=${audit.summary.claimCount}`,
    `csvExports=${audit.summary.csvExportClaimCount}`,
    `highRiskClaims=${audit.summary.highRiskClaimCount}`,
    `sourceGaps=${audit.summary.sourceGapCount}`,
    `providerCalls=${audit.boundaries.providerCalls}`,
    `productionWrites=${audit.boundaries.productionWrites}`,
    outputDir ? `outputDir=${relative(process.cwd(), outputDir)}` : 'outputDir=not-written',
    '',
  ];
  process.stdout.write(lines.join('\n'));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const appRoot = process.cwd();
  const audit = buildDeepAudit(appRoot);
  const outputDir = options.write ? writeAudit(appRoot, audit, options.outDir ?? defaultOutDir()) : undefined;

  if (options.summaryJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: audit.schemaVersion,
          generatedAt: audit.generatedAt,
          boundaries: audit.boundaries,
          summary: audit.summary,
          sourceGapMatrix: audit.sourceGapMatrix,
          highRiskClaimSamples: audit.pageClaims.filter((claim) => claim.risk === 'high').slice(0, 20),
          outputDir: outputDir ? relative(appRoot, outputDir) : undefined,
        },
        null,
        2,
      )}\n`,
    );
  } else if (options.json) {
    process.stdout.write(`${JSON.stringify({ ...audit, auditReportMarkdown: undefined, outputDir: outputDir ? relative(appRoot, outputDir) : undefined }, null, 2)}\n`);
  } else {
    printHuman(audit, outputDir);
  }

  if (options.strict && audit.summary.highRiskClaimCount > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
