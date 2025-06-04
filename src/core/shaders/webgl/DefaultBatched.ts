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

export const DefaultBatched: WebGlShaderType = {
  supportsIndexedTextures: true,

  // override bindTextures(texture: WebGlCoreCtxTexture[]) {
  //   const { renderer, glw } = this;
  //   if (
  //     texture.length > renderer.system.parameters.MAX_VERTEX_TEXTURE_IMAGE_UNITS
  //   ) {
  //     throw new Error(
  //       `DefaultShaderBatched: Cannot bind more than ${renderer.system.parameters.MAX_VERTEX_TEXTURE_IMAGE_UNITS} textures`,
  //     );
  //   }
  //   texture.forEach((t, i) => {
  //     glw.activeTexture(i);
  //     glw.bindTexture(t.ctxTexture);
  //   });
  //   const samplers = Array.from(Array(texture.length).keys());
  //   this.glw.uniform1iv('u_textures[0]', samplers);
  // }

  vertex: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    attribute vec2 a_textureCoords;
    attribute vec2 a_position;
    attribute vec4 a_color;
    attribute float a_textureIndex;
    attribute float a_depth;

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying float v_textureIndex;

    void main(){
      vec2 normalized = a_position * u_pixelRatio / u_resolution;
      vec2 zero_two = normalized * 2.0;
      vec2 clip_space = zero_two - 1.0;

      // pass to fragment
      v_color = a_color;
      v_textureCoords = a_textureCoords;
      v_textureIndex = a_textureIndex;

      // flip y
      gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0, 1);
    }
  `,
  fragment(renderer) {
    const textureUnits =
      renderer.system.parameters.MAX_VERTEX_TEXTURE_IMAGE_UNITS;
    return `
    #define txUnits ${textureUnits}
      # ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      # else
      precision mediump float;
      # endif

      uniform vec2 u_resolution;
      uniform sampler2D u_image;
      uniform sampler2D u_textures[txUnits];

      varying vec4 v_color;
      varying vec2 v_textureCoords;
      varying float v_textureIndex;

      vec4 sampleFromTexture(sampler2D textures[${textureUnits}], int idx, vec2 uv) {
        ${Array.from(Array(textureUnits).keys())
          .map(
            (idx) => `
          ${idx !== 0 ? 'else ' : ''}if (idx == ${idx}) {
            return texture2D(textures[${idx}], uv);
          }
        `,
          )
          .join('')}
        return texture2D(textures[0], uv);
      }

      void main(){
        gl_FragColor = vec4(v_color) * sampleFromTexture(u_textures, int(v_textureIndex), v_textureCoords);
      }
    `;
  },
};
