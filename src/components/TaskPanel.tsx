import React from "react";
import { Project, Task } from "../types";
import { Eye, Layers, Clock, Settings, FileImage, User, HelpCircle, Trash2 } from "lucide-react";

interface TaskPanelProps {
  project: Project;
  recentTasks: Task[];
  onSelectTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskPanel({
  project,
  recentTasks,
  onSelectTask,
  onDeleteTask
}: TaskPanelProps) {
  return (
    <div id="task-panel" className="w-[280px] bg-white border-l border-gray-100 h-full flex flex-col justify-between overflow-y-auto text-gray-800 select-none">
      
      {/* Top Section: Active Configuration details */}
      <div className="p-5 space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            📋 资产快照
          </h3>
          <p className="text-xs text-gray-400 mt-1 leading-normal">
            当前项目上传的各打底素材与设定快照。
          </p>
        </div>

        {/* Uploaded Count summaries */}
        <div className="space-y-3">
          
          {/* Products count */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-2">
              <FileImage className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-gray-700">打底产品图</span>
            </div>
            <span className="text-xs font-mono font-bold text-gray-900">{project.productImages.length} 张</span>
          </div>

          {/* Model count */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-green-500" />
              <span className="text-xs font-semibold text-gray-700">参考人物图</span>
            </div>
            <span className="text-xs font-mono font-bold text-gray-900">{project.characterImages.length} 张</span>
          </div>

          {/* Reference count */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-semibold text-gray-700">参考风格图</span>
            </div>
            <span className="text-xs font-mono font-bold text-gray-900">{project.referenceImages.length} / 5 张</span>
          </div>

        </div>

        {/* Current prompt summary */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">当前描述摘要</span>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-500 leading-relaxed italic line-clamp-3">
            {project.originalPrompt || "（暂无补充描述，将依据核心视觉类型自动生成精致词汇）"}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent visual task history list */}
      <div className="p-5 border-t border-gray-100 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              🕒 最近生成队列
            </h4>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
              {recentTasks.length} 个
            </span>
          </div>

          {recentTasks.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-100">
              <Clock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-[10px] text-gray-400">当前没有最近生成的任务记录</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
              {recentTasks.slice(0, 5).map((task) => (
                <div
                  key={task.taskId}
                  className="p-2.5 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 transition flex items-center justify-between group"
                >
                  <div
                    onClick={() => onSelectTask(task)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                      <span>{new Date(task.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className={`font-bold uppercase ${task.status === "completed" ? "text-green-600" : "text-blue-500"}`}>
                        {task.status === "completed" ? "完成" : "生成中"}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700 truncate mt-1">
                      {task.originalPrompt || `${task.visualType}类视觉 · ${task.scene || '功能卖点'}`}
                    </p>
                  </div>
                  
                  {/* Delete task */}
                  <button
                    onClick={() => {
                      if (confirm("确定要删除这条生成历史吗？")) {
                        onDeleteTask(task.taskId);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Small tips badge */}
        <div className="pt-4 border-t border-gray-100/60 mt-4 flex items-center gap-2 text-[10px] text-gray-400">
          <HelpCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>双击中央卡片放大，拖拽图片可在高倍缩放时进行平移。</span>
        </div>
      </div>

    </div>
  );
}
