import express from "express";
import path from "path";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, type Part } from "@google/genai";
import { fetch as undiciFetch, FormData as UndiciFormData, Agent, ProxyAgent } from "undici";
import sharp from "sharp";
import {
  type AssetAnalysis,
  compilePrompt,
  type ImageReferenceRole,
  type ReplacementReferenceCategory,
  type PromptImageInput,
  PROMPT_REFINER_SYSTEM_INSTRUCTION,
  type PromptCompileInput,
  type VisualTypeId,
} from "./src/prompt-config/promptConfig";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_REFERENCE_IMAGES = 8;
const MAX_SUBMITTED_IMAGES = 24;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

app.use(express.json({ limit: "50mb" }));

const GENERATED_DIR = path.join(process.cwd(), "generated");
const GEMINI_API_BASE_URL = (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const OPENAI_PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const openAIProxyAgent = OPENAI_PROXY_URL ? new ProxyAgent(OPENAI_PROXY_URL) : undefined;
app.use("/generated", express.static(GENERATED_DIR));

let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
  console.log("Gemini SDK successfully initialized on server.");
} catch (error) {
  console.error("Failed to initialize Gemini SDK:", error);
}

function normalizePromptInput(body: Record<string, unknown>): PromptCompileInput {
  const visualType = (["A", "B", "C", "R"].includes(String(body.visualType))
    ? String(body.visualType)
    : "A") as VisualTypeId;
  const replacementMode = (["服装+场景替换", "产品替换", "服装替换"].includes(String(body.replacementMode))
    ? String(body.replacementMode)
    : "服装+场景替换") as PromptCompileInput["replacementMode"];
  const replacementWorkflow = body.replacementWorkflow === "pose_rebuild" || body.replacementWorkflow === "product_only" || body.replacementWorkflow === "multi_replace" ? body.replacementWorkflow : "multi_replace";
  const rawReferenceImages = Array.isArray(body.referenceImages) ? body.referenceImages.map(String).filter(Boolean) : [];
  const referenceImages = visualType !== "R" || replacementWorkflow === "multi_replace"
    ? rawReferenceImages
    : replacementWorkflow === "product_only"
      ? rawReferenceImages.filter((name) => name.includes("[base_image]") || name.includes("[scene]")).slice(0, 1).map((name) => name.replace("[scene]", "[base_image]"))
      : rawReferenceImages.filter((name) => name.includes("[action]") || name.includes("[scene]"));
  const rawReferenceWeights = Array.isArray(body.referenceImageWeights)
    ? body.referenceImageWeights.map((item) => {
        const entry = (item || {}) as Record<string, unknown>;
        const weight = ["low", "medium", "high"].includes(String(entry.weight))
          ? String(entry.weight) as "low" | "medium" | "high"
          : "medium";
        return { name: String(entry.name || "Style reference"), weight };
      })
    : [];
  const referenceImageWeights = referenceImages.map((name) => {
    const sourceName = name.replace("[base_image]", "[scene]");
    const match = rawReferenceWeights.find((item) => item.name === name || item.name === sourceName);
    return { name, weight: replacementWorkflow === "product_only" ? "high" as const : match?.weight || "medium" as const };
  });

  return {
    visualType,
    replacementMode,
    replacementWorkflow,
    sceneSource: body.sceneSource === "reference" ? "reference" : "preset",
    scene: typeof body.scene === "string" ? body.scene : undefined,
    productFunctions: Array.isArray(body.productFunctions) ? body.productFunctions.map(String) : [],
    shotScale: typeof body.shotScale === "string" ? body.shotScale : "中景",
    cameraAngle: typeof body.cameraAngle === "string" ? body.cameraAngle : "平视",
    tone: typeof body.tone === "string" ? body.tone : "米色调",
    originalPrompt: typeof body.originalPrompt === "string" ? body.originalPrompt : "",
    resolution: typeof body.resolution === "string" ? body.resolution : "2K",
    aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : "3:4",
    imageCount: Number.isFinite(Number(body.imageCount)) ? Number(body.imageCount) : 4,
    modelCount: Number.isFinite(Number(body.modelCount)) ? Math.max(0, Math.min(2, Number(body.modelCount))) : 1,
    multiPersonMode: replacementWorkflow !== "product_only" && body.multiPersonMode === true,
    personBindings: replacementWorkflow !== "product_only" && Array.isArray(body.personBindings)
      ? body.personBindings.slice(0, 2).map((item) => {
          const binding = (item || {}) as Record<string, unknown>;
          return {
            slotId: String(binding.slotId || ""),
            label: String(binding.label || ""),
            sourcePosition: String(binding.sourcePosition || ""),
            operation: String(binding.operation || ""),
            characterImage: typeof binding.characterImage === "string" ? binding.characterImage : undefined,
            productImage: typeof binding.productImage === "string" ? binding.productImage : undefined,
            upperGarmentImage: typeof binding.upperGarmentImage === "string" ? binding.upperGarmentImage : undefined,
            lowerGarmentImage: typeof binding.lowerGarmentImage === "string" ? binding.lowerGarmentImage : undefined,
          };
        })
      : [],
    productImages: Array.isArray(body.productImages) ? body.productImages.map(String).filter(Boolean) : [],
    characterImages: replacementWorkflow === "product_only" ? [] : Array.isArray(body.characterImages) ? body.characterImages.map(String).filter(Boolean) : [],
    referenceImages,
    referenceImageWeights,
    imageAnalyses: Array.isArray(body.imageAnalyses) ? (body.imageAnalyses as AssetAnalysis[]) : [],
  };
}

function parseImageDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl);
  if (!match) throw new Error("图片数据格式无效，仅支持 Base64 图片 Data URL。");
  const data = match[2].replace(/\s/g, "");
  const byteLength = Buffer.byteLength(data, "base64");
  if (byteLength > MAX_IMAGE_BYTES) throw new Error("单张参考图处理后不能超过 20MB。");
  return { mimeType: match[1], data, byteLength };
}

function getOpenAIImageSize(aspectRatio: string, resolution: string) {
  const sizes: Record<string, Record<string, string>> = {
    "1:1": { "1K": "1024x1024", "2K": "2048x2048", "4K": "2880x2880" },
    "2:3": { "1K": "1024x1536", "2K": "1360x2048", "4K": "1920x2880" },
    "3:2": { "1K": "1536x1024", "2K": "2048x1360", "4K": "2880x1920" },
    "3:4": { "1K": "1152x1536", "2K": "1536x2048", "4K": "2160x2880" },
    "4:3": { "1K": "1536x1152", "2K": "2048x1536", "4K": "2880x2160" },
    "9:16": { "1K": "864x1536", "2K": "1152x2048", "4K": "1616x2880" },
    "16:9": { "1K": "1536x864", "2K": "2048x1152", "4K": "2880x1616" },
  };
  return sizes[aspectRatio]?.[resolution] || "auto";
}

function getOpenAIImageQuality(resolution: string) {
  if (process.env.OPENAI_IMAGE_QUALITY) return process.env.OPENAI_IMAGE_QUALITY;
  if (resolution === "4K") return "high";
  if (resolution === "1K") return "low";
  return "medium";
}

async function parseOpenAIResponse(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  const payload = await response.json() as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string; code?: string };
  };
  if (!response.ok) {
    const code = payload.error?.code ? ` (${payload.error.code})` : "";
    throw new Error(`${payload.error?.message || `OpenAI API 请求失败：${response.status}`}${code}`);
  }
  const base64 = payload.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI API 未返回图片数据。");
  return base64;
}

async function requestOpenAIImage(args: {
  prompt: string;
  assets: PromptImageInput[];
  size: string;
  quality: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("尚未配置 OPENAI_API_KEY，无法调用 GPT Image 2。");

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const headers = { Authorization: `Bearer ${apiKey}` };
  const signal = AbortSignal.timeout(180_000);

  if (args.assets.length === 0) {
    const response = await undiciFetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: args.prompt,
        size: args.size,
        quality: args.quality,
        output_format: "webp",
        output_compression: 92,
      }),
      signal,
      dispatcher: openAIProxyAgent,
    });
    return parseOpenAIResponse(response);
  }

  const form = new UndiciFormData();
  form.append("model", model);
  form.append("prompt", args.prompt);
  form.append("size", args.size);
  form.append("quality", args.quality);
  form.append("output_format", "webp");
  form.append("output_compression", "92");
  args.assets.forEach((asset, index) => {
    const parsed = parseImageDataUrl(asset.dataUrl);
    const extension = parsed.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const blob = new Blob([Buffer.from(parsed.data, "base64")], { type: parsed.mimeType });
    form.append("image[]", blob, `reference-${index + 1}.${extension}`);
  });

  const response = await undiciFetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers,
    body: form,
    signal,
    dispatcher: openAIProxyAgent,
  });
  return parseOpenAIResponse(response);
}

function normalizeGeminiImageResolution(resolution: string) {
  return ["1K", "2K", "4K"].includes(resolution) ? resolution : "2K";
}

const GEMINI_REFERENCE_BOUNDARY = `
[REFERENCE ROLE BOUNDARY — MANDATORY]
Every uploaded image has one and only one role. Never merge roles between images.
- [action] REPLACEMENT REFERENCE: use only pose, limb angles, center of gravity, hand/foot positions, head direction, and action. Ignore its background, environment, props, composition, crop, camera, lighting, palette, identity, and clothing.
- [composition] REPLACEMENT REFERENCE: use only camera viewpoint, shot scale, crop, aspect ratio, subject placement/ratio, negative space, horizon, perspective, and spatial layout. Ignore its background identity, environment type, props, lighting, palette, person identity, and clothing.
- [scene] REPLACEMENT REFERENCE: use only environment, location objects, lighting, palette, atmosphere, and scene depth. It must not control person identity, pose, garment design, product design, or camera when a composition reference exists.
- [upper_garment]/[lower_garment] REPLACEMENT REFERENCE: use only garment category, wearing position, coverage, layering, and fit. Ignore background, scene, camera, pose, identity, and lighting.
- [base_image] IMMUTABLE BASE IMAGE: preserve every non-target pixel, person identity, face, hair, body, pose, garment occlusion, composition, scene, props, camera, lighting, and spatial relationship. Detect and remove only the original target product, then replace it completely with PRODUCT MASTER. Never retain or blend the old product design.
- When no [scene] image is uploaded, the selected PRESET SCENE is the exclusive source of environment, background objects, lighting, palette, and atmosphere. Action and composition images are forbidden from supplying any scene content.
- CREATIVE BASE / STYLE REFERENCE: use as an overall creative template for a similar product image. It may guide visual language, scene, lighting, palette, composition, camera, crop, subject placement, existing people, face/body presentation, pose, action, and relationships. A dedicated CHARACTER IDENTITY image overrides its person identity. Never carry over the reference product or garment design; PRODUCT MASTER exclusively controls the final product silhouette, color, texture, pattern, seams, branding, and construction.
- CHARACTER + GARMENT REFERENCE: preserve adult identity, facial features, hairstyle, and body proportions; also reference clothing placement, styling relationship, overall silhouette, coverage, natural folds, and pose-to-garment fit. Product design details must still come from PRODUCT MASTER/DETAIL.
- CHARACTER IDENTITY: preserve only the adult person's identity, facial geometry, facial landmarks, hairstyle, skin appearance, and body proportions. Do not copy clothing, pose, crop, background, lighting, or scene objects. When marked [identity-lock], it is the highest and exclusive identity authority: fully replace the person identity visible in [action] or [composition] references; never blend identities.
- PRODUCT MASTER/DETAIL: preserve only the product's design, construction, color, texture, seams, proportions, and visible brand structure. Do not copy the source background, body pose, crop, or surrounding objects.
The requested scene and camera settings must create a commercially usable photograph while respecting every reference role boundary.
`;

const GEMINI_FINAL_COMPLIANCE = "FINAL COMPLIANCE CHECK: Obey every category tag literally. If a [base_image] is present, preserve it exactly except for the old target product: remove the old product completely and replace it with PRODUCT MASTER; the product master overrides every old product pixel, color, silhouette, texture, pattern, seam, and construction detail. Do not regenerate unrelated regions. Otherwise, [action] controls pose only; [composition] controls camera and layout only; [scene] controls environment only. If no [scene] reference exists, the selected preset scene exclusively controls environment, background objects, lighting, palette, and atmosphere. Never copy background or scene content from [action] or [composition]. If an [identity-lock] character reference is present, exact identity transfer is mandatory: it is the highest and exclusive identity authority, and any person identity in [action], [composition], or other references must be discarded rather than blended. In creative mode, a HIGH-WEIGHT CREATIVE BASE / STYLE REFERENCE is a mandatory subject-and-composition skeleton: preserve its existing human presence and count, relationships, pose/action, crop, camera, subject scale, major props, product placement, background organization, lighting, and color as closely as the output aspect ratio allows. Never collapse a people-containing creative base into an isolated product still life. Without a dedicated character identity image, preserve the creative base's existing people and subject presentation; otherwise the dedicated character reference overrides identity only. Product design always comes exclusively from PRODUCT MASTER.";
const GEMINI_SAFE_COMMERCIAL_FRAMING = "Depict clearly adult professional models only. Present the apparel in a neutral, non-sexualized commercial catalog and brand-campaign context, with natural posture and product-focused framing.";
const GEMINI_NO_PEOPLE_FRAMING = "People count is set to zero, meaning DO NOT AUTONOMOUSLY ADD any new person, face, hand, body part, human reflection, or mannequin. If an active reference already contains a person or body part, preserve only its existing presence, count, crop, pose, action, occlusion, and product-contact relationship as a product-display carrier; never invent, complete, expand, duplicate, or reveal additional human anatomy beyond the reference. If no active reference contains human content, use a fully people-free still-life, flat-lay, hanging, installation, or environmental product display. Keep the treatment neutral, non-sexualized, and product-focused.";
type GeminiReferenceMetadata = Pick<PromptImageInput, "name" | "role" | "weight" | "referenceCategory">;

const REFERENCE_CATEGORIES = new Set<ReplacementReferenceCategory>([
  "base_image", "scene", "upper_garment", "lower_garment", "composition", "action",
]);

function inferReferenceCategory(asset: GeminiReferenceMetadata): ReplacementReferenceCategory | undefined {
  if (asset.referenceCategory) return asset.referenceCategory;
  return (["base_image", "scene", "upper_garment", "lower_garment", "composition", "action"] as const)
    .find((category) => asset.name.includes(`[${category}]`));
}

function auditPromptStructure(input: PromptCompileInput, assets: GeminiReferenceMetadata[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const productMasters = assets.filter((asset) => asset.role === "product_master");
  if (assets.length > MAX_REFERENCE_IMAGES) errors.push(`当前工作流共有 ${assets.length} 张有效参考图，超过模型 ${MAX_REFERENCE_IMAGES} 张上限。`);
  if (productMasters.length !== 1) errors.push(productMasters.length === 0 ? "缺少产品主图（product_master）。" : "产品主图只能有一张。");
  assets.forEach((asset, index) => {
    if (!asset.weight) errors.push(`参考图 ${index + 1}（${asset.name}）未明确权重。`);
    if (asset.role === "replacement_reference") {
      const category = inferReferenceCategory(asset);
      if (!category) errors.push(`替换参考图 ${index + 1} 未挂载 action/composition/scene 等结构化类别。`);
      if (asset.referenceCategory && !asset.name.includes(`[${asset.referenceCategory}]`)) {
        errors.push(`参考图 ${index + 1} 的类别字段为 ${asset.referenceCategory}，但提示词名称未挂载对应标签。`);
      }
    }
  });
  if (input.visualType === "R") {
    const replacementAssets = assets.filter((asset) => asset.role === "replacement_reference");
    const categories = replacementAssets.map(inferReferenceCategory).filter(Boolean);
    const categoryKeys = replacementAssets.map((asset) => {
      const category = inferReferenceCategory(asset);
      const personSlot = /\[person-([A-B])\]/.exec(asset.name)?.[1];
      return category === "upper_garment" || category === "lower_garment"
        ? `${category}:${personSlot || "unbound"}`
        : category;
    }).filter(Boolean);
    if (new Set(categoryKeys).size !== categoryKeys.length) errors.push("同一职责与人物槽位上传了多张参考图，来源权重不唯一。");
    if (input.replacementWorkflow === "product_only" && !categories.includes("base_image")) errors.push("原图单品替换缺少 [base_image]。");
    if (input.replacementWorkflow === "pose_rebuild" && !categories.includes("action")) errors.push("姿势锁定重构缺少 [action]。");
    if (input.replacementWorkflow === "multi_replace" && !categories.includes("composition")) errors.push("多要素精确替换缺少 [composition]。");
    if (input.replacementWorkflow !== "product_only" && !categories.includes("scene")) {
      warnings.push(`未上传 [scene]；环境唯一来源为预设场景「${input.scene || "未选择"}」，[action] 与 [composition] 不得提供环境。`);
    }
  }
  return { errors, warnings };
}

function enforcePromptStructure(input: PromptCompileInput, assets: GeminiReferenceMetadata[]) {
  const audit = auditPromptStructure(input, assets);
  if (audit.errors.length) throw new Error(`提示词结构校验失败：${audit.errors.join("；")}`);
  return audit;
}

function getGeminiReferenceInstruction(asset: GeminiReferenceMetadata, index: number) {
  const weight = asset.weight || "medium";
  const weightRules = {
    low: "LOW creative-template intensity: use only a faint secondary cue; scene and UI camera settings may lead.",
    medium: "MEDIUM creative-template intensity: make the referenced visual direction, subject arrangement, and composition clearly recognizable while allowing moderate adaptation.",
    high: "HIGH creative-template intensity — MANDATORY SUBJECT AND COMPOSITION SKELETON LOCK. Preserve the reference's existing person count, human presence, relative positions, pose/action, interaction, gaze relationship, crop logic, camera direction, subject scale, major props, product placement, negative space, background organization, lighting direction, and color relationship as closely as the requested output aspect ratio allows. Do not collapse a people-containing reference into an isolated product still life. The main semantic change must be replacement of the reference product/garment with PRODUCT MASTER; dedicated CHARACTER IDENTITY still overrides reference identity when present.",
  } as const;

  const referenceCategory = inferReferenceCategory(asset);
  const replacementRule = referenceCategory === "base_image"
    ? "ROLE = IMMUTABLE BASE IMAGE FOR PRODUCT-ONLY REPLACEMENT. Preserve every non-target pixel and all people, faces, bodies, poses, garments, composition, scene, props, camera, lighting, shadows, and spatial relationships. Identify the old target product region, erase the old product completely, and replace it with PRODUCT MASTER at matching scale, perspective, occlusion, contact shadow, and ambient light. The PRODUCT MASTER has absolute authority over the replacement region. Never keep, blend, recolor, or merely retouch the old product."
    : referenceCategory === "action"
    ? "ROLE = ACTION / POSE ONLY. Reproduce only pose, limb angles, center of gravity, hand and foot positions, head direction, and action. ABSOLUTELY IGNORE the image's background, environment, location, props, composition, crop, camera, lighting, palette, identity, and clothing."
    : referenceCategory === "composition"
    ? "ROLE = COMPOSITION / CAMERA ONLY. Reproduce only camera viewpoint, shot scale, crop, aspect ratio, subject bounding box and frame ratio, subject center, margins, negative space, horizon, vanishing point, perspective, and spatial layout. ABSOLUTELY IGNORE background identity, environment type, location objects, props, lighting, palette, person identity, and clothing."
    : referenceCategory === "scene"
    ? "ROLE = SCENE ONLY. Use only environment, location objects, lighting, palette, atmosphere, and scene depth. Do not inherit person identity, pose, clothing, product design, or camera/layout when a composition reference exists."
    : referenceCategory === "upper_garment" || referenceCategory === "lower_garment"
    ? "ROLE = GARMENT-WEARING ONLY. Use only garment category, wearing position, coverage, layering, fit, and natural folds. Ignore background, scene, camera, pose, identity, and lighting."
    : "ROLE = CATEGORY-TAGGED REPLACEMENT REFERENCE. Use only the responsibility stated in its name; never inherit unrelated scene, identity, product, camera, or lighting content.";
  const personSlotMatch = /\[person-([A-B])\]/.exec(asset.name);
  const personSlotRule = personSlotMatch
    ? referenceCategory === "upper_garment" || referenceCategory === "lower_garment"
      ? ` This garment reference belongs exclusively to PERSON ${personSlotMatch[1]}. Never apply its garment category, coverage, layering, fit, or styling relationship to another person slot.`
      : ` This identity belongs exclusively to PERSON ${personSlotMatch[1]}. Never apply its face, hair, body traits, clothing, or identity to any other person slot.`
    : "";
  const productSlotMatch = /^\[product-for-([A-B+]+)\]/.exec(asset.name);
  const productSlotRule = productSlotMatch
    ? ` This product is bound exclusively to PERSON SLOT(S) ${productSlotMatch[1].replace(/\+/g, ", ")}. Never place it on or associate it with any other person slot.`
    : "";
  const identityLockRule = asset.name.includes("[identity-lock]")
    ? " IDENTITY TRANSFER IS MANDATORY. This image is the HIGHEST and EXCLUSIVE identity authority. Reconstruct the output person with this reference's facial geometry and landmarks, eye/nose/lip proportions, hairstyle, skin appearance, and body proportions. Completely replace and discard the identity of every person visible in ACTION, COMPOSITION, or other references. Never average, blend, or retain their face or body traits. The action reference controls pose only."
    : "";

  const roleRules: Record<ImageReferenceRole, string> = {
    replacement_reference: `${replacementRule}${personSlotRule}`,
    style_reference: `ROLE = CREATIVE BASE / STYLE REFERENCE. ${weightRules[weight]} Recreate a similar overall product image using this reference's visual language, scene atmosphere, lighting, palette, composition, camera, crop, negative space, subject placement, existing people, face/body presentation, pose, action, and relationships as continuity guidance. If a dedicated CHARACTER IDENTITY reference exists, it overrides this image for identity, face, hair, and body proportions. Replace the reference product or garment with PRODUCT MASTER; never retain or blend the reference product's silhouette, color, texture, pattern, seams, branding, or construction.`,
    character_garment_reference: `ROLE = CHARACTER + GARMENT-WEARING REFERENCE. Preserve adult identity, facial features, hairstyle, and body proportions. Also reference clothing placement, styling relationship, overall silhouette, coverage, natural folds, and pose-to-garment fit. Never copy source product design over the PRODUCT MASTER; product silhouette, waistband, leg openings, seams, texture, color, and brand structure come from the dedicated product reference.${personSlotRule}`,
    character_identity: `ROLE = CHARACTER IDENTITY ONLY.${identityLockRule} Preserve adult identity, facial geometry, facial landmarks, eye/nose/lip proportions, hairstyle, skin appearance, and body proportions. Ignore and replace the source clothing, pose, expression, crop, background, lighting, and props.${personSlotRule}`,
    product_master: `ROLE = PRODUCT MASTER. Preserve product silhouette, construction, color, texture, seams, binding, proportions, and visible brand structure with highest fidelity. Ignore the source background, pose, crop, and surrounding objects.${productSlotRule}`,
    product_detail: `ROLE = PRODUCT DETAIL. Preserve only the visible material and construction details. Do not inherit the source scene, pose, crop, or unrelated objects.${productSlotRule}`,
  };

  return `REFERENCE IMAGE ${index + 1}: ${asset.name}. ${roleRules[asset.role]}`;
}

function orderGeminiReferences<T extends GeminiReferenceMetadata>(assets: T[]) {
  const rolePriority: Record<ImageReferenceRole, number> = {
    replacement_reference: 0,
    style_reference: 1,
    character_garment_reference: 2,
    character_identity: 3,
    product_detail: 4,
    product_master: 5,
  };
  return [...assets].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);
}

function buildGeminiGenerationPrompt(
  basePrompt: string,
  negativePrompt: string,
  index: number,
  imageCount: number,
  modelCount: number,
  isReplacement = false,
  replacementWorkflow = "",
) {
  const noPeople = modelCount === 0;
  const isProductOnly = replacementWorkflow === "product_only";
  return [
    basePrompt,
    `[COMMERCIAL SAFETY FRAMING]\n${noPeople ? GEMINI_NO_PEOPLE_FRAMING : GEMINI_SAFE_COMMERCIAL_FRAMING}`,
    `[BATCH VARIATION]\nThis is image ${index + 1} of ${imageCount}. Preserve the product, brand rules, and all reference-image responsibilities.${isProductOnly
      ? " Product-only replacement: preserve the immutable base image exactly outside the target product region. Remove the old product completely and replace it with PRODUCT MASTER; do not return an unchanged copy of the base image."
      : isReplacement
      ? " This is replacement mode: obey category tags without mixing responsibilities. [action] controls pose only; [composition] controls camera/layout only; [scene] or the selected preset controls environment only. Never copy scene content from action or composition references."
      : noPeople
      ? " Do not add any human content beyond what is already explicitly present in active references. Preserve reference-contained pose or body-part support only where needed to display the product; otherwise keep the image fully people-free."
      : " Preserve character identity. Vary only pose, framing, or subtle composition where reasonable."}`,
    negativePrompt ? `[MUST AVOID]\n${negativePrompt}` : "",
  ].filter(Boolean).join("\n\n");
}

function buildGeminiPromptPreview(prompt: string, assets: GeminiReferenceMetadata[]) {
  const referenceBlocks = orderGeminiReferences(assets).map((asset, index) =>
    `${getGeminiReferenceInstruction(asset, index)}\n[BINARY REFERENCE IMAGE ${index + 1} IS INSERTED HERE]`,
  );
  return [prompt, GEMINI_REFERENCE_BOUNDARY.trim(), ...referenceBlocks, GEMINI_FINAL_COMPLIANCE].join("\n\n");
}

function buildChinesePromptPreview(
  basePrompt: string,
  negativePrompt: string,
  assets: GeminiReferenceMetadata[],
  imageCount: number,
  modelCount: number,
  isReplacement = false,
  replacementWorkflow = "",
) {
  const isProductOnly = replacementWorkflow === "product_only" || assets.some((asset) => asset.name.includes("[base_image]"));
  const roleLabels: Record<ImageReferenceRole, string> = {
    product_master: "产品主参考图",
    product_detail: "产品细节参考图",
    character_identity: "人物身份参考图",
    character_garment_reference: "人物与服装参考图",
    style_reference: "风格参考图",
    replacement_reference: "替换构图参考图",
  };
  const referenceBlocks = orderGeminiReferences(assets).map((asset, index) => {
    const weight = asset.weight === "high" ? "高" : asset.weight === "low" ? "低" : "中";
    const replacementBoundary = asset.name.includes("[base_image]")
      ? "这是原图单品替换的不可变基础图。除旧产品所在目标区域外，人物身份、面孔、发型、身体、姿势、服装遮挡、构图、场景、道具、机位、光影、阴影和所有像素均保持不变。必须完整移除旧产品，并用产品主参考图中的新产品替换；禁止保留、混合、改色或仅修饰旧产品。"
      : asset.name.includes("[action]")
      ? "仅提取人物姿势、肢体角度、重心、手脚位置、头部朝向和动作；严禁提取背景、场景、道具、构图、机位、裁切、光影、色彩、人物身份或服装。"
      : asset.name.includes("[composition]")
      ? "仅提取机位、景别、裁切、画幅、主体占比与位置、留白、地平线、透视和空间布局；严禁提取背景内容、环境类型、场景道具、光影、色彩、人物身份或服装。"
      : asset.name.includes("[scene]")
      ? "仅提取环境、地点元素、场景道具、光影、色彩、氛围和景深；不得控制人物身份、姿势、服装、产品设计，存在构图图时也不得控制机位与布局。"
      : asset.name.includes("[upper_garment]") || asset.name.includes("[lower_garment]")
      ? "仅提取服装类别、穿着位置、覆盖范围、层叠关系、贴合关系和自然褶皱；严禁提取背景、场景、机位、构图、姿势、人物身份和光影。"
      : "严格按图片名称中的类别标签使用，不得让该图片影响标签职责以外的场景、人物、产品、机位或光影。";
    const boundary = asset.role === "replacement_reference"
      ? replacementBoundary
      : asset.role === "character_garment_reference"
      ? "保持人物身份、五官、发型和体型，并参考服装的穿着位置、搭配、廓形、覆盖范围、自然褶皱及姿势贴合；巴迪高产品设计细节仍严格服从产品主参考图。"
      : asset.role === "product_master" || asset.role === "product_detail"
      ? "仅锁定产品外观、结构、材质和细节，不复制原图背景与构图。"
      : asset.role === "character_identity"
      ? asset.name.includes("[identity-lock]")
        ? "人物身份必须完成强制替换。该图是最高且唯一的人物身份依据：严格锁定脸型、五官几何与关键点、眼鼻唇比例、发型、肤色观感和体型比例；动作/构图参考图只提供姿势或机位，必须完全丢弃其中原人物的面孔与身体特征，禁止身份混合；不复制本图的服装、姿势、表情、裁切、背景与光线。"
        : "仅保持成年人物身份、五官、发型和体型，不复制服装、姿势、裁切、背景与光线。"
      : `${asset.weight === "high"
        ? "【高权重·强制】锁定主体与构图骨架：保留参考图已有的人物数量与是否有人、相对位置、姿势动作、互动关系、裁切、机位、主体占比、主要道具、产品位置、留白、背景组织、光线和色彩；严禁把含人物参考图退化为孤立产品静物或陈列台单品图。"
        : asset.weight === "medium"
        ? "【中权重】主体安排、人物关系与构图方向必须清晰可识别，不得无理由转成孤立产品静物。"
        : "【低权重】仅作为次要视觉提示，允许页面场景与摄影参数主导。"} 作为整体创意基准生成相似风格的产品图；若上传专用人物形象图，人物身份、五官、发型和体型改为严格服从人物图。参考图中的原产品或服装必须替换为产品主图，原产品的版型、颜色、纹理、图案、缝线、标识和结构不得带入结果。`;
    return `参考图${index + 1}：${asset.name}（${roleLabels[asset.role]}，权重：${weight}）\n${boundary}`;
  });

  return [
    basePrompt,
    `【商业安全构图】\n${modelCount === 0
      ? "0人表示禁止自主新增人物或人体内容。若有效参考图已含人物或人体局部，仅可保留其既有数量、裁切、姿势、动作、遮挡及与产品的接触关系作为展示载体，不得补全、扩展、复制或新增人体；参考图无人时保持纯无人产品摄影。"
      : "保持成年人物、自然姿态、非情色表达和可信人体结构，产品必须清晰、完整且无遮挡。"}`,
    `【批次变化】\n本次生成${imageCount}张。${isProductOnly
      ? "原图单品替换：目标产品区域以产品主参考图为最高优先级，必须移除旧产品并完整换成新产品；目标区域之外的原人物、服装、场景、构图、机位和光影保持不变。禁止输出与原场景图完全相同、产品未替换的结果。"
      : isReplacement
      ? "替换模式严格按类别标签分工：[action]只控制姿势，[composition]只控制机位构图，[scene]或预设场景只控制环境。严禁从动作图或构图图复制背景与场景内容。"
      : "保持产品、品牌规则与参考图职责一致，仅对动作、取景或细微构图做合理变化。"}`,
    negativePrompt ? `【必须避免】\n${negativePrompt}` : "",
    referenceBlocks.length
      ? `【参考图使用边界】\n${referenceBlocks.join("\n\n")}`
      : "【参考图使用边界】\n本次没有附加参考图。",
    isProductOnly
      ? "【最终执行要求】\n[base_image]是不可变底图，仅允许修改旧产品所在区域。必须先完整移除旧产品，再以产品主参考图的新产品进行实质替换；新产品的版型、颜色、纹理、图案、缝线和结构全部服从产品主图。禁止保留旧产品、只改颜色、混合新旧产品或返回未替换的原图。"
      : isReplacement
      ? "【最终执行要求】\n严格服从图片类别标签：[action]仅提供姿势，[composition]仅提供机位、占比与构图，[scene]仅提供环境。没有上传[scene]图时，预设场景独占背景、环境元素、道具、光影、色彩与氛围；严禁动作图和构图图携带任何场景内容。人物服从人物参考图或品牌规范，产品服从产品主图。"
      : "【最终执行要求】\n创意模式以创意基准参考图决定整体主体与构图方向；高权重时必须保留参考图已有的人物数量、人物关系、姿势动作、裁切机位、主体占比、主要道具、产品位置、背景组织、光影和色彩，不得把含人物参考图改成孤立产品静物。若有专用人物图，仅人物身份服从人物图；核心产品的版型、颜色、纹理、图案、缝线、标识和结构始终只服从产品主图，并替换参考图中的原产品或原服装。",
  ].filter(Boolean).join("\n\n");
}

function normalizeReferenceMetadata(value: unknown): GeminiReferenceMetadata[] {
  if (!Array.isArray(value)) return [];
  const allowedRoles = new Set<ImageReferenceRole>([
    "product_master",
    "product_detail",
    "character_identity",
    "character_garment_reference",
    "style_reference",
    "replacement_reference",
  ]);
  if (value.length > MAX_SUBMITTED_IMAGES) throw new Error(`单次最多提交 ${MAX_SUBMITTED_IMAGES} 张候选图片。`);
  return value.map((raw, index) => {
    const asset = (raw || {}) as Record<string, unknown>;
    const role = String(asset.role || "style_reference") as ImageReferenceRole;
    if (!allowedRoles.has(role)) throw new Error(`第 ${index + 1} 张图片角色无效。`);
    const weight = ["low", "medium", "high"].includes(String(asset.weight))
      ? String(asset.weight) as GeminiReferenceMetadata["weight"]
      : undefined;
    const referenceCategory = REFERENCE_CATEGORIES.has(String(asset.referenceCategory) as ReplacementReferenceCategory)
      ? String(asset.referenceCategory) as ReplacementReferenceCategory
      : undefined;
    return { name: String(asset.name || `参考图 ${index + 1}`), role, weight, referenceCategory };
  });
}

function filterReferenceAssetsForWorkflow<T extends GeminiReferenceMetadata>(input: PromptCompileInput, assets: T[]): T[] {
  if (input.visualType !== "R") return assets;
  if (input.replacementWorkflow === "multi_replace") {
    return assets.filter((asset) => asset.role !== "replacement_reference" || inferReferenceCategory(asset) !== "scene" || input.sceneSource === "reference");
  }
  const productAssets = assets.filter((asset) => asset.role === "product_master" || asset.role === "product_detail");
  if (input.replacementWorkflow === "product_only") {
    const baseAsset = assets.find((asset) => asset.role === "replacement_reference" && inferReferenceCategory(asset) === "base_image")
      || assets.find((asset) => asset.role === "replacement_reference" && inferReferenceCategory(asset) === "scene");
    return [
      ...(baseAsset ? [{ ...baseAsset, name: baseAsset.name.replace("[scene]", "[base_image]"), referenceCategory: "base_image", weight: "high" as const } as T] : []),
      ...productAssets,
    ];
  }
  const characterAssets = assets.filter((asset) => asset.role === "character_identity" || asset.role === "character_garment_reference");
  const workflowReferences = assets.filter((asset) => asset.role === "replacement_reference" && (
    inferReferenceCategory(asset) === "action" || (inferReferenceCategory(asset) === "scene" && input.sceneSource === "reference")
  ));
  return [...workflowReferences, ...characterAssets, ...productAssets];
}

async function requestGeminiImage(args: {
  prompt: string;
  assets: PromptImageInput[];
  aspectRatio: string;
  resolution: string;
  signal: AbortSignal;
  attemptId: string;
}) {
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";
  // Every image-generation attempt owns an isolated dispatcher. Closing it in
  // finally guarantees a safety-blocked attempt cannot keep a listener/socket
  // alive or be reused by the refined retry.
  const attemptDispatcher = OPENAI_PROXY_URL
    ? new ProxyAgent(OPENAI_PROXY_URL)
    : new Agent({ connections: 1, pipelining: 0 });
  const orderedAssets = orderGeminiReferences(args.assets);
  const parts: Array<Record<string, unknown>> = [{ text: `${args.prompt}\n\n${GEMINI_REFERENCE_BOUNDARY}` }];
  orderedAssets.forEach((asset, index) => {
    const parsed = parseImageDataUrl(asset.dataUrl);
    parts.push({
      text: getGeminiReferenceInstruction(asset, index),
    });
    parts.push({
      inline_data: {
        mime_type: parsed.mimeType,
        data: parsed.data,
      },
    });
  });
  parts.push({
    text: GEMINI_FINAL_COMPLIANCE,
  });

  try {
    console.log("Gemini image attempt started", { attemptId: args.attemptId });
    const response = await undiciFetch(
      `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": process.env.GEMINI_API_KEY || "",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: args.aspectRatio,
              imageSize: normalizeGeminiImageResolution(args.resolution),
            },
          },
        }),
        signal: AbortSignal.any([args.signal, AbortSignal.timeout(240_000)]),
        dispatcher: attemptDispatcher,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Gemini API failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const payload = await response.json() as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string }; inline_data?: { data?: string; mime_type?: string } }> };
      }>;
      promptFeedback?: { blockReason?: string; blockReasonMessage?: string };
      error?: { message?: string; code?: number; status?: string };
    };

    const allParts = payload.candidates?.flatMap((candidate) => candidate.content?.parts || []) || [];
    const imagePart = allParts.find((part) => part.inlineData?.data || part.inline_data?.data);
    const inlineData = imagePart?.inlineData || (imagePart?.inline_data
      ? { data: imagePart.inline_data.data, mimeType: imagePart.inline_data.mime_type }
      : undefined);
    if (!inlineData?.data) {
      const finishReasons = payload.candidates?.map((candidate) => candidate.finishReason).filter(Boolean).join(", ");
      const modelText = allParts.map((part) => part.text?.trim()).filter(Boolean).join(" ");
      const details = [
        payload.promptFeedback?.blockReason,
        payload.promptFeedback?.blockReasonMessage,
        finishReasons,
        modelText,
      ].filter(Boolean).join("；");
      throw new Error(`Gemini 图片模型未返回图片数据${details ? `：${details}` : "。"}`);
    }
    return { base64: inlineData.data, mimeType: inlineData.mimeType || "image/png", model };
  } finally {
    if (args.signal.aborted) {
      await attemptDispatcher.destroy().catch(() => undefined);
    } else {
      await attemptDispatcher.close().catch(() => undefined);
    }
    console.log("Gemini image attempt listener closed", {
      attemptId: args.attemptId,
      aborted: args.signal.aborted,
    });
  }
}

function getImageMimeType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

async function loadEditableImage(imageUrl: string) {
  if (imageUrl.startsWith("data:image/")) return parseImageDataUrl(imageUrl);

  const localPathMatch = imageUrl.match(/(?:^|\/)(?:generated)\/([^/?#]+)(?:[?#].*)?$/i);
  if (localPathMatch) {
    const fileName = path.basename(decodeURIComponent(localPathMatch[1]));
    const buffer = await readFile(path.join(GENERATED_DIR, fileName));
    if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("待编辑原图不能超过20MB。");
    return { mimeType: getImageMimeType(fileName), data: buffer.toString("base64"), byteLength: buffer.byteLength };
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    const response = await undiciFetch(imageUrl, {
      signal: AbortSignal.timeout(30_000),
      dispatcher: openAIProxyAgent,
    });
    if (!response.ok) throw new Error(`原图读取失败：${response.status} ${response.statusText}`);
    const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!mimeType.startsWith("image/")) throw new Error("原图地址没有返回有效图片。");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("待编辑原图不能超过20MB。");
    return { mimeType, data: buffer.toString("base64"), byteLength: buffer.byteLength };
  }

  throw new Error("无法读取待编辑原图，请重新打开生成结果后再试。");
}

function getClosestGeminiAspectRatio(width: number, height: number) {
  const ratio = width / height;
  const supported = [
    { label: "1:1", value: 1 },
    { label: "2:3", value: 2 / 3 },
    { label: "3:2", value: 3 / 2 },
    { label: "3:4", value: 3 / 4 },
    { label: "4:3", value: 4 / 3 },
    { label: "9:16", value: 9 / 16 },
    { label: "16:9", value: 16 / 9 },
  ];
  return supported.reduce((closest, candidate) =>
    Math.abs(candidate.value - ratio) < Math.abs(closest.value - ratio) ? candidate : closest
  ).label;
}

function getGeminiImageSizeForDimensions(width: number, height: number) {
  const longEdge = Math.max(width, height);
  if (longEdge >= 2800) return "4K";
  if (longEdge >= 1600) return "2K";
  return "1K";
}

async function requestGeminiImageEdit(args: {
  original: { mimeType: string; data: string };
  mask: { mimeType: string; data: string };
  replacement?: { mimeType: string; data: string; name: string };
  prompt: string;
  outputWidth: number;
  outputHeight: number;
}) {
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";
  const instruction = `
[LOCAL INPAINTING TASK]
Edit the first image according to the user's request. The second image is a transparent PNG mask: red or non-transparent pixels mark the only editable region.
Modify only pixels inside the marked region. Preserve everything outside the mask as faithfully as possible, including identity, product design, garment structure, color, lighting, background, camera, crop, anatomy, and resolution.
The returned image must keep the source aspect ratio and target resolution of ${args.outputWidth}×${args.outputHeight} pixels. Never reduce the output resolution.
Blend the edited boundary naturally without halos, seams, color discontinuity, duplicated body parts, or unrelated changes. Do not add text, logos, watermarks, borders, or new objects unless explicitly requested.
${args.replacement ? "The third image is a local replacement reference. Use its relevant subject, product, material, color, structure, or visual features only inside the marked mask. Adapt scale, perspective, lighting, occlusion, and color so the replacement looks native to the original photograph. Never paste it as a rectangular patch and never alter unmasked pixels." : "No replacement reference image was supplied; perform the edit from the original image and the user's text only."}

[USER EDIT REQUEST]
${args.prompt}
`;
  const parts: Array<Record<string, unknown>> = [
    { text: instruction },
    { text: "IMAGE 1 — ORIGINAL IMAGE TO EDIT" },
    { inline_data: { mime_type: args.original.mimeType, data: args.original.data } },
    { text: "IMAGE 2 — EDIT MASK. RED/NON-TRANSPARENT PIXELS ARE THE ONLY EDITABLE AREA." },
    { inline_data: { mime_type: args.mask.mimeType, data: args.mask.data } },
  ];
  if (args.replacement) {
    parts.push(
      { text: `IMAGE 3 — LOCAL REPLACEMENT REFERENCE: ${args.replacement.name}. Use it only to replace or guide content inside the marked mask.` },
      { inline_data: { mime_type: args.replacement.mimeType, data: args.replacement.data } },
    );
  }
  parts.push({ text: "Return one completed edited image only. Recheck that all unmasked regions remain unchanged." });

  const response = await undiciFetch(
    `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": process.env.GEMINI_API_KEY || "",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: getClosestGeminiAspectRatio(args.outputWidth, args.outputHeight),
            imageSize: getGeminiImageSizeForDimensions(args.outputWidth, args.outputHeight),
          },
        },
      }),
      signal: AbortSignal.timeout(240_000),
      dispatcher: openAIProxyAgent,
    },
  );

  const payload = await response.json() as {
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string }; inline_data?: { data?: string; mime_type?: string } }> };
    }>;
    promptFeedback?: { blockReason?: string; blockReasonMessage?: string };
    error?: { message?: string; status?: string };
  };
  if (!response.ok) {
    const status = payload.error?.status ? ` (${payload.error.status})` : "";
    throw new Error(`${payload.error?.message || `Gemini 图片编辑请求失败：${response.status}`}${status}`);
  }

  const allParts = payload.candidates?.flatMap((candidate) => candidate.content?.parts || []) || [];
  const imagePart = allParts.find((part) => part.inlineData?.data || part.inline_data?.data);
  const inlineData = imagePart?.inlineData || (imagePart?.inline_data
    ? { data: imagePart.inline_data.data, mimeType: imagePart.inline_data.mime_type }
    : undefined);
  if (!inlineData?.data) {
    const details = [
      payload.promptFeedback?.blockReason,
      payload.promptFeedback?.blockReasonMessage,
      payload.candidates?.map((candidate) => candidate.finishReason).filter(Boolean).join(", "),
      allParts.map((part) => part.text?.trim()).filter(Boolean).join(" "),
    ].filter(Boolean).join("；");
    throw new Error(`Gemini 图片编辑未返回图片${details ? `：${details}` : "。"}`);
  }

  return { base64: inlineData.data, mimeType: inlineData.mimeType || "image/png", model };
}

async function compositeEditAtOriginalResolution(args: {
  original: { data: string };
  mask: { data: string };
  generated: { base64: string };
}) {
  const originalBuffer = Buffer.from(args.original.data, "base64");
  const maskBuffer = Buffer.from(args.mask.data, "base64");
  const generatedBuffer = Buffer.from(args.generated.base64, "base64");
  const originalMetadata = await sharp(originalBuffer).metadata();
  const generatedMetadata = await sharp(generatedBuffer).metadata();
  const width = originalMetadata.width;
  const height = originalMetadata.height;

  if (!width || !height) throw new Error("无法读取待编辑原图的像素尺寸。");
  if (!generatedMetadata.width || !generatedMetadata.height) throw new Error("无法读取 Gemini 编辑结果的像素尺寸。");

  const fullResolutionMask = await sharp(maskBuffer)
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.linear })
    .ensureAlpha()
    .png()
    .toBuffer();

  const editedLayer = await sharp(generatedBuffer)
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .composite([{ input: fullResolutionMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const outputBuffer = await sharp(originalBuffer)
    .resize(width, height, { fit: "fill" })
    .composite([{ input: editedLayer, blend: "over" }])
    .png({ compressionLevel: 6 })
    .toBuffer();
  const outputMetadata = await sharp(outputBuffer).metadata();

  if (outputMetadata.width !== width || outputMetadata.height !== height) {
    throw new Error(`局部重绘结果分辨率校验失败：期望 ${width}×${height}，实际 ${outputMetadata.width || 0}×${outputMetadata.height || 0}。`);
  }

  return {
    outputBuffer,
    originalWidth: width,
    originalHeight: height,
    modelWidth: generatedMetadata.width,
    modelHeight: generatedMetadata.height,
    outputWidth: outputMetadata.width,
    outputHeight: outputMetadata.height,
  };
}

function normalizeReferenceAssets(value: unknown): PromptImageInput[] {
  if (!Array.isArray(value)) return [];
  if (value.length > MAX_SUBMITTED_IMAGES) throw new Error(`单次最多提交 ${MAX_SUBMITTED_IMAGES} 张候选图片。`);

  const allowedRoles = new Set<ImageReferenceRole>([
    "product_master",
    "product_detail",
    "character_identity",
    "character_garment_reference",
    "style_reference",
    "replacement_reference",
  ]);

  return value.map((raw, index) => {
    const asset = (raw || {}) as Record<string, unknown>;
    const role = String(asset.role || "style_reference") as ImageReferenceRole;
    if (!allowedRoles.has(role)) throw new Error(`第 ${index + 1} 张图片角色无效。`);
    const dataUrl = String(asset.dataUrl || "");
    parseImageDataUrl(dataUrl);
    return {
      id: String(asset.id || `asset-${index + 1}`),
      name: String(asset.name || `参考图 ${index + 1}`),
      role,
      dataUrl,
      weight: (["low", "medium", "high"].includes(String(asset.weight))
        ? String(asset.weight)
        : undefined) as PromptImageInput["weight"],
      referenceCategory: REFERENCE_CATEGORIES.has(String(asset.referenceCategory) as ReplacementReferenceCategory)
        ? String(asset.referenceCategory) as ReplacementReferenceCategory
        : undefined,
    };
  });
}

function fallbackAnalysis(asset: PromptImageInput): AssetAnalysis {
  const roleRules: Record<ImageReferenceRole, Pick<AssetAnalysis, "summary" | "mustPreserve" | "allowedInfluence">> = {
    product_master: {
      summary: "产品主参考图已接收；当前未配置视觉模型，暂未提取具体外观特征。",
      mustPreserve: ["产品版型", "腰头与腿口结构", "颜色与图案", "缝线与面料纹理", "品牌识别区"],
      allowedInfluence: ["产品主体外观", "包装结构"],
    },
    product_detail: {
      summary: "产品细节参考图已接收；当前未配置视觉模型，暂未提取具体工艺特征。",
      mustPreserve: ["局部结构", "面料纹理", "缝线与包边"],
      allowedInfluence: ["产品材质与工艺细节"],
    },
    character_identity: {
      summary: "人物身份参考图已接收；当前未配置视觉模型，暂未提取具体人物特征。",
      mustPreserve: ["人物身份", "五官", "发型", "体型比例"],
      allowedInfluence: ["人物身份与外观一致性"],
    },
    character_garment_reference: {
      summary: "人物与服装参考图已接收；用于人物一致性和服装穿着关系参考。",
      mustPreserve: ["人物身份", "五官", "发型", "体型比例"],
      allowedInfluence: ["服装穿着位置", "搭配关系", "整体廓形", "覆盖范围", "自然褶皱", "姿势与服装贴合关系"],
    },
    style_reference: {
      summary: "创意基准参考图已接收；用于建立相似产品图的整体视觉、主体呈现与场景连续性，最终产品仍由产品主图替换。",
      mustPreserve: [],
      allowedInfluence: ["整体视觉语言", "场景与氛围", "光影与色彩", "构图与机位", "主体位置", "参考图已有人物呈现", "姿势与动作", "人物关系"],
    },
    replacement_reference: {
      summary: "构图参考图已接收；它是替换模式中构图、镜头角度和画幅景别的唯一依据。",
      mustPreserve: ["构图网格与视觉重心", "主体边界框及宽高占比", "主体中心点与四边边距", "前中后景层次", "地平线与消失点", "相机高度、俯仰角与镜头方向", "景别与裁切", "参考画幅", "留白方向", "元素空间关系", "姿势与动作"],
      allowedInfluence: ["不得影响人物身份、面孔、身体特征、服装设计、光源、色温、明暗关系或影调"],
    },
  };
  const rules = roleRules[asset.role];
  return {
    assetId: asset.id,
    name: asset.name,
    role: asset.role,
    summary: rules.summary,
    observableFeatures: [],
    mustPreserve: rules.mustPreserve,
    allowedInfluence: rules.allowedInfluence,
    warnings: ["尚未配置 GEMINI_API_KEY，生成时仍会按图片角色携带原图，但没有视觉特征摘要。"],
    status: "fallback",
    model: "role-rules-only",
    analyzedAt: new Date().toISOString(),
  };
}

function buildImageParts(assets: PromptImageInput[]) {
  const parts: Part[] = [];
  assets.forEach((asset, index) => {
    const parsed = parseImageDataUrl(asset.dataUrl);
    parts.push({ text: `参考图 ${index + 1}：${asset.name}；角色=${asset.role}；权重=${asset.weight || "默认"}。` });
    parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
  });
  return parts;
}

const ASSET_ANALYSIS_SYSTEM_INSTRUCTION = `
你是巴迪高品牌视觉参考图分析器。只描述图片中可观察到的事实，不推测材质成分、认证、功效或无法看清的文字。
严格按照图片角色限制影响范围：
- product_master：锁定产品版型、颜色、图案、腰头、腿口、缝线、纹理和包装结构。
- product_detail：补充面料与工艺局部，不改变产品整体版型。
- character_identity：锁定人物身份、五官、发型和体型，不影响产品设计。
- character_garment_reference：锁定人物身份、五官、发型和体型，同时提取服装穿着位置、搭配关系、整体廓形、覆盖范围、自然褶皱及姿势贴合；不得用人物图中的产品设计覆盖 product_master。
- style_reference：作为创意基准图分析整体视觉语言、场景、光影、色彩、影调、姿势、动作、人物与身体呈现、裁切、机位、背景、道具、物体位置、人物关系与构图。若存在 character_identity，人物身份、五官、发型和体型以专用人物图为最高优先级。严禁让参考图中的原产品或服装设计进入最终产品约束；最终产品版型、颜色、纹理、图案、缝线、标识和结构只服从 product_master。
- replacement_reference：该图是替换模式中构图、镜头角度和画幅景别的唯一依据。必须精确提取构图网格与视觉重心；主体边界框及其占画面宽度/高度的百分比；主体中心点坐标；头顶、脚底、左右边距；前景/中景/背景层次；地平线与消失点；相机高度、俯仰角和镜头方向；景别、裁切、画幅、留白方向和元素空间关系；同时提取姿势（肢体角度、重心、手脚位置、头部朝向）与动作状态。以上全部列入 mustPreserve，尽量使用明确位置关系和百分比描述；人物身份、面孔、身体特征、服装设计、光源、色温、明暗关系和影调不得进入 mustPreserve 或 allowedInfluence。
仅输出 JSON：{"analyses":[{"assetId":"","summary":"","observableFeatures":[],"mustPreserve":[],"allowedInfluence":[],"warnings":[]}]}
`;

function parseModelJson(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as {
    title?: string;
    positivePrompt?: string;
    negativePrompt?: string;
  };
}

app.post("/api/gemini/analyze-assets", async (req, res) => {
  try {
    const assets = normalizeReferenceAssets(req.body?.assets);
    if (assets.length === 0) return res.json({ analyses: [], analysisMode: "none" });

    if (!ai) {
      return res.json({
        analyses: assets.map(fallbackAnalysis),
        analysisMode: "role-rules-only",
      });
    }

    const model = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: "逐张分析以下参考图，并严格用每张图前的 assetId 对应输出。" },
        ...buildImageParts(assets),
      ],
      config: {
        systemInstruction: ASSET_ANALYSIS_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });
    const parsed = parseModelJson(response.text || "{}") as { analyses?: Partial<AssetAnalysis>[] };
    const analyses = assets.map((asset) => {
      const result = parsed.analyses?.find((item) => item.assetId === asset.id);
      const roleFallback = fallbackAnalysis(asset);
      return {
        ...roleFallback,
        summary: result?.summary?.trim() || roleFallback.summary,
        observableFeatures: Array.isArray(result?.observableFeatures) ? result.observableFeatures.map(String) : [],
        mustPreserve: Array.isArray(result?.mustPreserve) ? result.mustPreserve.map(String) : roleFallback.mustPreserve,
        allowedInfluence: Array.isArray(result?.allowedInfluence) ? result.allowedInfluence.map(String) : roleFallback.allowedInfluence,
        warnings: Array.isArray(result?.warnings) ? result.warnings.map(String) : [],
        status: "analyzed" as const,
        model,
        analyzedAt: new Date().toISOString(),
      };
    });

    return res.json({ analyses, analysisMode: "gemini-vision" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片分析失败。";
    return res.status(400).json({ error: message });
  }
});

app.post("/api/gemini/optimize", async (req, res) => {
  const input = normalizePromptInput(req.body || {});
  const compiled = compilePrompt(input);
  let assets: PromptImageInput[] = [];
  try {
    assets = normalizeReferenceAssets(req.body?.assets);
  } catch (error) {
    const message = error instanceof Error ? error.message : "参考图数据无效。";
    return res.status(400).json({ error: message });
  }

  if (!ai) {
    return res.json({
      ...compiled,
      optimized: compiled.positivePrompt,
      refinementMode: "deterministic",
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash",
      contents: [
        {
          text: JSON.stringify({
            task: "在不改变任何业务硬约束的前提下，结合随附原始参考图润色以下巴迪高视觉提示词包。图片只能按照标注角色影响结果。",
            compiled,
          }),
        },
        ...buildImageParts(assets),
      ],
      config: {
        systemInstruction: PROMPT_REFINER_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.35,
      },
    });

    const refined = parseModelJson(response.text || "{}");
    const positivePrompt = refined.positivePrompt?.trim() || compiled.positivePrompt;
    const negativePrompt = refined.negativePrompt?.trim() || compiled.negativePrompt;

    return res.json({
      ...compiled,
      title: refined.title?.trim() || compiled.title,
      positivePrompt,
      negativePrompt,
      optimized: positivePrompt,
      refinementMode: "gemini",
    });
  } catch (error) {
    console.error("Prompt refinement failed; returning compiled prompt:", error);
    return res.json({
      ...compiled,
      optimized: compiled.positivePrompt,
      refinementMode: "deterministic-fallback",
      warnings: [...compiled.warnings, "AI润色暂时不可用，已返回确定性编排结果。"],
    });
  }
});

app.post("/api/prompt/generate", (req, res) => {
  try {
    const input = normalizePromptInput(req.body || {});
    const assets = filterReferenceAssetsForWorkflow(input, normalizeReferenceAssets(req.body?.assets));
    const structureAudit = enforcePromptStructure(input, assets);
    const providedAnalyses = Array.isArray(req.body?.imageAnalyses)
      ? req.body.imageAnalyses as AssetAnalysis[]
      : [];
    const analysisById = new Map(providedAnalyses.map((analysis) => [analysis.assetId, analysis]));
    const imageAnalyses = assets.map((asset) => {
      const provided = analysisById.get(asset.id);
      return provided?.role === asset.role ? provided : fallbackAnalysis(asset);
    });
    const compiled = compilePrompt({ ...input, imageAnalyses });

    return res.json({
      ...compiled,
      warnings: [...compiled.warnings, ...structureAudit.warnings],
      optimized: compiled.positivePrompt,
      analyses: imageAnalyses,
      generationMode: "local-config",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "本地提示词生成失败。";
    return res.status(400).json({ error: message });
  }
});

app.get("/api/openai/status", (_req, res) => {
  res.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
  });
});

app.post("/api/openai/generate-images", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "真实生图链路已接入，但本机尚未配置 OPENAI_API_KEY。请在 .env.local 中设置后重启服务。",
      code: "OPENAI_API_KEY_MISSING",
    });
  }

  try {
    const normalizedInput = normalizePromptInput(req.body || {});
    const assets = filterReferenceAssetsForWorkflow(normalizedInput, normalizeReferenceAssets(req.body?.assets));
    enforcePromptStructure(normalizedInput, assets);
    const analysisById = new Map((normalizedInput.imageAnalyses || []).map((analysis) => [analysis.assetId, analysis]));
    const input: PromptCompileInput = {
      ...normalizedInput,
      imageAnalyses: assets.map((asset) => {
        const provided = analysisById.get(asset.id);
        return provided?.role === asset.role ? provided : fallbackAnalysis(asset);
      }),
    };
    const compiled = compilePrompt(input);
    const imageCount = Math.max(1, Math.min(6, Number(input.imageCount) || 1));
    const size = getOpenAIImageSize(input.aspectRatio, input.resolution);
    const quality = getOpenAIImageQuality(input.resolution);
    const referenceMap = assets.length > 0
      ? `\n\n【参考图顺序与职责】\n${assets.map((asset, index) => `图${index + 1}：${asset.name}；角色=${asset.role}；权重=${asset.weight || "默认"}`).join("\n")}`
      : "";
    // Structured parameters are authoritative. Never allow cached client prompt
    // text from another scene or workflow to override the current compilation.
    const negativePrompt = compiled.negativePromptEnglish || compiled.negativePrompt;
    const basePrompt = compiled.positivePromptEnglish || compiled.positivePrompt;

    await mkdir(GENERATED_DIR, { recursive: true });
    const results: string[] = [];
    for (let index = 0; index < imageCount; index += 1) {
      const batchRule = input.replacementWorkflow === "product_only"
        ? "仅替换目标产品；基础图的非目标区域、人物、构图、场景和光影不得发生变化。"
        : input.replacementWorkflow === "pose_rebuild"
          ? "严格保持[action]核心姿势；人物身份、产品和环境分别服从其专属来源，构图服从页面摄影参数。"
          : input.visualType === "R"
            ? "严格按类别标签分工，不允许动作、构图、场景、人物或产品参考图越权。"
            : "在不改变产品、人物身份与品牌规则的前提下，仅对动作、取景或细微构图做合理差异化。";
      const prompt = `${basePrompt}${referenceMap}\n\n【本批次变化】这是第 ${index + 1}/${imageCount} 张。${batchRule}${negativePrompt ? `\n\n【必须避免】${negativePrompt}` : ""}`;
      const base64 = await requestOpenAIImage({ prompt, assets, size, quality });
      const fileName = `${Date.now()}-${randomUUID()}.webp`;
      await writeFile(path.join(GENERATED_DIR, fileName), Buffer.from(base64, "base64"));
      results.push(`/generated/${fileName}`);
    }

    return res.json({
      results,
      provider: "openai",
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      size,
      quality,
      referenceImageCount: assets.length,
    });
  } catch (error) {
    console.error("OpenAI image generation failed:", error);
    const message = error instanceof Error ? error.message : "OpenAI 生图失败。";
    return res.status(502).json({ error: message });
  }
});

app.get("/api/gemini/status", (_req, res) => {
  res.json({
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image",
    apiVersion: GEMINI_API_BASE_URL.split("/").pop() || "v1beta",
  });
});


async function refinePrompt(input: PromptCompileInput, assets: PromptImageInput[]): Promise<string> {
  const compiled = compilePrompt(input);
  const parts: Part[] = [
    {
      text: JSON.stringify({
        task: "上一次生成的提示词触发了内容安全过滤(IMAGE_SAFETY)。请根据以下信息重新润色该提示词，使其在保持品牌视觉要求和产品特征的同时，完全规避所有可能导致内容安全过滤的表达。严格遵守商业视觉的安全框架。",
        compiled,
      }),
    },
    ...buildImageParts(assets),
  ];

  if (!ai) return compiled.positivePrompt;

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash",
      contents: parts,
      config: {
        systemInstruction: PROMPT_REFINER_SYSTEM_INSTRUCTION + "\n\n【特别安全指令】这是重试请求，请极端谨慎地处理提示词，移除任何可能被误判为敏感、非专业或不当的表达，保持商业视觉的严谨与规范。",
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const refined = parseModelJson(response.text || "{}");
    return refined.positivePrompt?.trim() || compiled.positivePrompt;
  } catch (error) {
    console.error("Prompt refinement failed, using fallback:", error);
    return compiled.positivePrompt;
  }
}

app.post("/api/gemini/edit-image", async (req, res) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      requestId,
      status: "failed",
      imageStatus: "not_returned",
      error: "尚未配置 GEMINI_API_KEY，无法进行局部重绘。",
    });
  }

  try {
    const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : "";
    const maskDataUrl = typeof req.body?.maskDataUrl === "string" ? req.body.maskDataUrl : "";
    const replacementImageDataUrl = typeof req.body?.replacementImageDataUrl === "string" ? req.body.replacementImageDataUrl : "";
    const replacementImageName = typeof req.body?.replacementImageName === "string" ? req.body.replacementImageName.trim().slice(0, 160) : "局部替换参考图";
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!imageUrl) return res.status(400).json({ requestId, status: "failed", imageStatus: "not_returned", error: "缺少待编辑原图。" });
    if (!maskDataUrl) return res.status(400).json({ requestId, status: "failed", imageStatus: "not_returned", error: "缺少局部涂抹蒙版。" });
    if (!prompt) return res.status(400).json({ requestId, status: "failed", imageStatus: "not_returned", error: "请输入局部修改要求。" });
    if (prompt.length > 1000) return res.status(400).json({ requestId, status: "failed", imageStatus: "not_returned", error: "局部修改要求不能超过1000字。" });

    console.info("Gemini local image edit started", {
      requestId,
      imageUrl,
      promptLength: prompt.length,
      maskWidth: req.body?.maskWidth,
      maskHeight: req.body?.maskHeight,
      hasReplacementImage: Boolean(replacementImageDataUrl),
      replacementImageName: replacementImageDataUrl ? replacementImageName : undefined,
    });

    const original = await loadEditableImage(imageUrl);
    const mask = parseImageDataUrl(maskDataUrl);
    const replacement = replacementImageDataUrl ? parseImageDataUrl(replacementImageDataUrl) : undefined;
    const originalMetadata = await sharp(Buffer.from(original.data, "base64")).metadata();
    if (!originalMetadata.width || !originalMetadata.height) throw new Error("无法读取待编辑原图的像素尺寸。");
    const generated = await requestGeminiImageEdit({
      original,
      mask,
      replacement: replacement ? { ...replacement, name: replacementImageName || "局部替换参考图" } : undefined,
      prompt,
      outputWidth: originalMetadata.width,
      outputHeight: originalMetadata.height,
    });
    const composited = await compositeEditAtOriginalResolution({ original, mask, generated });
    await mkdir(GENERATED_DIR, { recursive: true });
    const fileName = `${Date.now()}-${randomUUID()}-edit.png`;
    const outputBuffer = composited.outputBuffer;
    await writeFile(path.join(GENERATED_DIR, fileName), outputBuffer);

    const durationMs = Date.now() - startedAt;
    console.info("Gemini local image edit completed", {
      requestId,
      durationMs,
      outputBytes: outputBuffer.byteLength,
      originalResolution: `${composited.originalWidth}x${composited.originalHeight}`,
      modelResolution: `${composited.modelWidth}x${composited.modelHeight}`,
      outputResolution: `${composited.outputWidth}x${composited.outputHeight}`,
      resultUrl: `/generated/${fileName}`,
    });

    return res.json({
      requestId,
      status: "completed",
      imageStatus: "returned",
      resultUrl: `/generated/${fileName}`,
      model: generated.model,
      durationMs,
      originalBytes: original.byteLength,
      maskBytes: mask.byteLength,
      replacementBytes: replacement?.byteLength || 0,
      outputBytes: outputBuffer.byteLength,
      originalWidth: composited.originalWidth,
      originalHeight: composited.originalHeight,
      modelWidth: composited.modelWidth,
      modelHeight: composited.modelHeight,
      outputWidth: composited.outputWidth,
      outputHeight: composited.outputHeight,
      resolutionPreserved: true,
    });
  } catch (error) {
    const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    const message = isTimeout
      ? "局部重绘超过4分钟仍未返回，已自动结束本次请求，请缩小涂抹范围后重试。"
      : error instanceof Error ? error.message : "局部重绘失败。";
    const durationMs = Date.now() - startedAt;
    console.error("Gemini local image edit failed", { requestId, durationMs, error });
    return res.status(isTimeout ? 504 : 502).json({
      requestId,
      status: "failed",
      imageStatus: "not_returned",
      durationMs,
      error: message,
    });
  }
});

app.post("/api/gemini/prompt-preview", (req, res) => {
  try {
    const input = normalizePromptInput(req.body || {});
    const compiled = compilePrompt(input);
    const assets = filterReferenceAssetsForWorkflow(input, normalizeReferenceMetadata(req.body?.assetMetadata));
    const structureAudit = auditPromptStructure(input, assets);
    const imageCount = Math.max(1, Math.min(6, Number(input.imageCount) || 1));
    const basePrompt = compiled.positivePromptEnglish || compiled.positivePrompt;
    const negativePrompt = compiled.negativePromptEnglish || compiled.negativePrompt;
    const displayBasePrompt = compiled.positivePrompt;
    const displayNegativePrompt = compiled.negativePrompt;
    const generationPrompt = buildGeminiGenerationPrompt(basePrompt, negativePrompt, 0, imageCount, input.modelCount, input.visualType === "R", input.replacementWorkflow);

    return res.json({
      prompt: buildGeminiPromptPreview(generationPrompt, assets),
      displayPromptChinese: buildChinesePromptPreview(
        displayBasePrompt,
        displayNegativePrompt,
        assets,
        imageCount,
        input.modelCount,
        input.visualType === "R",
        input.replacementWorkflow,
      ),
      negativePrompt,
      promptStructureAudit: structureAudit,
      warnings: [...compiled.warnings, ...structureAudit.warnings, ...structureAudit.errors],
      model: process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "实际生图提示词生成失败。";
    return res.status(400).json({ error: message });
  }
});

type GeminiFailureStage = "preparing" | "generating" | "safety_retry";

function inspectErrorChain(error: unknown) {
  const messages: string[] = [];
  const codes: string[] = [];
  const names: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const value = current as { message?: unknown; code?: unknown; name?: unknown; cause?: unknown };
    if (typeof value.message === "string" && value.message.trim()) messages.push(value.message.trim());
    if (typeof value.code === "string" && value.code.trim()) codes.push(value.code.trim());
    if (typeof value.name === "string" && value.name.trim()) names.push(value.name.trim());
    current = value.cause;
  }

  if (typeof error === "string" && error.trim()) messages.push(error.trim());
  return {
    messages: Array.from(new Set(messages)),
    codes: Array.from(new Set(codes)),
    names: Array.from(new Set(names)),
  };
}

function classifyGeminiGenerationFailure(
  error: unknown,
  context: {
    requestId: string;
    startedAt: number;
    stage: GeminiFailureStage;
    safetyRetryTriggered: boolean;
  },
) {
  const chain = inspectErrorChain(error);
  const searchable = [...chain.messages, ...chain.codes, ...chain.names].join(" | ");
  const lower = searchable.toLowerCase();
  const durationMs = Date.now() - context.startedAt;
  const base = {
    requestId: context.requestId,
    durationMs,
    stage: context.stage,
    safetyRetryTriggered: context.safetyRetryTriggered,
    retryable: true,
    details: chain.messages.join(" → ") || "未知错误",
  };
  const safetyPrefix = context.safetyRetryTriggered
    ? "首次请求触发了 Gemini 内容安全策略，系统自动改写并重试；"
    : "";

  if (chain.codes.includes("UND_ERR_SOCKET")) {
    return {
      status: 502,
      body: {
        ...base,
        code: OPENAI_PROXY_URL ? "GEMINI_PROXY_CONNECTION_CLOSED" : "GEMINI_CONNECTION_CLOSED",
        title: "Gemini 连接中途断开",
        error: OPENAI_PROXY_URL
          ? "本机代理与 Gemini 的连接在传输过程中被关闭。"
          : "与 Gemini 的网络连接在传输过程中被关闭。",
        reason: `${safetyPrefix}${OPENAI_PROXY_URL ? "当前请求通过已配置的本机代理访问 Gemini，代理连接未能保持到图片返回。" : "远端连接未能保持到图片返回。"}`,
        suggestion: "请确认本机代理运行正常、Google Gemini 域名可访问，然后重新生成；若连续发生，建议切换代理节点。",
      },
    };
  }

  if (chain.codes.includes("UND_ERR_CONNECT_TIMEOUT") || lower.includes("connect timeout")) {
    return {
      status: 504,
      body: {
        ...base,
        code: "GEMINI_CONNECT_TIMEOUT",
        title: "Gemini 连接超时",
        error: "在规定时间内未能建立 Gemini 服务连接。",
        reason: `${safetyPrefix}网络或代理未能及时连接到 Google Gemini 服务。`,
        suggestion: "请检查网络和代理连接后重试；如果其他网站正常，可稍后再试或更换代理节点。",
      },
    };
  }

  if (lower.includes("econnrefused")) {
    return {
      status: 502,
      body: {
        ...base,
        code: OPENAI_PROXY_URL ? "GEMINI_PROXY_UNAVAILABLE" : "GEMINI_CONNECTION_REFUSED",
        title: OPENAI_PROXY_URL ? "本机代理未连接" : "Gemini 连接被拒绝",
        error: OPENAI_PROXY_URL
          ? "访问 Gemini 所需的本机代理当前没有接受连接。"
          : "Gemini 服务拒绝了当前网络连接。",
        reason: `${safetyPrefix}${OPENAI_PROXY_URL ? "已配置代理，但代理端口未运行或进程已经退出。" : "目标服务或网络链路拒绝建立连接。"}`,
        suggestion: OPENAI_PROXY_URL
          ? "请先启动本机代理并确认代理端口可用，然后重新生成。"
          : "请检查网络、防火墙和 Gemini 服务状态后重试。",
      },
    };
  }

  if (
    lower.includes("aborterror")
    || lower.includes("timeouterror")
    || lower.includes("the operation was aborted")
    || lower.includes("headers timeout")
  ) {
    return {
      status: 504,
      body: {
        ...base,
        code: "GEMINI_RESPONSE_TIMEOUT",
        title: "Gemini 返回超时",
        error: "图片生成接口在规定时间内没有返回结果。",
        reason: `${safetyPrefix}请求已经发出，但模型生成或响应传输超过了等待上限。`,
        suggestion: "可降低生成张数或分辨率后重试；若持续超时，请检查代理稳定性和 Gemini 服务状态。",
      },
    };
  }

  if (lower.includes("image_safety") || lower.includes("safety")) {
    return {
      status: 400,
      body: {
        ...base,
        retryable: false,
        code: "GEMINI_SAFETY_BLOCKED",
        title: "内容安全策略拦截",
        error: "Gemini 未返回图片，因为提示词或参考图触发了内容安全策略。",
        reason: context.safetyRetryTriggered
          ? "首次请求与自动安全改写重试均未通过模型安全检查。"
          : "当前提示词、人物呈现或参考图被模型判定为不适合生成。",
        suggestion: "请减少容易引发误判的身体或服装描述，换用更明确的成年商业摄影表述，或逐张排查参考图。",
      },
    };
  }

  if (lower.includes("429") || lower.includes("resource_exhausted") || lower.includes("quota")) {
    return {
      status: 429,
      body: {
        ...base,
        code: "GEMINI_RATE_LIMITED",
        title: "Gemini 配额或频率受限",
        error: "当前请求超过了 Gemini 的调用频率或账户配额。",
        reason: "服务端返回了限流或资源额度不足信息。",
        suggestion: "请稍后重试，并检查 Gemini 项目的额度、计费状态和频率限制。",
      },
    };
  }

  if (lower.includes("401") || lower.includes("403") || lower.includes("permission_denied") || lower.includes("unauthenticated")) {
    return {
      status: 403,
      body: {
        ...base,
        retryable: false,
        code: "GEMINI_AUTH_FAILED",
        title: "Gemini 认证或权限失败",
        error: "当前 API Key 无法访问所选 Gemini 图片模型。",
        reason: "密钥无效、项目权限不足，或当前账户没有该模型的访问权限。",
        suggestion: "请检查 GEMINI_API_KEY、模型名称和 Google 项目权限，修正后重启服务。",
      },
    };
  }

  if (lower.includes("fetch failed") || lower.includes("econnreset") || lower.includes("enotfound") || lower.includes("network")) {
    return {
      status: 502,
      body: {
        ...base,
        code: "GEMINI_NETWORK_ERROR",
        title: "Gemini 网络访问失败",
        error: "服务端未能完成对 Gemini 图片接口的访问。",
        reason: `${safetyPrefix}网络、DNS 或代理链路发生异常，底层请求未获得有效响应。`,
        suggestion: "请检查网络与代理是否可访问 Google Gemini 服务，然后重新生成。",
      },
    };
  }

  return {
    status: 502,
    body: {
      ...base,
      code: "GEMINI_GENERATION_FAILED",
      title: "Gemini 图片生成失败",
      error: chain.messages[0] || "Gemini 生图失败。",
      reason: `${safetyPrefix}Gemini 没有返回可用的图片结果。`,
      suggestion: "请根据详细信息检查提示词、参考图、模型权限和网络状态后重试。",
    },
  };
}

app.post("/api/gemini/generate-images", async (req, res) => {
  const requestId = randomUUID();
  const startedAt = Date.now();
  let failureStage: GeminiFailureStage = "preparing";
  let safetyRetryTriggered = false;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: "真实生图链路已接入，但本机尚未配置 GEMINI_API_KEY。请在 .env.local 中设置后重启服务。",
      code: "GEMINI_API_KEY_MISSING",
      title: "Gemini API 尚未配置",
      reason: "服务端没有读取到 GEMINI_API_KEY。",
      suggestion: "请在 .env.local 中配置有效密钥并重启项目服务。",
      stage: "preparing",
      requestId,
      durationMs: Date.now() - startedAt,
      retryable: false,
    });
  }

  try {
    const normalizedInput = normalizePromptInput(req.body || {});
    const assets = filterReferenceAssetsForWorkflow(normalizedInput, normalizeReferenceAssets(req.body?.assets));
    enforcePromptStructure(normalizedInput, assets);
    const analysisById = new Map((normalizedInput.imageAnalyses || []).map((analysis) => [analysis.assetId, analysis]));
    const input: PromptCompileInput = {
      ...normalizedInput,
      imageAnalyses: assets.map((asset) => {
        const provided = analysisById.get(asset.id);
        return provided?.role === asset.role ? provided : fallbackAnalysis(asset);
      }),
    };
    const compiled = compilePrompt(input);
    const imageCount = Math.max(1, Math.min(6, Number(input.imageCount) || 1));
    const replacementReference = assets.find((asset) => asset.role === "replacement_reference");
    if (input.visualType === "R" && !replacementReference) {
      return res.status(400).json({
        requestId,
        status: "failed",
        code: "REPLACEMENT_REFERENCE_REQUIRED",
        title: "缺少替换参考图",
        error: "替换模式必须上传至少一张替换参考图。",
        reason: "没有可用于百分百复刻姿势、动作、图片视角和构图的参考基准。",
        suggestion: "请上传替换参考图后重新生成。",
        stage: "preparing",
        durationMs: Date.now() - startedAt,
        retryable: false,
      });
    }
    let effectiveAspectRatio = input.aspectRatio;
    const aspectRatioReference = input.replacementWorkflow === "product_only"
      ? assets.find((asset) => inferReferenceCategory(asset) === "base_image")
      : input.replacementWorkflow === "multi_replace"
        ? assets.find((asset) => inferReferenceCategory(asset) === "composition")
        : undefined;
    if (aspectRatioReference) {
      const parsedReference = parseImageDataUrl(aspectRatioReference.dataUrl);
      const metadata = await sharp(Buffer.from(parsedReference.data, "base64")).metadata();
      if (metadata.width && metadata.height) {
        effectiveAspectRatio = getClosestGeminiAspectRatio(metadata.width, metadata.height);
      }
    }
    // The current structured selection is authoritative. Never let a cached prompt
    // from a previous scene override the scene selected for this generation.
    const basePrompt = compiled.positivePromptEnglish || compiled.positivePrompt;
    const negativePrompt = compiled.negativePromptEnglish || compiled.negativePrompt;

    await mkdir(GENERATED_DIR, { recursive: true });
    const results: string[] = [];
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";

    // Define generation function to make it retryable
    const generateOne = async (prompt: string, signal: AbortSignal, attemptId: string) => {
      return await requestGeminiImage({
        prompt,
        assets,
        aspectRatio: effectiveAspectRatio,
        resolution: input.resolution,
        signal,
        attemptId,
      });
    };

    for (let index = 0; index < imageCount; index += 1) {
      failureStage = "generating";
      const prompt = buildGeminiGenerationPrompt(basePrompt, negativePrompt, index, imageCount, input.modelCount, input.visualType === "R", input.replacementWorkflow);

      let generated;
      let activeAttemptController = new AbortController();
      const initialAttemptId = `${requestId}:${index + 1}:initial`;
      try {
        generated = await generateOne(prompt, activeAttemptController.signal, initialAttemptId);
      } catch (error) {
         if (error instanceof Error && error.message.includes("IMAGE_SAFETY")) {
             activeAttemptController.abort();
             console.log("IMAGE_SAFETY triggered; initial listener closed before prompt refinement", {
               attemptId: initialAttemptId,
             });
             safetyRetryTriggered = true;
             failureStage = "safety_retry";
             const refinedPrompt = await refinePrompt(input, assets);
             const retryAttemptId = `${requestId}:${index + 1}:safety-retry`;
             activeAttemptController = new AbortController();
             console.log("Starting isolated Gemini safety retry", { attemptId: retryAttemptId });
             generated = await generateOne(
               buildGeminiGenerationPrompt(refinedPrompt, negativePrompt, index, imageCount, input.modelCount, input.visualType === "R", input.replacementWorkflow),
               activeAttemptController.signal,
               retryAttemptId,
             );
         } else {
             throw error;
         }
      } finally {
        activeAttemptController.abort();
      }

      if (!generated) {
        throw new Error("生成图片失败，请稍后重试。");
      }

      const extension = generated.mimeType === "image/jpeg" ? "jpg" : generated.mimeType === "image/webp" ? "webp" : "png";
      const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
      await writeFile(path.join(GENERATED_DIR, fileName), Buffer.from(generated.base64, "base64"));
      results.push(`/generated/${fileName}`);
    }

    return res.json({
      results,
      provider: "google",
      model,
      scene: input.scene,
      replacementMode: input.replacementMode,
      aspectRatio: effectiveAspectRatio,
      resolution: normalizeGeminiImageResolution(input.resolution),
      referenceImageCount: assets.length,
      positivePrompt: compiled.positivePrompt,
      positivePromptEnglish: compiled.positivePromptEnglish,
      negativePrompt: compiled.negativePrompt,
      negativePromptEnglish: compiled.negativePromptEnglish,
      promptConfigVersion: compiled.configVersion,
      selectedPromptFragments: compiled.selectedFragments,
      promptWarnings: compiled.warnings,
      requestId,
      durationMs: Date.now() - startedAt,
      safetyRetryTriggered,
    });
  } catch (error) {
    console.error("Gemini image generation failed:", error);
    const classified = classifyGeminiGenerationFailure(error, {
      requestId,
      startedAt,
      stage: failureStage,
      safetyRetryTriggered,
    });
    return res.status(classified.status).json(classified.body);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted for Development Mode.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static assets from /dist in Production Mode.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Badigao Visual Workstation running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
