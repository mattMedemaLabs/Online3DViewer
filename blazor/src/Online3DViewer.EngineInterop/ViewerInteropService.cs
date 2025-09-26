using System.Collections.ObjectModel;
using System.Linq;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.JSInterop;

namespace Online3DViewer.EngineInterop;

public sealed class ViewerInteropService : IAsyncDisposable
{
    private readonly Lazy<Task<IJSObjectReference>> moduleTask;

    public ViewerInteropService(IJSRuntime jsRuntime)
    {
        ArgumentNullException.ThrowIfNull(jsRuntime);
        moduleTask = new(() => jsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/blazorInterop.js").AsTask());
    }

    public async Task<ViewerHandle> CreateViewerAsync(string containerId, ViewerOptions? options = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(containerId))
        {
            throw new ArgumentException("A non-empty container id is required.", nameof(containerId));
        }

        var module = await moduleTask.Value.WaitAsync(cancellationToken).ConfigureAwait(false);
        options ??= ViewerOptions.Default;

        var handle = await module.InvokeAsync<ViewerHandle>("createViewer", cancellationToken, containerId, options).ConfigureAwait(false);
        return handle;
    }

    public async Task LoadUrlsAsync(ViewerHandle handle, IEnumerable<string> urls, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(handle);
        ArgumentNullException.ThrowIfNull(urls);

        var urlList = urls.Where(static url => !string.IsNullOrWhiteSpace(url)).ToArray();
        if (urlList.Length == 0)
        {
            return;
        }

        var module = await moduleTask.Value.WaitAsync(cancellationToken).ConfigureAwait(false);
        await module.InvokeVoidAsync("loadUrls", cancellationToken, handle, urlList).ConfigureAwait(false);
    }

    public async Task LoadFilesAsync(ViewerHandle handle, IEnumerable<IBrowserFile> files, long maxFileSizeBytes = 128 * 1024 * 1024, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(handle);
        ArgumentNullException.ThrowIfNull(files);

        var browserFiles = files.ToArray();
        if (browserFiles.Length == 0)
        {
            return;
        }

        var module = await moduleTask.Value.WaitAsync(cancellationToken).ConfigureAwait(false);

        var streamReferences = new List<DotNetStreamReference>(browserFiles.Length);
        var payload = new List<object>(browserFiles.Length);

        foreach (var file in browserFiles)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var stream = file.OpenReadStream(maxFileSizeBytes, cancellationToken: cancellationToken);
            var streamReference = new DotNetStreamReference(stream);
            streamReferences.Add(streamReference);

            payload.Add(new
            {
                name = file.Name,
                stream = streamReference
            });
        }

        try
        {
            await module.InvokeVoidAsync("loadFiles", cancellationToken, handle, payload).ConfigureAwait(false);
        }
        finally
        {
            foreach (var reference in streamReferences)
            {
                reference.Dispose();
            }
        }
    }

    public async Task DisposeViewerAsync(ViewerHandle handle, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(handle);

        if (!moduleTask.IsValueCreated)
        {
            return;
        }

        var module = await moduleTask.Value.WaitAsync(cancellationToken).ConfigureAwait(false);
        await module.InvokeVoidAsync("disposeViewer", cancellationToken, handle).ConfigureAwait(false);
    }

    public async ValueTask DisposeAsync()
    {
        if (!moduleTask.IsValueCreated)
        {
            return;
        }

        var module = await moduleTask.Value.ConfigureAwait(false);
        await module.DisposeAsync().ConfigureAwait(false);
    }
}

public sealed record ViewerHandle(int Id);

public sealed record ViewerOptions
{
    public static ViewerOptions Default { get; } = new();

    /// <summary>
    /// Optional list of URLs that should be loaded automatically when the viewer starts.
    /// </summary>
    public IReadOnlyList<string> InitialModelUrls { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Optional theme identifier (e.g. "dark", "light").
    /// </summary>
    public string Theme { get; init; } = "dark";

    /// <summary>
    /// Width and height in CSS pixels, if the Blazor page wants to override auto sizing.
    /// </summary>
    public (int Width, int Height)? FixedCanvasSize { get; init; }
        = null;
}
