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
/**
 * Lightning 3 Renderer Core API
 *
 * @remarks
 * ```
 * import * from '@lightning/renderer/core';
 * ```
 *
 * The Core API is used by developers to extend the capabilities of the Renderer
 * by writing custom Shaders, Dynamic Shader Effects, Textures, Text Renderers,
 * etc.
 *
 * Custom capabilities as well as fonts can be loaded via Core Extensions.
 *
 * A core extension module is structured like so:
 * ```ts
 * import {
 *   CoreExtension,
 *   WebTrFontFace,
 *   SdfTrFontFace,
 *   type Stage
 * } from '@lightning/renderer/core';
 *
 * export default class MyCoreExtension extends CoreExtension {
 *   async run(stage: Stage) {
 *     stage.fontManager.addFontFace(
 *       new WebTrFontFace('Ubuntu', {}, '/fonts/Ubuntu-Regular.ttf'),
 *     );
 *
 *     stage.fontManager.addFontFace(
 *       new SdfTrFontFace(
 *         'Ubuntu',
 *         {},
 *         'msdf',
 *         stage,
 *         '/fonts/Ubuntu-Regular.msdf.png',
 *         '/fonts/Ubuntu-Regular.msdf.json',
 *       ),
 *     );
 *   }
 * }
 * ```
 *
 * And then imported and registered in the application's entry point
 * using the `@lightningjs/vite-plugin-import-chunk-url` plugin:
 * ```ts
 * import coreExtensionModuleUrl from './MyCoreExtension.js?importChunkUrl';
 *
 * // Set up driver, etc.
 *
 * // Initialize the Renderer
 * const renderer = new RendererMain(
 *   {
 *     // Other Renderer Config...
 *     coreExtensionModule: coreExtensionModuleUrl,
 *   },
 *   'app',
 *   driver,
 * );
 * ```
 *
 * @module
 */

// Shaders
export * from '../src/core/renderers/webgl/WebGlCoreShader.js';
export * from '../src/core/renderers/webgl/shaders/effects/ShaderEffect.js';

// Textures
export * from '../src/core/textures/Texture.js';

// Text Rendering & Fonts
export * from '../src/core/text-rendering/renderers/TextRenderer.js';
export * from '../src/core/text-rendering/renderers/CanvasTextRenderer.js';
export * from '../src/core/text-rendering/renderers/SdfTextRenderer/SdfTextRenderer.js';
export * from '../src/core/text-rendering/font-face-types/TrFontFace.js';
export * from '../src/core/text-rendering/font-face-types/WebTrFontFace.js';
export * from '../src/core/text-rendering/font-face-types/SdfTrFontFace/SdfTrFontFace.js';

// Core Extensions
export * from '../src/core/CoreExtension.js';

// Stage (type only for Core Extensions)
export type * from '../src/core/Stage.js';
