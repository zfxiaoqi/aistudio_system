import React from "react";
import { BrandAsset, BrandColor } from "../types";
import { Copy, Check, Palette, Award, FileText, Download, CheckCircle2 } from "lucide-react";

interface BrandAssetsPageProps {
  onApplyPromptTemplate: (content: string) => void;
  onApplyColorPalette: (tone: '米色调' | '蓝色调') => void;
}

const BADIGAO_BRAND_ASSETS: BrandAsset = {
  logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200",
  colors: [
    { name: "巴迪高经典深蓝 (Badigao Signature Navy)", hex: "#0F1E36" },
    { name: "巴迪高舒雅海蓝 (Badigao Ocean Blue)", hex: "#2A4B7C" },
    { name: "巴迪高温和棉米 (Badigao Cotton Beige)", hex: "#F5ECE1" },
    { name: "巴迪高柔和乳白 (Badigao Warm Milky)", hex: "#FAF8F5" },
    { name: "巴迪高活力橙红 (Badigao Coral Orange)", hex: "#F05A4A" },
    { name: "巴迪高科技炭灰 (Badigao Tech Charcoal)", hex: "#1F2937" }
  ],
  fonts: ["Inter (主要UI与正文)", "Space Grotesk (大标题及科技卖点)", "JetBrains Mono (工艺参数与数值)"],
  productTemplates: [
    { id: "p1", name: "无缝运动系列主打款", url: "https://images.unsplash.com/photo-1571945153237-4929e78394a9?q=80&w=400" },
    { id: "p2", name: "高弹一次性差旅内裤", url: "https://images.unsplash.com/photo-1626290058507-f23004a18037?q=80&w=400" },
    { id: "p3", name: "抑菌母婴级日常内衣", url: "https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=400" }
  ],
  promptTemplates: [
    {
      id: "pt1",
      title: "高端轻运动 Lookbook 极简风",
      content: "巴迪高无缝运动内衣，浅米灰色纯棉面料，摄影棚专业双柔光箱，清澈透亮。高低深浅的柔和阴影，50mm镜头特写，突出微孔针织呼吸纤维和侧边精细双明线锁边工艺，高饱和极简调性。"
    },
    {
      id: "pt2",
      title: "草坪户外健康活力阳光大片",
      content: "清晨和煦的侧逆日光，模特身着巴迪高云感高弹运动内衣，在晨雾缭绕的开阔绿色草坪上专注舒展身形。镜头带有微妙的边缘虚化和胶片颗粒感，突出内衣极佳的弹力拉伸状态与不勒腰的高弹腰边设计。"
    },
    {
      id: "pt3",
      title: "海滨瑜伽自然松弛纪实镜头",
      content: "海浪轻拍礁石，午后温润海风吹佛。健美女孩微笑着盘腿静修，柔和海蓝影调，自然漫射光。突出一次性棉内裤贴合而不卡裆、3D人体工学剪裁的舒适轮廓，呈现真实无修饰的健康生活方式大片。"
    }
  ]
};

export default function BrandAssetsPage({ onApplyPromptTemplate, onApplyColorPalette }: BrandAssetsPageProps) {
  const [copiedColor, setCopiedColor] = React.useState<string | null>(null);
  const [showAppliedToast, setShowAppliedToast] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(id);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const handleApplyTemplate = (content: string, title: string) => {
    onApplyPromptTemplate(content);
    setShowAppliedToast(title);
    setTimeout(() => setShowAppliedToast(null), 2500);
  };

  return (
    <div id="brand-assets-page" className="max-w-7xl mx-auto px-4 py-8 space-y-10 text-gray-800">
      {/* Dynamic Action Toast */}
      {showAppliedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-blue-400 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>已将模板 “{showAppliedToast}” 应用至视觉生成提示词</span>
        </div>
      )}

      {/* Header Section */}
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 font-sans flex items-center gap-3">
          <Award className="w-8 h-8 text-blue-600" />
          巴迪高 (BADIGAO) 品牌视觉资产
        </h1>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-3xl">
          官方品牌形象规范。此处汇集了巴迪高品牌标准色、推荐字体、主推商品打底模板以及高转化率的AI摄影创意提示词。您可一键应用这些视觉参数，确保所有AI视觉图片的高保真一致性。
        </p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Brand identity, logo & fonts */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Brand Identity / Logo */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Check className="w-5 h-5 text-blue-600" /> 品牌标识与形象
            </h2>
            <div className="border border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50">
              <span className="font-extrabold text-2xl tracking-widest text-slate-900 font-sans">
                BADIGAO <span className="text-blue-600 text-sm font-normal">巴迪高</span>
              </span>
              <p className="text-xs text-gray-400 mt-2">一次性高弹内卫服饰引领者</p>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• 品牌口号：舒享旅途，无感贴合</p>
              <p>• 产品定位：母婴级、高强弹性、速干抑菌、舒雅透气</p>
            </div>
          </div>

          {/* Type Typography */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-medium text-gray-900">
              🗚 品牌专属字体 pairing
            </h2>
            <div className="space-y-3">
              {BADIGAO_BRAND_ASSETS.fonts.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-mono text-xs font-semibold text-slate-700">{f.split(' ')[0]}</span>
                  <span className="text-xs text-gray-500">{f.slice(f.indexOf('('))}</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-blue-50/50 rounded-xl text-xs text-blue-800 leading-relaxed">
              <strong>排版指南：</strong> 在商业海报上，大字功能科技点首选 <strong>Space Grotesk</strong>，细节参数用 <strong>JetBrains Mono</strong> 极客风展示，正文使用 <strong>Inter</strong>。
            </div>
          </div>

        </div>

        {/* Right Col: Standard Colors & Prompt Templates */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Colors Specification */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-blue-600" />
              品牌标准色彩系统 (Standard Palettes)
            </h2>
            <p className="text-xs text-gray-400 -mt-2">
              点击下方色彩卡片，可直接复制标准色值；或一键应用品牌色调系统到工作台。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BADIGAO_BRAND_ASSETS.colors.map((color, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg shadow-inner border border-gray-100" style={{ backgroundColor: color.hex }} />
                    <div>
                      <p className="text-xs font-medium text-gray-800">{color.name}</p>
                      <p className="text-xs font-mono text-gray-400">{color.hex}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(color.hex, `color-${idx}`)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition"
                    title="复制16进制色值"
                  >
                    {copiedColor === `color-${idx}` ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => {
                  onApplyColorPalette('蓝色调');
                  setShowAppliedToast('经典深蓝/海蓝系统');
                }}
                className="flex-1 bg-blue-50 text-blue-700 font-medium px-4 py-3 rounded-xl text-xs hover:bg-blue-100 transition flex items-center justify-center gap-2"
              >
                <div className="w-3 h-3 rounded-full bg-blue-800" />
                应用「舒雅蓝色调」系统至工作台
              </button>
              <button
                onClick={() => {
                  onApplyColorPalette('米色调');
                  setShowAppliedToast('温和棉米/乳白系统');
                }}
                className="flex-1 bg-amber-50 text-amber-800 font-medium px-4 py-3 rounded-xl text-xs hover:bg-amber-100 transition flex items-center justify-center gap-2"
              >
                <div className="w-3 h-3 rounded-full bg-orange-200" />
                应用「温和温润米色调」至工作台
              </button>
            </div>
          </div>

          {/* AI Creative Prompts Templates */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              创意大师摄影模板 (AI Studio Curated Prompts)
            </h2>
            <div className="space-y-4">
              {BADIGAO_BRAND_ASSETS.promptTemplates.map((template) => (
                <div key={template.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-100 transition space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {template.title}
                    </h3>
                    <button
                      onClick={() => handleApplyTemplate(template.content, template.title)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      导入创意工作台
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {template.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Main product gallery templates */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-lg font-medium text-gray-900">
          巴迪高 主推产品实物图打底模板 (Product PNG Templates)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BADIGAO_BRAND_ASSETS.productTemplates.map((prod) => (
            <div key={prod.id} className="group relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 hover:shadow-md transition">
              {prod.url && <img
                src={prod.url}
                alt={prod.name}
                referrerPolicy="no-referrer"
                className="w-full h-48 object-cover group-hover:scale-105 transition duration-500"
              />}
              <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 truncate max-w-[80%]">{prod.name}</span>
                <span className="text-[10px] text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                  2026版
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
