import type { AssetAnalysis, ImageReferenceRole, ReplacementModeId, VisualTypeId } from "./prompt-config/promptConfig";

export interface ReferenceImage {
  id: string;
  url: string;
  name: string;
  weight: 'low' | 'medium' | 'high';
  role?: ImageReferenceRole;
  mimeType?: string;
  width?: number;
  height?: number;
  originalBytes?: number;
  storageKey?: string;
  analysis?: AssetAnalysis;
}

export interface ImageAsset {
  id: string;
  url: string;
  thumbnail?: string;
  name: string;
  isMain?: boolean;
  role?: ImageReferenceRole;
  mimeType?: string;
  width?: number;
  height?: number;
  originalBytes?: number;
  storageKey?: string;
  analysis?: AssetAnalysis;
}

export interface PromptFragmentSnapshot {
  group: string;
  id: string;
  label: string;
  version: number;
}

export interface Task {
  projectId: string;
  taskId: string;
  createdAt: string;
  productImages: string[]; // URLs or base64 of uploaded product files
  characterImages: string[]; // URLs of character files
  modelCount: number;
  keepCharacter: boolean;
  referenceImages: { url: string; weight: 'low' | 'medium' | 'high' }[];
  visualType: VisualTypeId;
  replacementMode?: ReplacementModeId;
  scene?: string;
  productFunctions: string[];
  shotScale: string; // '全景' | '中景' | '近景' | '特写' | '大特写'
  cameraAngle: string; // '平视' | '仰视' | '俯视'
  tone: string; // '米色调' | '蓝色调'
  resolution: string; // '1K' | '2K' | '4K'
  aspectRatio: string; // '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9'
  imageCount: number;
  originalPrompt: string;
  optimizedPrompt: string;
  optimizedPromptEnglish?: string;
  finalPrompt: string;
  negativePrompt: string;
  negativePromptEnglish?: string;
  promptConfigVersion: string;
  selectedPromptFragments: PromptFragmentSnapshot[];
  promptWarnings: string[];
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  results: string[]; // Array of generated high-res image URLs
  editVersions: { [imageUrl: string]: string[] }; // map image URL -> list of edited versions
  videos: { [imageUrl: string]: { url: string; motion: string; duration: number; strength: string }[] };
}

export interface GenerationFailure {
  title: string;
  message: string;
  reason: string;
  suggestion: string;
  code?: string;
  stage?: string;
  requestId?: string;
  durationMs?: number;
  details?: string;
  safetyRetryTriggered?: boolean;
  retryable?: boolean;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  lastSavedAt: string;
  productImages: ImageAsset[];
  characterImages: ImageAsset[];
  modelCount: number;
  referenceImages: ReferenceImage[];
  visualType: VisualTypeId;
  replacementMode?: ReplacementModeId;
  scene?: string;
  productFunctions: string[];
  shotScale: string;
  cameraAngle: string;
  tone: string;
  resolution: string;
  aspectRatio: string;
  imageCount: number;
  originalPrompt: string;
  optimizedPrompt: string;
  optimizedPromptEnglish?: string;
  negativePrompt: string;
  negativePromptEnglish?: string;
  promptConfigVersion: string;
  selectedPromptFragments: PromptFragmentSnapshot[];
  promptWarnings: string[];
  keepCharacter: boolean;
}

export interface BrandColor {
  name: string;
  hex: string;
}

export interface BrandAsset {
  logoUrl: string;
  colors: BrandColor[];
  fonts: string[];
  productTemplates: { id: string; url: string; name: string }[];
  promptTemplates: { id: string; title: string; content: string }[];
}
