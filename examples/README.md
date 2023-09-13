# Lightning 3 Renderer Test Examples

This directory contains a set of independent examples which can be selected via
URL parameters.

## Setup

```
npm install

# Run code in dev mode (includes building Renderer in watch mode)
npm start

# Build and run in production mode (vite builds the bundle files in the ./dist folder)
npm run build && npm run preview
```

**Very Important:** When making changes to the Renderer, the Renderer must be
re-built before you will see the changes appear. `npm start` will run the
Renderer's build process in watch mode, but a build of the Renderer must be
run before building these examples in production mode.

```
# Change to Renderer root directory
cd ..

# Build once
npm run build

# Build in watch mode
npm run watch
```

## URL Params

- `test` - Test example to run
  - Can be any of the file names (minus extension) in the `tests` directory.
- `driver` - Core driver to use
  - Either `main` or `threadx`

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
