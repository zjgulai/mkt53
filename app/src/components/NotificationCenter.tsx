// ═══════════════════════════════════════════════════════════════
// 通知中心 — 实时消息/提醒/待办
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, FileText,
  Shield, Cpu, Target, TrendingUp, ChevronRight, Trash2, CheckCheck
} from 'lucide-react';

interface Notification {
  id: number;
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
  { id: 1, title: 'W1加热款北美上市倒计时', desc: '距离ABC Kids Expo发布还有18天', time: '2小时前', type: 'urgent', icon: Cpu, impact: '营收影响', impactDesc: '预计Q3贡献$2.1M收入', priority: 'P0', read: false, path: '/competition/new' },
  { id: 2, title: 'Medela Melody InBra 7月加拿大首发', desc: '超静音差异化竞争预警', time: '5小时前', type: 'warning', icon: Target, impact: '竞争威胁', impactDesc: '可能侵蚀3-5%价格敏感用户', priority: 'P1', read: false, path: '/competition/new' },
  { id: 3, title: 'Q2竞品价格监测报告待审', desc: '报告中心有1份报告待审批', time: '1天前', type: 'normal', icon: FileText, impact: '决策支持', impactDesc: '支撑Q3定价策略制定', priority: 'P2', read: true, path: '/reports' },
  { id: 4, title: '日本PSC认证续期提醒', desc: '证书将于2026-08到期', time: '2天前', type: 'warning', icon: Shield, impact: '合规风险', impactDesc: '逾期未续期将暂停日本销售', priority: 'P1', read: false, path: '/industry/regulation' },
  { id: 5, title: 'CPSC新规5月1日已生效', desc: '官网合规声明须在48h内完成', time: '3天前', type: 'urgent', icon: Shield, impact: '合规风险', impactDesc: '违反将面临产品下架风险', priority: 'P0', read: false, path: '/industry/regulation' },
  { id: 6, title: 'M9产品评分升至4.7星', desc: 'Amazon评分连续3周上升', time: '4天前', type: 'success', icon: TrendingUp, impact: '品牌利好', impactDesc: '预计转化率提升2-3pp', priority: 'P3', read: true, path: '/competition' },
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
