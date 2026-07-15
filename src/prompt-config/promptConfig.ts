export type VisualTypeId = "A" | "B" | "C";

export interface PromptOption {
  id: string;
  label: string;
  description?: string;
  prompt: string;
  negativePrompt?: string;
  recommendedTone?: string;
  version: number;
}

export interface PromptCompileInput {
  visualType: VisualTypeId;
  scene?: string;
  productFunctions: string[];
  shotScale: string;
  cameraAngle: string;
  tone: string;
  originalPrompt: string;
  resolution: string;
  aspectRatio: string;
  imageCount: number;
  productImages: string[];
  characterImages: string[];
  referenceImages: string[];
  referenceImageWeights?: Array<{ name: string; weight: "low" | "medium" | "high" }>;
  imageAnalyses?: AssetAnalysis[];
}

export type ImageReferenceRole =
  | "product_master"
  | "product_detail"
  | "character_identity"
  | "style_reference";

export interface AssetAnalysis {
  assetId: string;
  name: string;
  role: ImageReferenceRole;
  summary: string;
  observableFeatures: string[];
  mustPreserve: string[];
  allowedInfluence: string[];
  warnings: string[];
  status: "analyzed" | "fallback" | "failed";
  model: string;
  analyzedAt: string;
}

export interface PromptImageInput {
  id: string;
  name: string;
  role: ImageReferenceRole;
  dataUrl: string;
  weight?: "low" | "medium" | "high";
}

export interface SelectedPromptFragment {
  group: string;
  id: string;
  label: string;
  prompt: string;
  version: number;
}

export interface CompiledPromptPackage {
  title: string;
  positivePrompt: string;
  negativePrompt: string;
  positivePromptEnglish: string;
  negativePromptEnglish: string;
  selectedFragments: SelectedPromptFragment[];
  warnings: string[];
  configVersion: string;
}

export const PROMPT_CONFIG_VERSION = "badigao-v1.0.0";

export const VISUAL_TYPE_OPTIONS: PromptOption[] = [
  {
    id: "A",
    label: "A类视觉",
    description: "品牌情绪与生活方式",
    prompt:
      "品牌情绪视觉。画面以生活方式和品牌精神为第一目标，不做生硬的功能演示；强调自然、洁净、松弛、轻盈和不费力的高级感。",
    version: 1,
  },
  {
    id: "B",
    label: "B类视觉",
    description: "真实使用与功能证据",
    prompt:
      "真实使用视觉。通过可信的生活动作建立产品证据链，让柔软、弹力、包裹和不移位成为一眼可见的穿着证明；动作必须服从人体受力和产品结构。",
    version: 1,
  },
  {
    id: "C",
    label: "C类视觉",
    description: "产品功能与卖点特写",
    prompt:
      "产品功能视觉。弱化场景叙事，聚焦产品本身的功能特性，以清晰的材质、结构、局部特写或可信演示直接呈现所选卖点。",
    version: 1,
  },
];

export const SCENE_OPTIONS: Record<VisualTypeId, PromptOption[]> = {
  A: [
    {
      id: "海边自在",
      label: "海边自在",
      description: "蓝白海岸与轻旅行感",
      recommendedTone: "蓝色调",
      prompt:
        "真实自然海岸，开阔浅蓝天空、清澈海面、细碎白浪与干净礁石或浅水沙滩；天空占画面约45%–70%，海平线位于下方1/4–2/5。人物处于迎风慢走、望海或自然同行的抓拍状态，发丝与轻薄衣摆风向一致。蓝白低饱和、自然暖肤色、前中远三层空间和大面积文案留白，呈现轻松、洁净、呼吸感、旅行感与自然生命力。",
      negativePrompt:
        "旅游打卡照，游客合影，商业假笑，椰树度假风，泳圈，堆叠遮阳伞，巨浪，风暴，戏剧性晚霞，金色夕阳，过饱和蓝天，荧光海水，虚假蓝幕，棚拍海景，背景贴图，海平线倾斜",
      version: 1,
    },
    {
      id: "居家松弛",
      label: "居家松弛",
      description: "日照感与真实生活温度",
      recommendedTone: "米色调",
      prompt:
        "采光良好的现代都市住宅，以暖白哑光墙面、浅橡木地板、大窗、奶油白半透薄纱帘和圆角低饱和家具构成阳光居家感。人物正在阅读、喝水、靠坐、伸展或整理行李，肩颈放松、动作可持续，空间整洁但保留少量真实生活痕迹。使用有明确方向的4800K–5600K自然窗光，暖而不黄，表现日照感、松弛感、洁净感、呼吸感与自然生命力。",
      negativePrompt:
        "深色豪宅，黑灰工业风，冷蓝办公室，复古宫廷，浓重侘寂，杂乱背景，廉价出租屋，厚重深色窗帘，红木家具，镜面大理石，过多绿植，纯白无生活感影棚，正面环形灯，全画面黄滤镜",
      version: 1,
    },
    {
      id: "米色自在",
      label: "米色自在",
      description: "柔光棚拍与亲肤质感",
      recommendedTone: "米色调",
      prompt:
        "生活化极简柔光棚拍，奶油米白、浅杏和自然肤色为主；空间使用圆弧结构、柔性几何装置和大面积留白，以圆润、包裹、安全、无攻击性的视觉语言放大柔软亲肤。人物自然微笑、身体放松，产品处于视觉中心。使用均匀柔光、低对比度、高明度、自然皮肤过渡和轻柔阴影，呈现高级护肤广告般的洁净与亲肤质感。",
      negativePrompt:
        "强轮廓光，冷科技光，黑白高反差，商业硬棚光，复杂家居，花朵堆叠，少女化元素，美妆广告感，冷漠时尚脸，性感内衣展示",
      version: 1,
    },
    {
      id: "蓝色洁净",
      label: "蓝色洁净",
      description: "浅蓝棚拍与专业洁净感",
      recommendedTone: "蓝色调",
      prompt:
        "单色浅天蓝极简棚拍，白色或浅蓝服装，高明度、低饱和、空气感强；不依赖复杂场景和道具，让人物状态、产品贴身感和品牌蓝白氛围成为视觉中心。人物干净、自信、轻松并带轻微动态，贴身但不性感、舒适但不松垮。整体专业、年轻、可信赖，但不冰冷、不医疗化。",
      negativePrompt:
        "冰冷实验室，医疗器械感，冷科技蓝，高饱和品牌蓝，复杂道具，家居杂物，硬质塑料背景，僵硬证件照，性感时尚大片",
      version: 1,
    },
  ],
  B: [
    {
      id: "居家柔弹与立体包裹",
      label: "居家柔弹",
      description: "真实动作证明柔弹包裹",
      recommendedTone: "米色调",
      prompt:
        "米白墙面、浅木地板、自然窗光与简洁家具构成居家轻运动环境，可使用哑光浅蓝柔性球体作为柔软支撑和回弹隐喻。通过靠球伸展、扶椅转身、轻拉腰头、自然回身或可信的躺卧展示，证明产品柔软亲肤、腰头有弹力、臀部立体包裹、久穿不勒且活动不移位。重点检查腰头平整、裤脚不卷边、后片覆盖完整、竖纹面料清晰，以及动作中产品结构稳定。",
      negativePrompt:
        "专业健身房，硬核瑜伽，竞技运动，汗流浃背，夸张拉伸，肌肉强化，刻意臀部展示，窥视角度，高难度后弯，产品被拉薄，腰头卷边，裤脚错位",
      version: 1,
    },
    {
      id: "蓝色洁净功能证据系统",
      label: "蓝色功能证据",
      description: "蓝白棚拍证明穿着性能",
      recommendedTone: "蓝色调",
      prompt:
        "浅蓝洁净极简棚拍，以真实穿着状态、正反面、局部细节、双人对照或轻拉伸动作建立功能证据。清晰展示穿着轻盈、材质柔软、亲肤不刺激、包裹完整、不勒不夹；产品轮廓、腰头、裤脚、包边、竖纹纯棉肌理保持准确，适合电商详情页、卖点图和首焦功能图。",
      negativePrompt:
        "冰冷医疗棚拍，夸张实验演示，硬塑料材质，过度拉扯，产品变形，低俗局部裁切，性感凝视，遮挡产品，错误正反面结构",
      version: 1,
    },
  ],
  C: [],
};

export const SELLING_POINT_OPTIONS: PromptOption[] = [
  { id: "吸水", label: "吸水", prompt: "以可信的局部演示表现吸水后仍保持干爽、舒适，避免夸张液体特效。", version: 1 },
  { id: "透气", label: "透气", prompt: "以轻盈空气感、清晰细腻的面料孔隙与柔和流动感表达透气，避免虚假科技粒子。", version: 1 },
  { id: "弹力拉伸", label: "弹力拉伸", prompt: "通过真实克制的轻拉伸动作证明弹性，拉伸幅度可信，结构不变形，松开后自然回弹。", version: 1 },
  { id: "不起球", label: "不起球", prompt: "使用面料近景展示表面干净平整、纤维细腻且无起球，保持真实织物质感。", version: 1 },
  { id: "不掉絮", label: "不掉絮", prompt: "以洁净面料表面和清楚纤维边缘证明不掉絮，画面中不出现飞散纤维。", version: 1 },
  { id: "灭菌", label: "灭菌", prompt: "以洁净、安全、可信赖的视觉气质承接EO灭菌、10A抗菌或无菌级信息，不使用冰冷医疗器械语言。", version: 1 },
  { id: "A类母婴级", label: "A类母婴级", prompt: "以温和、安全、低刺激、柔软亲肤的视觉表达承接婴幼儿用品标准，不使用卡通母婴化场景。", version: 1 },
  { id: "便携不占行李", label: "便携不占行李", prompt: "通过整齐折叠后的小体积与真实旅行收纳关系，展示轻便、易携带、不占行李空间。", version: 1 },
  { id: "亲肤柔软不扎", label: "亲肤柔软不扎", prompt: "通过柔和皮肤接触、自然贴合和细腻棉感表达柔软亲肤，边缘不过度压迫皮肤。", version: 1 },
  { id: "透气不闷汗", label: "透气不闷汗", prompt: "以清爽、轻盈、干爽的穿着状态表达透气不闷汗，避免汗液或运动广告感。", version: 1 },
  { id: "爽滑不粘腻", label: "爽滑不粘腻", prompt: "通过顺滑但不发亮的面料质感、自然褶皱和轻松贴肤状态表达不粘腻。", version: 1 },
  { id: "不夹臀", label: "不夹臀", prompt: "采用三分之四背面或自然转身，展示后片覆盖完整、不上移、不夹臀、左右对称。", version: 1 },
  { id: "3D人体工学版型", label: "3D人体工学版型", prompt: "通过正面、侧面和背面的可信版型展示，证明立体剪裁、自然贴合和完整包裹。", version: 1 },
  { id: "大码包容", label: "大码包容", prompt: "通过不同真实体型的自然穿着状态展示包容性，避免不真实瘦身、勒痕或夸张身材对比。", version: 1 },
];

export const SHOT_SCALE_OPTIONS: PromptOption[] = [
  { id: "全景", label: "全景", prompt: "完整环境人像，人物完整、空间可读、产品区域清晰，建立场景、动作与产品关系。", version: 1 },
  { id: "中景", label: "中景", prompt: "3/4身构图，兼顾人物状态、自然动作和产品穿着细节。", version: 1 },
  { id: "远景", label: "远景", prompt: "人物在环境中占比较小，强调空间氛围、场景感和品牌KV式大留白。", version: 1 },
  { id: "近景", label: "近景", prompt: "中近景构图，突出人物表情、真实皮肤和贴身材质，同时保留必要产品信息。", version: 1 },
  { id: "特写", label: "特写", prompt: "局部特写，清晰呈现面料纹理、腰头、腿口、包边或臀部弧线等指定细节。", version: 1 },
  { id: "大特写", label: "大特写", prompt: "极近距离细节展示，聚焦面料纤维与产品工艺，避免失去结构语境或形成不适当身体凝视。", version: 1 },
];

export const CAMERA_ANGLE_OPTIONS: PromptOption[] = [
  { id: "平视", label: "平视", prompt: "镜头与人物视线平齐，人物比例自然真实，适合标准产品展示和生活抓拍。", version: 1 },
  { id: "俯视", label: "俯视", prompt: "使用克制的45°高机位或轻俯拍展示空间、互动或产品组合，保证人体比例、重力与遮挡真实。", negativePrompt: "窥视角度，只突出私密部位的裁切", version: 1 },
  { id: "侧视", label: "侧视", prompt: "使用侧面、三分之四侧面或三分之四背面，展示身体自然轮廓、侧片结构、腰臀贴合和后片包裹。", negativePrompt: "刻意低机位仰拍臀部，窥视角度", version: 1 },
];

export const TONE_OPTIONS: PromptOption[] = [
  {
    id: "米色调",
    label: "米色调",
    prompt:
      "奶油白、米白、米杏、浅木和自然暖肤色为主，高明度、低饱和、低对比；画面温暖、安心、亲肤、有治愈感，但白色不发黄发脏。",
    negativePrompt: "浓黄滤镜，脏白墙，高饱和暖色，厚重暗调",
    version: 1,
  },
  {
    id: "蓝色调",
    label: "蓝色调",
    prompt:
      "天空蓝、海水蓝、浅天蓝、洁净白和自然暖肤色形成冷暖平衡；高明度、低饱和、清爽通透，专业但不冰冷、不医疗化。",
    negativePrompt: "高饱和科技蓝，脏灰，青橙调色，网红滤镜，冰冷实验室感",
    version: 1,
  },
];

export const ASPECT_RATIO_OPTIONS: PromptOption[] = [
  { id: "1:1", label: "1:1", prompt: "1:1正方形构图，适合商品卡片、社媒封面或半身环境肖像，主体与留白保持平衡。", version: 1 },
  { id: "2:3", label: "2:3", prompt: "2:3竖构图，适合全身或3/4身电商商品图，人物占比适中。", version: 1 },
  { id: "3:2", label: "3:2", prompt: "3:2横构图，适合开阔场景与品牌KV，人物与环境平衡。", version: 1 },
  { id: "3:4", label: "3:4", prompt: "3:4竖构图，默认电商主视觉画幅，人物约占45%–65%，保留环境与呼吸留白。", version: 1 },
  { id: "4:3", label: "4:3", prompt: "4:3横构图，适合双人互动与空间叙事，确保空间可读、人物完整。", version: 1 },
  { id: "9:16", label: "9:16", prompt: "9:16竖屏构图，适合短视频封面，人物纵向舒展，上下预留平台UI安全区。", version: 1 },
  { id: "16:9", label: "16:9", prompt: "16:9宽屏品牌KV构图，人物偏侧，保留大面积连续文案区；海边场景天空留白约50%–65%。", version: 1 },
];

export const RESOLUTION_OPTIONS: PromptOption[] = [
  { id: "1K", label: "1K 快速预览", prompt: "输出长边约1024px的快速预览图，保持主体与产品结构清楚。", version: 1 },
  { id: "2K", label: "2K 商业标准", prompt: "输出长边约2048px的商业标准图，眼睛、发丝、织物和产品边缘清晰。", version: 1 },
  { id: "4K", label: "4K 最终输出", prompt: "输出长边3000px以上的商业级高清图，保留皮肤、发丝、面料、木纹或海水的材质差异，避免HDR和过度锐化。", version: 1 },
];

export const IMAGE_COUNT_OPTIONS = [1, 2, 4, 6] as const;

const PRODUCT_FIDELITY_PROMPT =
  "用户上传的产品主参考图具有最高优先级。必须保持产品版型、腰头宽度、腿口弧线、缝线、纹理、颜色、图案、包边和比例一致；产品区域清晰且无遮挡，人物动作不得造成不合理扭曲。包装图出现时保持比例、结构、品牌色和主要识别区；无法可靠复现小字时保留版式与色块，不生成乱码假字。";

const PERSON_BASE_PROMPT =
  "人物必须是明确成年的22–30岁亚洲年轻女性，五官自然、身形健康匀称、妆容轻薄；保留真实肤色差异、轻微毛孔、细小绒毛和健康微光。状态自然放松、不摆拍、不网红化、不性感化。双人画面默认一位长发、一位短发，并在脸型、动作、高低或前后位置上至少有两项差异，避免复制脸与同步动作。";

const COMMON_NEGATIVE_PROMPT =
  "未成年人，儿童脸，年龄模糊，欧美模板脸，网红脸，复制脸，塑料皮肤，蜡像皮肤，过度磨皮，油腻高光，浓妆，挑逗表情，情趣内衣，透明衣物，色情姿势，刻意挺胸，刻意翘臀，过度性感，身体比例失真，超长腿，极细腰，多手，多脚，多手指，少手指，粘连手指，肢体融合，关节扭曲，错误重力，错误透视，头发穿模，衣物穿模，产品变形，腰头扭曲，腿口错误，缝线错误，面料融化，包装比例错误，乱码文字，低清晰度，模糊，噪点，压缩感，HDR过重，过度锐化，锐化白边，色带，假景深，过度虚化，超广角畸变，鱼眼，裁断头部，裁断手脚，水印，logo错误，边框，拼贴，廉价电商感，AI合成痕迹";

const ENGLISH_VISUAL_TYPE: Record<VisualTypeId, string> = {
  A: "Brand-emotion and lifestyle visual. Prioritize natural, clean, relaxed, lightweight, effortless premium storytelling over rigid feature demonstration.",
  B: "Authentic-use visual. Build credible product evidence through natural daily movement, showing softness, stretch, support, coverage, and stability without exaggeration.",
  C: "Product-feature visual. Reduce scene narrative and focus on material, construction, close-up details, and credible demonstrations of the selected selling points.",
};

const ENGLISH_SCENES: Record<string, string> = {
  "海边自在": "A natural open coastline with pale-blue sky, clear water, fine white waves, clean rocks or shallow beach; low-saturation blue and white, warm natural skin, layered depth, wind-consistent hair and clothing, generous copy space, relaxed travel energy.",
  "居家松弛": "A bright modern urban home with warm-white matte walls, light oak flooring, large windows, sheer cream curtains, rounded low-saturation furniture, directional natural window light, and a relaxed lived-in atmosphere.",
  "米色自在": "A lifestyle-oriented minimalist soft-light studio in cream, beige, pale apricot, and natural skin tones, with rounded structures, soft geometry, generous negative space, low contrast, and a clean skin-care-campaign quality.",
  "蓝色洁净": "A minimal pale-sky-blue studio with white or light-blue wardrobe, high-key low-saturation color, clean airiness, confident natural movement, and a professional but non-clinical atmosphere.",
  "居家柔弹与立体包裹": "A light home exercise setting with off-white walls, pale wood, natural window light, and simple furniture. Use credible stretching, turning, sitting, or reclining actions to demonstrate softness, elasticity, full coverage, stable fit, flat waistband, and non-rolling leg openings.",
  "蓝色洁净功能证据系统": "A clean pale-blue studio evidence system using authentic wearing states, front/back views, details, restrained stretch, or comparison compositions to prove lightweight comfort, softness, complete coverage, and stable fit.",
};

const ENGLISH_SELLING_POINTS: Record<string, string> = {
  "吸水": "Show credible absorbency while maintaining a dry and comfortable appearance; avoid exaggerated liquid effects.",
  "透气": "Express breathability through light airiness, visible fine fabric structure, and restrained flow; avoid fake technology particles.",
  "弹力拉伸": "Demonstrate elasticity with a realistic restrained stretch; preserve structure and show natural recovery.",
  "不起球": "Use a fabric close-up with a clean, even surface and fine fibers, without pilling.",
  "不掉絮": "Show clean fabric surfaces and crisp fiber edges without floating lint.",
  "灭菌": "Communicate cleanliness, safety, and trust for sterilization or antibacterial claims without cold medical equipment imagery.",
  "A类母婴级": "Communicate gentleness, safety, low irritation, and skin-friendly softness without childish maternity styling.",
  "便携不占行李": "Show compact, tidy folding and a believable travel-packing relationship to prove portability and minimal luggage space.",
  "亲肤柔软不扎": "Show soft skin contact, natural fit, fine cotton feel, and edges that do not press into the skin.",
  "透气不闷汗": "Show a fresh, light, dry wearing state without visible sweat or hard-sport advertising language.",
  "爽滑不粘腻": "Show smooth but non-glossy fabric, natural folds, and an easy non-sticky skin contact.",
  "不夹臀": "Use a three-quarter rear view or natural turn to show complete, symmetrical rear coverage without riding up or pinching.",
  "3D人体工学版型": "Use credible front, side, and back views to prove three-dimensional tailoring, natural fit, and complete support.",
  "大码包容": "Show inclusive fit on varied realistic body types without artificial slimming, pressure marks, or exaggerated comparison.",
};

const ENGLISH_SHOTS: Record<string, string> = {
  "全景": "Full environmental portrait with a complete figure, readable space, and a clear product area.",
  "中景": "Three-quarter-body framing balancing natural expression, movement, and wearing details.",
  "远景": "Wide environmental framing with a smaller figure, strong atmosphere, and generous brand-key-visual negative space.",
  "近景": "Medium close-up emphasizing expression, real skin, and close-fitting material while retaining essential product information.",
  "特写": "Close-up clearly showing fabric texture, waistband, leg opening, binding, or specified construction details.",
  "大特写": "Extreme close-up of fibers and craftsmanship while retaining enough structural context and avoiding voyeuristic framing.",
};

const ENGLISH_ANGLES: Record<string, string> = {
  "平视": "Eye-level camera with natural proportions for standard product presentation and candid lifestyle photography.",
  "俯视": "Restrained 45-degree high angle or gentle overhead view with believable anatomy, gravity, and occlusion.",
  "侧视": "Side, three-quarter side, or three-quarter rear view showing natural contours, side construction, waist-to-hip fit, and rear coverage.",
};

const ENGLISH_TONES: Record<string, string> = {
  "米色调": "Cream white, warm off-white, beige, pale apricot, light wood, and natural warm skin; high-key, low-saturation, low-contrast, warm but never yellow or dirty.",
  "蓝色调": "Sky blue, ocean blue, pale blue, clean white, and natural warm skin in a high-key low-saturation balance; fresh, transparent, professional, non-clinical.",
};

const WEIGHT_CN = { low: "低", medium: "中", high: "高" } as const;
const WEIGHT_EN = {
  low: "low influence: use only as a subtle secondary cue",
  medium: "medium influence: clearly reference the visual direction without copying",
  high: "high influence: strongly follow composition, lighting, color, and mood while preserving product and identity rules",
} as const;

export const PROMPT_REFINER_SYSTEM_INSTRUCTION = `
你是巴迪高品牌视觉提示词编排器。你的职责是润色已经由业务配置确定的提示词包，而不是重新创作规则。

必须遵守：
1. 不删除或弱化产品高保真、成年人身份、安全边界、场景视觉基因、景别、角度、影调、画幅、分辨率和负面约束。
2. 不添加用户没有提供的产品材质、认证、功效或包装文字事实。
3. 解决重复和语言冲突，让提示词清晰、可执行、摄影语言自然。
4. positivePrompt 使用中文为主，可保留必要英文摄影增强词；negativePrompt 保持逗号分隔。
5. 仅输出 JSON：{"title":"4至10字中文标题","positivePrompt":"最终正向提示词","negativePrompt":"最终负面提示词"}。
`;

function findOption(options: PromptOption[], id?: string) {
  return options.find((option) => option.id === id);
}

export function getSceneOptions(visualType: VisualTypeId) {
  return SCENE_OPTIONS[visualType];
}

export function getDefaultScene(visualType: VisualTypeId) {
  return SCENE_OPTIONS[visualType][0]?.id;
}

export function getRecommendedTone(visualType: VisualTypeId, scene?: string) {
  return findOption(SCENE_OPTIONS[visualType], scene)?.recommendedTone || (visualType === "C" ? "蓝色调" : "米色调");
}

export function compilePrompt(input: PromptCompileInput): CompiledPromptPackage {
  const fragments: SelectedPromptFragment[] = [];
  const negativeFragments: string[] = [COMMON_NEGATIVE_PROMPT];
  const warnings: string[] = [];

  const add = (group: string, option?: PromptOption) => {
    if (!option) return;
    fragments.push({
      group,
      id: option.id,
      label: option.label,
      prompt: option.prompt,
      version: option.version,
    });
    if (option.negativePrompt) negativeFragments.push(option.negativePrompt);
  };

  const visualType = findOption(VISUAL_TYPE_OPTIONS, input.visualType);
  const scene = findOption(SCENE_OPTIONS[input.visualType], input.scene);
  const shotScale = findOption(SHOT_SCALE_OPTIONS, input.shotScale);
  const cameraAngle = findOption(CAMERA_ANGLE_OPTIONS, input.cameraAngle);
  const tone = findOption(TONE_OPTIONS, input.tone);
  const aspectRatio = findOption(ASPECT_RATIO_OPTIONS, input.aspectRatio);
  const resolution = findOption(RESOLUTION_OPTIONS, input.resolution);

  add("visualType", visualType);
  add("scene", scene);
  input.productFunctions.forEach((id) => add("sellingPoint", findOption(SELLING_POINT_OPTIONS, id)));
  add("shotScale", shotScale);
  add("cameraAngle", cameraAngle);
  add("tone", tone);
  add("aspectRatio", aspectRatio);
  add("resolution", resolution);

  if (input.visualType !== "C" && !scene) warnings.push("当前视觉类型缺少有效场景，已仅使用通用品牌规则。");
  if (input.visualType === "C" && input.productFunctions.length === 0) warnings.push("C类视觉至少应选择一个产品功能卖点。");
  if (input.productImages.length === 0) warnings.push("未提供产品参考图，无法建立产品外观高保真约束。");

  const imageReferenceInstructions = [
    input.productImages.length
      ? `产品主参考图：${input.productImages.join("、")}。仅用于锁定产品外观与包装结构。`
      : "未提供产品主参考图。",
    input.characterImages.length
      ? `人物参考图：${input.characterImages.join("、")}。仅用于人物身份、五官、发型与体型一致性。`
      : "未提供人物参考图，使用巴迪高默认成年亚洲女性规范。",
    input.referenceImages.length
      ? `风格参考图：${(input.referenceImageWeights?.length
          ? input.referenceImageWeights.map((item) => `${item.name}（权重：${WEIGHT_CN[item.weight]}）`)
          : input.referenceImages).join("、")}。权重用于控制风格影响强度；仅影响构图、光影、色彩与氛围，不得改变产品结构或人物身份。`
      : "未提供额外风格参考图。",
  ].join("\n");

  const analysisInstructions = (input.imageAnalyses || [])
    .map((analysis) => {
      const observed = analysis.observableFeatures.length
        ? `可观察特征：${analysis.observableFeatures.join("、")}`
        : "可观察特征：暂无可靠视觉分析";
      const preserve = analysis.mustPreserve.length
        ? `必须保持：${analysis.mustPreserve.join("、")}`
        : "";
      const influence = analysis.allowedInfluence.length
        ? `允许影响：${analysis.allowedInfluence.join("、")}`
        : "";
      return `${analysis.name}（${analysis.role}）：${analysis.summary}\n${observed}${preserve ? `\n${preserve}` : ""}${influence ? `\n${influence}` : ""}`;
    })
    .join("\n\n");

  const sections = [
    "【品牌与任务】\n巴迪高高级商业视觉生成。真实相机成像、自然生活抓拍感与高级品牌精致度并存。",
    `【视觉类型】\n${visualType?.prompt || "按巴迪高品牌视觉规范生成。"}`,
    scene ? `【场景视觉基因】\n${scene.prompt}` : "",
    `【人物规范】\n${PERSON_BASE_PROMPT}`,
    `【产品与参考图】\n${PRODUCT_FIDELITY_PROMPT}\n${imageReferenceInstructions}${analysisInstructions ? `\n\n【图片视觉分析】\n${analysisInstructions}` : ""}`,
    input.productFunctions.length
      ? `【卖点视觉表达】\n${input.productFunctions
          .map((id) => findOption(SELLING_POINT_OPTIONS, id)?.prompt)
          .filter(Boolean)
          .join("\n")}`
      : "",
    `【摄影参数】\n${shotScale?.prompt || input.shotScale} ${cameraAngle?.prompt || input.cameraAngle}`,
    `【色彩与输出】\n${tone?.prompt || input.tone} ${aspectRatio?.prompt || input.aspectRatio} ${resolution?.prompt || input.resolution}`,
    `【批次要求】\n本次生成${input.imageCount}张；保持品牌、产品与人物规则一致，同时让构图和动作具有合理差异，避免复制画面。`,
    input.originalPrompt.trim() ? `【用户补充创意】\n${input.originalPrompt.trim()}` : "",
    "【质量底线】\n产品还原优先于创意发挥；人物、产品、家具或自然环境之间的重力、遮挡、透视、受光和材质关系必须真实。",
  ].filter(Boolean);

  const sceneLabel = scene?.label || input.productFunctions.slice(0, 2).join("·") || "品牌视觉";

  const englishReferenceInstructions = [
    input.productImages.length
      ? `Product master references: ${input.productImages.join(", ")}. Use them to lock silhouette, waistband, leg openings, seams, texture, color, pattern, binding, proportions, and packaging structure.`
      : "No product master reference was provided.",
    input.characterImages.length
      ? `Character identity references: ${input.characterImages.join(", ")}. Preserve identity, facial features, hairstyle, and body proportions only.`
      : "No character reference was provided; use an unmistakably adult Asian woman aged 22–30 with natural features and healthy proportions.",
    input.referenceImageWeights?.length
      ? `Style references: ${input.referenceImageWeights.map((item, index) => `Reference ${index + 1} '${item.name}' — ${WEIGHT_EN[item.weight]}`).join("; ")}. Style references may affect only composition, lighting, color, grading, and mood; they must never alter product construction or character identity.`
      : "No additional style reference was provided.",
  ].join("\n");

  const englishSections = [
    "[BRAND AND TASK]\nBadigao premium commercial visual. Combine realistic camera rendering, candid natural lifestyle photography, and refined brand polish.",
    `[VISUAL TYPE]\n${ENGLISH_VISUAL_TYPE[input.visualType]}`,
    scene ? `[SCENE DNA]\n${ENGLISH_SCENES[scene.id] || scene.label}` : "",
    "[PERSON]\nUse an unmistakably adult Asian woman aged 22–30 with natural facial features, healthy balanced proportions, light makeup, real skin tone variation, subtle pores and fine hair. Keep the pose relaxed, non-influencer-like, non-sexualized, and physically believable.",
    `[PRODUCT AND REFERENCES]\nThe uploaded product master reference has the highest priority. Product fidelity overrides creative variation. Preserve silhouette, waistband width, leg-opening curve, seams, texture, color, pattern, binding, and proportions. Keep the product clear and unobstructed.\n${englishReferenceInstructions}`,
    input.productFunctions.length
      ? `[SELLING-POINT EXPRESSION]\n${input.productFunctions.map((id) => ENGLISH_SELLING_POINTS[id]).filter(Boolean).join("\n")}`
      : "",
    `[CAMERA]\n${ENGLISH_SHOTS[input.shotScale] || input.shotScale} ${ENGLISH_ANGLES[input.cameraAngle] || input.cameraAngle}`,
    `[COLOR AND OUTPUT]\n${ENGLISH_TONES[input.tone] || input.tone} Aspect ratio ${input.aspectRatio}. Target resolution ${input.resolution}.`,
    `[BATCH]\nGenerate ${input.imageCount} image${input.imageCount === 1 ? "" : "s"}. Keep brand, product, and identity rules consistent while allowing only reasonable variation in pose, framing, or subtle composition.`,
    input.originalPrompt.trim()
      ? `[ADDITIONAL CREATIVE DIRECTION — ORIGINAL USER TEXT]\n${input.originalPrompt.trim()}`
      : "",
    "[QUALITY FLOOR]\nProduct fidelity takes priority over creativity. Gravity, occlusion, perspective, lighting, anatomy, fabric behavior, furniture, and natural-environment relationships must remain physically credible.",
  ].filter(Boolean);

  const englishNegativePrompt = [
    "minor, childlike face, ambiguous age, copied face, influencer face, plastic skin, waxy skin, excessive retouching, oily highlights, heavy makeup, seductive expression, erotic lingerie, transparent clothing, sexual pose, exaggerated chest, exaggerated buttocks, voyeuristic angle, distorted anatomy, extra limbs, extra fingers, missing fingers, fused fingers, twisted joints, incorrect gravity, incorrect perspective, hair clipping, garment clipping, product deformation, twisted waistband, incorrect leg openings, incorrect seams, melted fabric, wrong packaging proportions, gibberish text, low resolution, blur, noise, compression artifacts, excessive HDR, oversharpening, halos, banding, fake depth of field, excessive bokeh, fisheye, cropped head, cropped hands, cropped feet, watermark, incorrect logo, border, collage, cheap e-commerce look, obvious AI artifacts",
    ...(scene?.negativePrompt ? ["Avoid the scene-specific failures defined in the Chinese display version."] : []),
  ].join(", ");

  return {
    title: `${input.visualType}类·${sceneLabel}`,
    positivePrompt: sections.join("\n\n"),
    negativePrompt: negativeFragments.join("，"),
    positivePromptEnglish: englishSections.join("\n\n"),
    negativePromptEnglish: englishNegativePrompt,
    selectedFragments: fragments,
    warnings,
    configVersion: PROMPT_CONFIG_VERSION,
  };
}
