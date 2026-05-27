import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Download, Clock, User, FileDigit, Printer, Share2, ChevronRight } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// 报告预览页面 — 行业标准报告结构
// 结构：摘要→目录→正文章节→数据图表→结论建议→附录
// ═══════════════════════════════════════════════════════════════════

interface ReportDetail {
  id: string; title: string; category: string; date: string; author: string;
  pages: number; downloads: number; summary: string; tags: string[];
  structure: { section: string; pages: string; content?: string }[];
  highlights: { metric: string; value: string; context: string }[];
  recommendations: string[];
}

const reportDB: Record<string, ReportDetail> = {
  r001: {
    id: 'r001', title: '2026年Q1全球母婴市场宏观洞察报告', category: '区域宏观分析',
    date: '2026-04-15', author: '市场研究团队', pages: 68, downloads: 342,
    summary: '覆盖北美/欧洲/亚太/中东/拉美5大区域，TAM/SAM/SOM三级市场规模测算，PEST分析+波特五力模型',
    tags: ['TAM测算', 'PEST', '波特五力'],
    structure: [
      { section: '1. 执行摘要', pages: 'p.1-4', content: '2026年全球母婴护理市场规模达$1,267亿（TAM），其中吸奶器细分市场$11.6亿（SAM），Momcozy可服务市场$2.24亿（SOM）。北美占比38%为最大区域，亚太增速22%最高。' },
      { section: '2. 研究方法论', pages: 'p.5-8', content: '采用Bottom-Up市场规模测算方法，结合Grand View Research Research/Statista/Mordor Intelligence三方数据源。PEST框架覆盖政治/经济/社会/技术4维度，波特五力评估行业竞争强度。' },
      { section: '3. 市场规模分析（TAM/SAM/SOM）', pages: 'p.9-22', content: 'TAM $1,267亿（全球0-4岁母婴护理市场）→ SAM $11.6亿（吸奶器+配件电动产品市场）→ SOM $2.24亿（Momcozy目标可获取市场）。10年CAGR 8.52%，2028年预计突破$15亿。' },
      { section: '4. PEST宏观环境分析', pages: 'p.23-36', content: 'P-政治：中美贸易关税25%影响供应链布局；E-经济：全球通胀降温至2.8%，消费者信心回升；S-社会：全球母乳喂养率58%→67%（WHO 2030目标）；T-技术：AIoT+穿戴式+UV-C 3大技术趋势。' },
      { section: '5. 波特五力竞争分析', pages: 'p.37-48', content: '新进入者威胁（中）- 技术壁垒降低但品牌壁垒高；替代品威胁（低）- 母乳不可替代；供应商议价能力（中）- 硅胶/电机集中度高；买方议价能力（高）- Amazon比价透明；行业竞争（高）- 8大品牌激烈竞争。' },
      { section: '6. 区域市场深度分析', pages: 'p.49-58', content: '北美：$4.42亿（38%）· 美国FDA 510(k)路径 · Momcozy份额22.2%；欧洲：$3.14亿（27%）· MDR过渡期 · 德国份额20.2%；亚太：$2.56亿（22%）· 日本28.6%份额最高；中东：$0.93亿（8%）· 高端偏好。' },
      { section: '7. 结论与战略建议', pages: 'p.59-64', content: '建议Momcozy在2026 H2重点布局：①W1加热款北美首发抢差异化窗口 ②亚太TikTok Shop渠道投入 ③欧洲MDR认证前置准备 ④中东高端产品线测试。' },
      { section: '8. 附录与数据来源', pages: 'p.65-68', content: '附录A：完整TAM/SAM/SOM计算模型；附录B：PEST详细评分矩阵；附录C：区域市场规模数据源（Grand View Research Research 2024/Statista 2025/Mordor Intelligence 2025）。' },
    ],
    highlights: [
      { metric: '全球TAM', value: '$1,267亿', context: '2026年母婴护理市场总规模' },
      { metric: '吸奶器SAM', value: '$11.6亿', context: '电动吸奶器可服务市场' },
      { metric: 'Momcozy SOM', value: '$2.24亿', context: '目标可获取市场（19.3%份额）' },
      { metric: '10年CAGR', value: '8.2%', context: '2024-2034年复合增长率' },
      { metric: '北美占比', value: '38%', context: '$4.42亿最大区域市场' },
      { metric: '亚太增速', value: '+22%', context: '增速最高区域' },
    ],
    recommendations: [
      'W1加热款2026 H2北美首发，抢6个月差异化窗口期',
      '亚太区TikTok Shop投入增加50%，目标份额提升至18%',
      '欧洲MDR认证前置准备，目标2027年Q2完成',
      '中东市场测试高端产品线（$300+价位）',
      '关注印度/东南亚新兴市场，2027年制定进入策略',
    ],
  },
  r009: {
    id: 'r009', title: '2026年Q1全球吸奶器市场竞争格局报告', category: '竞品情报',
    date: '2026-04-12', author: '竞争分析组', pages: 78, downloads: 623,
    summary: '8大品牌25款产品Amazon实时数据采集，价格带竞争地图，BCG矩阵分析',
    tags: ['竞争格局', '价格地图', 'BCG矩阵'],
    structure: [
      { section: '1. 执行摘要', pages: 'p.1-4', content: '2026年Q1全球吸奶器市场8大品牌竞争格局分析，基于<span className="text-[#B5AFA8]">Amazon.com</span> 25款产品实时数据采集。Momcozy以22.2%美国份额领先，但Medela/Willow在高端市场（$300+）仍具优势。' },
      { section: '2. 研究方法论', pages: 'p.5-7', content: '<span className="text-[#B5AFA8]">数据来源：</span><span className="text-[#B5AFA8]">Amazon.com</span>产品页面2026年5月采集，包含产品名称/价格/评分/评价数。分析框架：价格带竞争地图+BCG增长-份额矩阵+品牌竞争力雷达。' },
      { section: '3. 竞争品牌概览', pages: 'p.8-18', content: 'Medela/Elvie/Willow/Spectra/Haakaa/Lansinoh/Philips Avent/Freemie 8大品牌产品线梳理。各品牌定位：Medela（医院级专业）/Elvie（高端设计）/Willow（防漏技术）/Haakaa（性价比爆款）。' },
      { section: '4. 产品价格带分析', pages: 'p.19-32', content: '超高端$400+（Elvie Pump $549）→ 高端$250-400（Willow 360 $349/Medela Melody $349）→ 中高端$150-250（Momcozy M5 $159/M9 $199/W1 $219）→ 入门<$150（Haakaa $16/Lansinoh $89）。' },
      { section: '5. BCG增长-份额矩阵', pages: 'p.33-42', content: '明星：M5（15.1%增长/2.8x份额）+ M9（18.2%/1.6x）；现金牛：哺乳文胸（8.5%/1.4x）+ 孕妇枕（6.2%/1.1x）；问题：W1（42%/0.2x）+ KleanPal（35.2%/0.4x）；瘦狗：传统配件（2.1%/0.6x）。' },
      { section: '6. 品牌竞争力雷达', pages: 'p.43-54', content: '8维度对比：Momcozy在价格竞争力(95)/社媒影响力(95)/生态完整性(90)领先；Medela品牌知名度(92)最高；Elvie产品满意度(88)和品质追求者中口碑最佳。' },
      { section: '7. 威胁评估矩阵', pages: 'p.55-64', content: '高威胁：Medela Melody（超静音差异化）+ Willow Sync（AI+保险渠道）；中威胁：eufy S1 Pro（HeatFlow+Anker背书）+ Ameda GLO；低威胁：Haakaa（无电动化）+ Lansinoh（缺乏创新）。' },
      { section: '8. 结论与建议', pages: 'p.65-78', content: '①加速W1上市抢加热差异化窗口 ②开发$300+产品线挑战高端 ③强化保险渠道合作 ④亚太区本地化产品策略 ⑤监控eufy/Imani技术动向。' },
    ],
    highlights: [
      { metric: '采集产品数', value: '25款', context: '<span className="text-[#B5AFA8]">Amazon.com</span> 8大品牌' },
      { metric: 'Momcozy美国份额', value: '22.2%', context: 'Amazon Best Seller #1' },
      { metric: '价格带覆盖', value: '$16-$549', context: '从入门到超高端' },
      { metric: 'M5增长率', value: '+15.1%', context: 'BCG明星产品' },
      { metric: 'W1预期增长', value: '+42%', context: '加热差异化创新' },
      { metric: 'ASP趋势', value: '$162', context: 'Momcozy 2026 Q1均价' },
    ],
    recommendations: [
      '加速W1加热款上市，抢占6个月差异化窗口期',
      '开发$300+高端产品线（对标Elvie/Medela）',
      '与美国保险公司合作，开辟保险渠道',
      '亚太区推出本地化产品（小罩杯/静音加强）',
      '监控eufy S1 Pro和Imani i2plus技术动向',
    ],
  },
};

// 默认报告数据（当ID不在DB中时）
const defaultReport: ReportDetail = {
  id: 'default', title: '报告预览', category: '竞品情报', date: '2026-05-23', author: '市场研究团队', pages: 52, downloads: 234,
  summary: 'Momcozy品牌市场洞察报告', tags: ['市场分析'],
  structure: [
    { section: '1. 执行摘要', pages: 'p.1-3', content: '本报告基于2025-2026年深度市场研究，涵盖竞争格局、消费者洞察、技术趋势和战略建议。' },
    { section: '2. 研究方法论', pages: 'p.4-6', content: '采用定性与定量结合的研究方法，包括Amazon数据采集、用户访谈、行业专家咨询等。' },
    { section: '3. 市场概况', pages: 'p.7-18', content: '全球母婴护理市场2026年规模$1,267亿，吸奶器细分市场$11.6亿，Momcozy占据19.3%全球份额。' },
    { section: '4. 竞争分析', pages: 'p.19-30', content: '8大品牌竞争格局深度分析，价格带分布、BCG矩阵、品牌竞争力雷达图。' },
    { section: '5. 消费者洞察', pages: 'p.31-38', content: '6类核心用户画像分析，全球八大人群聚类，RFM用户价值分层。' },
    { section: '6. 技术趋势', pages: 'p.39-44', content: '加热差异化/AI集成/保险渠道3大技术趋势，520+专利地图分析。' },
    { section: '7. 战略建议', pages: 'p.45-50', content: '基于分析结论，提出5大战略方向建议。' },
    { section: '8. 附录', pages: 'p.51-52', content: '数据来源、术语表、联系方式。' },
  ],
  highlights: [
    { metric: '全球TAM', value: '$1,267亿', context: '2026年母婴护理市场' },
    { metric: '吸奶器市场', value: '$11.6亿', context: '电动吸奶器细分' },
    { metric: 'Momcozy份额', value: '19.3%', context: '全球市场#1' },
    { metric: '用户规模', value: '500万+', context: '覆盖60国' },
    { metric: '专利资产', value: '520+', context: '授权专利' },
    { metric: '10年CAGR', value: '8.2%', context: '2024-2034' },
  ],
  recommendations: [
    'W1加热款2026 H2北美首发，抢差异化窗口',
    '亚太TikTok Shop投入增加50%',
    '欧洲MDR认证前置准备',
    '开发$300+高端产品线',
    '强化保险渠道合作',
  ],
};

export default function ReportPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const report = (id && reportDB[id]) ? reportDB[id] : defaultReport;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1000px] mx-auto">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/reports')} className="flex items-center gap-2 text-sm text-[#86868b] hover:text-[#C25B6E] transition-colors duration-200">
            <ArrowLeft className="w-4 h-4" />返回报告中心
          </button>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#EDE6DF] transition-colors duration-200">
              <Printer className="w-3.5 h-3.5" />打印
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#EDE6DF] transition-colors duration-200">
              <Share2 className="w-3.5 h-3.5" />分享
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C25B6E] text-white text-xs font-medium hover:bg-[#A34759] transition-colors duration-200">
              <Download className="w-3.5 h-3.5" />下载PDF
            </button>
          </div>
        </div>

        {/* 报告封面 */}
        <div className="bg-white rounded-2xl p-8 card-shadow-sm border border-[#EDE6DF] mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded bg-[#C25B6E]/10 text-[#C25B6E] text-xs font-medium">{report.category}</span>
            <span className="px-2 py-0.5 rounded bg-[#FBF8F5] text-[#86868b] text-xs">{report.date}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] mb-5">{report.title}</h1>
          <p className="text-sm text-[#86868b] mb-6 leading-relaxed">{report.summary}</p>
          <div className="flex items-center gap-8 text-xs text-[#86868b]">
            <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{report.author}</div>
            <div className="flex items-center gap-1.5"><FileDigit className="w-3.5 h-3.5" />{report.pages}页</div>
            <div className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />{report.downloads}次下载</div>
            <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{report.date}</div>
          </div>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {report.tags.map((tag, t) => (
              <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{tag}</span>
            ))}
          </div>
        </div>

        {/* 核心数据亮点 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {report.highlights.map((h, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
              <p className="text-[10px] text-[#86868b] mb-1">{h.metric}</p>
              <p className="text-xl font-bold text-[#C25B6E]">{h.value}</p>
              <p className="text-[10px] text-[#B5AFA8] mt-1.5">{h.context}</p>
            </div>
          ))}
        </div>

        {/* 目录与章节预览 */}
        <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF] mb-6">
          <h2 className="text-base font-semibold text-[#1d1d1f] mb-5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C25B6E]" />报告目录
          </h2>
          <div className="space-y-4">
            {report.structure.map((section, i) => (
              <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] hover:bg-[#F5EDE8] transition-colors duration-200">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium text-[#1d1d1f] truncate">{section.section}</h3>
                  <span className="text-xs text-[#86868b]">{section.pages}</span>
                </div>
                {section.content && <p className="text-xs text-[#86868b] leading-relaxed truncate">{section.content}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* 战略建议 */}
        <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF] mb-6">
          <h2 className="text-base font-semibold text-[#1d1d1f] mb-5 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-[#34c759]" />战略建议
          </h2>
          <div className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-[#34c759]/5 border border-[#34c759]/10">
                <span className="w-6 h-6 rounded-full bg-[#34c759]/10 text-[#34c759] text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <p className="text-sm text-[#1d1d1f]">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-center gap-4 pb-8">
          <button onClick={() => navigate('/reports')} className="px-6 py-3 rounded-xl border border-[#EDE6DF] text-sm text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200">
            返回报告列表
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C25B6E] text-white text-sm font-medium hover:bg-[#A34759] transition-colors duration-200">
            <Download className="w-4 h-4" />下载完整PDF（{report.pages}页）
          </button>
        </div>
      </div>
    </div>
  );
}
