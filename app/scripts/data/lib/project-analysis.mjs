import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import ts from 'typescript';

export function isoWeek(input = new Date()) {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function readSourceFile(filePath) {
  return ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.ES2023, true, ts.ScriptKind.TSX);
}

function unwrapExpression(node) {
  let current = node;

  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return undefined;
}

function findVariableInitializer(sourceFile, variableName) {
  let initializer;

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) {
      initializer = node.initializer ? unwrapExpression(node.initializer) : undefined;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return initializer;
}

function literalValue(node) {
  const current = unwrapExpression(node);

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return current.text;
  if (ts.isNumericLiteral(current)) return Number(current.text);
  if (current.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (current.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isIdentifier(current)) return current.text;
  if (ts.isArrayLiteralExpression(current)) return current.elements.map((item) => literalValue(item));

  if (ts.isObjectLiteralExpression(current)) {
    const output = {};

    for (const prop of current.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = propertyNameText(prop.name);
      if (!key) continue;
      output[key] = literalValue(prop.initializer);
    }

    return output;
  }

  return undefined;
}

function arrayFromVariable(filePath, variableName) {
  const sourceFile = readSourceFile(filePath);
  const initializer = findVariableInitializer(sourceFile, variableName);

  if (!initializer || !ts.isArrayLiteralExpression(initializer)) {
    throw new Error(`Cannot find array variable ${variableName} in ${filePath}`);
  }

  return initializer.elements.map((element) => literalValue(element)).filter(Boolean);
}

function objectKeysFromVariable(filePath, variableName) {
  const sourceFile = readSourceFile(filePath);
  const initializer = findVariableInitializer(sourceFile, variableName);

  if (!initializer || !ts.isObjectLiteralExpression(initializer)) {
    throw new Error(`Cannot find object variable ${variableName} in ${filePath}`);
  }

  return initializer.properties
    .filter(ts.isPropertyAssignment)
    .map((prop) => propertyNameText(prop.name))
    .filter(Boolean);
}

function walkFiles(dir, predicate) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const stat = statSync(path);

    if (stat.isDirectory()) return walkFiles(path, predicate);
    return predicate(path) ? [path] : [];
  });
}

export function extractSourceRegistry(appRoot = process.cwd()) {
  return arrayFromVariable(join(appRoot, 'src/data/source-registry.ts'), 'sourceRegistry');
}

export function extractDataModules(appRoot = process.cwd()) {
  const modules = arrayFromVariable(join(appRoot, 'src/pages/DataManage.tsx'), 'dataModules');

  return modules.map((module) => ({
    id: module.id,
    name: module.name,
    page: module.page,
    tables: Array.isArray(module.tables)
      ? module.tables.map((table) => ({
          id: table.id,
          name: table.name,
          desc: table.desc,
          updateFreq: table.updateFreq,
          upstream: Array.isArray(table.upstream) ? table.upstream : [],
          downstream: Array.isArray(table.downstream) ? table.downstream : [],
          fieldCount: Array.isArray(table.fields) ? table.fields.length : 0,
        }))
      : [],
  }));
}

export function extractTableGovernanceIds(appRoot = process.cwd()) {
  return objectKeysFromVariable(join(appRoot, 'src/pages/DataManage.tsx'), 'tableGovernance');
}

export function listPageComponents(appRoot = process.cwd()) {
  const pageRoot = join(appRoot, 'src/pages');

  return walkFiles(pageRoot, (path) => path.endsWith('.tsx')).map((path) => {
    const source = readFileSync(path, 'utf8');
    const relativePath = relative(join(appRoot, 'src'), path);
    const component = basename(path, '.tsx');

    return {
      component,
      path: relativePath,
      staticArrayCount: (source.match(/const\s+\w+\s*=\s*\[/g) ?? []).length,
      directRegistryIds: [...source.matchAll(/getSourceRegistryItem\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]),
      usesCsvExport: source.includes('exportToCsv'),
    };
  });
}

export function classifyCollectionMethod(source) {
  const text = `${source.sourceType ?? ''} ${source.sourceName ?? ''} ${source.note ?? ''}`.toLowerCase();
  const url = source.sourceUrl ? new URL(source.sourceUrl) : undefined;
  const sourceName = source.sourceName ?? '';

  if (/(代码资产|code asset)/i.test(text) && (/^(app\/|src\/)/.test(sourceName) || /github\.com\/[^/]+\/[^/]+\/blob\/.+\/app\//i.test(source.sourceUrl ?? ''))) {
    return 'local-file-check';
  }

  if (!source.sourceUrl) {
    return /(crm|erp|内部|amazon|api|社交|tiktok|ig|fb|ai模型|nlp|爬虫|import genius)/i.test(text)
      ? 'connector-required'
      : 'manual-required';
  }

  if (url && /vendorcentral\.amazon\.com|amazon\.com|importgenius\.com/i.test(url.hostname)) {
    return 'connector-required';
  }

  if (/(crm|erp|amazon api|brand analytics|社交媒体api|平台api|ai模型|nlp模型|爬虫)/i.test(text)) {
    return 'connector-required';
  }

  return 'public-url-check';
}

export function analyzeConsistency(appRoot = process.cwd()) {
  const dataManagePath = join(appRoot, 'src/pages/DataManage.tsx');
  const dataManageSource = readFileSync(dataManagePath, 'utf8');
  const dataModules = extractDataModules(appRoot);
  const tableGovernanceIds = extractTableGovernanceIds(appRoot);
  const sourceRegistry = extractSourceRegistry(appRoot);
  const pages = listPageComponents(appRoot);
  const tables = dataModules.flatMap((module) => module.tables.map((table) => ({ ...table, module: module.name, moduleId: module.id })));
  const tableIds = new Set(tables.map((table) => table.id));
  const governanceIds = new Set(tableGovernanceIds);
  const pageComponents = new Set(pages.map((page) => page.component));
  const registryPages = new Set(sourceRegistry.map((source) => source.page));
  const registryIds = new Set(sourceRegistry.map((source) => source.id));
  const declaredTableCount = Number(dataManageSource.match(/(\d+)\s*张数据表/)?.[1] ?? NaN);

  const pagesWithStaticDataWithoutRegistry = pages
    .filter((page) => page.staticArrayCount > 0)
    .filter((page) => !registryPages.has(page.component) && page.directRegistryIds.length === 0)
    .map((page) => ({ component: page.component, path: page.path, staticArrayCount: page.staticArrayCount }));

  const registryPagesMissingComponent = [...registryPages].filter((page) => !pageComponents.has(page));
  const directRegistryIdsMissing = pages
    .flatMap((page) => page.directRegistryIds.map((id) => ({ page: page.component, id })))
    .filter((item) => !registryIds.has(item.id));

  const tablesMissingGovernance = tables.filter((table) => !governanceIds.has(table.id)).map((table) => table.id);
  const governanceWithoutTable = tableGovernanceIds.filter((id) => !tableIds.has(id));

  const collectionMethods = sourceRegistry.reduce((acc, source) => {
    const method = classifyCollectionMethod(source);
    acc[method] = (acc[method] ?? 0) + 1;
    return acc;
  }, {});

  const issues = [
    ...(Number.isFinite(declaredTableCount) && declaredTableCount !== tables.length
      ? [{ severity: 'warning', code: 'data-management-comment-table-count-drift', detail: `declared=${declaredTableCount}, actual=${tables.length}` }]
      : []),
    ...(tablesMissingGovernance.length
      ? [{ severity: 'critical', code: 'tables-missing-governance', detail: tablesMissingGovernance.join(', ') }]
      : []),
    ...(governanceWithoutTable.length
      ? [{ severity: 'critical', code: 'governance-without-table', detail: governanceWithoutTable.join(', ') }]
      : []),
    ...(registryPagesMissingComponent.length
      ? [{ severity: 'critical', code: 'registry-pages-missing-component', detail: registryPagesMissingComponent.join(', ') }]
      : []),
    ...(directRegistryIdsMissing.length
      ? [{ severity: 'critical', code: 'direct-registry-ids-missing', detail: directRegistryIdsMissing.map((item) => `${item.page}:${item.id}`).join(', ') }]
      : []),
    ...(pagesWithStaticDataWithoutRegistry.length
      ? [{ severity: 'warning', code: 'pages-with-static-data-without-registry', detail: `${pagesWithStaticDataWithoutRegistry.length} pages` }]
      : []),
  ];

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      pageCount: pages.length,
      tableCount: tables.length,
      dataModuleCount: dataModules.length,
      sourceRegistryCount: sourceRegistry.length,
      tableGovernanceCount: tableGovernanceIds.length,
      pagesWithStaticDataWithoutRegistry: pagesWithStaticDataWithoutRegistry.length,
      collectionMethods,
      issueCount: issues.length,
      criticalIssueCount: issues.filter((issue) => issue.severity === 'critical').length,
    },
    dataModules,
    tables,
    pages,
    pagesWithStaticDataWithoutRegistry,
    registryPagesMissingComponent,
    directRegistryIdsMissing,
    tablesMissingGovernance,
    governanceWithoutTable,
    issues,
  };
}
