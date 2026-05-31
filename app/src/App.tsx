import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useScrollTop } from '@/hooks/useScrollTop';
import NotFoundPage from '@/pages/NotFoundPage';
import ErrorBoundary from '@/components/ErrorBoundary';
import {
  AIAssistantPage,
  AIGallery,
  Aesthetics,
  BabyCare,
  BreastPump,
  CategoryAnalysis,
  ChannelInterviews,
  CommentData,
  CompetitionPage,
  ConsumerInterviews,
  CustomsData,
  DataManage,
  DataSourcePage,
  DesignAssistant,
  Exhibition,
  FlavorMap,
  FlavorReport,
  HomePage,
  IPAnalysis,
  IndustryNews,
  IndustryPage,
  KnowledgeBase,
  MarketPage,
  MarketTrend,
  NewCompetition,
  NursingProducts,
  OverseasSentiment,
  PolicyInsight,
  ProductManage,
  RegionCompetition,
  RegulationDetail,
  ReportsPage,
  ReportPreview,
  ReviewAnalysis,
  SelfInsight,
  StoreInterviews,
  SupplyChain,
  TechNews,
  UsersPage,
  WebReview,
  YoutubeReview,
} from '@/routes/lazy-pages';

function PageFallback() {
  return (
    <main className="min-h-[60vh] pt-28 px-4 flex items-center justify-center text-sm text-[#7A6B6B]">
      页面加载中...
    </main>
  );
}

function App() {
  useScrollTop();
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F7F0EB]">
        <Navbar />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/market/trend" element={<MarketTrend />} />
            <Route path="/market/mtl" element={<BreastPump />} />
            <Route path="/market/dtl" element={<NursingProducts />} />
            <Route path="/market/consumables" element={<BabyCare />} />
            <Route path="/market/customs" element={<CustomsData />} />
            <Route path="/market/category" element={<CategoryAnalysis />} />
            <Route path="/competition" element={<CompetitionPage />} />
            <Route path="/competition/new" element={<NewCompetition />} />
            <Route path="/competition/region" element={<RegionCompetition />} />
            <Route path="/competition/products" element={<ProductManage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/overseas" element={<OverseasSentiment />} />
            <Route path="/users/consumer" element={<ConsumerInterviews />} />
            <Route path="/users/channel" element={<ChannelInterviews />} />
            <Route path="/users/store" element={<StoreInterviews />} />
            <Route path="/users/regional" element={<UsersPage />} />
            <Route path="/users/global" element={<UsersPage />} />
            <Route path="/users/aesthetics" element={<Aesthetics />} />
            <Route path="/industry" element={<IndustryPage />} />
            <Route path="/industry/regulation" element={<RegulationDetail />} />
            <Route path="/industry/policy-insight" element={<PolicyInsight />} />
            <Route path="/industry/flavor-map" element={<FlavorMap />} />
            <Route path="/industry/flavor-report" element={<FlavorReport />} />
            <Route path="/industry/news" element={<IndustryNews />} />
            <Route path="/industry/tech" element={<TechNews />} />
            <Route path="/industry/reports" element={<IndustryNews />} />
            <Route path="/industry/supply" element={<SupplyChain />} />
            <Route path="/industry/ip" element={<IPAnalysis />} />
            <Route path="/industry/exhibition" element={<Exhibition />} />
            <Route path="/industry/macro" element={<RegulationDetail />} />
            <Route path="/self" element={<SelfInsight />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/ai-assistant/review-analysis" element={<ReviewAnalysis />} />
            <Route path="/ai-assistant/youtube" element={<YoutubeReview />} />
            <Route path="/ai-assistant/design" element={<DesignAssistant />} />
            <Route path="/ai-assistant/knowledge" element={<KnowledgeBase />} />
            <Route path="/ai-assistant/comment-data" element={<CommentData />} />
            <Route path="/ai-assistant/web-review" element={<WebReview />} />
            <Route path="/ai-gallery" element={<AIGallery />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/report/:id" element={<ReportPreview />} />
            <Route path="/data" element={<DataManage />} />
            <Route path="/data-source" element={<DataSourcePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;
