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
