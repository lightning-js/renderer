# Platform Architecture

## Overview

The Lightning 3 Renderer uses a modular platform architecture that allows it to intelligently adapt to different browser capabilities and environments. Each platform implementation is optimized for a specific set of browser features, enabling the Renderer to deliver optimal performance across devices ranging from modern browsers to legacy embedded systems.

The platform abstraction handles:

- **Resource Loading**: Fetching images, assets, and data (XMLHttpRequest vs Fetch API)
- **Image Processing**: Using createImageBitmap with appropriate API versions or fallback to Image elements
- **Background Processing**: Multi-threaded image processing via Web Workers (if available)
- **Canvas Creation**: Creating WebGL or Canvas contexts
- **Animation Loops**: Efficient frame rendering and timing

By automatically selecting the best platform for your target browser or allowing manual selection, Lightning 3 achieves high performance while maintaining broad compatibility.

## Available Platforms

### WebPlatform (Default)

The standard platform for modern browsers with full WebGL and createImageBitmap support.

**Best for**: Modern browsers (Chrome 52+, recent Firefox, Safari, Edge)

**Features:**

- XMLHttpRequest for loading resources
- Full createImageBitmap API with all options (premultiplyAlpha, colorSpaceConversion, imageOrientation)
- Image cropping support
- Multi-threaded image processing via Web Workers
- Best performance for image-heavy applications

**Browser Support**: Chrome 52+, modern Firefox, Safari 14+, Edge 79+

**Use cases**:

- Desktop applications
- Modern smart TVs
- Progressive web apps on modern devices
- Default choice for most applications

### WebPlatformNext

Platform using the modern Fetch API instead of XMLHttpRequest.

**Best for**: Modern browsers where Fetch API is preferred, especially progressive web apps

**Features:**

- Fetch API for loading resources (promise-based)
- Service Worker compatible
- Full createImageBitmap API with options
- Image cropping support
- Multi-threaded image processing via Web Workers
- Better support for progressive web app patterns

**Browser Support**: Chrome 40+, Firefox 40+, Safari 10.1+, Edge 14+

**Use cases**:

- Progressive web apps (PWAs)
- Applications using Service Workers
- Modern browser applications preferring async/await patterns
- Applications requiring offline functionality

### WebPlatformChrome50

Compatibility platform for browsers with limited createImageBitmap support.

**Best for**: Chrome 50-51, browsers with partial createImageBitmap API

**Features:**

- XMLHttpRequest for loading resources
- Limited createImageBitmap API (no options, no cropping parameters)
- Basic `createImageBitmap(blob)` only
- Multi-threaded image processing via Web Workers (if enabled)
- Graceful fallback for browsers without full API support

**Browser Support**: Chrome 50-51

**Use cases**:

- Legacy Android devices with Chrome 50-51
- Specific embedded devices stuck on older Chrome versions
- Environments requiring Chrome 50 compatibility

### WebPlatformLegacy

Legacy platform for older browsers without createImageBitmap support.

**Best for**: Older embedded device browsers, Chrome 38-49

**Features:**

- Direct Image element loading (no blob-to-image conversion)
- HTMLImageElement instead of createImageBitmap
- Single-threaded image processing (no Web Workers)
- No image cropping support
- No compressed texture support
- Simplified animation loop

**Browser Support**: Chrome 38-49, older WPEWebKit versions, legacy embedded systems

**Use cases**:

- Chrome 38+ embedded devices
- Older set-top boxes and smart TVs
- Legacy WPEWebKit versions
- Maximum backwards compatibility scenarios

**Note**: `WebPlatformLegacy` automatically sets `numImageWorkers` to 0 since it doesn't support Web Workers.

## Platform Selection Matrix

| Feature                 | WebPlatform                             | WebPlatformNext                         | WebPlatformChrome50 | WebPlatformLegacy  |
| ----------------------- | --------------------------------------- | --------------------------------------- | ------------------- | ------------------ |
| **Resource Loading**    | XMLHttpRequest                          | Fetch API                               | XMLHttpRequest      | Direct Image       |
| **createImageBitmap**   | Full API + options                      | Full API + options                      | Limited API         | Not used           |
| **Image Cropping**      | ✅ Yes                                  | ✅ Yes                                  | ❌ No               | ❌ No              |
| **Image Options**       | ✅ premultiply, colorSpace, orientation | ✅ premultiply, colorSpace, orientation | ❌ None             | ❌ N/A             |
| **Web Workers**         | ✅ Multi-threaded                       | ✅ Multi-threaded                       | ✅ Multi-threaded   | ❌ Single-threaded |
| **Compressed Textures** | ✅ Yes                                  | ✅ Yes                                  | ✅ Yes              | ❌ No              |
| **Min Browser**         | Chrome 52                               | Chrome 40                               | Chrome 50           | Chrome 38          |
| **Performance**         | Best                                    | Best                                    | Good                | Fair               |

## Selecting a Platform

### Automatic Selection

If you don't specify a platform, Lightning 3 automatically detects your browser's capabilities and uses the most appropriate platform:

```ts
import { RendererMain } from '@lightningjs/renderer';
import { WebGlRenderer } from '@lightningjs/renderer/webgl';

// Automatically selects the best platform for your browser
const renderer = new RendererMain(
  {
    appWidth: 1920,
    appHeight: 1080,
    renderEngine: WebGlRenderer,
    // Platform auto-selected based on browser capabilities
  },
  'app', // DOM element ID
);
```

### Manual Selection

Override automatic selection by specifying a platform explicitly:

```ts
import { RendererMain } from '@lightningjs/renderer';
import { WebGlRenderer } from '@lightningjs/renderer/webgl';
import {
  WebPlatform,
  WebPlatformNext,
  WebPlatformChrome50,
  WebPlatformLegacy,
} from '@lightningjs/renderer/platform';

const renderer = new RendererMain(
  {
    appWidth: 1920,
    appHeight: 1080,
    renderEngine: WebGlRenderer,
    platform: WebPlatformLegacy, // Force legacy platform for older browsers
    // ...Other Renderer Config
  },
  'app',
);
```

### When to Override

**Force WebPlatformLegacy if:**

- Targeting Chrome 38-49 devices
- Testing backwards compatibility
- Supporting older embedded device browsers
- Maximizing browser coverage at the cost of performance

**Force WebPlatformNext if:**

- Building a PWA that requires Service Worker support
- Specifically targeting modern browser capabilities
- Prefer Promise-based fetch over XMLHttpRequest

**Force WebPlatformChrome50 if:**

- Supporting specific Chrome 50-51 devices
- Testing partial API support scenarios

## Creating Custom Platforms

You can create a custom platform tailored to your specific device or environment by extending the `Platform` base class or one of the existing platform implementations.

### Basic Custom Platform

```ts
import { Platform } from '@lightningjs/renderer/platform';

export class CustomPlatform extends Platform {
  // Override methods as needed
  async fetch(url: string): Promise<Blob> {
    // Custom resource loading logic
    return super.fetch(url);
  }

  async createImage(
    mediaElement: HTMLImageElement | HTMLCanvasElement,
    options?: ImageBitmapOptions,
  ): Promise<ImageBitmap | HTMLImageElement> {
    // Custom image creation logic
    return super.createImage(mediaElement, options);
  }

  createCanvas(): HTMLCanvasElement {
    // Custom canvas creation logic
    return super.createCanvas();
  }
}
```

### Key Methods to Override

| Method                          | Purpose                  | Parameters                  | Returns                                    |
| ------------------------------- | ------------------------ | --------------------------- | ------------------------------------------ |
| `fetch(url)`                    | Load resources           | `url: string`               | `Promise<Blob>`                            |
| `createImage(element, options)` | Convert to ImageBitmap   | `element, options?`         | `Promise<ImageBitmap \| HTMLImageElement>` |
| `loadImage(src, options)`       | Complete image loading   | `src, options`              | `Promise<LoadedImage>`                     |
| `loadSvg(url)`                  | Load SVG resources       | `url: string`               | `Promise<ImageBitmap>`                     |
| `loadCompressedTexture(url)`    | Load compressed textures | `url: string`               | `Promise<CompressedTexture>`               |
| `createCanvas()`                | Create canvas element    | None                        | `HTMLCanvasElement`                        |
| `createContext(canvas)`         | Create WebGL context     | `canvas: HTMLCanvasElement` | `WebGLRenderingContext`                    |
| `startLoop(stage)`              | Animation loop           | `stage: Stage`              | `void`                                     |

### Custom Platform Example

```ts
import { Platform } from '@lightningjs/renderer/platform';

export class EmbeddedDevicePlatform extends Platform {
  // Optimize for specific embedded device APIs
  async fetch(url: string): Promise<Blob> {
    // Use device-specific resource loading if available
    if (window.deviceApi?.loadResource) {
      return window.deviceApi.loadResource(url);
    }
    return super.fetch(url);
  }

  createContext(canvas: HTMLCanvasElement): WebGLRenderingContext {
    // Use device-specific WebGL context creation
    const context = super.createContext(canvas);

    // Apply device-specific WebGL extensions or optimizations
    context.ext_shader_texture_lod = context.getExtension(
      'EXT_shader_texture_lod',
    );

    return context;
  }
}

// Use the custom platform
const renderer = new RendererMain(
  {
    appWidth: 1920,
    appHeight: 1080,
    renderEngine: WebGlRenderer,
    platform: EmbeddedDevicePlatform,
  },
  'app',
);
```

## Platform Configuration

Platforms can be configured with additional options:

```ts
const renderer = new RendererMain(
  {
    appWidth: 1920,
    appHeight: 1080,
    renderEngine: WebGlRenderer,
    platform: WebPlatformLegacy,
    // Platform-related config options
    numImageWorkers: 0, // Image Workers (disables for Legacy platform)
    imageWorkerTimeout: 30000, // Worker task timeout in ms
  },
  'app',
);
```

## Performance Considerations

### Memory Usage

- **WebPlatform/Next**: Higher memory due to createImageBitmap overhead, but better for large images
- **WebPlatformChrome50**: Similar to WebPlatform, but with limited options
- **WebPlatformLegacy**: Lower memory footprint; better for memory-constrained devices

### Rendering Speed

- **WebPlatform**: Fastest due to optimized createImageBitmap
- **WebPlatformNext**: Similar speed to WebPlatform
- **WebPlatformChrome50**: Slightly slower due to limited API
- **WebPlatformLegacy**: Slowest; suitable for embedded devices where performance is acceptable

### Web Worker Performance

- **WebPlatform/Next/Chrome50**: Multi-threaded image processing (requires Worker support)
- **WebPlatformLegacy**: Single-threaded; image processing on main thread

## Debugging Platform Selection

To check which platform is being used:

```ts
const renderer = new RendererMain(/* config */, 'app');
console.log(renderer.platform); // Logs the active Platform instance
```

To force logging of platform detection:

```ts
// Before creating renderer
console.log(
  'Browser createImageBitmap support:',
  typeof window !== 'undefined' &&
    typeof window.createImageBitmap === 'function',
);
```

## Troubleshooting

### Images not loading

- Check platform-specific loading capabilities
- Verify browser supports required image format
- For Legacy platform, ensure images are compatible with `<img>` elements

### Performance issues

- Profile with DevTools to confirm bottleneck
- Consider forcing WebPlatform if auto-selection chose Legacy
- Disable Web Workers if causing issues: `numImageWorkers: 0`

### Incompatibility with device APIs

- Create a custom platform extending the appropriate base implementation
- Override `createContext()` for device-specific WebGL setup
- Override `fetch()` for device-specific resource loading

## See Also

- [Browser Support](../BROWSERS.md) – Detailed browser capability matrix
- [Getting Started](./GETTING-STARTED.md) – Installation and setup
- [API Documentation](https://lightning-js.github.io/renderer-docs/) – Complete Platform API reference
