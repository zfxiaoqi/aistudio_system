# 巴迪高品牌视觉工作台

面向品牌商业视觉生产的本地 Web 工作台。用户可以上传产品图、人物图和风格参考图，配置视觉类型、场景、镜头、色调、比例与输出尺寸，生成结构化中英文提示词，并通过 Gemini 图片模型生成视觉结果。

## 核心能力

- 产品主图、人物形象图与最多 5 张风格参考图
- 风格参考图高、中、低权重配置
- A/B/C 三类品牌视觉方案
- 场景、景别、镜头角度、画幅、色调和生成张数配置
- 中文提示词展示、英文提示词复制与实际生图
- Gemini 多模态参考图生图
- 生成结果、参考素材和参数快照对比
- 本地生成历史与参数恢复
- 单张上传上限 20 MB

## 本地运行

环境要求：Node.js 20 或更高版本。

```bash
npm install
```

复制 `.env.example` 为 `.env.local`，填写服务端密钥：

```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GEMINI_IMAGE_MODEL="gemini-3-pro-image"
```

启动项目：

```bash
npm run dev
```

浏览器打开：

```text
http://127.0.0.1:3000/
```

检查 Gemini 配置状态：

```text
http://127.0.0.1:3000/api/gemini/status
```

## Gemini 生图链路

前端只调用本地接口：

```text
POST /api/gemini/generate-images
```

服务端通过 `GEMINI_API_KEY` 调用 `gemini-3-pro-image`，将提示词和参考图作为多模态内容提交。API Key 不会发送到浏览器，也不会被打包到前端资源中。

参考图职责：

- 产品主图：锁定产品版型、颜色、纹理和结构
- 产品细节图：补充面料、缝线与局部工艺
- 人物图：控制人物身份与外观一致性
- 风格图：只影响构图、光影、色彩、影调和氛围

部分贴身服饰、人体局部或敏感描述可能触发 Gemini 的 `IMAGE_SAFETY`。这属于模型安全策略，不代表接口配置失败。

## 常用命令

```bash
npm run dev
npm run lint
npm run build
npm start
```

## 安全说明

- `.env.local`、生成图片、日志、依赖目录和构建产物均不会提交到 Git。
- 不要在前端代码中使用 `VITE_GEMINI_API_KEY` 或任何公开 API Key。
- 如果密钥曾出现在聊天、日志或截图中，请在正式使用前重新生成。
