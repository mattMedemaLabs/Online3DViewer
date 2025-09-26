# Online3DViewer Blazor Rewrite

> **Status:** Interactive prototype (viewer interop online)

This folder contains the Blazor WebAssembly experiment that wraps the Online3DViewer engine through JavaScript interop. The prototype already initializes the embedded viewer, loads a sample model from a URL, and allows local file uploads while we continue porting the UI to Razor components.

## Projects

- `Online3DViewer.BlazorApp` – The Blazor WebAssembly frontend with the reusable `ViewerHost` component, toolbar, and sample loader.
- `Online3DViewer.EngineInterop` – A C# class library exposing `ViewerInteropService`, a strongly typed wrapper around the JavaScript module (`blazorInterop.js`).

## Local Setup

1. Install the .NET 9 SDK (<https://dotnet.microsoft.com/download>).
2. From the repository root build the existing JavaScript engine bundles:

   ```pwsh
   npm run build_engine
   npm run build_engine_module
   ```

3. Copy the generated artifacts into the Blazor app (MSBuild links them automatically once present):
   - `build/engine/o3dv.min.js`
   - `build/engine/o3dv.module.js`

4. Bundle the Blazor interop layer (TypeScript → ES module):

   ```pwsh
   node blazor/tools/bundle-blazor-interop.mjs
   ```

5. Restore dependencies and run the development server:

   ```pwsh
   dotnet restore blazor/Online3DViewer.Blazor.sln
   dotnet build blazor/Online3DViewer.Blazor.sln
   dotnet run --project blazor/src/Online3DViewer.BlazorApp
   ```

Open the printed localhost URL (typically `https://localhost:5001`) to interact with the prototype. Use **Load Sample Model** to fetch a GLB from GitHub, or upload your own files with the file picker.

## Next Steps

- Continue porting the website toolbar, panels, and dialogs into Razor components.
- Move shared CSS from the existing site or rebuild it with Tailwind/Fluent UI.
- Add automated tests (bUnit for components and Playwright for viewer smoke tests).
