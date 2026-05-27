import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Globe, Bell, Search, User, Home, BarChart3, Target, Users, Shield, Eye, Sparkles, Image, Database } from 'lucide-react';
import SearchPanel from './SearchPanel';
import NotificationCenter from './NotificationCenter';

// ═══════════════════════════════════════════════════════════
// 导航栏分组设计
// Group 1: 首页（独立入口）
// Group 2: 五看（看市场/看竞争/看用户/看行业/看自己）- 核心分析模块
// Group 3: AI能力（AI助手/AI画廊）
// ═══════════════════════════════════════════════════════════

interface NavGroup {
  label: string;
  items: { label: string; path: string; icon: typeof Home }[];
  bgColor: string;
  borderColor: string;
  labelColor: string;
}

const navGroups: NavGroup[] = [
  {
    label: '',
    bgColor: 'transparent',
    borderColor: 'transparent',
    labelColor: '',
    items: [
      { label: '首页', path: '/', icon: Home },
    ],
  },
  {
    label: '五看',
    bgColor: 'bg-[#FBF8F5]',
    borderColor: 'border-[#EDE6DF]',
    labelColor: 'text-[#C25B6E]',
    items: [
      { label: '看市场', path: '/market', icon: BarChart3 },
      { label: '看竞争', path: '/competition', icon: Target },
      { label: '看用户', path: '/users', icon: Users },
      { label: '看行业', path: '/industry', icon: Shield },
      { label: '看自己', path: '/self', icon: Eye },
    ],
  },
  {
    label: 'AI能力',
    bgColor: 'bg-[#F5F0FF]',
    borderColor: 'border-[#E8E0F0]',
    labelColor: 'text-[#af52de]',
    items: [
      { label: 'AI助手', path: '/ai-assistant', icon: Sparkles },
      { label: 'AI画廊', path: '/ai-gallery', icon: Image },
    ],
  },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 快捷键 Cmd/Ctrl+K 打开搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        setIsNotifOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // 判断某个item是否在"五看"组内处于active状态（用于高亮组标签）
  const isWuKanActive = navGroups[1].items.some(item => isActive(item.path));
  const isAIGroupActive = navGroups[2].items.some(item => isActive(item.path));

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm' : 'bg-white/90 backdrop-blur-md'}`} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/images/momcozy-logo.png" alt="Momcozy" className="h-7 w-auto" />
          </Link>

          {/* Desktop Navigation - 分组显示 */}
          <div className="hidden md:flex items-center gap-2">
            {/* Group 1: 首页 */}
            <div className="flex items-center">
              {navGroups[0].items.map((item) => {
                const IconComp = item.icon;
                return (
                  <Link key={item.path} to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive(item.path) ? 'text-[#C25B6E] bg-[#C25B6E]/10' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200/60'}`}>
                    <IconComp className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* 分隔线 */}
            <div className="w-px h-5 bg-[#EDE6DF] mx-1" />

            {/* Group 2: 五看 - 带背景色组 */}
            <div className={`flex items-center gap-0.5 px-2 py-1 rounded-xl ${isWuKanActive ? 'bg-[#C25B6E]/8' : 'bg-[#FBF8F5]'} border ${isWuKanActive ? 'border-[#C25B6E]/20' : 'border-[#EDE6DF]'} transition-all`}>
              {/* 组标签 */}
              <span className={`text-[10px] font-semibold px-1.5 mr-1 ${isWuKanActive ? 'text-[#C25B6E]' : 'text-[#C25B6E]/60'}`}>五看</span>
              {navGroups[1].items.map((item) => {
                const IconComp = item.icon;
                return (
                  <Link key={item.path} to={item.path}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium transition-all ${isActive(item.path) ? 'text-[#C25B6E] bg-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-white/60'}`}>
                    <IconComp className="w-3 h-3" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* 分隔线 */}
            <div className="w-px h-5 bg-[#EDE6DF] mx-1" />

            {/* Group 3: AI能力 */}
            <div className={`flex items-center gap-0.5 px-2 py-1 rounded-xl ${isAIGroupActive ? 'bg-[#af52de]/8' : 'bg-[#F5F0FF]'} border ${isAIGroupActive ? 'border-[#af52de]/20' : 'border-[#E8E0F0]'} transition-all`}>
              <span className={`text-[10px] font-semibold px-1.5 mr-1 ${isAIGroupActive ? 'text-[#af52de]' : 'text-[#af52de]/60'}`}>AI</span>
              {navGroups[2].items.map((item) => {
                const IconComp = item.icon;
                return (
                  <Link key={item.path} to={item.path}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium transition-all ${isActive(item.path) ? 'text-[#af52de] bg-white shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-white/60'}`}>
                    <IconComp className="w-3 h-3" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/data" className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${location.pathname === '/data' ? 'text-[#5856d6] bg-[#5856d6]/10' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`} title="数据管理">
              <Database className="w-4 h-4" />
            </Link>
            {/* 搜索按钮 — Cmd+K快捷键 */}
            <button
              onClick={() => { setIsSearchOpen(true); setIsNotifOpen(false); }}
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200"
              title="搜索 (Cmd+K)"
            >
              <Search className="w-4 h-4" />
            </button>
            {/* 通知铃铛 — 带未读红点 */}
            <button
              onClick={() => { setIsNotifOpen(prev => !prev); setIsSearchOpen(false); }}
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200"
              title="通知中心"
            >
              <Bell className="w-4 h-4" />
              {/* 未读红点 */}
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#ff3b30] text-white text-[8px] font-bold flex items-center justify-center border-2 border-white">3</span>
            </button>
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#EDE6DF]">
              <Globe className="w-3.5 h-3.5 text-[#86868b]" />
              <span className="text-xs text-[#86868b] font-medium">EN</span>
              <ChevronDown className="w-3 h-3 text-[#86868b]" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#C25B6E] flex items-center justify-center ml-1"><User className="w-4 h-4 text-white" /></div>
          </div>

          <button className="md:hidden w-8 h-8 flex items-center justify-center" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 全局搜索面板 */}
      <SearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* 通知中心面板 */}
      {isNotifOpen && (
        <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#EDE6DF]">
          <div className="px-4 py-3 space-y-6">
            {/* 首页 */}
            <div>
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2.5 rounded-xl text-sm font-medium ${isActive('/') ? 'text-[#C25B6E] bg-[#C25B6E]/10' : 'text-[#86868b]'}`}>首页</Link>
            </div>
            {/* 五看 */}
            <div className="px-3">
              <p className="text-[10px] font-semibold text-[#C25B6E] mb-1 uppercase tracking-wider">五看</p>
              <div className="space-y-1">
                {navGroups[1].items.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 rounded-xl text-sm font-medium ${isActive(item.path) ? 'text-[#C25B6E] bg-[#C25B6E]/8' : 'text-[#86868b]'}`}>{item.label}</Link>
                ))}
              </div>
            </div>
            {/* AI能力 */}
            <div className="px-3">
              <p className="text-[10px] font-semibold text-[#af52de] mb-1 uppercase tracking-wider">AI能力</p>
              <div className="space-y-1">
                {navGroups[2].items.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 rounded-xl text-sm font-medium ${isActive(item.path) ? 'text-[#af52de] bg-[#af52de]/8' : 'text-[#86868b]'}`}>{item.label}</Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
