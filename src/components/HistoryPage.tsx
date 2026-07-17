import React from "react";
import { Task, Project } from "../types";
import { Search, Calendar, Heart, Trash2, Sliders, Check, Eye, History, FolderOpen, Shapes } from "lucide-react";
import CustomSelect from "./CustomSelect";

interface HistoryPageProps {
  tasks: Task[];
  projects: Project[];
  onRestoreParams: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleFavorite?: (taskId: string) => void;
  onPreviewTask?: (task: Task) => void;
}

export default function HistoryPage({
  tasks,
  projects,
  onRestoreParams,
  onDeleteTask,
  onToggleFavorite,
  onPreviewTask
}: HistoryPageProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedProjectType, setSelectedProjectType] = React.useState("all");
  const [selectedVisualType, setSelectedVisualType] = React.useState("all");
  const [onlyFavorites, setOnlyFavorites] = React.useState(false);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [restoredId, setRestoredId] = React.useState<string | null>(null);

  // Load favorites from localstorage if possible, or maintain in state
  React.useEffect(() => {
    const savedFavs = localStorage.getItem("badigao_favorites");
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    }
  }, []);

  const handleToggleFavorite = (taskId: string) => {
    let updated;
    if (favorites.includes(taskId)) {
      updated = favorites.filter(id => id !== taskId);
    } else {
      updated = [...favorites, taskId];
    }
    setFavorites(updated);
    localStorage.setItem("badigao_favorites", JSON.stringify(updated));
    if (onToggleFavorite) onToggleFavorite(taskId);
  };

  const handleRestore = (task: Task) => {
    onRestoreParams(task);
    setRestoredId(task.taskId);
    setTimeout(() => setRestoredId(null), 2000);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchSearch =
      task.originalPrompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.optimizedPrompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.scene && task.scene.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.replacementMode && task.replacementMode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      task.productFunctions.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchProject = selectedProjectType === "all" || task.projectId === selectedProjectType;
    const matchVisual = selectedVisualType === "all" || task.visualType === selectedVisualType;
    const matchFav = !onlyFavorites || favorites.includes(task.taskId);

    return matchSearch && matchProject && matchVisual && matchFav;
  });

  return (
    <div id="history-page" className="max-w-7xl mx-auto px-4 py-8 space-y-6 text-gray-800">
      
      {/* Header and Counters */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50 p-6 shadow-[0_16px_45px_-28px_rgba(37,99,235,0.55)]">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <History className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-flex rounded-full border border-blue-100 bg-white/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-blue-600">内容档案</span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">生成历史记录</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                自动保存每一次视觉生成结果及完整参数快照，方便随时查看、恢复参数和再次使用。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[340px]">
            {[
              { label: "全部记录", value: tasks.length, unit: "次", color: "text-slate-900" },
              { label: "筛选结果", value: filteredTasks.length, unit: "条", color: "text-blue-600" },
              { label: "已收藏", value: favorites.length, unit: "个", color: "text-pink-600" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/80 bg-white/75 px-3 py-3 backdrop-blur-sm shadow-sm">
                <p className="text-[10px] font-medium text-slate-400">{stat.label}</p>
                <p className={`mt-1 text-lg font-bold ${stat.color}`}>{stat.value}<span className="ml-1 text-[10px] font-medium text-slate-400">{stat.unit}</span></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter and Search controls */}
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_12px_35px_-25px_rgba(15,23,42,0.4)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">筛选历史记录</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">通过关键词、项目和视觉类型快速定位结果</p>
          </div>
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border transition ${
              onlyFavorites
                ? "bg-pink-50 border-pink-200 text-pink-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:border-pink-200 hover:text-pink-600"
            }`}
          >
            <Heart className={`w-4 h-4 ${onlyFavorites ? "fill-pink-600 text-pink-600" : ""}`} />
            仅看收藏
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索提示词、场景、功能卖点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm placeholder-slate-400 transition focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        {/* Project select */}
        <CustomSelect
          value={selectedProjectType}
          onChange={setSelectedProjectType}
          ariaLabel="筛选项目"
          icon={<FolderOpen className="h-4 w-4 shrink-0 text-slate-400" />}
          buttonClassName="rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-700"
          options={[
            { value: "all", label: "所有项目", description: "查看全部项目的历史记录" },
            ...projects.map((project) => ({ value: project.id, label: project.name })),
          ]}
        />

        {/* Visual Type select */}
        <CustomSelect
          value={selectedVisualType}
          onChange={setSelectedVisualType}
          ariaLabel="筛选视觉类型"
          icon={<Shapes className="h-4 w-4 shrink-0 text-slate-400" />}
          buttonClassName="rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-700"
          options={[
            { value: "all", label: "所有视觉类型", description: "查看全部视觉类型" },
            { value: "A", label: "A 类：品牌情绪与生活方式", description: "突出品牌氛围与生活方式" },
            { value: "B", label: "B 类：真实使用与功能证据", description: "通过真实动作表现功能" },
            { value: "C", label: "C 类：产品功能与卖点特写", description: "聚焦产品细节与卖点" },
            { value: "R", label: "替换模式：参考图定向替换", description: "锁定参考维度并替换指定内容" },
          ]}
        />

        </div>
      </section>

      {/* Grid of task cards */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="text-4xl text-gray-300">🕭</div>
          <p className="text-gray-400 text-sm">暂无符合筛选条件的生成纪录。</p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedProjectType("all");
              setSelectedVisualType("all");
              setOnlyFavorites(false);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2 rounded-xl transition"
          >
            重置筛选条件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => {
            const project = projects.find(p => p.id === task.projectId);
            const formattedDate = new Date(task.createdAt).toLocaleString("zh-CN", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });
            const isFav = favorites.includes(task.taskId);

            return (
              <div
                key={task.taskId}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-gray-200 transition duration-300 group relative"
              >
                {/* Image Cover/Grid */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                  {task.results && task.results.length > 0 ? (
                    <div className="grid grid-cols-2 w-full h-full gap-0.5">
                      {task.results.slice(0, 4).map((imgUrl, i) => (
                        <div key={i} className="relative overflow-hidden w-full h-full bg-slate-800">
                          {imgUrl && <img
                            src={imgUrl}
                            alt={`Result ${i + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />}
                        </div>
                      ))}
                      {/* Overlay count indicator if more than 4 */}
                      {task.results.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold pointer-events-none">
                          +{task.results.length - 4} 张
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 font-mono">生成失败/未完成</div>
                  )}

                  {/* Badges on Cover */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                    <span className="text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                      {task.visualType === "R" ? "替换模式" : `${task.visualType}类视觉`}
                    </span>
                    {task.replacementMode && task.visualType === "R" && (
                      <span className="text-[10px] font-semibold text-white bg-violet-600/85 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {task.replacementMode}
                      </span>
                    )}
                    {task.scene && (
                      <span className="text-[10px] font-semibold text-white bg-blue-600/85 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {task.scene}
                      </span>
                    )}
                    {task.productFunctions && task.productFunctions.length > 0 && (
                      <span className="text-[10px] font-semibold text-white bg-green-600/85 px-2 py-0.5 rounded-full backdrop-blur-sm truncate max-w-[120px]">
                        {task.productFunctions.slice(0, 2).join('/')}
                      </span>
                    )}
                  </div>

                  {/* Favorite heart on Cover */}
                  <button
                    onClick={() => handleToggleFavorite(task.taskId)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 shadow-sm hover:bg-white text-gray-400 hover:text-pink-600 transition"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-pink-600 text-pink-600" : ""}`} />
                  </button>
                </div>

                {/* Card Content info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Project and Date header */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                      <span className="truncate max-w-[140px] font-semibold text-slate-700">
                        📁 {project ? project.name : "未知项目"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Optimized description */}
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 mt-2 leading-relaxed">
                      {task.originalPrompt || "（无补充描述，默认AI生成）"}
                    </p>

                    {/* Parameters list pills */}
                    <div className="flex flex-wrap gap-1.5 mt-3 text-[10px] text-gray-500">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">{task.shotScale}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">{task.cameraAngle}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">{task.tone}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">{task.aspectRatio}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">{task.resolution}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                    {/* View Details */}
                    <button
                      onClick={() => onPreviewTask && onPreviewTask(task)}
                      className="flex-1 text-[11px] font-semibold border border-gray-200 text-gray-700 py-1.5 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      查看大图
                    </button>

                    {/* Restore Params */}
                    <button
                      onClick={() => handleRestore(task)}
                      className="flex-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg transition flex items-center justify-center gap-1"
                    >
                      {restoredId === task.taskId ? (
                        <>
                          <Check className="w-3 h-3" />
                          已恢复
                        </>
                      ) : (
                        <>
                          <Sliders className="w-3 h-3" />
                          克隆参数
                        </>
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm("确定要删除这条生成历史记录吗？")) {
                          onDeleteTask(task.taskId);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="删除记录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
