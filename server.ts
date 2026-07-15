import express from "express";
import path from "path";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, type Part } from "@google/genai";
import { fetch as undiciFetch, FormData as UndiciFormData, ProxyAgent } from "undici";
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
const OPENAI_PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const openAIProxyAgent = OPENAI_PROXY_URL ? new ProxyAgent(OPENAI_PROXY_URL) : undefined;
app.use("/generated", express.static(GENERATED_DIR));

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
    console.log("Gemini SDK successfully initialized on server.");
  } catch (error) {
    console.error("Failed to initialize Gemini SDK:", error);
  }
} else {
  console.warn("GEMINI_API_KEY is not defined. Using deterministic prompt compilation.");
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

async function requestGeminiImage(args: {
  prompt: string;
  assets: PromptImageInput[];
  aspectRatio: string;
  resolution: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("尚未配置 GEMINI_API_KEY，无法调用 Gemini 图片生成模型。");

  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";
  const parts: Array<Record<string, unknown>> = [{ text: args.prompt }];
  args.assets.forEach((asset, index) => {
    const parsed = parseImageDataUrl(asset.dataUrl);
    parts.push({
      text: `参考图 ${index + 1}：${asset.name}；角色：${asset.role}；权重：${asset.weight || "默认"}。严格按该角色限制参考范围。`,
    });
    parts.push({
      inline_data: {
        mime_type: parsed.mimeType,
        data: parsed.data,
      },
    });
  });

  const response = await undiciFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
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
    error?: { message?: string; code?: number; status?: string };
  };
  if (!response.ok) {
    const status = payload.error?.status ? ` (${payload.error.status})` : "";
    throw new Error(`${payload.error?.message || `Gemini API 请求失败：${response.status}`}${status}`);
  }

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
  });
});

app.post("/api/gemini/generate-images", async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: "Gemini 生图链路已接入，但本机尚未配置 GEMINI_API_KEY。请在 .env.local 中设置后重启服务。",
      code: "GEMINI_API_KEY_MISSING",
    });
  }

  try {
    const input = normalizePromptInput(req.body || {});
    const compiled = compilePrompt(input);
    const assets = normalizeReferenceAssets(req.body?.assets);
    const imageCount = Math.max(1, Math.min(6, Number(input.imageCount) || 1));
    const basePrompt = typeof req.body?.prompt === "string" && req.body.prompt.trim()
      ? req.body.prompt.trim()
      : compiled.positivePromptEnglish || compiled.positivePrompt;
    const safeCommercialFraming = "Depict clearly adult professional models only. Present the apparel in a neutral, non-sexualized commercial catalog and brand-campaign context, with natural posture and product-focused framing.";

    await mkdir(GENERATED_DIR, { recursive: true });
    const results: string[] = [];
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";
    for (let index = 0; index < imageCount; index += 1) {
      const prompt = `${basePrompt}\n\n[COMMERCIAL SAFETY FRAMING]\n${safeCommercialFraming}\n\n[BATCH VARIATION]\nThis is image ${index + 1} of ${imageCount}. Preserve the product, character identity, brand rules, and all reference-image responsibilities. Vary only pose, framing, or subtle composition where reasonable.`;
      const generated = await requestGeminiImage({
        prompt,
        assets,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
      });
      const extension = generated.mimeType === "image/jpeg" ? "jpg" : generated.mimeType === "image/webp" ? "webp" : "png";
      const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
      await writeFile(path.join(GENERATED_DIR, fileName), Buffer.from(generated.base64, "base64"));
      results.push(`/generated/${fileName}`);
    }

    return res.json({
      results,
      provider: "google",
      model,
      aspectRatio: input.aspectRatio,
      resolution: normalizeGeminiImageResolution(input.resolution),
      referenceImageCount: assets.length,
    });
  } catch (error) {
    console.error("Gemini image generation failed:", error);
    const message = error instanceof Error ? error.message : "Gemini 生图失败。";
    return res.status(502).json({ error: message });
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
