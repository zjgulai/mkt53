// ═══════════════════════════════════════════════════════════════════
// OperationsManual.tsx — 全站操作手册 + 业务价值 + 洞察故事线
// 达尔文进化论多轮迭代产物：MECE架构、五步法验证、深度自洽
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  BookOpen, Target, TrendingUp, Users, BarChart3, Shield, Eye, Sparkles, Wand2,
  ChevronDown, ChevronUp, Lightbulb, Zap, AlertTriangle, CheckCircle, ArrowRight,
  Clock, DollarSign, Award, Compass, Layers, MessageSquare, Heart
} from 'lucide-react';

// ═══ 五步法 × 达尔文进化轮：50次迭代精炼的全站操作手册 ═══

const pageGuides = [
  {
    id: 'home',
    title: '首页仪表盘',
    icon: Target,
    color: '#C25B6E',
    path: '/',
    purpose: 'Momcozy市场洞察BI系统的战略指挥中枢，一站式呈现全球母婴护理市场的核心KPI与竞争态势',
    audience: 'CEO、CMO、战略VP、市场总监',
    howToUse: [
      '每日晨会前浏览：关注市场层级和份额分母变化，判断市场是否在扩张',
      '周报汇报：截图市场规模趋势、北美公开份额和品牌份额待授权状态',
      '月度战略复盘：使用增长预警看板识别风险信号',
      '季度规划：参考PEST分析和波特五力建议制定战略方向'
    ],
    businessValue: '将公开市场报告、待授权经营数据和内部复核任务分层呈现；效率收益需接入使用日志后再量化',
    keyInsights: [
      { title: '品类TAM $3.81B / 细分TAM $233M', desc: '吸奶器品类TAM登记 ds-001；穿戴式细分TAM登记 ds-045；SAM/SOM需另补服务范围和可获份额假设', type: 'strategic' },
      { title: '北美公开份额45.05%', desc: 'Fortune BI 2025区域市场口径已登记 ds-002', type: 'strength' },
      { title: '穿戴式CAGR 15.08%', desc: '穿戴式细分赛道公开报告口径已登记 ds-045', type: 'opportunity' },
      { title: '品牌份额待授权', desc: 'Momcozy/Medela份额需Amazon Brand Analytics或零售面板接入', type: 'action' }
    ],
    storyLine: '从"我们在哪"到"我们要去哪"——首页仪表盘先给出公开报告可复核的市场规模和区域份额，再把品牌份额、GMV月趋势等授权数据列为待接入项。'
  },
  {
    id: 'market',
    title: '看市场',
    icon: BarChart3,
    color: '#C25B6E',
    path: '/market',
    purpose: '深度市场规模分析、品类趋势追踪、宏观环境扫描（PEST）、竞争五力模型评估',
    audience: '市场分析师、品类经理、战略规划师',
    howToUse: [
      '市场规模页：查看上层TAM、品类TAM和细分TAM，使用双Y轴图表理解量级差异',
      '趋势分析页：先查看公开兴趣代理；月度GMV趋势需Amazon或ERP快照接入后再做季节性判断',
      '品类分析页：使用热力矩阵图发现高增速低渗透的蓝海品类',
      'PEST分析页：季度扫描政治/经济/社会/技术变化对业务的影响',
      '波特五力页：评估行业吸引力，判断进入/退出哪些细分市场的决策依据'
    ],
    businessValue: '沉淀内部市场洞察流程；外部报告替代价值需采购清单、授权范围和实际使用日志共同核算',
    keyInsights: [
      { title: '电动吸奶器增速待交叉验证', desc: '品类增速需公开报告和平台销售快照至少双源确认', type: 'opportunity' },
      { title: '北美市场占全球45.05%', desc: '公开区域份额来源 ds-002；经营策略仍需品牌份额和渠道数据补齐', type: 'risk' },
      { title: 'FDA/CPSC适用边界待逐SKU复核', desc: '510(k)、CPC、eFiling不能混用，成本和周期需合规台账确认', type: 'alert' },
      { title: '低增长品类需授权经营数据判断', desc: '淘汰或转投结论需销售、毛利和库存数据支撑', type: 'action' }
    ],
    storyLine: '市场洞察不是只看单点数字，而是把公开报告、平台快照、ERP和人工复核放在同一口径下判断。未授权数据只作为待办，不作为经营事实。'
  },
  {
    id: 'competition',
    title: '看竞争',
    icon: Target,
    color: '#ff9500',
    path: '/competition',
    purpose: '竞品产品库、新品上市监测、区域竞争格局、价格追踪、品牌份额对比',
    audience: '竞品情报分析师、产品经理、定价经理',
    howToUse: [
      '竞品产品库：按品牌/品类/价格区间筛选，使用对比功能找出差异化空间',
      '新品监测页：每周一查看"新品上市"列表，评估威胁等级并制定应对策略',
      '区域竞争页：按国家维度分析份额，发现Momcozy的空白市场和竞品薄弱环节',
      '价格追踪页：监控竞品促销节奏，预判Prime Day/Black Friday定价策略',
      '产品管理页：管理自有产品生命周期，标注BCG象限指导资源分配'
    ],
    businessValue: '将竞品情报从人工记录升级为来源标记和复核队列；响应提速需采集日志和处理时长记录验证',
    keyInsights: [
      { title: '高端智能款线索待公开页验证', desc: '价格、功能和上市节点需品牌官网或零售页面交叉确认', type: 'risk' },
      { title: '欧洲份额变化待零售面板接入', desc: '区域扩张建议不能仅依赖样例份额，需授权面板或公开报告支撑', type: 'opportunity' },
      { title: '促销节奏待采集任务复核', desc: '促销频率、折扣深度和coupon信息需保留采集时间戳与页面证据', type: 'alert' },
      { title: '新品BSR表现待Amazon连接器授权', desc: 'BSR、评论和销量不能由公开样例推断为平台级事实', type: 'best-practice' }
    ],
    storyLine: '竞争情报的最高境界不是"知道对手在做什么"，而是"预判对手将要做什么"。新品监测的"威胁等级评估+应对策略建议"模块，正是从被动响应进化到主动预判的关键跃迁。'
  },
  {
    id: 'users',
    title: '看用户',
    icon: Users,
    color: '#af52de',
    path: '/users',
    purpose: '用户画像、社交声量监测、评论情感分析、消费者/渠道/店铺深度访谈',
    audience: '用户研究经理、品牌经理、客服VP、产品经理',
    howToUse: [
      '消费者访谈：按画像类型（新手妈妈/背奶妈妈等）筛选，查看痛点-需求-建议三段式分析',
      '渠道访谈：按渠道（Amazon/Target等）查看健康度评分和策略建议',
      '店铺访谈：按门店类型查看坪效、转化率、最佳实践',
      '社交声量：监测TikTok/Instagram品牌提及量和情感倾向',
      '全球画像：6类核心人群画像卡片，指导产品定位和营销创意'
    ],
    businessValue: '将分散在CRM、社交媒体、Amazon评论中的用户声音聚合为结构化洞察，产品决策有据可依',
    keyInsights: [
      { title: '背奶妈妈满意度待VOC样本复核', desc: 'NPS和人群差异需问卷样本、时间窗口和统计方法完整后展示', type: 'strength' },
      { title: '"清洁不便"痛点需评论语料确认', desc: '痛点排名和提及率需Amazon/VOC/社媒样本窗口支撑', type: 'action' },
      { title: 'TikTok声量和情感分待API接入', desc: '公开代理趋势可提示方向，但不得等同真实社媒全量声量', type: 'risk' },
      { title: '渠道访谈建议需访谈记录绑定', desc: '渠道定制款结论需门店访谈原文和样本量复核', type: 'opportunity' }
    ],
    storyLine: '用户研究的核心不是堆叠样例数字，而是保留样本来源、访谈原文、时间窗口和统计口径。没有授权或样本证据的洞察只能进入待复核队列。'
  },
  {
    id: 'industry',
    title: '看行业',
    icon: Shield,
    color: '#5856d6',
    path: '/industry',
    purpose: '政策法规追踪、供应链可视化、IP专利分析、展会情报、宏观动态',
    audience: '法务总监、供应链VP、研发VP、政府关系经理',
    howToUse: [
      '政策法规：按国家/紧急程度筛选，查看影响评估和应对建议',
      '供应链：交互式地图查看全球供应链节点，识别断供风险',
      'IP专利：监控竞品专利布局，规避侵权风险并发现技术空白',
      '展会情报：跟踪全球母婴展会动态，规划参展和竞品暗访',
      '宏观动态：汇率/关税/原材料价格变化对成本的影响预警'
    ],
    businessValue: '合规风险前置化——将"被动应对监管"转变为"主动预判政策"，降低潜在罚款和召回损失',
    keyInsights: [
      { title: '美国FDA/CPSC适用边界需复核', desc: '吸奶器FDA 510(k)路径与CPSC CPC/eFiling证书要求不能混同，需按SKU逐项确认', type: 'alert' },
      { title: '关税变化需官方税则复核', desc: '供应链转移建议需绑定HS code、原产地规则和成本测算', type: 'opportunity' },
      { title: '竞品专利线索待专利库验证', desc: '授权状态、权利要求和规避空间需专利检索报告支撑', type: 'risk' },
      { title: '展会情报需主办方/参展名单确认', desc: '参展和暗访投入需官方日程与竞品名单复核', type: 'action' }
    ],
    storyLine: '行业洞察是提前发现政策、专利、供应链和展会线索；只有完成官方文本或授权数据库验证后，才进入经营决策层。'
  },
  {
    id: 'self',
    title: '看自己',
    icon: Eye,
    color: '#34c759',
    path: '/self',
    purpose: '品牌自研产品分析、定价策略、渠道表现、推广效果——营销4P全景视图',
    audience: '产品总监、定价经理、渠道总监、市场总监',
    howToUse: [
      '产品分析页：BCG矩阵指导资源分配，明星产品加大投入，瘦狗产品考虑淘汰',
      '定价分析页：对比竞品ASP，评估Momcozy价格带的竞争力空间',
      '渠道表现页：DTC vs Amazon vs 线下Retail的ROI对比',
      '推广分析页：Prime Day/Brand Day等活动ROI追踪，优化预算分配'
    ],
    businessValue: '把营销4P拆成产品、价格、渠道、推广四类待验证指标；真实经营结论需ERP、广告和渠道数据接入',
    keyInsights: [
      { title: 'M5 BCG象限待销售份额接入', desc: '高增长和高份额判断需内部销售、市场份额和品类增长口径共同支持', type: 'strength' },
      { title: 'DTC与Amazon利润率待财务快照确认', desc: '渠道利润对比需订单、费用和退货口径统一后展示', type: 'opportunity' },
      { title: '温奶器资源策略待生命周期数据验证', desc: '淘汰或清库存建议需销量、毛利、库存周转和售后数据支撑', type: 'action' },
      { title: 'Prime Day复盘需广告数据授权', desc: 'ROAS和行业对比需广告平台、站内转化和公开基准三方证据', type: 'best-practice' }
    ],
    storyLine: '"看自己"是最难也最重要的一课。当BCG矩阵显示某款产品是"现金牛"时，真正的战略问题是：我们是否已经在为它准备替代者？'
  },
  {
    id: 'ai',
    title: 'AI助手',
    icon: Sparkles,
    color: '#af52de',
    path: '/ai-assistant',
    purpose: 'AI驱动的评论分析、设计助手、知识库问答、数据评论自动生成',
    audience: '所有业务人员、产品设计师、数据分析师',
    howToUse: [
      '评论分析：选择产品和时间范围，AI自动提取Top10痛点和情感趋势',
      '设计助手：输入产品概念描述，AI生成产品设计参考图',
      '知识库问答：自然语言提问获取市场/竞品/用户洞察',
      '数据评论：选择数据图表，AI自动生成分析评论和Action建议'
    ],
    businessValue: '作为 AI 分析入口规划，接入调用日志、模型评估和人工复核后再量化业务价值',
    keyInsights: [
      { title: '评论分析准确率和人工一致率待评估', desc: '需补评论样本窗口、模型版本、评测集和人工复核记录后再计算自动化收益', type: 'efficiency' },
      { title: '知识库覆盖范围需随版本维护', desc: '内部知识沉淀可作为检索入口，响应速度和命中率需绑定版本化评测', type: 'efficiency' },
      { title: '设计助手生成量待接入日志', desc: '概念验证周期需要用 requestId、生成轮次和审核记录验证', type: 'efficiency' }
    ],
    storyLine: 'AI不是替代人类，而是增强人类。评论分析、知识库问答和设计助手必须绑定调用日志、模型版本和人工复核，才能从演示功能升级为可信业务能力。'
  },
  {
    id: 'gallery',
    title: 'AI画廊',
    icon: Wand2,
    color: '#C25B6E',
    path: '/ai-gallery',
    purpose: 'AI生成的产品图库，作为本地视觉资产目录使用，支持品类筛选和Prompt查看',
    audience: '产品设计师、品牌经理、电商运营、市场团队',
    howToUse: [
      '品类筛选：点击顶部品类按钮快速筛选目标产品类型',
      '图片详情：点击查看Prompt和生成参数，参考优化自身产品描述',
      '灵感借鉴：浏览不同配色的产品呈现方式，指导实际产品摄影',
      '六视图参考：按品类查看多角度呈现规范'
    ],
    businessValue: '作为视觉素材库和概念验证入口，生成成本、审核成本和替代摄影价值仍待审计',
    keyInsights: [
      { title: 'AI图素材为本地资产目录', desc: '素材数量属于目录元数据，不代表业务数据快照', type: 'asset' },
      { title: '六视图系列用于设计参考', desc: '技术文档和产品页面使用前仍需品牌与合规审核', type: 'asset' },
      { title: '电商图覆盖状态待资产盘点', desc: '白底图、生活场景图和使用场景图需按文件清单复核', type: 'asset' }
    ],
    storyLine: 'AI画廊的本质不是替代设计师，而是提供可追溯的概念素材入口；效率收益只有在项目工时和审核记录接入后才可量化。'
  }
];

// ═══ 洞察与运营故事线 ═══
const insightStories = [
  {
    chapter: '第一章：定位',
    title: '我们在哪？——全球母婴护理市场的坐标',
    icon: Compass,
    color: '#C25B6E',
    narrative: '公开报告口径显示：全球吸奶器品类TAM约$3.81B（2026E，ds-001），穿戴式吸奶器细分TAM约$233M（2026E，ds-045）。全球婴童用品为上层TAM，不能作为吸奶器份额分母；SAM/SOM需Amazon Brand Analytics、零售面板、ERP快照和服务范围假设接入后再下经营判断。',
    dataPoints: ['北美公开份额45.05%（ds-002）', '穿戴式CAGR 15.08%（ds-045）', '公开月趋势为Wikimedia兴趣代理，非GMV'],
    action: '优先补齐Amazon/零售面板/ERP授权数据，再做品牌份额和渠道投放结论'
  },
  {
    chapter: '第二章：扫描',
    title: '周围发生了什么？——五维环境扫描',
    icon: Zap,
    color: '#ff9500',
    narrative: '政治维度：美国吸奶器合规同时涉及FDA医疗器械路径与CPSC消费品证书/eFiling要求，不能把CPSC规则等同于FDA 510(k)认证。经济维度、技术维度和竞争维度目前以线索队列呈现，关税、智能款上市、竞品促销频率和份额变化都需要官方文本、品牌官网、零售页面或授权面板交叉验证。',
    dataPoints: ['CPSC CPC/eFiling需复核', '关税变化需官方税则', '智能款价格需零售页证据', '竞品促销频率待采集'],
    action: '优先级矩阵：P0-复核FDA/CPSC适用边界 / P1-评估供应链证据缺口 / P2-建立新品与技术线索采集队列'
  },
  {
    chapter: '第三章：盲区',
    title: '我们看不见什么？——反直觉洞察',
    icon: AlertTriangle,
    color: '#ff3b30',
    narrative: '三个待验证盲区：(1)背奶妈妈是否具有更高满意度和复购价值，需要问卷/VOC样本验证。(2)"清洁不便"是否为首要痛点，需要评论语料和访谈原文支撑。(3)TikTok声量与情感分是否背离，需要授权API或公开代理指标说明口径后再判断。',
    dataPoints: ['人群满意度待样本复核', '清洁痛点排名待语料验证', '社媒声量与情感分待API接入'],
    action: '先补VOC样本、评论语料和社媒口径，再决定预算调整、功能优先级和投放节奏'
  },
  {
    chapter: '第四章：量化',
    title: '价值是多少？——ROI证据门禁',
    icon: BarChart3,
    color: '#5856d6',
    narrative: 'ROI目前只允许作为核算框架展示，不能把样例成本、节省额、毛利改善或综合回报率当成已验证事实。后续需要接入预算、采购、工时、广告和毛利数据，并保留测算版本。',
    dataPoints: ['系统成本待财务口径', '咨询替代待采购清单', '毛利影响待经营数据', 'ROI待测算版本'],
    action: '建立ROI测算表和证据清单，未完成前不在页面展示金额或百分比结论'
  },
  {
    chapter: '第五章：行动',
    title: '下一步做什么？——分阶段行动计划',
    icon: CheckCircle,
    color: '#34c759',
    narrative: '基于证据缺口的分阶段行动：先复核合规适用边界和高风险数据源，再建立品类、用户、竞品和自身经营的采集队列，最后把已验证指标接入复盘节奏。具体预算和业务动作需在数据闭环后批准。',
    dataPoints: ['阶段一：合规与来源复核', '阶段二：采集队列和授权清单', '阶段三：验证指标进入复盘'],
    action: '以数据审计矩阵追踪行动项状态；未验证项保持待授权或待复核标签'
  }
];

export default function OperationsManual() {
  const [activeTab, setActiveTab] = useState<'guide' | 'insights' | 'value'>('guide');
  const [expandedPage, setExpandedPage] = useState<string | null>('home');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#C25B6E]/8 via-[#FBF8F5] to-[#34c759]/8 rounded-2xl p-5 card-shadow-sm border border-[#C25B6E]/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#C25B6E] flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1d1d1f]">操作手册与业务价值中心</h2>
            <p className="text-xs text-[#86868b]">五步法 × 达尔文进化论迭代 · 8大页面 × 5章洞察故事线</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {[
            { key: 'guide' as const, label: '使用手册', icon: BookOpen },
            { key: 'insights' as const, label: '洞察故事线', icon: Lightbulb },
            { key: 'value' as const, label: '业务价值', icon: DollarSign },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === tab.key ? 'bg-[#C25B6E] text-white' : 'bg-white text-[#86868b] border border-[#EDE6DF]'}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: 使用手册 */}
      {activeTab === 'guide' && (
        <div className="space-y-4">
          {pageGuides.map(page => {
            const Icon = page.icon;
            const isOpen = expandedPage === page.id;
            return (
              <div key={page.id} className="bg-white rounded-2xl card-shadow-sm border border-[#EDE6DF] overflow-hidden">
                <button onClick={() => setExpandedPage(isOpen ? null : page.id)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-[#FBF8F5]/50 transition-colors text-left">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${page.color}15`, color: page.color }}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1d1d1f]">{page.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FBF8F5] text-[#86868b]">{page.audience}</span>
                    </div>
                    <p className="text-[11px] text-[#86868b] truncate">{page.purpose}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#86868b]" /> : <ChevronDown className="w-4 h-4 text-[#86868b]" />}
                </button>
                {isOpen && (
                  <div className="border-t border-[#EDE6DF] px-4 pb-4">
                    {/* How to Use */}
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-[#1d1d1f] mb-2 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[#5856d6]" /> 操作指南
                      </h4>
                      <div className="space-y-1.5">
                        {page.howToUse.map((step, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#FBF8F5]">
                            <span className="w-5 h-5 rounded-full bg-[#5856d6]/10 text-[#5856d6] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            <span className="text-[11px] text-[#1d1d1f] leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Key Insights */}
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-[#1d1d1f] mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-[#ff9500]" /> 关键洞察
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {page.keyInsights.map((ins, i) => (
                          <div key={i} className="p-2.5 rounded-xl border" style={{
                            borderColor: ins.type === 'action' || ins.type === 'alert' || ins.type === 'risk' ? '#ff3b3030' : ins.type === 'opportunity' || ins.type === 'strength' || ins.type === 'best-practice' ? '#34c75930' : '#ff950030',
                            backgroundColor: ins.type === 'action' || ins.type === 'alert' || ins.type === 'risk' ? '#ff3b3008' : ins.type === 'opportunity' || ins.type === 'strength' || ins.type === 'best-practice' ? '#34c75908' : '#ff950008'
                          }}>
                            <p className="text-[11px] font-medium text-[#1d1d1f]">{ins.title}</p>
                            <p className="text-[10px] text-[#86868b] leading-relaxed mt-0.5">{ins.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Story Line */}
                    <div className="mt-3 p-3 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                      <h4 className="text-xs font-semibold text-[#C25B6E] mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> 运营故事线
                      </h4>
                      <p className="text-[11px] text-[#1d1d1f] leading-relaxed italic">{page.storyLine}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: 洞察故事线 */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#C25B6E]" /> 五步法洞察框架
            </h3>
            <p className="text-[11px] text-[#86868b]">定位→扫描→盲区→量化→行动：从证据到决策的完整链路</p>
          </div>
          {insightStories.map((story, i) => {
            const Icon = story.icon;
            return (
              <div key={i} className="bg-white rounded-2xl card-shadow-sm border border-[#EDE6DF] overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${story.color}15`, color: story.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FBF8F5] text-[#86868b] font-medium">{story.chapter}</span>
                      <h4 className="text-sm font-semibold text-[#1d1d1f]">{story.title}</h4>
                    </div>
                    <p className="text-[11px] text-[#1d1d1f] leading-relaxed mb-3">{story.narrative}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {story.dataPoints.map((dp, di) => (
                        <span key={di} className="px-2 py-1 rounded-lg bg-[#FBF8F5] text-[10px] text-[#1d1d1f] border border-[#EDE6DF] flex items-center gap-1">
                          <BarChart3 className="w-3 h-3 text-[#C25B6E]" /> {dp}
                        </span>
                      ))}
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#34c759]/5 border border-[#34c759]/10">
                      <span className="text-[10px] text-[#34c759] font-medium flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> 行动建议
                      </span>
                      <p className="text-[11px] text-[#1d1d1f] mt-0.5">{story.action}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: 业务价值 */}
      {activeTab === 'value' && (
        <div className="space-y-4">
          {/* ROI证据门禁 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '年度系统成本', value: '待核算', sub: '需财务口径', color: '#ff3b30', icon: <DollarSign className="w-4 h-4" /> },
              { label: '直接节省成本', value: '待验证', sub: '需采购和工时', color: '#34c759', icon: <TrendingUp className="w-4 h-4" /> },
              { label: '毛利提升价值', value: '待接入', sub: '需经营数据', color: '#C25B6E', icon: <Award className="w-4 h-4" /> },
              { label: '综合ROI', value: '待测算', sub: '需版本化模型', color: '#5856d6', icon: <Target className="w-4 h-4" /> },
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${k.color}15`, color: k.color }}>{k.icon}</div>
                  <span className="text-xs text-[#86868b]">{k.label}</span>
                </div>
                <p className="text-2xl font-semibold text-[#1d1d1f]">{k.value}</p>
                <span className="text-[10px] text-[#86868b]">{k.sub}</span>
              </div>
            ))}
          </div>
          {/* 各页面业务价值 */}
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#C25B6E]" /> 各页面业务价值矩阵
            </h3>
            <div className="space-y-2">
              {pageGuides.map((page, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#FBF8F5] transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${page.color}15`, color: page.color }}>
                    <page.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-[#1d1d1f]">{page.title}</span>
                    <p className="text-[10px] text-[#86868b] leading-relaxed">{page.businessValue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* 达尔文进化论迭代记录 */}
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#af52de]" /> 达尔文进化轮迭代记录
            </h3>
            <div className="space-y-1.5">
              {[
                { round: 'R1-R5', focus: 'MECE架构设计', desc: '8大页面→6大数据模块→48张表→完整字段定义', status: '完成' },
                { round: 'R6-R10', focus: '数据血缘关系', desc: '11条血缘链路→上下游追踪→关键路径标注', status: '完成' },
                { round: 'R11-R15', focus: '数据治理体系', desc: '4层架构→内外部分类→敏感度分级→Owner机制', status: '完成' },
                { round: 'R16-R20', focus: '质量监控', desc: '5维度评分→质量分布→趋势监控→异常告警', status: '完成' },
                { round: 'R21-R25', focus: '操作手册', desc: '8页面使用指南→4步操作法→关键洞察提炼', status: '完成' },
                { round: 'R26-R30', focus: '业务价值量化', desc: 'ROI模型→成本节省→毛利提升→证据门禁', status: '完成' },
                { round: 'R31-R35', focus: '洞察故事线', desc: '五步法框架→5章叙事→数据点支撑→行动建议', status: '完成' },
                { round: 'R36-R40', focus: '运营闭环', desc: '发现洞察→量化价值→制定行动→追踪KPI→复盘优化', status: '完成' },
                { round: 'R41-R45', focus: '自洽验证', desc: '数据一致性检查→口径统一→日期校准→交叉验证', status: '完成' },
                { round: 'R46-R50', focus: '上线准备', desc: 'ErrorBoundary→LoadingSkeleton→空状态→滚动复位→最终构建', status: '完成' },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[#FBF8F5]">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#34c759]/10 text-[#34c759] font-medium flex-shrink-0">{r.round}</span>
                  <span className="text-[11px] font-medium text-[#1d1d1f] flex-shrink-0 w-24">{r.focus}</span>
                  <span className="text-[10px] text-[#86868b] flex-1">{r.desc}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#34c759]/10 text-[#34c759] flex-shrink-0">{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
