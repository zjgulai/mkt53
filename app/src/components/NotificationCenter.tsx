// ═══════════════════════════════════════════════════════════════
// 通知中心 — 实时消息/提醒/待办
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell, X, FileText,
  Shield, Cpu, Target, TrendingUp, ChevronRight, Trash2, CheckCheck
} from 'lucide-react';

interface Notification {
  id: number;
  sourceId?: string;
  title: string;
  desc: string;
  time: string;
  type: 'urgent' | 'warning' | 'normal' | 'success';
  icon: typeof FileText;
  impact: string;
  impactDesc: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  read: boolean;
  path: string;
}

const initialNotifications: Notification[] = [
  { id: 1, title: 'W1加热款北美上市节点待复核', desc: '展会和上市日程需官方页面或内部发布计划确认', time: '2小时前', type: 'urgent', icon: Cpu, impact: '待授权评估', impactDesc: '营收影响需ERP/广告/销售快照接入后计算', priority: 'P0', read: false, path: '/competition/new' },
  { id: 2, title: 'Medela新品竞争线索待采集', desc: '超静音卖点和首发市场需公开页或零售面板交叉验证', time: '5小时前', type: 'warning', icon: Target, impact: '竞争复核', impactDesc: '价格敏感用户影响暂不展示为事实', priority: 'P1', read: false, path: '/competition/new' },
  { id: 3, sourceId: 'ds-009', title: '竞品价格源接入待办', desc: '报告中心存在待审批条目，价格源仍需接入', time: '1天前', type: 'normal', icon: FileText, impact: '决策待证据', impactDesc: '定价策略需授权价格快照支撑', priority: 'P2', read: true, path: '/reports' },
  { id: 4, title: '日本PSC认证续期信息待复核', desc: '证书到期日需合规台账或官方证书确认', time: '2天前', type: 'warning', icon: Shield, impact: '合规待确认', impactDesc: '销售影响需SKU适用性和证书状态复核', priority: 'P1', read: false, path: '/industry/regulation' },
  { id: 5, title: 'CPSC规则源需复核', desc: '官网实时声明要求未找到官方依据', time: '3天前', type: 'warning', icon: Shield, impact: '合规风险', impactDesc: '需按CPC/eFiling官方规则重审SKU影响', priority: 'P1', read: false, path: '/industry/regulation' },
  { id: 6, sourceId: 'ds-009', title: '产品评分源接入待办', desc: 'Amazon评分和评论变化需采集任务复核', time: '4天前', type: 'success', icon: TrendingUp, impact: '待复核线索', impactDesc: '转化率影响需广告/站内分析数据确认', priority: 'P3', read: true, path: '/competition' },
];

const typeConfig = {
  urgent: { bg: '#ff3b30', bgLight: '#ff3b3010', label: '紧急' },
  warning: { bg: '#ff9500', bgLight: '#ff950010', label: '预警' },
  normal: { bg: '#5856d6', bgLight: '#5856d610', label: '常规' },
  success: { bg: '#34c759', bgLight: '#34c75910', label: '利好' },
};

const priorityConfig = {
  P0: { color: '#ff3b30', label: 'P0' },
  P1: { color: '#ff9500', label: 'P1' },
  P2: { color: '#5856d6', label: 'P2' },
  P3: { color: '#86868b', label: 'P3' },
};

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.type === 'urgent' && !n.read).length;

  // 点击外部关闭
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    onClose();
    navigate(n.path);
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'urgent') return n.type === 'urgent';
    return true;
  });

  if (!isOpen) return null;

  return (
    <div ref={panelRef} className="absolute right-0 top-12 w-[400px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-[#EDE6DF] overflow-hidden z-[100]">
      {/* 头部 */}
      <div className="p-4 border-b border-[#EDE6DF]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#C25B6E]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f]">通知中心</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#ff3b30] text-white text-[10px] font-bold">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={markAllRead} className="p-1.5 rounded-lg text-[#86868b] hover:bg-[#FBF8F5] hover:text-[#34c759] transition-colors" title="全部已读">
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
            <button onClick={clearAll} className="p-1.5 rounded-lg text-[#86868b] hover:bg-[#FBF8F5] hover:text-[#ff3b30] transition-colors" title="清空">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#86868b] hover:bg-[#FBF8F5] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {/* 筛选标签 */}
        <div className="flex items-center gap-1">
          {[
            { key: 'all' as const, label: '全部', count: notifications.length },
            { key: 'unread' as const, label: '未读', count: unreadCount },
            { key: 'urgent' as const, label: '紧急', count: urgentCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === tab.key ? 'bg-[#C25B6E] text-white' : 'bg-[#FBF8F5] text-[#86868b] hover:bg-[#F5EDE8]'}`}
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-1 opacity-70">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* 通知列表 */}
      <div className="max-h-[360px] overflow-y-auto">
        {filtered.length > 0 ? (
          <div className="divide-y divide-[#EDE6DF]/50">
            {filtered.map(n => {
              const IconComp = n.icon;
              const tc = typeConfig[n.type];
              const pc = priorityConfig[n.priority];
              return (
                <div
                  key={n.id}
                  className={`p-3 hover:bg-[#FBF8F5] transition-colors cursor-pointer ${!n.read ? 'bg-[#C25B6E]/[0.02]' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="flex items-start gap-2.5">
                    {/* 图标 */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: tc.bgLight }}>
                      <IconComp className="w-4 h-4" style={{ color: tc.bg }} />
                    </div>
                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#C25B6E] flex-shrink-0" />}
                        <span className="text-xs font-medium text-[#1d1d1f] truncate">{n.title}</span>
                      </div>
                      <p className="text-[10px] text-[#86868b] leading-relaxed mb-1">{n.desc}</p>
                      {/* 标签行 */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: tc.bgLight, color: tc.bg }}>{tc.label}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold`} style={{ backgroundColor: `${pc.color}15`, color: pc.color }}>{pc.label}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#C25B6E]/10 text-[#C25B6E] text-[9px] font-medium">{n.impact}</span>
                        <span className="text-[9px] text-[#B5AFA8] ml-auto">{n.time}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#B5AFA8] flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-[#EDE6DF] mx-auto mb-2" />
            <p className="text-sm text-[#86868b]">暂无通知</p>
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="p-3 border-t border-[#EDE6DF] bg-[#FAF8F6] flex items-center justify-between">
        <span className="text-[10px] text-[#B5AFA8]">{unreadCount} 条未读 · {notifications.length} 条总计</span>
        <button onClick={() => { onClose(); navigate('/industry'); }} className="text-[10px] text-[#C25B6E] hover:underline font-medium">
          查看全部通知
        </button>
      </div>
    </div>
  );
}
