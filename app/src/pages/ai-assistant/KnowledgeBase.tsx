import { useNavigate } from 'react-router-dom';
import { aiAssistantSidebarItems } from './constants';
import { BookOpen } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const stats = [{"label":"知识条目","value":"8,560"},{"label":"法规文档","value":"342"},{"label":"竞品资料","value":"1,280"},{"label":"检索评估版本","value":"v0.9"}];

const features = ["全球母婴法规标准知识图谱","竞品产品参数与技术规格库","用户痛点与需求知识库","智能问答与自然语言检索","文档自动摘要与关键信息提取"];

const insights = [{"topic":"FDA 510(k)流程","sentiment":"中性","mentions":456,"trend":"稳定"},{"topic":"MDR合规要求","sentiment":"中性","mentions":389,"trend":"上升"},{"topic":"竞品技术对比","sentiment":"中性","mentions":567,"trend":"上升"},{"topic":"用户场景分析","sentiment":"中性","mentions":234,"trend":"稳定"},{"topic":"供应链知识","sentiment":"中性","mentions":178,"trend":"上升"}];

export default function KnowledgeBase() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-56 bg-white rounded-2xl p-3 h-fit sticky top-20 card-shadow-sm border border-[#EDE6DF] flex-shrink-0">
            <nav className="space-y-0.5">
              {aiAssistantSidebarItems.map((item, i) => (
                <button key={i} onClick={() => navigate(item.path)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#1d1d1f] hover:bg-[#FBF8F5] transition-all">{item.label}</button>
              ))}
            </nav>
          </aside>
          <div className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#5856d6', boxShadow: '0 2px 8px #5856d630' }}>
                  <BookOpen className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">知识库检索</h1>
                  <p className="text-xs text-[#86868b]">母婴行业知识库，支持智能问答与文档检索</p>
                </div>
              </div>
            </div>
            <PageEvidenceNotice
              sourceIds={['ds-022']}
              title="知识库版本化状态"
              description="知识库为内部维护资产，可作为检索入口展示；检索准确率需要随版本、评测集和人工抽检记录持续复核，不再作为无上下文固定准确率展示。"
              cadence="内部维护"
            />
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
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5856d6] mt-1.5 flex-shrink-0" />
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
