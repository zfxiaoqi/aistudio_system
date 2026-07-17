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
      label: "蓝色功能证据",
      description: "蓝白棚拍证明穿着性能",
      recommendedTone: "蓝色调",
      prompt:
        "浅蓝洁净棚拍、蓝白主调、极简背景、清爽空气感、单人轻动态、双人前后对照、正反面版型展示、后臀完整包裹、竖纹纯棉肌理、局部细节特写、轻拉腿口弹性、高弹橡筋、柔软亲肤、功能证据化、电商专业感。",
      negativePrompt:
        "冰冷医疗棚拍，夸张实验演示，硬塑料材质，过度拉扯，产品变形，低俗局部裁切，性感凝视，遮挡产品，错误正反面结构",
      version: 2,
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
      "【替换模式：服装+场景替换】替换参考图中的姿势、动作、图片视角和构图必须百分百复刻：保持肢体角度、重心、手脚位置、头部朝向、动作状态、机位、俯仰方向、景别、裁切、人物位置占比、留白和元素空间关系不变。替换参考图中的人物身份、面孔、身体特征、服装和光影调性不作为约束。人物使用人物参考图或22–30岁亚洲女性品牌规范；场景与光影完全使用用户选择的A类场景及页面色调；服装替换为用户上传的巴迪高产品，版型、腰头宽度、腿口弧线、缝线、颜色、图案、包边和纯棉竖纹面料肌理必须准确。商业生活方式摄影级真实度，发丝、面料和产品边缘清晰。",
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
      "【替换模式：服装替换】替换参考图中的姿势、动作、图片视角和构图必须百分百复刻：保持肢体角度、重心、手脚位置、头部朝向、动作状态、身体曲线走向、机位、俯仰方向、景别、裁切、人物位置占比、留白和元素空间关系不变。替换参考图中的人物身份、面孔、身体特征和光影调性不作为约束。人物使用人物参考图或22–30岁亚洲女性品牌规范；光影与色调使用页面选择和品牌场景要求；服装替换为用户上传的巴迪高产品及克制的白色或奶油白基础上装，版型、腰头宽度、腿口弧线、缝线、颜色、包边和纯棉竖纹肌理必须准确。若参考图出现包装，可替换为巴迪高包装但保持其构图位置和占比。商业生活方式摄影级真实度，皮肤真实柔和。",
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
  "人物必须是明确成年的22–30岁亚洲年轻女性，五官自然、身形健康匀称、妆容轻薄；保留真实肤色差异、轻微毛孔、细小绒毛和健康微光。状态自然放松、不摆拍、不网红化、不性感化。双人画面默认一位长发、一位短发，并在脸型、动作、高低或前后位置上至少有两项差异，避免复制脸与同步动作。";

const COMMON_NEGATIVE_PROMPT =
  "未成年人，儿童脸，年龄模糊，欧美模板脸，网红脸，复制脸，塑料皮肤，蜡像皮肤，过度磨皮，油腻高光，浓妆，挑逗表情，情趣内衣，透明衣物，色情姿势，刻意挺胸，刻意翘臀，过度性感，身体比例失真，超长腿，极细腰，多手，多脚，多手指，少手指，粘连手指，肢体融合，关节扭曲，错误重力，错误透视，头发穿模，衣物穿模，产品变形，腰头扭曲，腿口错误，缝线错误，面料融化，包装比例错误，乱码文字，低清晰度，模糊，噪点，压缩感，HDR过重，过度锐化，锐化白边，色带，假景深，过度虚化，超广角畸变，鱼眼，裁断头部，裁断手脚，水印，logo错误，边框，拼贴，廉价电商感，AI合成痕迹";

const ENGLISH_VISUAL_TYPE: Record<VisualTypeId, string> = {
  A: "Brand-emotion and lifestyle visual. Prioritize natural, clean, relaxed, lightweight, effortless premium storytelling over rigid feature demonstration.",
  B: "Authentic-use visual. Build credible product evidence through natural daily movement, showing softness, stretch, support, coverage, and stability without exaggeration.",
  C: "Product-feature visual. Reduce scene narrative and focus on material, construction, close-up details, and credible demonstrations of the selected selling points.",
  R: "Reference-guided replacement visual. Reproduce the replacement reference pose, action, camera viewpoint, and composition exactly. Do not inherit the replacement reference person, identity, face, body traits, garment design, lighting, color temperature, or tonal mood. Person appearance comes from the character reference or brand standard; product design comes from the product master; lighting and tone come from the selected scene and UI settings.",
};

const ENGLISH_REPLACEMENT_MODES: Record<ReplacementModeId, string> = {
  "服装+场景替换": "GARMENT + SCENE REPLACEMENT. Reproduce the replacement reference pose, action, camera viewpoint, shot scale, crop, subject placement, negative space, and composition exactly. Do not copy or constrain the person, identity, face, body traits, source garment, lighting, color temperature, or tonal mood. Use the character reference or adult Asian brand standard for the person; use the selected A-scene and UI tone for environment and lighting; replace the garment with the uploaded Badigao product at highest fidelity.",
  "产品替换": "PRODUCT REPLACEMENT. Reproduce the replacement reference pose and action where people are present, and reproduce camera viewpoint, shot scale, crop, aspect ratio, object placement, product footprint, negative space, and composition exactly. Do not copy or constrain the reference person, identity, face, body traits, lighting, color temperature, or tonal mood. Replace only the product or packaging with the uploaded Badigao product at highest fidelity.",
  "服装替换": "GARMENT REPLACEMENT. Reproduce the replacement reference pose, action, body-line direction, camera viewpoint, shot scale, crop, subject placement, negative space, and composition exactly. Do not copy or constrain the reference person, identity, face, body traits, lighting, color temperature, or tonal mood. Use the character reference or adult Asian brand standard for the person, UI settings for lighting and tone, and the uploaded Badigao product for garment design.",
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
  "蓝色洁净功能证据系统": "Pale blue clean studio, blue-and-white tone, minimalist background, fresh airy feeling, single-person light motion, dual-person front-and-back comparison, product structure demonstration, full rear coverage, ribbed cotton texture, partial detail close-up, light stretch at leg opening, high-elastic rubber band, soft and skin-friendly, functional evidence, e-commerce professional feeling.",
};

const ENGLISH_SCENE_NEGATIVES: Record<string, string> = {
  "绿色草地": "seaside, sea, ocean, seawater, beach, sand, seaside rocks, coastline, indoor space, indoor studio, wall, curtains, furniture, overcast gray sky, haze, smog, gray filter, fluorescent green grass, plastic artificial turf, oversaturated blue sky, cyan-green color cast, cluttered forest, tall tree line blocking the sky, insufficient sky area, harsh midday top light, dramatic sunset, fake commercial smile, tourist snapshot, stiff posing, excessive props, oversharpened grass, pasted background, studio grass backdrop",
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
  const noPeople = input.modelCount === 0;
  const isReplacement = input.visualType === "R";
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
  if (isReplacement && input.referenceImages.length === 0) warnings.push("替换模式必须上传至少一张替换参考图，才能复刻姿势、动作、图片视角和构图。");
  if (input.productImages.length === 0) warnings.push("未提供产品参考图，无法建立产品外观高保真约束。");

  const imageReferenceInstructions = [
    input.productImages.length
      ? `产品主参考图：${input.productImages.join("、")}。仅用于锁定产品外观与包装结构。`
      : "未提供产品主参考图。",
    noPeople
      ? "已选择0人：画面中不得出现人物、人体部位、手、脸、人物倒影或人形模特；采用产品静物、平铺、悬挂、装置或环境陈列等无人摄影方式。"
      : input.characterImages.length
      ? usesCharacterGarmentReference
        ? `人物与服装参考图：${input.characterImages.join("、")}。用于保持人物身份、五官、发型与体型一致性，并参考图中服装的穿着位置、搭配关系、整体廓形、覆盖范围、自然褶皱和与姿势的贴合关系。人物图服装不得覆盖产品主图规范：巴迪高产品的版型、腰头、腿口、缝线、纹理、颜色和品牌结构始终以产品主参考图为最高优先级。`
        : `人物参考图：${input.characterImages.join("、")}。仅用于人物身份、五官、发型与体型一致性。`
      : "未提供人物参考图，使用巴迪高默认成年亚洲女性规范。",
    input.referenceImages.length
      ? isReplacement
        ? `替换参考图：${(input.referenceImageWeights?.length
            ? input.referenceImageWeights.map((item) => `${item.name}（权重：${WEIGHT_CN[item.weight]}）`)
            : input.referenceImages).join("、")}。只锁定四项：姿势、动作、图片视角和构图必须百分百复刻，包括肢体角度、重心、手脚位置、头部朝向、动作状态、机位、俯仰方向、景别、裁切、参考画幅、人物位置占比、留白和元素空间关系。不得参考替换图中的人物身份、面孔、身体特征、服装设计、光源、色温、明暗关系或影调。`
        : `风格参考图：${(input.referenceImageWeights?.length
          ? input.referenceImageWeights.map((item) => `${item.name}（权重：${WEIGHT_CN[item.weight]}）`)
          : input.referenceImages).join("、")}。权重控制风格参考的影响强度；可参考视觉风格、光影、色彩、影调、景深、留白、姿势、动作、裁切、机位、背景、家具、道具、建筑、物体位置与构图。禁止复制参考图中的主体、人物身份、脸、身体和服装设计；高权重也不得突破此边界。`
      : isReplacement ? "未提供替换参考图，无法执行维度锁定。" : "未提供额外风格参考图。",
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
    replacementMode ? `【替换规则】\n${replacementMode.prompt}` : "",
    scene && (!isReplacement || usesReplacementScene) ? `【场景视觉基因】\n${scene.prompt}` : "",
    noPeople
      ? "【无人画面规范】\n画面中不得出现人物、人体局部、手、脸、人物倒影或人形模特。围绕产品本身、风格语言和场景关系设计静物、平铺、悬挂、装置或环境陈列摄影。"
      : `【人物规范】\n${PERSON_BASE_PROMPT}`,
    `【产品与参考图】\n${PRODUCT_FIDELITY_PROMPT}\n${imageReferenceInstructions}${analysisInstructions ? `\n\n【图片视觉分析】\n${analysisInstructions}` : ""}`,
    input.productFunctions.length
      ? `【卖点视觉表达】\n${input.productFunctions
          .map((id) => findOption(SELLING_POINT_OPTIONS, id)?.prompt)
          .filter(Boolean)
          .join("\n")}`
      : "",
    isReplacement
      ? "【摄影参数】\n景别、机位、俯仰方向、镜头方向、裁切、人物位置占比、留白和构图必须百分百跟随替换参考图；页面通用景别、角度和画幅选项不得覆盖替换参考图。"
      : `【摄影参数】\n${shotScale?.prompt || input.shotScale} ${cameraAngle?.prompt || input.cameraAngle}`,
    isReplacement
      ? `【色彩与输出】\n替换参考图的光源、色温、明暗关系和影调不作为约束；${usesReplacementScene ? (tone?.prompt || input.tone) : `使用页面选择的${tone?.prompt || input.tone}`} 画幅比例跟随替换参考图，${resolution?.prompt || input.resolution}`
      : `【色彩与输出】\n${tone?.prompt || input.tone} ${aspectRatio?.prompt || input.aspectRatio} ${resolution?.prompt || input.resolution}`,
    isReplacement
      ? `【批次要求】\n本次生成${input.imageCount}张；所有图片都必须百分百保持替换参考图的姿势、动作、图片视角和构图，只允许人物、产品、场景内容及光影调性按当前替换模式变化。`
      : `【批次要求】\n本次生成${input.imageCount}张；保持品牌与产品规则一致，${noPeople ? "所有画面均保持无人，仅让产品陈列、机位和构图产生合理差异" : "同时保持人物规则一致，让构图和动作具有合理差异"}，避免复制画面。`,
    input.originalPrompt.trim() ? `【用户补充创意】\n${input.originalPrompt.trim()}` : "",
    `【质量底线】\n产品还原优先于创意发挥；${noPeople ? "产品、道具、家具" : "人物、产品、家具"}或自然环境之间的重力、遮挡、透视、受光和材质关系必须真实。`,
  ].filter(Boolean);

  const sceneLabel = scene?.label || input.productFunctions.slice(0, 2).join("·") || "品牌视觉";

  const englishReferenceInstructions = [
    input.productImages.length
      ? `Product master references: ${input.productImages.join(", ")}. Use them to lock silhouette, waistband, leg openings, seams, texture, color, pattern, binding, proportions, and packaging structure.`
      : "No product master reference was provided.",
    noPeople
      ? "People count is zero. Do not use any character reference and do not depict people, body parts, hands, faces, reflections of people, or human-shaped mannequins."
      : input.characterImages.length
      ? usesCharacterGarmentReference
        ? `Character and garment-wearing references: ${input.characterImages.join(", ")}. Preserve identity, facial features, hairstyle, and body proportions. Also reference the source clothing's wearing position, styling relationship, overall silhouette, coverage, natural folds, and pose-to-garment fit. Never let source clothing override the product master: Badigao product silhouette, waistband, leg openings, seams, texture, color, and brand structure must follow the dedicated product reference.`
        : `Character identity references: ${input.characterImages.join(", ")}. Preserve identity, facial features, hairstyle, and body proportions only.`
      : "No character reference was provided; use an unmistakably adult Asian woman aged 22–30 with natural features and healthy proportions.",
    input.referenceImageWeights?.length
      ? isReplacement
        ? `Replacement references: ${input.referenceImageWeights.map((item, index) => `Reference ${index + 1} '${item.name}'`).join("; ")}. Reproduce pose, action, camera viewpoint, shot scale, crop, reference aspect ratio, subject placement, negative space, and composition exactly. Do not inherit the reference person, identity, face, body traits, garment design, lighting, color temperature, brightness hierarchy, or tonal mood.`
        : `Style references: ${input.referenceImageWeights.map((item, index) => `Reference ${index + 1} '${item.name}' — ${WEIGHT_EN[item.weight]}`).join("; ")}. The references may influence visual style, lighting, palette, tonal contrast, depth, negative-space rhythm, pose, action, crop, camera placement, background, furniture, props, architecture, object placement, and composition. Never reproduce a reference subject, character identity, face, body, or garment design. High weight never overrides this boundary.`
      : "No additional style reference was provided.",
  ].join("\n");

  const englishSections = [
    "[BRAND AND TASK]\nBadigao premium commercial visual. Combine realistic camera rendering, candid natural lifestyle photography, and refined brand polish.",
    `[VISUAL TYPE]\n${ENGLISH_VISUAL_TYPE[input.visualType]}`,
    replacementMode ? `[REPLACEMENT RULES]\n${ENGLISH_REPLACEMENT_MODES[replacementMode.id as ReplacementModeId]}` : "",
    scene && (!isReplacement || usesReplacementScene) ? `[SCENE DNA]\n${ENGLISH_SCENES[scene.id] || scene.label}` : "",
    noPeople
      ? "[NO-PERSON COMPOSITION]\nCreate a strictly people-free product photograph. Do not show a person, body part, hand, face, skin, human reflection, or human-shaped mannequin. Build the composition from the product, the requested scene, styling surfaces, props, lighting, and abstract photographic direction only."
      : "[PERSON]\nUse an unmistakably adult Asian woman aged 22–30 with natural facial features, healthy balanced proportions, light makeup, real skin tone variation, subtle pores and fine hair. Keep the pose relaxed, non-influencer-like, non-sexualized, and physically believable.",
    `[PRODUCT AND REFERENCES]\nThe uploaded product master reference has the highest priority. Product fidelity overrides creative variation. Preserve silhouette, waistband width, leg-opening curve, seams, texture, color, pattern, binding, and proportions. Keep the product clear and unobstructed.\n${englishReferenceInstructions}`,
    input.productFunctions.length
      ? `[SELLING-POINT EXPRESSION]\n${input.productFunctions.map((id) => ENGLISH_SELLING_POINTS[id]).filter(Boolean).join("\n")}`
      : "",
    isReplacement
      ? "[CAMERA]\nReproduce the replacement reference camera viewpoint, camera height, tilt, shot direction, shot scale, crop, subject placement, negative space, reference aspect ratio, and composition exactly. Generic UI camera controls must not override the reference."
      : `[CAMERA]\n${ENGLISH_SHOTS[input.shotScale] || input.shotScale} ${ENGLISH_ANGLES[input.cameraAngle] || input.cameraAngle}`,
    isReplacement
      ? `[COLOR AND OUTPUT]\nDo not inherit or constrain lighting, palette, color temperature, brightness hierarchy, or tonal mood from the replacement reference. Use the selected scene and UI tone. Preserve the replacement-reference aspect ratio. Target resolution ${input.resolution}.`
      : `[COLOR AND OUTPUT]\n${ENGLISH_TONES[input.tone] || input.tone} Aspect ratio ${input.aspectRatio}. Target resolution ${input.resolution}.`,
    isReplacement
      ? `[BATCH]\nGenerate ${input.imageCount} image${input.imageCount === 1 ? "" : "s"}. Every image must reproduce the same replacement-reference pose, action, camera viewpoint, crop, aspect ratio, subject placement, negative space, and composition exactly. Only person, product, scene content, and lighting tone may change as allowed by the selected replacement mode.`
      : `[BATCH]\nGenerate ${input.imageCount} image${input.imageCount === 1 ? "" : "s"}. Keep brand and product rules consistent while allowing only reasonable variation in ${noPeople ? "product arrangement, camera position, framing, or subtle composition; every image must remain people-free" : "pose, framing, or subtle composition"}.`,
    input.originalPrompt.trim()
      ? `[ADDITIONAL CREATIVE DIRECTION — ORIGINAL USER TEXT]\n${input.originalPrompt.trim()}`
      : "",
    "[QUALITY FLOOR]\nProduct fidelity takes priority over creativity. Style references must never supply the subject, character identity, face, body, or garment design. Gravity, occlusion, perspective, lighting, anatomy, fabric behavior, furniture, and natural-environment relationships must remain physically credible.",
  ].filter(Boolean);

  const englishNegativePrompt = [
    "copied style-reference subject, copied character identity, copied face, copied body, copied garment design, minor, childlike face, ambiguous age, influencer face, plastic skin, waxy skin, excessive retouching, oily highlights, heavy makeup, seductive expression, erotic lingerie, transparent clothing, sexual pose, exaggerated chest, exaggerated buttocks, voyeuristic angle, distorted anatomy, extra limbs, extra fingers, missing fingers, fused fingers, twisted joints, incorrect gravity, incorrect perspective, hair clipping, garment clipping, product deformation, twisted waistband, incorrect leg openings, incorrect seams, melted fabric, wrong packaging proportions, gibberish text, low resolution, blur, noise, compression artifacts, excessive HDR, oversharpening, halos, banding, fake depth of field, excessive bokeh, fisheye, cropped head, cropped hands, cropped feet, watermark, incorrect logo, border, collage, cheap e-commerce look, obvious AI artifacts",
    ...(scene?.negativePrompt
      ? [ENGLISH_SCENE_NEGATIVES[scene.id] || "Avoid the scene-specific failures defined in the Chinese display version."]
      : []),
    ...(noPeople ? ["person, people, human, model, body, body part, hand, hands, face, skin, human reflection, human-shaped mannequin"] : []),
    ...(replacementMode ? [ENGLISH_REPLACEMENT_NEGATIVES[replacementMode.id as ReplacementModeId]] : []),
  ].join(", ");

  if (noPeople) negativeFragments.push("人物，人像，人体，身体局部，手，脸，皮肤，人物倒影，人形模特");

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
