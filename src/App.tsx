import React, { useState, useEffect } from "react";
import { Project, Task, ImageAsset, ReferenceImage, type GenerationFailure, type ModeWorkspace } from "./types";
import SidebarParams from "./components/SidebarParams";
import CanvasArea from "./components/CanvasArea";
import TaskPanel from "./components/TaskPanel";
import HistoryPage from "./components/HistoryPage";
import EditorModal from "./components/EditorModal";
import {
  getDefaultScene,
  getRecommendedTone,
  getSceneOptions,
  type AssetAnalysis,
  type PromptImageInput,
  type ReplacementModeId,
} from "./prompt-config/promptConfig";
import { hydrateProjectImages, serializeProjectsWithoutImagePayloads, serializeTasksWithoutImagePayloads } from "./data/imageAssetStore";

import { PRODUCT_TEMPLATES, CHARACTER_TEMPLATES, REF_TEMPLATES } from "./data/mockAssets";
import { Sparkles, Calendar, BookOpen, Layers, Clock, ArrowLeftRight, Check, Play, Settings, Plus, Save, Compass, HelpCircle, User, ChevronDown } from "lucide-react";

function getActiveCharacterImages(project: Project) {
  return project.modelSource === "custom" && project.replacementWorkflow !== "product_only" ? project.characterImages : [];
}

function getReferencePromptName(asset: ReferenceImage) {
  return asset.replacementCategory ? `[${asset.replacementCategory}] ${asset.name}` : asset.name;
}

function snapshotModeWorkspace(project: Project): ModeWorkspace {
  return {
    productImages: project.productImages,
    characterImages: project.characterImages,
    modelCount: project.modelCount,
    modelSource: project.modelSource,
    referenceImages: project.referenceImages,
    visualType: project.visualType,
    replacementMode: project.replacementMode,
    replacementWorkflow: project.replacementWorkflow,
    scene: project.scene,
    productFunctions: project.productFunctions,
    shotScale: project.shotScale,
    cameraAngle: project.cameraAngle,
    originalPrompt: project.originalPrompt,
    keepCharacter: project.keepCharacter,
  };
}

function createEmptyModeWorkspace(mode: "creative" | "replacement"): ModeWorkspace {
  const visualType = mode === "replacement" ? "R" : "A";
  return {
    productImages: [],
    characterImages: [],
    modelCount: 1,
    modelSource: "default",
    referenceImages: [],
    visualType,
    replacementMode: "服装+场景替换",
    replacementWorkflow: "multi_replace",
    scene: getDefaultScene(visualType),
    productFunctions: [],
    shotScale: "中景",
    cameraAngle: "平视",
    originalPrompt: "",
    keepCharacter: true,
  };
}

function getPromptAssets(project: Project): PromptImageInput[] {
  return [
    ...project.productImages
      .filter((asset) => asset.url.startsWith("data:image/"))
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        role: asset.isMain ? "product_master" as const : "product_detail" as const,
        dataUrl: asset.url,
        weight: asset.isMain ? "high" as const : "medium" as const,
      })),
    ...getActiveCharacterImages(project)
      .filter((asset) => asset.url.startsWith("data:image/"))
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        role: project.visualType === "R"
          && (project.replacementMode === "服装+场景替换" || project.replacementMode === "服装替换")
          ? "character_garment_reference" as const
          : "character_identity" as const,
        dataUrl: asset.url,
        weight: "high" as const,
      })),
    ...project.referenceImages
      .filter((asset) => asset.url.startsWith("data:image/"))
      .map((asset) => ({
        id: asset.id,
        name: getReferencePromptName(asset),
        role: project.visualType === "R" ? "replacement_reference" as const : "style_reference" as const,
        dataUrl: asset.url,
        weight: asset.weight,
      })),
  ];
}

function getPromptAssetMetadata(project: Project) {
  return getPromptAssets(project).map(({ name, role, weight }) => ({ name, role, weight }));
}

function getProjectImageAnalyses(project: Project): AssetAnalysis[] {
  const characterRole = project.visualType === "R"
    && (project.replacementMode === "服装+场景替换" || project.replacementMode === "服装替换")
    ? "character_garment_reference"
    : "character_identity";
  const referenceRole = project.visualType === "R" ? "replacement_reference" : "style_reference";
  return [
    ...project.productImages.map((asset) => asset.analysis),
    ...getActiveCharacterImages(project).map((asset) => asset.analysis?.role === characterRole ? asset.analysis : undefined),
    ...project.referenceImages.map((asset) => asset.analysis?.role === referenceRole ? asset.analysis : undefined),
  ].filter((analysis): analysis is AssetAnalysis => Boolean(analysis));
}

const TASK_HISTORY_STORAGE_LIMIT = 30;

function getClientGenerationFailure(error: unknown): GenerationFailure {
  const message = error instanceof Error ? error.message : "浏览器无法访问本地生图服务。";
  return {
    title: "本地生图服务连接失败",
    message: "页面没有收到本地生图接口的有效响应。",
    reason: message === "Failed to fetch" || message === "fetch failed"
      ? "本地服务可能已停止、正在重启，或浏览器与服务端的连接被中断。"
      : message,
    suggestion: "请确认项目服务仍在运行并刷新页面；如果服务正常，再检查本机网络与代理。",
    code: "LOCAL_SERVICE_UNREACHABLE",
    stage: "request",
    details: message,
    retryable: true,
  };
}

function persistWorkspaceState(projects: Project[], tasks: Task[], currentProjectId: string) {
  const compactTasks = serializeTasksWithoutImagePayloads(tasks.slice(0, TASK_HISTORY_STORAGE_LIMIT));
  try {
    // Replace the previously oversized task payload first so quota is released before other writes.
    localStorage.setItem("badigao_tasks", JSON.stringify(compactTasks));
    localStorage.setItem("badigao_projects", JSON.stringify(serializeProjectsWithoutImagePayloads(projects)));
    localStorage.setItem("badigao_current_proj_id", currentProjectId);
    return true;
  } catch (error) {
    console.warn("Workspace state could not be fully persisted:", error);
    try {
      localStorage.removeItem("badigao_tasks");
      localStorage.setItem("badigao_tasks", JSON.stringify(compactTasks.slice(0, 10)));
    } catch (fallbackError) {
      console.warn("Compact task history fallback also failed:", fallbackError);
    }
    return false;
  }
}

const LEGACY_DEMO_IMAGE_IDS = [
  "photo-1571945153237-4929e78394a9",
  "photo-1518310383802-640c2de311b2",
  "photo-1506126613408-eca07ce68773",
  "photo-1476480862126-209bfaa8edc8",
  "photo-1532444458054-01a7dd3e9fca",
];

const isLegacyDemoImage = (url: string) => LEGACY_DEMO_IMAGE_IDS.some((id) => url.includes(id));

const removeLegacyDemoImages = (project: Project): Project => {
  const cleanWorkspace = (workspace?: ModeWorkspace) => workspace ? {
    ...workspace,
    productImages: workspace.productImages.filter((asset) => !isLegacyDemoImage(asset.url)),
    characterImages: workspace.characterImages.filter((asset) => !isLegacyDemoImage(asset.url)),
    referenceImages: workspace.referenceImages.filter((asset) => !isLegacyDemoImage(asset.url)),
  } : workspace;

  return {
    ...project,
    productImages: project.productImages.filter((asset) => !isLegacyDemoImage(asset.url)),
    characterImages: project.characterImages.filter((asset) => !isLegacyDemoImage(asset.url)),
    referenceImages: project.referenceImages.filter((asset) => !isLegacyDemoImage(asset.url)),
    creativeWorkspace: cleanWorkspace(project.creativeWorkspace),
    replacementWorkspace: cleanWorkspace(project.replacementWorkspace),
  };
};

// Initial project starts with an empty material board.
const DEMO_PROJECT: Project = {
  id: "proj-demo-summer-2026",
  name: "2026 夏季运动系列",
  createdAt: new Date().toISOString(),
  lastSavedAt: new Date().toISOString(),
  productImages: [],
  characterImages: [],
  modelCount: 1,
  modelSource: "default",
  referenceImages: [],
  visualType: "B",
  scene: "居家柔弹与立体包裹",
  productFunctions: [],
  shotScale: "中景",
  cameraAngle: "平视",
  tone: "米色调",
  resolution: "2K",
  aspectRatio: "3:4",
  imageCount: 1,
  originalPrompt: "",
  optimizedPrompt: "",
  negativePrompt: "",
  promptConfigVersion: "",
  selectedPromptFragments: [],
  promptWarnings: [],
  keepCharacter: true
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'history'>('workspace');
  const [projects, setProjects] = useState<Project[]>([DEMO_PROJECT]);
  const [currentProjectId, setCurrentProjectId] = useState<string>("proj-demo-summer-2026");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Dynamic creation modals
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [showProjDropdown, setShowProjDropdown] = useState(false);

  // AI Generation States
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingLogs, setGeneratingLogs] = useState<string[]>([]);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const [generationError, setGenerationError] = useState<GenerationFailure | null>(null);
  const [actualPromptPreviewEnglish, setActualPromptPreviewEnglish] = useState("");
  const [actualPromptPreviewChinese, setActualPromptPreviewChinese] = useState("");
  const [isPromptPreviewLoading, setIsPromptPreviewLoading] = useState(false);

  // Editing Modals States
  const [editingTarget, setEditingTarget] = useState<{ imageUrl: string; originalUrl: string } | null>(null);

  // Status Alerts
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  useEffect(() => {
    if (!isGenerating) return;
    const startedAt = Date.now();
    const announced = new Set<number>();
    const progressTimer = window.setInterval(() => {
      const elapsed = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
      setGenerationElapsedSeconds(elapsed);
      setGeneratingProgress(() => {
        if (elapsed <= 5) return Math.min(32, 12 + elapsed * 4);
        if (elapsed <= 15) return Math.min(54, 32 + Math.floor((elapsed - 5) * 2.2));
        if (elapsed <= 45) return Math.min(75, 54 + Math.floor((elapsed - 15) * 0.7));
        return Math.min(92, 75 + Math.floor((elapsed - 45) / 5));
      });

      const timedLogs: Record<number, string> = {
        5: "参考图已提交，正在解析产品、人物与风格职责...",
        15: "Gemini 正在执行图片合成，复杂参考图可能需要更长时间...",
        30: "模型仍在渲染，请保持当前页面打开...",
        60: "已等待超过 1 分钟，继续等待 Gemini 返回结果...",
        120: "已等待超过 2 分钟，高清图片和多参考图通常耗时更久...",
      };
      const log = timedLogs[elapsed];
      if (log && !announced.has(elapsed)) {
        announced.add(elapsed);
        setGeneratingLogs((current) => [...current, log]);
      }
    }, 1000);
    return () => window.clearInterval(progressTimer);
  }, [isGenerating]);

  // Load from LocalStorage
  useEffect(() => {
    const savedProjects = localStorage.getItem("badigao_projects");
    const savedTasks = localStorage.getItem("badigao_tasks");
    const savedCurrentProj = localStorage.getItem("badigao_current_proj_id");
    const shouldMigrateDefaultCount = localStorage.getItem("badigao_default_image_count_v1") !== "done";

    if (savedProjects) {
      const parsedProjects: Project[] = JSON.parse(savedProjects);
      const normalizedProjects = parsedProjects.map((savedProject) => {
        const project = removeLegacyDemoImages(savedProject);
        const sceneOptions = getSceneOptions(project.visualType);
        const hasValidScene = project.visualType === "C" || sceneOptions.some((option) => option.id === project.scene);
        const scene = hasValidScene ? project.scene : getDefaultScene(project.visualType);

        const hasCategorizedReplacementAssets = project.referenceImages.some((asset) => Boolean(asset.replacementCategory));
        const workspaceMode = project.workspaceMode || (project.visualType === "R" || hasCategorizedReplacementAssets ? "replacement" : "creative");
        const normalizedProject: Project = {
          ...project,
          modelCount: Number.isFinite(project.modelCount)
            ? Math.max(0, Math.min(4, project.modelCount))
            : Math.max(1, project.characterImages.length),
          modelSource: project.modelSource || (project.modelCount === 0 ? "none" : project.characterImages.length ? "custom" : "default"),
          scene,
          replacementMode: project.replacementMode || "服装+场景替换",
          replacementWorkflow: project.replacementWorkflow || "multi_replace",
          imageCount: shouldMigrateDefaultCount ? 1 : project.imageCount,
          tone: hasValidScene ? project.tone : getRecommendedTone(project.visualType, scene),
          originalPrompt: (project.originalPrompt && project.originalPrompt === "清晨自然光，真实自然的人物状态，高级运动杂志摄影质感，突出产品的版型、面料纹理和舒适感，保持人物形象与产品设计一致。") ? "" : (project.originalPrompt || ""),
          optimizedPrompt: "",
          optimizedPromptEnglish: "",
          negativePrompt: "",
          negativePromptEnglish: "",
          promptConfigVersion: "",
          selectedPromptFragments: [],
          promptWarnings: [],
        };
        const currentWorkspace = snapshotModeWorkspace(normalizedProject);
        let creativeWorkspace = project.creativeWorkspace || (workspaceMode === "creative" ? currentWorkspace : createEmptyModeWorkspace("creative"));
        let replacementWorkspace = project.replacementWorkspace || (workspaceMode === "replacement" ? currentWorkspace : createEmptyModeWorkspace("replacement"));
        const creativeContainsReplacementAssets = creativeWorkspace.referenceImages.some((asset) => Boolean(asset.replacementCategory));
        const replacementIsEmpty = replacementWorkspace.productImages.length === 0
          && replacementWorkspace.characterImages.length === 0
          && replacementWorkspace.referenceImages.length === 0;
        if (creativeContainsReplacementAssets && replacementIsEmpty) {
          replacementWorkspace = { ...creativeWorkspace, visualType: "R", replacementMode: creativeWorkspace.replacementMode || "服装+场景替换" };
          creativeWorkspace = createEmptyModeWorkspace("creative");
        }
        const activeWorkspace = workspaceMode === "replacement" ? replacementWorkspace : creativeWorkspace;
        return {
          ...normalizedProject,
          ...activeWorkspace,
          workspaceMode,
          creativeWorkspace,
          replacementWorkspace,
        };
      });
      if (shouldMigrateDefaultCount) {
        try {
          localStorage.setItem("badigao_default_image_count_v1", "done");
        } catch (error) {
          console.warn("Default image count migration flag could not be saved:", error);
        }
      }
      setProjects(normalizedProjects);
      void hydrateProjectImages(normalizedProjects).then((hydratedProjects) => {
        setProjects(hydratedProjects);
        try {
          localStorage.setItem("badigao_projects", JSON.stringify(serializeProjectsWithoutImagePayloads(hydratedProjects)));
        } catch (error) {
          console.warn("Hydrated project metadata could not be persisted:", error);
        }
      });
    }
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks)
        .filter((t: any) => t.taskId !== "task-demo-initial-shot")
        .map((task: Task) => ({
          ...task,
          replacementMode: task.replacementMode || "服装+场景替换",
          modelCount: Number.isFinite(task.modelCount) ? task.modelCount : Math.max(1, task.characterImages.length),
          negativePrompt: task.negativePrompt || "",
          promptConfigVersion: task.promptConfigVersion || "legacy",
          selectedPromptFragments: task.selectedPromptFragments || [],
          promptWarnings: task.promptWarnings || [],
        }));
      setTasks(parsedTasks);
      try {
        localStorage.setItem("badigao_tasks", JSON.stringify(serializeTasksWithoutImagePayloads(parsedTasks.slice(0, TASK_HISTORY_STORAGE_LIMIT))));
      } catch (error) {
        console.warn("Legacy task history could not be compacted:", error);
      }
      if (parsedTasks.length > 0) {
        setActiveTaskId(parsedTasks[0].taskId);
      }
    }
    if (savedCurrentProj) setCurrentProjectId(savedCurrentProj);
  }, []);

  // Save to LocalStorage helper
  const saveStateToLocalStorage = (updatedProjs: Project[], updatedTasks: Task[]) => {
    return persistWorkspaceState(updatedProjs, updatedTasks, currentProjectId);
  };

  const currentProject = projects.find(p => p.id === currentProjectId) || projects[0] || DEMO_PROJECT;

  const promptPreviewPayload = React.useMemo(() => ({
    visualType: currentProject.visualType,
    replacementMode: currentProject.replacementMode,
    replacementWorkflow: currentProject.replacementWorkflow,
    scene: currentProject.scene,
    productFunctions: currentProject.productFunctions,
    shotScale: currentProject.shotScale,
    cameraAngle: currentProject.cameraAngle,
    tone: currentProject.tone,
    originalPrompt: currentProject.originalPrompt,
    resolution: currentProject.resolution,
    aspectRatio: currentProject.aspectRatio,
    imageCount: currentProject.imageCount,
    modelCount: currentProject.modelCount,
    productImages: currentProject.productImages.map((item) => item.name),
    characterImages: getActiveCharacterImages(currentProject).map((item) => item.name),
    referenceImages: currentProject.referenceImages.map(getReferencePromptName),
    referenceImageWeights: currentProject.referenceImages.map((item) => ({
      name: getReferencePromptName(item),
      weight: item.weight,
    })),
    imageAnalyses: getProjectImageAnalyses(currentProject),
    assetMetadata: getPromptAssetMetadata(currentProject),
  }), [currentProject]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsPromptPreviewLoading(true);
      try {
        const response = await fetch("/api/gemini/prompt-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promptPreviewPayload),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "实际生图提示词生成失败。");
        setActualPromptPreviewEnglish(String(data.prompt || ""));
        setActualPromptPreviewChinese(String(data.displayPromptChinese || ""));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Prompt preview failed:", error);
        setActualPromptPreviewEnglish("");
        setActualPromptPreviewChinese("生图提示词暂时无法生成，请检查本地服务。");
      } finally {
        if (!controller.signal.aborted) setIsPromptPreviewLoading(false);
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [promptPreviewPayload]);

  // Update current project parameters
  const handleUpdateProject = (updates: Partial<Project>) => {
    const updated = projects.map(p => {
      if (p.id === currentProjectId) {
        const shouldInvalidatePrompt = !("optimizedPrompt" in updates);
        const nextProject: Project = {
          ...p,
          ...updates,
          ...(shouldInvalidatePrompt
            ? {
                optimizedPrompt: "",
                optimizedPromptEnglish: "",
                negativePrompt: "",
                negativePromptEnglish: "",
                promptConfigVersion: "",
                selectedPromptFragments: [],
                promptWarnings: [],
              }
            : {}),
          lastSavedAt: new Date().toISOString()
        };
        if (!("workspaceMode" in updates)) {
          const activeMode = p.workspaceMode || (p.visualType === "R" ? "replacement" : "creative");
          if (activeMode === "creative") nextProject.creativeWorkspace = snapshotModeWorkspace(nextProject);
          else nextProject.replacementWorkspace = snapshotModeWorkspace(nextProject);
        }
        return nextProject;
      }
      return p;
    });
    setProjects(updated);
    // Existing results belong to the previous parameter snapshot. Hide them as
    // soon as generation-affecting settings change so they are not presented
    // beside a newly compiled prompt for a different scene.
    setActiveTaskId(null);
    saveStateToLocalStorage(updated, tasks);
  };

  // Create new project
  const handleCreateProject = () => {
    if (!newProjName.trim()) return;
    const newId = `proj-${Date.now()}`;
    const newProj: Project = {
      id: newId,
      name: newProjName,
      createdAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      productImages: [],
      characterImages: [],
      modelCount: 1,
      modelSource: "default",
      workspaceMode: "creative",
      creativeWorkspace: createEmptyModeWorkspace("creative"),
      replacementWorkspace: createEmptyModeWorkspace("replacement"),
      referenceImages: [],
      visualType: "A",
      replacementMode: "服装+场景替换",
      replacementWorkflow: "multi_replace",
      scene: "海边自在",
      productFunctions: [],
      shotScale: "中景",
      cameraAngle: "平视",
      tone: "蓝色调",
      resolution: "2K",
      aspectRatio: "3:4",
      imageCount: 1,
      originalPrompt: "",
      optimizedPrompt: "",
      negativePrompt: "",
      promptConfigVersion: "",
      selectedPromptFragments: [],
      promptWarnings: [],
      keepCharacter: true
    };

    const updated = [...projects, newProj];
    setProjects(updated);
    setCurrentProjectId(newId);
    setNewProjName("");
    setShowNewProjModal(false);
    saveStateToLocalStorage(updated, tasks);
  };

  // Save Project Snapshot Manual notification
  const handleSaveProject = () => {
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(null), 2500);
  };

  // Generate the complete prompt package locally from the configured rules.
  const handleOptimizePrompt = async () => {
    setIsOptimizing(true);
    try {
      const assets = getPromptAssets(currentProject);

      const existingAnalyses = [
        ...currentProject.productImages.map((asset) => asset.analysis),
        ...currentProject.characterImages.map((asset) => asset.analysis),
        ...currentProject.referenceImages.map((asset) => asset.analysis),
      ].filter((analysis): analysis is AssetAnalysis => Boolean(analysis));
      const response = await fetch("/api/prompt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualType: currentProject.visualType,
          replacementMode: currentProject.replacementMode,
          replacementWorkflow: currentProject.replacementWorkflow,
          scene: currentProject.scene,
          productFunctions: currentProject.productFunctions,
          shotScale: currentProject.shotScale,
          cameraAngle: currentProject.cameraAngle,
          tone: currentProject.tone,
          originalPrompt: currentProject.originalPrompt,
          resolution: currentProject.resolution,
          aspectRatio: currentProject.aspectRatio,
          imageCount: currentProject.imageCount,
          modelCount: currentProject.modelCount,
          productImages: currentProject.productImages.map(p => p.name || "巴迪高核心主图"),
          characterImages: getActiveCharacterImages(currentProject).map(c => c.name || "参考人物形象"),
          referenceImages: currentProject.referenceImages.map(r => getReferencePromptName(r) || "参考风格图"),
          referenceImageWeights: currentProject.referenceImages.map(r => ({
            name: getReferencePromptName(r) || "参考风格图",
            weight: r.weight,
          })),
          assets,
          imageAnalyses: existingAnalyses,
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "提示词生成失败。");
      const optimizedPrompt = data?.positivePrompt || data?.optimized;
      if (optimizedPrompt) {
        const imageAnalyses: AssetAnalysis[] = Array.isArray(data.analyses) ? data.analyses : existingAnalyses;
        const analysisById = new Map(imageAnalyses.map((analysis) => [analysis.assetId, analysis]));
        const analysisWarnings = imageAnalyses.flatMap((analysis) => analysis.warnings || []);
        handleUpdateProject({
          productImages: currentProject.productImages.map((asset) => ({
            ...asset,
            role: asset.isMain ? "product_master" : "product_detail",
            analysis: analysisById.get(asset.id) || asset.analysis,
          })),
          characterImages: currentProject.characterImages.map((asset) => ({
            ...asset,
            role: currentProject.visualType === "R"
              && (currentProject.replacementMode === "服装+场景替换" || currentProject.replacementMode === "服装替换")
              ? "character_garment_reference"
              : "character_identity",
            analysis: analysisById.get(asset.id) || asset.analysis,
          })),
          referenceImages: currentProject.referenceImages.map((asset) => ({
            ...asset,
            role: currentProject.visualType === "R" ? "replacement_reference" : "style_reference",
            analysis: analysisById.get(asset.id) || asset.analysis,
          })),
          optimizedPrompt,
          optimizedPromptEnglish: data.positivePromptEnglish || optimizedPrompt,
          negativePrompt: data.negativePrompt || "",
          negativePromptEnglish: data.negativePromptEnglish || data.negativePrompt || "",
          promptConfigVersion: data.configVersion || "",
          selectedPromptFragments: Array.isArray(data.selectedFragments)
            ? data.selectedFragments.map((fragment: any) => ({
                group: fragment.group,
                id: fragment.id,
                label: fragment.label,
                version: fragment.version,
              }))
            : [],
          promptWarnings: [
            ...(Array.isArray(data.warnings) ? data.warnings : []),
            ...analysisWarnings,
          ],
        });
        setActiveTaskId(null);
        setShowSavedNotification(true);
        window.setTimeout(() => setShowSavedNotification(false), 1800);
      }
    } catch (e) {
      console.error("Failed prompt optimization:", e);
      alert(e instanceof Error ? e.message : "提示词生成失败，请稍后重试。");
    } finally {
      setIsOptimizing(false);
    }
  };

  // Trigger main brand visual generation pipeline
  const handleGenerateBrandVisual = async () => {
    const generationProject = currentProject;
    if (generationProject.visualType === "R" && generationProject.referenceImages.length === 0) {
      setGenerationError({
        title: "缺少替换参考图",
        message: "替换模式必须上传至少一张替换参考图。",
        reason: "系统需要从参考图中提取并百分百复刻姿势、动作、图片视角和构图。",
        suggestion: "请在“参考风格图”区域上传替换基准图后重新生成。",
        code: "REPLACEMENT_REFERENCE_REQUIRED",
        stage: "preparing",
        retryable: false,
      });
      return;
    }
    let responseFailure: GenerationFailure | null = null;
    setGenerationError(null);
    setIsGenerating(true);
    setGeneratingProgress(12);
    setGenerationElapsedSeconds(0);
    setGeneratingLogs(["正在连接 Gemini 图片生成模型...", "正在安全上传参考图并应用图片角色约束..."]);

    try {
      const response = await fetch("/api/gemini/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualType: generationProject.visualType,
          replacementMode: generationProject.replacementMode,
          replacementWorkflow: generationProject.replacementWorkflow,
          scene: generationProject.scene,
          productFunctions: generationProject.productFunctions,
          shotScale: generationProject.shotScale,
          cameraAngle: generationProject.cameraAngle,
          tone: generationProject.tone,
          originalPrompt: generationProject.originalPrompt,
          resolution: generationProject.resolution,
          aspectRatio: generationProject.aspectRatio,
          imageCount: generationProject.imageCount,
          modelCount: generationProject.modelCount,
          productImages: generationProject.productImages.map((item) => item.name),
          characterImages: getActiveCharacterImages(generationProject).map((item) => item.name),
          referenceImages: generationProject.referenceImages.map(getReferencePromptName),
          referenceImageWeights: generationProject.referenceImages.map((item) => ({
            name: getReferencePromptName(item),
            weight: item.weight,
          })),
          imageAnalyses: getProjectImageAnalyses(generationProject),
          assets: getPromptAssets(generationProject),
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error(`服务响应格式错误 (${response.status} ${response.statusText})`);
      }

      if (!response.ok) {
        responseFailure = {
          title: data?.title || "本次生成未完成",
          message: data?.error || "Gemini 没有返回图片结果。",
          reason: data?.reason || "服务端未能完成本次图片生成请求。",
          suggestion: data?.suggestion || "请检查网络、模型权限、账户额度和参考图后重试。",
          code: data?.code,
          stage: data?.stage,
          requestId: data?.requestId,
          durationMs: data?.durationMs,
          details: data?.details,
          safetyRetryTriggered: Boolean(data?.safetyRetryTriggered),
          retryable: data?.retryable !== false,
        };
        throw new Error(responseFailure.message);
      }
      const generatedUrls = Array.isArray(data.results) ? data.results.map(String) : [];
      if (generatedUrls.length === 0) throw new Error("模型未返回图片结果。");

      setGeneratingProgress(100);
      setGeneratingLogs((prev) => [...prev, `已由 ${data.model || "GPT Image"} 完成 ${generatedUrls.length} 张图片。`]);

      const newTask: Task = {
          projectId: currentProjectId,
          taskId: `task-${Date.now()}`,
          createdAt: new Date().toISOString(),
          productImages: generationProject.productImages.map(p => p.url),
          characterImages: getActiveCharacterImages(generationProject).map(p => p.url),
          modelCount: generationProject.modelCount,
          keepCharacter: generationProject.keepCharacter,
          referenceImages: generationProject.referenceImages.map(r => ({ url: r.url, weight: r.weight })),
          visualType: generationProject.visualType,
          replacementMode: generationProject.replacementMode,
          scene: data.scene || generationProject.scene,
          productFunctions: generationProject.productFunctions,
          shotScale: generationProject.shotScale,
          cameraAngle: generationProject.cameraAngle,
          tone: generationProject.tone,
          resolution: generationProject.resolution,
          aspectRatio: data.aspectRatio || generationProject.aspectRatio,
          imageCount: generationProject.imageCount,
          originalPrompt: generationProject.originalPrompt,
          optimizedPrompt: data.positivePrompt || generationProject.optimizedPrompt || generationProject.originalPrompt,
          optimizedPromptEnglish: data.positivePromptEnglish || generationProject.optimizedPromptEnglish,
          finalPrompt: data.positivePrompt || generationProject.optimizedPrompt || generationProject.originalPrompt,
          negativePrompt: data.negativePrompt || generationProject.negativePrompt || "",
          negativePromptEnglish: data.negativePromptEnglish || generationProject.negativePromptEnglish,
          promptConfigVersion: data.promptConfigVersion || generationProject.promptConfigVersion || "",
          selectedPromptFragments: Array.isArray(data.selectedPromptFragments)
            ? data.selectedPromptFragments
            : generationProject.selectedPromptFragments || [],
          promptWarnings: Array.isArray(data.promptWarnings)
            ? data.promptWarnings
            : generationProject.promptWarnings || [],
          status: "completed",
          results: generatedUrls,
          editVersions: {},
          videos: {}
      };

      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      setActiveTaskId(newTask.taskId);
      setIsGenerating(false);
      saveStateToLocalStorage(projects, updatedTasks);
    } catch (error) {
      console.error("Gemini image generation failed:", error);
      const failure = responseFailure || getClientGenerationFailure(error);
      setGenerationError(failure);
      setGeneratingLogs((prev) => [...prev, `生图未完成：${failure.title}`]);
      setIsGenerating(false);
    }
  };

  // Restore task parameters straight back to project work state
  const handleRestoreTaskParams = (task: Task) => {
    handleUpdateProject({
      visualType: task.visualType,
      replacementMode: task.replacementMode,
      scene: task.scene,
      productFunctions: task.productFunctions,
      shotScale: task.shotScale,
      cameraAngle: task.cameraAngle,
      tone: task.tone,
      resolution: task.resolution,
      aspectRatio: task.aspectRatio,
      imageCount: task.imageCount,
      modelCount: task.modelCount,
      originalPrompt: task.originalPrompt,
      optimizedPrompt: task.optimizedPrompt,
      optimizedPromptEnglish: task.optimizedPromptEnglish || "",
      negativePrompt: task.negativePrompt || "",
      negativePromptEnglish: task.negativePromptEnglish || "",
      promptConfigVersion: task.promptConfigVersion || "",
      selectedPromptFragments: task.selectedPromptFragments || [],
      promptWarnings: task.promptWarnings || [],
      keepCharacter: task.keepCharacter
    });
    setActiveTab('workspace');
    setActiveTaskId(task.taskId);
  };

  // Delete task record
  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.taskId !== taskId);
    setTasks(updated);
    if (activeTaskId === taskId) {
      setActiveTaskId(updated[0]?.taskId || null);
    }
    saveStateToLocalStorage(projects, updated);
  };

  // Canvas Image Brush Editor Callback: Save newly edited version
  const handleSaveEditedVersion = (originalUrl: string, editedUrl: string) => {
    const updated = tasks.map(task => {
      if (task.taskId === activeTaskId) {
        const currentEdits = task.editVersions[originalUrl] || [];
        return {
          ...task,
          editVersions: {
            ...task.editVersions,
            [originalUrl]: [...currentEdits, editedUrl]
          }
        };
      }
      return task;
    });
    setTasks(updated);
    saveStateToLocalStorage(projects, updated);
  };

  const activeTask = tasks.find(t => t.taskId === activeTaskId) || null;

  return (
    <div id="badigao-app" className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans select-none">
      
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 shrink-0 flex items-center justify-between z-10 shadow-sm">
        
        {/* Left: Brand logo & dynamic project dropdown */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-base shadow-md">
              巴
            </span>
            <div className="text-left leading-tight">
              <span className="font-extrabold text-sm tracking-widest text-slate-900 block">BADIGAO</span>
              <span className="text-[9px] font-bold text-blue-600 block">巴迪高品牌设计舱</span>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="h-5 w-px bg-gray-200" />

          {/* Project selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProjDropdown(!showProjDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold hover:bg-gray-50 text-slate-800 transition shadow-inner"
            >
              <span>📁 {currentProject.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {showProjDropdown && (
              <div className="absolute top-full mt-1.5 left-0 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 text-xs text-gray-700 animate-fade-in">
                <span className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
                  切换项目
                </span>
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentProjectId(p.id);
                      setShowProjDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between ${
                      p.id === currentProjectId ? "bg-blue-50/50 font-bold text-blue-600" : ""
                    }`}
                  >
                    <span>{p.name}</span>
                    {p.id === currentProjectId && <span className="text-[10px] text-blue-600 font-bold">当前</span>}
                  </button>
                ))}
                
                <div className="h-px bg-gray-100 my-1" />
                
                <button
                  onClick={() => {
                    setShowNewProjModal(true);
                    setShowProjDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-blue-600 font-bold hover:bg-blue-50 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新建生成项目
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: Main View Tab Navs */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl">
          {[
            { id: "workspace", label: "创意工作台", icon: Compass },
            { id: "history", label: "生成历史", icon: Clock }
          ].map(tab => {
            const IconComp = tab.icon;
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  isAct
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${isAct ? "text-blue-600 animate-pulse" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Actions and account placeholder */}
        <div className="flex items-center gap-3">
          {activeTab === "workspace" && (
            <button
              onClick={handleSaveProject}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 flex items-center gap-1 transition"
            >
              <Save className="w-3.5 h-3.5 text-gray-400" />
              保存参数
            </button>
          )}

          <div className="h-5 w-px bg-gray-200" />
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 text-xs font-bold shadow-inner">
              LD
            </div>
            <span className="text-xs font-bold text-gray-700 hidden md:block">巴迪高视觉中心</span>
          </div>
        </div>
      </header>

      {/* 2. BODY WORKSPACE LAYOUT PANELS */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Workspace router panels */}
        {activeTab === "workspace" && (
          <>
            {/* Left Parameters form */}
            <div className="w-[320px] shrink-0 h-full">
              <SidebarParams
                project={currentProject}
                onUpdateProject={handleUpdateProject}
                onOptimizePrompt={handleOptimizePrompt}
                isOptimizing={isOptimizing}
                onGenerate={handleGenerateBrandVisual}
                isGenerating={isGenerating}
                actualPromptPreviewEnglish={actualPromptPreviewEnglish}
                actualPromptPreviewChinese={actualPromptPreviewChinese}
                isPromptPreviewLoading={isPromptPreviewLoading}
              />
            </div>

            {/* Central Stage */}
            <CanvasArea
              currentTask={activeTask}
              project={currentProject}
              isGenerating={isGenerating}
              generatingProgress={generatingProgress}
              generationElapsedSeconds={generationElapsedSeconds}
              generatingLogs={generatingLogs}
              generationError={generationError}
              onOpenEditor={(imageUrl, originalUrl) => setEditingTarget({ imageUrl, originalUrl })}
              onRecreateSimilar={(url) => {
                alert("将参考此生成的构图进行类似重建...");
                handleOptimizePrompt();
              }}
              onSetAsReference={(url) => {
                const newRef: ReferenceImage = {
                  id: `ref-task-${Date.now()}`,
                  name: `来自生成成果的参考图`,
                  url: url,
                  weight: "medium"
                };
                handleUpdateProject({ referenceImages: [...currentProject.referenceImages.slice(0, 4), newRef] });
              }}
            />

            {/* Right details summary panel */}
            <div className="hidden lg:block">
              <TaskPanel
                project={currentProject}
                recentTasks={tasks.filter(t => t.projectId === currentProjectId)}
                onSelectTask={(task) => setActiveTaskId(task.taskId)}
                onDeleteTask={handleDeleteTask}
              />
            </div>
          </>
        )}

        {activeTab === "history" && (
          <div className="flex-1 overflow-y-auto">
            <HistoryPage
              tasks={tasks}
              projects={projects}
              onRestoreParams={handleRestoreTaskParams}
              onDeleteTask={handleDeleteTask}
              onPreviewTask={(task) => {
                setActiveTaskId(task.taskId);
                setActiveTab('workspace');
              }}
            />
          </div>
        )}

      </main>

      {/* 3. DYNAMIC MODALS OVERLAYS */}
      
      {/* 3.1 Local Image Mask Editor Modal */}
      {editingTarget && (
        <EditorModal
          imageUrl={editingTarget.imageUrl}
          originalUrl={editingTarget.originalUrl}
          versions={activeTask?.editVersions[editingTarget.originalUrl] || []}
          onClose={() => setEditingTarget(null)}
          onSaveEditedVersion={handleSaveEditedVersion}
        />
      )}

      {/* 3.2 Create New Project Modal */}
      {showNewProjModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border border-gray-100 shadow-2xl space-y-4 animate-scale-up text-xs text-gray-800">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              📁 创建巴迪高视觉项目 (New Project)
            </h3>
            <p className="text-gray-400">
              请为新一季的服饰、运动一次性内衣视觉设计建立独立的视觉生成沙盒。
            </p>
            <div className="space-y-2">
              <label className="font-semibold text-gray-700 block">生成项目名称</label>
              <input
                type="text"
                placeholder="例如：2026 夏季差旅高弹款 Lookbook"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowNewProjModal(false);
                  setNewProjName("");
                }}
                className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-xl font-bold transition"
              >
                创建并进入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.4 Manual parameter saved notification banner */}
      {showSavedNotification && (
        <div className="fixed top-24 right-6 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-green-500" />
          <span>当前视觉参数快照保存成功！已备份至本地存储。</span>
        </div>
      )}

    </div>
  );
}
