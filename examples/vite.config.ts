/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defineConfig } from 'vite';
import * as path from 'path';

/**
 * Targeting ES2019 gets us at least to WPE 2.28
 *
 * Despite setting the target in different places in the Vite config below
 * this does not seem to have an effect on the output when running Vite in
 * development mode (`pnpm start`). In order to properly test on embedded devices
 * that require the es2019 target, you must run `pnpm run build` and then serve the
 * production build via `pnpm run preview`.
 *
 * See the following for any updates on this:
 * https://github.com/vitejs/vite/issues/13756#issuecomment-1751085158
 */
const prodTarget = 'es2019';

/**
 * esbuild target for development mode
 *
 * Must be at least ES2020 to `import.meta.glob` to work. Even though this target
 * mainly affects the output for the Vite dev server, it still affects how the
 * `import.meta.glob` is transpiled in the production output.
 */
const devTarget = 'es2020';

/**
 * Vite Config
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineConfig(({ command, mode, isSsrBuild }) => {
  return {
    worker: {
      format: 'es',
    },
    esbuild: {
      target: devTarget,
    },
    optimizeDeps: {
      esbuildOptions: {
        target: devTarget,
      },
    },
    build: {
      target: prodTarget,
      minify: false,
      sourcemap: true,
      outDir: path.resolve(__dirname, 'dist'),
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  };
});
