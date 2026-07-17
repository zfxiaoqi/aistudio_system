import type { ImageAsset, Project, ReferenceImage, Task } from "../types";

const DB_NAME = "badigao-image-assets";
const STORE_NAME = "images";
const DB_VERSION = 1;

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("图片存储初始化失败。"));
  });
}

export async function saveImageData(storageKey: string, dataUrl: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(dataUrl, storageKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("图片保存失败。"));
  });
  database.close();
}

export async function loadImageData(storageKey: string) {
  const database = await openDatabase();
  const result = await new Promise<string | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(storageKey);
    request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : undefined);
    request.onerror = () => reject(request.error || new Error("图片读取失败。"));
  });
  database.close();
  return result;
}

export async function deleteImageData(storageKey?: string) {
  if (!storageKey) return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(storageKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("图片删除失败。"));
  });
  database.close();
}

async function hydrateAsset<T extends ImageAsset | ReferenceImage>(asset: T): Promise<T> {
  let storageKey = asset.storageKey;
  if (asset.url.startsWith("data:image/") && !storageKey) {
    storageKey = `image-${asset.id}`;
    await saveImageData(storageKey, asset.url);
  }
  if ((!asset.url || !asset.url.startsWith("data:image/")) && storageKey) {
    const dataUrl = await loadImageData(storageKey);
    if (dataUrl) return { ...asset, storageKey, url: dataUrl };
  }
  return storageKey ? { ...asset, storageKey } : asset;
}

export async function hydrateProjectImages(projects: Project[]) {
  return Promise.all(projects.map(async (project) => {
    const hydrateWorkspace = async (workspace: Project["creativeWorkspace"]) => workspace ? ({
      ...workspace,
      productImages: await Promise.all(workspace.productImages.map(hydrateAsset)),
      characterImages: await Promise.all(workspace.characterImages.map(hydrateAsset)),
      referenceImages: await Promise.all(workspace.referenceImages.map(hydrateAsset)),
    }) : undefined;
    return {
      ...project,
      productImages: await Promise.all(project.productImages.map(hydrateAsset)),
      characterImages: await Promise.all(project.characterImages.map(hydrateAsset)),
      referenceImages: await Promise.all(project.referenceImages.map(hydrateAsset)),
      creativeWorkspace: await hydrateWorkspace(project.creativeWorkspace),
      replacementWorkspace: await hydrateWorkspace(project.replacementWorkspace),
    };
  }));
}

export function serializeProjectsWithoutImagePayloads(projects: Project[]) {
  const strip = <T extends ImageAsset | ReferenceImage>(asset: T): T => ({
    ...asset,
    url: asset.url.startsWith("data:image/") ? "" : asset.url,
  });
  return projects.map((project) => {
    const stripWorkspace = (workspace: Project["creativeWorkspace"]) => workspace ? ({
      ...workspace,
      productImages: workspace.productImages.map(strip),
      characterImages: workspace.characterImages.map(strip),
      referenceImages: workspace.referenceImages.map(strip),
    }) : undefined;
    return {
      ...project,
      productImages: project.productImages.map(strip),
      characterImages: project.characterImages.map(strip),
      referenceImages: project.referenceImages.map(strip),
      creativeWorkspace: stripWorkspace(project.creativeWorkspace),
      replacementWorkspace: stripWorkspace(project.replacementWorkspace),
    };
  });
}

export function serializeTasksWithoutImagePayloads(tasks: Task[]) {
  const stripDataUrl = (url: string) => url.startsWith("data:image/") ? "" : url;

  return tasks.map((task) => ({
    ...task,
    productImages: task.productImages.map(stripDataUrl),
    characterImages: task.characterImages.map(stripDataUrl),
    referenceImages: task.referenceImages.map((reference) => ({
      ...reference,
      url: stripDataUrl(reference.url),
    })),
    results: task.results.map(stripDataUrl),
    editVersions: Object.fromEntries(
      Object.entries(task.editVersions)
        .filter(([sourceUrl]) => !sourceUrl.startsWith("data:image/"))
        .map(([sourceUrl, versions]) => [sourceUrl, versions.map(stripDataUrl).filter(Boolean)]),
    ),
  }));
}
