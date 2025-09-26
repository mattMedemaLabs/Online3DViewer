# Online3DViewer → Blazor Migration Plan

## Goals

- Deliver a native Blazor experience for Online3DViewer without losing feature coverage (file import, visualization, UI tooling, embed mode).
- Preserve browser compatibility (WebAssembly-enabled browsers) and performance comparable to the current Three.js-based solution.
- Keep the public API predictable for existing embeds and power users.

## Constraints & Assumptions

- The project must continue to rely on WebGL for rendering. Three.js remains the most mature option, so the initial Blazor version will interoperate with the existing JS engine via `IJSRuntime`.
- Rewriting all importers and rendering logic in C# is out of scope for a first milestone; instead, we encapsulate the JavaScript engine as an interop layer while incrementally porting modules.
- Blazor WebAssembly is preferred to avoid server affinity; Blazor Server can be added later for multi-user collaboration scenarios.
- Tooling: .NET 9.0 SDK, `dotnet new blazorwasm`, TypeScript/esbuild to bundle the interop library derived from the existing engine build.

## High-Level Architecture

```text
+--------------------------------------------------------------+
| Blazor WebAssembly App                                       |
|                                                              |
|  Razor Components & Pages                                    |
|  ├── ViewerHost.razor      <─┐                               |
|  ├── Toolbar.razor           │  UI state (C#)                |
|  ├── Sidebar.razor           │                               |
|  └── Dialogs/*.razor         │                               |
|                              │                               |
|  State Containers & Services │                               |
|  ├── ViewerState.cs ─────────┼──────> JS Interop facades     |
|  └── FileService.cs          │                               |
|                              ▼                               |
|  JS Interop (TypeScript) layer → window.BlazorO3D            |
+------------------------------│-------------------------------+
                               │
                               ▼
+--------------------------------------------------------------+
| Existing Online3DViewer Engine (bundled JS / WASM libs)      |
| - File importers                                             |
| - Three.js scene graph management                            |
| - Rendering pipeline                                         |
| - Export utilities                                           |
+--------------------------------------------------------------+
```

### Component Responsibilities

- **ViewerHost.razor** embeds the `<canvas>` element and manages lifecycle events (OnAfterRenderAsync) to initialize/destroy the JS engine instance.
- **Toolbar/Sidebar/Dialogs** become Razor components bound to `ViewerState` (C# records). They call JS interop to execute engine actions (load file, toggle edges, change projection).
- **ViewerInteropService** centralizes all `IJSObjectReference` calls and marshals DTOs between C# and JS.
- **LocalizationService**: reuse existing localization bundles by exposing them through JS interop or convert to `.resx`.

## Migration Phases

1. **Scaffolding & Hosting**
   - Create solution `Online3DViewer.Blazor.sln` with `Online3DViewer.BlazorApp` (blazorwasm) and `Online3DViewer.EngineInterop` (library wrapping existing engine build).
   - Configure build to copy `build/engine/o3dv.module.js` and related assets to `wwwroot/lib/o3dv/`.
   - Implement `ViewerInteropService` with basic lifecycle calls (`Init`, `Dispose`).

2. **Core Viewer Integration**
   - Razor component `ViewerHost` renders a `canvas` and wires resize events via `ResizeObserver` JS helper.
   - Load models from embedded samples; display with default camera controls through existing engine API.
   - Implement file upload (Blazor InputFile → JS interop `Init3DViewerFromFileList`).

3. **UI Parity**
   - Port toolbar, inspector panels, dialogs into Razor components.
   - Mirror existing CSS using Tailwind or ported SCSS; for a quick start, re-use current CSS bundles via `wwwroot/css/legacy.css` until re-styled.
   - Bind state management with Fluxor or built-in `ObservableObject` pattern.

4. **Feature Bridging**
   - Edge display, section planes, camera presets, measurement tools: expose targeted interop wrappers.
   - Persist settings in `localStorage` using `ProtectedLocalStorage` or JS interop wrappers.
   - Integrate plugin architecture: register plugin metadata via JSON manifests consumed by Razor components.

5. **Progressive Porting (optional)**
   - Identify performance-critical or logic-heavy subsystems for native C# reimplementation (e.g., UI state, metadata parsing) while retaining JS renderer until parity achieved.
   - Explore using `CanvasKit`/`WebGL` from .NET or WebGPU once stable.

## Interop Design

- Bundle a lean JS facade (`blazorInterop.ts`) which exports methods invoked by C#:
  - `createViewer(canvasId, options)` → returns handle
  - `loadFiles(handle, files)`
  - `setEnvironment(handle, settings)`
  - `subscribe(handle, eventName, dotNetRef)` for callbacks
- Use `IJSObjectReference` caching to avoid repeated module loads.
- For large file transfers, leverage `DotNetStreamReference` and `ArrayBuffer` bridging.

## File & Solution Structure

```text
/Online3DViewer.Blazor/
│   Online3DViewer.Blazor.sln
├── src/
│   ├── Online3DViewer.BlazorApp/        (Blazor WebAssembly project)
│   │   ├── Pages/
│   │   ├── Components/
│   │   ├── Services/
│   │   ├── wwwroot/
│   │   │   ├── css/
│   │   │   └── lib/o3dv/
│   │   └── App.razor
│   └── Online3DViewer.EngineInterop/    (C# class library)
│       ├── ViewerInteropService.cs
│       ├── ViewerOptions.cs
│       └── JsInterop/ (TypeScript sources bundled via esbuild)
└── tools/
   └── bundle-blazor-interop.mjs        (esbuild config for interop layer)
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| JS/Blazor interop latency for high-frequency events (mouse move) | Choppy navigation | Keep camera controls in JS; only send higher-level events to C#. |
| Large model streaming | Load times | Continue using existing progressive loader; add C# progress reporting via event callbacks. |
| Asset packaging size | Longer first load | Enable Brotli compression on publish, lazy-load engine bundles, or host engine on CDN. |
| Divergent codebases | Maintenance overhead | Share TypeScript sources; use submodule or package feed so both JS and Blazor apps consume the same engine artifacts. |

## Next Steps

1. Generate the Blazor solution scaffold (`dotnet new blazorwasm`).
2. Add npm script to bundle `blazorInterop.ts` alongside current builds.
3. Implement `ViewerHost.razor` proof-of-concept that loads a sample GLB.
4. Gradually port UI panels, replacing jQuery/DOM manipulations with Razor components.
5. Define automated tests (bUnit for components, Playwright for integration) to ensure parity with the existing UI workflow.
