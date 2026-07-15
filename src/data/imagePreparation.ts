export interface PreparedImage {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  originalBytes: number;
}

const MAX_IMAGE_DIMENSION = 1600;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败，请重新选择。"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片无法解析，请使用 JPG、PNG 或 WebP。"));
    image.src = dataUrl;
  });
}

export async function prepareImageForReference(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("只能上传图片文件。");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("单张图片不能超过 20MB。");

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理该图片。");

  context.drawImage(image, 0, 0, width, height);
  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const dataUrl = canvas.toDataURL(mimeType, 0.86);

  return { dataUrl, mimeType, width, height, originalBytes: file.size };
}
