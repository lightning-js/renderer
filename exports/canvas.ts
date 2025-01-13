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
 * Canvas Text Renderer
 *
 * @remarks
 * This module exports the Canvas Text Renderer for the Lightning 3 Renderer.
 * The Canvas Text Renderer is used to render text using the Canvas API,
 * this is slightly less performant than the SDF Text Renderer. However
 * the Canvas Text Renderer is more widely supported on older devices.
 *
 * You can import the exports from this module like so:
 * ```ts
 * import { CanvasTextRenderer } from '@lightning/renderer';
 * ```
 *
 * @module Canvas
 *
 * @packageDocumentation
 */

export { CanvasTextRenderer } from '../src/core/text-rendering/renderers/CanvasTextRenderer.js';
export { CanvasRenderer } from '../src/core/renderers/canvas/CanvasRenderer.js';
export { CanvasTexture } from '../src/core/renderers/canvas/CanvasTexture.js';
/**
 * @deprecated Use CanvasRenderer.
 */
export { CanvasRenderer as CanvasCoreRenderer } from '../src/core/renderers/canvas/CanvasRenderer.js';
