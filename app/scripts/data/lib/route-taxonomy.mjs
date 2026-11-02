export const ROUTE_MECE_CATEGORIES = {
  navigation: 'navigation_misc',
  market: 'market_size_share_trend',
  competition: 'competitor_price_rank_product',
  users: 'user_voc_interview_social',
  industry: 'industry_policy_ip_exhibition_supply',
  self: 'self_business_channel_promo',
  ai: 'ai_analysis_output',
  governance: 'reports_exports_governance',
};

export function routeMeceCategory(route) {
  if (route === '/') return ROUTE_MECE_CATEGORIES.navigation;
  if (route.startsWith('/market')) return ROUTE_MECE_CATEGORIES.market;
  if (route.startsWith('/competition')) return ROUTE_MECE_CATEGORIES.competition;
  if (route.startsWith('/users')) return ROUTE_MECE_CATEGORIES.users;
  if (route.startsWith('/industry')) return ROUTE_MECE_CATEGORIES.industry;
  if (route === '/self') return ROUTE_MECE_CATEGORIES.self;
  if (route.startsWith('/ai-assistant') || route === '/ai-gallery') return ROUTE_MECE_CATEGORIES.ai;
  if (route.startsWith('/report') || route === '/data' || route === '/data-source') {
    return ROUTE_MECE_CATEGORIES.governance;
  }
  return ROUTE_MECE_CATEGORIES.navigation;
}
