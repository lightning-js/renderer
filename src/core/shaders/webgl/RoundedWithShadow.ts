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

import type { CoreNode } from '../../CoreNode.js';
import { calcFactoredRadiusArray } from '../../lib/utils.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';
import {
  RoundedWithShadowTemplate,
  type RoundedWithShadowProps,
} from '../templates/RoundedWithShadowTemplate.js';
import { Shadow } from './Shadow.js';

export const RoundedWithShadow: WebGlShaderType<RoundedWithShadowProps> = {
  props: RoundedWithShadowTemplate.props,
  update(node: CoreNode) {
    this.uniformRGBA('u_shadow_color', this.props!['shadow-color']!);
    this.uniform4fa('u_shadow', this.props!['shadow-projection']!);
    this.uniform4fa(
      'u_radius',
      calcFactoredRadiusArray(this.props!.radius as Vec4, node.w, node.h),
    );
  },
  vertex: Shadow.vertex as string,
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

    uniform vec4 u_shadow_color;
    uniform vec4 u_shadow;
    uniform vec4 u_radius;

    uniform int u_asymWidth;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    float roundedBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0))) - r.x;
    }

    float shadowBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      float dist = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
      return 1.0 - smoothstep(-(u_shadow.w), (u_shadow.w + u_shadow.z), dist);
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec2 halfDimensions = (u_dimensions * 0.5);

      vec2 boxUv = v_nodeCoords.xy * u_dimensions - halfDimensions;
      float boxDist = roundedBox(boxUv, halfDimensions, u_radius);

      float roundedAlpha = 1.0 - smoothstep(0.0, u_pixelRatio, boxDist);

      float shadowAlpha = shadowBox(boxUv - u_shadow.xy, halfDimensions + u_shadow.w, u_radius + u_shadow.z);

      vec4 resColor = vec4(0.0);
      resColor = mix(resColor, u_shadow_color, shadowAlpha);
      resColor = mix(resColor, color, min(color.a, roundedAlpha));
      gl_FragColor = resColor * u_alpha;
    }
  `,
};
