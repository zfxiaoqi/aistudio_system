import React, { useRef } from "react";
import { Project, ImageAsset, ReferenceImage, Task } from "../types";
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
  const [mainMode, setMainMode] = React.useState<"creative" | "replacement">(project.visualType === "R" ? "replacement" : "creative");
  const activeUploadIndexRef = useRef<number>(0);

  const copyPrompt = async (text: string, type: "positive" | "negative" | "actual") => {
    await navigator.clipboard.writeText(text);
    setCopiedPrompt(type);
    window.setTimeout(() => setCopiedPrompt(null), 1600);
  };

  React.useEffect(() => {
    if (project.characterImages.length > project.modelCount) {
      onUpdateProject({ characterImages: project.characterImages.slice(0, project.modelCount) });
    }
  }, [project.characterImages, project.modelCount, onUpdateProject]);

  const handleModelCountChange = (count: number) => {
    onUpdateProject({
      modelCount: count,
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
        onUpdateProject({ characterImages: updatedImages });
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

  return (
    <div id="sidebar-params" className="flex flex-col h-full bg-white border-r border-gray-100 shadow-sm overflow-hidden text-gray-800">

      {/* Main Parameters Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 select-none">
        
        {/* SECTION 1: MATERIALS UPLOAD */}
        <div className="border-b border-gray-100 pb-5 space-y-4">
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
        <div className="border-b border-gray-100 pb-5 space-y-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleCollapse('visualType')}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              🖼 2. 视觉主调方案
            </h3>
            {collapsed.visualType ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
          </div>

          {!collapsed.visualType && (
            <div className="space-y-4 animate-fade-in text-xs">

              {/* Top-level mode tabs: 创意模式 / 替换模式 */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMainMode("creative");
                    if (project.visualType === "R") {
                      handleVisualTypeChange("A");
                    }
                  }}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition ${
                    mainMode === "creative"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  创意模式
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMainMode("replacement");
                    if (project.visualType !== "R") {
                      handleVisualTypeChange("R");
                    }
                  }}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition ${
                    mainMode === "replacement"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  替换模式
                </button>
              </div>

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
        <div className="border-b border-gray-100 pb-5 space-y-4">
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
        {project.visualType === "R" && project.referenceImages.length === 0 && (
          <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-2 text-orange-800 text-[10px]">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <span>替换模式必须上传至少一张<strong>替换参考图</strong>，用于复刻姿势、动作、图片视角和构图。</span>
          </div>
        )}
        
        <button
          onClick={onGenerate}
          disabled={isGenerating || project.productImages.length === 0 || (project.visualType === "R" && project.referenceImages.length === 0)}
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
