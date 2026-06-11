import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, ScatterChart, Scatter, ZAxis, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { Users, Target, MapPin, Globe, Star, Zap, Palette, MessageCircle, Store, Heart, TrendingUp, Lightbulb, AlertTriangle, ThumbsUp, ChevronRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

// ═══════════════════════════════════════════════════════════════════
// Momcozy 看用户 · 全面重构
// 导航修复：侧边栏↔横向导航联动 · 6类完整画像 · 全球画像深度分析
// 来源混合 QuestMobile、海外调研和CRM示例，展示层必须拆分口径。
// ═══════════════════════════════════════════════════════════════════

// ── 社交声量数据 ──
const industryMentionData = [
  { month: '2024-03', value: 23.23 }, { month: '2024-04', value: 22.67 }, { month: '2024-05', value: 24.56 },
  { month: '2024-06', value: 21.76 }, { month: '2024-07', value: 23.70 }, { month: '2024-08', value: 26.39 },
  { month: '2024-09', value: 21.95 }, { month: '2024-10', value: 28.43 }, { month: '2024-11', value: 23.95 },
  { month: '2024-12', value: 25.00 }, { month: '2025-01', value: 24.86 }, { month: '2025-02', value: 21.10 },
  { month: '2025-03', value: 22.17 }, { month: '2025-04', value: 22.10 }, { month: '2025-05', value: 23.12 },
];

const sentimentCountryData = [
  { country: '阿联酋', positive: 72, negative: 28 }, { country: '日本', positive: 68, negative: 32 },
  { country: '巴基斯坦', positive: 65, negative: 35 }, { country: '印尼', positive: 62, negative: 38 },
  { country: '葡萄牙', positive: 60, negative: 40 }, { country: '越南', positive: 58, negative: 42 },
  { country: '塞尔维亚', positive: 55, negative: 45 }, { country: '德国', positive: 52, negative: 48 },
  { country: '美国', positive: 50, negative: 50 }, { country: '加拿大', positive: 48, negative: 52 },
];

const hotTopics = [
  { text: '对于母婴室设施不足的不满', size: 28 }, { text: '奶粉安全质量问题引发担忧', size: 24 },
  { text: '对于假冒伪劣母婴产品的担忧', size: 22 }, { text: '某些品牌吸奶器吸力不够', size: 20 },
  { text: '对于产后恢复困难的烦恼', size: 18 }, { text: '哺乳期营养不足的焦虑', size: 16 },
  { text: '对于婴儿安全的担忧', size: 14 }, { text: '过度依赖吸奶器', size: 14 },
  { text: '担心产品材质安全问题', size: 12 }, { text: '对于母乳喂养替代方案的讨论', size: 12 },
  { text: '对于婴幼儿产品安全的担忧', size: 10 },
];

const mentionTrendData = [
  { month: '2024-03', Momcozy: 2.1, Medela: 3.5, Spectra: 1.8, Willow: 1.2, 'Philips Avent': 0.8, Elvie: 0.5, Lansinoh: 0.6 },
  { month: '2024-06', Momcozy: 2.4, Medela: 3.2, Spectra: 1.7, Willow: 1.3, 'Philips Avent': 0.9, Elvie: 0.6, Lansinoh: 0.5 },
  { month: '2024-09', Momcozy: 3.1, Medela: 3.0, Spectra: 1.6, Willow: 1.4, 'Philips Avent': 0.9, Elvie: 0.7, Lansinoh: 0.5 },
  { month: '2024-12', Momcozy: 3.8, Medela: 2.9, Spectra: 1.7, Willow: 1.5, 'Philips Avent': 0.8, Elvie: 0.8, Lansinoh: 0.5 },
  { month: '2025-03', Momcozy: 4.5, Medela: 2.8, Spectra: 1.6, Willow: 1.6, 'Philips Avent': 0.8, Elvie: 0.9, Lansinoh: 0.4 },
  { month: '2025-05', Momcozy: 5.2, Medela: 2.7, Spectra: 1.5, Willow: 1.7, 'Philips Avent': 0.7, Elvie: 1.0, Lansinoh: 0.4 },
];

const discussTrendData = [
  { month: '2024-03', Momcozy: 3.5, Medela: 5.2, Spectra: 2.8, Willow: 2.1, 'Philips Avent': 1.2, Elvie: 0.8 },
  { month: '2024-06', Momcozy: 4.2, Medela: 4.8, Spectra: 2.7, Willow: 2.3, 'Philips Avent': 1.3, Elvie: 1.0 },
  { month: '2024-09', Momcozy: 6.8, Medela: 4.5, Spectra: 2.5, Willow: 2.6, 'Philips Avent': 1.2, Elvie: 1.2 },
  { month: '2024-12', Momcozy: 8.5, Medela: 4.2, Spectra: 2.6, Willow: 2.9, 'Philips Avent': 1.1, Elvie: 1.5 },
  { month: '2025-03', Momcozy: 12.4, Medela: 3.8, Spectra: 2.4, Willow: 3.2, 'Philips Avent': 1.0, Elvie: 1.8 },
  { month: '2025-05', Momcozy: 13.2, Medela: 3.5, Spectra: 2.3, Willow: 3.5, 'Philips Avent': 0.9, Elvie: 2.0 },
];

const regionRankData = [
  { rank: 1, country: '美国', count: 8920, rate: '38%' }, { rank: 2, country: '英国', count: 4520, rate: '19%' },
  { rank: 3, country: '加拿大', count: 2150, rate: '9%' }, { rank: 4, country: '德国', count: 1870, rate: '8%' },
  { rank: 5, country: '澳大利亚', count: 1230, rate: '5%' }, { rank: 6, country: '法国', count: 980, rate: '4%' },
  { rank: 7, country: '日本', count: 760, rate: '3%' }, { rank: 8, country: '中国', count: 650, rate: '3%' },
];


// ── 六类完整用户画像 ──
// R16: 画像添加优先级和行动建议
const personaTable = [
  { category: '孕期妈妈', desc: '关注胎儿发育，积极准备待产包的准妈妈', traits: '25-35岁为主，关注育儿知识，活跃于妈妈社群', needs: '安全性、品牌口碑、购买便利性', size: '18%', growth: '+22%', color: '#af52de', priority: 3, strategy: '内容营销+社群种草，孕期礼包捆绑' },
  { category: '新手妈妈', desc: '看重产品易用性和便捷性，每天多次使用吸奶器', traits: '28-38岁，刚进入哺乳期，需要快速上手', needs: '易清洁、吸力舒适、便携性、静音设计', size: '35%', growth: '+18%', color: '#C25B6E', priority: 1, strategy: '核心目标用户，M5主力推广，新手教程+7天无忧退' },
  { category: '背奶妈妈', desc: '职场哺乳期妈妈，需要在工作场所高效吸奶', traits: '30-40岁职场女性，追求效率与隐私', needs: '便携静音、高效吸奶、易于清洁和消毒', size: '25%', growth: '+28%', color: '#34c759', priority: 2, strategy: 'M9主打场景，LinkedIn+职场妈妈KOL，企业团购' },
  { category: '二胎妈妈', desc: '有育儿经验，更注重产品性价比和耐用性', traits: '32-42岁，育儿经验丰富，消费更理性', needs: '高性价比、耐用性、多功能性', size: '15%', growth: '+15%', color: '#ff9500', priority: 4, strategy: '套装优惠+会员复购，老客推荐奖励计划' },
  { category: '品质追求者', desc: '对产品品质要求高，愿意为更好的体验付费', traits: '收入较高，注重品牌和设计感', needs: '高品质材料、智能功能、时尚设计', size: '4%', growth: '+35%', color: '#5856d6', priority: 5, strategy: '限量款+联名设计，Neiman Marcus等高端渠道' },
  { category: '科技爱好者', desc: '对智能科技感兴趣，喜欢用APP追踪数据', traits: '30-35岁，科技行业从业或高学历背景', needs: 'APP数据分析、智能控制、创新功能', size: '3%', growth: '+45%', color: '#ff3b30', priority: 6, strategy: '科技媒体测评+CES展会，APP功能优先体验' },
];

const detailedPersonas = [
  {
    name: 'Sarah', img: '/images/personas/persona-pregnant.jpg', age: 32, ethnicity: '白人', job: '市场营销经理', hobbies: '瑜伽、阅读、烘焙',
    babyStatus: '怀孕28周，正在准备待产包', currentProduct: '已购买M5吸奶器、哺乳文胸、防溢乳垫套装',
    usageFreq: '每天研究育儿知识2-3小时', scene: '家中准备、线上社群交流', flavor: '关注有机材质、BPA-free安全认证',
    positioning: '为宝宝选择最安全舒适的产品', needs: '安全认证、品牌口碑、使用教程', pain: '产品选择太多，不知如何挑选',
    purchaseChannel: 'Momcozy官网、Amazon、母婴店', purchaseFocus: '安全认证、品牌口碑、套装优惠', infoSource: '小红书、妈妈群、医生推荐',
    family: '洛杉矶公寓，和丈夫居住，预产期3个月后', lifeFocus: '顺利生产、宝宝健康', attention: '育儿知识、母婴产品测评',
    tags: ['孕期妈妈']
  },
  {
    name: 'Rebecca', img: '/images/personas/persona-newmom.jpg', age: 30, ethnicity: '亚裔', job: '软件工程师', hobbies: '健身、咖啡、Instagram',
    babyStatus: '宝宝3个月，纯母乳喂养', currentProduct: 'M5吸奶器（每天使用4-5次）',
    usageFreq: '每天吸奶4-5次，每次20分钟', scene: '家中哺乳、工作间隙吸奶', flavor: '偏爱静音模式，三档 suction 调节',
    positioning: '高效背奶，平衡工作与哺乳', needs: '静音设计、便携性、APP数据追踪', pain: '办公室吸奶环境不够私密',
    purchaseChannel: 'Momcozy官网、Amazon Prime', purchaseFocus: '套装性价比、用户评价、智能功能', infoSource: 'Amazon评论、母婴论坛',
    family: '旧金山市区公寓，和丈夫、3个月宝宝', lifeFocus: '顺利重返职场、宝宝健康成长', attention: '育儿技巧、产品测评',
    tags: ['新手妈妈']
  },
  {
    name: 'Michelle', img: '/images/personas/persona-working.jpg', age: 35, ethnicity: '白人', job: '律师事务所合伙人', hobbies: '跑步、商务社交、旅行',
    babyStatus: '宝宝6个月，混合喂养', currentProduct: 'M9吸奶器（办公室）+ M5（通勤）',
    usageFreq: '工作日每天吸奶3次', scene: '办公室哺乳室、法庭休庭间隙、出差途中', flavor: '追求效率最大化，最短吸奶时间',
    positioning: '职场表现与母乳喂养兼得', needs: '极致静音、高效吸力、便携', pain: '出差时很难找到合适的吸奶场所',
    purchaseChannel: '品牌官网、商务信用卡', purchaseFocus: '效率、品质、品牌调性', infoSource: '同事推荐、高端母婴论坛',
    family: '曼哈顿公寓，丈夫和宝宝', lifeFocus: '事业晋升同时不错过宝宝成长', attention: '职场妈妈经验分享',
    tags: ['背奶妈妈']
  },
  {
    name: 'Linda', img: '/images/personas/persona-secondchild.jpg', age: 38, ethnicity: '白人', job: '全职妈妈（二胎）', hobbies: '摄影、亲子活动、烘焙',
    babyStatus: '老大4岁，老二8个月', currentProduct: 'M9吸奶器+KleanPal洗消机',
    usageFreq: '每天使用多次', scene: '家庭哺乳、外出旅行', flavor: '追求高品质，喜欢一站式解决方案',
    positioning: '高效育儿，追求品质生活', needs: '耐用性、多功能性、套装优惠', pain: '两个宝宝需求不同，产品管理复杂',
    purchaseChannel: 'Momcozy官网会员购', purchaseFocus: '套装性价比、品牌忠诚度', infoSource: '妈妈群、品牌邮件',
    family: '郊区独栋，丈夫和两个孩子', lifeFocus: '两个孩子健康成长', attention: '育儿经验分享',
    tags: ['二胎妈妈']
  },
  {
    name: 'Victoria', img: '/images/personas/persona-quality.jpg', age: 34, ethnicity: '法裔', job: '奢侈品买手', hobbies: '时尚、艺术展览、 fine dining',
    babyStatus: '宝宝5个月', currentProduct: 'Elvie Pump+Momcozy哺乳文胸',
    usageFreq: '每天2-3次', scene: '家中、高端母婴室', flavor: '只选最好的，设计感与功能并重',
    positioning: '母婴产品也要体现品味和格调', needs: '设计感、品牌溢价、独特性', pain: '高端母婴产品选择有限，设计平庸',
    purchaseChannel: '品牌官网、Neiman Marcus', purchaseFocus: '设计感、材质、品牌故事', infoSource: '时尚杂志、KOL推荐',
    family: '巴黎16区公寓，丈夫和宝宝', lifeFocus: '做精致的法式妈妈', attention: '母婴时尚、设计趋势',
    tags: ['品质追求者']
  },
  {
    name: 'Rachel', img: '/images/personas/persona-tech.jpg', age: 31, ethnicity: '混血', job: '产品经理', hobbies: '科技产品、数据分析、健身',
    babyStatus: '宝宝2个月，混合喂养', currentProduct: 'M5吸奶器+哺乳文胸+BM08监视器',
    usageFreq: '每天使用APP追踪吸奶数据', scene: '职场背奶、家中哺乳', flavor: '喜欢智能功能、数据分析',
    positioning: '用数据驱动育儿决策', needs: '智能追踪、科技感、品牌调性', pain: '市面上智能母婴产品选择有限',
    purchaseChannel: '品牌官网、科技产品测评网站', purchaseFocus: '智能功能、设计感、APP体验', infoSource: '科技测评、产品对比网站',
    family: '和丈夫、宝宝同住', lifeFocus: '事业育儿双丰收', attention: '母婴科技、育儿数据',
    tags: ['科技爱好者']
  },
];

const incomeData = [
  { range: '少于£20,000', all: 18, 吸奶器: 21, 哺乳文胸: 8, 护理配件: 26, 其他: 11 },
  { range: '£20,000 - £29,999', all: 16, 吸奶器: 22, 哺乳文胸: 13, 护理配件: 19, 其他: 10 },
  { range: '£30,000 - £39,999', all: 17, 吸奶器: 21, 哺乳文胸: 8, 护理配件: 16, 其他: 20 },
  { range: '£40,000 - £49,999', all: 8, 吸奶器: 6, 哺乳文胸: 11, 护理配件: 13, 其他: 6 },
  { range: '£50,000 - £69,999', all: 11, 吸奶器: 10, 哺乳文胸: 15, 护理配件: 8, 其他: 21 },
  { range: '£70,000 - £99,999', all: 8, 吸奶器: 5, 哺乳文胸: 8, 护理配件: 8, 其他: 10 },
  { range: '£100,000 或以上', all: 16, 吸奶器: 10, 哺乳文胸: 11, 护理配件: 35, 其他: 21 },
];

// ── 全球画像深度数据 ──
const clusterData = [
  { x: 1, y: 2, z: 200, name: '1', label: '潮流新手妈妈', age: '~21', desc: '情绪驱动/审美体验' },
  { x: 2, y: 4, z: 300, name: '2', label: '户外探索妈妈', age: '~28', desc: '审美体验' },
  { x: 3, y: 3, z: 400, name: '3', label: '品质生活妈妈', age: '~32', desc: '审美体验' },
  { x: 2, y: 2, z: 350, name: '4', label: '科技育儿妈妈', age: '~30', desc: '效率实用' },
  { x: 3, y: 1, z: 250, name: '5', label: '价值驱动妈妈', age: '~35', desc: '综合考量' },
  { x: 3, y: 4, z: 280, name: '6', label: '全职育儿妈妈', age: '~38', desc: '效率实用' },
  { x: 4, y: 5, z: 220, name: '7', label: '理性中产妈妈', age: '~48', desc: '效率实用/理智保守' },
  { x: 4, y: 2, z: 500, name: '8', label: '跨国精英妈妈', age: '~42', desc: '综合考量/效率实用' },
];

const userGroupList = [
  { rank: 1, name: '潮流新手妈妈', age: '~21', trait: '情绪驱动/审美体验', level: '中低阶层', pct: '18%' },
  { rank: 2, name: '户外探索妈妈', age: '~28', trait: '审美体验', level: '中低至中产', pct: '15%' },
  { rank: 3, name: '品质生活妈妈', age: '~32', trait: '审美体验', level: '中高阶层', pct: '14%' },
  { rank: 4, name: '科技育儿妈妈', age: '~30', trait: '效率实用', level: '中产至中高', pct: '22%' },
  { rank: 5, name: '价值驱动妈妈', age: '~35', trait: '综合考量', level: '中产阶层', pct: '16%' },
  { rank: 6, name: '全职育儿妈妈', age: '~38', trait: '效率实用', level: '中产阶层', pct: '10%' },
  { rank: 7, name: '理性中产妈妈', age: '~48', trait: '效率实用/理智保守', level: '中产', pct: '3%' },
  { rank: 8, name: '跨国精英妈妈', age: '~42', trait: '综合考量/效率实用', level: '精英阶层', pct: '2%' },
];

// 八大人群雷达对比
const eightPersonasRadar = [
  { subject: '消费能力', 潮流新手: 45, 户外探索: 60, 品质生活: 85, 科技育儿: 80, 价值驱动: 65, 全职育儿: 70, 理性中产: 75, 跨国精英: 95 },
  { subject: '科技接受度', 潮流新手: 75, 户外探索: 55, 品质生活: 70, 科技育儿: 95, 价值驱动: 60, 全职育儿: 50, 理性中产: 40, 跨国精英: 80 },
  { subject: '品牌忠诚度', 潮流新手: 30, 户外探索: 50, 品质生活: 75, 科技育儿: 65, 价值驱动: 80, 全职育儿: 85, 理性中产: 70, 跨国精英: 60 },
  { subject: '社交影响力', 潮流新手: 90, 户外探索: 70, 品质生活: 75, 科技育儿: 65, 价值驱动: 50, 全职育儿: 80, 理性中产: 35, 跨国精英: 55 },
  { subject: '价格敏感度', 潮流新手: 85, 户外探索: 70, 品质生活: 30, 科技育儿: 50, 价值驱动: 90, 全职育儿: 65, 理性中产: 75, 跨国精英: 20 },
  { subject: '品质要求', 潮流新手: 55, 户外探索: 70, 品质生活: 95, 科技育儿: 80, 价值驱动: 75, 全职育儿: 80, 理性中产: 85, 跨国精英: 90 },
];

// R19: 区域画像对比 — 添加差异化策略
const regionPersonas = [
  { region: '北美', primary: '科技育儿妈妈(28%)', secondary: '品质生活妈妈(22%)', avgAge: 31, avgIncome: '$78K', keyFeature: 'APP智能控制', momcozyShare: '38%', strategy: 'DTC官网+Amazon+Target三线并进，TikTok Shop即将开通', priority: 'P0' },
  { region: '欧洲', primary: '品质生活妈妈(30%)', secondary: '价值驱动妈妈(24%)', avgAge: 33, avgIncome: '€52K', keyFeature: '静音设计', momcozyShare: '19%', strategy: 'MDR合规先行，Boots/MediaWorld渠道准入，德国为中心', priority: 'P1' },
  { region: '亚太', primary: '潮流新手妈妈(35%)', secondary: '科技育儿妈妈(20%)', avgAge: 28, avgIncome: '$32K', keyFeature: '性价比', momcozyShare: '12%', strategy: 'Shopee/Lazada/TikTok Shop社交电商，日本PSC认证', priority: 'P1' },
  { region: '中东', primary: '跨国精英妈妈(40%)', secondary: '品质生活妈妈(30%)', avgAge: 34, avgIncome: '$85K', keyFeature: '高端材质', momcozyShare: '8%', strategy: '线下高端零售+DTC，UAE/沙特双中心', priority: 'P2' },
];

// R18: RFM模型数据 — 添加预期LTV和流失风险
const rfmData = [
  { segment: '重要价值客户', count: '125K', pct: '25%', recency: '7天', frequency: '4.2次', monetary: '$486', ltv: '$2,043', churnRisk: '低', action: 'VIP专属服务·新品优先体验' },
  { segment: '重要发展客户', count: '86K', pct: '17%', recency: '14天', frequency: '2.1次', monetary: '$298', ltv: '$626', churnRisk: '中', action: '交叉销售·套装推荐' },
  { segment: '重要保持客户', count: '62K', pct: '12%', recency: '45天', frequency: '3.8次', monetary: '$412', ltv: '$1,566', churnRisk: '高', action: '召回活动·限时优惠' },
  { segment: '重要挽留客户', count: '38K', pct: '8%', recency: '90天', frequency: '1.5次', monetary: '$156', ltv: '$234', churnRisk: '高危', action: '大额折扣·个性化关怀' },
  { segment: '一般价值客户', count: '95K', pct: '19%', recency: '10天', frequency: '1.8次', monetary: '$186', ltv: '$335', churnRisk: '低', action: '频次提升·复购激励' },
  { segment: '一般发展客户', count: '52K', pct: '10%', recency: '21天', frequency: '1.2次', monetary: '$128', ltv: '$154', churnRisk: '中', action: '教育内容·使用指导' },
  { segment: '新客户', count: '42K', pct: '9%', recency: '3天', frequency: '1.0次', monetary: '$159', ltv: '$477', churnRisk: '中', action: '欢迎序列·二次购买引导' },
];

// ── 侧边栏配置 ──
const sidebarItems = [
  { label: '社交声量', children: [{ label: '母婴舆情', path: '/users' }, { label: '海外舆情', path: '/users/overseas' }] },
  { label: '用户研究', children: [{ label: '消费者访谈', path: '/users/consumer' }, { label: '渠道访谈', path: '/users/channel' }, { label: '店铺访谈', path: '/users/store' }] },
  { label: '区域用户画像', path: '/users/regional' },
  { label: '全球用户画像', children: [{ label: '用户画像', path: '/users/global' }, { label: '美学风格', path: '/users/aesthetics' }] },
];

// 横向导航配置（根据侧边栏父级联动）
const sectionNavMap: Record<string, string[]> = {
  '社交声量': ['母婴舆情', '海外舆情'],
  '用户研究': ['消费者访谈', '渠道访谈', '店铺访谈'],
  '区域用户画像': [],
  '全球用户画像': ['用户画像', '美学风格'],
};

export default function UsersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // 根据URL路径初始化导航状态
  const getInitialState = () => {
    const path = location.pathname;
    if (path === '/users/regional') return { parent: '区域用户画像', child: '' };
    if (path === '/users/global') return { parent: '全球用户画像', child: '用户画像' };
    if (path === '/users/aesthetics') return { parent: '全球用户画像', child: '美学风格' };
    if (path === '/users/overseas') return { parent: '社交声量', child: '海外舆情' };
    if (path === '/users/consumer') return { parent: '用户研究', child: '消费者访谈' };
    if (path === '/users/channel') return { parent: '用户研究', child: '渠道访谈' };
    if (path === '/users/store') return { parent: '用户研究', child: '店铺访谈' };
    return { parent: '社交声量', child: '母婴舆情' };
  };

  const init = getInitialState();
  const [activeParent, setActiveParent] = useState(init.parent);
  const [activeChild, setActiveChild] = useState(init.child);

  // 处理侧边栏点击：更新父级，自动选择第一个子项
  const handleParentChange = (parent: string) => {
    setActiveParent(parent);
    const children = sectionNavMap[parent] || [];
    if (children.length > 0) {
      setActiveChild(children[0]);
    }
  };

  const currentChildren = sectionNavMap[activeParent] || [];

  // ═══════════════════════════════════════════════════════════════
  // 社交声量面板
  // ═══════════════════════════════════════════════════════════════
  const renderSocialBoard = () => (
    <div className="space-y-6">
      {activeChild === '母婴舆情' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#1d1d1f]">母婴行业提及量(万)</h3>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-[#86868b]">2024.3~2025.5总提及量: <span className="text-[#C25B6E] font-semibold">354.98</span></span>
                <span className="text-[#34c759]">同比 ↑82.6%</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={industryMentionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} domain={[20, 30]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="value" stroke="#34c759" strokeWidth={2} dot={{ r: 3, fill: '#34c759' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">母婴行业关注热点</h3>
              {/* R20: 情感趋势结论 */}
              <div className="mb-4 p-3 rounded-xl bg-[#C25B6E]/5 border border-[#C25B6E]/10">
                <p className="text-[10px] text-[#C25B6E] font-semibold mb-1">情感洞察</p>
                <p className="text-[11px] text-[#1d1d1f]">母婴室设施不足(28%)和奶粉安全(24%)是Top2负面话题。Momcozy产品相关提及中，"吸力不够"(12%)和"材质安全担忧"(8%)需重点关注。建议：产品页强化BPA-free认证展示，增加吸力测评视频内容。</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center items-center min-h-[200px]">
                {hotTopics.map((topic, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl font-medium transition-all hover:scale-105 cursor-pointer" style={{ fontSize: `${Math.max(10, topic.size / 2.5)}px`, color: ['#C25B6E', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5856d6'][i % 6], backgroundColor: `${['#C25B6E', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5856d6'][i % 6]}10` }}>
                    {topic.text}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">社会对于母婴产品的正负面情绪 (%)</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sentimentCountryData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-[#86868b] w-20 truncate">{item.country}</span>
                    <div className="flex-1 min-w-0 h-4 bg-[#FBF8F5] rounded-sm overflow-hidden flex">
                      <div className="h-full bg-[#34c759]" style={{ width: `${item.positive}%` }} />
                      <div className="h-full bg-[#ff3b30]" style={{ width: `${item.negative}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#34c759]" /><span className="text-xs text-[#86868b]">Positive</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#ff3b30]" /><span className="text-xs text-[#86868b]">Negative</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeChild === '海外舆情' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#1d1d1f]">母婴品牌提及量对比分析(万)</h3>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-[#86868b]">2024.3~2025.5总提及量: <span className="text-[#C25B6E] font-semibold">48.2</span></span>
                <span className="text-[#34c759]">同比 ↑72.5%</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mentionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="Momcozy" stroke="#C25B6E" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Medela" stroke="#86868b" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="Spectra" stroke="#34c759" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="Willow" stroke="#ff9500" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Elvie" stroke="#ff3b30" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">母婴品牌讨论量对比分析(万)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={discussTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="Momcozy" stroke="#C25B6E" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Elvie" stroke="#ff3b30" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Willow" stroke="#ff9500" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Medela" stroke="#86868b" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Momcozy地区提及量排名</h3>
              <div className="space-y-2">
                {regionRankData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-[#86868b] w-6">{item.rank}</span>
                    <span className="text-xs text-[#1d1d1f] flex-1">{item.country}</span>
                    <div className="w-20 h-1.5 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-full" style={{ width: item.rate }} /></div>
                    <span className="text-xs text-[#86868b] w-10 text-right">{item.count}</span>
                    <span className="text-xs text-[#86868b] w-8 text-right">{item.rate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // 用户研究面板 — 消费者/渠道/店铺访谈摘要
  // ═══════════════════════════════════════════════════════════════
  const renderResearchBoard = () => (
    <div className="space-y-6">
      {activeChild === '消费者访谈' && (
        <div className="space-y-5">
          {/* KPI摘要 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '综合NPS', value: '+62', sub: '行业平均+45', icon: <Heart className="w-4 h-4" />, color: '#34c759' },
              { label: '平均评分', value: '4.3', sub: '/ 5.0', icon: <Star className="w-4 h-4" />, color: '#ff9500' },
              { label: '访谈样本', value: '8', sub: '全球妈妈用户', icon: <Users className="w-4 h-4" />, color: '#C25B6E' },
              { label: '覆盖国家', value: '8', sub: '美/英/加/日/德/澳/新/阿', icon: <Globe className="w-4 h-4" />, color: '#5856d6' },
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
          {/* 洞察摘要 */}
          <div className="bg-gradient-to-r from-[#C25B6E]/8 via-[#FBF8F5] to-[#34c759]/8 rounded-2xl p-5 card-shadow-sm border border-[#C25B6E]/10">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[#C25B6E]" /> 关键发现
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { type: 'opportunity', title: '加热功能是差异化杀手锏', desc: 'W1加热款NPS=10，用户报告产量提升20%', impact: 'P0', icon: <Lightbulb className="w-4 h-4" /> },
                { type: 'pain', title: '清洁便利性是复购瓶颈', desc: '满意度雷达显示"清洁便利"得分最低(4.1)', impact: 'P1', icon: <AlertTriangle className="w-4 h-4" /> },
                { type: 'strength', title: '性价比是核心竞争壁垒', desc: 'Momcozy性价比评分4.8，显著领先竞品', impact: '核心', icon: <ThumbsUp className="w-4 h-4" /> },
                { type: 'action', title: 'APP本地化阻碍中东扩张', desc: '阿拉伯语支持缺失影响NPS(仅6分)', impact: 'P1', icon: <TrendingUp className="w-4 h-4" /> },
              ].map((ins, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                    backgroundColor: ins.type === 'strength' ? '#34c75915' : ins.type === 'pain' ? '#ff3b3015' : ins.type === 'opportunity' ? '#C25B6E15' : '#007aff15',
                    color: ins.type === 'strength' ? '#34c759' : ins.type === 'pain' ? '#ff3b30' : ins.type === 'opportunity' ? '#C25B6E' : '#007aff'
                  }}>{ins.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-[#1d1d1f]">{ins.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${ins.impact === 'P0' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : ins.impact === 'P1' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#34c759]/10 text-[#34c759]'}`}>{ins.impact}</span>
                    </div>
                    <p className="text-[10px] text-[#86868b] leading-relaxed">{ins.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* 访谈样本预览 */}
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#C25B6E]" /> 访谈样本预览
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Emily R.', location: 'San Francisco', persona: '背奶妈妈', product: 'M5', nps: 10, quote: 'M5可以藏在文胸里，没人发现。电池轻松支持5次使用。' },
                { name: 'Sophie M.', location: 'London', persona: '新手妈妈', product: 'M9', nps: 9, quote: 'M9的APP指导我完成所有设置。哺乳文胸非常柔软。' },
                { name: 'Claudia W.', location: 'Toronto', persona: '二胎妈妈', product: 'KleanPal+M5', nps: 10, quote: 'KleanPal每天节省我30分钟。M5让我可以一边陪大孩玩一边吸奶。' },
                { name: 'Fatima A.', location: 'Dubai', persona: '孕期妈妈', product: 'M5(gift)', nps: 6, quote: '产品不错但APP中找不到阿拉伯语支持。希望看到更多中东妈妈内容。' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]/60">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#C25B6E] flex items-center justify-center text-white text-sm font-bold">{item.name.charAt(0)}</div>
                    <div>
                      <span className="text-xs font-semibold text-[#1d1d1f]">{item.name}</span>
                      <span className="text-[10px] text-[#86868b] ml-1">{item.location} · {item.persona}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#34c759]/10 text-[#34c759] font-medium ml-auto">NPS {item.nps}</span>
                  </div>
                  <p className="text-[10px] text-[#86868b] leading-relaxed italic">"{item.quote}"</p>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/users/consumer')} className="mt-3 w-full py-2.5 rounded-xl bg-[#C25B6E] text-white text-sm font-medium hover:bg-[#A34759] transition-colors flex items-center justify-center gap-2">
              查看完整消费者访谈 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeChild === '渠道访谈' && (
        <div className="space-y-5">
          {/* KPI摘要 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '平均健康度', value: '82%', sub: '渠道健康评分', icon: <Star className="w-4 h-4" />, color: '#34c759' },
              { label: 'DTC利润率', value: '48%', sub: '全渠道最高', icon: <TrendingUp className="w-4 h-4" />, color: '#ff9500' },
              { label: '覆盖渠道', value: '8', sub: '核心合作伙伴', icon: <Store className="w-4 h-4" />, color: '#C25B6E' },
              { label: 'TikTok增速', value: '+85%', sub: '增长最快渠道', icon: <Zap className="w-4 h-4" />, color: '#5856d6' },
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
          {/* 渠道预览 */}
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">核心渠道表现</h3>
            <div className="space-y-2">
              {[
                { channel: 'Amazon US', sales: 42, growth: 18, satisfaction: 4.5, health: 92, strategic: '核心渠道' },
                { channel: 'Momcozy DTC', sales: 23, growth: 32, satisfaction: 4.8, health: 95, strategic: '战略重点' },
                { channel: 'TikTok Shop', sales: 6, growth: 85, satisfaction: 4.3, health: 88, strategic: '增长引擎' },
                { channel: 'Target', sales: 12, growth: 8, satisfaction: 4.2, health: 78, strategic: '线下标杆' },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-[#FBF8F5] transition-colors duration-200">
                  <span className="text-xs text-[#1d1d1f] font-medium w-24">{c.channel}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#86868b] w-14">销售{c.sales}%</span>
                      <div className="flex-1 min-w-0 h-2 bg-[#FBF8F5] rounded-full overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-full" style={{ width: `${c.sales * 2}%` }} /></div>
                    </div>
                  </div>
                  <span className="text-xs font-medium w-12 text-right text-[#34c759]">+{c.growth}%</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.health >= 85 ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{c.health}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/users/channel')} className="mt-3 w-full py-2.5 rounded-xl bg-[#34c759] text-white text-sm font-medium hover:bg-[#2da84a] transition-colors flex items-center justify-center gap-2">
              查看完整渠道访谈 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeChild === '店铺访谈' && (
        <div className="space-y-5">
          {/* KPI摘要 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '平均转化率', value: '16.8%', sub: '体验→购买', icon: <TrendingUp className="w-4 h-4" />, color: '#34c759' },
              { label: '门店NPS', value: '+67', sub: '顾客推荐意愿', icon: <Star className="w-4 h-4" />, color: '#ff9500' },
              { label: '覆盖门店', value: '5', sub: '全球门店', icon: <Store className="w-4 h-4" />, color: '#C25B6E' },
              { label: '最高坪效', value: '$23,510', sub: '/㎡/年(快闪店)', icon: <MapPin className="w-4 h-4" />, color: '#5856d6' },
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
          {/* 门店预览 */}
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">核心门店表现</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Momcozy LA旗舰店', city: 'Los Angeles', type: '品牌旗舰店', area: 280, conversion: 17.2, revenuePerSqm: 16637, satisfaction: 4.8 },
                { name: 'Toronto快闪店', city: 'Toronto', type: '快闪店', area: 60, conversion: 19.8, revenuePerSqm: 23510, satisfaction: 4.7 },
                { name: 'London专卖店', city: 'London', type: '品牌专卖店', area: 150, conversion: 15.6, revenuePerSqm: 14146, satisfaction: 4.6 },
                { name: 'Dubai高端概念店', city: 'Dubai', type: '高端概念店', area: 200, conversion: 16.8, revenuePerSqm: 18620, satisfaction: 4.9 },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#FBF8F5] border border-[#EDE6DF]/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#1d1d1f]">{s.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FBF8F5] text-[#86868b]">{s.type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#86868b]">
                    <span>{s.city}</span>
                    <span>{s.area}㎡</span>
                    <span>转化{s.conversion}%</span>
                    <span className="text-[#C25B6E] font-medium">坪效${s.revenuePerSqm.toLocaleString()}</span>
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-[#ff9500] fill-[#ff9500]" />{s.satisfaction}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/users/store')} className="mt-3 w-full py-2.5 rounded-xl bg-[#ff9500] text-white text-sm font-medium hover:bg-[#e68600] transition-colors flex items-center justify-center gap-2">
              查看完整店铺访谈 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // 区域用户画像面板（完整6类画像）
  // ═══════════════════════════════════════════════════════════════
  const renderRegionalPersona = () => (
    <div className="space-y-6">
      {/* 1. 用户人群画像分类表 */}
      <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
        <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#C25B6E]" /> 1. 用户人群画像分类（6类核心人群）
        </h3>
        <p className="text-[10px] text-[#86868b] mb-3"><span className="text-[#B5AFA8]">数据来源：</span>QuestMobile 2025/Mamava 2025 State of Breastfeeding Survey/艾媒咨询2025</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#EDE6DF] table-row-hover">
              {['优先级', '用户分类', '描述', '人群特征', '核心诉求', '占比', '增速'].map((h, i) => (
                <th key={i} className="text-left py-2.5 px-3 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {personaTable.map((row, i) => (
                <tr key={i} className="border-b border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200">
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.priority <= 2 ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : row.priority <= 3 ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#86868b]/10 text-[#86868b]'}`}>P{row.priority}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="text-xs text-[#1d1d1f] font-medium">{row.category}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-[#86868b]">{row.desc}</td>
                  <td className="py-2.5 px-3 text-xs text-[#86868b]">{row.traits}</td>
                  <td className="py-2.5 px-3 text-xs text-[#86868b]">{row.needs}</td>
                  <td className="py-2.5 px-3"><span className="text-xs font-semibold" style={{ color: row.color }}>{row.size}</span></td>
                  <td className="py-2.5 px-3"><span className="text-xs text-[#34c759] font-medium">{row.growth}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* R17: 目标用户行动建议 */}
      <div className="bg-gradient-to-r from-[#C25B6E]/5 to-[#FBF8F5] rounded-2xl p-5 card-shadow-sm border border-[#C25B6E]/15">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-[#C25B6E]" />
          <h3 className="text-sm font-semibold text-[#C25B6E]">目标用户优先级与行动建议</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {personaTable.filter(p => p.priority <= 3).map((p, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/70 border border-[#EDE6DF]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${i === 0 ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : i === 1 ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#34c759]/10 text-[#34c759]'}`}>P{p.priority}</span>
                <span className="text-xs font-semibold text-[#1d1d1f]">{p.category}</span>
                <span className="text-[10px] text-[#86868b] ml-auto">{p.size}</span>
              </div>
              <p className="text-[10px] text-[#1d1d1f] leading-relaxed">{p.strategy}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 用户画像分类展示（6个完整卡片） */}
      <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
        <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#C25B6E]" /> 2. 用户画像分类展示（6类完整画像）
        </h3>
        <div className="space-y-6">
          {detailedPersonas.map((p, i) => (
            <div key={i} className="border border-[#EDE6DF] rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#FBF8F5] to-white px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: personaTable.find(pt => pt.category === p.tags[0])?.color || '#C25B6E' }} />
                <span className="text-sm font-semibold text-[#1d1d1f]">{p.tags[0]}</span>
                <span className="text-[10px] text-[#86868b] ml-2">{personaTable.find(pt => pt.category === p.tags[0])?.size || ''} · {personaTable.find(pt => pt.category === p.tags[0])?.growth || ''}</span>
              </div>
              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 左侧：基本信息 */}
                <div>
                  <div className="flex items-start gap-4 mb-5">
                    <img src={p.img} alt={p.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#EDE6DF] flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div>
                      <h4 className="text-base font-semibold text-[#1d1d1f]">{p.name}</h4>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {p.tags.map((tag, t) => (<span key={t} className="px-1.5 py-0.5 rounded bg-[#C25B6E]/10 text-[10px] text-[#C25B6E]">{tag}</span>))}
                      </div>
                      <p className="text-[10px] text-[#B5AFA8] mt-1.5">{p.ethnicity} · {p.age}岁 · {p.job}</p>
                    </div>
                  </div>
                  <h5 className="text-xs font-semibold text-[#C25B6E] mb-2">基本信息</h5>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-5">
                    <div><span className="text-[#86868b]">爱好:</span> <span className="text-[#1d1d1f]">{p.hobbies}</span></div>
                    <div className="col-span-2"><span className="text-[#86868b]">生活重点:</span> <span className="text-[#1d1d1f]">{p.lifeFocus}</span></div>
                    <div className="col-span-2"><span className="text-[#86868b]">关注信息:</span> <span className="text-[#1d1d1f]">{p.attention}</span></div>
                  </div>
                  <h5 className="text-xs font-semibold text-[#C25B6E] mb-2">购买习惯</h5>
                  <div className="grid grid-cols-1 gap-y-1.5 text-xs">
                    <div><span className="text-[#86868b]">购买渠道:</span> <span className="text-[#1d1d1f]">{p.purchaseChannel}</span></div>
                    <div><span className="text-[#86868b]">购买关注点:</span> <span className="text-[#1d1d1f]">{p.purchaseFocus}</span></div>
                    <div><span className="text-[#86868b]">信息来源:</span> <span className="text-[#1d1d1f]">{p.infoSource}</span></div>
                  </div>
                </div>
                {/* 右侧：使用习惯 */}
                <div>
                  <h5 className="text-xs font-semibold text-[#C25B6E] mb-2">产品使用习惯</h5>
                  <div className="grid grid-cols-1 gap-y-1.5 text-xs mb-5">
                    <div><span className="text-[#86868b]">育儿状态:</span> <span className="text-[#1d1d1f]">{p.babyStatus}</span></div>
                    <div><span className="text-[#86868b]">当前产品:</span> <span className="text-[#1d1d1f]">{p.currentProduct}</span></div>
                    <div><span className="text-[#86868b]">使用程度:</span> <span className="text-[#1d1d1f]">{p.usageFreq}</span></div>
                    <div><span className="text-[#86868b]">主要场景:</span> <span className="text-[#1d1d1f]">{p.scene}</span></div>
                    <div><span className="text-[#86868b]">偏好:</span> <span className="text-[#1d1d1f]">{p.flavor}</span></div>
                    <div><span className="text-[#86868b]">产品定位:</span> <span className="text-[#1d1d1f]">{p.positioning}</span></div>
                    <div><span className="text-[#86868b]">需求:</span> <span className="text-[#1d1d1f]">{p.needs}</span></div>
                    <div><span className="text-[#86868b]">痛点:</span> <span className="text-[#ff3b30]">{p.pain}</span></div>
                  </div>
                  <h5 className="text-xs font-semibold text-[#C25B6E] mb-2">家庭环境</h5>
                  <div className="text-xs"><span className="text-[#86868b]">居住情况:</span> <span className="text-[#1d1d1f]">{p.family}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 用户分析图表 */}
      <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
        <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">3. 母婴用户分析 - 基本信息</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="text-xs text-[#86868b] mb-3">3.1.1 性别与年龄分布</h4>
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-2xl">♂</span>
                  <div className="flex-1 min-w-0 h-8 bg-[#FBF8F5] rounded-md overflow-hidden"><div className="h-full bg-[#C25B6E] rounded-md flex items-center justify-end pr-2" style={{ width: '31%' }}><span className="text-white text-xs font-bold">31%</span></div></div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">♀</span>
                  <div className="flex-1 min-w-0 h-8 bg-[#FBF8F5] rounded-md overflow-hidden"><div className="h-full bg-[#ff3b30] rounded-md flex items-center justify-end pr-2" style={{ width: '69%' }}><span className="text-white text-xs font-bold">69%</span></div></div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[#86868b] mb-2">QuestMobile 2025：有孩家庭人群月活3.62亿，90后父母占比超45%</p>
            <h4 className="text-xs text-[#86868b] mb-2">年龄分布</h4>
            <div className="space-y-2">
              {[{ label: '18-24岁(Z世代)', value: 15, color: '#af52de' }, { label: '25-34岁(千禧一代)', value: 43, color: '#C25B6E' }, { label: '35-44岁(X世代)', value: 28, color: '#34c759' }, { label: '45+岁', value: 14, color: '#86868b' }].map((age, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[#86868b] w-28">{age.label}</span>
                  <div className="flex-1 min-w-0 h-4 bg-[#FBF8F5] rounded-md overflow-hidden"><div className="h-full rounded-md" style={{ width: `${age.value}%`, backgroundColor: age.color }} /></div>
                  <span className="text-xs text-[#1d1d1f] font-medium w-8">{age.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs text-[#86868b] mb-3">3.1.2 收入分布</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} unit="%" />
                  <YAxis type="category" dataKey="range" tick={{ fontSize: 9, fill: '#86868b' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                  <Bar dataKey="all" fill="#34c759" radius={[0, 4, 4, 0]} name="全部" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // 全球用户画像面板（全面重写）
  // ═══════════════════════════════════════════════════════════════
  const renderGlobalPersona = () => (
    <div className="space-y-6">
      {activeChild === '用户画像' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '全球用户规模', value: '3.62亿', sub: '有孩家庭月活(QM 2025)', icon: <Users className="w-5 h-5" />, color: '#C25B6E' },
              { label: 'Z世代占比', value: '28.2%', sub: '新晋育儿力量', icon: <Zap className="w-5 h-5" />, color: '#ff9500' },
              { label: '消费能力', value: '85.5%', sub: '线上千元+消费占比', icon: <Star className="w-5 h-5" />, color: '#34c759' },
              { label: 'Momcozy用户', value: '500万+', sub: '覆盖60个国家', icon: <Globe className="w-5 h-5" />, color: '#5856d6' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>{kpi.icon}</div>
                  <span className="text-xs text-[#86868b]">{kpi.label}</span>
                </div>
                <p className="text-2xl font-semibold" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-[10px] text-[#86868b]">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* 八大人群聚类图 + 人群列表 */}
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">全球八大用户人群聚类分析</h3>
            <p className="text-[10px] text-[#86868b] mb-5">方法论：Ipsos心理图谱V2模型 · 基于价值观×生活方式×收入三维聚类</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE6DF" />
                    <XAxis type="number" dataKey="x" name="世代" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} domain={[0, 6]} ticks={[1, 2, 3, 4, 5]} tickFormatter={(v) => ['', 'Z世代', '千禧一代', 'X世代', '婴儿潮一代', ''][v] || ''} />
                    <YAxis type="number" dataKey="y" name="价值观" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} domain={[0, 6]} ticks={[1, 2, 3, 4, 5]} tickFormatter={(v) => ['', '情绪驱动', '审美体验', '效率实用', '综合考量', '理智保守'][v] || ''} />
                    <ZAxis type="number" dataKey="z" range={[100, 800]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                      if (!payload || !payload[0]) return null;
                      const d = payload[0].payload;
                      return (<div className="bg-white rounded-xl p-3 shadow-lg border border-[#EDE6DF] text-xs"><p className="font-semibold text-[#1d1d1f]">{d.label}</p><p className="text-[#86868b]">年龄{d.age} · {d.desc} · 规模{d.z}万人</p></div>);
                    }} />
                    <Scatter data={clusterData} fill="#C25B6E">
                      {clusterData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={['#C25B6E', '#34c759', '#ff9500', '#af52de', '#5856d6', '#ff3b30', '#34c759', '#C25B6E'][index]} />))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-3">八大人群列表</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {userGroupList.map((group, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-[#FBF8F5] transition-colors duration-200 cursor-pointer">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: ['#C25B6E', '#34c759', '#ff9500', '#af52de', '#5856d6', '#ff3b30', '#34c759', '#C25B6E'][i] }}>{group.rank}</span>
                      <div className="flex-1 min-w-0 min-w-0">
                        <p className="text-xs font-semibold text-[#1d1d1f] truncate">{group.name}</p>
                        <p className="text-[10px] text-[#86868b]">年龄{group.age} · {group.trait}</p>
                      </div>
                      <span className="text-[10px] text-[#C25B6E] font-medium">{group.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 八大人群雷达对比 */}
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">八大人群能力雷达对比</h3>
            <p className="text-[10px] text-[#86868b] mb-5">6维度评估：消费能力/科技接受度/品牌忠诚度/社交影响力/价格敏感度/品质要求</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={eightPersonasRadar}>
                  <PolarGrid stroke="#EDE6DF" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#86868b' }} />
                  <Radar name="科技育儿" dataKey="科技育儿" stroke="#C25B6E" fill="#C25B6E" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="品质生活" dataKey="品质生活" stroke="#ff9500" fill="#ff9500" fillOpacity={0.1} strokeWidth={1.5} />
                  <Radar name="跨国精英" dataKey="跨国精英" stroke="#5856d6" fill="#5856d6" fillOpacity={0.1} strokeWidth={1.5} />
                  <Radar name="潮流新手" dataKey="潮流新手" stroke="#af52de" fill="#af52de" fillOpacity={0.1} strokeWidth={1} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RFM用户分层模型 */}
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">RFM用户价值分层模型</h3>
            <p className="text-[10px] text-[#86868b] mb-5">R(最近购买) × F(购买频次) × M(消费金额) = 7层用户分群 · <span className="text-[#B5AFA8]">数据来源：</span>Momcozy 2026 Q1 CRM</p>
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#EDE6DF] table-row-hover">
                  {['用户层级', '人数', '占比', '最近购买', '平均频次', '客单价', '预期LTV', '流失风险', '营销策略'].map((h, i) => (
                    <th key={i} className="text-left py-2.5 px-3 text-[10px] text-[#86868b] font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rfmData.map((row, i) => (
                    <tr key={i} className="border-b border-[#EDE6DF] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200">
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-medium ${i < 2 ? 'text-[#C25B6E]' : i < 4 ? 'text-[#ff9500]' : 'text-[#86868b]'}`}>{row.segment}</span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#1d1d1f]">{row.count}</td>
                      <td className="py-2.5 px-3 text-xs text-[#1d1d1f]">{row.pct}</td>
                      <td className="py-2.5 px-3 text-xs text-[#34c759]">{row.recency}</td>
                      <td className="py-2.5 px-3 text-xs text-[#86868b]">{row.frequency}</td>
                      <td className="py-2.5 px-3 text-xs text-[#C25B6E] font-medium">{row.monetary}</td>
                      <td className="py-2.5 px-3 text-xs text-[#5856d6] font-medium">{row.ltv}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${row.churnRisk === '低' ? 'bg-[#34c759]/10 text-[#34c759]' : row.churnRisk === '中' ? 'bg-[#ff9500]/10 text-[#ff9500]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>{row.churnRisk}</span>
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-[#86868b]">{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 区域画像对比 */}
          <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-5">四大区域用户画像对比</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {regionPersonas.map((r, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[#FBF8F5] border border-[#EDE6DF]">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-[#C25B6E]" />
                    <span className="text-sm font-semibold text-[#1d1d1f]">{r.region}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-[#86868b]">主力人群</span><span className="text-[#1d1d1f] font-medium">{r.primary}</span></div>
                    <div className="flex justify-between"><span className="text-[#86868b]">次要人群</span><span className="text-[#1d1d1f]">{r.secondary}</span></div>
                    <div className="flex justify-between"><span className="text-[#86868b]">平均年龄</span><span className="text-[#1d1d1f]">{r.avgAge}岁</span></div>
                    <div className="flex justify-between"><span className="text-[#86868b]">平均收入</span><span className="text-[#1d1d1f]">{r.avgIncome}</span></div>
                    <div className="flex justify-between"><span className="text-[#86868b]">核心需求</span><span className="text-[#C25B6E]">{r.keyFeature}</span></div>
                    <div className="flex justify-between"><span className="text-[#86868b]">Momcozy份额</span><span className="text-[#34c759] font-medium">{r.momcozyShare}</span></div>
                    <div className="mt-2 pt-2 border-t border-[#EDE6DF]">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${r.priority === 'P0' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>{r.priority}</span>
                      <p className="text-[10px] text-[#1d1d1f] mt-1 leading-relaxed">{r.strategy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {activeChild === '美学风格' && (
        <div className="bg-white rounded-2xl p-8 card-shadow-sm border border-[#EDE6DF] text-center">
          <Palette className="w-12 h-12 text-[#af52de] mx-auto mb-5" />
          <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">美学风格分析</h3>
          <p className="text-sm text-[#86868b]">全球各区域色彩偏好、设计风格趋势分析</p>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // 渲染主体
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-8">
          {/* 侧边栏 - 传入选中状态和回调 */}
          <Sidebar items={sidebarItems.map(item => ({
            ...item,
            isActive: item.label === activeParent,
          }))} />

          <div className="flex-1 min-w-0 space-y-6">
            {/* 横向导航 - 与侧边栏联动 */}
            <div className="bg-white rounded-2xl p-5 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-1 border-b border-[#EDE6DF] pb-3">
                {Object.keys(sectionNavMap).map((parent) => (
                  <button
                    key={parent}
                    onClick={() => handleParentChange(parent)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeParent === parent ? 'text-[#C25B6E] bg-[#C25B6E]/10' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}
                  >
                    {parent}
                  </button>
                ))}
              </div>

              {/* 子导航 - 根据选中的父级动态显示 */}
              {currentChildren.length > 0 && (
                <div className="flex items-center gap-1 mt-3 flex-wrap">
                  {currentChildren.map((child) => (
                    <button
                      key={child}
                      onClick={() => {
                        setActiveChild(child);
                        // 导航到独立访谈页面
                        if (child === '消费者访谈') navigate('/users/consumer');
                        else if (child === '渠道访谈') navigate('/users/channel');
                        else if (child === '店铺访谈') navigate('/users/store');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeChild === child ? 'bg-[#C25B6E] text-white' : 'text-[#86868b] hover:bg-[#FBF8F5] transition-colors duration-200 duration-200'}`}
                    >
                      {child}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <PageEvidenceNotice
              sourceIds={['ds-011', 'ds-043', 'ds-012']}
              title="用户洞察来源口径"
              description="中国有孩家庭画像、海外母乳喂养调研和 CRM/RFM 示例不是同一数据口径；当前页面只作为分层线索，不能外推为全球哺乳用户事实。"
            />

            {/* 内容区域 */}
            {activeParent === '社交声量' && renderSocialBoard()}
            {activeParent === '用户研究' && renderResearchBoard()}
            {activeParent === '区域用户画像' && renderRegionalPersona()}
            {activeParent === '全球用户画像' && renderGlobalPersona()}
          </div>
        </div>
      </div>
    </div>
  );
}
