import { ImageAsset, ReferenceImage } from "../types";

export interface MockVisual {
  url: string;
  scene: string;
  tone: '米色调' | '蓝色调';
  visualType: 'A' | 'B' | 'C';
  description: string;
}

export const PRODUCT_TEMPLATES: ImageAsset[] = [
  {
    id: "prod-1",
    name: "巴迪高 舒雅蓝无缝高弹运动内衣",
    url: "https://images.unsplash.com/photo-1571945153237-4929e78394a9?q=80&w=600",
    isMain: true
  },
  {
    id: "prod-2",
    name: "巴迪高 极简云感一次性高弹内裤",
    url: "https://images.unsplash.com/photo-1626290058507-f23004a18037?q=80&w=600",
    isMain: false
  },
  {
    id: "prod-3",
    name: "巴迪高 A类母婴级亲肤抑菌运动短裤",
    url: "https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=600",
    isMain: false
  }
];

export const CHARACTER_TEMPLATES: ImageAsset[] = [
  {
    id: "char-1",
    name: "专业运动模特 (亚洲女性)",
    url: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=600"
  },
  {
    id: "char-2",
    name: "健美健身达人 (阳光活力)",
    url: "https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=600"
  },
  {
    id: "char-3",
    name: "居家亲和女孩 (清爽日常)",
    url: "https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=600"
  }
];

export const REF_TEMPLATES: ReferenceImage[] = [
  {
    id: "ref-1",
    name: "Lululemon 户外大片风格 (冷蓝色调)",
    url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600",
    weight: "high"
  },
  {
    id: "ref-2",
    name: "Vogue 杂志摄影棚布光 (极简米色)",
    url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600",
    weight: "medium"
  },
  {
    id: "ref-3",
    name: "户外原野自然光色调 (清新温暖)",
    url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=600",
    weight: "low"
  }
];

// Curated high-res Unsplash commercial sports/ underwear lifestyle bases
export const MOCK_VISUALS: MockVisual[] = [
  // --- TYPE A: Creative / Brand Poster (草坪蓝天) ---
  {
    url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200",
    scene: "草坪蓝天",
    tone: "蓝色调",
    visualType: "A",
    description: "阳光在露珠闪烁的开阔草坪上，健美模特身着巴迪高无缝运动内衣，自信拥抱夏日清晨。"
  },
  {
    url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200",
    scene: "草坪蓝天",
    tone: "米色调",
    visualType: "A",
    description: "午后暖阳倾洒在松软的草坪上，精致的米色舒柔纤维在微风中闪烁，折射温暖光泽。"
  },
  // --- TYPE A: Creative / Brand Poster (海边) ---
  {
    url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1200",
    scene: "海边",
    tone: "蓝色调",
    visualType: "A",
    description: "清晨湛蓝的海浪拍打礁石，瑜伽师身着防汗速干一次性内衣，清凉海风勾勒优雅身姿。"
  },
  {
    url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1200",
    scene: "海边",
    tone: "米色调",
    visualType: "A",
    description: "晚霞下的金色海滩，温暖柔和的金色影调完美包裹模特，高弹腰带勾勒无痕质感。"
  },
  // --- TYPE A: Creative / Brand Poster (棚拍) ---
  {
    url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200",
    scene: "棚拍",
    tone: "蓝色调",
    visualType: "A",
    description: "专业影棚内冷灰色硬朗光线，极简蓝色硬质背景前，高频光圈还原巴迪高内衣微孔透气织网。"
  },
  {
    url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1200",
    scene: "棚拍",
    tone: "米色调",
    visualType: "A",
    description: "柔光摄影棚内温润柔和的人像布光，极高显色指数还原面料天然精梳棉感与精细无感车线。"
  },
  // --- TYPE A: Creative / Brand Poster (室内家居) ---
  {
    url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200",
    scene: "室内家居",
    tone: "米色调",
    visualType: "A",
    description: "极简北欧风卧室，晨曦透过薄纱照在温润的木地板上，自然健康的松弛居家氛围感。"
  },
  {
    url: "https://images.unsplash.com/photo-1598136490941-30d885318abd?q=80&w=1200",
    scene: "室内家居",
    tone: "蓝色调",
    visualType: "A",
    description: "浅灰蓝色现代客厅，冷感漫射光线下模特专注拉伸，极简无缝剪裁贴合身型曲线。"
  },

  // --- TYPE B: Lifestyle Documentaries (生活纪实) ---
  {
    url: "https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=1200",
    scene: "室内家居",
    tone: "米色调",
    visualType: "B",
    description: "清早阳光照亮床沿，女孩随性穿着巴迪高高弹无痕裤，真实的生活特写与纯棉肌肤触感。"
  },
  {
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200",
    scene: "棚拍",
    tone: "米色调",
    visualType: "B",
    description: "极其真实的随性抓拍镜头，模特随和微笑着调整无感肩带，自然的生活流Lookbook质感。"
  },
  {
    url: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=1200",
    scene: "草坪蓝天",
    tone: "蓝色调",
    visualType: "B",
    description: "阳光露珠轻吻肌肤，女孩在大自然中赤足舒展，纯棉质感带来毫无约束的自由呼吸体验。"
  },
  {
    url: "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?q=80&w=1200",
    scene: "海边",
    tone: "蓝色调",
    visualType: "B",
    description: "海滨微风，随手抓拍奔跑大笑的洒脱姿态，温和的蓝色日光在速干纯棉面料上闪烁微光。"
  },

  // --- TYPE C: Product Functions / Features (微距功能) ---
  {
    url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=1200",
    scene: "功能",
    tone: "蓝色调",
    visualType: "C",
    description: "【灭菌级透气特写】超高倍率微距镜头，展现面料极度均匀细密的呼吸纤维网眼，极致透气。"
  },
  {
    url: "https://images.unsplash.com/photo-1528158229374-4f24f855de00?q=80&w=1200",
    scene: "功能",
    tone: "米色调",
    visualType: "C",
    description: "【亲肤柔软、母婴级触感】微距镜头聚焦天然精梳棉的长纤维，柔润如云，无杂质不扎痒。"
  },
  {
    url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1200",
    scene: "功能",
    tone: "米色调",
    visualType: "C",
    description: "【3D人体工学剪裁】三维电脑扫描质感，勾勒温和弹力腰身及防漏裆部，舒适贴身不卡臀。"
  },
  {
    url: "https://images.unsplash.com/photo-1518459031867-a89b944bffe4?q=80&w=1200",
    scene: "功能",
    tone: "蓝色调",
    visualType: "C",
    description: "【极高弹力不勒腰】高动态水滴喷射般的拉伸特写，弹力氨纶丝与纯棉丝线交织，拉伸而不变形。"
  }
];

// Helper to get simulated generated pictures
export function getSimulatedImages(
  visualType: 'A' | 'B' | 'C',
  scene: string | undefined,
  tone: string,
  count: number,
  productName?: string,
  productUrl?: string,
  characterUrl?: string
): string[] {
  // Determine product category
  let category: 'panties' | 'bra' | 'shorts' | 'general' = 'general';
  const nameLower = (productName || "").toLowerCase();
  
  if (nameLower.includes("裤") && !nameLower.includes("短裤") && !nameLower.includes("运动裤") && !nameLower.includes("外穿")) {
    category = 'panties';
  } else if (nameLower.includes("短裤") || nameLower.includes("shorts") || nameLower.includes("运动裤")) {
    category = 'shorts';
  } else if (nameLower.includes("内衣") || nameLower.includes("文胸") || nameLower.includes("bra") || nameLower.includes("吊带") || nameLower.includes("背心") || nameLower.includes("抹胸")) {
    category = 'bra';
  }

  // Define tailored pools for each category and tone
  const pools: Record<'panties' | 'bra' | 'shorts' | 'general', Record<'米色调' | '蓝色调', string[]>> = {
    panties: {
      "米色调": [
        "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?q=80&w=1200", // Soft white briefs on cozy bed sheets
        "https://images.unsplash.com/photo-1620122303020-43ec4b6cf7f8?q=80&w=1200", // Soft cotton white underwear brief closeup
        "https://images.unsplash.com/photo-1616606145307-2ccf1fab36f6?q=80&w=1200", // Minimalist warm bedroom underwear lifestyle
        "https://images.unsplash.com/photo-1541513781964-14072556228b?q=80&w=1200", // Cozy soft bralette & panties lounge
        "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=1200"  // Cloud-feel stretching comfy wear
      ],
      "蓝色调": [
        "https://images.unsplash.com/photo-1598136490941-30d885318abd?q=80&w=1200", // Cozy gray-blue active lifestyle
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1200", // Beach yoga in blue comfortable clothing
        "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=1200"  // Soft sports-bra / briefs blue tone
      ]
    },
    bra: {
      "米色调": [
        "https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=1200", // Asian girl in white rib camisole (perfect match)
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200", // Cozy white lounge top stretching
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200", // Beige cozy bralette lounging
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200", // Light beige comfortable crop top
        "https://images.unsplash.com/photo-1541513781964-14072556228b?q=80&w=1200"  // Soft bralette home cozy
      ],
      "蓝色调": [
        "https://images.unsplash.com/photo-1571945153237-4929e78394a9?q=80&w=1200", // Blue seamless sport bra
        "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=1200", // Blue sport top model stretching
        "https://images.unsplash.com/photo-1598136490941-30d885318abd?q=80&w=1200", // Blue activewear lounge
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1200"  // Ocean-side yoga activewear blue
      ]
    },
    shorts: {
      "米色调": [
        "https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=1200", // Warm sports shorts beige
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200"  // Soft lounge look
      ],
      "蓝色调": [
        "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=1200", // Blue athletic shorts model
        "https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=1200"  // Blue fitness gym shorts
      ]
    },
    general: {
      "米色调": [
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200",
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200",
        "https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=1200",
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200"
      ],
      "蓝色调": [
        "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=1200",
        "https://images.unsplash.com/photo-1571945153237-4929e78394a9?q=80&w=1200",
        "https://images.unsplash.com/photo-1598136490941-30d885318abd?q=80&w=1200",
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1200"
      ]
    }
  };

  // Select appropriate pool based on detected category
  const activeTone: '米色调' | '蓝色调' = (tone === "蓝色调") ? "蓝色调" : "米色调";
  let pool = pools[category][activeTone];

  // If Type C (Micro Feature Detail), use fabric closeups
  if (visualType === 'C') {
    pool = (activeTone === "蓝色调") 
      ? [
          "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=1200", // blue breath micro weave
          "https://images.unsplash.com/photo-1518459031867-a89b944bffe4?q=80&w=1200"  // blue high-elastic close up
        ]
      : [
          "https://images.unsplash.com/photo-1528158229374-4f24f855de00?q=80&w=1200", // beige natural cotton fiber
          "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1200"  // beige detail weave
        ];
  }

  // Fallback to MOCK_VISUALS filtered list if we somehow got an empty pool
  if (!pool || pool.length === 0) {
    const backup = MOCK_VISUALS.filter(v => v.visualType === visualType && v.tone === activeTone);
    pool = backup.length > 0 ? backup.map(v => v.url) : MOCK_VISUALS.map(v => v.url);
  }

  // Generate results
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const baseIndex = i % pool.length;
    const baseUrl = pool[baseIndex];
    
    // Create a dynamic URL with variations
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.set("sig", `${i + 1}-${Math.floor(Math.random() * 10000)}`);
    results.push(urlObj.toString());
  }

  return results;
}
