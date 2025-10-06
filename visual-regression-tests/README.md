# Example Tests

This directory contains a set of independent Example Tests which can be selected
via URL parameters for manual testing.

Many of these Example Tests also define Snapshots for the Visual Regression Test
Runner. See [visual-regression/README.md](../visual-regression/README.md) for
more information on how those tests are run and how their Snapshots are defined.

## Setup

```
# Run code in dev mode (includes building Renderer in watch mode)
pnpm start

# Build and run in production mode (vite builds the bundle files in the ./dist folder)
pnpm start:prod
```

**Very Important:** When making changes to the Renderer, the Renderer must be
re-built before you will see the changes appear. `pnpm start` will run the
Renderer's build process in watch mode, but a build of the Renderer must be
run before building these examples in production mode.

```
# Change to Renderer root directory
cd ..

# Build once
pnpm build

# Build in watch mode
pnpm watch
```

## URL Params

- `test` (string, default: "test")
  - Test example to run.
  - Can be any of the file names (minus extension) in the `tests` directory.
- `driver` (string, default: "main")
  - Core driver to use
  - Either `main` or `threadx`
- `overlay` (boolean, default: "true")
  - Whether or not to show the text overlay in the bottom-right corner that
    displays the current test and driver being used.
- `monitor` (boolean, default: "false")
  - Whether or not to show the Texture Memory Monitor overlay.
- `resolution` (number, default: 720)
  - Resolution (height) of to render the test at (in logical pixels)
- `fps` (boolean, default: "false")
  - Whether or not to log the latest FPS sample to the console every 1 second.
  - After skipping the first 10 samples, every 100 samples after that will result
    in a statistics summary printed to the console.
- `contextSpy` (boolean, default: "false")
  - Whether or not to turn on the context spy and reporting
  - The context spy intercepts all calls to the (WebGL) context and reports
    how many calls to each function occurred during the last FPS sampling period
    (1 second for these tests).
  - Statistical results of every context call will be reported along with the
    FPS statistics summary.
  - `fps` must be enabled in order to see any reporting.
  - Enabling the context spy has a serious impact on performance so only use it
    when you need to extract context call information.
- `ppr` (number, default: 1)
  - Device physical pixel ratio.
- `multiplier` (number, default: 1)
  - In tests that support it, multiply the number of objects created by this number. Useful for performance tests.
- `automation` (boolean, default: "false")
  - Automation mode.
  - Executes the exported `automation()` function for every Example Test
    that defines one, one after the other.
  - This is used by the Visual Regression Test Runner.
  - See [visual-regression/README.md](../visual-regression/README.md) for more info.

## Note on imports

These examples must use named package imports to import from the renderer code
base. This is in order to simulate what the end user package experience will be
like. For example, relative imports like this are NOT allowed:

```ts
import { RendererMain } from '../exports/index.js';
```

Instead this should be written like this:

```ts
import { RendererMain } from '@lightningjs/renderer';
```
