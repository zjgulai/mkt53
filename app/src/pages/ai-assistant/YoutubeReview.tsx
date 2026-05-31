import { useNavigate } from 'react-router-dom';
import { aiAssistantSidebarItems } from './constants';
import { Youtube } from 'lucide-react';

const stats = [{"label":"追踪视频","value":"486"},{"label":"总观看量","value":"28.5M"},{"label":"合作达人","value":"72"},{"label":"平均评分","value":"4.6"}];

const features = ["YouTube母婴品类测评视频自动抓取与分类","达人影响力评估（订阅/互动/转化率）","竞品测评内容对比分析","品牌提及情感分析","最佳合作达人推荐"];

const insights = [{"topic":"M5 Unboxing","sentiment":"正面","mentions":156,"trend":"上升"},{"topic":"Momcozy vs Medela","sentiment":"正面","mentions":89,"trend":"上升"},{"topic":"Nursing Bra Review","sentiment":"正面","mentions":134,"trend":"稳定"},{"topic":"KleanPal Demo","sentiment":"混合","mentions":45,"trend":"上升"},{"topic":"M9 Sound Test","sentiment":"混合","mentions":67,"trend":"下降"}];

export default function YoutubeReview() {
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
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#ff3b30', boxShadow: '0 2px 8px #ff3b3030' }}>
                  <Youtube className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">YouTube测评</h1>
                  <p className="text-xs text-[#86868b]">追踪YouTube母婴产品测评视频与达人合作</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s, i) => (
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
                  {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FBF8F5]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30] mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-[#1d1d1f]">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">AI洞察 TOP5</h3>
                <div className="space-y-2">
                  {insights.map((ins, i) => (
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
