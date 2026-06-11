import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Zap, User, MessageSquare, Youtube, Wand2, BookOpen, BarChart3, Globe, Search } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import { aiAssistantSidebarItems } from './ai-assistant/constants';

const iconMap: Record<string, React.ElementType> = {
  '智能问答': MessageSquare,
  '评论分析': Search,
  'YouTube测评': Youtube,
  '产品设计助手': Wand2,
  '知识库检索': BookOpen,
  '评论数据': BarChart3,
  '网站评测分析': Globe,
};

const chatHistory = [
  { role: 'ai', content: '您好！我是 Momcozy AI 市场洞察助手。我可以帮您分析母婴市场趋势、竞品动态、用户画像。请告诉我您的需求。' },
  { role: 'user', content: '帮我分析2025年穿戴式吸奶器的市场趋势' },
  { role: 'ai', content: '根据2025年母婴市场数据，穿戴式吸奶器呈现以下趋势：\n1. 静音设计成为核心竞争力，低于40dB成为标配\n2. APP智能控制+数据追踪成为差异化功能\n3. 轻量化设计，主流产品重量降至200g以下\n4. 模块化护罩系统，适配更多胸型\n5. 环保材料使用率提升，BPA-free成为基础要求' },
];

// R31: 快捷命令按场景分类
const commandCategories = [
  {
    label: '市场分析',
    color: '#C25B6E',
    commands: ['全球吸奶器市场规模预测', '北美母婴市场PEST分析', '穿戴式吸奶器技术趋势'],
  },
  {
    label: '竞品情报',
    color: '#ff9500',
    commands: ['分析Medela/Spectra优劣势', '评估M5 vs M9市场定位差异', 'Willow Sync威胁评估'],
  },
  {
    label: '用户研究',
    color: '#34c759',
    commands: ['分析穿戴式吸奶器用户痛点', '分析妈妈用户对M5的反馈', '背奶妈妈场景需求分析'],
  },
  {
    label: '产品设计',
    color: '#5856d6',
    commands: ['推荐母婴市场配色趋势', '静音吸奶器技术方案', '下一代产品功能建议'],
  },
];

export default function AIAssistantPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState(chatHistory);

  const handleSend = () => {
    if (!query.trim()) return;
    setMessages([...messages, { role: 'user', content: query }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: '收到您的请求，我正在基于当前页面示例配置和待复核市场资料整理线索。穿戴式吸奶器品类需要继续补齐真实数据快照、来源窗口和人工复核记录后再形成经营结论。' }]);
    }, 800);
    setQuery('');
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-120px)]">
          {/* Sidebar */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF] h-fit">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}><Zap className="w-4 h-4 text-white" strokeWidth={2.2} /></div>
              <h3 className="text-sm font-semibold text-[#1d1d1f]">AI 助手</h3>
            </div>
            {/* R35: 最近分析历史 */}
            <div className="mb-4 p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
              <p className="text-[10px] text-[#86868b] font-medium mb-2">最近分析</p>
              <div className="space-y-1.5">
                {['M5 vs Medela Melody对比', 'Q2北美市场机会点', 'W1加热款用户反馈'].map((h, i) => (
                  <button key={i} className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] text-[#1d1d1f] hover:bg-white transition-all truncate">
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              {aiAssistantSidebarItems.map((item, i) => {
                const IconComp = iconMap[item.label] || MessageSquare;
                const isActive = item.path === '/ai-assistant';
                return (
                  <button key={i} onClick={() => navigate(item.path)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? 'bg-[#C25B6E]/10 text-[#C25B6E] font-medium' : 'text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>
                    <IconComp className="w-4 h-4" strokeWidth={2} /><span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 bg-white rounded-2xl card-shadow-sm border border-[#EDE6DF] flex flex-col overflow-hidden">
            {/* R33: 示例对话引导 */}
            <div className="px-5 py-3 border-b border-[#EDE6DF] bg-[#FBF8F5]/30">
              <p className="text-[10px] text-[#86868b]">
                <span className="text-[#C25B6E] font-medium">示例：</span>
                "分析2026年Q1全球吸奶器市场份额变化" → "Medela新品威胁评估" → "生成M5产品优化建议"
              </p>
            </div>
            <div className="px-5 pt-4">
              <PageEvidenceNotice
                sourceIds={['ds-025']}
                title="AI助手演示边界"
                description="快捷指令、最近分析和对话回复为静态演示配置，未接入真实调用日志、检索链路或服务端审计。当前回复只能作为线索整理，不作为已验证市场结论。"
                cadence="演示配置"
              />
            </div>
            <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-[#C25B6E] flex items-center justify-center flex-shrink-0 shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E35' }}><Zap className="w-4 h-4 text-white" strokeWidth={2.2} /></div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl p-3 text-sm whitespace-pre-line ${msg.role === 'ai' ? 'bg-[#FBF8F5] text-[#1d1d1f]' : 'bg-[#C25B6E] text-white'}`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-[#C25B6E]/80 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-white" strokeWidth={2.2} /></div>
                  )}
                </div>
              ))}
            </div>
            {/* R34: AI能力边界说明 */}
            <div className="px-4 py-2 border-t border-[#EDE6DF] bg-[#FBF8F5]/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] text-[#B5AFA8]">AI能力边界：</span>
                {['市场趋势分析', '竞品数据对比', '用户洞察提取', '产品建议生成'].map((c, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-white text-[9px] text-[#86868b] border border-[#EDE6DF]">{c}</span>
                ))}
                <span className="text-[9px] text-[#ff9500] ml-auto">静态演示配置 · 待接入调用日志</span>
              </div>
            </div>
            <div className="p-4 border-t border-[#EDE6DF]">
              {/* R31: 分类快捷命令 */}
              <div className="mb-3 space-y-2">
                {commandCategories.map((cat, ci) => (
                  <div key={ci} className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>{cat.label}</span>
                    {cat.commands.map((cmd, i) => (
                      <button key={i} onClick={() => { setQuery(cmd); }} className="px-2.5 py-1 rounded-lg bg-[#FBF8F5] text-[11px] text-[#1d1d1f] hover:bg-[#EDE6DF] transition-all border border-[#EDE6DF]/50">{cmd}</button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="text" placeholder="输入您的问题..." className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#C25B6E]" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                <button onClick={handleSend} className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center hover:bg-[#D46B7E] shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E35' }}><Send className="w-4 h-4 text-white" strokeWidth={2.2} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
