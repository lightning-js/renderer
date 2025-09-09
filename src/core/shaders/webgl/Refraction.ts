/*
 * Copyright 2023 Comcast Cable Communications Management, LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
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
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

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

export const Refraction: WebGlShaderType = {
  vertex: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    attribute vec2 a_position;
    attribute vec2 a_textureCoords;
    attribute vec4 a_color;
    attribute vec2 a_nodeCoords;

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    void main() {
      vec2 normalized = a_position * u_pixelRatio;
      vec2 screenSpace = vec2(2.0 / u_resolution.x, -2.0 / u_resolution.y);

      v_color = a_color;
      v_nodeCoords = a_nodeCoords;
      v_textureCoords = a_textureCoords;

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

    uniform vec2 u_resolution;
    uniform sampler2D u_texture;

    varying vec4 v_color;
    varying vec2 v_textureCoords;

    void main() {
        // Normalized UV
        vec2 uv = v_textureCoords;

        // Convert pixel center -> UV
        vec2 centerUV = vec2(400.0, 300.0) / u_resolution;

        // Aspect-corrected offset from chosen center
        vec2 invRes = 1.0 / u_resolution;
        vec2 m2 = uv - centerUV;

        // Rounded-rectangle field
        float roundedBox = pow(abs(m2.x * (u_resolution.x * invRes.y)), 8.0) + pow(abs(m2.y), 8.0);

        float rb1 = clamp((1.0 - roundedBox * 10000.0) * 8.0, 0.0, 1.0);
        float rb2 = clamp((0.95 - roundedBox * 9500.0) * 16.0, 0.0, 1.0)
                  - clamp(pow(0.9 - roundedBox * 9500.0, 1.0) * 16.0, 0.0, 1.0);
        float rb3 = (clamp((1.5 - roundedBox * 11000.0) * 2.0, 0.0, 1.0)
                  - clamp(pow(1.0 - roundedBox * 11000.0, 1.0) * 2.0, 0.0, 1.0));

        float transition = smoothstep(0.0, 1.0, rb1 + rb2);

        // BASE: unwarped sample
        vec4 baseColor = texture2D(u_texture, uv);

        // EFFECT: lens warp only
        vec2 lens = (uv - 0.5) * (1.0 - roundedBox * 6000.0) + 0.5;
        vec4 warped = texture2D(u_texture, lens);

        // Lighting
        float gradient = clamp((clamp(m2.y, 0.0, 0.2) + 0.1) * 0.5, 0.0, 1.0)
                      + clamp((clamp(-m2.y, -1000.0, 0.2) * rb3 + 0.1) * 0.5, 0.0, 1.0);

        vec4 effectColor = clamp(warped + vec4(rb1) * gradient + vec4(rb2) * 0.3, 0.0, 1.0);

        // Branch-free blend
        vec4 fragColor = mix(baseColor, effectColor, transition);

        // Keep vertex color modulation
        gl_FragColor = v_color * fragColor;
    }
  `,
};
