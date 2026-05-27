import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#C25B6E]/10 to-[#af52de]/10 flex items-center justify-center mx-auto mb-6">
          <Search className="w-12 h-12 text-[#C25B6E]" />
        </div>
        <h1 className="text-7xl font-bold text-[#C25B6E] mb-2">404</h1>
        <p className="text-lg font-medium text-[#1d1d1f] truncate mb-1">页面未找到</p>
        <p className="text-sm text-[#86868B] mb-8">您访问的页面不存在或已被移除</p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => window.history.back()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#EDE6DF] text-sm text-[#86868B] hover:bg-[#FBF8F5] transition-colors duration-200">
            <ArrowLeft className="w-4 h-4" />返回
          </button>
          <Link to="/" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C25B6E] text-white text-sm font-medium hover:bg-[#A34759] transition-colors duration-200">
            <Home className="w-4 h-4" />回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
