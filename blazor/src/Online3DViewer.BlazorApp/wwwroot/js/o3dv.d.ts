declare module '*o3dv.module.js' {
    export class EmbeddedViewer {
        constructor(parentElement: HTMLElement, parameters?: Record<string, unknown>);
        LoadModelFromUrlList(urls: string[]): void;
        LoadModelFromFileList(files: File[]): void;
    }
}
