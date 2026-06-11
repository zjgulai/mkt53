import { Cpu, Zap, Smartphone, Wifi, Battery, Mic } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const techItems = [
  { icon: <Zap className="w-5 h-5" />, title: 'AI泌乳分析技术', desc: 'Medela Sonata Pro首次集成AI算法，通过机器学习分析妈妈泌乳模式，自动优化吸力曲线。预计2026年将有3-5个品牌跟进。', trend: '前沿', color: '#af52de' },
  { icon: <Smartphone className="w-5 h-5" />, title: '蓝牙5.3 + APP生态', desc: 'Momcozy M5/M9支持蓝牙5.3连接，APP可追踪每次吸奶量、时长、频率，并生成周/月报告。数据导出功能支持分享给医生。', trend: '主流', color: '#C25B6E' },
  { icon: <Battery className="w-5 h-5" />, title: '无线充电技术', desc: 'M5支持Qi无线充电标准，充电盒设计灵感来自AirPods。充满电可支持5-6次完整吸奶 session，每次约30分钟。', trend: '增长', color: '#34c759' },
  { icon: <Wifi className="w-5 h-5" />, title: 'IoT远程监控', desc: '新一代吸奶器通过Wi-Fi连接，伴侣可通过手机App远程查看吸奶进度，甚至发送语音鼓励。隐私保护采用端到端加密。', trend: '前沿', color: '#5856d6' },
  { icon: <Mic className="w-5 h-5" />, title: '语音控制集成', desc: '与Alexa/Google Assistant集成，妈妈可以通过语音指令"开始吸奶"、"增加吸力"等，实现真正解放双手的操作体验。', trend: '新兴', color: '#ff9500' },
  { icon: <Cpu className="w-5 h-5" />, title: '边缘计算芯片', desc: '自研低功耗MCU芯片，在设备端完成数据分析，减少蓝牙传输延迟。功耗降低40%，响应速度提升至<50ms。', trend: '前沿', color: '#ff3b30' },
];

const sidebarItems = [
  {
    label: '政策分析',
    children: [
      { label: '母婴标准与法规地图', path: '/industry' },
      { label: '行业法规与标准解读', path: '/industry/regulation' },
      { label: '区域标准洞察', path: '/industry/policy-insight' },
    ],
  },
  {
    label: 'VOC趋势',
    children: [
      { label: 'VOC趋势地图', path: '/industry/flavor-map' },
      { label: 'VOC趋势报告', path: '/industry/flavor-report' },
    ],
  },
  {
    label: '行业新闻',
    children: [
      { label: '母婴行业资讯', path: '/industry/news' },
      { label: '母婴科技资讯', path: '/industry/tech' },
      { label: '母婴行业报告', path: '/industry/reports' },
    ],
  },
  { label: '母婴供应链情报', path: '/industry/supply' },
  { label: 'IP分析', path: '/industry/ip' },
  { label: '母婴展会调研', path: '/industry/exhibition' },
  { label: '区域宏观分析', path: '/industry/macro' },
];

export default function TechNews() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                  <Cpu className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">母婴科技资讯</h1>
                  <p className="text-xs text-[#86868b]">追踪吸奶器/母婴产品技术突破与创新方向</p>
                </div>
              </div>
            </div>
            <PageEvidenceNotice
              sourceIds={['ds-036']}
              title="技术资讯复核口径"
              description="技术趋势描述需要逐条绑定品牌官网、产品规格或新闻原文；当前内容作为技术观察线索。"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {techItems.map((t, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] hover:shadow-md transition-natural">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${t.color}15`, color: t.color }}>{t.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">{t.title}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${t.trend === '主流' ? 'bg-[#34c759]/10 text-[#34c759]' : t.trend === '前沿' ? 'bg-[#af52de]/10 text-[#af52de]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{t.trend}</span>
                  </div>
                  <p className="text-xs text-[#86868b] leading-relaxed truncate">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
