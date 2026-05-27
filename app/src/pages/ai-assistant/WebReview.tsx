import { useNavigate } from 'react-router-dom';
import { aiAssistantSidebarItems } from './constants';
import { Globe } from 'lucide-react';

const stats = [{"label":"评测网站","value":"12"},{"label":"检测指标","value":"48"},{"label":"Momcozy得分","value":"87"},{"label":"行业平均","value":"72"}];

const features = ["官网性能与用户体验评测","竞品网站功能对比分析","SEO优化建议与关键词分析","移动端适配性测试","购物车转化率优化建议"];

const insights = [{"topic":"页面加载速度","sentiment":"正面","mentions":89,"trend":"上升"},{"topic":"产品筛选功能","sentiment":"混合","mentions":56,"trend":"稳定"},{"topic":"移动端体验","sentiment":"正面","mentions":134,"trend":"上升"},{"topic":"多语言支持","sentiment":"正面","mentions":78,"trend":"上升"},{"topic":"支付流程","sentiment":"混合","mentions":45,"trend":"稳定"}];

export default function WebReview() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <aside className="w-56 bg-white rounded-2xl p-3 h-fit sticky top-20 card-shadow-sm border border-[#EDE6DF] flex-shrink-0">
            <nav className="space-y-0.5">
              {aiAssistantSidebarItems.map((item, i) => (
                <button key={i} onClick={() => navigate(item.path)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#1d1d1f] hover:bg-[#FBF8F5] transition-all">{item.label}</button>
              ))}
            </nav>
          </aside>
          <div className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#ff9500', boxShadow: '0 2px 8px #ff950030' }}>
                  <Globe className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">网站评测分析</h1>
                  <p className="text-xs text-[#86868b]">Momcozy官网及竞品网站体验评测</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <p className="text-xs text-[#86868b] mb-1">{s.label}</p>
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">核心能力</h3>
                <div className="space-y-2">
                  {features.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FBF8F5]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff9500] mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-[#1d1d1f]">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">AI洞察 TOP5</h3>
                <div className="space-y-2">
                  {insights.map((ins: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#1d1d1f] truncate">{ins.topic}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: ins.sentiment === '正面' ? '#34c75915' : ins.sentiment === '负面' ? '#ff3b3015' : '#ff950015', color: ins.sentiment === '正面' ? '#34c759' : ins.sentiment === '负面' ? '#ff3b30' : '#ff9500' }}>{ins.sentiment}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#86868b]">
                        <span>提及 {ins.mentions.toLocaleString()}</span>
                        <span style={{ color: ins.trend === '上升' ? '#34c759' : ins.trend === '下降' ? '#ff3b30' : '#86868b' }}>趋势 {ins.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}