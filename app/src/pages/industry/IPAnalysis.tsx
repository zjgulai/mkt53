import { Shield, FileText, Award, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const patents = [
  { name: '穿戴式吸奶器隐形结构', holder: 'Momcozy', date: '2023-08', status: '授权', type: '发明', country: '美国/中国/欧盟' },
  { name: '模块化护罩快拆系统', holder: 'Momcozy', date: '2024-01', status: '授权', type: '实用新型', country: '中国/美国' },
  { name: '智能吸力自适应算法', holder: 'Momcozy', date: '2024-06', status: '审查中', type: '发明', country: 'PCT国际' },
  { name: 'UV消毒一体式底座', holder: 'Momcozy', date: '2024-03', status: '授权', type: '实用新型', country: '中国/美国/日本' },
  { name: '双韵律模拟技术', holder: 'Medela', date: '2019-05', status: '授权', type: '发明', country: '全球' },
  { name: '可穿戴泵体密封结构', holder: 'Willow', date: '2020-11', status: '授权', type: '发明', country: '美国/欧盟' },
  { name: '静音电机减震系统', holder: 'Spectra', date: '2021-02', status: '授权', type: '实用新型', country: '韩国/美国' },
  { name: 'APP远程控制协议', holder: 'Momcozy', date: '2024-09', status: '审查中', type: '软件著作权', country: '中国/美国' },
];

const ipRisks = [
  { risk: 'Medela双韵律专利侵权风险', level: '中', field: ' suction pattern', mitigation: '自主研发Momcozy Rhythm技术，差异化设计' },
  { risk: 'Willow可穿戴密封结构相似性', level: '低', field: '机械结构', mitigation: '采用不同的密封原理和护罩连接方式' },
  { risk: 'ODM供应商知识产权归属', level: '中', field: '供应链', mitigation: '合同明确IP归属，定期审计' },
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

export default function IPAnalysis() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                  <Shield className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">IP分析</h1>
                  <p className="text-xs text-[#86868b]">核心专利布局、竞品IP动态、侵权风险预警</p>
                </div>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-017']}
              title="IP数据待复核口径"
              description="当前专利与侵权风险缺少 2025 年 WIPO/USPTO 更新和诉讼状态复核；授权、审查中和风险标签需在外部数据库快照后确认。"
            />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Momcozy专利', value: '4', icon: <FileText className="w-4 h-4" />, color: '#C25B6E' },
                { label: '审查中', value: '2', icon: <Clock className="w-4 h-4" />, color: '#ff9500' },
                { label: '覆盖国家', value: '12', icon: <Award className="w-4 h-4" />, color: '#34c759' },
                { label: '风险预警', value: '3', icon: <AlertTriangle className="w-4 h-4" />, color: '#ff3b30' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                    <span className="text-xs text-[#86868b]">{s.label}</span>
                  </div>
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Patent Table */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">核心专利清单</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#EDE6DF] table-row-hover">
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">专利名称</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">权利人</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">类型</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">状态</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">国家</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">申请日</th>
                  </tr></thead>
                  <tbody>
                    {patents.map((p, i) => (
                      <tr key={i} className="border-b border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200">
                        <td className="py-2.5 px-3 text-xs text-[#1d1d1f] font-medium">{p.name}</td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{p.holder}</td>
                        <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{p.type}</span></td>
                        <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.status === '授权' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{p.status}</span></td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{p.country}</td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b]">{p.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#ff3b30]" />IP风险预警</h3>
              <div className="space-y-4">
                {ipRisks.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]/60">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[#1d1d1f] truncate">{r.risk}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.level === '高' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : r.level === '中' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#34c759]/10 text-[#34c759]'}`}>{r.level}风险</span>
                      <span className="text-[10px] text-[#86868b]">{r.field}</span>
                    </div>
                    <div className="flex items-start gap-1"><TrendingUp className="w-3 h-3 text-[#34c759] mt-0.5" /><span className="text-[10px] text-[#86868b]">应对措施：{r.mitigation}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
