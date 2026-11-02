import { routeReadinessProjection } from '@/data/route-readiness.generated';

export type SourceReadiness = 'blocked' | 'partial' | 'source-backed';
export type DecisionReadiness = 'ready' | 'not-ready';
export type RouteReadinessEntry = (typeof routeReadinessProjection.routes)[number];

function canonicalRoute(pathname: string) {
  if (/^\/report\/[^/]+\/?$/.test(pathname)) return '/report/:id';
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

export function getRouteReadiness(pathname: string): RouteReadinessEntry | undefined {
  const route = canonicalRoute(pathname);
  return routeReadinessProjection.routes.find((entry) => entry.route === route);
}
