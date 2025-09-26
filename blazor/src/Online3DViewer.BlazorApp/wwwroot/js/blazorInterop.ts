type EngineModule = typeof import('../lib/o3dv/o3dv.module.js');

type EmbeddedViewer = InstanceType<EngineModule['EmbeddedViewer']>;

interface ViewerRegistryEntry {
    container: HTMLElement;
    viewer: EmbeddedViewer;
}

export interface ViewerHandle {
    id: number;
}

export interface ViewerCreateOptions {
    initialModelUrls?: string[];
    theme?: string;
    fixedCanvasSize?: { width: number; height: number } | null;
}

interface FileStreamDescriptor {
    name: string;
    stream: {
        arrayBuffer: () => Promise<ArrayBuffer>;
        dispose?: () => void;
    };
}

const viewerRegistry = new Map<number, ViewerRegistryEntry>();
let viewerIdSeed = 1;
let enginePromise: Promise<EngineModule> | null = null;

async function loadEngine(): Promise<EngineModule> {
    if (!enginePromise) {
        enginePromise = import('../lib/o3dv/o3dv.module.js');
    }
    return enginePromise;
}

function ensureContainer(canvasId: string): HTMLElement {
    const element = document.getElementById(canvasId);
    if (!(element instanceof HTMLElement)) {
        throw new Error(`Viewer container '${canvasId}' was not found or is not an element.`);
    }
    element.innerHTML = '';
    element.classList.add('ov-viewer-host');
    return element;
}

function applyTheme(element: HTMLElement, theme?: string): void {
    element.dataset['ovTheme'] = theme ?? 'dark';
    element.classList.toggle('ov-theme-dark', !theme || theme === 'dark');
    element.classList.toggle('ov-theme-light', theme === 'light');
}

function applyFixedSize(element: HTMLElement, size?: { width: number; height: number } | null): void {
    if (size) {
        element.style.width = `${size.width}px`;
        element.style.height = `${size.height}px`;
    } else {
        element.style.removeProperty('width');
        element.style.removeProperty('height');
    }
}

function getViewerFromHandle(handle: ViewerHandle): ViewerRegistryEntry {
    const entry = viewerRegistry.get(handle.id);
    if (!entry) {
        throw new Error(`Viewer handle ${handle.id} is not registered.`);
    }
    return entry;
}

export async function createViewer(canvasId: string, options: ViewerCreateOptions = {}): Promise<ViewerHandle> {
    const engine = await loadEngine();
    const container = ensureContainer(canvasId);
    applyTheme(container, options.theme);
    applyFixedSize(container, options.fixedCanvasSize ?? null);

    const viewer = new engine.EmbeddedViewer(container, {});

    const handle: ViewerHandle = { id: viewerIdSeed++ };
    viewerRegistry.set(handle.id, { container, viewer });

    if (options.initialModelUrls && options.initialModelUrls.length > 0) {
        viewer.LoadModelFromUrlList(options.initialModelUrls);
    }

    return handle;
}

export async function loadUrls(handle: ViewerHandle, urls: string[]): Promise<void> {
    if (!urls || urls.length === 0) {
        return;
    }

    await loadEngine();
    const { viewer } = getViewerFromHandle(handle);
    viewer.LoadModelFromUrlList(urls);
}

export async function loadFiles(handle: ViewerHandle, fileDescriptors: FileStreamDescriptor[]): Promise<void> {
    if (!fileDescriptors || fileDescriptors.length === 0) {
        return;
    }

    await loadEngine();
    const { viewer } = getViewerFromHandle(handle);

    const files: File[] = [];
    for (const descriptor of fileDescriptors) {
        const buffer = await descriptor.stream.arrayBuffer();
        files.push(new File([buffer], descriptor.name));
        descriptor.stream.dispose?.();
    }

    viewer.LoadModelFromFileList(files);
}

export async function disposeViewer(handle: ViewerHandle): Promise<void> {
    const entry = viewerRegistry.get(handle.id);
    if (!entry) {
        return;
    }

    viewerRegistry.delete(handle.id);
    entry.container.innerHTML = '';
}
