import React, { useState } from "react";
import { Task, Project, type GenerationFailure } from "../types";
import { ZoomIn, Edit, Download, Info, Sparkles, RefreshCw, Layers, Check, Copy, ChevronLeft, ChevronRight, X, Maximize2, Minimize2, CheckCircle2 } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface CanvasAreaProps {
  currentTask: Task | null;
  project: Project;
  isGenerating: boolean;
  generatingProgress: number;
  generationElapsedSeconds: number;
  generatingLogs: string[];
  generationError: GenerationFailure | null;
  onOpenEditor: (imageUrl: string, originalUrl: string) => void;
  onRecreateSimilar: (url: string) => void;
  onSetAsReference: (url: string) => void;
}

export default function CanvasArea({
  currentTask,
  project,
  isGenerating,
  generatingProgress,
  generationElapsedSeconds,
  generatingLogs,
  generationError,
  onOpenEditor,
  onRecreateSimilar,
  onSetAsReference
}: CanvasAreaProps) {
  const formatElapsed = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };
  const waitingMessage = generationElapsedSeconds < 5
    ? "正在建立安全连接"
    : generationElapsedSeconds < 15
    ? "正在上传并解析参考图"
    : generationElapsedSeconds < 45
    ? "Gemini 正在合成图片"
    : "模型仍在渲染，请保持页面打开";

  // Immersive preview state
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Clipboard copy feedback states
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Always render the pure visual template without overlays
  const showOverlays = false;

  // Download logic (creates a standard download trigger)
  const downloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const filename = `${project.name.replace(/\s+/g, '_')}_${project.visualType}_${project.scene || 'Feature'}_2026_${index + 1}.png`;
      saveAs(blob, filename);
    } catch (e) {
      console.error("Download failed", e);
      // Fallback
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.name.replace(/\s+/g, '_')}_${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadBatch = async (task: Task) => {
    if (!task.results || task.results.length === 0) return;
    const zip = new JSZip();
    for (let i = 0; i < task.results.length; i++) {
      const url = task.results[i];
      const response = await fetch(url);
      const blob = await response.blob();
      zip.file(`${project.name.replace(/\s+/g, '_')}_${project.visualType}_${project.scene || 'Feature'}_2026_${i + 1}.png`, blob);
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${project.name.replace(/\s+/g, '_')}_batch_download.zip`);
  };

  const copyPromptToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Keyboard navigation for fullscreen slider
  React.useEffect(() => {
    if (previewIndex === null || !currentTask || !currentTask.results) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setPreviewIndex((previewIndex + 1) % currentTask.results.length);
        setZoomLevel(100);
        setPanOffset({ x: 0, y: 0 });
      } else if (e.key === "ArrowLeft") {
        setPreviewIndex((previewIndex - 1 + currentTask.results.length) % currentTask.results.length);
        setZoomLevel(100);
        setPanOffset({ x: 0, y: 0 });
      } else if (e.key === "Escape") {
        setPreviewIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, currentTask]);

  // Drag to Pan inside Zoom view
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 100) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Translate ratio into dynamic aspect-ratio styles
  const getAspectRatioClass = () => {
    switch (project.aspectRatio) {
      case "1:1": return "aspect-square";
      case "2:3": return "aspect-[2/3]";
      case "3:2": return "aspect-[3/2]";
      case "3:4": return "aspect-[3/4]";
      case "4:3": return "aspect-[4/3]";
      case "9:16": return "aspect-[9/16]";
      case "16:9": return "aspect-[16/9]";
      default: return "aspect-[3/4]";
    }
  };

  return (
    <div id="canvas-area" className="flex-1 bg-slate-50 p-6 flex flex-col justify-between overflow-y-auto min-h-[500px]">
      
      {/* Toast Feedback */}
      {copyFeedback && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white border border-slate-700 px-4 py-2.5 rounded-xl shadow-lg z-50 text-xs font-semibold flex items-center gap-1.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>参数与提示词复制成功！</span>
        </div>
      )}

      {generationError && !isGenerating && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-xs text-red-800 flex items-start gap-3">
          <X className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-sm">{generationError.title}</p>
              {generationError.code && (
                <span className="rounded-md bg-red-100 px-2 py-0.5 font-mono text-[9px] text-red-700">
                  {generationError.code}
                </span>
              )}
            </div>
            <p className="mt-1.5 font-semibold leading-relaxed select-text">{generationError.message}</p>
            <div className="mt-3 grid gap-2 text-[11px] leading-relaxed">
              <p><span className="font-bold">失败原因：</span>{generationError.reason}</p>
              <p><span className="font-bold">处理建议：</span>{generationError.suggestion}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-red-200/70 pt-2 font-mono text-[9px] text-red-500">
              {generationError.stage && <span>阶段：{generationError.stage}</span>}
              {typeof generationError.durationMs === "number" && <span>耗时：{formatElapsed(Math.round(generationError.durationMs / 1000))}</span>}
              {generationError.requestId && <span className="select-text">请求编号：{generationError.requestId}</span>}
              {generationError.safetyRetryTriggered && <span>已执行安全改写重试</span>}
            </div>
          </div>
        </div>
      )}

      {/* WORKSPACE VIEW ROUTER */}
      {!isGenerating && !currentTask ? (
        
        /* 1. INITIAL EMPTY STATE */
        false ? (
          <div className="flex-1 w-full max-w-4xl mx-auto py-8 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-green-700 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  本地提示词包已完成
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-2">{project.name}</h2>
                <p className="text-xs text-slate-400 mt-1">配置版本：{project.promptConfigVersion || "本地规则"} · 参数变更后可重新生成</p>
              </div>
              <button
                onClick={() => copyPromptToClipboard(`[POSITIVE PROMPT]\n${project.optimizedPromptEnglish || project.optimizedPrompt}\n\n[NEGATIVE PROMPT]\n${project.negativePromptEnglish || project.negativePrompt || "None"}`, "prompt-package")}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                复制英文提示词包
              </button>
            </div>

            <section className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-blue-900">正向提示词</h3>
                <button onClick={() => copyPromptToClipboard(project.optimizedPromptEnglish || project.optimizedPrompt, "positive-prompt")} className="text-xs text-blue-600 font-semibold flex items-center gap-1"><Copy className="w-3.5 h-3.5" />复制英文</button>
              </div>
              <pre className="text-xs leading-6 text-slate-700 whitespace-pre-wrap font-sans max-h-[48vh] overflow-y-auto rounded-xl bg-slate-50 p-4 border border-slate-100 select-text">{project.optimizedPrompt}</pre>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">负向提示词</h3>
                <button onClick={() => copyPromptToClipboard(project.negativePromptEnglish || project.negativePrompt || "", "negative-prompt")} className="text-xs text-slate-600 font-semibold flex items-center gap-1"><Copy className="w-3.5 h-3.5" />复制英文</button>
              </div>
              <pre className="text-xs leading-6 text-slate-600 whitespace-pre-wrap font-sans rounded-xl bg-slate-50 p-4 border border-slate-100 select-text">{project.negativePrompt || "当前配置未生成额外负向提示词。"}</pre>
            </section>

            {project.promptWarnings?.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                <strong>本地生成说明：</strong>{project.promptWarnings.join("；")}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6 py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 shadow-md">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">生成结果对比区</h2>
              <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                点击左侧“生成品牌视觉”后，这里将记录本次参考素材、生成结果和参数快照，便于逐张比较与复用。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full pt-4">
              {[
                { num: "01", name: "参考素材", desc: "产品、人物与风格图集中留档" },
                { num: "02", name: "生成结果", desc: "同批次结果并排比较" },
                { num: "03", name: "参数快照", desc: "保留比例、场景与生成设置" }
              ].map((step, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-left">
                  <span className="text-xs font-mono font-bold text-blue-600 block mb-1">{step.num}</span>
                  <span className="text-xs font-semibold text-gray-800 block">{step.name}</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5 leading-normal">{step.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )

      ) : isGenerating ? (

        /* 2. GENERATING PIPELINE STATUS SCREEN */
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full py-8 space-y-6">
          <div className="w-full space-y-4">
            
            {/* Master Progress Indicator */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                巴迪高 AI 正在实时合成渲染中...
              </span>
              <span className="font-mono font-bold text-blue-600 text-sm">{generatingProgress}%</span>
            </div>

            {/* Slider bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative border border-black/5 shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-400 h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${generatingProgress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-pulse" />
              </div>
            </div>

            {/* Process Logging Terminal lines */}
            <div className="bg-slate-900 font-mono text-[10px] text-green-400 p-4 rounded-xl h-44 overflow-y-auto space-y-1.5 leading-relaxed shadow-inner">
              {generatingLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-1">
                  <span className="text-slate-500 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
            
            <p className="text-[10px] text-gray-400 text-center">
              * {waitingMessage} · 已等待 {formatElapsed(generationElapsedSeconds)}
            </p>
          </div>

          {/* Skeletons placeholders mapping chosen aspect ratios */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {Array.from({ length: project.imageCount }).map((_, i) => (
              <div
                key={i}
                className={`bg-slate-100 border border-slate-200/60 rounded-xl overflow-hidden animate-pulse relative ${getAspectRatioClass()}`}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/50 to-slate-100 flex items-center justify-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    P-{i + 1} 预备中
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      ) : (

        /* 3. SHOW GENERATED VISUALS RESULTS */
        <div className="space-y-6">
          
          {/* Output Header panel */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-600" />
                生成结果对比
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                本批次结果已保存，可结合下方参考素材逐张查看、放大和下载。
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => currentTask && downloadBatch(currentTask)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                打包批量下载 (.zip)
              </button>
            </div>
          </div>

          {/* Style Injector for composites */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scanLineAnim {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
            @keyframes floatAnim {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-8px); }
            }
            .animate-scan {
              animation: scanLineAnim 4s linear infinite;
            }
            .animate-float {
              animation: floatAnim 3s ease-in-out infinite;
            }
            .animate-pulse-slow {
              animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
          `}} />

          {/* Reference materials used by this generation */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">本次参考素材</h4>
                <p className="text-[10px] text-slate-400 mt-1">用于核对产品、人物与风格的一致性</p>
              </div>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                {(currentTask?.productImages.length || 0) + (currentTask?.characterImages.length || 0) + (currentTask?.referenceImages.length || 0)} 张
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                ...(currentTask?.productImages.map((url) => ({ url, label: "产品" })) || []),
                ...(currentTask?.characterImages.map((url) => ({ url, label: "人物" })) || []),
                ...(currentTask?.referenceImages.map((item) => ({ url: item.url, label: `风格 · ${item.weight === "high" ? "高" : item.weight === "low" ? "低" : "中"}` })) || []),
              ].map((item, index) => (
                <div key={`${item.label}-${index}`} className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  {item.url && <img src={item.url} alt={item.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                  <span className="absolute inset-x-0 bottom-0 bg-slate-950/70 text-white text-[8px] text-center py-0.5">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid View of results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentTask?.results.map((imgUrl, i) => {
              const hasEdited = currentTask.editVersions[imgUrl] && currentTask.editVersions[imgUrl].length > 0;
              const displayUrl = hasEdited 
                ? currentTask.editVersions[imgUrl][currentTask.editVersions[imgUrl].length - 1] 
                : imgUrl;

              // Render custom dynamic composite
              const isWarm = currentTask.tone === "米色调" || currentTask.tone.includes("米") || currentTask.tone.includes("暖");
              const getSceneBackground = (scene: string | undefined) => {
                if (scene === "海边") {
                  return isWarm 
                    ? "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800"
                    : "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=800";
                } else if (scene === "草坪蓝天") {
                  return isWarm
                    ? "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800"
                    : "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=800";
                } else if (scene === "室内家居") {
                  return isWarm
                    ? "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800"
                    : "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800";
                } else {
                  return isWarm
                    ? "https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=800"
                    : "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=800";
                }
              };
              
              const bgUrl = getSceneBackground(currentTask.scene);
              const productUrl = currentTask.productImages && currentTask.productImages.length > 0 
                ? currentTask.productImages[0] 
                : "https://images.unsplash.com/photo-1571945153237-4929e78394a9?q=80&w=600";
                
              const characterUrl = currentTask.characterImages && currentTask.characterImages.length > 0 
                ? currentTask.characterImages[0] 
                : "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=600";
                
              const referenceUrl = currentTask.referenceImages && currentTask.referenceImages.length > 0 
                ? currentTask.referenceImages[0].url 
                : "https://images.unsplash.com/photo-1528158229374-4f24f855de00?q=80&w=600";

              const cardStyle = i % 4;
              const toneFilterClass = isWarm 
                ? "sepia-[0.15] brightness-[1.01] contrast-[1.02] saturate-[1.05]" 
                : "hue-rotate-[10deg] saturate-[1.1] brightness-[0.98] contrast-[1.02]";

              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition duration-300 group"
                >
                  {/* Photo viewport matching aspect ratio */}
                  <div className={`relative bg-slate-900 overflow-hidden ${getAspectRatioClass()}`}>
                    
                    {/* CUSTOM DYNAMIC COMPOSITED RENDER VIEWS */}
                    {cardStyle === 0 ? (
                      // 1. PRODUCT ON MODEL FUSION - SPLIT COLLAGE
                      !showOverlays ? (
                        <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
                          <img 
                            src={displayUrl} 
                            alt="Model Fusion" 
                            className={`w-full h-full object-cover transition duration-500 hover:scale-105 ${toneFilterClass}`} 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-2 px-3 text-left">
                            <span className="text-[8px] font-extrabold text-blue-300 tracking-widest uppercase">AIGC 模特面料贴合</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center p-2.5">
                          <img src={displayUrl} alt="Bg" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[1px]" referrerPolicy="no-referrer" />
                          
                          {/* Fused Image Frame (Left) */}
                          <div className={`relative w-[50%] h-[95%] -translate-x-[15%] flex items-center justify-center rounded-xl overflow-hidden shadow-2xl border border-white/25 ${toneFilterClass}`}>
                            <img src={displayUrl} alt="AIGC Result" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-x-0 bottom-0 bg-blue-600/90 py-0.5 text-center text-[5px] text-white font-extrabold tracking-wider">
                              AIGC 智能上身大片
                            </div>
                          </div>
                          
                          {/* Original Model Frame (Right Top) */}
                          <div className="absolute right-[4%] top-[8%] w-[38%] aspect-square rounded-lg overflow-hidden shadow-xl border border-white/20 bg-slate-900">
                            <img src={characterUrl} alt="Original Model" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[4.5px] text-gray-200">
                              原人像模板
                            </div>
                          </div>

                          {/* Product Frame (Right Bottom) */}
                          <div className="absolute right-[4%] bottom-[12%] w-[38%] aspect-square rounded-lg overflow-hidden shadow-xl border border-white/20 bg-slate-900">
                            <img src={productUrl} alt="Product Template" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[4.5px] text-gray-200">
                              产品版型对齐
                            </div>
                          </div>

                          {/* Technology spec tag */}
                          <div className="absolute left-2.5 bottom-2.5 bg-blue-600/80 backdrop-blur-sm px-1.5 py-0.5 rounded border border-blue-400/30 text-[6px] text-white font-mono z-10 tracking-widest font-semibold font-mono">
                            FUSION: 99.2%
                          </div>
                        </div>
                      )
                    ) : cardStyle === 1 ? (
                      // 2. PREMIUM BRAND CAMPAIGN - STYLE CONSISTENCY AD
                      !showOverlays ? (
                        <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col justify-between p-3">
                          <img src={displayUrl} alt="Brand Campaign" className={`absolute inset-0 w-full h-full object-cover ${toneFilterClass}`} referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
                          
                          <div className="flex justify-between items-start z-10 w-full">
                            <span className="text-[7px] font-bold text-white bg-blue-600/90 px-1.5 py-0.5 rounded tracking-wider uppercase shadow">
                              巴迪高 AIGC 创意舱
                            </span>
                          </div>

                          <div className="relative z-10 text-center space-y-0.5">
                            <h4 className="text-[10px] font-extrabold text-white tracking-widest uppercase">BADIGAO COMFORT</h4>
                            <div className="flex items-center justify-center gap-1 text-[6px] text-blue-200 font-bold">
                              <span>极柔无感</span>
                              <span>•</span>
                              <span>高弹塑型</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col justify-between p-3">
                          <img src={displayUrl} alt="Brand Campaign Spec" className={`absolute inset-0 w-full h-full object-cover opacity-75 ${toneFilterClass}`} referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent opacity-90" />
                          
                          <div className="flex justify-between items-start z-10 w-full">
                            <span className="text-[7px] font-bold text-white bg-blue-600/90 px-1.5 py-0.5 rounded tracking-wider uppercase shadow">
                              智能影调同步
                            </span>
                          </div>
                          
                          {/* Floating Reference Spec */}
                          <div className="absolute right-[6%] top-[15%] w-[42%] aspect-square rounded-xl overflow-hidden shadow-2xl border-2 border-white bg-slate-900 animate-float">
                            <img src={referenceUrl} alt="Style Reference" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm py-0.5 text-center text-[5px] text-white font-extrabold tracking-wider">
                              目标影调参考
                            </div>
                          </div>
                          
                          <div className="relative z-10 text-center space-y-0.5">
                            <h4 className="text-[10px] font-extrabold text-white tracking-widest uppercase">BADIGAO STUDIO</h4>
                            <div className="flex items-center justify-center gap-1 text-[5px] text-emerald-300 font-mono">
                              <span>LIGHT GRADIENT MATCHED: 98.6%</span>
                            </div>
                          </div>
                        </div>
                      )
                    ) : cardStyle === 2 ? (
                      // 3. STYLE REFERENCE ALIGNMENT - MULTI-VIEW PAIRING
                      !showOverlays ? (
                        <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
                          <img 
                            src={displayUrl} 
                            alt="Style Match Lookbook" 
                            className={`w-full h-full object-cover transition duration-500 hover:scale-105 ${toneFilterClass}`} 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full text-[7px] font-medium text-white tracking-wider z-10 whitespace-nowrap">
                            对照重绘 Lookbook
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col p-1.5 justify-between">
                          {/* 3-Column Comparison View */}
                          <div className="flex-1 grid grid-cols-3 gap-1 min-h-0">
                            {/* Product */}
                            <div className="rounded-lg overflow-hidden border border-white/10 relative bg-slate-900 flex flex-col justify-end">
                              <img src={productUrl} alt="Prod" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <span className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 text-center text-[4.5px] text-white font-bold whitespace-nowrap">① 舒柔内衣</span>
                            </div>
                            {/* Input Model */}
                            <div className="rounded-lg overflow-hidden border border-white/10 relative bg-slate-900 flex flex-col justify-end">
                              <img src={characterUrl} alt="Model" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <span className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 text-center text-[4.5px] text-white font-bold whitespace-nowrap">② 人像模板</span>
                            </div>
                            {/* AIGC output */}
                            <div className="rounded-lg overflow-hidden border border-blue-500/50 relative bg-slate-900 flex flex-col justify-end shadow-lg animate-pulse-slow">
                              <img src={displayUrl} alt="AIGC Result" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <span className="absolute inset-x-0 bottom-0 bg-blue-600/90 py-0.5 text-center text-[4.5px] text-white font-bold whitespace-nowrap">③ 渲染合成</span>
                            </div>
                          </div>

                          {/* Palette matching bottom bar */}
                          <div className="bg-black/80 border border-white/10 p-1 rounded-md space-y-0.5 z-10 text-[7px] font-mono text-gray-300 mt-1">
                            <div className="flex justify-between items-center text-white text-[7px]">
                              <span className="font-bold flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                                品牌影调对齐 (Style Match)
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              {isWarm ? (
                                <>
                                  <div className="h-1.5 bg-[#F5E6D3] rounded border border-white/5" />
                                  <div className="h-1.5 bg-[#EED9C4] rounded border border-white/5" />
                                  <div className="h-1.5 bg-[#DDBB99] rounded border border-white/5" />
                                  <div className="h-1.5 bg-[#C2A687] rounded border border-white/5" />
                                  <div className="h-1.5 bg-[#9E8265] rounded border border-white/5" />
                                </>
                              ) : (
                                <>
                                  <div className="h-1.5 bg-[#D2E6F1] rounded border border-white/5" />
                                  <div className="h-1.5 bg-[#B5D3E7] rounded border border-white/5" />
                                  <div className="h-1.5 bg-[#8FB9D6] rounded border border-white/5" />
                                  <div className="h-1.5 bg-[#6395BB] rounded border border-white/5" />
                                  <div className="h-1.5 bg-[#41749B] rounded border border-white/5" />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      // 4. MICRO FABRIC SCAN - HIGH DEFINITION DETAILS
                      !showOverlays ? (
                        <div className="relative w-full h-full bg-[#11171f] overflow-hidden flex items-center justify-center">
                          <img 
                            src={displayUrl} 
                            alt="Macro Detail" 
                            className="w-full h-full object-cover scale-110 hover:scale-120 transition duration-500" 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-0 bg-black/20" />
                          <span className="absolute bottom-2.5 right-3 text-[8px] font-semibold text-blue-300 tracking-wider">
                            DETAIL ZOOM
                          </span>
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-[#11171f] overflow-hidden flex flex-col items-center justify-center p-2.5">
                          <img src={displayUrl} alt="Weave BG" className="absolute inset-0 w-full h-full object-cover opacity-15 blur-[1px]" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:10px_10px]" />
                          
                          <div className="relative w-20 h-20 rounded-full border border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.25)] overflow-hidden flex items-center justify-center bg-slate-950">
                            <img src={displayUrl} alt="Zoom" className="w-[140%] h-[140%] object-cover scale-110" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 border border-blue-400 rounded-full scale-90 opacity-40 animate-ping-slow" />
                            <div className="absolute inset-x-0 h-[1.5px] bg-blue-400 animate-scan" />
                          </div>
                          
                          <div className="text-center mt-2">
                            <span className="text-[7px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                              🔬 物理工艺透气微距
                            </span>
                          </div>
                        </div>
                      )
                    )}

                    {/* Version numbers count badge if has edits */}
                    {hasEdited && (
                      <span className="absolute top-3 left-3 text-[9px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full z-10 shadow">
                        编辑第 {currentTask.editVersions[imgUrl].length} 版
                      </span>
                    )}

                    {/* Overlay action drawer */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      {/* Zoom Trigger */}
                      <button
                        onClick={() => {
                          setPreviewIndex(i);
                          setZoomLevel(100);
                          setPanOffset({ x: 0, y: 0 });
                        }}
                        className="p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-800 transition transform translate-y-2 group-hover:translate-y-0 duration-300 hover:scale-105"
                        title="放大沉浸式大图"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>

                      {/* Brush Paint Editor */}
                      <button
                        onClick={() => onOpenEditor(displayUrl, imgUrl)}
                        className="p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-800 transition transform translate-y-2 group-hover:translate-y-0 duration-300 hover:scale-105 delay-75"
                        title="局部涂抹涂红修改"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                    </div>
                  </div>

                  {/* Quick Card Details */}
                  <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-gray-400">
                      生成结果 #{String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadImage(displayUrl, i)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition"
                        title="下载此图"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      
                      <button
                        onClick={() => copyPromptToClipboard(currentTask.optimizedPromptEnglish || currentTask.finalPrompt, `prompt-${i}`)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition"
                        title="复制提示词"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Generation record */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-blue-800 leading-relaxed space-y-1.5">
            <p className="font-semibold flex items-center gap-1 text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              本次生成记录
            </p>
            <div className="pl-5 text-[11px] text-blue-950 flex flex-wrap gap-x-5 gap-y-1">
              <span>视觉类型：{currentTask?.visualType} 类</span>
              <span>场景：{currentTask?.scene || "功能特写"}</span>
              <span>画幅：{currentTask?.aspectRatio}</span>
              <span>分辨率：{currentTask?.resolution}</span>
              <span>结果：{currentTask?.results.length || 0} 张</span>
              <span>时间：{currentTask ? new Date(currentTask.createdAt).toLocaleString("zh-CN") : "-"}</span>
            </div>
          </div>

        </div>

      )}

      {/* 4. IMMERSIVE FULL-SCREEN SLIDER PREVIEW */}
      {previewIndex !== null && currentTask && currentTask.results && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col items-center justify-between p-4 overflow-hidden animate-fade-in select-none">
          
          {/* Preview Header */}
          <div className="w-full flex items-center justify-between text-white border-b border-white/10 pb-3">
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-gray-400">巴迪高商业视觉放大</span>
              <h4 className="text-sm font-semibold mt-0.5">款式 #{previewIndex + 1} / {currentTask.results.length}</h4>
            </div>
            
            {/* Zoom operations */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400">{zoomLevel}% 缩放</span>
              <button
                onClick={() => {
                  setZoomLevel(prev => prev > 100 ? prev - 25 : 100);
                  if (zoomLevel <= 125) setPanOffset({ x: 0, y: 0 });
                }}
                className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-mono transition"
              >
                -
              </button>
              <button
                onClick={() => setZoomLevel(prev => prev < 300 ? prev + 25 : 300)}
                className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-mono transition"
              >
                +
              </button>
              <button
                onClick={() => {
                  setZoomLevel(100);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded transition"
              >
                重置
              </button>
              
              <button
                onClick={() => setPreviewIndex(null)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive slider Stage */}
          <div className="flex-1 w-full flex items-center justify-between relative">
            
            {/* Prev key */}
            <button
              onClick={() => {
                setPreviewIndex((previewIndex - 1 + currentTask.results.length) % currentTask.results.length);
                setZoomLevel(100);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Centered Image (Uses exact same composite renderer for consistency!) */}
            <div
              className={`flex-1 flex items-center justify-center overflow-hidden max-h-[75vh] cursor-grab ${
                isDragging ? "cursor-grabbing" : ""
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div 
                className={`w-[450px] max-w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 ${getAspectRatioClass()}`}
                style={{
                  transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transition: isDragging ? "none" : "transform 0.1s ease-out"
                }}
              >
                {(() => {
                  const isWarm = currentTask.tone === "米色调" || currentTask.tone.includes("米") || currentTask.tone.includes("暖");
                  const getSceneBackground = (scene: string | undefined) => {
                    if (scene === "海边") {
                      return isWarm 
                        ? "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800"
                        : "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=800";
                    } else if (scene === "草坪蓝天") {
                      return isWarm
                        ? "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800"
                        : "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=800";
                    } else if (scene === "室内家居") {
                      return isWarm
                        ? "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800"
                        : "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800";
                    } else {
                      return isWarm
                        ? "https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=800"
                        : "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=800";
                    }
                  };
                  
                  const bgUrl = getSceneBackground(currentTask.scene);
                  const productUrl = currentTask.productImages && currentTask.productImages.length > 0 
                    ? currentTask.productImages[0] 
                    : "https://images.unsplash.com/photo-1571945153237-4929e78394a9?q=80&w=600";
                    
                  const characterUrl = currentTask.characterImages && currentTask.characterImages.length > 0 
                    ? currentTask.characterImages[0] 
                    : "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=600";
                    
                  const referenceUrl = currentTask.referenceImages && currentTask.referenceImages.length > 0 
                    ? currentTask.referenceImages[0].url 
                    : "https://images.unsplash.com/photo-1528158229374-4f24f855de00?q=80&w=600";

                  const imgUrl = currentTask.results[previewIndex];
                  const hasEdited = currentTask.editVersions[imgUrl] && currentTask.editVersions[imgUrl].length > 0;
                  const displayUrl = hasEdited 
                    ? currentTask.editVersions[imgUrl][currentTask.editVersions[imgUrl].length - 1] 
                    : imgUrl;

                  const cardStyle = previewIndex % 4;
                  const toneFilterClass = isWarm 
                    ? "sepia-[0.15] brightness-[1.01] contrast-[1.02] saturate-[1.05]" 
                    : "hue-rotate-[10deg] saturate-[1.1] brightness-[0.98] contrast-[1.02]";

                  if (cardStyle === 0) {
                    return (
                      // 1. PRODUCT ON MODEL FUSION - SPLIT COLLAGE (FULL SCREEN)
                      !showOverlays ? (
                        <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
                          <img 
                            src={displayUrl} 
                            alt="Model Fusion" 
                            className={`w-full h-full object-cover ${toneFilterClass}`} 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-4 px-6 text-left">
                            <span className="text-[10px] font-extrabold text-blue-300 tracking-widest uppercase">AIGC 模特面料贴合 (Pristine Shot)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center p-4">
                          <img src={displayUrl} alt="Bg" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[2px]" referrerPolicy="no-referrer" />
                          
                          {/* Fused Image Frame (Left) */}
                          <div className={`relative w-[55%] h-[95%] -translate-x-[15%] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/20 ${toneFilterClass}`}>
                            <img src={displayUrl} alt="AIGC Result" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-x-0 bottom-0 bg-blue-600/90 py-1 text-center text-[7px] text-white font-extrabold tracking-wider">
                              AIGC 智能上身大片
                            </div>
                          </div>
                          
                          {/* Original Model Frame (Right Top) */}
                          <div className="absolute right-[6%] top-[10%] w-[35%] aspect-square rounded-xl overflow-hidden shadow-xl border border-white/25 bg-slate-900">
                            <img src={characterUrl} alt="Original Model" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/75 py-1 text-center text-[6px] text-gray-200">
                              原人像模板 (Original)
                            </div>
                          </div>

                          {/* Product Frame (Right Bottom) */}
                          <div className="absolute right-[6%] bottom-[15%] w-[35%] aspect-square rounded-xl overflow-hidden shadow-xl border border-white/25 bg-slate-900">
                            <img src={productUrl} alt="Product Template" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/75 py-1 text-center text-[6px] text-gray-200">
                              产品版型对齐
                            </div>
                          </div>

                          {/* Technology spec tag */}
                          <div className="absolute left-4 bottom-4 bg-blue-600/90 backdrop-blur-sm px-2 py-1 rounded border border-blue-400/30 text-[8px] text-white font-mono z-10 tracking-widest font-semibold font-mono">
                            FUSION ACCURACY: 99.2%
                          </div>
                        </div>
                      )
                    );
                  } else if (cardStyle === 1) {
                    return (
                      // 2. PREMIUM BRAND CAMPAIGN (FULL SCREEN)
                      !showOverlays ? (
                        <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col justify-between p-5">
                          <img src={displayUrl} alt="Brand Campaign" className={`absolute inset-0 w-full h-full object-cover ${toneFilterClass}`} referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
                          
                          <div className="flex justify-between items-start z-10 w-full">
                            <span className="text-[9px] font-bold text-white bg-blue-600/90 px-2.5 py-0.5 rounded tracking-wider uppercase shadow">
                              巴迪高 AIGC 创意舱
                            </span>
                          </div>

                          <div className="relative z-10 text-center space-y-1">
                            <h4 className="text-[12px] font-extrabold text-white tracking-widest uppercase">BADIGAO COMFORT</h4>
                            <div className="flex items-center justify-center gap-1.5 text-[8px] text-blue-200 font-bold">
                              <span>极柔无感</span>
                              <span>•</span>
                              <span>高弹塑型</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col justify-between p-5">
                          <img src={displayUrl} alt="Brand Campaign Spec" className={`absolute inset-0 w-full h-full object-cover opacity-75 ${toneFilterClass}`} referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent opacity-90" />
                          
                          <div className="flex justify-between items-start z-10 w-full">
                            <span className="text-[9px] font-bold text-white bg-blue-600/90 px-2.5 py-0.5 rounded tracking-wider uppercase shadow">
                              智能影调同步
                            </span>
                          </div>
                          
                          {/* Floating Reference Spec */}
                          <div className="absolute right-[8%] top-[18%] w-[38%] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-white bg-slate-900 animate-float">
                            <img src={referenceUrl} alt="Style Reference" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/75 backdrop-blur-sm py-1 text-center text-[7px] text-white font-extrabold tracking-wider">
                              目标影调参考
                            </div>
                          </div>
                          
                          <div className="relative z-10 text-center space-y-1">
                            <h4 className="text-[12px] font-extrabold text-white tracking-widest uppercase">BADIGAO STUDIO</h4>
                            <div className="flex items-center justify-center gap-1.5 text-[7px] text-emerald-300 font-mono">
                              <span>LIGHT GRADIENT MATCHED: 98.6%</span>
                            </div>
                          </div>
                        </div>
                      )
                    );
                  } else if (cardStyle === 2) {
                    return (
                      // 3. STYLE REFERENCE ALIGNMENT (FULL SCREEN)
                      !showOverlays ? (
                        <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
                          <img 
                            src={displayUrl} 
                            alt="Style Match Lookbook" 
                            className={`w-full h-full object-cover ${toneFilterClass}`} 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-medium text-white tracking-wider z-10 whitespace-nowrap">
                            对照重绘 Lookbook
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col p-4 justify-between">
                          {/* 3-Column Comparison View */}
                          <div className="flex-1 grid grid-cols-3 gap-2 min-h-0">
                            {/* Product */}
                            <div className="rounded-xl overflow-hidden border border-white/10 relative bg-slate-900 flex flex-col justify-end">
                              <img src={productUrl} alt="Prod" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <span className="absolute inset-x-0 bottom-0 bg-black/80 py-1 text-center text-[7px] text-white font-bold whitespace-nowrap">① 舒柔内衣</span>
                            </div>
                            {/* Input Model */}
                            <div className="rounded-xl overflow-hidden border border-white/10 relative bg-slate-900 flex flex-col justify-end">
                              <img src={characterUrl} alt="Model" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <span className="absolute inset-x-0 bottom-0 bg-black/80 py-1 text-center text-[7px] text-white font-bold whitespace-nowrap">② 人像模板</span>
                            </div>
                            {/* AIGC output */}
                            <div className="rounded-xl overflow-hidden border border-blue-500/50 relative bg-slate-900 flex flex-col justify-end shadow-lg animate-pulse-slow">
                              <img src={displayUrl} alt="AIGC Result" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <span className="absolute inset-x-0 bottom-0 bg-blue-600/90 py-1 text-center text-[7px] text-white font-bold whitespace-nowrap">③ 渲染合成</span>
                            </div>
                          </div>

                          {/* Palette matching bottom bar */}
                          <div className="bg-black/80 border border-white/10 p-2 rounded-lg space-y-1 z-10 text-[9px] font-mono text-gray-300 mt-3">
                            <div className="flex justify-between items-center text-white text-[9px]">
                              <span className="font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                品牌影调对齐 (Style Match)
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-1.5">
                              {isWarm ? (
                                <>
                                  <div className="h-2 bg-[#F5E6D3] rounded border border-white/5" />
                                  <div className="h-2 bg-[#EED9C4] rounded border border-white/5" />
                                  <div className="h-2 bg-[#DDBB99] rounded border border-white/5" />
                                  <div className="h-2 bg-[#C2A687] rounded border border-white/5" />
                                  <div className="h-2 bg-[#9E8265] rounded border border-white/5" />
                                </>
                              ) : (
                                <>
                                  <div className="h-2 bg-[#D2E6F1] rounded border border-white/5" />
                                  <div className="h-2 bg-[#B5D3E7] rounded border border-white/5" />
                                  <div className="h-2 bg-[#8FB9D6] rounded border border-white/5" />
                                  <div className="h-2 bg-[#6395BB] rounded border border-white/5" />
                                  <div className="h-2 bg-[#41749B] rounded border border-white/5" />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    );
                  } else {
                    return (
                      // 4. MICRO FABRIC SCAN (FULL SCREEN)
                      !showOverlays ? (
                        <div className="relative w-full h-full bg-[#11171f] overflow-hidden flex items-center justify-center">
                          <img 
                            src={displayUrl} 
                            alt="Macro Detail" 
                            className="w-full h-full object-cover scale-110 hover:scale-120 transition duration-500" 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-0 bg-black/20" />
                          <span className="absolute bottom-3 right-4 text-[9px] font-semibold text-blue-300 tracking-wider">
                            DETAIL ZOOM
                          </span>
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-[#11171f] overflow-hidden flex flex-col items-center justify-center p-4">
                          <img src={displayUrl} alt="Weave BG" className="absolute inset-0 w-full h-full object-cover opacity-15 blur-[1px]" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:12px_12px]" />
                          
                          <div className="relative w-28 h-28 rounded-full border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.25)] overflow-hidden flex items-center justify-center bg-slate-950">
                            <img src={displayUrl} alt="Zoom" className="w-[140%] h-[140%] object-cover scale-125" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 border border-blue-400 rounded-full scale-90 opacity-40 animate-ping-slow" />
                            <div className="absolute inset-x-0 h-[1.5px] bg-blue-400 animate-scan" />
                          </div>
                          
                          <div className="text-center mt-3">
                            <span className="text-[8px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                              🔬 物理工艺透气微距
                            </span>
                          </div>
                        </div>
                      )
                    );
                  }
                })()}
              </div>
            </div>

            {/* Next key */}
            <button
              onClick={() => {
                setPreviewIndex((previewIndex + 1) % currentTask.results.length);
                setZoomLevel(100);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

          </div>

          {/* Preview Footer Actions */}
          <div className="w-full border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-4 text-white">
            <span className="text-xs text-gray-400 font-mono">提示: 使用键盘 左右方向键 可自由切换图片</span>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const originalUrl = currentTask.results[previewIndex!];
                  const versions = currentTask.editVersions[originalUrl] || [];
                  onOpenEditor(versions[versions.length - 1] || originalUrl, originalUrl);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <Edit className="w-4 h-4" />
                局部重绘修改
              </button>
              <button
                onClick={() => downloadImage(currentTask.results[previewIndex!], previewIndex!)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                下载原图 (PNG)
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
