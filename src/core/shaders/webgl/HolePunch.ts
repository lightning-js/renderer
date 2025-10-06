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

import { calcFactoredRadiusArray } from '../../lib/utils.js';
import {
  HolePunchTemplate,
  type HolePunchProps,
} from '../templates/HolePunchTemplate.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

export const HolePunch: WebGlShaderType<HolePunchProps> = {
  props: HolePunchTemplate.props,
  update() {
    const props = this.props!;
    this.uniform2f('u_pos', props.x, props.y);
    //precalculate to halfSize once instead of for every pixel
    this.uniform2f('u_size', props.w * 0.5, props.h * 0.5);

    this.uniform4fa(
      'u_radius',
      calcFactoredRadiusArray(props.radius as Vec4, props.w, props.h),
    );
  },
  getCacheMarkers(props: HolePunchProps) {
    return `radiusArray:${Array.isArray(props.radius)}`;
  },
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform float u_alpha;
    uniform float u_pixelRatio;
    uniform vec2 u_dimensions;
    uniform sampler2D u_texture;

    uniform vec2 u_size;
    uniform vec2 u_pos;

    uniform vec4 u_radius;

    uniform vec4 u_color;
    varying vec4 v_color;
    varying vec2 v_textureCoords;

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec2 p = (v_textureCoords.xy * u_dimensions.xy - u_pos) - u_size;
      vec4 r = u_radius;
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      p = abs(p) - u_size + r.x;
      float dist = min(max(p.x, p.y), 0.0) + length(max(p, 0.0)) - r.x + 2.0;
      float roundedAlpha = 1.0 - smoothstep(0.0, u_pixelRatio, dist);
      gl_FragColor = mix(color, vec4(0.0), min(color.a, roundedAlpha));
    }
  `,
};
