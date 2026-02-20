# Lightning 3 Renderer

A powerful 2D scene renderer designed for rendering highly performant user
interfaces on web browsers running on embedded devices using WebGL.

The Renderer is part of the [LightningJS](https://lightningjs.io) project. While it is possible to use the renderer directly, it is not recommended. Instead, Lightning 3 works best when combined with [Blits](https://lightningjs.io/v3-docs/blits/getting_started/intro.html).

## Setup & Commands

```
# Install renderer + example dependencies
pnpm install

# Build Renderer
pnpm build

# Build Renderer (watch mode)
pnpm watch

# Run unit tests
pnpm test

# Run Visual Regression Tests
pnpm test:visual

# Build API Documentation (builds into ./typedocs folder)
pnpm typedoc

# Launch Example Tests in dev mode (includes Build Renderer (watch mode))
pnpm start

# Launch Example Tests in production mode
# IMPORTANT: To run test examples on embedded devices that use older browser versions
# you MUST run the examples in this mode.
pnpm start:prod
```

## Browser Targets

The Lightning 3 Renderer's goal is to work with the following browser versions and above:

- Chrome v38 (Released October 7, 2014)

Any JavaScript language features or browser APIs that cannot be automatically transpiled or polyfilled by industry standard transpilers (such as Babel) to target these versions must be carefully considered before use.

For a more detailed and comprehensive list of browsers and their features please see [browsers](./BROWSERS.md).

## Platform Architecture

The Lightning 3 Renderer uses a modular platform architecture that allows it to adapt to different browser capabilities and environments. This enables optimal performance across a wide range of devices, from modern browsers to legacy embedded systems.

### Available Platforms

The Renderer includes several platform implementations, each tailored for specific browser capabilities:

#### WebPlatform (Default)

The standard platform for modern browsers with full WebGL and createImageBitmap support.

- Uses XMLHttpRequest for loading resources
- Full createImageBitmap API with options (premultiplyAlpha, colorSpaceConversion, imageOrientation)
- Supports image cropping
- Multi-threaded image processing via Web Workers
- **Use case:** Modern browsers, default choice for most applications

#### WebPlatformNext

Platform using the modern Fetch API instead of XMLHttpRequest.

- Uses Fetch API for loading resources (promise-based, Service Worker compatible)
- Full createImageBitmap API with options
- Supports image cropping
- Multi-threaded image processing via Web Workers
- **Use case:** Modern browsers where Fetch API is preferred, progressive web apps

#### WebPlatformChrome50

Compatibility platform for browsers with limited createImageBitmap support (Chrome 50-51).

- Uses XMLHttpRequest for loading resources
- Limited createImageBitmap API (no options or cropping parameters)
- Multi-threaded image processing via Web Workers (if enabled)
- **Use case:** Chrome 50-51, browsers with basic createImageBitmap support

#### WebPlatformLegacy

Legacy platform for older browsers without createImageBitmap support.

- Uses direct Image element loading (no blob conversion for URLs)
- HTMLImageElement instead of createImageBitmap
- Single-threaded image processing (no Web Workers)
- No image cropping support
- No compressed texture support
- **Use case:** Chrome 38-49, older embedded device browsers

### Using a Platform

Platforms can be specified when initializing the Renderer:

```ts
import { RendererMain } from '@lightningjs/renderer';
import { WebGlRenderer } from '@lightningjs/renderer/webgl';
import {
  WebPlatform,
  WebPlatformNext,
  WebPlatformChrome50,
  WebPlatformLegacy,
} from '@lightningjs/renderer/platforms';

const renderer = new RendererMain(
  {
    appWidth: 1920,
    appHeight: 1080,
    renderEngine: WebGlRenderer,
    platform: WebPlatformLegacy, // Use legacy platform for older browsers
    // ...Other Renderer Config
  },
  'app',
);
```

**Note:** `WebPlatformLegacy` automatically sets `numImageWorkers` to 0 since it doesn't support Web Workers.

### Creating Custom Platforms

You can create your own custom platform tailored to your specific device or environment by extending the `Platform` base class or one of the existing platform implementations.

**Key methods you can override:**

- `fetch(url: string): Promise<Blob>` - Resource loading
- `createImage(...)` - Image bitmap creation
- `loadImage(...)` - Complete image loading pipeline
- `loadSvg(...)` - SVG loading
- `loadCompressedTexture(...)` - Compressed texture loading
- `createCanvas()` - Canvas element creation
- `createContext()` - WebGL context creation
- `startLoop(stage)` - Animation loop implementation

This allows you to optimize the Renderer for proprietary platforms, embedded systems, or environments with unique capabilities and constraints.

## Example Tests

The Example Tests sub-project define a set of tests for various Renderer
features. This is NOT an automated test. The command below will launch a
web server which can be accessed by a web browser for manual testing. However,
many of the Example Tests define Snapshots for the Visual Regression Test Runner
(see below).

The Example Tests can be launched with:

```
pnpm start
```

A hosted version can be found [here](https://lightning-js.github.io/renderer/).

This supports modern browsers as well as Chrome 38 and above through a legacy build.

See [examples/README.md](./examples/README.md) for more info.

## Visual Regression Tests

In order to prevent bugs on existing Renderer features when new features or bug
fixes are added, the Renderer includes a Visual Regression Test Runner along
with a set of certified snapshot files that are checked into the repository.

These tests can be launched with:

```
pnpm test:visual
```

The captured Snapshots of these tests are optionally defined in the individual
Example Tests.

See [visual-regression/README.md](./visual-regression/README.md) for more info.

## Manual Regression Tests

See [docs/ManualRegressionTests.md].

## Release Procedure

See [RELEASE.md](./RELEASE.md)

## Installing Fonts

Fonts can be installed into the Font Manager exposed by the Renderer's Stage.
There are two types of fonts that you can install, Web/Canvas2D fonts (WebTrFontFace)
and SDF fonts (SdfTrFontFace). Install that fonts that your applications needs
at start up so they are ready when your application is rendered.

```ts
import { RendererMain } from '@lightningjs/renderer';

import {
  WebGlCoreRenderer,
  SdfTextRenderer,
} from '@lightningjs/renderer/webgl';
import { CanvasTextRenderer } from '@lightningjs/renderer/canvas';

const renderer = new RendererMain(
  {
    appWidth: 1920,
    appHeight: 1080,
    renderEngine: WebGlCoreRenderer,
    fontEngines: [SdfTextRenderer, CanvasTextRenderer],
    // ...Other Renderer Config
  },
  'app', // id of div to insert Canvas.
);

// Load fonts by explicitly specifying the renderer type
await stage.loadFont('canvas', {
  fontFamily: 'myWebFont',
  fontUrl: '/fonts/my-font.ttf',
});

await stage.loadFont('sdf', {
  fontFamily: 'mySdfFont',
  atlasUrl: '/fonts/my-font-atlas.png',
  atlasDataUrl: '/fonts/my-font-data.json',
});
```

For more information see [Font Loading](./docs/fontLoading.md)

## Migration Guide

Upgrading from Lightning 3 v2.x? See the [Migration Guide](./docs/migration-2x-to-3.0.md) for detailed information about breaking changes and how to update your code.
