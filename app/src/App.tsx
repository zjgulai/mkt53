import { Routes, Route } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useScrollTop } from '@/hooks/useScrollTop';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';
import ErrorBoundary from '@/components/ErrorBoundary';

// Direct imports — no lazy loading
import MarketPage from '@/pages/MarketPage';
import CompetitionPage from '@/pages/CompetitionPage';
import UsersPage from '@/pages/UsersPage';
import IndustryPage from '@/pages/IndustryPage';
import AIAssistantPage from '@/pages/AIAssistantPage';
import SelfInsight from '@/pages/SelfInsight';
import AIGallery from '@/pages/AIGallery';
import ReportsPage from '@/pages/ReportsPage';
import ReportPreview from '@/pages/ReportPreview';
import DataManage from '@/pages/DataManage';
import DataSourcePage from '@/pages/DataSourcePage';

// Competition sub-pages
import NewCompetition from '@/pages/competition/NewCompetition';
import RegionCompetition from '@/pages/competition/RegionCompetition';
import ProductManage from '@/pages/competition/ProductManage';

// Market sub-pages
import MarketTrend from '@/pages/market/MarketTrend';
import BreastPump from '@/pages/market/BreastPump';
import NursingProducts from '@/pages/market/NursingProducts';
import BabyCare from '@/pages/market/BabyCare';
import CustomsData from '@/pages/market/CustomsData';
import CategoryAnalysis from '@/pages/market/CategoryAnalysis';

// Users sub-pages
import OverseasSentiment from '@/pages/users/OverseasSentiment';
import ConsumerInterviews from '@/pages/users/ConsumerInterviews';
import ChannelInterviews from '@/pages/users/ChannelInterviews';
import StoreInterviews from '@/pages/users/StoreInterviews';
import Aesthetics from '@/pages/users/Aesthetics';

// Industry sub-pages
import PolicyInsight from '@/pages/industry/PolicyInsight';
import FlavorMap from '@/pages/industry/FlavorMap';
import SupplyChain from '@/pages/industry/SupplyChain';
import Exhibition from '@/pages/industry/Exhibition';
import RegulationDetail from '@/pages/industry/RegulationDetail';
import FlavorReport from '@/pages/industry/FlavorReport';
import IndustryNews from '@/pages/industry/IndustryNews';
import TechNews from '@/pages/industry/TechNews';
import IPAnalysis from '@/pages/industry/IPAnalysis';

// AI Assistant sub-pages
import ReviewAnalysis from '@/pages/ai-assistant/ReviewAnalysis';
import YoutubeReview from '@/pages/ai-assistant/YoutubeReview';
import DesignAssistant from '@/pages/ai-assistant/DesignAssistant';
import KnowledgeBase from '@/pages/ai-assistant/KnowledgeBase';
import CommentData from '@/pages/ai-assistant/CommentData';
import WebReview from '@/pages/ai-assistant/WebReview';

function App() {
  useScrollTop();
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F7F0EB]">
        <Navbar />
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
      </div>
    </ErrorBoundary>
  );
}

export default App;
