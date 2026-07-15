import React from "react";
import { X, Paintbrush, Eraser, RotateCcw, RotateCw, Trash2, Check, Sparkles, Image as ImageIcon } from "lucide-react";

interface EditorModalProps {
  imageUrl: string;
  onClose: () => void;
  onSaveEditedVersion: (originalUrl: string, editedUrl: string) => void;
}

export default function EditorModal({ imageUrl, onClose, onSaveEditedVersion }: EditorModalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [brushMode, setBrushMode] = React.useState<'draw' | 'erase'>('draw');
  const [brushSize, setBrushSize] = React.useState(25);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progressMsg, setProgressMsg] = React.useState("");
  const [history, setHistory] = React.useState<string[]>([]); // holds canvas base64 states
  const [historyIndex, setHistoryIndex] = React.useState(-1);
  const [showOriginal, setShowOriginal] = React.useState(false);

  // Initialize and resize canvas according to the loaded image dimension
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.src = imageUrl;
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
  }, [imageUrl]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Check if it is a touch event
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
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
    ctx.lineWidth = brushSize;
    
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

  const handleApplyChanges = () => {
    if (!prompt.trim()) {
      alert("请输入局部修改描述，例如：‘移除背景中的路人’。");
      return;
    }

    setIsProcessing(true);
    setProgressMsg("正在解析局部涂抹蒙版区域...");

    // Simulated series of progress updates
    setTimeout(() => {
      setProgressMsg("提取面料与结构边缘一致性参数...");
      setTimeout(() => {
        setProgressMsg("局部重绘渲染进行中...");
        setTimeout(() => {
          setProgressMsg("融合边界并消除色彩断层...");
          setTimeout(() => {
            // Apply a slight signature change or seed variation for the image to simulate perfect redraw
            const urlObj = new URL(imageUrl);
            urlObj.searchParams.set("edit", `${Date.now()}`);
            const resultUrl = urlObj.toString();
            
            onSaveEditedVersion(imageUrl, resultUrl);
            setIsProcessing(false);
          }, 1500);
        }, 1200);
      }, 1000);
    }, 800);
  };

  return (
    <div id="editor-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[90vh]">
        
        {/* Left Side: Canvas Painting Area */}
        <div className="flex-1 p-6 bg-slate-50 border-r border-gray-100 flex flex-col justify-between relative min-h-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
            <div>
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-blue-600" />
                局部重绘编辑器 (Inpainting Mask Editor)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                用画笔涂抹需要修改的部分，其余区域将原封不动保留。
              </p>
            </div>
            
            {/* Compare switch */}
            <button
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              onTouchStart={() => setShowOriginal(true)}
              onTouchEnd={() => setShowOriginal(false)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1 active:scale-95 transition"
              title="按住查看原始图片"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              按住对比原图
            </button>
          </div>

          {/* Canvas container */}
          <div ref={containerRef} className="flex-1 flex items-center justify-center relative my-4 overflow-hidden select-none">
            {/* Base high-res image */}
            <img
              src={imageUrl}
              alt="Base original"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[45vh] object-contain pointer-events-none rounded-xl"
              style={{ display: showOriginal ? "block" : "block" }}
            />

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
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full max-h-[45vh] object-contain rounded-xl border border-blue-500/10 cursor-crosshair ${
                showOriginal ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            />

            {/* Simulated loading screen */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-white p-6 rounded-xl animate-fade-in z-20">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-semibold tracking-wide">{progressMsg}</p>
                <p className="text-xs text-gray-400 mt-2">预计耗时 4s · 请保持页面打开</p>
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
        <div className="w-full md:w-[320px] p-6 flex flex-col justify-between">
          <div className="space-y-6">
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

            {/* Modification prompt textarea */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800">2. 输入局部修改要求</h4>
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
          <div className="pt-6 border-t border-gray-100 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-xs font-semibold hover:bg-gray-50 transition"
            >
              取消
            </button>
            <button
              onClick={handleApplyChanges}
              disabled={isProcessing || !prompt.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              应用修改
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
