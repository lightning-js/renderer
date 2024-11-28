# Browser Support

LightningJS is designed with legacy devices in mind, ensuring compatibility with a wide variety of browsers. From **Chrome v38**, released in late 2014, to the latest modern browsers, LightningJS provides a reliable and efficient rendering experience.

## WebGL Compatibility

LightningJS relies on **WebGL 1.x** (based on OpenGL ES 2.0) or newer for its rendering capabilities. If WebGL 1.x is supported in the browser, LightningJS will run without issues. Here are some key points about our WebGL implementation:

- **Independent Rendering**: LightningJS is a contained renderer that uses WebGL, giving us full pixel-for-pixel control over the output.
- **No CSS Dependency**: Unlike traditional DOM/CSS rendering, LightningJS avoids reliance on CSS features, extensions, or browser-specific CSS implementations.
- **Consistency**: In our experience, WebGL support is consistent across browsers. Once LightningJS is confirmed to work in a browser, it will deliver uniform output.

## Supported Browsers and Quirks

Below is a detailed breakdown of confirmed browsers that work with LightningJS, along with the quirks or features specific to their versions:

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

For createImageBitmap the Lightning 3 renderer will use a `1x1` PNG Pixel to validate whether the createImageBitmap API is available and which version can be used.
If the createImageBitmap API is not available it will gracefully fallback to `new Image()` with a performance decrease.

Lightning 3 prefers to run on **WPEWebKit** with `Lightning Native` (also known as nonCompositedWebGL) enabled for maximum performance!
For more information please see [https://wpewebkit.org/](https://wpewebkit.org/)

## Running Lightning in older Browsers

To run LightningJS in older browsers, you can use **Vite's legacy plugin** and specific polyfills.

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

---

## Performance Considerations

When evaluating performance, it is essential to understand the context of your development and target devices:

- **64-bit vs. 32-bit**: Your development browser on a PC/Mac runs in 64-bit mode, utilizing higher JIT tiers than the SmartTV/STB devices targeted by LightningJS.
- **Browser Age**: Development browsers are often much newer than the browsers found on Smart TVs or set-top boxes.
- **Targeted Output**: Align your build output with the legacy plugin/targets in Vite to match the browser version for deployment. Minimizing polyfills and leveraging native browser APIs will improve performance.
- **Device Testing**: Always test on target devices early and frequently. An **RPI3b+ with WPEWebKit** or similar ([WPE](https://github.com/webplatformforembedded/buildroot)) can be a great tool for replicating target environments.
