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
 * SDF Font renderer
 *
 * @remarks
 * This module exports the SDF Font renderer for the Lightning 3 Renderer.
 * The SDF Font renderer is used to render text using Single-Channel Signed
 * Distance Field (SSDF) fonts or Multi-Channel Signed Distance Field (MSDF)
 * fonts. The SDF font renderer is used to render text in a way that is
 * optimized for GPU rendering.
 *
 * You can import the exports from this module like so:
 * ```ts
 * import { SdfTextRenderer } from '@lightning/renderer';
 * ```
 *
 * @packageDocumentation
 */

export { SdfTextRenderer } from '../src/core/text-rendering/renderers/SdfTextRenderer/SdfTextRenderer.js';
