import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import { aiAssistantSidebarItems } from './constants';

const stats = [
  { label: '样例评论数', value: '12,580' },
  { label: '准确率待评估', value: '94.2%' },
  { label: '样例关键词', value: '2,340' },
  { label: '样例洞察', value: '186' },
];

const features = [
  '情感分类（正/负/中）与情绪强度评分流程演示',
  '高频关键词与主题聚类分析',
  '竞品评论对比分析（Momcozy vs Medela vs Willow）',
  '产品改进建议自动生成',
  '异常评论检测与风险提示',
];

const insights = [
  { topic: 'M5 静音设计', sentiment: '正面', mentions: 3240, trend: '上升' },
  { topic: 'M9 吸力强度', sentiment: '混合', mentions: 2150, trend: '稳定' },
  { topic: 'APP 连接稳定性', sentiment: '负面', mentions: 1890, trend: '下降' },
  { topic: '哺乳文胸舒适度', sentiment: '正面', mentions: 4520, trend: '上升' },
  { topic: '客服响应速度', sentiment: '混合', mentions: 980, trend: '上升' },
];

export default function ReviewAnalysis() {
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
                <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                  <BarChart3 className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">评论分析</h1>
                  <p className="text-xs text-[#86868b]">AI驱动的用户评论深度分析</p>
                </div>
              </div>
            </div>
            <PageEvidenceNotice
              sourceIds={['ds-030']}
              title="评论分析示例口径"
              description="统计卡、关键词和洞察为功能演示数据，缺少评论采集窗口、样本量、模型准确率和人工复核一致率。当前只适合验证页面能力，不输出真实评论情感结论。"
              cadence="演示数据"
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
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C25B6E] mt-1.5 flex-shrink-0" />
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
