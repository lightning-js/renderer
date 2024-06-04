# Lightning 3 Renderer (Beta)

**Warning: This is beta software and all of the exposed APIs are subject to
breaking changes**

A powerful 2D scene renderer designed for rendering highly performant user
interfaces on web browsers running on embedded devices using WebGL.

The Renderer is not designed for direct application development but instead
to provide a lightweight API for front-end application frameworks like Bolt and
Solid.

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

## Core Extensions

To load fonts, and/or other custom code into the Core Space, you must write a
Core Extension and pass it via dynamically importable URL to the initialization
of the Renderer.

Just like with loading the ThreadX Core Web Worker for the ThreadX, you import
your core extension using the `@lightningjs/vite-plugin-import-chunk-url` plugin so that
it's code is bundled and loaded seperately from your main app's bundle.

You can write a Core Extension by extending the CoreExtension class from the
Core API like so:

```ts
import {
  CoreExtension,
  WebTrFontFace,
  SdfTrFontFace,
  type Stage,
} from '@lightning/renderer/core';

export default class MyCoreExtension extends CoreExtension {
  async run(stage: Stage) {
    // Load fonts into core
    stage.fontManager.addFontFace(
      new WebTrFontFace('Ubuntu', {}, '/fonts/Ubuntu-Regular.ttf'),
    );

    stage.fontManager.addFontFace(
      new SdfTrFontFace(
        'Ubuntu',
        {},
        'msdf',
        stage,
        '/fonts/Ubuntu-Regular.msdf.png',
        '/fonts/Ubuntu-Regular.msdf.json',
      ),
    );
  }
}
```

And then in your application's main entry point you can import it using
`@lightningjs/vite-plugin-import-chunk-url`:

```ts
import coreExtensionModuleUrl from './MyCoreExtension.js?importChunkUrl';

// Set up driver, etc.

// Initialize the Renderer
const renderer = new RendererMain(
  {
    // Other Renderer Config...
    coreExtensionModule: coreExtensionModuleUrl,
  },
  'app',
  driver,
);
```
