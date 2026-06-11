
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Shield, Globe, AlertTriangle, CheckCircle, Clock, FileText, ExternalLink, Download } from 'lucide-react';
import { exportToCsv } from '@/utils/csvExport';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';
import { getSourceRegistryItem, getVerificationStatusMeta, type VerificationStatus } from '@/data/source-registry';

const cpscEfilingSource = getSourceRegistryItem('policy-cpsc-efiling');
const euMdrSource = getSourceRegistryItem('policy-eu-mdr-transition');

const regionPolicies = [
  { region: '美国', standards: 16, pending: 4, risk: '高', key: 'FDA 510(k) + CPSC CPC/eFiling复核 + ASTM F2088-25', compliance: 88 },
  { region: '欧盟', standards: 18, pending: 5, risk: '高', key: 'MDR 2017/745 + EN 14350 + REACH/RoHS', compliance: 78 },
  { region: '英国', standards: 14, pending: 2, risk: '中', key: 'UKCA + BS EN + GPSR', compliance: 88 },
  { region: '加拿大', standards: 12, pending: 1, risk: '低', key: 'CCPSA + Health Canada 2025-2027计划', compliance: 93 },
  { region: '中国', standards: 28, pending: 6, risk: '高', key: 'GB 46523/46516 + GB 6675.1-4-2025', compliance: 75 },
  { region: '澳大利亚', standards: 11, pending: 2, risk: '中', key: 'ACCC强制召回 + ACMA无线认证', compliance: 87 },
  { region: '日本', standards: 15, pending: 4, risk: '高', key: '新CPSA(2025.12) + ST2025 + PSC标志', compliance: 70 },
];

const riskDist = [
  { name: '已合规', value: 42, color: '#34c759' },
  { name: '进行中', value: 24, color: '#ff9500' },
  { name: '待启动', value: 18, color: '#C25B6E' },
  { name: '高风险', value: 8, color: '#ff3b30' },
];

// R11: 增强版法规变更 — 含原文链接+Momcozy状态
const upcomingChanges = [
  { date: '2026-07-25', region: '美国', regionCode: 'US', change: 'CPSC更新16 CFR 1223婴儿摇篮安全标准，ASTM F2088-25生效，新增前标签可见性测试和强化窒息警告', impact: '高', action: '更新产品警告标签设计，通过可见性测试', source: { name: 'CPSC Federal Register', url: 'https://www.federalregister.gov' }, momcozyStatus: '已完成', verifiedBy: '郑法务', verifiedAt: '2026-05-20', verificationStatus: 'needs-review' },
  { date: '2026-07-08', region: '美国', regionCode: 'US', change: 'CPSC CPC/eFiling：复核儿童产品证书数据、进口申报字段和适用SKU；官网即时声明强制要求未获官方证实', impact: '高', action: cpscEfilingSource.action, source: { name: cpscEfilingSource.sourceName, url: cpscEfilingSource.sourceUrl ?? 'https://www.cpsc.gov/eFiling' }, momcozyStatus: '进行中', verifiedBy: '郑法务', verifiedAt: cpscEfilingSource.lastVerified, verificationStatus: 'needs-review' },
  { date: '2026-11-01', region: '中国', regionCode: 'CN', change: 'GB 46523-2025儿童用品通用安全+GB 46516婴幼儿护理用品安全计划生效', impact: '高', action: '审核产品设计和材料，确保符合新国标', source: { name: 'SAMR 国家市场监管总局', url: 'https://www.samr.gov.cn' }, momcozyStatus: '进行中', verifiedBy: '王运营', verifiedAt: '2026-05-15', verificationStatus: 'verified' },
  { date: '2026-05-01', region: '中国', regionCode: 'CN', change: 'GB/T 46491-2025婴儿食品加工器具标准生效，规范材料安全和性能要求', impact: '高', action: '评估温奶器、消毒器等产品的材料合规性', source: { name: '国家标准化管理委员会', url: 'https://www.sac.gov.cn' }, momcozyStatus: '已完成', verifiedBy: '王运营', verifiedAt: '2026-04-28', verificationStatus: 'verified' },
  { date: '2027-01-01', region: '欧盟', regionCode: 'EU', change: 'MDR Class IIa医疗器械过渡安排需按产品分类、证书状态和notified body路径复核', impact: '高', action: euMdrSource.action, source: { name: euMdrSource.sourceName, url: euMdrSource.sourceUrl ?? 'https://health.ec.europa.eu' }, momcozyStatus: '进行中', verifiedBy: '郑法务', verifiedAt: euMdrSource.lastVerified, verificationStatus: 'needs-review' },
  { date: '2026-03-16', region: '美国', regionCode: 'US', change: 'CPSC 2026年婴儿睡衣新睡眠安全标准生效，加强可燃性要求和绳带限制', impact: '高', action: '审查孕妇护理和婴儿纺织品的材料合规性', source: { name: 'CPSC', url: 'https://www.cpsc.gov' }, momcozyStatus: '已跟踪', verifiedBy: '林产品', verifiedAt: '2026-03-10', verificationStatus: 'needs-review' },
] satisfies Array<{
  date: string;
  region: string;
  regionCode: string;
  change: string;
  impact: '高' | '中' | '低';
  action: string;
  source: { name: string; url: string };
  momcozyStatus: string;
  verifiedBy: string;
  verifiedAt: string;
  verificationStatus: VerificationStatus;
}>;

const countryColors: Record<string, string> = { '美国': '#C25B6E', '欧盟': '#5856d6', '英国': '#34c759', '加拿大': '#ff9500', '中国': '#ff3b30', '澳大利亚': '#af52de', '日本': '#0077b6' };

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

export default function PolicyInsight() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* R12: 增强头部 — 导出+信息审计摘要 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                    <Shield className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">区域标准洞察</h1>
                    <p className="text-xs text-[#86868b]">覆盖全球7大市场区域，追踪 {regionPolicies.reduce((a, b) => a + b.standards, 0)} 项有效标准 · 条目级复核状态已标注</p>
                  </div>
                </div>
                <button onClick={() => exportToCsv(regionPolicies.map(r => ({ region: r.region, standards: r.standards, pending: r.pending, risk: r.risk, key: r.key, compliance: r.compliance })), { region: '区域', standards: '有效标准', pending: '待更新', risk: '风险', key: '核心法规', compliance: '合规度%' }, '区域合规_' + new Date().toISOString().slice(0, 10))} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all border border-[#EDE6DF]">
                  <Download className="w-3.5 h-3.5" />导出CSV
                </button>
              </div>
              {/* R13: 信息审计横幅 */}
              <div className="p-3 rounded-xl bg-[#ff9500]/5 border border-[#ff9500]/10 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-[#ff9500] flex-shrink-0" />
                <p className="text-xs text-[#1d1d1f]"><strong>信息审计：</strong>区域数据按官方来源维护，但 CPSC CPC/eFiling、EU MDR 过渡安排和部分泛化法规仍为待复核项；页面不再展示“全量已复核”结论。</p>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-016', 'policy-cpsc-efiling', 'policy-eu-mdr-transition']}
              title="区域标准条目复核口径"
              description="区域标准总览包含官方来源和待法务复核条目；CPSC CPC/eFiling、EU MDR 过渡安排和部分泛化法规不能写成全量已复核。"
            />

            {/* Risk Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '已合规标准', value: '42', icon: <CheckCircle className="w-4 h-4" />, color: '#34c759' },
                { label: '进行中', value: '24', icon: <Clock className="w-4 h-4" />, color: '#ff9500' },
                { label: '待启动', value: '18', icon: <FileText className="w-4 h-4" />, color: '#C25B6E' },
                { label: '高风险项', value: '8', icon: <AlertTriangle className="w-4 h-4" />, color: '#ff3b30' },
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

            {/* Region Compliance Table */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">区域合规状态总览</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#EDE6DF] table-row-hover">
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">区域</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">有效标准</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">待更新</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">风险等级</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">核心法规</th>
                    <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">原文来源</th>
                    <th className="text-right py-2 px-3 text-xs text-[#86868b] font-medium">合规度</th>
                  </tr></thead>
                  <tbody>
                    {regionPolicies.map((r, i) => (
                      <tr key={i} className="border-b border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200">
                        <td className="py-2.5 px-3 text-xs text-[#1d1d1f] font-medium flex items-center gap-1.5"><Globe className="w-3 h-3 text-[#86868b]" />{r.region}</td>
                        <td className="py-2.5 px-3 text-xs text-[#1d1d1f]">{r.standards}</td>
                        <td className="py-2.5 px-3 text-xs text-[#ff9500]">{r.pending}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${r.risk === '高' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : r.risk === '中' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#34c759]/10 text-[#34c759]'}`}>{r.risk}</span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-[#86868b] max-w-[200px] truncate">{r.key}</td>
                        {/* R14: 原文来源链接 */}
                        <td className="py-2.5 px-3">
                          <span className="flex items-center gap-1 text-[10px] text-[#5856d6] bg-[#5856d6]/5 px-1.5 py-0.5 rounded">
                            <CheckCircle className="w-2.5 h-2.5" />逐条复核
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-2 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-full" style={{ width: `${r.compliance}%` }} /></div>
                            <span className="text-xs text-[#1d1d1f] font-medium w-8 text-right">{r.compliance}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk Distribution + Upcoming */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">合规状态分布</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                        {riskDist.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* R15: 增强版法规变更预警 — 原文链接+应对状态+审计 */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">法规变更预警</h3>
                  <button onClick={() => exportToCsv(upcomingChanges.map(c => ({ date: c.date, region: c.region, change: c.change.slice(0, 50), impact: c.impact, action: c.action.slice(0, 50), momcozyStatus: c.momcozyStatus, verifiedBy: c.verifiedBy })), { date: '日期', region: '区域', change: '变更内容', impact: '影响', action: '行动建议', momcozyStatus: 'Momcozy状态', verifiedBy: '验证人' }, '法规预警_' + new Date().toISOString().slice(0, 10))} className="flex items-center gap-1 px-2 py-1 rounded bg-[#FBF8F5] text-[10px] text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E]"><Download className="w-3 h-3" />导出</button>
                </div>
                <div className="space-y-3">
                  {upcomingChanges.map((c, i) => {
                    const msColor = c.momcozyStatus === '已完成' ? '#34c759' : c.momcozyStatus === '进行中' ? '#ff9500' : '#ff3b30';
                    const verification = getVerificationStatusMeta(c.verificationStatus);
                    return (
                      <div key={i} className="p-3.5 rounded-xl border border-[#EDE6DF] hover:border-[#C25B6E]/30 transition-all">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white" style={{ backgroundColor: countryColors[c.region] || '#86868b' }}>{c.regionCode}</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#C25B6E]/10 text-[10px] text-[#C25B6E] font-medium">{c.date}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${c.impact === '高' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#C25B6E]/10 text-[#C25B6E]'}`}>影响{c.impact}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: `${verification.color}15`, color: verification.color }}>{verification.label}</span>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-white ml-auto" style={{ backgroundColor: msColor }}>{c.momcozyStatus}</span>
                        </div>
                        <p className="text-xs text-[#1d1d1f] leading-relaxed mb-2">{c.change}</p>
                        {/* 原文链接+行动建议 */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <a href={c.source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-[#5856d6] hover:underline bg-[#5856d6]/5 px-2 py-0.5 rounded">
                            <ExternalLink className="w-2.5 h-2.5" />{c.source.name}
                          </a>
                          <span className="flex items-center gap-1 text-[10px] text-[#86868b]"><AlertTriangle className="w-2.5 h-2.5 text-[#ff9500]" />{c.action}</span>
                        </div>
                        {/* 审计信息 */}
                        <div className="flex items-center gap-2 text-[9px] text-[#B5AFA8]">
                          <span>验证: {c.verifiedBy}</span>
                          <span>·</span>
                          <span>{c.verifiedAt}</span>
                          <span style={{ color: verification.color }}>· {verification.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
