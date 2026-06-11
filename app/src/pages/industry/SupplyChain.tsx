
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Truck, Factory, Package, AlertTriangle, MapPin, Clock, Star } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const costTrend = [
  { month: '2024-06', material: 100, labor: 100, logistics: 100 },
  { month: '2024-09', material: 108, labor: 103, logistics: 112 },
  { month: '2024-12', material: 115, labor: 105, logistics: 118 },
  { month: '2025-03', material: 122, labor: 108, logistics: 125 },
  { month: '2025-06', material: 118, labor: 110, logistics: 120 },
];

const suppliers = [
  { name: 'Shenzhen TechCore', location: '深圳, 中国', category: '电机/泵芯', tier: '1级', leadTime: '15天', rating: 4.8, risk: '低', momcozyShare: '35%' },
  { name: 'Dongguan SiliconePro', location: '东莞, 中国', category: '硅胶护罩', tier: '1级', leadTime: '12天', rating: 4.6, risk: '低', momcozyShare: '42%' },
  { name: 'Shanghai PCB Center', location: '上海, 中国', category: 'PCB主板', tier: '1级', leadTime: '20天', rating: 4.5, risk: '中', momcozyShare: '28%' },
  { name: 'Guangzhou PlasticMold', location: '广州, 中国', category: '注塑外壳', tier: '2级', leadTime: '10天', rating: 4.3, risk: '低', momcozyShare: '18%' },
  { name: 'Ningbo BatteryTech', location: '宁波, 中国', category: '锂电池', tier: '1级', leadTime: '25天', rating: 4.4, risk: '中', momcozyShare: '22%' },
  { name: 'Taiwan ChipSource', location: '台湾', category: '蓝牙芯片', tier: '1级', leadTime: '30天', rating: 4.7, risk: '高', momcozyShare: '15%' },
];

const inventoryStatus = [
  { sku: 'M5-Pump-001', name: 'M5 吸奶器主机', stock: 12500, turnover: 8.2, status: '充足', warehouse: '深圳/洛杉矶' },
  { sku: 'M9-Pump-002', name: 'M9 吸奶器主机', stock: 8600, turnover: 6.5, status: '充足', warehouse: '深圳/多伦多' },
  { sku: 'NB-Bra-001', name: '哺乳文胸 M码', stock: 32100, turnover: 12.4, status: '充足', warehouse: '东莞/洛杉矶' },
  { sku: 'BP-Pad-001', name: '防溢乳垫 60片', stock: 56800, turnover: 18.6, status: '充足', warehouse: '东莞' },
  { sku: 'KP-Pro-001', name: 'KleanPal Pro主机', stock: 4200, turnover: 4.8, status: '偏低', warehouse: '深圳' },
  { sku: 'SB-Bag-001', name: '储奶袋 100只', stock: 89000, turnover: 22.1, status: '充足', warehouse: '东莞/伦敦' },
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

export default function SupplyChain() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <Sidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #C25B6E30' }}>
                  <Truck className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">供应链情报</h1>
                  <p className="text-xs text-[#86868b]">追踪 {suppliers.length} 家核心供应商、成本波动、库存周转与交付风险</p>
                </div>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-035']}
              title="供应链数据示例口径"
              description="供应商、库存、成本和风险预警尚未绑定 ERP 快照与供应商授权数据；当前页面不能作为真实供应链决策依据。"
            />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '1级供应商', value: '4', icon: <Factory className="w-4 h-4" />, color: '#C25B6E' },
                { label: '平均交付周期', value: '18.7天', icon: <Clock className="w-4 h-4" />, color: '#ff9500' },
                { label: '库存SKU数', value: '186', icon: <Package className="w-4 h-4" />, color: '#34c759' },
                { label: '供应链风险', value: '中', icon: <AlertTriangle className="w-4 h-4" />, color: '#ff9500' },
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

            {/* Cost Trend */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">供应链成本指数趋势 (基准=100)</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={costTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} domain={[90, 140]} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="material" stroke="#C25B6E" strokeWidth={2} fill="#C25B6E" fillOpacity={0.1} name="原材料" />
                    <Area type="monotone" dataKey="labor" stroke="#34c759" strokeWidth={2} fill="#34c759" fillOpacity={0.1} name="人工" />
                    <Area type="monotone" dataKey="logistics" stroke="#ff9500" strokeWidth={2} fill="#ff9500" fillOpacity={0.1} name="物流" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Suppliers + Inventory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">核心供应商管理</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {suppliers.map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-[#1d1d1f] truncate">{s.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.risk === '低' ? 'bg-[#34c759]/10 text-[#34c759]' : s.risk === '中' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>{s.risk}风险</span>
                          <span className="text-[10px] text-[#86868b] bg-white px-1.5 py-0.5 rounded">{s.tier}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-[#86868b]">
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{s.location}</span>
                        <span>{s.category}</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{s.leadTime}</span>
                        <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-[#ff9500] fill-[#ff9500]" />{s.rating}</span>
                        <span className="ml-auto text-[#C25B6E] font-medium">占比{s.momcozyShare}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">核心SKU库存状态</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {inventoryStatus.map((inv, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-xs font-medium text-[#1d1d1f] truncate">{inv.name}</span>
                          <span className="text-[10px] text-[#86868b] ml-2">{inv.sku}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${inv.status === '充足' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{inv.status}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-[#86868b]">
                        <span>库存 {inv.stock.toLocaleString()}</span>
                        <span>周转 {inv.turnover}次/年</span>
                        <span className="ml-auto">{inv.warehouse}</span>
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
