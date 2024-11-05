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
import legacy from '@vitejs/plugin-legacy';

/**
 * Targeting Chrome 38 for a legacy build.
 */
const prodTarget = 'Chrome>=38';

/**
 * Vite Config
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineConfig(({ command, mode, isSsrBuild }) => {
  return {
    plugins: [
      legacy({
        targets: [prodTarget],
        modernPolyfills: true,
      }),
    ],
    worker: {
      format: 'es',
    },
    build: {
      target: prodTarget,
      minify: false,
      sourcemap: true,
      emptyOutDir: false,
      postcss: false, // Disable PostCSS
      outDir: path.resolve(__dirname, 'dist/es5/'),
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  };
});
