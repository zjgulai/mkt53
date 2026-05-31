// ═══════════════════════════════════════════════════════════════════
// InterviewAgents.tsx — 多角色智能体访谈协作系统
// 6个专业AI Agent协同完成深度访谈、分析、洞察输出
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Bot, MessageSquare, Search, Lightbulb, ShieldCheck, FileBarChart,
  ChevronDown, ChevronUp, Sparkles, CheckCircle2, Clock
} from 'lucide-react';

export interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  tasks: string[];
  status: 'idle' | 'working' | 'completed';
  duration?: string;
}

const defaultAgents: Agent[] = [
  {
    id: 'moderator',
    name: '访谈主持人',
    role: 'Moderator',
    icon: <MessageSquare className="w-4 h-4" />,
    color: '#C25B6E',
    bgColor: '#C25B6E15',
    description: '设计结构化访谈提纲，引导深度对话，确保覆盖所有关键议题',
    tasks: ['设计半结构化访谈提纲', '设定追问策略', '管理访谈节奏与时间', '确保议题全覆盖'],
    status: 'completed',
    duration: '45-60min',
  },
  {
    id: 'recorder',
    name: '深度记录员',
    role: 'Recorder',
    icon: <Bot className="w-4 h-4" />,
    color: '#5856d6',
    bgColor: '#5856d615',
    description: '实时转录对话内容，提取关键观点，标注情感倾向与语气变化',
    tasks: ['实时语音转文字', '关键观点自动标注', '情感倾向分析', '矛盾点标记'],
    status: 'completed',
    duration: '实时',
  },
  {
    id: 'analyst',
    name: '洞察分析师',
    role: 'Analyst',
    icon: <Search className="w-4 h-4" />,
    color: '#ff9500',
    bgColor: '#ff950015',
    description: '交叉分析多源数据，识别行为模式，提炼深层洞察与根因',
    tasks: ['跨受访者模式识别', '需求频次与强度排序', '痛点根因分析', '行为动机映射'],
    status: 'completed',
    duration: '自动',
  },
  {
    id: 'strategist',
    name: '策略建议师',
    role: 'Strategist',
    icon: <Lightbulb className="w-4 h-4" />,
    color: '#34c759',
    bgColor: '#34c75915',
    description: '基于洞察生成可执行的业务策略，评估优先级与可行性',
    tasks: ['策略机会识别', 'ROI影响评估', '优先级矩阵构建', '行动路线图设计'],
    status: 'completed',
    duration: '自动',
  },
  {
    id: 'auditor',
    name: '质量审计员',
    role: 'Auditor',
    icon: <ShieldCheck className="w-4 h-4" />,
    color: '#af52de',
    bgColor: '#af52de15',
    description: '验证数据一致性，检查认知偏差，评估访谈信效度',
    tasks: ['数据一致性校验', '受访者偏差检测', '样本代表性评估', '信效度评分'],
    status: 'completed',
    duration: '自动',
  },
  {
    id: 'architect',
    name: '报告架构师',
    role: 'Architect',
    icon: <FileBarChart className="w-4 h-4" />,
    color: '#007aff',
    bgColor: '#007aff15',
    description: '整合多Agent输出，生成结构化报告与可视化洞察看板',
    tasks: ['多源数据整合', '可视化图表生成', '叙事逻辑编排', '洞察摘要输出'],
    status: 'completed',
    duration: '自动',
  },
];

interface InterviewAgentsProps {
  agents?: Agent[];
  interviewType: 'consumer' | 'channel' | 'store';
  sampleSize: number;
  regions: string[];
  dateRange: string;
}

const typeMeta = {
  consumer: { label: '消费者深度访谈', method: '半结构化访谈 + 情境观察', icon: <MessageSquare className="w-5 h-5" /> },
  channel: { label: '渠道合作伙伴访谈', method: 'B2B深度访谈 + 数据验证', icon: <FileBarChart className="w-5 h-5" /> },
  store: { label: '门店运营访谈', method: '现场访谈 + 运营数据审计', icon: <Bot className="w-5 h-5" /> },
};

export default function InterviewAgents({
  agents = defaultAgents,
  interviewType,
  sampleSize,
  regions,
  dateRange,
}: InterviewAgentsProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const meta = typeMeta[interviewType];

  return (
    <div className="bg-white rounded-2xl card-shadow-sm border border-[#EDE6DF] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-[#FBF8F5]/50 transition-colors duration-200"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#1d1d1f]">多角色智能体访谈系统</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#34c759]/10 text-[#34c759] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 协作完成
              </span>
            </div>
            <p className="text-xs text-[#86868b] mt-0.5">
              {meta.label} · {meta.method} · {agents.length}个智能体协同 · {sampleSize}个样本 · {regions.join('/')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5">
            {agents.slice(0, 4).map((a) => (
              <div
                key={a.id}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: a.bgColor, color: a.color }}
                title={a.name}
              >
                {a.icon}
              </div>
            ))}
            {agents.length > 4 && (
              <span className="text-[10px] text-[#86868b] bg-[#FBF8F5] px-1.5 py-0.5 rounded-md">+{agents.length - 4}</span>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-[#86868b]" /> : <ChevronDown className="w-4 h-4 text-[#86868b]" />}
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-[#EDE6DF]">
          {/* Meta Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b border-[#EDE6DF] bg-[#FBF8F5]/30">
            <div>
              <p className="text-[10px] text-[#86868b] mb-0.5">访谈方法</p>
              <p className="text-xs font-medium text-[#1d1d1f]">{meta.method}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#86868b] mb-0.5">样本规模</p>
              <p className="text-xs font-medium text-[#1d1d1f]">{sampleSize} 位受访者</p>
            </div>
            <div>
              <p className="text-[10px] text-[#86868b] mb-0.5">覆盖区域</p>
              <p className="text-xs font-medium text-[#1d1d1f]">{regions.join(' · ')}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#86868b] mb-0.5">数据采集周期</p>
              <p className="text-xs font-medium text-[#1d1d1f]">{dateRange}</p>
            </div>
          </div>

          {/* Agent Cards */}
          <div className="p-5">
            <p className="text-xs font-medium text-[#1d1d1f] mb-3">智能体协作工作流</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(activeAgent === agent.id ? null : agent.id)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                    activeAgent === agent.id
                      ? 'border-[#C25B6E]/30 bg-[#C25B6E]/5'
                      : 'border-[#EDE6DF] hover:border-[#C25B6E]/20 hover:bg-[#FBF8F5]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: agent.bgColor, color: agent.color }}
                    >
                      {agent.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#1d1d1f]">{agent.name}</p>
                      <p className="text-[10px] text-[#86868b]">{agent.role}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {agent.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-[#34c759]" />}
                      {agent.duration && (
                        <span className="text-[10px] text-[#86868b] flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />{agent.duration}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#86868b] leading-relaxed mb-2">{agent.description}</p>
                  {activeAgent === agent.id && (
                    <div className="space-y-1 pt-2 border-t border-[#EDE6DF]">
                      {agent.tasks.map((task, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: agent.color }} />
                          <span className="text-[10px] text-[#1d1d1f]">{task}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
