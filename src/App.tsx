import React, { useState, useEffect } from "react";
import { Project, Task, ImageAsset, ReferenceImage } from "./types";
import SidebarParams from "./components/SidebarParams";
import CanvasArea from "./components/CanvasArea";
import TaskPanel from "./components/TaskPanel";
import HistoryPage from "./components/HistoryPage";
import EditorModal from "./components/EditorModal";
import VideoModal from "./components/VideoModal";
import {
  getDefaultScene,
  getRecommendedTone,
  getSceneOptions,
  type AssetAnalysis,
  type PromptImageInput,
} from "./prompt-config/promptConfig";
import { hydrateProjectImages, serializeProjectsWithoutImagePayloads } from "./data/imageAssetStore";

import { PRODUCT_TEMPLATES, CHARACTER_TEMPLATES, REF_TEMPLATES } from "./data/mockAssets";
import { Sparkles, Calendar, BookOpen, Layers, Clock, ArrowLeftRight, Check, Play, Settings, Plus, Save, Compass, HelpCircle, User, ChevronDown } from "lucide-react";

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
    ...project.characterImages
      .filter((asset) => asset.url.startsWith("data:image/"))
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        role: "character_identity" as const,
        dataUrl: asset.url,
        weight: "high" as const,
      })),
    ...project.referenceImages
      .filter((asset) => asset.url.startsWith("data:image/"))
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        role: "style_reference" as const,
        dataUrl: asset.url,
        weight: asset.weight,
      })),
  ];
}

// Initial Demo Project and tasks to meet "演示项目" requirements
const DEMO_PROJECT: Project = {
  id: "proj-demo-summer-2026",
  name: "2026 夏季运动系列",
  createdAt: new Date().toISOString(),
  lastSavedAt: new Date().toISOString(),
  productImages: [
    {
      id: "prod-1",
      name: "巴迪高 舒雅蓝无缝高弹运动内衣",
      url: "https://images.unsplash.com/photo-1571945153237-4929e78394a9?q=80&w=600",
      isMain: true
    }
  ],
  characterImages: [
    {
      id: "char-1",
      name: "专业运动模特 (亚洲女性)",
      url: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=600"
    }
  ],
  referenceImages: [
    {
      id: "ref-1",
      name: "Lululemon 户外大片风格 (冷蓝色调)",
      url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600",
      weight: "high"
    }
  ],
  visualType: "B",
  scene: "居家柔弹与立体包裹",
  productFunctions: [],
  shotScale: "中景",
  cameraAngle: "平视",
  tone: "米色调",
  resolution: "2K",
  aspectRatio: "3:4",
  imageCount: 1,
  originalPrompt: "清晨自然光，真实自然的人物状态，高级运动杂志摄影质感，突出产品的版型、面料纹理和舒适感，保持人物形象与产品设计一致。",
  optimizedPrompt: "",
  negativePrompt: "",
  promptConfigVersion: "",
  selectedPromptFragments: [],
  promptWarnings: [],
  keepCharacter: true
};

const DEMO_TASK: Task = {
  projectId: "proj-demo-summer-2026",
  taskId: "task-demo-initial-shot",
  createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  productImages: ["https://images.unsplash.com/photo-1571945153237-4929e78394a9?q=80&w=600"],
  characterImages: ["https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=600"],
  keepCharacter: true,
  referenceImages: [{ url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600", weight: "high" }],
  visualType: "B",
  scene: "居家柔弹与立体包裹",
  productFunctions: [],
  shotScale: "中景",
  cameraAngle: "平视",
  tone: "米色调",
  resolution: "2K",
  aspectRatio: "3:4",
  imageCount: 1,
  originalPrompt: "清晨自然光，真实自然的人物状态，高级运动杂志摄影质感，突出产品的版型、面料纹理和舒适感，保持人物形象与产品设计一致。",
  optimizedPrompt: "[巴迪高商业摄影] B类生活纪实影调。模特置身于清晨海边漫步，海浪微风。金蓝色日光柔和勾勒出运动内衣的双缝明线与纯棉透气肌理，真实面部锁死，3:4 比例，2K 极致解析力。",
  finalPrompt: "[巴迪高商业摄影] B类生活纪实影调。模特置身于清晨海边漫步，海浪微风。金蓝色日光柔和勾勒出运动内衣的双缝明线与纯棉透气肌理，真实面部锁死，3:4 比例，2K 极致解析力。",
  negativePrompt: "",
  promptConfigVersion: "legacy-demo",
  selectedPromptFragments: [],
  promptWarnings: [],
  status: "completed",
  results: [
    "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=1200",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1200",
    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1200",
    "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?q=80&w=1200"
  ],
  editVersions: {},
  videos: {}
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
  const [generationError, setGenerationError] = useState("");

  // Editing Modals States
  const [editingImgUrl, setEditingImgUrl] = useState<string | null>(null);
  const [videoImgUrl, setVideoImgUrl] = useState<string | null>(null);

  // Status Alerts
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const savedProjects = localStorage.getItem("badigao_projects");
    const savedTasks = localStorage.getItem("badigao_tasks");
    const savedCurrentProj = localStorage.getItem("badigao_current_proj_id");
    const shouldMigrateDefaultCount = localStorage.getItem("badigao_default_image_count_v1") !== "done";

    if (savedProjects) {
      const parsedProjects: Project[] = JSON.parse(savedProjects);
      const normalizedProjects = parsedProjects.map((project) => {
        const sceneOptions = getSceneOptions(project.visualType);
        const hasValidScene = project.visualType === "C" || sceneOptions.some((option) => option.id === project.scene);
        const scene = hasValidScene ? project.scene : getDefaultScene(project.visualType);

        return {
          ...project,
          scene,
          imageCount: shouldMigrateDefaultCount ? 1 : project.imageCount,
          tone: hasValidScene ? project.tone : getRecommendedTone(project.visualType, scene),
          optimizedPrompt: "",
          optimizedPromptEnglish: "",
          negativePrompt: "",
          negativePromptEnglish: "",
          promptConfigVersion: "",
          selectedPromptFragments: [],
          promptWarnings: [],
        };
      });
      if (shouldMigrateDefaultCount) localStorage.setItem("badigao_default_image_count_v1", "done");
      setProjects(normalizedProjects);
      void hydrateProjectImages(normalizedProjects).then((hydratedProjects) => {
        setProjects(hydratedProjects);
        localStorage.setItem("badigao_projects", JSON.stringify(serializeProjectsWithoutImagePayloads(hydratedProjects)));
      });
    }
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks)
        .filter((t: any) => t.taskId !== "task-demo-initial-shot")
        .map((task: Task) => ({
          ...task,
          negativePrompt: task.negativePrompt || "",
          promptConfigVersion: task.promptConfigVersion || "legacy",
          selectedPromptFragments: task.selectedPromptFragments || [],
          promptWarnings: task.promptWarnings || [],
        }));
      setTasks(parsedTasks);
      if (parsedTasks.length > 0) {
        setActiveTaskId(parsedTasks[0].taskId);
      }
    }
    if (savedCurrentProj) setCurrentProjectId(savedCurrentProj);
  }, []);

  // Save to LocalStorage helper
  const saveStateToLocalStorage = (updatedProjs: Project[], updatedTasks: Task[]) => {
    localStorage.setItem("badigao_projects", JSON.stringify(serializeProjectsWithoutImagePayloads(updatedProjs)));
    localStorage.setItem("badigao_tasks", JSON.stringify(updatedTasks));
    localStorage.setItem("badigao_current_proj_id", currentProjectId);
  };

  const currentProject = projects.find(p => p.id === currentProjectId) || projects[0] || DEMO_PROJECT;

  // Update current project parameters
  const handleUpdateProject = (updates: Partial<Project>) => {
    const updated = projects.map(p => {
      if (p.id === currentProjectId) {
        const shouldInvalidatePrompt = !("optimizedPrompt" in updates);
        return {
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
      }
      return p;
    });
    setProjects(updated);
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
      referenceImages: [],
      visualType: "A",
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
          scene: currentProject.scene,
          productFunctions: currentProject.productFunctions,
          shotScale: currentProject.shotScale,
          cameraAngle: currentProject.cameraAngle,
          tone: currentProject.tone,
          originalPrompt: currentProject.originalPrompt,
          resolution: currentProject.resolution,
          aspectRatio: currentProject.aspectRatio,
          imageCount: currentProject.imageCount,
          productImages: currentProject.productImages.map(p => p.name || "巴迪高核心主图"),
          characterImages: currentProject.characterImages.map(c => c.name || "参考人物形象"),
          referenceImages: currentProject.referenceImages.map(r => r.name || "参考风格图"),
          referenceImageWeights: currentProject.referenceImages.map(r => ({
            name: r.name || "参考风格图",
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
            role: "character_identity",
            analysis: analysisById.get(asset.id) || asset.analysis,
          })),
          referenceImages: currentProject.referenceImages.map((asset) => ({
            ...asset,
            role: "style_reference",
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
    setGenerationError("");
    setIsGenerating(true);
    setGeneratingProgress(12);
    setGeneratingLogs(["正在连接 Gemini 图片生成模型...", "正在安全上传参考图并应用图片角色约束..."]);

    try {
      const response = await fetch("/api/gemini/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualType: currentProject.visualType,
          scene: currentProject.scene,
          productFunctions: currentProject.productFunctions,
          shotScale: currentProject.shotScale,
          cameraAngle: currentProject.cameraAngle,
          tone: currentProject.tone,
          originalPrompt: currentProject.originalPrompt,
          resolution: currentProject.resolution,
          aspectRatio: currentProject.aspectRatio,
          imageCount: currentProject.imageCount,
          productImages: currentProject.productImages.map((item) => item.name),
          characterImages: currentProject.characterImages.map((item) => item.name),
          referenceImages: currentProject.referenceImages.map((item) => item.name),
          prompt: currentProject.optimizedPromptEnglish || currentProject.optimizedPrompt || currentProject.originalPrompt,
          negativePrompt: currentProject.negativePromptEnglish || currentProject.negativePrompt,
          assets: getPromptAssets(currentProject),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "真实生图失败，请稍后重试。");
      const generatedUrls = Array.isArray(data.results) ? data.results.map(String) : [];
      if (generatedUrls.length === 0) throw new Error("模型未返回图片结果。");

      setGeneratingProgress(100);
      setGeneratingLogs((prev) => [...prev, `已由 ${data.model || "GPT Image"} 完成 ${generatedUrls.length} 张图片。`]);

      const newTask: Task = {
          projectId: currentProjectId,
          taskId: `task-${Date.now()}`,
          createdAt: new Date().toISOString(),
          productImages: currentProject.productImages.map(p => p.url),
          characterImages: currentProject.characterImages.map(p => p.url),
          keepCharacter: currentProject.keepCharacter,
          referenceImages: currentProject.referenceImages.map(r => ({ url: r.url, weight: r.weight })),
          visualType: currentProject.visualType,
          scene: currentProject.scene,
          productFunctions: currentProject.productFunctions,
          shotScale: currentProject.shotScale,
          cameraAngle: currentProject.cameraAngle,
          tone: currentProject.tone,
          resolution: currentProject.resolution,
          aspectRatio: currentProject.aspectRatio,
          imageCount: currentProject.imageCount,
          originalPrompt: currentProject.originalPrompt,
          optimizedPrompt: currentProject.optimizedPrompt || currentProject.originalPrompt,
          optimizedPromptEnglish: currentProject.optimizedPromptEnglish,
          finalPrompt: currentProject.optimizedPrompt || currentProject.originalPrompt,
          negativePrompt: currentProject.negativePrompt || "",
          negativePromptEnglish: currentProject.negativePromptEnglish,
          promptConfigVersion: currentProject.promptConfigVersion || "",
          selectedPromptFragments: currentProject.selectedPromptFragments || [],
          promptWarnings: currentProject.promptWarnings || [],
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
      setGenerationError(error instanceof Error ? error.message : "真实生图失败，请稍后重试。");
      setGeneratingLogs((prev) => [...prev, "生图未完成，请检查 Gemini API 配置、模型权限或账户额度。"]);
      alert(error instanceof Error ? error.message : "真实生图失败，请稍后重试。");
      setIsGenerating(false);
    }
  };

  // Restore task parameters straight back to project work state
  const handleRestoreTaskParams = (task: Task) => {
    handleUpdateProject({
      visualType: task.visualType,
      scene: task.scene,
      productFunctions: task.productFunctions,
      shotScale: task.shotScale,
      cameraAngle: task.cameraAngle,
      tone: task.tone,
      resolution: task.resolution,
      aspectRatio: task.aspectRatio,
      imageCount: task.imageCount,
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
    setEditingImgUrl(null);
    saveStateToLocalStorage(projects, updated);
  };

  // Canvas Image Video Gen Callback: Save converted video definitions
  const handleSaveVideo = (imageUrl: string, videoUrl: string, motion: string, duration: number, strength: string) => {
    const updated = tasks.map(task => {
      if (task.taskId === activeTaskId) {
        const currentVideos = task.videos[imageUrl] || [];
        return {
          ...task,
          videos: {
            ...task.videos,
            [imageUrl]: [...currentVideos, { url: videoUrl, motion, duration, strength }]
          }
        };
      }
      return task;
    });
    setTasks(updated);
    setVideoImgUrl(null);
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
              />
            </div>

            {/* Central Stage */}
            <CanvasArea
              currentTask={activeTask}
              project={currentProject}
              isGenerating={isGenerating}
              generatingProgress={generatingProgress}
              generatingLogs={generatingLogs}
              generationError={generationError}
              onOpenEditor={(url) => setEditingImgUrl(url)}
              onOpenVideo={(url) => setVideoImgUrl(url)}
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
      {editingImgUrl && (
        <EditorModal
          imageUrl={editingImgUrl}
          onClose={() => setEditingImgUrl(null)}
          onSaveEditedVersion={handleSaveEditedVersion}
        />
      )}

      {/* 3.2 Video motion generator modal */}
      {videoImgUrl && (
        <VideoModal
          imageUrl={videoImgUrl}
          onClose={() => setVideoImgUrl(null)}
          onSaveVideo={handleSaveVideo}
        />
      )}

      {/* 3.3 Create New Project Modal */}
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
