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

import { valuesAreEqual } from '../../lib/utils.js';
import {
  BorderTemplate,
  type BorderProps,
} from '../templates/BorderTemplate.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

export const Border: WebGlShaderType<BorderProps> = {
  props: BorderTemplate.props,
  update() {
    this.uniform4fa('u_width', this.props!.width as Vec4);
    this.uniform1i(
      'u_asymWidth',
      valuesAreEqual(this.props!.width as number[]) ? 0 : 1,
    );
    this.uniformRGBA('u_color', this.props!.color);
  },
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;
    uniform float u_alpha;

    uniform vec2 u_dimensions;
    uniform sampler2D u_texture;

    uniform vec4 u_width;
    uniform vec4 u_color;

    uniform int u_asymWidth;

    varying vec4 v_color;
    varying vec2 v_position;
    varying vec2 v_textureCoords;

    float box(vec2 p, vec2 s) {
      vec2 q = abs(p) - (s - (4.0 - u_pixelRatio));
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0)));
    }

    float asymBorderWidth(vec2 p, float d, vec4 w) {
      p.x += w.y > w.w ? (w.y - w.w) * 0.5 : -(w.w - w.y) * 0.5;
      p.y += w.z > w.x ? (w.z - w.x) * 0.5 : -(w.x - w.z) * 0.5;

      vec2 size = vec2(u_dimensions.x - (w[3] + w[1]), u_dimensions.y - (w[0] + w[2])) * 0.5;
      float borderDist = box(p, size + 2.0);
      return 1.0 - smoothstep(0.0, u_pixelRatio, max(-borderDist, d));
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec2 halfDimensions = (u_dimensions * 0.5);

      vec2 boxUv = v_textureCoords.xy * u_dimensions - halfDimensions;
      float boxDist = box(boxUv, halfDimensions);

      float boxAlpha = 1.0 - smoothstep(0.0, u_pixelRatio, boxDist);
      float borderAlpha = 0.0;

      if(u_asymWidth == 1) {
        borderAlpha = asymBorderWidth(boxUv, boxDist, u_width);
      }
      else {
        borderAlpha = 1.0 - smoothstep(u_width[0], u_width[0], abs(boxDist));
      }

      vec4 resColor = vec4(0.0);
      resColor = mix(resColor, color, min(color.a, boxAlpha));
      resColor = mix(resColor, u_color, min(u_color.a, min(borderAlpha, boxAlpha)));
      gl_FragColor = resColor * u_alpha;
    }
  `,
};
