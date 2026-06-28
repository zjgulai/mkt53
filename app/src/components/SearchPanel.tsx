// ═══════════════════════════════════════════════════════════════
// 全局搜索面板 — 搜索产品/报告/法规/数据
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, Target, Shield, BarChart3, Clock, TrendingUp } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  path: string;
  desc: string;
  icon: typeof FileText;
  color: string;
}

const allSearchData: SearchResult[] = [
  // 产品
  { id: 'sp-01', title: 'M5 穿戴式吸奶器', category: '产品', path: '/competition', desc: 'Momcozy产品线索 · 价格/评分/上市时间需授权采集复核', icon: Target, color: '#C25B6E' },
  { id: 'sp-02', title: 'M9 Mobile Flow', category: '产品', path: '/competition', desc: 'Momcozy产品线索 · Amazon评分和价格需连接器验证', icon: Target, color: '#C25B6E' },
  { id: 'sp-03', title: 'W1 加热款', category: '产品', path: '/competition', desc: '新品线索 · 发布节奏和销售影响需内部计划确认', icon: Target, color: '#ff9500' },
  { id: 'sp-04', title: 'KleanPal Pro 洗消一体机', category: '产品', path: '/competition', desc: '产品线索 · 技术参数与零售表现需来源复核', icon: Target, color: '#34c759' },
  // 报告
  { id: 'sr-01', title: 'Momcozy vs Medela vs Willow 品牌竞争力深度对比', category: '报告', path: '/reports', desc: '报告目录条目 · 页数/发布日期需内部报告库复核', icon: FileText, color: '#C25B6E' },
  { id: 'sr-02', title: '全球吸奶器市场竞争格局报告', category: '报告', path: '/reports', desc: '报告目录条目 · 竞争数据需来源矩阵确认', icon: FileText, color: '#C25B6E' },
  { id: 'sr-03', title: 'Momcozy W1 加热款拆解与BOM成本分析', category: '报告', path: '/reports', desc: '报告目录条目 · BOM成本需内部授权文件支撑', icon: FileText, color: '#ff9500' },
  { id: 'sr-04', title: '北美母婴护理市场深度分析', category: '报告', path: '/reports', desc: '报告目录条目 · 区域宏观引用需绑定 source registry', icon: FileText, color: '#5856d6' },
  // 政策法规
  { id: 'sl-01', title: 'CPSC CPC/eFiling：证书数据要求复核', category: '法规', path: '/industry/regulation', desc: '美国 · 官方规则可公开复核 · SKU影响待确认', icon: Shield, color: '#ff3b30' },
  { id: 'sl-02', title: 'EU MDR 2017/745 过渡安排复核', category: '法规', path: '/industry/regulation', desc: '欧盟 · 医疗器械路径需按产品适用性确认', icon: Shield, color: '#5856d6' },
  { id: 'sl-03', title: '日本《消费品安全法》：PSC标志适用性复核', category: '法规', path: '/industry/regulation', desc: '日本 · 认证路径和日期需官方/合规台账确认', icon: Shield, color: '#0077b6' },
  { id: 'sl-04', title: 'GB 46523-2025儿童用品通用安全要求', category: '法规', path: '/industry/regulation', desc: '中国 · 国标实施信息需官方文本绑定', icon: Shield, color: '#ff3b30' },
  // 市场数据
  { id: 'sm-01', title: '全球吸奶器市场规模与份额分母', category: '市场', path: '/market', desc: '$3.81B 品类TAM · CAGR 8.52% · Precedence Research · ds-001', icon: BarChart3, color: '#C25B6E' },
  { id: 'sm-02', title: '品牌份额趋势待授权', category: '市场', path: '/market', desc: '需Amazon Brand Analytics/零售面板接入，不使用示例份额', icon: TrendingUp, color: '#ff9500' },
  { id: 'sm-03', title: '穿戴式吸奶器细分市场', category: '市场', path: '/market', desc: '$233M · CAGR 15.08% · Fortune BI · ds-045', icon: BarChart3, color: '#34c759' },
];

const recentSearches = ['M5', 'CPSC复核', '市场份额', 'W1加热款', 'Medela'];
const hotSearches = ['CPSC eFiling', 'MDR过渡期', 'TikTok Shop', 'Prime Day定价', 'BCG矩阵'];

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ESC关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    if (isOpen) { document.addEventListener('keydown', handleEsc); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [isOpen, handleClose]);

  const categories = ['全部', '产品', '报告', '法规', '市场'];

  const results = allSearchData.filter(item => {
    if (activeCategory !== '全部' && item.category !== activeCategory) return false;
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  const handleResultClick = (path: string) => {
    handleClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]" onClick={handleClose}>
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      {/* 搜索面板 */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4" onClick={e => e.stopPropagation()}>
        <div className="bg-white rounded-2xl shadow-2xl border border-[#EDE6DF] overflow-hidden">
          {/* 搜索输入 */}
          <div className="flex items-center gap-3 p-4 border-b border-[#EDE6DF]">
            <Search className="w-5 h-5 text-[#B5AFA8] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索产品、报告、法规、市场数据..."
              className="flex-1 text-base text-[#1d1d1f] placeholder-[#B5AFA8] outline-none bg-transparent"
            />
            <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868b] hover:bg-[#FBF8F5] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 分类筛选 */}
          {query.trim() && (
            <div className="flex items-center gap-1 px-4 pt-3 pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeCategory === cat ? 'bg-[#C25B6E] text-white' : 'bg-[#FBF8F5] text-[#86868b] hover:bg-[#F5EDE8]'}`}
                >
                  {cat}
                  {cat !== '全部' && <span className="ml-1 opacity-70">{allSearchData.filter(d => d.category === cat).length}</span>}
                </button>
              ))}
            </div>
          )}

          {/* 搜索结果 */}
          <div className="max-h-[400px] overflow-y-auto">
            {query.trim() ? (
              results.length > 0 ? (
                <div className="p-2">
                  {results.map(item => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleResultClick(item.path)}
                        className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-[#FBF8F5] transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                          <IconComp className="w-4 h-4" style={{ color: item.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#1d1d1f] truncate">{item.title}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0" style={{ backgroundColor: `${item.color}15`, color: item.color }}>{item.category}</span>
                          </div>
                          <p className="text-xs text-[#86868b] mt-0.5 truncate">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Search className="w-8 h-8 text-[#EDE6DF] mx-auto mb-2" />
                  <p className="text-sm text-[#86868b]">未找到 &quot;{query}&quot; 相关结果</p>
                  <p className="text-xs text-[#B5AFA8] mt-1">尝试搜索产品型号、报告关键词或法规名称</p>
                </div>
              )
            ) : (
              /* 默认状态 - 最近搜索 + 热门搜索 */
              <div className="p-4">
                {/* 最近搜索 */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-[#B5AFA8]" />
                    <span className="text-xs text-[#86868b] font-medium">最近搜索</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((s, i) => (
                      <button key={i} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 热门搜索 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[#B5AFA8]" />
                    <span className="text-xs text-[#86868b] font-medium">热门搜索</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hotSearches.map((s, i) => (
                      <button key={i} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#ff9500]/10 hover:text-[#ff9500] transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 快捷入口 */}
                <div className="mt-4 pt-4 border-t border-[#EDE6DF]">
                  <span className="text-xs text-[#86868b] font-medium mb-2 block">快捷入口</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '看市场', path: '/market', icon: BarChart3, color: '#C25B6E' },
                      { label: '看竞争', path: '/competition', icon: Target, color: '#ff9500' },
                      { label: '报告中心', path: '/reports', icon: FileText, color: '#5856d6' },
                      { label: '政策法规', path: '/industry', icon: Shield, color: '#34c759' },
                    ].map((item, i) => {
                      const IC = item.icon;
                      return (
                        <button key={i} onClick={() => handleResultClick(item.path)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                            <IC className="w-4 h-4" style={{ color: item.color }} />
                          </div>
                          <span className="text-[10px] text-[#86868b]">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="px-4 py-2.5 border-t border-[#EDE6DF] bg-[#FAF8F6] flex items-center justify-between">
            <span className="text-[10px] text-[#B5AFA8]">共索引 {allSearchData.length} 条数据</span>
            <span className="text-[10px] text-[#B5AFA8]">ESC 关闭 · Enter 跳转</span>
          </div>
        </div>
      </div>
    </div>
  );
}
