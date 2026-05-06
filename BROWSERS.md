# Browser Support

Lightning 3 Renderer is designed with legacy devices in mind, ensuring compatibility with a wide variety of browsers. From **Chrome v38**, released in October 2014, to the latest modern browsers, Lightning 3 Renderer provides a reliable and efficient rendering experience across the entire spectrum.

## Minimum Browser Support

The Lightning 3 Renderer's goal is to work with the following browser versions and above:

- **Chrome v38** (Released October 7, 2014)
- **WPEWebKit 2017** and newer
- **QtWebKit 5.2** and newer
- Any browser with **WebGL 1.x** support

Any JavaScript language features or browser APIs that cannot be automatically transpiled or polyfilled by industry standard transpilers (such as Babel) to target these versions must be carefully considered before use.

## WebGL Compatibility

Lightning 3 Renderer relies on **WebGL 1.x** (based on OpenGL ES 2.0) or newer for its rendering capabilities. If WebGL 1.x is supported in the browser, Lightning 3 Renderer will run without issues. Here are key points about our WebGL implementation:

- **Independent Rendering**: Lightning 3 Renderer is a self-contained renderer that uses WebGL, giving us full pixel-for-pixel control over the output
- **No CSS Dependency**: Unlike traditional DOM/CSS rendering, Lightning 3 Renderer avoids reliance on CSS features, extensions, or browser-specific CSS implementations
- **Consistency**: Once confirmed to work in a browser, Lightning 3 Renderer delivers uniform output with consistent performance characteristics
- **Fallback Support**: Canvas rendering available as fallback for environments where WebGL is unavailable

## Supported Browsers and Features

Below is a detailed breakdown of confirmed browsers that work with Lightning 3 Renderer, along with the features and quirks specific to their versions:

| **Browser**   | **Version** | **Quirks / Features**                                                                                                                           |
| ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chrome**    | v38         | Bottom line for support; introduces Promises. Lacks `createImageBitmap`, iterable `UInt8Array/UInt8ClampedArray`. `ImageData` is mostly broken. |
|               | v48         | Adds support for `Blob:` and `Data:` in the Fetch API.                                                                                          |
|               | v49         | Introduces Proxies, improving reactive property handling in Blits. Not used in the Renderer.                                                    |
|               | v50         | Adds `createImageBitmap` (without options object). Enables Image Worker in a web worker.                                                        |
|               | v52         | Adds `config` for `createImageBitmap`, including support for alpha channel.                                                                     |
|               | v54         | Enables resizing in `createImageBitmap`.                                                                                                        |
|               | v63         | Adds support for dynamic imports.                                                                                                               |
|               | v71         | Introduces `globalThis`.                                                                                                                        |
| **QtWebKit**  | 5.2         | Support for WebGL1, with known issues                                                                                                           |
| **WPEWebKit** | 2017        | Adds support for Image Worker and `createImageBitmap`.                                                                                          |
|               | 2.22        | Full support, including Lightning Native mode (disables DOM/CSS compositing except for `<canvas>`, `<video>`, `<audio>` tags).                  |
|               | 2.28        | Full support.                                                                                                                                   |
|               | 2.36        | Adds offscreen canvas and shared array buffers with await support for multithreading.                                                           |
|               | 2.46        | (Upcoming) Adds FTL support for 32-bit devices and offscreen rendering support for Lightning Native.                                            |

## Platform Compatibility by Browser

The Lightning 3 Renderer automatically selects the optimal [platform implementation](./docs/PLATFORMS.md) for your browser. The table below shows which platform is recommended for each browser version:

| **Browser**   | **Version**      | **Recommended Platform** | **Notes**                                        |
| ------------- | ---------------- | ------------------------ | ------------------------------------------------ |
| **Chrome**    | 38–49            | WebPlatformLegacy        | No createImageBitmap; uses direct Image loading  |
| **Chrome**    | 50–51            | WebPlatformChrome50      | Limited createImageBitmap API; no options        |
| **Chrome**    | 52+              | WebPlatform              | Full createImageBitmap with options and cropping |
| **Chrome**    | 40+ (with Fetch) | WebPlatformNext          | Use for PWAs and Service Worker support          |
| **Firefox**   | 40+              | WebPlatform              | Full createImageBitmap support                   |
| **Safari**    | 10.1+            | WebPlatform              | Full createImageBitmap support                   |
| **Edge**      | 14+              | WebPlatform              | Full createImageBitmap support                   |
| **QtWebKit**  | 5.2+             | WebPlatformLegacy        | Limited API support; test thoroughly             |
| **WPEWebKit** | 2017             | WebPlatformChrome50      | Basic createImageBitmap support                  |
| **WPEWebKit** | 2.22+            | WebPlatform              | Full support; ideal for embedded devices         |
| **WPEWebKit** | 2.36+            | WebPlatform              | Plus offscreen canvas and shared array buffers   |

## Optimal Performance Setup

**Lightning 3 prefers to run on WPEWebKit with Lightning Native** (also known as nonCompositedWebGL) enabled. This configuration provides:

- Best performance for embedded device rendering
- Disables DOM/CSS compositing except for `<canvas>`, `<video>`, and `<audio>` tags
- Direct hardware WebGL rendering pathway
- Minimal overhead for streaming applications

For more information, see [https://wpewebkit.org/](https://wpewebkit.org/) and [WPE GitHub](https://github.com/webplatformforembedded/buildroot).

## Supported Features by Browser

The following table summarizes key feature availability:

| **Feature**             | **Chrome 38** | **Chrome 50** | **Chrome 52+** | **WPEWebKit 2.22** | **Modern Browsers** |
| ----------------------- | ------------- | ------------- | -------------- | ------------------ | ------------------- |
| **WebGL 1.x**           | ✅ Yes        | ✅ Yes        | ✅ Yes         | ✅ Yes             | ✅ Yes              |
| **Web Workers**         | ✅ Yes        | ✅ Yes        | ✅ Yes         | ✅ Yes             | ✅ Yes              |
| **Fetch API**           | ❌ No         | ✅ Yes        | ✅ Yes         | ✅ Yes             | ✅ Yes              |
| **Promises**            | ✅ Yes        | ✅ Yes        | ✅ Yes         | ✅ Yes             | ✅ Yes              |
| **createImageBitmap**   | ❌ No         | ⚠️ Basic      | ✅ Full        | ✅ Full            | ✅ Full             |
| **Image Cropping**      | ❌ No         | ❌ No         | ✅ Yes         | ✅ Yes             | ✅ Yes              |
| **Compressed Textures** | ✅ Yes        | ✅ Yes        | ✅ Yes         | ✅ Yes             | ✅ Yes              |
| **Image Workers**       | ❌ No         | ✅ Yes        | ✅ Yes         | ✅ Yes             | ✅ Yes              |

## Running Lightning 3 in Older Browsers

To run Lightning 3 Renderer in older browsers, you can use **Vite's legacy plugin** and specific polyfills.

### Installation

Install the required dependencies:

```bash
pnpm i -D @vitejs/plugin-legacy whatwg-fetch
```

### Configuration

Add the following to your `vite.config.js`:

```javascript
import legacy from '@vitejs/plugin-legacy';

export default {
  plugins: [
    legacy({
      targets: ['chrome>=38'],
      modernPolyfills: true,
      additionalLegacyPolyfills: ['whatwg-fetch'],
    }),
  ],
};
```

### Adjusting Targets

Modify the `chrome>=38` target to match the browser version you need to support. If the target version is **Chrome v71** or higher, or **WPEWebKit 2.22** or newer, the legacy plugin is not required. You can adjust the target in your build configuration:

```javascript
build: {
  target: prodTarget,
},
esbuild: {
  target: devTarget,
},
```

Define the respective targets as follows:

```javascript
const devTarget = 'es2020';
const prodTarget = 'es2019';
```

For newer browsers, you can specify a higher target to reduce the use of polyfills and leverage native browser APIs for better performance.

## Performance Considerations

When evaluating Lightning 3 Renderer performance, it is essential to understand the context of your development and target devices:

- **64-bit vs. 32-bit**: Development browsers on PC/Mac run in 64-bit mode with higher JIT tiers than the embedded devices (SmartTV/STB) targeted by Lightning 3
- **Browser Age**: Development browsers are typically much newer than browsers found on Smart TVs or set-top boxes
- **Targeted Output**: Align your build output with Vite's legacy plugin/targets to match your deployment browser version. Minimizing polyfills and leveraging native browser APIs improves performance
- **Device Testing**: Test on target devices early and frequently. An RPI3b+ with WPEWebKit or similar setup can effectively replicate target environments

See [WPE GitHub](https://github.com/webplatformforembedded/buildroot) for more information on building WPEWebKit environments.

## Platform Architecture

For detailed information about how Lightning 3 Renderer selects and configures platforms based on browser capabilities, see [Platform Architecture](./docs/PLATFORMS.md).

For getting started with implementation and development, see [Getting Started](./docs/GETTING-STARTED.md).
