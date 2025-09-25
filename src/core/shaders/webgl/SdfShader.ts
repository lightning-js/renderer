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
import { getNormalizedRgbaComponents } from '../../lib/utils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

const IDENTITY_MATRIX_3x3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
/**
 * Properties of the {@link SdfShader}
 */
export interface SdfShaderProps {
  transform: Float32Array;
  scrollY: number;
  /**
   * Color in RGBA format
   *
   * @remarks
   * Color channels must NOT be premultiplied by alpha for best blending results.
   */
  color: number;
  size: number;
  distanceRange: number;
  debug: boolean;
}
/**
 * SdfShader supports multi-channel and single-channel signed distance field textures.
 *
 * @remarks
 * This Shader is used by the {@link SdfTextRenderer}. Do not use thie Shader
 * directly. Instead create a Text Node and assign a SDF font family to it.
 *
 * @internalRemarks
 * The only thing this shader does to support multi-channel SDFs is to
 * add a median function to the fragment shader. If this one function call
 * ends up being a performance bottleneck we can always look at ways to
 * remove it.
 */
export const Sdf: WebGlShaderType<SdfShaderProps> = {
  props: {
    transform: IDENTITY_MATRIX_3x3,
    scrollY: 0,
    color: 0xffffffff,
    size: 16,
    distanceRange: 1.0,
    debug: false,
  },
  onSdfBind(props) {
    this.uniformMatrix3fv('u_transform', props.transform);
    this.uniform1f('u_scrollY', props.scrollY);
    this.uniform4fa('u_color', getNormalizedRgbaComponents(props.color));
    this.uniform1f('u_size', props.size);
    this.uniform1f('u_distanceRange', props.distanceRange);
    this.uniform1i('u_debug', props.debug ? 1 : 0);
  },
  vertex: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif
    // an attribute is an input (in) to a vertex shader.
    // It will receive data from a buffer
    attribute vec2 a_position;
    attribute vec2 a_textureCoords;
    attribute vec4 a_color;

    uniform vec2 u_resolution;
    uniform mat3 u_transform;
    uniform float u_scrollY;
    uniform float u_pixelRatio;
    uniform float u_size;

    varying vec2 v_texcoord;
    varying vec4 v_color;

    void main() {
      vec2 scrolledPosition = a_position * u_size - vec2(0, u_scrollY);
      vec2 transformedPosition = (u_transform * vec3(scrolledPosition, 1)).xy;

      // Calculate screen space with pixel ratio
      vec2 screenSpace = (transformedPosition * u_pixelRatio / u_resolution * 2.0 - 1.0) * vec2(1, -1);

      gl_Position = vec4(screenSpace, 0.0, 1.0);
      v_texcoord = a_textureCoords;
      v_color = a_color;

    }
  `,
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif
    uniform vec4 u_color;
    uniform sampler2D u_texture;
    uniform float u_distanceRange;
    uniform float u_pixelRatio;
    uniform int u_debug;

    varying vec2 v_texcoord;
    varying vec4 v_color;

    float median(float r, float g, float b) {
        return max(min(r, g), min(max(r, g), b));
    }

    void main() {
        // Check if this is an underline/strikethrough quad (UV coordinates are very close to 0,0)
        if (length(v_texcoord) < 0.001) {
          // Render as solid color for underlines/strikethroughs, use uniform color
          gl_FragColor = vec4(u_color.r, u_color.g, u_color.b, u_color.a);
          return;
        }

        vec3 sample = texture2D(u_texture, v_texcoord).rgb;
        if (u_debug == 1) {
          gl_FragColor = vec4(sample.r, sample.g, sample.b, 1.0);
          return;
        }
        float scaledDistRange = u_distanceRange * u_pixelRatio;
        float sigDist = scaledDistRange * (median(sample.r, sample.g, sample.b) - 0.5);
        float opacity = clamp(sigDist + 0.5, 0.0, 1.0);

        // Check if we should use uniform color or per-vertex color
        vec4 finalColor;
        if (v_color.r < 0.0) {
          finalColor = u_color;
        } else {
          // Use per-vertex color from BBCode
          finalColor = v_color;
        }

        opacity *= finalColor.a;

        // Build the final color.
        // IMPORTANT: We must premultiply the color by the alpha value before returning it.
        gl_FragColor = vec4(finalColor.r * opacity, finalColor.g * opacity, finalColor.b * opacity, opacity);
    }
  `,
};
