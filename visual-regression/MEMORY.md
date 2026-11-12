# Browser memory lifecycle check

Run `pnpm test:memory` from the repository root. This builds the renderer and
examples, starts a local Vite preview, and runs a separate Chromium Playwright
check. CI runs the same command in the `Browser Memory Lifecycle` job. Its
per-round measurements are uploaded as `memory-lifecycle-measurements` and are
written locally to `visual-regression/memory-results/measurements.json`.
The CI step is blocking: if the check fails the `Browser Memory Lifecycle`
job fails.

The check uses four independent browser contexts: rectangles (the control), a
shared image asset, MSDF text (`textRendererOverride: 'sdf'`), and Canvas text
(`textRendererOverride: 'canvas'`). For each mode it mounts 150 visible nodes,
moves them outside the viewport, moves them back, then destroys them. A separate
warmup batch is left alive long enough to outlast the texture startup grace
period: it verifies that a forced cleanup evicts offscreen Canvas text GPU
textures and that they reload when the nodes return. Six unique batches per
mode provide repeated GC comparison points.

Each sample explicitly requests Chromium garbage collection twice via CDP,
then records `JSHeapUsedSize`, the renderer's reported GPU texture bytes and
loaded texture count, and counts of `transferToImageBitmap()` / `close()` calls.
It fails if a mode's post-GC heap grows more than 16 MiB _above the rectangle
control_, if Canvas text accumulates more than 16 unclosed bitmap snapshots,
or if Canvas text or image GPU memory does not fall on offscreen cleanup and
rise on return. These bounds are deliberately coarse: they catch linear retention,
not normal allocation noise.

**Limitation:** Chromium's JS heap metric does not include every browser-native
bitmap allocation or GPU driver allocation. The bitmap counters and renderer
GPU accounting are separate signals, not substitutes for process-memory
profiling on low-end target devices. Successful runs do not prove the absence
of all native or long-duration memory leaks. Only the OffscreenCanvas WebGL
path is exercised here; the DOM-canvas and Canvas2D fallback remain covered by
unit tests and need device-level validation.
