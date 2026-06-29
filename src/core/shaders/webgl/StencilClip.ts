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

import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

/**
 * Minimal shader used exclusively for the stencil write pass during
 * rounded-corner clipping. Color output is discarded (colorMask is off when
 * this shader runs). The fragment shader uses an SDF rounded-rect function to
 * discard fragments that fall outside the clip shape so only in-bounds pixels
 * increment the stencil buffer.
 *
 * Props are set directly via uniforms by the renderer — this shader is never
 * exposed as a user-selectable shader type.
 *
 * Uniforms set by WebGlRenderer.beginRoundedClip():
 *   u_dimensions  — vec2 clip region width/height in pixels
 *   u_position    — vec2 clip region top-left corner in screen pixels
 *   u_radius      — float uniform corner radius (pixels)
 *   u_resolution  — vec2 canvas resolution (shared renderer uniform)
 *   u_pixelRatio  — float pixel ratio (shared renderer uniform)
 */
export const StencilClip: WebGlShaderType = {
  vertex: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    attribute vec2 a_position;
    attribute vec2 a_nodeCoords;

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;

    varying vec2 v_nodeCoords;

    void main() {
      vec2 normalized = a_position * u_pixelRatio;
      vec2 screenSpace = vec2(2.0 / u_resolution.x, -2.0 / u_resolution.y);

      v_nodeCoords = a_nodeCoords;

      gl_Position = vec4(normalized.x * screenSpace.x - 1.0, normalized.y * -abs(screenSpace.y) + 1.0, 0.0, 1.0);
      gl_Position.y = -sign(screenSpace.y) * gl_Position.y;
    }
  `,
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform vec2 u_dimensions;
    uniform float u_radius;
    uniform float u_pixelRatio;

    varying vec2 v_nodeCoords;

    float roundedBox(vec2 p, vec2 s, float r) {
      vec2 q = abs(p) - s + r;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0))) - r;
    }

    void main() {
      vec2 halfDimensions = u_dimensions * 0.5;
      vec2 boxUv = v_nodeCoords.xy * u_dimensions - halfDimensions;
      float boxDist = roundedBox(boxUv, halfDimensions, u_radius);

      float edgeWidth = 1.0 / u_pixelRatio;
      float alpha = 1.0 - smoothstep(-0.5 * edgeWidth, 0.5 * edgeWidth, boxDist);

      if (alpha < 0.5) {
        discard;
      }

      gl_FragColor = vec4(0.0);
    }
  `,
};
