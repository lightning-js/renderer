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
 * Lightning 3 Renderer API
 *
 * @remarks
 * This module exports the API for the Lightning 3 Renderer. You
 * can import the exports from this module like so:
 * ```ts
 * import { Renderer } from '@lightning/renderer';
 * ```
 *
 * Generally developers/frameworks using the Renderer will use the Main API to
 * render applications.
 *
 * Do not confuse the Main API with the Core API which is used to extend
 * capabilities of the Renderer. The Main API code always runs from the main
 * thread.
 *
 * @module Renderer
 */

export * from '../src/main-api/INode.js';
export * from '../src/main-api/Renderer.js';
export * from '../src/common/IAnimationController.js';
export * from '../src/common/CommonTypes.js';

// Selected types exported from the Core Renderer that can be used in the
// context of the main API.
export {
  CoreTextureManager,
  type TextureMap,
} from '../src/core/CoreTextureManager.js';
export type { MemoryInfo } from '../src/core/TextureMemoryManager.js';
export type { TextRendererMap } from '../src/core/text-rendering/TextRenderer.js';
export type { TrFontFaceMap } from '../src/core/text-rendering/font-face-types/TrFontFace.js';
export type { AnimationSettings } from '../src/core/animations/CoreAnimation.js';
export type { Inspector } from '../src/main-api/Inspector.js';
export type { CoreNodeRenderState } from '../src/core/CoreNode.js';

export * from '../src/core/renderers/CoreShaderNode.js';
export * from '../src/core/shaders/templates/BorderTemplate.js';
export * from '../src/core/shaders/templates/HolePunchTemplate.js';
export * from '../src/core/shaders/templates/RoundedTemplate.js';
export * from '../src/core/shaders/templates/ShadowTemplate.js';
export * from '../src/core/shaders/templates/LinearGradientTemplate.js';
export * from '../src/core/shaders/templates/RadialGradientTemplate.js';

// Shaders
export * from '../src/core/renderers/webgl/WebGlShaderProgram.js';
export type { ShaderProgramSources } from '../src/core/renderers/webgl/internal/ShaderUtils.js';

// Textures
export * from '../src/core/textures/Texture.js';
export { ImageTexture } from '../src/core/textures/ImageTexture.js';

// Text Rendering & Fonts
// export * from '../src/core/text-rendering/renderers/TextRenderer.js';
export * from '../src/core/text-rendering/font-face-types/TrFontFace.js';
export * from '../src/core/text-rendering/font-face-types/WebTrFontFace.js';
export * from '../src/core/text-rendering/font-face-types/SdfTrFontFace/SdfTrFontFace.js';

// Stage (type only for Core Extensions)
export type * from '../src/core/Stage.js';

/**
 * @deprecated Use `import { WebGlRenderer } @lightningjs/renderer/webgl` instead
 */
export type { WebGlRenderer as WebGlCoreRenderer } from '../src/core/renderers/webgl/WebGlRenderer.js';
/**
 * @deprecated Use `import { WebGlCtxTexture } @lightningjs/renderer/webgl` instead
 */
export type { WebGlCtxTexture as WebGlCoreCtxTexture } from '../src/core/renderers/webgl/WebGlCtxTexture.js';
