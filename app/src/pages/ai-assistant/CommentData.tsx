import { useNavigate } from 'react-router-dom';
import { aiAssistantSidebarItems } from './constants';
import { MessageSquare } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const stats = [{"label":"样例评论数","value":"45,280"},{"label":"覆盖平台待核","value":"8"},{"label":"样例好评率","value":"78%"},{"label":"新增待接入","value":"320"}];

const features = ["Amazon/官网/社交媒体评论聚合任务待接入","评论时间分布与趋势分析","用户画像与评论关联分析","负面评论预警与分类流程演示","评论关键词云与主题挖掘"];

const insights = [{"topic":"M5 电池续航","sentiment":"正面","mentions":2890,"trend":"上升"},{"topic":"文胸尺码选择","sentiment":"混合","mentions":1560,"trend":"稳定"},{"topic":"清洁维护难度","sentiment":"负面","mentions":1230,"trend":"下降"},{"topic":"包装开箱体验","sentiment":"正面","mentions":2340,"trend":"上升"},{"topic":"物流配送速度","sentiment":"正面","mentions":1890,"trend":"稳定"}];

export default function CommentData() {
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
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: '#34c759', boxShadow: '0 2px 8px #34c75930' }}>
                  <MessageSquare className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">评论数据</h1>
                  <p className="text-xs text-[#86868b]">多平台评论数据汇总与分析看板</p>
                </div>
              </div>
            </div>
            <PageEvidenceNotice
              sourceIds={['ds-021']}
              title="评论数据模型复核口径"
              description="当前评论聚合、好评率和新增量为页面样例。接入 Amazon API、评论样本窗口、NLP 模型版本、准确率评估和人工复核一致率之前，不输出真实用户口碑结论。"
              cadence="待模型评估"
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
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] mt-1.5 flex-shrink-0" />
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
