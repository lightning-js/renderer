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

import { getNormalizedRgbaComponents } from '../../lib/utils';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode';
import { Sdf, type SdfShaderProps } from './SdfShader';

export type SdfShadowShaderProps = SdfShaderProps & {
  shadowColor: number;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
};

export const SdfShadow: WebGlShaderType<SdfShadowShaderProps> = {
  props: {
    ...(Sdf.props as SdfShaderProps),
    shadowColor: 0x000000ff,
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },
  onSdfBind(props: SdfShadowShaderProps) {
    Sdf.onSdfBind!.call(this, props);
    this.uniform4fa(
      'u_shadowColor',
      getNormalizedRgbaComponents(props.shadowColor),
    );
    this.uniform1f('u_shadowBlur', props.shadowBlur);
    this.uniform2f('u_shadowOffset', props.shadowOffsetX, props.shadowOffsetY);
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

    varying vec2 v_texcoord;
    varying float v_scaledDistRange;

    void main() {
      vec2 scrolledPosition = a_position * u_size;
      vec2 transformedPosition = (u_transform * vec3(scrolledPosition, 1)).xy;

      // Apply shadow offset after transform
      transformedPosition += u_shadowOffset;

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
    uniform vec4 u_shadowColor;
    uniform sampler2D u_texture;
    uniform float u_shadowBlur;

    varying vec2 v_texcoord;
    varying float v_scaledDistRange;

    float median(float r, float g, float b) {
      return clamp(b, min(r, g), max(r, g));
    }

    void main() {
      vec3 sample = texture2D(u_texture, v_texcoord).rgb;
      float sigDist = v_scaledDistRange * (median(sample.r, sample.g, sample.b) - 0.5);

      // Shadow extends outward from the edge with blur
      // Similar to original shader's clamp(sigDist + 0.5, 0.0, 1.0) but extended
      float blurRange = max(u_shadowBlur, 1.0);
      float shadow = clamp((sigDist + blurRange) / blurRange, 0.0, 1.0);
      float shadowAlpha = shadow * u_shadowColor.a;

      // Build the final color.
      // IMPORTANT: We must premultiply the color by the alpha value before returning it.
      gl_FragColor = vec4(u_shadowColor.rgb * shadowAlpha, shadowAlpha);
    }
  `,
};
