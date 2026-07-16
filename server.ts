import express from "express";
import path from "path";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, type Part } from "@google/genai";
import { fetch as undiciFetch, FormData as UndiciFormData, Agent, ProxyAgent } from "undici";
import {
  type AssetAnalysis,
  compilePrompt,
  type ImageReferenceRole,
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
  const visualType = (["A", "B", "C"].includes(String(body.visualType))
    ? String(body.visualType)
    : "A") as VisualTypeId;

  return {
    visualType,
    scene: typeof body.scene === "string" ? body.scene : undefined,
    productFunctions: Array.isArray(body.productFunctions) ? body.productFunctions.map(String) : [],
    shotScale: typeof body.shotScale === "string" ? body.shotScale : "中景",
    cameraAngle: typeof body.cameraAngle === "string" ? body.cameraAngle : "平视",
    tone: typeof body.tone === "string" ? body.tone : "米色调",
    originalPrompt: typeof body.originalPrompt === "string" ? body.originalPrompt : "",
    resolution: typeof body.resolution === "string" ? body.resolution : "2K",
    aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : "3:4",
    imageCount: Number.isFinite(Number(body.imageCount)) ? Number(body.imageCount) : 4,
    modelCount: Number.isFinite(Number(body.modelCount)) ? Math.max(0, Math.min(4, Number(body.modelCount))) : 1,
    productImages: Array.isArray(body.productImages) ? body.productImages.map(String).filter(Boolean) : [],
    characterImages: Array.isArray(body.characterImages) ? body.characterImages.map(String).filter(Boolean) : [],
    referenceImages: Array.isArray(body.referenceImages) ? body.referenceImages.map(String).filter(Boolean) : [],
    referenceImageWeights: Array.isArray(body.referenceImageWeights)
      ? body.referenceImageWeights.map((item) => {
          const entry = (item || {}) as Record<string, unknown>;
          const weight = ["low", "medium", "high"].includes(String(entry.weight))
            ? String(entry.weight) as "low" | "medium" | "high"
            : "medium";
          return { name: String(entry.name || "Style reference"), weight };
        })
      : [],
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
- STYLE REFERENCE: may influence photographic style, pose, action, crop, camera placement, background, furniture, props, architecture, object placement, and composition. Do not reproduce its subject, character identity, face, body, or garment design.
- CHARACTER IDENTITY: preserve only the adult person's identity, facial features, hairstyle, and body proportions. Do not copy clothing, pose, crop, background, lighting, or scene objects.
- PRODUCT MASTER/DETAIL: preserve only the product's design, construction, color, texture, seams, proportions, and visible brand structure. Do not copy the source background, body pose, crop, or surrounding objects.
The requested scene and camera settings must create a commercially usable photograph while respecting every reference role boundary.
`;

const GEMINI_FINAL_COMPLIANCE = "FINAL COMPLIANCE CHECK: A style reference may influence the visual style, pose, action, crop, camera placement, background, props, object placement, and composition, but must never supply the subject, character identity, face, body, or garment design. Preserve product fidelity and character identity from their dedicated references.";
const GEMINI_SAFE_COMMERCIAL_FRAMING = "Depict clearly adult professional models only. Present the apparel in a neutral, non-sexualized commercial catalog and brand-campaign context, with natural posture and product-focused framing.";
const GEMINI_NO_PEOPLE_FRAMING = "Create a strictly people-free commercial product photograph. Do not depict any person, model, face, hand, skin, body part, human reflection, or human-shaped mannequin. Use only the product, scene, styling surfaces, props, lighting, and abstract photographic direction.";
type GeminiReferenceMetadata = Pick<PromptImageInput, "name" | "role" | "weight">;

function getGeminiReferenceInstruction(asset: GeminiReferenceMetadata, index: number) {
  const weight = asset.weight || "medium";
  const weightRules = {
    low: "LOW style intensity: use only a faint secondary cue.",
    medium: "MEDIUM style intensity: make the referenced visual direction noticeable while respecting the restricted content boundary.",
    high: "HIGH style intensity: strongly apply the referenced visual direction; high weight never permits copying the subject, character identity, face, body, or garment design.",
  } as const;

  const roleRules: Record<ImageReferenceRole, string> = {
    style_reference: `ROLE = STYLE REFERENCE ONLY. ${weightRules[weight]} Forbidden from this image: subject, character identity, face, body, and garment design.`,
    character_identity: "ROLE = CHARACTER IDENTITY ONLY. Preserve adult identity, facial features, hairstyle, and body proportions. Ignore and replace the source clothing, pose, crop, background, lighting, and props.",
    product_master: "ROLE = PRODUCT MASTER. Preserve product silhouette, construction, color, texture, seams, binding, proportions, and visible brand structure with highest fidelity. Ignore the source background, pose, crop, and surrounding objects.",
    product_detail: "ROLE = PRODUCT DETAIL. Preserve only the visible material and construction details. Do not inherit the source scene, pose, crop, or unrelated objects.",
  };

  return `REFERENCE IMAGE ${index + 1}: ${asset.name}. ${roleRules[asset.role]}`;
}

function orderGeminiReferences<T extends GeminiReferenceMetadata>(assets: T[]) {
  const rolePriority: Record<ImageReferenceRole, number> = {
    style_reference: 0,
    character_identity: 1,
    product_detail: 2,
    product_master: 3,
  };
  return [...assets].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);
}

function buildGeminiGenerationPrompt(basePrompt: string, negativePrompt: string, index: number, imageCount: number, modelCount: number) {
  const noPeople = modelCount === 0;
  return [
    basePrompt,
    `[COMMERCIAL SAFETY FRAMING]\n${noPeople ? GEMINI_NO_PEOPLE_FRAMING : GEMINI_SAFE_COMMERCIAL_FRAMING}`,
    `[BATCH VARIATION]\nThis is image ${index + 1} of ${imageCount}. Preserve the product, brand rules, and all reference-image responsibilities.${noPeople ? " Keep every image strictly people-free. Vary only product arrangement, camera position, framing, or subtle composition." : " Preserve character identity. Vary only pose, framing, or subtle composition where reasonable."}`,
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
) {
  const roleLabels: Record<ImageReferenceRole, string> = {
    product_master: "产品主参考图",
    product_detail: "产品细节参考图",
    character_identity: "人物身份参考图",
    style_reference: "风格参考图",
  };
  const referenceBlocks = orderGeminiReferences(assets).map((asset, index) => {
    const weight = asset.weight === "high" ? "高" : asset.weight === "low" ? "低" : "中";
    const boundary = asset.role === "product_master" || asset.role === "product_detail"
      ? "仅锁定产品外观、结构、材质和细节，不复制原图背景与构图。"
      : asset.role === "character_identity"
      ? "仅保持成年人物身份、五官、发型和体型，不复制服装、姿势、裁切、背景与光线。"
      : "可参考视觉风格、姿势、动作、裁切、机位、背景、道具、物体位置与构图；禁止复制主体、人物身份、脸、身体和服装设计。";
    return `参考图${index + 1}：${asset.name}（${roleLabels[asset.role]}，权重：${weight}）\n${boundary}`;
  });

  return [
    basePrompt,
    `【商业安全构图】\n${modelCount === 0
      ? "严格保持无人画面，不得出现人物、人体局部、手、脸、皮肤、人物倒影或人形模特。"
      : "保持成年人物、自然姿态、非情色表达和可信人体结构，产品必须清晰、完整且无遮挡。"}`,
    `【批次变化】\n本次生成${imageCount}张。保持产品、品牌规则与参考图职责一致，仅对动作、取景或细微构图做合理变化。`,
    negativePrompt ? `【必须避免】\n${negativePrompt}` : "",
    referenceBlocks.length
      ? `【参考图使用边界】\n${referenceBlocks.join("\n\n")}`
      : "【参考图使用边界】\n本次没有附加参考图。",
    "【最终执行要求】\n风格参考图可影响视觉风格、姿势、动作、裁切、机位、背景、道具、物体位置与构图，但禁止复制其主体、人物身份、脸、身体和服装设计；产品与人物参考图继续严格遵守各自角色边界。",
  ].filter(Boolean).join("\n\n");
}

function normalizeReferenceMetadata(value: unknown): GeminiReferenceMetadata[] {
  if (!Array.isArray(value)) return [];
  const allowedRoles = new Set<ImageReferenceRole>([
    "product_master",
    "product_detail",
    "character_identity",
    "style_reference",
  ]);
  return value.slice(0, MAX_REFERENCE_IMAGES).map((raw, index) => {
    const asset = (raw || {}) as Record<string, unknown>;
    const role = String(asset.role || "style_reference") as ImageReferenceRole;
    if (!allowedRoles.has(role)) throw new Error(`第 ${index + 1} 张图片角色无效。`);
    const weight = ["low", "medium", "high"].includes(String(asset.weight))
      ? String(asset.weight) as GeminiReferenceMetadata["weight"]
      : undefined;
    return { name: String(asset.name || `参考图 ${index + 1}`), role, weight };
  });
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

async function requestGeminiImageEdit(args: {
  original: { mimeType: string; data: string };
  mask: { mimeType: string; data: string };
  replacement?: { mimeType: string; data: string; name: string };
  prompt: string;
}) {
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";
  const instruction = `
[LOCAL INPAINTING TASK]
Edit the first image according to the user's request. The second image is a transparent PNG mask: red or non-transparent pixels mark the only editable region.
Modify only pixels inside the marked region. Preserve everything outside the mask as faithfully as possible, including identity, product design, garment structure, color, lighting, background, camera, crop, anatomy, and resolution.
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
        generationConfig: { responseModalities: ["IMAGE"] },
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

function normalizeReferenceAssets(value: unknown): PromptImageInput[] {
  if (!Array.isArray(value)) return [];
  if (value.length > MAX_REFERENCE_IMAGES) throw new Error(`参考图最多 ${MAX_REFERENCE_IMAGES} 张。`);

  const allowedRoles = new Set<ImageReferenceRole>([
    "product_master",
    "product_detail",
    "character_identity",
    "style_reference",
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
    style_reference: {
      summary: "风格参考图已接收；当前未配置视觉模型，暂未提取具体风格特征。",
      mustPreserve: [],
      allowedInfluence: ["构图", "光影", "色彩", "影调", "氛围"],
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
- style_reference：只能影响构图、光影、色彩、影调和氛围，不能改变产品或人物身份。
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
    const assets = normalizeReferenceAssets(req.body?.assets);
    const providedAnalyses = Array.isArray(req.body?.imageAnalyses)
      ? req.body.imageAnalyses as AssetAnalysis[]
      : [];
    const analysisById = new Map(providedAnalyses.map((analysis) => [analysis.assetId, analysis]));
    const imageAnalyses = assets.map((asset) => analysisById.get(asset.id) || fallbackAnalysis(asset));
    const compiled = compilePrompt({ ...input, imageAnalyses });

    return res.json({
      ...compiled,
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
    const input = normalizePromptInput(req.body || {});
    const compiled = compilePrompt(input);
    const assets = normalizeReferenceAssets(req.body?.assets);
    const imageCount = Math.max(1, Math.min(6, Number(input.imageCount) || 1));
    const size = getOpenAIImageSize(input.aspectRatio, input.resolution);
    const quality = getOpenAIImageQuality(input.resolution);
    const referenceMap = assets.length > 0
      ? `\n\n【参考图顺序与职责】\n${assets.map((asset, index) => `图${index + 1}：${asset.name}；角色=${asset.role}；权重=${asset.weight || "默认"}`).join("\n")}`
      : "";
    const negativePrompt = typeof req.body?.negativePrompt === "string"
      ? req.body.negativePrompt.trim()
      : compiled.negativePrompt;
    const basePrompt = typeof req.body?.prompt === "string" && req.body.prompt.trim()
      ? req.body.prompt.trim()
      : compiled.positivePrompt;

    await mkdir(GENERATED_DIR, { recursive: true });
    const results: string[] = [];
    for (let index = 0; index < imageCount; index += 1) {
      const prompt = `${basePrompt}${referenceMap}\n\n【本批次变化】这是第 ${index + 1}/${imageCount} 张，在不改变产品、人物身份与品牌规则的前提下，仅对动作、取景或细微构图做合理差异化。${negativePrompt ? `\n\n【必须避免】${negativePrompt}` : ""}`;
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
    const generated = await requestGeminiImageEdit({
      original,
      mask,
      replacement: replacement ? { ...replacement, name: replacementImageName || "局部替换参考图" } : undefined,
      prompt,
    });
    await mkdir(GENERATED_DIR, { recursive: true });
    const extension = generated.mimeType === "image/jpeg" ? "jpg" : generated.mimeType === "image/webp" ? "webp" : "png";
    const fileName = `${Date.now()}-${randomUUID()}-edit.${extension}`;
    const outputBuffer = Buffer.from(generated.base64, "base64");
    await writeFile(path.join(GENERATED_DIR, fileName), outputBuffer);

    const durationMs = Date.now() - startedAt;
    console.info("Gemini local image edit completed", {
      requestId,
      durationMs,
      outputBytes: outputBuffer.byteLength,
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
    const assets = normalizeReferenceMetadata(req.body?.assetMetadata);
    const imageCount = Math.max(1, Math.min(6, Number(input.imageCount) || 1));
    const basePrompt = compiled.positivePromptEnglish || compiled.positivePrompt;
    const negativePrompt = compiled.negativePromptEnglish || compiled.negativePrompt;
    const displayBasePrompt = compiled.positivePrompt;
    const displayNegativePrompt = compiled.negativePrompt;
    const generationPrompt = buildGeminiGenerationPrompt(basePrompt, negativePrompt, 0, imageCount, input.modelCount);

    return res.json({
      prompt: buildGeminiPromptPreview(generationPrompt, assets),
      displayPromptChinese: buildChinesePromptPreview(
        displayBasePrompt,
        displayNegativePrompt,
        assets,
        imageCount,
        input.modelCount,
      ),
      negativePrompt,
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
    const input = normalizePromptInput(req.body || {});
    const compiled = compilePrompt(input);
    const assets = normalizeReferenceAssets(req.body?.assets);
    const imageCount = Math.max(1, Math.min(6, Number(input.imageCount) || 1));
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
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        signal,
        attemptId,
      });
    };

    for (let index = 0; index < imageCount; index += 1) {
      failureStage = "generating";
      const prompt = buildGeminiGenerationPrompt(basePrompt, negativePrompt, index, imageCount, input.modelCount);

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
               buildGeminiGenerationPrompt(refinedPrompt, negativePrompt, index, imageCount, input.modelCount),
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
      aspectRatio: input.aspectRatio,
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
