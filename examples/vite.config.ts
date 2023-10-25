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
import { importChunkUrl } from '@lightningjs/vite-plugin-import-chunk-url';

/**
 * Targeting ES2019 gets us at least to WPE 2.28
 *
 * Despite setting the target in 3 different places in the Vite config below
 * this does not seem to have an effect on the output when running Vite in
 * development mode (`pnpm start`). In order to properly test on embedded devices
 * that require the set target, you must run `pnpm run build` and then serve the
 * content via `pnpm run preview -- --host`.
 *
 * See the following for any updates on this:
 * https://github.com/vitejs/vite/issues/13756#issuecomment-1751085158
 */
const target = 'es2019';

/**
 * Vite Config
 */
export default defineConfig(({ command, mode, ssrBuild }) => {
  return {
    plugins: [importChunkUrl()],
    worker: {
      format: 'es',
    },
    esbuild: {
      target,
    },
    optimizeDeps: {
      esbuildOptions: {
        target,
      },
    },
    build: {
      target,
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
