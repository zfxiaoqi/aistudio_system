export type VisualTypeId = "A" | "B" | "C" | "R";
export type ReplacementModeId = "服装+场景替换" | "产品替换" | "服装替换";

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
  replacementMode?: ReplacementModeId;
  replacementWorkflow?: 'pose_rebuild' | 'product_only' | 'multi_replace';
  sceneSource?: 'preset' | 'reference';
  scene?: string;
  productFunctions: string[];
  shotScale: string;
  cameraAngle: string;
  tone: string;
  originalPrompt: string;
  resolution: string;
  aspectRatio: string;
  imageCount: number;
  modelCount: number;
  multiPersonMode?: boolean;
  personBindings?: Array<{
    slotId: string;
    label: string;
    sourcePosition: string;
    operation: string;
    characterImage?: string;
    productImage?: string;
    upperGarmentImage?: string;
    lowerGarmentImage?: string;
  }>;
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
  | "character_garment_reference"
  | "style_reference"
  | "replacement_reference";

export type ReplacementReferenceCategory =
  | "base_image"
  | "scene"
  | "upper_garment"
  | "lower_garment"
  | "composition"
  | "action";

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
  referenceCategory?: ReplacementReferenceCategory;
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

export const PROMPT_CONFIG_VERSION = "badigao-v1.3.0";

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
  {
    id: "R",
    label: "替换模式",
    description: "百分百复刻姿势、动作、视角与构图",
    prompt:
      "参考图精确替换视觉。替换参考图只负责四项硬约束：姿势、动作、图片视角和构图必须百分百复刻，包括肢体角度、重心、手脚位置、头部朝向、动作状态、机位高低、俯仰方向、景别、裁切、人物位置占比、留白和元素空间关系。不得参考或复制替换参考图中的人物身份、面孔、身体特征、服装设计、光源、色温、明暗关系和影调；人物由人物参考图或品牌规范决定，产品由产品主图决定，光影由所选场景和页面色调决定。",
    version: 3,
  },
];

const BASE_SCENE_OPTIONS: Record<"A" | "B" | "C", PromptOption[]> = {
  A: [
    {
      id: "海边自在",
      label: "海边自在",
      description: "蓝白海岸与轻旅行感",
      recommendedTone: "蓝色调",
      prompt:
        "蓝白主调、清透自然光、海边礁石、开阔天空、大面积留白、轻旅行感、真实笑容、自然风感、清爽亚裔女性、轻松出发、干净即自在、治愈松弛、真实商业摄影。",
      negativePrompt:
        "旅游打卡照，游客合影，商业假笑，椰树度假风，泳圈，堆叠遮阳伞，巨浪，风暴，戏剧性晚霞，金色夕阳，过饱和蓝天，荧光海水，虚假蓝幕，棚拍海景，背景贴图，海平线倾斜",
      version: 2,
    },
    {
      id: "绿色草地",
      label: "绿色草地",
      description: "开阔蓝天、鲜活草坪与阳光生命力",
      recommendedTone: "蓝色调",
      prompt:
        "开阔洁净的蓝天草坪品牌大片。晴朗通透的中高明度蔚蓝天空，大面积连续柔软草坪，草色自然并带黄绿变化，低地平线，远处仅保留低矮树线或柔和丘坡；空气清澈无灰雾，微风轻动。使用明亮自然日光、大面积天空留白与低机位呼吸感构图。整体清爽、自在、舒适、阳光且富有年轻生命力；人物真实放松、自然舒展，互动亲近而不刻意表演。核心关键词：开阔蓝天、鲜活草坪、自然阳光、洁净空气感、低地平线、大面积留白、低机位、微风、轻盈动态、真实笑容、自然抓拍、自在舒适、清爽洁净、阳光生命力、亲近陪伴、高级真实商业摄影、不过度精修。",
      negativePrompt:
        "海边，海洋，海水，沙滩，礁石，海岸线，室内空间，摄影棚内景，墙壁，窗帘，家具，阴天灰雾，雾霾，灰蒙滤镜，荧光绿草地，塑料假草，过饱和蓝天，青绿色偏色，杂乱树林，高树线遮挡天空，天空面积过小，正午硬顶光，戏剧性夕阳，商业假笑，游客打卡照，僵直摆拍，道具堆叠，过度锐化草叶，背景贴图，棚拍草地",
      version: 2,
    },
    {
      id: "居家松弛",
      label: "居家松弛",
      description: "日照感与真实生活温度",
      recommendedTone: "米色调",
      prompt:
        "奶油米白、暖白自然光、原木色地板、浅色墙面、纱帘落地窗、亚洲女性、居家松弛、生活感、朋友陪伴感、柔软亲肤、不费力高级感、自然笑容、身体舒展、低饱和配色、真实商业摄影。",
      negativePrompt:
        "深色豪宅，黑灰工业风，冷蓝办公室，复古宫廷，浓重侘寂，杂乱背景，廉价出租屋，厚重深色窗帘，红木家具，镜面大理石，过多绿植，纯白无生活感影棚，正面环形灯，全画面黄滤镜",
      version: 2,
    },
    {
      id: "米色自在",
      label: "米色自在",
      description: "柔光棚拍与亲肤质感",
      recommendedTone: "米色调",
      prompt:
        "奶油米白、柔光棚拍、极简空间、圆弧包裹、自然女性、轻松笑容、贴身舒适、高级生活方式、低饱和、真实商业摄影。",
      negativePrompt:
        "强轮廓光，冷科技光，黑白高反差，商业硬棚光，复杂家居，花朵堆叠，少女化元素，美妆广告感，冷漠时尚脸，性感内衣展示",
      version: 2,
    },
    {
      id: "蓝色洁净",
      label: "蓝色洁净",
      description: "浅蓝棚拍与专业洁净感",
      recommendedTone: "蓝色调",
      prompt:
        "浅蓝洁净棚拍、蓝白主调、极简背景、清爽空气感、单人轻动态、双人前后对照、正反面版型展示、后臀完整包裹、竖纹纯棉肌理、局部细节特写、轻拉腿口弹性、高弹橡筋、柔软亲肤、不勒不夹、不卡裆、双层底裆、EO灭菌、10A抗菌、A类母婴级、安全温和、真实商业摄影。",
      negativePrompt:
        "冰冷实验室，医疗器械感，冷科技蓝，高饱和品牌蓝，复杂道具，家居杂物，硬质塑料背景，僵硬证件照，性感时尚大片",
      version: 2,
    },
  ],
  B: [
    {
      id: "居家柔弹与立体包裹",
      label: "居家柔弹",
      description: "真实动作证明柔弹包裹",
      recommendedTone: "米色调",
      prompt:
        "米白居家、自然窗光、轻运动伸展、柔性蓝色球体、真实亚洲女性、身体自然舒展、腰头拉伸、臀部立体包裹、三分之四背面、细腻竖纹面料、裤脚平整、不勒不夹、动作不移位、柔软回弹、日常生活感、真实商业摄影。",
      negativePrompt:
        "专业健身房，硬核瑜伽，竞技运动，汗流浃背，夸张拉伸，肌肉强化，刻意臀部展示，窥视角度，高难度后弯，产品被拉薄，腰头卷边，裤脚错位",
      version: 2,
    },
    {
      id: "蓝色洁净功能证据系统",
      label: "简约蓝色影棚",
      description: "蓝白棚拍证明穿着性能",
      recommendedTone: "蓝色调",
      prompt:
        "浅蓝与纯白构成的极简无影棚拍环境，干净连续背景，柔和均匀的高调漫射光，清晰自然且克制的落影，低饱和蓝白配色，通透明亮的空气感，简洁有序的空间层次，整体呈现洁净、可信、理性而不冰冷的专业电商商业氛围，适用于详情页、卖点图与首焦功能图。场景仅定义环境、灯光、色彩与商业氛围，不主动规定陈列台、人物数量、人物动作、正反面关系、产品结构、材质、拉伸方式或局部特写；上传创意基准参考图时，参考图已有主体、道具、人物关系和构图骨架优先于场景的通用空间描述。",
      negativePrompt:
        "冰冷医疗实验室，手术室，医疗器械台，冷硬科技蓝，高饱和荧光蓝，复杂实验道具，杂乱背景，家居杂物，硬塑料布景，强烈镜面反射，戏剧化彩光，阴暗低调光，过度科技粒子，廉价影楼感",
      version: 3,
    },
  ],
  C: [],
};

export const SCENE_OPTIONS: Record<VisualTypeId, PromptOption[]> = {
  ...BASE_SCENE_OPTIONS,
  R: BASE_SCENE_OPTIONS.A,
};

const REPLACEMENT_EXACT_LOCK_NEGATIVE =
  "姿势改变，动作改变，肢体角度偏移，重心改变，手部位置变化，脚部位置变化，头部朝向改变，腿部姿态变化，关节弯曲方向改变，躯干倾斜角度变化，动作幅度变化，图片视角改变，机位高度变化，俯仰方向变化，镜头方向变化，构图改变，景别改变，裁切改变，画幅改变，人物位置偏移，人物占比变化，留白方向变化，元素空间关系变化";
const PRODUCT_REPLACEMENT_NEGATIVE =
  "产品版型变形，腰头扭曲，腿口不对称，缝线错误，面料纹理丢失，竖纹肌理缺失，品牌色偏差，包装比例错误，产品被遮挡，产品漂浮，面料塑料感，腰头过紧勒肉，腰头过松空荡，裤脚卷边，裆部堆褶，产品因姿势不合理扭曲，乱码包装文字";
const PERSON_REPLACEMENT_NEGATIVE =
  "未成年人，幼态脸，儿童体型，网红脸，欧美化五官，夸张长腿，极端瘦身，浓妆，烟熏妆，夸张睫毛，强修容，塑料皮肤，蜡像皮肤，过度磨皮，油亮皮肤，毛孔完全消失，橙黄色皮肤，灰暗肤色，挑逗表情，刻意性感，僵硬站姿，身体比例失真，畸形手臂，多余肢体，缺失手指，多余手指，粘连手指";

export const REPLACEMENT_MODE_OPTIONS: PromptOption[] = [
  {
    id: "服装+场景替换",
    label: "服装+场景替换",
    description: "精确复刻姿势动作视角构图，替换场景与服装",
    prompt:
      "【替换模式：服装+场景替换】替换参考图中的姿势、动作、图片视角和构图必须百分百复刻：保持肢体角度、重心、手脚位置、头部朝向、动作状态、机位、俯仰方向、景别、裁切、人物位置占比、留白和元素空间关系不变。替换参考图中的人物身份、面孔、身体特征、服装和光影调性不作为约束。人物使用人物参考图或20–25岁亚洲年轻女性品牌规范；场景与光影完全使用用户选择的A类场景及页面色调；服装替换为用户上传的巴迪高产品，版型、腰头宽度、腿口弧线、缝线、颜色、图案、包边和纯棉竖纹面料肌理必须准确。商业生活方式摄影级真实度，发丝、面料和产品边缘清晰。",
    negativePrompt: `${REPLACEMENT_EXACT_LOCK_NEGATIVE}，${PRODUCT_REPLACEMENT_NEGATIVE}`,
    version: 3,
  },
  {
    id: "产品替换",
    label: "产品替换",
    description: "精确复刻姿势动作视角构图，仅替换产品包装",
    prompt:
      "【替换模式：产品替换】替换参考图中的姿势、动作、图片视角和构图必须百分百复刻；若画面有人物，保持肢体角度、重心、手脚位置、头部朝向和动作状态不变；保持机位、俯仰方向、景别、裁切、画幅、元素位置、产品占位、留白和空间关系不变。替换参考图中的人物身份、面孔、身体特征和光影调性不作为约束，可按人物参考图、品牌规范和页面色调重新生成。只将产品或包装替换为用户上传的巴迪高产品及包装，包装比例、结构、品牌色、主要识别区，以及产品版型、腰头、腿口、缝线和面料纹理必须准确。商业摄影级真实度，产品边缘、包装主要识别区和面料纹理清晰。",
    negativePrompt: `${REPLACEMENT_EXACT_LOCK_NEGATIVE}，${PRODUCT_REPLACEMENT_NEGATIVE}`,
    version: 3,
  },
  {
    id: "服装替换",
    label: "服装替换",
    description: "精确复刻姿势动作视角构图，替换人物与服装",
    prompt:
      "【替换模式：服装替换】替换参考图中的姿势、动作、图片视角和构图必须百分百复刻：保持肢体角度、重心、手脚位置、头部朝向、动作状态、身体曲线走向、机位、俯仰方向、景别、裁切、人物位置占比、留白和元素空间关系不变。替换参考图中的人物身份、面孔、身体特征和光影调性不作为约束。人物使用人物参考图或20–25岁亚洲年轻女性品牌规范；光影与色调使用页面选择和品牌场景要求；服装替换为用户上传的巴迪高产品及克制的白色或奶油白基础上装，版型、腰头宽度、腿口弧线、缝线、颜色、包边和纯棉竖纹肌理必须准确。若参考图出现包装，可替换为巴迪高包装但保持其构图位置和占比。商业生活方式摄影级真实度，皮肤真实柔和。",
    negativePrompt: `${REPLACEMENT_EXACT_LOCK_NEGATIVE}，${PERSON_REPLACEMENT_NEGATIVE}，${PRODUCT_REPLACEMENT_NEGATIVE}`,
    version: 3,
  },
];

export const SELLING_POINT_OPTIONS: PromptOption[] = [
  {
    id: "吸水",
    label: "吸水",
    prompt:
      "面料表面滴落浅色透明液体后被快速吸收，表层不留水渍积聚，贴肤面保持干爽；液体自然滴落接触面料，面料快速吸收下渗，反面贴肤面保持相对干燥，不反渗，画面干净有呼吸感，保持品牌高级商业摄影气质。",
    version: 2,
  },
  {
    id: "透气",
    label: "透气",
    prompt:
      "面料在背光下展示细密透气纹理与孔隙，面料层次感与空气感同时呈现，画面干净通透有呼吸感；面料被轻吹或自然气流吹动呈现轻盈飘动感，可配合蒸汽雾气示意空气透过面料，湿热气可排出，皮肤表面不积热。",
    version: 2,
  },
  {
    id: "弹力拉伸",
    label: "弹力拉伸",
    prompt:
      "腰头、裤脚、面料的延展与回弹过程清晰可见，拉伸幅度真实可信，不变形不开裂，拉伸后松手面料自然回缩；双手轻拉腰头展示延展幅度，双手拉伸面料一角展示回弹过程，拉伸动作手部姿态自然。",
    version: 2,
  },
  {
    id: "不起球",
    label: "不起球",
    prompt:
      "面料表面纹理清晰无起球颗粒，面料在光照下表面干净无杂质；面料表面特写纹理清晰无起球颗粒，可配合摩擦动作如手轻抚面料表面依然平整。",
    version: 2,
  },
  {
    id: "不掉絮",
    label: "不掉絮",
    prompt:
      "面料纤维结构紧密稳定，画面干净无飞纤维；面料在抖动拉扯状态下周围无飞絮飘落，面料表面在强光下特写无松散纤维，可配合深色背景板反衬。",
    version: 2,
  },
  {
    id: "灭菌",
    label: "灭菌",
    prompt:
      "洁净安全的视觉气质承接EO灭菌、10A抗菌、无菌级标准，产品展开在洁净浅色背景上呈现无菌感；产品包装特写展示灭菌标识认证信息，产品展开在洁净浅色背景上呈现无菌感。",
    version: 2,
  },
  {
    id: "A类母婴级",
    label: "A类母婴级",
    prompt:
      "面料在柔光下展现细腻纹理无刺激感，柔和安全低刺激；面料特写呈现柔软温和触感，可配合柔和婴儿肌肤色调暖光氛围，产品与简洁的A类标识认证符号配合。",
    version: 2,
  },
  {
    id: "便携不占行李",
    label: "便携不占行李",
    prompt:
      "产品折叠后体积小适合旅行携带，多件产品折叠后整齐排列体现小巧，保持品牌旅行生活方式高级感；产品折叠过程展示展开折叠收纳，折叠后产品与行李箱旅行包手包的尺寸对比。",
    version: 2,
  },
  {
    id: "亲肤柔软不扎",
    label: "亲肤柔软不扎",
    prompt:
      "面料采用柔软纤维工艺，表面无硬质纤维刺感，接触皮肤时温和无刺激；面料轻贴皮肤如手臂腰部呈现自然贴合感，面料在指尖轻抚下展现柔软状态，可配合手部动作轻揉。",
    version: 2,
  },
  {
    id: "透气不闷汗",
    label: "透气不闷汗",
    prompt:
      "面料透气结构使湿热气可排出汗液不积聚，皮肤表面保持清爽，清爽感通过光感与色调传达；面料在背光下展示透气孔隙结构，可配合轻吹自然气流面料轻盈飘动，面料贴肤状态呈现清爽。",
    version: 2,
  },
  {
    id: "爽滑不粘腻",
    label: "爽滑不粘腻",
    prompt:
      "面料表面爽滑处理，接触皮肤时不黏附，湿热环境下不粘身，穿脱顺滑无阻力；面料在指尖滑过呈现顺滑质感，面料轻贴皮肤后自然滑落展现不粘特性，面料在光线下展现细腻光泽感。",
    version: 2,
  },
  {
    id: "不夹臀",
    label: "不夹臀",
    prompt:
      "产品采用合理后片剪裁，臀部覆盖完整动作中后片不上移，后片左右对称弧线自然贴合臀部；三分之四背面视角展示后片完整覆盖，自然动作如行走弯腰坐下后后片仍稳定。",
    version: 2,
  },
  {
    id: "3D人体工学版型",
    label: "3D人体工学版型",
    prompt:
      "产品采用3D立体剪裁，正面背面侧面弧线贴合人体曲线，不平铺不堆褶不空荡；正面视角展示腰部裆部裤脚对称性，背面视角展示后片覆盖臀线弧度，侧面视角展示腰臀过渡裤脚弧线。",
    version: 2,
  },
  {
    id: "大码包容",
    label: "大码包容",
    prompt:
      "产品版型设计包容不同体型，弹力与剪裁适应不同身材，大码身材也能稳定包裹，不勒肉不空荡不夹臀；不同体型的模特穿着同一产品均呈现贴合舒适，大码模特展示产品包裹完整不勒肉。",
    version: 2,
  },
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
      "奶油白、米白、米杏、浅裸色、暖白自然光为主，高明度、低饱和、低对比；温暖、亲肤、具高级生活方式感、治愈感；白色不发黄漂蓝、绿色仅作点缀、品牌蓝仅出现于识别。",
    negativePrompt: "高饱和艳色，脏灰色，网红滤镜色，厚重暗调，冷科技光，黑白高反差，商业硬棚光，白色漂蓝，发黄发脏",
    version: 2,
  },
  {
    id: "蓝色调",
    label: "蓝色调",
    prompt:
      "天空蓝、海水蓝、浅天蓝、洁净白为主，高明度、低饱和、清爽、通透、空气感强；清爽、安全、值得信赖、干净专业但不冰冷；人物肤色自然偏暖，环境清爽偏冷，冷暖平衡。",
    negativePrompt: "高饱和艳色，脏灰色，网红滤镜色，厚重暗调，冷科技蓝，医疗器械感，冰冷实验室感，强轮廓光，冷科技光，黑白高反差，商业硬棚光",
    version: 2,
  },
];

export const ASPECT_RATIO_OPTIONS: PromptOption[] = [
  { id: "1:1", label: "1:1", prompt: "1:1正方形构图，适合商品卡片、社媒封面或半身环境肖像，主体与留白保持平衡。", version: 1 },
  { id: "2:3", label: "2:3", prompt: "2:3竖构图，适合全身或3/4身电商商品图，人物占比适中。", version: 1 },
  { id: "3:2", label: "3:2", prompt: "3:2横构图，适合开阔场景与品牌KV，人物与环境平衡。", version: 1 },
  { id: "3:4", label: "3:4", prompt: "3:4竖构图，默认电商主视觉画幅，人物约占45%–65%，保留环境与呼吸留白。", version: 1 },
  { id: "4:3", label: "4:3", prompt: "4:3横构图，适合双人互动与空间叙事，确保空间可读、人物完整。", version: 1 },
  { id: "9:16", label: "9:16", prompt: "9:16竖屏构图，适合短视频封面，人物纵向舒展，上下预留平台UI安全区。", version: 1 },
  { id: "16:9", label: "16:9", prompt: "16:9宽屏品牌KV构图，人物偏侧，保留大面积连续文案区；开阔户外场景应保留充足天空或环境留白。", version: 2 },
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
  "人物必须是明确成年的20–25岁亚洲年轻女性，五官自然、身形健康匀称、妆容轻薄；保留真实肤色差异、轻微毛孔、细小绒毛和健康微光。状态自然放松、不摆拍、不网红化、不性感化。双人画面默认一位长发、一位短发，并在脸型、动作、高低或前后位置上至少有两项差异，避免复制脸与同步动作。";

const COMMON_NEGATIVE_PROMPT =
  "未成年人，儿童脸，年龄模糊，欧美模板脸，网红脸，复制脸，塑料皮肤，蜡像皮肤，过度磨皮，油腻高光，浓妆，挑逗表情，情趣内衣，透明衣物，色情姿势，刻意挺胸，刻意翘臀，过度性感，身体比例失真，超长腿，极细腰，多手，多脚，多手指，少手指，粘连手指，肢体融合，关节扭曲，错误重力，错误透视，头发穿模，衣物穿模，产品变形，腰头扭曲，腿口错误，缝线错误，面料融化，包装比例错误，乱码文字，低清晰度，模糊，噪点，压缩感，HDR过重，过度锐化，锐化白边，色带，假景深，过度虚化，超广角畸变，鱼眼，裁断头部，裁断手脚，水印，logo错误，边框，拼贴，廉价电商感，AI合成痕迹";

const ENGLISH_VISUAL_TYPE: Record<VisualTypeId, string> = {
  A: "Brand-emotion and lifestyle visual. Prioritize natural, clean, relaxed, lightweight, effortless premium storytelling over rigid feature demonstration.",
  B: "Authentic-use visual. Build credible product evidence through natural daily movement, showing softness, stretch, support, coverage, and stability without exaggeration.",
  C: "Product-feature visual. Reduce scene narrative and focus on material, construction, close-up details, and credible demonstrations of the selected selling points.",
  R: "Reference-guided replacement visual. Reproduce the replacement reference pose, action, camera viewpoint, and composition exactly. Do not inherit the replacement reference person, identity, face, body traits, garment design, lighting, color temperature, or tonal mood. Person appearance comes from the character reference or brand standard; product design comes from the product master; lighting and tone come from the selected scene and UI settings.",
};

const ENGLISH_REPLACEMENT_MODES: Record<ReplacementModeId, string> = {
  "服装+场景替换": "GARMENT + SCENE REPLACEMENT. Reproduce the replacement reference pose, action, camera viewpoint, shot scale, crop, subject placement, negative space, and composition exactly. Do not copy or constrain the person, identity, face, body traits, source garment, lighting, color temperature, or tonal mood. Use the character reference or the brand standard of a clearly adult young Asian woman aged 20–25 for the person; use the selected A-scene and UI tone for environment and lighting; replace the garment with the uploaded Badigao product at highest fidelity.",
  "产品替换": "PRODUCT REPLACEMENT. Reproduce the replacement reference pose and action where people are present, and reproduce camera viewpoint, shot scale, crop, aspect ratio, object placement, product footprint, negative space, and composition exactly. Do not copy or constrain the reference person, identity, face, body traits, lighting, color temperature, or tonal mood. Replace only the product or packaging with the uploaded Badigao product at highest fidelity.",
  "服装替换": "GARMENT REPLACEMENT. Reproduce the replacement reference pose, action, body-line direction, camera viewpoint, shot scale, crop, subject placement, negative space, and composition exactly. Do not copy or constrain the reference person, identity, face, body traits, lighting, color temperature, or tonal mood. Use the character reference or the brand standard of a clearly adult young Asian woman aged 20–25 for the person, UI settings for lighting and tone, and the uploaded Badigao product for garment design.",
};

const ENGLISH_REPLACEMENT_NEGATIVES: Record<ReplacementModeId, string> = {
  "服装+场景替换": "changed pose, changed action, shifted limb angle, changed weight distribution, moved hands, moved feet, changed head direction, changed camera viewpoint, changed camera height, changed tilt, changed shot scale, changed crop, changed aspect ratio, shifted subject placement, changed negative space, changed composition, deformed product silhouette, twisted waistband, asymmetric leg openings, incorrect seams, missing ribbed texture, wrong brand color, plastic fabric, obscured product",
  "产品替换": "changed pose, changed action, changed camera viewpoint, changed camera height, changed tilt, changed shot scale, changed crop, changed aspect ratio, moved elements, changed product footprint, changed negative space, changed composition, deformed product, wrong packaging proportions, gibberish packaging text",
  "服装替换": "changed pose, changed action, changed body-line direction, shifted limb angle, moved hands, moved feet, changed head direction, changed camera viewpoint, changed shot scale, changed crop, changed aspect ratio, shifted subject placement, changed negative space, changed composition, childlike person, influencer face, plastic skin, sexualized pose, deformed garment, twisted waistband, incorrect leg openings, missing ribbed texture, wrong packaging",
};

const ENGLISH_SCENES: Record<string, string> = {
  "海边自在": "Blue-and-white tone, fresh natural light, seaside rocks, open sky, generous negative space, light-travel energy, genuine smiles, natural breeze, fresh-looking Asian woman, easy departure, clean and effortless, healing relaxation, real commercial photography.",
  "绿色草地": "Create an open, clean blue-sky grassland brand campaign. Use a clear medium-to-high-value blue sky, a broad continuous soft lawn with natural yellow-green variation, a low horizon, and only a low tree line or gentle distant slope. Keep the air transparent and haze-free, with bright natural sunlight, a light breeze, generous sky negative space, and a breathable low-camera composition. The mood is fresh, effortless, comfortable, sunny, youthful, and full of life. People should feel genuinely relaxed and naturally expressive, with warm, unforced interaction. Core keywords: open blue sky, vivid lawn, natural sunlight, clean airy atmosphere, low horizon, generous negative space, low camera, light breeze, gentle motion, genuine smiles, candid photography, effortless comfort, fresh cleanliness, sunny vitality, warm companionship, premium realistic commercial photography, restrained retouching.",
  "居家松弛": "Creamy beige, warm white natural light, wooden flooring, light walls, sheer curtains and floor-to-ceiling windows, Asian woman, home relaxation, daily life feeling, sense of companionship, soft and skin-friendly, effortless sophistication, natural smiles, relaxed body posture, low-saturation color palette, real commercial photography.",
  "米色自在": "Creamy beige, soft light studio, minimalist space, rounded structures, natural woman, relaxed smiles, skin-friendly comfort, high-end lifestyle, low saturation, real commercial photography.",
  "蓝色洁净": "Pale blue clean studio, blue-and-white tone, minimalist background, fresh airy feeling, single-person light motion, dual-person front-and-back comparison, product structure demonstration, full rear coverage, ribbed cotton texture, partial detail close-up, light stretch at leg opening, high-elastic rubber band, soft and skin-friendly, non-binding/non-pinching, no wedgie, double-layered crotch, EO sterilization, 10A antibacterial, A-class maternal/infant level, safe and gentle, real commercial photography.",
  "居家柔弹与立体包裹": "Creamy beige home, natural window light, light exercise stretching, soft blue spheres, real Asian woman, natural body stretching, waistband stretching, 3D hip coverage, 3/4 rear view, fine ribbed fabric texture, flat leg openings, non-binding/non-pinching, no shifting, soft resilience, daily life feeling, real commercial photography.",
  "蓝色洁净功能证据系统": "A minimalist seamless studio environment built from pale blue and pure white, with a clean continuous backdrop, soft even high-key diffused light, restrained natural cast shadows, a low-saturation blue-and-white palette, bright transparent airiness, and simple orderly spatial depth. The atmosphere should feel clean, credible, rational without becoming clinical, and professionally suited to e-commerce detail pages, selling-point graphics, and hero functional visuals. This scene defines environment, lighting, color, and commercial atmosphere only; it must not introduce a display plinth or prescribe props, person count, action, front/rear comparison, product construction, material, stretching method, or detail close-up. When a creative base reference is uploaded, its existing subjects, props, relationships, and composition skeleton take priority over generic spatial suggestions from this scene.",
};

const ENGLISH_SCENE_NEGATIVES: Record<string, string> = {
  "绿色草地": "seaside, sea, ocean, seawater, beach, sand, seaside rocks, coastline, indoor space, indoor studio, wall, curtains, furniture, overcast gray sky, haze, smog, gray filter, fluorescent green grass, plastic artificial turf, oversaturated blue sky, cyan-green color cast, cluttered forest, tall tree line blocking the sky, insufficient sky area, harsh midday top light, dramatic sunset, fake commercial smile, tourist snapshot, stiff posing, excessive props, oversharpened grass, pasted background, studio grass backdrop",
  "蓝色洁净功能证据系统": "cold medical laboratory, operating room, medical instrument table, hard clinical blue, highly saturated fluorescent blue, complex laboratory props, cluttered background, household clutter, hard plastic set, strong mirror reflections, dramatic colored lighting, dark low-key lighting, excessive technology particles, cheap portrait-studio look",
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
  "米色调": "Cream white, beige, light nude, warm natural light; high-key, low-saturation, low-contrast; warm, skin-friendly, sophisticated lifestyle atmosphere, healing, clean.",
  "蓝色调": "Clear sky blue, pale blue, clean white, natural warm skin tone with a cool-toned environment; high-key, low-saturation, fresh, transparent, airy; fresh, safe, trustworthy, professional but not cold.",
};

const WEIGHT_CN = { low: "低", medium: "中", high: "高" } as const;
const WEIGHT_EN = {
  low: "low influence: use only as a subtle secondary cue",
  medium: "medium influence: clearly reference the visual direction while respecting the restricted content boundary",
  high: "high influence: strongly apply the referenced visual direction; never copy the subject, character identity, face, body, or garment design",
} as const;

export const PROMPT_REFINER_SYSTEM_INSTRUCTION = `
你是巴迪高品牌视觉提示词编排器。你的职责是润色已经由业务配置确定的提示词包，而不是重新创作规则。

必须遵守：
1. 不删除或弱化产品高保真、成年人身份、安全边界、场景视觉基因、景别、角度、影调、画幅、分辨率和负面约束。
2. 替换模式中必须百分百保持替换参考图的姿势、动作、图片视角与构图；不得把替换参考图的人物身份、面孔、身体特征、服装设计、光源、色温或影调加入约束。
3. 不添加用户没有提供的产品材质、认证、功效或包装文字事实。
4. 解决重复和语言冲突，让提示词清晰、可执行、摄影语言自然。
5. positivePrompt 使用中文为主，可保留必要英文摄影增强词；negativePrompt 保持逗号分隔。
6. 仅输出 JSON：{"title":"4至10字中文标题","positivePrompt":"最终正向提示词","negativePrompt":"最终负面提示词"}。
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
  const replacementWorkflow = input.replacementWorkflow || "multi_replace";
  const noPeople = input.modelCount === 0 && replacementWorkflow !== "product_only";
  const multiPersonBindings = input.visualType === "R" && replacementWorkflow !== "product_only" && input.modelCount > 0
    ? (input.personBindings || []).slice(0, Math.max(1, Math.min(2, input.modelCount)))
    : [];
  const positionLabels: Record<string, string> = { left: "画面左侧", center: "画面中央", right: "画面右侧", front: "前景", back: "后景" };
  const cleanAssetName = (name?: string) => name?.replace(/\[[^\]]+\]/g, "").trim();
  const operationLabels: Record<string, string> = { keep: "保持该人物的姿势、位置与原穿搭不变", replace_product: "保持该人物的姿势与位置，只替换绑定产品", replace_all: "保持该人物的姿势与位置，替换人物形象、服装与产品", remove: "删除人物并自然补全其遮挡区域" };
  const getSlotOperationChinese = (binding: typeof multiPersonBindings[number]) => {
    if (binding.operation === "remove") return operationLabels.remove;
    const identityInstruction = binding.characterImage
      ? `保留参考图中该人物的姿势、位置、朝向和遮挡关系不变；人物身份必须替换为【${cleanAssetName(binding.characterImage)}】图，原人物面孔、发型和身体特征不得保留或混合`
      : "保留参考图中该人物的姿势、位置、朝向、遮挡关系与原人物身份";
    if (replacementWorkflow !== "pose_rebuild") return operationLabels[binding.operation] || binding.operation || "保持";
    if (binding.operation === "replace_product") return `${identityInstruction}；只替换该槽位绑定的产品`;
    if (binding.operation === "replace_all") return `${identityInstruction}；上身、下身与产品按该槽位上传和绑定的素材替换`;
    return `${identityInstruction}；原穿搭与产品保持不变`;
  };
  const getSlotOperationEnglish = (binding: typeof multiPersonBindings[number]) => {
    if (binding.operation === "remove") return "remove this person and naturally reconstruct the occluded area";
    if (replacementWorkflow !== "pose_rebuild") return binding.operation || "keep";
    const identityInstruction = binding.characterImage
      ? `preserve only this source person's pose, position, facing direction, and occlusion; MANDATORILY replace identity with [${cleanAssetName(binding.characterImage)}], discarding and never blending the source person's face, hair, and body traits`
      : "preserve this source person's pose, position, facing direction, occlusion, and identity";
    if (binding.operation === "replace_product") return `${identityInstruction}; replace only the bound product`;
    if (binding.operation === "replace_all") return `${identityInstruction}; replace upper garment, lower garment, and product from this slot's bound assets`;
    return `${identityInstruction}; preserve the source garment and product`;
  };
  const multiPersonChinese = multiPersonBindings.length
    ? `【人物身份绑定——强制执行】\n参考图中共有${multiPersonBindings.length}个受控人物。除明确标记删除的人物外，人物数量不得增加或减少；禁止新增路人、复制人物或交换人物。${replacementWorkflow === "pose_rebuild" ? "无需手动输入人物位置；按动作参考图中的人物从左到右、由前到后自动识别，并按人物 A、人物 B 的顺序绑定。" : ""}\n${multiPersonBindings.map((binding, index) => `${binding.label || `人物${String.fromCharCode(65 + index)}`}：${replacementWorkflow === "pose_rebuild" ? `目标=动作参考图中按顺序识别的第${index + 1}个人物` : `来源位置=${positionLabels[binding.sourcePosition] || binding.sourcePosition || "按槽位顺序识别"}`}；处理要求=${getSlotOperationChinese(binding)}；人物形象图=${cleanAssetName(binding.characterImage) || "沿用原图或默认成年模特"}；上身穿搭=${cleanAssetName(binding.upperGarmentImage) || "沿用原图或产品主图"}；下身穿搭=${cleanAssetName(binding.lowerGarmentImage) || "沿用原图或产品主图"}；产品=${cleanAssetName(binding.productImage) || "沿用原图或产品主图"}。`).join("\n")}\n每个人物只使用自己绑定的形象、上下身穿搭与产品素材。自动保持参考图中各人物的左右/前后关系、姿势、朝向、身体边界、遮挡关系、视线、肢体接触和相互距离。禁止串脸、串服装、串产品、串色、身体融合或把一个人物的特征复制给其他人物。`
    : "";
  const multiPersonEnglish = multiPersonBindings.length
    ? `[PERSON IDENTITY BINDING — MANDATORY]\nThe reference contains exactly ${multiPersonBindings.length} controlled people. Except for people explicitly marked REMOVE, never add, duplicate, merge, swap, or omit a person.${replacementWorkflow === "pose_rebuild" ? " Do not require manual position input. Detect people in the action reference from left to right, then front to back, and bind them in Person A / Person B order." : ""}\n${multiPersonBindings.map((binding, index) => `${binding.label || `Person ${String.fromCharCode(65 + index)}`}: ${replacementWorkflow === "pose_rebuild" ? `target=detected person ${index + 1} in the action reference` : `source position=${binding.sourcePosition || "slot order"}`}; instruction=${getSlotOperationEnglish(binding)}; identity reference=${cleanAssetName(binding.characterImage) || "original/default adult model"}; upper garment=${cleanAssetName(binding.upperGarmentImage) || "original/product master"}; lower garment=${cleanAssetName(binding.lowerGarmentImage) || "original/product master"}; product=${cleanAssetName(binding.productImage) || "original/product master"}.`).join("\n")}\nAssets bound to one person must never affect another person. Automatically preserve each person's spatial relationship, pose, facing direction, body boundary, occlusion, gaze, physical contact, and interpersonal distance. No face swapping, garment/product crossover, color crossover, cloned people, fused bodies, or shared identity traits.`
    : "";
  const isReplacement = input.visualType === "R";
  const enhanceCreativeAction = !isReplacement && !noPeople;
  const creativeActionQualityChinese = enhanceCreativeAction
    ? `\n人物动作合理性：生成前先确定一个清晰、可命名且符合当前场景的动作，例如自然站立、缓步、坐靠、整理衣物或轻度伸展，再围绕该动作组织全身。动作必须具有明确意图、支撑点和重心：站姿重心落在承重腿与足底；坐姿臀腿接触可信支撑面；抬腿、侧弯或伸展必须具有可解释的平衡来源。头颈、肩带、脊柱、骨盆、膝踝形成连续自然的动力链，关节活动范围正常，左右肢体协调。手部必须执行明确动作，与衣物或身体接触时具有真实触点、压力方向、遮挡和对应布料褶皱；除非明确要求展示弹力，不得无目的抓捏皮肤、拉扯腰头或裤脚。未明确要求运动动作时，优先选择低风险、自然松弛、便于展示产品的日常姿势，避免高抬腿、极限侧弯、悬空姿势和复杂瑜伽动作。参与动作的手、脚和关键关节应尽量完整入镜。${input.modelCount > 1 ? "多人画面中，每个人必须具有独立但相互协调的动作角色，视线、距离、朝向和互动关系清楚；禁止所有人物机械复制同一姿势，也禁止人物之间动作毫无关联。" : ""}`
    : "";
  const creativeActionQualityEnglish = enhanceCreativeAction
    ? ` Human-action plausibility: first choose one clear, nameable action appropriate to the scene—such as relaxed standing, slow walking, supported sitting, adjusting clothing, or a gentle stretch—and organize the whole body around it. Every action needs a clear purpose, support point, and center of gravity: standing weight must settle through a weight-bearing leg and foot; seated hips and legs must contact a credible support; leg lifts, side bends, and stretches need an explainable source of balance. Maintain a continuous natural kinetic chain through the head, neck, shoulder girdle, spine, pelvis, knees, and ankles, with normal joint ranges and coordinated limbs. Hands must perform a specific action; contact with skin or garments requires credible touch points, pressure direction, occlusion, and matching fabric tension. Unless an elasticity demonstration is explicitly requested, never pinch skin or pull a waistband or leg opening without purpose. When no athletic action is requested, prefer low-risk, relaxed everyday poses that present the product clearly; avoid high leg lifts, extreme side bends, unsupported floating poses, and complex yoga positions. Keep action-critical hands, feet, and joints in frame whenever possible.${input.modelCount > 1 ? " In multi-person scenes, give each person a distinct but coordinated action role with clear gaze, distance, orientation, and interaction; never clone one pose across all people or give them unrelated actions." : ""}`
    : "";
  const enhanceReplacementPerson = isReplacement && replacementWorkflow !== "product_only" && !noPeople;
  const replacementPersonRealismChinese = enhanceReplacementPerson
    ? "【替换人物·表情与肢体自然度——强制执行】\n表情管理：人物身份、五官比例和脸型服从绑定的人物形象图；表情不机械复制形象图，而应服从当前场景、动作、视线对象和人物关系。眉眼放松，眼睑开合、瞳孔朝向与注视目标一致；嘴角、唇部张力、下颌和面颊肌肉协调，保留轻微真实不对称。笑容必须自然克制，牙齿排列、口腔结构和唇齿遮挡真实；禁止空洞眼神、僵硬假笑、过度咧嘴、夸张惊讶、左右眼不同焦、面部肌肉冻结或五官漂移。\n肢体自然度：核心姿势、动作语义、手脚位置和人物空间关系严格服从[action]姿势图；仅允许进行不改变核心动作的生理级微调，以修复肩颈僵硬、脊柱断裂、肩胯不协调、关节反折、重心悬空和不可信接触。头颈、锁骨、肩线、胸廓、脊柱、骨盆、膝踝形成连续自然动力链；站姿有明确承重腿，坐姿有可信支撑面，行走与互动具有正确惯性、平衡和重力。手掌朝向、手腕弯曲、手指长度与分离自然，抓握和触碰必须有真实接触点、压力与遮挡。服装褶皱、拉伸和受力方向必须与身体动作一致。多人画面中每个人动作节奏略有差异，视线、距离和肢体互动有明确关系，禁止镜像复制、同步木偶姿势、身体融合或肢体误接。"
    : "";
  const replacementPersonRealismEnglish = enhanceReplacementPerson
    ? "[REPLACEMENT PERSON — EXPRESSION AND BODY NATURALISM, MANDATORY]\nExpression control: identity, facial proportions, and face shape must follow the bound character reference, while expression must respond naturally to the scene, action, gaze target, and interpersonal relationship rather than mechanically copying the source portrait. Keep brows and eyelids relaxed; align pupils and both eyes to one believable focus target. Coordinate mouth corners, lip tension, jaw, cheeks, and nasolabial movement with subtle real asymmetry. Smiles must be restrained and spontaneous, with credible teeth, oral anatomy, and lip-to-teeth occlusion. No dead eyes, frozen smile, excessive grin, exaggerated surprise, divergent gaze, frozen facial muscles, or drifting features.\nBody naturalism: preserve the [action] reference's core pose, action meaning, hand/foot positions, and spatial relationships exactly. Permit only anatomy-level micro-corrections that do not change the core action, to resolve stiff shoulders, broken spine flow, mismatched shoulder-pelvis rhythm, reversed joints, floating balance, or implausible contact. Maintain a continuous kinetic chain through head, neck, clavicles, shoulders, rib cage, spine, pelvis, knees, and ankles. Standing poses need a clear weight-bearing leg; seated poses need credible support; walking and interaction need correct momentum, balance, and gravity. Palms, wrists, finger lengths, separation, grasping, touch points, pressure, and occlusion must be physically credible. Garment folds, stretch, and tension must follow the body's movement. In multi-person images, give each person subtly different timing while preserving gaze, distance, contact, and interaction; never create mirrored clones, synchronized mannequin poses, fused bodies, or misconnected limbs."
    : "";
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
  const replacementMode = isReplacement
    ? findOption(REPLACEMENT_MODE_OPTIONS, input.replacementMode)
    : undefined;
  const usesReplacementScene = input.replacementMode === "服装+场景替换";
  const usesCharacterGarmentReference = isReplacement
    && replacementWorkflow !== "pose_rebuild"
    && (input.replacementMode === "服装+场景替换" || input.replacementMode === "服装替换");
  const shotScale = findOption(SHOT_SCALE_OPTIONS, input.shotScale);
  const cameraAngle = findOption(CAMERA_ANGLE_OPTIONS, input.cameraAngle);
  const tone = findOption(TONE_OPTIONS, input.tone);
  const aspectRatio = findOption(ASPECT_RATIO_OPTIONS, input.aspectRatio);
  const resolution = findOption(RESOLUTION_OPTIONS, input.resolution);

  add("visualType", visualType);
  add("replacementMode", replacementMode);
  if (!isReplacement || usesReplacementScene) add("scene", scene);
  input.productFunctions.forEach((id) => add("sellingPoint", findOption(SELLING_POINT_OPTIONS, id)));
  add("shotScale", shotScale);
  add("cameraAngle", cameraAngle);
  add("tone", tone);
  add("aspectRatio", aspectRatio);
  add("resolution", resolution);

  if (input.visualType !== "C" && !scene) warnings.push("当前视觉类型缺少有效场景，已仅使用通用品牌规则。");
  if (input.visualType === "C" && input.productFunctions.length === 0) warnings.push("C类视觉至少应选择一个产品功能卖点。");
  if (isReplacement && !replacementMode) warnings.push("替换模式缺少有效的替换子模式。");
  const hasSceneReference = input.referenceImages.some((name) => name.includes("[scene]"));
  const hasBaseImageReference = input.referenceImages.some((name) => name.includes("[base_image]"));
  const hasActionReference = input.referenceImages.some((name) => name.includes("[action]"));
  const hasCompositionReference = input.referenceImages.some((name) => name.includes("[composition]"));
  const replacementSceneAuthority = hasSceneReference
    ? "场景内容仅服从[scene]场景参考图。"
    : scene
    ? `未上传场景参考图，场景内容、背景元素、道具、光影、色彩与氛围仅服从预设场景“${scene.label}”；严禁从[action]动作图或[composition]构图图提取任何背景与场景内容。`
    : "未提供有效场景来源；严禁从动作图或构图图推断场景。";
  if (isReplacement && replacementWorkflow === "pose_rebuild") {
    if (!input.characterImages.length) warnings.push("姿势锁定重构必须上传模特形象图。");
    if (input.modelCount > 1 && input.characterImages.length < input.modelCount) warnings.push(`多人姿势锁定当前设置为${input.modelCount}人，建议为每个人物槽位分别上传形象图，避免串脸或人物身份混用。`);
    if (!hasActionReference) warnings.push("姿势锁定重构必须上传姿势参考图。");
    if (!hasSceneReference && !scene) warnings.push("姿势锁定重构必须选择预设场景或上传场景参考图。");
  }
  if (isReplacement && replacementWorkflow === "product_only" && !hasBaseImageReference && !hasSceneReference) warnings.push("原图单品替换必须上传需要保持不变的原场景图。");
  if (isReplacement && replacementWorkflow === "multi_replace" && !hasCompositionReference) warnings.push("多要素精确替换建议上传构图参考图，以锁定机位、占比、景别和裁切。");
  if (isReplacement && replacementWorkflow !== "product_only" && input.multiPersonMode) {
    if (input.modelCount < 2) warnings.push("多人模式至少需要2个人物槽位。");
    if (multiPersonBindings.length !== input.modelCount) warnings.push("人物槽位数量与参考图人物数量不一致，请重新确认绑定。");
    const occupiedPositions = multiPersonBindings.filter((binding) => binding.operation !== "remove").map((binding) => binding.sourcePosition);
    if (replacementWorkflow === "multi_replace" && new Set(occupiedPositions).size !== occupiedPositions.length) warnings.push("多人槽位存在重复位置，可能导致串脸或人物合并。");
    if (!hasActionReference && !hasCompositionReference) warnings.push("多人模式建议上传包含全部人物的动作图或构图图，以锁定人物位置和遮挡关系。");
  }
  if (isReplacement && input.referenceImages.length === 0) warnings.push("替换模式必须上传至少一张替换参考图，才能复刻姿势、动作、图片视角和构图。");
  if (input.productImages.length === 0) warnings.push("未提供产品参考图，无法建立产品外观高保真约束。");

  const hasHighCreativeReference = !isReplacement && input.referenceImageWeights?.some((item) => item.weight === "high");
  const hasMediumCreativeReference = !isReplacement && input.referenceImageWeights?.some((item) => item.weight === "medium");
  const creativeReferenceStrengthChinese = hasHighCreativeReference
    ? "【高权重创意基准·强制执行】主体与构图骨架必须锁定：保留参考图已有的人物数量与是否有人、人物相对位置、姿势动作、互动与视线关系、裁切逻辑、机位方向、主体占比、主要道具、产品所在位置、留白、背景组织、光线方向和色彩关系；仅在输出画幅确有需要时做最小适配。严禁把含人物的参考图退化为孤立产品静物、平铺、悬挂或陈列台单品图。画面的主要语义变化只能是用产品主图替换参考图中的原产品或原服装。"
    : hasMediumCreativeReference
    ? "【中权重创意基准】参考图的主体安排、人物关系与构图方向必须清晰可识别，可为页面画幅和产品展示做适度调整；不得无理由改成与参考主体结构无关的孤立产品静物。"
    : "【低权重创意基准】仅将参考图作为次要视觉提示，页面场景与摄影参数可主导结果。";
  const creativeReferenceStrengthEnglish = hasHighCreativeReference
    ? "HIGH-WEIGHT CREATIVE BASE — MANDATORY: lock the subject and composition skeleton. Preserve existing human presence and count, relative positions, pose/action, interaction and gaze, crop logic, camera direction, subject scale, major props, product placement, negative space, background organization, lighting direction, and color relationships, allowing only minimal aspect-ratio adaptation. Never collapse a people-containing reference into an isolated product still life, flat lay, hanging display, or plinth shot. The main semantic change must be replacing the reference product/garment with PRODUCT MASTER."
    : hasMediumCreativeReference
    ? "MEDIUM-WEIGHT CREATIVE BASE: keep the reference subject arrangement, relationships, and composition clearly recognizable, with moderate adaptation for the requested format and product display. Do not arbitrarily convert it into an unrelated isolated product still life."
    : "LOW-WEIGHT CREATIVE BASE: use the reference only as a secondary visual cue; selected scene and camera settings may lead.";

  const imageReferenceInstructions = [
    input.productImages.length
      ? `产品主参考图：${input.productImages.join("、")}。仅用于锁定产品外观与包装结构。`
      : "未提供产品主参考图。",
    noPeople
      ? "已选择0人：禁止模型自主新增人物、人体部位、手、脸、人物倒影或人形模特。若有效参考图已包含人物或人体局部，可保留其原有数量、裁切范围、姿势、动作、遮挡和与产品的接触关系，仅作为产品展示载体；不得补全画面外身体、扩展人体范围、增加新面孔或肢体、复制人物或改变人物身份。若有效参考图不含人体内容，则采用产品静物、平铺、悬挂、装置或环境陈列等纯无人摄影方式。"
      : input.characterImages.length
      ? usesCharacterGarmentReference
        ? `人物与服装参考图：${input.characterImages.join("、")}。用于保持人物身份、五官、发型与体型一致性，并参考图中服装的穿着位置、搭配关系、整体廓形、覆盖范围、自然褶皱和与姿势的贴合关系。人物图服装不得覆盖产品主图规范：巴迪高产品的版型、腰头、腿口、缝线、纹理、颜色和品牌结构始终以产品主参考图为最高优先级。`
        : `人物参考图：${input.characterImages.join("、")}。仅用于人物身份、五官、发型与体型一致性。`
      : replacementWorkflow === "product_only" ? "不使用额外人物参考图；原场景图中的人物身份、面孔、发型、身体、姿势和动作必须保持不变。" : "未提供人物参考图，使用巴迪高默认成年亚洲女性规范。",
    input.referenceImages.length
      ? replacementWorkflow === "product_only"
        ? `原场景基础图：${input.referenceImages.map(cleanAssetName).join("、")}。这是唯一的底图与原人物来源；除目标产品所在区域外，人物身份、面孔、发型、身体、姿势、服装遮挡、构图、场景、道具、光影和像素内容均保持不变。必须识别并移除原产品，再以产品主参考图中的新产品完整覆盖目标区域；不得保留原产品的颜色、版型、纹理、图案或结构。`
      : isReplacement
        ? `替换参考图：${(input.referenceImageWeights?.length
            ? input.referenceImageWeights.map((item) => `${item.name}（权重：${WEIGHT_CN[item.weight]}）`)
            : input.referenceImages).join("、")}。[action]只允许锁定姿势、肢体角度、重心、手脚位置、头部朝向和动作，禁止影响背景、场景、道具、构图、机位和光影；[composition]只允许锁定机位、景别、裁切、主体占比、留白、透视与空间布局，禁止影响背景内容、环境类型、场景道具和光影；[scene]只允许控制环境内容与光影。${replacementSceneAuthority}`
        : `创意基准参考图：${(input.referenceImageWeights?.length
          ? input.referenceImageWeights.map((item) => `${item.name}（权重：${WEIGHT_CN[item.weight]}）`)
          : input.referenceImages).join("、")}。以参考图为整体创意基准，生成视觉语言、场景氛围、光影、色彩、影调、景深、构图、机位、裁切、留白、主体位置、人物姿势与动作相近的产品图。${creativeReferenceStrengthChinese} 参考图中已有的人物、面孔、身体呈现和人物关系作为画面连续性依据；若另有专用人物形象图，则人物身份、五官、发型和体型必须改为服从人物形象图。核心产品或服装必须替换为上传的产品主图，参考图中原产品的版型、颜色、纹理、图案、缝线、标识和结构不得覆盖产品主图。权重控制整体创意相似度，但不改变人物图与产品主图各自职责的最高优先级。`
      : isReplacement ? "未提供替换参考图，无法执行维度锁定。" : "未提供额外风格参考图。",
  ].join("\n");

  const replacementWorkflowChinese = !isReplacement ? "" : replacementWorkflow === "pose_rebuild"
    ? "【工作流：姿势锁定重构】姿势参考图只锁定人物动作、肢体角度、重心、手脚位置和头部朝向，不得提供或保留原人物身份、面孔、五官、发型、肤色和体型特征。上传的人物形象图是人物身份的最高且唯一依据：必须将姿势图中的原人物完整替换为人物形象图中的同一人物，强锁定脸型、五官几何、眼鼻唇比例、发型发色、肤色与体型比例；禁止混合姿势图原人物、默认模特或其他槽位人物特征。产品仅服从产品主图，环境仅服从场景参考图或预设场景。允许为适配新场景调整裁切和留白，但不得改变核心姿势。"
    : replacementWorkflow === "product_only"
    ? "【工作流：原图单品替换】原场景图是不可改变的基础画面。保持原人物身份、面孔、发型、身体、姿势、动作、相机位置、景别、裁切、场景、道具、光线、色温、阴影和空间关系不变；只替换目标产品。新产品严格服从产品主图，并匹配原图中的透视、尺寸、遮挡、接触阴影、材质反射和环境光。不得重新设计或重构整张图片。"
    : "【工作流：多要素精确替换】每张参考图只能影响其标记职责：人物形象决定身份；姿势图决定动作；上/下身服装图决定穿着类别和关系；构图图决定机位、景别、裁切、主体占比和留白；场景图决定环境内容；产品图决定产品设计。任何参考图不得越权覆盖其他参考图。";

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
    `【视觉类型】\n${replacementWorkflow === "product_only"
      ? "原图局部单品替换视觉。原场景基础图是不可变底图，仅旧产品所在目标区域允许修改；必须完整移除旧产品并换成产品主参考图中的新产品，目标区域以外不得重绘。"
      : visualType?.prompt || "按巴迪高品牌视觉规范生成。"}`,
    replacementWorkflowChinese,
    multiPersonChinese,
    replacementPersonRealismChinese,
    replacementMode && replacementWorkflow !== "product_only" ? `【替换规则】\n${replacementMode.prompt}` : "",
    scene && (!isReplacement || usesReplacementScene) ? `【场景视觉基因】\n${scene.prompt}` : "",
    replacementWorkflow === "product_only"
      ? "【原人物保持】\n不得新增、删除或重新设计人物。原场景图中的人物身份、面孔、发型、身体、姿势、动作、衣物遮挡和人物与产品的接触关系必须保持不变。"
      : noPeople
      ? "【0人·禁止自主新增人物】\n0人不等于强制删除参考图中已有的人体内容，而是禁止模型自主创造新人物或新人体部位。若有效参考图已含人物、手、身体局部或人物动作，仅保留其原有数量、裁切、姿势、动作、遮挡和产品接触关系，用于承载或展示产品；不得补全画面外身体、扩展人体范围、新增脸或肢体、复制人物、改变身份或推断不可见人体。若参考图无人，则围绕产品、场景和风格设计静物、平铺、悬挂、装置或环境陈列摄影，不得新增任何人体内容。"
      : `【人物规范】\n${PERSON_BASE_PROMPT}`,
    `【产品与参考图】\n${PRODUCT_FIDELITY_PROMPT}\n${imageReferenceInstructions}${analysisInstructions ? `\n\n【图片视觉分析】\n${analysisInstructions}` : ""}`,
    input.productFunctions.length
      ? `【卖点视觉表达】\n${input.productFunctions
          .map((id) => findOption(SELLING_POINT_OPTIONS, id)?.prompt)
          .filter(Boolean)
          .join("\n")}`
      : "",
    replacementWorkflow === "product_only"
      ? "【摄影参数】\n相机位置、焦段感、景别、裁切、画幅比例、透视、主体占比和留白全部保持原场景图不变。"
      : replacementWorkflow === "pose_rebuild"
      ? `【摄影参数】\n[action]只控制核心姿势，不控制机位、景别、裁切或画幅。构图由页面摄影参数负责：${shotScale?.prompt || input.shotScale} ${cameraAngle?.prompt || input.cameraAngle}；允许为新场景做不改变核心姿势的合理裁切与留白。`
      : isReplacement
      ? "【摄影参数】\n仅[composition]构图参考图可以控制景别、机位、俯仰方向、镜头方向、裁切、人物位置占比、留白和构图；[action]动作图不得影响这些参数，更不得影响场景。"
      : `【摄影参数】\n${shotScale?.prompt || input.shotScale} ${cameraAngle?.prompt || input.cameraAngle}`,
    replacementWorkflow === "product_only"
      ? `【色彩与输出】\n原场景图的光源、色温、明暗关系、阴影、反射和影调全部保持不变；仅让新产品自然匹配原有环境光。${resolution?.prompt || input.resolution}`
      : replacementWorkflow === "pose_rebuild"
      ? `【色彩与输出】\n动作参考图的光源、色温、明暗关系和影调不作为约束；使用场景来源与页面选择的${tone?.prompt || input.tone}，画幅比例使用页面设置${aspectRatio?.prompt || input.aspectRatio}，${resolution?.prompt || input.resolution}`
      : isReplacement
      ? `【色彩与输出】\n替换参考图的光源、色温、明暗关系和影调不作为约束；${usesReplacementScene ? (tone?.prompt || input.tone) : `使用页面选择的${tone?.prompt || input.tone}`} 画幅比例跟随[composition]构图参考图，${resolution?.prompt || input.resolution}`
      : `【色彩与输出】\n${tone?.prompt || input.tone} ${aspectRatio?.prompt || input.aspectRatio} ${resolution?.prompt || input.resolution}`,
    replacementWorkflow === "product_only"
      ? `【批次要求】\n本次生成${input.imageCount}张；每张图都只允许替换目标产品，原人物、服装、场景、道具、构图、机位、光影和空间关系不得变化。`
      : isReplacement
      ? `【批次要求】\n本次生成${input.imageCount}张；严格按标签分工：[action]只控制姿势，[composition]只控制机位构图，[scene]或预设场景只控制环境。${replacementSceneAuthority}`
      : `【批次要求】\n本次生成${input.imageCount}张；保持品牌与产品规则一致，${noPeople ? "禁止新增参考图之外的人物或人体内容；可沿用参考图已有动作与人体局部展示产品，参考图无人时保持纯无人摄影；仅让产品陈列、机位和构图产生合理差异" : "同时保持人物规则一致，让构图和动作具有合理差异"}，避免复制画面。`,
    input.originalPrompt.trim() ? `【用户补充创意】\n${input.originalPrompt.trim()}` : "",
    `【质量底线】\n产品还原优先于创意发挥；${noPeople ? "产品、道具、家具" : "人物、产品、家具"}或自然环境之间的重力、遮挡、透视、受光和材质关系必须真实。${creativeActionQualityChinese}`,
  ].filter(Boolean);

  const sceneLabel = scene?.label || input.productFunctions.slice(0, 2).join("·") || "品牌视觉";

  const englishReferenceInstructions = [
    input.productImages.length
      ? `Product master references: ${input.productImages.join(", ")}. Use them to lock silhouette, waistband, leg openings, seams, texture, color, pattern, binding, proportions, and packaging structure.`
      : "No product master reference was provided.",
    replacementWorkflow === "product_only"
      ? "[PRESERVE ORIGINAL PEOPLE]\nDo not add, remove, or redesign any person. Preserve every original person's identity, face, hair, body, pose, action, garment occlusion, and contact relationship with the product."
      : noPeople
      ? "People count is zero: never autonomously add a person, face, hand, body part, human reflection, or mannequin. If an active reference already contains human content, preserve only its existing count, crop, pose, action, occlusion, and product-contact relationship as a product-display carrier; do not complete off-frame anatomy, expand the visible body, add a face or limb, duplicate a person, change identity, or infer invisible anatomy. If active references contain no human content, use a fully people-free product display."
      : input.characterImages.length
      ? usesCharacterGarmentReference
        ? `Character and garment-wearing references: ${input.characterImages.join(", ")}. Preserve identity, facial features, hairstyle, and body proportions. Also reference the source clothing's wearing position, styling relationship, overall silhouette, coverage, natural folds, and pose-to-garment fit. Never let source clothing override the product master: Badigao product silhouette, waistband, leg openings, seams, texture, color, and brand structure must follow the dedicated product reference.`
        : `Character identity references: ${input.characterImages.join(", ")}. Preserve identity, facial features, hairstyle, and body proportions only.`
      : "No character reference was provided; use an unmistakably adult young Asian woman aged 20–25 with natural features and healthy proportions.",
    input.referenceImageWeights?.length
      ? replacementWorkflow === "product_only"
        ? `Immutable base image: ${input.referenceImages.map(cleanAssetName).join(", ")}. This is the sole source for the original people and base pixels. Preserve identity, face, hair, body, pose, garment occlusion, composition, scene, props, camera, lighting, and every non-target region. Detect and REMOVE the original product from the target region, then fully replace it with the product master. Do not retain the old product's color, silhouette, texture, pattern, or construction.`
      : isReplacement
        ? `Replacement references: ${input.referenceImageWeights.map((item, index) => `Reference ${index + 1} '${item.name}'`).join("; ")}. Enforce strict tagged responsibilities: [action] controls only pose, limb angles, balance, hand/foot positions, head direction, and action, and is forbidden from influencing background, environment, props, camera, composition, lighting, or palette. [composition] controls only camera, shot scale, crop, aspect ratio, subject ratio/placement, negative space, perspective, and spatial layout, and is forbidden from influencing background identity, environment type, scene objects, lighting, or palette. [scene] controls only environment and lighting. ${hasSceneReference ? "Use only the [scene] reference for scene content." : scene ? `No [scene] image is present: the selected preset scene '${scene.label}' is the exclusive source of environment, background objects, props, lighting, palette, and atmosphere. Never copy scene content from [action] or [composition].` : "Never infer scene content from [action] or [composition]."}`
        : `Creative base references: ${input.referenceImageWeights.map((item, index) => `Reference ${index + 1} '${item.name}' — ${WEIGHT_EN[item.weight]}`).join("; ")}. Use each reference as an overall creative template for a similar product image: visual language, scene atmosphere, lighting, palette, tonal contrast, depth, composition, camera, crop, negative space, subject placement, existing people, face/body presentation, pose, action, and interpersonal relationships. ${creativeReferenceStrengthEnglish} If a dedicated character image is present, it overrides the reference for identity, face, hair, and body proportions. The uploaded PRODUCT MASTER must replace the reference product or garment and has exclusive authority over silhouette, color, texture, pattern, seams, branding, and construction. Reference weight controls overall creative similarity only; it never overrides CHARACTER IDENTITY or PRODUCT MASTER.`
      : "No additional style reference was provided.",
  ].join("\n");

  const replacementWorkflowEnglish = !isReplacement ? "" : replacementWorkflow === "pose_rebuild"
    ? "[WORKFLOW: POSE-LOCKED REBUILD — IDENTITY TRANSFER IS MANDATORY]\nThe pose reference controls only pose, limb angles, center of gravity, hand and foot positions, head direction, and action. Completely discard the pose-reference person's identity, face, facial geometry, hairstyle, skin tone, and body traits. The uploaded character identity reference is the highest and exclusive source of person identity: fully replace the pose-reference person with the same person from the character image, strongly locking face shape, facial geometry, eye/nose/lip proportions, hairstyle and color, skin tone, and body proportions. Never blend in the pose-reference person, a default model, or another slot's identity. Product design comes only from product masters; environment only from the scene reference or selected preset. Framing may adapt to the new scene, but the core pose must not change."
    : replacementWorkflow === "product_only"
    ? "[WORKFLOW: ORIGINAL-SCENE PRODUCT-ONLY REPLACEMENT]\nTreat the original scene reference as an immutable base image. Preserve its people, identity, face, hair, body, pose, action, camera, shot scale, crop, environment, props, lighting, color temperature, shadows, and spatial relationships. Replace only the target product. Match perspective, scale, occlusion, contact shadow, reflections, and ambient light. Do not redesign or regenerate unrelated regions."
    : "[WORKFLOW: MULTI-REFERENCE PRECISE REPLACEMENT]\nEach reference may control only its tagged responsibility: character for identity; action for pose; upper/lower garment for wearing category and relationship; composition for camera, shot scale, crop, subject ratio, and negative space; scene for environment; product master for product design. No reference may override another reference's responsibility.";

  const englishSections = [
    "[BRAND AND TASK]\nBadigao premium commercial visual. Combine realistic camera rendering, candid natural lifestyle photography, and refined brand polish.",
    `[VISUAL TYPE]\n${replacementWorkflow === "product_only"
      ? "Localized product-only replacement. The original scene is an immutable base image. Modify only the old product region: remove the old product completely and replace it with the product master. Never redraw any non-target region."
      : ENGLISH_VISUAL_TYPE[input.visualType]}`,
    replacementWorkflowEnglish,
    multiPersonEnglish,
    replacementPersonRealismEnglish,
    replacementMode && replacementWorkflow !== "product_only" ? `[REPLACEMENT RULES]\n${ENGLISH_REPLACEMENT_MODES[replacementMode.id as ReplacementModeId]}` : "",
    scene && (!isReplacement || usesReplacementScene) ? `[SCENE DNA]\n${ENGLISH_SCENES[scene.id] || scene.label}` : "",
    replacementWorkflow === "product_only"
      ? "[PRESERVE ORIGINAL PEOPLE]\nDo not add, remove, or redesign any person. Preserve all original identity, face, hair, body, pose, action, clothing, occlusion, and product contact relationships."
      : noPeople
      ? "[ZERO PEOPLE — NO AUTONOMOUS HUMAN ADDITION]\nZero people does not require deleting human content already present in an active reference; it forbids inventing any new person or anatomy. If a reference already includes a person, hand, body part, or human action, retain only the referenced presence, count, crop, pose, action, occlusion, and product-contact relationship as a product-display carrier. Never complete an off-frame body, expand visible anatomy, add a face or limb, duplicate a person, change identity, or infer hidden anatomy. If no active reference contains human content, create a fully people-free still-life, flat-lay, hanging, installation, or environmental product photograph."
      : "[PERSON]\nUse an unmistakably adult young Asian woman aged 20–25 with natural facial features, healthy balanced proportions, light makeup, real skin tone variation, subtle pores and fine hair. Keep the pose relaxed, non-influencer-like, non-sexualized, and physically believable.",
    `[PRODUCT AND REFERENCES]\nThe uploaded product master reference has the highest priority. Product fidelity overrides creative variation. Preserve silhouette, waistband width, leg-opening curve, seams, texture, color, pattern, binding, and proportions. Keep the product clear and unobstructed.\n${englishReferenceInstructions}`,
    input.productFunctions.length
      ? `[SELLING-POINT EXPRESSION]\n${input.productFunctions.map((id) => ENGLISH_SELLING_POINTS[id]).filter(Boolean).join("\n")}`
      : "",
    replacementWorkflow === "product_only"
      ? "[CAMERA]\nPreserve the original scene reference camera position, focal-length feel, shot scale, crop, aspect ratio, perspective, subject ratio, and negative space exactly."
      : replacementWorkflow === "pose_rebuild"
      ? `[CAMERA]\n[action] controls the core pose only and must not control camera, shot scale, crop, or aspect ratio. Use the UI camera settings: ${ENGLISH_SHOTS[input.shotScale] || input.shotScale} ${ENGLISH_ANGLES[input.cameraAngle] || input.cameraAngle}. Adapt crop and negative space to the new scene only where the core pose remains unchanged.`
      : isReplacement
      ? "[CAMERA]\nOnly the [composition] reference may control camera viewpoint, camera height, tilt, shot direction, shot scale, crop, subject placement, negative space, aspect ratio, perspective, and layout. The [action] reference must not influence camera, composition, or scene."
      : `[CAMERA]\n${ENGLISH_SHOTS[input.shotScale] || input.shotScale} ${ENGLISH_ANGLES[input.cameraAngle] || input.cameraAngle}`,
    replacementWorkflow === "product_only"
      ? `[COLOR AND OUTPUT]\nPreserve the original scene reference lighting, color temperature, brightness hierarchy, shadows, reflections, and tonal mood. Adapt only the new product to the existing ambient light. Target resolution ${input.resolution}.`
      : replacementWorkflow === "pose_rebuild"
      ? `[COLOR AND OUTPUT]\nDo not inherit lighting, palette, color temperature, brightness hierarchy, or tonal mood from [action]. Use the selected scene and UI tone. Use UI aspect ratio ${input.aspectRatio}. Target resolution ${input.resolution}.`
      : isReplacement
      ? `[COLOR AND OUTPUT]\nDo not inherit or constrain lighting, palette, color temperature, brightness hierarchy, or tonal mood from replacement references. Use the selected scene and UI tone. Preserve the [composition] reference aspect ratio. Target resolution ${input.resolution}.`
      : `[COLOR AND OUTPUT]\n${ENGLISH_TONES[input.tone] || input.tone} Aspect ratio ${input.aspectRatio}. Target resolution ${input.resolution}.`,
    replacementWorkflow === "product_only"
      ? `[BATCH]\nGenerate ${input.imageCount} image${input.imageCount === 1 ? "" : "s"}. Replace only the target product. Do not change any original person, clothing, environment, prop, composition, camera, lighting, or spatial relationship.`
      : isReplacement
      ? `[BATCH]\nGenerate ${input.imageCount} image${input.imageCount === 1 ? "" : "s"}. Enforce tagged responsibilities: [action] controls pose only; [composition] controls camera/layout only; [scene] or the selected preset controls environment only. ${hasSceneReference ? "Scene content must follow only [scene]." : scene ? `The preset scene '${scene.label}' exclusively controls all environment, background objects, props, lighting, palette, and atmosphere.` : "Do not infer scene content from action or composition references."}`
      : `[BATCH]\nGenerate ${input.imageCount} image${input.imageCount === 1 ? "" : "s"}. Keep brand and product rules consistent while allowing only reasonable variation in ${noPeople ? "product arrangement, camera position, framing, or subtle composition; never add human content beyond active references, but reference-contained pose or body-part support may remain for product display" : "pose, framing, or subtle composition"}.`,
    input.originalPrompt.trim()
      ? `[ADDITIONAL CREATIVE DIRECTION — ORIGINAL USER TEXT]\n${input.originalPrompt.trim()}`
      : "",
    `[QUALITY FLOOR]\nProduct fidelity takes priority over creativity. Creative base references may guide the overall subject presentation and existing human continuity, but must never override a dedicated character identity reference or supply the final product/garment design. Gravity, occlusion, perspective, lighting, anatomy, fabric behavior, furniture, and natural-environment relationships must remain physically credible.${creativeActionQualityEnglish}`,
  ].filter(Boolean);

  const englishNegativePrompt = [
    "copied style-reference subject, copied character identity, copied face, copied body, copied garment design, minor, childlike face, ambiguous age, influencer face, plastic skin, waxy skin, excessive retouching, oily highlights, heavy makeup, seductive expression, erotic lingerie, transparent clothing, sexual pose, exaggerated chest, exaggerated buttocks, voyeuristic angle, distorted anatomy, extra limbs, extra fingers, missing fingers, fused fingers, twisted joints, incorrect gravity, incorrect perspective, hair clipping, garment clipping, product deformation, twisted waistband, incorrect leg openings, incorrect seams, melted fabric, wrong packaging proportions, gibberish text, low resolution, blur, noise, compression artifacts, excessive HDR, oversharpening, halos, banding, fake depth of field, excessive bokeh, fisheye, cropped head, cropped hands, cropped feet, watermark, incorrect logo, border, collage, cheap e-commerce look, obvious AI artifacts",
    ...(scene?.negativePrompt
      ? [ENGLISH_SCENE_NEGATIVES[scene.id] || "Avoid the scene-specific failures defined in the Chinese display version."]
      : []),
    ...(noPeople ? ["new unreferenced person, added human, invented face, added hand, added limb, completed off-frame body, expanded visible anatomy, duplicated person, inferred hidden anatomy, new human reflection, added mannequin"] : []),
    ...(replacementMode ? [ENGLISH_REPLACEMENT_NEGATIVES[replacementMode.id as ReplacementModeId]] : []),
    ...(enhanceReplacementPerson ? ["dead eyes, vacant stare, divergent gaze, frozen expression, forced smile, excessive grin, distorted teeth, broken mouth anatomy, facial feature drift, stiff neck, raised rigid shoulders, broken spine flow, mismatched shoulder-pelvis rhythm, floating center of gravity, reversed elbows, reversed knees, broken wrists, stiff fingers, implausible grasp, missing contact pressure, mirrored cloned pose, synchronized mannequin pose, fused bodies, misconnected limbs"] : []),
    ...(enhanceCreativeAction ? ["unclear action intent, unsupported leg lift, floating seated pose, missing support point, floating center of gravity, unclear weight-bearing leg, impossible balance, meaningless hand gesture, hovering hand, pinching skin, purposeless pulling of waistband or leg opening, hand force inconsistent with fabric deformation, broken shoulder-pelvis kinetic chain, broken spine flow, twisted neck, hyperextended joint, reversed joint, conflicting limb rhythm, extreme side bend, complex yoga pose, cropped action-critical joints, cropped action-critical hands or feet, unrelated actions between people, mirrored cloned pose, mannequin posing"] : []),
  ].join(", ");

  if (noPeople) negativeFragments.push("自主新增人物，参考图外新增人体，新增面孔，新增手部，新增肢体，补全画面外身体，扩展可见人体范围，复制人物，推断不可见人体，新增人物倒影，新增人形模特");
  if (enhanceReplacementPerson) negativeFragments.push("空洞眼神，左右眼不同焦，面部僵硬，强迫式假笑，过度咧嘴，牙齿扭曲，口腔结构错误，五官漂移，肩颈僵硬，耸肩，脊柱断裂，肩胯节奏错误，重心悬空，关节反折，手腕折断，手指僵硬，抓握不真实，接触点缺失，镜像复制姿势，同步木偶动作，身体融合，肢体误接");
  if (enhanceCreativeAction) negativeFragments.push("动作动机不明，无支撑抬腿，悬空坐姿，支撑点缺失，重心落空，承重腿不明确，不可能维持的平衡，无意义手势，手部悬停，抓捏皮肤，无目的拉扯腰头或裤脚，手部施力与布料形变不一致，肩胯动力链断裂，脊柱折断，头颈过度扭曲，关节超伸，关节反折，左右肢体节奏冲突，极限侧弯，复杂瑜伽姿势，参与动作的关键关节被裁断，参与动作的手脚被裁断，多人动作互不相关，镜像复制姿势，木偶式摆拍");

  return {
    title: isReplacement ? `替换模式·${replacementMode?.label || "未选择"}` : `${input.visualType}类·${sceneLabel}`,
    positivePrompt: sections.join("\n\n"),
    negativePrompt: negativeFragments.join("，"),
    positivePromptEnglish: englishSections.join("\n\n"),
    negativePromptEnglish: englishNegativePrompt,
    selectedFragments: fragments,
    warnings,
    configVersion: PROMPT_CONFIG_VERSION,
  };
}
