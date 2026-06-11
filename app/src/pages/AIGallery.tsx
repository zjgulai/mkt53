import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Sparkles, Download, ZoomIn, X, Wand2, Clock, Tag, CheckCircle, Copy, Check } from 'lucide-react';
import PageEvidenceNotice from '@/components/PageEvidenceNotice';

interface GalleryImage {
  id: string;
  src: string;
  title: string;
  prompt: string;
  category: string;
  model: string;
  date: string;
  time: string;
  resolution: string;
  ratio: string;
}

const galleryImages: GalleryImage[] = [
  // ── 吸奶器 12张 ──
  { id: 'p1', src: '/images/ai-gallery/pump-wearable-pink-01.jpg', title: '穿戴式电动吸奶器 · 柔雾粉', prompt: 'Wearable hands-free electric breast pump in soft blush pink silicone, compact cup-shaped design fitting inside bra, warm cream studio background, soft diffused lighting', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.2s', resolution: '1K', ratio: '1:1' },
  { id: 'p2', src: '/images/ai-gallery/pump-double-white-02.jpg', title: '双边电动吸奶器 · 白金', prompt: 'Portable double electric breast pump in elegant white with rose gold metallic accents, compact rectangular body with digital display, warm beige studio background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.1s', resolution: '1K', ratio: '1:1' },
  { id: 'p3', src: '/images/ai-gallery/pump-manual-mint-03.jpg', title: '手动吸奶器 · 薄荷绿', prompt: 'Manual breast pump in soft mint green and clear BPA-free plastic, ergonomic handle design, silicone flange, warm cream background, soft studio lighting', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.8s', resolution: '1K', ratio: '1:1' },
  { id: 'p4', src: '/images/ai-gallery/pump-hospital-pearl-04.jpg', title: '医用级吸奶器 · 珍珠白', prompt: 'Hospital-grade electric breast pump in pearl white with champagne gold trim, professional dual motor design with carrying handle, warm beige studio background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '15.3s', resolution: '1K', ratio: '1:1' },
  { id: 'p5', src: '/images/ai-gallery/pump-single-rose-05.jpg', title: '单边电动吸奶器 · 玫瑰粉', prompt: 'Compact single electric breast pump in dusty rose pink with white accents, rechargeable battery built-in, soft touch matte finish, warm cream studio background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.5s', resolution: '1K', ratio: '1:1' },
  { id: 'p6', src: '/images/ai-gallery/pump-slim-lavender-06.jpg', title: '超薄穿戴吸奶器 · 薰衣草紫', prompt: 'Ultra-slim wearable breast pump designed to fit discreetly inside nursing bra, translucent milk collection container, soft lavender purple silicone body, warm beige background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.2s', resolution: '1K', ratio: '1:1' },
  { id: 'p7', src: '/images/ai-gallery/pump-set-luxury-07.jpg', title: '豪华吸奶器套装 · 白金', prompt: 'Luxury breast pump set complete with carrying case, milk storage bottles, and charging dock, soft white and rose gold color scheme, organized flat lay arrangement, warm cream background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.8s', resolution: '1K', ratio: '1:1' },
  { id: 'p8', src: '/images/ai-gallery/pump-mini-sand-08.jpg', title: '迷你手持吸奶器 · 沙 beige', prompt: 'Mini handheld breast pump with silicone suction flange in warm sand beige color, pocket-sized portable design, USB-C charging port visible, warm cream studio background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.9s', resolution: '1K', ratio: '1:1' },
  { id: 'p9', src: '/images/ai-gallery/pump-smart-app-09.jpg', title: '智能APP吸奶器 · 纯白', prompt: 'Smart app-controlled breast pump with LCD touch screen, sleek white oval body, quiet motor technology design, showing Bluetooth connectivity indicator, warm cream studio background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.6s', resolution: '1K', ratio: '1:1' },
  { id: 'p10', src: '/images/ai-gallery/pump-collector-peach-10.jpg', title: '硅胶集乳器 · 蜜桃粉', prompt: 'Wearable breast milk collector in soft peach pink silicone, passive milk collection cup design, ultra-soft flexible rim, compact discreet form, warm beige studio background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '9.8s', resolution: '1K', ratio: '1:1' },
  { id: 'p11', src: '/images/ai-gallery/pump-bra-grey-11.jpg', title: '免手扶吸奶文胸 · 灰色', prompt: 'Double-sided pumping bra with built-in hands-free breast pump holders, soft modal fabric in heather grey, adjustable straps, front view showing pump openings, warm cream background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.3s', resolution: '1K', ratio: '1:1' },
  { id: 'p12', src: '/images/ai-gallery/pump-closed-ivory-12.jpg', title: '闭式系统吸奶器 · 象牙白', prompt: 'Premium closed-system electric breast pump in ivory white with subtle gold accents, anti-backflow design, sleek vertical tower shape, warm beige studio background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.5s', resolution: '1K', ratio: '1:1' },

  // ── 哺乳文胸 12张 ──
  { id: 'b1', src: '/images/ai-gallery/bra-lace-pink-01.jpg', title: '蕾丝哺乳文胸 · 柔雾粉', prompt: 'Seamless wireless nursing bra in soft blush pink, clip-down breastfeeding access, wide comfortable band, delicate lace trim detail on cups, displayed on clear mannequin bust, warm cream studio background', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.1s', resolution: '1K', ratio: '1:1' },
  { id: 'b2', src: '/images/ai-gallery/bra-sport-grey-02.jpg', title: '运动哺乳文胸 · 灰色', prompt: 'Supportive sports nursing bra in heather grey moisture-wicking fabric, racerback design with clip-down cups, wide elastic underband, displayed flat lay style, warm beige background', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.8s', resolution: '1K', ratio: '1:1' },
  { id: 'b3', src: '/images/ai-gallery/bra-satin-gold-03.jpg', title: '缎面睡眠文胸 · 香槟金', prompt: 'Satin nursing sleep bra in champagne gold color, soft wireless design, pull-aside nursing access, delicate satin fabric with gentle sheen, displayed on cream surface, warm soft lighting', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.5s', resolution: '1K', ratio: '1:1' },
  { id: 'b4', src: '/images/ai-gallery/bra-cotton-white-04.jpg', title: '棉质前开扣文胸 · 纯白', prompt: 'Cotton nursing bra in pure white with front-opening clasp design, soft breathable organic cotton fabric, adjustable shoulder straps with clips, displayed on clear mannequin, warm cream studio background', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.2s', resolution: '1K', ratio: '1:1' },
  { id: 'b5', src: '/images/ai-gallery/bra-bamboo-nude-05.jpg', title: '竹纤维哺乳文胸 · 裸 beige', prompt: 'Bamboo fiber nursing bra in soft nude beige tone, eco-friendly sustainable material, extra soft to touch, simple elegant design with nursing clips, displayed flat lay, warm cream background', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.0s', resolution: '1K', ratio: '1:1' },
  { id: 'b6', src: '/images/ai-gallery/bra-full-mauve-06.jpg', title: '全罩杯蕾丝文胸 · 紫褐色', prompt: 'Full-coverage nursing bra in dusty mauve purple, padded cups for extra support, beautiful floral lace overlay on upper cups, wide comfortable side panels, displayed on clear mannequin, warm cream studio background', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.8s', resolution: '1K', ratio: '1:1' },
  { id: 'b7', src: '/images/ai-gallery/bra-mesh-mint-07.jpg', title: '透气网眼文胸 · 薄荷绿', prompt: 'Breathable mesh nursing bra in soft mint green, summer-friendly lightweight design, sheer mesh panels for ventilation, clip-down nursing function, displayed flat lay, warm beige background', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.6s', resolution: '1K', ratio: '1:1' },
  { id: 'b8', src: '/images/ai-gallery/bra-brallete-terracotta-08.jpg', title: '交叉式哺乳内衣 · 赤陶橙', prompt: 'Cozy nursing bralette in warm terracotta orange, soft ribbed knit fabric, crossover wrap-style nursing access, no underwire comfortable design, displayed on cream surface, warm natural lighting', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '9.9s', resolution: '1K', ratio: '1:1' },
  { id: 'b9', src: '/images/ai-gallery/bra-plus-black-09.jpg', title: '大码蕾丝文胸 · 优雅黑', prompt: 'Plus-size nursing bra in elegant black with rose gold hardware, full support underwire design, wide padded straps, beautiful scalloped lace edges, displayed on clear mannequin, warm cream studio background', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.1s', resolution: '1K', ratio: '1:1' },
  { id: 'b10', src: '/images/ai-gallery/bra-combo-lilac-10.jpg', title: '吸奶+哺乳二合一文胸 · 淡紫', prompt: 'Seamless pumping and nursing combo bra in soft lilac purple, dual-function design with pump openings and nursing clips, stretchy comfortable fabric, displayed flat lay, warm beige background', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.4s', resolution: '1K', ratio: '1:1' },
  { id: 'b11', src: '/images/ai-gallery/bra-tank-oatmeal-11.jpg', title: '哺乳背心 · 燕麦色', prompt: 'Modal nursing tank top with built-in bra shelf in warm oatmeal color, adjustable spaghetti straps, soft stretchy fabric, clip-down nursing access, displayed on clear mannequin torso, warm cream background', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.3s', resolution: '1K', ratio: '1:1' },
  { id: 'b12', src: '/images/ai-gallery/bra-silk-ivory-12.jpg', title: '真丝哺乳文胸 · 象牙白', prompt: 'Elegant silk nursing bra in soft ivory cream, luxurious silk fabric with subtle sheen, delicate lace trim along cups, gold-tone nursing clips, displayed on cream silk fabric surface, warm soft lighting', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.6s', resolution: '1K', ratio: '1:1' },

  // ── 婴儿背带 12张 ──
  { id: 'c1', src: '/images/ai-gallery/carrier-ergo-sand-01.jpg', title: '人体工学背带 · 沙 beige', prompt: 'Soft structured baby carrier in warm sand beige color, ergonomic M-position seat design, padded shoulder straps and waist belt, premium cotton blend fabric, displayed on invisible mannequin torso, warm cream studio background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.2s', resolution: '1K', ratio: '1:1' },
  { id: 'c2', src: '/images/ai-gallery/carrier-mesh-sage-02.jpg', title: '透气网眼背带 · 鼠尾草绿', prompt: 'Breathable mesh baby carrier in soft sage green, summer-weight 3D mesh fabric for ventilation, newborn to toddler convertible design, aluminum frame structure, warm beige background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.5s', resolution: '1K', ratio: '1:1' },
  { id: 'c3', src: '/images/ai-gallery/carrier-sling-rose-03.jpg', title: '环扣背巾 · 玫瑰粉', prompt: 'Ring sling baby carrier in soft dusty rose pink linen, elegant gathered shoulder design, lightweight natural fabric draped beautifully, wooden ring detail, displayed hanging on cream wall, warm soft lighting', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.8s', resolution: '1K', ratio: '1:1' },
  { id: 'c4', src: '/images/ai-gallery/carrier-hipseat-grey-04.jpg', title: '腰凳背带 · 炭灰', prompt: 'Baby hip seat carrier in soft charcoal grey with padded seat cushion, compact waist-belt-only design for quick carrying, side pocket visible, warm cream studio background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.0s', resolution: '1K', ratio: '1:1' },
  { id: 'c5', src: '/images/ai-gallery/carrier-wrap-cream-05.jpg', title: ' wrap背巾 · 奶油白', prompt: 'Wrap-style baby carrier in soft cream white organic cotton, long woven fabric elegantly wrapped and tied, front-carry position demonstrated on mannequin, warm cream studio background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.5s', resolution: '1K', ratio: '1:1' },
  { id: 'c6', src: '/images/ai-gallery/carrier-4in1-caramel-06.jpg', title: '四合一 convertible背带 · 焦糖棕', prompt: '4-in-1 convertible baby carrier in warm caramel brown, facing-in and facing-out positions possible, adjustable seat width and height, premium cotton canvas material, displayed on stand, warm beige background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.8s', resolution: '1K', ratio: '1:1' },
  { id: 'c7', src: '/images/ai-gallery/carrier-travel-blue-07.jpg', title: '便携折叠背带 · 天空蓝', prompt: 'Lightweight travel baby carrier in soft powder blue, compact foldable design with carrying pouch, minimalist Scandinavian aesthetic, breathable fabric, displayed flat with pouch beside, warm cream background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.7s', resolution: '1K', ratio: '1:1' },
  { id: 'c8', src: '/images/ai-gallery/carrier-newborn-pink-08.jpg', title: '新生儿专用背带 · 柔粉', prompt: 'Newborn-specific baby carrier in soft blush pink, extra head support cushion, soft structured design for infant under 3 months, padded neck roll, displayed on small mannequin torso, warm cream studio background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.9s', resolution: '1K', ratio: '1:1' },
  { id: 'c9', src: '/images/ai-gallery/carrier-toddler-olive-09.jpg', title: '幼儿后背包 · 橄榄绿', prompt: 'Back-carry toddler carrier in olive green canvas, rugged yet refined design for older babies 12 months plus, supportive frame structure with hip belt, displayed on stand, warm cream studio background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.3s', resolution: '1K', ratio: '1:1' },
  { id: 'c10', src: '/images/ai-gallery/carrier-cashmere-dove-10.jpg', title: '羊绒奢华背带 · 鸽灰', prompt: 'Luxury cashmere blend baby carrier in soft dove grey, premium ultra-soft fabric, minimalist Scandinavian design, rose gold metal buckles and adjusters, displayed on premium mannequin, warm beige background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '15.1s', resolution: '1K', ratio: '1:1' },
  { id: 'c11', src: '/images/ai-gallery/carrier-water-navy-11.jpg', title: '速干水上网眼背带 · 海军蓝', prompt: 'Water-friendly mesh baby carrier in navy blue, quick-dry breathable mesh fabric for beach and pool use, lightweight minimal padding, UV-protective hood, displayed flat lay, warm cream background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.4s', resolution: '1K', ratio: '1:1' },
  { id: 'c12', src: '/images/ai-gallery/carrier-denim-blue-12.jpg', title: '牛仔风时尚背带 · 浅蓝', prompt: 'Denim-style baby carrier in light wash blue denim with leather trim details, fashionable urban design, adjustable straps with brass hardware, displayed on mannequin torso, warm beige studio background', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.0s', resolution: '1K', ratio: '1:1' },

  // ── 喂养电器 12张 ──
  { id: 'f1', src: '/images/ai-gallery/feed-foodmaker-white-01.jpg', title: '辅食机蒸搅一体机 · 纯白', prompt: 'Electric baby food maker and steamer blender combo in soft white, 4-in-1 function appliance with glass container, digital touch panel, warm cream studio background, soft diffused lighting', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.8s', resolution: '1K', ratio: '1:1' },
  { id: 'f2', src: '/images/ai-gallery/feed-dispenser-pink-02.jpg', title: '旋转奶粉分装盒 · 柔粉', prompt: 'Portable milk powder dispenser with formula storage compartments in soft pink, rotating compartments for pre-measured portions, BPA-free material, warm beige background, soft natural lighting', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.4s', resolution: '1K', ratio: '1:1' },
  { id: 'f3', src: '/images/ai-gallery/feed-brush-auto-03.jpg', title: '电动奶瓶刷套装 · 白金', prompt: 'Electric baby bottle brush cleaner set in white with rose gold accents, automatic spinning brush with interchangeable heads, charging dock included, warm cream studio background', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.2s', resolution: '1K', ratio: '1:1' },
  { id: 'f4', src: '/images/ai-gallery/feed-storage-set-04.jpg', title: '玻璃辅食保鲜盒套装 · 马卡龙', prompt: 'Baby food storage container set in soft pastel colors, stackable glass containers with silicone lids in pink mint and cream, organized arrangement, warm beige background, soft natural lighting', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.6s', resolution: '1K', ratio: '1:1' },
  { id: 'f5', src: '/images/ai-gallery/feed-formula-smart-05.jpg', title: '智能恒温冲奶机 · 纯白', prompt: 'Smart formula milk maker machine in matte white, automatic formula dispensing with precise temperature control, LED display panel, water tank visible, warm cream studio background', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.3s', resolution: '1K', ratio: '1:1' },
  { id: 'f6', src: '/images/ai-gallery/feed-dryingrack-sage-06.jpg', title: '树形奶瓶晾干架 · 鼠尾草绿', prompt: 'Baby bottle drying rack in soft sage green, tree-branch design with multiple hanging slots for bottles and accessories, compact foldable base, BPA-free plastic, displayed with bottles hanging, warm beige background', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.8s', resolution: '1K', ratio: '1:1' },
  { id: 'f7', src: '/images/ai-gallery/feed-bag-taupe-07.jpg', title: '保温奶瓶包 · 灰 beige', prompt: 'Insulated baby bottle bag in soft taupe beige, thermal lining for temperature maintenance, adjustable shoulder strap, compact size fitting two bottles, sleek minimalist design, warm cream background', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '9.7s', resolution: '1K', ratio: '1:1' },
  { id: 'f8', src: '/images/ai-gallery/feed-silicone-coral-08.jpg', title: '硅胶辅食碗勺套装 · 珊瑚粉', prompt: 'Soft silicone baby feeding spoons and bowls in soft coral peach color, BPA-free food-grade silicone, suction bowl base, ergonomically designed spoons, arranged neatly, warm beige background', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.1s', resolution: '1K', ratio: '1:1' },
  { id: 'f9', src: '/images/ai-gallery/feed-scale-white-09.jpg', title: '婴儿辅食电子秤 · 纯白', prompt: 'Digital baby food scale with removable bowl in soft white, precise gram measurement display, tare function button, compact kitchen design, warm cream studio background, soft diffused lighting', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '9.5s', resolution: '1K', ratio: '1:1' },
  { id: 'f10', src: '/images/ai-gallery/feed-travel-uv-10.jpg', title: '便携UV消毒盒 · 薰衣草紫', prompt: 'Portable baby bottle sterilizer for travel in soft lavender purple, compact foldable UV sterilization case, fits single bottle, USB rechargeable, sleek rounded design, warm beige background', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.3s', resolution: '1K', ratio: '1:1' },
  { id: 'f11', src: '/images/ai-gallery/feed-pillow-crescent-11.jpg', title: '哺乳枕头 · 月牙白', prompt: 'Nursing pillow in soft crescent shape covered in white organic cotton with subtle grey geometric pattern, supportive arm and baby positioning design, displayed on cream sofa, warm soft lighting', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.7s', resolution: '1K', ratio: '1:1' },
  { id: 'f12', src: '/images/ai-gallery/feed-sippy-mint-12.jpg', title: '学饮杯 · 薄荷绿', prompt: 'Baby sippy cup transition trainer in soft mint green and clear Tritan material, soft silicone spout, ergonomic handles, leak-proof design, 240ml capacity markings visible, warm cream background', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.6s', resolution: '1K', ratio: '1:1' },

  // ── 暖奶器 12张 ──
  { id: 'w1', src: '/images/ai-gallery/warmer-steam-white-01.jpg', title: '蒸汽暖奶器 · 纯白', prompt: 'Sleek steam baby bottle warmer in soft white and rose gold, digital temperature display, compact round design, warm cream studio background', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.2s', resolution: '1K', ratio: '1:1' },
  { id: 'w2', src: '/images/ai-gallery/warmer-steam-pink-02.jpg', title: '蒸汽暖奶器 · 柔粉', prompt: 'Portable steam bottle warmer in blush pink silicone, foldable water reservoir, LED indicator, warm beige studio background', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.8s', resolution: '1K', ratio: '1:1' },
  { id: 'w3', src: '/images/ai-gallery/warmer-steam-sage-03.jpg', title: '蒸汽暖奶器 · 鼠尾草绿', prompt: 'Elegant steam baby bottle warmer in matte sage green, transparent water level window, touch control panel, warm cream studio background', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.5s', resolution: '1K', ratio: '1:1' },
  { id: 'w4', src: '/images/ai-gallery/warmer-waterbath-cream-05.jpg', title: '水浴暖奶器 · 奶油白', prompt: 'Water bath baby bottle warmer in soft cream, wide-mouth basin with warm water, fits two bottles side by side, temperature control dial', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.1s', resolution: '1K', ratio: '1:1' },
  { id: 'w5', src: '/images/ai-gallery/warmer-rocker-rose-06.jpg', title: '摇奶暖奶器 · 玫瑰粉', prompt: 'Baby bottle warmer and rocker combo in dusty rose, automatic gentle rocking base, digital timer display, modern minimalist design', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.5s', resolution: '1K', ratio: '1:1' },
  { id: 'w6', src: '/images/ai-gallery/warmer-portable-sky-07.jpg', title: '便携暖奶瓶套 · 天蓝', prompt: 'Compact USB bottle warmer sleeve in sky blue, digital temperature indicator, rechargeable heating wrap, travel-friendly design', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.8s', resolution: '1K', ratio: '1:1' },
  { id: 'w7', src: '/images/ai-gallery/warmer-dual-gold-08.jpg', title: '双瓶暖奶器 · 香槟金', prompt: 'Luxury dual-bottle warmer in champagne gold, LCD touch screen, simultaneous warming of two bottles, premium metallic finish', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.2s', resolution: '1K', ratio: '1:1' },
  { id: 'w8', src: '/images/ai-gallery/warmer-3in1-09.jpg', title: '三合一暖奶器 · 多功能', prompt: '3-in-1 baby bottle warmer with steam water bath and shake modes, versatile countertop design, warm cream studio background', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.0s', resolution: '1K', ratio: '1:1' },
  { id: 'w9', src: '/images/ai-gallery/warmer-beige-04.jpg', title: '快速暖奶器 · 米色', prompt: 'Fast heating baby bottle warmer in warm beige, rapid 3-minute warming cycle, auto shut-off safety feature, compact design', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.9s', resolution: '1K', ratio: '1:1' },
  { id: 'w10', src: '/images/ai-gallery/warmer-portable-05.jpg', title: '车载暖奶器 · 便携款', prompt: 'Car bottle warmer adapter in soft grey, fits standard car cup holder, 12V DC power, travel essential for road trips', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.5s', resolution: '1K', ratio: '1:1' },
  { id: 'w11', src: '/images/ai-gallery/warmer-rose-07.jpg', title: '智能暖奶器 · 玫瑰金', prompt: 'Smart baby bottle warmer in rose gold, WiFi app control, precise temperature scheduling, premium glass warming chamber', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.8s', resolution: '1K', ratio: '1:1' },
  { id: 'w12', src: '/images/ai-gallery/warmer-smart-11.jpg', title: '恒温暖奶器 · 智能款', prompt: 'Constant temperature bottle warmer with smart thermostat, LED touch panel, 24-hour keep-warm function, sleek white design', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.3s', resolution: '1K', ratio: '1:1' },
  // ── 消毒器 12张 ──
  { id: 's1', src: '/images/ai-gallery/sterilizer-3in1-white-09.jpg', title: '消毒烘干器 · 三合一', prompt: '3-in-1 baby bottle sterilizer and dryer in pure white, tall tower design with UV-C LED, HEPA filter indicator', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.8s', resolution: '1K', ratio: '1:1' },
  { id: 's2', src: '/images/ai-gallery/sterilizer-dryer-pink-10.jpg', title: '消毒烘干器 · 柔粉', prompt: 'Compact bottle sterilizer dryer combo in blush pink, countertop square design, touch control panel, fits 6 bottles', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.5s', resolution: '1K', ratio: '1:1' },
  { id: 's3', src: '/images/ai-gallery/sterilizer-microwave-mint-11.jpg', title: '蒸汽消毒袋 · 薄荷绿', prompt: 'Microwave steam sterilizer bag set in mint green, reusable BPA-free silicone bags with steam vent valves, set of 3', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.2s', resolution: '1K', ratio: '1:1' },
  { id: 's4', src: '/images/ai-gallery/sterilizer-white-01.jpg', title: '蒸汽消毒器 · 经典白', prompt: 'Electric steam sterilizer in pure white, large capacity for 6 bottles, quick 6-minute cycle, BPA-free construction', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.0s', resolution: '1K', ratio: '1:1' },
  { id: 's5', src: '/images/ai-gallery/sterilizer-pink-02.jpg', title: 'UV消毒器 · 柔粉', prompt: 'UV-C LED bottle sterilizer in blush pink, compact desktop design, kills 99.9% of germs, auto shut-off', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.0s', resolution: '1K', ratio: '1:1' },
  { id: 's6', src: '/images/ai-gallery/sterilizer-portable-03.jpg', title: '便携消毒器 · 旅行款', prompt: 'Portable UV sterilizer wand in white, foldable compact design for travel, USB rechargeable, 3-minute sterilization', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.5s', resolution: '1K', ratio: '1:1' },
  { id: 's7', src: '/images/ai-gallery/sterilizer-dome-08.jpg', title: '穹顶消毒器 · 大容量', prompt: 'Large capacity dome sterilizer in white, fits bottles plus breast pump parts, drying function included', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.2s', resolution: '1K', ratio: '1:1' },
  { id: 's8', src: '/images/ai-gallery/sterilizer-mini-10.jpg', title: '迷你消毒器 · 紧凑款', prompt: 'Mini bottle sterilizer in soft cream, single bottle capacity, perfect for small spaces, quick 3-minute cycle', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '9.8s', resolution: '1K', ratio: '1:1' },
  { id: 's9', src: '/images/ai-gallery/sterilizer-smart-06.jpg', title: '智能消毒器 · APP控制', prompt: 'Smart WiFi-enabled sterilizer in white, app-controlled scheduling, drying and storage modes, HEPA filtration', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.0s', resolution: '1K', ratio: '1:1' },
  { id: 's10', src: '/images/ai-gallery/sterilizer-bag-12.jpg', title: 'UV消毒袋 · 便携款', prompt: 'UV sterilization bag in soft grey, collapsible design for travel, fits bottles and accessories, USB powered', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.5s', resolution: '1K', ratio: '1:1' },
  { id: 's11', src: '/images/ai-gallery/sterilizer-luxury-black-12.jpg', title: '豪华消毒器 · 曜石黑', prompt: 'Premium sterilizer and dryer in matte black with rose gold accents, 8-bottle capacity, luxury kitchen appliance aesthetic', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '15.2s', resolution: '1K', ratio: '1:1' },
  { id: 's12', src: '/images/ai-gallery/sterilizer.jpg', title: '蒸汽消毒锅 · 经典款', prompt: 'Classic electric steam sterilizer pot in white, large family size, simple one-button operation, reliable design', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.8s', resolution: '1K', ratio: '1:1' },
  // ── 睡眠电器 12张 ──
  { id: 'sl1', src: '/images/ai-gallery/sleep-rainbow-white-01.jpg', title: '彩虹白噪音机 · 纯白', prompt: 'Rainbow LED baby white noise sound machine in white, app-controlled, 30 soothing sounds, compact round design with rainbow light ring', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.5s', resolution: '1K', ratio: '1:1' },
  { id: 'sl2', src: '/images/ai-gallery/sleep-rainbow-pink-02.jpg', title: '白噪音机 · 云朵柔粉', prompt: 'Baby white noise machine in blush pink with cute cloud shape, rainbow gradient LED projection, USB rechargeable', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.8s', resolution: '1K', ratio: '1:1' },
  { id: 'sl3', src: '/images/ai-gallery/sleep-cloud-lavender-03.jpg', title: '白噪音机 · 薰衣草云朵', prompt: 'Mini portable baby white noise machine in soft lavender with cloud design, rainbow LED projection, stroller clip attachment', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.2s', resolution: '1K', ratio: '1:1' },
  { id: 'sl4', src: '/images/ai-gallery/sleep-star-mint-04.jpg', title: '星空投影仪 · 薄荷绿', prompt: 'Baby sound soother with star projection in soft mint green, ceiling projecting colorful stars and moon, 20 lullabies built-in', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.0s', resolution: '1K', ratio: '1:1' },
  { id: 'sl5', src: '/images/ai-gallery/sleep-portable-coral-05.jpg', title: '便携白噪音机 · 珊瑚', prompt: 'Portable white noise machine for babies in soft coral peach, cylindrical fabric design, 10 nature sounds, sleep timer', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.5s', resolution: '1K', ratio: '1:1' },
  { id: 'sl6', src: '/images/ai-gallery/sleep-ocean-blue-06.jpg', title: '智能白噪音机 · 海洋蓝', prompt: 'Smart baby sound machine with ocean wave projection in soft blue, APP-controlled, Alexa compatible, 3-step sleep program', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.8s', resolution: '1K', ratio: '1:1' },
  { id: 'sl7', src: '/images/ai-gallery/sleep-touch-cream-07.jpg', title: '触控白噪音机 · 奶油', prompt: 'Touch-sensitive white noise machine in soft cream, minimalist egg-shaped design, heartbeat and womb sounds, volume touch slider', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.5s', resolution: '1K', ratio: '1:1' },
  { id: 'sl8', src: '/images/ai-gallery/sleep-travel-sage-08.jpg', title: '旅行白噪音机 · 鼠尾草', prompt: 'Compact travel white noise machine in sage green, USB-C powered, clip for stroller, 8 sounds, battery operated', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '10.2s', resolution: '1K', ratio: '1:1' },
  { id: 'sl9', src: '/images/ai-gallery/sleep-humidifier-white-09.jpg', title: '白噪音加湿器 · 二合一', prompt: 'Baby sound machine and humidifier combo in soft white, 2-in-1 design with cool mist, 360-degree rotating nozzle, 12 lullabies', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.0s', resolution: '1K', ratio: '1:1' },
  { id: 'sl10', src: '/images/ai-gallery/sleep-forest-yellow-10.jpg', title: '森林投影机 · 暖黄', prompt: 'Nursery white noise machine with animated projection in soft yellow, rotating forest animals scene, 25 calming melodies', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.2s', resolution: '1K', ratio: '1:1' },
  { id: 'sl11', src: '/images/ai-gallery/sleep-voice-lilac-11.jpg', title: '录音白噪音机 · 淡紫', prompt: 'Baby white noise machine with voice recording in soft lilac, record parents voice, USB playback, gradual volume fade-out', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.0s', resolution: '1K', ratio: '1:1' },
  { id: 'sl12', src: '/images/ai-gallery/sleep-bluetooth-sand-12.jpg', title: '蓝牙白噪音机 · 沙色', prompt: 'Baby white noise machine with Bluetooth speaker in sand beige, premium audio, multi-color ambient light, app-scheduled sleep routines', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.5s', resolution: '1K', ratio: '1:1' },
  // ── 安防电器 12张 ──
  { id: 'm1', src: '/images/ai-gallery/monitor-dome-white-01.jpg', title: '婴儿监视器 · 穹顶白', prompt: 'Smart baby monitor camera in white and rose gold, 360-degree pan tilt, HD lens with night vision ring, wall-mountable', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.2s', resolution: '1K', ratio: '1:1' },
  { id: 'm2', src: '/images/ai-gallery/monitor-parent-white-02.jpg', title: '监视器家长端 · 5寸屏', prompt: 'Baby video monitor parent unit with 5-inch color screen, temperature reading, two-way talk button, wireless range indicator', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.8s', resolution: '1K', ratio: '1:1' },
  { id: 'm3', src: '/images/ai-gallery/monitor-bunny-grey-03.jpg', title: '监视器 · 萌兔灰', prompt: 'Baby monitor camera in soft grey with bunny ear design, wall-mounted above crib, wide angle lens, cry detection sensor', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.0s', resolution: '1K', ratio: '1:1' },
  { id: 'm4', src: '/images/ai-gallery/monitor-split-white-04.jpg', title: '分屏监视器 · 双摄像头', prompt: 'Split-screen baby monitor showing two camera feeds, white base station with 4.3-inch display, room temperature alerts', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.5s', resolution: '1K', ratio: '1:1' },
  { id: 'm5', src: '/images/ai-gallery/monitor-sock-white-05.jpg', title: '智能监护袜 · 纯白', prompt: 'Wearable baby monitor sock in soft white, smart sensor tracking heart rate and oxygen, gentle fabric ankle wrap, charging dock', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.8s', resolution: '1K', ratio: '1:1' },
  { id: 'm6', src: '/images/ai-gallery/monitor-ai-white-06.jpg', title: 'AI智能监视器 · 全景', prompt: 'WiFi baby monitor with AI cry detection, auto-tracking, air quality sensor ring, mobile app interface shown on phone', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '15.0s', resolution: '1K', ratio: '1:1' },
  { id: 'm7', src: '/images/ai-gallery/monitor-pad-white-07.jpg', title: '呼吸监测垫 · 白色', prompt: 'Baby breathing movement monitor pad in soft white, placed under crib mattress, wireless connection, medical-grade sensor', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.5s', resolution: '1K', ratio: '1:1' },
  { id: 'm8', src: '/images/ai-gallery/monitor-twin-pink-08.jpg', title: '双胞胎监视器 · 柔粉', prompt: 'Baby monitor with temperature alarm in soft pink, dual camera system for twins, split-screen parent unit', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.8s', resolution: '1K', ratio: '1:1' },
  { id: 'm9', src: '/images/ai-gallery/monitor-compact-mint-09.jpg', title: '紧凑监视器 · 薄荷绿', prompt: 'Compact baby monitor with 2.8-inch screen in soft mint green, audio-only mode, 30-hour battery, vibration alert', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.5s', resolution: '1K', ratio: '1:1' },
  { id: 'm10', src: '/images/ai-gallery/monitor-ptz-white-10.jpg', title: '云台监视器 · 白色', prompt: 'Baby monitor camera with PTZ motorized movement in soft white, quiet motor, magnetic base, 130-degree wide angle', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.2s', resolution: '1K', ratio: '1:1' },
  { id: 'm11', src: '/images/ai-gallery/monitor-smart-charcoal-11.jpg', title: '智能警报监视器 · 炭灰', prompt: 'Baby monitor with smart alert in charcoal grey, AI danger zone detection, facial recognition, push notification to phone', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '15.5s', resolution: '1K', ratio: '1:1' },
  { id: 'm12', src: '/images/ai-gallery/monitor-cry-lavender-12.jpg', title: '哭声分析监视器 · 淡紫', prompt: 'Baby monitor with cry analytics in soft lavender, machine learning cry translation, decibel graph, auto lullaby play', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.0s', resolution: '1K', ratio: '1:1' },
  // ── 孕妇枕 12张 ──
  { id: 'pl1', src: '/images/ai-gallery/pillow-u-grey-01.jpg', title: 'U型孕妇枕 · 雾灰', prompt: 'U-shaped pregnancy body pillow in soft dove grey velvet, full body support for side sleeping, removable washable cover', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.0s', resolution: '1K', ratio: '1:1' },
  { id: 'pl2', src: '/images/ai-gallery/pillow-u-pink-02.jpg', title: 'U型孕妇枕 · 柔粉', prompt: 'U-shaped pregnancy pillow in soft blush pink jersey cotton, extra long design for total body support, inner curve for belly', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.5s', resolution: '1K', ratio: '1:1' },
  { id: 'pl3', src: '/images/ai-gallery/pillow-bilateral-ivory-03.jpg', title: '双边孕妇枕 · 象牙白', prompt: 'Large U-shaped pregnancy pillow in soft ivory white organic cotton, bilateral support with removable sections, belly wedge and back support', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.2s', resolution: '1K', ratio: '1:1' },
  { id: 'pl4', src: '/images/ai-gallery/pillow-adjustable-sage-04.jpg', title: '可调孕妇枕 · 鼠尾草', prompt: 'U-shaped pregnancy pillow with adjustable filling in soft sage green jersey knit, zipper adjustable loft, side-sleeping support', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '12.0s', resolution: '1K', ratio: '1:1' },
  { id: 'pl5', src: '/images/ai-gallery/pillow-combo-lavender-05.jpg', title: '组合孕妇枕 · 薰衣草', prompt: 'Large C-shaped and U-shaped combo pregnancy pillow in soft lavender, detachable sections for back and belly support', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.5s', resolution: '1K', ratio: '1:1' },
  { id: 'pl6', src: '/images/ai-gallery/pillow-j-rose-06.jpg', title: 'J型孕妇枕 · 玫瑰', prompt: 'J-shaped pregnancy body pillow in soft dusty rose, ergonomic support for pregnant women, memory foam filling, bamboo cover', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.8s', resolution: '1K', ratio: '1:1' },
  { id: 'pl7', src: '/images/ai-gallery/pillow-cooling-blue-07.jpg', title: '凉感孕妇枕 · 天蓝', prompt: 'U-shaped pregnancy pillow with cooling gel memory foam in soft blue bamboo fabric, heat-dissipating technology, 60-inch design', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.8s', resolution: '1K', ratio: '1:1' },
  { id: 'pl8', src: '/images/ai-gallery/pillow-wedge-cream-08.jpg', title: '楔形孕妇枕 · 奶油', prompt: 'Pregnancy pillow with wedge insert in soft oatmeal, adjustable three-piece design for targeted support, back wedge and belly support', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '11.5s', resolution: '1K', ratio: '1:1' },
  { id: 'pl9', src: '/images/ai-gallery/pillow-heat-mauve-09.jpg', title: '加热孕妇枕 · 淡紫', prompt: 'U-shaped pregnancy pillow with heating pad in soft mauve, gentle warming zones for back pain relief, USB-powered heat control', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.2s', resolution: '1K', ratio: '1:1' },
  { id: 'pl10', src: '/images/ai-gallery/pillow-satin-rose-10.jpg', title: '缎面孕妇枕 · 玫瑰粉', prompt: 'Full body U-shaped pregnancy pillow in soft dusty rose, premium memory foam with adjustable loft, silky satin cover, 55-inch length', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '13.0s', resolution: '1K', ratio: '1:1' },
  { id: 'pl11', src: '/images/ai-gallery/pillow-nurse-oatmeal-11.jpg', title: '哺乳两用孕妇枕 · 燕麦', prompt: 'Pregnancy pillow with nursing conversion in soft oatmeal, U-shape converts to C-shape for breastfeeding support, dual-purpose design', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.5s', resolution: '1K', ratio: '1:1' },
  { id: 'pl12', src: '/images/ai-gallery/pillow-xl-teal-12.jpg', title: '加大孕妇枕 · 青绿', prompt: 'Extra large U-shaped pregnancy pillow for plus size in soft teal, 65-inch extended length, extra firm support, cooling bamboo rayon cover', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-23', time: '14.0s', resolution: '1K', ratio: '1:1' },
  // ── 六视图系列 9张 ──
  { id: 'v1', src: '/images/ai-gallery/warmer-6view.jpg', title: '暖奶器 · 六视图', prompt: 'Six-view technical layout of Momcozy bottle warmer showing front back left right top bottom angles', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-24', time: '15.2s', resolution: '1K', ratio: '1:1' },
  { id: 'v2', src: '/images/ai-gallery/sterilizer-6view.jpg', title: '消毒器 · 六视图', prompt: 'Six-view technical layout of Momcozy UV sterilizer showing all six angles', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-24', time: '15.8s', resolution: '1K', ratio: '1:1' },
  { id: 'v3', src: '/images/ai-gallery/sleep-6view.jpg', title: '白噪音机 · 六视图', prompt: 'Six-view technical layout of Momcozy sound machine showing all six angles', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.5s', resolution: '1K', ratio: '1:1' },
  { id: 'v4', src: '/images/ai-gallery/monitor-6view.jpg', title: '监视器 · 六视图', prompt: 'Six-view technical layout of Momcozy baby monitor showing all six angles', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '15.0s', resolution: '1K', ratio: '1:1' },
  { id: 'v5', src: '/images/ai-gallery/pillow-6view.jpg', title: '孕妇枕 · 六视图', prompt: 'Six-view technical layout of Momcozy pregnancy pillow showing all six angles', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.8s', resolution: '1K', ratio: '1:1' },
  { id: 'v6', src: '/images/ai-gallery/pump-6view.jpg', title: '吸奶器 · 六视图', prompt: 'Six-view technical layout of Momcozy breast pump showing all six angles', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-24', time: '15.5s', resolution: '1K', ratio: '1:1' },
  { id: 'v7', src: '/images/ai-gallery/bra-6view.jpg', title: '哺乳文胸 · 六视图', prompt: 'Six-view technical layout of Momcozy nursing bra showing all six angles', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-24', time: '13.8s', resolution: '1K', ratio: '1:1' },
  { id: 'v8', src: '/images/ai-gallery/carrier-6view.jpg', title: '婴儿背带 · 六视图', prompt: 'Six-view technical layout of Momcozy baby carrier showing all six angles', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-24', time: '16.2s', resolution: '1K', ratio: '1:1' },
  { id: 'v9', src: '/images/ai-gallery/feed-6view.jpg', title: '喂养电器 · 六视图', prompt: 'Six-view technical layout of Momcozy food maker showing all six angles', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '15.0s', resolution: '1K', ratio: '1:1' },
  // ── 电商专业图系列 27张 ──
  { id: 'e1', src: '/images/ai-gallery/warmer-pro-01.jpg', title: '蒸汽暖奶器 · 电商图', prompt: 'E-commerce hero shot of Momcozy steam bottle warmer, professional studio lighting', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.2s', resolution: '1K', ratio: '1:1' },
  { id: 'e2', src: '/images/ai-gallery/warmer-pro-02.jpg', title: '水浴暖奶器 · 场景图', prompt: 'Momcozy water bath warmer on nursery changing table with baby bottle, soft morning light', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-24', time: '13.8s', resolution: '1K', ratio: '1:1' },
  { id: 'e3', src: '/images/ai-gallery/warmer-pro-03.jpg', title: '摇奶暖奶器 · 水浴款', prompt: 'Momcozy water bath warmer with two bottles, lavender nursery bedside setting', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.0s', resolution: '1K', ratio: '1:1' },
  { id: 'e4', src: '/images/ai-gallery/warmer-pro-04.jpg', title: '便携暖奶瓶 · 旅行款', prompt: 'Momcozy portable bottle warmer on diaper bag at airport, coral peach travel design', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-24', time: '13.5s', resolution: '1K', ratio: '1:1' },
  { id: 'e5', src: '/images/ai-gallery/warmer-pro-05.jpg', title: '双瓶暖奶器 · 亲子场景', prompt: 'Momcozy dual bottle warmer in champagne gold with parent holding sleeping baby', category: '暖奶器', model: 'Kimi Image Generation', date: '2026-05-24', time: '15.0s', resolution: '1K', ratio: '1:1' },
  { id: 'e6', src: '/images/ai-gallery/sterilizer-pro-01.jpg', title: '消毒烘干器 · 电商图', prompt: 'E-commerce hero shot of Momcozy UV sterilizer dryer, clean cream background', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.8s', resolution: '1K', ratio: '1:1' },
  { id: 'e7', src: '/images/ai-gallery/sterilizer-pro-02.jpg', title: '消毒器 · 开箱展示', prompt: 'Momcozy UV sterilizer with open door showing bottles inside, warm LED glow', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.5s', resolution: '1K', ratio: '1:1' },
  { id: 'e8', src: '/images/ai-gallery/sterilizer-pro-03.jpg', title: '蒸汽消毒器 · 俯视展示', prompt: 'Top-down view of Momcozy steam sterilizer with bottles and pacifiers arranged inside', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-24', time: '13.2s', resolution: '1K', ratio: '1:1' },
  { id: 'e9', src: '/images/ai-gallery/sterilizer-pro-04.jpg', title: 'UV消毒器 · 柔粉款', prompt: 'Momcozy UV sterilizer dryer in blush pink with soft LED glow and countdown display', category: '消毒器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.0s', resolution: '1K', ratio: '1:1' },
  { id: 'e10', src: '/images/ai-gallery/sleep-pro-01.jpg', title: '白噪音机 · 电商图', prompt: 'E-commerce hero shot of Momcozy white noise machine with rainbow LED, white marble surface', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '13.8s', resolution: '1K', ratio: '1:1' },
  { id: 'e11', src: '/images/ai-gallery/sleep-pro-02.jpg', title: '白噪音机 · 夜间投影', prompt: 'Momcozy white noise machine projecting rainbow stars on nursery ceiling at night', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.5s', resolution: '1K', ratio: '1:1' },
  { id: 'e12', src: '/images/ai-gallery/sleep-pro-03.jpg', title: '白噪音机 · 书架场景', prompt: 'Momcozy sound machine in mint green on nursery bookshelf with children books', category: '睡眠电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '13.0s', resolution: '1K', ratio: '1:1' },
  { id: 'e13', src: '/images/ai-gallery/monitor-pro-01.jpg', title: '婴儿监视器 · 电商图', prompt: 'E-commerce hero shot of Momcozy smart baby monitor camera, white and rose gold', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.2s', resolution: '1K', ratio: '1:1' },
  { id: 'e14', src: '/images/ai-gallery/monitor-pro-02.jpg', title: '监视器 · nursery场景', prompt: 'Momcozy baby monitor mounted above white crib in beautiful nursery setting', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.8s', resolution: '1K', ratio: '1:1' },
  { id: 'e15', src: '/images/ai-gallery/monitor-pro-03.jpg', title: '监视器 · 家长端展示', prompt: 'Momcozy monitor parent unit showing HD baby video with coffee cup beside', category: '安防电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.0s', resolution: '1K', ratio: '1:1' },
  { id: 'e16', src: '/images/ai-gallery/pillow-pro-01.jpg', title: '孕妇枕 · 电商图', prompt: 'E-commerce hero shot of Momcozy U-shaped pregnancy pillow on white bed', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-24', time: '13.5s', resolution: '1K', ratio: '1:1' },
  { id: 'e17', src: '/images/ai-gallery/pillow-pro-02.jpg', title: '孕妇枕 · 使用场景', prompt: 'Pregnant woman using Momcozy U-shaped pillow reading book in cozy bedroom', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.2s', resolution: '1K', ratio: '1:1' },
  { id: 'e18', src: '/images/ai-gallery/pillow-pro-03.jpg', title: '孕妇枕 · 产后恢复', prompt: 'Momcozy pregnancy pillow on maternity ward bed for postpartum recovery', category: '孕妇枕', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.0s', resolution: '1K', ratio: '1:1' },
  { id: 'e19', src: '/images/ai-gallery/pump-pro-01.jpg', title: '吸奶器 · 电商图', prompt: 'E-commerce hero shot of Momcozy M5 wearable pump floating on white background', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.5s', resolution: '1K', ratio: '1:1' },
  { id: 'e20', src: '/images/ai-gallery/pump-pro-02.jpg', title: '吸奶器 · 礼盒装', prompt: 'Momcozy breast pump set in elegant gift box with accessories and rose petals', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-24', time: '15.2s', resolution: '1K', ratio: '1:1' },
  { id: 'e21', src: '/images/ai-gallery/pump-pro-03.jpg', title: '吸奶器 · 办公场景', prompt: 'Working mother using Momcozy wearable pump discreetly at office desk', category: '吸奶器', model: 'Kimi Image Generation', date: '2026-05-24', time: '15.8s', resolution: '1K', ratio: '1:1' },
  { id: 'e22', src: '/images/ai-gallery/bra-pro-01.jpg', title: '哺乳文胸 · 电商图', prompt: 'E-commerce flat-lay of Momcozy seamless nursing bra in nude beige', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-24', time: '12.8s', resolution: '1K', ratio: '1:1' },
  { id: 'e23', src: '/images/ai-gallery/bra-pro-02.jpg', title: '哺乳文胸 · 哺乳场景', prompt: 'Mother wearing Momcozy nursing bra holding newborn, clip-down access visible', category: '哺乳文胸', model: 'Kimi Image Generation', date: '2026-05-24', time: '13.5s', resolution: '1K', ratio: '1:1' },
  { id: 'e24', src: '/images/ai-gallery/carrier-pro-01.jpg', title: '婴儿背带 · 电商图', prompt: 'E-commerce shot of Momcozy ergonomic carrier in grey with 3D mesh back panel', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.0s', resolution: '1K', ratio: '1:1' },
  { id: 'e25', src: '/images/ai-gallery/carrier-pro-02.jpg', title: '婴儿背带 · 户外场景', prompt: 'Father wearing Momcozy baby carrier in denim blue at park, autumn golden hour', category: '婴儿背带', model: 'Kimi Image Generation', date: '2026-05-24', time: '15.5s', resolution: '1K', ratio: '1:1' },
  { id: 'e26', src: '/images/ai-gallery/feed-pro-01.jpg', title: '辅食机 · 电商图', prompt: 'E-commerce shot of Momcozy baby food maker on modern kitchen counter', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '14.2s', resolution: '1K', ratio: '1:1' },
  { id: 'e27', src: '/images/ai-gallery/feed-pro-02.jpg', title: '辅食机 · 厨房场景', prompt: 'Momcozy food processor in sage green with steamed carrots and sweet potatoes', category: '喂养电器', model: 'Kimi Image Generation', date: '2026-05-24', time: '13.8s', resolution: '1K', ratio: '1:1' },
];

const categories = ['全部', '吸奶器', '哺乳文胸', '婴儿背带', '喂养电器', '暖奶器', '消毒器', '睡眠电器', '安防电器', '孕妇枕'];

const stats = [
  { label: 'AI生成图片', value: '145', icon: <Image className="w-4 h-4" />, color: '#C25B6E' },
  { label: '品类覆盖', value: '9', icon: <CheckCircle className="w-4 h-4" />, color: '#ff9500' },
  { label: '平均生成时间', value: '12.3s', icon: <Clock className="w-4 h-4" />, color: '#34c759' },
  { label: '成本估算待审', value: '待审', icon: <Sparkles className="w-4 h-4" />, color: '#af52de' },
];

export default function AIGallery() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filtered = galleryImages.filter(img => {
    const matchCategory = activeCategory === '全部' || img.category === activeCategory;
    const matchSearch = !searchQuery || img.title.includes(searchQuery) || img.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Count by category
  const catCounts: Record<string, number> = {};
  galleryImages.forEach(img => { catCounts[img.category] = (catCounts[img.category] || 0) + 1; });

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#af52de] flex items-center justify-center shadow-sm" style={{ boxShadow: '0 2px 8px #af52de30' }}>
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#1d1d1f]">AI 画廊</h1>
                <p className="text-xs text-[#86868b]">AI 生成的 Momcozy 产品概念图与设计素材</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/ai-assistant/design')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#af52de] text-white text-sm font-medium hover:bg-[#b860e0] transition-colors duration-200 shadow-sm">
                <Wand2 className="w-4 h-4" />前往生成
              </button>
            </div>
          </div>
        </div>

        <PageEvidenceNotice
          sourceIds={['ds-026']}
          title="AI图库素材口径"
          description="图库中的日期是素材生成或入库日期，不代表市场数据快照或半月业务数据更新。生成请求、模型版本、供应商成本和人工审核记录尚未接入。"
          cadence="素材库状态"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                <span className="text-xs text-[#86868b]">{s.label}</span>
              </div>
              <p className="text-2xl font-semibold text-[#1d1d1f]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 card-shadow-sm border border-[#EDE6DF]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${activeCategory === cat ? 'bg-[#C25B6E] text-white' : 'bg-[#FBF8F5] text-[#86868b] hover:text-[#1d1d1f]'}`}
                >
                  {cat} {cat !== '全部' && <span className="opacity-60">({catCounts[cat] || 0})</span>}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索图片..."
                className="w-full sm:w-48 px-3 py-1.5 rounded-xl bg-[#FBF8F5] text-xs text-[#1d1d1f] outline-none placeholder:text-[#86868b]/60 focus:ring-2 focus:ring-[#C25B6E]/20"
              />
              <span className="text-xs text-[#86868b] whitespace-nowrap">{filtered.length} 张</span>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((img) => (
            <div
              key={img.id}
              className="group rounded-2xl border border-[#EDE6DF] overflow-hidden hover:shadow-xl transition-all cursor-pointer bg-white"
              onClick={() => setSelectedImage(img)}
            >
              <div className="aspect-square bg-[#FBF8F5] overflow-hidden relative">
                <img
                  src={img.src}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-xl bg-white/90 backdrop-blur flex items-center justify-center shadow-sm">
                    <ZoomIn className="w-4 h-4 text-[#1d1d1f]" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur text-white text-[10px]">{img.ratio}</span>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-[#1d1d1f] truncate mb-1">{img.title}</h3>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#C25B6E]/10 text-[#C25B6E]">{img.category}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FBF8F5] text-[#86868b]">{img.resolution}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#af52de]/10 text-[#af52de]">{img.time}</span>
                </div>
                <div className="relative p-2 rounded-lg bg-[#FBF8F5] group/prompt" onClick={e => e.stopPropagation()}>
                  <p className="text-[11px] text-[#86868b] leading-relaxed line-clamp-3 pr-6">{img.prompt}</p>
                  <button
                    onClick={() => handleCopy(img.prompt, img.id)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-200 bg-white/80 hover:bg-[#C25B6E] hover:text-white text-[#86868b]"
                    title="复制Prompt"
                  >
                    {copiedId === img.id ? <Check className="w-3 h-3 text-[#34c759]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
            <div className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[#EDE6DF]">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">{selectedImage.title}</h3>
                <button onClick={() => setSelectedImage(null)} className="w-8 h-8 rounded-xl bg-[#FBF8F5] flex items-center justify-center hover:bg-[#F5EDE8] transition-colors duration-200">
                  <X className="w-4 h-4 text-[#86868b]" />
                </button>
              </div>
              <div className="flex-1 min-w-0 overflow-auto p-4 flex items-center justify-center bg-[#FBF8F5]">
                <img src={selectedImage.src} alt={selectedImage.title} className="max-w-full max-h-[50vh] object-contain rounded-xl" />
              </div>
              <div className="p-4 border-t border-[#EDE6DF] space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[#C25B6E]/10 text-[#C25B6E] text-[10px] font-medium">{selectedImage.category}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FBF8F5] text-[#86868b] text-[10px]">{selectedImage.model}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FBF8F5] text-[#86868b] text-[10px]">{selectedImage.date}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#af52de]/10 text-[#af52de] text-[10px]">{selectedImage.time}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Tag className="w-3 h-3 text-[#86868b] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#86868b] leading-relaxed truncate">{selectedImage.prompt}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="flex-1 min-w-0 py-2 rounded-xl bg-[#C25B6E] text-white text-xs font-medium hover:bg-[#D46B7E] transition-colors duration-200 flex items-center justify-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />下载原图
                  </button>
                  <button onClick={() => navigate('/ai-assistant/design')} className="flex-1 min-w-0 py-2 rounded-xl bg-[#FBF8F5] text-[#1d1d1f] text-xs font-medium hover:bg-[#F5EDE8] transition-colors duration-200 flex items-center justify-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" />以此为参考生成
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
