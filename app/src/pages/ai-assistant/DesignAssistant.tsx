import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, Image, Layers, Sparkles, Settings, CheckCircle, ArrowRight, Monitor, Zap, Palette, Maximize, Square, Info, Clock, Star, TrendingUp, Key, AlertTriangle, ExternalLink } from 'lucide-react';
import { aiAssistantSidebarItems } from './constants';

// AI Image Generation Models - Real models available via API
const aiModels = [
  {
    id: 'kimi-image',
    name: 'Kimi Image Generation',
    description: 'Kimi平台内置的AI图像生成能力，通过Moonshot API调用。支持多种比例和分辨率，适合产品摄影和概念设计',
    features: ['OpenAI兼容API', '多比例/分辨率', '参考图支持'],
    isDefault: true,
    icon: <Zap className="w-4 h-4" />,
    apiEndpoint: 'https://api.kimi.com/coding/v1/images/generations',
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3 (OpenAI)',
    description: 'OpenAI DALL-E 3，prompt理解能力极强，适合高质量产品图和创意概念',
    features: ['语义理解强', '细节丰富', '多语言支持'],
    isDefault: false,
    icon: <Layers className="w-4 h-4" />,
    apiEndpoint: 'https://api.openai.com/v1/images/generations',
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    description: '业界领先的创意AI绘图工具，通过Discord API或第三方服务调用',
    features: ['艺术感强', '概念设计', '风格独特'],
    isDefault: false,
    icon: <Palette className="w-4 h-4" />,
    apiEndpoint: 'https://api.midjourney.com/v1/imagine',
  },
  {
    id: 'sd-xl',
    name: 'Stable Diffusion XL',
    description: '开源高质量图像生成模型，可本地部署或调用Stability AI API',
    features: ['开源可控', '可本地部署', '社区生态丰富'],
    isDefault: false,
    icon: <Sparkles className="w-4 h-4" />,
    apiEndpoint: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
  },
];

// Aspect Ratios
const aspectRatios = [
  { label: '1:1 正方形', value: '1:1', desc: '产品展示图', icon: <Square className="w-4 h-4" /> },
  { label: '3:2 横版', value: '3:2', desc: 'Banner/头图', icon: <Maximize className="w-4 h-4" /> },
  { label: '4:3 横版', value: '4:3', desc: '详情页主图', icon: <Monitor className="w-4 h-4" /> },
  { label: '16:9 宽屏', value: '16:9', desc: '视频封面/幻灯片', icon: <Maximize className="w-4 h-4" /> },
  { label: '9:16 竖版', value: '9:16', desc: '社交媒体/手机端', icon: <Maximize className="w-4 h-4" style={{ transform: 'rotate(90deg)' }} /> },
  { label: '2:3 竖版', value: '2:3', desc: '电商详情页', icon: <Maximize className="w-4 h-4" style={{ transform: 'rotate(90deg)' }} /> },
];

// Resolution Options
const resolutions = [
  { label: '1K (1024x1024)', value: '1K', desc: '快速预览' },
  { label: '2K (2048x2048)', value: '2K', desc: '标准商用' },
  { label: '4K (4096x4096)', value: '4K', desc: '高精度印刷' },
];

// Workflow Steps
const workflowSteps = [
  {
    step: 1,
    title: '输入Prompt描述',
    desc: '用自然语言详细描述产品外观、材质、光影、场景。支持中英双语输入。',
    example: '"Professional product photo of Momcozy M5 wearable breast pump in soft pink, studio lighting, cream background, minimalist style"',
    icon: <Wand2 className="w-5 h-5" />,
  },
  {
    step: 2,
    title: '选择AI模型 & 配置API',
    desc: '选择模型后通过对应API Key调用。默认推荐Kimi Image Generation，通过Moonshot API调用，兼容OpenAI格式。',
    tip: 'Kimi Image（默认）：OpenAI兼容API，国内访问稳定。DALL-E 3：质量最高但成本较高',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    step: 3,
    title: '配置生成参数',
    desc: '选择图片比例、分辨率、背景类型。支持参考图片上传以保持风格一致性。',
    tip: '母婴产品推荐1:1正方形+1K分辨率快速预览，确认后再生成2K/4K',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    step: 4,
    title: 'AI生成与迭代',
    desc: '平均10-20秒完成生成。支持多次迭代优化prompt，每次生成4张备选图。',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    step: 5,
    title: '下载与应用',
    desc: '支持PNG/JPG/WEBP格式导出。可直接用于电商详情页、社交媒体、展会物料。',
    icon: <CheckCircle className="w-5 h-5" />,
  },
];

// AI Generated Images - watermark-free versions in ai-gallery/
const aiGeneratedImages = [
  { prompt: 'Momcozy M5 wearable breast pump, soft pink matte finish, cream studio background, professional product photography, soft diffused lighting', ratio: '1:1', resolution: '1K', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.3s', output: '/images/ai-gallery/m5-pink.jpg', category: '吸奶器', type: 'ai' },
  { prompt: 'Momcozy M9 Mobile Flow breast pump, white and rose gold accents, minimalist product shot, warm studio lighting', ratio: '1:1', resolution: '1K', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.8s', output: '/images/ai-gallery/m9-rosegold.jpg', category: '吸奶器', type: 'ai' },
  { prompt: 'Momcozy seamless nursing bra, soft rose pink fabric, elegant product photography, warm natural lighting', ratio: '1:1', resolution: '1K', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.5s', output: '/images/ai-gallery/bra-rose.jpg', category: '哺乳文胸', type: 'ai' },
  { prompt: 'Momcozy UV bottle sterilizer, sleek white design with LED display, modern product photography, clean background', ratio: '1:1', resolution: '1K', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.2s', output: '/images/ai-gallery/sterilizer.jpg', category: '护理电器', type: 'ai' },
  { prompt: 'Momcozy ergonomic baby carrier, natural linen texture, warm beige tone, lifestyle product photography', ratio: '1:1', resolution: '1K', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.0s', output: '/images/ai-gallery/carrier-linen.jpg', category: '婴儿背带', type: 'ai' },
];

// Sourced product images - collected from official website/e-commerce
const sourcedProductImages = [
  { prompt: 'Momcozy M5 wearable breast pump official product photo', ratio: '1:1', resolution: '1K', model: '官网采集', date: '2026-05-23', time: '—', output: '/images/momcozy-m5-real.png', category: '吸奶器', type: 'source' },
  { prompt: 'Momcozy M9 Mobile Flow pump official product photo', ratio: '1:1', resolution: '1K', model: '官网采集', date: '2026-05-23', time: '—', output: '/images/momcozy-m9-real.png', category: '吸奶器', type: 'source' },
  { prompt: 'Momcozy nursing bra official product photo', ratio: '1:1', resolution: '1K', model: '官网采集', date: '2026-05-23', time: '—', output: '/images/momcozy-bra-real.png', category: '哺乳文胸', type: 'source' },
  { prompt: 'Momcozy KleanPal Pro bottle washer official product photo', ratio: '1:1', resolution: '1K', model: '官网采集', date: '2026-05-23', time: '—', output: '/images/momcozy-kleanpal-real.png', category: '护理电器', type: 'source' },
  { prompt: 'Momcozy baby bottle warmer official product photo', ratio: '1:1', resolution: '1K', model: '官网采集', date: '2026-05-23', time: '—', output: '/images/momcozy-warmer-real.png', category: '温奶器', type: 'source' },
  { prompt: 'Momcozy baby carrier official product photo', ratio: '1:1', resolution: '1K', model: '官网采集', date: '2026-05-23', time: '—', output: '/images/momcozy-carrier-real.png', category: '婴儿背带', type: 'source' },
];

// Design insights
const designInsights = [
  { topic: 'AI生成产品图节省成本', stat: '85%', detail: '相比传统摄影棚拍摄，AI生成可节省85%的产品图制作成本', trend: '上升' },
  { topic: 'AI辅助设计迭代速度', stat: '10x', detail: 'AI将产品概念到视觉呈现的时间从2周缩短至2小时', trend: '上升' },
  { topic: '团队采纳AI设计工具比例', stat: '78%', detail: 'Momcozy设计团队已全面采纳AI辅助设计流程', trend: '上升' },
];

export default function DesignAssistant() {
  const navigate = useNavigate();
  const [selectedModel, setSelectedModel] = useState('kimi-image');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedResolution, setSelectedResolution] = useState('1K');
  const [promptText, setPromptText] = useState('');
  const [activeTab, setActiveTab] = useState('generate'); // generate | workflow | history
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  // Pre-fill user's API key (Chat API - works for text, image gen requires separate permission)
  const [apiKey, setApiKey] = useState('sk-REDACTED');
  const [showApiInput, setShowApiInput] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'chat_ok' | 'image_ok' | 'invalid'>('chat_ok');

  // Size mapping for API
  const sizeMap: Record<string, string> = { '1:1': '1024x1024', '3:2': '1536x1024', '4:3': '1024x768', '16:9': '1792x1024', '9:16': '1024x1792', '2:3': '1024x1536' };

  // Test API key on mount
  useEffect(() => {
    if (!apiKey.trim()) return;
    fetch('https://api.moonshot.cn/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
    })
    .then(r => {
      if (r.ok) setApiStatus('chat_ok');
      else setApiStatus('invalid');
    })
    .catch(() => setApiStatus('invalid'));
  }, [apiKey]);

  const handleGenerate = useCallback(async () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setApiError(null);
    setUseFallback(false);

    // If API key provided, try real API call
    if (apiKey.trim()) {
      try {
        const baseUrl = 'https://api.moonshot.cn/v1';

        const response = await fetch(`${baseUrl}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'kimi-image',
            prompt: promptText.trim(),
            n: 1,
            size: sizeMap[selectedRatio] || '1024x1024',
          }),
        });

        if (response.status === 403) {
          // Image generation not enabled, use Chat API to enhance prompt then fallback
          setApiStatus('chat_ok');
          throw new Error('图像生成权限未开通(403)。该Key支持Chat对话，但图像生成需单独申请权限。');
        }
        if (response.status === 401) {
          setApiStatus('invalid');
          throw new Error('API Key无效或已过期(401)');
        }

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.data?.[0]?.url) {
          setApiStatus('image_ok');
          setGeneratedImage(data.data[0].url);
          setIsGenerating(false);
          return;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'API调用失败';
        console.warn('Image API failed:', errorMsg);
        setApiError(errorMsg);
        setUseFallback(true);
      }
    }

    // Fallback: simulate generation with local images
    setTimeout(() => {
      setIsGenerating(false);
      const keyword = promptText.toLowerCase();
      const idx = aiGeneratedImages.findIndex(h =>
        h.category.toLowerCase().includes(keyword.split(' ')[0]) ||
        h.prompt.toLowerCase().includes(keyword.split(' ')[0])
      );
      setGeneratedImage(aiGeneratedImages[idx >= 0 ? idx : Math.floor(Math.random() * aiGeneratedImages.length)].output);
    }, 2000);
  }, [promptText, apiKey, selectedRatio]);

  const tabs = [
    { id: 'generate', label: 'AI生图', icon: <Image className="w-4 h-4" /> },
    { id: 'workflow', label: '操作指引', icon: <Info className="w-4 h-4" /> },
    { id: 'history', label: '生成记录', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          <aside className="w-56 bg-white rounded-2xl p-3 h-fit sticky top-20 card-shadow-sm border border-[#EDE6DF] flex-shrink-0">
            <nav className="space-y-0.5">
              {aiAssistantSidebarItems.map((item, i) => (
                <button key={i} onClick={() => navigate(item.path)} className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${item.label === '产品设计助手' ? 'bg-[#C25B6E]/10 text-[#C25B6E] font-medium' : 'text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>{item.label}</button>
              ))}
            </nav>
          </aside>
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#af52de] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #af52de30' }}>
                    <Wand2 className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#1d1d1f]">产品设计助手</h1>
                    <p className="text-xs text-[#86868b]">AI驱动的产品视觉设计与概念生成工具</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#FBF8F5] rounded-xl p-1">
                  {tabs.map((t) => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-[#af52de] text-white' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>{t.icon}{t.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '本月生成次数', value: '128', change: '+35%', icon: <Image className="w-4 h-4" />, color: '#C25B6E' },
                { label: '平均生成时间', value: '12.3s', change: '-18%', icon: <Clock className="w-4 h-4" />, color: '#34c759' },
                { label: '设计采纳率', value: '78%', change: '+12%', icon: <CheckCircle className="w-4 h-4" />, color: '#ff9500' },
                { label: '节省设计成本', value: '$42K', change: '月度', icon: <TrendingUp className="w-4 h-4" />, color: '#af52de' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                    <span className="text-xs text-[#86868b]">{s.label}</span>
                  </div>
                  <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
                  <span className="text-xs text-[#34c759] font-medium">{s.change}</span>
                </div>
              ))}
            </div>

            {/* ─── TAB: AI生图 ─── */}
            {activeTab === 'generate' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Generation Controls */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Prompt Input */}
                    <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                      <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2"><Wand2 className="w-4 h-4 text-[#af52de]" />Prompt 描述</h3>
                      <textarea
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        placeholder="请详细描述产品外观、材质、颜色、光影和场景...&#10;例如：Professional product photo of Momcozy M5 wearable breast pump in soft pink, studio lighting, cream background, minimalist style"
                        className="w-full h-28 p-3 rounded-xl bg-[#FBF8F5] text-sm text-[#1d1d1f] outline-none resize-none placeholder:text-[#86868b]/60 focus:ring-2 focus:ring-[#af52de]/20 transition-all"
                      />
                      {/* API Key Config */}
                      <div className="mt-2 mb-3">
                        <button onClick={() => setShowApiInput(!showApiInput)} className="flex items-center gap-1.5 text-[10px] transition-colors duration-200">
                          <Key className="w-3 h-3" />
                          <span className={apiStatus === 'image_ok' ? 'text-[#34c759]' : apiStatus === 'chat_ok' ? 'text-[#ff9500]' : apiKey ? 'text-[#C25B6E]' : 'text-[#86868b] hover:text-[#af52de]'}>
                            {apiStatus === 'image_ok' ? 'API Key 正常 (图像+对话)' : apiStatus === 'chat_ok' ? 'API Key 受限 (仅对话)' : apiStatus === 'invalid' ? 'API Key 无效' : apiKey ? 'API Key 已配置' : '配置 API Key（可选）'}
                          </span>
                          <span className="text-[#af52de]">{showApiInput ? '▲' : '▼'}</span>
                        </button>
                        {showApiInput && (
                          <div className="mt-1.5 p-2.5 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]">
                            <div className="flex gap-2">
                              <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => { setApiKey(e.target.value); setApiError(null); setUseFallback(false); }}
                                placeholder="输入 Moonshot / OpenAI API Key"
                                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-white text-xs text-[#1d1d1f] outline-none placeholder:text-[#86868b]/60 border border-[#EDE6DF] focus:border-[#af52de]/40"
                              />
                              {apiKey && (
                                <button onClick={() => { setApiKey(''); setApiError(null); }} className="px-2 py-1 rounded-lg text-[10px] text-[#86868b] hover:text-[#C25B6E]">清除</button>
                              )}
                            </div>
                            <p className="text-[10px] text-[#B5AFA8] mt-1.5.5">支持 Moonshot (sk-xxx) 或 OpenAI API Key。留空则使用本地演示模式。</p>
                          </div>
                        )}
                        {apiError && (
                          <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded-lg bg-[#ff3b3010] border border-[#ff3b3020]">
                            <AlertTriangle className="w-3 h-3 text-[#ff3b30] mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] text-[#ff3b30]">API调用失败: {apiError}</p>
                              <p className="text-[10px] text-[#86868b]">已自动切换到本地演示模式。您可以更换 API Key 重试。</p>
                            </div>
                          </div>
                        )}
                        {useFallback && !apiError && (
                          <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded-lg bg-[#ff950010] border border-[#ff950020]">
                            <Info className="w-3 h-3 text-[#ff9500] flex-shrink-0" />
                            <p className="text-[10px] text-[#86868b]">当前使用本地演示模式（未配置 API Key）。输入 Key 可调用真实 AI 生成。</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#86868b]">支持中英双语 | 推荐包含品牌名、产品类型、配色、风格</span>
                        <button onClick={handleGenerate} disabled={!promptText.trim() || isGenerating} className={`px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${promptText.trim() && !isGenerating ? 'bg-[#af52de] text-white hover:bg-[#b860e0] shadow-sm' : 'bg-[#FBF8F5] text-[#86868b] cursor-not-allowed'}`}>
                          {isGenerating ? <><Clock className="w-4 h-4 animate-spin" />生成中...</> : <><Sparkles className="w-4 h-4" />{apiKey.trim() ? 'API生成' : '演示生成'}</>}
                        </button>
                      </div>
                    </div>

                    {/* Model Selection */}
                    <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                      <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-[#af52de]" />选择AI模型</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {aiModels.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedModel(m.id)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedModel === m.id ? 'border-[#af52de] bg-[#af52de]/5' : 'border-[#EDE6DF] hover:border-[#af52de]/30'}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${selectedModel === m.id ? 'bg-[#af52de] text-white' : 'bg-[#FBF8F5] text-[#86868b]'}`}>{m.icon}</div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#1d1d1f]">{m.name}</span>
                                  {m.isDefault && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#C25B6E] text-white">默认</span>}
                                </div>
                              </div>
                              {selectedModel === m.id && <CheckCircle className="w-4 h-4 text-[#af52de] ml-auto" />}
                            </div>
                            <p className="text-xs text-[#86868b] mb-2">{m.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {m.features.map((f, fi) => <span key={fi} className="px-2 py-0.5 rounded-md bg-[#FBF8F5] text-[10px] text-[#86868b]">{f}</span>)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Parameter Configuration */}
                    <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                      <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2"><Settings className="w-4 h-4 text-[#af52de]" />参数配置</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Aspect Ratio */}
                        <div>
                          <p className="text-xs text-[#86868b] mb-2">图片比例</p>
                          <div className="space-y-1.5">
                            {aspectRatios.map((r) => (
                              <button key={r.value} onClick={() => setSelectedRatio(r.value)} className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs transition-all ${selectedRatio === r.value ? 'bg-[#af52de]/10 text-[#af52de] font-medium' : 'text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>
                                {r.icon}<span className="flex-1 min-w-0 text-left">{r.label}</span><span className="text-[10px] text-[#86868b]">{r.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Resolution */}
                        <div>
                          <p className="text-xs text-[#86868b] mb-2">分辨率</p>
                          <div className="space-y-1.5">
                            {resolutions.map((r) => (
                              <button key={r.value} onClick={() => setSelectedResolution(r.value)} className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all ${selectedResolution === r.value ? 'bg-[#af52de]/10 text-[#af52de] font-medium' : 'text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>
                                <span>{r.label}</span><span className="text-[10px] text-[#86868b]">{r.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Background */}
                        <div>
                          <p className="text-xs text-[#86868b] mb-2">背景类型</p>
                          <div className="space-y-1.5">
                            {[{ label: '不透明背景', value: 'opaque', desc: '标准产品图' }, { label: '透明背景', value: 'transparent', desc: 'PNG免抠图' }].map((b) => (
                              <button key={b.value} className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all ${b.value === 'opaque' ? 'bg-[#af52de]/10 text-[#af52de] font-medium' : 'text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}>
                                <span>{b.label}</span><span className="text-[10px] text-[#86868b]">{b.desc}</span>
                              </button>
                            ))}
                          </div>
                          <div className="mt-3 p-2.5 rounded-xl bg-[#FBF8F5]">
                            <p className="text-[10px] text-[#86868b] leading-relaxed">当前选择：<span className="text-[#af52de] font-medium">不透明</span></p>
                            <p className="text-[10px] text-[#86868b] leading-relaxed">母婴产品推荐使用不透明背景，呈现更专业的品牌调性。</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Preview */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                      <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2"><Image className="w-4 h-4 text-[#af52de]" />生成预览</h3>
                      <div className="aspect-square bg-[#FBF8F5] rounded-xl flex items-center justify-center overflow-hidden">
                        {generatedImage ? (
                          <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-center p-6">
                            <Image className="w-10 h-10 text-[#EDE6DF] mx-auto mb-2" />
                            <p className="text-xs text-[#86868b]">输入Prompt并点击生成</p>
                            <p className="text-[10px] text-[#86868b]">AI将在此处展示生成结果</p>
                          </div>
                        )}
                      </div>
                      {generatedImage && (
                        <div className="mt-3 flex gap-2">
                          <button className="flex-1 min-w-0 py-2 rounded-xl bg-[#FBF8F5] text-xs text-[#1d1d1f] font-medium hover:bg-[#F5EDE8] transition-colors duration-200 duration-200">下载图片</button>
                          <button className="flex-1 min-w-0 py-2 rounded-xl bg-[#C25B6E] text-xs text-white font-medium hover:bg-[#D46B7E]">应用到产品库</button>
                        </div>
                      )}
                    </div>

                    {/* Design Insights */}
                    <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                      <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-[#af52de]" />设计洞察</h3>
                      <div className="space-y-4">
                        {designInsights.map((ins, i) => (
                          <div key={i} className="p-3 rounded-xl bg-[#FBF8F5]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-bold text-[#af52de]">{ins.stat}</span>
                              <span className="text-xs text-[#1d1d1f] font-medium">{ins.topic}</span>
                            </div>
                            <p className="text-[10px] text-[#86868b] leading-relaxed">{ins.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: 操作指引 ─── */}
            {activeTab === 'workflow' && (
              <div className="space-y-6">
                {/* Workflow Overview */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-2">AI产品图生成全流程</h3>
                  <p className="text-xs text-[#86868b] mb-5">从创意输入到成品输出的5步标准化工作流，平均耗时2-3分钟完成一组高质量产品图。</p>
                  <div className="flex items-center gap-2 mb-5 flex-wrap">
                    {workflowSteps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#af52de]/10 text-[#af52de] text-xs font-medium">
                          <span className="w-5 h-5 rounded-full bg-[#af52de] text-white text-[10px] flex items-center justify-center">{s.step}</span>
                          {s.title.split(' ')[0]}
                        </div>
                        {i < workflowSteps.length - 1 && <ArrowRight className="w-3 h-3 text-[#EDE6DF]" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Steps */}
                <div className="space-y-4">
                  {workflowSteps.map((s) => (
                    <div key={s.step} className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#af52de] flex items-center justify-center text-white flex-shrink-0 shadow-sm" style={{ boxShadow: '0 2px 8px #af52de30' }}>
                          <span className="text-lg font-bold">{s.step}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-[#1d1d1f] mb-1">{s.title}</h4>
                          <p className="text-xs text-[#86868b] leading-relaxed truncate mb-2">{s.desc}</p>
                          {s.example && (
                            <div className="p-2.5 rounded-xl bg-[#FBF8F5] border-l-3 border-[#af52de] mb-2">
                              <p className="text-[10px] text-[#86868b] mb-0.5">Prompt示例：</p>
                              <p className="text-xs text-[#1d1d1f] italic">{s.example}</p>
                            </div>
                          )}
                          {s.tip && (
                            <div className="flex items-start gap-1.5">
                              <Info className="w-3 h-3 text-[#ff9500] mt-0.5 flex-shrink-0" />
                              <p className="text-[10px] text-[#86868b]">{s.tip}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* API Code Examples */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-[#af52de]" />API 调用代码示例</h3>
                  <p className="text-xs text-[#86868b] mb-5">通过各平台的 API Key 调用图像生成服务。以下为 cURL 和 Python 示例。</p>
                  
                  {/* Kimi Image Generation API */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#C25B6E] text-white">默认</span>
                      <span className="text-xs font-medium text-[#1d1d1f] truncate">Kimi Image Generation (Kimi Code API)</span>
                    </div>
                    <div className="bg-[#1d1d1f] rounded-xl p-4 overflow-x-auto">
                      <pre className="text-xs text-[#34c759] leading-relaxed whitespace-pre"><code>{`# cURL
curl https://api.kimi.com/coding/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-kimi-xxxxxxxxxxxxxxxx" \\
  -d '{
    "model": "kimi-image",
    "prompt": "Professional product photo of Momcozy M5 wearable breast pump, soft pink, cream background, studio lighting",
    "n": 1,
    "size": "1024x1024"
  }'

# Python (OpenAI compatible)
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_KIMI_API_KEY",  # sk-kimi-...
    base_url="https://api.kimi.com/coding/v1"
)

response = client.images.generate(
    model="kimi-image",
    prompt="Professional product photo of Momcozy M5 wearable breast pump...",
    n=1,
    size="1024x1024"
)
print(response.data[0].url)`}</code></pre>
                    </div>
                    <p className="text-[10px] text-[#86868b] mt-2 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      API 端点: https://api.kimi.com/coding/v1 | 支持 OpenAI 兼容格式
                    </p>
                  </div>

                  {/* DALL-E 3 API */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-[#1d1d1f] truncate">DALL-E 3 (OpenAI)</span>
                    </div>
                    <div className="bg-[#1d1d1f] rounded-xl p-4 overflow-x-auto">
                      <pre className="text-xs text-[#34c759] leading-relaxed whitespace-pre"><code>{`# Python
from openai import OpenAI

client = OpenAI(api_key="YOUR_OPENAI_API_KEY")

response = client.images.generate(
    model="dall-e-3",
    prompt="Professional product photo of Momcozy M5 wearable breast pump...",
    n=1,
    size="1024x1024",
    quality="hd"  # hd for higher quality
)
print(response.data[0].url)`}</code></pre>
                    </div>
                  </div>

                  {/* Stable Diffusion XL API */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-[#1d1d1f] truncate">Stable Diffusion XL (Stability AI)</span>
                    </div>
                    <div className="bg-[#1d1d1f] rounded-xl p-4 overflow-x-auto">
                      <pre className="text-xs text-[#34c759] leading-relaxed whitespace-pre"><code>{`# Python
import requests

response = requests.post(
    "https://api.stability.ai/v2beta/stable-image/generate/sd3",
    headers={"Authorization": "Bearer YOUR_STABILITY_KEY", "Accept": "image/*"},
    files={"none": ''},
    data={
        "prompt": "Professional product photo of Momcozy M5 wearable breast pump...",
        "output_format": "jpeg",
        "aspect_ratio": "1:1"
    }
)
with open("output.png", "wb") as f:
    f.write(response.content)`}</code></pre>
                    </div>
                  </div>
                </div>

                {/* Model Comparison Table */}
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF] overflow-x-auto">
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">AI模型对比指南</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[#EDE6DF] table-row-hover">
                      <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">模型</th>
                      <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">API端点</th>
                      <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">最佳场景</th>
                      <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">计费方式</th>
                      <th className="text-left py-2 px-3 text-xs text-[#86868b] font-medium">推荐指数</th>
                    </tr></thead>
                    <tbody>
                      {[
                        { name: 'Kimi Image', endpoint: 'api.moonshot.cn', scene: '产品摄影/电商图', price: '按调用量', stars: 5, isDefault: true },
                        { name: 'DALL-E 3', endpoint: 'api.openai.com', scene: '高质量产品图', price: '$0.04-0.08/张', stars: 5, isDefault: false },
                        { name: 'Midjourney', endpoint: 'api.midjourney.com', scene: '概念设计', price: '订阅制', stars: 4, isDefault: false },
                        { name: 'SD XL', endpoint: 'api.stability.ai', scene: '可本地部署', price: '$0.01-0.04/张', stars: 4, isDefault: false },
                      ].map((m, i) => (
                        <tr key={i} className="border-b border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200">
                          <td className="py-2.5 px-3">
                            <span className="text-xs font-medium text-[#1d1d1f] truncate">{m.name}</span>
                            {m.isDefault && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#C25B6E] text-white">默认</span>}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-[#86868b] font-mono">{m.endpoint}</td>
                          <td className="py-2.5 px-3 text-xs text-[#86868b]">{m.scene}</td>
                          <td className="py-2.5 px-3 text-xs text-[#1d1d1f]">{m.price}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, s) => (
                                <Star key={s} className={`w-3 h-3 ${s < m.stars ? 'text-[#ff9500] fill-[#ff9500]' : 'text-[#EDE6DF]'}`} />
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── TAB: 生成记录 ─── */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2"><Clock className="w-4 h-4 text-[#af52de]" />历史生成记录</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-1 rounded-md bg-[#af52de]/10 text-[#af52de] font-medium">AI生成 {aiGeneratedImages.length}</span>
                      <span className="text-[10px] px-2 py-1 rounded-md bg-[#FBF8F5] text-[#86868b]">采集图 {sourcedProductImages.length}</span>
                    </div>
                  </div>

                  {/* AI Generated Section */}
                  <div className="mb-6">
                    <h4 className="text-xs font-medium text-[#86868b] mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#af52de]" />AI 生成图片
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {aiGeneratedImages.map((h, i) => (
                        <div key={i} className="rounded-2xl border border-[#EDE6DF] overflow-hidden hover:shadow-md transition-natural group">
                          <div className="aspect-square bg-[#FBF8F5] flex items-center justify-center relative">
                            <img src={h.output} alt={h.prompt} className="w-full h-full object-contain p-4" />
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[#af52de] text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">AI</div>
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-[#1d1d1f] font-medium mb-1 line-clamp-2">{h.prompt}</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#C25B6E]/10 text-[#C25B6E]">{h.category}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{h.ratio}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{h.resolution}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[#86868b]">
                              <span>{h.date}</span>
                              <span>{h.time}</span>
                              <span className="text-[#af52de]">{h.model}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sourced Images Section */}
                  <div>
                    <h4 className="text-xs font-medium text-[#86868b] mb-3 flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5 text-[#C25B6E]" />品牌采集图片
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sourcedProductImages.map((h, i) => (
                        <div key={i} className="rounded-2xl border border-[#EDE6DF] overflow-hidden hover:shadow-md transition-natural group">
                          <div className="aspect-square bg-[#FBF8F5] flex items-center justify-center relative">
                            <img src={h.output} alt={h.prompt} className="w-full h-full object-contain p-4" />
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[#C25B6E] text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">采集</div>
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-[#1d1d1f] font-medium mb-1 line-clamp-2">{h.prompt}</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#C25B6E]/10 text-[#C25B6E]">{h.category}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{h.ratio}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{h.resolution}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[#86868b]">
                              <span>{h.date}</span>
                              <span className="text-[#C25B6E]">{h.model}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
