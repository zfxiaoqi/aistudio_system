import React from "react";
import { X, Paintbrush, Eraser, RotateCcw, RotateCw, Trash2, Check, Sparkles, Upload } from "lucide-react";
import { prepareImageForReference, type PreparedImage } from "../data/imagePreparation";

interface EditorModalProps {
  imageUrl: string;
  originalUrl: string;
  versions: string[];
  onClose: () => void;
  onSaveEditedVersion: (originalUrl: string, editedUrl: string) => void;
}

type EditRequestStatus = 'idle' | 'submitting' | 'processing' | 'saving' | 'success' | 'error';
type ReplacementImage = PreparedImage & { name: string };

export default function EditorModal({ imageUrl, originalUrl, versions, onClose, onSaveEditedVersion }: EditorModalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const replacementInputRef = React.useRef<HTMLInputElement>(null);
  const [brushMode, setBrushMode] = React.useState<'draw' | 'erase'>('draw');
  const [brushSize, setBrushSize] = React.useState(25);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progressMsg, setProgressMsg] = React.useState("");
  const [requestStatus, setRequestStatus] = React.useState<EditRequestStatus>('idle');
  const [imageReturnStatus, setImageReturnStatus] = React.useState<'not_started' | 'waiting' | 'returned' | 'not_returned'>('not_started');
  const [requestError, setRequestError] = React.useState("");
  const [responseMeta, setResponseMeta] = React.useState<{
    requestId?: string;
    model?: string;
    durationMs?: number;
    originalBytes?: number;
    maskBytes?: number;
    outputBytes?: number;
    resultUrl?: string;
  }>({});
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [history, setHistory] = React.useState<string[]>([]); // holds canvas base64 states
  const [historyIndex, setHistoryIndex] = React.useState(-1);
  const [sessionVersions, setSessionVersions] = React.useState<string[]>(() => Array.from(new Set([originalUrl, ...versions])));
  const [activeImageUrl, setActiveImageUrl] = React.useState(imageUrl);
  const [replacementImage, setReplacementImage] = React.useState<ReplacementImage | null>(null);
  const [replacementError, setReplacementError] = React.useState("");

  React.useEffect(() => {
    setSessionVersions((current) => Array.from(new Set([originalUrl, ...versions, ...current])));
  }, [originalUrl, versions]);

  React.useEffect(() => {
    if (!isProcessing) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isProcessing]);

  // Initialize and resize canvas according to the loaded image dimension
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.src = activeImageUrl;
    img.onload = () => {
      // Fit to container or use a consistent size
      const maxW = Math.min(containerRef.current?.clientWidth || 550, 550);
      const aspect = img.height / img.width;
      const calcH = maxW * aspect;
      
      canvas.width = maxW;
      canvas.height = calcH;
      
      // Clear canvas (initially clean mask)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Save initial blank state
      const blankState = canvas.toDataURL();
      setHistory([blankState]);
      setHistoryIndex(0);
    };
  }, [activeImageUrl]);

  const handleSelectVersion = (url: string) => {
    if (isProcessing || url === activeImageUrl) return;
    setActiveImageUrl(url);
    setRequestStatus('idle');
    setImageReturnStatus('not_started');
    setRequestError("");
    setResponseMeta({});
    setProgressMsg("");
    setElapsedSeconds(0);
  };

  const handleReplacementUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setReplacementError("");
      const prepared = await prepareImageForReference(file);
      setReplacementImage({ ...prepared, name: file.name });
    } catch (error) {
      setReplacementImage(null);
      setReplacementError(error instanceof Error ? error.message : "替换图片读取失败，请重新选择。");
    }
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Check if it is a touch event
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const getBrushScale = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return 1;
    return ((canvas.width / rect.width) + (canvas.height / rect.height)) / 2;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const coords = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    
    // Set drawing preferences
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // brushSize is expressed in visible CSS pixels; convert it to canvas backing pixels.
    ctx.lineWidth = brushSize * getBrushScale();
    
    if (brushMode === "draw") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.5)"; // semi-transparent red
    } else {
      // Clear painted pixels
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0, 0, 0, 1)";
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Push new state to history
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentState = canvas.toDataURL();
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prevIndex = historyIndex - 1;
    const img = new Image();
    img.src = history[prevIndex];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(prevIndex);
    };
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextIndex = historyIndex + 1;
    const img = new Image();
    img.src = history[nextIndex];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(nextIndex);
    };
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add clear state to history
    const currentState = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleApplyChanges = async () => {
    if (!prompt.trim()) {
      alert("请输入局部修改描述，例如：‘移除背景中的路人’。");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      setRequestStatus('error');
      setRequestError("局部蒙版画布尚未准备完成，请关闭编辑器后重试。");
      return;
    }

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasPaintedMask = false;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 0) {
        hasPaintedMask = true;
        break;
      }
    }
    if (!hasPaintedMask) {
      alert("请先在左侧图片上涂抹需要修改的区域。");
      return;
    }

    setIsProcessing(true);
    setRequestStatus('submitting');
    setImageReturnStatus('waiting');
    setRequestError("");
    setResponseMeta({});
    setElapsedSeconds(0);
    setProgressMsg(`正在上传原图、蒙版${replacementImage ? "、替换参考图" : ""}与修改要求...`);

    try {
      const request = fetch("/api/gemini/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(250_000),
        body: JSON.stringify({
          imageUrl: activeImageUrl,
          maskDataUrl: canvas.toDataURL("image/png"),
          prompt: prompt.trim(),
          maskWidth: canvas.width,
          maskHeight: canvas.height,
          replacementImageDataUrl: replacementImage?.dataUrl,
          replacementImageName: replacementImage?.name,
        }),
      });
      setRequestStatus('processing');
      setProgressMsg("Gemini 正在执行局部重绘，请保持页面打开...");
      const response = await request;
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || `局部重绘接口失败：${response.status} ${response.statusText}`);
      if (!data?.resultUrl || data?.imageStatus !== "returned") throw new Error("接口已返回，但没有收到编辑后的图片地址。");

      setRequestStatus('saving');
      setProgressMsg("图片已返回，正在保存编辑版本...");
      setImageReturnStatus('returned');
      setResponseMeta({
        requestId: data.requestId,
        model: data.model,
        durationMs: data.durationMs,
        originalBytes: data.originalBytes,
        maskBytes: data.maskBytes,
        outputBytes: data.outputBytes,
        resultUrl: data.resultUrl,
      });
      setRequestStatus('success');
      setProgressMsg("局部重绘完成，结果图已保存。");
      setIsProcessing(false);
      setSessionVersions((current) => Array.from(new Set([...current, data.resultUrl])));
      setActiveImageUrl(data.resultUrl);
      onSaveEditedVersion(originalUrl, data.resultUrl);
    } catch (error) {
      console.error("Local image edit failed:", error);
      setRequestStatus('error');
      setImageReturnStatus('not_returned');
      setRequestError(error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
        ? "局部重绘请求超时，已停止等待，请缩小涂抹范围后重试。"
        : error instanceof Error ? error.message : "局部重绘失败，请稍后重试。");
      setProgressMsg("");
      setIsProcessing(false);
    }
  };

  return (
    <div id="editor-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[90vh] max-h-[90vh]">
        
        {/* Left Side: Canvas Painting Area */}
        <div className="flex-1 p-6 bg-slate-50 border-r border-gray-100 flex flex-col justify-between relative min-h-[400px]">
          {/* Header */}
          <div className="flex items-center pb-3 border-b border-gray-200/60">
            <div>
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-blue-600" />
                局部重绘编辑器
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                用画笔涂抹需要修改的部分，其余区域将原封不动保留。
              </p>
            </div>
          </div>

          <div className="pt-3 flex items-center gap-3 overflow-hidden">
            <span className="shrink-0 text-[10px] font-bold text-gray-500">版本记录</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {sessionVersions.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => handleSelectVersion(url)}
                  disabled={isProcessing}
                  className={`shrink-0 px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition ${
                    activeImageUrl === url
                      ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600'
                  } disabled:opacity-50`}
                  title={index === 0 ? '查看生成初版' : `查看第 ${index} 次局部修改结果`}
                >
                  {index === 0 ? '初版' : `修改 ${index}`}
                </button>
              ))}
            </div>
            <span className="ml-auto shrink-0 text-[10px] text-gray-400">
              当前 {Math.max(1, sessionVersions.indexOf(activeImageUrl) + 1)}/{sessionVersions.length}
            </span>
          </div>

          {/* Canvas container */}
          <div ref={containerRef} className="flex-1 flex items-center justify-center relative my-4 overflow-hidden select-none">
            {/* Base high-res image */}
            {activeImageUrl && <img
              src={activeImageUrl}
              alt="Base original"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[45vh] object-contain pointer-events-none rounded-xl"
            />}

            {/* Paint over Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full max-h-[45vh] object-contain rounded-xl ring-1 ring-inset ring-blue-500/10 cursor-crosshair touch-none ${
                requestStatus === 'success' ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            />

            {/* Simulated loading screen */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-white p-6 rounded-xl animate-fade-in z-20">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-semibold tracking-wide">{progressMsg}</p>
                <p className="text-xs text-gray-400 mt-2">真实图片接口通常需要30–120秒</p>
              </div>
            )}
          </div>

          {/* Canvas Toolbox */}
          <div className="flex items-center justify-between p-3 bg-white border border-gray-200/80 rounded-2xl">
            {/* Draw / Erase switch */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setBrushMode('draw')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  brushMode === 'draw'
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5" />
                涂抹画笔
              </button>
              <button
                onClick={() => setBrushMode('erase')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  brushMode === 'erase'
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                橡皮擦
              </button>
            </div>

            {/* Brush Size slider */}
            <div className="flex items-center gap-2 max-w-[150px] md:max-w-none">
              <span className="text-[11px] text-gray-400 font-medium">粗细:</span>
              <input
                type="range"
                min="5"
                max="80"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20 md:w-28 accent-blue-600 h-1 bg-gray-200 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono font-bold text-gray-600 w-5 text-right">{brushSize}px</span>
            </div>

            {/* Undo, Redo, Trash */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition"
                title="撤销"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition"
                title="重做"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleClear}
                className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                title="清除选区"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Setup parameters instructions & Submit */}
        <div className="w-full md:w-[320px] flex flex-col min-h-0 max-h-full bg-white">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Header Title */}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-blue-600">巴迪高 AI 编辑</span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Guides */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">1. 在左侧涂抹区域</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                使用鼠标或手指在图片上，直接涂抹您希望重画、剔除或增强的范围。例如涂抹衣服来修改版型、涂抹背景来切换场景氛围。
              </p>
            </div>

            {/* Optional local replacement reference */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-gray-800">2. 上传局部替换图 <span className="text-[10px] font-normal text-gray-400">（选填）</span></h4>
                {replacementImage && (
                  <button
                    type="button"
                    onClick={() => setReplacementImage(null)}
                    className="text-[10px] text-red-500 hover:text-red-600"
                  >
                    移除
                  </button>
                )}
              </div>
              {replacementImage ? (
                <button
                  type="button"
                  onClick={() => replacementInputRef.current?.click()}
                  className="w-full rounded-xl border border-blue-200 bg-blue-50/60 p-2 flex items-center gap-3 text-left hover:border-blue-400 transition"
                >
                  <img src={replacementImage.dataUrl} alt="局部替换参考" className="h-14 w-14 rounded-lg object-cover bg-white" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-gray-700">{replacementImage.name}</span>
                    <span className="block mt-1 text-[10px] text-gray-400">{replacementImage.width}×{replacementImage.height} · 点击更换</span>
                  </span>
                  <Check className="h-4 w-4 shrink-0 text-blue-600" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => replacementInputRef.current?.click()}
                  className="w-full rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3 flex items-center justify-center gap-2 text-xs text-gray-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  <Upload className="h-4 w-4" />
                  上传替换图片
                </button>
              )}
              <input
                ref={replacementInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleReplacementUpload}
                className="hidden"
              />
              <p className="text-[10px] leading-relaxed text-gray-400">替换图只用于左侧涂抹区域，支持 JPG、PNG、WebP，单张不超过20MB。</p>
              {replacementError && <p className="text-[10px] text-red-500">{replacementError}</p>}
            </div>

            {/* Modification prompt textarea */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800">3. 输入局部修改要求</h4>
              <textarea
                placeholder="例如：
• 将背景改为清晨的海边日出
• 修复人物左手指尖，去除褶皱
• 保持产品不变，仅调整背景光线为暖调
• 增强服装纯棉微针孔的面料纹理表现"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={200}
                rows={5}
                className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed resize-none"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>支持中文自然语言输入</span>
                <span>{prompt.length}/200字</span>
              </div>

              <div className={`rounded-xl border p-3 text-[10px] space-y-1.5 ${
                requestStatus === 'error' ? 'border-red-200 bg-red-50 text-red-700' :
                requestStatus === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                'border-blue-100 bg-blue-50/60 text-slate-600'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">真实接口状态</span>
                  <span className="font-mono">{
                    requestStatus === 'idle' ? '等待提交' :
                    requestStatus === 'submitting' ? '正在提交' :
                    requestStatus === 'processing' ? '模型处理中' :
                    requestStatus === 'saving' ? '正在保存' :
                    requestStatus === 'success' ? '已完成' : '失败'
                  }</span>
                </div>
                <p>参数：原图 + {canvasRef.current?.width || 0}×{Math.round(canvasRef.current?.height || 0)} PNG蒙版{replacementImage ? " + 替换参考图" : ""} + {prompt.trim().length}字修改要求</p>
                <p>耗时：{responseMeta.durationMs ? `${(responseMeta.durationMs / 1000).toFixed(1)}秒` : isProcessing ? `${elapsedSeconds}秒（处理中）` : '—'}</p>
                <p>图片返回：{
                  imageReturnStatus === 'not_started' ? '尚未请求' :
                  imageReturnStatus === 'waiting' ? '等待模型返回' :
                  imageReturnStatus === 'returned' ? `已返回${responseMeta.outputBytes ? ` · ${Math.round(responseMeta.outputBytes / 1024)}KB` : ''}` : '未返回'
                }</p>
                {responseMeta.requestId && <p className="font-mono break-all">请求ID：{responseMeta.requestId}</p>}
                {requestError && <p className="pt-1 border-t border-red-200 font-medium break-words">{requestError}</p>}
              </div>
            </div>

            {/* Popular quick-suggestions pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">常用修改快捷词：</span>
              <div className="flex flex-wrap gap-1.5">
                {["背景切换至海滩", "增强面料纤维纹理", "修复手指/四肢", "调整为暖色光照"].map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPrompt(tag)}
                    className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="shrink-0 p-4 border-t border-gray-100 bg-white flex gap-2 shadow-[0_-8px_20px_rgba(15,23,42,0.05)]">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-xs font-semibold hover:bg-gray-50 transition"
            >
              {requestStatus === 'success' ? '关闭' : '取消'}
            </button>
            <button
              onClick={requestStatus === 'success' ? onClose : handleApplyChanges}
              disabled={isProcessing || (requestStatus !== 'success' && !prompt.trim())}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {requestStatus === 'success' ? '完成并查看结果' : replacementImage ? '开始局部替换' : '应用修改'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
