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
  /**
   * Color in RGBA format
   *
   * @remarks
   * Color channels must NOT be premultiplied by alpha for best blending results.
   */
  color: number;
  size: number;
  distanceRange: number;
  shadow: boolean;
  shadowAlpha: number;
  shadowColor: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
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
    color: 0xffffffff,
    size: 16,
    distanceRange: 1.0,
    shadowColor: 0x00000000,
    shadow: false,
    shadowAlpha: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 5,
  },
  onSdfBind(props) {
    this.uniformMatrix3fv('u_transform', props.transform);
    this.uniform4fa('u_color', getNormalizedRgbaComponents(props.color));
    this.uniform1f('u_size', props.size);
    this.uniform1f('u_distanceRange', props.distanceRange);
    this.uniform4fa(
      'u_shadowColor',
      getNormalizedRgbaComponents(props.shadowColor),
    );
    this.uniform2f('u_shadowOffset', props.shadowOffsetX, props.shadowOffsetY);
    this.uniform1f('u_shadowBlur', props.shadowBlur);
    this.uniform1i('u_shadow', props.shadow ? 1 : 0);
    this.uniform1f('u_shadowAlpha', props.shadowAlpha);
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

    uniform vec2 u_resolution;
    uniform mat3 u_transform;
    uniform float u_pixelRatio;
    uniform float u_size;
    uniform float u_distanceRange;
    uniform vec2 u_shadowOffset;
    uniform int u_shadow;

    varying vec2 v_texcoord;
    varying float v_scaledDistRange;

    void main() {
      vec2 scrolledPosition = a_position * u_size;
      vec2 transformedPosition = (u_transform * vec3(scrolledPosition, 1)).xy;

      // Apply shadow offset in shadow pass
      if(u_shadow == 1) {
        transformedPosition += u_shadowOffset;
      }

      // Calculate screen space with pixel ratio
      vec2 screenSpace = (transformedPosition * u_pixelRatio / u_resolution * 2.0 - 1.0) * vec2(1, -1);

      gl_Position = vec4(screenSpace, 0.0, 1.0);
      v_texcoord = a_textureCoords;
      v_scaledDistRange = u_distanceRange * u_pixelRatio;
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
    uniform vec4 u_shadowColor;
    uniform float u_shadowBlur;
    uniform float u_shadowAlpha;
    uniform int u_shadow;

    varying vec2 v_texcoord;
    varying float v_scaledDistRange;

    float median(float r, float g, float b) {
      return clamp(b, min(r, g), max(r, g));
    }

    void main() {
      vec3 sample = texture2D(u_texture, v_texcoord).rgb;
      float sigDist = v_scaledDistRange * (median(sample.r, sample.g, sample.b) - 0.5);

      // Shadow pass: render with shadow color and blur
      if(u_isShadow == 1) {
          float shadowDist = sigDist + u_shadowBlur / v_scaledDistRange;
          float shadowOpacity = clamp(shadowDist + 0.5, 0.0, 1.0) * u_shadowColor.a;
          gl_FragColor = vec4(u_shadowColor.rgb * shadowOpacity, shadowOpacity);
          return;
      }

      // Normal pass: render glyph
      float opacity = clamp(sigDist + 0.5, 0.0, 1.0) * u_color.a;
      gl_FragColor = vec4(u_color.rgb * opacity, opacity);
    }
  `,
};
