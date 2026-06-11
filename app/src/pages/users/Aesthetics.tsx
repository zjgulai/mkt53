
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Palette, Globe, Star } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

const colorPreference = [
  { color: '#F5C6D0', name: '柔和粉', value: 32 },
  { color: '#F5EDE8', name: '奶油白', value: 24 },
  { color: '#D4A574', name: '暖驼色', value: 18 },
  { color: '#A8C8EC', name: '婴儿蓝', value: 12 },
  { color: '#C8B8DB', name: '薰衣草紫', value: 8 },
  { color: '#B5D5C5', name: '薄荷绿', value: 6 },
];

const styleTrends = [
  { year: '2022', 简约极简: 18, 温馨自然: 28, 科技感: 15, 奢华高端: 12, 可爱童趣: 27 },
  { year: '2023', 简约极简: 22, 温馨自然: 30, 科技感: 18, 奢华高端: 10, 可爱童趣: 20 },
  { year: '2024', 简约极简: 28, 温馨自然: 32, 科技感: 22, 奢华高端: 8, 可爱童趣: 10 },
  { year: '2025', 简约极简: 35, 温馨自然: 30, 科技感: 25, 奢华高端: 5, 可爱童趣: 5 },
];

const regionStyle = [
  { region: '北美', style: '简约实用', topColor: '柔和粉/奶油白', priceSens: '中等', feature: 'APP智能控制', satisfaction: 4.5 },
  { region: '欧洲', style: '极简环保', topColor: '奶油白/暖驼色', priceSens: '低', feature: '静音设计', satisfaction: 4.6 },
  { region: '日韩', style: '精致可爱', topColor: '柔和粉/婴儿蓝', priceSens: '低', feature: '便携小巧', satisfaction: 4.7 },
  { region: '东南亚', style: '性价比导向', topColor: '薄荷绿/婴儿蓝', priceSens: '高', feature: '耐用易清洁', satisfaction: 4.3 },
  { region: '中东', style: '奢华高端', topColor: '薰衣草紫/暖驼色', priceSens: '低', feature: '高端材质', satisfaction: 4.4 },
  { region: '中国', style: '科技智能', topColor: '柔和粉/奶油白', priceSens: '中等', feature: '智能互联', satisfaction: 4.5 },
];

const designCases = [
  { product: 'M5 Wearable Pump', design: '隐形穿戴设计', award: 'iF Design Award 2025', concept: '让妈妈在任何场合都能自信吸奶，外观如普通内衣般自然', users: '职场妈妈 / 外出妈妈', color: '#C25B6E' },
  { product: 'KleanPal Pro', design: '一体式洗消设计', award: 'Red Dot 2024', concept: '简化清洁流程，让妈妈每天节省30分钟', users: '忙碌妈妈 / 二胎家庭', color: '#34c759' },
  { product: 'M9 Mobile Flow', design: '模块化组件系统', award: 'IDEA Silver 2024', concept: '护罩/奶瓶/电池均可独立更换，延长产品寿命', users: '环保妈妈 / 长期使用者', color: '#ff9500' },
  { product: 'Nursing Bra', design: '无缝编织工艺', award: 'Good Design 2025', concept: '如第二层肌肤般贴合，24小时穿着无感', users: '孕期妈妈 / 哺乳期妈妈', color: '#af52de' },
];

const sidebarItems = [
  { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
  { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
  { label: '区域用户画像', path: '/users/regional' },
  { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
];

export default function Aesthetics() {
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
                  <Palette className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">美学风格分析</h1>
                  <p className="text-xs text-[#86868b]">全球母婴产品设计趋势、配色偏好、区域美学差异深度分析</p>
                </div>
              </div>
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-040']}
              title="美学偏好示例口径"
              description="颜色、风格和区域审美偏好尚未绑定真实用户调研样本、地区分布和图片偏好实验；当前页面只作为设计方向探索。"
            />

            {/* Color + Style Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">全球配色偏好 TOP6</h3>
                <div className="space-y-4">
                  {colorPreference.map((c, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: c.color }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#1d1d1f] font-medium">{c.name}</span>
                          <span className="text-xs text-[#86868b]">{c.value}%</span>
                        </div>
                        <div className="h-2 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${c.value * 2.5}%`, backgroundColor: c.color }} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">设计风格趋势变化 (%)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={styleTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="简约极简" fill="#C25B6E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="温馨自然" fill="#D4A574" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="科技感" fill="#5856d6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="奢华高端" fill="#af52de" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Regional Style */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">区域美学风格差异</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {regionStyle.map((r, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-[#C25B6E]" />
                      <span className="text-sm font-semibold text-[#1d1d1f]">{r.region}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between"><span className="text-[10px] text-[#86868b]">主导风格</span><span className="text-[10px] text-[#1d1d1f] font-medium">{r.style}</span></div>
                      <div className="flex justify-between"><span className="text-[10px] text-[#86868b]">热门配色</span><span className="text-[10px] text-[#1d1d1f]">{r.topColor}</span></div>
                      <div className="flex justify-between"><span className="text-[10px] text-[#86868b]">价格敏感</span><span className="text-[10px] text-[#1d1d1f]">{r.priceSens}</span></div>
                      <div className="flex justify-between"><span className="text-[10px] text-[#86868b]">核心需求</span><span className="text-[10px] text-[#C25B6E] font-medium">{r.feature}</span></div>
                      <div className="flex items-center gap-1 pt-1"><Star className="w-3 h-3 text-[#ff9500] fill-[#ff9500]" /><span className="text-[10px] text-[#1d1d1f] font-medium">{r.satisfaction} / 5.0</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Design Cases */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">Momcozy 设计案例与获奖</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {designCases.map((d, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-[#EDE6DF] hover:shadow-md transition-natural">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${d.color}15` }}>
                        <Palette className="w-5 h-5" style={{ color: d.color }} strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#1d1d1f]">{d.product}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: `${d.color}15`, color: d.color }}>{d.award}</span>
                      </div>
                    </div>
                    <h5 className="text-xs font-semibold text-[#1d1d1f] mb-1">{d.design}</h5>
                    <p className="text-xs text-[#86868b] leading-relaxed truncate mb-2">{d.concept}</p>
                    <div className="flex flex-wrap gap-1">
                      {d.users.split(' / ').map((u, ui) => (
                        <span key={ui} className="px-2 py-0.5 rounded-md bg-[#FBF8F5] text-[10px] text-[#86868b]">{u}</span>
                      ))}
                    </div>
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
