import { lazy } from 'react';

export const HomePage = lazy(() => import('@/pages/HomePage'));
export const MarketPage = lazy(() => import('@/pages/MarketPage'));
export const CompetitionPage = lazy(() => import('@/pages/CompetitionPage'));
export const UsersPage = lazy(() => import('@/pages/UsersPage'));
export const IndustryPage = lazy(() => import('@/pages/IndustryPage'));
export const AIAssistantPage = lazy(() => import('@/pages/AIAssistantPage'));
export const SelfInsight = lazy(() => import('@/pages/SelfInsight'));
export const AIGallery = lazy(() => import('@/pages/AIGallery'));
export const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
export const ReportPreview = lazy(() => import('@/pages/ReportPreview'));
export const DataManage = lazy(() => import('@/pages/DataManage'));
export const DataSourcePage = lazy(() => import('@/pages/DataSourcePage'));

export const NewCompetition = lazy(() => import('@/pages/competition/NewCompetition'));
export const RegionCompetition = lazy(() => import('@/pages/competition/RegionCompetition'));
export const ProductManage = lazy(() => import('@/pages/competition/ProductManage'));

export const MarketTrend = lazy(() => import('@/pages/market/MarketTrend'));
export const BreastPump = lazy(() => import('@/pages/market/BreastPump'));
export const NursingProducts = lazy(() => import('@/pages/market/NursingProducts'));
export const BabyCare = lazy(() => import('@/pages/market/BabyCare'));
export const CustomsData = lazy(() => import('@/pages/market/CustomsData'));
export const CategoryAnalysis = lazy(() => import('@/pages/market/CategoryAnalysis'));

export const OverseasSentiment = lazy(() => import('@/pages/users/OverseasSentiment'));
export const ConsumerInterviews = lazy(() => import('@/pages/users/ConsumerInterviews'));
export const ChannelInterviews = lazy(() => import('@/pages/users/ChannelInterviews'));
export const StoreInterviews = lazy(() => import('@/pages/users/StoreInterviews'));
export const Aesthetics = lazy(() => import('@/pages/users/Aesthetics'));

export const PolicyInsight = lazy(() => import('@/pages/industry/PolicyInsight'));
export const FlavorMap = lazy(() => import('@/pages/industry/FlavorMap'));
export const SupplyChain = lazy(() => import('@/pages/industry/SupplyChain'));
export const Exhibition = lazy(() => import('@/pages/industry/Exhibition'));
export const RegulationDetail = lazy(() => import('@/pages/industry/RegulationDetail'));
export const FlavorReport = lazy(() => import('@/pages/industry/FlavorReport'));
export const IndustryNews = lazy(() => import('@/pages/industry/IndustryNews'));
export const TechNews = lazy(() => import('@/pages/industry/TechNews'));
export const IPAnalysis = lazy(() => import('@/pages/industry/IPAnalysis'));

export const ReviewAnalysis = lazy(() => import('@/pages/ai-assistant/ReviewAnalysis'));
export const YoutubeReview = lazy(() => import('@/pages/ai-assistant/YoutubeReview'));
export const DesignAssistant = lazy(() => import('@/pages/ai-assistant/DesignAssistant'));
export const KnowledgeBase = lazy(() => import('@/pages/ai-assistant/KnowledgeBase'));
export const CommentData = lazy(() => import('@/pages/ai-assistant/CommentData'));
export const WebReview = lazy(() => import('@/pages/ai-assistant/WebReview'));
