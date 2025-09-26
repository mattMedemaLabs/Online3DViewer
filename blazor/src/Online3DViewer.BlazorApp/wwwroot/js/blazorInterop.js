// blazor/src/Online3DViewer.BlazorApp/wwwroot/js/blazorInterop.ts
var viewerRegistry = /* @__PURE__ */ new Map();
var viewerIdSeed = 1;
var enginePromise = null;
async function loadEngine() {
  if (!enginePromise) {
    enginePromise = import("../lib/o3dv/o3dv.module.js");
  }
  return enginePromise;
}
function ensureContainer(canvasId) {
  const element = document.getElementById(canvasId);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Viewer container '${canvasId}' was not found or is not an element.`);
  }
  element.innerHTML = "";
  element.classList.add("ov-viewer-host");
  return element;
}
function applyTheme(element, theme) {
  element.dataset["ovTheme"] = theme ?? "dark";
  element.classList.toggle("ov-theme-dark", !theme || theme === "dark");
  element.classList.toggle("ov-theme-light", theme === "light");
}
function applyFixedSize(element, size) {
  if (size) {
    element.style.width = `${size.width}px`;
    element.style.height = `${size.height}px`;
  } else {
    element.style.removeProperty("width");
    element.style.removeProperty("height");
  }
}
function getViewerFromHandle(handle) {
  const entry = viewerRegistry.get(handle.id);
  if (!entry) {
    throw new Error(`Viewer handle ${handle.id} is not registered.`);
  }
  return entry;
}
async function createViewer(canvasId, options = {}) {
  const engine = await loadEngine();
  const container = ensureContainer(canvasId);
  applyTheme(container, options.theme);
  applyFixedSize(container, options.fixedCanvasSize ?? null);
  const viewer = new engine.EmbeddedViewer(container, {});
  const handle = { id: viewerIdSeed++ };
  viewerRegistry.set(handle.id, { container, viewer });
  if (options.initialModelUrls && options.initialModelUrls.length > 0) {
    viewer.LoadModelFromUrlList(options.initialModelUrls);
  }
  return handle;
}
async function loadUrls(handle, urls) {
  if (!urls || urls.length === 0) {
    return;
  }
  await loadEngine();
  const { viewer } = getViewerFromHandle(handle);
  viewer.LoadModelFromUrlList(urls);
}
async function loadFiles(handle, fileDescriptors) {
  if (!fileDescriptors || fileDescriptors.length === 0) {
    return;
  }
  await loadEngine();
  const { viewer } = getViewerFromHandle(handle);
  const files = [];
  for (const descriptor of fileDescriptors) {
    const buffer = await descriptor.stream.arrayBuffer();
    files.push(new File([buffer], descriptor.name));
    descriptor.stream.dispose?.();
  }
  viewer.LoadModelFromFileList(files);
}
async function disposeViewer(handle) {
  const entry = viewerRegistry.get(handle.id);
  if (!entry) {
    return;
  }
  viewerRegistry.delete(handle.id);
  entry.container.innerHTML = "";
}
export {
  createViewer,
  disposeViewer,
  loadFiles,
  loadUrls
};
//# sourceMappingURL=blazorInterop.js.map
