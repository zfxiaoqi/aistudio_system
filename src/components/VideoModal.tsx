import React from "react";
import { X, Play, Pause, Download, RefreshCw, Film, Sparkles, AlertCircle } from "lucide-react";
import CustomSelect from "./CustomSelect";

interface VideoModalProps {
  imageUrl: string;
  onClose: () => void;
  onSaveVideo: (imageUrl: string, videoUrl: string, motion: string, duration: number, strength: string) => void;
}

export default function VideoModal({ imageUrl, onClose, onSaveVideo }: VideoModalProps) {
  const [motion, setMotion] = React.useState("镜头推进");
  const [duration, setDuration] = React.useState(5);
  const [strength, setStrength] = React.useState("标准");
  const [prompt, setPrompt] = React.useState("");
  const [keepCharacter, setKeepCharacter] = React.useState(true);
  const [keepProduct, setKeepProduct] = React.useState(true);
  const [loop, setLoop] = React.useState(true);
  
  // Generating State
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [progressMsg, setProgressMsg] = React.useState("");
  const [generatedVideo, setGeneratedVideo] = React.useState<string | null>(null);

  // Playing State
  const [isPlaying, setIsPlaying] = React.useState(true);

  const handleGenerateVideo = () => {
    setIsGenerating(true);
    setProgressMsg("正在初始化 Veo-3.1 视频生成器...");

    setTimeout(() => {
      setProgressMsg("提取静态图片边缘深度图与透视向量...");
      setTimeout(() => {
        setProgressMsg(`应用运动航线: [${motion}] · 强度: [${strength}]...`);
        setTimeout(() => {
          setProgressMsg("面料张力、褶皱与阴影运动学计算...");
          setTimeout(() => {
            setProgressMsg("正在合成 1080p 视频帧层...");
            setTimeout(() => {
              // Successfully generated simulated video
              setIsGenerating(false);
              // Store simulated video state (which triggers CSS pan/zoom in the playback pane)
              setGeneratedVideo(imageUrl);
            }, 1500);
          }, 1200);
        }, 1200);
      }, 1000);
    }, 800);
  };

  const handleDownload = () => {
    // Generate a simple anchor download link for the mock video
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `BADIGAO_Video_${motion}_${duration}s.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToHistory = () => {
    onSaveVideo(imageUrl, imageUrl, motion, duration, strength);
    onClose();
  };

  // Determine CSS class for the playing simulated video based on chosen motion vector
  const getMotionStyle = () => {
    if (!isPlaying) return {};
    
    let animationStyle: React.CSSProperties = {};
    const strengthMultiplier = strength === "轻微" ? 0.3 : strength === "明显" ? 2 : 1;
    
    switch (motion) {
      case "镜头推进":
        animationStyle = {
          transform: `scale(${1.15 * strengthMultiplier})`,
          transition: `transform ${duration}s ease-in-out infinite alternate`
        };
        break;
      case "镜头拉远":
        animationStyle = {
          transform: `scale(${0.85 / strengthMultiplier})`,
          transition: `transform ${duration}s ease-in-out infinite alternate`
        };
        break;
      case "横向移动":
        animationStyle = {
          transform: `translateX(${25 * strengthMultiplier}px) scale(1.05)`,
          transition: `transform ${duration}s ease-in-out infinite alternate`
        };
        break;
      case "环绕运动":
        animationStyle = {
          transform: `rotate(${3 * strengthMultiplier}deg) scale(1.08)`,
          transition: `transform ${duration}s ease-in-out infinite alternate`
        };
        break;
      case "人物微动":
        animationStyle = {
          filter: "saturate(1.05)",
          transform: `translateY(${8 * strengthMultiplier}px) scale(1.03)`,
          transition: `transform ${duration / 2}s ease-in-out infinite alternate`
        };
        break;
      default:
        animationStyle = {
          transform: "scale(1.1)",
          transition: `transform ${duration}s ease-in-out infinite alternate`
        };
    }
    return animationStyle;
  };

  return (
    <div id="video-modal" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[90vh]">
        
        {/* Left Col: Interactive Video Player Viewport */}
        <div className="flex-1 p-6 bg-slate-900 flex flex-col justify-between text-white relative min-h-[360px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold tracking-wide flex items-center gap-1.5 text-blue-400">
              <Film className="w-4 h-4" />
              巴迪高 视频工作台 (Veo-3.1 Video Engine)
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">
              {generatedVideo ? "视频就绪 (MP4)" : "静止首帧预备"}
            </span>
          </div>

          {/* Interactive Player Window */}
          <div className="flex-1 flex items-center justify-center relative my-6 rounded-xl overflow-hidden bg-slate-950 shadow-inner">
            {/* The Image being animated */}
            <div className="w-full h-full overflow-hidden flex items-center justify-center relative">
              <img
                src={imageUrl}
                alt="Simulated video viewport"
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[45vh] object-contain rounded-xl select-none"
                style={generatedVideo ? getMotionStyle() : {}}
              />
            </div>

            {/* Video Watermark or Playback Controls if ready */}
            {generatedVideo && (
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4 z-10">
                {/* Playhead */}
                <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-full py-1.5 px-3 flex items-center gap-3 border border-slate-800">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1 rounded-full hover:bg-white/10 text-white transition active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                    <div
                      className="absolute top-0 left-0 bg-blue-500 h-full rounded-full"
                      style={{
                        width: isPlaying ? "100%" : "30%",
                        transition: isPlaying ? `width ${duration}s linear infinite` : "none"
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-300">0:0{duration} / 0:0{duration}</span>
                </div>
              </div>
            )}

            {/* Generating State Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 z-20">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs font-semibold tracking-wide text-slate-100">{progressMsg}</p>
                <p className="text-[10px] text-slate-500 mt-2">AI 正在根据运动矢量计算光影与褶皱流动，请稍候...</p>
              </div>
            )}
          </div>

          {/* Player controls metadata */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>分辨率: 1080p</span>
            <span>编码格式: H.264</span>
            <span>帧率: 30 FPS</span>
          </div>
        </div>

        {/* Right Col: Parameters controls and trigger */}
        <div className="w-full md:w-[320px] p-6 flex flex-col justify-between bg-white text-gray-800">
          <div className="space-y-5">
            {/* Title Close */}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-blue-600">Veo 运动参数设置</span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Motion type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">🎥 运动镜头路线</label>
              <div className="grid grid-cols-2 gap-2">
                {["镜头推进", "镜头拉远", "横向移动", "环绕运动", "人物微动"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMotion(m)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition ${
                      motion === m
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration and strength */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">⌚ 视频时长</label>
                <CustomSelect
                  value={String(duration)}
                  onChange={(value) => setDuration(Number(value))}
                  ariaLabel="选择视频时长"
                  buttonClassName="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                  options={[
                    { value: "5", label: "5 秒（推荐）" },
                    { value: "8", label: "8 秒" },
                    { value: "10", label: "10 秒" },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">⚡ 运动强度</label>
                <CustomSelect
                  value={strength}
                  onChange={setStrength}
                  ariaLabel="选择运动强度"
                  buttonClassName="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                  options={[
                    { value: "轻微", label: "轻微", description: "自然细微运动" },
                    { value: "标准", label: "标准", description: "平衡自然与可见度" },
                    { value: "明显", label: "明显", description: "更清晰的运动变化" },
                  ]}
                />
              </div>
            </div>

            {/* User instructions text area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">补充视频描述 (选填)</label>
              <textarea
                placeholder="例如：海风轻轻吹拂衣服，裙摆自然飘动，背景海浪缓慢翻滚。"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed resize-none"
              />
            </div>

            {/* Consistency toggles */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">保持人物特征一致</span>
                <input
                  type="checkbox"
                  checked={keepCharacter}
                  onChange={(e) => setKeepCharacter(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">锁死产品颜色与Logo</span>
                <input
                  type="checkbox"
                  checked={keepProduct}
                  onChange={(e) => setKeepProduct(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="pt-6 border-t border-gray-100 space-y-2">
            {!generatedVideo ? (
              <button
                onClick={handleGenerateVideo}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                生成品牌宣传视频
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleSaveToHistory}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1"
                >
                  保存至项目媒体库
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 border border-gray-200 text-gray-700 font-semibold text-xs py-2.5 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下载视频
                  </button>
                  <button
                    onClick={() => setGeneratedVideo(null)}
                    className="flex-1 border border-gray-200 text-gray-700 font-semibold text-xs py-2.5 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    重设
                  </button>
                </div>
              </div>
            )}
            
            <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3 text-gray-400" />
              当前静态帧将锁死为视频第一帧首帧
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
