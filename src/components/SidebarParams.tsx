import React, { useRef } from "react";
import { Project, ImageAsset, ReferenceImage, Task, type ModeWorkspace } from "../types";
import { Upload, X, Star, Sparkles, AlertCircle, Info, ChevronDown, ChevronUp, RefreshCw, Trash, Copy, Check } from "lucide-react";
import {
  ASPECT_RATIO_OPTIONS,
  CAMERA_ANGLE_OPTIONS,
  getDefaultScene,
  getRecommendedTone,
  getSceneOptions,
  IMAGE_COUNT_OPTIONS,
  RESOLUTION_OPTIONS,
  REPLACEMENT_MODE_OPTIONS,
  SELLING_POINT_OPTIONS,
  SHOT_SCALE_OPTIONS,
  TONE_OPTIONS,
  VISUAL_TYPE_OPTIONS,
  type ReplacementModeId,
  type VisualTypeId,
} from "../prompt-config/promptConfig";
import { prepareImageForReference } from "../data/imagePreparation";
import { deleteImageData, saveImageData } from "../data/imageAssetStore";
import CustomSelect from "./CustomSelect";


interface SidebarParamsProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
  onOptimizePrompt: () => void;
  isOptimizing: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  actualPromptPreviewEnglish: string;
  actualPromptPreviewChinese: string;
  isPromptPreviewLoading: boolean;
}

type ReplacementReferenceCategory = NonNullable<ReferenceImage["replacementCategory"]>;

export default function SidebarParams({
  project,
  onUpdateProject,
  onOptimizePrompt,
  isOptimizing,
  onGenerate,
  isGenerating,
  actualPromptPreviewEnglish,
  actualPromptPreviewChinese,
  isPromptPreviewLoading,
}: SidebarParamsProps) {
  // Collapsible section state
  const [collapsed, setCollapsed] = React.useState<{ [key: string]: boolean }>({
    upload: false,
    visualType: false,
    cameraShot: false,
    dimensions: false,
    prompt: false
  });

  const modelCount = project.modelCount;
  const [copiedPrompt, setCopiedPrompt] = React.useState<"positive" | "negative" | "actual" | null>(null);
  const mainMode = project.workspaceMode || (project.visualType === "R" ? "replacement" : "creative");
  const [sceneInputMode, setSceneInputMode] = React.useState<"preset" | "reference">(
    project.referenceImages.some((image) => image.replacementCategory === "scene") ? "reference" : "preset"
  );
  const activeUploadIndexRef = useRef<number>(0);

  const copyPrompt = async (text: string, type: "positive" | "negative" | "actual") => {
    await navigator.clipboard.writeText(text);
    setCopiedPrompt(type);
    window.setTimeout(() => setCopiedPrompt(null), 1600);
  };

  React.useEffect(() => {
    if (project.modelSource === "custom" && project.characterImages.length > project.modelCount) {
      onUpdateProject({ characterImages: project.characterImages.slice(0, project.modelCount) });
    }
  }, [project.characterImages, project.modelCount, onUpdateProject]);

  const handleModelCountChange = (count: number) => {
    onUpdateProject({
      modelCount: count,
      modelSource: count === 0 ? "none" : project.characterImages.some((image) => image.url) ? "custom" : "default",
      characterImages: project.characterImages.slice(0, count),
    });
  };

  const toggleCollapse = (section: string) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Helper file uploader refs
  const productInputRef = useRef<HTMLInputElement>(null);
  const characterInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const activeReferenceCategoryRef = useRef<ReplacementReferenceCategory | undefined>(undefined);

  const processFile = async (file: File, type: 'product' | 'character' | 'reference') => {
    try {
      const prepared = await prepareImageForReference(file);
      if (type === 'product') {
        const isMain = project.productImages.length === 0;
        const id = `prod-upload-${Date.now()}`;
        const storageKey = `image-${id}`;
        await saveImageData(storageKey, prepared.dataUrl);
        const newAsset: ImageAsset = {
          id,
          name: file.name,
          url: prepared.dataUrl,
          isMain,
          role: isMain ? "product_master" : "product_detail",
          mimeType: prepared.mimeType,
          width: prepared.width,
          height: prepared.height,
          originalBytes: prepared.originalBytes,
          storageKey,
        };
        onUpdateProject({ productImages: [...project.productImages, newAsset] });
      } else if (type === 'character') {
        const id = `char-upload-${Date.now()}`;
        const storageKey = `image-${id}`;
        await saveImageData(storageKey, prepared.dataUrl);
        const newAsset: ImageAsset = {
          id,
          name: file.name,
          url: prepared.dataUrl,
          role: "character_identity",
          mimeType: prepared.mimeType,
          width: prepared.width,
          height: prepared.height,
          originalBytes: prepared.originalBytes,
          storageKey,
        };

        const targetIndex = activeUploadIndexRef.current;
        const updatedImages = [...project.characterImages];
        while (updatedImages.length <= targetIndex) {
          updatedImages.push({
            id: `char-placeholder-${Date.now()}-${updatedImages.length}`,
            name: "未上传",
            url: ""
          });
        }
        updatedImages[targetIndex] = newAsset;
        onUpdateProject({ characterImages: updatedImages, modelSource: "custom", modelCount: Math.max(project.modelCount, targetIndex + 1) });
      } else if (type === 'reference') {
        if (project.referenceImages.length >= 5) {
          alert("最多只能上传5张参考图。");
          return;
        }
        const id = `ref-upload-${Date.now()}`;
        const storageKey = `image-${id}`;
        await saveImageData(storageKey, prepared.dataUrl);
        const newAsset: ReferenceImage = {
          id,
          name: file.name,
          url: prepared.dataUrl,
          weight: "medium",
          role: project.visualType === "R" ? "replacement_reference" : "style_reference",
          replacementCategory: project.visualType === "R" ? activeReferenceCategoryRef.current : undefined,
          mimeType: prepared.mimeType,
          width: prepared.width,
          height: prepared.height,
          originalBytes: prepared.originalBytes,
          storageKey,
        };
        onUpdateProject({ referenceImages: [...project.referenceImages, newAsset] });
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : `${type}图处理失败。`);
    }
  };

  const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processFile(e.target.files[0], 'product');
    e.target.value = "";
  };

  const handleCharacterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processFile(e.target.files[0], 'character');
    e.target.value = "";
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processFile(e.target.files[0], 'reference');
    e.target.value = "";
  };

  const handleDeleteCharacter = (index: number) => {
    const updatedImages = [...project.characterImages];
    if (index < updatedImages.length) {
      void deleteImageData(updatedImages[index]?.storageKey);
      updatedImages[index] = {
        id: `char-placeholder-${Date.now()}-${index}`,
        name: "未上传",
        url: ""
      };
      
      while (updatedImages.length > 0 && !updatedImages[updatedImages.length - 1].url) {
        updatedImages.pop();
      }
      
      onUpdateProject({ characterImages: updatedImages });
    }
  };

  const handlePaste = (e: React.ClipboardEvent, type: 'product' | 'character' | 'reference') => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file, type);
          break;
        }
      }
    }
  };



  // Switch visual type and reset sub-choices
  const handleVisualTypeChange = (type: VisualTypeId) => {
    const scene = getDefaultScene(type);
    onUpdateProject({
      visualType: type,
      scene,
      tone: getRecommendedTone(type, scene),
      productFunctions: type === 'C' ? ["透气", "亲肤柔软不扎"] : [],
      replacementMode: type === "R" ? (project.replacementMode || "服装+场景替换") : project.replacementMode,
      referenceImages: project.referenceImages.map((asset) => ({
        ...asset,
        role: type === "R" ? "replacement_reference" : "style_reference",
        analysis: asset.analysis?.role === (type === "R" ? "replacement_reference" : "style_reference")
          ? asset.analysis
          : undefined,
      })),
    });
  };

  // Multi-select technology features for Type C
  const handleToggleProductFunction = (func: string) => {
    const current = [...project.productFunctions];
    let updated;
    if (current.includes(func)) {
      updated = current.filter(f => f !== func);
    } else {
      updated = [...current, func];
    }
    onUpdateProject({ productFunctions: updated });
  };

  const sceneOptions = getSceneOptions(project.visualType);
  const modelSource = project.modelSource || (project.modelCount === 0 ? "none" : project.characterImages.some((image) => image.url) ? "custom" : "default");
  const replacementWorkflow = project.replacementWorkflow || "multi_replace";
  const hasReferenceCategory = (category: ReplacementReferenceCategory) => project.referenceImages.some((image) => image.replacementCategory === category);
  const replacementWorkflowReady = replacementWorkflow === "pose_rebuild"
    ? project.characterImages.some((image) => image.url) && hasReferenceCategory("action") && (sceneInputMode === "preset" || hasReferenceCategory("scene"))
    : replacementWorkflow === "product_only"
    ? hasReferenceCategory("scene")
    : hasReferenceCategory("composition");

  const captureCurrentWorkspace = (): ModeWorkspace => ({
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
  });

  const createEmptyWorkspace = (mode: "creative" | "replacement"): ModeWorkspace => {
    const visualType: VisualTypeId = mode === "replacement" ? "R" : "A";
    return {
      productImages: [], characterImages: [], modelCount: 1, modelSource: "default", referenceImages: [],
      visualType, replacementMode: "服装+场景替换", replacementWorkflow: "multi_replace", scene: getDefaultScene(visualType), productFunctions: [],
      shotScale: "中景", cameraAngle: "平视", originalPrompt: "", keepCharacter: true,
    };
  };

  const switchWorkspaceMode = (targetMode: "creative" | "replacement") => {
    if (targetMode === mainMode) return;
    const currentWorkspace = captureCurrentWorkspace();
    const targetWorkspace = targetMode === "creative"
      ? (project.creativeWorkspace || createEmptyWorkspace("creative"))
      : (project.replacementWorkspace || createEmptyWorkspace("replacement"));
    onUpdateProject({
      workspaceMode: targetMode,
      ...(mainMode === "creative" ? { creativeWorkspace: currentWorkspace } : { replacementWorkspace: currentWorkspace }),
      ...targetWorkspace,
    });
  };

  const openReplacementUpload = (category: ReplacementReferenceCategory) => {
    activeReferenceCategoryRef.current = category;
    if (category === "scene") {
      setSceneInputMode("reference");
      onUpdateProject({ replacementMode: "服装+场景替换" });
    }
    if (category === "upper_garment" || category === "lower_garment") {
      onUpdateProject({ replacementMode: "服装替换" });
    }
    referenceInputRef.current?.click();
  };

  const replacementUploadCard = (category: ReplacementReferenceCategory, label: string, hint: string, embedded = false) => {
    const images = project.referenceImages.filter((image) => image.replacementCategory === category);
    return (
      <div className={`${embedded ? "bg-transparent p-2" : "rounded-xl border border-slate-200 bg-white p-3"} space-y-2`}>
        <div className="flex items-start justify-between gap-2">
          <div><p className="text-[11px] font-bold text-slate-800">{label}</p><p className="mt-0.5 text-[9px] leading-relaxed text-slate-400">{hint}</p></div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-500">{images.length} 张</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {images.map((image) => (
            <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
              <img src={image.url} alt={label} className="h-full w-full object-cover" />
              <button type="button" onClick={() => { void deleteImageData(image.storageKey); onUpdateProject({ referenceImages: project.referenceImages.filter((item) => item.id !== image.id) }); }} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <button type="button" onClick={() => openReplacementUpload(category)} className="aspect-square rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-blue-500 hover:text-blue-600 flex flex-col items-center justify-center"><Upload className="h-4 w-4" /><span className="mt-1 text-[9px]">上传</span></button>
        </div>
      </div>
    );
  };

  return (
    <div id="sidebar-params" className="flex flex-col h-full bg-white border-r border-gray-100 shadow-sm overflow-hidden text-gray-800">

      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1.5">
          <button type="button" onClick={() => switchWorkspaceMode("creative")} className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${mainMode === "creative" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>创意模式</button>
          <button type="button" onClick={() => switchWorkspaceMode("replacement")} className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${mainMode === "replacement" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>替换模式</button>
        </div>
      </div>

      {/* Main Parameters Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 select-none">

        {mainMode === "replacement" && (
          <div className="space-y-5 animate-fade-in">
            <div><p className="text-xs font-bold text-slate-900">替换模式素材板</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">按用途分别上传参考图，清楚区分场景、服装、构图和动作。</p></div>

            <section className="space-y-2">
              <p className="text-[11px] font-bold text-slate-700">选择替换工作流</p>
              <div className="space-y-2">
                {([
                  { id: "pose_rebuild", index: "01", label: "姿势锁定重构", description: "保留模特姿势，替换人物、场景和产品" },
                  { id: "product_only", index: "02", label: "原图单品替换", description: "保持原场景与人物不变，只替换产品" },
                  { id: "multi_replace", index: "03", label: "多要素精确替换", description: "分别控制人物、服装、动作、构图和场景" },
                ] as const).map((workflow) => (
                  <button key={workflow.id} type="button" onClick={() => onUpdateProject({ replacementWorkflow: workflow.id, replacementMode: workflow.id === "product_only" ? "产品替换" : workflow.id === "pose_rebuild" ? "服装+场景替换" : project.replacementMode, ...(workflow.id === "pose_rebuild" ? { modelSource: "custom" as const, modelCount: Math.max(1, project.modelCount) } : workflow.id === "product_only" ? { modelSource: "default" as const, modelCount: 1 } : {}) })} className={`w-full rounded-xl border p-3 text-left transition ${replacementWorkflow === workflow.id ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200"}`}>
                    <span className="flex items-start gap-2"><span className={`mt-0.5 text-[9px] font-mono font-bold ${replacementWorkflow === workflow.id ? "text-blue-600" : "text-slate-400"}`}>{workflow.index}</span><span><span className="block text-[11px] font-bold text-slate-800">{workflow.label}</span><span className="mt-0.5 block text-[9px] leading-relaxed text-slate-400">{workflow.description}</span></span></span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-xs font-bold text-blue-950">产品图 <span className="text-red-500">*</span></h3><span className="text-[9px] text-blue-500">产品外观最高优先级</span></div>
              <div className="grid grid-cols-4 gap-2">
                {project.productImages.map((image) => (
                  <div key={image.id} className={`relative aspect-square overflow-hidden rounded-lg border ${image.isMain ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"}`}>
                    <img src={image.url} alt="产品图" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        void deleteImageData(image.storageKey);
                        const remaining = project.productImages.filter((item) => item.id !== image.id);
                        const normalized = remaining.map((item, index) => ({
                          ...item,
                          isMain: image.isMain ? index === 0 : item.isMain,
                          role: image.isMain ? (index === 0 ? "product_master" as const : "product_detail" as const) : item.role,
                        }));
                        onUpdateProject({ productImages: normalized });
                      }}
                      className="absolute right-1 top-1 z-10 rounded-full bg-black/65 p-1 text-white shadow-sm transition hover:bg-red-500"
                      aria-label={`删除产品图 ${image.name}`}
                      title="删除产品图"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => productInputRef.current?.click()} className="aspect-square rounded-lg border border-dashed border-blue-200 bg-white text-blue-500 flex flex-col items-center justify-center"><Upload className="h-4 w-4" /><span className="mt-1 text-[9px]">上传产品</span></button>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">1</span><h3 className="text-xs font-bold text-slate-900">{replacementWorkflow === "product_only" ? "原场景锁定" : "场景替换"}</h3></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
                {replacementWorkflow === "product_only" ? replacementUploadCard("scene", "上传原场景图", "原人物、构图、光影和环境均保持不变，仅替换产品", true) : <>
                <div className="grid grid-cols-2 rounded-lg bg-slate-200/70 p-1">
                  <button type="button" onClick={() => setSceneInputMode("preset")} className={`rounded-md py-1.5 text-[10px] font-bold ${sceneInputMode === "preset" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>预设场景</button>
                  <button type="button" onClick={() => setSceneInputMode("reference")} className={`rounded-md py-1.5 text-[10px] font-bold ${sceneInputMode === "reference" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>场景参考图</button>
                </div>
                {sceneInputMode === "preset" ? (
                  <div className="grid grid-cols-2 gap-2">{sceneOptions.map((sceneOption) => <button key={sceneOption.id} type="button" onClick={() => onUpdateProject({ scene: sceneOption.id, tone: sceneOption.recommendedTone || project.tone, replacementMode: "服装+场景替换" })} className={`rounded-lg border px-2 py-2 text-[10px] font-semibold ${project.scene === sceneOption.id ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{sceneOption.label}</button>)}</div>
                ) : replacementUploadCard("scene", "上传场景参考图", "参考环境、空间关系与场景内容", true)}</>}
              </div>
            </section>

            {replacementWorkflow === "multi_replace" && <section className="space-y-3">
              <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">2</span><h3 className="text-xs font-bold text-slate-900">服装替换</h3></div>
              <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-2">
                <div className="grid grid-cols-2 divide-x divide-violet-100">
                  {replacementUploadCard("upper_garment", "上身服装", "上衣、背心等", true)}
                  {replacementUploadCard("lower_garment", "下身服装", "内裤、裤装等", true)}
                </div>
              </div>
              <p className="text-[9px] leading-relaxed text-slate-400">上传任一服装参考图后，将自动按服装替换规则生成。</p>
            </section>}

            {replacementWorkflow !== "product_only" && <section className="space-y-3">
              <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">3</span><h3 className="text-xs font-bold text-slate-900">模特形象替换</h3></div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-3">
                {replacementWorkflow === "multi_replace" && <div className="grid grid-cols-3 gap-1 rounded-lg bg-amber-100/70 p-1">
                  {([
                    { id: "none", label: "无人" },
                    { id: "default", label: "默认模特" },
                    { id: "custom", label: "指定模特" },
                  ] as const).map((option) => (
                    <button key={option.id} type="button" onClick={() => onUpdateProject({ modelSource: option.id, modelCount: option.id === "none" ? 0 : Math.max(1, project.modelCount) })} className={`rounded-md px-1 py-2 text-[9px] font-bold transition ${modelSource === option.id ? "bg-white text-amber-800 shadow-sm" : "text-amber-700/60 hover:text-amber-800"}`}>{option.label}</button>
                  ))}
                </div>}
                {modelSource === "none" && <p className="rounded-lg bg-white px-3 py-2 text-[9px] leading-relaxed text-slate-500">生成严格无人画面，不出现人物、手、脸、人体局部、人物倒影或人形模特。</p>}
                {modelSource === "default" && <p className="rounded-lg bg-white px-3 py-2 text-[9px] leading-relaxed text-slate-500">不携带人物参考图，使用巴迪高默认成年亚洲模特规范。</p>}
                {modelSource === "custom" && <>
                  <div className="flex items-start justify-between"><div><p className="text-[11px] font-bold text-slate-800">模特形象图</p><p className="mt-0.5 text-[9px] text-slate-400">锁定成年模特的面部、发型与人物身份</p></div><span className="rounded-full bg-white px-2 py-0.5 text-[9px] text-amber-700">{project.characterImages.filter((image) => image.url).length} 张</span></div>
                  <div className="grid grid-cols-4 gap-2">
                    {project.characterImages.filter((image) => image.url).map((image, index) => <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg border border-amber-200"><img src={image.url} alt="模特形象" className="h-full w-full object-cover" /><button type="button" onClick={() => handleDeleteCharacter(index)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"><X className="h-3 w-3" /></button></div>)}
                    <button type="button" onClick={() => { activeUploadIndexRef.current = project.characterImages.filter((image) => image.url).length; if (project.modelCount <= activeUploadIndexRef.current) onUpdateProject({ modelCount: activeUploadIndexRef.current + 1, modelSource: "custom" }); characterInputRef.current?.click(); }} className="aspect-square rounded-lg border border-dashed border-amber-300 bg-white text-amber-600 flex flex-col items-center justify-center"><Upload className="h-4 w-4" /><span className="mt-1 text-[9px]">上传模特</span></button>
                  </div>
                </>}
              </div>
            </section>}

            {replacementWorkflow === "pose_rebuild" && <section>{replacementUploadCard("action", "姿势参考图", "只锁定人物姿势、肢体角度、重心和动作状态")}</section>}
            {replacementWorkflow === "multi_replace" && <section className="space-y-3">
              {replacementUploadCard("composition", "构图参考图", "锁定机位、景别、裁切、主体位置和留白")}
              {replacementUploadCard("action", "动作参考图", "锁定人物姿势、肢体角度和动作状态")}
            </section>}

            <input type="file" ref={productInputRef} onChange={handleProductUpload} accept="image/*" className="hidden" />
            <input type="file" ref={characterInputRef} onChange={handleCharacterUpload} accept="image/*" className="hidden" />
            <input type="file" ref={referenceInputRef} onChange={handleReferenceUpload} accept="image/*" className="hidden" />
          </div>
        )}
        
        {/* SECTION 1: MATERIALS UPLOAD */}
        <div className={`${mainMode === "replacement" ? "hidden" : ""} border-b border-gray-100 pb-5 space-y-4`}>
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleCollapse('upload')}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              📁 1. 核心摄影素材
            </h3>
            {collapsed.upload ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
          </div>

          {!collapsed.upload && (
            <div className="space-y-4 animate-fade-in text-xs">
              
              {/* Product Images Block (Mandatory) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">产品图 <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-gray-400">支持正面/细节 · 未上传不可生成</span>
                </div>
                
                {/* Product preview thumbnails */}
                <div className="grid grid-cols-4 gap-2">
                  {project.productImages.map((img) => (
                    <div key={img.id} className={`relative aspect-square rounded-lg overflow-hidden border ${img.isMain ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'}`}>
                      {img.url && <img src={img.url} alt="Product" referrerPolicy="no-referrer" className="w-full h-full object-cover" />}
                      <button
                        onClick={() => {
                          void deleteImageData(img.storageKey);
                          const remaining = project.productImages.filter(p => p.id !== img.id);
                          const normalized = remaining.map((item, index) => ({
                            ...item,
                            isMain: img.isMain ? index === 0 : item.isMain,
                            role: img.isMain ? (index === 0 ? "product_master" as const : "product_detail" as const) : item.role,
                          }));
                          onUpdateProject({ productImages: normalized });
                        }}
                        className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {/* Main tag */}
                      <button
                        onClick={() => onUpdateProject({ productImages: project.productImages.map(p => ({
                          ...p,
                          isMain: p.id === img.id,
                          role: p.id === img.id ? "product_master" : "product_detail",
                        })) })}
                        className="absolute bottom-0 inset-x-0 py-0.5 bg-black/40 text-[9px] text-white text-center font-bold"
                      >
                        {img.isMain ? "主图" : "设为主图"}
                      </button>
                      {img.analysis && (
                        <span className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[7px] font-bold text-white ${img.analysis.status === "analyzed" ? "bg-emerald-600" : "bg-amber-500"}`}>
                          {img.analysis.status === "analyzed" ? "已识别" : "待识别"}
                        </span>
                      )}
                    </div>
                  ))}
                  
                  {/* Upload button */}
                  <button
                    onClick={() => productInputRef.current?.click()}
                    onPaste={(e) => handlePaste(e, 'product')}
                    className="aspect-square border border-dashed border-gray-200 hover:border-blue-500 rounded-lg flex flex-col items-center justify-center bg-gray-50 text-gray-400 hover:text-blue-500 transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-[9px] mt-1">本地上传</span>
                  </button>
                  <input type="file" ref={productInputRef} onChange={handleProductUpload} accept="image/*" className="hidden" />
                </div>


              </div>

              {/* Character Images Block (Optional) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">人物形象图 <span className="text-gray-400 font-normal">(选填)</span></span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">模特数量:</span>
                    <CustomSelect
                      value={String(modelCount)}
                      onChange={(value) => handleModelCountChange(Number(value))}
                      ariaLabel="选择模特数量"
                      className="w-[70px]"
                      buttonClassName="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700"
                      menuClassName="min-w-[110px]"
                      options={[0, 1, 2, 3, 4].map((count) => ({ value: String(count), label: `${count} 人` }))}
                    />
                  </div>
                </div>

                {modelCount === 0 ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-[10px] leading-relaxed text-blue-700">
                    无人物模式：不使用人物形象，主要依据产品图、风格图和所选场景完成创意产品摄影。
                  </div>
                ) : <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: modelCount }).map((_, index) => {
                    const img = project.characterImages[index];
                    const hasImage = img && img.url;

                    if (hasImage) {
                      return (
                        <div key={img.id || index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                          <img src={img.url} alt={`Character ${index + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleDeleteCharacter(index)}
                            className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black transition z-10"
                            title={`删除 模特 ${index + 1}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 py-0.5 bg-black/40 text-[9px] text-white text-center font-bold truncate">
                            模特 {index + 1}
                          </div>
                          {img.analysis && (
                            <span className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[7px] font-bold text-white ${img.analysis.status === "analyzed" ? "bg-emerald-600" : "bg-amber-500"}`}>
                              {img.analysis.status === "analyzed" ? "已识别" : "待识别"}
                            </span>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <button
                          key={`empty-${index}`}
                          onClick={() => {
                            activeUploadIndexRef.current = index;
                            characterInputRef.current?.click();
                          }}
                          onPaste={(e) => {
                            activeUploadIndexRef.current = index;
                            handlePaste(e, 'character');
                          }}
                          className="aspect-square border border-dashed border-gray-200 hover:border-blue-500 rounded-lg flex flex-col items-center justify-center bg-gray-50 text-gray-400 hover:text-blue-500 transition"
                          title={`上传 模特 ${index + 1}`}
                        >
                          <Upload className="w-4 h-4" />
                          <span className="text-[9px] mt-1 font-medium">上传模特 {index + 1}</span>
                        </button>
                      );
                    }
                  })}
                  <input type="file" ref={characterInputRef} onChange={handleCharacterUpload} accept="image/*" className="hidden" />
                </div>}


              </div>

              {/* Reference Style Images (Max 5, weight selection) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">
                    {project.visualType === "R" ? "替换参考图" : "参考风格图"}
                    <span className="text-gray-400 font-normal">({project.visualType === "R" ? "必填" : "选填"}, 最多5张)</span>
                  </span>
                  <span className="text-[10px] text-gray-400">{project.visualType === "R" ? "精确复刻姿势、动作、视角、构图" : "控制光影、构图与影调"}</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {project.referenceImages.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                      {img.url && <img src={img.url} alt="Reference" referrerPolicy="no-referrer" className="w-full h-full object-cover" />}
                      
                      <button
                        onClick={() => {
                          void deleteImageData(img.storageKey);
                          onUpdateProject({ referenceImages: project.referenceImages.filter(p => p.id !== img.id) });
                        }}
                        className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black transition z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      <CustomSelect
                        value={img.weight}
                        onChange={(value) => {
                          const weight = value as ReferenceImage["weight"];
                          onUpdateProject({
                            referenceImages: project.referenceImages.map(r => r.id === img.id ? { ...r, weight } : r)
                          });
                        }}
                        ariaLabel={`${img.name}参考权重`}
                        className="absolute bottom-0 inset-x-0"
                        buttonClassName="h-5 rounded-none border-0 bg-blue-600 px-1 text-[8px] font-bold text-white hover:bg-blue-700"
                        menuClassName="min-w-[130px]"
                        options={[
                          { value: "low", label: "权重：低", description: "轻度参考" },
                          { value: "medium", label: "权重：中", description: "明显参考" },
                          { value: "high", label: "权重：高", description: "强参考" },
                        ]}
                      />
                      {img.analysis && (
                        <span className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[7px] font-bold text-white ${img.analysis.status === "analyzed" ? "bg-emerald-600" : "bg-amber-500"}`}>
                          {img.analysis.status === "analyzed" ? "已识别" : "待识别"}
                        </span>
                      )}
                    </div>
                  ))}

                  {project.referenceImages.length < 5 && (
                    <button
                      onClick={() => referenceInputRef.current?.click()}
                      onPaste={(e) => handlePaste(e, 'reference')}
                      className="aspect-square border border-dashed border-gray-200 hover:border-blue-500 rounded-lg flex flex-col items-center justify-center bg-gray-50 text-gray-400 hover:text-blue-500 transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-[9px] mt-1">上传参考</span>
                    </button>
                  )}
                  <input type="file" ref={referenceInputRef} onChange={handleReferenceUpload} accept="image/*" className="hidden" />
                </div>


              </div>

            </div>
          )}
        </div>

        {/* SECTION 2: VISUAL TYPE */}
        <div className={`${mainMode === "replacement" ? "hidden" : ""} border-b border-gray-100 pb-5 space-y-4`}>
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleCollapse('visualType')}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              🖼 2. 视觉主调方案
            </h3>
            {collapsed.visualType ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
          </div>

          {!collapsed.visualType && (
            <div className="space-y-4 animate-fade-in text-xs">

              {/* === 创意模式内容 (A / B / C) === */}
              {mainMode === "creative" && (
                <div className="space-y-4">
                  {/* Type A, B, C cards */}
                  <div className="grid grid-cols-3 gap-2">
                    {VISUAL_TYPE_OPTIONS.filter(t => t.id !== "R").map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleVisualTypeChange(type.id as VisualTypeId)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                          project.visualType === type.id
                            ? "border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm"
                            : "border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-600"
                        }`}
                      >
                        <span className="font-bold text-xs">{type.label}</span>
                        <span className="text-[9px] text-gray-400 mt-1 leading-normal">{type.description}</span>
                      </button>
                    ))}
                  </div>

                  {/* Sub option block (A Scenarios / B Scenarios / C features list) */}
                  {project.visualType !== 'C' ? (
                    <div className="space-y-2">
                      <label className="font-semibold text-gray-700 block">选择单选场景</label>
                      <div className="grid grid-cols-2 gap-2">
                        {sceneOptions.map((sceneOption) => (
                          <button
                            key={sceneOption.id}
                            onClick={() => onUpdateProject({
                              scene: sceneOption.id,
                              tone: sceneOption.recommendedTone || project.tone,
                            })}
                            className={`px-3 py-2 text-center rounded-xl border font-semibold transition ${
                              project.scene === sceneOption.id
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100"
                            }`}
                            title={sceneOption.description}
                          >
                            {sceneOption.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-gray-700 block">产品功能科技卖点 <span className="text-red-500">*</span></label>
                        <span className="text-[10px] text-gray-400">已选 {project.productFunctions.length} 个</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto border border-gray-100 p-2 rounded-xl bg-gray-50 no-scrollbar">
                        {SELLING_POINT_OPTIONS.map((featureOption) => {
                          const isSel = project.productFunctions.includes(featureOption.id);
                          return (
                            <button
                              key={featureOption.id}
                              onClick={() => handleToggleProductFunction(featureOption.id)}
                              className={`px-2 py-1.5 text-left rounded-lg text-[10px] border truncate transition ${
                                isSel
                                  ? "bg-blue-600 border-blue-600 text-white font-bold"
                                  : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {isSel ? "✓ " : "+ "} {featureOption.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === 替换模式内容 (R) === */}
              {mainMode === "replacement" && (
                <div className="space-y-4">
                  {/* Scene selection */}
                  <div className="space-y-2">
                    <label className="font-semibold text-gray-700 block">选择A类目标场景</label>
                    <div className="grid grid-cols-2 gap-2">
                      {sceneOptions.map((sceneOption) => (
                        <button
                          key={sceneOption.id}
                          onClick={() => onUpdateProject({
                            scene: sceneOption.id,
                            tone: sceneOption.recommendedTone || project.tone,
                          })}
                          className={`px-3 py-2 text-center rounded-xl border font-semibold transition ${
                            project.scene === sceneOption.id
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                              : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100"
                          }`}
                          title={sceneOption.description}
                        >
                          {sceneOption.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] leading-relaxed text-gray-400">
                      目标场景仅在"服装+场景替换"中完全生效；产品替换和服装替换会严格保留参考图原场景。
                    </p>
                  </div>

                  {/* Replacement mode selection */}
                  <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                    <div>
                      <label className="font-semibold text-blue-900 block">选择替换模式 <span className="text-red-500">*</span></label>
                      <p className="mt-1 text-[10px] leading-relaxed text-blue-700/70">
                        百分百复刻参考图的姿势、动作、图片视角与构图；人物身份和光影调性不作要求。
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {REPLACEMENT_MODE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onUpdateProject({ replacementMode: option.id as ReplacementModeId })}
                          className={`rounded-xl border px-3 py-2.5 text-left transition ${
                            project.replacementMode === option.id
                              ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                              : "border-blue-100 bg-white text-gray-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="block text-[11px] font-bold">{option.label}</span>
                          <span className={`mt-1 block text-[9px] leading-normal ${project.replacementMode === option.id ? "text-blue-100" : "text-gray-400"}`}>
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* SECTION 3: CAMERA AND SHOT SCALE */}
        <div className={`${mainMode === "replacement" ? "hidden" : ""} border-b border-gray-100 pb-5 space-y-4`}>
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleCollapse('cameraShot')}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              📸 3. 景别与拍摄角度
            </h3>
            {collapsed.cameraShot ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
          </div>

          {!collapsed.cameraShot && (
            <div className="space-y-4 animate-fade-in text-xs">
              
              {/* Shot Scales Cards */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 block">选择画幅景别</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {SHOT_SCALE_OPTIONS.map((shotOption) => (
                    <button
                      key={shotOption.id}
                      onClick={() => onUpdateProject({ shotScale: shotOption.id })}
                      className={`py-2 text-center rounded-xl border text-[10px] font-semibold transition ${
                        project.shotScale === shotOption.id
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {shotOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Angle */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 block">镜头俯仰角度</label>
                <div className="grid grid-cols-3 gap-2">
                  {CAMERA_ANGLE_OPTIONS.map((angleOption) => (
                    <button
                      key={angleOption.id}
                      onClick={() => onUpdateProject({ cameraAngle: angleOption.id })}
                      className={`py-2 text-center rounded-xl border font-semibold transition ${
                        project.cameraAngle === angleOption.id
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {angleOption.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* SECTION 4: DIMENSIONS AND TONES */}
        <div className="border-b border-gray-100 pb-5 space-y-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleCollapse('dimensions')}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              📐 4. 尺寸与色彩影调
            </h3>
            {collapsed.dimensions ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
          </div>

          {!collapsed.dimensions && (
            <div className="space-y-4 animate-fade-in text-xs">
              
              {/* Aspect Ratio boxes */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 block">画幅比例尺寸</label>
                <div className="grid grid-cols-4 gap-2">
                  {ASPECT_RATIO_OPTIONS.map((ratioOption) => (
                    <button
                      key={ratioOption.id}
                      onClick={() => onUpdateProject({ aspectRatio: ratioOption.id })}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition ${
                        project.aspectRatio === ratioOption.id
                          ? "border-blue-600 bg-blue-50/50 text-blue-950 shadow-sm"
                          : "border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      {/* Visual box shape */}
                      <div className={`border border-gray-300 bg-white shadow-inner mb-1 rounded ${
                        ratioOption.id === "1:1" ? "w-4 h-4" :
                        ratioOption.id === "2:3" ? "w-3 h-4.5" :
                        ratioOption.id === "3:2" ? "w-4.5 h-3" :
                        ratioOption.id === "3:4" ? "w-3.5 h-4.5" :
                        ratioOption.id === "4:3" ? "w-4.5 h-3.5" :
                        ratioOption.id === "9:16" ? "w-2.5 h-4.5" : "w-5 h-2.5"
                      }`} />
                      <span className="text-[9px] font-mono font-semibold">{ratioOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone style selection */}
              <div className="space-y-2">
                <label className="font-semibold text-gray-700 block">品牌核心影调</label>
                <div className="grid grid-cols-2 gap-3">
                  {TONE_OPTIONS.map((toneOption) => (
                    <button
                      key={toneOption.id}
                      onClick={() => onUpdateProject({ tone: toneOption.id })}
                      className={`p-2.5 rounded-xl border text-center flex items-center justify-center gap-1.5 font-semibold transition ${
                        project.tone === toneOption.id
                          ? `${toneOption.id === "米色调" ? "bg-amber-100/50 text-amber-900 border-amber-200" : "bg-blue-100/50 text-blue-950 border-blue-200"} ring-2 ring-blue-500/15 font-bold shadow-sm`
                          : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border border-black/5 ${toneOption.id === "米色调" ? "bg-amber-200" : "bg-blue-400"}`} />
                      {toneOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700 block">图片输出分辨率</label>
                  <CustomSelect
                    value={project.resolution}
                    onChange={(value) => onUpdateProject({ resolution: value })}
                    ariaLabel="选择图片输出分辨率"
                    buttonClassName="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                    menuClassName="min-w-[180px]"
                    options={RESOLUTION_OPTIONS.map((option) => ({ value: option.id, label: option.label, description: option.description }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700 block">单次生成张数</label>
                  <CustomSelect
                    value={String(project.imageCount)}
                    onChange={(value) => onUpdateProject({ imageCount: Number(value) })}
                    ariaLabel="选择单次生成张数"
                    buttonClassName="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                    menuClassName="min-w-[150px]"
                    options={IMAGE_COUNT_OPTIONS.map((count) => ({
                      value: String(count),
                      label: `${count} 张${count === 1 ? "（默认）" : ""}`,
                    }))}
                  />
                </div>
              </div>

            </div>
          )}
        </div>

        {/* SECTION 5: CREATIVE TEXT BOX */}
        <div className="space-y-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleCollapse('prompt')}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              ✍ 5. 补充创意补充
            </h3>
            {collapsed.prompt ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
          </div>

          {!collapsed.prompt && (
            <div className="space-y-3 animate-fade-in text-xs">
              <textarea
                placeholder=""
                value={project.originalPrompt}
                onChange={(e) => onUpdateProject({ originalPrompt: e.target.value })}
                maxLength={300}
                rows={4}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="flex items-center justify-between text-[10px] text-gray-400 -mt-1 font-mono">
                <span>支持中文自然语言描述</span>
                <span>{project.originalPrompt.length}/300字</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">生图提示词（中文展示）</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">页面展示中文便于核对，复制时使用实际提交给 Gemini 的英文版本</p>
                  </div>
                  {isPromptPreviewLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />}
                </div>
                <textarea
                  readOnly
                  aria-label="生图提示词（中文展示）"
                  value={isPromptPreviewLoading && !actualPromptPreviewChinese ? "正在编排生图提示词..." : actualPromptPreviewChinese}
                  rows={9}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-[10px] leading-relaxed text-slate-600 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  disabled={!actualPromptPreviewEnglish || isPromptPreviewLoading}
                  onClick={() => copyPrompt(actualPromptPreviewEnglish, "actual")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {copiedPrompt === "actual" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPrompt === "actual" ? "已复制英文提示词" : "复制英文提示词"}
                </button>
              </div>


              {project.optimizedPrompt && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-blue-800">本地规则已生成</span>
                    <span className="text-[9px] text-blue-500">{project.promptConfigVersion || "参数变更后自动失效"}</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-600 max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
                    {project.optimizedPrompt}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyPrompt(project.optimizedPromptEnglish || project.optimizedPrompt, "positive")}
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-[10px] font-semibold text-blue-700 flex items-center justify-center gap-1.5"
                  >
                    {copiedPrompt === "positive" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPrompt === "positive" ? "已复制英文正向提示词" : "复制英文正向提示词"}
                  </button>
                  {project.negativePrompt && (
                    <div className="border-t border-blue-100 pt-2 space-y-2">
                      <p className="text-[10px] font-bold text-slate-600">负向提示词</p>
                      <p className="text-[10px] leading-relaxed text-slate-500 max-h-28 overflow-y-auto whitespace-pre-wrap select-text">{project.negativePrompt}</p>
                      <button
                        type="button"
                        onClick={() => copyPrompt(project.negativePromptEnglish || project.negativePrompt, "negative")}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 flex items-center justify-center gap-1.5"
                      >
                        {copiedPrompt === "negative" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedPrompt === "negative" ? "已复制英文负向提示词" : "复制英文负向提示词"}
                      </button>
                    </div>
                  )}
                  {project.promptWarnings?.length > 0 && (
                    <div className="text-[9px] leading-relaxed text-amber-700 border-t border-blue-100 pt-2">
                      {project.promptWarnings.join("；")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Main Bottom Trigger button */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
        {/* Verification banner if no products */}
        {project.productImages.length === 0 && (
          <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-2 text-orange-800 text-[10px]">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <span>尚未上传 <strong>打底产品主图</strong>，请在上方【打底素材】中上传，或一键导入推荐模板。</span>
          </div>
        )}
        {project.visualType === "R" && !replacementWorkflowReady && (
          <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-2 text-orange-800 text-[10px]">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <span>{replacementWorkflow === "pose_rebuild" ? "姿势锁定重构需要：指定模特、姿势参考图，以及预设场景或场景参考图。" : replacementWorkflow === "product_only" ? "原图单品替换必须上传需要保持不变的原场景图。" : "多要素精确替换必须上传构图参考图，以锁定机位、景别、占比和裁切。"}</span>
          </div>
        )}
        
        <button
          onClick={onGenerate}
          disabled={isGenerating || project.productImages.length === 0 || (project.visualType === "R" && !replacementWorkflowReady)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl text-sm font-semibold shadow-md active:scale-98 transition flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              正在生成品牌视觉...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              生成品牌视觉
            </>
          )}
        </button>
      </div>

    </div>
  );
}
